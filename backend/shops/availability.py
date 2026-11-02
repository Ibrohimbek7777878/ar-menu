"""
Restoran buyurtma qabul qila oladimi: qo'lda "yopiq" tugmasi, ish vaqti, xizmat turi, minimal summa (TZ: P1-4).

Avval `is_open`, `working_hours`, `min_order` faqat saqlanardi va mehmon baribir buyurtma bera olardi.
Hamma tekshiruv shu yerda: mehmon sahifasi (nima ko'rsatish) va `/checkout/` (rad etish) bir xil javob oladi.

Ish vaqti matni erkin yoziladi ("08:00-22:00", "06:00 - 23:00"). O'qib bo'lmasa, restoran OCHIQ hisoblanadi: noto'g'ri yozilgan
matn tufayli egasi buyurtmasiz qolmasin. Kechasi o'tadigan oraliq ("18:00-02:00") ham to'g'ri ishlaydi.
`working_days` matni erkin ("Dush-Shan") va noaniq, shu sababli hisobga olinmaydi.
"""
import logging
import re
from collections import namedtuple
from datetime import time
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

SERVICE_TYPES = ('table', 'pickup', 'delivery')

_HOURS_RE = re.compile(r'(\d{1,2})\s*[:.]\s*(\d{2})\s*[-–—]\s*(\d{1,2})\s*[:.]\s*(\d{2})')

Rejection = namedtuple('Rejection', 'code message')


def parse_working_hours(text):
    """'08:00-22:00' -> (time(8,0), time(22,0)); tushunarsiz yoki "24 soat" bo'lsa None (ya'ni doim ochiq)."""
    m = _HOURS_RE.search(text or '')
    if not m:
        return None
    h1, m1, h2, m2 = (int(x) for x in m.groups())
    if h1 > 23 or m1 > 59 or h2 > 24 or m2 > 59 or (h2 == 24 and m2 != 0):
        return None
    start = time(h1, m1)
    end = time.max if h2 == 24 else time(h2, m2)
    if start == end:
        return None
    return start, end


def is_within_working_hours(working_hours, now=None):
    parsed = parse_working_hours(working_hours)
    if parsed is None:
        return True
    start, end = parsed
    t = timezone.localtime(now or timezone.now()).time()
    if start < end:
        return start <= t < end or (end == time.max and t >= start)
    return t >= start or t < end          # kechadan o'tadigan oraliq (18:00-02:00)


def _profile(shop):
    return getattr(shop, 'business_profile', None) or {}


def order_gate(shop, service_type, subtotal, now=None):
    """Buyurtmani rad etish sababi (`Rejection`) yoki qabul qilinsa None."""
    if not getattr(shop, 'is_open', True):
        return Rejection('closed', "Restoran hozir buyurtma qabul qilmayapti.")
    bp = _profile(shop)
    if bp.get('enforce_working_hours', getattr(settings, 'RESTAURANT_ENFORCE_WORKING_HOURS', True)) and not is_within_working_hours(shop.working_hours, now):
        return Rejection('outside_hours', f"Restoran hozir yopiq. Ish vaqti: {shop.working_hours}.")
    if service_type in (bp.get('disabled_service_types') or []):
        return Rejection('service_disabled', "Bu xizmat turi hozir mavjud emas.")
    if service_type == 'delivery' and shop.min_order and Decimal(subtotal) < Decimal(shop.min_order):
        return Rejection('min_order', f"Yetkazib berish uchun buyurtma kamida {int(shop.min_order):,} so'm bo'lishi kerak.".replace(',', ' '))
    return None


def quote_totals(shop, service_type, subtotal):
    """(yetkazish haqi, yakuniy summa). Yetkazish haqi FAQAT yetkazib berishda; belgilangan summadan boshlab bepul."""
    subtotal = Decimal(subtotal)
    if service_type != 'delivery':
        return Decimal('0'), subtotal
    fee = Decimal(shop.delivery_fee) if subtotal < Decimal(shop.free_delivery_from) else Decimal('0')
    return fee, subtotal + fee


def checkout_gate_payload(shop, default_service, subtotal):
    """Mehmon /checkout/ sahifasi bloki uchun: restoran hozir buyurtma qabul qiladimi (sahifa ham, API ham shu funksiyani ishlatadi)."""
    gate = order_gate(shop, default_service, subtotal)
    return {
        # min_order faqat yetkazishda va summaga bog'liq: "yopiq" ekranini ko'rsatmaydi, sahifa o'zi ogohlantiradi
        'orderGate': {'open': gate is None or gate.code == 'min_order',
                      'code': gate.code if gate else '', 'message': gate.message if gate else ''},
        'minOrder': int(shop.min_order or 0),
        'workingHours': shop.working_hours or '',
        'onlinePayment': bool(getattr(settings, 'RESTAURANT_ONLINE_PAYMENT_ENABLED', False)),
    }
