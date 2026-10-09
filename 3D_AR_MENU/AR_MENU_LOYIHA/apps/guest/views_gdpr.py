"""GDPR — eksport va o'chirish (ЗРУ-547 muvofiqlik)"""
import json
import logging

from django.http import JsonResponse
from apps.accounts.authentication import StaffJWTAuthentication
from core.permissions import IsRestAdmin
from rest_framework.decorators import api_view, authentication_classes, permission_classes

log = logging.getLogger('guest.gdpr')


@api_view(['GET'])
@authentication_classes([StaffJWTAuthentication])
@permission_classes([IsRestAdmin])
def gdpr_export(request, guest_id):
    """GET /v1/admin/gdpr/export/<guest_id>/ — mijozning barcha ma'lumoti JSON (faqat o'z restorani)"""
    from apps.guest.models import Guest, GuestSession
    from apps.orders.models import Order

    rid = getattr(request, 'restaurant_id', None)
    guest = Guest.objects.filter(id=guest_id, restaurant_id=rid).first()
    if not guest:
        return JsonResponse({'error': 'Guest topilmadi'}, status=404)

    # Sessiyalar (faqat shu restoran)
    sessions = list(GuestSession.objects.filter(guest=guest, restaurant_id=rid).values(
        'id', 'public_id', 'started_at', 'ended_at', 'order_count'
    ))

    # Buyurtmalar (faqat shu restoran)
    orders = []
    for o in Order.objects.filter(guest=guest, restaurant_id=rid).prefetch_related('items'):
        items = list(o.items.values('dish_name', 'qty', 'price', 'line_total', 'note'))
        orders.append({
            'id': o.id,
            'number': o.number,
            'status': o.status,
            'total': str(o.total),
            'created_at': o.created_at.isoformat(),
            'items': items,
        })

    data = {
        'guest': {
            'id': guest.id,
            'phone': guest.phone,
            'name': guest.name,
            'lang': guest.lang,
            'bonus': str(guest.bonus),
            'birthday': str(guest.birthday) if guest.birthday else None,
            'visits': guest.visits,
            'total_spent': str(guest.total_spent),
            'created_at': guest.created_at.isoformat(),
        },
        'sessions': sessions,
        'orders': orders,
        'export_date': str(__import__('datetime').datetime.now()),
    }

    log.info(f'[gdpr] export guest#{guest_id} rest#{rid} — {len(orders)} buyurtma')
    return JsonResponse(data, json_dumps_params={'ensure_ascii': False})


@api_view(['DELETE'])
@authentication_classes([StaffJWTAuthentication])
@permission_classes([IsRestAdmin])
def gdpr_delete(request, guest_id):
    """DELETE /v1/admin/gdpr/<guest_id>/ — PII ni anonimlashtirish (ЗРУ-547)"""
    from apps.guest.models import Guest, GuestSession
    from apps.orders.models import Order

    rid = getattr(request, 'restaurant_id', None)
    guest = Guest.objects.filter(id=guest_id, restaurant_id=rid).first()
    if not guest:
        return JsonResponse({'error': 'Guest topilmadi'}, status=404)

    # PII ni o'chirish (anonimlashtirish)
    guest.phone = ''
    guest.name = f'Anonim#{guest.id}'
    guest.tg_user_id = None
    guest.birthday = None
    guest.bonus = 0
    guest.save(update_fields=['phone', 'name', 'tg_user_id', 'birthday', 'bonus', 'updated_at'])

    log.info(f'[gdpr] delete guest#{guest_id} rest#{rid} — PII anonimlashtirildi')
    return JsonResponse({'ok': True, 'message': 'PII anonimlashtirildi'})
