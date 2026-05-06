/// Shop repository implementation - data layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/data/datasources/firestore_datasource.dart';
import 'package:online_store_guliston/domain/entities/shop.dart';
import 'package:online_store_guliston/domain/entities/product.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:online_store_guliston/domain/repositories/shop_repository.dart';

// Shop repository implementation
class ShopRepositoryImpl implements ShopRepository {
  final FirestoreDatasource _firestoreDatasource;

  ShopRepositoryImpl({
    FirestoreDatasource? firestoreDatasource,
  }) : _firestoreDatasource = firestoreDatasource ?? FirestoreDatasource();

  @override
  Stream<Either<Failure, List<Shop>>> getShops(String city) {
    return _firestoreDatasource.getShops(city);
  }

  @override
  Stream<Either<Failure, List<String>>> getCategories() {
    return _firestoreDatasource.getCategories();
  }

  @override
  Future<Either<Failure, Shop>> getShop(String shopId) async {
    return await _firestoreDatasource.getShop(shopId);
  }

  @override
  Stream<Either<Failure, List<Product>>> getProducts(String shopId) {
    return _firestoreDatasource.getProducts(shopId);
  }

  @override
  Future<Either<Failure, Product>> getProduct(String shopId, String productId) async {
    return await _firestoreDatasource.getProduct(shopId, productId);
  }
}