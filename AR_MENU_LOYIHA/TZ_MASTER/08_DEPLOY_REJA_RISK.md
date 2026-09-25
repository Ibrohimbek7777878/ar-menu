# QISM VIII — DEPLOY, REJA, RISKLAR VA SAVOLLAR

---

## 1. 🚀 DEPLOY

### 1.1 Muhitlar

| Muhit | Maqsad | Domen | Ma'lumot |
|---|---|---|---|
| **dev** | Lokal ishlab chiqish | `localhost:8060` | Demo seed |
| **staging** | Sinov, pilot demo | `stage.armenu.uz` | Anonimlashtirilgan nusxa |
| **prod** | Ishlab chiqarish | `armenu.uz` | Real |

### 1.2 Systemd servislar

```ini
# /etc/systemd/system/armenu.socket
[Unit]
Description=ARMENU web socket
[Socket]
ListenStream=127.0.0.1:8060
NoDelay=true
[Install]
WantedBy=sockets.target
```

```ini
# /etc/systemd/system/armenu.service
[Unit]
Description=ARMENU web (gunicorn)
Requires=armenu.socket
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=armenu
WorkingDirectory=/home/armenu/app
EnvironmentFile=/home/armenu/app/.env
ExecStart=/home/armenu/app/venv/bin/gunicorn config.wsgi:application \
  --workers 8 --threads 4 --worker-class gthread \
  --timeout 60 --graceful-timeout 30 --keep-alive 5 \
  --max-requests 2000 --max-requests-jitter 200 \
  --access-logfile - --error-logfile - --log-level info
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=5
KillSignal=SIGTERM
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/armenu-ws.service
[Unit]
Description=ARMENU WebSocket (daphne)
[Service]
ExecStart=/home/armenu/app/venv/bin/daphne -b 127.0.0.1 -p 8061 \
  --proxy-headers --access-log - config.asgi:application
Restart=always
RestartSec=5
LimitNOFILE=65535
```

```ini
# /etc/systemd/system/armenu-worker@.service  (parametrli — 5 tur)
[Unit]
Description=ARMENU worker (%i)
[Service]
ExecStart=/home/armenu/app/venv/bin/python manage.py run_worker --queue=%i
Restart=always
RestartSec=10
MemoryMax=2G
```

Ishga tushirish:
```bash
systemctl enable --now armenu.socket armenu.service armenu-ws.service
systemctl enable --now armenu-worker@model3d armenu-worker@fiscal \
                       armenu-worker@notify armenu-worker@ai armenu-worker@analytics
systemctl enable --now armenu-healer.service
```

### 1.3 Nginx

```nginx
# /etc/nginx/sites-available/armenu.conf
upstream armenu_web { server 127.0.0.1:8060; keepalive 32; }
upstream armenu_ws  { server 127.0.0.1:8061; }

server {
    listen 443 ssl http2;
    server_name armenu.uz *.armenu.uz;
    ssl_certificate     /etc/letsencrypt/live/armenu.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/armenu.uz/privkey.pem;

    client_max_body_size 50M;          # 3D fayl yuklash
    gzip on; gzip_types text/css application/javascript application/json;

    # Statik
    location /static/ {
        alias /home/armenu/app/staticfiles/;
        expires 1y; add_header Cache-Control "public, immutable";
    }
    # 3D fayllar (CDN'ga o'tguncha)
    location /media/ar/ {
        alias /var/armenu/media/ar/;
        expires 30d; add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;   # AR uchun
    }
    # WebSocket
    location /ws/ {
        proxy_pass http://armenu_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
    # Web
    location / {
        proxy_pass http://armenu_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 1.4 CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: CI/CD
on: {push: {branches: [main]}}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres: {image: pgvector/pgvector:pg16, env: {POSTGRES_PASSWORD: test}}
      redis:    {image: redis:7}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12'}
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: python manage.py migrate
      - name: ⚡ Tenant izolyatsiya testi (MAJBURIY)
        run: pytest tests/test_tenant_isolation.py -v --tb=short
      - name: ⚡ Tarjima to'liqligi
        run: pytest tests/test_i18n_completeness.py -v
      - run: pytest --cov=apps --cov-fail-under=75
      - run: ruff check . && black --check .

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          ssh armenu@$HOST '
            cd /home/armenu/app &&
            git pull &&
            venv/bin/pip install -r requirements.txt &&
            venv/bin/python manage.py migrate --noinput &&
            venv/bin/python manage.py collectstatic --noinput &&
            venv/bin/python manage.py compilemessages &&
            sudo systemctl reload armenu &&
            sudo systemctl restart armenu-ws armenu-worker@*
          '
      - name: Smoke test
        run: curl -f https://armenu.uz/health/ || exit 1
```

> ⚠️ **Tenant izolyatsiya testi o'tmasa deploy BLOKLANADI.**

---

## 2. 📅 TO'LIQ REJA (bosqichma-bosqich)

### 2.1 v1 — MVP + AR (15 hafta)

| Hafta | Bosqich | Vazifalar | Natija |
|---|---|---|---|
| 1 | Tayyorgarlik + Tenant | V-001…V-030 | Skelet, auth ishlaydi |
| 2-3 | Menyu | V-031…V-054 | Menyu API, 3 til |
| 4 | Stollar + QR | V-055…V-066 | QR chop etiladi |
| 5-6 | Mijoz oqimi | V-067…V-092 | Menyu ko'rish, savat |
| 7-8 | Buyurtma + real-time | V-093…V-114 | Buyurtma, KDS, ofitsiant |
| 9-11 | ⚡ **AR/3D** | V-115…V-142 | **AR ishlaydi** |
| 12 | Zal plani | V-143…V-150 | 2D zal |
| 13-14 | Admin panel | V-151…V-170 | To'liq nazorat |
| 15 | AI + MCP | V-171…V-186 | Chatbot, avto-tarjima |
| | | | ✅ **v1 TAYYOR** |

### 2.2 v1.5 — Monetizatsiya (+4,5 hafta)

| Hafta | Bosqich | Natija |
|---|---|---|
| 16-17 | To'lov + fiskal | Payme/Click/Uzum, OFD chek |
| 18-19 | Sodiqlik, otziv, analitika | Keshbek, Google filtri, menyu-injiniring |
| 19,5 | Deploy + kuzatuv | Production, monitoring, backup |

### 2.3 Parallel ish (pilot bilan)

```
Hafta:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
Kod:    ████████████████████████████████████████████████████████
Pilot:        ░░░░ topish                ████ o'rnatish ████ o'lchash
3D:                      ░░░░ kutubxona boshlash ████████████████
Sotuv:                                              ░░░░ tayyorgarlik ████
```

### 2.4 6/12/24 oylik yo'l xaritasi

| Oy | Bosqich | Mijoz | Oylik daromad | Holat |
|---|---|---|---|---|
| 1-3 | Ishlab chiqish + 5 pilot | 5 (bepul) | 0 | Investitsiya |
| 4 | Sotuv start (Toshkent) | 18 | 6 mln | Investitsiya |
| 5 | Samarqand + Buxoro | 42 | 16 mln | Investitsiya |
| **6** | **Viloyat miqyosi** | **75** | **32 mln** | ✅ **Operatsion foyda** |
| 9 | 8 viloyat | 165 | 68 mln | Foyda |
| **11** | — | 230 | 88 mln | ✅ **Investitsiya qoplandi** |
| **12** | **Respublika miqyosi** | **280** | **105 mln** | Foyda |
| 14 | 🇰🇿 Qozog'iston | 340 | 132 mln | Kengayish |
| 17 | 🇰🇬 Qirg'iziston | 480 | 186 mln | Kengayish |
| 19 | 🇹🇯 Tojikiston | 580 | 224 mln | Kengayish |
| 21 | 🇦🇿 Ozarbayjon | 680 | 262 mln | Kengayish |
| **24** | **Qo'shni respublikalar** | **750** | **283 mln** | ✅ **~3,4 mlrd/yil** |

---

## 3. 👥 JAMOA

### 3.1 Minimal jamoa (0-6 oy)

| Rol | Soni | Vazifa | Oylik |
|---|---|---|---|
| Backend dasturchi | 1 | Django, API, worker | $1 200 |
| Frontend dasturchi | 1 | PWA, admin, AR | $1 000 |
| 3D dizayner (part-time) | 1 | Kutubxona, model sifati | $500 |
| Sotuv menejeri | 2 | Restoranlarga sotuv | $400 + % |
| **JAMI** | **5** | | **$3 500/oy** |

### 3.2 O'sgan jamoa (12-oy)

| Rol | Soni |
|---|---|
| Backend | 2 |
| Frontend | 2 |
| DevOps (part-time) | 1 |
| 3D dizayner | 2 |
| Sotuv | 4 |
| Qo'llab-quvvatlash | 2 |
| PM | 1 |
| **JAMI** | **14** |

---

## 4. ⚠️ RISKLAR VA YUMSHATISH (to'liq)

### 4.1 Texnik risklar

| # | Risk | Ehtimol | Ta'sir | Yumshatish | Egasi |
|---|---|---|---|---|---|
| T1 | AR real o'lcham noto'g'ri | O'rta | Yuqori | Har model qo'lda tekshiriladi; sinov ro'yxati | 3D dizayner |
| T2 | iOS USDZ konvertatsiya buziladi | O'rta | Yuqori | 3 xil konvertor; iPhone'da avtotest | Frontend |
| T3 | 3D fayl juda katta (sekin) | Yuqori | O'rta | Qat'iy 3 MB limit, Draco, LOD, CDN | Backend |
| T4 | WS 1 mln ulanishda yiqiladi | Past | Yuqori | Mijozga WS faqat buyurtmadan keyin (§III.4.2) | Arxitektor |
| T5 | DB yozish bo'g'ilishi | O'rta | Yuqori | Partition, replica, event→ClickHouse | Arxitektor |
| T6 | Cross-tenant ma'lumot sizishi | Past | **Kritik** | Middleware + mixin + CI test majburiy | Barcha |
| T7 | AI provayderlar bir vaqtda yiqilishi | Past | O'rta | 8 provayder, circuit breaker, fallback | Backend |
| T8 | To'lov webhook yo'qolishi | O'rta | Yuqori | Idempotency + kunlik reconciliation | Backend |
| T9 | Fiskal OFD API o'zgarishi | O'rta | O'rta | Adapter pattern, versiyalash | Backend |

### 4.2 Biznes risklar

| # | Risk | Ehtimol | Ta'sir | Yumshatish |
|---|---|---|---|---|
| B1 | **3D kontent narxi bashoratdan yuqori** | O'rta | **Yuqori** | Kutubxona + AI (80/20); 1-oyda o'lchanadi; yomon bo'lsa AR faqat premium tarifda |
| B2 | Restoranlar to'lamaydi | O'rta | Yuqori | FREE tarif; "delivery 0%" argumenti; pilotda ROI isbotlanadi |
| B3 | iiko/Zoomda AR qo'shadi | O'rta | O'rta | Kutubxona 2-3 yillik ustunlik; tez harakat |
| B4 | Xodim qarshiligi (ofitsiant) | O'rta | Yuqori | ⚡ **Choychaqa** — ular foyda ko'radi; 15 daq o'qitish |
| B5 | Churn yuqori (wow tugaydi) | O'rta | Yuqori | Fiskal+sodiqlik+analitika "yopishqoq"; AR analitika ROI ko'rsatadi |
| B6 | Yandex/Uzum bosim o'tkazadi | Past | O'rta | Biz agregator emasmiz — huquqiy jihatdan boshqa segment |
| B7 | Pilot restoran topilmaydi | Past | Yuqori | Bepul + 10 taom 3D taklifi; 15 tadan 5 tasi rozi bo'ladi |
| B8 | Asosiy dasturchi ketadi | O'rta | Yuqori | **Bu TZ** — hujjatlashtirilgan; kod standarti; option |
| B9 | Valyuta/inflyatsiya | Yuqori | Past | Narx so'mda, yiliga qayta ko'riladi |

### 4.3 Huquqiy risklar

| # | Risk | Yumshatish |
|---|---|---|
| H1 | Shaxsiy ma'lumot qonuni buzilishi | Ma'lumot O'zbekistonda; minimal yig'ish; rozilik; DPA hujjat |
| H2 | Fiskal talabga mos emaslik | v1.5 da OFD; yuridik maslahat; Soliq bilan maslahat |
| H3 | To'lov litsenziyasi | Biz to'lov qabul qilmaymiz — provayder qiladi (agent modeli) |
| H4 | Kontent mualliflik huquqi | 3D modellar bizniki; restoran rasmlari — shartnomada ruxsat |
| H5 | Chegaralararo ma'lumot (24-oy) | Har davlatda lokal server yoki adekvatlik |

### 4.4 Risk matritsasi

```
Ta'sir
  ▲
K │        B4        T6
R │     B1 B2 B5  T1 T2
I │
T │
──┼────────────────────────
Y │   B8 T5 T8    T4 T7
U │   T3 B3 H1 H2
Q │
O │
──┼────────────────────────
R │  B9 H3 H4     B6 B7
I │
  └────────────────────────▶
    Past    O'rta    Yuqori   Ehtimol
```

**Ustuvor 5 ta risk (birinchi navbatda hal qilinadi):**
1. 🔴 **T6** — cross-tenant sizish (CI test majburiy)
2. 🔴 **B1** — 3D kontent narxi (1-oyda o'lchanadi)
3. 🔴 **B4** — xodim qarshiligi (choychaqa v1.5 da SHART)
4. 🟠 **T1/T2** — AR o'lcham/USDZ (har model tekshiriladi)
5. 🟠 **B5** — churn (AR analitika ROI ko'rsatadi)

---

## 5. ✅ SIFAT NAZORATI

### 5.1 Test qamrovi (majburiy minimum)

| Modul | Qamrov | Kritik testlar |
|---|---|---|
| `core` | 85% | middleware, mixin, resilience |
| `tenants` | 90% | ⚡ izolyatsiya |
| `orders` | 90% | ⚡ holat mashinasi, idempotency, narx hisobi |
| `payments` | 90% | ⚡ webhook, imzo, idempotency |
| `ar3d` | 80% | fayl limiti, o'lcham, fallback |
| `menu` | 80% | kesh, 3 til, filtr |
| `ai` | 75% | fallback zanjiri, byudjet |
| **Umumiy** | **≥75%** | CI'da majburiy |

### 5.2 Majburiy testlar (deploy bloklaydi)

```python
tests/test_tenant_isolation.py    # ⚡ har model uchun cross-tenant 403
tests/test_i18n_completeness.py   # ⚡ 3 til to'liq
tests/test_order_state.py         # ⚡ noto'g'ri holat o'tishi 409
tests/test_payment_idempotency.py # ⚡ dublikat to'lov yo'q
tests/test_price_calculation.py   # ⚡ narx serverda hisoblanadi
```

### 5.3 Yuklama testi (har relizdan oldin)

```javascript
// tests/load/menu.js (k6)
export const options = {
  stages: [
    {duration: '2m', target: 500},    // ko'tarilish
    {duration: '5m', target: 2000},   // barqaror
    {duration: '2m', target: 5000},   // pik
    {duration: '3m', target: 0},      // tushish
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed:   ['rate<0.01'],
  },
};
```

### 5.4 Kod standarti

| Vosita | Maqsad |
|---|---|
| `ruff` | Linting |
| `black` | Formatlash |
| `mypy` (asta-sekin) | Tip tekshiruvi |
| `bandit` | Xavfsizlik skani |
| `pip-audit` | Zaifliklar |
| Pre-commit hook | Har commit'da avtomatik |

---

## 6. 📋 QABUL MEZONLARI (v1 tayyor deb hisoblanishi uchun)

### 6.1 Funksional

- [ ] Mijoz QR skanerlab menyuni 3 tilda ko'ra oladi
- [ ] ⚡ Mijoz taomni **AR'da real o'lchamda** stolga qo'yib ko'ra oladi (iOS + Android)
- [ ] AR qo'llab-quvvatlamaydigan qurilmada 3D/rasm fallback ishlaydi
- [ ] Mijoz savatga qo'shib buyurtma bera oladi
- [ ] Buyurtma holati real vaqtda yangilanadi
- [ ] ⚡ Ofitsiant **stol raqamini** darhol ko'radi va tovushli bildirishnoma oladi
- [ ] Oshxona KDS monitorida buyurtmalar kanban ko'rinishida
- [ ] Admin barcha buyurtmalarni real vaqtda nazorat qiladi
- [ ] ⚡ Har stol uchun **noyob** QR generatsiya qilinadi va PDF chop etiladi
- [ ] Mijoz ofitsiant/hisob/suv chaqira oladi
- [ ] AI chatbot menyu bo'yicha javob beradi (3 tilda)
- [ ] Admin 3D model yarata oladi (kutubxona/AI/yuklash)
- [ ] AR analitikasi ko'rsatiladi (ko'rish, konversiya, chek ta'siri)

### 6.2 Nofunksional

- [ ] Menyu sahifasi 3G'da < 2,5 s ochiladi
- [ ] API p95 < 250 ms
- [ ] Lighthouse (mobil) > 90
- [ ] 3D fayl ≤ 3 MB (GLB), ≤ 5 MB (USDZ)
- [ ] Dark + Light tema ikkalasi ham to'liq
- [ ] 3 tilda 100% tarjima (CI tekshiradi)
- [ ] Test qamrovi ≥ 75%
- [ ] ⚡ Tenant izolyatsiya testi 100% o'tadi
- [ ] 1000 parallel foydalanuvchi yuklama testi o'tadi
- [ ] Web node o'chirilganda foydalanuvchi sezmaydi
- [ ] Redis o'chirilganda menyu ishlashda davom etadi
- [ ] Self-healing daemon ishlaydi va log yozadi

### 6.3 Biznes

- [ ] 5 ta pilot restoran o'rnatilgan va ishlayapti
- [ ] Kamida 100 ta 3D model kutubxonada
- [ ] AR ta'siri o'lchangan (chek farqi %)
- [ ] Sotuv materiallari tayyor (demo, taqdimot, video)
- [ ] Narx va shartnoma tasdiqlangan

---

## 7. ❓ RUXSATDAN OLDIN JAVOB KERAK (yakuniy)

| # | Savol | Nima uchun muhim | Tavsiyam |
|---|---|---|---|
| 1 | **Server:** shu server (8060) yoki alohida VPS? | Izolyatsiya kafolati | ⚡ **Alohida VPS** — mebelcity'ga 0 xavf |
| 2 | **Domen va brend nomi?** | QR kodlarda doimiy qoladi | `armenu.uz` yoki sizning taklif |
| 3 | **Pilot restoran bormi?** | Butun strategiya shunga bog'liq | 5 ta kerak: 2 TSH + 2 SMQ + 1 BXR |
| 4 | **Byudjet (1-bosqich)?** | Jamoa hajmi | ~$45 000 (6 oy) |
| 5 | **Jamoa: kim yozadi?** | Muddat | 2 dasturchi kerak (parallel) |
| 6 | **3D kontent:** kim qiladi? | Eng katta xarajat | AI 80% + qo'lda 20% |
| 7 | **v1 qamrovi to'g'rimi?** (15 hafta) | Reja | Ha desangiz boshlaymiz |
| 8 | **AI API kalitlari bormi?** | MCP ishlashi uchun | Kamida 3 ta (Gemini bepul limit bor) |
| 9 | **FREE tarif bo'ladimi?** | Bozorga kirish tezligi | ⚡ Ha — viral kanal |
| 10 | **Fiskal (OFD) v1.5 da yetarlimi?** | Muddat | Ha — avval AR ishlasin |
| 11 | **To'lov:** ilovada yoki kassada? | v1 qamrovi | v1.5 da ilovada |
| 12 | **Qo'shni davlatlar:** qaysi biri birinchi? | 14-oy rejasi | 🇰🇿 Qozog'iston (eng katta) |

---

## 8. 🎯 YAKUNIY XULOSA

### 8.1 Loyiha bahosi (5 nuqtai nazardan)

| Nuqtai nazar | Baho | Izoh |
|---|---|---|
| 🏗 **Arxitektor** | 8,5/10 | Standart, sinovdan o'tgan stack; masshtablanadi; 5-yil chidamli |
| 📋 **PM** | 8/10 | 234 vazifa aniq; 15 hafta realistik; bog'liqliklar aniq |
| 💰 **Investor** | 8,5/10 | LTV/CAC 40:1; break-even 11 oy; TAM 118k nuqta; exit $3-5 mln |
| 🏪 **Restoran egasi** | 9/10 | Oyiga 590k to'lab 16-45 mln foyda; risk past |
| 🏛 **Davlat** | 9/10 | Soliq shaffofligi, turizm sifati, IT-eksport |
| 👤 **Foydalanuvchi** | 9/10 | Kutish yo'q, xato yo'q, taomni ko'radi |
| **O'RTACHA** | **8,7/10** | |

### 8.2 Nima uchun bu loyiha ishlaydi

```
1. ✅ Bozorda AR/3D qiluvchi HECH KIM YO'Q (O'zb + 5 qo'shni davlat)
2. ✅ Sotib olish sababi AR emas — PUL (delivery 0%) + QONUN (fiskal)
3. ✅ 3D kutubxona = takrorlanmaydigan aktiv (2-3 yillik ustunlik)
4. ✅ Turizm 7,75 mln (+22,6%) — eng kuchli use-case
5. ✅ QR odati shakllangan (to'lov QR tufayli)
6. ✅ Telegram 27 mln — ilova kerak emas
7. ✅ Birlik iqtisodiyoti sog'lom (LTV/CAC 40:1)
8. ✅ Texnologiya tayyor va arzon (model-viewer, Meshy, paytechuz)
```

### 8.3 Nima loyihani o'ldirishi mumkin

```
1. 🔴 3D kontent narxi nazoratdan chiqishi → kutubxona + AI bilan hal qilinadi
2. 🔴 Xodim qarshiligi → choychaqa bilan hal qilinadi
3. 🔴 Cross-tenant ma'lumot sizishi → CI test bilan oldi olinadi
4. 🟠 Churn → fiskal + analitika "yopishqoqligi" bilan
5. 🟠 Sekin sotuv → FREE tarif + viral QR bilan
```

### 8.4 Birinchi qadam

> ⛔ **KOD YOZILMAYDI.** Avval §7 dagi 12 ta savolga javob.
>
> Javob kelgach, **V-001** dan boshlab, TZ bo'yicha ketma-ket ishlaymiz.

---

## 9. 📚 HUJJATLAR RO'YXATI

| Fayl | Mazmun |
|---|---|
| `01_KIRISH_VA_BIZNES.md` | Biznes-model, bozor, investor, 5 nuqtai nazar |
| `02_SAHIFALAR_VA_TUGMALAR.md` | ⚡ Har sahifa, har tugma, jarayon zanjirlari |
| `03_ARXITEKTURA.md` | ⚡ Masshtablash, fault-tolerance, self-healing |
| `04_DATA_MODEL_VA_API.md` | DB sxema, API spetsifikatsiya, WebSocket |
| `05_KOD_YOZISH_TARTIBI.md` | ⚡ 234 vazifa, ketma-ketlik, fayl-fayl |
| `06_TARJIMA_VA_UI.md` | 3 til, dizayn tizimi, PWA |
| `07_AI_MCP.md` | ⚡ 8 provayder, router, fallback |
| `08_DEPLOY_REJA_RISK.md` | Deploy, reja, risklar, savollar (bu fayl) |

**Oldingi tahlillar:**
| `00_BOZOR_TAHLIL.md` | Birinchi bozor tahlili |
| `02_CHUQUR_BOZOR_TAHLIL_v2.md` | Fiskalizatsiya, delivery, turizm topilmalari |
| `03_TEXNIK_TZ_v2.md` | 3 rol, AR asosiy |

---

**Hujjat tugadi.**
Versiya 3.0 MASTER · 2026-09-04 · ARMENU loyihasi
