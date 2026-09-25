import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Sum, Q, F, Value, DecimalField
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

log = logging.getLogger('ar3d.analytics')


def ar_impact(restaurant_id: int, days: int = 30) -> dict:
    from apps.orders.models import Order, OrderItem
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    base = Order.objects.filter(restaurant_id=restaurant_id, created_at__gte=since, status__in=['served', 'paid'])
    with_ar = base.filter(items__ar_viewed=True).distinct()
    without_ar = base.exclude(items__ar_viewed=True).distinct()
    a = with_ar.aggregate(cnt=Count('id', distinct=True), avg=Coalesce(Avg('total'), Value(Decimal('0'), output_field=DecimalField())), total=Coalesce(Sum('total'), Value(Decimal('0'), output_field=DecimalField())))
    b = without_ar.aggregate(cnt=Count('id', distinct=True), avg=Coalesce(Avg('total'), Value(Decimal('0'), output_field=DecimalField())), total=Coalesce(Sum('total'), Value(Decimal('0'), output_field=DecimalField())))
    avg_ar = float(a['avg'] or 0)
    avg_no = float(b['avg'] or 0)
    uplift = round(100 * (avg_ar - avg_no) / avg_no, 1) if avg_no else 0.0
    views = ARView.objects.filter(restaurant_id=restaurant_id, created_at__gte=since)
    v = views.aggregate(total=Count('id'), conv=Count('id', filter=Q(converted=True)), avg_dur=Coalesce(Avg('duration_sec'), 0.0))
    total_views = v['total'] or 0
    return {
        'period_days': days,
        'avg_check_with_ar': round(avg_ar),
        'avg_check_without_ar': round(avg_no),
        'uplift_pct': uplift,
        'uplift_label': f'{"+" if uplift >= 0 else ""}{uplift}%',
        'orders_with_ar': a['cnt'] or 0,
        'orders_without_ar': b['cnt'] or 0,
        'ar_views': total_views,
        'ar_conversions': v['conv'] or 0,
        'ar_conversion_rate': round(100 * (v['conv'] or 0) / total_views, 1) if total_views else 0.0,
        'avg_view_sec': round(float(v['avg_dur'] or 0), 1),
        'revenue_with_ar': float(a['total'] or 0),
        'revenue_without_ar': float(b['total'] or 0),
        'estimated_ar_gain': round((avg_ar - avg_no) * (a['cnt'] or 0)) if avg_no else 0,
    }


def top_ar_dishes(restaurant_id: int, days: int = 30, limit: int = 10) -> list:
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects.filter(restaurant_id=restaurant_id, created_at__gte=since).values('dish_id', 'dish__name_uz').annotate(views=Count('id'), convs=Count('id', filter=Q(converted=True)), avg_dur=Avg('duration_sec')).order_by('-views')[:limit])
    return [{'dish_id': r['dish_id'], 'name': r['dish__name_uz'], 'views': r['views'], 'conversions': r['convs'], 'conversion_rate': round(100 * r['convs'] / r['views'], 1) if r['views'] else 0, 'avg_duration_sec': round(float(r['avg_dur'] or 0), 1)} for r in rows]


def ar_mode_breakdown(restaurant_id: int, days: int = 30) -> list:
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects.filter(restaurant_id=restaurant_id, created_at__gte=since).values('mode', 'device').annotate(n=Count('id'), conv=Count('id', filter=Q(converted=True))).order_by('-n'))
    total = sum(r['n'] for r in rows) or 1
    return [{'mode': r['mode'], 'device': r['device'], 'count': r['n'], 'pct': round(100 * r['n'] / total, 1), 'conversion_rate': round(100 * r['conv'] / r['n'], 1) if r['n'] else 0} for r in rows]


def ar_daily_trend(restaurant_id: int, days: int = 30) -> list:
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects.filter(restaurant_id=restaurant_id, created_at__gte=since).annotate(d=TruncDate('created_at')).values('d').annotate(views=Count('id'), convs=Count('id', filter=Q(converted=True))).order_by('d'))
    return [{'date': r['d'].isoformat() if r['d'] else '', 'views': r['views'], 'conversions': r['convs']} for r in rows]


def full_report(restaurant_id: int, days: int = 30) -> dict:
    return {
        'impact': ar_impact(restaurant_id, days),
        'top_dishes': top_ar_dishes(restaurant_id, days),
        'modes': ar_mode_breakdown(restaurant_id, days),
        'trend': ar_daily_trend(restaurant_id, days),
        'generated_at': timezone.now().isoformat(),
    }
