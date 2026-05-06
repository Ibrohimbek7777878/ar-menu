/// Shop repository interface - domain layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/domain/entities/shop.dart';
import 'package:online_store_guliston/domain/entities/product.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';

abstract class ShopRepository {
  /// Get all shops for a city
  Stream<Either<Failure, List<Shop>>> getShops(String city);

  /// Get all categories
  Stream<Either<Failure, List<String>>> getCategories();

  /// Get shop by ID
  Future<Either<Failure, Shop>> getShop(String shopId);

  /// Get products for a shop
  Stream<Either<Failure, List<Product>>> getProducts(String shopId);

  /// Get product by ID
  Future<Either<Failure, Product>> getProduct(String shopId, String productId);
}