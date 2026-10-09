import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/admin_auth.dart';

class AdminRouteGuard {
  static Future<String?> redirect(BuildContext context, GoRouterState state) async {
    final auth = AdminAuth();
    final isAuth = await auth.isLoggedIn();
    if (!isAuth) {
      // ignore: use_build_context_synchronously
      if (context.mounted) {
        return '/admin/login';
      }
    }
    return null;
  }

  /// Role tekshiruvi — kelajak uchun tayyor
  static Future<bool> hasRole(String requiredRole) async {
    final auth = AdminAuth();
    final email = await auth.getCurrentAdminEmail();
    if (email == null) return false;
    // Hozircha barcha adminlarga ruxsat
    return true;
  }
}
