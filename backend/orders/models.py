from django.db import models

# Import from separate modules
from orders.inventory import StockReservation
from orders.delivery import DeliveryZone, DeliveryQuote
from orders.analytics import AnalyticsEvent
from orders.audit import AuditLog
from orders.coupons import Coupon


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('confirmed', 'Tasdiqlangan'),
        ('preparing', 'Tayyorlanmoqda'),
        ('ready', 'Tayyor — olib ketish'),
        ('out_for_delivery', "Yo'lda"),
        ('delivered', 'Yetkazildi'),
        ('cancelled', 'Bekor qilindi'),
    ]

    order_number = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(
        'accounts.Customer', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='orders'
    )
    customer_name = models.CharField(max_length=200)
    customer_phone_1 = models.CharField(max_length=20)
    customer_phone_2 = models.CharField(max_length=20, blank=True)
    customer_phone_3 = models.CharField(max_length=20, blank=True)
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.PROTECT, related_name='orders'
    )
    delivery_address = models.TextField(blank=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    delivery_accuracy = models.FloatField(null=True, blank=True,
        help_text='GPS aniqligi (metrda) — kuryer uchun')
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0)
    delivery_fee = models.DecimalField(
        max_digits=12, decimal_places=0, default=6000
    )
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=0, default=0
    )
    coupon_code = models.CharField(max_length=50, blank=True, default='')
    final_amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'To\'lanmagan'),
        ('pending', 'Kutilmoqda'),
        ('paid', "To'langan"),
        ('refunded', 'Qaytarilgan'),
    ]
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid'
    )
    is_pickup = models.BooleanField(default=False)
    # V14: QR stol orqali buyurtma (restoran/choyxona)
    table = models.ForeignKey('tables_restaurant.Table', null=True, blank=True,
                              on_delete=models.SET_NULL, related_name='orders')
    courier = models.ForeignKey(
        'couriers.Courier', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='orders'
    )
    confirmed_by_phone = models.BooleanField(default=False)
    bonus_used = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='Bonus ishlatildi')
    bonus_earned = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='Bonus berildi')
    cancel_reason = models.TextField(blank=True)
    cancel_reason_code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    out_for_delivery_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'orders'
        verbose_name = 'Buyurtma'
        verbose_name_plural = 'Buyurtmalar'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} — {self.customer_name}'

    @property
    def address(self):
        return self.delivery_address

    @property
    def customer_phone(self):
        return self.customer_phone_1

    @property
    def customer_phone2(self):
        return self.customer_phone_2

    @property
    def subtotal(self):
        from django.db.models import Sum
        return self.items.aggregate(s=Sum('total'))['s'] or 0

    @property
    def items_count(self):
        return self.items.count()


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.SET_NULL, null=True, blank=True
    )
    product_name = models.CharField(max_length=200)
    product_image = models.CharField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.IntegerField(default=1)
    unit = models.CharField(max_length=20)
    total = models.DecimalField(max_digits=12, decimal_places=0)
    # Restoran / Oshxona (KDS) xususiyatlari:
    COURSE_CHOICES = [
        ('1-taom', '1-taom (Sho\'rva)'),
        ('2-taom', '2-taom (Asosiy taom)'),
        ('salat', 'Salat & Gazak'),
        ('ichimlik', 'Ichimlik'),
        ('shirinlik', 'Shirinlik'),
    ]
    course = models.CharField(max_length=20, choices=COURSE_CHOICES, default='2-taom', blank=True)
    is_done = models.BooleanField(default=False, verbose_name="Oshpaz tayyorladi")
    notes = models.CharField(max_length=255, blank=True, verbose_name="Taomga maxsus istak")

    class Meta:
        db_table = 'order_items'
        verbose_name = 'Buyurtma mahsuloti'
        verbose_name_plural = 'Buyurtma mahsulotlari'

    @property
    def unit_price(self):
        return self.price

    def __str__(self):
        return f'{self.product_name} x{self.quantity}'


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='history'
    )
    status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        'accounts.AdminUser', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order.order_number} → {self.status}'
