"""
Mehmon sahifalari uchun alohida O'QISH API (`/api/guest/v1/…`). TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_GUEST_API_VA_BOT_2026-11-02.md

Qoidalar:
- Faqat GET. Yozuv yo'llari o'zgarmagan: savat `POST /api/cart/`, buyurtma `POST /api/v1/restaurant/orders/`.
- Mavjud sahifa ko'rinishlari (`tma_views`) o'zgartirilmagan; bu yerda ularning ma'lumot bloklarini qaytaradigan alohida quruvchilar.
  Javob sahifadagi `window.__GULISTON_*_DATA__` bloki bilan BIR XIL bo'lishi testlar bilan ushlanadi (drift bo'lmasligi uchun).
- Javob `private`, ETag bilan (If-None-Match -> 304): sahifani qayta yuklamay yangilash va polling arzon bo'lsin.
- Sozlama `guest_api` (AppSetting yoki .env `GUEST_API`, standart yoqiq) o'chirilsa hamma yo'l 404 qaytaradi.
- Tezlik cheklovi: IP bo'yicha belgilangan oyna hisoblagichi (O(1), keshga bitta son). Restoran Wi-Fi'si bitta IP'dan chiqishi
  uchun keng (`GUEST_API_RATE_LIMIT`, standart 1200/min, 0 = o'chiq). Kesh ishlamasa API to'xtamaydi.
"""
import hashlib
import json
import time

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

from backend.ratelimit import client_ip

_RATE_WINDOW = 60


def _enabled():
    from backend.app_settings import get_bool
    return get_bool('guest_api', True)


def _throttled(request):
    limit = int(getattr(settings, 'GUEST_API_RATE_LIMIT', 1200) or 0)
    if limit <= 0:
        return False
    key = f"guestapi:{client_ip(request)}:{int(time.time() // _RATE_WINDOW)}"
    try:
        cache.add(key, 0, timeout=_RATE_WINDOW + 10)
        return cache.incr(key) > limit
    except Exception:
        return False


def _error(message, status):
    return JsonResponse({'error': message}, status=status, json_dumps_params={'ensure_ascii': False})


def guest_json(request, payload):
    """JSON javob: `private`, zaif ETag; mos kelsa tanasiz 304."""
    body = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    etag = 'W/"%s"' % hashlib.md5(body.encode('utf-8')).hexdigest()
    if request.headers.get('If-None-Match') == etag:
        resp = HttpResponse(status=304)
    else:
        resp = HttpResponse(body, content_type='application/json; charset=utf-8')
    resp['ETag'] = etag
    resp['Cache-Control'] = 'private, max-age=0, must-revalidate'
    resp['Vary'] = 'Cookie'
    return resp


def guest_endpoint(view):
    """GET + `guest_api` yoqiq + tezlik cheklovi."""
    @require_GET
    def wrapper(request, *args, **kwargs):
        if not _enabled():
            return _error('Topilmadi', 404)
        if _throttled(request):
            resp = _error("Juda ko'p so'rov. Keyinroq urinib ko'ring.", 429)
            resp['Retry-After'] = str(_RATE_WINDOW)
            return resp
        return view(request, *args, **kwargs)
    wrapper.__name__ = view.__name__
    wrapper.__doc__ = view.__doc__
    return wrapper


class _SessionOnly:
    """`_get_tma_table` so'rovni URL (?table=) dan ham o'qiydi va sessiyaga yozadi. O'qish API'si sessiyani o'zgartirmasligi
    uchun unga faqat sessiya beriladi (stol faqat QR/NFC orqali sahifada bog'langan bo'lsa aniqlanadi)."""

    def __init__(self, request):
        self.session = request.session
        self.GET = {}
        self.POST = {}


def _table_of(request):
    from web.tma_views import _get_tma_table
    table, _token = _get_tma_table(_SessionOnly(request))
    return table


def _shop_part(shop):
    return {'name': shop.name if shop else 'Guliston'}


def _table_part(table):
    return {
        'number': str(table.number) if table else '',
        'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
    }


def _cart_count(request):
    from web.tma_views import _calculate_cart_count
    return _calculate_cart_count(request.session.get('cart', {}))


# ── Quruvchilar: sahifadagi `window.__GULISTON_*_DATA__` bloki bilan bir xil ──

def build_welcome(request):
    """`/welcome/` sahifasi bloki (`tma_welcome`)."""
    from notifications.admin_bot import get_restaurant_shop
    from web.tma_views import _featured_dishes
    shop = get_restaurant_shop()
    table = _table_of(request)
    return {
        'shop': _shop_part(shop),
        'table': _table_part(table),
        'cartCount': _cart_count(request),
        'allow_table_number': bool(getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False)),
        'featured': _featured_dishes(table.shop if (table and table.shop) else shop),
    }


def build_session(request):
    """Mehmon sessiyasi: rol, dizayn, fasl, harakat + restoran, stol, savat soni."""
    from notifications.admin_bot import get_restaurant_shop
    from web.restaurant_auth import spa_session
    table = _table_of(request)
    shop = table.shop if (table and table.shop) else get_restaurant_shop()
    return {
        'session': spa_session(request),
        'shop': _shop_part(shop),
        'table': _table_part(table) if table else None,
        'cartCount': _cart_count(request),
    }


# ── Ko'rinishlar ──

@guest_endpoint
def session_view(request):
    """GET /api/guest/v1/session/"""
    return guest_json(request, build_session(request))


@guest_endpoint
def welcome_view(request):
    """GET /api/guest/v1/welcome/"""
    return guest_json(request, build_welcome(request))


def menu_view(request, *args, **kwargs):
    """GET /api/guest/v1/menu/ — `/api/v1/restaurant/menu/` bilan BIR XIL javob va ETag/304 (yangi kod yo'q)."""
    from orders.interfaces.api.views import RestaurantMenuView

    @guest_endpoint
    def _gate(req):
        return RestaurantMenuView.as_view()(req)
    return _gate(request)
