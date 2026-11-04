"""
Video sayr chegaralari (TZ_MULTITENANT_BRON_BREND_VIDEO_TUR, Bosqich 3-4 shartnomasi).

Hamma qiymat `settings.TOUR_*` orqali o'zgartiriladi (kodsiz, env/sozlama): standartlar shartnomadagi raqamlar. Funksiya
ko'rinishida, chunki testlar `override_settings` bilan kichik chegara beradi.

Muhim: `backend.upload_validation.UploadValidationMiddleware` multipart yuklashni `settings.UPLOAD_MAX_VIDEO_MB` (standart 50 MB)
bilan VIEW'DAN OLDIN cheklaydi. Bu yerdagi `max_source_mb` (300) undan oshmaydi: samarali chegara - ikkalasining kichigi.
"""
from django.conf import settings


def _num(name, default, cast=int, minimum=None):
    try:
        value = cast(getattr(settings, name, default))
    except (TypeError, ValueError):
        value = default
    if minimum is not None and value < minimum:
        return default
    return value


def max_source_mb():
    return _num('TOUR_MAX_SOURCE_MB', 300, float, 0.001)


def max_source_bytes():
    return int(max_source_mb() * 1024 * 1024)


def max_duration_s():
    return _num('TOUR_MAX_DURATION_S', 300, float, 1)


def min_duration_s():
    return _num('TOUR_MIN_DURATION_S', 1.0, float, 0.1)


def max_dimension():
    return _num('TOUR_MAX_DIMENSION', 3840, int, 64)


def min_dimension():
    return _num('TOUR_MIN_DIMENSION', 64, int, 16)


def quota_bytes():
    return int(_num('TOUR_TENANT_QUOTA_MB', 1024, float, 0.001) * 1024 * 1024)


def max_stops():
    return _num('TOUR_MAX_STOPS', 60, int, 1)


def max_hotspots():
    return _num('TOUR_MAX_HOTSPOTS', 200, int, 1)


def max_tours_per_shop():
    """Arxivlanmagan sayrlar soni (qoralamalar bilan diskni to'ldirib qo'ymaslik uchun)."""
    return _num('TOUR_MAX_TOURS_PER_SHOP', 30, int, 1)


def probe_timeout_s():
    return _num('TOUR_PROBE_TIMEOUT_S', 30, int, 5)


def processing_timeout_s():
    """`processing` da shu muddatdan ortiq qotgan (ishchi o'lgan) vazifa qayta navbatga qo'yiladi / `failed` qilinadi."""
    return _num('TOUR_PROCESSING_TIMEOUT_S', 3600, int, 30)


def max_attempts():
    return _num('TOUR_MAX_ATTEMPTS', 2, int, 1)


def encode_timeout_s(duration_s):
    """Bitta ffmpeg chaqiruvi uchun muddat: video uzunligiga mutanosib (sekin server ham ulgursin), lekin cheksiz emas."""
    cap = _num('TOUR_ENCODE_TIMEOUT_MAX_S', 900, int, 30)
    return int(min(cap, max(120, float(duration_s or 0) * 8)))


def tmp_dir():
    """Yuklangan faylni tekshirish uchun vaqtinchalik papka (MEDIA_ROOT'DAN TASHQARIDA: media ochiq beriladi)."""
    import os
    explicit = getattr(settings, 'TOUR_TMP_DIR', '')
    if explicit:
        return str(explicit)
    base = os.environ.get('CACHE_DIR') or str(settings.BASE_DIR / 'cache')
    return os.path.join(base, 'tour_tmp')


# ── AI ──
def ai_daily_limit():
    return _num('TOUR_AI_DAILY_LIMIT', 10, int, 1)


def ai_max_frames():
    return min(40, _num('TOUR_AI_MAX_FRAMES', 40, int, 1))


def ai_batch_frames():
    return _num('TOUR_AI_BATCH_FRAMES', 4, int, 1)


def ai_budget_s():
    """Bitta AI vazifasining umumiy muddati (soniya)."""
    return _num('TOUR_AI_BUDGET_S', 240, int, 20)


def ai_stale_s():
    return _num('TOUR_AI_STALE_S', 900, int, 60)
