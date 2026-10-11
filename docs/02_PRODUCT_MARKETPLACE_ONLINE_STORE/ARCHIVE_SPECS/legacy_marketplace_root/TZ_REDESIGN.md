# TZ — Online Store Guliston: Shopify-level Hyperlocal Commerce Platform (Ideal Spec)

> Maqsad: mavjud Django loyihasini to'liq qayta ishlash va "Shopify darajasidagi" ko'p-sotuvchi (multi-tenant) gipermahalliy tijorat platformasiga aylantirish.
> Holat: ushbu hujjat — ideal darajadagi texnik topshiriq (TZ). Amalga oshirish bosqichma-bosqich (roadmap) bo'yicha bo'ladi.
> Interfeys tillari: uz / ru / en.

---

## 0. Joriy holat (asos)
Mavjud kod bazasi (`/backend`) allaqachon quyidagilarga ega va saqlanadi:
- Django + SQLite, `accounts.AdminUser` (super_admin / shop_owner / customer_operator), `Shop` (owner maydoni bor), `Product`, `Order`, `Customer`, `Category`, `TelegramSubscriber`, `ARProduct`, `Review`, `Coupon`, `Banner`.
- Ko'p-sotuvchi oqimi **ishlaydi**: ro'yxatdan o'tish → do'kon yaratish (owner birikadi) → mahsulot → mijoz sotib oladi → buyurtma sotuvchiga bog'lanadi.
- To'lov: cash (COD) + mock provider (test-rejimda ishlaydi). Click/Payme/UzCard kalitlari yo'q (provider interfeysi mavjud, fallback bor).
- Telegram bot: kod tayyor, `TELEGRAM_BOT_TOKEN` bo'sh → token qo'yilganda ishlaydi.
- Admin dashboard, analytics, AI marketing, telegram sahifalari mavjud (responsiv qilib yaxshilandi).
- Storefront: xarita (Leaflet), kategoriya, mahsulot, savat, checkout, profil, do'kon sahifasi (`/shop/<slug>/`), AR viewer.

**Xulosa: qayta ishlash emas, darajani ko'tarish (upgrade) kerak.**

## 1. Umumiy arxitektura (target)
```
[ Browser / Mobile ]  -->  Django (multi-tenant)  -->  PostgreSQL
                               |  |  |
                          Celery + Redis (async: notify, rank, import, AI)
                               |
          [ Telegram Bot ]   [ OpenAI ]   [ Click/Payme/UzCard APIs ]
                               |
                    [ MCP gateway ] --> Trading / Finance / Marketing / Investor modules
```
- Backend: Django 5, PostgreSQL 16, Redis 7, Celery 5.
- Frontend: Django shablonlari + Tailwind (build), Alpine.js (interaktiv), HTMX (qisman render). SPA kerak emas.
- Build/static: `django-compressor` + Tailwind CLI (production uchun CDN o'rniga).
- Deploy: Docker Compose → Nginx + Gunicorn; WhiteNoise static; media S3-compatible.
- Multi-tenancy: har bir `Shop` subdomain yoki path (`/shop/<slug>/`); ma'lumotlar `shop_id` orqali izolyatsiya (row-level scoping).

## 2. Modullar va talablar

### 2.1 Store Builder (drag-and-drop, shablonlar, responsive, multi-tenant)
- Maqsad: sotuvchi kod yozmasdan o'z do'konini (Home, kategoriyalar, mahsulot grid, About, Kontakt) vizual yig'adi.
- Komponentlar: Hero, ProductGrid, CategoryStrip, Banner, Map, Reviews, CTA, RichText, ARShowcase. Har bir komponentda props (sarlavha, rasm, mahsulot filtri, rang).
- Builder UI: o'ng sidebar komponentlar | o'rta preview (mobile/desktop toggle) | chap property panel.
- Saqlash: `ShopPage` modelida JSON `layout` (section ro'yxati + props). Render: `customer_shop_detail` JSON dan sektsiyalarni chiqaradi.
- Shablonlar: "Minimal", "Neon", "Classic" — boshlang'ich layout sifatida.
- Responsive: preview da real breakpoint; chiqishda mobil birinchi (mobile-first) CSS.

### 2.2 AI Rating Algorithm (tashrif, sotuv, sharh)
- Har bir `Shop`/`Product` uchun `score` kunlik Celery task bilan hisoblanadi:
  `score = w1*norm(views) + w2*norm(sales_7d) + w3*avg_rating*log(reviews+1) + w4*conversion`
- Og'irliklar admin paneldan sozlanadi. Cache: Redis. Asosiy ro'yxatlar score bo'yicha saralanadi.
- "Views" ni aniq o'lchash: mahsulot sahifasi tashrifini Redis counter orqali.

### 2.3 Mobile Responsiveness
- Har bir sahifa uchun responsive audit: 360/390/768/1280 px da tekshirish.
- Prinsip: mobile-first, touch-friendly (min 44px target), rasm lazy-load, inline critical CSS.
- Avtomatik tekshiruv: Playwright screenshot skripti (CI da).

### 2.4 Telegram Bot (real token + webhook)
- `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`.
- Webhook: `/telegram/webhook/` subscriber saqlaydi (`/start`, `/id`), fallback long-polling.
- Xususiyatlar: yangi mahsulot e'loni, upsell (buyurtma keyin), broadcast (admin paneldan), obunachi yig'ish.
- Celery orqali navbat bilan yuborish (rate-limit 20/sek).

### 2.5 AI Marketing (real OpenAI, kredit)
- `.env`: `AI_API_KEY`, `AI_MODEL` (gpt-4o-mini).
- Xususiyatlar: upsell matni, kayfiyat ko'taruvchi (mood-lifting) xabar, sarlavha/SEO generatsiyasi.
- Kredit tizimi: `MarketingCredit` modeli; har bir generatsiya kredit ayiradi; tugasa ogohlantirish.
- Fallback: API kaliti yo'qsa tayyor shablonlar (mavjud logic saqlanadi).
- Celery orqali generatsiya (async, UI bloklanmaydi).

### 2.6 Payment Integration (Click, Payme, UzCard + cash + mock)
- `PaymentProvider` abstrakt; `MockProvider` (test), `ClickProvider`, `PaymeProvider`, `UzCardProvider`, `CashProvider` (COD).
- Har bir provayder uchun haqiqiy API: `create_payment`, `verify`, `webhook`.
- Admin sozlamalaridan provayder kalitlari kiritiladi; faol provayderlar checkout da ko'rsatiladi.
- Idempotent buyurtma holati: `pending → confirmed → ... → delivered`.

### 2.7 Database & Scaling
- SQLite → PostgreSQL (migratsiya skripti + data backfill).
- Redis + Celery: async vazifalar (Telegram yuborish, AI generatsiya, ranking, import/export).
- Production: Docker Compose (web/worker/redis/db), Gunicorn, Nginx, media S3.
- Indexlar: `shop_id`, `created_at`, `status`, `category` bo'yicha.

### 2.8 Analytics Dashboard
- KPI: tushum, buyurtmalar, AOV, konversiya, eng yaxshi mahsulotlar, to'lov breakdown.
- Grafiklar: kunlik/haftalik/oylik daromad (bar/line), to'lov uslubi pie.
- Admin dashboard (hozir yangilangan) + alohida `/admin/analytics/`.

### 2.9 AR Products
- `<model-viewer>` bilan 3D; responsiv embed (aspect-ratio container, lazy).
- Admin: GLB/GLTF yuklash + thumbnail; katalogda AR badge.

### 2.10 Multilingual (uz/ru/en)
- Django model translate (django-modeltranslate yoki manual `name_ru/name_en`).
- Interfeys tarjimasi: `.po` fayllar yoki JSON dict (mavjud `uznum`/`t` pattern kengaytiriladi).
- Til tanlash: cookie + `<html lang>`; URL prefix `/ru/`, `/en/` ixtiyoriy.

## 3. Dizayn tizimi (Design System)
- Stil: minimalist + futuristik, glassmorphism panel (yarim shaffof + blur), neon aksentlar (primary #16a34a + neon gradient).
- Dark/Light toggle: `theme` switch (`localStorage` + `html.dark`), butun admin va storefront da.
- Responsive layout: web + mobile (mobile-first grid).
- Animatsiyalar: hover glow, faol savdo da pulse, progress barlar; Alpine bilan kechikkan kirish (fade-up).
- Psixologik triggerlar: demo balans ta'kid (yashil), foyda urg'u, "AI Signal" tugmasi neon highlight.

## 4. MCP kengaytiruvchanligi
- `core/mcp.py`: MCP client gateway (JSON-RPC over stdio/http).
- Modullar (aloqador): Trading (narx/arb), Finance (hisob/rizvoy), Marketing (kampaniya), Investor (ROI/dashboard).
- Har bir modul alohida `apps/` sifatida ulanishi; asosiy kod o'zgarmaydi (pluggable).
- Kontrakt: har bir MCP tool `name`, `description`, `input_schema`, `handler`.

## 5. Roadmap (bosqichma-bosqich)
- **M0 — Poydevor**: PostgreSQL migratsiya, Redis+Celery, `.env` tozalash, Docker Compose. (1-2 hafta)
- **M1 — Dashboard & Design**: dark/light toggle, glassmorphism, admin dashboard to'liq, mobile audit. (1 hafta) — *qisman bajarildi (dashboard yangilandi)*
- **M2 — Store Builder**: drag-drop UI, shablonlar, `ShopPage` JSON render. (2-3 hafta)
- **M3 — Payments & Telegram real**: Click/Payme/UzCard, Telegram webhook + token. (1-2 hafta)
- **M4 — AI**: OpenAI haqiqiy, kredit tizimi, ranking algorithm (Celery). (1-2 hafta)
- **M5 — AR & i18n**: 3D viewer, uz/ru/en to'liq. (1 hafta)
- **M6 — MCP & Deploy**: modullar, k8s/Gunay, monitoring. (2 hafta)

## 6. Qabul mezonlari (Definition of Done)
- Barcha sahifalar 360–1280px da buzilmagan (Playwright screenshot 0 xato).
- Har bir sotuvchi o'z do'konini builder orqali yaratadi va u `/shop/<slug>/` da ishlaydi.
- To'lov: cash + mock + kamida Click ishlaydi (real kalit bilan).
- Telegram: token + webhook bilan e'lon/upsell/broadcast ishlaydi.
- AI marketing: OpenAI kaliti bilan generatsiya + kredit ayirish.
- PostgreSQL + Celery async vazifalar xatosiz.
- uz/ru/en til almashinuvi uzilib qolmaydi.

## 7. Ochiq savollar (clarify)
1. Hosting/domen: qayerda deploy (Gunay k8s yoki boshqa)?
2. To'lov provayderlari uchun real merchant kalitlari beriladimi?
3. OpenAI kaliti (yoki boshqa LLM) taqdim etiladimi?
4. Telegram bot tokeni + publik domen (webhook uchun) borligi?
5. Storage (S3) hisob-kitoblar?

---
*Hujjat ideal (nazariy) darajada yozilgan; amalga oshirish M0–M6 bosqichlari bilan cheklangan resursda bajariladi.*

