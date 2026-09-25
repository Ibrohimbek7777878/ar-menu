from django.contrib import admin
from .models import (
    ProductLibrary, Product3DModel, ARView,
    Print3DProduct, Print3DOrder,
    Print3DCapability, Print3DArticle, Print3DMaterial, Print3DFAQ
)

@admin.register(ProductLibrary)
class ProductLibraryAdmin(admin.ModelAdmin):
    list_display = ['key','name_uz','category_key','real_size_cm','used_by_count','is_active']
    search_fields = ['key','name_uz','aliases']
    list_filter = ['category_key','is_active']

@admin.register(Product3DModel)
class Product3DModelAdmin(admin.ModelAdmin):
    list_display = ['product','status','source','view_count']
    list_filter = ['status']

@admin.register(ARView)
class ARViewAdmin(admin.ModelAdmin):
    list_display = ['product','mode','duration_sec','converted','created_at']
    list_filter = ['mode','converted']

@admin.register(Print3DProduct)
class Print3DProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'base_price', 'default_material', 'print_duration_hours', 'is_in_stock', 'is_featured', 'is_active']
    list_filter = ['category', 'default_material', 'is_in_stock', 'is_featured', 'is_active']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Print3DOrder)
class Print3DOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer_name', 'customer_phone', 'material', 'quantity', 'final_amount', 'delivery_type', 'status', 'created_at']
    list_filter = ['status', 'delivery_type', 'material', 'source']
    search_fields = ['order_number', 'customer_name', 'customer_phone', 'custom_title']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Print3DCapability)
class Print3DCapabilityAdmin(admin.ModelAdmin):
    list_display = ['title', 'starting_price', 'lead_time', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['title', 'short_desc', 'examples']

@admin.register(Print3DArticle)
class Print3DArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'step_badge', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['title', 'subtitle', 'body']
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Print3DMaterial)
class Print3DMaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'full_name', 'badge', 'strength_percent', 'heat_resistance', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['name', 'full_name', 'best_for']

@admin.register(Print3DFAQ)
class Print3DFAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['question', 'answer']

