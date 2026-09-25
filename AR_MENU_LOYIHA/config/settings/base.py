import os
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
    'django_filters',
    # local
    'core',
    'apps.tenants',
    'apps.accounts',
    'apps.analytics',
    'apps.menu',
    'apps.tables',
    'apps.guest',
    'apps.orders',
    'apps.ar3d',
    'apps.ai',
    'apps.payments',
    'apps.loyalty',
    'apps.reviews',
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
    'core.middleware.RequestLoggingMiddleware',
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
        'apps.tenants.context_processors.tenant_context',
    ]},
}]

# --- DB ---
# Support both TCP and Unix socket. If DB_HOST is empty or a path, psycopg uses peer auth.
_db_host = config('DB_HOST', default='127.0.0.1')
# allow empty host for socket; decouple returns '' if set to empty
if _db_host == '':
    _db_host = None

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': config('DB_NAME'),
    'USER': config('DB_USER'),
    'PASSWORD': config('DB_PASSWORD'),
    'HOST': _db_host or '',
    'PORT': config('DB_PORT', default='5432'),
    'CONN_MAX_AGE': 60,
    'OPTIONS': {'connect_timeout': 5},
}}
# If HOST is empty string, remove it to use Unix socket via peer auth (psycopg will use default socket)
if not DATABASES['default']['HOST']:
    DATABASES['default'].pop('HOST')
    DATABASES['default'].pop('PORT', None)
    # also remove password if empty to avoid fe_sendauth error
    if not DATABASES['default']['PASSWORD']:
        DATABASES['default'].pop('PASSWORD', None)

REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/5')
CACHES = {'default': {
    'BACKEND': 'django_redis.cache.RedisCache',
    'LOCATION': REDIS_URL,
    'OPTIONS': {
        'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        'IGNORE_EXCEPTIONS': True,
        'socket_timeout': 2,
        'socket_connect_timeout': 2,
    },
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

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.accounts.authentication.StaffJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'login': '20/min',
        'guest': '120/min',
        'staff': '300/min',
    },
}

JWT_SECRET = config('JWT_SECRET', default='')   # bo'sh bo'lsa SECRET_KEY ishlatiladi

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
PLAN_TABLE_LIMITS = {'start': 15, 'pro': 60, 'max': 300}

# --- To'lov sozlamalari (F-001) ---
PAYMENTS_MODE = config('PAYMENTS_MODE', default='sandbox')
PAYME_MERCHANT_ID = config('PAYME_MERCHANT_ID', default='')
PAYME_KEY = config('PAYME_KEY', default='')
CLICK_SERVICE_ID = config('CLICK_SERVICE_ID', default='')
CLICK_SECRET = config('CLICK_SECRET', default='')
UZUM_MERCHANT_ID = config('UZUM_MERCHANT_ID', default='')
UZUM_SECRET = config('UZUM_SECRET', default='')

LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'std': {'format': '[{levelname}] {asctime} {name} — {message}', 'style': '{'},
        'verbose': {'format': '[{levelname}] {asctime} {name} [{request_id}] {message}', 'style': '{'},
        'json': {
            '()': 'core.logging.JSONLogFormatter',
        },
        'access': {'format': '{asctime} {message}', 'style': '{'},
    },
    'filters': {
        'request_id': {'()': 'core.logging.RequestIDFilter'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'std',
            'filters': ['request_id'],
        },
        'file_app': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'app.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
        'file_error': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'error.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 5,
            'level': 'WARNING',
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
        'file_access': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'access.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'access',
            'filters': ['request_id'],
        },
        'file_security': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'security.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
        'file_ai': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'ai.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
        'file_payment': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'payment.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
        'file_ar': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOGS_DIR / 'ar3d.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
            'filters': ['request_id'],
        },
    },
    'loggers': {
        'django': {'handlers': ['console', 'file_app'], 'level': 'INFO', 'propagate': False},
        'django.request': {'handlers': ['console', 'file_error', 'file_access'], 'level': 'INFO', 'propagate': False},
        'django.security': {'handlers': ['console', 'file_security'], 'level': 'WARNING', 'propagate': False},
        'django.db.backends': {'handlers': ['file_app'], 'level': 'WARNING', 'propagate': False},
        'access': {'handlers': ['console', 'file_access'], 'level': 'INFO', 'propagate': False},
        'core': {'handlers': ['console', 'file_app', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'core.frontend': {'handlers': ['console', 'file_app', 'file_error'], 'level': 'INFO', 'propagate': False},
        'apps': {'handlers': ['console', 'file_app', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'apps.ar3d': {'handlers': ['console', 'file_ar', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'ar3d': {'handlers': ['console', 'file_ar', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'ai': {'handlers': ['console', 'file_ai', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'payments': {'handlers': ['console', 'file_payment', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'fiscal': {'handlers': ['console', 'file_payment', 'file_error'], 'level': 'DEBUG', 'propagate': False},
        'loyalty': {'handlers': ['console', 'file_app'], 'level': 'DEBUG', 'propagate': False},
        'gunicorn': {'handlers': ['console', 'file_access'], 'level': 'INFO', 'propagate': False},
    },
    'root': {'handlers': ['console', 'file_app', 'file_error'], 'level': 'INFO'},
}

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')

