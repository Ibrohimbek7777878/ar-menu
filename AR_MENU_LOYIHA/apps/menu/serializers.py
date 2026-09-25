"""
⚡ Menyu serializeri — Redis'ga saqlanadi, shuning uchun TEKIS (nested minimal)
va DRF obyektlariga bog'liq emas. `lang` context orqali keladi.
"""
from rest_framework import serializers
from core.i18n import t, tdict
from apps.menu.models import Category, Dish, DishModifier, UpsellRule


class ModifierOutSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2,
                                     source='price_delta')
    group = serializers.CharField()
    is_default = serializers.BooleanField()
    single_choice = serializers.BooleanField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))


class CategoryOutSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    icon = serializers.CharField()
    image = serializers.CharField(source='image_webp')
    order = serializers.IntegerField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))


class DishOutSerializer(serializers.Serializer):
    """⚡ Mijoz menyusidagi taom — qisqa kalitlar (JSON hajmi kichik)"""
    id = serializers.IntegerField()
    cat = serializers.IntegerField(source='category_id')
    name = serializers.SerializerMethodField()
    desc = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    old_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    img = serializers.CharField(source='image_md')
    img_lg = serializers.CharField(source='image_webp')
    image = serializers.SerializerMethodField()
    image_lg = serializers.SerializerMethodField()
    blur = serializers.CharField(source='image_blur')
    weight_g = serializers.IntegerField()
    cook_min = serializers.IntegerField()
    calories = serializers.IntegerField()
    allergens = serializers.ListField()
    diet = serializers.ListField(source='diet_tags')
    has_3d = serializers.BooleanField()
    has_ar = serializers.BooleanField(source='has_3d')
    is_hit = serializers.BooleanField()
    is_new = serializers.BooleanField()
    rating = serializers.DecimalField(max_digits=3, decimal_places=2,
                                         source='rating_avg')
    is_available = serializers.BooleanField()   # ⚡ D-038: JS barcha joyda d.is_available o'qiydi
    available = serializers.BooleanField(source='is_available')
    modifiers = serializers.SerializerMethodField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))

    def get_desc(self, o):
        return t(o, 'desc', self.context.get('lang', 'uz'))

    def get_image(self, o):
        if o.image_md:
            return o.image_md
        if o.image:
            return o.image.url
        return ''

    def get_image_lg(self, o):
        if o.image_webp:
            return o.image_webp
        if o.image:
            return o.image.url
        return ''

    def get_modifiers(self, o):
        mods = [m for m in o.modifiers.all() if m.is_active]
        return ModifierOutSerializer(mods, many=True, context=self.context).data


class UpsellOutSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    trigger = serializers.SerializerMethodField()
    suggest = serializers.IntegerField(source='suggest_dish_id')
    text = serializers.SerializerMethodField()
    discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)

    def get_trigger(self, o):
        return [d.id for d in o.trigger_dishes.all()]

    def get_text(self, o):
        return t(o, 'text', self.context.get('lang', 'uz'))


# --------------------------------------------------- Admin (CRUD) serializerlari
class CategoryAdminSerializer(serializers.ModelSerializer):
    dish_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'icon', 'image',
                  'image_webp', 'order', 'is_active', 'dish_count']
        read_only_fields = ['image_webp']

    def get_dish_count(self, o):
        return o.dishes.count()


class ModifierAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = DishModifier
        fields = ['id', 'dish', 'name_uz', 'name_ru', 'name_en', 'price_delta',
                  'group', 'is_default', 'single_choice', 'order', 'is_active']


class DishAdminSerializer(serializers.ModelSerializer):
    modifiers = ModifierAdminSerializer(many=True, read_only=True)
    translations = serializers.SerializerMethodField()

    class Meta:
        model = Dish
        fields = [
            'id', 'category', 'name_uz', 'name_ru', 'name_en',
            'desc_uz', 'desc_ru', 'desc_en',
            'ingredients_uz', 'ingredients_ru', 'ingredients_en',
            'price', 'old_price', 'image', 'image_webp', 'image_md', 'image_sm',
            'weight_g', 'cook_min', 'calories', 'allergens', 'diet_tags',
            'ikpu_code', 'package_code', 'is_available', 'stop_until',
            'is_hit', 'is_new', 'order', 'has_3d', 'rating_avg', 'rating_cnt',
            'sold_count', 'modifiers', 'translations',
        ]
        read_only_fields = ['image_webp', 'image_md', 'image_sm', 'has_3d',
                            'rating_avg', 'rating_cnt', 'sold_count']

    def get_translations(self, o):
        from core.i18n import missing_translations
        return {'values': {'name': tdict(o, 'name'), 'desc': tdict(o, 'desc')},
                'missing': missing_translations(o, ['name', 'desc'])}

    def validate(self, data):
        # ⚡ Kategoriya boshqa restorannikimi
        cat = data.get('category')
        rid = self.context['request'].restaurant_id
        if cat and cat.restaurant_id != rid:
            raise serializers.ValidationError({'category': 'Boshqa restoran kategoriyasi'})
        if data.get('price') is not None and data['price'] < 0:
            raise serializers.ValidationError({'price': 'Narx manfiy bo\'lmaydi'})
        old = data.get('old_price')
        if old and data.get('price') and old <= data['price']:
            raise serializers.ValidationError(
                {'old_price': 'Eski narx joriy narxdan katta bo\'lishi kerak'})
        return data

    def validate_ikpu_code(self, value):
        from apps.menu.validators import validate_ikpu
        return validate_ikpu(value)

    def validate_package_code(self, value):
        from apps.menu.validators import validate_package_code
        return validate_package_code(value)


class UpsellAdminSerializer(serializers.ModelSerializer):
    accept_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = UpsellRule
        fields = ['id', 'trigger_dishes', 'trigger_category', 'suggest_dish',
                  'text_uz', 'text_ru', 'text_en', 'priority', 'max_per_order',
                  'discount_pct', 'is_active', 'shown_count', 'accepted_count',
                  'accept_rate']
        read_only_fields = ['shown_count', 'accepted_count']
