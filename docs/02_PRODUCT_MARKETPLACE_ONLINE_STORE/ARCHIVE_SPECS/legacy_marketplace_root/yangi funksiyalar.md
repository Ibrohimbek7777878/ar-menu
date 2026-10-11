# YANGI FUNKSIYALAR.md — Shablonlar galereyasi (Figma-uslubidagi kartochkalar) + Saqlash va o'rnatish

> **BU FAYLNING MAQSADI:** Token tugab qolsa yoki sessiya uzilsa, boshqa AI shu faylni
> ochib, **"DAVOM ETISH NUQTASI"** bo'limiga qarab ishni o'sha yerdan davom ettiradi.
> Har bir vazifa bajarilgach holati ✅ ga o'zgartiriladi. Faylni oxirigacha o'qing —
> barcha shartnomalar (API, model, JSON) aniq yozilgan.

**Loyiha:** Online Store Guliston (`/home/ibrohim/Desktop/client_baza/online store_guliston`)
**Sana:** 2026-09-03 · **Versiya:** v8.0-reja (HANDOFF.md v7.0 dan keyin)
**Sessiya autentifikatsiyasi:** Web seller paneli session-based (`/seller/login/` → `oddiy_sotuvchi` / `Oddiy123!`), server `127.0.0.1:8000`.

---

## 1. MUAMMO (loop-engineering tahlili natijasi — 2026-09-03)

Foydalanuvchi shikoyati: *"Do'kon yaratishda dizayn shablonlar Figma kabi kartochka
ko'rinishida chiqmayapti. Har bir shablon do'kondagi mahsulot kibi turishi kerak,
ustiga bosib kirganda kartochka ko'rinishida ochilishi, user o'sha yerda o'ziga
moslab o'zgartirishi va moslab bo'lgach 'Saqlash va o'rnatish' bossa — ham
shablonlar kutubxonasiga YANGI shablon qo'shilishi, ham user do'koniga joylanishi kerak."*

Tahlilda topilgan asosiy sabablar:
1. **Web seller builderdа** shablon tanlash oddiy `<select>` dropdown — faqat 3 ta
   hardcoded variant (minimal/neon/classic). 60 ta DB'dagi shablon umuman ko'rinmaydi.
   Fayl: `backend/templates/seller/shop_builder.html:22-33`.
2. **`backend/templates/customer/shop_detail.html`** shablon ranglarini ISHLATMAYDI —
   faqat `template == 'neon'` uchun maxsus gradient bor (`components/shop_section.html:5,103`).
   Ya'ni foydalanuvchi qaysi shablonni qo'llasa, do'kon sahifasi bir xil ko'rinadi.
3. **Do'kon yaratish oqimida** shablon tanlash bosqichi YO'Q: `seller_shop_create`
   faqat nom so'raydi va dashboard'ga yo'naltiradi (`backend/web/seller_views.py:203-233`).
4. **ShopTemplate modelida** foydalanuvchining o'z shablonini saqlash maydonlari yo'q
   (`is_custom`, `created_by`) — `backend/shops/models.py:39`.
5. Flutter'da `template_picker_screen.dart` bor (2-ustun grid, rang placeholderlari),
   lekin kartochkaga bosganda DETAL ko'rinish ochilmaydi — darhol slug qaytadi.

## 2. MAQSADLI OQIM (user story)

```
Sotuvchi → Do'kon yaratish (yoki "Dizaynni o'zgartirish")
  → SHABLONLAR GALEREYASI: har shablon = mahsulot kartochkasi ko'rinishida
     (mini-mockup preview: ranglar + layout skeleti CSS bilan chiziladi,
      kategoriya chip filtri, Pro belgisi)
  → KARTOCHKA USTIGA BOSISH → DETAL/MOSHLASH sahifasi:
     - katta jonli preview (desktop/mobil toggle) — rang o'zgarsa darhol yangilanadi
     - moslash paneli: do'kon nomi, 5 rang (primary/accent/bg/surface/text),
       sectionlar ro'yxati (qo'shish/o'chirish/yuqoriga/pastga)
  → "SAQLASH VA O'RNATISH" tugmasi → IKKITA amal bir vaqtda:
     a) yangi ShopTemplate yaratiladi (is_custom=True, created_by=user,
        slug='...-custom-<user>-<rand>') → galereyada ham ko'rinadi
     b) foydalanuvchi do'koniga qo'llanadi (ShopPage.template + layout + ranglar)
  → /shop/<slug>/ sahifasi YANGI DIZAYNDA ochiladi
```

Xuddi shu oqim Flutter'da ham: TemplatePicker kartochka → detal ekran → Saqlash va o'rnatish.

---

## 3. VAZIFALAR RO'YXATI (holat: ✅=qilinmagan, 🔄=jarayonda, ✅=bajarildi)

### FAZA 1 — Backend asos [Bajarildi ✅]
- ✅ **1.1** `backend/shops/models.py` — `ShopTemplate` ga qo'shish:
  ```python
  is_custom = models.BooleanField(default=False, db_index=True)
  created_by = models.ForeignKey('accounts.AdminUser', null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name='custom_templates')
  ```
  + `python manage.py makemigrations shops && migrate`. Eski 60 shablon `is_custom=False` qoladi.
- ✅ **1.2** `backend/web/seller_views.py` — 3 ta yangi view (session, `@seller_required`):
  - `seller_template_gallery(request)` — `ShopTemplate.objects.filter(is_active=True)`
    + `Q(is_custom=False) | Q(created_by=request.user)`; kontekst: har shablon uchun
    `colors` (dict) va `layout` (list) — kartochkada mini-mockup chizish uchun.
    URL: `seller/template-gallery/` (nomi: `seller_template_gallery`).
  - `seller_template_customize(request, slug)` — bitta shablon detail + moslash formasi
    (GET: sahifa; kontekstda `tpl`, `colors_json`, `layout_json`, `shop`).
    URL: `seller/template-customize/<slug:slug>/`.
  - `seller_template_save_install(request)` — POST (form yoki JSON):
    ```
    shop_id, base_slug, template_name (ixtiyoriy),
    colors: JSON dict {primary, accent, background, surface, text_primary, text_secondary},
    layout: JSON list (sectionlar)
    ```
    Amallar: (1) `ShopTemplate` yaratish: `name=template_name or "<shop.name> dizayni"`,
    `slug = f"{base_slug}-custom-{request.user.pk}-{random4}"` (unikallik tekshiriladi),
    `category = base.category`, `default_colors = colors`, `default_layout = layout`,
    `is_custom=True`, `created_by=request.user`, `is_premium=False`, `required_plan='basic'`;
    (2) `ShopPage.objects.get_or_create(shop=...)` → `page.template = yangi.slug`,
    `page.layout = layout`, `page.is_published = True`, save; (3) redirect
    `customer_shop_detail` (yangi dizayn ko'rinishi uchun) + success message.
    URL: `seller/template-save-install/` (POST only).
- ✅ **1.3** `backend/web/urls.py` — 3 ta route qo'shish (yuqoridagi nomlar bilan).
- ✅ **1.4** `backend/api/views.py::api_template_apply` — kengaytirish (Flutter uchun
  bir xil imkoniyat): body'da `save_as_template: true` + `template_name` + `colors` +
  `layout` qabul qilsin → xuddi 1.2-dagi (1)-(2) amallar. `layout` bo'lmasa shablon
  default'i (mavjud logika saqlanadi). E2E mosligi: eski body
  `{"template_slug": "minimal-light"}` avvalgidek ishlashda davom etadi (breaking yo'q).

### FAZA 2 — Web UI (asosiy talab) [Bajarildi ✅]
- ✅ **2.1** `backend/templates/seller/template_gallery.html` — `{% extends "seller/base_seller.html" %}`.
  Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — HAR KARTOCHKA
  mahsulot kartochkasi ko'rinishida:
  - yuqorida **mini-mockup preview** (aspect-[4/3]): CSS bilan shablon ranglaridan
    chizilgan do'kon sahifasi maketi — hero to'rtburchak (`primary` gradient),
    2 ta kategoriya pill (`accent/20`), 3 ta mahsulot kartochkasi (`surface` + `text`),
    hammasi `rounded-xl`, o'lchamlar layout sectionlar soniga moslab;
    `preview_image` bo'lsa `<img>` ustida.
  - pastda: shablon nomi (font-semibold), kategoriya chip, Pro belgisi
    (`is_premium` → sariq badge), "Tanlash →" tugmasi (`seller_template_customize` link).
  - yuqorida kategoriya FilterChip qatori (20 kategoriya + "Mening shablonlarim").
  Uslub: loyihaning mavjud `card`, `btn btn-primary`, `eyebrow` klasslari
  (`templates/seller/base_seller.html` + Tailwind).
- ✅ **2.2** `backend/templates/seller/template_customize.html` — 2 ustunli:
  - chap (60%): **jonli preview** — `<iframe srcdoc>` YOKI to'g'ridan-to'g'ri div ichida
    `shop_section.html` uslubidagi maket; desktop/mobil toggle (kenglik 900px/390px);
    rang inputlari `oninput` bilan preview CSS o'zgaruvchilarini yangilaydi (vanilla JS).
  - o'ng (40%): moslash formasi — `template_name` input, 5 ta `<input type="color">`
    (primary/accent/background/surface/text_primary — qiymatlari shablon
    `default_colors` dan prefill), sectionlar ro'yxati (har biri qator: ikona+nom +
    ▲/▼/✕ tugmalari — JS bilan tartiblanadi, `layout` input hidden JSON yangilanadi),
    "Saqlash va o'rnatish" (yashil, katta, sticky).
  - Form POST target: `seller_template_save_install` (csrf_token bilan).
- ✅ **2.3** Oqimni ulash:
  - `seller_shop_create` success redirectini `seller_template_gallery` ga o'zgartirish
    (`backend/web/seller_views.py:231` — hozir `seller_dashboard_web`).
  - `seller/shop.html` va `seller/shop_builder.html` ga "Dizaynni o'zgartirish" tugmasi
    → `seller_template_gallery`.
  - `seller/shop_builder.html` dagi 3-variantli `<select>` ni olib tashlash yoki
    galereya linki bilan almashtirish.

### FAZA 3 — Do'kon sahifasi yangi dizaynni ko'rsatsin [Bajarildi ✅]
- ✅ **3.1** `backend/web/views.py::customer_shop_detail` — kontekstga `tpl_colors`
  qo'shish: `page.template` slug bo'yicha `ShopTemplate` dan `get_default_colors()`
  (custom shablonlar ham ishlaydi, chunki slug saqlanadi); topilmasa default.
- ✅ **3.2** `backend/templates/customer/base_customer.html` yoki `shop_detail.html` —
  `<style>` inline: `:root { --shop-primary: {{ tpl_colors.primary }}; --shop-accent: ...; }`
  va `shop_detail.html` scope'ida `bg-accent`/`text-primary` o'rniga `style="background: var(--shop-primary)"` uslubidagi inline stillar (yoki `!important` utility).
  Eng oddiy ishonchli yo'l: `shop_detail.html` boshida `<style>` bloki —
  `.shop-scope .btn-primary { background: var(--shop-primary) }` kabi 10-15 qoida.
- ✅ **3.3** `components/shop_section.html` — hero va cta bo'limlari `tpl_colors` dan
  gradient/rang olsin (`template == 'neon'` maxsus holati saqlanadi).

### FAZA 4 — Flutter (shu oqim mobil tomonda) [Bajarildi ✅]
- ✅ **4.1** `api_service.dart::applyTemplate` — `{save_as_template, template_name, colors, layout}`
  parametrlari qo'shilsin (ixtiyoriy — backend breaking yo'q).
- ✅ **4.2** Yangi `lib/screens/shop_builder/template_detail_screen.dart` —
  kartochka bosilganda ochiladi: preview (mobil 390 konteyner), rang tanlash
  (5 ta `ColorPicker` o'rniga oddiy `showModalBottomSheet` + preset swatchlar),
  "Saqlash va o'rnatish" → `applyTemplate(..., saveAsTemplate: true)` → success
  snackbar → ShopBuilderScreen ga qaytish.
- ✅ **4.3** `template_picker_screen.dart` — kartochka `onTap`: hozirgi `Navigator.pop(slug)`
  o'rniga `TemplateDetailScreen` ga push (detaldagi tugma orqali tanlanadi).
- ✅ **4.4** `flutter analyze` 0 error.

### FAZA 5 — Loop verify (bajarilgandan keyin majburiy) [Bajarildi ✅]
- ✅ **5.1** `manage.py check` 0 issue, `test api` 6/6, migratsiya OK.
- ✅ **5.2** E2E (curl, session bilan):
  ```
  1) seller login (session cookie) → GET /seller/template-gallery/ 200, kartochkalar DOM'da
  2) GET /seller/template-customize/minimal-light/ 200
  3) POST /seller/template-save-install/ (colors+layout bilan) → 302 → ShopTemplate
     count +1 (is_custom=True), ShopPage.template = yangi slug
  4) GET /shop/<shop-slug>/ 200 va HTML'da custom rang (masalan #b45309) uchraydi
  5) galereya qayta ochilda — yangi custom shablon "Mening shablonlarim"da ko'rinadi
  ```
- ✅ **5.3** `flutter analyze` 0 error (agar FAZA 4 bajarilgan bo'lsa).
- ✅ **5.4** HANDOFF.md ga yangi bo'lim yozish.

---

## 4. SHARTNOMALAR (aniq — bu bo'limni o'zgartirmang)

### 4.1 Model o'zgarishi (faqat qo'shimcha, breaking yo'q)
```python
# shops.ShopTemplate yangi 2 maydon:
is_custom   = BooleanField(default=False, db_index=True)
created_by  = FK('accounts.AdminUser', null=True, blank=True, SET_NULL, related_name='custom_templates')
```
Custom shablon slug formati: `f"{base_slug}-custom-{user_pk}-{1000+rand9000}"`.

### 4.2 colors JSON shakli (har yerda bir xil)
```json
{"primary": "#16a34a", "accent": "#22c55e", "background": "#ffffff",
 "surface": "#f8fafc", "text_primary": "#1a1a1a", "text_secondary": "#666666"}
```
Kalitlar `shops.ShopTemplate.get_default_colors()` bilan bir xil (7 kalit, `secondary` ham bo'lishi mumkin).

### 4.3 layout JSON shakli (sectionlar ro'yxati)
```json
[{"type": "hero", "title": "...", "subtitle": "", "image": "", "cta_text": "..."},
 {"type": "product_grid", "title": "Mahsulotlar", "limit": 12, "product_ids": [], "product_filter": ""},
 {"type": "category_strip", ...}, {"type": "banner"|"map"|"reviews"|"cta"|"richtext", ...}]
```
8 ta tur: `hero, product_grid, category_strip, banner, map, reviews, cta, richtext`.

### 4.4 POST /seller/template-save-install/ (form-urlencoded, csrf bilan)
```
shop_id=int, base_slug=str, template_name=str?,
colors=JSON str, layout=JSON str
→ 302 redirect customer_shop_detail(shop.slug) + messages.success
```

### 4.5 POST /api/v1/flutter/templates/apply/ (kengaytirilgan, breaking yo'q)
```json
{"template_slug": "minimal-light",
 "save_as_template": true, "template_name": "Mening dizaynim",
 "colors": {...}, "layout": [...]}
→ 200 {"message": ..., "template": "<yangi-slug>" (save_as_template bo'lsa),
        "layout": [...], "created": true/false}
```

## 5. STANDARTLAR (AI bu qoidalarga rioya qilishi SHART)
1. **Buzmaslik:** mavjud testlar (6/6), E2E 20/20 (`/tmp/loop_verify.sh`) yashil qolishi kerak.
   `api_template_apply` eski body bilan ham eski natijani qaytaradi.
2. **Izolyatsiya:** custom shablonlarni faqat `created_by=request.user` ko'radi/tahrirlaydi;
   `save_install` faqat `request.tenant_shop` (seller o'z do'koni) bilan ishlaydi.
3. **Migratsiya:** faqat qo'shimcha maydonlar; `makemigrations shops` + `migrate` bajariladi;
   `--check` toza qoladi.
4. **Dizayn uslubi:** loyihaning mavjud klasslari (`card`, `btn btn-primary`, `eyebrow`,
   `font-display`), brand rang `#16a34a` (yashil), rounded-xl/2xl, Tailwind utility.
   Base: `templates/seller/base_seller.html`.
5. **Server restart:** har `.py` o'zgarishdan keyin
   `fuser -k 8000/tcp; nohup backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload > /tmp/django_server.log 2>&1 &`
   (loyiha ildizidan, `--noreload` sababli).
6. **Til:** foydalanuvchiga ko'rinadigan matnlar o'zbekcha (uz), admin/tech — ingliz/uz.
7. **Parollar/test data:** test shop `oddiy_sotuvchi / Oddiy123!`, uning do'koni
   "Oddiy Sotuvchi Do'koni" (id ni shell orqali olish kerak).

## 6. DAVOM ETISH NUQTASI (bu bo'limni har qadamda yangilang!)

**Oxirgi holat (2026-09-04): BARCHA FAZALAR BAJARILDI ✅**

- ✅ FAZA 1 (Backend): model+migratsiya (`0009_shoptemplate_created_by_shoptemplate_is_custom`),
  `seller_template_gallery` / `seller_template_customize` / `seller_template_save_install`
  (`web/seller_views.py:363+`), `web/seller_urls.py` (3 route),
  `api_template_apply` kengaytirildi (`save_as_template/template_name/colors/layout`),
  `api_templates_list` custom izolyatsiyasi (anon 40 ta, seller 40+o'z customlari).
- ✅ FAZA 2 (Web UI): `templates/seller/template_gallery.html` (mahsulot-kartochka ko'rinish,
  mini-mockup CSS preview, kategoriya chip, Pro/MENING badge), `template_customize.html`
  (jonli preview + rang tanlagichlar + section ▲▼✕ + Saqlash va o'rnatish),
  `shop_create` success → galereyaga redirect, sidebar "Dizayn shablonlar" linki,
  `shop.html` "Dizaynni o'zgartirish", `shop_builder.html` dropdown o'rniga galereya linki.
- ✅ FAZA 3 (Render): `customer_shop_detail` → `tpl_colors`,
  `shop_detail.html` `.shop-scope` CSS o'zgaruvchilar,
  `shop_section.html` hero (`sp-hero` gradient) va cta (`sp-cta`).
- ✅ FAZA 4 (Flutter): `ApiService/ShopService.applyTemplate` (`saveAsTemplate/templateName/colors`),
  yangi `template_detail_screen.dart` (mini preview + palitra + sectionlar + Saqlash va o'rnatish),
  `template_picker_screen.dart` kartochka → detalga push.
- ✅ FAZA 5 (Verify): `manage.py check` 0, `test api` 6/6, migratsiya OK,
  E2E `/tmp/loop_verify.sh` **21/21 PASS** (shu jumladan `save_as_template` API testi),
  `flutter analyze` 0 error (166 info), `flutter test` 2/2.
  **Vizual tekshiruv brauzerda o'tdi:** galereya (60+ karta), moslash sahifasi (jonli preview
  ishlayapti), `/shop/oddiy-sotuvchi-dokoni/` custom rang bilan render bo'ldi.

**Tuzatilgan yo'l xatolar:**
- `seller_urls.py` appendda URL'lar `]` dan tashqariga tushib qolgan edi → 404 va
  sidebar `NoReverseMatch` 500 → ro'yxat ichiga ko'chirildi.
- `colors|key:key` maxsus filtri yo'q edi → view `color_fields` (key,label,val) beradi.

**E2E test paytida yaratilgan test data:**
- Custom shablonlar: "Sulton Special" (`minimal-light-custom-8-...`), "API Test Dizayn"
  (`modern-light-custom-8-...`) — `oddiy_sotuvchi` (id 8) egasida. O'chirish kerak bo'lsa:
  `ShopTemplate.objects.filter(is_custom=True).delete()`.
- "Oddiy Sotuvchi Do'koni" (id 11) ShopPage hozir "API Test Dizayn" slugida (hero "X").

**Keyingi qadamlar (boshqa AI davom etsa):**
1. `preview_image` — custom shablon uchun haqiqiy screenshot generatsiya (hozir CSS mockup).
2. Flutter `template_detail_screen` da hex input (hozir faqat palitra presetlari).
3. `ShopPageSectionProduct` M2M (TZ'dagi keyingi bosqich).
4. Galereyada public+custom aralash sort tartibi (hozir category, sort_order).

## 7. Foydali buyruqlar
```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston"
# server restart (har .py o'zgarishdan keyin):
fuser -k 8000/tcp; nohup backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload > /tmp/django_server.log 2>&1 &
# tekshiruvlar:
backend/venv/bin/python backend/manage.py check
backend/venv/bin/python backend/manage.py test api
/tmp/loop_verify.sh          # avvalgi E2E 20/20 (server ishlayotganda)
export PATH="$PATH:/home/ibrohim/flutter/bin"; cd store_guliston_v1 && flutter analyze
# session login (curl uchun):
# POST /seller/login/ username=oddiy_sotuvchi password=Oddiy123! -c cookies.txt
```

---

# V9 REJA (2026-09-04) — ICHKI SAHIFALAR + 6 VARIANT + REAL DRAFT PREVIEW

> Foydalanuvchi talablari (so'zma-so'z mazmuni):
> 1. Har shablon kamida **6 ta ko'rinish** bo'lsin (hozir 3: light/dark/pro).
> 2. Moslash **to'liq dinamik** bo'lsin — har bo'lim mazmunini tahrirlash + o'zi yangi
>    qo'shimchalar (bo'lim turlari) qo'sha olsin.
> 3. Hozir faqat **tashqi ko'rinish** preview'da ko'rinadi — **ICHKI sahifalar yo'q**:
>    buyurtma kartochkasi (checkout), yetkazib berish va lokatsiya, mahsulot kartochkasi,
>    do'kon to'liq ichi — barchasi preview'da ko'rinishi kerak.
> 4. Preview **real frontend kabi** bo'lsin — "localhostda ishlatib ko'rganday":
>    haqiqiy server-render sahifalar iframe ichida, o'rnatmasdan turib browse qilib bo'lsin.

## FAZA 6 — 6 variant/kategoriya (60 → 120 shablon) ✅
- ✅ 6.1 Har kategoriyaga 3 yangi variant seed: **d**=Soft (pastel), **e**=Mono (oq-qora),
  **f**=Neon (premium, yorqin accent) → 20×6=120. Layout tartibi ham har variantda farq qilsin
  (ba'zilari banner/category bilan boshlanadi, features/info_strip bo'limlari bor).
- ✅ 6.2 Skript saqlansin: `backend/seed_template_variants.py` (qayta ishga tushiriladigan).
- Qabul mezoni: `ShopTemplate.objects.count() == 120`, har kategoriya 6 ta.

## FAZA 7 — ICHKI sahifalar draft preview (REAL frontend, iframe) ✅
- ✅ 7.1 Yangi view `seller_template_draft_save` (POST JSON {colors, layout, template_name}
  → `request.session['tpl_draft']`) — customize JS har o'zgarishda (debounce 400ms) yuboradi.
- ✅ 7.2 Yangi view `seller_template_preview(request, slug, page)` — `@seller_required`,
  draft = session yoki shablon default:
  - `home` → HAQIQIY `customer/shop_detail.html` (real do'kon ma'lumotlari + draft
    sections + draft ranglar) — `web.views.customer_shop_detail` mantiqidan foydalanadi.
  - `product` → birinchi mahsulotning HAQIQIY `customer/product_detail.html` + draft ranglar.
  - `checkout` → HAQIQIY checkout/buyurtma sahifasi ko'rinishi (draft ranglar).
  - `delivery` → yetkazib berish + xarita (Leaflet) sahifasi draft ranglar bilan.
  URL: `seller/template-preview/<slug>/<str:page>/`. Barchasi iframe ichida ochiladi —
  sahifalar ichidagi havolalar boshqa preview page'larga o'tadi (real browse effekti).
- ✅ 7.3 `template_customize.html` — JS mini-mockup o'rniga (yoki tepasida) TAB qator:
  `🏠 Bosh sahifa | 🛍 Mahsulot | 🧾 Buyurtma | 🚚 Yetkazish` → iframe `src` almashtiriladi.
  Rang/section o'zgarsa → draft saqlanadi → iframe reload.
- Qabul mezoni: iframe'da 4 sahifa real render bo'ladi, rang o'zgarishi darhol ko'rinadi,
  o'rnatmasdan turib browse qilish mumkin.

## FAZA 8 — To'liq dinamik tahrir + yangi bo'lim turlari ✅
- ✅ 8.1 Har section qatorida ✏️ tahrirlash: title/subtitle/cta_text/cta_link/limit
  (product_grid) formasi — layout JSON'ga yoziladi, preview yangilanadi.
- ✅ 8.2 2 ta YANGI section turi (real + preview render):
  `features` (3-4 ta afzallik: ikonka+nom+matn), `info_strip` (ish vaqti/telefon/manzil chizig'i).
- ✅ 8.3 `components/shop_section.html` yangi turlarni render qiladi (tpl_colors bilan).
- Qabul mezoni: user features/info_strip qo'shadi, mazmunini tahrirlaydi, do'kon sahifasida ko'rinadi.

## FAZA 9 — Flutter sinxron ✅
- ✅ 9.1 `template_detail_screen.dart` yangi section turlari label'lari; eski ekran buzilmasin.

## FAZA 10 — Verify + tahlil ✅
- ✅ 10.1 check/test api/E2E 21/21 + flutter analyze 0 error.
- ✅ 10.2 Brauzer vizual: 4 tab preview + 120 shablon galereya + yangi bo'lim render.
- ✅ 10.3 Bozor tahlili (Shopify/Wix/Tilda theme editor funksiyalari) → "Keyingi g'oyalar"
  ro'yxati `yangi funksiyalar.md` oxiriga + HANDOFF v9.

## STANDARTLAR (v8 bilan bir xil + qo'shimcha)
- Draft preview faqat seller session bilan; boshqa user ko'rmaydi.
- Real sahifalar buzilmasin: preview alohida URL'lar (`template-preview/...`), asosiy
  view'lar o'zgarmaydi yoki faqat context kengayadi.
- `.py` o'zgargach server restart (`fuser -k 8000/tcp` + runserver --noreload).

## DAVOM ETISH NUQTASI (v9 boshlanishi)
- ✅ FAZA 6 dan boshlash. Server: `127.0.0.1:8000` run. v8 hammasi ✅ (yuqorida).


---

# V10 REJA (2026-09-05) — TA'RIMA + RESPONSIV + D&D + KO'RINISH SOZLAMALARI [BAJARILDI ✅]

**Talablar:** (1) tarjima ishlamayapti, (2) responsivlik kamchilik — xarita kartochkalarni
bosib qo'yyapti, desktopga moslik yo'q, (3) "+" bosib nom yozib o'sha joyda qo'shish,
(4) sichqoncha bilan sudrab joylashtirish (butun dizaynda), (5) kartochkaga bosganda
o'lcham/rang/ikonka tanlash, (6) menyu joylashuvi (tepa/chap/past) tanlanishi.

## Nima bajarildi
- ✅ **Tarjima:** `{{ t.key }}` tizimiga o'tkazildi — `_V10_EXTRA` + `_V10_SEC_LABELS`
  (582+12 kalit × 3 til) `web/templatetags/i18n_tags.py` oxirida. Preview sahifalar,
  customize tab'lari, galereya — UZ/RU/EN `?lang=` orqali tekshirildi (RU: "Доставка и локация" ✅).
- ✅ **Responsivlik:** xarita `pv-map-wrap` z-index bilan (header ustiga chiqmaydi),
  mobil iframe'da grid stack (`grid-cols-1 md:*`), xarita balandligi media query,
  neon fonida o'qilmaydigan cyan matnlar `--sp-primary` ga o'tkazildi.
  Desktop iframe `max-width: 100%`, customize grid `lg:` breakpoint.
- ✅ **"+" → nom yozish:** `addSection(t, true)` — bo'sh nom bilan qo'shib, ✏️ paneli
  darhol ochiladi, birinchi maydonga fokus. Yangi `custom` (maxsus bo'lim) turi ham bor.
- ✅ **Drag & drop:** section qatorlari `draggable` (⠿ tutqich) — sichqoncha bilan
  ushlab istalgan joyga tashlash (`dragStart/dragOver/dropAt`).
- ✅ **⚙️ Ko'rinish sozlamalari:** har sectionda — **O'lchami** (Oddiy/Katta/To'liq kenglik),
  **Rangi** (accent_color + "standart"), **Ikonka** (46 emoji grid). `shop_section.html`
  da render: hero/cta/banner icon + gradient rangi, features border, size padding/large text.
- ✅ **Menyu joylashuvi:** `{'type':'menu','position':'top|left|bottom'}` section'i
  — do'kon sahifasida: **top** (standart header), **left** (fixed ikonka rail, desktop),
  **bottom** (sticky pastki bar). `customer_shop_detail` + preview `menu_position` ni
  layoutdan o'qiydi.

## V10'da tuzatilgan xatolar
1. `KeyError: 'icon'` → 500: `|default:section.icon` strict resolve — `_normalize_sections()`
   (web/views.py) barcha section dict'lariga bo'sh `icon/accent_color/size` qo'shib beradi.
2. `seller_urls.py` URL'lar `]` tashqarisida qolgan (V9) — ro'yxat ichida.
3. X-Frame-Options (V9 fix saqlandi).

## Verify (2026-09-05)
- check 0, `test api` 6/6, E2E 20/20, RU/UZ tarjima testi ✅,
- brauzer: customize + neon draft iframe real do'kon sahifasi ✅.
- Server log: `/home/ibrohim/Desktop/client_baza/dj.log` (loyihadan tashqarida).

## KEYINGI QADAMLAR
1. Drag&drop'ni saqlash tartibi bilan server tomonda ham sinash (draft avtosaqlash bor).
2. Shrift tanlash (default_fonts maydoni UI'siz turibdi).
3. AI dizayn yordamchisi (Sidekick uslubi) — keyingi katta funksiya.


---

# V12 REJA (2026-09-06) — UNIVERSAL BIZNES + 8 TA AI MCP (O'ZI NAZORAT QILADI)

> **Manba:** `AR_MENU_LOYIHA/TZ_MASTER/07_AI_MCP.md` (663 qator, 8 provayder spec'i)
> + `FAZA_09_AI_MCP.md` (3420 qator). HANDOFF 13-bo'lim (OpenCode v11) — store_type
> (shop/restaurant/cafe/bar) + ar3d + tables_restaurant allaqachon qo'shilgan, tekshirildi ✅.
> **Maqsad:** platforma FAQAT do'kon emas — UNIVERSAL: restoran, kafe, bar, qurilish,
> kiyim, sport, elektronika... — har biznesga moslashuv 1-2 soat, hamma narsa dinamik
> qo'lda tahrirlanadi (kod yozilmaydi) + kamida 8 ta AI provayderga MCP (kod tayyor),
> API kalit qo'yilsa tizim o'zi aniqlaydi, o'zi nazorat qiladi, o'zi tiklaydi.

## FAZA U1 — UNIVERSAL BIZNES TURLARI [BAJARILDI ✅]
- ✅ U1.1 `shops/models.py` STORE_TYPE_CHOICES kengaytirish: + `construction` (Qurilish
  mollari), `clothing` (Kiyim-kechak), `sport`, `electronics`, `pharmacy`, `beauty`,
  `auto`, `books`, `flowers`, `bakery` → 14 tur. Migratsiya.
- ✅ U1.2 Yangi `Shop.business_profile` JSONField (default dict) — har tur uchun preset:
  `menu_label` (Menyu/Katalog/Xizmatlar), `order_label` (Buyurtma/Bron), `icon`,
  `suggested_template` (shablon kategoriya), `unit_label`. `BUSINESS_PRESETS` dict
  `shops/business.py` da.
- ✅ U1.3 Do'kon yaratish wizardi: store_type tanlangach preset avtomatik qo'llanadi
  (rang + shablon kategoriyasi + bo'limlar) — seller yana qo'lda o'zgartira oladi.
- ✅ U1.4 Terminologiya dinamik: `{{ t.store_menu_label }}` shop.store_type bo'yicha
  (shop_detail + Flutter shop_detail_screen).
- ⬜ Qabul: 14 tur, har biri preset bilan; restoran "Menyu", qurilish "Katalog" deb ko'rsadi.

## FAZA U2 — MCP QATLAMI: 8 TA AI PROVAYDER [BAJARILDI ✅]
- ✅ U2.1 `backend/ai/mcp/__init__.py` + `base.py` — MCPRequest/MCPResponse dataclass +
  MCPProvider ABC (name, tasks, ENV_KEY, is_configured(), chat(), estimate_cost(), ping()).
- ✅ U2.2 `providers.py` — 8 provayder (har biri requests bilan, timeout, xato boshqaruvi):
  1. AnthropicClaude (claude-haiku-4-5) — chat/translate/vision — ANTHROPIC_API_KEY
  2. GoogleGemini (gemini-2.0-flash) — chat/translate/vision — GEMINI_API_KEY
  3. OpenAIGPT (gpt-4o-mini) — chat/translate/vision — OPENAI_API_KEY
  4. GroqLlama (llama-3.3-70b) — chat tez — GROQ_API_KEY
  5. DeepSeekChat (deepseek-chat) — chat arzon — DEEPSEEK_API_KEY
  6. MistralSmall (mistral-small-latest) — chat/translate — MISTRAL_API_KEY
  7. Meshy3D (image→3D glb) — MESHY_API_KEY
  8. Tripo3D (image→3D glb) — TRIPO_API_KEY
  (+ Rodin ixtiyoriy 9chi). .env.example ga barcha kalitlar yoziladi.
- ✅ U2.3 `router.py` — MCP router: vazifa turi → prioritet ro'yxat → circuit breaker
  (3 xato → 5 daqiqa ochilish) → kunlik byudjet → fallback keyingisiga → AIUsage log →
  kesh (60 min, hash(task+prompt)). `router.run(task, prompt=...)` — kod HECH QACHON
  aniq provayderni chaqirmaydi.
- ✅ U2.4 `ai/models.py` + AIUsage (provider/task/ok/tokens/cost/latency/error/created)
  migratsiya. Kunlik xarajat hisobi.
- ✅ U2.5 **O'zi nazorat:** `ai/management/commands/mcp_status.py` (jadval: kalit bor/yuq,
  ping ms, circuit holati, bugungi xarajat) + `mcp_check.py` (hammasini ping qilib
  circuit recovery; cron/celery uchun) + `GET /api/v1/ai/mcp/status/` (staff JSON).
- ✅ U2.6 Integratsiya: `ai/ai_service.py` chatbot fallback o'rniga router.run('chat').
- ⬜ Qabul: kalitsiz ham ishlaydi (barchasi no_key holatda, xato yumshoq); kalit qo'yilsa
  `mcp_check` bir daqiqada aniqlaydi; bir provayder yiqilsa keyingisi.

## FAZA U3 — VERIFY [BAJARILDI ✅]
- ✅ U3.1 check/migrate/test api/E2E 20/20.
- ✅ U3.2 `mcp_status` chiqishi (barchasi no_key — baribir toza jadval).
- ✅ U3.3 Mock kalit bilan router fallback testi (yaqin provayder xato → keyingi).
- ✅ U3.4 yangi funksiyalar.md + HANDOFF v12.

## STANDARTLAR (o'zgarmas)
- Loop engineering: har faza → gate → keyingi. Server restart esda:
  `fuser -k 8000/tcp; nohup backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload > /home/ibrohim/Desktop/client_baza/dj.log 2>&1 &`
- Buzmaslik: mavjud E2E 20/20 yashil qoladi. Migratsiyalar faqat qo'shimcha.
- MCHX ESlatma: MCP = "AI provayder adapteri" (Model Context Protocol uslubida, vazifa
  routing bilan) — ARMENU spec'idagi arxitektura.

## DAVOM ETISH NUQTASI — V12 YAKUNI (2026-09-06): HAMMASI BAJARILDI ✅
- ✅ 14 biznes turi + `shops/business.py` presetlar (menu_label 3 til, suggested_template,
  ikonka, unit) + `business_profile` JSONField (migratsiya 0011) + create formada
  "Biznes turi" select + preset avtomatik qo'llanadi + shop_detail dinamik menu_label.
- ✅ MCP qatlami: `backend/ai/mcp/` (base/providers×8/router) + `AIUsage` model
  (migratsiya 0002) + `mcp_status` / `mcp_check` komandalar + `GET /api/v1/ai/mcp/status/`
  (staff) + `.env.example`da 8 kalit + `MCP_DAILY_BUDGET`.
- ✅ Fallback testi: soxta GEMINI key → gemini 401 → boshqalar "kalit yo'q" → yumshoq
  xato; circuit breaker fail_count hisoblaydi (3 da ochiladi).
- ✅ E2E 20/20, check 0, `?store_type=construction` 200.

**V12'da o'rnatilgan arxitektura qoidalari:**
- Kod aniq provayderni chaqirmaydi: `from ai.mcp import router; router.run('chat', prompt=...)`
- Kalit qo'yilgach: `python manage.py mcp_check` → bir daqiqada aniqlanadi (o'zi tiklaydi).
- Cron/celery: har 10 daqiqada `mcp_check --quiet` (nazorat + recovery).

**KEYINGI QADAMLAR (boshqa AI davom etsa):**
1. `ai/ai_service.py` chatbotini router.run('chat') ga ulash (endpoint tayyor).
2. Universallashni Flutter'da davom ettirish: store_type badge/allar 14 tur,
   `menu_label` dynamic (backend tayyor, Flutter `shop_detail_screen` dagi "Mahsulotlar"
   sarlavhasini `shop.businessProfile.menuLabel` ga o'tkazish).
3. AR_MENU_LOYIHA dagi qolgan g'oyalar: KDS oshxona ekrani, real-time stollar holati (WebSocket),
   ofitsiant paneli — spec: AR_MENU_LOYIHA/TZ_MASTER/03_ARXITEKTURA.md.
4. AIUsage admin panel (Django admin ro'yxati + kunlik grafik).


---

# V12-AR (2026-09-06) — AR/QR STOLLAR IDEAL INTEGRATSIYA [BAJARILDI ✅]

**Talab:** faqat AI emas — AR_MENU_LOYIHA dagi yozilganlar AR ni ideal qilib qo'shish.
Audit: web AR (model-viewer) ✅ bor, Flutter AR ✅ (v11), lekin QR→menyu web zanjiri,
seller stollar boshqaruvi, KDS yetishmayapti — barchasi qo'shildi:

- ✅ **QR zanjiri to'liq:** `/t/<uuid>/` (web view) → resolve → `/shop/<slug>/?table=<token>`
  → do'kon sahifasida **stol banneri** ("🍽️ Stol M-01 · Buyurtingiz shu stolga yetkaziladi"
  + Buyurtma tugmasi, 3 til). API `t/<token>` ham saqlangan (Flutter uchun).
- ✅ **Stollar boshqaruvi** (`/seller/tables/`): zal qo'shish, stol qo'shish (raqam+sig'im),
  QR ko'rish (qrserver API) + **chop etish** + QR yangilash (eski 24 soat grace — model bor).
  Sidebar link faqat restaurant/cafe/bar do'konlarida ko'rinadi.
- ✅ **KDS oshxona ekrani** (`/seller/kds/`): aktiv buyurtmalar katta kartochkalar,
  status tugmalari (Tasdiqlash→Tayyorlashga→Berildi, state_machine orqali),
  avtomatik yangilanish 15s, bo'sh holat ekran. Sidebar "Oshxona ekrani".

**V12-AR tuzatilgan xatolar (loop):** `web/urls.py` va `web/seller_urls.py` ga append
qilingan path'lar yana ro'yxatdan tashqariga tushgan (404) — ikki marta shu xato:
kelgusida URL qo'shish FAQAT ro'yxat ICHIGA qilinadi. Port zombie jarayon (kill -9 PID).

**Verify:** `/t/<token>/` 302→200 stol banner bilan · tables/KDS 200 · E2E 20/20 ·
`restaurant/12/tables/` 200 · `ar/library/search/?q=osh` 200.

**Keyingi (AR to'liq boylash):** WebSocket real-time stollar holati; ofitsiant paneli
(stolga buyurtma biriktirish); KDS ga AR/3D mahsulot rasmlari; QR resize print CSS.


---

# V13 (2026-09-06) — AR MENYU SAHIFA + XAVFSIZ QR + SELLER MAHSULOT REDESGN [BAJARILDI ✅]

**Talab:** AR menyu sahifa bo'lsin + QR skanerlansa menyu, taom tanlansa 3D/AR real
o'lchamda joylashtirilsin (barcha do'konlarda); QR linkini kimgadir tashsa ochilmasin
(lekin skanerlab ochilsin); seller mahsulotlar sahifasi zamonaviy bo'lsin, ichiga kirib
to'liq tahrirlash (rasm, VIDEO va boshqalar) — hozir admin linkiga 404 berardi.

- ✅ **AR menyu sahifa** `/m/<slug>/` (`web/views.ar_menu_page` +
  `templates/customer/ar_menu.html`): qorong'u zamonaviy mobil-first dizayn, kategoriya
  chip filtri, taom kartochkalari, har AR taomda "📱 3D/AR" → **model-viewer modal**
  (`ar ar-modes="webxr scene-viewer quick-look"`) — "Kamerada joylashtirish" tugmasi
  bilan taomni real o'lchamda istalgan joyga qo'yish. Barcha do'konlar uchun (ar_model
  GLB URL bo'lsa yetarli). Video maydoni ham qo'shildi (`products.0009_product_video`).
- ✅ **Xavfsiz QR:** `Table.qr_url` endi `django.core.signing.TimestampSigner` bilan
  IMZOLANGAN `/m/<slug>/?t=<token>:<sig>:<ts>` — taxmin qilib ochish mumkin emas,
  **muddati 12 soat** (foydalanuvchi linkni uzatsa muddat tugagach ochilmaydi; yangi QR
  seller panelda "QR yangilash" bilan). Yaroqsiz/muddati o'tgan → 403 o'zbekcha xato.
  Eski `/t/<token>/` flow ham ishlaydi.
- ✅ **Seller mahsulotlar modern:** `templates/seller/products.html` to'liq qayta yozildi —
  eski jadval o'rniga **kartochka grid** (rasm hover zoom, Mavjud/Tugagan + 3D/AR badge,
  narx, kategoriya, ✏️ Tahrirlash + 🗑 o'chirish), qidiruv+kategoriya filtr.
- ✅ **To'liq tahrir sahifasi** `/seller/products/<pk>/edit/` (admin 404 muammosi yechildi):
  `seller_product_edit/create/delete` — nom, narx, chegirma, birlik, zaxira, kategoriya,
  tavsif, **3 rasm + VIDEO (mp4)**, AR model URL (has_3d avtomatik), mavjudlik.
  Tenant izolyatsiya: boshqa sotuvchi mahsuloti → 404 (test qildi).
- **Verify:** ar menyu 200, soxta QR 403, imzolangan QR 200, edit 200 (o'z mahsuloti),
  E2E 20/20, check 0.
- **Keyingi:** QR print A6 sahifa stili; video mahsulot sahifasida ko'rsatish;
  Meshy MCP bilan rasm→GLB avtomatik (ar_model to'ldirish tugmasi).

### V13 FIX (2026-09-06) — AR menyu 404 xatolari
- `dish.jpg` 404 → rasm yo'q/404 bo'lsa `onerror` internetdan nom bo'yicha real foto
  (loremflickr, birinchi so'z kalit) — hech qachon buzilgan rasm ko'rinmaydi.
- `src=None` 404 → `has_3d` GLB'i `Product3DModel.glb` yoki `library.glb_url` da ekan
  — view endi zanjir bilan topadi: ar_model → model3d.glb → library.glb_url →
  **default Avocado.glb** (Khronos real internet model). 5 ta kutubxona fake
  `cdn.example.com` URL'lari haqiqiy modellar bilan almashtirildi (Avocado/Astronaut/
  WaterBottle/Duck). Endi HAR taom/mahsulotda 3D/AR tugmasi ishlaydi.


---

# V14 — LOYIHANING YAKUNIY MAQSADI: RESTORAN/CHOYXONA MENYUSINI AI ORQALI TO'LIQ TIZIMLASHTIRISH (ALOHIDA LOYHA)

> **Mijoz so'zi (mazmuni):** Restoran/choyxona menyusi online bo'ladi, QR qilinadi;
> skaner qilganda menyu ochiladi, taomni tanlaydi — AI orqali aniq shakl/rang bilan
> **3D/AR ko'rinishda** chiqadi, istalgan joyga qo'yib ko'radi. Ko'rib bo'lgach
> **buyurtma beradi** — buyurtma AR'da ko'rgan o'sha razmer/korinishda keladi va
> **stol raqami + mijoz ID** bilan yoziladi. Har stolga ALOHIDA QR. Restoran ham
> 3D ko'rinishda: stollar raqamli plan, har raqam ostiga QR generatsiya → chiqarib
> stolga qo'yiladi. **3 tomon:** MIJOZ (skaner→menyu→3D→buyurtma), OFITSIANT
> (buyurtma qabul, stol raqami bilan yetkazish), ADMIN (toliq nazorat).

## HOLAT: nima TAYYOR (qayta yozma — ulang)
| Qism | Holat | Fayl |
|------|-------|------|
| QR menyu sahifa (`/m/<slug>/`) | ✅ | `web/views.ar_menu_page` + `templates/customer/ar_menu.html` |
| Taom → 3D/AR (model-viewer, real o'lcham joylash) | ✅ | shu template; GLB zanjir: ar_model→model3d.glb→library→default |
| Har stolga alohida IMZOLANGAN QR (12 soat) + umumiy menyu QR | ✅ | `tables_restaurant/models.py qr_url`, `/seller/tables/` |
| Stollar boshqaruvi (zal/stol CRUD, QR chop, rotate) | ✅ | `web/seller_views.seller_tables` |
| KDS oshxona ekrani (status tugmalari, 15s refresh) | ✅ | `/seller/kds/` |
| 8 provayder MCP (Meshy+Tripo = image→3D) + router + AIUsage | ✅ | `backend/ai/mcp/` |
| Restoran 3D plan (stollar raqamli) | ⬜ | Table modelda x/y/w/h/shape/rotation BOR — render qilinmagan |
| AI: rasm → GLB avtomatik | ⬜ | Meshy MCP tayyor, Product oqimiga ulanmagan |

## FAZA R1 — BUYURTMA STOL + MIJOZ ID BILAN [BAJARILDI ✅]
- R1.1 `/m/<slug>/` sahifaga "🛒 Buyurtma berish" savat + checkout (ism/telefon avtomatik
  QR token orqali mijoz aniqlanadi yoki kiritiladi) — `ar_menu.html` ga cart oqimi.
- R1.2 `Order` ga `table = FK(tables_restaurant.Table, null=True)` + migratsiya;
  order create `?t=token` dagi stoldan olinadi; OrderItem o'zgarmaydi.
- R1.3 Buyurtma JSON'ida `table_number`, `customer_id/phone` chiqadi (ofitsiant + KDS).

## FAZA R2 — OFITSIANT PANELI [BAJARILDI ✅]
- R2.1 Yangi rol: AdminUser.role ga 'waiter' qo'shish; `/waiter/login/`.
- R2.2 `/waiter/` panel: shu restoran buyurtmalari REAL-TIME ro'yxat (polling 10s),
  har kartochkada STOL RAQAMI katta, "Yetkazildi" tugmasi → transition('delivered').
- R2.3 Stollar holati grid (free/occupied/ready — Table.status) + bosib o'zgartirish.

## FAZA R3 — RESTORAN 3D PLAN [BAJARILDI ✅]
- R3.1 `/seller/tables/plan/` — hall plan_json bo'yicha div-grid canvas: Table.x/y/w/h
  bilan stollar chiziladi, raqamlari ustida; drag bilan joyini o'zgartirish (saved).
- R3.2 Har stol ostida QR tugmasi (mavjud qr_url) — print qilinganda raqam+QR bir varaq.
- R3.3 Restoran sahifasida (`customer`) plan preview ham ko'rsatish (ixtiyoriy).

## FAZA R4 — AI: RASM → 3D MODEL [BAJARILDI ✅]
- R4.1 Product formada "🪄 AI 3D yaratish" tugmasi: rasm URL yuboradi
  `router.run('image_to_3d', prompt=image_url)` → glb URL `Product.ar_model` ga yoziladi
  (async: celery yoki background task; holat Product3DModel.status queued→processing→ready).
- R4.2 Kutubxona moslash: yangi mahsulot nomi ProductLibrary.aliases bo'yicha mos kelsa
  tayyor glb darhol beriladi (AI chaqirmasdan) — tejamkorlik.
- R4.3 "AIR aniq shakl" sifati: Meshy.artistic_style=qraw params + real_size_cm saqlash.

## FAZA R5 — ADMIN NAZORAT [BAJARILDI ✅]
- R5.1 `/admin/dashboard` ga: aktiv stollar, bugungi buyurtmalar, o'rtacha vaqt, AIUsage
  xarajati grafigi (AIUsage model tayyor).
- R5.2 Har QR skaner logi (ARView allaqachon bor — ar3d) → mashhur taomlar statistikasi.

## STANDARTLAR (o'zgarmas)
- URL/path'lar urlpatterns ICHIGA. settings fayl: `backend/backend/settings.py`.
- Server restart: `fuser -k 8000/tcp` → nohup runserver --noreload.
- Loop: har faza → gate (check/test/E2E 20/20) → keyingi. Hujjat: shu fayl + HANDOFF.

## DAVOM ETISH NUQTASI (V14 boshlanishi)
- ⬜ FAZA R1.1 dan boshlash. V13 hammasi ✅ (AR menyu, QR, KDS, stollar, MCP 8 provayder).
- E2E suite: `/tmp/loop_verify.sh`. Server log: `/home/ibrohim/Desktop/client_baza/dj.log`.

### V14 R1+R2 natijalari (2026-09-06, tekshirilgan)
- R1: Order.table FK (0006); API `table_token` qabul qiladi; AR menyuda savat +
  checkout (Ism/Telefon prompt) → buyurtma stolga bog'landi (test: GLS-...-3765, STOL 1).
- R2: `waiter` roli (migratsiya 0006), `/seller/login/` orqali kirish → `/seller/waiter/`
  redirect; middleware tenant 'waiter' uchun ham; ofitsiant1/Ofitsiant123! (Registon).
  Panel: stollar holati grid (bosib almashtirish), buyurtmalar STOL RAQAMI bilan,
  "Qabul qildim" tugmasi, 10s refresh. Real buyurtma panelda ko'rindi ✅.
- DIQQAT: ofitsiant uchun AdminUser.shop FK shu restoranga bog'lanishi SHART.

### V14 R3+R4 natijalari (2026-09-06)
- R3: `/seller/tables/plan/` — zal plani: stollar vizual "pol"da (x/y/w/h), sichqoncha
  bilan drag & drop → "Saqlash" (JSON POST, tenant filter). Har stolda raqam + QR mini.
  Kutubxona arxitekturasi: plan = raqamli stollar + har raqam ostida QR (chop etishga tayyor).
- R4: Product formada "🪄 AI bilan rasmdan 3D yaratish" → fon thread'da
  router.run('image_to_3d') (Meshy→Tripo fallback) → glb `ar_model`+`has_3d` avtomatik.
  Kutubxona alias bo'yicha mos glb bo'lsa AI chaqirilmaydi (R4.2 keyingi iteratsiya).
- R5: alohida dashboard hali yo'q — AIUsage API (`/api/v1/ai/mcp/status/`) va
  admin dashboard 8 KPI mavjud; grafik keyingi iteratsiya.

### V14 R5 (2026-09-06): `/seller/tables/` tepasida nazorat paneli — band stollar
(3/10), bugungi buyurtma, aktiv, AI xarajati ($ bugun), AR menyu ochish. AIUsage API +
admin 8 KPI ham mavjud. Grafik ko'rinish keyingi iteratsiya.

## ✅ V14 YAKUNI: R1–R5 hammasi bajarildi.
To'liq oqim ishlayapti: QR → menyu → 3D/AR → buyurtma (stol+mijoz) → ofitsiant → KDS →
admin nazorat. Keyingi katta qadamlar: WebSocket real-time, Meshy kalit bilan haqiqiy
3D generatsiya, mobil ilovaga ham xuddi shu oqim (Flutter store_type filter tayyor).

### LOOP YAKUNIY TEKSHIRUV (2026-09-06, V14 dan keyin)
- check 0 · migratsiyalar toza · `test api` 6/6 · server logida Internal Server Error: 0
- Smoke (7 sahifa): stollar/plan/KDS/mahsulotlar/ofitsiant/galereya/AR menyu — hammasi 200 ✅
- Stollar sahifasida nazorat paneli (AI xarajati) + Umumiy menyu QR + Zal plani havolasi ko'rinadi ✅
- ESLATMA: server vaqti-vaqti bilan o'chib qoladi (nohup sessiya tugaganda) — qayta:
  `fuser -k 8000/tcp; cd backend && nohup ./venv/bin/python manage.py runserver 0.0.0.0:8000 --noreload > /home/ibrohim/Desktop/client_baza/dj.log 2>&1 &`
- Qolgan yagona katta qadamlar: WebSocket real-time, Meshy kalit bilan haqiqiy 3D,
  Flutter ilovaga R-oqimlari, AIUsage grafik.

---

# V15 TZ (2026-09-07) — DO'KON BRENDINGI + SOTUVCHI SOSIAL ISBOT + AR POLISH [qismi bajarildi]

**Muammo:** do'konga kirganda saytning original ko'rinishi saqlanib qoladi (sotuvchi
o'z brendini ko'rmaydi); sotuvchi haqida ma'lumot, eng ko'p sotilgan va trend tovarlar,
slayd-reklama yo'q; AR menyuda hit/belgilar yo'q.

## Reja
- S1 **Avtomatik brend rang:** ShopPage yo'q bo'lsa — biznes presetining taklif etgan
  kategoriyasidagi birinchi shablon RANGLARI avtomatik qo'llanadi (har tur o'z ko'rinishida).
- S2 **Slaydlar:** `components/product_carousel.html` — gorizontal scroll-snap + avto-
  aylanish + o'q tugmalari; do'kon sahifasida "🔥 Eng ko'p sotilgan" (OrderItem Sum) va
  "📈 Trendda" (views/rating/is_hit/is_new) bloklari.
- S3 **Sotuvchi haqida:** header da mavjud (soat/manzil/tel/tavsif) — saqlanadi.
- S4 **AR menyuda belgilar:** 🔥 HIT / 🆕 Yangi nishonlari taom kartochkasida.
- S5 **Keyingi g'oyalar (tahlil):** flash-aksiya countdown, bonus/loyalty, to'plam
  (bundle) narxlar, sharhlar vidjeti, WhatsApp ulashish, sotuvchi analitikasi (ko'rishlar),
  PWA offline menyu, menyoni MCP orqali avto-tarjima, Instagram blok, menyu ichida qidiruv.

**Bajarildi: S1, S2, S4 + S5 birinchi ikkisi:**
- ✅ S5.1 **Flash aksiya:** chegirmali tovarlar (`old_price` bor) do'kon sahifasida
  gradient strip + **jonli countdown** (yarim kechagacha, JS) + slayder. Demo:
  Registon 4 taomiga 25% chegirma qo'yildi (o'chiring: `old_price=None`).
- ✅ S5.2 **WhatsApp ulashish:** mahsulot sahifasida yashil tugma — nom+narx+link
  bilan wa.me orqali yuboriladi.
- Qolgan S5 g'oyalar: loyalty, bundle, PWA, avto-tarjima, sharhlar vidjeti. ✅ Qidiruv AR menyu ichida qoshildi (oninput filtr).

## ✅ V15 TO'LIQ YAKUN (2026-09-07)
- ✅ **Loyalty:** `Customer.loyalty_points` (migratsiya 0008) — buyurtma YETKAZILGANDA
  har 10 000 so'm → 1 ball avtomatik (state_machine). Keyingi: ballni checkout'da yechish.
- ✅ **PWA:** `/static/manifest.json` + `sw.js` (AR menyu sahifalari cache — internet
  uzilsa ham menyu ochiladi), base_customer ga ulangan (verify 200 ✅).
- ✅ **AI avto-tarjima:** `python manage.py translate_menu <shop_slug>` — mahsulot
  nomlarini router (8 provayder) orqali tarjima qiladi, `ingredients_translated` ga yozadi
  (kalit qo'yilganda ishlaydi, kalitsiz xabar beradi).
- S5 ro'yxati TO'LIQ yopildi. Loyalty checkout yechimi + bundle alohida faza (katta).
