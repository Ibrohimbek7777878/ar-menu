import uuid
from django.db import models

class Hall(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='halls')
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)
    order = models.IntegerField(default=0)
    plan_json = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'restaurant_halls'
        ordering = ['order','id']

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class Table(models.Model):
    STATUS = [('free','Bo\'sh'),('occupied','Band'),('ordering','Buyurtma'),('waiting','Kutmoqda'),('ready','Tayyor'),('bill','Hisob'),('cleaning','Tozalanmoqda')]
    hall = models.ForeignKey(Hall, on_delete=models.CASCADE, related_name='tables')
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, db_index=True, related_name='restaurant_tables')
    number = models.CharField(max_length=20)
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    qr_token_old = models.UUIDField(null=True, blank=True, db_index=True)
    qr_rotated_at = models.DateTimeField(null=True, blank=True)
    capacity = models.SmallIntegerField(default=4)
    shape = models.CharField(max_length=10, default='rect')
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    w = models.IntegerField(default=80)
    h = models.IntegerField(default=80)
    rotation = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='free', db_index=True)
    assigned_waiter = models.ForeignKey('accounts.AdminUser', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'restaurant_tables'
        unique_together = [('shop','number')]
        ordering = ['hall__order','id']

    def __str__(self):
        return f"Stol {self.number} ({self.shop.name})"

    @property
    def qr_url(self):
        """V12-AR: QR endi imzolangan AR menyu sahifasiga boradi.
        Xavfsizlik: HMAC imzo + 12 soat muddat — linkni taxmin qilib ochish/uzatish
        cheklangan (muddat tugasa ofitsiant yangi QR chiqaradi)."""
        from django.core.signing import TimestampSigner
        from django.conf import settings
        domain = getattr(settings,'PUBLIC_DOMAIN','127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        sig = TimestampSigner().sign(str(self.qr_token))
        return f"{scheme}://{domain}/m/{self.shop.slug}/?t={sig}"

    @property
    def qr_path(self):
        """Bosma QR uchun doimiy yo'l: muddati tugamaydi, tasodifiy UUID (stol raqami taxmin qilinmaydi)."""
        return f"/t/{self.qr_token}/"

    def rotate_qr(self):
        from django.utils import timezone
        self.qr_token_old = self.qr_token
        self.qr_token = uuid.uuid4()
        self.qr_rotated_at = timezone.now()
        self.save(update_fields=['qr_token','qr_token_old','qr_rotated_at'])
        return self.qr_token


def resolve_table_by_token(token):
    qs = Table.objects.select_related('hall','shop').filter(qr_token=token, is_active=True)
    if qs.exists():
        return qs.first()
    # grace old token 24h
    from django.utils import timezone
    from datetime import timedelta
    qs2 = Table.objects.select_related('hall','shop').filter(qr_token_old=token, is_active=True)
    if qs2.exists():
        t = qs2.first()
        if t.qr_rotated_at and (timezone.now() - t.qr_rotated_at).total_seconds() < 24*3600:
            return t
    from rest_framework.exceptions import NotFound
    raise NotFound("QR yaroqsiz")


class NFCCard(models.Model):
    """
    NFC Smart Table Cards, Acrylic Stands & Staff Badges.
    Multi-standard: NTAG213, NTAG215, NTAG216, Mifare, Sticker, Acrylic Stand, Wooden Block.
    """
    CARD_TYPES = [
        ('table_stand', 'Stol Akril Stendi / Teg'),
        ('table_sticker', 'Stol Stikeri (Yog\'och / Metall)'),
        ('waiter_badge', 'Ofitsiant Beydji'),
        ('vip_guest', 'VIP Doimiy Mehmon Kartasi'),
        ('takeaway', 'Yetkazib berish / Taksi Kartasi'),
    ]

    DESIGN_THEMES = [
        ('gold_black', 'Luxury Black & Gold (Premium Qora-Oltin)'),
        ('emerald_minimal', 'Emerald Green (Zamonaviy Yashil-Oq)'),
        ('wooden_rustic', 'Wooden Rustic (Milliy Yog\'och Uslub)'),
        ('neon_cyber', 'Neon Modern (Yorqin Kafe Uslubi)'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='nfc_cards')
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='nfc_cards')
    name = models.CharField(max_length=120, verbose_name="Karta / Stend nomi")
    code = models.CharField(max_length=40, unique=True, db_index=True, verbose_name="NFC Unikal Kod")
    card_uid = models.CharField(max_length=60, blank=True, null=True, db_index=True, verbose_name="Chip Hardware UID (ixtiyoriy)")
    card_type = models.CharField(max_length=30, choices=CARD_TYPES, default='table_stand')
    design_theme = models.CharField(max_length=30, choices=DESIGN_THEMES, default='gold_black')
    
    wifi_name = models.CharField(max_length=100, blank=True, verbose_name="Wi-Fi nomi")
    wifi_password = models.CharField(max_length=100, blank=True, verbose_name="Wi-Fi paroli")
    custom_note = models.CharField(max_length=255, blank=True, verbose_name="Maxsus eslatma")
    tap_count = models.PositiveIntegerField(default=0, verbose_name="Jami tekkizishlar soni")
    last_tapped_at = models.DateTimeField(null=True, blank=True, verbose_name="Oxirgi tekkizilgan vaqt")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurant_nfc_cards'
        ordering = ['-created_at']

    def __str__(self):
        table_str = f" - Stol {self.table.number}" if self.table else ""
        return f"{self.name} ({self.shop.name}){table_str}"

    def save(self, *args, **kwargs):
        if not self.code:
            import secrets
            self.code = f"nfc_{secrets.token_hex(4)}"
        super().save(*args, **kwargs)

    def get_tap_url(self):
        from django.conf import settings
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        return f"{scheme}://{domain}/nfc/{self.code}/"

    def get_destination_url(self):
        """Karta tekkizilganda boradigan haqiqiy manzil."""
        from django.conf import settings
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        if self.table:
            return f"{scheme}://{domain}/m/{self.shop.slug}/?table={self.table.number}&nfc=1"
        return f"{scheme}://{domain}/m/{self.shop.slug}/?nfc=1"


_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'      # 0/O, 1/I/L aralashmasin


def generate_reservation_code():
    """Taxmin qilib bo'lmaydigan bron kodi: GS-K7QX2 (31^5 ≈ 28 mln variant)."""
    import secrets
    return 'GS-' + ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(5))


class TableReservation(models.Model):
    """
    Restoran stollarini oldindan yoki joyida bron qilish (Reservation) tizimi.
    Mijoz: Sana, vaqt, mehmonlar soni, maxsus istaklar bilan stolni band qiladi.
    Ofitsiant / Admin: Bronni tasdiqlaydi yoki stol biriktiradi.

    Holatlar (yagona ro'yxat, frontend bilan bir xil): pending → confirmed → arrived → seated → completed;
    pending/confirmed/arrived → cancelled. O'tishlar tables_restaurant/reservations.py da tekshiriladi.
    """
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('confirmed', 'Tasdiqlangan'),
        ('arrived', 'Keldi (kutmoqda)'),
        ('seated', 'O\'tirdi (Faol)'),
        ('completed', 'Yakunlangan'),
        ('cancelled', 'Bekor qilingan'),
    ]
    ACTIVE_STATUSES = ('pending', 'confirmed', 'arrived', 'seated')

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='table_reservations')
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    hall = models.ForeignKey(Hall, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    customer_name = models.CharField(max_length=120, verbose_name="Mehmon ismi")
    customer_phone = models.CharField(max_length=30, verbose_name="Telefon raqami")
    guests_count = models.PositiveSmallIntegerField(default=2, verbose_name="Mehmonlar soni")
    reservation_date = models.DateField(verbose_name="Bron sanasi")
    reservation_time = models.TimeField(verbose_name="Bron vaqti")
    notes = models.TextField(blank=True, verbose_name="Maxsus istaklar / Izoh")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    public_code = models.CharField(max_length=12, unique=True, default=generate_reservation_code, editable=False,
                                   verbose_name="Bron kodi")
    is_walk_in = models.BooleanField(default=False, verbose_name="Jonli kelgan (oldindan bron qilinmagan)")
    is_deleted = models.BooleanField(default=False, db_index=True, verbose_name="O'chirilgan (Soft delete)")
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurant_table_reservations'
        ordering = ['-reservation_date', '-reservation_time', '-created_at']
        indexes = [models.Index(fields=['shop', 'reservation_date', 'status'], name='resv_shop_date_status_idx')]

    def __str__(self):
        tbl = f" (Stol #{self.table.number})" if self.table else ""
        return f"Bron: {self.customer_name} - {self.reservation_date} {self.reservation_time}{tbl}"

    @property
    def code(self):
        return self.public_code

    @property
    def table_number(self):
        return self.table.number if self.table else "--"


class ServiceCall(models.Model):
    """
    Mehmon yoki Oshxona tomonidan Ofitsiantni chaqirish xizmati (Real-time Service Calls).
    Masalan: 'choy', 'non', 'ofitsiant', 'hisob', 'dish_ready' (oshxonadan taom tayyor).
    """
    TYPE_CHOICES = [
        ('waiter', 'Ofitsiant chaqiruvi'),
        ('bill', 'Hisob-kitob (chek)'),
        ('tea', 'Choy / Yangilash'),
        ('bread', 'Non / Issiq non'),
        ('dish_ready', 'Taom tayyor (Oshxona)'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('accepted', 'Qabul qilindi'),
        ('done', 'Bajarildi'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='service_calls')
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='service_calls')
    call_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='waiter')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurant_service_calls'
        ordering = ['-created_at']

    def __str__(self):
        return f"Chaqiruv: Stol #{self.table.number} - {self.get_call_type_display()} ({self.get_status_display()})"



