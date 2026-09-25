# ARMENU — TIZIM ARXITEKTURASI
## QISM 3 — MA'LUMOT ARXITEKTURASI

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** DBA · backend arxitektor · dasturchi · SRE
**Oldingi:** `02_KOMPONENTLAR.md` · **Keyingi:** `04_MASSHTABLASH.md`

> Bu hujjat **ma'lumot qatlamining yagona haqiqat manbai**. Modellar ta'rifi
> `TZ_MASTER/04_DATA_MODEL_VA_API.md` da; bu yerda — **fizik dizayn**: hajm, indeks,
> partition, sharding, kesh, hayotiy sikl, migratsiya, butunlik.

---

## 1. ER DIAGRAMMA — TO'LIQ SXEMA

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        TENANT ILDIZI (multi-tenant o'q)                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

                            ┌───────────────────────┐
                            │      Restaurant       │  PK id
                            │  slug UQ · city · plan│  ⚡ menu_version (kesh)
                            └───────────┬───────────┘
      ┌─────────┬─────────┬─────────┬───┴─────┬─────────┬──────────┬──────────┐
      │1:N      │1:N      │1:N      │1:N      │1:N      │1:1       │1:N       │
 ┌────▼────┐┌───▼────┐┌───▼────┐┌───▼────┐┌───▼─────┐┌──▼──────┐┌──▼────────┐
 │  Hall   ││Category││ Staff  ││ Guest  ││Promo    ││Settings ││Subscription│
 │ plan_json│ order  ││role,pin││device_t││ rules   ││ JSONB   ││plan,expires│
 └────┬────┘└───┬────┘└───┬────┘└───┬────┘└─────────┘└─────────┘└───────────┘
      │1:N      │1:N      │         │1:N
 ┌────▼─────┐┌──▼───────────────┐   │      ┌──────────────┐
 │  Table   ││      Dish        │   └─────▶│ GuestSession │
 │ qr_token │││ price,ikpu_code │          │ started/ended│
 │ UQ,status│││ allergens[] GIN │          └──────┬───────┘
 │ FK rest ⚡│││ diet_tags[] GIN │                 │
 └────┬─────┘││ has_3d, rating  │                 │
      │      ││ FK rest ⚡(denorm)│                │
      │      └──┬──────────┬─────┘                │
      │         │1:1       │1:N                   │
      │    ┌────▼──────┐┌──▼──────────┐           │
      │    │DishModel3D││DishModifier │           │
      │    │glb,usdz   ││price_delta  │           │
      │    │status,prog││group        │           │
      │    └────┬──────┘└──┬──────────┘           │
      │         │N:1       │                      │
      │    ┌────▼──────────▼──────┐               │
      │    │   ⭐ DishLibrary     │  ◀── GLOBAL (restaurant_id YO'Q)
      │    │  key UQ · aliases[]  │      Barcha tenant o'qiydi
      │    │  embedding vector(768)│      Faqat super-admin yozadi
      │    │  glb_url · usdz_url  │
      │    └──────────────────────┘
      │
      └───────────────────┬──────────────────────────────────┐
                          │                                  │
                ╔═════════▼══════════╗              ╔════════▼═════════╗
                ║   TRANZAKSION      ║              ║    ANALITIK      ║
                ╚════════════════════╝              ╚══════════════════╝
                ┌────────────────────┐              ┌──────────────────┐
                │      Order         │              │     ARView       │
                │ number,status      │              │ mode,duration    │
                │ subtotal,total     │              │ converted        │
                │ idempotency_key UQ │              │ ⚡ PARTITION oy   │
                │ ⚡ PARTITION oy     │              └──────────────────┘
                └─────────┬──────────┘              ┌──────────────────┐
      ┌───────┬───────────┼───────────┬─────────┐   │ AnalyticsEvent   │
      │1:N    │1:N        │1:N        │1:1      │   │ type, payload    │
 ┌────▼────┐┌─▼──────┐┌───▼───┐┌──────▼───────┐ │   │ ⚡ PARTITION kun  │
 │OrderItem││Payment ││  Tip  ││FiscalReceipt │ │   │ → ClickHouse     │
 │qty,price││provider││staff  ││fiscal_id     │ │   └──────────────────┘
 │modifiers││ext_id  ││amount ││qr_url,retry  │ │   ┌──────────────────┐
 │ar_viewed││idem UQ ││       ││status        │ │   │    AIUsage       │
 └─────────┘└────────┘└───────┘└──────────────┘ │   │ tokens, cost_usd │
      │1:N                                       │   └──────────────────┘
 ┌────▼────┐                                     │
 │ Review  │◀────────────────────────────────────┘
 │ rating  │
 │ google  │
 └─────────┘

                ╔══════════════════════════════════════╗
                ║          TEXNIK / XIZMAT             ║
                ╚══════════════════════════════════════╝
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │     Job      │  │   AuditLog   │  │     Call     │  │ IdempotencyKey│
   │ queue,type   │  │ actor,action │  │ table,type   │  │  (Redis+DB)  │
   │ payload JSONB│  │ old/new JSONB│  │ status       │  │  TTL 24 soat │
   │ heartbeat_at │  │ ip, ts       │  │ resolved_by  │  └──────────────┘
   └──────────────┘  └──────────────┘  └──────────────┘

LEGENDA:
  UQ  = unique constraint          ⚡  = ishlash uchun maxsus qaror
  GIN = GIN indeks (array)         ⭐  = platformaning asosiy aktivi
  denorm = denormalizatsiya (JOIN'ni yo'q qilish uchun)
```

### 1.1 Bog'lanish kardinalliklari

| Ota | → | Bola | Kardinallik | on_delete | Sabab |
|---|---|---|---|---|---|
| Restaurant | → | Hall | 1:N | CASCADE | Restoran o'chsa zal ma'nosiz |
| Hall | → | Table | 1:N | CASCADE | — |
| Restaurant | → | Table | 1:N | CASCADE | ⚡ **denorm FK** — `hall` orqali JOIN'siz filtr |
| Restaurant | → | Category | 1:N | CASCADE | — |
| Category | → | Dish | 1:N | CASCADE | — |
| Restaurant | → | Dish | 1:N | CASCADE | ⚡ **denorm FK** — menyu so'rovi 1 JOIN kam |
| Dish | → | DishModel3D | 1:1 | CASCADE | Taom o'chsa model kerak emas |
| DishLibrary | → | DishModel3D | 1:N | **SET_NULL** | ⚡ Kutubxona yozuvi o'chsa restoran modeli qolsin |
| Restaurant | → | Order | 1:N | **PROTECT** | 🔴 Moliyaviy hujjat — hech qachon kaskad o'chirilmaydi |
| Table | → | Order | 1:N | SET_NULL | Stol o'chsa buyurtma tarixi qolsin |
| Order | → | OrderItem | 1:N | CASCADE | Item mustaqil ma'noga ega emas |
| Order | → | Payment | 1:N | PROTECT | 🔴 To'lov yozuvi buzilmaydi |
| Order | → | FiscalReceipt | 1:1 | PROTECT | 🔴 Soliq hujjati |
| Guest | → | Order | 1:N | SET_NULL | 🟡 GDPR — mehmon o'chsa buyurtma anonimlashadi |

---

## 2. JADVALLAR TASNIFI — 4 SINF

Har jadval **aniq bir sinfga** tegishli. Sinf → indeks, partition, backup, o'chirish
siyosatini belgilaydi.

```
┌────────────────────────────────────────────────────────────────────────┐
│  A. TENANT-SCOPED (restaurant_id BOR) — 19 jadval                      │
│     🔴 Qoida: HAR so'rovda restaurant_id filtri MAJBURIY               │
│     Backup: to'liq · Sharding kaliti: restaurant_id                    │
├────────────────────────────────────────────────────────────────────────┤
│  B. GLOBAL (restaurant_id YO'Q) — 3 jadval                             │
│     🟢 Barcha tenant o'qiydi, faqat super-admin yozadi                 │
│     Backup: to'liq · Sharding: REPLIKATSIYA (har shardda nusxa)        │
├────────────────────────────────────────────────────────────────────────┤
│  C. ANALITIK (ko'p yoziladi, kam o'qiladi) — 4 jadval                  │
│     🟡 Partition MAJBURIY · Arxiv S3 · PITR shart emas                 │
├────────────────────────────────────────────────────────────────────────┤
│  D. TEXNIK (tizim ishlashi uchun) — 5 jadval                           │
│     ⚪ Qisqa umr · Avtomatik tozalanadi                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 To'liq tasnif jadvali

| Jadval | Sinf | tenant kaliti | Partition | Backup PITR | Auto-tozalash |
|---|---|---|---|---|---|
| `restaurants_restaurant` | A | `id` (o'zi) | ❌ | ✅ | ❌ |
| `tables_hall` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `tables_table` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `menu_category` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `menu_dish` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `menu_dishmodifier` | A | `dish→restaurant` | ❌ | ✅ | ❌ |
| `ar3d_dishmodel3d` | A | `dish→restaurant` | ❌ | ✅ | ❌ |
| `accounts_staff` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `guest_guest` | A | `restaurant_id` | ❌ | ✅ | 🟡 2 yil passiv |
| `guest_guestsession` | A | `guest→restaurant` | ❌ | ✅ | 🟡 1 yil |
| `orders_order` | A | `restaurant_id` | ⚡ **oy (RANGE)** | ✅ | ❌ (arxiv) |
| `orders_orderitem` | A | `order→restaurant` | ⚡ oy (order bilan) | ✅ | ❌ |
| `payments_payment` | A | `order→restaurant` | ❌ | ✅ 🔴 | ❌ |
| `payments_tip` | A | `order→restaurant` | ❌ | ✅ | ❌ |
| `fiscal_fiscalreceipt` | A | `order→restaurant` | ❌ | ✅ 🔴 | ❌ |
| `orders_call` | A | `table→restaurant` | ❌ | ⚪ | ✅ 90 kun |
| `reviews_review` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| `billing_subscription` | A | `restaurant_id` | ❌ | ✅ 🔴 | ❌ |
| `tenants_settings` | A | `restaurant_id` | ❌ | ✅ | ❌ |
| **`ar3d_dishlibrary`** ⭐ | **B** | — | ❌ | ✅ 🔴 | ❌ |
| `menu_ikpu_catalog` | B | — | ❌ | ✅ | ❌ |
| `i18n_translation_cache` | B | — | ❌ | ⚪ | ✅ 180 kun |
| `ar3d_arview` | C | `restaurant_id` | ⚡ **oy (RANGE)** | ⚪ | ✅ 13 oy → S3 |
| `analytics_analyticsevent` | C | `restaurant_id` | ⚡ **kun (RANGE)** | ⚪ | ✅ 90 kun → CH |
| `ai_aiusage` | C | `restaurant_id` | ⚡ oy | ✅ | ✅ 24 oy |
| `audit_auditlog` | C | `restaurant_id` | ⚡ oy | ✅ 🔴 | ✅ 5 yil (qonun) |
| `jobs_job` | D | payload ichida | ❌ | ⚪ | ✅ 7 kun (done) |
| `core_idempotencykey` | D | — | ❌ | ⚪ | ✅ 24 soat |
| `core_ratelimit` | D | — | ❌ (Redis) | ❌ | ✅ TTL |
| `core_featureflag` | D | — | ❌ | ✅ | ❌ |
| `core_healthcheck` | D | — | ❌ | ❌ | ✅ 24 soat |

**Belgilar:** 🔴 kritik (moliyaviy/huquqiy) · ✅ standart · ⚪ backup shart emas · 🟡 shartli

### 2.2 Nima uchun `DishLibrary` global

```
❌ AGAR har restoranga nusxa qilinsa:
   5 000 restoran × 60 taom × (GLB 2 MB + USDZ 3 MB) = 1 500 000 MB = 1,5 TB
   S3 narxi: 1,5 TB × $0,023 = $34,5/oy  +  CDN trafik ~$900/oy

✅ GLOBAL kutubxona (havola, nusxa emas):
   500 noyob taom × 5 MB = 2,5 GB
   S3 narxi: $0,06/oy  +  CDN kesh hit rate 99% (bir xil URL!)

   ⚡ TEJASH: storage 600× · CDN xarajati ~30× (bir fayl — million so'rov)
   ⚡ Bu shunchaki tejash emas — bu HIMOYA DEVORI (moat):
     raqobatchi 500 ta 3D modelni qaytadan yaratishi kerak.
```

---

## 3. HAJM VA O'SISH PROGNOZI (1 000 RESTORAN)

### 3.1 Asosiy taxminlar (hisob bazasi)

| Parametr | Qiymat | Izoh |
|---|---|---|
| Restoran soni | 1 000 | S3 bosqichi |
| O'rtacha stol / restoran | 25 | kichik 10, o'rta 25, katta 80 |
| O'rtacha taom / restoran | 60 | menyu hajmi |
| O'rtacha kategoriya | 8 | — |
| Xodim / restoran | 8 | ofitsiant 5, oshpaz 2, admin 1 |
| Stol aylanmasi / kun | 4 | bir stol kuniga 4 marta band |
| Buyurtma / restoran / kun | 25 × 4 = **100** | — |
| Taom / buyurtma | 3,5 | OrderItem koeffitsienti |
| AR ko'rish / buyurtma | 2,2 | 3D bor taomlar uchun |
| Analitik event / sessiya | 12 | sahifa, skroll, bosish, qidiruv |

### 3.2 Jadval hajmlari — hisob bilan

| Jadval | Formula | Boshlang'ich qator | Qator/kun | 1 yildan keyin | Qator hajmi | Jami (1 yil) |
|---|---|---|---|---|---|---|
| `restaurant` | 1 000 | 1 000 | +3 | 2 100 | ~2 KB | **4 MB** |
| `hall` | 1000×2 | 2 000 | +6 | 4 200 | ~1,5 KB | 6 MB |
| `table` | 1000×25 | 25 000 | +75 | 52 000 | ~250 B | 13 MB |
| `category` | 1000×8 | 8 000 | +24 | 16 800 | ~400 B | 7 MB |
| `dish` | 1000×60 | 60 000 | +200 | 133 000 | ~2,5 KB | **330 MB** |
| `dishmodifier` | dish×2,5 | 150 000 | +500 | 332 000 | ~300 B | 100 MB |
| `dishmodel3d` | dish×0,35 | 21 000 | +70 | 46 000 | ~600 B | 28 MB |
| `staff` | 1000×8 | 8 000 | +30 | 19 000 | ~500 B | 10 MB |
| `guest` | — | 0 | +18 000 | 6 570 000 | ~350 B | **2,3 GB** |
| `guestsession` | — | 0 | +100 000 | 36 500 000 | ~150 B | **5,5 GB** |
| **`order`** | — | 0 | **+100 000** | **36 500 000** | ~450 B | **16,4 GB** |
| **`orderitem`** | order×3,5 | 0 | **+350 000** | **127 750 000** | ~200 B | **25,6 GB** |
| `payment` | order×0,7 | 0 | +70 000 | 25 550 000 | ~300 B | 7,7 GB |
| `fiscalreceipt` | order×0,7 | 0 | +70 000 | 25 550 000 | ~400 B | 10,2 GB |
| `call` | — | 0 | +12 000 | (90 kun) 1 080 000 | ~150 B | 162 MB |
| `review` | order×0,08 | 0 | +8 000 | 2 920 000 | ~600 B | 1,8 GB |
| **`arview`** | — | 0 | **+220 000** | **80 300 000** | ~180 B | **14,5 GB** |
| **`analyticsevent`** | — | 0 | **+1 200 000** | (90 kun) 108 000 000 | ~250 B | **27 GB** |
| `auditlog` | — | 0 | +60 000 | 21 900 000 | ~500 B | 11 GB |
| `aiusage` | — | 0 | +5 000 | 1 825 000 | ~250 B | 456 MB |
| `job` | — | 0 | +40 000 | (7 kun) 280 000 | ~1 KB | 280 MB |
| `dishlibrary` ⭐ | — | 500 | +2 | 1 230 | ~4 KB | 5 MB |

**JAMI ma'lumot (1 yil, 1 000 restoran):**

```
Tranzaksion (A sinf)          ≈  70 GB
Analitik   (C sinf)           ≈  53 GB   → ClickHouse'ga ko'chiriladi
Texnik     (D sinf)           ≈   0,3 GB
─────────────────────────────────────────
XOM MA'LUMOT                  ≈ 123 GB
+ Indekslar (~45% jadval hajmi) ≈  55 GB
+ WAL + bloat rezervi (25%)     ≈  45 GB
═════════════════════════════════════════
DISK TALABI (1 yil)           ≈ 223 GB   → 500 GB NVMe olinadi (2× rezerv)
```

### 3.3 Issiq / iliq / sovuq taqsimoti

> **Issiq** = kuniga bir necha marta o'qiladi, RAM'da (shared_buffers) turishi kerak.
> **Iliq** = haftada o'qiladi, disk (NVMe) yetarli.
> **Sovuq** = deyarli o'qilmaydi, arxivga.

| Jadval | 🔥 Issiq | 🌡 Iliq | 🧊 Sovuq | Issiq ulush | Izoh |
|---|---|---|---|---|---|
| `restaurant` | butun | — | — | 100% | 4 MB — doim RAM'da |
| `dish` | butun | — | — | 100% | 330 MB — menyu asosi, doim RAM |
| `dishmodifier` | butun | — | — | 100% | 100 MB |
| `table` | butun | — | — | 100% | 13 MB — QR skanerlash |
| `dishlibrary` ⭐ | butun | — | — | 100% | 5 MB |
| `order` | oxirgi 2 kun | 30 kun | >30 kun | **0,5%** | 200k qator issiq (~90 MB) |
| `orderitem` | oxirgi 2 kun | 30 kun | >30 kun | **0,5%** | 700k qator (~140 MB) |
| `payment` | oxirgi 7 kun | 90 kun | >90 kun | 2% | sverka |
| `fiscalreceipt` | oxirgi 1 kun | 30 kun | >30 kun | 0,3% | retry uchun |
| `guest` | faol 30 kun | 1 yil | >1 yil | 8% | qayta tashrif |
| `arview` | joriy oy | 3 oy | >3 oy | 8% | dashboard |
| `analyticsevent` | joriy kun | 7 kun | >7 kun | 1% | ⚡ ClickHouse'da |
| `auditlog` | — | 30 kun | >30 kun | 0% | faqat tergovda |

**⚡ Muhim xulosa:**

```
Issiq ma'lumot jami ≈ 330 (dish) + 100 (mod) + 13 (table) + 4 (rest)
                      + 90 (order 2kun) + 140 (orderitem) + 200 (guest faol)
                      + 5 (library)  ≈  882 MB
Indeks (issiq qismi)                 ≈  600 MB
─────────────────────────────────────────────────
ISSIQ ISHCHI TO'PLAM                 ≈  1,5 GB

➜ PostgreSQL shared_buffers = 8 GB bo'lsa — BUTUN ISSIQ TO'PLAM RAM'DA ✅
➜ Disk o'qish faqat tarixiy hisobotlarda bo'ladi
➜ Shuning uchun 1 000 restoranda ham DB 8 CPU / 32 GB da yashaydi
```

---

## 4. INDEKS STRATEGIYASI

### 4.1 Indeks tanlash qoidalari (5 ta qat'iy)

| # | Qoida | Sabab |
|---|---|---|
| 1 | **Har tenant jadvalida `restaurant_id` birinchi ustun** | Barcha so'rov shu bilan boshlanadi → prefiks scan |
| 2 | Composite tartibi: **tenglik → diapazon → tartib** | B-tree faqat shu tartibda to'liq ishlaydi |
| 3 | **Selektivlik < 5% bo'lsa indeks qo'yilmaydi** | Planner baribir Seq Scan tanlaydi |
| 4 | Array ustunga **GIN**, matn qidiruvga **trgm**, vektorga **HNSW** | B-tree bu tiplarda ishlamaydi |
| 5 | **Partial indeks** — filtr doim bir xil bo'lsa | Hajm 10-50× kichik |

### 4.2 To'liq indeks jadvali

#### `menu_dish` — eng ko'p o'qiladigan jadval

| # | Indeks | Tur | Qaysi so'rov | Selektivlik | Hajm (133k qator) |
|---|---|---|---|---|---|
| D1 | `(restaurant_id, is_available, "order")` | B-tree | Menyu qurish (asosiy) | 1/1000 = 0,1% 🟢 | 4,5 MB |
| D2 | `(category_id, "order")` | B-tree | Kategoriya bo'yicha | 1/8000 🟢 | 3,8 MB |
| D3 | `(restaurant_id) WHERE has_3d` | B-tree partial | AR bor taomlar | 35% dan 0,035% 🟢 | 0,5 MB |
| D4 | `diet_tags` | **GIN** | `diet_tags @> ARRAY['vegan']` | 5-15% 🟡 | 2,1 MB |
| D5 | `allergens` | **GIN** | `NOT allergens && ARRAY['nuts']` | 10-20% 🟡 | 2,3 MB |
| D6 | `(name_uz gin_trgm_ops)` | **GIN trgm** | Qidiruv `ILIKE '%osh%'` | o'zgaruvchan | 12 MB |
| D7 | `ikpu_code` | B-tree | Fiskal sverka | 0,5% 🟢 | 2,8 MB |

```sql
-- D1: ASOSIY INDEKS — menyu so'rovining 100%i shu orqali
CREATE INDEX idx_dish_menu ON menu_dish (restaurant_id, is_available, "order")
    INCLUDE (category_id, price, has_3d);
-- ⚡ INCLUDE → INDEX-ONLY SCAN: jadvalga umuman murojaat qilinmaydi
--    Natija: 60 qator o'qish = 1 indeks bloki = ~0,15 ms

-- D3: PARTIAL — faqat 3D bor taomlar (35%)
CREATE INDEX idx_dish_has3d ON menu_dish (restaurant_id)
    WHERE has_3d = true AND is_available = true;
-- Hajm: to'liq indeksdan 3× kichik, AR sahifasi uchun ideal

-- D6: TRGM — qidiruv (uch tilli)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_dish_search ON menu_dish
    USING GIN ((name_uz || ' ' || name_ru || ' ' || name_en) gin_trgm_ops);
-- ⚠️ Faqat >100k qatorda foyda beradi; kichik restoranda Seq Scan tezroq
```

**Composite tartibi — nega aynan `(restaurant_id, is_available, "order")`:**

```
So'rov:  WHERE restaurant_id = 42 AND is_available = true ORDER BY "order"
         └── tenglik ──┘        └── tenglik ──┘           └─ tartib ─┘

✅ (restaurant_id, is_available, "order")
   → B-tree: 42 ni topadi → true ni topadi → "order" allaqachon saralangan
   → Sort qadamı YO'Q. Cost ≈ 8

❌ ("order", restaurant_id, is_available)
   → "order" bo'yicha butun jadvalni kezadi, keyin filtrlaydi
   → Cost ≈ 2400 (300× yomon)

❌ (restaurant_id, "order", is_available)
   → is_available filtri indeksdan KEYIN qo'llanadi (Filter, Index Cond emas)
   → 60 o'rniga 95 qator o'qiladi + qo'shimcha filtr
```

#### `orders_order` — yozish og'ir, o'qish ko'p

| # | Indeks | Tur | So'rov | Selektivlik | Izoh |
|---|---|---|---|---|---|
| O1 | `(restaurant_id, status, created_at DESC)` | B-tree | KDS/ofitsiant paneli | 0,01% 🟢 | Har partitionda |
| O2 | `(restaurant_id, created_at DESC)` | B-tree | Hisobotlar | 0,1% 🟢 | — |
| O3 | `(table_id, status)` | B-tree | Stol holati | 0,004% 🟢 | — |
| O4 | `idempotency_key` | B-tree **UNIQUE** | Dublikat bloki | 1 qator 🟢 | 🔴 kritik |
| O5 | `(restaurant_id, number, created_at::date)` | B-tree UNIQUE | Kunlik raqam | 1 qator 🟢 | — |
| O6 | `(restaurant_id) WHERE status IN ('new','accepted','cooking')` | partial | ⚡ **Faol buyurtmalar** | 0,05% 🟢 | Eng issiq |

```sql
-- O6: ENG MUHIM PARTIAL INDEKS
CREATE INDEX idx_order_active ON orders_order (restaurant_id, created_at)
    WHERE status IN ('new', 'accepted', 'cooking', 'ready');

-- Hisob: 1 000 restoran × 36,5 mln qator, lekin faol — bir vaqtda ~5 000 ta
-- To'liq indeks:   36 500 000 qator × 40 B = 1 460 MB
-- Partial indeks:       5 000 qator × 40 B =   0,2 MB  ⚡ 7300× kichik!
-- ➜ Butunlay RAM'da, KDS so'rovi p99 < 2 ms
```

#### `ar3d_dishlibrary` — pgvector semantik qidiruv

| # | Indeks | Tur | So'rov |
|---|---|---|---|
| L1 | `key` UNIQUE | B-tree | To'g'ridan-to'g'ri olish |
| L2 | `(category_key, is_active)` | B-tree | Kategoriya ko'rish |
| L3 | `aliases` | **GIN** | Nom bo'yicha moslash |
| L4 | `embedding` | **HNSW** | ⚡ Semantik qidiruv |
| L5 | `(-used_by_count)` | B-tree | Mashhurlar |

```sql
-- L4: HNSW — ANN (approximate nearest neighbour)
CREATE INDEX idx_library_embedding ON ar3d_dishlibrary
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Parametr tanlovi (1 230 qator uchun):
--   m = 16              → har tugun 16 bog'lanish (default, kichik to'plamga yetarli)
--   ef_construction=64  → qurish sifati (yuqori = sekin qurish, aniqroq qidiruv)
--   ef_search = 40      → so'rovda (SET hnsw.ef_search = 40)
--
-- Hajm: 1 230 × 768 × 4 B (float) = 3,8 MB vektor + ~1,2 MB graf = 5 MB
-- Tezlik: IVFFlat 12 ms → HNSW 0,8 ms (15× tez)
-- Aniqlik (recall@10): 0,98
--
-- ⚠️ NEGA IVFFlat EMAS: IVFFlat qurishdan oldin ma'lumot bo'lishini talab qiladi
--    va yangi yozuvlarda sifat tushadi. Kutubxona doim o'sadi → HNSW.
```

**Moslashtirish so'rovi (yangi taom qo'shilganda):**

```python
# apps/ar3d/services/library_match.py
def match_library(dish: Dish) -> list[tuple[DishLibrary, float]]:
    """3 bosqichli moslashtirish — arzondan qimmatga."""

    # 1-BOSQICH: aniq alias (GIN, ~0,2 ms, bepul)
    exact = DishLibrary.objects.filter(
        aliases__overlap=[dish.name_uz.lower(), dish.name_ru.lower()],
        is_active=True,
    ).first()
    if exact:
        return [(exact, 1.0)]

    # 2-BOSQICH: trigram o'xshashlik (~1,5 ms, bepul)
    fuzzy = DishLibrary.objects.annotate(
        sim=TrigramSimilarity('name_uz', dish.name_uz)
    ).filter(sim__gt=0.45, is_active=True).order_by('-sim')[:3]
    if fuzzy and fuzzy[0].sim > 0.75:
        return [(x, float(x.sim)) for x in fuzzy]

    # 3-BOSQICH: semantik (HNSW, ~0,8 ms + embedding narxi $0,00002)
    emb = get_embedding(f"{dish.name_uz} {dish.desc_uz[:200]}")   # keshlanadi
    return DishLibrary.objects.filter(is_active=True).annotate(
        dist=CosineDistance('embedding', emb)
    ).order_by('dist')[:5]
```

#### Qolgan jadvallar — indeks xulosasi

| Jadval | Indekslar | Jami hajm |
|---|---|---|
| `table` | `qr_token` UQ · `(restaurant_id, status)` · `(restaurant_id, number)` UQ | 6 MB |
| `orderitem` | `(order_id)` · `(dish_id, created_at)` [hisobot] | 9 GB |
| `payment` | `(order_id)` · `idempotency_key` UQ · `(provider, ext_id)` UQ · `(status, created_at) WHERE status='pending'` | 2,5 GB |
| `fiscalreceipt` | `(order_id)` UQ · `(status, retry_count) WHERE status != 'ok'` ⚡ | 1,1 GB |
| `guest` | `(restaurant_id, device_token)` UQ · `(restaurant_id, phone)` · `tg_user_id` | 1,2 GB |
| `arview` | `(restaurant_id, created_at)` · `(dish_id, created_at)` · `session_id` | 5,8 GB |
| `job` | `(queue, status, id) WHERE status IN ('pending','running')` ⚡ | 12 MB |
| `auditlog` | `(restaurant_id, created_at DESC)` · `(model, object_id)` | 4 GB |

```sql
-- Job navbat indeksi — polling har 200 ms da bo'ladi, tez bo'lishi SHART
CREATE INDEX idx_job_queue ON jobs_job (queue, priority DESC, id)
    WHERE status IN ('pending', 'running');
-- 280 000 qatordan faqat ~200 tasi shu holatda → indeks 12 KB, RAM'da

-- Fiskal retry indeksi — self-healing daemon har 60s da o'qiydi
CREATE INDEX idx_fiscal_retry ON fiscal_fiscalreceipt (retry_count, sent_at)
    WHERE status IN ('pending', 'failed') AND retry_count < 5;
-- 25 mln qatordan ~50 tasi → indeks 3 KB
```

### 4.3 Indeks byudjeti va nazorat

```
QOIDA: indekslar jami hajmi jadval hajmining 60% dan oshmasin.
       Oshsa — yozish tezligi tushadi (har INSERT N ta indeksni yangilaydi).

Hisob: OrderItem — 25,6 GB jadval, 9 GB indeks = 35% ✅
       Dish      — 330 MB jadval, 27 MB indeks = 8%  ✅
       ARView    — 14,5 GB jadval, 5,8 GB indeks = 40% 🟡 (partition bilan boshqariladi)
```

**Ishlatilmayotgan indeksni topish (oyda 1 marta):**

```sql
SELECT schemaname, relname AS jadval, indexrelname AS indeks,
       idx_scan AS ishlatilgan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS hajm
FROM pg_stat_user_indexes
WHERE idx_scan < 50                      -- deyarli ishlatilmagan
  AND indexrelname NOT LIKE '%_pkey'
  AND pg_relation_size(indexrelid) > 10*1024*1024
ORDER BY pg_relation_size(indexrelid) DESC;
-- Natija: bunday indeks O'CHIRILADI (yozishni sekinlashtiradi, foyda yo'q)
```

---

## 5. PARTITIONING

### 5.1 Nima uchun partition kerak

```
MUAMMO (partitionsiz, 3 yil):
  orders_order = 110 mln qator, 50 GB
  ├─ VACUUM: 4 soat (butun jadval)
  ├─ Indeks qayta qurish: 2 soat, jadval bloklanadi
  ├─ "2024 yilni o'chir" → DELETE 36 mln qator = 6 soat + bloat
  └─ Yangi ustun qo'shish: butun jadvalni qayta yozadi

YECHIM (oy bo'yicha partition):
  orders_order_2026_09 = 3 mln qator, 1,4 GB
  ├─ VACUUM: 5 daqiqa (faqat joriy partition)
  ├─ "2024 ni o'chir" → DETACH + DROP = 0,3 soniya ⚡
  ├─ Eski partition READ ONLY → hech qachon vacuum qilinmaydi
  └─ ⚡ PARTITION PRUNING: WHERE created_at >= '2026-09-01'
                          → planner faqat 1 partitionni ko'radi
```

### 5.2 Partition qilinadigan jadvallar

| Jadval | Kalit | Interval | Saqlash | Partition soni | Bir partition hajmi |
|---|---|---|---|---|---|
| `orders_order` | `created_at` | **OY** | 36 oy DB + arxiv | 36 + 3 kelajak | ~1,4 GB |
| `orders_orderitem` | `created_at` | **OY** | order bilan bir xil | 39 | ~2,2 GB |
| `ar3d_arview` | `created_at` | **OY** | 13 oy → S3 | 13 + 2 | ~1,2 GB |
| `analytics_analyticsevent` | `created_at` | **KUN** | 90 kun → ClickHouse | 90 + 7 | ~300 MB |
| `audit_auditlog` | `created_at` | **OY** | 60 oy (qonun) | 60 + 2 | ~200 MB |
| `ai_aiusage` | `created_at` | **OY** | 24 oy | 24 + 2 | ~20 MB |

### 5.3 Yaratish (Django + raw SQL)

Django `Meta.managed = False` + qo'lda partition boshqaruvi (django-postgres-extra
ishlatilmaydi — ortiqcha bog'liqlik).

```python
# apps/orders/models.py
class Order(models.Model):
    # ... maydonlar ...
    class Meta:
        db_table = 'orders_order'
        managed = True
        # ⚠️ PK = (id, created_at) — PostgreSQL partition kaliti PK ga kirishi SHART
        constraints = [
            models.UniqueConstraint(fields=['id', 'created_at'], name='order_pk_part'),
        ]
```

```sql
-- migrations/0002_partition_orders.py ichidagi RunSQL

-- 1. Ota jadval (partitioned)
CREATE TABLE orders_order (
    id            BIGSERIAL,
    restaurant_id BIGINT NOT NULL REFERENCES restaurants_restaurant(id),
    table_id      BIGINT NULL,
    number        VARCHAR(20) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'new',
    subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0,
    service_fee   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total         NUMERIC(14,2) NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(64),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ...
    PRIMARY KEY (id, created_at)          -- ⚡ partition kaliti PK da
) PARTITION BY RANGE (created_at);

-- 2. Indekslar OTA jadvalda — bolalarga avtomatik tarqaladi
CREATE INDEX ON orders_order (restaurant_id, status, created_at DESC);
CREATE INDEX ON orders_order (restaurant_id, created_at DESC);
CREATE UNIQUE INDEX ON orders_order (idempotency_key, created_at);

-- 3. DEFAULT partition — kalit hech qaysi diapazonga tushmasa (himoya to'ri)
CREATE TABLE orders_order_default PARTITION OF orders_order DEFAULT;
```

### 5.4 Avtomatik yaratish (cron)

```python
# apps/core/management/commands/ensure_partitions.py
"""
Har kuni 03:00 da ishlaydi (cron).
Kelajakdagi 3 oylik partition doim tayyor turadi.
⚡ QOIDA: partition tugab qolsa — INSERT DEFAULT'ga tushadi (yiqilmaydi),
   lekin ogohlantirish yuboriladi.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from dateutil.relativedelta import relativedelta
from datetime import date

OYLIK = {                       # jadval → nechta oy oldinga
    'orders_order':      3,
    'orders_orderitem':  3,
    'ar3d_arview':       3,
    'audit_auditlog':    3,
    'ai_aiusage':        3,
}
KUNLIK = {'analytics_analyticsevent': 7}


class Command(BaseCommand):
    help = "Kelajakdagi partitionlarni yaratadi (idempotent)"

    def handle(self, *args, **opts):
        with connection.cursor() as cur:
            for tbl, oy_soni in OYLIK.items():
                base = date.today().replace(day=1)
                for i in range(oy_soni + 1):
                    start = base + relativedelta(months=i)
                    end   = start + relativedelta(months=1)
                    name  = f"{tbl}_{start:%Y_%m}"
                    cur.execute(f"""
                        CREATE TABLE IF NOT EXISTS {name}
                        PARTITION OF {tbl}
                        FOR VALUES FROM ('{start}') TO ('{end}');
                    """)
                    self.stdout.write(f"  ✅ {name}")

            for tbl, kun_soni in KUNLIK.items():
                for i in range(kun_soni + 1):
                    start = date.today() + relativedelta(days=i)
                    end   = start + relativedelta(days=1)
                    name  = f"{tbl}_{start:%Y_%m_%d}"
                    cur.execute(f"""
                        CREATE TABLE IF NOT EXISTS {name}
                        PARTITION OF {tbl}
                        FOR VALUES FROM ('{start}') TO ('{end}');
                    """)
```

```cron
# /etc/cron.d/armenu-partitions
0 3 * * *  armenu  /opt/armenu/venv/bin/python /opt/armenu/manage.py ensure_partitions
30 3 * * 0 armenu  /opt/armenu/venv/bin/python /opt/armenu/manage.py archive_partitions
```

### 5.5 Arxivlash va o'chirish

```python
# apps/core/management/commands/archive_partitions.py
"""
Haftada 1 marta: eski partitionni S3'ga chiqarib, DB'dan uzadi.
⚡ DETACH → COPY → DROP tartibi. DETACH bloklamaydi (CONCURRENTLY).
"""
SAQLASH_OY = {
    'orders_order':      36,   # 3 yil — buxgalteriya talabi
    'orders_orderitem':  36,
    'ar3d_arview':       13,   # 13 oy — YoY solishtirish uchun
    'audit_auditlog':    60,   # 5 yil — O'zR qonuni
    'ai_aiusage':        24,
}

def archive(table: str, part: str, cutoff: date):
    with connection.cursor() as cur:
        # 1. Uzish — jadvalni bloklamaydi
        cur.execute(f"ALTER TABLE {table} DETACH PARTITION {part} CONCURRENTLY;")

    # 2. S3'ga eksport (Parquet — ClickHouse/Athena o'qiy oladi)
    path = f"s3://armenu-archive/{table}/{part}.parquet"
    export_to_parquet(part, path)          # COPY ... TO PROGRAM

    # 3. Tekshirish — qator soni mos keldimi
    if verify_row_count(part, path):
        with connection.cursor() as cur:
            cur.execute(f"DROP TABLE {part};")
        log.info("arxivlandi", table=table, part=part, path=path)
    else:
        alert("🔴 Arxiv qator soni mos kelmadi", part=part)   # DROP QILINMAYDI
```

```sql
-- Nima uchun DETACH CONCURRENTLY (PG 14+):
--   ALTER TABLE ... DETACH PARTITION      → ACCESS EXCLUSIVE lock, butun jadval bloklanadi
--   ALTER TABLE ... DETACH ... CONCURRENTLY → SHARE UPDATE EXCLUSIVE, o'qish/yozish davom etadi ✅
```

### 5.6 Partition pruning tekshiruvi

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, number, total FROM orders_order
WHERE restaurant_id = 42
  AND created_at >= '2026-09-01' AND created_at < '2026-10-01'
  AND status = 'paid';

-- ✅ KUTILGAN NATIJA:
--  Append  (cost=0.43..812.10 rows=1240)
--    ->  Index Scan using orders_order_2026_09_rest_status_idx
--          on orders_order_2026_09          ← FAQAT 1 PARTITION
--          Index Cond: (restaurant_id = 42 AND status = 'paid')
--          Buffers: shared hit=18
--
-- ❌ AGAR 36 ta partition ko'rinsa → pruning ishlamayapti.
--    Sabab odatda: created_at ga funksiya qo'llangan (DATE(created_at) = ...)
--    yoki parametr sifatida now() ishlatilgan (planner qiymatni bilmaydi).
```

---

## 6. SHARDING REJASI (S5 — 5 000+ RESTORAN)

### 6.1 Qachon kerak bo'ladi

> **Sharding — oxirgi chora.** Undan oldin: kesh → replica → partition → PgBouncer.

| Signal | Chegara | Ma'nosi |
|---|---|---|
| Write RPS | > 2 500 uzluksiz | Primary yozish limitiga yaqin (3 000) |
| WAL generatsiyasi | > 200 MB/min | Replikatsiya kechikadi |
| DB hajmi | > 2 TB | Backup vaqti 6 soatdan oshadi |
| `pg_stat_activity` kutish | lock_wait > 5% | Contention |
| Vertikal masshtab | 32 CPU / 128 GB yetmasa | Yo'l tugadi |

**Prognoz:** 1 000 restoran ≈ 300 write RPS. Sharding **5 000+ restoranda**
(≈1 500 write RPS bo'lganda tayyorgarlik, 2 500 da ijro).

### 6.2 Shard kaliti — `restaurant_id`

```
SABAB: 99,7% so'rov bitta restoran ichida.
       Cross-restaurant so'rov faqat: (a) platforma hisoboti, (b) DishLibrary.

shard_id = hash(restaurant_id) % SHARD_COUNT

⚠️ MUAMMO: SHARD_COUNT o'zgarsa — hamma ko'chadi (rehash).
✅ YECHIM: VIRTUAL SHARD (bucket) — sanoat standarti

   bucket_id = hash(restaurant_id) % 1024      ← HECH QACHON O'ZGARMAYDI
   shard_id  = bucket_map[bucket_id]           ← faqat xarita o'zgaradi

   4 shard → 8 shard: 1024 bucketning 512 tasi ko'chadi, formula o'sha-o'sha.
```

```
BUCKET → SHARD XARITASI (4 shard misolida)

  bucket    0 ─ 255   →  shard_0   (PG primary + replica)
  bucket  256 ─ 511   →  shard_1
  bucket  512 ─ 767   →  shard_2
  bucket  768 ─ 1023  →  shard_3

  bucket_map Redis'da + DB'da (core_shardmap jadvali), TTL yo'q, versiyalangan.
```

### 6.3 Citus vs qo'lda routing

| Mezon | **Citus** | **Qo'lda routing (Django router)** |
|---|---|---|
| Ishga tushirish | 1 hafta | 3-4 hafta |
| Kod o'zgarishi | ~yo'q (SQL shaffof) | Har so'rovda `.using(shard)` |
| Cross-shard JOIN | ✅ avtomatik | ❌ ilovada birlashtiriladi |
| Cross-shard tranzaksiya | ✅ 2PC | ❌ yo'q (saga kerak) |
| Rebalans | ✅ onlayn (`citus_rebalance_start`) | ❌ qo'lda skript |
| Narx | Community bepul / Managed $$$ | Bepul |
| Vendor lock-in | 🟡 o'rta (PG kengaytmasi) | 🟢 yo'q |
| Operatsion murakkablik | 🟡 coordinator SPOF | 🔴 barcha yuk jamoada |

**QAROR: 🟢 Citus (Community, self-hosted).**

Sabablar:
1. Django kodi deyarli o'zgarmaydi → 15 haftalik reja buzilmaydi
2. `DishLibrary` → **reference table** (har shardda nusxa, JOIN bepul)
3. Platforma hisobotlari → coordinator avtomatik parallel bajaradi
4. Rebalans onlayn — restoranlar sezmaydi

```sql
-- Citus sozlash
SELECT citus_add_node('shard-1.internal', 5432);
SELECT citus_add_node('shard-2.internal', 5432);
SELECT citus_add_node('shard-3.internal', 5432);
SELECT citus_add_node('shard-4.internal', 5432);

-- 1. GLOBAL jadvallar → reference (har shardda to'liq nusxa)
SELECT create_reference_table('ar3d_dishlibrary');
SELECT create_reference_table('menu_ikpu_catalog');
SELECT create_reference_table('core_featureflag');

-- 2. TENANT jadvallar → distributed, bir xil kalit → colocation
SELECT create_distributed_table('restaurants_restaurant', 'id',
                                shard_count => 1024);
SELECT create_distributed_table('menu_dish',        'restaurant_id',
                                colocate_with => 'restaurants_restaurant');
SELECT create_distributed_table('tables_table',     'restaurant_id',
                                colocate_with => 'restaurants_restaurant');
SELECT create_distributed_table('orders_order',     'restaurant_id',
                                colocate_with => 'restaurants_restaurant');
SELECT create_distributed_table('orders_orderitem', 'restaurant_id',
                                colocate_with => 'restaurants_restaurant');
-- ⚡ COLOCATION: bir restoranning HAMMA ma'lumoti bitta shardda
--    → JOIN mahalliy, tranzaksiya mahalliy, tarmoq yo'q
```

**⚠️ Colocation uchun `orderitem` ga `restaurant_id` denormalizatsiya qilinadi:**

```python
# migrations/00XX_orderitem_restaurant.py
class Migration(migrations.Migration):
    operations = [
        # 1. NULL bilan qo'shish (bloklamaydi)
        migrations.AddField('OrderItem', 'restaurant',
            models.ForeignKey('tenants.Restaurant', null=True, on_delete=CASCADE)),
        # 2. Backfill batch'lar bilan (quyida §10.4)
        migrations.RunPython(backfill_restaurant_id, migrations.RunPython.noop),
        # 3. NOT NULL qilish (VALIDATE alohida)
        migrations.RunSQL(
            "ALTER TABLE orders_orderitem ADD CONSTRAINT oi_rest_nn "
            "CHECK (restaurant_id IS NOT NULL) NOT VALID;",
            reverse_sql="ALTER TABLE orders_orderitem DROP CONSTRAINT oi_rest_nn;"),
        migrations.RunSQL(
            "ALTER TABLE orders_orderitem VALIDATE CONSTRAINT oi_rest_nn;"),
    ]
```

### 6.4 Migratsiya bosqichlari (0 downtime)

```
┌─ BOSQICH 0 — TAYYORGARLIK (sharding'dan 6 oy oldin) ───────────────────┐
│ • Har tenant jadvalga restaurant_id denormalizatsiya (orderitem, tip…) │
│ • Cross-tenant so'rovlarni topish va yo'q qilish (CI testi)            │
│ • FK'lar shard kaliti ichida ekanini tekshirish                        │
│ • Sequence → UUID yoki snowflake ID (global unique)                    │
│ ⏱ 4-6 hafta · Risk: 🟢 past (faqat sxema)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ BOSQICH 1 — COORDINATOR (single node Citus) ──────────────────────────┐
│ • Mavjud PG'ni Citus coordinator qilib sozlash                         │
│ • create_distributed_table (1 node — hali taqsimlanmagan)              │
│ • Ishlash bir xil qoladi, kod ishlaydi                                 │
│ ⏱ 1 hafta · Risk: 🟡 o'rta · Rollback: undistribute_table()            │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ BOSQICH 2 — WORKER QO'SHISH ──────────────────────────────────────────┐
│ • 4 ta worker node qo'shiladi                                          │
│ • citus_rebalance_start(shard_transfer_mode => 'block_writes' EMAS,    │
│                          'auto' — logical replication bilan onlayn)    │
│ • Har shard ~250 GB ko'chadi, tezlik ~80 MB/s → 50 daqiqa/shard        │
│ • Kechasi 02:00-06:00 oynasida                                          │
│ ⏱ 1 tun · Risk: 🔴 yuqori · Rollback: rebalansni to'xtatish            │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ BOSQICH 3 — NAZORAT (2 hafta) ────────────────────────────────────────┐
│ • citus_stat_statements — sekin so'rovlar                              │
│ • Cross-shard so'rov ulushi < 1% bo'lishi kerak                        │
│ • Shard hajmi nomutanosibligi < 20%                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Cross-shard so'rovlar muammosi

| So'rov | Muammo | Yechim |
|---|---|---|
| Platforma daromadi (barcha restoran) | 4 shardga fan-out | ✅ Citus parallel bajaradi (~120 ms) |
| "Eng mashhur taom" (global) | 4 shard + birlashtirish | ✅ Materialized view, kechasi yangilanadi |
| `DishLibrary` JOIN `Dish` | Cross-shard JOIN | ✅ **Reference table** — mahalliy JOIN |
| Buyurtma + to'lov bir tranzaksiyada | 2PC kerak bo'lishi mumkin | ✅ Colocation — ikkalasi bir shardda |
| Global `idempotency_key` UNIQUE | Shardlar orasida noyoblik yo'q | ⚠️ **Redis'da tekshiriladi** (DB emas) |
| Kunlik buyurtma raqami `#047` | Sequence shard-lokal | ✅ Raqam restoran ichida — muammo yo'q |
| Restoran ko'chishi (shard almashish) | Ma'lumot ko'chirish | ⚠️ `citus_move_shard_placement` + qisqa lock |

```python
# ⚠️ ANTI-NAQSH — sharding'dan keyin ISHLAMAYDI
Order.objects.filter(created_at__gte=today).count()      # butun platformada
# → 4 shardga so'rov, sekin, coordinator'ni bo'g'adi

# ✅ TO'G'RI — analitika ClickHouse'dan
ClickHouse.query("SELECT count() FROM orders WHERE date = today()")
```

---

## 7. KESH ARXITEKTURASI — 4 QATLAM

### 7.1 Umumiy sxema

```
   👤 FOYDALANUVCHI
        │  GET /v1/menu/registon/?lang=uz
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ QATLAM 1 — BRAUZER (localStorage + HTTP cache)                        │
│ ─────────────────────────────────────────────────────────────────────  │
│ Nima: menyu JSON, taom rasmlari, savat holati, til tanlovi            │
│ Kalit: armenu:menu:{slug}:{lang}:v{version}                            │
│ TTL: 5 daqiqa (menyu) · 7 kun (statik) · sessiya (savat)              │
│ Hajm: ~250 KB/restoran                                                 │
│ Invalidation: version raqami URL'da → eski kalit shunchaki qoladi     │
│ 🎯 HIT RATE MAQSAD: 45%  (bir mehmon o'rtacha 4 marta menyuni ochadi) │
│ ⚡ Foyda: takroriy ochish 0 ms, oflayn ham ko'rinadi                   │
└───────────────────────────────────────────────────────────────────────┘
        │  miss (55%)
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ QATLAM 2 — CDN (Cloudflare)                                           │
│ ─────────────────────────────────────────────────────────────────────  │
│ Nima: 3D fayllar (GLB/USDZ), rasmlar, JS/CSS, ⚡ menyu JSON ham       │
│ Kalit: to'liq URL + Vary: Accept-Language                              │
│ TTL: 60s (menyu API) · 30 kun (3D) · 1 yil (hash'li statik)           │
│ Invalidation: URL'dagi ?v={menu_version} → yangi URL = yangi kesh     │
│ 🎯 HIT RATE MAQSAD: 92% (3D uchun 99% — bir xil kutubxona URL)        │
│ ⚡ Foyda: 75% trafik serverga UMUMAN yetib kelmaydi                    │
└───────────────────────────────────────────────────────────────────────┘
        │  miss (8% menyu, 1% 3D)
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ QATLAM 3 — REDIS (db=5, cache)                                        │
│ ─────────────────────────────────────────────────────────────────────  │
│ Nima: qurilgan menyu JSON, restoran obyekti, stol→restoran xarita,    │
│       sessiya, rate-limit hisoblagich, idempotency, AI javob keshi    │
│ Kalit: {tur}:{scope}:{param}:v{version}   (quyida §7.2)               │
│ TTL: menyu 60s · restoran 600s · qr→table 3600s · AI 24 soat          │
│ Hajm: 1 000 restoran × 250 KB = 250 MB + sessiya 400 MB ≈ 700 MB      │
│ 🎯 HIT RATE MAQSAD: > 90%                                              │
│ ⚡ Foyda: 12 000 RPS menyu → 1 200 RPS DB                              │
└───────────────────────────────────────────────────────────────────────┘
        │  miss (<10%)
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ QATLAM 4 — POSTGRESQL                                                 │
│ ─────────────────────────────────────────────────────────────────────  │
│ shared_buffers = 8 GB → issiq to'plam (1,5 GB) to'liq RAM'da          │
│ effective_cache_size = 24 GB (OS page cache hisobga olinadi)          │
│ 🎯 Buffer hit ratio maqsad: > 99%                                      │
│ SELECT → read replica (DB router) · INSERT/UPDATE → primary            │
└───────────────────────────────────────────────────────────────────────┘
```

### 7.2 Kesh kaliti formati (qat'iy standart)

```
{turi}:{ko'lam}:{identifikator}[:{parametr}]:v{versiya}

MISOLLAR:
  menu:rest:registon:uz:v42            ← menyu JSON (restoran+til+versiya)
  menu:rest:registon:ru:v42
  dish:rest:15:uz:v42                  ← bitta taom
  rest:obj:registon:v42                ← restoran obyekti
  qr:table:a3f2c891-...                ← QR token → (restaurant_id, table_id)
  sess:guest:gs_a3f2c891               ← mehmon sessiyasi (TTL 4 soat)
  idem:order:550e8400-...              ← idempotency (TTL 24 soat)
  rl:ip:213.230.99.1:menu              ← rate limit (TTL 60s)
  ai:chat:sha256(savol+lang)           ← AI javob keshi (TTL 24 soat)
  lib:search:sha256(query)             ← kutubxona qidiruv (TTL 1 soat)

⚠️ QAT'IY QOIDALAR:
  1. Kalit HECH QACHON foydalanuvchi kiritgan matnni to'g'ridan olmaydi → sha256
  2. Tenant ko'lami kalitda MAJBURIY (menu:rest:{slug}) — sizish bo'lmasin
  3. Versiya oxirida — invalidation shu orqali
  4. Maksimal kalit uzunligi 200 bayt
```

### 7.3 Kesh qatlamlari — solishtirma jadval

| Qatlam | Kechikish | Sig'im | Narx | Invalidation tezligi | Xato bahosi |
|---|---|---|---|---|---|
| 1. Brauzer | **0 ms** | 5-10 MB | $0 | 🔴 sekin (TTL kutiladi) | Eski menyu ko'rinadi (5 daq) |
| 2. CDN | 15-40 ms | ∞ | $200/oy | 🟡 URL o'zgarishi bilan darhol | Eski narx (60s) |
| 3. Redis | 0,3-1 ms | 700 MB | $80/oy | 🟢 darhol | 60s |
| 4. DB | 3-20 ms | 500 GB | $400/oy | — | — |

### 7.4 Kesh o'qish/yozish kodi

```python
# apps/core/cache.py
from django.core.cache import cache
from django.db import transaction
import hashlib, json

MENU_TTL = 60
REST_TTL = 600
QR_TTL   = 3600


def menu_key(slug: str, lang: str, version: int) -> str:
    return f"menu:rest:{slug}:{lang}:v{version}"


def get_menu(slug: str, lang: str) -> dict:
    """
    ⚡ 2 bosqichli o'qish:
       1) restoran obyekti (menu_version bilan) — o'zi keshlangan
       2) shu versiya bilan menyu kaliti
    """
    rest = get_restaurant(slug)                      # keshdan, 0,3 ms
    key = menu_key(slug, lang, rest['menu_version'])

    data = cache.get(key)
    if data is not None:
        metrics.inc('cache.menu.hit')
        return data

    metrics.inc('cache.menu.miss')

    # ⚡ STAMPEDE HIMOYASI — bir vaqtda 1 000 miss bo'lsa
    lock_key = f"lock:{key}"
    if cache.add(lock_key, "1", timeout=10):         # SET NX
        try:
            data = build_menu(slug, lang)            # DB, ~35 ms
            cache.set(key, data, MENU_TTL)
        finally:
            cache.delete(lock_key)
    else:
        # Boshqa process qurmoqda — 50 ms kutamiz, keyin DB'dan (fallback)
        time.sleep(0.05)
        data = cache.get(key) or build_menu(slug, lang)

    return data
```

### 7.5 Kesh isitish (warming)

```python
# apps/core/management/commands/warm_cache.py
"""
Har kuni 07:30 da (restoranlar ochilishidan oldin) ishlaydi.
Faol restoranlarning menyusini oldindan Redis'ga yuklaydi.
⚡ Foyda: kunning birinchi mehmoni ham 3 ms javob oladi (35 ms emas)
"""
def handle(self, *args, **opts):
    qs = Restaurant.objects.filter(is_active=True).only('slug', 'langs_enabled')
    for rest in qs.iterator(chunk_size=200):
        for lang in rest.langs_enabled:
            get_menu(rest.slug, lang)          # keshga yozadi
    # 1 000 restoran × 3 til = 3 000 qurish × 35 ms = 105 s ✅
```

---

## 8. KESH INVALIDATION — `menu_version` NAQSHI

### 8.1 Muammo: nega `delete_pattern` ISHLATILMAYDI

```python
# ❌ QAT'IY TAQIQ
cache.delete_pattern("menu:rest:registon:*")
```

| # | Sabab | Batafsil |
|---|---|---|
| 1 | **`KEYS`/`SCAN` bloklaydi** | `KEYS` — O(n), 500k kalitda Redis 400 ms muzlaydi. Redis **bir oqimli** — shu paytda BARCHA so'rov kutadi |
| 2 | **Redis Cluster'da ishlamaydi** | Kalitlar 16 384 slotga tarqalgan; pattern bir nechта node'da — atomik emas |
| 3 | **Atomik emas** | 3 til × 2 ko'rinish = 6 kalit. 3 tasi o'chib, 3 tasi qolsa → mijoz eski/yangi aralash ko'radi |
| 4 | **Race condition** | Delete bilan bir vaqtda boshqa process eski ma'lumotni qayta yozadi (quyida §8.4) |
| 5 | **CDN'ni tozalamaydi** | Redis tozalandi, CDN'da eski JSON 60s qoladi |

### 8.2 ✅ YECHIM: versiya raqami

```
PRINTSIP: keshni O'CHIRMAYMIZ — KALITNI O'ZGARTIRAMIZ.
          Eski kalitlar TTL bo'yicha o'z-o'zidan o'ladi.

  Restaurant.menu_version = 42
       │
       ├─▶ Redis kaliti:  menu:rest:registon:uz:v42
       ├─▶ CDN URL:       /v1/menu/registon/?lang=uz&v=42
       ├─▶ ETag:          "v42-uz"
       └─▶ localStorage:  armenu:menu:registon:uz:v42

  Admin taom narxini o'zgartirdi:
       menu_version 42 → 43   (bitta UPDATE, 1 ms)
       │
       ├─▶ Redis: menu:...:v43 — YO'Q → miss → qayta quriladi ✅
       ├─▶ CDN:   ?v=43 — yangi URL → origin'ga boradi ✅
       ├─▶ ETag:  "v43-uz" ≠ "v42-uz" → 200 (304 emas) ✅
       └─▶ Brauzer: yangi kalit → localStorage miss ✅

  ⚡ HAMMA QATLAM BIR VAQTDA, ATOMIK, 1 ms ICHIDA.
  ⚡ Eski v42 kalitlari 60 soniyada TTL bo'yicha o'ladi — hech kim tegmaydi.
```

### 8.3 Implementatsiya (signal)

```python
# apps/menu/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F
from django.db import transaction
from apps.tenants.models import Restaurant
from apps.menu.models import Dish, Category, DishModifier
from apps.ar3d.models import DishModel3D

MENYUGA_TASIR_QILADI = (Dish, Category, DishModifier, DishModel3D)


def bump_menu_version(restaurant_id: int):
    """
    ⚡ F() ifodasi — atomik INCREMENT, race condition YO'Q.
    ⚠️ .save() bilan qilinsa: read-modify-write → parallel 2 admin → 1 ta bump yo'qoladi.
    """
    Restaurant.objects.filter(id=restaurant_id).update(
        menu_version=F('menu_version') + 1
    )
    # Restoran obyekti keshini ham yangilaymiz (u menu_version'ni saqlaydi)
    cache.delete(f"rest:obj:{restaurant_id}")
    cache.delete(f"rest:obj:slug:{slug_of(restaurant_id)}")


@receiver(post_save, sender=Dish)
@receiver(post_delete, sender=Dish)
@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
@receiver(post_save, sender=DishModifier)
@receiver(post_save, sender=DishModel3D)
def on_menu_change(sender, instance, **kwargs):
    rid = _resolve_restaurant_id(instance)
    if rid:
        # ⚡ on_commit — tranzaksiya rollback bo'lsa bump ham bo'lmaydi
        transaction.on_commit(lambda: bump_menu_version(rid))
```

**⚠️ Bulk operatsiyalarda signal ishlamaydi — qo'lda chaqiriladi:**

```python
# ❌ signal chaqirilmaydi
Dish.objects.filter(category_id=5).update(is_available=False)

# ✅ TO'G'RI
with transaction.atomic():
    Dish.objects.filter(category_id=5).update(is_available=False)
    transaction.on_commit(lambda: bump_menu_version(rid))
```

### 8.4 Race condition tahlili

```
SSENARIY: menyu keshi mavjud emas, admin bir vaqtda narxni o'zgartiradi.

  T0   Web-1: cache.get("menu:...:v42") → MISS
  T1   Web-1: build_menu() boshlanadi — DB'dan eski narx 45 000 o'qiladi
  T2   Admin: narx 50 000 → UPDATE dish; menu_version 42 → 43
  T3   Web-1: cache.set("menu:...:v42", eski_narx, 60)   ← ESKI kalitga yozdi

  ✅ NATIJA: zarar YO'Q.
     Yangi so'rovlar menu_version=43 o'qiydi → "menu:...:v43" so'raydi → MISS
     → yangi narx bilan quriladi. "…v42" kaliti hech kimga kerak emas, 60s da o'ladi.

  ⚡ MANA SHU — versiya naqshining ASOSIY USTUNLIGI:
     delete_pattern bo'lganda T3 dagi yozuv AMAL QILGAN kalitni ifloslantirardi
     va mijoz 60 soniya eski narxni ko'rardi (moliyaviy xato!).
```

**Ikkinchi race — `menu_version` o'qishi:**

```
  T0  Web-1: rest = get_restaurant()  → menu_version = 42  (keshdan, 600s TTL!)
  T1  Admin: version 43 ga o'tdi, rest:obj keshi o'chirildi
  T2  Web-1: hali ham v42 kaliti bilan ishlaydi (o'sha so'rov ichida)

  ⚠️ Bu qabul qilinadigan: bitta so'rov davomida eski versiya ishlatiladi.
     Keyingi so'rov rest:obj keshini miss qiladi → 43 ni oladi.
     Maksimal kechikish = 0 (kesh o'chirilgan), lekin in-flight so'rovlar eski.
```

### 8.5 Invalidation matritsasi

| O'zgarish | `menu_version` | Qo'shimcha o'chiriladigan | CDN purge | Kechikish |
|---|---|---|---|---|
| Taom narxi | ✅ +1 | `dish:rest:{id}:*` | ❌ (v o'zgardi) | < 1 s |
| Stop-list (`is_available`) | ✅ +1 | — | ❌ | < 1 s |
| Yangi taom | ✅ +1 | — | ❌ | < 1 s |
| Kategoriya tartibi | ✅ +1 | — | ❌ | < 1 s |
| 3D model tayyor | ✅ +1 | `ar:dish:{id}` | ❌ | < 1 s |
| Restoran logotipi | ✅ +1 | `rest:obj:*` | ✅ **purge kerak** | 5-30 s |
| Restoran nofaol | ✅ +1 | `rest:obj:*`, `qr:table:*` | ✅ | 5-30 s |
| QR token yangilash | ❌ | `qr:table:{eski}` | ❌ | darhol |
| Xodim PIN | ❌ | `staff:{id}` | ❌ | darhol |
| Buyurtma holati | ❌ | — (kesh yo'q) | ❌ | WS orqali |
| Tarif o'zgarishi | ✅ +1 | `rest:obj:*`, `plan:{id}` | ❌ | < 1 s |

```python
# Fayl o'zgarganda (logotip, rasm) — CDN purge kerak
def purge_cdn(urls: list[str]):
    """Cloudflare API. Faqat FAYL o'zgarganda (JSON emas!)."""
    requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{ZONE}/purge_cache",
        headers={"Authorization": f"Bearer {CF_TOKEN}"},
        json={"files": urls}, timeout=5,
    )
    # ⚠️ Rate limit: 1 000 purge/kun (Pro). Shuning uchun JSON uchun
    #    ishlatilmaydi — faqat rasm/fayl uchun (kuniga ~20 marta).
```

---

## 9. MA'LUMOT HAYOTIY SIKLI

### 9.1 4 bosqichli sikl

```
        YARATILDI                                                    O'CHDI
            │                                                          │
            ▼                                                          ▼
  ┌─────────────────┬──────────────────┬──────────────────┬────────────────┐
  │  🔥 ISSIQ       │   🌡 ILIQ        │   🧊 SOVUQ       │   ⚫ O'CHIRISH  │
  │  0 – 30 kun     │   30 kun – 1 yil │   1 – 3(5) yil   │                │
  ├─────────────────┼──────────────────┼──────────────────┼────────────────┤
  │ PG primary      │ PG (eski part.)  │ S3 Glacier IR    │ —              │
  │ RAM'da          │ NVMe             │ Parquet          │                │
  │ p95 < 20 ms     │ p95 < 200 ms     │ p95 < 30 s       │                │
  │ Real-time UI    │ Hisobot          │ Audit, tergov    │                │
  │ $0,40/GB/oy     │ $0,40/GB/oy      │ $0,004/GB/oy     │ $0             │
  └─────────────────┴──────────────────┴──────────────────┴────────────────┘
```

### 9.2 Har ma'lumot turi uchun siyosat

| Ma'lumot | 🔥 Issiq | 🌡 Iliq | 🧊 Sovuq | ⚫ O'chirish | Asos |
|---|---|---|---|---|---|
| **Buyurtma** (`order`) | 30 kun | 12 oy | 36 oy | 3 yildan keyin agregat qoladi | Buxgalteriya 3 yil |
| **To'lov** (`payment`) | 30 kun | 12 oy | **60 oy** | ❌ hech qachon | Moliyaviy tekshiruv |
| **Fiskal chek** | 7 kun | 12 oy | **60 oy** | ❌ hech qachon | 🔴 O'zR Soliq kodeksi |
| **Audit log** | — | 12 oy | **60 oy** | 5 yildan keyin | 🔴 Qonun |
| **Mehmon** (`guest`) | faol 30 kun | 12 oy | — | 🟡 **24 oy passiv → anonimlashtirish** | Shaxsiy ma'lumot |
| **GuestSession** | 4 soat | 90 kun | — | 12 oy | — |
| **AR ko'rish** | 30 kun | 13 oy | S3 (agregat) | 13 oy → agregat qoladi | Analitika |
| **AnalyticsEvent** | 1 kun | 7 kun | ClickHouse 24 oy | 90 kun (PG'dan) | Analitika |
| **Chaqiruv** (`call`) | 1 kun | 30 kun | — | 90 kun | Operatsion |
| **Sharh** (`review`) | 30 kun | ∞ | — | ❌ | Reputatsiya |
| **AI so'rov** (`aiusage`) | 7 kun | 24 oy | — | 24 oy | Xarajat nazorati |
| **Job** | 1 soat | — | — | 7 kun (done), 30 kun (failed) | — |
| **3D fayllar (S3)** | ∞ | — | — | Taom o'chsa +90 kun | Tiklash oynasi |

### 9.3 GDPR va O'zR "Shaxsiy ma'lumotlar to'g'risida"gi qonuni

> **O'zR Qonuni № ЗРУ-547 (02.07.2019)** — shaxsiy ma'lumotlar O'zbekiston
> hududidagi serverlarda saqlanishi shart (lokalizatsiya talabi).

**Shaxsiy ma'lumot deb hisoblanadigan maydonlar:**

| Jadval | Maydon | Toifa | Chora |
|---|---|---|---|
| `guest` | `phone` | 🔴 identifikator | Anonimlashtirish |
| `guest` | `name` | 🔴 identifikator | Anonimlashtirish |
| `guest` | `tg_user_id` | 🔴 identifikator | Anonimlashtirish |
| `guest` | `device_token` | 🟡 psevdo-ID | Anonimlashtirish |
| `staff` | `user.email`, `phone` | 🔴 identifikator | Ishdan bo'shasa +1 yil |
| `order` | `note` (mijoz matni) | 🟡 bo'lishi mumkin | 3 yildan keyin tozalanadi |
| `review` | `text` | 🟡 bo'lishi mumkin | Saqlanadi (ommaviy) |
| `arview` | `session_id`, `device` | 🟢 anonim | — |
| `auditlog` | `ip` | 🟡 | 12 oydan keyin /24 ga qisqartiriladi |

```python
# apps/guest/management/commands/anonymize_guests.py
"""
Oyda 1 marta. 24 oy faol bo'lmagan mehmonlarni anonimlashtiradi.
⚡ O'CHIRMAYDI — anonimlashtiradi. Sabab: buyurtma tarixi (moliyaviy hujjat)
   FK bilan bog'liq va o'chirilishi mumkin emas.
"""
from datetime import timedelta
import hashlib

CHEGARA = timedelta(days=730)

def handle(self, *args, **opts):
    cutoff = timezone.now() - CHEGARA
    qs = Guest.objects.filter(last_seen__lt=cutoff, is_anonymized=False)

    for chunk in batched(qs.iterator(chunk_size=1000), 1000):
        with transaction.atomic():
            for g in chunk:
                # Barqaror psevdonim (statistika buzilmasin)
                pseudo = hashlib.sha256(
                    f"{g.id}:{settings.ANON_SALT}".encode()
                ).hexdigest()[:16]
                g.phone         = ''
                g.name          = f'anon_{pseudo}'
                g.tg_user_id    = None
                g.device_token  = None
                g.is_anonymized = True
            Guest.objects.bulk_update(chunk, [
                'phone', 'name', 'tg_user_id', 'device_token', 'is_anonymized'
            ])
    # Order.guest_id saqlanadi → hisobotlar buzilmaydi, shaxs aniqlanmaydi ✅
```

**Mehmon so'rovi bo'yicha o'chirish (right to erasure):**

```python
# POST /v1/guest/forget/  (SMS tasdiqlash bilan)
def forget_me(guest: Guest):
    with transaction.atomic():
        anonymize(guest)                                    # yuqoridagi
        Review.objects.filter(guest=guest).update(          # sharh anonim
            guest=None, author_name='Anonim')
        ARView.objects.filter(guest=guest).update(guest=None)
        # ⛔ Order/Payment/FiscalReceipt — TEGILMAYDI (qonuniy majburiyat)
        AuditLog.log(guest, action='gdpr_erasure', actor='self')
    return {"status": "ok", "note": "Moliyaviy hujjatlar qonun talabi bilan saqlanadi"}
```

### 9.4 Arxiv formati va o'qish

```
S3 TUZILISHI:
  s3://armenu-archive/
    orders/orders_order_2024_01.parquet          (siqilgan, ~180 MB)
    orderitem/orders_orderitem_2024_01.parquet
    arview/ar3d_arview_2025_03.parquet
    auditlog/audit_auditlog_2023_11.parquet

FORMAT: Parquet + ZSTD
  ├─ Siqish: CSV ga nisbatan 8×, PG jadvalga nisbatan 5×
  ├─ Ustunli → "faqat total ustunini o'qi" — 20× tez
  └─ ClickHouse, Athena, DuckDB, pandas — hammasi o'qiydi

O'QISH (arxivdan hisobot):
  SELECT sum(total) FROM s3('s3://armenu-archive/orders/*.parquet')
  WHERE restaurant_id = 42 AND toYear(created_at) = 2024;
  → ClickHouse orqali, ~8 soniya
```

---

## 10. MIGRATSIYA STRATEGIYASI (ZERO-DOWNTIME)

### 10.1 Asosiy muammo

```
⚠️ Deploy paytida ESKI va YANGI kod BIR VAQTDA ishlaydi (rolling restart, 2-5 daqiqa).
   Migratsiya ikkalasiga ham mos kelishi SHART.

   t=0    40 instans × eski kod
   t=30s  migratsiya bajarildi        ← BU PAYT ikkala kod ham ishlashi kerak
   t=60s  20 eski + 20 yangi
   t=180s 40 instans × yangi kod
```

### 10.2 🔴 QAT'IY TAQIQLANGAN operatsiyalar (bitta deployda)

| ⛔ Taqiqlangan | Nima uchun | ✅ To'g'ri yo'l |
|---|---|---|
| `ADD COLUMN ... NOT NULL` (DEFAULT'siz) | Butun jadval qayta yoziladi + eski kod NULL yozadi → xato | 3 bosqich (§10.3) |
| `DROP COLUMN` | Eski kod hali o'sha ustunni SELECT qiladi | 2 deploy (§10.5) |
| `RENAME COLUMN` | Eski kod eski nomni izlaydi | Yangi qo'sh → ko'chir → eski o'chir |
| `ALTER TYPE` (varchar→int) | Jadval bloklanadi + eski kod tipni bilmaydi | Yangi ustun + backfill |
| `CREATE INDEX` (CONCURRENTLY'siz) | 🔴 ACCESS EXCLUSIVE — jadval to'liq bloklanadi | `CONCURRENTLY` |
| `ADD CONSTRAINT` (NOT VALID'siz) | Butun jadval skan qilinadi, bloklanadi | `NOT VALID` + `VALIDATE` |
| `ALTER TABLE SET NOT NULL` (to'g'ridan) | Full scan + lock | CHECK NOT VALID → VALIDATE → SET NOT NULL |

### 10.3 ✅ Ustun QO'SHISH — 3 deploy naqshi

```
┌─ DEPLOY 1: SXEMA (kod o'zgarmaydi) ────────────────────────────────────┐
│  ALTER TABLE menu_dish ADD COLUMN spice_level SMALLINT DEFAULT 0;      │
│                                                                         │
│  ⚡ PostgreSQL 11+ da DEFAULT bilan ADD COLUMN — METADATA-ONLY.         │
│     Jadval qayta yozilmaydi, lock ~2 ms, 133k qatorda ham darhol.      │
│  ⚠️ DEFAULT'siz + NOT NULL bo'lsa → 133k qator qayta yoziladi (12 s     │
│     lock) → SO'ROVLAR YIQILADI.                                        │
│                                                                         │
│  Eski kod: ustunni bilmaydi, SELECT * da oladi, e'tibor bermaydi ✅    │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓  (bir necha soat / kun)
┌─ DEPLOY 2: KOD YOZADI ─────────────────────────────────────────────────┐
│  • Model'ga maydon qo'shiladi                                           │
│  • Serializer YOZADI, lekin O'QISHDA default bilan ishlaydi            │
│  • Backfill boshlanadi (batch, §10.4)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ DEPLOY 3: MAJBURIY QILISH ────────────────────────────────────────────┐
│  ALTER TABLE menu_dish ADD CONSTRAINT dish_spice_nn                    │
│      CHECK (spice_level IS NOT NULL) NOT VALID;   -- lock 2 ms         │
│  ALTER TABLE menu_dish VALIDATE CONSTRAINT dish_spice_nn;              │
│      -- SHARE UPDATE EXCLUSIVE: o'qish/yozish davom etadi ✅            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Katta jadval backfill (batch)

```python
# apps/orders/migrations/00XX_backfill_restaurant.py
"""
127 mln qatorli orderitem jadvalini to'ldirish.
⚡ QOIDA: bitta UPDATE'da 5 000 dan ko'p qator YO'Q.
   Sabab: uzun tranzaksiya → WAL o'sadi, replica kechikadi, lock ushlanadi.
"""
BATCH = 5000
PAUZA = 0.05          # 50 ms — replica kechikmasligi uchun


def backfill_restaurant_id(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    max_id = OrderItem.objects.aggregate(m=Max('id'))['m'] or 0
    cur = 0
    while cur < max_id:
        with transaction.atomic():
            schema_editor.execute("""
                UPDATE orders_orderitem oi
                SET restaurant_id = o.restaurant_id
                FROM orders_order o
                WHERE oi.order_id = o.id
                  AND oi.restaurant_id IS NULL
                  AND oi.id > %s AND oi.id <= %s
            """, [cur, cur + BATCH])
        cur += BATCH
        time.sleep(PAUZA)

        # ⚡ Replica kechikishini kuzatish — 10 s dan oshsa to'xtaymiz
        if replica_lag_seconds() > 10:
            time.sleep(5)

# HISOB: 127 750 000 / 5 000 = 25 550 batch
#        Har batch ~80 ms ish + 50 ms pauza = 130 ms
#        Jami: 25 550 × 0,13 s = 3 322 s ≈ 55 daqiqa
#        ⚡ Fon rejimida ishlaydi, xizmat uzilmaydi ✅
```

### 10.5 Ustun O'CHIRISH — 2 deploy

```
┌─ DEPLOY 1: KODDAN OLIB TASHLASH ───────────────────────────────────────┐
│  • Model'da maydon qoladi, lekin HECH QAYERDA ishlatilmaydi            │
│  • Serializer, admin, hisobotdan olib tashlanadi                       │
│  • ⚡ Barcha queryset'ga .defer('eski_ustun') yoki .only(...)          │
│  • 1-2 hafta kutiladi (rollback oynasi)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ DEPLOY 2: DB'DAN O'CHIRISH ───────────────────────────────────────────┐
│  ALTER TABLE menu_dish DROP COLUMN eski_ustun;                         │
│  ⚡ DROP COLUMN — metadata-only, tez. Joy VACUUM FULL'da bo'shaydi.     │
└─────────────────────────────────────────────────────────────────────────┘

⚠️ SELECT * XAVFI: Django SELECT * qilmaydi (ustunlarni sanaydi) —
   shuning uchun DEPLOY 1 da model'dan olib tashlash O'ZI YETARLI EMAS:
   eski instansda hali eski model bor → SELECT eski_ustun → 42703 xato.
   Shuning uchun tartib: kod → kutish → DB.
```

### 10.6 Indeks yaratish (katta jadval)

```sql
-- ❌ NOTO'G'RI — 36 mln qatorli jadvalni 8 daqiqa bloklaydi
CREATE INDEX idx_order_new ON orders_order (waiter_id, created_at);

-- ✅ TO'G'RI
CREATE INDEX CONCURRENTLY idx_order_new ON orders_order (waiter_id, created_at);
-- Jadvalni 2 marta skanlaydi, 2× sekin, LEKIN bloklamaydi

-- ⚠️ CONCURRENTLY tranzaksiya ichida ishlamaydi:
```

```python
class Migration(migrations.Migration):
    atomic = False                      # ⚡ MAJBURIY
    operations = [
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_waiter "
            "ON orders_order (waiter_id, created_at DESC);",
            reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS idx_order_waiter;",
        ),
    ]

# ⚠️ CONCURRENTLY yiqilsa → INVALID indeks qoladi. Tekshirish:
#   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
#   → DROP INDEX CONCURRENTLY ... va qaytadan
```

### 10.7 Migratsiya CI tekshiruvi

```python
# tests/test_migrations_safe.py
XAVFLI_NAQSHLAR = [
    (r'ADD COLUMN.*NOT NULL(?!.*DEFAULT)', 'NOT NULL ustun DEFAULT bilan bo\'lsin'),
    (r'CREATE INDEX(?! CONCURRENTLY)',      'CONCURRENTLY ishlatilsin'),
    (r'ADD CONSTRAINT(?!.*NOT VALID)',      'NOT VALID + VALIDATE bosqichi'),
    (r'ALTER COLUMN.*TYPE',                 'Tip o\'zgartirish taqiqlangan'),
    (r'DROP COLUMN',                        'Faqat 2-deploy naqshida (# noqa-drop)'),
    (r'RENAME COLUMN',                      'Rename taqiqlangan'),
]

def test_yangi_migratsiyalar_xavfsiz():
    for f in yangi_migratsiya_fayllari():          # git diff origin/main
        matn = f.read_text()
        if '# migration-safe-ok' in matn:          # qo'lda tasdiqlangan
            continue
        for naqsh, xabar in XAVFLI_NAQSHLAR:
            assert not re.search(naqsh, matn, re.I), f"{f.name}: {xabar}"
```

### 10.8 Backward compatibility matritsasi

| O'zgarish | Eski kod + yangi DB | Yangi kod + eski DB | Xavfsizmi |
|---|---|---|---|
| Ustun qo'shish (DEFAULT bilan) | ✅ e'tibor bermaydi | ❌ ustun yo'q | 🟢 DB birinchi |
| Ustun o'chirish | ❌ SELECT xato | ✅ ishlatmaydi | 🟢 Kod birinchi |
| Indeks qo'shish | ✅ | ✅ | 🟢 Istalgan tartib |
| Yangi jadval | ✅ | ❌ | 🟢 DB birinchi |
| Enum'ga qiymat qo'shish | ✅ (choices Python'da) | ✅ | 🟢 |
| Enum'dan qiymat olib tashlash | ❌ eski yozuvlar | ❌ | 🔴 Ikki bosqich |
| FK qo'shish | ✅ | ❌ | 🟢 DB birinchi |
| `unique_together` qo'shish | 🔴 eski kod dublikat yozadi | ✅ | 🔴 Kod birinchi + tozalash |

---

## 11. MA'LUMOT BUTUNLIGI

### 11.1 Himoya qatlamlari

```
  ┌──────────────────────────────────────────────────────────┐
  │ 1. FRONTEND validatsiya   → 🟢 UX uchun (ISHONILMAYDI)   │
  ├──────────────────────────────────────────────────────────┤
  │ 2. DRF serializer         → 🟡 format, tip, diapazon     │
  ├──────────────────────────────────────────────────────────┤
  │ 3. SERVIS qatlami         → 🟡 biznes qoidalari          │
  ├──────────────────────────────────────────────────────────┤
  │ 4. Django model.clean()   → 🟡 model darajasi            │
  ├──────────────────────────────────────────────────────────┤
  │ 5. DB CONSTRAINT          → 🔴 OXIRGI VA ISHONCHLI CHEGARA│
  │    Kod xato qilsa ham DB ruxsat bermaydi                 │
  └──────────────────────────────────────────────────────────┘

  ⚡ PRINTSIP: har biznes-invariant DB darajasida ham himoyalanadi.
     Sabab: ma'lumotni faqat Django yozmaydi — migratsiya, admin,
     shell, boshqa servis ham yozadi.
```

### 11.2 CHECK constraint'lar

```python
class Order(models.Model):
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(subtotal__gte=0) & Q(service_fee__gte=0)
                    & Q(discount__gte=0) & Q(total__gte=0),
                name='order_summa_manfiy_emas'),
            models.CheckConstraint(
                check=Q(total=F('subtotal') + F('service_fee') - F('discount')),
                name='order_total_togri'),          # 🔴 moliyaviy invariant
            models.CheckConstraint(
                check=Q(discount__lte=F('subtotal')),
                name='order_chegirma_subtotaldan_oshmaydi'),
            models.CheckConstraint(
                check=Q(status__in=['new','accepted','cooking','ready',
                                    'served','paid','cancelled']),
                name='order_status_togri'),
        ]


class OrderItem(models.Model):
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(qty__gte=1) & Q(qty__lte=99),
                name='orderitem_qty_1_99'),          # ⚡ butun son, 0 emas
            models.CheckConstraint(check=Q(price__gte=0),
                name='orderitem_narx_manfiy_emas'),
        ]


class Dish(models.Model):
    class Meta:
        constraints = [
            models.CheckConstraint(check=Q(price__gt=0),
                name='dish_narx_musbat'),
            models.CheckConstraint(
                check=Q(old_price__isnull=True) | Q(old_price__gt=F('price')),
                name='dish_eski_narx_kattaroq'),     # chegirma mantiqi
            models.CheckConstraint(
                check=Q(rating_avg__gte=0) & Q(rating_avg__lte=5),
                name='dish_reyting_0_5'),
        ]


class Payment(models.Model):
    class Meta:
        constraints = [
            models.CheckConstraint(check=Q(amount__gt=0),
                name='payment_summa_musbat'),        # 🔴 0 to'lov bo'lmaydi
        ]
```

### 11.3 UNIQUE constraint'lar

| Jadval | Constraint | Nima uchun | Buzilsa |
|---|---|---|---|
| `restaurant` | `slug` | URL noyob | Ikki restoran bir URL'da 🔴 |
| `table` | `qr_token` | 🔴 QR — kirish kaliti | Boshqa restoran menyusi ochiladi 🔴🔴 |
| `table` | `(restaurant, number)` | Stol raqami takrorlanmaydi | Ofitsiant adashadi |
| `order` | `idempotency_key` | 🔴 **Dublikat buyurtma** | Mijozdan 2 marta pul 🔴 |
| `order` | `(restaurant, number, kun)` | Kunlik raqam noyob | Chek raqami takrorlanadi |
| `payment` | `idempotency_key` | 🔴 Dublikat to'lov | Moliyaviy zarar 🔴 |
| `payment` | `(provider, ext_id)` | Provayder webhook 2 marta keladi | Ikki marta hisoblash 🔴 |
| `fiscalreceipt` | `order` (1:1) | Bir buyurtma — bir chek | Soliq xatosi |
| `dishlibrary` | `key` | Kutubxona kaliti | Moslashtirish buziladi |
| `guest` | `(restaurant, device_token)` | Qurilma bir mehmon | Bonus dublikati |
| `dishmodel3d` | `dish` (1:1) | Bir taom — bir model | AR chalkashadi |

```sql
-- ⚡ Kunlik buyurtma raqami — partial unique + funksional indeks
CREATE UNIQUE INDEX uq_order_kunlik_raqam
    ON orders_order (restaurant_id, number, (created_at AT TIME ZONE 'Asia/Tashkent')::date)
    WHERE status != 'cancelled';
-- Bekor qilingan buyurtma raqami qayta ishlatilishi mumkin
```

### 11.4 Tranzaksiya izolyatsiya darajalari

| Operatsiya | Izolyatsiya | Sabab |
|---|---|---|
| Menyu o'qish | `READ COMMITTED` (default) | Kesh baribir ishlatiladi |
| **Buyurtma yaratish** | `READ COMMITTED` + `SELECT FOR UPDATE` | Faqat stol qulflanadi, butun jadval emas |
| **To'lov qayd etish** | `READ COMMITTED` + idempotency | UNIQUE constraint himoya qiladi |
| **Kunlik raqam berish** | `READ COMMITTED` + advisory lock | Sequence emas — raqam har kuni 1 dan boshlanadi |
| **Kassa yopish / smena** | `REPEATABLE READ` | Hisobot davomida ma'lumot o'zgarmasin |
| **Moliyaviy hisobot** | `REPEATABLE READ` (replica'da) | Bir xil snapshot |
| Analitika | `READ COMMITTED` (replica) | Aniqlik kritik emas |

```
⚠️ SERIALIZABLE ISHLATILMAYDI.
   Sabab: 1 000 RPS da serialization failure ko'payadi → retry bo'roni.
   Buning o'rniga: aniq lock (FOR UPDATE) + UNIQUE constraint + idempotency.
```

### 11.5 `select_for_update` — qayerda va nega

```python
# ✅ 1. STOL HOLATI — bir stolga bir vaqtda 2 buyurtma
def create_order(session, table_id, items, idem_key):
    with transaction.atomic():
        table = (Table.objects
                 .select_for_update(of=('self',))      # ⚡ faqat table qatori
                 .select_related('restaurant')
                 .get(id=table_id, restaurant_id=session.restaurant_id))
        # ... buyurtma yaratiladi ...
        table.status = 'ordering'
        table.save(update_fields=['status'])
    # Lock tranzaksiya oxirida bo'shaydi (~80 ms)


# ✅ 2. KUNLIK RAQAM — advisory lock (jadval qulflanmaydi)
def next_order_number(restaurant_id: int) -> str:
    with connection.cursor() as cur:
        # 🔒 Advisory lock — restoran+kun kaliti bo'yicha
        kalit = hash((restaurant_id, timezone.localdate().toordinal())) % 2**31
        cur.execute("SELECT pg_advisory_xact_lock(%s)", [kalit])
        cur.execute("""
            SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 2) AS INT)), 0) + 1
            FROM orders_order
            WHERE restaurant_id = %s
              AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent')
        """, [restaurant_id])
        return f"#{cur.fetchone()[0]:03d}"
    # ⚡ Advisory lock avtomatik bo'shaydi (xact = tranzaksiya oxirida)
    # ⚡ Faqat SHU restoran kutadi, boshqalari erkin


# ✅ 3. BONUS YECHISH — hisobni ikki marta yechmaslik
def spend_bonus(guest_id: int, amount: Decimal):
    with transaction.atomic():
        g = Guest.objects.select_for_update().get(id=guest_id)
        if g.bonus < amount:
            raise InsufficientBonus()
        g.bonus -= amount
        g.save(update_fields=['bonus'])


# ✅ 4. STOP-LIST BATCH — deadlock oldini olish
def bulk_stop(dish_ids: list[int]):
    with transaction.atomic():
        # ⚡ QAT'IY: doim id bo'yicha SARALANGAN tartibda lock olinadi
        #    Aks holda: A→B va B→A → DEADLOCK
        for d in Dish.objects.select_for_update().filter(
                id__in=sorted(dish_ids)).order_by('id'):
            d.is_available = False
            d.save(update_fields=['is_available'])


# ❌ QAT'IY TAQIQ — butun jadval qulflanadi
Dish.objects.select_for_update().all()

# ❌ TAQIQ — lock ichida tashqi API (lock 3 soniya ushlanadi!)
with transaction.atomic():
    order = Order.objects.select_for_update().get(id=x)
    requests.post(OFD_URL, ...)          # 🔴 boshqa hamma kutadi
```

### 11.6 Deadlock va lock kuzatuvi

```sql
-- postgresql.conf
deadlock_timeout = '1s'
log_lock_waits = on                 -- 1 s dan uzoq kutish log'ga
log_min_duration_statement = '500ms'
lock_timeout = '5s'                 -- ⚡ 5 s kutgan so'rov o'ladi (osilib qolmaydi)
idle_in_transaction_session_timeout = '30s'   -- 🔴 unutilgan tranzaksiya o'ldiriladi
statement_timeout = '30s'           -- web so'rov uchun (worker'da 300s)
```

```sql
-- Joriy bloklashlarni ko'rish (incident paytida)
SELECT bl.pid AS bloklangan, bl.query AS bloklangan_soro,
       ka.pid AS bloklovchi,  ka.query AS bloklovchi_soro,
       now() - bl.query_start AS kutish
FROM pg_stat_activity bl
JOIN pg_locks lk ON lk.pid = bl.pid AND NOT lk.granted
JOIN pg_locks kl ON kl.locktype = lk.locktype AND kl.relation IS NOT DISTINCT FROM lk.relation
                AND kl.granted
JOIN pg_stat_activity ka ON ka.pid = kl.pid
ORDER BY kutish DESC;
```

---

## 12. FAYL SAQLASH (S3)

### 12.1 Bucket tuzilishi

```
s3://armenu-media/                       ⚡ ASOSIY — CDN origin, ochiq o'qish
│
├── library/                             ⭐ GLOBAL KUTUBXONA (eng qimmatli)
│   └── {library_key}/
│       └── v{n}/                        ← versiya (immutable)
│           ├── model.glb                (Android/Web · 1,5-3 MB)
│           ├── model.usdz               (iOS AR Quick Look · 2-4 MB)
│           ├── poster.webp              (1024×1024 · 60 KB)
│           ├── poster@2x.webp           (2048×2048 · 180 KB)
│           ├── preview.mp4              (360° aylanma · 400 KB)
│           └── meta.json                (poly, size_cm, bbox, litsenziya)
│   Misol: library/osh-toshkent/v3/model.glb
│
├── r/{restaurant_id}/                   ← TENANT MA'LUMOTI
│   ├── logo/
│   │   ├── logo.webp                    (512×512)
│   │   └── logo_dark.webp
│   ├── dish/
│   │   └── {dish_id}/
│   │       ├── orig.jpg                 (asl, hech qachon o'chirilmaydi)
│   │       ├── 1200.webp                (detal sahifa)
│   │       ├── 600.webp                 (kartochka)
│   │       ├── 200.webp                 (ro'yxat / thumbnail)
│   │       └── blur.webp                (LQIP · 400 B · placeholder)
│   ├── ar/
│   │   └── {dish_id}/v{n}/              ← restoran O'Z modeli (kutubxonadan emas)
│   │       ├── model.glb
│   │       ├── model.usdz
│   │       └── poster.webp
│   ├── cat/{category_id}/image.webp
│   ├── qr/
│   │   ├── table_{id}.png               (512×512 PNG)
│   │   └── all_tables.pdf               (chop etish uchun A4)
│   └── export/
│       └── {yil}-{oy}/orders.xlsx       (TTL 30 kun)
│
└── public/                              ← platforma statikasi
    ├── placeholder/dish.webp
    └── icons/

s3://armenu-archive/                     🧊 SOVUQ (Glacier IR, private)
├── orders/orders_order_{yil}_{oy}.parquet
├── arview/...
└── db-backup/{sana}/armenu_full.dump.gz

s3://armenu-uploads/                     ⏳ VAQTINCHALIK (TTL 7 kun, private)
└── tmp/{uuid}/                          ← 3D generatsiya kirish rasmlari
```

### 12.2 Nima uchun aynan shunday

| Qaror | Sabab |
|---|---|
| `library/` ajratilgan | Global aktiv → CDN kesh hit 99% (URL barcha restoranda bir xil) |
| `r/{id}/` prefiksi | 🔴 IAM policy bilan tenant izolyatsiyasi mumkin; "restoranni o'chir" = 1 prefiks |
| `v{n}/` versiya papkasi | ⚡ **Immutable** — fayl hech qachon ustidan yozilmaydi → CDN purge kerak emas |
| `orig.jpg` saqlanadi | Kelajakda yangi o'lchamda qayta generatsiya |
| `blur.webp` (LQIP) | 400 baytlik blur → sahifa darhol "to'la" ko'rinadi |
| `export/` TTL 30 kun | Hisobot fayllari to'planib ketmasin |
| Arxiv alohida bucket | Boshqa storage klassi + boshqa IAM + xato o'chirishdan himoya |

### 12.3 Versiyalash strategiyasi

```
⚡ IMMUTABLE FAYL NAQSHI — fayl HECH QACHON o'zgartirilmaydi.

  3D model yangilandi:
    eski:  library/osh-toshkent/v3/model.glb    ← qoladi (eski kesh ishlaydi)
    yangi: library/osh-toshkent/v4/model.glb    ← yangi URL

  DB:  DishLibrary.version = 4
       DishLibrary.glb_url = ".../v4/model.glb"

  ✅ CDN purge KERAK EMAS — URL boshqa
  ✅ Rollback = DB'da version 3 ga qaytarish (fayl joyida)
  ✅ Cache-Control: public, max-age=31536000, immutable  (1 yil!)
  ✅ Eski versiya 90 kundan keyin lifecycle bilan o'chadi

  ⚠️ ISTISNO: logo va rasm — versiya YO'Q (foydalanuvchi tez-tez o'zgartiradi)
     → ular uchun ?v={updated_at timestamp} query param + CDN purge
```

```python
# apps/storage/paths.py
def library_path(key: str, version: int, fayl: str) -> str:
    return f"library/{key}/v{version}/{fayl}"

def dish_ar_path(restaurant_id: int, dish_id: int, version: int, fayl: str) -> str:
    return f"r/{restaurant_id}/ar/{dish_id}/v{version}/{fayl}"

def dish_image_path(restaurant_id: int, dish_id: int, olcham: str) -> str:
    return f"r/{restaurant_id}/dish/{dish_id}/{olcham}.webp"
```

### 12.4 S3 lifecycle qoidalari

```json
{
  "Rules": [
    {
      "ID": "tmp-tozalash",
      "Filter": {"Prefix": "tmp/"},
      "Status": "Enabled",
      "Expiration": {"Days": 7}
    },
    {
      "ID": "eksport-tozalash",
      "Filter": {"Prefix": "r/", "Tag": {"Key": "type", "Value": "export"}},
      "Status": "Enabled",
      "Expiration": {"Days": 30}
    },
    {
      "ID": "eski-3d-versiya",
      "Filter": {"Tag": {"Key": "state", "Value": "superseded"}},
      "Status": "Enabled",
      "Expiration": {"Days": 90}
    },
    {
      "ID": "arxiv-glacier",
      "Filter": {"Prefix": "orders/"},
      "Status": "Enabled",
      "Transitions": [
        {"Days": 0,   "StorageClass": "GLACIER_IR"},
        {"Days": 730, "StorageClass": "DEEP_ARCHIVE"}
      ]
    },
    {
      "ID": "backup-saqlash",
      "Filter": {"Prefix": "db-backup/"},
      "Status": "Enabled",
      "Expiration": {"Days": 90}
    }
  ]
}
```

### 12.5 CDN origin sozlamalari

| Yo'l | Cache-Control | CDN TTL | Sabab |
|---|---|---|---|
| `library/*/v*/model.glb` | `public, max-age=31536000, immutable` | 1 yil | Versiyalangan, o'zgarmaydi |
| `library/*/v*/model.usdz` | `public, max-age=31536000, immutable` | 1 yil | — |
| `r/*/ar/*/v*/` | `public, max-age=31536000, immutable` | 1 yil | — |
| `r/*/dish/*/*.webp` | `public, max-age=604800` | 7 kun | ?v= bilan yangilanadi |
| `r/*/logo/*` | `public, max-age=86400` | 1 kun | Tez-tez o'zgaradi |
| `/v1/menu/*` (API) | `public, max-age=60` | 60 s | ⚡ menu_version bilan |
| `/v1/orders/*` | `no-store` | 0 | 🔴 shaxsiy ma'lumot |
| `r/*/export/*` | `private, no-store` | 0 | 🔴 imzolangan URL |

```nginx
# nginx — S3 origin oldida
location ~ ^/media/library/.*/v[0-9]+/ {
    proxy_pass          http://s3-endpoint;
    proxy_cache         armenu_3d;
    proxy_cache_valid   200 30d;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";      # ⚡ model-viewer uchun SHART
    add_header Cross-Origin-Resource-Policy "cross-origin";
}
```

**⚠️ Xususiy fayllar — imzolangan URL:**

```python
def signed_export_url(restaurant_id: int, fayl: str, ttl: int = 300) -> str:
    """Hisobot eksporti — 5 daqiqalik havola, faqat egasi."""
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'armenu-media',
                'Key': f'r/{restaurant_id}/export/{fayl}'},
        ExpiresIn=ttl,
    )
```

### 12.6 Hajm prognozi

```
1 000 RESTORAN, 1 YIL:

A) GLOBAL KUTUBXONA (bir marta)
   1 230 model × (GLB 2 MB + USDZ 3 MB + poster 0,24 MB + preview 0,4 MB)
   = 1 230 × 5,64 MB = 6,9 GB
   + eski versiyalar (o'rtacha 1,4 versiya) = 9,7 GB
   ➜ 10 GB

B) RESTORAN RASMLARI
   133 000 taom × (orig 800 KB + 1200:120 KB + 600:45 KB + 200:12 KB + blur:0,4 KB)
   = 133 000 × 977 KB = 130 GB
   ➜ 130 GB

C) RESTORAN O'Z 3D MODELLARI (kutubxonadan emas — 25%)
   46 000 model3d × 25% = 11 500 × 5,2 MB = 60 GB
   ➜ 60 GB

D) LOGO / KATEGORIYA RASMI
   2 100 logo × 80 KB + 16 800 kategoriya × 60 KB = 1,2 GB
   ➜ 1,2 GB

E) QR PDF / PNG
   52 000 stol × 25 KB + 2 100 PDF × 900 KB = 3,2 GB
   ➜ 3,2 GB

F) ARXIV (Parquet, Glacier IR)
   53 GB analitik / 5 (Parquet siqish) = 10,6 GB/yil
   ➜ 11 GB

G) DB BACKUP (90 kun saqlash)
   Kunlik full 25 GB (siqilgan) — lekin haftalik full + kunlik WAL
   = 13 full × 25 GB + WAL 90 × 3 GB = 325 + 270 = 595 GB
   ➜ 595 GB   🔴 eng katta qism

═══════════════════════════════════════════════════════════════
STANDARD storage (A-E):     204 GB × $0,023  =  $4,7/oy
GLACIER_IR (F):              11 GB × $0,004  =  $0,04/oy
BACKUP (G, standard-IA):    595 GB × $0,0125 =  $7,4/oy
─────────────────────────────────────────────────────────────
S3 STORAGE JAMI                             ≈  $12/oy

CDN TRAFIK (asosiy xarajat):
  Kuniga 100 000 buyurtma → ~400 000 menyu ochilishi
  × (rasmlar 1,8 MB + 3D 0,6 MB o'rtacha) = 960 GB/kun = 29 TB/oy
  ⚡ Cloudflare: bandwidth BEPUL (Pro $20-200/oy tekis)
  ⚠️ AWS CloudFront bo'lsa: 29 TB × $0,085 = $2 465/oy 🔴
  ➜ SHUNING UCHUN CLOUDFLARE TANLANGAN
═══════════════════════════════════════════════════════════════
```

### 12.7 Storage xavfsizligi

| Chora | Sozlama |
|---|---|
| Bucket ochiq listing | ⛔ `BlockPublicAcls: true`, `IgnorePublicAcls: true` |
| Faylga to'g'ridan yozish | ⛔ Faqat backend IAM roli; presigned PUT 5 daqiqa |
| Xato o'chirish | ✅ **Versioning ON** + `MFA Delete` (arxiv bucketda) |
| Shifrlash | ✅ SSE-S3 (AES-256) barcha bucketda |
| Cross-tenant o'qish | ✅ Prefiks `r/{id}/` + backend URL generatsiyasi |
| Yuklash hajmi | ✅ Rasm 10 MB, GLB 30 MB, PDF 20 MB (nginx + backend) |
| Fayl turi | ✅ Magic-byte tekshiruvi (kengaytmaga ishonilmaydi) |
| Zararli GLB | ✅ Parse + poly_count/texture tekshiruvi (worker'da, sandbox) |

---

## 13. XULOSA — 12 TA QAT'IY QOIDA

| # | Qoida | Buzilsa |
|---|---|---|
| 1 | Har tenant so'rovi `restaurant_id` bilan filtrlanadi | 🔴 Ma'lumot sizishi |
| 2 | Har tenant indeksi `restaurant_id` bilan boshlanadi | 🟡 Sekin so'rov |
| 3 | `orders`, `arview`, `analyticsevent` — **partitioned** | 🟡 VACUUM/arxiv jahannami |
| 4 | Kesh invalidation faqat **`menu_version`** orqali | 🔴 Redis bloklanadi |
| 5 | `delete_pattern` / `KEYS` — ⛔ **QAT'IY TAQIQ** | 🔴 Redis muzlaydi |
| 6 | Migratsiya: `NOT NULL` doim `DEFAULT` bilan | 🔴 Jadval bloklanadi |
| 7 | `CREATE INDEX` doim `CONCURRENTLY` | 🔴 Downtime |
| 8 | Moliyaviy invariant DB **CHECK** bilan himoyalanadi | 🔴 Noto'g'ri hisob |
| 9 | `select_for_update` — doim `id` bo'yicha saralangan | 🟡 Deadlock |
| 10 | Lock ichida tashqi API chaqirilmaydi | 🔴 Kaskadli sekinlashuv |
| 11 | 3D fayllar **immutable + versiyalangan** | 🟡 CDN purge do'zaxi |
| 12 | Shaxsiy ma'lumot 24 oydan keyin anonimlashadi | 🔴 Qonun buzilishi |

---

**➡️ Keyingi:** `04_MASSHTABLASH.md`
