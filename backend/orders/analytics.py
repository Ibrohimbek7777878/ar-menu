"""
Analytics Event — foydalanuvchi harakatlarini kuzatish.
"""
from django.db import models


class AnalyticsEvent(models.Model):
    """Foydalanuvchi harakatlari."""
    EVENT_TYPES = [
        ('product_view', 'Mahsulot ko\'rish'),
        ('search', 'Qidiruv'),
        ('add_to_cart', 'Savatga qo\'shish'),
        ('remove_from_cart', 'Savatdan o\'chirish'),
        ('checkout_start', 'Checkout boshlash'),
        ('payment_start', 'To\'lov boshlash'),
        ('payment_success', 'To\'lov muvaffaqiyatli'),
        ('payment_failed', 'To\'lov xatolik'),
        ('order_created', 'Buyurtma yaratish'),
        ('order_delivered', 'Buyurtma yetkazish'),
        ('repeat_order', 'Qayta buyurtma'),
        ('review_created', 'Sharh yaratish'),
        ('ar_view', 'AR ko\'rish'),
        ('ar_add_to_cart', 'AR dan savatga'),
        ('campaign_click', 'Kampaniya bosish'),
        ('ad_impression', 'Reklama ko\'rish'),
        ('ad_click', 'Reklama bosish'),
    ]

    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    user_id = models.IntegerField(null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True, default='')
    shop_id = models.IntegerField(null=True, blank=True)
    product_id = models.IntegerField(null=True, blank=True)
    order_id = models.IntegerField(null=True, blank=True)
    search_query = models.CharField(max_length=500, blank=True, default='')
    locale = models.CharField(max_length=5, blank=True, default='uz')
    device = models.CharField(max_length=50, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['user_id', 'event_type']),
            models.Index(fields=['product_id', 'event_type']),
            models.Index(fields=['shop_id', 'event_type']),
        ]

    def __str__(self):
        return f'{self.event_type} — {self.created_at}'


def track_event(event_type, request=None, **kwargs):
    """Analytics event yaratish."""
    data = {
        'event_type': event_type,
        **kwargs,
    }

    if request:
        data['session_id'] = request.session.session_key or ''
        data['device'] = request.META.get('HTTP_USER_AGENT', '')[:50]

    AnalyticsEvent.objects.create(**data)
