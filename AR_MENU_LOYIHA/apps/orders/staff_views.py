import logging

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.exceptions import TenantMismatch
from core.permissions import IsStaff, IsCook
from apps.orders.models import Order
from apps.orders.serializers import serialize_order
from apps.orders.state import transition

log = logging.getLogger('orders.staff')

OPEN_STATUSES = ['new', 'accepted', 'cooking', 'ready']


def _get_order(request, pk):
    """⚡ DOIM tenant-scoped olish — boshqa restoran buyurtmasiga tegib bo'lmaydi"""
    order = (Order.objects
             .select_related('table', 'restaurant')
             .prefetch_related('items')
             .filter(id=pk, restaurant_id=request.staff.restaurant_id)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})
    return order


@api_view(['GET'])
@permission_classes([IsStaff])
def staff_orders(request):
    """GET /v1/staff/orders/?status=open|new|ready"""
    st = request.query_params.get('status', 'open')
    qs = (Order.objects
          .select_related('table')
          .prefetch_related('items')
          .filter(restaurant_id=request.staff.restaurant_id))
    qs = qs.filter(status__in=OPEN_STATUSES) if st == 'open' else qs.filter(status=st)
    qs = qs.order_by('created_at')[:200]

    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    agg = (Order.objects
           .filter(restaurant_id=request.staff.restaurant_id,
                   waiter=request.staff, created_at__gte=start,
                   status__in=['served', 'paid'])
           .aggregate(s=Sum('total'), c=Count('table', distinct=True)))

    return Response({
        'orders': [serialize_order(o) for o in qs],
        'stats': {'sum': float(agg['s'] or 0), 'tables': agg['c'] or 0,
                  'tips': float(getattr(request.staff, 'tips_balance', 0) or 0)},
    })


@api_view(['POST'])
@permission_classes([IsStaff])
def order_accept(request, pk):
    """POST /v1/staff/orders/{id}/accept/ → new → accepted (+ ofitsiant biriktiriladi)"""
    order = _get_order(request, pk)
    transition(order, 'accepted', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[staff] {request.staff.id} qabul qildi: {order.number}')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsStaff])
def order_serve(request, pk):
    """POST /v1/staff/orders/{id}/serve/ → ready → served"""
    order = _get_order(request, pk)
    transition(order, 'served', actor=request.staff)
    order.refresh_from_db()
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsStaff])
def order_cancel(request, pk):
    """POST /v1/staff/orders/{id}/cancel/ {reason}"""
    order = _get_order(request, pk)
    transition(order, 'cancelled', actor=request.staff,
               reason=request.data.get('reason', ''))
    order.refresh_from_db()
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsCook])
def order_cook(request, pk):
    """
    POST /v1/staff/orders/{id}/cook/ → accepted → cooking
    ⚡ Agar buyurtma hali 'new' bo'lsa (ofitsiant ulgurmagan) — avtomatik
    accepted qilinadi, oshxona kutib turmaydi.
    """
    order = _get_order(request, pk)
    if order.status == 'new':
        transition(order, 'accepted', actor=request.staff)
        order.refresh_from_db()
    transition(order, 'cooking', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[kds] tayyorlash boshlandi: {order.number}')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsCook])
def order_ready(request, pk):
    """
    POST /v1/staff/orders/{id}/ready/ → cooking → ready
    ⚡ Bu yerda ofitsiantga tovush+push ketadi (state._broadcast ichida).
    """
    order = _get_order(request, pk)
    transition(order, 'ready', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[kds] TAYYOR: {order.number} (stol {order.table_id})')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsCook])
def dish_stop(request, pk):
    """POST /v1/staff/dishes/{id}/stop/ — stop-list (taom tugadi)"""
    from apps.menu.models import Dish
    from core.ws import ws_send, g_admin, g_waiters, g_kds
    from core.cache import bump_menu_version

    dish = Dish.objects.filter(id=pk,
                               restaurant_id=request.staff.restaurant_id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': pk})

    dish.is_available = not dish.is_available
    dish.save(update_fields=['is_available'])
    bump_menu_version(dish.restaurant_id)      # ⚡ menyu keshi eskiradi

    data = {'dish_id': dish.id, 'name': dish.name_uz,
            'available': dish.is_available}
    for g in (g_admin, g_waiters, g_kds):
        ws_send(g(dish.restaurant_id), 'dish.stopped', data)

    return Response(data)


@api_view(['GET'])
@permission_classes([IsStaff])
def order_bill(request, pk):
    """GET /v1/staff/orders/{id}/bill/ — chek (items + service_fee + total, 3 til)"""
    order = _get_order(request, pk)
    items = [{
        'name': it.dish_name,
        'qty': it.qty,
        'price': str(it.price),
        'line_total': str(it.line_total),
        'modifiers': it.modifiers,
    } for it in order.items.all()]

    return Response({
        'order_id': order.id,
        'number': order.number,
        'table_no': order.table.number if order.table_id else '—',
        'items': items,
        'subtotal': str(order.subtotal),
        'service_fee': str(order.service_fee),
        'discount': str(order.discount),
        'total': str(order.total),
        'status': order.status,
    })


@api_view(['POST'])
@permission_classes([IsStaff])
def order_pay_cash(request, pk):
    """POST /v1/staff/orders/{id}/pay-cash/ — naqd to'lov → paid"""
    order = _get_order(request, pk)
    if order.status not in ('served', 'ready', 'cooking', 'accepted'):
        return Response({'error': f'Holatida to\'lov mumkin emas: {order.status}'}, status=400)

    from apps.payments.models import Payment
    pay = Payment.objects.create(
        restaurant=order.restaurant,
        order=order,
        provider='cash',
        amount=order.total,
        status='paid',
    )
    transition(order, 'paid', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[staff] Cash to\'lov: order#{order.id}, Payment#{pay.id}')
    return Response({'ok': True, 'payment_id': pay.id, 'status': 'paid'})
