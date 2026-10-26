"""
Restoran Buyurtmalar URL marshrutlari.
Prefiks: /api/restaurant/admin/v1/orders/
"""
from django.urls import path

from orders.interfaces.api.orders_admin import (
    OrderDetailView,
    OrderPaymentUpdateView,
    OrderStatusUpdateView,
    OrdersListCreateView,
)

urlpatterns = [
    path('', OrdersListCreateView.as_view(), name='resto_admin_orders_list'),
    path('<int:pk>/', OrderDetailView.as_view(), name='resto_admin_order_detail'),
    path('<int:pk>/status/', OrderStatusUpdateView.as_view(), name='resto_admin_order_status'),
    path('<int:pk>/payment/', OrderPaymentUpdateView.as_view(), name='resto_admin_order_payment'),
]
