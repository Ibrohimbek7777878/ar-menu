import 'package:flutter/foundation.dart';
import '../database/sqlite.dart';
import '../database/database_helper.dart';
import '../models/product.dart';
import '../services/api_service.dart';

class ProductRepository {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final ApiService _apiService = ApiService();

  Future<List<Product>> getAllProducts() async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query('products', orderBy: 'name');
      return List.generate(maps.length, (i) => Product.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error getting products from SQLite: $e');
      return [];
    }
  }

  Future<List<Product>> getProductsByShop(String shopId) async {
    try {
      final remote = await _apiService.getProducts(shopId);
      if (remote.isNotEmpty) {
        _cacheProducts(remote);
        return remote;
      }
    } catch (e) {
      debugPrint('ProductRepository.getProductsByShop API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'products',
        where: 'shop_id = ? AND is_available = 1',
        whereArgs: [shopId],
        orderBy: 'name',
      );
      return List.generate(maps.length, (i) => Product.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error getting products by shop from SQLite: $e');
      return [];
    }
  }

  Future<List<Product>> getProductsByCategory(String categoryId) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'products',
        where: 'category_id = ? AND is_available = 1',
        whereArgs: [categoryId],
        orderBy: 'name',
      );
      return List.generate(maps.length, (i) => Product.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error getting products by category from SQLite: $e');
      return [];
    }
  }

  Future<Product?> getProductById(String id) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'products',
        where: 'id = ?',
        whereArgs: [id],
      );
      if (maps.isNotEmpty) {
        return Product.fromMap(maps.first);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting product from SQLite: $e');
      return null;
    }
  }

  Future<List<Product>> searchProducts(String query) async {
    try {
      final remote = await _apiService.searchProducts(query);
      if (remote.isNotEmpty) return remote;
    } catch (e) {
      debugPrint('ProductRepository.searchProducts API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'products',
        where: 'name LIKE ? OR description LIKE ?',
        whereArgs: ['%$query%', '%$query%'],
        orderBy: 'name',
      );
      return List.generate(maps.length, (i) => Product.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error searching products from SQLite: $e');
      return [];
    }
  }

  void _cacheProducts(List<Product> products) async {
    try {
      final db = await _dbHelper.database;
      for (final p in products) {
        await db.insert('products', p.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    } catch (_) {}
  }

  Future<void> createProduct(Product product) async {
    try {
      final db = await _dbHelper.database;
      await db.insert('products', product.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (e) {
      debugPrint('Error creating product: $e');
    }
  }

  Future<void> updateProduct(Product product) async {
    try {
      final db = await _dbHelper.database;
      await db.update(
        'products',
        product.toMap(),
        where: 'id = ?',
        whereArgs: [product.id],
      );
    } catch (e) {
      debugPrint('Error updating product: $e');
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      final db = await _dbHelper.database;
      await db.delete('products', where: 'id = ?', whereArgs: [id]);
    } catch (e) {
      debugPrint('Error deleting product: $e');
    }
  }
}
