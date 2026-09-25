# 📱 FAZA 1 — OQ FON MUAMMOSINI TUZATISH (CRITICAL)

## 🎯 Maqsad
Flutter ilovasidagi **blank white screen** muammosini bartaraf qilish. Provider/Riverpod konfliktini hal qilish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — Serverless Flutter app
- `GULISTON_PROJECT_TZ.md` — Zero friction UX (3 tap bilan buyurtma)

## 🐛 Muammo diagnostikasi

| # | Muammo | Sabab |
|---|--------|-------|
| 1 | `ProviderScope` yo'q | `main.dart` `ConsumerWidget` ishlatadi, lekin Riverpod scope'i yo'q |
| 2 | `ChangeNotifierProvider` yo'q | `home_screen.dart` `Provider.of<ShopProvider>()` ishlatadi |
| 3 | Provider vs Riverpod konflikti | Ikkala package aralashgan |
| 4 | `goRouterProvider` noto'g'ri | GoRouter to'g'ri ulanishi kerak |

## 🔧 Tuzatish rejasi

### 1.1 `main.dart` — `MultiProvider` bilan o'rash

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_colors.dart';
import 'config/router_config.dart';
import 'database/database_helper.dart';
import 'providers/shop_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/product_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DatabaseHelper().database;
  runApp(const StoreGulistonApp());
}

class StoreGulistonApp extends StatelessWidget {
  const StoreGulistonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ShopProvider()..loadDemoData()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
      ],
      child: MaterialApp(
        title: 'Online Store Guliston',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primaryColor: AppColors.primaryGreen,
          scaffoldBackgroundColor: AppColors.background,
          colorScheme: const ColorScheme.light(
            primary: AppColors.primaryGreen,
            secondary: AppColors.accentOrange,
            surface: AppColors.surface,
            background: AppColors.background,
            error: AppColors.error,
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.primaryGreen,
            foregroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
          ),
          cardTheme: CardThemeData(
            color: AppColors.surface,
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
```

### 1.2 `router_config.dart` — GoRouter ni GoRouterProvider emas, oddiy GoRouter qilish

```dart
// config/router_config.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home_screen.dart';
import '../screens/shop_detail_screen.dart';
import '../screens/cart_screen.dart';
import '../screens/checkout_screen.dart';
import '../screens/order_success_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/admin/admin_login_screen.dart';
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/admin/admin_shops_screen.dart';
import '../screens/admin/admin_products_screen.dart';
import '../screens/admin/admin_orders_screen.dart';

final GoRouter goRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/shop/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return ShopDetailScreen(shopId: id);
      },
    ),
    GoRoute(
      path: '/cart',
      builder: (context, state) => const CartScreen(),
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => const CheckoutScreen(),
    ),
    GoRoute(
      path: '/order-success',
      builder: (context, state) => const OrderSuccessScreen(),
    ),
    GoRoute(
      path: '/admin/login',
      builder: (context, state) => const AdminLoginScreen(),
    ),
    GoRoute(
      path: '/admin/dashboard',
      builder: (context, state) => const AdminDashboardScreen(),
    ),
    GoRoute(
      path: '/admin/shops',
      builder: (context, state) => const AdminShopsScreen(),
    ),
    GoRoute(
      path: '/admin/products',
      builder: (context, state) => const AdminProductsScreen(),
    ),
    GoRoute(
      path: '/admin/orders',
      builder: (context, state) => const AdminOrdersScreen(),
    ),
  ],
);
```

### 1.3 `home_screen.dart` — Importlarni to'g'rilash

```dart
// home_screen.dart da importlarni o'zgartirish:
// ❌ import 'package:provider/provider.dart';
// ✅ import 'package:flutter/material.dart' (allaqachon bor)
// ❌ import 'package:store_guliston/providers/shop_provider.dart';
// ✅ import '../providers/shop_provider.dart';
// ❌ import 'package:store_guliston/providers/cart_provider.dart';
// ✅ import '../providers/cart_provider.dart';
```

### 1.4 `pubspec.yaml` — Riverpodni olib tashlash (Provider bilan qolamiz)

```yaml
dependencies:
  flutter:
    sdk: flutter

  # State Management
  provider: ^6.1.0

  # Navigation
  go_router: ^14.0.0

  # Database
  sqflite: ^2.3.0
  path_provider: ^2.1.0
  path: ^1.9.0

  # HTTP
  http: ^1.2.0

  # UI & Fonts
  google_fonts: ^6.1.0
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  intl: ^0.19.0

  # Maps
  geolocator: ^10.1.0

  # Utils
  shared_preferences: ^2.2.0
  uuid: ^4.0.0
  crypto: ^3.0.0
  url_launcher: ^6.2.0
```

## ✅ Natija
- Oq fon muammosi bartaraf
- Provider package bilan ishlash
- GoRouter to'g'ri ulangan
- App ishga tushadi va do'konlar ko'rinadi

## 📝 O'zgartiriladigan fayllar
| Fayl | Amal |
|------|------|
| `store_guliston_v1/lib/main.dart` | To'liq qayta yozish |
| `store_guliston_v1/lib/config/router_config.dart` | GoRouterProvider → GoRouter |
| `store_guliston_v1/pubspec.yaml` | Riverpod, flutter_riverpod, dio, google_maps_flutter va boshqa keraksizlarni olib tashlash |
| `store_guliston_v1/lib/screens/home_screen.dart` | Importlarni to'g'rilash |

## 🚫 Backenddan tozalamoqchi bo'lgan servislar
- `shop_service.dart` → SQLite asosida qayta yoziladi (keyingi fazada)
- `auth_service.dart` → Butunlay o'chiriladi (keyingi fazada)