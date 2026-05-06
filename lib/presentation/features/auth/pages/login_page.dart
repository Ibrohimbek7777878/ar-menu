/// Auth login page - presentation layer

import 'package:flutter/material.dart';
import 'package:online_store_guliston/core/providers/app_providers.dart';
import 'package:online_store_guliston/domain/repositories/auth_repository.dart';
import 'package:online_store_guliston/presentation/common_widgets/loading_widget.dart';
import 'package:online_store_guliston/presentation/common_widgets/error_widget.dart';
import 'package:online_store_guliston/presentation/features/auth/providers/login_provider.dart';
import 'package:provider/provider.dart';

// Auth login page
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authRepository = Provider.of<AuthRepository>(context);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo placeholder
            const Icon(
              Icons.admin_panel_settings,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 32),
            const Text(
              'Admin Paneliga Kirish',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 48),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email manzilingiz',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Emailni kiriting';
                }
                if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(value)) {
                  return 'To\'g\'ri email formatda kiriting';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Parolingiz',
                prefixIcon: Icon(Icons.lock),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Parolni kiriting';
                }
                if (value.length < 6) {
                  return 'Parol kamida 6 belgidan iborat bo\'lishi kerak';
                }
                return null;
              },
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () async {
                // In real app, this would use the repository
                // For now, just navigate to dashboard
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/admin/dashboard',
                  (route) => false,
                );
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 48,
                  vertical: 16,
                ),
                textStyle: const TextStyle(fontSize: 18),
              ),
              child: const Text('Kirish'),
            ),
          ],
        ),
      ),
    );
  }
}