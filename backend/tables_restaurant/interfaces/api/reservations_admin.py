"""
Bronlar admin API (xodim): ro'yxat, qo'lda bron, tahrir va holat o'zgartirish. Ruxsat: `reservations` (rahbariyat + hostess;
ofitsiant ruxsatsiz). Restoran FAQAT xodimning o'z restorani (`staff_shop`): begona restoran broni — 404.

  GET   /api/restaurant/admin/v1/reservations/?from=&to=&status=&q=&table=&limit=   → {count, results:[...], truncated}
  POST  /api/restaurant/admin/v1/reservations/                                      → qo'lda bron (201)
  GET   /api/restaurant/admin/v1/reservations/<id>/
  PATCH /api/restaurant/admin/v1/reservations/<id>/                                  → holat va/yoki tahrir

Eski `/api/v1/restaurant/reservations/…` (hostess ekrani) O'ZGARMAGAN; ikkalasi bir xil holat mashinasi va to'qnashuv tekshiruvidan o'tadi.
"""
from rest_framework import status as http
from rest_framework.response import Response

from backend.api_input import InputError, RestoAdminAPIView, query_date, query_id, query_int, query_text
from orders.audit import log_audit
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from shops import booking_config as bc
from tables_restaurant import booking as svc
from tables_restaurant.models import TableReservation
from tables_restaurant.reservations import ReservationError
from web.restaurant_auth import staff_shop

LIST_LIMIT = 500
_STATUSES = dict(TableReservation.STATUS_CHOICES)


def _error(exc):
    body = {'error': exc.message, 'code': exc.code}
    if getattr(exc, 'field', None):
        body['field'] = exc.field
    return Response(body, status=exc.status)


def _statuses(request):
    """?status=pending,confirmed | active | all (standart: hammasi). Noma'lum holat — 400."""
    raw = query_text(request, 'status', 200).lower()
    if raw in ('', 'all'):
        return None
    out = []
    for part in raw.split(','):
        part = part.strip()
        if part == 'active':
            out += list(TableReservation.ACTIVE_STATUSES)
        elif part in _STATUSES:
            out.append(part)
        else:
            raise InputError(f"Noma'lum holat: {part}", 'status')
    return out


def _audit_snapshot(reservation):
    return {'status': reservation.status, 'table_id': reservation.table_id, 'date': str(reservation.reservation_date),
            'time': svc.hhmm(reservation.reservation_time), 'guests': reservation.guests_count,
            'duration_minutes': reservation.duration_minutes, 'event_type': reservation.event_type}


class ReservationsAdminView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('reservations')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=http.HTTP_404_NOT_FOUND)
        date_from, date_to = query_date(request, 'from'), query_date(request, 'to')
        if date_from is None and date_to is None:
            from django.utils import timezone
            date_from = timezone.localdate()                   # standart: bugundan boshlab (eski bronlar tarixini yuklamaslik uchun)
        count, rows = svc.list_for_staff(
            shop, date_from=date_from, date_to=date_to, statuses=_statuses(request), q=query_text(request, 'q', 100),
            table_id=query_id(request, 'table'), limit=query_int(request, 'limit', LIST_LIMIT, 1, LIST_LIMIT))
        config = bc.get_booking_config(shop)
        return Response({'count': count, 'truncated': count > len(rows), 'results': [svc.serialize_admin(r, config) for r in rows]})

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=http.HTTP_404_NOT_FOUND)
        config = bc.get_booking_config(shop)
        try:
            reservation, created = svc.create_booking(shop, request.data, staff=True, config=config)
        except ReservationError as exc:
            return _error(exc)
        if created:
            log_audit('reservation_created', request=request, actor=request.user, target_type='reservation',
                      target_id=reservation.pk, new_value=_audit_snapshot(reservation))
        return Response(svc.serialize_admin(reservation, config), status=http.HTTP_201_CREATED if created else http.HTTP_200_OK)


class ReservationDetailAdminView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('reservations')]

    def _load(self, request, pk):
        shop = staff_shop(request)
        if not shop:
            return None, None
        reservation = (TableReservation.objects.select_related('table', 'table__hall', 'hall')
                       .filter(pk=pk, shop=shop, is_deleted=False).first())
        return shop, reservation

    def get(self, request, pk):
        shop, reservation = self._load(request, pk)
        if reservation is None:
            return Response({'error': 'Bron topilmadi', 'code': 'not_found'}, status=http.HTTP_404_NOT_FOUND)
        return Response(svc.serialize_admin(reservation, bc.get_booking_config(shop)))

    def patch(self, request, pk):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=http.HTTP_404_NOT_FOUND)
        config = bc.get_booking_config(shop)
        try:
            reservation, changed, old = svc.update_booking(shop, pk, request.data, config=config)
        except ReservationError as exc:
            return _error(exc)
        if changed:
            log_audit('reservation_updated', request=request, actor=request.user, target_type='reservation',
                      target_id=reservation.pk, old_value=old, new_value={**_audit_snapshot(reservation), 'changed': changed})
        return Response(svc.serialize_admin(reservation, config))


class ReservationsConfigAdminView(RestoAdminAPIView):
    """Bron sozlamasini O'QISH (ruxsat `reservations`): qabul stoli xodimi `settings_admin`siz ham vaqt oraliqlari va tadbir
    turlarini ko'ra olsin (qo'lda bron formasi). Yozish faqat sozlamalar API'sida (`settings_admin`)."""
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('reservations')]

    def get(self, request):
        from shops.booking_config import get_booking_config
        shop = staff_shop(request)
        if not shop:
            return Response({'error': "Do'kon topilmadi.", 'code': 'no_shop'}, status=404)
        return Response(get_booking_config(shop.pk))
