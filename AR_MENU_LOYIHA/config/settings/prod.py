from .base import *  # noqa
DEBUG=False
# Sentry demo fallback: if DSN empty, no init
import os
SENTRY_DSN=os.environ.get('SENTRY_DSN','')
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
# Security
SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO','https')
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
