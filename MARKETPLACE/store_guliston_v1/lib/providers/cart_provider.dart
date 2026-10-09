import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/order.dart';

class CartItem {
  final Product product;
  int quantity;

  CartItem({
    required this.product,
    this.quantity = 1,
  });

  double get totalPrice => product.price * quantity;

  CartItem copyWith({int? quantity}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': product.id,
      'quantity': quantity,
      'price': product.price,
      'totalPrice': totalPrice,
    };
  }
}

class CartProvider with ChangeNotifier {
  final Map<String, CartItem> _items = {}; // shopId -> CartItem

  Map<String, CartItem> get items => _items;
  List<CartItem> get cartItems => _items.values.toList();

  int get itemCount => _items.length;
  int get totalQuantity => _items.values.fold(0, (sum, item) => sum + item.quantity);
  double get totalAmount => _items.values.fold(0.0, (sum, item) => sum + item.totalPrice);

  bool get isEmpty => _items.isEmpty;

  void addItem(Product product) {
    if (_items.containsKey(product.id)) {
      _items[product.id]!.quantity++;
    } else {
      _items[product.id] = CartItem(product: product);
    }
    Future.microtask(() => notifyListeners());
  }

  void removeItem(String productId) {
    _items.remove(productId);
    Future.microtask(() => notifyListeners());
  }

  void updateQuantity(String productId, int quantity) {
    if (_items.containsKey(productId)) {
      if (quantity <= 0) {
        removeItem(productId);
      } else {
        _items[productId]!.quantity = quantity;
        Future.microtask(() => notifyListeners());
      }
    }
  }

  void incrementQuantity(String productId) {
    if (_items.containsKey(productId)) {
      _items[productId]!.quantity++;
      Future.microtask(() => notifyListeners());
    }
  }

  void decrementQuantity(String productId) {
    if (_items.containsKey(productId)) {
      if (_items[productId]!.quantity > 1) {
        _items[productId]!.quantity--;
      } else {
        removeItem(productId);
      }
      Future.microtask(() => notifyListeners());
    }
  }

  CartItem? getItem(String productId) {
    return _items[productId];
  }

  bool containsProduct(String productId) {
    return _items.containsKey(productId);
  }

  void clearCart() {
    _items.clear();
    Future.microtask(() => notifyListeners());
  }

  // Convert cart to order items
  List<OrderItem> toOrderItems() {
    return _items.values.map((cartItem) {
      return OrderItem(
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        quantity: cartItem.quantity,
        price: cartItem.product.price,
        unit: cartItem.product.unit,
      );
    }).toList();
  }

  // Get items grouped by shop
  Map<String, List<CartItem>> getItemsByShop() {
    final Map<String, List<CartItem>> shopItems = {};

    for (final item in _items.values) {
      final shopId = item.product.shopId;
      if (!shopItems.containsKey(shopId)) {
        shopItems[shopId] = [];
      }
      shopItems[shopId]!.add(item);
    }

    return shopItems;
  }

  // Get total for specific shop
  double getTotalForShop(String shopId) {
    final shopItems = getItemsByShop()[shopId] ?? [];
    return shopItems.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  // Check if cart has items from multiple shops
  bool hasMultipleShops() {
    return getItemsByShop().length > 1;
  }

  // Get shop names in cart
  List<String> getShopNames() {
    final shopNames = <String>{};
    for (final item in _items.values) {
      shopNames.add(item.product.shopId); // You might want to store shop name in CartItem
    }
    return shopNames.toList();
  }
}
