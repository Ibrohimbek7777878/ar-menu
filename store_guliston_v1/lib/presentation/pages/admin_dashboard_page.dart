import 'package:flutter/material.dart';

class AdminDashboardPage extends StatelessWidget {
  static const routeName = '/admin';
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Admin skeleton placeholders', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Text('- Store management placeholder'),
            Text('- Product management placeholder'),
            Text('- Order management placeholder'),
            Text('- Category management placeholder'),
          ],
        ),
      ),
    );
  }
}
