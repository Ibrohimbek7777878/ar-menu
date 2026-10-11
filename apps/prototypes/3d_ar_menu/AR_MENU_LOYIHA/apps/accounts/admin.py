from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import User, Staff


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('phone',)
    list_display = ('phone', 'full_name', 'email', 'is_platform_admin',
                     'totp_enabled', 'is_active', 'last_login')
    list_filter = ('is_platform_admin', 'is_active', 'totp_enabled')
    search_fields = ('phone', 'email', 'full_name')
    readonly_fields = ('last_login', 'last_login_ip', 'created_at', 'totp_secret')
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Shaxsiy', {'fields': ('full_name', 'email', 'lang')}),
        ('Huquqlar', {'fields': ('is_active', 'is_staff', 'is_superuser',
                                 'is_platform_admin', 'groups', 'user_permissions')}),
        ('2FA', {'fields': ('totp_enabled', 'totp_secret')}),
        ('Texnik', {'fields': ('last_login', 'last_login_ip', 'created_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',),
                'fields': ('phone', 'full_name', 'password1', 'password2')}),
    )


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'restaurant', 'role', 'phone',
                     'is_on_shift', 'is_active', 'last_login')
    list_filter = ('role', 'is_active', 'is_on_shift', 'restaurant')
    search_fields = ('full_name', 'phone', 'restaurant__name')
    autocomplete_fields = ('restaurant', 'user')
    readonly_fields = ('pin_hash', 'pin_set_at', 'failed_attempts',
                       'blocked_until', 'last_login', 'created_at', 'updated_at')
    actions = ['unblock_staff']

    @admin.action(description='Blokdan chiqarish')
    def unblock_staff(self, request, queryset):
        n = queryset.update(failed_attempts=0, blocked_until=None)
        self.message_user(request, f'{n} ta xodim blokdan chiqarildi')
