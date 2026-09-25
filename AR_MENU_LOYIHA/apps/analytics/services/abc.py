"""ABC tahlil — dishlar daromad ulushi bo'yicha A (≤80%)/B (≤95%)/C"""
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta


def abc_analysis(restaurant_id: int, days: int = 30) -> list:
    """
    Har bir taomning umumiy daromad ulushini hisoblab, A/B/C guruhlariga ajratadi.
    A — ≤80% (asosiy daromad), B — ≤95%, C — qolgan.
    """
    from apps.orders.models import Order, OrderItem

    cutoff = timezone.now() - timedelta(days=days)

    # Taomlar bo'yicha umumiy savdo
    dish_sales = (
        OrderItem.objects.filter(
            order__restaurant_id=restaurant_id,
            order__status__in=('paid', 'served'),
            order__created_at__gte=cutoff,
        )
        .values('dish_id', 'dish_name')
        .annotate(
            total_revenue=Sum('line_total'),
            total_qty=Count('id'),
        )
        .order_by('-total_revenue')
    )

    total_revenue = sum(d['total_revenue'] or 0 for d in dish_sales)
    if total_revenue == 0:
        return []

    result = []
    cumulative = 0

    for dish in dish_sales:
        revenue = float(dish['total_revenue'] or 0)
        pct = (revenue / total_revenue * 100) if total_revenue else 0
        cumulative += pct

        if cumulative <= 80:
            group = 'A'
        elif cumulative <= 95:
            group = 'B'
        else:
            group = 'C'

        result.append({
            'dish_id': dish['dish_id'],
            'dish_name': dish['dish_name'],
            'revenue': revenue,
            'qty': dish['total_qty'],
            'pct': round(pct, 1),
            'cumulative_pct': round(cumulative, 1),
            'group': group,
        })

    return result
