from django.db import models
from django.utils import timezone

from core.models import TimestampedModel


class Order(TimestampedModel):
    STATUS = [
        ('new', 'Yangi'),
        ('accepted', 'Qabul qilindi'),
        ('cooking', 'Tayyorlanmoqda'),
        ('ready', 'Tayyor'),
        ('served', 'Berildi'),
        ('paid', "To'landi"),
        ('cancelled', 'Bekor qilindi'),
    ]
    SOURCE = [
        ('qr', 'QR'), ('waiter', 'Ofitsiant'),
        ('telegram', 'Telegram'), ('delivery', 'Yetkazish'),
    ]

    # ⚡ PROTECT — buyurtma tarixi restoran o'chsa ham yo'qolmaydi
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.PROTECT,
                                   db_index=True, related_name='orders')
    table = models.ForeignKey('tables.Table', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')
    guest = models.ForeignKey('guest.Guest', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')
    session_id = models.CharField(max_length=64, db_index=True, blank=True)
    waiter = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')

    number = models.CharField(max_length=20, db_index=True)      # "#047" — kunlik
    status = models.CharField(max_length=20, choices=STATUS, default='new', db_index=True)
    source = models.CharField(max_length=20, choices=SOURCE, default='qr')

    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    note = models.TextField(blank=True)
    eta_min = models.SmallIntegerField(default=0)

    # ⚡ Dublikat buyurtmaning oldini oladi (POST 2 marta ketsa)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True,
                                       blank=True, db_index=True)

    # Holat vaqtlari — transition() avtomatik to'ldiradi
    accepted_at = models.DateTimeField(null=True, blank=True)
    cooking_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'orders_order'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['restaurant', 'status', '-created_at']),
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['table', 'status']),
            models.Index(fields=['session_id', '-created_at']),
        ]

    def __str__(self):
        return f'{self.number} ({self.get_status_display()})'

    # ---- Yordamchi xossalar (KDS/ofitsiant uchun) ----

    @property
    def is_open(self):
        return self.status not in ('paid', 'cancelled')

    @property
    def age_sec(self) -> int:
        """Yaratilganidan beri necha soniya o'tdi"""
        return int((timezone.now() - self.created_at).total_seconds())

    @property
    def eta_pct(self) -> int:
        """ETA ning necha foizi o'tdi — KDS rangi shundan chiqadi"""
        if not self.eta_min:
            return 0
        return int(100 * self.age_sec / (self.eta_min * 60))


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    dish = models.ForeignKey('menu.Dish', on_delete=models.PROTECT, related_name='+')

    # ⚡ Snapshot — taom nomi/narxi keyin o'zgarsa ham chek o'zgarmaydi
    dish_name = models.CharField(max_length=200)
    qty = models.PositiveSmallIntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)   # 1 dona (modifikator bilan)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    modifiers = models.JSONField(default=list, blank=True)   # [{"id":3,"name":"...","delta":25000}]
    note = models.CharField(max_length=200, blank=True)

    # ⚡ AR analitikasining asosi — bu taomni AR'da ko'rganmi
    ar_viewed = models.BooleanField(default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders_orderitem'
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['dish', 'ar_viewed']),
        ]

    def __str__(self):
        return f'{self.dish_name} × {self.qty}'
