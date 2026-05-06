/// Product entity - domain layer

import 'package:equatable/equatable.dart';

// Product entity
class Product extends Equatable {
  final String id;
  final String shopId;
  final String name;
  final String description;
  final double price;
  final String unit;
  final String category;
  final bool inStock;

  const Product({
    required this.id,
    required this.shopId,
    required this.name,
    required this.description,
    required this.price,
    required this.unit,
    required this.category,
    required this.inStock,
  });

  @override
  List<Object?> get props => [
        id,
        shopId,
        name,
        description,
        price,
        unit,
        category,
        inStock,
      ];

  // Factory method for creating from map
  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      shopId: json['shopId'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: json['price'] ?? 0.0,
      unit: json['unit'] ?? 'dona',
      category: json['category'] ?? '',
      inStock: json['inStock'] ?? true,
    );
  }

  // Convert to map
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shopId': shopId,
      'name': name,
      'description': description,
      'price': price,
      'unit': unit,
      'category': category,
      'inStock': inStock,
    };
  }
}