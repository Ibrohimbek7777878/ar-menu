"""
M-01 — QR kirish. Mijozning tizimga birinchi qadami.
Zanjir: token → stol → restoran tekshiruvi → guest cookie → sessiya →
        til → analitika → WS admin xabari → redirect
"""
import logging
import uuid
import time
from django.conf import settings
from django.shortcuts import redirect, render, get_object_or_404
from django.views.decorators.http import require_GET
from django.db import transaction

from apps.tables.models import resolve_table_by_token
from apps.tables.services import broadcast_table_scanned
from apps.guest.lang import detect_lang, set_lang_cookie
from apps.guest.services import (
    read_device_token, set_device_cookie, get_or_create_guest, open_session)
from apps.guest.models import GuestSession
from core.exceptions import QRInvalid
from core.queue import enqueue

log = logging.getLogger('guest.views')


def _error_page(request, code, status):
    """3 tilda xato sahifasi (JS'siz ham ishlaydi)."""
    return render(request, 'guest/error.html',
                  {'error_code': code, 'lang': detect_lang(request)}, status=status)


@require_GET
def table_entry(request, qr_token):
    # [2.1-2.2] Stol topish (grace period ichidagi eski token ham qabul qilinadi)
    try:
        table = resolve_table_by_token(qr_token)
    except QRInvalid:
        log.warning(f'[M-01] QR topilmadi: {qr_token}')
        return _error_page(request, 'qr_invalid', 404)

    restaurant = table.restaurant

    # [2.3] Restoran faolmi
    if not restaurant.is_active:
        return _error_page(request, 'restaurant_inactive', 403)

    # [2.6] Til (avval — cookie yozishda kerak)
    lang = detect_lang(request, restaurant)

    # [2.4] Guest — device_token cookie (1 yil)
    device_token = read_device_token(request)
    new_device = device_token is None
    if new_device:
        device_token = uuid.uuid4()

    with transaction.atomic():
        guest, _ = get_or_create_guest(restaurant.id, device_token, lang)
        # [2.5] GuestSession
        session, is_new_session = open_session(guest, table, lang)

    # [2.7] Analitika (async — so'rovni sekinlashtirmaydi)
    try:
        enqueue('analytics', 'table_scanned',
                restaurant_id=restaurant.id, table_id=table.id,
                guest_id=guest.id, session_id=str(session.public_id),
                new_device=new_device)
    except Exception:
        pass

    # [2.8] WS → admin dashboard: "Stol 5 skanerlandi"
    if is_new_session:
        try:
            broadcast_table_scanned(table, session.public_id)
        except Exception:
            pass

    # [3] Menyuga redirect
    url = (f'/m/{restaurant.slug}/'
           f'?t={table.id}&s={session.public_id}&lang={lang}')
    resp = redirect(url)
    if new_device:
        set_device_cookie(resp, device_token)
    set_lang_cookie(resp, lang)
    return resp


@require_GET
def menu_page(request, slug):
    """M-02 — menyu sahifasi. Ma'lumot JS orqali /v1/menu/ dan olinadi."""
    from apps.tenants.models import Restaurant
    from apps.tables.models import Table

    restaurant = get_object_or_404(Restaurant, slug=slug, is_active=True)
    lang = detect_lang(request, restaurant)

    table = None
    tid = request.GET.get('t')
    if tid and str(tid).isdigit():
        table = Table.objects.filter(id=tid, restaurant=restaurant,
                                     is_active=True).first()

    session_pid = request.GET.get('s', '')
    if session_pid:
        try:
            import django.utils.timezone
            GuestSession.objects.filter(public_id=session_pid,
                                        restaurant=restaurant).update(
                last_seen_at=django.utils.timezone.now())
        except Exception:
            pass

    legacy = request.GET.get('legacy') == '1'
    template_name = 'guest/menu.html' if legacy else 'guest/menu_v2.html'
    static_ver = int(time.time()) if settings.DEBUG else 10
    resp = render(request, template_name, {
        'restaurant': restaurant,
        'table': table,
        'session_id': session_pid,
        'lang': lang,
        'i18n_version': 3,
        'static_version': static_ver,
    })
    return set_lang_cookie(resp, lang)


from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def set_language(request):
    """POST /v1/lang/ — til almashtirish va cookie/sessiyaga saqlash."""
    import json
    from django.http import JsonResponse
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            data = {}
        lang = data.get('lang', 'uz')
        session_id = data.get('session_id')
        if session_id:
            try:
                GuestSession.objects.filter(public_id=session_id).update(lang=lang)
            except Exception:
                pass
        resp = JsonResponse({'ok': True, 'lang': lang})
        return set_lang_cookie(resp, lang)
    return JsonResponse({'error': 'method_not_allowed'}, status=405)


@require_GET
def service_worker(request):
    """PWA Service Worker faylini root /sw.js orqali berish (Service-Worker-Allowed: /)."""
    import os
    from django.http import HttpResponse
    from django.conf import settings
    sw_path = os.path.join(settings.BASE_DIR, 'static', 'guest', 'js', 'sw.js')
    try:
        with open(sw_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except OSError:
        return HttpResponse('// sw not found', status=404, content_type='application/javascript')

    resp = HttpResponse(content, content_type='application/javascript')
    resp['Service-Worker-Allowed'] = '/'
    resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return resp


@require_GET
def pwa_manifest(request):
    """PWA Manifest faylini /manifest.json orqali berish."""
    import os
    from django.http import HttpResponse
    from django.conf import settings
    manifest_path = os.path.join(settings.BASE_DIR, 'static', 'guest', 'manifest.json')
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except OSError:
        return HttpResponse('{}', status=404, content_type='application/manifest+json')

    resp = HttpResponse(content, content_type='application/manifest+json')
    resp['Cache-Control'] = 'public, max-age=3600'
    return resp


@require_GET
def order_status_page(request, order_id):
    """M-08 — buyurtma holati (real-time WS bilan)."""
    from apps.orders.models import Order
    order = get_object_or_404(
        Order.objects.select_related('restaurant', 'table'), id=order_id)
    lang = detect_lang(request, order.restaurant)
    static_ver = int(time.time()) if settings.DEBUG else 10
    return render(request, 'guest/order_status.html', {
        'order': order,
        'restaurant': order.restaurant,
        'session_id': request.GET.get('s', ''),
        'lang': lang,
        'static_version': static_ver,
        'i18n_version': 3,
    })

