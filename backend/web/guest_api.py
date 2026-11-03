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
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

from backend.ratelimit import client_ip
from web.guest_dish import name_translations, product_name_translations

_RATE_WINDOW = 60


def _enabled():
    from backend.app_settings import get_bool
    return get_bool('guest_api', True)


def _throttled(request):
    limit = int(getattr(settings, 'GUEST_API_RATE_LIMIT', 1200) or 0)
    if limit <= 0:
        return False
    from shops.tenancy import current_tenant_id
    tenant_id = current_tenant_id()
    tenant_part = '' if tenant_id is None else f"t{tenant_id}:"      # har tenantning o'z hisobi (tenantsiz rejimda kalit avvalgidek)
    key = f"guestapi:{tenant_part}{client_ip(request)}:{int(time.time() // _RATE_WINDOW)}"
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


def _cart_lines(request):
    """Sessiya savatidagi (restoran_id, taom_id, element) qatorlari. Buzuq tuzilma 500 bermaydi, o'tkazib yuboriladi."""
    cart = request.session.get('cart', {})
    if not isinstance(cart, dict):
        return []
    lines = []
    for shop_id, products in cart.items():
        if not isinstance(products, dict):
            continue
        for product_id, item in products.items():
            if isinstance(item, dict):
                lines.append((shop_id, product_id, item))
    return lines


def build_cart(request):
    """`/cart/` sahifasi bloki (`tma_cart`). Narx va nom sessiyadagi nusxadan (sahifadagi kabi)."""
    from notifications.admin_bot import get_restaurant_shop
    table = _table_of(request)
    items = []
    total = Decimal('0')
    lines = list(_cart_lines(request))
    cart_names = product_name_translations([product_id for _s, product_id, _i in lines])
    for _shop_id, product_id, item in lines:
        price = Decimal(str(item.get('price', 0)))
        qty = int(item.get('quantity', 1))
        subtotal = price * qty
        total += subtotal
        items.append({
            'product_id': int(product_id),
            'name': item.get('name'),
            **cart_names.get(int(product_id), {}),
            'price': float(price),
            'quantity': qty,
            'subtotal': float(subtotal),
            'image': item.get('image', '') or '',
            'unit': item.get('unit', 'dona') or 'dona',
        })
    shop = table.shop if (table and table.shop) else get_restaurant_shop()
    return {
        'shop': _shop_part(shop),
        'table': _table_part(table),
        'items': items,
        'cartCount': sum(i['quantity'] for i in items),
        'totalAmount': float(total),
        'demo': bool(settings.DEMO_MODE),
    }


def build_checkout(request):
    """`/checkout/` sahifasi bloki (`tma_checkout` GET qismi). FAQAT O'QISH: narx va mavjudlik serverdagi menyudan
    (sessiyadagi narxga ishonilmaydi); tugagan/arxivlangan taom ro'yxatga tushmaydi. Buyurtma yaratish bu yerda emas."""
    from notifications.admin_bot import get_restaurant_shop
    from products.models import Product
    from shops.availability import checkout_gate_payload
    from shops.models import Shop
    from tables_restaurant.models import Table

    lines = _cart_lines(request)
    table = _table_of(request)
    shop = table.shop if table else None           # QR stoli ishonchli manba (`/checkout/` bilan bir xil)
    if shop is None and lines:
        shop = Shop.objects.filter(id=lines[0][0]).first()
    shop = shop or get_restaurant_shop()

    ids = []
    for _shop_id, product_id, _item in lines:
        try:
            ids.append(int(product_id))
        except (TypeError, ValueError):
            continue
    product_qs = Product.objects.filter(id__in=ids, is_available=True, is_deleted=False)
    from shops.tenancy import current_tenant_id
    if current_tenant_id() is not None:
        product_qs = product_qs.filter(shop_id=current_tenant_id())    # multi-tenant: begona restoran taomi ro'yxatga tushmaydi
    products = {p.id: p for p in product_qs}

    items = []
    total = Decimal('0')
    for _shop_id, product_id, item in lines:
        try:
            product = products.get(int(product_id))
        except (TypeError, ValueError):
            product = None
        if product is None:
            continue
        price = product.effective_price if getattr(product, 'flash_active', False) else product.price
        qty = int(item.get('quantity', 1))
        subtotal = price * qty
        total += subtotal
        items.append({'name': product.name, **name_translations(product), 'price': float(price), 'quantity': qty,
                      'subtotal': float(subtotal)})

    all_tables = Table.objects.filter(shop=shop, is_active=True).select_related('hall').order_by('number') if shop else []
    return {
        'shop': _shop_part(shop),
        'table': {**_table_part(table), 'id': table.id if table else None},
        'items': items,
        'cartCount': sum(i['quantity'] for i in items),
        'subtotal': float(total),
        'allTables': [{'id': t.id, 'number': str(t.number), 'hall': t.hall.name if t.hall else 'Asosiy Zal'}
                      for t in all_tables],
        **(checkout_gate_payload(shop, 'table' if table else 'delivery', total) if shop else {}),
    }


def _order_dict(order, names=None):
    """Bitta buyurtma (sahifadagi `orders[]` elementi bilan bir xil). Telefon va ichki izoh yo'q."""
    return {
        'id': order.id,
        'order_number': order.order_number,
        'created_at': order.created_at.strftime("%d.%m.%Y · %H:%M"),
        'status': order.status,
        'status_display': order.get_status_display() or order.status,
        'total_amount': float(order.final_amount),
        'table_number': str(order.table.number) if order.table else '',
        'items': [{'name': it.product_name, **(names or {}).get(it.product_id, {}), 'quantity': it.quantity,
                   'price': float(it.price), 'total': float(it.total)}
                  for it in order.items.all()],
    }


def _orders_context(request, orders, cart_count):
    from notifications.admin_bot import get_restaurant_shop
    shop = get_restaurant_shop()
    table = _table_of(request)
    return {
        'shop': _shop_part(shop),
        'table': _table_part(table) if table else None,
        'orders': orders,
        'cartCount': cart_count,
        'onlinePayment': bool(getattr(settings, 'RESTAURANT_ONLINE_PAYMENT_ENABLED', False)),
    }


def build_orders(request):
    """`/orders/` sahifasi bloki (`tma_orders`): faqat shu mehmon sessiyasida berilgan oxirgi 30 buyurtma."""
    from orders.models import Order
    from web.restaurant_auth import guest_order_ids
    rows = (Order.objects.filter(pk__in=guest_order_ids(request))
            .select_related('table').prefetch_related('items').order_by('-created_at')[:30])
    cart = request.session.get('cart', {})
    try:
        cart_count = sum(int(item.get('quantity', 1)) for items in cart.values() for item in items.values())
    except Exception:
        cart_count = 0
    rows = list(rows)
    names = product_name_translations({it.product_id for o in rows for it in o.items.all() if it.product_id})
    return _orders_context(request, [_order_dict(o, names) for o in rows], cart_count)


def build_order_detail(request, pk):
    """`/tma/order/<id>/` sahifasi bloki (`tma_order_detail`). Begona yoki yo'q buyurtma uchun None (404)."""
    from orders.models import Order
    from web.restaurant_auth import can_view_order
    order = Order.objects.filter(pk=pk).select_related('table').prefetch_related('items').first()
    if order is None or not can_view_order(request, order):
        return None
    names = product_name_translations({it.product_id for it in order.items.all() if it.product_id})
    return _orders_context(request, [_order_dict(order, names)], 0)


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


@guest_endpoint
def cart_view(request):
    """GET /api/guest/v1/cart/"""
    return guest_json(request, build_cart(request))


@guest_endpoint
def checkout_view(request):
    """GET /api/guest/v1/checkout/ — faqat o'qish (buyurtma yaratish: POST /checkout/ yoki /api/v1/restaurant/orders/)"""
    return guest_json(request, build_checkout(request))


@guest_endpoint
def orders_view(request):
    """GET /api/guest/v1/orders/ — mening buyurtmalarim (faqat shu sessiyadagilar)"""
    return guest_json(request, build_orders(request))


@guest_endpoint
def order_detail_view(request, pk):
    """GET /api/guest/v1/orders/<id>/ — buyurtma holati; ETag/304 bilan jonli yangilash (polling) uchun arzon"""
    data = build_order_detail(request, pk)
    if data is None:
        return _error('Buyurtma topilmadi', 404)
    return guest_json(request, data)
