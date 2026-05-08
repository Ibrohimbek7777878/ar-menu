import 'package:flutter/material.dart';

class StoreListPage extends StatelessWidget {
  static const routeName = '/stores';
  const StoreListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stores'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: 3,
        itemBuilder: (context, index) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              title: Text('Store ${index + 1}'),
              subtitle: const Text('Store details placeholder'),
            ),
          );
        },
      ),
    );
  }
}
