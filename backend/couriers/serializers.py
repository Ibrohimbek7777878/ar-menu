from rest_framework import serializers
from .models import Courier


class CourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courier
        fields = [
            'id', 'name', 'phone', 'status',
            'current_lat', 'current_lng', 'avatar',
            'vehicle_type', 'rating', 'total_deliveries',
            'created_at'
        ]
        read_only_fields = ['id', 'rating', 'total_deliveries', 'created_at']


class CourierLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courier
        fields = ['id', 'current_lat', 'current_lng', 'status']
        read_only_fields = ['id']
