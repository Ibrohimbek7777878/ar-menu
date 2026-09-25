from django.db import models


class Payment(models.Model):
    METHOD_CHOICES = [
        ('click', 'Click'),
        ('payme', 'Payme'),
        ('uzcard', 'UzCard'),
        ('cash', 'Naqd pul'),
        ('mock', 'Mock (test)'),
    ]
    STATUS_CHOICES = [
        ('created', 'Yaratildi'),
        ('pending', 'Kutilmoqda'),
        ('processing', 'Qayta ishlanmoqda'),
        ('paid', "To'langan"),
        ('failed', 'Xatolik'),
        ('cancelled', 'Bekor qilindi'),
        ('refunded', 'Qaytarilgan'),
        ('partially_refunded', 'Qisman qaytarilgan'),
    ]

    order = models.ForeignKey(
        'orders.Order', on_delete=models.PROTECT, related_name='payments'
    )
    provider = models.CharField(max_length=30, choices=METHOD_CHOICES, default='cash')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='created')
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='UZS')

    # Transaction IDs
    merchant_transaction_id = models.CharField(max_length=100, unique=True, default='')
    provider_transaction_id = models.CharField(max_length=100, blank=True, default='')

    # URLs
    payment_url = models.URLField(blank=True, default='')

    # Raw data
    raw_request = models.JSONField(default=dict, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)

    # Timestamps
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Error
    error_message = models.TextField(blank=True, default='')

    # Card info (for display, not storage)
    card_number = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        verbose_name = "To'lov"
        verbose_name_plural = "To'lovlar"

    def __str__(self):
        return f'{self.merchant_transaction_id} — {self.provider} — {self.amount} {self.currency}'
