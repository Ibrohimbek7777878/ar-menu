import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// Agro & Food Onboarding Service — Oziq-ovqat va Dehqon Bozori tovarlarini tezkor kiritish xizmati.
class AgroOnboardingService {
  final ApiService _api = ApiService();

  Future<List<Map<String, dynamic>>> getStarterPacks() async {
    try {
      final baseUrl = await _api.getBaseUrl();
      final url = Uri.parse('$baseUrl/seller/agro/starter-packs/');
      final response = await http.get(url, headers: await _api.getHeaders()).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('AgroOnboardingService getStarterPacks error: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> applyStarterPack({required int packId, required String shopId}) async {
    final baseUrl = await _api.getBaseUrl();
    final url = Uri.parse('$baseUrl/seller/agro/starter-packs/apply/');
    final response = await http.post(
      url,
      headers: await _api.getHeaders(),
      body: jsonEncode({
        'pack_id': packId,
        'shop_id': int.tryParse(shopId) ?? shopId,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data as Map<String, dynamic>;
    }
    throw Exception(data['error'] ?? 'To\'plamni yuklashda xatolik yuz berdi');
  }

  Future<List<Map<String, dynamic>>> masterSearch({String? query, String? sector, String? barcode}) async {
    try {
      final baseUrl = await _api.getBaseUrl();
      final queryParams = <String, String>{};
      if (query != null && query.isNotEmpty) queryParams['q'] = query;
      if (sector != null && sector.isNotEmpty) queryParams['sector'] = sector;
      if (barcode != null && barcode.isNotEmpty) queryParams['barcode'] = barcode;

      final url = Uri.parse('$baseUrl/seller/agro/master-search/').replace(
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final response = await http.get(url, headers: await _api.getHeaders()).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(utf8.decode(response.bodyBytes));
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('AgroOnboardingService masterSearch error: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> claimProduct({
    required int masterProductId,
    required String shopId,
    double? price,
    int? stock,
  }) async {
    final baseUrl = await _api.getBaseUrl();
    final url = Uri.parse('$baseUrl/seller/agro/claim-product/');
    final body = <String, dynamic>{
      'master_product_id': masterProductId,
      'shop_id': int.tryParse(shopId) ?? shopId,
    };
    if (price != null) body['price'] = price;
    if (stock != null) body['stock'] = stock;

    final response = await http.post(
      url,
      headers: await _api.getHeaders(),
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 10));

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data as Map<String, dynamic>;
    }
    throw Exception(data['error'] ?? 'Mahsulotni qo\'shishda xatolik');
  }

  Future<Map<String, dynamic>> quickPriceUpdate({
    required String shopId,
    required List<Map<String, dynamic>> updates,
  }) async {
    final baseUrl = await _api.getBaseUrl();
    final url = Uri.parse('$baseUrl/seller/agro/quick-price-update/');
    final response = await http.post(
      url,
      headers: await _api.getHeaders(),
      body: jsonEncode({
        'shop_id': int.tryParse(shopId) ?? shopId,
        'updates': updates,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) {
      return data as Map<String, dynamic>;
    }
    throw Exception(data['error'] ?? 'Narxlarni yangilashda xatolik');
  }
}
