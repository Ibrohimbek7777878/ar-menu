import uuid
from django.db import models
from core.models import TimestampedModel
from apps.tables.models_floorplan import FloorPlan, PLAN_SCHEMA_VERSION  # noqa: F401


class Hall(TimestampedModel):
    """
    Zal — restoran ichidagi bo'lim (1-qavat, VIP, Terassa).
    plan_json — 2D zal plani (O-05 va A-05 sahifalarida chiziladi).
    """
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, related_name='halls')
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)
    order = models.IntegerField(default=0)

    plan_json = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']
        indexes = [models.Index(fields=['restaurant', 'is_active'])]

    def __str__(self):
        return f'{self.name} (#{self.id})'

    def tr_name(self, lang='uz'):
        """Fallback: so'ralgan til → uz"""
        return getattr(self, f'name_{lang}', '') or self.name if lang != 'uz' else self.name


class TableStatus(models.TextChoices):
    FREE = 'free', "Bo'sh"
    OCCUPIED = 'occupied', 'Band'
    ORDERING = 'ordering', 'Buyurtma bermoqda'
    WAITING = 'waiting', 'Kutmoqda'
    READY = 'ready', 'Tayyor'
    BILL = 'bill', "Hisob so'radi"
    CLEANING = 'cleaning', 'Tozalanmoqda'


# Stol holati faqat shu yo'nalishlarda o'zgaradi
ALLOWED_TRANSITIONS = {
    'free': {'occupied', 'cleaning'},
    'occupied': {'ordering', 'waiting', 'bill', 'cleaning', 'free'},
    'ordering': {'waiting', 'occupied', 'bill', 'cleaning'},
    'waiting': {'ready', 'occupied', 'bill', 'cleaning'},
    'ready': {'occupied', 'waiting', 'bill', 'cleaning'},
    'bill': {'cleaning', 'free', 'occupied'},
    'cleaning': {'free'},
}

QR_GRACE_SECONDS = 24 * 3600      # ⚡ eski QR 24 soat ishlaydi


class Table(TimestampedModel):
    """
    ⚡ qr_token — BUTUN TIZIM bo'yicha NOYOB (unique=True).
    Mijoz /t/<qr_token> ga kiradi, restoran ham shu tokendan aniqlanadi.
    """
    hall = models.ForeignKey(Hall, on_delete=models.CASCADE, related_name='tables')
    # denormalizatsiya ⚡ — har so'rovda hall JOIN qilmaslik uchun
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True,
        related_name='tables')

    number = models.CharField(max_length=20)          # "5", "VIP-2", "A12"

    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    qr_token_old = models.UUIDField(null=True, blank=True, db_index=True)
    qr_rotated_at = models.DateTimeField(null=True, blank=True)

    capacity = models.SmallIntegerField(default=4)
    shape = models.CharField(max_length=10, default='rect')   # rect | circle

    # Zal planidagi joyi (piksel)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    w = models.IntegerField(default=80)
    h = models.IntegerField(default=80)
    rotation = models.SmallIntegerField(default=0)

    status = models.CharField(
        max_length=20, choices=TableStatus.choices,
        default=TableStatus.FREE, db_index=True)

    assigned_waiter = models.ForeignKey(
        'accounts.Staff', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assigned_tables')

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [('restaurant', 'number')]
        ordering = ['hall__order', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['hall', 'is_active']),
        ]

    def __str__(self):
        return f'Stol {self.number}'

    # --- QR ---

    @property
    def qr_url(self) -> str:
        from django.conf import settings
        scheme = 'http' if settings.DEBUG else 'https'
        return f'{scheme}://{settings.PUBLIC_DOMAIN}/t/{self.qr_token}'

    def rotate_qr(self):
        """
        ⚡ Yangi QR. Eski token 24 soat ishlashda davom etadi —
        mijoz hozir ovqatlanayotgan bo'lishi mumkin.
        """
        from django.utils import timezone
        self.qr_token_old = self.qr_token
        self.qr_token = uuid.uuid4()
        self.qr_rotated_at = timezone.now()
        self.save(update_fields=['qr_token', 'qr_token_old', 'qr_rotated_at', 'updated_at'])
        return self.qr_token

    def old_token_valid(self) -> bool:
        from django.utils import timezone
        if not self.qr_token_old or not self.qr_rotated_at:
            return False
        return (timezone.now() - self.qr_rotated_at).total_seconds() < QR_GRACE_SECONDS

    # --- Holat ---

    def can_go(self, new_status: str) -> bool:
        if new_status == self.status:
            return True
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())

    def set_status(self, new_status: str, notify: bool = True):
        from core.exceptions import InvalidTransition
        if not self.can_go(new_status):
            raise InvalidTransition({'from': self.status, 'to': new_status})
        if new_status == self.status:
            return self
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])
        if notify:
            from apps.tables.services import broadcast_table_status
            broadcast_table_status(self)
        return self


def resolve_table_by_token(token) -> 'Table':
    """
    ⚡ QR token → Table. Avval joriy token, keyin grace ichidagi eski token.
    Topilmasa QRInvalid.
    """
    from core.exceptions import QRInvalid
    t = (Table.objects
         .select_related('hall', 'restaurant')
         .filter(qr_token=token, is_active=True).first())
    if t:
        return t
    t = (Table.objects
         .select_related('hall', 'restaurant')
         .filter(qr_token_old=token, is_active=True).first())
    if t and t.old_token_valid():
        return t
    raise QRInvalid({'token': str(token)})
