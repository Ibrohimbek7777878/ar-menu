# ONLINE STORE GULISTON — BACKEND HANDOVER / IJROIY HISOBOT

**Hujjat:** BACKEND_HANDOVER.md
**Sana:** 2026-08-15 (yangilandi)
**Holat:** Django backend to'liq ishlayapti, barcha sahifalar premium/minimal dizaynda qayta yozildi, funksional kamchiliklar tuzatildi

---

## 1. LOYIHA HAQIDA

| Narsa | Qiymat |
|-------|--------|
| Loyiha | Online Store Guliston — lokal e-commerce platforma |
| Backend | Django 6.0.7 + DRF + SimpleJWT + SQLite |
| Frontend | Server-side rendered (Django templates + Tailwind CDN + Alpine.js + Material Icons) |
| Ilova | 8 ta: `web` (sahifalar), `accounts`, `products`, `orders`, `shops`, `categories`, `couriers`, `notifications` |
| Manzil | `/home/ibrohim/Desktop/client_baza/online store_guliston/backend/` |
| Virtual env | `backend/venv/` (Python 3.12) |
| Ishga tushirish | `cd backend && ./venv/bin/python manage.py runserver 0.0.0.0:8000` |

---

## 2. ISHGA TUSHIRISH

```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston"
backend/venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

- Sayt: http://127.0.0.1:8000/
- Admin panel: http://127.0.0.1:8000/admin/login/ (custom web login)
- Django admin: http://127.0.0.1:8000/admin/ (standart `admin/`)
- Kuryer panel: http://127.0.0.1:8000/courier/login/

**Sinov superuser:** `admin` / `admin1234` (is_approved=True, is_superuser=True)

**Muhim:** Server `setsid ... & disown` bilan ishga tushiriladi (mustaqil jarayon). PID tekshirish: `ps aux | grep runserver`.

---

## 3. MA'LUMOTLAR BAZASI HOLATI (db.sqlite3)

| Jadval | Son |
|--------|-----|
| Do'konlar (Shop) | 4 |
| Kategoriyalar (Category) | 12 |
| Mahsulotlar (Product) | 161 |
| Kuryerlar (Courier) | 2 (parol maydoni bor, birinchi kirishda avtomatik o'rnatiladi) |
| Adminlar (AdminUser) | 1 |
| Mijozlar (Customer) | 1 (test) |
| Buyurtmalar (Order) | 1 (test, yetkazilgan) |
| Sharhlar (Review) | 1 (test — yangi qo'shilgan) |
| Bannerlar (Banner) | 1 (test — yangi yaratilgan) |
| Rasmlar (media/products/) | 144 fayl |

Test buyurtmasi: `GLS-20260814-6932` (delivered). Istalmasa o'chirish mumkin.

---

## 4. MUHIM ARXITEKTURA QARORLARI

### 4.1 URL Tartibi — URL SHADOWING FIXI
`backend/backend/urls.py` da:
```python
urlpatterns = [
    path('', include('web.urls')),   # AVVAL — custom /admin/* sahifalar uchun
    path('admin/', admin.site.urls), # KEYIN — Django admin
    ...
]
```
`web.urls` admin'dan **OLDIN** keltirilgan.

### 4.2 Yangi URL'lar (bu sessiyada qo'shilgan)
- `admin/banners/create/` — banner yaratish
- `admin/banners/<pk>/edit/` — banner tahrirlash
- `admin/banners/<pk>/delete/` — banner o'chirish
- `admin/reviews/<pk>/delete/` — sharh o'chirish
- `admin/users/` — foydalanuvchilar ro'yxati
- `admin/users/<pk>/toggle/` — foydalanuvchi tasdiqlash/blokla (faqat super admin)
- `product/<slug>/review/` — sharh qo'shish (mijoz)

### 4.3 Context Processor — SITE_CONTEXT
`web/context_processors.py`:
```python
def site_context(request):
    return {
        'public_settings': _get_public_settings(),
        'cart_count': cart_count,
        'cart_total': cart_total,
    }
```
`backend/settings.py` TEMPLATES'ga qo'shildi. Barcha sahifalarda `cart_count` va `cart_total` mavjud.

---

## 5. MODELLAR

### 5.1 Order modeli — xossalar
```python
@property
def address(self):        return self.delivery_address
@property
def customer_phone(self): return self.customer_phone_1
@property
def customer_phone2(self):return self.customer_phone_2
@property
def subtotal(self):       return self.items.aggregate(s=Sum('total'))['s'] or 0
@property
def items_count(self):    return self.items.count()
```

### 5.2 Boshqa modellar
- **AdminUser** (accounts): role (super_admin/shop_owner/operator), phone, shop, is_approved, avatar. `is_super_admin`, `is_shop_owner`, `is_operator` xossalari.
- **Customer** (accounts): phone (unique), name, address, total_orders, total_spent, last_order_at.
- **Shop** (shops): delivery_fee (6000), free_delivery_from (50000), min_order (20000), is_featured, is_verified.
- **Product** (products): image/image2/image3, price, old_price, is_available, is_featured, unit, stock, rating, has_discount/discount_percent xossalari.
- **Courier** (couriers): status (active/busy/offline), total_deliveries, rating, **password** (yangi qo'shilgan — `couriers/0002_courier_password.py` migratsiyasi).
- **OrderItem** (orders): product_name, product_image (snapshot), price, quantity, unit, total.
- **OrderStatusHistory** (orders): status, note, changed_by, created_at.
- **Banner** (notifications): title, image, link, shop (FK), is_active, sort_order, start_date, end_date.
- **Promotion** (notifications): name, type (percent/fixed/free_delivery), value, min_order, shop, product, is_active, start_date, end_date, max_uses, current_uses.
- **Review** (products): product (FK, related_name='reviews'), customer (FK, null=False), order (FK), rating (1-5), comment, created_at.
- **AppSetting** (notifications): key, value, description, category.

---

## 6. WEB VIEWS (web/views.py) — TO'LIQ TAVSIF

### 6.1 Yordamchi funksiyalar
- `_get_public_settings()` — AppSetting'larni dict qiladi
- `_get_cart(request)` / `_save_cart(request, cart)` — session cart boshqaruvi
- `_order_number()` — `GLS-YYYYMMDD-NNNN` format (unique)
- `courier_required` — courier session tekshiruvchi dekorator
- `_cart_context(request)` — cart dict → items list + total

### 6.2 Customer sahifalari
| View | Izoh | HOLAT |
|------|------|-------|
| `customer_home` | Bosh sahifa: categories, shops(8), featured products(8), **banners (Alpine karusel), promotions** | ✅ TO'LIQ |
| `customer_catalog` | Katalog: category/q filter, **sort (price_asc/price_desc/name)**, paginator (20) | ✅ TO'LIQ |
| `customer_shop_detail(slug)` | Do'kon sahifasi + **qidiruv (q) + saralash (sort)** | ✅ YANGILANGAN |
| `customer_product_detail(slug)` | Mahsulot + **image2/image3 galereya + sharhlar + review form (Alpine yulduzlar)** | ✅ YANGILANGAN |
| `customer_cart` | Session cart ko'rinishi, delivery_fee=6000 (total>0 da) | ✅ |
| `customer_cart_add` | POST `product_id`, `quantity` → cart ga qo'shadi | ✅ |
| `customer_cart_update` | POST/JSON `item_id`, `quantity` (0 bo'lsa o'chiradi) | ✅ |
| `customer_cart_remove` | POST/JSON `item_id` o'chiradi | ✅ |
| `customer_checkout` | POST `name`, `phone`, `address`, `notes` → Order + OrderItem + History + Customer yaratadi | ✅ |
| `customer_orders` | `?phone=` bo'yicha buyurtma izlash | ✅ |
| **`customer_review_add`** | POST `name/phone/rating(1-5)/comment` → Customer get_or_create, Review yaratadi | ✅ YANGI |

### 6.3 Admin sahifalari (barchasi `@login_required(login_url='web_login')`)
| View | Izoh | HOLAT |
|------|------|-------|
| `web_login` | POST username+password, `user.is_approved` tekshiriladi | ✅ |
| `web_register` | Yangi shop_owner yaratadi (is_approved=False) | ✅ |
| `web_logout` | logout + redirect | ✅ |
| `admin_dashboard` | Stats: shops/products/orders/customers/today_orders/today_revenue + recent_orders(10) | ✅ |
| `admin_shops` | Do'konlar ro'yxati + qidiruv | ✅ |
| `admin_shop_create/edit` | Form + slug avtomatik, latitude/longitude, image | ✅ |
| `admin_shop_delete` | O'chiradi | ✅ |
| `admin_products` | Ro'yxat + category filter + qidiruv | ✅ |
| **`admin_product_create/edit`** | **image2/image3 ham saqlanadi** | ✅ YANGILANGAN |
| `admin_product_delete` | O'chiradi | ✅ |
| `admin_orders` | Ro'yxat + status filter | ✅ |
| `admin_order_detail` | Order + items + history + status o'zgartirish | ✅ |
| `admin_order_status` | POST status → order.status | ✅ |
| `admin_customers` | Mijozlar ro'yxati | ✅ |
| `admin_categories` + CRUD | name/name_uz/name_ru/name_en/icon/color/sort_order/is_active | ✅ |
| `admin_couriers` + CRUD | name/phone/status/vehicle_type/**password** | ✅ YANGILANGAN |
| **`admin_banners`** | Banner ro'yxati + **Create/Edit/Delete** | ✅ YANGILANGAN |
| **`admin_reviews`** | Sharhlar + **Delete** | ✅ YANGILANGAN |
| **`admin_settings`** | **POST qayta ishlanadi** — `setting_<key>` prefikslari orqali AppSetting yangilanadi | ✅ YANGILANGAN |
| `admin_profile` | Profil | ✅ |
| **`admin_users`** | Foydalanuvchilar ro'yxati + **toggle tasdiqlash** (faqat super admin) | ✅ YANGI |
| **`admin_user_toggle`** | Foydalanuvchi is_approved o'zgartirish | ✅ YANGI |

### 6.4 Courier sahifalari
| View | Izoh | HOLAT |
|------|------|-------|
| **`courier_login`** | POST `phone` + **`password`** — `check_password` tekshiriladi; agar parol bo'lmasa, birinchi kirishdagi parol `make_password` bilan saqlanadi | ✅ YANGILANGAN |
| **`courier_dashboard`** | Stats: today_deliveries, pending_orders, **available_orders**, total_earnings. **Faol buyurtmalar: o'ziga biriktirilgan + yangi (courier=None, confirmed/preparing)** | ✅ YANGILANGAN |
| `courier_order_detail(pk)` | Buyurtma tafsiloti | ✅ |
| `courier_accept_order(pk)` | confirmed/preparing → out_for_delivery | ✅ |
| `courier_deliver_order(pk)` | out_for_delivery → delivered | ✅ |
| `courier_history` | Yetkazilgan buyurtmalar (50) | ✅ |
| `courier_logout` | Session tozalaydi | ✅ |

---

## 7. TEMPLATE'TAGS — `uznum` FILTER

`web/templatetags/uznum.py`:
```python
@register.filter
def uznum(value):
    # 450000 -> "450 000"; 2500.50 -> "2 500,5"; None -> "0"
```
**Ishlatilishi:** 14+ ta template'da `{% load uznum %}` qo'shildi. Narxlar probel bilan: `450 000 so'm`.

---

## 8. UI / DESIGN — PREMIUM/MINIMAL DIZAYN TIZIMI

### 8.1 DIZAYN QARORI (2026-08-15 da qabul qilindi)
- **Uslub:** Premium / minimal
- **Shrift:** Fraunces (display) + Inter (body)
- **Fon:** Cream `#fafaf7` (light) / `#0b0b0b` (dark)
- **Matn:** Ink `#1a1a1a` (light) / `#f3f4f6` (dark)
- **Brand:** Yashil saqlanadi (#16a34a)
- **Barcha 3 panel** (mijoz + admin + kuryer) qayta yozildi

### 8.2 CSS KLASSLAR (base.html)
- **`.btn` / `.btn-primary` / `.btn-outline` / `.btn-danger`** — premium tugmalar (border-radius: .75rem, shadow, hover animatsiya)
- **`.card` / `.card-hover`** — oq kartalar (border-radius: 1rem, subtle border + shadow)
- **`.eyebrow`** — kichik urchin-kapital yozuv (brand rangda)
- **`.pill`** — holat badge'lari (rangli dot + pill shakl)
- **`.tbl`** — premium jadval (kichik uppercase header, subtle border)
- **`.msg-success / .msg-error / .msg-info`** — xabar kartochkalari
- **`.nav-link`** — sidebar/nav linklar (active: brand fon + rang)
- **`.star` / `.star-empty`** — yulduz bahosi
- **`.field`** — form label (kichik uppercase tracking-wider)
- **Form inputs** — border-radius: .65rem, focus: brand border + shadow ring
- **`input[type=color]`** — katta, cursor: pointer

### 8.3 base.html — YANGILANGAN
- Fraunces + Inter shriftlar (Google Fonts CDN)
- Tailwind config: brand palitra, cream/ink ranglar, font-display
- Barcha CSS klasslar premium uslubda qayta yozildi
- `{% block body %}` orqali barcha panellarga uzatiladi

---

### 8.4 MIJOZ (CUSTOMER) INTERFEYSI

#### base_customer.html — YANGILANGAN
- **Top bar**: Telefon + email (kenglikda)
- **Navbar**: Logotip (yashil kvadratda savat ikonasi) + "Store Guliston" + nav linklar (Bosh sahifa, Katalog) + **savat badge** (`cart_count` + `cart_total|uznum`) + tema tugmasi + buyurtmalar
- **Mobile bottom nav**: 4 ta tugma — Bosh sahifa, Katalog, Savat (badge bilan), Buyurtmalar
- **Footer**: Toza, premium

#### home.html — YANGILANGAN
- **Hero**: qora fon, katta sarlavha, "Xaridni boshlash" tugma
- **Banner karuseli**: Alpine.js `x-data="{ index: 0 }"`, avtomatik aylanish (setInterval), bosqichli nuqtalar
- **Kategoriyalar**: grid, har birida Material Icons + nom
- **Aksiyalar**: `promotions` bo'limi (agar bor bo'lsa)
- **Mashhur mahsulotlar**: 2-4 ustun grid, rasm + narx + chegirma badge
- **Do'konlar**: 2-3 ustun grid, rasm + nom + reyting

#### catalog.html — YANGILANGAN
- **Sarlavha**: kategoriya nomi (agar filter bo'lsa)
- **Qidiruv + saralash**: q input + sort select (price_asc/price_desc/name) — hidden fields bilan category saqlanadi
- **Filtrlar sidebar**: kategoriyalar ro'yxati
- **Mahsulotlar gridi**: premium kartalar
- **Paginatsiya**: "← Oldingi / Sahifa N / Keyingi →"

#### product_detail.html — YANGILANGAN
- **Galereya**: asosiy rasm + image2/image3 thumbnail (Alpine `x-data="{ active: 0 }"`)
- **Mahsulot**: nom, yulduzlar, narx (asosiy + eski + chegirma %), tavsif, tarkibi, ozuqaviy qiymati
- **Savatga qo'shish**: `x-data="{ quantity: 1 }"`, `-`/`+` tugmalar, "Savatga qo'shish" tugma
- **Do'kon blok**: logo + nom + reyting + "Do'konga o'tish"
- **Sharhlar**: review qo'shish formasi (ism, telefon, yulduzlar `x-data` bilan, komment) + mavjud sharhlar ro'yxati (`review.customer.name`, `review.rating`, `review.comment`, sana)

#### shop_detail.html — YANGILANGAN
- **Do'kon header**: logo + nom + reyting + ish vaqti + manzil + tavsif
- **Qidiruv + saralash**: q input + sort select
- **Mahsulotlar gridi**: premium kartalar

#### cart.html — YANGILANGAN
- **Savat**: premium kartalar, rasm + nom + do'kon + narx + `-`/`+` tugmalar + subtotal + "O'chirish"
- **Buyurtma xulosasi**: mahsulotlar summasi + yetkazish + jami + "Buyurtma berish" form (ism, telefon, manzil, izoh)
- **Bo'sh savat**: "Savatingiz bo'sh" + "Katalogga o'tish" tugma

#### orders.html — YANGILANGAN
- **Telefon qidiruv**: katta input + "Qidirish" tugma
- **Buyurtmalar**: accordion (Alpine toggle), holat pill, sana, summa, detalda mahsulotlar

---

### 8.5 ADMIN PANELI INTERFEYSI

#### base_admin.html — YANGILANGAN
- **Sidebar**: premium, Material Icons ikonlar, `.nav-link` klasslar, faol: yashil fon
- **Sidebar linklar**: Dashboard, Do'konlar, Mahsulotlar, Buyurtmalar, Kategoriyalar, Kuryerlar, Mijozlar, Bannerlar, Sharhlar, Sozlamalar, **Foydalanuvchilar** (yangi), Saytga o'tish, Profil
- **Header**: sticky, `{% block page_title %}` sarlavha, dark mode tugmasi

#### login.html / register.html — YANGILANGAN
- Premium karta, cream fon, gradient blob (xirillangan doira)

#### dashboard.html — YANGILANGAN
- **5 ta stat kartasi**: Do'konlar, Mahsulotlar, Buyurtmalar, Mijozlar, Bugungi tushum
- **So'nggi buyurtmalar**: premium jadval

#### orders.html — YANGILANGAN
- **Status filter tugmalari**: pill style, har biri rangli
- **Jadval**: premium, pill holat, amallar (ko'z ikonka)

#### order_detail.html — YANGILANGAN
- **3 ustun layout**: buyurtma ma'lumotlari + mahsulotlar jadvali + holat o'zgartirish + tarix
- **Premium kartalar**: `.card`, `.pill`, `.eyebrow` ishlatilgan

#### shops.html — YANGILANGAN
- **Premium jadval**: rasm + nom + kategoriya + reyting (yulduz) + ochiq/tavsiya pill + amallar (edit/delete Material Icons)

#### shop_form.html — YANGILANGAN
- **2 ta karta**: asosiy ma'lumotlar + yetkazish/geo + checkboxlar
- **Premium form**: `.field` label, select, input file

#### products.html — YANGILANGAN
- **Premium jadval**: rasm + nom + narx + do'kon + kategoriya + mavjud pill + amallar

#### product_form.html — YANGILANGAN
- **3 ta karta**: asosiy ma'lumotlar + **rasm galereya (image + image2 + image3)** + checkboxlar
- **Galereya formasi**: 3 ustunli, har birida file input + joriy rasm nomi

#### customers.html — YANGILANGAN
- **Premium jadval**: avatar + ism + telefon + buyurtmalar + sarflangan + sana

#### categories.html — YANGILANGAN
- **Premium jadval**: nom + ikonka + rang (doira) + tartib + faol pill + amallar

#### category_form.html — YANGILANGAN
- **Premium form**: nom (uz/ru/en) + ikonka + rang (color picker) + tartib + faol

#### couriers.html — YANGILANGAN
- **Premium jadval**: avatar + ism + telefon + holat pill + transport + reyting + yetkazishlar + amallar

#### courier_form.html — YANGILANGAN
- **Premium form**: ism + telefon + holat + transport + **parol maydoni** (yangi qo'shilgan)

#### banners.html — YANGILANGAN
- **Premium jadval**: rasm preview + nom + havola + faol pill + tartib + amallar (edit/delete)
- **"Yangi banner" tugma** — banner_form.html ga link

#### banner_form.html — YANGI
- **Premium form**: sarlavha* + havola + do'kon (select) + tartib + rasm* (file) + faol checkbox
- `enctype="multipart/form-data"` bilan POST

#### reviews.html — YANGILANGAN
- **Premium jadval**: mahsulot + mijoz + yulduz + sharh + sana + **delete tugmasi** (confirm dialog)

#### settings.html — YANGILANGAN
- **POST form**: `name="setting_{{ setting.key }}"` prefiksli inputlar (view tomonidan qayta ishlanadi)
- **Premium**: guruh sarlavhalari, `.eyebrow`, toggle select (Ha/Yo'q)

#### profile.html — YANGILANGAN
- **Premium karta**: katta avatar + ism + role + ma'lumotlar + chiqish tugma

#### users.html — YANGI
- **Premium jadval**: avatar + ism (username) + ro'lik pill + do'kon + holat pill + toggle tugmasi (super admin uchun)

---

### 8.6 KURYER PANELI INTERFEYSI

#### base_courier.html — YANGILANGAN
- **Premium navbar**: blur fon, logotip (delivery_dining), "Kuryer Panel" nomi, `.nav-link` bilan Dashboard/Tarix, kuryer avatar + ism, dark mode, chiqish
- **Mobile bottom nav**: 2 ta — Dashboard, Tarix

#### login.html — YANGILANGAN
- **Premium karta**: gradient blob fon, cream fon, "Yetkazish tizimi" eyebrow, "Kuryer paneliga kirish" sarlavha, parol maydoni

#### dashboard.html — YANGILANGAN
- **Sarlavha**: "Assalomu alaykum, [Ism]" + holat pill (Tayyor/Band/Oflayn)
- **3 ta stat kartasi**: Bugungi yetkazishlar + **Mavjud buyurtmalar** (yangi!) + Yetkazilmoqda — har birida Material Icons
- **Faol buyurtmalar**: premium ro'yxat, holat pill, mijoz + telefon + manzil, "Ochilgan" badge (kuryersiz buyurtmalar uchun), "Batafsil" / "Olish" / "Yetkazildi" tugmalar

#### order_detail.html — YANGILANGAN
- **Premium**: eyebrow label'lar, `.card` layout, `.field` label'lar, Material Icons
- Manzil xaritasi placeholder — "tez orada" yozuvi

#### history.html — YANGILANGAN
- **Premium jadval**: `.tbl` klassi, delivered_at sanasi, "Batafsil" tugma

---

### 8.7 TEMPLATE'LAR RO'YXATI

**Customer:** `customer/`: `base_customer.html`, `home.html`, `catalog.html`, `shop_detail.html`, `product_detail.html`, `cart.html`, `orders.html` — **7 ta, hammasi yangilangan**

**Admin:** `admin/`: `base_admin.html`, `login.html`, `register.html`, `dashboard.html`, `shops.html`, `shop_form.html`, `products.html`, `product_form.html`, `orders.html`, `order_detail.html`, `customers.html`, `categories.html`, `category_form.html`, `couriers.html`, `courier_form.html`, `banners.html`, `reviews.html`, `settings.html`, `profile.html` — **19 ta** + yangi: `banner_form.html`, `users.html` — **21 ta**

**Courier:** `courier/`: `login.html`, `base_courier.html`, `dashboard.html`, `order_detail.html`, `history.html` — **5 ta, hammasi yangilangan**

**Root:** `base.html` — yangilangan (premium/minimal dizayn tizimi)

---

## 9. BUG'LAR TUZATILGAN (UMUMIY)

### 9.1 Birinchi sessiyada tuzatilganlar
1. **URL shadowing** — `web.urls` admin'dan oldinga ko'chirildi
2. **19 ta missing URL** — `web/urls.py` ga qo'shildi
3. **Yetishmayotgan views** — `web/views.py` to'liq qayta yozildi
4. **Missing templates** — barcha admin template'lar yaratildi
5. **`base_admin.html` `as` variable shadowing** — `_url` suffix qilindi
6. **Admin parol** — `admin1234` qayta o'rnatildi
7. **customer/orders.html** — field nomlari tuzatildi
8. **courier/order_detail.html** — mahsulot rasm/nom null-safe
9. **product_detail.html** — Alpine POST form
10. **Narx formati** — `uznum` filter
11. **Rasmlar** — 161/161 mahsulotda rasm bor

### 9.2 Ikkinchi sessiyada tuzatilganlar (2026-08-15)
12. **Admin settings POST** — `setting_<key>` prefikslar bilan AppSetting yangilanadi
13. **Banner CRUD** — create/edit/delete view + banner_form.html yaratildi
14. **Sharh qo'shish** — `customer_review_add` view + POST form (ism, telefon, yulduzlar, komment)
15. **Sharh o'chirish** — `admin_review_delete` + reviews.html'da delete tugmasi
16. **Kuryer dashboard** — mavjud buyurtmalar (courier=None, confirmed/preparing) ko'rinadi
17. **Kuryer parol** — Courier modeliga `password` maydoni qo'shildi, login `check_password` tekshiradi, birinchi kirishda parol saqlanadi
18. **Savat badge** — `site_context` context processor (cart_count, cart_total) yaratildi
19. **Home bannerlar** — banner karuseli (Alpine.js) + promotions bo'limi render qilinadi
20. **Product form** — image2/image3 maydonlari qo'shildi, POST'da saqlanadi
21. **Admin users** — yangi sahifa + foydalanuvchi tasdiqlash/blokla (super admin uchun)
22. **Shop detail** — qidiruv (q) + saralash (sort) qo'shildi
23. **Dizayn** — barcha 3 panel (35+ template) premium/minimal uslubda qayta yozildi

---

## 10. RASMLAR (media/products/)

- **144 fayl**, jami ~13 MB, 800x800 JPEG, oq fonda
- Barcha mahsulotlarga (`image` maydoni) tayinlangan
- Manba: Openverse API (Creative Commons / bepul litsenziyali)
- O'zbekcha maxsus mahsulotlar alohida qidirildi

---

## 11. REQUIREMENTS (requirements.txt)

```
Django==6.0.7
djangorestframework==3.17.1
djangorestframework-simplejwt==5.5.1
django-cors-headers==4.9.0
django-filter==26.1
Pillow==12.3.0
```

O'rnatish: `cd backend && ./venv/bin/pip install -r requirements.txt`

---

## 12. API ENDPOINTLAR (DRF)

```
/api/v1/accounts/        (accounts.urls)
/api/v1/categories/      (categories.urls)
/api/v1/shops/           (shops.urls)
/api/v1/products/        (products.urls)
/api/v1/orders/          (orders.urls)
/api/v1/couriers/        (couriers.urls)
/api/v1/notifications/   (notifications.urls)
```

Auth: SimpleJWT (access 30 daqiqa, refresh 7 kun). DRF default AllowAny.

---

## 13. SOZLAMALAR (backend/settings.py)

- `AUTH_USER_MODEL = 'accounts.AdminUser'`
- SQLite: `backend/db.sqlite3`
- `TIME_ZONE = 'Asia/Tashkent'`, `LANGUAGE_CODE = 'uz'`
- `MEDIA_URL = 'media/'`, `MEDIA_ROOT = BASE_DIR / 'media'`
- `CORS_ALLOW_ALL_ORIGINS = True`
- `DEBUG = True`, `ALLOWED_HOSTS = ['*']`
- **`context_processors`**: `web.context_processors.site_context` qo'shildi

---

## 14. SEED KOMMANDALAR

- `web/management/commands/seed_data.py`
- `web/management/commands/seed_products.py`

DB'da 161 mahsulot bor — seed bilan yaratilgan. Yangi DB qilinsa: `./venv/bin/python manage.py migrate && ./venv/bin/python manage.py seed_products`

---

## 15. GIT HOLATI

- Repo: `/home/ibrohim/Desktop/client_baza/online store_guliston`
- `backend/` deyarli to'liq untracked (gitga hali qo'shilmagan)
- Eski TypeScript backend o'chirilgan
- **Izoh:** backend ni gitga qo'shish kerak bo'lsa, avval `.gitignore` tekshirish kerak

---

## 16. SINOV NATIJALARI (2026-08-15 — yangilangan)

| Sahifa | Status | Izoh |
|--------|--------|------|
| `/` | 200 | Banner karuseli + promotions render qilinadi |
| `/catalog/` | 200 | Qidiruv + sort ishlaydi |
| `/product/<slug>/` | 200 | Galereya (image2/3) + review form |
| `/shop/<slug>/` | 200 | Qidiruv + sort |
| `/cart/` | 200 | Savat badge ko'rinadi |
| `/orders/?phone=` | 200 | Accordion toggle |
| `/product/<slug>/review/` (POST) | 302 | Review yaratildi ✅ |
| `/admin/login/` (POST) | 302 → dashboard | Muvaffaqiyatli |
| `/admin/dashboard/` | 200 | |
| `/admin/shops/` + create/edit | 200 | |
| `/admin/products/` + create/edit | 200 | image2/3 saqlanadi |
| `/admin/orders/` | 200 | |
| `/admin/orders/<pk>/` | 200 | |
| `/admin/customers/` | 200 | |
| `/admin/categories/` + CRUD | 200 | |
| `/admin/couriers/` + CRUD | 200 | parol maydoni |
| `/admin/banners/` | 200 | |
| `/admin/banners/create/` | 200 | ✅ Yangi |
| `/admin/banners/<pk>/edit/` | 200 | ✅ Yangi |
| `/admin/reviews/` | 200 | delete tugmasi |
| `/admin/settings/` (POST) | 302 | setting_ prefix ✅ |
| `/admin/profile/` | 200 | |
| `/admin/users/` | 200 | ✅ Yangi |
| `/courier/login/` (POST) | 302 → dashboard | Parol bilan |
| `/courier/` | 200 | Mavjud buyurtmalar ko'rinadi |
| `/courier/history/` | 200 | |
| `/courier/order/1/` | 200 | |

**`manage.py check`**: 0 muammo

---

## 17. KEYINGI QADAMLAR / TAVSIYALAR

### 17.1 Hali yozilmagan funksiyalar
1. **Xarita integratsiyasi** — courier order_detail'da placeholder; `delivery_lat`/`delivery_lng` checkout'da to'ldirilmaydi
2. **Telegram bildirishnoma** — NotificationLog modeli bor, lekin real yuborish yo'q
3. **Click/Payme to'lov integratsiyasi** — to'lov tizimi yo'q
4. **Admin role asosida ruxsatlar** — shop_owner faqat o'z do'konini ko'rishi (hozir barcha adminlar hamma narsani ko'radi)
5. **Delivery fee zonaga qarab hisoblash**

### 17.2 Texnik yaxshilashlar
1. **`DEBUG=False` + SECRET_KEY'ni env'ga o'tkazish** (production uchun)
2. **Backend'ni gitga qo'shish** (untracked fayllar ko'p)
3. **Test buyurtmasi va test mijozni tozalash** (istalmasa)
4. **Kuryer parollarini boshqarish** — admin panel'dan parol tiklash
5. **CSRF cookie settings** — `CSRF_TRUSTED_ORIGINS` qo'shish (kerak bo'lsa)
6. **Migratsiya backup** — `db.sqlite3` nusxasini saqlash

---

**Hujjat tayyorladi:** Assistant (opencode)
**Sana:** 2026-08-15
**Versiya:** 2.0 — Premium/minimal dizayn + funksional tuzatishlar
