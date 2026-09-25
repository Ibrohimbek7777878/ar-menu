"""
⚡ Yuklangan rasm → 3 o'lchamli WebP + LQIP (blur placeholder).
Sabab: mobil internetda menyu 3 sekunddan tez ochilishi kerak.
    800px — taom modali
    400px — menyu kartochkasi
    200px — ro'yxat/savat
"""
import io
import os
import base64
import logging
from PIL import Image, ImageOps, ImageFilter
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

log = logging.getLogger('menu.images')

SIZES = {'lg': 800, 'md': 400, 'sm': 200}
QUALITY = {'lg': 82, 'md': 80, 'sm': 75}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _open(fileobj) -> Image.Image:
    fileobj.seek(0)
    img = Image.open(fileobj)
    img = ImageOps.exif_transpose(img)          # telefon rasmlari aylanib qolmasin
    if img.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', img.size, (255, 255, 255))
        img = img.convert('RGBA')
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert('RGB')
    return img


def _crop_square(img: Image.Image) -> Image.Image:
    """Menyu kartochkalari bir xil ko'rinishi uchun 1:1"""
    w, h = img.size
    side = min(w, h)
    return img.crop(((w - side) // 2, (h - side) // 2,
                     (w + side) // 2, (h + side) // 2))


def make_lqip(img: Image.Image) -> str:
    """20px blur → base64 data URI (sahifa yuklanayotganda ko'rinadi)"""
    tiny = img.resize((20, 20), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
    buf = io.BytesIO()
    tiny.save(buf, format='WEBP', quality=40)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def process_dish_image(dish, fileobj=None, square=True) -> dict:
    """
    ⚡ dish.image dan 3 o'lchamli WebP yaratadi va dish maydonlarini yangilaydi.
    Qaytadi: {'lg': url, 'md': url, 'sm': url, 'blur': data-uri}
    """
    src = fileobj or dish.image
    if not src:
        return {}
    if getattr(src, 'size', 0) > MAX_UPLOAD_BYTES:
        raise ValueError(f'Rasm juda katta (maks {MAX_UPLOAD_BYTES // 1024 // 1024} MB)')

    img = _open(src)
    if square:
        img = _crop_square(img)

    base = f'dish/webp/{dish.restaurant_id}/{dish.pk}'
    out = {}
    for key, size in SIZES.items():
        im = img.copy()
        im.thumbnail((size, size), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format='WEBP', quality=QUALITY[key], method=5)
        path = f'{base}_{key}.webp'
        if default_storage.exists(path):
            default_storage.delete(path)
        saved = default_storage.save(path, ContentFile(buf.getvalue()))
        out[key] = default_storage.url(saved)
        log.info(f'[img] dish#{dish.pk} {key}={size}px {len(buf.getvalue()) // 1024}KB')

    out['blur'] = make_lqip(img)

    dish.image_webp = out['lg']
    dish.image_md = out['md']
    dish.image_sm = out['sm']
    dish.image_blur = out['blur'][:120]
    dish.save(update_fields=['image_webp', 'image_md', 'image_sm',
                             'image_blur', 'updated_at'])
    return out


def process_category_image(category, fileobj=None) -> str:
    src = fileobj or category.image
    if not src:
        return ''
    img = _crop_square(_open(src))
    img.thumbnail((400, 400), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='WEBP', quality=80, method=5)
    path = f'cat/webp/{category.restaurant_id}/{category.pk}.webp'
    if default_storage.exists(path):
        default_storage.delete(path)
    saved = default_storage.save(path, ContentFile(buf.getvalue()))
    category.image_webp = default_storage.url(saved)
    category.save(update_fields=['image_webp', 'updated_at'])
    return category.image_webp


def delete_dish_images(dish):
    """Taom o'chirilganda WebP fayllarini ham tozalash"""
    base = f'dish/webp/{dish.restaurant_id}/{dish.pk}'
    for key in SIZES:
        p = f'{base}_{key}.webp'
        try:
            if default_storage.exists(p):
                default_storage.delete(p)
        except Exception as e:
            log.warning(f'[img] o\'chirilmadi {p}: {e}')
