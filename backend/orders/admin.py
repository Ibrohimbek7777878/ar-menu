from django.contrib import admin
from backend.softdelete import SoftDeleteAdminMixin
from django.utils.html import format_html
from django.urls import reverse
from .models import Order, OrderItem, OrderStatusHistory, Coupon
from .models import StockReservation, DeliveryZone, DeliveryQuote
from .models import AnalyticsEvent, AuditLog
from .state_machine import can_transition, transition_order, ORDER_STATES


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['total']


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Order)
class OrderAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = [
        'order_number', 'customer_name', 'shop', 'final_amount',
        'status', 'is_pickup', 'courier', 'created_at'
    ]
    list_filter = ['status', 'is_pickup', 'shop', 'created_at']
    search_fields = [
        'order_number', 'customer_name', 'customer_phone_1'
    ]
    inlines = [OrderItemInline, OrderStatusHistoryInline]
    readonly_fields = ['order_number', 'created_at', 'updated_at', 'delivered_at',
                       'confirmed_at', 'cancelled_at', 'out_for_delivery_at']
    actions = ['confirm_orders', 'cancel_orders', 'mark_delivered']

    def confirm_orders(self, request, queryset):
        count = 0
        for order in queryset.filter(status='pending'):
            success, msg = transition_order(order, 'confirmed', actor=request.user, request=request)
            if success:
                count += 1
        self.message_user(request, f'{count} ta buyurtma tasdiqlandi')
    confirm_orders.short_description = "Tanlangan buyurtmalarni tasdiqlash"

    def cancel_orders(self, request, queryset):
        count = 0
        for order in queryset.exclude(status__in=['delivered', 'cancelled']):
            success, msg = transition_order(order, 'cancelled', actor=request.user,
                                           reason='Admin tomonidan bekor qilindi', request=request)
            if success:
                count += 1
        self.message_user(request, f'{count} ta buyurtma bekor qilindi')
    cancel_orders.short_description = "Tanlangan buyurtmalarni bekor qilish"

    def mark_delivered(self, request, queryset):
        count = 0
        for order in queryset.filter(status='out_for_delivery'):
            success, msg = transition_order(order, 'delivered', actor=request.user, request=request)
            if success:
                count += 1
        self.message_user(request, f'{count} ta buyurtma yetkazildi')
    mark_delivered.short_description = "Tanlangan buyurtmalarni yetkazilgan deb belgilash"


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['order', 'status', 'note', 'changed_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order__order_number', 'note']
    readonly_fields = ['created_at']


@admin.register(StockReservation)
class StockReservationAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity', 'status', 'order', 'expires_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product__name', 'order__order_number']
    readonly_fields = ['created_at']
    actions = ['release_expired']

    def release_expired(self, request, queryset):
        from django.utils import timezone
        expired = queryset.filter(status='active', expires_at__lt=timezone.now())
        count = expired.update(status='released')
        self.message_user(request, f'{count} ta zaxira bo\'shatildi')
    release_expired.short_description = "Muddati tugagan zaxiralarni bo'shatish"


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'radius_km', 'base_fee', 'per_km_fee',
                    'free_delivery_threshold', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(DeliveryQuote)
class DeliveryQuoteAdmin(admin.ModelAdmin):
    list_display = ['order', 'zone', 'distance_km', 'total_fee', 'is_free', 'created_at']
    list_filter = ['is_free', 'created_at']
    search_fields = ['order__order_number']
    readonly_fields = ['created_at']


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'user_id', 'shop_id', 'product_id',
                    'search_query', 'locale', 'created_at']
    list_filter = ['event_type', 'locale', 'created_at']
    search_fields = ['search_query', 'session_id']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action_type', 'actor_name', 'actor_role', 'target_type',
                    'target_id', 'ip_address', 'created_at']
    list_filter = ['action_type', 'actor_role', 'created_at']
    search_fields = ['actor_name', 'target_type']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percent', 'discount_amount', 'min_order_amount',
                    'usage_limit', 'times_used', 'is_active', 'expires_at', 'created_at']
    list_filter = ['is_active', 'created_at', 'expires_at']
    search_fields = ['code']

