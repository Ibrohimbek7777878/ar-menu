from django.db import models
from backend.softdelete import SoftDeleteAllManager, SoftDeleteBehaviour, SoftDeleteManager


PRODUCT_DESIGN_TEMPLATES = [
    ('default', 'Standart (Universal)'),
    ('luxury', 'Luxury VIP (Qora & Oltin aksent)'),
    ('ar_hero', 'Interactive 3D / AR Hero (Dominant 3D & O\'lchamlar)'),
    ('reels', 'Story & Reels (Vertikal video & Lookbook)'),
    ('specs', 'Specs & Matrix (Texnik jadval & Parametrlar)'),
    ('clean', 'Clean & Quick Buy (1-klikda tezkor xarid)'),
]


class Product(SoftDeleteBehaviour, models.Model):
    objects = SoftDeleteManager()                 # o'chirilganlarni ko'rsatmaydi; delete() yozuvni yashiradi (backend/softdelete.py)
    all_objects = SoftDeleteAllManager()          # admin / tiklash / slug bandligini tekshirish uchun: hammasi
    soft_delete_extra = {'is_available': False}

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.PROTECT, related_name='products'
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, allow_unicode=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    old_price = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True
    )
    unit = models.CharField(max_length=20, default='dona')
    min_quantity = models.IntegerField(default=1)
    brand = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    country_of_origin = models.CharField(max_length=100, blank=True)
    weight = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    volume = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    pack_size = models.IntegerField(default=1)
    category = models.ForeignKey(
        'categories.Category', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='products'
    )
    subcategory = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to='products/')
    image2 = models.ImageField(upload_to='products/', null=True, blank=True)
    image3 = models.ImageField(upload_to='products/', null=True, blank=True)
    image4 = models.ImageField(upload_to='products/', null=True, blank=True)
    video = models.FileField('Video', upload_to='products/videos/', null=True, blank=True)
    ar_model = models.URLField('3D model (GLB)', blank=True, null=True,
                               help_text='AR uchun .glb model manzili (bo\'sh bo\'lsa demo model)')
    prep_minutes = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Tayyorlanish vaqti (daqiqada)"
    )
    has_real_photo = models.BooleanField(
        default=False, help_text="Haqiqiy rasm yuklanganda True"
    )
    is_available = models.BooleanField(default=True)
    stock = models.IntegerField(default=0)
    is_organic = models.BooleanField(default=False)
    is_halal = models.BooleanField(default=True)
    expiry_date = models.DateField(null=True, blank=True)
    calories = models.IntegerField(null=True, blank=True)
    protein = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    fat = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    carbs = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    ingredients = models.TextField(blank=True)
    tags = models.CharField(max_length=500, blank=True)
    barcode = models.CharField(max_length=50, blank=True)
    is_featured = models.BooleanField(default=False)
    rating = models.FloatField(default=0)
    reviews_count = models.IntegerField(default=0)
    views = models.IntegerField(default=0)
    rank_score = models.FloatField(default=0)

    # Dimensions (mm va grammlarda)
    width_mm = models.IntegerField(null=True, blank=True)
    height_mm = models.IntegerField(null=True, blank=True)
    depth_mm = models.IntegerField(null=True, blank=True)
    weight_g = models.IntegerField(null=True, blank=True)

    # Uzum/Yandex/Alibaba kabi variantlar (o'lcham, rang, vazn)
    variants = models.JSONField(default=list, blank=True, help_text='Variantlar: [{"name":"Rangi","options":["Qizil","Ko\'k"]}]')

    # Restaurant Dish kengaytma (AR_MENU dan) — shop bo'lsa bo'sh qoladi
    allergens = models.JSONField(default=list, blank=True, help_text='[nuts,gluten,dairy...]')
    diet_tags = models.JSONField(default=list, blank=True, help_text='[halal,vegetarian,vegan,spicy...]')
    cook_min = models.IntegerField(null=True, blank=True, default=15)
    ingredients_translated = models.JSONField(default=dict, blank=True, help_text='{"uz":..., "ru":...}')
    ikpu_code = models.CharField(max_length=30, blank=True, db_index=True, verbose_name='IKPU/MXIK')
    has_3d = models.BooleanField(default=False, db_index=True, verbose_name='3D/AR bor')
    is_hit = models.BooleanField(default=False, verbose_name='Hit')
    is_new = models.BooleanField(default=False, verbose_name='Yangi')
    # Flash aksiya (S5-1) — muddatli chegirma, countdown
    flash_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name='Flash narx')
    flash_until = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name='Flash tugash vaqti')

    # Shaxsiy tovar dizayni (Auto-Polisher) va 3D/AR konfiguratsiyasi
    PRODUCT_DESIGN_TEMPLATES = [
        ('default', 'Standart (Universal)'),
        ('luxury', 'Luxury VIP (Qora & Oltin aksent)'),
        ('ar_hero', 'Interactive 3D / AR Hero (Dominant 3D & O\'lchamlar)'),
        ('reels', 'Story & Reels (Vertikal video & Lookbook)'),
        ('specs', 'Specs & Matrix (Texnik jadval & Parametrlar)'),
        ('clean', 'Clean & Quick Buy (1-klikda tezkor xarid)'),
    ]
    design_template = models.CharField(
        max_length=30, choices=PRODUCT_DESIGN_TEMPLATES, default='default', db_index=True,
        verbose_name='Dizayn shabloni'
    )
    design_config = models.JSONField(
        default=dict, blank=True,
        verbose_name='Dizayn sozlamalari (rang, o\'lcham, nishonlar)'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # 4-QOIDA: Soft Delete (Hech narsa butunlay o'chirilmaydi)
    is_deleted = models.BooleanField(default=False, db_index=True, verbose_name="O'chirilgan (Soft delete)")
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'products'
        verbose_name = 'Mahsulot'
        verbose_name_plural = 'Mahsulotlar'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop', 'is_available', 'is_deleted'], name='prod_shop_av_idx'),
            models.Index(fields=['category', 'is_available', 'is_deleted'], name='prod_cat_av_idx'),
            models.Index(fields=['is_deleted', '-created_at'], name='prod_del_cr_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock__gte=0),
                name='product_stock_non_negative'
            ),
            models.CheckConstraint(condition=models.Q(price__gte=0), name='product_price_non_negative'),
        ]

    def __str__(self):
        return f'{self.name} — {self.shop.name}'

    SLUG_BASE_LENGTH = 40          # SlugField(50): "-N" qo'shimchasi sig'ishi uchun

    def save(self, *args, **kwargs):
        if not self.slug or self._state.adding:
            self.slug = self._unique_slug()
        super().save(*args, **kwargs)

    def _unique_slug(self):
        """
        Slug butun jadval bo'yicha noyob (URL'larda ishlatiladi). Ikkinchi "Plov" (boshqa restoranda ham) 500 bermaydi:
        "plov", "plov-2", ... O'chirilgan (yashirilgan) mahsulotlar ham band hisoblanadi — `all_objects`.
        50 belgidan uzun nom PostgreSQL'da DataError berardi (SQLite sezmaydi) — qirqiladi.
        """
        import uuid
        from django.utils.text import slugify
        taken = Product.all_objects.exclude(pk=self.pk) if self.pk else Product.all_objects.all()
        if self.slug and len(self.slug) <= 50 and not taken.filter(slug=self.slug).exists():
            return self.slug                       # aniq berilgan va bo'sh slug o'zgarmaydi
        base = (slugify(self.slug or self.name, allow_unicode=True) or 'taom')[:self.SLUG_BASE_LENGTH].strip('-') or 'taom'
        candidate = base
        for number in range(2, 12):
            if not taken.filter(slug=candidate).exists():
                return candidate
            candidate = f'{base}-{number}'
        return f'{base}-{uuid.uuid4().hex[:6]}'

    @property
    def has_discount(self):
        return self.old_price and self.old_price > self.price

    @property
    def discount_percent(self):
        if self.has_discount:
            return int((1 - self.price / self.old_price) * 100)
        return 0

    @property
    def image_url_or_default(self):
        if self.image:
            try:
                return self.image.url
            except Exception:
                pass
        return '/static/images/dish-placeholder.svg'

    @property
    def flash_active(self):
        from django.utils import timezone
        return bool(self.flash_price and self.flash_until and self.flash_until > timezone.now() and self.flash_price < self.price)

    @property
    def effective_price(self):
        return self.flash_price if self.flash_active else self.price

    @property
    def flash_seconds_left(self):
        from django.utils import timezone
        if not self.flash_active:
            return 0
        return max(0, int((self.flash_until - timezone.now()).total_seconds()))

    @property
    def tags_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()] if self.tags else []

    @property
    def width_cm(self):
        return (self.width_mm / 10) if self.width_mm is not None else None

    @property
    def height_cm(self):
        return (self.height_mm / 10) if self.height_mm is not None else None

    @property
    def depth_cm(self):
        return (self.depth_mm / 10) if self.depth_mm is not None else None

    def get_dimensions_display(self):
        parts = []
        if self.width_mm:
            parts.append(f"{self.width_mm / 10:g}")
        if self.height_mm:
            parts.append(f"{self.height_mm / 10:g}")
        if self.depth_mm:
            parts.append(f"{self.depth_mm / 10:g}")
        if parts:
            dim_str = " × ".join(parts) + " sm"
            if self.weight_g:
                dim_str += f" ({self.weight_g} g)"
            return dim_str
        elif self.weight_g:
            return f"{self.weight_g} g"
        return ""

    def get_clean_design_config(self):
        """Auto-Polisher: Tovar dizayn sozlamalarini xavfsiz va toza holatga keltiradi."""
        cfg = dict(self.design_config or {})
        template = self.design_template or 'default'

        if template == 'luxury':
            cfg.setdefault('bg_theme', 'dark')
            cfg.setdefault('accent_color', '#f59e0b')
            cfg.setdefault('badge_text', 'VIP TANLOV')
            cfg.setdefault('show_ruler', False)
        elif template == 'ar_hero':
            cfg.setdefault('bg_theme', 'light')
            cfg.setdefault('accent_color', '#7c3aed')
            cfg.setdefault('badge_text', 'INTERAKTIV 3D / AR')
            cfg.setdefault('show_ruler', True)
        elif template == 'reels':
            cfg.setdefault('bg_theme', 'dark')
            cfg.setdefault('accent_color', '#ec4899')
            cfg.setdefault('badge_text', 'TREND')
        elif template == 'specs':
            cfg.setdefault('bg_theme', 'light')
            cfg.setdefault('accent_color', '#2563eb')
            cfg.setdefault('show_specs_table', True)
        elif template == 'clean':
            cfg.setdefault('bg_theme', 'light')
            cfg.setdefault('accent_color', '#16a34a')
            cfg.setdefault('quick_buy', True)
        else:
            cfg.setdefault('bg_theme', 'light')
            cfg.setdefault('accent_color', '#16a34a')

        is_dark = cfg.get('bg_theme') == 'dark'
        cfg['text_color'] = '#ffffff' if is_dark else '#0f172a'
        cfg['subtext_color'] = '#94a3b8' if is_dark else '#64748b'
        cfg['card_bg'] = 'rgba(30, 41, 59, 0.75)' if is_dark else '#ffffff'
        cfg['card_border'] = 'rgba(255, 255, 255, 0.1)' if is_dark else '#e2e8f0'

        return cfg



class ProductBundle(models.Model):
    """To'plam/Bundle — 2+ mahsulot bir narxda (S5-3). Shop do'koniga tegishli, S5-3 countdownsiz, lekin foydali."""
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='bundles')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, allow_unicode=True)
    products = models.ManyToManyField(Product, related_name='bundles')
    bundle_price = models.DecimalField(max_digits=12, decimal_places=0)
    original_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_bundles'
        verbose_name = 'To\'plam'
        verbose_name_plural = 'To\'plamlar'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.bundle_price} so'm"

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid as _uuid
            self.slug = slugify(self.name, allow_unicode=True) + '-' + str(_uuid.uuid4())[:6]
        if self.original_price is None:
            try:
                self.original_price = sum(p.effective_price if getattr(p, 'flash_active', False) else p.price for p in self.products.all())
            except Exception:
                pass
        super().save(*args, **kwargs)

    @property
    def discount_percent(self):
        if self.original_price and self.original_price > self.bundle_price:
            return int((1 - self.bundle_price / self.original_price) * 100)
        return 0


class ThreeDAsset(models.Model):
    AR_MODE_CHOICES = [
        ('scene-viewer', 'Scene Viewer (Android)'),
        ('quick-look', 'Quick Look (iOS)'),
        ('webxr', 'WebXR'),
        ('fallback', 'Fallback (Desktop)'),
    ]

    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name='asset_3d',
        verbose_name='Mahsulot'
    )
    glb_file = models.FileField(
        upload_to='3d/glb/', blank=True, null=True,
        verbose_name='GLB fayl (Android/Web)'
    )
    usdz_file = models.FileField(
        upload_to='3d/usdz/', blank=True, null=True,
        verbose_name='USDZ fayl (iOS)'
    )
    poster_image = models.ImageField(
        upload_to='3d/posters/', blank=True, null=True,
        verbose_name='Poster rasm'
    )
    alt_text = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='AR tavsifi'
    )
    ar_scale = models.CharField(
        max_length=20, default='auto',
        choices=[('auto', 'Avtomatik'), ('fixed', 'O\'lchamli')],
        verbose_name='Masshtab'
    )
    camera_orbit = models.CharField(
        max_length=100, default='auto auto 2.5m',
        verbose_name='Kamera pozitsiyasi'
    )
    min_camera_orbit = models.CharField(
        max_length=100, default='auto auto 1.5m',
        verbose_name='Minimal kamera'
    )
    max_camera_orbit = models.CharField(
        max_length=100, default='auto auto 4m',
        verbose_name='Maksimal kamera'
    )
    environment_image = models.CharField(
        max_length=200, default='neutral',
        verbose_name='Muhit'
    )
    shadow_intensity = models.IntegerField(default=1, verbose_name='Soya intensivligi')
    shadow_softness = models.IntegerField(default=1, verbose_name='Soya yumshoqligi')
    auto_rotate = models.BooleanField(default=True, verbose_name='Avtomatik aylantirish')
    loop = models.BooleanField(default=True, verbose_name='Takrorlash')
    ar_enabled = models.BooleanField(default=True, verbose_name='AR yoqilgan')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_3d_assets'
        verbose_name = '3D Asset'
        verbose_name_plural = '3D Assetlar'

    def __str__(self):
        return f'3D: {self.product.name}'

    @property
    def has_glb(self):
        return bool(self.glb_file)

    @property
    def has_usdz(self):
        return bool(self.usdz_file)


class WishlistItem(models.Model):
    """Xaridorning sevimli mahsulotlari (raqobatchilardan olingan: Uzum/Olcha wishlist)."""
    customer = models.ForeignKey(
        'accounts.Customer', on_delete=models.CASCADE, related_name='wishlist'
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='wishlisted_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wishlist_items'
        verbose_name = 'Sevimli mahsulot'
        verbose_name_plural = 'Sevimli mahsulotlar'
        unique_together = ('customer', 'product')

    def __str__(self):
        return f'{self.customer.name} → {self.product.name}'


class AgroMasterProduct(models.Model):
    """Oziq-ovqat va dehqonchilik standart mahsulotlar master bazasi."""
    SECTOR_CHOICES = [
        ('vegetable', 'Sabzavotlar'),
        ('fruit', 'Mevalar va Poliz'),
        ('meat', "Go'sht va Parranda"),
        ('dairy', 'Sut va Qatiq mahsulotlari'),
        ('grain', 'Don va Dukkaklilar'),
        ('grocery', 'Qadoqlangan Oziq-ovqat / Baqqollik'),
        ('bakery', 'Non va Non mahsulotlari'),
        ('drinks', 'Ichimliklar'),
    ]

    UNIT_CHOICES = [
        ('kg', 'Kilogramm (kg)'),
        ('g', 'Gramm (g)'),
        ('dona', 'Dona'),
        ('litr', 'Litr (l)'),
        ('bog', "Bog' (ko'katlar)"),
        ('qop', 'Qop (50 kg)'),
        ('yashik', 'Yashik'),
    ]

    name = models.CharField(max_length=255, db_index=True)
    name_uz = models.CharField(max_length=255, blank=True)
    name_ru = models.CharField(max_length=255, blank=True)
    sector = models.CharField(max_length=30, choices=SECTOR_CHOICES, db_index=True)
    category = models.ForeignKey('categories.Category', on_delete=models.SET_NULL, null=True, blank=True)
    barcode = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    ikpu_code = models.CharField(max_length=64, blank=True, help_text="Soliq MXIK kodi")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='kg')
    default_market_price = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    image = models.ImageField(upload_to='master_agro/', null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    is_seasonal = models.BooleanField(default=False, help_text="Mavsumiy tovar")
    is_organic = models.BooleanField(default=True, help_text="Tabiiy dehqonchilik mahsuloti")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agro_master_products'
        verbose_name = 'Agro Master Mahsulot'
        verbose_name_plural = 'Agro Master Mahsulotlar'
        indexes = [
            models.Index(fields=['sector']),
            models.Index(fields=['name']),
            models.Index(fields=['barcode']),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_sector_display()})'


class AgroStarterPack(models.Model):
    """Oziq-ovqat va Dehqon Bozori to'plami (Sabzavot TOP-30, Mevalar TOP-25, Go'sht TOP-15...)."""
    name = models.CharField(max_length=150)
    sector = models.CharField(max_length=30, db_index=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='eco')
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'agro_starter_packs'
        verbose_name = 'Agro Boshlang\'ich To\'plam'
        verbose_name_plural = 'Agro Boshlang\'ich To\'plamlar'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.name


class AgroStarterPackItem(models.Model):
    pack = models.ForeignKey(AgroStarterPack, on_delete=models.CASCADE, related_name='items')
    master_product = models.ForeignKey(AgroMasterProduct, on_delete=models.CASCADE)
    suggested_price = models.DecimalField(max_digits=12, decimal_places=0)
    default_stock = models.DecimalField(max_digits=10, decimal_places=2, default=50.0)

    class Meta:
        db_table = 'agro_starter_pack_items'
        unique_together = [('pack', 'master_product')]

    def __str__(self):
        return f'{self.pack.name} → {self.master_product.name}'

