import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../services/api_service.dart';

class WishlistProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<Product> _items = [];
  final Set<String> _favoriteIds = {};
  bool _isLoading = false;

  List<Product> get items => _items;
  Set<String> get favoriteIds => _favoriteIds;
  bool get isLoading => _isLoading;
  int get count => _items.length;

  WishlistProvider() {
    loadLocalFavorites();
  }

  bool isFavorite(String productId) {
    return _favoriteIds.contains(productId);
  }

  Future<void> loadLocalFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedIds = prefs.getStringList('wishlist_ids') ?? [];
      _favoriteIds.clear();
      _favoriteIds.addAll(savedIds);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadWishlist({String? phone}) async {
    _isLoading = true;
    notifyListeners();

    if (phone != null && phone.isNotEmpty) {
      try {
        final remote = await _apiService.getWishlist(phone);
        _items = remote;
        _favoriteIds.clear();
        for (final p in remote) {
          _favoriteIds.add(p.id);
        }
        _saveToPrefs();
        _isLoading = false;
        notifyListeners();
        return;
      } catch (e) {
        debugPrint('WishlistProvider: getWishlist API fallback: $e');
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> toggleFavorite(Product product, {String? phone}) async {
    final isFav = _favoriteIds.contains(product.id);
    if (isFav) {
      _favoriteIds.remove(product.id);
      _items.removeWhere((p) => p.id == product.id);
    } else {
      _favoriteIds.add(product.id);
      if (!_items.any((p) => p.id == product.id)) {
        _items.add(product);
      }
    }
    notifyListeners();
    await _saveToPrefs();

    if (phone != null && phone.isNotEmpty) {
      final pId = int.tryParse(product.id);
      if (pId != null) {
        try {
          await _apiService.toggleWishlist(pId, phone);
        } catch (_) {}
      }
    }
  }

  Future<void> _saveToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('wishlist_ids', _favoriteIds.toList());
    } catch (_) {}
  }
}
