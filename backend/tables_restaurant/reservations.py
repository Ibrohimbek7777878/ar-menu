"""
Stol bronlari xizmati (TZ: R4-1 … R4-5).

Avval bron uchta joyda alohida yaratilardi (API, mehmon sahifasi, hostess), hech birida to'qnashuv tekshiruvi
yo'q edi; noto'g'ri sana jimgina "bugun", noto'g'ri vaqt "19:00" bo'lib ketardi; holat nomlari frontend va
backendda farq qilardi (`arrived` serverda `seated` ga aylanib, stolni band qilib qo'yardi). Endi hamma yo'l shu
yerdan o'tadi:

  • sana va vaqt qat'iy tekshiriladi (o'tmish, juda uzoq kelajak va noto'g'ri format — aniq xato);
  • bir stolga bir vaqt oralig'ida ikki faol bron bo'lmaydi (oraliq = RESERVATION_SLOT_MINUTES, standart 120 daqiqa);
  • stol berilmasa, tizim shu vaqtga bo'sh va sig'imi yetarli eng kichik stolni o'zi tanlaydi;
  • holat o'tishlari cheklangan (pending → confirmed → arrived → seated → completed; bekor qilish mumkin);
  • "o'tirdi" stolni band qiladi, "yakunlandi/bekor" ochiq hisobi yo'q stolni bo'shatadi.
"""
import datetime
import re

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Table, TableReservation

ACTIVE = TableReservation.ACTIVE_STATUSES
GRACE_MINUTES = 15            # bugungi bron uchun: boshlanish vaqtidan shuncha kech bo'lsa ham qabul qilinadi

TRANSITIONS = {
    'pending': {'confirmed', 'arrived', 'seated', 'cancelled'},
    'confirmed': {'arrived', 'seated', 'cancelled'},
    'arrived': {'seated', 'cancelled'},
    'seated': {'completed', 'cancelled'},
    'completed': set(),
    'cancelled': set(),
}

_TIME_RE = re.compile(r'^(\d{1,2}):(\d{2})(?::\d{2})?$')


class ReservationError(Exception):
    """Foydalanuvchiga ko'rsatiladigan bron xatosi. status: 400 (noto'g'ri ma'lumot) yoki 409 (to'qnashuv)."""

    def __init__(self, message, status=400, code='invalid'):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


# ── Sozlamalar ──────────────────────────────────────────────────────────────────────────────────────────────

def _setting_int(key, default, minimum, maximum):
    from notifications.models import AppSetting
    row = AppSetting.objects.filter(key=key.lower()).first()
    raw = row.value if row is not None else getattr(settings, key.upper(), default)
    try:
        return max(minimum, min(maximum, int(raw)))
    except (TypeError, ValueError):
        return default


def slot_minutes():
    """Bitta bron stolni necha daqiqa band qiladi (admin: AppSetting 'reservation_slot_minutes')."""
    return _setting_int('reservation_slot_minutes', 120, 30, 480)


def max_days_ahead():
    return _setting_int('reservation_max_days_ahead', 90, 1, 365)


def max_guests():
    return _setting_int('reservation_max_guests', 40, 1, 500)


# ── Tekshiruvlar ────────────────────────────────────────────────────────────────────────────────────────────

def parse_date(value, today=None):
    today = today or timezone.localdate()
    try:
        parsed = datetime.date.fromisoformat(str(value or '').strip())
    except ValueError:
        raise ReservationError("Sana noto'g'ri. Format: YYYY-MM-DD (masalan 2026-11-05)") from None
    if parsed < today:
        raise ReservationError("Bron sanasi o'tmishda bo'lishi mumkin emas")
    if parsed > today + datetime.timedelta(days=max_days_ahead()):
        raise ReservationError(f"Bron {max_days_ahead()} kundan ortiq oldin qabul qilinmaydi")
    return parsed


def parse_time(value):
    match = _TIME_RE.match(str(value or '').strip())
    if not match or int(match.group(1)) > 23 or int(match.group(2)) > 59:
        raise ReservationError("Vaqt noto'g'ri. Format: SS:DD (masalan 19:30)")
    return datetime.time(int(match.group(1)), int(match.group(2)))


def parse_guests(value):
    try:
        count = int(value)
    except (TypeError, ValueError):
        raise ReservationError("Mehmonlar soni son bo'lishi kerak") from None
    if count < 1 or count > max_guests():
        raise ReservationError(f"Mehmonlar soni 1 dan {max_guests()} gacha bo'lishi kerak")
    return count


def clean_phone(value, required=True):
    phone = str(value or '').strip()
    digits = re.sub(r'\D', '', phone)
    if not phone and not required:
        return ''
    if not 9 <= len(digits) <= 15:
        raise ReservationError("Telefon raqami noto'g'ri (kamida 9 ta raqam)")
    return phone[:30]


def clean_name(value, required=True):
    name = ' '.join(str(value or '').split())
    if not name and not required:
        return ''
    if len(name) < 2:
        raise ReservationError("Ism kamida 2 ta belgidan iborat bo'lishi kerak")
    return name[:120]


def _minutes(t: datetime.time) -> int:
    return t.hour * 60 + t.minute


def _check_not_past(date, time, now=None):
    now = now or timezone.localtime()
    if date == now.date() and _minutes(time) < _minutes(now.time()) - GRACE_MINUTES:
        raise ReservationError("Bu vaqt allaqachon o'tib ketgan")


# ── To'qnashuv ──────────────────────────────────────────────────────────────────────────────────────────────

def conflicting(table, date, time, exclude_id=None):
    """Shu stolning shu kundagi, vaqti kesishadigan faol bronlari."""
    slot = slot_minutes()
    start = _minutes(time)
    qs = TableReservation.objects.filter(table=table, reservation_date=date, status__in=ACTIVE, is_deleted=False)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return [r for r in qs if abs(_minutes(r.reservation_time) - start) < slot]


def _free_at(table, date, time, exclude_id=None):
    return not conflicting(table, date, time, exclude_id)


def _conflict_error(clash):
    first = clash[0]
    return ReservationError(
        f"Bu stol {first.reservation_time.strftime('%H:%M')} atrofida band (bron {first.code}). Boshqa vaqt yoki stol tanlang",
        status=409, code='conflict')


def auto_assign_table(shop, date, time, guests, hall=None, exclude_id=None, free_now=False):
    """Shu vaqtga bo'sh va sig'imi yetarli eng kichik stol (zal berilsa — shu zaldan).
    free_now=True (jonli mehmon): stol hozir ham bo'sh bo'lishi shart."""
    qs = Table.objects.filter(shop=shop, is_active=True, is_deleted=False, capacity__gte=guests)
    if hall is not None:
        qs = qs.filter(hall=hall)
    if free_now:
        qs = qs.filter(status__in=('free', 'cleaning'))
    for table in qs.select_for_update().order_by('capacity', 'id'):
        if _free_at(table, date, time, exclude_id):
            return table
    return None


def _find_table(shop, number):
    table = Table.objects.filter(shop=shop, number=str(number).strip(), is_active=True, is_deleted=False).first()
    if not table:
        raise ReservationError(f"Stol topilmadi: {number}")
    return table


def _find_hall(shop, hall_id=None, hall_name=None):
    from .models import Hall
    qs = Hall.objects.filter(shop=shop, is_active=True)      # faqat shu restoranning zali (boshqa restoran zali emas)
    if hall_id:
        hall = qs.filter(pk=hall_id).first() if str(hall_id).isdigit() else None
        if not hall:
            raise ReservationError("Zal topilmadi")
        return hall
    if hall_name:
        return qs.filter(name__iexact=str(hall_name).strip()).first()
    return None


# ── Yaratish ────────────────────────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def create_reservation(shop, data, by_staff=False):
    """
    Yangi bron. Mehmon: har doim 'pending', ism va telefon majburiy. Xodim: status ('pending'/'confirmed')
    yoki `walk_in` (hozir kelgan mehmon — darhol 'seated', stol band qilinadi).
    """
    get = data.get
    walk_in = bool(by_staff and (get('walk_in') in (True, 'true', '1', 1) or get('status') in ('seated', 'arrived')))
    now = timezone.localtime()

    if walk_in:
        date, time = now.date(), now.time().replace(second=0, microsecond=0)
        name = clean_name(get('customer_name') or get('name') or 'Mehmon', required=False) or 'Mehmon'
        phone = clean_phone(get('customer_phone') or get('phone'), required=False)
    else:
        date_raw = get('reservation_date') or get('date')
        time_raw = get('reservation_time') or get('time')
        if not date_raw or not time_raw:
            raise ReservationError("Bron sanasi va vaqtini kiriting")
        date, time = parse_date(date_raw), parse_time(time_raw)
        _check_not_past(date, time, now)
        name = clean_name(get('customer_name') or get('name'))
        phone = clean_phone(get('customer_phone') or get('phone'))

    guests = parse_guests(get('guests_count') if get('guests_count') not in (None, '') else 2)
    hall = _find_hall(shop, get('hall_id'), get('hall_name') or get('hall'))

    table_number = get('table_number')
    if table_number not in (None, ''):
        table = _find_table(shop, table_number)
        if not by_staff and guests > table.capacity:
            raise ReservationError(f"Bu stol {table.capacity} kishilik. Mehmonlar sonini kamaytiring yoki boshqa stol tanlang")
        table = Table.objects.select_for_update().get(pk=table.pk)
        if walk_in and table.status not in ('free', 'cleaning'):
            raise ReservationError(f"Stol №{table.number} hozir band", status=409, code='table_busy')
        clash = conflicting(table, date, time)
        if clash:
            raise _conflict_error(clash)
    else:
        table = auto_assign_table(shop, date, time, guests, hall, free_now=walk_in)
        if table is None:
            from django.db.models import Max
            biggest = Table.objects.filter(shop=shop, is_active=True, is_deleted=False).aggregate(m=Max('capacity'))['m'] or 0
            if guests > biggest:
                raise ReservationError(
                    f"{guests} kishilik stol yo'q (eng katta stol {biggest} kishilik). Mehmonlar sonini kamaytiring "
                    f"yoki restoran bilan bog'laning", status=409, code='party_too_large')
            raise ReservationError("Bu vaqtga bo'sh stol qolmagan. Boshqa vaqtni tanlang", status=409, code='no_table')

    if walk_in and table.status not in ('free', 'cleaning'):
        raise ReservationError(f"Stol №{table.number} hozir band", status=409, code='table_busy')

    status = 'seated' if walk_in else ('confirmed' if by_staff and get('status') == 'confirmed' else 'pending')
    reservation = TableReservation.objects.create(
        shop=shop, table=table, hall=table.hall or hall, customer_name=name, customer_phone=phone,
        guests_count=guests, reservation_date=date, reservation_time=time, notes=str(get('notes') or '')[:1000],
        status=status, is_walk_in=walk_in,
    )

    # Parallel so'rov oldin yozib qo'ygan bo'lsa (SQLite'da qator qulfi yo'q) — ikkinchisi bekor qilinadi
    if [r for r in conflicting(table, date, time, exclude_id=reservation.pk) if r.pk < reservation.pk]:
        raise ReservationError("Bu stol hozirgina band qilindi. Boshqa vaqt yoki stol tanlang", status=409, code='conflict')

    if walk_in:
        table.status = 'occupied'
        table.save(update_fields=['status'])

    from notifications.outbox import publish_outbox_event
    publish_outbox_event('reservation', str(reservation.pk), 'reservation_created', {'reservation_id': reservation.pk})
    return reservation


# ── Holat o'zgartirish ──────────────────────────────────────────────────────────────────────────────────────

def _release_table(table):
    """Hisobi ochiq bo'lmasa stolni bo'shatadi (to'lanmagan faol buyurtma bo'lsa — qoldiradi)."""
    from orders.models import Order
    if table is None or table.status == 'free':
        return
    unpaid = Order.objects.filter(table=table, payment_status='unpaid').exclude(status__in=['cancelled', 'failed']).exists()
    if not unpaid:
        table.status = 'free'
        table.save(update_fields=['status'])


@transaction.atomic
def change_status(shop, reservation_id, new_status, table_number=None):
    reservation = (TableReservation.objects.select_for_update(of=('self',))
                   .select_related('table', 'hall').filter(pk=reservation_id, shop=shop, is_deleted=False).first())
    if not reservation:
        raise ReservationError('Bron topilmadi', status=404, code='not_found')
    if new_status not in dict(TableReservation.STATUS_CHOICES):
        raise ReservationError("Noto'g'ri holat")
    old = reservation.status
    if new_status == old:
        return reservation
    if new_status not in TRANSITIONS[old]:
        raise ReservationError(
            f"Bronni '{dict(TableReservation.STATUS_CHOICES)[old]}' holatidan "
            f"'{dict(TableReservation.STATUS_CHOICES)[new_status]}' ga o'tkazib bo'lmaydi", status=409, code='bad_transition')

    if table_number not in (None, ''):               # xodim stolni qo'lda biriktiradi yoki almashtiradi
        table = Table.objects.select_for_update().get(pk=_find_table(shop, table_number).pk)
        clash = conflicting(table, reservation.reservation_date, reservation.reservation_time, exclude_id=reservation.pk)
        if clash:
            raise _conflict_error(clash)
        reservation.table = table

    if new_status == 'seated':
        table = reservation.table
        if table is None:
            raise ReservationError("Avval bronga stol biriktiring", status=409, code='no_table')
        table = Table.objects.select_for_update().get(pk=table.pk)
        if table.status not in ('free', 'cleaning'):
            raise ReservationError(f"Stol №{table.number} hozir band", status=409, code='table_busy')
        table.status = 'occupied'
        table.save(update_fields=['status'])
        reservation.table = table
    elif old == 'seated' and new_status in ('completed', 'cancelled'):
        _release_table(Table.objects.select_for_update().filter(pk=reservation.table_id).first())

    reservation.status = new_status
    reservation.save(update_fields=['status', 'table', 'updated_at'])

    from notifications.outbox import publish_outbox_event
    publish_outbox_event('reservation', str(reservation.pk), 'reservation_status_changed',
                         {'reservation_id': reservation.pk, 'status': new_status})
    return reservation


# ── Ro'yxat va ko'rinish ────────────────────────────────────────────────────────────────────────────────────

def serialize(reservation, mask=False):
    """API/React uchun bron ma'lumoti. mask=True — mehmonga ko'rsatiladigan (ism va telefon yashirilgan) ko'rinish."""
    from .privacy import mask_name, mask_phone
    table = reservation.table
    hall = reservation.hall or (table.hall if table and table.hall_id else None)
    name = mask_name(reservation.customer_name) if mask else reservation.customer_name
    phone = mask_phone(reservation.customer_phone) if mask else reservation.customer_phone
    time = reservation.reservation_time.strftime('%H:%M') if reservation.reservation_time else ''
    return {
        'id': reservation.pk,
        'code': reservation.code,
        'name': name,
        'customer_name': name,
        'phone': phone,
        'customer_phone': phone,
        'table_number': reservation.table_number,
        'hall': hall.name if hall else 'Asosiy Zal',
        'date': str(reservation.reservation_date),
        'time': time,
        'reservation_time': time,
        'guests_count': reservation.guests_count,
        'status': reservation.status,
        'notes': reservation.notes or '',
        'is_walk_in': reservation.is_walk_in,
    }


def list_reservations(shop, date=None, status=None, q=None, limit=200):
    """
    Xodim ro'yxati. date: 'today' (standart) | YYYY-MM-DD | 'all'. status: 'active' (standart) | 'all' | aniq holat.
    """
    from django.db.models import Q
    qs = TableReservation.objects.select_related('table', 'hall', 'table__hall').filter(shop=shop, is_deleted=False)
    if date in (None, '', 'today'):
        qs = qs.filter(reservation_date=timezone.localdate())
    elif date != 'all':
        try:
            qs = qs.filter(reservation_date=datetime.date.fromisoformat(str(date)))
        except ValueError:
            raise ReservationError("Sana noto'g'ri") from None
    if status in (None, '', 'active'):
        qs = qs.filter(status__in=ACTIVE)
    elif status != 'all':
        qs = qs.filter(status=status)
    if q:
        qs = qs.filter(Q(customer_name__icontains=q) | Q(customer_phone__icontains=q) | Q(table__number__icontains=q)
                       | Q(public_code__icontains=q))
    return list(qs.order_by('reservation_date', 'reservation_time', 'id')[:limit])


def upcoming_reserved_table_ids(shop, now=None, lead_minutes=60):
    """Yaqin orada (lead_minutes ichida yoki 15 daqiqa kechikkan) bron kutayotgan stollar — 'reserved' deb ko'rsatiladi."""
    now = now or timezone.localtime()
    ids = set()
    today = TableReservation.objects.filter(
        shop=shop, reservation_date=now.date(), status__in=('pending', 'confirmed', 'arrived'), is_deleted=False,
        table__isnull=False)
    for r in today:
        delta = _minutes(r.reservation_time) - _minutes(now.time())
        if -GRACE_MINUTES <= delta <= lead_minutes:
            ids.add(r.table_id)
    return ids
