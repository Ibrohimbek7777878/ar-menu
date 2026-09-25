import logging
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

logger = logging.getLogger('core.frontend')
security_logger = logging.getLogger('django.security')

# Har qanday turdagi log — frontend JS, mobile, PWA, API
# Turlari: error, warn, info, debug, api_error, ws_error, payment_error, ar_error

@csrf_exempt
def frontend_log(request):
    """POST /v1/log/frontend/ — har qanday frontend xato/log (auth shart emas — mehmon uchun)"""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8') if request.body else '{}')
    except Exception:
        data = {}
    # Qabul qilinadigan turli formatlar
    level = (data.get('level') or data.get('type') or 'error').lower()
    message = (data.get('message') or data.get('msg') or data.get('error') or '')[:2000]
    stack = (data.get('stack') or data.get('trace') or '')[:3000]
    url = (data.get('url') or request.META.get('HTTP_REFERER', ''))[:500]
    ua = request.META.get('HTTP_USER_AGENT', '')[:200]
    rid = getattr(request, 'request_id', '-') or request.headers.get('X-Request-ID', '-')
    tenant = getattr(request, 'restaurant_id', '-') or data.get('restaurant_id', '-') or '-'
    session = (data.get('session') or data.get('session_id') or '-')[:64]
    extra = {'request_id': rid}

    # Xavfsizlik bilan bog'liq frontend log (auth, payment) — alohida
    log_msg = f'[FRONTEND:{level.upper()}] {message} url={url} tenant={tenant} session={session} rid={rid} ua="{ua}"'
    if stack:
        log_msg += f' stack="{stack[:1000]}"'
    # Qo'shimcha maydonlar (ixtiyoriy)
    for k in ('component', 'action', 'dish_id', 'order_id', 'table_id', 'provider'):
        if k in data:
            log_msg += f' {k}={data[k]}'

    # Level bo'yicha yozish
    lvl = {'error': logging.ERROR, 'warn': logging.WARNING, 'warning': logging.WARNING,
           'info': logging.INFO, 'debug': logging.DEBUG}.get(level, logging.ERROR)
    logger.log(lvl, log_msg, extra=extra)

    # Xavfsizlik tipidagi frontend xatolarni alohida security.log ga ham
    if level in ('security', 'auth_error', 'payment_error') or 'auth' in message.lower() or 'payment' in level:
        security_logger.warning(log_msg, extra=extra)

    return JsonResponse({'ok': True})

@csrf_exempt
def js_error_beacon(request):
    """GET/POST beacon — eski brauzerlar sendBeacon uchun, 204 qaytaradi"""
    if request.method == 'GET':
        # GET orqali ham xabar yuborish mumkin: ?msg=...
        msg = request.GET.get('msg', '')[:1000]
        if msg:
            logger.error(f'[FRONTEND:BEACON] {msg} url={request.META.get("HTTP_REFERER","")} rid={getattr(request,"request_id","-")}', extra={'request_id': getattr(request,'request_id','-')})
        return JsonResponse({}, status=204)
    return frontend_log(request)


def tail_logs(request):
    """GET /v1/logs/tail/?file=app&n=100 — oxirgi loglarni ko'rish (admin auth talab qilinadi)
    IsRestAdmin yoki IsPlatformAdmin ruxsati kerak.
    """
    # Auth tekshiruvi — JWT yoki session
    user = getattr(request, 'user', None)
    staff = getattr(request, 'staff', None)
    is_auth = user and user.is_authenticated
    is_admin = is_auth and (
        (staff and staff.role in ('admin', 'manager')) or
        getattr(user, 'is_platform_admin', False)
    )
    if not is_admin:
        return JsonResponse({'ok': False, 'error': 'Admin auth required'}, status=403)

    from pathlib import Path
    from django.conf import settings

    # Demo: query param orqali file tanlash
    log_name = request.GET.get('file', 'app')
    n = min(500, max(10, int(request.GET.get('n', 100))))
    # Xavfsizlik: faqat ruxsat etilgan fayllar
    allowed = {'app', 'error', 'access', 'security', 'ai', 'payment', 'ar3d', 'frontend'}
    if log_name not in allowed:
        log_name = 'app'
    # frontend -> app.log ichida core.frontend logger yozadi
    file_map = {
        'app': 'app.log', 'error': 'error.log', 'access': 'access.log',
        'security': 'security.log', 'ai': 'ai.log', 'payment': 'payment.log',
        'ar3d': 'ar3d.log', 'frontend': 'app.log',
    }
    log_file = Path(settings.BASE_DIR) / 'logs' / file_map.get(log_name, 'app.log')
    if not log_file.exists():
        return JsonResponse({'ok': True, 'file': log_name, 'lines': [], 'note': 'log file not yet created'}, status=200)
    try:
        # Oxirgi n qatorni o'qish (katta fayl bo'lsa ham tez)
        with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            tail = lines[-n:]
            # Filtr: frontend bo'lsa faqat FRONTEND qatorlar
            if log_name == 'frontend':
                tail = [l for l in tail if 'FRONTEND' in l]
            # Format: har qator + meta
            return JsonResponse({
                'ok': True,
                'file': log_name,
                'path': str(log_file),
                'total_lines': len(lines),
                'returned': len(tail),
                'lines': [l.rstrip('\n') for l in tail],
            })
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)
