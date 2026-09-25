"""
Maps API — do'konlar, joylashuv va yetkazib berish narxi.
"""
from decimal import Decimal
from django.conf import settings
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from shops.models import Shop
from orders.delivery import DeliveryZone


def _haversine(lat1, lng1, lat2, lng2):
    import math
    R = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@api_view(['GET'])
@permission_classes([AllowAny])
def maps_shops_api(request):
    """GET /api/v1/maps/shops/?lat=&lng=&sort=distance|rating"""
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')
    sort = request.GET.get('sort', 'distance')
    qs = Shop.objects.filter(is_open=True)
    data = []
    for s in qs:
        item = {
            'id': s.id, 'name': s.name, 'slug': s.slug,
            'latitude': s.latitude, 'longitude': s.longitude,
            'rating': s.rating, 'delivery_fee': s.delivery_fee,
            'min_order': s.min_order, 'is_verified': s.is_verified,
            'address': s.address, 'image_url': s.image.url if s.image else None,
        }
        if lat and lng and s.latitude and s.longitude:
            item['distance_km'] = round(_haversine(float(lat), float(lng), s.latitude, s.longitude), 2)
        data.append(item)
    if sort == 'rating':
        data.sort(key=lambda x: x['rating'] or 0, reverse=True)
    elif lat and lng:
        data.sort(key=lambda x: x.get('distance_km', 999))
    return Response({'count': len(data), 'shops': data})


@api_view(['GET'])
@permission_classes([AllowAny])
def delivery_quote_api(request):
    """GET /api/v1/maps/delivery-quote/?shop_id=&lat=&lng=&total=&weight="""
    shop_id = request.GET.get('shop_id')
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')
    total = Decimal(request.GET.get('total', '0'))
    weight = Decimal(request.GET.get('weight', '0'))

    try:
        shop = Shop.objects.get(pk=shop_id)
    except (Shop.DoesNotExist, ValueError, TypeError):
        return Response({'success': False, 'error': 'Do\'kon topilmadi'}, status=404)

    if not (lat and lng and shop.latitude and shop.longitude):
        return Response({'success': False, 'error': 'Koordinatalar kerak'}, status=400)

    distance = Decimal(str(_haversine(shop.latitude, shop.longitude, float(lat), float(lng))))
    zone = DeliveryZone.objects.filter(is_active=True).first()
    if not zone:
        return Response({'success': False, 'error': 'Zona topilmadi'}, status=404)

    fee = zone.calculate_fee(distance, total, weight_kg=weight)
    est_minutes = max(15, int(distance * 6) + 10)

    return Response({
        'success': True,
        'zone': zone.name,
        'distance_km': round(float(distance), 2),
        'base_fee': str(fee['base_fee']),
        'distance_fee': str(fee['distance_fee']),
        'peak_fee': str(fee['peak_fee']),
        'weight_fee': str(fee['weight_fee']),
        'discount': str(fee['discount']),
        'total_fee': str(fee['total_fee']),
        'is_free': fee['is_free'],
        'estimated_minutes': est_minutes,
    })
