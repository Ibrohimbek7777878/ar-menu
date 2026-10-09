"""Split bill + tips — hisobni bo'lish va tips"""
import math
import logging

from django.db import models
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

log = logging.getLogger('payments.split')


@api_view(['POST'])
@permission_classes([AllowAny])
def split_bill(request):
    """POST /v1/guest/split-bill/ {session_id, parts: 2}
    Hisobni n ta mehmon bo'yicha bo'lish (butun son).
    """
    session_id = request.data.get('session_id')
    parts = int(request.data.get('parts', 2))

    if not session_id:
        return Response({'error': 'session_id kerak'}, status=400)
    if parts < 2 or parts > 20:
        return Response({'error': 'parts 2-20 orasida bo\'lishi kerak'}, status=400)

    from apps.guest.models import GuestSession
    from apps.orders.models import Order

    session = GuestSession.objects.filter(public_id=session_id).first()
    if not session:
        return Response({'error': 'Sessiya topilmadi'}, status=404)

    # Ochiq buyurtmalar jami
    total = Order.objects.filter(
        session=session,
        status__in=('served', 'paid'),
    ).aggregate(total=models.Sum('total'))['total'] or 0

    per_person = math.ceil(float(total) / parts)
    remainder = float(total) - per_person * parts

    return Response({
        'ok': True,
        'total': float(total),
        'parts': parts,
        'per_person': per_person,
        'remainder': abs(remainder),
    })
