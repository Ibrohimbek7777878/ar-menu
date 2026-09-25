"""Health + Readiness endpoints — liveness (DB'siz), readiness (DB + Redis + navbat)"""
import logging

from django.http import JsonResponse

log = logging.getLogger('core.health')


def health(request):
    """GET /health/ — liveness probe (DB so'rovsiz, har doim 200)"""
    return JsonResponse({'status': 'ok'})


def ready(request):
    """GET /ready/ — readiness probe (DB + Redis + queue tekshiruvi)"""
    checks = {}
    ok = True

    # DB tekshiruvi
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        checks['db'] = 'ok'
    except Exception as e:
        checks['db'] = f'error: {e}'
        ok = False

    # Redis tekshiruvi
    try:
        from core.cache import cache
        cache.set('_health_check', '1', 5)
        val = cache.get('_health_check')
        checks['redis'] = 'ok' if val == '1' else 'mismatch'
        if val != '1':
            ok = False
    except Exception as e:
        checks['redis'] = f'error: {e}'
        ok = False

    # Queue tekshiruvi
    try:
        from core.queue import queue_depth
        depths = {}
        for q in ['model3d', 'fiscal', 'notify', 'ai', 'analytics']:
            depths[q] = queue_depth(q)
        checks['queues'] = depths
    except Exception as e:
        checks['queues'] = f'error: {e}'

    status_code = 200 if ok else 503
    return JsonResponse({'status': 'ready' if ok else 'not_ready', 'checks': checks}, status=status_code)
