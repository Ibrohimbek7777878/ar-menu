"""Mehmon O'QISH API marshrutlari (`/api/guest/v1/`). Faqat GET; yozuv yo'llari o'zgarmagan (web/guest_api.py)."""
from django.urls import path

from web import guest_api

urlpatterns = [
    path('session/', guest_api.session_view, name='guest_api_session'),
    path('welcome/', guest_api.welcome_view, name='guest_api_welcome'),
    path('menu/', guest_api.menu_view, name='guest_api_menu'),
    path('cart/', guest_api.cart_view, name='guest_api_cart'),
    path('checkout/', guest_api.checkout_view, name='guest_api_checkout'),
    path('orders/', guest_api.orders_view, name='guest_api_orders'),
    path('orders/<int:pk>/', guest_api.order_detail_view, name='guest_api_order_detail'),
]
