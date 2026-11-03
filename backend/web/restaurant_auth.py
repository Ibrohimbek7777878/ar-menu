"""
Restoran xodimlari uchun server tomonidagi kirish nazorati (TZ: R-SEC-02, R-SEC-04).

Frontend'dagi rol (localStorage) faqat ko'rinish uchun — haqiqiy tekshiruv shu yerda.
Xodim Django sessiyasi orqali login + parol bilan kiradi (TZ qarori Q1).
"""
from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.http import JsonResponse
from django.urls import reverse

from web.capabilities import (  # noqa: F401  (qayta eksport: boshqa modullar shu yerdan import qiladi)
    CAPABILITIES,
    CAPABILITY_KEYS,
    MANAGEMENT_CAPABILITIES,
    RESTAURANT_MANAGER_ROLES,
    RESTAURANT_STAFF_ROLES,
    effective_capabilities_for,
)

# Ruxsat matritsasi va katalog — `web/capabilities.py` (yagona manba). Xodimning SAMARALI ruxsati: rol standarti,
# unga qo'shimcha berilganlar, olib tashlanganlar (`AdminUser.extra_capabilities` / `revoked_capabilities`).


def capabilities_of(user):
    """Xodimning samarali ruxsatlari (katalog tartibida). Faol, tasdiqlangan, restoranga bog'langan xodim bo'lmasa — bo'sh."""
    if not is_restaurant_staff(user):
        return []
    return effective_capabilities_for(
        user_role(user), getattr(user, 'extra_capabilities', None), getattr(user, 'revoked_capabilities', None))


def has_capability(user, capability):
    if capability not in CAPABILITIES:
        raise KeyError(capability)                 # imlo xatosi jimgina "ruxsat yo'q" bo'lib qolmasin
    return capability in capabilities_of(user)


def has_role_capability(user, capability):
    """
    Faqat ROL + shaxsiy ruxsatlar bo'yicha hisob (xodim faolligi, tasdig'i va restoran bog'lanishini tekshirmaydi).
    Eski Django `/seller/` sahifalari o'z kirish qoidasiga ega (`seller_required`); u shu yerdan faqat "bu foydalanuvchiga
    bo'lim ruxsat etilganmi" savoliga javob oladi.
    """
    if capability not in CAPABILITIES:
        raise KeyError(capability)
    return capability in effective_capabilities_for(
        user_role(user), getattr(user, 'extra_capabilities', None), getattr(user, 'revoked_capabilities', None))


def has_any_capability(user, capabilities):
    allowed = set(capabilities_of(user))
    return any(cap in allowed for cap in capabilities)


def has_management_access(user):
    """Kamida bitta BOSHQARUV ruxsati bor xodim: /ra/ (boshqaruv paneli) unga ochiq."""
    return has_any_capability(user, MANAGEMENT_CAPABILITIES)


def role_home_url(user):
    """Rolga mos bosh sahifa: login'dan keyin va ruxsatsiz sahifadan qaytarilganda (R2-3)."""
    from django.urls import NoReverseMatch, reverse
    name = {'waiter': 'waiter_mobile_panel', 'kitchen': 'restaurant_kds', 'hostess': 'arrival_desk'}.get(
        user_role(user), 'restaurant_admin_dashboard')
    try:
        return reverse(name)
    except NoReverseMatch:
        return '/'


# Xodimga yuboriladigan kirish havolasi qaysi sahifaga olib borishi: rol → (panel kaliti, o'zbekcha nomi).
# Bu yo'llar HAQIQIY ishlaydigan sahifalar (kod va brauzerda tekshirilgan): login'dan keyin shu sahifa ochiladi va
# `restaurant_staff_required` shu rolni o'tkazadi. Ofitsiant uchun `/waiter/panel/` tanlangan (`/seller/waiter/` emas):
# sessiya tugasa u xodim login sahifasiga qaytaradi, `/seller/waiter/` esa ofitsiant kira olmaydigan sotuvchi loginiga.
_PANEL_BY_ROLE = {
    'super_admin': 'manager', 'shop_owner': 'manager', 'shop_manager': 'manager',
    'waiter': 'waiter', 'kitchen': 'kitchen', 'hostess': 'hostess',
}
# panel kaliti → (marshrut nomi yoki None, zaxira yo'l, nomi). `/ra/` regex marshrut: teskari qidirib bo'lmaydi.
_PANELS = {
    'manager': (None, '/ra/', 'Boshqaruv paneli'),
    'waiter': ('waiter_mobile_panel', '/waiter/panel/', 'Ofitsiant paneli'),
    'kitchen': ('restaurant_kds', '/kds/', 'Oshxona ekrani'),
    'hostess': ('arrival_desk', '/arrival/desk/', 'Qabul stoli'),
}


def role_panel(role):
    """Rolga mos ish sahifasi: {'path': '/waiter/panel/', 'label': 'Ofitsiant paneli'}; restoran paneliga kirmaydigan rol uchun None."""
    key = _PANEL_BY_ROLE.get(role or '')
    if not key:
        return None
    from django.urls import NoReverseMatch, reverse
    route_name, fallback_path, label = _PANELS[key]
    path = fallback_path
    if route_name:
        try:
            path = reverse(route_name)
        except NoReverseMatch:
            pass
    return {'path': path, 'label': label}


def user_role(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    if getattr(user, 'is_superuser', False):
        return 'super_admin'
    return getattr(user, 'role', '') or ''


def _own_shop_id(user):
    """Xodim ishlaydigan restoran ID si: `user.shop`, bo'lmasa egasi bo'lgan (birinchi) do'kon. Yo'q bo'lsa None."""
    shop_id = getattr(user, 'shop_id', None)
    if shop_id is not None:
        return shop_id
    if not getattr(user, 'pk', None):
        return None
    memo = getattr(user, '_gulistan_owned_shop_id', False)
    if memo is not False:
        return memo
    from shops.models import Shop
    owned = Shop.objects.filter(owner_id=user.pk).order_by('pk').values_list('pk', flat=True).first()
    try:
        user._gulistan_owned_shop_id = owned
    except AttributeError:
        pass
    return owned


def user_belongs_to_shop(user, shop_id):
    """
    Foydalanuvchi shu restoran (tenant) xodimimi? Multi-tenant: boshqa restoran xodimi, hatto to'g'ri parol bilan ham, bu
    tenantga kira olmaydi. `super_admin` (platforma operatori) istisno. Do'konsiz xodim hech qaysi tenantga tegishli emas.
    """
    if user_role(user) == 'super_admin':
        return True
    if not getattr(user, 'is_authenticated', False) or shop_id is None:
        return False
    return _own_shop_id(user) == shop_id


LOGIN_DENIED_FOREIGN_TENANT = "Bu restoran uchun hisob emas."
LOGIN_DENIED_PLATFORM_HOST = "Bu manzildan faqat platforma administratori kira oladi. O'z restoraningiz manzilidan kiring."


def login_denied_message(user):
    """Multi-tenant: shu hostda `user` kira olmasa sabab matni (o'zbekcha), aks holda None. `super_admin` istisno."""
    from shops.tenancy import current_tenant, on_platform_host
    if user_role(user) == 'super_admin':
        return None
    tenant = current_tenant()
    if tenant is not None and not user_belongs_to_shop(user, tenant.pk):
        return LOGIN_DENIED_FOREIGN_TENANT
    if tenant is None and on_platform_host():
        return LOGIN_DENIED_PLATFORM_HOST
    return None


def _has_restaurant_scope(user):
    """
    Platforma admini bundan mustasno, xodim aniq bir restoranga bog'langan bo'lishi shart. Do'konsiz hisob avval
    `shop or get_or_default_shop()` orqali asosiy restoranga tushib qolardi (kassa, bronlar, taom yaratish).
    Faqat "ha" natija eslab qolinadi: do'kon keyin biriktirilsa eski "yo'q" javob qolib ketmasin.
    Multi-tenant (`<mijoz>.PLATFORM_DOMAIN`): xodimning restorani ALBATTA shu tenant bo'lishi shart — sessiya ham, JWT ham.
    """
    if user_role(user) == 'super_admin':
        return True
    from shops.tenancy import current_tenant_id, on_platform_host
    tenant_id = current_tenant_id()
    if tenant_id is not None:
        return user_belongs_to_shop(user, tenant_id)
    if on_platform_host():
        return False           # platforma hostida (apex/www/app) faqat platforma admini; restoran xodimi o'z subdomenidan kiradi
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
    Multi-tenant hostida (`<mijoz>.PLATFORM_DOMAIN`) har doim SHU tenant: super_admin uchun ham; boshqa restoran xodimi
    uchun None (chaqiruvchilar "Restoran topilmadi" deydi, ruxsat qatlami esa allaqachon 403 bergan).
    """
    from shops.tenancy import current_tenant
    user = request.user
    tenant = current_tenant()
    if user_role(user) == 'super_admin':
        if tenant is not None:
            return tenant
        if request.GET.get('shop'):
            return getattr(request, 'tenant_shop', None)
        from notifications.admin_bot import get_restaurant_shop
        return get_restaurant_shop()
    shop = getattr(user, 'shop', None)
    if not shop:
        from shops.models import Shop
        shop = Shop.objects.filter(owner=user).first()
    if tenant is not None and (shop is None or shop.pk != tenant.pk):
        return None
    return shop


def _deny(request, api, status, message):
    if api:
        return JsonResponse({'success': False, 'error': message, 'code': 'STAFF_ONLY'}, status=status)
    return redirect_to_login(request.get_full_path(), login_url=reverse('restaurant_admin_login'))


def restaurant_staff_required(view_func=None, *, roles=RESTAURANT_STAFF_ROLES, api=False, capability=None):
    """
    HTML sahifa: login qilmagan → restoran login sahifasiga (?next= bilan); xodim lekin ruxsati yo'q → o'z bosh sahifasiga.
    JSON API (api=True): 401 / 403. `capability` berilsa (kalit yoki kalitlar kortejidan KAMIDA BITTASI), tekshiruv
    xodimning SAMARALI ruxsatlari bo'yicha (rol standarti + qo'shimcha − olib tashlangan); aks holda `roles` bo'yicha.
    """
    wanted = None
    if capability:
        wanted = (capability,) if isinstance(capability, str) else tuple(capability)
        unknown = [cap for cap in wanted if cap not in CAPABILITIES]
        if unknown:
            raise KeyError(unknown[0])             # dekorator o'rnatilganda (import paytida) xato bilinsin

    def decorator(func):
        @wraps(func)
        def _wrapped(request, *args, **kwargs):
            user = request.user
            if not getattr(user, 'is_authenticated', False):
                return _deny(request, api, 401, "Avval tizimga kiring.")
            allowed = has_any_capability(user, wanted) if wanted else is_restaurant_staff(user, roles)
            if not allowed:
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
        # Marshrut-ruxsat testlari (web/test_route_permissions.py) shu belgidan sahifa qaysi ruxsatni talab qilishini bilib oladi
        _wrapped.staff_capabilities = wanted
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
    # Restoranga oid sozlamalar avval restoranning o'zidan (business_profile), keyin global AppSetting'dan o'qiladi
    # (shops/tenant_settings.py). Mehmon: restoran `guest_profile` orqali (bitta so'rov, jarayon keshi); xodim: o'z restorani.
    staff_shop_obj = staff_shop(request) if role else None
    guest_prof = None
    if not role:
        from shops.guest_profile import guest_profile
        guest_prof = guest_profile(guest_shop_id(request), request)
    payload = {'role': role or 'guest', 'roles': _SPA_ROLES.get(role, []), 'demo': bool(getattr(settings, 'DEMO_MODE', False)),
               # Mehmon dizayni (yangi/eski): kodni o'zgartirmasdan admin sozlamadan almashtiriladi
               'design': (guest_prof or {}).get('design') or get_choice('guest_design', 'new', ('new', 'classic'), shop=staff_shop_obj)}
    if role:
        payload['name'] = (user.get_full_name() or user.get_username()).strip()
        # Admin paneldan sozlanadigan ish qiymatlari (kodni o'zgartirmasdan): KDS taymeri ogohlantirish chegaralari
        from backend.app_settings import get_int
        warn = get_int('kds_warn_minutes', 10, 1, 120, shop=staff_shop_obj)
        payload['config'] = {'kds_warn_minutes': warn,
                             'kds_late_minutes': max(warn + 1, get_int('kds_late_minutes', 20, 2, 240, shop=staff_shop_obj))}
    else:
        # Fasl, animatsiya, taom oynasi, kun/tun, tillar va palitra: mehmonga, dizayn tartibidan (new/classic) QAT'I NAZAR
        # (egasi qarori 2026-11-03: imkoniyatlar eski tartibda ham ishlasin); standart bo'lsa kalit umuman yo'q (javob avvalgidek).
        # Restoran bir marta aniqlanadi, sozlamalar BITTA so'rov bilan o'qiladi va jarayon keshida turadi.
        from shops.guest_profile import guest_session_extras
        payload.update(guest_session_extras(guest_shop_id(request), request=request))
    return payload


def guest_shop_id(request):
    """`_guest_shop_id` natijasi so'rov ichida bir marta hisoblanadi (sessiya + palitra + shablon bir necha marta so'raydi)."""
    memo = getattr(request, '_gulistan_guest_shop_id', None)
    if memo is not None:
        return memo[0]
    value = _guest_shop_id(request)
    try:
        request._gulistan_guest_shop_id = (value,)
    except Exception:  # noqa: BLE001
        pass
    return value


def _guest_shop_id(request):
    """Mehmon sahifasi qaysi restoranniki: QR stol restorani, bo'lmasa asosiy restoran. Kesh orqali, qo'shimcha SQL yo'q."""
    from backend.runtime_cache import cached_shop_value
    shop_id = None
    session = getattr(request, 'session', None)
    raw = session.get('tma_table_token') if session is not None else None
    if raw:
        def _table_shop_id():
            table = guest_session_table(request, check_tenant=False)   # tenant filtri keshdan KEYIN (kesh tenantga bog'liq emas)
            return table.shop_id if table is not None else None
        shop_id = cached_shop_value(('table', str(raw)), 'shop_id', _table_shop_id)
        # Multi-tenant: boshqa tenantning stoli (tokeni eslab qolingan bo'lsa ham) shu saytga ta'sir qilmaydi
        from shops.tenancy import current_tenant_id
        tenant_id = current_tenant_id()
        if tenant_id is not None and shop_id != tenant_id:
            shop_id = None
    if not shop_id:
        from notifications.admin_bot import default_restaurant_shop_id
        shop_id = default_restaurant_shop_id()    # tenant hostida shu tenant
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


def guest_session_table(request, check_tenant=True):
    """Mehmon QR skanerlaganda sessiyada eslab qolingan stol (tasodifiy token orqali), aks holda None.
    Multi-tenant hostida boshqa tenantning stoli ham None (stol topilmadi kabi)."""
    import uuid
    raw = session_table_token(request)
    if not raw:
        return None
    try:
        token = uuid.UUID(raw.strip())
    except (ValueError, TypeError, AttributeError):
        return None
    from tables_restaurant.models import Table
    table = Table.objects.filter(qr_token=token, is_active=True).select_related('shop', 'hall').first()
    if table is not None and check_tenant and not table_visible_for_tenant(table):
        return None
    return table


def table_visible_for_tenant(table):
    """Multi-tenant: stol shu saytning tenantiga tegishlimi? Tenant bo'lmasa (localhost/demo) har doim ha."""
    if table is None:
        return False
    from shops.tenancy import current_tenant_id
    tenant_id = current_tenant_id()
    return tenant_id is None or table.shop_id == tenant_id


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
