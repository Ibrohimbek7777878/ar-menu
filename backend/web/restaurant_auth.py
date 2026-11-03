"""
Restoran xodimlari uchun server tomonidagi kirish nazorati (TZ: R-SEC-02, R-SEC-04).

Frontend'dagi rol (localStorage) faqat ko'rinish uchun — haqiqiy tekshiruv shu yerda.
Xodim Django sessiyasi orqali login + parol bilan kiradi (TZ qarori Q1).
"""
from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.http import JsonResponse
from django.urls import reverse

RESTAURANT_MANAGER_ROLES = ('super_admin', 'shop_owner', 'shop_manager')
RESTAURANT_STAFF_ROLES = RESTAURANT_MANAGER_ROLES + ('waiter', 'kitchen', 'hostess')

# Ruxsat matritsasi (TZ: R2-1): imkoniyat → qaysi rollar. Har rol faqat o'z ishiga kerakli narsani ko'radi:
#   oshpaz — faqat KDS; hostess — faqat bron va stollar holati; ofitsiant — POS va chaqiruvlar; moliya — rahbariyat.
CAPABILITIES = {
    'kds_screen': RESTAURANT_MANAGER_ROLES + ('kitchen',),               # KDS (oshxona) sahifasi
    'kds': RESTAURANT_MANAGER_ROLES + ('kitchen', 'waiter'),             # KDS API: buyurtmalar, holat, taom belgilari
    'pos': RESTAURANT_MANAGER_ROLES + ('waiter',),                       # stol hisobi, taom qo'shish, chaqiruvlar
    'tables_read': RESTAURANT_MANAGER_ROLES + ('waiter', 'hostess'),     # stollar holatini ko'rish
    'reservations': RESTAURANT_MANAGER_ROLES + ('hostess',),             # bronlar va hostess ekrani
    'stoplist': RESTAURANT_MANAGER_ROLES + ('kitchen', 'waiter'),        # taom tugadi/qaytdi (stop-list)
    'menu_admin': RESTAURANT_MANAGER_ROLES,                              # menyu, 3D modellar
    'finance': RESTAURANT_MANAGER_ROLES,
}


def has_capability(user, capability):
    return is_restaurant_staff(user, CAPABILITIES[capability])


def role_home_url(user):
    """Rolga mos bosh sahifa: login'dan keyin va ruxsatsiz sahifadan qaytarilganda (R2-3)."""
    from django.urls import NoReverseMatch, reverse
    name = {'waiter': 'waiter_panel_web', 'kitchen': 'restaurant_kds', 'hostess': 'arrival_desk'}.get(
        user_role(user), 'restaurant_admin_dashboard')
    try:
        return reverse(name)
    except NoReverseMatch:
        return '/'


def user_role(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    if getattr(user, 'is_superuser', False):
        return 'super_admin'
    return getattr(user, 'role', '') or ''


def _has_restaurant_scope(user):
    """
    Platforma admini bundan mustasno, xodim aniq bir restoranga bog'langan bo'lishi shart. Do'konsiz hisob avval
    `shop or get_or_default_shop()` orqali asosiy restoranga tushib qolardi (kassa, bronlar, taom yaratish).
    Faqat "ha" natija eslab qolinadi: do'kon keyin biriktirilsa eski "yo'q" javob qolib ketmasin.
    """
    if user_role(user) == 'super_admin':
        return True
    if getattr(user, '_restaurant_scope_ok', False):
        return True
    ok = bool(getattr(user, 'shop_id', None))
    if not ok:
        from shops.models import Shop
        ok = Shop.objects.filter(owner_id=user.pk).exists()
    if ok:
        try:
            user._restaurant_scope_ok = True
        except AttributeError:
            pass
    return ok


def is_restaurant_staff(user, roles=RESTAURANT_STAFF_ROLES):
    if not (user_role(user) in roles and getattr(user, 'is_active', False)):
        return False
    from accounts.policy import is_account_approved
    return is_account_approved(user) and _has_restaurant_scope(user)


def staff_shop(request):
    """
    Xodim ishlaydigan restoran. Oddiy xodim faqat o'z do'koniga bog'lanadi
    (boshqa do'konga "fallback" yo'q). super_admin — tenant middleware tanlagan do'kon.
    """
    user = request.user
    if user_role(user) == 'super_admin':
        if request.GET.get('shop'):
            return getattr(request, 'tenant_shop', None)
        from notifications.admin_bot import get_restaurant_shop
        return get_restaurant_shop()
    shop = getattr(user, 'shop', None)
    if shop:
        return shop
    from shops.models import Shop
    return Shop.objects.filter(owner=user).first()


def _deny(request, api, status, message):
    if api:
        return JsonResponse({'success': False, 'error': message, 'code': 'STAFF_ONLY'}, status=status)
    return redirect_to_login(request.get_full_path(), login_url=reverse('restaurant_admin_login'))


def restaurant_staff_required(view_func=None, *, roles=RESTAURANT_STAFF_ROLES, api=False, capability=None):
    """
    HTML sahifa: login qilmagan → restoran login sahifasiga (?next= bilan); xodim lekin ruxsati yo'q → o'z bosh sahifasiga.
    JSON API (api=True): 401 / 403. `capability` berilsa, rollar CAPABILITIES matritsasidan olinadi.
    """
    if capability:
        roles = CAPABILITIES[capability]

    def decorator(func):
        @wraps(func)
        def _wrapped(request, *args, **kwargs):
            user = request.user
            if not getattr(user, 'is_authenticated', False):
                return _deny(request, api, 401, "Avval tizimga kiring.")
            if not is_restaurant_staff(user, roles):
                if api:
                    return _deny(request, api, 403, "Bu amal uchun ruxsatingiz yo'q.")
                from django.http import HttpResponseForbidden
                from django.shortcuts import redirect
                if is_restaurant_staff(user):
                    home = role_home_url(user)
                    if home == request.path:           # o'z bosh sahifasi ham taqiqlangan bo'lsa — aylanib qolmaslik uchun
                        return HttpResponseForbidden("Bu sahifaga ruxsatingiz yo'q.")
                    return redirect(home)
                return redirect('restaurant_admin_login')
            if not api:
                # React xodim panellari POST/PATCH da X-CSRFToken yuboradi — cookie doim mavjud bo'lsin
                from django.middleware.csrf import get_token
                get_token(request)
            return func(request, *args, **kwargs)
        return _wrapped

    if view_func is not None:
        return decorator(view_func)
    return decorator


# ─── Mehmonning o'z buyurtmalari (TZ: R-SEC-11) ───────────────────────────────
# Mehmon akkauntsiz ishlaydi, shuning uchun u bergan buyurtmalar sessiyada eslab qolinadi:
# /orders/ va /tma/order/<pk>/ faqat shu buyurtmalarni ko'rsatadi (ketma-ket pk bilan boshqalarnikini emas).
_GUEST_ORDERS_SESSION_KEY = 'my_order_ids'
_GUEST_ORDERS_LIMIT = 50


def remember_guest_order(request, order):
    session = getattr(request, 'session', None)
    if session is None or not getattr(order, 'pk', None):
        return
    ids = [i for i in session.get(_GUEST_ORDERS_SESSION_KEY, []) if i != order.pk]
    ids.append(order.pk)
    session[_GUEST_ORDERS_SESSION_KEY] = ids[-_GUEST_ORDERS_LIMIT:]
    session.modified = True


# React paneli rollari: server roli → panel roli (har xodim aynan bitta panelga ega; rahbariyat — hammasiga).
_SPA_ROLE = {'super_admin': 'admin', 'shop_owner': 'admin', 'shop_manager': 'admin',
             'waiter': 'waiter', 'kitchen': 'kitchen', 'hostess': 'hostess'}
_SPA_ROLES = {'admin': ['admin'], 'waiter': ['waiter'], 'kitchen': ['kitchen'], 'hostess': ['hostess']}


def spa_session(request):
    """React uchun HAQIQIY (server tasdiqlagan) sessiya: {role, roles, name, demo}.

    Avval panel roli brauzerning localStorage'iga yoki ?staff_grant= havolasiga qarab berilardi: istalgan mehmon
    `/?staff_grant=admin` ochib admin interfeysini ko'ra olardi. Endi rol faqat Django sessiyasidan keladi; eski
    qurilma-ruxsatnomasi mexanizmi faqat DEMO_MODE'da ishlaydi (o'chirilmagan, flag ortiga yashirilgan).
    """
    from django.conf import settings
    user = getattr(request, 'user', None)
    role = _SPA_ROLE.get(user_role(user), '') if is_restaurant_staff(user) else ''
    from backend.app_settings import get_choice
    payload = {'role': role or 'guest', 'roles': _SPA_ROLES.get(role, []), 'demo': bool(getattr(settings, 'DEMO_MODE', False)),
               # Mehmon dizayni (yangi/eski): kodni o'zgartirmasdan admin sozlamadan almashtiriladi
               'design': get_choice('guest_design', 'new', ('new', 'classic'))}
    if role:
        payload['name'] = (user.get_full_name() or user.get_username()).strip()
        # Admin paneldan sozlanadigan ish qiymatlari (kodni o'zgartirmasdan): KDS taymeri ogohlantirish chegaralari
        from backend.app_settings import get_int
        warn = get_int('kds_warn_minutes', 10, 1, 120)
        payload['config'] = {'kds_warn_minutes': warn, 'kds_late_minutes': max(warn + 1, get_int('kds_late_minutes', 20, 2, 240))}
    elif payload['design'] == 'new':
        # Fasl rangi, animatsiya, taom oynasi, kun/tun va tillar: faqat mehmonga va faqat yangi dizaynda; standart bo'lsa kalit
        # umuman yo'q (javob avvalgidek). Restoran bir marta aniqlanadi, sozlamalar BITTA so'rov bilan o'qiladi va jarayon keshida turadi.
        from shops.guest_profile import guest_session_extras
        payload.update(guest_session_extras(guest_shop_id(request)))
    return payload


def guest_shop_id(request):
    """Mehmon sahifasi qaysi restoranniki: QR stol restorani, bo'lmasa asosiy restoran. Kesh orqali, qo'shimcha SQL yo'q."""
    from backend.runtime_cache import cached_shop_value
    shop_id = None
    session = getattr(request, 'session', None)
    raw = session.get('tma_table_token') if session is not None else None
    if raw:
        def _table_shop_id():
            table = guest_session_table(request)
            return table.shop_id if table is not None else None
        shop_id = cached_shop_value(('table', str(raw)), 'shop_id', _table_shop_id)
    if not shop_id:
        from notifications.admin_bot import default_restaurant_shop_id
        shop_id = default_restaurant_shop_id()
    return shop_id


def guest_season(request):
    """Mehmon sahifasi fasl rangi (''/kuz/qish/bahor/yoz)."""
    from shops.guest_season import guest_season_for_shop_id
    return guest_season_for_shop_id(guest_shop_id(request))


def session_table_token(request):
    """Sessiyada eslab qolingan stol tokeni, agar bog'lanish muddati o'tmagan bo'lsa (aks holda sessiyadan olib tashlanadi).

    Bog'lanish vaqti token o'zgargan paytdan hisoblanadi (har qanday joyda yozilgan token uchun ishlaydi); QR qayta
    skanerlansa `bind_session_table` muddatni yangilaydi.
    """
    import time
    from django.conf import settings
    session = getattr(request, 'session', None)
    raw = session.get('tma_table_token') if session is not None else None
    if not raw:
        return None
    raw = str(raw)
    now = int(time.time())
    if session.get('tma_table_bound_for') != raw:
        session['tma_table_bound_for'] = raw
        session['tma_table_bound_at'] = now
        session.modified = True
        return raw
    ttl = getattr(settings, 'RESTAURANT_TABLE_BINDING_TTL_SECONDS', 0)
    if ttl and now - int(session.get('tma_table_bound_at') or now) > ttl:
        for key in ('tma_table_token', 'tma_table_bound_for', 'tma_table_bound_at'):
            session.pop(key, None)
        session.modified = True
        return None
    return raw


def bind_session_table(request, token):
    """QR skanerlandi: stolni sessiyaga yozadi va bog'lanish muddatini yangidan boshlaydi."""
    import time
    request.session['tma_table_token'] = token
    request.session['tma_table_bound_for'] = str(token)
    request.session['tma_table_bound_at'] = int(time.time())
    request.session.modified = True


def guest_session_table(request):
    """Mehmon QR skanerlaganda sessiyada eslab qolingan stol (tasodifiy token orqali), aks holda None."""
    import uuid
    raw = session_table_token(request)
    if not raw:
        return None
    try:
        token = uuid.UUID(raw.strip())
    except (ValueError, TypeError, AttributeError):
        return None
    from tables_restaurant.models import Table
    return Table.objects.filter(qr_token=token, is_active=True).select_related('shop', 'hall').first()


def guest_order_ids(request):
    session = getattr(request, 'session', None)
    if session is None:
        return []
    return list(session.get(_GUEST_ORDERS_SESSION_KEY, []))


def can_view_order(request, order):
    """Buyurtmani ko'rish: uni bergan mehmon (sessiya) yoki buyurtma bilan ishlaydigan shu restoran xodimi
    (rahbariyat, ofitsiant, oshpaz; hostess buyurtma ma'lumotini ko'rmaydi)."""
    if order.pk in guest_order_ids(request):
        return True
    if has_capability(request.user, 'kds'):
        return user_role(request.user) == 'super_admin' or order.shop_id == getattr(staff_shop(request), 'pk', None)
    return False
