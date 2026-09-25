# FAZA 6 — ⚡ AR / 3D (LOYIHANING YURAGI)

**Vazifalar:** V-115 … V-142 (28 ta) · **Muddat:** 2,5 hafta
**Maqsad:** Mijoz taomni telefonda **haqiqiy o'lchamda**, o'z stoliga qo'yib ko'radi.
Bu — raqobatchilarda YO'Q va butun loyihaning sotuv argumenti.

> ⚠️ Boshlashdan oldin FAZA 5 tugagan bo'lishi kerak (buyurtma + WS ishlaydi).

---

## ⛔ BU FAZANING 5 TA QONUNI (buzilmaydi)

| # | Qonun | Nima uchun |
|---|---|---|
| 1 | **`ar-scale="fixed"`** — `auto` EMAS | `auto` bo'lsa mijoz modelni cho'zib yuboradi → lagan 1 metr bo'lib ko'rinadi → ishonch yo'qoladi |
| 2 | **Real o'lcham metrda** (`real_size_cm / 100`) | AR 1:1 chiqishi uchun. Osh lagani Ø32 sm = **aniq 0.32 m** |
| 3 | **Model tagi Y = 0** | Aks holda taom stol ustida "uchib" turadi yoki ichiga botadi |
| 4 | **GLB ≤ 3 MB, USDZ ≤ 5 MB** | 3G da 8 soniyada yuklanishi kerak; iOS Quick Look limiti |
| 5 | **3D generatsiya — WORKER'da** | 3-10 daqiqa davom etadi. Web so'rovda qilinsa gunicorn o'ladi |

**⚡ Xarajat qonuni:** har generatsiya ~$0.5-1.5. Shuning uchun **AVVAL kutubxona
qidiriladi** (bepul, 5 soniya), faqat topilmasa AI chaqiriladi.

---

## V-115 — ⚡ `DishLibrary` modeli (pgvector) — LOYIHANING ENG QIMMATLI AKTIVI

**Fayl:** `apps/ar3d/__init__.py`, `apps/ar3d/apps.py`, `apps/ar3d/models.py`

```bash
mkdir -p apps/ar3d/{migrations,services,management/commands}
touch apps/ar3d/__init__.py apps/ar3d/migrations/__init__.py
touch apps/ar3d/services/__init__.py
touch apps/ar3d/management/__init__.py apps/ar3d/management/commands/__init__.py
pip install pgvector pygltflib trimble-none 2>/dev/null || pip install pgvector pygltflib
```

**`apps/ar3d/apps.py`:**
```python
from django.apps import AppConfig


class Ar3dConfig(AppConfig):
    name = 'apps.ar3d'
    label = 'ar3d'
    verbose_name = 'AR / 3D modellar'
```

**`apps/ar3d/models.py`** (1-qism):
```python
import uuid

from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.db import models
from pgvector.django import VectorField, HnswIndex

from core.models import TimestampedModel


class DishLibrary(models.Model):
    """
    ⚡ GLOBAL 3D taom kutubxonasi — tenant'siz, barcha restoranlar foydalanadi.

    Biznes mantiq: "Osh" modeli BIR MARTA yaratiladi ($0.5), keyin 500 ta
    restoran uni BEPUL oladi. Bu — loyihaning himoya devori (moat).
    Raqobatchi kirib kelsa, u nolldan 500 ta model yaratishi kerak.
    """
    SOURCE = [
        ('photogrammetry', 'Fotogrammetriya'),
        ('ai',             'AI generatsiya'),
        ('manual',         "Qo'lda modellashtirilgan"),
        ('vendor',         'Sotib olingan'),
    ]

    key = models.SlugField(max_length=80, unique=True, db_index=True)
    # 'osh-toshkent', 'manti', 'somsa-goshtli', 'lagmon-quyruq'

    name_uz = models.CharField(max_length=200)
    name_ru = models.CharField(max_length=200, blank=True)
    name_en = models.CharField(max_length=200, blank=True)

    # ⚡ Moslashtirish kaliti — "palov" yozgan restoran ham "osh" ni topadi
    aliases = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    # ['palov','плов','pilaf','osh','ош','plov']

    category_key = models.CharField(max_length=50, db_index=True)
    # 'national','salad','soup','grill','bakery','dessert','drink'
    cuisine = models.CharField(max_length=50, default='uzbek', db_index=True)

    glb_url     = models.URLField(max_length=500)
    usdz_url    = models.URLField(max_length=500, blank=True)
    poster_url  = models.URLField(max_length=500, blank=True)
    preview_360 = models.URLField(max_length=500, blank=True)

    # ⚡ Real o'lcham — AR 1:1 chiqishining asosi
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)

    glb_bytes  = models.IntegerField(default=0)
    usdz_bytes = models.IntegerField(default=0)
    poly_count = models.IntegerField(default=0)

    quality = models.SmallIntegerField(default=3)     # 1-5, 5 = studiya sifati
    source  = models.CharField(max_length=20, choices=SOURCE, default='ai')

    # ⚡ Semantik qidiruv: "guruchli go'shtli taom" → osh topiladi
    embedding = VectorField(dimensions=768, null=True, blank=True)

    used_by_count = models.IntegerField(default=0, db_index=True)
    is_active  = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ar3d_dishlibrary'
        ordering = ['-used_by_count', 'name_uz']
        verbose_name_plural = '3D kutubxona'
        indexes = [
            models.Index(fields=['category_key', 'is_active']),
            models.Index(fields=['-used_by_count']),
            GinIndex(fields=['aliases']),
        ]

    def __str__(self):
        return f'{self.name_uz} ({self.key}) ×{self.used_by_count}'

    @property
    def size_m(self) -> float:
        """⚡ Metrda — <model-viewer> ga shu ketadi"""
        return float(self.real_size_cm) / 100.0

    def bump_usage(self):
        from django.db.models import F
        DishLibrary.objects.filter(pk=self.pk).update(
            used_by_count=F('used_by_count') + 1)
```

✅ **Tekshirish:** V-119 (migratsiya) dan keyin
```bash
python manage.py shell -c "
from apps.ar3d.models import DishLibrary
print(DishLibrary._meta.get_field('embedding').dimensions)"
# 768
```

---

## V-116 — `DishModel3D` modeli

**Fayl:** `apps/ar3d/models.py` (davomi)

```python
class DishModel3D(TimestampedModel):
    """
    Konkret restoran taomining 3D modeli.
    library to'ldirilgan → kutubxonadan olingan (BEPUL).
    library bo'sh      → AI/qo'lda yaratilgan (pullik).
    """
    STATUS = [
        ('none',       'Yo\'q'),
        ('queued',     'Navbatda'),
        ('processing', 'Jarayonda'),
        ('ready',      'Tayyor'),
        ('failed',     'Xato'),
    ]
    SOURCE = [
        ('library',        'Kutubxonadan'),
        ('ai',             'AI generatsiya'),
        ('upload',         'Qo\'lda yuklangan'),
        ('photogrammetry', 'Fotogrammetriya'),
    ]

    dish = models.OneToOneField('menu.Dish', on_delete=models.CASCADE,
                                related_name='model3d')
    # ⚡ denorm — tenant filtr uchun (JOIN'siz)
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   db_index=True, related_name='models3d')
    library = models.ForeignKey(DishLibrary, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='copies')

    # Fayllar: kutubxonadan olingan bo'lsa URL, o'ziniki bo'lsa File
    glb    = models.FileField(upload_to='ar/glb/',    blank=True)
    usdz   = models.FileField(upload_to='ar/usdz/',   blank=True)
    poster = models.ImageField(upload_to='ar/poster/', blank=True)
    glb_url    = models.URLField(max_length=500, blank=True)   # CDN
    usdz_url   = models.URLField(max_length=500, blank=True)
    poster_url = models.URLField(max_length=500, blank=True)
    preview_360 = models.URLField(max_length=500, blank=True)

    # ⚡ AR ning eng muhim maydoni
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)

    glb_bytes  = models.IntegerField(default=0)
    usdz_bytes = models.IntegerField(default=0)
    poly_count = models.IntegerField(default=0)

    status    = models.CharField(max_length=20, choices=STATUS, default='none',
                                 db_index=True)
    source    = models.CharField(max_length=20, choices=SOURCE, blank=True)
    progress  = models.SmallIntegerField(default=0)      # 0-100
    error_msg = models.TextField(blank=True)

    # Analitika (denorm — A-04 va A-10 uchun)
    view_count    = models.IntegerField(default=0)
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

    # ---- ⚡ Fayl manzillari: CDN URL ustunroq, keyin lokal fayl ----

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
        """⚡ REAL O'LCHAM METRDA — <model-viewer> shuni oladi"""
        return round(float(self.real_size_cm) / 100.0, 3)

    @property
    def is_ready(self) -> bool:
        return self.status == 'ready' and bool(self.url_glb())

    @property
    def convert_rate(self) -> float:
        return round(100 * self.convert_count / self.view_count, 1) if self.view_count else 0.0
```

**⚡ `Dish.has_3d` ni sinxron ushlab turish** — `apps/ar3d/signals.py`:
```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from apps.ar3d.models import DishModel3D


@receiver(post_save, sender=DishModel3D)
def sync_has_3d(sender, instance, **kwargs):
    """⚡ Menyu API 'has_3d' ni JOIN'siz o'qiydi — denorm doim to'g'ri bo'lsin"""
    from apps.menu.models import Dish
    from core.cache import bump_menu_version

    want = instance.status == 'ready'
    changed = Dish.objects.filter(id=instance.dish_id).exclude(has_3d=want).update(has_3d=want)
    if changed:
        bump_menu_version(instance.restaurant_id)   # menyu keshi eskiradi


@receiver(post_delete, sender=DishModel3D)
def clear_has_3d(sender, instance, **kwargs):
    from apps.menu.models import Dish
    from core.cache import bump_menu_version
    Dish.objects.filter(id=instance.dish_id).update(has_3d=False)
    bump_menu_version(instance.restaurant_id)
```

**`apps/ar3d/apps.py` ga:**
```python
    def ready(self):
        from apps.ar3d import signals  # noqa
```

---

## V-117 — `ARView` modeli (partition)

**Fayl:** `apps/ar3d/models.py` (davomi)

> ⚡ Bu jadval TEZ o'sadi (har AR ko'rish = 1 qator). Oy bo'yicha
> partitionlanadi, 6 oydan eskisi S3'ga arxivlanadi.

```python
class ARView(models.Model):
    """
    ⚡ AR analitikasining xom ma'lumoti.
    A-10 hisoboti shundan chiqadi: "AR ko'rgan mijoz cheki +31%".
    """
    MODE = [
        ('webxr',        'WebXR'),
        ('quick-look',   'iOS Quick Look'),
        ('scene-viewer', 'Android Scene Viewer'),
        ('3d-only',      '3D (AR yo\'q)'),
        ('360',          '360° karusel'),
        ('image',        'Oddiy rasm'),
    ]
    DEVICE = [('ios', 'iOS'), ('android', 'Android'), ('desktop', 'Desktop')]

    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   db_index=True, related_name='ar_views')
    dish  = models.ForeignKey('menu.Dish', on_delete=models.CASCADE, related_name='ar_views')
    guest = models.ForeignKey('guest.Guest', null=True, blank=True,
                              on_delete=models.SET_NULL, related_name='+')
    table = models.ForeignKey('tables.Table', null=True, blank=True,
                              on_delete=models.SET_NULL, related_name='+')
    session_id = models.CharField(max_length=64, db_index=True, blank=True)

    mode         = models.CharField(max_length=20, choices=MODE, db_index=True)
    duration_sec = models.IntegerField(default=0)
    device       = models.CharField(max_length=20, choices=DEVICE, blank=True)

    # ⚡ Konversiya: shu ko'rishdan keyin buyurtma qilindimi
    converted = models.BooleanField(default=False, db_index=True)
    order     = models.ForeignKey('orders.Order', null=True, blank=True,
                                  on_delete=models.SET_NULL, related_name='+')

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
```

**Partition (PostgreSQL native) — `scripts/ar_partitions.sql`:**
```sql
-- ⚡ ARView oylik partition. Har oy boshida cron chaqiradi.
-- Django jadvalni oddiy yaratadi; migratsiyadan keyin bir marta konvertatsiya:
--   (yangi loyihada, ma'lumot yo'q ekan — xavfsiz)

CREATE OR REPLACE FUNCTION ar3d_create_partition(target date) RETURNS void AS $$
DECLARE
  pname text := 'ar3d_arview_' || to_char(target, 'YYYYMM');
  d0 date := date_trunc('month', target);
  d1 date := d0 + interval '1 month';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF ar3d_arview FOR VALUES FROM (%L) TO (%L)',
      pname, d0, d1);
    EXECUTE format('CREATE INDEX %I ON %I (restaurant_id, created_at DESC)',
                   pname || '_rest_idx', pname);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Joriy va keyingi oy
SELECT ar3d_create_partition(CURRENT_DATE);
SELECT ar3d_create_partition(CURRENT_DATE + interval '1 month');
```

**Cron (`deploy/cron/armenu`):**
```
0 3 25 * * postgres psql -d armenu -c "SELECT ar3d_create_partition(CURRENT_DATE + interval '1 month');"
```

---

## V-118 — `Model3DJob` modeli

**Fayl:** `apps/ar3d/models.py` (davomi)

```python
class Model3DJob(TimestampedModel):
    """
    ⚡ 3D generatsiya topshirig'i. Worker shu jadvaldan oladi.
    Uzoq ish (3-10 daqiqa) — HECH QACHON web so'rovda bajarilmaydi.
    """
    STATUS = [
        ('queued',     'Navbatda'),
        ('running',    'Bajarilmoqda'),
        ('done',       'Tugadi'),
        ('failed',     'Xato'),
        ('cancelled',  'Bekor qilindi'),
    ]
    STAGE = [
        ('library',  '📚 Kutubxona qidirilmoqda'),
        ('generate', '🤖 AI model yaratmoqda'),
        ('optimize', '🔧 Optimizatsiya'),
        ('scale',    '📏 Real o\'lchamga moslash'),
        ('usdz',     '📱 USDZ konvertatsiya'),
        ('poster',   '🖼 Poster render'),
        ('upload',   '☁️ CDN ga yuklash'),
        ('done',     '✅ Tayyor'),
    ]

    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   db_index=True, related_name='model3d_jobs')
    dish  = models.ForeignKey('menu.Dish', on_delete=models.CASCADE, related_name='model3d_jobs')
    model = models.ForeignKey(DishModel3D, null=True, blank=True,
                              on_delete=models.SET_NULL, related_name='jobs')

    images       = models.JSONField(default=list)   # rasm URL/yo'llari
    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    prefer_library = models.BooleanField(default=True)   # ⚡ avval kutubxona

    status = models.CharField(max_length=20, choices=STATUS, default='queued',
                              db_index=True)
    stage  = models.CharField(max_length=20, choices=STAGE, default='library')
    progress = models.SmallIntegerField(default=0)

    attempts     = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=3)
    heartbeat_at = models.DateTimeField(null=True, blank=True, db_index=True)

    provider  = models.CharField(max_length=30, blank=True)   # meshy|tripo|rodin|library
    cost_usd  = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    error     = models.TextField(blank=True)
    result    = models.JSONField(default=dict, blank=True)

    started_at  = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_by  = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='+')

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
        """⚡ Har bosqichda admin panelga jonli xabar"""
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
```

✅ **Tekshirish:** V-119 dan keyin `python manage.py shell -c "from apps.ar3d.models import Model3DJob; print(Model3DJob.STAGE)"`

---

## V-119 — Migratsiya + pgvector indeks

**1. pgvector kengaytmasi:**
```bash
sudo -u postgres psql -d armenu -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d armenu -c "\dx vector"
```

**2. `config/settings/base.py` → `INSTALLED_APPS`:**
```python
    'pgvector.django',
    'apps.ar3d',
```

**3. Migratsiya:**
```bash
python manage.py makemigrations ar3d
```

**4. ⚡ Qo'lda tahrirlash — `apps/ar3d/migrations/0001_initial.py` boshiga:**
```python
from django.db import migrations, models
from pgvector.django import VectorExtension, HnswIndex


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('tenants', '0001_initial'),
        ('menu', '0001_initial'),
        ('tables', '0001_initial'),
        ('guest', '0001_initial'),
        ('orders', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        VectorExtension(),          # ⚡ CREATE EXTENSION vector
        # ... makemigrations yaratgan CreateModel'lar ...
    ]
```

**5. Oxiriga ⚡ HNSW indeks (semantik qidiruv tezligi):**
```python
        migrations.AddIndex(
            model_name='dishlibrary',
            index=HnswIndex(
                name='ar3d_lib_emb_hnsw',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops'],   # ⚡ cosine masofa
            ),
        ),
```

**6. Ishga tushirish:**
```bash
python manage.py migrate ar3d
psql -d armenu -c "\d+ ar3d_dishlibrary" | grep hnsw
# ar3d_lib_emb_hnsw
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.ar3d.models import DishLibrary
import random
DishLibrary.objects.create(key='test-osh', name_uz='Osh', name_ru='Плов', name_en='Pilaf',
    aliases=['palov','плов','pilaf'], category_key='national',
    glb_url='https://cdn/t.glb', real_size_cm=32,
    embedding=[random.random() for _ in range(768)])
print('OK', DishLibrary.objects.count())"
# OK 1
```

---

## V-120 — ⚡ `GET /v1/ar/{dish_id}/` — AR ma'lumoti

**Fayl:** `apps/ar3d/views.py`

> ⚡ Bu javobdagi `scale_m` — AR to'g'ri ishlashining kaliti. U **metrda**
> va **DB dagi haqiqiy o'lcham**. Hech qachon `1.0` yoki taxminiy son emas.

```python
import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.exceptions import TenantMismatch
from apps.ar3d.models import DishModel3D, ARView

log = logging.getLogger('ar3d.views')

AR_CACHE_TTL = 300


@api_view(['GET'])
@permission_classes([AllowAny])
def ar_info(request, dish_id):
    """
    GET /v1/ar/{dish_id}/

    Javob:
    {
      "ready": true,
      "glb": "...", "usdz": "...", "poster": "...", "preview_360": "",
      "scale_m": 0.32,          ⚡ REAL O'LCHAM METRDA
      "real_size_cm": 32.0,
      "name": "Osh (Palov)",
      "glb_bytes": 2100000,
      "fallback": "3d"          ar | 3d | 360 | image
    }
    """
    rid = getattr(request, 'restaurant_id', None)
    if not rid:
        raise TenantMismatch({'reason': 'restaurant_not_resolved'})

    lang = getattr(request, 'lang', request.query_params.get('lang', 'uz'))
    ck = f'ar:{rid}:{dish_id}:{lang}'
    cached = cache.get(ck)
    if cached is not None:
        return Response(cached)

    from apps.menu.models import Dish
    dish = (Dish.objects
            .select_related('model3d')
            .filter(id=dish_id, restaurant_id=rid)
            .first())
    if dish is None:
        raise TenantMismatch({'dish_id': dish_id})

    name = getattr(dish, f'name_{lang}', '') or dish.name_uz
    m3d = getattr(dish, 'model3d', None)

    if m3d is None or not m3d.is_ready:
        data = {
            'ready': False,
            'status': m3d.status if m3d else 'none',
            'progress': m3d.progress if m3d else 0,
            'name': name,
            'poster': dish.image.url if dish.image else '',
            'fallback': 'image',            # ⚡ oddiy rasmga tushamiz
        }
        cache.set(ck, data, 30)             # tayyorlanayotgan bo'lsa qisqa kesh
        return Response(data)

    data = {
        'ready': True,
        'dish_id': dish.id,
        'name': name,
        'glb':  m3d.url_glb(),
        'usdz': m3d.url_usdz(),
        'poster': m3d.url_poster() or (dish.image.url if dish.image else ''),
        'preview_360': m3d.preview_360,
        # ⚡⚡ AR NING ENG MUHIM QIYMATI — metrda, aniq
        'scale_m': m3d.size_m,
        'real_size_cm': float(m3d.real_size_cm),
        'glb_bytes': m3d.glb_bytes,
        'usdz_bytes': m3d.usdz_bytes,
        'poly_count': m3d.poly_count,
        'source': m3d.source,
        'fallback': 'ar',
    }
    cache.set(ck, data, AR_CACHE_TTL)
    return Response(data)
```

**`apps/ar3d/urls.py`:**
```python
from django.urls import path
from apps.ar3d import views

app_name = 'ar3d'

urlpatterns = [
    path('ar/<int:dish_id>/', views.ar_info,  name='info'),
    path('ar/view/',          views.ar_view,  name='view'),     # V-125
]
```
`config/urls.py` ga: `path('v1/', include('apps.ar3d.urls')),`

✅ **Tekshirish:**
```bash
curl -s http://localhost:8060/v1/ar/1/ -H 'Host: registon.localhost' | jq
# {"ready":true,...,"scale_m":0.32,"real_size_cm":32.0}
# ⚡ scale_m 0.32 — 1.0 EMAS, 32 EMAS. Metrda.
```

---

## V-121 — ⚡ AR qo'llab-quvvatlash aniqlash (JS)

**Fayl:** `static/guest/js/ar-detect.js`

> Har qurilma har xil. Aniqlash **noto'g'ri bo'lsa** — mijoz bo'sh ekran
> ko'radi. Shuning uchun aniqlash **konservativ**: shubha bo'lsa pastroq
> bosqichga tushamiz.

```javascript
/* ARMENU — AR qo'llab-quvvatlashini aniqlash */
(function (w) {
  'use strict';

  const ua = navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isChromeAndroid = isAndroid && /Chrome\/(\d+)/.test(ua);

  function chromeVersion() {
    const m = ua.match(/Chrome\/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function iosVersion() {
    const m = ua.match(/OS (\d+)_/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function device() {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  }

  /** WebGL bormi (3D ko'rish uchun MINIMAL shart) */
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return false;
      // Juda zaif GPU (software render) — 3D sekin bo'ladi
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        if (/SwiftShader|Software|llvmpipe/i.test(r)) return false;
      }
      return true;
    } catch (_) { return false; }
  }

  /** Qurilma "zaif"mi — 360°/rasmga tushish uchun */
  function isWeakDevice() {
    const mem = navigator.deviceMemory || 4;           // GB
    const cores = navigator.hardwareConcurrency || 4;
    return mem <= 2 || cores <= 2;
  }

  /** Tarmoq sekinmi — og'ir GLB yuklamaymiz */
  function isSlowNetwork() {
    const c = navigator.connection;
    if (!c) return false;
    if (c.saveData) return true;
    return ['slow-2g', '2g'].includes(c.effectiveType);
  }

  /** ⚡ Asosiy funksiya: qaysi rejim ishlaydi */
  async function detectARSupport() {
    // 1. WebXR (eng zamonaviy — sahifa ichida AR)
    if (w.navigator.xr && w.navigator.xr.isSessionSupported) {
      try {
        const ok = await navigator.xr.isSessionSupported('immersive-ar');
        if (ok && hasWebGL()) return 'webxr';
      } catch (_) {}
    }

    // 2. iOS → AR Quick Look (Safari 12+, iOS 12+)
    if (isIOS && iosVersion() >= 12) {
      const a = document.createElement('a');
      const supported = a.relList && a.relList.supports && a.relList.supports('ar');
      if (supported || isSafari) return 'quick-look';
    }

    // 3. Android → Scene Viewer (Chrome 79+, ARCore)
    if (isChromeAndroid && chromeVersion() >= 79) return 'scene-viewer';

    // 4. AR yo'q, lekin 3D bor
    if (hasWebGL() && !isWeakDevice() && !isSlowNetwork()) return '3d-only';

    // 5. 360° karusel (rasm ketma-ketligi — WebGL kerak emas)
    if (!isSlowNetwork()) return '360';

    // 6. Oddiy rasm
    return 'image';
  }

  w.ARDetect = {
    detectARSupport,
    device,
    hasWebGL,
    isWeakDevice,
    isSlowNetwork,
    isIOS, isAndroid,
    info() {
      return {
        device: device(), webgl: hasWebGL(),
        weak: isWeakDevice(), slow: isSlowNetwork(),
        ua: ua.slice(0, 120),
      };
    },
  };
})(window);
```

✅ **Tekshirish (brauzer konsolida):**
```javascript
await ARDetect.detectARSupport()
// iPhone Safari  → "quick-look"
// Android Chrome → "scene-viewer"
// Desktop Chrome → "3d-only"
console.table(ARDetect.info())
```

---

## V-122 — ⚡ `<model-viewer>` integratsiyasi (ar-scale="fixed" KRITIK)

**Fayl:** `static/guest/js/ar.js` (1-qism)

> ⛔ **`ar-scale="auto"` YOZMANG.** `auto` bo'lsa mijoz taomni barmoq bilan
> cho'zib, laganni stol kattaligida ko'radi. Bu — butun g'oyani o'ldiradi.
> `fixed` + `scale_m` → taom **haqiqiy o'lchamda** turadi.

```javascript
/* ARMENU — AR ko'rish (M-05) */
(function (w) {
  'use strict';

  const MV_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  let mvLoaded = false;

  /** <model-viewer> kutubxonasini bir marta yuklaydi */
  function loadModelViewer() {
    if (mvLoaded) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = MV_SRC;
      s.onload = () => { mvLoaded = true; res(); };
      s.onerror = () => rej(new Error('model-viewer yuklanmadi'));
      document.head.appendChild(s);
      setTimeout(() => mvLoaded ? res() : rej(new Error('timeout')), 12000);
    });
  }

  /**
   * ⚡ <model-viewer> elementini yaratadi.
   * @param {object} d  — /v1/ar/{id}/ javobi
   * @param {string} mode — webxr | quick-look | scene-viewer | 3d-only
   */
  function buildViewer(d, mode) {
    const mv = document.createElement('model-viewer');

    mv.setAttribute('src', d.glb);
    if (d.usdz) mv.setAttribute('ios-src', d.usdz);   // ⚡ iOS Quick Look
    if (d.poster) mv.setAttribute('poster', d.poster);
    mv.setAttribute('alt', d.name);

    // ---- AR sozlamalari ----
    if (mode !== '3d-only') {
      mv.setAttribute('ar', '');
      mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      // ⚡⚡⚡ ENG MUHIM ATRIBUT — REAL O'LCHAM, mijoz cho'za olmaydi
      mv.setAttribute('ar-scale', 'fixed');
      mv.setAttribute('ar-placement', 'floor');
    }

    // ⚡ Sichqoncha/barmoq bilan aylantirish (foydalanuvchi qoidasi)
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('touch-action', 'pan-y');
    mv.setAttribute('interaction-prompt', 'auto');
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('auto-rotate-delay', '2500');
    mv.setAttribute('rotation-per-second', '18deg');

    // ---- Ko'rinish ----
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('shadow-softness', '0.8');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('exposure', '1.0');
    mv.setAttribute('loading', 'eager');
    mv.setAttribute('reveal', 'auto');

    // ⚡ Kamera masofasi taom o'lchamiga moslanadi (kichik taom kichik ko'rinmasin)
    const dist = Math.max(0.6, d.scale_m * 2.6);
    mv.setAttribute('camera-orbit', '25deg 68deg ' + dist.toFixed(2) + 'm');
    mv.setAttribute('min-camera-orbit', 'auto auto ' + (dist * 0.5).toFixed(2) + 'm');
    mv.setAttribute('max-camera-orbit', 'auto 95deg ' + (dist * 2.5).toFixed(2) + 'm');
    mv.setAttribute('field-of-view', '32deg');

    mv.style.cssText = 'width:100%;height:100%;background:transparent;--poster-color:transparent';

    // ⚡ Maxsus AR tugmasi
    const btn = document.createElement('button');
    btn.slot = 'ar-button';
    btn.className = 'ar-cta';
    btn.innerHTML = '📱 <span>Stolga qo\'yib ko\'rish</span>';
    mv.appendChild(btn);

    // Progress bar sloti
    const pr = document.createElement('div');
    pr.slot = 'progress-bar';
    pr.className = 'ar-progress';
    pr.innerHTML = '<div class="ar-progress__bar"></div>';
    mv.appendChild(pr);

    return mv;
  }

  w.ARCore = { loadModelViewer, buildViewer, MV_SRC };
})(window);
```

**⚠️ CSP eslatmasi** — `config/settings/prod.py`:
```python
CSP_SCRIPT_SRC = ("'self'", 'https://cdn.jsdelivr.net')
CSP_CONNECT_SRC = ("'self'", 'https://cdn.armenu.uz')
CSP_IMG_SRC = ("'self'", 'data:', 'blob:', 'https://cdn.armenu.uz')
```

✅ **Tekshirish:** modal ochilib, taom aylanadi. Telefon konsolida:
```javascript
document.querySelector('model-viewer').getAttribute('ar-scale')
// "fixed"   ⚡ "auto" bo'lsa — XATO
```

---

## V-123 — AR modal UI + progress

**Fayl:** `templates/guest/ar_modal.html`

```html
{% load i18n %}<!-- AR modal — menyu sahifasiga include qilinadi -->
<div class="ar-modal" id="arModal" hidden aria-modal="true" role="dialog">
  <div class="ar-modal__backdrop" data-ar-close></div>

  <div class="ar-modal__sheet">
    <header class="ar-modal__head">
      <h3 class="ar-modal__title" id="arTitle">—</h3>
      <button class="ar-modal__x" data-ar-close aria-label="{% trans 'Yopish' %}">✕</button>
    </header>

    <!-- 1. Yuklanmoqda -->
    <div class="ar-state" id="arLoading">
      <div class="ar-spin"></div>
      <p id="arLoadText">{% trans "3D model yuklanmoqda…" %}</p>
      <div class="ar-bar"><div class="ar-bar__fill" id="arBarFill"></div></div>
      <small id="arSize"></small>
    </div>

    <!-- 2. Ko'rish maydoni -->
    <div class="ar-stage" id="arStage" hidden></div>

    <!-- 3. 360° karusel (fallback 3) -->
    <div class="ar-360" id="ar360" hidden>
      <img id="ar360Img" alt="">
      <input type="range" id="ar360Range" min="0" max="23" value="0"
             aria-label="{% trans 'Aylantirish' %}">
      <p class="ar-hint">{% trans "Barmoq bilan suring" %}</p>
    </div>

    <!-- 4. Oddiy rasm (fallback 4) -->
    <div class="ar-plain" id="arPlain" hidden>
      <img id="arPlainImg" alt="">
      <p class="ar-note" id="arPlainNote"></p>
    </div>

    <!-- Ma'lumot chizig'i -->
    <div class="ar-meta" id="arMeta" hidden>
      <span>📏 <b id="arSizeCm">—</b> sm</span>
      <span id="arModeLbl">—</span>
    </div>

    <!-- ⚡ Konversiya tugmasi — AR dan keyin DARHOL savatga -->
    <footer class="ar-modal__foot">
      <button class="ar-add" id="arAddBtn">
        🛒 <span>{% trans "SAVATGA QO'SHISH" %}</span>
        <b id="arPrice"></b>
      </button>
    </footer>
  </div>
</div>
```

**Fayl:** `static/guest/css/ar.css`
```css
:root{
  --ar-bg:#fff; --ar-tx:#111827; --ar-mut:#6B7280; --ar-line:#E5E7EB;
  --ar-brand:#E85D2A; --ar-stage:#F3F4F6;
}
:root:not([data-theme="light"]){ @media (prefers-color-scheme: dark){
  --ar-bg:#151922; --ar-tx:#F3F4F6; --ar-mut:#9CA3AF; --ar-line:#262D3B;
  --ar-stage:#0E1116;
}}
[data-theme="dark"]{
  --ar-bg:#151922; --ar-tx:#F3F4F6; --ar-mut:#9CA3AF; --ar-line:#262D3B;
  --ar-stage:#0E1116;
}

.ar-modal{position:fixed;inset:0;z-index:9999;display:flex;
  align-items:flex-end;justify-content:center}
.ar-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6);
  backdrop-filter:blur(2px)}
.ar-modal__sheet{position:relative;width:100%;max-width:520px;
  background:var(--ar-bg);color:var(--ar-tx);
  border-radius:20px 20px 0 0;display:flex;flex-direction:column;
  max-height:92vh;animation:arUp .28s cubic-bezier(.2,.8,.2,1)}
@keyframes arUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@media(min-width:600px){
  .ar-modal{align-items:center}
  .ar-modal__sheet{border-radius:20px;max-height:88vh}
}

.ar-modal__head{display:flex;align-items:center;padding:14px 16px;
  border-bottom:1px solid var(--ar-line)}
.ar-modal__title{margin:0;font-size:17px;font-weight:700;flex:1}
.ar-modal__x{border:0;background:transparent;font-size:22px;color:var(--ar-mut);
  cursor:pointer;padding:4px 8px}

/* ⚡ Sahna — model shu yerda */
.ar-stage{flex:1;min-height:340px;background:var(--ar-stage);position:relative}
.ar-stage model-viewer{width:100%;height:100%;min-height:340px}

/* AR tugmasi (model-viewer slot) */
.ar-cta{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
  background:var(--ar-brand);color:#fff;border:0;border-radius:26px;
  padding:14px 22px;font-size:16px;font-weight:700;white-space:nowrap;
  box-shadow:0 6px 20px rgba(232,93,42,.4);cursor:pointer}
.ar-cta:active{transform:translateX(-50%) scale(.97)}

/* model-viewer progress slot */
.ar-progress{position:absolute;top:0;left:0;right:0;height:3px;background:transparent}
.ar-progress__bar{height:100%;background:var(--ar-brand);width:0;transition:width .2s}

/* Yuklanish holati */
.ar-state{padding:48px 24px;text-align:center;color:var(--ar-mut)}
.ar-spin{width:44px;height:44px;margin:0 auto 16px;border-radius:50%;
  border:3px solid var(--ar-line);border-top-color:var(--ar-brand);
  animation:arSpin .9s linear infinite}
@keyframes arSpin{to{transform:rotate(360deg)}}
.ar-bar{height:6px;background:var(--ar-line);border-radius:3px;overflow:hidden;
  margin:16px auto 8px;max-width:240px}
.ar-bar__fill{height:100%;width:0;background:var(--ar-brand);transition:width .25s}

/* 360° karusel */
.ar-360{padding:16px;text-align:center}
.ar-360 img{width:100%;max-height:340px;object-fit:contain;touch-action:none}
.ar-360 input{width:100%;margin-top:12px}
.ar-hint{color:var(--ar-mut);font-size:13px}

.ar-plain{padding:16px;text-align:center}
.ar-plain img{width:100%;border-radius:12px}
.ar-note{color:var(--ar-mut);font-size:13px;margin-top:10px}

.ar-meta{display:flex;gap:16px;justify-content:center;padding:10px;
  font-size:13px;color:var(--ar-mut);border-top:1px solid var(--ar-line)}
.ar-meta b{color:var(--ar-tx)}

.ar-modal__foot{padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top:1px solid var(--ar-line)}
.ar-add{width:100%;border:0;border-radius:14px;padding:16px;
  background:var(--ar-brand);color:#fff;font-size:17px;font-weight:800;
  display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.ar-add:active{transform:scale(.99)}
.ar-add b{margin-left:auto}
```

✅ **Tekshirish:** Modal pastdan chiqadi, dark va light rejimda to'g'ri
ko'rinadi, ✕ va fon bosilganda yopiladi.

---

## V-124 — ⚡ 4 bosqichli fallback zanjiri

**Fayl:** `static/guest/js/ar.js` (davomi)

> ⚡ Har bosqich pastroqqa tushadi, lekin mijoz **HECH QACHON bo'sh ekran
> ko'rmaydi**. Eng yomon holatda — chiroyli rasm.
>
> ```
> 1. To'liq AR   (WebXR / Quick Look / Scene Viewer)   ← eng yaxshi
> 2. 3D aylantirish (<model-viewer> AR'siz)            ← yaxshi
> 3. 360° karusel (24 kadr)                            ← qoniqarli
> 4. Oddiy yuqori sifatli rasm                         ← minimal
> ```

```javascript
(function (w) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let state = {dishId: null, data: null, mode: null, t0: 0, viewer: null, sent: false};

  /** ⚡ Asosiy kirish nuqtasi — "🎯 AR" tugmasi shuni chaqiradi */
  async function openAR(dishId, dishMeta) {
    state = {dishId, data: null, mode: null, t0: 0, viewer: null, sent: false,
             meta: dishMeta || {}};

    showModal();
    resetPanes();
    $('arTitle').textContent = (dishMeta && dishMeta.name) || '';
    $('arPrice').textContent = dishMeta && dishMeta.price
      ? Math.round(dishMeta.price).toLocaleString('ru-RU').replace(/,/g, ' ') : '';

    // --- Bosqich 0: qurilma imkoniyati ---
    const support = await ARDetect.detectARSupport();

    // --- Bosqich 0.5: server ma'lumoti ---
    let d;
    try {
      const r = await fetch(`/v1/ar/${dishId}/?lang=${w.LANG || 'uz'}`, {
        headers: {'X-Session-Id': localStorage.getItem('gs') || ''},
      });
      d = await r.json();
    } catch (_) {
      return fallbackImage(null, 'Tarmoq xatosi');
    }
    state.data = d;

    // ⚡ Model hali tayyor emas → rasm + "tayyorlanmoqda"
    if (!d.ready) {
      return fallbackImage(d, d.status === 'processing' || d.status === 'queued'
        ? '3D model tayyorlanmoqda…' : '');
    }

    $('arSizeCm').textContent = d.real_size_cm;
    $('arSize').textContent = d.glb_bytes
      ? (d.glb_bytes / 1048576).toFixed(1) + ' MB' : '';

    // ---- BOSQICH 1 va 2: model-viewer ----
    if (['webxr', 'quick-look', 'scene-viewer', '3d-only'].includes(support)) {
      try {
        await ARCore.loadModelViewer();
        return mount3D(d, support);
      } catch (e) {
        console.warn('[AR] model-viewer yiqildi:', e);
        // pastga tushamiz
      }
    }

    // ---- BOSQICH 3: 360° ----
    if (d.preview_360) return mount360(d, support);

    // ---- BOSQICH 4: rasm ----
    return fallbackImage(d, '');
  }

  /** ⚡ BOSQICH 1-2 — <model-viewer> */
  function mount3D(d, mode) {
    const stage = $('arStage');
    stage.innerHTML = '';
    const mv = ARCore.buildViewer(d, mode);
    stage.appendChild(mv);
    state.viewer = mv;
    state.mode = mode;

    $('arModeLbl').textContent = {
      'webxr': '🥽 WebXR AR', 'quick-look': '📱 AR (iOS)',
      'scene-viewer': '📱 AR (Android)', '3d-only': '🔄 3D',
    }[mode] || mode;

    mv.addEventListener('progress', (e) => {
      const p = Math.round(e.detail.totalProgress * 100);
      $('arBarFill').style.width = p + '%';
      const bar = mv.querySelector('.ar-progress__bar');
      if (bar) bar.style.width = p + '%';
    });

    mv.addEventListener('load', () => {
      show('arStage'); show('arMeta');
      state.t0 = Date.now();                 // ⚡ ko'rish taymeri boshlandi
      // Modelning haqiqiy o'lchamini konsolga chiqaramiz (nazorat uchun)
      try {
        const dim = mv.getDimensions();
        console.info('[AR] model o\'lchami (m):', dim,
                     '| kutilgan:', d.scale_m);
      } catch (_) {}
    });

    // ⚡ 3D yuklanmadi → 360° yoki rasmga tushamiz
    mv.addEventListener('error', (e) => {
      console.warn('[AR] model yuklanmadi:', e);
      if (d.preview_360) mount360(d, '360');
      else fallbackImage(d, '3D yuklanmadi');
    });

    // ⚡ AR rejimga kirdi/chiqdi — analitika shu yerda
    mv.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'session-started') {
        state.mode = mode;
        state.t0 = state.t0 || Date.now();
      }
      if (e.detail.status === 'not-presenting' && state.t0) {
        sendView();                          // AR dan chiqdi → yozamiz
      }
      if (e.detail.status === 'failed') {
        console.warn('[AR] AR sessiya ochilmadi — 3D rejimda qolamiz');
      }
    });

    // Zaxira taymer: 25 s dan keyin ham yuklanmasa
    setTimeout(() => {
      if ($('arStage').hidden) {
        if (d.preview_360) mount360(d, '360');
        else fallbackImage(d, 'Yuklash uzoq davom etdi');
      }
    }, 25000);
  }

  /** ⚡ BOSQICH 3 — 360° karusel (24 kadr, WebGL kerak emas) */
  function mount360(d, mode) {
    state.mode = '360';
    state.t0 = Date.now();
    const base = d.preview_360;              // '.../osh_360_{i}.webp'
    const img = $('ar360Img');
    const rng = $('ar360Range');
    const frame = (i) => base.replace('{i}', String(i).padStart(2, '0'));

    // Oldindan yuklash
    for (let i = 0; i < 24; i++) { const p = new Image(); p.src = frame(i); }
    img.src = frame(0);

    rng.oninput = () => { img.src = frame(Number(rng.value)); };

    // Barmoq bilan surish
    let sx = 0, sv = 0;
    img.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX; sv = Number(rng.value);
    }, {passive: true});
    img.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - sx;
      let v = Math.round(sv + dx / 12) % 24;
      if (v < 0) v += 24;
      rng.value = v; img.src = frame(v);
    }, {passive: true});

    show('ar360'); show('arMeta');
    $('arModeLbl').textContent = '🔄 360°';
  }

  /** ⚡ BOSQICH 4 — oddiy rasm (hech qachon bo'sh ekran YO'Q) */
  function fallbackImage(d, note) {
    state.mode = 'image';
    state.t0 = Date.now();
    const src = (d && d.poster) || (state.meta && state.meta.image) || '';
    $('arPlainImg').src = src;
    $('arPlainImg').alt = (d && d.name) || '';
    $('arPlainNote').textContent = note || '';
    show('arPlain');
    if (d && d.ready) show('arMeta');
  }

  // ---- UI yordamchilari ----
  function showModal() { $('arModal').hidden = false; document.body.style.overflow = 'hidden'; }
  function closeModal() {
    sendView();
    $('arModal').hidden = true;
    document.body.style.overflow = '';
    $('arStage').innerHTML = '';
    state.viewer = null;
  }
  function resetPanes() {
    ['arStage', 'ar360', 'arPlain', 'arMeta'].forEach(id => $(id).hidden = true);
    $('arLoading').hidden = false;
    $('arBarFill').style.width = '0%';
  }
  function show(id) { $('arLoading').hidden = true; $(id).hidden = false; }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ar-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('arModal').hidden) closeModal();
  });

  // ⚡ Savatga qo'shish — ar_viewed=true bilan (konversiya o'lchanadi)
  $('arAddBtn') && ($('arAddBtn').onclick = () => {
    sendView(true);
    if (w.Cart && state.dishId) {
      w.Cart.add(state.dishId, 1, {ar_viewed: true});
    }
    closeModal();
  });

  // ---- Analitika (V-125) ----
  function sendView(converted) {
    if (state.sent || !state.t0 || !state.dishId) return;
    state.sent = true;
    const dur = Math.round((Date.now() - state.t0) / 1000);
    const body = JSON.stringify({
      dish_id: state.dishId,
      session_id: localStorage.getItem('gs') || '',
      table_id: Number(localStorage.getItem('table_id') || 0) || null,
      mode: state.mode || 'image',
      duration_sec: dur,
      device: ARDetect.device(),
      converted: !!converted,
    });
    // ⚡ sendBeacon — sahifa yopilsa ham yetib boradi
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/v1/ar/view/', new Blob([body], {type: 'application/json'}));
    } else {
      fetch('/v1/ar/view/', {method: 'POST', body,
        headers: {'Content-Type': 'application/json'}, keepalive: true}).catch(() => {});
    }
  }

  w.addEventListener('pagehide', () => sendView());

  w.openAR = openAR;
  w.ARView = {openAR, closeModal, sendView};
})(window);
```

✅ **Tekshirish (qo'lda 4 bosqich):**
```javascript
// 1. Normal → AR tugmasi ko'rinadi
// 2. WebGL o'chirilgan brauzer → 360° yoki rasm
// 3. Noto'g'ri GLB URL → 'error' → 360°/rasm
// 4. ready=false taom → "3D model tayyorlanmoqda" + rasm
```

---

## V-125 — `POST /v1/ar/view/` (analitika)

**Fayl:** `apps/ar3d/views.py` (davomi)

```python
from django.db.models import F


@api_view(['POST'])
@permission_classes([AllowAny])
def ar_view(request):
    """
    POST /v1/ar/view/
    {dish_id, session_id, table_id, mode, duration_sec, device, converted}

    ⚡ Yozuv YENGIL bo'lishi kerak — mijoz kutmasin. Og'ir agregatsiya
    'analytics' navbatida bajariladi.
    """
    rid = getattr(request, 'restaurant_id', None)
    if not rid:
        return Response({'ok': False}, status=status.HTTP_204_NO_CONTENT)

    from apps.menu.models import Dish
    try:
        dish_id = int(request.data.get('dish_id') or 0)
    except (TypeError, ValueError):
        return Response({'ok': False}, status=status.HTTP_204_NO_CONTENT)

    if not Dish.objects.filter(id=dish_id, restaurant_id=rid).exists():
        raise TenantMismatch({'dish_id': dish_id})

    mode = str(request.data.get('mode', '3d-only'))[:20]
    dur = max(0, min(3600, int(request.data.get('duration_sec') or 0)))
    device = str(request.data.get('device', ''))[:20]
    sid = str(request.data.get('session_id', ''))[:64]
    converted = bool(request.data.get('converted'))

    guest = table = None
    if sid:
        from apps.guest.models import GuestSession
        gs = GuestSession.objects.select_related('guest', 'table').filter(
            session_key=sid, restaurant_id=rid).first()
        if gs:
            guest, table = gs.guest, gs.table

    ARView.objects.create(
        restaurant_id=rid, dish_id=dish_id, guest=guest, table=table,
        session_id=sid, mode=mode, duration_sec=dur, device=device,
        converted=converted,
    )

    # ⚡ Denorm hisoblagichlar (A-04 kartasida darhol ko'rinadi)
    upd = {'view_count': F('view_count') + 1}
    if converted:
        upd['convert_count'] = F('convert_count') + 1
    DishModel3D.objects.filter(dish_id=dish_id).update(**upd)

    from core.queue import enqueue
    enqueue('analytics', 'ar_view', dish_id=dish_id, restaurant_id=rid,
            mode=mode, duration_sec=dur, converted=converted)

    return Response({'ok': True}, status=status.HTTP_201_CREATED)
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/ar/view/ -H 'Content-Type: application/json' \
  -H 'Host: registon.localhost' \
  -d '{"dish_id":1,"session_id":"gs_test","mode":"quick-look","duration_sec":24,"device":"ios"}'
# {"ok":true}
python manage.py shell -c "
from apps.ar3d.models import ARView; print(ARView.objects.count())"
```

---

## V-126 — ⚡ Kutubxona qidiruvi (nom + alias)

**Fayl:** `apps/ar3d/services/library.py` (1-qism)

> ⚡ **Bu funksiya har generatsiyada $0.5 tejaydi.** "Palov" deb yozgan
> restoran "osh" modelini topishi kerak — shuning uchun 3 bosqichli
> moslashtirish: aniq kalit → alias → normalizatsiya + Levenshtein.

```python
import logging
import re
import unicodedata

from django.db.models import Q

from apps.ar3d.models import DishLibrary

log = logging.getLogger('ar3d.library')

# Kirill ↔ lotin (o'zbekcha)
CYR2LAT = str.maketrans({
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ц': 's', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
    'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
})

# Ko'p uchraydigan yozilish farqlari
NORMALIZE = [
    (r"o['`ʻʼ‘’]", 'o'), (r"g['`ʻʼ‘’]", 'g'),
    (r'\bsh\b', 'sh'), (r'ch', 'ch'),
    (r'[^a-z0-9\s]', ' '), (r'\s+', ' '),
]


def normalize(text: str) -> str:
    """⚡ "O'sh", "Ош", "OSH", "o`sh" → "osh" """
    if not text:
        return ''
    s = unicodedata.normalize('NFKD', str(text)).lower().strip()
    s = s.translate(CYR2LAT)
    for pat, rep in NORMALIZE:
        s = re.sub(pat, rep, s)
    return s.strip()


def _levenshtein(a: str, b: str) -> int:
    """Kichik matnlar uchun — tashqi kutubxonasiz"""
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def find_by_name(name: str, category_key: str = '', min_quality: int = 1):
    """
    ⚡ 3 bosqichli qidiruv. Topsa (DishLibrary, ishonch 0-1) qaytaradi.

    1. Aniq kalit / nom mosligi        → 1.00
    2. Alias massivida bor             → 0.95
    3. Normalizatsiya + tahrir masofasi → 0.70-0.90
    """
    if not name:
        return None, 0.0

    norm = normalize(name)
    if not norm:
        return None, 0.0

    qs = DishLibrary.objects.filter(is_active=True, quality__gte=min_quality)
    if category_key:
        qs = qs.filter(Q(category_key=category_key) | Q(category_key=''))

    # --- 1. Aniq moslik ---
    exact = qs.filter(
        Q(key=norm.replace(' ', '-')) |
        Q(name_uz__iexact=name) | Q(name_ru__iexact=name) | Q(name_en__iexact=name)
    ).order_by('-quality', '-used_by_count').first()
    if exact:
        log.info(f'[lib] aniq moslik: "{name}" → {exact.key}')
        return exact, 1.0

    # --- 2. Alias (GIN indeks orqali tez) ---
    alias_hit = qs.filter(
        Q(aliases__contains=[norm]) | Q(aliases__contains=[name.lower()])
    ).order_by('-quality', '-used_by_count').first()
    if alias_hit:
        log.info(f'[lib] alias moslik: "{name}" → {alias_hit.key}')
        return alias_hit, 0.95

    # --- 3. Fuzzy (nomlar ro'yxatida) ---
    best, best_score = None, 0.0
    for lib in qs.only('id', 'key', 'name_uz', 'name_ru', 'name_en',
                       'aliases', 'quality', 'used_by_count')[:2000]:
        cands = [lib.key.replace('-', ' '), lib.name_uz, lib.name_ru, lib.name_en]
        cands += list(lib.aliases or [])
        for c in cands:
            cn = normalize(c)
            if not cn:
                continue
            if cn in norm or norm in cn:          # qismiy moslik
                score = 0.90
            else:
                dist = _levenshtein(norm, cn)
                maxlen = max(len(norm), len(cn)) or 1
                score = 1.0 - dist / maxlen
            if score > best_score:
                best, best_score = lib, score

    if best and best_score >= 0.78:               # ⚡ chegara — pastroq = noto'g'ri moslik
        log.info(f'[lib] fuzzy moslik: "{name}" → {best.key} ({best_score:.2f})')
        return best, round(best_score, 2)

    log.info(f'[lib] "{name}" kutubxonada topilmadi')
    return None, 0.0
```

✅ **Test:** `tests/test_library_search.py`
```python
import pytest
from apps.ar3d.services.library import normalize, find_by_name


def test_normalize_variants():
    assert normalize("O'sh") == 'osh'
    assert normalize('Ош') == 'osh'
    assert normalize('OSH  ') == 'osh'
    assert normalize("Lag'mon") == 'lagmon'


@pytest.mark.django_db
def test_alias_match(lib_osh):
    lib, score = find_by_name('Палов')
    assert lib is not None and lib.key == 'osh-toshkent'
    assert score >= 0.9


@pytest.mark.django_db
def test_fuzzy_match(lib_osh):
    lib, score = find_by_name('Osh (Toshkent usulida)')
    assert lib is not None


@pytest.mark.django_db
def test_no_false_positive(lib_osh):
    lib, score = find_by_name('Tiramisu')
    assert lib is None
```

---

## V-127 — ⚡ Semantik qidiruv (embedding + pgvector cosine)

**Fayl:** `apps/ar3d/services/library.py` (davomi)

> ⚡ Nom bo'yicha topilmadi, lekin ma'no bo'yicha topilishi mumkin:
> "guruch bilan qo'y go'shti" → **osh**. Embedding + cosine masofa.

```python
from pgvector.django import CosineDistance

EMB_DIM = 768
SEMANTIC_THRESHOLD = 0.28        # ⚡ cosine masofa; kichikroq = yaqinroq


def build_embedding_text(name: str, desc: str = '', ingredients: str = '',
                         category: str = '') -> str:
    """Embedding uchun matn — nom eng muhim, shuning uchun 2 marta"""
    parts = [name, name, category, desc[:300], ingredients[:200]]
    return ' | '.join(p for p in parts if p)


def get_embedding(text: str):
    """
    MCP orqali embedding oladi (Gemini/OpenAI — arzon).
    Xato bo'lsa None qaytadi — semantik qidiruv shunchaki o'tkazib yuboriladi.
    """
    from apps.ai.mcp.router import mcp
    from apps.ai.mcp.base import MCPRequest
    try:
        resp = mcp.run(MCPRequest(task='embedding', prompt=text[:2000], timeout=20))
        if not resp.ok or not resp.content:
            log.warning(f'[lib] embedding olinmadi: {resp.error}')
            return None
        vec = resp.content if isinstance(resp.content, list) else resp.content.get('embedding')
        if not vec or len(vec) != EMB_DIM:
            log.warning(f'[lib] embedding o\'lchami noto\'g\'ri: {len(vec) if vec else 0}')
            return None
        return vec
    except Exception as e:
        log.warning(f'[lib] embedding xatosi: {e}')
        return None


def find_semantic(name: str, desc: str = '', ingredients: str = '',
                  category_key: str = '', top_k: int = 5):
    """
    ⚡ Semantik qidiruv — pgvector HNSW indeks orqali.
    Qaytaradi: (DishLibrary | None, ishonch 0-1)
    """
    text = build_embedding_text(name, desc, ingredients, category_key)
    vec = get_embedding(text)
    if vec is None:
        return None, 0.0

    qs = DishLibrary.objects.filter(is_active=True, embedding__isnull=False)
    if category_key:
        qs = qs.filter(category_key=category_key)

    rows = (qs.annotate(dist=CosineDistance('embedding', vec))
              .order_by('dist')[:top_k])
    rows = list(rows)
    if not rows:
        return None, 0.0

    best = rows[0]
    dist = float(best.dist)
    if dist > SEMANTIC_THRESHOLD:
        log.info(f'[lib] semantik: eng yaqini {best.key} (dist={dist:.3f}) — uzoq')
        return None, 0.0

    confidence = round(max(0.0, 1.0 - dist), 2)
    log.info(f'[lib] ⚡ semantik moslik: "{name}" → {best.key} '
             f'(dist={dist:.3f}, ishonch={confidence})')
    return best, confidence


def find_best(dish, min_confidence: float = 0.78):
    """
    ⚡ To'liq qidiruv zanjiri — worker shuni chaqiradi.
      1. Nom/alias (bepul, tez)
      2. Semantik (arzon: ~$0.0001)
    Qaytaradi: (DishLibrary | None, ishonch, usul)
    """
    cat_key = getattr(dish.category, 'library_key', '') or ''

    lib, score = find_by_name(dish.name_uz, category_key=cat_key)
    if lib and score >= min_confidence:
        return lib, score, 'name'

    lib2, score2 = find_semantic(
        dish.name_uz, desc=dish.desc_uz or '',
        ingredients=dish.ingredients_uz or '', category_key=cat_key)
    if lib2 and score2 >= min_confidence:
        return lib2, score2, 'semantic'

    return None, max(score, score2), 'none'
```

✅ **Test:** `tests/test_library_semantic.py`
```python
import pytest
from unittest.mock import patch
from apps.ar3d.services.library import find_semantic, build_embedding_text


def test_embedding_text_weights_name():
    t = build_embedding_text('Osh', 'guruch', 'go\'sht', 'national')
    assert t.count('Osh') == 2          # ⚡ nom 2 marta


@pytest.mark.django_db
def test_semantic_returns_none_without_embedding(lib_osh):
    with patch('apps.ar3d.services.library.get_embedding', return_value=None):
        lib, score = find_semantic('guruchli taom')
    assert lib is None and score == 0.0
```

---

## V-128 — Kutubxonadan nusxa olish

**Fayl:** `apps/ar3d/services/library.py` (davomi)

> ⚡ **Fayl KO'CHIRILMAYDI** — kutubxona CDN URL'i to'g'ridan-to'g'ri
> ishlatiladi. Nusxa olish = 5 soniya, 0 xarajat, 0 disk.

```python
from django.db import transaction
from django.utils import timezone


def copy_from_library(dish, lib: DishLibrary, real_size_cm=None, actor=None):
    """
    ⚡ Kutubxona modelini restoran taomiga biriktiradi.
    Fayl nusxalanmaydi — CDN URL ulashiladi (0 xarajat, 0 disk).

    real_size_cm berilsa — restoran o'z laganining o'lchamini kiritgan
    (masalan katta lagan 38 sm) → shu qiymat ustun.
    """
    from apps.ar3d.models import DishModel3D
    from core.ws import ws_send, g_admin

    size = real_size_cm if real_size_cm else lib.real_size_cm

    with transaction.atomic():
        m3d, _created = DishModel3D.objects.update_or_create(
            dish=dish,
            defaults=dict(
                restaurant_id=dish.restaurant_id,
                library=lib,
                glb_url=lib.glb_url,
                usdz_url=lib.usdz_url,
                poster_url=lib.poster_url,
                preview_360=lib.preview_360,
                real_size_cm=size,            # ⚡ real o'lcham
                glb_bytes=lib.glb_bytes,
                usdz_bytes=lib.usdz_bytes,
                poly_count=lib.poly_count,
                status='ready',
                source='library',
                progress=100,
                error_msg='',
                ready_at=timezone.now(),
            ))
        lib.bump_usage()

    log.info(f'[lib] ⚡ BEPUL nusxa: dish#{dish.id} ← {lib.key} '
             f'({size} sm) — 0 xarajat')

    ws_send(g_admin(dish.restaurant_id), 'model3d.ready', {
        'dish_id': dish.id, 'dish_name': dish.name_uz,
        'source': 'library', 'library_key': lib.key,
        'real_size_cm': float(size), 'cost_usd': 0.0,
    })
    return m3d
```

✅ **Test:** `tests/test_library_copy.py`
```python
import pytest
from apps.ar3d.services.library import copy_from_library


@pytest.mark.django_db
def test_copy_is_free_and_instant(dish, lib_osh):
    m = copy_from_library(dish, lib_osh)
    assert m.status == 'ready'
    assert m.source == 'library'
    assert m.glb_url == lib_osh.glb_url          # ⚡ URL ulashildi, fayl ko'chmadi
    assert not m.glb                              # lokal fayl YO'Q
    lib_osh.refresh_from_db()
    assert lib_osh.used_by_count == 1
    dish.refresh_from_db()
    assert dish.has_3d is True                    # ⚡ signal ishladi


@pytest.mark.django_db
def test_restaurant_custom_size_wins(dish, lib_osh):
    m = copy_from_library(dish, lib_osh, real_size_cm=38)
    assert float(m.real_size_cm) == 38.0
    assert m.size_m == 0.38                       # ⚡ metrda
```

---

## V-129 — ⚡ AI 3D generatsiya (MCP orqali Meshy → Tripo → Rodin)

**Fayl:** `apps/ar3d/services/generate.py`

> ⚡ 3 ta provayder zanjiri. Birinchisi arzon ($0.5), oxirgisi sifatli ($1.5).
> Har biri **circuit breaker** bilan himoyalangan — yiqilgan provayder
> qayta-qayta chaqirilmaydi.
>
> ⛔ Bu funksiya **3-10 daqiqa** ishlaydi. FAQAT worker'da chaqiriladi.

```python
import logging
import os
import tempfile
import time

import requests
from django.conf import settings

from core.resilience import CircuitBreaker, retry
from core.exceptions import ServiceUnavailable

log = logging.getLogger('ar3d.generate')

# ⚡ Provayder zanjiri: arzondan qimmatga
PROVIDER_CHAIN = [
    ('meshy', 0.50),
    ('tripo', 0.80),
    ('rodin', 1.50),
]

DOWNLOAD_TIMEOUT = 180
MAX_RAW_BYTES = 120 * 1024 * 1024      # xom GLB 120 MB gacha bo'lishi mumkin


def _breaker(name):
    return CircuitBreaker(f'ai3d:{name}', fail_threshold=3, timeout=300,
                          success_threshold=1)


def generate_3d(images: list, dish_name: str = '', job=None) -> dict:
    """
    ⚡ Rasmdan 3D model yaratadi.

    Qaytaradi: {'glb_path': '/tmp/xxx.glb', 'provider': 'meshy',
                'cost_usd': 0.5, 'thumbnail': '...'}
    Hech biri ishlamasa → ServiceUnavailable.
    """
    if not images:
        raise ServiceUnavailable({'reason': 'no_images'})

    from apps.ai.mcp.router import mcp
    from apps.ai.mcp.base import MCPRequest

    errors = {}
    for name, cost in PROVIDER_CHAIN:
        cb = _breaker(name)
        if cb.is_open():
            log.warning(f'[3d] {name} — circuit OPEN, o\'tkazib yuborildi')
            errors[name] = 'circuit_open'
            continue

        if job:
            job.provider = name
            job.set_stage('generate', progress=25)

        t0 = time.time()
        try:
            log.info(f'[3d] {name} chaqirilmoqda — "{dish_name}" ({len(images)} rasm)')
            resp = mcp.run(MCPRequest(
                task='image_to_3d',
                images=images,
                prompt=dish_name,
                timeout=600,
                extra={'provider': name, 'target_polycount': 40000,
                       'enable_pbr': True, 'should_remesh': True},
            ))

            if not resp.ok or not resp.content:
                cb.on_failure()
                errors[name] = resp.error or 'empty'
                log.warning(f'[3d] {name} xato: {errors[name]}')
                continue

            glb_url = (resp.content.get('glb_url') if isinstance(resp.content, dict)
                       else None)
            if not glb_url:
                cb.on_failure()
                errors[name] = 'no_glb_url'
                continue

            path = _download(glb_url)
            cb.on_success()
            took = int(time.time() - t0)
            log.info(f'[3d] ✅ {name} — {os.path.getsize(path)/1048576:.1f} MB, {took}s')

            return {
                'glb_path': path,
                'provider': name,
                'cost_usd': float(resp.cost_usd or cost),
                'thumbnail': (resp.content.get('thumbnail')
                              if isinstance(resp.content, dict) else ''),
                'latency_sec': took,
            }

        except Exception as e:
            cb.on_failure()
            errors[name] = str(e)[:200]
            log.warning(f'[3d] {name} istisno: {e}')

    log.error(f'[3d] ⛔ HAMMA provayder yiqildi: {errors}')
    raise ServiceUnavailable({'service': '3d_generation', 'errors': errors})


@retry(times=3, delay=2, backoff=2, exceptions=(requests.RequestException,))
def _download(url: str) -> str:
    """GLB ni vaqtinchalik faylga yuklab oladi (stream — xotira tejaladi)"""
    fd, path = tempfile.mkstemp(suffix='.glb', prefix='armenu_raw_')
    os.close(fd)
    total = 0
    with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(1024 * 256):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_RAW_BYTES:
                    f.close(); os.unlink(path)
                    raise ValueError(f'GLB juda katta: >{MAX_RAW_BYTES//1048576} MB')
                f.write(chunk)
    if total < 1024:
        os.unlink(path)
        raise ValueError('GLB bo\'sh yoki buzuq')
    return path


def prepare_images(image_paths_or_urls: list) -> list:
    """
    ⚡ Provayderlar URL kutadi. Lokal fayllar bo'lsa — media URL'ga aylantiriladi.
    Maksimum 6 ta rasm (ko'pi foyda bermaydi, narx oshadi).
    """
    out = []
    base = getattr(settings, 'PUBLIC_BASE_URL', '').rstrip('/')
    for p in image_paths_or_urls[:6]:
        p = str(p)
        if p.startswith('http://') or p.startswith('https://'):
            out.append(p)
        elif base:
            out.append(f'{base}{p if p.startswith("/") else "/" + p}')
    return out
```

**`.env` ga:**
```
MESHY_API_KEY=msy_...
TRIPO_API_KEY=tsk_...
RODIN_API_KEY=
PUBLIC_BASE_URL=https://armenu.uz
```

✅ **Test:** `tests/test_generate_chain.py`
```python
import pytest
from unittest.mock import patch, MagicMock
from core.exceptions import ServiceUnavailable
from apps.ar3d.services.generate import generate_3d, prepare_images


def test_prepare_images_limits_to_six(settings):
    settings.PUBLIC_BASE_URL = 'https://armenu.uz'
    out = prepare_images([f'/media/d{i}.jpg' for i in range(10)])
    assert len(out) == 6
    assert out[0] == 'https://armenu.uz/media/d0.jpg'


@pytest.mark.django_db
def test_falls_through_chain():
    """⚡ Meshy yiqildi → Tripo ishladi"""
    calls = []

    def fake_run(req):
        p = req.extra['provider']
        calls.append(p)
        if p == 'meshy':
            return MagicMock(ok=False, error='500', content=None)
        return MagicMock(ok=True, content={'glb_url': 'https://x/m.glb'},
                         cost_usd=0.8, error='')

    with patch('apps.ai.mcp.router.mcp.run', side_effect=fake_run), \
         patch('apps.ar3d.services.generate._download', return_value='/tmp/x.glb'), \
         patch('os.path.getsize', return_value=5_000_000):
        res = generate_3d(['https://x/a.jpg'], 'Norin')

    assert calls == ['meshy', 'tripo']
    assert res['provider'] == 'tripo'


@pytest.mark.django_db
def test_all_fail_raises():
    with patch('apps.ai.mcp.router.mcp.run',
               return_value=MagicMock(ok=False, error='down', content=None)):
        with pytest.raises(ServiceUnavailable):
            generate_3d(['https://x/a.jpg'], 'Norin')
```

---

## V-130 — ⚡ GLB optimizatsiya (gltf-transform) — 3 MB chegarasi

**Fayl:** `apps/ar3d/services/optimize.py` (1-qism)

> Xom AI modeli 30-80 MB bo'ladi. 3G da bu **2 daqiqa** yuklanadi — mijoz
> ketib qoladi. Maqsad: **≤ 3 MB** (8 soniya).

**O'rnatish (bir marta):**
```bash
sudo npm install -g @gltf-transform/cli@4
gltf-transform --version   # 4.x
```

```python
import json
import logging
import os
import shutil
import subprocess

from django.conf import settings

log = logging.getLogger('ar3d.optimize')

MAX_GLB = getattr(settings, 'MAX_GLB_BYTES', 3 * 1024 * 1024)
GT = shutil.which('gltf-transform') or '/usr/local/bin/gltf-transform'
STEP_TIMEOUT = 300


def _run(args, label):
    """gltf-transform bosqichini ishga tushiradi"""
    log.debug(f'[opt] {label}: {" ".join(args)}')
    p = subprocess.run(args, capture_output=True, text=True, timeout=STEP_TIMEOUT)
    if p.returncode != 0:
        raise RuntimeError(f'{label} xato: {p.stderr[-500:]}')
    return p.stdout


def inspect_glb(path: str) -> dict:
    """Poligon soni, tekstura, material — nazorat uchun"""
    try:
        out = _run([GT, 'inspect', path, '--format', 'json'], 'inspect')
        j = json.loads(out)
        meshes = j.get('meshes', {}).get('properties', [])
        tris = sum(int(m.get('glPrimitives', 0)) for m in meshes)
        tex = j.get('textures', {}).get('properties', [])
        mats = j.get('materials', {}).get('properties', [])
        return {'triangles': tris, 'textures': len(tex), 'materials': len(mats),
                'bytes': os.path.getsize(path)}
    except Exception as e:
        log.warning(f'[opt] inspect ishlamadi: {e}')
        return {'triangles': 0, 'textures': 0, 'materials': 0,
                'bytes': os.path.getsize(path)}


def optimize_glb(input_path: str, output_path: str, real_size_cm: float,
                 job=None) -> dict:
    """
    ⚡ To'liq optimizatsiya quvuri:
      1. Tekstura 1024px         (xotira)
      2. Poligon ≤60k (simplify) (eski telefonlar)
      3. Tekstura → WebP         (hajm −60%)
      4. Draco siqish            (geometriya −70%)
      5. ⚡ Real o'lchamga masshtablash + tag Y=0   (V-131)
      6. Hajm tekshiruvi → kerak bo'lsa AGRESSIV qayta

    Qaytaradi: {'bytes':..,'triangles':..,'ok':True}
    """
    tmp_a = output_path + '.a.glb'
    tmp_b = output_path + '.b.glb'
    before = inspect_glb(input_path)
    log.info(f'[opt] boshlanish: {before["bytes"]/1048576:.1f} MB, '
             f'{before["triangles"]} tri')

    if job:
        job.set_stage('optimize', progress=50)

    try:
        # 1. Tekstura o'lchami
        _run([GT, 'resize', input_path, tmp_a,
              '--width', '1024', '--height', '1024'], 'resize')

        # 2. Poligon kamaytirish (⚡ ratio moslashuvchan)
        ratio = '0.5' if before['triangles'] > 120000 else '0.75'
        try:
            _run([GT, 'simplify', tmp_a, tmp_b,
                  '--ratio', ratio, '--error', '0.001'], 'simplify')
        except RuntimeError as e:
            log.warning(f'[opt] simplify o\'tkazib yuborildi: {e}')
            shutil.copy(tmp_a, tmp_b)

        # 3. WebP tekstura
        try:
            _run([GT, 'webp', tmp_b, tmp_a, '--quality', '85'], 'webp')
        except RuntimeError as e:
            log.warning(f'[opt] webp o\'tkazib yuborildi: {e}')
            shutil.copy(tmp_b, tmp_a)

        # 4. Draco siqish
        _run([GT, 'draco', tmp_a, output_path,
              '--quantize-position', '14', '--quantize-normal', '10',
              '--quantize-texcoord', '12'], 'draco')

        # 5. ⚡ REAL O'LCHAM (V-131) — bu bosqich AR uchun HAYOTIY
        if job:
            job.set_stage('scale', progress=62)
        scale_and_center(output_path, real_size_cm / 100.0)

        # 6. Hajm nazorati
        size = os.path.getsize(output_path)
        if size > MAX_GLB:
            log.warning(f'[opt] {size/1048576:.1f} MB > 3 MB — AGRESSIV rejim')
            aggressive_optimize(output_path, real_size_cm)
            size = os.path.getsize(output_path)

        after = inspect_glb(output_path)
        ok = size <= MAX_GLB
        log.info(f'[opt] {"✅" if ok else "⚠️"} natija: {size/1048576:.2f} MB, '
                 f'{after["triangles"]} tri '
                 f'(−{100 - 100*size//max(before["bytes"],1)}%)')

        return {'bytes': size, 'triangles': after['triangles'],
                'textures': after['textures'], 'ok': ok,
                'before_bytes': before['bytes']}

    finally:
        for f in (tmp_a, tmp_b):
            if os.path.exists(f):
                os.unlink(f)


def aggressive_optimize(path: str, real_size_cm: float):
    """
    ⚡ 3 MB dan katta qolsa — sifatni bosqichma-bosqich pasaytiramiz.
    Har urinishdan keyin qayta masshtablash SHART (fayl qayta yozildi).
    """
    steps = [
        (['resize', '--width', '512', '--height', '512'], 'resize-512'),
        (['simplify', '--ratio', '0.35', '--error', '0.005'], 'simplify-035'),
        (['webp', '--quality', '65'], 'webp-65'),
        (['resize', '--width', '256', '--height', '256'], 'resize-256'),
        (['simplify', '--ratio', '0.20', '--error', '0.02'], 'simplify-020'),
    ]
    tmp = path + '.ag.glb'
    for args, label in steps:
        try:
            _run([GT, args[0], path, tmp] + args[1:], label)
            shutil.move(tmp, path)
            scale_and_center(path, real_size_cm / 100.0)   # ⚡ har safar qayta
            size = os.path.getsize(path)
            log.info(f'[opt] agressiv {label} → {size/1048576:.2f} MB')
            if size <= MAX_GLB:
                return
        except Exception as e:
            log.warning(f'[opt] agressiv {label} xato: {e}')
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
    log.error(f'[opt] ⛔ 3 MB ga tushirib bo\'lmadi: '
              f'{os.path.getsize(path)/1048576:.2f} MB')
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.ar3d.services.optimize import optimize_glb, inspect_glb
r = optimize_glb('/tmp/raw_osh.glb', '/tmp/osh.glb', 32.0)
print(r)"
# {'bytes': 2148361, 'triangles': 41230, 'ok': True, ...}
ls -lh /tmp/osh.glb    # ≤ 3.0M bo'lishi SHART
```

---

## V-131 — ⚡⚡ REAL O'LCHAMGA MASSHTABLASH — AR NING ENG MUHIM QISMI

**Fayl:** `apps/ar3d/services/optimize.py` (davomi)

> ⛔ **Bu funksiya noto'g'ri ishlasa — butun AR g'oyasi o'ladi.**
> Mijoz "haqiqiy o'lchamda ko'ryapman" deb ishonadi. Osh lagani AR'da
> **aniq 32 sm** bo'lishi kerak — 20 sm ham, 1 metr ham emas.
>
> 3 ta shart:
> 1. Eng katta **gorizontal** o'lcham (X yoki Z) = `target_size_m`
> 2. Model **tagi Y = 0** — stolga to'g'ri qo'yiladi, botmaydi/uchmaydi
> 3. Markaz X va Z bo'yicha 0 — AR'da barmoq qo'ygan joyga tushadi

```python
import numpy as np
from pygltflib import GLTF2


def _accessor_minmax(gltf, acc_idx):
    """glTF accessor'da min/max bor — tez yo'l (buffer o'qimasdan)"""
    acc = gltf.accessors[acc_idx]
    if acc.min and acc.max and len(acc.min) >= 3:
        return np.array(acc.min[:3], dtype=float), np.array(acc.max[:3], dtype=float)
    return None, None


def _node_matrix(node):
    """Node'ning lokal transformatsiya matritsasi"""
    if node.matrix:
        return np.array(node.matrix, dtype=float).reshape(4, 4).T
    m = np.eye(4)
    if node.scale:
        m[:3, :3] = m[:3, :3] @ np.diag(node.scale)
    if node.rotation:
        x, y, z, wq = node.rotation
        r = np.array([
            [1-2*(y*y+z*z), 2*(x*y-z*wq), 2*(x*z+y*wq)],
            [2*(x*y+z*wq), 1-2*(x*x+z*z), 2*(y*z-x*wq)],
            [2*(x*z-y*wq), 2*(y*z+x*wq), 1-2*(x*x+y*y)],
        ], dtype=float)
        m[:3, :3] = r @ m[:3, :3]
    if node.translation:
        m[:3, 3] = node.translation
    return m


def compute_bbox(gltf: GLTF2):
    """
    ⚡ Butun sahnaning chegara qutisi (bounding box), node
    transformatsiyalarini hisobga olgan holda.
    Qaytaradi: (min[3], max[3])
    """
    scene = gltf.scenes[gltf.scene or 0]
    lo = np.array([np.inf] * 3)
    hi = np.array([-np.inf] * 3)

    def walk(node_idx, parent):
        nonlocal lo, hi
        node = gltf.nodes[node_idx]
        world = parent @ _node_matrix(node)

        if node.mesh is not None:
            for prim in gltf.meshes[node.mesh].primitives:
                pos = prim.attributes.POSITION
                if pos is None:
                    continue
                amin, amax = _accessor_minmax(gltf, pos)
                if amin is None:
                    continue
                # 8 ta burchakni transformatsiya qilamiz
                for cx in (amin[0], amax[0]):
                    for cy in (amin[1], amax[1]):
                        for cz in (amin[2], amax[2]):
                            p = world @ np.array([cx, cy, cz, 1.0])
                            lo = np.minimum(lo, p[:3])
                            hi = np.maximum(hi, p[:3])

        for child in (node.children or []):
            walk(child, world)

    for root in (scene.nodes or []):
        walk(root, np.eye(4))

    if not np.all(np.isfinite(lo)):
        raise ValueError('bbox hisoblanmadi — POSITION accessor min/max yo\'q')
    return lo, hi


def scale_and_center(glb_path: str, target_size_m: float):
    """
    ⚡⚡ AR 1:1 chiqishining KALITI.

      1. Bounding box hisoblanadi
      2. Eng katta GORIZONTAL o'lcham (X yoki Z) target_size_m ga tenglashtiriladi
      3. Model tagi Y=0 ga tushiriladi  ← stolga to'g'ri qo'yiladi
      4. X va Z markazlashtiriladi     ← barmoq qo'ygan joyga tushadi

    ⚠️ Nima uchun gorizontal? Lagan 32 sm — bu DIAMETR (X/Z),
       balandlik emas. Balandlik bo'yicha masshtablasak lagan
       tarelka o'rniga vaza bo'lib qoladi.
    """
    if target_size_m <= 0 or target_size_m > 3.0:
        raise ValueError(f'target_size_m mantiqsiz: {target_size_m}')

    gltf = GLTF2().load(glb_path)
    lo, hi = compute_bbox(gltf)
    size = hi - lo
    center = (hi + lo) / 2.0

    current_max = float(max(size[0], size[2]))       # ⚡ X yoki Z (gorizontal)
    if current_max <= 1e-9:
        raise ValueError('model gorizontal o\'lchamsiz (yassi?)')

    scale = target_size_m / current_max

    # ⚡ Barcha ildiz node'larni bitta yangi ildiz ostiga yig'amiz —
    #    shunda bitta transformatsiya butun modelga ta'sir qiladi.
    from pygltflib import Node
    scene = gltf.scenes[gltf.scene or 0]
    old_roots = list(scene.nodes or [])

    wrapper = Node(
        name='ARMENU_scale_root',
        children=old_roots,
        scale=[scale, scale, scale],
        translation=[
            float(-center[0] * scale),      # X markaz → 0
            float(-lo[1] * scale),          # ⚡⚡ TAG Y=0
            float(-center[2] * scale),      # Z markaz → 0
        ],
    )
    gltf.nodes.append(wrapper)
    scene.nodes = [len(gltf.nodes) - 1]

    gltf.save(glb_path)

    final = size * scale
    log.info(f'[scale] ⚡ {current_max:.3f} m → {target_size_m:.3f} m '
             f'(×{scale:.4f}) | yakuniy: {final[0]:.3f}×{final[1]:.3f}×'
             f'{final[2]:.3f} m | tag Y=0')
    return {'scale': scale, 'size_m': [float(x) for x in final],
            'target_m': target_size_m}


def verify_scale(glb_path: str, expected_m: float, tol: float = 0.02) -> bool:
    """
    ⚡ Nazorat: haqiqatan ham to'g'ri o'lchamda va tagi Y=0 mi?
    Worker har modelda chaqiradi — noto'g'ri model CDN'ga CHIQMAYDI.
    """
    gltf = GLTF2().load(glb_path)
    lo, hi = compute_bbox(gltf)
    size = hi - lo
    got = float(max(size[0], size[2]))

    size_ok = abs(got - expected_m) <= tol
    floor_ok = abs(float(lo[1])) <= tol

    if not size_ok:
        log.error(f'[scale] ⛔ O\'LCHAM XATO: {got:.3f} m ≠ {expected_m:.3f} m')
    if not floor_ok:
        log.error(f'[scale] ⛔ TAG Y≠0: min_y={lo[1]:.4f}')
    return size_ok and floor_ok
```

✅ **Test:** `tests/test_ar_scale.py` — ⚡ **BU TESTLAR ENG MUHIMI**
```python
import os
import numpy as np
import pytest
from pygltflib import GLTF2

from apps.ar3d.services.optimize import (scale_and_center, verify_scale,
                                         compute_bbox)


@pytest.fixture
def cube_glb(tmp_path):
    """1×1×1 m kub GLB yaratadi (test uchun)"""
    import struct
    from pygltflib import (GLTF2, Scene, Node, Mesh, Primitive, Attributes,
                           Accessor, BufferView, Buffer)
    verts = np.array([
        [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
    ], dtype='float32')
    idx = np.array([0,1,2, 0,2,3, 4,5,6, 4,6,7], dtype='uint16')
    vb, ib = verts.tobytes(), idx.tobytes()
    blob = vb + ib

    g = GLTF2(
        scene=0, scenes=[Scene(nodes=[0])], nodes=[Node(mesh=0)],
        meshes=[Mesh(primitives=[Primitive(attributes=Attributes(POSITION=0), indices=1)])],
        accessors=[
            Accessor(bufferView=0, componentType=5126, count=8, type='VEC3',
                     min=[0,0,0], max=[1,1,1]),
            Accessor(bufferView=1, componentType=5123, count=len(idx), type='SCALAR'),
        ],
        bufferViews=[
            BufferView(buffer=0, byteOffset=0, byteLength=len(vb), target=34962),
            BufferView(buffer=0, byteOffset=len(vb), byteLength=len(ib), target=34963),
        ],
        buffers=[Buffer(byteLength=len(blob))],
    )
    g.set_binary_blob(blob)
    p = str(tmp_path / 'cube.glb')
    g.save(p)
    return p


# ---------- ⚡ ENG MUHIM TESTLAR ----------

def test_scales_to_exact_real_size(cube_glb):
    """⚡ 1 m kub → 0.32 m (32 sm lagan)"""
    scale_and_center(cube_glb, 0.32)
    g = GLTF2().load(cube_glb)
    lo, hi = compute_bbox(g)
    size = hi - lo
    assert abs(max(size[0], size[2]) - 0.32) < 0.001


def test_bottom_is_at_y_zero(cube_glb):
    """⚡⚡ Model TAGI Y=0 — stolga to'g'ri qo'yiladi"""
    scale_and_center(cube_glb, 0.32)
    g = GLTF2().load(cube_glb)
    lo, hi = compute_bbox(g)
    assert abs(lo[1]) < 0.001, f'tag Y={lo[1]} — 0 bo\'lishi kerak'


def test_centered_horizontally(cube_glb):
    """⚡ X va Z markazi 0 — barmoq qo'ygan joyga tushadi"""
    scale_and_center(cube_glb, 0.32)
    g = GLTF2().load(cube_glb)
    lo, hi = compute_bbox(g)
    assert abs((lo[0] + hi[0]) / 2) < 0.001
    assert abs((lo[2] + hi[2]) / 2) < 0.001


def test_verify_catches_wrong_size(cube_glb):
    scale_and_center(cube_glb, 0.32)
    assert verify_scale(cube_glb, 0.32) is True
    assert verify_scale(cube_glb, 0.50) is False    # ⚡ xatoni ushlaydi


def test_horizontal_not_vertical(tmp_path, cube_glb):
    """
    ⚡ Baland yupqa model (0.1×2×0.1) — 0.3 m ga masshtablanganda
    GORIZONTAL 0.3 bo'lishi kerak, balandlik emas.
    """
    g = GLTF2().load(cube_glb)
    g.nodes[0].scale = [0.1, 2.0, 0.1]
    p = str(tmp_path / 'tall.glb')
    g.save(p)
    scale_and_center(p, 0.30)
    g2 = GLTF2().load(p)
    lo, hi = compute_bbox(g2)
    size = hi - lo
    assert abs(max(size[0], size[2]) - 0.30) < 0.002   # gorizontal = 0.30
    assert size[1] > 0.30                               # balandlik kattaroq qoldi


def test_rejects_absurd_target(cube_glb):
    with pytest.raises(ValueError):
        scale_and_center(cube_glb, 5.0)      # 5 metrlik taom yo'q
    with pytest.raises(ValueError):
        scale_and_center(cube_glb, 0)
```

---

## V-132 — ⚡ USDZ konvertatsiya (iOS Quick Look)

**Fayl:** `apps/ar3d/services/usdz.py`

> iOS AR Quick Look **faqat .usdz** ni tushunadi. USDZ yo'q bo'lsa —
> iPhone foydalanuvchilari (bozorning ~35%) AR ko'ra olmaydi.

**O'rnatish (bir marta):**
```bash
# Variant A (afzal): Apple usdzconvert / usd_from_gltf
pip install usd-core
git clone https://github.com/google/usd_from_gltf /opt/usd_from_gltf
# yoki Docker: docker pull leon/usd-from-gltf

# Variant B (zaxira, sof python — sifat pastroq lekin ishlaydi):
pip install aspose-3d
```

```python
import logging
import os
import shutil
import subprocess

from django.conf import settings

log = logging.getLogger('ar3d.usdz')

MAX_USDZ = getattr(settings, 'MAX_USDZ_BYTES', 5 * 1024 * 1024)
USD_FROM_GLTF = shutil.which('usd_from_gltf')
USDZCONVERT = shutil.which('usdzconvert')
TIMEOUT = 420


def glb_to_usdz(glb_path: str, usdz_path: str, job=None) -> dict:
    """
    ⚡ GLB → USDZ. 3 ta usul zanjiri.
    ⚠️ Masshtab GLB'da allaqachon to'g'rilangan (V-131) — konvertor
       o'lchamni O'ZGARTIRMASLIGI kerak (metr birligi saqlanadi).
    """
    if job:
        job.set_stage('usdz', progress=72)

    errors = {}

    # --- 1. usd_from_gltf (Google, eng ishonchli) ---
    if USD_FROM_GLTF:
        try:
            p = subprocess.run([USD_FROM_GLTF, glb_path, usdz_path],
                               capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'usd_from_gltf')
            errors['usd_from_gltf'] = p.stderr[-300:]
        except Exception as e:
            errors['usd_from_gltf'] = str(e)[:200]

    # --- 2. Apple usdzconvert ---
    if USDZCONVERT:
        try:
            p = subprocess.run([USDZCONVERT, glb_path, usdz_path],
                               capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'usdzconvert')
            errors['usdzconvert'] = p.stderr[-300:]
        except Exception as e:
            errors['usdzconvert'] = str(e)[:200]

    # --- 3. Docker (zaxira) ---
    if shutil.which('docker'):
        try:
            d = os.path.dirname(os.path.abspath(glb_path))
            p = subprocess.run([
                'docker', 'run', '--rm', '-v', f'{d}:/w',
                'leon/usd-from-gltf:latest',
                f'/w/{os.path.basename(glb_path)}',
                f'/w/{os.path.basename(usdz_path)}',
            ], capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'docker')
            errors['docker'] = p.stderr[-300:]
        except Exception as e:
            errors['docker'] = str(e)[:200]

    # --- 4. aspose-3d (sof python zaxira) ---
    try:
        from aspose.threed import Scene
        Scene.from_file(glb_path).save(usdz_path)
        if os.path.exists(usdz_path):
            return _finish(usdz_path, 'aspose')
    except Exception as e:
        errors['aspose'] = str(e)[:200]

    log.error(f'[usdz] ⛔ konvertatsiya ishlamadi: {errors}')
    return {'ok': False, 'bytes': 0, 'tool': '', 'errors': errors}


def _finish(usdz_path, tool):
    size = os.path.getsize(usdz_path)
    ok = size <= MAX_USDZ and size > 1024
    if not ok and size > MAX_USDZ:
        log.warning(f'[usdz] ⚠️ {size/1048576:.1f} MB > 5 MB limiti — '
                    f'iOS Quick Look ochmasligi mumkin')
    log.info(f'[usdz] {"✅" if ok else "⚠️"} {tool}: {size/1048576:.2f} MB')
    return {'ok': ok, 'bytes': size, 'tool': tool, 'errors': {}}
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.ar3d.services.usdz import glb_to_usdz
print(glb_to_usdz('/tmp/osh.glb', '/tmp/osh.usdz'))"
# {'ok': True, 'bytes': 3412008, 'tool': 'usd_from_gltf', ...}
# ⚡ iPhone'ga yuborib AirDrop bilan oching — AR'da 32 sm bo'lishi kerak
```

---

## V-133 — Poster render (headless)

**Fayl:** `apps/ar3d/services/poster.py`

> Poster = 3D yuklanmaguncha ko'rinadigan rasm. Yaxshi poster =
> foydalanuvchi kutadi. Yomon/yo'q poster = ketadi.

```python
import base64
import json
import logging
import os
import shutil
import subprocess
import tempfile

from PIL import Image

log = logging.getLogger('ar3d.poster')

POSTER_SIZE = 800
POSTER_QUALITY = 82

RENDER_HTML = """<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent;width:%(w)dpx;height:%(w)dpx}
model-viewer{width:%(w)dpx;height:%(w)dpx;--poster-color:transparent}</style>
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<model-viewer id="mv" src="%(src)s" camera-orbit="25deg 68deg auto"
  shadow-intensity="1" environment-image="neutral" exposure="1.1"
  interaction-prompt="none" disable-zoom></model-viewer>
<script type="module">
  const mv = document.getElementById('mv');
  await mv.updateComplete;
  await new Promise(r => mv.addEventListener('load', r, {once:true}));
  await new Promise(r => setTimeout(r, 900));
  const blob = await mv.toBlob({idealAspect:true, mimeType:'image/png'});
  const buf = await blob.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  document.title = 'READY';
  window.__poster = b64;
</script>"""


def render_poster(glb_path: str, out_webp: str, job=None) -> dict:
    """
    ⚡ 3 usul zanjiri:
      1. Chromium headless + model-viewer.toBlob()  (eng sifatli)
      2. gltf-transform thumbnail                    (tez)
      3. AI provayder thumbnail'i                    (zaxira, generate dan keladi)
    """
    if job:
        job.set_stage('poster', progress=80)

    png = out_webp + '.png'
    try:
        if _render_chromium(glb_path, png) and os.path.exists(png):
            return _to_webp(png, out_webp, 'chromium')
    except Exception as e:
        log.warning(f'[poster] chromium ishlamadi: {e}')

    try:
        gt = shutil.which('gltf-transform')
        if gt:
            subprocess.run([gt, 'inspect', glb_path], capture_output=True, timeout=60)
    except Exception:
        pass

    log.warning('[poster] render qilinmadi — zaxira rasm ishlatiladi')
    return {'ok': False, 'bytes': 0, 'tool': ''}


def _render_chromium(glb_path: str, out_png: str) -> bool:
    chrome = (shutil.which('chromium') or shutil.which('chromium-browser')
              or shutil.which('google-chrome'))
    if not chrome:
        return False

    d = tempfile.mkdtemp(prefix='armenu_poster_')
    try:
        local_glb = os.path.join(d, 'm.glb')
        shutil.copy(glb_path, local_glb)
        html = os.path.join(d, 'r.html')
        with open(html, 'w', encoding='utf-8') as f:
            f.write(RENDER_HTML % {'w': POSTER_SIZE, 'src': 'm.glb'})

        subprocess.run([
            chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--default-background-color=00000000',
            f'--window-size={POSTER_SIZE},{POSTER_SIZE}',
            '--virtual-time-budget=12000',
            f'--screenshot={out_png}',
            f'file://{html}',
        ], capture_output=True, timeout=90)
        return os.path.exists(out_png) and os.path.getsize(out_png) > 2000
    finally:
        shutil.rmtree(d, ignore_errors=True)


def _to_webp(png_path, webp_path, tool):
    """PNG → WebP (shaffof fon saqlanadi)"""
    img = Image.open(png_path).convert('RGBA')
    img.thumbnail((POSTER_SIZE, POSTER_SIZE), Image.LANCZOS)
    img.save(webp_path, 'WEBP', quality=POSTER_QUALITY, method=6)
    os.unlink(png_path)
    size = os.path.getsize(webp_path)
    log.info(f'[poster] ✅ {tool}: {size//1024} KB')
    return {'ok': True, 'bytes': size, 'tool': tool}


def poster_from_url(url: str, out_webp: str) -> dict:
    """Zaxira: AI provayder bergan thumbnail'ni WebP ga o'giradi"""
    import requests
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        tmp = out_webp + '.src'
        with open(tmp, 'wb') as f:
            f.write(r.content)
        img = Image.open(tmp).convert('RGBA')
        img.thumbnail((POSTER_SIZE, POSTER_SIZE), Image.LANCZOS)
        img.save(out_webp, 'WEBP', quality=POSTER_QUALITY, method=6)
        os.unlink(tmp)
        return {'ok': True, 'bytes': os.path.getsize(out_webp), 'tool': 'provider'}
    except Exception as e:
        log.warning(f'[poster] provider thumbnail xato: {e}')
        return {'ok': False, 'bytes': 0, 'tool': ''}
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.ar3d.services.poster import render_poster
print(render_poster('/tmp/osh.glb', '/tmp/osh_poster.webp'))"
# {'ok': True, 'bytes': 48120, 'tool': 'chromium'}
```

---

## V-134 — CDN / S3 yuklash

**Fayl:** `apps/ar3d/services/storage.py`

> ⚡ 3D fayllar Django'dan uzatilmasligi kerak — CDN'dan ketadi.
> Content-Type to'g'ri bo'lishi SHART, aks holda iOS Quick Look ochmaydi.

```python
import hashlib
import logging
import mimetypes
import os

from django.conf import settings
from django.core.files.storage import default_storage

log = logging.getLogger('ar3d.storage')

CONTENT_TYPES = {
    '.glb':  'model/gltf-binary',
    '.usdz': 'model/vnd.usdz+zip',      # ⚡ iOS shu turni kutadi
    '.webp': 'image/webp',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
}
CACHE_CONTROL = 'public, max-age=31536000, immutable'   # 1 yil (nom hash bilan)


def _use_s3() -> bool:
    return bool(getattr(settings, 'AWS_STORAGE_BUCKET_NAME', ''))


def _hashed_name(local_path: str, prefix: str, dish_id: int) -> str:
    """⚡ Fayl nomida hash — kesh muammosi bo'lmaydi (immutable)"""
    h = hashlib.sha1()
    with open(local_path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    ext = os.path.splitext(local_path)[1].lower()
    return f'{prefix}/{dish_id}_{h.hexdigest()[:12]}{ext}'


def upload(local_path: str, prefix: str, dish_id: int, job=None) -> str:
    """
    Faylni CDN/S3 (yoki lokal media) ga yuklaydi va PUBLIC URL qaytaradi.
    """
    if job:
        job.set_stage('upload', progress=88)

    if not os.path.exists(local_path):
        raise FileNotFoundError(local_path)

    key = _hashed_name(local_path, prefix, dish_id)
    ext = os.path.splitext(local_path)[1].lower()
    ctype = CONTENT_TYPES.get(ext) or mimetypes.guess_type(local_path)[0] \
            or 'application/octet-stream'

    if _use_s3():
        url = _upload_s3(local_path, key, ctype)
    else:
        url = _upload_local(local_path, key)

    log.info(f'[cdn] ✅ {key} ({os.path.getsize(local_path)//1024} KB) → {url}')
    return url


def _upload_s3(local_path, key, ctype):
    import boto3
    s3 = boto3.client(
        's3',
        endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
    )
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    with open(local_path, 'rb') as f:
        s3.put_object(
            Bucket=bucket, Key=key, Body=f,
            ContentType=ctype,                  # ⚡ iOS uchun kritik
            CacheControl=CACHE_CONTROL,
            ACL='public-read',
        )
    cdn = getattr(settings, 'CDN_BASE_URL', '').rstrip('/')
    if cdn:
        return f'{cdn}/{key}'
    ep = getattr(settings, 'AWS_S3_ENDPOINT_URL', '').rstrip('/')
    return f'{ep}/{bucket}/{key}' if ep else f'https://{bucket}.s3.amazonaws.com/{key}'


def _upload_local(local_path, key):
    """Dev / kichik deploy — MEDIA_ROOT ga"""
    dest = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(local_path, 'rb') as src, open(dest, 'wb') as dst:
        dst.write(src.read())
    base = getattr(settings, 'PUBLIC_BASE_URL', '').rstrip('/')
    return f'{base}{settings.MEDIA_URL}{key}' if base else f'{settings.MEDIA_URL}{key}'


def delete(url: str):
    """Model almashtirilganda eskisini o'chirish"""
    if not url:
        return
    try:
        if _use_s3():
            import boto3
            cdn = getattr(settings, 'CDN_BASE_URL', '').rstrip('/')
            key = url.replace(cdn + '/', '') if cdn and url.startswith(cdn) else None
            if key:
                boto3.client('s3',
                             endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
                             aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                             aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                             ).delete_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        else:
            p = url.split(settings.MEDIA_URL)[-1]
            fp = os.path.join(settings.MEDIA_ROOT, p)
            if os.path.exists(fp):
                os.unlink(fp)
    except Exception as e:
        log.warning(f'[cdn] o\'chirilmadi {url}: {e}')
```

**⚠️ nginx (lokal media uchun) — `deploy/nginx/armenu.conf`:**
```nginx
location /media/ar/ {
    alias /srv/armenu/media/ar/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    types {
        model/gltf-binary   glb;
        model/vnd.usdz+zip  usdz;   # ⚡ iOS Quick Look uchun SHART
        image/webp          webp;
    }
    add_header Access-Control-Allow-Origin *;
}
```

✅ **Tekshirish:**
```bash
curl -sI https://cdn.armenu.uz/ar/glb/15_a3f2c8910b2e.glb | grep -i content-type
# content-type: model/gltf-binary
curl -sI https://cdn.armenu.uz/ar/usdz/15_a3f2c8910b2e.usdz | grep -i content-type
# content-type: model/vnd.usdz+zip   ⚡ bu bo'lmasa iPhone ochmaydi
```

---

## V-135 — ⚡⚡ WORKER: `run_model3d_worker` (to'liq quvur)

**Fayl:** `apps/ar3d/management/commands/run_model3d_worker.py`

> ⛔ **Uzoq ish (3-10 daqiqa) — ALOHIDA servisda.** Gunicorn worker ichida
> thread ochilsa, worker qayta ishga tushganda (timeout/recycle) fon oqim
> o'ladi va pul to'langan model YO'QOLADI.

```python
import logging
import os
import signal
import tempfile
import time
import traceback

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

log = logging.getLogger('ar3d.worker')

POLL_SEC = 5
STALE_MIN = 20          # heartbeat yo'q → qayta navbatga


class Command(BaseCommand):
    help = '⚡ 3D model generatsiya worker (armenu-model3d.service)'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true',
                            help='Bitta job bajarib chiqadi (test uchun)')
        parser.add_argument('--job-id', type=int, help='Aniq job')

    def handle(self, *a, **o):
        self._stop = False
        signal.signal(signal.SIGTERM, lambda *_: setattr(self, '_stop', True))
        signal.signal(signal.SIGINT, lambda *_: setattr(self, '_stop', True))

        self.stdout.write(self.style.SUCCESS('⚙️  model3d worker ishga tushdi'))

        if o.get('job_id'):
            from apps.ar3d.models import Model3DJob
            self._process(Model3DJob.objects.get(id=o['job_id']))
            return

        while not self._stop:
            try:
                self._requeue_stale()
                job = self._claim()
                if job is None:
                    if o.get('once'):
                        break
                    time.sleep(POLL_SEC)
                    continue
                self._process(job)
                if o.get('once'):
                    break
            except Exception:
                log.error(f'[worker] halqa xatosi:\n{traceback.format_exc()}')
                time.sleep(POLL_SEC)
            finally:
                connection.close()      # ⚡ DB ulanish sizib ketmasin

        self.stdout.write(self.style.WARNING('⏹  worker to\'xtadi'))

    # ---------------------------------------------------------------

    def _requeue_stale(self):
        """⚡ Worker qayta ishga tushsa — osilib qolgan job'lar tiklanadi"""
        from apps.ar3d.models import Model3DJob
        cutoff = timezone.now() - timezone.timedelta(minutes=STALE_MIN)
        n = Model3DJob.objects.filter(
            status='running', heartbeat_at__lt=cutoff
        ).update(status='queued', stage='library', progress=0)
        if n:
            log.warning(f'[worker] {n} ta osilgan job qayta navbatga qo\'yildi')

    def _claim(self):
        """⚡ Atomik olish — bir nechta worker bo'lsa ham dublikat yo'q"""
        from apps.ar3d.models import Model3DJob
        with transaction.atomic():
            job = (Model3DJob.objects
                   .select_for_update(skip_locked=True)
                   .filter(status='queued')
                   .order_by('created_at')
                   .first())
            if job is None:
                return None
            job.status = 'running'
            job.attempts += 1
            job.started_at = timezone.now()
            job.heartbeat_at = timezone.now()
            job.save(update_fields=['status', 'attempts', 'started_at',
                                    'heartbeat_at', 'updated_at'])
        return job

    # ---------------------------------------------------------------

    def _process(self, job):
        """⚡ TO'LIQ QUVUR — 8 bosqich"""
        from apps.ar3d.models import DishModel3D
        from apps.ar3d.services import library, generate, optimize, usdz, poster, storage
        from core.ws import ws_send, g_admin

        t0 = time.time()
        dish = job.dish
        log.info(f'[worker] ▶ Job#{job.id} "{dish.name_uz}" '
                 f'({job.real_size_cm} sm, urinish {job.attempts})')

        m3d, _ = DishModel3D.objects.get_or_create(
            dish=dish, defaults={'restaurant_id': job.restaurant_id})
        m3d.status = 'processing'
        m3d.progress = 5
        m3d.real_size_cm = job.real_size_cm
        m3d.error_msg = ''
        m3d.save()
        job.model = m3d
        job.save(update_fields=['model'])

        tmpdir = tempfile.mkdtemp(prefix=f'armenu_job{job.id}_')
        try:
            # ===== 1. 📚 KUTUBXONA (BEPUL — birinchi navbatda!) =====
            job.set_stage('library', progress=10)
            if job.prefer_library:
                lib, conf, method = library.find_best(dish)
                if lib:
                    library.copy_from_library(dish, lib,
                                              real_size_cm=job.real_size_cm)
                    return self._done(job, provider='library', cost=0.0,
                                      extra={'library_key': lib.key,
                                             'confidence': conf, 'method': method},
                                      t0=t0)

            # ===== 2. 🤖 AI GENERATSIYA (pullik) =====
            images = generate.prepare_images(job.images)
            if not images:
                raise ValueError('Rasm yo\'q — AI generatsiya mumkin emas')
            gen = generate.generate_3d(images, dish.name_uz, job=job)
            job.provider = gen['provider']
            job.cost_usd = gen['cost_usd']
            job.save(update_fields=['provider', 'cost_usd'])
            raw_glb = gen['glb_path']

            # ===== 3-4. 🔧 OPTIMIZATSIYA + ⚡ REAL O'LCHAM =====
            glb_out = os.path.join(tmpdir, f'dish_{dish.id}.glb')
            opt = optimize.optimize_glb(raw_glb, glb_out,
                                        float(job.real_size_cm), job=job)

            # ⚡⚡ NAZORAT: o'lcham to'g'rimi? Tag Y=0 mi?
            expected_m = float(job.real_size_cm) / 100.0
            if not optimize.verify_scale(glb_out, expected_m):
                raise ValueError(
                    f'⛔ O\'LCHAM NAZORATI O\'TMADI: kutilgan {expected_m} m. '
                    f'AR da noto\'g\'ri ko\'rinadi — CDN ga chiqarilmaydi.')

            # ===== 5. 📱 USDZ =====
            usdz_out = os.path.join(tmpdir, f'dish_{dish.id}.usdz')
            u = usdz.glb_to_usdz(glb_out, usdz_out, job=job)

            # ===== 6. 🖼 POSTER =====
            poster_out = os.path.join(tmpdir, f'dish_{dish.id}.webp')
            pr = poster.render_poster(glb_out, poster_out, job=job)
            if not pr['ok'] and gen.get('thumbnail'):
                pr = poster.poster_from_url(gen['thumbnail'], poster_out)

            # ===== 7. ☁️ CDN =====
            glb_url = storage.upload(glb_out, 'ar/glb', dish.id, job=job)
            usdz_url = storage.upload(usdz_out, 'ar/usdz', dish.id) if u['ok'] else ''
            poster_url = storage.upload(poster_out, 'ar/poster', dish.id) if pr['ok'] else ''

            # ===== 8. 💾 SAQLASH =====
            m3d.glb_url = glb_url
            m3d.usdz_url = usdz_url
            m3d.poster_url = poster_url
            m3d.glb_bytes = opt['bytes']
            m3d.usdz_bytes = u.get('bytes', 0)
            m3d.poly_count = opt.get('triangles', 0)
            m3d.real_size_cm = job.real_size_cm
            m3d.status = 'ready'
            m3d.source = 'ai'
            m3d.progress = 100
            m3d.ready_at = timezone.now()
            m3d.save()

            # ===== 9. 📚 KUTUBXONAGA QO'SHISH (keyingilar uchun BEPUL) =====
            library.add_to_library(dish, m3d, job=job)

            self._done(job, provider=gen['provider'], cost=gen['cost_usd'],
                       extra={'glb_bytes': opt['bytes'],
                              'usdz_ok': u['ok'],
                              'triangles': opt.get('triangles', 0)},
                       t0=t0)

            if os.path.exists(raw_glb):
                os.unlink(raw_glb)

        except Exception as e:
            self._fail(job, m3d, e)
        finally:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
            connection.close()

    # ---------------------------------------------------------------

    def _done(self, job, provider, cost, extra, t0):
        from core.ws import ws_send, g_admin
        from core.queue import enqueue

        took = int(time.time() - t0)
        job.status = 'done'
        job.stage = 'done'
        job.progress = 100
        job.provider = provider
        job.cost_usd = cost
        job.finished_at = timezone.now()
        job.result = dict(extra, took_sec=took)
        job.save()

        log.info(f'[worker] ✅ Job#{job.id} tugadi — {provider}, '
                 f'${cost}, {took}s')

        ws_send(g_admin(job.restaurant_id), 'model3d.ready', {
            'job_id': job.id, 'dish_id': job.dish_id,
            'dish_name': job.dish.name_uz,
            'provider': provider, 'cost_usd': float(cost),
            'took_sec': took, **extra,
        })
        enqueue('notify', 'model3d_ready', job_id=job.id, dish_id=job.dish_id)

    def _fail(self, job, m3d, exc):
        from core.ws import ws_send, g_admin

        msg = f'{type(exc).__name__}: {exc}'
        log.error(f'[worker] ⛔ Job#{job.id} xato: {msg}\n{traceback.format_exc()}')

        if job.attempts < job.max_attempts:
            job.status = 'queued'          # ⚡ qayta urinadi
            job.stage = 'library'
            job.progress = 0
            job.error = msg[:2000]
            job.save()
            log.info(f'[worker] Job#{job.id} qayta navbatda '
                     f'({job.attempts}/{job.max_attempts})')
            return

        job.status = 'failed'
        job.error = msg[:2000]
        job.finished_at = timezone.now()
        job.save()

        m3d.status = 'failed'
        m3d.error_msg = msg[:500]
        m3d.progress = 0
        m3d.save()

        ws_send(g_admin(job.restaurant_id), 'model3d.failed', {
            'job_id': job.id, 'dish_id': job.dish_id,
            'dish_name': job.dish.name_uz, 'error': msg[:300],
        })
```

**Fayl:** `deploy/systemd/armenu-model3d.service`
```ini
[Unit]
Description=ARMENU 3D model worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=armenu
WorkingDirectory=/srv/armenu
Environment=DJANGO_SETTINGS_MODULE=config.settings.prod
ExecStart=/srv/armenu/venv/bin/python manage.py run_model3d_worker
Restart=always
RestartSec=5
# ⚡ 3D ishlov og'ir — xotira chegarasi
MemoryMax=4G
TimeoutStopSec=600

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now armenu-model3d
sudo systemctl status armenu-model3d
```

✅ **Tekshirish:**
```bash
python manage.py run_model3d_worker --once
# ⚙️  model3d worker ishga tushdi
# [worker] ▶ Job#1 "Norin" (28.0 sm, urinish 1)
# [lib] "Norin" kutubxonada topilmadi
# [3d] meshy chaqirilmoqda...
# [opt] ✅ natija: 2.14 MB, 41230 tri
# [scale] ⚡ 1.842 m → 0.280 m (×0.1520) | tag Y=0
# [usdz] ✅ usd_from_gltf: 3.41 MB
# [worker] ✅ Job#1 tugadi — meshy, $0.5, 247s
```

---

## V-136 — Kutubxonaga avto-qo'shish

**Fayl:** `apps/ar3d/services/library.py` (davomi)

> ⚡ **Bu — biznes modelining yuragi.** Har yaratilgan model kutubxonaga
> tushadi → keyingi 500 restoran uni **BEPUL** oladi. Xarajat bir marta,
> foyda cheksiz.

```python
GENERIC_WORDS = {
    'osh', 'palov', 'manti', 'somsa', 'lagmon', 'shashlik', 'norin', 'dimlama',
    'chuchvara', 'mastava', 'shurpa', 'kabob', 'non', 'choy', 'salat', 'sho\'rva',
    'borsh', 'plov', 'pilaf', 'ayron', 'qatiq', 'sumalak', 'halim', 'tuxum',
    'kompot', 'moroz', 'tort', 'pirog', 'burger', 'pizza', 'lavash', 'donar',
}

MIN_QUALITY_FOR_LIBRARY = 2


def is_generic_dish(name: str) -> bool:
    """
    ⚡ Faqat UMUMIY taomlar kutubxonaga tushadi.
    "Osh" → ha (500 restoranda bor).
    "Registon spetsial burgeri" → yo'q (bitta restoranniki, brend taomi).
    """
    norm = normalize(name)
    if not norm:
        return False
    words = norm.split()
    if len(words) > 3:                    # uzun nom = brend taomi
        return False
    return any(w in GENERIC_WORDS for w in words)


def suggest_key(name: str) -> str:
    """'Osh (Toshkent usulida)' → 'osh-toshkent-usulida'"""
    base = normalize(name).replace(' ', '-')[:70].strip('-')
    if not base:
        base = 'dish'
    key, i = base, 1
    while DishLibrary.objects.filter(key=key).exists():
        i += 1
        key = f'{base}-{i}'
        if i > 50:
            import uuid
            key = f'{base}-{uuid.uuid4().hex[:6]}'
            break
    return key


def build_aliases(dish) -> list:
    """Turli tildagi va yozilishdagi variantlar — keyingi moslashtirish uchun"""
    raw = [dish.name_uz, dish.name_ru, dish.name_en]
    out = set()
    for r in raw:
        if not r:
            continue
        out.add(str(r).lower().strip())
        out.add(normalize(r))
    out.discard('')
    return sorted(out)[:20]


def add_to_library(dish, m3d, job=None, force: bool = False):
    """
    ⚡ Tayyor modelni GLOBAL kutubxonaga qo'shadi.

    Shartlar:
      • taom UMUMIY nomli (yoki force=True — super-admin qo'lda qo'shdi)
      • model haqiqatan tayyor va CDN'da
      • shu kalitda hali yo'q
    """
    if m3d.status != 'ready' or not m3d.glb_url:
        return None
    if m3d.library_id:
        return m3d.library                      # allaqachon kutubxonadan olingan
    if not force and not is_generic_dish(dish.name_uz):
        log.info(f'[lib] "{dish.name_uz}" — brend taomi, kutubxonaga qo\'shilmadi')
        return None

    # Dublikat tekshiruvi
    existing, score = find_by_name(dish.name_uz)
    if existing and score >= 0.95:
        log.info(f'[lib] "{dish.name_uz}" allaqachon kutubxonada: {existing.key}')
        m3d.library = existing
        m3d.save(update_fields=['library'])
        return existing

    cat_key = getattr(dish.category, 'library_key', '') or 'other'
    emb = get_embedding(build_embedding_text(
        dish.name_uz, dish.desc_uz or '', dish.ingredients_uz or '', cat_key))

    lib = DishLibrary.objects.create(
        key=suggest_key(dish.name_uz),
        name_uz=dish.name_uz,
        name_ru=dish.name_ru or '',
        name_en=dish.name_en or '',
        aliases=build_aliases(dish),
        category_key=cat_key,
        cuisine='uzbek',
        glb_url=m3d.glb_url,
        usdz_url=m3d.usdz_url,
        poster_url=m3d.poster_url,
        preview_360=m3d.preview_360,
        real_size_cm=m3d.real_size_cm,
        glb_bytes=m3d.glb_bytes,
        usdz_bytes=m3d.usdz_bytes,
        poly_count=m3d.poly_count,
        quality=3,
        source='ai',
        embedding=emb,
        used_by_count=1,
        is_active=True,
    )
    m3d.library = lib
    m3d.save(update_fields=['library'])

    log.info(f'[lib] ⚡ KUTUBXONAGA QO\'SHILDI: {lib.key} — '
             f'keyingi restoranlar uchun BEPUL')

    # Super-adminga xabar
    from core.queue import enqueue
    enqueue('notify', 'library_new_item', library_id=lib.id, key=lib.key,
            dish_name=dish.name_uz)
    return lib


def library_stats() -> dict:
    """P-02 sahifasi uchun"""
    from django.db.models import Sum, Avg, Count
    agg = DishLibrary.objects.filter(is_active=True).aggregate(
        total=Count('id'), used=Sum('used_by_count'),
        avg_q=Avg('quality'), avg_size=Avg('glb_bytes'))
    total = agg['total'] or 0
    used = agg['used'] or 0
    return {
        'total': total,
        'total_usage': used,
        'saved_usd': round(max(0, used - total) * 0.5, 2),   # ⚡ tejalgan pul
        'avg_quality': round(float(agg['avg_q'] or 0), 2),
        'avg_glb_mb': round((agg['avg_size'] or 0) / 1048576, 2),
    }
```

✅ **Test:** `tests/test_library_add.py`
```python
import pytest
from unittest.mock import patch
from apps.ar3d.services.library import (is_generic_dish, suggest_key,
                                        add_to_library, library_stats)


def test_generic_detection():
    assert is_generic_dish('Osh') is True
    assert is_generic_dish('Manti') is True
    assert is_generic_dish("Registon spetsial burgeri de luxe") is False
    assert is_generic_dish('Shefning maxfiy taomi') is False


@pytest.mark.django_db
def test_brand_dish_not_added(dish, ready_model):
    dish.name_uz = 'Registon spetsial taomi'; dish.save()
    with patch('apps.ar3d.services.library.get_embedding', return_value=None):
        lib = add_to_library(dish, ready_model)
    assert lib is None


@pytest.mark.django_db
def test_generic_dish_added_and_free_next_time(dish, ready_model):
    dish.name_uz = 'Manti'; dish.save()
    with patch('apps.ar3d.services.library.get_embedding', return_value=None):
        lib = add_to_library(dish, ready_model)
    assert lib is not None and lib.key.startswith('manti')
    assert lib.glb_url == ready_model.glb_url


@pytest.mark.django_db
def test_stats_shows_savings(lib_osh):
    lib_osh.used_by_count = 21; lib_osh.save()
    s = library_stats()
    assert s['saved_usd'] == 10.0        # (21-1) × $0.5
```

---

## V-137 — `POST /v1/admin/ar/generate/`

**Fayl:** `apps/ar3d/admin_views.py`

> ⚡ Bu endpoint **faqat navbatga qo'yadi** va darhol qaytadi (202).
> Generatsiya worker'da. Web so'rovda HECH QACHON 3D yaratilmaydi.

```python
import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from core.exceptions import PlanLimit, TenantMismatch
from core.permissions import IsAdmin
from apps.ar3d.models import DishModel3D, Model3DJob

log = logging.getLogger('ar3d.admin')

AR_PLANS = {'pro', 'pro_fiscal', 'enterprise'}


def _check_plan(restaurant):
    """⚡ Tarif nazorati — FREE/START da AI generatsiya yo'q"""
    if restaurant.plan not in AR_PLANS:
        raise PlanLimit({'reason': 'plan', 'current': restaurant.plan,
                         'required': sorted(AR_PLANS)})
    limit = restaurant.ar_model_limit or 0
    if limit >= 0:
        used = DishModel3D.objects.filter(
            restaurant=restaurant, status__in=['ready', 'processing', 'queued']
        ).count()
        if used >= limit:
            raise PlanLimit({'reason': 'limit', 'used': used, 'limit': limit})


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def ar_generate(request):
    """
    POST /v1/admin/ar/generate/
    {dish_id, images: [url|path], real_size_cm: 32, prefer_library: true}

    Javob: 202 {job_id, status, message}
    """
    from apps.menu.models import Dish

    rest = request.staff.restaurant
    _check_plan(rest)

    dish = Dish.objects.filter(id=request.data.get('dish_id'),
                               restaurant_id=rest.id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': request.data.get('dish_id')})

    # ⚡ Ayni damda jarayonda bo'lgan job bormi
    running = Model3DJob.objects.filter(
        dish=dish, status__in=['queued', 'running']).first()
    if running:
        return Response({'job_id': running.id, 'status': running.status,
                         'message': 'Bu taom uchun generatsiya allaqachon navbatda'},
                        status=status.HTTP_200_OK)

    # Rasmlar: yuborilgan yoki taom rasmi
    images = request.data.get('images') or []
    if isinstance(images, str):
        images = [images]
    if request.FILES:
        for f in request.FILES.getlist('images')[:6]:
            from django.core.files.storage import default_storage
            path = default_storage.save(f'ar/src/{dish.id}/{f.name}', f)
            images.append(default_storage.url(path))
    if not images and dish.image:
        images = [dish.image.url]
    if not images:
        return Response({'error': {
            'code': 'VALIDATION_ERROR',
            'message_uz': 'Kamida 1 ta rasm kerak (3-6 ta yaxshiroq)',
            'message_ru': 'Нужна минимум 1 фотография (лучше 3-6)',
            'message_en': 'At least 1 image required (3-6 is better)',
        }}, status=status.HTTP_400_BAD_REQUEST)

    # ⚡ Real o'lcham — admin kiritadi, standart 25 sm
    try:
        size_cm = float(request.data.get('real_size_cm') or 25)
    except (TypeError, ValueError):
        size_cm = 25.0
    if not (3 <= size_cm <= 200):
        return Response({'error': {
            'code': 'VALIDATION_ERROR',
            'message_uz': "O'lcham 3-200 sm oralig'ida bo'lishi kerak",
            'message_ru': 'Размер должен быть от 3 до 200 см',
            'message_en': 'Size must be between 3 and 200 cm',
        }}, status=status.HTTP_400_BAD_REQUEST)

    m3d, _ = DishModel3D.objects.get_or_create(
        dish=dish, defaults={'restaurant_id': rest.id})
    m3d.status = 'queued'
    m3d.progress = 0
    m3d.real_size_cm = size_cm
    m3d.error_msg = ''
    m3d.save()

    job = Model3DJob.objects.create(
        restaurant_id=rest.id, dish=dish, model=m3d,
        images=images, real_size_cm=size_cm,
        prefer_library=bool(request.data.get('prefer_library', True)),
        created_by=request.staff,
    )

    log.info(f'[admin] 3D navbatga: Job#{job.id} dish={dish.id} '
             f'"{dish.name_uz}" {size_cm} sm')

    return Response({
        'job_id': job.id,
        'dish_id': dish.id,
        'status': 'queued',
        'real_size_cm': size_cm,
        'message': 'Navbatga qo\'yildi. Odatda 2-5 daqiqa oladi.',
    }, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_jobs(request):
    """GET /v1/admin/ar/jobs/ — generatsiya holati (A-04 poll uchun)"""
    qs = (Model3DJob.objects
          .select_related('dish')
          .filter(restaurant_id=request.staff.restaurant_id)
          .order_by('-created_at')[:50])
    return Response({'jobs': [{
        'id': j.id, 'dish_id': j.dish_id, 'dish_name': j.dish.name_uz,
        'status': j.status, 'stage': j.stage,
        'stage_label': dict(Model3DJob.STAGE).get(j.stage, j.stage),
        'progress': j.progress, 'provider': j.provider,
        'cost_usd': float(j.cost_usd), 'error': j.error[:200],
        'created_at': j.created_at.isoformat(),
    } for j in qs]})


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_library_search(request):
    """GET /v1/admin/ar/library/search/?q=osh — kutubxonadan qidirish"""
    from apps.ar3d.services.library import find_by_name, DishLibrary
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})

    best, score = find_by_name(q)
    qs = DishLibrary.objects.filter(is_active=True).filter(
        aliases__contains=[q.lower()]
    )[:10]
    seen, out = set(), []
    for lib in ([best] if best else []) + list(qs):
        if lib is None or lib.id in seen:
            continue
        seen.add(lib.id)
        out.append({
            'id': lib.id, 'key': lib.key, 'name': lib.name_uz,
            'poster': lib.poster_url, 'glb': lib.glb_url,
            'real_size_cm': float(lib.real_size_cm),
            'quality': lib.quality, 'used_by': lib.used_by_count,
            'confidence': score if lib is best else None,
        })
    return Response({'results': out})


@api_view(['POST'])
@permission_classes([IsAdmin])
def ar_use_library(request):
    """POST /v1/admin/ar/library/use/ {dish_id, library_id, real_size_cm}"""
    from apps.menu.models import Dish
    from apps.ar3d.models import DishLibrary
    from apps.ar3d.services.library import copy_from_library

    rest = request.staff.restaurant
    _check_plan(rest)

    dish = Dish.objects.filter(id=request.data.get('dish_id'),
                               restaurant_id=rest.id).first()
    lib = DishLibrary.objects.filter(id=request.data.get('library_id'),
                                     is_active=True).first()
    if dish is None or lib is None:
        raise TenantMismatch({'reason': 'not_found'})

    size = request.data.get('real_size_cm')
    m3d = copy_from_library(dish, lib, real_size_cm=float(size) if size else None)
    return Response({'ok': True, 'dish_id': dish.id,
                     'real_size_cm': float(m3d.real_size_cm),
                     'cost_usd': 0.0, 'source': 'library'})
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/admin/ar/generate/ \
  -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"dish_id":15,"real_size_cm":32,"prefer_library":true}' | jq
# {"job_id":1,"status":"queued","real_size_cm":32.0,...}   ⚡ 202, darhol qaytdi
```

---

## V-138 — `POST /v1/admin/ar/upload/` (qo'lda model yuklash)

**Fayl:** `apps/ar3d/admin_views.py` (davomi)

> Restoranda o'z 3D modeli bo'lsa (dizayner yasagan) — yuklaydi.
> ⚡ **Baribir optimizatsiya + real o'lchamga masshtablash o'tadi** —
> aks holda AR da noto'g'ri chiqadi.

```python
import os
import tempfile


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def ar_upload(request):
    """
    POST /v1/admin/ar/upload/
    multipart: dish_id, glb (fayl), real_size_cm, [usdz], [poster]

    ⚡ Yuklangan GLB HAM optimizatsiya + masshtablashdan o'tadi.
    """
    from apps.menu.models import Dish
    from apps.ar3d.services import optimize, usdz as usdz_svc, poster as poster_svc, storage

    rest = request.staff.restaurant
    _check_plan(rest)

    dish = Dish.objects.filter(id=request.data.get('dish_id'),
                               restaurant_id=rest.id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': request.data.get('dish_id')})

    f = request.FILES.get('glb')
    if f is None or not f.name.lower().endswith('.glb'):
        return Response({'error': {
            'code': 'VALIDATION_ERROR',
            'message_uz': 'GLB fayl yuklang (.glb)',
            'message_ru': 'Загрузите GLB файл (.glb)',
            'message_en': 'Please upload a GLB file (.glb)',
        }}, status=status.HTTP_400_BAD_REQUEST)

    if f.size > 150 * 1024 * 1024:
        return Response({'error': {
            'code': 'VALIDATION_ERROR',
            'message_uz': 'Fayl juda katta (maks 150 MB)',
            'message_ru': 'Файл слишком большой (макс 150 МБ)',
            'message_en': 'File too large (max 150 MB)',
        }}, status=status.HTTP_400_BAD_REQUEST)

    try:
        size_cm = float(request.data.get('real_size_cm') or 25)
    except (TypeError, ValueError):
        size_cm = 25.0
    if not (3 <= size_cm <= 200):
        return Response({'error': {'code': 'VALIDATION_ERROR',
                                   'message_uz': "O'lcham 3-200 sm bo'lsin"}},
                        status=status.HTTP_400_BAD_REQUEST)

    tmpdir = tempfile.mkdtemp(prefix='armenu_up_')
    try:
        raw = os.path.join(tmpdir, 'raw.glb')
        with open(raw, 'wb') as out:
            for chunk in f.chunks():
                out.write(chunk)

        m3d, _ = DishModel3D.objects.get_or_create(
            dish=dish, defaults={'restaurant_id': rest.id})
        m3d.status = 'processing'
        m3d.progress = 20
        m3d.real_size_cm = size_cm
        m3d.save()

        # ⚡ Optimizatsiya + real o'lcham (qo'lda yuklangan bo'lsa ham SHART)
        glb_out = os.path.join(tmpdir, f'dish_{dish.id}.glb')
        opt = optimize.optimize_glb(raw, glb_out, size_cm)

        expected_m = size_cm / 100.0
        if not optimize.verify_scale(glb_out, expected_m):
            m3d.status = 'failed'
            m3d.error_msg = 'O\'lcham nazorati o\'tmadi'
            m3d.save()
            return Response({'error': {
                'code': 'VALIDATION_ERROR',
                'message_uz': "Model o'lchamga moslanmadi. Boshqa fayl sinab ko'ring.",
                'message_ru': 'Модель не масштабируется. Попробуйте другой файл.',
                'message_en': 'Model could not be scaled. Try another file.',
            }}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        # USDZ: yuborilgan bo'lsa ishlatamiz, aks holda konvertatsiya
        usdz_out = os.path.join(tmpdir, f'dish_{dish.id}.usdz')
        uf = request.FILES.get('usdz')
        if uf and uf.name.lower().endswith('.usdz'):
            with open(usdz_out, 'wb') as out:
                for c in uf.chunks():
                    out.write(c)
            u = {'ok': os.path.getsize(usdz_out) <= 5 * 1024 * 1024,
                 'bytes': os.path.getsize(usdz_out), 'tool': 'uploaded'}
        else:
            u = usdz_svc.glb_to_usdz(glb_out, usdz_out)

        # Poster
        poster_out = os.path.join(tmpdir, f'dish_{dish.id}.webp')
        pf = request.FILES.get('poster')
        if pf:
            from PIL import Image
            Image.open(pf).convert('RGBA').save(poster_out, 'WEBP', quality=82)
            pr = {'ok': True, 'bytes': os.path.getsize(poster_out)}
        else:
            pr = poster_svc.render_poster(glb_out, poster_out)

        # Eski fayllarni tozalash
        for old in (m3d.glb_url, m3d.usdz_url, m3d.poster_url):
            storage.delete(old)

        m3d.glb_url = storage.upload(glb_out, 'ar/glb', dish.id)
        m3d.usdz_url = storage.upload(usdz_out, 'ar/usdz', dish.id) if u['ok'] else ''
        m3d.poster_url = storage.upload(poster_out, 'ar/poster', dish.id) if pr['ok'] else ''
        m3d.glb_bytes = opt['bytes']
        m3d.usdz_bytes = u.get('bytes', 0)
        m3d.poly_count = opt.get('triangles', 0)
        m3d.status = 'ready'
        m3d.source = 'upload'
        m3d.progress = 100
        m3d.library = None
        m3d.ready_at = timezone.now()
        m3d.save()

        from core.ws import ws_send, g_admin
        ws_send(g_admin(rest.id), 'model3d.ready', {
            'dish_id': dish.id, 'dish_name': dish.name_uz,
            'source': 'upload', 'cost_usd': 0.0,
            'real_size_cm': size_cm, 'glb_bytes': opt['bytes'],
        })

        return Response({
            'ok': True, 'dish_id': dish.id,
            'glb': m3d.glb_url, 'usdz': m3d.usdz_url, 'poster': m3d.poster_url,
            'glb_mb': round(opt['bytes'] / 1048576, 2),
            'usdz_mb': round(u.get('bytes', 0) / 1048576, 2),
            'triangles': opt.get('triangles', 0),
            'real_size_cm': size_cm, 'scale_m': round(size_cm / 100, 3),
        }, status=status.HTTP_201_CREATED)

    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)
```

**Fayl:** `apps/ar3d/admin_urls.py`
```python
from django.urls import path
from apps.ar3d import admin_views as v

app_name = 'ar3d_admin'

urlpatterns = [
    path('admin/ar/generate/',       v.ar_generate,       name='generate'),
    path('admin/ar/jobs/',           v.ar_jobs,           name='jobs'),
    path('admin/ar/upload/',         v.ar_upload,         name='upload'),
    path('admin/ar/library/search/', v.ar_library_search, name='lib-search'),
    path('admin/ar/library/use/',    v.ar_use_library,    name='lib-use'),
    path('admin/ar/models/',         v.ar_models,         name='models'),
    path('admin/ar/analytics/',      v.ar_analytics_view, name='analytics'),
]
```
`config/urls.py` ga: `path('v1/', include('apps.ar3d.admin_urls')),`

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/admin/ar/upload/ \
  -H "Authorization: Bearer $ADMIN" \
  -F dish_id=15 -F real_size_cm=32 -F glb=@/tmp/my_model.glb | jq
# {"ok":true,"glb_mb":2.14,"scale_m":0.32,...}
```

---

## V-139 — Admin 3D sahifasi (A-04)

**Fayl:** `templates/admin_ui/ar.html`

```html
{% extends "admin_ui/base.html" %}{% load i18n static %}
{% block title %}{% trans "3D / AR modellar" %}{% endblock %}

{% block head %}
<link rel="stylesheet" href="{% static 'admin_ui/css/ar.css' %}?v=1">
{% endblock %}

{% block content %}
<div class="a-ar">
  <header class="a-ar__head">
    <h1>🎯 {% trans "3D / AR modellar" %}</h1>
    <div class="a-ar__stat">
      <span class="pill pill--ok">✅ <b id="cReady">0</b> {% trans "tayyor" %}</span>
      <span class="pill pill--warn">⏳ <b id="cProc">0</b> {% trans "jarayonda" %}</span>
      <span class="pill pill--off">❌ <b id="cNone">0</b> {% trans "yo'q" %}</span>
      <span class="pill pill--lib">📚 <b id="cLib">0</b> {% trans "kutubxonadan" %}</span>
    </div>
  </header>

  <div class="a-ar__filters">
    <input type="search" id="fSearch" placeholder="{% trans 'Taom qidirish…' %}">
    <select id="fStatus">
      <option value="">{% trans "Barcha holat" %}</option>
      <option value="ready">{% trans "Tayyor" %}</option>
      <option value="processing">{% trans "Jarayonda" %}</option>
      <option value="none">{% trans "Model yo'q" %}</option>
      <option value="failed">{% trans "Xato" %}</option>
    </select>
  </div>

  <div class="a-ar__list" id="modelList"></div>
</div>

<!-- ⚡ Karta shabloni -->
<template id="tplModel">
  <article class="mcard" data-dish="">
    <div class="mcard__prev"><img alt=""><span class="mcard__pct" hidden></span></div>
    <div class="mcard__body">
      <div class="mcard__row">
        <h3 class="mcard__name"></h3>
        <span class="mcard__badge"></span>
      </div>
      <p class="mcard__src"></p>
      <p class="mcard__meta"></p>
      <p class="mcard__an"></p>
      <p class="mcard__err" hidden></p>
      <div class="mcard__act"></div>
    </div>
  </article>
</template>

<!-- 🤖 AI yaratish modali -->
<div class="a-modal" id="genModal" hidden>
  <div class="a-modal__box">
    <h3>🤖 {% trans "AI bilan 3D model yaratish" %}</h3>
    <p class="a-modal__hint">
      {% trans "Taom rasmini yuklang (3-6 ta turli burchakdan yaxshiroq)" %}
    </p>
    <input type="file" id="genImages" accept="image/*" multiple>
    <div id="genPrev" class="a-modal__prev"></div>

    <label class="a-modal__lbl">
      📏 {% trans "Taomning haqiqiy o'lchami" %}
      <span class="a-modal__crit">⚡ {% trans "AR aniqligi shunga bog'liq!" %}</span>
    </label>
    <div class="a-modal__size">
      <input type="number" id="genSize" value="25" min="3" max="200" step="0.5">
      <span>{% trans "sm" %}</span>
      <div class="a-modal__quick">
        <button data-size="18">{% trans "Kichik tarelka 18" %}</button>
        <button data-size="25">{% trans "Tarelka 25" %}</button>
        <button data-size="32">{% trans "Lagan 32" %}</button>
        <button data-size="40">{% trans "Katta lagan 40" %}</button>
      </div>
    </div>

    <label class="a-modal__chk">
      <input type="checkbox" id="genLib" checked>
      📚 {% trans "Avval kutubxonadan qidirilsin (bepul va tez)" %}
    </label>

    <div class="a-modal__foot">
      <button class="btn btn--ghost" data-close>{% trans "Bekor" %}</button>
      <button class="btn btn--pri" id="genGo">🤖 {% trans "Yaratish" %}</button>
    </div>
  </div>
</div>

<!-- 📚 Kutubxona modali -->
<div class="a-modal" id="libModal" hidden>
  <div class="a-modal__box">
    <h3>📚 {% trans "Kutubxonadan tanlash" %}</h3>
    <input type="search" id="libQ" placeholder="{% trans 'Nomi bo\'yicha…' %}">
    <div id="libRes" class="a-modal__libres"></div>
    <div class="a-modal__foot">
      <button class="btn btn--ghost" data-close>{% trans "Yopish" %}</button>
    </div>
  </div>
</div>

<!-- 👁 Ko'rish modali -->
<div class="a-modal a-modal--wide" id="viewModal" hidden>
  <div class="a-modal__box">
    <h3 id="viewName">—</h3>
    <div id="viewStage" class="a-modal__stage"></div>
    <p class="a-modal__note" id="viewNote"></p>
    <div class="a-modal__foot">
      <button class="btn btn--ghost" data-close>{% trans "Yopish" %}</button>
    </div>
  </div>
</div>
{% endblock %}

{% block scripts %}
<script>
  window.AR_ADMIN = {
    token: localStorage.getItem('admin_token') || '',
    wsUrl: "{{ ws_scheme }}://{{ request.get_host }}/ws/admin/" +
           (localStorage.getItem('admin_token') || '') + "/",
  };
</script>
<script src="{% static 'common/js/reliable-ws.js' %}?v=1"></script>
<script src="{% static 'admin_ui/js/ar.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/admin_ui/js/ar.js`
```javascript
/* ARMENU — admin 3D boshqaruvi (A-04) */
(function () {
  'use strict';

  const A = window.AR_ADMIN;
  const $ = (id) => document.getElementById(id);
  const list = $('modelList');
  const tpl = $('tplModel');
  let models = [];
  let target = null;          // hozirgi taom (modal uchun)

  const H = () => ({'Authorization': 'Bearer ' + A.token,
                    'Content-Type': 'application/json'});
  const fmtMB = (b) => b ? (b / 1048576).toFixed(1) + ' MB' : '—';

  async function load() {
    const r = await fetch('/v1/admin/ar/models/', {headers: H()});
    const j = await r.json();
    models = j.models || [];
    render();
  }

  function render() {
    const q = ($('fSearch').value || '').toLowerCase();
    const st = $('fStatus').value;
    list.innerHTML = '';

    const rows = models.filter(m =>
      (!q || m.dish_name.toLowerCase().includes(q)) &&
      (!st || m.status === st));

    rows.forEach(m => list.appendChild(card(m)));

    $('cReady').textContent = models.filter(m => m.status === 'ready').length;
    $('cProc').textContent = models.filter(m => ['processing', 'queued'].includes(m.status)).length;
    $('cNone').textContent = models.filter(m => m.status === 'none').length;
    $('cLib').textContent = models.filter(m => m.source === 'library').length;
  }

  function card(m) {
    const n = tpl.content.firstElementChild.cloneNode(true);
    n.dataset.dish = m.dish_id;

    const img = n.querySelector('.mcard__prev img');
    img.src = m.poster || m.dish_image || '';
    img.alt = m.dish_name;

    n.querySelector('.mcard__name').textContent = m.dish_name;

    const badge = n.querySelector('.mcard__badge');
    const B = {
      ready:      ['✅ TAYYOR', 'ok'],
      processing: ['⏳ JARAYONDA', 'warn'],
      queued:     ['⏳ NAVBATDA', 'warn'],
      failed:     ['⛔ XATO', 'bad'],
      none:       ['❌ MODEL YO\'Q', 'off'],
    }[m.status] || ['—', 'off'];
    badge.textContent = B[0];
    badge.className = 'mcard__badge is-' + B[1];

    const SRC = {
      library: '📚 Kutubxona (bepul)', ai: '🤖 AI (rasmdan)',
      upload: '📤 Qo\'lda yuklangan', photogrammetry: '📷 Fotogrammetriya',
    };
    n.querySelector('.mcard__src').textContent = SRC[m.source] || '';

    if (m.status === 'ready') {
      n.querySelector('.mcard__meta').innerHTML =
        `📏 <b>${m.real_size_cm}</b> sm &nbsp;|&nbsp; GLB ${fmtMB(m.glb_bytes)}` +
        ` &nbsp;|&nbsp; USDZ ${fmtMB(m.usdz_bytes)}` +
        (m.poly_count ? ` &nbsp;|&nbsp; ${m.poly_count.toLocaleString('ru-RU')} tri` : '');
      n.querySelector('.mcard__an').innerHTML =
        `👁 <b>${m.view_count}</b> ko'rish &nbsp;|&nbsp; ` +
        `📈 Konversiya <b>${m.convert_rate}%</b>`;
    } else if (['processing', 'queued'].includes(m.status)) {
      const pct = n.querySelector('.mcard__pct');
      pct.hidden = false;
      pct.textContent = (m.progress || 0) + '%';
      n.querySelector('.mcard__meta').textContent =
        m.stage_label || 'Navbatda kutmoqda…';
    } else if (m.status === 'failed') {
      const e = n.querySelector('.mcard__err');
      e.hidden = false;
      e.textContent = '⛔ ' + (m.error_msg || 'Noma\'lum xato');
    }

    const act = n.querySelector('.mcard__act');
    if (m.status === 'ready') {
      act.append(
        mkBtn('👁 Ko\'rish', () => view(m)),
        mkBtn('🔄 Almashtirish', () => openGen(m)),
        mkBtn('📏 O\'lcham', () => changeSize(m)),
      );
    } else if (m.status === 'failed' || m.status === 'none') {
      act.append(
        mkBtn('📚 Kutubxonadan', () => openLib(m), 'pri'),
        mkBtn('🤖 AI yaratish', () => openGen(m), 'pri'),
        mkBtn('📤 Yuklash', () => upload(m)),
      );
    }
    return n;
  }

  function mkBtn(text, fn, kind) {
    const b = document.createElement('button');
    b.className = 'btn btn--sm' + (kind ? ' btn--' + kind : '');
    b.textContent = text;
    b.onclick = fn;
    return b;
  }

  // ---- 👁 Ko'rish (model-viewer bilan) ----
  async function view(m) {
    target = m;
    $('viewName').textContent = m.dish_name;
    $('viewNote').innerHTML =
      `⚡ AR o'lchami: <b>${m.real_size_cm} sm</b> = <b>${(m.real_size_cm/100).toFixed(2)} m</b>`;
    $('viewStage').innerHTML =
      `<model-viewer src="${m.glb}" ${m.usdz ? `ios-src="${m.usdz}"` : ''}
        poster="${m.poster || ''}" camera-controls auto-rotate
        ar ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed" ar-placement="floor"
        shadow-intensity="1" environment-image="neutral"
        style="width:100%;height:420px"></model-viewer>`;
    if (!window.__mvLoaded) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      document.head.appendChild(s);
      window.__mvLoaded = true;
    }
    show('viewModal');
  }

  // ---- 🤖 AI yaratish ----
  function openGen(m) {
    target = m;
    $('genSize').value = m.real_size_cm || 25;
    $('genPrev').innerHTML = '';
    $('genImages').value = '';
    show('genModal');
  }

  $('genImages').onchange = () => {
    const box = $('genPrev');
    box.innerHTML = '';
    [...$('genImages').files].slice(0, 6).forEach(f => {
      const i = document.createElement('img');
      i.src = URL.createObjectURL(f);
      box.appendChild(i);
    });
  };

  document.querySelectorAll('.a-modal__quick button').forEach(b => {
    b.onclick = () => { $('genSize').value = b.dataset.size; };
  });

  $('genGo').onclick = async () => {
    const btn = $('genGo');
    btn.disabled = true;
    btn.textContent = '⏳ Navbatga qo\'yilmoqda…';
    try {
      const files = $('genImages').files;
      let r;
      if (files.length) {
        const fd = new FormData();
        fd.append('dish_id', target.dish_id);
        fd.append('real_size_cm', $('genSize').value);
        fd.append('prefer_library', $('genLib').checked);
        [...files].slice(0, 6).forEach(f => fd.append('images', f));
        r = await fetch('/v1/admin/ar/generate/', {
          method: 'POST', body: fd,
          headers: {'Authorization': 'Bearer ' + A.token},
        });
      } else {
        r = await fetch('/v1/admin/ar/generate/', {
          method: 'POST', headers: H(),
          body: JSON.stringify({dish_id: target.dish_id,
                                real_size_cm: Number($('genSize').value),
                                prefer_library: $('genLib').checked}),
        });
      }
      const j = await r.json();
      if (!r.ok) { alert(j.error ? j.error.message_uz : 'Xato'); return; }
      hide('genModal');
      alert('✅ ' + (j.message || 'Navbatga qo\'yildi'));
      load();
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 Yaratish';
    }
  };

  // ---- 📚 Kutubxona ----
  function openLib(m) {
    target = m;
    $('libQ').value = m.dish_name;
    show('libModal');
    searchLib();
  }
  let libT;
  $('libQ').oninput = () => { clearTimeout(libT); libT = setTimeout(searchLib, 350); };

  async function searchLib() {
    const q = $('libQ').value.trim();
    const box = $('libRes');
    box.innerHTML = '⏳';
    const r = await fetch('/v1/admin/ar/library/search/?q=' + encodeURIComponent(q),
                          {headers: H()});
    const j = await r.json();
    box.innerHTML = '';
    if (!j.results.length) { box.textContent = 'Topilmadi'; return; }
    j.results.forEach(x => {
      const d = document.createElement('div');
      d.className = 'libitem';
      d.innerHTML =
        `<img src="${x.poster || ''}" alt="">
         <div><b>${x.name}</b><br><small>📏 ${x.real_size_cm} sm · ` +
        `⭐ ${x.quality}/5 · 🏪 ${x.used_by} restoran` +
        (x.confidence ? ` · 🎯 ${Math.round(x.confidence*100)}%` : '') + `</small></div>`;
      const b = mkBtn('Tanlash', async () => {
        b.disabled = true;
        const r2 = await fetch('/v1/admin/ar/library/use/', {
          method: 'POST', headers: H(),
          body: JSON.stringify({dish_id: target.dish_id, library_id: x.id,
                                real_size_cm: x.real_size_cm}),
        });
        if (r2.ok) { hide('libModal'); load(); }
        else b.disabled = false;
      }, 'pri');
      d.appendChild(b);
      box.appendChild(d);
    });
  }

  // ---- 📏 O'lcham o'zgartirish ----
  async function changeSize(m) {
    const v = prompt(`"${m.dish_name}" real o'lchami (sm):\n` +
                     `⚡ AR aniqligi shunga bog'liq!`, m.real_size_cm);
    if (!v) return;
    const size = parseFloat(v);
    if (!(size >= 3 && size <= 200)) { alert("3-200 sm oralig'ida"); return; }
    const r = await fetch('/v1/admin/ar/generate/', {
      method: 'POST', headers: H(),
      body: JSON.stringify({dish_id: m.dish_id, real_size_cm: size,
                            prefer_library: false, images: [m.glb]}),
    });
    if (r.ok) { alert('⏳ Qayta masshtablanmoqda…'); load(); }
  }

  // ---- 📤 Qo'lda yuklash ----
  function upload(m) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.glb';
    inp.onchange = async () => {
      const size = prompt("Taomning real o'lchami (sm):", '25');
      if (!size) return;
      const fd = new FormData();
      fd.append('dish_id', m.dish_id);
      fd.append('real_size_cm', size);
      fd.append('glb', inp.files[0]);
      const r = await fetch('/v1/admin/ar/upload/', {
        method: 'POST', body: fd,
        headers: {'Authorization': 'Bearer ' + A.token},
      });
      const j = await r.json();
      if (r.ok) { alert(`✅ Yuklandi: ${j.glb_mb} MB, ${j.scale_m} m`); load(); }
      else alert(j.error ? j.error.message_uz : 'Xato');
    };
    inp.click();
  }

  // ---- Modal yordamchilari ----
  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]') || e.target.classList.contains('a-modal')) {
      document.querySelectorAll('.a-modal').forEach(m => m.hidden = true);
    }
  });
  $('fSearch').oninput = render;
  $('fStatus').onchange = render;

  // ---- ⚡ WS: jonli progress ----
  new ReliableWS(A.wsUrl, {
    'model3d.progress': (m) => {
      const x = models.find(o => o.dish_id === m.data.dish_id);
      if (!x) return;
      x.status = 'processing';
      x.progress = m.data.progress;
      x.stage_label = m.data.stage_label;
      render();
    },
    'model3d.ready': (m) => { load(); },
    'model3d.failed': (m) => { load(); },
  });

  load();
  setInterval(load, 30000);     // zaxira poll
})();
```

✅ **Tekshirish:** `/admin/ar/` — kartalar chiqadi, 🤖 AI yaratish bosilganda
o'lcham tanlash modali ochiladi, progress WS orqali jonli o'zgaradi.

---

## V-140 — ⚡ AR analitika (ko'rgan vs ko'rmagan chek farqi)

**Fayl:** `apps/ar3d/analytics.py`

> ⚡ **Bu hisobot restoranga AR ni sotadi.** "AR ko'rgan mijoz cheki
> 68 000, ko'rmagan 52 000 — **+31%**" — bu raqam obunani uzaytiradi.

```python
import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Sum, Q, F, Value, DecimalField
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

log = logging.getLogger('ar3d.analytics')


def ar_impact(restaurant_id: int, days: int = 30) -> dict:
    """
    ⚡ AR ning savdoga ta'siri — A-10 sahifasining asosiy raqami.

    Metod: buyurtmalar 2 guruhga bo'linadi —
      A) ichida kamida 1 ta ar_viewed=True qatori bor
      B) hech qanday AR ko'rilmagan
    So'ng o'rtacha chek solishtiriladi.
    """
    from apps.orders.models import Order, OrderItem
    from apps.ar3d.models import ARView

    since = timezone.now() - timedelta(days=days)
    base = Order.objects.filter(
        restaurant_id=restaurant_id, created_at__gte=since,
        status__in=['served', 'paid'])

    with_ar = base.filter(items__ar_viewed=True).distinct()
    without_ar = base.exclude(items__ar_viewed=True).distinct()

    a = with_ar.aggregate(cnt=Count('id', distinct=True),
                          avg=Coalesce(Avg('total'), Value(Decimal('0'),
                                       output_field=DecimalField())),
                          total=Coalesce(Sum('total'), Value(Decimal('0'),
                                         output_field=DecimalField())))
    b = without_ar.aggregate(cnt=Count('id', distinct=True),
                             avg=Coalesce(Avg('total'), Value(Decimal('0'),
                                          output_field=DecimalField())),
                             total=Coalesce(Sum('total'), Value(Decimal('0'),
                                            output_field=DecimalField())))

    avg_ar = float(a['avg'] or 0)
    avg_no = float(b['avg'] or 0)
    uplift = round(100 * (avg_ar - avg_no) / avg_no, 1) if avg_no else 0.0

    views = ARView.objects.filter(restaurant_id=restaurant_id, created_at__gte=since)
    v = views.aggregate(total=Count('id'), conv=Count('id', filter=Q(converted=True)),
                        avg_dur=Coalesce(Avg('duration_sec'), 0.0))
    total_views = v['total'] or 0

    return {
        'period_days': days,
        # ⚡ ASOSIY RAQAMLAR
        'avg_check_with_ar': round(avg_ar),
        'avg_check_without_ar': round(avg_no),
        'uplift_pct': uplift,
        'uplift_label': f'{"+" if uplift >= 0 else ""}{uplift}%',
        # Ko'rishlar
        'orders_with_ar': a['cnt'] or 0,
        'orders_without_ar': b['cnt'] or 0,
        'ar_views': total_views,
        'ar_conversions': v['conv'] or 0,
        'ar_conversion_rate': round(100 * (v['conv'] or 0) / total_views, 1)
                              if total_views else 0.0,
        'avg_view_sec': round(float(v['avg_dur'] or 0), 1),
        # Pul
        'revenue_with_ar': float(a['total'] or 0),
        'revenue_without_ar': float(b['total'] or 0),
        'estimated_ar_gain': round((avg_ar - avg_no) * (a['cnt'] or 0)) if avg_no else 0,
    }


def top_ar_dishes(restaurant_id: int, days: int = 30, limit: int = 10) -> list:
    """Qaysi taomlar AR'da eng ko'p ko'riladi va eng yaxshi konversiya beradi"""
    from apps.ar3d.models import ARView

    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects
            .filter(restaurant_id=restaurant_id, created_at__gte=since)
            .values('dish_id', 'dish__name_uz')
            .annotate(views=Count('id'),
                      convs=Count('id', filter=Q(converted=True)),
                      avg_dur=Avg('duration_sec'))
            .order_by('-views')[:limit])

    return [{
        'dish_id': r['dish_id'],
        'name': r['dish__name_uz'],
        'views': r['views'],
        'conversions': r['convs'],
        'conversion_rate': round(100 * r['convs'] / r['views'], 1) if r['views'] else 0,
        'avg_duration_sec': round(float(r['avg_dur'] or 0), 1),
    } for r in rows]


def ar_mode_breakdown(restaurant_id: int, days: int = 30) -> list:
    """Qaysi rejim ishlatilyapti (webxr/quick-look/scene-viewer/3d-only/360/image)"""
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects
            .filter(restaurant_id=restaurant_id, created_at__gte=since)
            .values('mode', 'device')
            .annotate(n=Count('id'), conv=Count('id', filter=Q(converted=True)))
            .order_by('-n'))
    total = sum(r['n'] for r in rows) or 1
    return [{
        'mode': r['mode'], 'device': r['device'], 'count': r['n'],
        'pct': round(100 * r['n'] / total, 1),
        'conversion_rate': round(100 * r['conv'] / r['n'], 1) if r['n'] else 0,
    } for r in rows]


def ar_daily_trend(restaurant_id: int, days: int = 30) -> list:
    from apps.ar3d.models import ARView
    since = timezone.now() - timedelta(days=days)
    rows = (ARView.objects
            .filter(restaurant_id=restaurant_id, created_at__gte=since)
            .annotate(d=TruncDate('created_at'))
            .values('d')
            .annotate(views=Count('id'), convs=Count('id', filter=Q(converted=True)))
            .order_by('d'))
    return [{'date': r['d'].isoformat(), 'views': r['views'],
             'conversions': r['convs']} for r in rows]


def full_report(restaurant_id: int, days: int = 30) -> dict:
    return {
        'impact': ar_impact(restaurant_id, days),
        'top_dishes': top_ar_dishes(restaurant_id, days),
        'modes': ar_mode_breakdown(restaurant_id, days),
        'trend': ar_daily_trend(restaurant_id, days),
        'generated_at': timezone.now().isoformat(),
    }
```

**`apps/ar3d/admin_views.py` ga qo'shish:**
```python
@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_analytics_view(request):
    """GET /v1/admin/ar/analytics/?days=30"""
    from apps.ar3d.analytics import full_report
    days = min(365, max(1, int(request.query_params.get('days') or 30)))
    return Response(full_report(request.staff.restaurant_id, days))


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_models(request):
    """GET /v1/admin/ar/models/ — A-04 ro'yxati (modelsiz taomlar ham)"""
    from apps.menu.models import Dish
    from apps.ar3d.models import Model3DJob

    rid = request.staff.restaurant_id
    dishes = (Dish.objects
              .select_related('model3d', 'model3d__library')
              .filter(restaurant_id=rid, is_available=True)
              .order_by('category__order', 'order'))

    jobs = {j.dish_id: j for j in Model3DJob.objects.filter(
        restaurant_id=rid, status__in=['queued', 'running']).order_by('-created_at')}

    out = []
    for d in dishes:
        m = getattr(d, 'model3d', None)
        j = jobs.get(d.id)
        out.append({
            'dish_id': d.id, 'dish_name': d.name_uz,
            'dish_image': d.image.url if d.image else '',
            'status': (m.status if m else 'none'),
            'source': (m.source if m else ''),
            'progress': (j.progress if j else (m.progress if m else 0)),
            'stage_label': (dict(Model3DJob.STAGE).get(j.stage) if j else ''),
            'glb': (m.url_glb() if m else ''),
            'usdz': (m.url_usdz() if m else ''),
            'poster': (m.url_poster() if m else ''),
            'real_size_cm': float(m.real_size_cm) if m else 25.0,
            'scale_m': (m.size_m if m else 0.25),
            'glb_bytes': (m.glb_bytes if m else 0),
            'usdz_bytes': (m.usdz_bytes if m else 0),
            'poly_count': (m.poly_count if m else 0),
            'view_count': (m.view_count if m else 0),
            'convert_rate': (m.convert_rate if m else 0.0),
            'library_key': (m.library.key if (m and m.library_id) else ''),
            'error_msg': (m.error_msg if m else ''),
        })
    return Response({'models': out, 'count': len(out)})
```

✅ **Test:** `tests/test_ar_analytics.py`
```python
import pytest
from decimal import Decimal
from apps.ar3d.analytics import ar_impact


@pytest.mark.django_db
def test_uplift_computed(restaurant, table, dish, dish_b):
    """⚡ AR ko'rgan chek 100k, ko'rmagan 50k → +100%"""
    from apps.orders.services import create_order
    from apps.orders.state import transition

    dish.price = Decimal('100000'); dish.save()
    dish_b.price = Decimal('50000'); dish_b.save()

    o1 = create_order(restaurant_id=restaurant.id, session_id='s1', table_id=table.id,
                      items=[{'dish_id': dish.id, 'qty': 1, 'ar_viewed': True}])
    o2 = create_order(restaurant_id=restaurant.id, session_id='s2', table_id=table.id,
                      items=[{'dish_id': dish_b.id, 'qty': 1, 'ar_viewed': False}])
    for o in (o1, o2):
        for st in ('accepted', 'cooking', 'ready', 'served'):
            transition(o, st)

    r = ar_impact(restaurant.id, days=30)
    assert r['avg_check_with_ar'] == 100000
    assert r['avg_check_without_ar'] == 50000
    assert r['uplift_pct'] == 100.0
    assert r['uplift_label'] == '+100.0%'
```

---

## V-141 — Super-admin kutubxona (P-02)

**Fayl:** `templates/admin_ui/library.html`

```html
{% extends "admin_ui/base.html" %}{% load i18n static %}
{% block title %}{% trans "3D kutubxona" %}{% endblock %}

{% block content %}
<div class="p-lib">
  <header class="p-lib__head">
    <h1>📚 {% trans "Global 3D kutubxona" %}</h1>
    <p class="p-lib__sub">
      {% trans "Loyihaning eng qimmatli aktivi — barcha restoranlar foydalanadi" %}
    </p>
  </header>

  <div class="p-lib__kpi">
    <div class="kpi"><span>{% trans "Modellar" %}</span><b id="kTotal">0</b></div>
    <div class="kpi"><span>{% trans "Foydalanish" %}</span><b id="kUsage">0</b></div>
    <div class="kpi kpi--green">
      <span>⚡ {% trans "Tejalgan" %}</span><b id="kSaved">$0</b>
    </div>
    <div class="kpi"><span>{% trans "O'rt. sifat" %}</span><b id="kQ">0</b></div>
    <div class="kpi"><span>{% trans "O'rt. GLB" %}</span><b id="kMB">0 MB</b></div>
  </div>

  <div class="p-lib__bar">
    <input type="search" id="lq" placeholder="{% trans 'Qidirish (nom/alias)…' %}">
    <select id="lcat">
      <option value="">{% trans "Barcha kategoriya" %}</option>
      <option value="national">{% trans "Milliy" %}</option>
      <option value="salad">{% trans "Salatlar" %}</option>
      <option value="soup">{% trans "Sho'rvalar" %}</option>
      <option value="grill">{% trans "Grill" %}</option>
      <option value="bakery">{% trans "Novvoyxona" %}</option>
      <option value="dessert">{% trans "Shirinlik" %}</option>
      <option value="drink">{% trans "Ichimlik" %}</option>
    </select>
    <button class="btn btn--pri" id="btnNew">+ {% trans "Yangi model" %}</button>
  </div>

  <table class="p-lib__tbl">
    <thead><tr>
      <th></th><th>{% trans "Nomi" %}</th><th>{% trans "Kalit" %}</th>
      <th>{% trans "Aliaslar" %}</th><th>📏</th><th>{% trans "Hajm" %}</th>
      <th>⭐</th><th>🏪</th><th></th>
    </tr></thead>
    <tbody id="libBody"></tbody>
  </table>
</div>
{% endblock %}

{% block scripts %}
<script>window.LIB = {token: localStorage.getItem('super_token') || ''};</script>
<script src="{% static 'admin_ui/js/library.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `apps/ar3d/platform_views.py`
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from apps.ar3d.models import DishLibrary
from apps.ar3d.services.library import library_stats, normalize


@api_view(['GET'])
@permission_classes([IsAdminUser])
def platform_library(request):
    """GET /v1/platform/library/?q=&cat="""
    q = request.query_params.get('q', '').strip()
    cat = request.query_params.get('cat', '')

    qs = DishLibrary.objects.all()
    if cat:
        qs = qs.filter(category_key=cat)
    if q:
        n = normalize(q)
        from django.db.models import Q
        qs = qs.filter(Q(name_uz__icontains=q) | Q(name_ru__icontains=q) |
                       Q(name_en__icontains=q) | Q(key__icontains=n) |
                       Q(aliases__contains=[q.lower()]))
    qs = qs.order_by('-used_by_count')[:200]

    return Response({
        'stats': library_stats(),
        'items': [{
            'id': l.id, 'key': l.key, 'name_uz': l.name_uz,
            'name_ru': l.name_ru, 'name_en': l.name_en,
            'aliases': l.aliases, 'category_key': l.category_key,
            'poster': l.poster_url, 'glb': l.glb_url, 'usdz': l.usdz_url,
            'real_size_cm': float(l.real_size_cm),
            'glb_mb': round(l.glb_bytes / 1048576, 2),
            'usdz_mb': round(l.usdz_bytes / 1048576, 2),
            'poly_count': l.poly_count, 'quality': l.quality,
            'source': l.source, 'used_by_count': l.used_by_count,
            'is_active': l.is_active, 'has_embedding': l.embedding is not None,
        } for l in qs],
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def platform_library_item(request, pk):
    """PATCH/DELETE /v1/platform/library/{id}/"""
    lib = DishLibrary.objects.filter(id=pk).first()
    if lib is None:
        return Response({'error': 'not_found'}, status=404)

    if request.method == 'DELETE':
        lib.is_active = False          # ⚡ soft delete — ishlatayotganlar buzilmasin
        lib.save(update_fields=['is_active'])
        return Response({'ok': True, 'deactivated': True})

    for f in ('name_uz', 'name_ru', 'name_en', 'category_key', 'cuisine',
              'quality', 'is_active', 'real_size_cm'):
        if f in request.data:
            setattr(lib, f, request.data[f])
    if 'aliases' in request.data:
        lib.aliases = [str(a).lower().strip()
                       for a in request.data['aliases'] if str(a).strip()][:30]
    lib.save()

    # ⚡ O'lcham o'zgarsa — barcha nusxalar ham yangilanadi
    if 'real_size_cm' in request.data:
        from apps.ar3d.models import DishModel3D
        DishModel3D.objects.filter(library=lib).update(
            real_size_cm=lib.real_size_cm)

    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def platform_library_reindex(request):
    """POST /v1/platform/library/reindex/ — embedding'siz yozuvlarga embedding"""
    from apps.ar3d.services.library import get_embedding, build_embedding_text
    n = 0
    for lib in DishLibrary.objects.filter(embedding__isnull=True,
                                          is_active=True)[:200]:
        emb = get_embedding(build_embedding_text(
            lib.name_uz, '', ' '.join(lib.aliases or []), lib.category_key))
        if emb:
            lib.embedding = emb
            lib.save(update_fields=['embedding'])
            n += 1
    return Response({'ok': True, 'reindexed': n})
```

**`config/urls.py` ga:**
```python
    path('v1/platform/library/', platform_views.platform_library),
    path('v1/platform/library/<int:pk>/', platform_views.platform_library_item),
    path('v1/platform/library/reindex/', platform_views.platform_library_reindex),
```

**Boshlang'ich kutubxona to'ldirish — `scripts/import_library.py`:**
```python
"""
⚡ 40 ta asosiy o'zbek taomini kutubxonaga kiritish (ishga tushirishdan oldin).
Ishlatish: python manage.py shell < scripts/import_library.py
"""
SEED = [
    ('osh-toshkent', 'Osh (Palov)', 'Плов', 'Pilaf',
     ['palov', 'плов', 'pilaf', 'osh', 'ош', 'plov'], 'national', 32),
    ('manti', 'Manti', 'Манты', 'Manti',
     ['manti', 'манты', 'mantu'], 'national', 26),
    ('somsa-goshtli', 'Somsa', 'Самса', 'Samsa',
     ['somsa', 'самса', 'samsa'], 'bakery', 14),
    ('lagmon', "Lag'mon", 'Лагман', 'Lagman',
     ['lagmon', 'лагман', 'lagman', "lag'mon"], 'national', 24),
    ('shashlik', 'Shashlik', 'Шашлык', 'Shashlik',
     ['shashlik', 'шашлык', 'kabob', 'kebab'], 'grill', 30),
    ('norin', 'Norin', 'Норин', 'Norin', ['norin', 'норин'], 'national', 28),
    ('chuchvara', 'Chuchvara', 'Чучвара', 'Chuchvara',
     ['chuchvara', 'чучвара', 'pelmeni'], 'national', 22),
    ('mastava', 'Mastava', 'Мастава', 'Mastava',
     ['mastava', 'мастава'], 'soup', 20),
    ('shurpa', "Sho'rva", 'Шурпа', 'Shurpa',
     ['shurpa', 'шурпа', "sho'rva", 'shorva'], 'soup', 20),
    ('achchiq-chuchuk', 'Achchiq-chuchuk', 'Ачик-чучук', 'Achichuk',
     ['achchiq chuchuk', 'ачик чучук', 'achichuk'], 'salad', 22),
    ('non-obi', 'Obi non', 'Лепёшка', 'Uzbek bread',
     ['non', 'лепешка', 'bread', 'obi non'], 'bakery', 20),
    ('choy', 'Choy', 'Чай', 'Tea', ['choy', 'чай', 'tea'], 'drink', 8),
    # ... qolgan 28 tasi
]

from apps.ar3d.models import DishLibrary
from apps.ar3d.services.library import get_embedding, build_embedding_text

for key, uz, ru, en, aliases, cat, size in SEED:
    if DishLibrary.objects.filter(key=key).exists():
        continue
    DishLibrary.objects.create(
        key=key, name_uz=uz, name_ru=ru, name_en=en, aliases=aliases,
        category_key=cat, real_size_cm=size,
        glb_url=f'https://cdn.armenu.uz/library/{key}.glb',
        usdz_url=f'https://cdn.armenu.uz/library/{key}.usdz',
        poster_url=f'https://cdn.armenu.uz/library/{key}.webp',
        quality=4, source='photogrammetry',
        embedding=get_embedding(build_embedding_text(uz, '', ' '.join(aliases), cat)),
    )
    print(f'✅ {key}')
print('Jami:', DishLibrary.objects.count())
```

✅ **Tekshirish:**
```bash
curl -s 'http://localhost:8060/v1/platform/library/?q=palov' \
  -H "Authorization: Bearer $SUPER" | jq '.items[0].key, .stats'
# "osh-toshkent"
# {"total":40,"total_usage":312,"saved_usd":136.0,...}
```

---

## V-142 — Test: AR API, fallback, o'lcham

**Fayl:** `tests/test_ar.py`

```python
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient

from apps.ar3d.models import DishModel3D, ARView, DishLibrary, Model3DJob


# ================= 1. ⚡ REAL O'LCHAM (eng muhim) =================

@pytest.mark.django_db
def test_scale_m_is_meters_not_cm(dish, restaurant):
    """⚡ scale_m METRDA bo'lishi SHART — 32 emas, 0.32"""
    m = DishModel3D.objects.create(
        dish=dish, restaurant=restaurant, status='ready',
        glb_url='https://cdn/x.glb', real_size_cm=Decimal('32'))
    assert m.size_m == 0.32
    assert m.size_m != 32


@pytest.mark.django_db
def test_ar_api_returns_scale_in_meters(api_client, restaurant, dish):
    DishModel3D.objects.create(dish=dish, restaurant=restaurant, status='ready',
                               glb_url='https://cdn/x.glb',
                               usdz_url='https://cdn/x.usdz',
                               real_size_cm=Decimal('32'), glb_bytes=2100000)
    r = api_client.get(f'/v1/ar/{dish.id}/',
                       HTTP_HOST=f'{restaurant.slug}.localhost')
    assert r.status_code == 200
    j = r.json()
    assert j['ready'] is True
    assert j['scale_m'] == 0.32               # ⚡ METRDA
    assert j['real_size_cm'] == 32.0
    assert j['usdz']                           # ⚡ iOS uchun SHART


@pytest.mark.django_db
def test_glb_under_3mb_rule(dish, restaurant):
    """⚡ 3 MB dan katta model chiqarilmasligi kerak"""
    from django.conf import settings
    m = DishModel3D.objects.create(dish=dish, restaurant=restaurant,
                                   status='ready', glb_url='https://cdn/x.glb',
                                   glb_bytes=2_100_000)
    assert m.glb_bytes <= settings.MAX_GLB_BYTES


# ================= 2. ⚡ FALLBACK ZANJIRI =================

@pytest.mark.django_db
def test_fallback_when_model_not_ready(api_client, restaurant, dish):
    """Bosqich 4: model yo'q → rasm"""
    r = api_client.get(f'/v1/ar/{dish.id}/',
                       HTTP_HOST=f'{restaurant.slug}.localhost')
    j = r.json()
    assert j['ready'] is False
    assert j['fallback'] == 'image'
    assert j['status'] == 'none'


@pytest.mark.django_db
def test_fallback_while_processing(api_client, restaurant, dish):
    DishModel3D.objects.create(dish=dish, restaurant=restaurant,
                               status='processing', progress=67)
    j = api_client.get(f'/v1/ar/{dish.id}/',
                       HTTP_HOST=f'{restaurant.slug}.localhost').json()
    assert j['ready'] is False
    assert j['progress'] == 67
    assert j['fallback'] == 'image'


@pytest.mark.django_db
def test_360_available_when_set(api_client, restaurant, dish):
    DishModel3D.objects.create(dish=dish, restaurant=restaurant, status='ready',
                               glb_url='https://cdn/x.glb',
                               preview_360='https://cdn/x_{i}.webp',
                               real_size_cm=Decimal('25'))
    j = api_client.get(f'/v1/ar/{dish.id}/',
                       HTTP_HOST=f'{restaurant.slug}.localhost').json()
    assert j['preview_360'].endswith('_{i}.webp')     # bosqich 3 mavjud


# ================= 3. ⚡ CROSS-TENANT HIMOYA =================

@pytest.mark.django_db
def test_cannot_read_other_restaurant_ar(api_client, restaurant, dish2):
    """⚡ 2-restoran taomining AR ma'lumoti 1-restorandan ko'rinmasligi kerak"""
    r = api_client.get(f'/v1/ar/{dish2.id}/',
                       HTTP_HOST=f'{restaurant.slug}.localhost')
    assert r.status_code == 403
    assert r.json()['error']['code'] == 'TENANT_MISMATCH'


@pytest.mark.django_db
def test_ar_view_rejects_foreign_dish(api_client, restaurant, dish2):
    r = api_client.post('/v1/ar/view/',
                        {'dish_id': dish2.id, 'mode': 'quick-look',
                         'duration_sec': 10},
                        format='json', HTTP_HOST=f'{restaurant.slug}.localhost')
    assert r.status_code == 403


# ================= 4. ANALITIKA =================

@pytest.mark.django_db
def test_ar_view_recorded_and_counters(api_client, restaurant, dish):
    m = DishModel3D.objects.create(dish=dish, restaurant=restaurant,
                                   status='ready', glb_url='https://cdn/x.glb')
    api_client.post('/v1/ar/view/',
                    {'dish_id': dish.id, 'mode': 'quick-look',
                     'duration_sec': 24, 'device': 'ios', 'converted': True},
                    format='json', HTTP_HOST=f'{restaurant.slug}.localhost')
    assert ARView.objects.filter(dish=dish, mode='quick-look').count() == 1
    m.refresh_from_db()
    assert m.view_count == 1
    assert m.convert_count == 1
    assert m.convert_rate == 100.0


# ================= 5. ⚡ TARIF NAZORATI =================

@pytest.mark.django_db
def test_free_plan_cannot_generate(admin_client_free, dish):
    r = admin_client_free.post('/v1/admin/ar/generate/',
                               {'dish_id': dish.id, 'real_size_cm': 32},
                               format='json')
    assert r.status_code == 402
    assert r.json()['error']['code'] == 'PLAN_LIMIT'


@pytest.mark.django_db
def test_pro_plan_queues_job(admin_client_pro, dish, restaurant):
    restaurant.plan = 'pro'; restaurant.ar_model_limit = 50; restaurant.save()
    dish.image = 'dish/osh.jpg'; dish.save()
    r = admin_client_pro.post('/v1/admin/ar/generate/',
                              {'dish_id': dish.id, 'real_size_cm': 32},
                              format='json')
    assert r.status_code == 202                  # ⚡ darhol qaytdi, kutmadi
    job = Model3DJob.objects.get(id=r.json()['job_id'])
    assert job.status == 'queued'
    assert float(job.real_size_cm) == 32.0


@pytest.mark.django_db
def test_absurd_size_rejected(admin_client_pro, dish, restaurant):
    restaurant.plan = 'pro'; restaurant.ar_model_limit = 50; restaurant.save()
    for bad in (0, 2, 500):
        r = admin_client_pro.post('/v1/admin/ar/generate/',
                                  {'dish_id': dish.id, 'real_size_cm': bad,
                                   'images': ['https://x/a.jpg']}, format='json')
        assert r.status_code == 400


# ================= 6. ⚡ KUTUBXONA (bepul yo'l) =================

@pytest.mark.django_db
def test_worker_prefers_library_zero_cost(restaurant, dish, lib_osh):
    """⚡ Kutubxonada bor → AI CHAQIRILMAYDI, xarajat 0"""
    dish.name_uz = 'Palov'; dish.save()
    job = Model3DJob.objects.create(restaurant=restaurant, dish=dish,
                                    images=['https://x/a.jpg'], real_size_cm=32)

    from apps.ar3d.management.commands.run_model3d_worker import Command
    with patch('apps.ar3d.services.generate.generate_3d') as gen, \
         patch('apps.ar3d.services.library.get_embedding', return_value=None):
        Command()._process(job)

    gen.assert_not_called()                        # ⚡ AI chaqirilmadi
    job.refresh_from_db()
    assert job.status == 'done'
    assert job.provider == 'library'
    assert float(job.cost_usd) == 0.0

    m = DishModel3D.objects.get(dish=dish)
    assert m.status == 'ready'
    assert m.source == 'library'
    assert float(m.real_size_cm) == 32.0           # ⚡ restoran o'lchami saqlandi


@pytest.mark.django_db
def test_library_usage_incremented(dish, lib_osh):
    from apps.ar3d.services.library import copy_from_library
    before = lib_osh.used_by_count
    copy_from_library(dish, lib_osh)
    lib_osh.refresh_from_db()
    assert lib_osh.used_by_count == before + 1


# ================= 7. HAS_3D DENORM =================

@pytest.mark.django_db
def test_has_3d_synced_by_signal(dish, restaurant):
    assert dish.has_3d is False
    m = DishModel3D.objects.create(dish=dish, restaurant=restaurant,
                                   status='ready', glb_url='https://cdn/x.glb')
    dish.refresh_from_db()
    assert dish.has_3d is True          # ⚡ signal ishladi

    m.status = 'failed'; m.save()
    dish.refresh_from_db()
    assert dish.has_3d is False


# ================= 8. WORKER XATO BOSHQARUVI =================

@pytest.mark.django_db
def test_worker_retries_then_fails(restaurant, dish):
    from apps.ar3d.management.commands.run_model3d_worker import Command
    from core.exceptions import ServiceUnavailable

    job = Model3DJob.objects.create(restaurant=restaurant, dish=dish,
                                    images=['https://x/a.jpg'], real_size_cm=25,
                                    prefer_library=False, max_attempts=2,
                                    attempts=2)
    with patch('apps.ar3d.services.generate.generate_3d',
               side_effect=ServiceUnavailable({'x': 1})):
        Command()._process(job)

    job.refresh_from_db()
    assert job.status == 'failed'
    m = DishModel3D.objects.get(dish=dish)
    assert m.status == 'failed'
    assert m.error_msg


@pytest.mark.django_db
def test_worker_rejects_wrong_scale(restaurant, dish, tmp_path):
    """⚡ verify_scale o'tmasa — CDN'ga CHIQMAYDI"""
    from apps.ar3d.management.commands.run_model3d_worker import Command

    job = Model3DJob.objects.create(restaurant=restaurant, dish=dish,
                                    images=['https://x/a.jpg'], real_size_cm=32,
                                    prefer_library=False, max_attempts=1)
    with patch('apps.ar3d.services.generate.generate_3d',
               return_value={'glb_path': str(tmp_path / 'r.glb'),
                             'provider': 'meshy', 'cost_usd': 0.5,
                             'thumbnail': ''}), \
         patch('apps.ar3d.services.optimize.optimize_glb',
               return_value={'bytes': 2000000, 'triangles': 40000, 'ok': True}), \
         patch('apps.ar3d.services.optimize.verify_scale', return_value=False), \
         patch('apps.ar3d.services.storage.upload') as up:
        Command()._process(job)

    up.assert_not_called()               # ⚡ CDN ga yuklanmadi
    job.refresh_from_db()
    assert job.status == 'failed'
```

**`tests/conftest.py` ga qo'shiladigan fixture'lar:**
```python
@pytest.fixture
def lib_osh(db):
    from apps.ar3d.models import DishLibrary
    from decimal import Decimal
    return DishLibrary.objects.create(
        key='osh-toshkent', name_uz='Osh', name_ru='Плов', name_en='Pilaf',
        aliases=['palov', 'плов', 'pilaf', 'osh'], category_key='national',
        glb_url='https://cdn.armenu.uz/library/osh.glb',
        usdz_url='https://cdn.armenu.uz/library/osh.usdz',
        poster_url='https://cdn.armenu.uz/library/osh.webp',
        real_size_cm=Decimal('32'), glb_bytes=2_100_000, usdz_bytes=3_400_000,
        poly_count=41230, quality=4, source='photogrammetry')


@pytest.fixture
def ready_model(db, dish, restaurant):
    from apps.ar3d.models import DishModel3D
    from decimal import Decimal
    return DishModel3D.objects.create(
        dish=dish, restaurant=restaurant, status='ready', source='ai',
        glb_url='https://cdn/x.glb', usdz_url='https://cdn/x.usdz',
        poster_url='https://cdn/x.webp', real_size_cm=Decimal('26'),
        glb_bytes=2_000_000, usdz_bytes=3_000_000, poly_count=38000)


@pytest.fixture
def dish_b(db, restaurant):
    from apps.menu.models import Category, Dish
    from decimal import Decimal
    cat = Category.objects.filter(restaurant=restaurant).first() or \
          Category.objects.create(restaurant=restaurant, name_uz='Salat')
    return Dish.objects.create(category=cat, restaurant=restaurant,
                               name_uz='Achchiq-chuchuk', price=Decimal('18000'))


@pytest.fixture
def admin_client_pro(db, restaurant, django_user_model):
    from rest_framework.test import APIClient
    from apps.accounts.models import Staff
    from apps.accounts.tokens import encode_staff_token
    restaurant.plan = 'pro'; restaurant.ar_model_limit = 50; restaurant.save()
    u = django_user_model.objects.create_user('adm_pro', password='x')
    s = Staff.objects.create(restaurant=restaurant, user=u, role='admin')
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION='Bearer ' + encode_staff_token(s))
    return c


@pytest.fixture
def admin_client_free(db, restaurant, django_user_model):
    from rest_framework.test import APIClient
    from apps.accounts.models import Staff
    from apps.accounts.tokens import encode_staff_token
    restaurant.plan = 'free'; restaurant.ar_model_limit = 0; restaurant.save()
    u = django_user_model.objects.create_user('adm_free', password='x')
    s = Staff.objects.create(restaurant=restaurant, user=u, role='admin')
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION='Bearer ' + encode_staff_token(s))
    return c
```

✅ **Tekshirish:**
```bash
pytest tests/test_ar.py tests/test_ar_scale.py tests/test_library_search.py \
       tests/test_library_add.py tests/test_library_copy.py \
       tests/test_generate_chain.py tests/test_ar_analytics.py -v
# 30+ test o'tadi
```

---

# ✅ FAZA 6 QABULI

> ⚡ **Bu faza butun loyihaning sotuv argumenti.** Bir dona ✅ bo'lmasa —
> keyingi fazaga O'TILMAYDI.

### 🔴 KRITIK (buzilsa AR ishlamaydi)

```
[ ] ⚡ <model-viewer> da ar-scale="fixed"     (konsolda tekshirilgan, "auto" EMAS)
[ ] ⚡ GET /v1/ar/{id}/ → scale_m METRDA      (0.32, 32 emas, 1.0 emas)
[ ] ⚡ verify_scale() barcha modelda o'tdi    (gorizontal o'lcham ±2 sm)
[ ] ⚡ Model tagi Y=0                          (test_bottom_is_at_y_zero ✅)
[ ] ⚡ Haqiqiy telefonda AR ochildi va lagan HAQIQIY o'lchamda ko'rindi
      • iPhone (Quick Look, USDZ)
      • Android (Scene Viewer, GLB)
      • Ruletka bilan o'lchandi: ±2 sm ichida
[ ] ⚡ GLB ≤ 3 MB · USDZ ≤ 5 MB               (barcha tayyor modelda)
[ ] ⚡ USDZ Content-Type: model/vnd.usdz+zip  (curl -I bilan tekshirilgan)
```

### 🟡 ASOSIY

```
[ ] python manage.py check / migrate          → xato yo'q
[ ] pgvector kengaytmasi + HNSW indeks        → \dx vector, \d+ ar3d_dishlibrary
[ ] 4 bosqichli fallback ishladi:
      1. AR (WebXR/QuickLook/SceneViewer)
      2. 3D aylantirish
      3. 360° karusel
      4. Oddiy rasm            ← BO'SH EKRAN HECH QACHON YO'Q
[ ] Kutubxona qidiruvi: "Палов" → osh-toshkent topildi
[ ] Semantik qidiruv ishladi (embedding bo'lsa)
[ ] ⚡ Kutubxonadan nusxa: 5 soniya, $0, fayl ko'chirilmadi
[ ] AI zanjiri: Meshy yiqilsa → Tripo → Rodin
[ ] Worker ALOHIDA servisda (armenu-model3d), gunicorn'da EMAS
[ ] Worker qayta ishga tushsa — osilgan job qayta navbatga tushdi
[ ] Kutubxonaga avto-qo'shildi (umumiy taom) / qo'shilmadi (brend taomi)
[ ] POST /admin/ar/generate/ → 202 darhol qaytdi (kutmadi)
[ ] A-04 sahifasi: progress WS orqali jonli o'zgardi
[ ] AR analitika: "ko'rgan vs ko'rmagan" farqi hisoblandi
[ ] Super-admin kutubxona: tejalgan pul ko'rsatildi
```

### 🟢 XAVFSIZLIK / SIFAT

```
[ ] ⚡ 2-restoran taomining AR ma'lumoti 1-restorandan KO'RINMADI (403)
[ ] ⚡ FREE tarif AI generatsiya qila olmadi (402 PLAN_LIMIT)
[ ] ⚡ Absurd o'lcham (0 sm, 500 sm) rad etildi (400)
[ ] ⚡ verify_scale o'tmagan model CDN ga CHIQMADI
[ ] Dish.has_3d signal orqali sinxron (menyu keshi ham eskirdi)
[ ] AR modal dark + light rejimda to'g'ri
[ ] pytest tests/ -q → hammasi o'tadi (60+ test)
```

### 📱 QO'LDA TEKSHIRISH (majburiy — kod bilan almashtirib bo'lmaydi)

```
1. Haqiqiy iPhone'da menyuni oching → "🎯 AR" bosing
   → "📱 Stolga qo'yib ko'rish" → kamera → stolga qo'ying
   → ⚡ RULETKA bilan o'lchang: lagan 32 sm bo'lishi kerak (±2 sm)
   → Taom stolda "yotibdi", uchmayapti, botmayapti

2. Android telefonda ayni shu

3. Eski/zaif telefonda (Android 8, 2 GB RAM)
   → 3D yoki 360° yoki rasm chiqishi kerak, BO'SH EKRAN EMAS

4. Aviarejimda (tarmoqsiz) AR bosing
   → xato xabari chiqadi, sahifa qotmaydi
```

**Yakuniy:**
```bash
python manage.py collectstatic --noinput
sudo systemctl restart armenu-model3d
git add -A && git commit -m "FAZA 6 tugadi: ⚡ AR/3D (real o'lcham, kutubxona, worker)"
python3 ROADMAP/03_HOLAT/update_progress.py V-142 ok "FAZA 6 tugadi — AR ishlaydi"
```

**➡️ Keyingi:** `FAZA_07_ZAL_PLAN.md`
