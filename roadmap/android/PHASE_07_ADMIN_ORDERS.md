# 📦 FAZA 7 — ADMIN BUYURTMALAR BOSHQARUVI

## 🎯 Maqsad
Admin tomonidan buyurtmalarni to'liq boshqarish: ko'rish, qidirish, filterlash, holatini o'zgartirish, tafsilotlarini ko'rish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.4 Buyurtmalar Boshqaruvi
- `BACKEND_PROMPT_SENIOR.md` — Order Service (status management, filter)
- `GULISTON_PROJECT_TZ.md` — Buyurtma holatlari

## 🔧 Tafsilotlar

### 7.1 `AdminOrdersScreen`
```dart
// store_guliston_v1/lib/screens/admin/admin_orders_screen.dart
// ✅ To'liq tayyor

- Barcha buyurtmalar ro'yxati (ListView, pull-to-refresh)
- Holat bo'yicha filter (Chips: Barchasi, Kutilmoqda, Tasdiqlangan, Tayyorlanmoqda, Tayyor, Yetkazilmoqda, Yetkazildi, Bekor qilingan)
- Qidiruv (buyurtma raqami, mijoz ismi, telefon raqam bo'yicha)
- Har bir buyurtma uchun: tafsilotlarni ko'rish (modal bottom sheet)

Statuslar:
- pending → Kutilmoqda
- confirmed → Tasdiqlangan
- preparing → Tayyorlanmoqda
- ready → Tayyor
- outForDelivery → Yetkazilmoqda
- delivered → Yetkazildi
- cancelled → Bekor qilingan
```

### 7.2 `AdminOrdersScreen` da tafsilotlar (Modal Bottom Sheet)
```dart
// ✅ To'liq tayyor

- Mijoz ma'lumotlari:
  * Ism
  * Telefon 1, 2, 3
- Yetkazish ma'lumotlari:
  * Manzil
- Moliyaviy ma'lumotlar:
  * Jami summa
  * Yetkazish narxi
  * Yakuniy summa
- Mijoz izohi (agar bo'lsa)
- Holat o'zgartirish dropdown
```

### 7.3 Buyurtma holatini o'zgartirish
```dart
// ✅ To'liq tayyor

- Dropdown orqali yangi holat tanlash
- SQLite da update
- Avtomatik refresh
```

### 7.4 Order modeli (`Order` + `OrderItem`)
```dart
// ✅ To'liq tayyor - store_guliston_v1/lib/models/order.dart

enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  outForDelivery,
  delivered,
  cancelled,
}

class Order {
  final String id;
  final String? orderNumber;
  final String? customerName;
  final List<String> customerPhones; // 3 ta telefon
  final String? shopId;
  final String? shopName;
  final List<OrderItem> items;
  final double totalAmount;
  final double deliveryFee;
  final double finalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? deliveryAddress;
  final String? notes;
  final bool isPickup;
  final String? courierName;
  final String? courierPhone;
  final double? deliveryLat;
  final double? deliveryLng;
  final DateTime? estimatedDeliveryTime;

  // fromJson(), fromMap(), toJson(), toMap(), copyWith()
}

class OrderItem {
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String unit;
  double get totalPrice => price * quantity;
}
```

### 7.5 OrderService (SQLite)
```dart
// ✅ To'liq tayyor - store_guliston_v1/lib/services/order_service.dart

class OrderService {
  Future<List<Order>> getOrders({String? status}) async { /* SQLite query */ }
  Future<Order?> getOrderById(String id) async { /* SQLite query */ }
  Future<Order?> createOrder(Order order) async { /* SQLite insert */ }
  Future<bool> updateOrderStatus(String id, String status) async { /* SQLite update */ }
  Future<List<Order>> getOrdersByPhone(String phone) async { /* SQLite query */ }
}
```

### 7.6 Database schema (orders table)
```sql
CREATE TABLE IF NOT EXISTS orders (
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
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'ready', 'outForDelivery', 'delivered', 'cancelled')),
  courier_id TEXT,
  customer_notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);
```

### 7.7 UI dizayni
- Material Design 3
- Card-based list (white cards, rounded corners, shadows)
- Status ranglari:
  * pending → sariq (AppColors.statusPending)
  * confirmed → ko'k (Colors.blue)
  * preparing → apelsin (AppColors.statusPreparing)
  * ready → yashil (AppColors.statusReady)
  * outForDelivery → binafsha (AppColors.statusOutForDelivery)
  * delivered → to'q yashil (AppColors.statusDelivered)
  * cancelled → qizil (AppColors.statusCancelled)

## ✅ Natija
- ✅ Buyurtmalar ro'yxati filter va qidiruv bilan
- ✅ Buyurtma tafsilotlari (modal bottom sheet)
- ✅ Holat o'zgartirish (dropdown)
- ✅ Pull-to-refresh
- ✅ 3 ta telefon raqam ko'rsatish
- ✅ Mijoz izohi ko'rsatish

## 📂 Amalga oshirilgan fayllar
| Fayl | Holat |
|------|-------|
| `store_guliston_v1/lib/screens/admin/admin_orders_screen.dart` | ✅ To'liq tayyor |
| `store_guliston_v1/lib/models/order.dart` | ✅ To'liq tayyor (Order + OrderItem) |
| `store_guliston_v1/lib/services/order_service.dart` | ✅ To'liq tayyor (SQLite CRUD) |
| `store_guliston_v1/lib/config/router_config.dart` | ✅ `/admin/orders` route mavjud |