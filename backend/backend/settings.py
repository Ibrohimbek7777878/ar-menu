"""
Django settings for backend project.
Online Store Guliston — Local Commerce OS
"""

import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    # backend/.env yoki asosiy papkadagi .env ni yuklash
    load_dotenv(BASE_DIR / '.env', override=True)
    load_dotenv(BASE_DIR.parent / '.env', override=False)
except Exception:
    pass

# Security
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'
STATIC_SECRET_KEY = 'django-insecure-MVZfwO0RUY8EaznN3m4r2Wxnh7bPLOFlqIWX4i5NWC53dvtXtkAPpF0DcFLW83io2Mw'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '').strip() or STATIC_SECRET_KEY
ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',') if h.strip()]

# CSRF Trusted Origins (Production web va admin panel uchun)
CSRF_TRUSTED_ORIGINS = [
    orig.strip()
    for orig in os.environ.get(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:8000,http://127.0.0.1:8000,http://0.0.0.0:8000'
    ).split(',')
    if orig.strip()
]

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

# Restoran xizmat haqi foizi (TZ qarori Q2: xizmat haqi olinmaydi → 0). Kerak bo'lsa .env orqali yoqiladi.
RESTAURANT_SERVICE_FEE_PERCENT = os.environ.get('RESTAURANT_SERVICE_FEE_PERCENT', '0')

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

# Cache — Redis when REDIS_URL is set, otherwise in-process memory
if os.environ.get('REDIS_URL'):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.environ['REDIS_URL'],
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
    CORS_ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get('CORS_ALLOWED_ORIGINS', 'https://guliston.uz,https://www.guliston.uz').split(',')
        if o.strip()
    ]
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

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

if not DEBUG:
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
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=True,
        environment='production' if not DEBUG else 'development',
    )
PUBLIC_DOMAIN = os.environ.get('PUBLIC_DOMAIN', '127.0.0.1:8000')
_default_site_url = (
    f"https://{PUBLIC_DOMAIN}"
    if ('trycloudflare.com' in PUBLIC_DOMAIN or 'ngrok' in PUBLIC_DOMAIN)
    else f"http://{PUBLIC_DOMAIN}"
)
SITE_URL = os.environ.get('SITE_URL', _default_site_url).rstrip('/')
