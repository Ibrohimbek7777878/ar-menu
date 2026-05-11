enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  outForDelivery,
  delivered,
  cancelled,
}

class Order {
  final String id;
  final String? customerName;
  final List<String> customerPhones; // Changed to List<String>
  final String? shopId;
  final String? shopName;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? deliveryAddress;
  final String? notes;
  final DateTime? estimatedDeliveryTime;

  Order({
    required this.id,
    this.customerName,
    this.customerPhones = const [],
    this.shopId,
    this.shopName,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.deliveryAddress,
    this.notes,
    this.estimatedDeliveryTime,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    // Handle customerPhone as either String or List
    List<String> phones = [];
    if (json['customerPhone'] != null) {
      if (json['customerPhone'] is String) {
        phones = [json['customerPhone']];
      } else if (json['customerPhone'] is List) {
        phones = (json['customerPhone'] as List).map((e) => e.toString()).toList();
      }
    }
    // Also check for customerPhones field
    if (json['customerPhones'] != null) {
      phones = (json['customerPhones'] as List).map((e) => e.toString()).toList();
    }

    return Order(
      id: json['id'] ?? '',
      customerName: json['customerName'],
      customerPhones: phones,
      shopId: json['shopId'],
      shopName: json['shopName'],
      items: (json['items'] as List?)
              ?.map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] != null
          ? OrderStatus.values[json['status'] as int]
          : OrderStatus.pending,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      deliveryAddress: json['deliveryAddress'],
      notes: json['notes'],
      estimatedDeliveryTime: json['estimatedDeliveryTime'] != null
          ? DateTime.parse(json['estimatedDeliveryTime'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerName': customerName,
      'customerPhone': customerPhones.isEmpty ? null : customerPhones,
      'shopId': shopId,
      'shopName': shopName,
      'items': items.map((item) => item.toJson()).toList(),
      'totalAmount': totalAmount,
      'status': status.index,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'deliveryAddress': deliveryAddress,
      'notes': notes,
      'estimatedDeliveryTime': estimatedDeliveryTime?.toIso8601String(),
    };
  }

  Order copyWith({
    String? id,
    String? customerName,
    List<String>? customerPhones,
    String? shopId,
    String? shopName,
    List<OrderItem>? items,
    double? totalAmount,
    OrderStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? deliveryAddress,
    String? notes,
    DateTime? estimatedDeliveryTime,
  }) {
    return Order(
      id: id ?? this.id,
      customerName: customerName ?? this.customerName,
      customerPhones: customerPhones ?? this.customerPhones,
      shopId: shopId ?? this.shopId,
      shopName: shopName ?? this.shopName,
      items: items ?? this.items,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      notes: notes ?? this.notes,
      estimatedDeliveryTime: estimatedDeliveryTime ?? this.estimatedDeliveryTime,
    );
  }
}

class OrderItem {
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String unit;

  OrderItem({
    required this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    required this.unit,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] ?? '',
      productName: json['productName'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] ?? 0,
      unit: json['unit'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'price': price,
      'quantity': quantity,
      'unit': unit,
    };
  }

  double get totalPrice => price * quantity;

  double get total => price * quantity;
}