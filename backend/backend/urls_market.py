"""
Online Store Guliston — Mahsulot #2: Online Store (Marketplace)
==============================================================
Port: 8002
Ushbu URLConf faqat Gipermarket va Savdo ekotizimi uchun mo'ljallangan:
- Bosh sahifa (/) -> Online Store Gipermarket
- Qidiruv, tovarlar katalogi, xarid qilish, savat, buyurtma kuzatish
- Kuryerlar paneli va xarita marshrutlari
- Sotuvchilar paneli (Mini ERP: Sklad, Mahsulotlar, Buyurtmalar)
- Telegram Market Boti (TELEGRAM_MARKET_BOT_TOKEN)
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.views.static import serve

from web import views, telegram_webhook, health
from ar3d import views as ar3d_views


def market_admin_redirect(request):
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', '')
        if role == 'super_admin' or getattr(request.user, 'is_superuser', False):
            return redirect('admin_dashboard')
        elif role in ('shop_owner', 'shop_manager'):
            return redirect('seller_products_web')
        elif role == 'courier':
            return redirect('courier_dashboard')
    return redirect('web_login')


urlpatterns = [
    # Health check
    path('health/', health.health_check, name='health_check'),

    # ASOSIY BOSH SAHIFA: Online Store Gipermarket
    path('', views.customer_home, name='customer_home'),
    path('market/', views.customer_home, name='market_home'),
    path('search/', views.customer_search, name='customer_search'),
    path('quick-buy/', views.customer_quick_buy, name='customer_quick_buy'),
    path('nearby-stores/', views.customer_nearby_stores, name='customer_nearby_stores'),
    path('repeat-order/', views.customer_repeat_order, name='customer_repeat_order'),
    path('catalog/', views.customer_catalog, name='customer_catalog'),
    path('shop/<str:slug>/', views.customer_shop_detail, name='customer_shop_detail'),
    path('product/<str:slug>/', views.customer_product_detail, name='customer_product'),
    path('product/<str:slug>/ar/', views.customer_product_ar, name='customer_product_ar'),
    path('product/<slug:slug>/review/', views.customer_review_add, name='customer_review_add'),
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

    # Kuryerlik Xizmati
    path('courier/login/', views.courier_login, name='courier_login'),
    path('courier/logout/', views.courier_logout, name='courier_logout'),
    path('courier/', views.courier_dashboard, name='courier_dashboard'),
    path('courier/order/<int:pk>/', views.courier_order_detail, name='courier_order_detail'),
    path('courier/order/<int:pk>/map/', views.courier_order_map, name='courier_order_map'),
    path('courier/order/<int:pk>/accept/', views.courier_accept_order, name='courier_accept_order'),
    path('courier/order/<int:pk>/deliver/', views.courier_deliver_order, name='courier_deliver_order'),
    path('courier/history/', views.courier_history, name='courier_history'),

    # Admin Paneli
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
    path('admin/settings/', views.admin_settings, name='admin_settings'),
    path('admin/profile/', views.admin_profile, name='admin_profile'),
    path('admin/users/', views.admin_users, name='admin_users'),
    path('admin/users/<int:pk>/toggle/', views.admin_user_toggle, name='admin_user_toggle'),
    path('admin', market_admin_redirect),
    path('admin/', market_admin_redirect),
    path('djangoadmin/', admin.site.urls),

    # Mini ERP (Sotuvchilar paneli: Sklad, Mahsulotlar, Buyurtmalar)
    path('seller/', include('web.seller_urls')),

    # Telegram Bot Webhook (Market)
    path('bot/market/webhook/', telegram_webhook.market_webhook, name='bot_market_webhook'),
    path('bot/webhook/', telegram_webhook.market_webhook, name='bot_webhook'),
    path('telegram/webhook/', telegram_webhook.market_webhook, name='telegram_webhook'),

    # REST APIs
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/categories/', include('categories.urls')),
    path('api/v1/shops/', include('shops.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/couriers/', include('couriers.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/flutter/', include('api.urls')),
    path('api/payments/', include('payments.api_urls')),
    path('api/v1/maps/', include('maps.api_urls')),
    path('api/v1/ai/', include('ai.urls')),
    path('payment/', include('payments.urls')),
    path('map/', include('maps.urls')),

    # Xavfsizlik fallback'lari
    path('restaurant/', include('ar3d.urls')),
    path('studio/', ar3d_views.print_3d_studio_page, name='studio_home'),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static/assets')}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
