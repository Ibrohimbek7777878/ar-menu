# QISM IV — MA'LUMOT MODELI VA API

---

## 1. MA'LUMOTLAR BAZASI SXEMASI (to'liq)

### 1.1 Bog'lanishlar diagrammasi

```
                        ┌──────────────┐
                        │  Restaurant  │  ← TENANT (hamma narsa shunga bog'liq)
                        └──────┬───────┘
        ┌──────────┬───────────┼───────────┬──────────┬─────────┐
        │          │           │           │          │         │
   ┌────▼───┐ ┌───▼────┐ ┌────▼────┐ ┌────▼───┐ ┌───▼───┐ ┌──▼────┐
   │  Hall  │ │Category│ │  Staff  │ │ Guest  │ │Setting│ │Subscr.│
   └────┬───┘ └───┬────┘ └────┬────┘ └───┬────┘ └───────┘ └───────┘
        │         │           │          │
   ┌────▼───┐ ┌──▼────┐       │     ┌────▼────────┐
   │ Table  │ │ Dish  │       │     │GuestSession │
   └────┬───┘ └──┬────┘       │     └────┬────────┘
        │        │            │          │
        │   ┌────▼─────────┐  │          │
        │   │ DishModel3D  │──┼──────────┼──► DishLibrary (GLOBAL)
        │   │ DishModifier │  │          │
        │   └──────────────┘  │          │
        │                     │          │
        └──────────┬──────────┴──────────┘
                   │
              ┌────▼─────┐
              │  Order   │
              └────┬─────┘
        ┌──────────┼──────────┬────────────┐
   ┌────▼────┐ ┌──▼─────┐ ┌──▼───┐ ┌──────▼──────┐
   │OrderItem│ │Payment │ │ Tip  │ │FiscalReceipt│
   └─────────┘ └────────┘ └──────┘ └─────────────┘

   Mustaqil: ARView, Call, Review, AuditLog, Job, AnalyticsEvent
```

---

### 1.2 Jadvallar (Django modellari)

#### `tenants.Restaurant` — asosiy tenant

```python
class Restaurant(models.Model):
    id            = models.BigAutoField(primary_key=True)
    slug          = models.SlugField(max_length=64, unique=True, db_index=True)
    name          = models.CharField(max_length=200)
    legal_name    = models.CharField(max_length=255, blank=True)   # yuridik nom
    inn           = models.CharField(max_length=20, blank=True)    # STIR
    phone         = models.CharField(max_length=20)                # 998XXXXXXXXX
    address       = models.TextField(blank=True)
    city          = models.CharField(max_length=100, db_index=True)
    lat           = models.DecimalField(max_digits=9,  decimal_places=6, null=True)
    lng           = models.DecimalField(max_digits=9,  decimal_places=6, null=True)

    # Brending
    logo          = models.ImageField(upload_to='logos/', null=True, blank=True)
    color_primary = models.CharField(max_length=7, default='#E85D2A')
    color_accent  = models.CharField(max_length=7, default='#1A1A2E')
    custom_domain = models.CharField(max_length=120, blank=True, db_index=True)

    # Til
    default_lang  = models.CharField(max_length=2, choices=LANGS, default='uz')
    langs_enabled = ArrayField(models.CharField(max_length=2), default=list_uz_ru_en)

    # Tarif
    plan          = models.CharField(max_length=20, choices=PLANS, default='free')
    plan_expires  = models.DateTimeField(null=True, blank=True)
    ar_model_limit= models.IntegerField(default=0)    # FREE=0, PRO=50
    table_limit   = models.IntegerField(default=3)    # FREE=3, boshqa=cheksiz(-1)

    # Xizmat haqi
    service_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Fiskal
    ofd_provider  = models.CharField(max_length=20, blank=True)  # uzkassa|epos|qpos
    ofd_config    = models.JSONField(default=dict)               # shifrlangan
    fiscal_enabled= models.BooleanField(default=False)

    # Holat
    is_active     = models.BooleanField(default=True, db_index=True)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at    = models.DateTimeField(auto_now=True)

    # Cache versiyasi (invalidation uchun) ⚡
    menu_version  = models.IntegerField(default=1)

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'plan']),
            models.Index(fields=['city', 'is_active']),
        ]
```

#### `tables.Hall` va `tables.Table`

```python
class Hall(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=CASCADE, related_name='halls')
    name       = models.CharField(max_length=100)
    name_ru    = models.CharField(max_length=100, blank=True)
    name_en    = models.CharField(max_length=100, blank=True)
    order      = models.IntegerField(default=0)
    plan_json  = models.JSONField(default=dict)
    # plan_json: {"width":1000,"height":700,
    #             "objects":[{"type":"wall","x1":0,"y1":0,"x2":1000,"y2":0},
    #                        {"type":"bar","x":400,"y":600,"w":200,"h":60}]}
    # ⚡ v3 (3D) uchun tayyor: z, height maydonlari qo'shiladi
    is_active  = models.BooleanField(default=True)


class Table(models.Model):
    hall       = models.ForeignKey(Hall, on_delete=CASCADE, related_name='tables')
    restaurant = models.ForeignKey(Restaurant, on_delete=CASCADE, db_index=True)  # denorm ⚡
    number     = models.CharField(max_length=20)         # "5", "VIP-2", "A12"
    qr_token   = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)  ⚡ NOYOB
    qr_token_old = models.UUIDField(null=True, blank=True, db_index=True)  # grace 24s
    qr_rotated_at= models.DateTimeField(null=True, blank=True)

    capacity   = models.SmallIntegerField(default=4)
    shape      = models.CharField(max_length=10, default='rect')  # rect|circle
    x          = models.IntegerField(default=0)        # zal planidagi joyi
    y          = models.IntegerField(default=0)
    w          = models.IntegerField(default=80)
    h          = models.IntegerField(default=80)
    rotation   = models.SmallIntegerField(default=0)

    status     = models.CharField(max_length=20, default='free', db_index=True)
    # free | occupied | ordering | waiting | ready | bill | cleaning

    assigned_waiter = models.ForeignKey('accounts.Staff', null=True, blank=True, on_delete=SET_NULL)
    is_active  = models.BooleanField(default=True)

    class Meta:
        unique_together = [('restaurant', 'number')]
        indexes = [models.Index(fields=['restaurant', 'status'])]
```

#### `menu.Category` va `menu.Dish`

```python
class Category(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=CASCADE, related_name='categories')
    name_uz    = models.CharField(max_length=120)
    name_ru    = models.CharField(max_length=120, blank=True)
    name_en    = models.CharField(max_length=120, blank=True)
    icon       = models.CharField(max_length=40, blank=True)
    image      = models.ImageField(upload_to='cat/', null=True, blank=True)
    order      = models.IntegerField(default=0, db_index=True)
    is_active  = models.BooleanField(default=True)


class Dish(models.Model):
    category   = models.ForeignKey(Category, on_delete=CASCADE, related_name='dishes')
    restaurant = models.ForeignKey(Restaurant, on_delete=CASCADE, db_index=True)  # denorm

    name_uz    = models.CharField(max_length=200)
    name_ru    = models.CharField(max_length=200, blank=True)
    name_en    = models.CharField(max_length=200, blank=True)
    desc_uz    = models.TextField(blank=True)
    desc_ru    = models.TextField(blank=True)
    desc_en    = models.TextField(blank=True)

    # Tarjima holati
    tr_auto    = models.JSONField(default=dict)   # {"ru":true,"en":false} — AI tarjimami
    tr_approved= models.JSONField(default=dict)   # {"ru":true,"en":false} — admin tasdiqladimi

    price      = models.DecimalField(max_digits=12, decimal_places=2)
    old_price  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    image      = models.ImageField(upload_to='dish/')
    image_webp = models.CharField(max_length=255, blank=True)  # optimallashtirilgan

    weight_g   = models.IntegerField(null=True, blank=True)
    cook_min   = models.SmallIntegerField(default=15)
    calories   = models.IntegerField(null=True, blank=True)

    ingredients_uz = models.TextField(blank=True)
    ingredients_ru = models.TextField(blank=True)
    ingredients_en = models.TextField(blank=True)

    allergens  = ArrayField(models.CharField(max_length=30), default=list, blank=True)
    # ['nuts','gluten','dairy','eggs','fish','soy',...]
    diet_tags  = ArrayField(models.CharField(max_length=30), default=list, blank=True)
    # ['halal','vegetarian','vegan','spicy','no_spicy','lactose_free']

    ikpu_code  = models.CharField(max_length=30, blank=True, db_index=True)  ⚡ SOLIQ
    package_code = models.CharField(max_length=30, blank=True)               # o'lchov birligi

    is_available = models.BooleanField(default=True, db_index=True)  # stop-list
    is_hit     = models.BooleanField(default=False)
    is_new     = models.BooleanField(default=False)
    order      = models.IntegerField(default=0)

    # Denormalizatsiya (tez o'qish uchun) ⚡
    has_3d     = models.BooleanField(default=False, db_index=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_cnt = models.IntegerField(default=0)
    sold_count = models.IntegerField(default=0)    # menyu-injiniring uchun

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'is_available', 'order']),
            models.Index(fields=['category', 'is_active_order']),
            GinIndex(fields=['diet_tags']),
            GinIndex(fields=['allergens']),
        ]
```

#### ⚡ `ar3d.DishLibrary` — ENG MUHIM AKTIV (global, tenant'siz)

```python
class DishLibrary(models.Model):
    """
    Umumiy 3D taom kutubxonasi. Barcha restoranlar foydalanadi.
    ⚡ Bu — loyihaning eng qimmatli aktivi va himoya devori.
    """
    key        = models.SlugField(max_length=80, unique=True, db_index=True)
    # 'osh-toshkent', 'manti', 'somsa-goshtli', 'lagmon-quyruq'

    name_uz    = models.CharField(max_length=200)
    name_ru    = models.CharField(max_length=200)
    name_en    = models.CharField(max_length=200)
    aliases    = ArrayField(models.CharField(max_length=100), default=list)
    # ['palov','плов','pilaf','osh'] — moslashtirishda ishlatiladi

    category_key = models.CharField(max_length=50, db_index=True)  # 'national','salad',...
    cuisine    = models.CharField(max_length=50, default='uzbek')

    glb_url    = models.URLField(max_length=500)
    usdz_url   = models.URLField(max_length=500)
    poster_url = models.URLField(max_length=500)
    preview_360= models.URLField(max_length=500, blank=True)

    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1)  ⚡ real o'lcham
    glb_bytes  = models.IntegerField()
    usdz_bytes = models.IntegerField()
    poly_count = models.IntegerField()

    quality    = models.SmallIntegerField(default=3)   # 1-5
    source     = models.CharField(max_length=20)       # photogrammetry|ai|manual
    embedding  = VectorField(dimensions=768, null=True)  # pgvector — semantik qidiruv ⚡

    used_by_count = models.IntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active  = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['category_key', 'is_active']),
            models.Index(fields=['-used_by_count']),
            GinIndex(fields=['aliases']),
        ]
```

#### `ar3d.DishModel3D` — restoran taomining modeli

```python
class DishModel3D(models.Model):
    dish       = models.OneToOneField(Dish, on_delete=CASCADE, related_name='model3d')
    library    = models.ForeignKey(DishLibrary, null=True, blank=True, on_delete=SET_NULL)
    # library to'ldirilgan bo'lsa → kutubxonadan olingan (bepul)

    glb        = models.FileField(upload_to='ar/glb/', blank=True)
    usdz       = models.FileField(upload_to='ar/usdz/', blank=True)
    poster     = models.ImageField(upload_to='ar/poster/', blank=True)

    real_size_cm = models.DecimalField(max_digits=6, decimal_places=1, default=25)
    glb_bytes  = models.IntegerField(default=0)
    usdz_bytes = models.IntegerField(default=0)

    status     = models.CharField(max_length=20, default='none', db_index=True)
    # none | queued | processing | ready | failed
    source     = models.CharField(max_length=20, blank=True)  # library|ai|upload|photogrammetry
    error_msg  = models.TextField(blank=True)
    progress   = models.SmallIntegerField(default=0)   # 0-100

    # Analitika (denorm)
    view_count = models.IntegerField(default=0)
    convert_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    ready_at   = models.DateTimeField(null=True, blank=True)
```

#### `ar3d.ARView` — analitika (partitioned)

```python
class ARView(models.Model):
    """Partition: oy bo'yicha. Eski partitionlar S3'ga arxivlanadi."""
    restaurant   = models.ForeignKey(Restaurant, on_delete=CASCADE, db_index=True)
    dish         = models.ForeignKey(Dish, on_delete=CASCADE)
    guest        = models.ForeignKey('guest.Guest', null=True, on_delete=SET_NULL)
    table        = models.ForeignKey(Table, null=True, on_delete=SET_NULL)
    session_id   = models.CharField(max_length=64, db_index=True)

    mode         = models.CharField(max_length=20)  # webxr|quick-look|scene-viewer|3d-only
    duration_sec = models.IntegerField(default=0)
    converted    = models.BooleanField(default=False)  # buyurtma qilindimi
    device       = models.CharField(max_length=20)     # ios|android|desktop
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'created_at']),
            models.Index(fields=['dish', 'created_at']),
        ]
```

#### `orders.Order` — buyurtma (partitioned)

```python
class Order(models.Model):
    STATUS = [
        ('new','Yangi'), ('accepted','Qabul qilindi'), ('cooking','Tayyorlanmoqda'),
        ('ready','Tayyor'), ('served','Berildi'), ('paid','To\'landi'),
        ('cancelled','Bekor qilindi'),
    ]
    restaurant = models.ForeignKey(Restaurant, on_delete=PROTECT, db_index=True)
    table      = models.ForeignKey(Table, null=True, on_delete=SET_NULL)
    guest      = models.ForeignKey('guest.Guest', null=True, on_delete=SET_NULL)
    session_id = models.CharField(max_length=64, db_index=True)
    waiter     = models.ForeignKey('accounts.Staff', null=True, blank=True, on_delete=SET_NULL)

    number     = models.CharField(max_length=20, db_index=True)   # "#047" kunlik
    status     = models.CharField(max_length=20, choices=STATUS, default='new', db_index=True)
    source     = models.CharField(max_length=20, default='qr')    # qr|waiter|telegram|delivery

    subtotal   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    service_fee= models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total      = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    note       = models.TextField(blank=True)
    eta_min    = models.SmallIntegerField(default=0)

    idempotency_key = models.CharField(max_length=64, unique=True, null=True, db_index=True) ⚡

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    accepted_at= models.DateTimeField(null=True, blank=True)
    cooking_at = models.DateTimeField(null=True, blank=True)
    ready_at   = models.DateTimeField(null=True, blank=True)
    served_at  = models.DateTimeField(null=True, blank=True)
    paid_at    = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'status', '-created_at']),
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['table', 'status']),
        ]
```

**⚠️ Holat mashinasi (state machine) — qat'iy:**

```
     new ──accept──► accepted ──cook──► cooking ──ready──► ready
      │                 │                  │                 │
      │                 │                  │              serve
      │                 │                  │                 ▼
      └──cancel─────────┴──────────────────┴──────────► served ──pay──► paid
                                                            │
                                                         cancel
                                                            ▼
                                                        cancelled

⚠️ Ruxsat etilmagan o'tish → 409 Conflict
⚠️ Har o'tishda: timestamp yoziladi + WS xabar + audit log
```

```python
# apps/orders/state.py
ALLOWED = {
    'new':      {'accepted', 'cancelled'},
    'accepted': {'cooking', 'cancelled'},
    'cooking':  {'ready', 'cancelled'},
    'ready':    {'served', 'cancelled'},
    'served':   {'paid', 'cancelled'},
    'paid':     set(),
    'cancelled':set(),
}

def transition(order, new_status, actor=None):
    if new_status not in ALLOWED[order.status]:
        raise InvalidTransition(f"{order.status} → {new_status} mumkin emas")
    with transaction.atomic():
        old = order.status
        order.status = new_status
        setattr(order, f'{new_status}_at', timezone.now())
        order.save(update_fields=['status', f'{new_status}_at', 'updated_at'])
        AuditLog.log(order, old, new_status, actor)
    transaction.on_commit(lambda: broadcast_order_status(order))
```

#### Qolgan jadvallar (qisqacha)

| Model | Asosiy maydonlar |
|---|---|
| `OrderItem` | order, dish, qty(int), price, modifiers(JSON), note, ar_viewed(bool) |
| `DishModifier` | dish, name_uz/ru/en, price_delta, is_default, group |
| `Guest` | restaurant, device_token(UUID), phone, name, tg_user_id, bonus, visits, total_spent |
| `GuestSession` | guest, table, started_at, ended_at, order_count |
| `Staff` | restaurant, user, role, pin_hash, tables[], is_active, tips_balance |
| `Payment` | order, provider, amount, status, ext_id, idempotency_key, paid_at |
| `Tip` | order, staff, amount, payment, created_at |
| `FiscalReceipt` | order, ofd_provider, fiscal_id, qr_url, status, sent_at, retry_count |
| `Call` | table, type, status, created_at, resolved_at, resolved_by |
| `Review` | order, guest, rating, rating_food, rating_service, text, redirected_to_google |
| `Job` | queue, type, payload(JSON), status, attempts, heartbeat_at, result |
| `AuditLog` | restaurant, actor, action, model, object_id, old, new, ip, ts |
| `AIUsage` | restaurant, provider, model, tokens_in, tokens_out, cost_usd, ts |
| `AnalyticsEvent` | (ClickHouse'ga) restaurant, type, payload, ts |

---

## 2. 🔌 API SPETSIFIKATSIYASI

### 2.1 Umumiy qoidalar

| Qoida | Qiymat |
|---|---|
| Baza URL | `https://api.armenu.uz/v1/` |
| Format | JSON (UTF-8) |
| Auth (mijoz) | yo'q (session cookie) |
| Auth (xodim) | `Authorization: Bearer <JWT>` |
| Auth (admin) | `Authorization: Bearer <JWT>` |
| Idempotency | `X-Idempotency-Key: <uuid>` (POST/PUT) |
| Til | `?lang=uz|ru|en` yoki `Accept-Language` |
| Versiyalash | URL'da `/v1/` |
| Sahifalash | `?page=1&page_size=50` (maks 200) |
| Rate limit | Header: `X-RateLimit-Remaining` |

### 2.2 Xato formati (yagona)

```json
{
  "error": {
    "code": "DISH_UNAVAILABLE",
    "message_uz": "Bu taom hozir mavjud emas",
    "message_ru": "Это блюдо сейчас недоступно",
    "message_en": "This dish is currently unavailable",
    "details": {"dish_id": 15, "dish_name": "Lag'mon"},
    "trace_id": "a3f2c891-..."
  }
}
```

**Xato kodlari:**

| Kod | HTTP | Ma'no |
|---|---|---|
| `QR_INVALID` | 404 | QR token topilmadi |
| `RESTAURANT_INACTIVE` | 403 | Restoran nofaol |
| `TABLE_INACTIVE` | 403 | Stol nofaol |
| `DISH_UNAVAILABLE` | 409 | Taom stop-listda |
| `PRICE_CHANGED` | 409 | Narx o'zgargan |
| `INVALID_TRANSITION` | 409 | Holat o'tishi mumkin emas |
| `PLAN_LIMIT` | 402 | Tarif limiti |
| `RATE_LIMITED` | 429 | Ko'p so'rov |
| `TENANT_MISMATCH` | 403 | Boshqa restoran resursi ⚡ |
| `VALIDATION_ERROR` | 400 | Ma'lumot noto'g'ri |
| `SERVICE_UNAVAILABLE` | 503 | Tashqi xizmat yiqilgan |

### 2.3 Endpointlar (to'liq ro'yxat)

#### 👤 MIJOZ (auth yo'q)

```http
GET    /t/{qr_token}                      # QR kirish → redirect
GET    /v1/menu/{slug}/?lang=uz           # To'liq menyu (cache 60s)
GET    /v1/menu/{slug}/search/?q=osh      # Qidiruv
GET    /v1/dish/{id}/?lang=uz             # Taom tafsiloti
GET    /v1/ar/{dish_id}/                  # ⚡ 3D fayl URL'lari
POST   /v1/ar/view/                       # AR ko'rish yozuvi
POST   /v1/orders/                        # ⚡ Buyurtma yaratish
GET    /v1/orders/{id}/                   # Buyurtma holati
POST   /v1/orders/{id}/add-items/         # Qo'shimcha buyurtma
GET    /v1/orders/session/{sid}/          # Sessiya buyurtmalari
POST   /v1/calls/                         # Chaqiruv
GET    /v1/bill/{session_id}/             # Hisob
POST   /v1/payments/                      # To'lov boshlash
POST   /v1/payments/webhook/{provider}/   # Provayder callback
POST   /v1/tips/                          # Choychaqa
POST   /v1/reviews/                       # Otziv
POST   /v1/ai/chat/                       # AI chatbot
POST   /v1/lang/                          # Til o'zgartirish
```

#### 🧑‍🍳 XODIM (JWT)

```http
POST   /v1/staff/login/                   # PIN bilan kirish
POST   /v1/staff/refresh/                 # Token yangilash
GET    /v1/staff/me/                      # Profil
GET    /v1/staff/orders/?status=new       # Buyurtmalar
POST   /v1/staff/orders/{id}/accept/      # Qabul qilish
POST   /v1/staff/orders/{id}/cook/        # Tayyorlashni boshlash (KDS)
POST   /v1/staff/orders/{id}/ready/       # Tayyor (KDS)
POST   /v1/staff/orders/{id}/serve/       # Olib bordim
POST   /v1/staff/orders/{id}/cancel/      # Bekor qilish
POST   /v1/staff/orders/                  # Ofitsiant buyurtma kiritadi
GET    /v1/staff/tables/                  # Zal + stollar holati
GET    /v1/staff/calls/                   # Chaqiruvlar
POST   /v1/staff/calls/{id}/resolve/      # Chaqiruv bajarildi
POST   /v1/staff/dishes/{id}/stop/        # Stop-list
GET    /v1/staff/stats/                   # Mening statistikam
POST   /v1/staff/shift/start|end/         # Smena
```

#### 👨‍💼 ADMIN (JWT)

```http
GET    /v1/admin/dashboard/               # Real-time ko'rsatkichlar
CRUD   /v1/admin/categories/
CRUD   /v1/admin/dishes/
POST   /v1/admin/dishes/bulk-import/      # Excel/CSV import
CRUD   /v1/admin/modifiers/
CRUD   /v1/admin/halls/
CRUD   /v1/admin/tables/
POST   /v1/admin/tables/{id}/regen-qr/    # QR yangilash
GET    /v1/admin/tables/qr-pdf/           # ⚡ QR PDF yuklab olish
CRUD   /v1/admin/staff/
GET    /v1/admin/orders/                  # Filtr + eksport
GET    /v1/admin/reports/sales/           # Savdo hisoboti
GET    /v1/admin/reports/dishes/          # Taomlar hisoboti
GET    /v1/admin/reports/menu-engineering/# ⚡ Yulduz/Ot/Jumboq/It
GET    /v1/admin/reports/ar-analytics/    # ⚡ AR ta'siri
GET    /v1/admin/reports/staff/           # Xodim ish faoliyati
POST   /v1/admin/ar/generate/             # ⚡ 3D model yaratish
GET    /v1/admin/ar/jobs/                 # Generatsiya holati
POST   /v1/admin/ar/upload/               # Qo'lda model yuklash
GET    /v1/admin/ar/library/search/       # Kutubxonadan qidirish
POST   /v1/admin/i18n/auto-translate/     # ⚡ AI tarjima
CRUD   /v1/admin/reviews/
CRUD   /v1/admin/promos/
GET/PUT /v1/admin/settings/
GET/PUT /v1/admin/fiscal/                 # OFD sozlamalari
GET    /v1/admin/subscription/            # Tarif
POST   /v1/admin/subscription/upgrade/
GET    /v1/admin/export/                  # To'liq ma'lumot eksporti
```

#### 🔧 SUPER-ADMIN

```http
CRUD   /v1/platform/restaurants/
GET    /v1/platform/health/               # Tizim salomatligi
CRUD   /v1/platform/library/              # ⚡ 3D kutubxona
GET    /v1/platform/finance/              # Obunalar, daromad
GET    /v1/platform/ai-usage/             # AI xarajatlari
POST   /v1/platform/broadcast/            # Barcha restoranga xabar
```

### 2.4 Muhim endpointlar — to'liq spetsifikatsiya

#### `GET /v1/menu/{slug}/` — menyu (eng ko'p chaqiriladigan)

**So'rov:**
```http
GET /v1/menu/registon/?lang=uz&table=5
Accept-Language: uz
If-None-Match: "v42-uz"
```

**Javob (200):**
```json
{
  "restaurant": {
    "id": 1, "slug": "registon", "name": "Registon",
    "logo": "https://cdn.../logo.webp",
    "colors": {"primary": "#E85D2A", "accent": "#1A1A2E"},
    "langs": ["uz", "ru", "en"],
    "service_fee_pct": 10,
    "has_ar": true
  },
  "table": {"id": 5, "number": "5", "hall": "1-qavat"},
  "categories": [
    {"id": 1, "name": "Milliy taomlar", "icon": "🍛", "order": 1}
  ],
  "dishes": [
    {
      "id": 15,
      "cat": 1,
      "name": "Osh (Palov)",
      "desc": "Toshkent usulida...",
      "price": 45000,
      "old_price": null,
      "img": "https://cdn.../osh_400.webp",
      "weight_g": 400,
      "cook_min": 20,
      "allergens": [],
      "diet": ["halal", "no_spicy"],
      "has_3d": true,
      "poster_3d": "https://cdn.../osh_poster.webp",
      "is_hit": true,
      "rating": 4.8,
      "available": true,
      "modifiers": [
        {"id": 3, "name": "Qo'shimcha go'sht", "price": 25000, "group": "extra"}
      ]
    }
  ],
  "upsell_rules": [
    {"trigger": [15], "suggest": 42, "text": "Oshga achchiq-chuchuk salat?"}
  ],
  "version": 42,
  "cached_at": "2026-09-04T14:32:00Z"
}
```

**Headers:** `ETag: "v42-uz"`, `Cache-Control: public, max-age=60`

**Kesh strategiyasi:**
```
1. Brauzer localStorage (5 daq)
2. CDN (60s, ETag)
3. Redis: menu:{slug}:{lang}:v{version} (60s)
4. DB (oxirgi chora)

⚡ Invalidation: admin menyuni o'zgartirsa → Restaurant.menu_version += 1
   → barcha kesh kaliti o'zgaradi → yangi ma'lumot
```

#### `POST /v1/orders/` — buyurtma yaratish (eng kritik)

**So'rov:**
```http
POST /v1/orders/
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "session_id": "gs_a3f2c891",
  "table_id": 5,
  "items": [
    {"dish_id": 15, "qty": 2, "modifiers": [3], "note": "achchiq qilmang", "ar_viewed": true},
    {"dish_id": 42, "qty": 1, "modifiers": [], "note": "", "ar_viewed": false}
  ],
  "note": "Tez bo'lsa yaxshi"
}
```

**Javob (201):**
```json
{
  "id": 1047,
  "number": "#047",
  "status": "new",
  "subtotal": 158000,
  "service_fee": 15800,
  "total": 173800,
  "eta_min": 18,
  "created_at": "2026-09-04T14:32:15Z",
  "items": [...]
}
```

**Backend validatsiya ketma-ketligi (qat'iy tartib):**

```python
# apps/orders/services.py::create_order

def create_order(session, table_id, items, note, idem_key):
    # 1. Idempotency (Redis, TTL 24s)
    existing = check_idempotency(idem_key)
    if existing: return existing                          # dublikat yo'q ✅

    # 2. Stol tekshiruvi (tenant scope!)
    table = Table.objects.select_related('restaurant').get(
        id=table_id, restaurant_id=session.restaurant_id, is_active=True)

    # 3. Restoran faolmi
    if not table.restaurant.is_active: raise RestaurantInactive()

    # 4. Taomlar tekshiruvi (BITTA so'rov, N+1 yo'q)
    dish_ids = [i['dish_id'] for i in items]
    dishes = {d.id: d for d in Dish.objects.filter(
        id__in=dish_ids, restaurant_id=session.restaurant_id
    ).prefetch_related('modifiers')}

    if len(dishes) != len(set(dish_ids)): raise TenantMismatch()

    # 5. Mavjudlik (stop-list)
    for i in items:
        d = dishes[i['dish_id']]
        if not d.is_available: raise DishUnavailable(d)

    # 6. ⚡ NARX SERVERDA HISOBLANADI (frontendga ISHONILMAYDI)
    subtotal = Decimal(0)
    order_items = []
    for i in items:
        d = dishes[i['dish_id']]
        qty = max(1, min(99, int(math.ceil(i['qty']))))    # butun son ⚡
        mod_sum = sum(m.price_delta for m in d.modifiers.filter(id__in=i['modifiers']))
        line = (d.price + mod_sum) * qty
        subtotal += line
        order_items.append(OrderItem(dish=d, qty=qty, price=d.price + mod_sum,
                                     modifiers=i['modifiers'], note=i['note'][:200],
                                     ar_viewed=i.get('ar_viewed', False)))

    service_fee = subtotal * table.restaurant.service_fee_pct / 100
    total = subtotal + service_fee

    # 7. Transaksiya
    with transaction.atomic():
        order = Order.objects.create(
            restaurant_id=session.restaurant_id, table=table, guest=session.guest,
            session_id=session.id, number=next_number(table.restaurant),
            subtotal=subtotal, service_fee=service_fee, total=total,
            note=note[:500], eta_min=max(d.cook_min for d in dishes.values()),
            idempotency_key=idem_key, source='qr',
        )
        for oi in order_items: oi.order = order
        OrderItem.objects.bulk_create(order_items)
        table.status = 'ordering'; table.save(update_fields=['status'])

    # 8. Post-commit (transaksiya muvaffaqiyatli bo'lgandan KEYIN)
    transaction.on_commit(lambda: _after_order_created(order))

    save_idempotency(idem_key, order)
    return order


def _after_order_created(order):
    r = order.restaurant_id
    ws_group_send(f'rest_{r}_kds',     {'type':'order.new',     'order': serialize(order)})
    ws_group_send(f'rest_{r}_waiters', {'type':'order.new',     'order': serialize_short(order)})
    ws_group_send(f'rest_{r}_admin',   {'type':'order.new',     'order': serialize_short(order)})
    ws_group_send(f'guest_{order.session_id}', {'type':'order.created', 'id': order.id})

    enqueue('notify',    'waiter_new_order', order_id=order.id)
    enqueue('notify',    'kitchen_print',    order_id=order.id)
    enqueue('analytics', 'order_created',    order_id=order.id)
```

---

## 3. 📡 WEBSOCKET SPETSIFIKATSIYASI

### 3.1 Ulanish nuqtalari

| URL | Kim | Guruh |
|---|---|---|
| `/ws/guest/{session_id}/` | Mijoz | `guest_{session_id}` |
| `/ws/staff/{token}/` | Ofitsiant | `rest_{id}_waiters` + `staff_{id}` |
| `/ws/kds/{token}/` | Oshxona | `rest_{id}_kds` |
| `/ws/admin/{token}/` | Admin | `rest_{id}_admin` |

⚠️ **Guruhlar HAR DOIM restoran-scoped** — cross-tenant xabar mumkin emas.

### 3.2 Xabar formati

```json
{
  "type": "order.new",
  "ts": "2026-09-04T14:32:15Z",
  "data": { ... },
  "seq": 1047
}
```

### 3.3 Xabar turlari

| Type | Yo'nalish | Ma'no |
|---|---|---|
| `order.new` | S→KDS/waiter/admin | Yangi buyurtma |
| `order.status` | S→guest/all | Holat o'zgardi |
| `order.ready` | S→waiter | 🔔 Tayyor! |
| `order.cancelled` | S→all | Bekor qilindi |
| `call.new` | S→waiter | Mijoz chaqirdi |
| `call.resolved` | S→guest | Bajarildi |
| `table.status` | S→admin/waiter | Stol holati |
| `table.scanned` | S→admin | QR skanerlandi |
| `payment.success` | S→guest/cashier | To'lov o'tdi |
| `dish.stopped` | S→all | Taom tugadi |
| `model3d.ready` | S→admin | 3D tayyor |
| `alert.*` | S→admin | Ogohlantirish |
| `ping`/`pong` | ↔ | Heartbeat (25s) |

### 3.4 Klient tomonda ishonchlilik

```javascript
class ReliableWS {
  constructor(url) {
    this.url = url; this.retries = 0; this.lastSeq = 0;
    this.connect();
  }
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retries = 0;
      this.startHeartbeat();
      this.syncMissed();                    // ⚡ o'tkazib yuborilganlarni olish
    };
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.seq && m.seq <= this.lastSeq) return;   // dublikat
      this.lastSeq = m.seq || this.lastSeq;
      this.handle(m);
    };
    this.ws.onclose = () => {
      this.stopHeartbeat();
      const delay = Math.min(1000 * 2 ** this.retries, 30000);  // exponential
      const jitter = delay * (0.8 + Math.random() * 0.4);
      this.retries++;
      setTimeout(() => this.connect(), jitter);
      if (this.retries > 3) this.startPolling();    // ⚡ fallback
    };
  }
  async syncMissed() {
    // WS uzilgan paytdagi o'zgarishlarni REST orqali olish
    const r = await fetch(`/v1/sync/?since_seq=${this.lastSeq}`);
    (await r.json()).events.forEach(m => this.handle(m));
  }
  startPolling() { /* har 10s REST so'rov */ }
}
```

---

**➡️ Keyingi qism:** [05_KOD_YOZISH_TARTIBI.md](05_KOD_YOZISH_TARTIBI.md)
