from django.contrib import admin
from apps.analytics.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'restaurant', 'actor_name', 'action',
                     'model', 'object_id', 'ip')
    list_filter = ('action', 'model', 'restaurant')
    search_fields = ('actor_name', 'object_id', 'ip', 'request_id')
    date_hierarchy = 'created_at'
    readonly_fields = [f.name for f in AuditLog._meta.fields]   # ⛔ tahrirlanmaydi

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
