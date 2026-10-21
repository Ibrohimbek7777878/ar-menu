"""
Restoran xodimlari uchun server tomonidagi kirish nazorati (TZ: R-SEC-02, R-SEC-04).

Frontend'dagi rol (localStorage) faqat ko'rinish uchun — haqiqiy tekshiruv shu yerda.
Xodim Django sessiyasi orqali login + parol bilan kiradi (TZ qarori Q1).
"""
from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.http import JsonResponse
from django.urls import reverse

# Kitchen / hostess rollari Bosqich 3 da qo'shiladi; hozircha ofitsiant ularni qoplaydi.
RESTAURANT_STAFF_ROLES = ('super_admin', 'shop_owner', 'shop_manager', 'waiter')
RESTAURANT_MANAGER_ROLES = ('super_admin', 'shop_owner', 'shop_manager')


def user_role(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    if getattr(user, 'is_superuser', False):
        return 'super_admin'
    return getattr(user, 'role', '') or ''


def is_restaurant_staff(user, roles=RESTAURANT_STAFF_ROLES):
    return bool(user_role(user) in roles and getattr(user, 'is_active', False))


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


def restaurant_staff_required(view_func=None, *, roles=RESTAURANT_STAFF_ROLES, api=False):
    """
    HTML sahifa: login qilmagan → restoran login sahifasiga (?next= bilan).
    JSON API (api=True): 401 / 403.
    """
    def decorator(func):
        @wraps(func)
        def _wrapped(request, *args, **kwargs):
            user = request.user
            if not getattr(user, 'is_authenticated', False):
                return _deny(request, api, 401, "Avval tizimga kiring.")
            if not is_restaurant_staff(user, roles):
                if api:
                    return _deny(request, api, 403, "Bu amal uchun ruxsatingiz yo'q.")
                from django.shortcuts import redirect
                if user_role(user) == 'waiter':
                    return redirect('waiter_panel_web')
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


def guest_order_ids(request):
    session = getattr(request, 'session', None)
    if session is None:
        return []
    return list(session.get(_GUEST_ORDERS_SESSION_KEY, []))


def can_view_order(request, order):
    """Buyurtmani ko'rish: uni bergan mehmon (sessiya) yoki shu restoran xodimi."""
    if order.pk in guest_order_ids(request):
        return True
    if is_restaurant_staff(request.user):
        return user_role(request.user) == 'super_admin' or order.shop_id == getattr(staff_shop(request), 'pk', None)
    return False
