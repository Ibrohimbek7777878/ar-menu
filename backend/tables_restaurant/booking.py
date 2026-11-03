"""
Bron mexanizmi (mehmon + xodim): stol tanlash → sana → vaqt oralig'i → mehmonlar → ism, telefon → tadbir turi → izoh.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MULTITENANT_BRON_BREND_VIDEO_TUR_2026-11-03.md (Bosqich 1).

Eski `reservations.py` (hostess/mehmon sahifasi, avto-stol) o'zgarmadi; bu modul unga TAYANADI: to'qnashuv tekshiruvi (`conflicting`) va
holat mashinasi (`change_status`) bitta joyda qoladi. Yangi bron yo'llari (mehmon API, xodim API) shu yerdan o'tadi.

Poyga (bir stolga bir vaqtda ikkita so'rov):
  1. PostgreSQL: stol qatori `SELECT ... FOR UPDATE` bilan qulflanadi, shundan KEYIN to'qnashuv tekshiriladi. Ikkinchi so'rov birinchisi
     tugaguncha kutadi va uning bronini ko'radi (READ COMMITTED) → 409. Bu asosiy himoya.
  2. Saqlangandan keyin qayta tekshiruv (oldingi `pk` li to'qnashuvchi bron bormi) — qator qulfi yo'q bazalar (SQLite) uchun zaxira.
  3. `(shop, submission_id)` noyob cheklov — bir xil yuborish identifikatori DB darajasida ikkita bron bermaydi.
"""
import datetime
import re
import unicodedata

from django.db import IntegrityError, transaction
from django.utils import timezone

from shops import booking_config as bc

from . import reservations as legacy
from .models import Table, TableReservation

ACTIVE = TableReservation.ACTIVE_STATUSES
DAY = datetime.timedelta(days=1)
STAFF_MAX_DAYS_AHEAD = 365
STAFF_CREATE_STATUSES = ('pending', 'confirmed')
SLOT_STATES = ('free', 'taken', 'past', 'closed', 'too_small')

_DATE_RE = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}')
_TIME_RE = re.compile(r'([01]?[0-9]|2[0-3]):([0-5][0-9])')
_SUBMISSION_RE = re.compile(r'[A-Za-z0-9_.:-]{1,40}')
_PHONE_RE = re.compile(r'\+?[0-9][0-9 ()\-.]{6,24}')


class BookingError(legacy.ReservationError):
    """Bron xatosi: `status` 400 (noto'g'ri ma'lumot + `field`), 403, 404, 409. `code` — mashina o'qiydigan sabab."""

    def __init__(self, message, status=400, code='invalid', field=None):
        super().__init__(message, status=status, code=code)
        self.field = field


# ── Kirishni tekshirish (JSON'dan kelgan HAR QANDAY tur xavfsiz: son, ro'yxat, None...) ─────────────────────────

def _int(value, field, low, high, label='Qiymat'):
    number = None
    if isinstance(value, bool):
        number = None
    elif isinstance(value, int):
        number = value
    elif isinstance(value, float) and value.is_integer():
        number = int(value)
    elif isinstance(value, str) and re.fullmatch(r'[0-9]{1,9}', value.strip()):
        number = int(value.strip())
    if number is None or not low <= number <= high:
        raise BookingError(f"{label} {low} dan {high} gacha butun son bo'lishi kerak", field=field)
    return number


parse_int = _int


def _text(value, field, label, *, min_len=0, max_len, multiline=False):
    """Matn: faqat str. NUL va boshqaruv belgilari olib tashlanadi; uzunlik oshsa jimgina kesilmaydi — xato."""
    if value is None:
        text = ''
    elif isinstance(value, str):
        text = value
    else:
        raise BookingError(f"{label} matn bo'lishi kerak", field=field)
    keep = '\n\t' if multiline else ''
    text = ''.join(ch for ch in text if ch in keep or unicodedata.category(ch)[0] != 'C')
    text = text.strip() if multiline else ' '.join(text.split())
    if len(text) < min_len:
        raise BookingError(f"{label} kamida {min_len} ta belgidan iborat bo'lishi kerak" if min_len > 1 else f"{label} kiritilishi shart",
                           field=field)
    if len(text) > max_len:
        raise BookingError(f"{label} {max_len} ta belgidan oshmasligi kerak", field=field)
    return text


def parse_date(value, field='date'):
    text = value.strip() if isinstance(value, str) else ''
    if not _DATE_RE.fullmatch(text):
        raise BookingError("Sana YYYY-MM-DD ko'rinishida bo'lishi kerak (masalan 2026-11-05)", field=field)
    try:
        return datetime.date.fromisoformat(text)
    except ValueError:
        raise BookingError("Sana noto'g'ri", field=field) from None


def parse_time(value, field='time'):
    text = value.strip() if isinstance(value, str) else ''
    match = _TIME_RE.fullmatch(text)
    if not match:
        raise BookingError("Vaqt SS:DD ko'rinishida bo'lishi kerak (masalan 19:30)", field=field)
    return datetime.time(int(match.group(1)), int(match.group(2)))


def hhmm(time):
    return time.strftime('%H:%M')


def normalize_phone(value, *, uz_only, field='phone'):
    """Telefon → `+998901234567`. Mehmon: faqat O'zbekiston raqami (9 raqam yoki 998 bilan 12 raqam, 0 bilan 10 raqam).
    Xodim: boshqa davlat raqami ham ('+' bilan, 9-15 raqam)."""
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise BookingError("Telefon raqamini kiriting", field=field)
    text = str(value).strip()
    if not _PHONE_RE.fullmatch(text) or '+' in text[1:]:
        raise BookingError("Telefon raqami noto'g'ri. Masalan: +998 90 123 45 67", field=field)
    digits = re.sub(r'[^0-9]', '', text)
    if len(digits) == 10 and digits.startswith('0'):
        digits = digits[1:]
    if len(digits) == 9 and digits[0] != '0':
        digits = '998' + digits
    if len(digits) == 12 and digits.startswith('998'):
        return '+' + digits
    if not uz_only and text.startswith('+') and 9 <= len(digits) <= 15:
        return '+' + digits
    raise BookingError("Telefon raqami +998 bilan boshlanib, 12 ta raqamdan iborat bo'lishi kerak. Masalan: +998 90 123 45 67"
                       if uz_only else "Telefon raqami noto'g'ri", field=field)


def phone_tail(value):
    """Taqqoslash uchun oxirgi 9 raqam (formatdan qat'i nazar)."""
    return re.sub(r'[^0-9]', '', str(value or ''))[-9:]


def _event_type(value, config, field='event_type'):
    if value is None or value == '':
        return ''
    if not isinstance(value, str):
        raise BookingError("Tadbir turi noto'g'ri", field=field)
    key = value.strip()
    if key in ('', bc.NO_EVENT_KEY):
        return ''
    if key not in bc.event_type_keys(config):
        raise BookingError("Bunday tadbir turi yo'q", field=field)
    return key


def _submission_id(value):
    if value is None or value == '':
        return ''
    if not isinstance(value, str) or not _SUBMISSION_RE.fullmatch(value.strip()):
        raise BookingError("Yuborish identifikatori noto'g'ri (lotin harf, raqam, - _ . :, 40 belgigacha)", field='submission_id')
    return value.strip()


def pick(data, *names):
    """Bir nechta nomdan birinchi mavjudini oladi (xodim API: `date` ham `reservation_date` ham)."""
    for name in names:
        if name in data:
            return data[name]
    return None


# ── Sana / vaqt qoidalari ────────────────────────────────────────────────────────────────────────────────────

def _now_naive(now=None):
    return (now or timezone.localtime()).replace(tzinfo=None)


def day_state(date, config, today):
    """'ok' | 'past' | 'closed' (yopiq hafta kuni yoki juda uzoq kelajak)."""
    if date < today:
        return 'past'
    if date > today + datetime.timedelta(days=config['max_days_ahead']) or date.weekday() in config['closed_weekdays']:
        return 'closed'
    return 'ok'


def _check_guest_schedule(date, time, config, now):
    today = now.date()
    if date < today:
        raise BookingError("Bron sanasi o'tmishda bo'lishi mumkin emas", field='date', code='date_past')
    if date > today + datetime.timedelta(days=config['max_days_ahead']):
        raise BookingError(f"Bron {config['max_days_ahead']} kundan ortiq oldin qabul qilinmaydi", field='date', code='date_too_far')
    if date.weekday() in config['closed_weekdays']:
        raise BookingError("Bu kuni bron qabul qilinmaydi. Boshqa kunni tanlang", field='date', code='day_closed')
    if hhmm(time) not in bc.all_times(config):
        raise BookingError("Bu vaqtga bron qabul qilinmaydi. Ro'yxatdagi vaqtlardan birini tanlang", field='time', code='time_not_offered')
    if datetime.datetime.combine(date, time) < _now_naive(now) + datetime.timedelta(minutes=config['min_notice_minutes']):
        raise BookingError("Bu vaqt allaqachon o'tib ketgan yoki juda yaqin. Keyinroq vaqtni tanlang", field='time', code='too_late')


def _check_staff_schedule(date, now):
    today = now.date()
    if date < today:
        raise BookingError("Bron sanasi o'tmishda bo'lishi mumkin emas", field='date', code='date_past')
    if date > today + datetime.timedelta(days=STAFF_MAX_DAYS_AHEAD):
        raise BookingError(f"Bron {STAFF_MAX_DAYS_AHEAD} kundan ortiq oldin qabul qilinmaydi", field='date', code='date_too_far')


# ── Ko'rinish ────────────────────────────────────────────────────────────────────────────────────────────────

def table_part(reservation):
    table = reservation.table
    if table is None:
        return None
    hall = table.hall if table.hall_id else None
    return {'id': table.pk, 'number': str(table.number), 'hall': hall.name if hall else 'Asosiy Zal'}


def serialize_guest(reservation):
    """Mehmonga javob (POST va kod bo'yicha ko'rish): ism/telefon/izoh YO'Q."""
    return {
        'public_code': reservation.public_code,
        'status': reservation.status,
        'table': table_part(reservation),
        'date': str(reservation.reservation_date),
        'time': hhmm(reservation.reservation_time),
        'guests': reservation.guests_count,
        'duration_minutes': reservation.duration_minutes,
    }


def serialize_admin(reservation, config):
    return {
        'id': reservation.pk,
        'public_code': reservation.public_code,
        'table': table_part(reservation),
        'customer_name': reservation.customer_name,
        'customer_phone': reservation.customer_phone,
        'guests_count': reservation.guests_count,
        'reservation_date': str(reservation.reservation_date),
        'reservation_time': hhmm(reservation.reservation_time),
        'duration_minutes': reservation.duration_minutes,
        'event_type': reservation.event_type or '',
        'event_label': bc.event_label(config, reservation.event_type),
        'notes': reservation.notes or '',
        'status': reservation.status,
        'source': reservation.source,
        'created_at': timezone.localtime(reservation.created_at).isoformat(timespec='seconds') if reservation.created_at else None,
    }


# ── Stollar va bandlik ───────────────────────────────────────────────────────────────────────────────────────

def bookable_tables(shop):
    """Bron qilinadigan stollar: faol, o'chirilmagan, faol zalda. Zal tartibida."""
    return Table.objects.filter(shop=shop, is_active=True, is_deleted=False, hall__is_active=True).order_by('hall__order', 'hall_id', 'id')


def halls_payload(shop):
    """Mehmon uchun zallar va stollar (BITTA so'rov, N+1 yo'q)."""
    halls, order = {}, []
    for t in bookable_tables(shop).select_related('hall'):
        if t.hall_id not in halls:
            halls[t.hall_id] = {'id': t.hall_id, 'name': t.hall.name, 'tables': []}
            order.append(t.hall_id)
        halls[t.hall_id]['tables'].append({
            'id': t.pk, 'number': str(t.number), 'capacity': t.capacity, 'shape': t.shape or 'rect',
            'x': t.x, 'y': t.y, 'w': t.w, 'h': t.h, 'rotation': t.rotation,
        })
    return [halls[hall_id] for hall_id in order]


def _busy_intervals(shop, date):
    """{stol_id: [(boshlanish, tugash), ...]} — daqiqalarda, `date` ning 00:00 iga nisbatan. Kun chegarasidan o'tgan
    (kechagi 23:30 + 120 daq) va ertangi erta bronlar ham hisobga olinadi. BITTA so'rov."""
    busy = {}
    rows = (TableReservation.objects
            .filter(shop=shop, reservation_date__range=(date - DAY, date + DAY), status__in=ACTIVE, is_deleted=False, table__isnull=False)
            .values_list('table_id', 'reservation_date', 'reservation_time', 'duration_minutes'))
    for table_id, r_date, r_time, duration in rows:
        start = (r_date - date).days * 1440 + r_time.hour * 60 + r_time.minute
        busy.setdefault(table_id, []).append((start, start + (duration or legacy.slot_minutes())))
    return busy


def availability(shop, date, guests, config, now=None):
    """Hamma stollar uchun vaqt holatlari: free | taken | past | closed | too_small. So'rovlar: stollar (1) + bronlar (1).
    Boshqa mehmonlarning ism/telefoni javobda YO'Q: faqat holat."""
    now = now or timezone.localtime()
    state = day_state(date, config, now.date())
    times = bc.all_times(config)
    tables = list(bookable_tables(shop).values_list('pk', 'capacity'))
    busy = _busy_intervals(shop, date) if state == 'ok' else {}
    threshold = _now_naive(now) + datetime.timedelta(minutes=config['min_notice_minutes'])
    duration = config['duration_minutes']
    out = []
    for table_id, capacity in tables:
        intervals = busy.get(table_id, ())
        slots = {}
        for t in times:
            if state == 'closed':
                slots[t] = 'closed'
            elif state == 'past' or datetime.datetime.combine(date, datetime.time(int(t[:2]), int(t[3:]))) < threshold:
                slots[t] = 'past'
            elif capacity < guests:
                slots[t] = 'too_small'
            else:
                start = bc.minutes_of(t)
                end = start + duration
                slots[t] = 'taken' if any(start < b_end and b_start < end for b_start, b_end in intervals) else 'free'
        out.append({'id': table_id, 'slots': slots})
    return {'date': str(date), 'closed': state == 'closed', 'tables': out}


# ── Yaratish ─────────────────────────────────────────────────────────────────────────────────────────────────

def _slot_taken():
    return BookingError("Bu vaqtga stol band qilingan. Boshqa vaqt yoki stolni tanlang", status=409, code='slot_taken', field='time')


def _find_by_submission(shop, submission_id):
    if not submission_id:
        return None
    return (TableReservation.all_objects.select_related('table', 'table__hall', 'hall')
            .filter(shop=shop, submission_id=submission_id).first())


def _replay_or_reject(existing, table_id, date, time, phone):
    """Shu `submission_id` bilan bron bor: AYNAN o'sha so'rov bo'lsa — o'sha bron qaytadi (takroriy bosish); boshqa
    stol/vaqt/telefon bilan qayta ishlatilgan bo'lsa — xato (mehmon eski bronni yangisi deb o'ylab qolmasin)."""
    same = (not existing.is_deleted and existing.table_id == table_id and existing.reservation_date == date
            and existing.reservation_time == time and phone_tail(existing.customer_phone) == phone_tail(phone))
    if not same:
        raise BookingError("Bu yuborish identifikatori boshqa bron uchun ishlatilgan. Sahifani yangilab qayta urinib ko'ring",
                           status=409, code='submission_reuse', field='submission_id')
    return existing


def create_booking(shop, data, *, staff=False, config=None, now=None):
    """
    Yangi bron. `data` — JSON obyekt: table_id, date, time, guests, name, phone, event_type, notes, submission_id
    (xodim: + status 'pending'|'confirmed', duration_minutes; nomlar `reservation_date`/`customer_name`... ham qabul qilinadi).
    Qaytadi: (bron, yangi_yaratildimi). `False` — takroriy yuborish: oldingi bron qaytdi.

    Mehmon: bron yoqilgan bo'lishi, sana oralig'i, yopiq kun, sozlangan vaqt, minimal ogohlantirish va sig'im tekshiriladi.
    Xodim: faqat sana (o'tmish emas) va TO'QNASHUV tekshiriladi (yopiq kun, ro'yxatdan tashqari vaqt, minimal ogohlantirish, sig'im emas).
    """
    config = config or bc.get_booking_config(shop)
    if not staff and not config['enabled']:
        raise BookingError("Onlayn bron hozircha yopiq", status=403, code='booking_disabled')
    now = now or timezone.localtime()

    table_id = _int(pick(data, 'table_id'), 'table_id', 1, 2_147_483_647, 'Stol')
    date = parse_date(pick(data, 'date', 'reservation_date'), 'date')
    time = parse_time(pick(data, 'time', 'reservation_time'), 'time')
    guests = _int(pick(data, 'guests', 'guests_count'), 'guests', 1, legacy.max_guests(), 'Mehmonlar soni')
    name = _text(pick(data, 'name', 'customer_name'), 'name', 'Ism', min_len=2, max_len=80)
    phone = normalize_phone(pick(data, 'phone', 'customer_phone'), uz_only=not staff)
    event_type = _event_type(data.get('event_type'), config)
    notes = _text(data.get('notes'), 'notes', 'Izoh', max_len=1000 if staff else 500, multiline=True)
    submission_id = _submission_id(data.get('submission_id'))

    if staff:
        _check_staff_schedule(date, now)
        status = data.get('status') or 'confirmed'
        if status not in STAFF_CREATE_STATUSES:
            raise BookingError("Yangi bron holati 'pending' yoki 'confirmed' bo'lishi kerak", field='status')
        duration = (_int(data['duration_minutes'], 'duration_minutes', *bc.DURATION_RANGE, 'Davomiylik')
                    if data.get('duration_minutes') not in (None, '') else config['duration_minutes'])
    else:
        _check_guest_schedule(date, time, config, now)
        status = 'confirmed' if config['auto_confirm'] else 'pending'
        duration = config['duration_minutes']

    # Tezkor yo'l: takroriy yuborish qulf va to'qnashuv tekshiruvisiz javob oladi
    existing = _find_by_submission(shop, submission_id)
    if existing is not None:
        return _replay_or_reject(existing, table_id, date, time, phone), False

    with transaction.atomic():
        table = (Table.objects.select_for_update(of=('self',)).select_related('hall')
                 .filter(pk=table_id, shop=shop, is_active=True, is_deleted=False, hall__is_active=True).first())
        if table is None:
            raise BookingError("Stol topilmadi", status=404, code='table_not_found', field='table_id')
        if not staff and guests > table.capacity:
            raise BookingError(f"Bu stol {table.capacity} kishilik. Mehmonlar sonini kamaytiring yoki boshqa stolni tanlang",
                               code='too_many_guests', field='guests')
        # Qulfni olgach yana tekshiramiz: parallel bir xil so'rov birinchi yozib ulgurgan bo'lishi mumkin
        existing = _find_by_submission(shop, submission_id)
        if existing is not None:
            return _replay_or_reject(existing, table_id, date, time, phone), False
        if legacy.conflicting(table, date, time, duration=duration):
            raise _slot_taken()
        try:
            with transaction.atomic():                                  # IntegrityError tranzaksiyani buzmasligi uchun savepoint
                reservation = TableReservation.objects.create(
                    shop_id=getattr(shop, 'pk', shop), table=table, hall=table.hall, customer_name=name,
                    customer_phone=phone, guests_count=guests, reservation_date=date, reservation_time=time, notes=notes,
                    status=status, event_type=event_type, duration_minutes=duration, submission_id=submission_id,
                    source='staff' if staff else 'guest')
        except IntegrityError:
            existing = _find_by_submission(shop, submission_id)
            if existing is None:
                raise
            return _replay_or_reject(existing, table_id, date, time, phone), False
        # Qulfsiz bazalar uchun zaxira: bizdan oldin yozilgan to'qnashuvchi bron bo'lsa, bizniki bekor (tranzaksiya qaytadi)
        if [r for r in legacy.conflicting(table, date, time, exclude_id=reservation.pk, duration=duration) if r.pk < reservation.pk]:
            raise _slot_taken()
        if not staff:
            from notifications.outbox import publish_outbox_event
            publish_outbox_event('reservation', str(reservation.pk), 'reservation_created', {'reservation_id': reservation.pk})
    reservation.table = table
    return reservation, True


# ── Kod bo'yicha ko'rish (mehmon) ────────────────────────────────────────────────────────────────────────────

def find_by_code(shop, code, phone_last4=None):
    """Mehmon o'z bronini kod (GS-K7QX2) bo'yicha topadi. Telefon (yoki oxirgi 4 raqami) berilsa va mos kelmasa — topilmadi
    (xato sababi oshkor qilinmaydi). Qaytadi: bron yoki None."""
    from .privacy import _CODE_RE
    match = _CODE_RE.fullmatch(str(code or ''))
    if not match:
        return None
    reservation = (TableReservation.objects.select_related('table', 'table__hall', 'hall')
                   .filter(shop=shop, public_code=f'GS-{match.group(1).upper()}', is_deleted=False).first())
    if reservation is None:
        return None
    if phone_last4:
        digits = re.sub(r'[^0-9]', '', str(phone_last4))
        if len(digits) < 4 or phone_tail(reservation.customer_phone)[-4:] != digits[-4:]:
            return None
    return reservation


# ── Xodim: ro'yxat va tahrir ─────────────────────────────────────────────────────────────────────────────────

def list_for_staff(shop, *, date_from=None, date_to=None, statuses=None, q='', table_id=None, limit=500):
    """(jami_son, [bronlar]) — sana, vaqt tartibida. `statuses` — holatlar ro'yxati (None = hammasi)."""
    from django.db.models import Q
    qs = TableReservation.objects.select_related('table', 'table__hall', 'hall').filter(shop=shop, is_deleted=False)
    if date_from:
        qs = qs.filter(reservation_date__gte=date_from)
    if date_to:
        qs = qs.filter(reservation_date__lte=date_to)
    if statuses:
        qs = qs.filter(status__in=statuses)
    if table_id:
        qs = qs.filter(table_id=table_id)
    if q:
        # Qisqa so'rov ("2") faqat stol raqami; uzunroq — ism, kod, telefon raqamlari (bo'shliq/+/- e'tiborga olinmaydi)
        cond = Q(table__number__iexact=q)
        if len(q) >= 2:
            cond |= Q(customer_name__icontains=q) | Q(public_code__icontains=q)
        digits = re.sub(r'[^0-9]', '', q)
        if len(digits) >= 3:
            cond |= Q(customer_phone__contains=digits)
        qs = qs.filter(cond)
    qs = qs.order_by('reservation_date', 'reservation_time', 'id')
    return qs.count(), list(qs[:limit])


_EDITABLE_SCHEDULE_STATUSES = ('pending', 'confirmed', 'arrived')


def update_booking(shop, reservation_id, data, *, config=None, now=None):
    """
    Xodim bronni tahrirlaydi: status (holat mashinasi orqali), sana/vaqt/stol/davomiylik (to'qnashuv tekshiruvi bilan), mehmonlar,
    ism, telefon, izoh, tadbir turi. Faqat berilgan maydonlar o'zgaradi. Qaytadi: (bron, o'zgargan_maydonlar_ro'yxati, eski_qiymatlar).
    """
    config = config or bc.get_booking_config(shop)
    now = now or timezone.localtime()
    with transaction.atomic():
        reservation = (TableReservation.objects.select_for_update(of=('self',)).select_related('table', 'table__hall', 'hall')
                       .filter(pk=reservation_id, shop=shop, is_deleted=False).first())
        if reservation is None:
            raise BookingError('Bron topilmadi', status=404, code='not_found')
        old = {'status': reservation.status, 'table_id': reservation.table_id, 'date': str(reservation.reservation_date),
               'time': hhmm(reservation.reservation_time), 'guests': reservation.guests_count,
               'duration_minutes': reservation.duration_minutes, 'event_type': reservation.event_type,
               'name': reservation.customer_name, 'phone': reservation.customer_phone, 'notes': reservation.notes}
        changed = []
        update_fields = []

        new_table_id = reservation.table_id
        new_date, new_time, new_duration = reservation.reservation_date, reservation.reservation_time, reservation.duration_minutes
        if 'table_id' in data:
            new_table_id = _int(data['table_id'], 'table_id', 1, 2_147_483_647, 'Stol')
        if any(k in data for k in ('date', 'reservation_date')):
            new_date = parse_date(pick(data, 'date', 'reservation_date'), 'date')
        if any(k in data for k in ('time', 'reservation_time')):
            new_time = parse_time(pick(data, 'time', 'reservation_time'), 'time')
        if 'duration_minutes' in data:
            new_duration = _int(data['duration_minutes'], 'duration_minutes', *bc.DURATION_RANGE, 'Davomiylik')

        schedule_changed = (new_table_id, new_date, new_time, new_duration) != (
            reservation.table_id, reservation.reservation_date, reservation.reservation_time, reservation.duration_minutes)
        if schedule_changed:
            if reservation.status not in _EDITABLE_SCHEDULE_STATUSES:
                raise BookingError("Bu holatdagi bronning stoli, sanasi yoki vaqtini o'zgartirib bo'lmaydi",
                                   status=409, code='not_editable')
            if new_date != reservation.reservation_date:
                _check_staff_schedule(new_date, now)
            table = (Table.objects.select_for_update(of=('self',)).select_related('hall')
                     .filter(pk=new_table_id, shop=shop, is_active=True, is_deleted=False, hall__is_active=True).first())
            if table is None:
                raise BookingError('Stol topilmadi', status=404, code='table_not_found', field='table_id')
            if legacy.conflicting(table, new_date, new_time, exclude_id=reservation.pk, duration=new_duration):
                raise _slot_taken()
            reservation.table, reservation.hall = table, table.hall
            reservation.reservation_date, reservation.reservation_time, reservation.duration_minutes = new_date, new_time, new_duration
            update_fields += ['table', 'hall', 'reservation_date', 'reservation_time', 'duration_minutes']
            changed += [k for k, differs in (('table_id', new_table_id != old['table_id']), ('date', str(new_date) != old['date']),
                                              ('time', hhmm(new_time) != old['time']),
                                              ('duration_minutes', new_duration != old['duration_minutes'])) if differs]

        if any(k in data for k in ('guests', 'guests_count')):
            guests = _int(pick(data, 'guests', 'guests_count'), 'guests', 1, legacy.max_guests(), 'Mehmonlar soni')
            if guests != reservation.guests_count:
                reservation.guests_count = guests
                update_fields.append('guests_count')
                changed.append('guests')
        if any(k in data for k in ('name', 'customer_name')):
            name = _text(pick(data, 'name', 'customer_name'), 'name', 'Ism', min_len=2, max_len=80)
            if name != reservation.customer_name:
                reservation.customer_name = name
                update_fields.append('customer_name')
                changed.append('name')
        if any(k in data for k in ('phone', 'customer_phone')):
            phone = normalize_phone(pick(data, 'phone', 'customer_phone'), uz_only=False)
            if phone != reservation.customer_phone:
                reservation.customer_phone = phone
                update_fields.append('customer_phone')
                changed.append('phone')
        if 'notes' in data:
            notes = _text(data['notes'], 'notes', 'Izoh', max_len=1000, multiline=True)
            if notes != reservation.notes:
                reservation.notes = notes
                update_fields.append('notes')
                changed.append('notes')
        if 'event_type' in data:
            event_type = reservation.event_type if data['event_type'] == reservation.event_type else _event_type(data['event_type'], config)
            if event_type != reservation.event_type:
                reservation.event_type = event_type
                update_fields.append('event_type')
                changed.append('event_type')

        if update_fields:
            reservation.save(update_fields=sorted(set(update_fields)) + ['updated_at'])

        new_status = data.get('status')
        if new_status not in (None, ''):
            if not isinstance(new_status, str) or new_status not in dict(TableReservation.STATUS_CHOICES):
                raise BookingError("Noto'g'ri holat", field='status')
            if new_status != reservation.status:
                reservation = legacy.change_status(shop, reservation.pk, new_status)   # holat mashinasi (409 — mumkin emas)
                changed.append('status')
    reservation = (TableReservation.objects.select_related('table', 'table__hall', 'hall').get(pk=reservation.pk))
    return reservation, changed, old
