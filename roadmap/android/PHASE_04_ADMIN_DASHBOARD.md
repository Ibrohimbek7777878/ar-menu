# 📊 FAZA 4 — ADMIN DASHBOARD

## 🎯 Maqsad
Admin uchun real-time statistika, grafiklar va ob-havo vidjeti bilan to'liq dashboard yaratish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.1 Dashboard (statistika, grafik, ob-havo)
- `BACKEND_PROMPT_SENIOR.md` — Analytics API endpointlari (offline versiya)

## 🔧 Tafsilotlar

### 4.1 Dashboard statistikasi (4 ta kartochka)
```dart
// Count-up animation bilan
- Jami buyurtmalar soni  (SELECT COUNT(*) FROM orders)
- Bugungi tushum         (SELECT SUM(final_amount) FROM orders WHERE date = today)
- Faol do'konlar soni    (SELECT COUNT(*) FROM shops WHERE is_open = 1)
- Ombordagi mahsulotlar  (SELECT COUNT(*) FROM products WHERE is_available = 1)
```

### 4.2 Grafiklar (fl_chart paketi)
```yaml
# pubspec.yaml ga qo'shish
fl_chart: ^0.68.0
```

- **Kunlik sotuv grafigi** (bar chart) — oxirgi 7 kun
- **Eng ko'p sotilgan mahsulotlar** (bar chart) — top 5
- **Buyurtma holatlari** (pie chart) — pending, accepted, preparing, delivered, cancelled

### 4.3 Ob-havo vidjeti
- OpenWeather API dan Yangi Yer shahri uchun
- Harorat, namlik, shamol tezligi, icon
- SharedPreferences cache (30 daqiqa)
- Agar API kalit bo'lmasa, default ma'lumot ko'rsatish

### 4.4 Shimmer skeleton loader
```dart
// Ma'lumot yuklanayotganda shimmer effekti
shimmer: ^3.0.0  // pubspec.yaml da bor
```

### 4.5 Admin Dashboard Screen
```dart
class AdminDashboardScreen extends StatefulWidget {
  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  // Statistik ma'lumotlar
  int totalOrders = 0;
  double todayRevenue = 0;
  int activeShops = 0;
  int totalProducts = 0;
  
  // Grafik ma'lumotlar
  List<DailySale> dailySales = [];
  List<TopProduct> topProducts = [];
  Map<String, int> orderStatusCount = {};
  
  // Ob-havo
  WeatherData? weather;
  
  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }
  
  Future<void> _loadDashboardData() async {
    // SQLite dan ma'lumotlarni olish
    // ...
  }
}
```

### 4.6 Navigatsiya
- Dashboard dan → Do'konlar, Mahsulotlar, Buyurtmalar sahifalariga o'tish
- BottomNavigationBar yoki Drawer

## ✅ Natija
- Chiroyli dashboard (count-up animation, fl_chart)
- Real-time statistika
- Ob-havo vidjeti
- Shimmer loader