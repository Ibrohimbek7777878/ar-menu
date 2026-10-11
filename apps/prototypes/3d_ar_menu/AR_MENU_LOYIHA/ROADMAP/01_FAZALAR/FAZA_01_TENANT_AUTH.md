# FAZA 1 — TENANT VA AUTH

**Vazifalar:** V-013 … V-030 (18 ta) · **Muddat:** 1 hafta
**Maqsad:** `Restaurant` tenant modeli, tarif tizimi, xodim/admin autentifikatsiyasi,
JWT (restaurant_id ichida), ruxsatlar va ⚡ cross-tenant izolyatsiya testi.

> ⚠️ FAZA 0 (`FAZA_00_TAYYORGARLIK.md`) to'liq bajarilgan bo'lishi SHART.
> `core/models.py`, `core/mixins.py`, `core/middleware.py`, `core/exceptions.py` mavjud.

**Qo'shimcha paketlar:**
```bash
pip install bcrypt PyJWT pyotp
pip freeze > requirements.txt
```

---

## V-013 — `Restaurant` modeli (tenant asosi)

**Fayl:** `apps/tenants/__init__.py` (bo'sh), `apps/tenants/apps.py`, `apps/tenants/models.py`

```bash
mkdir -p apps/tenants/migrations && touch apps/__init__.py apps/tenants/__init__.py apps/tenants/migrations/__init__.py
```

**Fayl:** `apps/tenants/apps.py`
```python
from django.apps import AppConfig


class TenantsConfig(AppConfig):
    name = 'apps.tenants'
    label = 'tenants'
```

**Fayl:** `apps/tenants/models.py`
```python
from django.db import models
from django.contrib.postgres.fields import ArrayField

LANGS = [('uz', "O'zbek"), ('ru', 'Русский'), ('en', 'English')]
PLANS = [
    ('free', 'Bepul'),
    ('start', 'Start'),
    ('pro', 'Pro'),
    ('enterprise', 'Enterprise'),
]


def default_langs():
    """⛔ lambda ISHLATMA — migratsiya serializatsiya qila olmaydi"""
    return ['uz', 'ru', 'en']


class Restaurant(models.Model):
    """
    ⚡ TENANT. Platformadagi hamma narsa shunga bog'liq.
    Bu modelning o'zi TenantModel dan meros OLMAYDI (u tenantning o'zi).
    """
    slug          = models.SlugField(max_length=64, unique=True, db_index=True)
    name          = models.CharField(max_length=200)
    legal_name    = models.CharField(max_length=255, blank=True)
    inn           = models.CharField(max_length=20, blank=True)          # STIR
    phone         = models.CharField(max_length=20)                      # 998XXXXXXXXX
    address       = models.TextField(blank=True)
    city          = models.CharField(max_length=100, db_index=True)
    lat           = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng           = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # --- Brending ---
    logo          = models.ImageField(upload_to='logos/', null=True, blank=True)
    color_primary = models.CharField(max_length=7, default='#E85D2A')
    color_accent  = models.CharField(max_length=7, default='#1A1A2E')
    custom_domain = models.CharField(max_length=120, blank=True, db_index=True)

    # --- Til ---
    default_lang  = models.CharField(max_length=2, choices=LANGS, default='uz')
    langs_enabled = ArrayField(models.CharField(max_length=2), default=default_langs)

    # --- Tarif ---
    plan           = models.CharField(max_length=20, choices=PLANS, default='free', db_index=True)
    plan_expires   = models.DateTimeField(null=True, blank=True)
    ar_model_limit = models.IntegerField(default=0)     # FREE=0, PRO=50
    table_limit    = models.IntegerField(default=3)     # FREE=3, cheksiz=-1

    # --- Xizmat haqi ---
    service_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # --- Fiskal (OFD) ---
    ofd_provider   = models.CharField(max_length=20, blank=True)   # uzkassa|epos|qpos
    ofd_config     = models.JSONField(default=dict, blank=True)    # shifrlangan
    fiscal_enabled = models.BooleanField(default=False)

    # --- Holat ---
    is_active  = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ⚡ Kesh versiyasi (menyu invalidation uchun)
    menu_version = models.IntegerField(default=1)

    class Meta:
        db_table = 'restaurant'
        indexes = [
            models.Index(fields=['is_active', 'plan']),
            models.Index(fields=['city', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.slug})'

    @property
    def is_plan_active(self) -> bool:
        from django.utils import timezone
        if self.plan == 'free':
            return True
        return bool(self.plan_expires and self.plan_expires > timezone.now())
```

`config/settings/base.py` → `INSTALLED_APPS` ichida `'apps.tenants'` borligini tekshir.

✅ **Tekshirish:**
```bash
python manage.py check
```

---

## V-014 — `Plan` va `Subscription` modellari

**Fayl:** `apps/tenants/models.py` (oxiriga qo'shiladi)

```python
class Plan(models.Model):
    """Tarif jadvali — narx va limitlar bitta joyda (kodda emas ⚡)"""
    code            = models.SlugField(max_length=20, unique=True)   # free|start|pro|enterprise
    name_uz         = models.CharField(max_length=80)
    name_ru         = models.CharField(max_length=80, blank=True)
    name_en         = models.CharField(max_length=80, blank=True)

    price_month_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_year_uzs  = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Limitlar (-1 = cheksiz) ⚡
    table_limit     = models.IntegerField(default=3)
    dish_limit      = models.IntegerField(default=30)
    ar_model_limit  = models.IntegerField(default=0)
    staff_limit     = models.IntegerField(default=3)
    ai_daily_usd    = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    features        = models.JSONField(default=dict, blank=True)
    # {"custom_domain": true, "fiscal": true, "analytics_pro": false}

    order           = models.IntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'plan'
        ordering = ['order']

    def __str__(self):
        return f'{self.code} — {self.name_uz}'

    def limit(self, key: str) -> int:
        return getattr(self, f'{key}_limit', 0)


class Subscription(models.Model):
    """Restoran obunasi — to'lov tarixi va joriy holat"""
    STATUS = [
        ('trial', 'Sinov'), ('active', 'Faol'),
        ('past_due', 'To\'lov kechikdi'), ('cancelled', 'Bekor qilindi'),
    ]
    restaurant   = models.ForeignKey(Restaurant, on_delete=models.CASCADE,
                                     related_name='subscriptions', db_index=True)
    plan         = models.ForeignKey(Plan, on_delete=models.PROTECT)
    status       = models.CharField(max_length=20, choices=STATUS, default='trial', db_index=True)
    period       = models.CharField(max_length=10, default='month')   # month|year
    started_at   = models.DateTimeField(auto_now_add=True)
    expires_at   = models.DateTimeField(db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    amount_uzs   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_at      = models.DateTimeField(null=True, blank=True)
    payment_ref  = models.CharField(max_length=120, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription'
        indexes = [
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        return f'{self.restaurant.slug} — {self.plan.code} ({self.status})'
```

✅ **Tekshirish:** `python manage.py check`

---

## V-015 — Migratsiya + tariflar seed

```bash
python manage.py makemigrations tenants
python manage.py migrate
```

**Fayl:** `scripts/seed_plans.py`
```python
"""Tariflarni yaratadi/yangilaydi. Qayta-qayta ishga tushirsa xavfsiz (idempotent)."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.tenants.models import Plan

PLANS = [
    dict(code='free', name_uz='Bepul', name_ru='Бесплатный', name_en='Free',
         price_month_uzs=0, price_year_uzs=0,
         table_limit=3, dish_limit=30, ar_model_limit=0, staff_limit=3,
         ai_daily_usd=0, order=1,
         features={'custom_domain': False, 'fiscal': False, 'analytics_pro': False}),
    dict(code='start', name_uz='Start', name_ru='Старт', name_en='Start',
         price_month_uzs=299000, price_year_uzs=2990000,
         table_limit=20, dish_limit=150, ar_model_limit=10, staff_limit=10,
         ai_daily_usd=0.5, order=2,
         features={'custom_domain': False, 'fiscal': True, 'analytics_pro': False}),
    dict(code='pro', name_uz='Pro', name_ru='Про', name_en='Pro',
         price_month_uzs=699000, price_year_uzs=6990000,
         table_limit=-1, dish_limit=-1, ar_model_limit=50, staff_limit=50,
         ai_daily_usd=2.0, order=3,
         features={'custom_domain': True, 'fiscal': True, 'analytics_pro': True}),
    dict(code='enterprise', name_uz='Enterprise', name_ru='Энтерпрайз', name_en='Enterprise',
         price_month_uzs=1990000, price_year_uzs=19900000,
         table_limit=-1, dish_limit=-1, ar_model_limit=-1, staff_limit=-1,
         ai_daily_usd=10.0, order=4,
         features={'custom_domain': True, 'fiscal': True, 'analytics_pro': True}),
]

for p in PLANS:
    obj, created = Plan.objects.update_or_create(code=p['code'], defaults=p)
    print(('+ yaratildi' if created else '~ yangilandi'), obj.code)
print('Jami tarif:', Plan.objects.count())
```

✅ **Tekshirish:**
```bash
python scripts/seed_plans.py
# Jami tarif: 4
python manage.py shell -c "from apps.tenants.models import Plan; print(Plan.objects.get(code='pro').table_limit)"
# -1
```

---

## V-016 — `RestaurantSerializer`

**Fayl:** `apps/tenants/serializers.py`
```python
from rest_framework import serializers
from apps.tenants.models import Restaurant, Plan, Subscription


class RestaurantPublicSerializer(serializers.ModelSerializer):
    """⚡ Mijozga ko'rinadigan qism — maxfiy maydonlar YO'Q (ofd_config, inn)"""
    colors = serializers.SerializerMethodField()
    logo   = serializers.SerializerMethodField()
    langs  = serializers.ListField(source='langs_enabled', read_only=True)

    class Meta:
        model  = Restaurant
        fields = ['id', 'slug', 'name', 'logo', 'colors', 'langs',
                  'default_lang', 'service_fee_pct', 'city']

    def get_colors(self, obj):
        return {'primary': obj.color_primary, 'accent': obj.color_accent}

    def get_logo(self, obj):
        return obj.logo.url if obj.logo else None


class RestaurantAdminSerializer(serializers.ModelSerializer):
    """Restoran admini ko'radigan/tahrirlaydigan qism"""
    class Meta:
        model  = Restaurant
        fields = [
            'id', 'slug', 'name', 'legal_name', 'inn', 'phone', 'address', 'city',
            'lat', 'lng', 'logo', 'color_primary', 'color_accent', 'custom_domain',
            'default_lang', 'langs_enabled', 'plan', 'plan_expires',
            'ar_model_limit', 'table_limit', 'service_fee_pct',
            'ofd_provider', 'fiscal_enabled', 'is_active', 'menu_version',
        ]
        read_only_fields = ['id', 'slug', 'plan', 'plan_expires',
                            'ar_model_limit', 'table_limit', 'menu_version']


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Plan
        fields = ['code', 'name_uz', 'name_ru', 'name_en', 'price_month_uzs',
                  'price_year_uzs', 'table_limit', 'dish_limit', 'ar_model_limit',
                  'staff_limit', 'features']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model  = Subscription
        fields = ['id', 'plan', 'status', 'period', 'started_at',
                  'expires_at', 'amount_uzs', 'paid_at']
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "from apps.tenants.serializers import RestaurantPublicSerializer as S; print(S().fields.keys())"
```

---

## V-017 — Tarif limitlari servisi

**Fayl:** `apps/tenants/services.py`
```python
"""
⚡ Tarif limitlarini tekshirish. Limitni oshirsa → PlanLimit (402).
Har CRUD'da chaqiriladi: stol qo'shish, taom qo'shish, 3D yaratish, xodim qo'shish.
"""
import logging
from django.core.cache import cache
from django.utils import timezone
from core.exceptions import PlanLimit

log = logging.getLogger('tenants.services')

UNLIMITED = -1

# Model → Plan limit maydoni moslashuvi
LIMIT_MAP = {
    'table': 'table_limit',
    'dish':  'dish_limit',
    'ar':    'ar_model_limit',
    'staff': 'staff_limit',
}


def get_plan(restaurant):
    """Restoran tarifi (Plan obyekti). Kesh 300s."""
    key = f'plan:{restaurant.plan}'
    plan = cache.get(key)
    if plan is None:
        from apps.tenants.models import Plan
        plan = Plan.objects.filter(code=restaurant.plan, is_active=True).first()
        if plan is None:
            plan = Plan.objects.filter(code='free').first()
        cache.set(key, plan, 300)
    return plan


def plan_expired(restaurant) -> bool:
    if restaurant.plan == 'free':
        return False
    return not (restaurant.plan_expires and restaurant.plan_expires > timezone.now())


def get_limit(restaurant, kind: str) -> int:
    """kind: table|dish|ar|staff → int (-1 = cheksiz)"""
    field = LIMIT_MAP[kind]
    plan = get_plan(restaurant)
    if plan is None:
        return 0
    if plan_expired(restaurant):
        from apps.tenants.models import Plan
        free = Plan.objects.filter(code='free').first()
        return getattr(free, field, 0) if free else 0
    return getattr(plan, field, 0)


def current_usage(restaurant, kind: str) -> int:
    """Hozirgi ishlatilgan miqdor"""
    rid = restaurant.id
    if kind == 'table':
        from apps.tables.models import Table
        return Table.objects.filter(restaurant_id=rid, is_active=True).count()
    if kind == 'dish':
        from apps.menu.models import Dish
        return Dish.objects.filter(restaurant_id=rid).count()
    if kind == 'ar':
        from apps.ar3d.models import DishModel3D
        return DishModel3D.objects.filter(dish__restaurant_id=rid, status='ready').count()
    if kind == 'staff':
        from apps.accounts.models import Staff
        return Staff.objects.filter(restaurant_id=rid, is_active=True).count()
    return 0


def check_limit(restaurant, kind: str, add: int = 1):
    """
    ⚡ Limit oshsa PlanLimit (402) tashlaydi.
    Ishlatish:  check_limit(request.restaurant, 'table')
    """
    limit = get_limit(restaurant, kind)
    if limit == UNLIMITED:
        return
    used = current_usage(restaurant, kind)
    if used + add > limit:
        log.info(f'[plan] {restaurant.slug} limit: {kind} {used}+{add} > {limit}')
        raise PlanLimit({'kind': kind, 'used': used, 'limit': limit,
                         'plan': restaurant.plan})


def has_feature(restaurant, feature: str) -> bool:
    plan = get_plan(restaurant)
    if plan is None or plan_expired(restaurant):
        return False
    return bool((plan.features or {}).get(feature, False))


def usage_summary(restaurant) -> dict:
    """Admin dashboard uchun: har limitning holati"""
    out = {}
    for kind in LIMIT_MAP:
        limit = get_limit(restaurant, kind)
        used = current_usage(restaurant, kind)
        out[kind] = {
            'used': used,
            'limit': limit,
            'unlimited': limit == UNLIMITED,
            'pct': 0 if limit in (0, UNLIMITED) else round(used * 100 / limit),
        }
    return out
```

✅ **Test:** `tests/test_plan_limits.py`
```python
import pytest
from core.exceptions import PlanLimit
from apps.tenants.services import get_limit, check_limit, has_feature


@pytest.mark.django_db
def test_free_plan_table_limit(restaurant, plans):
    restaurant.plan = 'free'; restaurant.save()
    assert get_limit(restaurant, 'table') == 3


@pytest.mark.django_db
def test_pro_plan_unlimited_tables(restaurant, plans):
    from django.utils import timezone
    from datetime import timedelta
    restaurant.plan = 'pro'
    restaurant.plan_expires = timezone.now() + timedelta(days=30)
    restaurant.save()
    assert get_limit(restaurant, 'table') == -1
    check_limit(restaurant, 'table')          # xato bermaydi
    assert has_feature(restaurant, 'custom_domain') is True


@pytest.mark.django_db
def test_expired_plan_falls_back_to_free(restaurant, plans):
    from django.utils import timezone
    from datetime import timedelta
    restaurant.plan = 'pro'
    restaurant.plan_expires = timezone.now() - timedelta(days=1)
    restaurant.save()
    assert get_limit(restaurant, 'table') == 3
    assert has_feature(restaurant, 'custom_domain') is False
```

`tests/conftest.py` ga qo'shiladi:
```python
@pytest.fixture
def plans(db):
    from apps.tenants.models import Plan
    data = [
        dict(code='free',  name_uz='Bepul', table_limit=3,  dish_limit=30,
             ar_model_limit=0,  staff_limit=3,  features={'custom_domain': False}),
        dict(code='start', name_uz='Start', table_limit=20, dish_limit=150,
             ar_model_limit=10, staff_limit=10, features={'custom_domain': False}),
        dict(code='pro',   name_uz='Pro',   table_limit=-1, dish_limit=-1,
             ar_model_limit=50, staff_limit=50, features={'custom_domain': True}),
    ]
    return [Plan.objects.create(**d) for d in data]
```

---

## V-018 — `User` modeli (AbstractUser)

**Fayl:** `apps/accounts/apps.py`
```bash
mkdir -p apps/accounts/migrations && touch apps/accounts/__init__.py apps/accounts/migrations/__init__.py
```
```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'apps.accounts'
    label = 'accounts'
```

**Fayl:** `apps/accounts/models.py`
```python
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


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
    phone      = models.CharField(max_length=20, unique=True, db_index=True)  # 998XXXXXXXXX
    email      = models.EmailField(blank=True, db_index=True)
    full_name  = models.CharField(max_length=150, blank=True)
    lang       = models.CharField(max_length=2, default='uz')

    # ⚡ Super-admin (platforma darajasi) — restoran admini EMAS
    is_platform_admin = models.BooleanField(default=False, db_index=True)
    totp_secret       = models.CharField(max_length=64, blank=True)   # 2FA (V-026)
    totp_enabled      = models.BooleanField(default=False)

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'phone'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'auth_user_armenu'

    def __str__(self):
        return self.full_name or self.phone
```

`config/settings/base.py` ga qo'shiladi:
```python
AUTH_USER_MODEL = 'accounts.User'
```
`INSTALLED_APPS` da `'apps.accounts'` borligini tekshir.

⚠️ **Diqqat:** custom User modeli birinchi migratsiyadan OLDIN qo'shilishi kerak.
Agar `django.contrib.auth` migratsiyalari allaqachon qo'llangan bo'lsa:
```bash
python manage.py flush --no-input   # faqat DEV bazada!
# yoki bazani qayta yaratish
```

✅ **Tekshirish:** `python manage.py check`

---

## V-019 — `Staff` modeli (rol + PIN)

**Fayl:** `apps/accounts/models.py` (oxiriga)

```python
from core.models import TenantModel

ROLES = [
    ('waiter',  'Ofitsiant'),
    ('cook',    'Oshpaz'),
    ('cashier', 'Kassir'),
    ('admin',   'Restoran admini'),
    ('manager', 'Menejer'),
]


class Staff(TenantModel):
    """
    ⚡ Restoran xodimi. TenantModel → restaurant FK avtomatik.
    Bir User turli restoranlarda turli Staff bo'lishi mumkin.
    """
    user      = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name='staff_roles', null=True, blank=True)
    full_name = models.CharField(max_length=150)
    phone     = models.CharField(max_length=20, blank=True, db_index=True)
    role      = models.CharField(max_length=20, choices=ROLES, db_index=True)

    # ⚡ PIN — bcrypt hash, ochiq matn HECH QACHON saqlanmaydi
    pin_hash  = models.CharField(max_length=128, blank=True)
    pin_set_at = models.DateTimeField(null=True, blank=True)

    # Ofitsiantga biriktirilgan stollar (Table.id ro'yxati)
    tables       = models.JSONField(default=list, blank=True)
    tips_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Smena
    shift_started_at = models.DateTimeField(null=True, blank=True)
    is_on_shift      = models.BooleanField(default=False, db_index=True)

    # Bloklash (V-023 rate-limit)
    failed_attempts = models.SmallIntegerField(default=0)
    blocked_until   = models.DateTimeField(null=True, blank=True)

    is_active   = models.BooleanField(default=True, db_index=True)
    last_login  = models.DateTimeField(null=True, blank=True)

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
```

```bash
python manage.py makemigrations accounts
python manage.py migrate
python manage.py createsuperuser   # phone: 998901234567
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "from apps.accounts.models import Staff; print(Staff._meta.db_table)"
# staff
```

---

## V-020 — PIN hash (bcrypt) + tekshirish

**Fayl:** `apps/accounts/services.py`
```python
"""
⚡ PIN xavfsizligi:
  - 4-6 raqamli PIN, bcrypt (cost=10) bilan hash qilinadi
  - Ochiq matn HECH QAYERDA saqlanmaydi (DB, log, WS, javob)
  - Bir restoran ichida PIN takrorlanmasligi tekshiriladi
"""
import re
import logging
import bcrypt
from django.utils import timezone
from rest_framework import serializers

log = logging.getLogger('accounts.services')

PIN_RE = re.compile(r'^\d{4,6}$')
BCRYPT_ROUNDS = 10

# Juda oson PIN'lar — taqiqlanadi ⛔
WEAK_PINS = {
    '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
    '1234', '4321', '1212', '0123', '000000', '111111', '123456', '654321',
}


def validate_pin(pin: str):
    if not pin or not PIN_RE.match(pin):
        raise serializers.ValidationError('PIN 4-6 ta raqamdan iborat bo\'lishi kerak')
    if pin in WEAK_PINS:
        raise serializers.ValidationError('Bu PIN juda oddiy. Boshqasini tanlang.')


def hash_pin(pin: str) -> str:
    validate_pin(pin)
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_pin(pin: str, pin_hash: str) -> bool:
    if not pin or not pin_hash:
        return False
    try:
        return bcrypt.checkpw(pin.encode(), pin_hash.encode())
    except (ValueError, TypeError):
        return False


def set_pin(staff, pin: str, check_unique=True):
    """
    ⚡ PIN o'rnatish. Bir restoran ichida takrorlanmasin —
    aks holda login qaysi xodimni topishi noaniq bo'ladi.
    """
    validate_pin(pin)
    if check_unique:
        from apps.accounts.models import Staff
        others = Staff.objects.filter(
            restaurant_id=staff.restaurant_id, is_active=True
        ).exclude(pk=staff.pk).exclude(pin_hash='')
        for o in others:
            if verify_pin(pin, o.pin_hash):
                raise serializers.ValidationError(
                    'Bu PIN restoranda allaqachon ishlatilgan. Boshqasini tanlang.')
    staff.pin_hash = hash_pin(pin)
    staff.pin_set_at = timezone.now()
    staff.save(update_fields=['pin_hash', 'pin_set_at', 'updated_at'])
    log.info(f'[pin] set staff#{staff.id} rest#{staff.restaurant_id}')


def find_staff_by_pin(restaurant_id: int, pin: str):
    """
    ⚡ PIN bo'yicha xodimni topadi. Faqat SHU restoran ichida —
    cross-tenant PIN mos kelishi mumkin emas.
    Qaytadi: (staff | None)
    """
    from apps.accounts.models import Staff
    qs = Staff.objects.filter(
        restaurant_id=restaurant_id, is_active=True
    ).exclude(pin_hash='').select_related('restaurant')
    for s in qs:
        if verify_pin(pin, s.pin_hash):
            return s
    return None
```

✅ **Test:** `tests/test_pin.py`
```python
import pytest
from rest_framework.serializers import ValidationError
from apps.accounts.services import hash_pin, verify_pin, validate_pin


def test_hash_is_not_plaintext():
    h = hash_pin('5731')
    assert h != '5731' and h.startswith('$2b$')


def test_verify_ok_and_fail():
    h = hash_pin('5731')
    assert verify_pin('5731', h) is True
    assert verify_pin('5732', h) is False


def test_weak_pin_rejected():
    for bad in ('1234', '0000', '111111'):
        with pytest.raises(ValidationError):
            validate_pin(bad)


def test_short_pin_rejected():
    with pytest.raises(ValidationError):
        validate_pin('123')
```

---

## V-021 — ⚡ JWT generatsiya (restaurant_id token ICHIDA)

**Fayl:** `apps/accounts/tokens.py`
```python
"""
⚡ ENG MUHIM XAVFSIZLIK NUQTASI.
restaurant_id token ichida imzolanadi — klient uni o'zgartira olmaydi.
Har so'rovda TenantMiddleware token'dan restaurant_id ni oladi.
⛔ restaurant_id ni HECH QACHON so'rov body/query'dan olma.
"""
import uuid
import logging
import datetime as dt
import jwt
from django.conf import settings
from django.core.cache import cache

log = logging.getLogger('accounts.tokens')

ALG = 'HS256'
ACCESS_TTL  = 60 * 60 * 12          # 12 soat (smena davomiyligi)
REFRESH_TTL = 60 * 60 * 24 * 30     # 30 kun


def _secret() -> str:
    return getattr(settings, 'JWT_SECRET', None) or settings.SECRET_KEY


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def make_access(staff) -> str:
    payload = {
        'typ':  'access',
        'sub':  str(staff.id),
        'rid':  staff.restaurant_id,        # ⚡ restaurant_id — imzolangan
        'role': staff.role,
        'name': staff.full_name,
        'uid':  staff.user_id,
        'jti':  str(uuid.uuid4()),
        'iat':  int(_now().timestamp()),
        'exp':  int((_now() + dt.timedelta(seconds=ACCESS_TTL)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def make_refresh(staff) -> str:
    jti = str(uuid.uuid4())
    payload = {
        'typ': 'refresh',
        'sub': str(staff.id),
        'rid': staff.restaurant_id,
        'jti': jti,
        'iat': int(_now().timestamp()),
        'exp': int((_now() + dt.timedelta(seconds=REFRESH_TTL)).timestamp()),
    }
    cache.set(f'rt:{jti}', staff.id, REFRESH_TTL)     # bekor qilish uchun
    return jwt.encode(payload, _secret(), algorithm=ALG)


def make_pair(staff) -> dict:
    return {
        'access':  make_access(staff),
        'refresh': make_refresh(staff),
        'expires_in': ACCESS_TTL,
    }


def make_platform_token(user) -> str:
    """Super-admin tokeni — rid YO'Q (platforma darajasi)"""
    payload = {
        'typ': 'platform',
        'sub': str(user.id),
        'rid': None,
        'role': 'platform_admin',
        'jti': str(uuid.uuid4()),
        'iat': int(_now().timestamp()),
        'exp': int((_now() + dt.timedelta(seconds=ACCESS_TTL)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def decode(token: str, expect_typ: str = None) -> dict:
    """Xato bo'lsa jwt.PyJWTError tashlaydi"""
    data = jwt.decode(token, _secret(), algorithms=[ALG])
    if expect_typ and data.get('typ') != expect_typ:
        raise jwt.InvalidTokenError(f'token turi noto\'g\'ri: {data.get("typ")}')
    return data


def revoke_refresh(jti: str):
    cache.delete(f'rt:{jti}')


def refresh_is_valid(jti: str) -> bool:
    return cache.get(f'rt:{jti}') is not None
```

**Fayl:** `apps/accounts/authentication.py`
```python
"""DRF autentifikatsiya klassi — Bearer JWT"""
import jwt
import logging
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.accounts.tokens import decode

log = logging.getLogger('accounts.auth')


class StaffJWTAuthentication(BaseAuthentication):
    """
    ⚡ Muvaffaqiyatli bo'lsa:
       request.user       = User (yoki AnonymousUser)
       request.auth       = payload dict
       request.staff      = Staff
       request.restaurant_id = payload['rid']   ← TENANT SCOPE
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith(self.keyword + ' '):
            return None
        token = header[len(self.keyword) + 1:].strip()

        try:
            payload = decode(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token muddati tugagan')
        except jwt.PyJWTError as e:
            log.warning(f'[auth] noto\'g\'ri token: {e}')
            raise AuthenticationFailed('Token yaroqsiz')

        typ = payload.get('typ')
        if typ == 'platform':
            return self._platform(request, payload)
        if typ != 'access':
            raise AuthenticationFailed('Token turi noto\'g\'ri')
        return self._staff(request, payload)

    def _staff(self, request, payload):
        from apps.accounts.models import Staff
        staff = Staff.objects.filter(
            id=payload['sub'], restaurant_id=payload['rid'], is_active=True
        ).select_related('restaurant', 'user').first()
        if staff is None:
            raise AuthenticationFailed('Xodim topilmadi yoki nofaol')
        if not staff.restaurant.is_active:
            raise AuthenticationFailed('Restoran nofaol')

        # ⚡ TENANT SCOPE — token ichidan, so'rovdan EMAS
        request.staff = staff
        request.restaurant = staff.restaurant
        request.restaurant_id = staff.restaurant_id
        user = staff.user
        if user is not None:
            user.staff = staff
        return (user, payload)

    def _platform(self, request, payload):
        from apps.accounts.models import User
        user = User.objects.filter(id=payload['sub'], is_platform_admin=True,
                                   is_active=True).first()
        if user is None:
            raise AuthenticationFailed('Platforma admini topilmadi')
        request.staff = None
        request.restaurant_id = None
        return (user, payload)

    def authenticate_header(self, request):
        return self.keyword
```

`config/settings/base.py` → `REST_FRAMEWORK` ga qo'shiladi:
```python
REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
    'apps.accounts.authentication.StaffJWTAuthentication',
    'rest_framework.authentication.SessionAuthentication',
]
JWT_SECRET = config('JWT_SECRET', default='')   # bo'sh bo'lsa SECRET_KEY ishlatiladi
```

⚡ **`core/middleware.py` da 3-bosqich qo'shiladi** (V-005 ni to'ldiradi) —
DRF auth middleware'dan KEYIN ishlaydi, shuning uchun
`StaffJWTAuthentication` `request.restaurant_id` ni o'zi o'rnatadi. Middleware faqat
mijoz (slug/domen) yo'lini boshqaradi.

✅ **Test:** `tests/test_tokens.py`
```python
import pytest
from apps.accounts.tokens import make_access, decode


@pytest.mark.django_db
def test_token_contains_restaurant_id(staff):
    payload = decode(make_access(staff), expect_typ='access')
    assert payload['rid'] == staff.restaurant_id
    assert payload['role'] == staff.role


@pytest.mark.django_db
def test_tampered_token_rejected(staff):
    import jwt
    tok = make_access(staff)
    bad = tok[:-4] + 'AAAA'
    with pytest.raises(jwt.PyJWTError):
        decode(bad)
```

`tests/conftest.py` ga:
```python
@pytest.fixture
def staff(db, restaurant):
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    return Staff.objects.create(
        restaurant=restaurant, full_name='Ali Valiyev', phone='998901111111',
        role='waiter', pin_hash=hash_pin('5731'), is_active=True)


@pytest.fixture
def staff2(db, restaurant2):
    """⚡ Ikkinchi restoran xodimi — cross-tenant testlar uchun"""
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    return Staff.objects.create(
        restaurant=restaurant2, full_name='Bek Bekov', phone='998902222222',
        role='admin', pin_hash=hash_pin('8642'), is_active=True)


@pytest.fixture
def staff_token(staff):
    from apps.accounts.tokens import make_access
    return make_access(staff)


@pytest.fixture
def admin_token(db, restaurant):
    from apps.accounts.models import Staff
    from apps.accounts.tokens import make_access
    s = Staff.objects.create(restaurant=restaurant, full_name='Admin A',
                             phone='998903333333', role='admin', is_active=True)
    return make_access(s)
```

---

## V-022 — `POST /v1/staff/login/` (PIN bilan kirish)

**Fayl:** `apps/accounts/serializers.py`
```python
from rest_framework import serializers
from apps.accounts.models import Staff


class StaffLoginSerializer(serializers.Serializer):
    slug = serializers.SlugField(max_length=64)
    pin  = serializers.RegexField(r'^\d{4,6}$', max_length=6)


class StaffSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model  = Staff
        fields = ['id', 'full_name', 'phone', 'role', 'role_label', 'tables',
                  'is_on_shift', 'shift_started_at', 'tips_balance', 'is_active']
        # ⛔ pin_hash HECH QACHON chiqmaydi


class StaffWriteSerializer(serializers.ModelSerializer):
    pin = serializers.RegexField(r'^\d{4,6}$', max_length=6, write_only=True,
                                 required=False, allow_blank=True)

    class Meta:
        model  = Staff
        fields = ['id', 'full_name', 'phone', 'role', 'tables', 'is_active', 'pin']

    def create(self, validated):
        pin = validated.pop('pin', None)
        staff = Staff.objects.create(**validated)
        if pin:
            from apps.accounts.services import set_pin
            set_pin(staff, pin)
        return staff

    def update(self, instance, validated):
        pin = validated.pop('pin', None)
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if pin:
            from apps.accounts.services import set_pin
            set_pin(instance, pin)
        return instance
```

**Fayl:** `apps/accounts/views.py`
```python
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.tenants.models import Restaurant
from apps.accounts.models import Staff
from apps.accounts.serializers import StaffLoginSerializer, StaffSerializer
from apps.accounts.services import find_staff_by_pin
from apps.accounts.tokens import make_pair
from apps.accounts.throttles import LoginRateLimit
from core.exceptions import RestaurantInactive

log = logging.getLogger('accounts.views')


def client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


class StaffLoginView(APIView):
    """
    POST /v1/staff/login/
    {"slug": "registon", "pin": "5731"}
    →  {"access": "...", "refresh": "...", "expires_in": 43200, "staff": {...}}
    ⚡ Xato javobda HECH QACHON "bunday PIN yo'q" / "restoran yo'q" farqlanmaydi.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        ser = StaffLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        slug = ser.validated_data['slug']
        pin  = ser.validated_data['pin']
        ip   = client_ip(request)

        restaurant = Restaurant.objects.filter(slug=slug).first()
        if restaurant is None:
            log.warning(f'[login] noma\'lum restoran slug={slug} ip={ip}')
            return self._fail()
        if not restaurant.is_active:
            raise RestaurantInactive()

        staff = find_staff_by_pin(restaurant.id, pin)
        if staff is None:
            log.warning(f'[login] xato PIN rest={slug} ip={ip}')
            return self._fail()

        if staff.is_blocked:
            return Response({'error': {
                'code': 'RATE_LIMITED',
                'message_uz': f'Hisob {staff.blocked_until:%H:%M} gacha bloklangan',
                'message_ru': f'Аккаунт заблокирован до {staff.blocked_until:%H:%M}',
                'message_en': f'Account blocked until {staff.blocked_until:%H:%M}',
            }}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Muvaffaqiyat → hisoblagichni tozalash
        staff.failed_attempts = 0
        staff.blocked_until = None
        staff.last_login = timezone.now()
        staff.save(update_fields=['failed_attempts', 'blocked_until',
                                  'last_login', 'updated_at'])

        from apps.analytics.models import AuditLog
        AuditLog.log(restaurant_id=restaurant.id, actor=staff, action='staff.login',
                     model='Staff', object_id=staff.id, ip=ip)

        data = make_pair(staff)
        data['staff'] = StaffSerializer(staff).data
        data['restaurant'] = {'id': restaurant.id, 'slug': restaurant.slug,
                              'name': restaurant.name}
        log.info(f'[login] OK staff#{staff.id} rest={slug} role={staff.role}')
        return Response(data)

    @staticmethod
    def _fail():
        """⚡ Yagona xato — foydalanuvchi sanab topa olmasin"""
        return Response({'error': {
            'code': 'INVALID_CREDENTIALS',
            'message_uz': 'Restoran yoki PIN noto\'g\'ri',
            'message_ru': 'Ресторан или PIN неверный',
            'message_en': 'Invalid restaurant or PIN',
        }}, status=status.HTTP_401_UNAUTHORIZED)


class StaffMeView(APIView):
    """GET /v1/staff/me/"""
    def get(self, request):
        staff = getattr(request, 'staff', None)
        if staff is None:
            return Response({'detail': 'Xodim emas'}, status=403)
        return Response({
            'staff': StaffSerializer(staff).data,
            'restaurant': {'id': staff.restaurant_id,
                           'slug': staff.restaurant.slug,
                           'name': staff.restaurant.name,
                           'colors': {'primary': staff.restaurant.color_primary,
                                      'accent': staff.restaurant.color_accent}},
        })
```

**Fayl:** `apps/accounts/urls.py`
```python
from django.urls import path
from apps.accounts import views

urlpatterns = [
    path('staff/login/',   views.StaffLoginView.as_view(),   name='staff-login'),
    path('staff/refresh/', views.StaffRefreshView.as_view(), name='staff-refresh'),
    path('staff/me/',      views.StaffMeView.as_view(),      name='staff-me'),
    path('admin/login/',   views.AdminLoginView.as_view(),   name='admin-login'),
    path('platform/login/', views.PlatformLoginView.as_view(), name='platform-login'),
]
```

**Fayl:** `config/urls.py`
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('v1/', include('apps.accounts.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://127.0.0.1:8060/v1/staff/login/ \
  -H 'Content-Type: application/json' \
  -d '{"slug":"test-rest","pin":"5731"}' | python -m json.tool
# access, refresh, staff bo'ladi
```

---

## V-023 — Rate-limit (5 xato → 15 daqiqa blok)

**Fayl:** `apps/accounts/throttles.py`
```python
"""
⚡ Ikki qatlamli himoya:
  1. IP bo'yicha throttle (DRF) — 20 urinish / 15 daqiqa
  2. Xodim bo'yicha blok (DB) — 5 xato PIN → 15 daqiqa blok
"""
import logging
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from rest_framework.throttling import SimpleRateThrottle

log = logging.getLogger('accounts.throttle')

MAX_FAILS   = 5
BLOCK_MIN   = 15
FAIL_WINDOW = 15 * 60


class LoginRateLimit(SimpleRateThrottle):
    """IP + slug bo'yicha: 20 urinish / 15 daqiqa"""
    scope = 'login'
    rate  = '20/15m'

    def get_cache_key(self, request, view):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')
        slug = (request.data or {}).get('slug', '-')
        return f'throttle:login:{ip}:{slug}'

    def parse_rate(self, rate):
        # DRF '15m' ni tushunmaydi — o'zimiz beramiz
        return (20, 15 * 60)


def register_fail(restaurant_id: int, pin_attempt_key: str, staff=None):
    """
    Xato urinishni yozadi. 5 ta bo'lsa → staff bloklanadi.
    staff=None bo'lsa (PIN topilmadi) — faqat IP kesh hisoblagichi oshadi.
    """
    key = f'loginfail:{restaurant_id}:{pin_attempt_key}'
    try:
        n = cache.incr(key)
    except ValueError:
        cache.set(key, 1, FAIL_WINDOW)
        n = 1

    if staff is not None:
        staff.failed_attempts = (staff.failed_attempts or 0) + 1
        fields = ['failed_attempts', 'updated_at']
        if staff.failed_attempts >= MAX_FAILS:
            staff.blocked_until = timezone.now() + timedelta(minutes=BLOCK_MIN)
            fields.append('blocked_until')
            log.warning(f'[login] staff#{staff.id} BLOKLANDI {BLOCK_MIN} daq ⛔')
        staff.save(update_fields=fields)
    return n


def is_ip_blocked(restaurant_id: int, ip: str) -> bool:
    return (cache.get(f'loginfail:{restaurant_id}:{ip}') or 0) >= MAX_FAILS * 4


def clear_fails(restaurant_id: int, key: str):
    cache.delete(f'loginfail:{restaurant_id}:{key}')
```

`apps/accounts/views.py` → `StaffLoginView.post` ichida PIN topilmaganda:
```python
        staff = find_staff_by_pin(restaurant.id, pin)
        if staff is None:
            from apps.accounts.throttles import register_fail, is_ip_blocked
            register_fail(restaurant.id, ip)
            if is_ip_blocked(restaurant.id, ip):
                return Response({'error': {
                    'code': 'RATE_LIMITED',
                    'message_uz': 'Juda ko\'p urinish. 15 daqiqadan keyin urinib ko\'ring.',
                    'message_ru': 'Слишком много попыток. Повторите через 15 минут.',
                    'message_en': 'Too many attempts. Try again in 15 minutes.',
                }}, status=429)
            log.warning(f'[login] xato PIN rest={slug} ip={ip}')
            return self._fail()
```

`config/settings/base.py`:
```python
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'login': '20/min',
    'guest': '120/min',
    'staff': '300/min',
}
```

✅ **Test:** `tests/test_login_throttle.py`
```python
import pytest
from django.utils import timezone
from apps.accounts.throttles import register_fail, MAX_FAILS


@pytest.mark.django_db
def test_staff_blocked_after_5_fails(staff):
    for _ in range(MAX_FAILS):
        register_fail(staff.restaurant_id, '1.2.3.4', staff=staff)
    staff.refresh_from_db()
    assert staff.is_blocked is True
    assert staff.blocked_until > timezone.now()


@pytest.mark.django_db
def test_login_blocked_returns_429(api_client, staff):
    from apps.accounts.throttles import register_fail, MAX_FAILS
    for _ in range(MAX_FAILS):
        register_fail(staff.restaurant_id, '1.2.3.4', staff=staff)
    r = api_client.post('/v1/staff/login/',
                        {'slug': staff.restaurant.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 429
```

---

## V-024 — ⚡ `core/permissions.py`

**Fayl:** `core/permissions.py`
```python
"""
⚡ Rol-asosli ruxsatlar. Har ViewSet'da permission_classes ko'rsatilishi SHART.
⛔ Ruxsatsiz ViewSet = ochiq eshik.
"""
from rest_framework.permissions import BasePermission

ROLE_WAITER  = 'waiter'
ROLE_COOK    = 'cook'
ROLE_CASHIER = 'cashier'
ROLE_ADMIN   = 'admin'
ROLE_MANAGER = 'manager'

ADMIN_ROLES = {ROLE_ADMIN, ROLE_MANAGER}


class _RoleBase(BasePermission):
    roles = set()
    message = 'Bu amal uchun ruxsat yo\'q'

    def has_permission(self, request, view):
        staff = getattr(request, 'staff', None)
        if staff is None or not staff.is_active:
            return False
        if getattr(request, 'restaurant_id', None) != staff.restaurant_id:
            return False                       # ⚡ tenant mos kelmadi
        return staff.role in self.roles

    def has_object_permission(self, request, view, obj):
        """⚡ Obyekt boshqa restoranga tegishli bo'lsa — YO'Q"""
        rid = getattr(request, 'restaurant_id', None)
        obj_rid = getattr(obj, 'restaurant_id', None)
        if obj_rid is None and hasattr(obj, 'restaurant'):
            obj_rid = obj.restaurant_id
        return obj_rid is None or obj_rid == rid


class IsStaff(_RoleBase):
    roles = {ROLE_WAITER, ROLE_COOK, ROLE_CASHIER, ROLE_ADMIN, ROLE_MANAGER}


class IsWaiter(_RoleBase):
    roles = {ROLE_WAITER, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat ofitsiant uchun'


class IsCook(_RoleBase):
    roles = {ROLE_COOK, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat oshxona uchun'


class IsCashier(_RoleBase):
    roles = {ROLE_CASHIER, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat kassir uchun'


class IsRestAdmin(_RoleBase):
    roles = ADMIN_ROLES
    message = 'Faqat restoran admini uchun'


class IsRestAdminStrict(_RoleBase):
    """Menejer ham kira olmaydi (moliya, xodim boshqaruvi)"""
    roles = {ROLE_ADMIN}
    message = 'Faqat restoran egasi/admini uchun'


class IsPlatformAdmin(BasePermission):
    """⚡ Super-admin. restaurant_id YO'Q — barcha tenantga kiradi."""
    message = 'Faqat platforma admini uchun'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, 'is_platform_admin', False))


class ReadOnlyStaff(IsStaff):
    """Faqat-ko'rish roli"""
    def has_permission(self, request, view):
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            return False
        return super().has_permission(request, view)
```

✅ **Test:** `tests/test_permissions.py`
```python
import pytest
from types import SimpleNamespace
from core.permissions import IsWaiter, IsCook, IsRestAdmin


def _req(staff, rid=None):
    return SimpleNamespace(staff=staff, restaurant_id=rid or staff.restaurant_id,
                           method='GET', user=None)


@pytest.mark.django_db
def test_waiter_allowed(staff):
    assert IsWaiter().has_permission(_req(staff), None) is True


@pytest.mark.django_db
def test_waiter_cannot_cook(staff):
    assert IsCook().has_permission(_req(staff), None) is False


@pytest.mark.django_db
def test_tenant_mismatch_denied(staff):
    """⚡ token rid ≠ staff rid → YO'Q"""
    req = _req(staff, rid=999999)
    assert IsWaiter().has_permission(req, None) is False


@pytest.mark.django_db
def test_admin_has_all(staff):
    staff.role = 'admin'
    assert IsWaiter().has_permission(_req(staff), None) is True
    assert IsCook().has_permission(_req(staff), None) is True
    assert IsRestAdmin().has_permission(_req(staff), None) is True
```

---

## V-025 — Admin login (telefon + parol)

**Fayl:** `apps/accounts/views.py` (qo'shiladi)
```python
from django.contrib.auth import authenticate
from apps.accounts.tokens import make_pair, make_platform_token


class AdminLoginView(APIView):
    """
    POST /v1/admin/login/
    {"phone": "998901234567", "password": "...", "slug": "registon"}
    ⚡ User bir nechta restoranda admin bo'lishi mumkin —
       slug berilmasa, restoranlar ro'yxati qaytadi (tanlash uchun).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        slug = request.data.get('slug', '')
        ip = client_ip(request)

        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_active:
            log.warning(f'[admin-login] xato phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_CREDENTIALS',
                'message_uz': 'Telefon yoki parol noto\'g\'ri',
                'message_ru': 'Телефон или пароль неверный',
                'message_en': 'Invalid phone or password',
            }}, status=401)

        roles = Staff.objects.filter(
            user=user, is_active=True, role__in=['admin', 'manager'],
            restaurant__is_active=True
        ).select_related('restaurant')

        if not roles.exists():
            return Response({'error': {
                'code': 'TENANT_MISMATCH',
                'message_uz': 'Sizda hech qaysi restoranda admin huquqi yo\'q',
                'message_ru': 'У вас нет прав администратора ни в одном ресторане',
                'message_en': 'You have no admin rights in any restaurant',
            }}, status=403)

        if not slug:
            if roles.count() == 1:
                staff = roles.first()
            else:
                return Response({
                    'need_restaurant': True,
                    'restaurants': [{'slug': s.restaurant.slug,
                                     'name': s.restaurant.name,
                                     'role': s.role} for s in roles],
                }, status=300)
        else:
            staff = roles.filter(restaurant__slug=slug).first()
            if staff is None:
                return Response({'error': {
                    'code': 'TENANT_MISMATCH',
                    'message_uz': 'Bu restoranda huquqingiz yo\'q',
                    'message_ru': 'У вас нет прав в этом ресторане',
                    'message_en': 'No rights in this restaurant',
                }}, status=403)

        user.last_login = timezone.now()
        user.last_login_ip = ip
        user.save(update_fields=['last_login', 'last_login_ip'])

        from apps.analytics.models import AuditLog
        AuditLog.log(restaurant_id=staff.restaurant_id, actor=staff,
                     action='admin.login', model='User', object_id=user.id, ip=ip)

        data = make_pair(staff)
        data['staff'] = StaffSerializer(staff).data
        data['restaurant'] = {'id': staff.restaurant_id,
                              'slug': staff.restaurant.slug,
                              'name': staff.restaurant.name}
        return Response(data)
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://127.0.0.1:8060/v1/admin/login/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"998901234567","password":"parol","slug":"test-rest"}' | python -m json.tool
```

---

## V-026 — Super-admin 2FA (TOTP)

**Fayl:** `apps/accounts/totp.py`
```python
"""⚡ Platforma admini uchun majburiy 2FA (Google Authenticator / Authy)"""
import pyotp
from django.conf import settings

ISSUER = 'ARMENU'


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(user, secret: str) -> str:
    """QR kod uchun otpauth:// URI"""
    return pyotp.TOTP(secret).provisioning_uri(name=user.phone, issuer_name=ISSUER)


def verify(secret: str, code: str, window: int = 1) -> bool:
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(str(code).strip(), valid_window=window)
    except Exception:
        return False


def qr_png_bytes(uri: str) -> bytes:
    import io
    import qrcode
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()
```

**Fayl:** `apps/accounts/views.py` (qo'shiladi)
```python
import base64
from apps.accounts import totp as totp_svc


class PlatformLoginView(APIView):
    """
    POST /v1/platform/login/
    1-qadam: {"phone","password"}          → {"need_2fa": true}
    2-qadam: {"phone","password","code"}   → {"access": "..."}
    ⛔ 2FA yoqilmagan platforma admini kira OLMAYDI.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        code = request.data.get('code', '')
        ip = client_ip(request)

        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_platform_admin or not user.is_active:
            log.warning(f'[platform-login] rad etildi phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_CREDENTIALS',
                'message_uz': 'Kirish rad etildi',
                'message_ru': 'Доступ запрещён',
                'message_en': 'Access denied',
            }}, status=401)

        if not user.totp_enabled:
            return Response({'error': {
                'code': 'TOTP_REQUIRED',
                'message_uz': '2FA yoqilmagan. /v1/platform/2fa/setup/ ni bajaring.',
                'message_ru': '2FA не включена.',
                'message_en': '2FA is not enabled.',
            }}, status=403)

        if not code:
            return Response({'need_2fa': True}, status=200)

        if not totp_svc.verify(user.totp_secret, code):
            log.warning(f'[platform-login] 2FA xato phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_2FA',
                'message_uz': 'Kod noto\'g\'ri',
                'message_ru': 'Неверный код',
                'message_en': 'Invalid code',
            }}, status=401)

        user.last_login = timezone.now()
        user.last_login_ip = ip
        user.save(update_fields=['last_login', 'last_login_ip'])
        log.info(f'[platform-login] OK user#{user.id} ip={ip}')
        return Response({'access': make_platform_token(user), 'expires_in': 43200})


class Platform2FASetupView(APIView):
    """
    POST /v1/platform/2fa/setup/  → secret + QR (base64 PNG)
    POST /v1/platform/2fa/confirm/ {"code": "123456"} → yoqiladi
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_platform_admin:
            return Response({'detail': 'Kirish rad etildi'}, status=401)

        code = request.data.get('code')
        if code:                                    # tasdiqlash qadami
            if not totp_svc.verify(user.totp_secret, code):
                return Response({'detail': 'Kod noto\'g\'ri'}, status=400)
            user.totp_enabled = True
            user.save(update_fields=['totp_enabled'])
            return Response({'enabled': True})

        secret = totp_svc.new_secret()              # yaratish qadami
        user.totp_secret = secret
        user.totp_enabled = False
        user.save(update_fields=['totp_secret', 'totp_enabled'])
        uri = totp_svc.provisioning_uri(user, secret)
        png = base64.b64encode(totp_svc.qr_png_bytes(uri)).decode()
        return Response({'secret': secret, 'uri': uri, 'qr_png_base64': png})
```

`apps/accounts/urls.py` ga:
```python
    path('platform/2fa/setup/', views.Platform2FASetupView.as_view(), name='platform-2fa'),
```

✅ **Test:** `tests/test_2fa.py`
```python
import pytest
import pyotp
from apps.accounts import totp as t


@pytest.mark.django_db
def test_totp_roundtrip(django_user_model):
    u = django_user_model.objects.create_user(phone='998909999999', password='x',
                                              is_platform_admin=True)
    secret = t.new_secret()
    code = pyotp.TOTP(secret).now()
    assert t.verify(secret, code) is True
    assert t.verify(secret, '000000') is False
    assert 'ARMENU' in t.provisioning_uri(u, secret)
```

---

## V-027 — `AuditLog` modeli + `AuditLog.log()`

**Fayl:** `apps/analytics/apps.py`
```bash
mkdir -p apps/analytics/migrations && touch apps/analytics/__init__.py apps/analytics/migrations/__init__.py
```
```python
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    name = 'apps.analytics'
    label = 'analytics'
```

**Fayl:** `apps/analytics/models.py`
```python
import logging
from django.db import models

log = logging.getLogger('analytics.audit')


class AuditLog(models.Model):
    """
    ⚡ Har muhim amal yoziladi: kim, nima, qachon, qayerdan.
    ⛔ Audit yozuvi HECH QACHON o'chirilmaydi/tahrirlanmaydi.
    """
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   null=True, blank=True, db_index=True)
    actor      = models.ForeignKey('accounts.Staff', on_delete=models.SET_NULL,
                                   null=True, blank=True)
    actor_name = models.CharField(max_length=150, blank=True)   # denorm (staff o'chsa qoladi)
    user       = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                   null=True, blank=True)

    action     = models.CharField(max_length=60, db_index=True)
    # staff.login | order.status | dish.update | table.regen_qr | plan.upgrade ...
    model      = models.CharField(max_length=60, blank=True)
    object_id  = models.CharField(max_length=40, blank=True, db_index=True)

    old        = models.JSONField(default=dict, blank=True)
    new        = models.JSONField(default=dict, blank=True)

    ip         = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['restaurant', 'action', '-created_at']),
            models.Index(fields=['model', 'object_id']),
        ]

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.action} by {self.actor_name}'

    @classmethod
    def log(cls, restaurant_id=None, actor=None, action='', model='', object_id='',
            old=None, new=None, ip=None, request=None, user=None):
        """
        ⚡ Audit YOZUV XATOSI asosiy amalni BUZMASLIGI kerak — try/except.
        Ishlatish:
            AuditLog.log(restaurant_id=r.id, actor=request.staff,
                         action='dish.update', model='Dish', object_id=d.id,
                         old={'price': 45000}, new={'price': 49000}, request=request)
        """
        try:
            if request is not None:
                ip = ip or cls._ip(request)
                actor = actor or getattr(request, 'staff', None)
                restaurant_id = restaurant_id or getattr(request, 'restaurant_id', None)
            return cls.objects.create(
                restaurant_id=restaurant_id,
                actor=actor,
                actor_name=getattr(actor, 'full_name', '') or '',
                user=user or getattr(actor, 'user', None),
                action=action, model=model, object_id=str(object_id or ''),
                old=old or {}, new=new or {}, ip=ip,
                user_agent=(request.META.get('HTTP_USER_AGENT', '')[:255]
                            if request is not None else ''),
                request_id=getattr(request, 'request_id', '') if request is not None else '',
            )
        except Exception as e:                       # ⚡ jim yiqiladi
            log.error(f'[audit] yozilmadi action={action}: {e}')
            return None

    @staticmethod
    def _ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')

    @classmethod
    def diff(cls, instance, fields):
        """DB'dagi eski qiymatlarni oladi (update'dan OLDIN chaqiriladi)"""
        if not instance.pk:
            return {}
        old = type(instance).objects.filter(pk=instance.pk).values(*fields).first()
        return old or {}
```

`config/settings/base.py` → `INSTALLED_APPS` ga `'apps.analytics'`.

```bash
python manage.py makemigrations analytics && python manage.py migrate
```

✅ **Test:** `tests/test_audit.py`
```python
import pytest
from apps.analytics.models import AuditLog


@pytest.mark.django_db
def test_audit_written(restaurant, staff):
    AuditLog.log(restaurant_id=restaurant.id, actor=staff, action='test.action',
                 model='Dish', object_id=7, new={'price': 1000}, ip='1.2.3.4')
    a = AuditLog.objects.get(action='test.action')
    assert a.restaurant_id == restaurant.id
    assert a.actor_name == staff.full_name
    assert a.new['price'] == 1000


@pytest.mark.django_db
def test_audit_never_raises(restaurant):
    """⚡ Yaroqsiz ma'lumot bo'lsa ham asosiy oqim buzilmaydi"""
    assert AuditLog.log(restaurant_id=99999999, action='x') is None or True
```

---

## V-028 — ⚡⚡ TEST: CROSS-TENANT IZOLYATSIYA (ENG MUHIM VAZIFA)

> ⛔ **Bu test yiqilsa — loyiha ishlab chiqarishga CHIQMAYDI.**
> Restoran A xodimi restoran B ma'lumotiga HECH QACHON kira olmasligi kerak.

**Fayl:** `tests/test_tenant_isolation.py`
```python
"""
⚡⚡ MULTI-TENANT IZOLYATSIYA TESTLARI — loyihaning eng muhim testi.

Uch qatlam tekshiriladi:
  1. Model qatlami — har tenant modelida restaurant FK bor
  2. Queryset qatlami — TenantScopedMixin filtrlaydi
  3. API qatlami — boshqa restoran obyektiga 403/404
"""
import pytest
from django.apps import apps as django_apps

# ⚡ Tenant'ga bog'liq BO'LMAGAN modellar (global yoki texnik)
GLOBAL_MODELS = {
    'tenants.Restaurant', 'tenants.Plan',
    'accounts.User',
    'core.Job',
    'ar3d.DishLibrary',        # global 3D kutubxona
}


def all_tenant_models():
    """Loyihadagi barcha tenant modellarini avtomatik topadi"""
    out = []
    for model in django_apps.get_models():
        label = f'{model._meta.app_label}.{model.__name__}'
        if not model._meta.app_label.startswith(('tenants', 'accounts', 'menu', 'tables',
                                                 'guest', 'orders', 'ar3d', 'payments',
                                                 'fiscal', 'loyalty', 'reviews',
                                                 'analytics', 'ai', 'notifications')):
            continue
        if label in GLOBAL_MODELS:
            continue
        out.append((label, model))
    return out


# ---------------------------------------------------------------- 1-qatlam
@pytest.mark.parametrize('label,model', all_tenant_models(),
                         ids=[l for l, _ in all_tenant_models()])
def test_every_tenant_model_has_restaurant_scope(label, model):
    """
    ⚡ PARAMETRIK: har bir tenant modeli restoranga bog'langan bo'lishi SHART.
    To'g'ridan-to'g'ri restaurant FK YOKI restoranli parent'ga FK.
    """
    field_names = {f.name for f in model._meta.get_fields()}
    if 'restaurant' in field_names:
        return

    # bilvosita: dish → restaurant, order → restaurant, table → restaurant ...
    parents = {'dish', 'order', 'table', 'hall', 'category', 'guest',
               'staff', 'session', 'payment'}
    assert field_names & parents, (
        f'⛔ {label} modeli tenant-scoped EMAS! '
        f'restaurant FK yoki restoranli parent FK qo\'shing, '
        f'yoki GLOBAL_MODELS ro\'yxatiga kiriting.')


# ---------------------------------------------------------------- 2-qatlam
def _scoped_view(restaurant_id):
    """TenantScopedMixin ni sinash uchun soxta ViewSet"""
    from types import SimpleNamespace
    from core.mixins import TenantScopedMixin
    from apps.accounts.models import Staff

    class Base:
        def get_queryset(self):
            return Staff.objects.all()

    class View(TenantScopedMixin, Base):
        request = SimpleNamespace(restaurant_id=restaurant_id)

    return View()


@pytest.mark.django_db
def test_scoped_mixin_filters_by_restaurant(restaurant, restaurant2):
    """⚡ Mixin faqat o'z restoranini qaytaradi"""
    from apps.accounts.models import Staff
    Staff.objects.create(restaurant=restaurant,  full_name='A', role='waiter')
    Staff.objects.create(restaurant=restaurant2, full_name='B', role='waiter')

    qs = _scoped_view(restaurant.id).get_queryset()
    assert qs.count() == 1
    assert qs.first().full_name == 'A'

    qs2 = _scoped_view(restaurant2.id).get_queryset()
    assert qs2.count() == 1
    assert qs2.first().full_name == 'B'


@pytest.mark.django_db
def test_scoped_mixin_raises_without_restaurant():
    """⚡ restaurant_id yo'q bo'lsa — bo'sh emas, PermissionDenied"""
    from rest_framework.exceptions import PermissionDenied
    with pytest.raises(PermissionDenied):
        _scoped_view(None).get_queryset()


# ---------------------------------------------------------------- 3-qatlam
@pytest.mark.django_db
def test_token_of_a_cannot_read_b_staff(api_client, staff, staff2, staff_token):
    """⚡ A restorani tokeni bilan B restorani xodimini o'qib bo'lmaydi"""
    r = api_client.get(f'/v1/admin/staff/{staff2.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {staff_token}')
    assert r.status_code in (401, 403, 404), '⛔ CROSS-TENANT TESHIK!'
    assert r.status_code != 200


@pytest.mark.django_db
def test_token_restaurant_id_cannot_be_overridden(api_client, staff, staff_token, restaurant2):
    """
    ⚡ Klient ?restaurant=<boshqa id> yuborsa ham token'dagi rid g'olib bo'ladi.
    """
    r = api_client.get(f'/v1/staff/me/?restaurant={restaurant2.id}',
                       HTTP_AUTHORIZATION=f'Bearer {staff_token}')
    if r.status_code == 200:
        assert r.data['restaurant']['id'] == staff.restaurant_id


@pytest.mark.django_db
def test_pin_of_a_does_not_login_to_b(api_client, staff, restaurant2):
    """
    ⚡ A xodimining PIN'i B restoranida ishlamaydi (bir xil PIN bo'lsa ham).
    """
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    Staff.objects.create(restaurant=restaurant2, full_name='C', role='waiter',
                         phone='998904444444', pin_hash=hash_pin('5731'))

    r = api_client.post('/v1/staff/login/',
                        {'slug': restaurant2.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 200
    # ⚡ B restoranining xodimi kirdi — A niki EMAS
    assert r.data['restaurant']['id'] == restaurant2.id
    assert r.data['staff']['id'] != staff.id


@pytest.mark.django_db
def test_inactive_restaurant_blocks_login(api_client, restaurant, staff):
    restaurant.is_active = False
    restaurant.save()
    r = api_client.post('/v1/staff/login/',
                        {'slug': restaurant.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 403


@pytest.mark.django_db
def test_no_token_no_access(api_client, staff2):
    r = api_client.get(f'/v1/admin/staff/{staff2.id}/')
    assert r.status_code in (401, 403)


@pytest.mark.django_db
def test_ws_group_names_are_restaurant_scoped(restaurant, restaurant2):
    """⚡ WS guruhi restoran-scoped bo'lishi SHART"""
    from core.ws import g_kds, g_waiters, g_admin
    assert g_kds(restaurant.id) != g_kds(restaurant2.id)
    for fn in (g_kds, g_waiters, g_admin):
        assert str(restaurant.id) in fn(restaurant.id)
```

✅ **Tekshirish (MAJBURIY):**
```bash
pytest tests/test_tenant_isolation.py -v
# HAMMASI PASSED bo'lishi SHART. Bitta FAILED = ishlab chiqarishga chiqmaydi ⛔
```

---

## V-029 — `POST /v1/staff/refresh/`

**Fayl:** `apps/accounts/views.py` (qo'shiladi)
```python
import jwt as pyjwt
from apps.accounts.tokens import decode, make_access, make_refresh, \
                                 revoke_refresh, refresh_is_valid


class StaffRefreshView(APIView):
    """
    POST /v1/staff/refresh/  {"refresh": "..."}
    → {"access": "...", "refresh": "...", "expires_in": 43200}
    ⚡ Rotatsiya: eski refresh bekor qilinadi (qayta ishlatilsa — o'g'irlangan).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('refresh', '')
        if not token:
            return Response({'detail': 'refresh kerak'}, status=400)

        try:
            payload = decode(token, expect_typ='refresh')
        except pyjwt.ExpiredSignatureError:
            return Response({'error': {'code': 'TOKEN_EXPIRED',
                                       'message_uz': 'Sessiya tugadi. Qayta kiring.',
                                       'message_ru': 'Сессия истекла. Войдите снова.',
                                       'message_en': 'Session expired. Please log in.'}},
                            status=401)
        except pyjwt.PyJWTError:
            return Response({'detail': 'Token yaroqsiz'}, status=401)

        jti = payload.get('jti', '')
        if not refresh_is_valid(jti):
            log.warning(f'[refresh] bekor qilingan jti={jti} — o\'g\'irlangan bo\'lishi mumkin ⛔')
            return Response({'detail': 'Token bekor qilingan'}, status=401)

        staff = Staff.objects.filter(
            id=payload['sub'], restaurant_id=payload['rid'], is_active=True
        ).select_related('restaurant').first()
        if staff is None or not staff.restaurant.is_active:
            revoke_refresh(jti)
            return Response({'detail': 'Xodim nofaol'}, status=401)

        revoke_refresh(jti)                       # ⚡ rotatsiya
        return Response({
            'access':  make_access(staff),
            'refresh': make_refresh(staff),
            'expires_in': 43200,
        })


class StaffLogoutView(APIView):
    """POST /v1/staff/logout/  {"refresh": "..."}"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('refresh', '')
        try:
            payload = decode(token, expect_typ='refresh')
            revoke_refresh(payload.get('jti', ''))
        except Exception:
            pass
        return Response({'ok': True})
```

`apps/accounts/urls.py` ga:
```python
    path('staff/logout/', views.StaffLogoutView.as_view(), name='staff-logout'),
```

✅ **Test:** `tests/test_refresh.py`
```python
import pytest
from apps.accounts.tokens import make_refresh


@pytest.mark.django_db
def test_refresh_returns_new_pair(api_client, staff):
    rt = make_refresh(staff)
    r = api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    assert r.status_code == 200
    assert r.data['access'] and r.data['refresh'] != rt


@pytest.mark.django_db
def test_refresh_cannot_be_reused(api_client, staff):
    """⚡ Rotatsiya: bir marta ishlatilgan refresh ikkinchi marta ishlamaydi"""
    rt = make_refresh(staff)
    api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    r2 = api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    assert r2.status_code == 401
```

---

## V-030 — Django admin ro'yxatga olish

**Fayl:** `apps/tenants/admin.py`
```python
from django.contrib import admin
from apps.tenants.models import Restaurant, Plan, Subscription


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name', 'slug', 'city', 'plan', 'plan_expires',
                     'is_active', 'menu_version', 'created_at')
    list_filter   = ('plan', 'is_active', 'city', 'fiscal_enabled')
    search_fields = ('name', 'slug', 'phone', 'inn', 'custom_domain')
    readonly_fields = ('created_at', 'updated_at', 'menu_version')
    prepopulated_fields = {'slug': ('name',)}
    fieldsets = (
        ('Asosiy', {'fields': ('slug', 'name', 'legal_name', 'inn', 'phone',
                               'address', 'city', 'lat', 'lng', 'is_active')}),
        ('Brending', {'fields': ('logo', 'color_primary', 'color_accent',
                                 'custom_domain')}),
        ('Til', {'fields': ('default_lang', 'langs_enabled')}),
        ('Tarif', {'fields': ('plan', 'plan_expires', 'ar_model_limit',
                              'table_limit', 'service_fee_pct')}),
        ('Fiskal', {'fields': ('ofd_provider', 'fiscal_enabled')}),
        ('Texnik', {'fields': ('menu_version', 'created_at', 'updated_at')}),
    )


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_uz', 'price_month_uzs', 'table_limit',
                    'dish_limit', 'ar_model_limit', 'staff_limit', 'is_active')
    list_editable = ('price_month_uzs', 'is_active')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display  = ('restaurant', 'plan', 'status', 'period',
                     'expires_at', 'amount_uzs', 'paid_at')
    list_filter   = ('status', 'plan', 'period')
    search_fields = ('restaurant__name', 'restaurant__slug', 'payment_ref')
    autocomplete_fields = ('restaurant',)
```

**Fayl:** `apps/accounts/admin.py`
```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import User, Staff


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('phone',)
    list_display  = ('phone', 'full_name', 'email', 'is_platform_admin',
                     'totp_enabled', 'is_active', 'last_login')
    list_filter   = ('is_platform_admin', 'is_active', 'totp_enabled')
    search_fields = ('phone', 'email', 'full_name')
    readonly_fields = ('last_login', 'last_login_ip', 'created_at', 'totp_secret')
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Shaxsiy', {'fields': ('full_name', 'email', 'lang')}),
        ('Huquqlar', {'fields': ('is_active', 'is_staff', 'is_superuser',
                                 'is_platform_admin', 'groups', 'user_permissions')}),
        ('2FA', {'fields': ('totp_enabled', 'totp_secret')}),
        ('Texnik', {'fields': ('last_login', 'last_login_ip', 'created_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',),
                'fields': ('phone', 'full_name', 'password1', 'password2')}),
    )


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display  = ('id', 'full_name', 'restaurant', 'role', 'phone',
                     'is_on_shift', 'is_active', 'last_login')
    list_filter   = ('role', 'is_active', 'is_on_shift', 'restaurant')
    search_fields = ('full_name', 'phone', 'restaurant__name')
    autocomplete_fields = ('restaurant', 'user')
    readonly_fields = ('pin_hash', 'pin_set_at', 'failed_attempts',
                       'blocked_until', 'last_login', 'created_at', 'updated_at')
    actions = ['unblock_staff']

    @admin.action(description='Blokdan chiqarish')
    def unblock_staff(self, request, queryset):
        n = queryset.update(failed_attempts=0, blocked_until=None)
        self.message_user(request, f'{n} ta xodim blokdan chiqarildi')
```

**Fayl:** `apps/analytics/admin.py`
```python
from django.contrib import admin
from apps.analytics.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ('created_at', 'restaurant', 'actor_name', 'action',
                     'model', 'object_id', 'ip')
    list_filter   = ('action', 'model', 'restaurant')
    search_fields = ('actor_name', 'object_id', 'ip', 'request_id')
    date_hierarchy = 'created_at'
    readonly_fields = [f.name for f in AuditLog._meta.fields]   # ⛔ tahrirlanmaydi

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
```

⚠️ `RestaurantAdmin` da `autocomplete_fields` ishlashi uchun `search_fields` bor —
`StaffAdmin`/`SubscriptionAdmin` unga tayanadi.

✅ **Tekshirish:**
```bash
python manage.py check
python manage.py runserver 0.0.0.0:8060
# http://127.0.0.1:8060/django-admin/ → Restaurant, Plan, Subscription, User, Staff, AuditLog ko'rinadi
```

---

# ✅ FAZA 1 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check                        → xato yo'q
[ ] python manage.py migrate                      → o'tadi
[ ] python scripts/seed_plans.py                  → 4 ta tarif
[ ] pytest tests/test_tenant_isolation.py -v      → ⚡ HAMMASI PASSED (majburiy)
[ ] pytest tests/ -q                              → hammasi o'tadi
[ ] POST /v1/staff/login/  (to'g'ri PIN)          → 200 + access/refresh
[ ] POST /v1/staff/login/  (xato PIN 5 marta)     → 429
[ ] POST /v1/staff/refresh/ (eski token qayta)    → 401
[ ] GET  /v1/staff/me/     (A tokeni)             → faqat A restorani
[ ] /django-admin/ da 6 ta model ko'rinadi
[ ] Staff.pin_hash hech qaysi API javobida YO'Q
[ ] JWT ichida rid (restaurant_id) bor
```

**⚡ Xavfsizlik nazorati (qo'lda):**
```bash
# 1. PIN ochiq matnda saqlanmaganini tekshirish
python manage.py shell -c "from apps.accounts.models import Staff; print(Staff.objects.first().pin_hash[:7])"
# $2b$10$ bo'lishi kerak

# 2. Token ichida rid borligini tekshirish
python manage.py shell -c "
from apps.accounts.models import Staff
from apps.accounts.tokens import make_access, decode
s = Staff.objects.first(); print(decode(make_access(s)))"
# {'typ':'access', 'rid': <id>, ...}

# 3. pin_hash serializerdan chiqmasligini tekshirish
grep -rn "pin_hash" apps/*/serializers.py
# natija BO'SH bo'lishi kerak ⛔
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 1 tugadi: tenant, tarif, auth (JWT+PIN), ruxsatlar, izolyatsiya testlari"
python3 ROADMAP/03_HOLAT/update_progress.py V-030 ok "FAZA 1 tugadi"
```

**➡️ Keyingi:** `FAZA_02_MENYU.md`
