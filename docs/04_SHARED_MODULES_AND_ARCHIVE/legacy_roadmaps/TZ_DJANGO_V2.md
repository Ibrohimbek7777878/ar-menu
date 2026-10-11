# TECHNICAL SPECIFICATION v2.0
# Online Store Guliston — To'liq Platform Arxitekturasi
# O'zbekiston Bozorida Yagona Commerce Platforma

---

## 0. LOYIHA MAQSADI

**Missiya:** O'zbekiston (Guliston/Yangi Yer) kichik do'konlari uchun
yagona commerce platforma — Uzum Tezkorni mag'lub qiladigan darajada
tezkor, qulay va arzon.

**Nima uchun biz yaxshiramiz:**
- Uzum Tezkor 2600+ do'kon, 7000+ kuryer — lekin lokal fokus yo'q
- Biz: mahalla do'konlariga yaqin, tez yetkazish, oson interfeys
- Offline ishlash — internet sifati yomon joylarda ham
- Telegram bot — o'rnatish kerak emas, mavjud

**Platformalar:**
```
1. Mobile APK (Flutter)       → Mijozlar uchun
2. Desktop Web (Django HTML)  → Admin/Sotuvchi uchun
3. Telegram Bot (Python)      → Buyurtma + bildirishnoma
4. Courier Web (Django HTML)  → Kuryerlar uchun
```

**Bitta backend, to'rtta client:**
```
                    ┌─────────────────┐
                    │  Django REST API │  ← Bitta backend
                    │  (PostgreSQL)    │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────┐ ┌──────▼──────┐
     │ Flutter APK    │ │Django  │ │ Telegram    │
     │ (Mijoz)       │ │Templates│ │ Bot         │
     │ Offline-first  │ │(Admin) │ │(Buyurtma)   │
     └────────────────┘ └────────┘ └─────────────┘
                               │
                      ┌────────▼──────┐
                      │ Courier Web   │
                      │ (Kuryer)      │
                      └───────────────┘
```

---

## 1. TEXNOLOGIYA STACK

### 1.1 Backend
| Komponent | Texnologiya | Sabab |
|-----------|------------|-------|
| Framework | Django 5.x + DRF | O'zbekistonda Django mutaxassislari ko'p |
| Auth | JWT (simplejwt) | Mobile + web uchun yagona |
| DB | PostgreSQL (prod), SQLite (dev) | Relational, trustworthy |
| Cache | Redis (prod) | Real-time, session, rate limit |
| Task | Celery + Redis | Telegram push, email, background |
| Static | WhiteNoise | Docker/deploy uchun qulay |
| Image | Pillow + Django Storages | Rasm yuklash |

### 1.2 Frontend (Desktop Admin)
| Komponent | Texnologiya | Sabab |
|-----------|------------|-------|
| Templates | Django + Tailwind CSS | Tez, professional |
| JS | Alpine.js (minimal) | Reactive, kichik |
| Chart | Chart.js | Dashboard grafiklari |
| Table | DT.net yoki vanilla | CRUD jadvallar |

### 1.3 Mobile APK
| Komponent | Texnologiya | Sabab |
|-----------|------------|-------|
| Framework | Flutter 3.x | Cross-platform |
| State | Provider | Mavjud, ishonchili |
| HTTP | Dio + interceptor | JWT, retry, cache |
| Offline | SQLite + drift | Offline-first |
| Storage | flutter_secure_storage | JWT, session |

### 1.4 Telegram Bot
| Komponent | Texnologiya | Sabab |
|-----------|------------|-------|
| Framework | aiogram 3.x | Async, tez |
| Deploy | Docker + Render | Bepul tier |

### 1.5 Courier Web
| Komponent | Texnologiya | Sabab |
|-----------|------------|-------|
| Templates | Django + HTMX | Minimal JS, tez |
| Location | Geolocation API | Joylashuv yuborish |

---

## 2. OFFLINE ARXITEKTURASI

### 2.1 Qaysi qismlar offline ishlaydi:

| Funksiya | Offline? | Tavsif |
|----------|----------|--------|
| Do'konlarni ko'rish | ✅ Ha | Cache'dan oxirgi yuklangan |
| Mahsulotlarni ko'rish | ✅ Ha | Cache'dan |
| Savatga qo'shish | ✅ Ha | Local SQLite |
| Buyurtma berish | ⚠️ Qisman | Local draft → online bo'lganda sync |
| Buyurtma statusini ko'rish | ❞ Yo'q | Server talab qiladi |
| Admin panel | ❞ Yo'q | Server kerak |
| Telegram bot | ❞ Yo'q | Server kerak |
| Kuryer paneli | ⚠️ Qisman | Offline order list, online status update |

### 2.2 Offline → Online Sync

```dart
// Flutter offline flow:
class OfflineSync {
  // 1. Ma'lumotlar bazasi
  final _localDb = SQLiteHelper();

  // 2. Internet bor → API dan yukla, local ga saqla
  Future<void> syncFromServer() async {
    if (!await isConnected()) return;
    final shops = await api.getShops();
    await _localDb.saveShops(shops);
    // Oxirgi sync vaqtini saqlash
    await _localDb.setLastSync(DateTime.now());
  }

  // 3. Internet yo'q → local draft saqlash
  Future<void> createOrderDraft(Order order) async {
    await _localDb.saveDraftOrder(order);
  }

  // 4. Internet paydo bo'ldi → draftlarni yuborish
  Future<void> syncToServer() async {
    if (!await isConnected()) return;
    final drafts = await _localDb.getPendingDrafts();
    for (final draft in drafts) {
      try {
        await api.createOrder(draft);
        await _localDb.markDraftSynced(draft.id);
      } catch (e) {
        // Keyin qayta urinish
      }
    }
  }
}
```

### 2.3 Cache Strategy

```
Ma'lumot turi     │ Cache muddati │ Yangilash usuli
──────────────────┼───────────────┼────────────────
Do'konlar         │ 24 soat       │ Manual refresh
Mahsulotlar       │ 12 soat       │ Pull-to-refresh
Kategoriyalar     │ 7 kun         │ App update
Buyurtmalarim     │ Real-time     │ WebSocket/Polling
Savat             │ Doimiy        │ Local only
```

---

## 3. MODELLAR (Backend)

### 3.1 accounts

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
    # shop_owner faqat o'z do'konini ko'radi
    is_active = models.BooleanField(default=True)
```

### 3.2 shops

```python
class Shop(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    latitude = models.FloatField()
    longitude = models.FloatField()
    category = models.ForeignKey('categories.Category', null=True)
    image = models.ImageField(upload_to='shops/')
    working_hours = models.CharField(max_length=50)  # "08:00-22:00"
    is_open = models.BooleanField(default=True)
    rating = models.FloatField(default=0)
    min_order = models.IntegerField(default=20000)  # Min buyurtma
    owner = models.ForeignKey('accounts.AdminUser', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.3 products

```python
class Product(models.Model):
    shop = models.ForeignKey(Shop, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    unit = models.CharField(max_length=20)  # dona, kg, litr
    category = models.ForeignKey('categories.Category', null=True)
    image = models.ImageField(upload_to='products/', null=True)
    is_available = models.BooleanField(default=True)
    stock = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.4 orders

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
    order_number = models.CharField(max_length=20, unique=True)
    # OSG-20260727-001 format
    customer_name = models.CharField(max_length=200)
    customer_phone_1 = models.CharField(max_length=20)
    customer_phone_2 = models.CharField(max_length=20, blank=True)
    customer_phone_3 = models.CharField(max_length=20, blank=True)
    shop = models.ForeignKey(Shop)
    delivery_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=0, default=6000)
    final_amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_pickup = models.BooleanField(default=False)
    courier = models.ForeignKey('couriers.Courier', null=True, blank=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    confirmed_by_phone = models.BooleanField(default=False)
    cancel_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items')
    product = models.ForeignKey(Product, null=True)
    product_name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.IntegerField(default=1)
    unit = models.CharField(max_length=20)

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, related_name='history')
    status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey('accounts.AdminUser', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.5 couriers

```python
class Courier(models.Model):
    STATUS_CHOICES = [
        ('active', 'Faol'),
        ('busy', 'Band'),
        ('offline', 'Oflayn'),
    ]
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    current_lat = models.FloatField(null=True)
    current_lng = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.6 categories

```python
class Category(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='📦')
    color = models.CharField(max_length=7, default='#16a34a')
    sort_order = models.IntegerField(default=0)
```

### 3.7 notifications

```python
class NotificationLog(models.Model):
    TYPE_CHOICES = [
        ('telegram', 'Telegram'),
        ('push', 'Push'),
        ('sms', 'SMS'),
    ]
    order = models.ForeignKey(Order, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    recipient = models.CharField(max_length=200)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
```

---

## 4. API ENDPOINTS

### 4.1 Auth
```
POST   /api/auth/login/           → JWT token olish
POST   /api/auth/refresh/         → Token yangilash
GET    /api/auth/me/              → Foydalanuvchi ma'lumotlari
PUT    /api/auth/password/        → Parol o'zgartirish
```

### 4.2 Shops
```
GET    /api/shops/                → Do'konlar (pagination, filter)
GET    /api/shops/{id}/           → Do'kon detali
POST   /api/shops/                → Do'kon qo'shish (admin)
PUT    /api/shops/{id}/           → Do'kon tahrirlash
DELETE /api/shops/{id}/           → Do'kon o'chirish
GET    /api/shops/{id}/products/  → Do'kon mahsulotlari
```

### 4.3 Products
```
GET    /api/products/             → Barcha mahsulotlar
GET    /api/products/{id}/        → Mahsulot detali
POST   /api/products/             → Qo'shish (admin)
PUT    /api/products/{id}/        → Tahrirlash
DELETE /api/products/{id}/        → O'chirish
GET    /api/products/?shop={id}   → Do'kon bo'yicha
GET    /api/products/?cat={id}    → Kategoriya bo'yicha
GET    /api/products/?search=q    → Qidirish
```

### 4.4 Orders
```
GET    /api/orders/               → Barcha buyurtmalar (admin)
POST   /api/orders/               → Buyurtma berish (mijoz)
GET    /api/orders/{id}/          → Buyurtma detali
PUT    /api/orders/{id}/status/   → Status o'zgartirish
PUT    /api/orders/{id}/assign/   → Kuryer tayinlash
GET    /api/orders/my/?phone=     → Mening buyurtmalarim (phone lookup)
```

### 4.5 Categories
```
GET    /api/categories/           → Kategoriyalar
POST   /api/categories/           → Qo'shish
PUT    /api/categories/{id}/      → Tahrirlash
DELETE /api/categories/{id}/      → O'chirish
```

### 4.6 Couriers
```
GET    /api/couriers/             → Kuryerlar
POST   /api/couriers/             → Qo'shish
PUT    /api/couriers/{id}/        → Tahrirlash
DELETE /api/couriers/{id}/        → O'chirish
PUT    /api/couriers/{id}/location/ → Joylashuv yangilash
GET    /api/couriers/{id}/orders/ → Kuryer buyurtmalari
```

### 4.7 Dashboard
```
GET    /api/dashboard/stats/      → Umumiy statistika
GET    /api/dashboard/revenue/?d= → Daromad (kun/hafta/oy)
GET    /api/dashboard/orders/     → Buyurtmalar grafigi
```

### 4.8 Delivery
```
POST   /api/delivery/calculate/   → Yetkazish narxini hisoblash
GET    /api/delivery/zones/       → Zonalar ro'yxati
```

---

## 5. WEB PAGES

### 5.1 Mijoz (Customer)
```
/                        → Bosh sahifa (do'konlar)
/catalog/                → Katalog (mahsulotlar)
/shop/{id}/              → Do'kon detali
/cart/                   → Savat + checkout
/orders/                 → Buyurtmalarim (phone lookup)
/order/{id}/             → Buyurtma tracking
```

### 5.2 Admin
```
/admin/login/            → Kirish
/admin/dashboard/        → Dashboard (statistika, grafik)
/admin/shops/            → Do'konlar CRUD
/admin/products/         → Mahsulotlar CRUD
/admin/orders/           → Buyurtmalar (status boshqaruv)
/admin/couriers/         → Kuryerlar CRUD
/admin/categories/       → Kategoriyalar CRUD
/admin/settings/         → Sozlamalar
```

### 5.3 Kuryer
```
/courier/login/          → Kirish
/courier/dashboard/      → Mening buyurtmalarim
/courier/order/{id}/     → Buyurtma detali + status o'zgartirish
/courier/location/       → Joylashuv yangilash (GPS)
```

### 5.4 Telegram Bot
```
/start                   → Boshlang'ich menyu
/order                   → Buyurtma berish (savatdan)
/status {order_number}   → Buyurtma statusini tekshirish
/myorders                → Mening buyurtmalarim
```

---

## 6. TELEGRAM BOT

### 6.1 Bot funksiyalari

**Mijoz uchun:**
- /start — Xush kelibsiz, buyurtma berish
- Savatdagi mahsulotlarni ko'rsatish
- Buyurtma berish (telefon, manzil)
- Buyurtma statusini tekshirish

**Do'kon egasi uchun:**
- Yangi buyurtma kelganda xabar
- Status o'zgartirish (tasdiqlash/tayyorlash/bekor qilish)
- Kunlik hisobot

**Kuryer uchun:**
- Yangi buyurtma tayinlanganda xabar
- Manzil va xarita
- Yetkazildi deb belgilash

### 6.2 Bot arxitekturasi

```
Telegram Bot (aiogram 3.x)
    │
    ├── Handler: /start, /order, /status
    ├── FSM: Buyurtma berish state machine
    ├── Middleware: Rate limit, auth
    └── Service: Django REST API client
```

### 6.3 Bot deploy

```yaml
# docker-compose.yml
services:
  bot:
    build: ./bot
    environment:
      BOT_TOKEN: ${BOT_TOKEN}
      API_URL: http://backend:8000/api
    depends_on:
      - backend
```

---

## 7. KURYER PANELI

### 7.1 Flutter APK ichida Courier Mode

```dart
// Flutter'da kuryer rejimi
class CourierScreen extends StatefulWidget {
  // 1. Kirish (telefon + parol)
  // 2. Mening buyurtmalarim ro'yxati
  // 3. Buyurtma detali (manzil, xarita, mahsulotlar)
  // 4. Status o'zgartirish (qabul qildim → yetkazdim)
  // 5. GPS joylashuv yuborish (har 30 soniyada)
}
```

### 7.2 Yoki alohida web (Django)

```
/courier/login/          → Telefon kirish
/courier/dashboard/      → Faol buyurtmalar
/courier/order/{id}/     → Detal + "Yetkazildi" tugmasi
```

---

## 8. FLUTTER APK O'ZGARISHLARI

### 8.1 Yangi fayllar

```
lib/
├── config/
│   ├── api_config.dart          # BASE_URL, endpoints
│   └── app_config.dart          # Versiya, feature flags
├── services/
│   ├── api_service.dart         # Dio HTTP client
│   ├── auth_service.dart        # JWT management
│   ├── shop_api.dart            # Shop API
│   ├── product_api.dart         # Product API
│   ├── order_api.dart           # Order API
│   └── offline_sync.dart        # Offline sync manager
├── database/
│   ├── database_helper.dart     # SQLite (cache)
│   └── drift_database.dart      # Type-safe SQLite
└── screens/
    └── courier/
        └── courier_dashboard.dart  # Kuryer paneli
```

### 8.2 O'chiriladigan fayllar

```
lib/repositories/shop_repository.dart    # API ga almashtiriladi
lib/repositories/product_repository.dart
lib/repositories/order_repository.dart
```

### 8.3 Yangi依赖

```yaml
dependencies:
  dio: ^5.4.0
  flutter_secure_storage: ^9.0.0
  drift: ^2.18.0          # Type-safe SQLite
  connectivity_plus: ^6.0.0  # Internet aniqlash
  geolocator: ^10.1.0     # GPS
```

---

## 9. DEPLOYMENT

### 9.1 Backend (Django)

```
Platforma: Render.com (free tier) yoki Railway
URL: https://online-store-guliston.onrender.com
DB: PostgreSQL (Render free)
Cache: Redis (Render free)
```

### 9.2 Telegram Bot

```
Platforma: Render.com (free tier) yoki Railway
URL: https://store-guliston-bot.onrender.com
```

### 9.3 Flutter APK

```
Build: flutter build apk --release
Distribution: Telegram kanal yoki veb-sayt orqali download
```

---

## 10. ISH REJASI

| # | Faza | Vaqt | Tavsif |
|---|------|------|--------|
| 1 | Django project + models | 1 kun | Project, apps, models, migrate, admin |
| 2 | API endpoints | 1.5 kun | DRF serializers, views, urls, filter |
| 3 | Auth (JWT) | 0.5 kun | Login, token, permission, role |
| 4 | Web templates (mijoz) | 1 kun | Bosh sahifa, katalog, savat, checkout |
| 5 | Web templates (admin) | 1 kun | Dashboard, CRUD sahifalar |
| 6 | Web templates (kuryer) | 0.5 kun | Kuryer paneli |
| 7 | Flutter API integration | 1 kun | HTTP client, offline sync |
| 8 | Flutter courier mode | 0.5 kun | Kuryer paneli (Flutter) |
| 9 | Telegram bot | 1 kun | aiogram, handler, API client |
| 10 | Test + deploy | 1 kun | Test, Render.com, APK build |

**Jami: ~9 kun**

---

## 11. MUHOFAZA (Security)

- JWT token: 30 daqiqa access, 7 kun refresh
- Admin endpointlar: `IsAuthenticated + IsAdmin`
- Shop owner: faqat o'z do'koni
- Rate limiting: 100 req/min (API), 5 req/min (login)
- CORS: faqat ruxsat etilgan manzillar
- Parol: Django PBKDF2 (default)
- CSRF: API uchun JWT, template uchun CSRF token
- HTTPS: productionda majburiy
- Input validation: DRF serializer + Django form

---

## 12. TESTING

```
Backend:
- Unit test: models, serializers, views
- API test: endpointlar
- Integration test: buyurtma flow

Flutter:
- Unit test: services, models
- Widget test: UI komponentlar
- Integration test: buyurtma berish flow

Telegram Bot:
- Handler test: /start, /order
- FSM test: buyurtma state machine
```

---

## 13. TASDIQLASH

### Agar TZ maqul bo'lsa:
1. Django project yarataman
2. Models + migrate
3. API endpoints
4. Web templates
5. Flutter integration
6. Telegram bot
7. Deploy

### Agar o'zgartirish kerak bo'lsa:
- Qaysi qismini o'zgartirish?
- Qo'shimcha feature kerakmi?
- Deployment platformasi aniqmi?

---

**TZ v2.0 TUGALLANDI — TASDIQ KUTAMAN**
