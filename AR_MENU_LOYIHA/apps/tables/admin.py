from django.contrib import admin
from apps.tables.models import Table, Hall
from apps.tables.models_floorplan import FloorPlan


@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'name', 'order', 'is_active')
    list_filter = ('restaurant', 'is_active')
    search_fields = ('name', 'restaurant__name')


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'number', 'capacity', 'hall', 'status', 'is_active', 'qr_token')
    list_filter = ('restaurant', 'hall', 'status', 'is_active')
    search_fields = ('number', 'restaurant__name')
    readonly_fields = ('qr_token', 'qr_rotated_at')


@admin.register(FloorPlan)
class FloorPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'name_uz', 'floor', 'version', 'is_active', 'updated_at')
    list_filter = ('restaurant', 'floor', 'is_active')
