from django.db import models
from backend.softdelete import SoftDeleteModel
from django.utils import timezone


class NotificationLog(models.Model):
    TYPE_CHOICES = [
        ('telegram', 'Telegram'),
        ('push', 'Push'),
        ('sms', 'SMS'),
    ]

    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notifications'
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    recipient = models.CharField(max_length=200)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'notification_logs'
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.type} → {self.recipient}'


class Banner(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='banners/')
    link = models.CharField(max_length=500, blank=True)
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='banners'
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'banners'
        ordering = ['sort_order']

    def __str__(self):
        return self.title


class Promotion(models.Model):
    TYPE_CHOICES = [
        ('percent', 'Foiz'),
        ('fixed', 'Sovliq'),
        ('free_delivery', 'Bepul yetkazish'),
    ]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=0)
    min_order = models.DecimalField(
        max_digits=12, decimal_places=0, default=0
    )
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='promotions'
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='promotions'
    )
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    max_uses = models.IntegerField(null=True, blank=True)
    current_uses = models.IntegerField(default=0)

    class Meta:
        db_table = 'promotions'
        verbose_name = 'Chegirma'
        verbose_name_plural = 'Chegirmalar'

    def __str__(self):
        return self.name

    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.start_date or now > self.end_date:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True


class Review(SoftDeleteModel):
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE, related_name='reviews'
    )
    customer = models.ForeignKey(
        'accounts.Customer', on_delete=models.CASCADE
    )
    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True
    )
    rating = models.IntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.product.name} — {self.rating}⭐'


class AppSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'app_settings'
        verbose_name = 'Sozlama'
        verbose_name_plural = 'Sozlamalar'

    def __str__(self):
        return f'{self.key} = {self.value}'


class TelegramSubscriber(models.Model):
    chat_id = models.CharField(max_length=50, unique=True)
    username = models.CharField(max_length=100, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telegram_subscribers'
        ordering = ['-created_at']

    def __str__(self):
        return f'@{self.username or self.chat_id}'


class BotMessage(models.Model):
    """Telegram botga kelgan xabarlar (mijozdan → botga)."""
    chat_id = models.CharField(max_length=50)
    username = models.CharField(max_length=100, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    text = models.TextField()
    message_id = models.BigIntegerField(null=True, blank=True)
    is_command = models.BooleanField(default=False)
    command = models.CharField(max_length=50, blank=True)
    response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bot_messages'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.first_name or self.chat_id}: {self.text[:50]}'


import uuid


class OutboxEvent(models.Model):
    """
    Transactional Outbox Pattern — 1,000+ concurrent requests uchun:
    Hodisalar (Telegram xabarlar, Push, KDS yangilanishi, Webhooklar)
    asosiy tranzaksiya ichida tezkor (in-transaction) saqlanadi.
    Celery worker 'SELECT ... FOR UPDATE SKIP LOCKED' orqali asinxron,
    hech qanday qotish va blokirovkasiz qayta ishlaydi.
    """
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('processing', 'Jarayonda'),
        ('completed', 'Bajarildi'),
        ('failed', 'Xato berdi'),
    ]

    event_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    aggregate_type = models.CharField(max_length=50, db_index=True)
    aggregate_id = models.CharField(max_length=100, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=5)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    # Qayta urinish jadvali: xato bo'lsa keyingi urinish shu vaqtdan oldin bo'lmaydi (backoff)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    # 'processing' ga olingan vaqt: ishchi yiqilib qolsa, shu bo'yicha hodisa qayta navbatga qaytariladi
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'outbox_events'
        verbose_name = 'Outbox Hodisasi'
        verbose_name_plural = 'Outbox Hodisalari'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['status', 'created_at'], name='outbox_status_created_idx'),
            models.Index(fields=['aggregate_type', 'aggregate_id'], name='outbox_agg_idx'),
        ]

    def __str__(self):
        return f"[{self.status.upper()}] {self.event_type} ({self.aggregate_type}:{self.aggregate_id})"
