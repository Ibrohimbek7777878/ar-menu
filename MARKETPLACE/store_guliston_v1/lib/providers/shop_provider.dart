import 'package:flutter/material.dart';
import '../models/shop.dart';
import '../services/shop_service.dart';

class ShopProvider with ChangeNotifier {
  final ShopService _shopService = ShopService();

  List<Shop> _shops = [];
  List<Shop> _filteredShops = [];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';
  String? _selectedCategory;
  String _selectedStoreType = 'all';

  List<Shop> get shops => _filteredShops;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get selectedCategory => _selectedCategory;
  String get selectedStoreType => _selectedStoreType;

  Future<void> loadShops({String? storeType}) async {
    if (storeType != null) _selectedStoreType = storeType;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final st = _selectedStoreType == 'all' ? null : _selectedStoreType;
      _shops = await _shopService.getShops(storeType: st);
      _applyFilters();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void filterByStoreType(String storeType) {
    _selectedStoreType = storeType;
    if (storeType == 'all') {
      _applyFilters();
      Future.microtask(() => notifyListeners());
    } else {
      loadShops(storeType: storeType);
    }
  }

  Future<Shop?> getShopById(String id) async {
    try {
      return await _shopService.getShopById(id);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void searchShops(String query) {
    _searchQuery = query;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void setSearchQuery(String query) {
    searchShops(query);
  }

  void filterByCategory(String? category) {
    _selectedCategory = category;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void setCategory(String category) {
    _selectedCategory = category == 'Barchasi' ? null : category;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void _applyFilters() {
    _filteredShops = _shops.where((shop) {
      final matchesSearch = _searchQuery.isEmpty ||
          shop.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          shop.address.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == null ||
          _normalizeCategory(shop.category) == _normalizeCategory(_selectedCategory!);
      final matchesStoreType = _selectedStoreType == 'all' || shop.storeType == _selectedStoreType;
      return matchesSearch && matchesCategory && matchesStoreType;
    }).toList();
  }

  String _normalizeCategory(String category) {
    final normalized = category.trim().toLowerCase();
    switch (normalized) {
      case 'cat_food':
      case 'oziq-ovqat':
        return 'oziq-ovqat';
      case 'cat_drinks':
      case 'ichimliklar':
        return 'ichimliklar';
      case 'cat_dairy':
      case 'sut':
      case 'sut mahsulotlari':
        return 'sut mahsulotlari';
      case 'cat_meat':
      case 'go\'sht':
        return 'go\'sht';
      case 'cat_vegetables':
      case 'sabzavotlar':
        return 'sabzavotlar';
      case 'cat_fruits':
      case 'mevalar':
        return 'mevalar';
      case 'cat_bakery':
      case 'non va pishiriq':
        return 'non va pishiriq';
      case 'cat_hygiene':
      case 'gigiena':
        return 'gigiena';
      case 'cat_home':
      case 'uy-ro\'zg\'or':
        return 'uy-ro\'zg\'or';
      case 'cat_local':
      case 'mahalliy':
      case 'mahalliy mahsulotlar':
        return 'mahalliy';
      case 'barchasi':
        return 'barchasi';
      default:
        return normalized;
    }
  }

  List<String> getCategories() {
    final categories = _shops.map((shop) => shop.category).toSet().toList();
    categories.sort();
    return categories;
  }

  List<Shop> getShopsByCategory(String category) {
    return _shops.where((shop) => shop.category == category).toList();
  }

  // Admin functions
  Future<bool> createShop(Shop shop) async {
    try {
      final newShop = await _shopService.createShop(shop);
      if (newShop != null) {
        _shops.add(newShop);
        _applyFilters();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateShop(String id, Shop updatedShop) async {
    try {
      final shop = await _shopService.updateShop(id, updatedShop);
      if (shop != null) {
        final index = _shops.indexWhere((s) => s.id == id);
        if (index != -1) {
          _shops[index] = shop;
          _applyFilters();
          notifyListeners();
          return true;
        }
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteShop(String id) async {
    try {
      final success = await _shopService.deleteShop(id);
      if (success) {
        _shops.removeWhere((shop) => shop.id == id);
        _applyFilters();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void clearFilters() {
    _searchQuery = '';
    _selectedCategory = null;
    _applyFilters();
    Future.microtask(() => notifyListeners());
  }

  void clearError() {
    _error = null;
    Future.microtask(() => notifyListeners());
  }
}
