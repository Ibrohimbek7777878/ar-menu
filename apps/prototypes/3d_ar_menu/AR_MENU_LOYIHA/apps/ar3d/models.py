import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
try:
    from pgvector.django import VectorField, HnswIndex
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False
    VectorField = None
    HnswIndex = None

from core.models import TimestampedModel


class DishLibrary(models.Model):
    """
    ⚡ GLOBAL 3D taom kutubxonasi — tenant'siz, barcha restoranlar foydalanadi.
    """
    SOURCE = [
        ('photogrammetry', 'Fotogrammetriya'),
        ('ai', 'AI generatsiya'),
        ('manual', "Qo'lda modellashtirilgan"),
        ('vendor', 'Sotib olingan'),
    ]

    key = models.SlugField(max_length=80, unique=True, db_index=True)
    name_uz = models.CharField(max_length=200)
    name_ru = models.CharField(max_length=200, blank=True)
    name_en = models.CharField(max_length=200, blank=True)
    aliases = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    category_key = models.CharField(max_length=50, db_index=True)
    cuisine = models.CharField(max_length=50, default='uzbek', db_index=True)
    glb_url = models.URLField(max_length=500)
    usdz_url = models.URLField(max_length=500, blank=True)
    poster_url = models.URLField(max_length=500, blank=True)
    preview_360 = models.URLField(max_length=500, blank=True)
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    glb_bytes = models.IntegerField(default=0)
    usdz_bytes = models.IntegerField(default=0)
    poly_count = models.IntegerField(default=0)
    quality = models.SmallIntegerField(default=3)
    source = models.CharField(max_length=20, choices=SOURCE, default='ai')
    embedding = models.JSONField(null=True, blank=True)
    used_by_count = models.IntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ar3d_dishlibrary'
        ordering = ['-used_by_count', 'name_uz']
        indexes = [
            models.Index(fields=['category_key', 'is_active']),
            models.Index(fields=['-used_by_count']),
            GinIndex(fields=['aliases']),
        ]

    def __str__(self):
        return f'{self.name_uz} ({self.key}) ×{self.used_by_count}'

    @property
    def size_m(self) -> float:
        return float(self.real_size_cm) / 100.0

    def bump_usage(self):
        from django.db.models import F
        DishLibrary.objects.filter(pk=self.pk).update(used_by_count=F('used_by_count') + 1)


class DishModel3D(TimestampedModel):
    STATUS = [
        ('none', 'Yo\'q'),
        ('queued', 'Navbatda'),
        ('processing', 'Jarayonda'),
        ('ready', 'Tayyor'),
        ('failed', 'Xato'),
    ]
    SOURCE = [
        ('library', 'Kutubxonadan'),
        ('ai', 'AI generatsiya'),
        ('upload', 'Qo\'lda yuklangan'),
        ('photogrammetry', 'Fotogrammetriya'),
    ]

    dish = models.OneToOneField('menu.Dish', on_delete=models.CASCADE, related_name='model3d')
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE, db_index=True, related_name='models3d')
    library = models.ForeignKey(DishLibrary, null=True, blank=True, on_delete=models.SET_NULL, related_name='copies')
    glb = models.FileField(upload_to='ar/glb/', blank=True)
    usdz = models.FileField(upload_to='ar/usdz/', blank=True)
    poster = models.ImageField(upload_to='ar/poster/', blank=True)
    glb_url = models.URLField(max_length=500, blank=True)
    usdz_url = models.URLField(max_length=500, blank=True)
    poster_url = models.URLField(max_length=500, blank=True)
    preview_360 = models.URLField(max_length=500, blank=True)
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    glb_bytes = models.IntegerField(default=0)
    usdz_bytes = models.IntegerField(default=0)
    poly_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='none', db_index=True)
    source = models.CharField(max_length=20, choices=SOURCE, blank=True)
    progress = models.SmallIntegerField(default=0)
    error_msg = models.TextField(blank=True)
    view_count = models.IntegerField(default=0)
    convert_count = models.IntegerField(default=0)
    ready_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ar3d_dishmodel3d'
        indexes = [
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'3D: {self.dish_id} [{self.status}]'

    def url_glb(self):
        if self.glb_url:
            return self.glb_url
        if self.library_id and self.library.glb_url:
            return self.library.glb_url
        return self.glb.url if self.glb else ''

    def url_usdz(self):
        if self.usdz_url:
            return self.usdz_url
        if self.library_id and self.library.usdz_url:
            return self.library.usdz_url
        return self.usdz.url if self.usdz else ''

    def url_poster(self):
        if self.poster_url:
            return self.poster_url
        if self.library_id and self.library.poster_url:
            return self.library.poster_url
        return self.poster.url if self.poster else ''

    @property
    def size_m(self) -> float:
        return round(float(self.real_size_cm) / 100.0, 3)

    @property
    def is_ready(self) -> bool:
        return self.status == 'ready' and bool(self.url_glb())

    @property
    def convert_rate(self) -> float:
        return round(100 * self.convert_count / self.view_count, 1) if self.view_count else 0.0


class ARView(models.Model):
    MODE = [
        ('webxr', 'WebXR'),
        ('quick-look', 'iOS Quick Look'),
        ('scene-viewer', 'Android Scene Viewer'),
        ('3d-only', '3D (AR yo\'q)'),
        ('360', '360° karusel'),
        ('image', 'Oddiy rasm'),
    ]
    DEVICE = [('ios', 'iOS'), ('android', 'Android'), ('desktop', 'Desktop')]

    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE, db_index=True, related_name='ar_views')
    dish = models.ForeignKey('menu.Dish', on_delete=models.CASCADE, related_name='ar_views')
    guest = models.ForeignKey('guest.Guest', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    table = models.ForeignKey('tables.Table', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    session_id = models.CharField(max_length=64, db_index=True, blank=True)
    mode = models.CharField(max_length=20, choices=MODE, db_index=True)
    duration_sec = models.IntegerField(default=0)
    device = models.CharField(max_length=20, choices=DEVICE, blank=True)
    converted = models.BooleanField(default=False, db_index=True)
    order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ar3d_arview'
        indexes = [
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['dish', '-created_at']),
            models.Index(fields=['restaurant', 'converted', '-created_at']),
            models.Index(fields=['session_id', 'dish']),
        ]

    def __str__(self):
        return f'AR {self.dish_id} {self.mode} {self.duration_sec}s'


class Model3DJob(TimestampedModel):
    STATUS = [
        ('queued', 'Navbatda'),
        ('running', 'Bajarilmoqda'),
        ('done', 'Tugadi'),
        ('failed', 'Xato'),
        ('cancelled', 'Bekor qilindi'),
    ]
    STAGE = [
        ('library', '📚 Kutubxona qidirilmoqda'),
        ('generate', '🤖 AI model yaratmoqda'),
        ('optimize', '🔧 Optimizatsiya'),
        ('scale', '📏 Real o\'lchamga moslash'),
        ('usdz', '📱 USDZ konvertatsiya'),
        ('poster', '🖼 Poster render'),
        ('upload', '☁️ CDN ga yuklash'),
        ('done', '✅ Tayyor'),
    ]

    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE, db_index=True, related_name='model3d_jobs')
    dish = models.ForeignKey('menu.Dish', on_delete=models.CASCADE, related_name='model3d_jobs')
    model = models.ForeignKey(DishModel3D, null=True, blank=True, on_delete=models.SET_NULL, related_name='jobs')
    images = models.JSONField(default=list)
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    prefer_library = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS, default='queued', db_index=True)
    stage = models.CharField(max_length=20, choices=STAGE, default='library')
    progress = models.SmallIntegerField(default=0)
    attempts = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=3)
    heartbeat_at = models.DateTimeField(null=True, blank=True, db_index=True)
    provider = models.CharField(max_length=30, blank=True)
    cost_usd = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    error = models.TextField(blank=True)
    result = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('accounts.Staff', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        db_table = 'ar3d_model3djob'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['status', 'heartbeat_at']),
        ]

    def __str__(self):
        return f'Job#{self.id} dish={self.dish_id} [{self.status}/{self.stage}]'

    def set_stage(self, stage, progress=None):
        from django.utils import timezone
        from core.ws import ws_send, g_admin
        self.stage = stage
        if progress is not None:
            self.progress = progress
        self.heartbeat_at = timezone.now()
        self.save(update_fields=['stage', 'progress', 'heartbeat_at', 'updated_at'])
        if self.model_id:
            DishModel3D.objects.filter(id=self.model_id).update(progress=self.progress)
        ws_send(g_admin(self.restaurant_id), 'model3d.progress', {
            'job_id': self.id, 'dish_id': self.dish_id,
            'stage': stage, 'stage_label': dict(self.STAGE).get(stage, stage),
            'progress': self.progress,
        })
