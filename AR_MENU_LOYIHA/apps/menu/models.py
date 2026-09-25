from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from core.models import TenantModel


class Category(TenantModel):
    """⚡ TenantModel → restaurant FK + created_at/updated_at avtomatik"""
    name_uz = models.CharField(max_length=120)
    name_ru = models.CharField(max_length=120, blank=True)
    name_en = models.CharField(max_length=120, blank=True)

    icon = models.CharField(max_length=40, blank=True)     # emoji yoki ikonka kodi
    image = models.ImageField(upload_to='cat/', null=True, blank=True)
    image_webp = models.CharField(max_length=255, blank=True)

    order = models.IntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_category'
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'is_active', 'order']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['restaurant', 'name_uz'],
                                    name='uniq_category_name_per_restaurant'),
        ]

    def __str__(self):
        return f'{self.name_uz} (rest#{self.restaurant_id})'


ALLERGENS = ['nuts', 'gluten', 'dairy', 'eggs', 'fish', 'shellfish',
             'soy', 'sesame', 'celery', 'mustard']
DIET_TAGS = ['halal', 'vegetarian', 'vegan', 'spicy', 'no_spicy',
             'lactose_free', 'gluten_free', 'low_cal']


class Dish(TenantModel):
    """
    ⚡ restaurant FK — TenantModel dan (denormalizatsiya: category orqali ham
    olish mumkin edi, lekin har so'rovda JOIN bo'lmasligi uchun to'g'ridan-to'g'ri).
    """
    category = models.ForeignKey(Category, on_delete=models.CASCADE,
                                 related_name='dishes')

    name_uz = models.CharField(max_length=200)
    name_ru = models.CharField(max_length=200, blank=True)
    name_en = models.CharField(max_length=200, blank=True)
    desc_uz = models.TextField(blank=True)
    desc_ru = models.TextField(blank=True)
    desc_en = models.TextField(blank=True)

    # Tarjima holati (AI tarjima qilganmi / admin tasdiqladimi)
    tr_auto = models.JSONField(default=dict, blank=True)   # {"ru":true,"en":false}
    tr_approved = models.JSONField(default=dict, blank=True)

    price = models.DecimalField(max_digits=12, decimal_places=2)
    old_price = models.DecimalField(max_digits=12, decimal_places=2,
                                    null=True, blank=True)

    image = models.ImageField(upload_to='dish/', null=True, blank=True)
    image_webp = models.CharField(max_length=255, blank=True)   # 800px
    image_md = models.CharField(max_length=255, blank=True)   # 400px
    image_sm = models.CharField(max_length=255, blank=True)   # 200px
    image_blur = models.CharField(max_length=120, blank=True)   # LQIP base64

    weight_g = models.IntegerField(null=True, blank=True)
    cook_min = models.SmallIntegerField(default=15)
    calories = models.IntegerField(null=True, blank=True)

    ingredients_uz = models.TextField(blank=True)
    ingredients_ru = models.TextField(blank=True)
    ingredients_en = models.TextField(blank=True)

    allergens = ArrayField(models.CharField(max_length=30), default=list, blank=True)
    diet_tags = ArrayField(models.CharField(max_length=30), default=list, blank=True)

    ikpu_code = models.CharField(max_length=30, blank=True, db_index=True)  # ⚡ SOLIQ
    package_code = models.CharField(max_length=30, blank=True)

    is_available = models.BooleanField(default=True, db_index=True)   # stop-list
    stop_until = models.DateTimeField(null=True, blank=True)        # avtomatik qaytish
    is_hit = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    order = models.IntegerField(default=0, db_index=True)

    # ⚡ Denormalizatsiya (tez o'qish uchun)
    has_3d = models.BooleanField(default=False, db_index=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_cnt = models.IntegerField(default=0)
    sold_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'menu_dish'
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'is_available', 'order']),
            models.Index(fields=['category', 'order']),
            models.Index(fields=['restaurant', 'has_3d']),
            GinIndex(fields=['diet_tags'], name='dish_diet_gin'),
            GinIndex(fields=['allergens'], name='dish_allergens_gin'),
        ]

    def __str__(self):
        return f'{self.name_uz} — {self.price}'

    def save(self, *args, **kwargs):
        # ⚡ Kategoriya bilan restoran mos kelishi SHART
        if self.category_id and not self.restaurant_id:
            self.restaurant_id = self.category.restaurant_id
        super().save(*args, **kwargs)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.category_id and self.restaurant_id:
            if self.category.restaurant_id != self.restaurant_id:
                raise ValidationError('⛔ Kategoriya boshqa restoranga tegishli')

    @property
    def has_discount(self) -> bool:
        return bool(self.old_price and self.old_price > self.price)


class DishModifier(TenantModel):
    """
    Taom qo'shimchasi: "Qo'shimcha go'sht +25000", "Achchiqsiz +0"
    group — bir guruhdan bittasini tanlash (radio) yoki bir nechta (checkbox)
    """
    GROUPS = [
        ('extra', 'Qo\'shimcha'),
        ('size', 'Hajm'),
        ('remove', 'Olib tashlash'),
        ('sauce', 'Sous'),
        ('cooking', 'Tayyorlash darajasi'),
    ]
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE,
                             related_name='modifiers')
    name_uz = models.CharField(max_length=120)
    name_ru = models.CharField(max_length=120, blank=True)
    name_en = models.CharField(max_length=120, blank=True)

    price_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    group = models.CharField(max_length=20, choices=GROUPS, default='extra')
    is_default = models.BooleanField(default=False)
    single_choice = models.BooleanField(default=False)   # guruhdan faqat bittasi
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_modifier'
        ordering = ['group', 'order', 'id']
        indexes = [
            models.Index(fields=['dish', 'is_active', 'order']),
            models.Index(fields=['restaurant', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name_uz} ({self.price_delta:+})'

    def save(self, *args, **kwargs):
        if self.dish_id and not self.restaurant_id:
            self.restaurant_id = self.dish.restaurant_id
        super().save(*args, **kwargs)


class UpsellRule(TenantModel):
    """
    ⚡ "Oshga achchiq-chuchuk salat?" — savatga qo'shilgan taomga
    bog'liq taklif. O'rtacha chek +12-18% oshiradi.
    """
    trigger_dishes = models.ManyToManyField(Dish, related_name='upsell_triggers',
                                            blank=True)
    trigger_category = models.ForeignKey(Category, null=True, blank=True,
                                         on_delete=models.CASCADE,
                                         related_name='upsell_triggers')
    suggest_dish = models.ForeignKey(Dish, on_delete=models.CASCADE,
                                     related_name='upsell_suggested')

    text_uz = models.CharField(max_length=200)
    text_ru = models.CharField(max_length=200, blank=True)
    text_en = models.CharField(max_length=200, blank=True)

    priority = models.SmallIntegerField(default=0)     # katta = oldin ko'rsatiladi
    max_per_order = models.SmallIntegerField(default=1)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Statistika (denorm)
    shown_count = models.IntegerField(default=0)
    accepted_count = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_upsell_rule'
        ordering = ['-priority', 'id']
        indexes = [models.Index(fields=['restaurant', 'is_active', '-priority'])]

    def __str__(self):
        return f'→ {self.suggest_dish.name_uz}'

    @property
    def accept_rate(self) -> float:
        return round(self.accepted_count * 100 / self.shown_count, 1) if self.shown_count else 0.0
