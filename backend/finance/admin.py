from django.contrib import admin
from backend.softdelete import SoftDeleteAdminMixin
from .models import DebtRecord, FinanceCategory, FinanceRevision, FinanceTransaction

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


@admin.register(FinanceRevision)
class FinanceRevisionAdmin(admin.ModelAdmin):
    """Moliya o'zgarishlari tarixi: FAQAT O'QISH (qo'shib, o'zgartirib va o'chirib bo'lmaydi)."""
    list_display = ['id', 'shop', 'target_type', 'target_id', 'revision_no', 'changed_by_name', 'reason', 'created_at']
    list_filter = ['target_type', 'created_at']
    search_fields = ['reason', 'changed_by_name', 'shop__name']
    readonly_fields = [f.name for f in FinanceRevision._meta.fields]
    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
