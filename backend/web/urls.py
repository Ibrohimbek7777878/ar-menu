from django.urls import include, path
from . import views
from . import telegram_webhook
from . import health
from . import tma_views
from ar3d import views as ar3d_views

urlpatterns = [
    # Health check
    path('health/', health.health_check, name='health_check'),

    # Restoran 3D Menyu — ASOSIY BOSH SAHIFA (Mahsulot #1)
    path('', tma_views.tma_home, name='restaurant_root'),
    path('market/', views.customer_home, name='customer_home'),
    path('search/', views.customer_search, name='customer_search'),
    path('quick-buy/', views.customer_quick_buy, name='customer_quick_buy'),
    path('nearby-stores/', views.customer_nearby_stores, name='customer_nearby_stores'),
    path('repeat-order/', views.customer_repeat_order, name='customer_repeat_order'),
    path('catalog/', views.customer_catalog, name='customer_catalog'),
    path('shop/<str:slug>/', views.customer_shop_detail, name='customer_shop_detail'),
    path('product/<str:slug>/', views.customer_product_detail, name='customer_product'),
    path('product/<str:slug>/ar/', views.customer_product_ar, name='customer_product_ar'),
    path('ar/', views.ar_catalog, name='ar_catalog'),
    path('cart/', views.customer_cart, name='customer_cart'),
    path('cart/add/', views.customer_cart_add, name='customer_cart_add'),
    path('cart/update/', views.customer_cart_update, name='customer_cart_update'),
    path('cart/remove/', views.customer_cart_remove, name='customer_cart_remove'),
    path('cart/repeat/<int:order_id>/', views.customer_cart_repeat, name='customer_cart_repeat'),
    path('checkout/', views.customer_checkout, name='customer_checkout'),
    path('orders/', views.customer_orders, name='customer_orders'),
    path('orders/<int:pk>/tracking/', views.customer_order_tracking, name='customer_order_tracking'),
    path('orders/<int:pk>/pay/', views.customer_order_pay, name='customer_order_pay'),
    path('profile/', views.customer_profile, name='customer_profile'),
    path('wishlist/', views.customer_wishlist, name='customer_wishlist'),
    path('wishlist/toggle/', views.customer_wishlist_toggle, name='customer_wishlist_toggle'),
    path('register/', views.customer_register, name='customer_register'),
    path('login/', views.customer_login, name='customer_login'),
    path('logout/', views.customer_logout, name='customer_logout'),
    # Admin
    path('admin/login/', views.web_login, name='web_login'),
    path('admin/register/', views.web_register, name='web_register'),
    path('admin/logout/', views.web_logout, name='web_logout'),
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/analytics/', views.admin_analytics, name='admin_analytics'),
    path('admin/shops/', views.admin_shops, name='admin_shops'),
    path('admin/shops/create/', views.admin_shop_create, name='admin_shop_create'),
    path('admin/shops/<int:pk>/edit/', views.admin_shop_edit, name='admin_shop_edit'),
    path('admin/shops/<int:shop_id>/builder/', views.admin_shop_builder, name='admin_shop_builder'),
    path('admin/shops/<int:pk>/delete/', views.admin_shop_delete, name='admin_shop_delete'),
    path('admin/products/', views.admin_products, name='admin_products'),
    path('admin/products/create/', views.admin_product_create, name='admin_product_create'),
    path('admin/products/<int:pk>/edit/', views.admin_product_edit, name='admin_product_edit'),
    path('admin/ai-marketing/', views.admin_ai_marketing, name='admin_ai_marketing'),
    path('admin/telegram/', views.admin_telegram, name='admin_telegram'),
    path('admin/ar/', views.admin_ar, name='admin_ar'),
    path('admin/products/<int:pk>/delete/', views.admin_product_delete, name='admin_product_delete'),
    path('admin/orders/', views.admin_orders, name='admin_orders'),
    path('admin/orders/<int:pk>/', views.admin_order_detail, name='admin_order_detail'),
    path('admin/orders/<int:pk>/status/', views.admin_order_status, name='admin_order_status'),
    path('admin/customers/', views.admin_customers, name='admin_customers'),
    path('admin/categories/', views.admin_categories, name='admin_categories'),
    path('admin/categories/create/', views.admin_category_create, name='admin_category_create'),
    path('admin/categories/<int:pk>/edit/', views.admin_category_edit, name='admin_category_edit'),
    path('admin/categories/<int:pk>/delete/', views.admin_category_delete, name='admin_category_delete'),
    path('admin/couriers/', views.admin_couriers, name='admin_couriers'),
    path('admin/couriers/create/', views.admin_courier_create, name='admin_courier_create'),
    path('admin/couriers/<int:pk>/edit/', views.admin_courier_edit, name='admin_courier_edit'),
    path('admin/couriers/<int:pk>/delete/', views.admin_courier_delete, name='admin_courier_delete'),
    path('admin/banners/', views.admin_banners, name='admin_banners'),
    path('admin/banners/create/', views.admin_banner_create, name='admin_banner_create'),
    path('admin/banners/<int:pk>/edit/', views.admin_banner_edit, name='admin_banner_edit'),
    path('admin/banners/<int:pk>/delete/', views.admin_banner_delete, name='admin_banner_delete'),
    path('admin/reviews/', views.admin_reviews, name='admin_reviews'),
    path('admin/reviews/<int:pk>/delete/', views.admin_review_delete, name='admin_review_delete'),
    path('admin/settings/', views.admin_settings, name='admin_settings'),
    path('admin/profile/', views.admin_profile, name='admin_profile'),
    path('admin/users/', views.admin_users, name='admin_users'),
    path('admin/users/<int:pk>/toggle/', views.admin_user_toggle, name='admin_user_toggle'),
    path('product/<slug:slug>/review/', views.customer_review_add, name='customer_review_add'),
    # Courier
    path('courier/login/', views.courier_login, name='courier_login'),
    path('courier/logout/', views.courier_logout, name='courier_logout'),
    path('courier/', views.courier_dashboard, name='courier_dashboard'),
    path('courier/order/<int:pk>/', views.courier_order_detail, name='courier_order_detail'),
    path('courier/order/<int:pk>/map/', views.courier_order_map, name='courier_order_map'),
    path('courier/order/<int:pk>/accept/', views.courier_accept_order, name='courier_accept_order'),
    path('courier/order/<int:pk>/deliver/', views.courier_deliver_order, name='courier_deliver_order'),
    path('courier/history/', views.courier_history, name='courier_history'),

    # Seller (multi-tenant)
    path('seller/', include('web.seller_urls')),

    # Telegram Bot (Multi-Product & Legacy Webhooks)
    path('telegram/webhook/', telegram_webhook.telegram_webhook, name='telegram_webhook'),
    path('bot/restaurant/webhook/', telegram_webhook.restaurant_webhook, name='bot_restaurant_webhook'),
    path('bot/market/webhook/', telegram_webhook.market_webhook, name='bot_market_webhook'),
    path('bot/studio/webhook/', telegram_webhook.studio_webhook, name='bot_studio_webhook'),
    path('telegram/chat-ids/', telegram_webhook.telegram_set_chat_id, name='telegram_chat_ids'),
    path('telegram/send-test/', telegram_webhook.telegram_send_test, name='telegram_send_test'),

    # V12: QR & NFC stol → menyu (web zanjir)
    path('nfc/<str:code>/', views.nfc_tap_handler, name='nfc_tap_handler'),
    path('t/<uuid:token>/', views.table_menu_redirect, name='table_menu_redirect'),
    path('m/<slug:slug>/', views.ar_menu_page, name='ar_menu_page'),

    # Telegram Mini App (TMA) & Web Menyu (Restoran Mahsulot #1 - Mustaqil va to'liq responsiv)
    path('restaurant/', tma_views.tma_home, name='restaurant_home'),
    path('restaurant/catalog/', tma_views.tma_catalog, name='restaurant_catalog'),
    path('restaurant/cart/', tma_views.tma_cart, name='restaurant_cart'),
    path('restaurant/checkout/', tma_views.tma_checkout, name='restaurant_checkout'),
    path('restaurant/table/', tma_views.tma_table_hub, name='restaurant_table_hub'),
    path('restaurant/orders/', tma_views.tma_orders, name='restaurant_orders'),

    # O'zbekcha va qisqa aliaslar
    path('restoran/', tma_views.tma_home, name='restoran_home'),
    path('ar-menu/', tma_views.tma_home, name='ar_menu_home'),

    # Orqaga moslik uchun /menu/ va /tma/ yo'llari
    path('tma/', tma_views.tma_home, name='tma_home'),
    path('menu/', tma_views.tma_home, name='tma_menu'),
    path('menu/catalog/', tma_views.tma_catalog, name='tma_menu_catalog'),
    path('menu/cart/', tma_views.tma_cart, name='tma_menu_cart'),
    path('menu/checkout/', tma_views.tma_checkout, name='tma_menu_checkout'),
    path('menu/table/', tma_views.tma_table_hub, name='tma_menu_table'),
    path('menu/orders/', tma_views.tma_orders, name='tma_menu_orders'),
    path('tma/catalog/', tma_views.tma_catalog, name='tma_catalog'),
    path('tma/cart/', tma_views.tma_cart, name='tma_cart'),
    path('tma/api/cart/', tma_views.tma_cart_api, name='tma_cart_api'),
    path('tma/checkout/', tma_views.tma_checkout, name='tma_checkout'),
    path('tma/table/', tma_views.tma_table_hub, name='tma_table_hub'),
    path('tma/orders/', tma_views.tma_orders, name='tma_orders'),
    path('tma/order/<int:pk>/', tma_views.tma_order_detail, name='tma_order_detail'),

    # 3D Studio & Servis (Mahsulot #3)
    path('studio/', ar3d_views.print_3d_studio_page, name='studio_home'),
]
