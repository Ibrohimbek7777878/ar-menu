/// Order entity - domain layer

import 'package:equatable/equatable.dart';
import 'package:online_store_guliston/domain/entities/product.dart';

// Order item entity
class OrderItem extends Equatable {
  final String productId;
  final String name;
  final double price;
  final String unit;
  final int quantity;

  const OrderItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.unit,
    required this.quantity,
  });

  @override
  List<Object?> get props => [
        productId,
        name,
        price,
        unit,
        quantity,
      ];

  // Factory method for creating from map
  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] ?? '',
      name: json['name'] ?? '',
      price: json['price'] ?? 0.0,
      unit: json['unit'] ?? 'dona',
      quantity: json['quantity'] ?? 1,
    );
  }

  // Convert to map
  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'name': name,
      'price': price,
      'unit': unit,
      'quantity': quantity,
    };
  }
}

// Order entity
class Order extends Equatable {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String deliveryAddress;
  final String notes;
  final String shopId;
  final String shopName;
  final List<OrderItem> items;
  final double totalAmount;
  final String status; // 'new', 'accepted', 'in_transit', 'delivered'
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.deliveryAddress,
    required this.notes,
    required this.shopId,
    required this.shopName,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        customerId,
        customerName,
        customerPhone,
        deliveryAddress,
        notes,
        shopId,
        shopName,
        items,
        totalAmount,
        status,
        createdAt,
      ];

  // Factory method for creating from map
  factory Order.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['items'] as List<dynamic>;
    final items = itemsJson.map((item) => OrderItem.fromJson(item)).toList();

    return Order(
      id: json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      deliveryAddress: json['deliveryAddress'] ?? '',
      notes: json['notes'] ?? '',
      shopId: json['shopId'] ?? '',
      shopName: json['shopName'] ?? '',
      items: items,
      totalAmount: json['totalAmount'] ?? 0.0,
      status: json['status'] ?? 'new',
      createdAt: (json['createdAt'] as DateTime) ?? DateTime.now(),
    );
  }

  // Convert to map
  Map<String, dynamic> toJson() {
    final itemsJson = items.map((item) => item.toJson()).toList();

    return {
      'id': id,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'deliveryAddress': deliveryAddress,
      'notes': notes,
      'shopId': shopId,
      'shopName': shopName,
      'items': itemsJson,
      'totalAmount': totalAmount,
      'status': status,
      'createdAt': createdAt,
    };
  }
}