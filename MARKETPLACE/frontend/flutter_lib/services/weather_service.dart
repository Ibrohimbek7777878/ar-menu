import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/weather.dart';

class WeatherService {
  static const String _weatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
  static const String _forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
  static const double _lat = 40.5966;
  static const double _lon = 68.7786;

  Future<Weather?> getCurrentWeather(String apiKey) async {
    if (apiKey.isEmpty) {
      return _getCachedWeather();
    }

    try {
      final response = await http.get(
        Uri.parse('$_weatherUrl?lat=$_lat&lon=$_lon&appid=$apiKey&units=metric&lang=uz'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final weather = _parseCurrentWeather(data);
        await _saveCachedWeather(weather);
        return weather;
      }
    } catch (_) {
      return _getCachedWeather();
    }
    return _getCachedWeather();
  }

  Future<List<Weather>> getWeatherForecast(String apiKey, int days) async {
    if (apiKey.isEmpty) {
      return _getCachedForecast();
    }

    try {
      final response = await http.get(
        Uri.parse('$_forecastUrl?lat=$_lat&lon=$_lon&appid=$apiKey&units=metric&lang=uz'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final forecast = _parseForecast(data, days);
        await _saveCachedForecast(forecast);
        return forecast;
      }
    } catch (_) {
      return _getCachedForecast();
    }
    return _getCachedForecast();
  }

  Weather _parseCurrentWeather(Map<String, dynamic> data) {
    final main = data['main'] as Map<String, dynamic>? ?? {};
    final weatherInfo = (data['weather'] as List<dynamic>?)?.first as Map<String, dynamic>? ?? {};
    final wind = data['wind'] as Map<String, dynamic>? ?? {};

    return Weather(
      city: data['name'] as String? ?? 'Yangi Yer',
      temperature: (main['temp'] as num?)?.toDouble() ?? 0.0,
      description: weatherInfo['description'] as String? ?? 'Nomalum',
      icon: weatherInfo['icon'] as String? ?? '01d',
      humidity: (main['humidity'] as num?)?.toInt() ?? 0,
      windSpeed: (wind['speed'] as num?)?.toDouble() ?? 0.0,
      lastUpdated: DateTime.now(),
    );
  }

  List<Weather> _parseForecast(Map<String, dynamic> data, int days) {
    final list = data['list'] as List<dynamic>? ?? [];
    final city = (data['city'] as Map<String, dynamic>?)?['name'] as String? ?? 'Yangi Yer';
    final Map<String, Weather> daily = {};

    for (final item in list.cast<Map<String, dynamic>>()) {
      final timestamp = item['dt'] as int?;
      if (timestamp == null) continue;
      final date = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
      final dayKey = DateTime(date.year, date.month, date.day).toIso8601String();
      if (daily.containsKey(dayKey)) continue;

      final main = item['main'] as Map<String, dynamic>? ?? {};
      final weatherInfo = (item['weather'] as List<dynamic>?)?.first as Map<String, dynamic>? ?? {};
      final wind = item['wind'] as Map<String, dynamic>? ?? {};

      daily[dayKey] = Weather(
        city: city,
        temperature: (main['temp'] as num?)?.toDouble() ?? 0.0,
        description: weatherInfo['description'] as String? ?? 'Nomalum',
        icon: weatherInfo['icon'] as String? ?? '01d',
        humidity: (main['humidity'] as num?)?.toInt() ?? 0,
        windSpeed: (wind['speed'] as num?)?.toDouble() ?? 0.0,
        lastUpdated: date,
      );

      if (daily.length >= days) {
        break;
      }
    }

    return daily.values.toList();
  }

  Future<void> _saveCachedWeather(Weather weather) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cached_weather', jsonEncode(weather.toJson()));
    await prefs.setInt('cached_weather_time', DateTime.now().millisecondsSinceEpoch);
  }

  Future<void> _saveCachedForecast(List<Weather> forecast) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cached_weather_forecast', jsonEncode(forecast.map((e) => e.toJson()).toList()));
    await prefs.setInt('cached_weather_forecast_time', DateTime.now().millisecondsSinceEpoch);
  }

  Future<Weather?> _getCachedWeather() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_weather');
    final cachedTime = prefs.getInt('cached_weather_time');

    if (cached != null && cachedTime != null) {
      final age = DateTime.now().millisecondsSinceEpoch - cachedTime;
      if (age < 30 * 60 * 1000) {
        return Weather.fromJson(jsonDecode(cached) as Map<String, dynamic>);
      }
    }
    return null;
  }

  Future<List<Weather>> _getCachedForecast() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_weather_forecast');
    final cachedTime = prefs.getInt('cached_weather_forecast_time');

    if (cached != null && cachedTime != null) {
      final age = DateTime.now().millisecondsSinceEpoch - cachedTime;
      if (age < 30 * 60 * 1000) {
        final list = jsonDecode(cached) as List<dynamic>;
        return list.map((item) => Weather.fromJson(item as Map<String, dynamic>)).toList();
      }
    }
    return [];
  }
}