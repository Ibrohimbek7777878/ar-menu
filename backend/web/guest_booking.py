"""
Mehmon bron API (`/api/restaurant/guest/booking/…`) va `/book/` sahifasi. TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MULTITENANT_BRON_BREND_VIDEO_TUR_2026-11-03.md

Oqim (video bo'yicha): stol tanlash → sana → vaqt oralig'i (band vaqtlar o'chirilgan) → mehmonlar → ism, telefon → tadbir turi → izoh → "Bron qilish".

  GET  booking/config/                 sozlama + zal/stol rejasi (+ CSRF cookie o'rnatiladi)
  GET  booking/availability/?date=&guests=   hamma stollar uchun vaqt holatlari (bitta so'rovda)
  POST booking/                        bron yaratish (CSRF: X-CSRFToken sarlavhasi, cookie `csrftoken` dan)
  GET  booking/<kod>/[?phone=XXXX]     bron holatini kod bo'yicha ko'rish

Xavfsizlik:
  • Restoran FAQAT `guest_shop_id(request)` dan (QR stol restorani / tenant / asosiy restoran): so'rovdagi hech qaysi id bilan
    boshqa restoran ma'lumotiga chiqib bo'lmaydi; boshqa restoran stoli — 404.
  • Hamma javob `no-store`; availability'da boshqa mehmonlarning ism/telefoni YO'Q (faqat holat).
  • Tezlik chegarasi (kesh hisoblagichi, O(1)): IP bo'yicha o'qish/yozish, telefon bo'yicha yozish, kod bo'yicha qidirish. Kesh ishlamasa
    xizmat to'xtamaydi.
  • Tana JSON obyekt, 8 KB gacha; har maydon turi tekshiriladi (son/ro'yxat/None 500 bermaydi).
"""
import json
import re
import time as time_module

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.http.request import RawPostDataException
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from backend.ratelimit import client_ip
from shops import booking_config as bc
from tables_restaurant import booking as svc
from tables_restaurant.reservations import ReservationError
from web import tma_views
from web.restaurant_auth import guest_shop_id

MAX_BODY_BYTES = 8 * 1024


# `/book/` sahifasi: mehmon React ilovasi (BookingPage) shu yerda mount bo'ladi. Sahifa ochilganda CSRF cookie o'rnatiladi
# (POST /api/restaurant/guest/booking/ uchun), qolgan hammasi `tma_home` ning o'zi (ETag/304 ham).
book_page = ensure_csrf_cookie(tma_views.tma_home)


# ── Umumiy yordamchilar ──────────────────────────────────────────────────────────────────────────────────────

def _json(payload, status=200):
    resp = JsonResponse(payload, status=status, json_dumps_params={'ensure_ascii': False})
    resp['Cache-Control'] = 'no-store'
    return resp


def _error(message, status=400, code='invalid', field=None, **extra):
    body = {'error': message, 'code': code}
    if field:
        body['field'] = field
    body.update(extra)
    return _json(body, status)


def _booking_error(exc):
    return _error(exc.message, exc.status, exc.code, getattr(exc, 'field', None))


def _limit(name, default):
    try:
        return int(getattr(settings, name, default))
    except (TypeError, ValueError):
        return default


def _hit(scope, ident, limit, window):
    """Oyna hisoblagichi: `limit` dan oshsa True. limit <= 0 — cheklov yo'q. Kesh buzilsa False (xizmat to'xtamaydi)."""
    if limit <= 0:
        return False
    # Tenant (restoran) bo'yicha alohida hisoblagich: bir mijozning gavjum paytida boshqasiga ta'sir qilmasin
    from shops.tenancy import current_tenant
    tenant = current_tenant()
    key = f'gbook:{getattr(tenant, "id", 0)}:{scope}:{ident}:{int(time_module.time() // window)}'
    try:
        cache.add(key, 0, timeout=window + 10)
        return cache.incr(key) > limit
    except Exception:  # noqa: BLE001
        return False


def _too_many(window):
    resp = _error("Juda ko'p so'rov. Birozdan keyin urinib ko'ring.", 429, 'rate_limited', retry_after=window)
    resp['Retry-After'] = str(window)
    return resp


def _read_throttled(request, scope):
    return _hit(f'r{scope}', client_ip(request), _limit('GUEST_BOOKING_READ_RATE_LIMIT', 600), 60)


def _shop_id(request):
    return guest_shop_id(request)


def _guest_config(shop_id):
    """Mehmon uchun bron sozlamasi: restoran brendida «bron» bo'limi o'chirilgan bo'lsa (shops/brand.py `modules.booking`), onlayn bron
    yopiq hisoblanadi — interfeysdagi yashirish serverda ham o'tadi. Xodim bronlari (qo'lda) va mavjud bronlarni ko'rish bunga bog'liq emas."""
    config = bc.get_booking_config(shop_id)
    if config['enabled']:
        from shops.brand import module_enabled
        from shops.guest_profile import guest_brand_for_shop_id
        if not module_enabled(guest_brand_for_shop_id(shop_id), 'booking'):
            config['enabled'] = False
    return config


# ── Sozlama va zal rejasi ────────────────────────────────────────────────────────────────────────────────────

@ensure_csrf_cookie
@require_GET
def booking_config(request):
    """Mehmon ekrani uchun: bron yoqilganmi, vaqt oraliqlari, tadbir turlari, cheklovlar va zal rejasi (faol zal/stollar)."""
    if _read_throttled(request, 'config'):
        return _too_many(60)
    shop_id = _shop_id(request)
    if not shop_id:
        return _json({'enabled': False, 'slots': [], 'event_types': [], 'max_days_ahead': 0, 'duration_minutes': 0,
                      'min_notice_minutes': 0, 'closed_weekdays': [], 'shop': {'name': ''}, 'halls': []})
    from shops.models import Shop
    config = _guest_config(shop_id)
    name = Shop.objects.filter(pk=shop_id).values_list('name', flat=True).first() or ''
    halls = svc.halls_payload(shop_id) if config['enabled'] else []
    return _json({
        'enabled': config['enabled'],
        'slots': config['slots'],
        'event_types': config['event_types'],
        'max_days_ahead': config['max_days_ahead'],
        'duration_minutes': config['duration_minutes'],
        'min_notice_minutes': config['min_notice_minutes'],
        'closed_weekdays': config['closed_weekdays'],
        'shop': {'name': name},
        'halls': halls,
    })


@require_GET
def booking_availability(request):
    """?date=YYYY-MM-DD&guests=N → har stol uchun har vaqt: free | taken | past | closed | too_small."""
    if _read_throttled(request, 'avail'):
        return _too_many(60)
    shop_id = _shop_id(request)
    if not shop_id:
        return _error('Restoran topilmadi', 404, 'not_found')
    try:
        date = svc.parse_date(request.GET.get('date'), 'date')
        raw_guests = request.GET.get('guests')
        guests = svc.parse_int(raw_guests, 'guests', 1, 500, 'Mehmonlar soni') if raw_guests not in (None, '') else 1
    except svc.BookingError as exc:
        return _booking_error(exc)
    config = _guest_config(shop_id)
    if not config['enabled']:
        return _error('Onlayn bron hozircha yopiq', 403, 'booking_disabled')
    return _json(svc.availability(shop_id, date, guests, config))


# ── Bron yaratish ────────────────────────────────────────────────────────────────────────────────────────────

def _read_body(request):
    # Form/multipart so'rovda Django (CSRF o'rta qatlami) oqimni oldin o'qib qo'ygan bo'lishi mumkin: tana endi o'qilmaydi -> 400, 500 emas
    try:
        raw = request.body
    except RawPostDataException:
        return None, _error("So'rov tanasi JSON bo'lishi kerak (Content-Type: application/json)", 400)
    if len(raw) > MAX_BODY_BYTES:
        return None, _error("So'rov juda katta", 413, 'too_large')
    try:
        data = json.loads(raw.decode('utf-8') or 'null')
    except (ValueError, UnicodeDecodeError):
        return None, _error("So'rov tanasi JSON bo'lishi kerak", 400)
    if not isinstance(data, dict):
        return None, _error("So'rov tanasi JSON obyekt bo'lishi kerak", 400)
    return data, None


@require_POST
def booking_create(request):
    """Bron yaratish. 201: {public_code, status, table, date, time, guests, duration_minutes}.
    400 {error, field} · 403 booking_disabled · 404 table_not_found · 409 slot_taken · 429."""
    if _hit('wip', client_ip(request), _limit('GUEST_BOOKING_WRITE_RATE_LIMIT', 20), 60):
        return _too_many(60)
    data, bad = _read_body(request)
    if bad is not None:
        return bad
    # Bir telefon ketma-ket ko'p bron yuborib restoranni to'ldirib qo'ymasin (format noto'g'ri bo'lsa, bu yerda hisoblanmaydi)
    tail = svc.phone_tail(data.get('phone') if isinstance(data.get('phone'), (str, int)) else '')
    if len(tail) == 9 and _hit('wph', tail, _limit('GUEST_BOOKING_PHONE_RATE_LIMIT', 6), 600):
        return _too_many(600)
    shop_id = _shop_id(request)
    if not shop_id:
        return _error('Restoran topilmadi', 404, 'not_found')
    try:
        reservation, created = svc.create_booking(shop_id, data, staff=False, config=_guest_config(shop_id))
    except ReservationError as exc:
        return _booking_error(exc)
    resp = _json(svc.serialize_guest(reservation), 201)
    if not created:
        resp['Idempotent-Replayed'] = 'true'
    return resp


# ── Kod bo'yicha ko'rish ─────────────────────────────────────────────────────────────────────────────────────

@require_GET
def booking_status(request, public_code):
    """Bron holati. Kod 31^5 variantli, tasodifiy; qidirish tezligi cheklangan. `?phone=` (oxirgi 4 raqam) berilsa va mos kelsa —
    ism ham qaytadi; mos kelmasa yoki kod noto'g'ri bo'lsa — bir xil 404 (kodni terib ko'rishga yordam bermaydi)."""
    if _hit('code', client_ip(request), _limit('GUEST_BOOKING_LOOKUP_RATE_LIMIT', 30), 60):
        return _too_many(60)
    shop_id = _shop_id(request)
    reservation = svc.find_by_code(shop_id, public_code, request.GET.get('phone')) if shop_id else None
    if reservation is None:
        return _error('Bron topilmadi', 404, 'not_found')
    body = svc.serialize_guest(reservation)
    config = bc.get_booking_config(shop_id)
    body['event_type'] = reservation.event_type or ''
    body['event_label'] = bc.event_label(config, reservation.event_type)
    if len(re.sub(r'[^0-9]', '', request.GET.get('phone') or '')) >= 4:        # telefon mos kelgan: ism (maskalangan)
        from tables_restaurant.privacy import mask_name
        body['name'] = mask_name(reservation.customer_name)
    return _json(body)

