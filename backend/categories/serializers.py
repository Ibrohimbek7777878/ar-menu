from rest_framework import serializers
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_uz', 'name_ru', 'name_en',
            'icon', 'color', 'parent', 'sort_order', 'is_active',
            'children'
        ]

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data


class CategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_uz', 'name_ru', 'name_en',
            'icon', 'color', 'sort_order'
        ]
