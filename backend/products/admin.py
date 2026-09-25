from django.contrib import admin
from .models import Product, ThreeDAsset, ProductBundle


class ThreeDAssetInline(admin.StackedInline):
    model = ThreeDAsset
    extra = 0
    verbose_name = '3D Asset'
    verbose_name_plural = '3D Assetlar'
    fields = [
        'glb_file', 'usdz_file', 'poster_image', 'alt_text',
        'ar_scale', 'ar_enabled', 'auto_rotate', 'loop',
        'camera_orbit', 'min_camera_orbit', 'max_camera_orbit',
        'shadow_intensity', 'shadow_softness', 'environment_image',
    ]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'shop', 'price', 'old_price', 'unit',
        'category', 'design_template', 'is_available', 'stock', 'is_featured',
        'rating', 'reviews_count', 'weight_g'
    ]
    list_filter = ['design_template', 'is_available', 'is_featured', 'is_halal', 'is_organic', 'category', 'shop']
    search_fields = ['name', 'brand', 'description', 'barcode']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ThreeDAssetInline]
    readonly_fields = ['created_at', 'updated_at']
    actions = ['mark_available', 'mark_unavailable', 'mark_featured', 'unmark_featured']

    def mark_available(self, request, queryset):
        count = queryset.update(is_available=True)
        self.message_user(request, f'{count} ta mahsulot mavjud deb belgilandi')
    mark_available.short_description = "Mavjud deb belgilash"

    def mark_unavailable(self, request, queryset):
        count = queryset.update(is_available=False)
        self.message_user(request, f'{count} ta mahsulot mavjud emas deb belgilandi')
    mark_unavailable.short_description = "Mavjud emas deb belgilash"

    def mark_featured(self, request, queryset):
        count = queryset.update(is_featured=True)
        self.message_user(request, f'{count} ta mahsulot tanlangan deb belgilandi')
    mark_featured.short_description = "Tanlangan deb belgilash"

    def unmark_featured(self, request, queryset):
        count = queryset.update(is_featured=False)
        self.message_user(request, f'{count} ta mahsulot tanlangan deb belgilanmadi')
    unmark_featured.short_description = "Tanlangan deb belgilanmaslik"


@admin.register(ProductBundle)
class ProductBundleAdmin(admin.ModelAdmin):
    list_display = ['name','shop','bundle_price','original_price','is_active','created_at']
    list_filter = ['is_active','shop']
    search_fields = ['name','shop__name']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ['products']
