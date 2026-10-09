import 'package:flutter/foundation.dart';
import '../database/sqlite.dart';
import '../database/database_helper.dart';
import '../models/shop.dart';
import '../models/shop_template.dart';
import 'api_service.dart';

class ShopService {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final ApiService _apiService = ApiService();

  // ─── Templates ──────────────────────────────────────────────────

  Future<List<ShopTemplate>> getTemplates({String? category}) async {
    try {
      final response = await _apiService.getTemplates(category: category);
      final templates = (response['templates'] as Map<String, dynamic>)
          .values
          .expand((list) => list as List)
          .map((t) => ShopTemplate.fromJson(t))
          .toList();
      return templates;
    } catch (e) {
      debugPrint('ShopService: getTemplates xatosi: $e');
      return [];
    }
  }

  Future<ShopTemplate?> getTemplateDetail(String slug) async {
    try {
      return await _apiService.getTemplateDetail(slug);
    } catch (e) {
      debugPrint('ShopService: getTemplateDetail xatosi: $e');
      return null;
    }
  }

  Future<bool> applyTemplate(
    String templateSlug, {
    Map<String, dynamic>? layout,
    bool saveAsTemplate = false,
    String? templateName,
    Map<String, dynamic>? colors,
  }) async {
    try {
      final response = await _apiService.applyTemplate(
        templateSlug,
        layout: layout,
        saveAsTemplate: saveAsTemplate,
        templateName: templateName,
        colors: colors,
      );
      return response['message'] != null;
    } catch (e) {
      debugPrint('ShopService: applyTemplate xatosi: $e');
      return false;
    }
  }

  Future<List<Shop>> getMyShops() async {
    try {
      return await _apiService.getMyShops();
    } catch (e) {
      debugPrint('ShopService: getMyShops xatosi: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> importProducts({required int targetShopId, required int sourceShopId, List<int>? productIds}) async {
    return await _apiService.importProducts(targetShopId: targetShopId, sourceShopId: sourceShopId, productIds: productIds);
  }

  Future<Map<String, dynamic>> setManualProducts({required int shopId, required int sectionIndex, required List<int> productIds}) async {
    return await _apiService.setManualProducts(shopId: shopId, sectionIndex: sectionIndex, productIds: productIds);
  }

  Future<List<Shop>> getShops({String? city, String? storeType}) async {
    try {
      final remoteShops = await _apiService.getShops(city: city, storeType: storeType);
      if (remoteShops.isNotEmpty) {
        _cacheShops(remoteShops);
        return remoteShops;
      }
    } catch (e) {
      debugPrint('ShopService: Backend API xatosi, lokal SQLite ga o\'tilmoqda: $e');
    }

    final db = await _dbHelper.database;
    final maps = city != null && city.isNotEmpty
        ? await db.query('shops', where: 'city = ?', whereArgs: [city], orderBy: 'rating DESC')
        : await db.query('shops', orderBy: 'rating DESC');
    return maps.map((map) => Shop.fromMap(map)).toList();
  }

  Future<Shop?> getShopById(String id) async {
    try {
      final remoteShop = await _apiService.getShopDetail(id);
      if (remoteShop != null) return remoteShop;
    } catch (e) {
      debugPrint('ShopService: getShopById API xatosi: $e');
    }

    final db = await _dbHelper.database;
    final maps = await db.query('shops', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return Shop.fromMap(maps.first);
    return null;
  }

  void _cacheShops(List<Shop> shops) async {
    try {
      final db = await _dbHelper.database;
      for (final shop in shops) {
        await db.insert('shops', shop.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    } catch (e) {
      debugPrint('ShopService: _cacheShops xatosi: $e');
    }
  }

  Future<Shop?> createShop(Shop shop) async {
    final db = await _dbHelper.database;
    await db.insert('shops', shop.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    return shop;
  }

  Future<Shop?> updateShop(String id, Shop shop) async {
    final db = await _dbHelper.database;
    await db.update('shops', shop.toMap(), where: 'id = ?', whereArgs: [id]);
    return shop;
  }

  Future<bool> deleteShop(String id) async {
    final db = await _dbHelper.database;
    final deleted = await db.delete('shops', where: 'id = ?', whereArgs: [id]);
    return deleted > 0;
  }
}