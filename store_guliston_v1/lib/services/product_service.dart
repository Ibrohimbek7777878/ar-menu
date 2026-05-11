import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import 'auth_service.dart';

class ProductService {
  static const String _baseUrl = 'https://api.storeguliston.com'; // Replace with actual API
  final AuthService _authService = AuthService();

  Future<List<Product>> getProductsByShop(String shopId) async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/shops/$shopId/products'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        return data.map((product) => Product.fromJson(product)).toList();
      }
    } catch (e) {
      print('Get products error: $e');
    }
    return _getDemoProducts(shopId); // Return demo data if API fails
  }

  Future<Product?> getProductById(String shopId, String productId) async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/shops/$shopId/products/$productId'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Product.fromJson(data);
      }
    } catch (e) {
      print('Get product error: $e');
    }
    return null;
  }

  Future<List<Product>> searchProducts(String shopId, String query) async {
    final allProducts = await getProductsByShop(shopId);
    return allProducts.where((product) =>
        product.name.toLowerCase().contains(query.toLowerCase()) ||
        product.description.toLowerCase().contains(query.toLowerCase())).toList();
  }

  Future<List<Product>> getProductsByCategory(String shopId, String category) async {
    final allProducts = await getProductsByShop(shopId);
    return allProducts.where((product) => product.category == category).toList();
  }

  // Admin functions
  Future<Product?> createProduct(Product product) async {
    try {
      final token = await _authService.getToken();
      final response = await http.post(
        Uri.parse('$_baseUrl/shops/${product.shopId}/products'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(product.toJson()),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Product.fromJson(data);
      }
    } catch (e) {
      print('Create product error: $e');
    }
    return null;
  }

  Future<Product?> updateProduct(String shopId, String productId, Product product) async {
    try {
      final token = await _authService.getToken();
      final response = await http.put(
        Uri.parse('$_baseUrl/shops/$shopId/products/$productId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(product.toJson()),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Product.fromJson(data);
      }
    } catch (e) {
      print('Update product error: $e');
    }
    return null;
  }

  Future<bool> deleteProduct(String shopId, String productId) async {
    try {
      final token = await _authService.getToken();
      final response = await http.delete(
        Uri.parse('$_baseUrl/shops/$shopId/products/$productId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 204;
    } catch (e) {
      print('Delete product error: $e');
    }
    return false;
  }

  // Demo data for Yangiyer shops
  List<Product> _getDemoProducts(String shopId) {
    if (shopId == 'shop_1') { // Yangi Yer Market
      return [
        Product(
          id: 'prod_1',
          shopId: shopId,
          name: 'Qora choy',
          description: 'Sifatli qora choy, 100gr',
          price: 15000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/black_tea.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 50,
        ),
        Product(
          id: 'prod_2',
          shopId: shopId,
          name: 'Tuxum',
          description: 'Taza tuxum, 10 dona',
          price: 25000,
          category: 'oziq-ovqat',
          imageUrl: 'assets/images/products/eggs.jpg',
          unit: 'dona',
          isAvailable: true,
          stock: 100,
        ),
        Product(
          id: 'prod_3',
          shopId: shopId,
          name: 'Kofe',
          description: 'Instant kofe, 200gr',
          price: 45000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/coffee.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 30,
        ),
      ];
    } else if (shopId == 'shop_2') { // Choy va Kofe Do'koni
      return [
        Product(
          id: 'prod_4',
          shopId: shopId,
          name: 'Yashil choy',
          description: 'Yangi yig\'ilgan yashil choy',
          price: 20000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/green_tea.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 25,
        ),
        Product(
          id: 'prod_5',
          shopId: shopId,
          name: 'Qahva',
          description: 'Turkiy qahva, 100gr',
          price: 35000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/turkish_coffee.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 20,
        ),
      ];
    } else if (shopId == 'shop_3') { // Go'sht va Sut
      return [
        Product(
          id: 'prod_6',
          shopId: shopId,
          name: 'Mol go\'shti',
          description: 'Taza mol go\'shti, 1kg',
          price: 120000,
          category: 'go\'sht',
          imageUrl: 'assets/images/products/beef.jpg',
          unit: 'kg',
          isAvailable: true,
          stock: 15,
        ),
        Product(
          id: 'prod_7',
          shopId: shopId,
          name: 'Sut',
          description: 'Taza sut, 1 litr',
          price: 8000,
          category: 'sut',
          imageUrl: 'assets/images/products/milk.jpg',
          unit: 'litr',
          isAvailable: true,
          stock: 40,
        ),
      ];
    }
    return [];
  }
}