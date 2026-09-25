import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


def map_view(request):
    """Xarita sahifasi — do'konlar bilan."""
    from shops.models import Shop
    from django.conf import settings as django_settings

    shop_qs = Shop.objects.filter(is_open=True)
    shops_list = []
    for shop in shop_qs:
        shops_list.append({
            'id': shop.id,
            'name': shop.name,
            'slug': shop.slug,
            'latitude': shop.latitude,
            'longitude': shop.longitude,
            'rating': float(shop.rating) if shop.rating is not None else 0,
            'delivery_fee': float(shop.delivery_fee) if shop.delivery_fee is not None else 0,
            'min_order': float(shop.min_order) if shop.min_order is not None else 0,
            'working_hours': shop.working_hours,
            'working_days': shop.working_days,
            'address': shop.address,
            'is_verified': shop.is_verified,
            'phone': shop.phone,
            'free_delivery_from': float(shop.free_delivery_from) if shop.free_delivery_from is not None else None,
            'reviews_count': shop.reviews_count,
            'image_url': shop.image.url if shop.image else None,
        })

    ctx = {
        'shops_json': json.dumps(shops_list),
        'default_lat': django_settings.MAP_DEFAULT_LAT,
        'default_lng': django_settings.MAP_DEFAULT_LNG,
        'language': getattr(request, 'language', 'uz'),
    }
    return render(request, 'customer/map_view.html', ctx)


@csrf_exempt
@require_POST
def save_location(request):
    """Mijozning manzilini saqlash (lat/lng)."""
    try:
        data = json.loads(request.body)
        lat = data.get('lat')
        lng = data.get('lng')
        address = data.get('address', '')

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            return JsonResponse({'success': False, 'error': 'Koordinatalar noto\'g\'ri formatda'})
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return JsonResponse({'success': False, 'error': 'Koordinatalar diapazondan tashqarida'})
        accuracy = data.get('accuracy')
        try:
            accuracy = float(accuracy) if accuracy is not None else None
            if accuracy is not None and not (0 <= accuracy <= 100000):
                accuracy = None
        except (TypeError, ValueError):
            accuracy = None

        # Session'da saqlash
        request.session['delivery_lat'] = lat
        request.session['delivery_lng'] = lng
        request.session['delivery_accuracy'] = accuracy
        request.session['delivery_address'] = address

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
def get_courier_location(request, order_pk):
    """Kuryerning joriy joylashuvini olish (API uchun)."""
    from orders.models import Order
    try:
        order = Order.objects.get(pk=order_pk)
        if order.courier:
            return JsonResponse({
                'success': True,
                'lat': order.courier.current_lat,
                'lng': order.courier.current_lng,
                'name': order.courier.name,
                'status': order.courier.status,
            })
        return JsonResponse({'success': False, 'error': 'Kuryer biriktirilmagan'})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Buyurtma topilmadi'})


@csrf_exempt
@require_POST
def update_courier_location(request):
    """Kuryerning joylashuvini yangilash (courier panel uchun)."""
    courier_id = request.session.get('courier_id')
    if not courier_id:
        return JsonResponse({'success': False, 'error': 'Kuryer tizimga kirgan emas'})

    try:
        data = json.loads(request.body)
        lat = data.get('lat')
        lng = data.get('lng')

        from couriers.models import Courier
        courier = Courier.objects.get(pk=courier_id)
        courier.current_lat = lat
        courier.current_lng = lng
        courier.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
