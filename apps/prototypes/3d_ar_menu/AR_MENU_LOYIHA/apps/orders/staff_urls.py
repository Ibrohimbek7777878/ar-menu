from django.urls import path
from django.shortcuts import render
from apps.orders import staff_views as v

app_name = 'orders_staff'


def staff_page(request):
    """GET /staff/ — ofitsiant buyurtmalar sahifasi"""
    return render(request, 'staff/orders.html', {
        'ws_scheme': 'wss' if request.is_secure() else 'ws',
    })


urlpatterns = [
    path('staff/', staff_page, name='page'),
    path('staff/orders/', v.staff_orders, name='list'),
    path('staff/orders/<int:pk>/accept/', v.order_accept, name='accept'),
    path('staff/orders/<int:pk>/serve/', v.order_serve, name='serve'),
    path('staff/orders/<int:pk>/cancel/', v.order_cancel, name='cancel'),
    path('staff/orders/<int:pk>/cook/', v.order_cook, name='cook'),
    path('staff/orders/<int:pk>/ready/', v.order_ready, name='ready'),
    path('staff/orders/<int:pk>/bill/', v.order_bill, name='bill'),
    path('staff/orders/<int:pk>/pay-cash/', v.order_pay_cash, name='pay-cash'),
    path('staff/dishes/<int:pk>/stop/', v.dish_stop, name='dish-stop'),
]
