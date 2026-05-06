/// Customer splash page - presentation layer

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:online_store_guliston/presentation/features/customer/pages/home_page.dart';

// Customer splash page
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _checkPreviousSelection();
  }

  Future<void> _checkPreviousSelection() async {
    final prefs = await SharedPreferences.getInstance();
    final city = prefs.getString('selectedCity');
    if (city != null) {
      // Navigate to home screen with selected city
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => HomePage(selectedCity: city),
        ),
      );
    }
  }

  Future<void> _selectCity(String city) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selectedCity', city);
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => HomePage(selectedCity: city),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo placeholder
            const Icon(
              Icons.shopping_cart_outlined,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 32),
            const Text(
              'Online Store Guliston',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 64),
            // City selection buttons
            ElevatedButton(
              onPressed: () => _selectCity('Yangi Yer'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 48,
                  vertical: 16,
                ),
                textStyle: const TextStyle(fontSize: 18),
              ),
              child: const Text('Yangi Yer'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _selectCity('Guliston'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 48,
                  vertical: 16,
                ),
                textStyle: const TextStyle(fontSize: 18),
              ),
              child: const Text('Guliston'),
            ),
          ],
        ),
      ),
    );
  }
}