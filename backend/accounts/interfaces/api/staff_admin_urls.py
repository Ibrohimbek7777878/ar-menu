"""
Restoran Xodimlar URL marshrutlari.
Prefiks: /api/restaurant/admin/v1/staff/
"""
from django.urls import path

from accounts.interfaces.api.staff_admin import (
    StaffBlockView,
    StaffDetailUpdateView,
    StaffListCreateView,
    StaffResetPasswordView,
    StaffUnblockView,
)

urlpatterns = [
    path('', StaffListCreateView.as_view(), name='resto_admin_staff_list'),
    path('<int:pk>/', StaffDetailUpdateView.as_view(), name='resto_admin_staff_detail'),
    path('<int:pk>/block/', StaffBlockView.as_view(), name='resto_admin_staff_block'),
    path('<int:pk>/unblock/', StaffUnblockView.as_view(), name='resto_admin_staff_unblock'),
    path('<int:pk>/reset-password/', StaffResetPasswordView.as_view(), name='resto_admin_staff_reset_password'),
]
