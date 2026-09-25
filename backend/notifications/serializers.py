from rest_framework import serializers
from .models import NotificationLog, Banner, Promotion, Review, AppSetting


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = ['id', 'order', 'type', 'recipient', 'message', 'sent_at', 'success']
        read_only_fields = ['id', 'sent_at']


class BannerSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Banner
        fields = [
            'id', 'title', 'image', 'link', 'shop', 'shop_name',
            'is_active', 'sort_order', 'start_date', 'end_date'
        ]
        read_only_fields = ['id']


class PromotionSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'type', 'value', 'min_order',
            'shop', 'product', 'is_active',
            'start_date', 'end_date', 'max_uses', 'current_uses',
            'is_valid'
        ]
        read_only_fields = ['id', 'current_uses']


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'product', 'customer', 'customer_name',
            'order', 'rating', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = ['id', 'key', 'value', 'description', 'category', 'updated_at']
        read_only_fields = ['id', 'updated_at']
