"""Bron sozlamalari (restoran sozlamasi `Shop.business_profile['booking']`, admin: /ra/ "Bron sozlamalari").

TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MULTITENANT_BRON_BREND_VIDEO_TUR_2026-11-03.md (Bosqich 1).

Sozlama kodsiz o'zgaradi: vaqt oraliqlari (tushlik/kechki...), tadbir turlari, bron davomiyligi, necha kun oldin bron qilish,
minimal ogohlantirish vaqti, yopiq hafta kunlari, avtomatik tasdiqlash. Hech narsa o'chirilmaydi: bron `enabled=false` bilan yashiriladi.

Ikki rejim:
- `normalize_booking(value)` — O'QISH uchun. Buzuq/eskirgan/yarim qiymat saytni BUZMAYDI: yaroqsiz bo'lak tashlanadi yoki standart
  olinadi, har doim to'liq va to'g'ri tuzilma qaytadi.
- `validate_booking_strict(value)` — admin PATCH uchun. Har xato `InputError` (400) + `field` ("booking.slots[1].times[0]" kabi): admin
  nima noto'g'ri ekanini aniq ko'radi, hech narsa jimgina tashlanmaydi.

Haftaning kunlari `closed_weekdays` da Python `date.weekday()` bo'yicha: 0 = Dushanba ... 6 = Yakshanba (JS `getDay()` emas: u 0 = Yakshanba).
"""
import copy
import re

from backend.api_input import InputError

DEFAULT_BOOKING = {
    'enabled': True,
    'slots': [
        {'key': 'lunch', 'label': 'Tushlik', 'label_ru': 'Обед', 'label_en': 'Lunch',
         'times': ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00']},
        {'key': 'dinner', 'label': 'Kechki ovqat', 'label_ru': 'Ужин', 'label_en': 'Dinner',
         'times': ['19:30', '20:00', '20:30', '21:00', '21:30']},
    ],
    'event_types': [
        {'key': 'none', 'label': "Yo'q", 'label_ru': 'Нет', 'label_en': 'None'},
        {'key': 'birthday', 'label': "Tug'ilgan kun", 'label_ru': 'День рождения', 'label_en': 'Birthday'},
        {'key': 'anniversary', 'label': 'Yubiley', 'label_ru': 'Юбилей', 'label_en': 'Anniversary'},
        {'key': 'business', 'label': 'Ish uchrashuvi', 'label_ru': 'Деловая встреча', 'label_en': 'Business meeting'},
        {'key': 'wedding', 'label': 'Nikoh taklifi', 'label_ru': 'Свадьба', 'label_en': 'Wedding'},
    ],
    'duration_minutes': 120,
    'max_days_ahead': 30,
    'min_notice_minutes': 60,
    'auto_confirm': False,
    'closed_weekdays': [],
}

# Chegaralar (admin PATCH va o'qish uchun bir xil)
DURATION_RANGE = (15, 600)
MAX_DAYS_RANGE = (1, 365)
MIN_NOTICE_RANGE = (0, 1440)
MAX_SLOTS = 12
MAX_TIMES_PER_SLOT = 48
MAX_TOTAL_TIMES = 72                 # availability javobi (stollar x vaqtlar) ulkan bo'lib ketmasin
MAX_EVENT_TYPES = 20
MAX_LABEL = 40
NO_EVENT_KEY = 'none'                # "Tadbir yo'q": bronga bo'sh qiymat bo'lib yoziladi

_KEY_RE = re.compile(r'[a-z0-9_]{1,20}')
_TIME_RE = re.compile(r'([01]?\d|2[0-3]):([0-5]\d)')


class _Invalid(Exception):
    """Ichki: bitta qiymat yaroqsiz. Qat'iy rejimda InputError, o'qishda element tashlanadi."""

    def __init__(self, path, message):
        super().__init__(message)
        self.path = path
        self.message = message


# ── Bitta qiymatni o'qish ────────────────────────────────────────────────────────────────────────────────────

def _time(value, path):
    text = value.strip() if isinstance(value, str) else ''
    match = _TIME_RE.fullmatch(text)
    if not match:
        raise _Invalid(path, "Vaqt SS:DD ko'rinishida bo'lishi kerak (24 soat, masalan 19:30)")
    return f'{int(match.group(1)):02d}:{match.group(2)}'


def _key(value, path):
    text = value.strip() if isinstance(value, str) else ''
    if not _KEY_RE.fullmatch(text):
        raise _Invalid(path, "Kalit kichik lotin harf, raqam yoki _ dan iborat bo'lishi kerak (1-20 belgi)")
    return text


def _label(value, path, required=True):
    text = ' '.join(value.replace('\x00', '').split()) if isinstance(value, str) else ''
    if not text:
        if required:
            raise _Invalid(path, 'Nom bo\'sh bo\'lmasligi kerak')
        return ''
    if len(text) > MAX_LABEL:
        raise _Invalid(path, f'Nom {MAX_LABEL} belgidan oshmasligi kerak')
    return text


def _int(value, path, low, high):
    if isinstance(value, bool):
        raise _Invalid(path, f"Butun son bo'lishi kerak ({low}-{high})")
    number = None
    if isinstance(value, int):
        number = value
    elif isinstance(value, float) and value.is_integer():
        number = int(value)
    elif isinstance(value, str) and re.fullmatch(r'\d{1,6}', value.strip()):
        number = int(value.strip())
    if number is None or not low <= number <= high:
        raise _Invalid(path, f"Butun son bo'lishi kerak ({low}-{high})")
    return number


def _bool(value, path):
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().lower() in ('true', 'false'):
        return value.strip().lower() == 'true'
    raise _Invalid(path, "true yoki false bo'lishi kerak")


def _translations(src, base, out):
    """Ixtiyoriy label_ru / label_en (bo'sh bo'lsa kalit yozilmaydi)."""
    for lang in ('ru', 'en'):
        raw = src.get(f'label_{lang}')
        if raw in (None, ''):
            continue
        text = _label(raw, f'{base}.label_{lang}', required=False)
        if text:
            out[f'label_{lang}'] = text


# ── Tuzilmalar ───────────────────────────────────────────────────────────────────────────────────────────────

def _one_slot(item, base, seen_times, strict):
    if not isinstance(item, dict):
        raise _Invalid(base, "Oraliq obyekt bo'lishi kerak")
    slot = {'key': _key(item.get('key'), f'{base}.key'), 'label': _label(item.get('label'), f'{base}.label')}
    _translations(item, base, slot)
    raw_times = item.get('times')
    if not isinstance(raw_times, list):
        raise _Invalid(f'{base}.times', "Vaqtlar ro'yxat bo'lishi kerak")
    if strict and len(raw_times) > MAX_TIMES_PER_SLOT:
        raise _Invalid(f'{base}.times', f"Bitta oraliqda {MAX_TIMES_PER_SLOT} tadan ko'p vaqt bo'lmaydi")
    times = []
    for j, raw in enumerate(raw_times[:MAX_TIMES_PER_SLOT]):
        path = f'{base}.times[{j}]'
        try:
            value = _time(raw, path)
            if value in seen_times:
                raise _Invalid(path, 'Bu vaqt takrorlangan')
        except _Invalid:
            if strict:
                raise
            continue
        seen_times.add(value)
        times.append(value)
    if not times:
        raise _Invalid(f'{base}.times', "Oraliqda kamida bitta vaqt bo'lishi kerak")
    slot['times'] = sorted(times)
    return slot


def _slots(raw, strict):
    """-> (ro'yxat, to'g'ri_ko'rsatilganmi). O'qishda yaroqsiz element tashlanadi."""
    if not isinstance(raw, list):
        if strict:
            raise _Invalid('booking.slots', "Vaqt oraliqlari ro'yxat bo'lishi kerak")
        return None
    if strict and len(raw) > MAX_SLOTS:
        raise _Invalid('booking.slots', f"Oraliqlar {MAX_SLOTS} tadan oshmasligi kerak")
    slots, keys, seen_times = [], set(), set()
    for i, item in enumerate(raw[:MAX_SLOTS]):
        base = f'booking.slots[{i}]'
        before = set(seen_times)
        try:
            slot = _one_slot(item, base, seen_times, strict)
            if slot['key'] in keys:
                raise _Invalid(f'{base}.key', 'Bu kalit takrorlangan')
            if len(seen_times) > MAX_TOTAL_TIMES:
                raise _Invalid(f'{base}.times', f"Hamma oraliqlarda jami {MAX_TOTAL_TIMES} tadan ko'p vaqt bo'lmaydi")
        except _Invalid:
            seen_times.clear()
            seen_times.update(before)
            if strict:
                raise
            continue
        keys.add(slot['key'])
        slots.append(slot)
    return slots


def _event_types(raw, strict):
    if not isinstance(raw, list):
        if strict:
            raise _Invalid('booking.event_types', "Tadbir turlari ro'yxat bo'lishi kerak")
        return None
    if strict and len(raw) > MAX_EVENT_TYPES:
        raise _Invalid('booking.event_types', f"Tadbir turlari {MAX_EVENT_TYPES} tadan oshmasligi kerak")
    out, keys = [], set()
    for i, item in enumerate(raw[:MAX_EVENT_TYPES]):
        base = f'booking.event_types[{i}]'
        try:
            if not isinstance(item, dict):
                raise _Invalid(base, "Tadbir turi obyekt bo'lishi kerak")
            event = {'key': _key(item.get('key'), f'{base}.key'), 'label': _label(item.get('label'), f'{base}.label')}
            if event['key'] in keys:
                raise _Invalid(f'{base}.key', 'Bu kalit takrorlangan')
            _translations(item, base, event)
        except _Invalid:
            if strict:
                raise
            continue
        keys.add(event['key'])
        out.append(event)
    return out


def _weekdays(raw, strict):
    if not isinstance(raw, list):
        if strict:
            raise _Invalid('booking.closed_weekdays', "Yopiq kunlar ro'yxat bo'lishi kerak (0 = Dushanba ... 6 = Yakshanba)")
        return None
    days = set()
    for i, item in enumerate(raw):
        try:
            days.add(_int(item, f'booking.closed_weekdays[{i}]', 0, 6))
        except _Invalid:
            if strict:
                raise
    if strict and len(days) >= 7:
        raise _Invalid('booking.closed_weekdays', "Hamma 7 kunni yopib bo'lmaydi: bronni o'chirish uchun «enabled» ni o'chiring")
    return sorted(days)


def _scalar(src, name, default, parser, strict, *args):
    if name not in src:
        return default
    try:
        return parser(src[name], f'booking.{name}', *args)
    except _Invalid:
        if strict:
            raise
        return default


def _parse(value, strict):
    if strict and not isinstance(value, dict):
        raise _Invalid('booking', "Bron sozlamasi obyekt bo'lishi kerak")
    src = value if isinstance(value, dict) else {}
    default = DEFAULT_BOOKING
    out = {
        'enabled': _scalar(src, 'enabled', default['enabled'], _bool, strict),
        'duration_minutes': _scalar(src, 'duration_minutes', default['duration_minutes'], _int, strict, *DURATION_RANGE),
        'max_days_ahead': _scalar(src, 'max_days_ahead', default['max_days_ahead'], _int, strict, *MAX_DAYS_RANGE),
        'min_notice_minutes': _scalar(src, 'min_notice_minutes', default['min_notice_minutes'], _int, strict, *MIN_NOTICE_RANGE),
        'auto_confirm': _scalar(src, 'auto_confirm', default['auto_confirm'], _bool, strict),
    }
    slots = _slots(src['slots'], strict) if 'slots' in src else None
    if slots is None:                                   # kalit yo'q yoki ro'yxat emas (qat'iy rejimda ro'yxat emasligi xato edi)
        slots = copy.deepcopy(default['slots'])
    elif not slots and out['enabled']:                  # yoqilgan bron vaqtlarsiz foydasiz
        if strict:
            raise _Invalid('booking.slots', "Bron yoqilgan bo'lsa kamida bitta vaqt oralig'i bo'lishi kerak")
        slots = copy.deepcopy(default['slots'])
    events = _event_types(src['event_types'], strict) if 'event_types' in src else None
    weekdays = _weekdays(src['closed_weekdays'], strict) if 'closed_weekdays' in src else None
    out['slots'] = slots
    out['event_types'] = copy.deepcopy(default['event_types']) if events is None else events
    out['closed_weekdays'] = [] if weekdays is None else weekdays
    # Kalitlar tartibi barqaror (ETag va testlar uchun)
    order = ('enabled', 'slots', 'event_types', 'duration_minutes', 'max_days_ahead', 'min_notice_minutes',
             'auto_confirm', 'closed_weekdays')
    return {name: out[name] for name in order}


def normalize_booking(value):
    """Saqlangan qiymatni to'liq, yaroqli ko'rinishga keltiradi. Buzuq qiymat saytni buzmaydi (standart olinadi)."""
    try:
        return _parse(value, strict=False)
    except _Invalid:                       # o'qish rejimida bu bo'lmasligi kerak; xavfsizlik uchun standart
        return copy.deepcopy(DEFAULT_BOOKING)


def validate_booking_strict(value):
    """Admin PATCH: to'liq almashtirish. Xato bo'lsa `InputError` (400) + `field`. Qaytadi: saqlanadigan normallangan qiymat.
    Yetishmayotgan kalitlar standart bilan to'ldiriladi; noma'lum kalitlar e'tiborga olinmaydi (saqlanmaydi)."""
    try:
        return _parse(value, strict=True)
    except _Invalid as exc:
        raise InputError(exc.message, exc.path) from None


# ── Restoran bo'yicha o'qish ─────────────────────────────────────────────────────────────────────────────────

def _load_for_shop_id(shop_id):
    from shops.models import Shop
    raw = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    profile = raw if isinstance(raw, dict) else {}
    return normalize_booking(profile.get('booking'))


def get_booking_config(shop):
    """Restoranning bron sozlamasi (normallangan, to'liq). `shop` — Shop yoki uning id si.

    Bo'lmasa standart. Jarayon keshida turadi (`backend.runtime_cache`, TTL `APPSETTING_CACHE_TTL`); Shop saqlanganda signal keshni
    tozalaydi, shuning uchun admin o'zgartirishi shu jarayonda darhol, boshqa worker'larda TTL ichida ko'rinadi.
    Har safar nusxa qaytadi: chaqiruvchi o'zgartirsa ham kesh buzilmaydi."""
    from backend.runtime_cache import cached_shop_value
    shop_id = getattr(shop, 'pk', shop)
    if not shop_id:
        return copy.deepcopy(DEFAULT_BOOKING)
    return copy.deepcopy(cached_shop_value(shop_id, 'booking_config', lambda: _load_for_shop_id(shop_id)))


# ── Yordamchilar ─────────────────────────────────────────────────────────────────────────────────────────────

def all_times(config):
    """Barcha sozlangan vaqtlar (oraliqlar tartibida, takrorsiz)."""
    seen, out = set(), []
    for slot in config['slots']:
        for t in slot['times']:
            if t not in seen:
                seen.add(t)
                out.append(t)
    return out


def event_type_keys(config):
    return {e['key'] for e in config['event_types']}


def event_label(config, key, lang=None):
    """Tadbir turi nomi. Katalogdan olib tashlangan eski kalit uchun kalitning o'zi qaytadi (ma'lumot yo'qolmaydi)."""
    if not key:
        return ''
    for event in config['event_types']:
        if event['key'] == key:
            return (event.get(f'label_{lang}') if lang else None) or event['label']
    return key


def minutes_of(hhmm):
    hours, minutes = hhmm.split(':')
    return int(hours) * 60 + int(minutes)
