"""
Online Store Guliston — Mahsulot #3: 3D Studio & Buyurtma Chop Etish
==================================================================
Port: 8003
Ushbu URLConf faqat 3D Studio va Muhandislik xizmatlari uchun mo'ljallangan:
- Bosh sahifa (/) -> 3D Studio & Chop Etish Markazi
- STL/OBJ fayl yuklash, slicer narx kalkulyatori, buyurtma berish
- Mini ERP: Sifat nazorati va Chop etish navbati (Print Queue Kanban)
- Telegram 3D Studio Boti (TELEGRAM_STUDIO_BOT_TOKEN)
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


def studio_admin_redirect(request):
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', '')
        if role == 'super_admin' or getattr(request.user, 'is_superuser', False):
            return redirect('admin_dashboard')
        elif role in ('shop_owner', 'shop_manager'):
            return redirect('seller_3d_studio_web')
    return redirect('web_login')


urlpatterns = [
    # Health check
    path('health/', health.health_check, name='health_check'),
    path('health/live/', health.health_live, name='health_live'),
    path('health/ready/', health.health_ready, name='health_ready'),

    # ASOSIY BOSH SAHIFA: 3D Studio & Chop Etish
    path('', ar3d_views.print_3d_studio_page, name='studio_root'),
    path('studio/', ar3d_views.print_3d_studio_page, name='studio_home'),
    path('3d-print/', ar3d_views.print_3d_studio_page, name='print_3d_studio'),
    path('3d-print/order/', ar3d_views.print_3d_create_order_api, name='print_3d_create_order'),
    path('3d-print/order/<str:order_number>/ready/', ar3d_views.print_3d_mark_ready_api, name='print_3d_mark_ready'),

    # Mini ERP (3D Studio Chop Etish Navbati - Kanban)
    path('seller/', include('web.seller_urls')),

    # Telegram Bot Webhook (Studio)
    path('bot/studio/webhook/', telegram_webhook.studio_webhook, name='bot_studio_webhook'),
    path('bot/webhook/', telegram_webhook.studio_webhook, name='bot_webhook'),
    path('telegram/webhook/', telegram_webhook.studio_webhook, name='telegram_webhook'),

    # Admin va Auth
    path('admin/login/', views.web_login, name='web_login'),
    path('admin/register/', views.web_register, name='web_register'),
    path('admin/logout/', views.web_logout, name='web_logout'),
    path('admin', studio_admin_redirect),
    path('admin/', studio_admin_redirect),
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),

    # REST APIs
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/payments/', include('payments.api_urls')),
    path('payment/', include('payments.urls')),

    # Customer bazaviy template navigatsiyasi
    path('market/', views.customer_home, name='customer_home'),
    path('catalog/', views.customer_catalog, name='customer_catalog'),
    path('cart/', views.customer_cart, name='customer_cart'),
    path('search/', views.customer_search, name='customer_search'),
    path('profile/', views.customer_profile, name='customer_profile'),
    path('wishlist/', views.customer_wishlist, name='customer_wishlist'),
    path('orders/', views.customer_orders, name='customer_orders'),

    # Fallback'lar
    path('restaurant/', include('ar3d.urls')),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static/assets')}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if getattr(settings, 'DJANGO_ADMIN_ENABLED', False):
    urlpatterns.append(path('djangoadmin/', admin.site.urls))
