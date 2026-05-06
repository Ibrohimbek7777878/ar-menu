/// Firestore datasource - data layer

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:online_store_guliston/domain/entities/shop.dart';
import 'package:online_store_guliston/domain/entities/product.dart';
import 'package:online_store_guliston/domain/entities/order.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:dartz/dartz.dart';

// Firestore datasource implementation
class FirestoreDatasource {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get all shops for a city
  Stream<Either<Failure, List<Shop>>> getShops(String city) {
    return _firestore
        .collection('shops')
        .where('city', isEqualTo: city)
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      try {
        final shops = snapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return Shop(
            id: doc.id,
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
        }).toList();
        return Right(shops);
      } catch (e) {
        return Left(Failure('Do\'konlarni yuklashda xatolik: ${e.toString()}'));
      }
    });
  }

  // Get all categories
  Stream<Either<Failure, List<String>>> getCategories() {
    return _firestore
        .collection('categories')
        .snapshots()
        .map((snapshot) {
      try {
        final categories = snapshot.docs.map((doc) => doc.data()['name'] as String).toList();
        return Right(categories);
      } catch (e) {
        return Left(Failure('Kategoriyalarni yuklashda xatolik: ${e.toString()}'));
      }
    });
  }

  // Get shop by ID
  Future<Either<Failure, Shop>> getShop(String shopId) async {
    try {
      final doc = await _firestore.collection('shops').doc(shopId).get();
      if (!doc.exists) {
        return Left(Failure('Do\'kon topilmadi'));
      }

      final data = doc.data() as Map<String, dynamic>;
      final shop = Shop(
        id: doc.id,
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

      return Right(shop);
    } catch (e) {
      return Left(Failure('Do\'konni yuklashda xatolik: ${e.toString()}'));
    }
  }

  // Get products for a shop
  Stream<Either<Failure, List<Product>>> getProducts(String shopId) {
    return _firestore
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .where('inStock', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      try {
        final products = snapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return Product(
            id: doc.id,
            shopId: shopId,
            name: data['name'] ?? '',
            description: data['description'] ?? '',
            price: data['price'] ?? 0.0,
            unit: data['unit'] ?? 'dona',
            category: data['category'] ?? '',
            inStock: data['inStock'] ?? true,
          );
        }).toList();
        return Right(products);
      } catch (e) {
        return Left(Failure('Mahsulotlarni yuklashda xatolik: ${e.toString()}'));
      }
    });
  }

  // Get product by ID
  Future<Either<Failure, Product>> getProduct(String shopId, String productId) async {
    try {
      final doc = await _firestore
          .collection('shops')
          .doc(shopId)
          .collection('products')
          .doc(productId)
          .get();
      if (!doc.exists) {
        return Left(Failure('Mahsulot topilmadi'));
      }

      final data = doc.data() as Map<String, dynamic>;
      final product = Product(
        id: doc.id,
        shopId: shopId,
        name: data['name'] ?? '',
        description: data['description'] ?? '',
        price: data['price'] ?? 0.0,
        unit: data['unit'] ?? 'dona',
        category: data['category'] ?? '',
        inStock: data['inStock'] ?? true,
      );

      return Right(product);
    } catch (e) {
      return Left(Failure('Mahsulotni yuklashda xatolik: ${e.toString()}'));
    }
  }

  // Get all orders
  Stream<Either<Failure, List<Order>>> getOrders() {
    return _firestore
        .collection('orders')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      try {
        final orders = snapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final itemsJson = data['items'] as List<dynamic>;
          final items = itemsJson.map((item) => OrderItem.fromJson(item)).toList();

          return Order(
            id: doc.id,
            customerId: data['customerId'] ?? '',
            customerName: data['customerName'] ?? '',
            customerPhone: data['customerPhone'] ?? '',
            deliveryAddress: data['deliveryAddress'] ?? '',
            notes: data['notes'] ?? '',
            shopId: data['shopId'] ?? '',
            shopName: data['shopName'] ?? '',
            items: items,
            totalAmount: data['totalAmount'] ?? 0.0,
            status: data['status'] ?? 'new',
            createdAt: (data['createdAt'] as DateTime) ?? DateTime.now(),
          );
        }).toList();
        return Right(orders);
      } catch (e) {
        return Left(Failure('Buyurtmalarni yuklashda xatolik: ${e.toString()}'));
      }
    });
  }

  // Get orders for a specific shop
  Stream<Either<Failure, List<Order>>> getShopOrders(String shopId) {
    return _firestore
        .collection('orders')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      try {
        final orders = snapshot.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final itemsJson = data['items'] as List<dynamic>;
          final items = itemsJson.map((item) => OrderItem.fromJson(item)).toList();

          return Order(
            id: doc.id,
            customerId: data['customerId'] ?? '',
            customerName: data['customerName'] ?? '',
            customerPhone: data['customerPhone'] ?? '',
            deliveryAddress: data['deliveryAddress'] ?? '',
            notes: data['notes'] ?? '',
            shopId: data['shopId'] ?? '',
            shopName: data['shopName'] ?? '',
            items: items,
            totalAmount: data['totalAmount'] ?? 0.0,
            status: data['status'] ?? 'new',
            createdAt: (data['createdAt'] as DateTime) ?? DateTime.now(),
          );
        }).toList();
        return Right(orders);
      } catch (e) {
        return Left(Failure('Do\'kon buyurtmalarini yuklashda xatolik: ${e.toString()}'));
      }
    });
  }

  // Add order
  Future<Either<Failure, String>> addOrder(Order order) async {
    try {
      final docRef = await _firestore.collection('orders').add({
        'customerId': order.customerId,
        'customerName': order.customerName,
        'customerPhone': order.customerPhone,
        'deliveryAddress': order.deliveryAddress,
        'notes': order.notes,
        'shopId': order.shopId,
        'shopName': order.shopName,
        'items': order.items.map((item) => item.toJson()).toList(),
        'totalAmount': order.totalAmount,
        'status': order.status,
        'createdAt': order.createdAt,
      });

      return Right(docRef.id);
    } catch (e) {
      return Left(Failure('Buyurtma qo\'shishda xatolik: ${e.toString()}'));
    }
  }

  // Update order status
  Future<Either<Failure, void>> updateOrderStatus(String orderId, String status) async {
    try {
      await _firestore.collection('orders').doc(orderId).update({'status': status});
      return const Right(null);
    } catch (e) {
      return Left(Failure('Buyurtma holatini yangilashda xatolik: ${e.toString()}'));
    }
  }
}