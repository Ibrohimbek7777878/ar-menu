"""
Django settings for backend project.
Online Store Guliston — Local Commerce OS
"""

import os
import sys
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    # backend/.env yoki asosiy papkadagi .env ni yuklash. DJANGO_SKIP_DOTENV=1 — faqat jarayon muhitidan o'qish
    # (CI, konteyner va production sozlamalarini tekshiruvchi testlar uchun).
    if os.environ.get('DJANGO_SKIP_DOTENV') != '1':
        load_dotenv(BASE_DIR / '.env', override=True)
        load_dotenv(BASE_DIR.parent / '.env', override=False)
except Exception:
    pass

def _env_bool(name, default=False):
    raw = os.environ.get(name)
    return default if raw is None else raw.strip().lower() in ('1', 'true', 'yes', 'on')


def _env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


# `manage.py test` ishlayaptimi (testlar production qoidalariga emas, test muhitiga bo'ysunadi)
RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == 'test'

# ─── Xavfsizlik (TZ R1-1…R1-3) ─────────────────────────────────────────────────────────────────────
# DEBUG standarti FALSE: .env bo'lmasa yoki unutilsa server xavfsiz holatda ishga tushadi
# (avval standart True edi — xato sahifalarida kod va sozlamalar ochilib ketardi).
DEBUG = _env_bool('DEBUG', False)

# Faqat lokal ishlash uchun belgilangan kalit. Avval kodda git tarixiga tushgan HAQIQIY kalit turardi.
DEV_ONLY_SECRET_KEY = 'dev-only-insecure-key-never-use-this-on-a-public-server-0123456789'
_env_secret = os.environ.get('DJANGO_SECRET_KEY', '').strip() or os.environ.get('SECRET_KEY', '').strip()
if _env_secret:
    SECRET_KEY = _env_secret
elif DEBUG or RUNNING_TESTS:
    SECRET_KEY = DEV_ONLY_SECRET_KEY
else:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY o'rnatilmagan. Production'da kalit majburiy. Yaratish: "
        "python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
if not DEBUG and not RUNNING_TESTS and (
    len(SECRET_KEY) < 50 or SECRET_KEY.startswith('django-insecure-') or SECRET_KEY == DEV_ONLY_SECRET_KEY
):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY zaif yoki ochiq: kamida 50 belgi, 'django-insecure-' bilan boshlanmasin.")

ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver')
if not DEBUG and not RUNNING_TESTS and ('*' in ALLOWED_HOSTS or not ALLOWED_HOSTS):
    raise ImproperlyConfigured("Production'da ALLOWED_HOSTS aniq domen bo'lishi kerak ('*' mumkin emas).")

# Django Admin (/djangoadmin/) — production restoran serverida xavfsizlik uchun o'chiriladi (TZ 0.3)
DJANGO_ADMIN_ENABLED = _env_bool('DJANGO_ADMIN_ENABLED', default=(DEBUG or RUNNING_TESTS))


# CSRF Trusted Origins: lokal rejimda localhost, production'da faqat .env dagi aniq manzillar
CSRF_TRUSTED_ORIGINS = _env_list(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:8000,http://127.0.0.1:8000,http://0.0.0.0:8000' if (DEBUG or RUNNING_TESTS) else '',
)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Local apps
    'accounts',
    'categories',
    'shops',
    'products',
    'orders',
    'couriers',
    'notifications',
    'payments',
    'maps',
    'web',
    'api',
    'ai',
    'ar3d',
    'tables_restaurant',
    'finance',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'backend.middleware.MultiProductHostPortMiddleware',
    'backend.legacy_gate.LegacyApiGateMiddleware',   # MultiProduct'dan keyin: product_code shu yerda o'rnatiladi
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'backend.upload_validation.UploadValidationMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.SellerTenantMiddleware',
    'backend.middleware.LanguageMiddleware',
    'backend.security_middleware.SecurityHeadersMiddleware',
    'backend.middleware.RestaurantStaffRBACMiddleware',
]

# 3 Ta Mustaqil Mahsulot uchun maxsus portlar
PORT_RESTAURANT = int(os.environ.get('PORT_RESTAURANT', 8001))
PORT_MARKET = int(os.environ.get('PORT_MARKET', 8002))
PORT_STUDIO = int(os.environ.get('PORT_STUDIO', 8003))

# OWASP Session and Cookie Security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG and not RUNNING_TESTS:
    # HTTPS orqali ishlayotgan server uchun (TZ R1-3). TLS'ni nginx/Cloudflare tugatsa SECURE_BEHIND_PROXY=True bering.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', True)
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', False)
    SECURE_HSTS_PRELOAD = False
    # Ataylab yoqilmagan ikki tavsiya: preload brauzer ro'yxatiga QAYTARIB BO'LMAYDIGAN qo'shadi; subdomenlarni
    # qamrash esa hamma subdomen HTTPS ekanini bilgandagina xavfsiz. Egasi domen tayyor bo'lgach yoqadi (R9).
    SILENCED_SYSTEM_CHECKS = ['security.W005', 'security.W021']
    SECURE_CONTENT_TYPE_NOSNIFF = True
    if _env_bool('SECURE_BEHIND_PROXY', False):
        SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Ishonchli proxy'lar soni (nginx/Cloudflare = 1). 0 bo'lsa X-Forwarded-For e'tiborga olinmaydi (soxtalashtirish mumkin).
TRUSTED_PROXY_COUNT = int(os.environ.get('TRUSTED_PROXY_COUNT', 0))

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'web.context_processors.site_context',
                'backend.context_processors.translations_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Demo rejim: mock ma'lumotlar, demo to'lov, "Muhayyo Karimova" kabi namuna bronlar.
# Production'da DOIM False. Hech narsa o'chirilmaydi — faqat shu flag ortiga yashiriladi (AGENTS.md 4-qoida).
DEMO_MODE = os.environ.get('DEMO_MODE', 'False').lower() == 'true'

# Restoran mahsulotida eski bozor/studiya/ar3d API'lari yopiq (404/405); kod saqlanadi, bu bayroq bilan qaytadi.
# Qarang: backend/legacy_gate.py, TZ_SOTUVGA_TAYYORLASH P0-1.
LEGACY_API_ENABLED = _env_bool('LEGACY_API_ENABLED', False)

# `/health/` ning to'liq (tafsilotli) javobi uchun X-Health-Token sarlavhasi; bo'sh bo'lsa faqat rahbariyat sessiyasi ko'radi.
HEALTH_TOKEN = os.environ.get('HEALTH_TOKEN', '')
# Faqat mock to'lov sahifalari (DEMO_MODE'siz). Production'da False.
ALLOW_MOCK_PAYMENTS = os.environ.get('ALLOW_MOCK_PAYMENTS', 'False').lower() == 'true'

# Stolni oddiy raqam (?table=5, qo'lda kiritish, stol ID) bilan tanlash taxmin qilinadi: begona stolga buyurtma/chaqiruv
# yuborish mumkin. Production'da stol faqat QR'dagi tasodifiy token (/t/<uuid>/) orqali aniqlanadi. Raqam bilan kirish
# faqat DEMO_MODE'da yoki shu flag aniq yoqilganda ishlaydi (TZ R1-10; funksiya o'chirilmagan — flag ortiga yashirilgan).
RESTAURANT_ALLOW_TABLE_NUMBER_URL = _env_bool('RESTAURANT_ALLOW_TABLE_NUMBER_URL', DEMO_MODE)
# Bitta buyurtmadagi qatorlar soni chegarasi (anonim 3000 qatorli so'rov serverni 4+ soniya band qilardi)
RESTAURANT_MAX_ORDER_LINES = int(os.environ.get('RESTAURANT_MAX_ORDER_LINES', '50'))
# Bitta stolda ochiq (yetkazilmagan, bekor qilinmagan) buyurtmalar chegarasi: QR'ni olgan begona stolni buyurtmalar bilan to'ldirmasin
RESTAURANT_MAX_OPEN_ORDERS_PER_TABLE = int(os.environ.get('RESTAURANT_MAX_OPEN_ORDERS_PER_TABLE', '10'))
# QR skanerlangandan keyin stolga bog'lanish necha soniya amal qiladi (0 = cheksiz). Uyga ketgan mehmon ertasi kuni ham shu stolga yozmasin.
RESTAURANT_TABLE_BINDING_TTL_SECONDS = int(os.environ.get('RESTAURANT_TABLE_BINDING_TTL_SECONDS', str(4 * 3600)))
# Restoran ish vaqtidan tashqari buyurtma qabul qilinmasin. Har restoran `business_profile.enforce_working_hours` bilan o'zgartiradi.
# Testlarda o'chiq: aks holda testlar kunning vaqtiga qarab o'tadi yoki yiqiladi (ish vaqti tekshiruvi o'z testlarida yoqiladi).
RESTAURANT_ENFORCE_WORKING_HOURS = _env_bool('RESTAURANT_ENFORCE_WORKING_HOURS', not (len(sys.argv) > 1 and sys.argv[1] == 'test'))
# Mehmon menyusida taomga "Yangi" belgisi: oxirgi N kun (0 = o'chiq). Menyu endi yaratilgan bo'lsa belgi qo'yilmaydi (web/guest_dish.py)
RESTAURANT_NEW_DISH_DAYS = int(os.environ.get('RESTAURANT_NEW_DISH_DAYS', 14))
# Onlayn to'lov (Click/Payme/karta) yoqilganmi. Standart o'chiq: hozir faqat naqd / stolda to'lash haqiqiy ishlaydi.
RESTAURANT_ONLINE_PAYMENT_ENABLED = _env_bool('RESTAURANT_ONLINE_PAYMENT_ENABLED', False)
# Mehmon sahifalari dizayni: 'new' (yangi) yoki 'classic' (eski). Admin paneldan (AppSetting `guest_design`) ham almashtiriladi.
GUEST_DESIGN = os.environ.get('GUEST_DESIGN', 'new').strip().lower()
# Bosma QR kodlar ko'rsatadigan domen (masalan https://menu.example.uz). Bo'sh bo'lsa — xodim ochgan sayt domeni.
RESTAURANT_PUBLIC_URL = os.environ.get('RESTAURANT_PUBLIC_URL', '').strip().rstrip('/')

# Restoran xizmat haqi foizi (TZ qarori Q2: xizmat haqi olinmaydi → 0). Kerak bo'lsa .env orqali yoqiladi.
RESTAURANT_SERVICE_FEE_PERCENT = os.environ.get('RESTAURANT_SERVICE_FEE_PERCENT', '0')
# Mehmon menyusi ko'rsatadigan asosiy restoran slug'i (admin paneldagi AppSetting 'restaurant_default_shop' ustun turadi)
RESTAURANT_DEFAULT_SHOP = os.environ.get('RESTAURANT_DEFAULT_SHOP', '')
# S1-1: `/menu/` keshiga model nusxalari o'rniga tayyor JSON satrlar (HTML baytma-bayt bir xil). False = eski yo'l.
MENU_CACHE_PLAIN_DATA = _env_bool('MENU_CACHE_PLAIN_DATA', True)
# S1-4: mehmon HTML sahifalari (`/`, `/menu/`) uchun ETag + `Cache-Control: private, max-age=0, must-revalidate`. False = eski (sarlavhasiz).
GUEST_PAGE_ETAG = _env_bool('GUEST_PAGE_ETAG', True)
# S1-2: AppSetting va asosiy restoran ID sini jarayon ichida saqlash muddati (soniya). 0 = o'chiq (har so'rovda DB).
# Boshqa worker'larda admin o'zgartirishi shu muddat ichida ko'rinadi. Testlarda 0.
APPSETTING_CACHE_TTL = 0.0 if RUNNING_TESTS else float(os.environ.get('APPSETTING_CACHE_TTL', '5') or 0)

# Taom rasmidan 3D (TZ_LOKAL_RASMDAN_3D_MENYU). 'relief' — AI'siz, lokal, bepul (standart).
RESTAURANT_3D_PROVIDER = os.environ.get('RESTAURANT_3D_PROVIDER', 'relief')
# Rasm yuklanganda 3D avtomatik navbatga qo'yilsin (fon ishchisi: python manage.py run_3d_worker)
RESTAURANT_3D_AUTO_GENERATE = os.environ.get('RESTAURANT_3D_AUTO_GENERATE', 'True').lower() == 'true'
# Eski xatti-harakatlar (o'chirilmagan, flag ortida): kutubxonadan nom bo'yicha umumiy model va
# mos model bo'lmasa ham "zaxira" model qo'yish. Mijozni chalg'itmasligi uchun standart — o'chiq.
RESTAURANT_3D_LIBRARY_AUTO = os.environ.get('RESTAURANT_3D_LIBRARY_AUTO', 'False').lower() == 'true'
RESTAURANT_3D_GENERIC_FALLBACK = os.environ.get('RESTAURANT_3D_GENERIC_FALLBACK', 'False').lower() == 'true'

# Testlar tashqi tarmoqqa (Telegram, AI, to'lovlar) chiqmasligi uchun
TEST_RUNNER = 'backend.test_runner.NoNetworkDiscoverRunner'

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'accounts.backends.CustomerBackend',
]

# Database (TZ: R9-1). Ustuvorlik: DATABASE_URL (postgres://user:parol@host:5432/nom?sslmode=require) →
# POSTGRES_DB (eski usul) → SQLite (faqat lokal ishlab chiqish). Production'da SQLite ishlatilmaydi: bir nechta gunicorn
# jarayoni bitta fayl bo'yicha yozuvda bir-birini bloklaydi; zarurat bo'lsa ALLOW_SQLITE_IN_PRODUCTION=True.
def _database_from_url(url):
    from urllib.parse import parse_qsl, unquote, urlparse
    parsed = urlparse(url)
    scheme = parsed.scheme.split('+')[0]
    if scheme in ('postgres', 'postgresql', 'pgsql'):
        options = dict(parse_qsl(parsed.query))
        config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': unquote(parsed.path.lstrip('/')),
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or 'localhost',
            'PORT': str(parsed.port or 5432),
            # PgBouncer (transaction pool) ishlatilsa DB_CONN_MAX_AGE=0; to'g'ridan-to'g'ri ulanishda ulanish qayta ishlatiladi
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', 60)),
            'CONN_HEALTH_CHECKS': True,
        }
        if options.get('sslmode'):
            config['OPTIONS'] = {'sslmode': options['sslmode']}
        return config
    if scheme == 'sqlite':
        path = unquote(parsed.path)
        return {'ENGINE': 'django.db.backends.sqlite3', 'NAME': path if path.startswith('/') else BASE_DIR / (path.lstrip('/') or 'db.sqlite3')}
    raise ImproperlyConfigured(f"DATABASE_URL sxemasi qo'llab-quvvatlanmaydi: {scheme!r} (postgres:// yoki sqlite:///)")


if os.environ.get('DATABASE_URL'):
    DATABASES = {'default': _database_from_url(os.environ['DATABASE_URL'])}
elif os.environ.get('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['POSTGRES_DB'],
            'USER': os.environ.get('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
            'PORT': os.environ.get('POSTGRES_PORT', '6432'),  # PgBouncer transaction pool port
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', 0)),  # 0 talab qilinadi (PgBouncer transaction pooling)
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'options': os.environ.get('PG_OPTIONS', '-c statement_timeout=15000 -c idle_in_transaction_session_timeout=30000'),
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

if (not DEBUG and not RUNNING_TESTS and DATABASES['default']['ENGINE'].endswith('sqlite3')
        and not _env_bool('ALLOW_SQLITE_IN_PRODUCTION', False)):
    raise ImproperlyConfigured(
        "Production'da SQLite ishlatib bo'lmaydi (bir nechta jarayon yozuvda bloklanadi). DATABASE_URL=postgres://... "
        "bering (yoki ongli ravishda ALLOW_SQLITE_IN_PRODUCTION=True)."
    )

# Cache — Redis bo'lsa Redis; production'da Redis'siz bo'lsa fayl keshi (bitta serverdagi barcha gunicorn
# jarayonlari uchun UMUMIY: rate limit hisoblagichlari jarayonlar orasida bo'lingan bo'lmaydi); lokal/testda xotira.
if os.environ.get('REDIS_URL'):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.environ['REDIS_URL'],
        }
    }
elif not DEBUG and not RUNNING_TESTS:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': os.environ.get('CACHE_DIR', str(BASE_DIR / 'cache')),
            # Django standarti 300: 450 ta begona kalit login-qulf hisoblagichlarini va menyu versiyasini o'chirib yuborardi.
            # Bu vaqtinchalik chora; haqiqiy yechim Redis (TZ P3). Fayl keshi har YANGI kalitda papkani sanaydi, shuning uchun
            # chegarani cheksiz oshirib bo'lmaydi (shu noutbukda o'lchangan: yangi kalit 300 -> 0.64 ms, 5000 -> 8.9 ms, 20000 -> 34 ms).
            'OPTIONS': {'MAX_ENTRIES': int(os.environ.get('CACHE_MAX_ENTRIES', '5000'))},
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

# Celery — runs eagerly (inline) when no Redis broker is configured
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = not bool(os.environ.get('REDIS_URL'))
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TIMEZONE = 'Asia/Tashkent'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Celery davriy rejalashtiruvchi (Beat Schedule)
CELERY_BEAT_SCHEDULE = {
    'recompute-ranking-daily': {
        'task': 'ai.tasks.recompute_ranking',
        'schedule': 86400.0,
    },
    'drain-outbox-events-periodic': {
        'task': 'notifications.tasks.process_outbox_queue',
        'schedule': 10.0,  # Har 10 soniyada outbox navbatini tekshiradi va tozalaydi
    },
}

# Auth
AUTH_USER_MODEL = 'accounts.AdminUser'

# Testlar tez yursin: PBKDF2 (1 mln iteratsiya) har create_user'da soniyalar oladi. Faqat test muhitida (production'ga ta'sir yo'q).
if RUNNING_TESTS:
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'api.authentication.MultiUserJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Mehmon yozuv endpoint'lari uchun (ScopedRateThrottle). Restoran Wi-Fi'sidagi hamma mehmon bitta IP'dan
    # chiqadi, shuning uchun chegaralar faqat suiiste'molni to'xtatadigan darajada keng.
    'NUM_PROXIES': TRUSTED_PROXY_COUNT,
    'DEFAULT_THROTTLE_RATES': {
        'guest_write': os.environ.get('THROTTLE_GUEST_WRITE', '240/min'),
        'login': os.environ.get('THROTTLE_LOGIN', '20/min'),
    },
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
}

# CORS — faqat ruxsat etilgan domenlar
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    # Production'da faqat .env dagi aniq domenlar (avval kodga yozilgan guliston.uz standart edi)
    CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', '')
    CORS_ALLOW_CREDENTIALS = True

# Internationalization
LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Til sozlamalari
LANGUAGES = [
    ('uz', "O'zbek"),
    ('ru', 'Русский'),
    ('en', 'English'),
]

# Locale fayllar yo'li
LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# ─── Yuklash limitlari (TZ R1-6) ───────────────────────────────────────────────────────────────────
# Fayl bo'lmagan so'rov tanasi (JSON, forma) cheklanadi; fayl hajmlari yuklash joyida tekshiriladi (core/uploads.py).
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('DATA_UPLOAD_MAX_MB', 10)) * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 2000
# Yuklangan rasmni WebP ga o'tkazib kichraytirish (taom rasmi menyuda tez ochilsin); o'chirish: UPLOAD_OPTIMIZE_IMAGES=False
UPLOAD_OPTIMIZE_IMAGES = _env_bool('UPLOAD_OPTIMIZE_IMAGES', True)
UPLOAD_IMAGE_MAX_SIDE = int(os.environ.get('UPLOAD_IMAGE_MAX_SIDE', '1000'))
UPLOAD_IMAGE_WEBP_QUALITY = int(os.environ.get('UPLOAD_IMAGE_WEBP_QUALITY', '78'))
UPLOAD_MAX_IMAGE_MB = int(os.environ.get('UPLOAD_MAX_IMAGE_MB', 12))    # telefon fotosi 3–10 MB; saqlanadigani WebP ga kichraytiriladi
UPLOAD_MAX_MODEL_MB = int(os.environ.get('UPLOAD_MAX_MODEL_MB', 15))
UPLOAD_MAX_VIDEO_MB = int(os.environ.get('UPLOAD_MAX_VIDEO_MB', 50))

# ─── Loglar (TZ R1-8) ──────────────────────────────────────────────────────────────────────────────
# Aylanuvchi fayllar (hajmi cheklangan) — disk to'lib ketmaydi. Maxfiy qiymatlar logga ataylab yozilmaydi.
LOG_DIR = Path(os.environ.get('LOG_DIR', str(BASE_DIR / 'logs')))
_log_handlers = ['console']
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'standard'},
    },
    'root': {'handlers': _log_handlers, 'level': os.environ.get('LOG_LEVEL', 'INFO')},
    'loggers': {
        'django.request': {'handlers': _log_handlers, 'level': 'WARNING', 'propagate': False},
        'django.security': {'handlers': _log_handlers, 'level': 'WARNING', 'propagate': False},
        # httpx har so'rovni INFO darajasida to'liq URL bilan yozadi: Telegram URL'ida bot tokeni bor
        # (…/bot<TOKEN>/sendMessage) — token log fayliga tushib qolardi (R3)
        'httpx': {'handlers': _log_handlers, 'level': 'WARNING', 'propagate': False},
        'httpcore': {'handlers': _log_handlers, 'level': 'WARNING', 'propagate': False},
    },
}
if RUNNING_TESTS:
    LOGGING['handlers']['console'] = {'class': 'logging.NullHandler'}
else:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        LOGGING['handlers']['app_file'] = {
            'class': 'logging.handlers.RotatingFileHandler', 'formatter': 'standard',
            'filename': str(LOG_DIR / 'app.log'), 'maxBytes': 10 * 1024 * 1024, 'backupCount': 5,
            'encoding': 'utf-8',
        }
        LOGGING['handlers']['error_file'] = {
            'class': 'logging.handlers.RotatingFileHandler', 'formatter': 'standard', 'level': 'ERROR',
            'filename': str(LOG_DIR / 'error.log'), 'maxBytes': 10 * 1024 * 1024, 'backupCount': 5,
            'encoding': 'utf-8',
        }
        _log_handlers.extend(['app_file', 'error_file'])
    except OSError:
        pass   # log papkasi yozilmasa ham server ishga tushadi (faqat konsol)

# Klassik Seller/Admin paneli aktivlari manbasi: 'local' (standart — Tailwind CSS, Alpine.js, shriftlar va ikonkalar o'z
# serverimizdan, backend/static/seller + backend/static/vendor) yoki 'cdn' (eski xatti-harakat, zaxira: cdn.tailwindcss.com,
# jsdelivr, Google Fonts). Admin paneldagi AppSetting 'seller_assets' bu qiymatdan ustun turadi (kodni o'zgartirmasdan almashtirish).
SELLER_ASSETS = os.environ.get('SELLER_ASSETS', 'local').strip().lower()
if SELLER_ASSETS not in ('local', 'cdn'):
    SELLER_ASSETS = 'local'

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

if not DEBUG and not RUNNING_TESTS:
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── MAP (Leaflet/OpenStreetMap) ──────────────────────────────────────
MAP_DEFAULT_LAT = 40.4775
MAP_DEFAULT_LNG = 66.8435
MAP_DEFAULT_ZOOM = 13

# ─── TELEGRAM (3 ta mustaqil bot ekotizimi) ───────────────────────────
# TZ: TZ_3_TA_MUSTAQIL_MAHSULOT_EKOTIZIMI.md
# Eski yagona token — Restoran boti bilan moslik uchun fallback sifatida qoladi.
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')
TELEGRAM_ADMIN_CHAT_IDS = os.environ.get('TELEGRAM_ADMIN_CHAT_IDS', '')
# Webhook secret (bo'sh bo'lsa bot tokeni + SECRET_KEY dan hosil qilinadi — notifications/webhook_security.py)
TELEGRAM_WEBHOOK_SECRET = os.environ.get('TELEGRAM_WEBHOOK_SECRET', '')
# Bot API manzili (bo'sh = rasmiy api.telegram.org). Lokal Bot API serveri yoki soxta server bilan sinash uchun.
TELEGRAM_API_BASE = os.environ.get('TELEGRAM_API_BASE', '')
# Bildirishnoma navbatini Celery turtki bilan tezlashtirish (standart: yo'q — `manage.py run_workers` yetarli)
OUTBOX_USE_CELERY = _env_bool('OUTBOX_USE_CELERY', False)
# Xodim chatiga yuboriladigan qo'shimcha xabarlar (admin paneldagi AppSetting ustun turadi): holat o'zgarishi,
# ofitsiant chaqiruvi, taom tayyor. Standart: o'chiq (har qadamda chatni to'ldirib yubormaslik uchun).
TELEGRAM_NOTIFY_STATUS_CHANGES = _env_bool('TELEGRAM_NOTIFY_STATUS_CHANGES', False)
TELEGRAM_NOTIFY_SERVICE_CALLS = _env_bool('TELEGRAM_NOTIFY_SERVICE_CALLS', False)
TELEGRAM_NOTIFY_DISH_READY = _env_bool('TELEGRAM_NOTIFY_DISH_READY', False)
ADMIN_PANEL_PASSWORD = os.environ.get('ADMIN_PANEL_PASSWORD', '')

# Mahsulot #1: Restoran 3D Menyu & Stollar boti
TELEGRAM_RESTAURANT_BOT_TOKEN = os.environ.get('TELEGRAM_RESTAURANT_BOT_TOKEN', '') or TELEGRAM_BOT_TOKEN
# Mahsulot #2: Online Store E-Commerce Shopping Bot
TELEGRAM_MARKET_BOT_TOKEN = os.environ.get('TELEGRAM_MARKET_BOT_TOKEN', '')
# Mahsulot #3: 3D Studio & Print Assistant Bot
TELEGRAM_STUDIO_BOT_TOKEN = os.environ.get('TELEGRAM_STUDIO_BOT_TOKEN', '')

# ─── PAYMENTS ─────────────────────────────────────────────────────────
# Click
CLICK_API_URL = os.environ.get('CLICK_API_URL', 'https://api.click.uz/v1')
CLICK_MERCHANT_ID = os.environ.get('CLICK_MERCHANT_ID', '')
CLICK_SECRET_KEY = os.environ.get('CLICK_SECRET_KEY', '')
CLICK_SERVICE_ID = os.environ.get('CLICK_SERVICE_ID', '')

# Payme
PAYME_API_URL = os.environ.get('PAYME_API_URL', 'https://payme.uz/api/')
PAYME_MERCHANT_ID = os.environ.get('PAYME_MERCHANT_ID', '')
PAYME_SECRET_KEY = os.environ.get('PAYME_SECRET_KEY', '')

# UzCard (Paycom)
UZCARD_API_URL = os.environ.get('UZCARD_API_URL', 'https://api.paycom.uz/v2')
UZCARD_MERCHANT_ID = os.environ.get('UZCARD_MERCHANT_ID', '')
UZCARD_SECRET_KEY = os.environ.get('UZCARD_SECRET_KEY', '')
UZCARD_CALLBACK_URL = os.environ.get('UZCARD_CALLBACK_URL', '')

# ─── AI ───────────────────────────────────────────────────────────────
AI_PROVIDER = os.environ.get('AI_PROVIDER', 'openai')
AI_API_KEY = os.environ.get('AI_API_KEY', '')
# Menyu rasmini o'qish (ommaviy qo'shish): rasm tushunadigan model. Groq'da sinab ko'rilgan: qwen/qwen3.8-27b
AI_VISION_MODEL = os.environ.get('AI_VISION_MODEL', 'qwen/qwen3.8-27b')
# Menyu importi vaqtinchalik rasmlari: MEDIA_ROOT'DAN TASHQARIDA (media ochiq beriladi), Docker'da yoziladigan hajm CACHE_DIR.
# Testlarda har ishga tushirishda alohida vaqtinchalik papka (haqiqiy papkaga yozilmaydi).
if RUNNING_TESTS:
    import tempfile
    MENU_IMPORT_TMP_DIR = tempfile.mkdtemp(prefix='menu_import_tmp_')
else:
    MENU_IMPORT_TMP_DIR = os.environ.get('MENU_IMPORT_TMP_DIR') or os.path.join(
        os.environ.get('CACHE_DIR', str(BASE_DIR / 'cache')), 'import_tmp')
# Internetdan tanlangan menyu rasmini server yuklab oladigan saytlar (SSRF himoyasi: boshqa host rad etiladi).
# `*.domen` — pastki domenlar; vergul bilan ajratilgan env bilan almashtiriladi.
MENU_IMAGE_ALLOWED_HOSTS = [
    h.strip().lower() for h in os.environ.get('MENU_IMAGE_ALLOWED_HOSTS', '').split(',') if h.strip()
] or [
    'upload.wikimedia.org', 'commons.wikimedia.org', '*.wikimedia.org',
    'live.staticflickr.com', '*.staticflickr.com', 'images.pexels.com',
]
AI_TEXT_MODEL_FAST = os.environ.get('AI_TEXT_MODEL_FAST', 'gpt-4o-mini')
AI_TEXT_MODEL_QUALITY = os.environ.get('AI_TEXT_MODEL_QUALITY', 'gpt-4o')
AI_IMAGE_MODEL = os.environ.get('AI_IMAGE_MODEL', 'dall-e-3')
AI_EMBEDDING_MODEL = os.environ.get('AI_EMBEDDING_MODEL', 'text-embedding-3-small')

# ─── S3 STORAGE ───────────────────────────────────────────────────────
S3_ENDPOINT = os.environ.get('S3_ENDPOINT', '')
S3_ACCESS_KEY = os.environ.get('S3_ACCESS_KEY', '')
S3_SECRET_KEY = os.environ.get('S3_SECRET_KEY', '')
S3_BUCKET = os.environ.get('S3_BUCKET', '')

# ─── SENTRY ───────────────────────────────────────────────────────────
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                DjangoIntegration(),
            ],
            traces_sample_rate=0.1,
            # Mijoz telefoni, IP va cookie'lari Sentry'ga ketmasin (TZ R1-7)
            send_default_pii=False,
            environment='production' if not DEBUG else 'development',
        )
    except ImportError:
        # Paket o'rnatilmagan bo'lsa ham server ishga tushadi (avval SENTRY_DSN berilganda yiqilardi)
        import logging as _logging
        _logging.getLogger(__name__).warning("SENTRY_DSN berilgan, lekin sentry-sdk o'rnatilmagan — monitoring o'chiq")
PUBLIC_DOMAIN = os.environ.get('PUBLIC_DOMAIN', '127.0.0.1:8000')
_default_site_url = (
    f"https://{PUBLIC_DOMAIN}"
    if ('trycloudflare.com' in PUBLIC_DOMAIN or 'ngrok' in PUBLIC_DOMAIN)
    else f"http://{PUBLIC_DOMAIN}"
)
SITE_URL = os.environ.get('SITE_URL', _default_site_url).rstrip('/')
