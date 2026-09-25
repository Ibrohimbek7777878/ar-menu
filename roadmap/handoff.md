# HANDOFF — Online Store Guliston (Guliston & Yangi Yer giper-lokal marketplace)

**Oxirgi yangilanish:** 2026-09-08 (v16.0 — Bonus to'liq oqimi + 3D Library auto-match + AR menyu live search & cart drawer + Ofitsiant/KDS yangilanishi)
**Versiya:** 16.0 — Universal marketplace + AR/QR restoran + AI MCP + Bonus/Loyalty
**Umumiy holat:** Django + Flutter bog'langan, server run (0 error), test api 6/6 OK.

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

