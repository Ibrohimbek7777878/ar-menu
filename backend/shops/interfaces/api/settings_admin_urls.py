"""
Restoran Sozlamalari Admin API URL yo'nalishlari.
Prefix: /api/restaurant/admin/v1/settings/
"""
from django.urls import path
from shops.interfaces.api.settings_admin import SettingsAdminView

urlpatterns = [
    path('', SettingsAdminView.as_view(), name='resto_admin_settings'),
]
