# FAZA 0 — TAYYORGARLIK

**Vazifalar:** V-001 … V-012 · **Muddat:** 3 kun
**Maqsad:** Django skeleti, `core/` yordamchi qatlam, test infratuzilmasi tayyor.

> ⚠️ Boshlashdan oldin `00_BOSHLASH/03_MUHIT_TAYYORLASH.md` bajarilgan bo'lishi kerak.

---

## V-001 — Loyiha skeleti va muhit
✅ `03_MUHIT_TAYYORLASH.md` da bajarilgan.
```bash
python3 ROADMAP/03_HOLAT/update_progress.py V-001 ok
```

---

## V-002 — Settings bo'lish (4 ta muhit)

**Fayllar:** `config/settings/{__init__,base,dev,prod,test}.py`

```bash
mkdir -p config/settings
rm -f config/settings.py
touch config/settings/__init__.py
```

**`config/settings/base.py`:**
```python
from pathlib import Path
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost', cast=Csv())
PUBLIC_DOMAIN = config('PUBLIC_DOMAIN', default='localhost:8060')
PLATFORM_DOMAINS = ['localhost', '127.0.0.1', 'armenu.uz', 'www.armenu.uz']

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # 3rd party
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    # local
    'core',
    'apps.tenants',
    'apps.accounts',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'core.middleware.RequestIDMiddleware',
    'core.middleware.TenantMiddleware',        # ⚡ V-005 da yoziladi
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': config('DB_NAME'),
    'USER': config('DB_USER'),
    'PASSWORD': config('DB_PASSWORD'),
    'HOST': config('DB_HOST', default='127.0.0.1'),
    'PORT': config('DB_PORT', default='5432'),
    'CONN_MAX_AGE': 60,
    'OPTIONS': {'connect_timeout': 5},
}}

REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/5')
CACHES = {'default': {
    'BACKEND': 'django_redis.cache.RedisCache',
    'LOCATION': REDIS_URL,
    'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
}}

CHANNEL_LAYERS = {'default': {
    'BACKEND': 'channels_redis.core.RedisChannelLayer',
    'CONFIG': {'hosts': [config('REDIS_CHANNEL_URL', default='redis://127.0.0.1:6379/6')]},
}}

# --- Til (3 ta) ---
LANGUAGE_CODE = 'uz'
LANGUAGES = [('uz', "O'zbek"), ('ru', 'Русский'), ('en', 'English')]
LOCALE_PATHS = [BASE_DIR / 'locale']
USE_I18N = True
USE_TZ = True
TIME_ZONE = 'Asia/Tashkent'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 50,
}

SPECTACULAR_SETTINGS = {'TITLE': 'ARMENU API', 'VERSION': '1.0.0'}

# --- AI kalitlari ---
AI_KEYS = {k: config(k, default='') for k in [
    'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY',
    'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'MESHY_API_KEY', 'TRIPO_API_KEY',
]}
AI_DAILY_LIMIT_PER_RESTAURANT = config('AI_DAILY_LIMIT_PER_RESTAURANT', default=2.0, cast=float)

# --- Biznes konstantalari ---
MAX_GLB_BYTES = 3 * 1024 * 1024
MAX_USDZ_BYTES = 5 * 1024 * 1024
ORDER_IDEMPOTENCY_TTL = 86400

LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'formatters': {'std': {'format': '[{levelname}] {asctime} {name} — {message}', 'style': '{'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'std'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
```

**`config/settings/dev.py`:**
```python
from .base import *
DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True
INSTALLED_APPS += []
```

**`config/settings/test.py`:**
```python
from .base import *
DEBUG = False
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
```

**`config/settings/prod.py`:**
```python
from .base import *
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

DEBUG = False
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if config('SENTRY_DSN', default=''):
    sentry_sdk.init(dsn=config('SENTRY_DSN'), integrations=[DjangoIntegration()],
                    traces_sample_rate=0.1, environment='production')
```

**`manage.py` va `config/{wsgi,asgi}.py` da:**
```python
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
```

✅ **Tekshirish:**
```bash
python manage.py check
# System check identified no issues
```

---

## V-003 — DB va Redis ulanishi

✅ `03_MUHIT_TAYYORLASH.md` §5-6 da bajarilgan.

```bash
python manage.py migrate
python manage.py createsuperuser
```

✅ **Tekshirish:** `python manage.py migrate --check` → xato yo'q

---

## V-004 — `core/models.py` — baza modellar

**Fayl:** `core/models.py`
```python
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimestampedModel):
    """
    ⚡ Restoran'ga bog'liq har bir model shundan meros oladi.
    Bu multi-tenant izolyatsiyaning asosi.
    """
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)

    class Meta:
        abstract = True
```

`core/__init__.py`, `core/apps.py` yaratiladi:
```python
# core/apps.py
from django.apps import AppConfig

class CoreConfig(AppConfig):
    name = 'core'
```

✅ **Tekshirish:** `python manage.py check`

---

## V-005 — ⚡ `core/middleware.py` (KRITIK)

**Fayl:** `core/middleware.py`
```python
import re, uuid, logging
from django.core.cache import cache

log = logging.getLogger('core.middleware')
SLUG_RE = re.compile(r'^/m/([\w-]+)/')


class RequestIDMiddleware:
    """Har so'rovga noyob ID — log va trace uchun"""
    def __init__(self, get_response): self.get_response = get_response

    def __call__(self, request):
        request.request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        response = self.get_response(request)
        response['X-Request-ID'] = request.request_id
        return response


class TenantMiddleware:
    """
    ⚡ Har so'rovda restaurant_id ni aniqlaydi.
    Multi-tenant xavfsizligining ASOSI.

    Aniqlash tartibi:
      1. Custom domen (menu.restoran.uz)
      2. URL slug (/m/registon/)
      3. QR token (/t/<uuid>)
      4. JWT ichidagi restaurant_id (xodim/admin)
    """
    def __init__(self, get_response): self.get_response = get_response

    def __call__(self, request):
        request.restaurant_id = None
        request.restaurant = None

        # 1. Custom domen
        from django.conf import settings
        host = request.get_host().split(':')[0]
        if host not in settings.PLATFORM_DOMAINS:
            r = self._by_domain(host)
            if r: self._set(request, r)

        # 2. URL slug
        if not request.restaurant_id:
            m = SLUG_RE.match(request.path)
            if m:
                r = self._by_slug(m.group(1))
                if r: self._set(request, r)

        return self.get_response(request)

    @staticmethod
    def _set(request, r):
        request.restaurant_id = r.id
        request.restaurant = r

    @staticmethod
    def _by_slug(slug):
        key = f'rest:slug:{slug}'
        r = cache.get(key)
        if r is None:
            from apps.tenants.models import Restaurant
            r = Restaurant.objects.filter(slug=slug, is_active=True).first()
            cache.set(key, r or False, 300)
        return r or None

    @staticmethod
    def _by_domain(domain):
        key = f'rest:domain:{domain}'
        r = cache.get(key)
        if r is None:
            from apps.tenants.models import Restaurant
            r = Restaurant.objects.filter(custom_domain=domain, is_active=True).first()
            cache.set(key, r or False, 300)
        return r or None
```

✅ **Tekshirish:** `python manage.py check` (Restaurant modeli hali yo'q — lazy import shuning uchun)

---

## V-006 — ⚡ `core/mixins.py`

**Fayl:** `core/mixins.py`
```python
from rest_framework.exceptions import PermissionDenied


class TenantScopedMixin:
    """
    ⚡ ViewSet'ga qo'shilsa — queryset avtomatik restaurant_id bo'yicha filtrlanadi.
    Har bir tenant ViewSet'da ISHLATILISHI SHART.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        rid = getattr(self.request, 'restaurant_id', None)
        if rid is None:
            raise PermissionDenied('Restoran aniqlanmadi')
        return qs.filter(restaurant_id=rid)

    def perform_create(self, serializer):
        serializer.save(restaurant_id=self.request.restaurant_id)


class SoftDeleteMixin:
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
```

---

## V-007 — `core/exceptions.py`

**Fayl:** `core/exceptions.py`
```python
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


class ARMenuError(APIException):
    """Baza xato — 3 tilda xabar"""
    code_name = 'ERROR'
    msg_uz = msg_ru = msg_en = ''
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, details=None):
        self.details = details or {}
        super().__init__(self.msg_uz)


class QRInvalid(ARMenuError):
    code_name = 'QR_INVALID'
    status_code = 404
    msg_uz = "QR kod yaroqsiz. Ofitsiantga murojaat qiling."
    msg_ru = "QR-код недействителен. Обратитесь к официанту."
    msg_en = "Invalid QR code. Please contact the waiter."


class RestaurantInactive(ARMenuError):
    code_name = 'RESTAURANT_INACTIVE'
    status_code = 403
    msg_uz = "Restoran vaqtincha xizmat ko'rsatmayapti"
    msg_ru = "Ресторан временно не обслуживает"
    msg_en = "Restaurant is temporarily unavailable"


class DishUnavailable(ARMenuError):
    code_name = 'DISH_UNAVAILABLE'
    status_code = 409
    msg_uz = "Bu taom hozir mavjud emas"
    msg_ru = "Это блюдо сейчас недоступно"
    msg_en = "This dish is currently unavailable"


class PriceChanged(ARMenuError):
    code_name = 'PRICE_CHANGED'
    status_code = 409
    msg_uz = "Narxlar yangilandi. Savatni tekshiring."
    msg_ru = "Цены обновлены. Проверьте корзину."
    msg_en = "Prices have changed. Please check your cart."


class InvalidTransition(ARMenuError):
    code_name = 'INVALID_TRANSITION'
    status_code = 409
    msg_uz = "Bu holat o'zgarishi mumkin emas"
    msg_ru = "Такое изменение статуса невозможно"
    msg_en = "This status transition is not allowed"


class PlanLimit(ARMenuError):
    code_name = 'PLAN_LIMIT'
    status_code = 402
    msg_uz = "Tarif limiti tugadi. Tarifni oshiring."
    msg_ru = "Лимит тарифа исчерпан. Повысьте тариф."
    msg_en = "Plan limit reached. Please upgrade."


class TenantMismatch(ARMenuError):
    code_name = 'TENANT_MISMATCH'
    status_code = 403
    msg_uz = "Ruxsat yo'q"
    msg_ru = "Доступ запрещён"
    msg_en = "Access denied"


class ServiceUnavailable(ARMenuError):
    code_name = 'SERVICE_UNAVAILABLE'
    status_code = 503
    msg_uz = "Xizmat vaqtincha ishlamayapti"
    msg_ru = "Сервис временно недоступен"
    msg_en = "Service temporarily unavailable"


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get('request')
    lang = getattr(request, 'lang', 'uz') if request else 'uz'

    if isinstance(exc, ARMenuError):
        return _build(exc, lang, request)

    if response is not None:
        response.data = {'error': {
            'code': 'VALIDATION_ERROR',
            f'message_{lang}': str(response.data),
            'details': response.data,
            'trace_id': getattr(request, 'request_id', ''),
        }}
    return response


def _build(exc, lang, request):
    from rest_framework.response import Response
    return Response({'error': {
        'code': exc.code_name,
        'message_uz': exc.msg_uz,
        'message_ru': exc.msg_ru,
        'message_en': exc.msg_en,
        'message': getattr(exc, f'msg_{lang}', exc.msg_uz),
        'details': exc.details,
        'trace_id': getattr(request, 'request_id', ''),
    }}, status=exc.status_code)
```

✅ **Test:** `tests/test_exceptions.py`
```python
def test_error_has_three_languages():
    from core.exceptions import DishUnavailable
    e = DishUnavailable()
    assert e.msg_uz and e.msg_ru and e.msg_en
```

---

## V-008 — `core/resilience.py` (circuit breaker)

**Fayl:** `core/resilience.py`
```python
import time, random, logging, functools
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
    def _k(self): return f'cb:{self.name}'

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
                self._set('state', 'closed'); self._set('failures', 0)
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
            if fallback is not None: return fallback()
            from core.exceptions import ServiceUnavailable
            raise ServiceUnavailable({'service': self.name})
        try:
            result = fn(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            log.warning(f'[CB] {self.name} xato: {e}')
            if fallback is not None: return fallback()
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
                    if attempt == times - 1: raise
                    sleep = d * (1 + random.uniform(-jitter, jitter))
                    log.warning(f'[retry] {fn.__name__} urinish {attempt+1}/{times}: {e}')
                    time.sleep(sleep)
                    d *= backoff
        return wrapper
    return deco
```

✅ **Test:** `tests/test_resilience.py`
```python
def test_circuit_opens_after_threshold():
    cb = CircuitBreaker('t1', fail_threshold=3, timeout=60)
    for _ in range(3): cb.on_failure()
    assert cb.is_open()

def test_fallback_used_when_open():
    cb = CircuitBreaker('t2', fail_threshold=1)
    cb.on_failure()
    assert cb.call(lambda: 1/0, fallback=lambda: 'fb') == 'fb'
```

---

## V-009 — `core/queue.py` (Redis navbat)

**Fayl:** `core/queue.py`
```python
import json, time, logging
import redis
from django.conf import settings

log = logging.getLogger('core.queue')
_pool = None

QUEUES = ['model3d', 'fiscal', 'notify', 'ai', 'analytics']


def get_redis():
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
    return redis.Redis(connection_pool=_pool)


def enqueue(queue: str, job_type: str, delay: int = 0, **payload) -> int:
    """Vazifani navbatga qo'yadi. Job DB'da, ID Redis'da."""
    assert queue in QUEUES, f'Noma\'lum navbat: {queue}'
    from core.models_job import Job
    job = Job.objects.create(queue=queue, type=job_type, payload=payload, status='queued')
    r = get_redis()
    if delay:
        r.zadd(f'q:{queue}:delayed', {str(job.id): time.time() + delay})
    else:
        r.lpush(f'q:{queue}', str(job.id))
    log.info(f'[queue] {queue}/{job_type} → job#{job.id}')
    return job.id


def dequeue(queue: str, timeout: int = 5):
    """Worker chaqiradi. Kechiktirilganlarni ham tekshiradi."""
    r = get_redis()
    now = time.time()
    ready = r.zrangebyscore(f'q:{queue}:delayed', 0, now, start=0, num=10)
    for jid in ready:
        r.zrem(f'q:{queue}:delayed', jid)
        r.lpush(f'q:{queue}', jid)

    res = r.brpop(f'q:{queue}', timeout=timeout)
    return int(res[1]) if res else None


def queue_depth(queue: str) -> int:
    r = get_redis()
    return r.llen(f'q:{queue}') + r.zcard(f'q:{queue}:delayed')
```

**Fayl:** `core/models_job.py`
```python
from django.db import models
from core.models import TimestampedModel


class Job(TimestampedModel):
    STATUS = [('queued','Navbatda'), ('running','Bajarilmoqda'),
              ('done','Tugadi'), ('failed','Xato')]
    queue        = models.CharField(max_length=30, db_index=True)
    type         = models.CharField(max_length=60)
    payload      = models.JSONField(default=dict)
    status       = models.CharField(max_length=20, choices=STATUS, default='queued', db_index=True)
    attempts     = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=3)
    heartbeat_at = models.DateTimeField(null=True, blank=True, db_index=True)
    result       = models.JSONField(default=dict, blank=True)
    error        = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=['queue', 'status', 'created_at'])]
```

`core/models.py` oxiriga: `from core.models_job import Job  # noqa`

✅ **Tekshirish:**
```bash
python manage.py makemigrations core && python manage.py migrate
python manage.py shell -c "from core.queue import get_redis; print(get_redis().ping())"
```

---

## V-010 — `core/ws.py` (WebSocket yordamchi)

**Fayl:** `core/ws.py`
```python
import logging
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache

log = logging.getLogger('core.ws')


def next_seq(group: str) -> int:
    """Har guruh uchun o'suvchi raqam — klient dublikatni aniqlaydi"""
    try:
        return cache.incr(f'ws:seq:{group}')
    except ValueError:
        cache.set(f'ws:seq:{group}', 1, None)
        return 1


def ws_send(group: str, msg_type: str, data: dict):
    """
    ⚡ Guruh nomi DOIM restoran-scoped bo'lishi kerak:
       rest_<id>_kds, rest_<id>_waiters, rest_<id>_admin, guest_<session>
    """
    layer = get_channel_layer()
    if layer is None:
        log.warning('[ws] channel layer yo\'q'); return
    try:
        async_to_sync(layer.group_send)(group, {
            'type': 'broadcast',
            'message': {
                'type': msg_type,
                'ts': timezone.now().isoformat(),
                'data': data,
                'seq': next_seq(group),
            }})
    except Exception as e:
        log.error(f'[ws] {group}/{msg_type} yuborilmadi: {e}')


def g_kds(rid):     return f'rest_{rid}_kds'
def g_waiters(rid): return f'rest_{rid}_waiters'
def g_admin(rid):   return f'rest_{rid}_admin'
def g_cashier(rid): return f'rest_{rid}_cashier'
def g_guest(sid):   return f'guest_{sid}'
```

---

## V-011 — `core/cache.py` + `core/pagination.py`

**Fayl:** `core/cache.py`
```python
from django.core.cache import cache
from django.db.models import F


def menu_key(slug, lang, version):
    return f'menu:{slug}:{lang}:v{version}'


def bump_menu_version(restaurant_id):
    """⚡ Menyu o'zgarganda chaqiriladi — barcha kesh kaliti eskiradi"""
    from apps.tenants.models import Restaurant
    Restaurant.objects.filter(id=restaurant_id).update(menu_version=F('menu_version') + 1)
    r = Restaurant.objects.only('slug').get(id=restaurant_id)
    cache.delete(f'rest:slug:{r.slug}')


def cached(key_fn, ttl=60):
    """Dekorator: natijani keshlaydi"""
    def deco(fn):
        def wrapper(*a, **kw):
            k = key_fn(*a, **kw)
            v = cache.get(k)
            if v is None:
                v = fn(*a, **kw)
                cache.set(k, v, ttl)
            return v
        return wrapper
    return deco
```

**Fayl:** `core/pagination.py`
```python
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
```

---

## V-012 — `tests/conftest.py` (test fixture'lar)

**Fayl:** `tests/conftest.py`
```python
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def restaurant(db):
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(
        slug='test-rest', name='Test Restoran', phone='998901234567',
        city='Toshkent', plan='pro', is_active=True)


@pytest.fixture
def restaurant2(db):
    """⚡ Cross-tenant testlar uchun IKKINCHI restoran"""
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(
        slug='test-rest-2', name='Ikkinchi Restoran', phone='998901234568',
        city='Samarqand', plan='start', is_active=True)
```

**Fayl:** `tests/__init__.py` (bo'sh)

✅ **Tekshirish:**
```bash
pytest tests/ -q
# xato yo'q (hali test kam)
```

---

# ✅ FAZA 0 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check          → xato yo'q
[ ] python manage.py migrate        → o'tadi
[ ] pytest tests/ -q                → o'tadi
[ ] redis-cli -n 5 PING             → PONG
[ ] core/ ichida 8 ta fayl bor
[ ] git log --oneline | wc -l       → 12 ta commit
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 0 tugadi: core qatlam tayyor"
python3 ROADMAP/03_HOLAT/update_progress.py V-012 ok "FAZA 0 tugadi"
```

**➡️ Keyingi:** `FAZA_01_TENANT_AUTH.md`
