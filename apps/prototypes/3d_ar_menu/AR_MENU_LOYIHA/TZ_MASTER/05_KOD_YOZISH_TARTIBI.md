# QISM V — KOD YOZISH TARTIBI (qadam-baqadam)

> **Bu qism AI/dasturchi uchun to'g'ridan-to'g'ri bajariladigan yo'riqnoma.**
> Vazifalar bog'liqlik tartibida. Har vazifada: qaysi fayl, nima yoziladi, qanday tekshiriladi.
>
> ⚠️ **Tartibni buzmang** — keyingi vazifa oldingisiga bog'liq.

---

## 0. FAYL STRUKTURASI (to'liq)

```
armenu/
├── manage.py
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── .gitignore
├── README.md
├── pytest.ini
├── Makefile
│
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py            # umumiy
│   │   ├── dev.py             # lokal
│   │   ├── prod.py            # ishlab chiqarish
│   │   └── test.py            # testlar
│   ├── urls.py
│   ├── asgi.py                # Channels
│   ├── wsgi.py
│   └── routing.py             # WS marshrutlar
│
├── core/
│   ├── models.py              # BaseModel, TimestampedModel
│   ├── mixins.py              # TenantScopedMixin ⚡
│   ├── middleware.py          # TenantMiddleware ⚡
│   ├── permissions.py         # IsStaff, IsAdmin, IsSuperAdmin
│   ├── exceptions.py          # Custom exception + handler
│   ├── pagination.py
│   ├── cache.py               # kesh yordamchilari
│   ├── resilience.py          # CircuitBreaker, retry ⚡
│   ├── queue.py               # Redis navbat
│   ├── ws.py                  # WS yordamchi (group_send)
│   ├── i18n.py                # tarjima yordamchi
│   ├── validators.py
│   └── healing/
│       ├── daemon.py          # self-healing ⚡
│       └── checks.py
│
├── apps/
│   ├── tenants/               # 1-VAZIFA
│   ├── accounts/              # 2
│   ├── menu/                  # 3
│   ├── tables/                # 4
│   ├── guest/                 # 5
│   ├── orders/                # 6 ⚡
│   ├── ar3d/                  # 7 ⚡
│   ├── payments/              # 8
│   ├── fiscal/                # 9
│   ├── loyalty/               # 10
│   ├── reviews/               # 11
│   ├── analytics/             # 12
│   ├── ai/                    # 13 ⚡ MCP
│   ├── notifications/         # 14
│   └── platform_admin/        # 15
│
├── static/
│   ├── guest/{css,js,img}/
│   ├── staff/{css,js}/
│   ├── kds/{css,js}/
│   ├── admin_ui/{css,js}/
│   └── i18n/{uz,ru,en}.json   ⚡
│
├── templates/
│   ├── base.html
│   ├── guest/
│   ├── staff/
│   ├── kds/
│   └── admin_ui/
│
├── locale/{uz,ru,en}/LC_MESSAGES/
│
├── scripts/
│   ├── seed_demo.py
│   ├── import_library.py
│   └── healthcheck.py
│
├── tests/
│   ├── conftest.py
│   ├── test_tenant_isolation.py   ⚡ KRITIK
│   ├── test_orders.py
│   ├── test_ar.py
│   └── ...
│
└── deploy/
    ├── nginx/armenu.conf
    ├── systemd/*.service
    ├── docker-compose.yml
    └── ansible/
```

---

## BOSQICH 0 — TAYYORGARLIK (3 kun, 12 vazifa)

### V-001 — Loyiha yaratish
```bash
mkdir -p /home/user/armenu && cd /home/user/armenu
python3.12 -m venv venv && source venv/bin/activate
pip install django==5.0.* djangorestframework channels[daphne] \
    psycopg[binary] redis django-redis celery python-decouple \
    pillow qrcode[pil] reportlab drf-spectacular django-cors-headers \
    pytest pytest-django factory-boy sentry-sdk pgvector paytechuz
pip freeze > requirements.txt
django-admin startproject config .
git init && git add . && git commit -m "chore: loyiha skeleti"
```
✅ **Tekshirish:** `python manage.py runserver` ishlaydi

### V-002 — Settings bo'lish
**Fayl:** `config/settings/{base,dev,prod,test}.py`
```python
# base.py — asosiy qismlar
INSTALLED_APPS = [
    'daphne', 'django.contrib.admin', ..., 'rest_framework', 'channels',
    'corsheaders', 'drf_spectacular',
    'core', 'apps.tenants', 'apps.accounts', ...
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    ...,
    'core.middleware.TenantMiddleware',        # ⚡ MUHIM
    'core.middleware.RequestIDMiddleware',
]
LANGUAGES = [('uz','O\'zbek'), ('ru','Русский'), ('en','English')]
LANGUAGE_CODE = 'uz'
USE_I18N = USE_L10N = USE_TZ = True
TIME_ZONE = 'Asia/Tashkent'
LOCALE_PATHS = [BASE_DIR / 'locale']
```
✅ `DJANGO_SETTINGS_MODULE=config.settings.dev python manage.py check`

### V-003 — DB va Redis
```bash
sudo -u postgres psql -c "CREATE DATABASE armenu_db;"
sudo -u postgres psql -c "CREATE USER armenu WITH PASSWORD '...';"
sudo -u postgres psql -d armenu_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d armenu_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```
✅ `python manage.py migrate` ishlaydi

### V-004 — `core/models.py`
```python
class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta: abstract = True

class TenantModel(TimestampedModel):
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE, db_index=True)
    class Meta: abstract = True
```

### V-005 — ⚡ `core/middleware.py` (KRITIK)
```python
class TenantMiddleware:
    """Har so'rovda restaurant_id ni aniqlaydi. Multi-tenant xavfsizligining asosi."""
    def __call__(self, request):
        request.restaurant_id = None
        request.restaurant = None

        # 1. Custom domen
        host = request.get_host().split(':')[0]
        if host not in settings.PLATFORM_DOMAINS:
            r = Restaurant.objects.filter(custom_domain=host, is_active=True).first()
            if r: request.restaurant_id, request.restaurant = r.id, r

        # 2. URL'dagi slug: /m/<slug>/
        if not request.restaurant_id:
            m = re.match(r'^/m/([\w-]+)/', request.path)
            if m:
                r = cache_get_restaurant_by_slug(m.group(1))
                if r: request.restaurant_id, request.restaurant = r.id, r

        # 3. JWT ichidagi restaurant_id (xodim/admin)
        if not request.restaurant_id and hasattr(request, 'auth'):
            request.restaurant_id = getattr(request.auth, 'restaurant_id', None)

        return self.get_response(request)
```

### V-006 — ⚡ `core/mixins.py`
```python
class TenantScopedMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.restaurant_id:
            raise PermissionDenied("Restoran aniqlanmadi")
        return qs.filter(restaurant_id=self.request.restaurant_id)
```

### V-007 — `core/exceptions.py`
Barcha xato kodlari (Qism IV §2.2) + DRF `exception_handler` (3 tilda xabar).

### V-008 — `core/resilience.py`
`CircuitBreaker` + `retry_with_backoff` (Qism III §5.2).

### V-009 — `core/queue.py`
```python
def enqueue(queue: str, job_type: str, delay: int = 0, **payload) -> str:
    job = Job.objects.create(queue=queue, type=job_type, payload=payload, status='queued')
    r = get_redis()
    if delay: r.zadd(f'q:{queue}:delayed', {str(job.id): time.time() + delay})
    else:     r.lpush(f'q:{queue}', str(job.id))
    return str(job.id)
```

### V-010 — `core/ws.py`
```python
def ws_send(group: str, msg_type: str, data: dict):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(group, {
        'type': 'broadcast', 'message': {
            'type': msg_type, 'ts': timezone.now().isoformat(),
            'data': data, 'seq': next_seq(group)
        }})
```

### V-011 — `core/cache.py`
```python
def menu_cache_key(slug, lang, version): return f'menu:{slug}:{lang}:v{version}'
def bump_menu_version(restaurant_id):
    Restaurant.objects.filter(id=restaurant_id).update(menu_version=F('menu_version')+1)
    cache.delete_pattern(f'menu:*')
```

### V-012 — `tests/conftest.py`
Fixture'lar: `restaurant`, `restaurant2` (izolyatsiya testi uchun), `table`, `dish`, `staff`, `guest_session`.

---

## BOSQICH 1 — TENANT VA AUTH (1 hafta, 18 vazifa)

| # | Vazifa | Fayl | Bog'liq |
|---|---|---|---|
| V-013 | `Restaurant` modeli (Qism IV §1.2) | `apps/tenants/models.py` | V-004 |
| V-014 | `Subscription`, `Plan` modellari | `apps/tenants/models.py` | V-013 |
| V-015 | Migratsiya + super-admin | — | V-014 |
| V-016 | `RestaurantSerializer` | `apps/tenants/serializers.py` | V-013 |
| V-017 | Tarif limitlari servisi | `apps/tenants/services.py` | V-014 |
| V-018 | `User` modeli (AbstractUser) | `apps/accounts/models.py` | V-004 |
| V-019 | `Staff` modeli (rol, PIN) | `apps/accounts/models.py` | V-018 |
| V-020 | PIN hash (bcrypt) + tekshirish | `apps/accounts/services.py` | V-019 |
| V-021 | JWT generatsiya (restaurant_id ichida ⚡) | `apps/accounts/tokens.py` | V-019 |
| V-022 | `POST /v1/staff/login/` | `apps/accounts/views.py` | V-021 |
| V-023 | Rate-limit (5 xato → 15 daq blok) | `apps/accounts/throttles.py` | V-022 |
| V-024 | `core/permissions.py`: IsWaiter, IsCook, IsCashier, IsRestAdmin | — | V-021 |
| V-025 | Admin login (email+parol) | `apps/accounts/views.py` | V-018 |
| V-026 | Super-admin 2FA (TOTP) | `apps/accounts/views.py` | V-025 |
| V-027 | Audit log modeli + `AuditLog.log()` | `apps/analytics/models.py` | V-004 |
| V-028 | ⚡ **TEST: cross-tenant kirish 403** | `tests/test_tenant_isolation.py` | V-006 |
| V-029 | `POST /v1/staff/refresh/` | `apps/accounts/views.py` | V-021 |
| V-030 | Django admin ro'yxatga olish | `*/admin.py` | — |

### ⚡ V-028 — eng muhim test
```python
@pytest.mark.django_db
def test_cross_tenant_dish_access_forbidden(api_client, restaurant, restaurant2, staff_token):
    """Restoran A xodimi restoran B taomiga kira olmasligi SHART"""
    dish_b = DishFactory(restaurant=restaurant2)
    r = api_client.get(f'/v1/admin/dishes/{dish_b.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {staff_token}')  # A ning tokeni
    assert r.status_code in (403, 404)      # ⚡ HECH QACHON 200 EMAS

@pytest.mark.parametrize('model_name', ALL_TENANT_MODELS)
def test_all_models_tenant_scoped(model_name, ...):
    """Har bir tenant modeli uchun avtomatik tekshiruv"""
    ...
```

---

## BOSQICH 2 — MENYU (2 hafta, 24 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-031 | `Category` modeli (3 til) | `apps/menu/models.py` |
| V-032 | `Dish` modeli (to'liq, Qism IV) | `apps/menu/models.py` |
| V-033 | `DishModifier` modeli | `apps/menu/models.py` |
| V-034 | `UpsellRule` modeli | `apps/menu/models.py` |
| V-035 | Migratsiya + indekslar (GIN) | — |
| V-036 | ⚡ `core/i18n.py`: `t(obj, field, lang)` | `core/i18n.py` |
| V-037 | Rasm optimizatsiyasi (WebP, 3 o'lcham) | `apps/menu/services/images.py` |
| V-038 | `MenuSerializer` (kesh uchun tekis) | `apps/menu/serializers.py` |
| V-039 | ⚡ `GET /v1/menu/{slug}/` + Redis kesh | `apps/menu/views.py` |
| V-040 | ETag + Cache-Control | `apps/menu/views.py` |
| V-041 | `GET /v1/menu/{slug}/search/` (pg_trgm) | `apps/menu/views.py` |
| V-042 | `GET /v1/dish/{id}/` | `apps/menu/views.py` |
| V-043 | Kesh invalidation (signal) | `apps/menu/signals.py` |
| V-044 | Admin CRUD: kategoriya | `apps/menu/admin_views.py` |
| V-045 | Admin CRUD: taom | `apps/menu/admin_views.py` |
| V-046 | Stop-list toggle | `apps/menu/admin_views.py` |
| V-047 | Excel/CSV import | `apps/menu/services/import.py` |
| V-048 | Tartib o'zgartirish (drag&drop) | `apps/menu/admin_views.py` |
| V-049 | Allergen/diet filtri | `apps/menu/filters.py` |
| V-050 | Upsell qoidalari CRUD | `apps/menu/admin_views.py` |
| V-051 | IKPU kod maydoni + validatsiya | `apps/menu/validators.py` |
| V-052 | `tasnif.soliq.uz` API qidiruvi | `apps/fiscal/services/ikpu.py` |
| V-053 | Test: menyu API, kesh, filtr | `tests/test_menu.py` |
| V-054 | Test: 3 til to'g'ri qaytadi | `tests/test_i18n.py` |

### ⚡ V-036 — tarjima yordamchi (har joyda ishlatiladi)
```python
# core/i18n.py
def t(obj, field: str, lang: str = 'uz') -> str:
    """
    t(dish, 'name', 'ru') → dish.name_ru yoki fallback dish.name_uz
    """
    val = getattr(obj, f'{field}_{lang}', None)
    if val: return val
    for fb in ('uz', 'ru', 'en'):                 # fallback zanjiri
        val = getattr(obj, f'{field}_{fb}', None)
        if val: return val
    return ''
```

---

## BOSQICH 3 — STOLLAR VA QR (1 hafta, 12 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-055 | `Hall` modeli | `apps/tables/models.py` |
| V-056 | ⚡ `Table` modeli (`qr_token` UUID unique) | `apps/tables/models.py` |
| V-057 | Migratsiya | — |
| V-058 | ⚡ QR generatsiya (qrcode, ECC=H, logo) | `apps/tables/services/qr.py` |
| V-059 | ⚡ QR PDF (ReportLab, A4 1/2/4/6) | `apps/tables/services/pdf.py` |
| V-060 | Admin CRUD: zal | `apps/tables/admin_views.py` |
| V-061 | Admin CRUD: stol | `apps/tables/admin_views.py` |
| V-062 | `POST /tables/{id}/regen-qr/` (grace 24s) | `apps/tables/admin_views.py` |
| V-063 | `GET /tables/qr-pdf/` | `apps/tables/admin_views.py` |
| V-064 | Zal plani saqlash (`plan_json`) | `apps/tables/admin_views.py` |
| V-065 | Stol holati o'zgartirish + WS | `apps/tables/services/status.py` |
| V-066 | Test: QR noyob, cross-tenant yo'q | `tests/test_tables.py` |

### V-058 — QR generatsiya kodi
```python
# apps/tables/services/qr.py
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

def generate_qr(table, logo_path=None):
    url = f"https://{settings.PUBLIC_DOMAIN}/t/{table.qr_token}"
    qr = qrcode.QRCode(version=None, error_correction=qrcode.ERROR_CORRECT_H,
                       box_size=12, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage,
                        module_drawer=RoundedModuleDrawer(),
                        embeded_image_path=logo_path)
    return img          # 300 DPI PNG
```

---

## BOSQICH 4 — MIJOZ OQIMI (2 hafta, 26 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-067 | `Guest`, `GuestSession` modellari | `apps/guest/models.py` |
| V-068 | ⚡ `GET /t/{qr_token}` (M-01 zanjiri) | `apps/guest/views.py` |
| V-069 | Device token cookie (1 yil) | `apps/guest/services.py` |
| V-070 | Til aniqlash (4 bosqichli) | `core/i18n.py` |
| V-071 | Menyu sahifasi shabloni | `templates/guest/menu.html` |
| V-072 | ⚡ `static/i18n/{uz,ru,en}.json` (barcha matn) | `static/i18n/` |
| V-073 | JS i18n yuklovchi | `static/guest/js/i18n.js` |
| V-074 | Menyu JS: yuklash, render, virtual scroll | `static/guest/js/menu.js` |
| V-075 | Qidiruv (debounce 300ms) | `static/guest/js/menu.js` |
| V-076 | Kategoriya + diet filtri | `static/guest/js/menu.js` |
| V-077 | Taom modali (M-04) | `static/guest/js/dish.js` |
| V-078 | Modifikatorlar + narx hisobi | `static/guest/js/dish.js` |
| V-079 | Savat (localStorage) | `static/guest/js/cart.js` |
| V-080 | ⚡ Upsell mantiq | `static/guest/js/upsell.js` |
| V-081 | Savat sahifasi (M-06) | `templates/guest/cart.html` |
| V-082 | ⚡ Dark + Light tema (CSS o'zgaruvchilar) | `static/guest/css/theme.css` |
| V-083 | PWA manifest + service worker | `static/guest/sw.js` |
| V-084 | Lazy image (IntersectionObserver) | `static/guest/js/lazy.js` |
| V-085 | Offline rejim (cache-first) | `static/guest/sw.js` |
| V-086 | Chaqiruv UI (M-09) | `static/guest/js/calls.js` |
| V-087 | `POST /v1/calls/` + cooldown | `apps/orders/views.py` |
| V-088 | Buyurtma holati sahifasi (M-08) | `templates/guest/order_status.html` |
| V-089 | WS klient (ReliableWS) | `static/guest/js/ws.js` |
| V-090 | Toast/bildirishnoma tizimi | `static/guest/js/toast.js` |
| V-091 | Test: QR→menyu→savat oqimi | `tests/test_guest_flow.py` |
| V-092 | Lighthouse audit (>90 ball) | — |

---

## BOSQICH 5 — BUYURTMA VA REAL-TIME (2 hafta, 22 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-093 | `Order`, `OrderItem` modellari | `apps/orders/models.py` |
| V-094 | ⚡ Holat mashinasi (`state.py`) | `apps/orders/state.py` |
| V-095 | Kunlik buyurtma raqami (`#047`) | `apps/orders/services.py` |
| V-096 | ⚡ `create_order()` (Qism IV §2.4) | `apps/orders/services.py` |
| V-097 | ⚡ Idempotency (Redis) | `core/idempotency.py` |
| V-098 | `POST /v1/orders/` | `apps/orders/views.py` |
| V-099 | `GET /v1/orders/{id}/` | `apps/orders/views.py` |
| V-100 | `POST /v1/orders/{id}/add-items/` | `apps/orders/views.py` |
| V-101 | WS consumer: guest | `apps/orders/consumers.py` |
| V-102 | WS consumer: staff | `apps/orders/consumers.py` |
| V-103 | WS consumer: KDS | `apps/orders/consumers.py` |
| V-104 | WS consumer: admin | `apps/orders/consumers.py` |
| V-105 | `config/routing.py` | — |
| V-106 | Heartbeat + reconnect (server) | `apps/orders/consumers.py` |
| V-107 | ⚡ `GET /v1/sync/?since_seq=` | `apps/orders/views.py` |
| V-108 | Ofitsiant paneli sahifasi (O-02) | `templates/staff/orders.html` |
| V-109 | Ofitsiant JS + WS + tovush | `static/staff/js/orders.js` |
| V-110 | `POST /staff/orders/{id}/accept|serve/` | `apps/orders/staff_views.py` |
| V-111 | ⚡ KDS sahifasi (K-01, dark, katta) | `templates/kds/board.html` |
| V-112 | KDS JS (kanban, taymer, ranglar) | `static/kds/js/board.js` |
| V-113 | `POST /staff/orders/{id}/cook|ready/` | `apps/orders/staff_views.py` |
| V-114 | Test: to'liq buyurtma oqimi + WS | `tests/test_order_flow.py` |

---

## BOSQICH 6 — ⚡ AR/3D MODUL (2,5 hafta, 28 vazifa) — ASOSIY

| # | Vazifa | Fayl |
|---|---|---|
| V-115 | `DishLibrary` modeli (pgvector) | `apps/ar3d/models.py` |
| V-116 | `DishModel3D` modeli | `apps/ar3d/models.py` |
| V-117 | `ARView` modeli (partition) | `apps/ar3d/models.py` |
| V-118 | `Model3DJob` modeli | `apps/ar3d/models.py` |
| V-119 | Migratsiya + pgvector indeks | — |
| V-120 | ⚡ `GET /v1/ar/{dish_id}/` | `apps/ar3d/views.py` |
| V-121 | ⚡ AR qo'llab-quvvatlash aniqlash (JS) | `static/guest/js/ar-detect.js` |
| V-122 | ⚡ `<model-viewer>` integratsiyasi | `static/guest/js/ar.js` |
| V-123 | AR modal UI + progress | `templates/guest/ar_modal.html` |
| V-124 | ⚡ Fallback zanjiri (4 bosqich) | `static/guest/js/ar.js` |
| V-125 | `POST /v1/ar/view/` (analitika) | `apps/ar3d/views.py` |
| V-126 | ⚡ Kutubxona qidiruvi (nom+alias) | `apps/ar3d/services/library.py` |
| V-127 | ⚡ Kutubxona semantik qidiruv (embedding) | `apps/ar3d/services/library.py` |
| V-128 | Kutubxonadan nusxa olish | `apps/ar3d/services/library.py` |
| V-129 | ⚡ AI 3D generatsiya (MCP orqali) | `apps/ar3d/services/generate.py` |
| V-130 | ⚡ GLB optimizatsiya (gltf-transform) | `apps/ar3d/services/optimize.py` |
| V-131 | ⚡ Real o'lchamga masshtablash | `apps/ar3d/services/optimize.py` |
| V-132 | ⚡ USDZ konvertatsiya | `apps/ar3d/services/usdz.py` |
| V-133 | Poster render (headless) | `apps/ar3d/services/poster.py` |
| V-134 | CDN/S3 yuklash | `apps/ar3d/services/storage.py` |
| V-135 | ⚡ Worker: `run_model3d_worker` | `apps/ar3d/management/commands/` |
| V-136 | Kutubxonaga qo'shish (avto) | `apps/ar3d/services/library.py` |
| V-137 | `POST /v1/admin/ar/generate/` | `apps/ar3d/admin_views.py` |
| V-138 | `POST /v1/admin/ar/upload/` | `apps/ar3d/admin_views.py` |
| V-139 | Admin 3D sahifasi (A-04) | `templates/admin_ui/ar.html` |
| V-140 | ⚡ AR analitika (A-10) | `apps/ar3d/analytics.py` |
| V-141 | Super-admin kutubxona (P-02) | `templates/admin_ui/library.html` |
| V-142 | Test: AR API, fallback, o'lcham | `tests/test_ar.py` |

### ⚡ V-130 — GLB optimizatsiya (kritik kod)
```python
# apps/ar3d/services/optimize.py
import subprocess, json, os

def optimize_glb(input_path: str, output_path: str, real_size_cm: float) -> dict:
    """
    1. Draco siqish  2. Tekstura 1024px  3. Poligon ≤60k
    4. ⚡ Real o'lchamga masshtablash  5. Markazni Y=0 ga
    """
    tmp = output_path + '.tmp.glb'

    # gltf-transform pipeline
    cmds = [
        ['gltf-transform', 'resize', input_path, tmp, '--width','1024','--height','1024'],
        ['gltf-transform', 'simplify', tmp, tmp, '--ratio','0.5','--error','0.001'],
        ['gltf-transform', 'webp', tmp, tmp, '--quality','85'],
        ['gltf-transform', 'draco', tmp, output_path],
    ]
    for c in cmds:
        subprocess.run(c, check=True, timeout=300)

    # ⚡ Real o'lchamga masshtablash va markazlash (pygltflib)
    scale_and_center(output_path, real_size_cm / 100.0)   # sm → m

    size = os.path.getsize(output_path)
    if size > 3 * 1024 * 1024:                            # 3 MB dan katta
        aggressive_optimize(output_path)                   # qayta, agressiv
        size = os.path.getsize(output_path)

    return {'bytes': size, 'ok': size <= 3*1024*1024}
```

### ⚡ V-131 — real o'lcham (AR ning eng muhim qismi)
```python
def scale_and_center(glb_path: str, target_size_m: float):
    """
    Model AR'da 1:1 chiqishi uchun:
      1. Bounding box hisoblanadi
      2. Eng katta o'lcham target_size_m ga tenglashtiriladi
      3. Model tagi Y=0 ga tushiriladi (stolga to'g'ri qo'yiladi)
    """
    gltf = GLTF2().load(glb_path)
    bbox = compute_bbox(gltf)
    current_max = max(bbox.size.x, bbox.size.z)   # gorizontal o'lcham
    scale = target_size_m / current_max

    root = gltf.nodes[gltf.scenes[0].nodes[0]]
    root.scale = [scale, scale, scale]
    root.translation = [
        -bbox.center.x * scale,
        -bbox.min.y   * scale,      # ⚡ tagi Y=0
        -bbox.center.z * scale,
    ]
    gltf.save(glb_path)
```

---

## BOSQICH 7 — ZAL PLANI (1 hafta, 8 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-143 | Zal redaktor (drag&drop, canvas) | `static/admin_ui/js/hall-editor.js` |
| V-144 | Stol shakli, o'lchami, burilishi | `static/admin_ui/js/hall-editor.js` |
| V-145 | Devor/bar/eshik chizish | `static/admin_ui/js/hall-editor.js` |
| V-146 | `plan_json` saqlash/yuklash | `apps/tables/admin_views.py` |
| V-147 | Ofitsiant 2D plan ko'rinishi (O-05) | `static/staff/js/hall-view.js` |
| V-148 | Stol rangi (holat) + WS yangilanish | `static/staff/js/hall-view.js` |
| V-149 | Admin jonli zal ko'rinishi | `static/admin_ui/js/hall-live.js` |
| V-150 | Test | `tests/test_halls.py` |

> 📌 **v3 tayyorgarligi:** `plan_json` ga `z`, `height`, `model` maydonlari
> qo'shilsa — bu ma'lumot to'g'ridan-to'g'ri 3D zalga aylanadi.

---

## BOSQICH 8 — ADMIN PANEL (1,5 hafta, 20 vazifa)

| # | Vazifa |
|---|---|
| V-151 | Admin layout + navigatsiya (dark/light) |
| V-152 | ⚡ Dashboard (A-01) + WS jonli oqim |
| V-153 | Ko'rsatkich kartochkalari |
| V-154 | Soatlik savdo grafigi (Chart.js) |
| V-155 | TOP taomlar |
| V-156 | Buyurtmalar ro'yxati + filtr |
| V-157 | Buyurtma tafsiloti |
| V-158 | Savdo hisoboti (kun/hafta/oy) |
| V-159 | Taomlar hisoboti |
| V-160 | ⚡ Menyu-injiniring (4 kvadrant) |
| V-161 | Xodimlar hisoboti |
| V-162 | Excel/PDF eksport |
| V-163 | Xodimlar CRUD |
| V-164 | Sozlamalar sahifasi |
| V-165 | Brending (logo, rang) |
| V-166 | ⚡ Tarjima boshqaruvi (A-15) |
| V-167 | Tarif va to'lov sahifasi |
| V-168 | Ma'lumot eksporti |
| V-169 | Mobil moslashuv |
| V-170 | Test |

---

## BOSQICH 9 — AI VA MCP (1,5 hafta, 16 vazifa)

> Batafsil: **Qism VII — AI/MCP integratsiyasi**

| # | Vazifa | Fayl |
|---|---|---|
| V-171 | ⚡ MCP baza qatlami | `apps/ai/mcp/base.py` |
| V-172 | Provayder: Claude (Anthropic) | `apps/ai/mcp/providers/claude.py` |
| V-173 | Provayder: Gemini | `apps/ai/mcp/providers/gemini.py` |
| V-174 | Provayder: OpenAI | `apps/ai/mcp/providers/openai.py` |
| V-175 | Provayder: Groq | `apps/ai/mcp/providers/groq.py` |
| V-176 | Provayder: DeepSeek | `apps/ai/mcp/providers/deepseek.py` |
| V-177 | Provayder: Meshy (3D) | `apps/ai/mcp/providers/meshy.py` |
| V-178 | Provayder: Tripo (3D) | `apps/ai/mcp/providers/tripo.py` |
| V-179 | ⚡ Router (prioritet + fallback) | `apps/ai/mcp/router.py` |
| V-180 | Circuit breaker har provayderga | `apps/ai/mcp/router.py` |
| V-181 | `AIUsage` + xarajat hisobi | `apps/ai/models.py` |
| V-182 | ⚡ Chatbot servisi | `apps/ai/services/chat.py` |
| V-183 | `POST /v1/ai/chat/` | `apps/ai/views.py` |
| V-184 | Chatbot UI (M-13) | `static/guest/js/chat.js` |
| V-185 | ⚡ Avto-tarjima servisi | `apps/ai/services/translate.py` |
| V-186 | Test: fallback zanjiri | `tests/test_ai.py` |

---

## BOSQICH 10 — TO'LOV VA FISKAL (v1.5, 2 hafta, 18 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-187 | `Payment`, `Tip` modellari | `apps/payments/models.py` |
| V-188 | `paytechuz` integratsiyasi | `apps/payments/providers/` |
| V-189 | Payme adapter | `apps/payments/providers/payme.py` |
| V-190 | Click adapter | `apps/payments/providers/click.py` |
| V-191 | Uzum adapter | `apps/payments/providers/uzum.py` |
| V-192 | `POST /v1/payments/` | `apps/payments/views.py` |
| V-193 | ⚡ Webhook + imzo tekshiruvi | `apps/payments/webhooks.py` |
| V-194 | Idempotency (to'lov) | `apps/payments/services.py` |
| V-195 | Hisobni bo'lish (split bill) | `apps/payments/services.py` |
| V-196 | ⚡ Choychaqa (tips) | `apps/payments/views.py` |
| V-197 | Reconciliation cron | `apps/payments/tasks.py` |
| V-198 | `FiscalReceipt` modeli | `apps/fiscal/models.py` |
| V-199 | OFD adapter: UZKASSA | `apps/fiscal/providers/uzkassa.py` |
| V-200 | OFD adapter: e-POS | `apps/fiscal/providers/epos.py` |
| V-201 | ⚡ Fiskal worker (retry 48s) | `apps/fiscal/tasks.py` |
| V-202 | IKPU tekshiruvi | `apps/fiscal/services/ikpu.py` |
| V-203 | Raqamli chek (QR + Telegram) | `apps/fiscal/services/receipt.py` |
| V-204 | Test: to'lov + fiskal | `tests/test_payments.py` |

---

## BOSQICH 11 — SODIQLIK, OTZIV, ANALITIKA (1,5 hafta, 14 vazifa)

| # | Vazifa |
|---|---|
| V-205 | `Bonus`, `Promo` modellari |
| V-206 | Keshbek hisoblash |
| V-207 | Promokod qo'llash |
| V-208 | Tug'ilgan kun bonusi (cron) |
| V-209 | `Review` modeli |
| V-210 | ⚡ Otziv filtri (5⭐→Google) |
| V-211 | Otziv UI (M-12) |
| V-212 | Admin otzivlar (A-12) |
| V-213 | `AnalyticsEvent` → ClickHouse |
| V-214 | Event yig'ish (batch) |
| V-215 | Menyu-injiniring hisobi |
| V-216 | Kunlik agregatsiya (cron) |
| V-217 | Telegram bildirishnoma |
| V-218 | Test |

---

## BOSQICH 12 — DEPLOY VA KUZATUV (1 hafta, 16 vazifa)

| # | Vazifa | Fayl |
|---|---|---|
| V-219 | `deploy/nginx/armenu.conf` | — |
| V-220 | `armenu.service` (gunicorn) | — |
| V-221 | `armenu-ws.service` (daphne) | — |
| V-222 | `armenu-worker@.service` (5 tur) | — |
| V-223 | ⚡ `armenu-healer.service` | — |
| V-224 | Socket activation (zero-downtime) | — |
| V-225 | Health endpoint `/health/`, `/ready/` | `core/views.py` |
| V-226 | Prometheus metrikalar | `core/metrics.py` |
| V-227 | Grafana dashboard | `deploy/grafana/` |
| V-228 | Sentry integratsiyasi | `config/settings/prod.py` |
| V-229 | Log (JSON, Loki) | `config/settings/prod.py` |
| V-230 | Backup skript (cron) | `scripts/backup.sh` |
| V-231 | Backup tekshirish (cron) | `scripts/verify_backup.sh` |
| V-232 | CI/CD (GitHub Actions) | `.github/workflows/` |
| V-233 | ⚡ CI'da tenant izolyatsiya testi majburiy | — |
| V-234 | Yuklama testi (k6/locust) | `tests/load/` |

---

## 📊 VAZIFALAR XULOSASI

| Bosqich | Vazifa | Muddat |
|---|---|---|
| 0. Tayyorgarlik | 12 | 3 kun |
| 1. Tenant + Auth | 18 | 1 hafta |
| 2. Menyu | 24 | 2 hafta |
| 3. Stollar + QR | 12 | 1 hafta |
| 4. Mijoz oqimi | 26 | 2 hafta |
| 5. Buyurtma + real-time | 22 | 2 hafta |
| 6. ⚡ AR/3D | 28 | 2,5 hafta |
| 7. Zal plani | 8 | 1 hafta |
| 8. Admin panel | 20 | 1,5 hafta |
| 9. AI + MCP | 16 | 1,5 hafta |
| **v1 JAMI** | **186** | **~15 hafta** |
| 10. To'lov + fiskal (v1.5) | 18 | 2 hafta |
| 11. Sodiqlik + analitika | 14 | 1,5 hafta |
| 12. Deploy + kuzatuv | 16 | 1 hafta |
| **v1.5 JAMI** | **234** | **~19,5 hafta** |

---

## ✅ HAR VAZIFA UCHUN "TUGALLANGAN" TA'RIFI

Vazifa faqat quyidagilar bajarilgandagina tugallangan hisoblanadi:

1. ✅ Kod yozilgan va ishlaydi
2. ✅ Test yozilgan va o'tadi
3. ✅ ⚡ **Tenant izolyatsiyasi tekshirilgan** (agar tenant modeli bo'lsa)
4. ✅ 3 til qo'llab-quvvatlanadi (agar UI bo'lsa)
5. ✅ Dark + Light tema (agar UI bo'lsa)
6. ✅ Xato holatlari qayta ishlangan
7. ✅ Log/metrika qo'shilgan (agar muhim bo'lsa)
8. ✅ API hujjati yangilangan (drf-spectacular)
9. ✅ Kod ko'rib chiqilgan (review)

---

**➡️ Keyingi qism:** [06_TARJIMA_VA_UI.md](06_TARJIMA_VA_UI.md)
