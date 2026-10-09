from django.urls import path
from apps.accounts import views
from apps.accounts.views_admin_staff import AdminStaffDetailView

urlpatterns = [
    path('staff/login/', views.StaffLoginView.as_view(), name='staff-login'),
    path('staff/refresh/', views.StaffRefreshView.as_view(), name='staff-refresh'),
    path('staff/logout/', views.StaffLogoutView.as_view(), name='staff-logout'),
    path('staff/me/', views.StaffMeView.as_view(), name='staff-me'),
    path('admin/login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('admin/logout/', views.StaffLogoutView.as_view(), name='logout'),
    path('admin/staff/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('platform/login/', views.PlatformLoginView.as_view(), name='platform-login'),
    path('platform/2fa/setup/', views.Platform2FASetupView.as_view(), name='platform-2fa'),
]
