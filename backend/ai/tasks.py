"""
AI reyting algoritmi (Celery).
Do'kon va mahsulotlarni tashrif, sotuv va sharhlar asosida baholaydi.
"""
from celery import shared_task
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from shops.models import Shop
from products.models import Product
from orders.models import OrderItem


def _shop_score(shop):
    week = timezone.now() - timedelta(days=7)
    views = shop.views or 0
    sales = OrderItem.objects.filter(
        order__shop=shop,
        order__created_at__gte=week,
        order__status__in=['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
    ).aggregate(c=Count('id'))['c'] or 0
    rating = shop.rating or 0
    # normalashtirilgan og'irliklar
    return round(
        0.30 * min(views / 200.0, 1)
        + 0.40 * min(sales / 30.0, 1)
        + 0.30 * (rating / 5.0),
        4,
    )


def _product_score(product):
    week = timezone.now() - timedelta(days=7)
    views = product.views or 0
    sales = OrderItem.objects.filter(
        product=product,
        order__created_at__gte=week,
        order__status__in=['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
    ).aggregate(c=Count('id'))['c'] or 0
    rating = product.rating or 0
    return round(
        0.30 * min(views / 100.0, 1)
        + 0.40 * min(sales / 20.0, 1)
        + 0.30 * (rating / 5.0),
        4,
    )


@shared_task
def recompute_ranking():
    """Barcha do'kon va mahsulotlar reytingini qayta hisoblaydi."""
    for shop in Shop.objects.all():
        shop.rank_score = _shop_score(shop)
        shop.save(update_fields=['rank_score'])
    for product in Product.objects.all():
        product.rank_score = _product_score(product)
        product.save(update_fields=['rank_score'])
    return {'shops': Shop.objects.count(), 'products': Product.objects.count()}
