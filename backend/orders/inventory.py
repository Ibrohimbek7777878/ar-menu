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


class InsufficientStock(Exception):
    """Omborda yetarli qoldiq yo'q (xabar mijozga ko'rsatiladi)."""


def reserve_stock(order, timeout_minutes=10):
    """
    Buyurtma uchun omborni zaxiralash — hammasi yoki hech narsa (TZ: R10-4).
    Returns: (success: bool, message: str)

    - Qoldig'i yuritilmaydigan mahsulot (stock <= 0) o'tkazib yuboriladi: restoran taomlari odatda shunday
      (nazorat stop-list orqali). Qoldiq yuritiladigan mahsulot uchun `stock > 0`.
    - Mahsulotlar id tartibida qulflanadi (`select_for_update`): ikki buyurtma teskari tartibda qulflab
      o'zaro kutib qolmasligi (deadlock) va oxirgi donani ikki kishi olib ketmasligi uchun.
    - Biror mahsulot yetmasa, shu chaqiruvda yaratilgan zaxiralar ham bekor qilinadi.
    """
    from products.models import Product

    expires_at = timezone.now() + timedelta(minutes=timeout_minutes)
    items = sorted(order.items.all(), key=lambda item: item.product_id or 0)

    with transaction.atomic():
        for item in items:
            product = Product.objects.select_for_update().filter(id=item.product_id).first()
            if product is None or product.stock <= 0:
                continue

            active_reservations = StockReservation.objects.filter(
                product=product,
                status='active',
                expires_at__gt=timezone.now(),
            ).exclude(order=order).aggregate(total=models.Sum('quantity'))['total'] or 0

            available = product.stock - active_reservations
            if available < item.quantity:
                transaction.set_rollback(True)
                return False, f"{product.name} uchun yetarli ombor yo'q (mavjud: {max(0, available)})"

            StockReservation.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                expires_at=expires_at,
            )

    return True, "Ombor zaxiralandi"


def reserve_stock_or_raise(order, timeout_minutes=10):
    """`reserve_stock`, lekin yetmasa `InsufficientStock` ko'taradi — chaqiruvchi o'z tranzaksiyasini qaytarishi uchun."""
    ok, message = reserve_stock(order, timeout_minutes=timeout_minutes)
    if not ok:
        raise InsufficientStock(message)


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
