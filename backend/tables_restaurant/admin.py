from django.contrib import admin
from backend.softdelete import SoftDeleteAdminMixin
from .models import Hall, Table, NFCCard, TableReservation

@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ['name','shop','order','is_active']
    list_filter = ['shop']

@admin.register(Table)
class TableAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ['number','hall','shop','status','qr_token','is_active']
    list_filter = ['shop','status']
    readonly_fields = ['qr_token','qr_token_old']

@admin.register(NFCCard)
class NFCCardAdmin(admin.ModelAdmin):
    list_display = ['name', 'shop', 'table', 'code', 'card_type', 'tap_count', 'is_active']
    list_filter = ['shop', 'card_type', 'is_active']

@admin.register(TableReservation)
class TableReservationAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ['customer_name', 'customer_phone', 'shop', 'table', 'reservation_date', 'reservation_time', 'guests_count', 'status']
    list_filter = ['shop', 'status', 'reservation_date']
    search_fields = ['customer_name', 'customer_phone', 'table__number']
