# ARMENU — TIZIM ARXITEKTURASI
## QISM 4 — MASSHTABLASH

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** tizim arxitektori · SRE · texnik direktor · investor (due diligence)
**Oldingi:** `03_MALUMOT_ARXITEKTURASI.md` · **Keyingi:** `05_ISHONCHLILIK.md`

> Bu hujjat bitta savolga javob beradi: **"1 million bir vaqtda foydalanuvchi
> bo'lsa nima bo'ladi?"** — va har raqam **formula bilan** ko'rsatiladi.
> Taxmin yo'q, hisob bor.

---

## 1. YUKLAMA BOSQICHLARI — S0 → S5

```
        Foydalanuvchi/kun
             │
   2 000 000 ┤                                              ╭──── S5 (pik)
             │                                         ╭────╯   1 mln bir vaqtda
   1 000 000 ┤                                    ╭────╯        25 000 RPS
             │                               ╭────╯
     500 000 ┤                          ╭────╯ S4
             │                     ╭────╯      6 000 RPS
     100 000 ┤                ╭────╯ S3
             │           ╭────╯      1 500 RPS
      10 000 ┤      ╭────╯ S2
             │  ╭───╯      300 RPS
       1 000 ┤──╯ S1
             └──┬────┬────┬────┬────┬────┬────┬────┬────┬───▶
               0    6   12   18   24   30   36   42   48  oy
              S0   S1   S2       S3        S4            S5
```

### 1.1 To'liq bosqich jadvali

| Bosqich | Foydalanuvchi/kun | Restoran | Pik RPS | WS ulanish | DB write RPS | Oylik infra |
|---|---|---|---|---|---|---|
| **S0** Start | < 1 000 | 1-20 | 5 | 60 | 2 | **$40** |
| **S1** O'sish | 10 000 | 20-100 | 50 | 300 | 15 | **$120** |
| **S2** Viloyat | 100 000 | 100-400 | 300 | 1 400 | 90 | **$320** |
| **S3** Respublika | 500 000 | 400-1 500 | 1 500 | 6 000 | 300 | **$700** |
| **S4** Region | 2 000 000 | 1 500-5 000 | 6 000 | 24 000 | 1 000 | **$1 900** |
| **S5** Pik | **1 mln bir vaqtda** | 5 000+ | **25 000** | **90 000** | **1 000** | **$4 400** |

### 1.2 Har bosqich — infra tarkibi

```
╔═══ S0 — START ($40/oy) ══════════════════════════════════════════╗
║  1 × VPS (4 CPU / 8 GB / 100 GB NVMe)                            ║
║  ┌────────────────────────────────────────────┐                  ║
║  │ nginx                                       │                  ║
║  │ armenu.service      gunicorn ×4 worker      │  :8060           ║
║  │ armenu-ws.service   daphne ×1               │  :8061           ║
║  │ armenu-worker@1..5  (5 navbat)              │                  ║
║  │ armenu-healer.service                       │                  ║
║  │ PostgreSQL 16 (shared_buffers 2 GB)         │                  ║
║  │ Redis 7 (maxmemory 512 MB)                  │                  ║
║  │ MinIO (lokal S3)                            │                  ║
║  └────────────────────────────────────────────┘                  ║
║  Cloudflare Free · Backup: kunlik dump → boshqa VPS               ║
║  ⚠️ SPOF: hamma narsa bitta mashinada. Qabul qilingan risk.       ║
╚══════════════════════════════════════════════════════════════════╝

╔═══ S1 — O'SISH ($120/oy) ════════════════════════════════════════╗
║  VPS-1 (4/8): nginx + web + ws + worker                          ║
║  VPS-2 (4/8): PostgreSQL + Redis + MinIO                         ║
║  ⚡ O'zgarish: DB ajratildi → web restart DB'ga ta'sir qilmaydi   ║
║  Cloudflare Pro ($20) · Backup: pgBackRest → S3                  ║
╚══════════════════════════════════════════════════════════════════╝

╔═══ S2 — VILOYAT ($320/oy) ═══════════════════════════════════════╗
║  LB      × 1  (2/4)   nginx                                       ║
║  WEB     × 2  (4/8)   gunicorn 8w × 4t                            ║
║  WS      × 1  (4/8)   daphne                                      ║
║  DB      × 1  (8/16)  PG primary + 1 replica (sinxron emas)      ║
║  REDIS   × 1  (2/8)   cache + channels + queue                    ║
║  ⚡ O'zgarish: gorizontal web, read replica, S3 (haqiqiy)         ║
╚══════════════════════════════════════════════════════════════════╝

╔═══ S3 — RESPUBLIKA ($700/oy) ════════════════════════════════════╗
║  LB      × 2  (2/4)    keepalived VIP                             ║
║  WEB     × 4  (4/8)    auto-scale 3-8                             ║
║  WS      × 2  (4/8)                                               ║
║  WORKER  × 3  (4/8)    5 navbat bulkhead bilan                    ║
║  PG      × 1  (8/32) primary + 2 replica (4/16)                  ║
║  REDIS   × 3  (2/8)    Sentinel (HA)                              ║
║  PgBouncer × 2         transaction mode                           ║
║  ⚡ O'zgarish: HA (SPOF yo'q), PgBouncer, partition ishga tushdi  ║
╚══════════════════════════════════════════════════════════════════╝

╔═══ S4 — REGION ($1 900/oy) ══════════════════════════════════════╗
║  WEB     × 12 (4/8)    auto-scale 8-20                            ║
║  WS      × 2  (8/16)                                              ║
║  WORKER  × 4  (4/8)                                               ║
║  PG      × 1  (16/64) primary + 3 replica (8/32)                 ║
║  REDIS cluster × 3 (4/16)                                         ║
║  ClickHouse × 1 (8/32)  analitika PG'dan ko'chdi                  ║
║  ⚡ O'zgarish: ClickHouse, multi-region CDN, sharding tayyorgarlik ║
╚══════════════════════════════════════════════════════════════════╝

╔═══ S5 — PIK: 1 MLN BIR VAQTDA ($4 400/oy) ═══════════════════════╗
║  §3 da batafsil ⬇️                                                ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. SIG'IM HISOBLARI (CAPACITY PLANNING)

> Bu bo'limdagi har raqam **formula → natija** ko'rinishida. Kirish parametrlari
> o'zgarsa — natija qayta hisoblanadi.

### 2.1 Kirish parametrlari

| Belgi | Parametr | Qiymat | Manba |
|---|---|---|---|
| `T` | Stol / restoran | 25 | O'rtacha (10 / 25 / 80) |
| `A` | Stol aylanmasi / kun | 4 | Restoran statistikasi |
| `S` | Skanerlash / band stol | 1,6 | Har mehmon o'z telefonidan |
| `P` | Sahifa ochish / sessiya | 7,5 | menyu, kategoriya, 3 taom, savat, holat |
| `Q` | API so'rov / sahifa | 2,2 | HTML + menyu JSON + tasvir meta |
| `K` | Pik soat koeffitsienti | **3,0** | Kunlik trafikning 12,5%i 1 soatda |
| `W` | Ish soati / kun | 14 | 09:00 – 23:00 |

### 2.2 1 restoran = necha so'rov/kun

```
SESSIYA SONI:
  sessiya/kun = T × A × S
              = 25 × 4 × 1,6
              = 160 sessiya/kun

SAHIFA SONI:
  sahifa/kun = sessiya × P
             = 160 × 7,5
             = 1 200 sahifa/kun

API SO'ROV:
  sorov/kun = sahifa × Q
            = 1 200 × 2,2
            = 2 640 API so'rov/kun

QO'SHIMCHA (xodim + admin):
  ofitsiant polling/WS       ≈   900 so'rov/kun
  KDS                        ≈   400
  admin panel                ≈   300
  webhook (to'lov/fiskal)    ≈   140
                             ─────────
                             ≈ 1 740

╔══════════════════════════════════════════════════╗
║  1 RESTORAN = 2 640 + 1 740 = 4 380 so'rov/kun  ║
╚══════════════════════════════════════════════════╝
```

### 2.3 1 000 restoran = necha RPS

```
KUNLIK JAMI:
  4 380 × 1 000 = 4 380 000 so'rov/kun

O'RTACHA RPS (14 soatlik ish kuni):
  RPS_ort = 4 380 000 / (14 × 3 600)
          = 4 380 000 / 50 400
          = 86,9 RPS

PIK RPS (pik soat koeffitsienti K = 3,0):
  RPS_pik = 86,9 × 3,0
          = 260,7 RPS

  ⚠️ Pik soat qayerdan: kechki 19:00-21:00 da kunlik trafikning ~25%i.
     2 soatda 25% → 1 soatda 12,5% → o'rtachaga nisbatan 12,5%/(100%/14) = 1,75×
     + hafta oxiri koeffitsienti 1,7× → 1,75 × 1,7 = 2,98 ≈ 3,0 ✅

REZERV (2× — kutilmagan yuklama, marketing kampaniyasi):
  RPS_dizayn = 260,7 × 2 = 521 RPS

╔═══════════════════════════════════════════════════════════╗
║  1 000 RESTORAN → 261 RPS pik · 521 RPS dizayn sig'imi    ║
╚═══════════════════════════════════════════════════════════╝
```

**Turli restoran soni uchun:**

| Restoran | So'rov/kun | O'rtacha RPS | Pik RPS (×3) | Dizayn RPS (×2) |
|---|---|---|---|---|
| 20 | 87 600 | 1,7 | 5,2 | 10 |
| 100 | 438 000 | 8,7 | 26 | 52 |
| 400 | 1 752 000 | 34,8 | 104 | 209 |
| 1 000 | 4 380 000 | 87 | 261 | 521 |
| 1 500 | 6 570 000 | 130 | 391 | 782 |
| 5 000 | 21 900 000 | 435 | 1 304 | 2 608 |
| **5 000 (S5 pik)** | — | — | **25 000** | — |

> **⚠️ S5 nima uchun 25 000 RPS, 1 304 emas?** Chunki S5 — kunlik o'rtacha emas,
> **favqulodda pik**: bayram kuni (Navro'z, 31-dekabr) barcha restoran to'la,
> bir vaqtda 1 mln odam menyuni ochadi. Bu **19× normal pik**. §3 da batafsil.

### 2.4 1 gunicorn worker = necha RPS

```
NAZARIY FORMULA (Little qonuni):
  RPS_worker = 1 / T_javob

  Endpoint bo'yicha:
  ├─ menyu (kesh hit)    T = 8 ms   → 125 RPS
  ├─ menyu (kesh miss)   T = 45 ms  →  22 RPS
  ├─ taom detali         T = 12 ms  →  83 RPS
  ├─ buyurtma yaratish   T = 140 ms →   7 RPS
  ├─ AR meta             T = 6 ms   → 167 RPS
  └─ admin hisobot       T = 400 ms → 2,5 RPS

ARALASH YUKLAMA (real profil):
  0,60 × 8   (menyu, 92% kesh hit → 8×0,92 + 45×0,08 = 10,9 ms)
  0,15 × 6   (AR meta)
  0,05 × 140 (buyurtma)
  0,20 × 20  (boshqa)
  ─────────────────────────────────────────────
  T_ort = 0,60×10,9 + 0,15×6 + 0,05×140 + 0,20×20
        = 6,54 + 0,9 + 7,0 + 4,0
        = 18,4 ms

  RPS_worker(nazariy) = 1 / 0,0184 = 54,3 RPS

AMALIY KOEFFITSIENT (GIL, kontekst almashish, GC, tarmoq):
  RPS_worker = 54,3 × 0,70 = 38 RPS

  ⚡ gthread bilan (I/O kutish parallel):
     8 worker × 4 thread, lekin GIL sabab thread foydasi ~1,8×
     RPS_worker_effektiv = 38 × 1,8 = 68 RPS  ← ehtiyotkor baho: 60
```

```
1 INSTANS SIG'IMI (4 CPU / 8 GB):

  gunicorn worker soni = (2 × CPU) + 1 = (2 × 4) + 1 = 9  → 8 (juft son)
  thread / worker = 4
  ─────────────────────────────────────────────────────────
  RPS_instans = 8 × 60 = 480 RPS  (nazariy)

  ⚠️ AMALDA CPU chegarasi: 4 CPU × 100% / (18,4 ms CPU vaqti × 0,55 CPU-bound)
     = 4 / 0,0101 = 396 RPS

  ⚡ QABUL QILINGAN: 1 instans = 300 RPS (65% CPU da, headroom bilan)

XOTIRA TEKSHIRUVI:
  8 worker × 4 thread × 55 MB (Django + model) = 8 × 220 MB = 1,76 GB
  + Python interpreter overhead 8 × 45 MB      = 0,36 GB
  + OS + nginx + monitoring                     = 0,80 GB
  ────────────────────────────────────────────────────────
  JAMI ≈ 2,9 GB / 8 GB  ✅ (5,1 GB rezerv — page cache uchun)
```

### 2.5 Necha instans kerak

```
FORMULA:
  N_instans = ceil( RPS_dizayn / RPS_instans ) + N_rezerv

  N_rezerv = ceil(N × 0,25)   ← bitta node yiqilsa xizmat uzilmasin (N+1 emas, N+25%)
```

| Bosqich | Dizayn RPS | / 300 | Hisob | + Rezerv | **Instans** |
|---|---|---|---|---|---|
| S0 | 10 | 0,03 | 1 | 0 | **1** |
| S1 | 52 | 0,17 | 1 | +1 | **2** |
| S2 | 209 | 0,70 | 1 | +1 | **2** |
| S3 | 782 | 2,6 | 3 | +1 | **4** |
| S4 | 2 608 | 8,7 | 9 | +3 | **12** |
| S5 | 12 000 (web ulushi) | 40 | 40 | auto-scale | **40** |

```
S5 NEGA 40 (25 000 emas / 300 = 84 emas)?

  25 000 RPS umumiy — lekin qatlamlar filtrlaydi:
    CDN ushlaydi         75%  → 25 000 × 0,25 = 6 250 RPS origin'ga
    nginx statik/304     10%  → 6 250 × 0,90  = 5 625 RPS gunicorn'ga
    ⚡ Menyu keshdan       — bu 5 625 ning ichida, lekin arzon (8 ms)

  Aralash T_ort keshli yuklamada = 18,4 ms → 1 instans 300 RPS
  N = ceil(5 625 / 300) = 19 instans

  ⚠️ Lekin 3D fayl so'rovlari CDN miss bo'lsa (1%) + buyurtma piki (140 ms)
     → xavfsizlik zaxirasi 2× → 38 ≈ 40 instans ✅
```

### 2.6 Boshqa komponentlar sig'imi

| Komponent | Birlik sig'imi | Formula | Manba |
|---|---|---|---|
| **Daphne (WS)** | 50 000 ulanish / instans (8 GB) | `RAM / 30 KB × 0,6` | 8 GB / 30 KB = 266k, lekin epoll+GIL → 50k |
| **Redis** | 100 000 ops/s / instans | Bir oqim, `O(1)` operatsiya | Benchmark |
| **PostgreSQL write** | 3 000 TPS (16 CPU/64 GB NVMe) | `fsync 0,15 ms → 6600, WAL+index → 3000` | pgbench |
| **PostgreSQL read** | 25 000 QPS (buffer hit) | `CPU × 1 500` | Indeks-only scan |
| **PgBouncer** | 10 000 mijoz → 200 server conn | transaction mode | — |
| **Worker** | 40 job/s (yengil) · 0,03 job/s (3D) | Job turi bo'yicha | — |
| **nginx** | 30 000 RPS / instans (4 CPU) | Statik + proxy | — |

---

## 3. ⚡ 1 MILLION BIR VAQTDA — BATAFSIL TAHLIL

### 3.1 Ssenariy ta'rifi

```
⚠️ "1 million bir vaqtda" NIMA DEGANI:

  ❌ EMAS: 1 mln odam bir soniyada tugma bosadi (bu 1 mln RPS bo'lardi)
  ✅ HA:   1 mln odam ayni damda ilovani OCHIQ ushlab turibdi

  Real ssenariy: 31-dekabr kechasi / Navro'z
    5 000 restoran × 200 o'rin = 1 000 000 mehmon
    Har mehmon telefonida ARMENU ochiq

  FAOLLIK: har mehmon o'rtacha 40 soniyada bir marta harakat qiladi
    (skroll, taom bosish, savatga qo'shish, holat tekshirish)

  RPS = 1 000 000 / 40 = 25 000 RPS   ⚡ mana shu raqam
```

### 3.2 Yuklama profili

| # | Operatsiya | Ulush | RPS | Og'irlik | Qatlam |
|---|---|---|---|---|---|
| 1 | **Menyu ko'rish** | 60% | **15 000** | 🟢 yengil | Kesh / CDN |
| 2 | **3D/AR fayl** | 15% | **3 750** | 🟢 statik | CDN |
| 3 | **WebSocket** | 10% | ~90 000 ulanish | 🟡 stateful | Daphne |
| 4 | **Buyurtma yaratish** | 5% | **1 250** | 🔴 og'ir | DB write |
| 5 | **Boshqa API** | 10% | **2 500** | 🟡 aralash | Aralash |
| | **JAMI** | 100% | **~25 000** | | |

```
🔴 KRITIK KUZATUV:
   Buyurtma 5% (1 250 RPS) — bu eng KAM ulush, lekin eng OG'IR yuk.
   1 250 RPS × 3 yozuv (Order + OrderItem×3,5 + Table) ≈ 5 600 write/s

   ⚠️ PostgreSQL primary sig'imi 3 000 TPS → YETMAYDI!
   ✅ Yechim §3.5 da.
```

### 3.3 Qatlamli filtrlash — har qatlam qancha ushlaydi

```
                    25 000 RPS  (100%)
                         │
   ╔═════════════════════▼═════════════════════════════════════════╗
   ║ QATLAM 1 — BRAUZER localStorage                                ║
   ║ Ushlaydi: takroriy menyu ochish, statik aktivlar                ║
   ║ Hit rate: 45%                                                   ║
   ║ ⚡ Bu so'rovlar TARMOQQA UMUMAN CHIQMAYDI                        ║
   ╚═════════════════════╤═════════════════════════════════════════╝
                         │  ushlandi 11 250    →  qoldi 13 750 RPS
   ╔═════════════════════▼═════════════════════════════════════════╗
   ║ QATLAM 2 — CDN (Cloudflare)                                    ║
   ║ Ushlaydi: 3D fayl (99%), rasm (98%), JS/CSS (99%),              ║
   ║           menyu JSON (85%, 60s TTL)                             ║
   ║ Effektiv hit rate: 75% (barcha trafikdan)                       ║
   ║ Sig'im: cheksiz (Cloudflare anycast, 300+ PoP)                  ║
   ╚═════════════════════╤═════════════════════════════════════════╝
                         │  ushlandi 10 313    →  qoldi 3 437 RPS
   ╔═════════════════════▼═════════════════════════════════════════╗
   ║ QATLAM 3 — nginx (edge, origin'da)                             ║
   ║ Ushlaydi: 304 Not Modified (ETag), statik fayl, rate limit      ║
   ║ Hit rate: 12%                                                   ║
   ╚═════════════════════╤═════════════════════════════════════════╝
                         │  ushlandi 412       →  qoldi 3 025 RPS
   ╔═════════════════════▼═════════════════════════════════════════╗
   ║ QATLAM 4 — REDIS (application cache)                           ║
   ║ Ushlaydi: qurilgan menyu JSON, restoran obyekti, QR→stol,       ║
   ║           sessiya, AI javob                                     ║
   ║ Hit rate: 90% (o'qish so'rovlaridan)                            ║
   ║ 3 025 dan o'qish ~1 775, yozish ~1 250                          ║
   ║ Redis ushlaydi: 1 775 × 0,90 = 1 598                            ║
   ╚═════════════════════╤═════════════════════════════════════════╝
                         │  ushlandi 1 598     →  qoldi 1 427 RPS
   ╔═════════════════════▼═════════════════════════════════════════╗
   ║ QATLAM 5 — POSTGRESQL                                          ║
   ║   O'qish (replica'ga):   177 RPS   🟢                           ║
   ║   Yozish (primary'ga): 1 250 RPS   🔴 ← ASOSIY MUAMMO           ║
   ╚═══════════════════════════════════════════════════════════════╝

  ╔═══════════════════════════════════════════════════════════════════╗
  ║  25 000 RPS → DB'ga atigi 1 427 RPS yetib boradi (5,7%)          ║
  ║  ⚡ 94,3% yuklama DB'ga umuman kelmaydi                            ║
  ╚═══════════════════════════════════════════════════════════════════╝
```

**Hit rate maqsadlari va nazorati:**

| Qatlam | 🎯 Maqsad | 🟡 Ogohlantirish | 🔴 Alert | Metrika |
|---|---|---|---|---|
| Brauzer | 45% | < 35% | < 25% | `armenu_client_cache_hit` (RUM) |
| CDN | 92% | < 85% | < 75% | Cloudflare Analytics |
| nginx | 12% | < 8% | < 5% | `nginx_cache_status` |
| Redis (menyu) | 90% | < 80% | < 70% | `armenu_cache_hit_ratio{type="menu"}` |
| PG buffer | 99% | < 97% | < 92% | `pg_stat_database.blks_hit` |

### 3.4 ⚡ WEBSOCKET OPTIMIZATSIYASI — NEGA 1 MLN EMAS, ~90 000

Bu — **butun arxitekturaning eng muhim qarori**.

#### Muammo

```
NAIV YONDASHUV: har foydalanuvchiga WS ulanish

  RAM:  1 000 000 × 32 KB (Python obyekt + socket buffer + channel layer)
        = 32 000 000 KB = 32 GB   🔴

  Daphne instansi: 8 GB RAM → 8 GB / 32 KB × 0,6 (overhead) = 150 000
    lekin GIL va epoll cheklovi → amalda 50 000 ulanish/instans

  Kerakli instans: 1 000 000 / 50 000 = 20 ta Daphne (8 CPU/16 GB)
  Narx: 20 × $80 = $1 600/oy

  QO'SHIMCHA MUAMMO — Redis channel layer:
    Har ulanish group_add → Redis'da yozuv
    Har xabar → group_send → Redis pub/sub fan-out
    1 mln ulanish × 1 xabar/daqiqa = 16 667 pub/s → Redis 60% CPU 🔴
```

#### ✅ Yechim: WS faqat kerak bo'lganda

```
KIM UCHUN WS HAQIQATAN KERAK?

┌──────────────────┬─────────────┬──────────────────────────────────────┐
│ Kim              │ WS kerakmi? │ Sabab                                │
├──────────────────┼─────────────┼──────────────────────────────────────┤
│ Menyu ko'rayotgan│ ❌ YO'Q      │ Menyu 60s keshda — real-time kerak   │
│ mijoz (95%)      │             │ emas. Stop-list 60s kechiksa mayli.  │
├──────────────────┼─────────────┼──────────────────────────────────────┤
│ Buyurtma bergan  │ ✅ HA        │ "Tayyorlanmoqda → Tayyor" — bu       │
│ mijoz (5%)       │             │ real-time bo'lishi SHART             │
├──────────────────┼─────────────┼──────────────────────────────────────┤
│ Ofitsiant        │ ✅ HA        │ Yangi buyurtma darhol kerak          │
├──────────────────┼─────────────┼──────────────────────────────────────┤
│ Oshxona (KDS)    │ ✅ HA        │ Ekranda darhol paydo bo'lsin         │
├──────────────────┼─────────────┼──────────────────────────────────────┤
│ Admin dashboard  │ ✅ HA        │ Jonli ko'rsatkichlar                 │
└──────────────────┴─────────────┴──────────────────────────────────────┘
```

#### Hisob

```
1) MIJOZ WS — faqat buyurtma bergandan KEYIN

   Bir vaqtda ilovani ochiq ushlab turgan: 1 000 000
   Ulardan buyurtma bergan va "kutish" ekranida: ?

   Sessiya davomiyligi:  45 daqiqa (o'tirish)
   Buyurtma kutish:       18 daqiqa (o'rtacha eta_min)
   Konversiya:            ~62% mehmon buyurtma beradi

   Bir vaqtda "kutish" holatidagi ulush:
     = konversiya × (kutish_vaqti / sessiya_vaqti)
     = 0,62 × (18 / 45)
     = 0,62 × 0,40
     = 0,248  →  24,8%

   ⚠️ Lekin "bir vaqtda 1 mln" — bu pik payt, hamma endi kelgan.
      Ehtiyotkor baho: 5% (TZ dagi raqam)

   Mijoz WS = 1 000 000 × 0,05 = 50 000 ulanish

2) XODIM WS

   5 000 restoran × (ofitsiant 5 + KDS 2 + admin 1) = 5 000 × 8 = 40 000

3) JAMI

   50 000 + 40 000 = 90 000 ulanish

   RAM: 90 000 × 32 KB = 2,88 GB
   Instans: ceil(90 000 / 50 000) = 2  →  +1 rezerv = 3 ta Daphne

╔═══════════════════════════════════════════════════════════════════════╗
║  1 000 000 ulanish  →  90 000 ulanish   (11× kamayish)               ║
║  20 instans ($1 600) →  3 instans ($240)  ⚡ $1 360/oy TEJASH        ║
║  Redis pub/s: 16 667 → 1 500 (11× kam yuklama)                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

#### Qolgan 95% mijoz qanday yangilanish oladi

| Usul | Kim uchun | Interval | Narx (RPS) |
|---|---|---|---|
| **Kesh + TTL** | Menyu ko'rayotgan | 60 s (CDN TTL) | 0 (kesh) |
| **Polling** | Buyurtmasiz, savat ochiq | 15 s | 1 000 000/15 = 66 667 RPS 🔴 |
| **⚡ Yo'q** | Menyu ko'rayotgan (asosiy) | — | **0** ✅ |
| **SSE** | Faqat "bill so'raldi" holatida | uzun ulanish | ~2 000 ulanish |

```
🔴 DIQQAT: 15 s polling 1 mln foydalanuvchi uchun 66 667 RPS beradi —
   bu WS dan ham YOMONROQ!

✅ SHUNING UCHUN: menyu ko'rayotgan mijozda HECH QANDAY jonli kanal YO'Q.
   Stop-list o'zgarishi keyingi sahifa yangilashda ko'rinadi (60s kesh).
   Bu — ataylab qabul qilingan trade-off (00_UMUMIY §4).

   ⚠️ Xavf: mijoz stop-listdagi taomni savatga qo'shishi mumkin.
   ✅ Himoya: BUYURTMA YARATISHDA server qayta tekshiradi → 409 DISH_UNAVAILABLE
      → frontend "Bu taom tugadi" deb ko'rsatadi va savatdan olib tashlaydi.
      Ya'ni: xato mumkin, lekin NOTO'G'RI BUYURTMA MUMKIN EMAS.
```

#### WS ulanish byudjeti (instans darajasi)

```python
# config/settings.py — Daphne cheklovlari
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis-cluster", 6379)],
            "capacity": 1500,          # ⚡ group'dagi maks navbat
            "expiry": 20,              # xabar 20 s da eskiradi
            "group_expiry": 86400,
            "symmetric_encryption_keys": [SECRET_KEY],
        },
        # 🔴 db=6 — cache (db=5) dan ALOHIDA. Sabab: FLUSHDB cache'ni
        #    tozalaganda WS ulanishlar uzilmasin.
    },
}

# apps/ws/consumers.py
class GuestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        session = await self.get_session()

        # ⚡ QAT'IY QOIDA: faol buyurtmasiz mijoz WS ochmaydi
        if not await self.has_active_order(session):
            await self.close(code=4003)          # "WS kerak emas"
            return

        self.group = f"guest_{session.id}"       # ⚠️ tenant-scoped
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def receive_json(self, content):
        # ⚡ Mijoz WS orqali HECH NARSA YUBORMAYDI (faqat qabul qiladi)
        pass                                      # DoS yuzasini yopadi

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)
```

```python
# ⚡ Buyurtma yakunlangach WS avtomatik yopiladi (resurs bo'shaydi)
async def order_status(self, event):
    await self.send_json(event['data'])
    if event['data']['status'] in ('paid', 'cancelled'):
        await self.close(code=1000)              # ⚡ ulanish bo'shaydi
```

### 3.5 🔴 DB YOZISH YUKLAMASI — ENG QIYIN MUAMMO

```
MUAMMO:
  Buyurtma 1 250 RPS × yozuv soni:
    Order                 1
    OrderItem           3,5
    Table UPDATE          1
    Payment (70%)       0,7
    FiscalReceipt (70%) 0,7
    AuditLog              1
    ─────────────────────────
                        7,9 yozuv/buyurtma

  Jami: 1 250 × 7,9 = 9 875 write/s

  ⚠️ PostgreSQL primary (16 CPU/64 GB NVMe) sig'imi ≈ 3 000 TPS
  ➜ 3,3× OSHIB KETADI  🔴🔴
```

#### Yechimlar zanjiri (tartib bilan qo'llanadi)

```
┌─ Y1: EVENT'LARNI PG'DAN CHIQARISH ────────────────────────────┐
│ AnalyticsEvent + ARView PostgreSQL'ga YOZILMAYDI               │
│   → Redis Stream → batch → ClickHouse                          │
│ Tejash: 1 250 × 12 event = 15 000 write/s butunlay chiqadi     │
│ ⚡ Bu eng katta tejash — analitika PG'ni o'ldiradigan yuk edi   │
│ Yangi jami: 9 875 write/s (event'siz hisoblangan holda)        │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Y2: AUDITLOG ASINXRON ───────────────────────────────────────┐
│ AuditLog → Redis Stream → worker batch INSERT (500 ta bir yo'la)│
│ Tejash: 1 250 write/s → 2,5 write/s (500× batch)               │
│ Yangi jami: 8 627 write/s                                      │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Y3: FISKAL VA TO'LOV ASINXRON ───────────────────────────────┐
│ FiscalReceipt worker'da yaratiladi (baribir OFD kutadi 3 s)    │
│ Payment webhook kelganda yoziladi (bir zumda emas)             │
│ Tejash: 1 750 write/s → pik tekislanadi (worker o'z tezligida) │
│ Yangi jami: 6 877 write/s                                      │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Y4: BULK_CREATE ─────────────────────────────────────────────┐
│ OrderItem.objects.bulk_create(items)                           │
│ 3,5 alohida INSERT → 1 ta multi-row INSERT                     │
│ ⚡ TPS hisobida: 3,5 tranzaksiya → 1 tranzaksiya                │
│ Tejash: WAL yozuvi 3,5× kam, fsync 1 marta                     │
│ Effektiv TPS: 6 877 → ~3 750 TPS                               │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Y5: PARTITION + INDEKS MINIMIZATSIYA ────────────────────────┐
│ Joriy oy partitioni kichik (3 mln qator) → indeks RAM'da       │
│ Har INSERT 3 indeks yangilaydi (6 emas — keraksizlar o'chdi)   │
│ Tejash: ~20% write amplification                                │
│ Effektiv TPS: 3 750 → ~3 000 TPS                               │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Y6: PG SOZLAMALARI (fsync guruhlash) ────────────────────────┐
│ commit_delay = 200 (µs) · commit_siblings = 10                 │
│   → parallel tranzaksiyalar bitta fsync'da guruhlanadi         │
│ synchronous_commit = 'on' (moliyaviy — 'off' QILINMAYDI!)      │
│ wal_buffers = 64MB · max_wal_size = 16GB                       │
│ checkpoint_completion_target = 0,9 (I/O tekis tarqaladi)       │
│ Foyda: +25% write TPS                                           │
│ Sig'im: 3 000 → 3 750 TPS                                      │
└────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║  KERAK: ~3 000 TPS   ·   SIG'IM: ~3 750 TPS   →  ✅ SIG'ADI      ║
║  Headroom: 20% (kam, lekin S5 — favqulodda pik, doimiy emas)      ║
╚═══════════════════════════════════════════════════════════════════╝
```

**⚠️ Agar sig'masa — 7-yechim (sharding):**

```
Y7: SHARDING (4 shard)
    3 000 TPS / 4 = 750 TPS/shard → har shard 25% yuklangan ✅
    Batafsil: 03_MALUMOT_ARXITEKTURASI.md §6
```

#### Analytics oqimi (Y1 batafsil)

```python
# apps/analytics/pipeline.py
"""
⚡ Event PostgreSQL'ga YOZILMAYDI. Yo'l:
   web → Redis Stream (XADD, 0,1 ms) → worker (XREADGROUP) → ClickHouse batch
"""
STREAM = "armenu:events"

def track(restaurant_id: int, event_type: str, **payload):
    """Web so'rov ichida chaqiriladi. Bloklamaydi."""
    try:
        redis.xadd(STREAM, {
            "r": restaurant_id, "t": event_type,
            "p": json.dumps(payload), "ts": time.time(),
        }, maxlen=1_000_000, approximate=True)      # ⚡ eski avtomatik tushadi
    except RedisError:
        pass                                        # 🟢 event yo'qolsa — mayli


# worker (armenu-worker@analytics)
def drain_events():
    """Har 2 soniyada 5 000 event'ni ClickHouse'ga batch yozadi."""
    while True:
        msgs = redis.xreadgroup("ch", "w1", {STREAM: ">"}, count=5000, block=2000)
        if not msgs:
            continue
        rows = [parse(m) for _, batch in msgs for _, m in batch]
        clickhouse.insert("events", rows)           # 5 000 qator = 1 so'rov
        redis.xack(STREAM, "ch", *[mid for _, b in msgs for mid, _ in b])

# HISOB: 15 000 event/s → 5 000 lik batch → 3 ClickHouse INSERT/s
#        ClickHouse sig'imi: 500 000 qator/s ✅ (30× headroom)
```

### 3.6 S5 infratuzilma va narx

| # | Komponent | Miqdor | Konfiguratsiya | Birlik $ | Oylik $ |
|---|---|---|---|---|---|
| 1 | Web (gunicorn) | 40 | 4 CPU / 8 GB | 40 | **1 600** |
| 2 | WS (daphne) | 3 | 8 CPU / 16 GB | 80 | **240** |
| 3 | Worker | 6 | 4 CPU / 8 GB | 40 | **240** |
| 4 | PG primary | 1 | 16 CPU / 64 GB / 2 TB NVMe | 400 | **400** |
| 5 | PG replica | 3 | 8 CPU / 32 GB | 200 | **600** |
| 6 | Redis cluster | 6 | 4 CPU / 16 GB | 80 | **480** |
| 7 | Load balancer | 2 | 4 CPU / 8 GB | 40 | **80** |
| 8 | ClickHouse | 2 | 8 CPU / 32 GB | 200 | **400** |
| 9 | S3 / object storage | 5 TB | — | — | **120** |
| 10 | CDN (Cloudflare) | — | Business | — | **200** |
| 11 | Monitoring | 1 | 4 CPU / 8 GB | 40 | **40** |
| | **JAMI** | **64 node** | | | **$4 400** |

```
DAROMADGA NISBATAN:

  5 000 restoran × 590 000 so'm/oy = 2 950 000 000 so'm/oy
  Kurs 12 650 so'm/$ →  $233 200/oy

  Infra ulushi = 4 400 / 233 200 = 1,89%

  ✅ SOG'LOM. SaaS sanoat me'yori: 5-15% (infra/ARR).
     1,9% — juda yaxshi ko'rsatkich (kesh strategiyasi tufayli).

  📊 Solishtirish:
     Agar kesh bo'lmasa: 40 web → 120 web, PG → 4 shard, CDN → CloudFront
     = ~$14 000/oy = 6,0% daromaddan
     ⚡ Kesh arxitekturasi yiliga $115 000 tejaydi.
```

---

## 4. BO'G'IZ NUQTALARI (BOTTLENECK)

> Har bo'g'iz: **qachon** yuzaga keladi → **belgisi** (aniq metrika) → **yechim** → **narx**.

### 4.1 Bo'g'izlar xaritasi

```
   Foydalanuvchi
        │
        ▼
   ┌─────────┐  B1: nginx worker_connections
   │  nginx  │      ⏰ 30 000 RPS
   └────┬────┘
        │
        ▼
   ┌─────────┐  B2: gunicorn worker to'yinishi
   │gunicorn │      ⏰ 300 RPS/instans
   └────┬────┘
        │
        ├────────────────┐
        ▼                ▼
   ┌─────────┐      ┌─────────┐  B3: Redis bir oqim CPU
   │  Redis  │      │ Daphne  │      ⏰ 80 000 ops/s
   └────┬────┘      └────┬────┘  B4: WS ulanish RAM
        │                │           ⏰ 50 000/instans
        ▼                │
   ┌─────────┐           │
   │PgBouncer│           │       B5: pool tugashi
   └────┬────┘           │           ⏰ 200 server conn
        │                │
        ▼                │
   ┌─────────┐           │       B6: PG write TPS 🔴
   │   PG    │◀──────────┘           ⏰ 3 000 TPS
   │ primary │               B7: replikatsiya lag
   └────┬────┘                   ⏰ WAL > 150 MB/min
        │
        ▼
   ┌─────────┐               B8: replica read
   │ replica │                   ⏰ 25 000 QPS
   └─────────┘

   ┌─────────┐               B9: worker navbat to'lishi
   │ worker  │                   ⏰ queue_depth > 5 000
   └─────────┘
                             B10: S3/CDN origin
                                 ⏰ origin 500 RPS
```

### 4.2 To'liq bo'g'iz jadvali

| # | Bo'g'iz | Qachon | 🔴 Belgi (metrika) | Yechim | Narx | Vaqt |
|---|---|---|---|---|---|---|
| **B1** | nginx ulanish | > 30 000 RPS/node | `nginx_connections_waiting > 1000` | `worker_connections 65535`, `worker_rlimit_nofile 200000`, +LB node | $40/node | 10 daq |
| **B2** | gunicorn to'yinishi | > 300 RPS/instans | `gunicorn_request_duration_p95 > 400ms` **va** CPU > 80% | Auto-scale +2 instans | $40/instans | 2 daq |
| **B3** | Redis CPU (bir oqim) | > 80 000 ops/s | `redis_cpu > 75%`, `instantaneous_ops_per_sec` | Redis Cluster (6 node), kalitlar hash-slot bo'yicha | $80/node | 1 kun |
| **B4** | WS ulanish RAM | > 50 000/instans | `daphne_connections > 45000` yoki RAM > 85% | +1 Daphne node, `sticky session` LB'da | $80/node | 15 daq |
| **B5** | PgBouncer pool | Web instans > 25 ta | `pgbouncer_cl_waiting > 50` | `default_pool_size 300`, +2-chi PgBouncer | $20 | 5 daq |
| **B6** | 🔴 **PG write TPS** | > 2 500 TPS | `pg_stat_bgwriter.buffers_backend` ↑, `wal_write_time` ↑, commit p95 > 30 ms | Y1-Y6 (§3.5) → keyin **sharding** | $600 (4 shard) | 4 hafta |
| **B7** | Replikatsiya lag | WAL > 150 MB/min | `pg_replication_lag_seconds > 10` | `wal_compression on`, replica NVMe, sinxron→asinxron | $200 | 1 soat |
| **B8** | Replica read | > 25 000 QPS | `pg_stat_database.xact_commit` replica'da | +1 replica, kesh TTL oshirish | $200/replica | 30 daq |
| **B9** | Worker navbat | `queue_depth > 5 000` | `armenu_queue_depth{queue="notify"}` | +worker (bulkhead saqlanadi), navbat prioriteti | $40/node | 5 daq |
| **B10** | S3 origin | CDN miss > 500 RPS | `cf_cache_status=MISS` ulushi > 8% | TTL oshirish, `immutable` header, prefetch | $0 | 10 daq |
| **B11** | 3D generatsiya | > 50 job/kun | `queue_depth{queue="model3d"} > 100` | GPU node, tashqi provayder (Meshy/Luma) | $500/oy | 1 hafta |
| **B12** | OFD API | > 100 chek/daq | `fiscal_retry_count` ↑, 429 javob | Navbat + backoff, ikkinchi provayder | $0 | — |
| **B13** | Disk IOPS | > 20 000 IOPS | `node_disk_io_time_seconds` > 0,8 | NVMe → yuqori IOPS tarif | $150 | 1 soat |
| **B14** | Tarmoq (CDN origin) | > 2 Gbps | `node_network_transmit_bytes` | Cloudflare Argo, 2-chi origin | $200 | 1 kun |

### 4.3 Bo'g'iz aniqlash tartibi (incident runbook)

```
🚨 "Sayt sekin" signali keldi. TARTIB:

1. QAYSI QATLAM?  →  Grafana "Latency by layer" paneli
   ├─ CDN p95 ↑        → Cloudflare status, B10
   ├─ nginx p95 ↑      → B1
   ├─ gunicorn p95 ↑   → 2-qadamga
   ├─ DB p95 ↑         → 3-qadamga
   └─ WS delay ↑       → B4

2. GUNICORN sekin bo'lsa:
   ├─ CPU > 80%?        → B2 (auto-scale)
   ├─ CPU past, kutish? → DB yoki Redis kutmoqda → 3-qadam
   └─ Xotira swap?      → memory leak, instans restart

3. DB sekin bo'lsa:
   ├─ pg_stat_activity da lock kutish? → B6 / deadlock
   ├─ buffer hit < 95%?               → ishchi to'plam RAM'ga sig'maydi
   ├─ commit p95 > 30 ms?             → B6 (write to'yinishi)
   ├─ replication lag > 10s?          → B7
   └─ sekin so'rov (pg_stat_statements)? → indeks yo'q / N+1

4. FAQAT MENYU sekin bo'lsa:
   └─ cache_hit_ratio < 80%? → menu_version juda tez o'zgaryaptimi?
      (admin bulk-import qilyaptimi → bump har qatorda bo'lmasin!)
```

---

## 5. AUTO-SCALING

### 5.1 Qoidalar

| Komponent | ⬆️ Scale-out sharti | ⬇️ Scale-in sharti | Min | Maks | Cooldown |
|---|---|---|---|---|---|
| **WEB** | CPU > 65% (3 daq) **YOKI** p95 > 400 ms (2 daq) | CPU < 30% (15 daq) | 3 | 60 | out 3 daq / in 15 daq |
| **WS** | ulanish > 40 000/instans **YOKI** RAM > 80% | ulanish < 15 000/instans (30 daq) | 2 | 12 | out 5 daq / in 30 daq |
| **WORKER** | `queue_depth > 500` (2 daq) | `queue_depth < 50` (20 daq) | 2 | 20 | out 2 daq / in 20 daq |
| **PG replica** | ❌ avtomatik emas | ❌ | 2 | 5 | qo'lda |
| **Redis** | ❌ avtomatik emas | ❌ | 3 | 9 | qo'lda |

```
⚠️ NEGA DB va REDIS AVTOMATIK EMAS:
   Stateful — yangi node ma'lumot ko'chirishni talab qiladi.
   Avtomatik qo'shish → replikatsiya bo'roni → yanada yomon.
   Qo'lda, rejalashtirilgan oynada.
```

### 5.2 Scale-out qadami — nega +2, +1 emas

```
+1 QO'SHISH MUAMMOSI:
  4 instans, har biri 70% → +1 → 5 instans, har biri 56%
  Trafik 15% o'ssa → 64% → yana chegaraga yaqin → yana +1
  ➜ "Pillapoya effekti": doimiy scale event, tizim tebranadi (flapping)

+2 QO'SHISH:
  4 → 6 instans, har biri 47% → 40% headroom
  ➜ Keyingi scale event ~2 barobar trafik o'sganda
  ➜ Barqaror

FORMULA:
  N_yangi = ceil( N_joriy × CPU_joriy / CPU_maqsad )
          = ceil( 4 × 0,80 / 0,50 )
          = ceil( 6,4 ) = 7      ← proportional scaling (yaxshiroq)

  ⚡ Amalda: max(+2, proportional) ishlatiladi.
```

### 5.3 Cooldown — nega asimmetrik

```
SCALE-OUT cooldown = 3 daqiqa   (tez reaksiya)
SCALE-IN  cooldown = 15 daqiqa  (ehtiyotkor)

SABAB:
  ❌ Kam instans = xizmat sifati tushadi (foydalanuvchi ketadi)  🔴
  ✅ Ortiqcha instans = $40/oy ortiqcha xarajat                  🟢

  Xato narxi asimmetrik → qaror ham asimmetrik.

  ⚠️ Yana bir sabab: "sawtooth" — trafik to'lqinsimon bo'lsa
     tez scale-in → darhol yana scale-out → node ishga tushish
     vaqti (90 s) davomida yuklama qoladigan node'larga tushadi.
```

### 5.4 Stateless talabi — auto-scaling sharti

```
🔴 QAT'IY: WEB instans HECH QANDAY holat saqlamaydi.

┌────────────────────┬─────────────────────────────────────────────┐
│ Nima               │ Qayerda saqlanadi                           │
├────────────────────┼─────────────────────────────────────────────┤
│ Sessiya            │ ✅ Redis (django-redis session backend)     │
│ Savat (cart)       │ ✅ Brauzer localStorage + Redis (sessiya)   │
│ Yuklangan fayl     │ ✅ S3 (lokal diskka YOZILMAYDI)             │
│ Kesh               │ ✅ Redis (locmem QAT'IY TAQIQ)              │
│ Rate limit         │ ✅ Redis                                    │
│ Idempotency        │ ✅ Redis + DB                               │
│ Fon vazifa         │ ✅ Job jadvali (threading.Thread TAQIQ)     │
│ WS ulanish         │ ⚠️ Daphne'da (shuning uchun WS alohida)     │
│ Log                │ ✅ stdout → journald → markazlashgan        │
└────────────────────┴─────────────────────────────────────────────┘

⛔ TAQIQLANGAN NAQSHLAR:
   • CACHES = {'default': {'BACKEND': '...locmem.LocMemCache'}}
     → har instansda alohida kesh → invalidation ishlamaydi
   • MEDIA_ROOT = '/var/www/media'  (lokal disk)
     → boshqa instansda fayl yo'q
   • threading.Thread(target=long_task).start()
     → instans o'chsa vazifa yo'qoladi
   • global CACHE = {} (modul darajasidagi o'zgaruvchi)
     → instansga bog'liq holat
```

```python
# tests/test_stateless.py — CI'da tekshiriladi
def test_locmem_cache_ishlatilmaydi():
    for name, conf in settings.CACHES.items():
        assert 'locmem' not in conf['BACKEND'].lower(), \
            f"CACHES[{name}] locmem — auto-scaling buziladi"

def test_media_s3_da():
    assert 'S3' in settings.DEFAULT_FILE_STORAGE or \
           'storages' in settings.DEFAULT_FILE_STORAGE

def test_threading_ishlatilmaydi():
    """Web kodda threading.Thread topilmasin (worker'da mumkin)."""
    hits = subprocess.run(
        ['grep', '-rn', 'threading.Thread', 'apps/', '--include=*.py'],
        capture_output=True, text=True).stdout
    ruxsat = ['apps/workers/', 'apps/core/healer.py']
    for line in hits.splitlines():
        assert any(r in line for r in ruxsat), f"Web kodda thread: {line}"
```

### 5.5 Graceful shutdown (scale-in paytida)

```ini
# /etc/systemd/system/armenu.service
[Service]
ExecStart=/opt/armenu/venv/bin/gunicorn config.wsgi \
    --bind unix:/run/armenu.sock \
    --workers 8 --threads 4 --worker-class gthread \
    --max-requests 2000 --max-requests-jitter 200 \
    --graceful-timeout 30 --timeout 60
KillSignal=SIGTERM
TimeoutStopSec=45
```

```
SCALE-IN KETMA-KETLIGI (0 uzilish):
  1. LB'dan olib tashlash (health check 503 qaytaradi)     ← 10 s
  2. Yangi so'rov kelmaydi, joriylari tugallanadi          ← 30 s
  3. SIGTERM → gunicorn graceful                            ← 30 s
  4. Instans o'chiriladi

  ⚡ --max-requests 2000: har worker 2000 so'rovdan keyin qayta tug'iladi
     → memory leak to'planmaydi (jitter bilan bir vaqtda emas)
```

---

## 6. ISHLASH BYUDJETI (PERFORMANCE BUDGET)

### 6.1 Endpoint maqsadlari

| Endpoint | p50 | **p95** | p99 | Timeout | Prioritet |
|---|---|---|---|---|---|
| `GET /t/{qr_token}` (redirect) | 15 ms | **40 ms** | 90 ms | 3 s | 🔴 kritik |
| `GET /v1/menu/{slug}/` (kesh hit) | 6 ms | **20 ms** | 60 ms | 5 s | 🔴 kritik |
| `GET /v1/menu/{slug}/` (kesh miss) | 35 ms | **90 ms** | 180 ms | 5 s | 🔴 |
| `GET /v1/dish/{id}/` | 8 ms | **25 ms** | 70 ms | 5 s | 🟡 |
| `GET /v1/ar/{dish_id}/` | 5 ms | **15 ms** | 40 ms | 3 s | 🟡 |
| `POST /v1/orders/` | 85 ms | **200 ms** | 400 ms | 10 s | 🔴🔴 eng kritik |
| `POST /v1/orders/{id}/add-items/` | 70 ms | **180 ms** | 350 ms | 10 s | 🔴 |
| `GET /v1/orders/{id}/` | 10 ms | **30 ms** | 80 ms | 5 s | 🟡 |
| `POST /v1/calls/` | 20 ms | **60 ms** | 120 ms | 5 s | 🟡 |
| `POST /v1/payments/` | 150 ms | **500 ms** | 1,2 s | 15 s | 🔴 (tashqi API) |
| `GET /v1/staff/orders/` | 25 ms | **80 ms** | 200 ms | 5 s | 🔴 |
| `POST /v1/staff/orders/{id}/ready/` | 40 ms | **120 ms** | 250 ms | 5 s | 🔴 |
| `GET /v1/admin/dashboard/` | 120 ms | **400 ms** | 900 ms | 15 s | 🟢 |
| `GET /v1/admin/reports/sales/` | 350 ms | **1,2 s** | 3 s | 30 s | 🟢 |
| `POST /v1/ai/chat/` | 800 ms | **2,5 s** | 6 s | 20 s | 🟢 (tashqi) |
| **WS xabar yetkazish** | 30 ms | **100 ms** | 300 ms | — | 🔴 |

### 6.2 Vaqt taqsimoti — `POST /v1/orders/` (p95 = 200 ms)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  BUYURTMA YARATISH — 200 ms BYUDJETI                                 ║
╚═══════════════════════════════════════════════════════════════════════╝

  Bosqich                              Byudjet   Ulush   Kumulyativ
  ──────────────────────────────────────────────────────────────────────
  1. Tarmoq (mijoz → CF → origin)       35 ms   17,5%      35 ms
     ├─ 4G kechikish O'zbekistonda      ~28 ms
     └─ TLS resumption                   ~7 ms
  ──────────────────────────────────────────────────────────────────────
  2. nginx (proxy, buffer)                3 ms    1,5%      38 ms
  ──────────────────────────────────────────────────────────────────────
  3. Django middleware zanjiri           12 ms    6,0%      50 ms
     ├─ SecurityMiddleware                1 ms
     ├─ SessionMiddleware (Redis GET)     3 ms
     ├─ TenantMiddleware (Redis GET)      4 ms   ⚡ qr:table keshdan
     ├─ CommonMiddleware                  1 ms
     └─ RateLimitMiddleware (Redis INCR)  3 ms
  ──────────────────────────────────────────────────────────────────────
  4. DRF (parse + serializer validate)    8 ms    4,0%      58 ms
     ├─ JSON parse                        2 ms
     └─ Serializer.is_valid()             6 ms
  ──────────────────────────────────────────────────────────────────────
  5. Idempotency tekshiruvi (Redis)       3 ms    1,5%      61 ms
  ──────────────────────────────────────────────────────────────────────
  6. Biznes validatsiya (2 DB so'rov)    32 ms   16,0%      93 ms
     ├─ Table + Restaurant (1 so'rov)     9 ms   select_related
     ├─ Dish + Modifier (1 so'rov)       18 ms   prefetch_related
     └─ Python tekshiruv (stop-list)      5 ms
  ──────────────────────────────────────────────────────────────────────
  7. 🔴 TRANZAKSIYA (3 yozuv)            72 ms   36,0%     165 ms
     ├─ BEGIN                             1 ms
     ├─ SELECT FOR UPDATE (table)         8 ms
     ├─ INSERT Order                     14 ms
     ├─ bulk_create OrderItem (3,5)      21 ms   ⚡ 1 so'rov
     ├─ UPDATE Table                      9 ms
     ├─ next_order_number (advisory)     11 ms
     └─ COMMIT (fsync)                    8 ms
  ──────────────────────────────────────────────────────────────────────
  8. on_commit (4 WS + 3 enqueue)         9 ms    4,5%     174 ms
     ├─ 4 × group_send (Redis)            6 ms   ⚡ fire-and-forget
     └─ 3 × XADD navbat                   3 ms
  ──────────────────────────────────────────────────────────────────────
  9. Javob serializatsiya                 8 ms    4,0%     182 ms
  ──────────────────────────────────────────────────────────────────────
 10. Tarmoq (javob qaytishi)             18 ms    9,0%     200 ms
  ══════════════════════════════════════════════════════════════════════
     JAMI                                200 ms  100%      ✅ MAQSAD
     Server ichida (1 va 10 siz)         147 ms
```

**⚠️ Byudjet buzilishi — nima qilinadi:**

| Bosqich | Byudjetdan oshsa | Chora |
|---|---|---|
| 3. Middleware > 20 ms | Redis sekin | Redis pipeline, local LRU (10 s) |
| 6. Validatsiya > 50 ms | N+1 query | `select_related`/`prefetch_related` tekshirish |
| 7. Tranzaksiya > 110 ms | Lock kutish yoki fsync | `commit_delay`, indeks kamaytirish |
| 8. on_commit > 20 ms | WS group_send bloklaydi | Async task'ga o'tkazish |

### 6.3 Vaqt taqsimoti — `GET /v1/menu/` (p95 = 20 ms, kesh hit)

```
  1. Tarmoq                              8 ms   40%
  2. nginx                               2 ms   10%
  3. Middleware (session+tenant)         5 ms   25%   ⚡ 2 Redis GET
  4. Kesh o'qish (Redis GET, 250 KB)     3 ms   15%
  5. Javob (JSON allaqachon tayyor)      2 ms   10%   ⚡ serializatsiya YO'Q
  ────────────────────────────────────────────────────
  JAMI                                  20 ms  100%  ✅

⚡ MUHIM: keshda TAYYOR JSON STRING saqlanadi (dict emas).
   → json.dumps() qadamini tejaydi: 250 KB uchun ~9 ms
   → HttpResponse(cached_str, content_type='application/json')
```

```python
# apps/menu/views.py
class MenuView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, slug):
        lang = get_lang(request)
        rest = get_restaurant(slug)                      # kesh, 2 ms
        version = rest['menu_version']

        # ETag — 304 qaytarsa 250 KB tarmoq tejaladi
        etag = f'"v{version}-{lang}"'
        if request.headers.get('If-None-Match') == etag:
            return HttpResponseNotModified()             # ⚡ 4 ms, 0 bayt

        key = f"menu:rest:{slug}:{lang}:v{version}"
        raw = cache.get(key)                             # STRING, dict emas
        if raw is None:
            raw = json.dumps(build_menu(slug, lang), ensure_ascii=False)
            cache.set(key, raw, 60)

        resp = HttpResponse(raw, content_type='application/json')
        resp['ETag'] = etag
        resp['Cache-Control'] = 'public, max-age=60'
        return resp
```

### 6.4 Frontend byudjeti (mijoz tomoni)

| Ko'rsatkich | 🎯 Maqsad | 🔴 Chegara | O'lchash |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 1,8 s | 2,5 s | RUM (web-vitals) |
| **FID / INP** | < 100 ms | 200 ms | RUM |
| **CLS** | < 0,05 | 0,1 | RUM |
| **TTFB** | < 200 ms | 500 ms | RUM |
| JS bundle (gzip) | < 60 KB | 100 KB | CI (bundlesize) |
| CSS (gzip) | < 20 KB | 35 KB | CI |
| Birinchi menyu rasm | < 45 KB | 80 KB | Build |
| **3D model (GLB)** | < 2,5 MB | 4 MB | Upload validatsiya |
| 3D birinchi kadr | < 3 s (4G) | 5 s | Sinov |

---

## 7. OPTIMIZATSIYA TEXNIKALARI

### 7.1 N+1 muammosi — eng ko'p uchraydigan xato

```python
# ❌ N+1: 60 taom → 61 DB so'rov (1 + 60)
dishes = Dish.objects.filter(restaurant_id=rid)
for d in dishes:
    print(d.category.name_uz)         # ← har iteratsiyada DB so'rov!
# Vaqt: 61 × 1,2 ms = 73 ms

# ✅ select_related (FK / OneToOne — JOIN)
dishes = Dish.objects.filter(restaurant_id=rid).select_related('category')
# 1 so'rov (LEFT JOIN), 4 ms  ⚡ 18× tez

# ✅ prefetch_related (M2M / reverse FK — 2-chi so'rov)
dishes = (Dish.objects
          .filter(restaurant_id=rid)
          .select_related('category')
          .prefetch_related('modifiers'))
# 2 so'rov: dish+category (JOIN), modifiers (IN), 7 ms

# ✅ Prefetch bilan filtr + faqat kerakli maydonlar
from django.db.models import Prefetch
dishes = Dish.objects.filter(restaurant_id=rid).prefetch_related(
    Prefetch('modifiers',
             queryset=DishModifier.objects.filter(is_active=True)
                                          .only('id','name_uz','price_delta','group')
                                          .order_by('group','id'),
             to_attr='faol_modifikatorlar')
)
```

**N+1 ni CI'da tutish:**

```python
# tests/test_query_count.py
from django.test.utils import CaptureQueriesContext

def test_menyu_sorov_soni_chegarasi(client, restoran_60_taom):
    with CaptureQueriesContext(connection) as ctx:
        client.get(f'/v1/menu/{restoran_60_taom.slug}/?nocache=1')
    # 🔴 QAT'IY: menyu qurish 6 ta so'rovdan oshmasin
    assert len(ctx) <= 6, f"N+1! {len(ctx)} so'rov:\n" + \
        "\n".join(q['sql'][:120] for q in ctx.captured_queries)
```

### 7.2 `only` / `defer` — ustun tanlash

```python
# ❌ Barcha ustun (desc_uz/ru/en, ingredients — har biri 2-4 KB)
Dish.objects.filter(restaurant_id=rid)
# Tarmoq: 60 × 2,5 KB = 150 KB DB'dan

# ✅ Faqat ro'yxat uchun kerakli ustunlar
Dish.objects.filter(restaurant_id=rid).only(
    'id','category_id','name_uz','price','image','has_3d','is_available','order')
# Tarmoq: 60 × 280 B = 17 KB  ⚡ 9× kam

# ✅ INDEX-ONLY SCAN (jadvalga umuman murojaat qilinmaydi)
#    Indeks: (restaurant_id, is_available, "order") INCLUDE (category_id, price, has_3d)
Dish.objects.filter(restaurant_id=rid, is_available=True) \
            .only('id','category_id','price','has_3d').order_by('order')
# EXPLAIN: Index Only Scan ... Heap Fetches: 0  ⚡ 3× tez

# ⚠️ TUZOQ: only() da yo'q maydonga murojaat → QO'SHIMCHA so'rov (N+1!)
d = Dish.objects.only('id','name_uz').first()
print(d.price)          # ← 🔴 yangi DB so'rov!
```

### 7.3 `bulk_create` / `bulk_update`

```python
# ❌ 3,5 ta alohida INSERT + 3,5 fsync
for item in items:
    OrderItem.objects.create(order=order, **item)
# 3,5 × 14 ms = 49 ms

# ✅ 1 ta multi-row INSERT + 1 fsync
OrderItem.objects.bulk_create([OrderItem(order=order, **i) for i in items])
# 21 ms  ⚡ 2,3× tez

# ✅ Katta import (Excel'dan 5 000 taom)
Dish.objects.bulk_create(objs, batch_size=500, ignore_conflicts=False)
# batch_size=500: 1 so'rov 500 qator → 10 so'rov
# ⚠️ Nega 500: PostgreSQL parametr limiti 65 535
#    500 qator × 25 ustun = 12 500 parametr ✅ (xavfsiz)
#    2000 qator × 25 = 50 000 — chegaraga yaqin 🟡

# ✅ Ommaviy yangilash
Dish.objects.bulk_update(dishes, ['is_available','updated_at'], batch_size=500)

# ⚠️ ESLATMA: bulk_* SIGNAL CHAQIRMAYDI
#    → menu_version qo'lda bump qilinadi (03_MALUMOT §8.3)
```

### 7.4 `iterator` — xotira

```python
# ❌ 133 000 taom RAM'da: 133 000 × 2,5 KB = 332 MB  🔴 OOM
for d in Dish.objects.all():
    process(d)

# ✅ Server-side cursor, 500 talab chunk
for d in Dish.objects.all().iterator(chunk_size=500):
    process(d)
# RAM: 500 × 2,5 KB = 1,25 MB  ⚡ 265× kam

# ⚠️ iterator() + prefetch_related — PG'da chunk_size bilan ishlaydi (Django 4.1+)
for d in Dish.objects.prefetch_related('modifiers').iterator(chunk_size=200):
    ...

# ⚠️ QAT'IY: iterator() natijasini list() qilmang — butun ma'no yo'qoladi
```

### 7.5 Index-only scan tekshiruvi

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, category_id, price, has_3d FROM menu_dish
WHERE restaurant_id = 42 AND is_available = true ORDER BY "order";

-- ✅ IDEAL:
--  Index Only Scan using idx_dish_menu on menu_dish
--    Index Cond: (restaurant_id = 42 AND is_available = true)
--    Heap Fetches: 0                    ← ⚡ jadvalga MUROJAAT YO'Q
--    Buffers: shared hit=4
--    Execution Time: 0.148 ms

-- 🟡 Heap Fetches > 0 bo'lsa → visibility map eskirgan:
VACUUM ANALYZE menu_dish;

-- ❌ "Seq Scan" ko'rinsa → indeks ishlatilmayapti:
--    sabab 1: statistika eskirgan → ANALYZE menu_dish;
--    sabab 2: jadval kichik (< 1000 qator) → planner to'g'ri qaror qilgan
--    sabab 3: ustun tartibi noto'g'ri → 03_MALUMOT §4.2
```

### 7.6 Connection pooling (PgBouncer)

```
MUAMMO:
  40 web instans × 8 worker × 4 thread = 1 280 potensial ulanish
  PostgreSQL max_connections = 200 (har ulanish ~10 MB RAM + backend process)
  1 280 > 200  →  🔴 "FATAL: sorry, too many clients already"

  ⚠️ max_connections=1500 qilish YECHIM EMAS:
     1 500 × 10 MB = 15 GB RAM faqat ulanishlarga
     + kontekst almashish, lock contention → TPS 40% tushadi

✅ PGBOUNCER (transaction pooling):
  ┌──────────────┐         ┌───────────┐        ┌──────────┐
  │ 40 web       │ 1 280   │ PgBouncer │  200   │ Postgres │
  │ instans      │────────▶│ txn mode  │───────▶│          │
  └──────────────┘ mijoz   └───────────┘ server └──────────┘
                   ulanish              ulanish

  ⚡ Transaction mode: ulanish faqat TRANZAKSIYA davomida band.
     Buyurtma tranzaksiyasi 72 ms → 1 server ulanish 1 s da 13 ta so'rovga xizmat qiladi
     → 200 ulanish × 13 = 2 600 TPS ✅
```

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
armenu_db = host=pg-primary port=5432 dbname=armenu_db pool_size=200
armenu_ro = host=pg-replica port=5432 dbname=armenu_db pool_size=150

[pgbouncer]
pool_mode = transaction          ; ⚡ session EMAS
max_client_conn = 3000
default_pool_size = 200
reserve_pool_size = 50           ; pik uchun zaxira
reserve_pool_timeout = 3
server_idle_timeout = 300
query_wait_timeout = 10          ; 🔴 10 s kutgan mijoz xato oladi (osilmaydi)
```

```python
# config/settings.py — transaction mode bilan MAJBURIY sozlamalar
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'armenu_db',
        'HOST': '127.0.0.1', 'PORT': 6432,     # ⚡ PgBouncer
        'CONN_MAX_AGE': 0,                      # 🔴 0 SHART! PgBouncer o'zi pool qiladi
        'DISABLE_SERVER_SIDE_CURSORS': True,    # 🔴 transaction mode'da kerak
        'OPTIONS': {'connect_timeout': 5},
    },
    'replica': { ... 'PORT': 6433, ... },
}

# ⚠️ CONN_MAX_AGE > 0 bo'lsa: Django ulanishni ushlab turadi
#    → PgBouncer pooling foydasi YO'QOLADI (session mode kabi bo'lib qoladi)
# ⚠️ DISABLE_SERVER_SIDE_CURSORS=False bo'lsa: iterator() buziladi
#    (cursor tranzaksiyalar orasida yashamaydi)
```

**DB router (o'qish → replica):**

```python
# config/db_router.py
class ReadReplicaRouter:
    """SELECT → replica, INSERT/UPDATE/DELETE → primary."""

    def db_for_read(self, model, **hints):
        # ⚡ read-your-writes: yozuvdan keyingi 3 soniya primary'dan o'qiladi
        if getattr(_local, 'recently_wrote', 0) > time.time() - 3:
            return 'default'
        # 🔴 Moliyaviy modellar doim primary (lag qabul qilinmaydi)
        if model._meta.app_label in ('payments', 'fiscal', 'billing'):
            return 'default'
        return 'replica'

    def db_for_write(self, model, **hints):
        _local.recently_wrote = time.time()
        return 'default'

    def allow_relation(self, o1, o2, **h):
        return True

    def allow_migrate(self, db, app_label, **h):
        return db == 'default'          # migratsiya faqat primary'da
```

### 7.7 Optimizatsiya xulosasi

| Texnika | Qachon | Foyda | Xavf |
|---|---|---|---|
| `select_related` | FK / OneToOne | 5-20× | JOIN kengayishi (ko'p FK) |
| `prefetch_related` | reverse FK / M2M | 10-60× | Xotira (katta to'plamda) |
| `only` / `defer` | Katta TextField bor | 3-9× tarmoq | `only`da yo'q maydon → N+1 |
| `bulk_create` | > 3 obyekt | 2-15× | Signal chaqirilmaydi |
| `iterator` | > 5 000 qator | RAM 100× | `len()`, indeks ishlamaydi |
| `values_list` | Faqat ID kerak | 4× | Model metodlari yo'q |
| Index-only scan | Issiq so'rov | 3× | INCLUDE indeks hajmi ↑ |
| PgBouncer | > 10 web instans | Ulanish 6× | `CONN_MAX_AGE=0` SHART |
| Redis kesh | Har o'qish | 10-50× | Invalidation murakkabligi |
| `bulk_update` | > 5 obyekt yangilash | 5× | Signal yo'q |
| ETag / 304 | Katta JSON | Tarmoq 100% | Versiya boshqaruvi |

---

## 8. YUKLAMA TESTI (k6)

### 8.1 Ssenariylar

| # | Ssenariy | Maqsad | Davomiylik | VU (virtual user) |
|---|---|---|---|---|
| **T1** | Smoke | Deploy ishlayaptimi | 1 daq | 5 |
| **T2** | Menyu ko'rish (asosiy) | Kesh + CDN samarasi | 15 daq | 0 → 2 000 |
| **T3** | Buyurtma oqimi | DB write sig'imi | 20 daq | 0 → 500 |
| **T4** | WebSocket | Daphne sig'imi | 30 daq | 0 → 50 000 |
| **T5** | Spike (bayram) | Keskin 10× o'sish | 10 daq | 100 → 5 000 → 100 |
| **T6** | Soak (chidamlilik) | Memory leak, lag | 4 soat | 500 barqaror |
| **T7** | Stress (chegara) | Nima buziladi | 30 daq | 0 → 15 000 |
| **T8** | 3D fayl | CDN + origin | 10 daq | 0 → 1 000 |

### 8.2 T2 — Menyu ko'rish

```javascript
// tests/load/t2_menyu.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const cacheHit = new Rate('kesh_hit');
const menuTime = new Trend('menyu_vaqti');

export const options = {
  stages: [
    { duration: '2m',  target: 200  },   // isitish
    { duration: '5m',  target: 1000 },   // normal
    { duration: '5m',  target: 2000 },   // pik
    { duration: '3m',  target: 0    },   // tushirish
  ],
  thresholds: {
    'http_req_duration{name:menu}': ['p(95)<200', 'p(99)<500'],
    'http_req_failed':              ['rate<0.001'],   // 🔴 0,1% dan kam
    'kesh_hit':                     ['rate>0.90'],    // 🎯 90%
  },
};

const SLUGS = ['registon','samarqand-osh','navruz','oq-saroy','choyxona-1'];

export default function () {
  const slug = SLUGS[Math.floor(Math.random() * SLUGS.length)];
  const lang = ['uz','ru','en'][Math.floor(Math.random() * 3)];

  // 1. QR skanerlash
  const qr = http.get(`${__ENV.BASE}/t/${__ENV.QR_TOKEN}`,
                      { tags: { name: 'qr' }, redirects: 0 });
  check(qr, { 'QR 302': r => r.status === 302 });

  // 2. Menyu
  const m = http.get(`${__ENV.BASE}/v1/menu/${slug}/?lang=${lang}`,
                     { tags: { name: 'menu' } });
  check(m, {
    'menyu 200':        r => r.status === 200,
    'taomlar bor':      r => JSON.parse(r.body).dishes.length > 0,
    'p95 < 200ms':      r => r.timings.duration < 200,
  });
  cacheHit.add(m.headers['X-Cache'] === 'HIT');
  menuTime.add(m.timings.duration);

  sleep(Math.random() * 4 + 2);          // mehmon o'qiydi 2-6 s

  // 3. Taom detali (3 ta)
  const dishes = JSON.parse(m.body).dishes;
  for (let i = 0; i < 3; i++) {
    const d = dishes[Math.floor(Math.random() * dishes.length)];
    http.get(`${__ENV.BASE}/v1/dish/${d.id}/?lang=${lang}`,
             { tags: { name: 'dish' } });
    if (d.has_3d) {
      http.get(`${__ENV.BASE}/v1/ar/${d.id}/`, { tags: { name: 'ar' } });
    }
    sleep(Math.random() * 3 + 1);
  }
}
```

### 8.3 T3 — Buyurtma oqimi (eng kritik)

```javascript
// tests/load/t3_buyurtma.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const dublikat = new Counter('dublikat_buyurtma');

export const options = {
  stages: [
    { duration: '3m',  target: 100 },
    { duration: '10m', target: 500 },   // 500 VU ≈ 1 250 RPS
    { duration: '5m',  target: 0   },
  ],
  thresholds: {
    'http_req_duration{name:order}': ['p(95)<200', 'p(99)<400'],
    'http_req_failed{name:order}':   ['rate<0.0001'],  // 🔴 0,01% (moliyaviy!)
    'dublikat_buyurtma':             ['count==0'],     // 🔴 MUTLAQ 0
  },
};

export default function () {
  const idem = uuidv4();
  const payload = JSON.stringify({
    session_id: `gs_${__VU}_${__ITER}`,
    table_id: (__VU % 25) + 1,
    items: [
      { dish_id: 15, qty: 2, modifiers: [3], note: '', ar_viewed: true },
      { dish_id: 42, qty: 1, modifiers: [],  note: '', ar_viewed: false },
    ],
    note: 'k6 yuklama testi',
  });
  const params = {
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idem },
    tags: { name: 'order' },
  };

  const r1 = http.post(`${__ENV.BASE}/v1/orders/`, payload, params);
  check(r1, {
    'buyurtma 201':      r => r.status === 201,
    'narx serverdan':    r => JSON.parse(r.body).total > 0,
    'p95 < 200ms':       r => r.timings.duration < 200,
  });

  // ⚡ IDEMPOTENCY TEKSHIRUVI — o'sha kalit bilan qayta yuborish
  const r2 = http.post(`${__ENV.BASE}/v1/orders/`, payload, params);
  if (r1.status === 201 && r2.status === 201) {
    const id1 = JSON.parse(r1.body).id, id2 = JSON.parse(r2.body).id;
    if (id1 !== id2) {
      dublikat.add(1);          // 🔴 KRITIK XATO
      console.error(`DUBLIKAT! ${id1} != ${id2}`);
    }
  }
}
```

### 8.4 T4 — WebSocket

```javascript
// tests/load/t4_ws.js
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const wsDelay = new Trend('ws_yetkazish_ms');

export const options = {
  stages: [
    { duration: '5m',  target: 10000 },
    { duration: '10m', target: 50000 },   // 50k ulanish
    { duration: '10m', target: 50000 },   // ushlab turish
    { duration: '5m',  target: 0     },
  ],
  thresholds: {
    'ws_connecting':      ['p(95)<1000'],
    'ws_session_duration':['p(95)>250000'],   // uzilmasin
    'ws_yetkazish_ms':    ['p(95)<100'],      // 🎯 xabar 100 ms
  },
};

export default function () {
  const url = `${__ENV.WS_BASE}/ws/guest/gs_${__VU}_${__ITER}/`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open',    () => socket.send(JSON.stringify({type:'ping'})));
    socket.on('message', (msg) => {
      const d = JSON.parse(msg);
      if (d.server_ts) wsDelay.add(Date.now() - d.server_ts);
    });
    socket.on('error', (e) => console.error('WS xato:', e.error()));
    socket.setTimeout(() => socket.close(), 300000);   // 5 daqiqa ushlab tur
  });
  check(res, { 'WS 101': r => r && r.status === 101 });
}
```

### 8.5 Chegara qiymatlar (thresholds) — hammasi

| Metrika | 🟢 O'tdi | 🟡 Ogohlantirish | 🔴 Yiqildi |
|---|---|---|---|
| `http_req_duration` p95 (menyu) | < 200 ms | 200-400 ms | > 400 ms |
| `http_req_duration` p95 (buyurtma) | < 200 ms | 200-350 ms | > 350 ms |
| `http_req_duration` p99 (barcha) | < 500 ms | 500 ms-1 s | > 1 s |
| `http_req_failed` (o'qish) | < 0,1% | 0,1-0,5% | > 0,5% |
| `http_req_failed` (buyurtma) | < 0,01% | 0,01-0,05% | > 0,05% 🔴 |
| `dublikat_buyurtma` | **0** | — | ≥ 1 🔴🔴 |
| `kesh_hit` (menyu) | > 90% | 80-90% | < 80% |
| `ws_yetkazish_ms` p95 | < 100 ms | 100-300 ms | > 300 ms |
| CPU (web) pikda | < 70% | 70-85% | > 85% |
| PG replication lag | < 2 s | 2-10 s | > 10 s |
| PG buffer hit | > 99% | 97-99% | < 97% |
| Xotira o'sishi (4 soatda) | < 5% | 5-15% | > 15% (leak) 🔴 |

### 8.6 Qachon o'tkaziladi

| Test | Qachon | Muhit | Kim |
|---|---|---|---|
| **T1** Smoke | Har deploy'dan keyin (CI) | prod | avtomatik |
| **T2** Menyu | Har hafta (juma 02:00) | staging | avtomatik (cron) |
| **T3** Buyurtma | Har release (haftada 1) | staging | avtomatik |
| **T4** WS | Oyda 1 | staging | qo'lda |
| **T5** Spike | Bayram oldidan (Navro'z, YN) | staging | qo'lda |
| **T6** Soak | Oyda 1 (kechasi) | staging | avtomatik |
| **T7** Stress | Choraklik / arxitektura o'zgarganda | izolyatsiya | qo'lda |
| **T8** 3D | CDN sozlamasi o'zgarganda | staging | qo'lda |

```yaml
# .github/workflows/load-test.yml
name: Yuklama testi
on:
  schedule: [{ cron: '0 21 * * 5' }]      # juma 02:00 (UTC+5)
  workflow_dispatch:
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/load/t2_menyu.js --out json=t2.json
        env: { BASE: 'https://staging.armenu.uz', QR_TOKEN: '${{ secrets.QR }}' }
      - run: k6 run tests/load/t3_buyurtma.js --out json=t3.json
        env: { BASE: 'https://staging.armenu.uz' }
      - name: Natijani Telegram'ga
        if: always()
        run: python scripts/load_report.py t2.json t3.json
```

**⚠️ Yuklama testi qoidalari:**

```
🔴 QAT'IY: prod'da faqat T1 (smoke, 5 VU).
   T2-T8 — faqat staging (prod bilan bir xil konfiguratsiya, 1/4 hajm).

🔴 Staging natijasini prod'ga ko'chirish: × (prod_node / staging_node)
   Masalan staging 1 web instans 300 RPS ko'tardi → prod 40 instans = 12 000 RPS

🔴 Test ma'lumoti alohida tenant'da (restaurant_id >= 900000).
   Haqiqiy restoran ma'lumotiga TEGILMAYDI.

🔴 To'lov/fiskal — sandbox rejimida (haqiqiy pul YO'Q).
```

---

## 9. MASSHTABLASH CHEKLOVLARI

> **Nima masshtablanmaydi va nega.** Bularni bilish — arxitektura yetukligi belgisi.

### 9.1 Cheklovlar jadvali

| # | Nima | Chegara | Nega masshtablanmaydi | Yumshatish | Qoladigan risk |
|---|---|---|---|---|---|
| **C1** | **3D generatsiya (GPU)** | ~50 model/kun/GPU | Photogrammetry 8-20 daq GPU vaqti; GPU qimmat va cheklangan | ⭐ Kutubxona (85% taom undan), navbat, tashqi provayder (Meshy/Luma/Tripo) | Yangi taom 3D uchun 1-3 kun kutish |
| **C2** | **OFD API (soliq)** | ~100 chek/daq/restoran | Davlat tizimi, biz nazorat qilmaymiz | Navbat + backoff, 2 provayder (UZKASSA/ePOS), offline buffer 24 soat | Pik payt chek kechikishi |
| **C3** | **AI provayder rate limit** | Claude 4k RPM, GPT 10k RPM | Provayder kvotasi | 8 provayder fallback zanjiri, javob keshi (24 s), rate limit har tenant | Tarjima/chat kechikishi |
| **C4** | **To'lov provayderi** | Payme ~500 TPS | Tashqi tizim | 3 provayder (Payme/Click/Uzum), navbat, retry | Pik payt to'lov kechikishi |
| **C5** | **Telegram Bot API** | 30 xabar/s (bot), 20/daq (guruh) | Telegram cheklovi | Batch, navbat, prioritet (buyurtma > marketing) | Marketing xabari kechikadi |
| **C6** | **PostgreSQL yozish** | ~3 000 TPS/primary | Bitta primary — WAL ketma-ket yoziladi | Sharding (Citus), event PG'dan chiqarish | Sharding = 4 hafta ish |
| **C7** | **Redis bitta node** | ~100 000 ops/s | Bir oqimli (single-threaded) | Cluster (hash slot), o'qish replikasi | Cross-slot operatsiya yo'q |
| **C8** | **Daphne WS** | ~50 000/instans | Python GIL + epoll | Gorizontal (3 instans), WS ni minimallashtirish | Sticky session kerak |
| **C9** | **Cloudflare purge** | 1 000 URL/kun (Pro) | Provayder kvotasi | ⚡ Versiyalangan URL (purge kerak emas) | Logotip o'zgarishida sekin |
| **C10** | **S3 prefiks** | 3 500 PUT/s, 5 500 GET/s prefiks | AWS S3 arxitekturasi | Prefiks tarqatish (`r/{id}/` — tabiiy tarqoq) | — |
| **C11** | **Tranzaksiya izolyatsiyasi** | Bitta stol = ketma-ket | `SELECT FOR UPDATE` — mantiqiy zarurat | Lock qisqa (72 ms) | Bir stolga 14 buyurtma/s maks |
| **C12** | **Kunlik raqam** | Restoran ichida ketma-ket | Advisory lock | Restoranlar parallel | 1 restoran ~90 buyurtma/s maks |
| **C13** | **3D fayl hajmi** | 4 MB GLB, 4G da 8-15 s | Mobil tarmoq tezligi | Draco siqish, LOD, progressive, poster darhol | Sekin tarmoqda AR kutish |
| **C14** | **iOS WebXR** | Yo'q | Apple qo'llab-quvvatlamaydi | AR Quick Look (USDZ) | Funksiya farqi (iOS/Android) |
| **C15** | **Multi-region yozish** | Bitta primary region | CAP teoremasi — kuchli izchillik tanlangan | O'qish har regionda (replica) | Uzoq regionda yozish +100 ms |

### 9.2 C1 — 3D generatsiya (batafsil)

```
MUAMMO:
  Photogrammetry (20-40 rasm → 3D model):
    GPU (RTX 4090): 12-20 daqiqa/model
    1 GPU × 24 soat / 16 daq = 90 model/kun (nazariy)
    Amalda (xato, retry, navbat): ~50 model/kun

  Talab: 1 000 restoran × 60 taom × 35% (3D bo'ladigan)
       = 21 000 model
       = 21 000 / 50 = 420 kun (1,2 yil!)  🔴

✅ YECHIM ZANJIRI:

  1. ⭐ KUTUBXONA (asosiy yechim)
     Taomlarning 85%i — standart o'zbek/rus/yevropa taomlari
     → osh, manti, somsa, lag'mon, shashlik, salat, choy...
     500 ta model butun bozorni qoplaydi

     21 000 × 0,85 = 17 850 → kutubxonadan (0 GPU vaqti, darhol) ✅
     21 000 × 0,15 =  3 150 → generatsiya kerak

  2. TASHQI PROVAYDER (pik uchun)
     Meshy.ai / Luma / Tripo — $0,20-2,00/model, parallel
     3 150 × $0,50 = $1 575 (bir martalik)
     Vaqt: 2 hafta (parallel API)

  3. O'Z GPU (uzoq muddat, arzon)
     RTX 4090 node $500/oy → 50 model/kun → 1 500/oy
     Break-even: 1 500 × $0,50 = $750 vs $500 → 2-oyda foydali

  4. NAVBAT + PRIORITET
     PRO tarif → prioritet 1 (24 soat SLA)
     FREE tarif → prioritet 5 (7 kun SLA yoki faqat kutubxona)

╔═══════════════════════════════════════════════════════════════╗
║  Natija: 420 kun → 14 kun (30× tezlashuv)                     ║
║  Asosiy hissa: KUTUBXONA (85%)                                ║
╚═══════════════════════════════════════════════════════════════╝
```

### 9.3 C3 — AI provayder rate limit

```python
# apps/ai/router.py
"""
8 provayderli fallback zanjiri.
⚡ Har biri o'z rate limit'i bilan; biri tugasa keyingisiga o'tadi.
"""
PROVAYDERLAR = [
    # (nom,          RPM,   $/1M token,  vazifa)
    ('claude-haiku',  4000,   0.80,  ['chat','translate']),
    ('gpt-4o-mini',  10000,   0.15,  ['chat','translate']),
    ('gemini-flash',  2000,   0.075, ['chat','translate','vision']),
    ('deepseek',      1000,   0.14,  ['chat','translate']),
    ('groq-llama',   30000,   0.05,  ['chat']),
    ('mistral',       1000,   0.20,  ['translate']),
    ('cohere',        1000,   0.15,  ['translate']),
    ('yandex-gpt',     500,   0.30,  ['translate']),   # ru uchun yaxshi
]

def ai_call(vazifa: str, prompt: str, lang: str = 'uz') -> str:
    # 1. Kesh (24 soat) — 60% so'rov shu yerda tugaydi
    key = f"ai:{vazifa}:{hashlib.sha256((prompt+lang).encode()).hexdigest()}"
    if (cached := cache.get(key)) is not None:
        metrics.inc('ai.cache.hit')
        return cached

    # 2. Zanjir bo'ylab
    for nom, rpm, narx, vazifalar in PROVAYDERLAR:
        if vazifa not in vazifalar:
            continue
        if not rate_limiter.allow(nom, rpm):        # Redis token bucket
            continue
        if circuit_breaker.is_open(nom):            # yiqilgan provayder
            continue
        try:
            javob = call_provider(nom, prompt, timeout=15)
            cache.set(key, javob, 86400)
            AIUsage.log(nom, prompt, javob, narx)
            return javob
        except (RateLimitError, TimeoutError, APIError) as e:
            circuit_breaker.record_failure(nom)
            log.warning("ai_fallback", provayder=nom, xato=str(e))
            continue

    # 3. Hamma yiqildi → graceful degradation
    metrics.inc('ai.all_failed')
    if vazifa == 'translate':
        return prompt                    # tarjimasiz asl matn
    raise AIUnavailable("Barcha AI provayderlar band. Keyinroq urinib ko'ring.")
```

```
SIG'IM HISOBI:
  Jami RPM = 4000+10000+2000+1000+30000+1000+1000+500 = 49 500 RPM = 825 RPS
  Kesh hit 60% → effektiv sig'im = 825 / 0,4 = 2 062 RPS ✅

  S5 da AI so'rov: 25 000 × 2% = 500 RPS  →  ✅ SIG'ADI (4× headroom)
```

### 9.4 Nima MASSHTABLANADI (ijobiy ro'yxat)

| Komponent | Qanday | Chegara |
|---|---|---|
| **Web (gunicorn)** | ✅ Gorizontal, cheksiz (stateless) | LB sig'imi (30k RPS/node) |
| **Worker** | ✅ Gorizontal, navbat bo'yicha mustaqil | Navbat backend (Redis) |
| **CDN** | ✅ Cheksiz (Cloudflare anycast) | Byudjet |
| **PG o'qish** | ✅ Replica qo'shish (5 gacha) | Replikatsiya lag |
| **PG yozish** | 🟡 Sharding bilan (murakkab) | 4-8 shard amaliy |
| **Redis** | ✅ Cluster (16 384 slot) | Cross-slot operatsiya |
| **S3** | ✅ Cheksiz | Byudjet |
| **ClickHouse** | ✅ Shard + replica | — |
| **WS** | 🟡 Gorizontal + sticky session | Ulanish soni (optimizatsiya bilan) |

---

## 10. XULOSA — MASSHTABLASH KARTASI

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    1 MLN BIR VAQTDA — YAKUNIY HISOB                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  KIRISH:   1 000 000 bir vaqtda faol foydalanuvchi                        ║
║            → 25 000 RPS (40 s da 1 harakat)                               ║
║                                                                           ║
║  FILTRLASH:                                                               ║
║    Brauzer kesh  45%  ushlaydi  →  13 750 RPS qoladi                      ║
║    CDN           75%  ushlaydi  →   3 437 RPS qoladi                      ║
║    nginx         12%  ushlaydi  →   3 025 RPS qoladi                      ║
║    Redis         90%  ushlaydi  →   1 427 RPS DB'ga                       ║
║    ⚡ 94,3% yuklama DB'ga umuman kelmaydi                                  ║
║                                                                           ║
║  WEBSOCKET:                                                               ║
║    Naiv:      1 000 000 ulanish → 32 GB RAM → 20 instans → $1 600         ║
║    ⚡ Optimal:    90 000 ulanish → 2,9 GB   →  3 instans → $  240         ║
║    Sabab: mijozga WS FAQAT buyurtmadan keyin (5%) + xodim (40k)           ║
║                                                                           ║
║  DB YOZISH:                                                               ║
║    Xom:  9 875 write/s  →  🔴 sig'im 3 000 TPS dan 3,3× oshiq             ║
║    Y1 event→ClickHouse, Y2 audit batch, Y3 fiskal async,                  ║
║    Y4 bulk_create, Y5 partition, Y6 commit_delay                          ║
║    ⚡ Natija: ~3 000 TPS kerak, 3 750 TPS sig'im  →  ✅                    ║
║                                                                           ║
║  INFRA:  64 node  ·  $4 400/oy  ·  daromadning 1,89%                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 10.1 10 ta qat'iy masshtablash qoidasi

| # | Qoida | Buzilsa |
|---|---|---|
| 1 | **Har issiq yo'l keshlanadi** (menyu, taom, restoran) | 🔴 DB 10× yuklanadi |
| 2 | **Mijozga WS faqat buyurtmadan keyin** | 🔴 20 instans o'rniga 3 |
| 3 | **Event PostgreSQL'ga yozilmaydi** (ClickHouse) | 🔴 write TPS 4× oshadi |
| 4 | **Uzoq ish (> 2 s) → worker navbat** | 🔴 Web bloklanadi, timeout |
| 5 | **Web instans stateless** (locmem/lokal disk/thread ⛔) | 🔴 Auto-scaling buziladi |
| 6 | **N+1 CI'da bloklanadi** (query count testi) | 🟡 Sekin, 20× |
| 7 | **`bulk_create` / `iterator` — 3+ obyektda** | 🟡 TPS va RAM |
| 8 | **PgBouncer transaction mode + `CONN_MAX_AGE=0`** | 🔴 too many clients |
| 9 | **`SELECT FOR UPDATE` ichida tashqi API ⛔** | 🔴 Kaskadli sekinlashuv |
| 10 | **Har release'da T3 (buyurtma) yuklama testi** | 🔴 Regressiya prod'da topiladi |

### 10.2 Masshtablash yo'l xaritasi

| Qachon | Nima qilinadi | Kim | Vaqt |
|---|---|---|---|
| 20 restoran | DB'ni alohida VPS'ga | DevOps | 1 kun |
| 100 restoran | 2-chi web instans + LB | DevOps | 1 kun |
| 200 restoran | Read replica + DB router | Backend | 3 kun |
| 400 restoran | PgBouncer + Redis Sentinel | DevOps | 2 kun |
| 500 restoran | ⚡ **Partition** (orders, arview) | Backend | 1 hafta |
| 800 restoran | ClickHouse + event pipeline | Backend | 2 hafta |
| 1 500 restoran | Auto-scaling (web + worker) | DevOps | 1 hafta |
| 2 500 restoran | Redis Cluster · 3-chi replica | DevOps | 3 kun |
| 3 500 restoran | ⚡ Sharding **tayyorgarligi** (denorm, CI) | Backend | 6 hafta |
| 5 000 restoran | ⚡ **Citus sharding** (4 shard) | Backend+DevOps | 4 hafta |
| 8 000 restoran | Multi-region (UZ + KZ) | Arxitektor | 8 hafta |

---

**➡️ Keyingi:** `05_ISHONCHLILIK.md`
