from django.contrib import admin
from .models import Courier


@admin.register(Courier)
class CourierAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'phone', 'status', 'vehicle_type',
        'rating', 'total_deliveries', 'created_at'
    ]
    list_filter = ['status', 'vehicle_type']
    search_fields = ['name', 'phone']
