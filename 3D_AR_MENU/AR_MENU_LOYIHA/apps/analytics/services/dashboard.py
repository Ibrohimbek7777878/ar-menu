from datetime import timedelta
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.core.cache import cache


PAID = ('paid', 'served')


def _range_today(tz_now):
    start = tz_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, tz_now


def dashboard_kpis(restaurant_id: int) -> dict:
    """
    A-01 uchun 5 ta karta: savdo, buyurtma, o'rtacha chek, band stollar, AR.
    Har biri kechagi shu vaqtgacha bo'lgan ko'rsatkich bilan solishtiriladi.
    """
    key = f'dash:kpi:{restaurant_id}'
    cached = cache.get(key)
    if cached:
        return cached

    from apps.orders.models import Order
    from apps.tables.models import Table
    try:
        from apps.ar3d.models import ARView
        has_ar = True
    except ImportError:
        has_ar = False

    now = timezone.localtime()
    t_start, t_end = _range_today(now)
    y_start = t_start - timedelta(days=1)
    y_end = t_end - timedelta(days=1)

    def agg(a, b):
        res = Order.objects.filter(
            restaurant_id=restaurant_id, status__in=PAID,
            created_at__gte=a, created_at__lt=b
        ).aggregate(total_sum=Sum('total'), cnt=Count('id'), avg_val=Avg('total'))
        return {'total': res['total_sum'], 'cnt': res['cnt'], 'avg': res['avg_val']}

    cur, prev = agg(t_start, t_end), agg(y_start, y_end)

    tables_total = Table.objects.filter(
        restaurant_id=restaurant_id, is_active=True).count()
    tables_busy = Order.objects.filter(
        restaurant_id=restaurant_id,
        status__in=('new', 'accepted', 'cooking', 'ready')
    ).values('table_id').distinct().count()

    ar_cur = ARView.objects.filter(
        restaurant_id=restaurant_id, created_at__gte=t_start, created_at__lt=t_end).count() if has_ar else 0
    ar_prev = ARView.objects.filter(
        restaurant_id=restaurant_id, created_at__gte=y_start, created_at__lt=y_end).count() if has_ar else 0

    def delta(a, b):
        a, b = float(a or 0), float(b or 0)
        if b == 0:
            return None
        return round((a - b) / b * 100, 1)

    data = {
        'revenue': {'value': int(cur['total'] or 0), 'delta': delta(cur['total'], prev['total'])},
        'orders': {'value': cur['cnt'] or 0, 'delta': delta(cur['cnt'], prev['cnt'])},
        'avg_check': {'value': int(cur['avg'] or 0), 'delta': delta(cur['avg'], prev['avg'])},
        'tables': {'value': tables_busy, 'total': tables_total,
                   'pct': round(tables_busy / tables_total * 100) if tables_total else 0},
        'ar_views': {'value': ar_cur, 'delta': delta(ar_cur, ar_prev)},
        'ts': now.isoformat(),
    }
    cache.set(key, data, 30)
    return data


def hourly_sales(restaurant_id: int, day=None) -> dict:
    """Soatlik savdo — Chart.js uchun {labels, revenue, orders}."""
    from apps.orders.models import Order
    from django.db.models.functions import TruncHour

    now = timezone.localtime()
    day = day or now.date()
    start = timezone.make_aware(timezone.datetime.combine(
        day, timezone.datetime.min.time()))
    end = start + timedelta(days=1)

    rows = (Order.objects
            .filter(restaurant_id=restaurant_id, status__in=PAID,
                    created_at__gte=start, created_at__lt=end)
            .annotate(h=TruncHour('created_at'))
            .values('h').annotate(total=Sum('total'), cnt=Count('id')))
    by_hour = {timezone.localtime(r['h']).hour: r for r in rows}

    labels, revenue, orders = [], [], []
    for h in range(8, 24):
        labels.append(f'{h:02d}:00')
        r = by_hour.get(h)
        revenue.append(int(r['total']) if r else 0)
        orders.append(r['cnt'] if r else 0)
    return {'labels': labels, 'revenue': revenue, 'orders': orders}


def top_dishes(restaurant_id: int, limit=5, days=1) -> list:
    from apps.orders.models import OrderItem
    since = timezone.localtime() - timedelta(days=days)
    rows = (OrderItem.objects
            .filter(order__restaurant_id=restaurant_id,
                    order__status__in=PAID, order__created_at__gte=since)
            .values('dish_id', 'dish__name_uz', 'dish__name_ru', 'dish__name_en')
            .annotate(qty=Sum('qty'), total=Sum('line_total'))
            .order_by('-qty')[:limit])
    return [{'dish_id': r['dish_id'],
             'name_uz': r['dish__name_uz'], 'name_ru': r['dish__name_ru'],
             'name_en': r['dish__name_en'],
             'qty': r['qty'], 'total': int(r['total'] or 0)} for r in rows]


def attention_items(restaurant_id: int) -> list:
    """⚠️ DIQQAT bloki — stop-list, javobsiz chaqiruv, uzun smena."""
    from apps.menu.models import Dish
    out = []
    for d in Dish.objects.filter(restaurant_id=restaurant_id, is_available=False)[:5]:
        out.append({'level': 'warning', 'kind': 'sold_out',
                    'text_key': 'dash.sold_out', 'params': {'dish': d.name_uz}})
    try:
        from apps.calls.models import Call
        late = Call.objects.filter(
            restaurant_id=restaurant_id, status='pending',
            created_at__lt=timezone.localtime() - timedelta(minutes=5)).select_related('table')
        for c in late:
            mins = int((timezone.localtime() - c.created_at).total_seconds() // 60)
            out.append({'level': 'danger', 'kind': 'call_late',
                        'text_key': 'dash.call_late',
                        'params': {'table': c.table.number if c.table else '-', 'min': mins}})
    except ImportError:
        pass
    return out[:8]
