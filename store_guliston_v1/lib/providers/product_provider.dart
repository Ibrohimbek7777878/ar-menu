import 'package:flutter/material.dart';
import '../models/product.dart';

class ProductProvider with ChangeNotifier {
  final List<Product> _products = [];
  bool _isLoading = false;

  List<Product> get products => List.unmodifiable(_products);
  bool get isLoading => _isLoading;

  List<Product> getProductsByShop(String shopId) {
    return _products.where((product) => product.shopId == shopId).toList();
  }

  Future<void> loadProductsForShop(String shopId) async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(seconds: 1));
    _isLoading = false;
    notifyListeners();
  }

  void addProduct({
    required String name,
    required double price,
    required String imageUrl,
    required String unit,
    String? description,
    String? shopId,
    String category = 'Umumiy',
    bool isAvailable = true,
    int stock = 100,
  }) {
    final product = Product(
      id: 'product_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      price: price,
      imageUrl: imageUrl,
      unit: unit,
      description: description ?? '',
      shopId: shopId ?? 'default_shop',
      category: category,
      isAvailable: isAvailable,
      stock: stock,
    );
    _products.add(product);
    notifyListeners();
  }

  void updateProduct(
    String id, {
    required String name,
    required double price,
    required String imageUrl,
    required String unit,
    String? description,
    String category = 'Umumiy',
    bool isAvailable = true,
    int stock = 100,
  }) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index != -1) {
      _products[index] = Product(
        id: id,
        name: name,
        price: price,
        imageUrl: imageUrl,
        unit: unit,
        description: description ?? '',
        shopId: _products[index].shopId,
        category: category,
        isAvailable: isAvailable,
        stock: stock,
      );
      notifyListeners();
    }
  }

  void removeProduct(String id) {
    _products.removeWhere((p) => p.id == id);
    notifyListeners();
  }

  Future<void> loadDemoData() async {
    _isLoading = true;
    notifyListeners();

    _products.addAll([
      Product(
        id: 'prod_1',
        name: 'Yangi Olmalar',
        price: 12000,
        imageUrl: 'https://via.placeholder.com/150',
        unit: 'kg',
        description: 'Shirin va sharbatli olmalar',
        shopId: 'shop_1',
        category: 'Meva',
        isAvailable: true,
        stock: 100,
      ),
      Product(
        id: 'prod_2',
        name: 'Sabzavotlar',
        price: 8000,
        imageUrl: 'https://via.placeholder.com/150',
        unit: 'kg',
        description: 'Yangi sabzavotlar',
        shopId: 'shop_1',
        category: 'Sabzavot',
        isAvailable: true,
        stock: 150,
      ),
      Product(
        id: 'prod_3',
        name: 'Kartoshka',
        price: 5000,
        imageUrl: 'https://via.placeholder.com/150',
        unit: 'kg',
        description: 'Sifatli kartoshka',
        shopId: 'shop_2',
        category: 'Sabzavot',
        isAvailable: true,
        stock: 200,
      ),
    ]);

    _isLoading = false;
    notifyListeners();
  }
}