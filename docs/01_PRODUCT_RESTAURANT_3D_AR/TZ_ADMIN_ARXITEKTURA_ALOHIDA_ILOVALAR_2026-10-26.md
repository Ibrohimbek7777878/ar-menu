# TZ: Admin panelni alohida ilovalarga ajratish, har sahifa o'z URL va API'si bilan, tezkor navigatsiya

Sana: 2026-10-26 · Holat: **tasdiq kutilmoqda (qarorlar 9-bo'limda, standart qiymatlar bilan yozilgan)** · Kod yozuvchi: Gemini · Tekshiruvchi va push qiluvchi: Claude

**Bu hujjat nimaga tegishli:** 0-bosqich (tezlashtirish) va 1-bosqich (restoran admin ilovasi) to'liq yoziladi. 2–5-bosqichlar faqat reja va "tayyorgarlik qoidalari" sifatida (3–5-bo'limlar oxirida): ularning tafsiloti 1-bosqich natijasidan keyin alohida TZ bo'ladi.

**Bog'liq hujjat:** `TZ_ADMIN_AR_MENYU_VA_TELEGRAM_MINI_APP_2026-10-24.md` (eski TZ). Ikkalasi qanday birga bajarilishi 1.3-bo'limda va `TZ_INDEX_VA_BOSHLASH.md` da.

---

## 0. Muammo va maqsad (qisqa)

**Muammo (o'lchangan, 2026-10-26):**
1. Seller paneli ko'p sahifali: har bosishda butun sahifa qayta yuklanadi. O'lchov: DOMContentLoaded 469–1006 ms, HTML 87 KB (Dashboard) … 826 KB (Moliya), har safar ~50–65 KB ichki CSS, 12–45 KB ichki JS va `cdn.tailwindcss.com` skripti (kesh bo'lsa ham ~220 ms) takrorlanadi.
2. React admin bir sahifali, lekin `frontend/src/context/NavigationContext.tsx` (1216 qator) har **5 soniyada** buyurtmalar, stollar, chaqiruvlarni (va moliyani) **qaysi tab ochiqligidan qat'i nazar** so'raydi. Sahifa o'z ma'lumotini o'zi olmaydi.
3. Uchta mahsulot (restoran, bozor, 3D studiya) bir Django kodida; mahsulotni ish vaqtida port/`Host`/`X-Product` bo'yicha aniqlaydi. Har mahsulot URLconf'ida `/djangoadmin/` (251 marshrut, barcha modellar) va `/seller/` (54 marshrut) ochiq: restoran serveri bozor va studiya modellarini ham ko'rsatadi.
4. Mehmon yuki oshxona (KDS) ekranini sekinlashtiradi: 150 mehmon so'rovi ostida KDS p50 42 → 1087 ms, chunki bir xil ishchilar pooli bo'lishadi (o'lchandi).

**Maqsad:**
- Har mahsulot uchun **alohida admin ilova** (bir kod bazasida, alohida yig'iladi va alohida deploy qilinadi), ularni boshqaradigan **umumiy (master) admin** alohida.
- **Har sahifa = o'z URL'i + o'z marshruti (JS bo'lagi) + o'z API'si + o'z ruxsati.** Sahifaga o'tganda faqat o'sha sahifa yuklanadi; sidebar/sarlavha qayta yuklanmaydi.
- Hozir bitta serverda (bitta docker compose), keyinroq har biri alohida serverga: **ko'chirish = reverse proxy (Caddy/nginx) sozlamasini o'zgartirish**, kodni emas.

**Hozir QILINMAYDI:** mikroservislarga bo'lish, bazani jismonan bo'lish, SSO/JWT (2-bosqich), marketplace va studiya adminlari (4-bosqich). Bu bosqichlar uchun faqat "ularni to'sib qo'ymaslik" qoidalari bor.

---

## 1. Gemini uchun qoidalar

### 1.1 Eski TZ'dagi 1-bo'lim qoidalari bu yerda ham **majburiy** (o'zbek tili, branch, `.env` ga tegmaslik, o'chirmaslik/yashirish, eski CSS ga tegmaslik, yangi paket pin bilan, testlar, PostgreSQL mosligi). Qo'shimcha:

| № | Qoida |
|---|---|
| 1 | **Eski narsa o'chirilmaydi.** Seller paneli, `NavigationContext` va eski React sahifalar qoladi. Yangi ilova yoniga qo'shiladi, sahifama-sahifa almashtiriladi ("strangler"). Almashgan eski sahifa `admin_ui` bayrog'i (`legacy`/`new`, standart `legacy`, 1.4) bilan qaytariladigan bo'ladi. |
| 2 | Yangi ilova va yangi API **eski kodni import qilmaydi** (`NavigationContext`, `web/views.py` va h.k.). Faqat quyi qavat: modellar, servislar (`orders/application/services.py`, `finance/services/*`), `web/restaurant_auth.py` (ruxsatlar). |
| 3 | Har sahifa moduli bir xil 5 qismdan iborat (3.2): marshrut, sahifa komponenti, ma'lumot hook'i, API klient funksiyalari, ruxsat. Bitta fayl 400 qatordan oshmasin. |
| 4 | API URL'lari va asos yo'llar **muhit/konfigdan** olinadi (`VITE_BASE`, `VITE_API_BASE`). Kodda `http://…`, domen yoki port yozilmaydi. |
| 5 | Yangi kod `Shop`ni faqat `staff_shop(request)` / `self.staff_shop()` orqali oladi va hech qachon `Shop.objects.first()` kabi emas (kelajakdagi ko'p-tenantli ajratish uchun). |
| 6 | Hamma yangi ro'yxat API'lari **sahifalanadi** va **chegaralanadi** (standart 30, maks. 100). Cheksiz ro'yxat qaytarish taqiqlanadi. |
| 7 | Har yangi API uchun test: ruxsat (rol), do'kon bo'yicha ajratish (IDOR), sahifalash, noto'g'ri kirish. |

### 1.2 Tekshirish buyruqlari (eski TZ 1.2 + yangilari)

```bash
cd backend && venv/bin/python manage.py test && venv/bin/ruff check . \
  && DJANGO_SKIP_DOTENV=1 DEBUG=True venv/bin/python manage.py makemigrations --check --dry-run
cd ../frontend && npx tsc -b && npx oxlint && npm test && BUILD_TO_DJANGO=1 npx vite build
cd ../admins && npm ci && npm run typecheck --workspaces --if-present && npm test --workspaces --if-present \
  && npm run build --workspaces --if-present && node ../scripts/check_bundle_budget.mjs   # 4.7
```

### 1.3 Eski TZ bilan tartib (to'qnashuvni oldini olish)

| Eski TZ (2026-10-24) bosqichi | Bu TZ bilan munosabat |
|---|---|
| 1 (P0 xatolar: sharhlar 500, bugungi tushum, CSV BOM) | **Avval shu**, o'zgarishsiz |
| 2 (Seller tozalash: `panel_scope`, til) | **Shu**, o'zgarishsiz (Seller hali ishlatiladi) |
| 3 (Menyu backend: modellar, `menu-admin` API) | **Shu**, lekin API yo'li **`/api/restaurant/admin/v1/menu/…`** ga ko'chadi (4.3); model o'zgarishlari o'zgarishsiz |
| 4 (Menyu frontend, React «Menyu» tabi) | **BEKOR**: Menyu sahifasi yangi `resto-admin` ilovasida qilinadi (4.4). Eski `AdminDashboardPage` ga Menyu qo'shilmaydi |
| 5–6 (Telegram T1–T5) | **Shu**, o'zgarishsiz (mehmon ilovasi/bot, admin emas) |
| 6 (4.2 «3D Taomlar» bo'limi) va 7 (moliya sana filtri) | **Resto-admin ichida** (4.4) |
| 8 (CDN'dan voz kechish 5.5) | **Bu TZ 0.1 ga ko'chdi** |

### 1.4 Bayroqlar (barchasi admin sozlama/`.env`, kodni o'zgartirmasdan)

| Bayroq (AppSetting) | Qiymat | Ma'nosi |
|---|---|---|
| `admin_ui` | `legacy` (standart) / `new` | Egasi qaysi admin ilovaga tushadi (`role_home_url`). `new` bo'lsa `/seller/` sahifalari ko'chirilganlari yangi ilovaga yo'naltiriladi |
| `panel_scope` | `restaurant` (standart) / `all` | eski TZ 2.2 |
| `DJANGO_ADMIN_ENABLED` (env) | `True` DEBUG da, **`False` production restoran serverida** | `/djangoadmin/` yoqilgan-yoqilmagani (0.3) |

---

## 2. Maqsadli arxitektura

```
 Reverse proxy (Caddy; keyinroq nginx ham mumkin) — host yoki yo'l bo'yicha yo'naltiradi
 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ menu.<domen>            → resto-guest  (mehmon ilovasi + Telegram Mini App)        │
 │ resto-admin.<domen>     → resto-admin  (SPA qobig'i + /api/restaurant/admin/v1)    │
 │ admin.<domen>           → master-admin (SPA + /api/platform/v1)       [2–3-bosqich]│
 │ market-admin.<domen>    → market-admin                                [4-bosqich]  │
 │ studio-admin.<domen>    → studio-admin                                [4-bosqich]  │
 └────────────────────────────────────────────────────────────────────────────────────┘
 Hozir (1-bosqich): hammasi bitta compose'da; resto-admin yo'l bilan ham ochiladi: /ra/…
 Keyin: har xizmat alohida host'da; faqat proksi upstream'i o'zgaradi.
```

Atamalar:
- **Deployable** — alohida ishga tushiriladigan birlik (bir kod bazasidan). Hozir: `web` (Django) va `worker`. 0.6 dan keyin: `web-guest` va `web-staff` (bir rasm, har xil marshrutlar).
- **Control plane** — master admin (tenantlar, bayroqlar, foydalanuvchilar). **Data plane** — mahsulot ilovalari (buyurtma qabul qilish). Control plane o'chsa, data plane ishlashda davom etishi shart (keyingi bosqichlarda).
- **Sahifa moduli** — 3.2 dagi bir xil tuzilishdagi bitta sahifa.

---

## 3. Sahifa moduli standarti (har admin ilova uchun)

### 3.1 Kod tuzilishi (yangi ish maydoni `admins/`, npm workspaces)

```
admins/
  package.json                 # "workspaces": ["shared", "resto"]  (keyin: "master", "market", "studio")
  shared/                      # umumiy kutubxona (hech qaysi mahsulotga bog'liq emas)
    src/ui/                    # tugma, jadval, forma, modal, toast (yangi dizayn tokenlari: [data-design='new'])
    src/api/client.ts          # fetch o'rovchi: base URL, CSRF, xato formati, 401/403, kechikish (retry yo'q POST da)
    src/auth/session.ts        # GET …/session/ → {user, role, capabilities, tenant, flags}
    src/router/guard.ts        # capability bo'yicha marshrut himoyasi
  resto/                       # RESTORAN admin ilovasi
    index.html, vite.config.ts, package.json
    src/main.tsx               # qobiq: sidebar, sarlavha, <Outlet/>, bir marta yuklanadi
    src/routes.tsx             # barcha sahifalar React.lazy bilan (route chunk)
    src/pages/<nom>/           # 3.2 dagi sahifa moduli
    src/i18n/uz.ts             # barcha matn o'zbekcha, bitta joyda
```

`frontend/` (mehmon + xodim rol ekranlari: KDS, ofitsiant, hostess) **o'z joyida qoladi** va tegilmaydi. Resto-admin faqat **boshqaruv** sahifalari uchun.

### 3.2 Sahifa moduli (5 qism)

`admins/resto/src/pages/<nom>/` ichida:

| Fayl | Mazmuni |
|---|---|
| `route.ts` | `{ path, title, capability, loader? }` (URL, nom, kerakli ruxsat) |
| `Page.tsx` | komponent (faqat ko'rinish) |
| `api.ts` | shu sahifaning API funksiyalari (boshqa sahifa API'sini import qilmaydi) |
| `use<Nom>.ts` | ma'lumot hook'i: yuklash, kesh, yangilash chastotasi (sahifa ko'rinib turgandagina; `document.hidden` bo'lsa to'xtaydi) |
| `*.test.ts` | hook va api birlik testlari (`node:test`) |

Qoidalar: sahifa **boshqa sahifaning holatini o'qimaydi**; global holat faqat `session` va `toast`. Ma'lumot kesh kaliti `[resurs, filtr]`; sahifaga qaytganda eski ma'lumot darhol ko'rsatiladi va fonda yangilanadi (stale-while-revalidate; yangi paket qo'shmasdan, `shared/src/api/cache.ts` da ~60 qator).

### 3.3 API standarti (`/api/restaurant/admin/v1/…`)

- **Versiya:** yo'lda `/v1/`. Eski `/api/v1/restaurant/…` o'zgarishsiz qoladi (eski ilova ishlatadi); yangi API ularning **servislarini** qayta ishlatadi, nusxa ko'chirmaydi.
- **Ro'yxat javobi:** `{ "items": [...], "page": 1, "page_size": 30, "total": 123, "has_next": true }`. So'rov: `?page=&page_size=&q=&ordering=`.
- **Xato formati (RFC 7807):** `{ "type": "…", "title": "…", "status": 400, "detail": "…", "errors": {"maydon": ["…"]} }`; matnlar o'zbekcha.
- **Idempotentlik:** pul/buyurtma yaratadigan POST `Idempotency-Key` sarlavhasini qabul qiladi (bir xil kalit bilan qayta yuborilsa, ikkinchi yozuv yaratilmaydi; kalit 24 soat saqlanadi, `finance` va `orders` uchun).
- **Ruxsat:** `capability('<nom>')` (mavjud `web/restaurant_auth.py`), do'kon `self.staff_shop()` orqali. Boshqa do'kon ma'lumoti hech qachon chiqmaydi.
- **Hujjat:** OpenAPI sxemasi. Yangi paket kerak bo'lsa (`drf-spectacular`) aniq versiya pin bilan va sababi commit xabarida; kerak bo'lmasa sxema qo'lda `docs/openapi/resto-admin-v1.yaml` ga yoziladi va testda tekshiriladi.
- **Kesh sarlavhalari:** GET ro'yxatlar `Cache-Control: private, no-store`; `session` — `no-store`.
- **Vaqt:** server `Asia/Tashkent` kuni bo'yicha (`orders/timeutils.py`), ISO 8601 UTC bilan qaytaradi.

### 3.4 Ishlash byudjeti (testlanadi)

| Ko'rsatkich | Chegara |
|---|---|
| Resto-admin birinchi yuklash (gzip JS+CSS, qobiq) | ≤ 200 KB |
| Har sahifa bo'lagi (route chunk, gzip) | ≤ 60 KB |
| Sahifa almashtirish (kesh qobiq, localhost) | ≤ 150 ms, **0 ta to'liq hujjat so'rovi**, ≤ 3 API so'rovi |
| Har API ro'yxati javobi | ≤ 30 KB (gzip oldidan ≤ 100 KB) |
| API p95 (lokal, 60 ta taom, 20 stol) | ≤ 200 ms |
| Yashirin tabda fon so'rovlari | 0 |

---

## 4. Bosqichlar (tafsilot)

### 4.0 Bosqich 0 — tezlashtirish (bir serverda, ilovani qayta yozmasdan) · 1–2 hafta

**0.1 Tashqi skriptlardan voz kechish** (eski TZ 5.5 o'rniga)
- `backend/templates/base.html`: `cdn.tailwindcss.com` va `fonts.googleapis.com` olib tashlanadi.
- Tailwind **standalone CLI** bilan yig'ilgan CSS: `scripts/build_tailwind.sh` → `backend/static/css/site.tw.css` (content: `backend/templates/**/*.html`). Natija git'ga kiradi. Skript sozlamasi `tailwind.config.js` (eski `base.html` ichidagi `tailwind.config = {...}` dan ko'chiriladi: ranglar, shriftlar, `darkMode`).
- Shriftlar va Material Icons `woff2` fayllari `backend/static/fonts/` ga ko'chadi (`@font-face`, `font-display: swap`). Litsenziya fayllari yoniga qo'yiladi.
- **Qabul:** tarmoq faqat o'z domenigacha ruxsat etilgan brauzerda (tashqi so'rovlar bloklangan) `/seller/`, `/seller/finance/`, `/seller/products/` bezaksiz emas, ikonlar matn emas.

**0.2 Ichki CSS/JS ni keshlanadigan fayllarga chiqarish**
- `backend/templates/seller/base_seller.html` (~50–65 KB ichki `<style>`, 12–45 KB ichki `<script>`) → `backend/static/seller/seller.css` va `seller.js`. Sahifaga xos ichki bloklar o'sha sahifa shablonida qoladi, lekin >5 KB bo'lsa alohida fayl.
- `STORAGES['staticfiles']` ga `ManifestStaticFilesStorage` (production) — `{% static %}` hash'li nom beradi. Caddy (`deploy/Caddyfile`) hash'li `static` fayllarga ham `immutable` qo'yadi (hozir faqat `/static/react/assets/` uchun regex bor). Eski nomlar buzilmasligi uchun `collectstatic` testi.
- **Qabul:** `/seller/orders/` ikkinchi ochilishida (kesh) HTML hajmi 289 KB dan **≤ 120 KB** ga (ro'yxat sahifalanadi, 0.4) va ichki CSS ≤ 5 KB; DOMContentLoaded (localhost) ≤ 300 ms.

**0.3 `/djangoadmin/` va ortiqcha marshrutlarni mahsulot URLconf'laridan olish**
- `DJANGO_ADMIN_ENABLED` (env). `False` bo'lsa `urls_restaurant.py`, `urls_market.py`, `urls_studio.py` da `/djangoadmin/` qo'shilmaydi. Production restoran serverida standart `False`; super-admin faqat ichki manzildan (SSH tunnel) ishlatadi. `README` deploy bo'limiga yoziladi.
- `urls_studio.py` va `urls_market.py` dagi begona `restaurant/…` marshrutlari (20 ta) va `urls_restaurant.py` dagi `market/…` marshrutlari (`other_product_page` yo'naltiruvchilari) **saqlanadi** (reverse nomlari uchun), lekin `panel_scope=restaurant` rejimida yo'naltiradi.
- **Qabul:** `urls_restaurant` da `djangoadmin` bilan boshlanadigan marshrut soni 0 (flag o'chiq); mavjud testlar yashil (flag'ni testlarda `True` qiling).

**0.4 Ro'yxatlarni cheklash va sahifalash**
- KDS (`/api/kds/orders/`, `/api/v1/restaurant/orders/`): faqat faol holatlar (`pending`, `confirmed`, `preparing`, `ready`) va oxirgi 24 soat, maks. 200; qolgani `?page=`. Sinov: 3 447 faol buyurtmada javob 570 ms edi.
- `/seller/orders/` (Django): `?page=`, 50 tadan; holat filtri saqlanadi.
- PostgreSQL: `statement_timeout=15s`, `idle_in_transaction_session_timeout=30s` (`deploy/docker-compose.yml` db `-c` bayroqlari va `DATABASES['default']['OPTIONS']`).

**0.5 Global pollerni rolga va sahifaga moslash** (`frontend/src/context/NavigationContext.tsx`, minimal o'zgarish)
- `run()` hozir rolga qarab hammasini so'raydi. Yangi: joriy marshrutga qarab. `/kds`, `/kitchen` → faqat buyurtmalar; `/waiter` → buyurtmalar, stollar, chaqiruvlar; `/arrival`, `/hostess` → faqat stollar; `/admin*` boshqaruv markazi → buyurtmalar va stollar; moliya → faqat moliya. Boshqa sahifada so'rov **yo'q**. `document.hidden` tekshiruvi saqlanadi.
- **Qabul:** `/admin/` da "Moliya" tabini ochmagan holatda `finance` so'rovi yuborilmaydi (so'rov hisoblagich testi `frontend/tests`).

**0.6 Mehmon va xodim pool'larini ajratish** (faqat `deploy/`, kod o'zgarmaydi)
- `deploy/docker-compose.yml`: `web` dan tashqari `web-staff` (bir rasm, ayrim konteyner, 2 ishchi × 4 oqim). `web` — mehmon (qolgan yo'llar).
- `deploy/Caddyfile`: `/api/restaurant/admin/*`, `/api/kds/*`, `/api/v1/restaurant/orders*`, `/api/v1/restaurant/tables*`, `/api/v1/restaurant/calls*`, `/api/v1/restaurant/finance*`, `/seller/*`, `/admin*`, `/kds*`, `/kitchen*`, `/waiter*`, `/arrival*` → `web-staff:8000`. Qolgani `web:8000`. Healthcheck ikkalasida.
- **Qabul (o'lchov, Claude qayta o'lchaydi):** 150 mehmon so'rovi (`/menu/`, yopiq sikl) ostida `/api/kds/orders/` p95 **≤ 300 ms** (hozir 1643 ms).

**0.7 Mehmon menyusini keshlash**
- `tma_home` (`web/tma_views.py`) va `RestaurantMenuView` (`orders/interfaces/api/views.py`): do'kon bo'yicha tayyor JSON/HTML bo'lagi keshda 30 soniya (kesh kaliti: `menu:<shop_id>:<version>`; `version` — `Product`/`Category`/`Product3DModel` `post_save/post_delete` signalida oshiriladi; stop-list ham shu signal orqali darhol ko'rinadi). Kesh backend: `REDIS_URL` bo'lsa Redis, bo'lmasa mavjud fayl keshi.
- Sessiyaga bog'liq qism (stol, savat) keshga **kirmaydi**.
- **Qabul:** `/menu/` o'tkazuvchanligi (60 taom, lokal Docker) hozirgi ~150 so'rov/s dan **≥ 5 baravar**; taom narxi o'zgartirilgach mehmon menyusida **≤ 2 soniyada** ko'rinadi (test).

### 4.1 Bosqich 1 tayyorgarlik (kichik, xavfsiz migratsiya)

**1.0 Tenant identifikatori:** `shops.Shop` ga `public_id = UUIDField(default=uuid.uuid4, unique=True, editable=False)`. 3 bosqichli migratsiya (maydon null=True bilan qo'shish → mavjud qatorlarni `RunPython` bilan to'ldirish → `unique=True` va `null=False`). `session` javobi va barcha yangi API'lar `tenant.id` sifatida shu UUID'ni beradi (butun son ID ichki qoladi). Test: migratsiya SQLite va PostgreSQL'da; takrorlanmaydi.

### 4.2 Bosqich 1 — Resto-admin ilovasi · 3–5 hafta

**1.1 Ilova qobig'i** (`admins/resto`)
- Vite + React 19 + TypeScript (loyiha versiyalariga mos), `react-router-dom` (yangi paket, aniq versiya pin; sababi: marshrut va lazy yuklash). Boshqa yangi paket qo'shilmaydi.
- Chiqish: `backend/static/admins/resto/` (`BUILD_TO_ADMINS=1`), `manifest: true`, `base: '/static/admins/resto/'`. CSS yagona fayl, faqat yangi dizayn (`[data-design='new']` tokenlari `admins/shared/src/ui/tokens.css` da; eski CSS **import qilinmaydi**).
- Django: `web/templatetags/react_assets.py` ga `{% spa_css 'resto' %}` / `{% spa_js 'resto' %}` (manifest `static/admins/<nom>/.vite/manifest.json` dan; mavjud `react_css/react_js` o'zgarishsiz qoladi).
- Qobiq shabloni `backend/templates/admins/resto.html` (juda yengil, ichki skript/CSS yo'q; `window.__ADMIN_BOOT__` yo'q: hamma narsa `session` API orqali).
- Yo'llar: **`/ra/`** (yo'l, hozir) va `resto-admin.<domen>` (host, keyin) bir xil qobiqni beradi. Django catch-all: `re_path(r'^ra/(?P<path>.*)$', ...)` (mavjud `/api`, `/static`, `/media` dan keyin). `VITE_BASE=/ra/` (host bo'lsa `/`).

**1.2 Sessiya va kirish (hozir Django sessiyasi)**
- `GET /api/restaurant/admin/v1/session/` → `{ user: {id, name, role}, tenant: {id (UUID), slug, name}, capabilities: [...], flags: {admin_ui, panel_scope, guest_design}, csrf }` (kirmagan bo'lsa 401).
- Kirish: mavjud `/admin/login/` sahifasi (Django); muvaffaqiyatdan so'ng `role_home_url`: `admin_ui = new` bo'lsa `/ra/`. SPA ichida kirish formasi **yo'q** (2-bosqichgacha).
- `shared/src/auth/session.ts`: sahifa ochilganda bir marta chaqiriladi; 401 bo'lsa `/admin/login/?next=…` ga yo'naltiradi.
- Chiqish: `POST …/logout/` (CSRF), `/admin/login/` ga qaytaradi.

**1.3 Sahifalar (har biri 3.2 bo'yicha alohida modul, alohida URL va API)**

| Sahifa | URL (`/ra/…`) | API (`/api/restaurant/admin/v1/…`) | Ruxsat | Yangilash |
|---|---|---|---|---|
| Boshqaruv markazi | `/` | `GET dashboard/summary/` (bugungi tushum naqd/plastik, buyurtmalar soni, o'rtacha chek, faol buyurtmalar, band stollar, tugagan taomlar soni, eng ko'p sotilgan 5 ta) | `finance` + `kds` | 15 s |
| Buyurtmalar | `/orders` | `GET orders/` (holat, sana, `q`, sahifa), `GET orders/<id>/`, `POST orders/<id>/status/` | `kds` | 10 s |
| Menyu | `/menu` | 4.4 | `menu_admin` | qo'lda |
| Taom (forma) | `/menu/new`, `/menu/:id` | 4.4 | `menu_admin` | — |
| 3D taomlar | `/menu/3d` | `GET menu/3d/`, `POST menu/<id>/3d/` (mavjud `3d-scan` ni chaqiradi) | `menu_admin` | 5 s (faqat "tayyorlanmoqda" bo'lsa) |
| Stollar va QR | `/tables` | `GET tables/`, `POST/PATCH tables/…`, `GET tables/<id>/qr/` | `tables_read` / `menu_admin` | 10 s |
| Xodimlar | `/staff` | `GET staff/`, `POST staff/` (rol, login, parol yaratish), `PATCH staff/<id>/` (rol), `POST staff/<id>/block/` va `unblock/`, `POST staff/<id>/reset-password/` | `menu_admin` (egasi) | qo'lda |
| Moliya | `/finance` | `GET finance/summary/?from=&to=`, `GET finance/transactions/` (sahifalangan), `POST finance/transactions/`, `POST finance/transactions/<id>/cancel/`, `GET/POST finance/debts/`, `POST finance/debts/<id>/pay/`, `GET finance/export.csv?from=&to=` | `finance` | qo'lda + 30 s |
| Sozlamalar | `/settings` | `GET/PATCH settings/` (restoran nomi, manzil, telefon, ish vaqti, xizmat haqi foizi, KDS taymer chegaralari, Telegram bot, `guest_design`, `panel_scope`) | `menu_admin` | qo'lda |

- **Xodimlar sahifasi yangi funksiya** (eski TZ'da yo'q, sotuv uchun zarur): egasi o'zi xodim qo'shadi (`create_staff` buyrug'ining mantig'i `accounts/` servisiga ajratiladi va API shu servisni chaqiradi; buyruq ham o'sha servisni ishlatadi). Parol bir marta ko'rsatiladi. Xodim yaratish/bloklash `AuditLog` ga yoziladi; o'zini bloklash va oxirgi egani o'chirish taqiqlanadi.
- Dashboard va Moliya raqamlari **bitta funksiya** `finance/services/summary.py: today_summary(shop)` / `range_summary(shop, from, to)` dan (eski TZ 5.2). Ikkala panel bir xil raqam beradi (test).
- Moliya "Foyda" nomi **"Sof pul oqimi"** deb o'zgartiriladi; "Foyda" faqat operatsion hisob tayyor bo'lgach (alohida TZ).

**1.4 Seller bilan birga yashash (strangler)**
- `admin_ui = legacy` (standart): hech narsa o'zgarmaydi; `/ra/` faqat qo'lda ochiladi (super-admin sinashi uchun).
- `admin_ui = new`: egasi `/ra/` ga tushadi; Seller sidebar'ida ko'chirilgan sahifa havolalari `/ra/…` ga olib boradi; ko'chirilmagan sahifalar eski joyida ochiladi (sarlavhada "Eski ko'rinish" belgisi). Eski URL'lar (`/seller/orders/` va h.k.) **yo'qolmaydi**, qaytarish uchun bayroqni `legacy` ga qo'yish yetadi.

**1.5 Sahifa navigatsiyasi (asosiy qabul mezoni)**
- Sidebar bosilganda `history.pushState` (to'liq hujjat so'rovi **yo'q**); faqat shu sahifaning JS bo'lagi (agar yuklanmagan bo'lsa) va API so'rovlari yuboriladi. Sahifadan qaytganda oldingi ma'lumot kesh bilan **darhol** ko'rinadi.
- Brauzer "Orqaga/Oldinga" va to'g'ridan-to'g'ri URL (`/ra/finance` ni yangilash) ishlaydi.
- Yuklash holati skelet (skeleton), xato holati "Qayta urinish" tugmasi bilan.

### 4.3 Menyu API (eski TZ 3.6 jadvali ko'chirildi)

Prefiks `/api/restaurant/admin/v1/menu/` (eski TZ'dagi `menu-admin/products/…` o'rniga): `GET products/`, `POST products/`, `PATCH products/<id>/`, `POST products/<id>/duplicate/|feature/|restore/`, `DELETE products/<id>/` (soft-delete), `GET|POST categories/`; mavjud `POST /api/v1/restaurant/products/<id>/availability/` ni (stop-list) yangi `POST products/<id>/availability/` o'ralgan holda taklif qiladi (eski yo'l o'zgarishsiz). Model o'zgarishlari (`prep_minutes`, `has_real_photo`, `Category.is_restaurant`) eski TZ 3.5 bo'yicha.

### 4.4 Menyu sahifasi (eski TZ 3.1–3.2, 3.7 talablari yangi ilovada)

Ro'yxat (kartalar, qidiruv, holat filtri, «Tugadi», «Tavsiya», «Yashirilganlar»), forma (6 maydon + «Qo'shimcha ▾», qo'zg'almas «Saqlash», telefon kamerasi), «3D taomlar» ko'rinishi. Qabul mezonlari eski TZ 3.7 + 3.4 (byudjet) bilan.

### 4.5 Deploy

- `deploy/` va `backend/Dockerfile`: rasm yig'ishda `admins/` ham yig'iladi (`npm ci && npm run build --workspaces`), natija `backend/static/admins/…`.
- `deploy/Caddyfile`: `{$RESTO_ADMIN_HOST}` o'zgaruvchisi bo'sh bo'lmasa shu host `web-staff` ga yo'naltiriladi va `/ra` yo'li ham ishlayveradi; hash'li fayllar `immutable`.
- `.env.production.example`: `RESTO_ADMIN_HOST=` (bo'sh = faqat `/ra/`), izoh bilan.
- Qaytarish (rollback): `admin_ui=legacy`; yangi ilova qolaveradi, hech narsa buzilmaydi.

### 4.6 Seller sahifalarini ko'chirish tartibi

1. Menyu va 3D → 2. Xodimlar (yangi) → 3. Buyurtmalar → 4. Boshqaruv markazi → 5. Moliya → 6. Stollar → 7. Sozlamalar. Har bittasi tugagach: qabul testi, `admin_ui=new` da egasi uchun to'liq sinov, Claude tekshiruvi, keyin keyingisi. **Bir vaqtda ikki sahifadan ortiq ochiq ish yo'q.**

### 4.7 Byudjet va navigatsiya testlari

- `scripts/check_bundle_budget.mjs`: `backend/static/admins/resto/.vite/manifest.json` dan har chunk va qobiqning gzip hajmini o'lchaydi; 3.4 chegarasidan oshsa `exit 1` (CI ga ulanadi).
- API testlari (Django): har sahifa API uchun ruxsat, IDOR, sahifalash, soft-delete, idempotentlik, xato formati.
- Navigatsiya e2e (Claude brauzer orqali o'tkazadi; skript `scripts/e2e_resto_admin.mjs` Gemini yozadi): barcha sahifalarga ketma-ket o'tish, to'liq hujjat yuklanishlari soni = 1, har o'tishda API so'rovlari soni, "Orqaga" va yangilash.

---

## 5. Keyingi bosqichlar (faqat reja; alohida TZ bo'ladi)

| № | Bosqich | Kirish sharti | Natija |
|---|---|---|---|
| 2 | **Platforma qatlami:** `tenant` jadvali (Shop.public_id asosida), JWT (RS256, JWKS), master'dan «kirish havolasi» (bir martalik imzolangan token), DB sxemalari (`restaurant`, `market`, `studio`, `platform`), FK'larni ID'ga almashtirish, hodisalar (outbox) | 1-bosqich qabul qilindi | Ajratish poydevori |
| 3 | **Master admin ilovasi** (`admins/master`, `/api/platform/v1`): tenantlar, restoran yaratish/bloklash, bayroqlar, foydalanuvchilar/rollar, salomatlik, audit | 2-bosqich | Rul qismi |
| 4 | **Market-admin va Studio-admin** (xuddi shu andoza) | 3-bosqich | Qolgan mahsulotlar |
| 5 | **Jismoniy ajratish:** har xizmat alohida serverga; proksi upstream'lari | Trigger: tenantlar soni, bozor ishga tushishi, xavfsizlik yoki xarajat | Mustaqil serverlar |

**Tayyorgarlik qoidalari (hozirgi bosqichlarda ham amal qilinadi):**
1. Yangi kod boshqa mahsulot kodini import qilmaydi; mahsulotlar orasida faqat HTTP API va hodisalar.
2. Yangi jadvalda boshqa mahsulot jadvaliga `ForeignKey` qo'shilmaydi (faqat `tenant_id`/ID).
3. Hamma URL va hostlar konfigdan; SPA va API bitta origin'da (CORS kerak bo'lmasin).
4. Mahsulot ish vaqtida `X-Product` sarlavhasidan aniqlanmaydi (yangi kodda); deployable o'z sozlamasi (`DJANGO_PRODUCT`) bilan ishga tushadi.
5. Ichki xizmat chaqiruvlari uchun taymaut va qayta urinish qoidasi (aniq yozilgan), tenant konteksti, so'rov ID'si (`X-Request-ID`) har so'rovda.

---

## 6. Reverse proxy namunalari (hozir Caddy; nginx — keyinroq ko'chirish uchun)

```caddyfile
# Caddy: host bo'yicha
resto-admin.example.uz {
    encode zstd gzip
    @hashed path_regexp hashed ^/static/(admins|react)/.+-[A-Za-z0-9_-]{8}\.(js|css)$
    handle @hashed { root * /srv; header Cache-Control "public, max-age=31536000, immutable"; file_server }
    handle /static/* { root * /srv; file_server }
    reverse_proxy web-staff:8000
}
menu.example.uz { reverse_proxy web:8000 }
```

```nginx
# nginx: xuddi shu mantiq (kelajakda)
server {
    server_name resto-admin.example.uz;
    location ~ ^/static/.+-[A-Za-z0-9_-]{8}\.(js|css)$ { root /srv; expires 1y; add_header Cache-Control "public, immutable"; }
    location /static/ { root /srv; }
    location / { proxy_pass http://web-staff:8000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Request-ID $request_id; }
}
```

Ko'chirish: `web-staff:8000` → `10.0.0.12:8000` (boshqa serverda) — boshqa o'zgarish yo'q.

---

## 7. Topshirish va tekshirish

Eski TZ 7.2 tartibi bilan bir xil. Branch'lar: **admin va arxitektura ishlari — `feature/admin-menu-telegram`** (bu TZ ham, eski TZ'ning 1–3-bosqichlari ham); **Telegram (eski TZ 5–6-bosqich) — alohida `feature/telegram-miniapp`**, ikkalasi ham joriy `fix/restaurant-phase0-security` dan ochiladi. Gemini **bosqichma-bosqich** commit qiladi, push qilmaydi. Claude: diff, testlar (SQLite + PostgreSQL), `ruff`, `tsc -b` (har uch ish maydoni), byudjet skripti, brauzerda navigatsiya e2e (390/820/1440/1920 px), yuk o'lchovi (0.6, 0.7), so'ng GitHub'ga push. `main` ga faqat egasining buyrug'i bilan.

Bosqichlar ketma-ketligi (Gemini uchun): **eski TZ 1-bosqich → eski TZ 2-bosqich → bu TZ 0.1–0.5 → 0.6–0.7 → 1.0 → eski TZ 3-bosqich (model va API, yangi yo'l bilan) → 1.1–1.2 → 1.3 sahifalar 4.6 tartibida (har biri alohida commit) → eski TZ 5–6-bosqich (Telegram) parallel boshqa branch'da.**

---

## 8. Umumiy qabul mezonlari

1. Resto-admin ichida sidebar bosilganda **hujjat qayta yuklanmaydi**; faqat o'sha sahifa bo'lagi va API'si yuklanadi (3.4 byudjet).
2. Har sahifaning o'z URL'i, o'z API'si, o'z ruxsati bor; boshqa sahifa API'sini chaqirmaydi.
3. `admin_ui = legacy` da hamma narsa avvalgidek ishlaydi; `new` da egasi yangi ilovada ishlaydi; qaytarish bitta sozlama.
4. Seller sahifalari 0-bosqichdan keyin ham ishlaydi, lekin tashqi skriptlarsiz va keshlanadigan fayllar bilan tezroq.
5. Production restoran serverida `/djangoadmin/` yo'q (flag).
6. Mehmon yuki ostida KDS p95 ≤ 300 ms; menyu o'tkazuvchanligi ≥ 5×.
7. Barcha testlar SQLite va PostgreSQL'da yashil; yangi xatosiz `ruff`, `tsc -b`, `oxlint`.
8. Resto-admin kodida boshqa mahsulot yoki eski `NavigationContext` importi yo'q (qidiruv testi).
9. Hech narsa o'chirilmagan.

## 9. Qarorlar (standart qiymatlar bilan yozilgan; egasi o'zgartirishi mumkin)

| № | Qaror | Qabul qilingan standart |
|---|---|---|
| 1 | Avval qaysi admin | Restoran (sotuv uchun), keyin master (minimal) |
| 2 | Frontend yondashuvi | A: `admins/` monorepo, alohida SPA'lar |
| 3 | Kirish usuli (2-bosqich) | Master'dan imzolangan kirish havolasi, keyin JWT; 1-bosqichda Django sessiyasi |
| 4 | Jismoniy ajratish qachon | Trigger bilan (5-bosqich), hozir emas |
| 5 | Reverse proxy | Caddy (nginx'ga ko'chirish uchun 6-bo'lim) |
| 6 | Xodim qo'shish sahifasi | Qo'shildi (1.3), sotuv uchun zarur |

## 10. Xavflar

| Xavf | Qanday kamaytiriladi |
|---|---|
| Katta hajm, uzoq ish | Har sahifa alohida commit va qabul; 0-bosqich o'z-o'zidan foyda beradi |
| Eski va yangi o'rtasida farq (ikki joyda xato) | Raqamlar bitta funksiyadan (`today_summary`); testda ikkala panel solishtiriladi |
| Tailwind yig'ish skriptida sinf yo'qolishi (`content` skanerlashda dinamik sinflar) | Dinamik sinf nomlari `safelist` ga; `/seller/*` sahifalari skrinshot solishtiruvi (Claude) |
| `ManifestStaticFilesStorage` yo'qolgan fayl havolasida xato beradi | `collectstatic` va barcha shablonlarni render qiluvchi smoke test (`web/test_url_smoke.py` allaqachon bor) |
| Keshlangan menyu eskirgan narx ko'rsatadi | Signal orqali versiya oshadi; test: narx o'zgarsa ≤ 2 s |
| Yangi paket qo'shilishi | Faqat `react-router-dom` (va ixtiyoriy `drf-spectacular`), aniq versiya |
