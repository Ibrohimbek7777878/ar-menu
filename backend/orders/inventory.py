"""
Inventory Reservation — ombor zaxiralash tizimi.
Checkout paytida mahsulotlarni zaxiralash.
"""
from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta


class StockReservation(models.Model):
    """Ombor zaxirasi."""
    STATUS_CHOICES = [
        ('active', 'Faol'),
        ('expired', 'Muddati tugagan'),
        ('converted', "Buyurtmaga aylantirilgan"),
        ('released', 'Bo\'shatilgan'),
    ]

    order = models.ForeignKey(
        'orders.Order', on_delete=models.CASCADE,
        related_name='stock_reservations', null=True, blank=True
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE,
        related_name='stock_reservations'
    )
    quantity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_reservations'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.product.name} x{self.quantity} — {self.status}'

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


def reserve_stock(order, timeout_minutes=10):
    """
    Buyurtma uchun omborni zaxiralash.
    Returns: (success: bool, message: str)
    """
    from products.models import Product

    expires_at = timezone.now() + timedelta(minutes=timeout_minutes)

    with transaction.atomic():
        for item in order.items.all():
            try:
                product = Product.objects.select_for_update().get(id=item.product_id)
            except Product.DoesNotExist:
                continue

            # Faol zaxiralarni hisoblash
            active_reservations = StockReservation.objects.filter(
                product=product,
                status='active',
                expires_at__gt=timezone.now(),
            ).exclude(order=order).aggregate(
                total=models.Sum('quantity')
            )['total'] or 0

            available = product.stock - active_reservations

            if available < item.quantity:
                return False, f"{product.name} uchun yetarli ombor yo'q (mavjud: {available})"

            StockReservation.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                expires_at=expires_at,
            )

    return True, "Ombor zaxiralandi"


def release_reservations(order):
    """Buyurtma uchun zaxiralarni bo'shatish."""
    StockReservation.objects.filter(
        order=order,
        status='active',
    ).update(status='released')


def convert_reservations(order):
    """Zaxiralarni buyurtmaga aylantirish."""
    StockReservation.objects.filter(
        order=order,
        status='active',
    ).update(status='converted')


def cleanup_expired_reservations():
    """Muddati tugagan zaxiralarni tozalash."""
    expired = StockReservation.objects.filter(
        status='active',
        expires_at__lt=timezone.now(),
    )
    count = expired.update(status='expired')
    return count


def get_available_stock(product):
    """Mahsulotning mavjud omborini hisoblash."""
    active_reservations = StockReservation.objects.filter(
        product=product,
        status='active',
        expires_at__gt=timezone.now(),
    ).aggregate(total=models.Sum('quantity'))['total'] or 0

    return max(0, product.stock - active_reservations)
