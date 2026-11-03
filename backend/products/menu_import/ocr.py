"""Menyuni rasmdan lokal (internetsiz, uchinchi tomonsiz) o'qish: Tesseract OCR + oddiy qatorlar parseri.

AI o'chiq (`menu_import_ai=off`), kalit yo'q yoki AI xato bergan holatlarda zaxira. Tesseract topilmasa `OcrUnavailable`
(chaqiruvchi aniq xabar beradi). Binar `subprocess` ro'yxat argumentlari bilan, `shell=False`, timeout bilan chaqiriladi.

Shuningdek bu yerda `vision.py` ham ishlatadigan umumiy ko'rinadigan-matn yordamchilari bor (`parse_price`, `clean_text`, `clean_row`):
AI ham, OCR ham bir xil tekshiruvdan o'tadi (model javobiga ishonilmaydi).
"""
import io
import logging
import os
import re
import shutil
import subprocess
import tempfile
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

WANTED_LANGS = ('uzb', 'rus', 'eng')
OCR_TIMEOUT_SECONDS = 30
LIST_LANGS_TIMEOUT_SECONDS = 10
OCR_MAX_SIDE = 2800  # OCR uchun rasm AI'dagidan (1600) kattaroq saqlanadi: kichik yozuvlar va nollar yaxshi o'qiladi
MAX_OCR_CHARS = 100_000
MAX_NAME_LEN = 200
MAX_CATEGORY_LEN = 120
MAX_DESCRIPTION_LEN = 1000
MAX_PRICE = 1_000_000_000
MAX_ROWS = 300

_CONTROL_RE = re.compile(r'[\x00-\x1f\x7f-\x9f​-‏‪-‮⁦-⁩﻿]')
_TAG_RE = re.compile(r'<[^<>]{0,200}>')
_WS_RE = re.compile(r'\s+')
_NAME_LEAD_RE = re.compile(r'^[\s=+\-@•*·–—_|#>~]+')
_NUMBERING_RE = re.compile(r'^\d{1,3}[.)]\s+')
_NAME_TRAIL_RE = re.compile(r'[\s.\-–—_…:;,|*·•~]+$')

# so'm / sum / сум / UZS belgilari (apostrof turlari bilan) va "ming"/"k"/"тыс" ko'paytirgichlari
_CURRENCY = r"(?:so['’`ʻʼ]?m|som|sum|сум(?:ов|а)?|сўм|uzs)"
_THOUSAND = r"(?:k|к|ming|тыс\.?|мың)"
_GROUPED = r'\d{1,3}(?:[ .,  ]\d{3})+'
_PRICE_VALUE_RE = re.compile(
    rf'\s*(?P<num>{_GROUPED}|\d+(?:[.,]\d+)?)\s*(?P<k>{_THOUSAND})?\s*{_CURRENCY}?\.?\s*', re.IGNORECASE)
_LINE_PRICE_RE = re.compile(
    rf'(?<![\w.,])(?:(?P<kdec>\d+[.,]\d+)\s*(?P<kunit>{_THOUSAND})|(?P<num>{_GROUPED}|\d+)\s*(?P<unit>{_THOUSAND})?)'
    rf'\s*{_CURRENCY}?[\s.,;:*)\]]*$', re.IGNORECASE)


# ─── umumiy tozalash / narx ─────────────────────────────────────────────────────────

def clean_text(value, max_len, *, name_like=False):
    """Ishonchsiz matn -> bir qatorli, HTML/boshqaruv belgilarisiz, uzunligi chegaralangan matn. `name_like`: nomning boshidagi
    formula/marker belgilari (`= + - @ •`) olib tashlanadi, BUTUN bosh harfli matn odatiy yozuvga keltiriladi."""
    if not isinstance(value, str):
        return ''
    text = _TAG_RE.sub(' ', value)
    text = _CONTROL_RE.sub(' ', text)
    text = _WS_RE.sub(' ', text).strip()
    if name_like:
        text = _NAME_LEAD_RE.sub('', _NUMBERING_RE.sub('', text))
        text = _NAME_TRAIL_RE.sub('', text)
        if len(text) > 3 and text.isupper():
            text = text.capitalize()
        elif text[:1].islower():
            text = text[0].upper() + text[1:]
    return text[:max_len].strip()


def _number_to_int(num, *, thousand):
    num = num.strip(' .,  ')
    try:
        if thousand:
            return int((Decimal(num.replace(',', '.').replace(' ', '')) * 1000).to_integral_value(ROUND_HALF_UP))
        if re.fullmatch(_GROUPED, num):
            return int(re.sub(r'\D', '', num))
        if re.fullmatch(r'\d+', num):
            return int(num)
        if re.fullmatch(r'\d+[.,]\d+', num):
            return int(Decimal(num.replace(',', '.')).to_integral_value(ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        return None
    return None


def parse_price(value):
    """`45000`, `"45 000 so'm"`, `"45k"`, `"45 ming"`, `"45.000"`, `"45,000"` -> butun so'm. Yaroqsiz, 0 yoki manfiy -> None."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        number = value
    elif isinstance(value, float):
        number = int(Decimal(repr(value)).to_integral_value(ROUND_HALF_UP)) if value == value and abs(value) < MAX_PRICE else None
    elif isinstance(value, str):
        if len(value) > 60:
            return None
        match = _PRICE_VALUE_RE.fullmatch(value.strip())
        number = _number_to_int(match.group('num'), thousand=bool(match.group('k'))) if match else None
    else:
        return None
    if number is None or number <= 0 or number > MAX_PRICE:
        return None
    return number


def clean_row(raw):
    """Model/OCR qatori -> {name, price, category, description} yoki None (nom yo'q / yaroqsiz). `category`/`description` — matn ('' bo'lishi mumkin)."""
    if not isinstance(raw, dict):
        return None
    name = clean_text(raw.get('name'), MAX_NAME_LEN, name_like=True)
    if len(name) < 2 or not any(ch.isalpha() for ch in name):
        return None
    return {
        'name': name,
        'price': parse_price(raw.get('price')),
        'category': clean_text(raw.get('category'), MAX_CATEGORY_LEN, name_like=True),
        'description': clean_text(raw.get('description'), MAX_DESCRIPTION_LEN),
    }


# ─── matn qatorlarini taomlarga ajratish (oddiy qoidalar) ───────────────────────────

def _split_price(line):
    """Qator oxiridagi narxni ajratadi: (qolgan matn, narx|None)."""
    match = _LINE_PRICE_RE.search(line)
    if not match:
        return line, None
    if match.group('kdec'):
        price = _number_to_int(match.group('kdec'), thousand=True)
    else:
        price = _number_to_int(match.group('num'), thousand=bool(match.group('unit')))
    return line[:match.start()], price


def _looks_like_heading(text):
    letters = sum(ch.isalpha() for ch in text)
    return 2 <= len(text) <= 40 and len(text.split()) <= 5 and letters >= 0.6 * len(text.replace(' ', ''))


def rows_from_text(text, *, max_rows=MAX_ROWS):
    """Tartibsiz bo'lmagan matn (OCR) -> qatorlar. Qoida: oxirida narxi bor qator = taom; narxsiz qisqa qator = bo'lim sarlavhasi;
    narxsiz uzun qator = oldingi taomning tavsifi. B1a `text_parser` bo'lsa, uni chaqiruvchi (`vision`) afzal ko'radi."""
    rows = []
    category = ''
    for raw_line in str(text or '').splitlines():
        line = _WS_RE.sub(' ', _CONTROL_RE.sub(' ', raw_line)).strip()
        if len(line) < 2:
            continue
        head, price = _split_price(line)
        name = clean_text(head, MAX_NAME_LEN, name_like=True)
        if price is not None and len(name) >= 2 and any(ch.isalpha() for ch in name):
            row = clean_row({'name': name, 'price': price, 'category': category})
            if row:
                rows.append(row)
            if len(rows) >= max_rows:
                break
            continue
        if price is not None:  # "12 000" kabi narx-faqat qator yoki nomsiz qator
            continue
        plain = clean_text(line, MAX_DESCRIPTION_LEN, name_like=True)
        if not plain or not any(ch.isalpha() for ch in plain):
            continue
        if line.endswith(':') or _looks_like_heading(plain):
            category = plain[:MAX_CATEGORY_LEN]
        elif rows and not rows[-1]['description']:
            rows[-1]['description'] = plain[:MAX_DESCRIPTION_LEN]
    return rows


# ─── Tesseract ──────────────────────────────────────────────────────────────────────

class OcrUnavailable(RuntimeError):
    """Tesseract o'rnatilmagan yoki biror til paketi yo'q."""


class OcrError(RuntimeError):
    """Tesseract ishga tushdi, lekin natija bermadi (timeout, xato, buzuq rasm)."""


def tesseract_path():
    return shutil.which('tesseract')


def _run(args, *, timeout):
    env = {key: os.environ[key] for key in ('PATH', 'HOME', 'TESSDATA_PREFIX', 'LANG', 'LC_ALL') if key in os.environ}
    env['OMP_THREAD_LIMIT'] = '1'  # ko'p oqimli Tesseract bitta so'rovda butun CPU'ni egallamasin
    return subprocess.run(args, capture_output=True, timeout=timeout, shell=False, check=False, env=env)  # noqa: S603


_LANG_CACHE = {}  # {binar yo'li: o'rnatilgan tillar}. Faqat muvaffaqiyatli natija keshlanadi (vaqtinchalik xato abadiy yopishib qolmasin)


def _installed_languages(binary):
    cached = _LANG_CACHE.get(binary)
    if cached is not None:
        return cached
    try:
        done = _run([binary, '--list-langs'], timeout=LIST_LANGS_TIMEOUT_SECONDS)
    except (OSError, subprocess.SubprocessError):
        return ()
    lines = (done.stdout or b'').decode('utf-8', 'replace').splitlines()
    # 1-qator sarlavha ("List of available languages in ... (N):")
    langs = tuple(line.strip() for line in lines[1:] if re.fullmatch(r'[A-Za-z0-9_]{2,20}', line.strip()))
    if langs:
        _LANG_CACHE[binary] = langs
    return langs


def reset_cache():
    """Test uchun: o'rnatilgan tillar keshini tozalaydi."""
    _LANG_CACHE.clear()


def ocr_languages(binary=None):
    """O'rnatilganlardan `uzb+rus+eng` ning mavjud qismi, masalan 'eng' (lokal) yoki 'uzb+rus+eng' (production). Hech biri yo'q -> ''."""
    binary = binary or tesseract_path()
    if not binary:
        return ''
    installed = _installed_languages(binary)
    wanted = [lang for lang in WANTED_LANGS if lang in installed]
    if wanted:
        return '+'.join(wanted)
    others = [lang for lang in installed if lang != 'osd']
    return others[0] if others else ''


def _prepare_for_ocr(jpeg_bytes, path):
    """Kulrang, kontrastlangan, kichkina bo'lsa kattalashtirilgan PNG (Tesseract ~300 dpi kabi katta yozuvni yaxshi o'qiydi)."""
    with Image.open(io.BytesIO(jpeg_bytes)) as img:
        img = ImageOps.autocontrast(ImageOps.grayscale(img))
        longest = max(img.size)
        if longest < 2400:
            factor = min(2.0, 2400 / longest)
            img = img.resize((round(img.width * factor), round(img.height * factor)), Image.Resampling.LANCZOS)
        img.save(path, 'PNG')


_ZERO_GROUP_RE = re.compile(r'(?<![\w])(\d{1,3})((?:[ .,][OoОо]{3})+)(?![\w])')
_ZERO_TAIL_RE = re.compile(r'(?<![\w])(\d{1,3})([OoОо]{2,3})(?![\w])')


def fix_ocr_digits(text):
    """Tesseract kam o'lchamda "000" ni "OOO" deb o'qiydi ("8 OOO", "45OOO"): raqamdan keyingi shunday guruhlar 0 ga almashtiriladi."""
    def zeros(match):
        return match.group(1) + re.sub(r'[OoОо]', '0', match.group(2))
    return _ZERO_TAIL_RE.sub(zeros, _ZERO_GROUP_RE.sub(zeros, text))


def ocr_text(image_bytes, *, timeout=OCR_TIMEOUT_SECONDS):
    """Rasm (har qanday ruxsat etilgan format) -> matn. `OcrUnavailable` / `OcrError`. Matn tarkibiga ishonilmaydi."""
    from products.menu_import.image_tokens import TempImageError, normalize_image
    binary = tesseract_path()
    if not binary:
        raise OcrUnavailable("Tesseract OCR o'rnatilmagan")
    langs = ocr_languages(binary)
    if not langs:
        raise OcrUnavailable("Tesseract uchun hech bir til paketi o'rnatilmagan")
    try:
        jpeg = normalize_image(image_bytes, max_side=OCR_MAX_SIDE)
    except TempImageError as exc:
        raise OcrError(exc.message) from None
    with tempfile.TemporaryDirectory(prefix='menu_ocr_') as workdir:
        source = os.path.join(workdir, 'page.png')
        try:
            _prepare_for_ocr(jpeg, source)
            done = _run([binary, source, 'stdout', '-l', langs, '--psm', '4'], timeout=timeout)
        except subprocess.TimeoutExpired:
            raise OcrError('OCR vaqti tugadi') from None
        except (OSError, subprocess.SubprocessError, ValueError):
            logger.warning('menu_import: tesseract ishga tushmadi', exc_info=True)
            raise OcrError('OCR ishga tushmadi') from None
    if done.returncode != 0:
        logger.warning('menu_import: tesseract kodi %s', done.returncode)
        raise OcrError('OCR xato bilan tugadi')
    return fix_ocr_digits((done.stdout or b'').decode('utf-8', 'replace')[:MAX_OCR_CHARS])
