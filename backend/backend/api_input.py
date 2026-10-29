"""
Admin API kiritishini xavfsiz o'qish yordamchilari (P2.5).

Avval har endpoint `int(request.data[...])`, `bool(data['is_open'])`, `str(x).strip()` ni o'zicha ishlatardi:
  • "false" / "0" → bool("false") == True bo'lib qolardi (do'kon "yopiq" qilinmasdi);
  • `null`, ro'yxat, `{}` → AttributeError/TypeError → 500;
  • ulkan son, NaN, 10 000 belgili matn, NUL belgi → PostgreSQL xatosi → 500;
  • mavjud bo'lmagan/noto'g'ri id → ValueError → 500;
  • noto'g'ri qiymat jimgina e'tiborsiz qoldirilardi (xodim saqlandi deb o'ylardi).
Endi barcha kirishlar shu yerdagi `parse_*` funksiyalaridan o'tadi: noto'g'ri qiymat `InputError` (400, `{'error', 'field'}`).
`RestoAdminAPIView` DRF xatolarining (404, 405, 415, JSON xato...) ham shakli bir xil bo'lishini ta'minlaydi.
"""
import math
import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from rest_framework.exceptions import APIException
from rest_framework.views import APIView
from rest_framework.views import exception_handler as drf_exception_handler

# PostgreSQL `integer` chegarasi: undan katta qiymat DB'da "out of range" xatosi beradi
INT_MAX = 2_147_483_647
_TRUE = {'1', 'true', 'yes', 'on', 'ha', 't', 'y'}
_FALSE = {'0', 'false', 'no', 'off', "yo'q", "yoq", 'f', 'n'}


class InputError(APIException):
    """Noto'g'ri kiritish: 400 va `{'error': xabar, 'field': maydon}`."""
    status_code = 400
    default_code = 'invalid_input'

    def __init__(self, message, field=None, status_code=None):
        detail = {'error': message}
        if field:
            detail['field'] = field
        super().__init__(detail)
        if status_code:
            self.status_code = status_code


def _label(field):
    return f'«{field}»' if field else 'Qiymat'


def parse_bool(value, field=None):
    """true/false, 1/0 va ularning matn ko'rinishlari ("false", "0", "yes"...). Boshqa har narsa — 400."""
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        text = value.strip().lower()
        if text in _TRUE:
            return True
        if text in _FALSE:
            return False
    raise InputError(f"{_label(field)} mantiqiy qiymat bo'lishi kerak (true yoki false)", field)


def parse_int(value, field=None, *, minimum=None, maximum=None, allow_none=False):
    """Butun son. bool, ro'yxat, NaN, kasr, ulkan va chegaradan tashqari qiymat — 400."""
    if value is None:
        if allow_none:
            return None
        raise InputError(f"{_label(field)} kiritilishi shart", field)
    number = None
    if isinstance(value, bool):
        number = None
    elif isinstance(value, int):
        number = value
    elif isinstance(value, float):
        if math.isfinite(value) and value == int(value):
            number = int(value)
    elif isinstance(value, str):
        text = value.strip()
        if len(text) <= 40:
            try:
                dec = Decimal(text)
                if dec.is_finite() and dec == dec.to_integral_value():
                    number = int(dec)
            except (InvalidOperation, ValueError):
                number = None
    if number is None:
        raise InputError(f"{_label(field)} butun son bo'lishi kerak", field)
    low = -INT_MAX if minimum is None else minimum
    high = INT_MAX if maximum is None else maximum
    if number < low or number > high:
        raise InputError(f"{_label(field)} {low} dan {high} gacha bo'lishi kerak", field)
    return number


def parse_decimal(value, field=None, *, minimum=Decimal('0'), maximum=Decimal('999999999999'), places=2,
                  allow_none=False):
    """Pul/o'lchov summasi. "1 500,50" ko'rinishi ham qabul qilinadi. NaN/Infinity, bool, ro'yxat — 400."""
    if value is None:
        if allow_none:
            return None
        raise InputError(f"{_label(field)} kiritilishi shart", field)
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise InputError(f"{_label(field)} son bo'lishi kerak", field)
    text = str(value).strip().replace(' ', '').replace(',', '.') if not isinstance(value, float) else repr(value)
    if len(text) > 40:
        raise InputError(f"{_label(field)} son bo'lishi kerak", field)
    try:
        number = Decimal(text)
    except (InvalidOperation, ValueError):
        raise InputError(f"{_label(field)} son bo'lishi kerak", field) from None
    if not number.is_finite():
        raise InputError(f"{_label(field)} son bo'lishi kerak", field)
    if minimum is not None and number < minimum or maximum is not None and number > maximum:
        raise InputError(f"{_label(field)} {minimum} dan {maximum} gacha bo'lishi kerak", field)
    return number.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)


def parse_text(value, field=None, *, max_length, required=False, allow_none=True):
    """
    Matn. str yoki son qabul qilinadi (telefon son bo'lib kelishi mumkin); bool, ro'yxat, obyekt — 400.
    NUL belgi (PostgreSQL saqlay olmaydi) olib tashlanadi; maksimal uzunlikdan oshsa — 400 (jimgina kesilmaydi).
    """
    if value is None:
        if required or not allow_none:
            raise InputError(f"{_label(field)} kiritilishi shart", field)
        return ''
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise InputError(f"{_label(field)} matn bo'lishi kerak", field)
    text = str(value).replace('\x00', '').strip()
    if required and not text:
        raise InputError(f"{_label(field)} kiritilishi shart", field)
    if len(text) > max_length:
        raise InputError(f"{_label(field)} {max_length} belgidan oshmasligi kerak", field)
    return text


_CHAT_ID_RE = re.compile(r'-?[1-9][0-9]{0,14}')       # ASCII raqamlar; \d Unicode raqamlarni ham o'tkazib yuborardi


def parse_telegram_chat_id(value, field='telegram_chat_id'):
    """Telegram chat ID: butun son (guruh/kanal uchun manfiy). Bo'sh qiymat '' (bog'lanishni olib tashlash)."""
    if value is None:
        return ''
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise InputError("Telegram chat ID butun son bo'lishi kerak (masalan 123456789 yoki -1001234567890)", field)
    text = str(value).strip()
    if not text:
        return ''
    if not _CHAT_ID_RE.fullmatch(text):
        raise InputError("Telegram chat ID butun son bo'lishi kerak (masalan 123456789 yoki -1001234567890)", field)
    return text


def parse_choice(value, field, choices):
    """Ruxsat etilgan qiymatlardan biri (faqat matn; ro'yxat/obyekt "unhashable" xatosini bermaydi)."""
    if isinstance(value, str) and value.strip() in choices:
        return value.strip()
    raise InputError(f"{_label(field)} quyidagilardan biri bo'lishi kerak: {', '.join(choices)}", field)


def parse_date(value, field=None, *, allow_none=True):
    """ISO sana (YYYY-MM-DD yoki YYYY-MM-DDTHH...). Bo'sh qiymat — None (allow_none bo'lsa)."""
    if value is None or (isinstance(value, str) and not value.strip()):
        if allow_none:
            return None
        raise InputError(f"{_label(field)} kiritilishi shart", field)
    if not isinstance(value, str):
        raise InputError(f"{_label(field)} sana bo'lishi kerak (YYYY-MM-DD)", field)
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        raise InputError(f"{_label(field)} sana bo'lishi kerak (YYYY-MM-DD)", field) from None


def parse_id(value, field=None, *, allow_none=True):
    """Bazadagi yozuv id'si (musbat butun son). Bo'sh/None — None (allow_none bo'lsa)."""
    if value is None or (isinstance(value, str) and not value.strip()):
        if allow_none:
            return None
        raise InputError(f"{_label(field)} kiritilishi shart", field)
    return parse_int(value, field, minimum=1)


def query_int(request, name, default, minimum, maximum):
    """GET parametri (sahifa raqami, o'lcham): noto'g'ri bo'lsa standart qiymat, chegaradan chiqsa chegaraga tushadi."""
    raw = request.GET.get(name)
    if raw is None or raw == '':
        return default
    try:
        return max(minimum, min(maximum, parse_int(raw, name)))
    except InputError:
        return default


def query_date(request, name):
    """GET sana filtri (YYYY-MM-DD): bo'sh — None, noto'g'ri — 400 (avval ORM ValidationError → 500 edi)."""
    return parse_date(request.GET.get(name), name)


def query_flag(request, name, default=False):
    """GET mantiqiy bayroq (?include_deleted=1). Tushunarsiz qiymat — standart."""
    raw = request.GET.get(name)
    if raw is None or raw == '':
        return default
    try:
        return parse_bool(raw, name)
    except InputError:
        return default


def query_text(request, name, max_length=100):
    """GET qidiruv matni: NUL belgisiz va uzunligi cheklangan (cheksiz LIKE so'rovi DB'ni yuklamasin)."""
    return str(request.GET.get(name, '')).replace('\x00', '').strip()[:max_length]


def query_id(request, name):
    """GET id filtri: raqam bo'lmasa yoki juda katta bo'lsa — None (filtr qo'llanmaydi)."""
    raw = request.GET.get(name)
    try:
        return parse_id(raw, name)
    except InputError:
        return None


def admin_exception_handler(exc, context):
    """DRF standart xato javobiga `error` (frontend o'qiydi) va `detail` (eski mijozlar) kalitlarini birga qo'shadi."""
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict):
        data = response.data
        if 'error' not in data:
            detail = data.get('detail')
            if detail is None:
                detail = '; '.join(
                    f"{key}: {', '.join(map(str, val)) if isinstance(val, (list, tuple)) else val}"
                    for key, val in data.items()
                )
            data['error'] = str(detail)
        if 'detail' not in data:
            data['detail'] = data['error']
    return response


class RestoAdminAPIView(APIView):
    """
    /api/restaurant/admin/v1/ endpointlari uchun asos: xato javoblari bir xil shaklda (`error`), so'rov tanasi
    JSON obyekt bo'lishi shart (ro'yxat, `null`, matn yuborilsa — `AttributeError` o'rniga 400).
    """

    def get_exception_handler(self):
        return admin_exception_handler

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)     # autentifikatsiya va ruxsat avval: anonimga tana haqida xabar yo'q
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            data = request.data
            if not hasattr(data, 'get') or not hasattr(data, '__contains__'):
                raise InputError("So'rov tanasi JSON obyekt (kalit-qiymat) bo'lishi kerak")
