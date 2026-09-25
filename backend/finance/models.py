from django.db import models
from django.utils import timezone
from django.conf import settings

class FinanceCategory(models.Model):
    TYPE_CHOICES = [
        ('expense', 'Chiqim / Xarajat'),
        ('income', 'Kirim / Tushum'),
        ('capital', 'Sarmoya / Investitsiya'),
        ('planned', 'Rejadagi xarajat'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='finance_categories')
    name = models.CharField(max_length=100, verbose_name='Kategoriya nomi')
    category_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='expense')
    description = models.TextField(blank=True, verbose_name='Kategoriya izohi')
    icon = models.CharField(max_length=50, default='📦', help_text='Emoji yoki ikonka')
    color = models.CharField(max_length=30, default='#ef4444')
    is_system = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_categories'
        verbose_name = 'Moliya kategoriyasi'
        verbose_name_plural = 'Moliya kategoriyalari'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name} ({self.get_category_type_display()})"


class FinanceTransaction(models.Model):
    TYPE_CHOICES = [
        ('income', 'Kirim'),
        ('expense', 'Chiqim'),
    ]
    STAGE_CHOICES = [
        ('planned', 'Rejadagi / Kutilayotgan'),
        ('income', 'Kassa Kirimi'),
        ('expense', 'To\'langan Chiqim'),
        ('debt', 'Nasiya / Qarz'),
        ('settled', 'Yopilgan / Arxiv'),
    ]
    PAYMENT_CHOICES = [
        ('cash', 'Naqd pul'),
        ('card', 'Plastik / Click / Payme'),
        ('bank', 'Bank hisobi'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='finance_transactions')
    category = models.ForeignKey(FinanceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    tx_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='income', verbose_name='Holati / Bosqich')
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='Summa')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cash')
    title = models.CharField(max_length=255, verbose_name='Mazmuni / Tovarlar')
    notes = models.TextField(blank=True, verbose_name='Qo\'shimcha izoh')
    color = models.CharField(max_length=30, default='default', blank=True, verbose_name='Kartochka rangi')
    is_cancelled = models.BooleanField(default=False, verbose_name='Bekor qilinganmi')
    cancel_reason = models.CharField(max_length=255, blank=True, verbose_name='Bekor qilish sababi')
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_finance_txs')
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name='Bekor qilingan vaqt')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='finance_txs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    tx_date = models.DateField(default=timezone.now, verbose_name='Sana')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_transactions'
        verbose_name = 'Moliya operatsiyasi'
        verbose_name_plural = 'Moliya operatsiyalari'
        ordering = ['-tx_date', '-created_at']

    @property
    def is_moved(self):
        return self.movements.exists()

    @property
    def stage_name(self):
        stage_dict = {
            'planned': 'Kutilayotgan (Rejada)',
            'income': 'Kassaga kirdi (+)',
            'expense': 'Kassadan chiqdi (-)',
            'debt': 'Nasiyalar (Qarz)',
            'settled': 'Tugallangan / Yopilgan',
            'realized': 'Kassa operatsiyasi'
        }
        if self.stage in stage_dict:
            return stage_dict[self.stage]
        try:
            cs = FinanceCustomStage.objects.filter(shop_id=self.shop_id, stage_key=self.stage).first()
            if cs:
                return f"{cs.icon} {cs.name}"
        except Exception:
            pass
        return self.get_stage_display()

    def __str__(self):
        return f"{self.get_tx_type_display()}: {self.amount} so'm ({self.title})"


class FinanceMovementHistory(models.Model):
    transaction = models.ForeignKey(FinanceTransaction, on_delete=models.CASCADE, related_name='movements', verbose_name='Operatsiya')
    from_stage = models.CharField(max_length=50, verbose_name='Qaysi bosqichdan')
    to_stage = models.CharField(max_length=50, verbose_name='Qaysi bosqichga')
    from_type = models.CharField(max_length=30, blank=True, verbose_name='Oldingi turi')
    to_type = models.CharField(max_length=30, blank=True, verbose_name='Yangi turi')
    moved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='O\'zgartirgan foydalanuvchi')
    moved_at = models.DateTimeField(auto_now_add=True, verbose_name='O\'zgartirilgan vaqt')
    note = models.CharField(max_length=255, blank=True, verbose_name='Izoh / Sabab')

    class Meta:
        db_table = 'finance_movement_history'
        verbose_name = 'Operatsiya harakat tarixi'
        verbose_name_plural = 'Operatsiyalar harakat tarixi'
        ordering = ['-moved_at']

    def __str__(self):
        return f"TX #{self.transaction_id}: {self.from_stage} -> {self.to_stage} ({self.moved_at.strftime('%d.%m.%Y %H:%M')})"


class DebtRecord(models.Model):
    DEBT_TYPE_CHOICES = [
        ('customer', 'Mijoz nasiyasi (Bizga beradi)'),
        ('supplier', 'Yetkazib beruvchi qarzi (Biz beramiz)'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('partial', 'Qisman to\'langan'),
        ('settled', 'To\'liq yopildi'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='debts')
    debt_type = models.CharField(max_length=20, choices=DEBT_TYPE_CHOICES, default='customer')
    person_name = models.CharField(max_length=150, verbose_name='Shaxs yoki tashkilot ismi')
    phone = models.CharField(max_length=50, blank=True, verbose_name='Telefon raqami')
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='Qarz summasi')
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='To\'langan summa')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField(null=True, blank=True, verbose_name='Qaytarish muddati')
    notes = models.TextField(blank=True, verbose_name='Izoh')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_debt_records'
        verbose_name = 'Qarz / Nasiya yozuvi'
        verbose_name_plural = 'Qarz / Nasiya daftari'
        ordering = ['-created_at']

    @property
    def remaining_amount(self):
        return max(0, self.amount - self.paid_amount)

    def __str__(self):
        return f"{self.person_name} ({self.amount} so'm) - {self.get_status_display()}"


class FinanceCustomStage(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='custom_stages')
    name = models.CharField(max_length=100, verbose_name='Ustun nomi')
    stage_key = models.SlugField(max_length=100, verbose_name='Kalit')
    icon = models.CharField(max_length=50, default='📋', help_text='Emoji yoki ikonka')
    category_type = models.CharField(
        max_length=20,
        choices=[
            ('expense', 'Chiqim / Xarajat'),
            ('income', 'Kirim / Tushum'),
            ('capital', 'Sarmoya / Investitsiya'),
            ('planned', 'Rejadagi xarajat'),
        ],
        default='expense',
        verbose_name='Kategoriya turi'
    )
    color = models.CharField(max_length=30, default='purple')
    sort_order = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_custom_stages'
        verbose_name = 'Maxsus Kanban ustuni'
        verbose_name_plural = 'Maxsus Kanban ustunlari'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f"{self.icon} {self.name} ({self.get_category_type_display()})"

