import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import '../models/shop.dart';
import '../models/product.dart';
import '../models/order.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ========== SHOPS ==========

  Future<List<Shop>> getShops(String city) async {
    final snapshot = await _firestore
        .collection('shops')
        .where('city', isEqualTo: city)
        .where('is_open', isEqualTo: true)
        .get();
    return snapshot.docs
        .map((doc) => Shop.fromMap(doc.data()..['id'] = doc.id))
        .toList();
  }

  Future<Shop?> getShopById(String shopId) async {
    final doc = await _firestore.collection('shops').doc(shopId).get();
    if (!doc.exists) return null;
    return Shop.fromMap(doc.data()!..['id'] = doc.id);
  }

  Future<void> createShop(Map<String, dynamic> shopData) async {
    await _firestore.collection('shops').add(shopData);
  }

  Future<void> updateShop(String shopId, Map<String, dynamic> shopData) async {
    await _firestore.collection('shops').doc(shopId).update(shopData);
  }

  Future<void> deleteShop(String shopId) async {
    await _firestore.collection('shops').doc(shopId).delete();
  }

  // ========== PRODUCTS ==========

  Future<List<Product>> getProducts(String shopId) async {
    final snapshot = await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .where('is_available', isEqualTo: true)
        .get();
    return snapshot.docs
        .map((doc) => Product.fromMap(doc.data()..['id'] = doc.id))
        .toList();
  }

  Future<void> createProduct(String shopId, Map<String, dynamic> productData) async {
    await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .add(productData);
  }

  Future<void> updateProduct(String shopId, String productId, Map<String, dynamic> productData) async {
    await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .doc(productId)
        .update(productData);
  }

  Future<void> deleteProduct(String shopId, String productId) async {
    await _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .doc(productId)
        .delete();
  }

  // ========== ORDERS ==========

  Future<String> createOrder(Map<String, dynamic> orderData) async {
    final docRef = await _firestore.collection('orders').add(orderData);
    return docRef.id;
  }

  Future<void> updateOrderStatus(String orderId, String newStatus, {String? notes}) async {
    final orderRef = _firestore.collection('orders').doc(orderId);
    await _firestore.runTransaction((transaction) async {
      final orderSnapshot = await transaction.get(orderRef);
      final oldStatus = orderSnapshot.data()?['status'];
      transaction.update(orderRef, {
        'status': newStatus,
        'updated_at': FieldValue.serverTimestamp(),
      });
      await orderRef.collection('status_history').add({
        'old_status': oldStatus,
        'new_status': newStatus,
        'changed_at': FieldValue.serverTimestamp(),
        'notes': notes,
      });
    });
  }

  Future<List<Order>> getOrdersByShop(String shopId) async {
    final snapshot = await _firestore
        .collection('orders')
        .where('shop_id', isEqualTo: shopId)
        .orderBy('created_at', descending: true)
        .get();
    return snapshot.docs
        .map((doc) => Order.fromMap(doc.data()..['id'] = doc.id))
        .toList();
  }

  Future<Order?> getOrderById(String orderId) async {
    final doc = await _firestore.collection('orders').doc(orderId).get();
    if (!doc.exists) return null;
    return Order.fromMap(doc.data()!..['id'] = doc.id);
  }

  Stream<QuerySnapshot> ordersStream(String shopId) {
    return _firestore
        .collection('orders')
        .where('shop_id', isEqualTo: shopId)
        .orderBy('created_at', descending: true)
        .snapshots();
  }
}
