import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../database/database_helper.dart';
import '../models/order.dart';
import '../repositories/order_repository.dart';
import 'telegram_service.dart';
import 'api_service.dart';

class OrderService {
  final OrderRepository _orderRepository = OrderRepository();
  final TelegramService _telegramService = TelegramService();
  final ApiService _apiService = ApiService();
  static const int maxOrdersInWindow = 3;
  static const int windowMinutes = 5;
  static const double minOrderAmount = 20000;
  static const double freeDeliveryThreshold = 50000;
  static const double deliveryFee = 5000;

  Future<List<Order>> getOrders({String? status}) async {
    if (status != null && status.isNotEmpty) {
      final statusEnum = _orderStatusFromString(status);
      return _orderRepository.getOrdersByStatus(statusEnum);
    }
    return _orderRepository.getAllOrders();
  }

  Future<Order?> getOrderById(String id) async {
    return _orderRepository.getOrderById(id);
  }

  Future<Order?> createOrder(Order order) async {
    await _orderRepository.createOrder(order);
    return order;
  }

  OrderStatus _orderStatusFromString(String status) {
    switch (status) {
      case 'accepted':
        return OrderStatus.confirmed;
      case 'out_for_delivery':
        return OrderStatus.outForDelivery;
      default:
        return OrderStatus.values.firstWhere(
          (e) => e.value == status,
          orElse: () => OrderStatus.pending,
        );
    }
  }

  Future<Order?> updateOrderStatus(String id, String status) async {
    final statusEnum = _orderStatusFromString(status);
    await _orderRepository.updateOrderStatus(id, statusEnum);
    return await getOrderById(id);
  }

  Future<List<Order>> getOrdersByPhone(String phone) async {
    return _orderRepository.getOrdersByCustomerPhone(phone);
  }

  Future<double> getTotalRevenue() async {
    return await _orderRepository.getTotalRevenue();
  }

  Future<int> getOrderCount() async {
    return await _orderRepository.getTotalOrdersCount();
  }

  /// Spam prevention: 5 daqiqada 3 ta buyurtma
  Future<bool> canCreateOrder(String phone) async {
    final prefs = await SharedPreferences.getInstance();
    final countKey = 'order_count_${phone.trim()}';
    final timeKey = 'order_time_${phone.trim()}';

    final count = prefs.getInt(countKey) ?? 0;
    final lastTime = prefs.getInt(timeKey) ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;

    if (now - lastTime > windowMinutes * 60 * 1000) {
      // 5 daqiqa o'tgan bo'lsa, reset
      await prefs.setInt(countKey, 1);
      await prefs.setInt(timeKey, now);
      return true;
    }

    if (count >= maxOrdersInWindow) {
      return false;
    }

    await prefs.setInt(countKey, count + 1);
    await prefs.setInt(timeKey, now);
    return true;
  }

  Future<void> markOrderCreated(List<String> phones) async {
    // Already handled in canCreateOrder, no need for extra tracking
  }

  /// OSG-YYYYMMDD-NNNN formatida buyurtma raqami
  Future<String> generateOrderNumber() async {
    final db = await DatabaseHelper().database;
    final today = DateTime.now();
    final dateStr = '${today.year}${today.month.toString().padLeft(2, '0')}${today.day.toString().padLeft(2, '0')}';

    final result = await db.rawQuery('''
      SELECT COUNT(*) as count FROM orders 
      WHERE order_number LIKE 'OSG-$dateStr-%'
    ''');

    final count = (result.first['count'] as int) + 1;
    return 'OSG-$dateStr-${count.toString().padLeft(4, '0')}';
  }

  Future<Order?> createOrderFromForm({
    required String customerName,
    required List<String> customerPhones,
    required String deliveryAddress,
    required List<OrderItem> items,
    required double totalAmount,
    String? shopId,
    String? shopName,
    String? notes,
    bool isPickup = false,
    double? deliveryLat,
    double? deliveryLng,
    String? couponCode,
    double bonusUsed = 0,
  }) async {
    if (customerPhones.isEmpty) {
      throw Exception('Telefon raqam kiritilmadi.');
    }

    // Minimal buyurtma summasi tekshiruvi
    if (totalAmount < minOrderAmount) {
      throw Exception('Minimal buyurtma summasi ${minOrderAmount.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ') } so\'m.');
    }

    final primaryPhone = customerPhones.first.trim();
    if (!await canCreateOrder(primaryPhone)) {
      throw Exception('Siz $windowMinutes daqiqa ichida $maxOrdersInWindow dan ortiq buyurtma berdingiz. Iltimos, birozdan keyin qayta urinib ko\'ring.');
    }

    final createdAt = DateTime.now();
    final orderNumber = await generateOrderNumber();

    // Kupon chegirmasini hisoblash
    double discountAmount = 0.0;
    String? validCouponCode;
    if (couponCode != null && couponCode.trim().isNotEmpty) {
      try {
        final couponResult = await _apiService.validateCoupon(couponCode.trim(), totalAmount);
        if (couponResult['valid'] == true) {
          discountAmount = (couponResult['discount_amount'] as num).toDouble();
          validCouponCode = couponCode.trim().toUpperCase();
        }
      } catch (_) {
        // Kupon xatosi buyurtmani to'xtatmaydi, shunchaki chegirmasiz davom etadi
      }
    }

    // Yetkazish narxini hisoblash (masofaga qarab)
    double fee;
    if (totalAmount >= freeDeliveryThreshold) {
      fee = 0.0; // Bepul yetkazish
    } else if (deliveryLat != null && deliveryLng != null) {
      fee = deliveryFee;
    } else {
      fee = deliveryFee;
    }
    var finalAmount = (totalAmount - discountAmount) + fee;
    // Bonusni ayirish (S5-2) — faqat 0 dan katta bo'lsa
    double bonusToUse = bonusUsed;
    if (bonusToUse > 0) {
      bonusToUse = bonusToUse.clamp(0, finalAmount);
      finalAmount = (finalAmount - bonusToUse).clamp(0, double.infinity);
    }

    final order = Order(
      id: const Uuid().v4(),
      orderNumber: orderNumber,
      customerName: customerName,
      customerPhones: customerPhones,
      shopId: shopId,
      shopName: shopName,
      items: items,
      totalAmount: totalAmount,
      deliveryFee: fee,
      finalAmount: finalAmount,
      status: OrderStatus.pending,
      createdAt: createdAt,
      deliveryAddress: deliveryAddress,
      notes: notes,
      isPickup: isPickup,
      deliveryLat: deliveryLat,
      deliveryLng: deliveryLng,
      estimatedDeliveryTime: createdAt.add(const Duration(minutes: 45)),
      couponCode: validCouponCode,
      discountAmount: discountAmount,
    );

    // 1. Django REST Backend API ga yuborish
    try {
      final remoteOrder = await _apiService.createOrder({
        'name': customerName,
        'phone': customerPhones.first,
        'address': deliveryAddress,
        'notes': notes ?? '',
        'lat': deliveryLat,
        'lng': deliveryLng,
        'is_pickup': isPickup,
        'coupon_code': validCouponCode ?? '',
        'bonus_used': bonusToUse,
        'items': items.map((i) => {
          'product_id': int.tryParse(i.productId) ?? 1,
          'quantity': i.quantity,
        }).toList(),
      });
      if (remoteOrder != null) {
        await _orderRepository.createOrder(remoteOrder);
        return remoteOrder;
      }
    } catch (e) {
      debugPrint('OrderService: Backend API createOrder fallback: $e');
    }

    // 2. Offline / Local SQLite fallback
    await _orderRepository.createOrder(order);

    // Telegram xabar yuborish (xato buyurtmani to'xtatmasin)
    try {
      await _telegramService.sendOrderNotification(
        orderNumber: orderNumber,
        customerName: customerName,
        customerPhone: customerPhones.first,
        shopName: shopName ?? '',
        totalAmount: finalAmount,
        items: items.map((item) => {
          'name': item.productName,
          'quantity': item.quantity,
          'price': item.price,
        }).toList(),
      );
    } catch (e) {
      debugPrint('Telegram xabar yuborishda xato: $e');
    }

    return order;
  }

  bool hasFreeDelivery(double totalAmount) {
    return totalAmount >= freeDeliveryThreshold;
  }

  double getRemainingForFreeDelivery(double totalAmount) {
    if (totalAmount >= freeDeliveryThreshold) return 0;
    return freeDeliveryThreshold - totalAmount;
  }

  /// Masofaga qarab yetkazish narxini hisoblash
  /// Returns: narx (so'm), yoki -1 = manual tasdiqlash kerak
  static double calculateDeliveryFee(double distanceKm) {
    if (distanceKm <= 2) return 5000;
    if (distanceKm <= 5) return 10000;
    return -1; // Manual confirmation kerak
  }

  /// Haversine formula — ikki nuqta orasidagi masofa (km)
  static double? calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    const double earthRadius = 6371;
    final double dLat = (lat2 - lat1) * pi / 180;
    final double dLng = (lng2 - lng1) * pi / 180;
    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) * cos(lat2 * pi / 180) *
        sin(dLng / 2) * sin(dLng / 2);
    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }
}