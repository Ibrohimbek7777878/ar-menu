# 🎯 QADAM-BA-QADAM AMALGA OSHIRISH QOLLANMASI
## Online Store Guliston — Vibe Code / AI Tools uchun

---

## 📋 UMUMIY MA'LUMOT

Bu qo'llanma **FINAL_PRODUCTION_PROMPT_VIBE_CODE.md** asosida loyihani **0 dan 100 gacha** qanday qurishni ko'rsatadi.

**Maqsad:** 
- Backend yo'q, faqat Flutter
- Admin panel to'liq dinamik
- APK 2-4 oy ishlay oladi
- Production-ready

**Vaqt:** 2-3 kun (AI bilan) | 1-2 hafta (qo'lda)

---

## ✅ BOSHLASHDAN OLDIN

### 1. Muhitni tayyorlash

```bash
# Flutter SDK o'rnatilganligini tekshirish
flutter --version
# Flutter 3.24+ bo'lishi kerak

# VS Code + Extensions
# - Flutter
# - Dart
# - Vibe Code (yoki Cursor, Copilot)

# Android SDK
# - Android Studio o'rnatilgan
# - Android SDK Platform 33 (Android 13)
# - Android SDK Build-Tools
```

### 2. Loyihani ochish

```bash
# Mavjud loyihani ochish
cd /path/to/store_guliston_v1

# Yoki yangi loyiha yaratish
flutter create store_guliston_v1
cd store_guliston_v1
```

### 3. Backend o'chirish (agar bor bo'lsa)

```bash
# Backend folderni butunlay o'chirish
rm -rf backend/
rm docker-compose.yml
rm Dockerfile
```

---

## 🚀 QADAM 1: DEPENDENCIES (5 daqiqa)

### pubspec.yaml yangilash

```yaml
name: store_guliston_v1
description: Online Store Guliston - Serverless E-commerce App
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.5.1
  
  # Navigation
  go_router: ^14.0.0
  
  # Database
  sqflite: ^2.3.3
  path_provider: ^2.1.2
  path: ^1.9.0
  
  # HTTP
  dio: ^5.4.1
  
  # Maps
  google_maps_flutter: ^2.6.0
  yandex_mapkit: ^4.0.0
  geolocator: ^11.0.0
  geocoding: ^3.0.0
  
  # Images
  cached_network_image: ^3.3.1
  image_picker: ^1.0.7
  
  # Charts
  fl_chart: ^0.68.0
  
  # Animations
  lottie: ^3.1.0
  flutter_staggered_animations: ^1.1.1
  
  # UI
  flutter_svg: ^2.0.10
  shimmer: ^3.0.0
  flutter_colorpicker: ^1.1.0
  
  # Utils
  intl: ^0.19.0
  uuid: ^4.3.3
  shared_preferences: ^2.2.2
  crypto: ^3.0.3
  url_launcher: ^6.2.4

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_launcher_icons: ^0.13.1
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
    - assets/lottie/
```

### Packages o'rnatish

```bash
flutter pub get
```

---

## 🗄️ QADAM 2: DATABASE SETUP (30 daqiqa)

### 2.1 Database Helper yaratish

Fayl: `lib/database/database_helper.dart`

```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'seed_data.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('store_guliston.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // Shops table
    await db.execute('''
      CREATE TABLE shops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL CHECK(city IN ('yangi_yer', 'guliston')),
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT,
        opening_time TEXT,
        closing_time TEXT,
        is_open INTEGER DEFAULT 1,
        rating REAL DEFAULT 0,
        image_url TEXT,
        category_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Categories table
    await db.execute('''
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_url TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0
      )
    ''');

    // Products table
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        category_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        unit TEXT,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    ''');

    // Orders table
    await db.execute('''
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        shop_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone_1 TEXT NOT NULL,
        customer_phone_2 TEXT,
        customer_phone_3 TEXT,
        delivery_address TEXT,
        delivery_lat REAL,
        delivery_lng REAL,
        is_pickup INTEGER DEFAULT 0,
        total_amount REAL NOT NULL,
        delivery_fee REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
        courier_id TEXT,
        customer_notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (shop_id) REFERENCES shops(id)
      )
    ''');

    // Order items table
    await db.execute('''
      CREATE TABLE order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    ''');

    // Admins table
    await db.execute('''
      CREATE TABLE admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Couriers table
    await db.execute('''
      CREATE TABLE couriers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'busy', 'offline')),
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // App texts table (dynamic interface text)
    await db.execute('''
      CREATE TABLE app_texts (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // App settings table
    await db.execute('''
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Indexes
    await db.execute('CREATE INDEX idx_shops_city ON shops(city)');
    await db.execute('CREATE INDEX idx_products_shop ON products(shop_id)');
    await db.execute('CREATE INDEX idx_orders_phone ON orders(customer_phone_1)');
    await db.execute('CREATE INDEX idx_orders_created ON orders(created_at DESC)');

    // Seed data
    await SeedData.populateDatabase(db);
  }

  Future<void> close() async {
    final db = await instance.database;
    db.close();
  }
}
```

### 2.2 Seed Data yaratish

Fayl: `lib/database/seed_data.dart`

```dart
import 'package:sqflite/sqflite.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class SeedData {
  static Future<void> populateDatabase(Database db) async {
    // 1. Insert categories
    await _insertCategories(db);
    
    // 2. Insert admin
    await _insertAdmin(db);
    
    // 3. Insert shops
    await _insertShops(db);
    
    // 4. Insert products
    await _insertProducts(db);
    
    // 5. Insert app texts
    await _insertAppTexts(db);
    
    // 6. Insert app settings
    await _insertAppSettings(db);
  }

  static Future<void> _insertCategories(Database db) async {
    final categories = [
      {'id': 'cat_food', 'name': 'Oziq-ovqat', 'color': '#4CAF50', 'sort_order': 1},
      {'id': 'cat_drinks', 'name': 'Ichimliklar', 'color': '#2196F3', 'sort_order': 2},
      {'id': 'cat_dairy', 'name': 'Sut mahsulotlari', 'color': '#FF9800', 'sort_order': 3},
      {'id': 'cat_meat', 'name': 'Go\'sht', 'color': '#F44336', 'sort_order': 4},
      {'id': 'cat_vegetables', 'name': 'Sabzavotlar', 'color': '#8BC34A', 'sort_order': 5},
    ];

    for (var cat in categories) {
      await db.insert('categories', cat);
    }
  }

  static Future<void> _insertAdmin(Database db) async {
    // Default admin: adminstore@gmail.com / admin1234
    final passwordHash = sha256.convert(utf8.encode('admin1234')).toString();
    
    await db.insert('admins', {
      'id': 'admin_1',
      'email': 'adminstore@gmail.com',
      'password_hash': passwordHash,
      'full_name': 'Super Admin',
    });
  }

  static Future<void> _insertShops(Database db) async {
    final shops = [
      {
        'id': 'shop_1',
        'name': 'Yangi Yer Market',
        'address': 'Markaziy ko\'cha 45, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5966,
        'longitude': 68.7786,
        'phone': '+998901234567',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.5,
        'category_id': 'cat_food',
      },
      {
        'id': 'shop_2',
        'name': 'Choy va Kofe Dokoni',
        'address': 'Guliston ko\'cha 12, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5980,
        'longitude': 68.7800,
        'phone': '+998901234568',
        'opening_time': '07:00',
        'closing_time': '23:00',
        'is_open': 1,
        'rating': 4.2,
        'category_id': 'cat_drinks',
      },
      // ... qo'shimcha 8-10 ta do'kon
    ];

    for (var shop in shops) {
      await db.insert('shops', shop);
    }
  }

  static Future<void> _insertProducts(Database db) async {
    final products = [
      {
        'id': 'prod_1',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Non (1 dona)',
        'description': 'Yangi pishirilgan non',
        'price': 2000.0,
        'unit': 'dona',
        'is_available': 1,
        'stock_quantity': 100,
      },
      {
        'id': 'prod_2',
        'shop_id': 'shop_2',
        'category_id': 'cat_drinks',
        'name': 'Choy (Ahmad Tea)',
        'description': 'Qora choy, 100g',
        'price': 15000.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 50,
      },
      // ... qo'shimcha 50-100 ta mahsulot
    ];

    for (var product in products) {
      await db.insert('products', product);
    }
  }

  static Future<void> _insertAppTexts(Database db) async {
    final texts = [
      {'key': 'app_name', 'value': 'Online Store Guliston'},
      {'key': 'home_title', 'value': 'Do\'konlar'},
      {'key': 'categories_title', 'value': 'Kategoriyalar'},
      {'key': 'order_button', 'value': 'Buyurtma berish'},
      {'key': 'success_message', 'value': 'Buyurtmangiz qabul qilindi!'},
    ];

    for (var text in texts) {
      await db.insert('app_texts', text);
    }
  }

  static Future<void> _insertAppSettings(Database db) async {
    final settings = [
      {'key': 'primary_color', 'value': '#1B5E20'},
      {'key': 'weather_api_key', 'value': 'YOUR_OPENWEATHER_API_KEY'},
      {'key': 'yandex_maps_key', 'value': 'YOUR_YANDEX_MAPS_KEY'},
    ];

    for (var setting in settings) {
      await db.insert('app_settings', setting);
    }
  }
}
```

---

## 🔐 QADAM 3: ADMIN AUTH (20 daqiqa)

### Admin Repository

Fayl: `lib/repositories/admin_repository.dart`

```dart
import 'package:sqflite/sqflite.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import '../database/database_helper.dart';
import '../models/admin.dart';

class AdminRepository {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  Future<Admin?> login(String email, String password) async {
    final db = await _dbHelper.database;
    final passwordHash = sha256.convert(utf8.encode(password)).toString();

    final result = await db.query(
      'admins',
      where: 'email = ? AND password_hash = ?',
      whereArgs: [email, passwordHash],
      limit: 1,
    );

    if (result.isEmpty) return null;

    return Admin.fromMap(result.first);
  }

  Future<bool> changePassword(String adminId, String oldPassword, String newPassword) async {
    final db = await _dbHelper.database;
    
    // Verify old password
    final oldHash = sha256.convert(utf8.encode(oldPassword)).toString();
    final check = await db.query(
      'admins',
      where: 'id = ? AND password_hash = ?',
      whereArgs: [adminId, oldHash],
    );

    if (check.isEmpty) return false;

    // Update password
    final newHash = sha256.convert(utf8.encode(newPassword)).toString();
    await db.update(
      'admins',
      {'password_hash': newHash},
      where: 'id = ?',
      whereArgs: [adminId],
    );

    return true;
  }
}
```

### Admin Model

Fayl: `lib/models/admin.dart`

```dart
class Admin {
  final String id;
  final String email;
  final String fullName;
  final DateTime createdAt;

  Admin({
    required this.id,
    required this.email,
    required this.fullName,
    required this.createdAt,
  });

  factory Admin.fromMap(Map<String, dynamic> map) {
    return Admin(
      id: map['id'],
      email: map['email'],
      fullName: map['full_name'] ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] * 1000),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'created_at': createdAt.millisecondsSinceEpoch ~/ 1000,
    };
  }
}
```

---

## 🎨 QADAM 4: UI SETUP (30 daqiqa)

### 4.1 Colors

Fayl: `lib/core/constants/colors.dart`

```dart
import 'package:flutter/material.dart';

class AppColors {
  // Primary
  static const primary = Color(0xFF1B5E20);
  static const primaryLight = Color(0xFF4CAF50);
  static const primaryDark = Color(0xFF0D4D1B);
  static const primarySurface = Color(0xFFE8F5E9);
  
  // Accent
  static const accent = Color(0xFFFF6F00);
  static const accentLight = Color(0xFFFFB74D);
  
  // Neutral
  static const textPrimary = Color(0xFF212121);
  static const textSecondary = Color(0xFF757575);
  static const background = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF5F5F5);
  static const divider = Color(0xFFE0E0E0);
  
  // Semantic
  static const success = Color(0xFF4CAF50);
  static const error = Color(0xFFF44336);
  static const warning = Color(0xFFFFA726);
  static const info = Color(0xFF2196F3);
  
  // Status
  static const statusOpen = Color(0xFF4CAF50);
  static const statusClosed = Color(0xFFE53935);
  static const statusPreparing = Color(0xFFFFA726);
  static const statusDelivered = Color(0xFF4CAF50);
}
```

### 4.2 Text Styles

Fayl: `lib/core/constants/text_styles.dart`

```dart
import 'package:flutter/material.dart';
import 'colors.dart';

class AppTextStyles {
  static const fontFamily = 'Roboto';
  
  static const h1 = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  );
  
  static const h2 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
  
  static const h3 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
  
  static const bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
    color: AppColors.textPrimary,
    height: 1.5,
  );
  
  static const bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.textPrimary,
    height: 1.4,
  );
  
  static const bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AppColors.textSecondary,
  );
  
  static const button = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: Colors.white,
    letterSpacing: 0.5,
  );
  
  static const price = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: AppColors.primary,
  );
}
```

---

## 📱 QADAM 5: MAIN SCREENS (1 kun)

### 5.1 Main.dart

Fayl: `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize database
  await DatabaseHelper.instance.database;
  
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}
```

### 5.2 App.dart

Fayl: `lib/app.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/router_config.dart';
import 'core/constants/colors.dart';

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'Online Store Guliston',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: AppColors.primary,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
        ),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
```

---

## 🛠️ QADAM 6: VIBE CODE BILAN ISHLASH

### Endi Vibe Code (yoki Cursor) ga promptni bering:

1. **VS Code ni oching**
2. **Vibe Code extension ni yoqing** (Ctrl+Shift+P → "Vibe: Start")
3. **Promptni bering:**

```
Men sizga "FINAL_PRODUCTION_PROMPT_VIBE_CODE.md" faylini beryapman.

Iltimos, quyidagilarni amalga oshiring:

1. Barcha kerakli Repositories yarating:
   - ShopRepository
   - ProductRepository
   - OrderRepository
   - CategoryRepository
   - CourierRepository

2. Barcha models yarating:
   - Shop, Product, Category, Order, Courier

3. Barcha screens yarating:
   - Home Screen (do'konlar ro'yxati)
   - Shop Detail Screen
   - Product Detail Screen
   - Cart Screen
   - Checkout Screen
   - Location Picker Screen
   - Admin Login Modal
   - Admin Dashboard
   - Admin Shops Management
   - Admin Products Management
   - Admin Orders Management

4. Navigation setup (go_router)

5. State management (Riverpod providers)

6. Animations va transitions

Har bir fayl yaratilgandan keyin menga commit message yozing.
```

---

## 📦 QADAM 7: BUILD APK (10 daqiqa)

### Build script yaratish

Fayl: `scripts/build-apk.sh`

```bash
#!/bin/bash

VERSION=$1
BUILD_NUMBER=$2

if [ -z "$VERSION" ] || [ -z "$BUILD_NUMBER" ]; then
  echo "Usage: ./build-apk.sh <version> <build_number>"
  echo "Example: ./build-apk.sh 1.0.0 1"
  exit 1
fi

echo "🚀 Building APK version $VERSION+$BUILD_NUMBER..."

# Clean
flutter clean
flutter pub get

# Build release APK
flutter build apk --release \
  --split-per-abi \
  --obfuscate \
  --split-debug-info=./debug-info \
  --build-name=$VERSION \
  --build-number=$BUILD_NUMBER

echo "✅ APK built successfully!"
echo "📦 Location: build/app/outputs/flutter-apk/"
ls -lh build/app/outputs/flutter-apk/
```

### Ishga tushirish

```bash
chmod +x scripts/build-apk.sh
./scripts/build-apk.sh 1.0.0 1
```

---

## ✅ QADAM 8: TESTING (30 daqiqa)

### Test checklist

```
□ Ilova ochiladi
□ Shahar tanlash ishlaydi
□ Do'konlar ko'rsatiladi
□ Mahsulot qidirish ishlaydi
□ Savatga qo'shish ishlaydi
□ Buyurtma berish ishlaydi
□ Lokatsiya tanlash ishlaydi
□ Admin login ishlaydi (adminstore@gmail.com / admin1234)
□ Admin dashboard ochiladi
□ Do'kon qo'shish/tahrirlash ishlaydi
□ Mahsulot qo'shish/tahrirlash ishlaydi
□ Buyurtma holatini o'zgartirish ishlaydi
□ APK quriladi
□ APK telefonda ishga tushadi
```

---

## 🎯 YAKUNIY NATIJA

**2-3 kun ichida sizda bo'ladi:**

✅ To'liq ishlashga tayyor Flutter app  
✅ SQLite database (10+ jadval)  
✅ Admin panel (100% dinamik)  
✅ Zamonaviy animatsiyalar  
✅ Production-ready APK (~25-30 MB)  
✅ Dokumentatsiya  

**APK joylashuvi:**
```
build/app/outputs/flutter-apk/
├── app-arm64-v8a-release.apk (22-25 MB) ← Eng ko'p ishlatiladi
├── app-armeabi-v7a-release.apk (20-23 MB)
└── app-x86_64-release.apk (25-28 MB)
```

**Tarqatish:**
1. APK ni Telegram/Google Drive ga yuklang
2. Link ulashing
3. Foydalanuvchilar yuklab oladi
4. "Noma'lum manbalardan o'rnatish" yoqiladi
5. O'rnatiladi va ishlaydi!

---

## 🆘 YORDAMGA EHTIYOJ BO'LSA

**Agar xatolik yuzaga kelsa:**

```bash
# 1. Clean va rebuild
flutter clean
flutter pub get
flutter run

# 2. Database reset
# Android: Settings → Apps → Store Guliston → Clear data
# iOS: Uninstall va qayta o'rnatish

# 3. Loglarni ko'rish
flutter run --verbose
```

---

## 📚 QO'SHIMCHA RESURSLAR

- Flutter dokumentatsiya: https://docs.flutter.dev
- Riverpod: https://riverpod.dev
- SQLite: https://pub.dev/packages/sqflite
- Google Maps: https://pub.dev/packages/google_maps_flutter

---

**OMAD! Bu loyihani 0 dan 100 gacha olib chiqasiz!** 🚀
