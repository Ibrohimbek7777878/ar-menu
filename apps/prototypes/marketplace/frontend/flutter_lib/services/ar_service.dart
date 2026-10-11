import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

class ArService {
  final ApiService _api = ApiService();

  Future<Map<String, dynamic>?> getArDetail(int productId) async {
    final base = await _api.getBaseUrl();
    final headers = await _api.getHeaders();
    final url = Uri.parse('$base/ar/$productId/');
    final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) return jsonDecode(utf8.decode(res.bodyBytes));
    return null;
  }

  Future<void> logArView({required int productId, String sessionId = '', int durationSec = 0, String mode = '3d-only'}) async {
    try {
      final base = await _api.getBaseUrl();
      final headers = await _api.getHeaders();
      final url = Uri.parse('$base/ar/view/');
      await http.post(url, headers: headers, body: jsonEncode({'product_id': productId, 'session_id': sessionId, 'duration_sec': durationSec, 'mode': mode})).timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  Future<List<Map<String, dynamic>>> searchLibrary(String q) async {
    final base = await _api.getBaseUrl();
    final headers = await _api.getHeaders();
    final url = Uri.parse('$base/ar/library/search/').replace(queryParameters: {'q': q});
    final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) {
      final List list = jsonDecode(utf8.decode(res.bodyBytes));
      return list.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<Map<String, dynamic>?> resolveTable(String token) async {
    final base = await _api.getBaseUrl();
    final headers = await _api.getHeaders();
    final url = Uri.parse('$base/t/$token/');
    final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) return jsonDecode(utf8.decode(res.bodyBytes));
    return null;
  }

  Future<Map<String, dynamic>?> getRestaurantTables(int shopId) async {
    final base = await _api.getBaseUrl();
    final headers = await _api.getHeaders();
    final url = Uri.parse('$base/restaurant/$shopId/tables/');
    final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) return jsonDecode(utf8.decode(res.bodyBytes));
    return null;
  }
}
