import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/shop.dart';
import 'auth_service.dart';

class ShopService {
  static const String _baseUrl = 'https://api.storeguliston.com'; // Replace with actual API
  final AuthService _authService = AuthService();

  Future<List<Shop>> getShops() async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/shops'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        return data.map((shop) => Shop.fromJson(shop)).toList();
      }
    } catch (e) {
      print('Get shops error: $e');
    }
    return _getDemoShops(); // Return demo data if API fails
  }

  Future<Shop?> getShopById(String id) async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/shops/$id'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Shop.fromJson(data);
      }
    } catch (e) {
      print('Get shop error: $e');
    }
    return null;
  }

  Future<List<Shop>> getShopsByCategory(String category) async {
    final allShops = await getShops();
    return allShops.where((shop) => shop.category == category).toList();
  }

  Future<List<Shop>> searchShops(String query) async {
    final allShops = await getShops();
    return allShops.where((shop) =>
        shop.name.toLowerCase().contains(query.toLowerCase()) ||
        shop.address.toLowerCase().contains(query.toLowerCase())).toList();
  }

  // Admin functions
  Future<Shop?> createShop(Shop shop) async {
    try {
      final token = await _authService.getToken();
      final response = await http.post(
        Uri.parse('$_baseUrl/shops'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(shop.toJson()),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Shop.fromJson(data);
      }
    } catch (e) {
      print('Create shop error: $e');
    }
    return null;
  }

  Future<Shop?> updateShop(String id, Shop shop) async {
    try {
      final token = await _authService.getToken();
      final response = await http.put(
        Uri.parse('$_baseUrl/shops/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(shop.toJson()),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Shop.fromJson(data);
      }
    } catch (e) {
      print('Update shop error: $e');
    }
    return null;
  }

  Future<bool> deleteShop(String id) async {
    try {
      final token = await _authService.getToken();
      final response = await http.delete(
        Uri.parse('$_baseUrl/shops/$id'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 204;
    } catch (e) {
      print('Delete shop error: $e');
    }
    return false;
  }

  // Demo data for Yangiyer city
  List<Shop> _getDemoShops() {
    return [
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
  }
}