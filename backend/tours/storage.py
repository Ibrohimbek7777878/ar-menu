"""
Sayr fayllari joylashuvi va kvota: `media/tours/shop_<id>/<uuid>/{source.<ext>, scrub.mp4, play.mp4, low.mp4, poster.jpg}`.

Yo'l FAQAT bizning qiymatlarimizdan (restoran id, uuid, tur) yasaladi: foydalanuvchi fayl nomi hech qachon yo'lga tushmaydi.
`variants` bazada MEDIA_ROOT'ga nisbatan yo'l sifatida saqlanadi; javobda URL (`default_storage.url`) ga aylanadi.
"""
import logging
import os
import re
import shutil

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import F, Sum

logger = logging.getLogger(__name__)

_DIR_RE = re.compile(r'tours/shop_(\d+)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
VARIANT_KEYS = ('scrub', 'play', 'low', 'poster')


def tour_dir(shop_id, media_uuid):
    """MEDIA_ROOT'ga nisbatan papka yo'li."""
    return f'tours/shop_{int(shop_id)}/{media_uuid}'


def abs_path(rel):
    """Nisbiy yo'l -> mutlaq yo'l. `tours/` ostidan chiqadigan yo'l (../, mutlaq, symlink) rad etiladi: ValueError."""
    root = os.path.realpath(os.path.join(str(settings.MEDIA_ROOT), 'tours'))
    full = os.path.realpath(os.path.join(str(settings.MEDIA_ROOT), str(rel)))
    if full != root and not full.startswith(root + os.sep):
        raise ValueError('tour path outside media/tours')
    return full


def variant_urls(variants):
    """{scrub, play, low, poster} -> URL'lar (bo'sh yoki buzuq bo'lsa {})."""
    if not isinstance(variants, dict):
        return {}
    out = {}
    for key in VARIANT_KEYS:
        rel = variants.get(key)
        if isinstance(rel, str) and rel:
            out[key] = default_storage.url(rel)
    return out


def remove_dir(rel_dir):
    """Sayr papkasini butunlay o'chiradi (eski variantlarni qayta yuklashda tozalash). Faqat `tours/shop_<id>/<uuid>` shaklidagi
    yo'l; boshqa narsa tegilmaydi. Xato yutiladi (diskdagi yetim fayl keyingi safar ham bu yerda emas, lekin so'rovni yiqitmaydi)."""
    rel_dir = str(rel_dir or '').strip('/')
    if not _DIR_RE.fullmatch(rel_dir):
        return False
    try:
        full = abs_path(rel_dir)
        if os.path.isdir(full):
            shutil.rmtree(full, ignore_errors=True)
        return True
    except (ValueError, OSError):
        logger.warning('tours: papka o\'chirilmadi: %s', rel_dir, exc_info=True)
        return False


def dir_of(tour):
    return tour_dir(tour.shop_id, tour.media_uuid)


def used_bytes(shop_id, exclude_tour_id=None):
    """Restoranning barcha sayr fayllari yig'indisi (arxivlanganlar ham): manba + variantlar. Bitta SQL."""
    from tours.models import Tour
    qs = Tour.objects.filter(shop_id=shop_id)
    if exclude_tour_id:
        qs = qs.exclude(pk=exclude_tour_id)
    return int(qs.aggregate(total=Sum(F('source_size') + F('variants_size')))['total'] or 0)


def dir_size(path):
    total = 0
    for base, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(base, name))
            except OSError:
                pass
    return total
