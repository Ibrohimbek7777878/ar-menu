"""
Delivery Zones va Pricing — yetkazib berish zonalari va narxlari.
"""
from decimal import Decimal
from django.db import models


class DeliveryZone(models.Model):
    """Yetkazib berish zonasi."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')

    # Geografik chegaralar (polygon yoki radius)
    center_lat = models.FloatField(null=True, blank=True)
    center_lng = models.FloatField(null=True, blank=True)
    radius_km = models.FloatField(default=5.0, help_text="Radius kilometrlarda")

    # Narx
    base_fee = models.DecimalField(max_digits=10, decimal_places=0, default=5000)
    per_km_fee = models.DecimalField(max_digits=10, decimal_places=0, default=1000)
    peak_fee = models.DecimalField(max_digits=10, decimal_places=0, default=2000)
    weight_fee_per_kg = models.DecimalField(max_digits=10, decimal_places=0, default=500)

    # Cheklovlar
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=0, default=20000)
    max_distance_km = models.DecimalField(max_digits=6, decimal_places=1, default=10.0)
    free_delivery_threshold = models.DecimalField(
        max_digits=12, decimal_places=0, default=50000,
        help_text="Bu summadan yuqorida bepul yetkazish"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_zones'
        ordering = ['radius_km']

    def __str__(self):
        return f'{self.name} ({self.radius_km} km)'

    def calculate_fee(self, distance_km: Decimal, total_amount: Decimal,
                      weight_kg: Decimal = Decimal('0'), is_peak: bool = False) -> dict:
        """
        Yetkazish narxini hisoblash.
        Returns: {
            'base_fee': Decimal,
            'distance_fee': Decimal,
            'peak_fee': Decimal,
            'weight_fee': Decimal,
            'discount': Decimal,
            'total_fee': Decimal,
            'is_free': bool,
        }
        """
        # Boshlang'ich narx
        base = self.base_fee

        # Masofa narxi
        distance_fee = Decimal(str(distance_km)) * self.per_km_fee

        # Pik vaqt narxi
        peak = self.peak_fee if is_peak else Decimal('0')

        # Og'irlik narxi
        weight_fee = Decimal(str(weight_kg)) * self.weight_fee_per_kg

        # Jami narx
        subtotal = base + distance_fee + peak + weight_fee

        # Bepul yetkazish
        discount = Decimal('0')
        is_free = False
        if self.free_delivery_threshold and total_amount >= self.free_delivery_threshold:
            discount = subtotal
            subtotal = Decimal('0')
            is_free = True

        return {
            'base_fee': base,
            'distance_fee': distance_fee,
            'peak_fee': peak,
            'weight_fee': weight_fee,
            'discount': discount,
            'total_fee': subtotal,
            'is_free': is_free,
        }


class DeliveryQuote(models.Model):
    """Yetkazib berish narxi quote."""
    order = models.ForeignKey(
        'orders.Order', on_delete=models.CASCADE,
        related_name='delivery_quotes'
    )
    zone = models.ForeignKey(
        DeliveryZone, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    base_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    distance_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    peak_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    weight_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    is_free = models.BooleanField(default=False)
    estimated_minutes = models.PositiveIntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_quotes'

    def __str__(self):
        return f'Quote: {self.total_fee} so\'m ({self.distance_km} km)'
