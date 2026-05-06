/// App router - navigation configuration

import 'package:flutter/material.dart';

// App router class
class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/':
        return MaterialPageRoute(builder: (_) => const SplashPage());
      case '/home':
        return MaterialPageRoute(
          builder: (_) => HomePage(selectedCity: 'Yangi Yer'),
        );
      case '/shop/:shopId':
        return MaterialPageRoute(
          builder: (_) => ShopDetailPage(shopId: '123', shopName: 'Do\'kon nomi'),
        );
      case '/shop/:shopId/product/:productId':
        return MaterialPageRoute(
          builder: (_) => ProductDetailPage(productId: '456', shopId: '123', productName: 'Mahsulot nomi'),
        );
      case '/cart':
        return MaterialPageRoute(builder: (_) => const CartPage());
      case '/checkout':
        return MaterialPageRoute(builder: (_) => const CheckoutPage());
      case '/order-success/:orderId':
        return MaterialPageRoute(
          builder: (_) => OrderSuccessPage(orderId: '12345'),
        );
      case '/admin/login':
        return MaterialPageRoute(builder: (_) => const LoginPage());
      case '/admin/dashboard':
        return MaterialPageRoute(builder: (_) => const DashboardPage());
      case '/admin/shops':
        return MaterialPageRoute(builder: (_) => const ShopsPage());
      case '/admin/products/:shopId':
        return MaterialPageRoute(
          builder: (_) => ProductsPage(shopId: '123'),
        );
      case '/admin/orders':
        return MaterialPageRoute(builder: (_) => const OrdersPage());
      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Not found')),
          ),
        );
    }
  }
}