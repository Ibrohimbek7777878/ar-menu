import uuid
from django.db import models

class ProductLibrary(models.Model):
    """Global 3D kutubxona — barcha restoran foydalanadi (AR_MENU moat)."""
    key = models.SlugField(max_length=80, unique=True, db_index=True)
    name_uz = models.CharField(max_length=200)
    name_ru = models.CharField(max_length=200, blank=True)
    name_en = models.CharField(max_length=200, blank=True)
    aliases = models.JSONField(default=list, blank=True)
    category_key = models.CharField(max_length=50, db_index=True, default='national')
    glb_url = models.URLField(max_length=500, blank=True)
    usdz_url = models.URLField(max_length=500, blank=True)
    poster_url = models.URLField(max_length=500, blank=True)
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    glb_bytes = models.IntegerField(default=0)
    poly_count = models.IntegerField(default=0)
    source = models.CharField(max_length=20, default='ai')
    used_by_count = models.IntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_library'
        verbose_name = '3D Kutubxona'
        verbose_name_plural = '3D Kutubxona'
        ordering = ['-used_by_count']

    def __str__(self):
        return self.name_uz


class Product3DModel(models.Model):
    STATUS = [('none','Yo\'q'),('queued','Navbat'),('processing','Jarayon'),('ready','Tayyor'),('failed','Xato')]
    product = models.OneToOneField('products.Product', on_delete=models.CASCADE, related_name='model3d')
    library = models.ForeignKey(ProductLibrary, null=True, blank=True, on_delete=models.SET_NULL)
    glb = models.FileField(upload_to='ar/glb/', blank=True, null=True)
    usdz = models.FileField(upload_to='ar/usdz/', blank=True, null=True)
    poster = models.ImageField(upload_to='ar/poster/', blank=True, null=True)
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    status = models.CharField(max_length=20, choices=STATUS, default='none', db_index=True)
    source = models.CharField(max_length=20, blank=True)
    error_msg = models.TextField(blank=True)
    view_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    ready_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'product_3d_models'
        verbose_name = 'Mahsulot 3D'
        verbose_name_plural = 'Mahsulot 3D'


class ARView(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='ar_views')
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=64, db_index=True, blank=True)
    mode = models.CharField(max_length=20, default='3d-only')
    duration_sec = models.IntegerField(default=0)
    converted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ar_views'
        verbose_name = 'AR ko\'rish'
        verbose_name_plural = 'AR ko\'rishlar'


class Print3DProduct(models.Model):
    """3D Printerda tayyor chiqariladigan yoki namuna tovarlar katalogi."""
    CATEGORY_CHOICES = [
        ('figurines', 'Haykalchalar & Figuralar'),
        ('gadgets', 'Telefon & Gadjet aksessuarlari'),
        ('spare_parts', 'Ehtiyot qismlar & Mexanizmlar'),
        ('souvenirs', 'Suvenirlar & Breloklar'),
        ('decor_home', 'Uy-ro\'zg\'or & Dekoratsiya'),
        ('architecture', 'Arxitektura & Maketlar'),
    ]
    MATERIAL_CHOICES = [
        ('PLA', 'PLA (Standart & Ekologik)'),
        ('PETG', 'PETG (Mustahkam & Issiqqa chidamli)'),
        ('ABS', 'ABS (Zarbga o\'ta chidamli)'),
        ('Resin', 'Resin / Fotopolimer (Yuqori aniqlikdagi detallar)'),
        ('TPU', 'TPU (Moslashuvchan elastik rezina)'),
    ]

    title = models.CharField(max_length=255, verbose_name="Mahsulot nomi")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='figurines', db_index=True)
    description = models.TextField(blank=True, verbose_name="Tavsifi")
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Boshlang'ich narxi (so'm)")
    image = models.ImageField(upload_to='3d_print/products/', blank=True, null=True, verbose_name="Rasmi")
    glb_model = models.FileField(upload_to='3d_print/models/', blank=True, null=True, verbose_name="3D/AR Modeli (.glb)")
    default_material = models.CharField(max_length=20, choices=MATERIAL_CHOICES, default='PLA')
    print_duration_hours = models.DecimalField(max_digits=5, decimal_places=1, default=2.0, verbose_name="Chop etish vaqti (soat)")
    weight_grams = models.IntegerField(default=50, verbose_name="Og'irligi (gramm)")
    is_in_stock = models.BooleanField(default=True, verbose_name="Tayyor zaxirada bormi")
    is_featured = models.BooleanField(default=True, verbose_name="Bosh sahifada ko'rsatish")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'print_3d_products'
        verbose_name = '3D Printer Mahsuloti'
        verbose_name_plural = '3D Printer Mahsulotlari'
        ordering = ['-is_featured', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.title) or '3d-item'
            unique_slug = base_slug
            idx = 1
            while Print3DProduct.objects.filter(slug=unique_slug).exclude(pk=self.pk).exists():
                unique_slug = f"{base_slug}-{idx}"
                idx += 1
            self.slug = unique_slug
        super().save(*args, **kwargs)


class Print3DOrder(models.Model):
    """3D Printer buyurtmasi (tayyor mahsulot yoki mijoz o'z dizayni)."""
    STATUS_CHOICES = [
        ('new', 'Yangi tushgan'),
        ('confirmed', 'Tasdiqlangan & Kelishilgan'),
        ('printing', 'Chop etilmoqda 🖨️'),
        ('ready', 'Tayyor (Mijozga xabar berildi) ✅'),
        ('delivered', 'Yetkazildi / Olib ketildi 📦'),
        ('cancelled', 'Bekor qilingan ❌'),
    ]
    DELIVERY_CHOICES = [
        ('pickup', 'Olib ketish — Sayxun ko\'chasi 14 (Bepul)'),
        ('taxi', 'Taksi orqali yetkazish (Taxi Plus / Yandex Go)'),
        ('delivery', 'Standart yetkazib berish'),
    ]
    DIMENSION_MODE_CHOICES = [
        ('auto_detect', "O'lchamni bilmayman (Usta & AI aniqlasin)"),
        ('manual', "Aniq o'lcham kiritaman"),
    ]
    REFERENCE_OBJECT_CHOICES = [
        ('none', "Etalonsiz oddiy rasm/video"),
        ('coin', "Tanga (1000 yoki 100 so'mlik)"),
        ('card', "Plastik karta (Uzcard/Humo)"),
        ('ruler', "Lineyka / Chizg'ich"),
    ]

    order_number = models.CharField(max_length=40, unique=True, db_index=True)
    customer_name = models.CharField(max_length=150, verbose_name="Mijoz ismi")
    customer_phone = models.CharField(max_length=40, verbose_name="Telefon raqami")
    telegram_chat_id = models.CharField(max_length=50, blank=True, db_index=True, verbose_name="Telegram Chat ID")
    telegram_username = models.CharField(max_length=100, blank=True, verbose_name="Telegram username")
    
    # Manba (NFC / QR / Web / Bot)
    source = models.CharField(max_length=30, default='web', verbose_name="Buyurtma manbasi (nfc/qr/web)")
    has_cashback = models.BooleanField(default=True, verbose_name="5% Keshbek chegirmasi qo'llandi")

    # Mahsulot turi (Katalogdan yoki Individual)
    product = models.ForeignKey(Print3DProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name='orders')
    custom_title = models.CharField(max_length=255, blank=True, verbose_name="Mijoz talabi / buyum nomi")
    custom_description = models.TextField(blank=True, verbose_name="Qo'shimcha talablar")
    custom_file = models.FileField(upload_to='3d_print/custom_orders/', blank=True, null=True, verbose_name="Yuklangan fayl yoki rasm")
    video_file = models.FileField(upload_to='3d_print/custom_videos/', blank=True, null=True, verbose_name="Yuklangan video (.mp4/.mov)")
    dimension_mode = models.CharField(max_length=30, choices=DIMENSION_MODE_CHOICES, default='auto_detect', verbose_name="O'lchov usuli")
    reference_object = models.CharField(max_length=30, choices=REFERENCE_OBJECT_CHOICES, default='none', verbose_name="Rasmga qo'yilgan etalon")

    material = models.CharField(max_length=20, default='PLA', verbose_name="Tanlangan material")
    color = models.CharField(max_length=50, default='Oq / Standart', verbose_name="Rangi")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Soni")
    
    # Narx va Keshbek
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Asosiy narx")
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="5% Keshbek chegirmasi")
    delivery_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Dastavka narxi")
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Yakuniy to'lov")

    # Yetkazib berish
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='pickup')
    delivery_address = models.TextField(blank=True, verbose_name="Yetkazib berish manzili")
    pickup_location = models.CharField(max_length=255, default="Guliston shahar, Sayxun ko'chasi 14 (3D Studio)", verbose_name="Olib ketish punkti")

    # Holat va tayyor bo'lgandagi ma'lumotlar
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)
    finished_photo = models.ImageField(upload_to='3d_print/ready_orders/', blank=True, null=True, verbose_name="Tayyor bo'lgan buyum rasmi")
    ready_notification_sent = models.BooleanField(default=False, verbose_name="Mijozga tayyorlik xabari yuborildimi")
    admin_notes = models.TextField(blank=True, verbose_name="Usta / Admin qaydlari")
    last_status_reminder_at = models.DateTimeField(null=True, blank=True, verbose_name="Ustaga oxirgi hisobot eslatmasi vaqti")
    status_report_notes = models.TextField(blank=True, verbose_name="Usta hisoboti va qaydlari")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'print_3d_orders'
        verbose_name = '3D Printer Buyurtmasi'
        verbose_name_plural = '3D Printer Buyurtmalari'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} — {self.customer_name} ({self.get_status_display()})"


class Print3DCapability(models.Model):
    """Biz nimalar chiqarib bera olamiz? — amaliy yo'nalishlar (admin orqali dinamik boshqariladi)"""
    title = models.CharField(max_length=150, verbose_name="Yo'nalish nomi")
    short_desc = models.CharField(max_length=255, verbose_name="Qisqa tavsif")
    full_desc = models.TextField(blank=True, verbose_name="Batafsil tavsif")
    icon_type = models.CharField(max_length=50, default='car', help_text="car, toys, home, gift, med, tools, art")
    examples = models.TextField(help_text="Misollar (vergul yoki yangi qator bilan ajratilgan)", verbose_name="Amaliy misollar")
    image = models.ImageField(upload_to='3d_print/capabilities/', blank=True, null=True, verbose_name="Namunaviy rasm")
    starting_price = models.CharField(max_length=80, default="15 000 so'm dan", verbose_name="Boshlang'ich narxi")
    lead_time = models.CharField(max_length=80, default="1-3 soat", verbose_name="Tayyorlanish vaqti")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'print_3d_capabilities'
        verbose_name = '3D Xizmat Imkoniyati (Nimalar chiqaramiz)'
        verbose_name_plural = '3D Xizmat Imkoniyatlari'
        ordering = ['order', 'id']

    def __str__(self):
        return self.title

    def example_list(self):
        if not self.examples:
            return []
        items = [x.strip() for x in self.examples.replace('\r', '').split('\n') if x.strip()]
        if len(items) == 1 and ',' in items[0]:
            items = [x.strip() for x in items[0].split(',') if x.strip()]
        return items


class Print3DArticle(models.Model):
    """3D Printer nima va u qanday ishlaydi? — ma'rifiy maqolalar / qiziqarli qo'llanmalar"""
    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=200, verbose_name="Maqola sarlavhasi")
    subtitle = models.CharField(max_length=255, blank=True, verbose_name="Qisqa izoh")
    step_badge = models.CharField(max_length=30, blank=True, verbose_name="Qadam nishoni (masalan: 1-QADAM)")
    body = models.TextField(verbose_name="Matni")
    highlight_quote = models.CharField(max_length=255, blank=True, verbose_name="E'tiborli iqtibos")
    image = models.ImageField(upload_to='3d_print/articles/', blank=True, null=True, verbose_name="Rasm")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")
    is_active = models.BooleanField(default=True, verbose_name="Faol")

    class Meta:
        db_table = 'print_3d_articles'
        verbose_name = '3D Qo\'llanma / Maqola'
        verbose_name_plural = '3D Qo\'llanmalar / Maqolalar'
        ordering = ['order', 'id']

    def __str__(self):
        return self.title


class Print3DMaterial(models.Model):
    """Chop etish materiallari laboratoriyasi — xususiyatlar, taqqoslash va qayerda ishlatilishi"""
    name = models.CharField(max_length=50, verbose_name="Material kodi (masalan: PLA)")
    full_name = models.CharField(max_length=150, verbose_name="To'liq nomi")
    badge = models.CharField(max_length=50, default="Standart & Ekologik", verbose_name="Tavsif nishoni")
    strength_percent = models.IntegerField(default=75, verbose_name="Mustahkamlik darajasi (%)")
    heat_resistance = models.CharField(max_length=50, default="60°C gacha", verbose_name="Issiqqa chidamlilik")
    flexibility = models.CharField(max_length=50, default="Past (Qattiq)", verbose_name="Elastiklik")
    best_for = models.TextField(verbose_name="Qayerda ishlatish tavsiya etiladi?")
    features = models.TextField(verbose_name="Asosiy afzalliklari (yangi qatorda)")
    accent_color = models.CharField(max_length=20, default="#6366f1", verbose_name="Rang kodi (#hex)")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    is_active = models.BooleanField(default=True, verbose_name="Faol")

    class Meta:
        db_table = 'print_3d_materials'
        verbose_name = '3D Material'
        verbose_name_plural = '3D Materiallar Laboratoriyasi'
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} ({self.full_name})"

    def feature_list(self):
        if not self.features:
            return []
        return [f.strip() for f in self.features.replace('\r', '').split('\n') if f.strip()]


class Print3DFAQ(models.Model):
    """Ko'p so'raladigan savollar va javoblar"""
    question = models.CharField(max_length=255, verbose_name="Savol")
    answer = models.TextField(verbose_name="Javob")
    category = models.CharField(max_length=50, default="Umumiy", verbose_name="Kategoriya")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    is_active = models.BooleanField(default=True, verbose_name="Faol")

    class Meta:
        db_table = 'print_3d_faqs'
        verbose_name = '3D FAQ (Savol-javob)'
        verbose_name_plural = '3D FAQ (Savol-javoblar)'
        ordering = ['order', 'id']

    def __str__(self):
        return self.question
