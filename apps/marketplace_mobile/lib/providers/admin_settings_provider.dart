import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../database/sqlite.dart';
import '../database/database_helper.dart';

class AdminSettingsProvider with ChangeNotifier {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  Map<String, String> _settings = {};
  Map<String, String> _texts = {};

  Map<String, String> get settings => _settings;
  Map<String, String> get texts => _texts;

  // Lazy initialization — no constructor side effects to avoid
  // "setState() or markNeedsBuild() called during build" errors.
  bool _initialized = false;

  AdminSettingsProvider() {
    Future.microtask(ensureInitialized);
  }

  Future<void> ensureInitialized() async {
    if (_initialized) return;
    _initialized = true;
    await _loadSettings();
    await _loadTexts();
  }

  Future<void> _loadSettings() async {
    final db = await _dbHelper.database;
    final results = await db.query('app_settings');
    _settings = {};
    for (var row in results) {
      _settings[row['key'] as String] = row['value'] as String;
    }
  }

  Future<void> _loadTexts() async {
    final db = await _dbHelper.database;
    final results = await db.query('app_texts');
    _texts = {};
    for (var row in results) {
      _texts[row['key'] as String] = row['value'] as String;
    }
  }

  Future<void> updateSetting(String key, String value) async {
    final db = await _dbHelper.database;
    await db.insert(
      'app_settings',
      {'key': key, 'value': value, 'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await _loadSettings();
    if (_initialized) Future.microtask(() => notifyListeners());
  }

  Future<void> updateText(String key, String value) async {
    final db = await _dbHelper.database;
    await db.insert(
      'app_texts',
      {'key': key, 'value': value, 'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await _loadTexts();
    if (_initialized) Future.microtask(() => notifyListeners());
  }

  String getSetting(String key) {
    return _settings[key] ?? '';
  }

  String getText(String key) {
    return _texts[key] ?? key;
  }

  Future<void> cleanupOldData() async {
    await _dbHelper.cleanupOldData();
  }

  Future<String> exportBackup() async {
    final db = await _dbHelper.database;
    final backup = <String, dynamic>{
      'categories': await db.query('categories'),
      'shops': await db.query('shops'),
      'products': await db.query('products'),
      'orders': await db.query('orders'),
      'order_items': await db.query('order_items'),
      'couriers': await db.query('couriers'),
      'app_settings': await db.query('app_settings'),
      'app_texts': await db.query('app_texts'),
      'admins': await db.query('admins'),
    };

    final payload = jsonEncode({
      'version': 1,
      'created_at': DateTime.now().toIso8601String(),
      'data': backup,
    });

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('store_guliston_backup_v1', payload);
    return payload;
  }

  Future<bool> restoreBackup() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = prefs.getString('store_guliston_backup_v1');
    if (payload == null || payload.isEmpty) return false;

    final decoded = jsonDecode(payload) as Map<String, dynamic>;
    final data = decoded['data'] as Map<String, dynamic>;
    final db = await _dbHelper.database;

    await db.transaction((txn) async {
      await txn.delete('order_items');
      await txn.delete('orders');
      await txn.delete('products');
      await txn.delete('shops');
      await txn.delete('categories');
      await txn.delete('couriers');
      await txn.delete('app_settings');
      await txn.delete('app_texts');
      await txn.delete('admins');

      for (final row in (data['categories'] as List<dynamic>)) {
        await txn.insert('categories', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['shops'] as List<dynamic>)) {
        await txn.insert('shops', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['products'] as List<dynamic>)) {
        await txn.insert('products', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['orders'] as List<dynamic>)) {
        await txn.insert('orders', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['order_items'] as List<dynamic>)) {
        await txn.insert('order_items', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['couriers'] as List<dynamic>)) {
        await txn.insert('couriers', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['app_settings'] as List<dynamic>)) {
        await txn.insert('app_settings', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['app_texts'] as List<dynamic>)) {
        await txn.insert('app_texts', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final row in (data['admins'] as List<dynamic>)) {
        await txn.insert('admins', Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });

    await _loadSettings();
    await _loadTexts();
    notifyListeners();
    return true;
  }

  Future<void> logout() async {
    // Clear any session data if needed
    // For now, just navigate back
  }
}
