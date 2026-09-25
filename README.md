# Online Store Guliston — Pulse of Commerce

> **So'nggi yangilanish sanasi: 2026-09-25**

Guliston va Yangi Yer shaharlari uchun giperlokal marketplace ekotizimi:
**Django backend + Flutter mobil ilova + Web map mijoz interfeysi.**

## Loyihaning hozirgi holati (2026-09-25)

### Backend — Django (ishlayapti, testdan o'tgan)
`backend/` — eski Node/Express backend **to'liq Django + DRF ga ko'chirildi**.
`AUTH_USER_MODEL = accounts.AdminUser`, DB = SQLite (dev), JWT auth.

Tayyor va verified modullar (`backend/task-summary.md` asosida):

| # | Modul | Holat |
|---|-------|-------|
| 1 | Xarita (Apple/Google hybrid, Leaflet, OSRM yo'nalish, MarkerCluster) | ✅ Tayyor |
| 2 | Sotuvchi profillari (plan: basic/pro/business, rollar, AI kreditlari) | ✅ Tayyor |
| 3 | To'lov + Delivery (Click/Payme/mock, delivery-quote) | ✅ Tayyor (mock verified) |
| 4 | AI chatbot (OpenAI + DB fallback, uz/ru/en) | ✅ Tayyor (fallback 100%) |
| 5 | AI marketing (telegram/ig/fb, kredit gate) | ✅ Tayyor |
| 6 | Ko'p tillik i18n (uz/ru/en) + rate limit xavfsizlik | ✅ Tayyor |
| 7 | AR mahsulot ko'rish (`<model-viewer>`, glb/usdz) | ✅ Tayyor |

Keyingi bosqichlar: haqiqiy Click/Payme kalitlari, `AI_API_KEY`, Telegram token rotate,
PostgreSQL/Redis/Celery, prod deploy (HTTPS, staticfiles, CSP).

Ishga tushirish:
```bash
cd backend && ./venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload
```
(`--noreload` tufayli o'zgarishdan keyin `fuser -k 8000/tcp` + restart shart.)

### Mobil ilova — Flutter (`store_guliston_v1/`, v1.1.0)
Offline-first, serverless, APK-ready. Provider + go_router + sqflite.

Tayyor: home/katalog, shop detail, product detail, savat, checkout, order history,
seller panellari (agro catalog claim, starter pack, kunlik narx yangilash),
shop builder, admin panellari (dashboard, shops, products, orders, couriers, settings),
4 til lokalizatsiya (uz/ru/en/uz-Cyrl), ob-havo, xarita, AR preview, Firebase (manual setup kerak).

### Hujjatlar
- `TZ_*.md` — ideal darajadagi texnik topshiriqlar (AI chatbot, AR menu, seller panel,
  shop create/dropshipping, moliya/kanban, redesign, marketplace rollari).
- `roadmap/` — master TZ (V6/V7), Django TZ (V2/V3), implementatsiya promptlari.
- `backend/task-summary.md` — backend modullarning batafsil verified hisoboti.
- `kamchiliklar.md`, `HANDOFF.md` — kamchiliklar va handoff.

### Tuzilma
```
backend/               # Django + DRF (accounts, shops, products, orders,
                       #   payments, couriers, finance, ai, maps, ar3d, ...)
store_guliston_v1/     # Flutter mobil ilova (lib/screens, providers, services, ...)
roadmap/               # Master TZ va implementatsiya hujjatlari
TZ_*.md                # Ideal TZlar
scripts/               # Yordamchi skriptlar (start/stop/status server)
desktop_version/       # Desktop variant
AR_MENU_LOYIHA/        # AR menu loyihasi
air-3d-menu/           # 3D menu
static/                # Statik fayllar
```

### Muhim eslatmalar
- `backend/.env` va `backend/node_modules/` repoga **kirmaydi**
  (`.env.example` dan nusxa olib to'ldiring).
- Eski Node backend (`backend/src/*.ts`, `package.json`) o'chirildi — tarix git logda.
- Server skriptlar: `start_server.sh` / `stop_server.sh` / `status_server.sh`.

## Texnologiyalar
- **Backend**: Django 6, DRF, SimpleJWT, Celery/Redis, SQLite (dev) → PostgreSQL (prod)
- **Frontend**: Flutter/Dart (Provider, go_router, sqflite, google_maps_flutter)
- **Web**: Tailwind CDN, Alpine.js, Leaflet 1.9.4, Fraunces + Inter
- **Arxitektura**: Clean Architecture (Flutter), modulli Django apps
- **To'lov**: Click / Payme / mock

## License
MIT License
