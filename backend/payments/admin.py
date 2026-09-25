from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['merchant_transaction_id', 'order', 'provider', 'amount', 'status', 'created_at']
    list_filter = ['status', 'provider']
    search_fields = ['merchant_transaction_id', 'order__order_number']
