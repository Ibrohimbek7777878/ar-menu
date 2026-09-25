# TZ — Do'kon yaratish (60 shablon + Figma preview + 2 usul mahsulot joylash)

**Maqsad:** User o'zi 60 ta tayyor dizayndan birini Figma/sayt ko'rinishida ko'rib tanlaydi, mahsulotlarga qarab moslashtiradi, **Generate & Ustanovit** bosganda do'kon dizayni ajraladi. Mahsulotlar 2 usulda joylanadi.

---

## 1. 60 ta shablon

- **Kategoriyalar (20 × 3 = 60):** Minimal, Modern, Classic, Bold, Elegant, Minimalist, Creative, Corporate, Fashion, Food, Electronics, Grocery, Pharmacy, Beauty, Sports, Home, Automotive, Books, Kids, Pets — har biridan 3 variant (Light / Dark / Pro).
- **Har shablon tarkibi:** `preview_image` (desktop), `preview_mobile`, `preview_desktop`, `default_layout` (sectionlar), `default_colors` (primary/secondary/accent/bg/surface/text), `default_fonts`, `available_sections`, `tags`, `required_plan` (basic/pro).
- **Saqlash:** `shops.ShopTemplate` (`shop_templates` jadvali), admin orqali CRUD, `ordering = [category, sort_order]`.
- **Figma/Preview:** Shablon kartasida ranglardan placeholder (agar rasm yo'q bo'lsa) + `previewUrl` → `Image.network` bilan real Figma-screenshot ko'rinishi. Grid `GridView 2 ustun`, kategoriya `FilterChip`.

## 2. Tanlash va moslashtirish oqimi (Flutter)

```
Do'kon yaratish → Shablon tanlash (TemplatePickerScreen) → Moslashtirish (ShopBuilderScreen) → Generate
```

- **Picker:** 20 ta kategoriya chip + 60 ta karta, `Figmasimon` preview, `Pro` belgisi, tanlanganda `Navigator.pop(slug)` qaytadi.
- **Builder:** 
  - Yuqorida `TabBar: Mobil / Desktop` + `shablon` (palette) + `saqlash` tugmalari.
  - Markazda preview: `_isMobile ? 390px : 900px` konteyner, ichida `ReorderableListView` sectionlar.
  - `FAB +` → dialog 8 ta section turi: hero, product_grid, category_strip, banner, map, reviews, cta, richtext.
  - Har section `Card + ListTile + yuqoriga/pastga/o'chirish` ikonkalari, `drag & drop` bilan tartib o'zgaradi.
  - Shablon o'zgarsa — `getTemplateDetail(slug)` dan `defaultLayout` qayta yuklanadi.

## 3. Generate & Ustanovit

- **API:** `POST /api/v1/flutter/templates/apply/ { template_slug }` (IsAuthenticated).
- **Backend:** `ShopPage.objects.get_or_create(shop=shop)` → `page.template = slug`, `page.layout = template.get_default_layout()`, `save()`.
- **Natija:** Do'kon sahifasi `ShopPage.template + layout JSON` bilan ajraladi, `customer/shop_detail.html` shu layoutdan render qiladi. Keyin do'kon `is_published=True` bilan live.

## 4. Mahsulot joylash — 2 usul

**A) Qolda har birini alohida joylashtirish (Manual)**
- Builderda `product_grid` section → `product_filter` (kategoriya / tanlangan IDlar) + `limit` tanlanadi.
- Yoki seller panelda mahsulotni birma-bir `drag & drop` bilan sectionga biriktirish (keyingi bosqich: `ShopPageSectionProduct` M2M).

**B) Mavjud akkauntdagi mahsulotlarni export qilish (Auto)**
- `POST /api/v1/flutter/shops/{id}/import-products/` (seller): `source_shop_id` → `Product.objects.filter(shop=source).update(shop=target)` yoki klonlash (rasklon).
- Flutterda: Seller dashboard → "Mavjud mahsulotlarni import" → o'zining eski do'konlari ro'yxati → tanlab `Export` → yangi do'konga ko'chadi.
- MVP hozir: `ShopService.applyTemplate` dan keyin avtomatik `shop.products` bo'sh bo'lsa, eski do'kondan `limit` bo'yicha mahsulotlar ko'rsatiladi (filter `shop.is_fast_delivery` kabi backend serializer orqali).

## 5. Texnik

- **Backend:** Django 6, DRF, `ShopTemplate` model + `ShopPage` layout JSON, `api_templates_list` (AllowAny, grouped by category), `api_template_detail`, `api_template_apply` (IsAuthenticated). Migratsiya `0008_shoptemplate` (migrated). Admin ro'yxatdan o'tgan.
- **Flutter:** `ShopTemplate` model (`fromJson` layout/colors/fonts ni `layout/colors/fonts` yoki `default_*` dan o'qiydi), `ApiService.getTemplates/getTemplateDetail/applyTemplate`, `ShopService` wrapper, 2 ta screen (`template_picker`, `shop_builder`), `GridView.builder + ReorderableListView + TabBar mobil/desktop toggle`.
- **Preview:** `BoxFit.cover`, `surfaceContainerHighest`, `withValues(alpha:)` bilan Figma placeholder.

## 6. Ruxsat (Permissions)

- `templates/list + detail` — `AllowAny` (ro'yxatdan o'tmagan ham ko'radi, lekin `is_premium + required_plan` filter faqat `basic` ni ko'rsatadi).
- `templates/apply` — `IsAuthenticated`; `basic` user `pro` shablonni tanlasa `403 { error: tarifda mavjud emas }`.
- Admin panelda `ShopTemplate` faqat `is_staff` o'zgartira oladi.

## 7. Qabul mezonlari

- [ ] 60 ta shablon seed qilingan (`python manage.py shell` → 20×3, premium 1/3).
- [ ] Pickerda 20 kategoriya chip, 60 karta preview bilan ko'rinadi.
- [ ] Builderda 8 section turi qo'shish, reorder, o'chirish ishlaydi; mobil 390 / desktop 900 toggle.
- [ ] `Generate` bosganda `ShopPage` yaratiladi, do'kon yangi dizaynda ochiladi.
- [ ] Product 2 usul: manual (section filter) + auto import (export API) — TZ bo'yicha spetsifikatsiya tasdiqlangan.
- [ ] `flutter analyze` 0 error, `python manage.py check` 0 issue, `test api` 6/6 passed.
- [ ] Server `127.0.0.1:8000` da run, `GET /api/v1/flutter/templates/` 200 va `total_count:60`.

**Keyinga qadam (tasdiqdan so'ng):** `import-products` endpoint + seller UI import dialog + shablon screenshot upload (Figma export) ni to'ldirish.

> TZ qisqa va ideal — tasdiqlang, kod yozish shu reja bo'yicha davom etadi. Hozir MVP 90% tayyor (60 shablon + picker + builder + apply API + seed). Import-products kelasi iteratsiya.
