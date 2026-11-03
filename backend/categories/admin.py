from django.contrib import admin
from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_uz', 'shop', 'kind', 'icon', 'color', 'sort_order', 'is_active']
    list_editable = ['kind']
    list_filter = ['is_active', 'shop']
    ordering = ['sort_order']
    list_select_related = ['shop']
    raw_id_fields = ['shop', 'parent']
