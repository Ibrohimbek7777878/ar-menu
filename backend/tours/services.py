"""
Video sayr xizmati: yaratish, tahrirlash, arxivlash, video yuklash, nuqta/belgilarni almashtirish, e'lon qilish, AI so'rovi.
HTTP bilan bog'liq emas (view'lar `tours/interfaces/api/tours_admin.py` da); hamma xato `TourError` (`{error, code, field?}`).

Bir-biriga zid amallar (e'lon, yuklash, kvota, AI chegarasi) restoran qatori qulflanib (`select_for_update`; PostgreSQL) bitta
tranzaksiyada bajariladi; bazadagi qisman noyob indekslar (bitta `published` zal uchun, bitta `processing` restoran uchun) -
oxirgi to'siq.
"""
import logging
import math
import os
import re
import shutil
import tempfile
import uuid
from contextlib import contextmanager

from django.db import IntegrityError, transaction
from django.utils import timezone

from tours import limits, media, storage
from tours.errors import TourError, not_found
from tours.models import Tour, TourAiRun, TourHotspot, TourStop

logger = logging.getLogger(__name__)

TITLE_MAX = 120
STOP_TITLE_MAX = 60
LABEL_MAX = 60
# Boshqaruv va yo'nalish (bidi) belgilari: matnda ko'rinmas, lekin ekranda tartibni buzadi
_INVISIBLE = ''.join(chr(c) for c in (0x200e, 0x200f, *range(0x202a, 0x202f), *range(0x2066, 0x206a), 0xfeff))
_CONTROL_RE = re.compile('[\\x00-\\x1f\\x7f' + re.escape(_INVISIBLE) + ']')


# ── Kirish qiymatlarini tekshirish ──────────────────────────────────────────────────────────────────────────

def clean_text(value, field, max_length, *, required=False):
    """Bir qatorli matn: faqat str; boshqaruv/yo'nalish belgilari olib tashlanadi, bo'shliqlar yig'iladi; uzunlik oshsa - xato (kesilmaydi)."""
    if value is None:
        value = ''
    if not isinstance(value, str):
        raise TourError("Matn bo'lishi kerak", 'invalid', field=field)
    text = ' '.join(_CONTROL_RE.sub(' ', value).split())
    if required and not text:
        raise TourError("Bo'sh bo'lmasligi kerak", 'invalid', field=field)
    if len(text) > max_length:
        raise TourError(f"{max_length} belgidan oshmasligi kerak", 'too_long', field=field)
    return text


def number(value, field, low, high, places=3):
    """JSON son (bool, matn, NaN/Infinity rad etiladi), [low, high] oralig'ida."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TourError("Son bo'lishi kerak", 'invalid', field=field)
    value = float(value)
    if not math.isfinite(value):
        raise TourError("Son bo'lishi kerak", 'invalid', field=field)
    if value < low or value > high:
        raise TourError(f"{low:g} dan {high:g} gacha bo'lishi kerak", 'out_of_range', field=field)
    return round(value, places)


def _hall_for(shop, value, field='hall_id'):
    if value is None or value == '':
        return None
    from tables_restaurant.models import Hall
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise TourError("Zal tanlanmagan yoki noto'g'ri", 'invalid', field=field)
    hall = Hall.objects.filter(pk=value, shop=shop).first()
    if hall is None:                                    # begona restoran zali bilan mavjud bo'lmagan zalni ajratmaymiz
        raise TourError("Zal topilmadi", 'invalid', field=field)
    return hall


# ── Sayr (CRUD) ─────────────────────────────────────────────────────────────────────────────────────────────

def get_tour(shop, pk, *, lock=False):
    """Restoranning sayri (arxivlangan ham). Begona/yo'q - 404."""
    qs = Tour.objects.filter(shop=shop, pk=pk)
    if lock:
        qs = qs.select_for_update(of=('self',))
    tour = qs.first()
    if tour is None:
        raise not_found()
    return tour


def _mutable(tour):
    if tour.is_archived:
        raise TourError("Arxivlangan sayrni o'zgartirib bo'lmaydi", 'archived', 409)


def invalidate_guest(shop_id):
    from tours import guest
    guest.bump_version(shop_id)


def create_tour(shop, data):
    title = clean_text(data.get('title', 'Video sayr'), 'title', TITLE_MAX, required=True)
    hall = _hall_for(shop, data.get('hall_id'))
    if Tour.objects.filter(shop=shop, is_archived=False).count() >= limits.max_tours_per_shop():
        raise TourError(f"Sayrlar soni chegarasi ({limits.max_tours_per_shop()}) to'ldi. Keraksizlarini arxivlang", 'tour_limit', 409)
    return Tour.objects.create(shop=shop, hall=hall, title=title)


def update_tour(shop, pk, data):
    """PATCH: `title`, `hall_id`; arxivdan qaytarish - `archived: false`. Faqat berilgan kalitlar o'zgaradi."""
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        changed = []
        if 'archived' in data:
            if data['archived'] is not False:
                raise TourError("Arxivlash uchun DELETE ishlating; bu yerda faqat archived=false (tiklash) mumkin", 'invalid', field='archived')
            if tour.is_archived:
                if Tour.objects.filter(shop=shop, is_archived=False).count() >= limits.max_tours_per_shop():
                    raise TourError("Sayrlar soni chegarasi to'ldi. Avval keraksizlarini arxivlang", 'tour_limit', 409)
                tour.is_archived = False
                changed.append('is_archived')
        _mutable(tour)
        if 'title' in data:
            tour.title = clean_text(data['title'], 'title', TITLE_MAX, required=True)
            changed.append('title')
        if 'hall_id' in data:
            hall = _hall_for(shop, data['hall_id'])
            new_id = hall.pk if hall else None
            if new_id != tour.hall_id:
                if tour.status == Tour.PUBLISHED:
                    raise TourError("E'lon qilingan sayr zalini o'zgartirish uchun avval e'londan oling", 'published', 409, field='hall_id')
                tour.hall = hall
                changed.append('hall')
        if changed:
            tour.save(update_fields=[*changed, 'updated_at'])
    if changed:
        invalidate_guest(shop.pk)
    return tour


def archive_tour(shop, pk):
    """DELETE = arxivlash (qattiq o'chirish yo'q). E'londagi sayr e'londan olinadi; fayllar kvota hisobida qoladi."""
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        if not tour.is_archived:
            tour.is_archived = True
            if tour.status == Tour.PUBLISHED:
                tour.status = Tour.READY
            tour.save(update_fields=['is_archived', 'status', 'updated_at'])
    invalidate_guest(shop.pk)
    return tour


# ── Nuqtalar va belgilar: to'liq almashtirish (atomik) ──────────────────────────────────────────────────────

def _items(payload, key):
    if isinstance(payload, dict):
        items = payload.get(key)
        if items is None and 'items' in payload:
            items = payload.get('items')
    else:
        items = payload
    if not isinstance(items, list):
        raise TourError(f"«{key}» ro'yxat bo'lishi kerak", 'invalid', field=key)
    return items


def replace_stops(shop, pk, payload):
    get_tour(shop, pk)                                     # avval 404 (begona sayr), keyin tana tekshiruvi
    items = _items(payload, 'stops')
    if len(items) > limits.max_stops():
        raise TourError(f"Nuqtalar soni {limits.max_stops()} tadan oshmasligi kerak", 'too_many', field='stops')
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        _mutable(tour)
        if items and not tour.duration_s:
            raise TourError("Avval video yuklang", 'no_video', 409, field='stops')
        rows = []
        for index, item in enumerate(items):
            path = f'stops[{index}]'
            if not isinstance(item, dict):
                raise TourError("Nuqta obyekt bo'lishi kerak", 'invalid', field=path)
            title = clean_text(item.get('title'), f'{path}.title', STOP_TITLE_MAX, required=True)
            at = number(item.get('t'), f'{path}.t', 0, tour.duration_s)
            rows.append((at, title))
        rows.sort(key=lambda row: row[0])               # vaqt bo'yicha; tartib raqami shundan olinadi
        TourStop.objects.filter(tour=tour).delete()
        TourStop.objects.bulk_create([TourStop(tour=tour, order=i, title=title, t=at) for i, (at, title) in enumerate(rows)])
        Tour.objects.filter(pk=tour.pk).update(updated_at=timezone.now())
    invalidate_guest(shop.pk)
    return Tour.objects.get(pk=tour.pk)


def replace_hotspots(shop, pk, payload):
    get_tour(shop, pk)                                     # avval 404 (begona sayr), keyin tana tekshiruvi
    items = _items(payload, 'hotspots')
    if len(items) > limits.max_hotspots():
        raise TourError(f"Belgilar soni {limits.max_hotspots()} tadan oshmasligi kerak", 'too_many', field='hotspots')
    from tables_restaurant.models import Table
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        _mutable(tour)
        if items and not tour.duration_s:
            raise TourError("Avval video yuklang", 'no_video', 409, field='hotspots')
        parsed = []
        for index, item in enumerate(items):
            path = f'hotspots[{index}]'
            if not isinstance(item, dict):
                raise TourError("Belgi obyekt bo'lishi kerak", 'invalid', field=path)
            raw_table = item.get('table_id')
            if raw_table is not None and (isinstance(raw_table, bool) or not isinstance(raw_table, int) or raw_table < 1):
                raise TourError("Stol noto'g'ri", 'invalid', field=f'{path}.table_id')
            label = clean_text(item.get('label'), f'{path}.label', LABEL_MAX)
            if raw_table is None and not label:
                raise TourError("Stol tanlang yoki belgiga yozuv kiriting", 'invalid', field=f'{path}.table_id')
            t_start = number(item.get('t_start'), f'{path}.t_start', 0, tour.duration_s)
            t_end = number(item.get('t_end'), f'{path}.t_end', 0, tour.duration_s)
            if not t_start < t_end:
                raise TourError("Tugash vaqti boshlanishdan keyin bo'lishi kerak", 'invalid', field=f'{path}.t_end')
            parsed.append((raw_table, label, t_start, t_end, number(item.get('x'), f'{path}.x', 0, 1, 4),
                           number(item.get('y'), f'{path}.y', 0, 1, 4)))
        wanted = {row[0] for row in parsed if row[0] is not None}
        tables = {t.pk: t for t in Table.objects.filter(shop=shop, pk__in=wanted, is_deleted=False)} if wanted else {}
        for index, row in enumerate(parsed):
            if row[0] is not None and row[0] not in tables:       # yo'q, begona yoki yashirilgan stol - bir xil javob
                raise TourError("Stol topilmadi", 'invalid', field=f'hotspots[{index}].table_id')
        parsed.sort(key=lambda row: (row[2], row[3]))
        TourHotspot.objects.filter(tour=tour).delete()
        TourHotspot.objects.bulk_create([
            TourHotspot(tour=tour, table=tables.get(table_id), label=label, t_start=t_start, t_end=t_end, x=x, y=y)
            for table_id, label, t_start, t_end, x, y in parsed])
        Tour.objects.filter(pk=tour.pk).update(updated_at=timezone.now())
    invalidate_guest(shop.pk)
    return Tour.objects.get(pk=tour.pk)


# ── E'lon qilish ────────────────────────────────────────────────────────────────────────────────────────────

def _lock_shop(shop):
    from shops.models import Shop
    Shop.objects.select_for_update(of=('self',)).filter(pk=shop.pk).first()


def publish(shop, pk):
    """Tayyor sayrni e'lon qiladi; shu zal uchun avval e'lon qilingani `ready` ga qaytadi (bitta tranzaksiyada). Takroriy chaqiruv - xavfsiz."""
    with transaction.atomic():
        _lock_shop(shop)
        tour = get_tour(shop, pk, lock=True)
        _mutable(tour)
        if tour.status == Tour.PUBLISHED:
            return tour
        if tour.status != Tour.READY or not all(tour.variants.get(k) for k in storage.VARIANT_KEYS):
            raise TourError("Sayr hali tayyor emas: avval video yuklanib, qayta ishlanishi kerak", 'not_ready', 409)
        Tour.objects.filter(shop=shop, hall_id=tour.hall_id, status=Tour.PUBLISHED).exclude(pk=tour.pk).update(
            status=Tour.READY, updated_at=timezone.now())
        tour.status = Tour.PUBLISHED
        tour.published_at = timezone.now()
        tour.save(update_fields=['status', 'published_at', 'updated_at'])
    invalidate_guest(shop.pk)
    return tour


def unpublish(shop, pk):
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        if tour.status == Tour.PUBLISHED:
            tour.status = Tour.READY
            tour.save(update_fields=['status', 'updated_at'])
    invalidate_guest(shop.pk)
    return tour


# ── Video yuklash ───────────────────────────────────────────────────────────────────────────────────────────

@contextmanager
def _local_file(uploaded):
    """Yuklangan fayl diskdagi yo'li. Django 5 MB dan kattasini o'zi vaqtinchalik faylga yozadi (to'liq xotiraga O'QILMAYDI);
    kichigi (xotirada) MEDIA'dan tashqaridagi vaqtinchalik faylga oqim bilan yoziladi."""
    path_fn = getattr(uploaded, 'temporary_file_path', None)
    if callable(path_fn):
        yield path_fn()
        return
    directory = limits.tmp_dir()
    os.makedirs(directory, exist_ok=True)
    handle, path = tempfile.mkstemp(prefix='tour_', suffix='.part', dir=directory)
    try:
        with os.fdopen(handle, 'wb') as out:
            for chunk in uploaded.chunks(1024 * 1024):
                out.write(chunk)
        yield path
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _check_free(shop, tour, size):
    """Kvota va "bir vaqtda bitta qayta ishlash" qoidalari (tranzaksiya ichida - qulf ostida - ham chaqiriladi)."""
    if Tour.objects.filter(shop=shop, status=Tour.PROCESSING).exclude(pk=tour.pk).exists():
        raise TourError("Boshqa video hali qayta ishlanmoqda. Tugashini kuting", 'processing_busy', 409)
    free = limits.quota_bytes() - storage.used_bytes(shop.pk, exclude_tour_id=tour.pk)
    if size > free:
        raise TourError(
            f"Joy yetarli emas: sayrlar uchun {limits.quota_bytes() // (1024 * 1024)} MB ajratilgan, "
            f"bo'sh joy {max(free, 0) // (1024 * 1024)} MB, fayl {size // (1024 * 1024) + 1} MB. Keraksiz sayrni yangi video bilan almashtiring",
            'quota_exceeded', 413)


def _preconditions(tour):
    _mutable(tour)
    if tour.status == Tour.PUBLISHED:
        raise TourError("E'lon qilingan sayr videosini almashtirish uchun avval e'londan oling", 'published', 409)
    if tour.status == Tour.PROCESSING:
        raise TourError("Bu sayr videosi hozir qayta ishlanmoqda", 'processing_busy', 409)


def upload_video(shop, pk, uploaded):
    """
    Videoni qabul qiladi: hajm -> haqiqiy tekshiruv (ffprobe) -> yangi papkaga oqim bilan nusxa -> tranzaksiya (qulf, kvota, bitta
    `processing`) -> `processing`. Rad etilsa yangi fayl o'chiriladi. Eski variantlar muvaffaqiyatli yuklashdan KEYIN tozalanadi.
    """
    tour = get_tour(shop, pk)                              # avval 404 (begona sayr), keyin fayl tekshiruvi
    if uploaded is None:
        raise TourError("«video» maydonida fayl yuborilmadi (multipart/form-data)", 'no_file', field='video')
    _preconditions(tour)
    size = int(getattr(uploaded, 'size', 0) or 0)
    if size <= 0:
        raise TourError("Fayl bo'sh", 'invalid_video', field='video')
    if size > limits.max_source_bytes():
        raise TourError(f"Video hajmi {limits.max_source_mb():g} MB dan oshmasligi kerak (sizniki: {size // (1024 * 1024)} MB)", 'too_large', 413)
    _check_free(shop, tour, size)                          # arzon oldindan tekshiruv: keraksiz nusxa ko'chirmaslik uchun

    with _local_file(uploaded) as local:
        probe = media.probe_video(local)
        media_uuid = uuid.uuid4()
        rel_dir = storage.tour_dir(shop.pk, media_uuid)
        rel_source = f'{rel_dir}/source.{probe.ext}'
        try:
            target = storage.abs_path(rel_source)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(local, 'rb') as src, open(target, 'wb') as dst:
                shutil.copyfileobj(src, dst, 1024 * 1024)
            real_size = os.path.getsize(target)
        except (OSError, ValueError):
            storage.remove_dir(rel_dir)
            logger.exception('tours: manba fayl saqlanmadi')
            raise TourError("Faylni saqlab bo'lmadi. Keyinroq urinib ko'ring", 'storage_error', 500) from None
        old_dir = None
        try:
            with transaction.atomic():
                _lock_shop(shop)
                locked = get_tour(shop, pk, lock=True)
                _preconditions(locked)
                _check_free(shop, locked, real_size)
                old_dir = storage.dir_of(locked) if (locked.source or locked.variants) else None
                locked.source.name = rel_source
                locked.source_size = real_size
                locked.variants_size = 0
                locked.media_uuid = media_uuid
                locked.variants = {}
                locked.status = Tour.PROCESSING
                locked.error = ''
                locked.duration_s = probe.duration
                locked.width, locked.height = probe.width, probe.height
                locked.processing_started_at = timezone.now()
                locked.processing_claimed_at = None
                locked.attempts = 0
                locked.ai_status, locked.ai_suggestions, locked.ai_run_id = Tour.AI_IDLE, None, None   # eski videoning takliflari yangisiga yaramaydi
                locked.save()
        except IntegrityError:
            storage.remove_dir(rel_dir)
            raise TourError("Boshqa video hali qayta ishlanmoqda. Tugashini kuting", 'processing_busy', 409) from None
        except BaseException:
            storage.remove_dir(rel_dir)
            raise
    if old_dir and old_dir != rel_dir:
        storage.remove_dir(old_dir)                        # eski variantlarni tozalash (yangi yuklash qabul qilindi)
    invalidate_guest(shop.pk)
    return Tour.objects.get(pk=pk)


# ── AI so'rovi ──────────────────────────────────────────────────────────────────────────────────────────────

def _day_start():
    return timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)


def request_ai(shop, pk):
    """AI takliflarini navbatga qo'yadi (ishchi bajaradi). Sozlama o'chiq/kalit yo'q -> 409 ai_disabled; kunlik chegara -> 429."""
    from tours import ai
    get_tour(shop, pk)                                     # avval 404 (begona sayr), keyin sozlama
    ai.require_enabled(shop)
    with transaction.atomic():
        _lock_shop(shop)
        tour = get_tour(shop, pk, lock=True)
        _mutable(tour)
        if tour.status not in (Tour.READY, Tour.PUBLISHED) or not tour.variants.get('play'):
            raise TourError("AI uchun avval video yuklanib, qayta ishlanishi kerak", 'no_video', 409)
        if tour.ai_status == Tour.AI_RUNNING:
            return tour                                    # qayta bosish: ikkinchi so'rov yaratilmaydi
        used = TourAiRun.objects.filter(shop=shop, created_at__gte=_day_start()).count()
        if used >= limits.ai_daily_limit():
            raise TourError(f"Bugungi AI so'rovlari chegarasi ({limits.ai_daily_limit()}) tugadi. Ertaga urinib ko'ring",
                            'ai_limit', 429)
        run = TourAiRun.objects.create(shop=shop, tour=tour)
        tour.ai_status = Tour.AI_RUNNING
        tour.ai_run_id = run.run_id
        tour.ai_requested_at = timezone.now()
        tour.ai_claimed_at = None
        tour.error = ''
        tour.save(update_fields=['ai_status', 'ai_run_id', 'ai_requested_at', 'ai_claimed_at', 'error', 'updated_at'])
    return tour


def clear_ai_suggestions(shop, pk):
    """Takliflarni tashlaydi (egasi rad etdi) va ishlayotgan AI so'rovini bekor qiladi (ishchi natijani yozmaydi)."""
    with transaction.atomic():
        tour = get_tour(shop, pk, lock=True)
        tour.ai_suggestions = None
        tour.ai_status = Tour.AI_IDLE
        tour.ai_run_id = None
        tour.ai_claimed_at = None
        if tour.status != Tour.FAILED:
            tour.error = ''
        tour.save(update_fields=['ai_suggestions', 'ai_status', 'ai_run_id', 'ai_claimed_at', 'error', 'updated_at'])
    return tour
