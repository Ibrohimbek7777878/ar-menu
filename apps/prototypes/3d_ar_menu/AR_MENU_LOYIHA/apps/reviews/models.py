from django.db import models
from core.models import TenantModel


class Review(TenantModel):
    STATUS = [
        ('new', 'Yangi'),
        ('seen', "Ko'rildi"),
        ('replied', 'Javob berildi'),
        ('resolved', 'Hal qilindi'),
        ('archived', 'Arxiv'),
    ]

    order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews')
    guest = models.ForeignKey('guest.Guest', null=True, blank=True, on_delete=models.SET_NULL)
    table = models.ForeignKey('tables.Table', null=True, blank=True, on_delete=models.SET_NULL)
    waiter = models.ForeignKey('accounts.Staff', null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews')
    rating = models.SmallIntegerField(db_index=True)
    rating_food = models.SmallIntegerField(null=True, blank=True)
    rating_service = models.SmallIntegerField(null=True, blank=True)
    rating_ambience = models.SmallIntegerField(null=True, blank=True)
    text = models.TextField(blank=True)
    is_public = models.BooleanField(default=False, db_index=True)
    redirected_to_google = models.BooleanField(default=False)
    external_target = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=15, choices=STATUS, default='new', db_index=True)
    admin_reply = models.TextField(blank=True)
    replied_by = models.ForeignKey('accounts.Staff', null=True, blank=True, on_delete=models.SET_NULL, related_name='review_replies')
    replied_at = models.DateTimeField(null=True, blank=True)
    lang = models.CharField(max_length=2, default='uz')
    device = models.CharField(max_length=120, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'rating', 'created_at']),
            models.Index(fields=['restaurant', 'status']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(rating__gte=1, rating__lte=5), name='ck_review_rating'),
            models.UniqueConstraint(fields=['order'], name='uq_review_order', condition=models.Q(order__isnull=False)),
        ]

    def __str__(self):
        return f'{self.rating}⭐ #{self.id}'


class ReviewSettings(TenantModel):
    is_active = models.BooleanField(default=True)
    public_threshold = models.SmallIntegerField(default=4)
    google_place_url = models.URLField(max_length=500, blank=True)
    yandex_url = models.URLField(max_length=500, blank=True)
    ask_after_payment = models.BooleanField(default=True)
    negative_alert_chat_id = models.CharField(max_length=40, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant'], name='uq_reviewsettings_rest')]
