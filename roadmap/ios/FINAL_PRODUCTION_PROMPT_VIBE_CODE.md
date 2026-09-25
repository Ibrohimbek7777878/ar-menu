# 🚀 ONLINE STORE GULISTON — YAKUNIY PRODUCTION PROMPT
## Vibe Code / AI Cursor / Windsurf uchun to'liq tayyor

---

## 📋 LOYIHA XULOSA

**Siz hozirda mavjud loyihangizni** `store_guliston_v1` — to'liq ishlashga tayyor holatga keltirmoqchisiz. Quyidagi talablar asosida **YAKUNIY PRODUCTION VERSIYA** yaratilishi kerak.

---

## ✅ MAVJUD HOLATDAN NIMA SAQLANADI

Sizda allaqachon tayyor:
- ✅ SQLite database (shops, products, orders, categories)
- ✅ Riverpod state management
- ✅ Go_router navigation
- ✅ Repository pattern (ShopRepository, ProductRepository, OrderRepository)
- ✅ Admin panel (PIN: 1234)
- ✅ APK build script (`./scripts/build-apk.sh`)
- ✅ Seed data (5 shops, 5 products, 5 categories)

---

## 🔥 YANGI TALABLAR — QO'SHISH KERAK BO'LGAN

---

### 1. DOCKER VA BACKEND — BUTUNLAY OLIB TASHLASH

**❌ O'chiriladi:**
```
backend/                    # Butun backend folder
docker-compose.yml
Dockerfile
.env files (backend related)
```

**✅ Qoladi:**
```
store_guliston_v1/          # Faqat Flutter app
```

**Sabab:** Loyiha **serverless**, APK orqali tarqatiladi, backend kerak emas.

---

### 2. REGISTER TIZIMI — FAQAT ADMIN UCHUN

#### User Side (Oddiy foydalanuvchi)
```
❌ Ro'yxatdan o'tish yo'q
❌ Login yo'q
❌ Profil sahifa yo'q (oddiy userlar uchun)

✅ Ilova ochiladi → shahar tanlash → do'konlar ko'rinadi
✅ Buyurtma berishda faqat:
   - Ism
   - Telefon 1 (majburiy)
   - Telefon 2 (majburiy)
   - Telefon 3 (ixtiyoriy)
   - Lokatsiya (Google/Yandex Maps orqali)
   - Izoh
✅ Telefon bo'yicha buyurtma tarixi ko'rish
```

#### Admin Side
```
✅ Email + Parol login tizimi
   Email: adminstore@gmail.com
   Parol: admin1234

✅ Admin panelga kirish:
   Bosh ekranda "Admin Panel" tugmasi
   → Chiroyli animatsiyali modal/screen
   → Email va Parol kiritish
   → Login bo'lgandan keyin 24 soat sessiya
```

---

### 3. ADMIN PANEL — TO'LIQ DINAMIK BOSHQARUV

Admin ilovaning **100% ini boshqaradi**. Hech narsa hardcoded emas.

#### 3.1 Dashboard
```dart
// Admin Panel bosh sahifasi
- Bugungi statistika:
  * Jami buyurtmalar soni
  * Bugungi tushum
  * Faol do'konlar soni
  * Ombordagi mahsulotlar soni
  
- Real-time grafiklar:
  * Kunlik sotuv grafigi (fl_chart)
  * Eng ko'p sotilgan mahsulotlar (bar chart)
  * Buyurtma holatlari (pie chart)
  
- Ob-havo vidjet:
  * OpenWeather API integratsiyasi
  * Yangi Yer shahri uchun
  * Harorat, nam, shamol
```

#### 3.2 Do'konlar Boshqaruvi
```dart
Screens:
1. ShopsListScreen (Admin)
   - Barcha do'konlar jadvali
   - Qidiruv va filter
   - Qo'shish, Tahrirlash, O'chirish tugmalari

2. AddEditShopScreen
   Fields:
   - Do'kon nomi (TextField)
   - Manzili (TextField + Xaritadan tanlash)
   - Shahar (Dropdown: Yangi Yer / Guliston)
   - Telefon (TextField with +998 mask)
   - Ish vaqti boshlanish (TimePicker)
   - Ish vaqti tugash (TimePicker)
   - Rasm yuklash (ImagePicker - Camera yoki Gallery)
   - Kategoriya (Dropdown)
   - Ochiq/Yopiq (Switch)
   
   Actions:
   - Saqlash (validation + SQLite insert/update)
   - Bekor qilish
```

#### 3.3 Mahsulotlar Boshqaruvi
```dart
Screens:
1. ProductsListScreen (Admin)
   - Do'kon bo'yicha filter
   - Kategoriya bo'yicha filter
   - Mavjudligi bo'yicha filter
   - Qidiruv (mahsulot nomi)
   - Grid yoki List ko'rinishi
   - Har bir mahsulot uchun: Tahrirlash | O'chirish

2. AddEditProductScreen
   Fields:
   - Mahsulot nomi (TextField)
   - Tavsifi (TextField, multiline)
   - Narxi (TextField, number keyboard)
   - O'lchov birligi (Dropdown: dona, kg, litr, paket)
   - Rasm (ImagePicker)
   - Kategoriya (Dropdown)
   - Do'kon (Dropdown)
   - Mavjudligi (Switch)
   - Ombor soni (TextField, number)
   
   Actions:
   - Saqlash
   - Bekor qilish
```

#### 3.4 Buyurtmalar Boshqaruvi
```dart
Screens:
1. OrdersListScreen (Admin)
   - Barcha buyurtmalar
   - Holat bo'yicha filter (pending, accepted, preparing, delivering, delivered, cancelled)
   - Sana bo'yicha filter
   - Qidiruv (buyurtma raqami, telefon)
   - Har bir buyurtma uchun: Tafsilot | Holat o'zgartirish

2. OrderDetailScreen (Admin)
   - Buyurtma raqami
   - Mijoz ma'lumotlari (ism, 3 ta telefon)
   - Buyurtma tarkibi (mahsulotlar jadvali)
   - Lokatsiya (xaritada ko'rsatish)
   - Jami summa
   - Holat o'zgartirish dropdown
   - Kuryer tayinlash (agar bor bo'lsa)
   - Telefon qilish tugmalari (3 ta telefon uchun)
```

#### 3.5 Kategoriyalar Boshqaruvi
```dart
Screen: CategoriesScreen (Admin)
   - Kategoriyalar ro'yxati
   - Qo'shish, Tahrirlash, O'chirish
   
Fields:
   - Kategoriya nomi (TextField)
   - Icon (IconPicker - Flutter Material Icons)
   - Rang (ColorPicker - hex color)
   - Tartib raqami (NumberField)
```

#### 3.6 Kuryerlar Boshqaruvi
```dart
Screen: CouriersScreen (Admin)
   - Kuryerlar ro'yxati
   - Qo'shish, Tahrirlash, O'chirish
   
Fields:
   - Kuryer ismi (TextField)
   - Telefon (TextField)
   - Holati (Dropdown: Faol / Band / Dam olishda)
   - Bugungi buyurtmalar soni (read-only)
```

#### 3.7 Sozlamalar
```dart
Screen: AdminSettingsScreen
   - Parolni o'zgartirish
   - Ilova nomi (TextField) — dinamik o'zgaradi
   - Ilova rangini o'zgartirish (ColorPicker)
   - Ob-havo API key (TextField)
   - Ma'lumotlar tozalash (10 kundan eski)
   - Database backup va restore
   - Admin chiqish (Logout)
```

#### 3.8 Matnlar va Interfeys Boshqaruvi
```dart
Screen: AppTextsScreen (Admin)
   - Ilova ichidagi barcha matnlarni o'zgartirish
   
Matnlar:
   - Bosh sahifa sarlavhasi
   - Kategoriya sarlavhasi
   - Buyurtma tugmasi matni
   - Muvaffaqiyat xabarlari
   - Xato xabarlari
   - Help matnlari
   
Storage: SQLite table 'app_texts' (key-value)
```

---

### 4. DIZAYN VA ANIMATSIYALAR — ZAMONAVIY VA INTERAKTIV

#### 4.1 Ranglar Palette (O'zgaruvchan — Admin sozlaydi)
```dart
// Default ranglar (admin o'zgartira oladi)
Primary: #1B5E20 (to'q yashil)
Primary Light: #4CAF50
Primary Dark: #0D4D1B
Accent: #FF6F00 (to'q apelsin)
Background: #FFFFFF
Surface: #F5F5F5
Text Primary: #212121
Text Secondary: #757575
```

#### 4.2 Animatsiyalar (Hamma joyda)

**Splash Screen:**
```dart
- Logo fade-in + scale animation
- Shimmer loading effect
- Smooth transition to home
```

**Home Screen:**
```dart
- Kategoriya grid — staggered animation (har biri ketma-ket)
- Do'konlar list — slide from bottom
- Banner — auto-slide carousel
- Pull-to-refresh — custom animation
```

**Shop Detail:**
```dart
- Hero animation (shop image)
- Tabs — sliding transition
- Product cards — fade + scale on scroll
```

**Product Detail:**
```dart
- Image zoom pinch/double-tap
- Add to cart — floating animation (mahsulot kartochkadan savatga uchadi)
- Quantity selector — bounce animation
```

**Cart:**
```dart
- Swipe to delete — slide + fade
- Quantity change — number counter animation
- Total amount — counting animation (eski narxdan yangisiga hisoblash)
```

**Checkout:**
```dart
- Stepper animation (step-by-step)
- Form validation — shake animation on error
- Success — Lottie confetti animation
```

**Admin Panel Entry:**
```dart
// Bosh ekranda "Admin Panel" floating button
- 3D flip animation on tap
- Modal bottom sheet slide up
- Email/Parol fields — focus animation
- Login button — ripple effect + loading spinner
```

**Admin Dashboard:**
```dart
- Stats cards — count-up animation
- Charts — draw animation (fl_chart)
- Refresh — shimmer skeleton loader
```

---

### 5. OB-HAVO INTEGRATSIYA

```dart
// lib/services/weather_service.dart

class WeatherService {
  static const String apiKey = 'YOUR_OPENWEATHER_API_KEY'; // Admin sozlaydi
  
  Future<WeatherData> getCurrentWeather() async {
    try {
      final response = await dio.get(
        'https://api.openweathermap.org/data/2.5/weather',
        queryParameters: {
          'lat': 40.5966, // Yangi Yer
          'lon': 68.7786,
          'appid': apiKey,
          'units': 'metric',
          'lang': 'uz',
        },
      );
      
      return WeatherData.fromJson(response.data);
    } catch (e) {
      // Fallback to cached data
      return _getCachedWeather();
    }
  }
  
  Future<WeatherData> _getCachedWeather() async {
    // SharedPreferences dan oxirgi ma'lumotni olish
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_weather');
    if (cached != null) {
      return WeatherData.fromJson(jsonDecode(cached));
    }
    return WeatherData.empty(); // Default ma'lumot
  }
}

// Widget
class WeatherWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weather = ref.watch(weatherProvider);
    
    return weather.when(
      data: (data) => Row(
        children: [
          Icon(Icons.wb_sunny, color: Colors.white, size: 20),
          SizedBox(width: 4),
          Text('${data.temp.toStringAsFixed(0)}°C', 
            style: TextStyle(color: Colors.white)),
        ],
      ),
      loading: () => SizedBox.shrink(),
      error: (_, __) => SizedBox.shrink(),
    );
  }
}
```

---

### 6. LOKATSIYA TANLASH (Buyurtma berishda)

```dart
// lib/screens/checkout/location_picker_screen.dart

class LocationPickerScreen extends StatefulWidget {
  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  GoogleMapController? _mapController;
  LatLng? _selectedLocation;
  String? _address;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Yetkazish manzilini tanlang'),
        actions: [
          if (_selectedLocation != null)
            TextButton(
              onPressed: () {
                Navigator.pop(context, {
                  'lat': _selectedLocation!.latitude,
                  'lng': _selectedLocation!.longitude,
                  'address': _address,
                });
              },
              child: Text('Tasdiqlash', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: Stack(
        children: [
          // Google Maps
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(40.5966, 68.7786), // Yangi Yer markazi
              zoom: 14,
            ),
            onMapCreated: (controller) => _mapController = controller,
            onTap: (position) async {
              setState(() => _selectedLocation = position);
              
              // Reverse geocoding (koordinatalarni manzilga aylantirish)
              final address = await _getAddressFromLatLng(position);
              setState(() => _address = address);
            },
            markers: _selectedLocation != null
                ? {
                    Marker(
                      markerId: MarkerId('selected'),
                      position: _selectedLocation!,
                    ),
                  }
                : {},
          ),
          
          // Address display card
          if (_address != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(_address!),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          // Get current location
          final position = await _getCurrentLocation();
          _mapController?.animateCamera(
            CameraUpdate.newLatLng(LatLng(position.latitude, position.longitude)),
          );
        },
        child: Icon(Icons.my_location),
      ),
    );
  }
  
  Future<String> _getAddressFromLatLng(LatLng position) async {
    // Yandex Geocoding API
    try {
      final response = await dio.get(
        'https://geocode-maps.yandex.ru/1.x/',
        queryParameters: {
          'apikey': 'YOUR_YANDEX_API_KEY',
          'geocode': '${position.longitude},${position.latitude}',
          'format': 'json',
          'lang': 'uz_UZ',
        },
      );
      
      final result = response.data['response']['GeoObjectCollection']
          ['featureMember'][0]['GeoObject'];
      return result['metaDataProperty']['GeocoderMetaData']['text'];
    } catch (e) {
      return 'Manzil aniqlanmadi';
    }
  }
  
  Future<Position> _getCurrentLocation() async {
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }
}
```

---

### 7. BUYURTMA BERISH FLOW (Yangi talablar bilan)

```dart
// lib/screens/checkout/checkout_screen.dart

class CheckoutScreen extends StatefulWidget {
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phone1Controller = TextEditingController();
  final _phone2Controller = TextEditingController();
  final _phone3Controller = TextEditingController();
  final _notesController = TextEditingController();
  
  LatLng? _deliveryLocation;
  String? _deliveryAddress;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Buyurtma berish')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: EdgeInsets.all(16),
          children: [
            // Ism
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'To\'liq ismingiz',
                prefixIcon: Icon(Icons.person),
              ),
              validator: (v) => v!.isEmpty ? 'Ism kiriting' : null,
            ),
            SizedBox(height: 16),
            
            // Telefon 1 (majburiy)
            TextFormField(
              controller: _phone1Controller,
              decoration: InputDecoration(
                labelText: 'Telefon 1 (asosiy)',
                prefixIcon: Icon(Icons.phone),
                prefixText: '+998 ',
              ),
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              validator: (v) => v!.length != 9 ? 'To\'liq raqam kiriting' : null,
            ),
            SizedBox(height: 16),
            
            // Telefon 2 (majburiy)
            TextFormField(
              controller: _phone2Controller,
              decoration: InputDecoration(
                labelText: 'Telefon 2 (zaxira)',
                prefixIcon: Icon(Icons.phone),
                prefixText: '+998 ',
              ),
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              validator: (v) => v!.length != 9 ? 'To\'liq raqam kiriting' : null,
            ),
            SizedBox(height: 16),
            
            // Telefon 3 (ixtiyoriy)
            TextFormField(
              controller: _phone3Controller,
              decoration: InputDecoration(
                labelText: 'Telefon 3 (ixtiyoriy)',
                prefixIcon: Icon(Icons.phone),
                prefixText: '+998 ',
              ),
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
            ),
            SizedBox(height: 16),
            
            // Lokatsiya tanlash
            Card(
              child: ListTile(
                leading: Icon(Icons.location_on, color: AppColors.primary),
                title: Text(_deliveryAddress ?? 'Yetkazish manzilini tanlang'),
                trailing: Icon(Icons.arrow_forward_ios),
                onTap: () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => LocationPickerScreen(),
                    ),
                  );
                  
                  if (result != null) {
                    setState(() {
                      _deliveryLocation = LatLng(result['lat'], result['lng']);
                      _deliveryAddress = result['address'];
                    });
                  }
                },
              ),
            ),
            SizedBox(height: 16),
            
            // Izoh
            TextFormField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: 'Izoh (ixtiyoriy)',
                prefixIcon: Icon(Icons.notes),
                hintText: 'Masalan: 3-qavat, 12-xonadon',
              ),
              maxLines: 3,
            ),
            SizedBox(height: 24),
            
            // Buyurtma tugmasi
            ElevatedButton(
              onPressed: _submitOrder,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
              child: Text('Buyurtma berish', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
      ),
    );
  }
  
  void _submitOrder() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_deliveryLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yetkazish manzilini tanlang')),
      );
      return;
    }
    
    // Create order
    final order = Order(
      id: Uuid().v4(),
      orderNumber: 'OSG-${DateTime.now().millisecondsSinceEpoch}',
      shopId: widget.shopId,
      customerName: _nameController.text,
      customerPhone1: '+998${_phone1Controller.text}',
      customerPhone2: '+998${_phone2Controller.text}',
      customerPhone3: _phone3Controller.text.isNotEmpty 
          ? '+998${_phone3Controller.text}' 
          : null,
      deliveryAddress: _deliveryAddress,
      deliveryLat: _deliveryLocation!.latitude,
      deliveryLng: _deliveryLocation!.longitude,
      totalAmount: cartTotal,
      status: OrderStatus.pending,
      customerNotes: _notesController.text,
      createdAt: DateTime.now(),
    );
    
    // Save to database
    await ref.read(orderRepositoryProvider).createOrder(order, cartItems);
    
    // Clear cart
    ref.read(cartProvider.notifier).clear();
    
    // Show success with Lottie animation
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => SuccessDialog(orderNumber: order.orderNumber),
    );
  }
}
```

---

### 8. DATABASE SCHEMA — YANGILANGAN

```sql
-- Yangi table: admins
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default admin
INSERT INTO admins (id, email, password_hash, full_name) VALUES (
  'admin_1',
  'adminstore@gmail.com',
  -- SHA256 hash of 'admin1234'
  '0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d622c0',
  'Super Admin'
);

-- Yangi table: couriers
CREATE TABLE couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'busy', 'offline')),
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Yangi table: app_texts (dinamik matnlar)
CREATE TABLE app_texts (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default matnlar
INSERT INTO app_texts (key, value) VALUES
  ('app_name', 'Online Store Guliston'),
  ('home_title', 'Do\'konlar'),
  ('categories_title', 'Kategoriyalar'),
  ('order_button', 'Buyurtma berish'),
  ('success_message', 'Buyurtmangiz qabul qilindi!');

-- Yangi table: app_settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default sozlamalar
INSERT INTO app_settings (key, value) VALUES
  ('primary_color', '#1B5E20'),
  ('weather_api_key', 'YOUR_API_KEY'),
  ('yandex_maps_key', 'YOUR_YANDEX_KEY');

-- orders table ga yangi ustunlar
ALTER TABLE orders ADD COLUMN courier_id TEXT REFERENCES couriers(id);
ALTER TABLE orders ADD COLUMN delivery_lat REAL;
ALTER TABLE orders ADD COLUMN delivery_lng REAL;
ALTER TABLE orders ADD COLUMN customer_phone_2 TEXT;
ALTER TABLE orders ADD COLUMN customer_phone_3 TEXT;
```

---

### 9. PACKAGES (pubspec.yaml ga qo'shish)

```yaml
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
  
  # Icons
  flutter_launcher_icons: ^0.13.1
```

---

### 10. ADMIN PANEL ENTRY BUTTON (Home Screen)

```dart
// lib/screens/home/home_screen.dart

class HomeScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(/* ... */),
      body: /* ... home content ... */,
      
      // Admin Panel Entry Button
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAdminLogin(context),
        backgroundColor: AppColors.accent,
        icon: Icon(Icons.admin_panel_settings),
        label: Text('Admin Panel'),
      ),
    );
  }
  
  void _showAdminLogin(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AdminLoginModal(),
    );
  }
}

// lib/widgets/admin_login_modal.dart

class AdminLoginModal extends StatefulWidget {
  @override
  State<AdminLoginModal> createState() => _AdminLoginModalState();
}

class _AdminLoginModalState extends State<AdminLoginModal>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 300),
    );
    _scaleAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
  }
  
  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              SizedBox(height: 24),
              
              // Title
              Text(
                'Admin Panel',
                style: AppTextStyles.h2,
              ),
              SizedBox(height: 24),
              
              // Email
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              SizedBox(height: 16),
              
              // Password
              TextField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Parol',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                obscureText: true,
              ),
              SizedBox(height: 24),
              
              // Login Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : Text('Kirish', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  void _login() async {
    setState(() => _isLoading = true);
    
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    
    // Validate
    if (email.isEmpty || password.isEmpty) {
      _showError('Email va parol kiriting');
      setState(() => _isLoading = false);
      return;
    }
    
    // Check credentials
    final db = await DatabaseHelper.instance.database;
    final passwordHash = sha256.convert(utf8.encode(password)).toString();
    
    final result = await db.query(
      'admins',
      where: 'email = ? AND password_hash = ?',
      whereArgs: [email, passwordHash],
    );
    
    setState(() => _isLoading = false);
    
    if (result.isNotEmpty) {
      // Success
      Navigator.pop(context);
      Navigator.pushNamed(context, '/admin/dashboard');
    } else {
      _showError('Email yoki parol noto\'g\'ri');
    }
  }
  
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
  
  @override
  void dispose() {
    _controller.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

---

## 📦 YAKUNIY PAKET STRUKTURASI

```
store_guliston_v1/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── core/
│   │   ├── constants/
│   │   │   ├── colors.dart
│   │   │   ├── text_styles.dart
│   │   │   └── app_config.dart
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   └── utils/
│   │       ├── validators.dart
│   │       ├── formatters.dart
│   │       └── crypto_helper.dart
│   ├── database/
│   │   ├── database_helper.dart
│   │   ├── seed_data.dart
│   │   └── cleanup_service.dart
│   ├── models/
│   │   ├── shop.dart
│   │   ├── product.dart
│   │   ├── category.dart
│   │   ├── order.dart
│   │   ├── courier.dart
│   │   ├── admin.dart
│   │   └── weather.dart
│   ├── repositories/
│   │   ├── shop_repository.dart
│   │   ├── product_repository.dart
│   │   ├── order_repository.dart
│   │   ├── category_repository.dart
│   │   ├── courier_repository.dart
│   │   └── admin_repository.dart
│   ├── providers/
│   │   ├── app_providers.dart
│   │   ├── admin_provider.dart
│   │   ├── weather_provider.dart
│   │   └── settings_provider.dart
│   ├── services/
│   │   ├── weather_service.dart
│   │   ├── geocoding_service.dart
│   │   └── storage_service.dart
│   ├── screens/
│   │   ├── splash/
│   │   ├── city_selection/
│   │   ├── home/
│   │   ├── shop/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── checkout/
│   │   │   ├── checkout_screen.dart
│   │   │   └── location_picker_screen.dart
│   │   ├── orders/
│   │   └── admin/
│   │       ├── login/
│   │       ├── dashboard/
│   │       ├── shops/
│   │       │   ├── shops_list_screen.dart
│   │       │   └── add_edit_shop_screen.dart
│   │       ├── products/
│   │       │   ├── products_list_screen.dart
│   │       │   └── add_edit_product_screen.dart
│   │       ├── orders/
│   │       │   ├── orders_list_screen.dart
│   │       │   └── order_detail_screen.dart
│   │       ├── categories/
│   │       │   └── categories_screen.dart
│   │       ├── couriers/
│   │       │   └── couriers_screen.dart
│   │       ├── texts/
│   │       │   └── app_texts_screen.dart
│   │       └── settings/
│   │           └── admin_settings_screen.dart
│   ├── widgets/
│   │   ├── admin_login_modal.dart
│   │   ├── weather_widget.dart
│   │   ├── animated_counter.dart
│   │   ├── success_dialog.dart
│   │   └── custom_chart.dart
│   └── config/
│       └── router_config.dart
├── assets/
│   ├── images/
│   ├── icons/
│   └── lottie/
│       ├── success.json
│       ├── loading.json
│       └── confetti.json
├── scripts/
│   └── build-apk.sh
├── pubspec.yaml
├── QUICK_START.md
├── APK_BUILD_GUIDE.md
└── README.md
```

---

## ✅ PRODUCTION CHECKLIST

### Database
- [x] SQLite schema with all tables
- [x] Seed data (10+ shops, 50+ products, 5+ categories)
- [x] Auto-cleanup (10 days)
- [x] Indexes on frequent queries
- [x] Admin table with hashed password

### Admin Panel
- [x] Email + Password login (adminstore@gmail.com / admin1234)
- [x] Dashboard with real-time stats
- [x] Shops CRUD (create, read, update, delete)
- [x] Products CRUD with image upload
- [x] Orders management with status update
- [x] Categories CRUD with icon/color picker
- [x] Couriers management
- [x] App texts editor (dynamic interface)
- [x] Settings (password change, color picker, API keys)
- [x] Animated modal login

### User Flow
- [x] No registration required
- [x] Checkout with 3 phone numbers
- [x] Location picker (Google/Yandex Maps)
- [x] Order history by phone
- [x] Order tracking

### Design & Animations
- [x] Modern color palette (admin configurable)
- [x] Smooth transitions everywhere
- [x] Hero animations
- [x] Staggered list animations
- [x] Lottie success animations
- [x] Chart animations (fl_chart)
- [x] Loading skeletons

### External APIs
- [x] OpenWeather API (weather widget)
- [x] Yandex/Google Maps (geocoding, location)
- [x] Cached fallbacks for offline mode

### Build & Distribution
- [x] APK build script
- [x] Code obfuscation
- [x] Multi-architecture support
- [x] Version management
- [x] Icon and splash screen

---

## 🚀 BUILD VA DEPLOY

```bash
# 1. Setup
cd store_guliston_v1
flutter pub get

# 2. Run (development)
flutter run

# 3. Test admin login
# Email: adminstore@gmail.com
# Password: admin1234

# 4. Build APK
./scripts/build-apk.sh 1.0.0 1

# 5. APK ready
# dist/apk/store-guliston-v1.0.0-arm64.apk
```

---

## 🎯 VIBE CODE / AI INSTRUCTIONS

Bu prompt **to'liq tayyor** va quyidagilar uchun optimallashtirilgan:
- ✅ Vibe Code (VS Code extension)
- ✅ Cursor AI
- ✅ GitHub Copilot
- ✅ Windsurf
- ✅ Oddiy dasturchilar

**Promptni AI ga berishdan oldin:**
1. Mavjud `store_guliston_v1` proyektini ochib qo'ying
2. `backend/` folderni butunlay o'chiring (agar bor bo'lsa)
3. Ushbu promptni AI ga bering:

```
"Ushbu promptdagi barcha talablarni amalga oshiring.
Mavjud kodni yangilab, yangi funksiyalarni qo'shing.
Har bir o'zgarishni tushuntiring va commit qiling."
```

---

## 📊 KUTILAYOTGAN NATIJA

**2-3 kun ichida:**
- ✅ To'liq ishlashga tayyor app
- ✅ Admin panel (100% dinamik)
- ✅ Zamonaviy dizayn va animatsiyalar
- ✅ Production-ready APK
- ✅ Dokumentatsiya

**App hajmi:** ~25-30 MB (APK)  
**Min Android:** 5.0 (API 21)  
**Target:** Android 13+ (API 33)

---

**OMAD! Bu loyiha O'zbekiston bozorini o'zgartiradi!** 🚀🇺🇿
