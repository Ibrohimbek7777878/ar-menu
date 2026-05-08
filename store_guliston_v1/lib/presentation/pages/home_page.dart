import 'package:flutter/material.dart';
import 'package:store_guliston_v1/presentation/pages/admin_dashboard_page.dart';
import 'package:store_guliston_v1/presentation/pages/login_page.dart';
import 'package:store_guliston_v1/presentation/pages/product_list_page.dart';
import 'package:store_guliston_v1/presentation/pages/store_list_page.dart';

class HomePage extends StatelessWidget {
  static const routeName = '/home';
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Guliston V1'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Skeleton Stage',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'This app shows the initial structure and routing for the first stage.',
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, StoreListPage.routeName);
              },
              child: const Text('Stores'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, ProductListPage.routeName);
              },
              child: const Text('Products'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, AdminDashboardPage.routeName);
              },
              child: const Text('Admin Dashboard'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, LoginPage.routeName);
              },
              child: const Text('Login'),
            ),
          ],
        ),
      ),
    );
  }
}
