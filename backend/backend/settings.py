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
# Faqat mock to'lov sahifalari (DEMO_MODE'siz). Production'da False.
ALLOW_MOCK_PAYMENTS = os.environ.get('ALLOW_MOCK_PAYMENTS', 'False').lower() == 'true'

# Stolni oddiy raqam (?table=5, qo'lda kiritish, stol ID) bilan tanlash taxmin qilinadi: begona stolga buyurtma/chaqiruv
# yuborish mumkin. Production'da stol faqat QR'dagi tasodifiy token (/t/<uuid>/) orqali aniqlanadi. Raqam bilan kirish
# faqat DEMO_MODE'da yoki shu flag aniq yoqilganda ishlaydi (TZ R1-10; funksiya o'chirilmagan — flag ortiga yashirilgan).
RESTAURANT_ALLOW_TABLE_NUMBER_URL = _env_bool('RESTAURANT_ALLOW_TABLE_NUMBER_URL', DEMO_MODE)
# Bosma QR kodlar ko'rsatadigan domen (masalan https://menu.example.uz). Bo'sh bo'lsa — xodim ochgan sayt domeni.
RESTAURANT_PUBLIC_URL = os.environ.get('RESTAURANT_PUBLIC_URL', '').strip().rstrip('/')

# Restoran xizmat haqi foizi (TZ qarori Q2: xizmat haqi olinmaydi → 0). Kerak bo'lsa .env orqali yoqiladi.
RESTAURANT_SERVICE_FEE_PERCENT = os.environ.get('RESTAURANT_SERVICE_FEE_PERCENT', '0')
# Mehmon menyusi ko'rsatadigan asosiy restoran slug'i (admin paneldagi AppSetting 'restaurant_default_shop' ustun turadi)
RESTAURANT_DEFAULT_SHOP = os.environ.get('RESTAURANT_DEFAULT_SHOP', '')

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

# Database — PostgreSQL when POSTGRES_DB is set, otherwise SQLite (dev/default)
if os.environ.get('POSTGRES_DB'):
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
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

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
UPLOAD_MAX_IMAGE_MB = int(os.environ.get('UPLOAD_MAX_IMAGE_MB', 5))
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
