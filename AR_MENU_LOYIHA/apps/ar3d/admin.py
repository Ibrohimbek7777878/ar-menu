from django.contrib import admin
from django.utils.html import format_html
from apps.ar3d.models import DishModel3D, DishLibrary, ARView


@admin.register(DishModel3D)
class DishModel3DAdmin(admin.ModelAdmin):
    list_display = ('id', 'dish', 'restaurant', 'status', 'source', 'real_size_cm', 'glb_link', 'view_count', 'convert_count', 'updated_at')
    list_filter = ('restaurant', 'status', 'source')
    search_fields = ('dish__name_uz', 'restaurant__name')
    list_editable = ('status', 'real_size_cm')
    fieldsets = (
        ('Asosiy', {
            'fields': ('restaurant', 'dish', 'status', 'source', 'library')
        }),
        ('3D Fayllar (Fayl yoki URL)', {
            'fields': ('glb', 'glb_url', 'usdz', 'usdz_url', 'poster', 'poster_url', 'preview_360')
        }),
        ('O\'lcham va Statistika', {
            'fields': ('real_size_cm', 'glb_bytes', 'usdz_bytes', 'poly_count', 'view_count', 'convert_count', 'error_msg')
        })
    )

    def glb_link(self, obj):
        url = obj.url_glb()
        if url:
            return format_html('<a href="{}" target="_blank" style="color: #2563EB; font-weight: 600;">📦 GLB ko\'rish</a>', url)
        return format_html('<span style="color: #999;">Yo\'q</span>')
    glb_link.short_description = "3D Model"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Dish modelining has_3d bayrog'ini avtomatik sinxronlash
        if obj.dish:
            obj.dish.has_3d = (obj.status == 'ready' and bool(obj.url_glb()))
            obj.dish.save(update_fields=['has_3d'])


@admin.register(DishLibrary)
class DishLibraryAdmin(admin.ModelAdmin):
    list_display = ('key', 'name_uz', 'name_ru', 'cuisine', 'real_size_cm', 'source', 'used_by_count', 'is_active')
    list_filter = ('cuisine', 'source', 'is_active')
    search_fields = ('key', 'name_uz', 'name_ru', 'aliases')


@admin.register(ARView)
class ARViewAdmin(admin.ModelAdmin):
    list_display = ('id', 'dish_id', 'restaurant_id', 'mode', 'device', 'duration_sec', 'converted', 'created_at')
    list_filter = ('mode', 'converted', 'created_at')
    readonly_fields = [f.name for f in ARView._meta.fields]
