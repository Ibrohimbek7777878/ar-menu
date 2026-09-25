from django.contrib import admin
from .models import Shop, ShopTemplate, ShopPage


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'store_type', 'category', 'is_open', 'is_featured',
        'is_verified', 'plan', 'rating', 'reviews_count', 'created_at'
    ]
    list_filter = ['store_type', 'is_open', 'is_featured', 'is_verified', 'plan', 'category']
    search_fields = ['name', 'address', 'phone', 'owner__username']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['verified_at', 'created_at', 'updated_at']
    actions = ['verify_shops', 'set_basic_plan', 'set_pro_plan', 'set_business_plan']

    def verify_shops(self, request, queryset):
        from django.utils import timezone
        count = queryset.filter(is_verified=False).update(
            is_verified=True,
            verified_at=timezone.now(),
            verified_by=request.user,
        )
        self.message_user(request, f'{count} ta do\'kon tasdiqlandi')
    verify_shops.short_description = "Tanlangan do'konlarni tasdiqlash"

    def set_basic_plan(self, request, queryset):
        count = queryset.update(plan='basic')
        self.message_user(request, f'{count} ta do\'kon "Basic" rejaga o\'tkazildi')
    set_basic_plan.short_description = "Basic rejaga o'tkazish"

    def set_pro_plan(self, request, queryset):
        count = queryset.update(plan='pro')
        self.message_user(request, f'{count} ta do\'kon "Pro" rejaga o\'tkazildi')
    set_pro_plan.short_description = "Pro rejaga o'tkazish"

    def set_business_plan(self, request, queryset):
        count = queryset.update(plan='business')
        self.message_user(request, f'{count} ta do\'kon "Business" rejaga o\'tkazildi')
    set_business_plan.short_description = "Business rejaga o'tkazish"


@admin.register(ShopTemplate)
class ShopTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'category', 'is_premium', 'required_plan', 'is_active', 'sort_order']
    list_filter = ['category', 'is_premium', 'required_plan', 'is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['category', 'sort_order']


@admin.register(ShopPage)
class ShopPageAdmin(admin.ModelAdmin):
    list_display = ['shop', 'template', 'is_published', 'updated_at']
    list_filter = ['template', 'is_published']
