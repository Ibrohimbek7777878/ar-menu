"""
Rating Scoring — reyting hisoblash tizimi.
"""
from decimal import Decimal
from django.db import models
from django.db.models import Q, F, Avg, Count


def calculate_product_score(product):
    """
    Mahsulot reytingini hisoblash.
    Formula: (rating * 0.4) + (reviews * 0.2) + (availability * 0.15) + (recency * 0.15) + (sales * 0.1)
    """
    from orders.models import OrderItem
    from django.utils import timezone
    from datetime import timedelta

    # Rating score (0-5 → 0-1)
    rating_score = (product.rating / 5.0) * 0.4 if product.rating else 0

    # Reviews score (log scale)
    import math
    reviews_score = min(1.0, math.log1p(product.reviews_count) / math.log1p(100)) * 0.2

    # Availability score
    availability_score = (1.0 if product.is_available and product.stock > 0 else 0.3) * 0.15

    # Recency score (last 30 days activity)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_sales = OrderItem.objects.filter(
        product=product,
        order__created_at__gte=thirty_days_ago,
        order__status='delivered',
    ).aggregate(total=Count('id'))['total'] or 0
    recency_score = min(1.0, recent_sales / 20.0) * 0.15

    # Sales score (all time)
    total_sales = OrderItem.objects.filter(
        product=product,
        order__status='delivered',
    ).aggregate(total=Count('id'))['total'] or 0
    sales_score = min(1.0, math.log1p(total_sales) / math.log1p(500)) * 0.1

    total = rating_score + reviews_score + availability_score + recency_score + sales_score
    return round(total, 4)


def calculate_shop_score(shop):
    """
    Do'kon reytingini hisoblash.
    """
    from orders.models import Order
    from django.utils import timezone
    from datetime import timedelta
    import math

    # Rating score
    rating_score = (shop.rating / 5.0) * 0.35 if shop.rating else 0

    # Reviews score
    reviews_score = min(1.0, math.log1p(shop.reviews_count) / math.log1p(200)) * 0.15

    # Order completion rate
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_orders = Order.objects.filter(
        shop=shop,
        created_at__gte=thirty_days_ago,
    )
    total = recent_orders.count()
    completed = recent_orders.filter(status='delivered').count()
    completion_rate = (completed / total * 100) if total > 0 else 0
    completion_score = (completion_rate / 100.0) * 0.25

    # Average delivery time
    delivered_orders = Order.objects.filter(
        shop=shop,
        status='delivered',
        delivered_at__isnull=False,
    ).exclude(delivered_at=None)[:50]

    if delivered_orders.exists():
        from django.db.models import ExpressionWrapper, DurationField
        avg_delivery = delivered_orders.annotate(
            delivery_duration=ExpressionWrapper(
                F('delivered_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('delivery_duration'))['avg']

        if avg_delivery:
            avg_minutes = avg_delivery.total_seconds() / 60
            # 30 minutes = 1.0, 120 minutes = 0.3
            delivery_score = max(0.3, min(1.0, 1.0 - (avg_minutes - 30) / 90 * 0.7)) * 0.15
        else:
            delivery_score = 0.5 * 0.15
    else:
        delivery_score = 0.5 * 0.15

    # Verification bonus
    verification_score = (0.1 if shop.is_verified else 0)

    total = rating_score + reviews_score + completion_score + delivery_score + verification_score
    return round(total, 4)


def rank_products_in_category(category, limit=50):
    """
    Kategoriya ichidagi mahsulotlarni reyting bo'yicha saralash.
    """
    from products.models import Product

    products = Product.objects.filter(
        category=category,
        is_available=True,
    )

    scored_products = []
    for product in products:
        score = calculate_product_score(product)
        scored_products.append((product, score))

    scored_products.sort(key=lambda x: x[1], reverse=True)
    return scored_products[:limit]


def rank_shops(limit=50):
    """
    Do'konlarni reyting bo'yicha saralash.
    """
    from shops.models import Shop

    shops = Shop.objects.filter(is_open=True)

    scored_shops = []
    for shop in shops:
        score = calculate_shop_score(shop)
        scored_shops.append((shop, score))

    scored_shops.sort(key=lambda x: x[1], reverse=True)
    return scored_shops[:limit]
