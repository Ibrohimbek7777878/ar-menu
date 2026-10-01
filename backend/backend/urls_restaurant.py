"""
Online Store Guliston — Mahsulot #1: Restoran 3D/AR & NFC Menyu
==============================================================
Port: 8001
Ushbu URLConf faqat Restoran mahsuloti uchun mo'ljallangan:
- Bosh sahifa (/) -> 3D Menyu va interaktiv stol ko'rinishi
- Stollar boshqaruvi, NFC teginish, QR menyu
- Oshxona (KDS), Ofitsiant POS va jonli buyurtma oqimi
- Telegram Restoran Boti (@marketing_orign_bot)
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.views.static import serve

from web import views, tma_views, telegram_webhook, health
from ar3d import views as ar3d_views


def restaurant_admin_redirect(request):
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', '')
        if role == 'super_admin' or getattr(request.user, 'is_superuser', False):
            return redirect('admin_dashboard')
        elif role in ('shop_owner', 'shop_manager'):
            return redirect('seller_tables_web')
        elif role == 'waiter':
            return redirect('waiter_panel_web')
    return redirect('web_login')


urlpatterns = [
    # Health check
    path('health/', health.health_check, name='health_check'),

    # ASOSIY BOSH SAHIFA: Restoran 3D Menyu
    path('', tma_views.tma_home, name='restaurant_root'),
    path('restaurant/', tma_views.tma_home, name='restaurant_home'),
    path('restoran/', tma_views.tma_home, name='restoran_home'),
    path('ar-menu/', tma_views.tma_home, name='ar_menu_home'),
    path('menu/', tma_views.tma_home, name='tma_menu'),
    path('tma/', tma_views.tma_home, name='tma_home'),

    # Restoran Taomlar va Stol navigatsiyasi
    path('catalog/', tma_views.tma_catalog, name='restaurant_catalog'),
    path('menu/catalog/', tma_views.tma_catalog, name='tma_menu_catalog'),
    path('tma/catalog/', tma_views.tma_catalog, name='tma_catalog'),

    path('table/', tma_views.tma_table_hub, name='restaurant_table_hub'),
    path('menu/table/', tma_views.tma_table_hub, name='tma_menu_table'),
    path('tma/table/', tma_views.tma_table_hub, name='tma_table_hub'),

    path('cart/', tma_views.tma_cart, name='restaurant_cart'),
    path('menu/cart/', tma_views.tma_cart, name='tma_menu_cart'),
    path('tma/cart/', tma_views.tma_cart, name='tma_cart'),
    path('api/cart/', tma_views.tma_cart_api, name='restaurant_cart_api'),
    path('tma/api/cart/', tma_views.tma_cart_api, name='tma_cart_api'),

    path('checkout/', tma_views.tma_checkout, name='restaurant_checkout'),
    path('menu/checkout/', tma_views.tma_checkout, name='tma_menu_checkout'),
    path('tma/checkout/', tma_views.tma_checkout, name='tma_checkout'),

    path('orders/', tma_views.tma_orders, name='restaurant_orders'),
    path('menu/orders/', tma_views.tma_orders, name='tma_menu_orders'),
    path('tma/orders/', tma_views.tma_orders, name='tma_orders'),
    path('order/<int:pk>/', tma_views.tma_order_detail, name='restaurant_order_detail'),
    path('tma/order/<int:pk>/', tma_views.tma_order_detail, name='tma_order_detail'),

    # NFC va QR Stol Zanjiri
    path('nfc/<str:code>/', views.nfc_tap_handler, name='nfc_tap_handler'),
    path('t/<uuid:token>/', views.table_menu_redirect, name='table_menu_redirect'),
    path('m/<slug:slug>/', views.ar_menu_page, name='ar_menu_page'),
    path('ar/', views.ar_catalog, name='ar_catalog'),

    # Mini ERP (Restoran Boshqaruvi: Stollar, KDS, Ofitsiant)
    path('seller/', include('web.seller_urls')),

    # Telegram Bot Webhook
    path('bot/restaurant/webhook/', telegram_webhook.restaurant_webhook, name='bot_restaurant_webhook'),
    path('bot/webhook/', telegram_webhook.restaurant_webhook, name='bot_webhook'),
    path('telegram/webhook/', telegram_webhook.restaurant_webhook, name='telegram_webhook'),
    path('telegram/chat-ids/', telegram_webhook.telegram_set_chat_id, name='telegram_chat_ids'),
    path('telegram/send-test/', telegram_webhook.telegram_send_test, name='telegram_send_test'),

    # Admin va Auth
    path('admin/login/', views.web_login, name='web_login'),
    path('admin/register/', views.web_register, name='web_register'),
    path('admin/logout/', views.web_logout, name='web_logout'),
    path('admin', restaurant_admin_redirect),
    path('admin/', restaurant_admin_redirect),
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('djangoadmin/', admin.site.urls),

    # AR3D App URL'lari
    path('', include('ar3d.urls')),

    # REST API endpoints (Stollar, buyurtmalar, to'lov)
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/categories/', include('categories.urls')),
    path('api/v1/shops/', include('shops.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/payments/', include('payments.api_urls')),
    path('payment/', include('payments.urls')),

    # Xavfsizlik fallback'lari (boshqa mahsulot nomlari chaqirilganda reverse xatosi bermaslik uchun)
    path('market/', views.customer_home, name='customer_home'),
    path('market/catalog/', views.customer_catalog, name='customer_catalog'),
    path('market/search/', views.customer_search, name='customer_search'),
    path('market/profile/', views.customer_profile, name='customer_profile'),
    path('market/wishlist/', views.customer_wishlist, name='customer_wishlist'),
    path('studio/', ar3d_views.print_3d_studio_page, name='studio_home'),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static/assets')}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
