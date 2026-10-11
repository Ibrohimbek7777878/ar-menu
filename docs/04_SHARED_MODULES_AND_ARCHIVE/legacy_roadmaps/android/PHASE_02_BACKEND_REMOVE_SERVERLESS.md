# 📱 FAZA 2 — BACKENDNI OLIB TASHLASH / SERVERLESS

## 🎯 Maqsad
Butun backend papkasini olib tashlash va Flutter appni mustaqil serverless ilovaga aylantirish. Barcha HTTP API chaqiruvlarini SQLite lokal ma'lumotlar bazasiga o'tkazish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — "backend/ papkasini butunlay olib tashlash"
- `GULISTON_PROJECT_TZ.md` — "Offline-first arxitektura"

## 🔧 Bajariladigan ishlar

### 2.1 backend/ papkasini arxivlash
```bash
mv backend/ backend_archive/
```

### 2.2 Docker va konteyner fayllarini o'chirish
- `docker-compose.yml` (agar rootda bo'lsa) — o'chirish
- `Dockerfile` (agar rootda bo'lsa) — o'chirish

### 2.3 Servislarni SQLite asosida qayta yozish

#### `shop_service.dart` — Yangi versiya
```dart
import 'package:sqflite/sqflite.dart';
import '../database/database_helper.dart';
import '../models/shop.dart';

class ShopService {
  final DatabaseHelper _dbHelper = DatabaseHelper();

  Future<List<Shop>> getShops() async {
    final db = await _dbHelper.database;
    final maps = await db.query('shops');
    return maps.map((map) => Shop.fromMap(map)).toList();
  }

  Future<Shop?> getShopById(String id) async {
    final db = await _dbHelper.database;
    final maps = await db.query('shops', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return Shop.fromMap(maps.first);
    return null;
  }

  Future<Shop?> createShop(Shop shop) async {
    final db = await _dbHelper.database;
    await db.insert('shops', shop.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    return shop;
  }

  Future<Shop?> updateShop(String id, Shop shop) async {
    final db = await _dbHelper.database;
    await db.update('shops', shop.toMap(), where: 'id = ?', whereArgs: [id]);
    return shop;
  }

  Future<bool> deleteShop(String id) async {
    final db = await _dbHelper.database;
    final deleted = await db.delete('shops', where: 'id = ?', whereArgs: [id]);
    return deleted > 0;
  }
}
```

#### `auth_service.dart` — BUTUNLAY O'CHIRISH
- Endi backend HTTP API yo'q, shuning uchun auth_service kerak emas
- Admin login SQLite orqali tekshiriladi (Faza 3 da)

#### `product_service.dart` — SQLite asosida qayta yozish
```dart
import '../database/database_helper.dart';
import '../models/product.dart';

class ProductService {
  final DatabaseHelper _dbHelper = DatabaseHelper();

  Future<List<Product>> getProducts({String? shopId}) async {
    final db = await _dbHelper.database;
    final where = shopId != null ? 'shop_id = ?' : null;
    final whereArgs = shopId != null ? [shopId] : null;
    final maps = await db.query('products', where: where, whereArgs: whereArgs);
    return maps.map((map) => Product.fromMap(map)).toList();
  }

  Future<Product?> getProductById(String id) async {
    final db = await _dbHelper.database;
    final maps = await db.query('products', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return Product.fromMap(maps.first);
    return null;
  }

  Future<Product?> createProduct(Product product) async {
    final db = await _dbHelper.database;
    await db.insert('products', product.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    return product;
  }

  Future<Product?> updateProduct(String id, Product product) async {
    final db = await _dbHelper.database;
    await db.update('products', product.toMap(), where: 'id = ?', whereArgs: [id]);
    return product;
  }

  Future<bool> deleteProduct(String id) async {
    final db = await _dbHelper.database;
    final deleted = await db.delete('products', where: 'id = ?', whereArgs: [id]);
    return deleted > 0;
  }
}
```

#### `order_service.dart` — SQLite asosida qayta yozish
```dart
import '../database/database_helper.dart';
import '../models/order.dart';

class OrderService {
  final DatabaseHelper _dbHelper = DatabaseHelper();

  Future<List<Order>> getOrders({String? status}) async {
    final db = await _dbHelper.database;
    final where = status != null ? 'status = ?' : null;
    final whereArgs = status != null ? [status] : null;
    final maps = await db.query('orders', where: where, whereArgs: whereArgs);
    return maps.map((map) => Order.fromMap(map)).toList();
  }

  Future<Order?> getOrderById(String id) async {
    final db = await _dbHelper.database;
    final maps = await db.query('orders', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return Order.fromMap(maps.first);
    return null;
  }

  Future<Order?> createOrder(Order order) async {
    final db = await _dbHelper.database;
    await db.insert('orders', order.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    return order;
  }

  Future<bool> updateOrderStatus(String id, String status) async {
    final db = await _dbHelper.database;
    final updated = await db.update(
      'orders',
      {'status': status, 'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000},
      where: 'id = ?', whereArgs: [id],
    );
    return updated > 0;
  }

  Future<List<Order>> getOrdersByPhone(String phone) async {
    final db = await _dbHelper.database;
    final maps = await db.query(
      'orders',
      where: 'customer_phone_1 = ? OR customer_phone_2 = ? OR customer_phone_3 = ?',
      whereArgs: [phone, phone, phone],
      orderBy: 'created_at DESC',
      limit: 10,
    );
    return maps.map((map) => Order.fromMap(map)).toList();
  }
}
```

#### `weather_service.dart` — SharedPreferences cache bilan
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/weather.dart';

class WeatherService {
  static const String _apiKey = 'YOUR_OPENWEATHER_API_KEY'; // Admin sozlaydi

  Future<WeatherData?> getCurrentWeather() async {
    try {
      final response = await http.get(
        Uri.parse('https://api.openweathermap.org/data/2.5/weather?lat=40.5966&lon=68.7786&appid=$_apiKey&units=metric&lang=uz'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final weather = WeatherData.fromJson(data);
        // Cache
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cached_weather', jsonEncode(data));
        return weather;
      }
    } catch (e) {
      // Fallback to cache
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('cached_weather');
      if (cached != null) {
        return WeatherData.fromJson(jsonDecode(cached));
      }
    }
    return null;
  }
}
```

### 2.4 O'chiriladigan fayllar
| Fayl | Sabab |
|------|-------|
| `store_guliston_v1/lib/services/auth_service.dart` | HTTP API kerak emas |
| `store_guliston_v1/lib/services/admin_auth.dart` | HTTP API kerak emas |

### 2.5 Yangilanadigan Providerlar
- `shop_provider.dart` — `ShopService` SQLite versiyasini ishlatadi
- `product_provider.dart` — `ProductService` SQLite versiyasini ishlatadi
- `order_provider.dart` — `OrderService` SQLite versiyasini ishlatadi

## ✅ Natija
- Backend butunlay olib tashlangan
- Barcha ma'lumotlar SQLite lokal bazasida
- App internet bo'lmasa ham ishlaydi (offline-first)
- Oq fon muammosidan keyin 2-faza sifatida bajariladi

## ⚠️ Diqqat
- Bu faza faqatgina 1-faza (oq fon tuzatilgandan) keyin bajariladi
- Service fayllarni o'zgartirish providerlarni ham o'zgartirishni talab qiladi