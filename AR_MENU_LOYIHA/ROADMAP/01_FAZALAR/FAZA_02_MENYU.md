# FAZA 2 — MENYU

**Vazifalar:** V-031 … V-054 (24 ta) · **Muddat:** 2 hafta
**Maqsad:** Menyu yadrosi — `Category`, `Dish`, `DishModifier`, `UpsellRule`,
3 tilli chiqish, rasm optimizatsiyasi (WebP), ⚡ `GET /v1/menu/{slug}/` (Redis kesh + ETag),
qidiruv (pg_trgm), admin CRUD, Excel import, IKPU kod.

> ⚠️ FAZA 1 (`FAZA_01_TENANT_AUTH.md`) to'liq bajarilgan bo'lishi SHART.
> `Restaurant`, `Staff`, JWT, `core/permissions.py`, `TenantScopedMixin` mavjud.

**Qo'shimcha paketlar:**
```bash
pip install openpyxl pillow-heif
pip freeze > requirements.txt
```

**PostgreSQL kengaytmalari (bir marta):**
```bash
sudo -u postgres psql -d armenu_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
sudo -u postgres psql -d armenu_db -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
```

---

## V-031 — `Category` modeli (3 til)

```bash
mkdir -p apps/menu/migrations apps/menu/services && \
touch apps/menu/__init__.py apps/menu/migrations/__init__.py apps/menu/services/__init__.py
```

**Fayl:** `apps/menu/apps.py`
```python
from django.apps import AppConfig


class MenuConfig(AppConfig):
    name = 'apps.menu'
    label = 'menu'

    def ready(self):
        import apps.menu.signals  # noqa  (V-043)
```

**Fayl:** `apps/menu/models.py`
```python
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from core.models import TenantModel


class Category(TenantModel):
    """⚡ TenantModel → restaurant FK + created_at/updated_at avtomatik"""
    name_uz   = models.CharField(max_length=120)
    name_ru   = models.CharField(max_length=120, blank=True)
    name_en   = models.CharField(max_length=120, blank=True)

    icon      = models.CharField(max_length=40, blank=True)     # emoji yoki ikonka kodi
    image     = models.ImageField(upload_to='cat/', null=True, blank=True)
    image_webp = models.CharField(max_length=255, blank=True)

    order     = models.IntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_category'
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'is_active', 'order']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['restaurant', 'name_uz'],
                                    name='uniq_category_name_per_restaurant'),
        ]

    def __str__(self):
        return f'{self.name_uz} (rest#{self.restaurant_id})'
```

✅ **Tekshirish:** `python manage.py check`

---

## V-032 — `Dish` modeli (to'liq)

**Fayl:** `apps/menu/models.py` (davomi)

```python
ALLERGENS = ['nuts', 'gluten', 'dairy', 'eggs', 'fish', 'shellfish',
             'soy', 'sesame', 'celery', 'mustard']
DIET_TAGS = ['halal', 'vegetarian', 'vegan', 'spicy', 'no_spicy',
             'lactose_free', 'gluten_free', 'low_cal']


class Dish(TenantModel):
    """
    ⚡ restaurant FK — TenantModel dan (denormalizatsiya: category orqali ham
    olish mumkin edi, lekin har so'rovda JOIN bo'lmasligi uchun to'g'ridan-to'g'ri).
    """
    category = models.ForeignKey(Category, on_delete=models.CASCADE,
                                 related_name='dishes')

    name_uz  = models.CharField(max_length=200)
    name_ru  = models.CharField(max_length=200, blank=True)
    name_en  = models.CharField(max_length=200, blank=True)
    desc_uz  = models.TextField(blank=True)
    desc_ru  = models.TextField(blank=True)
    desc_en  = models.TextField(blank=True)

    # Tarjima holati (AI tarjima qilganmi / admin tasdiqladimi)
    tr_auto     = models.JSONField(default=dict, blank=True)   # {"ru":true,"en":false}
    tr_approved = models.JSONField(default=dict, blank=True)

    price     = models.DecimalField(max_digits=12, decimal_places=2)
    old_price = models.DecimalField(max_digits=12, decimal_places=2,
                                    null=True, blank=True)

    image      = models.ImageField(upload_to='dish/', null=True, blank=True)
    image_webp = models.CharField(max_length=255, blank=True)   # 800px
    image_md   = models.CharField(max_length=255, blank=True)   # 400px
    image_sm   = models.CharField(max_length=255, blank=True)   # 200px
    image_blur = models.CharField(max_length=120, blank=True)   # LQIP base64

    weight_g = models.IntegerField(null=True, blank=True)
    cook_min = models.SmallIntegerField(default=15)
    calories = models.IntegerField(null=True, blank=True)

    ingredients_uz = models.TextField(blank=True)
    ingredients_ru = models.TextField(blank=True)
    ingredients_en = models.TextField(blank=True)

    allergens = ArrayField(models.CharField(max_length=30), default=list, blank=True)
    diet_tags = ArrayField(models.CharField(max_length=30), default=list, blank=True)

    ikpu_code    = models.CharField(max_length=30, blank=True, db_index=True)  # ⚡ SOLIQ
    package_code = models.CharField(max_length=30, blank=True)

    is_available = models.BooleanField(default=True, db_index=True)   # stop-list
    stop_until   = models.DateTimeField(null=True, blank=True)        # avtomatik qaytish
    is_hit       = models.BooleanField(default=False)
    is_new       = models.BooleanField(default=False)
    order        = models.IntegerField(default=0, db_index=True)

    # ⚡ Denormalizatsiya (tez o'qish uchun)
    has_3d     = models.BooleanField(default=False, db_index=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_cnt = models.IntegerField(default=0)
    sold_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'menu_dish'
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'is_available', 'order']),
            models.Index(fields=['category', 'order']),
            models.Index(fields=['restaurant', 'has_3d']),
            GinIndex(fields=['diet_tags'], name='dish_diet_gin'),
            GinIndex(fields=['allergens'], name='dish_allergens_gin'),
        ]

    def __str__(self):
        return f'{self.name_uz} — {self.price}'

    def save(self, *args, **kwargs):
        # ⚡ Kategoriya bilan restoran mos kelishi SHART
        if self.category_id and not self.restaurant_id:
            self.restaurant_id = self.category.restaurant_id
        super().save(*args, **kwargs)

    @property
    def has_discount(self) -> bool:
        return bool(self.old_price and self.old_price > self.price)
```

⚠️ **`clean()` bilan cross-tenant himoya** — `apps/menu/models.py` `Dish` ichiga:
```python
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.category_id and self.restaurant_id:
            if self.category.restaurant_id != self.restaurant_id:
                raise ValidationError('⛔ Kategoriya boshqa restoranga tegishli')
```

✅ **Tekshirish:** `python manage.py check`

---

## V-033 — `DishModifier` modeli

**Fayl:** `apps/menu/models.py` (davomi)

```python
class DishModifier(TenantModel):
    """
    Taom qo'shimchasi: "Qo'shimcha go'sht +25000", "Achchiqsiz +0"
    group — bir guruhdan bittasini tanlash (radio) yoki bir nechta (checkbox)
    """
    GROUPS = [
        ('extra',   'Qo\'shimcha'),
        ('size',    'Hajm'),
        ('remove',  'Olib tashlash'),
        ('sauce',   'Sous'),
        ('cooking', 'Tayyorlash darajasi'),
    ]
    dish     = models.ForeignKey(Dish, on_delete=models.CASCADE,
                                 related_name='modifiers')
    name_uz  = models.CharField(max_length=120)
    name_ru  = models.CharField(max_length=120, blank=True)
    name_en  = models.CharField(max_length=120, blank=True)

    price_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    group       = models.CharField(max_length=20, choices=GROUPS, default='extra')
    is_default  = models.BooleanField(default=False)
    single_choice = models.BooleanField(default=False)   # guruhdan faqat bittasi
    order       = models.IntegerField(default=0)
    is_active   = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_modifier'
        ordering = ['group', 'order', 'id']
        indexes = [
            models.Index(fields=['dish', 'is_active', 'order']),
            models.Index(fields=['restaurant', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name_uz} ({self.price_delta:+})'

    def save(self, *args, **kwargs):
        if self.dish_id and not self.restaurant_id:
            self.restaurant_id = self.dish.restaurant_id
        super().save(*args, **kwargs)
```

---

## V-034 — `UpsellRule` modeli

**Fayl:** `apps/menu/models.py` (davomi)

```python
class UpsellRule(TenantModel):
    """
    ⚡ "Oshga achchiq-chuchuk salat?" — savatga qo'shilgan taomga
    bog'liq taklif. O'rtacha chek +12-18% oshiradi.
    """
    trigger_dishes = models.ManyToManyField(Dish, related_name='upsell_triggers',
                                            blank=True)
    trigger_category = models.ForeignKey(Category, null=True, blank=True,
                                         on_delete=models.CASCADE,
                                         related_name='upsell_triggers')
    suggest_dish = models.ForeignKey(Dish, on_delete=models.CASCADE,
                                     related_name='upsell_suggested')

    text_uz = models.CharField(max_length=200)
    text_ru = models.CharField(max_length=200, blank=True)
    text_en = models.CharField(max_length=200, blank=True)

    priority   = models.SmallIntegerField(default=0)     # katta = oldin ko'rsatiladi
    max_per_order = models.SmallIntegerField(default=1)
    discount_pct  = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Statistika (denorm)
    shown_count    = models.IntegerField(default=0)
    accepted_count = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'menu_upsell_rule'
        ordering = ['-priority', 'id']
        indexes = [models.Index(fields=['restaurant', 'is_active', '-priority'])]

    def __str__(self):
        return f'→ {self.suggest_dish.name_uz}'

    @property
    def accept_rate(self) -> float:
        return round(self.accepted_count * 100 / self.shown_count, 1) if self.shown_count else 0.0
```

✅ **Tekshirish:** `python manage.py check`

---

## V-035 — Migratsiya + GIN indekslar

```bash
python manage.py makemigrations menu
python manage.py migrate
```

**Fayl:** `apps/menu/migrations/0002_trgm_indexes.py`
```python
"""⚡ pg_trgm indekslari — qidiruv (V-041) uchun. Django avtomatik yarata olmaydi."""
from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension, UnaccentExtension


class Migration(migrations.Migration):
    dependencies = [('menu', '0001_initial')]

    operations = [
        TrigramExtension(),
        UnaccentExtension(),
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS dish_name_uz_trgm
                ON menu_dish USING gin (name_uz gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_name_ru_trgm
                ON menu_dish USING gin (name_ru gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_name_en_trgm
                ON menu_dish USING gin (name_en gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_desc_uz_trgm
                ON menu_dish USING gin (desc_uz gin_trgm_ops);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS dish_name_uz_trgm;
            DROP INDEX IF EXISTS dish_name_ru_trgm;
            DROP INDEX IF EXISTS dish_name_en_trgm;
            DROP INDEX IF EXISTS dish_desc_uz_trgm;
            """,
        ),
    ]
```

```bash
python manage.py migrate menu
```

✅ **Tekshirish:**
```bash
sudo -u postgres psql -d armenu_db -c "\di menu_dish*"
# dish_diet_gin, dish_allergens_gin, dish_name_uz_trgm, ... ko'rinadi
```

---

## V-036 — ⚡ `core/i18n.py` — `t()` funksiyasi

> Bu funksiya loyihaning HAR joyida ishlatiladi. Fallback zanjiri: `so'ralgan → uz → ru → en`.

**Fayl:** `core/i18n.py`
```python
"""
⚡ 3 tilli maydonlar bilan ishlash. Bo'sh tarjima → fallback.
Ishlatish:
    t(dish, 'name', 'ru')  → dish.name_ru yoki dish.name_uz
    tdict(dish, 'name')    → {'uz': ..., 'ru': ..., 'en': ...}
"""
LANGS = ('uz', 'ru', 'en')
DEFAULT_LANG = 'uz'
FALLBACK_CHAIN = ('uz', 'ru', 'en')       # ⚡ zanjir tartibi


def normalize_lang(lang) -> str:
    """'ru-RU', 'RU', None → 'ru' / 'uz'"""
    if not lang:
        return DEFAULT_LANG
    code = str(lang).strip().lower().replace('_', '-').split('-')[0]
    if code in ('oz', 'uz'):
        return 'uz'
    return code if code in LANGS else DEFAULT_LANG


def t(obj, field: str, lang: str = DEFAULT_LANG) -> str:
    """
    obj.<field>_<lang> ni qaytaradi. Bo'sh bo'lsa fallback zanjiri bo'yicha izlaydi.
    Hech narsa topilmasa — bo'sh satr (None EMAS).
    """
    lang = normalize_lang(lang)
    val = getattr(obj, f'{field}_{lang}', None)
    if val:
        return val
    for fb in FALLBACK_CHAIN:
        if fb == lang:
            continue
        val = getattr(obj, f'{field}_{fb}', None)
        if val:
            return val
    return ''


def tdict(obj, field: str) -> dict:
    """Barcha tillar — admin panel uchun"""
    return {lg: (getattr(obj, f'{field}_{lg}', '') or '') for lg in LANGS}


def pick_lang(request, restaurant=None) -> str:
    """
    ⚡ Til aniqlash — 4 bosqich (V-070 da to'ldiriladi):
      1. ?lang=  query
      2. cookie  armenu_lang
      3. Accept-Language header
      4. restoran default_lang
    """
    q = request.GET.get('lang') if hasattr(request, 'GET') else None
    if q:
        code = normalize_lang(q)
        if restaurant is None or code in (restaurant.langs_enabled or LANGS):
            return code

    ck = request.COOKIES.get('armenu_lang') if hasattr(request, 'COOKIES') else None
    if ck:
        return normalize_lang(ck)

    hdr = request.headers.get('Accept-Language', '') if hasattr(request, 'headers') else ''
    for part in hdr.split(','):
        code = normalize_lang(part.split(';')[0])
        if code in LANGS:
            if restaurant is None or code in (restaurant.langs_enabled or LANGS):
                return code

    return normalize_lang(getattr(restaurant, 'default_lang', DEFAULT_LANG))


def missing_translations(obj, fields, langs=LANGS) -> dict:
    """Admin uchun: qaysi tarjima yo'q — {'name': ['ru'], 'desc': ['ru','en']}"""
    out = {}
    for f in fields:
        gaps = [lg for lg in langs if not getattr(obj, f'{f}_{lg}', '')]
        if gaps:
            out[f] = gaps
    return out
```

✅ **Test:** `tests/test_i18n.py` (V-054 da kengaytiriladi)
```python
from types import SimpleNamespace
from core.i18n import t, tdict, normalize_lang, missing_translations


def test_returns_requested_lang():
    o = SimpleNamespace(name_uz='Osh', name_ru='Плов', name_en='Pilaf')
    assert t(o, 'name', 'ru') == 'Плов'
    assert t(o, 'name', 'en') == 'Pilaf'


def test_fallback_to_uz_when_empty():
    o = SimpleNamespace(name_uz='Osh', name_ru='', name_en='')
    assert t(o, 'name', 'ru') == 'Osh'
    assert t(o, 'name', 'en') == 'Osh'


def test_fallback_chain_uz_ru_en():
    o = SimpleNamespace(name_uz='', name_ru='', name_en='Pilaf')
    assert t(o, 'name', 'ru') == 'Pilaf'


def test_never_returns_none():
    o = SimpleNamespace(name_uz='', name_ru='', name_en='')
    assert t(o, 'name', 'ru') == ''


def test_normalize_lang():
    assert normalize_lang('ru-RU') == 'ru'
    assert normalize_lang('EN') == 'en'
    assert normalize_lang('fr') == 'uz'
    assert normalize_lang(None) == 'uz'


def test_missing_translations():
    o = SimpleNamespace(name_uz='Osh', name_ru='', name_en='Pilaf',
                        desc_uz='', desc_ru='', desc_en='')
    m = missing_translations(o, ['name', 'desc'])
    assert m['name'] == ['ru']
    assert set(m['desc']) == {'uz', 'ru', 'en'}
```

---

## V-037 — Rasm optimizatsiyasi (WebP, 3 o'lcham)

**Fayl:** `apps/menu/services/images.py`
```python
"""
⚡ Yuklangan rasm → 3 o'lchamli WebP + LQIP (blur placeholder).
Sabab: mobil internetda menyu 3 sekunddan tez ochilishi kerak.
    800px — taom modali
    400px — menyu kartochkasi
    200px — ro'yxat/savat
"""
import io
import os
import base64
import logging
from PIL import Image, ImageOps, ImageFilter
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

log = logging.getLogger('menu.images')

SIZES = {'lg': 800, 'md': 400, 'sm': 200}
QUALITY = {'lg': 82, 'md': 80, 'sm': 75}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _open(fileobj) -> Image.Image:
    fileobj.seek(0)
    img = Image.open(fileobj)
    img = ImageOps.exif_transpose(img)          # telefon rasmlari aylanib qolmasin
    if img.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', img.size, (255, 255, 255))
        img = img.convert('RGBA')
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert('RGB')
    return img


def _crop_square(img: Image.Image) -> Image.Image:
    """Menyu kartochkalari bir xil ko'rinishi uchun 1:1"""
    w, h = img.size
    side = min(w, h)
    return img.crop(((w - side) // 2, (h - side) // 2,
                     (w + side) // 2, (h + side) // 2))


def make_lqip(img: Image.Image) -> str:
    """20px blur → base64 data URI (sahifa yuklanayotganda ko'rinadi)"""
    tiny = img.resize((20, 20), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
    buf = io.BytesIO()
    tiny.save(buf, format='WEBP', quality=40)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def process_dish_image(dish, fileobj=None, square=True) -> dict:
    """
    ⚡ dish.image dan 3 o'lchamli WebP yaratadi va dish maydonlarini yangilaydi.
    Qaytadi: {'lg': url, 'md': url, 'sm': url, 'blur': data-uri}
    """
    src = fileobj or dish.image
    if not src:
        return {}
    if getattr(src, 'size', 0) > MAX_UPLOAD_BYTES:
        raise ValueError(f'Rasm juda katta (maks {MAX_UPLOAD_BYTES // 1024 // 1024} MB)')

    img = _open(src)
    if square:
        img = _crop_square(img)

    base = f'dish/webp/{dish.restaurant_id}/{dish.pk}'
    out = {}
    for key, size in SIZES.items():
        im = img.copy()
        im.thumbnail((size, size), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format='WEBP', quality=QUALITY[key], method=5)
        path = f'{base}_{key}.webp'
        if default_storage.exists(path):
            default_storage.delete(path)
        saved = default_storage.save(path, ContentFile(buf.getvalue()))
        out[key] = default_storage.url(saved)
        log.info(f'[img] dish#{dish.pk} {key}={size}px {len(buf.getvalue()) // 1024}KB')

    out['blur'] = make_lqip(img)

    dish.image_webp = out['lg']
    dish.image_md   = out['md']
    dish.image_sm   = out['sm']
    dish.image_blur = out['blur'][:120]
    dish.save(update_fields=['image_webp', 'image_md', 'image_sm',
                             'image_blur', 'updated_at'])
    return out


def process_category_image(category, fileobj=None) -> str:
    src = fileobj or category.image
    if not src:
        return ''
    img = _crop_square(_open(src))
    img.thumbnail((400, 400), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='WEBP', quality=80, method=5)
    path = f'cat/webp/{category.restaurant_id}/{category.pk}.webp'
    if default_storage.exists(path):
        default_storage.delete(path)
    saved = default_storage.save(path, ContentFile(buf.getvalue()))
    category.image_webp = default_storage.url(saved)
    category.save(update_fields=['image_webp', 'updated_at'])
    return category.image_webp


def delete_dish_images(dish):
    """Taom o'chirilganda WebP fayllarini ham tozalash"""
    base = f'dish/webp/{dish.restaurant_id}/{dish.pk}'
    for key in SIZES:
        p = f'{base}_{key}.webp'
        try:
            if default_storage.exists(p):
                default_storage.delete(p)
        except Exception as e:
            log.warning(f'[img] o\'chirilmadi {p}: {e}')
```

✅ **Test:** `tests/test_images.py`
```python
import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile


def _png(w=1200, h=900):
    buf = io.BytesIO()
    Image.new('RGB', (w, h), (200, 100, 50)).save(buf, format='PNG')
    return SimpleUploadedFile('t.png', buf.getvalue(), content_type='image/png')


@pytest.mark.django_db
def test_three_sizes_created(dish):
    from apps.menu.services.images import process_dish_image
    out = process_dish_image(dish, fileobj=_png())
    assert set(out) == {'lg', 'md', 'sm', 'blur'}
    assert out['lg'].endswith('.webp')
    dish.refresh_from_db()
    assert dish.image_webp and dish.image_sm


@pytest.mark.django_db
def test_lqip_is_data_uri(dish):
    from apps.menu.services.images import process_dish_image
    out = process_dish_image(dish, fileobj=_png())
    assert out['blur'].startswith('data:image/webp;base64,')
```

---

## V-038 — `MenuSerializer` (kesh uchun tekis)

**Fayl:** `apps/menu/serializers.py`
```python
"""
⚡ Menyu serializeri — Redis'ga saqlanadi, shuning uchun TEKIS (nested minimal)
va DRF obyektlariga bog'liq emas. `lang` context orqali keladi.
"""
from rest_framework import serializers
from core.i18n import t, tdict
from apps.menu.models import Category, Dish, DishModifier, UpsellRule


class ModifierOutSerializer(serializers.Serializer):
    id    = serializers.IntegerField()
    name  = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2,
                                     source='price_delta')
    group = serializers.CharField()
    is_default    = serializers.BooleanField()
    single_choice = serializers.BooleanField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))


class CategoryOutSerializer(serializers.Serializer):
    id    = serializers.IntegerField()
    name  = serializers.SerializerMethodField()
    icon  = serializers.CharField()
    image = serializers.CharField(source='image_webp')
    order = serializers.IntegerField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))


class DishOutSerializer(serializers.Serializer):
    """⚡ Mijoz menyusidagi taom — qisqa kalitlar (JSON hajmi kichik)"""
    id        = serializers.IntegerField()
    cat       = serializers.IntegerField(source='category_id')
    name      = serializers.SerializerMethodField()
    desc      = serializers.SerializerMethodField()
    price     = serializers.DecimalField(max_digits=12, decimal_places=2)
    old_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    img       = serializers.CharField(source='image_md')
    img_lg    = serializers.CharField(source='image_webp')
    blur      = serializers.CharField(source='image_blur')
    weight_g  = serializers.IntegerField()
    cook_min  = serializers.IntegerField()
    calories  = serializers.IntegerField()
    allergens = serializers.ListField()
    diet      = serializers.ListField(source='diet_tags')
    has_3d    = serializers.BooleanField()
    is_hit    = serializers.BooleanField()
    is_new    = serializers.BooleanField()
    rating    = serializers.DecimalField(max_digits=3, decimal_places=2,
                                         source='rating_avg')
    available = serializers.BooleanField(source='is_available')
    modifiers = serializers.SerializerMethodField()

    def get_name(self, o):
        return t(o, 'name', self.context.get('lang', 'uz'))

    def get_desc(self, o):
        return t(o, 'desc', self.context.get('lang', 'uz'))

    def get_modifiers(self, o):
        mods = [m for m in o.modifiers.all() if m.is_active]
        return ModifierOutSerializer(mods, many=True, context=self.context).data


class UpsellOutSerializer(serializers.Serializer):
    id      = serializers.IntegerField()
    trigger = serializers.SerializerMethodField()
    suggest = serializers.IntegerField(source='suggest_dish_id')
    text    = serializers.SerializerMethodField()
    discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)

    def get_trigger(self, o):
        return [d.id for d in o.trigger_dishes.all()]

    def get_text(self, o):
        return t(o, 'text', self.context.get('lang', 'uz'))


# --------------------------------------------------- Admin (CRUD) serializerlari
class CategoryAdminSerializer(serializers.ModelSerializer):
    dish_count = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'icon', 'image',
                  'image_webp', 'order', 'is_active', 'dish_count']
        read_only_fields = ['image_webp']

    def get_dish_count(self, o):
        return o.dishes.count()


class ModifierAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DishModifier
        fields = ['id', 'dish', 'name_uz', 'name_ru', 'name_en', 'price_delta',
                  'group', 'is_default', 'single_choice', 'order', 'is_active']


class DishAdminSerializer(serializers.ModelSerializer):
    modifiers   = ModifierAdminSerializer(many=True, read_only=True)
    translations = serializers.SerializerMethodField()

    class Meta:
        model  = Dish
        fields = [
            'id', 'category', 'name_uz', 'name_ru', 'name_en',
            'desc_uz', 'desc_ru', 'desc_en',
            'ingredients_uz', 'ingredients_ru', 'ingredients_en',
            'price', 'old_price', 'image', 'image_webp', 'image_md', 'image_sm',
            'weight_g', 'cook_min', 'calories', 'allergens', 'diet_tags',
            'ikpu_code', 'package_code', 'is_available', 'stop_until',
            'is_hit', 'is_new', 'order', 'has_3d', 'rating_avg', 'rating_cnt',
            'sold_count', 'modifiers', 'translations',
        ]
        read_only_fields = ['image_webp', 'image_md', 'image_sm', 'has_3d',
                            'rating_avg', 'rating_cnt', 'sold_count']

    def get_translations(self, o):
        from core.i18n import missing_translations
        return {'values': {'name': tdict(o, 'name'), 'desc': tdict(o, 'desc')},
                'missing': missing_translations(o, ['name', 'desc'])}

    def validate(self, data):
        # ⚡ Kategoriya boshqa restorannikimi
        cat = data.get('category')
        rid = self.context['request'].restaurant_id
        if cat and cat.restaurant_id != rid:
            raise serializers.ValidationError({'category': 'Boshqa restoran kategoriyasi'})
        if data.get('price') is not None and data['price'] < 0:
            raise serializers.ValidationError({'price': 'Narx manfiy bo\'lmaydi'})
        old = data.get('old_price')
        if old and data.get('price') and old <= data['price']:
            raise serializers.ValidationError(
                {'old_price': 'Eski narx joriy narxdan katta bo\'lishi kerak'})
        return data


class UpsellAdminSerializer(serializers.ModelSerializer):
    accept_rate = serializers.FloatField(read_only=True)

    class Meta:
        model  = UpsellRule
        fields = ['id', 'trigger_dishes', 'trigger_category', 'suggest_dish',
                  'text_uz', 'text_ru', 'text_en', 'priority', 'max_per_order',
                  'discount_pct', 'is_active', 'shown_count', 'accepted_count',
                  'accept_rate']
        read_only_fields = ['shown_count', 'accepted_count']
```

---

## V-039 — ⚡ `GET /v1/menu/{slug}/` + Redis kesh (60s)

> Bu — platformadagi ENG KO'P chaqiriladigan endpoint. Har QR skanerlashda ishlaydi.

**Fayl:** `apps/menu/services/build.py`
```python
"""
⚡ Menyu JSON'ini yig'adi. N+1 so'rov YO'Q — hammasi 4 ta so'rovda.
Natija Redis'ga menu_version bilan keshlanadi.
"""
import logging
from django.utils import timezone
from apps.menu.models import Category, Dish, UpsellRule
from apps.menu.serializers import (CategoryOutSerializer, DishOutSerializer,
                                   UpsellOutSerializer)

log = logging.getLogger('menu.build')


def build_menu(restaurant, lang='uz') -> dict:
    """DB'dan to'liq menyuni yig'adi (kesh yo'q — chaqiruvchi keshlaydi)"""
    ctx = {'lang': lang}
    rid = restaurant.id

    cats = list(Category.objects.filter(restaurant_id=rid, is_active=True)
                .order_by('order', 'id'))

    dishes = list(
        Dish.objects.filter(restaurant_id=rid, category__is_active=True)
        .select_related('category')
        .prefetch_related('modifiers')
        .order_by('order', 'id')
    )

    upsells = list(
        UpsellRule.objects.filter(restaurant_id=rid, is_active=True)
        .prefetch_related('trigger_dishes')
        .order_by('-priority', 'id')[:50]
    )

    return {
        'restaurant': {
            'id': rid,
            'slug': restaurant.slug,
            'name': restaurant.name,
            'logo': restaurant.logo.url if restaurant.logo else None,
            'colors': {'primary': restaurant.color_primary,
                       'accent': restaurant.color_accent},
            'langs': restaurant.langs_enabled or ['uz'],
            'default_lang': restaurant.default_lang,
            'service_fee_pct': float(restaurant.service_fee_pct),
            'has_ar': any(d.has_3d for d in dishes),
            'phone': restaurant.phone,
            'address': restaurant.address,
        },
        'categories': CategoryOutSerializer(cats, many=True, context=ctx).data,
        'dishes':     DishOutSerializer(dishes, many=True, context=ctx).data,
        'upsell_rules': UpsellOutSerializer(upsells, many=True, context=ctx).data,
        'version':   restaurant.menu_version,
        'lang':      lang,
        'cached_at': timezone.now().isoformat(),
    }
```

**Fayl:** `apps/menu/views.py`
```python
import logging
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from apps.tenants.models import Restaurant
from apps.menu.services.build import build_menu
from core.cache import menu_key
from core.i18n import pick_lang
from core.exceptions import RestaurantInactive

log = logging.getLogger('menu.views')
MENU_TTL = 60          # ⚡ 60 sekund


class GuestThrottle(AnonRateThrottle):
    scope = 'guest'


def get_restaurant(slug):
    """Restoran obyektini keshdan/DB'dan oladi"""
    key = f'rest:slug:{slug}'
    r = cache.get(key)
    if r is None:
        r = Restaurant.objects.filter(slug=slug).first()
        cache.set(key, r or False, 300)
    if not r:
        from django.http import Http404
        raise Http404('Restoran topilmadi')
    if not r.is_active:
        raise RestaurantInactive()
    return r


class MenuView(APIView):
    """
    GET /v1/menu/{slug}/?lang=uz&table=5
    Kesh: menu:{slug}:{lang}:v{menu_version} — 60s
    ⚡ menu_version o'zgarsa kesh kaliti ham o'zgaradi (invalidation bepul).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, slug):
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)
        key = menu_key(slug, lang, restaurant.menu_version)

        data = cache.get(key)
        cache_hit = data is not None
        if not cache_hit:
            data = build_menu(restaurant, lang)
            cache.set(key, data, MENU_TTL)
            log.info(f'[menu] MISS {slug}/{lang} v{restaurant.menu_version} '
                     f'({len(data["dishes"])} taom)')

        data = dict(data)
        data['table'] = self._table(request, restaurant)

        resp = Response(data)
        resp['X-Cache'] = 'HIT' if cache_hit else 'MISS'
        return resp

    @staticmethod
    def _table(request, restaurant):
        tid = request.GET.get('table')
        if not tid:
            return None
        try:
            from apps.tables.models import Table
            tb = Table.objects.select_related('hall').filter(
                id=int(tid), restaurant_id=restaurant.id, is_active=True).first()
        except (ValueError, ImportError):
            return None
        if tb is None:
            return None
        return {'id': tb.id, 'number': tb.number,
                'hall': tb.hall.name if tb.hall_id else ''}
```

**Fayl:** `apps/menu/urls.py`
```python
from django.urls import path
from apps.menu import views

urlpatterns = [
    path('menu/<slug:slug>/',        views.MenuView.as_view(),       name='menu'),
    path('menu/<slug:slug>/search/', views.MenuSearchView.as_view(), name='menu-search'),
    path('dish/<int:pk>/',           views.DishDetailView.as_view(), name='dish-detail'),
]
```

`config/urls.py` ga: `path('v1/', include('apps.menu.urls')),`

✅ **Tekshirish:**
```bash
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/?lang=uz' -D- -o /dev/null | grep X-Cache
# X-Cache: MISS   (birinchi so'rov)
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/?lang=uz' -D- -o /dev/null | grep X-Cache
# X-Cache: HIT    (ikkinchi so'rov)
```

---

## V-040 — ETag + Cache-Control

**Fayl:** `apps/menu/views.py` — `MenuView.get` ni almashtir:
```python
    def get(self, request, slug):
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)
        etag = f'"v{restaurant.menu_version}-{lang}"'

        # ⚡ 304 — trafik tejaladi (mobil internet uchun muhim)
        if request.headers.get('If-None-Match') == etag:
            from django.http import HttpResponse
            resp = HttpResponse(status=304)
            resp['ETag'] = etag
            resp['Cache-Control'] = 'public, max-age=60'
            return resp

        key = menu_key(slug, lang, restaurant.menu_version)
        data = cache.get(key)
        cache_hit = data is not None
        if not cache_hit:
            data = build_menu(restaurant, lang)
            cache.set(key, data, MENU_TTL)
            log.info(f'[menu] MISS {slug}/{lang} v{restaurant.menu_version}')

        data = dict(data)
        data['table'] = self._table(request, restaurant)

        resp = Response(data)
        resp['ETag'] = etag
        resp['Cache-Control'] = 'public, max-age=60'
        resp['Vary'] = 'Accept-Language'
        resp['X-Cache'] = 'HIT' if cache_hit else 'MISS'
        return resp
```

✅ **Tekshirish:**
```bash
ETAG=$(curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/' -D- -o /dev/null | grep -i '^etag' | cut -d' ' -f2 | tr -d '\r')
curl -s -o /dev/null -w '%{http_code}\n' -H "If-None-Match: $ETAG" 'http://127.0.0.1:8060/v1/menu/test-rest/'
# 304
```

---

## V-041 — Qidiruv (pg_trgm)

**Fayl:** `apps/menu/views.py` (qo'shiladi)
```python
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, F, Value, FloatField
from django.db.models.functions import Greatest
from apps.menu.models import Dish
from apps.menu.serializers import DishOutSerializer


class MenuSearchView(APIView):
    """
    GET /v1/menu/{slug}/search/?q=osh&lang=uz
    ⚡ pg_trgm — xato yozilgan so'z ham topiladi ("palov" → "Osh (Palov)")
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    MIN_SIM = 0.2
    LIMIT   = 40

    def get(self, request, slug):
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)
        q = (request.GET.get('q') or '').strip()[:60]

        if len(q) < 2:
            return Response({'query': q, 'count': 0, 'dishes': []})

        base = Dish.objects.filter(restaurant_id=restaurant.id,
                                   category__is_active=True)

        # 1-bosqich: aniq moslik (ICONTAINS) — tez va aniq
        exact = base.filter(
            Q(name_uz__icontains=q) | Q(name_ru__icontains=q) |
            Q(name_en__icontains=q) | Q(ingredients_uz__icontains=q)
        ).prefetch_related('modifiers').select_related('category')[:self.LIMIT]
        exact = list(exact)

        # 2-bosqich: trigram (xato yozuv) — aniq moslik kam bo'lsa
        if len(exact) < 5:
            found_ids = [d.id for d in exact]
            fuzzy = (base.exclude(id__in=found_ids)
                     .annotate(sim=Greatest(
                         TrigramSimilarity('name_uz', q),
                         TrigramSimilarity('name_ru', q),
                         TrigramSimilarity('name_en', q),
                         output_field=FloatField()))
                     .filter(sim__gt=self.MIN_SIM)
                     .order_by('-sim')
                     .prefetch_related('modifiers')
                     .select_related('category')[:self.LIMIT - len(exact)])
            exact += list(fuzzy)

        data = DishOutSerializer(exact, many=True, context={'lang': lang}).data
        return Response({'query': q, 'count': len(data), 'dishes': data})
```

✅ **Tekshirish:**
```bash
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/search/?q=palov' | python -m json.tool | head -20
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/search/?q=oshh' | python -m json.tool | head -5
# xato yozilgan so'z ham topiladi
```

---

## V-042 — `GET /v1/dish/{id}/`

**Fayl:** `apps/menu/views.py` (qo'shiladi)
```python
class DishDetailView(APIView):
    """
    GET /v1/dish/{id}/?lang=uz
    ⚡ Taom modali uchun — to'liq ma'lumot + 3D + o'xshash taomlar.
    Restoran slug'i berilmagani uchun dish orqali topiladi, lekin
    faol restoran tekshiriladi.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, pk):
        dish = (Dish.objects
                .select_related('restaurant', 'category')
                .prefetch_related('modifiers')
                .filter(pk=pk).first())
        if dish is None:
            from django.http import Http404
            raise Http404('Taom topilmadi')
        if not dish.restaurant.is_active:
            raise RestaurantInactive()

        lang = pick_lang(request, dish.restaurant)
        ctx = {'lang': lang}
        data = DishOutSerializer(dish, context=ctx).data

        from core.i18n import t
        data['ingredients'] = t(dish, 'ingredients', lang)
        data['category_name'] = t(dish.category, 'name', lang)

        # 3D ma'lumot (FAZA 5 da to'ldiriladi)
        data['ar'] = self._ar(dish)

        # O'xshash taomlar (bir kategoriya, 6 ta)
        similar = (Dish.objects
                   .filter(restaurant_id=dish.restaurant_id,
                           category_id=dish.category_id, is_available=True)
                   .exclude(pk=dish.pk)
                   .prefetch_related('modifiers')
                   .order_by('-sold_count')[:6])
        data['similar'] = DishOutSerializer(similar, many=True, context=ctx).data
        return Response(data)

    @staticmethod
    def _ar(dish):
        if not dish.has_3d:
            return None
        try:
            from apps.ar3d.models import DishModel3D
            m = DishModel3D.objects.filter(dish=dish, status='ready').first()
        except ImportError:
            return None
        if m is None:
            return None
        return {
            'glb':    m.glb.url if m.glb else None,
            'usdz':   m.usdz.url if m.usdz else None,
            'poster': m.poster.url if m.poster else None,
            'real_size_cm': float(m.real_size_cm),
        }
```

✅ **Tekshirish:**
```bash
curl -s 'http://127.0.0.1:8060/v1/dish/1/?lang=ru' | python -m json.tool | head -25
```

---

## V-043 — ⚡ Kesh invalidation (signal)

**Fayl:** `apps/menu/signals.py`
```python
"""
⚡ Menyu o'zgarsa → Restaurant.menu_version += 1
   → kesh kaliti o'zgaradi → keyingi so'rov yangi ma'lumot oladi.
⛔ cache.delete_pattern ishlatilmaydi (Redis'da sekin va xavfli).
"""
import logging
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.db import transaction
from apps.menu.models import Category, Dish, DishModifier, UpsellRule
from core.cache import bump_menu_version

log = logging.getLogger('menu.signals')


def _bump(restaurant_id, reason=''):
    if not restaurant_id:
        return
    # ⚡ Transaksiya muvaffaqiyatli tugagandan KEYIN
    transaction.on_commit(lambda: _do_bump(restaurant_id, reason))


def _do_bump(restaurant_id, reason):
    try:
        bump_menu_version(restaurant_id)
        log.info(f'[cache] menu_version++ rest#{restaurant_id} ({reason})')
    except Exception as e:
        log.error(f'[cache] bump xato rest#{restaurant_id}: {e}')


@receiver([post_save, post_delete], sender=Category)
def category_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'category')


@receiver([post_save, post_delete], sender=Dish)
def dish_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, f'dish#{instance.pk}')


@receiver([post_save, post_delete], sender=DishModifier)
def modifier_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'modifier')


@receiver([post_save, post_delete], sender=UpsellRule)
def upsell_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'upsell')


@receiver(m2m_changed, sender=UpsellRule.trigger_dishes.through)
def upsell_m2m_changed(sender, instance, action, **kwargs):
    if action in ('post_add', 'post_remove', 'post_clear'):
        _bump(instance.restaurant_id, 'upsell.m2m')
```

`apps/menu/apps.py` da `ready()` ichida import qilingan (V-031).

✅ **Test:** `tests/test_cache_invalidation.py`
```python
import pytest


@pytest.mark.django_db(transaction=True)
def test_menu_version_bumps_on_dish_save(restaurant, category):
    from apps.menu.models import Dish
    v0 = restaurant.menu_version
    Dish.objects.create(restaurant=restaurant, category=category,
                        name_uz='Somsa', price=12000)
    restaurant.refresh_from_db()
    assert restaurant.menu_version > v0


@pytest.mark.django_db(transaction=True)
def test_cache_key_changes_with_version(restaurant):
    from core.cache import menu_key
    k1 = menu_key(restaurant.slug, 'uz', restaurant.menu_version)
    k2 = menu_key(restaurant.slug, 'uz', restaurant.menu_version + 1)
    assert k1 != k2


@pytest.mark.django_db(transaction=True)
def test_menu_endpoint_returns_fresh_after_change(api_client, restaurant, dish):
    r1 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r1.status_code == 200
    dish.price = 99000
    dish.save()
    r2 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    prices = {d['id']: d['price'] for d in r2.data['dishes']}
    assert str(prices[dish.id]).startswith('99000')
```

`tests/conftest.py` ga:
```python
@pytest.fixture
def category(db, restaurant):
    from apps.menu.models import Category
    return Category.objects.create(restaurant=restaurant, name_uz='Milliy taomlar',
                                   name_ru='Национальные', name_en='National', order=1)


@pytest.fixture
def dish(db, restaurant, category):
    from apps.menu.models import Dish
    return Dish.objects.create(
        restaurant=restaurant, category=category,
        name_uz='Osh', name_ru='Плов', name_en='Pilaf',
        desc_uz='Toshkent usulida', price=45000, cook_min=20,
        weight_g=400, diet_tags=['halal', 'no_spicy'], is_available=True)


@pytest.fixture
def dish2(db, restaurant2):
    """⚡ Boshqa restoran taomi — izolyatsiya testlari uchun"""
    from apps.menu.models import Category, Dish
    c = Category.objects.create(restaurant=restaurant2, name_uz='Salatlar')
    return Dish.objects.create(restaurant=restaurant2, category=c,
                               name_uz='Achchiq-chuchuk', price=18000)
```

---

## V-044 — Admin CRUD: kategoriya

**Fayl:** `apps/menu/admin_views.py`
```python
"""
⚡ Restoran admin paneli API. HAR ViewSet:
   - TenantScopedMixin (queryset filtri)
   - IsRestAdmin (rol)
   - AuditLog (o'zgarish yozuvi)
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import TenantScopedMixin
from core.permissions import IsRestAdmin
from apps.analytics.models import AuditLog
from apps.tenants.services import check_limit
from apps.menu.models import Category, Dish, DishModifier, UpsellRule
from apps.menu.serializers import (CategoryAdminSerializer, DishAdminSerializer,
                                   ModifierAdminSerializer, UpsellAdminSerializer)

log = logging.getLogger('menu.admin')


class AuditedModelViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """⚡ Har CRUD amalini AuditLog'ga yozadigan baza ViewSet"""
    audit_model = ''

    def perform_create(self, serializer):
        obj = serializer.save(restaurant_id=self.request.restaurant_id)
        AuditLog.log(action=f'{self.audit_model}.create', model=self.audit_model,
                     object_id=obj.pk, new=serializer.data, request=self.request)
        return obj

    def perform_update(self, serializer):
        old = AuditLog.diff(serializer.instance,
                            [f for f in serializer.fields
                             if f in {fl.name for fl in serializer.instance._meta.fields}])
        obj = serializer.save()
        AuditLog.log(action=f'{self.audit_model}.update', model=self.audit_model,
                     object_id=obj.pk, old=old, new=serializer.data,
                     request=self.request)
        return obj

    def perform_destroy(self, instance):
        AuditLog.log(action=f'{self.audit_model}.delete', model=self.audit_model,
                     object_id=instance.pk, request=self.request)
        instance.delete()


class CategoryViewSet(AuditedModelViewSet):
    """
    CRUD /v1/admin/categories/
    """
    serializer_class   = CategoryAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset           = Category.objects.all()
    audit_model        = 'Category'

    def get_queryset(self):
        return super().get_queryset().order_by('order', 'id')

    def perform_create(self, serializer):
        obj = super().perform_create(serializer)
        if obj.image:
            from apps.menu.services.images import process_category_image
            try:
                process_category_image(obj)
            except Exception as e:
                log.warning(f'[cat] rasm optimizatsiya xatosi: {e}')

    def destroy(self, request, *args, **kwargs):
        """⛔ Ichida taom bo'lsa o'chirilmaydi — arxivlash taklif qilinadi"""
        obj = self.get_object()
        n = obj.dishes.count()
        if n:
            return Response({'error': {
                'code': 'CATEGORY_NOT_EMPTY',
                'message_uz': f'Kategoriyada {n} ta taom bor. Avval ularni ko\'chiring.',
                'message_ru': f'В категории {n} блюд. Сначала перенесите их.',
                'message_en': f'Category has {n} dishes. Move them first.',
            }}, status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """POST /v1/admin/categories/{id}/toggle/ — faol/nofaol"""
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active', 'updated_at'])
        AuditLog.log(action='Category.toggle', model='Category', object_id=obj.pk,
                     new={'is_active': obj.is_active}, request=request)
        return Response({'id': obj.id, 'is_active': obj.is_active})
```

**Fayl:** `apps/menu/admin_urls.py`
```python
from rest_framework.routers import DefaultRouter
from apps.menu import admin_views

router = DefaultRouter()
router.register('categories', admin_views.CategoryViewSet, basename='admin-category')
router.register('dishes',     admin_views.DishViewSet,     basename='admin-dish')
router.register('modifiers',  admin_views.ModifierViewSet, basename='admin-modifier')
router.register('upsell',     admin_views.UpsellViewSet,   basename='admin-upsell')

urlpatterns = router.urls
```

`config/urls.py` ga: `path('v1/admin/', include('apps.menu.admin_urls')),`

✅ **Tekshirish:**
```bash
TOKEN=<admin access token>
curl -s -X POST http://127.0.0.1:8060/v1/admin/categories/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name_uz":"Ichimliklar","name_ru":"Напитки","icon":"🥤","order":5}'
```

---

## V-045 — Admin CRUD: taom

**Fayl:** `apps/menu/admin_views.py` (qo'shiladi)
```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


class DishViewSet(AuditedModelViewSet):
    """
    CRUD /v1/admin/dishes/
    ?category=1&is_available=true&search=osh&ordering=-price
    """
    serializer_class   = DishAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset           = Dish.objects.all()
    audit_model        = 'Dish'
    parser_classes     = [JSONParser, MultiPartParser, FormParser]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['category', 'is_available', 'is_hit', 'is_new', 'has_3d']
    search_fields      = ['name_uz', 'name_ru', 'name_en', 'ikpu_code']
    ordering_fields    = ['order', 'price', 'sold_count', 'rating_avg', 'created_at']
    ordering           = ['order', 'id']

    def get_queryset(self):
        return (super().get_queryset()
                .select_related('category')
                .prefetch_related('modifiers'))

    def perform_create(self, serializer):
        # ⚡ Tarif limiti
        check_limit(self.request.restaurant, 'dish')
        obj = serializer.save(restaurant_id=self.request.restaurant_id)
        AuditLog.log(action='Dish.create', model='Dish', object_id=obj.pk,
                     new={'name': obj.name_uz, 'price': str(obj.price)},
                     request=self.request)
        self._process_image(obj)
        return obj

    def perform_update(self, serializer):
        inst = serializer.instance
        old = {'price': str(inst.price), 'is_available': inst.is_available,
               'name_uz': inst.name_uz}
        obj = serializer.save()
        AuditLog.log(action='Dish.update', model='Dish', object_id=obj.pk,
                     old=old, new={'price': str(obj.price),
                                   'is_available': obj.is_available,
                                   'name_uz': obj.name_uz},
                     request=self.request)
        if 'image' in self.request.FILES:
            self._process_image(obj)
        return obj

    def perform_destroy(self, instance):
        from apps.menu.services.images import delete_dish_images
        AuditLog.log(action='Dish.delete', model='Dish', object_id=instance.pk,
                     old={'name': instance.name_uz}, request=self.request)
        delete_dish_images(instance)
        instance.delete()

    @staticmethod
    def _process_image(obj):
        if not obj.image:
            return
        from apps.menu.services.images import process_dish_image
        try:
            process_dish_image(obj)
        except Exception as e:
            log.warning(f'[dish] rasm optimizatsiya xatosi dish#{obj.pk}: {e}')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /v1/admin/dishes/stats/ — qisqacha ko'rsatkichlar"""
        qs = self.get_queryset()
        return Response({
            'total':      qs.count(),
            'available':  qs.filter(is_available=True).count(),
            'stopped':    qs.filter(is_available=False).count(),
            'with_3d':    qs.filter(has_3d=True).count(),
            'no_image':   qs.filter(image_webp='').count(),
            'no_ikpu':    qs.filter(ikpu_code='').count(),
        })


class ModifierViewSet(AuditedModelViewSet):
    """CRUD /v1/admin/modifiers/?dish=15"""
    serializer_class   = ModifierAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset           = DishModifier.objects.all()
    audit_model        = 'DishModifier'
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['dish', 'group', 'is_active']

    def perform_create(self, serializer):
        dish = serializer.validated_data['dish']
        if dish.restaurant_id != self.request.restaurant_id:
            from core.exceptions import TenantMismatch
            raise TenantMismatch({'dish': dish.id})       # ⚡ cross-tenant blok
        return super().perform_create(serializer)
```

`config/settings/base.py` → `INSTALLED_APPS` ga `'django_filters'`
(`pip install django-filter`), `REST_FRAMEWORK['DEFAULT_FILTER_BACKENDS']` shart emas
(ViewSet'da ko'rsatilgan).

✅ **Tekshirish:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:8060/v1/admin/dishes/?is_available=true&ordering=-price' | python -m json.tool | head
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:8060/v1/admin/dishes/stats/'
```

---

## V-046 — Stop-list toggle

**Fayl:** `apps/menu/admin_views.py` — `DishViewSet` ichiga:
```python
    @action(detail=True, methods=['post'],
            permission_classes=[])                      # ⚡ pastda qayta belgilanadi
    def stop(self, request, pk=None):
        """
        POST /v1/admin/dishes/{id}/stop/  {"minutes": 60}
        ⚡ Ofitsiant/oshpaz ham stop qila oladi (taom tugab qolsa).
        minutes berilsa — shu vaqtdan keyin avtomatik qaytadi.
        """
        from core.permissions import IsStaff
        if not IsStaff().has_permission(request, self):
            return Response({'detail': 'Ruxsat yo\'q'}, status=403)

        dish = self.get_object()
        minutes = int(request.data.get('minutes') or 0)

        dish.is_available = False
        dish.stop_until = None
        fields = ['is_available', 'stop_until', 'updated_at']
        if minutes > 0:
            from django.utils import timezone
            from datetime import timedelta
            dish.stop_until = timezone.now() + timedelta(minutes=min(minutes, 24 * 60))
        dish.save(update_fields=fields)

        AuditLog.log(action='Dish.stop', model='Dish', object_id=dish.pk,
                     new={'minutes': minutes}, request=request)

        # ⚡ Barcha ochiq menyularga darhol xabar
        from core.ws import ws_send, g_admin, g_waiters, g_kds
        payload = {'dish_id': dish.pk, 'name': dish.name_uz, 'available': False,
                   'until': dish.stop_until.isoformat() if dish.stop_until else None}
        for g in (g_admin(dish.restaurant_id), g_waiters(dish.restaurant_id),
                  g_kds(dish.restaurant_id)):
            ws_send(g, 'dish.stopped', payload)

        log.info(f'[stop] dish#{dish.pk} STOP {minutes or "∞"} daq')
        return Response({'id': dish.pk, 'is_available': False,
                         'stop_until': dish.stop_until})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """POST /v1/admin/dishes/{id}/resume/ — stop-listdan chiqarish"""
        from core.permissions import IsStaff
        if not IsStaff().has_permission(request, self):
            return Response({'detail': 'Ruxsat yo\'q'}, status=403)

        dish = self.get_object()
        dish.is_available = True
        dish.stop_until = None
        dish.save(update_fields=['is_available', 'stop_until', 'updated_at'])

        AuditLog.log(action='Dish.resume', model='Dish', object_id=dish.pk,
                     request=request)

        from core.ws import ws_send, g_admin, g_waiters, g_kds
        payload = {'dish_id': dish.pk, 'name': dish.name_uz, 'available': True}
        for g in (g_admin(dish.restaurant_id), g_waiters(dish.restaurant_id),
                  g_kds(dish.restaurant_id)):
            ws_send(g, 'dish.resumed', payload)
        return Response({'id': dish.pk, 'is_available': True})
```

**Fayl:** `apps/menu/management/commands/resume_stopped_dishes.py`
```bash
mkdir -p apps/menu/management/commands && \
touch apps/menu/management/__init__.py apps/menu/management/commands/__init__.py
```
```python
"""⚡ stop_until o'tgan taomlarni avtomatik qaytaradi. Cron: har 5 daqiqada."""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.menu.models import Dish
from core.ws import ws_send, g_admin, g_waiters


class Command(BaseCommand):
    help = 'stop_until muddati tugagan taomlarni menyuga qaytaradi'

    def handle(self, *args, **opts):
        qs = Dish.objects.filter(is_available=False,
                                 stop_until__isnull=False,
                                 stop_until__lte=timezone.now())
        n = 0
        for d in qs.iterator():
            d.is_available = True
            d.stop_until = None
            d.save(update_fields=['is_available', 'stop_until', 'updated_at'])
            payload = {'dish_id': d.pk, 'name': d.name_uz, 'available': True}
            ws_send(g_admin(d.restaurant_id), 'dish.resumed', payload)
            ws_send(g_waiters(d.restaurant_id), 'dish.resumed', payload)
            n += 1
        self.stdout.write(self.style.SUCCESS(f'{n} ta taom menyuga qaytdi'))
```

**Cron:**
```bash
crontab -e
*/5 * * * * cd /home/user/armenu && venv/bin/python manage.py resume_stopped_dishes >> logs/cron.log 2>&1
```

✅ **Tekshirish:**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"minutes":30}' http://127.0.0.1:8060/v1/admin/dishes/1/stop/
python manage.py resume_stopped_dishes
```

---

## V-047 — Excel/CSV import

**Fayl:** `apps/menu/services/importer.py`
```python
"""
⚡ Excel/CSV dan menyu import. Restoranlar 100-300 ta taomni qo'lda kiritmasin.
Ustunlar (sarlavha qatori majburiy):
  kategoriya | nomi | nomi_ru | nomi_en | tavsif | narx | og'irlik |
  pishirish_daqiqa | kaloriya | allergenlar | diyeta | ikpu
"""
import csv
import io
import logging
from decimal import Decimal, InvalidOperation
from django.db import transaction
from apps.menu.models import Category, Dish

log = logging.getLogger('menu.importer')

COLUMNS = {
    'kategoriya': 'category', 'категория': 'category', 'category': 'category',
    'nomi': 'name_uz', 'название': 'name_uz', 'name': 'name_uz',
    'nomi_ru': 'name_ru', 'название_ru': 'name_ru', 'name_ru': 'name_ru',
    'nomi_en': 'name_en', 'name_en': 'name_en',
    'tavsif': 'desc_uz', 'описание': 'desc_uz', 'desc': 'desc_uz',
    'tavsif_ru': 'desc_ru', 'tavsif_en': 'desc_en',
    'narx': 'price', 'цена': 'price', 'price': 'price',
    "og'irlik": 'weight_g', 'вес': 'weight_g', 'weight': 'weight_g',
    'pishirish_daqiqa': 'cook_min', 'время': 'cook_min', 'cook_min': 'cook_min',
    'kaloriya': 'calories', 'калории': 'calories', 'calories': 'calories',
    'allergenlar': 'allergens', 'аллергены': 'allergens', 'allergens': 'allergens',
    'diyeta': 'diet_tags', 'диета': 'diet_tags', 'diet': 'diet_tags',
    'ikpu': 'ikpu_code', 'икпу': 'ikpu_code',
}

REQUIRED = {'category', 'name_uz', 'price'}
MAX_ROWS = 2000


def _rows_from_csv(fileobj):
    fileobj.seek(0)
    raw = fileobj.read()
    text = raw.decode('utf-8-sig') if isinstance(raw, bytes) else raw
    dialect = csv.Sniffer().sniff(text[:2000], delimiters=',;\t') \
        if len(text) > 20 else csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


def _rows_from_xlsx(fileobj):
    from openpyxl import load_workbook
    fileobj.seek(0)
    wb = load_workbook(fileobj, read_only=True, data_only=True)
    ws = wb.active
    return [[('' if c is None else c) for c in row]
            for row in ws.iter_rows(values_only=True)]


def _num(v, cast=Decimal, default=None):
    if v in ('', None):
        return default
    try:
        s = str(v).replace(' ', '').replace(',', '.').replace('\xa0', '')
        return cast(s)
    except (InvalidOperation, ValueError, TypeError):
        return default


def _list(v):
    if not v:
        return []
    return [x.strip().lower() for x in str(v).replace(';', ',').split(',') if x.strip()]


def parse_file(fileobj, filename: str) -> tuple:
    """Qaytadi: (rows: list[dict], errors: list[str])"""
    ext = filename.lower().rsplit('.', 1)[-1]
    if ext in ('xlsx', 'xlsm'):
        raw = _rows_from_xlsx(fileobj)
    elif ext == 'csv':
        raw = _rows_from_csv(fileobj)
    else:
        return [], [f'Qo\'llab-quvvatlanmaydigan format: .{ext} (xlsx yoki csv kerak)']

    if not raw:
        return [], ['Fayl bo\'sh']

    header = [COLUMNS.get(str(h).strip().lower(), None) for h in raw[0]]
    have = {h for h in header if h}
    missing = REQUIRED - have
    if missing:
        return [], [f'Majburiy ustunlar yo\'q: {", ".join(sorted(missing))}']

    rows, errors = [], []
    for i, line in enumerate(raw[1:MAX_ROWS + 1], start=2):
        item = {}
        for col, val in zip(header, line):
            if col:
                item[col] = val
        if not item.get('name_uz') or not str(item.get('name_uz')).strip():
            continue
        price = _num(item.get('price'))
        if price is None or price < 0:
            errors.append(f'{i}-qator: narx noto\'g\'ri ({item.get("price")})')
            continue
        item['price'] = price
        item['weight_g'] = _num(item.get('weight_g'), int)
        item['cook_min'] = _num(item.get('cook_min'), int, 15)
        item['calories'] = _num(item.get('calories'), int)
        item['allergens'] = _list(item.get('allergens'))
        item['diet_tags'] = _list(item.get('diet_tags'))
        item['_row'] = i
        rows.append(item)

    return rows, errors


@transaction.atomic
def import_menu(restaurant, rows, update_existing=True) -> dict:
    """
    ⚡ Bitta transaksiya — yarim import bo'lmasin.
    Bir xil nom bo'lsa: update_existing=True → narx yangilanadi.
    """
    created_c = created_d = updated_d = 0
    cat_cache = {c.name_uz.strip().lower(): c
                 for c in Category.objects.filter(restaurant=restaurant)}

    for row in rows:
        cname = str(row.pop('category', '')).strip()
        key = cname.lower()
        cat = cat_cache.get(key)
        if cat is None:
            cat = Category.objects.create(restaurant=restaurant,
                                          name_uz=cname or 'Boshqa',
                                          order=len(cat_cache) + 1)
            cat_cache[key] = cat
            created_c += 1

        row.pop('_row', None)
        name = str(row['name_uz']).strip()[:200]
        row['name_uz'] = name
        for f in ('name_ru', 'name_en', 'desc_uz', 'desc_ru', 'desc_en', 'ikpu_code'):
            if f in row:
                row[f] = str(row[f] or '').strip()

        existing = Dish.objects.filter(restaurant=restaurant,
                                       name_uz__iexact=name).first()
        if existing and update_existing:
            for k, v in row.items():
                if v not in (None, ''):
                    setattr(existing, k, v)
            existing.category = cat
            existing.save()
            updated_d += 1
        elif existing:
            continue
        else:
            Dish.objects.create(restaurant=restaurant, category=cat, **row)
            created_d += 1

    log.info(f'[import] rest#{restaurant.id}: +{created_c} kat, '
             f'+{created_d} taom, ~{updated_d} yangilandi')
    return {'categories_created': created_c, 'dishes_created': created_d,
            'dishes_updated': updated_d}
```

**Fayl:** `apps/menu/admin_views.py` — `DishViewSet` ichiga:
```python
    @action(detail=False, methods=['post'], url_path='bulk-import',
            parser_classes=[MultiPartParser, FormParser])
    def bulk_import(self, request):
        """
        POST /v1/admin/dishes/bulk-import/  (multipart: file, dry_run)
        ⚡ dry_run=1 → faqat tekshiradi, yozmaydi (oldindan ko'rish).
        """
        from apps.menu.services.importer import parse_file, import_menu
        f = request.FILES.get('file')
        if f is None:
            return Response({'detail': 'file kerak'}, status=400)
        if f.size > 5 * 1024 * 1024:
            return Response({'detail': 'Fayl 5 MB dan katta'}, status=400)

        rows, errors = parse_file(f, f.name)
        if errors and not rows:
            return Response({'ok': False, 'errors': errors}, status=400)

        if str(request.data.get('dry_run', '')) in ('1', 'true', 'True'):
            return Response({'ok': True, 'dry_run': True, 'rows': len(rows),
                             'errors': errors, 'preview': rows[:10]})

        check_limit(request.restaurant, 'dish', add=len(rows))
        result = import_menu(request.restaurant, rows)
        AuditLog.log(action='Dish.bulk_import', model='Dish',
                     new=result, request=request)
        return Response({'ok': True, 'errors': errors, **result})
```

✅ **Tekshirish:**
```bash
printf 'kategoriya,nomi,narx,ogirlik\nMilliy,Osh,45000,400\nMilliy,Manti,38000,300\n' > /tmp/menu.csv
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -F 'file=@/tmp/menu.csv' -F 'dry_run=1' \
  http://127.0.0.1:8060/v1/admin/dishes/bulk-import/ | python -m json.tool
```

---

## V-048 — Tartib o'zgartirish (drag & drop)

**Fayl:** `apps/menu/admin_views.py` (qo'shiladi)
```python
from django.db import transaction as db_transaction


class ReorderMixin:
    """
    ⚡ POST .../reorder/  {"order": [12, 7, 3, 19]}
    Bitta so'rovda barcha tartib yangilanadi (bulk_update — N ta UPDATE emas).
    """
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        ids = request.data.get('order') or []
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'order — id ro\'yxati bo\'lishi kerak'},
                            status=400)
        if len(ids) > 500:
            return Response({'detail': 'Bir marta maks 500 ta'}, status=400)

        qs = self.get_queryset().filter(id__in=ids)      # ⚡ tenant-scoped
        found = {o.id: o for o in qs}
        missing = [i for i in ids if i not in found]
        if missing:
            return Response({'error': {
                'code': 'TENANT_MISMATCH',
                'message_uz': 'Ba\'zi elementlar sizning restoraningizga tegishli emas',
                'message_ru': 'Некоторые элементы не принадлежат вашему ресторану',
                'message_en': 'Some items do not belong to your restaurant',
                'details': {'ids': missing},
            }}, status=403)

        with db_transaction.atomic():
            for pos, oid in enumerate(ids, start=1):
                found[oid].order = pos
            self.get_queryset().model.objects.bulk_update(found.values(), ['order'])

        AuditLog.log(action=f'{self.audit_model}.reorder', model=self.audit_model,
                     new={'count': len(ids)}, request=request)
        return Response({'ok': True, 'count': len(ids)})
```

`CategoryViewSet` va `DishViewSet` deklaratsiyasini o'zgartir:
```python
class CategoryViewSet(ReorderMixin, AuditedModelViewSet):
    ...

class DishViewSet(ReorderMixin, AuditedModelViewSet):
    ...
```

✅ **Tekshirish:**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"order":[3,1,2]}' http://127.0.0.1:8060/v1/admin/categories/reorder/
# {"ok": true, "count": 3}
```

---

## V-049 — Allergen / diet filtri

**Fayl:** `apps/menu/filters.py`
```python
"""
⚡ GIN indeks ustida ishlaydigan filtrlar (V-035).
    ?diet=halal,vegan        — HAMMASI bo'lishi kerak (AND)
    ?no_allergens=nuts,dairy — BULARSIZ (exclude)
    ?max_price=50000&min_price=10000
    ?has_3d=1&is_hit=1
"""
from django.db.models import Q


def apply_menu_filters(qs, params):
    diet = [x.strip().lower() for x in (params.get('diet') or '').split(',') if x.strip()]
    if diet:
        qs = qs.filter(diet_tags__contains=diet)          # ⚡ GIN: barcha teg bor

    diet_any = [x.strip().lower() for x in (params.get('diet_any') or '').split(',') if x.strip()]
    if diet_any:
        qs = qs.filter(diet_tags__overlap=diet_any)       # ⚡ kamida bittasi

    no_all = [x.strip().lower() for x in (params.get('no_allergens') or '').split(',') if x.strip()]
    if no_all:
        qs = qs.exclude(allergens__overlap=no_all)        # ⚡ bularsiz

    for key, lookup in (('min_price', 'price__gte'), ('max_price', 'price__lte'),
                        ('max_cook', 'cook_min__lte'), ('max_cal', 'calories__lte')):
        val = params.get(key)
        if val:
            try:
                qs = qs.filter(**{lookup: float(val)})
            except ValueError:
                pass

    for key, field in (('has_3d', 'has_3d'), ('is_hit', 'is_hit'),
                       ('is_new', 'is_new'), ('available', 'is_available')):
        val = params.get(key)
        if val in ('1', 'true', 'True'):
            qs = qs.filter(**{field: True})
        elif val in ('0', 'false', 'False'):
            qs = qs.filter(**{field: False})

    cat = params.get('category')
    if cat:
        try:
            qs = qs.filter(category_id=int(cat))
        except ValueError:
            pass

    q = (params.get('q') or '').strip()
    if len(q) >= 2:
        qs = qs.filter(Q(name_uz__icontains=q) | Q(name_ru__icontains=q) |
                       Q(name_en__icontains=q))

    order = params.get('sort')
    ORDERS = {'price': 'price', '-price': '-price', 'popular': '-sold_count',
              'rating': '-rating_avg', 'new': '-created_at'}
    return qs.order_by(ORDERS.get(order, 'order'), 'id')


ALLERGEN_LABELS = {
    'nuts':      {'uz': 'Yong\'oq',  'ru': 'Орехи',    'en': 'Nuts'},
    'gluten':    {'uz': 'Glyuten',   'ru': 'Глютен',   'en': 'Gluten'},
    'dairy':     {'uz': 'Sut',       'ru': 'Молоко',   'en': 'Dairy'},
    'eggs':      {'uz': 'Tuxum',     'ru': 'Яйца',     'en': 'Eggs'},
    'fish':      {'uz': 'Baliq',     'ru': 'Рыба',     'en': 'Fish'},
    'shellfish': {'uz': 'Dengiz mahsuloti', 'ru': 'Морепродукты', 'en': 'Shellfish'},
    'soy':       {'uz': 'Soya',      'ru': 'Соя',      'en': 'Soy'},
    'sesame':    {'uz': 'Kunjut',    'ru': 'Кунжут',   'en': 'Sesame'},
}

DIET_LABELS = {
    'halal':        {'uz': 'Halol',        'ru': 'Халяль',       'en': 'Halal'},
    'vegetarian':   {'uz': 'Vegetarian',   'ru': 'Вегетар.',     'en': 'Vegetarian'},
    'vegan':        {'uz': 'Vegan',        'ru': 'Веган',        'en': 'Vegan'},
    'spicy':        {'uz': 'Achchiq',      'ru': 'Острое',       'en': 'Spicy'},
    'no_spicy':     {'uz': 'Achchiq emas', 'ru': 'Не острое',    'en': 'Not spicy'},
    'lactose_free': {'uz': 'Laktozasiz',   'ru': 'Без лактозы',  'en': 'Lactose-free'},
    'gluten_free':  {'uz': 'Glyutensiz',   'ru': 'Без глютена',  'en': 'Gluten-free'},
    'low_cal':      {'uz': 'Kam kaloriya', 'ru': 'Низкокалор.',  'en': 'Low calorie'},
}


def filter_options(lang='uz') -> dict:
    """Frontend uchun filtr tugmalari ro'yxati"""
    return {
        'allergens': [{'key': k, 'label': v.get(lang, v['uz'])}
                      for k, v in ALLERGEN_LABELS.items()],
        'diet':      [{'key': k, 'label': v.get(lang, v['uz'])}
                      for k, v in DIET_LABELS.items()],
    }
```

**Fayl:** `apps/menu/views.py` (qo'shiladi)
```python
class MenuFilterView(APIView):
    """
    GET /v1/menu/{slug}/filter/?diet=halal,vegan&no_allergens=nuts&max_price=60000
    ⚡ Keshlanmaydi (kombinatsiya cheksiz) — lekin GIN indeks tez.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, slug):
        from apps.menu.filters import apply_menu_filters, filter_options
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)

        qs = (Dish.objects.filter(restaurant_id=restaurant.id,
                                  category__is_active=True)
              .select_related('category').prefetch_related('modifiers'))
        qs = apply_menu_filters(qs, request.GET)[:200]

        return Response({
            'count': len(qs),
            'dishes': DishOutSerializer(qs, many=True, context={'lang': lang}).data,
            'options': filter_options(lang),
        })
```

`apps/menu/urls.py` ga:
```python
    path('menu/<slug:slug>/filter/', views.MenuFilterView.as_view(), name='menu-filter'),
```

✅ **Tekshirish:**
```bash
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/filter/?diet=halal&no_allergens=nuts&max_price=50000' \
  | python -c "import sys,json; d=json.load(sys.stdin); print(d['count'], [x['name'] for x in d['dishes']])"
```

---

## V-050 — Upsell qoidalari CRUD

**Fayl:** `apps/menu/admin_views.py` (qo'shiladi)
```python
class UpsellViewSet(AuditedModelViewSet):
    """
    CRUD /v1/admin/upsell/
    ⚡ trigger_dishes va suggest_dish SHU restoranga tegishli bo'lishi SHART.
    """
    serializer_class   = UpsellAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset           = UpsellRule.objects.all()
    audit_model        = 'UpsellRule'

    def get_queryset(self):
        return (super().get_queryset()
                .select_related('suggest_dish', 'trigger_category')
                .prefetch_related('trigger_dishes')
                .order_by('-priority', 'id'))

    def _check_tenant(self, data):
        from core.exceptions import TenantMismatch
        rid = self.request.restaurant_id
        sug = data.get('suggest_dish')
        if sug is not None and sug.restaurant_id != rid:
            raise TenantMismatch({'suggest_dish': sug.id})
        for d in (data.get('trigger_dishes') or []):
            if d.restaurant_id != rid:
                raise TenantMismatch({'trigger_dish': d.id})
        cat = data.get('trigger_category')
        if cat is not None and cat.restaurant_id != rid:
            raise TenantMismatch({'trigger_category': cat.id})

    def perform_create(self, serializer):
        self._check_tenant(serializer.validated_data)
        return super().perform_create(serializer)

    def perform_update(self, serializer):
        self._check_tenant(serializer.validated_data)
        return super().perform_update(serializer)

    @action(detail=False, methods=['get'])
    def performance(self, request):
        """
        GET /v1/admin/upsell/performance/
        ⚡ Qaysi qoida ishlayapti — ko'rsatildi / qabul qilindi / %
        """
        rows = []
        for r in self.get_queryset():
            rows.append({
                'id': r.id,
                'suggest': r.suggest_dish.name_uz,
                'text': r.text_uz,
                'shown': r.shown_count,
                'accepted': r.accepted_count,
                'accept_rate': r.accept_rate,
                'is_active': r.is_active,
            })
        rows.sort(key=lambda x: -x['accept_rate'])
        return Response({'count': len(rows), 'rules': rows})

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active', 'updated_at'])
        return Response({'id': obj.id, 'is_active': obj.is_active})
```

✅ **Tekshirish:**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"trigger_dishes":[1],"suggest_dish":2,"text_uz":"Oshga achchiq-chuchuk salat?","priority":10}' \
  http://127.0.0.1:8060/v1/admin/upsell/
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8060/v1/admin/upsell/performance/
```

---

## V-051 — IKPU kod maydoni + validatsiya

> ⚡ IKPU (МХИК) — O'zbekiston soliq kodi. Fiskal chek uchun MAJBURIY.
> Fiskal yoqilgan restoranda IKPU'siz taom chekka tushmaydi.

**Fayl:** `apps/menu/validators.py`
```python
"""
⚡ IKPU (Yagona mahsulot va xizmatlar tasniflagichi) kodi validatsiyasi.
Format: 17 raqam (ba'zan 10 yoki 14). Faqat raqam.
Package code — o'lchov birligi kodi (soliq bazasidan).
"""
import re
from rest_framework import serializers

IKPU_RE = re.compile(r'^\d{10}$|^\d{14}$|^\d{17}$')
PACKAGE_RE = re.compile(r'^\d{1,10}$')


def validate_ikpu(value: str):
    if not value:
        return ''
    v = re.sub(r'[\s\-]', '', str(value))
    if not IKPU_RE.match(v):
        raise serializers.ValidationError(
            'IKPU kod 10, 14 yoki 17 ta raqamdan iborat bo\'lishi kerak')
    return v


def validate_package_code(value: str):
    if not value:
        return ''
    v = str(value).strip()
    if not PACKAGE_RE.match(v):
        raise serializers.ValidationError('O\'lchov birligi kodi faqat raqam')
    return v


def check_fiscal_readiness(restaurant) -> dict:
    """
    ⚡ Fiskal yoqishdan OLDIN tekshiriladi:
       IKPU'siz taomlar bo'lsa — chek urishda xato bo'ladi.
    """
    from apps.menu.models import Dish
    qs = Dish.objects.filter(restaurant_id=restaurant.id, is_available=True)
    missing = list(qs.filter(ikpu_code='').values('id', 'name_uz')[:50])
    total = qs.count()
    return {
        'ready': len(missing) == 0,
        'total_dishes': total,
        'missing_count': qs.filter(ikpu_code='').count(),
        'missing_sample': missing,
        'message_uz': ('Hammasi tayyor' if not missing
                       else f'{len(missing)}+ taomda IKPU kod yo\'q'),
    }
```

**Fayl:** `apps/menu/serializers.py` — `DishAdminSerializer` ga qo'shiladi:
```python
    def validate_ikpu_code(self, value):
        from apps.menu.validators import validate_ikpu
        return validate_ikpu(value)

    def validate_package_code(self, value):
        from apps.menu.validators import validate_package_code
        return validate_package_code(value)
```

**Fayl:** `apps/menu/admin_views.py` — `DishViewSet` ga:
```python
    @action(detail=False, methods=['get'], url_path='fiscal-readiness')
    def fiscal_readiness(self, request):
        """GET /v1/admin/dishes/fiscal-readiness/"""
        from apps.menu.validators import check_fiscal_readiness
        return Response(check_fiscal_readiness(request.restaurant))
```

✅ **Test:** `tests/test_ikpu.py`
```python
import pytest
from rest_framework.serializers import ValidationError
from apps.menu.validators import validate_ikpu, check_fiscal_readiness


def test_valid_ikpu_lengths():
    assert validate_ikpu('01234567890123456') == '01234567890123456'   # 17
    assert validate_ikpu('01234567890123') == '01234567890123'         # 14
    assert validate_ikpu('0123456789') == '0123456789'                 # 10


def test_ikpu_strips_dashes():
    assert validate_ikpu('0123-4567-89') == '0123456789'


def test_invalid_ikpu_rejected():
    for bad in ('123', 'abcdefghij', '012345678901'):
        with pytest.raises(ValidationError):
            validate_ikpu(bad)


def test_empty_ikpu_allowed():
    assert validate_ikpu('') == ''


@pytest.mark.django_db
def test_fiscal_readiness_reports_missing(restaurant, dish):
    r = check_fiscal_readiness(restaurant)
    assert r['ready'] is False and r['missing_count'] >= 1
    dish.ikpu_code = '01234567890123456'
    dish.save()
    assert check_fiscal_readiness(restaurant)['ready'] is True
```

---

## V-052 — `tasnif.soliq.uz` API qidiruvi

**Fayl:** `apps/fiscal/services/ikpu.py`
```bash
mkdir -p apps/fiscal/services && \
touch apps/fiscal/__init__.py apps/fiscal/services/__init__.py
```
```python
"""
⚡ IKPU kodini avtomatik topish — tasnif.soliq.uz ochiq API.
Admin taom nomini yozadi → tizim mos kodlarni taklif qiladi.

⛔ Tashqi xizmat — CircuitBreaker + kesh MAJBURIY (yiqilsa menyu ishlab tursin).
"""
import logging
import requests
from django.core.cache import cache
from core.resilience import CircuitBreaker, retry

log = logging.getLogger('fiscal.ikpu')

BASE_URL = 'https://tasnif.soliq.uz/api/cls-api/mxik/search/'
TIMEOUT = 6
CACHE_TTL = 60 * 60 * 24 * 7            # 7 kun (kodlar kam o'zgaradi)

_cb = CircuitBreaker('tasnif_soliq', fail_threshold=4, timeout=180)


@retry(times=2, delay=0.5, exceptions=(requests.RequestException,))
def _fetch(query: str, size: int = 20) -> list:
    resp = requests.get(BASE_URL, params={'search': query, 'size': size,
                                          'page': 0, 'lang': 'uz'},
                        timeout=TIMEOUT,
                        headers={'User-Agent': 'ARMENU/1.0'})
    resp.raise_for_status()
    payload = resp.json() or {}
    items = payload.get('data') or payload.get('content') or []
    out = []
    for it in items:
        code = str(it.get('mxikCode') or it.get('code') or '').strip()
        if not code:
            continue
        out.append({
            'code': code,
            'name_uz': it.get('nameUz') or it.get('name') or '',
            'name_ru': it.get('nameRu') or '',
            'group': it.get('groupName') or '',
            'package_codes': [
                {'code': str(p.get('code') or ''), 'name': p.get('nameUz') or ''}
                for p in (it.get('packageNames') or it.get('units') or [])
            ][:10],
        })
    return out


def search_ikpu(query: str, size: int = 20) -> dict:
    """
    Qaytadi: {'ok': bool, 'source': 'api|cache|fallback', 'items': [...]}
    ⚡ Xizmat yiqilsa — lokal FALLBACK jadvali (asosiy taomlar).
    """
    q = (query or '').strip().lower()[:60]
    if len(q) < 2:
        return {'ok': True, 'source': 'none', 'items': []}

    key = f'ikpu:q:{q}:{size}'
    cached = cache.get(key)
    if cached is not None:
        return {'ok': True, 'source': 'cache', 'items': cached}

    def _fallback():
        log.warning(f'[ikpu] tasnif.soliq.uz yiqilgan — lokal jadval: {q}')
        return _local_fallback(q)

    try:
        items = _cb.call(_fetch, q, size, fallback=_fallback)
    except Exception as e:
        log.error(f'[ikpu] xato: {e}')
        return {'ok': False, 'source': 'fallback', 'items': _local_fallback(q)}

    if items:
        cache.set(key, items, CACHE_TTL)
    return {'ok': True, 'source': 'api' if items else 'fallback', 'items': items}


# ⚡ Eng ko'p ishlatiladigan restoran IKPU kodlari (xizmat yiqilganda)
LOCAL_TABLE = [
    {'code': '10391001001000000', 'name_uz': 'Tayyor taomlar (issiq)',   'group': 'Taom'},
    {'code': '10391002001000000', 'name_uz': 'Salatlar',                  'group': 'Taom'},
    {'code': '10391003001000000', 'name_uz': 'Sho\'rvalar',               'group': 'Taom'},
    {'code': '10711001001000000', 'name_uz': 'Non va non mahsulotlari',   'group': 'Non'},
    {'code': '11071001001000000', 'name_uz': 'Alkogolsiz ichimliklar',    'group': 'Ichimlik'},
    {'code': '11072001001000000', 'name_uz': 'Choy, kofe',                'group': 'Ichimlik'},
    {'code': '10521001001000000', 'name_uz': 'Muzqaymoq va shirinliklar', 'group': 'Desert'},
]


def _local_fallback(q: str) -> list:
    hits = [x for x in LOCAL_TABLE if q in x['name_uz'].lower()]
    return hits or LOCAL_TABLE[:3]


def suggest_for_dish(dish) -> list:
    """Taom nomi bo'yicha IKPU taklif — admin panelda tugma bosilganda"""
    res = search_ikpu(dish.name_uz)
    return res['items'][:5]
```

**Fayl:** `apps/menu/admin_views.py` — `DishViewSet` ga:
```python
    @action(detail=False, methods=['get'], url_path='ikpu-search')
    def ikpu_search(self, request):
        """GET /v1/admin/dishes/ikpu-search/?q=osh"""
        from apps.fiscal.services.ikpu import search_ikpu
        return Response(search_ikpu(request.GET.get('q', '')))

    @action(detail=True, methods=['get'], url_path='ikpu-suggest')
    def ikpu_suggest(self, request, pk=None):
        """GET /v1/admin/dishes/{id}/ikpu-suggest/"""
        from apps.fiscal.services.ikpu import suggest_for_dish
        return Response({'dish': self.get_object().name_uz,
                         'suggestions': suggest_for_dish(self.get_object())})
```

✅ **Tekshirish:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:8060/v1/admin/dishes/ikpu-search/?q=osh' | python -m json.tool | head -20
# Internet yo'q bo'lsa ham source=fallback bilan javob keladi (500 EMAS)
```

---

## V-053 — Test: menyu API, kesh, filtr

**Fayl:** `tests/test_menu.py`
```python
import pytest


# ------------------------------------------------------------- Menyu endpoint
@pytest.mark.django_db
def test_menu_returns_structure(api_client, restaurant, category, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r.status_code == 200
    for key in ('restaurant', 'categories', 'dishes', 'version', 'lang'):
        assert key in r.data
    assert r.data['restaurant']['slug'] == restaurant.slug
    assert len(r.data['dishes']) == 1


@pytest.mark.django_db
def test_menu_404_for_unknown_slug(api_client):
    assert api_client.get('/v1/menu/yoq-restoran/').status_code == 404


@pytest.mark.django_db
def test_inactive_restaurant_403(api_client, restaurant, dish):
    restaurant.is_active = False
    restaurant.save()
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r.status_code == 403


@pytest.mark.django_db
def test_menu_does_not_leak_other_restaurant(api_client, restaurant, dish, dish2):
    """⚡ A restorani menyusida B taomi BO'LMASLIGI SHART"""
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    ids = [d['id'] for d in r.data['dishes']]
    assert dish.id in ids
    assert dish2.id not in ids, '⛔ CROSS-TENANT SIZDIRISH!'


# ------------------------------------------------------------- Kesh va ETag
@pytest.mark.django_db
def test_second_request_is_cache_hit(api_client, restaurant, dish):
    api_client.get(f'/v1/menu/{restaurant.slug}/')
    r2 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r2['X-Cache'] == 'HIT'


@pytest.mark.django_db
def test_etag_returns_304(api_client, restaurant, dish):
    r1 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    etag = r1['ETag']
    r2 = api_client.get(f'/v1/menu/{restaurant.slug}/', HTTP_IF_NONE_MATCH=etag)
    assert r2.status_code == 304


@pytest.mark.django_db
def test_etag_changes_with_menu_version(api_client, restaurant, dish):
    e1 = api_client.get(f'/v1/menu/{restaurant.slug}/')['ETag']
    restaurant.menu_version += 1
    restaurant.save()
    from django.core.cache import cache
    cache.delete(f'rest:slug:{restaurant.slug}')
    e2 = api_client.get(f'/v1/menu/{restaurant.slug}/')['ETag']
    assert e1 != e2


@pytest.mark.django_db
def test_cache_control_header(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert 'max-age=60' in r['Cache-Control']


# ------------------------------------------------------------- Qidiruv
@pytest.mark.django_db
def test_search_exact(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=Osh')
    assert r.status_code == 200 and r.data['count'] >= 1


@pytest.mark.django_db
def test_search_short_query_returns_empty(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=o')
    assert r.data['count'] == 0


@pytest.mark.django_db
def test_search_scoped_to_restaurant(api_client, restaurant, dish, dish2):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=Achchiq')
    ids = [d['id'] for d in r.data['dishes']]
    assert dish2.id not in ids


# ------------------------------------------------------------- Filtr
@pytest.mark.django_db
def test_diet_filter(api_client, restaurant, category, dish):
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category,
                        name_uz='Steyk', price=90000, diet_tags=['spicy'])
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?diet=halal')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Osh' in names and 'Steyk' not in names


@pytest.mark.django_db
def test_allergen_exclusion(api_client, restaurant, category):
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category, name_uz='Tort',
                        price=30000, allergens=['nuts', 'dairy'])
    Dish.objects.create(restaurant=restaurant, category=category, name_uz='Choy',
                        price=5000, allergens=[])
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?no_allergens=nuts')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Choy' in names and 'Tort' not in names


@pytest.mark.django_db
def test_price_filter(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?max_price=10000')
    assert dish.id not in [d['id'] for d in r.data['dishes']]


# ------------------------------------------------------------- Taom tafsiloti
@pytest.mark.django_db
def test_dish_detail(api_client, dish):
    r = api_client.get(f'/v1/dish/{dish.id}/?lang=ru')
    assert r.status_code == 200
    assert r.data['name'] == 'Плов'
    assert 'similar' in r.data


# ------------------------------------------------------------- Admin CRUD
@pytest.mark.django_db
def test_admin_create_dish(api_client, restaurant, category, admin_token, plans):
    r = api_client.post('/v1/admin/dishes/', {
        'category': category.id, 'name_uz': 'Manti', 'price': '38000',
        'cook_min': 25,
    }, format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 201
    assert r.data['name_uz'] == 'Manti'


@pytest.mark.django_db
def test_admin_cannot_edit_other_restaurant_dish(api_client, admin_token, dish2):
    """⚡ CROSS-TENANT"""
    r = api_client.patch(f'/v1/admin/dishes/{dish2.id}/', {'price': '1'},
                         format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_stop_list_toggle(api_client, dish, admin_token):
    r = api_client.post(f'/v1/admin/dishes/{dish.id}/stop/', {'minutes': 30},
                        format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 200
    dish.refresh_from_db()
    assert dish.is_available is False and dish.stop_until is not None

    r2 = api_client.post(f'/v1/admin/dishes/{dish.id}/resume/', {},
                         format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    dish.refresh_from_db()
    assert r2.status_code == 200 and dish.is_available is True


@pytest.mark.django_db
def test_reorder_rejects_foreign_ids(api_client, admin_token, category, dish2):
    r = api_client.post('/v1/admin/dishes/reorder/', {'order': [dish2.id]},
                        format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 403


@pytest.mark.django_db
def test_category_delete_blocked_when_not_empty(api_client, admin_token, category, dish):
    r = api_client.delete(f'/v1/admin/categories/{category.id}/',
                          HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 409


# ------------------------------------------------------------- Import
@pytest.mark.django_db
def test_csv_import(restaurant):
    import io
    from apps.menu.services.importer import parse_file, import_menu
    csv_data = io.BytesIO(
        'kategoriya,nomi,narx,ogirlik\nMilliy,Osh,45000,400\nMilliy,Manti,38000,300\n'
        .encode())
    rows, errors = parse_file(csv_data, 'menu.csv')
    assert len(rows) == 2 and not errors
    res = import_menu(restaurant, rows)
    assert res['dishes_created'] == 2 and res['categories_created'] == 1


@pytest.mark.django_db
def test_import_rejects_missing_columns(restaurant):
    import io
    from apps.menu.services.importer import parse_file
    rows, errors = parse_file(io.BytesIO(b'a,b\n1,2\n'), 'x.csv')
    assert not rows and errors
```

✅ **Tekshirish:**
```bash
pytest tests/test_menu.py -v
```

---

## V-054 — Test: 3 til to'g'ri qaytadi

**Fayl:** `tests/test_i18n.py` (V-036 dagi testlarga qo'shiladi)
```python
import pytest


@pytest.mark.django_db
def test_menu_returns_uz(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=uz')
    assert r.data['dishes'][0]['name'] == 'Osh'
    assert r.data['lang'] == 'uz'


@pytest.mark.django_db
def test_menu_returns_ru(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r.data['dishes'][0]['name'] == 'Плов'


@pytest.mark.django_db
def test_menu_returns_en(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=en')
    assert r.data['dishes'][0]['name'] == 'Pilaf'


@pytest.mark.django_db
def test_missing_translation_falls_back(api_client, restaurant, category):
    """⚡ ru tarjimasi yo'q → uz qaytadi (bo'sh EMAS)"""
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category,
                        name_uz='Somsa', name_ru='', name_en='', price=12000)
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Somsa' in names
    assert '' not in names, '⛔ Bo\'sh nom qaytdi — fallback ishlamayapti'


@pytest.mark.django_db
def test_accept_language_header_used(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/', HTTP_ACCEPT_LANGUAGE='ru-RU,ru;q=0.9')
    assert r.data['lang'] == 'ru'


@pytest.mark.django_db
def test_query_param_beats_header(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=en',
                       HTTP_ACCEPT_LANGUAGE='ru-RU')
    assert r.data['lang'] == 'en'


@pytest.mark.django_db
def test_unknown_lang_falls_back_to_uz(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=fr')
    assert r.data['lang'] == 'uz'


@pytest.mark.django_db
def test_each_lang_has_separate_cache(api_client, restaurant, dish):
    """⚡ uz keshi ru so'roviga qaytmasligi SHART"""
    r_uz = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=uz')
    r_ru = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r_uz.data['dishes'][0]['name'] != r_ru.data['dishes'][0]['name']


@pytest.mark.django_db
def test_category_name_translated(api_client, restaurant, category, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r.data['categories'][0]['name'] == 'Национальные'


@pytest.mark.django_db
def test_error_messages_have_three_languages(api_client, restaurant, dish):
    restaurant.is_active = False
    restaurant.save()
    from django.core.cache import cache
    cache.delete(f'rest:slug:{restaurant.slug}')
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    err = r.data['error']
    assert err['message_uz'] and err['message_ru'] and err['message_en']
```

✅ **Tekshirish:**
```bash
pytest tests/test_i18n.py -v
```

---

# ✅ FAZA 2 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check                        → xato yo'q
[ ] python manage.py migrate                      → o'tadi (GIN + trgm indekslar)
[ ] pytest tests/test_menu.py -v                  → hammasi PASSED
[ ] pytest tests/test_i18n.py -v                  → hammasi PASSED
[ ] pytest tests/test_tenant_isolation.py -v      → ⚡ hali ham PASSED
[ ] pytest tests/ -q                              → hammasi o'tadi
[ ] GET /v1/menu/{slug}/           → 200 + X-Cache: MISS
[ ] GET /v1/menu/{slug}/ (2-marta) → 200 + X-Cache: HIT
[ ] GET /v1/menu/{slug}/ (ETag)    → 304
[ ] GET ?lang=ru                   → ruscha nomlar
[ ] GET ?lang=fr                   → uz ga tushadi (xato emas)
[ ] Taom narxi o'zgardi            → menu_version oshdi, keyingi so'rov yangi
[ ] POST .../stop/                 → WS dish.stopped yuborildi
[ ] bulk-import (dry_run=1)        → oldindan ko'rish ishlaydi
[ ] ikpu-search (internetsiz)      → 500 EMAS, fallback qaytdi
```

**⚡ Ishlash nazorati (menyu — eng ko'p chaqiriladigan endpoint):**
```bash
# 1. Kesh MISS holatida SQL so'rovlar soni (N+1 bo'lmasin)
python manage.py shell -c "
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.tenants.models import Restaurant
from apps.menu.services.build import build_menu
r = Restaurant.objects.first()
with CaptureQueriesContext(connection) as q:
    build_menu(r, 'uz')
print('SQL so\'rovlar:', len(q))"
# ⚡ 6 tadan KAM bo'lishi kerak (100 ta taomda ham)

# 2. Javob vaqti
time curl -s -o /dev/null 'http://127.0.0.1:8060/v1/menu/test-rest/'
# kesh HIT → 50ms dan kam

# 3. GIN indeks ishlatilayotganini tekshirish
sudo -u postgres psql -d armenu_db -c "
EXPLAIN ANALYZE SELECT * FROM menu_dish WHERE diet_tags @> ARRAY['halal'];"
# "Bitmap Index Scan on dish_diet_gin" bo'lishi kerak (Seq Scan EMAS ⛔)
```

**⛔ Xavfsizlik nazorati:**
```bash
# Menyu javobida maxfiy maydon yo'qligini tekshirish
curl -s 'http://127.0.0.1:8060/v1/menu/test-rest/' | grep -E 'ofd_config|inn|pin_hash|totp'
# natija BO'SH bo'lishi SHART
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 2 tugadi: menyu (model, i18n, kesh, qidiruv, admin CRUD, import, IKPU)"
python3 ROADMAP/03_HOLAT/update_progress.py V-054 ok "FAZA 2 tugadi"
```

**➡️ Keyingi:** `FAZA_03_STOL_QR.md`
