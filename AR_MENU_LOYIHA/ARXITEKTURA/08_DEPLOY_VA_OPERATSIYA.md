# ARMENU — TIZIM ARXITEKTURASI
## QISM 8 — DEPLOY VA OPERATSIYA

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** DevOps · backend dasturchi · on-call navbatchi · texnik direktor
**Oldingi:** `07_INTEGRATSIYALAR.md` · **Bu — arxitektura hujjatining oxirgi qismi**

---

## 1. MUHITLAR

### 1.1 Uch muhit

| | **dev** | **staging** | **prod** |
|---|---|---|---|
| Maqsad | Lokal ishlab chiqish | Sinov, pilot demo, chaos | Ishlab chiqarish |
| Domen | `localhost:8060` | `stage.armenu.uz` | `armenu.uz` |
| Server | Dasturchi noutbuki | 1 × VPS (2 CPU / 4 GB) | S0→S5 (§2) |
| DB | `armenu_dev` (lokal PG) | `armenu_stage` | `armenu_db` |
| Redis db | 15 (lokal) | 5 / 6 (stage instance) | **5 (kesh) / 6 (channels)** |
| Ma'lumot | Demo seed (5 restoran) | ⚡ **Anonimlashtirilgan** prod nusxasi | Real |
| To'lov | Mock adapter | Sandbox (test.paycom.uz) | 🔴 Real |
| Fiskal | Mock adapter | Test terminal | 🔴 Real OFD |
| AI | Real (arzon model, past limit) | Real (limit $5/kun) | Real ($500/oy) |
| CDN | Yo'q (nginx to'g'ridan) | Cloudflare (dev rejim) | Cloudflare (full) |
| Debug | `DEBUG=True` | `DEBUG=False` | `DEBUG=False` |
| Kirish | Dasturchi | Jamoa + pilot restoranlar | ⛔ Faqat on-call + audit |
| Backup | Yo'q | Haftalik | ⚡ Kunlik + WAL |
| Monitoring | Yo'q | Prometheus (yengil) | To'liq stek |
| Deploy | `runserver` | `main` push (auto) | ⚡ **Tag push + tasdiq** |
| Xarajat | $0 | ~$12/oy | $40 → $4 400/oy |

### 1.2 Anonimlashtirish (staging uchun)

> ⚡ Prod ma'lumoti staging'ga **hech qachon xom holda** ko'chirilmaydi (GDPR + O'zbekiston
> shaxsiy ma'lumot qonuni).

```bash
# manage.py anonymize_dump — prod dump'ni staging uchun tozalaydi
/home/armenu/app/venv/bin/python manage.py anonymize_dump \
    --in  /backup/armenu_prod_2026-09-08.dump \
    --out /backup/armenu_stage_2026-09-08.dump

# Nima o'zgaradi:
#   telefon      → +998 90 000 00 XX  (ketma-ket)
#   email        → user<id>@example.invalid
#   mijoz ismi   → "Mijoz <id>"
#   Telegram id  → NULL
#   to'lov karta → allaqachon saqlanmaydi (PCI DSS)
#   fiskal chek  → fiscal_sign randomlashtiriladi
#   API kalitlar → o'chiriladi
#   AI kalitlar  → o'chiriladi (env'dan keladi)
```

### 1.3 Muhit o'zgaruvchilari (farqlanuvchi qism)

```bash
# .env.prod (600, armenu:armenu)
DJANGO_ENV=production
DEBUG=0
SECRET_KEY=<64 belgi>
ALLOWED_HOSTS=armenu.uz,www.armenu.uz,api.armenu.uz

DB_NAME=armenu_db
DB_USER=armenu
DB_HOST=127.0.0.1
DB_PORT=5432
DB_CONN_MAX_AGE=60

REDIS_URL=redis://127.0.0.1:6379/5           # ⚡ db=5 kesh
REDIS_CHANNELS_URL=redis://127.0.0.1:6379/6  # ⚡ db=6 channels

WEB_PORT=8060
WS_PORT=8061

MEDIA_ROOT=/var/armenu/media
STATIC_ROOT=/home/armenu/app/staticfiles

AI_DAILY_LIMIT_PER_RESTAURANT=2.0
AI_MONTHLY_LIMIT_TOTAL=500.0
AI_CACHE_TTL=3600

SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_ENABLED=1
```

---

## 2. INFRATUZILMA TARKIBI

### 2.1 S0 — Start (1-20 restoran)

```
┌──────────────────────────────────────────────────┐
│  1 × VPS — 4 vCPU / 8 GB RAM / 100 GB NVMe       │
│  Ubuntu 24.04 LTS · Toshkent yoki Frankfurt DC   │
│                                                  │
│  nginx (443/80)                                  │
│  ├── armenu.socket → armenu.service (gunicorn×4) │
│  ├── armenu-ws.service (daphne ×1) :8061         │
│  ├── armenu-worker@ ×5                           │
│  └── armenu-healer.service                       │
│                                                  │
│  PostgreSQL 16 + pgvector   (shared_buffers 2GB) │
│  Redis 7                    (maxmemory 1GB)      │
│  MinIO                      (3D fayllar, 40 GB)  │
└──────────────────────────────────────────────────┘
```

| Element | Spec | Rol | Narx/oy |
|---|---|---|---|
| VPS | 4 vCPU / 8 GB / 100 GB NVMe | Hammasi | $28 |
| Backup storage | 200 GB S3 | Kunlik dump + WAL | $5 |
| Cloudflare | Free tarif | CDN + WAF | $0 |
| Domen + TLS | armenu.uz + Let's Encrypt | — | $2 |
| Monitoring | Uptime Robot (free) | Tashqi uptime | $0 |
| **JAMI** | | | **~$35-40** |

### 2.2 S3 — Respublika (400-1500 restoran)

| # | Server | Spec | Rol | Soni | Narx/oy |
|---|---|---|---|---|---|
| 1 | `lb-01/02` | 2 vCPU / 4 GB | nginx LB + TLS | 2 | $28 |
| 2 | `web-01..04` | 4 vCPU / 8 GB | gunicorn (8 worker) | 4 | $112 |
| 3 | `ws-01/02` | 4 vCPU / 8 GB | daphne (WebSocket) | 2 | $56 |
| 4 | `worker-01..03` | 4 vCPU / 8 GB | 5 navbat × 3 node | 3 | $84 |
| 5 | `pg-primary` | 8 vCPU / 32 GB / 500 GB NVMe | PostgreSQL primary | 1 | $160 |
| 6 | `pg-replica-01/02` | 4 vCPU / 16 GB / 500 GB | Read replica | 2 | $160 |
| 7 | `redis-01..03` | 2 vCPU / 8 GB | Redis + Sentinel | 3 | $84 |
| 8 | `obs-01` | 4 vCPU / 8 GB / 200 GB | Prometheus+Grafana+Loki | 1 | $28 |
| 9 | S3 (object storage) | 2 TB + trafik | 3D fayl, backup | — | $50 |
| 10 | Cloudflare Pro | — | CDN + WAF + analitika | — | $20 |
| | | | | **JAMI** | **~$700** |

```
                     ┌──── Cloudflare ────┐
                     ▼                    ▼
              ┌──────────┐          ┌──────────┐
              │  lb-01   │          │  lb-02   │   (keepalived VIP)
              └────┬─────┘          └────┬─────┘
                   └────────┬────────────┘
          ┌────────┬────────┼────────┬────────┐
          ▼        ▼        ▼        ▼        ▼
       web-01   web-02   web-03   web-04   ws-01/02
          └────────┴────────┼────────┴────────┘
                            ▼
            ┌───────────────┴───────────────┐
            ▼               ▼               ▼
      pg-primary      pg-replica×2      redis×3 (sentinel)
            ▲
            │
      worker-01..03  ──────▶  S3 / CDN
```

### 2.3 S5 — 1 mln bir vaqtda

| Element | Soni | Spec | Narx/oy |
|---|---|---|---|
| LB | 4 | 4 vCPU / 8 GB | $112 |
| WEB | 40 | 4 vCPU / 8 GB | $1 120 |
| WS | 3 | 8 vCPU / 16 GB | $168 |
| WORKER | 6 | 8 vCPU / 16 GB | $336 |
| PG primary | 1 | 16 vCPU / 64 GB / 2 TB | $420 |
| PG replica | 3 | 8 vCPU / 32 GB / 2 TB | $480 |
| Redis cluster | 6 | 4 vCPU / 16 GB | $336 |
| ClickHouse (analitika) | 2 | 8 vCPU / 32 GB / 4 TB | $340 |
| Obs stack | 2 | 8 vCPU / 16 GB / 1 TB | $112 |
| S3 + CDN + trafik | — | 20 TB | $700 |
| Zaxira / rezerv | — | — | $276 |
| **JAMI** | | | **~$4 400** |

> Daromadning **1,9%** (S5 da ~$230k/oy). ✅ Sog'lom.

### 2.4 Bazaviy o'rnatish (S0)

```bash
# 1. Foydalanuvchi
sudo adduser --system --group --home /home/armenu --shell /bin/bash armenu

# 2. Paketlar
sudo apt update && sudo apt install -y \
    python3.12 python3.12-venv python3.12-dev build-essential \
    postgresql-16 postgresql-16-pgvector postgresql-contrib \
    redis-server nginx certbot python3-certbot-nginx \
    git curl jq htop ncdu

# 3. DB
sudo -u postgres psql <<'SQL'
CREATE USER armenu WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE armenu_db OWNER armenu ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;
\c armenu_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
SQL

# 4. Media papkasi — ⚡ egasi armenu (root:root QOLDIRILMAYDI)
sudo mkdir -p /var/armenu/media/{ar,dish,qr,receipt} /var/log/armenu
sudo chown -R armenu:armenu /var/armenu /var/log/armenu
sudo chmod 750 /var/armenu/media/receipt        # chek — maxfiy

# 5. Kod
sudo -u armenu git clone git@github.com:<org>/armenu.git /home/armenu/app
sudo -u armenu python3.12 -m venv /home/armenu/app/venv
sudo -u armenu /home/armenu/app/venv/bin/pip install -r /home/armenu/app/requirements.txt

# 6. .env
sudo -u armenu cp /home/armenu/app/.env.example /home/armenu/app/.env
sudo chmod 600 /home/armenu/app/.env
```

---

## 3. ⛔ IZOLYATSIYA KAFOLATI

> 🔴 **MUTLAQ QOIDA:** ARMENU `mebelcity_platform` bilan **bir serverda ishlashi mumkin**,
> lekin unga **HECH QANDAY tarzda tegmaydi**. Bitta buyruq ham `bittada-*` servisini,
> `tenant_*` bazasini yoki 8040/8041 portini o'zgartirmaydi.

### 3.1 To'liq ajratish jadvali

| Resurs | 🟦 mebelcity_platform | 🟩 ARMENU | To'qnashuv |
|---|---|---|---|
| **Linux user** | `user` | `armenu` | ❌ yo'q |
| **Home** | `/home/user/mebelcity_platform` | `/home/armenu/app` | ❌ yo'q |
| **Web port** | `127.0.0.1:8040` | `127.0.0.1:8060` | ❌ yo'q |
| **WS port** | `127.0.0.1:8041` | `127.0.0.1:8061` | ❌ yo'q |
| **PostgreSQL DB** | `tenant_mebelcity`, `bittada_*` | `armenu_db` | ❌ yo'q |
| **PostgreSQL user** | `bittada` | `armenu` | ❌ yo'q |
| **Redis db** | 0-4 | **5 (kesh), 6 (channels)** | ❌ yo'q |
| **systemd unit** | `bittada-*` | `armenu*` | ❌ yo'q |
| **nginx site** | `bittada.conf`, `mebelcity.conf` | `armenu.conf` | ❌ yo'q |
| **Domen** | `mebelcity.bittada.uz`, `admin.bittada.uz` | `armenu.uz` | ❌ yo'q |
| **Media** | `/home/user/mebelcity_platform/media` | `/var/armenu/media` | ❌ yo'q |
| **Log** | `/var/log/bittada/` | `/var/log/armenu/` | ❌ yo'q |
| **venv** | `platform_venv` | `/home/armenu/app/venv` | ❌ yo'q |
| **Cron** | `user` crontab | `armenu` crontab | ❌ yo'q |
| **Git repo** | `mebelcity_platform` | `armenu` (alohida) | ❌ yo'q |

### 3.2 sudoers cheklovi — ⚡ eng muhim kafolat

```bash
# /etc/sudoers.d/armenu   (chmod 440, visudo -c bilan tekshiring)
# ⛔ armenu foydalanuvchisi FAQAT armenu* servislarini boshqara oladi.
#    bittada-* ga urinish "command not allowed" beradi.

Cmnd_Alias ARMENU_SVC = \
    /usr/bin/systemctl reload  armenu, \
    /usr/bin/systemctl restart armenu, \
    /usr/bin/systemctl start   armenu, \
    /usr/bin/systemctl stop    armenu, \
    /usr/bin/systemctl status  armenu, \
    /usr/bin/systemctl reload  armenu.service, \
    /usr/bin/systemctl restart armenu.service, \
    /usr/bin/systemctl restart armenu-ws, \
    /usr/bin/systemctl restart armenu-ws.service, \
    /usr/bin/systemctl restart armenu-healer, \
    /usr/bin/systemctl restart armenu-workers.target, \
    /usr/bin/systemctl restart "armenu-worker@*", \
    /usr/bin/systemctl status  "armenu*", \
    /usr/bin/systemctl is-active "armenu*"

Cmnd_Alias ARMENU_NGINX = \
    /usr/sbin/nginx -t, \
    /usr/bin/systemctl reload nginx

armenu ALL=(root) NOPASSWD: ARMENU_SVC, ARMENU_NGINX

# ⛔ QAT'IY TAQIQ (aniq bloklash)
armenu ALL=(ALL) !/usr/bin/systemctl *bittada*
armenu ALL=(ALL) !/usr/bin/systemctl *mebelcity*
armenu ALL=(ALL) !/bin/su, !/usr/bin/sudo -u user *
armenu ALL=(ALL) !/usr/bin/psql -d tenant_*
armenu ALL=(ALL) !/usr/bin/psql -d bittada*
```

### 3.3 PostgreSQL darajasida bloklash

```sql
-- armenu FAQAT armenu_db ga kira oladi
REVOKE ALL ON DATABASE tenant_mebelcity FROM armenu;
REVOKE ALL ON DATABASE postgres FROM armenu;
REVOKE CONNECT ON DATABASE tenant_mebelcity FROM PUBLIC;

-- teskarisi ham
REVOKE ALL ON DATABASE armenu_db FROM bittada;
REVOKE CONNECT ON DATABASE armenu_db FROM PUBLIC;
GRANT  CONNECT ON DATABASE armenu_db TO armenu;
```

```
# /etc/postgresql/16/main/pg_hba.conf — aniq qatorlar
# TYPE  DATABASE          USER      ADDRESS       METHOD
local   armenu_db         armenu                  scram-sha-256
host    armenu_db         armenu    127.0.0.1/32  scram-sha-256
# ⛔ armenu boshqa hech qaysi bazaga qator OLMAYDI
```

### 3.4 Redis darajasida bloklash (ACL)

```bash
# /etc/redis/redis.conf
# ARMENU faqat db 5 va 6 ga, faqat o'z prefiksiga
user armenu on >CHANGE_ME ~armenu:* ~asgi:* &armenu:* \
     +@read +@write +@keyspace +@pubsub -@dangerous -flushall -flushdb -config

# ⛔ FLUSHALL taqiqlangan — mebelcity keshini o'chira olmaydi
```

```python
# config/settings.py — ⚡ ARMENU tomonidan qo'shimcha himoya
CACHES = {'default': {
    'BACKEND': 'django_redis.cache.RedisCache',
    'LOCATION': os.environ['REDIS_URL'],          # .../5
    'KEY_PREFIX': 'armenu',                        # ⚡ har kalit armenu: bilan
    'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
}}
CHANNEL_LAYERS = {'default': {
    'BACKEND': 'channels_redis.core.RedisChannelLayer',
    'CONFIG': {'hosts': [os.environ['REDIS_CHANNELS_URL']],   # .../6
               'prefix': 'armenu:asgi'},
}}
```

### 3.5 Tekshiruv buyruqlari — ⚡ deploy'dan OLDIN va KEYIN

```bash
#!/bin/bash
# /home/armenu/app/scripts/izolyatsiya_tekshir.sh
# Har deploy'dan oldin va keyin ishga tushiriladi. Xato → deploy TO'XTAYDI.
set -uo pipefail
FAIL=0
ok()   { echo "✅ $1"; }
bad()  { echo "⛔ $1"; FAIL=1; }

echo "=== ARMENU izolyatsiya tekshiruvi ==="

# 1. PORT — 8040/8041 ga tegilmaganmi
ss -ltnp 2>/dev/null | grep -q '127.0.0.1:8040' \
  && ok "8040 (mebelcity) ochiq va tegilmagan" \
  || bad "8040 YO'Q — mebelcity yiqilgan bo'lishi mumkin!"
ss -ltnp 2>/dev/null | grep -q '127.0.0.1:8060' \
  && ok "8060 (armenu) ochiq" || bad "8060 yo'q"

# 2. SERVIS — bittada-* hammasi active
for s in bittada-manager bittada-manager-ws; do
  systemctl is-active --quiet "$s" && ok "$s active" || bad "$s ACTIVE EMAS!"
done

# 3. armenu FAQAT armenu* servislarini ko'radi
systemctl list-units --no-legend 'armenu*' | awk '{print $1}' | \
  grep -v '^armenu' && bad "armenu* dan tashqari unit topildi" || ok "unit nomlari toza"

# 4. DB — armenu foydalanuvchisi tenant_* ga kira olmasligi SHART
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U armenu -d tenant_mebelcity \
  -c 'SELECT 1' >/dev/null 2>&1 \
  && bad "🔴 armenu tenant_mebelcity ga KIRA OLDI!" \
  || ok "armenu tenant_mebelcity ga kira olmaydi"

# 5. REDIS — faqat db 5/6 va armenu: prefiksi
redis-cli -n 5 --scan --pattern '*' --count 500 | head -50 | \
  grep -v '^armenu' | head -1 | grep -q . \
  && bad "db=5 da armenu: prefiksisiz kalit bor" || ok "Redis db=5 prefiks toza"
redis-cli -n 0 DBSIZE >/dev/null 2>&1 && ok "db=0 (mebelcity) tirik"

# 6. FAYL TIZIMI — armenu mebelcity papkasiga yoza olmasligi SHART
sudo -u armenu touch /home/user/mebelcity_platform/.armenu_test 2>/dev/null \
  && { bad "🔴 armenu mebelcity papkasiga YOZA OLDI!"; \
       rm -f /home/user/mebelcity_platform/.armenu_test; } \
  || ok "armenu mebelcity papkasiga yoza olmaydi"

# 7. SUDO — bittada servisiga urinish rad etilishi SHART
sudo -u armenu sudo -n systemctl restart bittada-manager 2>&1 | \
  grep -qi 'not allowed\|password' \
  && ok "sudo bittada-manager RAD ETILDI" \
  || bad "🔴 armenu bittada-manager ni restart qila oldi!"

# 8. NGINX — konfiglar aralashmagan
grep -rl '8060\|8061' /etc/nginx/sites-enabled/ | grep -v armenu \
  && bad "armenu porti boshqa nginx konfigida" || ok "nginx konfiglar ajratilgan"
grep -rl '8040\|8041' /etc/nginx/sites-enabled/armenu.conf 2>/dev/null \
  && bad "armenu.conf da mebelcity porti bor!" || ok "armenu.conf toza"

echo "===================================="
[ $FAIL -eq 0 ] && { echo "✅ IZOLYATSIYA BUTUN"; exit 0; } \
                || { echo "⛔ IZOLYATSIYA BUZILGAN — DEPLOY TO'XTATILDI"; exit 1; }
```

```bash
# Tez qo'lda tekshiruv (bir qator)
systemctl list-units 'armenu*' 'bittada*' --no-pager | \
  awk '{printf "%-32s %s\n", $1, $4}'
```

### 3.6 Nima QILINMAYDI (qora ro'yxat)

```
⛔ /etc/systemd/system/bittada-*.service        — TAHRIRLANMAYDI, O'QILMAYDI ham shart emas
⛔ /etc/nginx/sites-*/bittada*                  — TEGILMAYDI
⛔ /etc/nginx/nginx.conf                        — faqat `include` qatori qo'shiladi, 1 marta
⛔ psql -d tenant_mebelcity                     — HECH QACHON
⛔ redis-cli -n 0..4 (yoki FLUSHALL/FLUSHDB)    — HECH QACHON
⛔ systemctl restart bittada-*                  — HECH QACHON
⛔ /home/user/mebelcity_platform/**             — o'qilmaydi, yozilmaydi
⛔ platform_venv/bin/*                          — ishlatilmaydi
⛔ Umumiy `sudo systemctl daemon-reload` restart kaskadi — faqat armenu unitlari
```

---

## 4. SYSTEMD ARXITEKTURASI

### 4.1 Bog'liqlik grafi

```
                          multi-user.target
                                  │
        ┌─────────────────┬───────┴────────┬──────────────────┐
        ▼                 ▼                ▼                  ▼
  sockets.target    armenu-ws.service  armenu-healer   armenu-workers.target
        │                 │             .service              │
        ▼                 │                                   ├── armenu-worker@model3d
  armenu.socket           │                                   ├── armenu-worker@fiscal
  (:8060 ushlab turadi)   │                                   ├── armenu-worker@notify
        │                 │                                   ├── armenu-worker@ai
        ▼                 │                                   └── armenu-worker@analytics
  armenu.service          │
  (gunicorn, Type=notify) │
        │                 │
        └────────┬────────┴───────────────────┬──────────────┘
                 ▼                            ▼
         postgresql.service            redis-server.service
                 │                            │
                 └──────────┬─────────────────┘
                            ▼
                     network-online.target

⚡ SOCKET ACTIVATION: armenu.socket portni USHLAB TURADI.
   armenu.service restart bo'lganda ham port ochiq qoladi →
   kiruvchi so'rovlar navbatga tushadi → ZERO-DOWNTIME.
```

### 4.2 `armenu.socket`

```ini
# /etc/systemd/system/armenu.socket
[Unit]
Description=ARMENU web socket (:8060)
PartOf=armenu.service

[Socket]
ListenStream=127.0.0.1:8060
NoDelay=true
ReusePort=true
Backlog=2048
# ⚡ Servis restart bo'lganda ham socket ochiq qoladi
Accept=no
SocketUser=armenu
SocketGroup=armenu
SocketMode=0660

[Install]
WantedBy=sockets.target
```

### 4.3 `armenu.service` (gunicorn)

```ini
# /etc/systemd/system/armenu.service
[Unit]
Description=ARMENU web (gunicorn, :8060)
Requires=armenu.socket
After=network-online.target postgresql.service redis-server.service armenu.socket
Wants=network-online.target

[Service]
Type=notify
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment=PYTHONUNBUFFERED=1
Environment=DJANGO_SETTINGS_MODULE=config.settings

ExecStartPre=/home/armenu/app/venv/bin/python manage.py check --deploy --fail-level ERROR
ExecStart=/home/armenu/app/venv/bin/gunicorn config.wsgi:application \
    --bind fd://3 \
    --workers 8 --threads 4 --worker-class gthread \
    --timeout 60 --graceful-timeout 30 --keep-alive 5 \
    --max-requests 2000 --max-requests-jitter 200 \
    --worker-tmp-dir /dev/shm \
    --access-logfile - --error-logfile - --log-level info \
    --access-logformat '%({X-Request-Id}i)s %(h)s "%(r)s" %(s)s %(b)s %(M)sms'

ExecReload=/bin/kill -s HUP $MAINPID
KillSignal=SIGTERM
TimeoutStopSec=45
Restart=always
RestartSec=5

# Resurs chegaralari
LimitNOFILE=65535
MemoryMax=4G
MemoryHigh=3G
CPUWeight=200
TasksMax=4096

# ⛔ IZOLYATSIYA — mebelcity papkasiga umuman kira olmaydi
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/armenu /var/log/armenu /home/armenu/app/staticfiles
InaccessiblePaths=/home/user
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
```

### 4.4 `armenu-ws.service` (daphne)

```ini
# /etc/systemd/system/armenu-ws.service
[Unit]
Description=ARMENU WebSocket (daphne, :8061)
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment=DJANGO_SETTINGS_MODULE=config.settings

ExecStart=/home/armenu/app/venv/bin/daphne \
    -b 127.0.0.1 -p 8061 \
    --proxy-headers \
    --application-close-timeout 20 \
    --websocket_timeout 3600 \
    --access-log - \
    config.asgi:application

# ⚡ WS stateful — SIGTERM'da klientlar reconnect qiladi (exponential backoff)
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=5

LimitNOFILE=131072          # ⚡ WS ulanishlar ko'p
MemoryMax=4G
TasksMax=8192

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/armenu /var/log/armenu
InaccessiblePaths=/home/user

[Install]
WantedBy=multi-user.target
```

### 4.5 `armenu-worker@.service` (template — 5 instans)

```ini
# /etc/systemd/system/armenu-worker@.service
[Unit]
Description=ARMENU worker — %i navbati
After=network-online.target postgresql.service redis-server.service
PartOf=armenu-workers.target

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment=DJANGO_SETTINGS_MODULE=config.settings
Environment=WORKER_QUEUE=%i

ExecStart=/home/armenu/app/venv/bin/python manage.py run_worker \
    --queue=%i --concurrency=2 --heartbeat=30

# ⚡ Graceful: joriy vazifa tugaguncha kutadi
KillSignal=SIGTERM
TimeoutStopSec=120
Restart=always
RestartSec=10

# Navbatga qarab resurs (drop-in bilan override qilinadi)
MemoryMax=2G
MemoryHigh=1500M
CPUWeight=100

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/armenu /var/log/armenu
InaccessiblePaths=/home/user

[Install]
WantedBy=armenu-workers.target
```

```ini
# /etc/systemd/system/armenu-worker@model3d.service.d/override.conf
# ⚡ 3D generatsiya og'ir va uzoq (10 daqiqagacha)
[Service]
MemoryMax=4G
TimeoutStopSec=900
Environment=WORKER_TASK_TIMEOUT=900
```

```ini
# /etc/systemd/system/armenu-worker@fiscal.service.d/override.conf
# ⚡ Fiskal — qonuniy, hech qachon to'xtamasin
[Service]
Restart=always
RestartSec=3
MemoryMax=1G
```

### 4.6 `armenu-workers.target`

```ini
# /etc/systemd/system/armenu-workers.target
[Unit]
Description=ARMENU barcha worker navbatlari
Requires=armenu-worker@model3d.service \
         armenu-worker@fiscal.service \
         armenu-worker@notify.service \
         armenu-worker@ai.service \
         armenu-worker@analytics.service
After=armenu.service

[Install]
WantedBy=multi-user.target
```

| Navbat | Vazifa | Konkurentlik | RAM | Timeout |
|---|---|---|---|---|
| `model3d` | AI 3D generatsiya, GLB→USDZ, Draco siqish | 2 | 4 GB | 900 s |
| `fiscal` | OFD chek yuborish, 48 soatlik retry | 4 | 1 GB | 60 s |
| `notify` | Telegram, WS push, email, printer | 8 | 1 GB | 30 s |
| `ai` | Tarjima, sentiment, embedding | 4 | 2 GB | 120 s |
| `analytics` | Event agregatsiya, hisobot, reconciliation | 2 | 2 GB | 600 s |

### 4.7 `armenu-healer.service`

```ini
# /etc/systemd/system/armenu-healer.service
[Unit]
Description=ARMENU self-healing daemon (15 mexanizm)
After=armenu.service postgresql.service redis-server.service

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
ExecStart=/home/armenu/app/venv/bin/python manage.py run_healer --interval=60
Restart=always
RestartSec=15
MemoryMax=512M
Nice=10                         # past prioritet — asosiy ishga xalaqit bermasin

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/armenu /var/log/armenu
InaccessiblePaths=/home/user

[Install]
WantedBy=multi-user.target
```

### 4.8 Ishga tushirish va boshqarish

```bash
# Birinchi o'rnatish
sudo systemctl daemon-reload
sudo systemctl enable --now armenu.socket
sudo systemctl enable --now armenu.service
sudo systemctl enable --now armenu-ws.service
sudo systemctl enable --now armenu-worker@model3d armenu-worker@fiscal \
                            armenu-worker@notify  armenu-worker@ai \
                            armenu-worker@analytics
sudo systemctl enable --now armenu-workers.target
sudo systemctl enable --now armenu-healer.service

# Holat
systemctl status 'armenu*' --no-pager

# Kundalik operatsiyalar
sudo systemctl reload  armenu                 # ⚡ Python/template — UZILISHSIZ
sudo systemctl restart armenu-ws              # WS consumers o'zgarsa
sudo systemctl restart armenu-workers.target  # worker kodi o'zgarsa
sudo systemctl restart 'armenu-worker@fiscal' # bitta navbat

# Log
journalctl -u armenu -f --output=cat
journalctl -u 'armenu-worker@*' --since '10 min ago'
```

---

## 5. NGINX

### 5.1 To'liq konfiguratsiya

```nginx
# /etc/nginx/sites-available/armenu.conf
# ⛔ Bu fayl FAQAT ARMENU uchun. bittada*.conf ga TEGILMAYDI.

# ---------- Upstream ----------
upstream armenu_web {
    server 127.0.0.1:8060 max_fails=3 fail_timeout=15s;
    keepalive 64;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

upstream armenu_ws {
    server 127.0.0.1:8061 max_fails=3 fail_timeout=15s;
    # ⚡ WS — ip_hash kerak emas (channels layer Redis'da umumiy)
    keepalive 32;
}

# ---------- Rate limit zonalari ----------
limit_req_zone $binary_remote_addr zone=general:20m  rate=120r/m;
limit_req_zone $binary_remote_addr zone=menu:20m     rate=120r/m;
limit_req_zone $binary_remote_addr zone=qr:10m       rate=60r/m;
limit_req_zone $binary_remote_addr zone=orders:10m   rate=10r/m;
limit_req_zone $binary_remote_addr zone=aichat:10m   rate=2r/m;
limit_req_zone $binary_remote_addr zone=login:10m    rate=5r/m;
limit_req_zone $binary_remote_addr zone=webhook:10m  rate=600r/m;
limit_req_zone $binary_remote_addr zone=api:10m      rate=120r/m;
limit_conn_zone $binary_remote_addr zone=perip:10m;
limit_req_status 429;
limit_conn_status 429;

# ---------- 3D fayl kesh (S3 origin uchun) ----------
proxy_cache_path /var/cache/nginx/ar levels=1:2 keys_zone=ar_cache:100m
                 max_size=20g inactive=30d use_temp_path=off;

# ---------- Maintenance flag ----------
map $http_x_armenu_bypass $maintenance_bypass {
    default 0;
    "~^${MAINT_TOKEN}$" 1;
}

# ---------- WebSocket upgrade map ----------
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# ---------- HTTP → HTTPS ----------
server {
    listen 80;
    listen [::]:80;
    server_name armenu.uz www.armenu.uz api.armenu.uz cdn.armenu.uz stage.armenu.uz;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# ---------- ASOSIY SERVER ----------
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name armenu.uz www.armenu.uz;

    # --- TLS ---
    ssl_certificate     /etc/letsencrypt/live/armenu.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/armenu.uz/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/armenu.uz/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL_ARMENU:20m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;

    # --- Xavfsizlik header'lari ---
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(self), xr-spatial-tracking=(self), geolocation=(), microphone=()" always;

    # --- Cloudflare real IP ---
    include /etc/nginx/cloudflare-ips.conf;
    real_ip_header CF-Connecting-IP;

    # --- Umumiy ---
    client_max_body_size 50m;              # 3D fayl yuklash
    client_body_timeout 60s;
    client_header_timeout 20s;
    send_timeout 60s;
    server_tokens off;
    limit_conn perip 60;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json
               application/xml image/svg+xml model/gltf+json;
    # ⚠️ .glb / .usdz allaqachon siqilgan — gzip QILINMAYDI

    access_log /var/log/nginx/armenu_access.log combined buffer=32k flush=5s;
    error_log  /var/log/nginx/armenu_error.log warn;

    # ============ MAINTENANCE REJIMI ============
    # Yoqish:  sudo touch /var/armenu/MAINTENANCE
    # O'chirish: sudo rm  /var/armenu/MAINTENANCE
    set $maint 0;
    if (-f /var/armenu/MAINTENANCE) { set $maint 1; }
    if ($maintenance_bypass = 1)    { set $maint 0; }   # jamoa uchun bypass
    if ($request_uri ~ ^/(health|metrics)) { set $maint 0; }

    location @maintenance {
        root /var/armenu/static_maint;
        try_files /maintenance.html =503;
        add_header Retry-After 300 always;
        add_header Cache-Control "no-store" always;
        internal;
    }

    # ============ SOG'LIQ ============
    location = /health/ {
        access_log off;
        proxy_pass http://armenu_web;
        proxy_read_timeout 5s;
    }
    location = /health/deep/ {
        access_log off;
        allow 127.0.0.1;
        deny all;
        proxy_pass http://armenu_web;
    }
    location = /metrics {
        access_log off;
        allow 127.0.0.1;
        allow 10.0.0.0/8;                  # obs-01
        deny all;
        proxy_pass http://armenu_web;
    }

    # ============ STATIK ============
    location /static/ {
        alias /home/armenu/app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
        try_files $uri =404;
    }

    # ============ ⚡ 3D FAYLLAR — AR UCHUN KRITIK ============
    location /media/ar/ {
        if ($maint = 1) { return 200; }    # 3D AR maintenance'da ham ishlaydi

        alias /var/armenu/media/ar/;

        # MIME (nginx mime.types.armenu dan keladi, bu yerda majburlaymiz)
        location ~* \.glb$   { alias /var/armenu/media/ar/; default_type model/gltf-binary;   }
        location ~* \.usdz$  { alias /var/armenu/media/ar/; default_type model/vnd.usdz+zip;  }
        location ~* \.gltf$  { alias /var/armenu/media/ar/; default_type model/gltf+json;     }
        location ~* \.ktx2$  { alias /var/armenu/media/ar/; default_type image/ktx2;          }

        # ⚡ CORS — bu bo'lmasa AR ISHLAMAYDI
        add_header Access-Control-Allow-Origin   "*"                  always;
        add_header Access-Control-Allow-Methods  "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers  "Range, Content-Type" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;
        add_header Cross-Origin-Resource-Policy  "cross-origin"       always;
        add_header Accept-Ranges bytes always;
        add_header Cache-Control "public, max-age=2592000, immutable" always;
        expires 30d;

        if ($request_method = OPTIONS) {
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            return 204;
        }

        gzip off;                          # allaqachon siqilgan
        try_files $uri @ar_origin;
    }

    location @ar_origin {
        internal;
        proxy_pass https://armenu-media.s3.amazonaws.com;
        proxy_cache ar_cache;
        proxy_cache_valid 200 206 30d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status always;
        add_header Access-Control-Allow-Origin "*" always;
    }

    # ============ BOSHQA MEDIA ============
    location /media/dish/ {
        alias /var/armenu/media/dish/;
        expires 7d;
        add_header Cache-Control "public" always;
    }
    location /media/receipt/ {
        # ⛔ Fiskal cheklar — faqat ilova orqali (X-Accel-Redirect)
        internal;
        alias /var/armenu/media/receipt/;
    }

    # ============ WEBSOCKET ============
    location /ws/ {
        if ($maint = 1) { return 503; }
        proxy_pass http://armenu_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_connect_timeout 10s;
        proxy_buffering off;
    }

    # ============ WEBHOOK (rate limit yumshoq, maintenance'da ham ishlaydi) ============
    location /webhooks/ {
        limit_req zone=webhook burst=100 nodelay;
        proxy_pass http://armenu_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        # ⚡ webhook maintenance'da ham qabul qilinadi (pul yo'qolmasin)
    }

    # ============ API — endpointga qarab rate limit ============
    location /v1/orders/ {
        if ($maint = 1) { error_page 503 = @maintenance; return 503; }
        limit_req zone=orders burst=5 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }
    location /v1/ai/chat/ {
        limit_req zone=aichat burst=3 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
        proxy_read_timeout 45s;
    }
    location /v1/menu/ {
        limit_req zone=menu burst=40 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }
    location /staff/login/ {
        limit_req zone=login burst=3 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }
    location /t/ {                          # QR kirish
        limit_req zone=qr burst=20 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }

    # ============ QOLGANI ============
    location / {
        if ($maint = 1) { error_page 503 = @maintenance; return 503; }
        limit_req zone=general burst=40 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }
}

# ---------- API subdomen (3rd party) ----------
server {
    listen 443 ssl;
    http2 on;
    server_name api.armenu.uz;
    ssl_certificate     /etc/letsencrypt/live/armenu.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/armenu.uz/privkey.pem;

    location / {
        limit_req zone=api burst=60 nodelay;
        include /etc/nginx/snippets/armenu-proxy.conf;
    }
}
```

```nginx
# /etc/nginx/snippets/armenu-proxy.conf
proxy_pass http://armenu_web;
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-Id      $request_id;     # ⚡ trace uchun
proxy_connect_timeout 5s;
proxy_send_timeout    60s;
proxy_read_timeout    60s;
proxy_next_upstream error timeout http_502 http_503 http_504;
proxy_next_upstream_tries 2;
```

### 5.2 Rate limit zonalari — jamlanma

| Zona | Tezlik | Burst | Kalit | Endpoint |
|---|---|---|---|---|
| `general` | 120/daq | 40 | IP | Barcha qolgan |
| `menu` | 120/daq | 40 | IP | `/v1/menu/` |
| `qr` | 60/daq | 20 | IP | `/t/<token>` |
| `orders` | 10/daq | 5 | IP | `/v1/orders/` |
| `aichat` | 2/daq | 3 | IP | `/v1/ai/chat/` |
| `login` | 5/daq | 3 | IP | `/staff/login/` |
| `webhook` | 600/daq | 100 | IP | `/webhooks/` |
| `api` | 120/daq | 60 | IP | `api.armenu.uz` |
| `perip` (conn) | 60 ulanish | — | IP | Barchasi |

### 5.3 Maintenance rejimi

```bash
# YOQISH
sudo -u armenu touch /var/armenu/MAINTENANCE
# → barcha foydalanuvchi 503 + chiroyli sahifa
# → webhook, /health, /metrics, /media/ar/ ISHLASHDA DAVOM ETADI

# Jamoa uchun bypass (test qilish)
curl -H "X-ARMenu-Bypass: $MAINT_TOKEN" https://armenu.uz/

# O'CHIRISH
sudo -u armenu rm /var/armenu/MAINTENANCE
```

```html
<!-- /var/armenu/static_maint/maintenance.html -->
<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARMENU — texnik ishlar</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;
     font:16px/1.6 system-ui,-apple-system,sans-serif;
     background:#0f1115;color:#e8eaf0;text-align:center;padding:24px}
@media(prefers-color-scheme:light){body{background:#f7f8fa;color:#1a1d24}}
h1{font-size:22px;margin:16px 0 8px}
p{opacity:.75;max-width:34ch;margin:0 auto}
</style></head><body><div>
<div style="font-size:56px">🍽</div>
<h1>Texnik ishlar olib borilmoqda</h1>
<p>Bir necha daqiqadan so'ng qaytadan urinib ko'ring.<br>
Buyurtma berish uchun ofitsiantni chaqiring.</p>
</div></body></html>
```

### 5.4 TLS sertifikat

```bash
# Birinchi olish
sudo certbot certonly --webroot -w /var/www/certbot \
  -d armenu.uz -d www.armenu.uz -d api.armenu.uz -d cdn.armenu.uz \
  --email ops@armenu.uz --agree-tos --no-eff-email

# Avtomatik yangilash (certbot o'z timer'ini o'rnatadi)
sudo systemctl status certbot.timer

# ⚡ Yangilangach FAQAT nginx reload (armenu servislariga tegilmaydi)
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/bash
/usr/sbin/nginx -t && /usr/bin/systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## 6. CI/CD QUVURI

### 6.1 Umumiy oqim

```
  git push (main / tag)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  6 DARVOZA (parallel — hammasi o'tishi SHART)                    │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┬───────┐ │
│  │ 1 LINT   │ 2 ⛔TENANT│ 3 i18n   │ 4 TEST   │5 SECURITY│6 MIGR│ │
│  │ ruff     │ IZOLYAT- │ 3 til    │ pytest   │ bandit  │ backw │ │
│  │ black    │ SIYA     │ 100%     │ ≥75%     │pip-audit│ compat│ │
│  │ mypy     │ MAJBURIY │          │          │gitleaks │       │ │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬───┴───┬───┘ │
│       └──────────┴──────────┴──────────┴──────────┴───────┘     │
└────────────────────────────┬────────────────────────────────────┘
                             │ ✅ hammasi yashil
                             ▼
                   ┌──────────────────┐
                   │  ⛔ IZOLYATSIYA   │   izolyatsiya_tekshir.sh
                   │     TEKSHIRUVI    │   (mebelcity buzilmaganmi)
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │  📦 BACKUP        │   pg_dump + kod tag
                   │  (rollback nuqta) │
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │  🚀 DEPLOY        │   §7 qadamlari
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │  ✅ SMOKE TEST    │   12 tekshiruv
                   └────────┬─────────┘
                     ✅ ok  │  ❌ xato
                            ├──────────────┐
                            ▼              ▼
                    Telegram: ✅    🔙 AVTOMATIK ROLLBACK
                                    + Telegram: 🔴
```

### 6.2 To'liq YAML

```yaml
# .github/workflows/ci-cd.yml
name: ARMENU CI/CD

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

concurrency:
  group: armenu-${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: '3.12'
  DJANGO_SETTINGS_MODULE: config.settings_ci

jobs:
  # ═══════════ DARVOZA 1 — LINT ═══════════
  lint:
    name: 1️⃣ Lint va format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install ruff black mypy django-stubs
      - name: ruff
        run: ruff check . --output-format=github
      - name: black
        run: black --check --diff .
      - name: mypy (yumshoq — xato bloklamaydi)
        run: mypy apps/ --ignore-missing-imports || true

  # ═══════════ DARVOZA 2 — ⛔ TENANT IZOLYATSIYA (MAJBURIY) ═══════════
  tenant-isolation:
    name: 2️⃣ ⛔ Tenant izolyatsiya (MAJBURIY)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: {POSTGRES_PASSWORD: test, POSTGRES_DB: armenu_test}
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: python manage.py migrate --noinput
      - name: ⛔ Cross-tenant kirish testi
        run: pytest tests/test_tenant_isolation.py -v --tb=short -p no:randomly
      - name: ⛔ Har model TenantScoped ekanini tekshirish
        run: python manage.py check_tenant_scoping --strict
      - name: ⛔ Filtrsiz queryset qidiruvi (statik tahlil)
        run: python scripts/find_unscoped_queries.py --fail-on-find

  # ═══════════ DARVOZA 3 — i18n ═══════════
  i18n:
    name: 3️⃣ Tarjima to'liqligi (uz/ru/en)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: sudo apt-get install -y gettext
      - name: Tarjima fayllari yangilanganmi
        run: |
          python manage.py makemessages -l uz -l ru -l en --no-obsolete
          git diff --exit-code locale/ || {
            echo "❌ Tarjima fayllari eskirgan. makemessages ishga tushiring."; exit 1; }
      - name: 100% tarjima qilinganmi
        run: pytest tests/test_i18n_completeness.py -v
      - run: python manage.py compilemessages

  # ═══════════ DARVOZA 4 — TESTLAR + QAMROV ═══════════
  test:
    name: 4️⃣ Testlar va qamrov (≥75%)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: {POSTGRES_PASSWORD: test, POSTGRES_DB: armenu_test}
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
      minio:
        image: bitnami/minio:latest
        env: {MINIO_ROOT_USER: test, MINIO_ROOT_PASSWORD: testtest}
        ports: ['9000:9000']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: python manage.py migrate --noinput
      - name: Majburiy kritik testlar
        run: |
          pytest tests/test_order_state.py \
                 tests/test_price_calculation.py \
                 tests/integrations/test_payment_idempotency.py \
                 tests/integrations/test_payment_signature.py \
                 tests/integrations/test_adapter_contract.py \
                 -v --tb=short
      - name: To'liq test to'plami + qamrov
        run: pytest --cov=apps --cov-report=xml --cov-report=term-missing --cov-fail-under=75
      - uses: actions/upload-artifact@v4
        if: always()
        with: {name: coverage, path: coverage.xml}

  # ═══════════ DARVOZA 5 — XAVFSIZLIK ═══════════
  security:
    name: 5️⃣ Xavfsizlik skani
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: {fetch-depth: 0}
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install bandit pip-audit safety
      - name: bandit (kod zaifliklari)
        run: bandit -r apps/ config/ -ll -ii -f screen
      - name: pip-audit (bog'liqlik CVE)
        run: pip-audit -r requirements.txt --strict
      - name: gitleaks (sir sizishi)
        uses: gitleaks/gitleaks-action@v2
        env: {GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}'}
      - name: ⛔ .env commit qilinmaganmi
        run: |
          git ls-files | grep -E '^\.env$|\.env\.(prod|production)$' && {
            echo "🔴 .env repozitoriyaga qo'shilgan!"; exit 1; } || echo "✅ .env yo'q"
      - name: ⛔ Django deploy tekshiruvi
        run: python manage.py check --deploy --fail-level WARNING

  # ═══════════ DARVOZA 6 — MIGRATSIYA ═══════════
  migrations:
    name: 6️⃣ Migratsiya tekshiruvi
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: {POSTGRES_PASSWORD: test, POSTGRES_DB: armenu_test}
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: pip install -r requirements.txt -r requirements-dev.txt django-migration-linter
      - name: Yetishmayotgan migratsiya bormi
        run: python manage.py makemigrations --check --dry-run
      - name: ⚡ Backward-compatible ekanmi (bloklovchi o'zgarish yo'q)
        run: |
          python manage.py lintmigrations --exclude-migration-tests \
              IGNORE_MIGRATION_FILES --warnings-as-errors
      - name: Migratsiya + rollback sinovi
        run: |
          python manage.py migrate --noinput
          python manage.py migrate menu zero --noinput
          python manage.py migrate --noinput
      - name: ⚡ NOT NULL ustun DEFAULT'siz emasmi
        run: python scripts/check_notnull_defaults.py

  # ═══════════ DEPLOY ═══════════
  deploy:
    name: 🚀 Deploy (prod)
    needs: [lint, tenant-isolation, i18n, test, security, migrations]
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://armenu.uz
    concurrency: {group: armenu-deploy, cancel-in-progress: false}
    steps:
      - uses: actions/checkout@v4

      - name: SSH kaliti
        uses: webfactory/ssh-agent@v0.9.0
        with: {ssh-private-key: '${{ secrets.DEPLOY_SSH_KEY }}'}

      - name: known_hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.PROD_HOST }} >> ~/.ssh/known_hosts

      # ---------- ⛔ IZOLYATSIYA (deploy'dan OLDIN) ----------
      - name: ⛔ Izolyatsiya tekshiruvi (oldin)
        run: |
          ssh armenu@${{ secrets.PROD_HOST }} \
            'bash /home/armenu/app/scripts/izolyatsiya_tekshir.sh'

      # ---------- 📦 BACKUP ----------
      - name: 📦 Rollback nuqtasi
        run: |
          ssh armenu@${{ secrets.PROD_HOST }} bash -s <<'EOSSH'
          set -euo pipefail
          cd /home/armenu/app
          TS=$(date +%Y%m%d_%H%M%S)
          echo "$TS" > /home/armenu/.last_deploy_ts
          git rev-parse HEAD > /home/armenu/.rollback_commit
          pg_dump -Fc -Z6 -d "$DB_NAME" -f "/backup/predeploy_${TS}.dump"
          ls -lh "/backup/predeploy_${TS}.dump"
          # 7 kundan eski predeploy dump'lar o'chiriladi
          find /backup -name 'predeploy_*.dump' -mtime +7 -delete
          EOSSH

      # ---------- 🚀 DEPLOY ----------
      - name: 🚀 Deploy
        run: |
          ssh armenu@${{ secrets.PROD_HOST }} bash -s <<'EOSSH'
          set -euo pipefail
          cd /home/armenu/app
          source .env

          echo "▶ [1/8] Kod"
          git fetch --all --tags --prune
          git checkout --force "${GITHUB_SHA:-origin/main}"

          echo "▶ [2/8] Bog'liqliklar"
          venv/bin/pip install -q -r requirements.txt

          echo "▶ [3/8] Django tekshiruvi"
          venv/bin/python manage.py check --deploy --fail-level ERROR

          echo "▶ [4/8] Migratsiya (backward compatible)"
          venv/bin/python manage.py migrate --noinput

          echo "▶ [5/8] Statik + tarjima"
          venv/bin/python manage.py collectstatic --noinput --clear
          venv/bin/python manage.py compilemessages

          echo "▶ [6/8] Web — GRACEFUL RELOAD (uzilishsiz)"
          sudo systemctl reload armenu

          echo "▶ [7/8] WS va workerlar"
          sudo systemctl restart armenu-ws
          sudo systemctl restart armenu-workers.target

          echo "▶ [8/8] Kesh tozalash (menyu + tarjima)"
          venv/bin/python manage.py clear_cache --prefix=menu --prefix=i18n
          EOSSH

      - name: 🌐 Cloudflare kesh
        run: |
          curl -sf -X POST \
            "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CF_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"prefixes":["armenu.uz/static/","armenu.uz/v1/menu/"]}'

      # ---------- ✅ SMOKE TEST ----------
      - name: ✅ Smoke test (12 tekshiruv)
        id: smoke
        run: |
          set -e
          B=https://armenu.uz
          echo "1 health";       curl -fsS   "$B/health/" | grep -q '"ok":true'
          echo "2 health deep";  ssh armenu@${{ secrets.PROD_HOST }} \
                                   'curl -fsS localhost:8060/health/deep/' | grep -q '"db":"ok"'
          echo "3 bosh sahifa";  curl -fsS -o /dev/null -w '%{http_code}' "$B/" | grep -q 200
          echo "4 menyu API";    curl -fsS "$B/v1/menu/demo/" | jq -e '.dishes|length>0'
          echo "5 statik";       curl -fsS -o /dev/null -w '%{http_code}' "$B/static/css/app.css" | grep -q 200
          echo "6 3D MIME";      curl -fsSI "$B/media/ar/library/osh/model.glb" | grep -qi 'model/gltf-binary'
          echo "7 USDZ MIME";    curl -fsSI "$B/media/ar/library/osh/model.usdz" | grep -qi 'model/vnd.usdz+zip'
          echo "8 CORS";         curl -fsSI "$B/media/ar/library/osh/model.glb" | grep -qi 'access-control-allow-origin'
          echo "9 WS";           curl -fsS -o /dev/null -w '%{http_code}' \
                                   -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
                                   -H 'Sec-WebSocket-Version: 13' \
                                   -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' "$B/ws/guest/" | grep -qE '101|400'
          echo "10 metrics";     ssh armenu@${{ secrets.PROD_HOST }} \
                                   'curl -fsS localhost:8060/metrics' | grep -q 'armenu_'
          echo "11 servislar";   ssh armenu@${{ secrets.PROD_HOST }} \
                                   'systemctl is-active armenu armenu-ws armenu-workers.target' | grep -vq inactive
          echo "12 IZOLYATSIYA"; ssh armenu@${{ secrets.PROD_HOST }} \
                                   'bash /home/armenu/app/scripts/izolyatsiya_tekshir.sh'

      # ---------- 🔙 ROLLBACK ----------
      - name: 🔙 AVTOMATIK ROLLBACK
        if: failure() && steps.smoke.conclusion == 'failure'
        run: |
          ssh armenu@${{ secrets.PROD_HOST }} bash -s <<'EOSSH'
          set -euo pipefail
          cd /home/armenu/app
          COMMIT=$(cat /home/armenu/.rollback_commit)
          echo "🔙 Rollback → $COMMIT"
          git checkout --force "$COMMIT"
          venv/bin/pip install -q -r requirements.txt
          venv/bin/python manage.py collectstatic --noinput
          venv/bin/python manage.py compilemessages
          sudo systemctl reload armenu
          sudo systemctl restart armenu-ws armenu-workers.target
          sleep 5
          curl -fsS https://armenu.uz/health/ || echo "⚠️ Rollback'dan keyin ham xato!"
          EOSSH

      # ---------- 📣 XABAR ----------
      - name: 📣 Telegram (muvaffaqiyat)
        if: success()
        run: |
          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TG_BOT }}/sendMessage" \
            -d chat_id=${{ secrets.TG_CHAT }} -d parse_mode=HTML \
            -d text="✅ <b>ARMENU deploy OK</b>%0A<code>${GITHUB_SHA:0:8}</code>%0A${{ github.event.head_commit.message }}"

      - name: 📣 Telegram (xato)
        if: failure()
        run: |
          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TG_BOT }}/sendMessage" \
            -d chat_id=${{ secrets.TG_CHAT }} -d parse_mode=HTML \
            -d text="🔴 <b>ARMENU deploy YIQILDI — rollback bajarildi</b>%0A<code>${GITHUB_SHA:0:8}</code>%0Ahttps://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### 6.3 Darvozalar jadvali

| # | Darvoza | Bloklaydi | Vaqt | Nima tekshiriladi |
|---|---|---|---|---|
| 1 | Lint | ✅ | ~40 s | `ruff`, `black`, `mypy` (yumshoq) |
| 2 | ⛔ **Tenant izolyatsiya** | ✅ **MAJBURIY** | ~2 daq | Cross-tenant 403, har model scoped, filtrsiz queryset |
| 3 | i18n | ✅ | ~1 daq | uz/ru/en 100%, `.po` yangilangan |
| 4 | Testlar | ✅ | ~5 daq | Qamrov ≥75%, 6 kritik test |
| 5 | Security | ✅ | ~1,5 daq | `bandit`, `pip-audit`, `gitleaks`, `check --deploy` |
| 6 | Migratsiya | ✅ | ~2 daq | Yetishmayotgan yo'q, backward compatible, NOT NULL DEFAULT |
| | **JAMI** | | **~7 daq** (parallel) | |

---

## 7. DEPLOY STRATEGIYASI

### 7.1 Zero-downtime qadamlar

```
┌──────────────────────────────────────────────────────────────────┐
│ [1] armenu.socket PORTNI USHLAB TURADI                           │
│     → gunicorn qayta ishga tushsa ham :8060 ochiq qoladi         │
│     → kiruvchi so'rovlar backlog'da kutadi (2048 ta)             │
├──────────────────────────────────────────────────────────────────┤
│ [2] MIGRATSIYA — faqat BACKWARD COMPATIBLE                       │
│     eski kod ham, yangi kod ham ishlaydigan sxema                │
├──────────────────────────────────────────────────────────────────┤
│ [3] collectstatic --clear → yangi hash'li fayllar                │
│     eski sahifa eski faylni topadi (1 yil kesh, nom o'zgargan)   │
├──────────────────────────────────────────────────────────────────┤
│ [4] systemctl reload armenu  (SIGHUP)                            │
│     gunicorn: eski worker'lar joriy so'rovni TUGATADI (30 s),    │
│               yangi worker'lar yangi so'rovlarni oladi           │
│     ⚡ 0 ta 502                                                   │
├──────────────────────────────────────────────────────────────────┤
│ [5] armenu-ws restart                                            │
│     WS klientlar uziladi → exponential backoff (1-30 s) →        │
│     avtomatik qayta ulanadi. Foydalanuvchi ~2 s sezmaydi         │
├──────────────────────────────────────────────────────────────────┤
│ [6] worker restart (TimeoutStopSec=120)                          │
│     joriy vazifa tugaydi, yangi vazifa navbatda kutadi           │
├──────────────────────────────────────────────────────────────────┤
│ [7] Kesh tozalash — FAQAT kerakli prefiks (menu, i18n)           │
│     ⛔ FLUSHALL HECH QACHON                                       │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Migratsiya tartibi — backward compatible

> ⚡ **Oltin qoida:** har migratsiya **eski kod bilan ham ishlashi** kerak.
> Chunki reload paytida bir necha soniya eski va yangi worker birga yashaydi.

| Amaliyot | ✅ Xavfsiz | ⛔ Xavfli | To'g'ri yo'l |
|---|---|---|---|
| Ustun qo'shish | `null=True` yoki `default=` | `NOT NULL` DEFAULT'siz | Avval nullable → to'ldirish → `NOT NULL` |
| Ustun o'chirish | — | Darhol `DROP` | 1) koddan olib tashlash → deploy 2) keyingi relizda `DROP` |
| Nom o'zgartirish | — | `RENAME` | Yangi qo'shish → ikkalasiga yozish → ko'chirish → eskisini o'chirish |
| Indeks | `CONCURRENTLY` | Oddiy `CREATE INDEX` (jadval qulflanadi) | `AddIndexConcurrently` + `atomic=False` |
| Tur o'zgartirish | Kengaytirish (varchar 50→200) | Toraytirish | Yangi ustun + backfill |
| Katta backfill | Chunk (10k) worker'da | Bitta `UPDATE` | Data migration → worker vazifasi |
| `UNIQUE` | `CONCURRENTLY` indeks → constraint | Darhol constraint | 2 bosqich |

```python
# ✅ TO'G'RI — bloklamaydigan indeks
from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False                              # ⚡ CONCURRENTLY uchun MAJBURIY
    dependencies = [('orders', '0012_...')]
    operations = [
        AddIndexConcurrently(
            model_name='order',
            index=models.Index(fields=['restaurant', '-created_at'],
                               name='idx_order_rest_created'),
        ),
    ]
```

```python
# ✅ TO'G'RI — NOT NULL ustun 3 bosqichda
# Migratsiya 0013: nullable qo'shish
migrations.AddField('dish', 'ikpu_code',
                    models.CharField(max_length=32, null=True, blank=True))

# Migratsiya 0014: backfill (data migration, chunk bilan)
def backfill(apps, schema_editor):
    Dish = apps.get_model('menu', 'Dish')
    qs = Dish.objects.filter(ikpu_code__isnull=True)
    while (batch := list(qs.values_list('pk', flat=True)[:5000])):
        Dish.objects.filter(pk__in=batch).update(ikpu_code='10112001001')

# Migratsiya 0015 (KEYINGI relizda): NOT NULL
migrations.AlterField('dish', 'ikpu_code',
                      models.CharField(max_length=32, default='10112001001'))
```

### 7.3 Statik fayllar

```python
# config/settings.py
STORAGES = {
    'staticfiles': {
        # ⚡ Fayl nomiga hash qo'shadi: app.a3f2c81d.css
        #    → 1 yil kesh xavfsiz, eski sahifa eski faylni topadi
        'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
    },
}
```

```bash
# Deploy'da
venv/bin/python manage.py collectstatic --noinput --clear
# --clear: eski hash'siz qoldiqlar tozalanadi
# ⚠️ Ba'zi eski hash'lar 24 soat saqlanishi kerak (ochiq sahifalar uchun) →
#    --clear o'rniga haftalik cron bilan 7 kundan eskisini tozalash tavsiya etiladi
```

### 7.4 Kesh tozalash

```bash
# ⛔ HECH QACHON: redis-cli FLUSHALL / FLUSHDB
# ✅ Faqat prefiks bo'yicha
venv/bin/python manage.py clear_cache --prefix=menu --prefix=i18n

# manage.py clear_cache ichida:
#   django_redis: cache.delete_pattern('armenu:menu:*')
```

| Kesh | Deploy'da tozalanadimi | Sabab |
|---|---|---|
| `menu:*` | ✅ Ha | Menyu strukturasi o'zgargan bo'lishi mumkin |
| `i18n:*` | ✅ Ha | Tarjima yangilangan |
| `ai:menuctx:*` | ✅ Ha | Menyu konteksti eskirgan |
| `mcp:*` (AI javoblar) | ❌ Yo'q | Qimmat, o'zgarmaydi |
| `ikpu:*` | ❌ Yo'q | Tashqi katalog, o'zgarmaydi |
| `sess:*` | ⛔ **Hech qachon** | Foydalanuvchilar chiqib ketadi |
| `idem:*` | ⛔ **Hech qachon** | Dublikat to'lov xavfi |
| Cloudflare `/static/` | ✅ Ha | Yangi hash |
| Cloudflare `/media/ar/` | ❌ Yo'q | Immutable, 30 kun |

### 7.5 Rollback

**Qachon rollback qilinadi:**

| Belgi | Rollback | Izoh |
|---|---|---|
| Smoke test yiqildi | ✅ **Avtomatik** | CI o'zi qiladi |
| 5xx > 5% (5 daqiqa) | ✅ Darhol | Alert → on-call |
| To'lov ishlamayapti | ✅ **Darhol** | Pul yo'qolishi |
| Fiskal chek yuborilmayapti | ✅ Darhol | Qonuniy risk |
| Tenant sizishi shubhasi | ✅ **Darhol** + incident | Kritik |
| p95 2× sekinlashdi | 🟡 Tekshirish | Balki kesh sovuq — 10 daq kuting |
| Bitta sahifada UI bug | ❌ Yo'q | Hotfix yetarli |

```bash
#!/bin/bash
# /home/armenu/app/scripts/rollback.sh [commit|last]
set -euo pipefail
cd /home/armenu/app
source .env

TARGET="${1:-$(cat /home/armenu/.rollback_commit)}"
TS=$(cat /home/armenu/.last_deploy_ts)

echo "🔙 ROLLBACK → $TARGET"
read -rp "Migratsiya ham qaytarilsinmi? (ha/yo'q): " REVERT_MIGR

# 1. Kod
git checkout --force "$TARGET"
venv/bin/pip install -q -r requirements.txt

# 2. Migratsiya (⚠️ FAQAT zarur bo'lsa — ma'lumot yo'qolishi mumkin)
if [ "$REVERT_MIGR" = "ha" ]; then
  echo "⚠️ DB predeploy dump'dan tiklanadi: /backup/predeploy_${TS}.dump"
  read -rp "TASDIQLANG (BAJAR deb yozing): " C
  [ "$C" = "BAJAR" ] || { echo "Bekor qilindi"; exit 1; }
  sudo systemctl stop armenu armenu-ws armenu-workers.target
  pg_restore -c -d "$DB_NAME" "/backup/predeploy_${TS}.dump"
fi

# 3. Statik
venv/bin/python manage.py collectstatic --noinput
venv/bin/python manage.py compilemessages

# 4. Servislar
sudo systemctl reload armenu
sudo systemctl restart armenu-ws armenu-workers.target

# 5. Tekshirish
sleep 5
curl -fsS https://armenu.uz/health/ && echo "✅ Rollback tugadi" \
  || { echo "🔴 Rollback'dan keyin ham xato!"; exit 1; }

bash scripts/izolyatsiya_tekshir.sh
```

> ⚡ **Muhim:** Migratsiya backward compatible bo'lsa — **kod rollback yetarli**,
> DB'ga tegilmaydi. Shuning uchun §7.2 qoidalari qat'iy.

---

## 8. MONITORING VA KUZATUV

### 8.1 Stek

```
┌─────────────────────────────────────────────────────────────────┐
│                        obs-01 (kuzatuv node)                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Prometheus │  │  Grafana   │  │   Loki   │  │ Alertmanager│ │
│  │ 15s scrape │  │ 14 panel   │  │ log 30d  │  │ → Telegram  │ │
│  │ 30 kun     │  │            │  │          │  │ → qo'ng'iroq│ │
│  └─────▲──────┘  └─────▲──────┘  └────▲─────┘  └──────▲──────┘ │
└────────┼───────────────┼──────────────┼───────────────┼────────┘
         │ scrape        │              │ push          │
  ┌──────┴──────────┬────┴────┬─────────┴─────┐         │
  ▼                 ▼         ▼               ▼         │
django_prometheus  node_    postgres_    promtail   Sentry (SaaS)
/metrics           exporter  exporter    (journald)  xato + trace
                   redis_exporter
                   nginx_exporter
                                            UptimeRobot (tashqi) ──┘
```

### 8.2 Prometheus metrikalari (25+)

```python
# BIZNES metrikalari
armenu_orders_total{restaurant,status}                  # counter
armenu_order_value_sum{restaurant,currency}             # counter
armenu_order_items_total{restaurant}                    # counter
armenu_ar_views_total{restaurant,dish}                  # counter
armenu_ar_conversion_ratio{restaurant}                  # gauge  ⚡ ROI ko'rsatkichi
armenu_active_restaurants                               # gauge
armenu_active_sessions{restaurant}                      # gauge
armenu_table_occupancy_ratio{restaurant}                # gauge
armenu_chat_messages_total{restaurant,lang}             # counter
armenu_avg_cook_time_seconds{restaurant}                # histogram

# TEXNIK metrikalari
armenu_http_request_duration_seconds{endpoint,method,status}   # histogram
armenu_http_requests_total{endpoint,method,status}             # counter
armenu_ws_connections{node,group_type}                         # gauge
armenu_ws_messages_total{direction,type}                       # counter
armenu_db_query_duration_seconds{query_type}                   # histogram
armenu_db_connections{state}                                   # gauge  ⚡ pool
armenu_cache_hit_ratio{cache_name}                             # gauge
armenu_queue_depth{queue}                                      # gauge  ⚡
armenu_queue_oldest_age_seconds{queue}                         # gauge
armenu_job_duration_seconds{job_type,status}                   # histogram
armenu_job_failures_total{job_type,error}                      # counter
armenu_circuit_breaker_state{service}                          # gauge (0=closed,1=half,2=open)
armenu_healer_actions_total{check,result}                      # counter
armenu_worker_heartbeat_age_seconds{queue,instance}            # gauge

# TASHQI integratsiya metrikalari
armenu_external_api_duration_seconds{domain,provider,op}       # histogram
armenu_external_api_total{domain,provider,op,status}           # counter
armenu_ai_cost_usd_total{provider,model,task}                  # counter ⚡ byudjet
armenu_ai_tokens_total{provider,direction}                     # counter
armenu_fiscal_queue_depth                                      # gauge  ⚡ P1
armenu_fiscal_receipts_total{provider,status}                  # counter
armenu_fiscal_oldest_pending_seconds                           # gauge  ⚡ 48 soat
armenu_payment_total{provider,status}                          # counter
armenu_payment_amount_sum{provider}                            # counter
armenu_payment_reconcile_mismatch{provider,kind}               # gauge  ⚡ P1
armenu_telegram_queue_depth{priority}                          # gauge
armenu_telegram_429_total                                      # counter
armenu_s3_operation_duration_seconds{op}                       # histogram
armenu_cdn_cache_hit_ratio                                     # gauge
```

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels: {env: prod, app: armenu}

alerting:
  alertmanagers: [{static_configs: [{targets: ['localhost:9093']}]}]

rule_files: ['/etc/prometheus/rules/armenu-*.yml']

scrape_configs:
  - job_name: armenu-web
    metrics_path: /metrics
    static_configs: [{targets: ['127.0.0.1:8060']}]
  - job_name: node
    static_configs: [{targets: ['127.0.0.1:9100']}]
  - job_name: postgres
    static_configs: [{targets: ['127.0.0.1:9187']}]
  - job_name: redis
    static_configs: [{targets: ['127.0.0.1:9121']}]
  - job_name: nginx
    static_configs: [{targets: ['127.0.0.1:9113']}]
```

### 8.3 Grafana panellari (14 ta)

| # | Panel | Kim ko'radi | Asosiy grafik |
|---|---|---|---|
| 1 | **🚦 Umumiy sog'liq** (NOC) | Hamma, TV monitorda | Uptime, 5xx %, p95, active restoran |
| 2 | **⚡ Oltin signallar** | On-call | Latency / Traffic / Errors / Saturation |
| 3 | **🍽 Biznes** | CEO, sotuv | Buyurtma/soat, o'rtacha chek, konversiya |
| 4 | **🥽 AR analitikasi** | Product | AR ko'rish, AR→buyurtma konversiya, chek farqi |
| 5 | **🌐 HTTP** | Backend | Endpoint bo'yicha p50/p95/p99, RPS, status |
| 6 | **🗄 PostgreSQL** | Backend/DBA | Conn pool, sekin so'rov, replication lag, cache hit |
| 7 | **📮 Redis** | Backend | Memory, evicted, hit ratio, channels |
| 8 | **⚙️ Navbatlar** | Backend | 5 navbat depth, eng eski vazifa, xato darajasi |
| 9 | **🔌 WebSocket** | Backend | Ulanishlar, xabar/s, uzilish darajasi |
| 10 | **🤖 AI/MCP** | Backend, moliya | Provayder bo'yicha chaqiruv/xarajat/latency/xato |
| 11 | **💳 To'lov** | Moliya, on-call | Provayder bo'yicha muvaffaqiyat %, summa, reconcile farqi |
| 12 | **🧾 Fiskal** | On-call, moliya | Navbat depth, eng eski pending, 48 soat xavfi |
| 13 | **🖥 Infratuzilma** | DevOps | CPU/RAM/disk/tarmoq (barcha node) |
| 14 | **⛔ Izolyatsiya** | DevOps | armenu vs bittada port/servis holati, cross-check |

### 8.4 Loki log

```yaml
# /etc/promtail/config.yml
server: {http_listen_port: 9080}
positions: {filename: /var/lib/promtail/positions.yaml}
clients: [{url: http://localhost:3100/loki/api/v1/push}]

scrape_configs:
  - job_name: armenu-journal
    journal:
      max_age: 12h
      labels: {job: armenu, env: prod}
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: unit
      - source_labels: ['__journal_priority_keyword']
        target_label: level
    pipeline_stages:
      - match:
          selector: '{job="armenu"}'
          stages:
            - json:
                expressions:
                  request_id: request_id
                  restaurant_id: restaurant_id
                  level: level
            - labels: {request_id: '', restaurant_id: '', level: ''}

  - job_name: armenu-nginx
    static_configs:
      - targets: [localhost]
        labels: {job: nginx, app: armenu, __path__: /var/log/nginx/armenu_*.log}
```

```logql
# Foydali LogQL so'rovlari
{job="armenu", level="ERROR"} |= "payment"
{job="armenu"} | json | request_id="3f2a9c81-..."          # bitta so'rovni kuzatish
{job="armenu"} | json | restaurant_id="42" | level=~"WARN|ERROR"
sum by (unit) (rate({job="armenu", level="ERROR"}[5m]))
{job="nginx", app="armenu"} | pattern `<_> <_> "<method> <path> <_>" <status> <_>` | status >= 500
```

### 8.5 Sentry

```python
# config/settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn=os.environ['SENTRY_DSN'],
    environment=os.environ.get('DJANGO_ENV', 'production'),
    release=os.environ.get('GIT_SHA', 'unknown'),
    integrations=[DjangoIntegration(), RedisIntegration()],
    traces_sample_rate=0.05,          # 5% trace (xarajat)
    profiles_sample_rate=0.01,
    send_default_pii=False,           # ⚡ PII YUBORILMAYDI
    before_send=scrub_sensitive,      # karta/token/telefon maskalanadi
    ignore_errors=[
        'django.security.DisallowedHost',
        'ClientDisconnected',
    ],
)


def scrub_sensitive(event, hint):
    """⚡ Sentry'ga maxfiy ma'lumot BORMAYDI"""
    SENSITIVE = {'password', 'token', 'api_key', 'card', 'pan', 'cvv',
                 'authorization', 'secret', 'phone', 'X-Signature'}
    def walk(d):
        if isinstance(d, dict):
            return {k: ('***' if k.lower() in SENSITIVE else walk(v))
                    for k, v in d.items()}
        if isinstance(d, list):
            return [walk(i) for i in d]
        return d
    return walk(event)
```

### 8.6 Uptime monitoring (tashqi)

| Tekshiruv | URL | Chastota | Joy |
|---|---|---|---|
| Bosh sahifa | `https://armenu.uz/` | 1 daq | 5 mintaqa |
| Health | `https://armenu.uz/health/` | 1 daq | 5 mintaqa |
| Menyu API | `https://armenu.uz/v1/menu/demo/` | 5 daq | 3 mintaqa |
| 3D fayl (CDN) | `.../model.glb` | 5 daq | 3 mintaqa |
| TLS muddati | armenu.uz | Kunlik | — |
| Domen muddati | armenu.uz | Haftalik | — |

### 8.7 Alert qoidalari

| # | Alert | Shart | Daraja | Kimga | Kanal |
|---|---|---|---|---|---|
| 1 | **Sayt yiqilgan** | `up{job="armenu-web"} == 0` (1 daq) | 🔴 P1 | On-call | Telegram + **qo'ng'iroq** |
| 2 | **Xatolik darajasi** | 5xx > 1% (5 daq) | 🔴 P1 | On-call | Telegram + qo'ng'iroq |
| 3 | **To'lov yiqilgan** | `payment{status="failed"}` > 20% (5 daq) | 🔴 P1 | On-call + moliya | Telegram + qo'ng'iroq |
| 4 | **To'lov nomuvofiqligi** | `reconcile_mismatch > 0` | 🔴 P1 | Moliya + CTO | Telegram + email |
| 5 | **Fiskal navbat** | `fiscal_queue_depth > 50` (10 daq) | 🔴 P1 | On-call | Telegram + qo'ng'iroq |
| 6 | **Fiskal 48 soat** | `fiscal_oldest_pending > 158400` | 🔴 P1 | On-call + restoran | Telegram |
| 7 | **DB yiqilgan** | `pg_up == 0` (30 s) | 🔴 P1 | On-call | Telegram + qo'ng'iroq |
| 8 | **Tenant sizishi** | `tenant_violation_total > 0` | 🔴 **P0** | CTO + hamma | Telegram + qo'ng'iroq |
| 9 | Javob sekin | p95 > 1 s (5 daq) | 🟠 P2 | On-call | Telegram |
| 10 | DB conn pool | > 85% | 🟠 P2 | On-call | Telegram |
| 11 | Replication lag | > 30 s | 🟠 P2 | On-call | Telegram |
| 12 | Navbat to'lgan | `queue_depth > 1000` | 🟠 P2 | On-call | Telegram |
| 13 | Worker o'lgan | `heartbeat_age > 180` | 🟠 P2 | On-call | Telegram |
| 14 | Disk | > 85% | 🟠 P2 | DevOps | Telegram |
| 15 | RAM | > 90% (10 daq) | 🟠 P2 | DevOps | Telegram |
| 16 | Circuit breaker OPEN | `cb_state == 2` (5 daq) | 🟠 P2 | Backend | Telegram |
| 17 | S3 xatolari | > 5% (5 daq) | 🟠 P2 | DevOps | Telegram |
| 18 | WS uzilish | > 20% (5 daq) | 🟡 P3 | Backend | Telegram |
| 19 | AI xarajat (kunlik) | > $50/kun | 🟡 P3 | CTO | Telegram |
| 20 | AI byudjet 80% | oylik > $400 | 🟡 P3 | CTO | Telegram |
| 21 | Kesh hit past | < 70% (30 daq) | 🟡 P3 | Backend | Telegram |
| 22 | CDN hit past | < 85% (1 soat) | 🟡 P3 | DevOps | Telegram |
| 23 | Telegram 429 | > 100/soat | 🟡 P3 | Backend | Telegram |
| 24 | TLS tugayapti | < 14 kun | 🟡 P3 | DevOps | Telegram + email |
| 25 | Backup yiqildi | kunlik dump yo'q | 🟠 P2 | DevOps | Telegram |
| 26 | Backup verify | `pg_restore` sinovi yiqildi | 🟠 P2 | DevOps | Telegram |
| 27 | Restoran nofaol | 3 kun buyurtma yo'q | 🟢 P4 | Sotuv | Telegram (sotuv guruhi) |
| 28 | ⛔ Izolyatsiya | `bittada-*` inactive yoki port 8040 yo'q | 🔴 **P0** | CTO + DevOps | Telegram + qo'ng'iroq |

```yaml
# /etc/prometheus/rules/armenu-critical.yml
groups:
  - name: armenu-p1
    interval: 15s
    rules:
      - alert: ARMenuDown
        expr: up{job="armenu-web"} == 0
        for: 1m
        labels: {severity: p1, team: oncall}
        annotations:
          summary: "🔴 ARMENU web javob bermayapti"
          runbook: "https://docs.armenu.uz/runbook#sayt-ochilmayapti"

      - alert: HighErrorRate
        expr: |
          sum(rate(armenu_http_requests_total{status=~"5.."}[5m]))
          / sum(rate(armenu_http_requests_total[5m])) > 0.01
        for: 5m
        labels: {severity: p1, team: oncall}
        annotations:
          summary: "🔴 5xx darajasi {{ $value | humanizePercentage }}"

      - alert: FiscalQueueBacklog
        expr: armenu_fiscal_queue_depth > 50
        for: 10m
        labels: {severity: p1, team: oncall}
        annotations:
          summary: "🔴 Fiskal navbat {{ $value }} — chek yuborilmayapti"
          runbook: "https://docs.armenu.uz/runbook#fiskal-yiqilgan"

      - alert: TenantIsolationViolation
        expr: increase(armenu_tenant_violation_total[1m]) > 0
        for: 0m
        labels: {severity: p0, team: all}
        annotations:
          summary: "🔴🔴 TENANT IZOLYATSIYA BUZILDI — DARHOL ARALASHUV"

      - alert: MebelcityAffected
        expr: |
          probe_success{job="mebelcity-guard"} == 0
          or absent(probe_success{job="mebelcity-guard"})
        for: 2m
        labels: {severity: p0, team: all}
        annotations:
          summary: "⛔ mebelcity (8040) javob bermayapti — ARMENU ta'sir qilgan bo'lishi mumkin"
          runbook: "Darhol ARMENU deploy'ini rollback qiling va izolyatsiya_tekshir.sh"
```

---

## 9. LOG STRATEGIYASI

### 9.1 Darajalar

| Daraja | Qachon | Namuna | Saqlash |
|---|---|---|---|
| `DEBUG` | Faqat dev | SQL, kesh hit | ❌ prod'da o'chirilgan |
| `INFO` | Normal biznes hodisa | "Buyurtma #047 yaratildi" | 30 kun |
| `WARNING` | G'ayrioddiy, lekin ishlaydi | "Gemini yiqildi → Groq" | 90 kun |
| `ERROR` | Operatsiya bajarilmadi | "Fiskal chek yuborilmadi" | 90 kun |
| `CRITICAL` | Tizim xavf ostida | "Barcha to'lov provayderi yiqilgan" | 1 yil |
| `AUDIT` | Moliyaviy/xavfsizlik | To'lov, chek, rol o'zgarishi | ⚡ **90 kun** (moliya 5 yil) |

### 9.2 JSON format

```python
# config/logging.py
import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'msg': record.getMessage(),
            'module': record.module,
            'line': record.lineno,
        }
        # Kontekst (middleware o'rnatadi — contextvars)
        for key in ('request_id', 'restaurant_id', 'user_id', 'session_id',
                    'endpoint', 'method', 'status', 'duration_ms'):
            val = getattr(record, key, None)
            if val is not None:
                payload[key] = val
        if record.exc_info:
            payload['exc'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)   # ⚡ o'zbekcha matn buzilmasin


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {'()': 'config.logging.JsonFormatter'},
    },
    'filters': {
        'scrub': {'()': 'config.logging.ScrubFilter'},   # ⚡ PII maskalash
    },
    'handlers': {
        'console': {                       # journald → promtail → Loki
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['scrub'],
        },
        'audit': {                         # ⚡ moliyaviy log ALOHIDA fayl
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': '/var/log/armenu/audit.log',
            'when': 'midnight',
            'backupCount': 90,             # 90 kun
            'formatter': 'json',
            'filters': ['scrub'],
        },
        'finance': {                       # ⚡ to'lov/chek — 5 yil (soliq)
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': '/var/log/armenu/finance.log',
            'when': 'midnight',
            'backupCount': 1826,           # 5 yil
            'formatter': 'json',
            'filters': ['scrub'],
        },
    },
    'loggers': {
        'django':       {'handlers': ['console'], 'level': 'INFO'},
        'armenu':       {'handlers': ['console'], 'level': 'INFO'},
        'integrations': {'handlers': ['console'], 'level': 'INFO'},
        'ai.mcp':       {'handlers': ['console'], 'level': 'INFO'},
        'audit':        {'handlers': ['audit', 'console'], 'level': 'INFO',
                         'propagate': False},
        'finance':      {'handlers': ['finance', 'console'], 'level': 'INFO',
                         'propagate': False},
    },
}
```

### 9.3 Nima yoziladi / yozilmaydi

| ✅ YOZILADI | ⛔ HECH QACHON YOZILMAYDI |
|---|---|
| `request_id`, `restaurant_id`, `session_id` (uuid) | 🔴 Karta raqami / PAN / CVV |
| Buyurtma raqami, summa, holat | 🔴 API kalitlar, tokenlar, parollar |
| Provayder nomi, latency, xato kodi | 🔴 Mijoz telefoni (to'liq) — oxirgi 4 raqam mumkin |
| Endpoint, HTTP metod, status | 🔴 Mijoz ismi / familiyasi |
| Foydalanuvchi ID (raqam) | 🔴 Telegram user id (xesh qilinadi) |
| IP (⚠️ 90 kun, keyin anonimlashtiriladi) | 🔴 `Authorization` header |
| Fiskal belgi (fiscal_sign) | 🔴 Webhook imzo qiymati |
| Xato stack trace | 🔴 Xom webhook body (maskalanmagan) |

```python
# config/logging.py — ScrubFilter
import re

PATTERNS = [
    (re.compile(r'\b\d{16}\b'),                          '****CARD****'),
    (re.compile(r'\b(?:sk|pk|ak)[-_][A-Za-z0-9_\-]{16,}'), '***KEY***'),
    (re.compile(r'\bBearer\s+[A-Za-z0-9._\-]+'),         'Bearer ***'),
    (re.compile(r'\+?998\d{9}'),                         '+998*******'),
    (re.compile(r'"(password|token|secret|cvv|pan)"\s*:\s*"[^"]*"'),
     r'"\1":"***"'),
]


class ScrubFilter(logging.Filter):
    def filter(self, record):
        msg = record.getMessage()
        for pat, repl in PATTERNS:
            msg = pat.sub(repl, msg)
        record.msg, record.args = msg, ()
        return True
```

### 9.4 Saqlash muddati

| Log turi | Joy | Muddat | Sabab |
|---|---|---|---|
| Ilova log (INFO/WARN) | Loki | 30 kun | Debug |
| Xato log (ERROR/CRIT) | Loki + Sentry | 90 kun | Tahlil |
| nginx access | Fayl + Loki | 30 kun | Trafik tahlili |
| **AuditLog** (DB jadval) | PostgreSQL | **3 yil** | Xavfsizlik, kim nima qildi |
| **finance.log** | Fayl + S3 | ⚡ **5 yil** | Soliq talabi |
| **Fiskal cheklar** (DB + PDF) | PG + S3 | ⚡ **5 yil** | Qonun |
| systemd journal | Lokal | 7 kun (`SystemMaxUse=2G`) | Disk tejash |
| Backup log | Fayl | 1 yil | Tiklash tarixi |

```bash
# /etc/logrotate.d/armenu
/var/log/armenu/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 0640 armenu armenu
    sharedscripts
    postrotate
        systemctl reload armenu >/dev/null 2>&1 || true
    endscript
}

/var/log/armenu/finance.log {
    daily
    rotate 1826
    compress
    missingok
    notifempty
    create 0600 armenu armenu      # ⚡ faqat egasi o'qiydi
    olddir /var/log/armenu/finance-archive
    postrotate
        # kunlik arxiv S3 ga (WORM bucket)
        aws s3 cp /var/log/armenu/finance-archive/ \
            s3://armenu-audit/finance/ --recursive --sse AES256 >/dev/null 2>&1 || true
    endscript
}
```

---

## 10. BACKUP VA TIKLASH

### 10.1 Nima / qachon / qayerda / qancha

| Ma'lumot | Chastota | Usul | Joy | Saqlash | RPO | RTO |
|---|---|---|---|---|---|---|
| **PostgreSQL to'liq** | Kunlik 03:00 | `pg_dump -Fc -Z6` | S3 (boshqa region) + lokal | 30 kun | 24 s | 30 daq |
| **PostgreSQL WAL** | Uzluksiz | `pgbackrest` / `archive_command` | S3 | 7 kun | ⚡ **~0** | 15 daq |
| **Predeploy dump** | Har deploy | `pg_dump -Fc` | Lokal `/backup` | 7 kun | — | 10 daq |
| **Redis snapshot** | 6 soatda | `BGSAVE` + `rdb` nusxa | S3 | 3 kun | 6 s | 5 daq |
| **3D fayllar (S3)** | Real-time | S3 versioning + cross-region replica | S3 ×2 | Doimiy | ~0 | 1 soat |
| **Media (rasm)** | Kunlik | `rclone sync` | S3 | 30 kun | 24 s | 2 soat |
| **Fiskal cheklar** | Real-time | DB + S3 (WORM) | S3 | ⚡ 5 yil | 0 | — |
| **Kod** | Har commit | Git | GitHub + lokal mirror | Doimiy | 0 | 5 daq |
| **Konfiguratsiya** | Har o'zgarish | Git (shifrlangan, `sops`) | GitHub | Doimiy | 0 | 10 daq |
| **`.env` sirlari** | Qo'lda | `age`/`sops` shifrlangan | 1Password + offline | Doimiy | — | — |

### 10.2 Backup skripti

```bash
#!/bin/bash
# /home/armenu/app/scripts/backup.sh
# Cron: 0 3 * * *  (armenu crontab)
set -euo pipefail
source /home/armenu/app/.env

TS=$(date +%Y%m%d_%H%M%S)
DAY=$(date +%Y-%m-%d)
DIR=/backup
LOG=/var/log/armenu/backup.log
exec >> "$LOG" 2>&1
echo "===== $TS backup boshlandi ====="

# --- 1. PostgreSQL ---
DUMP="$DIR/armenu_${TS}.dump"
pg_dump -Fc -Z6 -d "$DB_NAME" -f "$DUMP"
SIZE=$(du -h "$DUMP" | cut -f1)
echo "✅ PG dump: $DUMP ($SIZE)"

# --- 2. Yaxlitlik tekshiruvi (dump o'qiladimi) ---
pg_restore --list "$DUMP" > /dev/null
echo "✅ Dump yaxlitligi OK"

# --- 3. Redis ---
redis-cli -n 5 BGSAVE > /dev/null
sleep 5
cp /var/lib/redis/dump.rdb "$DIR/redis_${TS}.rdb"
echo "✅ Redis snapshot"

# --- 4. Konfiguratsiya ---
tar czf "$DIR/config_${TS}.tar.gz" \
    /etc/nginx/sites-available/armenu.conf \
    /etc/systemd/system/armenu*.service \
    /etc/systemd/system/armenu*.socket \
    /etc/systemd/system/armenu*.target \
    2>/dev/null || true
echo "✅ Konfiguratsiya"

# --- 5. S3 (shifrlangan) ---
aws s3 cp "$DUMP"                  "s3://armenu-backup/db/$DAY/"     --sse AES256
aws s3 cp "$DIR/redis_${TS}.rdb"   "s3://armenu-backup/redis/$DAY/"  --sse AES256
aws s3 cp "$DIR/config_${TS}.tar.gz" "s3://armenu-backup/config/$DAY/" --sse AES256
echo "✅ S3 ga yuklandi"

# --- 6. Media sinxronizatsiya ---
rclone sync /var/armenu/media s3:armenu-media/ --exclude '/tmp/**' --quiet
echo "✅ Media sync"

# --- 7. Lokal tozalash ---
find "$DIR" -name 'armenu_*.dump' -mtime +7  -delete
find "$DIR" -name 'redis_*.rdb'   -mtime +3  -delete
find "$DIR" -name 'config_*.tar.gz' -mtime +14 -delete

# --- 8. Xabar ---
curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
  -d chat_id="${TG_CHAT}" \
  -d text="✅ ARMENU backup: ${SIZE} · ${DAY}" > /dev/null

echo "===== backup tugadi ====="
```

### 10.3 ⚡ Avtomatik tiklash sinovi (verify)

> Sinalmagan backup — backup emas. **Har kecha 04:30 da haqiqiy `pg_restore` sinovi.**

```bash
#!/bin/bash
# /home/armenu/app/scripts/backup_verify.sh
# Cron: 30 4 * * *
set -euo pipefail
source /home/armenu/app/.env

LATEST=$(ls -t /backup/armenu_*.dump | head -1)
TESTDB="armenu_verify_$(date +%s)"
echo "🔍 Tekshiruv: $LATEST → $TESTDB"

createdb -O armenu "$TESTDB"
trap 'dropdb --if-exists "$TESTDB"' EXIT

# 1. Tiklash
if ! pg_restore -d "$TESTDB" -j 4 --no-owner "$LATEST" 2>/tmp/restore_err.log; then
  grep -qv 'already exists' /tmp/restore_err.log && {
    curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
      -d chat_id="${TG_CHAT}" \
      -d text="🔴 P2 BACKUP TIKLANMADI: $LATEST%0A$(head -5 /tmp/restore_err.log)"
    exit 1; }
fi

# 2. Mazmun tekshiruvi — bo'sh baza tiklanmasin
ORDERS=$(psql -tAd "$TESTDB" -c 'SELECT count(*) FROM orders_order')
DISHES=$(psql -tAd "$TESTDB" -c 'SELECT count(*) FROM menu_dish')
RESTS=$(psql  -tAd "$TESTDB" -c 'SELECT count(*) FROM tenants_restaurant')
PAY=$(psql    -tAd "$TESTDB" -c "SELECT count(*) FROM payments_payment WHERE state='paid'")

echo "Buyurtma=$ORDERS Taom=$DISHES Restoran=$RESTS To'lov=$PAY"

if [ "$RESTS" -lt 1 ] || [ "$DISHES" -lt 1 ]; then
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
    -d chat_id="${TG_CHAT}" \
    -d text="🔴 P2 BACKUP BO'SH! restoran=$RESTS taom=$DISHES"
  exit 1
fi

# 3. Migratsiya holati
psql -tAd "$TESTDB" -c 'SELECT count(*) FROM django_migrations' > /dev/null

# 4. Metrikaga yozish
cat > /var/lib/node_exporter/textfile/backup_verify.prom <<EOF
armenu_backup_verify_success 1
armenu_backup_verify_timestamp $(date +%s)
armenu_backup_verify_orders $ORDERS
armenu_backup_verify_size_bytes $(stat -c%s "$LATEST")
EOF

curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
  -d chat_id="${TG_CHAT}" \
  -d text="✅ Backup verify OK · restoran=$RESTS taom=$DISHES buyurtma=$ORDERS"
echo "✅ Verify muvaffaqiyatli"
```

### 10.4 Tiklash runbook

```
┌────────────────────────────────────────────────────────────────┐
│ SSENARIY A — TASODIFAN O'CHIRILGAN MA'LUMOT (bir jadval)       │
├────────────────────────────────────────────────────────────────┤
│ 1. ⛔ DARHOL to'xtating: sudo -u armenu touch /var/armenu/MAINTENANCE
│ 2. Vaqtinchalik bazaga tiklang (prod'ga TEGMANG):
│    createdb armenu_rec
│    pg_restore -d armenu_rec -t <jadval> /backup/armenu_<TS>.dump
│ 3. Faqat kerakli qatorlarni ko'chiring:
│    psql -d armenu_rec -c "COPY (SELECT * FROM t WHERE ...) TO '/tmp/x.csv' CSV"
│    psql -d armenu_db  -c "COPY t FROM '/tmp/x.csv' CSV"
│ 4. Tekshiring, maintenance o'chiring
│ ⏱ RTO ~20 daqiqa
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ SSENARIY B — DB BUZILGAN (to'liq tiklash)                       │
├────────────────────────────────────────────────────────────────┤
│ 1. sudo -u armenu touch /var/armenu/MAINTENANCE
│ 2. sudo systemctl stop armenu armenu-ws armenu-workers.target
│ 3. Eski bazani saqlab qo'ying (o'CHIRMANG!):
│    psql -c "ALTER DATABASE armenu_db RENAME TO armenu_db_broken_$(date +%s)"
│ 4. createdb -O armenu armenu_db
│    psql -d armenu_db -c 'CREATE EXTENSION vector; CREATE EXTENSION pg_trgm;'
│ 5. pg_restore -d armenu_db -j 4 --no-owner /backup/armenu_<TS>.dump
│ 6. ⚡ WAL bilan PITR (oxirgi daqiqagacha):
│    pgbackrest --stanza=armenu --type=time \
│               --target="2026-09-08 14:23:00" restore
│ 7. python manage.py migrate --check
│ 8. sudo systemctl start armenu armenu-ws armenu-workers.target
│ 9. bash scripts/smoke.sh
│ 10. rm /var/armenu/MAINTENANCE
│ 11. ⚡ RECONCILIATION: to'lov/fiskal farqini tekshiring
│     python manage.py reconcile_payments --from=<TS> --to=now
│ ⏱ RTO ~30 daqiqa
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ SSENARIY C — SERVER BUTUNLAY YO'Q (falokat)                     │
├────────────────────────────────────────────────────────────────┤
│ 1. Yangi VPS oling (bir xil OS: Ubuntu 24.04)
│ 2. bash <(curl -fsSL https://raw.../scripts/bootstrap.sh)   ← §2.4
│ 3. Sirlarni tiklang: sops -d secrets/env.enc > /home/armenu/app/.env
│ 4. aws s3 cp s3://armenu-backup/db/<sana>/armenu_<TS>.dump /backup/
│ 5. Ssenariy B ning 4-7 qadamlari
│ 6. aws s3 sync s3://armenu-media/ /var/armenu/media/
│ 7. certbot certonly ... (yangi sertifikat)
│ 8. DNS A yozuvini yangi IP ga (TTL 300 → tez tarqaladi)
│ 9. Cloudflare origin IP ni yangilang
│ 10. Smoke test + reconciliation
│ ⏱ RTO ~2-4 soat
└────────────────────────────────────────────────────────────────┘
```

### 10.5 Choraklik tiklash mashqi

| Qadam | Kim | Vaqt |
|---|---|---|
| 1. Staging'ga prod backup'idan to'liq tiklash | DevOps | 40 daq |
| 2. Smoke test + funksional tekshiruv | Backend | 20 daq |
| 3. RTO o'lchash va yozib olish | DevOps | — |
| 4. Runbook'dagi noaniqliklarni tuzatish | Hamma | 30 daq |
| 5. Hisobot (nima ishlamadi) | DevOps | 15 daq |

---

## 11. RUNBOOK — 10 TIPIK HOLAT

### 🔴 R1 — Sayt ochilmayapti

**Belgisi:** 502/503/504, UptimeRobot alert, "sayt ishlamayapti" xabarlari.

```bash
# --- DIAGNOSTIKA ---
systemctl status armenu armenu.socket armenu-ws --no-pager
ss -ltnp | grep -E '8060|8061'
curl -sv http://127.0.0.1:8060/health/
journalctl -u armenu -n 100 --no-pager
nginx -t && systemctl status nginx --no-pager
df -h /                                  # disk to'lgan bo'lishi mumkin
free -h                                  # OOM bo'lganmi
dmesg | tail -20 | grep -i 'killed process'
```

**Tuzatish:**

| Sabab | Qadam |
|---|---|
| gunicorn o'lgan | `sudo systemctl restart armenu` |
| Socket buzilgan | `sudo systemctl restart armenu.socket armenu.service` |
| nginx konfig xato | `nginx -t` → xatoni tuzating → `sudo systemctl reload nginx` |
| OOM kill | `MemoryMax` oshiring yoki `--workers` kamaytiring |
| Disk 100% | R7 ga o'ting |
| DB yiqilgan | R3 ga o'ting |
| Yomon deploy | `bash scripts/rollback.sh` |

**Eskalatsiya:** 10 daqiqada tiklanmasa → CTO. 30 daqiqada → falokat rejimi (§10.4 C).

---

### 🟠 R2 — Sekin ishlayapti (p95 > 1 s)

```bash
# --- DIAGNOSTIKA ---
# 1. Qaysi endpoint sekin
curl -s localhost:8060/metrics | grep armenu_http_request_duration | sort -t= -k2 -rn | head

# 2. DB sekin so'rovlar
psql -d armenu_db -c "
SELECT round(mean_exec_time::numeric,1) ms, calls, round(total_exec_time::numeric) total,
       left(query, 90) q
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15;"

# 3. Bloklovchi qulflar
psql -d armenu_db -c "
SELECT pid, now()-query_start AS dur, wait_event_type, wait_event, left(query,80)
FROM pg_stat_activity WHERE state<>'idle' AND now()-query_start > interval '3s'
ORDER BY dur DESC;"

# 4. Kesh hit
redis-cli -n 5 INFO stats | grep -E 'keyspace_hits|keyspace_misses'

# 5. Yuk
uptime; iostat -x 2 3; htop
```

**Tuzatish:**

| Sabab | Qadam |
|---|---|
| Indeks yo'q | `EXPLAIN ANALYZE` → `AddIndexConcurrently` migratsiyasi |
| Kesh sovuq (deploy'dan keyin) | `python manage.py warm_cache` — 5 daqiqa kuting |
| N+1 so'rov | `select_related` / `prefetch_related` qo'shing |
| Uzoq qulf | `SELECT pg_cancel_backend(<pid>)` (avval `terminate` emas!) |
| Worker yetmaydi | `--workers` oshiring yoki node qo'shing |
| Redis to'lgan | R7 (`maxmemory-policy allkeys-lru` tekshiring) |

---

### 🟠 R3 — DB ulanishlari tugadi

**Belgisi:** `FATAL: sorry, too many clients already`, `OperationalError`.

```bash
# --- DIAGNOSTIKA ---
psql -d armenu_db -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
psql -d armenu_db -c "SHOW max_connections;"
psql -d armenu_db -c "
SELECT pid, application_name, state, now()-state_change AS idle_for, left(query,60)
FROM pg_stat_activity WHERE state='idle in transaction'
ORDER BY idle_for DESC LIMIT 20;"
```

```bash
# --- TUZATISH ---
# 1. "idle in transaction" 10 daqiqadan ortiq — bu leak
psql -d armenu_db -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state='idle in transaction' AND now()-state_change > interval '10 min';"

# 2. Sabab: worker'da ochiq tranzaksiya (⚡ TenantAwareThread finally bloki yo'q)
sudo systemctl restart armenu-workers.target

# 3. Doimiy yechim: PgBouncer
sudo apt install -y pgbouncer
# /etc/pgbouncer/pgbouncer.ini
#   pool_mode = transaction
#   max_client_conn = 1000
#   default_pool_size = 25
# settings.py: DB_PORT=6432, DB_CONN_MAX_AGE=0  ⚡ pgbouncer bilan 0 bo'lishi SHART
```

---

### 🟠 R4 — Navbat to'lgan

```bash
# --- DIAGNOSTIKA ---
python manage.py queue_stats            # har navbat: depth, oldest, failed
redis-cli -n 5 LLEN armenu:queue:model3d
systemctl status 'armenu-worker@*' --no-pager
psql -d armenu_db -c "
SELECT queue, status, count(*), max(now()-created_at) AS oldest
FROM jobs_job GROUP BY queue, status ORDER BY 3 DESC;"
```

**Tuzatish:**

| Sabab | Qadam |
|---|---|
| Worker o'lgan | `sudo systemctl restart armenu-worker@<navbat>` |
| Orphan job (`running`, heartbeat eski) | `python manage.py requeue_orphans --queue=<n>` (healer ham qiladi) |
| Tashqi API sekin (Meshy) | `armenu_circuit_breaker_state` ni tekshiring — normal, kuting |
| Poison message (bir job cheksiz xato) | `python manage.py move_to_dlq --job-id=<id>` |
| Haqiqiy yuk | Konkurentlik oshiring: `--concurrency=4` yoki worker node qo'shing |
| Fiskal navbat | ⚡ R5 ga o'ting — bu P1 |

---

### 🔴 R5 — Fiskal (OFD) yiqilgan

**Belgisi:** `armenu_fiscal_queue_depth > 50`, cheklar yuborilmayapti. ⚡ **Qonuniy risk.**

```bash
# --- DIAGNOSTIKA ---
python manage.py fiscal_status
# → navbat, eng eski pending, provayder holati, circuit breaker

curl -s localhost:8060/metrics | grep -E 'fiscal_queue_depth|fiscal_oldest_pending'
journalctl -u 'armenu-worker@fiscal' -n 200 --no-pager | grep -i error

# Provayderlarni tekshirish
python manage.py shell -c "
from apps.integrations.fiscal.registry import ALL_ADAPTERS
for c in ALL_ADAPTERS:
    a = c(); print(a.name, a.is_configured(), a.health_check())"
```

**Tuzatish:**

```bash
# 1. Circuit breaker OPEN bo'lsa va provayder tiklangan bo'lsa — qo'lda yopish
python manage.py reset_circuit --service=fiscal.uzkassa

# 2. Zaxira provayderga o'tkazish
python manage.py fiscal_set_primary --provider=epos

# 3. Navbatni qayta ishga tushirish
python manage.py fiscal_retry_all --max-age-hours=48

# 4. ⚡ 48 SOAT YAQINLASHSA — restoranlarga xabar
python manage.py fiscal_notify_manual --older-than-hours=40
# → har restoran adminiga: "Chekni kassada qo'lda uring"
```

| Vaqt | Harakat |
|---|---|
| 0-1 soat | Kuzatish, retry o'z-o'zidan ishlaydi |
| 1-6 soat | 🟠 Zaxira provayderga o'tish, OFD support'ga murojaat |
| 6-24 soat | 🔴 Restoranlarga xabar: qo'lda kassa tayyorlansin |
| 24-48 soat | 🔴 P1 — CTO + huquqiy maslahat |
| >48 soat | ⛔ Qo'lda chek MAJBURIY, soliq bilan yozishma |

---

### 🟡 R6 — WebSocket uzilyapti

```bash
# --- DIAGNOSTIKA ---
systemctl status armenu-ws --no-pager
ss -tn state established '( sport = :8061 )' | wc -l
journalctl -u armenu-ws -n 100 --no-pager
redis-cli -n 6 INFO clients
redis-cli -n 6 PUBSUB CHANNELS 'armenu:asgi*' | head
curl -s localhost:8060/metrics | grep armenu_ws_connections
```

**Tuzatish:**

| Sabab | Qadam |
|---|---|
| daphne o'lgan | `sudo systemctl restart armenu-ws` |
| `LimitNOFILE` yetmaydi | `LimitNOFILE=131072` (§4.4) → `daemon-reload` → restart |
| nginx `proxy_read_timeout` past | `3600s` ga qo'ying → `reload nginx` |
| Redis channels to'lgan | `redis-cli -n 6 INFO memory`; `maxmemory` oshiring |
| Cloudflare WS bloklayapti | CF'da `/ws/` uchun Bypass rule tekshiring |
| Klient tarmog'i (mobil) | Normal — auto-reconnect ishlaydi, polling fallback bor |

> ⚡ **Muhim:** WS yiqilsa ham menyu, buyurtma, to'lov ISHLAYDI (polling 10 s).
> Bu P3, P1 emas.

---

### 🟠 R7 — Disk to'ldi

```bash
# --- DIAGNOSTIKA ---
df -h
du -sh /var/log/* /var/armenu/* /backup/* /var/lib/postgresql/* 2>/dev/null | sort -rh | head -15
ncdu /var                      # interaktiv
journalctl --disk-usage
psql -d armenu_db -c "
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) sz
FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"
```

```bash
# --- TUZATISH (tartib bilan, xavfsizdan boshlab) ---
# 1. journald
sudo journalctl --vacuum-size=500M

# 2. Eski backup (lokal — S3 da nusxasi bor)
find /backup -name '*.dump' -mtime +7 -delete
find /backup -name '*.rdb'  -mtime +3 -delete

# 3. nginx kesh (3D fayl — S3 dan qayta yuklanadi)
sudo rm -rf /var/cache/nginx/ar/* && sudo systemctl reload nginx

# 4. Eski log
sudo logrotate -f /etc/logrotate.d/armenu
find /var/log/armenu -name '*.gz' -mtime +90 -delete

# 5. Eski media (S3 ga ko'chirilgan, lokal nusxa kerak emas)
python manage.py prune_local_media --older-than-days=30 --verify-s3

# 6. ⚠️ PostgreSQL — ehtiyot bo'ling
psql -d armenu_db -c "VACUUM (ANALYZE);"
# VACUUM FULL jadval qulflaydi — faqat maintenance oynasida!

# 7. ⛔ HECH QACHON: /home/user/... dagi hech narsani o'chirmang
```

**Oldini olish:** `armenu-healer` disk >85% da avtomatik 1-4 qadamlarni bajaradi.

---

### 🟡 R8 — AI byudjeti tugadi

**Belgisi:** Chatbot javob bermayapti, log'da `AI_BUDGET_EXCEEDED`.

```bash
# --- DIAGNOSTIKA ---
python manage.py ai_usage --period=month --group-by=provider
python manage.py ai_usage --period=today --group-by=restaurant --top=20
curl -s localhost:8060/metrics | grep armenu_ai_cost_usd_total
```

```bash
# --- TUZATISH ---
# 1. Bitta restoran ko'p sarflayaptimi (abuse?)
python manage.py ai_usage --period=today --group-by=restaurant --top=5
#    → shubhali bo'lsa: rate limit qattiqlashtiring

# 2. Vaqtincha limitni oshirish (asoslangan bo'lsa)
python manage.py set_ai_limit --restaurant=42 --daily=5.0

# 3. Arzonroq provayderga o'tkazish (Gemini/DeepSeek prioritetini oshiring)
python manage.py set_ai_priority --task=chat --order=gemini,deepseek,groq,claude

# 4. Kesh TTL uzaytirish (chat javoblari)
# .env: AI_CACHE_TTL=7200 → sudo systemctl reload armenu

# 5. Menyu konteksti kattami (token isrofi)
python manage.py ai_context_size --restaurant=42
#    > 2500 token bo'lsa → build_menu_context() ni qisqartiring
```

| Sabab | Doimiy yechim |
|---|---|
| Restoran soni o'sdi | Byudjetni qayta hisoblang (restoran×$1/oy) |
| 3D generatsiya ko'paydi | Kutubxonadan foydalanish ulushini oshiring (80/20) |
| Bitta restoran abuse | Kunlik limit + chat rate limit (10/5daq) |
| Kesh hit past | TTL uzaytirish, prompt normallashtirish |

---

### 🔴 R9 — To'lov kelmayapti

**Belgisi:** Mijoz to'ladi, lekin buyurtma `unpaid` qolyapti.

```bash
# --- DIAGNOSTIKA ---
# 1. Webhook keldimi
psql -d armenu_db -c "
SELECT provider, method, received_at, raw->>'method' m
FROM integrations_webhookevent
WHERE received_at > now()-interval '1 hour' ORDER BY received_at DESC LIMIT 20;"

# 2. nginx webhook so'rovlarini ko'rdimi
grep '/webhooks/' /var/log/nginx/armenu_access.log | tail -30

# 3. Xato log
journalctl -u armenu --since '1 hour ago' | grep -i -E 'payme|click|uzum|webhook'

# 4. Circuit breaker
curl -s localhost:8060/metrics | grep 'circuit_breaker_state{service="payment'

# 5. Konkret buyurtma
python manage.py payment_trace --order=4471
```

**Tuzatish:**

| Sabab | Qadam |
|---|---|
| Webhook umuman kelmagan | Provayder kabinetida webhook URL ni tekshiring; nginx IP allowlist'ni tekshiring |
| Imzo xato (401) | `.env` dagi `PAYME_KEY`/`CLICK_SECRET` ni provayder kabinetiga solishtiring |
| Summa mos emas | ⚡ Bu **himoya ishladi** — buyurtma summasi o'zgargan. Qo'lda tekshiring |
| Kod xatosi (500) | Sentry'da stack trace → hotfix; `WebhookEvent` xom saqlangan → qayta ishlang |
| Provayder tomonida kechikish | Kuting; 30 daqiqadan keyin reconciliation topadi |

```bash
# ⚡ Yo'qolgan to'lovni tiklash (xom event'dan qayta ishlash)
python manage.py replay_webhooks --provider=payme --since='2026-09-08 12:00' --dry-run
python manage.py replay_webhooks --provider=payme --since='2026-09-08 12:00'

# ⚡ Darhol reconciliation (kunlik cron'ni kutmasdan)
python manage.py reconcile_payments --provider=payme --date=today
```

**Eskalatsiya:** Pul ta'sirlangan → darhol CTO + moliya. Har holat hujjatlashtiriladi.

---

### 🟠 R10 — Migratsiya xato bilan tugadi

**Belgisi:** Deploy'da `migrate` yiqildi, DB yarim holatda.

```bash
# --- DIAGNOSTIKA ---
python manage.py showmigrations | grep -v '\[X\]'
psql -d armenu_db -c "SELECT app, name, applied FROM django_migrations ORDER BY id DESC LIMIT 10;"
psql -d armenu_db -c "
SELECT pid, now()-query_start dur, left(query,100) FROM pg_stat_activity
WHERE query ILIKE '%ALTER TABLE%' OR query ILIKE '%CREATE INDEX%';"
```

```bash
# --- TUZATISH ---
# A) Migratsiya HALI ishlayapti (uzoq indeks) — SABR QILING
#    CONCURRENTLY indeks katta jadvalda 10-30 daqiqa olishi mumkin
#    ⛔ TO'XTATMANG — yarim indeks qoladi

# B) Qulflanib qolgan
psql -d armenu_db -c "SELECT pg_cancel_backend(<pid>);"        # avval cancel
# ishlamasa:
psql -d armenu_db -c "SELECT pg_terminate_backend(<pid>);"

# C) Yaroqsiz indeks qolgan (CONCURRENTLY yarim qolganda)
psql -d armenu_db -c "SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;"
psql -d armenu_db -c "DROP INDEX CONCURRENTLY <nom>;"
python manage.py migrate                      # qaytadan

# D) Migratsiya qo'llanmagan, lekin sxema o'zgargan
python manage.py migrate <app> <oldingi_nomer> --fake
# ⚠️ FAQAT sxemani qo'lda tekshirgandan KEYIN

# E) Umid yo'q — predeploy dump'dan tiklash
sudo systemctl stop armenu armenu-ws armenu-workers.target
TS=$(cat /home/armenu/.last_deploy_ts)
pg_restore -c -d armenu_db "/backup/predeploy_${TS}.dump"
bash scripts/rollback.sh
```

**Oldini olish:** CI darvoza 6 (`lintmigrations`, rollback sinovi) — §6.2.

---

## 12. OPERATSION RITM

### 12.1 Kunlik (~15 daqiqa, ertalab)

```bash
# /home/armenu/app/scripts/kunlik_tekshiruv.sh
```

| # | Tekshiruv | Buyruq / joy | Yashil mezon |
|---|---|---|---|
| 1 | Servislar holati | `systemctl status 'armenu*'` | Hammasi `active` |
| 2 | ⛔ Izolyatsiya | `bash scripts/izolyatsiya_tekshir.sh` | ✅ chiqishi |
| 3 | Kechagi xatolar | Grafana panel 2 | 5xx < 0,5% |
| 4 | p95 latency | Grafana panel 5 | < 250 ms |
| 5 | Backup | `ls -lh /backup/ \| tail -3` | Kechagi dump bor |
| 6 | Backup verify | Telegram xabari | ✅ keldi |
| 7 | Fiskal navbat | `python manage.py fiscal_status` | depth < 10 |
| 8 | To'lov reconcile | Kechagi hisobot | 0 farq |
| 9 | Navbatlar | `python manage.py queue_stats` | Hammasi < 100 |
| 10 | Disk | `df -h /` | < 75% |
| 11 | AI xarajat | Grafana panel 10 | Byudjet ichida |
| 12 | Sentry yangi xatolar | Sentry inbox | 0 yangi kritik |

### 12.2 Haftalik (~1 soat, dushanba)

| # | Ish | Kim |
|---|---|---|
| 1 | `pip-audit` + `npm audit` — yangi CVE | Backend |
| 2 | Sekin so'rovlar top-15 (`pg_stat_statements`) tahlili | Backend |
| 3 | Log'dagi takrorlanuvchi WARNING'lar | Backend |
| 4 | Disk o'sish tendensiyasi (30 kunlik grafik) | DevOps |
| 5 | AI xarajat tendensiyasi va provayder samaradorligi | CTO |
| 6 | Circuit breaker ochilish statistikasi | Backend |
| 7 | Cloudflare IP ro'yxatini yangilash | Avtomatik (cron) |
| 8 | Alert "shovqini" ko'rigi — noto'g'ri alert bormi | On-call |
| 9 | Ochiq incident'lar ko'rigi | Hamma |
| 10 | ⛔ mebelcity holati — hech narsa buzilmaganmi | DevOps |

### 12.3 Oylik (~half kun)

| # | Ish | Kim |
|---|---|---|
| 1 | 🧪 **Chaos engineering** (§10 dagi 7 ta test) | DevOps + Backend |
| 2 | ⚡ **Yuklama testi** (k6, `p95<250ms`, `fail<1%`) | Backend |
| 3 | Sig'im rejalashtirish (o'sish → keyingi node qachon) | CTO |
| 4 | Xarajat tahlili (server + AI + CDN + OFD) | CTO |
| 5 | Backup'dan **to'liq tiklash** (staging'da) | DevOps |
| 6 | Bog'liqliklarni yangilash (minor/patch) | Backend |
| 7 | IKPU katalog snapshot yangilash | Avtomatik (cron) |
| 8 | Alert qoidalarini qayta ko'rish | On-call |
| 9 | Grafana panellarini yangilash | DevOps |
| 10 | Runbook'ni yangilash (o'tgan oy incident'lari asosida) | On-call |

### 12.4 Choraklik (1-2 kun)

| # | Ish | Kim |
|---|---|---|
| 1 | 🔑 **API kalitlar rotatsiyasi** (AI, to'lov, OFD, Telegram) | CTO |
| 2 | 🔐 Xavfsizlik auditi (`bandit`, `check --deploy`, tashqi pentest yiliga 1) | CTO |
| 3 | 💾 **Falokatdan tiklash mashqi** (§10.5) | Hamma |
| 4 | 📊 SLA/SLO hisoboti (99,9% bajarildimi) | CTO |
| 5 | 🗄 Django/PostgreSQL major versiya rejasi | Backend |
| 6 | 📜 Log saqlash siyosati auditi (5 yil moliya, PII yo'qmi) | CTO |
| 7 | 🏗 Arxitektura ko'rigi (bu hujjat yangilanadi) | Arxitektor |
| 8 | 👥 On-call navbat va eskalatsiya ro'yxatini yangilash | CTO |
| 9 | 💰 Server xarajati vs daromad nisbati | CEO + CTO |
| 10 | ⛔ Izolyatsiya auditi (sudoers, pg_hba, Redis ACL) | DevOps |

---

## 13. ON-CALL

### 13.1 Kim va qachon

| Bosqich | Jamoa hajmi | Sxema |
|---|---|---|
| **0-6 oy** | 2 dasturchi | Ikkalasi ham, "kim bo'sh bo'lsa"; kechasi faqat P0/P1 |
| **6-12 oy** | 4 texnik | Haftalik navbat, 1 asosiy + 1 zaxira |
| **12+ oy** | 6+ texnik | Haftalik, follow-the-sun emas (bitta vaqt zonasi) |

**Ish vaqti:** O'zbekiston restoranlarining pik vaqti — **12:00-15:00** va **18:00-23:00**.
⚡ Bu oynalarda deploy **QILINMAYDI**.

| Vaqt | Javob berish | Kim |
|---|---|---|
| 09:00-23:00 | P1: 5 daq · P2: 30 daq | Asosiy on-call |
| 23:00-09:00 | P0/P1: 15 daq · P2: ertalab | Asosiy on-call (qo'ng'iroq) |
| Dam olish kunlari | Xuddi shunday | Navbatchi |

### 13.2 Daraja va javob vaqti

| Daraja | Ta'rif | Javob | Tiklash maqsadi | Kanal |
|---|---|---|---|---|
| 🔴 **P0** | Tenant sizishi, ma'lumot yo'qolishi, mebelcity ta'sirlangan | **Darhol** | 1 soat | Qo'ng'iroq + Telegram + hamma |
| 🔴 **P1** | Sayt yiqilgan, to'lov/fiskal ishlamayapti | 5 daq (kunduzi) / 15 daq (kechasi) | 2 soat | Qo'ng'iroq + Telegram |
| 🟠 **P2** | Sekin, navbat to'lgan, bir modul ishlamayapti | 30 daqiqa | 8 soat | Telegram |
| 🟡 **P3** | WS uzilishi, AI xarajat, kesh | Ish vaqtida | 3 kun | Telegram |
| 🟢 **P4** | Kosmetik, biznes bildirishnoma | Sprint'da | — | Telegram (guruh) |

### 13.3 Eskalatsiya zanjiri

```
        ALERT (Alertmanager)
              │
              ▼
    ┌─────────────────────┐
    │ 1. ASOSIY ON-CALL   │  Telegram + (P0/P1: qo'ng'iroq)
    │    Backend dasturchi│
    └──────────┬──────────┘
               │ 15 daqiqa javob yo'q
               │ yoki "yordam kerak"
               ▼
    ┌─────────────────────┐
    │ 2. ZAXIRA ON-CALL   │  Telegram + qo'ng'iroq
    │    2-dasturchi      │
    └──────────┬──────────┘
               │ 30 daqiqa (P0/P1 hal bo'lmadi)
               ▼
    ┌─────────────────────┐
    │ 3. CTO              │  Qo'ng'iroq
    │  qaror: rollback /  │
    │  maintenance /      │
    │  tashqi yordam      │
    └──────────┬──────────┘
               │ 1 soat (P0 davom etyapti)
               ▼
    ┌─────────────────────┐
    │ 4. CEO + huquqiy    │  ⚡ Mijozlarga xabar
    │    + PR             │  Status sahifa yangilanadi
    └─────────────────────┘

TASHQI ESKALATSIYA (parallel):
  • To'lov muammosi   → Payme/Click/Uzum support (shartnomadagi raqam)
  • Fiskal muammosi   → OFD support + zarurat bo'lsa Soliq qo'mitasi
  • Server/tarmoq     → Hosting provayder support
  • DDoS              → Cloudflare "Under Attack" rejimi + support
```

### 13.4 On-call to'plami

```bash
# ~/.bashrc yoki ~/armenu-oncall.sh
alias a-status='systemctl status "armenu*" --no-pager'
alias a-log='journalctl -u armenu -f --output=cat'
alias a-wslog='journalctl -u armenu-ws -f --output=cat'
alias a-err='journalctl -u armenu --since "1 hour ago" | grep -i error'
alias a-health='curl -s localhost:8060/health/deep/ | jq'
alias a-queues='cd /home/armenu/app && venv/bin/python manage.py queue_stats'
alias a-fiscal='cd /home/armenu/app && venv/bin/python manage.py fiscal_status'
alias a-db='psql -d armenu_db'
alias a-conns='psql -d armenu_db -c "SELECT count(*),state FROM pg_stat_activity GROUP BY state"'
alias a-slow='psql -d armenu_db -c "SELECT round(mean_exec_time::numeric,1) ms,calls,left(query,80) FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10"'
alias a-izol='bash /home/armenu/app/scripts/izolyatsiya_tekshir.sh'
alias a-maint-on='sudo -u armenu touch /var/armenu/MAINTENANCE && echo "🚧 Maintenance YOQILDI"'
alias a-maint-off='sudo -u armenu rm -f /var/armenu/MAINTENANCE && echo "✅ Maintenance o'\''chirildi"'
alias a-rollback='bash /home/armenu/app/scripts/rollback.sh'
alias a-smoke='bash /home/armenu/app/scripts/smoke.sh'
```

**Kerakli havolalar (on-call kartochkasida):**

| Nima | Havola |
|---|---|
| Grafana | `https://obs.armenu.uz/d/armenu-health` |
| Sentry | `https://sentry.io/organizations/armenu/issues/` |
| Status sahifa | `https://status.armenu.uz` |
| Runbook | Bu hujjat §11 |
| Payme support | Shartnomadagi raqam |
| OFD support | Shartnomadagi raqam |
| Hosting support | Panel + tiket |

### 13.5 Post-mortem shabloni

> ⚡ **Har P0/P1 uchun MAJBURIY**, 48 soat ichida. **Aybdorsiz (blameless)** —
> maqsad odamni emas, tizimni tuzatish.

```markdown
# Post-mortem: <qisqa sarlavha>

**Sana:** 2026-09-08
**Daraja:** P1
**Davomiyligi:** 14:23 – 15:07 (44 daqiqa)
**Mualliflar:** <ismlar>
**Holat:** Yopilgan / Harakat davom etyapti

---

## 1. Qisqacha (1 abzas)
Nima bo'ldi, kim ta'sirlandi, qancha davom etdi.

## 2. Ta'sir
| Ko'rsatkich | Qiymat |
|---|---|
| Ta'sirlangan restoranlar | 42 (jami 168 dan) |
| Yo'qolgan buyurtmalar | 0 (navbatda saqlandi) |
| Moliyaviy ta'sir | ~$0 / N so'm |
| SLA buzilishi | 44 daq (oylik byudjet: 43 daq) — 🔴 buzildi |
| Mijoz shikoyatlari | 3 |

## 3. Vaqt jadvali (UTC+5)
| Vaqt | Hodisa |
|---|---|
| 14:23 | Alert: `HighErrorRate` (5xx 8%) |
| 14:25 | On-call javob berdi, Grafana ochildi |
| 14:31 | Sabab aniqlandi: DB conn pool 100% |
| 14:38 | `idle in transaction` ulanishlar terminate qilindi |
| 14:41 | Xato darajasi 1% ga tushdi |
| 14:52 | Worker'lar restart qilindi (asl sabab) |
| 15:07 | Barcha metrikalar normal, incident yopildi |

## 4. Asl sabab (root cause)
Texnik tushuntirish. "5 nega" usuli:
1. Nega sayt 5xx berdi? → DB ulanishlari tugadi
2. Nega tugadi? → worker'da 40 ta `idle in transaction`
3. Nega idle qoldi? → `TenantAwareThread` da `finally` bloki yo'q edi
4. Nega yo'q edi? → yangi worker turi qo'shilganda ko'chirilmadi
5. Nega ko'chirilmadi? → kod ko'rigida bu naqsh tekshirilmadi

## 5. Nima yaxshi ishladi ✅
- Alert 2 daqiqada ishga tushdi
- Runbook R3 to'g'ri qadamlarni berdi
- Buyurtmalar navbatda saqlandi, 0 ta yo'qolmadi
- Fiskal cheklar keyin muvaffaqiyatli yuborildi

## 6. Nima yomon ketdi ❌
- Sabab topish 8 daqiqa oldi (dashboard'da conn pool paneli yo'q edi)
- Zaxira on-call javob bermadi (telefon jim rejimda)

## 7. Harakat rejasi
| # | Harakat | Kim | Muddat | Holat |
|---|---|---|---|---|
| 1 | `TenantAwareThread` ga `finally` qo'shish | Backend | 09-09 | ✅ |
| 2 | Grafana'ga "DB conn pool" paneli | DevOps | 09-10 | 🔄 |
| 3 | Alert: `idle in transaction > 10` | DevOps | 09-10 | 🔄 |
| 4 | PgBouncer o'rnatish | DevOps | 09-20 | 📋 |
| 5 | Kod ko'rigi ro'yxatiga "thread finally" bandi | Backend | 09-12 | 📋 |
| 6 | On-call telefon sozlamalari yo'riqnomasi | CTO | 09-09 | ✅ |

## 8. Saboqlar
Boshqa joyda ham shu muammo bormi? Qanday umumlashtiriladi?
```

---

## 14. XULOSA

### 14.1 Bu qismda nima hal qilindi

| # | Mavzu | Natija |
|---|---|---|
| 1 | Muhitlar | dev / staging / prod aniq ajratilgan, staging anonimlashtirilgan |
| 2 | Infratuzilma | S0 ($40) → S3 ($700) → S5 ($4 400) yo'li hisoblangan |
| 3 | ⛔ **Izolyatsiya** | 14 o'lchamda ajratish + sudoers + pg_hba + Redis ACL + avtomatik tekshiruv skripti |
| 4 | systemd | Socket activation → **zero-downtime**; 9 unit, to'liq konfig, security sandbox |
| 5 | nginx | To'liq konfig: 9 rate limit zonasi, AR CORS+MIME, maintenance, TLS 1.3 |
| 6 | CI/CD | 6 darvoza (tenant izolyatsiya MAJBURIY) → backup → deploy → 12 smoke → avto-rollback |
| 7 | Deploy | Backward-compatible migratsiya qoidalari, kesh strategiyasi, rollback mezonlari |
| 8 | Monitoring | 40+ metrika, 14 panel, 28 alert qoidasi (P0-P4) |
| 9 | Log | JSON, PII maskalash, moliya logi 5 yil |
| 10 | Backup | Kunlik + WAL + **avtomatik `pg_restore` verify** + 3 ssenariyli tiklash |
| 11 | Runbook | 10 tipik holat: belgi → diagnostika → tuzatish → eskalatsiya |
| 12 | Ritm | Kunlik 12 · haftalik 10 · oylik 10 · choraklik 10 tekshiruv |
| 13 | On-call | 4 bosqichli eskalatsiya, aybdorsiz post-mortem shabloni |

### 14.2 Operatsion tayyorlik mezoni (v1 ishga tushirishdan oldin)

- [ ] `izolyatsiya_tekshir.sh` ✅ qaytaradi (mebelcity buzilmagan)
- [ ] 9 ta systemd unit `active`, socket activation ishlaydi
- [ ] nginx `-t` toza, TLS A+ (SSL Labs)
- [ ] 6 CI darvozasi yashil, tenant izolyatsiya testi 100%
- [ ] Deploy → smoke → rollback bir marta **mashq qilingan**
- [ ] Grafana 14 panel to'ldirilgan, 28 alert Telegram'ga keladi
- [ ] Backup 3 kun ketma-ket muvaffaqiyatli + verify ✅
- [ ] Staging'da to'liq tiklash mashqi bajarilgan (RTO o'lchangan)
- [ ] On-call navbat va telefon raqamlari tasdiqlangan
- [ ] Runbook 10 holat o'qilgan va tushunilgan

### 14.3 Arxitektura hujjati — to'liq to'plam

| Qism | Fayl | Mavzu |
|---|---|---|
| 0 | `00_UMUMIY_KORINISH.md` | Bir qarashda, C4 kontekst, 8 sifat talabi |
| 1 | `01_PRINTSIPLAR_VA_QARORLAR.md` | 12 printsip, 15 ADR |
| 2 | `02_KOMPONENTLAR.md` | Har komponent: vazifa, texnologiya, chegara |
| 3 | `03_MALUMOT_ARXITEKTURASI.md` | DB sxema, indeks, partition, kesh |
| 4 | `04_MASSHTABLASH.md` | S0→S5, 1 mln foydalanuvchi |
| 5 | `05_ISHONCHLILIK.md` | Fault-tolerance, self-healing, SLA |
| 6 | `06_XAVFSIZLIK.md` | Tahdid modeli, multi-tenant, to'lov |
| 7 | `07_INTEGRATSIYALAR.md` | AI/MCP, to'lov, fiskal, Telegram, CDN |
| **8** | **`08_DEPLOY_VA_OPERATSIYA.md`** | **Infra, CI/CD, monitoring, runbook ← bu fayl** |

### 14.4 Yakuniy fikr

> ARMENU arxitekturasi **oddiy texnologiyalar bilan murakkab talablarni** hal qiladi:
> modulli monolit + systemd + nginx + PostgreSQL. Kubernetes yo'q, mikroservis yo'q —
> chunki 1-2 dasturchi uchun bular **muammo yechmaydi, muammo qo'shadi**.
>
> Chidamlilik **adapter naqshi** (16 tashqi xizmat, hech biri kodga bog'lanmagan),
> **circuit breaker** (kaskadli yiqilish yo'q), **graceful degradation** (har komponent
> uchun fallback zanjiri) va **self-healing** (15 mexanizm) orqali erishiladi.
>
> ⛔ Va eng muhimi: butun tizim `mebelcity_platform` bilan yonma-yon ishlaydi,
> lekin unga **hech qachon tegmaydi** — bu 14 o'lchamda ajratish, sudoers cheklovi,
> DB/Redis darajasidagi bloklash va har deploy'da avtomatik tekshiriladigan skript
> bilan kafolatlanadi.

---

**➡️ Bu arxitektura hujjatining oxiri.**

**Versiya 1.0 · 2026-09-08 · ARMENU loyihasi**
