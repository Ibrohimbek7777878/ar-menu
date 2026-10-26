"""
Resto-Admin v1 API marshrutlari.
Prefiks: /api/restaurant/admin/v1/
"""
from django.urls import path
from web import resto_admin_views

urlpatterns = [
    path('session/', resto_admin_views.session_api, name='resto_admin_session_api'),
    path('logout/', resto_admin_views.logout_api, name='resto_admin_logout_api'),
    path('dashboard/summary/', resto_admin_views.dashboard_summary_api, name='resto_admin_dashboard_summary_api'),
]
