"""
Platforma API yo'nalishlari (faqat super_admin; tenant hostida 404).
Prefiks: /api/platform/v1/
"""
from django.urls import path

from shops.interfaces.api.platform_admin import (
    SubdomainCheckView,
    TenantDetailView,
    TenantListCreateView,
    TenantResetOwnerPasswordView,
)

urlpatterns = [
    path('tenants/', TenantListCreateView.as_view(), name='platform_tenants'),
    path('tenants/check-subdomain/', SubdomainCheckView.as_view(), name='platform_check_subdomain'),
    path('tenants/<int:pk>/', TenantDetailView.as_view(), name='platform_tenant'),
    path('tenants/<int:pk>/reset-owner-password/', TenantResetOwnerPasswordView.as_view(), name='platform_tenant_reset_password'),
]
