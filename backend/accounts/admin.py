from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AdminUser, Customer


def _platform_admin_only(request):
    """
    /djangoadmin/ faqat platforma administratoriga (TZ: R-SEC-10).
    Avval is_staff=True bo'lgan har qanday akkaunt (masalan ofitsiant) Django admin'ga kira olardi.
    """
    user = request.user
    return bool(
        user.is_active and user.is_staff
        and (user.is_superuser or getattr(user, 'role', '') == 'super_admin')
    )


admin.site.has_permission = _platform_admin_only


@admin.register(AdminUser)
class AdminUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_approved', 'is_active']
    list_filter = ['role', 'is_approved', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Qo\'shimcha', {
            'fields': ('role', 'phone', 'shop', 'is_approved', 'avatar', 'extra_capabilities', 'revoked_capabilities'),
        }),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'total_orders', 'total_spent', 'created_at']
    search_fields = ['name', 'phone']
    list_filter = ['created_at']
