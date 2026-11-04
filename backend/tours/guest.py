"""
Mehmon sayri (`GET /api/restaurant/guest/tour/`): faqat `published`, restoran bo'yicha, juda kam SQL va qisqa muddatli kesh.

Kesh: restoran bo'yicha versiya hisoblagichi (`bump_version` - e'lon/yashirish/tahrirda) + qisqa TTL (boshqa jarayonlardagi
LocMem nusxalari ham tez yangilansin). Kesh ishlamasa xizmat to'xtamaydi (to'g'ridan-to'g'ri bazadan).
"""
import logging

from django.conf import settings
from django.core.cache import cache
from django.db.models import F, Q

from tours import storage
from tours.models import Tour, TourHotspot, TourStop

logger = logging.getLogger(__name__)

DISABLED = {'enabled': False}


def _ttl():
    try:
        return max(0, int(getattr(settings, 'TOUR_GUEST_CACHE_S', 20)))
    except (TypeError, ValueError):
        return 20


def _version_key(shop_id):
    return f'tours:gv:{int(shop_id)}'


def _version(shop_id):
    try:
        value = cache.get(_version_key(shop_id))
        if value is None:
            cache.add(_version_key(shop_id), 1, None)
            value = cache.get(_version_key(shop_id)) or 1
        return int(value)
    except Exception:  # noqa: BLE001 — kesh ishlamasa: versiyasiz (TTL baribir qisqa)
        return 0


def bump_version(shop_id):
    """Restoran sayri o'zgardi: eski kesh nusxalari endi o'qilmaydi."""
    try:
        cache.incr(_version_key(shop_id))
    except ValueError:
        try:
            cache.set(_version_key(shop_id), 2, None)
        except Exception:  # noqa: BLE001
            pass
    except Exception:  # noqa: BLE001
        pass


def tour_module_enabled(shop_id, request=None):
    """Brendning «sayr» bo'limi yoqiqmi (`modules.tour`; standart - yoqiq). Brend moduli bo'lmasa `business_profile` dan xavfsiz o'qiladi."""
    try:
        from shops.brand import module_enabled
        from shops.guest_profile import guest_brand_for_shop_id
    except ImportError:
        from shops.models import Shop
        profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
        brand = profile.get('brand') if isinstance(profile, dict) else None
        modules = brand.get('modules') if isinstance(brand, dict) else None
        value = modules.get('tour') if isinstance(modules, dict) else None
        return value if isinstance(value, bool) else True
    return module_enabled(guest_brand_for_shop_id(shop_id, request), 'tour')


def _build(shop_id, hall_id):
    qs = Tour.objects.filter(shop_id=shop_id, status=Tour.PUBLISHED, is_archived=False)
    if hall_id:
        qs = qs.filter(hall_id=hall_id)
    tour = qs.select_related('hall').order_by(F('hall_id').asc(nulls_first=True), 'id').first()
    if tour is None:
        return dict(DISABLED)
    video = storage.variant_urls(tour.variants)
    stops = [{'id': s.id, 'title': s.title, 't': round(s.t, 3)} for s in TourStop.objects.filter(tour_id=tour.pk)]
    hotspots = []
    # Yashirilgan/o'chirilgan stolga bron qilib bo'lmaydi: belgisi ham ko'rinmaydi (stolsiz, faqat yozuvli belgilar qoladi)
    visible = Q(table__isnull=True) | Q(table__is_deleted=False, table__is_active=True)
    for h in TourHotspot.objects.filter(visible, tour_id=tour.pk).select_related('table'):
        table = h.table
        hotspots.append({
            'id': h.id, 'table_id': h.table_id, 'table_number': table.number if table else '',
            'capacity': table.capacity if table else None, 'label': h.label,
            't_start': round(h.t_start, 3), 't_end': round(h.t_end, 3), 'x': round(h.x, 4), 'y': round(h.y, 4)})
    return {'enabled': True, 'title': tour.title, 'hall_name': tour.hall.name if tour.hall_id else '',
            'duration': round(tour.duration_s, 2), 'width': tour.width, 'height': tour.height,
            'video': video, 'stops': stops, 'hotspots': hotspots}


def guest_payload(shop_id, hall_id=None, request=None):
    if not shop_id:
        return dict(DISABLED)
    if not tour_module_enabled(shop_id, request):
        return dict(DISABLED)
    ttl = _ttl()
    key = f'tours:g:{int(shop_id)}:{int(hall_id or 0)}:{_version(shop_id)}'
    if ttl:
        try:
            cached = cache.get(key)
        except Exception:  # noqa: BLE001
            cached = None
        if cached is not None:
            return cached
    payload = _build(shop_id, hall_id)
    if ttl:
        try:
            cache.set(key, payload, ttl)
        except Exception:  # noqa: BLE001
            pass
    return payload
