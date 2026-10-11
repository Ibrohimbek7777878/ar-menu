import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/order_service.dart';

class OrderProvider with ChangeNotifier {
  final OrderService _orderService = OrderService();

  List<Order> _orders = [];
  List<Order> _filteredOrders = [];
  bool _isLoading = false;
  String? _error;
  OrderStatus? _selectedStatus;

  List<Order> get orders => _filteredOrders;
  bool get isLoading => _isLoading;
  String? get error => _error;
  OrderStatus? get selectedStatus => _selectedStatus;

  Future<void> loadOrders() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _orders = await _orderService.getOrders();
      _applyFilters();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Order?> getOrderById(String id) async {
    try {
      return await _orderService.getOrderById(id);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<Order?> createOrder(Order order) async {
    try {
      final newOrder = await _orderService.createOrder(order);
      if (newOrder != null) {
        _orders.add(newOrder);
        _applyFilters();
        notifyListeners();
        return newOrder;
      }
      return null;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> updateOrderStatus(String id, OrderStatus status) async {
    try {
      final updatedOrder = await _orderService.updateOrderStatus(id, status.value);
      if (updatedOrder != null) {
        final index = _orders.indexWhere((order) => order.id == id);
        if (index != -1) {
          _orders[index] = updatedOrder;
          _applyFilters();
          notifyListeners();
          return true;
        }
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void filterByStatus(OrderStatus? status) {
    _selectedStatus = status;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void _applyFilters() {
    if (_selectedStatus == null) {
      _filteredOrders = List.from(_orders);
    } else {
      _filteredOrders = _orders.where((order) => order.status == _selectedStatus).toList();
    }
    // Sort by creation date (newest first)
    _filteredOrders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  List<Order> getOrdersByStatus(OrderStatus status) {
    return _orders.where((order) => order.status == status).toList();
  }

  List<Order> getRecentOrders(int limit) {
    final sortedOrders = List<Order>.from(_orders);
    sortedOrders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return sortedOrders.take(limit).toList();
  }

  Future<double> getTotalRevenue() async {
    return await _orderService.getTotalRevenue();
  }

  Future<int> getOrderCount() async {
    return await _orderService.getOrderCount();
  }

  Map<OrderStatus, int> getOrderStatusCounts() {
    final counts = <OrderStatus, int>{};
    for (final order in _orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }

  void clearFilters() {
    _selectedStatus = null;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void clearError() {
    _error = null;
    Future.microtask(() => notifyListeners());
  }

  // Create order from checkout form
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
  }) async {
    try {
      final order = await _orderService.createOrderFromForm(
        customerName: customerName,
        customerPhones: customerPhones,
        deliveryAddress: deliveryAddress,
        items: items,
        totalAmount: totalAmount,
        shopId: shopId,
        shopName: shopName,
        notes: notes,
        isPickup: isPickup,
        deliveryLat: deliveryLat,
        deliveryLng: deliveryLng,
        couponCode: couponCode,
      );

      if (order != null) {
        _orders.add(order);
        _applyFilters();
        notifyListeners();
        return order;
      }
      return null;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }
}