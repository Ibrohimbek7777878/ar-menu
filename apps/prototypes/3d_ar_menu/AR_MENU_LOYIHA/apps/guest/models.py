import uuid
from django.db import models
from django.utils import timezone
from core.models import TimestampedModel

SESSION_IDLE_MINUTES = 180      # 3 soatdan keyin sessiya avtomatik yopiladi


class Guest(TimestampedModel):
    """
    Mijoz — ro'yxatdan o'tmaydi. device_token cookie orqali tanib olinadi.
    Telefon/ism faqat to'lov yoki bonus paytida to'ldiriladi.
    """
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, related_name='guests')
    device_token = models.UUIDField(default=uuid.uuid4, db_index=True)

    phone = models.CharField(max_length=15, blank=True, db_index=True)  # 998XXXXXXXXX
    name = models.CharField(max_length=80, blank=True)
    lang = models.CharField(max_length=2, default='uz')
    tg_user_id = models.BigIntegerField(null=True, blank=True, db_index=True)

    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    birthday = models.DateField(null=True, blank=True, db_index=True)
    visits = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('restaurant', 'device_token')]
        indexes = [models.Index(fields=['restaurant', 'phone'])]

    def __str__(self):
        return self.name or self.phone or f'Mehmon #{self.id}'


class GuestSession(TimestampedModel):
    """Bitta tashrif — stolga o'tirgandan hisob to'langunicha."""
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='sessions')
    table = models.ForeignKey(
        'tables.Table', null=True, on_delete=models.SET_NULL, related_name='sessions')

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    lang = models.CharField(max_length=2, default='uz')
    started_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    order_count = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'table', 'ended_at']),
            models.Index(fields=['restaurant', 'started_at']),
        ]

    def __str__(self):
        return f'Sessiya {self.public_id}'

    @property
    def is_open(self) -> bool:
        return self.ended_at is None

    def touch(self):
        self.last_seen_at = timezone.now()
        self.save(update_fields=['last_seen_at'])

    def close(self):
        if self.ended_at is None:
            self.ended_at = timezone.now()
            self.save(update_fields=['ended_at'])


class Call(TimestampedModel):
    """Mijoz ofitsiantni chaqiradi — 60s cooldown (TZ M-09)"""
    COOLDOWN_SEC = 60

    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)
    table = models.ForeignKey(
        'tables.Table', null=True, on_delete=models.SET_NULL, related_name='calls')
    guest = models.ForeignKey(
        Guest, null=True, on_delete=models.SET_NULL, related_name='calls')
    session = models.ForeignKey(
        GuestSession, null=True, on_delete=models.SET_NULL, related_name='calls')

    STATUS = [
        ('new', 'Yangi'),
        ('accepted', 'Qabul qilindi'),
        ('done', 'Bajarildi'),
    ]
    status = models.CharField(max_length=20, choices=STATUS, default='new', db_index=True)

    accepted_by = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='calls_accepted')
    accepted_at = models.DateTimeField(null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'guest_call'
        indexes = [
            models.Index(fields=['restaurant', 'status', '-created_at']),
            models.Index(fields=['table', 'status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'Call #{self.id} ({self.get_status_display()})'

    @property
    def is_active(self):
        return self.status in ('new', 'accepted')
