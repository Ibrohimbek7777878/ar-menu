# Online Store Guliston — Implementation Summary (FINAL)

## Objective
Django hyperlocal marketplace (Guliston) → production-ready ekotizim. BARCHA 6 TA MODUL + AR VA i18n TUGALLANDI.

## Important Details
- Dizayn: Fraunces + Inter, fon `#fafaf7`, primary `#16a34a`, Material Icons, Alpine.js, Leaflet 1.9.4, Tailwind CDN.
- Server: `cd "/home/ibrohim/Desktop/client_baza/online store_guliston/backend" && ./venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload` (doimiy: `setsid bash -c '... exec ./venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload > /tmp/django.log 2>&1' &`).
- `--noreload` tufayli o'zgarishdan keyin `fuser -k 8000/tcp` + restart shart.
- AUTH_USER_MODEL = `accounts.AdminUser`. DB = SQLite.
- **AI_API_KEY yo'q** → chatbot/marketing fallback (OpenAI kalit qo'shilsa avtomatik ishlaydi, stdlib urllib orqali).
- Telegram token ochib yozilgan — rotate qilish kerak.

## Modules — HAMMASI TAYYOR VA TESTDAN O'TGAN

### 1. Xarita (Apple/Google hybrid) ✓
`templates/base_map.html` + `templates/customer/map_view.html` — layer switcher (Dark/Satellite/Light), qora glassmorphism sidebar, MarkerCluster, fitBounds, custom SVG pin, flyTo+popup, OSRM yo'nalish, bottom-sheet. `maps/views.py` image_url+float.

### 2. Sotuvchi profillari ✓
accounts/shops model+serializer+permission. Plan basic/pro/business, AI kreditlari, rollar (super_admin/shop_owner/shop_manager/courier_manager/support). `shops.0004_convert_free_to_basic` (free→basic).

### 3. To'lov + Delivery ✓
`payments/payment_service.py` (create/mark_paid/mark_failed/status/dispatch_courier), `payments/api_views.py`+`api_urls.py` (create/status/click/payme/mock), `maps/api_views.py` (shops+delivery-quote), `orders` payment_status. **Verified**: mock→order confirmed; delivery-quote hisoblaydi.

### 4. AI chatbot ✓
`ai/` app: ChatSession/ChatMessage, `ai_service.py` (OpenAI+DB fallback: mahsulot qidirish, buyurtma holati, salom), `chat_api`, floating widget `templates/components/ai_chat.html` (base.html ga include). **Verified**.

### 5. AI marketing ✓
`ai/marketing_service.py` (OpenAI+shablon fallback, channel telegram/ig/fb), `marketing_api` (IsShopOwner + credit gate). `shops.ai_credits_left()`. **Verified** (credit 5→4).

### 6. Ko'p tillik (i18n) + Xavfsizlik ✓
- i18n: `web/templatetags/i18n_tags.py` (uz/ru/en dict + `language_switcher` tag), `backend/middleware.py`, `backend/context_processors.py`, `templates/components/language_switcher.html` (yaratildi). `base_map.html` va boshqa template lar `{{ t.* }}` ishlatadi. **Verified**: `?lang=ru` → ruscha nav.
- Xavfsizlik: `backend/ratelimit.py` (in-memory). `ai/views.py` chat (30/60) + MAX_MSG_LEN; `payments/api_views.py` create (15/60). **Verified**: 31-chi 429.

### 7. AR mahsulot ko'rish ✓
`products.ar_model` (URLField) + mavjud `ThreeDAsset` (glb/usdz). `customer_product_ar` view + `templates/customer/product_ar.html` (Google `<model-viewer>`, AR, scene-viewer/quick-look). `product_detail.html` da "AR da ochish" tugmasi. Default demo GLB. **Verified**: model-viewer render, link ishlaydi.

## Qolgan (keyingi bosqichlar)
- Haqiqiy to'lov kalitlari (Click/Payme/UzCard) + PostgreSQL/Redis/Celery.
- AI_API_KEY qo'yish (chatbot/marketing haqiqiy LLM ga o'tadi).
- Telegram token rotate.
- To'liq admin UI: AI marketing generatsiya sahifasi, AR model yuklash formasi.
- Prod deploy (staticfiles, HTTPS, CSP).

## AI Chatbot — Qilinishi Kerak Ro'yxati (TZ_AI_CHATBOT_IDEAL.md asosida)
**Holat:** Fallback 100% ishlaydi, OpenAI kalit bilan ideal — quyidagi ketma-ketlikda:

### M0 — Poydevor (tayyor, tekshirildi)
- [x] `ai/models.py:4` ChatSession/ChatMessage, `ai/ai_service.py:33` fallback + OpenAI, `ai/views.py:31` chat_api 30/60 rate limit, `components/ai_chat.html:47` Alpine widget, `base.html:102` include — **Verified** uz/ru/en.

### M1 — i18n To'liq (shu sessiyada tugadi)
- [x] `ai_service.py:14` SYSTEM_PROMPT_UZ/RU/EN, `STATUS_LABELS` 3 til, `_fallback_reply(lang)` 3 til, `chat_reply(lang)`
- [x] `ai/views.py:42` `request.language` + `data.lang`, `ai_chat.html:1` `{{ t.ai_chat_* }}` + `document.documentElement.lang` yuborish
- [x] `i18n_tags.py` `ai_chat_title/subtitle/placeholder/welcome/typing/error/no_reply` 3 til

### M2 — Funksiyani Kengaytirish (keyingi)
- [ ] **RAG** — `Product`/`Shop` uchun `pgvector` + `text-embedding-3-small` vektor qidiruv (fallback o'rniga semantik)
- [ ] **Tavsiya** — foydalanuvchi tarixi + `collaborative filtering` ("sizga yoqishi mumkin")
- [ ] **FAQ** — do'kon ish vaqti, yetkazish narxi, to'lov savollarini DB dan javob
- [ ] **Buyurtma chuqur** — telefon bo'yicha oxirgi 3 buyurtmani ro'yxatlash (hozir faqat raqam bo'yicha)

### M3 — UI/UX Ideal
- [ ] **Tarix paneli** — `ChatSession` ro'yxati, qidiruv, o'chirish (admin)
- [ ] **Feedback** — har javobda 👍/👎 + `POST /api/v1/ai/feedback/`
- [ ] **Typing indicator + source badge** — `openai` bo'lsa yashil nuqta
- [ ] **Mobile** — 92vw test, `x-cloak` Flicker yo'q

### M4 — Xavfsizlik & Monitoring
- [ ] **Redis rate limit** — `backend/ratelimit.py` in-memory → Redis (prod)
- [ ] **XSS audit** — `x-text` + `escapejs` tasdiq (allaqachon), CSP `wasm-unsafe-eval` tekshirish
- [ ] **Loglar** — `chat_api` har `source`, `lang`, `session_key` ni `logger.info` qilish
- [ ] **Kredit** — marketing kabi chatbot uchun ham kredit (ixtiyoriy)

### M5 — Prod & Kalit
- [ ] `.env: AI_API_KEY` qo'yish, `AI_TEXT_MODEL_FAST=gpt-4o-mini` test (`curl /api/v1/ai/chat/` source=openai)
- [ ] **Sentry** + `SENTRY_DSN` da chatbot xatolarini alohida tag
- [ ] **E2E** — Playwright: uz/ru/en da `salom` + `sut` + `GLS-` 3 tilda

### Qabul Mezoni (DoD)
- [ ] Barcha 3 tilda `salom`/`привет`/`hello` → tilga mos salom
- [ ] `sut`/`молоко`/`milk` → 5 ta mahsulot, narx `so'm`/`сум`/`sum`
- [ ] `GLS-` → buyurtma holati 3 tilda
- [ ] `AI_API_KEY` bo'sh → fallback, to'ldirilsa openai <2.5s
- [ ] 31-chi so'rov 429, widget barcha sahifada, `localStorage` sessiya saqlanadi

## Key Files
- `backend/ratelimit.py`, `backend/middleware.py`, `backend/context_processors.py`
- `ai/` (ai_service, marketing_service, views, urls, models)
- `templates/components/ai_chat.html`, `templates/components/language_switcher.html`
- `web/views.py` (customer_product_ar), `web/urls.py`, `templates/customer/product_ar.html`
- `products/models.py` (ar_model), `products/migrations/0004_product_ar_model.py`
- `payments/payment_service.py`, `maps/api_views.py`
- `shops/models.py` (plan/credits)
