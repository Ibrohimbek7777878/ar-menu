"""
Celery application for Online Store Guliston.
When REDIS_URL is not configured, tasks run eagerly (inline) so the app
works without a broker during local development.
"""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('online_store_guliston')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):  # pragma: no cover - smoke test
    return f'Request: {self.request!r}'
