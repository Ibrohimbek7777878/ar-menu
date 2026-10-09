import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/product_service.dart';

class ProductProvider with ChangeNotifier {
  final ProductService _productService = ProductService();
  final List<Product> _products = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String? _selectedCategory;

  List<Product> get products => List.unmodifiable(_products);
  bool get isLoading => _isLoading;
  String get searchQuery => _searchQuery;
  String? get selectedCategory => _selectedCategory;

  /// Returns products filtered by both category and search query
  List<Product> get filteredProducts {
    return _products.where((product) {
      final matchesCategory = _selectedCategory == null ||
          _selectedCategory!.isEmpty ||
          product.category.toLowerCase().contains(_selectedCategory!.toLowerCase());
      final matchesSearch = _searchQuery.isEmpty ||
          product.name.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
  }

  List<Product> getProductsByShop(String shopId) {
    return _products.where((product) => product.shopId == shopId).toList();
  }

  Future<void> loadAllProducts({String? categoryId, String? search}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final list = await _productService.getAllProducts(categoryId: categoryId, search: search);
      _products.clear();
      _products.addAll(list);
    } catch (e) {
      debugPrint('ProductProvider loadAllProducts error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProductsForShop(String shopId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final list = await _productService.getProducts(shopId: shopId);
      // Replace or append products for this shop
      _products.removeWhere((p) => p.shopId == shopId);
      _products.addAll(list);
    } catch (e) {
      debugPrint('ProductProvider loadProductsForShop error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    Future.microtask(() => notifyListeners());
  }

  void setCategory(String category) {
    _selectedCategory = category == 'Barchasi' || category.isEmpty ? null : category;
    Future.microtask(() => notifyListeners());
  }

  void filterByCategory(String? category) {
    _selectedCategory = category;
    Future.microtask(() => notifyListeners());
  }

  void clearFilters() {
    _searchQuery = '';
    _selectedCategory = null;
    Future.microtask(() => notifyListeners());
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
    Future.microtask(() => notifyListeners());
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
      Future.microtask(() => notifyListeners());
    }
  }

  void removeProduct(String id) {
    _products.removeWhere((p) => p.id == id);
    Future.microtask(() => notifyListeners());
  }

}
