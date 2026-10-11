# TECHNICAL SPECIFICATION v3.0
# Online Store Guliston — To'liq Startup Arxitekturasi
# O'zbekiston Bozorida Yagona Mahalliy Commerce Platforma

---

## 0. LOYIHA VIZIONI

**Maqsad:** O'zbekiston (Guliston/Yangi Yer) eng yaxshi mahalliy commerce platforma bo'lish.
Uzum Tezkorni mag'lub qiladigan darajada tezkor, qulay, arzon va offline ishlaydigan.

**Nima uchun biz yaxshiramiz:**
- Uzum Tezkor katta shaharlarga qaratilgan — mahalliy fokus yo'q
- Biz: mahalla do'konlariga yaqin, tez yetkazish, oson interfeys
- Offline ishlash — internet sifati yomon joylarda ham
- Telegram bot — o'rnatish kerak emas, mavjud
- Kuryerlarga maxsus panel — buyurtmalarni ko'rish

**Platformalar:**
```
1. Mobile APK (Flutter)           → Mijozlar + Kuryerlar
2. Desktop Web (Django HTML)      → Admin/Sotuvchi/Operator
3. Telegram Bot (Python aiogram)  → Buyurtma + bildirishnoma
4. Courier Web (Django HTML)      → Kuryerlar (yoki Flutter)
```

---

## 1. TEXNOLOGIYA STACK

### 1.1 Backend
| Komponent | Texnologiya |
|-----------|------------|
| Framework | Django 5.x + Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| DB | PostgreSQL 16 (prod), SQLite (dev) |
| Cache | Redis (prod) |
| Task Queue | Celery + Redis |
| Image | Pillow + django-storages |
| Static | WhiteNoise |
| Search | django-filter + PostgreSQL FTS |

### 1.2 Frontend (Desktop Admin)
| Komponent | Texnologiya |
|-----------|------------|
| Templates | Django Templates |
| CSS | Tailwind CSS 3.x (CDN) |
| JS | Alpine.js 3.x (minimal reactive) |
| Chart | Chart.js 4.x |
| Icons | Heroicons (SVG) |
| Table | Vanilla JS sortable tables |

### 1.3 Mobile APK
| Komponent | Texnologiya |
|-----------|------------|
| Framework | Flutter 3.24+ |
| State | Provider 6.x |
| HTTP | Dio 5.x + interceptors |
| Offline | drift 2.x (type-safe SQLite) |
| Secure Storage | flutter_secure_storage |
| Image | cached_network_image |
| Map | flutter_map + OpenStreetMap |
| Location | geolocator |

### 1.4 Telegram Bot
| Komponent | Texnologiya |
|-----------|------------|
| Framework | aiogram 3.x |
| HTTP | aiohttp (API client) |
| FSM | aiogram FSM |

---

## 2. KATEGORIYALAR — TO'LIQ RO'YXAT

### 2.1 Kategoriya ikonkalari (Material Icons / SVG)

Har bir kategoriyada:
- **name** — Uzbekcha nom
- **icon** — Material Icon nomi (Flutter: Icons.xxx, Web: SVG)
- **color** — Rang (hex)
- **image** — Kategoriya uchun default rasm URL

| # | Kategoriya | Icon nomi | Rang | Tavsif |
|---|-----------|-----------|------|--------|
| 1 | Mevalar | `icons/fruit_apple` | #F97316 | Olma, nok, banan, uzum, anor |
| 2 | Sabzavotlar | `icons/vegetable_broccoli` | #22C55E | Pomidor, bodring, kartoshka, piyoz |
| 3 | Go'sht | `icons/meat_steak` | #EF4444 | Mol, qo'y, tovuq, kolbasa |
| 4 | Sut mahsulotlari | `icons/dairy_milk` | #F59E0B | Sut, qaymoq, pishloq, yogurt |
| 5 | Non va pishiriq | `icons/food_bread` | #92400E | Non, bulochka, pechene, keks |
| 6 | Ichimliklar | `icons/drink_coffee` | #3B82F6 | Choy, kofe, suv, sharbat, gazli |
| 7 | Oziq-ovqat | `icons/food_grain` | #16A34A | Guruch, makaron, shakar, tuz |
| 8 | Gigiena | `icons/hygiene_soap` | #A855F7 | Sabun, shampun, tish pastasi |
| 9 | Uy-ro'zg'or | `icons/home_cleaning` | #64748B | Tozalash, idish, yuvish |
| 10 | Mahalliy mahsulotlar | `icons/local_star` | #6366F1 | Asal, quritma, mahalliy |
| 11 | Bolalar | `icons/baby_bottle` | #EC4899 | Ovqat, pampers, salfetka |
| 12 | Texnika | `icons/electronics_phone` | #0EA5E9 | Telefon, chargers, aksessuar |

### 2.2 Flutter uchun icon mapping

```dart
// lib/config/category_icons.dart
class CategoryIcons {
  static const Map<String, IconData> icons = {
    'mevalar': Icons.apple,           // Material icon
    'sabzavotlar': Icons.eco,
    'gosht': Icons.restaurant,
    'sut': Icons.local_cafe,
    'non': Icons.bakery_dining,
    'ichimliklar': Icons.local_drink,
    'oziq-ovqat': Icons.grain,
    'gigiena': Icons.clean_hands,
    'uy-rozgor': Icons.home_repair_service,
    'mahalliy': Icons.stars,
    'bolalar': Icons.child_care,
    'texnika': Icons.devices,
  };

  static const Map<String, Color> colors = {
    'mevalar': Color(0xFFF97316),
    'sabzavotlar': Color(0xFF22C55E),
    'gosht': Color(0xFFEF4444),
    'sut': Color(0xFFF59E0B),
    'non': Color(0xFF92400E),
    'ichimliklar': Color(0xFF3B82F6),
    'oziq-ovqat': Color(0xFF16A34A),
    'gigiena': Color(0xFFA855F7),
    'uy-rozgor': Color(0xFF64748B),
    'mahalliy': Color(0xFF6366F1),
    'bolalar': Color(0xFFEC4899),
    'texnika': Color(0xFF0EA5E9),
  };
}
```

---

## 3. MAHSULOTLAR — TO'LIQ MODEL

### 3.1 Mahsulot modeli (kengaytirilgan)

```python
class Product(models.Model):
    # Asosiy
    shop = models.ForeignKey('shops.Shop', related_name='products')
    name = models.CharField(max_length=200)                    # "Non (1 dona)"
    slug = models.SlugField(unique=True, allow_unicode=True)   # "non-1-dona"
    description = models.TextField(blank=True)                  # Batafsil tavsif

    # Narx va o'lchov
    price = models.DecimalField(max_digits=12, decimal_places=0)  # 2500
    old_price = models.DecimalField(max_digits=12, decimal_places=0, null=True)  # Chegirma oldingi narx
    unit = models.CharField(max_length=20)                        # dona, kg, litr, botal, paket
    min_quantity = models.IntegerField(default=1)                 # Minimal buyurtma miqdori

    # Brend va ishlab chiqaruvchi
    brand = models.CharField(max_length=100, blank=True)         # "Mahalliy", "Sochnaya Dolina"
    manufacturer = models.CharField(max_length=200, blank=True)  # "OOO Millagro"
    country_of_origin = models.CharField(max_length=100, blank=True)  # "O'zbekiston"

    # Og'irlik va o'lcham
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True)  # 1.5 (kg)
    volume = models.DecimalField(max_digits=8, decimal_places=2, null=True)  # 1.5 (litr)
    pack_size = models.IntegerField(default=1)                  # Qadoqdagi soni

    # Kategoriya
    category = models.ForeignKey('categories.Category', null=True)
    subcategory = models.CharField(max_length=100, blank=True)  # "Qizil olma"

    # Rasm
    image = models.ImageField(upload_to='products/')             # Asosiy rasm
    image2 = models.ImageField(upload_to='products/', null=True) # Qo'shimcha rasm
    image3 = models.ImageField(upload_to='products/', null=True) # Qo'shimcha rasm

    # Sifat va mavjudlik
    is_available = models.BooleanField(default=True)
    stock = models.IntegerField(default=0)                       # Ombordagi soni
    is_organic = models.BooleanField(default=False)              # Ekologik
    is_halal = models.BooleanField(default=True)                 # Halol
    expiry_date = models.DateField(null=True)                    # Yaroqlilik muddati

    # Qo'shimcha ma'lumot
    calories = models.IntegerField(null=True)                    # Kkal/100g
    protein = models.DecimalField(max_digits=6, decimal_places=2, null=True)  # gr
    fat = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    carbs = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    ingredients = models.TextField(blank=True)                    # Tarkibi

    # SEO va tizim
    tags = models.CharField(max_length=500, blank=True)          # "yangi, tabiiy, mahalliy"
    barcode = models.CharField(max_length=50, blank=True)        # Shtrix-kod
    is_featured = models.BooleanField(default=False)             # Tavsiya etilgan

    # Vaqt
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 3.2 Mahsulot API response

```json
{
  "id": "p1",
  "name": "Non (1 dona)",
  "slug": "non-1-dona",
  "description": "Qo'l bilan pishirilgan an'anaviy non",
  "price": 2500,
  "old_price": null,
  "unit": "dona",
  "brand": "Nonxon",
  "manufacturer": "Nonxon MCHJ",
  "country_of_origin": "O'zbekiston",
  "weight": 0.8,
  "category": {"id": "c5", "name": "Non va pishiriq", "icon": "bread", "color": "#92400e"},
  "image": "/media/products/non.jpg",
  "image2": null,
  "is_available": true,
  "stock": 150,
  "is_organic": false,
  "is_halal": true,
  "calories": 265,
  "protein": 9.0,
  "fat": 3.3,
  "carbs": 49.0,
  "shop": {"id": "s4", "name": "Nonxon Guliston"},
  "rating": 4.6,
  "reviews_count": 23,
  "is_featured": false,
  "tags": ["yangi", "non", "nonxon"],
  "created_at": "2026-07-27T08:00:00Z"
}
```

---

## 4. ROLLAR VA PERMISSIONLAR

### 4.1 Rollar tizimi

| Role | Tavsif | Nima ko'radi | Nima qila oladi |
|------|--------|-------------|-----------------|
| `super_admin` | Platforma egasi | Barcha do'konlar, buyurtmalar, foydalanuvchilar | Barcha narsa |
| `shop_owner` | Do'kon egasi | Faqat o'z do'koni | Do'kon, mahsulot, buyurtma boshqarish |
| `operator` | Call-center | Shop_owner tayinlagan buyurtmalar | Buyurtmani tasdiqlash/bekor qilish |
| `courier` | Kuryer | O'ziga tayinlangan buyurtmalar | Status o'zgartirish, location yuborish |
| `customer` | Mijoz | Faqat o'z buyurtmalari | Buyurtma berish, status ko'rish |

### 4.2 Permission matritsa

```
Action                    │ super_admin │ shop_owner │ operator │ courier │ customer
──────────────────────────┼─────────────┼────────────┼──────────┼─────────┼─────────
Do'konlarni ko'rish       │ Barcha      │ O'ziniki   │ O'ziniki │ —       │ Barcha
Do'kon qo'shish           │ ✅          │ ❌         │ ❌       │ ❌      │ ❌
Do'kon tahrirlash         │ ✅          │ O'ziniki   │ ❌       │ ❌      │ ❌
Mahsulot qo'shish         │ ✅          │ O'ziniki   │ ❌       │ ❌      │ ❌
Mahsulot tahrirlash       │ ✅          │ O'ziniki   │ ❌       │ ❌      │ ❌
Buyurtmalarni ko'rish     │ Barcha      │ O'ziniki   │ O'ziniki │ O'ziga  │ O'zini
Buyurtma tasdiqlash       │ ✅          │ ✅         │ ✅       │ ❌      │ ❌
Buyurtma status o'zgar.   │ ✅          │ ✅         │ ✅       │ ✅*    │ ❌
Kuryer tayinlash          │ ✅          │ ✅         │ ❌       │ ❌      │ ❌
Dashboard statistika      │ Barcha      │ O'ziniki   │ O'ziniki │ ❌      │ ❌
Sozlamalar                │ ✅          │ ❌         │ ❌       │ ❌      │ ❌
Foydalanuvchi boshqarish  │ ✅          │ ❌         │ ❌       │ ❌      │ ❌

* courier faqat o'ziga tayinlangan buyurtmaning statusini o'zgartira oladi
```

### 4.3 Register flow

```
Mijoz (Customer):
  1. Telefon kiriting → SMS kod yuboriladi (yoki demo: 1234)
  2. Ism kiriting
  3. Profil yaratiladi
  4. Bosh sahifaga o'tiladi

Do'kon egasi (Shop Owner):
  1. /admin/register/ ga o'ting
  2. Email + parol + ism + telefon kiriting
  3. Do'kon nomi, manzili, telefoni
  4. Super admin tasdiqlashi kerak
  5. Tasdiqlangandan keyin kirish mumkin

Operator:
  1. Shop_owner tomonidan yaratiladi
  2. Email + parol beriladi
  3. Faqat buyurtmalar bilan ishlaydi

Kuryer:
  1. Super admin tomonidan yaratiladi
  2. Ism + telefon
  3. Faqat o'ziga tayinlangan buyurtmalarni ko'radi
```

---

## 5. SOZLAMALAR — TO'LIQ TIZIM

### 5.1 App sozlamalari

```python
class AppSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50)  # general, delivery, payment, notification
    updated_at = models.DateTimeField(auto_now=True)
```

### 5.2 Sozlamalar ro'yxati

#### Umumiy sozlamalar
| Key | Default | Tavsif |
|-----|---------|--------|
| `app_name` | Online Store Guliston | Ilova nomi |
| `app_version` | 1.0.0 | Versiya |
| `support_phone` | +998901234567 | Qo'llab-quvvatlash telefoni |
| `support_email` | support@store.uz | Email |
| `telegram_bot` | @StoreGulistonBot | Telegram bot username |
| `working_hours` | 08:00-22:00 | Ish vaqti |
| `min_order_amount` | 20000 | Minimal buyurtma (so'm) |
| `currency` | UZS | Valyuta |

#### Yetkazish sozlamalari
| Key | Default | Tavsif |
|-----|---------|--------|
| `delivery_fee_short` | 5000 | 0-2 km (so'm) |
| `delivery_fee_medium` | 10000 | 2-5 km (so'm) |
| `delivery_fee_long` | 15000 | 5+ km (so'm) |
| `free_delivery_min` | 50000 | Bepul yetkazish (so'm) |
| `max_delivery_distance` | 15 | Maksimal masofa (km) |
| `delivery_time_est` | 30 | Taxminiy vaqt (daqiqa) |

#### To'lov sozlamalari
| Key | Default | Tavsif |
|-----|---------|--------|
| `payment_cash` | true | Naqd to'lov |
| `payment_card` | false | Plastik karta |
| `payment_click` | false | Click |
| `payment_payme` | false | Payme |
| `auto_confirm` | false | Avtomatik tasdiqlash |

#### Bildirishnoma sozlamalari
| Key | Default | Tavsif |
|-----|---------|--------|
| `notify_telegram` | true | Telegram xabar |
| `notify_sms` | false | SMS xabar |
| `notify_push` | false | Push notification |
| `telegram_chat_id` | — | Do'kon Telegram guruh ID |

#### Chegirib qo'yish sozlamalari
| Key | Default | Tavsif |
|-----|---------|--------|
| `spam_limit` | 3 | 5 daqiqada maksimal buyurtma |
| `spam_window` | 5 | Spam vaqt (daqiqa) |
| `order_prefix` | OSG | Buyurtma prefiksi |

### 5.3 Settings API

```
GET    /api/settings/             → Barcha sozlamalar
PUT    /api/settings/{key}/       → Sozlamani yangilash
GET    /api/settings/public/      → Ommaviy sozlamalar (mijozlar uchun)
```

---

## 6. MODELLAR — TO'LIQ

### 6.1 accounts

```python
class AdminUser(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('shop_owner', 'Do\'kon egasi'),
        ('operator', 'Operator'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    shop = models.ForeignKey('shops.Shop', null=True, blank=True)
    # shop_owner → faqat o'z do'konini ko'radi
    is_approved = models.BooleanField(default=False)
    # shop_owner uchun super_admin tasdiqlashi kerak
    avatar = models.ImageField(upload_to='avatars/', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.2 customers (mijozlar)

```python
class Customer(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_order_at = models.DateTimeField(null=True)
    total_orders = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=0, default=0)
```

### 6.3 shops

```python
class Shop(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, allow_unicode=True)
    description = models.TextField(blank=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    phone2 = models.CharField(max_length=20, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    category = models.ForeignKey('categories.Category', null=True)
    image = models.ImageField(upload_to='shops/')
    banner = models.ImageField(upload_to='shops/banners/', null=True)
    working_hours = models.CharField(max_length=50)  # "08:00-22:00"
    working_days = models.CharField(max_length=50, default='Dush-Shan')
    is_open = models.BooleanField(default=True)
    rating = models.FloatField(default=0)
    reviews_count = models.IntegerField(default=0)
    min_order = models.IntegerField(default=20000)
    delivery_fee = models.IntegerField(default=6000)
    free_delivery_from = models.IntegerField(default=50000)
    owner = models.ForeignKey('accounts.AdminUser', null=True)
    is_featured = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 6.4 orders (to'liq)

```python
class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('confirmed', 'Tasdiqlangan'),
        ('preparing', 'Tayyorlanmoqda'),
        ('ready', 'Tayyor — olib ketish'),
        ('out_for_delivery', 'Yo''lda'),
        ('delivered', 'Yetkazildi'),
        ('cancelled', 'Bekor qilindi'),
    ]
    order_number = models.CharField(max_length=20, unique=True)  # OSG-20260727-001
    customer = models.ForeignKey('customers.Customer', null=True)
    customer_name = models.CharField(max_length=200)
    customer_phone_1 = models.CharField(max_length=20)
    customer_phone_2 = models.CharField(max_length=20, blank=True)
    customer_phone_3 = models.CharField(max_length=20, blank=True)
    shop = models.ForeignKey('shops.Shop')
    delivery_address = models.TextField(blank=True)
    delivery_lat = models.FloatField(null=True)
    delivery_lng = models.FloatField(null=True)
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=0, default=6000)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    final_amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_pickup = models.BooleanField(default=False)
    courier = models.ForeignKey('couriers.Courier', null=True, blank=True)
    confirmed_by_phone = models.BooleanField(default=False)
    cancel_reason = models.TextField(blank=True)
    cancel_reason_code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items')
    product = models.ForeignKey('products.Product', null=True)
    product_name = models.CharField(max_length=200)
    product_image = models.CharField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.IntegerField(default=1)
    unit = models.CharField(max_length=20)
    total = models.DecimalField(max_digits=12, decimal_places=0)  # price * quantity

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, related_name='history')
    status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey('accounts.AdminUser', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.5 couriers

```python
class Courier(models.Model):
    STATUS_CHOICES = [
        ('active', 'Faol'),
        ('busy', 'Band'),
        ('offline', 'Oflayn'),
    ]
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    current_lat = models.FloatField(null=True)
    current_lng = models.FloatField(null=True)
    avatar = models.ImageField(upload_to='couriers/', null=True)
    vehicle_type = models.CharField(max_length=50, blank=True)  # velosiped, mototsikl, avto
    rating = models.FloatField(default=5.0)
    total_deliveries = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.6 categories (to'liq)

```python
class Category(models.Model):
    name = models.CharField(max_length=100)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    icon = models.CharField(max_length=50)  # Material icon nomi
    color = models.CharField(max_length=7)  # #16a34a
    image = models.ImageField(upload_to='categories/', null=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey('self', null=True, blank=True)  # Subkategoriyalar
```

### 6.7 reviews

```python
class Review(models.Model):
    product = models.ForeignKey('products.Product', related_name='reviews')
    customer = models.ForeignKey('customers.Customer')
    order = models.ForeignKey('orders.Order', null=True)
    rating = models.IntegerField()  # 1-5
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.8 banners (reklama bannerlari)

```python
class Banner(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='banners/')
    link = models.CharField(max_length=500, blank=True)
    shop = models.ForeignKey('shops.Shop', null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    start_date = models.DateTimeField(null=True)
    end_date = models.DateTimeField(null=True)
```

### 6.9 promotions (chegirmalar)

```python
class Promotion(models.Model):
    TYPE_CHOICES = [
        ('percent', 'Foiz'),
        ('fixed', 'Sovliq'),
        ('free_delivery', 'Bepul yetkazish'),
    ]
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=0)
    min_order = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    shop = models.ForeignKey('shops.Shop', null=True)  # Null = barcha do'konlar
    product = models.ForeignKey('products.Product', null=True)  # Null = barcha mahsulotlar
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    max_uses = models.IntegerField(null=True)
    current_uses = models.IntegerField(default=0)
```

---

## 7. API ENDPOINTS — TO'LIQ

### 7.1 Auth
```
POST   /api/auth/register/          → Ro'yxatdan o'tish (mijoz)
POST   /api/auth/login/             → Login (JWT)
POST   /api/auth/refresh/           → Token yangilash
GET    /api/auth/me/                → Foydalanuvchi ma'lumotlari
PUT    /api/auth/profile/           → Profil yangilash
PUT    /api/auth/password/          → Parol o'zgartirish
POST   /api/auth/verify-phone/      → Telefon tasdiqlash (SMS)
```

### 7.2 Shops
```
GET    /api/shops/                  → Do'konlar (pagination, filter, search)
GET    /api/shops/{slug}/           → Do'kon detali
GET    /api/shops/{id}/products/    → Do'kon mahsulotlari
GET    /api/shops/featured/         → Tavsiya etilgan do'konlar
GET    /api/shops/nearby/?lat=&lng=  → Yaqin atrofdagi do'konlar
POST   /api/shops/                  → Do'kon qo'shish (super_admin)
PUT    /api/shops/{id}/             → Do'kon tahrirlash (owner/admin)
DELETE /api/shops/{id}/             → Do'kon o'chirish (super_admin)
```

### 7.3 Products
```
GET    /api/products/               → Barcha mahsulotlar
GET    /api/products/{slug}/        → Mahsulot detali
GET    /api/products/featured/      → Tavsiya etilgan mahsulotlar
GET    /api/products/search/?q=     → Qidirish
GET    /api/products/?shop={id}     → Do'kon bo'yicha
GET    /api/products/?cat={id}      → Kategoriya bo'yicha
GET    /api/products/?brand={name}  → Brend bo'yicha
POST   /api/products/               → Qo'shish (shop_owner)
PUT    /api/products/{id}/          → Tahrirlash (owner)
DELETE /api/products/{id}/          → O'chirish (owner)
```

### 7.4 Orders
```
GET    /api/orders/                 → Barcha buyurtmalar (admin)
POST   /api/orders/                 → Buyurtma berish (mijoz)
GET    /api/orders/{id}/            → Buyurtma detali
PUT    /api/orders/{id}/status/     → Status o'zgartirish
PUT    /api/orders/{id}/assign/     → Kuryer tayinlash
GET    /api/orders/my/?phone=       → Mening buyurtmalarim (phone lookup)
GET    /api/orders/today/           → Bugungi buyurtmalar (admin)
GET    /api/orders/stats/           → Buyurtmalar statistikasi
```

### 7.5 Categories
```
GET    /api/categories/             → Kategoriyalar
POST   /api/categories/             → Qo'shish (admin)
PUT    /api/categories/{id}/        → Tahrirlash
DELETE /api/categories/{id}/        → O'chirish
```

### 7.6 Couriers
```
GET    /api/couriers/               → Kuryerlar
POST   /api/couriers/               → Qo'shish (admin)
PUT    /api/couriers/{id}/          → Tahrirlash
DELETE /api/couriers/{id}/          → O'chirish
PUT    /api/couriers/{id}/location/ → Joylashuv yangilash
GET    /api/couriers/{id}/orders/   → Kuryer buyurtmalari
PUT    /api/couriers/{id}/status/   → Status o'zgartirish (active/busy/offline)
```

### 7.7 Reviews
```
GET    /api/products/{id}/reviews/  → Mahsulot sharhlari
POST   /api/products/{id}/reviews/  → Sharh qoldirish (customer)
DELETE /api/reviews/{id}/           → Sharh o'chirish
```

### 7.8 Banners
```
GET    /api/banners/                → Faol bannerlar
POST   /api/banners/                → Banner qo'shish (admin)
PUT    /api/banners/{id}/           → Tahrirlash
DELETE /api/banners/{id}/           → O'chirish
```

### 7.9 Promotions
```
GET    /api/promotions/             → Faol chegirmalar
POST   /api/promotions/             → Chegirma qo'shish (admin)
PUT    /api/promotions/{id}/        → Tahrirlash
DELETE /api/promotions/{id}/        → O'chirish
POST   /api/promotions/apply/       → Chegirmani qo'llash
```

### 7.10 Dashboard
```
GET    /api/dashboard/stats/        → Umumiy statistika
GET    /api/dashboard/revenue/      → Daromad (kun/hafta/oy)
GET    /api/dashboard/orders/       → Buyurtmalar grafigi
GET    /api/dashboard/top-products/ → Eng ko'p sotilgan mahsulotlar
GET    /api/dashboard/top-shops/    → Eng faol do'konlar
```

### 7.11 Settings
```
GET    /api/settings/               → Barcha sozlamalar (admin)
GET    /api/settings/public/        → Ommaviy sozlamalar (mijoz)
PUT    /api/settings/{key}/         → Sozlamani yangilash (admin)
```

### 7.12 Search
```
GET    /api/search/?q=              → Umumiy qidirish
GET    /api/search/shops/?q=        → Do'konlardan qidirish
GET    /api/search/products/?q=     → Mahsulotlardan qidirish
```

---

## 8. WEB PAGES — TO'LIQ

### 8.1 Mijoz (Customer)

| URL | Sahifa | Tavsif |
|-----|--------|--------|
| `/` | Bosh sahifa | Banner, do'konlar, kategoriyalar, tavsiyalar |
| `/catalog/` | Katalog | Barcha mahsulotlar, kategoriya, qidirish, filter |
| `/shop/{slug}/` | Do'kon detali | Do'kon ma'lumotlari + mahsulotlari |
| `/product/{slug}/` | Mahsulot detali | Rasmlar, tarkib, sharhlar, savatga qo'shish |
| `/cart/` | Savat | Savat, checkout form, yetkazish narxi |
| `/orders/` | Buyurtmalarim | Telefon orqali qidirish |
| `/order/{id}/` | Buyurtma tracking | Status timeline, kuryer ma'lumotlari |

### 8.2 Admin

| URL | Sahifa | Tavsif |
|-----|--------|--------|
| `/admin/login/` | Kirish | Login form |
| `/admin/register/` | Ro'yxatdan o'tish | Yangi do'kon egasi |
| `/admin/dashboard/` | Dashboard | Statistika, grafik, so'nggi buyurtmalar |
| `/admin/shops/` | Do'konlar | CRUD jadval, qidirish, filter |
| `/admin/products/` | Mahsulotlar | CRUD jadval, kategoriya, brend filter |
| `/admin/orders/` | Buyurtmalar | Status boshqaruv, qidirish, filter |
| `/admin/couriers/` | Kuryerlar | CRUD, status, joylashuv |
| `/admin/categories/` | Kategoriyalar | CRUD, tartib |
| `/admin/reviews/` | Sharhlar | Sharhlarni boshqarish |
| `/admin/banners/` | Bannerlar | CRUD, tartib |
| `/admin/promotions/` | Chegirmalar | CRUD, chegirma turini tanlash |
| `/admin/customers/` | Mijozlar | Mijozlar ro'yxati, buyurtmalar tarixi |
| `/admin/settings/` | Sozlamalar | Barcha sozlamalar |
| `/admin/profile/` | Profil | Shaxsiy ma'lumotlar, parol |

### 8.3 Kuryer

| URL | Sahifa | Tavsif |
|-----|--------|--------|
| `/courier/login/` | Kirish | Telefon + parol |
| `/courier/dashboard/` | Dashboard | Faol buyurtmalar ro'yxati |
| `/courier/order/{id}/` | Buyurtma detali | Manzil, xarita, mahsulotlar, status |
| `/courier/history/` | Tarix | Yetkazilgan buyurtmalar |
| `/courier/profile/` | Profil | Ma'lumotlar, statistika |

---

## 9. FLUTTER APK — TO'LIQ O'ZGARISHLAR

### 9.1 Yangi papka tuzilishi

```
lib/
├── config/
│   ├── api_config.dart              # BASE_URL, endpoints
│   ├── app_config.dart              # Versiya, feature flags
│   └── category_icons.dart          # Kategoriya ikonkalari
├── services/
│   ├── api_service.dart             # Dio HTTP client
│   ├── auth_service.dart            # JWT management
│   ├── shop_api.dart                # Shop API calls
│   ├── product_api.dart             # Product API calls
│   ├── order_api.dart               # Order API calls
│   ├── courier_api.dart             # Courier API calls
│   ├── search_api.dart              # Search API
│   └── offline_sync.dart            # Offline sync manager
├── database/
│   ├── database_helper.dart         # SQLite (cache)
│   └── drift_database.dart          # Type-safe SQLite
├── models/
│   ├── shop.dart
│   ├── product.dart                 # Kengaytirilgan
│   ├── order.dart
│   ├── courier.dart
│   ├── category.dart
│   ├── review.dart
│   ├── banner.dart
│   └── promotion.dart
├── screens/
│   ├── customer/
│   │   ├── home_screen.dart
│   │   ├── catalog_screen.dart
│   │   ├── shop_detail_screen.dart
│   │   ├── product_detail_screen.dart
│   │   ├── cart_screen.dart
│   │   ├── checkout_screen.dart
│   │   ├── orders_screen.dart
│   │   └── order_tracking_screen.dart
│   ├── courier/
│   │   ├── courier_login_screen.dart
│   │   ├── courier_dashboard_screen.dart
│   │   └── courier_order_screen.dart
│   └── auth/
│       ├── login_screen.dart
│       └── register_screen.dart
├── providers/
│   ├── shop_provider.dart
│   ├── product_provider.dart
│   ├── cart_provider.dart
│   ├── order_provider.dart
│   ├── auth_provider.dart
│   ├── courier_provider.dart
│   ├── theme_provider.dart
│   └── language_provider.dart
├── widgets/
│   ├── product_card.dart            # Yangi dizayn
│   ├── shop_card.dart               # Yangi dizayn
│   ├── category_chip.dart
│   ├── banner_carousel.dart
│   ├── rating_stars.dart
│   └── offline_indicator.dart
└── interceptors/
    └── auth_interceptor.dart        # Token qo'shish
```

### 9.2 O'chiriladigan fayllar

```
lib/repositories/shop_repository.dart
lib/repositories/product_repository.dart
lib/repositories/order_repository.dart
lib/database/sqlite.dart
lib/database/sqlite_io.dart
lib/database/sqlite_web.dart
```

### 9.3 Yangi依赖

```yaml
dependencies:
  dio: ^5.4.0
  flutter_secure_storage: ^9.0.0
  drift: ^2.18.0
  connectivity_plus: ^6.0.0
  geolocator: ^10.1.0
  image_picker: ^1.1.0
  flutter_svg: ^2.0.0
  carousel_slider: ^5.0.0
  pull_to_refresh: ^2.0.0
  shimmer: ^3.0.0
  cached_network_image: ^3.3.0
```

---

## 10. TELEGRAM BOT — TO'LIQ

### 10.1 Bot struktura

```
bot/
├── main.py                 # Bot entry point
├── config.py               # Bot token, API URL
├── handlers/
│   ├── start.py            # /start handler
│   ├── order.py            # Buyurtma berish
│   ├── status.py           # Status tekshirish
│   └── help.py             # Yordam
├── keyboards/
│   ├── main_menu.py        # Asosiy menyu
│   ├── shop_list.py        # Do'konlar ro'yxati
│   └── product_list.py     # Mahsulotlar
├── services/
│   ├── api_client.py       # Django REST API client
│   └── order_service.py    # Buyurtma logikasi
├── middlewares/
│   └── rate_limit.py       # Spam himoya
├── states/
│   └── order_states.py     # Buyurtma FSM holatlari
└── utils/
    ├── format.py           # Formatlash
    └── validators.py       # Tekshirish
```

### 10.2 Bot handlerlari

```
/start                    → Xush kelibsiz, menyu
/catalog                  → Do'konlar ro'yxati
/catalog {shop_id}        → Do'kon mahsulotlari
/add {product_id}         → Savatga qo'shish
/cart                     → Savatni ko'rish
/order                    → Buyurtma berish
/status {order_number}    → Buyurtma statusi
/myorders                 → Mening buyurtmalarim
/help                     → Yordam
```

### 10.3 Bot deploy

```yaml
# docker-compose.yml
version: '3.8'
services:
  bot:
    build: ./bot
    environment:
      BOT_TOKEN: ${BOT_TOKEN}
      API_URL: http://backend:8000/api
      REDIS_URL: redis://redis:6379
    depends_on:
      - backend
      - redis

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/store
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  redis:
    image: redis:7-alpine

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: store
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 11. DEPLOYMENT

### 11.1 Backend

```
Platforma: Render.com (free tier) yoki Railway
URL: https://online-store-guliston.onrender.com
DB: PostgreSQL (Render free)
Cache: Redis (Render free)
```

### 11.2 Telegram Bot

```
Platforma: Render.com (free tier) yoki Railway
URL: https://store-guliston-bot.onrender.com
```

### 11.3 Flutter APK

```
Build: flutter build apk --release
Distribution: Telegram kanal yoki veb-sayt
```

---

## 12. ISH REJASI

| # | Faza | Vaqt | Tavsif |
|---|------|------|--------|
| 1 | Django project + models | 1 kun | Project, apps, 10+ models, migrate, admin |
| 2 | API endpoints (core) | 2 kun | Auth, shops, products, orders, categories |
| 3 | API endpoints (extra) | 1 kun | Couriers, reviews, banners, promotions, settings |
| 4 | Auth (JWT + roles) | 0.5 kun | Login, token, permission, role-based access |
| 5 | Web templates (mijoz) | 1.5 kun | Bosh sahifa, katalog, do'kon, mahsulot, savat, checkout |
| 6 | Web templates (admin) | 1.5 kun | Dashboard, CRUD, status boshqaruv, sozlamalar |
| 7 | Web templates (kuryer) | 0.5 kun | Kuryer paneli |
| 8 | Flutter API integration | 1.5 kun | HTTP client, offline sync, yangi modellar |
| 9 | Flutter courier mode | 0.5 kun | Kuryer paneli (Flutter) |
| 10 | Telegram bot | 1 kun | aiogram, handler, API client, FSM |
| 11 | Image management | 0.5 kun | Rasm yuklash, resize, CDN |
| 12 | Test + deploy | 1 kun | Test, Render.com, APK build |

**Jami: ~12 kun**

---

## 13. MUHOFAZA (Security)

- JWT token: 30 daqiqa access, 7 kun refresh
- Admin endpointlar: `IsAuthenticated + IsAdmin`
- Shop owner: faqat o'z do'koni (`owner` field check)
- Rate limiting: 100 req/min (API), 5 req/min (login)
- CORS: faqat ruxsat etilgan manzillar
- Parol: Django PBKDF2 (default)
- CSRF: API uchun JWT, template uchun CSRF token
- HTTPS: productionda majburiy
- Input validation: DRF serializer + Django form
- Image validation: faqat rasm formatlari, maksimal 5MB
- SQL injection: Django ORM himoyasi
- XSS: Django template auto-escape

---

## 14. TESTING

```
Backend:
- Unit test: models, serializers, views (80%+ coverage)
- API test: barcha endpointlar
- Integration test: buyurtma flow (pending → delivered)
- Permission test: har bir role uchun

Flutter:
- Unit test: services, models, providers
- Widget test: UI komponentlar
- Integration test: buyurtma berish flow
- Offline test: internet yo'qda ishlash

Telegram Bot:
- Handler test: /start, /order, /status
- FSM test: buyurtma state machine
- Rate limit test: spam himoya
```

---

## 15. TASDIQLASH

### Agar TZ maqul bo'lsa:
1. Django project yarataman
2. 10+ model + migrate
3. 40+ API endpoint
4. 15+ web sahifa
5. Flutter integration
6. Telegram bot
7. Deploy

### Agar o'zgartirish kerak bo'lsa:
- Qaysi qismini o'zgartirish?
- Qo'shimcha feature kerakmi?
- Deployment platformasi aniqmi?

---

**TZ v3.0 TUGALLANDI — TO'LIQ, BATAFSIL, STARTUP DARAJADA**
**TASDIQ KUTAMAN**
