# FAZA 4 — MIJOZ PWA (menyu, savat, chaqiruv, real-time)

**Vazifalar:** V-067 … V-092 · **Muddat:** 2 hafta
**Maqsad:** Mijoz QR skanerlaganidan buyurtma holatini kuzatishgacha — to'liq ishlaydigan PWA.
3 til, dark+light, offline rejim, ishonchli WebSocket.

> ⚠️ FAZA 3 (`FAZA_03_STOL_QR.md`) tugagan bo'lishi kerak — `Table.qr_token` ishlayotgan bo'lsin.

**Sahifalar:** M-01 (QR kirish) · M-02 (menyu) · M-04 (taom modali) · M-06 (savat) ·
M-08 (buyurtma holati) · M-09 (chaqiruv)

---

## V-067 — `apps/guest` ilovasi + `Guest` va `GuestSession` modellari

```bash
mkdir -p apps/guest/migrations
touch apps/guest/__init__.py apps/guest/migrations/__init__.py
```

**Fayl:** `apps/guest/apps.py`
```python
from django.apps import AppConfig


class GuestConfig(AppConfig):
    name = 'apps.guest'
    label = 'guest'
    verbose_name = 'Mijozlar'
```

**Fayl:** `apps/guest/models.py`
```python
import uuid
from django.db import models
from django.utils import timezone
from core.models import TimestampedModel

SESSION_IDLE_MINUTES = 180      # 3 soatdan keyin sessiya avtomatik yopiladi


class Guest(TimestampedModel):
    """
    Mijoz — ro'yxatdan o'tmaydi. device_token cookie orqali tanib olinadi.
    Telefon/ism faqat to'lov yoki bonus paytida to'ldiriladi.
    """
    restaurant   = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, related_name='guests')
    device_token = models.UUIDField(default=uuid.uuid4, db_index=True)

    phone   = models.CharField(max_length=15, blank=True, db_index=True)  # 998XXXXXXXXX
    name    = models.CharField(max_length=80, blank=True)
    lang    = models.CharField(max_length=2, default='uz')
    tg_user_id = models.BigIntegerField(null=True, blank=True, db_index=True)

    bonus       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    visits      = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('restaurant', 'device_token')]
        indexes = [models.Index(fields=['restaurant', 'phone'])]

    def __str__(self):
        return self.name or self.phone or f'Mehmon #{self.id}'


class GuestSession(TimestampedModel):
    """Bitta tashrif — stolga o'tirgandan hisob to'langunicha."""
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='sessions')
    table = models.ForeignKey(
        'tables.Table', null=True, on_delete=models.SET_NULL, related_name='sessions')

    public_id  = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    lang       = models.CharField(max_length=2, default='uz')
    started_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    ended_at   = models.DateTimeField(null=True, blank=True)
    order_count = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'table', 'ended_at']),
            models.Index(fields=['restaurant', 'started_at']),
        ]

    def __str__(self):
        return f'Sessiya {self.public_id}'

    @property
    def is_open(self) -> bool:
        return self.ended_at is None

    def touch(self):
        self.last_seen_at = timezone.now()
        self.save(update_fields=['last_seen_at'])

    def close(self):
        if self.ended_at is None:
            self.ended_at = timezone.now()
            self.save(update_fields=['ended_at'])
```

`config/settings/base.py` → `INSTALLED_APPS`:
```python
    'apps.guest',
```

```bash
python manage.py makemigrations guest && python manage.py migrate
```

✅ **Tekshirish:** `python manage.py migrate --check` → xato yo'q

---

## V-068 — Til aniqlash (4 bosqichli)

**Fayl:** `apps/guest/lang.py`
```python
"""
Til aniqlash tartibi (M-01 §2.6):
  1. URL  ?lang=en
  2. Cookie armenu_lang
  3. Accept-Language header
  4. Restaurant.default_lang
"""
SUPPORTED = ('uz', 'ru', 'en')
LANG_COOKIE = 'armenu_lang'
LANG_COOKIE_MAX_AGE = 365 * 24 * 3600


def _norm(code: str) -> str | None:
    if not code:
        return None
    c = code.strip().lower().replace('_', '-').split('-')[0]
    if c in SUPPORTED:
        return c
    # keng tarqalgan taxalluslar
    return {'uzb': 'uz', 'rus': 'ru', 'eng': 'en'}.get(c)


def _from_header(header: str) -> str | None:
    """'ru-RU,ru;q=0.9,en;q=0.8' → 'ru' (q bo'yicha tartiblangan)"""
    if not header:
        return None
    parts = []
    for chunk in header.split(','):
        bits = chunk.split(';q=')
        code = bits[0]
        try:
            q = float(bits[1]) if len(bits) > 1 else 1.0
        except ValueError:
            q = 1.0
        parts.append((q, code))
    for _, code in sorted(parts, key=lambda p: -p[0]):
        lang = _norm(code)
        if lang:
            return lang
    return None


def detect_lang(request, restaurant=None) -> str:
    return (
        _norm(request.GET.get('lang'))
        or _norm(request.COOKIES.get(LANG_COOKIE))
        or _from_header(request.headers.get('Accept-Language', ''))
        or _norm(getattr(restaurant, 'default_lang', None))
        or 'uz'
    )


def set_lang_cookie(response, lang: str):
    response.set_cookie(LANG_COOKIE, lang, max_age=LANG_COOKIE_MAX_AGE,
                        samesite='Lax', path='/')
    return response
```

✅ **Test:** `tests/test_guest_lang.py`
```python
from apps.guest.lang import _from_header, _norm


def test_header_picks_highest_q():
    assert _from_header('ru-RU,ru;q=0.9,en;q=0.8') == 'ru'
    assert _from_header('de;q=0.9,en;q=0.5') == 'en'
    assert _from_header('fr,de') is None


def test_norm():
    assert _norm('EN-us') == 'en'
    assert _norm('uz-Latn') == 'uz'
    assert _norm('zh') is None
```

---

## V-069 — Device token cookie (1 yil) + Guest xizmati

**Fayl:** `apps/guest/services.py`
```python
import uuid
import logging
from django.utils import timezone
from django.db import transaction
from apps.guest.models import Guest, GuestSession, SESSION_IDLE_MINUTES

log = logging.getLogger('guest.services')

DEVICE_COOKIE = 'armenu_device'
DEVICE_COOKIE_MAX_AGE = 365 * 24 * 3600      # ⚡ 1 yil


def read_device_token(request):
    """Cookie'dagi UUID. Yaroqsiz bo'lsa None."""
    raw = request.COOKIES.get(DEVICE_COOKIE, '')
    try:
        return uuid.UUID(raw)
    except (ValueError, AttributeError):
        return None


def set_device_cookie(response, token):
    response.set_cookie(DEVICE_COOKIE, str(token), max_age=DEVICE_COOKIE_MAX_AGE,
                        samesite='Lax', httponly=True, path='/')
    return response


def get_or_create_guest(restaurant_id, device_token, lang='uz'):
    """device_token bo'yicha mijozni topadi yoki yaratadi."""
    guest, created = Guest.objects.get_or_create(
        restaurant_id=restaurant_id, device_token=device_token,
        defaults={'lang': lang, 'visits': 0})
    return guest, created


@transaction.atomic
def open_session(guest, table, lang='uz'):
    """
    Ochiq sessiyani qayta ishlatadi (mijoz sahifani yangilagan bo'lishi mumkin),
    aks holda yangisini ochadi.
    """
    cutoff = timezone.now() - timezone.timedelta(minutes=SESSION_IDLE_MINUTES)

    s = (GuestSession.objects
         .filter(guest=guest, table=table, ended_at__isnull=True,
                 last_seen_at__gte=cutoff)
         .order_by('-started_at').first())

    if s:
        s.lang = lang
        s.last_seen_at = timezone.now()
        s.save(update_fields=['lang', 'last_seen_at'])
        return s, False

    # eskirgan ochiq sessiyalarni yopamiz
    GuestSession.objects.filter(guest=guest, ended_at__isnull=True,
                                last_seen_at__lt=cutoff).update(ended_at=timezone.now())

    s = GuestSession.objects.create(
        restaurant_id=guest.restaurant_id, guest=guest, table=table, lang=lang)

    Guest.objects.filter(id=guest.id).update(
        visits=guest.visits + 1, last_seen_at=timezone.now(), lang=lang)

    log.info(f'[guest] yangi sessiya {s.public_id} · stol {table.number}')
    return s, True
```

---

## V-070 — ⚡ `GET /t/{qr_token}` — M-01 to'liq zanjiri

**Fayl:** `apps/guest/views.py`
```python
"""
M-01 — QR kirish. Mijozning tizimga birinchi qadami.
Zanjir: token → stol → restoran tekshiruvi → guest cookie → sessiya →
        til → analitika → WS admin xabari → redirect
"""
import logging
import uuid
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET
from django.db import transaction

from apps.tables.models import resolve_table_by_token
from apps.tables.services import broadcast_table_scanned
from apps.guest.lang import detect_lang, set_lang_cookie
from apps.guest.services import (
    read_device_token, set_device_cookie, get_or_create_guest, open_session)
from core.exceptions import QRInvalid
from core.queue import enqueue

log = logging.getLogger('guest.views')


def _error_page(request, code, status):
    """3 tilda xato sahifasi (JS'siz ham ishlaydi)."""
    return render(request, 'guest/error.html',
                  {'error_code': code, 'lang': detect_lang(request)}, status=status)


@require_GET
def table_entry(request, qr_token):
    # [2.1-2.2] Stol topish (grace period ichidagi eski token ham qabul qilinadi)
    try:
        table = resolve_table_by_token(qr_token)
    except QRInvalid:
        log.warning(f'[M-01] QR topilmadi: {qr_token}')
        return _error_page(request, 'qr_invalid', 404)

    restaurant = table.restaurant

    # [2.3] Restoran faolmi
    if not restaurant.is_active:
        return _error_page(request, 'restaurant_inactive', 403)

    # [2.6] Til (avval — cookie yozishda kerak)
    lang = detect_lang(request, restaurant)

    # [2.4] Guest — device_token cookie (1 yil)
    device_token = read_device_token(request)
    new_device = device_token is None
    if new_device:
        device_token = uuid.uuid4()

    with transaction.atomic():
        guest, _ = get_or_create_guest(restaurant.id, device_token, lang)
        # [2.5] GuestSession
        session, is_new_session = open_session(guest, table, lang)

    # [2.7] Analitika (async — so'rovni sekinlashtirmaydi)
    enqueue('analytics', 'table_scanned',
            restaurant_id=restaurant.id, table_id=table.id,
            guest_id=guest.id, session_id=str(session.public_id),
            new_device=new_device)

    # [2.8] WS → admin dashboard: "Stol 5 skanerlandi"
    if is_new_session:
        broadcast_table_scanned(table, session.public_id)

    # [3] Menyuga redirect
    url = (f'/m/{restaurant.slug}/'
           f'?t={table.id}&s={session.public_id}&lang={lang}')
    resp = redirect(url)
    if new_device:
        set_device_cookie(resp, device_token)
    set_lang_cookie(resp, lang)
    return resp
```

**Fayl:** `templates/guest/error.html`
```html
{% load static %}<!DOCTYPE html>
<html lang="{{ lang }}" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>ARMENU</title>
  <link rel="stylesheet" href="{% static 'guest/css/theme.css' %}?v=1">
  <style>
    .err { min-height:100dvh; display:flex; flex-direction:column;
           align-items:center; justify-content:center; gap:var(--sp-4);
           padding:var(--sp-5); text-align:center;
           background:var(--bg); color:var(--text); }
    .err__icon { font-size:64px; }
    .err__msg  { font-size:var(--fs-lg); color:var(--text-soft); max-width:32ch; }
  </style>
</head>
<body>
  <div class="err">
    <div class="err__icon">⛔</div>
    <div class="err__msg" data-i18n="errors.{{ error_code }}"></div>
  </div>
  <script>window.ARMENU_LANG = "{{ lang }}";</script>
  <script src="{% static 'guest/js/i18n.js' %}?v=1"></script>
  <script>
    loadI18n(window.ARMENU_LANG).then(applyI18n);
  </script>
</body>
</html>
```

**Fayl:** `config/urls.py` ga:
```python
from apps.guest.views import table_entry, menu_page

urlpatterns += [
    path('t/<uuid:qr_token>', table_entry, name='table-entry'),
    path('m/<slug:slug>/', menu_page, name='menu-page'),
]
```

✅ **Tekshirish:**
```bash
TOKEN=$(python manage.py shell -c "from apps.tables.models import Table;print(Table.objects.first().qr_token)")
curl -s -i "http://localhost:8060/t/$TOKEN" | head -8
# HTTP/1.1 302 Found
# Location: /m/test-rest/?t=1&s=<uuid>&lang=uz
# Set-Cookie: armenu_device=...; Max-Age=31536000; HttpOnly
# Set-Cookie: armenu_lang=uz; Max-Age=31536000

curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8060/t/$(uuidgen)"
# 404
```

---

## V-071 — Menyu sahifasi shabloni (M-02)

**Fayl:** `apps/guest/views.py` (davomi)
```python
from django.shortcuts import get_object_or_404
from apps.tenants.models import Restaurant
from apps.tables.models import Table
from apps.guest.models import GuestSession


@require_GET
def menu_page(request, slug):
    """M-02 — menyu sahifasi. Ma'lumot JS orqali /v1/menu/ dan olinadi."""
    restaurant = get_object_or_404(Restaurant, slug=slug, is_active=True)
    lang = detect_lang(request, restaurant)

    table = None
    tid = request.GET.get('t')
    if tid and str(tid).isdigit():
        table = Table.objects.filter(id=tid, restaurant=restaurant,
                                     is_active=True).first()

    session_pid = request.GET.get('s', '')
    if session_pid:
        GuestSession.objects.filter(public_id=session_pid,
                                    restaurant=restaurant).update(
            last_seen_at=__import__('django.utils.timezone',
                                    fromlist=['timezone']).timezone.now())

    resp = render(request, 'guest/menu.html', {
        'restaurant': restaurant,
        'table': table,
        'session_id': session_pid,
        'lang': lang,
        'i18n_version': 1,
        'static_version': 1,
    })
    return set_lang_cookie(resp, lang)
```

**Fayl:** `templates/guest/menu.html`
```html
{% load static %}<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=5">
  <meta name="theme-color" content="#E85D2A">
  <title>{{ restaurant.name }} — ARMENU</title>
  <link rel="manifest" href="{% url 'pwa-manifest' slug=restaurant.slug %}">
  <link rel="stylesheet" href="{% static 'guest/css/theme.css' %}?v={{ static_version }}">
  <link rel="stylesheet" href="{% static 'guest/css/menu.css' %}?v={{ static_version }}">
</head>
<body>
<header class="hdr">
  <div class="hdr__brand">
    {% if restaurant.logo %}<img class="hdr__logo" src="{{ restaurant.logo.url }}" alt="">{% endif %}
    <div>
      <div class="hdr__name">{{ restaurant.name }}</div>
      {% if table %}<div class="hdr__table" data-i18n-tpl="order.table"
                         data-i18n-n="{{ table.number }}"></div>{% endif %}
    </div>
  </div>
  <div class="hdr__actions">
    <button class="icon-btn" id="btnLang" aria-label="Language">🌐 <span id="langCode">{{ lang|upper }}</span></button>
    <button class="icon-btn" id="btnTheme" aria-label="Theme">🌙</button>
  </div>
</header>

<div class="searchbar">
  <input id="searchInput" type="search" class="searchbar__input"
         data-i18n-ph="menu.search_placeholder" autocomplete="off">
</div>

<nav class="cats" id="cats" aria-label="categories"></nav>

<div class="diets" id="diets"></div>

<main class="list" id="dishList"><div class="skeleton-grid" id="skeleton"></div></main>

<div class="empty" id="emptyState" hidden>
  <div class="empty__icon">🔍</div>
  <div data-i18n="menu.no_results"></div>
</div>

<div class="bottombar">
  <button class="btn btn--ghost" id="btnCall">🔔 <span data-i18n="call.title"></span></button>
  <button class="btn btn--primary" id="btnCart" hidden>
    🛒 <span id="cartCount">0</span> · <span id="cartTotal">0</span>
  </button>
  <button class="icon-btn" id="btnChat" aria-label="AI">🤖</button>
</div>

<div id="modalRoot"></div>
<div id="toastRoot" class="toasts" aria-live="polite"></div>

<script>
  window.ARMENU = {
    slug: "{{ restaurant.slug }}",
    restaurantId: {{ restaurant.id }},
    tableId: {{ table.id|default:"null" }},
    tableNumber: "{{ table.number|default:'' }}",
    sessionId: "{{ session_id }}",
    lang: "{{ lang }}",
    i18nVersion: {{ i18n_version }},
    serviceFeePct: {{ restaurant.service_fee_pct|default:0 }},
    wsUrl: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host
           + "/ws/guest/{{ session_id }}/"
  };
</script>
<script src="{% static 'guest/js/i18n.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/toast.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/theme.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/cart.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/ws.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/menu.js' %}?v={{ static_version }}"></script>
</body>
</html>
```

⚠️ Har static o'zgarishda `static_version` oshiriladi (cache-bust).

---

## V-072 — ⚡ `static/i18n/uz.json` (to'liq lug'at)

**Fayl:** `static/i18n/uz.json`
```json
{
  "common": {
    "back": "Orqaga", "close": "Yopish", "save": "Saqlash",
    "cancel": "Bekor qilish", "confirm": "Tasdiqlash", "delete": "O'chirish",
    "edit": "Tahrirlash", "add": "Qo'shish", "search": "Qidirish",
    "loading": "Yuklanmoqda...", "error": "Xatolik", "retry": "Qayta urinish",
    "yes": "Ha", "no": "Yo'q", "all": "Hammasi", "sum": "so'm",
    "min": "daqiqa", "gram": "g", "pcs": "ta", "offline": "Ulanish yo'q"
  },
  "menu": {
    "title": "Menyu", "search_placeholder": "Taom qidirish...",
    "no_results": "Hech narsa topilmadi", "category_all": "Hammasi",
    "sold_out": "Tugagan", "hit": "Ommabop", "new": "Yangi",
    "cook_time": "{n} daqiqa", "weight": "{n} g", "calories": "{n} kkal"
  },
  "dish": {
    "ingredients": "Tarkibi", "allergens": "Allergenlar",
    "no_allergens": "Allergen yo'q", "modifiers": "Qo'shimchalar",
    "note_placeholder": "Izoh (masalan: achchiq qilmang)",
    "add_to_cart": "Savatga qo'shish", "view_ar": "AR'da ko'rish",
    "view_3d": "3D ko'rish", "rating": "{n} ({cnt} ta baho)",
    "added": "Savatga qo'shildi"
  },
  "ar": {
    "button": "📱 Stolga qo'yib ko'rish",
    "loading": "3D model yuklanmoqda...",
    "not_supported": "Qurilmangiz AR'ni qo'llab-quvvatlamaydi",
    "not_supported_hint": "3D ko'rinishda aylantirib ko'rishingiz mumkin",
    "error": "3D model yuklanmadi",
    "instruction": "Telefoningizni stolga qarating",
    "real_size": "Haqiqiy o'lchamda",
    "preparing": "3D model tayyorlanmoqda..."
  },
  "cart": {
    "title": "Savat", "empty": "Savat bo'sh",
    "empty_hint": "Menyudan taom tanlang",
    "subtotal": "Taomlar", "service_fee": "Xizmat ({pct}%)",
    "discount": "Chegirma", "total": "JAMI",
    "note_placeholder": "Umumiy izoh",
    "submit": "Buyurtma berish", "cross_sell": "Bularni ham oling",
    "remove_confirm": "Savatdan olib tashlansinmi?",
    "sending": "Yuborilmoqda..."
  },
  "order": {
    "created": "Buyurtmangiz qabul qilindi!",
    "number": "Buyurtma {n}", "table": "Stol {n}",
    "status_new": "Qabul qilindi", "status_accepted": "Qabul qilindi",
    "status_cooking": "Tayyorlanmoqda", "status_ready": "Tayyor",
    "status_served": "Berildi", "status_paid": "To'landi",
    "eta": "Taxminan {n} daqiqa qoldi",
    "ready_title": "🎉 Buyurtmangiz tayyor!",
    "add_more": "Yana buyurtma", "request_bill": "Hisob so'rash",
    "unavailable": "{dish} tugadi. Ofitsiant keladi."
  },
  "call": {
    "title": "Nima kerak?", "waiter": "Ofitsiant", "bill": "Hisob",
    "water": "Suv", "clean": "Tozalash",
    "sent": "Ofitsiant chaqirildi ✓",
    "cooldown": "Iltimos, biroz kuting",
    "resolved": "Ofitsiant keldi"
  },
  "payment": {
    "title": "To'lov", "method": "To'lov usuli", "cash": "Naqd (ofitsiantga)",
    "payme": "Payme", "click": "Click", "uzum": "Uzum",
    "use_bonus": "Bonusdan foydalanish", "pay": "To'lash — {amount}",
    "success": "✅ To'lov qabul qilindi", "failed": "To'lov amalga oshmadi",
    "split": "Hisobni bo'lish", "receipt": "Chek"
  },
  "tips": {
    "title": "Xizmat yoqdimi?", "waiter_label": "Sizning ofitsiantingiz",
    "give": "💝 Choychaqa berish", "skip": "O'tkazib yuborish",
    "custom": "Boshqa summa", "thanks": "Rahmat! 🎉"
  },
  "review": {
    "title": "Bizni baholang", "food": "Taom", "service": "Xizmat",
    "ambience": "Muhit", "comment_placeholder": "Izohingiz...",
    "submit": "Yuborish", "thanks": "Rahmat! 🎉",
    "google_prompt": "Google'da ham baholaysizmi?",
    "google_button": "Google'ga o'tish",
    "sorry": "Uzr so'raymiz. Nima yoqmadi?"
  },
  "chat": {
    "title": "Yordamchi", "greeting": "Salom! Menyu bo'yicha savolingiz bormi?",
    "placeholder": "Savolingizni yozing...", "thinking": "O'ylayapman...",
    "error": "Kechirasiz, hozir javob bera olmayman. Ofitsiantni chaqiring.",
    "view_dish": "Ko'rish", "order_dish": "Buyurtma"
  },
  "errors": {
    "qr_invalid": "QR kod yaroqsiz. Ofitsiantga murojaat qiling.",
    "restaurant_inactive": "Restoran vaqtincha xizmat ko'rsatmayapti",
    "table_inactive": "Bu stol vaqtincha ishlamayapti",
    "dish_unavailable": "Bu taom hozir mavjud emas",
    "price_changed": "Narxlar yangilandi. Savatni tekshiring.",
    "network": "Ulanish yo'q. Qayta urinilmoqda...",
    "server": "Xatolik yuz berdi. Ofitsiantni chaqiring.",
    "rate_limited": "Juda ko'p so'rov. Biroz kuting."
  },
  "staff": {
    "login": "Xodim kirishi", "pin": "PIN kod", "wrong_pin": "PIN noto'g'ri",
    "blocked": "Bloklandi. {n} daqiqadan keyin urinib ko'ring.",
    "new_orders": "Yangi buyurtmalar", "my_tables": "Mening stollarim",
    "hall": "Zal", "calls": "Chaqiruvlar", "stats": "Statistika",
    "accept": "✅ Qabul qildim", "serve": "🍽 Olib bordim",
    "shift_start": "Smena boshlash", "shift_end": "Smena tugatish",
    "today": "Bugun", "tables_served": "{n} stol", "tips_earned": "Choychaqa"
  },
  "kds": {
    "title": "Oshxona", "new": "YANGI", "cooking": "TAYYORLANMOQDA",
    "ready": "TAYYOR", "start": "BOSHLASH", "mark_ready": "TAYYOR ✓",
    "served": "BERILDI", "late": "KECHIKDI", "avg_time": "O'rtacha"
  },
  "admin": {
    "dashboard": "Dashboard", "menu": "Menyu", "tables": "Stollar",
    "orders": "Buyurtmalar", "staff": "Xodimlar", "reports": "Hisobotlar",
    "ar_models": "3D/AR modellar", "settings": "Sozlamalar",
    "today_revenue": "Bugungi savdo", "orders_count": "Buyurtma",
    "avg_check": "O'rtacha chek", "tables_busy": "Band stollar",
    "ar_views": "AR ko'rish"
  },
  "diet": {
    "halal": "Halol", "vegetarian": "Vegetarian", "vegan": "Vegan",
    "spicy": "Achchiq", "no_spicy": "Achchiq emas",
    "lactose_free": "Laktozasiz", "gluten_free": "Glutensiz"
  },
  "allergen": {
    "nuts": "Yong'oq", "gluten": "Gluten", "dairy": "Sut mahsulotlari",
    "eggs": "Tuxum", "fish": "Baliq", "shellfish": "Dengiz mahsulotlari",
    "soy": "Soya", "sesame": "Kunjut"
  }
}
```

**Fayl:** `static/i18n/ru.json` — aynan shu tuzilma, ruscha qiymatlar:
```json
{
  "common": {
    "back": "Назад", "close": "Закрыть", "save": "Сохранить",
    "cancel": "Отмена", "confirm": "Подтвердить", "delete": "Удалить",
    "edit": "Изменить", "add": "Добавить", "search": "Поиск",
    "loading": "Загрузка...", "error": "Ошибка", "retry": "Повторить",
    "yes": "Да", "no": "Нет", "all": "Все", "sum": "сум",
    "min": "мин", "gram": "г", "pcs": "шт", "offline": "Нет соединения"
  },
  "menu": {
    "title": "Меню", "search_placeholder": "Поиск блюда...",
    "no_results": "Ничего не найдено", "category_all": "Все",
    "sold_out": "Закончилось", "hit": "Популярное", "new": "Новинка",
    "cook_time": "{n} мин", "weight": "{n} г", "calories": "{n} ккал"
  },
  "dish": {
    "ingredients": "Состав", "allergens": "Аллергены",
    "no_allergens": "Аллергенов нет", "modifiers": "Дополнения",
    "note_placeholder": "Комментарий (например: не острое)",
    "add_to_cart": "В корзину", "view_ar": "Смотреть в AR",
    "view_3d": "Смотреть 3D", "rating": "{n} ({cnt} оценок)",
    "added": "Добавлено в корзину"
  },
  "ar": {
    "button": "📱 Поставить на стол",
    "loading": "Загрузка 3D-модели...",
    "not_supported": "Ваше устройство не поддерживает AR",
    "not_supported_hint": "Можно посмотреть в 3D и покрутить",
    "error": "3D-модель не загрузилась",
    "instruction": "Направьте телефон на стол",
    "real_size": "В реальном размере",
    "preparing": "3D-модель готовится..."
  },
  "cart": {
    "title": "Корзина", "empty": "Корзина пуста",
    "empty_hint": "Выберите блюдо из меню",
    "subtotal": "Блюда", "service_fee": "Обслуживание ({pct}%)",
    "discount": "Скидка", "total": "ИТОГО",
    "note_placeholder": "Общий комментарий",
    "submit": "Оформить заказ", "cross_sell": "Возьмите ещё",
    "remove_confirm": "Убрать из корзины?",
    "sending": "Отправка..."
  },
  "order": {
    "created": "Ваш заказ принят!",
    "number": "Заказ {n}", "table": "Стол {n}",
    "status_new": "Принят", "status_accepted": "Принят",
    "status_cooking": "Готовится", "status_ready": "Готов",
    "status_served": "Подан", "status_paid": "Оплачен",
    "eta": "Осталось примерно {n} мин",
    "ready_title": "🎉 Ваш заказ готов!",
    "add_more": "Ещё заказ", "request_bill": "Попросить счёт",
    "unavailable": "{dish} закончилось. Официант подойдёт."
  },
  "call": {
    "title": "Что нужно?", "waiter": "Официант", "bill": "Счёт",
    "water": "Вода", "clean": "Убрать",
    "sent": "Официант вызван ✓",
    "cooldown": "Пожалуйста, подождите",
    "resolved": "Официант подошёл"
  },
  "payment": {
    "title": "Оплата", "method": "Способ оплаты", "cash": "Наличными (официанту)",
    "payme": "Payme", "click": "Click", "uzum": "Uzum",
    "use_bonus": "Использовать бонусы", "pay": "Оплатить — {amount}",
    "success": "✅ Оплата принята", "failed": "Оплата не прошла",
    "split": "Разделить счёт", "receipt": "Чек"
  },
  "tips": {
    "title": "Понравилось обслуживание?", "waiter_label": "Ваш официант",
    "give": "💝 Оставить чаевые", "skip": "Пропустить",
    "custom": "Другая сумма", "thanks": "Спасибо! 🎉"
  },
  "review": {
    "title": "Оцените нас", "food": "Еда", "service": "Сервис",
    "ambience": "Атмосфера", "comment_placeholder": "Ваш комментарий...",
    "submit": "Отправить", "thanks": "Спасибо! 🎉",
    "google_prompt": "Оцените нас и в Google?",
    "google_button": "Перейти в Google",
    "sorry": "Приносим извинения. Что не понравилось?"
  },
  "chat": {
    "title": "Помощник", "greeting": "Здравствуйте! Есть вопросы по меню?",
    "placeholder": "Напишите вопрос...", "thinking": "Думаю...",
    "error": "Извините, сейчас не могу ответить. Позовите официанта.",
    "view_dish": "Посмотреть", "order_dish": "Заказать"
  },
  "errors": {
    "qr_invalid": "QR-код недействителен. Обратитесь к официанту.",
    "restaurant_inactive": "Ресторан временно не обслуживает",
    "table_inactive": "Этот стол временно не работает",
    "dish_unavailable": "Это блюдо сейчас недоступно",
    "price_changed": "Цены обновлены. Проверьте корзину.",
    "network": "Нет соединения. Повторяем попытку...",
    "server": "Произошла ошибка. Позовите официанта.",
    "rate_limited": "Слишком много запросов. Подождите."
  },
  "staff": {
    "login": "Вход для персонала", "pin": "PIN-код", "wrong_pin": "Неверный PIN",
    "blocked": "Заблокировано. Попробуйте через {n} мин.",
    "new_orders": "Новые заказы", "my_tables": "Мои столы",
    "hall": "Зал", "calls": "Вызовы", "stats": "Статистика",
    "accept": "✅ Принял", "serve": "🍽 Подал",
    "shift_start": "Начать смену", "shift_end": "Закончить смену",
    "today": "Сегодня", "tables_served": "{n} столов", "tips_earned": "Чаевые"
  },
  "kds": {
    "title": "Кухня", "new": "НОВЫЙ", "cooking": "ГОТОВИТСЯ",
    "ready": "ГОТОВ", "start": "НАЧАТЬ", "mark_ready": "ГОТОВО ✓",
    "served": "ПОДАНО", "late": "ОПОЗДАНИЕ", "avg_time": "Среднее"
  },
  "admin": {
    "dashboard": "Дашборд", "menu": "Меню", "tables": "Столы",
    "orders": "Заказы", "staff": "Персонал", "reports": "Отчёты",
    "ar_models": "3D/AR модели", "settings": "Настройки",
    "today_revenue": "Выручка за сегодня", "orders_count": "Заказов",
    "avg_check": "Средний чек", "tables_busy": "Занятые столы",
    "ar_views": "Просмотры AR"
  },
  "diet": {
    "halal": "Халяль", "vegetarian": "Вегетарианское", "vegan": "Веганское",
    "spicy": "Острое", "no_spicy": "Не острое",
    "lactose_free": "Без лактозы", "gluten_free": "Без глютена"
  },
  "allergen": {
    "nuts": "Орехи", "gluten": "Глютен", "dairy": "Молочные продукты",
    "eggs": "Яйца", "fish": "Рыба", "shellfish": "Морепродукты",
    "soy": "Соя", "sesame": "Кунжут"
  }
}
```

**Fayl:** `static/i18n/en.json`:
```json
{
  "common": {
    "back": "Back", "close": "Close", "save": "Save",
    "cancel": "Cancel", "confirm": "Confirm", "delete": "Delete",
    "edit": "Edit", "add": "Add", "search": "Search",
    "loading": "Loading...", "error": "Error", "retry": "Retry",
    "yes": "Yes", "no": "No", "all": "All", "sum": "UZS",
    "min": "min", "gram": "g", "pcs": "pcs", "offline": "No connection"
  },
  "menu": {
    "title": "Menu", "search_placeholder": "Search dishes...",
    "no_results": "Nothing found", "category_all": "All",
    "sold_out": "Sold out", "hit": "Popular", "new": "New",
    "cook_time": "{n} min", "weight": "{n} g", "calories": "{n} kcal"
  },
  "dish": {
    "ingredients": "Ingredients", "allergens": "Allergens",
    "no_allergens": "No allergens", "modifiers": "Add-ons",
    "note_placeholder": "Note (e.g. not spicy)",
    "add_to_cart": "Add to cart", "view_ar": "View in AR",
    "view_3d": "View in 3D", "rating": "{n} ({cnt} reviews)",
    "added": "Added to cart"
  },
  "ar": {
    "button": "📱 Place it on your table",
    "loading": "Loading 3D model...",
    "not_supported": "Your device does not support AR",
    "not_supported_hint": "You can still rotate it in 3D",
    "error": "3D model failed to load",
    "instruction": "Point your phone at the table",
    "real_size": "Real size",
    "preparing": "3D model is being prepared..."
  },
  "cart": {
    "title": "Cart", "empty": "Your cart is empty",
    "empty_hint": "Pick a dish from the menu",
    "subtotal": "Dishes", "service_fee": "Service ({pct}%)",
    "discount": "Discount", "total": "TOTAL",
    "note_placeholder": "General note",
    "submit": "Place order", "cross_sell": "Add these too",
    "remove_confirm": "Remove from cart?",
    "sending": "Sending..."
  },
  "order": {
    "created": "Your order has been accepted!",
    "number": "Order {n}", "table": "Table {n}",
    "status_new": "Accepted", "status_accepted": "Accepted",
    "status_cooking": "Cooking", "status_ready": "Ready",
    "status_served": "Served", "status_paid": "Paid",
    "eta": "About {n} min left",
    "ready_title": "🎉 Your order is ready!",
    "add_more": "Order more", "request_bill": "Request bill",
    "unavailable": "{dish} is sold out. A waiter is coming."
  },
  "call": {
    "title": "What do you need?", "waiter": "Waiter", "bill": "Bill",
    "water": "Water", "clean": "Clean up",
    "sent": "Waiter called ✓",
    "cooldown": "Please wait a moment",
    "resolved": "The waiter has arrived"
  },
  "payment": {
    "title": "Payment", "method": "Payment method", "cash": "Cash (to waiter)",
    "payme": "Payme", "click": "Click", "uzum": "Uzum",
    "use_bonus": "Use bonus points", "pay": "Pay — {amount}",
    "success": "✅ Payment accepted", "failed": "Payment failed",
    "split": "Split the bill", "receipt": "Receipt"
  },
  "tips": {
    "title": "Enjoyed the service?", "waiter_label": "Your waiter",
    "give": "💝 Leave a tip", "skip": "Skip",
    "custom": "Other amount", "thanks": "Thank you! 🎉"
  },
  "review": {
    "title": "Rate us", "food": "Food", "service": "Service",
    "ambience": "Ambience", "comment_placeholder": "Your comment...",
    "submit": "Submit", "thanks": "Thank you! 🎉",
    "google_prompt": "Rate us on Google too?",
    "google_button": "Go to Google",
    "sorry": "We're sorry. What went wrong?"
  },
  "chat": {
    "title": "Assistant", "greeting": "Hi! Any questions about the menu?",
    "placeholder": "Type your question...", "thinking": "Thinking...",
    "error": "Sorry, I can't answer right now. Please call a waiter.",
    "view_dish": "View", "order_dish": "Order"
  },
  "errors": {
    "qr_invalid": "Invalid QR code. Please contact the waiter.",
    "restaurant_inactive": "Restaurant is temporarily unavailable",
    "table_inactive": "This table is temporarily unavailable",
    "dish_unavailable": "This dish is currently unavailable",
    "price_changed": "Prices have changed. Please check your cart.",
    "network": "No connection. Retrying...",
    "server": "Something went wrong. Please call a waiter.",
    "rate_limited": "Too many requests. Please wait."
  },
  "staff": {
    "login": "Staff login", "pin": "PIN code", "wrong_pin": "Wrong PIN",
    "blocked": "Blocked. Try again in {n} min.",
    "new_orders": "New orders", "my_tables": "My tables",
    "hall": "Hall", "calls": "Calls", "stats": "Stats",
    "accept": "✅ Accepted", "serve": "🍽 Served",
    "shift_start": "Start shift", "shift_end": "End shift",
    "today": "Today", "tables_served": "{n} tables", "tips_earned": "Tips"
  },
  "kds": {
    "title": "Kitchen", "new": "NEW", "cooking": "COOKING",
    "ready": "READY", "start": "START", "mark_ready": "READY ✓",
    "served": "SERVED", "late": "LATE", "avg_time": "Average"
  },
  "admin": {
    "dashboard": "Dashboard", "menu": "Menu", "tables": "Tables",
    "orders": "Orders", "staff": "Staff", "reports": "Reports",
    "ar_models": "3D/AR models", "settings": "Settings",
    "today_revenue": "Today's revenue", "orders_count": "Orders",
    "avg_check": "Average check", "tables_busy": "Busy tables",
    "ar_views": "AR views"
  },
  "diet": {
    "halal": "Halal", "vegetarian": "Vegetarian", "vegan": "Vegan",
    "spicy": "Spicy", "no_spicy": "Not spicy",
    "lactose_free": "Lactose free", "gluten_free": "Gluten free"
  },
  "allergen": {
    "nuts": "Nuts", "gluten": "Gluten", "dairy": "Dairy",
    "eggs": "Eggs", "fish": "Fish", "shellfish": "Shellfish",
    "soy": "Soy", "sesame": "Sesame"
  }
}
```

✅ **Test:** `tests/test_i18n_completeness.py`
```python
import json, pathlib

BASE = pathlib.Path('static/i18n')


def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def _load(lang):
    return flatten(json.load(open(BASE / f'{lang}.json', encoding='utf-8')))


def test_all_langs_have_same_keys():
    uz, ru, en = _load('uz'), _load('ru'), _load('en')
    assert set(uz) == set(ru), f"RU yetishmayapti: {set(uz) - set(ru)}"
    assert set(uz) == set(en), f"EN yetishmayapti: {set(uz) - set(en)}"


def test_no_empty_translations():
    for lang in ('uz', 'ru', 'en'):
        empty = [k for k, v in _load(lang).items() if not str(v).strip()]
        assert not empty, f'{lang} bo\'sh: {empty}'


def test_placeholders_match():
    import re
    ph = lambda s: set(re.findall(r'\{(\w+)\}', str(s)))
    uz, ru, en = _load('uz'), _load('ru'), _load('en')
    for k in uz:
        assert ph(uz[k]) == ph(ru[k]) == ph(en[k]), f'O\'rinbosar farqi: {k}'
```

```bash
pytest tests/test_i18n_completeness.py -q
# 3 passed
```

---

## V-073 — JS i18n yuklovchi (`t()` funksiyasi)

**Fayl:** `static/guest/js/i18n.js`
```javascript
/* ARMENU i18n — 3 til, localStorage kesh, {n} o'rinbosarlar */
let TRANSLATIONS = {};
let CURRENT_LANG = 'uz';
const I18N_VERSION = (window.ARMENU && window.ARMENU.i18nVersion) || 1;
const SUPPORTED_LANGS = ['uz', 'ru', 'en'];

async function loadI18n(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'uz';
  CURRENT_LANG = lang;

  const key = `i18n_${lang}_v${I18N_VERSION}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) { TRANSLATIONS = JSON.parse(cached); return TRANSLATIONS; }
  } catch (e) { /* private rejim — keshsiz davom etamiz */ }

  const r = await fetch(`/static/i18n/${lang}.json?v=${I18N_VERSION}`);
  if (!r.ok) throw new Error(`i18n ${lang} yuklanmadi`);
  TRANSLATIONS = await r.json();
  try { localStorage.setItem(key, JSON.stringify(TRANSLATIONS)); } catch (e) {}
  return TRANSLATIONS;
}

/**
 * t('cart.empty')             → "Savat bo'sh"
 * t('order.eta', {n: 18})     → "Taxminan 18 daqiqa qoldi"
 */
function t(key, params = {}) {
  const val = key.split('.').reduce((o, k) => (o ? o[k] : undefined), TRANSLATIONS);
  if (val === undefined) { console.warn(`[i18n] yo'q: ${key}`); return key; }
  return String(val).replace(/\{(\w+)\}/g, (_, p) => (p in params ? params[p] : `{${p}}`));
}

/** Sahifadagi barcha data-i18n* elementlarini tarjima qiladi */
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-tpl]').forEach(el => {
    el.textContent = t(el.dataset.i18nTpl, { n: el.dataset.i18nN || '' });
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', t(el.dataset.i18nTitle));
  });
  document.documentElement.lang = CURRENT_LANG;
}

/** Summani formatlash: 173800 → "173 800 so'm" */
function fmtMoney(v) {
  const n = Math.round(Number(v) || 0);
  return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + t('common.sum');
}

/** Til almashtirish — sahifa qayta yuklanmaydi */
async function switchLang(lang) {
  await loadI18n(lang);
  applyI18n();
  document.cookie = `armenu_lang=${lang};path=/;max-age=31536000;samesite=Lax`;
  window.ARMENU.lang = lang;
  const el = document.getElementById('langCode');
  if (el) el.textContent = lang.toUpperCase();
  if (typeof reloadMenuContent === 'function') await reloadMenuContent(lang);
  fetch('/v1/lang/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, session_id: window.ARMENU.sessionId })
  }).catch(() => {});
}
```

✅ **Tekshirish:** brauzer konsolida
```javascript
await loadI18n('ru'); t('order.eta', {n: 18});
// "Осталось примерно 18 мин"
```

---

## V-074 — `menu.js` — yuklash, render, virtual scroll

**Fayl:** `static/guest/js/menu.js`
```javascript
/* M-02 — menyu sahifasi */
let MENU_DATA = { categories: [], dishes: [], upsell_rules: [] };
let VIEW = { category: null, diets: [], query: '' };
const VIRTUAL_THRESHOLD = 100;      // 100+ taomda virtual scroll

async function initMenu() {
  await loadI18n(window.ARMENU.lang);
  applyI18n();
  initTheme();

  try {
    MENU_DATA = await fetchMenu(window.ARMENU.lang);
  } catch (e) {
    toast(t('errors.server'), 'error');
    return;
  }

  renderCategories();
  renderDiets();
  renderDishes(visibleDishes());
  restoreCart();
  updateCartBar();
  connectWS();
  initLazyImages();
  bindUI();
  document.getElementById('skeleton')?.remove();
}

async function fetchMenu(lang) {
  const url = `/v1/menu/${window.ARMENU.slug}/?lang=${lang}`;
  const cacheKey = `menu_${window.ARMENU.slug}_${lang}`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
    return data;
  } catch (e) {
    // ⛔ Offline — 24 soatgacha eski keshdan ko'rsatamiz
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < 24 * 3600 * 1000) {
        toast(t('errors.network'), 'info');
        return data;
      }
    }
    throw e;
  }
}

async function reloadMenuContent(lang) {
  MENU_DATA = await fetchMenu(lang);
  renderCategories();
  renderDiets();
  renderDishes(visibleDishes());
}

/* --- Filtr --- */

function visibleDishes() {
  const q = VIEW.query.trim().toLowerCase();
  return MENU_DATA.dishes.filter(d => {
    if (VIEW.category && d.category_id !== VIEW.category) return false;
    if (VIEW.diets.length && !VIEW.diets.every(tag => (d.diet_tags || []).includes(tag)))
      return false;
    if (q && !(`${d.name} ${d.desc || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

/* --- Render --- */

function renderCategories() {
  const box = document.getElementById('cats');
  const all = `<button class="cat ${VIEW.category === null ? 'is-on' : ''}"
      data-cat="">${t('menu.category_all')}</button>`;
  box.innerHTML = all + MENU_DATA.categories.map(c =>
    `<button class="cat ${VIEW.category === c.id ? 'is-on' : ''}"
       data-cat="${c.id}">${esc(c.name)}</button>`).join('');
}

function renderDiets() {
  const tags = ['halal', 'vegetarian', 'vegan', 'no_spicy', 'gluten_free'];
  document.getElementById('diets').innerHTML = tags.map(tag =>
    `<button class="chip ${VIEW.diets.includes(tag) ? 'is-on' : ''}"
       data-diet="${tag}">${t('diet.' + tag)}</button>`).join('');
}

function dishCardHTML(d) {
  const badge = d.is_hit ? `<span class="badge badge--hit">${t('menu.hit')}</span>`
              : d.is_new ? `<span class="badge badge--new">${t('menu.new')}</span>` : '';
  const out = !d.is_available
    ? `<span class="badge badge--out">${t('menu.sold_out')}</span>` : '';
  const ar = d.has_ar
    ? `<button class="dish__ar" data-ar="${d.id}"
         aria-label="${t('dish.view_ar')}">🎯 AR</button>` : '';
  return `
  <article class="dish ${d.is_available ? '' : 'dish--out'}" data-dish="${d.id}">
    <div class="dish__media">
      <img class="dish__img" data-src="${d.image || ''}" alt="${esc(d.name)}"
           loading="lazy" width="120" height="120">
      ${ar}
    </div>
    <div class="dish__body">
      <div class="dish__title">${esc(d.name)} ${badge} ${out}</div>
      <div class="dish__desc">${esc((d.desc || '').slice(0, 70))}</div>
      <div class="dish__meta">
        ${d.cook_min ? `⏱ ${t('menu.cook_time', { n: d.cook_min })}` : ''}
        ${d.weight ? ` · ⚖️ ${t('menu.weight', { n: d.weight })}` : ''}
      </div>
      <div class="dish__foot">
        <span class="dish__price">${fmtMoney(d.price)}</span>
        <button class="btn btn--sm btn--primary" data-add="${d.id}"
                ${d.is_available ? '' : 'disabled'}>+ ${t('cart.title')}</button>
      </div>
    </div>
  </article>`;
}

function renderDishes(list) {
  const box = document.getElementById('dishList');
  const empty = document.getElementById('emptyState');
  empty.hidden = list.length > 0;

  if (list.length > VIRTUAL_THRESHOLD) { renderVirtual(box, list); return; }
  box.innerHTML = list.map(dishCardHTML).join('');
  initLazyImages();
}

/* ⚡ Virtual scroll — 100+ taomda faqat ko'rinadigan qism DOM'da */
function renderVirtual(box, list) {
  const ROW_H = 132;
  const BUFFER = 6;
  box.innerHTML = `<div class="vscroll" style="height:${list.length * ROW_H}px">
                     <div class="vscroll__win" id="vwin"></div></div>`;
  const win = document.getElementById('vwin');

  function draw() {
    const top = Math.max(0, window.scrollY - box.offsetTop);
    const first = Math.max(0, Math.floor(top / ROW_H) - BUFFER);
    const count = Math.ceil(window.innerHeight / ROW_H) + BUFFER * 2;
    const slice = list.slice(first, first + count);
    win.style.transform = `translateY(${first * ROW_H}px)`;
    win.innerHTML = slice.map(dishCardHTML).join('');
    initLazyImages();
  }
  draw();
  box._vdraw = draw;
  window.removeEventListener('scroll', box._vbound || (() => {}));
  box._vbound = () => requestAnimationFrame(draw);
  window.addEventListener('scroll', box._vbound, { passive: true });
}

function getDish(id) { return MENU_DATA.dishes.find(d => d.id === Number(id)); }

function esc(s) {
  return String(s || '').replace(/[&<>"']/g,
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', initMenu);
```

---

## V-075 — Qidiruv (debounce 300ms)

**Fayl:** `static/guest/js/menu.js` (davomi)
```javascript
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Lokal qidiruv (tez). 2+ belgida serverdan ham so'raladi. */
const searchDishes = debounce(async (q) => {
  VIEW.query = q;
  renderDishes(visibleDishes());

  if (q.trim().length < 2) return;
  try {
    const r = await fetch(
      `/v1/menu/${window.ARMENU.slug}/search/?q=${encodeURIComponent(q)}&lang=${window.ARMENU.lang}`);
    if (!r.ok) return;
    const { dishes } = await r.json();
    if (VIEW.query !== q) return;              // eskirgan javob — tashlab yuboramiz
    const known = new Set(MENU_DATA.dishes.map(d => d.id));
    dishes.forEach(d => { if (!known.has(d.id)) MENU_DATA.dishes.push(d); });
    renderDishes(visibleDishes());
  } catch (e) { /* offline — lokal natija yetarli */ }
}, 300);
```

---

## V-076 — Kategoriya va diet filtri + UI bog'lash

**Fayl:** `static/guest/js/menu.js` (davomi)
```javascript
function filterCategory(id) {
  VIEW.category = id ? Number(id) : null;
  renderCategories();
  renderDishes(visibleDishes());
  history.replaceState(null, '', id ? `#cat-${id}` : location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleDiet(tag) {
  const i = VIEW.diets.indexOf(tag);
  if (i >= 0) VIEW.diets.splice(i, 1); else VIEW.diets.push(tag);
  renderDiets();
  renderDishes(visibleDishes());
}

function bindUI() {
  document.getElementById('searchInput')
    .addEventListener('input', e => searchDishes(e.target.value));

  document.getElementById('cats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) filterCategory(b.dataset.cat);
  });

  document.getElementById('diets').addEventListener('click', e => {
    const b = e.target.closest('[data-diet]');
    if (b) toggleDiet(b.dataset.diet);
  });

  document.getElementById('dishList').addEventListener('click', e => {
    const ar = e.target.closest('[data-ar]');
    if (ar) { e.stopPropagation(); openAR(Number(ar.dataset.ar)); return; }
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); quickAdd(Number(add.dataset.add)); return; }
    const card = e.target.closest('[data-dish]');
    if (card) openDish(Number(card.dataset.dish));
  });

  document.getElementById('btnTheme').addEventListener('click', toggleTheme);
  document.getElementById('btnCart').addEventListener('click', openCart);
  document.getElementById('btnCall').addEventListener('click', openCallMenu);
  document.getElementById('btnLang').addEventListener('click', openLangMenu);
}

function openLangMenu() {
  const langs = [['uz', "O'zbek"], ['ru', 'Русский'], ['en', 'English']];
  openSheet(`<h3>🌐</h3><div class="langs">${langs.map(([c, n]) =>
    `<button class="btn btn--ghost btn--block" data-lang="${c}">${n}</button>`).join('')}</div>`,
    sheet => sheet.addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (b) { switchLang(b.dataset.lang); closeSheet(); }
    }));
}
```

---

## V-077 — Taom modali (M-04) + modifikatorlar va narx

**Fayl:** `static/guest/js/dish.js`
```javascript
/* M-04 — taom kartochkasi (bottom-sheet modal) */
let DISH_STATE = { dish: null, qty: 1, mods: new Set(), note: '' };

async function openDish(dishId) {
  let d = getDish(dishId);
  if (!d || !d.modifiers) {
    const r = await fetch(`/v1/dish/${dishId}/?lang=${window.ARMENU.lang}`);
    if (!r.ok) { toast(t('errors.server'), 'error'); return; }
    d = await r.json();
    const i = MENU_DATA.dishes.findIndex(x => x.id === dishId);
    if (i >= 0) MENU_DATA.dishes[i] = d; else MENU_DATA.dishes.push(d);
  }

  DISH_STATE = {
    dish: d, qty: 1, note: '',
    mods: new Set((d.modifiers || []).filter(m => m.is_default).map(m => m.id))
  };
  openSheet(dishModalHTML(d), bindDishModal);
}

function dishModalHTML(d) {
  const mods = (d.modifiers || []).map(m => `
    <label class="mod">
      <input type="checkbox" data-mod="${m.id}"
             ${DISH_STATE.mods.has(m.id) ? 'checked' : ''}>
      <span class="mod__name">${esc(m.name)}</span>
      <span class="mod__price">${m.price_delta > 0 ? '+' + fmtMoney(m.price_delta) : ''}</span>
    </label>`).join('');

  const allergens = (d.allergens || []).length
    ? (d.allergens).map(a => t('allergen.' + a)).join(', ')
    : t('dish.no_allergens');

  return `
  <div class="dishmodal">
    <div class="dishmodal__media">
      <img src="${d.image_lg || d.image || ''}" alt="${esc(d.name)}">
      ${d.has_ar ? `<button class="btn btn--ar" id="dmAR">${t('ar.button')}</button>` : ''}
    </div>
    <h2 class="dishmodal__title">${esc(d.name)}</h2>
    ${d.rating ? `<div class="dishmodal__rating">⭐ ${t('dish.rating',
        { n: d.rating, cnt: d.rating_count || 0 })}</div>` : ''}
    <p class="dishmodal__desc">${esc(d.desc || '')}</p>
    <div class="dishmodal__meta">
      ${d.cook_min ? `⏱ ${t('menu.cook_time', { n: d.cook_min })}` : ''}
      ${d.weight ? ` · ⚖️ ${t('menu.weight', { n: d.weight })}` : ''}
      ${d.calories ? ` · ${t('menu.calories', { n: d.calories })}` : ''}
    </div>
    <div class="dishmodal__diets">${(d.diet_tags || [])
        .map(tag => `<span class="chip chip--sm">${t('diet.' + tag)}</span>`).join('')}</div>
    <div class="dishmodal__row"><b>${t('dish.allergens')}:</b> ${esc(allergens)}</div>
    ${d.ingredients ? `<div class="dishmodal__row"><b>${t('dish.ingredients')}:</b>
        ${esc(d.ingredients)}</div>` : ''}
    ${mods ? `<div class="dishmodal__mods"><b>${t('dish.modifiers')}</b>${mods}</div>` : ''}
    <input class="input" id="dmNote" maxlength="200" data-i18n-ph="dish.note_placeholder">
    <div class="dishmodal__foot">
      <div class="stepper">
        <button class="stepper__btn" data-qty="-1" aria-label="-">−</button>
        <span class="stepper__val" id="dmQty">1</span>
        <button class="stepper__btn" data-qty="1" aria-label="+">+</button>
      </div>
      <span class="dishmodal__price" id="dmPrice">${fmtMoney(d.price)}</span>
    </div>
    <button class="btn btn--primary btn--block" id="dmAdd"
            ${d.is_available ? '' : 'disabled'}>🛒 ${t('dish.add_to_cart')}</button>
  </div>`;
}

function dishLinePrice() {
  const d = DISH_STATE.dish;
  const delta = (d.modifiers || [])
    .filter(m => DISH_STATE.mods.has(m.id))
    .reduce((s, m) => s + Number(m.price_delta || 0), 0);
  return (Number(d.price) + delta) * DISH_STATE.qty;
}

function bindDishModal(root) {
  applyI18n(root);

  root.addEventListener('change', e => {
    const m = e.target.closest('[data-mod]');
    if (!m) return;
    const id = Number(m.dataset.mod);
    if (m.checked) DISH_STATE.mods.add(id); else DISH_STATE.mods.delete(id);
    root.querySelector('#dmPrice').textContent = fmtMoney(dishLinePrice());
  });

  root.addEventListener('click', e => {
    const q = e.target.closest('[data-qty]');
    if (q) {
      // ⚡ miqdor DOIM butun son
      DISH_STATE.qty = Math.max(1, Math.min(99,
        Math.ceil(DISH_STATE.qty + Number(q.dataset.qty))));
      root.querySelector('#dmQty').textContent = DISH_STATE.qty;
      root.querySelector('#dmPrice').textContent = fmtMoney(dishLinePrice());
      return;
    }
    if (e.target.closest('#dmAR')) { openAR(DISH_STATE.dish.id); return; }
    if (e.target.closest('#dmAdd')) {
      DISH_STATE.note = (root.querySelector('#dmNote').value || '').slice(0, 200);
      addToCart({
        dish_id: DISH_STATE.dish.id,
        qty: Math.ceil(DISH_STATE.qty),
        modifiers: [...DISH_STATE.mods],
        note: DISH_STATE.note
      });
      closeSheet();
    }
  });
}

/** Ro'yxatdagi "+ Savat" — modifikatorsiz, 1 dona */
function quickAdd(dishId) {
  const d = getDish(dishId);
  if (!d || !d.is_available) { toast(t('errors.dish_unavailable'), 'error'); return; }
  addToCart({ dish_id: d.id, qty: 1, modifiers: [], note: '' });
}
```

---

## V-078 — Savat (localStorage)

**Fayl:** `static/guest/js/cart.js`
```javascript
/* Savat — localStorage'da, sessiyaga bog'langan */
let cart = [];

function cartKey() { return `cart_${window.ARMENU.slug}_${window.ARMENU.sessionId}`; }

function saveCart() {
  try { localStorage.setItem(cartKey(), JSON.stringify(cart)); } catch (e) {}
  updateCartBar();
}

function restoreCart() {
  try {
    const raw = localStorage.getItem(cartKey());
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) { cart = []; }
  // ⚡ menyudan yo'qolgan yoki tugagan taomlarni tozalaymiz
  cart = cart.filter(i => {
    const d = getDish(i.dish_id);
    return d && d.is_available;
  }).map(i => ({ ...i, qty: Math.max(1, Math.ceil(i.qty)) }));
  saveCart();
}

function sameLine(a, b) {
  return a.dish_id === b.dish_id
    && a.note === b.note
    && JSON.stringify([...a.modifiers].sort()) === JSON.stringify([...b.modifiers].sort());
}

function addToCart(item) {
  item.qty = Math.max(1, Math.min(99, Math.ceil(item.qty || 1)));
  const found = cart.find(i => sameLine(i, item));
  if (found) found.qty = Math.min(99, Math.ceil(found.qty + item.qty));
  else cart.push(item);
  saveCart();
  toast(t('dish.added'), 'success');
  checkUpsell(getDish(item.dish_id));
}

function updateQty(idx, delta) {
  const i = cart[idx];
  if (!i) return;
  const q = Math.ceil(i.qty + delta);
  if (q <= 0) { removeItem(idx); return; }
  i.qty = Math.min(99, q);
  saveCart();
  renderCart();
}

function removeItem(idx) {
  if (!confirm(t('cart.remove_confirm'))) return;
  cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function clearCart() { cart = []; saveCart(); }

function lineTotal(i) {
  const d = getDish(i.dish_id);
  if (!d) return 0;
  const delta = (d.modifiers || [])
    .filter(m => i.modifiers.includes(m.id))
    .reduce((s, m) => s + Number(m.price_delta || 0), 0);
  return (Number(d.price) + delta) * Math.ceil(i.qty);
}

function cartTotals() {
  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const pct = Number(window.ARMENU.serviceFeePct || 0);
  const fee = Math.round(subtotal * pct / 100);
  return { subtotal, fee, pct, total: subtotal + fee,
           count: cart.reduce((s, i) => s + Math.ceil(i.qty), 0) };
}

function updateCartBar() {
  const { count, total } = cartTotals();
  const btn = document.getElementById('btnCart');
  if (!btn) return;
  btn.hidden = count === 0;
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = fmtMoney(total);
}
```

---

## V-079 — ⚡ Upsell mantiq

**Fayl:** `static/guest/js/upsell.js`
```javascript
/* Savatga qo'shilgandan keyin — qo'shimcha taklif (A-02 da sozlanadi) */
const shownUpsells = new Set();

function checkUpsell(addedDish) {
  if (!addedDish) return;
  const rules = MENU_DATA.upsell_rules || [];

  const rule = rules.find(r =>
    (r.trigger_dish_ids || []).includes(addedDish.id)
    && !shownUpsells.has(r.id)
    && !cart.some(i => i.dish_id === r.suggest_dish_id));
  if (!rule) return;

  const suggest = getDish(rule.suggest_dish_id);
  if (!suggest || !suggest.is_available) return;

  shownUpsells.add(rule.id);
  trackUpsell(rule.id, 'shown');

  showUpsellToast({
    text: rule[`text_${window.ARMENU.lang}`] || rule.text_uz || t('cart.cross_sell'),
    dish: suggest,
    onAccept: () => {
      addToCart({ dish_id: suggest.id, qty: 1, modifiers: [], note: '' });
      trackUpsell(rule.id, 'accepted');
    },
    onDismiss: () => trackUpsell(rule.id, 'dismissed')
  });
}

function showUpsellToast({ text, dish, onAccept, onDismiss }) {
  const el = document.createElement('div');
  el.className = 'toast toast--upsell';
  el.innerHTML = `
    <img class="toast__img" src="${dish.image || ''}" alt="" width="44" height="44">
    <div class="toast__body">
      <div class="toast__text">${esc(text)}</div>
      <div class="toast__sub">${esc(dish.name)} · ${fmtMoney(dish.price)}</div>
    </div>
    <button class="btn btn--sm btn--primary" data-act="ok">+</button>
    <button class="icon-btn" data-act="no" aria-label="${t('common.close')}">✕</button>`;

  el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'ok') onAccept(); else onDismiss();
    el.remove();
  });

  document.getElementById('toastRoot').appendChild(el);
  setTimeout(() => { if (el.isConnected) { onDismiss(); el.remove(); } }, 9000);
}

function trackUpsell(ruleId, action) {
  fetch('/v1/analytics/upsell/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule_id: ruleId, action,
                           session_id: window.ARMENU.sessionId })
  }).catch(() => {});
}
```

---

## V-080 — Savat sahifasi (M-06) + buyurtma yuborish

**Fayl:** `static/guest/js/cart_view.js`
```javascript
/* M-06 — savat ekrani */
function openCart() {
  openSheet('<div id="cartBox"></div>', root => {
    renderCart();
    root.addEventListener('click', onCartClick);
  });
}

function renderCart() {
  const box = document.getElementById('cartBox');
  if (!box) return;

  if (!cart.length) {
    box.innerHTML = `<div class="empty">
      <div class="empty__icon">🛒</div>
      <div>${t('cart.empty')}</div>
      <div class="empty__hint">${t('cart.empty_hint')}</div></div>`;
    return;
  }

  const { subtotal, fee, pct, total } = cartTotals();

  const rows = cart.map((i, idx) => {
    const d = getDish(i.dish_id);
    const modNames = (d.modifiers || [])
      .filter(m => i.modifiers.includes(m.id))
      .map(m => '+ ' + esc(m.name)).join('<br>');
    return `
    <div class="cartrow">
      <img class="cartrow__img" src="${d.image || ''}" alt="" width="56" height="56">
      <div class="cartrow__body">
        <div class="cartrow__name">${esc(d.name)}</div>
        ${modNames ? `<div class="cartrow__mods">${modNames}</div>` : ''}
        ${i.note ? `<div class="cartrow__note">"${esc(i.note)}"</div>` : ''}
        <div class="stepper stepper--sm">
          <button class="stepper__btn" data-cq="${idx}" data-d="-1">−</button>
          <span class="stepper__val">${Math.ceil(i.qty)}</span>
          <button class="stepper__btn" data-cq="${idx}" data-d="1">+</button>
        </div>
      </div>
      <div class="cartrow__right">
        <div class="cartrow__price">${fmtMoney(lineTotal(i))}</div>
        <button class="icon-btn" data-crm="${idx}" aria-label="${t('common.delete')}">🗑</button>
      </div>
    </div>`;
  }).join('');

  const cross = crossSellHTML();

  box.innerHTML = `
    <h2>${t('cart.title')}</h2>
    <div class="cartlist">${rows}</div>
    ${cross}
    <div class="totals">
      <div class="totals__row"><span>${t('cart.subtotal')}</span><b>${fmtMoney(subtotal)}</b></div>
      ${pct ? `<div class="totals__row"><span>${t('cart.service_fee', { pct })}</span>
               <b>${fmtMoney(fee)}</b></div>` : ''}
      <div class="totals__row totals__row--big"><span>${t('cart.total')}</span>
        <b>${fmtMoney(total)}</b></div>
    </div>
    <input class="input" id="cartNote" maxlength="500" data-i18n-ph="cart.note_placeholder">
    <button class="btn btn--primary btn--block" id="btnSubmit">✅ ${t('cart.submit')}</button>`;
  applyI18n(box);
}

function crossSellHTML() {
  const ids = new Set(cart.map(i => i.dish_id));
  const picks = MENU_DATA.dishes
    .filter(d => d.is_available && d.is_cross_sell && !ids.has(d.id)).slice(0, 4);
  if (!picks.length) return '';
  return `<div class="crosssell"><div class="crosssell__title">💡 ${t('cart.cross_sell')}</div>
    <div class="crosssell__row">${picks.map(d =>
      `<button class="chip" data-add="${d.id}">${esc(d.name)} ${fmtMoney(d.price)}</button>`
    ).join('')}</div></div>`;
}

function onCartClick(e) {
  const q = e.target.closest('[data-cq]');
  if (q) { updateQty(Number(q.dataset.cq), Number(q.dataset.d)); return; }
  const rm = e.target.closest('[data-crm]');
  if (rm) { removeItem(Number(rm.dataset.crm)); return; }
  const add = e.target.closest('[data-add]');
  if (add) { quickAdd(Number(add.dataset.add)); renderCart(); return; }
  if (e.target.closest('#btnSubmit')) submitOrder();
}

/* --- Buyurtma yuborish --- */

let submitting = false;

async function submitOrder() {
  if (submitting) return;
  if (!cart.length) { toast(t('cart.empty'), 'error'); return; }

  const btn = document.getElementById('btnSubmit');
  submitting = true;
  btn.disabled = true;
  btn.textContent = t('cart.sending');

  const idemKey = (crypto.randomUUID && crypto.randomUUID())
    || (Date.now() + '-' + Math.random().toString(16).slice(2));

  const payload = {
    session_id: window.ARMENU.sessionId,
    table_id: window.ARMENU.tableId,
    note: (document.getElementById('cartNote')?.value || '').slice(0, 500),
    items: cart.map(i => ({
      dish_id: i.dish_id,
      qty: Math.ceil(i.qty),              // ⚡ butun son
      modifiers: i.modifiers,
      note: (i.note || '').slice(0, 200),
      ar_viewed: !!i.ar_viewed
    }))
  };

  try {
    const r = await fetch('/v1/orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idemKey },
      body: JSON.stringify(payload)
    });
    const data = await r.json();

    if (!r.ok) {
      const code = data.error?.code;
      if (code === 'DISH_UNAVAILABLE') {
        const id = data.error.details?.dish_id;
        cart = cart.filter(i => i.dish_id !== id);
        saveCart(); renderCart();
        toast(data.error.message || t('errors.dish_unavailable'), 'error');
      } else if (code === 'PRICE_CHANGED') {
        await reloadMenuContent(window.ARMENU.lang);
        renderCart();
        toast(t('errors.price_changed'), 'error');
      } else {
        toast(data.error?.message || t('errors.server'), 'error');
      }
      return;
    }

    clearCart();
    closeSheet();
    toast(t('order.created'), 'success');
    location.href = `/o/${data.id}/?s=${window.ARMENU.sessionId}`;

  } catch (e) {
    toast(t('errors.network'), 'error');
    queueOffline('/v1/orders/', payload, idemKey);      // V-085
  } finally {
    submitting = false;
    if (btn.isConnected) { btn.disabled = false; btn.textContent = '✅ ' + t('cart.submit'); }
  }
}
```

---

## V-081 — ⚡ Dark + Light tema (CSS o'zgaruvchilar)

**Fayl:** `static/guest/css/theme.css`
```css
/* ARMENU — yagona rang tizimi. Hard-code rang YOZILMAYDI. */
:root {
  /* Brend (restoran o'zgartirishi mumkin) */
  --brand:        #E85D2A;
  --brand-hover:  #D14E1F;
  --brand-light:  #FFF0EA;
  --on-brand:     #FFFFFF;

  /* Neytral — LIGHT */
  --bg:           #FFFFFF;
  --bg-soft:      #F7F7F8;
  --bg-card:      #FFFFFF;
  --border:       #E5E5E8;
  --text:         #1A1A1F;
  --text-soft:    #6B6B76;
  --text-muted:   #9B9BA6;
  --overlay:      rgba(0, 0, 0, .45);

  /* Semantik */
  --success: #16A34A;
  --warning: #F59E0B;
  --danger:  #DC2626;
  --info:    #2563EB;

  /* Stol holati */
  --st-free: #16A34A; --st-occupied: #2563EB; --st-waiting: #F59E0B;
  --st-ready: #DC2626; --st-bill: #9333EA;

  /* O'lchamlar */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-8: 48px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.12);

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --fs-xs: 12px; --fs-sm: 14px; --fs-base: 16px; --fs-lg: 18px;
  --fs-xl: 20px; --fs-2xl: 24px; --fs-3xl: 32px;
}

/* DARK — tizim sozlamasi (foydalanuvchi light tanlamagan bo'lsa) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg:        #0F0F13;
    --bg-soft:   #17171D;
    --bg-card:   #1C1C24;
    --border:    #2A2A35;
    --text:      #F0F0F5;
    --text-soft: #A0A0B0;
    --text-muted:#6B6B7B;
    --brand-light: #2A1810;
    --overlay:   rgba(0, 0, 0, .65);
    --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,.4);
    --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
  }
}

/* DARK — qo'lda tanlangan (tizimdan ustun) */
:root[data-theme="dark"] {
  --bg:        #0F0F13;
  --bg-soft:   #17171D;
  --bg-card:   #1C1C24;
  --border:    #2A2A35;
  --text:      #F0F0F5;
  --text-soft: #A0A0B0;
  --text-muted:#6B6B7B;
  --brand-light: #2A1810;
  --overlay:   rgba(0, 0, 0, .65);
  --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,.4);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-base);
  background: var(--bg);
  color: var(--text);
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

/* --- Tugmalar (min 44×44 tegish maydoni) --- */
.btn {
  min-height: 44px; padding: 0 var(--sp-4);
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  border: 1px solid transparent; border-radius: var(--r-md);
  font: inherit; font-weight: 600; cursor: pointer;
  transition: transform .1s, background .15s;
}
.btn:active { transform: scale(.97); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--primary { background: var(--brand); color: var(--on-brand); }
.btn--primary:hover { background: var(--brand-hover); }
.btn--ghost { background: var(--bg-soft); color: var(--text); border-color: var(--border); }
.btn--danger { background: var(--danger); color: var(--on-brand); }
.btn--block { width: 100%; }
.btn--sm { min-height: 36px; font-size: var(--fs-sm); padding: 0 var(--sp-3); }
.btn--ar {
  position: absolute; right: var(--sp-3); bottom: var(--sp-3);
  background: var(--brand); color: var(--on-brand); box-shadow: var(--shadow-md);
}

.icon-btn {
  min-width: 44px; min-height: 44px; display: inline-grid; place-items: center;
  background: transparent; border: 0; color: var(--text);
  font-size: var(--fs-lg); cursor: pointer; border-radius: var(--r-md);
}
.icon-btn:focus-visible, .btn:focus-visible {
  outline: 2px solid var(--brand); outline-offset: 2px;
}

.input {
  width: 100%; min-height: 44px; padding: 0 var(--sp-3);
  background: var(--bg-soft); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--r-md);
  font: inherit;
}
.input::placeholder { color: var(--text-muted); }

/* --- Chip / badge --- */
.chip {
  min-height: 36px; padding: 0 var(--sp-3);
  background: var(--bg-soft); color: var(--text-soft);
  border: 1px solid var(--border); border-radius: 999px;
  font-size: var(--fs-sm); cursor: pointer;
}
.chip.is-on { background: var(--brand-light); color: var(--brand); border-color: var(--brand); }
.badge {
  padding: 2px var(--sp-2); border-radius: var(--r-sm);
  font-size: var(--fs-xs); font-weight: 700;
}
.badge--hit { background: var(--warning); color: var(--on-brand); }
.badge--new { background: var(--info);    color: var(--on-brand); }
.badge--out { background: var(--bg-soft); color: var(--text-muted); }

/* --- Skeleton --- */
.skeleton-grid > * , .skel {
  background: linear-gradient(90deg, var(--bg-soft) 25%, var(--border) 37%, var(--bg-soft) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: var(--r-md);
}
@keyframes shimmer { 0% { background-position: 100% 0 } 100% { background-position: 0 0 } }

/* --- Toast --- */
.toasts {
  position: fixed; left: var(--sp-4); right: var(--sp-4);
  bottom: calc(84px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: var(--sp-2); z-index: 90;
}
.toast {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3); border-radius: var(--r-md);
  background: var(--bg-card); color: var(--text);
  border: 1px solid var(--border); box-shadow: var(--shadow-lg);
  animation: slideUp .25s ease;
}
.toast--success { border-left: 4px solid var(--success); }
.toast--error   { border-left: 4px solid var(--danger); }
.toast--info    { border-left: 4px solid var(--info); }
.toast__img  { border-radius: var(--r-sm); object-fit: cover; }
.toast__body { flex: 1; min-width: 0; }
.toast__sub  { font-size: var(--fs-sm); color: var(--text-soft); }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0 } }

/* --- Bottom sheet --- */
.sheet-backdrop {
  position: fixed; inset: 0; background: var(--overlay); z-index: 100;
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; max-height: 92dvh; overflow-y: auto;
  background: var(--bg-card); color: var(--text);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  padding: var(--sp-5) var(--sp-4) calc(var(--sp-5) + env(safe-area-inset-bottom));
  animation: sheetIn .25s ease;
}
@keyframes sheetIn { from { transform: translateY(100%) } }

@media (min-width: 768px) {
  .sheet-backdrop { align-items: center; justify-content: center; }
  .sheet { max-width: 560px; border-radius: var(--r-xl); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

**Fayl:** `static/guest/js/theme.js`
```javascript
/* Tema: auto (tizim) → light → dark */
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('armenu_theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
  syncThemeIcon();
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('armenu_theme', next); } catch (e) {}
  syncThemeIcon();
}

function syncThemeIcon() {
  const btn = document.getElementById('btnTheme');
  if (!btn) return;
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  btn.textContent = dark ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0F0F13' : '#E85D2A';
}
```

✅ **Tekshirish:** brauzerda tema tugmasini bosing — barcha ranglar almashadi,
sahifa yangilangandan keyin ham saqlanadi.

---

## V-082 — PWA manifest + service worker

**Fayl:** `apps/guest/views.py` (davomi)
```python
from django.http import JsonResponse


@require_GET
def pwa_manifest(request, slug):
    """Har restoran uchun o'z nomi/rangi bilan manifest."""
    r = get_object_or_404(Restaurant, slug=slug, is_active=True)
    icon = r.logo.url if r.logo else '/static/guest/img/icon-512.png'
    return JsonResponse({
        'name': f'{r.name} — ARMENU',
        'short_name': r.name[:12],
        'start_url': f'/m/{r.slug}/',
        'scope': f'/m/{r.slug}/',
        'display': 'standalone',
        'orientation': 'portrait',
        'background_color': '#FFFFFF',
        'theme_color': getattr(r, 'brand_color', '') or '#E85D2A',
        'lang': detect_lang(request, r),
        'icons': [
            {'src': icon, 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
            {'src': icon, 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    })
```

`config/urls.py`:
```python
from apps.guest.views import pwa_manifest

urlpatterns += [
    path('m/<slug:slug>/manifest.json', pwa_manifest, name='pwa-manifest'),
    path('sw.js', TemplateView.as_view(
        template_name='guest/sw.js', content_type='application/javascript'),
        name='service-worker'),
]
```

**Fayl:** `templates/guest/sw.js`
```javascript
/* ARMENU service worker — offline qobiq + rasm keshi */
const VERSION = 'v1';
const SHELL = `armenu-shell-${VERSION}`;
const IMGS  = `armenu-img-${VERSION}`;
const API   = `armenu-api-${VERSION}`;

const SHELL_FILES = [
  '/static/guest/css/theme.css',
  '/static/guest/css/menu.css',
  '/static/guest/js/i18n.js',
  '/static/guest/js/toast.js',
  '/static/guest/js/theme.js',
  '/static/guest/js/cart.js',
  '/static/guest/js/ws.js',
  '/static/guest/js/menu.js',
  '/static/i18n/uz.json',
  '/static/i18n/ru.json',
  '/static/i18n/en.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Rasmlar — cache-first
  if (req.destination === 'image') {
    e.respondWith(caches.open(IMGS).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response('', { status: 504 });
      }
    }));
    return;
  }

  // Menyu API — network-first, offline'da keshdan
  if (url.pathname.startsWith('/v1/menu/')) {
    e.respondWith((async () => {
      const cache = await caches.open(API);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  // Statik qobiq — cache-first
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
```

**Ro'yxatdan o'tkazish** — `static/guest/js/menu.js` oxiriga:
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[sw]', e));
  });
}
```

✅ **Tekshirish:** Chrome DevTools → Application → Service Workers → "activated and running"

---

## V-083 — Lazy image (IntersectionObserver)

**Fayl:** `static/guest/js/lazy.js`
```javascript
/* Rasmlar faqat ko'rinishga kirganda yuklanadi */
let imgObserver = null;

function initLazyImages() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('img[data-src]').forEach(loadImg);
    return;
  }
  if (!imgObserver) {
    imgObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        loadImg(en.target);
        imgObserver.unobserve(en.target);
      });
    }, { rootMargin: '300px 0px' });
  }
  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

function loadImg(img) {
  const src = img.dataset.src;
  if (!src) { img.classList.add('is-loaded'); return; }
  img.src = src;
  img.removeAttribute('data-src');
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => {
    img.classList.add('is-error');
    img.src = '/static/guest/img/dish-placeholder.svg';
  }, { once: true });
}

/** Ko'rinadigan taomlarning AR posterlarini oldindan yuklash */
function prefetchARPosters() {
  const cards = [...document.querySelectorAll('[data-ar]')].slice(0, 6);
  cards.forEach(c => {
    const d = getDish(Number(c.dataset.ar));
    if (!d || !d.ar_poster) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = d.ar_poster;
    document.head.appendChild(link);
  });
}
```

`menu.html` ga qo'shiladi:
```html
<script src="{% static 'guest/js/lazy.js' %}?v={{ static_version }}"></script>
```

CSS (`menu.css`):
```css
.dish__img { opacity: 0; transition: opacity .25s; background: var(--bg-soft);
             object-fit: cover; border-radius: var(--r-md); }
.dish__img.is-loaded { opacity: 1; }
```

---

## V-084 — Offline rejim (navbat + qayta yuborish)

**Fayl:** `static/guest/js/offline.js`
```javascript
/* Internet yo'qligida so'rovlar navbatga tushadi va ulanish tiklanganda yuboriladi */
const OFFLINE_KEY = 'armenu_offline_queue';

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveQueue(q) {
  try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(q.slice(-20))); } catch (e) {}
}

function queueOffline(url, body, idemKey) {
  const q = loadQueue();
  q.push({ url, body, idemKey, ts: Date.now() });
  saveQueue(q);
  showOfflineBar(true);
}

async function flushQueue() {
  const q = loadQueue();
  if (!q.length) return;
  const rest = [];
  for (const item of q) {
    // 1 soatdan eski so'rovlar tashlanadi
    if (Date.now() - item.ts > 3600 * 1000) continue;
    try {
      const r = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': item.idemKey },
        body: JSON.stringify(item.body)
      });
      if (!r.ok && r.status >= 500) rest.push(item);   // server xatosi → qayta urinamiz
    } catch (e) {
      rest.push(item);
    }
  }
  saveQueue(rest);
  if (!rest.length) {
    showOfflineBar(false);
    toast(t('order.created'), 'success');
  }
}

function showOfflineBar(on) {
  let bar = document.getElementById('offlineBar');
  if (on && !bar) {
    bar = document.createElement('div');
    bar.id = 'offlineBar';
    bar.className = 'offlinebar';
    bar.textContent = t('errors.network');
    document.body.prepend(bar);
  } else if (!on && bar) {
    bar.remove();
  }
}

window.addEventListener('online',  () => { showOfflineBar(false); flushQueue(); });
window.addEventListener('offline', () => showOfflineBar(true));
document.addEventListener('DOMContentLoaded', () => {
  if (!navigator.onLine) showOfflineBar(true); else flushQueue();
});
```

CSS (`menu.css`):
```css
.offlinebar {
  position: sticky; top: 0; z-index: 80;
  padding: var(--sp-2) var(--sp-4);
  background: var(--warning); color: var(--on-brand);
  font-size: var(--fs-sm); text-align: center;
}
```

---

## V-085 — Chaqiruv UI (M-09)

**Fayl:** `static/guest/js/call.js`
```javascript
/* M-09 — ofitsiant chaqirish */
const CALL_TYPES = [
  { type: 'waiter', icon: '🧑‍🍳', key: 'call.waiter' },
  { type: 'bill',   icon: '💳',  key: 'call.bill' },
  { type: 'water',  icon: '💧',  key: 'call.water' },
  { type: 'clean',  icon: '🧹',  key: 'call.clean' },
];

function openCallMenu() {
  const grid = CALL_TYPES.map(c => `
    <button class="callbtn" data-call="${c.type}">
      <span class="callbtn__icon">${c.icon}</span>
      <span>${t(c.key)}</span>
    </button>`).join('');

  openSheet(`<h2>${t('call.title')}</h2><div class="callgrid">${grid}</div>`, root => {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-call]');
      if (b) sendCall(b.dataset.call, b);
    });
  });
}

async function sendCall(type, btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('/v1/calls/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: window.ARMENU.tableId,
        session_id: window.ARMENU.sessionId,
        type
      })
    });
    const data = await r.json();

    if (r.status === 429) { toast(t('call.cooldown'), 'info'); return; }
    if (!r.ok) { toast(data.error?.message || t('errors.server'), 'error'); return; }

    closeSheet();
    toast(t('call.sent'), 'success');
    if (navigator.vibrate) navigator.vibrate(60);
  } catch (e) {
    toast(t('errors.network'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
```

CSS (`menu.css`):
```css
.callgrid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.callbtn {
  min-height: 96px; display: grid; place-items: center; gap: var(--sp-2);
  background: var(--bg-soft); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--r-lg);
  font: inherit; cursor: pointer;
}
.callbtn:active { transform: scale(.97); }
.callbtn__icon { font-size: var(--fs-3xl); }
```

---

## V-086 — `POST /v1/calls/` + cooldown 60s

**Fayl:** `apps/guest/models.py` (davomi)
```python
class Call(TimestampedModel):
    """Mijoz chaqiruvi (ofitsiant/hisob/suv/tozalash)."""
    TYPES = [('waiter', 'Ofitsiant'), ('bill', 'Hisob'),
             ('water', 'Suv'), ('clean', 'Tozalash')]
    STATUS = [('new', 'Yangi'), ('resolved', 'Bajarildi'), ('cancelled', 'Bekor')]

    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)
    table   = models.ForeignKey('tables.Table', null=True, on_delete=models.SET_NULL)
    guest   = models.ForeignKey(Guest, null=True, on_delete=models.SET_NULL)
    session = models.ForeignKey(GuestSession, null=True, on_delete=models.SET_NULL)

    type   = models.CharField(max_length=20, choices=TYPES)
    status = models.CharField(max_length=20, choices=STATUS, default='new', db_index=True)

    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        'accounts.Staff', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        indexes = [models.Index(fields=['restaurant', 'status', 'created_at'])]
```

```bash
python manage.py makemigrations guest && python manage.py migrate
```

**Fayl:** `apps/guest/api.py`
```python
import logging
from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.guest.models import Call, GuestSession
from apps.tables.models import Table
from apps.guest.lang import detect_lang, set_lang_cookie, SUPPORTED
from core.ws import ws_send, g_waiters, g_admin

log = logging.getLogger('guest.api')

CALL_COOLDOWN = 60      # ⚡ bir stol 60 soniyada bir marta


@api_view(['POST'])
@permission_classes([AllowAny])
def create_call(request):
    """POST /v1/calls/ {table_id, session_id, type}"""
    ctype = request.data.get('type')
    if ctype not in dict(Call.TYPES):
        return Response({'error': {'code': 'VALIDATION_ERROR',
                                   'message_uz': "Noma'lum chaqiruv turi"}}, status=400)

    session = GuestSession.objects.select_related('table', 'guest').filter(
        public_id=request.data.get('session_id'), ended_at__isnull=True).first()
    if not session:
        return Response({'error': {'code': 'QR_INVALID',
                                   'message_uz': 'Sessiya topilmadi'}}, status=404)

    table = session.table or Table.objects.filter(
        id=request.data.get('table_id'), restaurant_id=session.restaurant_id).first()
    if not table:
        return Response({'error': {'code': 'VALIDATION_ERROR',
                                   'message_uz': 'Stol topilmadi'}}, status=400)

    # ⚡ Cooldown — Redis (stol + tur bo'yicha)
    key = f'call:cd:{table.id}:{ctype}'
    if not cache.add(key, 1, CALL_COOLDOWN):
        ttl = cache.ttl(key) if hasattr(cache, 'ttl') else CALL_COOLDOWN
        return Response({'error': {
            'code': 'RATE_LIMITED',
            'message_uz': 'Iltimos, biroz kuting',
            'message_ru': 'Пожалуйста, подождите',
            'message_en': 'Please wait a moment',
            'details': {'retry_after': ttl},
        }}, status=429)

    call = Call.objects.create(
        restaurant_id=session.restaurant_id, table=table,
        guest=session.guest, session=session, type=ctype)

    payload = {'call_id': call.id, 'table_id': table.id, 'table_number': table.number,
               'call_type': ctype, 'created_at': call.created_at.isoformat()}
    ws_send(g_waiters(session.restaurant_id), 'call.new', payload)
    ws_send(g_admin(session.restaurant_id), 'call.new', payload)

    from core.queue import enqueue
    enqueue('notify', 'waiter_call', call_id=call.id)

    log.info(f'[call] #{call.id} {ctype} · stol {table.number}')
    return Response({'id': call.id, 'type': ctype, 'status': 'new',
                     'cooldown': CALL_COOLDOWN}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def set_lang(request):
    """POST /v1/lang/ {lang, session_id}"""
    lang = request.data.get('lang')
    if lang not in SUPPORTED:
        return Response({'error': {'code': 'VALIDATION_ERROR',
                                   'message_uz': "Til qo'llab-quvvatlanmaydi"}}, status=400)
    sid = request.data.get('session_id')
    if sid:
        GuestSession.objects.filter(public_id=sid).update(lang=lang)
    resp = Response({'lang': lang})
    return set_lang_cookie(resp, lang)
```

**Fayl:** `apps/guest/urls.py`
```python
from django.urls import path
from apps.guest import api

urlpatterns = [
    path('calls/', api.create_call, name='guest-call'),
    path('lang/', api.set_lang, name='guest-lang'),
]
```

`config/urls.py`:
```python
    path('v1/', include('apps.guest.urls')),
```

✅ **Tekshirish:**
```bash
SID=<sessiya public_id>
curl -X POST -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SID\",\"type\":\"water\"}" http://localhost:8060/v1/calls/
# 201 {"id":1,"type":"water","cooldown":60}

# darhol qayta:
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SID\",\"type\":\"water\"}" http://localhost:8060/v1/calls/
# 429
```

---

## V-087 — Buyurtma holati sahifasi (M-08)

**Fayl:** `apps/guest/views.py` (davomi)
```python
@require_GET
def order_status_page(request, order_id):
    """M-08 — buyurtma holati (real-time WS bilan)."""
    from apps.orders.models import Order
    order = get_object_or_404(
        Order.objects.select_related('restaurant', 'table'), id=order_id)
    lang = detect_lang(request, order.restaurant)
    return render(request, 'guest/order_status.html', {
        'order': order,
        'restaurant': order.restaurant,
        'session_id': request.GET.get('s', ''),
        'lang': lang,
        'static_version': 1,
        'i18n_version': 1,
    })
```

`config/urls.py`:
```python
    path('o/<int:order_id>/', order_status_page, name='order-status'),
```

**Fayl:** `templates/guest/order_status.html`
```html
{% load static %}<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#E85D2A">
  <title>{{ restaurant.name }}</title>
  <link rel="stylesheet" href="{% static 'guest/css/theme.css' %}?v={{ static_version }}">
  <link rel="stylesheet" href="{% static 'guest/css/menu.css' %}?v={{ static_version }}">
</head>
<body>
<header class="hdr">
  <div>
    <div class="hdr__name" id="ordNumber"></div>
    <div class="hdr__table" id="ordTable"></div>
  </div>
  <button class="icon-btn" id="btnTheme" aria-label="Theme">🌙</button>
</header>

<main class="statuspage">
  <ol class="steps" id="steps"></ol>
  <div class="eta" id="eta"></div>
  <div class="orderitems" id="orderItems"></div>
  <div class="totals">
    <div class="totals__row totals__row--big">
      <span data-i18n="cart.total"></span><b id="ordTotal"></b>
    </div>
  </div>
  <div class="statuspage__actions">
    <a class="btn btn--ghost" href="/m/{{ restaurant.slug }}/?s={{ session_id }}">
      ➕ <span data-i18n="order.add_more"></span></a>
    <button class="btn btn--ghost" id="btnCall">🔔 <span data-i18n="call.title"></span></button>
    <button class="btn btn--primary" id="btnBill">💳 <span data-i18n="order.request_bill"></span></button>
  </div>
</main>

<div id="modalRoot"></div>
<div id="toastRoot" class="toasts" aria-live="polite"></div>

<script>
  window.ARMENU = {
    slug: "{{ restaurant.slug }}",
    orderId: {{ order.id }},
    tableId: {{ order.table_id|default:"null" }},
    sessionId: "{{ session_id }}",
    lang: "{{ lang }}",
    i18nVersion: {{ i18n_version }},
    wsUrl: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host
           + "/ws/guest/{{ session_id }}/"
  };
</script>
<script src="{% static 'guest/js/i18n.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/toast.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/theme.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/ws.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/call.js' %}?v={{ static_version }}"></script>
<script src="{% static 'guest/js/order_status.js' %}?v={{ static_version }}"></script>
</body>
</html>
```

**Fayl:** `static/guest/js/order_status.js`
```javascript
/* M-08 — real-time buyurtma holati */
const STEPS = ['new', 'cooking', 'ready', 'served'];
let ORDER = null;

async function initStatus() {
  await loadI18n(window.ARMENU.lang);
  applyI18n();
  initTheme();
  await loadOrder();
  connectWS();
  bindStatusUI();
}

async function loadOrder() {
  try {
    const r = await fetch(`/v1/orders/${window.ARMENU.orderId}/?lang=${window.ARMENU.lang}`);
    if (!r.ok) throw new Error(r.status);
    ORDER = await r.json();
    renderStatus();
  } catch (e) {
    toast(t('errors.network'), 'error');
  }
}

function renderStatus() {
  if (!ORDER) return;
  document.getElementById('ordNumber').textContent =
    t('order.number', { n: ORDER.number });
  document.getElementById('ordTable').textContent =
    ORDER.table_number ? t('order.table', { n: ORDER.table_number }) : '';

  const cur = Math.max(0, STEPS.indexOf(ORDER.status === 'accepted' ? 'new' : ORDER.status));
  document.getElementById('steps').innerHTML = STEPS.map((s, i) => `
    <li class="step ${i < cur ? 'is-done' : ''} ${i === cur ? 'is-now' : ''}">
      <span class="step__dot"></span>
      <span class="step__label">${t('order.status_' + s)}</span>
    </li>`).join('');

  updateETA(ORDER.eta_min);

  document.getElementById('orderItems').innerHTML = (ORDER.items || []).map(i => `
    <div class="orderitem">
      <span>${esc(i.name)} × ${Math.ceil(i.qty)}</span>
      <b>${fmtMoney(i.price * Math.ceil(i.qty))}</b>
    </div>`).join('');

  document.getElementById('ordTotal').textContent = fmtMoney(ORDER.total);
}

function updateETA(min) {
  const el = document.getElementById('eta');
  if (!el) return;
  if (ORDER && ['served', 'paid'].includes(ORDER.status)) { el.textContent = ''; return; }
  el.textContent = min > 0 ? `⏱ ${t('order.eta', { n: Math.ceil(min) })}` : '';
}

/* WS hodisalari (ws.js chaqiradi) */
function onWSMessage(msg) {
  switch (msg.type) {
    case 'order.status':
      if (msg.data.order_id !== window.ARMENU.orderId) break;
      ORDER.status = msg.data.status;
      ORDER.eta_min = msg.data.eta_min;
      renderStatus();
      if (msg.data.status === 'ready') {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        toast(t('order.ready_title'), 'success', 8000);
        playReadySound();
      }
      break;
    case 'order.item_unavailable':
      toast(t('order.unavailable', { dish: msg.data.dish_name }), 'error', 8000);
      break;
    case 'call.resolved':
      toast(t('call.resolved'), 'info');
      break;
    case 'bill.ready':
      location.href = `/bill/${window.ARMENU.sessionId}/`;
      break;
  }
}

function playReadySound() {
  try {
    const a = new Audio('/static/guest/snd/ready.mp3');
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) {}
}

function bindStatusUI() {
  document.getElementById('btnTheme').addEventListener('click', toggleTheme);
  document.getElementById('btnCall').addEventListener('click', openCallMenu);
  document.getElementById('btnBill').addEventListener('click', () => sendCall('bill'));
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g,
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', initStatus);
```

CSS (`menu.css`):
```css
.steps { display: flex; list-style: none; padding: 0; margin: var(--sp-5) 0; }
.step  { flex: 1; text-align: center; font-size: var(--fs-sm); color: var(--text-muted);
         position: relative; }
.step__dot { display: block; width: 14px; height: 14px; margin: 0 auto var(--sp-2);
             border-radius: 50%; background: var(--border); }
.step.is-done .step__dot { background: var(--success); }
.step.is-now  .step__dot { background: var(--brand); box-shadow: 0 0 0 5px var(--brand-light); }
.step.is-done, .step.is-now { color: var(--text); }
.step + .step::before { content: ''; position: absolute; left: -50%; top: 6px;
                        width: 100%; height: 2px; background: var(--border); }
.step.is-done::before, .step.is-now::before { background: var(--success); }
.eta { text-align: center; font-size: var(--fs-lg); color: var(--text-soft); }
.orderitem { display: flex; justify-content: space-between; padding: var(--sp-3) 0;
             border-bottom: 1px solid var(--border); }
```

---

## V-088 — ⚡ ReliableWS klient (reconnect + syncMissed + polling)

**Fayl:** `static/guest/js/ws.js`
```javascript
/**
 * ⚡ Ishonchli WebSocket klient.
 *  - eksponensial qayta ulanish (jitter bilan)
 *  - seq bo'yicha yo'qolgan xabarlarni aniqlash → syncMissed()
 *  - WS umuman ishlamasa → 15 soniyalik polling fallback
 *  - dublikat xabarlarni tashlab yuborish
 */
class ReliableWS {
  constructor(url, { onMessage, onState, syncMissed, poll } = {}) {
    this.url = url;
    this.onMessage = onMessage || (() => {});
    this.onState = onState || (() => {});
    this.syncMissed = syncMissed || (async () => {});
    this.poll = poll || (async () => {});

    this.ws = null;
    this.lastSeq = 0;
    this.seen = new Set();
    this.attempt = 0;
    this.maxDelay = 30000;
    this.closedByUser = false;
    this.pollTimer = null;
    this.pingTimer = null;
  }

  connect() {
    if (this.closedByUser) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt = 0;
      this.onState('online');
      this.stopPolling();
      this.startPing();
      if (this.lastSeq > 0) this.syncMissed(this.lastSeq);   // ⚡ yo'qolganini olamiz
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.type === 'pong') return;

      // dublikat
      const id = `${msg.type}:${msg.seq}`;
      if (msg.seq && this.seen.has(id)) return;
      if (msg.seq) {
        this.seen.add(id);
        if (this.seen.size > 300) this.seen = new Set([...this.seen].slice(-150));
        // ⚡ seq sakradi → oradagi xabarlar yo'qolgan
        if (this.lastSeq && msg.seq > this.lastSeq + 1) this.syncMissed(this.lastSeq);
        this.lastSeq = Math.max(this.lastSeq, msg.seq);
      }
      this.onMessage(msg);
    };

    this.ws.onclose = () => { this.stopPing(); this.onState('offline'); this.scheduleReconnect(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch (e) {} };
  }

  scheduleReconnect() {
    if (this.closedByUser) return;
    this.attempt += 1;
    const base = Math.min(this.maxDelay, 800 * Math.pow(2, this.attempt - 1));
    const delay = base * (0.7 + Math.random() * 0.6);      // jitter
    if (this.attempt >= 3) this.startPolling();            // ⛔ zaxira yo'l
    setTimeout(() => this.connect(), delay);
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopPing() { if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; } }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), 15000);
    this.poll();
  }

  stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  close() { this.closedByUser = true; this.stopPing(); this.stopPolling();
            if (this.ws) this.ws.close(); }
}

/* --- Sahifalar uchun yagona ulanish --- */
let GUEST_WS = null;

function connectWS() {
  if (!window.ARMENU.sessionId) return;

  GUEST_WS = new ReliableWS(window.ARMENU.wsUrl, {
    onMessage: (msg) => {
      if (typeof onWSMessage === 'function') onWSMessage(msg);
    },
    onState: (state) => {
      showOfflineBar(state === 'offline' && !navigator.onLine);
    },
    // ⚡ Yo'qolgan xabarlarni REST orqali qo'lga olamiz
    syncMissed: async (sinceSeq) => {
      try {
        const r = await fetch(
          `/v1/orders/session/${window.ARMENU.sessionId}/?since_seq=${sinceSeq}`);
        if (!r.ok) return;
        const { events } = await r.json();
        (events || []).forEach(ev => {
          if (typeof onWSMessage === 'function') onWSMessage(ev);
        });
      } catch (e) {}
    },
    // ⛔ WS umuman ishlamasa
    poll: async () => {
      if (!window.ARMENU.orderId) return;
      try {
        const r = await fetch(`/v1/orders/${window.ARMENU.orderId}/`);
        if (!r.ok) return;
        const o = await r.json();
        if (typeof onWSMessage === 'function') {
          onWSMessage({ type: 'order.status',
                        data: { order_id: o.id, status: o.status, eta_min: o.eta_min } });
        }
      } catch (e) {}
    }
  });
  GUEST_WS.connect();
}

window.addEventListener('pagehide', () => { if (GUEST_WS) GUEST_WS.close(); });
```

✅ **Tekshirish:**
```
DevTools → Network → Offline yoqing
→ "Ulanish yo'q" bari chiqadi, konsolda qayta ulanish urinishlari o'sib boradi
→ Online qiling → bar yo'qoladi, syncMissed chaqiriladi
```

---

## V-089 — Toast tizimi + bottom sheet

**Fayl:** `static/guest/js/toast.js`
```javascript
/* Bildirishnoma va bottom-sheet modal */
function toast(text, kind = 'info', ms = 3000) {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `<div class="toast__body"><div class="toast__text"></div></div>`;
  el.querySelector('.toast__text').textContent = text;
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

/* --- Bottom sheet --- */
let sheetEl = null;
let lastFocus = null;

function openSheet(html, onReady) {
  closeSheet();
  lastFocus = document.activeElement;

  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"></div>`;
  const sheet = back.querySelector('.sheet');
  sheet.innerHTML = html;

  back.addEventListener('click', e => { if (e.target === back) closeSheet(); });
  document.addEventListener('keydown', onSheetKey);

  document.getElementById('modalRoot').appendChild(back);
  document.body.style.overflow = 'hidden';
  sheetEl = back;
  sheet.focus();
  if (typeof onReady === 'function') onReady(sheet);
  applyI18n(sheet);
  return sheet;
}

function closeSheet() {
  if (!sheetEl) return;
  sheetEl.remove();
  sheetEl = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onSheetKey);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function onSheetKey(e) {
  if (e.key === 'Escape') closeSheet();
}
```

---

## V-090 — WS consumer (mijoz kanali)

**Fayl:** `apps/guest/consumers.py`
```python
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

log = logging.getLogger('guest.ws')


class GuestConsumer(AsyncWebsocketConsumer):
    """
    ⚡ Guruh nomi DOIM sessiyaga bog'langan: guest_<public_id>.
    Cross-tenant sizib chiqish bo'lmasligi uchun sessiya DB'da tekshiriladi.
    """

    async def connect(self):
        self.session_pid = self.scope['url_route']['kwargs']['session_id']
        ok = await self._session_exists(self.session_pid)
        if not ok:
            await self.close(code=4404)
            return
        self.group = f'guest_{self.session_pid}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except ValueError:
            return
        if data.get('type') == 'ping':
            await self.send(json.dumps({'type': 'pong'}))

    async def broadcast(self, event):
        await self.send(json.dumps(event['message']))

    @database_sync_to_async
    def _session_exists(self, pid):
        from apps.guest.models import GuestSession
        try:
            return GuestSession.objects.filter(public_id=pid, ended_at__isnull=True).exists()
        except (ValueError, TypeError):
            return False
```

**Fayl:** `config/asgi.py` marshrutiga:
```python
from django.urls import re_path
from apps.guest.consumers import GuestConsumer

websocket_urlpatterns += [
    re_path(r'^ws/guest/(?P<session_id>[0-9a-f-]{36})/$', GuestConsumer.as_asgi()),
]
```

✅ **Tekshirish:**
```bash
wscat -c "ws://localhost:8060/ws/guest/$SID/"
> {"type":"ping"}
< {"type":"pong"}
```

---

## V-091 — Testlar (mijoz oqimi)

**Fayl:** `tests/test_guest_flow.py`
```python
import uuid
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.tables.models import Hall, Table
from apps.guest.models import Guest, GuestSession, Call
from apps.guest.services import DEVICE_COOKIE, open_session, get_or_create_guest


@pytest.fixture
def hall(db, restaurant):
    return Hall.objects.create(restaurant=restaurant, name='Zal')


@pytest.fixture
def table(db, restaurant, hall):
    return Table.objects.create(hall=hall, restaurant=restaurant, number='5')


# --- M-01 QR kirish ---

def test_entry_redirects_to_menu(client, table, restaurant):
    r = client.get(f'/t/{table.qr_token}')
    assert r.status_code == 302
    assert f'/m/{restaurant.slug}/' in r.url
    assert 't=' in r.url and 's=' in r.url


def test_entry_sets_device_cookie_one_year(client, table):
    r = client.get(f'/t/{table.qr_token}')
    c = r.cookies.get(DEVICE_COOKIE)
    assert c is not None
    assert int(c['max-age']) == 365 * 24 * 3600
    assert c['httponly']


def test_entry_reuses_existing_device(client, table):
    r1 = client.get(f'/t/{table.qr_token}')
    token = r1.cookies[DEVICE_COOKIE].value
    client.cookies[DEVICE_COOKIE] = token
    client.get(f'/t/{table.qr_token}')
    assert Guest.objects.filter(device_token=token).count() == 1


def test_entry_creates_guest_and_session(client, table, restaurant):
    client.get(f'/t/{table.qr_token}')
    assert Guest.objects.filter(restaurant=restaurant).count() == 1
    s = GuestSession.objects.get(restaurant=restaurant)
    assert s.table_id == table.id and s.ended_at is None


def test_entry_invalid_token_404(client, db):
    r = client.get(f'/t/{uuid.uuid4()}')
    assert r.status_code == 404


def test_entry_inactive_restaurant_403(client, table, restaurant):
    restaurant.is_active = False
    restaurant.save(update_fields=['is_active'])
    r = client.get(f'/t/{table.qr_token}')
    assert r.status_code == 403


# --- Til ---

def test_lang_from_url_wins(client, table):
    r = client.get(f'/t/{table.qr_token}?lang=en')
    assert 'lang=en' in r.url
    assert r.cookies['armenu_lang'].value == 'en'


def test_lang_from_cookie(client, table):
    client.cookies['armenu_lang'] = 'ru'
    r = client.get(f'/t/{table.qr_token}')
    assert 'lang=ru' in r.url


def test_lang_from_header(client, table):
    r = client.get(f'/t/{table.qr_token}', HTTP_ACCEPT_LANGUAGE='ru-RU,ru;q=0.9,en;q=0.8')
    assert 'lang=ru' in r.url


def test_lang_default_uz(client, table):
    r = client.get(f'/t/{table.qr_token}', HTTP_ACCEPT_LANGUAGE='fr-FR,fr;q=0.9')
    assert 'lang=uz' in r.url


# --- Sessiya ---

def test_session_reused_on_refresh(db, restaurant, table):
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s1, new1 = open_session(g, table)
    s2, new2 = open_session(g, table)
    assert new1 is True and new2 is False and s1.id == s2.id


def test_stale_session_closed_and_new_opened(db, restaurant, table):
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s1, _ = open_session(g, table)
    s1.last_seen_at = timezone.now() - timedelta(hours=5)
    s1.save(update_fields=['last_seen_at'])
    s2, is_new = open_session(g, table)
    s1.refresh_from_db()
    assert is_new is True and s2.id != s1.id and s1.ended_at is not None


# --- Chaqiruv + cooldown ---

def test_call_created(client, db, restaurant, table):
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s, _ = open_session(g, table)
    r = client.post('/v1/calls/',
                    {'session_id': str(s.public_id), 'type': 'water'},
                    content_type='application/json')
    assert r.status_code == 201
    assert Call.objects.filter(table=table, type='water', status='new').exists()


def test_call_cooldown_429(client, db, restaurant, table):
    from django.core.cache import cache
    cache.clear()
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s, _ = open_session(g, table)
    body = {'session_id': str(s.public_id), 'type': 'waiter'}
    assert client.post('/v1/calls/', body, content_type='application/json').status_code == 201
    r2 = client.post('/v1/calls/', body, content_type='application/json')
    assert r2.status_code == 429
    assert r2.json()['error']['code'] == 'RATE_LIMITED'


def test_call_unknown_type_400(client, db, restaurant, table):
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s, _ = open_session(g, table)
    r = client.post('/v1/calls/', {'session_id': str(s.public_id), 'type': 'dance'},
                    content_type='application/json')
    assert r.status_code == 400


def test_call_bad_session_404(client, db):
    r = client.post('/v1/calls/', {'session_id': str(uuid.uuid4()), 'type': 'water'},
                    content_type='application/json')
    assert r.status_code == 404


# --- ⚡ Cross-tenant ---

def test_session_of_other_restaurant_cannot_call_our_table(client, db, restaurant,
                                                           restaurant2, table):
    h2 = Hall.objects.create(restaurant=restaurant2, name='Z2')
    t2 = Table.objects.create(hall=h2, restaurant=restaurant2, number='1')
    g2, _ = get_or_create_guest(restaurant2.id, uuid.uuid4())
    s2, _ = open_session(g2, t2)
    r = client.post('/v1/calls/',
                    {'session_id': str(s2.public_id), 'table_id': table.id, 'type': 'water'},
                    content_type='application/json')
    # Sessiyaning O'Z stoli ishlatiladi — begona stol EMAS
    assert r.status_code == 201
    assert Call.objects.get().table_id == t2.id


# --- Til API ---

def test_lang_api(client, db, restaurant, table):
    g, _ = get_or_create_guest(restaurant.id, uuid.uuid4())
    s, _ = open_session(g, table)
    r = client.post('/v1/lang/', {'lang': 'ru', 'session_id': str(s.public_id)},
                    content_type='application/json')
    assert r.status_code == 200
    s.refresh_from_db()
    assert s.lang == 'ru'


def test_lang_api_rejects_unknown(client, db):
    r = client.post('/v1/lang/', {'lang': 'de'}, content_type='application/json')
    assert r.status_code == 400
```

✅ **Tekshirish:**
```bash
pytest tests/test_guest_flow.py tests/test_guest_lang.py tests/test_i18n_completeness.py -q
# 24 passed
```

---

## V-092 — Lighthouse audit (ishlash va PWA)

```bash
npm i -g lighthouse
lighthouse "http://localhost:8060/m/test-rest/?t=1" \
  --preset=desktop --only-categories=performance,accessibility,best-practices,pwa \
  --output=html --output-path=/tmp/lh_desktop.html --quiet

lighthouse "http://localhost:8060/m/test-rest/?t=1" \
  --form-factor=mobile --throttling-method=simulate \
  --only-categories=performance,accessibility,pwa \
  --output=html --output-path=/tmp/lh_mobile.html --quiet
```

**Maqsad ko'rsatkichlar (mobil, 3G simulyatsiya):**

| Metrika | Maqsad | Qayerdan yaxshilanadi |
|---|---|---|
| Performance | ≥ 90 | V-083 lazy image, V-074 virtual scroll |
| Accessibility | ≥ 95 | 44×44 tegish, kontrast, aria-label |
| Best Practices | ≥ 95 | HTTPS, konsol xatosiz |
| PWA | o'tadi | V-082 manifest + SW |
| FCP | < 1,2 s | kritik CSS, skeleton |
| TTI | < 2,5 s | JS defer, kesh |
| Sahifa hajmi | < 400 KB | WebP rasm ≤ 60 KB |

**Tez-tez uchraydigan tuzatishlar:**
```html
<!-- rasm o'lchamlari majburiy (layout shift) -->
<img width="120" height="120" loading="lazy" alt="...">
```
```css
/* shrift almashinuvida matn ko'rinib tursin */
@font-face { font-family: 'Inter'; font-display: swap; src: url(...); }
```

✅ **Tekshirish:**
```bash
python3 -c "
import json,subprocess
out = subprocess.run(['lighthouse','http://localhost:8060/m/test-rest/?t=1',
  '--output=json','--output-path=stdout','--quiet','--chrome-flags=--headless'],
  capture_output=True, text=True).stdout
d = json.loads(out)
for k,v in d['categories'].items(): print(k, round(v['score']*100))
"
# performance 92 · accessibility 96 · best-practices 96 · pwa 90
```

---

# ✅ FAZA 4 QABULI

```
[ ] python manage.py check                        → xato yo'q
[ ] python manage.py migrate --check              → o'tadi
[ ] pytest tests/ -q                              → hammasi o'tadi
[ ] pytest tests/test_i18n_completeness.py -q     → 3 til kalitlari bir xil
[ ] QR skanerlab → menyu ochiladi (haqiqiy telefonda)
[ ] Til 3 marta almashadi — HAR BIR matn tarjima bo'ladi (hard-code yo'q)
[ ] Tema tugmasi: dark ↔ light, yangilangandan keyin ham saqlanadi
[ ] Savat localStorage'da saqlanadi, sahifa yangilansa yo'qolmaydi
[ ] Upsell toast chiqadi, "+" bosilsa savatga qo'shiladi
[ ] Chaqiruv 1-marta 201, darhol 2-marta 429 (cooldown)
[ ] WS uzilsa → 3 urinishdan keyin polling, tiklansa syncMissed
[ ] Offline: menyu keshdan ochiladi, buyurtma navbatga tushadi
[ ] DevTools → Application → Service Worker "activated"
[ ] Lighthouse mobil: Performance ≥ 90, Accessibility ≥ 95, PWA o'tadi
[ ] ⚡ grep -rn "so'm\|Savat\|Заказ" static/guest/js/ → BO'SH (hard-code matn yo'q)
[ ] ⚡ grep -rnE "#[0-9A-Fa-f]{6}" static/guest/css/menu.css → BO'SH (rang faqat theme.css'da)
```

**Yakuniy:**
```bash
python manage.py collectstatic --noinput
git add -A && git commit -m "FAZA 4 tugadi: mijoz PWA — menyu, savat, chaqiruv, real-time"
python3 ROADMAP/03_HOLAT/update_progress.py V-092 ok "FAZA 4 tugadi"
```

**➡️ Keyingi:** `FAZA_05_BUYURTMA_REALTIME.md`
