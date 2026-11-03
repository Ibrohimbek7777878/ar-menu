"""Menyuni ommaviy kiritish: vaqtincha rasm ombori (token bilan).

Rasm `<CACHE_DIR>/import_tmp/<token>.jpg` (MEDIA_ROOT'dan tashqarida), yonida meta `<token>.json` (shop_id, credit, source_url, real_photo, created_at).
Bu fayllar mahsulot EMAS, faqat tasdiqlanmagan qator uchun vaqtincha nusxa: 2 soatdan keyin o'chiriladi (AGENTS 4-qoida mahsulotlarga tegishli).

Xavfsizlik:
- Yo'l FAQAT tokendan tuziladi va token qat'iy regex bilan tekshiriladi (`/`, `..`, nuqta, NUL mumkin emas) -> yo'l o'tish (path traversal) yo'q.
- Token = `secrets.token_urlsafe(24)` (192 bit). Boshqa restoran tokeni `None` qaytaradi (yo'qligi bilan farqlanmaydi).
- Kirish ishonchsiz: Pillow bilan ochiladi, format tekshiriladi (JPEG/PNG/WEBP), piksel soni cheklanadi (decompression bomb),
  EXIF yo'naltirishi qo'llanib EXIF/ICC to'liq tashlanadi (GPS yo'q), <= 1600 px, RGB JPEG qilib saqlanadi.
- `consume_temp_image` bir martalik: faylni atomik `os.replace` bilan "egallab" olgan bitta chaqiruvgina natija oladi.
"""
import io
import json
import logging
import os
import re
import secrets
import time
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

TMP_DIRNAME = 'import_tmp'
TOKEN_RE = re.compile(r'[A-Za-z0-9_-]{32}')  # token_urlsafe(24) = aynan 32 belgi
TTL_SECONDS = 2 * 60 * 60
MAX_INPUT_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000          # ~40 Mpx: undan katta rasm ochilmaydi (decompression bomb)
MAX_SIDE = 1600
JPEG_QUALITY = 85
CLEANUP_DELETE_LIMIT = 50        # bitta `store` chaqiruvida ko'pi bilan shuncha fayl o'chiriladi
CLEANUP_SCAN_LIMIT = 1000        # va ko'pi bilan shuncha yozuv ko'riladi
ALLOWED_FORMATS = {'JPEG', 'MPO', 'PNG', 'WEBP'}  # MPO = ba'zi telefonlarning ko'p-kadrli JPEG'i
MAX_CREDIT_LEN = 255             # Product.image_credit
MAX_SOURCE_URL_LEN = 500         # Product.image_source_url
_META_MAX_BYTES = 64 * 1024
# Shu modul yaratgan fayllar nomi (cleanup faqat shularga tegadi)
_OWN_FILE_RE = re.compile(r'[A-Za-z0-9_-]{32}(?:\.[0-9a-f]{8})?\.(?:jpg|json|claim)(?:\.tmp)?')
_CONTROL_RE = re.compile(r'[\x00-\x1f\x7f-\x9f​-‏‪-‮⁦-⁩﻿]')


class TempImageError(ValueError):
    """Rasmni qabul qilib bo'lmadi. `code`: empty | too_large | not_image | unsupported_format | too_many_pixels | storage."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def tmp_dir():
    """Vaqtinchalik fayllar papkasi (`settings.MENU_IMPORT_TMP_DIR`): MEDIA_ROOT'DAN TASHQARIDA — media ochiq beriladi,
    bu fayllar esa faqat admin preview endpointi orqali ko'rinadi."""
    return Path(settings.MENU_IMPORT_TMP_DIR)


def _valid_token(token):
    return isinstance(token, str) and TOKEN_RE.fullmatch(token) is not None


def _shop_id(value):
    if isinstance(value, bool):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _paths(token):
    """(jpg, json) yo'llari. FAQAT tekshirilgan tokendan."""
    base = tmp_dir()
    return base / f'{token}.jpg', base / f'{token}.json'


def _clean_credit(value):
    return _CONTROL_RE.sub(' ', str(value or '')).strip()[:MAX_CREDIT_LEN]


def _clean_source_url(value):
    """Faqat http(s): mehmon oynasida havola bo'ladi, `javascript:` kabi sxemalar o'tmasligi kerak."""
    url = _CONTROL_RE.sub('', str(value or '')).strip()
    if len(url) > MAX_SOURCE_URL_LEN or not re.match(r'https?://[^\s<>"\']+$', url, re.IGNORECASE):
        return ''
    return url


def normalize_image(image_bytes, *, max_side=MAX_SIDE):
    """Ishonchsiz rasm baytlari -> xavfsiz JPEG baytlari (<= 1600 px, RGB, EXIF'siz). Xato: `TempImageError`.

    Vision/OCR ham shu funksiyadan foydalanadi: AI'ga ketadigan rasm ham aynan shunday tozalangan bo'ladi.
    `max_side` — uzun tomon chegarasi (standart 1600; OCR yaxshiroq o'qishi uchun kattaroq so'raydi).
    """
    if isinstance(image_bytes, (bytearray, memoryview)):
        image_bytes = bytes(image_bytes)
    if not isinstance(image_bytes, bytes) or not image_bytes:
        raise TempImageError('empty', "Rasm fayli bo'sh")
    if len(image_bytes) > MAX_INPUT_BYTES:
        raise TempImageError('too_large', f'Rasm juda katta (ko\'pi bilan {MAX_INPUT_BYTES // (1024 * 1024)} MB)')
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.format not in ALLOWED_FORMATS:
            raise TempImageError('unsupported_format', "Rasm formati qo'llanmaydi: JPG, PNG yoki WEBP yuklang")
        width, height = img.size
        if width < 1 or height < 1 or width * height > MAX_PIXELS:
            raise TempImageError('too_many_pixels', "Rasm o'lchami juda katta. Kichikroq rasm yuklang")
        if img.format in ('JPEG', 'MPO'):
            img.draft('RGB', (max_side, max_side))  # JPEG'ni dekodlashda darrov kichraytiradi (tez va kam xotira)
        img.load()
        img = ImageOps.exif_transpose(img)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            rgba = img.convert('RGBA')
            flat = Image.new('RGB', rgba.size, (255, 255, 255))
            flat.paste(rgba, mask=rgba.getchannel('A'))
            img = flat
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, 'JPEG', quality=JPEG_QUALITY, optimize=True)  # exif/icc berilmaydi -> hech narsa ko'chmaydi
        return out.getvalue()
    except TempImageError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise TempImageError('too_many_pixels', "Rasm o'lchami juda katta. Kichikroq rasm yuklang") from None
    except Exception:  # noqa: BLE001 — Pillow buzuq fayllarda turli xato turlarini beradi (OSError, SyntaxError, ValueError, ...)
        raise TempImageError('not_image', "Bu rasm emas yoki fayl buzilgan. JPG, PNG yoki WEBP yuklang") from None


def _atomic_write(path, data):
    tmp = path.with_name(path.name + '.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _unlink(path):
    try:
        os.unlink(path)
    except OSError:
        pass


def store_temp_image(image_bytes, shop_id, *, credit='', source_url='', real_photo=True):
    """Rasmni tekshirib vaqtincha saqlaydi va TOKEN qaytaradi. Xato: `TempImageError` (yoki shop_id noto'g'ri bo'lsa ValueError)."""
    owner = _shop_id(shop_id)
    if owner is None:
        raise ValueError("shop_id musbat butun son bo'lishi kerak")
    jpeg = normalize_image(image_bytes)
    cleanup_expired()  # cheklangan hajmda (CLEANUP_DELETE_LIMIT), xatosi asosiy oqimni to'xtatmaydi
    token = secrets.token_urlsafe(24)
    jpg_path, meta_path = _paths(token)
    meta = {
        'shop_id': owner,
        'credit': _clean_credit(credit),
        'source_url': _clean_source_url(source_url),
        'real_photo': bool(real_photo),
        'created_at': time.time(),
    }
    try:
        jpg_path.parent.mkdir(parents=True, exist_ok=True)
        _atomic_write(jpg_path, jpeg)
        _atomic_write(meta_path, json.dumps(meta).encode('utf-8'))
    except OSError:
        _unlink(jpg_path)
        _unlink(meta_path)
        logger.exception('menu_import: vaqtincha rasm yozilmadi')
        raise TempImageError('storage', "Rasmni vaqtincha saqlab bo'lmadi. Keyinroq urinib ko'ring") from None
    return token


def _load(token, shop_id):
    """Meta + fayl tekshiruvi. (jpg_path, meta_path, meta) yoki None (token yaroqsiz / boshqa restoran / muddati o'tgan / yo'q)."""
    owner = _shop_id(shop_id)
    if owner is None or not _valid_token(token):
        return None
    jpg_path, meta_path = _paths(token)
    try:
        with open(meta_path, 'rb') as handle:
            raw = handle.read(_META_MAX_BYTES + 1)
        if len(raw) > _META_MAX_BYTES:
            return None
        meta = json.loads(raw.decode('utf-8'))
        if not isinstance(meta, dict) or not jpg_path.is_file():
            return None
        created = float(meta['created_at'])
        stored_owner = meta['shop_id']
    except (OSError, ValueError, KeyError, TypeError):
        return None
    if isinstance(stored_owner, bool) or stored_owner != owner:
        return None
    if time.time() - created > TTL_SECONDS:
        _unlink(jpg_path)
        _unlink(meta_path)
        return None
    return jpg_path, meta_path, meta


def _public_info(meta):
    return {
        'credit': str(meta.get('credit') or ''),
        'source_url': str(meta.get('source_url') or ''),
        'real_photo': bool(meta.get('real_photo', True)),
    }


def peek_temp_image(token, shop_id):
    """O'qib ko'rish (ISTE'MOL QILMAYDI): {path (pathlib.Path), credit, source_url, real_photo} yoki None."""
    loaded = _load(token, shop_id)
    if loaded is None:
        return None
    jpg_path, _meta_path, meta = loaded
    return {'path': jpg_path, **_public_info(meta)}


def consume_temp_image(token, shop_id):
    """BIR MARTALIK: {bytes, content_type, credit, source_url, real_photo} yoki None. Fayl o'chadi (vaqtinchalik nusxa)."""
    loaded = _load(token, shop_id)
    if loaded is None:
        return None
    jpg_path, meta_path, meta = loaded
    claimed = jpg_path.with_name(f'{token}.{secrets.token_hex(4)}.claim')
    try:
        os.replace(jpg_path, claimed)  # atomik: parallel chaqiruvlardan faqat bittasi egallaydi
    except OSError:
        return None
    try:
        data = claimed.read_bytes()
    except OSError:
        data = None
    finally:
        _unlink(claimed)
        _unlink(meta_path)
    if not data:
        return None
    return {'bytes': data, 'content_type': 'image/jpeg', **_public_info(meta)}


def cleanup_expired(*, limit=CLEANUP_DELETE_LIMIT):
    """TTL (2 soat)dan eski vaqtincha fayllarni o'chiradi; ko'pi bilan `limit` ta. O'chirilganlar soni. Hech qachon xato bermaydi."""
    removed = 0
    scanned = 0
    cutoff = time.time() - TTL_SECONDS
    try:
        with os.scandir(tmp_dir()) as entries:
            for entry in entries:
                scanned += 1
                if scanned > CLEANUP_SCAN_LIMIT or removed >= limit:
                    break
                if not _OWN_FILE_RE.fullmatch(entry.name):
                    continue
                try:
                    if entry.is_file(follow_symlinks=False) and entry.stat(follow_symlinks=False).st_mtime < cutoff:
                        os.unlink(entry.path)
                        removed += 1
                except OSError:
                    continue
    except OSError:
        pass
    return removed
