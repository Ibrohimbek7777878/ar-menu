from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    has_discount = serializers.BooleanField(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description',
            'image', 'image2', 'image3',
            'price', 'old_price', 'unit', 'min_quantity',
            'category', 'category_name', 'subcategory',
            'shop', 'shop_name',
            'brand', 'manufacturer', 'country_of_origin',
            'weight', 'volume', 'pack_size',
            'calories', 'protein', 'fat', 'carbs',
            'ingredients', 'expiry_date', 'barcode',
            'is_available', 'stock', 'is_featured', 'is_halal', 'is_organic',
            'rating', 'reviews_count', 'tags',
            'has_discount', 'discount_percent',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'rating', 'reviews_count', 'created_at', 'updated_at'
        ]


class ProductListSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    has_discount = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'image', 'price', 'old_price',
            'unit', 'shop', 'shop_name', 'is_available', 'rating',
            'has_discount'
        ]
