# ARMENU — TIZIM ARXITEKTURASI
## QISM 5 — ISHONCHLILIK (fault tolerance · self-healing · DR)

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** SRE · DevOps · tizim arxitektori · texnik direktor
**Asos:** `TZ_MASTER/03_ARXITEKTURA.md` §5, §6, §7, §10

---

## 0. BU HUJJATNING MAQSADI

> **Asosiy printsip:** ARMENU restoranning **ish jarayonidir**, sayt emas.
> Restoranda soat 20:00 da tizim yiqilsa — 40 ta stol, 200 ta mijoz, real pul yo'qoladi.
> Shuning uchun arxitektura **"yiqilmaydi"** deb emas, **"yiqilganda ham ishlaydi"**
> deb qurilgan.

Uch qatlamli ishonchlilik falsafasi:

```
┌───────────────────────────────────────────────────────────┐
│  QATLAM 1 — OLDINI OLISH (prevention)                     │
│  Redundantlik · health-check · sig'im zaxirasi · test      │
│  → Yiqilish EHTIMOLINI kamaytiradi                        │
├───────────────────────────────────────────────────────────┤
│  QATLAM 2 — CHIDAMLILIK (tolerance)                       │
│  Circuit breaker · fallback · bulkhead · timeout · retry  │
│  → Yiqilish TA'SIRINI cheklaydi (kaskad bo'lmaydi)        │
├───────────────────────────────────────────────────────────┤
│  QATLAM 3 — TIKLANISH (recovery)                          │
│  Self-healing daemon · auto-failover · DR runbook         │
│  → Yiqilish DAVOMIYLIGINI qisqartiradi                    │
└───────────────────────────────────────────────────────────┘
```

**Bitta jumlada:** *Mijoz taom buyurtma qila olsa — tizim ishlayapti.
Qolgan hamma narsa (AR, AI, analitika, 3D) qurbon qilinishi mumkin.*

---

## 1. ISHONCHLILIK MAQSADLARI (SLO)

### 1.1 Xizmatlar bo'yicha SLO jadvali

| # | Xizmat (SLI) | Mavjudlik SLO | Javob vaqti p95 | Javob vaqti p99 | Xato darajasi | Kritiklik |
|---|---|---|---|---|---|---|
| 1 | **Buyurtma yaratish** `POST /v1/orders/` | 🔴 **99,90%** | 200 ms | 500 ms | < 0,1% | Yadro |
| 2 | **To'lov boshlash** `POST /v1/payments/` | 🔴 **99,90%** | 400 ms | 1 000 ms | < 0,1% | Yadro |
| 3 | **Mijoz menyu (o'qish)** `GET /v1/menu/` | 🔴 **99,95%** | 100 ms | 250 ms | < 0,05% | Yadro |
| 4 | **QR kirish** `GET /t/<token>` | 🔴 **99,95%** | 80 ms | 200 ms | < 0,05% | Yadro |
| 5 | **KDS (oshxona ekrani)** | 🟠 99,90% | 150 ms | 400 ms | < 0,1% | Yadro |
| 6 | **AR model ko'rish** `GET /v1/ar/<id>/` | 🟠 99,50% | 60 ms | 150 ms | < 0,5% | Muhim |
| 7 | **Real-time (WS yetkazish)** | 🟠 99,50% | 50 ms | 200 ms | < 0,5% | Muhim |
| 8 | **Fiskal chek (OFD)** | 🟠 99,50%¹ | — | — | < 0,5% | Muhim |
| 9 | **Admin panel** | 🟡 99,50% | 300 ms | 800 ms | < 0,5% | O'rta |
| 10 | **3D fayl yetkazish (CDN)** | 🟡 99,50% | 1,5 s | 4 s | < 1% | O'rta |
| 11 | **AI chat / tavsiya** | 🟢 99,00% | 1,2 s | 3 s | < 2% | Qo'shimcha |
| 12 | **3D generatsiya (worker)** | 🟢 99,00% | — | — | < 3% | Qo'shimcha |
| 13 | **Analitika / hisobot** | 🟢 99,00% | 800 ms | 2 s | < 2% | Qo'shimcha |
| 14 | **Telegram bildirishnoma** | 🟢 98,00% | — | — | < 3% | Qo'shimcha |

¹ *Fiskal SLO "24 soat ichida OFDga yetkazilgan chek ulushi" sifatida o'lchanadi,
so'rov-daqiqasi emas — chunki chek navbatga tushishi normal holat.*

### 1.2 Uzilish byudjeti (yiliga ruxsat etilgan)

| SLO | Yiliga | Oyiga | Haftasiga | Ma'nosi |
|---|---|---|---|---|
| 99,95% | 4 s 23 daq | 21,9 daq | 5,0 daq | Bitta uzoq deploy |
| 99,90% | 8 s 46 daq | 43,8 daq | 10,1 daq | Bitta DB failover + deploy |
| 99,50% | 43 s 48 daq | 3 s 39 daq | 50,4 daq | Bir necha jiddiy insident |
| 99,00% | 87 s 36 daq | 7 s 18 daq | 100,8 daq | Tashqi provayder yiqilishi |
| 98,00% | 7 kun 7 s | 14 s 36 daq | 3 s 22 daq | Telegram/tashqi API |

### 1.3 ⚡ Error budget hisobi va siyosati

**Formula:**
```
Error budget (daqiqa/oy) = 43 200 × (1 − SLO)
Sarflangan             = ∑(insident davomiyligi × ta'sirlangan trafik ulushi)
Qolgan %               = (Byudjet − Sarflangan) / Byudjet × 100
```

**Namuna hisob — "Buyurtma yaratish" (SLO 99,90%), sentabr oyi:**

| Sana | Insident | Davomiylik | Ta'sirlangan trafik | Sarf (daq) |
|---|---|---|---|---|
| 09-03 | PG failover (Patroni) | 47 s | 100% | 0,78 |
| 09-11 | Deploy — WS restart | 12 daq | 0% (buyurtma ishladi) | 0,00 |
| 09-14 | Redis Sentinel almashuv | 9 s | 100% | 0,15 |
| 09-19 | Payme timeout | 22 daq | 18% (to'lov qismi) | 3,96 |
| 09-27 | 1 web node OOM | 6 daq | 0% (LB chetlab o'tdi) | 0,00 |
| | **JAMI** | | | **4,89 daq** |

```
Byudjet   = 43 200 × 0,001 = 43,2 daq/oy
Sarflangan= 4,89 daq
Qolgan    = 38,31 daq (88,7%)  → 🟢 YASHIL
```

**Byudjet siyosati (release gating):**

| Qolgan byudjet | Rang | Siyosat |
|---|---|---|
| > 50% | 🟢 | Normal — feature deploy erkin, chaos test rejaga ko'ra |
| 25–50% | 🟡 | Ehtiyot — deploy faqat ish kunlari 10:00–15:00, canary majburiy |
| 10–25% | 🟠 | Cheklov — faqat bug-fix va ishonchlilik ishlari; yangi feature MUZLATILADI |
| < 10% | 🔴 | ⛔ **Feature freeze**. Butun jamoa ishonchlilikka o'tadi. Post-mortem majburiy |
| < 0% | 🔴 | SLO buzildi — texnik direktor darajasida ko'rib chiqish, mijozga xabar |

**Amalga oshirish (Prometheus recording rule):**

```yaml
# monitoring/rules/slo.yml
groups:
  - name: armenu_slo
    interval: 30s
    rules:
      - record: armenu:order_success_ratio_30d
        expr: |
          sum(rate(armenu_http_requests_total{endpoint="orders_create",status!~"5.."}[30d]))
          /
          sum(rate(armenu_http_requests_total{endpoint="orders_create"}[30d]))

      - record: armenu:order_error_budget_remaining
        expr: |
          1 - ((1 - armenu:order_success_ratio_30d) / 0.001)

      - alert: ErrorBudgetBurnFast
        # 1 soatda oylik byudjetning 5% i yonib ketsa — darhol
        expr: |
          (1 - (sum(rate(armenu_http_requests_total{endpoint="orders_create",status!~"5.."}[1h]))
                / sum(rate(armenu_http_requests_total{endpoint="orders_create"}[1h])))) > 0.014
        for: 5m
        labels: {severity: P1}
        annotations:
          summary: "🔴 Error budget tez yonmoqda — 1 soatda 5%"

      - alert: ErrorBudgetLow
        expr: armenu:order_error_budget_remaining < 0.10
        for: 15m
        labels: {severity: P2}
        annotations:
          summary: "🟠 Error budget < 10% — FEATURE FREEZE"
```

---

## 2. YIQILISH REJIMI TAHLILI (FMEA)

> FMEA = Failure Mode and Effects Analysis.
> **RPN** (Risk Priority Number) = Ehtimol × Ta'sir × Aniqlanmaslik (har biri 1–5).
> RPN ≥ 45 → majburiy yumshatish rejasi, RPN ≥ 75 → arxitektura o'zgarishi.

### 2.1 Infratuzilma komponentlari

| # | Komponent | Yiqilish turi | E | T | A | RPN | Aniqlash usuli | MTTR | Yumshatish |
|---|---|---|---|---|---|---|---|---|---|
| F1 | nginx (LB) | Process crash / config xato | 2 | 5 | 1 | 10 | systemd + `/healthz` port probe | 30 s | 2× LB, keepalived VIP, `nginx -t` deploy oldidan |
| F2 | gunicorn worker | OOM kill (RAM > 80%) | 3 | 3 | 2 | 18 | `armenu_worker_rss_bytes` | 15 s | `--max-requests 1000 --max-requests-jitter 100`, memory guard healer |
| F3 | gunicorn (barchasi) | Deploy xatosi / migratsiya bloklandi | 2 | 5 | 1 | 10 | Health-check 3× fail | 2 daq | Canary deploy, avto-rollback, socket-activation |
| F4 | daphne (WS) | Ulanish sizishi, event-loop bloklandi | 3 | 2 | 3 | 18 | `armenu_ws_connections` + p99 | 15 s | 2+ WS node, klient auto-reconnect, SSE fallback |
| F5 | PostgreSQL primary | Disk to'ldi / node crash | 2 | 5 | 1 | 10 | Patroni watchdog, `pg_isready` | 30–60 s | Patroni auto-failover, sinxron replica, disk alert 85% |
| F6 | PostgreSQL replica | Replikatsiya lag > 30 s | 3 | 2 | 2 | 12 | `pg_stat_replication.lag` | 5 daq | 2+ replica, lag > 10 s → replica trafikdan chiqadi |
| F7 | PostgreSQL — connection pool | Pool tugadi (leak) | 3 | 4 | 2 | 24 | `pg_stat_activity` count | 1 daq | PgBouncer transaction mode, conn leak healer, `CONN_MAX_AGE=60` |
| F8 | Redis master | OOM / node crash | 2 | 4 | 1 | 8 | Sentinel quorum | 10 s | Sentinel 3 node, `maxmemory-policy allkeys-lru`, AOF everysec |
| F9 | Redis — cache stampede | Kesh muzlagach 1000 so'rov DBga | 3 | 4 | 3 | 36 | `cache_hit_ratio` keskin tushishi | 2 daq | Probabilistic early expiration + `lock`-bilan-qayta-hisoblash |
| F10 | Worker (har navbat) | Process o'lishi, job `running`da qolishi | 4 | 2 | 2 | 16 | `heartbeat_at` eskirishi | 60 s | Orphan job recovery healer, `Restart=always` |
| F11 | Worker navbati | Navbat to'lishi (depth > 1000) | 3 | 3 | 2 | 18 | `armenu_queue_depth` | 10 daq | Bulkhead (5 alohida navbat), avto-scale, DLQ |
| F12 | S3 / MinIO | Bucket mavjud emas / 5xx | 2 | 3 | 2 | 12 | HEAD probe har 60 s | 5 daq | Replica bucket, CDN kesh, rasm-fallback |
| F13 | Disk (har node) | 100% to'ldi | 3 | 5 | 1 | 15 | `node_filesystem_avail` | 10 daq | 85% da avto-cleanup healer, log rotate, alert 80% |
| F14 | Tarmoq (node↔DB) | Paket yo'qolishi, split-brain | 2 | 5 | 3 | 30 | Patroni DCS quorum, ping | 1–5 daq | etcd 3 node quorum, fencing, `statement_timeout` |
| F15 | Sertifikat (TLS) | Muddati tugadi | 2 | 5 | 2 | 20 | Muddat probe (30 kun oldin) | 10 daq | certbot avto-yangilash + 30/14/7 kunlik alert |

### 2.2 Tashqi xizmatlar

| # | Xizmat | Yiqilish turi | E | T | A | RPN | Aniqlash usuli | MTTR | Yumshatish |
|---|---|---|---|---|---|---|---|---|---|
| F16 | To'lov (Payme) | 5xx / timeout / hisob bloklandi | 4 | 4 | 1 | 16 | CB `payme` OPEN | Darhol | Click → Uzum → naqd zanjiri |
| F17 | To'lov — webhook kelmadi | Provayder callback yubormadi | 3 | 4 | 4 | 48 | 🔴 Reconciliation cron 5 daq | 5 daq | Poll-fallback: `check_transaction` har 60 s, 24 s davomida |
| F18 | OFD (UZKASSA) | API o'chgan / IKPU rad etdi | 4 | 3 | 2 | 24 | CB `ofd` OPEN + navbat depth | 5 daq–24 s | OFD-2 (e-POS), navbat + 48 s retry, qo'lda chek |
| F19 | AI provayder | Rate limit / kredit tugadi | 5 | 1 | 1 | 5 | CB + `ai_cost_usd_total` | Darhol | 6 bosqichli zanjir + FAQ fallback |
| F20 | CDN (Cloudflare) | Region uzilishi | 2 | 3 | 1 | 6 | Sintetik probe 4 nuqtadan | 5 daq | DNS failover → origin nginx, `Cache-Control` uzun |
| F21 | Telegram Bot API | 429 / bloklangan | 3 | 1 | 1 | 3 | Retry hisoblagichi | 1 soat | Navbat + retry 5×, panelda badge fallback |
| F22 | tasnif.soliq.uz (IKPU) | Sekin / o'chgan | 3 | 2 | 2 | 12 | Probe + CB | 1 s | IKPU lokal kesh (30 kun TTL), qo'lda kiritish |

### 2.3 Ilova qatlami (mantiqiy xatolar)

| # | Yiqilish turi | E | T | A | RPN | Aniqlash | Yumshatish |
|---|---|---|---|---|---|---|---|
| F23 | 🔴 **Cross-tenant sizish** (`restaurant_id` filtri unutildi) | 2 | 5 | 5 | **50** | CI `test_tenant_isolation`, audit skript | 4 qatlamli himoya — `06_XAVFSIZLIK.md` §2 |
| F24 | Dublikat buyurtma (klient 2× bosdi) | 4 | 3 | 3 | 36 | `X-Idempotency-Key` konflikt metrikasi | Idempotency Redis + DB unique |
| F25 | Dublikat to'lov (webhook 2× keldi) | 4 | 5 | 2 | 40 | `PaymentTransaction` unique | Idempotency + `SELECT FOR UPDATE` |
| F26 | Narx manipulyatsiyasi (klient narx yubordi) | 3 | 5 | 4 | **60** | Server-side narx testi | ⚡ Narx FAQAT serverda; klient `dish_id`+`qty` yuboradi |
| F27 | Stuck order (`cooking` 45 daq) | 3 | 3 | 3 | 27 | Stuck order healer | Admin alert + KDS badge |
| F28 | Migratsiya bloklandi (`ALTER TABLE` lock) | 2 | 5 | 2 | 20 | Deploy timeout | `lock_timeout=3s`, zero-downtime migratsiya qoidalari |
| F29 | N+1 so'rov (yangi kod) | 4 | 3 | 3 | 36 | `django-silk` staging, p95 alert | `select_related`/`prefetch_related` CI linter |
| F30 | Poison message (worker cheksiz crash) | 3 | 3 | 2 | 18 | `attempts >= max_attempts` | DLQ + 3 urinishdan keyin karantín |

**🔴 Eng yuqori RPN uchtaligi:**
1. **F26 — narx manipulyatsiyasi (60)** → yagona yechim: narxni server hisoblaydi (Oltin qoida #2)
2. **F23 — cross-tenant sizish (50)** → 4 qatlamli himoya + CI gate (Oltin qoida #1)
3. **F17 — to'lov webhook kelmadi (48)** → reconciliation cron majburiy

---

## 3. YIQILISH MATRITSASI (17 ssenariy)

> Har ssenariy: **ta'sir darajasi · nima ishlashda davom etadi · tiklanish**

### Belgilar
🟢 = sezilmaydi · 🟡 = qisman degradatsiya · 🟠 = jiddiy · 🔴 = to'liq to'xtash

| # | Yiqilish | Daraja | ✅ Ishlashda davom etadi | ⛔ Ishlamaydi | Tiklanish |
|---|---|---|---|---|---|
| **1** | **1 ta web node** | 🟢 | Hammasi. LB 3 s ichida boshqasiga yuboradi | — | Avto 30 s (systemd + LB health) |
| **2** | **Barcha web node** | 🔴 | Faqat CDN'dagi statik menyu snapshot (read-only PWA) | Buyurtma, to'lov, admin | Auto-restart 30 s → alert P1 → qo'lda 5 daq |
| **3** | **1 ta WS node** | 🟡 | Barcha HTTP. Klient 1–30 s ichida boshqa nodega ulanadi | O'sha nodedagi jonli push (qisqa uzilish) | Avto 15 s |
| **4** | **Barcha WS node** | 🟡 | ✅ Menyu, buyurtma, to'lov, KDS (polling 10 s), admin | Jonli push, "ofitsiant yo'lda" indikatori | Auto-restart 30 s. Klient SSE → polling'ga tushadi |
| **5** | **Redis (cache+channels)** | 🟠 | ✅ Menyu (DBdan, sekinroq), buyurtma, to'lov, fiskal | WS butunlay, rate-limit (fail-open), idempotency kesh (DB unique zaxira) | Sentinel failover 10 s. Cache warm-up 30 s |
| **6** | **PostgreSQL primary** | 🔴→🟡 | ✅ **O'qish ishlaydi** (replica): menyu, AR, taom kartochkasi, KDS ko'rish | Yozish: buyurtma, to'lov, status o'zgarishi | Patroni auto-failover 30–60 s. Yozish navbatga tushmaydi — 503 + "qayta urinib ko'ring" |
| **7** | **PostgreSQL to'liq (primary+replica)** | 🔴 | Faqat CDN statik: menyu snapshot JSON, 3D fayllar, rasmlar | Hamma dinamik | Backupdan tiklash: RTO 5 daq (PITR), 30 daq (to'liq) |
| **8** | **Worker `model3d`** | 🟢 | Hammasi. Mavjud 3D modellar ishlaydi | Yangi 3D generatsiya (navbatda kutadi) | Auto-restart 5 s. Navbat saqlanadi |
| **9** | **Worker `fiscal`** | 🟡 | ✅ Buyurtma, to'lov, menyu — hammasi | Chek OFDga bormaydi (navbatda) | Auto-restart 5 s. Navbat depth > 50 → P1 alert |
| **10** | **Worker `notify`** | 🟢 | Hammasi. WS orqali jonli xabar ishlaydi | Telegram push, oshxona printeri | Auto-restart 5 s |
| **11** | **Worker `ai`** | 🟢 | Hammasi | AI chat "band" javobi + FAQ | Auto-restart 5 s |
| **12** | **Worker `analytics`** | 🟢 | Hammasi | Hisobot kechikadi (event navbatda) | Auto-restart. Event 7 kun saqlanadi |
| **13** | **AI provayder (biri)** | 🟢 | Hammasi. CB keyingi provayderga o'tadi | — | CB HALF_OPEN 60 s |
| **14** | **AI — barcha 6 provayder** | 🟢 | Hammasi. Chat: "Ofitsiantni chaqiring" + FAQ + qidiruv | AI tavsiya, tarjima (kesh ishlaydi) | Provayder tiklanishi |
| **15** | **To'lov provayder (biri)** | 🟡 | ✅ Boshqa provayder tugmasi. Naqd har doim | O'sha provayder tugmasi yashiriladi | CB 120 s |
| **16** | **To'lov — barchasi** | 🟠 | ✅ Buyurtma, oshxona, chek — hammasi. **Naqd to'lov** | Onlayn to'lov | CB + qo'lda tekshiruv |
| **17** | **OFD (fiskal) — ikkalasi** | 🟡 | ✅ Buyurtma, to'lov — hammasi | QR-chek darhol emas | Navbat + 48 s retry. Qo'lda kassa cheki |
| **18** | **CDN (Cloudflare)** | 🟡 | Hammasi, lekin sekinroq (origin'dan) | — | DNS failover 5 daq yoki Cloudflare o'zi |
| **19** | **S3 / MinIO** | 🟡 | ✅ Menyu, buyurtma, to'lov, narx | AR ko'rish (rasm-fallback ko'rsatiladi), yangi rasm yuklash | Replica bucket almashuvi 5 daq |
| **20** | **Telegram API** | 🟢 | Hammasi. Admin panelda badge ko'rinadi | Telegram push, bot buyurtma | Retry 1 soat, keyin DLQ |
| **21** | **Tarmoq bo'linishi (split-brain)** | 🟠 | Ko'pchilik (quorum) tomonda hammasi ishlaydi | Ozchilik tomon: fencing, read-only | etcd quorum. Ozchilik node o'zini o'chiradi |
| **22** | **Butun DC / region** | 🔴 | Boshqa regiondagi CDN statik snapshot | Hammasi | DR: boshqa regionda ko'tarish, RTO 4 soat |

### 3.1 ⚡ "Yadro yo'l" — nima bo'lganda ham ishlashi shart

```
                    ┌──────────────────────────────────┐
                    │  YADRO YO'L (never-fail path)     │
                    │                                   │
                    │  QR → Menyu → Savat → Buyurtma    │
                    │       → Oshxona → Chek            │
                    └──────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   Kerak: nginx              Kerak: gunicorn            Kerak: PG primary
   (yoki CDN snapshot)       (≥1 node)                  (yozish uchun)
                                                        + PG replica (o'qish)

   Bu 3 tadan bittasi ham TO'LIQ yiqilmasa — restoran ishlaydi.
   Qolgan hammasi (Redis, WS, worker, AI, S3, CDN, OFD, to'lov)
   → degradatsiya bilan chetlab o'tiladi.
```

**Tekshiruv:** chaos testda Redis + WS + barcha worker + S3 + AI birgalikda
o'chiriladi → buyurtma yaratish testi **o'tishi shart**.

---

## 4. GRACEFUL DEGRADATION ZANJIRLARI

> Har zanjir: yuqoridan pastga. Yuqorigi ishlamasa — keyingisi.
> **Hech bir zanjir "xato sahifasi" bilan tugamaydi** — har doim ishlaydigan variant bor.

### 4.1 🎯 AR ko'rish

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. NATIV AR                                                     │
│    iOS: AR Quick Look (.usdz)  ·  Android: Scene Viewer (.glb)  │
│    Shart: qurilma AR qo'llab-quvvatlaydi + fayl mavjud          │
└────────────────────────┬────────────────────────────────────────┘
                         │ ⛔ AR yo'q / eski qurilma
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 3D VIEWER (<model-viewer>, AR tugmasisiz)                    │
│    Aylantirish, kattalashtirish. WebGL kerak                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ ⛔ WebGL yo'q / S3 uzilgan / fayl > 8 MB & 3G
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 360° SPRITE (24 kadr WebP, CDN'da, ~400 KB)                  │
│    Barmoq bilan aylantiriladi. WebGL kerak emas                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ ⛔ sprite yo'q
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ODDIY RASM (WebP, 800px) + "AR tez orada" badge ✅           │
│    Har doim mavjud — taom yaratilganda majburiy maydon          │
└─────────────────────────────────────────────────────────────────┘
```

**Kod (klient tanlovi):**
```javascript
// static/js/ar/ar_chain.js
async function pickArMode(dish, device) {
  if (device.supportsAR && dish.ar_ready && device.netType !== 'slow-2g')
    return {mode: 'native-ar',  src: dish.usdz_url || dish.glb_url};
  if (device.hasWebGL && dish.glb_url && dish.glb_size < 8 * 1024 * 1024)
    return {mode: 'viewer-3d',  src: dish.glb_url};
  if (dish.sprite360_url)
    return {mode: 'sprite-360', src: dish.sprite360_url};
  return {mode: 'image', src: dish.image_url};   // ✅ har doim bor
}
```

### 4.2 🤖 AI chat

```
┌──────────────────────────────────────────────────────────────┐
│ 1. ASOSIY:  Gemini Flash  (arzon, tez, uz/ru/en yaxshi)      │
└───────────────────┬──────────────────────────────────────────┘
                    │ CB OPEN / 429 / timeout 8 s
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. ZAXIRA-1: Claude Haiku → 3. GPT-mini → 4. Groq            │
│              → 5. DeepSeek → 6. Claude Sonnet (qimmat, oxiri) │
└───────────────────┬──────────────────────────────────────────┘
                    │ ⛔ 6 tasi ham yiqilgan
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. LOKAL: semantik qidiruv (pgvector) + oldindan yozilgan FAQ │
│    "Achchiq emas taomlar" → embedding qidiruv, AI'siz         │
└───────────────────┬──────────────────────────────────────────┘
                    │ ⛔ pgvector ham yo'q (DB read-only)
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. ODAM: "🔔 Ofitsiantni chaqirish" tugmasi ✅                │
│    + menyu kategoriya bo'yicha oddiy filtr                    │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 📡 Real-time (KDS, ofitsiant, mijoz statusi)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. WebSocket (wss://)  — 50 ms, ikki tomonlama                │
└───────────────────┬──────────────────────────────────────────┘
                    │ 3× ulanish urinishi muvaffaqiyatsiz (15 s)
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. SSE (Server-Sent Events, /v1/stream/) — bir tomonlama      │
│    Proxy/korporativ tarmoqda WS bloklansa ishlaydi            │
└───────────────────┬──────────────────────────────────────────┘
                    │ SSE ham yiqildi (Redis yo'q)
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. POLLING: GET /v1/orders/?since=<ts>  har 10 s              │
│    ⚡ KDS: 5 s · ofitsiant: 10 s · mijoz: 20 s (yuk boshqaruvi)│
└───────────────────┬──────────────────────────────────────────┘
                    │ Polling ham xato beryapti
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. QO'LDA: "🔄 Yangilash" tugmasi + "Aloqa yo'q" banner ✅    │
└──────────────────────────────────────────────────────────────┘
```

```javascript
// static/js/rt/transport.js — avtomatik pasayish va ko'tarilish
class RealtimeTransport {
  constructor(url) { this.level = 0; this.fails = 0; }   // 0=WS 1=SSE 2=poll 3=manual
  degrade() { this.level = Math.min(this.level + 1, 3); this.connect(); }
  // ⚡ Har 5 daqiqada bir marta yuqoriga qaytishga urinadi
  scheduleUpgrade() {
    if (this.level === 0) return;
    setTimeout(() => { this.level = 0; this.fails = 0; this.connect(); }, 300000);
  }
}
```

### 4.4 🧾 Fiskal (OFD)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. OFD-1 (UZKASSA) — sinxron, 5 s timeout                    │
└───────────────────┬──────────────────────────────────────────┘
                    │ CB OPEN yoki 3× xato
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. OFD-2 (e-POS) — zaxira provayder                          │
└───────────────────┬──────────────────────────────────────────┘
                    │ ikkalasi ham yiqilgan
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. NAVBAT (fiscal queue) — chek `pending_fiscal` holatida     │
│    Retry: 5m→15m→1s→6s→24s (48 soat davomida)                │
│    ⚡ Mijozga: "Chek tez orada SMS/Telegram orqali keladi"    │
└───────────────────┬──────────────────────────────────────────┘
                    │ 48 soat o'tdi
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. QO'LDA: kassa apparatidan chek + admin panelda "qo'lda     │
│    fiskallashtirildi" belgisi + soliq hisobotiga qo'shiladi ✅ │
└──────────────────────────────────────────────────────────────┘
```

> ⚡ **Muhim:** fiskal HECH QACHON buyurtmani bloklamaydi. Buyurtma
> `transaction.atomic()` ichida yaratiladi, fiskal `on_commit` da navbatga tushadi.

### 4.5 💳 To'lov

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Payme (asosiy) → 2. Click → 3. Uzum                       │
│    Har biri CB bilan; OPEN bo'lgani UI'da YASHIRILADI        │
└───────────────────┬──────────────────────────────────────────┘
                    │ 3 tasi ham OPEN
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. TERMINAL: "Ofitsiantga terminal orqali to'lang"           │
│    Buyurtma `awaiting_payment`, ofitsiant qo'lda tasdiqlaydi  │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. NAQD: ofitsiant qabul qiladi → PIN bilan tasdiqlaydi ✅    │
│    ⚡ Naqd YO'L HECH QACHON o'chirilmaydi — oxirgi zaxira     │
└──────────────────────────────────────────────────────────────┘
```

### 4.6 🖼 3D fayl yetkazish

```
CDN edge kesh (Cloudflare, 30 kun TTL)
   │ ⛔ CDN 5xx / miss
   ▼
S3/MinIO origin (presigned URL, 1 soat)
   │ ⛔ S3 uzilgan
   ▼
Replica bucket (boshqa region)
   │ ⛔ u ham yo'q
   ▼
Brauzer Cache API (PWA service worker, oldin ko'rilgan modellar)
   │ ⛔ kesh bo'sh
   ▼
Rasm (WebP) + "3D vaqtincha mavjud emas" ✅
```

### 4.7 💾 O'qish yo'li (menyu)

```
L1: Django process-local kesh (LocMem, 60 s)   ← ~0,1 ms
   │ miss
   ▼
L2: Redis kesh (menu:<rest_id>:<lang>, 5 daq)  ← ~2 ms
   │ miss / Redis o'chgan
   ▼
L3: PostgreSQL read replica                    ← ~20 ms
   │ replica lag > 10 s / o'chgan
   ▼
L4: PostgreSQL primary                         ← ~25 ms
   │ ⛔ butun DB o'chgan
   ▼
L5: CDN'dagi statik snapshot JSON              ← ~50 ms  ✅
    (har 15 daqiqada generatsiya qilinadi, faqat-o'qish)
    Mijoz menyuni ko'radi, "buyurtma vaqtincha mavjud emas"
```

**Snapshot generatori:**
```python
# apps/menu/tasks.py
@periodic(every=timedelta(minutes=15), queue='analytics')
def publish_menu_snapshot():
    """Har restoran menyusini CDNga statik JSON qilib chiqaradi.
    DB butunlay yiqilsa mijoz shu snapshotni ko'radi."""
    for rest in Restaurant.objects.filter(is_active=True).only('id', 'slug'):
        for lang in ('uz', 'ru', 'en'):
            data = build_menu_payload(rest.id, lang)      # read replica'dan
            key = f'snapshots/{rest.slug}/{lang}.json'
            s3.put_object(
                Bucket=settings.CDN_BUCKET, Key=key,
                Body=json.dumps(data, ensure_ascii=False).encode(),
                ContentType='application/json',
                CacheControl='public, max-age=900, stale-if-error=86400',
            )
```

---

## 5. CIRCUIT BREAKER — TO'LIQ AMALGA OSHIRISH

### 5.1 Holat mashinasi

```
                        ┌──────────────────────────────┐
                        │                              │
              muvaffaqiyat│                             │
                  (reset) │                             │
                        │                              │
              ┌─────────▼─────────┐                    │
              │                   │  fail_count >=     │
      ┌──────▶│      CLOSED       │  fail_threshold    │
      │       │  (normal ishlash) ├───────────────────┐│
      │       │  so'rovlar o'tadi │                   ││
      │       └───────────────────┘                   ││
      │                                               ▼│
      │                                     ┌──────────┴────────┐
      │ success_count >=                    │       OPEN        │
      │ success_threshold                   │  so'rov YUBORILMAYDI│
      │                                     │  darhol fallback   │
      │                                     │  (tez xato)        │
      │       ┌───────────────────┐         └──────────┬────────┘
      └───────┤    HALF_OPEN      │◀───────────────────┘
              │  probe: 1 so'rov  │   opened_at + timeout
              │  o'tkaziladi      │   vaqti o'tdi
              └─────────┬─────────┘
                        │ xato
                        └──────────────▶ OPEN (timeout × backoff_mult)
```

**Holat o'tishlari jadvali:**

| Joriy holat | Hodisa | Yangi holat | Qo'shimcha |
|---|---|---|---|
| CLOSED | muvaffaqiyat | CLOSED | `fail_count = 0` |
| CLOSED | xato | CLOSED | `fail_count += 1` |
| CLOSED | `fail_count >= threshold` | **OPEN** | `opened_at = now`, alert P2 |
| OPEN | so'rov keldi, `now < opened_at + timeout` | OPEN | fallback, `rejected += 1` |
| OPEN | so'rov keldi, `now >= opened_at + timeout` | **HALF_OPEN** | 1 ta probe o'tkaziladi |
| HALF_OPEN | probe muvaffaqiyat | HALF_OPEN | `success_count += 1` |
| HALF_OPEN | `success_count >= threshold` | **CLOSED** | tiklandi, alert "✅ tiklandi" |
| HALF_OPEN | probe xato | **OPEN** | `timeout × 2` (maks 900 s) |

### 5.2 To'liq kod

```python
# core/resilience/breaker.py
"""
Redis'ga tayangan taqsimlangan Circuit Breaker.
Barcha web/worker node'lar bitta holatni ko'radi.
"""
import time
import random
import logging
from dataclasses import dataclass
from django.core.cache import caches
from core.metrics import metrics
from core.alerts import alert

logger = logging.getLogger('armenu.resilience')
_redis = caches['default'].client.get_client(write=True)


class CircuitOpenError(Exception):
    """Xizmat OPEN — chaqiruv umuman yuborilmadi."""
    def __init__(self, name, retry_after):
        self.name, self.retry_after = name, retry_after
        super().__init__(f"Circuit '{name}' OPEN, {retry_after}s dan keyin")


@dataclass(frozen=True)
class BreakerConfig:
    fail_threshold: int = 5        # necha xatodan keyin OPEN
    timeout: int = 60              # OPEN'da necha soniya turadi
    success_threshold: int = 2     # HALF_OPEN'da necha muvaffaqiyat kerak
    max_timeout: int = 900         # backoff cheki
    backoff_mult: float = 2.0      # takroriy yiqilishda timeout ×
    call_timeout: float = 5.0      # bitta chaqiruv timeout (soniya)
    error_types: tuple = (Exception,)   # qaysi xato "yiqilish" hisoblanadi


class CircuitBreaker:

    KEY = 'cb:{name}:{field}'

    def __init__(self, name: str, config: BreakerConfig = None):
        self.name = name
        self.cfg = config or BreakerConfig()

    # ---------- holat ----------
    def _k(self, field):
        return self.KEY.format(name=self.name, field=field)

    def state(self) -> str:
        raw = _redis.hgetall(self._k('state'))
        if not raw:
            return 'CLOSED'
        st = raw.get(b'state', b'CLOSED').decode()
        if st == 'OPEN':
            opened_at = float(raw.get(b'opened_at', b'0'))
            timeout = float(raw.get(b'timeout', self.cfg.timeout))
            if time.monotonic() - opened_at >= timeout:
                return 'HALF_OPEN'
        return st

    def _write(self, **fields):
        _redis.hset(self._k('state'), mapping={
            k: str(v).encode() for k, v in fields.items()
        })
        _redis.expire(self._k('state'), 86400)

    # ---------- o'tishlar ----------
    def _open(self, prev_timeout=None):
        timeout = min(
            (prev_timeout or self.cfg.timeout) * (self.cfg.backoff_mult if prev_timeout else 1),
            self.cfg.max_timeout,
        )
        self._write(state='OPEN', opened_at=time.monotonic(),
                    timeout=timeout, fail_count=0, success_count=0)
        metrics.gauge('armenu_circuit_breaker_state', 2, labels={'service': self.name})
        logger.error("[CB] 🔴 %s → OPEN (%.0fs)", self.name, timeout)
        alert(f"🔴 Circuit breaker OPEN: {self.name} ({timeout:.0f}s)", severity='P2')

    def _close(self):
        _redis.delete(self._k('state'))
        metrics.gauge('armenu_circuit_breaker_state', 0, labels={'service': self.name})
        logger.info("[CB] 🟢 %s → CLOSED (tiklandi)", self.name)
        alert(f"✅ Circuit breaker tiklandi: {self.name}", severity='INFO')

    def _on_success(self, state):
        if state == 'HALF_OPEN':
            n = _redis.hincrby(self._k('state'), 'success_count', 1)
            if n >= self.cfg.success_threshold:
                self._close()
        else:
            _redis.hdel(self._k('state'), 'fail_count')

    def _on_failure(self, state):
        if state == 'HALF_OPEN':
            prev = float(_redis.hget(self._k('state'), 'timeout') or self.cfg.timeout)
            self._open(prev_timeout=prev)
            return
        n = _redis.hincrby(self._k('state'), 'fail_count', 1)
        _redis.expire(self._k('state'), 86400)
        if n >= self.cfg.fail_threshold:
            self._open()

    # ---------- asosiy API ----------
    def call(self, fn, *args, fallback=None, **kwargs):
        state = self.state()

        if state == 'OPEN':
            metrics.inc('armenu_cb_rejected_total', labels={'service': self.name})
            if fallback is not None:
                return fallback()
            retry_after = float(_redis.hget(self._k('state'), 'timeout') or self.cfg.timeout)
            raise CircuitOpenError(self.name, retry_after)

        if state == 'HALF_OPEN':
            # ⚡ Faqat 1 ta probe o'tsin — qolganlari fallback
            got = _redis.set(self._k('probe'), b'1', nx=True, ex=int(self.cfg.call_timeout) + 2)
            if not got:
                if fallback is not None:
                    return fallback()
                raise CircuitOpenError(self.name, self.cfg.timeout)

        started = time.monotonic()
        try:
            result = fn(*args, **kwargs)
        except self.cfg.error_types as exc:
            self._on_failure(state)
            metrics.inc('armenu_cb_failure_total', labels={'service': self.name})
            logger.warning("[CB] %s xato: %s", self.name, exc)
            if fallback is not None:
                return fallback()
            raise
        else:
            self._on_success(state)
            metrics.observe('armenu_external_api_duration_seconds',
                            time.monotonic() - started, labels={'provider': self.name})
            return result
        finally:
            if state == 'HALF_OPEN':
                _redis.delete(self._k('probe'))

    # Dekorator shakli
    def __call__(self, fallback=None):
        def deco(fn):
            def wrapper(*a, **kw):
                return self.call(fn, *a, fallback=fallback, **kw)
            wrapper.__name__ = fn.__name__
            return wrapper
        return deco
```

### 5.3 Har tashqi xizmat uchun sozlamalar

| Xizmat | `fail_threshold` | `timeout` | `success_threshold` | `call_timeout` | `max_timeout` | Fallback |
|---|---|---|---|---|---|---|
| `payme` | 3 | 120 s | 2 | 8 s | 900 s | Click → Uzum → naqd |
| `click` | 3 | 120 s | 2 | 8 s | 900 s | Uzum → naqd |
| `uzum` | 3 | 120 s | 2 | 8 s | 900 s | Naqd |
| `ofd_uzkassa` | 3 | 120 s | 2 | 5 s | 600 s | OFD-2 → navbat |
| `ofd_epos` | 3 | 120 s | 2 | 5 s | 600 s | Navbat |
| `ikpu_tasnif` | 5 | 300 s | 1 | 4 s | 1800 s | Lokal IKPU kesh |
| `ai_gemini` | 5 | 60 s | 2 | 8 s | 300 s | Keyingi AI provayder |
| `ai_claude_haiku` | 5 | 60 s | 2 | 8 s | 300 s | Keyingi AI provayder |
| `ai_openai_mini` | 5 | 60 s | 2 | 8 s | 300 s | Keyingi AI provayder |
| `ai_groq` | 8 | 30 s | 2 | 5 s | 180 s | Keyingi AI provayder |
| `ai_deepseek` | 8 | 30 s | 2 | 8 s | 180 s | Keyingi AI provayder |
| `ai_claude_sonnet` | 3 | 180 s | 2 | 15 s | 900 s | FAQ + pgvector |
| `telegram` | 10 | 60 s | 2 | 10 s | 600 s | Navbat + panel badge |
| `s3_media` | 5 | 30 s | 2 | 6 s | 300 s | Replica bucket → rasm |
| `meshy_3d` | 3 | 300 s | 1 | 30 s | 1800 s | Keyingi 3D provayder |
| `smtp_mail` | 5 | 300 s | 1 | 10 s | 1800 s | Telegram xabar |

**Ro'yxatga olish (registry):**
```python
# core/resilience/registry.py
BREAKERS = {
    'payme':       CircuitBreaker('payme',       BreakerConfig(3, 120, 2, call_timeout=8)),
    'ofd_uzkassa': CircuitBreaker('ofd_uzkassa', BreakerConfig(3, 120, 2, call_timeout=5,
                                                               max_timeout=600)),
    'ai_gemini':   CircuitBreaker('ai_gemini',   BreakerConfig(5, 60, 2, call_timeout=8,
                                                               max_timeout=300)),
    # ...
}

def breaker(name) -> CircuitBreaker:
    return BREAKERS[name]
```

**Qo'llanilishi:**
```python
# apps/fiscal/services.py
from core.resilience.registry import breaker
from core.queue import enqueue

def send_fiscal_receipt(order):
    """Chek yuborish — CB + ikki provayder + navbat."""
    def _to_queue():
        enqueue('fiscal', 'retry_receipt', order_id=order.id, delay=300)
        return {'status': 'queued'}

    def _epos():
        return breaker('ofd_epos').call(epos_send, order, fallback=_to_queue)

    return breaker('ofd_uzkassa').call(uzkassa_send, order, fallback=_epos)
```

---

## 6. RETRY SIYOSATI

### 6.1 Operatsiyalar jadvali

| Operatsiya | Urinish | Kechikish ketma-ketligi | Jitter | Maks umumiy vaqt | Idempotency kaliti | Tugagach |
|---|---|---|---|---|---|---|
| To'lov webhook qayta ishlash | 8 | 2, 4, 8, 16, 32, 64, 128, 256 s | ±30% | 24 soat | `provider_txn_id` | DLQ + P1 alert |
| To'lov holatini so'rash (poll) | 24 | 60 s × 24 (tekis) | ±10% | 24 soat | `order_id` | Qo'lda tekshiruv |
| Fiskal chek (OFD) | 10 | 5m, 15m, 1s, 3s, 6s, 12s, 24s, 24s, 24s, 24s | ±20% | 48 soat | `receipt_uuid` | Qo'lda chek + P1 |
| IKPU qidiruv | 3 | 1, 5, 20 s | ±20% | 30 s | — | Lokal kesh |
| Telegram push | 5 | 1, 5, 30 s, 2m, 10m | ±20% | 1 soat | `notification_id` | DLQ (jim) |
| AI so'rov (bitta provayder) | 2 | 0,5, 2 s | — | 30 s | — | Keyingi provayder |
| 3D generatsiya | 3 | 1m, 5m, 15m | ±10% | 1 soat | `job_id` | Keyingi provayder → qo'lda |
| S3 yuklash / o'qish | 4 | 0,2, 1, 3, 8 s | ±25% | 15 s | `object_key` | Replica bucket |
| DB deadlock (`40P01`) | 3 | 0,05, 0,2, 1 s | ±50% | 5 s | tranzaksiya | 503 + klient retry |
| DB serialization fail (`40001`) | 3 | 0,05, 0,2, 1 s | ±50% | 5 s | tranzaksiya | 503 |
| Redis timeout | 2 | 0,05, 0,2 s | ±50% | 1 s | — | Fail-open (DBga o'tadi) |
| WS klient reconnect | ∞ | 1, 2, 4, 8, 16, 30, 30… s | ±20% | — | — | SSE → polling |
| CDN purge | 3 | 5, 30, 120 s | ±20% | 5 daq | `path` | Kesh eskirishini kutish |

### 6.2 Eksponensial backoff kodi

```python
# core/resilience/retry.py
import time
import random
import functools
import logging

logger = logging.getLogger('armenu.resilience')


def backoff_delays(base=1.0, factor=2.0, attempts=5, cap=300.0, jitter=0.2):
    """Kechikishlar generatori: base * factor^n, jitter bilan, cap gacha."""
    for n in range(attempts):
        raw = min(base * (factor ** n), cap)
        yield raw * (1 + random.uniform(-jitter, jitter))


# Qayta urinilmaydigan xatolar — bularni retry qilish ZARARLI
NON_RETRYABLE = (
    ValueError,             # noto'g'ri ma'lumot — qayta urinsa ham xato
    PermissionError,
    'HTTP 400', 'HTTP 401', 'HTTP 403', 'HTTP 404', 'HTTP 409', 'HTTP 422',
)


def retryable(exc) -> bool:
    """Xatoni qayta urinish mumkinmi?"""
    if isinstance(exc, NON_RETRYABLE[:2]):
        return False
    status = getattr(exc, 'status_code', None)
    if status is not None:
        if status == 429:
            return True                       # rate limit — kutib qayta urinamiz
        if 400 <= status < 500:
            return False                      # klient xatosi — retry foydasiz
        return True                           # 5xx — retry
    return True                               # tarmoq/timeout — retry


def with_retry(attempts=3, base=1.0, factor=2.0, cap=300.0, jitter=0.2,
               max_total=None, on_give_up=None):
    """
    Dekorator. ⚠️ FAQAT idempotent funksiyalarda ishlatiladi!
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            started = time.monotonic()
            last = None
            for i, delay in enumerate(backoff_delays(base, factor, attempts, cap, jitter), 1):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:
                    last = exc
                    if not retryable(exc):
                        logger.warning("[RETRY] %s — qayta urinilmaydi: %s", fn.__name__, exc)
                        raise
                    if i >= attempts:
                        break
                    if max_total and (time.monotonic() - started + delay) > max_total:
                        logger.warning("[RETRY] %s — maks vaqt tugadi", fn.__name__)
                        break
                    logger.info("[RETRY] %s urinish %d/%d, %.2fs kutish: %s",
                                fn.__name__, i, attempts, delay, exc)
                    time.sleep(delay)
            if on_give_up:
                on_give_up(last, *args, **kwargs)
            raise last
        return wrapper
    return deco
```

**Namuna:**
```python
# apps/payments/services.py
@with_retry(attempts=8, base=2.0, factor=2.0, cap=256, jitter=0.3,
            max_total=86400, on_give_up=lambda e, *a, **kw: move_to_dlq('payments', e))
def process_payment_webhook(provider, payload, idempotency_key):
    with transaction.atomic():
        txn, created = PaymentTransaction.objects.select_for_update().get_or_create(
            provider=provider, provider_txn_id=idempotency_key,
            defaults={'raw': payload, 'status': 'processing'},
        )
        if not created and txn.status == 'done':
            return txn          # ⚡ idempotent — ikkinchi marta hech narsa qilmaydi
        ...
```

### 6.3 ⛔ Qachon retry QILINMAYDI

| Holat | Nima uchun | Nima qilinadi |
|---|---|---|
| **4xx (400/401/403/404/409/422)** | Klient xatosi — qayta urinish natijani o'zgartirmaydi | Darhol xato qaytarish + log |
| **Idempotent bo'lmagan yozuv** | Dublikat buyurtma/to'lov yaratiladi | Avval idempotency kalit qo'yiladi |
| **Foydalanuvchi kutayotgan HTTP so'rov** | Timeout ortadi, UX buziladi | Maks 1 retry, keyin 503 + klient qayta uradi |
| **Circuit breaker OPEN** | Yiqilgan xizmatni bombalash — kaskad | Darhol fallback |
| **Poison message (3× crash)** | Cheksiz sikl, navbat bloklanadi | DLQ karantín |
| **Validatsiya xatosi** | Ma'lumot noto'g'ri — hech qachon o'tmaydi | Darhol rad + admin xabar |
| **`INSUFFICIENT_FUNDS` (to'lov)** | Biznes xatosi, texnik emas | Foydalanuvchiga xabar |
| **IKPU "kod topilmadi"** | Ma'lumot yo'q, qayta urinish yordam bermaydi | Qo'lda kiritish |
| **Migratsiya lock timeout** | Retry butun deployni cho'zadi | Deploy to'xtatiladi + rollback |

---

## 7. BULKHEAD (bo'linma izolyatsiyasi)

> **Printsip:** kemaning bir bo'limi suvga to'lsa, boshqalari quruq qoladi.
> Sekin AI so'rovi buyurtma yaratishni bloklamasligi kerak.

### 7.1 Worker navbatlari izolyatsiyasi

```
┌───────────────────────────────────────────────────────────────────────┐
│                      5 ALOHIDA NAVBAT (bulkhead)                       │
├──────────┬──────────┬──────────┬──────────┬───────────────────────────┤
│ model3d  │  fiscal  │  notify  │    ai    │       analytics           │
├──────────┼──────────┼──────────┼──────────┼───────────────────────────┤
│ 2 worker │ 2 worker │ 3 worker │ 2 worker │  1 worker                 │
│ 30 daq   │  30 s    │  20 s    │  60 s    │  5 daq   ← job timeout    │
│ maks 500 │ maks 5000│ maks 5000│ maks 2000│  maks 50000 ← depth cap   │
│ P4       │   P1     │   P3     │   P4     │  P4      ← alert darajasi │
└──────────┴──────────┴──────────┴──────────┴───────────────────────────┘
      ▲          ▲                                      ▲
      │          │                                      │
   Og'ir,     ⚡ ENG      Navbat to'lsa — faqat o'sha turdagi ish
   sekin      MUHIM      kechikadi. Boshqalar TA'SIRLANMAYDI.
```

| Navbat | Worker soni | Job timeout | Maks depth | Prioritet | To'lganda |
|---|---|---|---|---|---|
| `fiscal` | 2 (S0) / 4 (S3) | 30 s | 5 000 | 🔴 P1 | Alert + qo'shimcha worker |
| `notify` | 3 / 6 | 20 s | 5 000 | 🟡 P3 | Eskilarini tashlab yuborish (TTL 1 soat) |
| `ai` | 2 / 4 | 60 s | 2 000 | 🟢 P4 | Yangi so'rov rad — "band" javobi |
| `model3d` | 2 / 4 | 30 daq | 500 | 🟢 P4 | Navbatda kutadi, ETA ko'rsatiladi |
| `analytics` | 1 / 2 | 5 daq | 50 000 | 🟢 P4 | Batch'ga o'tadi |

**systemd shablon:**
```ini
# /etc/systemd/system/armenu-worker@.service
[Unit]
Description=ARMENU worker — %i navbati
After=network.target postgresql.service redis.service
PartOf=armenu.target

[Service]
Type=simple
User=armenu
WorkingDirectory=/srv/armenu
Environment=ARMENU_QUEUE=%i
EnvironmentFile=/srv/armenu/.env
ExecStart=/srv/armenu/venv/bin/python manage.py run_worker --queue=%i
Restart=always
RestartSec=5
# ⚡ Bulkhead: har navbat o'z resurs cheklovida
MemoryMax=1500M
MemoryHigh=1200M
CPUQuota=150%
TasksMax=64
# Sog'lomlik: heartbeat 90 s kelmasa — o'ldiriladi
WatchdogSec=90
NotifyAccess=main

[Install]
WantedBy=armenu.target
```

```bash
# 5 navbat, har biri kerakli nusxada
systemctl enable --now armenu-worker@fiscal.service
systemctl enable --now armenu-worker@notify.service
systemctl enable --now armenu-worker@ai.service
systemctl enable --now armenu-worker@model3d.service
systemctl enable --now armenu-worker@analytics.service
```

### 7.2 DB connection pool bo'linishi

> ⚡ **Muammo:** analitika hisoboti 40 ta ulanish egallab, buyurtma yaratish
> uchun ulanish qolmaydi. Yechim — PgBouncer'da alohida pool.

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
; Yadro — buyurtma, to'lov, menyu (eng katta ulush)
armenu_core   = host=pg-primary dbname=armenu pool_size=60  reserve_pool=10
; Faqat o'qish — menyu, AR, katalog (replica'ga)
armenu_read   = host=pg-replica dbname=armenu pool_size=40  reserve_pool=5
; Worker'lar — fon ishlar
armenu_worker = host=pg-primary dbname=armenu pool_size=25  reserve_pool=5
; Analitika — sekin, og'ir so'rovlar (ALOHIDA, cheklangan)
armenu_report = host=pg-replica dbname=armenu pool_size=8   reserve_pool=0

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
server_idle_timeout = 60
query_wait_timeout = 5          ; 5 s kutib ulanish yo'q bo'lsa — xato (tez fail)
```

```python
# config/settings.py
DATABASES = {
    'default':   {**BASE_DB, 'NAME': 'armenu_core',   'CONN_MAX_AGE': 0},
    'read':      {**BASE_DB, 'NAME': 'armenu_read',   'CONN_MAX_AGE': 0},
    'worker':    {**BASE_DB, 'NAME': 'armenu_worker', 'CONN_MAX_AGE': 0},
    'report':    {**BASE_DB, 'NAME': 'armenu_report', 'CONN_MAX_AGE': 0,
                  'OPTIONS': {'options': '-c statement_timeout=30000'}},
}

# core/db/router.py
class BulkheadRouter:
    """So'rovni to'g'ri poolga yo'naltiradi."""
    READ_APPS   = {'menu', 'ar3d'}
    REPORT_APPS = {'analytics', 'reports'}

    def db_for_read(self, model, **hints):
        ctx = get_current_context()            # thread-local: 'web' | 'worker' | 'report'
        if ctx == 'report' or model._meta.app_label in self.REPORT_APPS:
            return 'report'
        if ctx == 'worker':
            return 'worker'
        if model._meta.app_label in self.READ_APPS and not in_atomic_block():
            return 'read'                       # ⚡ replica lag xavfi yo'q joyda
        return 'default'

    def db_for_write(self, model, **hints):
        return 'worker' if get_current_context() == 'worker' else 'default'
```

**Pool taqsimoti (S3, PG `max_connections = 200`):**

| Pool | O'lcham | Reserve | Kimga | Nima uchun shuncha |
|---|---|---|---|---|
| `armenu_core` | 60 | 10 | Web — buyurtma, to'lov | Eng kritik, eng katta ulush |
| `armenu_read` | 40 | 5 | Web — menyu, AR (replica) | Trafikning 70% i, lekin yengil |
| `armenu_worker` | 25 | 5 | 5 navbat workeri | Fon ishlar, kutishi mumkin |
| `armenu_report` | 8 | 0 | Analitika, eksport | ⚡ Qattiq cheklangan — DBni bosmasin |
| Zaxira | ~30 | | superuser, migratsiya, monitoring | `reserved_connections` |
| **JAMI** | **133 + 20 reserve** | | | 200 dan xavfsiz masofada |

### 7.3 Thread / process pool izolyatsiyasi

```python
# core/resilience/bulkhead.py
from concurrent.futures import ThreadPoolExecutor
from threading import Semaphore

class Bulkhead:
    """Bir vaqtda bajarilayotgan chaqiruvlar sonini cheklaydi.
    To'lsa — kutmaydi, darhol fallback (fail fast)."""

    def __init__(self, name, max_concurrent, max_wait=0.0):
        self.name = name
        self._sem = Semaphore(max_concurrent)
        self._max_wait = max_wait

    def run(self, fn, *args, fallback=None, **kwargs):
        acquired = self._sem.acquire(timeout=self._max_wait) if self._max_wait \
                   else self._sem.acquire(blocking=False)
        if not acquired:
            metrics.inc('armenu_bulkhead_rejected_total', labels={'name': self.name})
            if fallback is not None:
                return fallback()
            raise ServiceBusy(self.name)
        try:
            return fn(*args, **kwargs)
        finally:
            self._sem.release()


# Har tashqi yo'nalish uchun alohida bulkhead
BULKHEADS = {
    'ai':      Bulkhead('ai',      max_concurrent=8,  max_wait=0.0),   # web'da AI bloklamasin
    'payment': Bulkhead('payment', max_concurrent=20, max_wait=2.0),
    'ofd':     Bulkhead('ofd',     max_concurrent=10, max_wait=1.0),
    's3':      Bulkhead('s3',      max_concurrent=30, max_wait=0.5),
    'telegram':Bulkhead('telegram',max_concurrent=15, max_wait=0.0),
}
```

**gunicorn darajasidagi bulkhead:**
```python
# config/gunicorn.py
workers = 4                    # (2 × CPU) + 1
worker_class = 'gthread'
threads = 4                    # worker × threads = 16 bir vaqtda so'rov
worker_connections = 200
max_requests = 1000            # ⚡ memory leak himoyasi
max_requests_jitter = 100      # bir vaqtda restart bo'lmasin
timeout = 30                   # ⚡ 30 s dan uzun so'rov — worker o'ldiriladi
graceful_timeout = 25
keepalive = 5
preload_app = True
```

---

## 8. TIMEOUT IERARXIYASI

> **Oltin qoida:** har qatlam o'zidan pastdagidan **UZUNROQ**, o'zidan
> yuqoridagidan **QISQAROQ** timeout'ga ega bo'lishi shart.
> Buzilsa — yuqori qatlam uziladi, past qatlam ish qilishda davom etadi
> ("orphan work"), resurs behuda sarflanadi.

### 8.1 Ierarxiya sxemasi (buyurtma yaratish yo'li)

```
   Klient (fetch)        ────────────────────────────────────  25 s
      │
      ▼
   Cloudflare            ──────────────────────────────────    100 s (o'zgarmas)
      │                     (bizdan uzun — biz oldin uzamiz)
      ▼
   nginx proxy_read      ────────────────────────────────      35 s
      │
      ▼
   gunicorn timeout      ──────────────────────────────        30 s
      │
      ▼
   Django view budget    ────────────────────────────          25 s  (soft)
      │
      ├──▶ DB statement_timeout    ──────────────             10 s
      │       └─▶ lock_timeout      ────────                   3 s
      │
      ├──▶ Redis socket_timeout    ────                        1 s
      │
      └──▶ Tashqi API (CB call_timeout)
              ├─ To'lov      ────────────                      8 s
              ├─ OFD         ──────────                        5 s
              ├─ AI          ────────────                      8 s
              ├─ S3          ────────                          6 s
              └─ Telegram    ──────────────                   10 s

   ⚡ Qoida: 25 < 30 < 35 < 100 ва 8 < 10 < 25
```

### 8.2 Qiymatlar jadvali va sabablari

| # | Qatlam | Sozlama | Qiymat | Nima uchun aynan shu |
|---|---|---|---|---|
| 1 | Klient (JS `AbortController`) | `signal` | **25 s** | Foydalanuvchi 25 s dan ko'p kutmaydi; retry o'zi bo'ladi |
| 2 | Cloudflare | Origin timeout | **100 s** | Cloudflare Free'da o'zgarmas; biz undan oldin uzamiz |
| 3 | nginx | `proxy_connect_timeout` | **3 s** | Backend tirik bo'lmasa tez aniqlash → keyingi upstream |
| 4 | nginx | `proxy_read_timeout` | **35 s** | gunicorn (30 s) dan 5 s uzun — gunicorn o'zi tugatsin |
| 5 | nginx | `proxy_send_timeout` | **35 s** | Yuqoridagi bilan bir xil |
| 6 | nginx (fayl yuklash) | `client_max_body_size` | **50 M** | 3D fayl (glb) maks hajmi |
| 7 | gunicorn | `timeout` | **30 s** | Web so'rov 30 s dan uzun bo'lmasligi kerak (>2 s → worker) |
| 8 | gunicorn | `graceful_timeout` | **25 s** | Deploy'da inflight so'rov tugashiga vaqt |
| 9 | daphne (WS) | `--websocket_timeout` | **3600 s** | WS uzoq yashaydi; ping 30 s bilan tirikligi tekshiriladi |
| 10 | daphne | `--application-close-timeout` | **10 s** | Restart'da uzilish tez bo'lsin, klient reconnect qiladi |
| 11 | Django view | Soft budget (middleware) | **25 s** | gunicorn 30 s dan oldin o'zimiz 503 qaytaramiz (toza log) |
| 12 | PostgreSQL | `statement_timeout` (web) | **10 s** | Bitta so'rov 10 s → aniq bug; DBni himoya qiladi |
| 13 | PostgreSQL | `statement_timeout` (report) | **30 s** | Analitika og'irroq, lekin cheksiz emas |
| 14 | PostgreSQL | `statement_timeout` (worker) | **300 s** | 3D/import ishlari uzun bo'lishi mumkin |
| 15 | PostgreSQL | `lock_timeout` | **3 s** | ⚡ Migratsiya jadval lock'ini kutib turmasin |
| 16 | PostgreSQL | `idle_in_transaction_session_timeout` | **30 s** | Ochiq tranzaksiya lock ushlab turmasin |
| 17 | PgBouncer | `query_wait_timeout` | **5 s** | Pool to'lsa 5 s kutib xato — tez fail |
| 18 | Redis | `socket_timeout` | **1 s** | Kesh sekin bo'lsa DBga o'tgan tezroq |
| 19 | Redis | `socket_connect_timeout` | **0,5 s** | Redis o'chgan bo'lsa darhol bilish |
| 20 | Channels layer | `expiry` | **60 s** | Yetkazilmagan WS xabar 60 s dan ko'p yashamasin |
| 21 | To'lov API | CB `call_timeout` | **8 s** | Provayder SLA ~3 s; 8 s — xavfsiz chegara |
| 22 | OFD API | CB `call_timeout` | **5 s** | Fiskal navbatga tushishi normal — uzoq kutmaymiz |
| 23 | AI API | CB `call_timeout` | **8 s** | 8 s dan sekin bo'lsa keyingi provayder tezroq |
| 24 | S3 | `connect/read timeout` | **2 s / 6 s** | Fayl yetkazish; CDN oldida turadi |
| 25 | Telegram | `read_timeout` | **10 s** | Fon ish, shoshilinch emas |
| 26 | Worker job | `job_timeout` (navbat bo'yicha) | **20 s – 30 daq** | §7.1 jadvali |
| 27 | Healer check | Har check | **10 s** | Bitta check daemon siklini bloklamasin |

### 8.3 Konfiguratsiya kodi

```nginx
# /etc/nginx/sites-available/armenu.conf
upstream armenu_web {
    least_conn;
    server 10.0.1.11:8060 max_fails=3 fail_timeout=10s;
    server 10.0.1.12:8060 max_fails=3 fail_timeout=10s;
    server 10.0.1.13:8060 max_fails=3 fail_timeout=10s backup;
    keepalive 64;
}

upstream armenu_ws {
    ip_hash;                                  # ⚡ sticky — WS uchun muhim
    server 10.0.1.21:8061 max_fails=2 fail_timeout=10s;
    server 10.0.1.22:8061 max_fails=2 fail_timeout=10s;
}

server {
    listen 443 ssl http2;
    server_name armenu.uz *.armenu.uz;

    # ---- Timeout ierarxiyasi ----
    proxy_connect_timeout   3s;
    proxy_send_timeout      35s;
    proxy_read_timeout      35s;
    send_timeout            35s;
    client_body_timeout     15s;
    client_header_timeout   10s;
    client_max_body_size    50M;

    location / {
        proxy_pass http://armenu_web;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ⚡ Fault tolerance: node xato bersa keyingisiga o'tadi
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 2;
        proxy_next_upstream_timeout 10s;
    }

    location /ws/ {
        proxy_pass http://armenu_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout  3600s;            # ⚡ WS uchun uzun
        proxy_send_timeout  3600s;
    }

    # ⚡ Statik menyu snapshot — DB yiqilganda ishlaydigan zaxira
    location /snapshot/ {
        proxy_pass https://cdn.armenu.uz/snapshots/;
        proxy_cache_valid 200 15m;
        add_header X-Fallback-Mode "static-snapshot" always;
    }

    location = /healthz {
        proxy_pass http://armenu_web;
        proxy_read_timeout 3s;                # health-check tez bo'lsin
        access_log off;
    }
}
```

```python
# config/settings.py — DB timeout'lari
DATABASES['default']['OPTIONS'] = {
    'options': '-c statement_timeout=10000 '
               '-c lock_timeout=3000 '
               '-c idle_in_transaction_session_timeout=30000',
    'connect_timeout': 3,
}

CACHES['default']['OPTIONS'] = {
    'socket_timeout': 1.0,
    'socket_connect_timeout': 0.5,
    'retry_on_timeout': True,
    'ignore_exceptions': True,      # ⚡ Redis o'chsa — kesh miss, xato emas
}
```

```python
# core/middleware/budget.py — soft timeout
class RequestBudgetMiddleware:
    """gunicorn 30 s da o'ldirishidan oldin biz o'zimiz 503 qaytaramiz —
    log toza bo'ladi, klient aniq xabar oladi."""
    BUDGET = 25.0

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request._budget_started = time.monotonic()
        response = self.get_response(request)
        elapsed = time.monotonic() - request._budget_started
        if elapsed > self.BUDGET * 0.8:
            logger.warning("[BUDGET] %s %s — %.1fs (byudjet %.0fs)",
                           request.method, request.path, elapsed, self.BUDGET)
        response['X-Response-Time'] = f'{elapsed:.3f}'
        return response
```

---

## 9. ⚡ SELF-HEALING — 15 MEXANIZM

> **Falsafa:** tunda soat 02:00 da odam uyg'otilmasin. Tizim o'zi tuzatsin.
> Tuzata olmasa — **aniq nima qilish kerakligini yozib** alert yuborsin.

### 9.1 Mexanizmlar jadvali

| # | Mexanizm | Nima aniqlaydi | Qanday tuzatadi | Davriylik | ⛔ Tuzata olmasa |
|---|---|---|---|---|---|
| **1** | **Process supervisor** | Process o'ldi (systemd) | `Restart=always`, `RestartSec=5` | Darhol | 5 marta 60 s ichida qayta o'lsa → `start-limit` → P1 alert |
| **2** | **LB health-check** | Node `/healthz` 3× xato | Node upstream'dan chiqariladi | 3 s | Barcha node chiqsa → P1 + statik snapshot rejimi |
| **3** | **Orphan job recovery** | `running` job, `heartbeat_at` > 15 daq | `queued` ga qaytaradi, `attempts += 1` | 60 s | `attempts >= max` → DLQ + P3 alert |
| **4** | **Stuck order detector** | `cooking` holatda > 45 daq | KDS + admin ga WS alert, badge | 5 daq | Odam kerak → restoran adminiga Telegram |
| **5** | **DB connection reaper** | `idle in transaction` > 5 daq ulanish | `pg_terminate_backend()` | 5 daq | Pool 95% > 10 daq → P2 + web restart taklifi |
| **6** | **Redis memory guard** | `used_memory` > 85% `maxmemory` | Eng eski kesh prefikslarini `SCAN+DEL` | 2 daq | > 95% → `allkeys-lru` majburiy + P2 |
| **7** | **Disk cleanup** | Disk > 85% | Log rotate, `/tmp` tozalash, eski 3D temp o'chirish | 10 daq | > 95% → P1 + write bloklanadi (read-only rejim) |
| **8** | **Worker memory guard** | Worker RSS > 80% `MemoryMax` | Graceful restart (joriy job tugagach) | 60 s | 3× ketma-ket → P2 + memory leak tekshiruvi |
| **9** | **Fiscal queue drainer** | `fiscal` navbat depth > 50, 10 daq | Qo'shimcha worker ko'taradi, CB holatini tekshiradi | 2 daq | OFD ikkalasi ham OPEN → P1 + qo'lda chek rejimi |
| **10** | **Cache warm-up** | Deploy/restart'dan keyin `cache_hit_ratio` < 30% | Top-100 restoran menyusini oldindan yuklaydi | Restart'da | Warm-up xato → jim (kesh o'zi to'ladi) |
| **11** | **CB auto-probe** | CB OPEN > 5 daq | HALF_OPEN probe'ni majburiy ishga tushiradi | 60 s | 30 daq OPEN → P2 provayder alert |
| **12** | **WS ghost cleanup** | Redis'da ulanish yozuvi bor, socket yo'q | `channel_layer.group_discard`, yozuv o'chiriladi | 5 daq | Ghost > 1000 → daphne restart taklifi (P3) |
| **13** | **Replica lag healer** | `pg_stat_replication.lag` > 10 s | Replica'ni router'dan chiqaradi (o'qish primary'ga) | 30 s | Lag > 300 s → replica qayta seed (P2) |
| **14** | **Payment reconciler** | `pending` to'lov > 5 daq, webhook yo'q | Provayderdan `check_transaction` so'raydi, holatni sinxronlaydi | 5 daq | 24 soat `pending` → P1 + moliyaviy tekshiruv |
| **15** | **Backup verify** | Kechagi backup tiklanadimi? | Staging'ga `pg_restore`, `SELECT count(*)` tekshiruvi | Kunlik 04:00 | Tiklash xato → 🔴 P1 (eng jiddiy — DR buzilgan) |

### 9.2 To'liq daemon kodi

```python
# core/healing/daemon.py — armenu-healer.service
"""
ARMENU Self-Healing Daemon.
Har 60 soniyada 15 ta tekshiruvni bajaradi va muammolarni O'ZI tuzatadi.
Tuzata olmasa — nima qilish kerakligini yozib alert yuboradi.

Ishga tushirish:  python manage.py run_healer
systemd:          armenu-healer.service (Restart=always)
"""
import os
import time
import shutil
import logging
import subprocess
from datetime import timedelta

import redis
from django.db import connections, transaction
from django.utils import timezone
from django.core.cache import caches

from core.metrics import metrics
from core.alerts import alert_oncall, notify_telegram
from core.resilience.registry import BREAKERS
from core.queue import enqueue, queue_depth, move_to_dlq
from apps.orders.models import Order
from apps.payments.models import PaymentTransaction
from apps.jobs.models import Job

logger = logging.getLogger('armenu.healer')

CYCLE_SECONDS = 60
CHECK_TIMEOUT = 10          # bitta check maks 10 s


# ═══════════════════════════════════════════════════════════════════
#  1. ORPHAN JOB — worker o'lganda `running`da qolgan ishlar
# ═══════════════════════════════════════════════════════════════════
def check_orphan_jobs():
    cutoff = timezone.now() - timedelta(minutes=15)
    orphans = list(Job.objects.using('worker')
                   .filter(status='running', heartbeat_at__lt=cutoff)[:200])
    return orphans or None


def heal_orphan_jobs(orphans):
    requeued, dead = 0, 0
    for job in orphans:
        with transaction.atomic(using='worker'):
            job = Job.objects.using('worker').select_for_update().get(pk=job.pk)
            if job.status != 'running':
                continue
            if job.attempts < job.max_attempts:
                job.status = 'queued'
                job.attempts += 1
                job.heartbeat_at = None
                job.save(update_fields=['status', 'attempts', 'heartbeat_at'])
                enqueue(job.queue, job_id=job.id)
                requeued += 1
            else:
                job.status = 'failed'
                job.save(update_fields=['status'])
                move_to_dlq(job)
                dead += 1
    logger.info("[HEAL] orphan_jobs: %d qayta navbatga, %d DLQ", requeued, dead)
    if dead:
        notify_telegram(f"🟡 {dead} ta job DLQ'ga tushdi (max urinish tugadi)")
    return True                       # ✅ har doim tuzata oladi


# ═══════════════════════════════════════════════════════════════════
#  2. STUCK ORDER — 45 daqiqadan beri `cooking`
# ═══════════════════════════════════════════════════════════════════
def check_stuck_orders():
    cutoff = timezone.now() - timedelta(minutes=45)
    stuck = list(Order.objects.filter(status='cooking', updated_at__lt=cutoff)
                 .select_related('restaurant')[:100])
    return stuck or None


def heal_stuck_orders(orders):
    from core.ws import ws_send
    for o in orders:
        mins = int((timezone.now() - o.updated_at).total_seconds() // 60)
        ws_send(f'rest_{o.restaurant_id}_kds',
                {'type': 'alert.stuck_order', 'order_id': o.id, 'minutes': mins})
        ws_send(f'rest_{o.restaurant_id}_admin',
                {'type': 'alert.stuck_order', 'order_id': o.id, 'minutes': mins})
        notify_telegram(
            f"⚠️ {o.restaurant.name}: buyurtma #{o.number} {mins} daqiqadan beri "
            f"tayyorlanmoqda. Oshxonani tekshiring.",
            chat_id=o.restaurant.admin_telegram_id,
        )
    return False       # ⛔ avtomatik tuzatilmaydi — odam kerak, lekin xabar berildi


# ═══════════════════════════════════════════════════════════════════
#  3. DB CONNECTION LEAK — uzoq `idle in transaction`
# ═══════════════════════════════════════════════════════════════════
def check_db_connections():
    with connections['default'].cursor() as cur:
        cur.execute("""
            SELECT count(*) FILTER (WHERE state = 'idle in transaction'
                                      AND state_change < now() - interval '5 minutes'),
                   count(*),
                   current_setting('max_connections')::int
            FROM pg_stat_activity WHERE datname = current_database()
        """)
        leaked, total, maxc = cur.fetchone()
    metrics.gauge('armenu_db_connections_used', total)
    if leaked > 0 or total > maxc * 0.85:
        return {'leaked': leaked, 'total': total, 'max': maxc}
    return None


def heal_db_connections(problem):
    if problem['leaked'] > 0:
        with connections['default'].cursor() as cur:
            cur.execute("""
                SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                WHERE datname = current_database()
                  AND state = 'idle in transaction'
                  AND state_change < now() - interval '5 minutes'
            """)
            killed = cur.rowcount
        logger.warning("[HEAL] db_connections: %d ta osilgan ulanish yopildi", killed)
        return True
    # Faqat to'lib ketgan bo'lsa — o'zimiz tuzata olmaymiz
    alert_oncall(
        f"🟠 DB pool {problem['total']}/{problem['max']} (85%+).\n"
        f"QILISH: 1) `SELECT query, count(*) FROM pg_stat_activity GROUP BY 1 "
        f"ORDER BY 2 DESC LIMIT 10;` 2) sekin so'rovni toping 3) web node qo'shing",
        severity='P2')
    return False


# ═══════════════════════════════════════════════════════════════════
#  4. REDIS MEMORY
# ═══════════════════════════════════════════════════════════════════
def check_redis_memory():
    r = caches['default'].client.get_client(write=True)
    info = r.info('memory')
    used, maxmem = info['used_memory'], info.get('maxmemory') or 0
    if not maxmem:
        return None
    ratio = used / maxmem
    metrics.gauge('armenu_redis_memory_ratio', ratio)
    return {'ratio': ratio, 'used': used, 'max': maxmem} if ratio > 0.85 else None


def heal_redis_memory(problem):
    r = caches['default'].client.get_client(write=True)
    # Eng arzon keshni birinchi tashlaymiz (qayta hisoblash oson)
    for prefix in ('menu_render:*', 'ai_answer:*', 'analytics:*', 'session_meta:*'):
        deleted = 0
        for key in r.scan_iter(match=prefix, count=500):
            r.unlink(key)
            deleted += 1
            if deleted >= 20000:
                break
        logger.info("[HEAL] redis: %s → %d kalit o'chirildi", prefix, deleted)
        if r.info('memory')['used_memory'] / problem['max'] < 0.70:
            return True
    if problem['ratio'] > 0.95:
        r.config_set('maxmemory-policy', 'allkeys-lru')
        alert_oncall("🟠 Redis > 95% — allkeys-lru yoqildi. RAM qo'shing yoki "
                     "cluster shard'ini ko'paytiring.", severity='P2')
        return False
    return True


# ═══════════════════════════════════════════════════════════════════
#  5. DISK
# ═══════════════════════════════════════════════════════════════════
CLEANUP_PATHS = [
    ('/srv/armenu/logs',      30),     # (yo'l, necha kundan eski)
    ('/srv/armenu/tmp',        1),
    ('/srv/armenu/media/3d_tmp', 2),
    ('/var/log/nginx',        14),
]


def check_disk():
    problems = []
    for mount in ('/', '/srv'):
        if not os.path.ismount(mount) and mount != '/':
            continue
        total, used, free = shutil.disk_usage(mount)
        pct = used / total
        metrics.gauge('armenu_disk_used_ratio', pct, labels={'mount': mount})
        if pct > 0.85:
            problems.append({'mount': mount, 'pct': pct, 'free_gb': free / 1e9})
    return problems or None


def heal_disk(problems):
    freed = 0
    for path, days in CLEANUP_PATHS:
        if not os.path.isdir(path):
            continue
        out = subprocess.run(
            ['find', path, '-type', 'f', '-mtime', f'+{days}', '-delete', '-print'],
            capture_output=True, text=True, timeout=60)
        freed += len(out.stdout.splitlines())
    subprocess.run(['journalctl', '--vacuum-size=500M'], timeout=60)
    logger.warning("[HEAL] disk: %d ta fayl o'chirildi", freed)

    still_bad = check_disk()
    if still_bad and any(p['pct'] > 0.95 for p in still_bad):
        # ⚡ Oxirgi chora: read-only rejim
        caches['default'].set('armenu:readonly_mode', '1', 3600)
        alert_oncall(
            "🔴 Disk > 95% — READ-ONLY rejim yoqildi (yozish bloklandi).\n"
            "QILISH: 1) `du -sh /srv/armenu/* | sort -h` 2) media/backup ko'chiring "
            "3) disk kengaytiring 4) `redis-cli DEL armenu:readonly_mode`",
            severity='P1')
        return False
    return not still_bad


# ═══════════════════════════════════════════════════════════════════
#  6. WORKER TIRIKLIGI VA XOTIRASI
# ═══════════════════════════════════════════════════════════════════
QUEUES = ('fiscal', 'notify', 'ai', 'model3d', 'analytics')


def check_workers():
    problems = []
    for q in QUEUES:
        unit = f'armenu-worker@{q}.service'
        st = subprocess.run(['systemctl', 'is-active', unit],
                            capture_output=True, text=True).stdout.strip()
        alive = st == 'active'
        metrics.gauge('armenu_worker_alive', 1 if alive else 0, labels={'queue': q})
        if not alive:
            problems.append({'queue': q, 'kind': 'dead', 'unit': unit})
            continue
        rss = _unit_memory_bytes(unit)
        if rss and rss > 0.80 * 1500 * 1024 * 1024:      # MemoryMax=1500M
            problems.append({'queue': q, 'kind': 'memory', 'unit': unit, 'rss': rss})
    return problems or None


def heal_workers(problems):
    ok = True
    for p in problems:
        if p['kind'] == 'dead':
            subprocess.run(['systemctl', 'restart', p['unit']], timeout=30)
            logger.warning("[HEAL] worker %s qayta ishga tushirildi", p['queue'])
        else:
            # Graceful: joriy job tugagach o'zi chiqadi
            subprocess.run(['systemctl', 'kill', '-s', 'SIGTERM', p['unit']], timeout=30)
            logger.warning("[HEAL] worker %s xotira %.0f MB — graceful restart",
                           p['queue'], p['rss'] / 1e6)
        time.sleep(2)
        if subprocess.run(['systemctl', 'is-active', p['unit']],
                          capture_output=True, text=True).stdout.strip() != 'active':
            ok = False
    if not ok:
        alert_oncall("🟠 Worker qayta ishga tushmadi.\n"
                     "QILISH: `journalctl -u armenu-worker@<q> -n 100`", severity='P2')
    return ok


# ═══════════════════════════════════════════════════════════════════
#  7. FISKAL NAVBAT
# ═══════════════════════════════════════════════════════════════════
def check_fiscal_queue():
    depth = queue_depth('fiscal')
    metrics.gauge('armenu_fiscal_queue_depth', depth)
    oldest = (PaymentTransaction.objects
              .filter(fiscal_status='pending')
              .order_by('created_at').values_list('created_at', flat=True).first())
    age_min = (timezone.now() - oldest).total_seconds() / 60 if oldest else 0
    if depth > 50 or age_min > 30:
        return {'depth': depth, 'age_min': age_min}
    return None


def heal_fiscal_queue(problem):
    # 1) OFD circuit breaker holatini tekshiramiz
    states = {n: BREAKERS[n].state() for n in ('ofd_uzkassa', 'ofd_epos')}
    if all(s == 'OPEN' for s in states.values()):
        alert_oncall(
            f"🔴 Ikkala OFD ham OPEN. Navbat: {problem['depth']} chek, "
            f"eng eskisi {problem['age_min']:.0f} daq.\n"
            f"QILISH: 1) OFD status sahifasini tekshiring 2) kassa apparatidan "
            f"qo'lda chek 3) tiklangach `manage.py drain_fiscal_queue`",
            severity='P1')
        return False
    # 2) Vaqtincha qo'shimcha worker
    subprocess.run(['systemctl', 'start', 'armenu-worker@fiscal-burst.service'], timeout=30)
    logger.warning("[HEAL] fiscal: burst worker yoqildi (depth=%d)", problem['depth'])
    return True


# ═══════════════════════════════════════════════════════════════════
#  8. WS "GHOST" ULANISHLAR
# ═══════════════════════════════════════════════════════════════════
def check_ws_ghosts():
    r = caches['default'].client.get_client(write=True)
    cutoff = time.time() - 300
    ghosts = [k for k in r.scan_iter(match='asgi:group:*', count=500)
              if (r.zcount(k, '-inf', cutoff) or 0) > 0]
    return ghosts or None


def heal_ws_ghosts(ghosts):
    r = caches['default'].client.get_client(write=True)
    cutoff = time.time() - 300
    removed = sum(r.zremrangebyscore(k, '-inf', cutoff) for k in ghosts)
    logger.info("[HEAL] ws_ghosts: %d ta o'lik ulanish tozalandi", removed)
    metrics.inc('armenu_ws_ghosts_cleaned_total', removed)
    return True


# ═══════════════════════════════════════════════════════════════════
#  9. CIRCUIT BREAKER PROBE
# ═══════════════════════════════════════════════════════════════════
def check_stale_breakers():
    stale = []
    for name, cb in BREAKERS.items():
        st = cb.state()
        metrics.gauge('armenu_circuit_breaker_state',
                      {'CLOSED': 0, 'HALF_OPEN': 1, 'OPEN': 2}[st],
                      labels={'service': name})
        if st == 'OPEN':
            stale.append(name)
    return stale or None


def heal_stale_breakers(names):
    from core.resilience.probes import PROBES
    healed = []
    for name in names:
        probe = PROBES.get(name)
        if not probe:
            continue
        try:
            BREAKERS[name].call(probe)     # HALF_OPEN bo'lsa probe o'tadi
            healed.append(name)
        except Exception:
            pass
    if healed:
        logger.info("[HEAL] breakers tiklandi: %s", healed)
    return bool(healed)


# ═══════════════════════════════════════════════════════════════════
# 10. TO'LOV RECONCILIATION — webhook kelmagan to'lovlar
# ═══════════════════════════════════════════════════════════════════
def check_pending_payments():
    cutoff = timezone.now() - timedelta(minutes=5)
    pending = list(PaymentTransaction.objects
                   .filter(status='pending', created_at__lt=cutoff)
                   .exclude(created_at__lt=timezone.now() - timedelta(hours=24))[:200])
    return pending or None


def heal_pending_payments(pending):
    from apps.payments.gateways import get_gateway
    resolved = 0
    for txn in pending:
        try:
            gw = get_gateway(txn.provider)
            remote = BREAKERS[txn.provider].call(gw.check_transaction, txn.provider_txn_id)
        except Exception as e:
            logger.warning("[HEAL] payment %s tekshirilmadi: %s", txn.id, e)
            continue
        if remote['status'] in ('paid', 'cancelled', 'failed'):
            gw.apply_status(txn, remote)      # ⚡ idempotent
            resolved += 1
    logger.info("[HEAL] payments: %d/%d ta hal qilindi", resolved, len(pending))

    very_old = [t for t in pending
                if (timezone.now() - t.created_at) > timedelta(hours=6)]
    if very_old:
        alert_oncall(
            f"🔴 {len(very_old)} ta to'lov 6 soatdan beri `pending`.\n"
            f"QILISH: provayder kabinetida tekshiring, "
            f"`manage.py reconcile_payments --since=6h --force`",
            severity='P1')
        return False
    return True


# ═══════════════════════════════════════════════════════════════════
# 11. REPLICA LAG
# ═══════════════════════════════════════════════════════════════════
def check_replica_lag():
    try:
        with connections['read'].cursor() as cur:
            cur.execute("SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))")
            lag = cur.fetchone()[0] or 0
    except Exception as e:
        return {'lag': None, 'error': str(e)}
    metrics.gauge('armenu_replica_lag_seconds', lag)
    return {'lag': lag} if lag > 10 else None


def heal_replica_lag(problem):
    # Replica'ni o'qish marshrutidan chiqaramiz — primary'ga o'tamiz
    caches['default'].set('armenu:replica_disabled', '1', 300)
    logger.warning("[HEAL] replica lag %.0fs — o'qish primary'ga o'tkazildi",
                   problem.get('lag') or -1)
    if (problem.get('lag') or 0) > 300 or problem.get('error'):
        alert_oncall(
            f"🟠 Replica lag {problem.get('lag')}s / xato: {problem.get('error')}.\n"
            f"QILISH: 1) `SELECT * FROM pg_stat_replication;` primary'da "
            f"2) replica diskini tekshiring 3) kerak bo'lsa `pg_basebackup` bilan qayta seed",
            severity='P2')
        return False
    return True


# ═══════════════════════════════════════════════════════════════════
# 12. KESH ISITISH (warm-up)
# ═══════════════════════════════════════════════════════════════════
def check_cache_warmth():
    r = caches['default'].client.get_client(write=True)
    st = r.info('stats')
    hits, misses = st.get('keyspace_hits', 0), st.get('keyspace_misses', 0)
    ratio = hits / (hits + misses) if (hits + misses) > 1000 else 1.0
    metrics.gauge('armenu_cache_hit_ratio', ratio)
    return {'ratio': ratio} if ratio < 0.30 else None


def heal_cache_warmth(problem):
    enqueue('analytics', 'warm_menu_cache', top_n=100)
    logger.info("[HEAL] cache warm-up navbatga qo'yildi (hit=%.2f)", problem['ratio'])
    return True


# ═══════════════════════════════════════════════════════════════════
# 13. STATIK SNAPSHOT YANGILIGI
# ═══════════════════════════════════════════════════════════════════
def check_snapshot_freshness():
    from core.storage import s3_head
    meta = s3_head('snapshots/_manifest.json')
    if not meta:
        return {'age_min': 9999}
    age = (timezone.now() - meta['last_modified']).total_seconds() / 60
    return {'age_min': age} if age > 45 else None


def heal_snapshot_freshness(problem):
    enqueue('analytics', 'publish_menu_snapshot')
    logger.warning("[HEAL] snapshot %.0f daqiqa eski — qayta generatsiya", problem['age_min'])
    return True


# ═══════════════════════════════════════════════════════════════════
# 14. NAVBAT CHUQURLIGI (umumiy bulkhead nazorati)
# ═══════════════════════════════════════════════════════════════════
QUEUE_CAPS = {'fiscal': 5000, 'notify': 5000, 'ai': 2000,
              'model3d': 500, 'analytics': 50000}


def check_queue_depths():
    bad = {}
    for q, cap in QUEUE_CAPS.items():
        d = queue_depth(q)
        metrics.gauge('armenu_queue_depth', d, labels={'queue': q})
        if d > cap * 0.8:
            bad[q] = {'depth': d, 'cap': cap}
    return bad or None


def heal_queue_depths(bad):
    ok = True
    for q, info in bad.items():
        if q == 'notify':
            from core.queue import drop_expired
            dropped = drop_expired('notify', ttl_seconds=3600)
            logger.warning("[HEAL] notify: %d ta eskirgan xabar tashlandi", dropped)
        elif q == 'ai':
            caches['default'].set('armenu:ai_degraded', '1', 600)   # FAQ rejimi
            logger.warning("[HEAL] ai navbat to'la — degraded rejim 10 daq")
        else:
            alert_oncall(f"🟠 `{q}` navbat {info['depth']}/{info['cap']}.\n"
                         f"QILISH: worker qo'shing yoki job manbasini tekshiring",
                         severity='P2')
            ok = False
    return ok


# ═══════════════════════════════════════════════════════════════════
# 15. BACKUP TEKSHIRUVI (kunlik)
# ═══════════════════════════════════════════════════════════════════
def check_backup_health():
    from core.backup import latest_backup_meta
    meta = latest_backup_meta()
    if not meta:
        return {'reason': 'backup topilmadi'}
    age_h = (timezone.now() - meta['created_at']).total_seconds() / 3600
    if age_h > 26:
        return {'reason': f'backup {age_h:.0f} soat eski'}
    if not meta.get('verified_at') or \
       (timezone.now() - meta['verified_at']).days > 1:
        return {'reason': 'tekshirilmagan'}
    return None


def heal_backup_health(problem):
    from core.backup import run_backup, verify_backup_on_staging
    if 'eski' in problem['reason'] or 'topilmadi' in problem['reason']:
        run_backup(kind='full')
        return True
    ok = verify_backup_on_staging()          # pg_restore + count tekshiruvi
    if not ok:
        alert_oncall(
            "🔴🔴 BACKUP TIKLANMADI — falokatdan tiklash IMKONSIZ.\n"
            "QILISH: 1) `manage.py backup_verify --verbose` log 2) yangi to'liq "
            "backup 3) S3 bucket va shifrlash kalitini tekshiring",
            severity='P1')
    return ok


# ═══════════════════════════════════════════════════════════════════
#  REESTR VA ASOSIY SIKL
# ═══════════════════════════════════════════════════════════════════
CHECKS = [
    # (nom,                check,                     heal,                     har-necha-sikl)
    ('orphan_jobs',        check_orphan_jobs,         heal_orphan_jobs,         1),
    ('stuck_orders',       check_stuck_orders,        heal_stuck_orders,        5),
    ('db_connections',     check_db_connections,      heal_db_connections,      5),
    ('redis_memory',       check_redis_memory,        heal_redis_memory,        2),
    ('disk_space',         check_disk,                heal_disk,               10),
    ('workers_alive',      check_workers,             heal_workers,             1),
    ('fiscal_queue',       check_fiscal_queue,        heal_fiscal_queue,        2),
    ('ws_ghosts',          check_ws_ghosts,           heal_ws_ghosts,           5),
    ('stale_breakers',     check_stale_breakers,      heal_stale_breakers,      1),
    ('pending_payments',   check_pending_payments,    heal_pending_payments,    5),
    ('replica_lag',        check_replica_lag,         heal_replica_lag,         1),
    ('cache_warmth',       check_cache_warmth,        heal_cache_warmth,       15),
    ('snapshot_fresh',     check_snapshot_freshness,  heal_snapshot_freshness, 15),
    ('queue_depths',       check_queue_depths,        heal_queue_depths,        2),
    ('backup_health',      check_backup_health,       heal_backup_health,    1440),
]


def run_cycle(tick: int):
    for name, check, heal, every in CHECKS:
        if tick % every != 0:
            continue
        started = time.monotonic()
        try:
            problem = check()
            if not problem:
                metrics.gauge('armenu_health_check', 1, labels={'check': name})
                continue

            logger.warning("[HEAL] 🟡 Muammo: %s — %s", name, problem)
            metrics.gauge('armenu_health_check', 0, labels={'check': name})
            metrics.inc('armenu_heal_attempt_total', labels={'check': name})

            healed = heal(problem)

            if healed:
                logger.info("[HEAL] ✅ Tuzatildi: %s", name)
                metrics.inc('armenu_heal_success_total', labels={'check': name})
                notify_telegram(f"🔧 Avtomatik tuzatildi: `{name}`")
            else:
                logger.error("[HEAL] ⛔ Tuzatib bo'lmadi: %s", name)
                metrics.inc('armenu_heal_failed_total', labels={'check': name})
                # alert check funksiyasi ichida aniq ko'rsatma bilan yuborilgan

        except Exception:
            logger.exception("[HEAL] Check xatosi: %s", name)
            metrics.inc('armenu_heal_error_total', labels={'check': name})
        finally:
            metrics.observe('armenu_heal_duration_seconds',
                            time.monotonic() - started, labels={'check': name})


def main():
    logger.info("[HEAL] Self-healing daemon ishga tushdi (%d check, %ds sikl)",
                len(CHECKS), CYCLE_SECONDS)
    tick = 0
    while True:
        tick += 1
        started = time.monotonic()
        run_cycle(tick)
        sd_notify_watchdog()                       # systemd WatchdogSec
        elapsed = time.monotonic() - started
        if elapsed > CYCLE_SECONDS:
            logger.warning("[HEAL] Sikl %.1fs davom etdi (byudjet %ds)",
                           elapsed, CYCLE_SECONDS)
        time.sleep(max(0.0, CYCLE_SECONDS - elapsed))
```

```ini
# /etc/systemd/system/armenu-healer.service
[Unit]
Description=ARMENU Self-Healing Daemon
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=root                        # systemctl restart va pg_terminate uchun
WorkingDirectory=/srv/armenu
EnvironmentFile=/srv/armenu/.env
ExecStart=/srv/armenu/venv/bin/python manage.py run_healer
Restart=always
RestartSec=10
WatchdogSec=180                  # daemon o'zi osilib qolsa — restart
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

### 9.3 Healer'ning o'zi yiqilsa?

| Himoya | Mexanizm |
|---|---|
| Process o'ldi | `Restart=always` + `RestartSec=10` |
| Osilib qoldi | `WatchdogSec=180` — 3 daqiqa signal kelmasa systemd o'ldiradi |
| Butunlay ishlamayapti | Tashqi monitoring (UptimeRobot) `armenu_heal_cycle_total` metrikasini kuzatadi — 5 daqiqa o'smasa P2 alert |
| Xato tuzatish qilyapti | Har `heal_*` faqat **teskari qaytariladigan** amal bajaradi; hech qachon `DELETE FROM`, hech qachon `DROP` |
| Healer alert bombardimoni | Har `check` uchun alert 1 soatda 1 marta (`alert_oncall` ichida dedup) |

---

## 10. CHAOS ENGINEERING

### 10.1 Prinsiplar

| # | Qoida |
|---|---|
| 1 | **Gipoteza avval.** "Redis o'chsa, menyu DBdan 250 ms da keladi" — yozib qo'yiladi |
| 2 | **Staging'da boshlanadi**, 3 muvaffaqiyatli takrordan keyin production'da |
| 3 | **Ish vaqtida** (10:00–15:00), jamoa onlayn, restoranlar past yuklamada |
| 4 | **"Blast radius" cheklangan** — 1 node, 1 provayder, 1 navbat |
| 5 | **Abort tugmasi bor** — `manage.py chaos_abort` hammasini tiklaydi |
| 6 | **Natija hujjatlashtiriladi** — kutilgan vs haqiqiy, farqi bo'lsa → ticket |

### 10.2 Oylik test rejasi

| Hafta | Kun | Ssenariy | Blast radius |
|---|---|---|---|
| 1 | Seshanba | CH-1, CH-2 (node, worker) | 1 node |
| 2 | Seshanba | CH-3, CH-4 (Redis, WS) | Butun kesh qatlami |
| 3 | Seshanba | CH-5, CH-6 (DB failover, replica lag) | DB qatlami |
| 4 | Seshanba | CH-7, CH-8 (tashqi API, tarmoq) | Tashqi bog'lanishlar |
| Chorak | Shanba | **DR mashqi** — to'liq backupdan tiklash | Staging (izolyatsiya) |

### 10.3 8 ta ssenariy

| ID | Test | Qanday qilinadi | ✅ Kutilgan natija | ⛔ Muvaffaqiyatsiz agar |
|---|---|---|---|---|
| **CH-1** | Tasodifiy web node o'chirish | `systemctl stop armenu` (1 node) | Foydalanuvchi sezmaydi. LB 3–9 s da chiqaradi. 5xx < 0,1% | 5xx > 1% yoki > 15 s uzilish |
| **CH-2** | Worker o'ldirish (`fiscal`) | `systemctl kill -s SIGKILL armenu-worker@fiscal` | Job `running`da qoladi → healer 60 s da qayta navbatga. Chek yo'qolmaydi | Chek yo'qolsa yoki 2× yuborilsa |
| **CH-3** | Redis to'liq o'chirish | `systemctl stop redis` (barcha node) | Menyu DBdan (p95 < 400 ms). WS uziladi → polling. Buyurtma **ishlaydi** | Buyurtma yaratish 500 bersa |
| **CH-4** | Barcha WS node o'chirish | `systemctl stop armenu-ws` | KDS 10 s polling'ga o'tadi. Buyurtma, to'lov ishlaydi. Klient reconnect | KDS buyurtmani ko'rmasa |
| **CH-5** | DB primary o'chirish | `patronictl switchover` / `systemctl stop postgresql` | 30–60 s yozish yo'q (503 + "qayta urinib ko'ring"). **O'qish uzilmaydi**. Failover'dan keyin normal | Failover 90 s dan uzun yoki ma'lumot yo'qolsa |
| **CH-6** | Replica lag +60 s | `SELECT pg_wal_replay_pause()` replica'da | Healer 30 s da aniqlaydi → o'qish primary'ga. Eskirgan ma'lumot ko'rsatilmaydi | Mijoz eski menyu/narx ko'rsa |
| **CH-7** | Tashqi API bloklash | `iptables -A OUTPUT -d <payme_ip> -j DROP` | CB 3 xatodan keyin OPEN. UI'da Payme yashiriladi, Click ko'rinadi. 8 s dan uzun kutish yo'q | Foydalanuvchi 30 s spinner ko'rsa |
| **CH-8** | Tarmoq kechikishi +2 s | `tc qdisc add dev eth0 root netem delay 2000ms` (DBga) | `statement_timeout` 10 s ishlaydi. p95 oshadi lekin xato bermaydi. CB tashqi APIda OPEN | Kaskadli yiqilish (barcha worker band) |
| **CH-9**¹ | Disk 95% to'ldirish | `fallocate -l <N>G /srv/armenu/chaos.bin` | Healer 10 daq da aniqlaydi → cleanup. 95% da read-only rejim + P1 | Cleanup ishlamasa yoki DB corrupt bo'lsa |
| **CH-10**¹ | ⚡ Yadro yo'l testi | Redis + WS + barcha worker + S3 + AI **birgalikda** o'chiriladi | **Buyurtma yaratish ishlaydi** (p95 < 500 ms). Menyu ko'rinadi | Buyurtma yaratilmasa — 🔴 arxitektura xatosi |

¹ *CH-9 va CH-10 — chorakda 1 marta, faqat staging'da.*

### 10.4 Avtomatlashtirish

```python
# core/chaos/experiments.py
"""
Chaos eksperiment freymvorki.
Ishga tushirish:  manage.py chaos run CH-3 --duration=180 --env=staging
Abort:            manage.py chaos abort
"""
from dataclasses import dataclass, field
from typing import Callable
import time, logging

logger = logging.getLogger('armenu.chaos')


@dataclass
class Experiment:
    id: str
    name: str
    hypothesis: str                       # nima bo'lishini kutamiz
    inject: Callable[[], None]            # nosozlikni kiritish
    rollback: Callable[[], None]          # tiklash
    verify: Callable[[], dict]            # SLO buzilmadimi?
    max_duration: int = 300
    allowed_envs: tuple = ('staging',)
    blast_radius: str = '1 node'


def run(exp: Experiment, duration: int, env: str, dry_run=False):
    assert env in exp.allowed_envs, f"{exp.id} {env} muhitida ruxsat etilmagan"
    baseline = exp.verify()
    logger.warning("[CHAOS] %s boshlandi. Gipoteza: %s", exp.id, exp.hypothesis)
    notify_telegram(f"🧪 CHAOS {exp.id} boshlandi ({duration}s) — {exp.name}")

    if dry_run:
        return {'dry_run': True, 'baseline': baseline}

    results = []
    try:
        exp.inject()
        deadline = time.monotonic() + min(duration, exp.max_duration)
        while time.monotonic() < deadline:
            m = exp.verify()
            results.append(m)
            # ⚡ Avtomatik abort: SLO qattiq buzilsa
            if m['error_rate'] > 0.05 or m['core_path_ok'] is False:
                logger.error("[CHAOS] SLO buzildi — AVTO ABORT")
                break
            time.sleep(10)
    finally:
        exp.rollback()
        notify_telegram(f"✅ CHAOS {exp.id} tugadi, tizim tiklandi")

    return {
        'experiment': exp.id,
        'baseline': baseline,
        'during': results,
        'after': exp.verify(),
        'hypothesis_held': all(r['core_path_ok'] for r in results),
    }
```

```python
# core/chaos/catalog.py — CH-3 namunasi
CH3 = Experiment(
    id='CH-3',
    name='Redis to\'liq o\'chirish',
    hypothesis="Menyu DB'dan p95<400ms keladi, buyurtma ishlaydi, WS polling'ga o'tadi",
    inject=lambda: run_ssh_all('redis', 'systemctl stop redis'),
    rollback=lambda: run_ssh_all('redis', 'systemctl start redis'),
    verify=lambda: {
        'error_rate':   prom_query('rate(armenu_http_requests_total{status=~"5.."}[1m])'),
        'menu_p95':     prom_query('histogram_quantile(0.95, armenu_http_request_duration_seconds{endpoint="menu"})'),
        'core_path_ok': synthetic_order_test(),      # ⚡ haqiqiy buyurtma yaratib ko'radi
    },
    max_duration=180,
    allowed_envs=('staging', 'production'),
    blast_radius='butun kesh qatlami',
)
```

**GitHub Actions (oylik jadval):**
```yaml
# .github/workflows/chaos.yml
name: Chaos Engineering
on:
  schedule:
    - cron: '0 6 * * 2'        # har seshanba 11:00 (UZT)
  workflow_dispatch:
    inputs:
      experiment: {description: 'CH-1..CH-10', required: true}

jobs:
  chaos:
    runs-on: [self-hosted, staging]
    steps:
      - name: Error budget tekshiruvi
        run: |
          BUDGET=$(curl -s "$PROM/api/v1/query?query=armenu:order_error_budget_remaining" \
                   | jq -r '.data.result[0].value[1]')
          # ⚡ Byudjet 25% dan kam bo'lsa chaos test O'TKAZILMAYDI
          awk -v b="$BUDGET" 'BEGIN{exit !(b>0.25)}' || { echo "Byudjet past"; exit 1; }
      - name: Eksperiment
        run: python manage.py chaos run "${{ inputs.experiment || 'CH-1' }}" --env=staging
      - name: Hisobot
        run: python manage.py chaos report --last --telegram
```

---

## 11. FALOKATDAN TIKLASH (DR)

### 11.1 RPO / RTO jadvali

> **RPO** (Recovery Point Objective) — qancha ma'lumot yo'qolishi mumkin
> **RTO** (Recovery Time Objective) — qancha vaqtda tiklanishi kerak

| Ma'lumot turi | RPO | RTO | Qanday erishiladi |
|---|---|---|---|
| 🔴 **To'lov tranzaksiyasi** | **0** | 5 daq | Sinxron replikatsiya (`synchronous_commit=on`, 1 replica) |
| 🔴 **Buyurtma** | **0** | 5 daq | Sinxron replikatsiya |
| 🔴 **Fiskal chek** | **0** | 15 daq | Sinxron + OFD tomonida ham saqlanadi |
| 🟠 **Menyu / taom / narx** | 5 daq | 15 daq | WAL streaming + kunlik full |
| 🟠 **Restoran / xodim / stol** | 5 daq | 15 daq | WAL streaming |
| 🟠 **AuditLog** | 5 daq | 1 soat | WAL streaming (compliance uchun muhim) |
| 🟡 **3D fayl / rasm** | 1 soat | 1 soat | S3 cross-region replication + versioning |
| 🟡 **Sessiya / savat** | 6 soat | 30 daq | Redis AOF + RDB (yo'qolsa — mijoz qayta to'ldiradi) |
| 🟢 **Analitika event** | 1 soat | 4 soat | Kunlik dump; qayta hisoblash mumkin |
| 🟢 **Kesh** | ∞ | 0 | Tiklanmaydi — o'zi to'ladi (warm-up) |
| 🟢 **Log** | 1 kun | 24 soat | Kunlik S3 arxiv |

### 11.2 Backup strategiyasi

| # | Nima | Qachon | Qayerda | Saqlash | Shifrlash | Tekshiruv |
|---|---|---|---|---|---|---|
| 1 | **PG full** (`pg_basebackup`) | Kunlik 03:00 UZT | S3 `armenu-backup-tas` + S3 `armenu-backup-eu` | 30 kun | AES-256 (age) | Kunlik 04:00 avto-restore |
| 2 | **PG WAL** (arxiv) | Uzluksiz (`archive_command`) | S3 `armenu-backup-tas` | 7 kun | AES-256 | PITR sinovi haftalik |
| 3 | **PG logical dump** (`pg_dump -Fc`) | Haftalik yakshanba 02:00 | S3 + lokal NAS | 90 kun | AES-256 | Oylik |
| 4 | **Redis RDB + AOF** | RDB 6 soatda, AOF `everysec` | S3 | 3 kun | AES-256 | Haftalik |
| 5 | **S3 media (3D, rasm)** | Real-time CRR | S3 `armenu-media-eu` | Doimiy + versioning 90 kun | SSE-S3 | Oylik namuna |
| 6 | **Kod** | Har commit | GitHub + lokal mirror (gitea) | Doimiy | — | CI har build |
| 7 | **Konfiguratsiya** (`.env`, nginx, systemd) | Har o'zgarish | Git (`armenu-infra`, SOPS bilan shifrlangan) | Doimiy | SOPS + age | Deploy'da |
| 8 | **Sirlar** (Vault/env) | Har rotatsiya | Offline (2 nusxa, seyfda) | Doimiy | GPG | Choraklik |
| 9 | **Prometheus metrikalar** | Uzluksiz | Thanos → S3 | 1 yil | SSE-S3 | — |
| 10 | **AuditLog eksport** | Kunlik 05:00 | S3 (WORM, o'chirilmaydigan) | 5 yil (qonun) | AES-256 | Choraklik |

**3-2-1 qoidasi:** 3 nusxa · 2 xil turdagi saqlagichda · 1 tasi boshqa geografiyada ✅

```bash
#!/usr/bin/env bash
# ops/backup/pg_full.sh — kunlik to'liq backup
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
DIR=/srv/backup/pg/$TS
KEY=/etc/armenu/backup-age.pub

mkdir -p "$DIR"
# 1) Konsistent snapshot
pg_basebackup -h pg-primary -U replicator -D "$DIR" -Ft -z -Xs -P -c fast

# 2) Shifrlash
for f in "$DIR"/*.tar.gz; do
  age -R "$KEY" -o "$f.age" "$f" && rm "$f"
done

# 3) Ikki regionga yuklash
aws s3 sync "$DIR" "s3://armenu-backup-tas/pg/$TS/" --storage-class STANDARD_IA
aws s3 sync "$DIR" "s3://armenu-backup-eu/pg/$TS/"  --storage-class GLACIER_IR

# 4) Manifest (healer #15 shu faylni o'qiydi)
cat > /tmp/manifest.json <<EOF
{"kind":"pg_full","created_at":"$TS","size_bytes":$(du -sb "$DIR" | cut -f1),
 "pg_version":"$(psql -h pg-primary -tAc 'SHOW server_version')","verified_at":null}
EOF
aws s3 cp /tmp/manifest.json "s3://armenu-backup-tas/pg/latest/manifest.json"

# 5) Eskisini tozalash
find /srv/backup/pg -maxdepth 1 -type d -mtime +3 -exec rm -rf {} +
echo "✅ Backup tugadi: $TS"
```

### 11.3 Tiklash runbook (bosqichma-bosqich)

#### 🔴 Ssenariy A — PG primary yiqildi (auto-failover ishlamadi)

```
┌─ 0 daq ─────────────────────────────────────────────────────────┐
│ ALERT: "PostgreSQL primary down" (P1) → Telegram + qo'ng'iroq   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
[1] TASDIQLASH (2 daq)
    $ patronictl -c /etc/patroni.yml list
    $ pg_isready -h pg-primary
    → primary haqiqatan o'chganmi? tarmoq muammosimi?

[2] READ-ONLY REJIMNI YOQISH (1 daq)
    $ redis-cli SET armenu:readonly_mode 1 EX 3600
    → mijoz menyuni ko'radi, "buyurtma vaqtincha mavjud emas"

[3] QO'LDA FAILOVER (3 daq)
    $ patronictl -c /etc/patroni.yml failover --candidate pg-replica-1
    # Patroni ishlamasa:
    $ ssh pg-replica-1 'pg_ctl promote -D /var/lib/postgresql/16/main'
    $ ssh pg-replica-1 'psql -c "SELECT pg_is_in_recovery();"'   # false bo'lishi kerak

[4] MARSHRUTNI O'ZGARTIRISH (2 daq)
    $ ansible-playbook ops/playbooks/repoint_db.yml -e new_primary=pg-replica-1
    # PgBouncer + Django settings yangilanadi, reload
    $ systemctl reload pgbouncer && systemctl reload armenu

[5] TEKSHIRISH (2 daq)
    $ curl -s https://armenu.uz/healthz | jq
    $ python manage.py smoke_test --core-path      # buyurtma yaratib ko'radi
    $ redis-cli DEL armenu:readonly_mode

[6] YANGI REPLICA (fon, 30–60 daq)
    $ ansible-playbook ops/playbooks/rebuild_replica.yml -e host=pg-old-primary

⏱ RTO: ~10 daqiqa (qo'lda) / 30–60 soniya (Patroni avto)
```

#### 🔴 Ssenariy B — Butun DB yo'qoldi (primary + barcha replica)

```
[1] E'LON (2 daq)
    → Status sahifa: "Texnik ishlar" · Telegram: barcha restoran adminlariga
    → nginx: `/snapshot/` rejimiga o'tkazish (statik menyu)
    $ ansible-playbook ops/playbooks/static_mode.yml

[2] ENG YANGI BACKUPNI TOPISH (3 daq)
    $ aws s3 ls s3://armenu-backup-tas/pg/ --recursive | tail -5
    $ aws s3 cp s3://armenu-backup-tas/pg/latest/manifest.json - | jq

[3] YANGI DB NODE (5 daq — Terraform tayyor)
    $ cd ops/terraform && terraform apply -target=module.pg_recovery -auto-approve

[4] BASE BACKUP TIKLASH (15–25 daq, hajmga qarab)
    $ aws s3 sync s3://armenu-backup-tas/pg/<TS>/ /restore/
    $ for f in /restore/*.age; do age -d -i /etc/armenu/backup-age.key -o "${f%.age}" "$f"; done
    $ tar -xzf /restore/base.tar.gz -C /var/lib/postgresql/16/main

[5] ⚡ PITR — WAL bilan eng oxirgi nuqtaga (10 daq)
    $ cat > /var/lib/postgresql/16/main/postgresql.auto.conf <<EOF
    restore_command = 'aws s3 cp s3://armenu-backup-tas/wal/%f %p'
    recovery_target_time = '<falokatdan 1 daqiqa oldin>'
    recovery_target_action = 'promote'
    EOF
    $ touch /var/lib/postgresql/16/main/recovery.signal
    $ systemctl start postgresql
    $ tail -f /var/log/postgresql/*.log      # "consistent recovery state reached"

[6] BUTUNLIKNI TEKSHIRISH (5 daq)
    $ python manage.py dr_verify
      ✓ Oxirgi buyurtma vaqti
      ✓ Oxirgi to'lov vaqti
      ✓ To'lov summasi = provayder hisoboti (Payme/Click API)
      ✓ Fiskal cheklar = OFD hisoboti
      ✓ Restoran soni, taom soni
      ✓ Cross-tenant sanity: `SELECT count(DISTINCT restaurant_id) FROM orders`

[7] XIZMATNI QAYTARISH (5 daq)
    $ ansible-playbook ops/playbooks/repoint_db.yml -e new_primary=pg-recovery-1
    $ systemctl reload armenu armenu-ws
    $ systemctl start armenu-worker@{fiscal,notify,ai,model3d,analytics}
    $ redis-cli DEL armenu:readonly_mode
    $ python manage.py smoke_test --full

[8] YO'QOLGAN OYNANI QOPLASH (30 daq)
    → RPO oynasidagi to'lovlar: provayder API'dan reconcile
    $ python manage.py reconcile_payments --since='<falokat vaqti>' --all-providers
    → Yo'qolgan cheklar: OFD'dan qayta so'rash
    $ python manage.py reconcile_fiscal --since='<falokat vaqti>'

[9] POST-MORTEM (72 soat ichida)

⏱ RTO: 45–70 daqiqa · RPO: ≤ 5 daqiqa (WAL bilan) / 0 (sinxron replica omon qolsa)
```

#### 🟠 Ssenariy C — Butun region yo'qoldi

```
[1] DNS failover (5 daq)     → Cloudflare: origin'ni EU regionga o'tkazish
[2] EU'da stack ko'tarish    → terraform apply -var region=eu-central
[3] Backup tiklash           → Ssenariy B [4]-[6] (EU bucket'dan, tezroq)
[4] Media                    → S3 CRR allaqachon EU'da ✅
[5] To'lov/OFD               → ⚠️ UZ provayderlari IP whitelist so'rashi mumkin
                               → oldindan EU IP'lar ro'yxatga olingan bo'lishi shart
⏱ RTO: 3–4 soat · RPO: ≤ 15 daqiqa
```

### 11.4 Choraklik DR sinovi

| Bosqich | Kim | Vaqt | Muvaffaqiyat mezoni |
|---|---|---|---|
| 1. Rejalashtirish | SRE | −7 kun | Ssenariy tanlandi (A/B/C rotatsiya), jamoa xabardor |
| 2. Izolyatsiya | DevOps | −1 kun | Alohida VPC/hisob, production'ga tegmaydi |
| 3. **Ijro** | Navbatchi (👤 *yangi odam har chorak*) | 0 | Runbookdan **chetga chiqmasdan** tiklash |
| 4. O'lchov | SRE | +0 | Haqiqiy RTO ≤ maqsad × 1,5 · RPO = maqsad |
| 5. Butunlik | Backend | +1 soat | `dr_verify` 100% o'tadi |
| 6. Hisobot | SRE | +2 kun | Runbook yangilandi, farqlar → ticket |

**Choraklik sinov jurnali (namuna):**

| Chorak | Ssenariy | Maqsad RTO | Haqiqiy RTO | RPO | Natija | Topilgan muammo |
|---|---|---|---|---|---|---|
| 2026-Q1 | A (failover) | 10 daq | 8 daq | 0 | ✅ | — |
| 2026-Q2 | B (to'liq) | 60 daq | 94 daq | 3 daq | 🟡 | `age` kaliti dokumentda yo'q edi → qo'shildi |
| 2026-Q3 | C (region) | 240 daq | — | — | ⏳ | Rejada |

---

## 12. ISHONCHLILIK NAQSHLARI

### 12.1 Idempotency

> **Muammo:** klient 2 marta bosdi / tarmoq uzildi va retry bo'ldi / webhook 2× keldi
> → 2 ta buyurtma, 2 ta to'lov, 2 ta chek.

```
Klient                    Server                     Redis           PostgreSQL
  │                         │                          │                 │
  │ POST /v1/orders/        │                          │                 │
  │ X-Idempotency-Key: K1   │                          │                 │
  ├────────────────────────▶│ SET idem:K1 NX EX 86400  │                 │
  │                         ├─────────────────────────▶│                 │
  │                         │◀── OK (birinchi marta) ──┤                 │
  │                         │                          │                 │
  │                         │ transaction.atomic():                      │
  │                         ├───────────────────────────────────────────▶│
  │                         │  INSERT orders (idempotency_key=K1) UNIQUE │
  │                         │◀───────────────────────────────────────────┤
  │                         │ SET idem:K1 = {order_id: 47}               │
  │                         ├─────────────────────────▶│                 │
  │◀── 201 {id:47} ─────────┤                          │                 │
  │                         │                          │                 │
  │ ⚡ TAKROR (tarmoq retry) │                          │                 │
  │ POST + X-Idem-Key: K1   │                          │                 │
  ├────────────────────────▶│ GET idem:K1              │                 │
  │                         ├─────────────────────────▶│                 │
  │                         │◀── {order_id: 47} ───────┤                 │
  │◀── 200 {id:47} ─────────┤   (DB'ga TEGMAYDI ✅)    │                 │
```

```python
# core/idempotency.py
import json, hashlib
from django.db import IntegrityError, transaction
from django.core.cache import caches

_r = caches['default'].client.get_client(write=True)
TTL = 86400


class IdempotencyConflict(Exception):
    """Bir xil kalit, boshqa payload — klient xatosi."""


def idempotent(request, key_header='X-Idempotency-Key', ttl=TTL):
    """Kontekst menejer: (cached_response, save_fn) qaytaradi."""
    key = request.headers.get(key_header)
    if not key:
        return None, lambda resp: None

    # ⚡ Kalit tenant bilan chegaralanadi — cross-tenant to'qnashuv bo'lmasin
    rk = f'idem:{request.restaurant_id}:{key}'
    body_hash = hashlib.sha256(request.body).hexdigest()[:16]

    stored = _r.get(rk)
    if stored:
        data = json.loads(stored)
        if data.get('_body') != body_hash:
            raise IdempotencyConflict("Bir xil kalit, boshqa ma'lumot")
        if data.get('_status') == 'in_progress':
            raise IdempotencyConflict("So'rov hali bajarilmoqda")
        return data['_response'], lambda resp: None

    # Lock: bir vaqtda 2 ta bir xil so'rov kelmasin
    if not _r.set(rk, json.dumps({'_status': 'in_progress', '_body': body_hash}),
                  nx=True, ex=60):
        raise IdempotencyConflict("So'rov hali bajarilmoqda")

    def save(response_data):
        _r.set(rk, json.dumps({'_status': 'done', '_body': body_hash,
                               '_response': response_data}), ex=ttl)
    return None, save
```

```python
# apps/orders/models.py — ikkinchi mudofaa chizig'i (DB darajasi)
class Order(models.Model):
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.PROTECT)
    idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    ...
    class Meta:
        constraints = [
            # ⚡ Redis yiqilsa ham dublikat bo'lmaydi
            models.UniqueConstraint(
                fields=['restaurant', 'idempotency_key'],
                condition=models.Q(idempotency_key__isnull=False),
                name='uniq_order_idem_per_restaurant',
            ),
        ]
```

| Operatsiya | Idempotency kaliti | Manbasi | TTL |
|---|---|---|---|
| Buyurtma yaratish | `X-Idempotency-Key` | Klient (UUIDv4, savat sessiyasidan) | 24 soat |
| To'lov boshlash | `order_id + amount` | Server | 24 soat |
| To'lov webhook | `provider_txn_id` | Provayder | ∞ (DB unique) |
| Fiskal chek | `receipt_uuid` | Server (UUIDv4) | ∞ (DB unique) |
| Telegram xabar | `notification_id` | Server | 1 soat |
| Ofitsiant chaqirish | `table_id + minute` | Server (1 daq oynada 1 ta) | 60 s |
| 3D generatsiya | `dish_id + source_hash` | Server | ∞ |

### 12.2 Outbox pattern

> **Muammo:** `transaction.atomic()` ichida WS yuborsak va tranzaksiya rollback
> bo'lsa — oshxona yo'q buyurtmani ko'radi. `on_commit`'da yuborsak va process
> o'lsa — xabar butunlay yo'qoladi.

```
   transaction.atomic():
   ┌─────────────────────────────────────────┐
   │  INSERT INTO orders     ...             │   ⚡ Bitta tranzaksiyada
   │  INSERT INTO order_items ...            │      → atomik, yo'qolmaydi
   │  INSERT INTO outbox (topic, payload)    │
   └──────────────────┬──────────────────────┘
                      │ COMMIT
                      ▼
   ┌─────────────────────────────────────────┐
   │  on_commit: relay'ga signal (tez yo'l)   │  ← odatda 5 ms
   └──────────────────┬──────────────────────┘
                      │  (agar process o'lsa — bu yo'l ishlamaydi)
                      ▼
   ┌─────────────────────────────────────────┐
   │  OUTBOX RELAY (worker, har 2 s poll)     │  ← ⚡ zaxira yo'l
   │  SELECT ... WHERE sent_at IS NULL        │     hech narsa yo'qolmaydi
   │  FOR UPDATE SKIP LOCKED LIMIT 100        │
   │    → WS push / enqueue / webhook         │
   │    → UPDATE outbox SET sent_at = now()   │
   └─────────────────────────────────────────┘
```

```python
# core/outbox/models.py
class OutboxEvent(models.Model):
    id           = models.BigAutoField(primary_key=True)
    restaurant_id= models.IntegerField(db_index=True)     # ⚡ tenant chegarasi
    topic        = models.CharField(max_length=64)        # 'order.created'
    payload      = models.JSONField()
    created_at   = models.DateTimeField(auto_now_add=True)
    sent_at      = models.DateTimeField(null=True, db_index=True)
    attempts     = models.SmallIntegerField(default=0)
    last_error   = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['sent_at', 'id'], name='outbox_pending_idx',
                         condition=models.Q(sent_at__isnull=True)),
        ]


# core/outbox/publisher.py
def publish(topic, payload, restaurant_id):
    """⚠️ FAQAT transaction.atomic() ichida chaqiriladi."""
    assert transaction.get_connection().in_atomic_block, "Outbox tranzaksiya ichida bo'lishi shart"
    ev = OutboxEvent.objects.create(topic=topic, payload=payload,
                                    restaurant_id=restaurant_id)
    transaction.on_commit(lambda: _nudge_relay(ev.id))    # tez yo'l
    return ev


# core/outbox/relay.py — worker
HANDLERS = {
    'order.created':   handle_order_created,      # WS + notify + analytics
    'order.status':    handle_order_status,
    'payment.paid':    handle_payment_paid,       # fiscal + WS + Telegram
    'dish.updated':    handle_dish_updated,       # kesh invalidatsiya + snapshot
}

def relay_loop():
    while True:
        with transaction.atomic():
            batch = list(OutboxEvent.objects
                         .select_for_update(skip_locked=True)
                         .filter(sent_at__isnull=True, attempts__lt=10)
                         .order_by('id')[:100])
            for ev in batch:
                try:
                    HANDLERS[ev.topic](ev.payload, ev.restaurant_id)
                    ev.sent_at = timezone.now()
                except Exception as e:
                    ev.attempts += 1
                    ev.last_error = str(e)[:500]
                    if ev.attempts >= 10:
                        move_to_dlq(ev)
                OutboxEvent.objects.bulk_update(
                    batch, ['sent_at', 'attempts', 'last_error'])
        time.sleep(2 if not batch else 0)
```

**Tozalash:** `sent_at` to'ldirilgan yozuvlar 7 kundan keyin partition drop bilan o'chiriladi.

### 12.3 Saga — to'lov + fiskal

> **Muammo:** to'lov o'tdi, lekin fiskal chek yaratilmadi. Yoki teskarisi.
> Ikki tashqi tizim — distributed tranzaksiya yo'q. **Yechim: saga + kompensatsiya.**

```
  BOSQICH               MUVAFFAQIYAT                  ⛔ XATO → KOMPENSATSIYA
  ──────────────────────────────────────────────────────────────────────────
  S1  Buyurtma lock     order.status = 'paying'        → status = 'confirmed' (unlock)
       │
       ▼
  S2  To'lov yaratish   PaymentTransaction(pending)    → txn.status = 'cancelled'
       │                 + provider.create()
       ▼
  S3  To'lov tasdiq     webhook / poll → 'paid'        → provider.cancel() (refund)
       │                                                 ⚠️ pul qaytariladi
       ▼
  S4  Fiskal chek       OFD → receipt_id               → ⚡ KOMPENSATSIYA QILINMAYDI
       │                                                 pul qaytarilmaydi!
       │                                                 chek NAVBATGA tushadi
       ▼
  S5  Yakunlash         order.status = 'paid'          → qo'lda ko'rib chiqish
                        table.status = 'free'
                        WS + Telegram + chek QR
```

```python
# apps/payments/saga.py
from enum import Enum

class Step(str, Enum):
    LOCK_ORDER   = 'lock_order'
    CREATE_TXN   = 'create_txn'
    CONFIRM_PAY  = 'confirm_pay'
    FISCALIZE    = 'fiscalize'
    FINALIZE     = 'finalize'


class PaymentSaga:
    """
    ⚡ Muhim qaror: S4 (fiskal) MUVAFFAQIYATSIZ bo'lsa saga ORQAGA QAYTMAYDI.
    Sabab: mijoz to'lovni amalga oshirgan, pulni qaytarish mijoz uchun yomonroq
    tajriba. Chek navbatga tushadi va 48 soat ichida yuboriladi.
    """

    def __init__(self, order, provider, saga_state: 'SagaState'):
        self.order, self.provider, self.state = order, provider, saga_state

    def execute(self):
        try:
            self._step(Step.LOCK_ORDER,  self._lock_order,  self._unlock_order)
            self._step(Step.CREATE_TXN,  self._create_txn,  self._cancel_txn)
            self._step(Step.CONFIRM_PAY, self._confirm_pay, self._refund)
        except SagaFailure as e:
            self._compensate()
            raise

        # ⚡ S4 dan boshlab kompensatsiya YO'Q — faqat oldinga
        try:
            self._step(Step.FISCALIZE, self._fiscalize, compensation=None)
        except Exception:
            logger.error("[SAGA] Fiskal xato — navbatga qo'yildi, to'lov QAYTARILMAYDI")
            enqueue('fiscal', 'retry_receipt', order_id=self.order.id, delay=300)
            self.state.mark(Step.FISCALIZE, 'deferred')

        self._step(Step.FINALIZE, self._finalize, compensation=None)
        return self.state

    def _step(self, step, fn, compensation):
        if self.state.is_done(step):
            return self.state.result(step)            # ⚡ idempotent qayta ishga tushirish
        self.state.mark(step, 'running')
        result = fn()
        self.state.mark(step, 'done', result=result, compensation=compensation)
        return result

    def _compensate(self):
        """Teskari tartibda bekor qilish."""
        for step in reversed(self.state.completed_steps()):
            comp = self.state.compensation(step)
            if comp is None:
                continue
            try:
                comp()
                self.state.mark(step, 'compensated')
            except Exception:
                logger.exception("[SAGA] Kompensatsiya xatosi: %s", step)
                alert_oncall(f"🔴 Saga kompensatsiya xatosi: order={self.order.id}, "
                             f"step={step}. QO'LDA TEKSHIRING.", severity='P1')
```

```python
# apps/payments/models.py — saga holati DBda saqlanadi
class SagaState(models.Model):
    """Worker o'lsa — boshqa worker shu joydan davom etadi."""
    order       = models.OneToOneField('orders.Order', on_delete=models.CASCADE)
    restaurant_id = models.IntegerField(db_index=True)
    steps       = models.JSONField(default=dict)     # {step: {status, result, ts}}
    status      = models.CharField(max_length=20, default='running')
    updated_at  = models.DateTimeField(auto_now=True)
```

**Healer bog'lanishi:** `check_pending_payments` (#14) 5 daqiqada osilgan saga'larni
topib `execute()` ni qayta chaqiradi — har qadam idempotent bo'lgani uchun xavfsiz.

### 12.4 Dead Letter Queue (DLQ)

```
  Navbat                  Worker                    DLQ
    │                       │                        │
    ├── job ───────────────▶│ xato #1 → retry        │
    │◀──────────────────────┤                        │
    ├── job ───────────────▶│ xato #2 → retry        │
    │◀──────────────────────┤                        │
    ├── job ───────────────▶│ xato #3 → max urinish  │
    │                       ├───────────────────────▶│  status='dlq'
    │                       │                        │  error_trace saqlanadi
    │                       │                        │  ⚡ navbat BLOKLANMAYDI
    │                       │                        │
    │                       │  Admin panel: /ops/dlq/
    │                       │    → ko'rish, sabab tahlili
    │                       │    → "Qayta urinish" (tuzatilgandan keyin)
    │                       │    → "Tashlab yuborish"
    │                       │    → "Ommaviy qayta urinish" (filter bilan)
```

```python
# core/queue/dlq.py
class DeadLetter(models.Model):
    queue         = models.CharField(max_length=32, db_index=True)
    task_name     = models.CharField(max_length=128)
    restaurant_id = models.IntegerField(null=True, db_index=True)
    payload       = models.JSONField()
    attempts      = models.SmallIntegerField()
    error_type    = models.CharField(max_length=128)
    error_message = models.TextField()
    traceback     = models.TextField()
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at   = models.DateTimeField(null=True)
    resolution    = models.CharField(max_length=20, blank=True)  # retried|discarded|fixed


def move_to_dlq(job, exc=None):
    DeadLetter.objects.create(
        queue=job.queue, task_name=job.task_name,
        restaurant_id=job.payload.get('restaurant_id'),
        payload=job.payload, attempts=job.attempts,
        error_type=type(exc).__name__ if exc else 'MaxRetriesExceeded',
        error_message=str(exc)[:2000] if exc else '',
        traceback=traceback.format_exc()[:8000] if exc else '',
    )
    metrics.inc('armenu_dlq_total', labels={'queue': job.queue})
    # ⚡ Fiskal va to'lov DLQ'si — darhol P1
    if job.queue in ('fiscal', 'payments'):
        alert_oncall(f"🔴 DLQ: {job.queue}/{job.task_name} — moliyaviy ta'sir!",
                     severity='P1')
```

| Navbat | DLQ alert darajasi | Saqlash | Avto-retry |
|---|---|---|---|
| `fiscal` | 🔴 P1 (darhol) | 90 kun | ✅ har 6 soatda 48 soat davomida |
| `payments` | 🔴 P1 (darhol) | 90 kun | ✅ har 1 soatda 24 soat davomida |
| `notify` | 🟡 P3 (kunlik svodka) | 7 kun | ⛔ (eskirgan xabar kerak emas) |
| `ai` | 🟢 P4 (haftalik) | 7 kun | ⛔ |
| `model3d` | 🟢 P4 (kunlik svodka) | 30 kun | ✅ qo'lda tugma bilan |
| `analytics` | 🟢 P4 | 7 kun | ✅ kechasi ommaviy |

### 12.5 Poison message himoyasi

> **Muammo:** bitta buzuq xabar workerni har safar crash qiladi → navbat
> abadiy bloklanadi → butun `fiscal` navbat to'xtaydi.

```python
# core/queue/worker.py
POISON_THRESHOLD = 3           # 3 marta CRASH (xato emas — crash!)


def execute_job(job):
    crash_key = f'poison:{job.queue}:{job.id}'
    crashes = int(_r.get(crash_key) or 0)

    if crashes >= POISON_THRESHOLD:
        logger.error("[POISON] Job %s %d marta crash qildi — karantin", job.id, crashes)
        move_to_dlq(job, PoisonMessage(f'{crashes} crash'))
        _r.delete(crash_key)
        return

    # ⚡ Crash hisoblagichi ISH BOSHLANISHIDAN OLDIN oshiriladi.
    # Worker SIGKILL bo'lsa ham hisob saqlanadi.
    _r.incr(crash_key)
    _r.expire(crash_key, 86400)

    try:
        with time_limit(QUEUE_TIMEOUTS[job.queue]):
            result = TASKS[job.task_name](**job.payload)
    except Exception as exc:
        # Oddiy xato — crash emas, hisoblagichni qaytaramiz
        _r.decr(crash_key)
        raise
    else:
        _r.delete(crash_key)
        return result
```

**Qo'shimcha himoyalar:**

| Himoya | Nima qiladi |
|---|---|
| Payload hajmi cheki | > 256 KB payload navbatga qabul qilinmaydi (S3 havolasi ishlatiladi) |
| Sxema validatsiyasi | `enqueue()` da payload sxemaga tekshiriladi — buzuq xabar navbatga tushmaydi |
| Job timeout | `time_limit()` — cheksiz sikl workerni ushlab turmaydi |
| Bulkhead | Poison faqat 1 navbatni ta'sirlaydi (§7.1) |
| `SKIP LOCKED` | Bitta osilgan job boshqa worker'larni bloklamaydi |
| Karantin ko'rinishi | `/ops/dlq/?error_type=PoisonMessage` — sababni tahlil qilish |

---

## 13. ISHONCHLILIK CHEK-LISTI (kod ko'rigi uchun)

| # | Tekshiruv | ✅/⛔ |
|---|---|---|
| 1 | Har tashqi chaqiruv circuit breaker ichidami? | |
| 2 | Har tashqi chaqiruvda `timeout` berilganmi? | |
| 3 | Retry faqat idempotent operatsiyadami? | |
| 4 | 4xx xatolarda retry QILINMAYAPTIMI? | |
| 5 | Yozuv operatsiyasida idempotency kaliti bormi? | |
| 6 | DB darajasida `UniqueConstraint` zaxira sifatida bormi? | |
| 7 | WS/notify `transaction.on_commit` yoki outbox orqalimi? | |
| 8 | Uzoq ish (> 2 s) workerga o'tkazilganmi? | |
| 9 | Worker job'ining `job_timeout` i bormi? | |
| 10 | Fallback yo'li bormi va u **hech qachon xato bermaydimi**? | |
| 11 | Yangi tashqi xizmat uchun CB sozlamasi registryga qo'shildimi? | |
| 12 | Yangi navbat uchun bulkhead limiti belgilandimi? | |
| 13 | Yangi kritik yo'l chaos testiga qo'shildimi? | |
| 14 | Yangi ma'lumot turi backup jadvaliga kirdimi (RPO/RTO)? | |
| 15 | Alert xabari **nima qilish kerakligini** yozadimi? | |

---

## 14. XULOSA — ISHONCHLILIK QISQACHA

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ 5 TA ENG MUHIM QAROR                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. YADRO YO'L himoyalangan — Redis, WS, worker, S3, AI, OFD,   │
│     to'lov birgalikda yiqilsa ham buyurtma yaratiladi           │
│                                                                 │
│  2. HAR ZANJIR ODAM BILAN TUGAYDI — AR→rasm, AI→ofitsiant,     │
│     to'lov→naqd, fiskal→qo'lda chek. Hech qachon "xato sahifa"  │
│                                                                 │
│  3. FISKAL BUYURTMANI BLOKLAMAYDI — chek navbatga tushadi,      │
│     saga S4 dan keyin orqaga qaytmaydi                          │
│                                                                 │
│  4. 15 TA SELF-HEALING MEXANIZM — tunda odam uyg'otilmaydi;     │
│     tuzata olmasa alert AYNAN NIMA QILISH kerakligini yozadi    │
│                                                                 │
│  5. OUTBOX + IDEMPOTENCY — hech bir buyurtma, to'lov, chek      │
│     yo'qolmaydi va ikki marta bajarilmaydi                      │
└─────────────────────────────────────────────────────────────────┘
```

**Raqamlarda:**

| Ko'rsatkich | Qiymat |
|---|---|
| Yadro SLO (buyurtma) | 99,90% (8 s 46 daq/yil) |
| Menyu SLO | 99,95% (4 s 23 daq/yil) |
| Eng yomon RPO (to'lov) | **0** |
| Eng yomon RTO (to'liq DB) | 45–70 daqiqa |
| Self-healing mexanizmlar | 15 |
| Circuit breaker himoyalangan xizmatlar | 16 |
| Degradation zanjirlari | 7 |
| Izolyatsiyalangan navbatlar (bulkhead) | 5 |
| Chaos ssenariylari | 10 |
| Backup nusxalari | 3 (2 tur, 2 geografiya) |

---

**➡️ Keyingi:** `06_XAVFSIZLIK.md`
