import 'package:flutter/foundation.dart';

// Model classes
class CartItem {
  final String productId;
  final String shopId;
  final String name;
  final double price;
  final String unit;
  final int quantity;

  CartItem({
    required this.productId,
    required this.shopId,
    required this.name,
    required this.price,
    required this.unit,
    required this.quantity,
  });

  double get totalPrice => price * quantity;
}

class CartProvider with ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => [..._items];

  int get totalItems {
    return _items.length;
  }

  double get totalAmount {
    return _items.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  void addItem(
    String productId,
    String shopId,
    String name,
    double price,
    String unit,
    int quantity,
  ) {
    final existingItem = _items.firstWhere(
      (item) => item.productId == productId && item.shopId == shopId,
      orElse: () => null,
    );

    if (existingItem != null) {
      _items[_items.indexOf(existingItem)] = CartItem(
        productId: productId,
        shopId: shopId,
        name: name,
        price: price,
        unit: unit,
        quantity: existingItem.quantity + quantity,
      );
    } else {
      _items.add(CartItem(
        productId: productId,
        shopId: shopId,
        name: name,
        price: price,
        unit: unit,
        quantity: quantity,
      ));
    }
    notifyListeners();
  }

  void removeItem(String productId, String shopId) {
    _items.removeWhere((item) => item.productId == productId && item.shopId == shopId);
    notifyListeners();
  }

  void updateQuantity(String productId, String shopId, int newQuantity) {
    final existingItem = _items.firstWhere(
      (item) => item.productId == productId && item.shopId == shopId,
      orElse: () => null,
    );

    if (existingItem != null) {
      _items[_items.indexOf(existingItem)] = CartItem(
        productId: productId,
        shopId: shopId,
        name: existingItem.name,
        price: existingItem.price,
        unit: existingItem.unit,
        quantity: newQuantity,
      );
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}