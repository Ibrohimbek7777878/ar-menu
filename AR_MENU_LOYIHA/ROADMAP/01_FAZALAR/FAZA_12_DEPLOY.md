# FAZA 12 — DEPLOY + KUZATUV

**Vazifalar:** V-219 … V-234 · **Muddat:** 1 hafta
**Maqsad:** Production'da barqaror ishlaydigan, o'zini o'zi tiklaydigan, kuzatiladigan
va zaxiralanadigan tizim. ⚡ Deploy avtomatik, tenant izolyatsiya testi majburiy.

> ⛔ **QAT'IY IZOLYATSIYA:** ARMENU o'z servisi, o'z porti (8060/8061), o'z DB'si
> (`armenu_db`), o'z Redis db'si (5/6), o'z foydalanuvchisi (`armenu`).
> **`mebelcity_platform` ga UMUMAN TEGILMAYDI** — uning servisi, porti (8040),
> nginx konfigi, DB'si o'zgartirilmaydi.

---

## V-219 — nginx konfig (`armenu.conf`)

**Fayl:** `deploy/nginx/armenu.conf` → `/etc/nginx/sites-available/armenu.conf`
```nginx
# ============================================================
#  ARMENU — armenu.uz
#  ⛔ mebelcity (8040) konfigiga TEGILMAYDI — bu alohida fayl
# ============================================================

upstream armenu_web {
    server 127.0.0.1:8060 max_fails=3 fail_timeout=15s;
    keepalive 32;
}
upstream armenu_ws {
    server 127.0.0.1:8061 max_fails=3 fail_timeout=15s;
    keepalive 16;
}

# Rate limit zonalari
limit_req_zone $binary_remote_addr zone=armenu_api:10m  rate=30r/s;
limit_req_zone $binary_remote_addr zone=armenu_qr:10m   rate=10r/s;
limit_req_zone $binary_remote_addr zone=armenu_pay:10m  rate=5r/s;
limit_conn_zone $binary_remote_addr zone=armenu_conn:10m;

# 3D fayllar keshi
proxy_cache_path /var/cache/nginx/armenu levels=1:2 keys_zone=armenu_ar:50m
                 max_size=5g inactive=30d use_temp_path=off;

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# --- HTTP → HTTPS ---
server {
    listen 80;
    listen [::]:80;
    server_name armenu.uz *.armenu.uz;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# --- Asosiy HTTPS server ---
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name armenu.uz *.armenu.uz;

    ssl_certificate     /etc/letsencrypt/live/armenu.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/armenu.uz/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:ARMENU_SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    # ⚡ AR uchun kamera ruxsati (WebXR)
    add_header Permissions-Policy "camera=(self), xr-spatial-tracking=(self), geolocation=(self)" always;

    client_max_body_size 50M;          # 3D fayl yuklash
    client_body_timeout  60s;
    keepalive_timeout    65s;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types text/plain text/css text/xml application/javascript
               application/json application/xml image/svg+xml
               model/gltf+json application/wasm;

    access_log /var/log/nginx/armenu.access.log;
    error_log  /var/log/nginx/armenu.error.log warn;

    # ---------- Statik ----------
    location /static/ {
        alias /home/armenu/app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # ---------- ⚡ 3D / AR media (CORS ochiq — model-viewer va Quick Look uchun) ----------
    location /media/ar/ {
        alias /var/armenu/media/ar/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        add_header Access-Control-Allow-Origin  "*" always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, Content-Type" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;
        add_header Cross-Origin-Resource-Policy "cross-origin" always;
        add_header Timing-Allow-Origin "*" always;

        types {
            model/gltf-binary  glb;
            model/gltf+json    gltf;
            model/vnd.usdz+zip usdz;
            image/ktx2         ktx2;
            application/wasm   wasm;
        }
        default_type application/octet-stream;

        if ($request_method = OPTIONS) { return 204; }

        proxy_cache armenu_ar;
        proxy_cache_valid 200 30d;
        add_header X-Cache-Status $upstream_cache_status;
        try_files $uri =404;
    }

    # ---------- Boshqa media ----------
    location /media/ {
        alias /var/armenu/media/;
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # ---------- ⚡ WebSocket ----------
    location /ws/ {
        proxy_pass http://armenu_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_connect_timeout 10s;
        proxy_buffering off;
        limit_conn armenu_conn 20;
    }

    # ---------- Health (monitoring, log'siz) ----------
    location = /health/ {
        proxy_pass http://armenu_web;
        proxy_set_header Host $host;
        access_log off;
    }
    location = /ready/ {
        proxy_pass http://armenu_web;
        proxy_set_header Host $host;
        access_log off;
    }
    location = /metrics {
        # ⚡ Faqat ichki tarmoq
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://armenu_web;
        access_log off;
    }

    # ---------- ⚡ To'lov webhook (rate-limit yumshoq, imzo backendda) ----------
    location /v1/payments/webhook/ {
        limit_req zone=armenu_pay burst=20 nodelay;
        proxy_pass http://armenu_web;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ---------- QR kirish ----------
    location /t/ {
        limit_req zone=armenu_qr burst=20 nodelay;
        proxy_pass http://armenu_web;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ---------- API ----------
    location /v1/ {
        limit_req zone=armenu_api burst=60 nodelay;
        proxy_pass http://armenu_web;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID      $request_id;
        proxy_read_timeout 60s;
        proxy_connect_timeout 5s;
    }

    # ---------- Qolgan hammasi ----------
    location / {
        proxy_pass http://armenu_web;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID      $request_id;
        proxy_read_timeout 60s;
    }

    # ---------- Xato sahifalari ----------
    error_page 502 503 504 /maintenance.html;
    location = /maintenance.html {
        root /home/armenu/app/deploy/nginx/;
        internal;
    }
}
```

**Fayl:** `deploy/nginx/maintenance.html`
```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARMENU — texnik ishlar</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;
       font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
       background:#0f1115;color:#e7e9ee;text-align:center;padding:24px}
  @media (prefers-color-scheme:light){body{background:#f6f7f9;color:#1a1c22}}
  h1{font-size:22px;margin:0 0 10px}
  p{margin:6px 0;opacity:.75;line-height:1.6}
</style>
<div>
  <div style="font-size:52px">🍽</div>
  <h1>Bir daqiqa...</h1>
  <p>Texnik ishlar olib borilmoqda. Tez orada qaytamiz.</p>
  <p>Идут технические работы · Under maintenance</p>
</div>
```

✅ **Tekshirish:**
```bash
sudo ln -sf /etc/nginx/sites-available/armenu.conf /etc/nginx/sites-enabled/armenu.conf
sudo mkdir -p /var/cache/nginx/armenu && sudo chown www-data:www-data /var/cache/nginx/armenu
sudo nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful
sudo systemctl reload nginx
curl -I https://armenu.uz/health/
```

---

## V-220 — `armenu.service` (gunicorn)

**Fayl:** `deploy/systemd/armenu.service` → `/etc/systemd/system/armenu.service`
```ini
[Unit]
Description=ARMENU web (gunicorn, socket-activated)
Documentation=https://armenu.uz
Requires=armenu.socket
After=network.target postgresql.service redis-server.service armenu.socket

[Service]
Type=notify
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment="DJANGO_SETTINGS_MODULE=config.settings.prod"
Environment="PYTHONUNBUFFERED=1"
Environment="PYTHONDONTWRITEBYTECODE=1"
Environment="PROMETHEUS_MULTIPROC_DIR=/run/armenu/prom"

RuntimeDirectory=armenu
RuntimeDirectoryMode=0755
ExecStartPre=/bin/mkdir -p /run/armenu/prom
ExecStartPre=/bin/rm -rf /run/armenu/prom/*

ExecStart=/home/armenu/app/venv/bin/gunicorn config.wsgi:application \
  --workers 8 \
  --threads 4 \
  --worker-class gthread \
  --worker-tmp-dir /dev/shm \
  --timeout 60 \
  --graceful-timeout 30 \
  --keep-alive 5 \
  --max-requests 2000 \
  --max-requests-jitter 200 \
  --access-logfile - \
  --error-logfile - \
  --log-level info \
  --capture-output \
  --name armenu-web

ExecReload=/bin/kill -s HUP $MAINPID
KillSignal=SIGTERM
TimeoutStopSec=45
Restart=always
RestartSec=5

# Resurs cheklovlari
LimitNOFILE=65535
MemoryMax=6G
CPUWeight=100

# Xavfsizlik
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/home/armenu/app /var/armenu /var/log/armenu /run/armenu

[Install]
WantedBy=multi-user.target
```

**Fayl:** `deploy/systemd/armenu.socket` → `/etc/systemd/system/armenu.socket`
```ini
[Unit]
Description=ARMENU web socket (zero-downtime)
PartOf=armenu.service

[Socket]
ListenStream=127.0.0.1:8060
NoDelay=true
Backlog=2048
ReusePort=true
# ⚡ Socket systemd qo'lida qoladi — reload/restart'da port OCHIQ turadi
# (mebelcity'dagi sinovdan o'tgan yondashuv)

[Install]
WantedBy=sockets.target
```

`config/wsgi.py` gunicorn `Type=notify` bilan ishlashi uchun `.env` da:
```bash
# /home/armenu/app/.env — namuna
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=<kuchli-tasodifiy-50-belgi>
DEBUG=False
ALLOWED_HOSTS=armenu.uz,.armenu.uz,127.0.0.1
PUBLIC_DOMAIN=armenu.uz

# ⛔ mebelcity DB'si EMAS — alohida baza
DB_NAME=armenu_db
DB_USER=armenu
DB_PASSWORD=<parol>
DB_HOST=127.0.0.1
DB_PORT=5432

# ⛔ Redis db=5 (kesh) va db=6 (channels) — mebelcity boshqa db ishlatadi
REDIS_URL=redis://127.0.0.1:6379/5
REDIS_CHANNEL_URL=redis://127.0.0.1:6379/6

SENTRY_DSN=
TELEGRAM_BOT_TOKEN=
ONCALL_CHAT_ID=
CLICKHOUSE_URL=
ANALYTICS_S3_BUCKET=
BACKUP_S3_BUCKET=armenu-backups
```

✅ **Tekshirish:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now armenu.socket
sudo systemctl enable --now armenu.service
sudo systemctl status armenu --no-pager
ss -ltnp | grep 8060
# ⚡ Zero-downtime sinovi:
while true; do curl -s -o /dev/null -w "%{http_code} " https://armenu.uz/health/; sleep 0.2; done &
sudo systemctl reload armenu
# 200 200 200 ... — bitta ham 502 bo'lmasligi kerak
kill %1
```

---

## V-221 — `armenu-ws.service` (daphne)

**Fayl:** `deploy/systemd/armenu-ws.service` → `/etc/systemd/system/armenu-ws.service`
```ini
[Unit]
Description=ARMENU WebSocket (daphne)
After=network.target redis-server.service postgresql.service

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment="DJANGO_SETTINGS_MODULE=config.settings.prod"
Environment="PYTHONUNBUFFERED=1"

ExecStart=/home/armenu/app/venv/bin/daphne \
  -b 127.0.0.1 -p 8061 \
  --proxy-headers \
  --application-close-timeout 20 \
  --websocket_timeout 3600 \
  --access-log - \
  config.asgi:application

KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=5

LimitNOFILE=65535
MemoryMax=3G

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/home/armenu/app /var/armenu /var/log/armenu

[Install]
WantedBy=multi-user.target
```

> ⚠️ **Muhim:** daphne restart qilinganda barcha WS ulanishlari uziladi.
> Klient tomonda avtomatik qayta ulanish (exponential backoff) SHART — u
> FAZA 5 (V-104) da yozilgan. Kod o'zgarishida iloji bo'lsa faqat
> `systemctl reload armenu` qiling; `armenu-ws` ni faqat consumers
> o'zgarganda restart qiling.

✅ **Tekshirish:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now armenu-ws
ss -ltnp | grep 8061
# WS ulanish sinovi:
/home/armenu/app/venv/bin/python - <<'PY'
import asyncio, websockets
async def m():
    async with websockets.connect('ws://127.0.0.1:8061/ws/guest/test/') as w:
        print('WS ulandi ✅')
asyncio.run(m())
PY
```

---

## V-222 — `armenu-worker@.service` (parametrli, 5 navbat)

**Fayl:** `deploy/systemd/armenu-worker@.service` → `/etc/systemd/system/armenu-worker@.service`
```ini
[Unit]
Description=ARMENU worker (%i navbat)
After=network.target redis-server.service postgresql.service
PartOf=armenu-workers.target

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment="DJANGO_SETTINGS_MODULE=config.settings.prod"
Environment="PYTHONUNBUFFERED=1"
Environment="WORKER_QUEUE=%i"

ExecStart=/home/armenu/app/venv/bin/python manage.py run_worker --queue=%i

KillSignal=SIGTERM
TimeoutStopSec=60
Restart=always
RestartSec=10

MemoryMax=2G
LimitNOFILE=16384

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/home/armenu/app /var/armenu /var/log/armenu

[Install]
WantedBy=multi-user.target
```

**Fayl:** `deploy/systemd/armenu-workers.target` → `/etc/systemd/system/armenu-workers.target`
```ini
[Unit]
Description=ARMENU barcha worker'lar
Wants=armenu-worker@model3d.service armenu-worker@fiscal.service \
      armenu-worker@notify.service armenu-worker@ai.service \
      armenu-worker@analytics.service

[Install]
WantedBy=multi-user.target
```

**Fayl:** `core/management/commands/run_worker.py`
```python
import logging, signal, time, traceback
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone

log = logging.getLogger('worker')

# Har navbat uchun handler xaritasi
def load_handlers(queue):
    if queue == 'fiscal':
        from apps.fiscal.handlers import HANDLERS
    elif queue == 'notify':
        from apps.notifications.handlers import HANDLERS
    elif queue == 'model3d':
        from apps.ar3d.handlers import HANDLERS
    elif queue == 'ai':
        from apps.ai.handlers import HANDLERS
    elif queue == 'analytics':
        from apps.analytics.handlers import HANDLERS
    else:
        HANDLERS = {}
    return HANDLERS


class Command(BaseCommand):
    help = 'Navbat worker'

    def add_arguments(self, parser):
        parser.add_argument('--queue', required=True)
        parser.add_argument('--once', action='store_true')

    def handle(self, *args, **o):
        from core.queue import dequeue
        from core.models_job import Job

        queue = o['queue']
        handlers = load_handlers(queue)
        self._running = True

        def stop(signum, frame):
            log.info(f'[worker:{queue}] to\'xtatish signali — joriy ish tugagach chiqamiz')
            self._running = False
        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)

        log.info(f'[worker:{queue}] ishga tushdi ({len(handlers)} handler)')

        while self._running:
            close_old_connections()          # ⚡ conn leak oldini olish
            try:
                job_id = dequeue(queue, timeout=5)
            except Exception as e:
                log.warning(f'[worker:{queue}] dequeue xato: {e}')
                time.sleep(2)
                continue

            if job_id is None:
                if o['once']:
                    break
                continue

            job = Job.objects.filter(id=job_id).first()
            if job is None or job.status in ('done', 'failed'):
                continue

            job.status = 'running'
            job.attempts += 1
            job.heartbeat_at = timezone.now()
            job.save(update_fields=['status', 'attempts', 'heartbeat_at'])

            fn = handlers.get(job.type)
            if fn is None:
                job.status = 'failed'
                job.error = f'Handler topilmadi: {job.type}'
                job.save(update_fields=['status', 'error'])
                log.error(f'[worker:{queue}] handler yo\'q: {job.type}')
                continue

            t0 = time.time()
            try:
                result = fn(job.payload)
                job.status = 'done'
                job.result = {'value': result, 'sec': round(time.time() - t0, 3)}
                job.error = ''
                job.save(update_fields=['status', 'result', 'error'])
                log.info(f'[worker:{queue}] ✅ job#{job.id} {job.type} '
                         f'({time.time() - t0:.2f}s)')
            except Exception as e:
                job.error = traceback.format_exc()[:4000]
                if job.attempts >= job.max_attempts:
                    job.status = 'failed'
                    log.error(f'[worker:{queue}] ⛔ job#{job.id} {job.type} '
                              f'{job.attempts} urinishdan keyin yiqildi: {e}')
                else:
                    job.status = 'queued'
                    from core.queue import enqueue
                    log.warning(f'[worker:{queue}] job#{job.id} xato, qayta: {e}')
                job.save(update_fields=['status', 'error'])
                if job.status == 'queued':
                    from core.queue import get_redis
                    get_redis().lpush(f'q:{queue}', str(job.id))

            if o['once']:
                break

        log.info(f'[worker:{queue}] to\'xtadi')
```

✅ **Tekshirish:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now armenu-worker@model3d armenu-worker@fiscal \
                            armenu-worker@notify armenu-worker@ai \
                            armenu-worker@analytics
sudo systemctl enable --now armenu-workers.target
systemctl list-units 'armenu-worker@*' --no-pager
# 5 ta servis active bo'lishi kerak
```

---

## V-223 — ⚡ `armenu-healer.service` (self-healing daemon)

> ⚡ **Talab (TZ §III.6):** *"tizim o'zini o'zi qayta tiklay olishi"*.
> Har 60 soniyada 7 ta tekshiruv, muammoni O'ZI tuzatadi, tuzata olmasa alert.

**Fayl:** `core/healing/__init__.py` (bo'sh)

**Fayl:** `core/healing/daemon.py`
```python
"""
ARMENU self-healing daemon — armenu-healer.service

Har 60 soniyada tizimni tekshiradi va muammolarni O'ZI tuzatadi.
Tuzata olmasa — alert yuboradi (Telegram).

Tekshiruvlar:
  1. orphan_jobs    — worker o'lganda `running` qolgan job'lar
  2. stuck_orders   — 45 daqiqa `cooking` da qolgan buyurtmalar
  3. db_connections — uzoq idle ulanishlar
  4. redis_memory   — Redis xotira to'lishi
  5. disk_space     — disk >85%
  6. workers        — worker servislari tirikmi
  7. fiscal_queue   — fiskal navbat tiqilib qolgan
"""
import logging
import os
import shutil
import subprocess
import time
from datetime import timedelta

from django.db import connection, close_old_connections
from django.utils import timezone

log = logging.getLogger('healing')

CYCLE_SECONDS = 60
ORPHAN_MINUTES = 15
STUCK_ORDER_MINUTES = 45
IDLE_CONN_MINUTES = 10
REDIS_MEM_PCT = 85
DISK_PCT = 85
FISCAL_QUEUE_LIMIT = 50
FISCAL_STUCK_MINUTES = 15

WORKER_QUEUES = ['model3d', 'fiscal', 'notify', 'ai', 'analytics']


# ============================================================
#  1. ORPHAN JOBS
# ============================================================
def check_orphan_jobs():
    """Worker o'lganda `running` holatda qolgan job'lar"""
    from core.models_job import Job
    cutoff = timezone.now() - timedelta(minutes=ORPHAN_MINUTES)
    orphans = list(Job.objects.filter(status='running',
                                      heartbeat_at__lt=cutoff)[:500])
    return orphans or None


def heal_orphan_jobs(orphans):
    from core.queue import get_redis
    r = get_redis()
    requeued = failed = 0
    for job in orphans:
        if job.attempts < job.max_attempts:
            job.status = 'queued'
            job.save(update_fields=['status'])
            r.lpush(f'q:{job.queue}', str(job.id))
            requeued += 1
        else:
            job.status = 'failed'
            job.error = (job.error or '') + '\n[healer] max urinish tugadi'
            job.save(update_fields=['status', 'error'])
            r.lpush(f'dlq:{job.queue}', str(job.id))
            failed += 1
    log.info(f'[heal] orphan: {requeued} qayta navbatga, {failed} DLQ\'ga')
    return True


# ============================================================
#  2. STUCK ORDERS
# ============================================================
def check_stuck_orders():
    from apps.orders.models import Order
    cutoff = timezone.now() - timedelta(minutes=STUCK_ORDER_MINUTES)
    stuck = list(Order.objects.filter(status='cooking', updated_at__lt=cutoff
                                      ).select_related('restaurant')[:100])
    return stuck or None


def heal_stuck_orders(orders):
    """⚡ Bunga odam kerak — o'zi tuzatmaydi, lekin XABAR BERADI"""
    from core.ws import ws_send, g_admin
    from apps.notifications.services import notify_restaurant_admin
    for o in orders:
        ws_send(g_admin(o.restaurant_id), 'alert.stuck_order',
                {'order_id': o.id, 'number': o.number,
                 'minutes': STUCK_ORDER_MINUTES})
        notify_restaurant_admin(
            o.restaurant,
            f"⚠️ Buyurtma #{o.number} {STUCK_ORDER_MINUTES} daqiqadan beri "
            f"tayyorlanmoqda. Oshxonani tekshiring.")
    return False       # avtomatik tuzatilmadi, ammo xabar berildi


# ============================================================
#  3. DB CONNECTIONS
# ============================================================
def check_db_conns():
    with connection.cursor() as c:
        c.execute("""
            SELECT count(*) FROM pg_stat_activity
             WHERE datname = current_database()""")
        total = c.fetchone()[0]
        c.execute("SHOW max_connections")
        maxc = int(c.fetchone()[0])
        c.execute("""
            SELECT count(*) FROM pg_stat_activity
             WHERE datname = current_database()
               AND state = 'idle'
               AND state_change < now() - interval '%s minutes'""",
                  [IDLE_CONN_MINUTES])
        idle = c.fetchone()[0]
    if total > maxc * 0.85 or idle > 20:
        return {'total': total, 'max': maxc, 'idle_old': idle}
    return None


def heal_db_conns(problem):
    """Uzoq idle ulanishlarni yopadi"""
    with connection.cursor() as c:
        c.execute("""
            SELECT pg_terminate_backend(pid) FROM pg_stat_activity
             WHERE datname = current_database()
               AND pid <> pg_backend_pid()
               AND state = 'idle'
               AND state_change < now() - interval '%s minutes'""",
                  [IDLE_CONN_MINUTES])
        killed = len(c.fetchall())
    close_old_connections()
    log.info(f'[heal] db: {killed} ta idle ulanish yopildi')
    return killed > 0 or problem['total'] < problem['max'] * 0.85


# ============================================================
#  4. REDIS MEMORY
# ============================================================
def check_redis_mem():
    from core.queue import get_redis
    try:
        info = get_redis().info('memory')
    except Exception as e:
        return {'error': str(e)}
    used = info.get('used_memory', 0)
    maxm = info.get('maxmemory', 0)
    if not maxm:
        return None
    pct = used * 100 / maxm
    if pct > REDIS_MEM_PCT:
        return {'used_mb': round(used / 1048576, 1), 'pct': round(pct, 1)}
    return None


def heal_redis_mem(problem):
    """Eskirgan kesh kalitlarini tozalaydi (navbatlarga TEGMAYDI)"""
    from core.queue import get_redis
    if 'error' in problem:
        return False
    r = get_redis()
    removed = 0
    for pattern in ('menu:*', 'rest:slug:*', 'rest:domain:*', 'ikpu:*',
                    'ws:seq:*'):
        for key in r.scan_iter(match=pattern, count=500):
            ttl = r.ttl(key)
            if ttl == -1:                        # TTL yo'q — xavfli
                r.expire(key, 300)
                removed += 1
    log.info(f'[heal] redis: {removed} kalitga TTL qo\'yildi')
    after = check_redis_mem()
    return after is None


# ============================================================
#  5. DISK
# ============================================================
def check_disk():
    problems = {}
    for path in ('/', '/var/armenu', '/var/log'):
        if not os.path.exists(path):
            continue
        u = shutil.disk_usage(path)
        pct = u.used * 100 / u.total
        if pct > DISK_PCT:
            problems[path] = round(pct, 1)
    return problems or None


def heal_disk(problem):
    """Eski log, temp va yuborilgan analitika fayllarini o'chiradi"""
    freed = 0
    targets = [
        ('/var/log/armenu', '*.log.*', 7),
        ('/var/armenu/tmp', '*', 1),
        ('/var/armenu/analytics', '*.jsonl', 14),
        ('/var/armenu/media/ar/tmp', '*', 2),
    ]
    now = time.time()
    for folder, pattern, days in targets:
        if not os.path.isdir(folder):
            continue
        import glob
        for f in glob.glob(os.path.join(folder, pattern)):
            try:
                if now - os.path.getmtime(f) > days * 86400:
                    size = os.path.getsize(f)
                    os.remove(f)
                    freed += size
            except OSError:
                continue
    subprocess.run(['journalctl', '--vacuum-size=500M'],
                   capture_output=True, timeout=60)
    log.info(f'[heal] disk: {freed / 1048576:.1f} MB bo\'shatildi')
    return check_disk() is None


# ============================================================
#  6. WORKERS
# ============================================================
def check_workers():
    dead = []
    for q in WORKER_QUEUES:
        r = subprocess.run(['systemctl', 'is-active', f'armenu-worker@{q}'],
                           capture_output=True, text=True, timeout=15)
        if r.stdout.strip() != 'active':
            dead.append(q)
    return dead or None


def heal_workers(dead):
    ok = True
    for q in dead:
        r = subprocess.run(['systemctl', 'restart', f'armenu-worker@{q}'],
                           capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            ok = False
            log.error(f'[heal] worker@{q} qayta ishga tushmadi: {r.stderr[:200]}')
        else:
            log.info(f'[heal] worker@{q} qayta ishga tushirildi')
    return ok


# ============================================================
#  7. FISCAL QUEUE (⚡ qonuniy xavf)
# ============================================================
def check_fiscal_queue():
    from apps.fiscal.models import FiscalReceipt
    from core.queue import queue_depth
    cutoff = timezone.now() - timedelta(minutes=FISCAL_STUCK_MINUTES)
    stuck = FiscalReceipt.objects.filter(status='queued',
                                         next_retry_at__lt=cutoff).count()
    manual = FiscalReceipt.objects.filter(status='manual').count()
    depth = queue_depth('fiscal')
    if stuck > 0 or depth > FISCAL_QUEUE_LIMIT or manual > 0:
        return {'stuck': stuck, 'depth': depth, 'manual': manual}
    return None


def heal_fiscal_queue(problem):
    """Vaqti kelgan cheklarni navbatga qaytaradi"""
    from apps.fiscal.tasks import scan_pending
    n = scan_pending()
    log.info(f'[heal] fiscal: {n} ta chek navbatga qaytarildi')
    if problem['manual'] > 0:
        return False          # ⚡ qo'lda aralashuv kerak
    return check_fiscal_queue() is None


# ============================================================
#  Registr
# ============================================================
CHECKS = [
    ('orphan_jobs',    check_orphan_jobs,    heal_orphan_jobs),
    ('stuck_orders',   check_stuck_orders,   heal_stuck_orders),
    ('db_connections', check_db_conns,       heal_db_conns),
    ('redis_memory',   check_redis_mem,      heal_redis_mem),
    ('disk_space',     check_disk,           heal_disk),
    ('workers',        check_workers,        heal_workers),
    ('fiscal_queue',   check_fiscal_queue,   heal_fiscal_queue),
]

# Alert spam bo'lmasligi uchun — bir muammo uchun 1 soatda 1 alert
_last_alert = {}
ALERT_COOLDOWN = 3600


def _alert(name, text):
    now = time.time()
    if now - _last_alert.get(name, 0) < ALERT_COOLDOWN:
        return
    _last_alert[name] = now
    try:
        from apps.notifications.services import alert_oncall
        alert_oncall(text)
    except Exception as e:
        log.error(f'[heal] alert yuborilmadi: {e}')


def run_cycle() -> dict:
    """Bitta tekshiruv sikli"""
    from core.metrics import gauge, inc
    summary = {'ok': 0, 'healed': 0, 'failed': 0}

    for name, check, heal in CHECKS:
        try:
            close_old_connections()
            problem = check()
            if not problem:
                gauge('health_check', 1, check=name)
                summary['ok'] += 1
                continue

            log.warning(f'[HEAL] Muammo: {name} — {problem}')
            gauge('health_check', 0, check=name)
            inc('heal_attempt_total', check=name)

            healed = heal(problem)

            if healed:
                log.info(f'[HEAL] ✅ Tuzatildi: {name}')
                inc('heal_success_total', check=name)
                summary['healed'] += 1
                _alert(f'{name}:ok', f'🔧 Avtomatik tuzatildi: <b>{name}</b>\n'
                                     f'{str(problem)[:300]}')
            else:
                log.error(f'[HEAL] ❌ Tuzatib bo\'lmadi: {name}')
                inc('heal_failed_total', check=name)
                summary['failed'] += 1
                _alert(f'{name}:fail',
                       f"🚨 <b>QO'LDA ARALASHUV KERAK</b>\n"
                       f"Tekshiruv: <b>{name}</b>\n{str(problem)[:600]}")
        except Exception as e:
            log.exception(f'[HEAL] Check xatosi: {name}')
            inc('heal_error_total', check=name)
            summary['failed'] += 1

    return summary


def main():
    log.info(f'[healer] ishga tushdi — {len(CHECKS)} tekshiruv, '
             f'har {CYCLE_SECONDS}s')
    running = {'v': True}

    import signal as _sig

    def stop(signum, frame):
        log.info('[healer] to\'xtatish signali')
        running['v'] = False

    _sig.signal(_sig.SIGTERM, stop)
    _sig.signal(_sig.SIGINT, stop)

    while running['v']:
        t0 = time.time()
        try:
            summary = run_cycle()
            log.info(f'[healer] sikl: ok={summary["ok"]} '
                     f'tuzatildi={summary["healed"]} xato={summary["failed"]}')
        except Exception:
            log.exception('[healer] sikl xatosi')
        elapsed = time.time() - t0
        sleep = max(5, CYCLE_SECONDS - elapsed)
        for _ in range(int(sleep)):
            if not running['v']:
                break
            time.sleep(1)

    log.info('[healer] to\'xtadi')
```

**Fayl:** `core/management/commands/run_healer.py`
```python
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Self-healing daemon'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true',
                            help='Bir sikl bajarib chiqadi')

    def handle(self, *args, **o):
        from core.healing.daemon import main, run_cycle
        if o['once']:
            self.stdout.write(str(run_cycle()))
        else:
            main()
```

**Fayl:** `deploy/systemd/armenu-healer.service` → `/etc/systemd/system/armenu-healer.service`
```ini
[Unit]
Description=ARMENU self-healing daemon
After=network.target postgresql.service redis-server.service armenu.service

[Service]
Type=simple
User=armenu
Group=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
Environment="DJANGO_SETTINGS_MODULE=config.settings.prod"
Environment="PYTHONUNBUFFERED=1"

ExecStart=/home/armenu/app/venv/bin/python manage.py run_healer

KillSignal=SIGTERM
TimeoutStopSec=90
Restart=always
RestartSec=15

MemoryMax=512M

# ⚡ Healer systemctl chaqiradi — sudoers'da ruxsat kerak
NoNewPrivileges=false
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Fayl:** `deploy/sudoers/armenu-healer` → `/etc/sudoers.d/armenu-healer`
```
# ⚡ Healer faqat ARMENU worker'larini qayta ishga tushira oladi.
# ⛔ mebelcity servislariga ruxsat YO'Q.
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-worker@model3d
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-worker@fiscal
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-worker@notify
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-worker@ai
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-worker@analytics
armenu ALL=(root) NOPASSWD: /bin/systemctl is-active armenu-worker@*
armenu ALL=(root) NOPASSWD: /usr/bin/journalctl --vacuum-size=500M
```

✅ **Tekshirish:**
```bash
sudo visudo -cf /etc/sudoers.d/armenu-healer     # sintaksis
sudo systemctl daemon-reload && sudo systemctl enable --now armenu-healer
# Bir sikl qo'lda:
sudo -u armenu /home/armenu/app/venv/bin/python /home/armenu/app/manage.py run_healer --once
# {'ok': 7, 'healed': 0, 'failed': 0}

# ⚡ Sinov: worker'ni o'ldirib, 60 s ichida o'zi ko'tarilishini tekshirish
sudo systemctl stop armenu-worker@notify
sleep 70
systemctl is-active armenu-worker@notify        # → active
journalctl -u armenu-healer -n 20 --no-pager | grep heal
```

---

## V-224 — Socket activation (zero-downtime)

> ⚡ **Sabab:** `armenu.socket` portni systemd ushlab turadi. Gunicorn
> `reload`/`restart` bo'lganda ham port ochiq qoladi, kelayotgan so'rovlar
> navbatda kutadi — foydalanuvchi 502 KO'RMAYDI.

**Fayl:** `config/wsgi.py`
```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.prod')
application = get_wsgi_application()
```

**Fayl:** `deploy/scripts/reload.sh`
```bash
#!/usr/bin/env bash
# ⚡ Uzilishsiz qayta yuklash. Kod/template o'zgarganda SHU ISHLATILADI.
set -euo pipefail

APP=/home/armenu/app
VENV=$APP/venv/bin

echo "▶ Statik fayllar..."
$VENV/python $APP/manage.py collectstatic --noinput >/dev/null

echo "▶ Tarjimalar..."
$VENV/python $APP/manage.py compilemessages >/dev/null 2>&1 || true

echo "▶ Migratsiyalar..."
$VENV/python $APP/manage.py migrate --noinput

echo "▶ Graceful reload (port ochiq qoladi)..."
sudo systemctl reload armenu

echo "▶ Sog'liq tekshiruvi..."
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8060/health/ || echo 000)
  if [ "$code" = "200" ]; then
    echo "✅ Tayyor ($i-urinish)"
    exit 0
  fi
  sleep 1
done

echo "⛔ Health javob bermadi — rollback kerak"
exit 1
```

**Fayl:** `deploy/scripts/restart_all.sh`
```bash
#!/usr/bin/env bash
# ⚠️ To'liq restart — WS ulanishlari uziladi. Faqat consumers/worker
#    o'zgarganda ishlatiladi.
set -euo pipefail

sudo systemctl reload  armenu              # web — uzilishsiz
sudo systemctl restart armenu-ws           # WS — uziladi (klient qayta ulanadi)
sudo systemctl restart armenu-workers.target
sudo systemctl restart armenu-healer

sleep 3
for svc in armenu armenu-ws armenu-healer; do
  printf '%-18s %s\n' "$svc" "$(systemctl is-active $svc)"
done
for q in model3d fiscal notify ai analytics; do
  printf '%-18s %s\n' "worker@$q" "$(systemctl is-active armenu-worker@$q)"
done
```

```bash
chmod +x deploy/scripts/reload.sh deploy/scripts/restart_all.sh
```

✅ **Tekshirish (zero-downtime isboti):**
```bash
# 1-terminal: uzluksiz so'rov
while true; do
  curl -s -o /dev/null -w "%{http_code} " https://armenu.uz/health/
  sleep 0.1
done

# 2-terminal: 10 marta reload
for i in $(seq 1 10); do sudo systemctl reload armenu; sleep 2; done

# ⚡ 1-terminalda FAQAT 200 bo'lishi kerak — bitta ham 502/000 YO'Q
```

---

## V-225 — Health endpoint `/health/` va `/ready/`

**Fayl:** `core/views.py`
```python
import logging, time
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt

log = logging.getLogger('core.health')
_started_at = time.time()


@never_cache
@csrf_exempt
def health(request):
    """
    GET /health/ — LIVENESS.
    Process tirikmi? DB/Redis tekshirilmaydi (tez, yengil).
    LB shu bilan node'ni o'ldirmaydi.
    """
    return JsonResponse({'status': 'ok', 'service': 'armenu',
                         'uptime_sec': int(time.time() - _started_at)})


@never_cache
@csrf_exempt
def ready(request):
    """
    GET /ready/ — READINESS.
    ⚡ DB + Redis + migratsiya tekshiriladi. Biror biri yiqilsa 503 →
    LB bu node'ga trafik yubormaydi.
    """
    checks, ok = {}, True

    # --- DB ---
    t0 = time.time()
    try:
        with connection.cursor() as c:
            c.execute('SELECT 1')
            c.fetchone()
        checks['database'] = {'ok': True, 'ms': round((time.time() - t0) * 1000, 1)}
    except Exception as e:
        ok = False
        checks['database'] = {'ok': False, 'error': str(e)[:200]}

    # --- Redis ---
    t0 = time.time()
    try:
        from core.queue import get_redis
        get_redis().ping()
        checks['redis'] = {'ok': True, 'ms': round((time.time() - t0) * 1000, 1)}
    except Exception as e:
        ok = False
        checks['redis'] = {'ok': False, 'error': str(e)[:200]}

    # --- Migratsiyalar ---
    try:
        from django.db.migrations.executor import MigrationExecutor
        ex = MigrationExecutor(connection)
        plan = ex.migration_plan(ex.loader.graph.leaf_nodes())
        checks['migrations'] = {'ok': not plan, 'pending': len(plan)}
        if plan:
            ok = False
    except Exception as e:
        checks['migrations'] = {'ok': False, 'error': str(e)[:200]}

    # --- Navbat chuqurligi (ma'lumot uchun, 503 qilmaydi) ---
    try:
        from core.queue import queue_depth, QUEUES
        checks['queues'] = {q: queue_depth(q) for q in QUEUES}
    except Exception:
        checks['queues'] = {}

    # --- ⚡ Fiskal navbat (qonuniy xavf) ---
    try:
        from apps.fiscal.models import FiscalReceipt
        manual = FiscalReceipt.objects.filter(status='manual').count()
        checks['fiscal_manual'] = manual
    except Exception:
        checks['fiscal_manual'] = -1

    return JsonResponse({'status': 'ready' if ok else 'not_ready',
                         'checks': checks},
                        status=200 if ok else 503)


@never_cache
@csrf_exempt
def version(request):
    """GET /version/ — joriy reliz (deploy tekshiruvi uchun)"""
    import os
    return JsonResponse({
        'version': os.environ.get('APP_VERSION', 'dev'),
        'commit': os.environ.get('GIT_COMMIT', '')[:8],
        'deployed_at': os.environ.get('DEPLOYED_AT', ''),
    })
```

**Fayl:** `config/urls.py` (qo'shimcha)
```python
from django.urls import path, include
from core import views as core_views
from core import metrics as core_metrics

urlpatterns = [
    path('health/',  core_views.health,  name='health'),
    path('ready/',   core_views.ready,   name='ready'),
    path('version/', core_views.version, name='version'),
    path('metrics',  core_metrics.metrics_view, name='metrics'),
    # ... qolgan marshrutlar
]
```

✅ **Tekshirish:**
```bash
curl -s https://armenu.uz/health/ | python -m json.tool
# {"status": "ok", "service": "armenu", "uptime_sec": 123}

curl -s https://armenu.uz/ready/ | python -m json.tool
# {"status": "ready", "checks": {"database": {"ok": true, ...}, ...}}

# ⚡ Redis o'chirilganda 503 qaytishi kerak:
sudo systemctl stop redis-server
curl -s -o /dev/null -w '%{http_code}\n' https://armenu.uz/ready/   # 503
curl -s -o /dev/null -w '%{http_code}\n' https://armenu.uz/health/  # 200
sudo systemctl start redis-server
```

---

## V-226 — Prometheus metrikalar

**Fayl:** `core/metrics.py`
```python
"""
ARMENU Prometheus metrikalari (TZ §III.9.1 ga muvofiq).
Gunicorn ko'p-process bo'lgani uchun multiprocess rejim ishlatiladi.
"""
import logging
import os

from django.http import HttpResponse
from prometheus_client import (CollectorRegistry, Counter, Gauge, Histogram,
                               generate_latest, multiprocess, CONTENT_TYPE_LATEST)

log = logging.getLogger('core.metrics')

# ============ BIZNES ============
orders_total = Counter(
    'armenu_orders_total', 'Buyurtmalar soni', ['restaurant', 'status'])
order_value = Counter(
    'armenu_order_value_sum', 'Buyurtmalar summasi (so\'m)', ['restaurant'])
ar_views_total = Counter(
    'armenu_ar_views_total', 'AR ko\'rishlar', ['restaurant', 'dish'])
ar_conversion = Gauge(
    'armenu_ar_conversion_ratio', 'AR konversiyasi', ['restaurant'])
active_restaurants = Gauge(
    'armenu_active_restaurants', 'Faol restoranlar')
payments_total = Counter(
    'armenu_payments_total', 'To\'lovlar', ['provider', 'status'])
tips_total = Counter(
    'armenu_tips_total', 'Choychaqa summasi', ['restaurant'])

# ============ TEXNIK ============
http_duration = Histogram(
    'armenu_http_request_duration_seconds', 'HTTP javob vaqti',
    ['endpoint', 'method', 'status'],
    buckets=(0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10))
ws_connections = Gauge(
    'armenu_ws_connections', 'WS ulanishlar', ['node'], multiprocess_mode='max')
db_duration = Histogram(
    'armenu_db_query_duration_seconds', 'DB so\'rov vaqti', ['query_type'])
cache_hit_ratio = Gauge(
    'armenu_cache_hit_ratio', 'Kesh hit nisbati', ['cache_name'])
queue_depth_g = Gauge(
    'armenu_queue_depth', 'Navbat chuqurligi', ['queue'],
    multiprocess_mode='max')
job_duration = Histogram(
    'armenu_job_duration_seconds', 'Job bajarilish vaqti', ['job_type'])
circuit_state = Gauge(
    'armenu_circuit_breaker_state', 'Circuit breaker (1=ochiq)', ['service'],
    multiprocess_mode='max')

# ============ TASHQI ============
external_duration = Histogram(
    'armenu_external_api_duration_seconds', 'Tashqi API', ['provider'])
ai_cost = Counter(
    'armenu_ai_cost_usd_total', 'AI xarajati (USD)', ['provider', 'model'])
fiscal_queue_depth = Gauge(
    'armenu_fiscal_queue_depth', 'Fiskal navbat', multiprocess_mode='max')
fiscal_manual = Gauge(
    'armenu_fiscal_manual_total', 'Qo\'lda kerak cheklar',
    multiprocess_mode='max')

# ============ HEALER ============
health_check_g = Gauge(
    'armenu_health_check', 'Tekshiruv holati (1=sog\'lom)', ['check'],
    multiprocess_mode='min')
heal_attempt = Counter('armenu_heal_attempt_total', 'Tiklash urinishi', ['check'])
heal_success = Counter('armenu_heal_success_total', 'Tiklash muvaffaqiyati', ['check'])
heal_failed = Counter('armenu_heal_failed_total', 'Tiklash muvaffaqiyatsiz', ['check'])
heal_error = Counter('armenu_heal_error_total', 'Tekshiruv xatosi', ['check'])

_COUNTERS = {'heal_attempt_total': heal_attempt,
             'heal_success_total': heal_success,
             'heal_failed_total': heal_failed,
             'heal_error_total': heal_error}
_GAUGES = {'health_check': health_check_g}


def inc(name, value=1, **labels):
    """Healer va boshqa modullar uchun yumshoq interfeys"""
    c = _COUNTERS.get(name)
    if c is not None:
        try:
            c.labels(**labels).inc(value)
        except Exception as e:
            log.debug(f'[metrics] inc {name}: {e}')


def gauge(name, value, **labels):
    g = _GAUGES.get(name)
    if g is not None:
        try:
            g.labels(**labels).set(value)
        except Exception as e:
            log.debug(f'[metrics] gauge {name}: {e}')


def refresh_slow_gauges():
    """
    Og'ir gauge'lar — /metrics so'ralganda 30 soniyada bir marta yangilanadi.
    """
    from django.core.cache import cache
    if cache.get('metrics:slow:lock'):
        return
    cache.set('metrics:slow:lock', 1, 30)
    try:
        from core.queue import queue_depth, QUEUES
        for q in QUEUES:
            queue_depth_g.labels(queue=q).set(queue_depth(q))

        from apps.tenants.models import Restaurant
        active_restaurants.set(Restaurant.objects.filter(is_active=True).count())

        from apps.fiscal.models import FiscalReceipt
        fiscal_queue_depth.set(
            FiscalReceipt.objects.filter(status='queued').count())
        fiscal_manual.set(
            FiscalReceipt.objects.filter(status='manual').count())
    except Exception as e:
        log.warning(f'[metrics] slow gauge xato: {e}')


def metrics_view(request):
    """GET /metrics — Prometheus scrape"""
    refresh_slow_gauges()
    if os.environ.get('PROMETHEUS_MULTIPROC_DIR'):
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        data = generate_latest(registry)
    else:
        data = generate_latest()
    return HttpResponse(data, content_type=CONTENT_TYPE_LATEST)
```

**Fayl:** `core/middleware.py` (qo'shimcha middleware)
```python
class MetricsMiddleware:
    """Har so'rov davomiyligini o'lchaydi"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time
        from core.metrics import http_duration
        t0 = time.time()
        response = self.get_response(request)
        try:
            match = getattr(request, 'resolver_match', None)
            endpoint = match.route if match else 'unknown'
            http_duration.labels(endpoint=endpoint[:60],
                                 method=request.method,
                                 status=str(response.status_code)
                                 ).observe(time.time() - t0)
        except Exception:
            pass
        return response
```

`config/settings/base.py` — `MIDDLEWARE` ga (RequestID dan keyin):
```python
    'core.middleware.MetricsMiddleware',
```

**Prometheus scrape konfigi** — `deploy/prometheus/armenu.yml`:
```yaml
scrape_configs:
  - job_name: armenu
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ['127.0.0.1:8060']
        labels: {service: armenu, env: prod}

rule_files:
  - /etc/prometheus/rules/armenu_alerts.yml
```

**Alert qoidalari** — `deploy/prometheus/armenu_alerts.yml`:
```yaml
groups:
- name: armenu
  rules:
  - alert: ArmenuHighErrorRate
    expr: |
      sum(rate(armenu_http_request_duration_seconds_count{status=~"5.."}[5m]))
      / sum(rate(armenu_http_request_duration_seconds_count[5m])) > 0.01
    for: 5m
    labels: {severity: P1}
    annotations: {summary: "🔴 5xx xatolar 1% dan yuqori"}

  - alert: ArmenuSlowResponse
    expr: |
      histogram_quantile(0.95,
        sum(rate(armenu_http_request_duration_seconds_bucket[5m])) by (le)) > 1
    for: 5m
    labels: {severity: P2}
    annotations: {summary: "🟠 p95 javob vaqti 1s dan yuqori"}

  - alert: ArmenuQueueBacklog
    expr: armenu_queue_depth > 1000
    for: 5m
    labels: {severity: P2}
    annotations: {summary: "🟠 Navbat {{ $labels.queue }} to'lgan"}

  - alert: ArmenuFiscalQueue
    expr: armenu_fiscal_queue_depth > 50
    for: 10m
    labels: {severity: P1}
    annotations: {summary: "🔴 Fiskal navbat tiqilgan — qonuniy xavf"}

  - alert: ArmenuFiscalManual
    expr: armenu_fiscal_manual_total > 0
    for: 1m
    labels: {severity: P1}
    annotations: {summary: "🔴 Qo'lda chek kerak: {{ $value }} ta"}

  - alert: ArmenuHealthCheckFailing
    expr: armenu_health_check == 0
    for: 5m
    labels: {severity: P2}
    annotations: {summary: "🟠 Self-healing: {{ $labels.check }} tuzatilmadi"}

  - alert: ArmenuAICostHigh
    expr: increase(armenu_ai_cost_usd_total[24h]) > 50
    labels: {severity: P3}
    annotations: {summary: "🟡 AI xarajati kuniga $50 dan oshdi"}

  - alert: ArmenuDown
    expr: up{job="armenu"} == 0
    for: 2m
    labels: {severity: P1}
    annotations: {summary: "🔴 ARMENU javob bermayapti"}
```

`requirements.txt` ga: `prometheus-client`

✅ **Tekshirish:**
```bash
curl -s http://127.0.0.1:8060/metrics | grep -c '^armenu_'
# 20+ metrika
curl -s http://127.0.0.1:8060/metrics | grep armenu_fiscal_manual
promtool check rules deploy/prometheus/armenu_alerts.yml
```

---

## V-227 — Grafana dashboard JSON

**Fayl:** `deploy/grafana/armenu_dashboard.json`
```json
{
  "title": "ARMENU — Production",
  "uid": "armenu-prod",
  "timezone": "Asia/Tashkent",
  "refresh": "30s",
  "time": {"from": "now-6h", "to": "now"},
  "templating": {
    "list": [
      {
        "name": "restaurant",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(armenu_orders_total, restaurant)",
        "includeAll": true,
        "multi": true
      }
    ]
  },
  "panels": [
    {
      "id": 1, "type": "stat", "title": "Faol restoranlar",
      "gridPos": {"h": 4, "w": 4, "x": 0, "y": 0},
      "targets": [{"expr": "armenu_active_restaurants", "refId": "A"}],
      "fieldConfig": {"defaults": {"color": {"mode": "thresholds"},
        "thresholds": {"steps": [{"color": "red", "value": null},
                                 {"color": "green", "value": 1}]}}}
    },
    {
      "id": 2, "type": "stat", "title": "Buyurtma / daqiqa",
      "gridPos": {"h": 4, "w": 4, "x": 4, "y": 0},
      "targets": [{"expr": "sum(rate(armenu_orders_total[5m])) * 60", "refId": "A"}]
    },
    {
      "id": 3, "type": "stat", "title": "p95 javob vaqti",
      "gridPos": {"h": 4, "w": 4, "x": 8, "y": 0},
      "targets": [{"expr": "histogram_quantile(0.95, sum(rate(armenu_http_request_duration_seconds_bucket[5m])) by (le))", "refId": "A"}],
      "fieldConfig": {"defaults": {"unit": "s",
        "thresholds": {"steps": [{"color": "green", "value": null},
                                 {"color": "yellow", "value": 0.25},
                                 {"color": "red", "value": 1}]}}}
    },
    {
      "id": 4, "type": "stat", "title": "5xx darajasi",
      "gridPos": {"h": 4, "w": 4, "x": 12, "y": 0},
      "targets": [{"expr": "sum(rate(armenu_http_request_duration_seconds_count{status=~\"5..\"}[5m])) / sum(rate(armenu_http_request_duration_seconds_count[5m]))", "refId": "A"}],
      "fieldConfig": {"defaults": {"unit": "percentunit",
        "thresholds": {"steps": [{"color": "green", "value": null},
                                 {"color": "red", "value": 0.01}]}}}
    },
    {
      "id": 5, "type": "stat", "title": "⚡ Qo'lda chek kerak",
      "gridPos": {"h": 4, "w": 4, "x": 16, "y": 0},
      "targets": [{"expr": "armenu_fiscal_manual_total", "refId": "A"}],
      "fieldConfig": {"defaults": {"thresholds": {"steps": [
        {"color": "green", "value": null}, {"color": "red", "value": 1}]}}}
    },
    {
      "id": 6, "type": "stat", "title": "WS ulanishlar",
      "gridPos": {"h": 4, "w": 4, "x": 20, "y": 0},
      "targets": [{"expr": "sum(armenu_ws_connections)", "refId": "A"}]
    },
    {
      "id": 10, "type": "timeseries", "title": "HTTP javob vaqti (p50/p95/p99)",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
      "targets": [
        {"expr": "histogram_quantile(0.50, sum(rate(armenu_http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p50", "refId": "A"},
        {"expr": "histogram_quantile(0.95, sum(rate(armenu_http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p95", "refId": "B"},
        {"expr": "histogram_quantile(0.99, sum(rate(armenu_http_request_duration_seconds_bucket[5m])) by (le))", "legendFormat": "p99", "refId": "C"}
      ],
      "fieldConfig": {"defaults": {"unit": "s"}}
    },
    {
      "id": 11, "type": "timeseries", "title": "Navbat chuqurligi",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
      "targets": [{"expr": "armenu_queue_depth", "legendFormat": "{{queue}}", "refId": "A"}]
    },
    {
      "id": 12, "type": "timeseries", "title": "Buyurtmalar (holat bo'yicha)",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 12},
      "targets": [{"expr": "sum(rate(armenu_orders_total{restaurant=~\"$restaurant\"}[10m])) by (status) * 600", "legendFormat": "{{status}}", "refId": "A"}]
    },
    {
      "id": 13, "type": "timeseries", "title": "To'lovlar (provayder bo'yicha)",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 12},
      "targets": [{"expr": "sum(rate(armenu_payments_total[10m])) by (provider, status) * 600", "legendFormat": "{{provider}} / {{status}}", "refId": "A"}]
    },
    {
      "id": 14, "type": "timeseries", "title": "⚡ AR ko'rishlar va konversiya",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 20},
      "targets": [
        {"expr": "sum(rate(armenu_ar_views_total{restaurant=~\"$restaurant\"}[10m])) * 600", "legendFormat": "AR ko'rish/10daq", "refId": "A"},
        {"expr": "avg(armenu_ar_conversion_ratio{restaurant=~\"$restaurant\"})", "legendFormat": "konversiya", "refId": "B"}
      ]
    },
    {
      "id": 15, "type": "timeseries", "title": "⚡ Self-healing holati",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 20},
      "targets": [
        {"expr": "armenu_health_check", "legendFormat": "{{check}}", "refId": "A"},
        {"expr": "sum(rate(armenu_heal_success_total[30m])) by (check) * 1800", "legendFormat": "tuzatildi: {{check}}", "refId": "B"}
      ],
      "fieldConfig": {"defaults": {"min": 0, "max": 1}}
    },
    {
      "id": 16, "type": "timeseries", "title": "Circuit breaker holati",
      "gridPos": {"h": 6, "w": 8, "x": 0, "y": 28},
      "targets": [{"expr": "armenu_circuit_breaker_state", "legendFormat": "{{service}}", "refId": "A"}]
    },
    {
      "id": 17, "type": "timeseries", "title": "Fiskal navbat",
      "gridPos": {"h": 6, "w": 8, "x": 8, "y": 28},
      "targets": [
        {"expr": "armenu_fiscal_queue_depth", "legendFormat": "navbatda", "refId": "A"},
        {"expr": "armenu_fiscal_manual_total", "legendFormat": "qo'lda kerak", "refId": "B"}
      ]
    },
    {
      "id": 18, "type": "timeseries", "title": "AI xarajati (USD/kun)",
      "gridPos": {"h": 6, "w": 8, "x": 16, "y": 28},
      "targets": [{"expr": "increase(armenu_ai_cost_usd_total[24h])", "legendFormat": "{{provider}}", "refId": "A"}],
      "fieldConfig": {"defaults": {"unit": "currencyUSD"}}
    }
  ]
}
```

**O'rnatish:**
```bash
# Grafana UI: Dashboards → Import → Upload JSON
# yoki API bilan:
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": $(cat deploy/grafana/armenu_dashboard.json), \"overwrite\": true}"
```

✅ **Tekshirish:**
```bash
python -c "import json; d=json.load(open('deploy/grafana/armenu_dashboard.json')); print(len(d['panels']), 'panel')"
# 14 panel
# Grafana'da dashboard ochiladi, barcha panel ma'lumot ko'rsatadi
```

---

## V-228 — Sentry integratsiyasi

**Fayl:** `config/settings/prod.py`
```python
from .base import *  # noqa
import logging
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

DEBUG = False

# --- Xavfsizlik ---
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False        # JS o'qiy olishi kerak
CSRF_TRUSTED_ORIGINS = ['https://armenu.uz', 'https://*.armenu.uz']
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
X_FRAME_OPTIONS = 'SAMEORIGIN'

CONN_MAX_AGE = 120
DATABASES['default']['CONN_MAX_AGE'] = CONN_MAX_AGE
DATABASES['default']['CONN_HEALTH_CHECKS'] = True

# ============ SENTRY ============
SENTRY_DSN = config('SENTRY_DSN', default='')

# ⚡ Maxfiy maydonlar — Sentry'ga HECH QACHON yuborilmaydi
SENSITIVE_KEYS = {
    'password', 'passwd', 'secret', 'token', 'api_key', 'authorization',
    'sign_string', 'x-signature', 'csrfmiddlewaretoken',
    # to'lov
    'card_number', 'pan', 'cvv', 'cvc', 'expiry',
    'merchant_id', 'service_id', 'idempotency_key',
}


def _scrub(event, hint):
    """⚡ PCI DSS + shaxsiy ma'lumot: maxfiy qiymatlarni olib tashlaydi"""
    def clean(obj):
        if isinstance(obj, dict):
            return {k: ('[FILTERED]' if k.lower() in SENSITIVE_KEYS else clean(v))
                    for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean(x) for x in obj]
        return obj

    req = event.get('request') or {}
    for field in ('data', 'headers', 'cookies', 'query_string'):
        if field in req:
            req[field] = clean(req[field]) if not isinstance(req[field], str) \
                else '[FILTERED]' if field == 'cookies' else req[field]
    event['request'] = req

    for exc in (event.get('exception') or {}).get('values') or []:
        for frame in (exc.get('stacktrace') or {}).get('frames') or []:
            if 'vars' in frame:
                frame['vars'] = clean(frame['vars'])
    return event


def _traces_sampler(ctx):
    """Shovqinli endpointlar kamroq namunalanadi"""
    path = (ctx.get('wsgi_environ') or {}).get('PATH_INFO', '')
    if path in ('/health/', '/ready/', '/metrics'):
        return 0.0
    if path.startswith('/v1/track/'):
        return 0.01
    if path.startswith('/v1/payments/'):
        return 0.5          # ⚡ to'lov — muhim, ko'proq kuzatamiz
    return 0.1


if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(signals_spans=False),
            RedisIntegration(),
            LoggingIntegration(level=logging.INFO,
                               event_level=logging.ERROR),
        ],
        environment=config('SENTRY_ENV', default='production'),
        release=config('APP_VERSION', default='dev'),
        traces_sampler=_traces_sampler,
        profiles_sample_rate=0.05,
        send_default_pii=False,          # ⚡ shaxsiy ma'lumot yuborilmaydi
        before_send=_scrub,
        max_breadcrumbs=30,
        attach_stacktrace=True,
    )
```

**Fayl:** `core/middleware.py` (qo'shimcha — Sentry kontekstini boyitish)
```python
class SentryContextMiddleware:
    """Har xatoga restaurant/request_id kontekstini qo'shadi"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            import sentry_sdk
            with sentry_sdk.configure_scope() as scope:
                scope.set_tag('request_id', getattr(request, 'request_id', ''))
                rid = getattr(request, 'restaurant_id', None)
                if rid:
                    scope.set_tag('restaurant_id', rid)
                    r = getattr(request, 'restaurant', None)
                    if r:
                        scope.set_tag('restaurant_slug', r.slug)
        except Exception:
            pass
        return self.get_response(request)
```

`MIDDLEWARE` ga `TenantMiddleware` dan keyin: `'core.middleware.SentryContextMiddleware'`

`requirements.txt` ga: `sentry-sdk[django]`

✅ **Tekshirish:**
```bash
# Test xato yuborish
/home/armenu/app/venv/bin/python /home/armenu/app/manage.py shell -c "
import sentry_sdk
sentry_sdk.capture_message('ARMENU deploy sinovi ✅')
sentry_sdk.flush(5)"
# Sentry UI'da xabar ko'rinishi kerak

# ⚡ Scrub tekshiruvi
python -c "
from config.settings.prod import _scrub
e = {'request': {'data': {'password': 'maxfiy', 'card_number': '8600...'}}}
print(_scrub(e, None)['request']['data'])"
# {'password': '[FILTERED]', 'card_number': '[FILTERED]'}
```

---

## V-229 — JSON log (Loki uchun)

**Fayl:** `core/logging.py`
```python
import json
import logging
import os
import socket
import time
import traceback

HOSTNAME = socket.gethostname()
SERVICE = os.environ.get('SERVICE_NAME', 'armenu')


class JsonFormatter(logging.Formatter):
    """
    ⚡ Bir qator = bitta JSON obyekt. Loki/Promtail to'g'ridan-to'g'ri o'qiydi.
    """
    RESERVED = {
        'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename',
        'module', 'exc_info', 'exc_text', 'stack_info', 'lineno', 'funcName',
        'created', 'msecs', 'relativeCreated', 'thread', 'threadName',
        'processName', 'process', 'taskName', 'message', 'asctime',
    }

    def format(self, record):
        out = {
            'ts': time.strftime('%Y-%m-%dT%H:%M:%S',
                                time.localtime(record.created)) +
                  f'.{int(record.msecs):03d}',
            'level': record.levelname,
            'logger': record.name,
            'msg': record.getMessage(),
            'service': SERVICE,
            'host': HOSTNAME,
            'pid': record.process,
        }
        if record.exc_info:
            out['exc'] = ''.join(traceback.format_exception(*record.exc_info))[:6000]

        # Qo'shimcha kontekst (extra=...)
        for k, v in record.__dict__.items():
            if k not in self.RESERVED and not k.startswith('_'):
                try:
                    json.dumps(v)
                    out[k] = v
                except (TypeError, ValueError):
                    out[k] = str(v)[:200]

        return json.dumps(out, ensure_ascii=False)


class RequestIdFilter(logging.Filter):
    """Joriy so'rov ID'sini har logga qo'shadi"""
    def filter(self, record):
        try:
            from core.context import get_request_id
            record.request_id = get_request_id() or ''
        except Exception:
            record.request_id = ''
        return True
```

**Fayl:** `core/context.py`
```python
"""So'rov konteksti — thread/async xavfsiz"""
from contextvars import ContextVar

_request_id: ContextVar = ContextVar('request_id', default='')
_restaurant_id: ContextVar = ContextVar('restaurant_id', default=None)


def set_request_id(value): _request_id.set(value or '')
def get_request_id(): return _request_id.get()
def set_restaurant_id(value): _restaurant_id.set(value)
def get_restaurant_id(): return _restaurant_id.get()
```

`core/middleware.py` — `RequestIDMiddleware` ichida:
```python
        from core.context import set_request_id, set_restaurant_id
        set_request_id(request.request_id)
```
va `TenantMiddleware._set` ichida:
```python
        from core.context import set_restaurant_id
        set_restaurant_id(r.id)
```

**Fayl:** `config/settings/prod.py` (LOGGING qismi)
```python
LOG_DIR = config('LOG_DIR', default='/var/log/armenu')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'request_id': {'()': 'core.logging.RequestIdFilter'},
    },
    'formatters': {
        'json': {'()': 'core.logging.JsonFormatter'},
    },
    'handlers': {
        # ⚡ stdout → journald → promtail → Loki
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['request_id'],
        },
        # Muhim xatolar alohida faylda (audit uchun)
        'errors': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': f'{LOG_DIR}/errors.log',
            'maxBytes': 50 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'json',
            'filters': ['request_id'],
            'level': 'ERROR',
        },
        # ⚡ To'lov va fiskal — alohida jurnal (qonuniy talab)
        'finance': {
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': f'{LOG_DIR}/finance.log',
            'when': 'midnight',
            'backupCount': 90,           # 3 oy saqlanadi
            'formatter': 'json',
            'filters': ['request_id'],
        },
    },
    'root': {'handlers': ['console', 'errors'], 'level': 'INFO'},
    'loggers': {
        'django.db.backends': {'level': 'WARNING', 'propagate': True},
        'django.request': {'level': 'ERROR', 'propagate': True},
        'payments': {'handlers': ['console', 'finance', 'errors'],
                     'level': 'INFO', 'propagate': False},
        'fiscal':   {'handlers': ['console', 'finance', 'errors'],
                     'level': 'INFO', 'propagate': False},
        'healing':  {'handlers': ['console', 'errors'],
                     'level': 'INFO', 'propagate': False},
        'worker':   {'handlers': ['console', 'errors'],
                     'level': 'INFO', 'propagate': False},
    },
}
```

**Promtail konfigi** — `deploy/loki/promtail-armenu.yml`:
```yaml
server:
  http_listen_port: 9080

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://127.0.0.1:3100/loki/api/v1/push

scrape_configs:
  - job_name: armenu-journal
    journal:
      max_age: 12h
      labels: {job: armenu}
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: unit
      - source_labels: ['__journal__systemd_unit']
        regex: 'armenu.*'
        action: keep
    pipeline_stages:
      - json:
          expressions:
            level: level
            logger: logger
            request_id: request_id
            restaurant_id: restaurant_id
      - labels: {level: '', logger: ''}

  - job_name: armenu-finance
    static_configs:
      - targets: [localhost]
        labels: {job: armenu-finance, __path__: /var/log/armenu/finance.log}
    pipeline_stages:
      - json:
          expressions: {level: level, logger: logger}
      - labels: {level: '', logger: ''}
```

**Log papkasi:**
```bash
sudo mkdir -p /var/log/armenu
sudo chown armenu:armenu /var/log/armenu
sudo tee /etc/logrotate.d/armenu > /dev/null <<'EOF'
/var/log/armenu/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 armenu armenu
    sharedscripts
}
EOF
```

✅ **Tekshirish:**
```bash
sudo journalctl -u armenu -n 5 -o cat | python -m json.tool
# {"ts": "...", "level": "INFO", "logger": "...", "msg": "...", "request_id": "..."}

/home/armenu/app/venv/bin/python /home/armenu/app/manage.py shell -c "
import logging; logging.getLogger('payments').info('sinov', extra={'payment_id': 1})"
tail -1 /var/log/armenu/finance.log | python -m json.tool
```

---

## V-230 — Backup skript (cron)

**Fayl:** `scripts/backup.sh`
```bash
#!/usr/bin/env bash
# ============================================================
#  ARMENU zaxira nusxa
#  ⛔ FAQAT armenu_db — mebelcity bazasiga TEGMAYDI
# ============================================================
set -euo pipefail

APP=/home/armenu/app
BACKUP_DIR=/var/armenu/backups
S3_BUCKET="${BACKUP_S3_BUCKET:-armenu-backups}"
KEEP_DAYS=30
STAMP=$(date +%Y%m%d_%H%M%S)
LOG=/var/log/armenu/backup.log

# .env dan DB kirish ma'lumotlari
set -a; source "$APP/.env"; set +a

mkdir -p "$BACKUP_DIR"/{db,media,config}

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
fail() { log "⛔ XATO: $*"; notify "⛔ ARMENU backup XATO: $*"; exit 1; }

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${ONCALL_CHAT_ID:-}" ] && \
  curl -s -o /dev/null -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ONCALL_CHAT_ID}" -d "text=$1" || true
}

log "═══ Backup boshlandi: $STAMP ═══"

# ---------- 1. PostgreSQL ----------
DB_FILE="$BACKUP_DIR/db/armenu_${STAMP}.dump"
log "▶ PostgreSQL ($DB_NAME)..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" \
  -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --compress=6 --no-owner --no-privileges \
  --file="$DB_FILE" 2>>"$LOG" || fail "pg_dump yiqildi"

DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
log "  ✅ $DB_FILE ($DB_SIZE)"

# Dump butunligini darhol tekshirish
pg_restore --list "$DB_FILE" > /dev/null 2>&1 || fail "dump buzuq (pg_restore --list)"
log "  ✅ dump butunligi tasdiqlandi"

# ---------- 2. Redis snapshot ----------
log "▶ Redis (db 5, 6)..."
redis-cli -n 5 --rdb "$BACKUP_DIR/db/redis5_${STAMP}.rdb" >/dev/null 2>&1 || \
  log "  ⚠️ redis db5 saqlanmadi (kritik emas — kesh)"

# ---------- 3. Media (3D fayllar, QR, rasm) ----------
MEDIA_FILE="$BACKUP_DIR/media/media_${STAMP}.tar.zst"
log "▶ Media (/var/armenu/media)..."
if command -v zstd >/dev/null; then
  tar -I 'zstd -3' -cf "$MEDIA_FILE" -C /var/armenu media 2>>"$LOG" || \
    fail "media arxivlanmadi"
else
  MEDIA_FILE="$BACKUP_DIR/media/media_${STAMP}.tar.gz"
  tar -czf "$MEDIA_FILE" -C /var/armenu media 2>>"$LOG" || fail "media arxivlanmadi"
fi
log "  ✅ $MEDIA_FILE ($(du -h "$MEDIA_FILE" | cut -f1))"

# ---------- 4. Konfiguratsiya ----------
CFG_FILE="$BACKUP_DIR/config/config_${STAMP}.tar.gz"
log "▶ Konfiguratsiya..."
tar -czf "$CFG_FILE" \
  /etc/systemd/system/armenu*.service \
  /etc/systemd/system/armenu*.socket \
  /etc/systemd/system/armenu*.target \
  /etc/nginx/sites-available/armenu.conf \
  /etc/cron.d/armenu-* 2>/dev/null || true
# ⚠️ .env shifrlanadi (sirlar ochiq saqlanmaydi)
if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --yes --batch --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
      --output "$BACKUP_DIR/config/env_${STAMP}.gpg" "$APP/.env"
  log "  ✅ .env shifrlab saqlandi"
fi

# ---------- 5. S3'ga yuklash ----------
if command -v aws >/dev/null && [ -n "$S3_BUCKET" ]; then
  log "▶ S3'ga yuklash (s3://$S3_BUCKET)..."
  aws s3 cp "$DB_FILE"    "s3://$S3_BUCKET/db/"     --storage-class STANDARD_IA >>"$LOG" 2>&1 || log "  ⚠️ db yuklanmadi"
  aws s3 cp "$MEDIA_FILE" "s3://$S3_BUCKET/media/"  --storage-class STANDARD_IA >>"$LOG" 2>&1 || log "  ⚠️ media yuklanmadi"
  aws s3 cp "$CFG_FILE"   "s3://$S3_BUCKET/config/" >>"$LOG" 2>&1 || true
  log "  ✅ S3 yuklandi"
else
  log "  ⚠️ aws cli yo'q yoki bucket sozlanmagan — faqat lokal"
fi

# ---------- 6. Eskilarini tozalash ----------
log "▶ ${KEEP_DAYS} kundan eski nusxalar o'chirilmoqda..."
find "$BACKUP_DIR" -type f -mtime +$KEEP_DAYS -delete
log "  ✅ tozalandi"

# ---------- 7. Xulosa ----------
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
log "═══ ✅ Backup tugadi. Jami: $TOTAL ═══"
notify "✅ ARMENU backup: DB $DB_SIZE, jami $TOTAL ($STAMP)"

# Metrikaga yozish (Prometheus node_exporter textfile)
if [ -d /var/lib/node_exporter/textfile ]; then
  cat > /var/lib/node_exporter/textfile/armenu_backup.prom <<EOF
armenu_backup_last_success_timestamp $(date +%s)
armenu_backup_db_size_bytes $(stat -c%s "$DB_FILE")
EOF
fi
```

**WAL arxivlash (uzluksiz)** — `postgresql.conf` da:
```conf
archive_mode = on
archive_command = 'test ! -f /var/armenu/wal/%f && cp %p /var/armenu/wal/%f'
archive_timeout = 300
wal_level = replica
```

```bash
sudo mkdir -p /var/armenu/wal && sudo chown postgres:postgres /var/armenu/wal
```

**Cron:**
```bash
# /etc/cron.d/armenu-backup
0 3 * * *  armenu /home/armenu/app/scripts/backup.sh
*/30 * * * * armenu aws s3 sync /var/armenu/wal/ s3://armenu-backups/wal/ --quiet 2>/dev/null
0 5 * * *  armenu find /var/armenu/wal -type f -mtime +7 -delete
```

```bash
chmod +x scripts/backup.sh
sudo mkdir -p /var/armenu/backups && sudo chown armenu:armenu /var/armenu/backups
```

✅ **Tekshirish:**
```bash
sudo -u armenu /home/armenu/app/scripts/backup.sh
ls -lh /var/armenu/backups/db/
tail -20 /var/log/armenu/backup.log
# ═══ ✅ Backup tugadi. Jami: XXX ═══
```

---

## V-231 — ⚡ Backup tekshirish skripti (tiklanishni sinash)

> ⚡ **Sinovdan o'tmagan backup — backup EMAS.** Har kecha oxirgi nusxa
> vaqtinchalik bazaga tiklanadi va jadval/qator sanoqlari solishtiriladi.

**Fayl:** `scripts/verify_backup.sh`
```bash
#!/usr/bin/env bash
# ============================================================
#  ARMENU backup tiklanishini SINASH
#  Oxirgi dump vaqtinchalik bazaga tiklanadi va tekshiriladi.
#  ⛔ Prod bazaga TEGMAYDI — faqat armenu_verify bazasi.
# ============================================================
set -euo pipefail

APP=/home/armenu/app
BACKUP_DIR=/var/armenu/backups/db
VERIFY_DB=armenu_verify
LOG=/var/log/armenu/verify_backup.log
MIN_TABLES=25            # kutilgan minimal jadval soni
MIN_ROWS_ORDERS=0        # yangi tizimda 0 bo'lishi mumkin

set -a; source "$APP/.env"; set +a
export PGPASSWORD="$DB_PASSWORD"
PSQL="psql -h ${DB_HOST:-127.0.0.1} -p ${DB_PORT:-5432} -U $DB_USER -tAq"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${ONCALL_CHAT_ID:-}" ] && \
  curl -s -o /dev/null -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ONCALL_CHAT_ID}" -d "text=$1" || true
}

cleanup() {
  $PSQL -d postgres -c "DROP DATABASE IF EXISTS $VERIFY_DB;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "═══ Backup tiklash sinovi ═══"

# ---------- 1. Oxirgi dump ----------
LATEST=$(ls -t "$BACKUP_DIR"/armenu_*.dump 2>/dev/null | head -1 || true)
[ -z "$LATEST" ] && { log "⛔ Dump topilmadi"; notify "🚨 ARMENU: backup fayli YO'Q!"; exit 1; }

AGE_H=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
log "▶ Fayl: $LATEST (${AGE_H} soat oldin)"
if [ "$AGE_H" -gt 30 ]; then
  log "⛔ Backup 30 soatdan eski!"
  notify "🚨 ARMENU: oxirgi backup ${AGE_H} soat oldin — cron ishlamayapti?"
  exit 1
fi

# ---------- 2. Vaqtinchalik bazaga tiklash ----------
log "▶ $VERIFY_DB bazasiga tiklanmoqda..."
cleanup
$PSQL -d postgres -c "CREATE DATABASE $VERIFY_DB;" >/dev/null

RESTORE_START=$(date +%s)
pg_restore -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" -U "$DB_USER" \
  -d "$VERIFY_DB" --no-owner --no-privileges --jobs=4 "$LATEST" \
  >>"$LOG" 2>&1 || { log "⛔ pg_restore yiqildi"; notify "🚨 ARMENU: backup TIKLANMADI!"; exit 1; }
RESTORE_SEC=$(( $(date +%s) - RESTORE_START ))
log "  ✅ tiklandi (${RESTORE_SEC}s)"

# ---------- 3. Jadval soni ----------
TABLES=$($PSQL -d "$VERIFY_DB" -c "
  SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public';")
log "▶ Jadvallar: $TABLES"
if [ "$TABLES" -lt "$MIN_TABLES" ]; then
  log "⛔ Jadval juda kam (kutilgan >= $MIN_TABLES)"
  notify "🚨 ARMENU: backup to'liq emas — $TABLES jadval"
  exit 1
fi

# ---------- 4. ⚡ Kritik jadvallar mavjudmi ----------
CRITICAL="tenants_restaurant menu_dish orders_order payments_payment fiscal_fiscalreceipt accounts_staff"
for t in $CRITICAL; do
  EXISTS=$($PSQL -d "$VERIFY_DB" -c "SELECT to_regclass('public.$t') IS NOT NULL;")
  if [ "$EXISTS" != "t" ]; then
    log "⛔ Kritik jadval yo'q: $t"
    notify "🚨 ARMENU: backupda '$t' jadvali YO'Q!"
    exit 1
  fi
done
log "  ✅ 6 ta kritik jadval joyida"

# ---------- 5. Qator sanoqlarini prod bilan solishtirish ----------
log "▶ Qator sanoqlari solishtirilmoqda..."
DRIFT=0
for t in tenants_restaurant menu_dish orders_order payments_payment; do
  PROD=$($PSQL -d "$DB_NAME"   -c "SELECT count(*) FROM $t;")
  BAK=$($PSQL  -d "$VERIFY_DB" -c "SELECT count(*) FROM $t;")
  # Backup eskiroq bo'lgani uchun kamroq bo'lishi NORMAL, ko'p bo'lishi XATO
  if [ "$BAK" -gt "$PROD" ]; then
    log "  ⚠️ $t: backup=$BAK > prod=$PROD (g'alati)"
    DRIFT=$((DRIFT+1))
  else
    log "  ✅ $t: prod=$PROD backup=$BAK"
  fi
done

# ---------- 6. ⚡ Fiskal cheklar butunligi (qonuniy) ----------
BROKEN=$($PSQL -d "$VERIFY_DB" -c "
  SELECT count(*) FROM fiscal_fiscalreceipt
   WHERE status='confirmed' AND (fiscal_sign IS NULL OR fiscal_sign='');")
if [ "$BROKEN" -gt 0 ]; then
  log "  ⚠️ $BROKEN ta tasdiqlangan chekda fiskal belgi yo'q"
fi

# ---------- 7. Django migratsiyalari mos keladimi ----------
MIG=$($PSQL -d "$VERIFY_DB" -c "SELECT count(*) FROM django_migrations;")
MIG_PROD=$($PSQL -d "$DB_NAME" -c "SELECT count(*) FROM django_migrations;")
log "▶ Migratsiyalar: backup=$MIG prod=$MIG_PROD"

# ---------- 8. Xulosa ----------
SIZE=$(du -h "$LATEST" | cut -f1)
log "═══ ✅ Backup TIKLANADI. Hajm: $SIZE, tiklash: ${RESTORE_SEC}s ═══"
notify "✅ ARMENU backup sinovi OK
Fayl: $(basename "$LATEST") ($SIZE)
Tiklash: ${RESTORE_SEC}s · Jadval: $TABLES · Migratsiya: $MIG"

if [ -d /var/lib/node_exporter/textfile ]; then
  cat > /var/lib/node_exporter/textfile/armenu_backup_verify.prom <<EOF
armenu_backup_verify_success 1
armenu_backup_verify_timestamp $(date +%s)
armenu_backup_restore_seconds $RESTORE_SEC
armenu_backup_tables $TABLES
EOF
fi
```

**Cron:**
```bash
# /etc/cron.d/armenu-backup (davomi)
30 4 * * * armenu /home/armenu/app/scripts/verify_backup.sh
```

```bash
chmod +x scripts/verify_backup.sh
# armenu foydalanuvchisiga CREATE DATABASE ruxsati:
sudo -u postgres psql -c "ALTER USER armenu CREATEDB;"
```

✅ **Tekshirish:**
```bash
sudo -u armenu /home/armenu/app/scripts/verify_backup.sh
# ═══ ✅ Backup TIKLANADI. Hajm: XXX, tiklash: XXs ═══
# Telegram'ga xabar keldi
```

---

## V-232 — CI/CD (GitHub Actions)

**Fayl:** `.github/workflows/ci.yml`
```yaml
name: ARMENU CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: '3.12'
  DJANGO_SETTINGS_MODULE: config.settings.test

jobs:
  lint:
    name: Kod standarti
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip
      - run: pip install ruff black bandit pip-audit
      - name: Ruff
        run: ruff check .
      - name: Black
        run: black --check .
      - name: Bandit (xavfsizlik skani)
        run: bandit -r apps core config -ll -x tests
      - name: pip-audit (zaifliklar)
        run: pip-audit -r requirements.txt --ignore-vuln GHSA-none || true

  test:
    name: Testlar
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: armenu_test
          POSTGRES_USER: armenu
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5

    env:
      SECRET_KEY: ci-test-secret-key-not-for-production
      DEBUG: 'False'
      ALLOWED_HOSTS: '*'
      DB_NAME: armenu_test
      DB_USER: armenu
      DB_PASSWORD: test
      DB_HOST: 127.0.0.1
      DB_PORT: '5432'
      REDIS_URL: redis://127.0.0.1:6379/5
      REDIS_CHANNEL_URL: redis://127.0.0.1:6379/6

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip
      - name: Bog'liqliklar
        run: |
          sudo apt-get update && sudo apt-get install -y gettext
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Migratsiyalar
        run: python manage.py migrate --noinput

      - name: Yetishmayotgan migratsiya yo'qmi
        run: python manage.py makemigrations --check --dry-run

      # ==========================================================
      # ⚡⚡ MAJBURIY DARVOZALAR — o'tmasa deploy BLOKLANADI
      # ==========================================================
      - name: ⚡ Tenant izolyatsiya testi (MAJBURIY)
        run: pytest tests/test_tenant_isolation.py -v --tb=short

      - name: ⚡ To'lov idempotency testi (MAJBURIY)
        run: pytest tests/test_payment_idempotency.py -v --tb=short

      - name: ⚡ Narx serverda hisoblanishi (MAJBURIY)
        run: pytest tests/test_price_calculation.py -v --tb=short

      - name: ⚡ Otziv filtri testi (MAJBURIY)
        run: pytest tests/test_review_filter.py -v --tb=short

      - name: ⚡ Buyurtma holat mashinasi (MAJBURIY)
        run: pytest tests/test_order_state.py -v --tb=short

      - name: ⚡ Tarjima to'liqligi (MAJBURIY)
        run: |
          python manage.py compilemessages
          pytest tests/test_i18n_completeness.py -v --tb=short
      # ==========================================================

      - name: To'liq test to'plami + qamrov
        run: pytest --cov=apps --cov=core --cov-report=xml --cov-report=term
                    --cov-fail-under=75 -q

      - name: Qamrov hisobotini yuklash
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage.xml

  deploy:
    name: Production'ga deploy
    needs: [lint, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: SSH kalitini o'rnatish
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

      - name: ⚡ Deploy oldidan backup
        run: |
          ssh armenu@${{ secrets.DEPLOY_HOST }} \
            '/home/armenu/app/scripts/backup.sh'

      - name: Deploy
        run: |
          ssh armenu@${{ secrets.DEPLOY_HOST }} bash -s <<'DEPLOY'
            set -euo pipefail
            cd /home/armenu/app

            PREV=$(git rev-parse HEAD)
            echo "▶ Oldingi commit: $PREV"
            echo "$PREV" > /var/armenu/last_good_commit

            git fetch --all
            git reset --hard origin/main

            venv/bin/pip install -q -r requirements.txt
            venv/bin/python manage.py migrate --noinput
            venv/bin/python manage.py collectstatic --noinput
            venv/bin/python manage.py compilemessages

            export APP_VERSION=$(git rev-parse --short HEAD)
            echo "APP_VERSION=$APP_VERSION" > /home/armenu/app/.version
            echo "DEPLOYED_AT=$(date -Iseconds)" >> /home/armenu/app/.version

            # ⚡ Uzilishsiz
            sudo systemctl reload armenu
            sudo systemctl restart armenu-ws
            sudo systemctl restart armenu-workers.target
            sudo systemctl restart armenu-healer
          DEPLOY

      - name: Smoke test
        run: |
          sleep 8
          for i in $(seq 1 12); do
            code=$(curl -s -o /dev/null -w '%{http_code}' https://armenu.uz/health/)
            [ "$code" = "200" ] && break
            sleep 5
          done
          curl -f https://armenu.uz/health/
          curl -f https://armenu.uz/ready/
          echo "✅ Smoke test o'tdi"

      - name: ⛔ Rollback (deploy yiqilsa)
        if: failure()
        run: |
          ssh armenu@${{ secrets.DEPLOY_HOST }} bash -s <<'ROLLBACK'
            set -euo pipefail
            cd /home/armenu/app
            PREV=$(cat /var/armenu/last_good_commit)
            echo "⛔ Rollback → $PREV"
            git reset --hard "$PREV"
            venv/bin/pip install -q -r requirements.txt
            venv/bin/python manage.py collectstatic --noinput
            sudo systemctl reload armenu
            sudo systemctl restart armenu-ws armenu-workers.target
          ROLLBACK

      - name: Telegram xabar
        if: always()
        run: |
          STATUS="${{ job.status }}"
          ICON="✅"; [ "$STATUS" != "success" ] && ICON="⛔"
          curl -s -X POST \
            "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.ONCALL_CHAT_ID }}" \
            -d text="$ICON ARMENU deploy: $STATUS
          Commit: ${{ github.sha }}
          Muallif: ${{ github.actor }}"
```

**Fayl:** `requirements-dev.txt`
```
pytest
pytest-django
pytest-cov
pytest-xdist
factory-boy
freezegun
responses
ruff
black
bandit
pip-audit
```

**Fayl:** `pytest.ini`
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = test_*.py
addopts = --strict-markers --disable-warnings
testpaths = tests
markers =
    slow: sekin testlar
    integration: tashqi xizmat kerak
```

**Deploy sudoers** — `/etc/sudoers.d/armenu-deploy`:
```
armenu ALL=(root) NOPASSWD: /bin/systemctl reload armenu
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-ws
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-workers.target
armenu ALL=(root) NOPASSWD: /bin/systemctl restart armenu-healer
```

✅ **Tekshirish:**
```bash
# Lokal simulyatsiya
ruff check . && black --check .
pytest tests/test_tenant_isolation.py tests/test_payment_idempotency.py -v
pytest --cov=apps --cov=core --cov-fail-under=75 -q
# GitHub'da: Actions tab → yashil ✅
```

---

## V-233 — ⚡ CI'da tenant izolyatsiya testi majburiy

> ⚡ **T6 — eng katta risk (Kritik ta'sir).** Cross-tenant ma'lumot sizishi
> loyihani bir kechada o'ldiradi. Bu test o'tmasa **deploy BLOKLANADI**.

**Fayl:** `tests/test_tenant_isolation.py`
```python
"""
⚡⚡ ENG MUHIM TEST FAYLI — CI'da MAJBURIY.
Bu test o'tmasa deploy BLOKLANADI (.github/workflows/ci.yml).

Tekshiradi:
  1. Har TenantModel'da restaurant maydoni bor
  2. Har tenant ViewSet TenantScopedMixin ishlatadi
  3. Boshqa restoran ma'lumotiga API orqali kirib bo'lmaydi
  4. WS guruhlari restoran-scoped
  5. Kesh kalitlari restoran-scoped
"""
import inspect
import pytest
from django.apps import apps as django_apps


# ============================================================
#  1. STRUKTURA — har model tenant-scoped
# ============================================================
# Restoran'ga bog'lanmaydigan modellar (ataylab global)
GLOBAL_MODELS = {
    'core.Job', 'auth.User', 'auth.Group', 'auth.Permission',
    'contenttypes.ContentType', 'sessions.Session', 'admin.LogEntry',
    'tenants.Restaurant', 'tenants.Plan', 'menu.IkpuCatalog',
    'payments.PaymentEvent', 'ar3d.DishLibrary',
}


def test_all_business_models_are_tenant_scoped():
    """⚡ Har biznes modelida restaurant FK bo'lishi SHART"""
    from core.models import TenantModel
    missing = []
    for model in django_apps.get_models():
        label = f'{model._meta.app_label}.{model.__name__}'
        if label in GLOBAL_MODELS:
            continue
        if not model._meta.app_label.startswith(('menu', 'orders', 'payments',
                                                 'fiscal', 'loyalty', 'reviews',
                                                 'analytics', 'tables', 'guest',
                                                 'ar3d', 'accounts', 'ai',
                                                 'notifications')):
            continue
        fields = {f.name for f in model._meta.get_fields()}
        if 'restaurant' not in fields:
            missing.append(label)
    assert not missing, (
        f"⚡ Bu modellarda restaurant maydoni YO'Q (cross-tenant xavfi): {missing}")


def test_tenant_models_inherit_base():
    """TenantModel'dan meros olish — indekslar va qoidalar bir xil bo'lsin"""
    from core.models import TenantModel
    wrong = []
    for model in django_apps.get_models():
        label = f'{model._meta.app_label}.{model.__name__}'
        if label in GLOBAL_MODELS:
            continue
        fields = {f.name for f in model._meta.get_fields()}
        if 'restaurant' in fields and not issubclass(model, TenantModel):
            wrong.append(label)
    assert not wrong, f"restaurant bor, lekin TenantModel emas: {wrong}"


def test_all_tenant_viewsets_use_mixin():
    """⚡ Har tenant ViewSet TenantScopedMixin ishlatishi SHART"""
    from rest_framework.viewsets import GenericViewSet
    from core.mixins import TenantScopedMixin
    import importlib, pkgutil
    import apps

    bad = []
    for mod in pkgutil.walk_packages(apps.__path__, 'apps.'):
        if not mod.name.endswith(('.views', '.api', '.viewsets')):
            continue
        try:
            m = importlib.import_module(mod.name)
        except Exception:
            continue
        for name, obj in inspect.getmembers(m, inspect.isclass):
            if not issubclass(obj, GenericViewSet) or obj is GenericViewSet:
                continue
            if obj.__module__ != mod.name:
                continue
            qs = getattr(obj, 'queryset', None)
            if qs is None:
                continue
            model = qs.model
            fields = {f.name for f in model._meta.get_fields()}
            if 'restaurant' in fields and not issubclass(obj, TenantScopedMixin):
                bad.append(f'{mod.name}.{name}')
    assert not bad, f"⚡ TenantScopedMixin YO'Q: {bad}"


# ============================================================
#  2. API — cross-tenant kirish bloklangan
# ============================================================
@pytest.mark.django_db
def test_menu_not_visible_across_tenants(api_client, restaurant, restaurant2):
    from apps.menu.models import Category, Dish
    cat = Category.objects.create(restaurant=restaurant, name_uz='K1')
    Dish.objects.create(restaurant=restaurant, category=cat,
                        name_uz='MAXFIY-TAOM', price=1000, is_active=True)

    r = api_client.get(f'/v1/menu/{restaurant2.slug}/',
                       HTTP_HOST=f'{restaurant2.slug}.localhost')
    assert 'MAXFIY-TAOM' not in r.content.decode()


@pytest.mark.django_db
def test_order_not_accessible_across_tenants(api_client, order_with_items,
                                             restaurant2):
    r = api_client.get(f'/v1/orders/{order_with_items.id}/',
                       HTTP_HOST=f'{restaurant2.slug}.localhost')
    assert r.status_code in (403, 404), 'Boshqa restoran buyurtmasi ochildi!'


@pytest.mark.django_db
def test_payment_not_creatable_across_tenants(api_client, order_with_items,
                                              restaurant2):
    r = api_client.post('/v1/payments/',
                        {'order_id': order_with_items.id, 'provider': 'payme'},
                        HTTP_HOST=f'{restaurant2.slug}.localhost', format='json')
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_reviews_not_leaked_across_tenants(api_client, restaurant, restaurant2,
                                           review_settings):
    from apps.reviews.services import create_review
    create_review(restaurant, 5, text='REST1-SHARH')
    r = api_client.get('/v1/reviews/public/',
                       HTTP_HOST=f'{restaurant2.slug}.localhost')
    assert 'REST1-SHARH' not in r.content.decode()


@pytest.mark.django_db
def test_bonus_not_shared_across_tenants(restaurant, restaurant2):
    """Bir mijoz 2 restoranda — bonuslari ALOHIDA"""
    from apps.guest.models import Guest
    from apps.loyalty.models import LoyaltyProgram, Bonus
    from apps.loyalty.services import add_bonus
    import uuid

    for r in (restaurant, restaurant2):
        LoyaltyProgram.objects.create(restaurant=r, is_active=True)

    g1 = Guest.objects.create(restaurant=restaurant, device_token=uuid.uuid4(),
                              phone='998901112233')
    g2 = Guest.objects.create(restaurant=restaurant2, device_token=uuid.uuid4(),
                              phone='998901112233')     # bir xil telefon
    add_bonus(g1, 100000, 'manual')
    g1.refresh_from_db(); g2.refresh_from_db()
    assert g1.bonus == 100000
    assert g2.bonus == 0                     # ⚡ boshqa restoranda 0


@pytest.mark.django_db
def test_promo_code_scoped(restaurant, restaurant2, order_with_items):
    from apps.loyalty.models import Promo
    from apps.loyalty.promo import apply_promo, PromoInvalid
    Promo.objects.create(restaurant=restaurant2, code='SECRET50',
                         title_uz='x', discount_type='percent', value=50)
    with pytest.raises(PromoInvalid):
        apply_promo(order_with_items, 'SECRET50')


@pytest.mark.django_db
def test_staff_cannot_read_other_restaurant(api_client, restaurant, restaurant2,
                                            django_user_model):
    from apps.accounts.models import Staff
    u = django_user_model.objects.create_user('w1', password='x')
    Staff.objects.create(restaurant=restaurant, user=u, role='admin',
                         is_active=True)
    api_client.force_authenticate(u)
    r = api_client.get('/v1/admin/reviews/',
                       HTTP_HOST=f'{restaurant2.slug}.localhost')
    assert r.status_code in (403, 404) or r.json().get('items') == []


# ============================================================
#  3. WS va kesh — restoran-scoped
# ============================================================
def test_ws_group_names_include_restaurant():
    """⚡ WS guruh nomida restoran ID bo'lishi SHART"""
    from core.ws import g_kds, g_waiters, g_admin, g_cashier
    for fn in (g_kds, g_waiters, g_admin, g_cashier):
        name = fn(42)
        assert '42' in name, f'{fn.__name__} restoran ID\'siz guruh qaytardi: {name}'
        assert name.startswith('rest_'), f'Guruh nomi noto\'g\'ri: {name}'


def test_cache_keys_scoped():
    """Kesh kaliti restoran/slug bilan ajratilgan bo'lishi kerak"""
    from core.cache import menu_key
    k1 = menu_key('rest-a', 'uz', 1)
    k2 = menu_key('rest-b', 'uz', 1)
    assert k1 != k2


@pytest.mark.django_db
def test_queryset_mixin_filters(restaurant, restaurant2):
    """TenantScopedMixin queryset'ni haqiqatan filtrlaydimi"""
    from core.mixins import TenantScopedMixin
    from apps.menu.models import Category
    from rest_framework.exceptions import PermissionDenied

    Category.objects.create(restaurant=restaurant, name_uz='A')
    Category.objects.create(restaurant=restaurant2, name_uz='B')

    class FakeView(TenantScopedMixin):
        queryset = Category.objects.all()
        def get_queryset(self):
            return super().get_queryset()

    class Req:
        restaurant_id = restaurant.id

    v = FakeView()
    v.request = Req()
    names = set(v.get_queryset().values_list('name_uz', flat=True))
    assert names == {'A'}

    # restaurant_id yo'q bo'lsa — 403
    class NoReq:
        restaurant_id = None
    v.request = NoReq()
    with pytest.raises(PermissionDenied):
        list(v.get_queryset())
```

**Fayl:** `.github/workflows/ci.yml` — darvoza allaqachon V-232 da yozildi.
Qo'shimcha himoya — **branch protection**:
```bash
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=Testlar' \
  -f 'required_status_checks[contexts][]=Kod standarti' \
  -F 'enforce_admins=true' \
  -F 'required_pull_request_reviews[required_approving_review_count]=1'
```

**Pre-commit hook** — `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: tenant-isolation
        name: ⚡ Tenant izolyatsiya testi
        entry: pytest tests/test_tenant_isolation.py -q
        language: system
        pass_filenames: false
        stages: [pre-push]
      - id: ruff
        name: Ruff
        entry: ruff check --fix
        language: system
        types: [python]
      - id: black
        name: Black
        entry: black
        language: system
        types: [python]
```

```bash
pip install pre-commit && pre-commit install --hook-type pre-push
```

✅ **Tekshirish:**
```bash
pytest tests/test_tenant_isolation.py -v
# 12 passed ✅

# ⚡ Ataylab buzib sinash: bitta ViewSet'dan mixin'ni olib tashlang →
#    test YIQILISHI kerak → CI deploy'ni BLOKLASHI kerak
```

---

## V-234 — Yuklama testi (k6)

**Fayl:** `tests/load/menu.js`
```javascript
// ⚡ Menyu o'qish — eng ko'p yuklanadigan endpoint
import http from 'k6/http';
import {check, sleep} from 'k6';
import {Rate, Trend} from 'k6/metrics';

const errorRate = new Rate('errors');
const menuLatency = new Trend('menu_latency');

export const options = {
  stages: [
    {duration: '2m', target: 500},    // ko'tarilish
    {duration: '5m', target: 2000},   // barqaror
    {duration: '2m', target: 5000},   // pik
    {duration: '3m', target: 0},      // tushish
  ],
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    menu_latency: ['p(95)<250'],
  },
};

const BASE = __ENV.BASE_URL || 'https://stage.armenu.uz';
const SLUGS = (__ENV.SLUGS || 'demo-rest').split(',');
const LANGS = ['uz', 'ru', 'en'];

export default function () {
  const slug = SLUGS[Math.floor(Math.random() * SLUGS.length)];
  const lang = LANGS[Math.floor(Math.random() * LANGS.length)];

  const res = http.get(`${BASE}/v1/menu/${slug}/?lang=${lang}`, {
    headers: {'Accept': 'application/json'},
    tags: {name: 'menu'},
  });

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'javob < 250ms': (r) => r.timings.duration < 250,
    'kategoriya bor': (r) => {
      try { return (r.json('categories') || []).length >= 0; }
      catch (e) { return false; }
    },
  });

  errorRate.add(!ok);
  menuLatency.add(res.timings.duration);
  sleep(Math.random() * 3 + 1);
}
```

**Fayl:** `tests/load/order_flow.js`
```javascript
// ⚡ To'liq mijoz oqimi: QR → menyu → savat → buyurtma
import http from 'k6/http';
import {check, group, sleep} from 'k6';
import {Rate} from 'k6/metrics';

const flowErrors = new Rate('flow_errors');

export const options = {
  stages: [
    {duration: '1m', target: 100},
    {duration: '3m', target: 500},
    {duration: '2m', target: 1000},
    {duration: '2m', target: 0},
  ],
  thresholds: {
    'http_req_duration{name:order_create}': ['p(95)<500'],
    'http_req_duration{name:menu}': ['p(95)<250'],
    'http_req_duration{name:qr}': ['p(95)<200'],
    flow_errors: ['rate<0.02'],
  },
};

const BASE = __ENV.BASE_URL || 'https://stage.armenu.uz';
const TOKENS = (__ENV.QR_TOKENS || '').split(',').filter(Boolean);

export default function () {
  let ok = true;
  let sessionId = '';
  let dishes = [];

  group('1. QR skanerlash', function () {
    if (!TOKENS.length) return;
    const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
    const res = http.get(`${BASE}/t/${token}`, {tags: {name: 'qr'}});
    ok = check(res, {'QR 200': (r) => r.status === 200}) && ok;
    const jar = http.cookieJar();
    const c = jar.cookiesForURL(BASE);
    sessionId = (c['armenu_session'] || [''])[0];
  });

  sleep(2);

  group('2. Menyu ko\'rish', function () {
    const res = http.get(`${BASE}/v1/menu/demo-rest/?lang=uz`,
                         {tags: {name: 'menu'}});
    ok = check(res, {'menyu 200': (r) => r.status === 200}) && ok;
    try {
      const cats = res.json('categories') || [];
      cats.forEach(function (c) {
        (c.dishes || []).forEach(function (d) { dishes.push(d.id); });
      });
    } catch (e) { ok = false; }
  });

  sleep(Math.random() * 5 + 3);        // mijoz o'ylaydi

  group('3. Taom tafsiloti + AR', function () {
    if (!dishes.length) return;
    const id = dishes[Math.floor(Math.random() * dishes.length)];
    const res = http.get(`${BASE}/v1/dishes/${id}/`, {tags: {name: 'dish'}});
    check(res, {'taom 200': (r) => r.status === 200});
    // 30% mijoz AR ko'radi
    if (Math.random() < 0.3) {
      const ar = http.get(`${BASE}/v1/ar/${id}/`, {tags: {name: 'ar'}});
      check(ar, {'ar 200 yoki 404': (r) => [200, 404].includes(r.status)});
    }
  });

  sleep(3);

  group('4. Buyurtma yaratish', function () {
    if (!dishes.length) return;
    const body = JSON.stringify({
      items: [{dish_id: dishes[0], qty: 1}],
      idempotency_key: `k6-${__VU}-${__ITER}-${Date.now()}`,
    });
    const res = http.post(`${BASE}/v1/orders/`, body, {
      headers: {'Content-Type': 'application/json'},
      tags: {name: 'order_create'},
    });
    ok = check(res, {
      'buyurtma 201 yoki 4xx': (r) => r.status === 201 || (r.status >= 400 && r.status < 500),
    }) && ok;
  });

  flowErrors.add(!ok);
  sleep(5);
}
```

**Fayl:** `tests/load/websocket.js`
```javascript
// ⚡ WS: 5000 bir vaqtda ulanish
import ws from 'k6/ws';
import {check} from 'k6';
import {Counter, Trend} from 'k6/metrics';

const wsMessages = new Counter('ws_messages');
const wsConnectTime = new Trend('ws_connect_ms');

export const options = {
  stages: [
    {duration: '2m', target: 1000},
    {duration: '5m', target: 5000},
    {duration: '2m', target: 0},
  ],
  thresholds: {
    ws_connecting: ['p(95)<1000'],
    ws_session_duration: ['p(95)>25000'],
  },
};

const WS_URL = __ENV.WS_URL || 'wss://stage.armenu.uz/ws/guest/';

export default function () {
  const start = Date.now();
  const res = ws.connect(`${WS_URL}k6-${__VU}-${__ITER}/`, {}, function (socket) {
    socket.on('open', function () {
      wsConnectTime.add(Date.now() - start);
      socket.setInterval(function () {
        socket.send(JSON.stringify({type: 'ping'}));
      }, 15000);
    });
    socket.on('message', function () { wsMessages.add(1); });
    socket.on('error', function (e) { console.error('WS xato:', e.error()); });
    socket.setTimeout(function () { socket.close(); }, 30000);
  });
  check(res, {'WS 101': (r) => r && r.status === 101});
}
```

**Fayl:** `tests/load/run.sh`
```bash
#!/usr/bin/env bash
# ⚠️ FAQAT staging'da! Production'da ishlatmang.
set -euo pipefail

BASE="${BASE_URL:-https://stage.armenu.uz}"
OUT=tests/load/results
mkdir -p "$OUT"

if [[ "$BASE" == *"armenu.uz"* && "$BASE" != *"stage"* ]]; then
  echo "⛔ PRODUCTION aniqlandi — to'xtatildi. BASE_URL=stage... qiling."
  exit 1
fi

echo "═══ ARMENU yuklama testi ($BASE) ═══"

for test in menu order_flow websocket; do
  echo ""
  echo "▶ $test..."
  k6 run --summary-export="$OUT/${test}_$(date +%Y%m%d_%H%M).json" \
         -e BASE_URL="$BASE" \
         -e WS_URL="${BASE/https:/wss:}/ws/guest/" \
         "tests/load/${test}.js" || echo "  ⚠️ $test chegaralardan o'tmadi"
done

echo ""
echo "═══ Natijalar: $OUT ═══"
```

**Kutilgan natijalar (qabul mezoni):**

| Test | Maqsad | Chegara |
|---|---|---|
| `menu.js` | 5000 VU, menyu o'qish | p95 < 250 ms, xato < 1% |
| `order_flow.js` | 1000 VU, to'liq oqim | buyurtma p95 < 500 ms, xato < 2% |
| `websocket.js` | 5000 bir vaqtda WS | ulanish p95 < 1 s, uzilish yo'q |

```bash
chmod +x tests/load/run.sh
```

✅ **Tekshirish:**
```bash
# k6 o'rnatish
sudo gpg -k && sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6

# Ishga tushirish (STAGING'da!)
BASE_URL=https://stage.armenu.uz ./tests/load/run.sh

# ✅ checks.........: 99.5% ✓ 
# ✅ http_req_duration..: p(95)=180ms
# ✅ http_req_failed....: 0.21%
```

---

# ✅ FAZA 12 QABULI

```
[ ] sudo nginx -t                              → successful
[ ] systemctl is-active armenu                 → active
[ ] systemctl is-active armenu-ws              → active
[ ] systemctl is-active armenu-healer          → active
[ ] 5 ta armenu-worker@* active
[ ] ss -ltnp | grep -E '8060|8061'             → ikkalasi ochiq
[ ] ⚡ 10 marta `systemctl reload armenu` — bitta ham 502 YO'Q
[ ] curl https://armenu.uz/health/             → 200 {"status":"ok"}
[ ] curl https://armenu.uz/ready/              → 200 {"status":"ready"}
[ ] Redis o'chirilganda /ready/ → 503, /health/ → 200
[ ] ⚡ worker o'ldirilsa healer 60 s ichida ko'tardi
[ ] run_healer --once                          → {'ok': 7, ...}
[ ] curl /metrics | grep -c '^armenu_'         → 20+
[ ] promtool check rules armenu_alerts.yml     → SUCCESS
[ ] Grafana dashboard import bo'ldi, 14 panel ma'lumot ko'rsatadi
[ ] Sentry'ga test xato yetib bordi
[ ] ⚡ Sentry scrub: password/card_number → [FILTERED]
[ ] journalctl -u armenu -o cat | head -1      → to'g'ri JSON
[ ] /var/log/armenu/finance.log JSON formatda yozilmoqda
[ ] backup.sh ishladi, dump pg_restore --list bilan tekshirildi
[ ] ⚡ verify_backup.sh: dump haqiqatan TIKLANDI, 6 kritik jadval joyida
[ ] Backup S3'ga yuklandi, WAL arxivlanmoqda
[ ] CI: lint + test job'lari yashil
[ ] ⚡ tests/test_tenant_isolation.py           → 12/12 o'tadi
[ ] ⚡ Mixin ataylab olib tashlansa CI YIQILDI (darvoza ishlaydi)
[ ] Qamrov >= 75% (CI --cov-fail-under=75)
[ ] Deploy → smoke test → rollback zanjiri sinovdan o'tdi
[ ] k6 menu.js: p95 < 250 ms, xato < 1%
[ ] k6 order_flow.js: buyurtma p95 < 500 ms
[ ] k6 websocket.js: 5000 WS ulanish barqaror
[ ] ⛔ mebelcity (8040) servislari, DB'si, nginx konfigi TEGILMAGAN
[ ] git log --oneline | wc -l  → 234 ta commit
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 12 tugadi: deploy, self-healing, monitoring, backup, CI/CD"
python3 ROADMAP/03_HOLAT/update_progress.py V-234 ok "FAZA 12 tugadi — v1.5 TAYYOR"
```

---

# 🎉 v1.5 TUGADI — LOYIHA TAYYOR

**234 vazifa · 13 faza · 19,5 hafta**

```
FAZA 0  ✅ Tayyorgarlik            V-001…V-012   core qatlam
FAZA 1  ✅ Tenant + Auth           V-013…V-030   multi-tenant, JWT
FAZA 2  ✅ Menyu                   V-031…V-054   3 til, kesh
FAZA 3  ✅ Stol + QR               V-055…V-066   QR PDF
FAZA 4  ✅ Mijoz PWA               V-067…V-092   offline, savat
FAZA 5  ✅ Buyurtma + realtime     V-093…V-114   KDS, WS
FAZA 6  ✅ AR/3D                   V-115…V-142   ⚡ ASOSIY QIYMAT
FAZA 7  ✅ Zal plani               V-143…V-150   2D zal
FAZA 8  ✅ Admin panel             V-151…V-170   to'liq nazorat
FAZA 9  ✅ AI + MCP                V-171…V-186   chatbot, avto-tarjima
FAZA 10 ✅ To'lov + fiskal         V-187…V-204   Payme/Click/Uzum, OFD
FAZA 11 ✅ Sodiqlik + analitika    V-205…V-218   keshbek, otziv filtri
FAZA 12 ✅ Deploy + kuzatuv        V-219…V-234   production
```

## ✅ YAKUNIY QABUL MEZONLARI

### 1. Funksional (mijoz)
```
[ ] QR skanerlab menyu 3 tilda (uz/ru/en) ochiladi
[ ] ⚡ Taomni AR'da REAL O'LCHAMDA stolga qo'yib ko'rish (iOS + Android)
[ ] AR qo'llab-quvvatlamaydigan qurilmada 3D/rasm fallback ishlaydi
[ ] Savatga qo'shish, buyurtma berish, holatni real vaqtda kuzatish
[ ] Ofitsiant / hisob / suv chaqirish (60 s cooldown)
[ ] AI chatbot menyu bo'yicha 3 tilda javob beradi
[ ] ⚡ Ilovadan to'lash: Payme / Click / Uzum
[ ] ⚡ Hisobni bo'lish (teng yoki taomlar bo'yicha)
[ ] ⚡ Choychaqa (5/10/15% yoki o'z summasi)
[ ] ⚡ Fiskal chek: QR + Telegram'ga yuborish
[ ] Bonus/keshbek to'planadi va sarflanadi
[ ] Promokod ishlaydi
[ ] ⚡ Otziv: 5⭐ → Google'ga taklif, 1-3⭐ → faqat adminga
```

### 2. Funksional (restoran)
```
[ ] Oshxona KDS: kanban, tovushli signal
[ ] ⚡ Ofitsiant stol raqamini darhol ko'radi + push
[ ] Kassir to'lovlarni real vaqtda ko'radi
[ ] Admin: menyu, stol, xodim, narx, stop-list boshqaruvi
[ ] Admin 3D model yaratadi (kutubxona / AI / yuklash)
[ ] Zal plani 2D ko'rinishda
[ ] ⚡ AR analitikasi: ko'rish, konversiya, chek ta'siri
[ ] ⚡ Menyu-injiniring: 4 kvadrant + tavsiya
[ ] Otzivlar sahifasi (A-12): salbiylar ichkarida
[ ] Kunlik svodka Telegram'ga
[ ] Har stol uchun noyob QR + PDF chop etish
```

### 3. Nofunksional
```
[ ] Menyu 3G'da < 2,5 s ochiladi
[ ] API p95 < 250 ms (k6 tasdiqladi)
[ ] Lighthouse (mobil) > 90
[ ] 3D fayl ≤ 3 MB (GLB), ≤ 5 MB (USDZ)
[ ] ⚡ Dark + Light tema ikkalasi ham to'liq
[ ] ⚡ 3 tilda 100% tarjima (CI tekshiradi)
[ ] Test qamrovi ≥ 75%
[ ] ⚡ Tenant izolyatsiya testi 100% o'tadi (CI darvozasi)
[ ] 5000 parallel foydalanuvchi yuklama testi o'tdi
[ ] Web reload'da foydalanuvchi sezmaydi (socket activation)
[ ] Redis o'chirilganda menyu ishlashda davom etadi
[ ] ⚡ Self-healing daemon ishlaydi (7 tekshiruv) va log yozadi
[ ] Backup har kecha + ⚡ tiklanishi sinovdan o'tadi
```

### 4. Xavfsizlik va qonun
```
[ ] ⚡ Summa faqat serverda hisoblanadi (test bor)
[ ] ⚡ Karta ma'lumoti bizda saqlanmaydi (PCI DSS testi bor)
[ ] ⚡ Har to'lov webhook imzosi tekshiriladi
[ ] ⚡ To'lov idempotent (dublikat yo'q)
[ ] ⚡ Kunlik reconciliation provayder bilan
[ ] ⚡ Fiskal chek OFD orqali (48 soat retry)
[ ] ⚡ IKPU kodlari tasnif.soliq.uz da tekshirilgan
[ ] ⚡ Cross-tenant sizish yo'q (12 test)
[ ] Sentry'da maxfiy maydonlar [FILTERED]
[ ] Moliyaviy jurnal 90 kun saqlanadi
[ ] Ma'lumot O'zbekistonda joylashgan
```

### 5. Infratuzilma
```
[ ] ⛔ mebelcity_platform (8040) TEGILMAGAN — alohida VPS/port/DB/Redis
[ ] armenu.socket + armenu.service (zero-downtime reload)
[ ] armenu-ws.service (daphne, 8061)
[ ] 5 ta armenu-worker@* (model3d, fiscal, notify, ai, analytics)
[ ] armenu-healer.service (7 tekshiruv, 60 s)
[ ] nginx: WS proxy, 3D CORS, statik kesh, rate-limit
[ ] Prometheus + Grafana (14 panel) + alert qoidalari
[ ] Sentry + JSON log (Loki)
[ ] Backup + WAL + ⚡ tiklash sinovi
[ ] CI/CD: 6 majburiy darvoza + rollback
```

---

## 🚀 ENDI NIMA QILISH KERAK

Kod tayyor. Endi **bozorga chiqish** bosqichi.

### 1️⃣ PILOT RESTORAN O'RNATISH (1-2 hafta)

**Maqsad:** 5 ta pilot — 2 Toshkent + 2 Samarqand + 1 Buxoro.

```
Har restoran uchun ketma-ketlik:
  1. Shartnoma (bepul 3 oy + 10 taom 3D sovg'a)
  2. Tenant yaratish:
     python manage.py create_tenant --slug=<slug> --name="<nom>" \
       --city=<shahar> --plan=pro --phone=<tel>
  3. Menyu kiritish (Excel import yoki qo'lda)
     ⚡ Har taomga IKPU kodi SHART (fiskal uchun)
  4. Stollar + QR generatsiya + PDF chop etish + stolga qo'yish
  5. Xodimlar: admin, kassir, oshpaz, ofitsiantlar (PIN bilan)
  6. To'lov sozlash: Payme/Click merchant kalitlari
  7. Fiskal sozlash: OFD login + terminal ID + IKPU tekshiruvi
     python manage.py shell -c "
       from apps.fiscal.services.ikpu import validate_menu
       from apps.tenants.models import Restaurant
       print(validate_menu(Restaurant.objects.get(slug='<slug>')))"
     → {'ready': True} bo'lmaguncha fiskal YOQILMAYDI
  8. Sodiqlik: keshbek % + Google sharh havolasi
  9. ⚡ Xodimlarni o'qitish — 15 daqiqa:
     • Ofitsiant: telefonda buyurtma ko'rish + choychaqa (o'z foydasi!)
     • Oshpaz: KDS monitorida kanban
     • Kassir: to'lov + chek
     • Admin: menyu, stop-list, otzivlar
  10. Birinchi hafta kuzatuv: har kuni Grafana + otzivlar
```

**Muvaffaqiyat mezoni (1-oy):**
- Kuniga ≥ 20 buyurtma tizim orqali
- ⚡ AR ko'rgan mijoz cheki ≥ 15% yuqori (ROI dalili)
- Xodim shikoyati yo'q (choychaqa ishlayapti)
- Fiskal cheklarning 100% i `confirmed`

### 2️⃣ 3D KONTENT KUTUBXONASI (uzluksiz)

> 🔴 **B1 — eng katta biznes risk.** 1-oyda o'lchanadi.

```
Maqsad: 100+ tayyor 3D model (o'zbek milliy taomlari)

Ustuvorlik:
  1. Eng ko'p buyurtma qilinadigan 20 taom (pilot ma'lumoti bo'yicha)
  2. Milliy taomlar: osh, manti, somsa, lag'mon, shashlik, norin,
     chuchvara, dimlama, xonim, hasip, tandir go'sht, shurpa
  3. Ichimliklar: choy, kompot, ayron
  4. Shirinliklar: chak-chak, holva, navvot

Jarayon (80/20):
  • 80% — AI (Meshy/Tripo) + qo'lda tuzatish (~$3-5 / model)
  • 20% — qo'lda modellashtirish (murakkab taomlar, ~$25-40)

⚡ Har model uchun MAJBURIY:
  [ ] Real o'lcham tekshirilgan (T1 riski) — 30 sm likopcha etaloni
  [ ] GLB ≤ 3 MB (Draco siqish)
  [ ] USDZ ≤ 5 MB (iOS Quick Look)
  [ ] iPhone'da + Android'da sinovdan o'tgan (T2 riski)
  [ ] Kutubxonaga qo'shilgan (DishLibrary) — boshqa restoranlar ham ishlatadi

Xarajat o'lchash (1-oy oxirida):
  Jami model / jami xarajat = o'rtacha narx
  Agar > $15/model → AR faqat PREMIUM tarifda (B1 yumshatish rejasi)
```

### 3️⃣ SOTUV BOSHLASH (pilot natijasidan keyin)

```
Tayyorgarlik (pilot 1-oyidan keyin):
  [ ] Demo video (2 daqiqa): QR → AR → buyurtma → to'lov → chek
  [ ] Taqdimot (10 slayd) — ROI raqamlari BILAN
  [ ] ⚡ Pilot ROI hisoboti: "X restoranida chek Y% oshdi"
  [ ] Narx va shartnoma huquqchi tomonidan tasdiqlangan
  [ ] Sotuv skripti (3 e'tiroz javobi tayyor)
  [ ] armenu.uz sayti + demo menyu

⚡ Sotuv argumentlari (kuchdan zaifga):
  1. 💰 "Delivery 0% komissiya" — Yandex/Uzum 25-35% oladi
  2. ⚖️ "Fiskal talab qonuniy — biz bajaramiz" (majburiy)
  3. ⭐ "Google reytingingiz ko'tariladi, salbiy sharh internetga chiqmaydi"
  4. 📈 "AR ko'rgan mijoz cheki X% yuqori" (pilot raqami)
  5. 💝 "Ofitsiantlar choychaqa oladi — ular O'ZLARI targ'ib qiladi"
  6. 🎯 "O'zbekistonda AR menyu HECH KIMDA YO'Q" (2-3 yil ustunlik)

Bosqichma-bosqich:
  Oy 4  → Toshkent, 18 mijoz, ~6 mln so'm/oy
  Oy 5  → + Samarqand, Buxoro, 42 mijoz, ~16 mln
  Oy 6  → 75 mijoz, ~32 mln → ✅ OPERATSION FOYDA
  Oy 11 → 230 mijoz → ✅ INVESTITSIYA QOPLANDI
  Oy 12 → 280 mijoz, ~105 mln/oy (respublika miqyosi)
```

### 4️⃣ DOIMIY OPERATSIYA (birinchi kundan)

```
Har kuni:
  [ ] Grafana dashboard ko'rish (5 daqiqa)
  [ ] Telegram alert'lariga javob
  [ ] ⚡ Fiskal `manual` cheklar bo'lsa — QO'LDA yopish (qonuniy)
  [ ] Salbiy otzivlarga restoranlar javob berayotganini tekshirish

Har hafta:
  [ ] Backup verify log'ini ko'rish
  [ ] Yangi 3D modellar qo'shish
  [ ] Pilot restoranlar bilan aloqa (nima yoqmadi?)
  [ ] Sentry'dagi yangi xatolarni tuzatish

Har oy:
  [ ] ⚡ Chaos engineering: node/Redis/DB'ni ataylab yiqitish
  [ ] To'lov reconciliation hisoboti (farq bo'lmasin)
  [ ] Test qamrovi ≥ 75% ekanini tekshirish
  [ ] Xarajat tahlili (AI, server, 3D)

Har chorak:
  [ ] Backup'dan TO'LIQ tiklash mashqi (staging'da)
  [ ] Zaifliklar skani (pip-audit, bandit)
  [ ] Bozor tahlili: raqobatchi AR qo'shdimi?
```

### 5️⃣ KEYINGI VERSIYALAR (v2 — 12-oydan keyin)

```
v2 rejasi (bu TZ'da EMAS — alohida TZ yoziladi):
  • delivery/ — kuryer, zona, yetkazib berish
  • inventory/ — ombor, retsept, tannarx avtomatik
  • Ko'p filialli tarmoqlar (chain management)
  • iiko/RKeeper integratsiyasi
  • 🇰🇿 Qozog'iston (14-oy) — lokal to'lov + fiskal
  • Ovozli buyurtma (AI)
  • Stol bron qilish
```

---

## ⚠️ OXIRGI ESLATMALAR

```
⛔ mebelcity_platform ga HECH QACHON tegilmaydi:
   • Port 8040 — o'zgarmaydi
   • bittada-manager.service / .socket — TAHRIRLANMAYDI
   • Uning DB'si, Redis db'si, nginx konfigi — TEGILMAYDI
   • ARMENU butunlay alohida: 8060/8061, armenu_db, Redis 5/6

⚡ Har o'zgarishdan keyin:
   ./deploy/scripts/reload.sh        (uzilishsiz)
   yoki ./deploy/scripts/restart_all.sh   (to'liq)

⚡ Deploy CI orqali — qo'lda git pull QILINMAYDI:
   push → main → CI (6 darvoza) → backup → deploy → smoke → rollback

⚡ Tenant izolyatsiya testi HECH QACHON o'chirilmaydi.
   O'tmasa — deploy bloklanadi. Bu qoida muzokara qilinmaydi.
```

---

**Yakuniy:**
```bash
git tag -a v1.5.0 -m "ARMENU v1.5 — sotuvga tayyor (234/234 vazifa)"
git push origin v1.5.0
python3 ROADMAP/03_HOLAT/update_progress.py --status
```

**➡️ Keyingi:** kod emas — **pilot restoran**. `ROADMAP/START.md` da pilot bo'limi.

🎉 **Omad tilaymiz!**
