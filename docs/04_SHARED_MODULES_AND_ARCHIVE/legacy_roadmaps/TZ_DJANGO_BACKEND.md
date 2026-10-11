# TECHNICAL SPECIFICATION — Online Store Guliston
# Django REST Backend + HTML Frontend
# APK + Desktop Web — Bitta Backend

---

## 1. UMUMIY TUSHUNCHA

**Maqsad:** Bitta Django REST backend yaratish, u quyidagilarga xizmat qiladi:
- **Desktop Web** — Django HTML templates (brauzerda ishlaydi)
- **Mobile APK** — Flutter ilovasi Django REST API ga so'rov jo'natadi

**Texnologiya:**
- Backend: Python 3.12+ / Django 5.x / Django REST Framework
- Frontend (web): Django templates + Tailwind CSS (yoki vanilla CSS)
- Frontend (mobile): Flutter (mavjud kod asosida)
- Ma'lumotlar bazasi: SQLite (dev) / PostgreSQL (prod)
- Auth: JWT (djangorestframework-simplejwt)

**Muhit:** Bitta server, ikkala client ishlatadi

---

## 2. LOYIHA TUZILISHI

```
online_store_guliston/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                    # Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── accounts/              # Foydalanuvchilar, admin auth
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── templates/accounts/
│   │   ├── shops/                 # Do'konlar
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── templates/shops/
│   │   ├── products/              # Mahsulotlar
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── templates/products/
│   │   ├── orders/                # Buyurtmalar
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── templates/orders/
│   │   ├── couriers/              # Kuryerlar
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── categories/            # Kategoriyalar
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   └── notifications/         # Telegram + push
│   │       ├── models.py
│   │       ├── services.py
│   │       └── views.py
│   ├── templates/                 # Umumiy templates
│   │   ├── base.html
│   │   ├── base_admin.html
│   │   └── components/
│   ├── static/                    # CSS, JS, rasmlar
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── media/                     # Yuklangan rasmlar
├── mobile/                        # Flutter APK (mavjud)
│   └── store_guliston_v1/
└── desktop_version/               # Eski HTML (o'chiriladi)
```

---

## 3. MODELLAR

### 3.1 accounts (Foydalanuvchilar)

```python
# accounts/models.py
class AdminUser(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('manager', 'Menejer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.2 shops (Do'konlar)

```python
# shops/models.py
class Shop(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    category = models.CharField(max_length=100)
    image = models.ImageField(upload_to='shops/', blank=True, null=True)
    working_hours = models.CharField(max_length=50, default='08:00-22:00')
    is_open = models.BooleanField(default=True)
    rating = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 3.3 products (Mahsulotlar)

```python
# products/models.py
class Product(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    unit = models.CharField(max_length=20, default='dona')  # dona, kg, litr, botal
    category = models.ForeignKey('categories.Category', on_delete=models.SET_NULL, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_available = models.BooleanField(default=True)
    stock = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.4 categories (Kategoriyalar)

```python
# categories/models.py
class Category(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='📦')
    color = models.CharField(max_length=7, default='#16a34a')
    sort_order = models.IntegerField(default=0)
```

### 3.5 orders (Buyurtmalar)

```python
# orders/models.py
class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('confirmed', 'Tasdiqlangan'),
        ('preparing', 'Tayyorlanmoqda'),
        ('ready', 'Tayyor'),
        ('out_for_delivery', 'Yo''lda'),
        ('delivered', 'Yetkazildi'),
        ('cancelled', 'Bekor qilindi'),
    ]
    order_number = models.CharField(max_length=20, unique=True)
    customer_name = models.CharField(max_length=200)
    customer_phone_1 = models.CharField(max_length=20)
    customer_phone_2 = models.CharField(max_length=20, blank=True)
    customer_phone_3 = models.CharField(max_length=20, blank=True)
    shop = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True)
    delivery_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=0, default=6000)
    final_amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_pickup = models.BooleanField(default=False)
    courier = models.ForeignKey('couriers.Courier', on_delete=models.SET_NULL, null=True, blank=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.IntegerField(default=1)
    unit = models.CharField(max_length=20, default='dona')
```

### 3.6 couriers (Kuryerlar)

```python
# couriers/models.py
class Courier(models.Model):
    STATUS_CHOICES = [('active', 'Faol'), ('inactive', 'Nofaol')]
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 4. API ENDPOINTS

### 4.1 Auth

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| POST | `/api/auth/login/` | Login (JWT) | Yo'q |
| POST | `/api/auth/refresh/` | Token yangilash | Yo'q |
| GET | `/api/auth/me/` | Foydalanuvchi ma'lumotlari | Ha |
| PUT | `/api/auth/password/` | Parol o'zgartirish | Ha |

### 4.2 Shops

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/shops/` | Do'konlar ro'yxati | Yo'q |
| GET | `/api/shops/{id}/` | Do'kon detali | Yo'q |
| POST | `/api/shops/` | Do'kon qo'shish | Admin |
| PUT | `/api/shops/{id}/` | Do'kon tahrirlash | Admin |
| DELETE | `/api/shops/{id}/` | Do'kon o'chirish | Admin |
| GET | `/api/shops/{id}/products/` | Do'kon mahsulotlari | Yo'q |

### 4.3 Products

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/products/` | Barcha mahsulotlar | Yo'q |
| GET | `/api/products/{id}/` | Mahsulot detali | Yo'q |
| POST | `/api/products/` | Mahsulot qo'shish | Admin |
| PUT | `/api/products/{id}/` | Mahsulot tahrirlash | Admin |
| DELETE | `/api/products/{id}/` | Mahsulot o'chirish | Admin |

### 4.4 Orders

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/orders/` | Barcha buyurtmalar | Admin |
| GET | `/api/orders/{id}/` | Buyurtma detali | Admin |
| POST | `/api/orders/` | Buyurtma berish | Yo'q (mijoz) |
| PUT | `/api/orders/{id}/status/` | Status o'zgartirish | Admin |
| PUT | `/api/orders/{id}/assign/` | Kuryer tayinlash | Admin |
| GET | `/api/orders/my/` | Mening buyurtmalarim | Yo'q (session) |

### 4.5 Categories

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/categories/` | Kategoriyalar ro'yxati | Yo'q |
| POST | `/api/categories/` | Kategoriya qo'shish | Admin |
| PUT | `/api/categories/{id}/` | Kategoriya tahrirlash | Admin |
| DELETE | `/api/categories/{id}/` | Kategoriya o'chirish | Admin |

### 4.6 Couriers

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/couriers/` | Kuryerlar ro'yxati | Admin |
| POST | `/api/couriers/` | Kuryer qo'shish | Admin |
| PUT | `/api/couriers/{id}/` | Kuryer tahrirlash | Admin |
| DELETE | `/api/couriers/{id}/` | Kuryer o'chirish | Admin |

### 4.7 Dashboard

| Method | URL | Tavsif | Auth |
|--------|-----|--------|------|
| GET | `/api/dashboard/stats/` | Statistika | Admin |
| GET | `/api/dashboard/revenue/` | Daromad grafigi | Admin |

---

## 5. WEB PAGES (Django Templates)

### 5.1 Mijoz sahifalari

| URL | Sahifa | Tavsif |
|-----|--------|--------|
| `/` | Bosh sahifa | Splash → do'konlar ro'yxati |
| `/catalog/` | Katalog | Barcha mahsulotlar, kategoriya filter |
| `/shop/{id}/` | Do'kon detali | Do'kon + mahsulotlari |
| `/cart/` | Savat | Savat, checkout form |
| `/orders/` | Buyurtmalarim | Session bo'yicha buyurtmalar |
| `/order/{id}/` | Buyurtma detali | Holat tracking |

### 5.2 Admin sahifalari

| URL | Sahifa | Tavsif |
|-----|--------|--------|
| `/admin/login/` | Kirish | Login form |
| `/admin/dashboard/` | Dashboard | Statistika, grafik |
| `/admin/shops/` | Do'konlar | CRUD jadval |
| `/admin/products/` | Mahsulotlar | CRUD jadval |
| `/admin/orders/` | Buyurtmalar | Status boshqaruv |
| `/admin/couriers/` | Kuryerlar | CRUD jadval |
| `/admin/categories/` | Kategoriyalar | CRUD jadval |
| `/admin/settings/` | Sozlamalar | App sozlamalari |

---

## 6. FLUTTER APK GA TA'SIR

### 6.1 O'zgarishlar

Flutter kodida quyidagilar o'zgaradi:

| Eski (SQLite) | Yangi (Django API) |
|---------------|---------------------|
| `DatabaseHelper()` | `http.get('$BASE_URL/api/shops/')` |
| `ShopRepository` | `ShopService` → HTTP client |
| `loadShops()` (local) | `fetchShops()` (API) |
| Offline-first | Online + cache |

### 6.2 Yangi fayllar

```
lib/
├── config/
│   └── api_config.dart          # BASE_URL, endpoints
├── services/
│   ├── api_service.dart         # HTTP client (dio yoki http)
│   ├── auth_service.dart        # JWT saqlash, token refresh
│   ├── shop_api.dart            # Shop API calls
│   ├── product_api.dart         # Product API calls
│   └── order_api.dart           # Order API calls
└── interceptors/
    └── auth_interceptor.dart    # Token qo'shish har bir so'rovga
```

### 6.3 O'chiriladigan fayllar

```
lib/database/database_helper.dart    # SQLite — o'chiriladi
lib/repositories/shop_repository.dart
lib/repositories/product_repository.dart
lib/repositories/order_repository.dart
lib/database/sqlite.dart
lib/database/sqlite_io.dart
lib/database/sqlite_web.dart
```

### 6.4 Qo'shiladigan依赖

```yaml
dependencies:
  dio: ^5.4.0                    # HTTP client
  flutter_secure_storage: ^9.0.0 # JWT saqlash
```

---

## 7. BACKEND SOZLAMALARI

### 7.1 requirements.txt

```
Django>=5.0,<6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=24.0
Pillow>=10.0
python-decouple>=3.8
gunicorn>=22.0
whitenoise>=6.6
```

### 7.2 settings.py muhim qismlar

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'apps.accounts',
    'apps.shops',
    'apps.products',
    'apps.orders',
    'apps.couriers',
    'apps.categories',
    'apps.notifications',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# Flutter APK uchun
CORS_ALLOW_ALL_ORIGINS = True  # dev muhitda
```

---

## 8. DEPLOYMENT

### 8.1 Dev

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
# → http://localhost:8000
```

### 8.2 Prod

```bash
# Render.com yoki Railway
gunicorn config.wsgi:application
# yoki
gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker
```

### 8.3 Flutter APK config

```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'https://your-app.onrender.com';
  // dev: 'http://10.0.2.2:8000' (Android emulator)
  // dev: 'http://localhost:8000' (iOS simulator)
}
```

---

## 9. XAVFSIZLIK

- JWT token 30 daqiqa, refresh 7 kun
- Admin endpointlar faqat `IsAdmin` permission
- CORS faqat ruxsat etilgan manzillar
- Parol hash — Django default (PBKDF2)
- CSRF — API uchun kerak emas (JWT), template uchun kerak
- Rate limiting — `django-ratelimit` qo'shish mumkin

---

## 10. ISH REJASI

| # | Faza | Vaqt | Tavsif |
|---|------|------|--------|
| 1 | Django loyiha + models | 1 kun | Project, apps, models, migrate |
| 2 | API endpoints | 1 kun | DRF serializers, views, urls |
| 3 | Auth (JWT) | 0.5 kun | Login, token, permission |
| 4 | Web templates (mijoz) | 1 kun | Bosh sahifa, katalog, savat, buyurtma |
| 5 | Web templates (admin) | 1 kun | Dashboard, CRUD sahifalar |
| 6 | Flutter API integration | 1 kun | HTTP client, endpointlarni bog'lash |
| 7 | Telegram + notifications | 0.5 kun | Bot, buyurtma xabarlari |
| 8 | Test + deploy | 1 kun | Test, Render.com, APK build |

**Jami: ~7 kun**

---

## 11. TAJSIYLASH

### Agar TZ maqul bo'lsa:
1. Backend qismidan boshlayman (Django project + models)
2. Keyin API endpoints
3. Keyin web templates
4. Keyin Flutter ga bog'lash

### Agar o'zgartirish kerak bo'lsa:
- Qaysi qismini o'zgartirish kerak?
- Qo'shimcha feature kerakmi?
- Deployment platformasi aniqmi?

---

**TZ TUGALLANDI — TASDIQ KUTAMAN**
