import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/weather.dart';

class WeatherService {
  static const String _apiKey = 'your_openweather_api_key'; // Replace with actual API key
  static const String _baseUrl = 'https://api.openweathermap.org/data/2.5';

  Future<Weather?> getCurrentWeather(String city) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/weather?q=$city&appid=$_apiKey&units=metric&lang=uz'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Weather(
          city: data['name'],
          temperature: data['main']['temp'].toDouble(),
          description: data['weather'][0]['description'],
          icon: data['weather'][0]['icon'],
          humidity: data['main']['humidity'],
          windSpeed: data['wind']['speed'].toDouble(),
          lastUpdated: DateTime.now(),
        );
      }
    } catch (e) {
      print('Weather API error: $e');
    }
    return _getDemoWeather(city);
  }

  Future<List<Weather>> getWeatherForecast(String city, int days) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/forecast?q=$city&appid=$_apiKey&units=metric&lang=uz&cnt=${days * 8}'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final forecasts = data['list'] as List;

        // Group by day and take first forecast per day
        final dailyForecasts = <Weather>[];
        final seenDates = <String>{};

        for (var forecast in forecasts) {
          final date = DateTime.fromMillisecondsSinceEpoch(forecast['dt'] * 1000);
          final dateKey = '${date.year}-${date.month}-${date.day}';

          if (!seenDates.contains(dateKey) && dailyForecasts.length < days) {
            dailyForecasts.add(Weather(
              city: data['city']['name'],
              temperature: forecast['main']['temp'].toDouble(),
              description: forecast['weather'][0]['description'],
              icon: forecast['weather'][0]['icon'],
              humidity: forecast['main']['humidity'],
              windSpeed: forecast['wind']['speed'].toDouble(),
              lastUpdated: date,
            ));
            seenDates.add(dateKey);
          }
        }

        return dailyForecasts;
      }
    } catch (e) {
      print('Weather forecast API error: $e');
    }
    return _getDemoForecast(city, days);
  }

  // Demo weather data for Yangiyer
  Weather _getDemoWeather(String city) {
    return Weather(
      city: 'Yangi Yer',
      temperature: 25.0,
      description: 'quyoshli',
      icon: '01d',
      humidity: 45,
      windSpeed: 3.5,
      lastUpdated: DateTime.now(),
    );
  }

  List<Weather> _getDemoForecast(String city, int days) {
    final forecasts = <Weather>[];
    final now = DateTime.now();

    for (int i = 0; i < days; i++) {
      final date = now.add(Duration(days: i));
      forecasts.add(Weather(
        city: 'Yangi Yer',
        temperature: 22.0 + (i * 2.0), // Varying temperature
        description: i % 2 == 0 ? 'quyoshli' : 'bulutli',
        icon: i % 2 == 0 ? '01d' : '02d',
        humidity: 40 + (i * 5),
        windSpeed: 2.0 + (i * 0.5),
        lastUpdated: date,
      ));
    }

    return forecasts;
  }
}