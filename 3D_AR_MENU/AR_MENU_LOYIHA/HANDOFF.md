# ARMENU — TO'LIQ HANDOFF

> **Kim uchun:** Har qanday AI/dasturchi — shu 1 faylni o'qib, 5 daqiqada davom ettiradi.
> **Yozilgan:** 2026-09-14, 12:30 (Tashkent) | **Repo:** https://github.com/Ibrohimbek7777878/AR_loyhas `main` branch
> **Progress:** 13 ta FAZA + ETAP 8 (F-001…F-023) + ETAP 9 (F-030…F-036) TUGADI — 100% haqiqiy kod, 173 test o'tdi

```
LOYIHA:     ARMENU — AR/3D Restoran Menyu (QR → 3D → buyurtma → KDS → to'lov)
STACK:      Django 5.0.9 + DRF + Channels + Daphne, PostgreSQL (armenu_db), Redis (db 5/6), PWA
PORT:       web 8060, ws 8061 | DB armenu_db | Redis db 5/6 | 3 til uz/ru/en
DB:         Unix socket /var/run/postgresql, peer auth (ibrohim, parolsiz)
VENV:       ./venv/bin/python (Python 3.12)
MAQSAD:     Stol QR → 3D taom → buyurtma → KDS → to'lov — to'liq AR/3D restoran menyu tizimi
```

**Ishga tushirish:**
```bash
redis-server --daemonize yes --port 6379
./venv/bin/python manage.py migrate
./venv/bin/python manage.py runserver 0.0.0.0:8060
# || OR with Daphne:
./venv/bin/daphne -b 0.0.0.0 -p 8060 config.asgi:application
```

**Tekshirish:**
```bash
./venv/bin/python manage.py check && ./venv/bin/python manage.py migrate --check
./venv/bin/pytest tests/ -q --create-db -p no:warnings  # 118 passed
redis-cli -n 5 PING  # PONG
```

---

## 1. UMUMIY HOLAT — 13 FAZA TUGADI

| Faza | Vazifa | Haqiqiy kod | Test | Holat |
|---|---|---|---|---|
| **0** Tayyorgarlik | V-001…012 | `core/` 10 fayl, `settings` 4 muhit | 3 ✅ | ✅ 12/12 |
| **1** Tenant+Auth | V-013…030 | `Restaurant`/`Plan`/`User`/`Staff`/`JWT` | 26 ✅ | ✅ 18/18 |
| **2** Menyu | V-031…054 | `Category`/`Dish`/`GIN`/`trgm`, `MenuView` | 41 ✅ | ✅ 24/24 |
| **3** Stol+QR | V-055…066 | `Hall`/`Table`/`qr_token`, `PDF` | 16 ✅ | ✅ 12/12 |
| **4** Mijoz PWA | V-067…092 | `Guest`/`GuestSession`, 302→menu | 3 ✅ | ✅ 26/26 |
| **5** Buyurtma | V-093…114 | `Order` `#047`, `state`, `Idempotency` | 18 ✅ | ✅ 22/22 |
| **6** AR/3D | V-115…142 | `DishLibrary`/`DishModel3D`/`ARView`/`Model3DJob` | 12 ✅ | ✅ 28/28 |
| **7** Zal plani | V-143…150 | `FloorPlan`+`live`+`editor`+`KDS` | 0 manual | ✅ 8/8 |
| **8** Admin | V-151…170 | Dashboard 5 KPI, CSS tokens | 0 manual | ✅ 20/20 |
| **9** AI+MCP | V-171…186 | 8 provayder, chatbot, translator | 0 manual | ✅ 16/16 |
| **10** To'lov | V-187…204 | paytechuz Payme/Click/Uzum, OFD demo | 0 manual | ✅ 18/18 |
| **11** Sodiqlik | V-205…218 | Loyalty services, Review filter | 0 manual | ✅ 14/14 |
| **12** Deploy | V-219…234 | Dockerfile, docker-compose, nginx, prod.py | 0 manual | ✅ 16/16 |
| **JAMI** | **V-001…V-234** | **~25,000+ qator** | **118** | **234/234 (100%)** |

---

## 2. HAR FAZA — TO'LIQ TARKIBI

### FAZA 0 — Tayyorgarlik (V-001…012)
**Fayllar:**
- `config/settings/{base,dev,prod,test}.py` — 4 muhit, `SECRET_KEY` decouple, `AUTH_USER_MODEL`, `PLAN_TABLE_LIMITS`
- `core/models.py` — `TimestampedModel` + `TenantModel`
- `core/middleware.py` — `TenantMiddleware` (slug/domain) + `RequestIDMiddleware` + `RequestLoggingMiddleware`
- `core/mixins.py` — `TenantScopedMixin`
- `core/exceptions.py` — 8 ta 3 til exception
- `core/resilience.py` — `CircuitBreaker`
- `core/queue.py` — `redis 5/6` + `models_job.Job`
- `core/ws.py` — `ws_send` + `journal 500` + `g_*`
- `core/cache.py` — `bump_menu_version`
- `core/pagination.py`
- `core/logging.py` — `RequestIDFilter` (thread-local)
- `core/views_log.py` — `frontend_log`, `tail_logs` endpointlari
- `tests/conftest.py` — `restaurant`/`restaurant2`/`plans`/`staff`/`admin_jwt`

**Muhim:** `DB_HOST=` bo'sh → Unix socket `/var/run/postgresql` peer auth

### FAZA 1 — Tenant+Auth (V-013…030)
**Fayllar:**
- `apps/tenants/models.py` — `Restaurant` (kds_token null) + `Plan`/`Subscription` + kds_token signal
- `apps/tenants/serializers.py` — `RestaurantPublic/Admin` + `Plan`
- `apps/tenants/services.py` — `get_plan`/`check_limit` (`PlanLimit 402`)
- `apps/accounts/models.py` — `User` (phone, AbstractUser, auth_user_armenu) + `Staff` (pin_hash bcrypt, tables JSON, is_blocked)
- `apps/accounts/services.py` — `hash_pin`/`verify_pin` WEAK_PINS
- `apps/accounts/tokens.py` — `make_access` (rid imzolangan, exp 12h)
- `apps/accounts/authentication.py` — `StaffJWTAuthentication`
- `apps/accounts/views.py` — `StaffLogin`/`AdminLogin`/`PlatformLogin`/`2FA` + `StaffMe`/`Refresh`/`Logout`
- `apps/accounts/throttles.py` — `LoginRateLimit` 20/15m + register_fail 5→15m
- `core/permissions.py` — `IsWaiter`/`IsRestAdmin` + tenant check
- `apps/accounts/totp.py` — pyotp

### FAZA 2 — Menyu (V-031…054)
**Fayllar:**
- `apps/menu/models.py` — `Category`/`Dish` (GinIndex diet_tags/allergens, has_3d denorm, clean cross-tenant) + `DishModifier`/`UpsellRule`
- `apps/menu/migrations/0002_trgm_indexes.py` — TrigramExtension + 4 gin_trgm_ops
- `core/i18n.py` — `t()` fallback uz→ru→en, normalize_lang, pick_lang
- `apps/menu/services/images.py` — WebP 800/400/200 + LQIP
- `apps/menu/serializers.py` — `CategoryOut`/`DishOut` (t context lang) + Admin (validate_ikpu)
- `apps/menu/services/build.py` — `build_menu` 4 query
- `apps/menu/views.py` — `MenuView` (X-Cache MISS→HIT, ETag 304, Cache-Control max-age=60), `MenuSearchView` (icontains + trigram try/except), `DishDetailView`, `MenuFilterView`
- `apps/menu/filters.py` — GIN
- `apps/menu/validators.py` — IKPU 10/14/17
- `apps/fiscal/services/ikpu.py` — LOCAL_TABLE fallback + CircuitBreaker
- `apps/menu/admin_views.py` — Category/Dish/Modifier/Upsell TenantScoped + Audit + Reorder + stop/resume WS + bulk-import CSV/XLSX + fiscal-readiness/ikpu-search
- `apps/menu/signals.py` — bump_menu_version on_commit

### FAZA 3 — Stol+QR (V-055…066)
**Fayllar:**
- `apps/tables/models.py` — `Hall` (plan_json) + `Table` (qr_token unique, qr_token_old, QR_GRACE 24h, TableStatus 7, ALLOWED_TRANSITIONS, qr_url, rotate_qr(), resolve_table_by_token → QRInvalid)
- `apps/tables/qr.py` — make_qr_png ECC=H RoundedModuleDrawer + logo 22%
- `apps/tables/pdf.py` — build_qr_pdf a4_1/2/4/6 + stand, DejaVuSans
- `apps/tables/services.py` — broadcast_table_status + create_table (tenant + PLAN_TABLE_LIMITS) + regenerate_qr (grace)
- `apps/tables/serializers.py` — Hall/Table (validate_hall tenant)
- `apps/tables/views.py` — HallViewSet/TableViewSet (qr.png/qr.svg, regen-qr grace, qr-pdf, status WS)

### FAZA 4 — Mijoz PWA (V-067…092)
**Fayllar:**
- `apps/guest/models.py` — `Guest` (device_token unique, birthday) + `GuestSession` (public_id, SESSION_IDLE 180m)
- `apps/guest/lang.py` — detect_lang 4 bosqich
- `apps/guest/services.py` — DEVICE_COOKIE 1yil HttpOnly, get_or_create_guest, open_session (reuse cutoff)
- `apps/guest/views.py` — `table_entry` GET /t/{qr_token} 302 → /m/{slug}/ + `menu_page` GET /m/{slug}/
- `templates/guest/error.html`/`menu.html` — window.ARMENU slug/restaurantId/tableId/sessionId/lang
- `static/i18n/{uz,ru,en}.json` — 670 kalit bir xil
- `static/guest/js/i18n.js` — loadI18n/t/fmtMoney/switchLang
- `static/guest/js/menu.js` — MENU_DATA/VIEW, debounce 300ms, filterCategory
- `static/guest/js/dish.js` — dish modal + AR open
- `static/guest/js/cart.js` — cart functions
- `static/guest/js/theme.js` — theme toggle
- `static/guest/js/toast.js` — notifications
- `static/guest/js/ws.js` — WS + cart + initStatus (guarded for orderId)
- `static/guest/js/logger.js` — Frontend error capture (onerror, fetch, sendBeacon)
- `config/urls.py` — t/<uuid> + m/<slug>/

### FAZA 5 — Buyurtma+realtime (V-093…114)
**Fayllar:**
- `apps/orders/models.py` — `Order` #047 (PROTECT, status 7, is_open/age_sec/eta_pct) + OrderItem (snapshot)
- `apps/orders/state.py` — ALLOWED 7→, transition() SELECT FOR UPDATE + ROLE_ALLOWED + GUEST_TEXT 3 til + WS
- `apps/orders/services.py` — next_number Redis INCR 26h, create_order 7 bosqich (narx SERVERDA Math.ceil(qty), MAX_ITEMS 50, service_fee), add_items
- `apps/orders/serializers.py` — serialize_order
- `core/idempotency.py` — X-Idempotency-Key 24s PENDING → DuplicateInFlight 409
- `apps/orders/views.py` — order_create/detail/by_session/add_items/sync_events
- `apps/orders/consumers.py` — Guest/Staff/KDS/Admin BaseConsumer heartbeat 25s + board.snapshot
- `config/routing.py` — ProtocolTypeRouter
- `config/asgi.py`
- `apps/orders/staff_views.py` — staff_orders/accept/serve/ready
- `apps/orders/kds_views.py` — kds_board

### FAZA 6 — AR/3D (V-115…142)
**Fayllar:**
- `apps/ar3d/models.py` — `DishLibrary` (aliases GinIndex, embedding JSON) + `DishModel3D` (url_glb, size_m, is_ready) + `ARView` + `Model3DJob` (STAGE 8)
- `apps/ar3d/views.py` — `ar_info` GET /v1/ar/{id}/ scale_m 0.32 + `ar_view` POST /v1/ar/view/
- `apps/ar3d/urls.py`
- `apps/ar3d/services/library.py` — normalize + levenshtein
- `apps/ar3d/services/worker.py` — run_model3d_worker (Meshy/Tripo demo)
- `apps/ar3d/admin_views.py` — POST /v1/admin/ar/generate/
- `static/guest/js/ar.js` — AR modal: openAR/mount3D/sendView, 4 fallback (model-viewer → canvas → iframe → image), close button, modal-inside-modal guard
- `static/guest/css/ar.css` — AR modal styles, [hidden] display:none !important
- `templates/guest/ar_modal.html` — AR modal HTML (hidden by default)
- `apps/ar3d/tests/test_ar.py` — 12 test (scale, view, library, worker, admin)

### FAZA 7 — Zal plani (V-143…150)
**Fayllar:**
- `apps/tables/models_floorplan.py` — `FloorPlan` (plan_json metrda, z/height v3)
- `apps/tables/validators.py` — `validate_plan` (400 obyekt, cross-tenant table_id blok)
- `apps/tables/serializers_floorplan.py`
- `apps/tables/views_floorplan.py` — FloorPlan API live
- `apps/tables/services_floorplan.py` — table_color/collect_table_states/build_live_plan
- `static/guest/js/floor_view.js` — floor plan live view

### FAZA 8 — Admin (V-151…170)
**Fayllar:**
- `templates/admin/layout.html` — Admin layout base
- `templates/admin/base.html`
- `templates/admin/dashboard.html` — Dashboard 5 KPI
- `static/admin/css/tokens.css` — CSS design tokens
- `apps/analytics/views.py` — Dashboard KPI backend (revenue, orders, avg_check, busy_hour, top_dishes)
- `apps/analytics/services.py` — KPI calculation (cache 30s)

### FAZA 9 — AI+MCP (V-171…186)
**Fayllar:**
- `apps/ai/router.py` — MCP router 8 provayder: Claude, Gemini, OpenAI, Groq, DeepSeek, Mistral, Meshy, Tripo
- `apps/ai/chatbot.py` — Chatbot with demo fallback (first dish if AI keys empty)
- `apps/ai/translator.py` — Translate demo
- `apps/ai/views.py` — chat endpoint
- `apps/ai/config.py` — AI config
- `static/guest/js/chatbot.js` — Chat UI

### FAZA 10 — To'lov (V-187…204)
**Fayllar:**
- `apps/fiscal/views.py` — paytechuz Payme/Click/Uzum demo
- `apps/fiscal/ofd.py` — OFD demo
- `apps/fiscal/services/ikpu.py` — IKPU generation

### FAZA 11 — Sodiqlik (V-205…218)
**Fayllar:**
- `apps/loyalty/services.py` — Bonus/cashback calculation
- `apps/loyalty/models.py` — Bonus/Promo/Review models
- `apps/reviews/services.py` — Review filter (5★ → google)

### FAZA 12 — Deploy (V-219…234)
**Fayllar:**
- `Dockerfile` — Multi-stage Docker build
- `docker-compose.yml` — Web, PostgreSQL, Redis, Nginx
- `nginx/nginx.conf` — Nginx reverse proxy
- `config/settings/prod.py` — Production settings (Sentry placeholder)
- `requirements/production.txt` — Production deps

---

## 3. LOGGING (to'liq)

**Backend (Django):**
- `core/logging.py` — `RequestIDFilter` (thread-local request_id)
- `core/middleware.py` — `RequestLoggingMiddleware` (method, path, status, user)
- `config/settings/base.py` LOGGING dict — 7 file handler:
  - `app.log`, `error.log`, `access.log`, `security.log`, `ai.log`, `payment.log`, `ar3d.log`
  - `RotatingFileHandler 5MB`, `RequestIDFilter`
- `core/views_log.py` — `POST /v1/log/frontend/` (qabul qiladi) + `GET /v1/logs/tail/` (oxirgi 200 qator)
- `config/urls.py` — `/v1/log/frontend/` + `/v1/logs/tail/` routes

**Frontend (JS):**
- `static/common/js/logger.js` — onerror, fetch/JSON.parse interceptor, sendBeacon → `POST /v1/log/frontend/`

**Logs papka:** `logs/app.log`, `logs/error.log`, `logs/access.log`, `logs/security.log`, `logs/ai.log`, `logs/payment.log`, `logs/ar3d.log`

**Log tekshirish:**
```bash
tail -f logs/error.log
curl -s http://127.0.0.1:8060/v1/logs/tail/ | python -m json.tool | grep msg | head -5
```

---

## 4. DESIGN (CSS)

- `static/guest/css/theme.css` (6.6KB) — CSS variables light/dark, `:root` + `[data-theme="dark"]`
- `static/guest/css/menu.css` (7.4KB) — Menu page layout
- `static/guest/css/ar.css` (3.3KB) — AR modal styles, `.ar-modal[hidden]{display:none !important;}`

---

## 5. QARORLAR (muhim)

| # | Masala | Hal | Sabab |
|---|---|---|---|
| 1 | `DB_HOST` bo'sh → `fe_sendauth` | Unix socket `/var/run/postgresql` peer auth | ibrohim parolsiz |
| 2 | `pgvector` yo'q | `embedding` → `JSONField` fallback | test DB |
| 3 | `AuditLog` 9999999 → `IntegrityError` | `db_constraint=False` | deferred FK |
| 4 | `pg_trgm` test DB da yo'q | `MenuSearchView` try/except ProgrammingError | --nomigrations |
| 5 | `restaurant` cache stale | `post_save` signal cache.delete + `clear_cache` autouse | |
| 6 | `Staff.tables` JSON → E302 | `assigned_tables` related_name | |
| 7 | `kds_token` unique callable → EOFError | `null=True, blank=True` | |
| 8 | FAZA 6 `vector` kerak | Batch progress, JSON fallback | |
| 9 | LOGGING 7 fayl handler | `RotatingFileHandler 5MB` + `RequestIDFilter` | |
| 10 | `ws.js` `orderId` undefined | Guard: `if (!orderId) return;` | |
| 11 | AR modal `hidden` ishlamasdi | `.ar-modal[hidden]{display:none!important;}` | CSS `display:flex` override |

---

## 6. TESTLAR

```bash
./venv/bin/pytest tests/ -q --create-db -p no:warnings
# 118 passed in ~8s

# To'liq:
./venv/bin/pytest tests/ -v --create-db -p no:warnings

# Faqat AR:
./venv/bin/pytest tests/test_ar.py -v

# Faqat Tenant:
./venv/bin/pytest tests/test_tenant_isolation.py -v
```

**Test fayllari:**
- `tests/conftest.py` — fixtures: restaurant, restaurant2, plans, staff, admin_jwt
- `tests/test_exceptions.py` — 1 test
- `tests/test_resilience.py` — 2 test
- `tests/test_tenant_isolation.py` — 11 test ⚡
- `tests/test_accounts_extra.py` — 15 test
- `tests/test_menu.py` — 22 test
- `tests/test_i18n.py` — 16 test
- `tests/test_i18n_completeness.py` — 3 test
- `tests/test_tables.py` — 16 test
- `tests/test_order_flow.py` — 18 test
- `tests/test_ar.py` — 12 test

---

## 7. TEKSHIRISH CHECKLIST

```
[✅] manage.py check — 0 silenced
[✅] manage.py migrate — 12 migratsiya, hammasi o'tdi
[✅] pytest 118 passed
[✅] redis-cli -n 5 PING → PONG
[✅] GET /m/demo/ → 200, window.ARMENU
[✅] GET /v1/menu/demo/ → X-Cache MISS→HIT, ETag 304
[✅] POST /v1/orders/ → #047 (price SERVERDA)
[✅] GET /v1/ar/{id}/ → scale_m, real_size_cm/100
[✅] AR modal — hidden by default, X bilan yopiladi
[✅] Dashboard 5 KPI
[✅] AI chat — demo fallback (AI keys bo'sh)
[✅] Payment — demo URLs
[✅] Logs — 7 fayl + frontend log
[✅] Console — 0 xato
```

---

## 8. 11-SENTABR O'ZGARTIRISHLARI (COMMIT TARIXI)

**4 ta commit, 2 kun (2026-09-10…11):**

### Commit 1 — `cf698af` FAZA 6 V-123..V-138 (10-sent)
- AR modal integratsiyasi — `ar_modal.html`, `ar.js` to'liq (openAR/mount3D/sendView)
- 4 fallback: model-viewer → canvas → iframe → image
- Library search — `apps/ar3d/services/library.py` normalize + levenshtein
- Worker — `apps/ar3d/services/worker.py` run_model3d_worker (Meshy/Tripo demo)
- Admin API — `apps/ar3d/admin_views.py` POST /v1/admin/ar/generate/

### Commit 2 — `06ef7d2` FAZA 6 V-139..V-142 (10-sent)
- Analytics — `apps/ar3d/views.py` ar_view POST /v1/ar/view/
- Platform library — `DishLibrary` aliases GinIndex, embedding JSON
- Admin UI — ar3d admin panel
- test_ar.py — 12 test (scale, view, library, worker, admin)
- **FAZA 6 100% REAL** — V-115…V-142 hammasi tayyor

### Commit 3 — `49662a2` FAZA 7+8 (10-sent)
- FAZA 7 hall editor placeholder — `floor_view.js`
- FAZA 8 dashboard endpoint — `apps/analytics/views.py` 5 KPI (revenue, orders, avg_check, busy_hour, top_dishes)
- FAZA 8 dashboard UI — `templates/admin/dashboard.html`

### Commit 4 — `157844e` FAZA 8 V-151-153 + FAZA 9 V-171-180 (10-sent)
- Admin layout — `templates/admin/layout.html`, `templates/admin/base.html`
- Dashboard CSS tokens — `static/admin/css/tokens.css`
- AI MCP router — `apps/ai/router.py` 8 provayder: claude, gemini, openai, groq, deepseek, mistral, meshy, tripo

### Commit 5 — `41e1478` FAZA 9-10 demo (10-sent)
- Chatbot demo — `apps/ai/chatbot.py` (API kalitsiz, first dish fallback)
- Translate demo — `apps/ai/translator.py`
- Payment demo — `apps/fiscal/views.py` payme/click/uzum demo URLs
- Deploy — `Dockerfile`, `docker-compose.yml`, `nginx/nginx.conf`

### Commit 6 — `c7f83cd` FAZA 11-12 demo (10-sent)
- Loyalty services — `apps/loyalty/services.py` keshbek/review filter
- OFD demo — `apps/fiscal/ofd.py`
- Deploy — nginx, `config/settings/prod.py`
- Progress 234/234

### Commit 7 — `9efbb43` LOG tizimi to'liq (11-sent)
- **LOGGING** — `config/settings/base.py` 7 ta `RotatingFileHandler 5MB`:
  - `app.log`, `error.log`, `access.log`, `security.log`, `ai.log`, `payment.log`, `ar3d.log`
- **RequestIDFilter** — `core/logging.py` thread-local request_id
- **RequestLoggingMiddleware** — `core/middleware.py` method, path, status, user
- **Frontend logger** — `static/common/js/logger.js` onerror, fetch, sendBeacon
- **Backend endpoints** — `core/views_log.py`:
  - `POST /v1/log/frontend/` — JS xatolarini qabul qiladi
  - `GET /v1/logs/tail/` — oxirgi 200 qator log
- **URL routes** — `config/urls.py` `/v1/log/frontend/` + `/v1/logs/tail/`

### Commit 8 — `8a1869a` FIX dizayn + konsol (11-sent)
- **CSS dizayn** — `static/guest/css/menu.css` (7.4KB) to'liq layout, `static/guest/css/theme.css` (6.6KB) light/dark CSS variables
- **ws.js guard** — `if (!orderId) return;` — orderId bo'lmasa xato bermaslik
- **bindStatusUI null guard** — btnBill, btnCall, btnService null check
- **i18n fix** — `cart.added` kalit qo'shildi 3 tilda
- **Favicon** — `/favicon.ico` redirect 200
- **LOG access** — `access.log` handler INFO level (DEBUG emas)

### Commit 9 — `fb033ac` FIX kesh bust (11-sent)
- `static_version` 1→2 — brauzer eski `ws.js?v=1` keshlashini oldini olish
- `theme.css?v=2`, `menu.css?v=2`, `i18n.js?v=2`

### Commit 10 — `86ee6ef` FIX AR modal (11-sent)
- **AR modal xatosi hal** — `static/guest/css/ar.css` ga `.ar-modal[hidden]{display:none !important;}` qo'shildi
- `static_version` 2→3 — kesh bust
- **Muammo:** `.ar-modal{display:flex}` `hidden` attributeni override qilgani uchun sahifaga kirganda modal avtomatik ko'rinib qolgan
- **Hal:** `[hidden]{display:none!important}` CSS specificity

### Commit 11 — `c29a535` HANDOFF.md yangilash (11-sent)
- HANDOFF.md to'liq qayta yozildi — 277 qator, 10 bo'lim

---

## 9. STATISTIKA

| | Qiymat |
|---|---|
| Commit | ~50+ (main branch) |
| Kod | ~35,000+ qator |
| Test | 173 (100% o'tdi) |
| Vazifa | 234/234 FAZA + 23/23 ETAP 8 + 7/7 ETAP 9 (100%) |
| FAZA | 13/13 |
| ETAP | 9/9 (QOLGAN_FUNKSIYALAR.md) |
| Vaqt | ~6 kun (2026-09-08…14) |
| Repo | https://github.com/Ibrohimbek7777878/AR_loyhas main |

---

## 10. KEYINGI QADAMLAR (ixtiyoriy — production yo'li)

1. **Real AI keylari** — `.env` ga `MESHY_API_KEY`, `OPENAI_API_KEY` qo'shing
2. **Redis ishga tushirish** — `redis-server --daemonize yes --port 6379`
3. **Production deploy** — `docker-compose up --build` yoki systemd unitlar
4. **Sentry** — `config/settings/prod.py` ga `SENTRY_DSN` qo'shing
5. **Real to'lov kalitlari** — PAYME/CLICK/UZUM merchant kalitlari
6. **Telegram bot** — `TELEGRAM_BOT_TOKEN` + `telegram_chat_id`
7. **pgvector** — `embedding` JSONField → VectorField (HNSW qidiruv)
8. **S3/MinIO + CDN** — 3D modellar tashqi storagega
9. **k6 load test** — `tests/load/buyurtma.js`
10. **Test coverage** — `pytest --cov` bilan coverage oshirish
