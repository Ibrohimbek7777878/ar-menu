/// Order repository implementation - data layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/data/datasources/firestore_datasource.dart';
import 'package:online_store_guliston/domain/entities/order.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:online_store_guliston/domain/repositories/order_repository.dart';

// Order repository implementation
class OrderRepositoryImpl implements OrderRepository {
  final FirestoreDatasource _firestoreDatasource;

  OrderRepositoryImpl({
    FirestoreDatasource? firestoreDatasource,
  }) : _firestoreDatasource = firestoreDatasource ?? FirestoreDatasource();

  @override
  Stream<Either<Failure, List<Order>>> getOrders() {
    return _firestoreDatasource.getOrders();
  }

  @override
  Stream<Either<Failure, List<Order>>> getShopOrders(String shopId) {
    return _firestoreDatasource.getShopOrders(shopId);
  }

  @override
  Future<Either<Failure, String>> addOrder(Order order) async {
    return await _firestoreDatasource.addOrder(order);
  }

  @override
  Future<Either<Failure, void>> updateOrderStatus(String orderId, String status) async {
    return await _firestoreDatasource.updateOrderStatus(orderId, status);
  }
}