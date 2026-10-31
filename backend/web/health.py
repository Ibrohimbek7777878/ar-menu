"""
Health check endpoint — tizim sog'ligini tekshirish.
"""
import time
from django.http import JsonResponse
from django.db import connection
from django.conf import settings


def health_live(request):
    """
    S1-5: jarayon tirikmi? DB'ga, diskka va tarmoqqa tegmaydi (0 SQL): faqat WSGI/URL/middleware yo'li ishlashini ko'rsatadi.
    Konteyner "tirik"ligi uchun; ma'lumotlar bazasi holati `/health/ready/` da.
    """
    resp = JsonResponse({'status': 'alive'})
    resp['Cache-Control'] = 'no-store'
    return resp


def health_ready(request):
    """
    S1-5: so'rov qabul qilishga tayyormi? Aynan 1 ta SQL (`SELECT 1`). DB javob bermasa 503.
    To'liq diagnostika (disk, xotira, outbox, Telegram) o'zgarmagan `/health/` da: u tashqi monitoring uchun, soniyasiga emas.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        resp = JsonResponse({'status': 'unready'}, status=503)
    else:
        resp = JsonResponse({'status': 'ready'})
    resp['Cache-Control'] = 'no-store'
    return resp


def health_check(request):
    """
    Health check endpoint.
    Returns system health status including database, cache, and other services.
    """
    health = {
        'status': 'healthy',
        'timestamp': time.time(),
        'services': {}
    }

    # Database tekshirish
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_engine = 'sqlite' if 'sqlite' in settings.DATABASES['default']['ENGINE'] else 'postgresql'
            health['services']['database'] = {
                'status': 'healthy',
                'backend': db_engine,
            }
    except Exception as e:
        health['services']['database'] = {
            'status': 'unhealthy',
            'error': str(e),
        }
        health['status'] = 'degraded'

    # Disk space tekshirish
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        health['services']['disk'] = {
            'status': 'healthy',
            'total_gb': round(total / (1024**3), 2),
            'used_gb': round(used / (1024**3), 2),
            'free_gb': round(free / (1024**3), 2),
            'usage_percent': round(used / total * 100, 1),
        }
        if health['services']['disk']['usage_percent'] > 90:
            health['services']['disk']['status'] = 'warning'
    except Exception as e:
        health['services']['disk'] = {
            'status': 'unknown',
            'error': str(e),
        }

    # Memory tekshirish
    try:
        import psutil
        memory = psutil.virtual_memory()
        health['services']['memory'] = {
            'status': 'healthy',
            'total_gb': round(memory.total / (1024**3), 2),
            'available_gb': round(memory.available / (1024**3), 2),
            'usage_percent': memory.percent,
        }
        if memory.percent > 90:
            health['services']['memory']['status'] = 'warning'
    except ImportError:
        health['services']['memory'] = {
            'status': 'unknown',
            'error': 'psutil not installed',
        }
    except Exception as e:
        health['services']['memory'] = {
            'status': 'unknown',
            'error': str(e),
        }

    # Telegram bot tekshirish (token qismi ham ko'rsatilmaydi: /health/ ochiq)
    try:
        from notifications.telegram_client import get_token
        if get_token():
            health['services']['telegram'] = {
                'status': 'configured',
            }
        else:
            health['services']['telegram'] = {
                'status': 'not_configured',
            }
    except Exception as e:
        health['services']['telegram'] = {
            'status': 'error',
            'error': str(e),
        }

    # Bildirishnoma navbati (outbox): ishchi (manage.py run_workers) ishlamasa eski hodisalar to'planib qoladi
    try:
        from notifications.outbox import outbox_stats
        stats = outbox_stats()
        stale = stats['oldest_pending_seconds'] is not None and stats['oldest_pending_seconds'] > 120
        health['services']['outbox'] = {
            'status': 'warning' if (stale or stats['failed']) else 'healthy',
            **stats,
        }
        if stale:
            health['services']['outbox']['hint'] = "Navbat to'planmoqda: 'manage.py run_workers' ishlayaptimi?"
    except Exception as e:
        health['services']['outbox'] = {'status': 'unknown', 'error': str(e)}

    # Sentry tekshirish
    try:
        sentry_dsn = getattr(settings, 'SENTRY_DSN', '')
        if sentry_dsn:
            health['services']['sentry'] = {
                'status': 'configured',
            }
        else:
            health['services']['sentry'] = {
                'status': 'not_configured',
            }
    except Exception as e:
        health['services']['sentry'] = {
            'status': 'error',
            'error': str(e),
        }

    # Application info
    health['app'] = {
        'name': 'Online Store Guliston',
        'version': '1.0.0',
        'debug': settings.DEBUG,
    }

    # Overall status
    unhealthy_services = [
        name for name, service in health['services'].items()
        if service.get('status') == 'unhealthy'
    ]
    if unhealthy_services:
        health['status'] = 'unhealthy'
        health['unhealthy_services'] = unhealthy_services

    status_code = 200 if health['status'] != 'unhealthy' else 503
    return JsonResponse(health, status=status_code)