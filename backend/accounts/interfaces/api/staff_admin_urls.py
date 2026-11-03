"""
Restoran Xodimlar URL marshrutlari.
Prefiks: /api/restaurant/admin/v1/staff/
"""
from django.urls import path

from accounts.interfaces.api.staff_admin import (
    StaffBlockView,
    StaffDetailUpdateView,
    StaffListCreateView,
    StaffPermissionCatalogView,
    StaffResetPasswordView,
    StaffSetPasswordView,
    StaffUnblockView,
)

urlpatterns = [
    path('', StaffListCreateView.as_view(), name='resto_admin_staff_list'),
    path('permissions/catalog/', StaffPermissionCatalogView.as_view(), name='resto_admin_staff_permission_catalog'),
    path('<int:pk>/', StaffDetailUpdateView.as_view(), name='resto_admin_staff_detail'),
    path('<int:pk>/block/', StaffBlockView.as_view(), name='resto_admin_staff_block'),
    path('<int:pk>/unblock/', StaffUnblockView.as_view(), name='resto_admin_staff_unblock'),
    path('<int:pk>/reset-password/', StaffResetPasswordView.as_view(), name='resto_admin_staff_reset_password'),
    path('<int:pk>/set-password/', StaffSetPasswordView.as_view(), name='resto_admin_staff_set_password'),
]
