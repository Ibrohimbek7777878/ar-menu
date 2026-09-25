"""
Courier API — Kuryer uchun API endpoint'lar.
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count
from django.utils import timezone

from couriers.models import Courier
from orders.models import Order, OrderItem, OrderStatusHistory
from orders.state_machine import transition_order

from .serializers import OrderListSerializer, OrderDetailSerializer


class IsCourier(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return isinstance(request.user, Courier) or hasattr(request.user, 'courier_profile')


def _get_courier(request):
    if isinstance(request.user, Courier):
        return request.user
    return getattr(request.user, 'courier_profile', None)


@api_view(['GET'])
@permission_classes([IsCourier])
def courier_dashboard(request):
    """Kuryer dashboard."""
    courier = _get_courier(request)

    active_orders = Order.objects.filter(
        courier=courier,
        status__in=['out_for_delivery', 'ready'],
    )

    today = timezone.now().date()
    today_delivered = Order.objects.filter(
        courier=courier,
        status='delivered',
        delivered_at__date=today,
    )

    stats = {
        'courier_id': courier.id if courier else None,
        'courier_name': courier.name if courier else '',
        'status': courier.status if courier else '',
        'active_orders': active_orders.count(),
        'today_delivered': today_delivered.count(),
        'today_earnings': today_delivered.aggregate(
            s=Sum('delivery_fee')
        )['s'] or 0,
    }

    return Response(stats)


@api_view(['GET'])
@permission_classes([IsCourier])
def courier_available_orders(request):
    """Mavjud buyurtmalar."""
    lat = float(request.GET.get('lat', 40.0))
    lng = float(request.GET.get('lng', 68.0))

    orders = Order.objects.filter(
        status='ready',
        courier__isnull=True,
    ).select_related('shop')[:20]

    serializer = OrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsCourier])
def courier_accept_order(request, pk):
    """Buyurtmani qabul qilish — race condition himoyasi bilan."""
    from django.db import transaction
    courier = _get_courier(request)

    with transaction.atomic():
        order = Order.objects.select_for_update().filter(pk=pk).first()
        if not order:
            return Response({'error': 'Buyurtma topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        if order.courier is not None:
            return Response({'error': 'Bu buyurtma allaqachon boshqa kuryer tomonidan qabul qilingan'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status != 'ready':
            return Response({'error': f'Buyurtma holati mos emas ({order.status})'}, status=status.HTTP_400_BAD_REQUEST)

        order.courier = courier
        order.status = 'out_for_delivery'
        order.save(update_fields=['courier', 'status'])

        OrderStatusHistory.objects.create(
            order=order, status='out_for_delivery',
            note=f'Kuryer {courier.name} tomonidan qabul qilindi'
        )

    # Telegram
    try:
        from notifications.services.telegram_service import send_courier_assigned
        send_courier_assigned(order)
    except Exception:
        pass

    return Response({'message': 'Buyurtma qabul qilindi'})


@api_view(['POST'])
@permission_classes([IsCourier])
def courier_deliver_order(request, pk):
    """Buyurtmani yetkazish."""
    courier = _get_courier(request)
    order = get_object_or_404(Order, pk=pk, courier=courier, status='out_for_delivery')

    success, msg = transition_order(order, 'delivered', actor=courier, request=request)
    if success:
        return Response({'message': msg})
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsCourier])
def courier_order_detail(request, pk):
    """Buyurtma tafsilotlari."""
    courier = _get_courier(request)
    order = get_object_or_404(Order, pk=pk, courier=courier)
    serializer = OrderDetailSerializer(order)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsCourier])
def courier_history(request):
    """Kuryer tarixi."""
    courier = _get_courier(request)
    orders = Order.objects.filter(
        courier=courier,
        status='delivered',
    ).order_by('-delivered_at')[:50]

    serializer = OrderListSerializer(orders, many=True)
    return Response(serializer.data)
