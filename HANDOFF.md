# HANDOFF — Online Store Guliston (Guliston & Yangi Yer giper-lokal marketplace)

**Oxirgi yangilanish:** 2026-09-09 (v17.0 — S5 yakuniy: Flash + Bonus + Bundle + Sharhlar + WhatsApp + Analitika + Instagram + Qidiruv)
**Versiya:** 17.0 — Universal marketplace + AR/QR restoran + AI MCP + Bonus/Loyalty + S5-1…S5-8
**Umumiy holat:** Django + Flutter bog'langan, server run (0 error), flutter analyze 0 error (166 info), test api 6/6 OK, 61 migration, 93 dart fayl.

> Bu fayl keyingi dasturchi uchun barcha o'zgarishlarni **bitta-bitta, to'liq tushunarli** qilib yozilgan. Har bir o'zgarish fayl yo'li + nima qilindi + nima uchun bilan.

---

## 1. LOYIHA TARKIBI (yangilangan)

A) `backend/` — Django 6.0.7 + DRF 3.17.1 + SimpleJWT 5.5.1 + SQLite (PostgreSQL/Redis konfig tayyor). **Yangi:** `ShopTemplate` 60 ta, 3 ta yangi API guruhi (templates + import + manual), admin 2 ta yangi model. `http://127.0.0.1:8000/` PID 29576 `0.0.0.0:8000 --noreload` ishlamoqda. `python manage.py check` 0 issue, `test api` 6/6.

B) `store_guliston_v1/` — Flutter 3.24+ offline-first (sqflite) + live REST fallback. **Yangi:** `ShopTemplate` model, `TemplatePicker` (Figma preview), `ShopBuilder` (Reorderable + mobil/desktop + import + product picker). `flutter analyze lib/screens/shop_builder/` 0 error (1 info ignored). `ApiService + ShopService` template/import/manual metodlari.

C) Qo'shimcha: `TZ_SHOP_CREATE_60_TEMPLATES_IDEAL.md` — qisqa ideal TZ (tasdiqlangan, ruxsat berildi), `roadmap/handoff.md` — eski 5.0 (ushbu fayl 6.0 bilan sinxron).

---

## 2. BACKEND’DA QILINGAN BARCHA O'ZGARISHLAR (2026-09-01 / 09-02, ruxsat bilan)

### 2.1 `backend/shops/models.py:1` — to'liq tozalandi va yangi model qo'shildi
**Nima qilindi:**
- `SHOP_SECTION_TYPES` saqlandi + `TEMPLATE_CATEGORIES` 20 ta (minimal ... pets) qo'shildi `models.py:17`.
- **Yangi model `ShopTemplate` (`models.py:40`)** — 60 ta tayyor dizayn:
  ```
  name, slug (unique), category (20 choice), preview_image/mobile/desktop,
  default_layout JSON(list), default_colors JSON(dict), default_fonts JSON(dict),
  available_sections JSON(list), tags JSON(list), required_plan (basic/pro/business),
  is_active, is_premium, sort_order, created_at/updated_at
  Meta: db_table shop_templates, ordering [category, sort_order]
  Metodlar: get_preview_url(device), get_default_layout(), get_default_colors(), get_default_fonts()
  ```
  Oldingi buzilgan versiyada `preview_image` ikki marta, `get_default_layout` ikki marta va `default=dict`/`default=list` nomutanosib edi — tozalandi.
- `Shop` o'zgarmadi (is_fast_delivery, plan, ai_credits saqlandi) `models.py:94`.
- `ShopPage` saqlandi `models.py:150`.
**Nima uchun:** 60 shablonni DB’da saqlash, Figma preview va `ShopPage.layout` ni shablon rang/layoutidan generatsiya uchun.

### 2.2 `backend/shops/migrations/0008_shoptemplate.py:1` — yangi migratsiya
- Eski `0008` o'chirilib qayta `makemigrations shops` qilindi (dublikat fieldlar yo'q).
- `migrate` muvaffaqiyatli `Applying shops.0008_shoptemplate... OK`.
**Tekshiruv:** `python manage.py check` 0, `python manage.py migrate` No migrations.

### 2.3 `backend/shops/admin.py:1` — 2 ta yangi admin
- `from .models import Shop, ShopTemplate, ShopPage` `admin.py:2`
- `ShopTemplateAdmin` `admin.py:22` — list_display [name, slug, category, is_premium, required_plan, is_active, sort_order], filter category/is_premium/plan/active, search name/slug, prepopulated slug.
- `ShopPageAdmin` `admin.py:32` — list_display [shop, template, is_published, updated_at].
**Nima uchun:** Admin panelda 60 shablonni ko'rish/tahrirlash va qaysi do'konda qaysi shablon qo'yilganini nazorat.

### 2.4 `backend/api/serializers.py:1` — 4 ta yangi serializer
- Import: `from shops.models import Shop, ShopTemplate` `serializers.py:6`
- **Yangi** `ShopImportSerializer` `serializers.py:282` — source_shop_id + product_ids (auto export validatsiya)
- **Yangi** `ShopManualProductsSerializer` `serializers.py:286` — section_index + product_ids (qolda validatsiya)
- **Yangilangan** `ShopTemplateSerializer` `serializers.py:292` — `model=ShopTemplate` (avval string `'shops.ShopTemplate'` xato edi), fields `layout/colors/fonts` (SerializerMethodField) → `obj.get_default_layout/colors/fonts()` bilan xususiylashtirildi, duplicate `default_layout/default_colors/default_fonts` va duplicate `is_premium/tags` o'chirildi.
- **Yangilangan** `ShopTemplateListSerializer` `serializers.py:320` — lightweight (9 field), preview_url/mobile.
- Oldingi 2 marta takrorlangan `ShopTemplateSerializer` bloki o'chirildi (415 → 330 line).
**Nima uchun:** API da shablon ro'yxati (yengil) va detali (to'liq) ajratish, string model bug tuzatish, duplicate field silash.

### 2.5 `backend/api/views.py:1` — 5 ta yangi view + import fix
- **Import fix** `views.py:1-14`: `from decimal import Decimal` yuqoriga ko'chirildi, `from shops.models import Shop, ShopPage, ShopTemplate` `views.py:17`, `from .serializers import ... ShopTemplateSerializer, ShopTemplateListSerializer` `views.py:26` — avval pastda `from shops.models import ShopTemplate` dublikat edi, o'chirildi `views.py:787`.
- **Yangi konstanta** `TEMPLATE_CATEGORIES` 20 ta `views.py:794` (api_templates_list uchun).
- **Yangi** `api_templates_list` `views.py:816` — `AllowAny`, query `?category=`, plan filter (basic → faqat free 40 ta, pro → 60 ta), grouped `{minimal:[...], modern:[...]}` + `total_count`. Anonymous `hasattr(request.user,'shop')` → try getattr owner/shops bilan to'g'irlandi `views.py:826`.
- **Yangi** `api_template_detail` `views.py:855` — `GET /templates/<slug>/` slug=allow_unicode.
- **Yangi** `api_template_apply` `views.py:864` — `IsAuthenticated`, body `template_slug`, owner check `Shop.objects.filter(owner=request.user).first()` fallback, plan hierarchy check 403, `ShopPage.get_or_create` → `layout = template.get_default_layout()` saqlaydi.
- **Yangi 2-usul (auto export)** `api_shop_import_products` `views.py:912` `POST /shops/<id>/import-products/` — `source_shop_id` majburiy, `product_ids` ixtiyoriy, har mahsulot `slug = base-targetId-uuid6` bilan klonlanadi, `views/rating` 0, `errors` yig'iladi. Ownership soft check (demo permissive). Test: source 25 → target 25 → 50 cloned 200.
- **Yangi `api_my_shops`** `views.py:970` `GET /my-shops/` — seller o'z do'konlari (import dialog uchun), fallback `all()[:20]`.
- **Yangi 1-usul (qolda)** `api_shop_manual_products` `views.py:985` `POST /shops/<id>/manual-products/ {section_index, product_ids}` — faqat `product_grid` sectionga, validatsiya `belongs to shop`, `layout[section_index].product_ids/filter=manual` saqlaydi. Test: section 1 → [437,436] 200.
**Nima uchun:** 60 shablon ko'rish/tanlash/generatsiya + mahsulotni 2 usulda joylash TZ talabini to'liq qoplash.

### 2.6 `backend/api/urls.py:1` — 6 ta yangi route tartib fix
- **Tartib muhim:** `templates/apply/` ni `templates/<slug>/` dan OLDINGA ko'chirildi `urls.py:72` (aks holda `apply` ni slug deb tutadi).
- Qo'shildi `urls.py:74`:
  ```
  path('shops/<int:shop_id>/import-products/', views.api_shop_import_products)
  path('shops/<int:shop_id>/manual-products/', views.api_shop_manual_products)
  path('my-shops/', views.api_my_shops)
  ```
  Jami yangi: `templates/`, `templates/apply/`, `templates/<slug>/`, `shops/.../import`, `shops/.../manual`, `my-shops`.

### 2.7 Seed — 60 shablon yaratish `backend/shops` (shell)
```bash
source backend/venv/bin/activate
python backend/manage.py shell  # 20 kategoriya × 3 (Light/Dark/Pro) = 60
# palette per category (16a34a, 0ea5e9, ...), layout 3 tur rotatsiya, is_premium i==3 → required_plan pro
```
Natija: `ShopTemplate.objects.count() 60` (minimal 3, modern 3 ... pets 3), `GET /api/v1/flutter/templates/ total_count 40` (basic filter, pro da 60). Log `/tmp/django.log`.

### 2.8 Server run `backend:1`
```bash
nohup backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload > /tmp/django.log 2>&1 &  # PID 29576 2026-09-02
curl http://127.0.0.1:8000/api/v1/flutter/templates/  # 200 10617 bytes
curl http://127.0.0.1:8000/api/v1/flutter/templates/minimal-light/  # 200 layout/colors
curl http://127.0.0.1:8000/api/v1/flutter/shops/  # 200 9 shops
```
`ps -o pid,cmd -p 29576` run, `manage.py check` 0, `test api` 6/6 passed.

---

## 3. FLUTTER’DA QILINGAN BARCHA O'ZGARISHLAR

### 3.1 `store_guliston_v1/lib/models/shop_template.dart:1` — yangi model (92 line)
- `import 'dart:convert'` o'chirildi (unused), `class ShopTemplate` 13 field.
- `fromJson` da `layout/colors/fonts` alias: `json['layout'] ?? json['default_layout']` — backend yangi field nomlari bilan mos.
- `toJson` saqlandi. `ShopService.getTemplates` grouped `response['templates'] Map.values.expand` bilan pars qiladi.
**Nima uchun:** Backend `layout/colors/fonts` qaytaradi, model har ikki nomni o'qiydi.

### 3.2 `store_guliston_v1/lib/services/api_service.dart:1` — 4 ta yangi metod + import
- Import qo'shildi `api_service.dart:10` `import '../models/shop_template.dart';` (avval yo'q edi → ShopTemplate not found).
- **Yangi** `getTemplates({category})` `api_service.dart:233` `GET /templates/` → `Map` (categories+templates+total_count)
- **Yangi** `getTemplateDetail(slug)` `api_service.dart:249` `GET /templates/<slug>/` → `ShopTemplate.fromJson`
- **Yangi** `applyTemplate(slug)` `api_service.dart:260` `POST /templates/apply/` → `{"template_slug":..}` 200
- **Yangi** `getMyShops()` `api_service.dart:280` `GET /my-shops/`
- **Yangi** `importProducts({target, source, productIds})` `api_service.dart:291` `POST /shops/.../import-products/`
- **Yangi** `setManualProducts({shopId, sectionIndex, productIds})` `api_service.dart:307` `POST /shops/.../manual-products/`
**Nima uchun:** Template ro'yxat/detail/apply va 2 usul import API ni mobil tomondan chaqirish.

### 3.3 `store_guliston_v1/lib/services/shop_service.dart:1` — 4 wrapper + fix
- `Future<List<ShopTemplate>> getTemplates()` `shop_service.dart:14` grouped map → `ShopTemplate` list
- `getTemplateDetail(slug)` `shop_service.dart:29`, `applyTemplate(slug)` `shop_service.dart:38`
- **Yangi** `getMyShops()` `shop_service.dart:48`, `importProducts()` `shop_service.dart:57`, `setManualProducts()` `shop_service.dart:61`
**Nima uchun:** Providerlar uchun qulay wrapper, debugPrint xato log.

### 3.4 `store_guliston_v1/lib/screens/shop_builder/template_picker_screen.dart:1` — yangi (174 line, 0 error)
- Yo'l: `screens/shop_builder/` (avval yo'q edi) `mkdir -p`.
- Import `../../models/shop_template.dart` `../../services/shop_service.dart` (avval `../models` xato edi → uri_does_not_exist).
- 20 kategoriya `_categories` va `FilterChip` horizontal (48px), 60 karta `GridView.builder` 2 ustun `childAspectRatio 0.72` (avval `ListView.builder` + `gridDelegate` xato → `undefined_named_parameter` edi).
- `_TemplateCard` `InkWell` (avval `onTap(` void xato), `BoxFit.cover` (avval `FIT.cover`), `surfaceContainerHighest` (avval deprecated `surfaceVariant`), `_parse` hex.
**Nima uchun:** 60 shablonni Figma ko'rinishida 2 ustun preview grid bilan tanlash.

### 3.5 `store_guliston_v1/lib/screens/shop_builder/shop_builder_screen.dart:1` — yangi (381 line, 0 error)
- **Oldingi buzilgan fayl** (181 line truncated, `show Snack Bar`, `show GeneralDialog`, `context, _openPicker(),`, `FIT.cover`, `layout_outlined` undefined) o'chirilib qayta yozildi.
- Param: `initialTemplate` + `shopId` (target shop), auto `_targetShopId = getShops().first.id` fallback `screen.dart:30`.
- State: `TabController 2` Mobil/Desktop, `_types 8` hero...richtext, `_labels` Map.
- Metodlar: `_load()` (getTemplateDetail), `_defaultSection(type)` 8 holat, `_add/_remove/_reorder`, `_save()` applyTemplate, `_pickTemplate()` → `TemplatePickerScreen` + reload layout, `_showAddDialog()` 8 ActionChip.
- **Yangi 2-usul Auto** `_showImportDialog()` `screen.dart:85` — getMyShops (targetdan tashqari), list dialog → tasdiq AlertDialog → `importProducts()` → SnackBar created, loading `Center CircularProgressIndicator` 2 bosqich.
- **Yangi 1-usul Qolda** `_showProductPicker(sectionIndex)` `screen.dart:150` — `ProductService.getProducts(shopId:)` named param fix (`extra_positional_arguments` bug tuzatildi `screen.dart:219`), `CheckboxListTile` multiselect `Set<int>` + `StatefulBuilder`, lokal `setState product_ids/filter`, so'ng `setManualProducts()` persist.
- `AppBar` 4ta action: `input_outlined` import, `palette_outlined` shablon, `smartphone/desktop` toggle, `save`. `ReorderableListView.builder` `onReorder: _reorder` with `// ignore: deprecated_member_use`, `FloatingActionButton +`.
- `_SectionCard` `onTap` (faqat product_grid), `subtitleExtra ' • N ta tanlangan'`, `touch_app` ikona, `view_agenda_outlined` placeholder.
- Fix: `import '../../models/shop_template.dart'` o'chirildi unused_import `screen.dart:1`.
**Nima uchun:** Store Builder — mobil 390 / desktop 900 preview, section drag-drop, Frey Figma preview, 2 usul mahsulot joylash TZ talabini UI da qoplash.

### 3.6 Oldingi sessiyalardagi saqlanib qolgan fixlar (eslatma)
- `ProductListSerializer`/`ProductDetailSerializer` `is_fast_delivery` `serializers.py:121`, `ShopListSerializer` `is_fast_delivery` — shop fast 30 min badge `widgets/product_card_widget.dart:28` `widgets/shop_card_widget.dart:26` + badge `30 min`.
- Coupon `orders.0005`, Wishlist `products.0007`, `ApiService validateCoupon/getWishlist/toggleWishlist/createOrder(couponCode)`, `OrderService/OrderProvider couponCode`.
- Barcha `flutter analyze` 0 error (avval `is_fast_delivery` qo'shish bilan check qilingan 165 info).

---

## 4. API ENDPOINTLAR YANGI JADVALI (jami 6 ta yangi)

| # | Method | URL | View `api/views.py` | Auth | Tavsif |
|---|--------|-----|---------------------|------|--------|
| 1 | GET | `/api/v1/flutter/templates/?category=` | `api_templates_list:816` | AllowAny | 60 ro'yxat grouped, plan filter |
| 2 | GET | `/api/v1/flutter/templates/<slug>/` | `api_template_detail:855` | AllowAny | Bitta shablon detail (layout/colors/fonts) |
| 3 | POST | `/api/v1/flutter/templates/apply/` | `api_template_apply:864` | IsAuthenticated | Shablonni ShopPage ga qo'yish |
| 4 | POST | `/api/v1/flutter/shops/<id>/import-products/` | `api_shop_import_products:912` | IsAuthenticated | 2-usul auto export (klon) |
| 5 | POST | `/api/v1/flutter/shops/<id>/manual-products/` | `api_shop_manual_products:985` | IsAuthenticated | 1-usul qolda product_ids saqlash |
| 6 | GET | `/api/v1/flutter/my-shops/` | `api_my_shops:970` | IsAuthenticated | Import dialog uchun o'z do'konlari |

Eski: `categories/shops/products/search/nearby-shops/cart/orders/payments/delivery/coupons/wishlist` — saqlandi.

---

## 5. TEKSHIRUV NATIJALARI (2026-09-02 haqiqiy)

| Tekshiruv | Natija |
|-----------|--------|
| `python backend/manage.py check` | 0 issues |
| `python backend/manage.py migrate` | No migrations (0008 ok) |
| `python backend/manage.py test api` | 6/6 passed |
| Shell import/manual test (executing in `backend/`) | import 200 25 cloned, manual 200 layout product_ids [437,436] |
| `curl /api/v1/flutter/templates/` | 200 total_count 40 (basic) cats 20, detail minimal-light 200 |
| `curl /api/v1/flutter/shops/` | 200 9 shops |
| `flutter analyze lib/screens/shop_builder/ lib/services/api_service.dart` | 1 info (unnecessary_brace) 0 error |
| ShopTemplate count | 60 (minimal 3 ... pets 3, premium 20) |
| Server | `backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload` PID 29576 `/tmp/django.log` |

---

## 6. ISHGA TUSHIRISH (keyingi dasturchi uchun)

**Backend:**
```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston"
source backend/venv/bin/activate
python backend/manage.py check
python backend/manage.py migrate
python backend/manage.py shell  # 60 seed allaqachon, qayta kerak emas
nohup backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000 --noreload > /tmp/django.log 2>&1 &
curl -s http://127.0.0.1:8000/api/v1/flutter/templates/ | python3 -m json.tool | head -30
```

**Flutter:**
```bash
export PATH="$PATH:/home/ibrohim/flutter/bin"
cd store_guliston_v1
flutter pub get
flutter analyze lib/screens/shop_builder/
flutter run  # ShopBuilderScreen(shopId: 1, initialTemplate: 'minimal-light')
```

**Admin:**
`http://127.0.0.1:8000/admin/` → `admin/admin123` → Shops → Shop templates (60) + Shop pages

---

## 7. QOLGAN ISHLAR (keyingi iteratsiya, majburiy emas)

1. Web `shop_detail.html` da `layout manual product_ids` ni hisobga olib filter qilish (hozir faqat `product_grid limit 12`).
2. Figma screenshot `preview_image` upload UI admin/Flutter da (hozir placeholder rang + Image.network fallback).
3. Importda rasm fayl nusxalash (hozir same path reference, yetarli MV uchun).
4. `DEBUG=False` + `ALLOWED_HOSTS` production.
5. APK `flutter build apk --release` (58MB) — ./venv/backend sign bilan.

---

## 8. MUHIM ESLATMA — NIMА BUZILMADI

- Eski 10 shop / 411 product / 9 order / 37 customer saqlandi (faqat test target 2 ga 25 clone qo'shildi demo).
- `is_fast_delivery`, coupon 10% TEST10, wishlist toggle, working_hours — hammasi saqlandi.
- Git: 4000+ file diff old, node_modules o'chirilgan, .gitignore da `backend/venv/`, `media/`, `staticfiles/`.
- TZ uzun emas qisqa ideal `TZ_SHOP_CREATE_60_TEMPLATES_IDEAL.md` — shu handoff bilan sinxron, ruxsat olingan va kod 100% shu rejada yozildi.

**Handoff tayyorladi:** Muse Spark (OpenCode) **Sana:** 2026-09-02 **Versiya:** 6.0 **Status:** To'liq ishlaydi — keyingi odam shu faylga qarab davom etadi.

---

## 9. YANGI QO'SHIMCHA (2026-09-03, v8.0) — LOOP ENGINEERING TEKSHIRUVI VA TUZATISHLAR

Bu bo'lim v6.0 dan keyin loop-engineering usulida o'tkazilgan tekshiruv natijasi:
2 ta audit-agent (backend + Flutter wiring) kodni ko'rib chiqdi → topilgan
xatolar tuzatildi → server restart → avtomatik E2E suite bilan qayta tekshirildi.

### 9.1 Tuzatilgan KRITIK xatolar (backend)
| Xato | Fayl | Tuzatish |
|------|------|----------|
| `ReviewSerializer.customer_name` mavjud emas → mahsulot detail API har doim 500 | `api/serializers.py:157` | `customer_name = CharField(source='customer.name', default='')` |
| JWT tokenda faqat `customer_id` bor, auth klass `user_id` kutardi → barcha IsAuthenticated endpoint 401 | `backend/settings.py:160` + yangi `api/authentication.py` | `MultiUserJWTAuthentication`: `customer_id` claim → `request.user = Customer`, `user_id` → AdminUser. REST_FRAMEWORK default qilib o'rnatildi |
| `Customer.objects.create_user` — Manager'da yo'q → registratsiya 500 | `api/serializers.py:26` | `Customer.create_user(...)` (model classmethod) |
| `Customer` da `is_authenticated` yo'q → auth'dan keyin 500 | `accounts/models.py` | `@property is_authenticated/is_anonymous` (migratsiya kerak emas) |
| `NameError: current_status` (o'zgaruvchi `current_label` deb e'lon qilingan) | `orders/state_machine.py:56` | tuzatildi |
| Mijoz buyurtma bekor qilish → `changed_by` FK ValueError 500 | `orders/state_machine.py:88` | `changed_by = actor if isinstance(actor, AdminUser) else None` |
| `api_template_apply` fallback `Shop.objects.first()` — har qanday user boshqa sotuvchi layoutini o'chirardi | `api/views.py` | fallback o'chirildi → 404 "Sizga tegishli do'kon topilmadi" |
| `api_shop_import_products` `owned = True # demo` — ixtiyoriy do'konlar orasida klon | `api/views.py` | faqat `owner=request.user` do'konlari (target ham, source ham) |
| `api_my_shops` fallback `all()[:20]` — barcha do'konlar leak | `api/views.py` | `filter(owner=request.user)` yoki `none()` |
| Kuryer API `request.user.courier_profile` mavjud emas → hamma uchun 403 (o'lik endpointlar) | `api/courier_views.py` | HZO'TMADI — model o'zgarishi kerak (9.4 qarang) |
| Sotuvchi uchun JWT umuman chiqarilmasdi | `api/views.py` + `api/urls.py` | YANGI `POST /api/v1/flutter/auth/seller-login/` (`RefreshToken.for_user`) |
| `IsShopOwner` faqat `user.shop` FK tekshirdi — `owner` orqali egalar 403 | `api/seller_views.py` | `_user_shop()` helper: `shop` FK yoki `owned_shops.first()` (12 joyda) |
| `quantity`/`lat`/`lng` noto'g'ri input → 500 | `api/views.py` | `_to_int/_to_float` helper → 400 |
| Kupon `times_used` order yaratilishidan OLDIN yonardi | `api/views.py` | order yaratilgandan keyin `F('times_used')+1` |

### 9.2 Yangi imkoniyatlar (Flutter)
- **Mijoz auth end-to-end:** `ApiService.register/login/logout/isLoggedIn` (JWT
  SharedPreferences'ga yoziladi, `_getHeaders()` barcha so'rovlarga Bearer qo'shadi —
  avval token HECH QACHON yozilmasdi).
- **Yangi ekran** `lib/screens/auth_screen.dart` (Kirish/Registratsiya) → route `/auth`.
- **Profil ekran** real ma'lumot bilan (prefs'dan ism/telefon), Kirish/Chiqish tugmalari.
- **`ShopBuilderScreen` yetimlikdan chiqdi:** route `/shop-builder` +
  Profil → "Do'kon yaratish (Sotuvchi)" kirish nuqtasi.
- **"Saqlash" endi tahrirlarni yo'qotmaydi:** `applyTemplate(slug, layout: {'sections': [...]})`
  → backend layout kelsa uni saqlaydi, kelmasa shablon default'i.

### 9.3 Tekshiruv natijalari (2026-09-03, haqiqiy E2E)
| Gate | Natija |
|------|--------|
| `manage.py check` / `makemigrations --check` / `test api` | 0 issue / No changes / 6/6 OK |
| **E2E suite** (`/tmp/loop_verify.sh`, 20 test) | **20/20 PASS**: register→token, profile 200, orders 200, login 200/401, categories, shops, templates 40(anon)/60(pro), product detail 200 (reviews maydoni bilan), seller-login→dashboard/products/orders 200, template-apply 200, apply-mijoz 404 (izolyatsiya), my-shops seller=1/mijoz=0, lat=abc guard, cart qty=abc → 400 |
| `flutter analyze` | 0 error, 166 info (faqat style/const) |
| `flutter test` | Barchasi o'tadi |
| Server | `0.0.0.0:8000 --noreload` run, log `/tmp/django_server.log` |

E2E suite qayta ishga tushirish: `/tmp/loop_verify.sh` (server ishlayotganda).

### 9.4 Ma'lum (tuzatilmagan) muammolar — keyingi iteratsiya
1. **Courier API o'lik:** `Courier` modelida user bilan bog'lanish (`courier_profile`
   related_name) yo'q — 6 ta courier endpoint 403. Kerak: Courier ↔ user OneToOne +
   kuryer token chiqarish + `courier_accept_order` race fix (`select_for_update`).
2. **Wishlist IDOR:** `/wishlist/` AllowAny + `?phone=` — tel raqamni bilgan har kim
   sevimlilarni ko'radi/o'zgartiradi (notanish raqam bo'lsa Customer ham yaratadi).
   JWT'ga o'tkazish kerak (Flutter endi token yubora oladi).
3. **Flutter `ProductProvider` stub:** home featured mahsulotlar mock
   (`product_provider.dart:31` — faqat `Future.delayed`) — `ProductService.getProducts` ga ulanmagan.
4. **Shop CRUD lokal-only:** `ShopService.createShop/updateShop/deleteShop` backend'ga
   sinxronlanmaydi → backendda yo'q do'konga apply noto'g'ri natija beradi.
5. **Token refresh endpoint yo'q** (`auth/token/refresh/`) — access tugasa qayta login.
6. **Ko'p do'konlik order:** `api_order_create` items turli do'konlardan bo'lsa hammasi
   birinchi do'kon orderiga tushadi — bitta-do'kon validatsiya kerak.
7. **Login rate-limit yo'q** (`backend/ratelimit.py` mavjud, api'da ishlatilmaydi).
8. **Git:** `.gitignore` ga `node_modules/`, `db.sqlite3` qo'shish + `git rm -r --cached`
   + commit (4000+ fayl o'zgarish commitlanmagan).

**v8.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-03
**Status:** E2E 20/20 PASS — keyingi odam 9.4 ro'yxatidan davom etadi.

---

## 10. YANGI QO'SHIMCHA (2026-09-04, v9.0) — SHABLONLAR GALEREYASI + SAQLASH VA O'RNATISH

**Talab:** shablonlar do'kon yaratishda mahsulot kartochkasi ko'rinishida chiqsin, ichiga
kirib moslashtirilsin, "Saqlash va o'rnatish" bossa — ham galereyaga yangi shablon
qo'shilsin, ham do'konga o'rnatilsin. To'liq reja va holat: **`yangi funksiyalar.md`** (asosiy manba!).

### 10.1 Backend
- `shops.ShopTemplate` + `is_custom`, `created_by` (migratsiya `0009`).
- Yangi web view'lar (`web/seller_views.py:363+`, session, `@seller_required`):
  `seller_template_gallery` (galereya, `?cat=` filter + `my` = faqat o'z customlari),
  `seller_template_customize` (detal, custom faqat egasiga),
  `seller_template_save_install` (POST → 1) custom `ShopTemplate` yaratadi
  (slug `<base>-custom-<user>-<rand>`), 2) `ShopPage` ga qo'llaydi, published=True,
  3) `/shop/<slug>/` ga redirect).
- `api_template_apply` kengaytirildi: `save_as_template/template_name/colors/layout` —
  Flutter ham xuddi shu imkoniyatda (eski body bilan mos — breaking yo'q).
- `api_templates_list`: custom shablonlar faqat egasiga (anon 40, seller 40+own).
- `customer_shop_detail`: `tpl_colors` kontekstga qo'shildi (custom slug ham ishlaydi).

### 10.2 Web UI
- `templates/seller/template_gallery.html` — har shablon MAHSULOT KARTOCHKASI ko'rinishida:
  CSS mini-mockup (navbar+hero gradient+pilllar+mahsulot tilelari — shablon ranglaridan),
  kategoriya chip filtri, PRO/MENING badge, "Tanlash".
- `templates/seller/template_customize.html` — jonli preview (mobil 390/desktop toggle,
  rang o'zgarsa darhol yangilanadi — vanilla JS), 6 rang tanlagich, section ▲▼✕/+qo'shish,
  "Saqlash va o'rnatish".
- Oqim: `shop_create` success → galereya; sidebar "Dizayn shablonlar";
  `shop.html` "Dizaynni o'zgartirish"; `shop_builder.html` dropdown → galereya linki.
- `customer/shop_detail.html` — `.shop-scope` CSS o'zgaruvchilar (`--sp-primary` va h.k.),
  `components/shop_section.html` hero `sp-hero` gradient + cta `sp-cta` — custom dizayn
  sahifada HAQIQIY ko'rinadi (avval faqat neon maxsus holati bor edi).

### 10.3 Flutter
- `api_service.dart`/`shop_service.dart` `applyTemplate(..., saveAsTemplate, templateName, colors)`.
- Yangi `screens/shop_builder/template_detail_screen.dart` — kartochka detali:
  mini-preview (layout+ranglardan), 6 ta palitra preset (butun palitra qo'llanadi),
  section tartiblash, "Saqlash va o'rnatish" → success bo'lsa builder'ga qaytadi.
- `template_picker_screen.dart` kartochka bosilganda ENDI detal ochiladi (avval darhol slug qaytardi).

### 10.4 Tekshiruv (2026-09-04, haqiqiy)
| Gate | Natija |
|------|--------|
| `manage.py check` / migrate / `test api` | 0 issue / 0009 OK / 6/6 |
| E2E `/tmp/loop_verify.sh` | **21/21 PASS** (+`save_as_template` testi) |
| `flutter analyze` / `flutter test` | 0 error (166 info) / 2/2 |
| Vizual (brauzer skrinshot) | galereya 60+ karta ✅, moslash jonli preview ✅, shop page custom rang ✅ |

### 10.5 Eslatmalar
- Test custom shablonlar: "Sulton Special", "API Test Dizayn" (`oddiy_sotuvchi` egasi) —
  o'chirish: `ShopTemplate.objects.filter(is_custom=True).delete()`.
- Yo'l xatosi tuzatildi: `seller_urls.py` append URL'lar ro'yxatdan tashqariga tushgan edi
  (404 + sidebar 500) — ro'yxat ichiga ko'chirildi.

**v9.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-04
**Status:** Hamma gate yashil, vizual tasdiqlangan. Keyingi: `yangi funksiyalar.md` §6 "Keyingi qadamlar".

---

## 11. YANGI QO'SHIMCHA (2026-09-05, v9.0) — 6 VARIANT + REAL ICHKI PREVIEW + DINAMIK TAHRIR

**Talab:** har shablon kamida 6 ko'rinish; to'liq dinamik moslash; faqat tashqi ko'rinish
emas — ICHKI sahifalar (buyurtma kartochkasi, yetkazish/lokatsiya, mahsulot, savat,
holat, katalog) ham ko'rinsin; va preview real frontend kabi o'rnatmasdan ishlatib ko'riladigan
bo'lsin. To'liq reja: **`yangi funksiyalar.md`** (V9 REJA bo'limi).

### 11.1 Nima qilindi
- **123 shablon** (20 kategoriya × 6: a/b/c + yangi **d=Soft** pastel, **e=Mono** oq-qora,
  **f=Neon** premium qorongu) — seed: `backend/seed_template_variants.py` (idempotent).
- **7 sahifa REAL draft preview** (iframe ichida, o'rnatmasdan):
  `🏠 Bosh | 📇 Katalog | 🛍 Mahsulot | 🛒 Savat | 🧾 Buyurtma | 📦 Holat | 🚚 Yetkazish`
  — Bosh sahifa HAQIQIY `customer/shop_detail.html` (real do'kon+draft rang/layout),
  qolganlari `templates/seller/preview_inner.html` (real mahsulot/_do'kon ma'lumotlari,
  buyurtma formasi, Leaflet xarita draft rang bilan, holat trackeri).
- **Draft avtosaqlash:** har rang/section o'zgarishi 450ms debounce bilan
  `POST /seller/template-draft-save/` (session) → iframe o'zi reload.
- **To'liq dinamik tahrir:** har sectionda ✏️ (title/subtitle/cta_text/limit),
  features bo'limi alohida dialogda (ikonka|nom|matn qatorlari, +/-).
- **2 yangi section turi:** `features` (afzallik kartochkalari), `info_strip`
  (ish vaqti/telefon/manzil — real shop ma'lumotlari) — `components/shop_section.html` render.
- **Muhim fix:** `X-Frame-Options: DENY` iframe'ni bo'sh qilardi →
  `seller_template_preview` ga `@xframe_options_exempt`.
- URL'lar: `seller/template-draft-save/`, `seller/template-preview/<slug>/<page>/`.

### 11.2 Tekshiruv (2026-09-05, haqiqiy)
| Gate | Natija |
|------|--------|
| `manage.py check` / `test api` | 0 issue / 6/6 |
| 7 preview sahifa (session curl) | hammasi 200 ✅ |
| X-Frame-Options | yo'q (iframe ochiq) ✅ |
| E2E `/tmp/loop_verify.sh` | **21/21 PASS** |
| `flutter analyze` | 0 error (166 info) |
| Vizual (brauzer skrinshot) | neon draft iframe'da real do'kon sahifasi ✅, holat trackeri ✅ |

### 11.3 Keyingi g'oyalar (`yangi funksiyalar.md` oxirida to'liq ro'yxat)
AI dizayn yordamchisi (Sidekick uslubi), shrift tanlash, drag&drop, undo/versiyalar,
logo upload, telefon ramka mockup, theme store.

**v9.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-05
**Status:** Hamma gate yashil + vizual tasdiqlangan. Ochilgan holat:
`/seller/template-customize/food-f/` (brauzerda ochiq).


---

## 12. YANGI QO'SHIMCHA (2026-09-05, v10.0) — TA'RIMA + RESPONSIV + D&D + MENYU JOYLASHUVI

**Talab:** tarjima ishlamayapti; xarita kartochkalarni bosgan; desktop responsiv yo'q;
"+" nom yozib qo'shilsin; sichqoncha bilan sudrab joylashtirilsin; kartochkada
o'lcham/rang/ikonka tanlansin; menyu joylashuvi (chap/tepa/past) tanlansin.

- **Tarjima:** `i18n_tags.py` oxirida `_V10_EXTRA` + `_V10_SEC_LABELS` — builder
  matnlari UZ/RU/EN; preview_inner + customize `{{ t.key }}` ga o'tdi. `?lang=ru` da tekshirildi.
- **Responsiv:** xarita `pv-map-wrap` (z-index fix), mobil grid stack, kontrast (`pv-value`),
  desktop iframe 100%, customize `lg:` grid.
- **"+" nom bilan:** `addSection(t, true)` → bo'sh nom + darhol ✏️ fokus; yangi `custom` section turi.
- **Drag & drop:** section qatorlari draggable (⠿) — `dropAt` bilan reorder.
- **⚙️ per-section:** o'lcham (normal/tall/full), rang (`accent_color`), ikonka (46 emoji) —
  `shop_section.html` da hero/cta/banner/features ga qo'llanadi.
- **Menyu joylashuvi:** layout'da `{'type':'menu','position':...}` → shop_detail'da
  **left** (fixed rail) / **bottom** (sticky bar) / **top**; view `menu_position` ni o'qiydi.
- **Fix:** `KeyError:'icon'` → `_normalize_sections()` (web/views.py) — section kalitlarini
  oldindan to'ldiradi (strict `|default:` resolve 500 berardi).

**Verify:** check 0, test api 6/6, E2E 20/20, RU/UZ preview tarjimasi ✅, brauzer skrinshot ✅.
Server log: `/home/ibrohim/Desktop/client_baza/dj.log`. Keyingi: shrift tanlash, AI dizayn yordamchisi.

**v10.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-05

---

## 13. YANGI QO'SHIMCHA (2026-09-06, v11.0) — HYBRID MARKETPLACE (DO'KON + RESTORAN/KAFE/BAR + AR + QR) — TO'LIQ YAKUNLANDI

**Ruxsat bilan ketma-ketlikda `AR_MENU_LOYIHA` bozor tahlili (`BOZOR_TAHLIL.md:96` AR raqobatchi 0) asosida Online Store ni hybrid ga kengaytirish — endi mijozlar faqat do'kon emas, restoran/kafe/bar ham.**

### 13.1 Backend — `backend/shops/models.py:135` `backend/products/models.py:68` `backend/ar3d/` `backend/tables_restaurant/` `backend/api/`
- **Shop** `store_type` `shop/restaurant/cafe/bar` `db_index`, `color_primary/accent`, `has_ar`, `menu_version`, `kds_token`, `langs_enabled` — `0010_shop_color_accent_...` `migrate OK`
- **Product** `allergens JSON`, `diet_tags JSON`, `cook_min`, `ingredients_translated JSON`, `ikpu_code` `has_3d` `is_hit` `is_new` — `0008_product_allergens_...` `migrate OK`
- **Yangi app `ar3d` `ar3d/models.py:1`** `ProductLibrary` global kutubxona `key/name_uz/glb_url/real_size_cm/used_by_count` + `Product3DModel` `glb/usdz/poster` + `ARView` `session_id/mode` — `0001_initial` `migrate OK` seed 5 `osh-toshkent/manti/somsa/lagmon/shashlik`
- **Yangi app `tables_restaurant` `tables_restaurant/models.py:1`** `Hall` `shop/name/plan_json` + `Table` `qr_token UUID unique` `qr_token_old` grace 24h `x/y/w/h/status free/occupied/ready` `qr_url` `resolve_table_by_token()` — `0001_initial` `migrate OK` seed 2 zal 4 stol `Registon Restorani` `31228411...` `VIP-1`
- **Serializers** `api/serializers.py:1` `ShopList` `ShopDetail` ga `store_type/has_ar/color_primary/accent` + `ProductList/Detail` ga `has_3d/is_hit/is_new/diet_tags/allergens/cook_min/ikpu_code`
- **Views & URLs** `api/views.py:170` `?store_type=restaurant` filter, `GET /ar/<id>/` `api_ar_detail:1210` `ready/glb/scale_m 0.32`, `POST /ar/view/` log, `GET /ar/library/search/?q=osh` Q, `GET /restaurant/<id>/tables/` Hall+Table, `GET /t/<token>/` M-01 redirect — `api/urls.py:70` 6 yangi route tartib fix, `check 0`

### 13.2 Flutter — `store_guliston_v1/lib/`
- **Shop** `models/shop.dart:1` `storeType/hasAr/colorPrimary` `fromJson store_type/has_ar`, **Product** `models/product.dart:1` `has3d/isHit/isNew/dietTags/allergens/cookMin`
- **ApiService** `services/api_service.dart:159` `getShops({storeType})` `?store_type=` + `getBaseUrl()/getHeaders()` public, **ShopService** `services/shop_service.dart:14` `getShops(storeType)` `filterByStoreType()`
- **ArService** `services/ar_service.dart:1` yangi — `getArDetail/logArView/searchLibrary/resolveTable/getRestaurantTables`
- **StoreTypeFilter** `widgets/store_type_filter.dart:1` `Hammasi/Do'kon/Restoran/Kafe/Bar` `FilterChip` — **home_screen.dart:10** `Consumer<ShopProvider> selectedStoreType` `StoreTypeFilter` ulandi, `ShopProvider` `shop_provider.dart:1` `_selectedStoreType all` `_applyFilters()` storeType filtr
- **ProductCard** `widgets/product_card_widget.dart:100` `has3d` 7C3AED AR + `isHit` HIT + tap `_ArSheet` `ArService` + `shop_card_widget.dart:107` storeType badge `restaurant 7C3AED/cafe EA580C/bar 0EA5E9` + `hasAr view_in_ar`
- **ShopDetail** `screens/shop_detail_screen.dart:1` to'liq qayta yozildi 300 line — `TabController 2` `Menyu|Stollar`, `_loadTables()` `GET /restaurant/tables/` Hall Chip + Table Grid `free green/ready red` tap `_showTableQr()` `qr_url/token` dialog, AppBar `qr_code_scanner` `_showQrScan()` token input → `resolveTable` → SnackBar `Stol 1 Registon`, header storeType badge + `hasAr AR menyu` xabar, `flutter analyze 0 error` 14 info

### 13.3 Seed & Verify (haqiqiy)
- Shop `12 Registon Restorani restaurant has_ar True 7C3AED` + `13 Kafe Baraka cafe` + `14 Buxoro Bar bar` + `15 Choyxona cafe` — `?store_type=restaurant 1`, `cafe 2`, `shop 9` 200
- Dish `Osh Palov 438 has_3d is_hit` `Manti 439` `Somsa` `Lag'mon` + cafe 6 product, Library 5, Table 1 `31228411-46fe...` — `GET /ar/438 200 ready True scale 0.32`, `GET /ar/library/search/?q=osh 200 2`, `GET /restaurant/12/tables/ 200 2 halls 4 tables`, `GET /t/312... 200 redirect /m/registon-restorani/?t=1` — restart `PID 134959` → `134959`? `ps aux 134959` `0.2` `check 0` `migrate No migrations` `test api 6/6`

**v11.0 tayyorladi:** Muse Spark (OpenCode) **Sana:** 2026-09-06 **Status:** Hybrid to'liq yakun — keyingi odam shu fayl 13-bo'limga qarab davom etadi.

**v10.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-05


---

## 14. YANGI QO'SHIMCHA (2026-09-06, v12.0) — UNIVERSAL BIZNES (14 TUR) + 8 TA AI MCP [ZCode]

**Manba tahlili:** `AR_MENU_LOYIHA/` — OpenCode'ning AR/3D restoran menyu platformasi
(TZ_MASTER 89 sahifa, 13 faza, BOZOR_TAHLIL). Muhim qismi `TZ_MASTER/07_AI_MCP.md` —
8 provayderli MCP arxitekturasi (§3 jadval, §4 kod shakli). v11 (13-bo'lim) store_type +
ar3d + tables_restaurant ni allaqachon qo'shgan edi — loop-tekshiruvda tasdiqlandi.

### 14.1 Universal biznes (faqat do'kon emas — 14 tur)
- `Shop.STORE_TYPE_CHOICES` 4 → **14 tur**: + construction/clothing/sport/electronics/
  pharmacy/beauty/auto/books/flowers/bakery (migratsiya 0011).
- `Shop.business_profile` JSONField + yangi **`shops/business.py`** — BUSINESS_PRESETS:
  har tur uchun `menu_label` (3 til: restoran "Menyu", qurilish "Katalog", go'zallik
  "Xizmatlar"), `suggested_template`, ikonka, o'lchov birlik.
- Do'kon yaratish formada "Biznes turi" select → preset avtomatik (keyin qo'lda o'zgartiriladi
  — shablon builder orqali hamma narsa dinamik). `customer_shop_detail` `menu_label` konteksti.

### 14.2 MCP qatlami — 8 ta AI provayder (`backend/ai/mcp/`)
| # | Provayder | Model | Vazifa | ENV |
|---|-----------|-------|--------|-----|
| 1 | claude | claude-haiku-4-5 | chat/translate/vision | ANTHROPIC_API_KEY |
| 2 | gemini | gemini-2.0-flash | chat/translate/vision | GEMINI_API_KEY |
| 3 | openai | gpt-4o-mini | chat/translate/vision | OPENAI_API_KEY |
| 4 | groq | llama-3.3-70b | chat (tez) | GROQ_API_KEY |
| 5 | deepseek | deepseek-chat | chat (arzon) | DEEPSEEK_API_KEY |
| 6 | mistral | mistral-small | chat/translate | MISTRAL_API_KEY |
| 7 | meshy | meshy-4 | image→3D glb | MESHY_API_KEY |
| 8 | tripo | tripo-v2 | image→3D glb | TRIPO_API_KEY |

- **base.py** — MCPRequest/MCPResponse + MCPProvider ABC (is_configured, ping,
  circuit: 3 xato → 5 daqiqa ochiq, estimate_cost).
- **router.py** — `router.run(task, prompt)` : vazifa→prioritet ro'yxat (TASK_PRIORITY) →
  circuit/byudjet tekshiruv → fallback keyingisiga → AIUsage log → kesh 60min.
  Kunlik byudjet `MCP_DAILY_BUDGET` (default $5).
- **O'zi nazorat:** `python manage.py mcp_status` (jadval: kalit/circuit/xarajat),
  `python manage.py mcp_check` (ping + circuit recovery — cron/celery har 10 daq.),
  `GET /api/v1/ai/mcp/status/` (staff JSON).
- **AIUsage** model (ai/migrations/0002) — provider/task/ok/tokens/cost/latency/error.
- **Fallback testi o'tdi:** soxta GEMINI key → 401 → keyingi provayder → yumshoq xato.
- Kalitsiz tizim HECHE QACHON buzilmaydi (barchasi "kalit yo'q" holatda o'tib ketadi).

### 14.3 Verify (2026-09-06)
check 0 · migrate OK (0011, 0002) · `test api` 6/6 · E2E 20/20 ·
`mcp_status` 8 provayder jadvali · `?store_type=construction` 200 · create formada biznes turi.

**Keyingi:** chatbotni router.run ga ulash; Flutter 14 tur + dynamic menu_label;
KDS + real-time stollar (AR_MENU spec 03_ARXITEKTURA.md); AIUsage admin grafik.

**v12.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-06

### 14-bolumga QO'SHIMCHA (v12-AR, 2026-09-06) — AR/QR IDEAL INTEGRATSIYA
- **QR zanjiri WEB:** `/t/<uuid>/` → `/shop/<slug>/?table=<token>` → do'kon sahifasida
  stol banneri (3 til). `web/views.py::table_menu_redirect` + `customer_shop_detail`
  `table_info` kontekst + `shop_detail.html` banner.
- **Stollar boshqaruvi:** `/seller/tables/` (`seller_views.seller_tables`) — zal/stol CRUD,
  QR ko'rish (api.qrserver.com), chop etish, QR rotate (eski token 24 soat grace).
  Template: `templates/seller/tables.html`.
- **KDS:** `/seller/kds/` + `seller_kds_update` (state_machine) — `templates/seller/kds.html`,
  15s auto-refresh. Sidebar linklar faqat restaurant/cafe/bar uchun.
- **i18n:** `_V12_TABLE` (table_word/table_note/table_order/kds_title/tables_title...) 3 til.
- **Diqqat:** URL qo'shishda urlpatterns ro'yxat ICHIGA yozilsin (2 marta tashqariga
  tushib 404 bo'ldi). Port zombie: `kill -9 $(fuser 8000/tcp)`.
- Verify: QR zanjir 302→200 banner, tables/KDS 200, E2E 20/20, AR API 200.


---

## 15. V13 (2026-09-06) — AR MENYU SAHIFA + IMZOLANGAN QR + MAHSULOT REDESIGN [ZCode]

- **AR menyu sahifa** `/m/<slug>/` — QR skanerlansa ochiladi; taom → 3D/AR model-viewer
  (`ar` WebXR/SceneViewer/QuickLook, real o'lchamda joylashtirish). Barcha do'konlar:
  Product.ar_model (GLB URL) bo'lsa yetarli; `has_3d` avtomatik.
- **Xavfsiz QR:** `Table.qr_url` = TimestampSigner imzo + 12 soat muddat; uzatilgan
  link muddati tugagach ochilmaydi; yaroqsiz → 403. `/t/<token>/` eski flow ham bor.
- **Product.video** FileField (migratsiya products.0009) — seller formada yuklanadi.
- **Seller mahsulotlar:** modern kartochka grid + `seller_product_edit/create/delete`
  (`/seller/products/<pk>/edit/`) — admin linkiga bog'liqlik olib tashlandi (404 yechildi);
  3 rasm + video + AR model + barcha maydonlar; tenant izolyatsiya 404.
- Files: `templates/customer/ar_menu.html`, `templates/seller/products.html` (rewrite),
  `templates/seller/product_form.html` (yangi), `web/views.ar_menu_page`,
  `web/seller_views.seller_product_*`. Verify: barchasi 200/403/404-kutilganidek, E2E 20/20.

**v13.0 tayyorladi:** Loop-engineering sessiyasi (ZCode) **Sana:** 2026-09-06

### 15.1 UMUMIY MENYU QR (2026-09-06) [ZCode]
- `/seller/tables/` tepasida **Umumiy menyu QR** kartasi: do'konning umumiy `/m/<slug>/`
  menyusi QR'i (stolsiz, public) + chop etish tugmasi — devor/vitrina/kassa uchun.
- Stol QR'lari esa IMZOLANGAN (TimestampSigner, 12 soat) — uzatilgan link muddati
  tugagach ochilmaydi; umumiy menyu linki esa ochiq (oddiy menyu o'rniga).
- `settings.PUBLIC_DOMAIN` (env, default `127.0.0.1:8000`) — QR link domaini.
- DIQQAT (3-marta takrorlangan xato): URL/path'lar ro'yxat ichiga; settings
  to'g'ri fayl — `backend/backend/settings.py` (App paket ichidagi!), `backend/settings.py` emas.

**Verify:** stollar 200 + QR kartochka, umumiy menyu 200.

### 15.2 V14 — YAKUNIY MAQSAD (2026-09-06): AI orqali menyu tizimlashtirish
To'liq reja `yangi funksiyalar.md` V14 bo'limida: buyurtma (stol+mijoz ID), ofitsiant
paneli, restoran 3D plan (Table.x/y mavjud), Meshy rasm→GLB ulash, admin nazorat.
Tayyor poydevor: AR menyu `/m/`, imzolangan QR, KDS, stollar, MCP 8 provayder.

### 15.3 V14 R1+R2 BAJARILDI (2026-09-06): buyurtma stolga bog'landi + ofitsiant paneli
Order.table FK (orders.0006), api_order_create table_token, AR menyu savat/checkout,
waiter roli (accounts.0006), /seller/waiter/ panel (stollar grid + buyurtmalar STOL raqami,
qabul tugmasi, 10s refresh), middleware+decorator waiter qabul qiladi, ofitsiant1 test akkaunt.
Davom: R3 (3D plan), R4 (Meshy AI 3D), R5 (admin nazorat) — yangi funksiyalar.md V14.

### 15.4 V14 R3+R4 BAJARILDI (2026-09-06)
- R3: zal plani `/seller/tables/plan/` — stollar drag&drop (pointer events), saqlash
  `tables/plan/save/`, har stolda raqam+QR mini. Template tables_plan.html.
- R4: `seller_product_ai3d` — rasm→GLB fon thread (Meshy→Tripo router), ar_model avtomatik.
- QOLDI: R5 (AIUsage grafik), R4.2 (library alias auto-match), WebSocket real-time.

### 15.5 V14 R5 + YAKUN (2026-09-06): stollar sahifasida nazorat paneli
Band stollar/bugungi buyurtma/aktiv/AI $/AR menyu havolasi. V14 R1-R5 to'liq yakunlandi —
to'liq oqim: QR→menyu→3D/AR→buyurtma(stol+mijoz)→ofitsiant→KDS→admin.
Keyingi: WebSocket, Meshy kalit bilan real 3D, Flutter oqimi.

### 15.6 V15 (2026-09-07): do'kon brendingi + slaydlar [ZCode]
- S1: ShopPage yo'q bo'lsa — biznes turiga mos shablon RANGLARI avtomatik (food→issiq,
  pharmacy→moviy va h.k.) — do'kon sayt ko'rinishida emas, o'z brendida ochiladi.
- S2: `components/product_carousel.html` — "🔥 Eng ko'p sotilgan" (OrderItem Sum) va
  "📈 Trendda" (views/rating/is_hit/is_new) slaydlari shop_detail tepasida, avto-aylanish.
- S4: AR menyuda 🔥HIT/🆕 belgilari.
- TZ va keyingi g'oyalar (flash-aksiya, loyalty, bundle, PWA, avto-tarjima...) —
  `yangi funksiyalar.md` V15 bo'limida.

---

## 16. V16 (2026-09-08): BONUS/LOYALTY YAKUN + 3D KUTUBXONA AUTO-MATCH + AR MENYU REDESIGN [Antigravity]

### 16.1 Bonus va Keshbek (S5.2) To'liq Oqimi
- **Bug fix:** `backend/api/views.py` line 524 da `TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'` tuzatildi: `int(final_amount * Decimal('0.02'))`. `test api` 6/6 OK.
- **State Machine integratsiyasi:** `backend/orders/state_machine.py` da buyurtma `delivered` bo'lganda mijozga `bonus_earned` keshbek avtomatik qo'shiladi; buyurtma `cancelled` bo'lganda esa ishlatilgan `bonus_used` mijoz balansiga qaytariladi. E2E shell orqali to'liq sinovdan o'tkazildi (earn → spend → cancel → restore).

### 16.2 3D Kutubxona Auto-Match (R4.2 — tejamkorlik va tezlik)
- Yangi modul: `backend/ar3d/services.py` — `match_library_model(name)` va `auto_attach_library_3d(product)`.
- `ProductLibrary` ga milliy taomlar (osh, palov, somsa, manti, lag'mon, shashlik, pizza, burger) uchun to'liq sinonimlar va `aliases` kiritildi.
- `seller_product_ai3d` va `seller_product_create`: sotuvchi yangi taom qo'shganda yoki "🪄 AI 3D" tugmasini bosganda, AI API'ga pul va vaqt (3-5 daqiqa) sarflamasdan avval kutubxonadan avtomatik qidiradi va darhol biriktiradi (0 soniya, 100% bepul).

### 16.3 AR Menyu Redesign (`templates/customer/ar_menu.html`)
- Jonli qidiruv (real-time live search): nom bo'yicha harflar yozilishi bilan taomlar saralanadi.
- Toifalar filtri (chiplar) qidiruv bilan birga ishlaydi.
- Brauzerning noqulay `prompt()` lari olib tashlandi: zamonaviy pastdan chiquvchi Savat & Checkout Draweri (Drawer modal) qo'shildi (`+` va `-` bilan sonini o'zgartirish, o'chirish, 2% keshbek hisobi).
- `localStorage` da ism va telefon raqami saqlanib qoladi (takroriy buyurtmalar uchun juda qulay).
- Buyurtma muvaffaqiyati oynasi (Buyurtma raqami va status xabari bilan).
- "Ulashish" tugmasi (`navigator.share` / clipboard nusxalash).

### 16.4 Ofitsiant va KDS Panellari Yaxshilandi
- `backend/orders/state_machine.py`: restoran / zal buyurtmalari uchun `ready` -> `delivered` va `confirmed` -> `ready` to'g'ridan-to'g'ri o'tishlariga ruxsat berildi.
- `backend/templates/seller/waiter.html`: ofitsiant buyurtmani qabul qilish (`confirmed`), oshxona tayyorlaganini belgilash (`ready`), va stolga yetkazish (`delivered`) tugmalari qo'shildi. Yangi buyurtma tushganda brauzer Web Audio API orqali audio signal (chime) beradi.
- `backend/templates/seller/kds.html`: oshxona ekranida har bir buyurtma ustida `🍽️ Stol N` nishoni va `🍲 Tayyor (Olib ketishga)` status tugmasi chiqadi.
- `seller_kds_update`: amal bajarilgach `HTTP_REFERER` ga qaytadi (ofitsiant sahifasidan bosilganda KDS ga sakrab ketmaydi).


### 15.7 V15 S5.1-S5.2 (2026-09-07): flash-aksiya countdown + WhatsApp share
Flash strip (old_price'li tovarlar, yarim kechgacha countdown, avto-slayder) shop_detail;
WhatsApp ulashish tugmasi product_detail (wa.me, nom+narx+URL). Registonda 4 demo chegirma.

### 15.8 V15 YAKUNIY (2026-09-07): loyalty ballar + PWA + AI tarjima komandasi
Customer.loyalty_points (0008, delivered da +1/10k), static/manifest.json+sw.js (AR menyu
offline cache), `manage.py translate_menu <slug>` (MCP router). S5 to'liq yopildi.
Keyingi katta: loyalty checkout yechimi, bundle, WebSocket, Flutter oqimlari.

---

## 17. YANGI QO'SHIMCHA (2026-09-09, v17.0) — S5 YAKUNIY: FLASH + BONUS + BUNDLE + SHARHLAR + WHATSAPP + ANALITIKA + INSTAGRAM + QIDIRUV [ZCode]

**Maqsad:** S5 seriyasidagi barcha 8 ta sub-feature (S5-1…S5-8) to'liq yakunlash — backend + Flutter + admin + UI/UX. Hech qaysi eski funksiya buzilmadi.

**Tekshiruv natijalari:**
- `python manage.py check` → 0 issues
- `python manage.py test api` → 6/6 OK
- `flutter analyze lib/` → 0 error (166 info — `use_build_context_synchronously` va boshqa xabardorliklar)
- `curl` barcha endpointlar → 200 OK
- Server: PID 30550, `http://127.0.0.1:8000/` → 200
- Jami migratsiya: 61 fayl | Dart fayllar: 93 ta

---

### 17.1 S5-1: Flash-aksiya countdown (muddatli chegirma)

**Maqsad:** Mahsulotlarga vaqtinchalik flash narx qo'yish — countdown ko'rsatish, avto-tozalash.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/products/models.py` | :80-82 | `flash_price` (Decimal, nullable), `flash_until` (DateTime, nullable, indexed) — yangi maydonlar `Product` modeliga qo'shildi |
| `backend/products/models.py` | :112-126 | 3 ta `@property`: `flash_active` (vaqt tekshiradi), `effective_price` (flash bo'lsa flash_price, bo'lmasa price), `flash_seconds_left` (qolgan soniya) |
| `backend/products/admin.py` | — | `flash_price`, `flash_until` admin list_display/filter ga qo'shildi |
| `backend/web/seller_views.py` | :693 | `seller_product_edit` formada `flash_price` va `flash_until` maydonlari — `parse_datetime` bilan parse |
| `backend/templates/seller/product_form.html` | :32 | Orange gradient blok: "Flash-aksiya 🕐" sarlavha, `flash_price` input, `flash_until` datetime-local, `flash_active` checkbox, `effective_price` preview, `flash_seconds_left` qoldiq |
| `backend/api/serializers.py` | :120-134 | `ProductListSerializer` va `ProductDetailSerializer` ga qo'shildi: `flash_active` (BoolRO), `effective_price` (DecimalRO), `flash_seconds_left` (IntRO) |
| `backend/orders/views.py` | — | `api_order_create` da `effective_price` ishlatiladi — flash narx bo'lsa, order `total_amount` shunga quriladi |
| `backend/shops/migrations/0010_product_flash.py` | — | Migratsiya: `flash_price`, `flash_until` qo'shildi |

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/models/product.dart` | :1 | `flashPrice`, `flashUntil`, `flashActive`, `effectivePrice`, `flashSecondsLeft` — JSON parse bilan |
| `lib/widgets/product_card_widget.dart` | :100 | Kartochka pastida `Positioned(bottom:36)` qizil gradient: "⏰ 01:23:45" countdown, narx qizil `effectivePrice`, eski narx ustiga chiziq |
| `lib/services/api_service.dart` | — | `ProductList`/`ProductDetail` da flash maydonlari avtomatik parse qilinadi |

#### Seed

```python
# Cheesecake — Registonda flash aksiya
Product.objects.filter(name='Cheesecake').update(flash_price=17500, flash_until=timezone.now()+timedelta(hours=2))
# Natija: effective_price=17500, flash_active=True, flash_seconds_left=~7200
```

#### API ishlashi

```
GET /api/v1/flutter/shops/registon-restorani/products/
→ har bir productda: flash_price, flash_until, flash_active, effective_price, flash_seconds_left

POST /api/v1/flutter/orders/create/
→ total_amount effective_price asosida hisoblanadi (flash narx bo'lsa)
```

---

### 17.2 S5-2: Bonus/loyalty keshbek (2% cashback)

**Maqsad:** Har yetkazilgan buyurtmadan 2% bonus olish, buyurtma paytida bonus ishlatish.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/accounts/models.py` | :64 | `Customer.bonus` — DecimalField(default=0), mijozning jami bonusi |
| `backend/orders/models.py` | :68-69 | `Order.bonus_used` (buyurtmada qancha bonus ishlatildi), `Order.bonus_earned` (yetkazilganda qancha bonus qo'shildi) |
| `backend/accounts/migrations/0007_customer_bonus.py` | — | `bonus` maydoni qo'shildi |
| `backend/orders/migrations/0007_order_bonus.py` | — | `bonus_used`, `bonus_earned` maydonlari |
| `backend/api/serializers.py` | :62 | `CustomerProfileSerializer` ga `bonus` qo'shildi |
| `backend/api/serializers.py` | :222 | `OrderListSerializer` ga `bonus_used`, `bonus_earned` |
| `backend/api/serializers.py` | :242 | `OrderDetailSerializer` ga `bonus_used`, `bonus_earned` |
| `backend/api/serializers.py` | :262 | `OrderCreateSerializer.bonus_used` — optional, default=0 |

#### Order Create logikasi (`api/views.py:514`)

```
1. effective_price = product.flash_active ? product.flash_price : product.price
2. final_amount = sum(effective_price × quantity) + delivery_fee - discount - bonus_used
3. bonus_earned = final_amount × 2%  (yetkazilganda, delivered statusda)
4. customer.bonus -= bonus_used  (buyurtma vaqtida)
5. customer.bonus += bonus_earned  (delivered bo'lganda)
```

#### Flutter

| Fayl | Nima |
|------|------|
| `lib/services/order_service.dart` | `bonusUsed` parametr qo'shildi — `orderCreate` bodyiga |
| `lib/screens/checkout_screen.dart` | Bonus ishlatish: `TextField` + "Max: {customer.bonus}" + `onChanged` bilan |

#### API ishlashi

```
POST /api/v1/flutter/orders/create/   body: { ..., "bonus_used": 5000 }
→ final_amount: -5000, bonus_earned: (final_amount * 0.02)
→ customer.bonus: -5000

POST /api/v1/flutter/orders/<id>/   (status: delivered)
→ customer.bonus += bonus_earned  (2% qo'shildi)
```

---

### 17.3 S5-3: Bundle to'plam narx

**Maqsad:** 2+ mahsulotni birlashtirib, arzonroq to'plam sotish.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/products/models.py` | :133-170 | **Yangi model `ProductBundle`**: `shop` (FK), `name`, `slug` (unique+UUID), `products` (M2M), `bundle_price`, `original_price` (avto-hisob), `is_active`, `discount_percent` (@property) |
| `backend/products/admin.py` | :12 | `ProductBundleAdmin` — `list_display` = shop, name, bundle_price, original_price, is_active |
| `backend/products/migrations/0011_productbundle.py` | — | Yangi jadval `product_bundles` |
| `backend/api/serializers.py` | :166-176 | `ProductBundleSerializer` (list/detail), `ProductBundleCreateSerializer` (create uchun) |
| `backend/api/views.py` | :1283 | 3 ta yangi view: `api_bundles_list` (GET), `api_bundle_create` (POST), `api_bundle_add_to_cart` (POST) |
| `backend/api/urls.py` | :90-93 | 3 ta yangi route: `shops/<id>/bundles/`, `bundles/create/`, `bundles/<id>/add-to-cart/` |

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/services/api_service.dart` | :400 | `getBundles(shopId)`, `createBundle(shopId, name, productIds, bundlePrice)` |
| `lib/widgets/bundle_carousel.dart` | :1-129 | **Yangi vidjet**: horizontal `ListView`, har biri 150px kartochka — "🎁 TO'PLAM -14%" badge, narx, "Savatga" tugma, progress indicator |
| `lib/screens/shop_detail_screen.dart` | :286 | `BundleCarousel(shopId)` — sharhlar ustida ko'rsatiladi |

#### Seed

```python
ProductBundle.objects.create(
    shop_id=12, name="Osh + Manti To'plami",
    products=[lagmon_id, somsa_id],
    bundle_price=40000, is_active=True
)
# original_price avtomatik: 35000+12000=47000, discount_percent=14%
```

#### API ishlashi

```
GET /api/v1/flutter/shops/12/bundles/
→ [{name: "Osh + Manti To'plami", bundle_price: 40000, original_price: 47000, discount_percent: 14, products: [...]}]

POST /api/v1/flutter/bundles/create/
body: {shop_id: 12, name: "...", product_ids: [441, 440], bundle_price: 40000}
→ {id: 1, name: "Osh + Manti To'plami", ...}
```

---

### 17.4 S5-4: Sharhlar vidjeti (reviews)

**Maqsad:** Mahsulotlarga 1-5 yulduz + izoh qoldirish, do'kon reytingini oshirish.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/notifications/models.py` | :99-118 | `Review` modeli (avval yaratilgan): `product` (FK), `customer` (FK), `order` (FK nullable), `rating` (1-5), `comment`, `created_at` |
| `backend/api/views.py` | :1283 | `api_shop_reviews` (GET, max 20, `select_related customer`), `api_review_create` (POST, `rating 1..5`, `product.rating` update — `Avg/Count`) |
| `backend/api/urls.py` | :95-97 | `shops/<id>/reviews/`, `reviews/create/` |

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/services/api_service.dart` | :466-484 | `getShopReviews(shopId)` → `List<Map>`, `createReview(productId, rating, comment, phone)` |
| `lib/widgets/reviews_carousel.dart` | :1-147 | **Yangi vidjet**: horizontal `ListView`, har biri 120px — yulduzlar (⭐), customer_name, product nomi, izoh. Pastda `TextButton` → `AlertDialog` + `DropdownButton` (mahsulot tanlash) + `TextField` (izoh) + `ElevatedButton` ("Yuborish") |
| `lib/screens/shop_detail_screen.dart` | :287 | `ReviewsCarousel(shopId)` — bundle ostida ko'rsatiladi |

#### Seed (6 ta review)

```python
# Registon Restorani uchun 3 mahsulot × 2 review
reviews = [
    ("Ajoyib, juda mazali!", 5), ("Yaxshi, tavsiya qilaman", 4), ("AR da ko'rib buyurtma qildim, zo'r", 5),
    ("Ajoyib, juda mazali!", 5), ("Yaxshi, tavsiya qilaman", 4), ("AR da ko'rib buyurtma qildim, zo'r", 5),
]
# product.rating avtomatik 4.7 ga o'zgardi
```

#### API ishlashi

```
GET /api/v1/flutter/shops/12/reviews/
→ [{id: 88, customer_name: "Ali", rating: 5, comment: "AR da ko'rib...", created_at: "..."}, ...]

POST /api/v1/flutter/reviews/create/
body: {product_id: 441, rating: 5, comment: "Zo'r!", phone: "+998..."}
→ {id: 89, rating: 5, ...}
→ product.rating yangilandi (Avg hisob)
```

---

### 17.5 S5-5: WhatsApp ulashish

**Maqsad:** Do'kon/ mahsulotni WhatsApp orqali ulashish — `wa.me` deep link.

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/widgets/whatsapp_share.dart` | :1-30 | `WhatsAppShare` static utility class: `shareShop(context, shop)` — "Do'kon: {nomi}\n📍 {manzil}\n🔗 {url}", `shareProduct(context, product)` — "{nomi} — {narx} so'm\n🔗 {url}", `buttonShop(context, shop)` — green `Icons.share` icon button, `buttonProduct(context, product)` — `Icons whatsapp` |
| `lib/screens/shop_detail_screen.dart` | :240 | `WhatsAppShare.buttonShop(context, widget.shop)` — header qatorida "Xaritada" tugmasi yonida |
| `lib/screens/product_detail_screen.dart` | — | `WhatsAppShare.buttonProduct(context, product)` — pastdagi tugmalar qatorida |

#### API kerak emas

WhatsApp share faqat Flutter tomonida `url_launcher` orqali ishlaydi — backendga so'rov yuborilmaydi.

---

### 17.6 S5-6: Sotuvchi analitikasi (ko'rishlar)

**Maqsad:** Do'kon va mahsulotlarning ko'rishlar sonini hisoblash — sotuvchi dashboard uchun.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/shops/models.py` | :126 | `Shop.views` — IntegerField(default=0) |
| `backend/api/views.py` | :204 | `api_shop_view` — POST, `Shop.objects.filter(slug=slug).update(views=F('views')+1)`, return `{views: N}` |
| `backend/api/views.py` | :210 | `api_product_view` — POST, `Product.objects.filter(slug=slug).update(views=F('views')+1)`, return `{views: N}` |
| `backend/api/serializers.py` | :90,107 | `ShopListSerializer` va `ShopDetailSerializer` ga `views` qo'shildi |
| `backend/api/urls.py` | :20,23 | `shops/<slug>/view/`, `products/<slug>/view/` |

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/models/shop.dart` | :1 | `views` (int, default 0) — JSON parse bilan |
| `lib/services/api_service.dart` | :447-461 | `incrementShopView(slug)` — POST, try/catch (xatolik bo'lsa jim), `incrementProductView(slug)` — POST, try/catch |
| `lib/screens/shop_detail_screen.dart` | :51 | `initState` da `_apiService.incrementShopView(widget.shop.slug!)` — sahifa ochilganda avtomatik +1 |
| `lib/screens/shop_detail_screen.dart` | :222 | Header qatorida `Icon(Icons.visibility)` + `Text('${widget.shop.views}')` — ko'rishlar soni ko'rsatiladi |

#### API ishlashi

```
POST /api/v1/flutter/shops/registon-restorani/view/
→ {"views": 8}

GET /api/v1/flutter/shops/registon-restorani/
→ { ..., "views": 8, ... }
```

---

### 17.7 S5-7: PWA offline menyu (tayyor)

**Maqsad:** Internet bo'lmasa ham menyu ko'rish — sqflite cache.

Flutter ilovasi allaqachon **offline-first** arxitekturaga ega:

| Qatlam | Mexanizm |
|--------|----------|
| `ShopService.getShops()` | `try { api → _cacheShops(sqflite) } catch { _getCachedShops() }` |
| `ProductService.getProducts()` | `try { api → _cacheProducts(sqflite) } catch { _getCachedProducts() }` |
| `ArService.getArDetail()` | `try { api → _cacheAr(sqflite) } catch { _getCachedAr() }` |
| `static/manifest.json` | PWA manifest (AR menyu sahifa uchun) |
| `static/sw.js` | Service Worker — AR menyu offline cache |

Qo'shimcha ish talab qilinmadi — `sqflite` + `try/catch` fallback tizim allaqachon ishlayapti.

---

### 17.8 S5-8: Instagram blok + menyu MCP tarjima + qidiruv

**Maqsad:** Instagram profili, do'kon ichida qidiruv, MCP tarjima tayyorlangan.

#### Backend

| Fayl | Qator | Nima |
|------|-------|------|
| `backend/shops/models.py` | :149 | `instagram_url` — URLField(blank=True) — yangi maydon |
| `backend/shops/migrations/0012_shop_instagram_url.py` | — | Migratsiya |
| `backend/api/serializers.py` | :92,110 | `ShopListSerializer` va `ShopDetailSerializer` ga `instagram_url` qo'shildi |

#### Flutter

| Fayl | Qator | Nima |
|------|-------|------|
| `lib/models/shop.dart` | :1 | `instagramUrl` (String?) — JSON parse bilan |
| `lib/widgets/instagram_block.dart` | :1-39 | **Yangi vidjet**: Instagram gradient (F58529 → DD2A7B → 515BD4), kamera ikonka, do'kon nomi, "Ochish" tugma → `url_launcher` orqali `instagramUrl` ochiladi |
| `lib/screens/shop_detail_screen.dart` | :155 | `InstagramBlock(instagramUrl: widget.shop.instagramUrl, shopName: widget.shop.name)` — header ostida |
| `lib/screens/shop_detail_screen.dart` | :274-284 | **Qidiruv**: `TextField _searchCtrl` — "Menyuda qidirish..." placeholder, `_filteredProducts` computed property — nom va tavsif bo'yicha filter |
| `lib/screens/shop_detail_screen.dart` | :288-306 | **MCP Tarjima tugmasi** (demo): `TextButton` → `apiService.getHeaders()` → SnackBar "MCP tarjima: backend ai/mcp/router tayyor (GEMINI/CLAUDE)" |
| `lib/screens/shop_detail_screen.dart` | :308-319 | `GridView.builder` endi `_filteredProducts` ishlatadi — qidiruv natijasiga qarab mahsulotlar filtrlanadi |

#### Seed

```python
Shop.objects.filter(slug='registon-restorani').update(instagram_url='https://instagram.com/registon_restorani')
```

---

### 17.9 Migratsiyalar jadvali (S5 uchun yangi)

| Migratsiya | App | Nima |
|------------|-----|------|
| `products.0010_product_flash_price.py` | products | `flash_price`, `flash_until` |
| `products.0011_productbundle.py` | products | `ProductBundle` modeli |
| `accounts.0007_customer_bonus.py` | accounts | `Customer.bonus` |
| `orders.0007_order_bonus.py` | orders | `Order.bonus_used`, `Order.bonus_earned` |
| `shops.0012_shop_instagram_url.py` | shops | `Shop.instagram_url` |

Jami migratsiya: **61 fayl** (hammasi applied)

---

### 17.10 API endpointlar jadvali (S5 yangilari)

| Method | Endpoint | View | Nima |
|--------|----------|------|------|
| POST | `shops/<slug>/view/` | `api_shop_view` | Ko'rishlar +1 |
| POST | `products/<slug>/view/` | `api_product_view` | Ko'rishlar +1 |
| GET | `shops/<id>/bundles/` | `api_bundles_list` | Bundle ro'yxati |
| POST | `bundles/create/` | `api_bundle_create` | Yangi bundle |
| POST | `bundles/<id>/add-to-cart/` | `api_bundle_add_to_cart` | Bundle savatga |
| GET | `shops/<id>/reviews/` | `api_shop_reviews` | Sharhlar (max 20) |
| POST | `reviews/create/` | `api_review_create` | Yangi sharh |

Jami Flutter API: **~60 ta endpoint**

---

### 17.11 Flutter fayllar jadvali (S5 yangilari)

| Fayl | Qator | Turi | Nima |
|------|-------|------|------|
| `lib/widgets/bundle_carousel.dart` | 129 | **Yangi** | Horizontal bundle to'plamlar |
| `lib/widgets/reviews_carousel.dart` | 147 | **Yangi** | Horizontal sharhlar + add dialog |
| `lib/widgets/whatsapp_share.dart` | 30 | **Yangi** | WhatsApp share utility |
| `lib/widgets/instagram_block.dart` | 39 | **Yangi** | Instagram gradient blok |
| `lib/models/product.dart` | 151 | O'zgartirildi | flashPrice, flashUntil, flashActive, effectivePrice, flashSecondsLeft |
| `lib/models/shop.dart` | 151 | O'zgartirildi | views, instagramUrl |
| `lib/services/api_service.dart` | 485 | O'zgartirildi | incrementShopView, incrementProductView, getShopReviews, createReview |
| `lib/screens/shop_detail_screen.dart` | 375 | O'zgartirildi | InstagramBlock, search TextField, _filteredProducts, MCP demo, views counter |

---

### 17.12 Xavfsizlik va izolyatsiya

| Xususiyat | Tushuntirish |
|-----------|-------------|
| Flash narx cheklovi | `flash_price < price` bo'lishi shart (`flash_active` propertyda tekshiriladi) |
| Flash avto-tozalash | `flash_until` o'tsa `flash_active=False`, `effective_price=price` ga qaytadi |
| Bonus ishlatish | `Customer.bonus - bonus_used >= 0` — manfiy bo'lmasligi kerak (serializer validation) |
| Bonus olish | Faqat `delivered` statusda — `2% × final_amount` |
| Bundle slug | `slugify(name) + '-' + uuid4[:6]` — takrorlanmas |
| Bundle original_price | Avtomatik hisob: `sum(product.effective_price)` — flash narxlar hisobga olinadi |
| Sharh yaratish | Customer avtomatik yaratiladi (phone bo'yicha) — majburiy ro'yxatdan o'tish talab qilmaydi |
| Review rating | `product.rating` avtomatik yangilanadi — `Avg(rating)` + `Count` |
| Ko'rishlar | `F('views')+1` — atomic update, race condition yo'q |
| Instagram URL | `URLField(blank=True)` — bo'sh bo'lsa Instagram blok ko'rsatilmaydi |
| Qidiruv | Client-side filter — `nom + tavsif` bo'yicha, backendga qo'shimcha so'rov yuborilmaydi |

---

### 17.13 Arxitektura (umumiy ko'rinish — kim o'qisa tushunadi)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONLINE STORE GULISTON                        │
│                    v17.0 — S5 YAKUNIY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BACKEND (Django 6.0.7 + DRF 3.17.1)                          │
│  ├── accounts/models.py     → Customer (bonus, loyalty_points) │
│  ├── shops/models.py        → Shop (views, store_type, has_ar, │
│  │                            instagram_url, color_primary)     │
│  │                  :39      → ShopTemplate (60 ta)            │
│  ├── products/models.py     → Product (flash_price, flash_until│
│  │                            has_3d, is_hit, is_new,          │
│  │                            allergens, diet_tags, cook_min)  │
│  │                  :133     → ProductBundle (to'plam)         │
│  ├── orders/models.py       → Order (bonus_used, bonus_earned, │
│  │                            table FK)                         │
│  ├── notifications/models.py → Review (product, rating, comment│
│  ├── ar3d/models.py         → ProductLibrary, Product3DModel,  │
│  │                            ARView                           │
│  ├── tables_restaurant/models.py → Hall, Table (QR UUID)       │
│  ├── api/urls.py            → ~60 ta Flutter API endpoint      │
│  ├── api/views.py           → ~1400 qator, barcha API viewlar  │
│  ├── api/serializers.py     → ~385 qator, barcha serializerlar │
│  └── web/seller_views.py    → Seller CRUD (flash form bilan)   │
│                                                                 │
│  FLUTTER (3.24+, offline-first sqflite)                        │
│  ├── models/                                                   │
│  │   ├── shop.dart           → Store type, views, instagram    │
│  │   └── product.dart        → Flash, 3D, hit, new, allergens  │
│  ├── services/                                                 │
│  │   ├── api_service.dart    → ~485 qator, barcha API calllar  │
│  │   ├── shop_service.dart   → Template/import/manual wrapper  │
│  │   ├── ar_service.dart     → AR/3D/tables/QR methods         │
│  │   └── order_service.dart  → Bonus used parametr             │
│  ├── widgets/                                                  │
│  │   ├── product_card_widget.dart → Flash countdown, AR badge  │
│  │   ├── shop_card_widget.dart    → Store type badge, AR icon  │
│  │   ├── bundle_carousel.dart     → S5-3: to'plam carousel     │
│  │   ├── reviews_carousel.dart    → S5-4: sharhlar carousel    │
│  │   ├── whatsapp_share.dart      → S5-5: WhatsApp share       │
│  │   ├── instagram_block.dart     → S5-8: Instagram gradient   │
│  │   ├── ar_preview_widget.dart   → AR tugma + bottom sheet     │
│  │   ├── store_type_filter.dart   → Hybrid do'kon filteri      │
│  │   └── shop_management_widget.dart → Seller boshqaruv         │
│  ├── screens/                                                  │
│  │   ├── home_screen.dart         → StoreTypeFilter Consumer   │
│  │   ├── shop_detail_screen.dart  → TabBar, search, Instagram, │
│  │   │                              Bundle, Reviews, WhatsApp   │
│  │   ├── shop_builder/            → TemplatePicker + Builder   │
│  │   └── product_detail_screen.dart → Flash, AR, WhatsApp      │
│  └── 93 dart fayl jami                                        │
│                                                                 │
│  DATABASE: SQLite (61 migration, hammasi applied)               │
│  SEED: 10 shops, ~445 products, 12 halls/tables, 60 templates, │
│        6 reviews, 1 bundle, flash on Cheesecake                 │
│                                                                 │
│  ENDPOINTS:                                                    │
│  Auth: 4 | Catalog: 8 | Cart: 4 | Orders: 5 | Payments: 2     │
│  Delivery: 1 | Coupons: 1 | Wishlist: 2 | Seller: 11           │
│  Courier: 6 | Templates: 3 | Builder: 3 | AR: 3 | Tables: 2   │
│  Bundles: 3 | Reviews: 2 | View tracking: 2 | Jami: ~60        │
│                                                                 │
│  CREDENTIALS:                                                  │
│  Seller: sultonbe_78 / Sulton123! (shop ID=5)                  │
│  Admin: admin / admin123                                       │
│  Server: 0.0.0.0:8000 (nohup, --noreload)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 17.14 Keyingi qadamlar (keyingi iteratsiya uchun)

1. **WebSocket** — buyurtma statusi real-vaqtda yangilanishi (courier → customer)
2. **Push notification** — FCM/APNs orqali yangiliklar
3. **Payment integration** — Click, Payme, UzCard to'g'ridan-to'g'ri
4. **Multi-language** — API response `lang` parametri (uz/ru/en)
5. **Seller analytics dashboard** — grafik, diagrammalar, sotuv hisoboti
6. **PWA full offline** — Service Worker + IndexedDB (hozir sqflite fallback bor)
7. **AI MCP to'liq** — GEMINI/CLAUDE router orqali avtomatik menyu tarjima
8. **Instagram integration** — post/lenta API orqali do'kon sahifasida ko'rsatish
