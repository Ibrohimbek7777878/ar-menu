"""Sayr JSON ko'rinishlari. Admin shakli - shartnomadagi AYNAN shu kalitlar (VT2 shunga yozilgan)."""
from django.db.models import Prefetch

from tours import storage
from tours.models import Tour, TourHotspot


def with_children(queryset):
    """Ro'yxat/tafsilot uchun N+1 siz yuklash: tur + nuqtalar + belgilar (stol bilan) = 3 ta SQL."""
    return queryset.prefetch_related('stops', Prefetch('hotspots', queryset=TourHotspot.objects.select_related('table')))


def _num(value, places):
    return round(float(value), places)


def stop_json(stop):
    return {'id': stop.id, 'order': stop.order, 'title': stop.title, 't': _num(stop.t, 3)}


def hotspot_json(hotspot):
    table = hotspot.table
    return {'id': hotspot.id, 'table_id': hotspot.table_id, 'table_number': table.number if table is not None else '',
            'label': hotspot.label, 't_start': _num(hotspot.t_start, 3), 't_end': _num(hotspot.t_end, 3),
            'x': _num(hotspot.x, 4), 'y': _num(hotspot.y, 4)}


def tour_json(tour):
    """Admin ko'rinishi. `stops`/`hotspots` prefetch qilingan bo'lishi kerak (aks holda 2 ta qo'shimcha SQL)."""
    data = {
        'id': tour.id,
        'title': tour.title,
        'hall_id': tour.hall_id,
        'status': tour.status,
        'status_label': tour.status_label,
        'duration_s': _num(tour.duration_s or 0, 2),
        'width': int(tour.width or 0),
        'height': int(tour.height or 0),
        'variants': storage.variant_urls(tour.variants),
        'error': tour.error or '',
        'stops': [stop_json(s) for s in tour.stops.all()],
        'hotspots': [hotspot_json(h) for h in tour.hotspots.all()],
        'ai_status': tour.ai_status,
        'ai_suggestions': tour.ai_suggestions if isinstance(tour.ai_suggestions, dict) else None,
        'published': tour.status == Tour.PUBLISHED,
        'created_at': tour.created_at.isoformat(),
        'updated_at': tour.updated_at.isoformat(),
    }
    if tour.is_archived:
        data['archived'] = True            # faqat arxivlanganlarda (ro'yxatda ko'rinmaydi; `?include_archived=1` yoki DELETE javobi)
    return data
