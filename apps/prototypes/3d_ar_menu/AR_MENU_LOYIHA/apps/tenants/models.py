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
    slug = models.SlugField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=255, blank=True)
    inn = models.CharField(max_length=20, blank=True)          # STIR
    phone = models.CharField(max_length=20)                      # 998XXXXXXXXX
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, db_index=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # --- Brending ---
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    color_primary = models.CharField(max_length=7, default='#E85D2A')
    color_accent = models.CharField(max_length=7, default='#1A1A2E')
    custom_domain = models.CharField(max_length=120, blank=True, db_index=True)

    # --- Til ---
    default_lang = models.CharField(max_length=2, choices=LANGS, default='uz')
    langs_enabled = ArrayField(models.CharField(max_length=2), default=default_langs)

    # --- Tarif ---
    plan = models.CharField(max_length=20, choices=PLANS, default='free', db_index=True)
    plan_expires = models.DateTimeField(null=True, blank=True)
    ar_model_limit = models.IntegerField(default=0)     # FREE=0, PRO=50
    table_limit = models.IntegerField(default=3)     # FREE=3, cheksiz=-1

    # --- Xizmat haqi ---
    service_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # --- Fiskal (OFD) ---
    ofd_provider = models.CharField(max_length=20, blank=True)   # uzkassa|epos|qpos
    ofd_config = models.JSONField(default=dict, blank=True)    # shifrlangan
    fiscal_enabled = models.BooleanField(default=False)

    # --- Holat ---
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ⚡ Kesh versiyasi (menyu invalidation uchun)
    menu_version = models.IntegerField(default=1)
    kds_token = models.UUIDField(default=__import__('uuid').uuid4, unique=True, db_index=True, null=True, blank=True)
    telegram_chat_id = models.CharField(max_length=64, blank=True, null=True, help_text="Telegram chat/group ID")

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


class Plan(models.Model):
    """Tarif jadvali — narx va limitlar bitta joyda (kodda emas ⚡)"""
    code = models.SlugField(max_length=20, unique=True)   # free|start|pro|enterprise
    name_uz = models.CharField(max_length=80)
    name_ru = models.CharField(max_length=80, blank=True)
    name_en = models.CharField(max_length=80, blank=True)

    price_month_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_year_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Limitlar (-1 = cheksiz) ⚡
    table_limit = models.IntegerField(default=3)
    dish_limit = models.IntegerField(default=30)
    ar_model_limit = models.IntegerField(default=0)
    staff_limit = models.IntegerField(default=3)
    ai_daily_usd = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    features = models.JSONField(default=dict, blank=True)
    # {"custom_domain": true, "fiscal": true, "analytics_pro": false}

    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

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
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE,
                                     related_name='subscriptions', db_index=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS, default='trial', db_index=True)
    period = models.CharField(max_length=10, default='month')   # month|year
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    amount_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_ref = models.CharField(max_length=120, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription'
        indexes = [
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        return f'{self.restaurant.slug} — {self.plan.code} ({self.status})'


# ⚡ Cache invalidation for Restaurant (V-039)
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache


@receiver([post_save, post_delete], sender=Restaurant)
def _restaurant_cache_clear(sender, instance, **kwargs):
    try:
        cache.delete(f'rest:slug:{instance.slug}')
        if instance.custom_domain:
            cache.delete(f'rest:domain:{instance.custom_domain}')
    except Exception:
        pass
