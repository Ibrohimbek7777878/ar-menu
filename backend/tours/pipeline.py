"""
Sayr ishchi navbati (Redis/Celery shart emas: navbat bazada). `run_tour_worker` va `run_workers` shuni chaqiradi.

Video: `status='processing'` va `processing_claimed_at IS NULL` - navbatda; ishchi `processing_claimed_at` ni atomik qo'yib "oladi"
(PostgreSQL'da `FOR UPDATE SKIP LOCKED`, SQLite'da oddiy tanlov + shartli UPDATE: ikki ishchi bitta vazifani olmaydi). Qotib qolgan
(ishchi o'lgan) vazifa `TOUR_PROCESSING_TIMEOUT_S` dan keyin qayta navbatga qo'yiladi, `TOUR_MAX_ATTEMPTS` dan ko'p urinilgan bo'lsa
`failed`. AI: `ai_status='running'` va `ai_claimed_at IS NULL`.
"""
import logging
import os
import time
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from tours import ai, limits, media, storage
from tours.models import Tour

logger = logging.getLogger(__name__)

MSG_FAILED = "Videoni qayta ishlab bo'lmadi. Boshqa formatda yoki qisqaroq video yuklab ko'ring"
MSG_STUCK = "Videoni qayta ishlash tugamadi (server qayta ishga tushgan bo'lishi mumkin). Videoni qayta yuklang"
RECOVER_EVERY_S = 30
_last_recover = 0.0


def recover_stale_jobs(now=None):
    """Qotib qolgan `processing` vazifalar: urinish qolgan bo'lsa qayta navbatga, aks holda `failed`. Qaytaradi: tegilgan vazifalar soni."""
    now = now or timezone.now()
    cutoff = now - timedelta(seconds=limits.processing_timeout_s())
    stale = Tour.objects.filter(status=Tour.PROCESSING, processing_claimed_at__lt=cutoff)
    requeued = stale.filter(attempts__lt=limits.max_attempts()).update(processing_claimed_at=None)
    failed = Tour.objects.filter(status=Tour.PROCESSING, processing_claimed_at__lt=cutoff).update(
        status=Tour.FAILED, error=MSG_STUCK, processing_claimed_at=None, updated_at=now)
    return requeued + failed + ai.recover_stale_ai(now)


def claim_next_video(now=None):
    """Navbatdagi videoni oladi (atomik) yoki None."""
    now = now or timezone.now()
    queue = Tour.objects.filter(status=Tour.PROCESSING, processing_claimed_at__isnull=True).exclude(source='').order_by('processing_started_at', 'id')
    for _ in range(5):
        with transaction.atomic():
            candidate = queue.select_for_update(skip_locked=True, of=('self',)).first()
            if candidate is None:
                return None
            won = Tour.objects.filter(pk=candidate.pk, status=Tour.PROCESSING, processing_claimed_at__isnull=True,
                                      media_uuid=candidate.media_uuid).update(processing_claimed_at=now, attempts=F('attempts') + 1)
        if won:
            return Tour.objects.get(pk=candidate.pk)
    return None


def _fail(tour, message):
    Tour.objects.filter(pk=tour.pk, status=Tour.PROCESSING, media_uuid=tour.media_uuid).update(
        status=Tour.FAILED, error=message[:300], processing_claimed_at=None, updated_at=timezone.now())


def process_video(tour):
    """Bitta videoni qayta ishlaydi: variantlar -> `ready`; xato -> `failed` (foydalanuvchiga umumiy matn, tafsilot faqat logga)."""
    out_dir = None
    try:
        if not tour.source:
            _fail(tour, "Asl video fayli topilmadi. Videoni qayta yuklang")
            return False
        source = storage.abs_path(tour.source.name)
        out_dir = os.path.dirname(source)
        if not os.path.isfile(source):
            _fail(tour, "Asl video fayli topilmadi. Videoni qayta yuklang")
            return False
        probe = media.probe_video(source)
        produced = media.make_variants(probe, source, out_dir)
        rel_dir = storage.dir_of(tour)
        variants = {key: f'{rel_dir}/{name}' for key, name in produced.items()}
        final = media.probe_video(os.path.join(out_dir, produced['scrub']))      # chiqish o'lchami (aylantirish hisobga olingan)
        size = sum(os.path.getsize(os.path.join(out_dir, name)) for name in produced.values())
        done = Tour.objects.filter(pk=tour.pk, status=Tour.PROCESSING, media_uuid=tour.media_uuid).update(
            status=Tour.READY, variants=variants, variants_size=size, duration_s=round(final.duration, 2),
            width=final.width, height=final.height, error='', processing_claimed_at=None, updated_at=timezone.now())
        if not done:                                   # vazifa o'zgargan (masalan, qo'lda tuzatilgan): yetim variantlarni qoldirmaymiz
            _purge_variants(out_dir)
            return False
        return True
    except media.MediaFailure as exc:
        logger.warning('tours: tur %s qayta ishlanmadi: %s | %s', tour.pk, exc.message, exc.detail)
        if out_dir:
            _purge_variants(out_dir)
        _fail(tour, MSG_FAILED if exc.detail not in ('timeout', 'ffmpeg_missing') else exc.message)
        return False
    except Exception as exc:  # noqa: BLE001 — ishchi hech qachon yiqilmasin (TourError ham shu yerga tushadi: manba fayl buzilgan)
        logger.exception('tours: tur %s da kutilmagan xato', tour.pk)
        if out_dir:
            _purge_variants(out_dir)
        _fail(tour, getattr(exc, 'message', None) or MSG_FAILED)
        return False


def _purge_variants(out_dir):
    for name in media.VARIANT_FILES.values():
        try:
            os.unlink(os.path.join(out_dir, name))
        except OSError:
            pass


def claim_next_ai(now=None):
    now = now or timezone.now()
    queue = Tour.objects.filter(ai_status=Tour.AI_RUNNING, ai_claimed_at__isnull=True).order_by('ai_requested_at', 'id')
    for _ in range(5):
        with transaction.atomic():
            candidate = queue.select_for_update(skip_locked=True, of=('self',)).first()
            if candidate is None:
                return None
            won = Tour.objects.filter(pk=candidate.pk, ai_status=Tour.AI_RUNNING, ai_claimed_at__isnull=True,
                                      ai_run_id=candidate.ai_run_id).update(ai_claimed_at=now)
        if won:
            return Tour.objects.get(pk=candidate.pk)
    return None


def drain_once():
    """Bitta vazifani bajaradi: avval video (og'ir, foydalanuvchi kutmoqda), keyin AI. Qaytaradi: ({hisob}, bajarildimi)."""
    global _last_recover
    if time.monotonic() - _last_recover >= RECOVER_EVERY_S:      # har aylanishda emas: qotganlarni tekshirish arzon, lekin keraksiz
        _last_recover = time.monotonic()
        recover_stale_jobs()
    tour = claim_next_video()
    if tour is not None:
        ok = process_video(tour)
        return {'tour_ready' if ok else 'tour_failed': 1}, 1
    tour = claim_next_ai()
    if tour is not None:
        ok = ai.process_ai_job(tour)
        return {'tour_ai_done' if ok else 'tour_ai_failed': 1}, 1
    return {}, 0
