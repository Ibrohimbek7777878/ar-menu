from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Order, OrderItem, OrderStatusHistory
from .serializers import (
    OrderSerializer, OrderCreateSerializer,
    OrderStatusUpdateSerializer, OrderItemSerializer
)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Order.objects.all()
        if user.role == 'shop_owner':
            return Order.objects.filter(shop__owner=user)
        if user.role == 'operator':
            return Order.objects.all()
        if user.role == 'courier':
            return Order.objects.filter(courier__phone=user.username)
        return Order.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            # Optimistic locking — faqat bitta request statusni o'zgartira oladi
            order = Order.objects.select_for_update().get(pk=pk)
            serializer = OrderStatusUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            new_status = serializer.validated_data['status']
            note = serializer.validated_data.get('note', '')
            cancel_reason = serializer.validated_data.get('cancel_reason', '')
            cancel_reason_code = serializer.validated_data.get('cancel_reason_code', '')
            courier_id = serializer.validated_data.get('courier')

            OrderStatusHistory.objects.create(
                order=order,
                status=new_status,
                note=note,
                changed_by=request.user if request.user.is_authenticated else None
            )

            order.status = new_status
            if note:
                order.notes = note
            if cancel_reason:
                order.cancel_reason = cancel_reason
            if cancel_reason_code:
                order.cancel_reason_code = cancel_reason_code
            if courier_id:
                order.courier_id = courier_id
            if new_status == 'delivered':
                order.delivered_at = timezone.now()
            order.save()

        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        user = request.user
        if user.role == 'shop_owner':
            orders = Order.objects.filter(shop__owner=user)
        elif user.role == 'courier':
            orders = Order.objects.filter(courier__phone=user.username)
        else:
            orders = Order.objects.none()
        serializer = OrderSerializer(orders[:50], many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        orders = Order.objects.filter(status='pending')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
