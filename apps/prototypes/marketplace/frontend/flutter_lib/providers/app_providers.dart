// This file contains unused Riverpod providers (commented out).
// All state management is handled via Provider (package:provider) in main.dart.
//
// To re-enable:
// 1. Add `flutter_riverpod: ^2.5.0` to pubspec.yaml
// 2. Uncomment the code below

/*
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/shop_repository.dart';
import '../repositories/product_repository.dart';
import '../repositories/order_repository.dart';
import '../models/shop.dart';
import '../models/product.dart';
import '../models/order.dart';

final shopRepositoryProvider = Provider((ref) => ShopRepository());
final productRepositoryProvider = Provider((ref) => ProductRepository());
final orderRepositoryProvider = Provider((ref) => OrderRepository());

final allShopsProvider = FutureProvider((ref) async {
  final repo = ref.watch(shopRepositoryProvider);
  return repo.getAllShops();
});

final shopsByCity = FutureProvider.family<List<Shop>, String>((ref, city) async {
  final repo = ref.watch(shopRepositoryProvider);
  return repo.getShopsByCity(city);
});

final shopById = FutureProvider.family<Shop?, String>((ref, id) async {
  final repo = ref.watch(shopRepositoryProvider);
  return repo.getShopById(id);
});

final shopSearchProvider = FutureProvider.family<List<Shop>, String>((ref, query) async {
  if (query.isEmpty) return [];
  final repo = ref.watch(shopRepositoryProvider);
  return repo.searchShops(query);
});

final allProductsProvider = FutureProvider((ref) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getAllProducts();
});

final productsByShop = FutureProvider.family<List<Product>, String>((ref, shopId) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getProductsByShop(shopId);
});

final productsByCategory = FutureProvider.family<List<Product>, String>((ref, categoryId) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getProductsByCategory(categoryId);
});

final productSearchProvider = FutureProvider.family<List<Product>, String>((ref, query) async {
  if (query.isEmpty) return [];
  final repo = ref.watch(productRepositoryProvider);
  return repo.searchProducts(query);
});

final allOrdersProvider = FutureProvider((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getAllOrders();
});

final ordersByPhone = FutureProvider.family<List<Order>, String>((ref, phone) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getOrdersByCustomerPhone(phone);
});

final ordersByShop = FutureProvider.family<List<Order>, String>((ref, shopId) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getOrdersByShop(shopId);
});

final ordersByStatus = FutureProvider.family<List<Order>, OrderStatus>((ref, status) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getOrdersByStatus(status);
});

final orderById = FutureProvider.family<Order?, String>((ref, id) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getOrderById(id);
});

final totalOrdersCountProvider = FutureProvider((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getTotalOrdersCount();
});

final totalRevenueProvider = FutureProvider((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getTotalRevenue();
});

final cartProvider = StateProvider<Map<String, CartItem>>((ref) => {});

class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});

  double get total => product.price * quantity;
}

final adminAuthProvider = StateProvider<bool>((ref) => false);
*/
