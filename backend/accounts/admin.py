from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AdminUser, Customer


@admin.register(AdminUser)
class AdminUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_approved', 'is_active']
    list_filter = ['role', 'is_approved', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Qo\'shimcha', {
            'fields': ('role', 'phone', 'shop', 'is_approved', 'avatar'),
        }),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'total_orders', 'total_spent', 'created_at']
    search_fields = ['name', 'phone']
    list_filter = ['created_at']
