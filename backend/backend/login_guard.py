"""
Xodim loginlarini brute-force'dan himoyalash (TZ: R2-5).

Avval har login sahifasida faqat IP bo'yicha sanagich bor edi (7 xato → 5 daqiqa blok):
  • restoran Wi-Fi'si bitta umumiy IP — bitta xodimning xatolari butun jamoani bloklardi;
  • bitta login'ga turli IP'lardan urinish hisoblanmasdi;
  • muvaffaqiyatsiz urinishlar auditda yo'q edi, DRF/JWT login'da sanagich umuman yo'q edi.

Endi ikki sanagich: IP bo'yicha (kengroq chegara) va login bo'yicha (bitta hisobni ko'p urinish). Har xato va blok
AuditLog'ga ('security') yoziladi; parol hech qachon yozilmaydi.
"""
import hashlib
import logging

from django.core.cache import cache

from backend.ratelimit import client_ip

logger = logging.getLogger(__name__)

IP_LIMIT, IP_WINDOW = 20, 300          # bitta IP: 5 daqiqada 20 xato
USER_LIMIT, USER_WINDOW = 8, 900       # bitta login: 15 daqiqada 8 xato

LOCK_MESSAGE = "Xavfsizlik: ko'p marotaba xato urinish bo'ldi. Iltimos, bir necha daqiqadan so'ng qayta urinib ko'ring."


def _key(kind, value):
    return f"loginguard:{kind}:{hashlib.sha256(str(value).lower().encode()).hexdigest()[:32]}"


def _count(key):
    return cache.get(key, 0)


def _incr(key, window):
    if cache.add(key, 1, timeout=window):
        return 1
    try:
        return cache.incr(key)
    except ValueError:                        # kalit ayni paytda tugagan
        cache.set(key, 1, timeout=window)
        return 1


def is_locked(request, username=''):
    """Shu IP yoki shu login uchun urinishlar chegarasi oshganmi."""
    if _count(_key('ip', client_ip(request))) >= IP_LIMIT:
        return True
    return bool(username) and _count(_key('user', username)) >= USER_LIMIT


def record_failure(request, username='', scope='staff'):
    ip_attempts = _incr(_key('ip', client_ip(request)), IP_WINDOW)
    user_attempts = _incr(_key('user', username), USER_WINDOW) if username else 0
    _audit(request, 'login_failed', username, scope, ip_attempts=ip_attempts, user_attempts=user_attempts)
    if ip_attempts == IP_LIMIT or user_attempts == USER_LIMIT:
        _audit(request, 'login_locked', username, scope, ip_attempts=ip_attempts, user_attempts=user_attempts)
        logger.warning('[LoginGuard] bloklandi: scope=%s user=%r ip_attempts=%s user_attempts=%s',
                       scope, username[:60], ip_attempts, user_attempts)


def record_success(request, username='', user=None, scope='staff'):
    if username:
        cache.delete(_key('user', username))
    _audit(request, 'login', username, scope, actor=user)


def _audit(request, event, username, scope, actor=None, **extra):
    try:
        from orders.audit import log_audit
        action = 'login' if event == 'login' else 'security'
        log_audit(action, request=request, actor=actor, target_type='login',
                  new_value={'event': event, 'username': str(username)[:60], 'scope': scope, **extra})
    except Exception:
        logger.exception('[LoginGuard] audit yozilmadi')
