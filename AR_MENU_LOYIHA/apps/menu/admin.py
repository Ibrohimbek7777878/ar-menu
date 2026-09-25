from django.contrib import admin
from django.utils.html import format_html
from apps.menu.models import Category, Dish, DishModifier, UpsellRule


class DishModifierInline(admin.TabularInline):
    model = DishModifier
    extra = 1
    fields = ('name_uz', 'name_ru', 'price_delta', 'is_default', 'is_active', 'order')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'name_uz', 'name_ru', 'icon', 'order', 'is_active', 'dish_count')
    list_filter = ('restaurant', 'is_active')
    search_fields = ('name_uz', 'name_ru', 'name_en', 'restaurant__name')
    ordering = ('restaurant', 'order', 'id')

    def dish_count(self, obj):
        return obj.dishes.count()
    dish_count.short_description = "Taomlar soni"


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ('id', 'image_preview', 'name_uz', 'category', 'price', 'is_available', 'has_3d', 'cook_min', 'order')
    list_filter = ('restaurant', 'category', 'is_available', 'has_3d', 'is_hit', 'is_new')
    search_fields = ('name_uz', 'name_ru', 'name_en', 'desc_uz', 'restaurant__name')
    list_editable = ('price', 'is_available', 'has_3d', 'order')
    inlines = [DishModifierInline]
    fieldsets = (
        ('Asosiy', {
            'fields': ('restaurant', 'category', 'name_uz', 'name_ru', 'name_en', 'price', 'old_price')
        }),
        ('Rasm va 3D', {
            'fields': ('image', 'image_preview', 'has_3d', 'image_md', 'image_webp')
        }),
        ('Tavsif va Tarkib', {
            'fields': ('desc_uz', 'desc_ru', 'desc_en', 'ingredients_uz', 'ingredients_ru', 'allergens', 'diet_tags')
        }),
        ('Qo\'shimcha parametrlar', {
            'fields': ('weight_g', 'cook_min', 'calories', 'ikpu_code', 'package_code', 'is_available', 'is_hit', 'is_new', 'order')
        })
    )
    readonly_fields = ('image_preview',)

    def image_preview(self, obj):
        url = obj.image_md or (obj.image.url if obj.image else None)
        if url:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />', url)
        return format_html('<span style="color:#888;">Rasm yo\'q</span>')
    image_preview.short_description = "Rasm"


@admin.register(DishModifier)
class DishModifierAdmin(admin.ModelAdmin):
    list_display = ('id', 'dish', 'name_uz', 'price_delta', 'is_default', 'is_active', 'order')
    list_filter = ('is_active', 'is_default')
    search_fields = ('name_uz', 'dish__name_uz')


@admin.register(UpsellRule)
class UpsellRuleAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'suggest_dish', 'text_uz', 'discount_pct', 'priority', 'is_active')
    list_filter = ('restaurant', 'is_active')
    search_fields = ('text_uz', 'suggest_dish__name_uz')
