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

  List<Shop> get shops => _filteredShops;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get selectedCategory => _selectedCategory;

  Future<void> loadShops() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _shops = await _shopService.getShops();
      _applyFilters();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
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
    notifyListeners();
  }

  void filterByCategory(String? category) {
    _selectedCategory = category;
    _applyFilters();
    notifyListeners();
  }

  void _applyFilters() {
    _filteredShops = _shops.where((shop) {
      final matchesSearch = _searchQuery.isEmpty ||
          shop.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          shop.address.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == null ||
          shop.category == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();
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
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Load demo data
  void loadDemoData() {
    _shops = [
      Shop(
        id: 'shop_1',
        name: 'Yangi Yer Market',
        address: 'Markaziy ko\'cha 45, Yangi Yer',
        phone: '+998901234567',
        latitude: 40.5966,
        longitude: 68.7786,
        category: 'oziq-ovqat',
        imageUrl: 'assets/images/shops/market1.jpg',
        workingHours: '08:00 - 22:00',
        isOpen: true,
        rating: 4.5,
      ),
      Shop(
        id: 'shop_2',
        name: 'Choy va Kofe Do\'koni',
        address: 'Guliston ko\'cha 12, Yangi Yer',
        phone: '+998907654321',
        latitude: 40.5980,
        longitude: 68.7800,
        category: 'ichimliklar',
        imageUrl: 'assets/images/shops/tea_shop.jpg',
        workingHours: '07:00 - 23:00',
        isOpen: true,
        rating: 4.2,
      ),
      Shop(
        id: 'shop_3',
        name: 'Go\'sht va Sut Mahsulotlari',
        address: 'Dehqon bozori, Yangi Yer',
        phone: '+998905556667',
        latitude: 40.5950,
        longitude: 68.7770,
        category: 'oziq-ovqat',
        imageUrl: 'assets/images/shops/meat_shop.jpg',
        workingHours: '06:00 - 20:00',
        isOpen: true,
        rating: 4.7,
      ),
    ];
    _applyFilters();
    notifyListeners();
  }
}