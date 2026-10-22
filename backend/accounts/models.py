from django.contrib.auth.models import AbstractUser
from django.db import models


class AdminUser(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super admin'),
        ('shop_owner', "Do'kon egasi"),
        ('shop_manager', "Do'kon menejeri"),
        ('courier_manager', 'Kuryer menejeri'),
        ('support', 'Qo\'llab-quvvatlash'),
        ('waiter', 'Ofitsiant'),
        ('kitchen', 'Oshpaz (KDS)'),
        ('hostess', 'Hostess (kutib olish, bron)'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='shop_owner')
    phone = models.CharField(max_length=20, blank=True)
    telegram_username = models.CharField(max_length=100, blank=True)
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.SET_NULL, null=True, blank=True
    )
    is_approved = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Admin'
        verbose_name_plural = 'Adminlar'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    @property
    def is_super_admin(self):
        return self.role == 'super_admin'

    @property
    def is_shop_owner(self):
        return self.role == 'shop_owner'

    @property
    def is_shop_manager(self):
        return self.role == 'shop_manager'

    @property
    def is_courier_manager(self):
        return self.role == 'courier_manager'

    @property
    def is_support(self):
        return self.role == 'support'


class Customer(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    telegram_chat_id = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    last_order_at = models.DateTimeField(null=True, blank=True)
    total_orders = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    bonus = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='Bonus')
    password = models.CharField(max_length=128, blank=True, default='')
    is_active = models.BooleanField(default=True)
    loyalty_points = models.IntegerField(default=0, verbose_name='Bonus ballar')

    class Meta:
        db_table = 'customers'
        verbose_name = 'Mijoz'
        verbose_name_plural = 'Mijozlar'

    def __str__(self):
        return f'{self.name} ({self.phone})'

    # DRF request.user sifatida ishlatishi uchun (maydon emas — migratsiya talab qilmaydi)
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

    @classmethod
    def create_user(cls, phone, name='', address='', password=None):
        customer = cls(phone=phone, name=name, address=address)
        if password:
            customer.set_password(password)
        customer.save()
        return customer
