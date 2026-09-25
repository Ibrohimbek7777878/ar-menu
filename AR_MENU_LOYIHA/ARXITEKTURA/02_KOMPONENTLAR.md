# ARMENU — TIZIM ARXITEKTURASI
## QISM 2 — KOMPONENTLAR (C4 Level 2 va Level 3)

**Versiya:** 1.0 · **Sana:** 2026-09-04
**Kim uchun:** dasturchi · DevOps · tizim arxitektori · yangi jamoa a'zosi (onboarding)

> Bu hujjat **"nimadan tuzilgan"** degan savolga javob beradi.
> §1-2 — konteynerlar (C4 L2: process, servis, saqlagich).
> §3-7 — komponentlar (C4 L3: Django modullar, core qatlami, frontend, worker).
> Qarorlarning sabablari: `01_PRINTSIPLAR_VA_QARORLAR.md`.

---

## MUNDARIJA

| Bo'lim | Mazmuni |
|---|---|
| §1 | Konteyner diagrammasi (C4 L2) |
| §2 | Har konteyner kartochkasi (8 ta) |
| §3 | Django modullar — 13 app (C4 L3) |
| §4 | Modullar bog'liqlik grafi (siklsiz) |
| §5 | `core/` qatlami — har fayl |
| §6 | Frontend komponentlari (4 ta ilova) |
| §7 | Worker turlari (5 navbat) |
| §8 | Komponent ↔ ADR ↔ Faza matritsasi |

---

# §1. KONTEYNER DIAGRAMMASI (C4 — Level 2)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          FOYDALANUVCHI QURILMALARI                            ║
║   👤 Mijoz (PWA)   🧑‍🍳 Ofitsiant (PWA)   🍳 KDS (TV)   👨‍💼 Admin (Desktop)     ║
╚═════════════════════════════════┬═════════════════════════════════════════════╝
                                  │ HTTPS 443 / WSS 443
                  ┌───────────────▼────────────────┐
                  │  ☁️  CLOUDFLARE                 │  C1
                  │  CDN · WAF · DDoS · TLS         │
                  │  3D fayl, rasm, JS/CSS kesh     │
                  └───────────────┬────────────────┘
                                  │ origin pull
                  ┌───────────────▼────────────────┐
                  │  🔀 NGINX                       │  C2
                  │  reverse proxy · LB · TLS       │
                  │  proxy_cache (menyu API 30s)    │
                  │  :80 → :443                     │
                  └──┬──────────────────────────┬───┘
                     │ /v1/*, /t/*, /admin/*    │ /ws/*
        ┌────────────▼────────────┐  ┌──────────▼──────────────┐
        │  🐍 WEB (gunicorn)       │  │  ⚡ WS (daphne)          │  C3 / C4
        │  :8060  · STATELESS      │  │  :8061  · STATEFUL       │
        │  8 worker × 4 thread     │  │  ASGI · Channels         │
        │  Django 5 + DRF          │  │  ~50k ulanish/instans    │
        │  N instans (2→40)        │  │  M instans (1→3)         │
        └────────────┬─────────────┘  └──────────┬──────────────┘
                     │                            │
                     │      ┌─────────────────────┘
                     │      │
        ┌────────────▼──────▼──────────────────────────────────────────┐
        │                   MA'LUMOT QATLAMI                            │
        │                                                               │
        │  ┌──────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
        │  │ 🐘 PostgreSQL 16  │  │ 🔴 Redis 7      │  │ 📦 S3/MinIO │ │
        │  │ + pgvector        │  │ db=5 kesh/sess  │  │ 3D · rasm   │ │
        │  │ primary + replica │  │ db=6 channels   │  │ versioning  │ │
        │  │ + PgBouncer       │  │ + navbat + lock │  │             │ │
        │  │ :5432             │  │ :6379           │  │ :9000       │ │
        │  └──────────────────┘  └─────────────────┘  └─────────────┘ │
        │            C5                    C6                 C7       │
        └────────────┬──────────────────────┬───────────────────────────┘
                     │                      │ BLPOP queue:*
                     │      ┌───────────────▼──────────────────────────┐
                     │      │  ⚙️  WORKER (5 navbat)                    │  C8
                     │      │  armenu-worker@model3d   ×3              │
                     │      │  armenu-worker@fiscal    ×5              │
                     │      │  armenu-worker@notify    ×8              │
                     │      │  armenu-worker@ai        ×4              │
                     │      │  armenu-worker@analytics ×2              │
                     │      └───────────────┬──────────────────────────┘
                     │                      │
                     │      ┌───────────────▼──────────────────────────┐
                     │      │  🔧 HEALER (armenu-healer)               │  C9
                     │      │  15 self-healing mexanizm · 60s sikl     │
                     │      └──────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────────────┐
        │              📊 CLICKHOUSE (S2+)                               │  C10
        │              analitik event · TTL 730 kun                      │
        └────────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────────────────────────────────┐
        │              🌐 TASHQI XIZMATLAR (circuit breaker orqali)       │
        │  🤖 AI×8 · 💳 To'lov×3 · 🧾 Fiskal×2 · 📱 Telegram · 🗺 Google  │
        └────────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────────────────────────────────┐
        │              📈 KUZATUV                                         │
        │  Prometheus · Grafana · Loki · Sentry · Alertmanager→Telegram   │
        └────────────────────────────────────────────────────────────────┘
```

## 1.1 Konteynerlar ro'yxati

| ID | Konteyner | Texnologiya | Port | Holat | ADR |
|---|---|---|---|---|---|
| C1 | Cloudflare | CDN + WAF | 443 | 🟢 tashqi | — |
| C2 | nginx | nginx 1.24 | 80/443 | 🟢 stateless | 010 |
| C3 | web | gunicorn + Django 5 | 8060 | 🟢 stateless | 001, 010 |
| C4 | ws | daphne + Channels | 8061 | 🟡 stateful (ulanish) | 005 |
| C5 | db | PostgreSQL 16 + pgvector | 5432 | 🔴 stateful | 002 |
| C6 | redis | Redis 7 | 6379 | 🟡 stateful (qayta quriladi) | 008 |
| C7 | s3 | MinIO / S3 | 9000 | 🔴 stateful | 011 |
| C8 | worker | Python (run_worker) | — | 🟢 stateless | 008 |
| C9 | healer | Python (run_healer) | — | 🟢 stateless | — |
| C10 | clickhouse | ClickHouse (S2+) | 8123 | 🔴 stateful | 013 |

---

# §2. KONTEYNER KARTOCHKALARI

---

## C1 — ☁️ CLOUDFLARE (CDN + WAF)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Statik va 3D fayllarni edge'dan berish · DDoS himoya · WAF · TLS termination · bot filtri |
| **Texnologiya** | Cloudflare Pro/Business plan |
| **Portlar** | 443 (kirish), origin'ga 443 |
| **Resurs** | — (boshqariladigan xizmat) |
| **Masshtablash** | Avtomatik, cheksiz (Cloudflare tomonidan) |
| **Sog'liq tekshiruvi** | Cloudflare o'z health-check'i; bizning `/healthz` origin uchun |
| **Narx** | ~$20/oy (S0-S2) → ~$200/oy (S5) |

**Kesh siyosati:**

| Yo'l | TTL (edge) | TTL (brauzer) | Invalidatsiya |
|---|---|---|---|
| `/static/*` (hash bilan) | 1 yil | 1 yil | Fayl nomida hash |
| `/media/models/*.glb` | 30 kun | 7 kun | URL o'zgaradi (versiya) |
| `/media/models/*.usdz` | 30 kun | 7 kun | URL o'zgaradi |
| `/media/dishes/*.webp` | 30 kun | 7 kun | URL o'zgaradi |
| `/v1/menu/<slug>/` | 60s | 0 | `Cache-Tag: menu-<rid>` purge |
| `/v1/orders/*` | ⛔ NO CACHE | ⛔ | — |
| `/ws/*` | ⛔ bypass | ⛔ | — |

**⛔ Yiqilsa nima bo'ladi:**
🟡 **O'rta ta'sir.** Cloudflare "Always Online" bo'lmasa — trafik to'g'ridan origin'ga
(nginx) tushadi. 3D fayllar S3'dan beriladi (sekinroq, ~3× kechikish, bandwidth xarajati oshadi).
Menyu API nginx `proxy_cache` dan beriladi. DDoS himoyasi yo'qoladi — nginx rate limit qoladi.
**Tiklanish:** Cloudflare o'zi; DNS'ni "grey cloud"ga o'tkazish — 5 daqiqa (qo'lda).

---

## C2 — 🔀 NGINX (reverse proxy + load balancer)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | TLS termination · yuklamani taqsimlash · menyu API keshi · rate limit · statik fayl · WS upgrade |
| **Texnologiya** | nginx 1.24, `proxy_cache`, `limit_req_zone` |
| **Portlar** | 80 (→443 redirect), 443 |
| **Resurs** | 1 CPU / 512 MB (S0) → 4 CPU / 8 GB × 2 (S3) |
| **Masshtablash** | Gorizontal: 2+ instans + DNS round-robin yoki tashqi LB |
| **Sog'liq tekshiruvi** | `/healthz` upstream'da har 3s; `max_fails=2 fail_timeout=9s` |

**Konfiguratsiya (asosiy qismlar):**

```nginx
upstream armenu_web {
    least_conn;                          # ⚡ eng kam ulangan node'ga
    server 127.0.0.1:8060 max_fails=2 fail_timeout=9s;
    server 10.0.0.5:8060  max_fails=2 fail_timeout=9s;
    keepalive 64;
}

upstream armenu_ws {
    ip_hash;                             # ⚡ WS uchun sticky (ulanish saqlanadi)
    server 127.0.0.1:8061 max_fails=2 fail_timeout=9s;
}

proxy_cache_path /var/cache/nginx/menu levels=1:2
                 keys_zone=armenu_menu:50m max_size=2g inactive=10m;

limit_req_zone $binary_remote_addr zone=qr:10m    rate=60r/m;
limit_req_zone $binary_remote_addr zone=menu:10m  rate=120r/m;
limit_req_zone $http_x_session_id  zone=order:10m rate=10r/m;

server {
    listen 443 ssl http2;
    server_name ~^(?<sub>[^.]+)\.armenu\.uz$;

    # Menyu API — keshlanadi (ADR-012 ning asosiy foydasi)
    location ~ ^/v1/menu/[^/]+/$ {
        limit_req          zone=menu burst=20 nodelay;
        proxy_cache        armenu_menu;
        proxy_cache_key    "$scheme$host$request_uri$http_accept_language";
        proxy_cache_valid  200 30s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        proxy_cache_lock   on;                  # ⚡ cache stampede himoyasi
        add_header X-Cache-Status $upstream_cache_status;
        proxy_pass http://armenu_web;
    }

    # Buyurtma — hech qachon keshlanmaydi
    location /v1/orders/ {
        limit_req zone=order burst=5 nodelay;
        proxy_cache off;
        proxy_pass http://armenu_web;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://armenu_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout  3600s;              # uzoq ulanish
        proxy_send_timeout  3600s;
    }

    location / {
        proxy_pass http://armenu_web;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**⛔ Yiqilsa nima bo'ladi:**
🔴 **To'liq to'xtash** (bitta instans bo'lsa) — hech narsa ishlamaydi.
Yumshatish: S1'dan 2 ta nginx + DNS failover; systemd `Restart=always` (5s).
Cloudflare "Always Online" statik sahifani ko'rsatadi.
**Tiklanish:** avtomatik 5s (systemd); konfiguratsiya xatosi bo'lsa — qo'lda (`nginx -t` deploy'da majburiy).

---

## C3 — 🐍 WEB (gunicorn + Django)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | HTTP API (REST) · sahifa render · admin panel · webhook qabul qilish · biznes mantiq |
| **Texnologiya** | Python 3.12, Django 5, DRF, gunicorn (`gthread`) |
| **Portlar** | 8060 (systemd socket activation) |
| **Resurs** | 4 CPU / 8 GB per instans; 8 worker × 4 thread = 32 parallel |
| **Sig'im** | ~300 RPS / instans (p95 250 ms da) |
| **Masshtablash** | ⚡ **Gorizontal** — stateless (P1). S0: 1 → S5: 40 instans |
| **Sog'liq tekshiruvi** | `GET /healthz` (DB ping + Redis ping + 200 OK, < 50 ms) |

**Sog'liq endpoint'i:**

```python
# core/health.py
def healthz(request):
    """LB uchun. Yengil bo'lishi shart — har 3s chaqiriladi."""
    checks = {}
    try:
        connections['default'].cursor().execute('SELECT 1')
        checks['db'] = 'ok'
    except Exception as e:
        checks['db'] = f'fail: {e.__class__.__name__}'
    try:
        cache.set('_hz', '1', 5)
        checks['redis'] = 'ok'
    except Exception as e:
        checks['redis'] = f'fail: {e.__class__.__name__}'

    ok = all(v == 'ok' for v in checks.values())
    return JsonResponse({'status': 'ok' if ok else 'degraded', **checks},
                        status=200 if ok else 503)


def readyz(request):
    """Deploy uchun — migratsiya qo'llanganmi, kesh isitilganmi."""
    pending = MigrationExecutor(connections['default']).migration_plan(
        MigrationExecutor(connections['default']).loader.graph.leaf_nodes())
    return JsonResponse({'ready': not pending, 'pending_migrations': len(pending)},
                        status=200 if not pending else 503)
```

**Gunicorn sozlamalari va sabablari:**

| Sozlama | Qiymat | Sabab |
|---|---|---|
| `--workers` | 8 | `2 × CPU` (4 CPU) |
| `--threads` | 4 | I/O kutish (DB, Redis) uchun |
| `--worker-class` | `gthread` | `sync` — thread yo'q; `gevent` — Django ORM bilan xavfli |
| `--timeout` | 30 | 30s dan uzoq ish → worker'ga (P9) |
| `--graceful-timeout` | 20 | Reload'da joriy so'rovlar tugasin |
| `--max-requests` | 2000 | Xotira sizishiga qarshi (worker qayta tug'iladi) |
| `--max-requests-jitter` | 200 | Barcha worker bir vaqtda restart bo'lmasin |
| `--keep-alive` | 5 | nginx bilan keepalive |

**⛔ Yiqilsa nima bo'ladi:**
- **1 instans:** 🟢 Ta'sir yo'q — nginx `max_fails` bilan chiqarib tashlaydi, boshqasi oladi.
  systemd 5s ichida qayta ko'taradi. Socket activation tufayli port ochiq qoladi.
- **Barcha instans:** 🔴 To'liq to'xtash. Menyu — Cloudflare keshidan 60s davomida ko'rinadi.
  Buyurtma, to'lov — yo'q.
  **Tiklanish:** systemd `Restart=always`; healer C9 tekshiradi; alert P1 (Telegram + qo'ng'iroq).

---

## C4 — ⚡ WS (daphne + Django Channels)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Real-time xabar: KDS buyurtma, ofitsiant chaqiruvi, admin dashboard, mijoz buyurtma holati |
| **Texnologiya** | Daphne (ASGI), Django Channels 4, `channels_redis` layer |
| **Portlar** | 8061 |
| **Resurs** | 4 CPU / 8 GB per instans |
| **Sig'im** | ~50 000 bir vaqtda ulanish / instans (~20-40 KB RAM per ulanish) |
| **Masshtablash** | Gorizontal + ⚡ **ADR-005** (mijozga WS faqat buyurtmadan keyin) |
| **Sog'liq tekshiruvi** | `GET /ws-health` (HTTP) + `armenu_ws_connections` metrikasi |

**Ulanish byudjeti (S5 — 1 mln bir vaqtda foydalanuvchi):**

| Guruh | Ulanish soni | Hisob |
|---|---|---|
| Mijoz (buyurtma bergan) | ~50 000 | 1 mln × 5% |
| Ofitsiant | ~25 000 | 5 000 rest × 5 |
| KDS ekran | ~10 000 | 5 000 rest × 2 |
| Admin | ~5 000 | 5 000 rest × 1 |
| **JAMI** | **~90 000** | → **2-3 instans** ✅ |

**WS guruhlari (⚡ hammasi tenant-scoped):**

```python
# apps/orders/consumers.py
class KDSConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        rid = await self.authenticate_staff()          # PIN sessiya
        if rid is None:
            return await self.close(code=4401)
        self.rid = rid
        self.group = f'rest_{rid}_kds'                 # ⚡ HECH QACHON 'kds' emas (AP-17)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        metrics.inc('ws.connect', group='kds')

    async def order_new(self, event):
        await self.send_json({'type': 'order.new', 'order': event['order']})
```

| Guruh nomi | Kim | Nima keladi |
|---|---|---|
| `rest_<rid>_kds` | Oshxona ekrani | Yangi buyurtma, bekor qilish, prioritet |
| `rest_<rid>_waiters` | Ofitsiantlar | Chaqiruv, buyurtma tayyor, stol holati |
| `rest_<rid>_admin` | Restoran admini | Barcha hodisa, alert, statistika |
| `guest_<session_id>` | Bitta mijoz | ⚡ Faqat **o'z** buyurtmasi holati (ADR-005) |

**Channel layer sozlamalari:**

```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379, 6)],       # ⚡ db=6 (kesh db=5 dan alohida)
            'capacity': 1500,                         # guruh bo'yicha navbat
            'expiry': 20,                             # eskirgan xabar tashlanadi
            'group_expiry': 86400,
        },
    },
}
```

**⛔ Yiqilsa nima bo'ladi:**
🟡 **O'rta ta'sir, biznes to'xtamaydi.**
- ✅ Ishlaydi: menyu, AR, savat, **buyurtma yaratish**, to'lov, admin panel
- ❌ Yo'q: real-time push
- 🔄 **Avtomatik fallback (P3):** klient 3 marta qayta ulanishga urinadi (1s, 3s, 9s),
  keyin **SSE**ga, u ham bo'lmasa **polling 10s**ga o'tadi
- KDS: `GET /v1/orders/?status=pending&since=<ts>` har 10s
**Tiklanish:** systemd 5s; ulanishlar klient tomonidan qayta tiklanadi (exponential backoff).

---

## C5 — 🐘 POSTGRESQL 16 + pgvector

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Yagona haqiqat manbai: restoran, menyu, buyurtma, to'lov, xodim, 3D metama'lumot, vektor |
| **Texnologiya** | PostgreSQL 16, `pgvector`, `pg_trgm`, `btree_gin`; PgBouncer (transaction mode) |
| **Portlar** | 5432 (PgBouncer 6432) |
| **Resurs** | S0: 2 CPU / 4 GB → S5: primary 16 CPU / 64 GB NVMe + 3 replica |
| **Sig'im** | Primary ~3 000 write RPS (16 CPU/64 GB) |
| **Masshtablash** | Vertikal → read replica → partition → sharding (`restaurant_id` hash) |
| **Sog'liq tekshiruvi** | `SELECT 1` (3s) · replication lag < 5s · connection pool < 85% |

**Topologiya (S3+):**

```
                    ┌──────────────────────┐
   YOZISH  ────────▶│  PRIMARY             │
                    │  16 CPU / 64 GB      │
                    │  synchronous_commit  │
                    └──────────┬───────────┘
                               │ streaming replication
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
    │ REPLICA 1   │  │ REPLICA 2   │  │ REPLICA 3       │
    │ hot standby │  │ o'qish      │  │ analitika+vektor│
    │ (failover)  │  │ (menyu API) │  │ (og'ir so'rov)  │
    └─────────────┘  └─────────────┘  └─────────────────┘
         ▲
         │ Patroni auto-failover (30-60s)

    ┌─────────────────────────────────────────────────────┐
    │  PgBouncer (transaction mode) — bulkhead (P9)       │
    │  web:120 · ws:20 · fiscal:15 · model3d:10 · admin:15│
    └─────────────────────────────────────────────────────┘
```

**Partition strategiyasi:**

| Jadval | Partition | Saqlash | Sabab |
|---|---|---|---|
| `orders_order` | RANGE, oy bo'yicha | 24 oy issiq, keyin S3 arxiv | Eng katta yozuv jadvali |
| `orders_orderitem` | RANGE, oy (parent bilan) | 24 oy | Order bilan birga |
| `payments_payment` | RANGE, oy | 60 oy (moliyaviy) | Audit talabi |
| `analytics_event` | RANGE, kun | 90 kun (S2'dan ClickHouse) | ADR-013 |
| `core_job` | RANGE, hafta | 4 hafta | Navbat tarixi |

**⛔ Yiqilsa nima bo'ladi:**
- **Primary yiqiladi:** 🔴 **Yozish yo'q** (buyurtma, to'lov). ✅ **O'qish ishlaydi**
  (replica'dan: menyu, AR, taom). Patroni 30-60s da replica'ni primary qiladi.
  Mijoz bu vaqtda menyu ko'raveradi, buyurtma tugmasi "Bir daqiqadan keyin qayta urinib ko'ring".
- **Replica yiqiladi:** 🟢 DB router primary'ga o'tadi (yuklama ortadi, lekin ishlaydi).
- **To'liq yiqilish:** 🔴 Faqat Cloudflare keshidagi statik menyu.
  **Tiklanish:** WAL + kunlik backup'dan (RTO 5 daqiqa buyurtma uchun, RPO 0).

---

## C6 — 🔴 REDIS 7

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Kesh (menyu, taom) · sessiya · WS channel layer · navbat · idempotency · rate limit · distributed lock |
| **Texnologiya** | Redis 7, `maxmemory-policy allkeys-lru` (db=5), `noeviction` (db=6) |
| **Portlar** | 6379 |
| **Resurs** | S0: 1 CPU / 2 GB → S5: cluster 6 node × 4 CPU / 16 GB |
| **Masshtablash** | Sentinel (S2) → Cluster (S4) |
| **Sog'liq tekshiruvi** | `PING` · `INFO memory` (used < 80%) · replikatsiya holati |

**⚠️ DB ajratish (muhim):**

| DB | Vazifa | Eviction | Yo'qolsa |
|---|---|---|---|
| **db=5** | Kesh, sessiya, rate limit, idempotency | `allkeys-lru` | 🟡 Qayta quriladi (DB'dan) |
| **db=6** | Channels layer (WS pub/sub) | `noeviction` | 🟡 WS uziladi, qayta ulanadi |

> ⚡ **Nega ajratilgan:** kesh to'lib ketganda LRU eski kalitlarni o'chiradi. Agar WS
> channel'lari ham shu DB'da bo'lsa — faol WS ulanishlari **jimgina o'ladi**.

**Kalitlar sxemasi:**

```
menu:<rid>:<lang>:v<n>          → menyu payload           TTL 300s
menuver:<rid>                   → menyu versiya raqami    TTL 3600s
dish:<rid>:<did>:<lang>         → taom kartochkasi        TTL 300s
stoplist:<rid>                  → tugagan taom ID'lari    TTL 5s   ⚡ qisqa
rest:<slug>                     → restoran meta           TTL 600s
qrtoken:<token>                 → stol → restaurant_id    TTL 600s
sess:<session_key>              → Django sessiya          TTL 3600s
idem:<scope>:<rid>:<key>:done   → idempotent javob        TTL 24h  ⚡ P4
idem:<scope>:<rid>:<key>:lock   → parallel qulf           TTL 30s
rl:<zone>:<ident>:<window>      → rate limit hisoblagich   TTL window
cb:<service>:state              → circuit breaker holati  TTL 300s ⚡ P8
lock:<resource>                 → distributed lock        TTL 30s
queue:<name>                    → navbat (LIST)           ⛔ TTL yo'q
delayed:<name>                  → kechiktirilgan (ZSET)   ⛔ TTL yo'q
```

**⛔ Yiqilsa nima bo'ladi:**
🟠 **Katta ta'sir, lekin biznes to'xtamaydi.**
- ✅ Ishlaydi: menyu (DB'dan, sekinroq ~3×), buyurtma yaratish, to'lov
- ❌ Yo'q: WS (channel layer), sessiya (mijoz savati yo'qoladi), rate limit
- ⚠️ **Navbatdagi job'lar:** Redis LIST'dagi `job_id`lar yo'qoladi — LEKIN `Job` yozuvlari
  **PostgreSQL'da** (ADR-008), healer C9 `status='queued'` job'larni qayta navbatga qo'yadi ✅
- ⚠️ Idempotency yo'qoladi → DB `UniqueConstraint` ikkinchi qatlam sifatida ushlaydi (P12)
**Tiklanish:** Sentinel failover 10s; kesh o'z-o'zidan qayta quriladi (cache stampede'ga
qarshi `proxy_cache_lock` va Redis `SET NX`).

---

## C7 — 📦 S3 / MinIO

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | 3D modellar (`.glb`, `.usdz`), taom rasmlari (`.webp`), QR PDF, backup, eksport |
| **Texnologiya** | MinIO (S0-S2, o'z serverimizda) → AWS S3 / Backblaze B2 (S3+) |
| **Portlar** | 9000 (API), 9001 (konsol) |
| **Resurs** | S0: 100 GB → S5: 5 TB |
| **Masshtablash** | Ob'ekt saqlash — tabiiy cheksiz; MinIO distributed rejim (4+ node) |
| **Sog'liq tekshiruvi** | `HEAD /minio/health/live` |

**Bucket tuzilishi:**

```
armenu-models/          ⚡ ADR-011 — kutubxona umumiy
├── library/
│   ├── osh_toy/
│   │   ├── v1/model.glb          (2,1 MB)
│   │   ├── v1/model.usdz         (2,8 MB)
│   │   └── v1/poster.webp        (45 KB)
│   └── somsa_gosht/v1/...
└── custom/
    └── <restaurant_id>/<dish_id>/v1/...

armenu-images/
└── <restaurant_id>/dishes/<dish_id>_<hash>.webp

armenu-qr/
└── <restaurant_id>/tables/<table_id>.pdf

armenu-backups/         (boshqa region)
├── pg/YYYY-MM-DD/
└── redis/YYYY-MM-DD/
```

**Kirish siyosati:**

| Bucket | Ommaviy o'qish | Yozish | CDN origin |
|---|---|---|---|
| `armenu-models` | ✅ ha (CDN orqali) | faqat worker | ✅ |
| `armenu-images` | ✅ ha | web + worker | ✅ |
| `armenu-qr` | ⛔ presigned URL (15 daq) | web | ⛔ |
| `armenu-backups` | ⛔ | backup skripti | ⛔ |

**⛔ Yiqilsa nima bo'ladi:**
🟡 **O'rta ta'sir.**
- ✅ Ishlaydi: menyu (matn+narx), buyurtma, to'lov
- ⚠️ 3D/AR: Cloudflare keshidan 30 kun davomida ko'rinadi (hit bo'lganlar).
  Kesh miss → **rasm fallback** (P3 zanjiri)
- ❌ Yangi rasm/model yuklash yo'q → `worker:model3d` job'lari navbatda kutadi
**Tiklanish:** MinIO distributed rejimda 1 node yiqilsa avtomatik; to'liq — replica bucket'dan.

---

## C8 — ⚙️ WORKER (5 navbat)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Fon vazifalar: 3D generatsiya, fiskal chek, bildirishnoma, AI so'rov, analitika ETL |
| **Texnologiya** | Python 3.12, `manage.py run_worker --queue=<name>`, Redis `BLPOP` |
| **Portlar** | — (tashqi port yo'q) |
| **Resurs** | Har navbat uchun alohida systemd unit + `MemoryMax` + `CPUQuota` (P9) |
| **Masshtablash** | Gorizontal — navbat bo'yicha mustaqil (`armenu-worker@fiscal` × N) |
| **Sog'liq tekshiruvi** | `Job.heartbeat_at` (10s) + `armenu_queue_depth{queue}` metrikasi |

Batafsil: **§7 — Worker turlari**.

**⛔ Yiqilsa nima bo'ladi (navbatga qarab):**

| Navbat | Ta'sir | Nima ishlaydi |
|---|---|---|
| `model3d` | 🟢 Kichik | Hammasi. Yangi 3D navbatda kutadi |
| `fiscal` | 🟡 O'rta | ✅ Buyurtma, to'lov. Chek navbatda (soliq muddati 24 soat — yetadi) |
| `notify` | 🟢 Kichik | Hammasi. Telegram/push kechikadi |
| `ai` | 🟢 Yo'q | AI chat "hozir mavjud emas, ofitsiantni chaqiring" (P3) |
| `analytics` | 🟢 Yo'q | Hammasi. Statistika kechikadi |

**Tiklanish:** systemd `Restart=always` 5s; healer C9 orphan job'larni (heartbeat > 15 daq)
qayta navbatga qo'yadi.

---

## C9 — 🔧 HEALER (self-healing daemon)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Har 60s tizimni tekshiradi, muammoni **o'zi tuzatadi**, tuzata olmasa alert yuboradi |
| **Texnologiya** | Python, `manage.py run_healer`, 15 mexanizm |
| **Portlar** | — |
| **Resurs** | 0,5 CPU / 512 MB |
| **Masshtablash** | ⛔ **Faqat 1 instans** (distributed lock bilan kafolatlanadi) |
| **Sog'liq tekshiruvi** | `armenu_healer_last_cycle_ts` metrikasi (> 180s → alert) |

```python
# core/healing/daemon.py
HEALER_LOCK = 'lock:healer'

def run_cycle():
    # ⚡ Faqat bitta healer ishlaydi (ko'p node bo'lsa ham)
    if not cache.add(HEALER_LOCK, socket.gethostname(), timeout=90):
        return
    try:
        for name, check, heal in CHECKS:
            ...
    finally:
        metrics.gauge('armenu_healer_last_cycle_ts', time.time())
```

**⛔ Yiqilsa nima bo'ladi:**
🟡 **Kechiktirilgan ta'sir.** Darhol hech narsa buzilmaydi, lekin avtomatik tiklash
to'xtaydi: orphan job'lar `running`da qoladi, disk to'lishi tuzatilmaydi,
stuck order alerti kelmaydi. **24 soat sezilmasa** — muammolar to'planadi.
**Tiklanish:** systemd 5s; `armenu_healer_last_cycle_ts` metrikasi 180s da alert beradi.

---

## C10 — 📊 CLICKHOUSE (S2 dan)

| Maydon | Qiymat |
|---|---|
| **Vazifasi** | Analitik event saqlash va tahlil (ADR-013) |
| **Texnologiya** | ClickHouse, `MergeTree`, oy bo'yicha partition, TTL 730 kun |
| **Portlar** | 8123 (HTTP), 9000 (native) |
| **Resurs** | 2 node × 8 CPU / 32 GB / 1 TB |
| **Masshtablash** | Shard + replica (Distributed table) |
| **Sog'liq tekshiruvi** | `SELECT 1` + `system.replication_queue` uzunligi |

**⛔ Yiqilsa nima bo'ladi:**
🟢 **Biznesga ta'sir yo'q.** `worker:analytics` batch'lari DLQ'ga tushadi (yo'qolmaydi),
ClickHouse tiklanganda qayta yoziladi. Admin hisobotlari vaqtincha mavjud emas
(oxirgi materialized view snapshot ko'rsatiladi). Buyurtma, to'lov, menyu — ta'sirlanmaydi.

---

## 2.1 Konteynerlar yiqilish matritsasi (qisqacha)

| Yiqilgan | Menyu | AR | Buyurtma | To'lov | Real-time | Admin | Daraja |
|---|---|---|---|---|---|---|---|
| Cloudflare | ✅ sekin | ✅ sekin | ✅ | ✅ | ✅ | ✅ | 🟡 |
| nginx (1/2) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 |
| nginx (barcha) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| web (1/N) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 |
| web (barcha) | ⚠️ kesh | ⚠️ CDN | ❌ | ❌ | ❌ | ❌ | 🔴 |
| ws | ✅ | ✅ | ✅ | ✅ | ⚠️ polling | ✅ | 🟡 |
| PG primary | ✅ replica | ✅ | ❌ 30-60s | ❌ | ✅ | ⚠️ o'qish | 🔴 |
| PG replica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 |
| Redis | ✅ sekin | ✅ | ✅ | ✅ | ❌ | ✅ | 🟠 |
| S3 | ✅ | ⚠️ rasm | ✅ | ✅ | ✅ | ✅ | 🟡 |
| worker:fiscal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 chek navbatda |
| worker:model3d | ✅ | ✅ mavjud | ✅ | ✅ | ✅ | ✅ | 🟢 |
| healer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 kechiktirilgan |
| ClickHouse | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ hisobot | 🟢 |

---

# §3. DJANGO MODULLAR (C4 — Level 3)

```
armenu_project/
├── config/                 # settings, urls, asgi, wsgi
├── core/                   # umumiy qatlam (§5)
├── apps/
│   ├── tenants/       1    │ Restaurant, tarif, obuna
│   ├── accounts/      2    │ User, Staff, rol, PIN, JWT
│   ├── menu/          3    │ Category, Dish, Modifier, stop-list
│   ├── ar3d/          4  ⚡ │ DishLibrary, DishModel3D, pipeline
│   ├── tables/        5    │ Hall, Table, QR token
│   ├── guest/         6    │ Guest, GuestSession, savat
│   ├── orders/        7  ⚡ │ Order, holat mashinasi, KDS
│   ├── payments/      8    │ Payment, Tip, gateway adapterlar
│   ├── fiscal/        9    │ OFD, IKPU, chek
│   ├── loyalty/      10    │ Bonus, keshbek, promo
│   ├── reviews/      11    │ Review, Google yo'naltirish
│   ├── analytics/    12    │ Event, hisobot, menyu-injiniring
│   ├── ai/           13  ⚡ │ MCP qatlam, chatbot, tarjima
│   ├── notifications/      │ (yordamchi) Telegram, push
│   └── platform_admin/     │ (yordamchi) super-admin
├── static/ · templates/ · locale/ · deploy/
```

> **13 asosiy modul** raqamlangan. `notifications` va `platform_admin` — yordamchi
> (o'z domen modeliga ega emas, boshqalarga xizmat qiladi).

---

## 3.1 `apps/tenants` — Restoran va obuna

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Restoran identifikatori, tarif, obuna, sozlamalar. ⚡ Barcha tenant izolyatsiyasining manbai |
| **Egalik qiladigan jadvallar** | `tenants_restaurant`, `tenants_subscription`, `tenants_plan`, `tenants_settings`, `tenants_branch` |
| **Bog'liqliklari** | ⛔ **Hech kimga** (eng past qatlam, faqat `core`) |
| **Ajratish mumkinmi** | ⛔ Yo'q — hamma unga bog'liq |

**Ochiq interfeys:**

```python
# apps/tenants/services.py
def resolve_by_slug(slug: str) -> int | None:          # kesh bilan, 600s
def resolve_by_token(qr_token: str) -> int | None:     # kesh bilan, 600s
def get_settings(restaurant_id: int) -> RestaurantSettings
def is_feature_enabled(restaurant_id: int, feature: str) -> bool   # tarif gate
def check_quota(restaurant_id: int, resource: str) -> QuotaResult  # 3D model, AI so'rov
def purge_restaurant(restaurant_id: int, *, confirm: str) -> None  # GDPR
```

---

## 3.2 `apps/accounts` — Foydalanuvchi va rol

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Autentifikatsiya (3 rol), avtorizatsiya, PIN, JWT, sessiya |
| **Egalik qiladigan jadvallar** | `accounts_user`, `accounts_staff`, `accounts_role`, `accounts_permission`, `accounts_auditlog` |
| **Bog'liqliklari** | `tenants` |
| **Ajratish mumkinmi** | 🟡 Nazariy (SSO servis), lekin foyda yo'q |

**3 xil autentifikatsiya:**

| Rol | Usul | Sessiya muddati | Saqlash |
|---|---|---|---|
| 👤 Mijoz | ⛔ **Auth yo'q** — QR token → anonim sessiya | 4 soat | Redis `sess:` |
| 🧑‍🍳 Ofitsiant | 4-6 raqamli PIN (bcrypt) | Smena oxirigacha (12 soat) | Redis + `Staff.last_seen` |
| 👨‍💼 Admin | Login + parol (+ 2FA super-admin) | JWT 15 daq + refresh 7 kun | JWT |

```python
# apps/accounts/services.py
def authenticate_staff(restaurant_id: int, pin: str) -> Staff | None   # rate limit 5/15daq
def issue_guest_session(table_id: int) -> GuestSession
def has_permission(user, perm: str, restaurant_id: int) -> bool
def audit(actor, action: str, target, **meta) -> None                  # AuditLog
```

---

## 3.3 `apps/menu` — Menyu

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Kategoriya, taom, modifikator, stop-list, tarjima, narx. ⚡ **Narx yagona manbai** (ADR-006) |
| **Egalik qiladigan jadvallar** | `menu_category`, `menu_dish`, `menu_dishtranslation`, `menu_modifier`, `menu_modifiergroup`, `menu_stoplist`, `menu_allergen` |
| **Bog'liqliklari** | `tenants` |
| **Ajratish mumkinmi** | 🟡 Nazariy, lekin `orders` bilan zich bog'langan (narx) |

```python
# apps/menu/services.py
def get_menu_payload(restaurant_id: int, lang: str) -> dict      # ⚡ keshlanadi (P7)
def get_dish(restaurant_id: int, dish_id: int, lang: str) -> dict
def stoplist_ids(restaurant_id: int) -> set[int]                 # TTL 5s
def set_stoplist(restaurant_id: int, dish_id: int, on: bool) -> None
def bump_menu_version(restaurant_id: int) -> None                # kesh invalidatsiya
def search_semantic(restaurant_id: int, query: str, lang: str, limit: int) -> list
```

**⚡ Kesh invalidatsiya oqimi:**

```
Admin narxni o'zgartiradi
   │
   ▼
post_save(Dish)  →  on_commit  →  bump_menu_version(rid)
   │                                    │
   │                                    ├─▶ Restaurant.menu_version += 1
   │                                    ├─▶ cache.delete('menuver:<rid>')
   │                                    └─▶ Cloudflare purge Cache-Tag: menu-<rid>
   ▼
Barcha `menu:<rid>:*:v<eski>` kalitlari o'z-o'zidan foydalanilmaydi
(TTL bilan o'ladi — DELETE kerak emas)
```

---

## 3.4 `apps/ar3d` — 3D va AR ⚡

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | 3D model kutubxonasi, restoran modellari, generatsiya pipeline'i, AR ko'rish, format konversiyasi |
| **Egalik qiladigan jadvallar** | `ar3d_dishlibrary`, `ar3d_dishmodel3d`, `ar3d_modeljob`, `ar3d_arview`, `ar3d_modelversion` |
| **Bog'liqliklari** | `tenants`, `menu` |
| **Ajratish mumkinmi** | ✅ **HA — birinchi nomzod** (og'ir, mustaqil, GPU kerak bo'lishi mumkin) |

```python
# apps/ar3d/services.py
def get_ar_payload(restaurant_id: int, dish_id: int) -> ARPayload
    # → {glb_url, usdz_url, poster_url, scale, placement}  ⚡ keshlanadi

def request_model(dish_id: int, *, source: str, ref_images: list) -> int
    # → enqueue('model3d', ...), Job ID qaytaradi

def match_library(dish: Dish, threshold: float = 0.82) -> DishLibrary | None
    # ⚡ ADR-011 — semantik moslash (pgvector), TAKLIF sifatida

def track_ar_view(restaurant_id, dish_id, session_id, duration_ms) -> None
    # → enqueue('analytics', ...)
```

**3D generatsiya pipeline'i:**

```
[1] Admin taom rasmini yuklaydi (2-6 ta rakurs)
     │
     ▼
[2] match_library(dish)  ── pgvector cosine ──▶  o'xshashlik ≥ 0,82?
     │                                                │
     │ yo'q                                      ha ──┴──▶ TAKLIF ko'rsatiladi
     ▼                                                      admin tasdiqlaydi ✅ TUGADI
[3] enqueue('model3d', 'generate', dish_id=...)
     │
     ▼
[4] worker:model3d
     ├── rasm tayyorlash (fon olib tashlash, normalizatsiya)
     ├── AI provayder zanjiri:  Meshy → Tripo → Rodin      (breaker + fallback)
     ├── GLB yuklab olish
     ├── optimizatsiya (Draco siqish, tekstura → KTX2, < 4 MB)
     ├── USDZ konversiya (usdzconvert / Reality Converter CLI)
     ├── poster render (Blender headless yoki model-viewer screenshot)
     ├── S3'ga yuklash (versiyalangan yo'l)
     └── DishModel3D.objects.create(...)  →  cache invalidatsiya
     │
     ▼
[5] Admin ko'rib chiqadi → tasdiqlaydi / rad etadi
     │
     ▼
[6] ✅ Mijozga AR ko'rinadi

O'rtacha vaqt: 3-8 daqiqa · Narx: $0,20-0,50 · Muvaffaqiyat: ~78%
```

---

## 3.5 `apps/tables` — Zal va stol

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Zal, stol, QR token, stol holati, zal plani |
| **Egalik qiladigan jadvallar** | `tables_hall`, `tables_table`, `tables_qrtoken`, `tables_tablesession` |
| **Bog'liqliklari** | `tenants` |
| **Ajratish mumkinmi** | ⛔ Yo'q (kichik, `orders` bilan zich) |

```python
# apps/tables/services.py
def resolve_token(token: str) -> TableContext | None    # → (restaurant_id, table_id)
def rotate_token(table_id: int) -> str                  # QR yangilash (xavfsizlik)
def set_status(table_id: int, status: str) -> None      # free|ordering|served|bill
def generate_qr_pdf(restaurant_id: int, hall_id: int) -> str   # presigned S3 URL
```

**QR token xavfsizligi:**

| Xususiyat | Qiymat |
|---|---|
| Format | 22 belgi, `secrets.token_urlsafe(16)` |
| Ma'no | ⛔ Ketma-ket ID emas (brute-force himoyasi) |
| Aylantirish | Qo'lda (stol o'zgarsa) yoki 12 oyda |
| Rate limit | 60/daq per IP |
| Kesh | `qrtoken:<token>` → `restaurant_id`, TTL 600s |

---

## 3.6 `apps/guest` — Mijoz sessiyasi

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Anonim mijoz sessiyasi, savat, til tanlovi, telefon (ixtiyoriy) |
| **Egalik qiladigan jadvallar** | `guest_guest`, `guest_guestsession`, `guest_cart`, `guest_cartitem` |
| **Bog'liqliklari** | `tenants`, `tables` |
| **Ajratish mumkinmi** | ⛔ Yo'q |

> ⚡ **Savat serverda saqlanadi** (`guest_cart`), klientda emas. Sabab: mijoz sahifani
> yopib qayta ochsa savat qolishi kerak; ofitsiant mijoz savatini ko'rishi mumkin.
> Narx savatda **saqlanmaydi** — buyurtma paytida qayta hisoblanadi (ADR-006).

```python
# apps/guest/services.py
def get_or_create_session(table_token: str, lang: str) -> GuestSession
def add_to_cart(session_id: str, dish_id: int, qty: int, modifier_ids: list) -> Cart
def get_cart(session_id: str) -> CartView            # narx SERVERDA hisoblanadi
def clear_cart(session_id: str) -> None
def attach_phone(session_id: str, phone: str) -> Guest   # 998XXXXXXXXX normalizatsiya
```

---

## 3.7 `apps/orders` — Buyurtma ⚡

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Buyurtma hayotiy sikli, holat mashinasi, KDS, ofitsiant chaqiruvi. ⚡ **Eng kritik modul** |
| **Egalik qiladigan jadvallar** | `orders_order` (partition), `orders_orderitem` (partition), `orders_orderstatuslog`, `orders_waitercall` |
| **Bog'liqliklari** | `tenants`, `menu`, `tables`, `guest`, `accounts` |
| **Ajratish mumkinmi** | ⛔ Yo'q — tranzaksion yadro (ADR-001 sababi) |

**Holat mashinasi:**

```
                  ┌─────────────┐
                  │   draft     │  (savat — guest modulida)
                  └──────┬──────┘
                         │ create_order()
                         ▼
                  ┌─────────────┐
      ┌───────────│   pending   │───────────┐
      │ bekor     └──────┬──────┘  qabul    │
      │                  │                  ▼
      │                  │           ┌─────────────┐
      │                  │           │  accepted   │
      │                  │           └──────┬──────┘
      │                  │                  │ oshpaz boshladi
      │                  │                  ▼
      │                  │           ┌─────────────┐
      │                  │           │   cooking   │◀── ⚠️ 45 daq → healer alert
      │                  │           └──────┬──────┘
      │                  │                  │ tayyor
      │                  │                  ▼
      │                  │           ┌─────────────┐
      │                  │           │    ready    │
      │                  │           └──────┬──────┘
      │                  │                  │ ofitsiant olib bordi
      │                  │                  ▼
      │                  │           ┌─────────────┐
      │                  │           │   served    │
      │                  │           └──────┬──────┘
      │                  │                  │ to'landi
      ▼                  ▼                  ▼
┌─────────────┐                      ┌─────────────┐
│  cancelled  │                      │  completed  │
└─────────────┘                      └─────────────┘

⚡ Har o'tish OrderStatusLog'ga yoziladi (kim, qachon, qayerdan)
⛔ Orqaga o'tish faqat admin ruxsati bilan (`served → cooking` mumkin emas)
```

```python
# apps/orders/services.py
def create_order(*, restaurant, table, items, session, idem_key) -> Order   # ⚡ atomic
def transition(order: Order, to_status: str, *, actor, reason='') -> Order  # holat mashinasi
def cancel_order(order: Order, *, actor, reason: str) -> Order
def call_waiter(table_id: int, reason: str) -> WaiterCall                   # rate limit 1/daq
def kds_queue(restaurant_id: int) -> list[dict]                            # KDS ro'yxati
def estimate_eta(restaurant_id: int, items) -> int                         # daqiqa
```

**Buyurtma yaratish — to'liq oqim:**

```python
@api_view(['POST'])
@idempotent('order.create')                       # ⚡ P4
def create_order_view(request):
    ser = OrderInSerializer(data=request.data)    # ⛔ price maydoni YO'Q (ADR-006)
    ser.is_valid(raise_exception=True)

    with transaction.atomic():
        # 1) Validatsiya (7 bosqich) — narx SERVERDA
        price = calc_order_total(
            restaurant=request.restaurant,
            items_in=ser.validated_data['items'],
            promo_code=ser.validated_data.get('promo_code'),
        )
        # 2) Yozuv
        order = Order.objects.create(
            restaurant_id=request.restaurant_id,
            table_id=ser.validated_data['table_id'],
            session_id=request.session_id,
            total=price.total,
            price_breakdown=price.breakdown,       # ⚡ audit izi
            idempotency_key=request.headers['X-Idempotency-Key'],
        )
        OrderItem.objects.bulk_create(build_items(order, price))
        Table.objects.filter(pk=order.table_id).update(status='ordering')

    # 3) ⚡ COMMIT'dan keyin — WS va navbat (AP-09)
    transaction.on_commit(lambda: order_created.send(sender=Order, order=order))
    return Response(OrderOutSerializer(order).data, status=201)
```

---

## 3.8 `apps/payments` — To'lov

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | To'lov yaratish, webhook, chaevoy, qaytarish, gateway adapterlar (ADR-014) |
| **Egalik qiladigan jadvallar** | `payments_payment` (partition), `payments_tip`, `payments_refund`, `payments_webhookevent` |
| **Bog'liqliklari** | `tenants`, `orders` |
| **Ajratish mumkinmi** | 🟡 Nazariy (PCI izolyatsiya foydasi), lekin karta ma'lumoti bizda saqlanmaydi |

```python
# apps/payments/services.py
def create_payment(*, order, method, preferred=None) -> PaymentIntent    # fallback zanjiri
def handle_webhook(provider: str, request) -> WebhookResult              # HMAC tekshiruvi
def refund(payment: Payment, *, amount, reason, actor) -> Refund
def add_tip(order: Order, amount: Decimal, staff_id: int) -> Tip
```

**Webhook xavfsizligi (P12 — 4 qatlam):**

| # | Qatlam | Tekshiruv |
|---|---|---|
| 1 | Imzo | HMAC / Basic auth (provayderga qarab) |
| 2 | Idempotency | `WebhookEvent.provider_event_id` unique |
| 3 | Summa | `webhook.amount == payment.amount` (aks holda 🚨 alert) |
| 4 | Holat | Holat o'tishi qonuniymi (`created → paid` ✅, `paid → paid` — jim o'tkazish) |

---

## 3.9 `apps/fiscal` — Fiskal (OFD)

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Soliq cheki, IKPU kodlar, OFD integratsiya, chek arxivi |
| **Egalik qiladigan jadvallar** | `fiscal_receipt`, `fiscal_ikpu`, `fiscal_ofdlog`, `fiscal_vatrate` |
| **Bog'liqliklari** | `tenants`, `orders`, `payments` |
| **Ajratish mumkinmi** | 🟡 Ha (mamlakatga xos mantiq — xalqaro kengayishda foydali) |

```python
# apps/fiscal/services.py
def enqueue_receipt(order: Order) -> int                    # ⚡ HECH QACHON sinxron emas
def send_receipt(order_id: int) -> Receipt                  # worker:fiscal ichida
def resolve_ikpu(dish: Dish) -> str                         # tasnif.soliq.uz kesh
def get_receipt_url(order: Order) -> str | None
```

**⚠️ Kritik qoida:** fiskal chek **hech qachon** web so'rovda yuborilmaydi (AP-04).
Navbat `fiscal` — kafolatlangan 5 worker, retry 10 marta, 48 soat davomida, keyin DLQ + alert P1.

---

## 3.10 `apps/loyalty` — Sodiqlik

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Bonus, keshbek, promo-kod, sodiqlik darajalari |
| **Egalik qiladigan jadvallar** | `loyalty_program`, `loyalty_bonusaccount`, `loyalty_bonustransaction`, `loyalty_promocode`, `loyalty_tier` |
| **Bog'liqliklari** | `tenants`, `guest`, `orders` |
| **Ajratish mumkinmi** | ✅ Ha (mustaqil domen) |

```python
# apps/loyalty/services.py
def apply_promo(restaurant, code: str | None, subtotal: Decimal) -> Decimal  # ⚡ narx zanjirida
def accrue_cashback(order: Order) -> BonusTransaction                        # event handler
def redeem_bonus(guest, amount: Decimal, order: Order) -> BonusTransaction
def get_balance(guest_id: int, restaurant_id: int) -> Decimal
```

---

## 3.11 `apps/reviews` — Sharhlar

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Ichki sharh, baho, Google/Yandex yo'naltirish, negativ filtr |
| **Egalik qiladigan jadvallar** | `reviews_review`, `reviews_reviewphoto`, `reviews_externallink` |
| **Bog'liqliklari** | `tenants`, `guest`, `orders` |
| **Ajratish mumkinmi** | ✅ Ha |

**Smart yo'naltirish mantiqi:**

```
Mijoz baho beradi
   │
   ├─ 4-5 ⭐ ──▶ "Google'da ham yozib qo'ysangiz?" → Google Maps havolasi
   │
   └─ 1-3 ⭐ ──▶ Ichki forma: "Nima yoqmadi?" → restoran admini darhol xabar oladi
                  (⛔ tashqi platformaga yo'naltirilmaydi)
```

---

## 3.12 `apps/analytics` — Analitika

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | Event yig'ish, hisobot, menyu-injiniring, AR konversiya |
| **Egalik qiladigan jadvallar** | `analytics_event` (partition, S0-S1) · ClickHouse `events` (S2+) · `analytics_report` |
| **Bog'liqliklari** | Hech kimga (faqat event **qabul qiladi**) |
| **Ajratish mumkinmi** | ✅ **HA — uchinchi nomzod** (ADR-013 bilan birga) |

```python
# apps/analytics/services.py
def track(event_type: str, *, restaurant_id: int, **props) -> None   # ⚡ faqat enqueue
def menu_engineering(restaurant_id: int, days: int = 30) -> dict      # Star/Plow/Puzzle/Dog
def ar_conversion(restaurant_id: int, days: int = 30) -> dict         # AR ko'rgan → buyurtma
def revenue_report(restaurant_id: int, period) -> dict
```

**Menyu-injiniring matritsasi (asosiy hisobot):**

```
              Yuqori marjinallik        Past marjinallik
            ┌────────────────────────┬────────────────────────┐
  Ko'p      │  ⭐ STARS               │  🐎 PLOWHORSES         │
  sotiladi  │  Saqlash, ko'rsatish    │  Narx oshirish yoki    │
            │  AR majburiy            │  tannarx pasaytirish   │
            ├────────────────────────┼────────────────────────┤
  Kam       │  🧩 PUZZLES            │  🐕 DOGS               │
  sotiladi  │  Reklama, AR qo'shish,  │  Menyudan olib tashlash│
            │  ofitsiant tavsiyasi    │                        │
            └────────────────────────┴────────────────────────┘
⚡ ARMENU farqi: har kvadrantga "AR ko'rish → buyurtma konversiyasi" qo'shiladi
```

---

## 3.13 `apps/ai` — AI va MCP ⚡

| Maydon | Qiymat |
|---|---|
| **Mas'uliyat chegarasi** | MCP tool registry, chatbot, tarjima, taom tavsifi, provayder adapterlar (ADR-009) |
| **Egalik qiladigan jadvallar** | `ai_conversation`, `ai_message`, `ai_toolcall`, `ai_usagelog`, `ai_providerstate` |
| **Bog'liqliklari** | `tenants`, `menu`, `ar3d` (⚡ faqat servis funksiyalari orqali) |
| **Ajratish mumkinmi** | ✅ **HA — ikkinchi nomzod** (tashqi API, sekin, mustaqil) |

```
apps/ai/
├── mcp/
│   ├── registry.py      # @mcp_tool dekoratori, tool ro'yxati
│   ├── guard.py         # ⚡ tenant filtri + ruxsat + rate limit
│   ├── audit.py         # har chaqiruv AuditLog'ga
│   └── tools/
│       ├── menu.py      # search_menu, get_dish, check_stoplist
│       ├── orders.py    # get_order_status  (faqat O'Z buyurtmasi)
│       └── actions.py   # call_waiter       (⛔ yozuv tool'lari YO'Q)
├── providers/
│   ├── base.py          # Protocol: chat(msgs, tools) -> Response
│   ├── gemini.py · claude.py · gpt.py · groq.py · deepseek.py
│   ├── meshy.py · tripo.py   # 3D generatsiya
│   └── chain.py         # fallback zanjiri + circuit breaker
└── services.py
```

```python
# apps/ai/services.py
def chat(session_id: str, message: str, lang: str) -> AIResponse   # MCP tool'lar bilan
def translate_menu(restaurant_id: int, target_langs: list) -> int  # → enqueue('ai', ...)
def generate_description(dish_id: int, tone: str) -> str
def embed_dish(dish_id: int) -> None                               # pgvector uchun
```

---

## 3.14 Modullar qisqacha jadvali

| # | Modul | Jadval | Faza | Ajratish | Kritiklik |
|---|---|---|---|---|---|
| 1 | `tenants` | 5 | F1 | ⛔ | 🔴 |
| 2 | `accounts` | 5 | F1 | 🟡 | 🔴 |
| 3 | `menu` | 7 | F2 | 🟡 | 🔴 |
| 4 | `ar3d` ⚡ | 5 | F5 | ✅ 1-nomzod | 🟡 |
| 5 | `tables` | 4 | F3 | ⛔ | 🔴 |
| 6 | `guest` | 4 | F3-F4 | ⛔ | 🔴 |
| 7 | `orders` ⚡ | 4 | F6 | ⛔ | 🔴 |
| 8 | `payments` | 4 | F7 | 🟡 | 🔴 |
| 9 | `fiscal` | 4 | F8 | 🟡 | 🟡 |
| 10 | `loyalty` | 5 | F10 | ✅ | 🟢 |
| 11 | `reviews` | 3 | F10 | ✅ | 🟢 |
| 12 | `analytics` | 2 | F11 | ✅ 3-nomzod | 🟢 |
| 13 | `ai` ⚡ | 5 | F9 | ✅ 2-nomzod | 🟢 |
| — | `notifications` | 3 | F6 | ✅ | 🟡 |
| — | `platform_admin` | 2 | F1 | 🟡 | 🟢 |

---

# §4. MODULLAR BOG'LIQLIK GRAFI

> ⚡ **Qoida:** bog'liqlik faqat **pastdan yuqoriga**. Teskari yo'nalish — **faqat event**
> (P5). Grafda **sikl yo'q** — bu CI'da tekshiriladi (`test_no_cross_import.py`).

```
QATLAM 0 — POYDEVOR
┌────────────────────────────────────────────────────────────────────┐
│  core/   (middleware · mixins · permissions · exceptions ·         │
│           resilience · queue · ws · cache · i18n · healing)        │
└────────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ hamma import qiladi
QATLAM 1 — TENANT
┌────────────────────────────────────────────────────────────────────┐
│  tenants   (Restaurant · Plan · Subscription)                      │
└────────────────────────────────────────────────────────────────────┘
                    ▲                         ▲
                    │                         │
QATLAM 2 — DOMEN ASOSI
┌──────────────────────┐   ┌──────────────────────┐   ┌─────────────┐
│  accounts            │   │  menu                │   │  tables     │
│  (User·Staff·Rol)    │   │  (Category·Dish)     │   │  (Hall·QR)  │
└──────────────────────┘   └──────────────────────┘   └─────────────┘
         ▲                    ▲          ▲                    ▲
         │                    │          │                    │
QATLAM 3 — DOMEN KENGAYTMASI
         │          ┌─────────┘          │          ┌─────────┘
         │          │                    │          │
   ┌─────┴──────────┴─────┐        ┌─────┴──────────┴─────┐
   │  guest               │        │  ar3d          ⚡     │
   │  (Session·Cart)      │        │  (Library·Model3D)   │
   └──────────────────────┘        └──────────────────────┘
              ▲                              ▲
              │                              │
QATLAM 4 — TRANZAKSION YADRO
   ┌──────────┴──────────────────────────────┴──────────┐
   │  orders                                       ⚡    │
   │  (Order · OrderItem · StatusLog · WaiterCall)      │
   └────────────────────────────────────────────────────┘
              ▲              ▲              ▲
              │              │              │
QATLAM 5 — BUYURTMA USTIDAGI
   ┌──────────┴────┐  ┌──────┴──────┐  ┌────┴─────────┐
   │  payments     │  │  loyalty    │  │  reviews     │
   └───────────────┘  └─────────────┘  └──────────────┘
              ▲
              │
   ┌──────────┴────┐
   │  fiscal       │   (orders + payments)
   └───────────────┘

QATLAM 6 — KO'NDALANG (faqat EVENT qabul qiladi, hech kimga bog'liq emas)
   ┌───────────────────────┐  ┌───────────────────────┐
   │  analytics            │  │  notifications        │
   │  ◀── event only       │  │  ◀── event only       │
   └───────────────────────┘  └───────────────────────┘

QATLAM 7 — AI (mustaqil, faqat servis funksiyalari orqali kiradi)
   ┌────────────────────────────────────────────────────┐
   │  ai / mcp     ⚡                                    │
   │  → menu.services · ar3d.services · orders.services │
   │  ⛔ ORM'ga to'g'ridan kirmaydi                      │
   └────────────────────────────────────────────────────┘

QATLAM 8 — SUPER-ADMIN
   ┌────────────────────────────────────────────────────┐
   │  platform_admin  (barcha modulni O'QIYDI)          │
   └────────────────────────────────────────────────────┘
```

## 4.1 Ruxsat etilgan bog'liqlik matritsasi

> Satr = kim import qiladi · Ustun = kimni import qiladi · ✅ ruxsat · ⛔ taqiq · 📨 faqat event

| ↓ importer / → | core | tenants | accounts | menu | tables | guest | ar3d | orders | payments | fiscal | loyalty | reviews | analytics | ai |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **tenants** | ✅ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **accounts** | ✅ | ✅ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **menu** | ✅ | ✅ | ⛔ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **tables** | ✅ | ✅ | ⛔ | ⛔ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **guest** | ✅ | ✅ | ⛔ | ✅ | ✅ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **ar3d** | ✅ | ✅ | ⛔ | ✅ | ⛔ | ⛔ | — | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **orders** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | — | ⛔ | ⛔ | ✅¹ | ⛔ | 📨 | ⛔ |
| **payments** | ✅ | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | — | ⛔ | ⛔ | ⛔ | 📨 | ⛔ |
| **fiscal** | ✅ | ✅ | ⛔ | ✅ | ⛔ | ⛔ | ⛔ | ✅ | ✅ | — | ⛔ | ⛔ | 📨 | ⛔ |
| **loyalty** | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ⛔ | ⛔ | — | ⛔ | 📨 | ⛔ |
| **reviews** | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ⛔ | ⛔ | ⛔ | — | 📨 | ⛔ |
| **analytics** | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | — | ⛔ |
| **notifications** | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **ai** | ✅ | ✅ | ⛔ | ✅² | ⛔ | ⛔ | ✅² | ✅² | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | — |
| **platform_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ `orders` → `loyalty.services.apply_promo()` — narx hisoblash zanjirida (faqat servis funksiyasi)
² `ai` → faqat `services.py` funksiyalari (⛔ modellar/ORM emas)

## 4.2 Siklsizlik isboti (topologik tartib)

```
core → tenants → {accounts, menu, tables} → {guest, ar3d} → orders
     → {payments, loyalty, reviews} → fiscal → {analytics, notifications} → ai → platform_admin

Har o'q chapdan o'ngga. Teskari o'q YO'Q. ⟹ Yo'naltirilgan asiklik graf (DAG) ✅
```

**CI tekshiruvi:**

```python
# tests/architecture/test_no_cross_import.py
import ast, pathlib

ALLOWED = {                       # §4.1 matritsasi kodda
    'tenants':   {'core'},
    'accounts':  {'core', 'tenants'},
    'menu':      {'core', 'tenants'},
    'tables':    {'core', 'tenants'},
    'guest':     {'core', 'tenants', 'menu', 'tables'},
    'ar3d':      {'core', 'tenants', 'menu'},
    'orders':    {'core', 'tenants', 'accounts', 'menu', 'tables', 'guest', 'loyalty'},
    'payments':  {'core', 'tenants', 'accounts', 'orders'},
    'fiscal':    {'core', 'tenants', 'menu', 'orders', 'payments'},
    'loyalty':   {'core', 'tenants', 'guest', 'orders'},
    'reviews':   {'core', 'tenants', 'guest', 'orders'},
    'analytics': {'core', 'tenants'},
    'notifications': {'core', 'tenants'},
    'ai':        {'core', 'tenants', 'menu', 'ar3d', 'orders'},
}

def test_module_dependencies():
    for app, allowed in ALLOWED.items():
        for py in pathlib.Path(f'apps/{app}').rglob('*.py'):
            tree = ast.parse(py.read_text())
            for node in ast.walk(tree):
                mods = []
                if isinstance(node, ast.ImportFrom) and node.module:
                    mods = [node.module]
                elif isinstance(node, ast.Import):
                    mods = [a.name for a in node.names]
                for m in mods:
                    if m.startswith('apps.'):
                        target = m.split('.')[1]
                        assert target == app or target in allowed, (
                            f'⛔ {app} → {target} taqiqlangan ({py}). '
                            f'Event ishlating (P5).')
```

---

# §5. `core/` QATLAMI

> `core/` — barcha modul foydalanadigan **umumiy infratuzilma**. Domen mantiqi
> ⛔ **bu yerda bo'lmaydi** (`Order`, `Dish` haqida bilmaydi).

```
core/
├── models.py          # BaseModel, TenantModel, TimeStampedModel, Job
├── middleware.py      # TenantMiddleware, ObservabilityMiddleware, ReadYourWrites
├── mixins.py          # TenantScopedMixin, IdempotentMixin, CachedListMixin
├── permissions.py     # IsGuest, IsWaiter, IsRestaurantAdmin, IsPlatformAdmin
├── exceptions.py      # ARMENUError iyerarxiyasi + DRF handler
├── resilience.py      # CircuitBreaker, retry, with_fallback_chain, timeout
├── queue.py           # enqueue, dequeue, DLQ, QUEUE_LIMITS
├── ws.py              # ws_send, group nomlari, tenant guard
├── cache.py           # versiyalangan kalit, invalidatsiya, stampede himoyasi
├── i18n.py            # 3 til, tarjima fallback, lokalizatsiya
├── idempotency.py     # @idempotent dekoratori
├── ratelimit.py       # zona-asosli rate limiter
├── events.py          # domain signal'lar
├── metrics.py         # Prometheus wrapper
├── health.py          # /healthz, /readyz, /metrics
├── storage.py         # S3 wrapper, presigned URL
└── healing/
    ├── daemon.py      # 60s sikl, distributed lock
    └── checks.py      # 15 mexanizm
```

## 5.1 Fayl kartochkalari

### `core/models.py`

```python
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta: abstract = True


class TenantModel(TimeStampedModel):
    """⚡ Tenant'ga tegishli har model shundan meros oladi."""
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   db_index=True, related_name='+')
    class Meta:
        abstract = True
        indexes = [models.Index(fields=['restaurant', '-created_at'])]


class Job(TimeStampedModel):
    """Navbat yozuvi (ADR-008). PostgreSQL'da — Redis yiqilsa yo'qolmaydi."""
    # ... §2 C6 va ADR-008 da to'liq
```

| Nima beradi | Kim ishlatadi |
|---|---|
| `TenantModel` — `restaurant` FK + indeks avtomatik | Barcha domen model |
| `Job` — navbat holati, heartbeat, trace_id | `core/queue.py`, healer |

---

### `core/middleware.py`

| Middleware | Tartib | Vazifasi |
|---|---|---|
| `ObservabilityMiddleware` | 1 | `trace_id` yaratish, davomiylik metrikasi, sekin so'rov log |
| `TenantMiddleware` | 2 | `restaurant_id` aniqlash (QR token / subdomain / staff sessiya) |
| `ReadYourWritesMiddleware` | 3 | Yozuv so'rovida primary'dan o'qish (P6) |
| `RateLimitMiddleware` | 4 | Zona-asosli limit (ADR jadvali) |
| `SecurityHeadersMiddleware` | 5 | CSP, HSTS, X-Frame-Options |

> ⚠️ **Tartib muhim:** `TenantMiddleware` `RateLimitMiddleware`dan **oldin** —
> rate limit kaliti `restaurant_id` ni ishlatadi.

---

### `core/mixins.py`

```python
class TenantScopedMixin:
    """⚡ Har tenant ViewSet'da MAJBURIY (ADR-007, P12 qatlam 1)."""
    tenant_field = 'restaurant_id'
    def get_queryset(self): ...          # §ADR-007 da to'liq
    def perform_create(self, serializer): ...


class CachedListMixin:
    """GET list javobini versiyalangan kalit bilan keshlaydi (P7)."""
    cache_ttl = 300
    cache_prefix: str

    def list(self, request, *a, **kw):
        key = f'{self.cache_prefix}:{request.restaurant_id}:{get_language()}:v{self.version()}'
        data = cache.get(key)
        if data is None:
            data = super().list(request, *a, **kw).data
            cache.set(key, data, self.cache_ttl)
        return Response(data)


class SoftDeleteMixin:
    """O'chirish = is_deleted=True. ⚡ MEMORY qoidasi: 'o'chir' = yashirish."""
    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])
```

---

### `core/permissions.py`

| Sinf | Kim | Tekshiruv |
|---|---|---|
| `IsGuest` | Mijoz | Amal qiluvchi `GuestSession` + `restaurant_id` mos |
| `IsWaiter` | Ofitsiant | `Staff.role='waiter'` + smena ochiq |
| `IsKitchen` | Oshpaz | `Staff.role='kitchen'` |
| `IsRestaurantAdmin` | Restoran admini | `Staff.role='admin'` + `restaurant_id` mos |
| `IsPlatformAdmin` | Super-admin | `User.is_platform_admin` + 2FA |
| `ReadOnlyOrAdmin` | Aralash | GET hammaga, yozuv adminga |

---

### `core/exceptions.py`

```python
class ARMENUError(APIException):
    """Barcha xatolarning ildizi. Har biri: kod, xabar (3 til), HTTP status."""
    code_name = 'armenu_error'

class TenantNotResolved(ARMENUError):     status_code = 400; code_name = 'tenant_not_resolved'
class QuotaExceeded(ARMENUError):         status_code = 402; code_name = 'quota_exceeded'
class DishUnavailable(ARMENUError):       status_code = 409; code_name = 'dish_unavailable'
class ServiceUnavailable(ARMENUError):    status_code = 503; code_name = 'service_unavailable'
class AllProvidersDown(ARMENUError):      status_code = 503; code_name = 'all_providers_down'
class QueueFull(ARMENUError):             status_code = 503; code_name = 'queue_full'
class Conflict(ARMENUError):              status_code = 409; code_name = 'conflict'

# Yagona javob formati (barcha xato uchun)
# {"error": {"code": "dish_unavailable", "message": "Somsa hozircha yo'q",
#            "detail": {...}, "trace_id": "a1b2c3d4"}}
```

---

### `core/resilience.py`

| Funksiya | Vazifasi |
|---|---|
| `CircuitBreaker` | 3 holatli avtomat (P8), holat Redis'da |
| `retry(attempts, backoff, jitter)` | Eksponensial qayta urinish dekoratori |
| `with_fallback_chain(providers, ...)` | Zanjir bo'ylab yurish (P3) |
| `timeout_guard(seconds)` | Kontekst menejer — timeout majburlash |
| `get_breaker(name)` | Ro'yxatdan breaker olish |

---

### `core/queue.py`

| Funksiya | Vazifasi |
|---|---|
| `enqueue(queue, task, *, delay=0, **payload) -> int` | Navbatga qo'yish; `trace_id` avtomatik |
| `dequeue(queue, timeout=5) -> Job \| None` | `BLPOP` + `Job` yuklash |
| `move_to_dlq(queue, job, reason)` | Dead Letter Queue |
| `promote_delayed(queue)` | Kechiktirilganlarni (ZSET) navbatga ko'chirish |
| `queue_depth(queue) -> int` | Metrik uchun |
| `QUEUE_LIMITS` | Bulkhead konfiguratsiyasi (P9) |

---

### `core/ws.py`

```python
def group_name(restaurant_id: int, channel: str) -> str:
    """⚡ Yagona nuqta — tenant'siz guruh yaratish imkonsiz (AP-17)."""
    assert channel in ('kds', 'waiters', 'admin'), f'noma\'lum kanal: {channel}'
    assert restaurant_id, 'restaurant_id majburiy'
    return f'rest_{restaurant_id}_{channel}'

def guest_group(session_id: str) -> str:
    return f'guest_{session_id}'

def ws_send(group: str, payload: dict) -> None:
    """⚡ Faqat transaction.on_commit ichida chaqiriladi (AP-09)."""
    async_to_sync(get_channel_layer().group_send)(group, {'type': 'broadcast', **payload})
```

---

### `core/cache.py`

| Funksiya | Vazifasi |
|---|---|
| `versioned_key(prefix, rid, *parts) -> str` | `menu:12:uz:v7` |
| `get_version(rid, kind) -> int` | Versiya raqami (kesh + DB) |
| `bump_version(rid, kind)` | Invalidatsiya (DELETE emas) |
| `cache_or_build(key, builder, ttl)` | Stampede himoyasi (`SET NX` lock) |
| `warm_up(restaurant_id)` | Restart'dan keyin issiq kesh (healer) |

---

### `core/i18n.py`

| Funksiya | Vazifasi |
|---|---|
| `resolve_language(request) -> str` | `?lang=` → `Accept-Language` → restoran default → `uz` |
| `translate_field(obj, field, lang) -> str` | Tarjima fallback: `lang` → `uz` → `ru` → bo'sh |
| `format_price(amount, lang) -> str` | `45 000 so'm` / `45 000 сум` / `45,000 UZS` |
| `SUPPORTED = ('uz', 'ru', 'en')` | ⚡ Kesh kalitida ishtirok etadi |

---

### `core/healing/`

**15 mexanizm (`checks.py`):**

| # | Nom | Tekshiradi | Tuzatadi |
|---|---|---|---|
| 1 | `orphan_jobs` | `running` + heartbeat > 15 daq | Qayta navbatga / DLQ |
| 2 | `stuck_orders` | `cooking` > 45 daq | ⚠️ Alert (odam kerak) |
| 3 | `db_connections` | Pool > 85% | Idle conn yopish |
| 4 | `redis_memory` | `used_memory` > 80% | Eski kalit tozalash |
| 5 | `disk_space` | > 85% | Log/temp o'chirish |
| 6 | `worker_alive` | Har navbatda ≥1 worker | systemd restart |
| 7 | `fiscal_queue` | depth > 50, 10 daq | Worker qo'shish + alert P1 |
| 8 | `ws_connections` | Keskin tushish > 20% | Daphne restart |
| 9 | `cdn_health` | Origin pull xatosi | Cache-Tag purge |
| 10 | `ai_providers` | Breaker OPEN > 30 daq | HALF_OPEN majburlash |
| 11 | `replication_lag` | > 30s | Replica'dan o'qishni to'xtatish |
| 12 | `cache_hit_ratio` | < 70% (10 daq) | Kesh warm-up |
| 13 | `dlq_depth` | > 100 | Alert + avto-retry |
| 14 | `cert_expiry` | < 14 kun | certbot renew |
| 15 | `backup_verify` | Kunlik tiklash sinovi | ⚠️ Alert |

---

# §6. FRONTEND KOMPONENTLARI

> ADR-003: Vanilla JS + PWA. 4 ta mustaqil ilova, umumiy `core.js`.

```
static/js/
├── core/
│   ├── api.js          # fetch wrapper: trace_id, idempotency key, xato
│   ├── store.js        # observable holat (~80 qator)
│   ├── realtime.js     # WS → SSE → polling (avtomatik fallback)
│   ├── i18n.js         # 3 til, `t('key')`
│   └── ui.js           # toast, modal, skeleton, spinner
├── guest/              # mijoz PWA
├── staff/              # ofitsiant PWA
├── kds/                # oshxona ekrani
└── admin/              # admin panel
```

---

## 6.1 👤 GUEST PWA (mijoz)

| Maydon | Qiymat |
|---|---|
| **Kirish** | QR skan → `https://<slug>.armenu.uz/t/<token>` |
| **Auth** | ⛔ Yo'q (anonim sessiya, 4 soat) |
| **Bundle** | ~45 KB gzip (+ `model-viewer` 250 KB, faqat AR ochilganda) |
| **Maqsad** | FCP < 1,2s, to'liq menyu < 2s (4G) |

**Sahifalar:**

| Sahifa | URL | Nima |
|---|---|---|
| Menyu | `/t/<token>/` | Kategoriyalar, taomlar, qidiruv, filtr |
| Taom | `/t/<token>/d/<id>/` | Tavsif, allergen, modifikator, ⚡ **AR tugmasi** |
| AR ko'rish | modal | `<model-viewer>` + AR rejim |
| Savat | `/t/<token>/cart/` | Ro'yxat, miqdor, izoh, jami (serverdan) |
| Buyurtma holati | `/t/<token>/o/<id>/` | ⚡ Bu yerda WS ochiladi (ADR-005) |
| To'lov | `/t/<token>/pay/<id>/` | Provayder tanlash, chaevoy |
| Sharh | `/t/<token>/review/<id>/` | Baho + smart yo'naltirish |

**JS modullar:**

| Modul | Vazifasi |
|---|---|
| `guest/menu.js` | Kategoriya navigatsiya, virtual scroll (200+ taom), qidiruv |
| `guest/dish.js` | Taom modali, modifikator tanlash, narx **oldindan ko'rsatish** (server tasdiqlaydi) |
| `guest/ar.js` | `<model-viewer>` lazy yuklash, AR tugmasi, fallback zanjiri |
| `guest/cart.js` | Savat CRUD, serverga sinxronizatsiya (debounce 400ms) |
| `guest/order.js` | Buyurtma yuborish (idempotency key), holat kuzatuvi |
| `guest/pay.js` | To'lov provayder redirect, natija kutish |

**Holat boshqaruvi:**

```javascript
// static/js/core/store.js — ~80 qator, framework o'rniga
export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach(fn => fn(state, prev));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

// static/js/guest/cart.js
export const cart = createStore({ items: [], total: 0, syncing: false });

cart.subscribe((s) => {
  document.querySelector('#cart-badge').textContent = s.items.length || '';
  document.querySelector('#cart-total').textContent = formatPrice(s.total);
});

// ⚡ Jami SERVERDAN keladi (ADR-006) — klient faqat ko'rsatadi
async function syncCart() {
  cart.set({ syncing: true });
  const data = await api.post('/v1/cart/sync/', { items: cart.get().items });
  cart.set({ total: data.total, items: data.items, syncing: false });
}
```

**Offline strategiya (Service Worker):**

| Resurs | Strategiya | Sabab |
|---|---|---|
| App shell (HTML/CSS/JS) | **Cache-first** | Darhol ochiladi |
| Menyu JSON | **Stale-while-revalidate** | Tarmoq sekin bo'lsa eski menyu ko'rinadi |
| Taom rasmlari | **Cache-first**, LRU 50 MB | Qayta ko'rishda tez |
| 3D modellar | **Network-first**, kesh 3 ta oxirgi | Katta fayl, joy tejash |
| `POST /v1/orders/` | ⛔ **Network-only** | Offline buyurtma **yo'q** (ADR-006 + fiskal) |
| Buyurtma holati | Network-first, `stale` bannerli | Offline'da "oxirgi ma'lum holat" |

```javascript
// static/sw.js — buyurtma hech qachon keshlanmaydi
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;                      // ⛔ POST kesh yo'q
  if (url.pathname.startsWith('/v1/orders')) return;           // ⛔ hech qachon
  if (url.pathname.startsWith('/v1/menu')) {
    e.respondWith(staleWhileRevalidate(e.request, 'menu-v1'));
  } else if (url.pathname.startsWith('/static/')) {
    e.respondWith(cacheFirst(e.request, 'shell-v1'));
  }
});
```

---

## 6.2 🧑‍🍳 STAFF PWA (ofitsiant)

| Maydon | Qiymat |
|---|---|
| **Kirish** | `https://<slug>.armenu.uz/staff/` → PIN |
| **Auth** | 4-6 raqamli PIN (bcrypt), smena sessiyasi 12 soat |
| **Qurilma** | Telefon (asosan), planshet |
| **Real-time** | ⚡ WS **doim ochiq** (`rest_<rid>_waiters`) |

**Sahifalar:**

| Sahifa | Nima |
|---|---|
| Zal plani | Stollar holati (bo'sh/buyurtma/xizmatda/hisob), rang bilan |
| Chaqiruvlar | Ofitsiant chaqiruvlari (ovoz + vibratsiya + qizil badge) |
| Buyurtmalar | O'z stollari buyurtmalari, holat o'zgartirish |
| Buyurtma qo'shish | Ofitsiant mijoz nomidan buyurtma kiritadi |
| Hisob | Chek, to'lov qabul qilish (naqd/karta/QR) |
| Smena | Ochish/yopish, statistika, chaevoy |

**JS modullar:**

| Modul | Vazifasi |
|---|---|
| `staff/auth.js` | PIN kiritish, sessiya saqlash, avto-lock 10 daq |
| `staff/hall.js` | Zal plani (SVG), stol holati real-time |
| `staff/calls.js` | Chaqiruv navbati, ovozli signal |
| `staff/order.js` | Buyurtma kiritish/o'zgartirish |
| `staff/bill.js` | Hisob, bo'lish, chaevoy |

**Offline strategiya:**

| Resurs | Strategiya |
|---|---|
| App shell | Cache-first |
| Menyu (buyurtma kiritish uchun) | Cache-first, 5 daq da yangilanadi |
| Zal holati | ⛔ Network-only (real-time bo'lishi shart) |
| Harakatlar (holat o'zgartirish) | 🟡 **Navbat** — offline'da `localStorage`, tarmoq kelganda yuboriladi (idempotency key bilan) |

---

## 6.3 🍳 KDS (oshxona ekrani)

| Maydon | Qiymat |
|---|---|
| **Kirish** | `https://<slug>.armenu.uz/kds/` → PIN (bir marta, doimiy sessiya) |
| **Qurilma** | TV / katta monitor, ⚡ **teginish yo'q ham bo'lishi mumkin** |
| **Real-time** | ⚡ WS majburiy (`rest_<rid>_kds`) + polling fallback 10s |
| **Alohida talab** | Ekran **hech qachon o'chmaydi** (Wake Lock API), avto-qayta yuklash 6 soatda |

**Ekran maketi:**

```
┌────────────────────────────────────────────────────────────────────┐
│  🍳 OSHXONA · Choyxona Navruz          14:32   🟢 ulangan   ⏱ 4    │
├──────────────────┬──────────────────┬──────────────────┬───────────┤
│  #047  Stol 12   │  #048  Stol 3    │  #049  Stol 7    │  #050 ... │
│  ⏱ 03:12         │  ⏱ 01:45         │  ⏱ 00:22         │           │
│  ──────────────  │  ──────────────  │  ──────────────  │           │
│  2× Osh          │  1× Lag'mon      │  3× Somsa        │           │
│    + qo'y go'sht │  1× Choy (ko'k)  │  1× Ayron        │           │
│  1× Achichuk     │                  │                  │           │
│  ──────────────  │  ──────────────  │  ──────────────  │           │
│  📝 "kam tuz"     │                  │  📝 "issiq"       │           │
│  ──────────────  │  ──────────────  │  ──────────────  │           │
│  [  TAYYOR  ]    │  [  TAYYOR  ]    │  [  TAYYOR  ]    │           │
└──────────────────┴──────────────────┴──────────────────┴───────────┘
   🟢 <5 daq      🟡 5-15 daq      🔴 >15 daq  (kartochka ramkasi rangi)
```

**JS modullar:**

| Modul | Vazifasi |
|---|---|
| `kds/board.js` | Kartochkalar grid, avtomatik joylashish, taymer |
| `kds/sound.js` | Yangi buyurtma signali (ovoz + flash) |
| `kds/wake.js` | Wake Lock API — ekran o'chmaydi |
| `kds/reconnect.js` | WS uzilsa: 1s→3s→9s→SSE→polling 10s + 🔴 indikator |

**Offline strategiya:** ⛔ Offline rejim **yo'q** — KDS tarmoqsiz ma'nosiz.
Uzilganda: qizil banner "Ulanish yo'q — oxirgi yangilanish 14:29", oxirgi holat ekranda qoladi.

---

## 6.4 👨‍💼 ADMIN (restoran boshqaruvi)

| Maydon | Qiymat |
|---|---|
| **Kirish** | `https://<slug>.armenu.uz/admin/` → login + parol |
| **Qurilma** | Desktop (asosiy), planshet |
| **Texnologiya** | Django template + server render + kichik JS (⛔ SPA emas) |
| **Real-time** | WS (`rest_<rid>_admin`) — dashboard jonli raqamlar |

**Bo'limlar:**

| Bo'lim | Nima |
|---|---|
| Dashboard | Bugungi savdo, faol stol, o'rtacha chek, ⚡ AR konversiya |
| Menyu | Kategoriya/taom CRUD, narx, stop-list, tarjima, rasm |
| 3D / AR | Model kutubxonasi, generatsiya so'rovi, tasdiqlash navbati |
| Zal va stol | Zal plani muharriri, QR generatsiya (PDF) |
| Buyurtmalar | Tarix, filtr, tafsilot, bekor qilish |
| To'lovlar | To'lovlar, qaytarishlar, chaevoy taqsimoti |
| Xodimlar | Staff CRUD, PIN, rol, smena |
| Hisobotlar | Savdo, menyu-injiniring, AR konversiya, eksport (Excel/PDF) |
| Sozlamalar | Restoran, tarif, integratsiyalar, i18n |

**JS modullar:**

| Modul | Vazifasi |
|---|---|
| `admin/dashboard.js` | Jonli raqamlar (WS), grafiklar (kichik SVG, kutubxonasiz) |
| `admin/menu-editor.js` | Inline tahrirlash, drag-drop tartib, rasm yuklash |
| `admin/model-review.js` | 3D tasdiqlash: `<model-viewer>` + tasdiqla/rad et |
| `admin/hall-editor.js` | Zal plani (SVG drag-drop) |
| `admin/reports.js` | Filtr, jadval, eksport |

**⚡ Dark + Light mavzu** — ikkalasi ham majburiy (`prefers-color-scheme` + qo'lda almashtirish,
tanlov `localStorage`da).

---

## 6.5 `core/realtime.js` — avtomatik fallback (P3)

```javascript
// static/js/core/realtime.js
const BACKOFF = [1000, 3000, 9000];

export function connect(group, onMessage) {
  let attempt = 0, mode = 'ws', es = null, poller = null;

  function openWS() {
    const ws = new WebSocket(`wss://${location.host}/ws/${group}/`);
    ws.onopen    = () => { attempt = 0; mode = 'ws'; setIndicator('🟢'); };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose   = () => {
      if (attempt < BACKOFF.length) {
        setIndicator('🟡');
        setTimeout(openWS, BACKOFF[attempt++]);
      } else {
        openSSE();                       // ⚡ 2-qatlam
      }
    };
  }

  function openSSE() {
    mode = 'sse'; setIndicator('🟡');
    es = new EventSource(`/sse/${group}/`);
    es.onmessage = (e) => onMessage(JSON.parse(e.data));
    es.onerror   = () => { es.close(); startPolling(); };   // ⚡ 3-qatlam
  }

  function startPolling() {
    mode = 'poll'; setIndicator('🔴');
    poller = setInterval(async () => {
      const data = await api.get(`/v1/updates/?group=${group}&since=${lastTs}`);
      data.events.forEach(onMessage);
    }, 10000);
  }

  openWS();
  return { close: () => { /* ... */ }, get mode() { return mode; } };
}
```

---

# §7. WORKER TURLARI (5 navbat)

> ADR-008 (Redis navbat) + P9 (bulkhead). Har navbat — alohida systemd unit,
> alohida resurs chegarasi, alohida retry siyosati.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NAVBAT           WORKER  MEM   CPU    O'RTACHA   RETRY      MAX DEPTH   │
├─────────────────────────────────────────────────────────────────────────┤
│  🎨 model3d          3    2 GB  150%   3-8 daq    3× (1/5/15m)   5 000   │
│  🧾 fiscal           5    512M  50%    2-5 s      10× (48s)        500   │
│  📱 notify           8    256M  30%    0,5-2 s    5× (1s→10m)   20 000   │
│  🤖 ai               4    1 GB  100%   3-15 s     2× (0,5/2s)    2 000   │
│  📊 analytics        2    512M  50%    50-200 ms  3× (batch)    50 000   │
└─────────────────────────────────────────────────────────────────────────┘
   ⚡ model3d 5 000 job bilan to'lса — fiscal, notify ta'sirlanmaydi
```

---

## 7.1 🎨 `queue:model3d` — 3D generatsiya

| Maydon | Qiymat |
|---|---|
| **Nima qiladi** | Rasmdan 3D model yaratish, optimizatsiya, USDZ konversiya, S3 yuklash |
| **Vazifalar** | `generate` · `optimize` · `convert_usdz` · `render_poster` · `reoptimize` |
| **O'rtacha vaqt** | **3-8 daqiqa** (AI provayder kutish 2-6 daq) |
| **Job timeout** | 900s (15 daq) |
| **Retry** | 3 marta — 1 daq, 5 daq, 15 daq |
| **Bulkhead** | 3 worker · `MemoryMax=2G` · `CPUQuota=150%` · max depth 5 000 |
| **Tashqi API** | Meshy → Tripo → Rodin (breaker + fallback zanjiri) |
| **Narx** | ~$0,20-0,50 per model |
| **Muvaffaqiyat** | ~78% (qolgani qo'lda tuzatish yoki kutubxonadan) |

```python
# apps/ar3d/tasks.py
@task('model3d', 'generate')
def generate_model(job, dish_id: int, ref_images: list[str]):
    dish = Dish.objects.select_related('category__restaurant').get(pk=dish_id)

    prepared = prepare_images(ref_images)          # fon olib tashlash, 1024×1024
    job.heartbeat()

    glb_bytes = with_fallback_chain(
        [MeshyProvider(), TripoProvider(), RodinProvider()],
        'image_to_3d', prepared, prompt=build_prompt(dish),
    )
    job.heartbeat()

    glb  = optimize_glb(glb_bytes, target_mb=4)    # Draco + KTX2
    usdz = convert_usdz(glb)                       # iOS uchun
    poster = render_poster(glb)

    urls = upload_model(dish.category.restaurant_id, dish_id, glb, usdz, poster)
    DishModel3D.objects.update_or_create(
        dish=dish, defaults={**urls, 'source': 'ai', 'status': 'review'})

    bump_version(dish.category.restaurant_id, 'menu')
    notify_admin(dish, '3D model tayyor — ko'rib chiqing')
```

**⛔ Yiqilsa:** 🟢 Kichik ta'sir. Mavjud 3D modellar ishlaydi, yangilari navbatda kutadi.

---

## 7.2 🧾 `queue:fiscal` — Fiskal chek

| Maydon | Qiymat |
|---|---|
| **Nima qiladi** | OFD'ga soliq cheki yuborish, IKPU aniqlash, chek arxivi |
| **Vazifalar** | `send_receipt` · `send_refund` · `sync_ikpu` · `close_shift` |
| **O'rtacha vaqt** | **2-5 soniya** |
| **Job timeout** | 30s |
| **Retry** | ⚡ **10 marta** — 5 daq, 15 daq, 1 soat, 6 soat... **48 soat davomida** |
| **Bulkhead** | 5 worker · `MemoryMax=512M` · max depth 500 |
| **Tashqi API** | UZKASSA → e-POS (breaker `fail_threshold=3, timeout=120`) |
| **Kritiklik** | 🔴 **Eng yuqori** — soliq javobgarligi |

```python
@task('fiscal', 'send_receipt', max_attempts=10)
def send_receipt(job, order_id: int):
    order = Order.objects.select_related('restaurant').prefetch_related('items__dish').get(pk=order_id)

    if Receipt.objects.filter(order_id=order_id, status='sent').exists():
        return                                     # ⚡ idempotent (P4)

    payload = build_fiscal_payload(order)          # IKPU, QQS, summa
    result = with_fallback_chain(
        [UzkassaOFD(order.restaurant), EposOFD(order.restaurant)],
        'send', payload,
    )
    Receipt.objects.create(order=order, provider=result.provider,
                           fiscal_sign=result.sign, url=result.url, status='sent')
    ws_send(group_name(order.restaurant_id, 'admin'),
            {'type': 'receipt.sent', 'order_id': order_id})
```

**⛔ Yiqilsa:** 🟡 O'rta. Buyurtma va to'lov ishlaydi, chek navbatda.
Soliq muddati 24 soat — 48 soatlik retry byudjeti yetarli.
**Alert:** depth > 50 (10 daq) → 🔴 **P1** (Telegram + qo'ng'iroq).
DLQ'ga tushsa → darhol P1 + qo'lda chek chiqarish ko'rsatmasi.

---

## 7.3 📱 `queue:notify` — Bildirishnoma

| Maydon | Qiymat |
|---|---|
| **Nima qiladi** | Telegram, web-push, SMS, email, oshxona printeri |
| **Vazifalar** | `telegram_new_order` · `push_order_ready` · `kitchen_print` · `sms_otp` · `email_report` |
| **O'rtacha vaqt** | **0,5-2 soniya** |
| **Job timeout** | 20s |
| **Retry** | 5 marta — 1s, 5s, 30s, 2 daq, 10 daq (jami ~13 daq) |
| **Bulkhead** | 8 worker · `MemoryMax=256M` · max depth 20 000 |
| **Tashqi API** | Telegram Bot API, Web Push (VAPID), SMS gateway |

**⛔ Yiqilsa:** 🟢 Kichik. Buyurtma ishlaydi, bildirishnoma kechikadi.
KDS baribir WS orqali ko'radi (bildirishnoma dublikat kanal).

---

## 7.4 🤖 `queue:ai` — AI so'rovlar

| Maydon | Qiymat |
|---|---|
| **Nima qiladi** | Menyu tarjimasi, taom tavsifi, embedding, og'ir AI tahlil |
| **Vazifalar** | `translate_menu` · `generate_description` · `embed_dish` · `menu_insights` |
| **O'rtacha vaqt** | **3-15 soniya** |
| **Job timeout** | 60s |
| **Retry** | 2 marta — 0,5s, 2s (keyin **boshqa provayder**) |
| **Bulkhead** | 4 worker · `MemoryMax=1G` · max depth 2 000 |
| **Tashqi API** | Gemini → Haiku → GPT-mini → Groq → DeepSeek → Sonnet |
| **Xarajat nazorati** | `armenu_ai_cost_usd_total{provider,model}` · alert > $50/kun |

> ⚡ **Mijoz chatbot bu navbatda EMAS.** Chat — sinxron (web so'rovda), 8s timeout bilan.
> Sabab: mijoz javob kutadi. Navbat — faqat **fon** AI ishlari uchun.

**⛔ Yiqilsa:** 🟢 Ta'sir yo'q. Tarjima/tavsif kechikadi. Chatbot alohida yo'ldan ishlaydi.

---

## 7.5 📊 `queue:analytics` — Analitika

| Maydon | Qiymat |
|---|---|
| **Nima qiladi** | Event'larni batch qilib ClickHouse'ga yozish, materialized view yangilash |
| **Vazifalar** | `ingest` (batch) · `refresh_mv` · `daily_rollup` · `export_report` |
| **O'rtacha vaqt** | **50-200 ms** (batch 1 000 ta) |
| **Job timeout** | 120s |
| **Retry** | 3 marta (batch bilan) → DLQ |
| **Bulkhead** | 2 worker · `MemoryMax=512M` · max depth 50 000 |
| **Prioritet** | 🟢 Eng past |
| **Batch** | 1 000 ta yoki 5 soniya (qaysi biri oldin) |

**⛔ Yiqilsa:** 🟢 Biznesga ta'sir yo'q. Event'lar navbatda to'planadi
(max depth 50 000 — ~2 soatlik zaxira), keyin yoziladi.

---

## 7.6 Worker umumiy jadvali

| Navbat | Worker | RAM | CPU | Vaqt | Retry | Depth | Timeout | Yiqilsa |
|---|---|---|---|---|---|---|---|---|
| `model3d` | 3 | 2 GB | 150% | 3-8 daq | 3× (1/5/15 daq) | 5 000 | 900s | 🟢 |
| `fiscal` | 5 | 512 MB | 50% | 2-5 s | 10× (48 soat) | 500 | 30s | 🟡 |
| `notify` | 8 | 256 MB | 30% | 0,5-2 s | 5× (13 daq) | 20 000 | 20s | 🟢 |
| `ai` | 4 | 1 GB | 100% | 3-15 s | 2× + provayder | 2 000 | 60s | 🟢 |
| `analytics` | 2 | 512 MB | 50% | 50-200 ms | 3× (batch) | 50 000 | 120s | 🟢 |

**systemd shabloni:**

```ini
# deploy/systemd/armenu-worker@.service
[Unit]
Description=ARMENU worker (%i)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=armenu
WorkingDirectory=/opt/armenu
EnvironmentFile=/opt/armenu/.env
ExecStart=/opt/armenu/venv/bin/python manage.py run_worker --queue=%i
Restart=always
RestartSec=5
# ⚡ Bulkhead (P9) — qiymatlar drop-in fayldan keladi
# /etc/systemd/system/armenu-worker@model3d.service.d/limits.conf:
#   [Service]
#   MemoryMax=2G
#   CPUQuota=150%

[Install]
WantedBy=multi-user.target
```

```bash
# Ishga tushirish
systemctl enable --now armenu-worker@model3d.service
systemctl enable --now armenu-worker@fiscal.service
systemctl enable --now armenu-worker@notify.service
systemctl enable --now armenu-worker@ai.service
systemctl enable --now armenu-worker@analytics.service
```

---

# §8. KOMPONENT ↔ ADR ↔ FAZA MATRITSASI

| Komponent | Amalga oshiruvchi ADR | Printsip | Faza |
|---|---|---|---|
| C2 nginx | 010, 012 | P7 | F0 |
| C3 web | 001, 010, 012 | P1, P2 | F0 |
| C4 ws | 005 | P3, P12 | F6 |
| C5 db | 002, 007 | P6, P12 | F0 |
| C6 redis | 008 | P1, P4, P7, P8 | F0 |
| C7 s3 | 011 | P3 | F5 |
| C8 worker | 008 | P9 | F0 (skelet), F5+ |
| C9 healer | — | P3, P10 | F12 |
| C10 clickhouse | 013 | P9 | F11 (S2) |
| `apps/tenants` | 007 | P12 | F1 |
| `apps/accounts` | 007 | P12 | F1 |
| `apps/menu` | 002, 006, 012 | P7, P11 | F2 |
| `apps/tables` | 007 | P11 | F3 |
| `apps/guest` | 003 | P1 | F3-F4 |
| `apps/ar3d` | 004, 011 | P3, P9 | F5 |
| `apps/orders` | 001, 006 | P4, P5, P11 | F6 |
| `apps/payments` | 014 | P4, P8, P12 | F7 |
| `apps/fiscal` | — | P8, P9 | F8 |
| `apps/ai` | 009 | P3, P8, P12 | F9 |
| `apps/loyalty` | — | P5 | F10 |
| `apps/reviews` | — | P5 | F10 |
| `apps/analytics` | 013 | P5, P9 | F11 |
| Guest PWA | 003, 004, 005 | P3 | F4-F5 |
| Staff PWA | 003 | P3, P4 | F6 |
| KDS | 003, 005 | P3 | F6 |
| Admin | 003 | P12 | F2+ |
| `core/` | 001, 007, 008 | P1-P12 | F0 |

---

**➡️ Keyingi:** `03_MALUMOT_ARXITEKTURASI.md`
