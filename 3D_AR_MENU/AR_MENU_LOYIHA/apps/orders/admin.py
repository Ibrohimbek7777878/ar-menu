from django.contrib import admin
from apps.orders.models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('dish_name', 'qty', 'price', 'line_total', 'ar_viewed')
    readonly_fields = ('dish_name', 'qty', 'price', 'line_total')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('number', 'restaurant', 'table', 'status', 'total', 'created_at')
    list_filter = ('restaurant', 'status', 'created_at')
    search_fields = ('number', 'restaurant__name', 'session_id')
    inlines = [OrderItemInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'dish_name', 'qty', 'price', 'line_total', 'ar_viewed')
    list_filter = ('ar_viewed',)
    search_fields = ('dish_name', 'order__number')
