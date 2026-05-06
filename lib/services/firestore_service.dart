import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

// Models
class Shop {
  final String id;
  final String name;
  final String address;
  final String city;
  final String phoneNumber;
  final String startTime;
  final String endTime;
  final double latitude;
  final double longitude;
  final bool isActive;

  Shop({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.phoneNumber,
    required this.startTime,
    required this.endTime,
    required this.latitude,
    required this.longitude,
    required this.isActive,
  });

  factory Shop.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final data = snapshot.data()!;
    return Shop(
      id: snapshot.id,
      name: data['name'] ?? '',
      address: data['address'] ?? '',
      city: data['city'] ?? '',
      phoneNumber: data['phoneNumber'] ?? '',
      startTime: data['startTime'] ?? '',
      endTime: data['endTime'] ?? '',
      latitude: data['latitude'] ?? 0.0,
      longitude: data['longitude'] ?? 0.0,
      isActive: data['isActive'] ?? true,
    );
  }
}

class Product {
  final String id;
  final String shopId;
  final String name;
  final String description;
  final double price;
  final String unit;
  final String category;
  final bool inStock;

  Product({
    required this.id,
    required this.shopId,
    required this.name,
    required this.description,
    required this.price,
    required this.unit,
    required this.category,
    required this.inStock,
  });

  factory Product.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final data = snapshot.data()!;
    return Product(
      id: snapshot.id,
      shopId: data['shopId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      price: data['price'] ?? 0.0,
      unit: data['unit'] ?? 'dona',
      category: data['category'] ?? '',
      inStock: data['inStock'] ?? true,
    );
  }
}

class Category {
  final String id;
  final String name;
  final String iconUrl;

  Category({
    required this.id,
    required this.name,
    required this.iconUrl,
  });

  factory Category.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final data = snapshot.data()!;
    return Category(
      id: snapshot.id,
      name: data['name'] ?? '',
      iconUrl: data['iconUrl'] ?? '',
    );
  }
}

class Order {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String deliveryAddress;
  final String notes;
  final String shopId;
  final String shopName;
  final List<Map<String, dynamic>> items;
  final double totalAmount;
  final String status; // 'new', 'accepted', 'in_transit', 'delivered'
  final DateTime createdAt;

  Order({
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

  factory Order.fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snapshot) {
    final data = snapshot.data()!;
    return Order(
      id: snapshot.id,
      customerId: data['customerId'] ?? '',
      customerName: data['customerName'] ?? '',
      customerPhone: data['customerPhone'] ?? '',
      deliveryAddress: data['deliveryAddress'] ?? '',
      notes: data['notes'] ?? '',
      shopId: data['shopId'] ?? '',
      shopName: data['shopName'] ?? '',
      items: data['items'] ?? [],
      totalAmount: data['totalAmount'] ?? 0.0,
      status: data['status'] ?? 'new',
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }
}

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get all shops for a city
  Stream<List<Shop>> getShops(String city) {
    return _firestore
        .collection('shops')
        .where('city', isEqualTo: city)
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Shop.fromSnapshot(doc)).toList());
  }

  // Get all categories
  Stream<List<Category>> getCategories() {
    return _firestore
        .collection('categories')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Category.fromSnapshot(doc)).toList());
  }

  // Get shop by ID
  Future<Shop> getShop(String shopId) async {
    final doc = await _firestore.collection('shops').doc(shopId).get();
    if (doc.exists) {
      return Shop.fromSnapshot(doc);
    } else {
      throw Exception('Shop not found');
    }
  }

  // Get products for a shop
  Stream<List<Product>> getProducts(String shopId) {
    return _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .where('inStock', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Product.fromSnapshot(doc)).toList());
  }

  // Get product by ID
  Future<Product> getProduct(String shopId, String productId) async {
    final doc = await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .doc(productId)
        .get();
    if (doc.exists) {
      return Product.fromSnapshot(doc);
    } else {
      throw Exception('Product not found');
    }
  }

  // Get orders for admin dashboard
  Stream<List<Order>> getOrders() {
    return _firestore
        .collection('orders')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Order.fromSnapshot(doc)).toList());
  }

  // Get orders for a specific shop
  Stream<List<Order>> getShopOrders(String shopId) {
    return _firestore
        .collection('orders')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Order.fromSnapshot(doc)).toList());
  }

  // Add order
  Future<void> addOrder(Order order) async {
    await _firestore.collection('orders').add({
      'customerId': order.customerId,
      'customerName': order.customerName,
      'customerPhone': order.customerPhone,
      'deliveryAddress': order.deliveryAddress,
      'notes': order.notes,
      'shopId': order.shopId,
      'shopName': order.shopName,
      'items': order.items,
      'totalAmount': order.totalAmount,
      'status': order.status,
      'createdAt': Timestamp.fromDate(order.createdAt),
    });
  }

  // Update order status
  Future<void> updateOrderStatus(String orderId, String status) async {
    await _firestore.collection('orders').doc(orderId).update({'status': status});
  }
}