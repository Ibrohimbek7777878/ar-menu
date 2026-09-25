"""
OWASP Himoyasi: Kesh-asosidagi rate limiter (Brute-Force va DoS ga qarshi).
Redis va LocMemCache orqali ko'p-workerli muhitda to'liq ishlaydi.
Foydalanish:
    @rate_limit('payment_create', limit=15, seconds=60)
    def view(request): ...
"""
import time
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse


def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def rate_limit(key_prefix, limit=20, seconds=60):
    """
    Kesh (Redis/LocMem) orqali so'rovlar chastotasini cheklash.
    Limit oshganda HTTP 429 Too Many Requests qaytaradi.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            ip = _client_ip(request)
            bucket_key = f"ratelimit:{key_prefix}:{ip}"
            now = time.time()
            
            try:
                hits = cache.get(bucket_key, [])
                hits = [t for t in hits if now - t < seconds]
                if len(hits) >= limit:
                    retry = int(seconds - (now - hits[0])) + 1
                    return JsonResponse(
                        {
                            'success': False,
                            'error': "Juda ko'p so'rov yuborildi. Iltimos, keyinroq urinib ko'ring (Rate limit exceeded).",
                            'retry_after': max(1, retry),
                        },
                        status=429,
                    )
                hits.append(now)
                cache.set(bucket_key, hits, timeout=seconds + 10)
            except Exception:
                # Agar keshda vaqtinchalik uzilish bo'lsa, xizmat to'xtab qolmaydi
                pass

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
