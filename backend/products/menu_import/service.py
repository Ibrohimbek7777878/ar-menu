"""Menyuni ommaviy kiritish servisi: parse (o'qish + tozalash + moslash), commit (bitta tranzaksiya), undo.

TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md

Tamoyillar:
  • Hech narsa foydalanuvchi tasdig'isiz yozilmaydi: `parse_request` bazaga TEGMAYDI (faqat o'qiydi).
  • Fayl/AI/OCR natijasi ishonchsiz: har qator `clean_text`dan o'tadi (HTML, boshqaruv belgilari, `=+-@` formula boshlanishi, uzunlik).
  • `commit_batch`: hamma qator avval tekshiriladi (`menu_admin` dagi `_clean_price` / `parse_text` / `NAME_MAX` bilan BIR XIL),
    bitta xato bo'lsa HECH NARSA yozilmaydi; yozish bitta `transaction.atomic()` da, ommaviy (`bulk_create`) — 50 qator ~10 so'rov.
  • `undo_batch`: faqat shu restoran partiyasi; yaratilgan taomlar mavjud soft-delete usulida arxivlanadi (o'chirilmaydi).
"""
import html
import logging
import re
import unicodedata
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from backend.api_input import InputError, parse_text
from categories.models import Category
from orders.audit import log_audit
from orders.interfaces.api.menu_admin import DESCRIPTION_MAX, NAME_MAX, PRICE_MAX, _clean_price, _visible_categories
from products.menu_cache import bump_menu_version
from products.menu_import import readers
from products.menu_import.errors import (
    AIUnavailable,
    BatchNotFound,
    CommitRejected,
    Conflict,
    InvalidInput,
    NothingRecognized,
    RateLimited,
)
from products.menu_import.text_parser import (
    normalize_name,
    parse_price,
    parse_table_detailed,
    parse_text_detailed,
)
from products.models import Product

logger = logging.getLogger(__name__)

MAX_ROWS = 300
MAX_NEW_CATEGORIES = 30                  # bo'limlar do'konlararo umumiy (global): bir importda ko'pi bilan shuncha yangisi yaratiladi
MAX_TEXT_CHARS = 200_000                 # joylangan matn (Samsung/iPhone eslatma) chegarasi
AI_TEXT_CHARS = 20_000                   # AI'ga ko'pi bilan shuncha belgi yuboriladi
CATEGORY_NAME_MAX = 100                  # Category.name uzunligi (MenuCategoryListCreateView.post bilan bir xil)
PRICE_SMALL = 1000
PRICE_LARGE = 5_000_000
PARSE_LIMIT_DEFAULT = 20                 # restoranga soatiga (settings.MENU_IMPORT_PARSE_PER_HOUR)
PARSE_WINDOW = 3600
SUBMISSION_TTL = 3600
SUBMISSION_LOCK_TTL = 120
LOW_CONFIDENCE = 0.6
SLUG_TRIES = 7

_SCRIPT_RE = re.compile(r'<(script|style)\b.*?</\1\s*>', re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r'<[^<>]{0,300}>')
_FORMULA_RE = re.compile(r'^[=+\-@\s]+')
_ROW_ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,20}$')
_SUBMISSION_RE = re.compile(r'^[A-Za-z0-9_-]{8,64}$')
_BATCH_RE = re.compile(r'^[A-Za-z0-9_-]{8,36}$')
_TOKEN_RE = re.compile(r'^[A-Za-z0-9_-]{16,128}$')


# ─── tozalash ──────────────────────────────────────────────────────────────────────

def clean_text(value, max_len):
    """Ishonchsiz matn -> bir qatorli, HTML/skript/boshqaruv belgilarisiz, formula boshlanishisiz, uzunligi chegaralangan."""
    if isinstance(value, bool) or value is None:
        return ''
    if isinstance(value, (int, float, Decimal)):
        value = str(value)
    if not isinstance(value, str):
        return ''
    text = html.unescape(value[:max_len * 3 + 200])
    text = _SCRIPT_RE.sub(' ', text)
    text = _TAG_RE.sub(' ', text).replace('<', ' ').replace('>', ' ')
    text = ''.join(ch for ch in text if unicodedata.category(ch) not in ('Cc', 'Cf', 'Cs', 'Co', 'Cn') or ch in '\n\t')
    text = ' '.join(text.split())
    text = _FORMULA_RE.sub('', text)            # =, +, -, @ bilan boshlanuvchi (Excel/CSV formula in'ektsiyasi)
    if len(text) > max_len:
        text = text[:max_len].rstrip(' ,.;:-')
    return text


def _clean_price_value(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if 0 < value <= PRICE_MAX else None
    return parse_price(value)


def _clean_parsed_row(raw, *, keep_nameless=False):
    if not isinstance(raw, dict):
        return None
    name = clean_text(raw.get('name'), NAME_MAX)
    if not name and not keep_nameless:
        return None
    confidence = raw.get('confidence')
    low = bool(raw.get('low_confidence')) or (isinstance(confidence, (int, float)) and not isinstance(confidence, bool)
                                              and confidence < LOW_CONFIDENCE)
    return {
        'name': name,
        'price': _clean_price_value(raw.get('price')),
        'category': clean_text(raw.get('category'), CATEGORY_NAME_MAX),
        'description': clean_text(raw.get('description'), DESCRIPTION_MAX),
        'low_confidence': low,
    }


# ─── B1b (vision / image_tokens) bilan yumshoq bog'lanish ──────────────────────────

def _vision():
    try:
        from products.menu_import import vision
        return vision
    except ImportError:
        return None
    except Exception:  # noqa: BLE001 — vision moduli buzuq bo'lsa ham matn/jadval o'qilaveradi
        logger.exception('menu_import: vision moduli yuklanmadi')
        return None


def _image_tokens():
    try:
        from products.menu_import import image_tokens
        return image_tokens
    except ImportError:
        return None


# ─── cheklov (rate limit) ──────────────────────────────────────────────────────────

def _check_rate_limit(shop):
    limit = int(getattr(settings, 'MENU_IMPORT_PARSE_PER_HOUR', PARSE_LIMIT_DEFAULT))
    if limit <= 0:
        return
    key = f'menu_import:parse:{shop.pk}'
    try:
        cache.add(key, 0, PARSE_WINDOW)
        try:
            used = cache.incr(key)
        except ValueError:                       # kalit shu orada tugagan
            cache.set(key, 1, PARSE_WINDOW)
            used = 1
    except Exception:  # noqa: BLE001 — kesh ishlamasa cheklov o'chadi, import to'xtamaydi
        logger.warning('menu_import: rate limit keshi ishlamadi', exc_info=True)
        return
    if used > limit:
        raise RateLimited(
            f"Soatiga {limit} tadan ko'p o'qish so'rovi yuborib bo'lmaydi. Birozdan keyin urinib ko'ring.",
            extra={'retry_after': PARSE_WINDOW})


# ─── parse ─────────────────────────────────────────────────────────────────────────

def parse_request(shop, *, file=None, text=None):
    """Fayl YOKI matn -> ko'rib chiqish jadvali (TZ 1-band javob shakli). Bazaga yozmaydi."""
    has_text = isinstance(text, str) and bool(text.strip())
    if text is not None and not isinstance(text, str):
        raise InvalidInput("«text» matn bo'lishi kerak.", code='invalid_input')
    if file is not None and has_text:
        raise InvalidInput("Fayl va matnni birga yubormang: bittasini tanlang.", code='both_inputs')
    if file is None and not has_text:
        if isinstance(text, str):
            raise InvalidInput("Matn bo'sh. Menyuni «Osh - 45 000» ko'rinishida qatorma-qator joylang.", code='empty_input')
        raise InvalidInput("Fayl yoki matn yuboring.", code='no_input')
    if has_text and len(text) > MAX_TEXT_CHARS:
        raise InvalidInput(f"Matn juda uzun (ko'pi bilan {MAX_TEXT_CHARS // 1000} ming belgi). Bo'lib yuboring.",
                           code='text_too_long')

    _check_rate_limit(shop)
    read = readers.text_result(text, 'text') if has_text else readers.read_upload(file)
    notes = list(read.notes)

    if read.needs:
        extracted = _extract_with_vision(shop, read, notes)
    else:
        extracted = _extract_from_text_or_table(shop, read, notes)
    rows, engine, kind, lines, skipped = (extracted[k] for k in ('rows', 'engine', 'kind', 'lines', 'skipped'))

    if not rows:
        raise NothingRecognized(_nothing_message(read.source, engine, notes), extra={'notes': notes})

    truncated = len(rows) > MAX_ROWS
    total = len(rows)
    if truncated:
        rows = rows[:MAX_ROWS]
        notes.append(f"Faqat dastlabki {MAX_ROWS} ta qator olindi (jami {total} ta). Qolganini alohida yuboring.")
    if skipped:
        notes.append(f"{skipped} ta qator o'qilmadi")
    if extracted.get('samples') and skipped:
        notes.append("O'qilmagan qatorlardan namuna: " + '; '.join(extracted['samples'][:3]))

    built = _build_rows(shop, rows)
    return {
        'source': read.source,
        'engine': engine,
        'kind': kind,
        'truncated': truncated,
        'rows': built['rows'],
        'categories': built['categories'],
        'notes': notes,
        'stats': {'lines': lines, 'recognized': len(built['rows']), 'skipped': skipped},
    }


def _nothing_message(source, engine, notes):
    if source == 'image':
        base = ("Rasmdan taom topilmadi. Rasmni aniqroq va yorug' qilib oling (matn to'liq ko'rinsin), "
                "yoki menyuni matn/Excel/PDF qilib yuboring.")
    elif source == 'pdf':
        base = "PDF dan taom topilmadi. Menyu matn ko'rinishida bo'lsin yoki PDF o'rniga Excel/matn yuboring."
    elif source in ('xlsx', 'csv', 'docx'):
        base = ("Fayldan taom topilmadi. Birinchi ustunda taom nomi, ikkinchisida narx bo'lsin "
                "(birinchi qatorda «Nomi», «Narxi» sarlavhasi bo'lsa yaxshi).")
    else:
        base = "Matndan taom topilmadi. Har qatorni «Taom nomi - narx» ko'rinishida yozing, masalan: Osh - 45 000."
    extra = [n for n in notes if n][:2]
    return base + (' ' + ' '.join(extra) if extra else '')


def _extract_with_vision(shop, read, notes):
    vision = _vision()
    if vision is None:
        raise AIUnavailable("Rasm va skanerlangan PDF o'qish xizmati hozircha ulanmagan. Menyuni matn, Excel yoki Word qilib yuboring.")
    try:
        if read.needs == 'image':
            result = vision.read_image(read.raw, shop=shop)
        else:
            result = vision.read_scanned_pdf(read.raw, shop=shop, max_pages=8)
    except Exception:  # noqa: BLE001 — AI/OCR kutilmagan xato: foydalanuvchiga aniq xabar, tafsilot logda
        logger.exception('menu_import: vision chaqiruvi xato berdi')
        raise AIUnavailable("Rasmni o'qish xizmati hozir ishlamayapti. Birozdan keyin urinib ko'ring yoki matn/Excel yuboring.") from None
    notes.extend(str(n) for n in (getattr(result, 'notes', None) or []) if n)
    engine = getattr(result, 'engine', 'none') or 'none'
    kind = getattr(result, 'kind', 'unknown') or 'unknown'
    raw_rows = list(getattr(result, 'rows', None) or [])
    keep_nameless = kind == 'dish_photo'
    rows = [r for r in (_clean_parsed_row(x, keep_nameless=keep_nameless) for x in raw_rows[:MAX_ROWS + 1]) if r]
    if engine == 'ocr':
        for row in rows:
            row['low_confidence'] = True         # OCR xatosi mumkin: foydalanuvchi har qatorni ko'zdan kechirsin
    if kind == 'dish_photo':
        return _dish_photo(shop, read, rows, notes, engine)
    if not rows and engine == 'none':
        raise AIUnavailable(
            "Rasmni o'qib bo'lmadi: AI o'chiq yoki ulanmagan, matn tanish (OCR) ham topilmadi. "
            "Menyuni matn, Excel yoki PDF qilib yuboring." + (' ' + notes[0] if notes else ''), extra={'notes': notes})
    return {'rows': rows, 'engine': engine if engine in ('ai', 'ocr') else 'ocr', 'kind': 'menu' if rows else kind,
            'lines': len(rows), 'skipped': 0}


def _preview_url(token):
    """Vaqtincha rasm ko'rinishi (faqat shu restoran xodimiga ochiladi: menu_images_views.MenuImagePreviewView)."""
    if not token:
        return None
    from django.urls import reverse
    return reverse('menu_admin_image_preview', args=[token])


def _dish_photo(shop, read, rows, notes, engine):
    row = rows[0] if rows else {'name': '', 'price': None, 'category': '', 'description': '', 'low_confidence': True}
    row = dict(row, price=None, low_confidence=True)
    tokens = _image_tokens()
    token = None
    if tokens is not None:
        try:
            token = tokens.store_temp_image(read.raw, shop.pk, real_photo=True)
        except Exception as exc:  # noqa: BLE001 — TempImageError va boshqalar
            logger.warning('menu_import: taom surati saqlanmadi: %s', exc.__class__.__name__)
            notes.append("Rasmni vaqtincha saqlab bo'lmadi: uni qatorga keyin qo'lda biriktiring.")
    row['image_token'] = token
    return {'rows': [row], 'engine': engine if engine in ('ai', 'ocr') else 'ai', 'kind': 'dish_photo', 'lines': 1, 'skipped': 0}


def _extract_from_text_or_table(shop, read, notes):
    rows, lines, skipped, headers = [], 0, 0, 0
    samples = []
    category = ''
    has_table = False
    text_chunks = []
    for block in read.blocks:
        if block.kind == 'table':
            has_table = True
            out = parse_table_detailed(block.rows, default_category=block.title or category)
        else:
            text_chunks.append(block.text)
            out = parse_text_detailed(block.text, default_category=category)
        category = out.category if not block.title else ''
        lines += out.lines
        skipped += out.skipped
        headers += out.headers
        samples.extend(out.skipped_samples)
        rows.extend(out.rows)
    engine = 'table' if has_table else 'rules'

    cleaned = [r for r in (_clean_parsed_row(x) for x in rows) if r]
    result = {'rows': cleaned, 'engine': engine, 'kind': 'menu', 'lines': lines, 'skipped': skipped, 'samples': samples}

    dish_lines = max(1, lines - headers)
    if engine == 'rules' and lines >= 2 and len(cleaned) / dish_lines < 0.5:
        ai = _structure_with_ai(shop, '\n'.join(text_chunks), notes)
        if ai is not None and len(ai) >= len(cleaned) and ai:
            result.update(rows=ai, engine='ai', skipped=0, lines=max(lines, len(ai)))
    return result


def _structure_with_ai(shop, text, notes):
    """Qoidalar matnning yarmidan kamini tanisa: tartibsiz matnni AI bilan tartiblash (AI yoqiq va mavjud bo'lsa)."""
    vision = _vision()
    func = getattr(vision, 'structure_text_with_ai', None) if vision is not None else None
    if func is None or not text.strip():
        return None
    try:
        result = func(text[:AI_TEXT_CHARS], shop=shop)
    except Exception:  # noqa: BLE001
        logger.exception('menu_import: structure_text_with_ai xato berdi')
        notes.append("AI hozir ishlamayapti: matn oddiy qoidalar bilan o'qildi.")
        return None
    if result is None:
        return None
    notes.extend(str(n) for n in (getattr(result, 'notes', None) or []) if n)
    rows = [r for r in (_clean_parsed_row(x) for x in list(getattr(result, 'rows', None) or [])[:MAX_ROWS + 1]) if r]
    return rows or None


# ─── mavjud ma'lumotlar bilan moslash ──────────────────────────────────────────────

def _category_index(shop):
    """({normalized_name: id}, {id: name}) — do'kon ko'ra oladigan bo'limlar (`Category.shop`, `menu_admin._visible_categories`)."""
    by_name, names = {}, {}
    for cid, name in _visible_categories(shop).order_by('id').values_list('id', 'name'):
        by_name.setdefault(normalize_name(name), cid)
        names[cid] = name
    return by_name, names


def _build_rows(shop, rows):
    product_index = {}
    for pid, name in Product.objects.filter(shop=shop).order_by('id').values_list('id', 'name')[:20000]:
        product_index.setdefault(normalize_name(name), pid)
    cat_by_name, cat_names = _category_index(shop)

    seen, out, categories = set(), [], {}
    for number, row in enumerate(rows, 1):
        key = normalize_name(row['name'])
        price = row['price']
        warnings = []
        if price is None:
            warnings.append('price_missing')
        elif price < PRICE_SMALL:
            warnings.append('price_small')
        elif price > PRICE_LARGE:
            warnings.append('price_large')
        existing_pid = product_index.get(key) if key else None
        if existing_pid:
            warnings.append('name_exists')
        duplicate = bool(key) and key in seen
        if duplicate:
            warnings.append('duplicate_in_file')
        if key:
            seen.add(key)
        category, category_id = row['category'], None
        if category:
            ckey = normalize_name(category)
            category_id = cat_by_name.get(ckey)
            if category_id is None:
                warnings.append('category_new')
            else:
                category = cat_names[category_id]
            categories.setdefault(ckey, {'name': category, 'existing_id': category_id})
        if row.get('low_confidence'):
            warnings.append('low_confidence')
        out.append({
            'row_id': f'r{number}',
            'name': row['name'],
            'price': price,
            'category': category,
            'description': row['description'],
            'image_token': row.get('image_token'),
            'preview_url': _preview_url(row.get('image_token')),
            'warnings': warnings,
            'existing_product_id': existing_pid,
            'existing_category_id': category_id,
            'duplicate_in_file': duplicate,
        })
    return {'rows': out, 'categories': list(categories.values())}


# ─── commit ────────────────────────────────────────────────────────────────────────

def _row_error(errors, row_id, field_name, message):
    errors.append({'row_id': row_id, 'field': field_name, 'message': message})


def _input_error_parts(exc):
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    return str(detail.get('error', 'Noto\'g\'ri qiymat')), str(detail.get('field', '') or '')


def _validate_rows(shop, rows):
    """Barcha qatorlarni tekshiradi. Xato bo'lsa `CommitRejected(rows=[...])`. Yozmaydi."""
    errors, plan = [], []
    cat_by_name, cat_names = _category_index(shop)
    tokens = _image_tokens()
    update_ids = set()
    used_tokens, seen_updates = set(), set()
    for raw in rows:
        if isinstance(raw, dict) and raw.get('mode') == 'update':
            try:
                pid = int(raw.get('existing_product_id'))
                if pid > 0:
                    update_ids.add(pid)
            except (TypeError, ValueError):
                pass
    products = {p.pk: p for p in Product.objects.filter(shop=shop, pk__in=update_ids)} if update_ids else {}

    for index, raw in enumerate(rows, 1):
        row_id = f'r{index}'
        if not isinstance(raw, dict):
            _row_error(errors, row_id, '', "Qator ma'lumoti noto'g'ri (obyekt bo'lishi kerak).")
            continue
        given = raw.get('row_id')
        if isinstance(given, str) and _ROW_ID_RE.match(given):
            row_id = given
        mode = raw.get('mode', 'create')
        if mode not in ('create', 'update', 'skip'):
            _row_error(errors, row_id, 'mode', "Amal «create», «update» yoki «skip» bo'lishi kerak.")
            continue
        if mode == 'skip':
            plan.append({'row_id': row_id, 'mode': 'skip'})
            continue
        item = {'row_id': row_id, 'mode': mode, 'name': '', 'price': None, 'description': '', 'category': '', 'category_id': None,
                'token': None, 'token_info': None, 'product': None}
        before = len(errors)

        if mode == 'create':
            try:
                name = parse_text(raw.get('name'), 'name', max_length=NAME_MAX, required=True)
                item['name'] = clean_text(name, NAME_MAX)
                if not item['name']:
                    raise InputError("Taom nomi kiritilishi shart.", 'name')
            except InputError as exc:
                _row_error(errors, row_id, *reversed(_input_error_parts(exc)))
        else:
            try:
                pid = int(raw.get('existing_product_id'))
            except (TypeError, ValueError):
                pid = 0
            product = products.get(pid)
            if product is None:
                _row_error(errors, row_id, 'existing_product_id', "Yangilanadigan taom topilmadi yoki sizga ruxsat etilmagan.")
            elif pid in seen_updates:
                _row_error(errors, row_id, 'existing_product_id', "Bu taom ro'yxatda ikki marta yangilanmoqda.")
            else:
                seen_updates.add(pid)
                item['product'] = product

        value = raw.get('price')
        if value is None or (isinstance(value, str) and not value.strip()):
            _row_error(errors, row_id, 'price', "Narx kiritilishi shart.")
        else:
            try:
                item['price'] = _clean_price(value, 'price')
            except InputError as exc:
                _row_error(errors, row_id, *reversed(_input_error_parts(exc)))

        try:
            item['description'] = clean_text(
                parse_text(raw.get('description'), 'description', max_length=DESCRIPTION_MAX), DESCRIPTION_MAX)
        except InputError as exc:
            _row_error(errors, row_id, *reversed(_input_error_parts(exc)))

        if mode == 'create':
            _validate_category(raw, item, errors, row_id, cat_by_name, cat_names)

        token = raw.get('image_token')
        if token not in (None, ''):
            if not isinstance(token, str) or not _TOKEN_RE.match(token):
                _row_error(errors, row_id, 'image_token', "Rasm kodi noto'g'ri. Rasmni qayta tanlang.")
            elif token in used_tokens:
                _row_error(errors, row_id, 'image_token', "Bu rasm boshqa qatorda ham ishlatilgan. Har qatorga alohida rasm tanlang.")
            elif tokens is None:
                _row_error(errors, row_id, 'image_token', "Rasm biriktirish hozircha mavjud emas.")
            else:
                info = tokens.peek_temp_image(token, shop.pk)
                if info is None:
                    _row_error(errors, row_id, 'image_token',
                               "Rasm muddati tugagan yoki topilmadi (2 soatdan keyin o'chadi). Rasmni qayta tanlang.")
                else:
                    used_tokens.add(token)
                    item['token'], item['token_info'] = token, info
        if len(errors) == before:
            plan.append(item)
    new_names = {normalize_name(i['category']) for i in plan if i['mode'] == 'create' and i['category'] and i['category_id'] is None}
    if not errors and len(new_names) > MAX_NEW_CATEGORIES:
        raise InvalidInput(
            f"Bir martada {MAX_NEW_CATEGORIES} tadan ko'p yangi bo'lim yaratib bo'lmaydi (sizda {len(new_names)} ta). "
            "Bo'limlar nomini tekshiring: ehtimol narx yoki taom nomi bo'lim sifatida o'qilgan.", code='too_many_categories')
    if errors:
        raise CommitRejected(
            f"{len({e['row_id'] for e in errors})} ta qatorda xato bor. Hech narsa yozilmadi — xatolarni tuzatib, qayta yuboring.",
            extra={'rows': errors})
    return plan


def _validate_category(raw, item, errors, row_id, cat_by_name, cat_names):
    cat_id = raw.get('category_id')
    if cat_id not in (None, '', 'null'):
        try:
            number = int(cat_id) if not isinstance(cat_id, bool) else 0
        except (TypeError, ValueError):
            number = 0
        if number in cat_names:
            item['category_id'], item['category'] = number, cat_names[number]
            return
        if raw.get('category') in (None, ''):
            _row_error(errors, row_id, 'category_id', "Kategoriya topilmadi yoki sizga ruxsat etilmagan.")
            return
    try:
        name = clean_text(parse_text(raw.get('category'), 'category', max_length=CATEGORY_NAME_MAX), CATEGORY_NAME_MAX)
    except InputError as exc:
        _row_error(errors, row_id, *reversed(_input_error_parts(exc)))
        return
    if not name:
        return
    existing = cat_by_name.get(normalize_name(name))
    if existing is not None:
        item['category_id'], item['category'] = existing, cat_names[existing]
    else:
        item['category'] = name


def _allocate_slugs(names):
    """Noyob slug'lar (butun jadval bo'yicha, yashirilgan taomlar ham band) — `Product._unique_slug` formatida, lekin ommaviy:
    "plov", "plov-2", ... Bitta qatorga alohida so'rov yo'q (50 qator ≈ 1 so'rov)."""
    bases = [(slugify(n, allow_unicode=True) or 'taom')[:Product.SLUG_BASE_LENGTH].strip('-') or 'taom' for n in names]
    candidates = set()
    for base in set(bases):
        candidates.add(base)
        candidates.update(f'{base}-{k}' for k in range(2, SLUG_TRIES + 1))
    candidates = list(candidates)
    taken = set()
    for start in range(0, len(candidates), 400):
        taken.update(Product.all_objects.filter(slug__in=candidates[start:start + 400]).values_list('slug', flat=True))
    result = []
    for base in bases:
        slug = next((c for c in [base] + [f'{base}-{k}' for k in range(2, SLUG_TRIES + 1)] if c not in taken), None)
        if slug is None:
            slug = f'{base}-{uuid.uuid4().hex[:6]}'
        taken.add(slug)
        result.append(slug)
    return result


def _write_plan(shop, plan, batch_id, *, request, actor):
    """Bitta tranzaksiya. (natija, [(product, token_info)...]) qaytaradi."""
    created_items = [i for i in plan if i['mode'] == 'create']
    update_items = [i for i in plan if i['mode'] == 'update']
    skipped = sum(1 for i in plan if i['mode'] == 'skip')
    now = timezone.now()
    with transaction.atomic():
        new_categories = {}
        for item in created_items:
            if item['category'] and item['category_id'] is None:
                new_categories.setdefault(normalize_name(item['category']), item['category'])
        category_objs = {}
        if new_categories:
            objs = [Category(shop=shop, name=n, name_uz=n, name_ru=n, is_restaurant=True, is_active=True) for n in new_categories.values()]
            Category.objects.bulk_create(objs)
            category_objs = dict(zip(new_categories.keys(), objs))

        products = []
        slugs = _allocate_slugs([i['name'] for i in created_items]) if created_items else []
        for item, slug in zip(created_items, slugs):
            if item['category_id'] is not None:
                category_id = item['category_id']
            elif item['category']:
                category_id = category_objs[normalize_name(item['category'])].pk
            else:
                category_id = None
            products.append(Product(
                shop=shop, name=item['name'], slug=slug, price=Decimal(item['price']), category_id=category_id,
                description=item['description'], cook_min=15, is_available=True, has_real_photo=False, import_batch=batch_id))
        if products:
            Product.objects.bulk_create(products)

        updated = []
        for item in update_items:
            product = item['product']
            product.price = Decimal(item['price'])
            if item['description']:
                product.description = item['description']
            product.updated_at = now
            updated.append(product)
        if updated:
            Product.objects.bulk_update(updated, ['price', 'description', 'updated_at'])

        categories_created = list(new_categories.values())
        if products or updated:
            log_audit(
                'stock_change', request=request, actor=actor, target_type='menu_import',
                new_value={'action': 'menu_import', 'batch_id': batch_id, 'created': len(products), 'updated': len(updated),
                           'skipped': skipped, 'categories_created': categories_created[:50]})
    pairs = [(p, i['token']) for p, i in zip(products, created_items) if i['token']]
    pairs += [(i['product'], i['token']) for i in update_items if i['token']]
    return {
        'created': len(products), 'updated': len(updated), 'skipped': skipped, 'categories_created': categories_created,
        'products': [{'row_id': i['row_id'], 'id': p.pk} for i, p in zip(created_items, products)]
                    + [{'row_id': i['row_id'], 'id': i['product'].pk} for i in update_items],
    }, pairs


def _attach_images(shop, pairs):
    """Tranzaksiyadan KEYIN: vaqtincha rasmlar mahsulotga biriktiriladi (bir martalik token). Muvaffaqiyatsiz qatorlar qaytariladi."""
    tokens = _image_tokens()
    if not pairs or tokens is None:
        return []
    from backend.upload_validation import optimize_image
    failed, changed = [], []
    for product, token in pairs:
        data = None
        try:
            data = tokens.consume_temp_image(token, shop.pk)
            content = data.get('bytes') if isinstance(data, dict) else None
            if not content:
                raise ValueError('rasm yo\'q')
            upload = optimize_image(SimpleUploadedFile(f'{product.slug or "taom"}.jpg', content, content_type='image/jpeg'))
            product.image.save(f'{product.slug or "taom"}.{upload.name.rsplit(".", 1)[-1]}', ContentFile(upload.read()), save=False)
            real = bool(data.get('real_photo', True))
            product.has_real_photo = real
            product.image_credit = '' if real else str(data.get('credit') or '')[:255]
            product.image_source_url = '' if real else str(data.get('source_url') or '')[:500]
            changed.append(product)
        except Exception:  # noqa: BLE001 — bitta rasm xatosi butun importni buzmasin (taom allaqachon yozilgan)
            logger.warning('menu_import: rasm biriktirilmadi (product=%s)', product.pk, exc_info=True)
            failed.append(product.pk)
    if changed:
        Product.objects.bulk_update(changed, ['image', 'has_real_photo', 'image_credit', 'image_source_url'])
    return failed


def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:  # noqa: BLE001
        logger.warning('menu_import: keshdan o\'qib bo\'lmadi', exc_info=True)
        return None


def _cache_set(key, value, ttl):
    try:
        cache.set(key, value, ttl)
    except Exception:  # noqa: BLE001
        logger.warning('menu_import: keshga yozib bo\'lmadi', exc_info=True)


def commit_batch(shop, data, *, request=None, actor=None):
    """Tasdiqlash: `{submission_id, rows:[...]}` -> `{batch_id, created, updated, skipped, categories_created, products}`."""
    if not isinstance(data, dict):
        raise InvalidInput("So'rov tanasi JSON obyekt bo'lishi kerak.")
    submission_id = data.get('submission_id')
    if not isinstance(submission_id, str) or not _SUBMISSION_RE.match(submission_id):
        raise InvalidInput("«submission_id» kerak (har tasdiqlash uchun yangi UUID).", code='invalid_submission_id')
    rows = data.get('rows')
    if not isinstance(rows, list) or not rows:
        raise InvalidInput("Qo'shiladigan qatorlar yo'q.", code='no_rows')
    if len(rows) > MAX_ROWS:
        raise InvalidInput(f"Bir martada {MAX_ROWS} tadan ko'p qator qo'shib bo'lmaydi (sizda {len(rows)} ta). Bo'lib yuboring.",
                           code='too_many_rows')

    result_key = f'menu_import:commit:{shop.pk}:{submission_id}'
    lock_key = result_key + ':lock'
    cached = _cache_get(result_key)
    if cached is not None:
        return cached
    try:
        got_lock = cache.add(lock_key, 1, SUBMISSION_LOCK_TTL)
    except Exception:  # noqa: BLE001
        got_lock = True
    if not got_lock:
        raise Conflict("Oldingi so'rov hali bajarilmoqda. Bir necha soniyadan keyin natijani qayta so'rang.", code='in_progress')
    try:
        plan = _validate_rows(shop, rows)
        batch_id = str(uuid.uuid4())
        for attempt in (1, 2):
            try:
                result, image_pairs = _write_plan(shop, plan, batch_id, request=request, actor=actor)
                break
            except IntegrityError:
                if attempt == 2:
                    raise Conflict("Server band edi (bir vaqtda boshqa o'zgarish). Qayta urinib ko'ring.") from None
                # slug to'qnashuvi (parallel import): `_write_plan` slug'larni qayta hisoblaydi
        failed = _attach_images(shop, image_pairs)
        bump_menu_version(shop.pk)
        if result['categories_created']:
            bump_menu_version(None)
        result = {'batch_id': batch_id, **result}
        if failed:
            result['images_failed'] = failed
        _cache_set(result_key, result, SUBMISSION_TTL)
        return result
    finally:
        try:
            cache.delete(lock_key)
        except Exception:  # noqa: BLE001
            pass


# ─── undo ──────────────────────────────────────────────────────────────────────────

def undo_batch(shop, data, *, request=None, actor=None):
    """Shu restoran partiyasida yaratilgan taomlarni arxivlaydi (mavjud soft-delete usuli: is_deleted + is_available=False)."""
    if not isinstance(data, dict):
        raise InvalidInput("So'rov tanasi JSON obyekt bo'lishi kerak.")
    batch_id = data.get('batch_id')
    if not isinstance(batch_id, str) or not _BATCH_RE.match(batch_id):
        raise InvalidInput("«batch_id» kerak.", code='invalid_batch_id')
    batch = Product.all_objects.filter(shop=shop, import_batch=batch_id)
    with transaction.atomic():
        if not batch.exists():
            raise BatchNotFound("Bunday import topilmadi.")
        archived = batch.filter(is_deleted=False).update(is_deleted=True, deleted_at=timezone.now(), is_available=False)
        if archived:
            log_audit('stock_change', request=request, actor=actor, target_type='menu_import',
                      new_value={'action': 'menu_import_undo', 'batch_id': batch_id, 'archived': archived})
    if archived:
        bump_menu_version(shop.pk)
    return {'archived': archived}
