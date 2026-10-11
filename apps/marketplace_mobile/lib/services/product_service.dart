import 'package:flutter/foundation.dart';
import '../database/sqlite.dart';
import '../database/database_helper.dart';
import '../models/product.dart';
import 'api_service.dart';

class ProductService {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final ApiService _apiService = ApiService();

  Future<List<Product>> getProducts({String? shopId}) async {
    if (shopId != null && shopId.isNotEmpty) {
      try {
        final remote = await _apiService.getProducts(shopId);
        if (remote.isNotEmpty) {
          _cacheProducts(remote);
          return remote;
        }
      } catch (e) {
        debugPrint('ProductService: Backend API fallback: $e');
      }
    }

    final db = await _dbHelper.database;
    final where = shopId != null ? 'shop_id = ?' : null;
    final whereArgs = shopId != null ? [shopId] : null;
    final maps = await db.query('products', where: where, whereArgs: whereArgs);
    return maps.map((map) => Product.fromMap(map)).toList();
  }

  Future<List<Product>> getAllProducts({String? categoryId, String? search}) async {
    try {
      final remote = await _apiService.getAllProducts(categoryId: categoryId, search: search);
      if (remote.isNotEmpty) {
        _cacheProducts(remote);
        return remote;
      }
    } catch (e) {
      debugPrint('ProductService: Backend API fallback: $e');
    }

    final db = await _dbHelper.database;
    final maps = await db.query('products');
    return maps.map((map) => Product.fromMap(map)).toList();
  }

  Future<Product?> getProductById(String id) async {
    final db = await _dbHelper.database;
    final maps = await db.query('products', where: 'id = ?', whereArgs: [id]);
    if (maps.isNotEmpty) return Product.fromMap(maps.first);
    return null;
  }

  void _cacheProducts(List<Product> products) async {
    try {
      final db = await _dbHelper.database;
      for (final p in products) {
        await db.insert('products', p.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    } catch (_) {}
  }

  Future<Product?> createProduct(Product product) async {
    final db = await _dbHelper.database;
    await db.insert('products', product.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    return product;
  }

  Future<Product?> updateProduct(String id, Product product) async {
    final db = await _dbHelper.database;
    await db.update('products', product.toMap(), where: 'id = ?', whereArgs: [id]);
    return product;
  }

  Future<bool> deleteProduct(String id) async {
    final db = await _dbHelper.database;
    final deleted = await db.delete('products', where: 'id = ?', whereArgs: [id]);
    return deleted > 0;
  }
}