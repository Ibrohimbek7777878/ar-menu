# 📱 FAZA 13 — BUYURTMA BERISH FLOW (3 TELEFON, TARIX, SPAM)

## 🎯 Maqsad
Foydalanuvchi uchun to'liq buyurtma berish tizimi: 3 telefon raqam, lokatsiya, izoh, buyurtma tarixi, spam prevention.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 7. Buyurtma berish flow
- `BACKEND_PROMPT_SENIOR.md` — Order Service (rate limiting, telefon bo'yicha tarix)
- `GULISTON_PROJECT_TZ.md` — "Zero Friction: 3 ta tap bilan buyurtma"

## 🔧 Tafsilotlar

### 13.1 `CheckoutScreen` (Buyurtma berish sahifasi)
```dart
class CheckoutScreen extends StatefulWidget {
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

Fields:
- To'liq ism (TextField. majburiy)
- Telefon 1 (TextField, +998 mask, majburiy)
- Telefon 2 (TextField, +998 mask, majburiy)
- Telefon 3 (TextField, +998 mask, ixtiyoriy)
- Yetkazish manzili (Card → LocationPickerScreen ochiladi)
- Izoh (TextField, multiline, ixtiyoriy)

Validation:
- Ism bo'sh bo'lmasligi kerak
- Telefon 1: 9 ta raqam (majburiy)
- Telefon 2: 9 ta raqam (majburiy)
- Telefon 3: 9 ta raqam yoki bo'sh (ixtiyoriy)
- Yetkazish manzili tanlangan bo'lishi kerak
```

### 13.2 Buyurtma yaratish
```dart
Future<void> submitOrder() async {
  // 1. Spam check (5 daqiqada 3 ta buyurtma)
  if (!await _canPlaceOrder()) {
    _showError('Juda ko\'p buyurtma. 5 daqiqadan keyin qayta urinib ko\'ring.');
    return;
  }
  
  // 2. Order number yaratish: OSG-YYYYMMDD-NNNN
  final orderNumber = await _generateOrderNumber();
  
  // 3. Order obyekt yaratish
  final order = Order(
    id: uuid.v4(),
    orderNumber: orderNumber,
    shopId: widget.shopId,
    customerName: _nameController.text,
    customerPhone1: '+998${_phone1Controller.text}',
    customerPhone2: '+998${_phone2Controller.text}',
    customerPhone3: _phone3Controller.text.isNotEmpty ? '+998${_phone3Controller.text}' : null,
    deliveryAddress: _deliveryAddress,
    deliveryLat: _selectedLat,
    deliveryLng: _selectedLng,
    totalAmount: _cartTotal,
    deliveryFee: _deliveryFee,
    discountAmount: _discount ?? 0,
    finalAmount: _cartTotal + _deliveryFee - (_discount ?? 0),
    status: 'pending',
    customerNotes: _notesController.text,
    createdAt: DateTime.now().millisecondsSinceEpoch ~/ 1000,
  );
  
  // 4. SQLite ga saqlash
  await orderService.createOrder(order);
  
  // 5. Cart tozalash
  cartProvider.clear();
  
  // 6. Muvaffaqiyat sahifasiga o'tish
  Navigator.pushReplacementNamed(context, '/order-success', arguments: orderNumber);
}
```

### 13.3 Spam prevention
```dart
// Telefon raqam orqali rate limiting (lokal)
class SpamPrevention {
  static const int maxOrders = 3;
  static const int windowMinutes = 5;
  
  Future<bool> canPlaceOrder(String phone) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'order_count_$phone';
    final timeKey = 'order_time_$phone';
    
    final count = prefs.getInt(key) ?? 0;
    final lastTime = prefs.getInt(timeKey) ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;
    
    // Agar 5 daqiqa o'tgan bo'lsa, reset
    if (now - lastTime > windowMinutes * 60 * 1000) {
      await prefs.setInt(key, 1);
      await prefs.setInt(timeKey, now);
      return true;
    }
    
    if (count >= maxOrders) {
      return false;
    }
    
    await prefs.setInt(key, count + 1);
    return true;
  }
}
```

### 13.4 Buyurtma raqami generatori
```dart
Future<String> generateOrderNumber() async {
  final db = await DatabaseHelper().database;
  final today = DateTime.now();
  final dateStr = '${today.year}${today.month.toString().padLeft(2, '0')}${today.day.toString().padLeft(2, '0')}';
  
  // Bugungi oxirgi buyurtma raqamini topish
  final result = await db.rawQuery('''
    SELECT COUNT(*) as count FROM orders 
    WHERE order_number LIKE 'OSG-$dateStr-%'
  ''');
  
  final count = (result.first['count'] as int) + 1;
  return 'OSG-$dateStr-${count.toString().padLeft(4, '0')}';
}
```

### 13.5 Telefon bo'yicha buyurtma tarixi
```dart
class OrderHistoryScreen extends StatelessWidget {
  final String phone;
  
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Order>>(
      future: OrderService().getOrdersByPhone(phone),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(
            child: Text('Buyurtmalar topilmadi'),
          );
        }
        
        return ListView.builder(
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            final order = snapshot.data![index];
            return OrderCard(order: order);
          },
        );
      },
    );
  }
}
```

### 13.6 `OrderSuccessScreen`
```dart
class OrderSuccessScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final orderNumber = ModalRoute.of(context)!.settings.arguments as String;
    
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Lottie confetti animation
            Lottie.asset('assets/animations/success.json', width: 200, height: 200),
            const SizedBox(height: 24),
            Text('Buyurtmangiz qabul qilindi!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Buyurtma raqami: $orderNumber', style: TextStyle(fontSize: 16, color: Colors.grey)),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false),
              child: const Text('Bosh sahifaga qaytish'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 13.7 Minimal buyurtma summasi
```dart
// Minimal buyurtma: 20,000 so'm
if (cartTotal < 20000) {
  _showError('Minimal buyurtma summasi 20,000 so\'m');
  return;
}

// Motivatsiya: "Yana 2000 so'm qo'shing — bepul yetkazib berish!"
if (cartTotal < 50000) {
  final remaining = 50000 - cartTotal;
  _showInfo('Yana $remaining so\'m qo\'shsangiz, bepul yetkazib berish!');
}
```

## ✅ Natija
- 3 telefon raqam (2 majburiy, 1 ixtiyoriy)
- Lokatsiya tanlash (Google/Yandex Maps)
- Izoh qo'shish
- Spam prevention (5 daqiqada 3 ta)
- Buyurtma raqami (OSG-YYYYMMDD-NNNN)
- Muvaffaqiyat animatsiyasi (Lottie)
- Telefon bo'yicha buyurtma tarixi
- Minimal buyurtma (20,000 so'm)
- Bepul yetkazish motivatsiyasi