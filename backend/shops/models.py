from django.db import models

SHOP_SECTION_TYPES = [
    ('hero', 'Hero (sarlavha + rasm)'),
    ('product_grid', 'Mahsulotlar gridi'),
    ('category_strip', 'Kategoriya lentasi'),
    ('banner', 'Banner'),
    ('map', 'Xarita / Manzil'),
    ('reviews', 'Sharhlar'),
    ('cta', 'Chaqiriq (CTA)'),
    ('richtext', 'Matn'),
    ('ar_showcase', "AR ko'rgazma"),
]

TEMPLATE_CATEGORIES = [
    ('minimal', 'Minimal'),
    ('modern', 'Modern'),
    ('classic', 'Classic'),
    ('bold', 'Bold / Jurratli'),
    ('elegant', 'Elegant'),
    ('minimalist', 'Minimalist'),
    ('creative', 'Creative'),
    ('corporate', 'Corporate'),
    ('fashion', 'Fashion'),
    ('food', 'Food'),
    ('electronics', 'Electronics'),
    ('grocery', 'Grocery'),
    ('pharmacy', 'Pharmacy'),
    ('beauty', "Go'zallik"),
    ('sports', 'Sports'),
    ('home', 'Home'),
    ('automotive', 'Automotive'),
    ('books', 'Books'),
    ('kids', 'Kids'),
    ('pets', 'Pets'),
]


class ShopTemplate(models.Model):
    """Tayyor do'kon shablonlari - 60+ ta (Figma preview)."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, allow_unicode=True)
    category = models.CharField(max_length=20, choices=TEMPLATE_CATEGORIES)
    preview_image = models.ImageField(upload_to='templates/previews/', null=True, blank=True)
    preview_mobile = models.ImageField(upload_to='templates/previews/mobile/', null=True, blank=True)
    preview_desktop = models.ImageField(upload_to='templates/previews/desktop/', null=True, blank=True)
    default_layout = models.JSONField(default=list, blank=True)
    default_colors = models.JSONField(default=dict, blank=True)
    default_fonts = models.JSONField(default=dict, blank=True)
    available_sections = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    required_plan = models.CharField(max_length=20, choices=[('basic', 'Basic'), ('pro', 'Pro'), ('business', 'Business')], default='basic')
    is_active = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    # Foydalanuvchining "Saqlash va o'rnatish" bilan yaratgan shablonlari
    is_custom = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        'accounts.AdminUser', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='custom_templates'
    )
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_templates'
        verbose_name = "Do'kon shabloni"
        verbose_name_plural = "Do'kon shablonlari"
        ordering = ['category', 'sort_order', 'name']

    def __str__(self):
        return self.name

    def get_preview_url(self, device='desktop'):
        if device == 'mobile' and self.preview_mobile:
            return self.preview_mobile.url
        if device == 'desktop' and self.preview_desktop:
            return self.preview_desktop.url
        if self.preview_image:
            return self.preview_image.url
        return None

    def get_default_layout(self):
        if self.default_layout:
            return self.default_layout
        return [
            {'type': 'hero', 'title': '', 'subtitle': '', 'image': '', 'cta_text': "Katalogga o'tish", 'cta_link': '/catalog/'},
            {'type': 'category_strip', 'title': 'Kategoriyalar', 'subtitle': ''},
            {'type': 'product_grid', 'title': 'Mahsulotlar', 'subtitle': '', 'product_filter': '', 'limit': 12},
            {'type': 'map', 'title': 'Manzil', 'subtitle': ''},
            {'type': 'reviews', 'title': 'Sharhlar', 'subtitle': ''},
        ]

    def get_default_colors(self):
        if self.default_colors:
            return self.default_colors
        return {
            'primary': '#16a34a', 'secondary': '#22c55e', 'accent': '#f59e0b',
            'background': '#ffffff', 'surface': '#f8fafc',
            'text_primary': '#1a1a1a', 'text_secondary': '#666666',
        }

    def get_default_fonts(self):
        if self.default_fonts:
            return self.default_fonts
        return {'heading': 'Inter', 'body': 'Inter'}


class Shop(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, allow_unicode=True)
    description = models.TextField(blank=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    phone2 = models.CharField(max_length=20, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    category = models.ForeignKey('categories.Category', on_delete=models.SET_NULL, null=True, blank=True)
    image = models.ImageField(upload_to='shops/')
    banner = models.ImageField(upload_to='shops/banners/', null=True, blank=True)
    working_hours = models.CharField(max_length=50, default='08:00-22:00')
    working_days = models.CharField(max_length=50, default='Dush-Shan')
    is_open = models.BooleanField(default=True)
    rating = models.FloatField(default=0)
    reviews_count = models.IntegerField(default=0)
    views = models.IntegerField(default=0)
    rank_score = models.FloatField(default=0)
    min_order = models.IntegerField(default=20000)
    delivery_fee = models.IntegerField(default=6000)
    free_delivery_from = models.IntegerField(default=50000)
    owner = models.ForeignKey('accounts.AdminUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_shops')
    is_featured = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_fast_delivery = models.BooleanField(default=False, verbose_name="Tezkor yetkazib berish (30 daqiqa)")
    STORE_CLUSTERS = {
        'retail': {
            'name': "Chakana Savdo & Moda",
            'icon': '🛍️',
            'types': ['shop', 'clothing', 'shoes', 'beauty', 'jewelry', 'kids', 'sport'],
        },
        'food': {
            'name': "Oziq-ovqat & HoReCa",
            'icon': '🍔',
            'types': ['restaurant', 'cafe', 'fastfood', 'bar', 'bakery', 'coffee'],
        },
        'fresh_agro': {
            'name': "Dehqon Bozori & Agro",
            'icon': '🚜',
            'types': ['fresh_produce', 'meat_butcher', 'dairy', 'honey_nuts', 'agro_seeds'],
        },
        'tech_hardware': {
            'name': "Texnika, Avto & Qurilish",
            'icon': '📱',
            'types': ['electronics', 'appliances', 'auto', 'construction', 'furniture'],
        },
        'services_rent': {
            'name': "Salomatlik, Xizmatlar & Ijara",
            'icon': '🩺',
            'types': ['pharmacy', 'optics', 'flowers', 'books', 'rental_prokat'],
        },
    }

    STORE_TYPE_CHOICES = [
        # Retail & Fashion
        ('shop', "Do'kon / Supermarket"),
        ('clothing', "Kiyim-kechak"),
        ('shoes', "Poyabzal"),
        ('beauty', "Go'zallik & Parfyumeriya"),
        ('jewelry', "Zargarlik & Aksessuarlar"),
        ('kids', "Bolalar Dunyosi"),
        ('sport', "Sport tovarlari"),

        # Food & HoReCa
        ('restaurant', "Restoran (3D/AR Menyu)"),
        ('cafe', "Kafe"),
        ('fastfood', "Fast-food & Pitsa"),
        ('bar', "Bar & Lounge"),
        ('bakery', "Nonvoyxona & Qandolatchilik"),
        ('coffee', "Qahvaxona"),

        # Fresh Market & Agro
        ('fresh_produce', "Meva-sabzavot (Bozor)"),
        ('meat_butcher', "Go'sht do'koni"),
        ('dairy', "Sut & Tabiiy Mahsulotlar"),
        ('honey_nuts', "Asal, Yong'oq & Quruq Meva"),
        ('agro_seeds', "Urug'lik, O'g'it & Agro"),

        # Tech, Auto & Hardware
        ('electronics', "Elektronika & Smartfonlar"),
        ('appliances', "Maishiy Texnika"),
        ('auto', "Avto tovarlar & Ehtiyot qismlar"),
        ('construction', "Qurilish mollari & Santexnika"),
        ('furniture', "Mebel & Uy Jihozlari"),

        # Health, Services & Rentals
        ('pharmacy', "Dorixona & Tibbiyot"),
        ('optics', "Optika & Ko'zoynak"),
        ('flowers', "Gullar & Sovg'alar"),
        ('books', "Kitoblar & Kanselyariya"),
        ('rental_prokat', "Ijara & Prokat (Liboslar/Texnika)"),
    ]
    store_type = models.CharField(max_length=32, choices=STORE_TYPE_CHOICES, default='shop', db_index=True, verbose_name='Turi')

    def get_cluster(self):
        st = self.store_type
        for cluster_key, cluster_data in self.STORE_CLUSTERS.items():
            if st in cluster_data['types']:
                return cluster_key
        return 'retail'

    def get_cluster_display(self):
        cluster_key = self.get_cluster()
        return self.STORE_CLUSTERS.get(cluster_key, {}).get('name', "Chakana Savdo")

    def get_cluster_icon(self):
        cluster_key = self.get_cluster()
        return self.STORE_CLUSTERS.get(cluster_key, {}).get('icon', "🛍️")
    # Restaurant-specific (AR_MENU dan)
    color_primary = models.CharField(max_length=7, default='#16a34a')
    color_accent = models.CharField(max_length=7, default='#1A1A2E')
    has_ar = models.BooleanField(default=False, verbose_name='AR bor')
    menu_version = models.IntegerField(default=1)
    kds_token = models.UUIDField(null=True, blank=True)
    langs_enabled = models.JSONField(default=list, blank=True)
    instagram_url = models.URLField(blank=True, verbose_name='Instagram')
    # V12: universal biznes profili (menu_label, order_label, preset, unit...)
    business_profile = models.JSONField(default=dict, blank=True)

    PLAN_CHOICES = [('basic', 'Basic'), ('pro', 'Pro'), ('business', 'Business')]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basic')
    plan_started_at = models.DateTimeField(null=True, blank=True)
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    ai_credits_monthly = models.PositiveIntegerField(default=0)
    ai_credits_used = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey('accounts.AdminUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_shops')
    verification_documents = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shops'
        verbose_name = "Do'kon"
        verbose_name_plural = "Do'konlar"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    @property
    def is_pro(self):
        return self.plan in ('pro', 'business')

    @property
    def plan_active(self):
        from django.utils import timezone
        if not self.plan_expires_at:
            return self.plan != 'basic'
        return self.plan_expires_at >= timezone.now()

    def can_use_ai_marketing(self):
        return self.is_pro and self.plan_active and self.ai_credits_used < self.ai_credits_monthly

    def consume_ai_credit(self, amount=1):
        if self.ai_credits_used + amount > self.ai_credits_monthly:
            raise ValueError('AI kreditlari yetarli emas')
        self.ai_credits_used += amount
        self.save(update_fields=['ai_credits_used'])

    def ai_credits_left(self):
        return max(0, self.ai_credits_monthly - self.ai_credits_used)


STORE_CLUSTERS = Shop.STORE_CLUSTERS
STORE_TYPE_CHOICES = Shop.STORE_TYPE_CHOICES


class ShopPage(models.Model):
    """Sotuvchi tomonidan vizual yig'ilgan do'kon sahifasi (store builder)."""
    TEMPLATE_CHOICES = [('minimal', 'Minimal'), ('neon', 'Neon'), ('classic', 'Classic')]
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name='page')
    template = models.CharField(max_length=20, choices=TEMPLATE_CHOICES, default='minimal')
    layout = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_pages'
        verbose_name = "Do'kon sahifasi"
        verbose_name_plural = "Do'kon sahifalari"

    def __str__(self):
        return f"{self.shop.name} sahifasi"

    def default_layout(self):
        return [
            {'type': 'hero', 'title': self.shop.name, 'subtitle': self.shop.description or '', 'image': ''},
            {'type': 'category_strip', 'title': 'Kategoriyalar', 'subtitle': '', 'image': ''},
            {'type': 'product_grid', 'title': 'Mahsulotlar', 'subtitle': "Do'konning eng yaxshi mahsulotlari", 'product_filter': '', 'limit': 12},
            {'type': 'map', 'title': 'Manzil', 'subtitle': self.shop.address, 'image': ''},
            {'type': 'reviews', 'title': 'Mijozlar fikri', 'subtitle': '', 'image': ''},
        ]
