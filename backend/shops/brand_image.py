"""Logotip va favicon yuklash: Pillow bilan TO'LIQ qayta ishlash (TZ_MULTITENANT, Bosqich 2).

Nega qayta kodlanadi: yuklangan baytlar HECH QACHON qaytarib berilmaydi — rasm ochiladi, o'lchami kichraytiriladi va yangi
WebP/PNG sifatida yoziladi. Shu bilan (1) EXIF/GPS ma'lumoti yo'qoladi, (2) rasmga yashirilgan kod (polyglot) qolmaydi,
(3) fayl hajmi kichik bo'ladi. SVG TAQIQLANGAN: u rasm emas, skript tashiy oladi va media o'z origin'imizdan beriladi (saqlanadigan XSS).

Qoidalar: faqat PNG / JPEG / WebP (tur kengaytmaga emas, fayl MAZMUNIGA qarab aniqlanadi); <= 2 MB; <= 16 Mpiksel (dekompressiya bombasi);
logotip <= 512 px (WebP), favicon 64x64 (PNG, shaffof kvadratga joylanadi); fayl nomi serverda yasaladi (foydalanuvchi nomi ishlatilmaydi):
`brand/shop_<id>/<logo|favicon>-<12 belgili xesh>.<webp|png>` — tenant papkasi, xesh o'zgarganda manzil ham o'zgaradi (eski kesh qolmaydi).
"""
import hashlib
import io

MAX_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 16_000_000             # 4000x4000: logotipga yetarli; ochilganda xotira <= ~64 MB
ALLOWED_FORMATS = ('PNG', 'JPEG', 'WEBP')
KINDS = ('logo', 'favicon')
LOGO_MAX_SIDE = 512
FAVICON_SIDE = 64


class BrandImageError(Exception):
    """Foydalanuvchiga ko'rsatiladigan o'zbekcha xabar."""


def _looks_like_svg(head):
    lowered = head.lstrip(b'\xef\xbb\xbf \t\r\n').lower()
    return lowered.startswith((b'<svg', b'<?xml', b'<!doctype svg')) or b'<svg' in lowered[:1024]


def _read(uploaded):
    size = getattr(uploaded, 'size', None)
    if size is not None and size > MAX_BYTES:
        raise BrandImageError(f"Rasm hajmi {MAX_BYTES // 1024 // 1024} MB dan oshmasligi kerak (hozir: {size / 1024 / 1024:.1f} MB)")
    uploaded.seek(0)
    data = uploaded.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise BrandImageError(f"Rasm hajmi {MAX_BYTES // 1024 // 1024} MB dan oshmasligi kerak")
    if not data:
        raise BrandImageError("Fayl bo'sh")
    return data


def process_brand_image(uploaded, kind):
    """
    Yuklangan faylni tekshiradi va qayta kodlaydi. -> (bayt, kengaytma, xesh12).
    Xato — BrandImageError (o'zbekcha matn).
    """
    from PIL import Image, ImageOps, UnidentifiedImageError
    if kind not in KINDS:
        raise BrandImageError("Tur logo yoki favicon bo'lishi kerak")
    data = _read(uploaded)
    if _looks_like_svg(data[:2048]):
        raise BrandImageError("SVG fayllar xavfsizlik uchun taqiqlangan. PNG, JPEG yoki WebP yuklang")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format
            width, height = probe.size
            probe.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError, EOFError):
        raise BrandImageError("Fayl buzilgan yoki rasm emas. PNG, JPEG yoki WebP yuklang") from None
    if fmt not in ALLOWED_FORMATS:
        raise BrandImageError(f"Faqat PNG, JPEG yoki WebP ruxsat etiladi (siz yuklagan: {fmt or 'noma lum'})")
    if width < 1 or height < 1 or width * height > MAX_PIXELS:
        raise BrandImageError("Rasm o'lchami juda katta (16 megapikseldan kichik bo'lishi kerak)")
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()                                            # verify() dan keyin qayta ochilishi shart
            img = ImageOps.exif_transpose(img)                    # kamera aylantirishi qo'llanadi; EXIF ma'lumoti saqlanmaydi
            has_alpha = 'A' in img.getbands() or 'transparency' in img.info
            img = img.convert('RGBA' if has_alpha else 'RGB')
            if kind == 'favicon':
                img = ImageOps.contain(img, (FAVICON_SIDE, FAVICON_SIDE), Image.LANCZOS)
                canvas = Image.new('RGBA', (FAVICON_SIDE, FAVICON_SIDE), (0, 0, 0, 0))
                canvas.paste(img.convert('RGBA'), ((FAVICON_SIDE - img.width) // 2, (FAVICON_SIDE - img.height) // 2))
                out, extension, params = canvas, 'png', {'format': 'PNG', 'optimize': True}
            else:
                img.thumbnail((LOGO_MAX_SIDE, LOGO_MAX_SIDE), Image.LANCZOS)     # kattalashtirilmaydi
                out, extension, params = img, 'webp', {'format': 'WEBP', 'quality': 90, 'method': 6}
            buffer = io.BytesIO()
            out.save(buffer, **params)                            # info/exif uzatilmaydi -> metama'lumotsiz fayl
    except BrandImageError:
        raise
    except Exception:  # noqa: BLE001 — Pillow turli xato turlarini beradi; hammasi "buzuq rasm"
        raise BrandImageError("Rasmni qayta ishlab bo'lmadi: fayl buzilgan bo'lishi mumkin") from None
    result = buffer.getvalue()
    return result, extension, hashlib.sha256(result).hexdigest()[:12]
