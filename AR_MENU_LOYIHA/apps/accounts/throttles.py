"""
⚡ Ikki qatlamli himoya:
  1. IP bo'yicha throttle (DRF) — 20 urinish / 15 daqiqa
  2. Xodim bo'yicha blok (DB) — 5 xato PIN → 15 daqiqa blok
"""
import logging
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from rest_framework.throttling import SimpleRateThrottle

log = logging.getLogger('accounts.throttle')

MAX_FAILS = 5
BLOCK_MIN = 15
FAIL_WINDOW = 15 * 60


class LoginRateLimit(SimpleRateThrottle):
    """IP + slug bo'yicha: 20 urinish / 15 daqiqa"""
    scope = 'login'
    rate = '20/15m'

    def get_cache_key(self, request, view):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')
        slug = (request.data or {}).get('slug', '-')
        return f'throttle:login:{ip}:{slug}'

    def parse_rate(self, rate):
        # DRF '15m' ni tushunmaydi — o'zimiz beramiz
        return (20, 15 * 60)


def register_fail(restaurant_id: int, pin_attempt_key: str, staff=None):
    """
    Xato urinishni yozadi. 5 ta bo'lsa → staff bloklanadi.
    staff=None bo'lsa (PIN topilmadi) — faqat IP kesh hisoblagichi oshadi.
    """
    key = f'loginfail:{restaurant_id}:{pin_attempt_key}'
    try:
        n = cache.incr(key)
    except ValueError:
        cache.set(key, 1, FAIL_WINDOW)
        n = 1

    if staff is not None:
        staff.failed_attempts = (staff.failed_attempts or 0) + 1
        fields = ['failed_attempts', 'updated_at']
        if staff.failed_attempts >= MAX_FAILS:
            staff.blocked_until = timezone.now() + timedelta(minutes=BLOCK_MIN)
            fields.append('blocked_until')
            log.warning(f'[login] staff#{staff.id} BLOKLANDI {BLOCK_MIN} daq ⛔')
        staff.save(update_fields=fields)
    return n


def is_ip_blocked(restaurant_id: int, ip: str) -> bool:
    return (cache.get(f'loginfail:{restaurant_id}:{ip}') or 0) >= MAX_FAILS * 4


def clear_fails(restaurant_id: int, key: str):
    cache.delete(f'loginfail:{restaurant_id}:{key}')
