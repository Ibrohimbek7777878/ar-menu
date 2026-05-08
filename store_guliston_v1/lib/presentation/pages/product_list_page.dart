import 'package:flutter/material.dart';

class ProductListPage extends StatelessWidget {
  static const routeName = '/products';
  const ProductListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: 4,
        itemBuilder: (context, index) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              title: Text('Product ${index + 1}'),
              subtitle: const Text('Product skeleton placeholder'),
            ),
          );
        },
      ),
    );
  }
}
