import 'package:flutter/material.dart';
import 'package:store_guliston_v1/presentation/pages/admin_dashboard_page.dart';
import 'package:store_guliston_v1/presentation/pages/home_page.dart';
import 'package:store_guliston_v1/presentation/pages/login_page.dart';
import 'package:store_guliston_v1/presentation/pages/product_list_page.dart';
import 'package:store_guliston_v1/presentation/pages/splash_page.dart';
import 'package:store_guliston_v1/presentation/pages/store_list_page.dart';

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case SplashPage.routeName:
        return MaterialPageRoute(builder: (_) => const SplashPage());
      case HomePage.routeName:
        return MaterialPageRoute(builder: (_) => const HomePage());
      case StoreListPage.routeName:
        return MaterialPageRoute(builder: (_) => const StoreListPage());
      case ProductListPage.routeName:
        return MaterialPageRoute(builder: (_) => const ProductListPage());
      case AdminDashboardPage.routeName:
        return MaterialPageRoute(builder: (_) => const AdminDashboardPage());
      case LoginPage.routeName:
        return MaterialPageRoute(builder: (_) => const LoginPage());
      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Page not found')),
          ),
        );
    }
  }
}
