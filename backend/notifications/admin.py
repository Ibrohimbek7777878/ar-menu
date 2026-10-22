from django.contrib import admin
from backend.softdelete import SoftDeleteAdminMixin
from .models import NotificationLog, Banner, Promotion, Review, AppSetting


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['type', 'recipient', 'order', 'success', 'sent_at']
    list_filter = ['type', 'success']


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'sort_order', 'start_date', 'end_date']
    list_filter = ['is_active']


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'type', 'value', 'min_order',
        'is_active', 'current_uses', 'max_uses'
    ]
    list_filter = ['type', 'is_active']


@admin.register(Review)
class ReviewAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ['product', 'customer', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'category', 'updated_at']
    list_filter = ['category']
    search_fields = ['key', 'description']
