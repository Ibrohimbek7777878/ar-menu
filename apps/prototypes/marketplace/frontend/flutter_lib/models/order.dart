enum OrderStatus {
  pending('pending'),
  confirmed('confirmed'),
  preparing('preparing'),
  ready('ready'),
  outForDelivery('outForDelivery'),
  delivered('delivered'),
  cancelled('cancelled');

  final String value;
  const OrderStatus(this.value);
}

class Order {
  final String id;
  final String? orderNumber;
  final String? customerName;
  final List<String> customerPhones; // Changed to List<String>
  final String? shopId;
  final String? shopName;
  final List<OrderItem> items;
  final double totalAmount;
  final double deliveryFee;
  final double finalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? deliveryAddress;
  final String? notes;
  final bool isPickup;
  final String? courierName;
  final String? courierPhone;
  final double? deliveryLat;
  final double? deliveryLng;
  final DateTime? estimatedDeliveryTime;
  final String? couponCode;
  final double discountAmount;

  Order({
    required this.id,
    this.orderNumber,
    this.customerName,
    this.customerPhones = const [],
    this.shopId,
    this.shopName,
    required this.items,
    required this.totalAmount,
    this.deliveryFee = 0.0,
    double? finalAmount,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.deliveryAddress,
    this.notes,
    this.isPickup = false,
    this.courierName,
    this.courierPhone,
    this.deliveryLat,
    this.deliveryLng,
    this.estimatedDeliveryTime,
    this.couponCode,
    this.discountAmount = 0.0,
  }) : finalAmount = finalAmount ?? totalAmount + 0.0;

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
      orderNumber: json['orderNumber'],
      customerName: json['customerName'],
      customerPhones: phones,
      shopId: json['shopId'],
      shopName: json['shopName'],
      items: (json['items'] as List?)
              ?.map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      finalAmount: (json['finalAmount'] as num?)?.toDouble() ?? (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] != null
          ? OrderStatus.values.firstWhere(
              (e) => e.value == json['status'] || e.index == json['status'],
              orElse: () => OrderStatus.pending,
            )
          : OrderStatus.pending,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      deliveryAddress: json['deliveryAddress'],
      notes: json['notes'],
      isPickup: json['isPickup'] == true,
      courierName: json['courierName'],
      courierPhone: json['courierPhone'],
      deliveryLat: (json['deliveryLat'] as num?)?.toDouble(),
      deliveryLng: (json['deliveryLng'] as num?)?.toDouble(),
      estimatedDeliveryTime: json['estimatedDeliveryTime'] != null
          ? DateTime.parse(json['estimatedDeliveryTime'])
          : null,
      couponCode: json['couponCode'] ?? json['coupon_code'],
      discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
    );
  }

  factory Order.fromMap(Map<String, dynamic> map) {
    List<String> phones = [];
    final phoneFields = [map['customer_phone_1'], map['customer_phone_2'], map['customer_phone_3']];
    phones = phoneFields.where((p) => p != null && p.toString().isNotEmpty).map((p) => p.toString()).toList();
    if (phones.isEmpty && map['customerPhones'] != null) {
      if (map['customerPhones'] is String) {
        phones = [map['customerPhones']];
      } else if (map['customerPhones'] is List) {
        phones = (map['customerPhones'] as List).map((e) => e.toString()).toList();
      }
    }

    return Order(
      id: map['id'] ?? '',
      orderNumber: map['order_number'] ?? map['orderNumber'],
      customerName: map['customer_name'] ?? map['customerName'],
      customerPhones: phones,
      shopId: map['shop_id'] ?? map['shopId'],
      shopName: map['shopName'],
      items: const [],
      totalAmount: (map['total_amount'] as num?)?.toDouble() ?? (map['totalAmount'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (map['delivery_fee'] as num?)?.toDouble() ?? (map['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      finalAmount: (map['final_amount'] as num?)?.toDouble() ?? (map['finalAmount'] as num?)?.toDouble() ?? 0.0,
      status: map['status'] != null
          ? OrderStatus.values.firstWhere(
              (e) => e.value == map['status'] || e.index == map['status'],
              orElse: () => OrderStatus.pending,
            )
          : OrderStatus.pending,
      createdAt: map['created_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch((map['created_at'] as num).toInt() * 1000)
          : map['createdAt'] != null
              ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
      updatedAt: map['updated_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch((map['updated_at'] as num).toInt() * 1000)
          : map['updatedAt'] != null
              ? DateTime.parse(map['updatedAt'])
              : null,
      deliveryAddress: map['delivery_address'] ?? map['deliveryAddress'],
      notes: map['customer_notes'] ?? map['notes'],
      isPickup: map['is_pickup'] == 1 || map['isPickup'] == true,
      courierName: map['courier_name'] ?? map['courierName'],
      courierPhone: map['courier_phone'] ?? map['courierPhone'],
      deliveryLat: (map['delivery_lat'] as num?)?.toDouble() ?? (map['deliveryLat'] as num?)?.toDouble(),
      deliveryLng: (map['delivery_lng'] as num?)?.toDouble() ?? (map['deliveryLng'] as num?)?.toDouble(),
      estimatedDeliveryTime: map['estimatedDeliveryTime'] != null
          ? DateTime.parse(map['estimatedDeliveryTime'])
          : null,
      couponCode: map['coupon_code'] ?? map['couponCode'],
      discountAmount: (map['discount_amount'] as num?)?.toDouble() ?? (map['discountAmount'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'customerName': customerName,
      'customerPhone': customerPhones.isEmpty ? null : customerPhones,
      'shopId': shopId,
      'shopName': shopName,
      'items': items.map((item) => item.toJson()).toList(),
      'totalAmount': totalAmount,
      'deliveryFee': deliveryFee,
      'finalAmount': finalAmount,
      'status': status.value,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'deliveryAddress': deliveryAddress,
      'notes': notes,
      'isPickup': isPickup,
      'courierName': courierName,
      'courierPhone': courierPhone,
      'deliveryLat': deliveryLat,
      'deliveryLng': deliveryLng,
      'estimatedDeliveryTime': estimatedDeliveryTime?.toIso8601String(),
      'couponCode': couponCode,
      'discountAmount': discountAmount,
    };
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'order_number': orderNumber,
      'customer_phone_1': customerPhones.isNotEmpty ? customerPhones[0] : null,
      'customer_phone_2': customerPhones.length > 1 ? customerPhones[1] : null,
      'customer_phone_3': customerPhones.length > 2 ? customerPhones[2] : null,
      'shop_id': shopId,
      'customer_name': customerName,
      'total_amount': totalAmount,
      'delivery_fee': deliveryFee,
      'final_amount': finalAmount,
      'status': status.value,
      'created_at': createdAt.millisecondsSinceEpoch ~/ 1000,
      'updated_at': updatedAt != null ? updatedAt!.millisecondsSinceEpoch ~/ 1000 : null,
      'delivery_address': deliveryAddress,
      'customer_notes': notes,
      'is_pickup': isPickup ? 1 : 0,
      'courier_name': courierName,
      'courier_phone': courierPhone,
      'delivery_lat': deliveryLat,
      'delivery_lng': deliveryLng,
      'coupon_code': couponCode,
      'discount_amount': discountAmount,
    };
  }

  Order copyWith({
    String? id,
    String? orderNumber,
    String? customerName,
    List<String>? customerPhones,
    String? shopId,
    String? shopName,
    List<OrderItem>? items,
    double? totalAmount,
    double? deliveryFee,
    double? finalAmount,
    OrderStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? deliveryAddress,
    String? notes,
    bool? isPickup,
    String? courierName,
    String? courierPhone,
    double? deliveryLat,
    double? deliveryLng,
    DateTime? estimatedDeliveryTime,
    String? couponCode,
    double? discountAmount,
  }) {
    return Order(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      customerName: customerName ?? this.customerName,
      customerPhones: customerPhones ?? this.customerPhones,
      shopId: shopId ?? this.shopId,
      shopName: shopName ?? this.shopName,
      items: items ?? this.items,
      totalAmount: totalAmount ?? this.totalAmount,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      finalAmount: finalAmount ?? this.finalAmount,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      notes: notes ?? this.notes,
      isPickup: isPickup ?? this.isPickup,
      courierName: courierName ?? this.courierName,
      courierPhone: courierPhone ?? this.courierPhone,
      deliveryLat: deliveryLat ?? this.deliveryLat,
      deliveryLng: deliveryLng ?? this.deliveryLng,
      estimatedDeliveryTime: estimatedDeliveryTime ?? this.estimatedDeliveryTime,
      couponCode: couponCode ?? this.couponCode,
      discountAmount: discountAmount ?? this.discountAmount,
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

  factory OrderItem.fromMap(Map<String, dynamic> map) {
    return OrderItem(
      productId: map['productId'] ?? '',
      productName: map['productName'] ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      quantity: map['quantity'] ?? 0,
      unit: map['unit'] ?? '',
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

  Map<String, dynamic> toMap() {
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
