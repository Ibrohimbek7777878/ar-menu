import time
import random
import logging
import functools
from django.core.cache import cache

log = logging.getLogger('core.resilience')


class CircuitBreaker:
    """
    3 holat: CLOSED (normal) → OPEN (yiqilgan) → HALF_OPEN (sinov)
    """
    def __init__(self, name, fail_threshold=5, timeout=60, success_threshold=2):
        self.name = name
        self.fail_threshold = fail_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold

    @property
    def _k(self):
        return f'cb:{self.name}'

    def _get(self, field, default=0):
        return cache.get(f'{self._k}:{field}', default)

    def _set(self, field, value, ttl=3600):
        cache.set(f'{self._k}:{field}', value, ttl)

    def is_open(self):
        state = self._get('state', 'closed')
        if state != 'open':
            return False
        if time.time() - self._get('opened_at', 0) > self.timeout:
            self._set('state', 'half_open')
            log.info(f'[CB] {self.name}: OPEN → HALF_OPEN')
            return False
        return True

    def on_success(self):
        state = self._get('state', 'closed')
        if state == 'half_open':
            s = self._get('half_success', 0) + 1
            self._set('half_success', s)
            if s >= self.success_threshold:
                self._set('state', 'closed')
                self._set('failures', 0)
                self._set('half_success', 0)
                log.info(f'[CB] {self.name}: HALF_OPEN → CLOSED ✅')
        else:
            self._set('failures', 0)

    def on_failure(self):
        f = self._get('failures', 0) + 1
        self._set('failures', f)
        if f >= self.fail_threshold:
            self._set('state', 'open')
            self._set('opened_at', time.time())
            log.warning(f'[CB] {self.name}: → OPEN ({f} xato) ⛔')

    def call(self, fn, *args, fallback=None, **kwargs):
        if self.is_open():
            log.warning(f'[CB] {self.name} OPEN — so\'rov yuborilmadi')
            if fallback is not None:
                return fallback()
            from core.exceptions import ServiceUnavailable
            raise ServiceUnavailable({'service': self.name})
        try:
            result = fn(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            log.warning(f'[CB] {self.name} xato: {e}')
            if fallback is not None:
                return fallback()
            raise


def retry(times=3, delay=0.5, backoff=2, jitter=0.3, exceptions=(Exception,)):
    """Dekorator: eksponensial kechikish bilan qayta urinish"""
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            d = delay
            for attempt in range(times):
                try:
                    return fn(*a, **kw)
                except exceptions as e:
                    if attempt == times - 1:
                        raise
                    sleep = d * (1 + random.uniform(-jitter, jitter))
                    log.warning(f'[retry] {fn.__name__} urinish {attempt+1}/{times}: {e}')
                    time.sleep(sleep)
                    d *= backoff
        return wrapper
    return deco
