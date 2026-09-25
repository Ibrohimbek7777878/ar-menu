from rest_framework import serializers
from apps.tenants.models import Restaurant, Plan, Subscription


class RestaurantPublicSerializer(serializers.ModelSerializer):
    """⚡ Mijozga ko'rinadigan qism — maxfiy maydonlar YO'Q (ofd_config, inn)"""
    colors = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    langs = serializers.ListField(source='langs_enabled', read_only=True)

    class Meta:
        model = Restaurant
        fields = ['id', 'slug', 'name', 'logo', 'colors', 'langs',
                  'default_lang', 'service_fee_pct', 'city']

    def get_colors(self, obj):
        return {'primary': obj.color_primary, 'accent': obj.color_accent}

    def get_logo(self, obj):
        return obj.logo.url if obj.logo else None


class RestaurantAdminSerializer(serializers.ModelSerializer):
    """Restoran admini ko'radigan/tahrirlaydigan qism"""
    class Meta:
        model = Restaurant
        fields = [
            'id', 'slug', 'name', 'legal_name', 'inn', 'phone', 'address', 'city',
            'lat', 'lng', 'logo', 'color_primary', 'color_accent', 'custom_domain',
            'default_lang', 'langs_enabled', 'plan', 'plan_expires',
            'ar_model_limit', 'table_limit', 'service_fee_pct',
            'ofd_provider', 'fiscal_enabled', 'is_active', 'menu_version',
        ]
        read_only_fields = ['id', 'slug', 'plan', 'plan_expires',
                            'ar_model_limit', 'table_limit', 'menu_version']


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['code', 'name_uz', 'name_ru', 'name_en', 'price_month_uzs',
                  'price_year_uzs', 'table_limit', 'dish_limit', 'ar_model_limit',
                  'staff_limit', 'features']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = ['id', 'plan', 'status', 'period', 'started_at',
                  'expires_at', 'amount_uzs', 'paid_at']
