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

from web import views, seller_views, tma_views, telegram_webhook, health, resto_admin_views, guest_booking


def other_product_page(request, *args, **kwargs):
    """Boshqa mahsulotga (market, 3D bosma studiyasi) tegishli sahifalar restoran domenida ochilmaydi: mehmon menyuga qaytadi.
    Marshrut nomlari saqlanadi (shablonlardagi {% url %} sinmasligi uchun); sahifalarning o'zi boshqa URLConf'larda ishlayveradi."""
    return redirect('restaurant_root')


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
    path('health/live/', health.health_live, name='health_live'),
    path('health/ready/', health.health_ready, name='health_ready'),

    # ASOSIY BOSH SAHIFA: Saytga kirganda 1-bo'lib Welcome & Entry ekrani ochiladi
    path('', tma_views.tma_welcome, name='restaurant_root'),
    path('welcome/', tma_views.tma_welcome, name='tma_welcome'),

    # Restoran Dasturxon Menyusi (Taomlar va Stol buyurtmasi)
    path('menu/', tma_views.tma_home, name='tma_menu'),
    path('book/', guest_booking.book_page, name='tma_book'),            # stol bron qilish (mehmon React ilovasi, BookingPage)
    path('tour/', include('tours.interfaces.page_urls')),               # video sayr (mehmon React ilovasi, TourPage), /book/ kabi
    path('restaurant/', tma_views.tma_home, name='restaurant_home'),
    path('restoran/', tma_views.tma_home, name='restoran_home'),
    path('ar-menu/', tma_views.tma_home, name='ar_menu_home'),
    path('tma/', tma_views.tma_home, name='tma_home'),

    # REPLIT DIZAYN PROTOTIPI (9 TA EKRAN):
    path('reservation/arrival/', tma_views.tma_arrival_confirm, name='tma_arrival_confirm'),
    path('reservation/find/', tma_views.tma_find_reservation, name='tma_find_reservation'),
    path('arrival/desk/', tma_views.arrival_desk, name='arrival_desk'),
    path('arrival/timeline/', tma_views.arrival_timeline, name='arrival_timeline'),
    path('arrival/checklist/', tma_views.arrival_checklist, name='arrival_checklist'),
    path('waiter/panel/', tma_views.waiter_mobile_panel, name='waiter_mobile_panel'),
    path('waiter/mobile/', tma_views.waiter_mobile_panel),
    path('ofitsiant/', tma_views.waiter_mobile_panel),
    path('waiter/desk/', tma_views.arrival_desk),
    path('waiter/timeline/', tma_views.arrival_timeline),
    path('waiter/checklist/', tma_views.arrival_checklist),

    # UI Komponentlar Laboratoriyasi (Design System Showcase)
    path('ui-components/', tma_views.ui_components_showcase, name='ui_components_showcase'),
    path('design-system/', tma_views.ui_components_showcase, name='design_system_showcase'),

    # Oshxona Ekrani (Kitchen Display System - KDS)
    path('kds/', tma_views.kds_screen, name='restaurant_kds'),
    path('kitchen/', tma_views.kds_screen, name='restaurant_kitchen'),
    path('api/kds/orders/', tma_views.kds_orders_api, name='restaurant_kds_orders_api'),
    path('api/kds/status/', tma_views.kds_status_update_api, name='restaurant_kds_status_api'),

    # Restoran Taomlar va Stol navigatsiyasi
    path('catalog/', tma_views.tma_catalog, name='restaurant_catalog'),
    path('menu/catalog/', tma_views.tma_catalog, name='tma_menu_catalog'),
    path('tma/catalog/', tma_views.tma_catalog, name='tma_catalog'),

    path('table/', tma_views.tma_table_hub, name='restaurant_table_hub'),
    path('reservation/', tma_views.tma_table_hub, name='restaurant_reservation'),
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
    path('ar/', tma_views.tma_ar_menu, name='ar_catalog'),
    path('ar-menu/', tma_views.tma_ar_menu, name='ar_menu_home'),

    # Mini ERP (Restoran Boshqaruvi: Stollar, KDS, Ofitsiant)
    path('seller/reviews/<int:pk>/delete/', seller_views.seller_review_delete, name='admin_review_delete'),
    path('seller/', include('web.seller_urls')),
    # `seller/order_detail.html` shabloni eski umumiy admin URL nomlarini teskari qidiradi (`admin_order_status`, `admin_orders`);
    # ular faqat default/market URLConf'ida bor edi -> restoranda /seller/orders/<pk>/ NoReverseMatch bilan 500 berardi.
    # Nomlar bu yerda do'konga bog'langan ko'rinishlarga ulanadi (eski umumiy ko'rinish — do'kon tekshiruvisiz — ulanmaydi).
    # `admin_orders` include'dan KEYIN turadi: /seller/orders/ ni baribir `seller_orders_web` hal qiladi.
    path('seller/orders/<int:pk>/status/', seller_views.seller_order_status, name='admin_order_status'),
    path('seller/orders/', seller_views.seller_orders, name='admin_orders'),

    # Restoran REST API (React xodim panellari va mehmon menyusi). Avval faqat backend/urls.py da edi —
    # 8001-portda barcha /api/v1/restaurant/... so'rovlari 404 qaytarardi (TZ: R-GST-03)
    path('api/v1/restaurant/', include('orders.interfaces.api.urls')),
    path('api/guest/v1/', include('web.guest_api_urls')),  # mehmon sahifalari uchun O'QISH API (TZ_GUEST_API_VA_BOT)
    path('api/restaurant/admin/v1/menu/', include('orders.interfaces.api.menu_admin_urls')),
    path('api/restaurant/admin/v1/tables/', include('tables_restaurant.interfaces.api.tables_admin_urls')),
    path('api/restaurant/admin/v1/orders/', include('orders.interfaces.api.orders_admin_urls')),
    path('api/restaurant/admin/v1/staff/', include('accounts.interfaces.api.staff_admin_urls')),
    path('api/restaurant/admin/v1/finance/', include('finance.interfaces.api.finance_admin_urls')),
    path('api/restaurant/admin/v1/settings/', include('shops.interfaces.api.settings_admin_urls')),
    path('api/restaurant/admin/v1/brand/', include('shops.interfaces.api.brand_admin_urls')),
    # Platforma boshqaruvi (mijozlar): faqat super_admin, tenant hostida 404
    path('api/platform/v1/', include('shops.interfaces.api.platform_admin_urls')),
    path('api/restaurant/admin/v1/reservations/', include('tables_restaurant.interfaces.api.reservations_admin_urls')),
    path('api/restaurant/admin/v1/tours/', include('tours.interfaces.api.tours_admin_urls')),   # video sayr (VT1): ruxsat settings_admin
    path('api/restaurant/guest/tour/', include('tours.interfaces.api.guest_tour_urls')),        # mehmon sayri (ochiq, faqat e'lon qilingan)

    # Mehmon bron API (ochiq, CSRF + tezlik chegarasi; restoran guest_shop_id() dan): sozlama, bandlik, bron, kod bo'yicha holat
    path('api/restaurant/guest/booking/config/', guest_booking.booking_config, name='guest_booking_config'),
    path('api/restaurant/guest/booking/availability/', guest_booking.booking_availability, name='guest_booking_availability'),
    path('api/restaurant/guest/booking/', guest_booking.booking_create, name='guest_booking_create'),
    path('api/restaurant/guest/booking/<str:public_code>/', guest_booking.booking_status, name='guest_booking_status'),

    # Telegram Bot Webhook
    path('bot/restaurant/webhook/', telegram_webhook.restaurant_webhook, name='bot_restaurant_webhook'),
    path('bot/webhook/', telegram_webhook.restaurant_webhook, name='bot_webhook'),
    path('telegram/webhook/', telegram_webhook.restaurant_webhook, name='telegram_webhook'),
    path('telegram/chat-ids/', telegram_webhook.telegram_set_chat_id, name='telegram_chat_ids'),
    path('telegram/send-test/', telegram_webhook.telegram_send_test, name='telegram_send_test'),

    # Restoran Admin Paneli & Boshqaruv
    path('admin/', tma_views.restaurant_admin_dashboard, name='restaurant_admin_dashboard'),
    path('admin', tma_views.restaurant_admin_dashboard),
    path('admin/login/', tma_views.restaurant_admin_login, name='restaurant_admin_login'),
    path('admin/login/', tma_views.restaurant_admin_login, name='web_login'),
    path('admin/logout/', tma_views.restaurant_admin_logout, name='restaurant_admin_logout'),
    path('admin/logout/', tma_views.restaurant_admin_logout, name='web_logout'),
    path('admin/dashboard/', tma_views.restaurant_admin_dashboard, name='admin_dashboard'),


    # Resto-Admin yangi SPA ilovasi (TZ: 1.1)
    re_path(r'^ra(?:/.*)?$', resto_admin_views.resto_admin_spa, name='resto_admin_spa'),

    # AR3D App URL'lari (3D bosma studiyasi sahifasi boshqa mahsulotniki — menyuga yo'naltiriladi; uning API'lari ishlaydi)
    path('3d-print/', other_product_page, name='print_3d_studio'),
    path('', include('ar3d.urls')),

    # REST API endpoints (Stollar, buyurtmalar, to'lov)
    path('api/restaurant/admin/v1/', include('web.resto_admin_api_urls')),
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/categories/', include('categories.urls')),
    path('api/v1/shops/', include('shops.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/payments/', include('payments.api_urls')),
    path('payment/', include('payments.urls')),

    # Xavfsizlik fallback'lari: boshqa mahsulot sahifalari restoran domenida menyuga yo'naltiriladi, lekin marshrut nomlari
    # qoladi (boshqa mahsulot nomlari chaqirilganda reverse xatosi bermaslik uchun)
    path('market/', other_product_page, name='customer_home'),
    path('market/catalog/', other_product_page, name='customer_catalog'),
    path('market/search/', other_product_page, name='customer_search'),
    path('market/profile/', other_product_page, name='customer_profile'),
    path('market/wishlist/', other_product_page, name='customer_wishlist'),
    path('market/orders/', other_product_page, name='customer_orders'),
    path('market/cart/', other_product_page, name='customer_cart'),
    path('product/<str:slug>/', other_product_page, name='customer_product'),
    path('shop/<str:slug>/', other_product_page, name='customer_shop_detail'),
    path('studio/', other_product_page, name='studio_home'),
    path('admin/shops/', other_product_page, name='admin_shops'),
    path('admin/shops/<int:pk>/edit/', other_product_page, name='admin_shop_edit'),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static/assets')}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if getattr(settings, 'DJANGO_ADMIN_ENABLED', False):
    urlpatterns.append(path('djangoadmin/', admin.site.urls))

