from django.db import models
from backend.softdelete import SoftDeleteModel
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
    # Qarz to'lovi shu qarzga bog'lanadi: to'lov bekor qilinsa (storno) qarz qoldig'i tiklanadi (TZ R-FIN-03/07)
    debt = models.ForeignKey('finance.DebtRecord', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    tx_date = models.DateField(default=timezone.now, verbose_name='Sana')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_transactions'
        verbose_name = 'Moliya operatsiyasi'
        verbose_name_plural = 'Moliya operatsiyalari'
        ordering = ['-tx_date', '-created_at']
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='finance_tx_amount_positive'),
            # Bitta buyurtma uchun bitta faol kirim — daromad ikki marta hisoblanmasligi uchun (TZ R-FIN-02)
            models.UniqueConstraint(
                fields=['order'],
                condition=models.Q(order__isnull=False, tx_type='income', is_cancelled=False),
                name='uniq_active_income_per_order',
            ),
        ]

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


class DebtRecord(SoftDeleteModel):
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
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='debt_amount_positive'),
            models.CheckConstraint(
                condition=models.Q(paid_amount__gte=0, paid_amount__lte=models.F('amount')),
                name='debt_paid_within_amount'),
        ]

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


class ImmutableRecordError(Exception):
    """O'zgarmas yozuvni (o'zgarishlar tarixi) o'zgartirish yoki o'chirishga urinish."""


class FinanceRevisionQuerySet(models.QuerySet):
    """Tarix faqat qo'shiladi: ommaviy o'zgartirish va o'chirish ham taqiqlangan (ORM darajasida)."""

    def update(self, **kwargs):
        raise ImmutableRecordError("Moliya o'zgarishlar tarixini o'zgartirib bo'lmaydi")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ImmutableRecordError("Moliya o'zgarishlar tarixini o'zgartirib bo'lmaydi")

    def delete(self):
        raise ImmutableRecordError("Moliya o'zgarishlar tarixini o'chirib bo'lmaydi")


class FinanceRevision(models.Model):
    """
    Moliya yozuvini (kassa operatsiyasi yoki qarz) qo'lda tahrirlash tarixi: kim, qachon, NIMA UCHUN, nimani eski -> yangi qildi.
    Pul hisobida jimgina o'zgartirish yo'q: har tahrir sabab bilan bitta qator qo'shadi. Qator o'zgarmas:
    save() faqat yangi qator yaratadi, delete()/update() ORM darajasida taqiqlangan, admin'da faqat o'qish.
    `changes` = {maydon: {'old': ..., 'new': ...}}; summa Decimal satr ("150000.00"), sana ISO satr.
    Foydalanuvchi o'chirilsa ham kim ekani `changed_by_name`/`changed_by_role` nusxasida qoladi.
    """
    TARGET_TRANSACTION = 'transaction'
    TARGET_DEBT = 'debt'
    TARGET_CHOICES = [
        (TARGET_TRANSACTION, 'Kassa operatsiyasi'),
        (TARGET_DEBT, 'Qarz / Nasiya'),
    ]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='finance_revisions')
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES)
    target_id = models.PositiveBigIntegerField()
    # Shu yozuvning 1, 2, 3... tahriri; yozuv qatori qulfi ostida beriladi, noyoblik cheklovi ikki parallel tahrirni ham ushlaydi
    revision_no = models.PositiveIntegerField()
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    changed_by_name = models.CharField(max_length=200, blank=True)
    changed_by_role = models.CharField(max_length=50, blank=True)
    reason = models.CharField(max_length=300, verbose_name="O'zgartirish sababi")
    changes = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = FinanceRevisionQuerySet.as_manager()

    class Meta:
        db_table = 'finance_revisions'
        verbose_name = "Moliya o'zgarishi tarixi"
        verbose_name_plural = "Moliya o'zgarishlari tarixi"
        ordering = ['-revision_no', '-id']
        indexes = [models.Index(fields=['shop', 'target_type', 'target_id'], name='finrev_target_idx')]
        constraints = [
            models.UniqueConstraint(fields=['target_type', 'target_id', 'revision_no'], name='uniq_finance_revision_no'),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ImmutableRecordError("Moliya o'zgarishlar tarixini o'zgartirib bo'lmaydi")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableRecordError("Moliya o'zgarishlar tarixini o'chirib bo'lmaydi")

    def __str__(self):
        return f"{self.target_type} #{self.target_id} · tahrir {self.revision_no}"
