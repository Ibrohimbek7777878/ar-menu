"""
Mahalliy (Toshkent) kun yordamchilari (TZ: R-FIN-06).

settings.TIME_ZONE='Asia/Tashkent', USE_TZ=True. Lekin `timezone.now().date()` va
`timezone.now().replace(hour=0)` UTC bo'yicha ishlaydi — Toshkentda kun soat 05:00 da almashardi:
05:00 gacha bo'lgan savdo "kecha"ga yozilar va kunlik hisobot noto'g'ri chiqardi.
"""
from django.utils import timezone


def local_today():
    """Toshkent bo'yicha bugungi sana."""
    return timezone.localdate()


def local_day_start():
    """Toshkent bo'yicha bugungi kun boshlanishi (00:00, timezone-aware)."""
    return timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
