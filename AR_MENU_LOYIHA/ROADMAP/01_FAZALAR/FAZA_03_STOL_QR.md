# FAZA 3 — STOL VA QR KOD

**Vazifalar:** V-055 … V-066 · **Muddat:** 1 hafta
**Maqsad:** Zal (Hall) va Stol (Table) modellari, har stolga NOYOB QR token,
QR rasm + bosmaga tayyor PDF, admin CRUD, QR yangilash (grace period), stol holati + WS.

> ⚠️ FAZA 2 (`FAZA_02_MENYU.md`) tugagan bo'lishi kerak — `apps.menu` va
> `core/` qatlami ishlayotgan bo'lsin.

---

## V-055 — `apps/tables` ilovasi + `Hall` modeli

**Fayl:** `apps/tables/__init__.py`, `apps/tables/apps.py`

```bash
mkdir -p apps/tables/migrations
touch apps/tables/__init__.py apps/tables/migrations/__init__.py
```

**Fayl:** `apps/tables/apps.py`
```python
from django.apps import AppConfig


class TablesConfig(AppConfig):
    name = 'apps.tables'
    label = 'tables'
    verbose_name = 'Zallar va stollar'
```

**Fayl:** `apps/tables/models.py`
```python
import uuid
from django.db import models
from core.models import TimestampedModel


class Hall(TimestampedModel):
    """
    Zal — restoran ichidagi bo'lim (1-qavat, VIP, Terassa).
    plan_json — 2D zal plani (O-05 va A-05 sahifalarida chiziladi).
    """
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, related_name='halls')
    name    = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)
    order   = models.IntegerField(default=0)

    # plan_json tuzilmasi:
    # {"width":1000,"height":700,
    #  "objects":[{"type":"wall","x1":0,"y1":0,"x2":1000,"y2":0},
    #             {"type":"bar","x":400,"y":600,"w":200,"h":60},
    #             {"type":"door","x":50,"y":0,"w":80,"h":10}]}
    # ⚡ v3 (3D) uchun tayyor: keyinchalik z, height qo'shiladi
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
```

✅ **Tekshirish:**
```bash
python manage.py check
# System check identified no issues
```

---

## V-056 — ⚡ `Table` modeli (qr_token + grace period)

**Fayl:** `apps/tables/models.py` (davomi)

```python
class TableStatus(models.TextChoices):
    FREE     = 'free',     "Bo'sh"
    OCCUPIED = 'occupied', 'Band'
    ORDERING = 'ordering', 'Buyurtma bermoqda'
    WAITING  = 'waiting',  'Kutmoqda'
    READY    = 'ready',    'Tayyor'
    BILL     = 'bill',     "Hisob so'radi"
    CLEANING = 'cleaning', 'Tozalanmoqda'


# Stol holati faqat shu yo'nalishlarda o'zgaradi
ALLOWED_TRANSITIONS = {
    'free':     {'occupied', 'cleaning'},
    'occupied': {'ordering', 'waiting', 'bill', 'cleaning', 'free'},
    'ordering': {'waiting', 'occupied', 'bill', 'cleaning'},
    'waiting':  {'ready', 'occupied', 'bill', 'cleaning'},
    'ready':    {'occupied', 'waiting', 'bill', 'cleaning'},
    'bill':     {'cleaning', 'free', 'occupied'},
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

    qr_token      = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    qr_token_old  = models.UUIDField(null=True, blank=True, db_index=True)
    qr_rotated_at = models.DateTimeField(null=True, blank=True)

    capacity = models.SmallIntegerField(default=4)
    shape    = models.CharField(max_length=10, default='rect')   # rect | circle

    # Zal planidagi joyi (piksel)
    x        = models.IntegerField(default=0)
    y        = models.IntegerField(default=0)
    w        = models.IntegerField(default=80)
    h        = models.IntegerField(default=80)
    rotation = models.SmallIntegerField(default=0)

    status = models.CharField(
        max_length=20, choices=TableStatus.choices,
        default=TableStatus.FREE, db_index=True)

    assigned_waiter = models.ForeignKey(
        'accounts.Staff', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='tables')

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
```

`config/settings/base.py` → `INSTALLED_APPS` ga qo'shiladi:
```python
    'apps.tables',
```

✅ **Tekshirish:**
```bash
python manage.py check
python manage.py shell -c "from apps.tables.models import Table; print(Table._meta.get_field('qr_token').unique)"
# True
```

---

## V-057 — Migratsiya

```bash
python manage.py makemigrations tables
python manage.py migrate
```

✅ **Tekshirish:**
```bash
python manage.py migrate --check
psql -U armenu -d armenu -c "\d tables_table" | grep qr_token
# qr_token      | uuid | not null
# qr_token_old  | uuid |
```

---

## V-058 — ⚡ QR rasm generatsiya (`qrcode`, ECC=H, logo)

```bash
pip install qrcode[pil] pillow reportlab
pip freeze | grep -Ei "qrcode|pillow|reportlab" >> requirements.txt
```

**Fayl:** `apps/tables/qr.py`
```python
"""
QR rasm generatsiyasi.
ECC=H (30% xatoni tuzatadi) — markazga logo qo'yish uchun SHART.
"""
import io
import logging
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from PIL import Image

log = logging.getLogger('tables.qr')

DPI = 300
QR_PX = 1200                 # 1200 px @300 DPI ≈ 10 sm
LOGO_RATIO = 0.22            # logo QR ning 22% i (ECC=H bunga bardosh beradi)


def _fit_logo(logo_path: str, qr_size: int) -> Image.Image | None:
    """Logo'ni QR markaziga sig'adigan qilib oq fon ustiga joylaydi."""
    try:
        logo = Image.open(logo_path).convert('RGBA')
    except Exception as e:
        log.warning(f'[qr] logo ochilmadi ({logo_path}): {e}')
        return None

    side = int(qr_size * LOGO_RATIO)
    logo.thumbnail((side, side), Image.LANCZOS)

    pad = int(side * 0.12)
    plate = Image.new('RGBA', (logo.width + pad * 2, logo.height + pad * 2),
                      (255, 255, 255, 255))
    plate.paste(logo, (pad, pad), logo)
    return plate


def make_qr_png(url: str, logo_path: str | None = None,
                size_px: int = QR_PX, rounded: bool = True) -> bytes:
    """
    QR PNG (300 DPI) qaytaradi.
    url       — https://menu.armenu.uz/t/<uuid>
    logo_path — restoran logotipi (ixtiyoriy)
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,   # ⚡ 30% — logo uchun
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    if rounded:
        img = qr.make_image(image_factory=StyledPilImage,
                            module_drawer=RoundedModuleDrawer()).convert('RGB')
    else:
        img = qr.make_image(fill_color='black', back_color='white').convert('RGB')

    img = img.resize((size_px, size_px), Image.NEAREST)

    if logo_path:
        plate = _fit_logo(logo_path, size_px)
        if plate is not None:
            pos = ((size_px - plate.width) // 2, (size_px - plate.height) // 2)
            img.paste(plate, pos, plate)

    buf = io.BytesIO()
    img.save(buf, format='PNG', dpi=(DPI, DPI), optimize=True)
    return buf.getvalue()


def make_qr_svg(url: str) -> bytes:
    """Vektor QR (bosmaxona uchun). Logo yo'q — vektorda ustiga qo'yilmaydi."""
    import qrcode.image.svg
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue()


def table_qr_png(table, rounded: bool = True) -> bytes:
    """Stol obyekti uchun QR (restoran logosi bilan)."""
    logo_path = None
    logo = getattr(table.restaurant, 'logo', None)
    if logo:
        try:
            logo_path = logo.path
        except Exception:
            logo_path = None
    return make_qr_png(table.qr_url, logo_path=logo_path, rounded=rounded)
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.tables.qr import make_qr_png
b = make_qr_png('https://armenu.uz/t/a3f2c891-0000-0000-0000-000000000001')
open('/tmp/qr_test.png','wb').write(b); print(len(b), 'bayt')
"
# ~15000 bayt — /tmp/qr_test.png ni telefonda skanerlab tekshir
```

---

## V-059 — ⚡ QR PDF (ReportLab, A4 da 1/2/4/6 ta, 3 tilda matn)

**Fayl:** `apps/tables/pdf.py`
```python
"""
Bosmaga tayyor QR PDF.
Layoutlar: a4_1 | a4_2 | a4_4 | a4_6 | stand (10×15 sm stol standi)
Har kartada: logo · STOL № (KATTA) · QR · 3 tilda ko'rsatma.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.conf import settings

from apps.tables.qr import make_qr_png

# Kirill + lotin qo'llab-quvvatlaydigan shrift
FONT_DIR = settings.BASE_DIR / 'static' / 'fonts'
FONT_REG, FONT_BOLD = 'ARMenu', 'ARMenu-Bold'
_fonts_ready = False


def _ensure_fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    try:
        pdfmetrics.registerFont(TTFont(FONT_REG, str(FONT_DIR / 'DejaVuSans.ttf')))
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_DIR / 'DejaVuSans-Bold.ttf')))
    except Exception:
        # zaxira — Helvetica (kirill yo'q, lekin PDF buzilmaydi)
        globals()['FONT_REG'] = 'Helvetica'
        globals()['FONT_BOLD'] = 'Helvetica-Bold'
    _fonts_ready = True


# layout → (ustun, qator)
LAYOUTS = {
    'a4_1': (1, 1),
    'a4_2': (1, 2),
    'a4_4': (2, 2),
    'a4_6': (2, 3),
}

HINT = {
    'uz': 'QR kodni skanerlang — menyu va AR',
    'ru': 'Отсканируйте QR — меню и AR',
    'en': 'Scan the QR — menu and AR',
}
TABLE_WORD = {'uz': 'STOL', 'ru': 'СТОЛ', 'en': 'TABLE'}


def _draw_card(c, table, x, y, w, h, logo_reader):
    """Bitta stol kartasini chizadi (x,y — chap-past burchak)."""
    pad = 6 * mm

    # Ramka (kesish chizig'i)
    c.setStrokeColorRGB(.82, .82, .85)
    c.setLineWidth(.4)
    c.setDash(2, 3)
    c.rect(x, y, w, h)
    c.setDash()

    cy = y + h - pad

    # Logo
    if logo_reader is not None:
        lh = min(14 * mm, h * 0.10)
        try:
            iw, ih = logo_reader.getSize()
            lw = lh * (iw / ih)
            c.drawImage(logo_reader, x + (w - lw) / 2, cy - lh,
                        lw, lh, mask='auto')
            cy -= lh + 3 * mm
        except Exception:
            pass

    # Restoran nomi
    c.setFont(FONT_REG, min(11, h / 24 / mm))
    c.setFillColorRGB(.35, .35, .40)
    c.drawCentredString(x + w / 2, cy - 4 * mm, table.restaurant.name[:38])
    cy -= 9 * mm

    # STOL № — KATTA ⚡
    num_size = max(26, min(64, h / 7 / mm * 2))
    c.setFont(FONT_BOLD, num_size)
    c.setFillColorRGB(.06, .06, .10)
    c.drawCentredString(x + w / 2, cy - num_size * 0.75,
                        f'{TABLE_WORD["uz"]} {table.number}')
    cy -= num_size * 0.75 + 5 * mm

    # QR — qolgan joyning eng kattasi (matnlarga joy qoldirib)
    text_block = 16 * mm
    qr_side = min(w - pad * 2, cy - y - text_block - pad)
    if qr_side > 10 * mm:
        png = make_qr_png(table.qr_url, logo_path=None, size_px=1200, rounded=False)
        c.drawImage(ImageReader(io.BytesIO(png)),
                    x + (w - qr_side) / 2, cy - qr_side, qr_side, qr_side)
        cy -= qr_side + 4 * mm

    # 3 tilda ko'rsatma
    c.setFont(FONT_REG, min(9, w / 30 / mm * 2))
    c.setFillColorRGB(.42, .42, .48)
    for lang in ('uz', 'ru', 'en'):
        c.drawCentredString(x + w / 2, cy, HINT[lang])
        cy -= 4.2 * mm


def build_qr_pdf(tables, layout: str = 'a4_6') -> bytes:
    """
    tables — Table queryset/ro'yxat (restaurant select_related bo'lsin).
    layout — LAYOUTS kaliti yoki 'stand'.
    """
    _ensure_fonts()
    buf = io.BytesIO()

    if layout == 'stand':
        page = (100 * mm, 150 * mm)
        c = canvas.Canvas(buf, pagesize=page)
        logo_reader = _logo_reader(tables)
        for t in tables:
            _draw_card(c, t, 0, 0, page[0], page[1], logo_reader)
            c.showPage()
        c.save()
        return buf.getvalue()

    cols, rows = LAYOUTS.get(layout, LAYOUTS['a4_6'])
    pw, ph = A4
    margin = 10 * mm
    cw = (pw - margin * 2) / cols
    ch = (ph - margin * 2) / rows

    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle('ARMENU — QR kodlar')
    logo_reader = _logo_reader(tables)

    per_page = cols * rows
    for i, t in enumerate(tables):
        slot = i % per_page
        if slot == 0 and i:
            c.showPage()
        col = slot % cols
        row = slot // cols
        x = margin + col * cw
        y = ph - margin - (row + 1) * ch
        _draw_card(c, t, x, y, cw, ch, logo_reader)

    c.showPage()
    c.save()
    return buf.getvalue()


def _logo_reader(tables):
    for t in tables:
        logo = getattr(t.restaurant, 'logo', None)
        if logo:
            try:
                return ImageReader(logo.path)
            except Exception:
                return None
        return None
    return None
```

⚠️ Shriftlar kerak:
```bash
mkdir -p static/fonts
cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf static/fonts/
cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf static/fonts/
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.tables.models import Table
from apps.tables.pdf import build_qr_pdf
ts = list(Table.objects.select_related('restaurant')[:6])
open('/tmp/qr.pdf','wb').write(build_qr_pdf(ts, 'a4_6'))
print('OK', len(ts), 'stol')
"
# /tmp/qr.pdf ni ochib ko'r — stol raqami KATTA, 3 tilda matn bor
```

---

## V-060 — `apps/tables/services.py` (WS + biznes mantiq)

**Fayl:** `apps/tables/services.py`
```python
import logging
from django.db import transaction
from core.ws import ws_send, g_admin, g_waiters

log = logging.getLogger('tables.services')


def serialize_table(t) -> dict:
    return {
        'id': t.id,
        'number': t.number,
        'hall_id': t.hall_id,
        'status': t.status,
        'capacity': t.capacity,
        'shape': t.shape,
        'x': t.x, 'y': t.y, 'w': t.w, 'h': t.h, 'rotation': t.rotation,
        'assigned_waiter_id': t.assigned_waiter_id,
        'is_active': t.is_active,
    }


def broadcast_table_status(t):
    """⚡ Stol holati o'zgardi → admin + ofitsiantlar ekranlari yangilanadi."""
    payload = {'table': serialize_table(t)}
    ws_send(g_admin(t.restaurant_id), 'table.status', payload)
    ws_send(g_waiters(t.restaurant_id), 'table.status', payload)
    log.info(f'[tables] #{t.id} → {t.status}')


def broadcast_table_scanned(t, session_id):
    """QR skanerlandi → admin dashboardda 'Stol N skanerlandi'."""
    ws_send(g_admin(t.restaurant_id), 'table.scanned', {
        'table_id': t.id, 'number': t.number, 'session_id': str(session_id),
    })


@transaction.atomic
def create_table(restaurant_id, hall_id, number, **kwargs):
    """Stol yaratish — restaurant denormalizatsiyasi va tarif limiti bilan."""
    from apps.tables.models import Hall, Table
    from core.exceptions import TenantMismatch, PlanLimit
    from django.conf import settings

    hall = Hall.objects.filter(id=hall_id, restaurant_id=restaurant_id).first()
    if not hall:
        raise TenantMismatch({'hall_id': hall_id})

    limit = getattr(settings, 'PLAN_TABLE_LIMITS', {}).get(
        _plan_of(restaurant_id), 10_000)
    if Table.objects.filter(restaurant_id=restaurant_id, is_active=True).count() >= limit:
        raise PlanLimit({'limit': limit, 'resource': 'tables'})

    t = Table.objects.create(
        hall=hall, restaurant_id=restaurant_id, number=str(number).strip(), **kwargs)
    transaction.on_commit(lambda: broadcast_table_status(t))
    return t


def _plan_of(restaurant_id) -> str:
    from apps.tenants.models import Restaurant
    return Restaurant.objects.only('plan').get(id=restaurant_id).plan


def regenerate_qr(table):
    """⚡ QR yangilash. Eski token 24 soat grace ichida ishlaydi."""
    old = table.qr_token
    new = table.rotate_qr()
    log.warning(f'[tables] QR rotate #{table.id}: {old} → {new} (grace 24s)')
    ws_send(g_admin(table.restaurant_id), 'table.qr_rotated', {
        'table_id': table.id, 'qr_token': str(new),
        'grace_until': table.qr_rotated_at.isoformat(),
    })
    return new
```

`config/settings/base.py` ga:
```python
PLAN_TABLE_LIMITS = {'start': 15, 'pro': 60, 'max': 300}
```

---

## V-061 — Serializerlar

**Fayl:** `apps/tables/serializers.py`
```python
from rest_framework import serializers
from apps.tables.models import Hall, Table, TableStatus


class TableSerializer(serializers.ModelSerializer):
    qr_url  = serializers.CharField(read_only=True)
    qr_png  = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = ['id', 'hall', 'number', 'capacity', 'shape',
                  'x', 'y', 'w', 'h', 'rotation', 'status',
                  'assigned_waiter', 'is_active',
                  'qr_token', 'qr_url', 'qr_png', 'qr_rotated_at']
        read_only_fields = ['qr_token', 'qr_url', 'qr_png', 'qr_rotated_at']

    def get_qr_png(self, obj):
        return f'/v1/admin/tables/{obj.id}/qr.png'

    def validate_number(self, v):
        v = str(v).strip()
        if not v:
            raise serializers.ValidationError("Stol raqami bo'sh bo'lmasin")
        return v

    def validate_capacity(self, v):
        if not (1 <= int(v) <= 50):
            raise serializers.ValidationError("Sig'im 1..50 oralig'ida")
        return int(v)

    def validate_hall(self, hall):
        rid = self.context['request'].restaurant_id
        if hall.restaurant_id != rid:
            raise serializers.ValidationError('Zal boshqa restoranga tegishli')
        return hall


class TableStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TableStatus.choices)


class HallSerializer(serializers.ModelSerializer):
    tables_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Hall
        fields = ['id', 'name', 'name_ru', 'name_en', 'order',
                  'plan_json', 'is_active', 'tables_count']

    def validate_plan_json(self, v):
        if not isinstance(v, dict):
            raise serializers.ValidationError("plan_json obyekt bo'lishi kerak")
        w, h = v.get('width', 0), v.get('height', 0)
        if v and not (0 < int(w) <= 5000 and 0 < int(h) <= 5000):
            raise serializers.ValidationError("width/height 1..5000 oralig'ida")
        objs = v.get('objects', [])
        if not isinstance(objs, list) or len(objs) > 500:
            raise serializers.ValidationError('objects — ro\'yxat, maks 500 element')
        return v


class HallPlanSerializer(serializers.Serializer):
    """Zal plani + stollar joyi bir so'rovda saqlanadi."""
    plan_json = serializers.JSONField()
    tables    = serializers.ListField(child=serializers.DictField(), required=False)
```

---

## V-062 — Admin CRUD: zallar (`/v1/admin/halls/`)

**Fayl:** `apps/tables/views.py`
```python
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedMixin, SoftDeleteMixin
from apps.accounts.permissions import IsRestaurantAdmin
from apps.tables.models import Hall, Table
from apps.tables.serializers import (
    HallSerializer, HallPlanSerializer, TableSerializer, TableStatusSerializer)


class HallViewSet(TenantScopedMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """Zal CRUD — faqat restoran admini."""
    serializer_class = HallSerializer
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]
    queryset = Hall.objects.all()

    def get_queryset(self):
        return (super().get_queryset()
                .annotate(tables_count=Count('tables', filter=Q(tables__is_active=True)))
                .order_by('order', 'id'))

    @action(detail=True, methods=['get', 'put'], url_path='plan')
    def plan(self, request, pk=None):
        """
        GET  — zal plani + stollar koordinatalari
        PUT  — planni va stollar joyini BIR so'rovda saqlash (V-064)
        """
        hall = self.get_object()

        if request.method == 'GET':
            tables = Table.objects.filter(hall=hall, is_active=True)
            return Response({
                'plan_json': hall.plan_json,
                'tables': TableSerializer(tables, many=True,
                                          context={'request': request}).data,
            })

        ser = HallPlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        hall.plan_json = HallSerializer(context={'request': request}).validate_plan_json(
            ser.validated_data['plan_json'])
        hall.save(update_fields=['plan_json', 'updated_at'])

        moved = 0
        for row in ser.validated_data.get('tables', []):
            t = Table.objects.filter(
                id=row.get('id'), hall=hall, restaurant_id=request.restaurant_id).first()
            if not t:
                continue
            for f in ('x', 'y', 'w', 'h', 'rotation'):
                if f in row:
                    setattr(t, f, int(row[f]))
            t.save(update_fields=['x', 'y', 'w', 'h', 'rotation', 'updated_at'])
            moved += 1

        return Response({'ok': True, 'tables_moved': moved})
```

**Fayl:** `apps/tables/urls.py`
```python
from rest_framework.routers import DefaultRouter
from apps.tables.views import HallViewSet, TableViewSet

router = DefaultRouter()
router.register('halls', HallViewSet, basename='hall')
router.register('tables', TableViewSet, basename='table')

urlpatterns = router.urls
```

`config/urls.py` ga:
```python
    path('v1/admin/', include('apps.tables.urls')),
```

✅ **Tekshirish:**
```bash
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:8060/v1/admin/halls/
# {"count":0,"results":[]}
```

---

## V-063 — Admin CRUD: stollar + QR PNG

**Fayl:** `apps/tables/views.py` (davomi)
```python
from django.http import HttpResponse
from apps.tables.qr import table_qr_png, make_qr_svg
from apps.tables.services import create_table, regenerate_qr, broadcast_table_status


class TableViewSet(TenantScopedMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """Stol CRUD + QR."""
    serializer_class = TableSerializer
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]
    queryset = Table.objects.select_related('hall', 'restaurant').all()

    def get_queryset(self):
        qs = super().get_queryset()
        hall = self.request.query_params.get('hall')
        if hall:
            qs = qs.filter(hall_id=hall)
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        if self.request.query_params.get('active') != 'all':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        d = serializer.validated_data
        t = create_table(
            restaurant_id=self.request.restaurant_id,
            hall_id=d.pop('hall').id,
            number=d.pop('number'),
            **{k: v for k, v in d.items() if k != 'restaurant'},
        )
        serializer.instance = t

    def perform_update(self, serializer):
        t = serializer.save()
        broadcast_table_status(t)

    # --- QR ---

    @action(detail=True, methods=['get'], url_path='qr.png')
    def qr_png(self, request, pk=None):
        t = self.get_object()
        return HttpResponse(table_qr_png(t), content_type='image/png')

    @action(detail=True, methods=['get'], url_path='qr.svg')
    def qr_svg(self, request, pk=None):
        t = self.get_object()
        return HttpResponse(make_qr_svg(t.qr_url), content_type='image/svg+xml')
```

✅ **Tekshirish:**
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"hall":1,"number":"5","capacity":6}' http://localhost:8060/v1/admin/tables/
# 201 {"id":1,"number":"5","qr_token":"...","qr_url":"https://.../t/..."}

curl -o /tmp/t5.png -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:8060/v1/admin/tables/1/qr.png
file /tmp/t5.png   # PNG image data, 1200 x 1200
```

---

## V-064 — ⚡ `POST /tables/{id}/regen-qr/` (grace period)

**Fayl:** `apps/tables/views.py` (`TableViewSet` ichiga)
```python
    @action(detail=True, methods=['post'], url_path='regen-qr')
    def regen_qr(self, request, pk=None):
        """
        ⚡ Yangi QR. Eski token 24 soat ishlaydi (mijoz ovqatlanayotgan bo'lishi mumkin).
        Frontend OLDIN tasdiq so'raydi: "Eski QR 24 soatdan keyin ishlamaydi!"
        """
        t = self.get_object()
        old = str(t.qr_token)
        new = regenerate_qr(t)

        from apps.core_audit.services import audit  # V-029 da yozilgan
        audit(request, 'table.qr_rotate', 'Table', t.id,
              old={'qr_token': old}, new={'qr_token': str(new)})

        return Response({
            'qr_token': str(new),
            'qr_url': t.qr_url,
            'old_token_valid_until': t.qr_rotated_at.isoformat(),
            'grace_seconds': 24 * 3600,
        }, status=status.HTTP_200_OK)
```

⚠️ Agar `apps.core_audit` hali yo'q bo'lsa — audit qatorlarini vaqtincha
izohga oling, FAZA 1 dagi audit modulini ulangandan keyin qayting.

✅ **Tekshirish:**
```bash
OLD=$(curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:8060/v1/admin/tables/1/ | python3 -c "import sys,json;print(json.load(sys.stdin)['qr_token'])")

curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:8060/v1/admin/tables/1/regen-qr/
# {"qr_token":"yangi-uuid", "grace_seconds":86400}

# ⚡ Eski token HALI ishlaydi:
curl -s -o /dev/null -w "%{http_code}\n" -L "http://localhost:8060/t/$OLD"
# 200 (grace ichida)
```

---

## V-065 — `GET /tables/qr-pdf/` (bosmaga tayyor)

**Fayl:** `apps/tables/views.py` (`TableViewSet` ichiga)
```python
    @action(detail=False, methods=['get'], url_path='qr-pdf')
    def qr_pdf(self, request):
        """
        GET /v1/admin/tables/qr-pdf/?hall=1&layout=a4_6
        layout: a4_1 | a4_2 | a4_4 | a4_6 | stand
        """
        from apps.tables.pdf import build_qr_pdf, LAYOUTS
        from django.utils.text import slugify

        layout = request.query_params.get('layout', 'a4_6')
        if layout not in LAYOUTS and layout != 'stand':
            return Response({'error': {'code': 'VALIDATION_ERROR',
                                       'message_uz': "Noma'lum layout"}}, status=400)

        qs = self.get_queryset().order_by('hall__order', 'number')
        ids = request.query_params.get('ids')
        if ids:
            qs = qs.filter(id__in=[int(i) for i in ids.split(',') if i.isdigit()])

        tables = list(qs[:300])
        if not tables:
            return Response({'error': {'code': 'VALIDATION_ERROR',
                                       'message_uz': 'Stol topilmadi'}}, status=404)

        pdf = build_qr_pdf(tables, layout)

        hall_id = request.query_params.get('hall')
        name = 'qr_codes'
        if hall_id and tables:
            name = f'qr_{slugify(tables[0].hall.name) or "zal"}'

        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{name}.pdf"'
        return resp
```

✅ **Tekshirish:**
```bash
curl -o /tmp/qr_all.pdf -H "Authorization: Bearer $ADMIN_JWT" \
  "http://localhost:8060/v1/admin/tables/qr-pdf/?layout=a4_6"
pdfinfo /tmp/qr_all.pdf | head -3
# Pages: 1 · Page size: 595 x 842 pts (A4)
```

---

## V-066 — Stol holati o'zgartirish + WS + testlar

**Fayl:** `apps/tables/views.py` (`TableViewSet` ichiga)
```python
    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        """
        POST /v1/admin/tables/{id}/status/  {"status":"cleaning"}
        Noto'g'ri o'tish → 409 INVALID_TRANSITION
        """
        t = self.get_object()
        ser = TableStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        t.set_status(ser.validated_data['status'])   # ⚡ ichida WS yuboriladi
        return Response(TableSerializer(t, context={'request': request}).data)
```

**Fayl:** `tests/test_tables.py`
```python
import uuid
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.tables.models import Hall, Table, resolve_table_by_token
from core.exceptions import QRInvalid, InvalidTransition


@pytest.fixture
def hall(db, restaurant):
    return Hall.objects.create(restaurant=restaurant, name='1-qavat')


@pytest.fixture
def table(db, restaurant, hall):
    return Table.objects.create(hall=hall, restaurant=restaurant, number='5')


# --- QR noyobligi ---

def test_qr_token_is_unique_across_tables(db, restaurant, hall):
    tokens = set()
    for i in range(50):
        t = Table.objects.create(hall=hall, restaurant=restaurant, number=str(i))
        tokens.add(str(t.qr_token))
    assert len(tokens) == 50


def test_qr_token_unique_constraint(db, restaurant, hall, table):
    from django.db.utils import IntegrityError
    with pytest.raises(IntegrityError):
        Table.objects.create(hall=hall, restaurant=restaurant,
                             number='99', qr_token=table.qr_token)


def test_qr_url_contains_token(table):
    assert str(table.qr_token) in table.qr_url
    assert table.qr_url.endswith(str(table.qr_token))


# --- Grace period ---

def test_old_token_works_within_grace(table):
    old = table.qr_token
    table.rotate_qr()
    assert table.qr_token != old
    assert resolve_table_by_token(old).id == table.id


def test_old_token_dead_after_grace(table):
    old = table.qr_token
    table.rotate_qr()
    table.qr_rotated_at = timezone.now() - timedelta(hours=25)
    table.save(update_fields=['qr_rotated_at'])
    with pytest.raises(QRInvalid):
        resolve_table_by_token(old)


def test_unknown_token_raises(db):
    with pytest.raises(QRInvalid):
        resolve_table_by_token(uuid.uuid4())


def test_inactive_table_token_raises(table):
    table.is_active = False
    table.save(update_fields=['is_active'])
    with pytest.raises(QRInvalid):
        resolve_table_by_token(table.qr_token)


# --- ⚡ Cross-tenant izolyatsiya ---

def test_cross_tenant_table_list_isolated(db, api_client, restaurant, restaurant2,
                                          hall, admin_jwt):
    h2 = Hall.objects.create(restaurant=restaurant2, name='Boshqa zal')
    Table.objects.create(hall=hall, restaurant=restaurant, number='1')
    Table.objects.create(hall=h2, restaurant=restaurant2, number='1')

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_jwt}')
    r = api_client.get('/v1/admin/tables/', HTTP_HOST=f'{restaurant.slug}.localhost')
    ids = {row['id'] for row in r.json()['results']}
    assert all(Table.objects.get(id=i).restaurant_id == restaurant.id for i in ids)


def test_cannot_create_table_in_other_restaurant_hall(db, api_client, restaurant,
                                                     restaurant2, admin_jwt):
    h2 = Hall.objects.create(restaurant=restaurant2, name='Begona zal')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_jwt}')
    r = api_client.post('/v1/admin/tables/', {'hall': h2.id, 'number': '7'},
                        format='json')
    assert r.status_code == 400


def test_table_number_unique_per_restaurant(db, restaurant, restaurant2, hall):
    from django.db.utils import IntegrityError
    h2 = Hall.objects.create(restaurant=restaurant2, name='Z2')
    Table.objects.create(hall=hall, restaurant=restaurant, number='5')
    # Boshqa restoranda "5" — MUMKIN
    Table.objects.create(hall=h2, restaurant=restaurant2, number='5')
    # Shu restoranda "5" — MUMKIN EMAS
    with pytest.raises(IntegrityError):
        Table.objects.create(hall=hall, restaurant=restaurant, number='5')


# --- Holat o'tishi ---

def test_valid_transition(table):
    table.set_status('occupied', notify=False)
    assert table.status == 'occupied'


def test_invalid_transition_raises(table):
    with pytest.raises(InvalidTransition):
        table.set_status('ready', notify=False)   # free → ready mumkin emas


def test_same_status_is_noop(table):
    table.set_status('free', notify=False)
    assert table.status == 'free'


# --- QR rasm/PDF ---

def test_qr_png_generated(table):
    from apps.tables.qr import table_qr_png
    b = table_qr_png(table)
    assert b[:8] == b'\x89PNG\r\n\x1a\n'
    assert len(b) > 1000


def test_qr_pdf_generated(db, restaurant, hall):
    from apps.tables.pdf import build_qr_pdf
    ts = [Table.objects.create(hall=hall, restaurant=restaurant, number=str(i))
          for i in range(6)]
    pdf = build_qr_pdf(ts, 'a4_6')
    assert pdf[:4] == b'%PDF'


# --- plan_json ---

def test_hall_plan_saved(db, hall):
    hall.plan_json = {'width': 1000, 'height': 700,
                      'objects': [{'type': 'wall', 'x1': 0, 'y1': 0,
                                   'x2': 1000, 'y2': 0}]}
    hall.save(update_fields=['plan_json'])
    hall.refresh_from_db()
    assert hall.plan_json['width'] == 1000
    assert len(hall.plan_json['objects']) == 1
```

✅ **Tekshirish:**
```bash
pytest tests/test_tables.py -q
# 16 passed
```

---

# ✅ FAZA 3 QABULI

```
[ ] python manage.py check                      → xato yo'q
[ ] python manage.py migrate --check            → o'tadi
[ ] pytest tests/test_tables.py -q              → 16 passed
[ ] pytest tests/ -q                            → hammasi o'tadi
[ ] /tmp/qr_test.png telefonda skanerlanadi     → to'g'ri URL ochiladi
[ ] /tmp/qr_all.pdf A4 da 6 ta stol, raqam KATTA, 3 tilda matn
[ ] QR yangilagandan keyin eski token 24s ishlaydi (grace)
[ ] Cross-tenant: boshqa restoran stoli KO'RINMAYDI
[ ] Stol holati o'zgarsa WS xabar keladi (rest_<id>_admin)
```

**Qo'lda sinov (WS):**
```bash
# 1-terminal: WS eshit
wscat -c "ws://localhost:8060/ws/admin/?token=$ADMIN_JWT"
# 2-terminal: holat o'zgartir
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"status":"occupied"}' http://localhost:8060/v1/admin/tables/1/status/
# 1-terminalda: {"type":"table.status","data":{"table":{"status":"occupied",...}}}
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 3 tugadi: zal, stol, QR + PDF, grace period"
python3 ROADMAP/03_HOLAT/update_progress.py V-066 ok "FAZA 3 tugadi"
```

**➡️ Keyingi:** `FAZA_04_MIJOZ_PWA.md`
