from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from core.models import TenantModel


class UserManager(BaseUserManager):
    """username o'rniga email/telefon bilan ishlaydi"""
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra):
        if not phone:
            raise ValueError('Telefon majburiy')
        user = self.model(phone=phone, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('is_platform_admin', True)
        return self.create_user(phone, password, **extra)


class User(AbstractUser):
    """
    Platforma foydalanuvchisi. Bir User bir nechta restoranda Staff bo'lishi mumkin.
    ⚡ AUTH_USER_MODEL = 'accounts.User'
    """
    username = None
    phone = models.CharField(max_length=20, unique=True, db_index=True)  # 998XXXXXXXXX
    email = models.EmailField(blank=True, db_index=True)
    full_name = models.CharField(max_length=150, blank=True)
    lang = models.CharField(max_length=2, default='uz')

    # ⚡ Super-admin (platforma darajasi) — restoran admini EMAS
    is_platform_admin = models.BooleanField(default=False, db_index=True)
    totp_secret = models.CharField(max_length=64, blank=True)   # 2FA (V-026)
    totp_enabled = models.BooleanField(default=False)

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'auth_user_armenu'

    def __str__(self):
        return self.full_name or self.phone


ROLES = [
    ('waiter', 'Ofitsiant'),
    ('cook', 'Oshpaz'),
    ('cashier', 'Kassir'),
    ('admin', 'Restoran admini'),
    ('manager', 'Menejer'),
]


class Staff(TenantModel):
    """
    ⚡ Restoran xodimi. TenantModel → restaurant FK avtomatik.
    Bir User turli restoranlarda turli Staff bo'lishi mumkin.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             related_name='staff_roles', null=True, blank=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLES, db_index=True)

    # ⚡ PIN — bcrypt hash, ochiq matn HECH QACHON saqlanmaydi
    pin_hash = models.CharField(max_length=128, blank=True)
    pin_set_at = models.DateTimeField(null=True, blank=True)

    # Ofitsiantga biriktirilgan stollar (Table.id ro'yxati)
    tables = models.JSONField(default=list, blank=True)
    tips_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Smena
    shift_started_at = models.DateTimeField(null=True, blank=True)
    is_on_shift = models.BooleanField(default=False, db_index=True)

    # Bloklash (V-023 rate-limit)
    failed_attempts = models.SmallIntegerField(default=0)
    blocked_until = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'staff'
        constraints = [
            models.UniqueConstraint(fields=['restaurant', 'phone'],
                                    condition=models.Q(is_active=True),
                                    name='uniq_active_staff_phone_per_restaurant'),
        ]
        indexes = [
            models.Index(fields=['restaurant', 'role', 'is_active']),
            models.Index(fields=['restaurant', 'is_on_shift']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.get_role_display()})'

    @property
    def is_blocked(self) -> bool:
        from django.utils import timezone
        return bool(self.blocked_until and self.blocked_until > timezone.now())
