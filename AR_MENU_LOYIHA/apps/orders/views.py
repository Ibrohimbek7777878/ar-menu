import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from core.exceptions import TenantMismatch
from core.idempotency import release_idempotency
from apps.orders.models import Order
from apps.orders.serializers import serialize_order
from apps.orders.services import create_order, add_items

log = logging.getLogger('orders.views')


def _guest_session(request):
    """Mijoz sessiyasi — FAZA 4 da yaratilgan GuestSession"""
    from apps.guest.models import GuestSession
    sid = (request.data.get('session_id')
           or request.headers.get('X-Session-Id')
           or request.headers.get('X-Session-id')
           or request.query_params.get('session_id')
           or request.GET.get('session_id'))
    if not sid:
        return None
    # Try to find by public_id or session_id field
    return GuestSession.objects.select_related('guest').filter(
        public_id=sid, restaurant_id=getattr(request, 'restaurant_id', None)).first() or \
           GuestSession.objects.select_related('guest').filter(
        public_id=sid).first()


@api_view(['POST'])
@permission_classes([AllowAny])
def order_create(request):
    """
    POST /v1/orders/
    Headers: X-Idempotency-Key: <uuid>
    Body: {session_id, table_id, items:[{dish_id,qty,modifiers,note,ar_viewed}], note}
    """
    # Use TenantMiddleware's restaurant_id or try to resolve from table
    rid = getattr(request, 'restaurant_id', None)
    if not rid:
        # Try to get from table_id
        table_id = request.data.get('table_id')
        if table_id:
            from apps.tables.models import Table
            t = Table.objects.filter(id=table_id).first()
            if t:
                rid = t.restaurant_id
                request.restaurant_id = rid
        if not rid:
            raise TenantMismatch({'reason': 'restaurant_not_resolved'})

    idem_key = (request.headers.get('X-Idempotency-Key') or request.headers.get('X-IDENTITY-KEY') or '')[:64]
    # Also check case-insensitive
    if not idem_key:
        for k, v in request.headers.items():
            if k.lower() == 'x-idempotency-key':
                idem_key = str(v)[:64]
                break

    session = _guest_session(request)

    try:
        order = create_order(
            restaurant_id=rid,
            session_id=session.public_id if session else request.data.get('session_id', ''),
            table_id=request.data.get('table_id'),
            items=request.data.get('items') or [],
            note=request.data.get('note', ''),
            idem_key=idem_key,
            guest=session.guest if session else None,
            source='qr',
        )
    except Exception:
        release_idempotency(idem_key)     # ⚡ PENDING bo'shatiladi
        raise

    return Response(serialize_order(order), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def order_detail(request, pk):
    """
    GET /v1/orders/{id}/
    ⚡ Tenant scope + sessiya tekshiruvi — begona buyurtma ko'rinmaydi.
    """
    rid = getattr(request, 'restaurant_id', None)
    # If no rid, try to get from order's restaurant?
    order = (Order.objects
             .select_related('table', 'restaurant')
             .prefetch_related('items')
             .filter(id=pk)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})
    if rid and order.restaurant_id != rid:
        raise TenantMismatch({'order_id': pk})
    # If rid not set, set it
    if not rid:
        request.restaurant_id = order.restaurant_id

    sid = (request.headers.get('X-Session-Id') or request.headers.get('X-Session-id')
           or request.query_params.get('session_id')
           or request.GET.get('session_id'))
    if order.session_id and sid and str(sid) != str(order.session_id):
        # Also check if sid is uuid string vs public_id
        if str(sid) != str(order.session_id):
            raise TenantMismatch({'order_id': pk, 'reason': 'session'})

    return Response(serialize_order(order))


@api_view(['GET'])
@permission_classes([AllowAny])
def order_by_session(request, sid):
    """GET /v1/orders/session/{sid}/ — shu sessiyaning barcha buyurtmalari (hisob uchun)"""
    rid = getattr(request, 'restaurant_id', None)
    # If no rid, get from first order's restaurant?
    qs = (Order.objects
          .select_related('table')
          .prefetch_related('items')
          .filter(session_id=sid)
          .order_by('created_at'))
    if rid:
        qs = qs.filter(restaurant_id=rid)
    orders = [serialize_order(o) for o in qs]
    # Grand total for open orders
    grand = sum(float(o['total']) for o in orders if o['status'] in ['new', 'accepted', 'cooking', 'ready', 'served'])
    return Response({'orders': orders, 'count': len(orders),
                     'grand_total': f'{grand:.2f}'})


@api_view(['POST'])
@permission_classes([AllowAny])
def order_add_items(request, pk):
    """
    POST /v1/orders/{id}/add-items/
    Mijoz "yana buyurtma" beradi — mavjud buyurtmaga qo'shiladi (yangi chek emas).
    """
    rid = getattr(request, 'restaurant_id', None)
    order = (Order.objects
             .select_related('restaurant', 'table')
             .prefetch_related('items')
             .filter(id=pk)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})
    if rid and order.restaurant_id != rid:
        raise TenantMismatch({'order_id': pk})

    sid = request.headers.get('X-Session-Id') or request.headers.get('X-Session-id') or request.data.get('session_id')
    if order.session_id and sid and str(sid) != str(order.session_id):
        raise TenantMismatch({'order_id': pk, 'reason': 'session'})

    items = request.data.get('items') or []
    if not items:
        raise TenantMismatch({'reason': 'empty_items'})

    order = add_items(order, items)
    order.refresh_from_db()
    return Response(serialize_order(
        Order.objects.select_related('table').prefetch_related('items').get(id=order.id)))


@api_view(['GET'])
@permission_classes([AllowAny])
def sync_events(request):
    """
    GET /v1/sync/?since_seq=1047[&scope=kds|waiters|admin|guest]
    ⚡ WS uzilib qolgan paytdagi xabarlarni qaytaradi.
    """
    from core.ws import read_journal, g_kds, g_waiters, g_admin, g_guest
    from apps.accounts.tokens import decode

    since = int(request.query_params.get('since_seq') or request.GET.get('since_seq') or 0)
    scope = request.query_params.get('scope', '') or request.GET.get('scope', '')

    auth = request.headers.get('Authorization', '') or request.META.get('HTTP_AUTHORIZATION', '')
    payload = None
    if auth.startswith('Bearer '):
        try:
            payload = decode(auth[7:], expect_typ=None)
        except Exception:
            payload = None

    if payload and payload.get('rid'):
        rid = payload['rid']
        role = payload.get('role')
        group = {'kds': g_kds(rid), 'waiters': g_waiters(rid),
                 'admin': g_admin(rid)}.get(scope)
        if group is None:
            group = {'cook': g_kds(rid), 'waiter': g_waiters(rid),
                     'admin': g_admin(rid), 'owner': g_admin(rid)}.get(role, g_waiters(rid))
    else:
        sid = (request.headers.get('X-Session-Id') or request.headers.get('X-Session-id')
               or request.query_params.get('session_id') or request.GET.get('session_id'))
        if not sid:
            raise TenantMismatch({'reason': 'no_session'})
        group = g_guest(sid)

    events = read_journal(group, since_seq=since)
    return Response({'events': events, 'count': len(events),
                     'last_seq': events[-1]['seq'] if events else since})
