# QISM III — TIZIM ARXITEKTURASI

> Bu qism tizim arxitektori uchun. Million+ foydalanuvchi, xatolarga chidamlilik,
> o'z-o'zini tiklash, 5 yillik chidamlilik.

---

## 1. ARXITEKTURA PRINTSIPLARI (o'zgarmas qoidalar)

| # | Printsip | Nima uchun | Amalda |
|---|---|---|---|
| 1 | **Stateless application** | Gorizontal masshtablash | Session → Redis, fayl → S3, hech narsa diskda emas |
| 2 | **Shared-nothing** | Bir node yiqilsa boshqasi ishlaydi | Har instans mustaqil |
| 3 | **Graceful degradation** | Qism yiqilsa tizim to'liq o'lmaydi | Har xizmat uchun fallback |
| 4 | **Idempotency** | Qayta urinish xavfsiz | Har yozuv operatsiyasida key |
| 5 | **Event-driven** | Bo'shashgan bog'lanish | Domain event → handlers |
| 6 | **CQRS-lite** | O'qish/yozish alohida masshtablanadi | Read replica, materialized view |
| 7 | **Cache-first** | DB yuklamasi kamayadi | Redis → DB, TTL + invalidation |
| 8 | **Circuit breaker** | Yiqilgan xizmat butun tizimni tortmaydi | Har tashqi API uchun |
| 9 | **Bulkhead** | Bir modul boshqasini bo'g'maydi | Alohida pool/queue |
| 10 | **Observability** | Nima bo'layotgani ko'rinadi | Metric + log + trace |

---

## 2. UMUMIY ARXITEKTURA (to'liq)

```
                              🌍 INTERNET
                                   │
                    ┌──────────────┴──────────────┐
                    │      Cloudflare (CDN+WAF)   │
                    │  • DDoS himoya              │
                    │  • Statik+3D fayl cache     │
                    │  • Rate limiting            │
                    │  • TLS termination          │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │   LOAD BALANCER (nginx/HAProxy)│
                    │   • health-check har 3s      │
                    │   • least_conn algoritmi     │
                    │   • sticky faqat WS uchun    │
                    └───┬──────────────────────┬───┘
                        │                      │
        ┌───────────────┴──────┐    ┌──────────┴──────────┐
        │   WEB QATLAMI        │    │   WS QATLAMI        │
        │   (stateless)        │    │   (Daphne)          │
        │ ┌──────┐ ┌──────┐    │    │ ┌──────┐ ┌──────┐  │
        │ │ web1 │ │ web2 │... │    │ │ ws1  │ │ ws2  │..│
        │ │gunicorn│      │    │    │ │      │ │      │  │
        │ └──────┘ └──────┘    │    │ └──────┘ └──────┘  │
        │ N ta (auto-scale)    │    │ M ta (auto-scale)   │
        └───────────┬──────────┘    └──────────┬──────────┘
                    │                          │
        ┌───────────┴──────────────────────────┴──────────┐
        │              REDIS CLUSTER                       │
        │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
        │  │ node1   │ │ node2   │ │ node3   │            │
        │  │ master  │ │ master  │ │ master  │            │
        │  │  +repl  │ │  +repl  │ │  +repl  │            │
        │  └─────────┘ └─────────┘ └─────────┘            │
        │  Vazifa: session, cache, WS channel layer,       │
        │          rate-limit, navbat, idempotency, lock   │
        └───────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴──────────────────────────────────────┐
        │           POSTGRESQL                              │
        │  ┌──────────────┐                                 │
        │  │   PRIMARY    │  ← barcha YOZISH                │
        │  │  (streaming) │                                 │
        │  └──────┬───────┘                                 │
        │         │ replication                             │
        │  ┌──────┴───────┐  ┌──────────────┐              │
        │  │  REPLICA 1   │  │  REPLICA 2   │ ← O'QISH      │
        │  │  (hot standby)│  │ (analitika)  │              │
        │  └──────────────┘  └──────────────┘              │
        │  + PgBouncer (connection pooling)                 │
        │  + partitioning (orders — oy bo'yicha)            │
        └───────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴──────────────────────────────────────┐
        │           WORKER QATLAMI                          │
        │ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
        │ │ worker-3d  │ │ worker-fisk│ │ worker-notif│   │
        │ │ (3D model) │ │  (OFD)     │ │ (TG/push)   │   │
        │ └────────────┘ └────────────┘ └────────────┘    │
        │ ┌────────────┐ ┌────────────┐                    │
        │ │ worker-ai  │ │ worker-etl │  ⚡ BULKHEAD:      │
        │ │  (AI chat) │ │ (analitika)│  har biri alohida  │
        │ └────────────┘ └────────────┘  navbat va pool    │
        └───────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴──────────────────────────────────────┐
        │           TASHQI XIZMATLAR (circuit breaker bilan)│
        │  🤖 AI: Gemini│Claude│GPT│Groq│DeepSeek│Meshy    │
        │  💳 To'lov: Payme │ Click │ Uzum                  │
        │  🧾 Fiskal: UZKASSA │ e-POS │ QPos                │
        │  📱 Telegram Bot API                              │
        │  ☁️ S3/MinIO (3D fayllar, rasmlar)                │
        └───────────────────────────────────────────────────┘
                    │
        ┌───────────┴──────────────────────────────────────┐
        │        KUZATUV (observability)                    │
        │  Prometheus + Grafana │ Loki (log) │ Sentry       │
        │  Uptime Kuma │ Alertmanager → Telegram            │
        └───────────────────────────────────────────────────┘
```

---

## 3. 📦 MODULLAR (Django app'lar)

```
armenu_project/
├── config/                    # settings, urls, asgi, wsgi, celery
├── core/                      # umumiy: base model, mixin, util, exception
├── apps/
│   ├── tenants/               # Restaurant, tarif, obuna, izolyatsiya
│   ├── accounts/              # User, Staff, rol, auth, JWT
│   ├── menu/                  # Category, Dish, Modifier, stop-list
│   ├── ar3d/         ⚡       # DishModel3D, DishLibrary, pipeline, ARView
│   ├── tables/                # Hall, Table, QR, zal plani
│   ├── guest/                 # Guest, GuestSession, mijoz view'lari
│   ├── orders/       ⚡       # Order, OrderItem, holat mashinasi, KDS
│   ├── payments/              # Payment, Tip, provayder adapterlar
│   ├── fiscal/                # OFD, IKPU, chek
│   ├── loyalty/               # Bonus, keshbek, promo
│   ├── reviews/               # Review, Google yo'naltirish
│   ├── analytics/             # Event, hisobot, menyu-injiniring
│   ├── ai/           ⚡       # MCP qatlami, chatbot, tarjima
│   ├── notifications/         # Telegram, push, SMS, email
│   ├── delivery/     (v2)     # Kuryer, zona
│   ├── inventory/    (v2)     # Ombor, retsept
│   └── platform_admin/        # Super-admin
├── static/
├── templates/
├── locale/                    # uz, ru, en
└── deploy/                    # systemd, nginx, docker, ansible
```

### Modullar bog'liqligi (muhim — sikl bo'lmasin)

```
core ← hamma
tenants ← hamma (restaurant_id)
accounts ← orders, tables, payments
menu ← ar3d, orders, ai
tables ← orders, guest
guest ← orders, loyalty, reviews
orders ← payments, fiscal, analytics, notifications
ai ← menu, ar3d (MCP qatlami mustaqil)

⚠️ QOIDA: yuqori qatlam pastga bog'liq bo'lishi mumkin, teskarisi YO'Q.
   Kerak bo'lsa — signal/event orqali (bo'shashgan bog'lanish).
```

---

## 4. 🚀 MASHTABLASH — MILLION FOYDALANUVCHI

### 4.1 Yuklama bosqichlari va arxitektura

| Bosqich | Foydalanuvchi | Restoran | RPS | Arxitektura |
|---|---|---|---|---|
| **S0 — Start** | < 1 000/kun | 1-20 | ~5 | 1 VPS (4 CPU, 8 GB): web+ws+db+redis |
| **S1 — O'sish** | 10 000/kun | 20-100 | ~50 | 2 VPS: (web+ws) + (db+redis) |
| **S2 — Viloyat** | 100 000/kun | 100-400 | ~300 | 4 VPS: 2 web, 1 ws, 1 db+replica |
| **S3 — Respublika** | 500 000/kun | 400-1500 | ~1 500 | 8-12 node, LB, Redis cluster, read replica |
| **S4 — Region** | **2 000 000/kun** | 1500-5000 | ~6 000 | 20+ node, k8s, sharding, multi-region CDN |
| **S5 — Pik** | **1 mln bir vaqtda** | — | ~25 000 | Quyida batafsil ⬇️ |

### 4.2 ⚡ 1 MILLION BIR VAQTDA — nima bo'ladi va nima qilinadi

**Realistik ssenariy:** 1 mln bir vaqtda faol foydalanuvchi ≈ 5 000 restoran × 200 stol.
Bu O'zbekiston uchun **butun bozorning 20%i** — ya'ni 4-5 yillik maqsad.

#### Yuklama profili (1 mln bir vaqtda)

| Operatsiya | Ulush | RPS | Xususiyat |
|---|---|---|---|
| Menyu ko'rish | 60% | ~12 000 | 🟢 **Cache** — DB'ga bormaydi |
| 3D/AR fayl yuklash | 15% | ~3 000 | 🟢 **CDN** — serverga bormaydi |
| WebSocket ulanish | 10% | 1 mln ulanish | 🟡 WS qatlami |
| Buyurtma yaratish | 5% | ~1 000 | 🔴 **DB yozish** — eng og'ir |
| Boshqa API | 10% | ~2 000 | 🟡 Aralash |

#### Har qatlam uchun yechim

```
┌─ 1. CDN QATLAMI (Cloudflare) ────────────────────────────────┐
│ Ushlaydi: 3D fayllar, rasmlar, JS/CSS, statik menyu JSON     │
│ Yuklama: ~75% barcha trafik                                   │
│ Sig'im: cheksiz (Cloudflare)                                  │
│ Narx: ~$200/oy (Pro plan)                                     │
│ ⚡ Menyu JSON ham CDN'da (60s TTL) → serverga 1/60 so'rov     │
└───────────────────────────────────────────────────────────────┘
                            ↓ qolgan 25%
┌─ 2. EDGE CACHE (nginx + Redis) ──────────────────────────────┐
│ Ushlaydi: menyu API, taom kartochkasi, restoran ma'lumoti     │
│ Hit rate maqsad: >90%                                         │
│ TTL: menyu 60s, taom 300s, restoran 600s                      │
│ Invalidation: admin o'zgartirsa → darhol tozalanadi           │
│ ⚡ 12 000 RPS menyu → 1 200 RPS DB'ga (90% cache)             │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌─ 3. WEB QATLAMI (stateless, auto-scale) ─────────────────────┐
│ Instans: 20-40 ta (har biri 4 CPU / 8 GB)                     │
│ Har instans: gunicorn, 8 worker × 4 thread = 32 parallel      │
│ Sig'im: 1 instans ~300 RPS → 40 instans = 12 000 RPS ✅       │
│ Auto-scale: CPU>65% → +2 instans (2 daqiqada)                 │
│ ⚡ Stateless: session Redis'da → istalgan instansga boradi     │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌─ 4. WEBSOCKET QATLAMI (eng qiyin qism) ──────────────────────┐
│ 1 mln bir vaqtda ulanish                                      │
│                                                                │
│ ⚠️ MUAMMO: 1 ulanish ≈ 20-40 KB RAM → 1 mln = 20-40 GB       │
│                                                                │
│ ✅ YECHIM:                                                     │
│ a) Daphne instansi: 1 ta ~50 000 ulanish (8 GB RAM)          │
│    → 1 mln uchun 20 ta instans                                │
│ b) ⚡ MIJOZ WS'siz ishlaydi (asosiy optimizatsiya):            │
│    • Mijozga WS faqat buyurtma bergandan KEYIN kerak          │
│    • Menyu ko'rayotgan mijozga WS YO'Q                        │
│    • Buyurtma bergan mijoz ~5% → 50 000 WS ulanish            │
│    • Qolganlari uchun SSE yoki polling (15s)                  │
│ c) Xodim WS (ofitsiant/KDS/admin): 5 000 rest × 8 = 40 000    │
│                                                                │
│ ➜ HAQIQIY WS ulanish: ~90 000 (1 mln emas!)                   │
│ ➜ Kerak: 2-3 ta Daphne instansi ✅                             │
│                                                                │
│ Channel layer: Redis cluster (pub/sub), group per restaurant  │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌─ 5. MA'LUMOTLAR BAZASI (eng kritik) ─────────────────────────┐
│ Yozish: ~1 000 RPS (buyurtma, to'lov, event)                  │
│ O'qish: ~1 200 RPS (cache'dan o'tganlari)                     │
│                                                                │
│ ✅ YECHIM (bosqichma-bosqich):                                 │
│                                                                │
│ 5.1 PgBouncer (connection pooling)                            │
│     • transaction mode, pool 200                               │
│     • 40 web instans × 32 conn = 1280 → 200 ga siqiladi       │
│                                                                │
│ 5.2 READ REPLICA (2-4 ta)                                     │
│     • Barcha SELECT → replica (Django DB router)              │
│     • Yozishdan keyingi o'qish → primary (read-your-writes)   │
│                                                                │
│ 5.3 PARTITIONING (orders jadvali)                             │
│     • orders — oy bo'yicha (RANGE partition)                  │
│     • analytics_event — kun bo'yicha                          │
│     • Eski partitionlar arxivga (S3)                           │
│                                                                │
│ 5.4 SHARDING (S5 da — 5000+ restoran)                         │
│     • restaurant_id bo'yicha hash shard                        │
│     • 4-8 shard, har biri primary+replica                      │
│     • Citus yoki qo'lda routing                                │
│                                                                │
│ 5.5 EVENT'lar DB'ga YOZILMAYDI (muhim!)                       │
│     • analytics_event → ClickHouse yoki S3+Athena             │
│     • PostgreSQL faqat tranzaksion ma'lumot                    │
│                                                                │
│ Sig'im: 1 primary (16 CPU/64 GB) ~3 000 write RPS ✅          │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌─ 6. WORKER QATLAMI (bulkhead) ───────────────────────────────┐
│ Har tur uchun ALOHIDA navbat va pool:                         │
│   queue:model3d   → 3 worker  (og'ir, sekin)                  │
│   queue:fiscal    → 5 worker  (kritik, tez bo'lishi kerak)    │
│   queue:notify    → 8 worker  (ko'p, yengil)                  │
│   queue:ai        → 4 worker  (tashqi API kutadi)             │
│   queue:analytics → 2 worker  (past prioritet)                │
│                                                                │
│ ⚡ Bulkhead: 3D navbat to'lib ketsa, fiskal ishlashda davom    │
└───────────────────────────────────────────────────────────────┘
```

#### 📊 1 mln bir vaqtda — infratuzilma va narx

| Komponent | Miqdor | Konfiguratsiya | Oylik narx |
|---|---|---|---|
| Web nodes | 40 | 4 CPU / 8 GB | $1 600 |
| WS nodes | 3 | 8 CPU / 16 GB | $240 |
| Worker nodes | 6 | 4 CPU / 8 GB | $240 |
| PostgreSQL primary | 1 | 16 CPU / 64 GB / NVMe | $400 |
| PostgreSQL replica | 3 | 8 CPU / 32 GB | $600 |
| Redis cluster | 6 | 4 CPU / 16 GB | $480 |
| Load balancer | 2 | 4 CPU / 8 GB | $80 |
| ClickHouse (analitika) | 2 | 8 CPU / 32 GB | $400 |
| S3/MinIO (3D fayl) | 5 TB | — | $120 |
| CDN (Cloudflare) | — | Pro/Business | $200 |
| Monitoring | 1 | 4 CPU / 8 GB | $40 |
| **JAMI** | | | **~$4 400/oy** |

**Daromadga nisbatan:** 5 000 restoran × 590k so'm ≈ 2,95 mlrd so'm/oy (~$233 000).
Infra = **1,9%** daromaddan. ✅ Sog'lom.

### 4.3 Masshtablash bo'yicha qat'iy kod qoidalari

```python
# ❌ NOTO'G'RI — N+1 query, million foydalanuvchida o'ldiradi
for order in Order.objects.all():
    print(order.table.number)          # har safar DB so'rov

# ✅ TO'G'RI
for order in Order.objects.select_related('table', 'guest').all():
    print(order.table.number)

# ❌ NOTO'G'RI — butun jadval xotiraga
dishes = list(Dish.objects.all())

# ✅ TO'G'RI — iterator + chunk
for dish in Dish.objects.iterator(chunk_size=500): ...

# ❌ NOTO'G'RI — sinxron tashqi API web so'rovda
def create_order(request):
    order = Order.objects.create(...)
    requests.post(OFD_URL, ...)        # 3 soniya kutadi! ❌

# ✅ TO'G'RI — navbatga
def create_order(request):
    order = Order.objects.create(...)
    transaction.on_commit(lambda: enqueue('fiscal', order.id))
    return Response(...)               # darhol qaytadi ✅

# ❌ NOTO'G'RI — cache'siz issiq yo'l
def menu_api(request, slug):
    return Response(build_menu(slug))  # har so'rovda DB ❌

# ✅ TO'G'RI
def menu_api(request, slug):
    key = f"menu:{slug}:{lang}:{version}"
    data = cache.get(key)
    if data is None:
        data = build_menu(slug)
        cache.set(key, data, 60)
    return Response(data)
```

---

## 5. 🛡 XATOLARGA CHIDAMLILIK (fault tolerance)

> Talab: *"tizim bir qismi yiqilsa ham boshqa qismlar ishlashda davom etishi"*

### 5.1 Yiqilish matritsasi — nima ishlaydi, nima yo'q

| Yiqilgan komponent | Ta'sir | Ishlashda davom etadi | Tiklanish |
|---|---|---|---|
| **1 ta web node** | 🟢 Yo'q | Hammasi (LB boshqasiga yuboradi) | Avtomatik 30s |
| **Barcha web node** | 🔴 To'liq to'xtash | — | Auto-restart + alert |
| **1 ta WS node** | 🟡 Kichik | Sahifa ishlaydi, real-time → polling'ga o'tadi | Avto 15s |
| **Barcha WS** | 🟡 O'rta | ✅ Menyu, buyurtma, to'lov ishlaydi. KDS polling (10s) | Auto-restart |
| **Redis** | 🟠 Katta | ✅ Menyu (DB'dan), buyurtma. ❌ WS, cache sekin | Cluster failover 10s |
| **PostgreSQL primary** | 🔴 Yozish yo'q | ✅ **O'qish ishlaydi** (replica): menyu, AR ko'rish | Auto-failover 30-60s |
| **PostgreSQL to'liq** | 🔴 To'liq | ❌ Faqat statik CDN | Backup'dan tiklash |
| **Worker (3D)** | 🟢 Kichik | Hammasi. Yangi 3D navbatda kutadi | Auto-restart |
| **Worker (fiskal)** | 🟡 O'rta | ✅ Hammasi. Chek navbatda (keyin yuboriladi) | Auto-restart + alert |
| **AI provayder** | 🟢 Yo'q | Keyingi provayderga o'tadi (6 ta zanjir) | Circuit breaker |
| **To'lov provayder** | 🟡 O'rta | Boshqa provayder yoki naqd | Circuit breaker |
| **OFD (fiskal)** | 🟡 O'rta | ✅ Buyurtma/to'lov ishlaydi, chek navbatda | Retry 24s |
| **CDN** | 🟡 O'rta | Origin'dan beriladi (sekinroq) | Cloudflare o'zi |
| **S3 (3D fayl)** | 🟡 O'rta | ✅ Menyu ishlaydi, AR yo'q (rasm ko'rsatiladi) | Replica bucket |
| **Telegram API** | 🟢 Kichik | Hammasi. Bildirishnoma navbatda | Retry |

### 5.2 Circuit Breaker (har tashqi xizmat uchun)

```python
# core/resilience.py

class CircuitBreaker:
    """
    3 holat:
      CLOSED    — normal, so'rovlar o'tadi
      OPEN      — xizmat yiqilgan, so'rov YUBORILMAYDI (tez xato)
      HALF_OPEN — sinov, 1 ta so'rov yuboriladi
    """
    def __init__(self, name, fail_threshold=5, timeout=60, success_threshold=2):
        self.name = name
        self.fail_threshold = fail_threshold      # 5 xato → OPEN
        self.timeout = timeout                    # 60s keyin HALF_OPEN
        self.success_threshold = success_threshold

    def call(self, fn, *args, fallback=None, **kwargs):
        state = self._get_state()                 # Redis'da

        if state == 'OPEN':
            if self._should_try(): self._set_state('HALF_OPEN')
            else:
                metrics.inc(f'cb.{self.name}.rejected')
                if fallback: return fallback()
                raise ServiceUnavailable(self.name)

        try:
            result = fn(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            metrics.inc(f'cb.{self.name}.failure')
            if fallback: return fallback()
            raise
```

**Qo'llanilishi:**
```python
ofd_breaker = CircuitBreaker('ofd', fail_threshold=3, timeout=120)

def send_fiscal_receipt(order):
    return ofd_breaker.call(
        _ofd_api_send, order,
        fallback=lambda: enqueue_retry('fiscal', order.id, delay=300)
    )
```

### 5.3 Retry siyosati

| Operatsiya | Urinish | Kechikish | Jitter | Maks vaqt |
|---|---|---|---|---|
| To'lov webhook | 8 | eksponensial 2^n s | ±30% | 24 soat |
| Fiskal chek | 10 | 5m, 15m, 1s, 6s... | ±20% | 48 soat |
| Telegram push | 5 | 1s, 5s, 30s, 2m, 10m | ±20% | 1 soat |
| AI so'rov | 2 | 500ms, 2s | — | 30 s (keyin boshqa provayder) |
| 3D generatsiya | 3 | 1m, 5m, 15m | — | 1 soat (keyin boshqa provayder) |
| DB deadlock | 3 | 50ms, 200ms, 1s | ±50% | 5 s |

⚠️ **Retry faqat idempotent operatsiyalarda!** Har birida idempotency key.

### 5.4 Graceful degradation zanjirlari

```
🎯 AR KO'RISH:
   WebXR/QuickLook → 3D viewer → 360° rasm → oddiy rasm ✅

🤖 AI CHAT:
   Gemini → Haiku → GPT-mini → Groq → DeepSeek → Sonnet
   → hammasi yiqilsa: "Ofitsiantni chaqiring" + FAQ ✅

📡 REAL-TIME:
   WebSocket → Server-Sent Events → polling 10s → qo'lda yangilash ✅

🧾 FISKAL:
   OFD-1 → OFD-2 → navbat (keyin yuboriladi) → qo'lda chek ✅

💳 TO'LOV:
   Payme → Click → Uzum → naqd (ofitsiantga) ✅

🖼 3D FAYL:
   CDN → S3 origin → lokal cache → rasm ✅

💾 O'QISH:
   Redis cache → Read replica → Primary → statik snapshot ✅
```

---

## 6. 🔄 O'Z-O'ZINI TIKLASH (self-healing)

> Talab: *"tizim o'zini o'zi qayta tiklay olishi"*

### 6.1 Avtomatik tiklash mexanizmlari

| # | Mexanizm | Nima qiladi | Vaqt |
|---|---|---|---|
| 1 | **systemd Restart=always** | Process o'lsa qayta ishga tushiradi | 5s |
| 2 | **Health-check + LB** | Sog'lom bo'lmagan node trafikdan chiqariladi | 3-9s |
| 3 | **Auto-scaling** | CPU>65% → node qo'shiladi; <25% → olib tashlanadi | 2 daq |
| 4 | **DB auto-failover** | Primary yiqilsa replica primary bo'ladi (Patroni) | 30-60s |
| 5 | **Redis Sentinel/Cluster** | Master yiqilsa replica ko'tariladi | 10s |
| 6 | **Circuit breaker** | Yiqilgan xizmatni chetlab o'tadi, tiklansa qaytaradi | 60s |
| 7 | **Dead Letter Queue** | Bajarilmagan vazifa DLQ'ga, qo'lda/avto qayta | — |
| 8 | **Orphan job recovery** | Worker o'lsa `running` job'lar qayta navbatga | 60s |
| 9 | **WS auto-reconnect** | Klient uzilsa exponential backoff bilan ulanadi | 1-30s |
| 10 | **Cache warm-up** | Restart'dan keyin issiq ma'lumot oldindan yuklanadi | 30s |
| 11 | **Stuck order detector** | 45 daq `cooking`da qolgan buyurtma → alert | 5 daq |
| 12 | **Disk cleanup** | Disk >85% → eski log/temp o'chiriladi | 10 daq |
| 13 | **Memory guard** | Worker RAM >80% → graceful restart | 1 daq |
| 14 | **Connection leak detector** | Uzoq idle conn yopiladi | 5 daq |
| 15 | **Backup verify** | Har kecha backup tiklanishi sinab ko'riladi | kunlik |

### 6.2 Self-healing daemon (kod namunasi)

```python
# core/healing/daemon.py — armenu-healer.service
"""
Har 60 soniyada tizimni tekshiradi va muammolarni O'ZI tuzatadi.
Tuzata olmasa — alert yuboradi.
"""

CHECKS = [
    ('orphan_jobs',    check_orphan_jobs,    heal_orphan_jobs),
    ('stuck_orders',   check_stuck_orders,   heal_stuck_orders),
    ('db_connections', check_db_conns,       heal_db_conns),
    ('redis_memory',   check_redis_mem,      heal_redis_mem),
    ('disk_space',     check_disk,           heal_disk),
    ('worker_alive',   check_workers,        heal_workers),
    ('fiscal_queue',   check_fiscal_queue,   heal_fiscal_queue),
    ('ws_connections', check_ws,             heal_ws),
    ('cdn_health',     check_cdn,            heal_cdn),
    ('ai_providers',   check_ai,             heal_ai),
]

def run_cycle():
    for name, check, heal in CHECKS:
        try:
            problem = check()
            if not problem:
                metrics.gauge(f'health.{name}', 1)
                continue

            logger.warning(f"[HEAL] Muammo: {name} — {problem}")
            metrics.gauge(f'health.{name}', 0)
            metrics.inc(f'heal.{name}.attempt')

            healed = heal(problem)

            if healed:
                logger.info(f"[HEAL] ✅ Tuzatildi: {name}")
                metrics.inc(f'heal.{name}.success')
                notify_telegram(f"🔧 Avtomatik tuzatildi: {name}")
            else:
                logger.error(f"[HEAL] ❌ Tuzatib bo'lmadi: {name}")
                metrics.inc(f'heal.{name}.failed')
                alert_oncall(f"🚨 QO'LDA ARALASHUV KERAK: {name}\n{problem}")
        except Exception as e:
            logger.exception(f"[HEAL] Check xatosi: {name}")


# --- Namuna: orphan job ---
def check_orphan_jobs():
    """Worker o'lganda `running` holatda qolgan job'lar"""
    cutoff = timezone.now() - timedelta(minutes=15)
    orphans = Job.objects.filter(status='running', heartbeat_at__lt=cutoff)
    return list(orphans) if orphans.exists() else None

def heal_orphan_jobs(orphans):
    for job in orphans:
        if job.attempts < job.max_attempts:
            job.status, job.attempts = 'queued', job.attempts + 1
            job.save(update_fields=['status', 'attempts'])
            enqueue(job.queue, job.id)
        else:
            job.status = 'failed'; job.save()
            move_to_dlq(job)
    return True

# --- Namuna: stuck order ---
def check_stuck_orders():
    cutoff = timezone.now() - timedelta(minutes=45)
    return list(Order.objects.filter(status='cooking', updated_at__lt=cutoff))

def heal_stuck_orders(orders):
    for o in orders:
        # O'zi hal qila olmaydi — odam kerak, lekin xabar beradi
        ws_send(f'rest_{o.restaurant_id}_admin', {
            'type': 'alert.stuck_order', 'order_id': o.id, 'minutes': 45
        })
        notify_restaurant_admin(o.restaurant, f"⚠️ Buyurtma #{o.number} 45 daqiqadan beri tayyorlanmoqda")
    return False   # avtomatik tuzatilmadi, lekin xabar berildi
```

### 6.3 Chaos engineering (ishonchni tekshirish)

Oyiga 1 marta **atayin** yiqitib ko'riladi (production'ga o'xshash muhitda):

| Test | Kutilgan natija |
|---|---|
| Tasodifiy web node o'chirish | Foydalanuvchi sezmaydi |
| Redis o'chirish | Menyu ishlaydi (DB'dan), WS uziladi va tiklanadi |
| DB primary o'chirish | 30-60s yozish yo'q, keyin failover, o'qish uzilmaydi |
| AI provayder bloklash | Keyingi provayderga o'tadi, log'da ko'rinadi |
| Tarmoq kechikishi +2s | Timeout va circuit breaker ishlaydi |
| Disk to'ldirish 95% | Auto-cleanup ishlaydi |

---

## 7. ⚡ ISHLASH TALABLARI (SLA/SLO)

### 7.1 Javob vaqti (p95)

| Endpoint | Maqsad | Maks |
|---|---|---|
| `GET /t/<token>` (QR) | 80 ms | 200 ms |
| `GET /api/menu/<slug>/` | 100 ms | 250 ms |
| `GET /api/ar/<id>/` | 60 ms | 150 ms |
| `POST /api/orders/create/` | 200 ms | 500 ms |
| `POST /api/payments/create/` | 400 ms | 1 000 ms |
| WS xabar yetkazish | 50 ms | 200 ms |
| Admin dashboard | 300 ms | 800 ms |
| 3D fayl (CDN) | 1,5 s | 4 s |

### 7.2 Mavjudlik (availability)

| Xizmat | SLO | Yiliga ruxsat etilgan uzilish |
|---|---|---|
| Mijoz menyu (o'qish) | **99,95%** | 4,4 soat |
| Buyurtma yaratish | **99,9%** | 8,8 soat |
| To'lov | **99,9%** | 8,8 soat |
| Real-time (WS) | 99,5% | 43,8 soat |
| Admin panel | 99,5% | 43,8 soat |
| 3D generatsiya | 99,0% | 87,6 soat |

### 7.3 Ma'lumot yo'qotmaslik

| Ma'lumot | RPO (yo'qotish) | RTO (tiklash) |
|---|---|---|
| Buyurtma / To'lov | **0** (sinxron replikatsiya) | 5 daqiqa |
| Menyu / Restoran | 5 daqiqa | 15 daqiqa |
| 3D fayllar | 1 soat | 1 soat |
| Analitika | 1 soat | 4 soat |

---

## 8. 🔐 XAVFSIZLIK

### 8.1 Qatlamlar

| Qatlam | Chora |
|---|---|
| **Tarmoq** | Cloudflare WAF, DDoS, faqat 80/443 ochiq, DB/Redis private tarmoqda |
| **Ilova** | CSRF, XSS (CSP), SQL injection (ORM), rate limiting |
| **Auth** | JWT (qisqa TTL) + refresh, PIN bcrypt, 2FA super-admin |
| **Avtorizatsiya** | Har so'rovda `restaurant_id` tekshiruvi ⚡ |
| **Ma'lumot** | TLS 1.3, DB shifrlash (at-rest), maxfiy ma'lumot Vault'da |
| **To'lov** | PCI DSS — karta ma'lumoti **bizda saqlanmaydi** |
| **Audit** | Har muhim harakat AuditLog'da (kim, nima, qachon, IP) |

### 8.2 ⚠️ Multi-tenant izolyatsiya (eng muhim xavfsizlik masalasi)

```python
# core/mixins.py — HAR view'da ishlatiladi

class TenantScopedMixin:
    """Restoran chegarasidan chiqishni imkonsiz qiladi"""
    def get_queryset(self):
        qs = super().get_queryset()
        rid = self.request.restaurant_id      # middleware o'rnatadi
        if rid is None:
            raise PermissionDenied("Restoran aniqlanmadi")
        return qs.filter(restaurant_id=rid)


# ❌ HECH QACHON:
dish = Dish.objects.get(pk=dish_id)               # boshqa restoranniki bo'lishi mumkin!

# ✅ DOIM:
dish = Dish.objects.get(pk=dish_id, category__restaurant_id=request.restaurant_id)
```

**Avtomatik tekshiruv:** CI'da test — har model uchun cross-tenant kirish urinishi
**403 qaytarishi shart**. Test o'tmasa deploy bloklanadi.

### 8.3 Rate limiting

| Endpoint | Limit | Kalit |
|---|---|---|
| QR kirish | 60/daq | IP |
| Menyu API | 120/daq | IP |
| Buyurtma yaratish | 10/daq | session |
| Chaqiruv | 1/daq | stol |
| AI chat | 10/5daq | session |
| Staff login | 5/15daq | IP+PIN |
| Admin API | 300/daq | user |
| To'lov | 5/daq | session |

---

## 9. 📊 KUZATUV (observability)

### 9.1 Metrikalar (Prometheus)

```
# Biznes
armenu_orders_total{restaurant,status}
armenu_order_value_sum{restaurant}
armenu_ar_views_total{restaurant,dish}
armenu_ar_conversion_ratio{restaurant}
armenu_active_restaurants

# Texnik
armenu_http_request_duration_seconds{endpoint,method,status}
armenu_ws_connections{node}
armenu_db_query_duration_seconds{query_type}
armenu_cache_hit_ratio{cache_name}
armenu_queue_depth{queue}
armenu_job_duration_seconds{job_type}
armenu_circuit_breaker_state{service}

# Tashqi
armenu_external_api_duration_seconds{provider}
armenu_ai_cost_usd_total{provider,model}
armenu_fiscal_queue_depth
```

### 9.2 Alert qoidalari

| Alert | Shart | Daraja | Kimga |
|---|---|---|---|
| Xatolik darajasi | 5xx > 1% (5 daq) | 🔴 P1 | Telegram + qo'ng'iroq |
| Javob sekin | p95 > 1s (5 daq) | 🟠 P2 | Telegram |
| DB conn | > 85% pool | 🟠 P2 | Telegram |
| Navbat to'lgan | depth > 1000 | 🟠 P2 | Telegram |
| Fiskal navbat | depth > 50 (10 daq) | 🔴 P1 | Telegram |
| Disk | > 85% | 🟠 P2 | Telegram |
| WS uzilish | > 20% (5 daq) | 🟡 P3 | Slack |
| AI xarajat | > $50/kun | 🟡 P3 | Telegram |
| Restoran nofaol | 3 kun buyurtma yo'q | 🟡 P3 | Sotuv jamoasi |

---

## 10. 💾 BACKUP VA FALOKATDAN TIKLASH

| Ma'lumot | Chastota | Saqlash | Joy |
|---|---|---|---|
| PostgreSQL to'liq | Kunlik 03:00 | 30 kun | S3 (boshqa region) |
| PostgreSQL WAL | Uzluksiz | 7 kun | S3 |
| Redis snapshot | 6 soatda | 3 kun | S3 |
| 3D fayllar | Real-time replica | Doimiy | S3 versioning |
| Kod | Har commit | Doimiy | Git (GitHub + lokal) |
| Konfiguratsiya | Har o'zgarish | Doimiy | Git (shifrlangan) |

**Tiklash mashqi:** har chorakda backup'dan to'liq tiklash sinovi (staging'da).

---

**➡️ Keyingi qism:** [04_DATA_MODEL_VA_API.md](04_DATA_MODEL_VA_API.md)
