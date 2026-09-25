import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.exceptions import TenantMismatch
from apps.ar3d.models import DishModel3D, ARView

log = logging.getLogger('ar3d.views')

AR_CACHE_TTL = 300


@api_view(['GET'])
@permission_classes([AllowAny])
def ar_info(request, dish_id):
    """
    GET /v1/ar/{dish_id}/
    """
    rid = getattr(request, 'restaurant_id', None)
    if not rid:
        # Try to get from dish's restaurant
        from apps.menu.models import Dish
        dish = Dish.objects.filter(id=dish_id).first()
        if dish:
            rid = dish.restaurant_id
        else:
            raise TenantMismatch({'dish_id': dish_id})

    lang = getattr(request, 'lang', request.query_params.get('lang', 'uz')) or request.query_params.get('lang', 'uz')
    ck = f'ar:{rid}:{dish_id}:{lang}'
    cached = cache.get(ck)
    if cached is not None:
        return Response(cached)

    from apps.menu.models import Dish
    dish = (Dish.objects
            .select_related('model3d')
            .filter(id=dish_id, restaurant_id=rid)
            .first())
    if dish is None:
        raise TenantMismatch({'dish_id': dish_id})

    name = getattr(dish, f'name_{lang}', '') or dish.name_uz
    m3d = getattr(dish, 'model3d', None)

    if m3d is None or not m3d.is_ready:
        data = {
            'ready': False,
            'status': m3d.status if m3d else 'none',
            'progress': m3d.progress if m3d else 0,
            'name': name,
            'poster': dish.image.url if dish.image else '',
            'fallback': 'image',
        }
        cache.set(ck, data, 30)
        return Response(data)

    data = {
        'ready': True,
        'dish_id': dish.id,
        'name': name,
        'glb': m3d.url_glb(),
        'usdz': m3d.url_usdz(),
        'poster': m3d.url_poster() or (dish.image.url if dish.image else ''),
        'preview_360': m3d.preview_360,
        'scale_m': m3d.size_m,
        'real_size_cm': float(m3d.real_size_cm),
        'glb_bytes': m3d.glb_bytes,
        'usdz_bytes': m3d.usdz_bytes,
        'poly_count': m3d.poly_count,
        'source': m3d.source,
        'fallback': 'ar',
    }
    cache.set(ck, data, AR_CACHE_TTL)
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def ar_view(request):
    """
    POST /v1/ar/view/
    {dish_id, session_id, table_id, mode, duration_sec, device, converted}
    """
    rid = getattr(request, 'restaurant_id', None)
    if not rid:
        # Try to get from dish
        try:
            dish_id = int(request.data.get('dish_id') or 0)
            from apps.menu.models import Dish
            d = Dish.objects.filter(id=dish_id).first()
            if d:
                rid = d.restaurant_id
        except Exception:
            pass
    if not rid:
        return Response({'ok': False}, status=status.HTTP_204_NO_CONTENT)

    from apps.menu.models import Dish
    try:
        dish_id = int(request.data.get('dish_id') or 0)
    except (TypeError, ValueError):
        return Response({'ok': False}, status=status.HTTP_204_NO_CONTENT)

    if not Dish.objects.filter(id=dish_id, restaurant_id=rid).exists():
        raise TenantMismatch({'dish_id': dish_id})

    mode = str(request.data.get('mode', '3d-only'))[:20]
    dur = max(0, min(3600, int(request.data.get('duration_sec') or 0)))
    device = str(request.data.get('device', ''))[:20]
    sid = str(request.data.get('session_id', ''))[:64]
    converted = bool(request.data.get('converted'))

    guest = table = None
    if sid:
        from apps.guest.models import GuestSession
        gs = GuestSession.objects.select_related('guest', 'table').filter(
            public_id=sid, restaurant_id=rid).first()
        if gs:
            guest, table = gs.guest, gs.table
        else:
            # Try session_id as string
            gs = GuestSession.objects.filter(public_id=sid).first()
            if gs:
                guest, table = gs.guest, gs.table

    ARView.objects.create(
        restaurant_id=rid, dish_id=dish_id, guest=guest, table=table,
        session_id=sid, mode=mode, duration_sec=dur, device=device,
        converted=converted,
    )

    # Denorm hisoblagichlar
    from django.db.models import F
    upd = {'view_count': F('view_count') + 1}
    if converted:
        upd['convert_count'] = F('convert_count') + 1
    DishModel3D.objects.filter(dish_id=dish_id).update(**upd)

    try:
        from core.queue import enqueue
        enqueue('analytics', 'ar_view', dish_id=dish_id, restaurant_id=rid,
                mode=mode, duration_sec=dur, converted=converted)
    except Exception:
        pass

    return Response({'ok': True}, status=status.HTTP_201_CREATED)
