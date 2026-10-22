from django.contrib import admin
from backend.softdelete import SoftDeleteAdminMixin
from .models import FinanceCategory, FinanceTransaction, DebtRecord

@admin.register(FinanceCategory)
class FinanceCategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'icon', 'name', 'category_type', 'shop', 'is_system']
    list_filter = ['category_type', 'is_system']
    search_fields = ['name', 'shop__name']

@admin.register(FinanceTransaction)
class FinanceTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'tx_date', 'shop', 'tx_type', 'category', 'amount', 'payment_method', 'title']
    list_filter = ['tx_type', 'payment_method', 'tx_date']
    search_fields = ['title', 'notes', 'shop__name']

@admin.register(DebtRecord)
class DebtRecordAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = ['id', 'person_name', 'shop', 'debt_type', 'amount', 'paid_amount', 'status', 'due_date']
    list_filter = ['debt_type', 'status']
    search_fields = ['person_name', 'phone', 'notes']
