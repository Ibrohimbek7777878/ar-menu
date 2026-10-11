import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.views.static import serve

# Aqlli admin yo'naltiruvchi: rolga qarab to'g'ri panelga yo'naltiradi
def admin_root_redirect(request):
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', '')
        if role == 'super_admin' or getattr(request.user, 'is_superuser', False):
            return redirect('admin_dashboard')
        elif role in ('shop_owner', 'shop_manager'):
            return redirect('seller_dashboard_web')
        elif role == 'waiter':
            return redirect('waiter_panel_web')
    return redirect('web_login')

urlpatterns = [
    # AIR 3D Menu & v1 API
    path('', include('ar3d.urls')),
    # Web pages — BEFORE admin.site.urls so custom /admin/* pages are not shadowed
    path('', include('web.urls')),
    # /admin va /admin/ -> bizning custom admin login sahifasiga
    path('admin', admin_root_redirect),
    path('admin/', admin_root_redirect),
    # Haqiqiy Django admin (ichki foydalanish) — boshqa prefix'da
    path('djangoadmin/', admin.site.urls),
    # API endpoints
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/categories/', include('categories.urls')),
    path('api/v1/shops/', include('shops.urls')),
    path('api/v1/products/', include('products.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/restaurant/', include('orders.interfaces.api.urls')),
    path('api/v1/couriers/', include('couriers.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    # Flutter API
    path('api/v1/flutter/', include('api.urls')),
    # Payment + Map
    path('api/payments/', include('payments.api_urls')),
    path('api/v1/maps/', include('maps.api_urls')),
    # AI yordamchi
    path('api/v1/ai/', include('ai.urls')),
    path('payment/', include('payments.urls')),
    path('map/', include('maps.urls')),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static/assets')}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
