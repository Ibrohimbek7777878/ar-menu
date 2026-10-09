# ARMENU — TIZIM ARXITEKTURASI
## QISM 0 — UMUMIY KO'RINISH

**Versiya:** 1.0 · **Sana:** 2026-09-04
**Kim uchun:** tizim arxitektori · texnik direktor · investor (texnik due diligence) · dasturchi

---

## 1. ARXITEKTURA BIR QARASHDA

```
                                    🌍 FOYDALANUVCHILAR
                    ┌───────────────┬───────────────┬───────────────┐
                    │               │               │               │
              👤 Mijoz        🧑‍🍳 Ofitsiant     🍳 Oshxona      👨‍💼 Admin
              (PWA, QR)        (PWA, PIN)      (TV monitor)    (Desktop)
                    │               │               │               │
                    └───────────────┴───────┬───────┴───────────────┘
                                            │ HTTPS + WSS
                    ┌───────────────────────▼───────────────────────┐
                    │           CLOUDFLARE (CDN + WAF)              │
                    │  • DDoS himoya  • 3D fayl kesh  • TLS         │
                    └───────────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────▼───────────────────────┐
                    │      NGINX (reverse proxy + LB)               │
                    └──────┬─────────────────────────────┬──────────┘
                           │                             │
              ┌────────────▼──────────┐    ┌─────────────▼─────────┐
              │   WEB (gunicorn)      │    │   WS (daphne)         │
              │   :8060 · stateless   │    │   :8061 · stateful    │
              │   N instans           │    │   M instans           │
              └────────────┬──────────┘    └─────────────┬─────────┘
                           │                             │
                           └──────────────┬──────────────┘
                                          │
              ┌───────────────────────────▼───────────────────────────┐
              │                    MA'LUMOT QATLAMI                    │
              │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
              │  │ PostgreSQL   │  │    Redis     │  │  S3/MinIO   │ │
              │  │ primary+repl │  │  cache+queue │  │  3D fayllar │ │
              │  │  + pgvector  │  │  + channels  │  │  + rasmlar  │ │
              │  └──────────────┘  └──────────────┘  └─────────────┘ │
              └───────────────────────────┬───────────────────────────┘
                                          │
              ┌───────────────────────────▼───────────────────────────┐
              │              WORKER QATLAMI (5 navbat)                 │
              │  model3d · fiscal · notify · ai · analytics            │
              └───────────────────────────┬───────────────────────────┘
                                          │
              ┌───────────────────────────▼───────────────────────────┐
              │                  TASHQI XIZMATLAR                      │
              │  AI(8) · To'lov(3) · Fiskal(2) · Telegram · CDN       │
              └────────────────────────────────────────────────────────┘
```

---

## 2. ARXITEKTURA HUJJATLARI XARITASI

| Qism | Fayl | Nima haqida |
|---|---|---|
| **0** | `00_UMUMIY_KORINISH.md` | ← siz shu yerdasiz |
| **1** | `01_PRINTSIPLAR_VA_QARORLAR.md` | 12 printsip, 15 ADR (nega shunday qilingan) |
| **2** | `02_KOMPONENTLAR.md` | Har komponent: vazifasi, texnologiyasi, chegaralari |
| **3** | `03_MALUMOT_ARXITEKTURASI.md` | DB sxema, indeks, partition, sharding, kesh qatlamlari |
| **4** | `04_MASSHTABLASH.md` | S0→S5, 1 mln foydalanuvchi, sig'im hisoblari |
| **5** | `05_ISHONCHLILIK.md` | Fault-tolerance, self-healing, SLA, falokatdan tiklash |
| **6** | `06_XAVFSIZLIK.md` | Tahdid modeli, multi-tenant izolyatsiya, to'lov, GDPR |
| **7** | `07_INTEGRATSIYALAR.md` | AI/MCP, to'lov, fiskal, Telegram — adapter naqshlari |
| **8** | `08_DEPLOY_VA_OPERATSIYA.md` | Infra, CI/CD, monitoring, runbook |

---

## 3. LOYIHA KONTEKSTI (C4 — Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TIZIM KONTEKSTI                              │
│                                                                     │
│   ┌──────────┐         ┌─────────────────┐         ┌────────────┐  │
│   │  Mijoz   │────────▶│                 │◀────────│ Restoran   │  │
│   │ (turist, │  QR,    │                 │  menyu, │  xodimi    │  │
│   │  mahalliy)│ buyurtma│    ARMENU       │  nazorat│(ofitsiant, │  │
│   └──────────┘         │    PLATFORMA    │         │  oshpaz)   │  │
│                        │                 │         └────────────┘  │
│   ┌──────────┐         │                 │         ┌────────────┐  │
│   │ Restoran │────────▶│                 │◀────────│ Platforma  │  │
│   │  egasi   │  menyu, │                 │ nazorat │  operatori │  │
│   └──────────┘  hisobot└────────┬────────┘         └────────────┘  │
│                                 │                                   │
│         ┌───────────────────────┼───────────────────────┐          │
│         ▼                       ▼                       ▼          │
│  ┌─────────────┐        ┌──────────────┐       ┌──────────────┐   │
│  │ To'lov      │        │ Soliq (OFD)  │       │ AI provayder │   │
│  │ Payme/Click │        │ UZKASSA/ePOS │       │ 8 ta         │   │
│  │ /Uzum       │        │ tasnif.soliq │       │              │   │
│  └─────────────┘        └──────────────┘       └──────────────┘   │
│         ▼                       ▼                       ▼          │
│  ┌─────────────┐        ┌──────────────┐       ┌──────────────┐   │
│  │ Telegram    │        │ Google/Yandex│       │ CDN          │   │
│  │ Bot+MiniApp │        │ Sharhlar     │       │ Cloudflare   │   │
│  └─────────────┘        └──────────────┘       └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. ASOSIY SIFAT TALABLARI (quality attributes)

Arxitektura shu 8 ta talab atrofida qurilgan. Prioritet tartibida:

| # | Talab | Maqsad | Qanday erishiladi |
|---|---|---|---|
| 1 | **Multi-tenant izolyatsiya** | 0 ta sizish | Middleware + Mixin + CI test |
| 2 | **Mavjudlik** | 99,9% (buyurtma) | Stateless + replica + auto-failover |
| 3 | **Ishlash** | p95 < 250 ms | Kesh 4 qatlam + CDN + indeks |
| 4 | **Masshtablanuvchanlik** | 1 mln bir vaqtda | Gorizontal + WS optimizatsiya |
| 5 | **Chidamlilik** | Qism yiqilsa ishlaydi | Circuit breaker + fallback + bulkhead |
| 6 | **Tiklanuvchanlik** | Avtomatik | Self-healing daemon (15 mexanizm) |
| 7 | **Kengaytiriluvchanlik** | 5 yil eskimaydi | Adapter + plugin + MCP qatlam |
| 8 | **Kuzatiluvchanlik** | 5 daqiqada muammo topiladi | Metric + log + trace + alert |

**Ataylab qurbon qilinganlar (trade-off):**

| Nima qurbon qilindi | Nima uchun |
|---|---|
| Mikroservis (monolit tanlandi) | 1-2 dasturchi, tezlik muhim; modulli monolit yetarli |
| Kubernetes (systemd tanlandi) | S0-S3 gacha kerak emas; murakkablik ortadi |
| GraphQL (REST tanlandi) | Oddiy CRUD; kesh REST'da osonroq |
| Event sourcing (CRUD tanlandi) | Murakkablik; audit log yetarli |
| Real-time hamma joyda | Mijozga WS faqat buyurtmadan keyin (1 mln uchun kritik) |

---

## 5. TEXNOLOGIK STEK VA SABABLARI

| Qatlam | Tanlov | Nima uchun | Muqobil (rad etilgan) |
|---|---|---|---|
| Backend | **Django 5** | Jamoada tajriba, ORM, admin, ekotizim | FastAPI (tajriba yo'q), Node (tip xavfsizligi) |
| API | **DRF** | Django bilan bir butun, serializer, auth | GraphQL (kesh murakkab) |
| Real-time | **Channels + Daphne** | Django bilan integratsiya | Socket.io (alohida servis) |
| DB | **PostgreSQL 16** | JSONB, GIN, partition, pgvector, ishonchli | MySQL (JSONB zaif), Mongo (tranzaksiya) |
| Vektor | **pgvector** | DB ichida, alohida servis kerak emas | Pinecone (pulli), Qdrant (alohida) |
| Kesh/navbat | **Redis 7** | Tez, channels layer, navbat, lock | Memcached (pub/sub yo'q), RabbitMQ (ortiqcha) |
| Fayl | **S3/MinIO** | 3D fayllar, versiyalash, CDN origin | Lokal disk (masshtablanmaydi) |
| Frontend | **Vanilla JS + PWA** | Yengil, tez, framework yuki yo'q | React (200KB+, SEO, murakkablik) |
| AR | **`<model-viewer>`** | iOS+Android bitta kod, Google qo'llab-quvvatlaydi | Three.js (AR o'zi yo'q), 8thWall (pulli) |
| To'lov | **paytechuz** | 3 provayder bitta kutubxona | Har biriga alohida SDK |
| Deploy | **systemd + nginx** | Oddiy, ishonchli, S3 gacha yetadi | k8s (S4 dan keyin), Docker Swarm |

---

## 6. MODULLI MONOLIT — ASOSIY QAROR

> **Qaror:** Mikroservis EMAS, **modulli monolit**.

### Nima uchun

| Sabab | Tushuntirish |
|---|---|
| Jamoa hajmi | 1-2 dasturchi. Mikroservis 5+ dasturchi uchun |
| Tranzaksiya | Buyurtma + to'lov + fiskal — bir tranzaksiyada bo'lishi kerak |
| Tezlik | 15 haftada v1. Mikroservis 2× uzoq |
| Operatsiya | 1 ta deploy, 1 ta log, 1 ta monitoring |
| Narx | 1 ta server yetadi (S0-S1) |

### Lekin — mikroservisga tayyor

Modullar **qat'iy chegaralangan**, kelajakda ajratish oson:

```
apps/
├── tenants/      ← chegara: restaurant_id
├── menu/         ← chegara: faqat menu modellari
├── orders/       ← chegara: buyurtma hayotiy sikli
├── ar3d/         ← ⚡ birinchi ajratiladigan (og'ir, mustaqil)
├── payments/     ← chegara: to'lov, tashqi API
├── fiscal/       ← chegara: OFD, IKPU
└── ai/           ← ⚡ ikkinchi ajratiladigan (tashqi API, sekin)
```

**Ajratish qoidasi:**
- Modullar bir-birini **to'g'ridan-to'g'ri chaqirmaydi** → servis funksiyasi orqali
- Modullar orasida **event** (signal) ishlatiladi
- Har modul **o'z jadvallariga** egalik qiladi

**Qachon ajratiladi:**

| Modul | Sharoit |
|---|---|
| `ar3d` | 3D generatsiya > 500/kun yoki GPU kerak bo'lsa |
| `ai` | AI so'rov > 100k/oy |
| `analytics` | Event > 10 mln/oy |

---

## 7. FIZIK ARXITEKTURA (deployment view)

### 7.1 S0 — Start (1-20 restoran)

```
┌─────────────────────────────────────────┐
│  1 × VPS (4 CPU, 8 GB, 100 GB NVMe)    │
│  ┌───────────────────────────────────┐  │
│  │ nginx                             │  │
│  ├───────────────────────────────────┤  │
│  │ armenu.service     (gunicorn ×4)  │  │
│  │ armenu-ws.service  (daphne ×1)    │  │
│  │ armenu-worker@×5                  │  │
│  │ armenu-healer.service             │  │
│  ├───────────────────────────────────┤  │
│  │ PostgreSQL 16                     │  │
│  │ Redis 7                           │  │
│  │ MinIO (3D fayllar)                │  │
│  └───────────────────────────────────┘  │
│  Narx: ~$40/oy                          │
└─────────────────────────────────────────┘
```

### 7.2 S3 — Respublika (400-1500 restoran)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  LB × 2      │  │  WEB × 4     │  │  WS × 2      │
│  (nginx)     │  │  4CPU/8GB    │  │  4CPU/8GB    │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PG primary   │  │ PG replica×2 │  │ Redis × 3    │
│ 8CPU/32GB    │  │ 4CPU/16GB    │  │ (sentinel)   │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│ WORKER × 3   │  │ S3 + CDN     │
└──────────────┘  └──────────────┘
Narx: ~$700/oy
```

### 7.3 S5 — 1 mln bir vaqtda

Batafsil: `04_MASSHTABLASH.md` §5

```
40 × WEB · 3 × WS · 6 × WORKER
1 × PG primary (16CPU/64GB) + 3 × replica
6 × Redis cluster · 2 × ClickHouse
Narx: ~$4 400/oy (daromadning 1,9%)
```

---

## 8. MA'LUMOT OQIMI — ASOSIY SSENARIY

### Buyurtma yaratish (eng kritik yo'l)

```
[1] Mijoz "Buyurtma" bosadi
     │
     ▼
[2] POST /v1/orders/  +  X-Idempotency-Key
     │
     ▼
[3] nginx → gunicorn worker
     │
     ▼
[4] TenantMiddleware → restaurant_id aniqlanadi
     │
     ▼
[5] Idempotency tekshiruvi (Redis)
     │  ├─ mavjud → mavjud buyurtma qaytariladi ✅ TUGADI
     │  └─ yo'q → davom
     ▼
[6] Validatsiya (7 bosqich)
     │  • stol shu restoranmi?
     │  • taomlar shu restoranmi?
     │  • stop-listda emasmi?
     │  • ⚡ NARX SERVERDA HISOBLANADI
     ▼
[7] transaction.atomic():
     │  Order.objects.create()
     │  OrderItem.objects.bulk_create()
     │  Table.status = 'ordering'
     ▼
[8] transaction.on_commit():
     │  ├─ WS → rest_<id>_kds       (oshxona)
     │  ├─ WS → rest_<id>_waiters   (ofitsiant)
     │  ├─ WS → rest_<id>_admin     (admin)
     │  ├─ WS → guest_<session>     (mijoz)
     │  ├─ enqueue('notify', ...)   (Telegram push)
     │  ├─ enqueue('notify', ...)   (oshxona printeri)
     │  └─ enqueue('analytics',...)  (event)
     ▼
[9] 201 Created  {id, number: "#047", eta_min: 18}

Vaqt byudjeti (p95):
  [3]-[4]  nginx + middleware      ≤  15 ms
  [5]      Redis idempotency        ≤   3 ms
  [6]      validatsiya (2 so'rov)   ≤  40 ms
  [7]      transaksiya (3 yozuv)    ≤  80 ms
  [8]      on_commit (async)        ≤   5 ms
  ──────────────────────────────────────────
  JAMI                              ≤ 143 ms   (maqsad 200 ms) ✅
```

---

## 9. ARXITEKTURANING 5 TA "OLTIN QOIDA"SI

> Bu qoidalar buzilsa — arxitektura buziladi. CI'da tekshiriladi.

| # | Qoida | Buzilsa nima bo'ladi | Tekshiruv |
|---|---|---|---|
| 1 | **Har so'rov `restaurant_id` bilan filtrlanadi** | Ma'lumot sizishi (kritik) | `test_tenant_isolation.py` |
| 2 | **Narx faqat serverda hisoblanadi** | Moliyaviy zarar | `test_price_calculation.py` |
| 3 | **Har yozuv operatsiyasi idempotent** | Dublikat buyurtma/to'lov | `test_payment_idempotency.py` |
| 4 | **Uzoq ish (>2s) → worker** | Web bloklanadi, timeout | Kod ko'rigi + `tekshir_kod.sh` |
| 5 | **Tashqi chaqiruv → circuit breaker** | Kaskadli yiqilish | Kod ko'rigi |

---

## 10. ARXITEKTURA EVOLYUTSIYASI (5 yil)

```
YIL 1 — MODULLI MONOLIT
├── 1 VPS → 4 node
├── PostgreSQL + Redis
└── 400 restoran

YIL 2 — GORIZONTAL MASSHTAB
├── Read replica × 2
├── ar3d moduli ajratiladi (GPU node)
├── ClickHouse (analitika)
└── 1 500 restoran, 2 mamlakat

YIL 3 — REGIONAL
├── Multi-region (UZ + KZ)
├── ai moduli ajratiladi
├── DB partition → sharding tayyorgarligi
└── 4 000 restoran, 4 mamlakat

YIL 4 — PLATFORMA
├── Mijoz marketplace ilovasi
├── Ta'minotchi moduli
├── Sharding (restaurant_id hash)
└── 8 000 restoran

YIL 5 — EKOTIZIM
├── Moliyalash moduli (skoring)
├── Ochiq API (3rd party)
├── k8s (agar kerak bo'lsa)
└── 15 000+ restoran
```

**Har bosqichda arxitektura o'zgarmaydi — kengayadi.** Sabab:
- Stateless → node qo'shiladi
- Adapter → yangi provayder qo'shiladi
- Modul chegarasi → ajratish oson
- MCP qatlam → AI provayder almashadi

---

## 11. RISK VA CHEKLOVLAR

### Arxitekturaviy risklar

| Risk | Ehtimol | Ta'sir | Yumshatish |
|---|---|---|---|
| Monolit o'sib ketadi | O'rta | O'rta | Modul chegarasi qat'iy; ajratish rejasi bor |
| PostgreSQL yozish cheklovi | Past | Yuqori | Partition → replica → sharding yo'li tayyor |
| WS 1 mln ulanish | Past | Yuqori | ⚡ Mijozga WS faqat buyurtmadan keyin |
| 3D fayl hajmi (storage) | O'rta | O'rta | Kutubxona (nusxa emas, havola) + CDN |
| Tashqi API bog'liqlik | Yuqori | O'rta | 8 AI, 3 to'lov, 2 fiskal — fallback zanjiri |
| Vendor lock-in | Past | O'rta | Ochiq texnologiyalar; S3 API standart |

### Ma'lum cheklovlar (bilib qabul qilingan)

| Cheklov | Sabab | Qachon hal qilinadi |
|---|---|---|
| iOS'da WebXR yo'q | Apple cheklovi | Apple ochganda (USDZ ishlaydi) |
| Gaussian Splatting yo'q | AR Quick Look qo'llab-quvvatlamaydi | Standart chiqqanda |
| Offline buyurtma yo'q | Fiskal + narx serverda | v2 da navbat bilan |
| Real-time hamma joyda emas | 1 mln uchun optimizatsiya | Ataylab |

---

**➡️ Keyingi:** `01_PRINTSIPLAR_VA_QARORLAR.md`
