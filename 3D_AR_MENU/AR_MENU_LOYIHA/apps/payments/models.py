from django.db import models
from core.models import TimestampedModel


class Payment(TimestampedModel):
    """To'lov yozuvi — har bir webhook PaymentLog jurnalga yoziladi."""
    PROVIDER = [
        ('payme', 'Payme'),
        ('click', 'Click'),
        ('uzum', 'Uzum'),
        ('cash', 'Naqd'),
    ]
    STATUS = [
        ('pending', 'Kutilmoqda'),
        ('paid', "To'landi"),
        ('failed', 'Xato'),
        ('cancelled', 'Bekor qilindi'),
        ('refunded', 'Qaytarildi'),
    ]

    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.PROTECT,
                                   db_index=True, related_name='payments')
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT,
                              db_index=True, related_name='payments')

    provider = models.CharField(max_length=20, choices=PROVIDER, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending', db_index=True)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    provider_txn_id = models.CharField(max_length=100, blank=True, db_index=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    fiscal_id = models.CharField(max_length=100, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_payment'
        indexes = [
            models.Index(fields=['order', 'status']),
            models.Index(fields=['provider', 'provider_txn_id']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.provider} {self.amount} ({self.get_status_display()})'


class PaymentLog(TimestampedModel):
    """Har webhook yozuvi — audit uchun."""
    payment = models.ForeignKey(Payment, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='logs')
    provider = models.CharField(max_length=20, db_index=True)
    direction = models.CharField(max_length=10, choices=[('in', 'IN'), ('out', 'OUT')], default='in')
    payload = models.JSONField(default=dict)
    response = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'payments_log'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.provider} {self.direction} {self.created_at:%H:%M:%S}'
