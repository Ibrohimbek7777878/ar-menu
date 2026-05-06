/// Order repository interface - domain layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/domain/entities/order.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';

abstract class OrderRepository {
  /// Get all orders
  Stream<Either<Failure, List<Order>>> getOrders();

  /// Get orders for a specific shop
  Stream<Either<Failure, List<Order>>> getShopOrders(String shopId);

  /// Add order
  Future<Either<Failure, String>> addOrder(Order order);

  /// Update order status
  Future<Either<Failure, void>> updateOrderStatus(String orderId, String status);
}