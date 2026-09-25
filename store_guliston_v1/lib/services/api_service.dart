import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' hide Category;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/category.dart';
import '../models/shop.dart';
import '../models/product.dart';
import '../models/order.dart';
import '../models/shop_template.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Default server URLs
  // Android emulator: 10.0.2.2; Real device / Localhost / Web: 127.0.0.1
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:8000/api/v1/flutter';
    }
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:8000/api/v1/flutter';
    }
    return 'http://127.0.0.1:8000/api/v1/flutter';
  }

  Future<String> _getBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final customUrl = prefs.getString('api_base_url');
      if (customUrl != null && customUrl.isNotEmpty) {
        return customUrl;
      }
    } catch (_) {}
    return defaultBaseUrl;
  }

  Future<String> getBaseUrl() => _getBaseUrl();
  Future<Map<String, String>> getHeaders() => _getHeaders();

  Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_access_token');
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    } catch (_) {}
    return headers;
  }

  // ─── AUTH ────────────────────────────────────────────────────────

  String _extractError(dynamic data, String fallback) {
    if (data is Map) {
      if (data['error'] != null) return data['error'].toString();
      if (data['detail'] != null) return data['detail'].toString();
      final parts = <String>[];
      data.forEach((_, v) {
        if (v is List && v.isNotEmpty) parts.add(v.join(', '));
      });
      if (parts.isNotEmpty) return parts.join('\n');
    }
    return fallback;
  }

  Future<Map<String, dynamic>> _saveAuthData(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_access_token', data['access']?.toString() ?? '');
      if (data['refresh'] != null) {
        await prefs.setString('jwt_refresh_token', data['refresh'].toString());
      }
      final customer = data['customer'];
      if (customer is Map<String, dynamic>) {
        await prefs.setString('customer_name', customer['name']?.toString() ?? '');
        await prefs.setString('customer_phone', customer['phone']?.toString() ?? '');
      }
    } catch (_) {}
    return data;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String phone,
    required String password,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/auth/register/');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'phone': phone,
        'password': password,
        'password_confirm': password,
      }),
    ).timeout(const Duration(seconds: 8));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201) {
      return _saveAuthData(data as Map<String, dynamic>);
    }
    throw Exception(_extractError(data, 'Registratsiyada xatolik'));
  }

  Future<Map<String, dynamic>> login({required String phone, required String password}) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/auth/login/');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'password': password}),
    ).timeout(const Duration(seconds: 8));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) {
      return _saveAuthData(data as Map<String, dynamic>);
    }
    throw Exception(_extractError(data, 'Kirishda xatolik'));
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_access_token');
      await prefs.remove('jwt_refresh_token');
      await prefs.remove('customer_name');
      await prefs.remove('customer_phone');
    } catch (_) {}
  }

  Future<bool> isLoggedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_access_token');
      return token != null && token.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  // ─── CATEGORIES ──────────────────────────────────────────────────
  Future<List<Category>> getCategories() async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/categories/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) => Category.fromJson(item as Map<String, dynamic>)).toList();
    }
    throw Exception('Kategoriyalarni yuklashda xatolik: ${response.statusCode}');
  }

  // ─── SHOPS ───────────────────────────────────────────────────────
  Future<List<Shop>> getShops({String? city, String? search, String? categoryId, String? storeType}) async {
    final baseUrl = await _getBaseUrl();
    final queryParams = <String, String>{};
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (categoryId != null && categoryId.isNotEmpty) queryParams['category'] = categoryId;
    if (storeType != null && storeType.isNotEmpty && storeType != 'all') queryParams['store_type'] = storeType;

    final url = Uri.parse('$baseUrl/shops/').replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      final shops = list.map((item) => Shop.fromJson(item as Map<String, dynamic>)).toList();
      if (city != null && city.isNotEmpty) {
        return shops.where((s) => s.city == null || s.city!.isEmpty || s.city == city).toList();
      }
      return shops;
    }
    throw Exception('Do\'konlarni yuklashda xatolik: ${response.statusCode}');
  }

  Future<Shop?> getShopDetail(String slugOrId) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/shops/$slugOrId/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final map = jsonDecode(utf8.decode(response.bodyBytes));
      return Shop.fromJson(map as Map<String, dynamic>);
    }
    return null;
  }

  // ─── PRODUCTS ────────────────────────────────────────────────────
  Future<List<Product>> getProducts(String shopId, {String? categoryId, String? search}) async {
    final baseUrl = await _getBaseUrl();
    final queryParams = <String, String>{};
    if (categoryId != null && categoryId.isNotEmpty) queryParams['category'] = categoryId;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final url = Uri.parse('$baseUrl/shops/$shopId/products/').replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) {
        final map = item as Map<String, dynamic>;
        map['shopId'] = shopId;
        return Product.fromJson(map);
      }).toList();
    }
    throw Exception('Mahsulotlarni yuklashda xatolik: ${response.statusCode}');
  }

  Future<List<Product>> getAllProducts({String? categoryId, String? search}) async {
    final baseUrl = await _getBaseUrl();
    final queryParams = <String, String>{};
    if (categoryId != null && categoryId.isNotEmpty) queryParams['category'] = categoryId;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final url = Uri.parse('$baseUrl/products/').replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) => Product.fromJson(item as Map<String, dynamic>)).toList();
    }
    throw Exception('Mahsulotlarni yuklashda xatolik: ${response.statusCode}');
  }

  Future<List<Product>> searchProducts(String query) async {
    if (query.isEmpty) return [];
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/search/').replace(queryParameters: {'q': query});
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) => Product.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  // ─── COUPON VALIDATION ───────────────────────────────────────────
  Future<Map<String, dynamic>> validateCoupon(String code, double orderAmount) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/coupons/validate/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode({
        'code': code,
        'order_amount': orderAmount,
      }),
    ).timeout(const Duration(seconds: 5));

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) {
      return {
        'valid': true,
        'discount_amount': (data['discount_amount'] as num?)?.toDouble() ?? 0.0,
        'discount_percent': data['discount_percent'] ?? 0,
        'message': data['message'] ?? 'Kupon muvaffaqiyatli qo\'llandi',
      };
    }
    return {
      'valid': false,
      'error': data['error'] ?? 'Kupon yaroqsiz',
    };
  }

  // ─── WISHLIST ────────────────────────────────────────────────────
  Future<List<Product>> getWishlist(String phone) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/wishlist/').replace(queryParameters: {'phone': phone});
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) => Product.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<bool> toggleWishlist(int productId, String phone) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/wishlist/toggle/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode({
        'product_id': productId,
        'phone': phone,
      }),
    ).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      return data['is_favorite'] == true;
    }
    return false;
  }

  // ─── ORDERS ──────────────────────────────────────────────────────
  Future<Order?> createOrder(Map<String, dynamic> orderPayload) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/orders/create/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode(orderPayload),
    ).timeout(const Duration(seconds: 8));

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      return Order.fromJson(data as Map<String, dynamic>);
    }
    final errorData = jsonDecode(utf8.decode(response.bodyBytes));
    throw Exception(errorData['error'] ?? 'Buyurtma yaratishda xatolik yuz berdi');
  }

  Future<List<Order>> getOrders({String? phone}) async {
    final baseUrl = await _getBaseUrl();
    final queryParams = <String, String>{};
    if (phone != null && phone.isNotEmpty) queryParams['phone'] = phone;

    final url = Uri.parse('$baseUrl/orders/').replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((item) => Order.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  // ─── SHOP TEMPLATES ──────────────────────────────────────────────

  Future<Map<String, dynamic>> getTemplates({String? category}) async {
    final baseUrl = await _getBaseUrl();
    final queryParams = <String, String>{};
    if (category != null && category.isNotEmpty) queryParams['category'] = category;

    final url = Uri.parse('$baseUrl/templates/').replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    throw Exception('Shablonlar yuklanmadi');
  }

  Future<ShopTemplate> getTemplateDetail(String slug) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/templates/$slug/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      return ShopTemplate.fromJson(jsonDecode(utf8.decode(response.bodyBytes)));
    }
    throw Exception('Shablon tafsilotlari yuklanmadi');
  }

  Future<Map<String, dynamic>> applyTemplate(
    String templateSlug, {
    Map<String, dynamic>? layout,
    bool saveAsTemplate = false,
    String? templateName,
    Map<String, dynamic>? colors,
  }) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/templates/apply/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode({
        'template_slug': templateSlug,
        if (layout != null) 'layout': layout,
        'save_as_template': saveAsTemplate,
        if (templateName != null) 'template_name': templateName,
        if (colors != null) 'colors': colors,
      }),
    ).timeout(const Duration(seconds: 5));

    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    final errorData = jsonDecode(utf8.decode(response.bodyBytes));
    throw Exception(errorData['error'] ?? 'Shablon qo\'llashda xatolik');
  }

  // ─── SHOP BUILDER: import + manual ───────────────────────────────

  Future<List<Shop>> getMyShops() async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/my-shops/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));
    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.map((e) => Shop.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Do\'konlar yuklanmadi');
  }

  Future<Map<String, dynamic>> importProducts({required int targetShopId, required int sourceShopId, List<int>? productIds}) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/shops/$targetShopId/import-products/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode({
        'source_shop_id': sourceShopId,
        if (productIds != null) 'product_ids': productIds,
      }),
    ).timeout(const Duration(seconds: 8));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) return data as Map<String, dynamic>;
    throw Exception(data['error'] ?? 'Import xatoligi');
  }

  Future<Map<String, dynamic>> setManualProducts({required int shopId, required int sectionIndex, required List<int> productIds}) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/shops/$shopId/manual-products/');
    final response = await http.post(
      url,
      headers: await _getHeaders(),
      body: jsonEncode({'section_index': sectionIndex, 'product_ids': productIds}),
    ).timeout(const Duration(seconds: 5));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) return data as Map<String, dynamic>;
    throw Exception(data['error'] ?? 'Biriktirish xatoligi');
  }

  // ─── BUNDLE TO'PLAM (S5-3) ─────────────────────────────────────

  Future<List<Map<String, dynamic>>> getBundles(int shopId) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/shops/$shopId/bundles/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));
    if (response.statusCode == 200) {
      final List list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<Map<String, dynamic>> createBundle({required int shopId, required String name, required List<int> productIds, required double bundlePrice}) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/bundles/create/');
    final response = await http.post(url, headers: await _getHeaders(), body: jsonEncode({'shop_id': shopId, 'name': name, 'product_ids': productIds, 'bundle_price': bundlePrice})).timeout(const Duration(seconds: 5));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201 || response.statusCode == 200) return data as Map<String, dynamic>;
    throw Exception(data['error'] ?? 'Bundle yaratilmadi');
  }

  Future<void> incrementShopView(String slug) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/shops/$slug/view/');
      await http.post(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  Future<void> incrementProductView(String slug) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/products/$slug/view/');
      await http.post(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  // ─── SHARHLAR (S5-4) ─────────────────────────────────────

  Future<List<Map<String, dynamic>>> getShopReviews(int shopId) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/shops/$shopId/reviews/');
    final response = await http.get(url, headers: await _getHeaders()).timeout(const Duration(seconds: 5));
    if (response.statusCode == 200) {
      final List list = jsonDecode(utf8.decode(response.bodyBytes));
      return list.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<Map<String, dynamic>> createReview({required int productId, required int rating, String comment = '', String phone = ''}) async {
    final baseUrl = await _getBaseUrl();
    final url = Uri.parse('$baseUrl/reviews/create/');
    final response = await http.post(url, headers: await _getHeaders(), body: jsonEncode({'product_id': productId, 'rating': rating, 'comment': comment, 'phone': phone})).timeout(const Duration(seconds: 5));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201 || response.statusCode == 200) return data as Map<String, dynamic>;
    throw Exception(data['error'] ?? 'Sharh yozilmadi');
  }
}
