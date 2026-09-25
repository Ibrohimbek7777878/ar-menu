from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Promokod")
    discount_percent = models.PositiveIntegerField(
        default=0,
        help_text="Chegirma foizi (0-100), masalan 10 bo'lsa 10% chegirma"
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Aniq summa chegirmasi (masalan 15000 so'm)"
    )
    min_order_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Kupon ishlashi uchun minimal buyurtma summasi"
    )
    usage_limit = models.PositiveIntegerField(
        default=0,
        help_text="Maksimal ishlatish soni (0 = cheksiz)"
    )
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupons'
        verbose_name = 'Kupon'
        verbose_name_plural = 'Kuponlar'
        ordering = ['-created_at']

    def __str__(self):
        if self.discount_percent > 0:
            return f"{self.code} ({self.discount_percent}%)"
        return f"{self.code} ({self.discount_amount:,.0f} so'm)"

    def is_valid(self, order_amount=0):
        from decimal import Decimal
        amt = Decimal(str(order_amount))
        if not self.is_active:
            return False, "Kupon faol emas"
        if self.expires_at and self.expires_at < timezone.now():
            return False, "Kupon muddati tugagan"
        if self.usage_limit > 0 and self.times_used >= self.usage_limit:
            return False, "Kupondan foydalanish limiti tugagan"
        if self.min_order_amount > 0 and amt < Decimal(str(self.min_order_amount)):
            return False, f"Minimal buyurtma summasi {int(self.min_order_amount):,} so'm bo'lishi kerak"
        return True, "Kupon amal qiladi"

    def calculate_discount(self, order_amount):
        from decimal import Decimal
        amt = Decimal(str(order_amount))
        valid, msg = self.is_valid(amt)
        if not valid:
            return 0
        discount = Decimal('0')
        if self.discount_percent > 0:
            discount = amt * Decimal(str(self.discount_percent)) / Decimal('100')
        elif self.discount_amount > 0:
            discount = min(Decimal(str(self.discount_amount)), amt)
        return int(discount)
