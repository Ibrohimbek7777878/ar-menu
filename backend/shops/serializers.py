from rest_framework import serializers
from .models import Shop


class ShopSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'slug', 'description', 'address',
            'phone', 'phone2', 'latitude', 'longitude',
            'category', 'category_name', 'image', 'banner',
            'working_hours', 'working_days',
            'is_open', 'is_featured', 'is_verified',
            'rating', 'reviews_count',
            'min_order', 'delivery_fee', 'free_delivery_from',
            'owner', 'owner_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'rating', 'reviews_count', 'created_at', 'updated_at']


class ShopListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'slug', 'image', 'category', 'category_name',
            'rating', 'reviews_count', 'is_open', 'is_featured'
        ]
