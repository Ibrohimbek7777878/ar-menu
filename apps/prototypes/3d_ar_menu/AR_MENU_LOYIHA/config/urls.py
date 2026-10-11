from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.guest.views import table_entry, menu_page, service_worker, pwa_manifest, order_status_page, set_language
from apps.guest.views_call import call_waiter, call_status, staff_accept_call, staff_done_call, staff_calls_list
from apps.guest.views_gdpr import gdpr_export, gdpr_delete
from apps.guest.views_split import split_bill
from apps.analytics.views_analytics import (
    ABCAnalysisView, MenuEngineeringView,
    ExportOrdersExcelView, ExportTopDishesExcelView, ExportOrdersPDFView,
)

from apps.orders.kds_views import kds_board
from apps.ar3d import platform_views
from core import views_log
from core import views_health

urlpatterns = [
    path('health/', views_health.health, name='health'),
    path('ready/', views_health.ready, name='ready'),
    path('django-admin/', admin.site.urls),
    path('v1/', include('apps.accounts.urls')),
    path('v1/', include('apps.menu.urls')),
    path('v1/admin/', include('apps.menu.admin_urls')),
    path('v1/admin/', include('apps.tables.urls')),
    path('v1/', include('apps.tables.urls')),
    path('v1/', include('apps.orders.urls')),
    path('v1/', include('apps.orders.staff_urls')),
    path('v1/', include('apps.ar3d.urls')),
    path('v1/', include('apps.ar3d.admin_urls')),
    path('v1/', include('apps.ai.urls')),
    path('v1/', include('apps.payments.urls')),
    path('v1/platform/library/', platform_views.platform_library, name='platform-library'),
    path('v1/platform/library/<int:pk>/', platform_views.platform_library_item, name='platform-library-item'),
    path('v1/platform/library/reindex/', platform_views.platform_library_reindex, name='platform-library-reindex'),
    path('v1/analytics/dashboard/', __import__('apps.analytics.views_dashboard', fromlist=['DashboardView']).DashboardView.as_view(), name='analytics-dashboard'),
    path('v1/admin/analytics/abc/', ABCAnalysisView.as_view(), name='analytics-abc'),
    path('v1/admin/analytics/engineering/', MenuEngineeringView.as_view(), name='analytics-engineering'),
    path('v1/admin/analytics/export/orders-excel/', ExportOrdersExcelView.as_view(), name='export-orders-excel'),
    path('v1/admin/analytics/export/top-dishes-excel/', ExportTopDishesExcelView.as_view(), name='export-top-dishes'),
    path('v1/admin/analytics/export/orders-pdf/', ExportOrdersPDFView.as_view(), name='export-orders-pdf'),
    path('v1/admin/gdpr/export/<int:guest_id>/', gdpr_export, name='gdpr-export'),
    path('v1/admin/gdpr/<int:guest_id>/', gdpr_delete, name='gdpr-delete'),
    path('v1/guest/split-bill/', split_bill, name='split-bill'),
    path('v1/log/frontend/', views_log.frontend_log, name='frontend-log'),
    path('v1/log/beacon/', views_log.js_error_beacon, name='js-beacon'),
    path('v1/logs/tail/', views_log.tail_logs, name='tail-logs'),
    path('v1/lang/', set_language, name='guest-set-lang'),
    path('v1/admin/branding/', __import__('apps.tenants.views_branding', fromlist=['BrandingView']).BrandingView.as_view(), name='admin-branding-api'),
    path('v1/admin/branding/logo/', __import__('apps.tenants.views_branding', fromlist=['BrandingLogoView']).BrandingLogoView.as_view(), name='admin-branding-logo-api'),
    path('admin/dashboard/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_dashboard_page']).admin_dashboard_page, name='admin-dashboard'),
    path('admin/switch-restaurant/', __import__('apps.tenants.admin_portal_views', fromlist=['switch_restaurant']).switch_restaurant, name='admin-switch-restaurant'),
    path('admin/restaurants/new/', __import__('apps.tenants.admin_portal_views', fromlist=['create_restaurant']).create_restaurant, name='admin-create-restaurant'),
    path('admin/branding/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_branding_page']).admin_branding_page, name='admin-branding'),
    path('admin/settings/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_settings_page']).admin_settings_page, name='admin-settings'),
    path('admin/menu/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_menu_page']).admin_menu_page, name='admin-menu'),
    path('admin/tables/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_tables_page']).admin_tables_page, name='admin-tables'),
    path('admin/ar/', __import__('apps.tenants.admin_portal_views', fromlist=['admin_ar_page']).admin_ar_page, name='admin-ar'),
    path('v1/guest/call-waiter/', call_waiter, name='call-waiter'),
    path('v1/calls/', call_waiter, name='calls-create'),
    path('v1/guest/call-status/', call_status, name='call-status'),
    path('v1/staff/calls/', staff_calls_list, name='staff-calls-list'),
    path('v1/staff/calls/<int:pk>/accept/', staff_accept_call, name='staff-call-accept'),
    path('v1/staff/calls/<int:pk>/done/', staff_done_call, name='staff-call-done'),
    path('sw.js', service_worker, name='service-worker'),
    path('manifest.json', pwa_manifest, name='manifest-json'),
    path('o/<int:order_id>/', order_status_page, name='order-status'),
    path('t/<uuid:qr_token>', table_entry, name='table-entry'),
    path('t/<uuid:qr_token>/', table_entry, name='table-entry-slash'),
    path('m/<slug:slug>/', menu_page, name='menu-page'),
    path('kds/', kds_board, name='kds'),
    path('favicon.ico', RedirectView.as_view(url='/static/favicon.ico', permanent=False)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # ⚡ Hotfix (D-037): standalone daphne da /static/ 404 berardi —
    # DEBUG rejimda istalgan ASGI serverda ham static xizmatlansin
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
