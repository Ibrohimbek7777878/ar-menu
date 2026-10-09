"""Menyu-injiring — 4 kvadrant: Yulduz/Ot/Jumboq/It"""
from django.db.models import Sum, Count, F, Avg
from django.utils import timezone
from datetime import timedelta


def menu_engineering(restaurant_id: int, days: int = 30) -> dict:
    """
    Mashhurlik (qty ulushi) × Foydalilik (margin ulushi) matritsasi.
    - Yulduz (Star): yuqori mashhurlik + yuqori margin
    - Ot (Horse): yuqori mashhurlik + past margin
    - Jumboq (Puzzle): past mashhurlik + yuqori margin
    - It (Dog): past mashhurlik + past margin
    """
    from apps.orders.models import OrderItem
    from apps.menu.models import Dish

    cutoff = timezone.now() - timedelta(days=days)

    # Taomlar bo'yicha sotish
    dish_stats = (
        OrderItem.objects.filter(
            order__restaurant_id=restaurant_id,
            order__status__in=('paid', 'served'),
            order__created_at__gte=cutoff,
        )
        .values('dish_id', 'dish_name')
        .annotate(
            total_qty=Count('id'),
            total_revenue=Sum('line_total'),
            avg_price=Avg('price'),
        )
    )

    items = list(dish_stats)
    if not items:
        return {'stars': [], 'horses': [], 'puzzles': [], 'dogs': []}

    total_qty = sum(i['total_qty'] for i in items)
    total_revenue = sum(float(i['total_revenue'] or 0) for i in items)

    # O'rtacha ko'rsatkichlar
    avg_qty = total_qty / len(items) if items else 0
    avg_revenue = total_revenue / len(items) if items else 0

    dish_ids = [i['dish_id'] for i in items if i['dish_id']]
    dishes = {d.id: d for d in Dish.objects.filter(id__in=dish_ids)}

    # Kasavana & Smith (Menu Engineering) matritsasi:
    # 1. Birlik marjasi (Unit Contribution Margin): unit_cm = price - cost
    # 2. O'rtacha marja (Average CM): total_margin / total_qty
    # 3. Mashhurlik chegarasi (70% hurdle rate): (total_qty / len(items)) * 0.7
    calculated = []
    total_menu_margin = 0.0

    for item in items:
        qty = item['total_qty']
        revenue = float(item['total_revenue'] or 0)
        avg_price = float(item['avg_price'] or (revenue / qty if qty else 0))
        d = dishes.get(item['dish_id'])

        unit_cost = float(getattr(d, 'cost_price', 0) or 0)
        if unit_cost <= 0:
            # Standart oziq-ovqat tannarxi (food cost) ~38%
            unit_cost = round(avg_price * 0.38, 2)

        unit_margin = max(0.0, avg_price - unit_cost)
        dish_total_margin = unit_margin * qty
        total_menu_margin += dish_total_margin

        calculated.append({
            'dish_id': item['dish_id'],
            'dish_name': item['dish_name'],
            'qty': qty,
            'revenue': revenue,
            'unit_margin': unit_margin,
            'margin': round(dish_total_margin, 0),
        })

    avg_cm = (total_menu_margin / total_qty) if total_qty else 0
    pop_threshold = (total_qty / len(items)) * 0.7 if items else 0

    result = {'stars': [], 'horses': [], 'puzzles': [], 'dogs': []}

    for entry in calculated:
        popularity = entry['qty'] >= pop_threshold
        profitability = entry['unit_margin'] >= avg_cm

        record = {
            'dish_id': entry['dish_id'],
            'dish_name': entry['dish_name'],
            'qty': entry['qty'],
            'revenue': entry['revenue'],
            'margin': entry['margin'],
        }

        if popularity and profitability:
            result['stars'].append(record)
        elif popularity and not profitability:
            result['horses'].append(record)
        elif not popularity and profitability:
            result['puzzles'].append(record)
        else:
            result['dogs'].append(record)

    return result
