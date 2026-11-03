"""
OWASP Himoyasi: Kesh-asosidagi rate limiter (Brute-Force va DoS ga qarshi).
Redis va LocMemCache orqali ko'p-workerli muhitda to'liq ishlaydi.
Foydalanish:
    @rate_limit('payment_create', limit=15, seconds=60)
    def view(request): ...
"""
import time
from functools import wraps
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


def client_ip(request):
    """
    Mijozning haqiqiy IP manzili (TZ R1-5).

    Avval `X-Forwarded-For` ning BIRINCHI qiymati olinardi — uni mijozning o'zi yozadi, shuning uchun har so'rovda
    boshqa IP yozib rate limit va login blokini aylanib o'tish mumkin edi. Endi header faqat ishonchli proxy'lar
    (TRUSTED_PROXY_COUNT, nginx/Cloudflare) qo'shgan qismida o'qiladi: har ishonchli proxy oldingi hop manzilini
    qo'shadi, haqiqiy mijoz — o'ngdan N-element. Proxy yo'q bo'lsa (0) header e'tiborga olinmaydi.
    """
    remote = request.META.get('REMOTE_ADDR', '0.0.0.0')
    trusted = getattr(settings, 'TRUSTED_PROXY_COUNT', 0)
    if trusted <= 0:
        return remote
    hops = [h.strip() for h in request.META.get('HTTP_X_FORWARDED_FOR', '').split(',') if h.strip()]
    if len(hops) >= trusted:
        return hops[-trusted]
    return remote


_client_ip = client_ip   # eski nom (moslik uchun)


def rate_limited(request, key_prefix, limit=20, seconds=60):
    """
    Shu mijoz (IP) `seconds` ichida `limit` martadan ko'p murojaat qilgan bo'lsa 429 javobini, aks holda None qaytaradi
    (view ichida, masalan faqat POST uchun, dekoratorsiz ishlatish mumkin).
    """
    ip = client_ip(request)
    # Multi-tenant: har restoranning o'z hisobi (bir tenantning ko'p so'rovi boshqasining mehmonlarini cheklamasin);
    # tenantsiz rejimda kalit avvalgidek ('-' o'rniga bo'sh qism qo'shilmaydi)
    from shops.tenancy import current_tenant_id
    tenant_id = current_tenant_id()
    bucket_key = f"ratelimit:{key_prefix}:{ip}" if tenant_id is None else f"ratelimit:t{tenant_id}:{key_prefix}:{ip}"
    now = time.time()
    try:
        hits = [t for t in cache.get(bucket_key, []) if now - t < seconds]
        if len(hits) >= limit:
            retry = int(seconds - (now - hits[0])) + 1
            return JsonResponse(
                {
                    'success': False,
                    'ok': False,
                    'error': "Juda ko'p so'rov yuborildi. Iltimos, keyinroq urinib ko'ring (Rate limit exceeded).",
                    'retry_after': max(1, retry),
                },
                status=429,
            )
        hits.append(now)
        cache.set(bucket_key, hits, timeout=seconds + 10)
    except Exception:
        # Keshda vaqtinchalik uzilish bo'lsa, xizmat to'xtab qolmaydi
        pass
    return None


def rate_limit(key_prefix, limit=20, seconds=60):
    """
    Kesh (Redis / fayl / LocMem) orqali so'rovlar chastotasini cheklash.
    Limit oshganda HTTP 429 Too Many Requests qaytaradi.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            blocked = rate_limited(request, key_prefix, limit, seconds)
            if blocked is not None:
                return blocked
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
