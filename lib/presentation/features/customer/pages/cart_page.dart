/// Cart page - presentation layer

import 'package:flutter/material.dart';
import 'package:online_store_guliston/core/providers/app_providers.dart';
import 'package:online_store_guliston/domain/repositories/shop_repository.dart';
import 'package:online_store_guliston/presentation/common_widgets/loading_widget.dart';
import 'package:online_store_guliston/presentation/common_widgets/error_widget.dart';
import 'package:provider/provider.dart';

// Cart page
class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Savat'),
        backgroundColor: Colors.blue,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.shopping_cart_outlined,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              'Savat bo\'sh',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Mahsulot qo\'shish uchun do\'konlarga o\'ting',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                // Navigate to home
              },
              child: const Text('Bosh sahifaga qaytish'),
            ),
          ],
        ),
      ),
    );
  }
}