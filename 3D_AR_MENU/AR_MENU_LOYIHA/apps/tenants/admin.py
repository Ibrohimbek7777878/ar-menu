from django.contrib import admin
from apps.tenants.models import Restaurant, Plan, Subscription


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug', 'city', 'plan', 'plan_expires',
                     'is_active', 'menu_version', 'created_at')
    list_filter = ('plan', 'is_active', 'city', 'fiscal_enabled')
    search_fields = ('name', 'slug', 'phone', 'inn', 'custom_domain')
    readonly_fields = ('created_at', 'updated_at', 'menu_version')
    prepopulated_fields = {'slug': ('name',)}
    fieldsets = (
        ('Asosiy', {'fields': ('slug', 'name', 'legal_name', 'inn', 'phone',
                               'address', 'city', 'lat', 'lng', 'is_active')}),
        ('Brending', {'fields': ('logo', 'color_primary', 'color_accent',
                                 'custom_domain')}),
        ('Til', {'fields': ('default_lang', 'langs_enabled')}),
        ('Tarif', {'fields': ('plan', 'plan_expires', 'ar_model_limit',
                              'table_limit', 'service_fee_pct')}),
        ('Fiskal', {'fields': ('ofd_provider', 'fiscal_enabled')}),
        ('Texnik', {'fields': ('menu_version', 'created_at', 'updated_at')}),
    )


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_uz', 'price_month_uzs', 'table_limit',
                    'dish_limit', 'ar_model_limit', 'staff_limit', 'is_active')
    list_editable = ('price_month_uzs', 'is_active')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'plan', 'status', 'period',
                     'expires_at', 'amount_uzs', 'paid_at')
    list_filter = ('status', 'plan', 'period')
    search_fields = ('restaurant__name', 'restaurant__slug', 'payment_ref')
    autocomplete_fields = ('restaurant',)
