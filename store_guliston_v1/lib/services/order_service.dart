import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/order.dart';
import 'auth_service.dart';

class OrderService {
  static const String _baseUrl = 'https://api.storeguliston.com'; // Replace with actual API
  final AuthService _authService = AuthService();

  Future<List<Order>> getOrders() async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        return data.map((order) => Order.fromJson(order)).toList();
      }
    } catch (e) {
      print('Get orders error: $e');
    }
    return []; // Return empty list if API fails
  }

  Future<Order?> getOrderById(String id) async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/orders/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Order.fromJson(data);
      }
    } catch (e) {
      print('Get order error: $e');
    }
    return null;
  }

  Future<Order?> createOrder(Order order) async {
    try {
      final token = await _authService.getToken();
      final response = await http.post(
        Uri.parse('$_baseUrl/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(order.toJson()),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Order.fromJson(data);
      }
    } catch (e) {
      print('Create order error: $e');
    }
    return null;
  }

  Future<Order?> updateOrderStatus(String id, OrderStatus status) async {
    try {
      final token = await _authService.getToken();
      final response = await http.patch(
        Uri.parse('$_baseUrl/orders/$id/status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'status': status.toString().split('.').last}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Order.fromJson(data);
      }
    } catch (e) {
      print('Update order status error: $e');
    }
    return null;
  }

  Future<List<Order>> getOrdersByStatus(OrderStatus status) async {
    final allOrders = await getOrders();
    return allOrders.where((order) => order.status == status).toList();
  }

  Future<List<Order>> getOrdersByDateRange(DateTime start, DateTime end) async {
    final allOrders = await getOrders();
    return allOrders.where((order) =>
        order.createdAt.isAfter(start) && order.createdAt.isBefore(end)).toList();
  }

  Future<double> getTotalRevenue() async {
    final orders = await getOrders();
    return orders
        .where((order) => order.status == OrderStatus.delivered)
        .fold(0.0, (sum, order) => (sum as double) + order.totalAmount);
  }

  Future<int> getOrderCount() async {
    final orders = await getOrders();
    return orders.length;
  }

  // Demo order creation for testing
  Future<Order?> createDemoOrder({
    required String customerName,
    required List<String> customerPhones,
    required String deliveryAddress,
    required List<OrderItem> items,
    required double totalAmount,
  }) async {
    final order = Order(
      id: 'order_${DateTime.now().millisecondsSinceEpoch}',
      customerName: customerName,
      customerPhones: customerPhones,
      deliveryAddress: deliveryAddress,
      items: items,
      totalAmount: totalAmount,
      status: OrderStatus.pending,
      createdAt: DateTime.now(),
      estimatedDeliveryTime: DateTime.now().add(Duration(hours: 1)),
    );

    // For demo, just return the order without API call
    return order;
  }
}
