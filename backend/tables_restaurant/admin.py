from django.contrib import admin
from .models import Hall, Table

@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ['name','shop','order','is_active']
    list_filter = ['shop']

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['number','hall','shop','status','qr_token','is_active']
    list_filter = ['shop','status']
    readonly_fields = ['qr_token','qr_token_old']
