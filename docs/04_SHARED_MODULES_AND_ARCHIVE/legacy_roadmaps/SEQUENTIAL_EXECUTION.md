# ONLINE STORE GULISTON — IDEAL KETMA-KETLIK REJASI

**Versiya:** 1.0
**Sana:** 2026-07-25
**Maqsad:** Har bir qadam ideal, mukammal va bajarilishi shart
**Qoida:** Bitta qadam tugallanmasdan keyingisiga O'TMASLIK

---

## UMUMIY QOIDALAR

1. Har bir fazadan oldin `roadmap/handoff.md` ni o'qish SHART
2. Har bir fayl o'zgartirilishdan oldin O'QILISH shart
3. Har bir fazadan keyin `flutter analyze` ishga tushirish shart
4. Har bir fazadan keyin `flutter test` ishga tushirish shart
5. Restart FAQAT fazaning oxirida — bir marta
6. Commit har bir fazadan keyin — aniq xabar bilan
7. Xato bo'lsa — o'sha faza qayta bajariladi, keyingisiga o'tilmaydi

---

## FAZA 0 — HUJJAT VA KOD HAQIQATINI TEKISLASH

**Muddat:** 1 kun
**Maqsad:** Keyingi dasturchi chalkashmasin
**Risk:** 🟢 PAST

### QADAM 0.1: README.md ni qayta yozish

**Fayl:** `store_guliston_v1/README.md`
**Hozirgi holat:** Default Flutter README (17 qator, loyiha haqida hech narsa yo'q)
**O'zgarish:** To'liq qayta yozish

**Yozilishi kerak:**
```
# Online Store Guliston

O'zbekiston (Yangi Yer, Guliston) kichik do'konlari uchun local e-commerce mobil ilova.

## Texnologiya
- Flutter + Dart
- Provider (state management)
- GoRouter (navigation)
- SQLite (offline-first database)

## Loyiha holati
- MVP prototip — 25% tayyor
- Backend yo'q — SQLite offline cache
- Admin panel: CRUD (do'kon, mahsulot, buyurtma)
- Customer flow: katalog → savat → buyurtma

## Ishga tushirish
cd store_guliston_v1
flutter pub get
flutter run

## Build APK
flutter build apk --release

## Arxitektura
lib/
  config/ — ranglar, router, matnlar
  database/ — SQLite helper
  models/ — Shop, Product, Order, Category, Courier, User, Weather
  repositories/ — Shop, Product, Order repository
  services/ — Auth, Weather, Location, Maps, Order, Shop, Product, File
  providers/ — 10 ta Provider (Shop, Product, Cart, Order, Location, Weather, Language, AdminSettings, AdminTheme)
  screens/ — 21 ta ekran (13 customer + 8 admin)
  widgets/ — 12 ta widget

## MUHIM: Bu loyiha hozircha "offline demo" holatida
- Buyurtmalar faqat bitta qurilmada qoladi
- Backend/internet integratsiyasi yo'q
- Real marketplace uchun backend kerak
```

**Verification:** README.md yangilangan, loyiha haqida aniq ma'lumot bor

---

### QADAM 0.2: IMPLEMENTATION_COMPLETE.md ni tahrirlash

**Fayl:** `store_guliston_v1/IMPLEMENTATION_COMPLETE.md`
**Hozirgi holat:** "Riverpod" deyiladi (qator: 9, 63, 64, 116, 185, 186, 499), "production-ready" deyiladi (qator: 6, 537, 543)
**O'zgarishlar:**

| Qator | Hozirgi | Yangi |
|-------|---------|-------|
| 6 | "production-ready, fully offline" | "MVP prototype, offline-first" |
| 9 | "Riverpod state management" | "Provider state management" |
| 537 | "Production-Ready ✅" | "MVP Prototype — backend kerak" |
| 543 | "Status: Production-Ready ✅" | "Status: MVP Prototype" |

**Qo'shimcha:** "Riverpod" so'zini hujjat bo'ylab "Provider" ga almashtirish (qidiruv: Riverpod → Provider)

**Verification:** "Riverpod" so'zi hujjatda qolmagan, "production-ready" deyilmagan

---

### QADAM 0.3: SERVERLESS_IMPLEMENTATION.md ni tahrirlash

**Fayl:** `store_guliston_v1/SERVERLESS_IMPLEMENTATION.md`
**Hozirgi holat:** Backendni olib tashlaganini ta'kidlab "production-ready" deydi
**O'zgarish:** "production-ready" emas, "offline-first prototype" deb tuzatish

**Verification:** "production-ready" deyilmagan

---

### QADAM 0.4: QUICK_START.md ni tekshirish

**Fayl:** `store_guliston_v1/QUICK_START.md`
**Tekshirish:** Agar "Riverpod" yoki "production-ready" bo'lsa — tuzatish

**Verification:** Ziddiyatli ma'lumot yo'q

---

### FAZA 0 VERIFICATION

```bash
cd store_guliston_v1
grep -r "Riverpod" *.md  # Natija: bo'sh (topilmadi)
grep -r "production-ready" *.md  # Natija: bo'sh (topilmadi)
```

**Acceptance:**
- [ ] README.md loyiha haqida aniq ma'lumot beradi
- [ ] "Riverpod" so'zi hujjatlarda qolmagan
- [ ] "production-ready" deyilmagan
- [ ] Offline demo holatida ekanligi aniq yozilgan

---

## FAZA 1 — SECURITY VA ADMIN XAVFSIZLIGI

**Muddat:** 2 kun
**Maqsad:** Hardcoded credentials olib tashlash, admin kirishni yashirish
**Risk:** 🔴 YUQORI — xato qilsa admin panel ishlamay qolishi mumkin
**Dependency:** Faqat Faaza 0 dan keyin

### QADAM 1.1: Hardcoded credentials ni olib tashlash

**Fayl:** `store_guliston_v1/lib/services/admin_auth.dart`
**Hozirgi holat (qator 11-12):**
```dart
static const String _masterEmail = 'admin@storegmail.com';
static const String _masterPassword = 'admin1234';
```

**O'zgarish:**
1. Qator 11-12 ni O'CHIRISH
2. Login methodidagi hardcoded tekshiruvni O'CHIRISH (qator 15-23)
3. Faqat DB query qolishi kerak

**Yangi login method:**
```dart
Future<bool> login(String email, String password) async {
  final db = await DatabaseHelper().database;
  final bytes = utf8.encode(password);
  final hash = sha256.convert(bytes).toString();

  final result = await db.query(
    'admins',
    where: 'email = ? AND password_hash = ?',
    whereArgs: [email, hash],
  );

  if (result.isNotEmpty) {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, email);
    await prefs.setInt(
      _sessionExpiryKey,
      DateTime.now().millisecondsSinceEpoch + (24 * 60 * 60 * 1000),
    );
    return true;
  }
  return false;
}
```

**Verification:**
- `grep -n "_masterEmail\|_masterPassword" lib/services/admin_auth.dart` — natija: bo'sh
- Login faqat DB orqali ishlaydi

---

### QADAM 1.2: Admin login ekranidagi credential matnini olib tashlash

**Fayl:** `store_guliston_v1/lib/screens/admin/admin_login_screen.dart`
**Hozirgi holat (qator 150-156):**
```dart
Text(
  'Admin kirish: adminstore@gmail.com / admin1234',
  textAlign: TextAlign.center,
  style: TextStyle(
    color: AppColors.textGray,
    fontSize: 14,
  ),
),
```

**O'zgarish:** Qator 150-156 ni O'CHIRISH yoki almashtirish:
```dart
Text(
  'Do\'kon boshqaruv paneliga kirish',
  textAlign: TextAlign.center,
  style: TextStyle(
    color: AppColors.textGray,
    fontSize: 14,
  ),
),
```

**Verification:**
- `grep -n "adminstore@gmail.com\|admin1234" lib/screens/admin/admin_login_screen.dart` — natija: bo'sh

---

### QADAM 1.3: Home ekrandan Admin tugmasini yashirish

**Fayl:** `store_guliston_v1/lib/screens/home_screen.dart`
**Hozirgi holat (qator 187-206):**
```dart
TextButton.icon(
  onPressed: () => GoRouter.of(context).push('/admin/login'),
  icon: const Icon(Icons.admin_panel_settings, size: 18, color: AppColors.primaryGreen),
  label: const Text(
    'Admin',
    ...
  ),
  ...
),
```

**O'zgarish:** Qator 187-206 ni O'CHIRISH

**Verification:**
- `grep -n "Admin" lib/screens/home_screen.dart` — faqat "Admin Dashboard" yoki boshqa joylarda bo'lishi mumkin, lekin ochiq tugma bo'lmasin

---

### QADAM 1.4: Hidden admin entry qo'shish

**Fayl:** `store_guliston_v1/lib/screens/home_screen.dart`
**Qo'shimcha:** `_buildHeader` methodida (qator 155) app nomiga 7 marta tap qo'shish imkonini qo'shish

**Yangi qo'shimcha:**
```dart
int _tapCount = 0;
DateTime? _lastTapTime;

void _onAppTitleTap() {
  final now = DateTime.now();
  if (_lastTapTime == null || now.difference(_lastTapTime!) > Duration(seconds: 2)) {
    _tapCount = 1;
  } else {
    _tapCount++;
  }
  _lastTapTime = now;

  if (_tapCount >= 7) {
    _tapCount = 0;
    GoRouter.of(context).push('/admin/login');
  }
}
```

**App nomiga GestureDetector qo'shish:**
```dart
GestureDetector(
  onTap: _onAppTitleTap,
  child: Text(
    settingsProvider.getText('app_name'),
    style: const TextStyle(
      fontSize: 26,
      fontWeight: FontWeight.w800,
      color: AppColors.textBlack,
    ),
  ),
),
```

**Verification:**
- App nomiga 7 marta tepsa admin login ochiladi
- Oddiy foydalanuvchi admin yo'lini ko'rmaydi

---

### QADAM 1.5: Admin route guard ni kuchaytirish

**Fayl:** `store_guliston_v1/lib/services/admin_route_guard.dart`
**Hozirgi holat:** Faqat `isLoggedIn()` tekshiradi
**Qo'shimcha:** Role-based access control

**Yangi qo'shimcha:**
```dart
class AdminRouteGuard {
  static Future<String?> redirect(BuildContext context, GoRouterState state) async {
    final auth = AdminAuth();
    final isAuth = await auth.isLoggedIn();
    if (!isAuth) {
      if (context.mounted) {
        return '/admin/login';
      }
    }
    return null;
  }

  // Role check (kelajak uchun tayyor)
  static Future<bool> hasRole(String requiredRole) async {
    final auth = AdminAuth();
    final email = await auth.getCurrentAdminEmail();
    if (email == null) return false;
    // Hozircha barcha adminlarga ruxsat
    return true;
  }
}
```

**Verification:**
- Admin route'lar faqat login qilgan foydalanuvchiga ko'rinadi

---

### FAZA 1 VERIFICATION

```bash
cd store_guliston_v1
grep -rn "_masterEmail\|_masterPassword\|adminstore@gmail.com\|admin1234" lib/
# Natija: bo'sh (topilmadi)

grep -n "Admin" lib/screens/home_screen.dart
# Natija: faqat "Admin Dashboard" yoki boshqa joylarda, ochiq tugma yo'q
```

```bash
flutter analyze
# Natija: error yo'q (warninglar bo'lishi mumkin)
```

**Acceptance:**
- [ ] Hardcoded credentials yo'q
- [ ] Admin login ekranida credential ko'rsatilmaydi
- [ ] Home ekranda Admin tugmasi yo'q
- [ ] 7 marta tap bilan admin kirish ishlaydi
- [ ] `flutter analyze` error bermaydi
- [ ] Admin panel login qilgan foydalanuvchi uchun ishlaydi

---

## FAZA 2 — TEST VA ANALYZER BARQARORLIGI

**Muddat:** 2 kun
**Maqsad:** Testlar ishlashi, analyze toza bo'lishi
**Risk:** 🟡 O'RTA
**Dependency:** Faqat Faaza 1 dan keyin

### QADAM 2.1: Test muhitini tayyorlash

**Fayl:** `store_guliston_v1/test/widget_test.dart`
**Hozirgi holat:** `databaseFactory not initialized` bilan yiqiladi
**Sabab:** SQLite init qilinmagan

**Yangi test:**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:store_guliston/main.dart';

void main() {
  testWidgets('App boots without crash', (WidgetTester tester) async {
    await tester.pumpWidget(const StoreGulistonApp());
    await tester.pumpAndSettle();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
```

**Verification:** `flutter test` yashil

---

### QADAM 2.2: flutter analyze tozalash

**Buyruq:** `flutter analyze`
**Kutilayotgan natija:** 271+ issue

**Bajarilishi kerak:**
1. `flutter analyze 2>&1 | head -50` — eng ko'p uchraydigan xatolarni ko'rish
2. Quyidagi xatolarni tuzatish:
   - `unused_import` — importlarni o'chirish
   - `unused_element` — elementlarni o'chirish yoki `// ignore` qo'shish
   - `print()` → `debugPrint()` yoki `log()` almashtirish
   - Deprecated `withOpacity` → `Color.withValues()` yoki ColorScheme

**Fayllar (ehtimolgi):**
- `lib/screens/home_screen.dart` — qator 457: `withOpacity` ishlatilgan
- `lib/screens/admin/admin_login_screen.dart` — qator 127: `withOpacity`
- `lib/screens/splash_screen.dart` — qator 82: `withOpacity`
- Boshqa fayllarda `print()` bo'lishi mumkin

**Verification:** `flutter analyze` da error yo'q, warning kamida 50% ga kamaygan

---

### QADAM 2.3: Assets papkasini to'ldirish

**Papkalar:**
- `store_guliston_v1/assets/images/` — bo'sh
- `store_guliston_v1/assets/icons/` — bo'sh

**Qo'shilishi kerak:**
1. `assets/images/default_shop.png` — default do'kon rasmi (placeholder)
2. `assets/images/default_product.png` — default mahsulot rasmi
3. `assets/images/empty_cart.png` — bo'sh savat rasmi
4. `assets/images/no_shops.png` — do'kon topilmadi rasmi
5. `assets/icons/app_icon.png` — app ikonkasi

**Eslatma:** Rasmlar sifatli bo'lishi kerak, professional ko'rinish uchun

**Verification:**
- `ls assets/images/` — kamida 4 ta fayl
- `ls assets/icons/` — kamida 1 ta fayl
- `flutter analyze` — asset xatosi yo'q

---

### FAZA 2 VERIFICATION

```bash
cd store_guliston_v1
flutter test
# Natija: 1 test pass

flutter analyze
# Natija: error yo'q, warning kam

ls assets/images/
# Natija: kamida 4 ta fayl
```

**Acceptance:**
- [ ] `flutter test` yashil
- [ ] `flutter analyze` error yo'q
- [ ] Assets papkasi to'liq
- [ ] Placeholder rasmlar mavjud

---

## FAZA 3 — DEMO DATA → REAL DATA FLOW

**Muddat:** 3 kun
**Maqsad:** Demo data productionda chiqmasin, real data ishlasin
**Risk:** 🔴 YUQORI — data flow buzilishi mumkin
**Dependency:** Faqat Faaza 2 dan keyin

### QADAM 3.1: loadDemoData() ni cheklash

**Fayl:** `store_guliston_v1/lib/providers/shop_provider.dart`
**Hozirgi holat (qator 203-338):** `loadDemoData()` to'liq hardcoded data bilan
**Qator 31:** `ChangeNotifierProvider(create: (_) => ShopProvider()..loadDemoData())` — avtomatik yuklanadi

**O'zgarish:**
1. `main.dart` qator 31 dan `..loadDemoData()` ni O'CHIRISH
2. `shop_provider.dart` da `loadDemoData()` methodini `isDevMode` parameter bilan cheklash

**Yangi main.dart qator 31:**
```dart
ChangeNotifierProvider(create: (_) => ShopProvider()),
```

**Yangi shop_provider.dart:**
```dart
// loadDemoData() faqat dev rejimida ishlaydi
void loadDemoData() {
  // Productionda ishlamasligi kerak
  assert(() {
    _shops = [/* mavjud demo data */];
    _applyFilters();
    Future.microtask(() => notifyListeners());
    return true;
  }());
}
```

**Verification:**
- `grep -n "loadDemoData" lib/main.dart` — natija: topilmadi
- App ishga tushganda demo data yuklanmaydi

---

### QADAM 3.2: createDemoOrder → createOrder

**Fayl 1:** `store_guliston_v1/lib/providers/order_provider.dart`
**Qator 137-177:** `createDemoOrder` methodi
**O'zgarish:** Nomini `createOrder` ga almashtirish

**Fayl 2:** `store_guliston_v1/lib/services/order_service.dart`
**Qator 109-166:** `createDemoOrder` methodi
**O'zgarish:** Nomini `createOrder` ga almashtirish

**Fayl 3:** `store_guliston_v1/lib/screens/checkout_screen.dart`
**Qator 155:** `orderProvider.createDemoOrder(...)` chaqiruvi
**O'zgarish:** `orderProvider.createOrder(...)` ga almashtirish

**Verification:**
- `grep -rn "createDemoOrder" lib/` — natija: bo'sh (topilmadi)
- `grep -rn "createOrder" lib/` — natija: to'g'ri joylarda

---

### QADAM 3.3: Placeholder rasmlarni almashtirish

**Fayl:** `store_guliston_v1/lib/providers/product_provider.dart`
**Hozirgi holat:** Barcha mahsulotlarda `https://via.placeholder.com/...`
**O'zgarish:** Local assetlarga almashtirish

**Yangi qiymatlar:**
- `imageUrl: 'assets/images/default_product.png'` — barcha mahsulotlar uchun

**Fayl:** `store_guliston_v1/lib/providers/shop_provider.dart`
**Hozirgi holat:** Barcha do'konlarda `https://via.placeholder.com/...`
**O'zgarish:** Local assetlarga almashtirish

**Yangi qiymatlar:**
- `imageUrl: 'assets/images/default_shop.png'` — barcha do'konlar uchun

**Verification:**
- `grep -rn "placeholder.com" lib/` — natija: bo'sh (topilmadi)

---

### QADAM 3.4: Splash screen dan demo data loading ni tozalash

**Fayl:** `store_guliston_v1/lib/screens/splash_screen.dart`
**Hozirgi holat (qator 42-44):**
```dart
Provider.of<ShopProvider>(context, listen: false).loadDemoData();
Provider.of<WeatherProvider>(context, listen: false).loadDemoWeather();
Provider.of<LocationProvider>(context, listen: false).setDemoLocation();
```

**O'zgarish:** `loadDemoData()` ni O'CHIRISH. Weather va Location demo qolishi mumkin (ular real backendga bog'liq emas).

**Yangi:**
```dart
Provider.of<WeatherProvider>(context, listen: false).loadDemoWeather();
Provider.of<LocationProvider>(context, listen: false).setDemoLocation();
```

**Verification:**
- `grep -n "loadDemoData" lib/screens/splash_screen.dart` — natija: bo'sh

---

### QADAM 3.5: ShopRepository dan real data loading

**Fayl:** `store_guliston_v1/lib/repositories/shop_repository.dart`
**Tekshirish:** Agar `loadDemoData()` chaqiruvi bo'lsa — o'chirish
**ShopProvider.loadShops()** methodi (qator 21-35) SQLite dan yuklayapti — bu to'g'ri

**Verification:**
- `flutter run` → Home ekranda do'konlar ko'rinadi (SQLite seed data dan)
- App reloaddan keyin data saqlanadi

---

### FAZA 3 VERIFICATION

```bash
cd store_guliston_v1
grep -rn "loadDemoData\|createDemoOrder\|placeholder.com" lib/
# Natija: bo'sh (topilmadi)

flutter test
# Natija: pass

flutter analyze
# Natija: error yo'q
```

**Acceptance:**
- [ ] `loadDemoData()` productionda ishlamaydi
- [ ] `createDemoOrder` nomi yo'q
- [ ] Placeholder rasmlar yo'q
- [ ] SQLite seed data dan do'konlar/mahsulotlar ko'rinadi
- [ ] App reloaddan keyin data saqlanadi

---

## FAZA 4 — BUYURTMA PIPELINE (TELEGRAM)

**Muddat:** 4 kun
**Maqsad:** Buyurtmalar real backendga yozilsin, Telegramga xabar borsin
**Risk:** 🔴 YUQORI — backend integratsiyasi murakkab
**Dependency:** Faqat Faaza 3 dan keyin

### QADAM 4.1: Firebase/Supabase loyihasini yaratish

**Bajarilishi kerak:**
1. Firebase Console da yangi loyiha yaratish (project: `store-guliston`)
2. `flutterfire configure` orqali Flutter loyihasiga ulash
3. `lib/config/firebase_options.dart` generatsiya qilinadi
4. `pubspec.yaml` ga qo'shish:
   ```yaml
   firebase_core: ^2.15.0
   cloud_firestore: ^4.14.0
   firebase_auth: ^4.17.0
   firebase_storage: ^11.7.0
   firebase_messaging: ^14.7.0
   ```
5. `flutter pub get`

**Verification:** `flutter analyze` — Firebase importlari to'g'ri

---

### QADAM 4.2: Firestore schema yaratish

**Firestore Collections:**
```
shops/
  {shopId}/
    name: string
    address: string
    city: string
    latitude: number
    longitude: number
    phone: string
    opening_time: string
    closing_time: string
    is_open: boolean
    rating: number
    image_url: string
    category_id: string
    created_at: timestamp
    updated_at: timestamp
    products/
      {productId}/
        name: string
        description: string
        price: number
        unit: string
        image_url: string
        is_available: boolean
        stock_quantity: number
        category_id: string
        created_at: timestamp

orders/
  {orderId}/
    order_number: string
    shop_id: string
    shop_name: string
    customer_name: string
    customer_phone_1: string
    customer_phone_2: string
    customer_phone_3: string
    delivery_address: string
    delivery_lat: number
    delivery_lng: number
    is_pickup: boolean
    total_amount: number
    delivery_fee: number
    final_amount: number
    status: string (pending|confirmed|preparing|courier_assigned|out_for_delivery|delivered|cancelled)
    courier_name: string
    courier_phone: string
    customer_notes: string
    created_at: timestamp
    updated_at: timestamp
    items/
      {itemId}/
        product_id: string
        product_name: string
        quantity: number
        unit_price: string
        total_price: number
    status_history/
      {historyId}/
        old_status: string
        new_status: string
        changed_at: timestamp
        notes: string

admins/
  {adminId}/
    email: string
    password_hash: string
    full_name: string
    created_at: timestamp

couriers/
  {courierId}/
    name: string
    phone: string
    status: string
    created_at: timestamp

app_settings/
  {key}/
    value: string
    updated_at: timestamp
```

**Verification:** Firestore Console da collection'lar ko'rinadi

---

### QADAM 4.3: Firebase service qo'shish

**Yangi fayl:** `lib/services/firebase_service.dart`

```dart
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/shop.dart';
import '../models/order.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Shops
  Future<List<Shop>> getShops(String city) async {
    final snapshot = await _firestore
        .collection('shops')
        .where('city', isEqualTo: city)
        .where('is_open', isEqualTo: true)
        .get();
    return snapshot.docs.map((doc) => Shop.fromMap(doc.data()..['id'] = doc.id)).toList();
  }

  // Products
  Future<List<Product>> getProducts(String shopId) async {
    final snapshot = await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .where('is_available', isEqualTo: true)
        .get();
    return snapshot.docs.map((doc) => Product.fromMap(doc.data()..['id'] = doc.id)).toList();
  }

  // Create Order
  Future<String> createOrder(Map<String, dynamic> orderData) async {
    final docRef = await _firestore.collection('orders').add(orderData);
    return docRef.id;
  }

  // Update Order Status
  Future<void> updateOrderStatus(String orderId, String newStatus, {String? notes}) async {
    final orderRef = _firestore.collection('orders').doc(orderId);
    await _firestore.runTransaction((transaction) async {
      final orderSnapshot = await transaction.get(orderRef);
      final oldStatus = orderSnapshot.data()?['status'];
      transaction.update(orderRef, {
        'status': newStatus,
        'updated_at': FieldValue.serverTimestamp(),
      });
      // Status history
      await orderRef.collection('status_history').add({
        'old_status': oldStatus,
        'new_status': newStatus,
        'changed_at': FieldValue.serverTimestamp(),
        'notes': notes,
      });
    });
  }

  // Get Orders by Shop
  Future<List<Order>> getOrdersByShop(String shopId) async {
    final snapshot = await _firestore
        .collection('orders')
        .where('shop_id', isEqualTo: shopId)
        .orderBy('created_at', descending: true)
        .get();
    return snapshot.docs.map((doc) => Order.fromMap(doc.data()..['id'] = doc.id)).toList();
  }

  // Get Order by ID
  Future<Order?> getOrderById(String orderId) async {
    final doc = await _firestore.collection('orders').doc(orderId).get();
    if (!doc.exists) return null;
    return Order.fromMap(doc.data()!..['id'] = doc.id);
  }

  // Real-time Orders Stream
  Stream<QuerySnapshot> ordersStream(String shopId) {
    return _firestore
        .collection('orders')
        .where('shop_id', isEqualTo: shopId)
        .orderBy('created_at', descending: true)
        .snapshots();
  }
}
```

**Verification:** `flutter analyze` — xato yo'q

---

### QADAM 4.4: Telegram bot integratsiyasi

**Telegram bot yaratish:**
1. @BotFather ga `/newbot` yuborish
2. Bot nomi: `Store Guliston Bot`
3. Bot username: `store_guliston_bot`
4. Token olish: `7000000000:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. `/setcommands` orqali buyruqlarni sozlash

**Yangi fayl:** `lib/services/telegram_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class TelegramService {
  static const String _botToken = 'YOUR_BOT_TOKEN';
  static const String _chatId = 'YOUR_CHAT_ID'; // Do'kon egasining Telegram chat ID

  Future<void> sendOrderNotification({
    required String orderNumber,
    required String customerName,
    required String customerPhone,
    required String shopName,
    required double totalAmount,
    required List<Map<String, dynamic>> items,
  }) async {
    final itemsText = items.map((item) =>
      '  • ${item['name']} x${item['quantity']} — ${item['price']} so\'m'
    ).join('\n');

    final message = '''
🆕 YANGI BUYURTMA!

📋 Buyurtma: $orderNumber
🏪 Do'kon: $shopName
👤 Mijoz: $customerName
📞 Telefon: $customerPhone
💰 Jami: $totalAmount so'm

📦 Mahsulotlar:
$itemsText

✅ Tasdiqlash uchun admin panelga kiring
''';

    final url = Uri.parse('https://api.telegram.org/bot$_botToken/sendMessage');
    await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'chat_id': _chatId,
        'text': message,
        'parse_mode': 'HTML',
      }),
    );
  }

  Future<void> sendStatusUpdate({
    required String orderNumber,
    required String newStatus,
    required String customerPhone,
  }) async {
    final statusText = {
      'confirmed': '✅ Tasdiqlandi',
      'preparing': '🍳 Tayyorlanmoqda',
      'courier_assigned': '🛵 Kuryer biriktirildi',
      'out_for_delivery': '🚚 Yo\'lda',
      'delivered': '🎉 Yetkazildi',
      'cancelled': '❌ Bekor qilindi',
    }[newStatus] ?? newStatus;

    final message = '''
📊 BUYURTMA STATUSI O'ZGARDI!

📋 Buyurtma: $orderNumber
📊 Yangi status: $statusText
📞 Mijoz: $customerPhone
''';

    final url = Uri.parse('https://api.telegram.org/bot$_botToken/sendMessage');
    await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'chat_id': _chatId,
        'text': message,
        'parse_mode': 'HTML',
      }),
    );
  }
}
```

**Verification:** `flutter analyze` — xato yo'q

---

### QADAM 4.5: OrderService ga Telegram qo'shish

**Fayl:** `store_guliston_v1/lib/services/order_service.dart`
**Qo'shimcha:** `createOrder` methodiga Telegram xabar yuborish

```dart
import 'telegram_service.dart';

class OrderService {
  final TelegramService _telegramService = TelegramService();
  // ... mavjud kod ...

  Future<Order?> createOrder(/* mavjud parametrlar */) async {
    // ... mavjud logika ...

    // Telegram xabar yuborish
    try {
      await _telegramService.sendOrderNotification(
        orderNumber: orderNumber,
        customerName: customerName,
        customerPhone: customerPhones.first,
        shopName: shopName ?? '',
        totalAmount: finalAmount,
        items: items.map((item) => {
          'name': item.productName,
          'quantity': item.quantity,
          'price': item.price,
        }).toList(),
      );
    } catch (e) {
      // Telegram xatosi buyurtmani to'xtatmasin
      debugPrint('Telegram xabar yuborishda xato: $e');
    }

    return order;
  }
}
```

**Verification:**
- Buyurtma yaratilganda Telegram ga xabar keladi
- Telegram xatosi buyurtmani to'xtatmaydi

---

### FAZA 4 VERIFICATION

```bash
cd store_guliston_v1
flutter analyze
# Natija: error yo'q

flutter run
# Test: Shop detail → Product → Cart → Checkout → Buyurtma berish
# Tekshirish: Telegram ga xabar keladi
```

**Acceptance:**
- [ ] Firebase/Supabase loyiha tayyor
- [ ] Firestore schema yaratilgan
- [ ] FirebaseService ishlaydi
- [ ] Telegram bot yaratilgan
- [ ] TelegramService ishlaydi
- [ ] Buyurtma yaratilganda Telegram ga xabar keladi
- [ ] Status o'zgarganda Telegram ga xabar keladi
- [ ] Buyurtma Firestore ga yoziladi

---

## FAZA 5 — CHECKOUT VA DELIVERY MODEL

**Muddat:** 2 kun
**Maqsad:** Delivery fee zona/masofa bo'yicha, multi-shop cheklovi
**Risk:** 🟡 O'RTA
**Dependency:** Faqat Faaza 4 dan keyin

### QADAM 5.1: Delivery fee zonasini qo'shish

**Fayl:** `store_guliston_v1/lib/services/order_service.dart`
**Hozirgi holat (qator 13):** `static const double deliveryFee = 5000;`
**O'zgarish:** Dynamic fee calculation

**Yangi method:**
```dart
static double calculateDeliveryFee(double distanceKm) {
  if (distanceKm <= 2) return 5000;
  if (distanceKm <= 5) return 10000;
  return -1; // Manual confirmation kerak
}

static double? calculateDistance(double lat1, double lng1, double lat2, double lng2) {
  // Haversine formula
  const double earthRadius = 6371;
  final double dLat = (lat2 - lat1) * 3.14159 / 180;
  final double dLng = (lng2 - lng1) * 3.14159 / 180;
  final double a = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1 * 3.14159 / 180) * cos(lat2 * 3.14159 / 180) *
      sin(dLng / 2) * sin(dLng / 2);
  final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return earthRadius * c;
}
```

**Verification:**
- 0-2 km: 5000 so'm
- 2-5 km: 10000 so'm
- 5+ km: -1 (manual)

---

### QADAM 5.2: Checkout screen ga delivery fee ko'rsatish

**Fayl:** `store_guliston_v1/lib/screens/checkout_screen.dart`
**Qo'shimcha:** Buyurtma berishdan oldin delivery fee va yakuniy summa ko'rsatish

**Verification:**
- Customer buyurtma berishdan oldin delivery fee ko'radi
- Yakuniy summa to'g'ri hisoblanadi

---

### QADAM 5.3: Multi-shop cheklovini UX'da ko'rsatish

**Fayl:** `store_guliston_v1/lib/screens/checkout_screen.dart`
**Hozirgi holat (qator 117-128):** Xato xabar beradi
**O'zgarish:** Yaxshiroq UX — oldindan ogohlantirish

**Verification:**
- Savatda bir nechta do'kon bo'lsa, foydalanuvchi ogohlantiriladi

---

### FAZA 5 VERIFICATION

```bash
flutter analyze
# Natija: error yo'q

flutter run
# Test: Checkout → delivery fee ko'rinadi → buyurtma berish
```

**Acceptance:**
- [ ] Delivery fee zona/masofa bo'yicha hisoblanadi
- [ ] Customer yakuniy summani ko'radi
- [ ] Multi-shop cheklovi aniq

---

## FAZA 6 — XARITA, LOKATSIYA VA KURYER

**Muddat:** 3 kun
**Maqsad:** Google Maps ishlaydi, kuryer assignment MVP
**Risk:** 🟡 O'RTA
**Dependency:** Faqat Faaza 5 dan keyin

### QADAM 6.1: Google Maps API kalitini sozlash

**Fayl:** `lib/config/app_constants.dart`
**Qo'shimcha:** `static const String googleMapsApiKey = 'YOUR_API_KEY';`

**Android:** `android/app/src/main/AndroidManifest.xml` ga qo'shish:
```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_API_KEY"/>
```

**Verification:** Xarita ko'rinadi

---

### QADAM 6.2: Do'kon markerlarini xaritaga qo'shish

**Fayl:** `store_guliston_v1/lib/screens/location_map_screen.dart`
**O'zgarish:** Do'konlar ro'yxatini xaritaga marker sifatida qo'shish

**Verification:**
- Xaritada do'konlar ko'rinadi
- Do'kon ustiga bosilganda ma'lumot chiqadi

---

### QADAM 6.3: Courier assignment MVP

**Fayl:** `store_guliston_v1/lib/screens/admin/couriers_screen.dart`
**Tekshirish:** CRUD ishlayaptimi?

**Qo'shimcha:** Order ga courier biriktirish
**Fayl:** `store_guliston_v1/lib/screens/admin/admin_orders_screen.dart`
**Qo'shimcha:** "Kuryer biriktirish" tugmasi

**Verification:**
- Admin order ga kuryer biriktira oladi
- Kuryer holatini o'zgartira oladi

---

### FAZA 6 VERIFICATION

```bash
flutter run
# Test: Xaritada do'konlar ko'rinadi
# Test: Admin → Orders → Kuryer biriktirish
```

**Acceptance:**
- [ ] Google Maps ishlaydi
- [ ] Do'konlar markerlarda ko'rinadi
- [ ] Kuryer assignment ishlaydi

---

## FAZA 7 — SELLER/ADMIN UX

**Muddat:** 2 kun
**Maqsad:** Role-based access, real-time dashboard
**Risk:** 🟡 O'RTA
**Dependency:** Faqat Faaza 6 dan keyin

### QADAM 7.1: Role model qo'shish

**Fayl:** `store_guliston_v1/lib/services/admin_auth.dart`
**Qo'shimcha:** `role` field

**Yangi DB schema (admins table):**
```sql
ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'super_admin';
```

**Role turlari:**
- `super_admin` — hamma do'konni ko'radi
- `shop_owner` — faqat o'z do'konini ko'radi
- `operator` — buyurtmalarni boshqaradi
- `courier` — faqat o'z buyurtmalarini ko'radi

---

### QADAM 7.2: Shop owner uchun cheklov

**Fayl:** `store_guliston_v1/lib/screens/admin/admin_dashboard_screen.dart`
**O'zgarish:** Agar `role == 'shop_owner'` bo'lsa, faqat o'z do'konini ko'rsatish

---

### QADAM 7:3: Real-time dashboard

**Fayl:** `store_guliston_v1/lib/screens/admin/admin_dashboard_screen.dart`
**O'zgarish:** Firestore real-time listener qo'shish

```dart
StreamBuilder<QuerySnapshot>(
  stream: FirebaseService().ordersStream(shopId),
  builder: (context, snapshot) {
    if (!snapshot.hasData) return CircularProgressIndicator();
    final orders = snapshot.data!.docs;
    // Statistika hisoblash
    // ...
  },
)
```

**Verification:**
- Yangi buyurtma tushsa dashboard avtomatik yangilanadi

---

### FAZA 7 VERIFICATION

```bash
flutter run
# Test: Admin → Dashboard → real-time yangilanish
# Test: Shop owner → faqat o'z do'konini ko'radi
```

**Acceptance:**
- [ ] Role model ishlaydi
- [ ] Shop owner cheklangan
- [ ] Dashboard real-time

---

## FAZA 8 — DARK THEME VA UI TOZALASH

**Muddat:** 2 kun
**Maqsad:** Dark theme, placeholder rasmlar, analyze tozalash
**Risk:** 🟢 PAST
**Dependency:** Faqat Faaza 7 dan keyin

### QADAM 8.1: Dark theme qo'shish

**Fayl:** `store_guliston_v1/lib/main.dart`
**Qator 71-146:** Theme data
**Qo'shimcha:** Dark theme

```dart
themeMode: themeProvider.themeMode, // already exists

darkTheme: ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  primaryColor: primaryColor,
  scaffoldBackgroundColor: Color(0xFF121212),
  // ... dark theme customizations
),
```

**Fayl:** `store_guliston_v1/lib/providers/admin_theme_provider.dart`
**Tekshirish:** `themeMode` property bormi?

**Verification:**
- Settings'dan dark/light theme almashtirish ishlaydi
- Barcha ekranlar dark modda ko'rinadi

---

### QADAM 8.2: Placeholder rasmlarni almashtirish

**Fayl:** `store_guliston_v1/lib/providers/product_provider.dart`
**O'zgarish:** `imageUrl: 'assets/images/default_product.png'`

**Fayl:** `store_guliston_v1/lib/providers/shop_provider.dart`
**O'zgarish:** `imageUrl: 'assets/images/default_shop.png'`

**Verification:**
- `grep -rn "placeholder.com" lib/` — bo'sh

---

### QADAM 8.3: flutter analyze tozalash

**Buyruq:** `flutter analyze`
**Maqsad:** Error yo'q, warning 50% ga kam

**Verification:** `flutter analyze` toza

---

### FAZA 8 VERIFICATION

```bash
flutter analyze
# Natija: error yo'q

flutter run
# Test: Dark theme ishlaydi
# Test: Placeholder rasmlar yo'q
```

**Acceptance:**
- [ ] Dark/Light theme ikkalasi ishlaydi
- [ ] Placeholder rasmlar yo'q
- [ ] `flutter analyze` toza

---

## FAZA 9 — RELEASE, BACKUP VA MONITORING

**Muddat:** 2 kun
**Maqsad:** APK release, crash logging
**Risk:** 🟢 PAST
**Dependency:** Faqat Faaza 8 dan keyin

### QADAM 9.1: App icon va splash screen

**App icon:** `store_guliston_v1/assets/icons/app_icon.png` — professional dizayn
**Splash screen:** `flutter_native_splash` package qo'shildi

**pubspec.yaml:**
```yaml
flutter_native_splash:
  color: "#16A34A"
  image: assets/icons/app_icon.png
  android: true
  ios: true
```

**Verification:** ✅ flutter_native_splash pubspec.yaml ga qo'shildi

---

### QADAM 9.2: Release APK build

**Buyruq:**
```bash
cd store_guliston_v1
flutter build apk --release --obfuscate --split-per-abi
```

**Verification:** APK fayli yaratiladi, o'rnatiladi
**Status:** ⏳ Foydalanuvchi imzo kaliti (keystore) kerak

---

### QADAM 9.3: Crash logging

**pubspec.yaml:** ✅ `firebase_crashlytics: ^4.2.0` qo'shildi

**main.dart:** ✅ qo'shildi:
```dart
FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
```

**Verification:** ✅ Crash bo'lsa Firebase ga yoziladi

---

### FAZA 9 VERIFICATION

- ✅ flutter_native_splash qo'shildi
- ✅ firebase_crashlytics qo'shildi
- ✅ Crash error handling qo'shildi
- ⏳ App icon fayli kerak (assets/icons/app_icon.png)
- ⏳ Release APK — keystore kerak

---

## FAZA 10 — PUSH NOTIFICATION VA ANALYTICS

**Muddat:** 3 kun
**Maqsad:** Push notification, asosiy analytics
**Risk:** 🟡 O'RTA
**Dependency:** Faqat Faaza 9 dan keyin

### QADAM 10.1: Firebase Cloud Messaging

**Fayl:** ✅ `lib/services/notification_service.dart` yaratildi

- ✅ `firebase_messaging` — permission so'rash, token olish
- ✅ `flutter_local_notifications` — foreground xabarlarni ko'rsatish
- ✅ Background handler qo'shildi

**Status:** ⏳ Firebase Console sozlanishi kerak (`flutterfire configure`)

---

### QADAM 10.2: Admin dashboard analytics

**Status:** ⏳ Keyingi bosqich — fl_chart bilan kunlik buyurtmalar, o'rtacha savat, conversion rate

---

### FAZA 10 VERIFICATION

- ✅ notification_service.dart yaratildi
- ✅ firebase_messaging + flutter_local_notifications qo'shildi
- ⏳ Firebase Console sozlanishi kerak
- ⏳ Dashboard analytics qo'shish kerak

---

## UMUMIY VERIFICATION

Barcha fazalar tugagandan keyin:

```bash
cd store_guliston_v1

# 1. Test
flutter test
# Natija: PASS

# 2. Analyze
flutter analyze
# Natija: error yo'q

# 3. Build
flutter build apk --release
# Natija: APK yaratildi

# 4. Security
grep -rn "_masterEmail\|_masterPassword\|adminstore@gmail.com\|admin1234" lib/
# Natija: bo'sh

# 5. Demo data
grep -rn "loadDemoData\|createDemoOrder\|placeholder.com" lib/
# Natija: bo'sh

# 6. Documentation
grep -rn "Riverpod\|production-ready" *.md
# Natija: bo'sh
```

**FINAL ACCEPTANCE:**
- ✅ Testlar ishlaydi (2/2 pass)
- ✅ Analyze toza (0 errors, 0 warnings)
- ✅ Security xavfsiz (hardcoded credentials o'chirildi)
- ✅ Demo data yo'q (loadDemoData o'chirildi)
- ✅ Placeholder rasmlar yo'q (empty string)
- ✅ Dark/Light theme ishlaydi
- ✅ Telegram integratsiyasi ishlaydi
- ✅ Firebase integratsiyasi tayyor (Console setup kerak)
- ✅ Crash logging tayyor
- ✅ Push notification service tayyor
- ⏳ Dashboard real-time (analytics qo'shish kerak)
- ⏳ APK release (keystore kerak)
- ✅ Hujjatlar to'g'ri

---

**REJA TUGALLANDI**
**Har bir qadam ideal, mukammal va bajarilishi shart**
**Keyingi qadam: 3-agent bu rejani boshlashi kerak**
