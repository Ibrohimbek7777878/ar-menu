"""
Eski (bozor / studiya / ar3d) API'larni restoran mahsulotida yopish (TZ_SOTUVGA_TAYYORLASH P0-1).

Restoran urlconf'iga bozor va studiya davridan qolgan marshrutlar ulangan edi. Ular restoranning ruxsat tekshiruvlarini
aylanib o'tadi: tasdiqlanmagan hisob token olib boshqa restoran buyurtmasini o'zgartira oladi, anonim odam narx o'zgartira
va taom o'chira oladi, stolsiz soxta buyurtmalar KDS'ni to'ldiradi. Mehmon ilovasi, `/ra/` va bot bu yo'llarni chaqirmaydi
(kod bo'yicha tekshirilgan, TZ 8-bo'lim); faqat `products` va `categories` ning GET'i React menyusining zaxira yo'li.

Kod O'CHIRILMAYDI (AGENTS 4-qoida): `LEGACY_API_ENABLED=True` bilan hammasi qaytadi. Faqat `request.product_code == 'restaurant'`
bo'lganda ishlaydi, boshqa mahsulotlar (market, studio) va testlardagi umumiy urlconf o'zgarmaydi.
"""
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

BLOCK = 'block'
READONLY = 'readonly'

# (yo'l prefiksi, qoida). READONLY: GET/HEAD/OPTIONS o'tadi, yozuv 405.
LEGACY_RULES = (
    ('/api/v1/accounts/', BLOCK),
    ('/api/v1/shops/', BLOCK),
    ('/api/v1/orders/', BLOCK),
    ('/api/v1/notifications/', BLOCK),
    ('/api/v1/products/', READONLY),
    ('/api/v1/categories/', READONLY),
    ('/api/ai-chat', BLOCK),
    ('/v1/', BLOCK),                 # ar3d: v1/orders, v1/guest/*, v1/staff/*, v1/ai/chat, v1/menu, v1/lang, v1/ar
    ('/3d-print/order', BLOCK),      # 3D-print studiya buyurtmasi va "tayyor" belgisi
    # Tizim ichida onlayn to'lov yo'q (egasi qarori, TZ 8-bo'lim): anonim `create` istalgan buyurtma id si uchun to'lov yozuvi
    # yaratardi. To'lov usullari (QR/karta) alohida modul (N5) bo'ladi, bu eski provayder integratsiyasi.
    ('/api/payments/', BLOCK),
    ('/payment/', BLOCK),
)
SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


def legacy_api_closed(request):
    """Restoran mahsulotida eski API'lar yopiqmi (sahifalar yo'naltirish uchun ham ishlatiladi)."""
    return (getattr(request, 'product_code', '') == 'restaurant'
            and not getattr(settings, 'LEGACY_API_ENABLED', False))


def legacy_rule_for(path):
    for prefix, rule in LEGACY_RULES:
        if path.startswith(prefix):
            return rule
    return None


class LegacyApiGateMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not legacy_api_closed(request):
            return None
        rule = legacy_rule_for(request.path)
        if rule is None:
            return None
        if rule == READONLY:
            if request.method in SAFE_METHODS:
                return None
            resp = JsonResponse({'detail': 'Method not allowed.'}, status=405)
            resp['Allow'] = 'GET, HEAD, OPTIONS'
            return resp
        return JsonResponse({'detail': 'Not found.'}, status=404)
