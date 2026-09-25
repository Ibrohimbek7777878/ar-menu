from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'price', 'quantity', 'unit', 'total'
        ]
        read_only_fields = ['id', 'total']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source='changed_by.username', read_only=True
    )

    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'status', 'note', 'changed_by', 'changed_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = OrderStatusHistorySerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    courier_name = serializers.CharField(source='courier.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name',
            'customer_phone_1', 'customer_phone_2', 'customer_phone_3',
            'shop', 'shop_name',
            'delivery_address', 'delivery_lat', 'delivery_lng',
            'notes', 'total_amount', 'delivery_fee',
            'discount_amount', 'final_amount',
            'status', 'is_pickup',
            'courier', 'courier_name',
            'confirmed_by_phone', 'cancel_reason', 'cancel_reason_code',
            'items', 'history',
            'created_at', 'updated_at', 'delivered_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'created_at', 'updated_at', 'delivered_at'
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'customer', 'customer_name',
            'customer_phone_1', 'customer_phone_2', 'customer_phone_3',
            'shop', 'delivery_address', 'delivery_lat', 'delivery_lng',
            'notes', 'is_pickup', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        import uuid
        validated_data['order_number'] = f'ORD-{uuid.uuid4().hex[:8].upper()}'
        validated_data['total_amount'] = sum(
            item['price'] * item['quantity'] for item in items_data
        )
        validated_data['delivery_fee'] = 0
        validated_data['discount_amount'] = 0
        validated_data['final_amount'] = validated_data['total_amount']
        order = Order.objects.create(**validated_data)
        for item in items_data:
            item['total'] = item['price'] * item['quantity']
            OrderItem.objects.create(order=order, **item)
        return order


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    note = serializers.CharField(required=False, default='')
    cancel_reason = serializers.CharField(required=False, default='')
    cancel_reason_code = serializers.CharField(required=False, default='')
    courier = serializers.IntegerField(required=False)
