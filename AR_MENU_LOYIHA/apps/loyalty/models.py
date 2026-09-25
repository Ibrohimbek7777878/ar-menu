from decimal import Decimal
from django.db import models
from django.utils import timezone
from core.models import TenantModel


class LoyaltyProgram(TenantModel):
    is_active = models.BooleanField(default=False)
    cashback_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))
    max_pay_percent = models.SmallIntegerField(default=30)
    bonus_lifetime_days = models.SmallIntegerField(default=180)
    min_order_for_cashback = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    birthday_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('30000'))
    birthday_days_before = models.SmallIntegerField(default=3)
    birthday_valid_days = models.SmallIntegerField(default=7)
    welcome_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant'], name='uq_loyalty_rest')]


class Bonus(TenantModel):
    KIND = [
        ('cashback', 'Keshbek'),
        ('welcome', 'Xush kelibsiz'),
        ('birthday', "Tug'ilgan kun"),
        ('promo', 'Promokod'),
        ('manual', "Qo'lda"),
        ('spend', 'Sarflandi'),
        ('expire', 'Muddati tugadi'),
        ('revert', 'Qaytarildi'),
    ]
    guest = models.ForeignKey('guest.Guest', on_delete=models.CASCADE, related_name='bonuses')
    order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=20, choices=KIND, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_expired = models.BooleanField(default=False, db_index=True)
    comment = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'guest', 'created_at']),
            models.Index(fields=['is_expired', 'expires_at']),
        ]

    def __str__(self):
        return f'{self.kind} {self.amount:+.0f} (guest#{self.guest_id})'


class Promo(TenantModel):
    TYPE = [('percent', 'Foiz'), ('fixed', "Qat'iy summa"), ('bonus', 'Bonus beradi'), ('free_item', 'Bepul taom')]
    code = models.CharField(max_length=32, db_index=True)
    title_uz = models.CharField(max_length=120)
    title_ru = models.CharField(max_length=120, blank=True)
    title_en = models.CharField(max_length=120, blank=True)
    discount_type = models.CharField(max_length=15, choices=TYPE, default='percent')
    value = models.DecimalField(max_digits=12, decimal_places=2)
    max_discount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    min_order = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    free_dish = models.ForeignKey('menu.Dish', null=True, blank=True, on_delete=models.SET_NULL)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    usage_limit = models.IntegerField(null=True, blank=True)
    per_guest_limit = models.SmallIntegerField(default=1)
    used_count = models.IntegerField(default=0)
    first_order_only = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'code'], name='uq_promo_code')]

    def __str__(self):
        return f'{self.code} ({self.get_discount_type_display()})'


class PromoUsage(TenantModel):
    promo = models.ForeignKey(Promo, on_delete=models.CASCADE, related_name='usages')
    guest = models.ForeignKey('guest.Guest', on_delete=models.CASCADE)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['promo', 'order'], name='uq_promo_order')]
        indexes = [models.Index(fields=['promo', 'guest'])]
