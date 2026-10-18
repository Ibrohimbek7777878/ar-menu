"""
Taom rasmi → 3D model navbati.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (3–6-qadamlar)

Oqim: admin taom rasmini yuklaydi → Product3DModel.status='queued' → fon ishchisi
(`python manage.py run_3d_worker`) navbatdan oladi → provayder GLB yasaydi →
media/ar/generated/ ga saqlanadi → Product.ar_model shu faylga qaraydi → menyuda 3D ko'rinadi.

Redis/Celery shart emas: navbat bazada. Generatsiya so'rov ichida bajarilmaydi — server qotmaydi.
"""
import logging
import os
import uuid

from django.conf import settings
from django.utils import timezone

from ar3d.image_to_3d import Image3DError, get_provider
from ar3d.models import Product3DModel

logger = logging.getLogger(__name__)

GENERATED_DIR = 'ar/generated'
MAX_GLB_BYTES = 2 * 1024 * 1024   # telefonda tez ochilishi uchun (TZ qabul mezoni)


def auto_generate_enabled() -> bool:
    return bool(getattr(settings, 'RESTAURANT_3D_AUTO_GENERATE', True))


def queue_3d_generation(product, force=False):
    """Taomni 3D navbatiga qo'yish. Rasm bo'lmasa — hech narsa qilinmaydi."""
    if not getattr(product, 'image', None):
        return None
    job, _ = Product3DModel.objects.get_or_create(product=product)
    if job.status in ('queued', 'processing') and not force:
        return job
    job.status = 'queued'
    job.error_msg = ''
    job.save(update_fields=['status', 'error_msg'])
    return job


def on_product_image_saved(product):
    """Admin taomga yangi rasm yuklaganda chaqiriladi (avtomatik generatsiya sozlamasi yoqiq bo'lsa)."""
    if auto_generate_enabled():
        return queue_3d_generation(product, force=True)
    return None


def recover_stale_jobs() -> int:
    """Ishchi to'xtab qolganda 'processing'da qolgan vazifalarni qayta navbatga qaytarish."""
    return Product3DModel.objects.filter(status='processing').update(status='queued')


def claim_next_job():
    """Navbatdagi vazifani olish (atomik: ikki ishchi bitta vazifani olmaydi)."""
    for job_id in Product3DModel.objects.filter(status='queued').order_by('id').values_list('id', flat=True)[:10]:
        if Product3DModel.objects.filter(pk=job_id, status='queued').update(status='processing') == 1:
            return Product3DModel.objects.select_related('product').get(pk=job_id)
    return None


def _media_url(rel_path: str) -> str:
    return '/' + settings.MEDIA_URL.strip('/') + '/' + rel_path


def process_job(job) -> bool:
    """Bitta vazifani bajarish. Muvaffaqiyat — True; xato sababi job.error_msg da."""
    product = job.product
    tmp_path = None
    try:
        if not product.image:
            raise Image3DError("Taomning rasmi yo'q")
        image_path = product.image.path
        if not os.path.exists(image_path):
            raise Image3DError("Rasm fayli diskda topilmadi")

        provider = get_provider()
        rel_path = f"{GENERATED_DIR}/{product.pk}-{uuid.uuid4().hex[:10]}.glb"
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        tmp_path = abs_path + '.tmp'

        provider.generate(image_path, tmp_path)
        size = os.path.getsize(tmp_path)
        if size > MAX_GLB_BYTES:
            raise Image3DError(f"3D model juda katta ({size // 1024} KB > {MAX_GLB_BYTES // 1024} KB)")
        os.replace(tmp_path, abs_path)
        tmp_path = None

        product.ar_model = _media_url(rel_path)
        product.has_3d = True
        product.save(update_fields=['ar_model', 'has_3d'])

        job.glb.name = rel_path
        job.library = None
        job.status = 'ready'
        job.source = provider.name
        job.error_msg = ''
        job.ready_at = timezone.now()
        job.save(update_fields=['glb', 'library', 'status', 'source', 'error_msg', 'ready_at'])
        logger.info("3D tayyor: %s (%s, %d KB)", product.name, provider.name, size // 1024)
        return True
    except Exception as exc:
        message = str(exc) if isinstance(exc, Image3DError) else f"Kutilmagan xato: {exc}"
        logger.warning("3D yaratilmadi (%s): %s", product.name, message, exc_info=not isinstance(exc, Image3DError))
        job.status = 'failed'
        job.error_msg = message[:500]
        job.save(update_fields=['status', 'error_msg'])
        return False
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def process_queue(limit=None) -> int:
    """Navbatdagi barcha (yoki limit) vazifalarni bajarish. Bajarilganlar soni qaytadi."""
    done = 0
    while limit is None or done < limit:
        job = claim_next_job()
        if not job:
            break
        process_job(job)
        done += 1
    return done
