import 'dart:math';
import 'package:flutter/foundation.dart';
import '../database/sqlite.dart';
import '../database/database_helper.dart';
import '../models/shop.dart';
import '../services/api_service.dart';

class ShopRepository {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final ApiService _apiService = ApiService();

  Future<List<Shop>> getAllShops() async {
    try {
      final remoteShops = await _apiService.getShops();
      if (remoteShops.isNotEmpty) {
        _cacheShops(remoteShops);
        return remoteShops;
      }
    } catch (e) {
      debugPrint('ShopRepository.getAllShops API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query('shops', orderBy: 'rating DESC');
      return List.generate(maps.length, (i) => Shop.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error getting shops from SQLite: $e');
      return [];
    }
  }

  Future<List<Shop>> getShopsByCity(String city) async {
    try {
      final remoteShops = await _apiService.getShops(city: city);
      if (remoteShops.isNotEmpty) {
        _cacheShops(remoteShops);
        return remoteShops;
      }
    } catch (e) {
      debugPrint('ShopRepository.getShopsByCity API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'shops',
        where: 'city = ?',
        whereArgs: [city],
        orderBy: 'rating DESC',
      );
      return List.generate(maps.length, (i) => Shop.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error getting shops by city from SQLite: $e');
      return [];
    }
  }

  Future<Shop?> getShopById(String id) async {
    try {
      final remoteShop = await _apiService.getShopDetail(id);
      if (remoteShop != null) return remoteShop;
    } catch (e) {
      debugPrint('ShopRepository.getShopById API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'shops',
        where: 'id = ?',
        whereArgs: [id],
      );
      if (maps.isNotEmpty) {
        return Shop.fromMap(maps.first);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting shop from SQLite: $e');
      return null;
    }
  }

  Future<List<Shop>> searchShops(String query) async {
    try {
      final remoteShops = await _apiService.getShops(search: query);
      if (remoteShops.isNotEmpty) return remoteShops;
    } catch (e) {
      debugPrint('ShopRepository.searchShops API fallback: $e');
    }

    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'shops',
        where: 'name LIKE ? OR address LIKE ?',
        whereArgs: ['%$query%', '%$query%'],
      );
      return List.generate(maps.length, (i) => Shop.fromMap(maps[i]));
    } catch (e) {
      debugPrint('Error searching shops from SQLite: $e');
      return [];
    }
  }

  Future<List<Shop>> getNearbyShops(double lat, double lng, double radiusKm) async {
    try {
      final allShops = await getAllShops();

      final nearby = allShops.where((shop) {
        final dx = (shop.latitude - lat) * 111; // km per degree latitude
        final dy = (shop.longitude - lng) * 111 * cos(lat * pi / 180);
        final distance = sqrt(dx * dx + dy * dy);
        return distance <= radiusKm;
      }).toList();

      return nearby;
    } catch (e) {
      debugPrint('Error getting nearby shops: $e');
      return [];
    }
  }

  void _cacheShops(List<Shop> shops) async {
    try {
      final db = await _dbHelper.database;
      for (final shop in shops) {
        await db.insert('shops', shop.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    } catch (_) {}
  }

  Future<void> createShop(Shop shop) async {
    try {
      final db = await _dbHelper.database;
      await db.insert('shops', shop.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (e) {
      debugPrint('Error creating shop: $e');
    }
  }

  Future<void> updateShop(Shop shop) async {
    try {
      final db = await _dbHelper.database;
      await db.update(
        'shops',
        shop.toMap(),
        where: 'id = ?',
        whereArgs: [shop.id],
      );
    } catch (e) {
      debugPrint('Error updating shop: $e');
    }
  }

  Future<void> deleteShop(String id) async {
    try {
      final db = await _dbHelper.database;
      await db.delete('shops', where: 'id = ?', whereArgs: [id]);
    } catch (e) {
      debugPrint('Error deleting shop: $e');
    }
  }
}
