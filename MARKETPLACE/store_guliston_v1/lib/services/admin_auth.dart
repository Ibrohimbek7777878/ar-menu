import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../database/database_helper.dart';

class AdminAuth {
  static const String _sessionKey = 'admin_session';
  static const String _sessionExpiryKey = 'admin_session_expiry';
  Future<bool> login(String email, String password) async {
    final db = await DatabaseHelper().database;
    final bytes = utf8.encode(password);
    final hash = sha256.convert(bytes).toString();

    final result = await db.query(
      'admins',
      where: 'email = ? AND password_hash = ?',
      whereArgs: [email, hash],
    );

    if (result.isNotEmpty) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_sessionKey, email);
      await prefs.setInt(
        _sessionExpiryKey,
        DateTime.now().millisecondsSinceEpoch + (24 * 60 * 60 * 1000),
      );
      return true;
    }
    return false;
  }

  /// Yangi admin ro'yxatdan o'tkazish (faqat super_admin qo'sha oladi)
  Future<bool> register(String email, String password, String fullName, {String role = 'admin'}) async {
    final db = await DatabaseHelper().database;
    final bytes = utf8.encode(password);
    final hash = sha256.convert(bytes).toString();

    try {
      await db.insert('admins', {
        'id': 'admin_${DateTime.now().millisecondsSinceEpoch}',
        'email': email,
        'password_hash': hash,
        'full_name': fullName,
        'role': role,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_sessionKey);
    final expiry = prefs.getInt(_sessionExpiryKey);
    if (email == null || expiry == null) return false;
    if (DateTime.now().millisecondsSinceEpoch > expiry) {
      await logout();
      return false;
    }
    return true;
  }

  Future<void> redirectToLoginIfNeeded(BuildContext context) async {
    if (!await isLoggedIn()) {
      GoRouter.of(context).go('/admin/login');
    }
  }

  Future<void> redirectToDashboardIfLoggedIn(BuildContext context) async {
    if (await isLoggedIn()) {
      GoRouter.of(context).go('/admin/dashboard');
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(_sessionExpiryKey);
  }

  Future<String?> getCurrentAdminEmail() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_sessionKey);
    if (email == null) return null;
    if (!await isLoggedIn()) return null;
    return email;
  }

  /// Admin rolini olish
  Future<String> getCurrentAdminRole() async {
    final email = await getCurrentAdminEmail();
    if (email == null) return 'guest';
    final db = await DatabaseHelper().database;
    final result = await db.query(
      'admins',
      columns: ['role'],
      where: 'email = ?',
      whereArgs: [email],
    );
    if (result.isEmpty) return 'guest';
    return result.first['role'] as String? ?? 'super_admin';
  }

  /// Role tekshirish
  Future<bool> hasRole(String requiredRole) async {
    final role = await getCurrentAdminRole();
    if (role == 'super_admin') return true; // super_admin hamma narsaga ruxsatli
    return role == requiredRole;
  }

  Future<bool> updatePassword(String currentPassword, String newPassword) async {
    final email = await getCurrentAdminEmail();
    if (email == null) return false;

    final db = await DatabaseHelper().database;
    final currentHash = sha256.convert(utf8.encode(currentPassword)).toString();

    final result = await db.query(
      'admins',
      where: 'email = ? AND password_hash = ?',
      whereArgs: [email, currentHash],
    );

    if (result.isEmpty) return false;

    final newHash = sha256.convert(utf8.encode(newPassword)).toString();
    await db.update(
      'admins',
      {'password_hash': newHash},
      where: 'email = ?',
      whereArgs: [email],
    );
    return true;
  }
}
