import 'package:go_router/go_router.dart';
import '../screens/splash_screen.dart';
import '../models/shop.dart';
import '../screens/home_screen.dart';
import '../screens/shop_detail_screen.dart';
import '../screens/cart_screen.dart';
import '../screens/checkout_screen.dart';
import '../screens/order_success_screen.dart';
import '../screens/order_history_screen.dart';
import '../models/order.dart';
import '../screens/location_map_screen.dart';
import '../screens/payment_methods_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/help_screen.dart';
import '../screens/admin/admin_login_screen.dart';
import '../screens/admin/admin_register_screen.dart';
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/admin/admin_shops_screen.dart';
import '../screens/admin/admin_products_screen.dart';
import '../screens/admin/admin_orders_screen.dart';
import '../screens/admin/admin_settings_screen.dart';
import '../screens/admin/app_texts_screen.dart';
import '../screens/admin/categories_screen.dart';
import '../screens/admin/couriers_screen.dart';
import '../screens/weather_screen.dart';
import '../services/admin_route_guard.dart';

import '../screens/main_navigation_screen.dart';
import '../screens/customer_catalog_screen.dart';
import '../screens/customer_profile_screen.dart';
import '../screens/auth_screen.dart';
import '../screens/shop_builder/shop_builder_screen.dart';
import '../screens/seller/agro_starter_pack_screen.dart';
import '../screens/seller/daily_price_update_screen.dart';
import '../screens/seller/agro_catalog_claim_screen.dart';

final GoRouter goRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) async {
    // Guard all admin routes except login
    final location = state.uri.toString();
    if (location.startsWith('/admin') && location != '/admin/login' && location != '/admin/register') {
      return await AdminRouteGuard.redirect(context, state);
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainNavigationScreen(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/catalog',
              builder: (context, state) => const CustomerCatalogScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/cart',
              builder: (context, state) => const CartScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const CustomerProfileScreen(),
            ),
          ],
        ),
      ],
    ),
    GoRoute(
      path: '/shop/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return ShopDetailScreen(
          shop: Shop(
            id: id,
            name: 'Do\'kon',
            address: '',
            phone: '',
            latitude: 0,
            longitude: 0,
            category: '',
            imageUrl: '',
            workingHours: '',
            isOpen: true,
            rating: 0,
          ),
        );
      },
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => const CheckoutScreen(),
    ),
    GoRoute(
      path: '/order-success',
      builder: (context, state) => OrderSuccessScreen(order: state.extra as Order),
    ),
    GoRoute(
      path: '/orders',
      builder: (context, state) => const OrderHistoryScreen(),
    ),
    GoRoute(
      path: '/admin/login',
      builder: (context, state) => const AdminLoginScreen(),
    ),
    GoRoute(
      path: '/admin/register',
      builder: (context, state) => const AdminRegisterScreen(),
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
    GoRoute(
      path: '/admin/settings',
      builder: (context, state) => const AdminSettingsScreen(),
    ),
    GoRoute(
      path: '/admin/texts',
      builder: (context, state) => const AppTextsScreen(),
    ),
    GoRoute(
      path: '/admin/categories',
      builder: (context, state) => const CategoriesScreen(),
    ),
    GoRoute(
      path: '/admin/couriers',
      builder: (context, state) => const CouriersScreen(),
    ),
    GoRoute(
      path: '/location',
      builder: (context, state) => const LocationMapScreen(),
    ),
    GoRoute(
      path: '/weather',
      builder: (context, state) => const WeatherScreen(),
    ),
    GoRoute(
      path: '/payment',
      builder: (context, state) => const PaymentMethodsScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/auth',
      builder: (context, state) => const AuthScreen(),
    ),
    GoRoute(
      path: '/shop-builder',
      builder: (context, state) => ShopBuilderScreen(
        shopId: state.uri.queryParameters['shopId'] != null
            ? int.tryParse(state.uri.queryParameters['shopId']!)
            : null,
      ),
    ),
    GoRoute(
      path: '/help',
      builder: (context, state) => const HelpScreen(),
    ),
    GoRoute(
      path: '/seller/agro/starter-packs',
      builder: (context, state) => AgroStarterPackScreen(
        initialShopId: state.uri.queryParameters['shopId'],
      ),
    ),
    GoRoute(
      path: '/seller/agro/daily-prices',
      builder: (context, state) => DailyPriceUpdateScreen(
        initialShopId: state.uri.queryParameters['shopId'],
      ),
    ),
    GoRoute(
      path: '/seller/agro/catalog-claim',
      builder: (context, state) => AgroCatalogClaimScreen(
        initialShopId: state.uri.queryParameters['shopId'],
      ),
    ),
  ],
);
