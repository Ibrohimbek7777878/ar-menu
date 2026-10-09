import 'package:flutter/foundation.dart';
import '../database/sqlite.dart';
import 'package:uuid/uuid.dart';
import '../database/database_helper.dart';
import '../models/order.dart';

class OrderRepository {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  static const _uuid = Uuid();

  Future<void> createOrder(Order order) async {
    try {
      final db = await _dbHelper.database;
      await db.transaction((txn) async {
        await txn.insert('orders', order.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

        for (var item in order.items) {
          await txn.insert('order_items', {
            'id': _uuid.v4(),
            'order_id': order.id,
            'product_id': item.productId,
            'product_name': item.productName,
            'quantity': item.quantity,
            'unit_price': item.price,
            'total_price': item.totalPrice,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }
      });
    } catch (e) {
      debugPrint('Error creating order: $e');
      rethrow;
    }
  }

  Future<Order?> getOrderById(String id) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query('orders', where: 'id = ?', whereArgs: [id]);
      if (maps.isNotEmpty) {
        final order = Order.fromMap(maps.first);
        final itemMaps = await db.query('order_items', where: 'order_id = ?', whereArgs: [id]);
        final items = itemMaps.map((m) => _orderItemFromMap(m)).toList();
        return order.copyWith(items: items);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting order: $e');
      rethrow;
    }
  }

  Future<List<Order>> getOrdersByCustomerPhone(String phone) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'orders',
        where: 'customer_phone_1 = ? OR customer_phone_2 = ? OR customer_phone_3 = ?',
        whereArgs: [phone, phone, phone],
        orderBy: 'created_at DESC',
      );

      final orders = <Order>[];
      for (var map in maps) {
        final order = Order.fromMap(map);
        final itemMaps = await db.query('order_items', where: 'order_id = ?', whereArgs: [order.id]);
        final items = itemMaps.map((m) => _orderItemFromMap(m)).toList();
        orders.add(order.copyWith(items: items));
      }
      return orders;
    } catch (e) {
      debugPrint('Error getting orders by phone: $e');
      rethrow;
    }
  }

  Future<List<Order>> getOrdersByShop(String shopId) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'orders',
        where: 'shop_id = ?',
        whereArgs: [shopId],
        orderBy: 'created_at DESC',
      );

      final orders = <Order>[];
      for (var map in maps) {
        final order = Order.fromMap(map);
        final itemMaps = await db.query('order_items', where: 'order_id = ?', whereArgs: [order.id]);
        final items = itemMaps.map((m) => _orderItemFromMap(m)).toList();
        orders.add(order.copyWith(items: items));
      }
      return orders;
    } catch (e) {
      debugPrint('Error getting orders by shop: $e');
      rethrow;
    }
  }

  Future<List<Order>> getOrdersByStatus(OrderStatus status) async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query(
        'orders',
        where: 'status = ?',
        whereArgs: [status.value],
        orderBy: 'created_at DESC',
      );

      final orders = <Order>[];
      for (var map in maps) {
        final order = Order.fromMap(map);
        final itemMaps = await db.query('order_items', where: 'order_id = ?', whereArgs: [order.id]);
        final items = itemMaps.map((m) => _orderItemFromMap(m)).toList();
        orders.add(order.copyWith(items: items));
      }
      return orders;
    } catch (e) {
      debugPrint('Error getting orders by status: $e');
      rethrow;
    }
  }

  Future<List<Order>> getAllOrders() async {
    try {
      final db = await _dbHelper.database;
      final maps = await db.query('orders', orderBy: 'created_at DESC');

      final orders = <Order>[];
      for (var map in maps) {
        final order = Order.fromMap(map);
        final itemMaps = await db.query('order_items', where: 'order_id = ?', whereArgs: [order.id]);
        final items = itemMaps.map((m) => _orderItemFromMap(m)).toList();
        orders.add(order.copyWith(items: items));
      }
      return orders;
    } catch (e) {
      debugPrint('Error getting all orders: $e');
      rethrow;
    }
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    try {
      final db = await _dbHelper.database;
      await db.update(
        'orders',
        {
          'status': status.value,
          'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        },
        where: 'id = ?',
        whereArgs: [orderId],
      );
    } catch (e) {
      debugPrint('Error updating order status: $e');
      rethrow;
    }
  }

  Future<void> updateOrder(Order order) async {
    try {
      final db = await _dbHelper.database;
      await db.update(
        'orders',
        order.toMap(),
        where: 'id = ?',
        whereArgs: [order.id],
      );
    } catch (e) {
      debugPrint('Error updating order: $e');
      rethrow;
    }
  }

  Future<void> deleteOrder(String orderId) async {
    try {
      final db = await _dbHelper.database;
      await db.transaction((txn) async {
        await txn.delete('order_items', where: 'order_id = ?', whereArgs: [orderId]);
        await txn.delete('orders', where: 'id = ?', whereArgs: [orderId]);
      });
    } catch (e) {
      debugPrint('Error deleting order: $e');
      rethrow;
    }
  }

  Future<int> getTotalOrdersCount() async {
    try {
      final db = await _dbHelper.database;
      final result = await db.rawQuery('SELECT COUNT(*) as count FROM orders');
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (e) {
      debugPrint('Error getting total orders: $e');
      return 0;
    }
  }

  Future<double> getTotalRevenue() async {
    try {
      final db = await _dbHelper.database;
      final result = await db.rawQuery(
        'SELECT SUM(final_amount) as total FROM orders WHERE status IN (?, ?)',
        ['delivered', 'confirmed'],
      );
      if (result.isNotEmpty && result.first['total'] != null) {
        return (result.first['total'] as num).toDouble();
      }
      return 0.0;
    } catch (e) {
      debugPrint('Error getting total revenue: $e');
      return 0.0;
    }
  }

  OrderItem _orderItemFromMap(Map<String, dynamic> map) {
    return OrderItem(
      productId: map['product_id']?.toString() ?? '',
      productName: map['product_name']?.toString() ?? '',
      price: (map['unit_price'] as num?)?.toDouble() ?? 0.0,
      quantity: (map['quantity'] as num?)?.toInt() ?? 0,
      unit: map['unit']?.toString() ?? '',
    );
  }
}
