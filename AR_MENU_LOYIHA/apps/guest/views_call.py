"""Call — mijoz ofitsiantni chaqiradi (M-09, 60s cooldown)"""
import logging
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.guest.models import Call, GuestSession

log = logging.getLogger('guest.call')


@api_view(['POST'])
@permission_classes([AllowAny])
def call_waiter(request):
    """POST /v1/guest/call-waiter/ {session_id, table_id}
    60s cooldown — bir stoldan ketma-ket chaqirsa 429.
    """
    session_id = request.data.get('session_id', '')
    table_id = request.data.get('table_id')

    if not session_id and table_id:
        s = GuestSession.objects.filter(table_id=table_id, ended_at__isnull=True).order_by('-created_at').first()
        if s:
            session_id = str(s.public_id)

    if not session_id or not table_id:
        return Response({'error': 'session_id va table_id kerak'}, status=400)

    session = GuestSession.objects.filter(public_id=session_id).select_related('restaurant').first()
    if not session:
        return Response({'error': 'Sessiya topilmadi'}, status=404)

    rid = session.restaurant_id

    # Cooldown tekshiruvi — oxirgi 60s ichida active call bo'lsa 429
    cutoff = timezone.now() - timezone.timedelta(seconds=Call.COOLDOWN_SEC)
    recent = Call.objects.filter(
        restaurant_id=rid, table_id=table_id,
        created_at__gte=cutoff,
        status__in=('new', 'accepted'),
    ).exists()
    if recent:
        return Response({'error': 'Iltimos, biroz kutib turing', 'retry_after': Call.COOLDOWN_SEC}, status=429)

    # Yaratish
    guest = session.guest
    call = Call.objects.create(
        restaurant_id=rid,
        table_id=table_id,
        guest=guest,
        session=session,
    )
    log.info(f'[call] Call#{call.id} — stol {table_id}, restoran {rid}')

    # WS xabar ofitsiantlarga
    try:
        from core.ws import ws_send, g_waiters, g_admin
        ws_send(g_waiters(rid), 'call.new', {
            'call_id': call.id,
            'table_id': table_id,
            'table_no': str(table_id),
        })
        ws_send(g_admin(rid), 'call.new', {
            'call_id': call.id,
            'table_id': table_id,
        })
    except Exception as e:
        log.warning(f'[call] WS xato: {e}')

    return Response({'ok': True, 'call_id': call.id})


@api_view(['GET'])
@permission_classes([AllowAny])
def call_status(request):
    """GET /v1/guest/call-status/?session_id=xxx — mijozning chaqiruv holati"""
    session_id = request.query_params.get('session_id', '')
    if not session_id:
        return Response({'error': 'session_id kerak'}, status=400)

    import uuid as _uuid
    try:
        _uuid.UUID(str(session_id))
    except (ValueError, AttributeError):
        return Response({'error': 'Noto\'g\'ri session_id formati'}, status=400)

    session = GuestSession.objects.filter(public_id=session_id).first()
    if not session:
        return Response({'error': 'Sessiya topilmadi'}, status=404)

    active = Call.objects.filter(
        session=session, status__in=('new', 'accepted')
    ).order_by('-created_at').first()

    if active:
        return Response({
            'ok': True,
            'status': active.status,
            'call_id': active.id,
        })
    return Response({'ok': True, 'status': None})


from apps.accounts.authentication import StaffJWTAuthentication
from core.permissions import IsStaff

@api_view(['GET'])
@authentication_classes([StaffJWTAuthentication])
@permission_classes([IsStaff])
def staff_calls_list(request):
    """GET /v1/staff/calls/ — restoran chaqiruvlari ro'yxati (yangi va qabul qilingan)"""
    rid = getattr(request, 'restaurant_id', None)
    status_filter = request.query_params.get('status')
    qs = Call.objects.filter(restaurant_id=rid).select_related('table', 'accepted_by')
    if status_filter:
        qs = qs.filter(status=status_filter)
    else:
        qs = qs.filter(status__in=('new', 'accepted'))

    calls = []
    for c in qs.order_by('-created_at')[:50]:
        calls.append({
            'id': c.id,
            'table_id': c.table_id,
            'table_number': c.table.number if c.table else None,
            'status': c.status,
            'created_at': c.created_at.isoformat(),
            'accepted_at': c.accepted_at.isoformat() if c.accepted_at else None,
            'accepted_by': c.accepted_by.full_name if c.accepted_by else None,
        })
    return Response({'calls': calls})


@api_view(['POST'])
@authentication_classes([StaffJWTAuthentication])
@permission_classes([IsStaff])
def staff_accept_call(request, pk):
    """POST /v1/staff/calls/{id}/accept/ — ofitsiant chaqiruvni qabul qiladi"""
    rid = getattr(request, 'restaurant_id', None)
    call = Call.objects.filter(id=pk, restaurant_id=rid, status='new').first()
    if not call:
        return Response({'error': 'Call topilmadi yoki allaqachon qabul qilindi'}, status=404)

    call.status = 'accepted'
    call.accepted_at = timezone.now()
    call.accepted_by = getattr(request, 'staff', None)
    call.save(update_fields=['status', 'accepted_at', 'accepted_by', 'updated_at'])

    # WS xabar mijozga
    try:
        from core.ws import ws_send, g_guest
        if call.session_id:
            ws_send(g_guest(str(call.session_id)), 'call.accepted', {
                'call_id': call.id,
            })
    except Exception:
        pass

    return Response({'ok': True, 'status': 'accepted'})


@api_view(['POST'])
@authentication_classes([StaffJWTAuthentication])
@permission_classes([IsStaff])
def staff_done_call(request, pk):
    """POST /v1/staff/calls/{id}/done/ — ofitsiant chaqiruvni tugatdi"""
    rid = getattr(request, 'restaurant_id', None)
    call = Call.objects.filter(id=pk, restaurant_id=rid, status__in=('new', 'accepted')).first()
    if not call:
        return Response({'error': 'Call topilmadi'}, status=404)

    call.status = 'done'
    call.done_at = timezone.now()
    call.save(update_fields=['status', 'done_at', 'updated_at'])

    # WS xabar mijozga
    try:
        from core.ws import ws_send, g_guest
        if call.session_id:
            ws_send(g_guest(str(call.session_id)), 'call.done', {
                'call_id': call.id,
            })
    except Exception:
        pass

    return Response({'ok': True, 'status': 'done'})
