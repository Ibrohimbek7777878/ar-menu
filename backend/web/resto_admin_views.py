"""
Resto-Admin v1 API va SPA ko'rinishlari (TZ: 1.1, 1.2).

- GET /api/restaurant/admin/v1/session/ -> joriy xodim ma'lumotlari, do'kon (tenant UUID), ruxsatlar (capabilities), flaglar.
- POST /api/restaurant/admin/v1/logout/ -> sessiyani yakunlash.
- /ra/ -> Resto-Admin SPA HTML qobig'i.
"""
import logging
from django.contrib.auth import logout as auth_logout
from django.http import JsonResponse, HttpResponseNotAllowed
from django.middleware.csrf import get_token
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie

from web.restaurant_auth import (
    user_role,
    is_restaurant_staff,
    staff_shop,
    has_capability,
    CAPABILITIES,
    RESTAURANT_STAFF_ROLES,
)

logger = logging.getLogger(__name__)


def resto_admin_spa(request, path=""):
    """
    Resto-Admin SPA qobig'i (/ra/ va /ra/*).
    Agar kirmagan bo'lsa -> /admin/login/?next=...
    Agar xodim bo'lmasa -> 403 / bosh sahifaga.
    """
    user = request.user
    if not getattr(user, 'is_authenticated', False):
        login_url = reverse('restaurant_admin_login')
        next_path = request.get_full_path()
        return redirect(f"{login_url}?next={next_path}")

    if not is_restaurant_staff(user, RESTAURANT_STAFF_ROLES):
        return redirect('restaurant_root')

    return render(request, 'admins/resto.html', {
        'user': user,
    })


@ensure_csrf_cookie
def session_api(request):
    """
    GET /api/restaurant/admin/v1/session/
    Joriy foydalanuvchi, do'kon (tenant), ruxsatlar (capabilities) va sozlama bayroqlarini qaytaradi.
    Kirmagan bo'lsa 401 qaytaradi.
    """
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    user = request.user
    if not getattr(user, 'is_authenticated', False):
        res = JsonResponse({
            'type': 'about:blank',
            'title': 'Unauthorized',
            'status': 401,
            'detail': 'Avval tizimga kiring.',
        }, status=401)
        res['Cache-Control'] = 'no-store'
        return res

    if not is_restaurant_staff(user, RESTAURANT_STAFF_ROLES):
        res = JsonResponse({
            'type': 'about:blank',
            'title': 'Forbidden',
            'status': 403,
            'detail': 'Restoran boshqaruviga ruxsat berilmagan.',
        }, status=403)
        res['Cache-Control'] = 'no-store'
        return res

    shop = staff_shop(request)
    role = user_role(user)

    caps = [cap for cap in CAPABILITIES if has_capability(user, cap)]

    flags = {
        'admin_ui': request.COOKIES.get('admin_ui', 'new'),
        'panel_scope': getattr(shop, 'panel_scope', 'restaurant') if shop else 'restaurant',
        'guest_design': getattr(shop, 'guest_design', 'new') if shop else 'new',
    }

    tenant_data = None
    if shop:
        tenant_data = {
            'id': str(shop.public_id),
            'slug': shop.slug,
            'name': shop.name,
        }

    data = {
        'user': {
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'role': role,
        },
        'tenant': tenant_data,
        'capabilities': caps,
        'flags': flags,
        'csrf': get_token(request),
    }

    res = JsonResponse(data)
    res['Cache-Control'] = 'no-store'
    return res


def logout_api(request):
    """
    POST /api/restaurant/admin/v1/logout/
    Sessiyani yakunlaydi va {'ok': True} qaytaradi.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    auth_logout(request)
    res = JsonResponse({'ok': True})
    res['Cache-Control'] = 'no-store'
    return res


def dashboard_summary_api(request):
    """
    GET /api/restaurant/admin/v1/dashboard/summary/
    Bugungi moliya, faol buyurtmalar, stollar va eng ko'p sotilgan taomlar jamlanmasi.
    Ruxsat: kds yoki finance imkoniyatiga ega restoran xodimlari.
    """
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    user = request.user
    if not getattr(user, 'is_authenticated', False):
        res = JsonResponse({
            'type': 'about:blank',
            'title': 'Unauthorized',
            'status': 401,
            'detail': 'Avval tizimga kiring.',
        }, status=401)
        res['Cache-Control'] = 'no-store'
        return res

    if not is_restaurant_staff(user, RESTAURANT_STAFF_ROLES):
        res = JsonResponse({
            'type': 'about:blank',
            'title': 'Forbidden',
            'status': 403,
            'detail': 'Restoran boshqaruviga ruxsat berilmagan.',
        }, status=403)
        res['Cache-Control'] = 'no-store'
        return res

    shop = staff_shop(request)
    if not shop:
        res = JsonResponse({
            'type': 'about:blank',
            'title': 'Not Found',
            'status': 404,
            'detail': 'Xodimga biriktirilgan restoran topilmadi.',
        }, status=404)
        res['Cache-Control'] = 'no-store'
        return res

    from datetime import timedelta
    from django.db.models import Sum, F
    from finance.services.summary import today_summary
    from orders.models import Order, OrderItem
    from orders.timeutils import local_day_start
    from products.models import Product
    from tables_restaurant.models import Table

    summary = today_summary(shop)
    day_start = local_day_start()
    day_end = day_start + timedelta(days=1)

    active_orders = Order.objects.filter(
        shop=shop,
        status__in=['pending', 'confirmed', 'preparing', 'ready']
    ).count()

    total_tables = Table.objects.filter(shop=shop).count()
    occupied_tables = Table.objects.filter(shop=shop).exclude(status='free').count()

    out_of_stock = Product.objects.filter(shop=shop, is_available=False).count()

    top_dishes_qs = (
        OrderItem.objects.filter(
            order__shop=shop,
            order__created_at__gte=day_start,
            order__created_at__lt=day_end,
        )
        .exclude(order__status__in=['cancelled', 'failed'])
        .values('product_id', 'product__name')
        .annotate(
            total_qty=Sum('quantity'),
            total_sum=Sum(F('quantity') * F('price'))
        )
        .order_by('-total_qty')[:5]
    )

    top_dishes = [
        {
            'id': row['product_id'] or 0,
            'name': row['product__name'] or 'Taom',
            'quantity': row['total_qty'] or 0,
            'total_sum': float(row['total_sum'] or 0),
        }
        for row in top_dishes_qs
    ]

    data = {
        'today_revenue': {
            'total': float(summary['income']),
            'cash': float(summary['income_cash']),
            'card': float(summary['income_card']),
        },
        'orders_count': summary['orders_count'],
        'average_check': float(summary['average_check']),
        'active_orders': active_orders,
        'occupied_tables': occupied_tables,
        'total_tables': total_tables,
        'out_of_stock_count': out_of_stock,
        'top_dishes': top_dishes,
    }

    res = JsonResponse(data)
    res['Cache-Control'] = 'no-store'
    return res
