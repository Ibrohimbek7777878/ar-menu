"""
Video sayr modellari (TZ_MULTITENANT_BRON_BREND_VIDEO_TUR, Bosqich 3-4).

  Tour         - bitta video sayr (restoran bo'yicha, ixtiyoriy zal). Video yuklanadi, ishchi (ffmpeg) yengil variantlar yasaydi.
  TourStop     - nuqta (bob): sayrdagi joy nomi va vaqti.
  TourHotspot  - stol belgisi: vaqt oralig'i + ekrandagi joy (x, y: 0..1) + (ixtiyoriy) Table.
  TourAiRun    - AI takliflari so'rovlari jurnali (tenant boshiga kunlik chegara va xarajat nazorati uchun).

Qoidalar: hamma narsa `shop` bo'yicha; hech narsa o'chirilmaydi (arxivlanadi); bitta restoran+zal uchun bittagina `published`,
bitta restoran uchun bittagina `processing` (ikkalasi ham bazada qisman noyob indeks bilan kafolatlangan).
"""
import uuid

from django.db import models
from django.db.models import F, Q

SOURCE_EXTS = ('mp4', 'mov', 'webm')


def tour_upload_to(instance, filename):
    """Manba fayl yo'li: foydalanuvchi nomi HECH QACHON yo'lga tushmaydi (faqat tur: mp4/mov/webm)."""
    ext = str(filename).rsplit('.', 1)[-1].lower() if '.' in str(filename) else 'mp4'
    ext = ext if ext in SOURCE_EXTS else 'mp4'
    return f'tours/shop_{instance.shop_id}/{instance.media_uuid}/source.{ext}'


class Tour(models.Model):
    DRAFT, PROCESSING, READY, PUBLISHED, FAILED = 'draft', 'processing', 'ready', 'published', 'failed'
    STATUS_CHOICES = [
        (DRAFT, 'Qoralama'), (PROCESSING, 'Qayta ishlanmoqda'), (READY, 'Tayyor'),
        (PUBLISHED, "E'lon qilingan"), (FAILED, 'Xato'),
    ]
    STATUS_LABELS = dict(STATUS_CHOICES)

    AI_IDLE, AI_RUNNING, AI_DONE, AI_FAILED = 'idle', 'running', 'done', 'failed'
    AI_STATUS_CHOICES = [(AI_IDLE, 'Kutilmoqda'), (AI_RUNNING, 'Ishlamoqda'), (AI_DONE, 'Tayyor'), (AI_FAILED, 'Xato')]

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='tours')
    hall = models.ForeignKey('tables_restaurant.Hall', on_delete=models.SET_NULL, null=True, blank=True, related_name='tours')
    # hall_id yoki 0: "zalsiz" (NULL) sayrlar ham bitta `published` qoidasiga kirsin (NULL'lar indeksda alohida hisoblanadi)
    hall_key = models.PositiveIntegerField(default=0, editable=False)
    title = models.CharField(max_length=120)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=DRAFT)

    source = models.FileField(upload_to=tour_upload_to, max_length=255, blank=True)
    source_size = models.BigIntegerField(default=0)         # bayt: tenant kvotasi hisobi
    variants_size = models.BigIntegerField(default=0)       # bayt: yasalgan variantlar yig'indisi
    media_uuid = models.UUIDField(default=uuid.uuid4, editable=False)    # fayllar papkasi: har yuklashda yangi
    duration_s = models.FloatField(default=0)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    variants = models.JSONField(default=dict, blank=True)   # {scrub, play, low, poster}: MEDIA_ROOT'ga nisbatan yo'llar
    error = models.CharField(max_length=300, blank=True)

    # Ishchi navbati: status='processing' + processing_claimed_at (NULL = hali olinmagan)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_claimed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    ai_status = models.CharField(max_length=10, choices=AI_STATUS_CHOICES, default=AI_IDLE)
    ai_suggestions = models.JSONField(null=True, blank=True)
    ai_run_id = models.UUIDField(null=True, blank=True)
    ai_requested_at = models.DateTimeField(null=True, blank=True)
    ai_claimed_at = models.DateTimeField(null=True, blank=True)

    is_archived = models.BooleanField(default=False, db_index=True)    # DELETE = arxivlash: qattiq o'chirish yo'q
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tours'
        ordering = ['-id']
        indexes = [
            models.Index(fields=['shop', 'is_archived', 'status'], name='tours_shop_arch_status_idx'),
            models.Index(fields=['status', 'processing_claimed_at'], name='tours_queue_idx'),
            models.Index(fields=['ai_status', 'ai_claimed_at'], name='tours_ai_queue_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['shop', 'hall_key'], condition=Q(status='published'),
                                    name='tours_one_published_per_hall'),
            models.UniqueConstraint(fields=['shop'], condition=Q(status='processing'),
                                    name='tours_one_processing_per_shop'),
        ]

    def __str__(self):
        return f'{self.title} ({self.get_status_display()})'

    def save(self, *args, **kwargs):
        self.hall_key = self.hall_id or 0
        update_fields = kwargs.get('update_fields')
        if update_fields is not None and ('hall' in update_fields or 'hall_id' in update_fields):
            kwargs['update_fields'] = list({*update_fields, 'hall_key'})
        super().save(*args, **kwargs)

    @property
    def status_label(self):
        return self.STATUS_LABELS.get(self.status, self.status)

    @property
    def used_bytes(self):
        return int(self.source_size or 0) + int(self.variants_size or 0)


class TourStop(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='stops')
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=60)
    t = models.FloatField()

    class Meta:
        db_table = 'tour_stops'
        ordering = ['order', 'id']
        indexes = [models.Index(fields=['tour', 'order'], name='tour_stops_order_idx')]
        constraints = [models.CheckConstraint(condition=Q(t__gte=0), name='tour_stop_t_non_negative')]

    def __str__(self):
        return f'{self.title} @ {self.t}s'


class TourHotspot(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='hotspots')
    table = models.ForeignKey('tables_restaurant.Table', on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='tour_hotspots')
    label = models.CharField(max_length=60, blank=True)
    t_start = models.FloatField()
    t_end = models.FloatField()
    x = models.FloatField()
    y = models.FloatField()

    class Meta:
        db_table = 'tour_hotspots'
        ordering = ['t_start', 'id']
        indexes = [models.Index(fields=['tour', 't_start'], name='tour_hotspots_t_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(t_start__gte=0) & Q(t_start__lt=F('t_end')), name='tour_hotspot_time_range'),
            models.CheckConstraint(condition=Q(x__gte=0, x__lte=1, y__gte=0, y__lte=1), name='tour_hotspot_xy_unit'),
        ]

    def __str__(self):
        return f'{self.label or self.table_id} {self.t_start}-{self.t_end}s'


class TourAiRun(models.Model):
    """AI takliflari so'rovi (bitta qator = bitta so'rov). Kunlik chegara shu jadvaldan sanaladi: qayta ishga tushirish/o'chirishdan
    keyin ham yo'qolmaydi. Rasm yoki model javobi saqlanmaydi (faqat holat va qisqa sabab)."""
    QUEUED, OK, FAILED = 'queued', 'ok', 'failed'

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='tour_ai_runs')
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='ai_runs')
    run_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=8, default=QUEUED)
    frames = models.PositiveSmallIntegerField(default=0)
    detail = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tour_ai_runs'
        ordering = ['-id']
        indexes = [models.Index(fields=['shop', 'created_at'], name='tour_ai_runs_day_idx')]
