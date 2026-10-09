import 'package:flutter/material.dart';
import '../models/weather.dart';
import '../services/weather_service.dart';

class WeatherProvider with ChangeNotifier {
  final WeatherService _weatherService = WeatherService();

  Weather? _currentWeather;
  List<Weather> _forecast = [];
  bool _isLoading = false;
  String? _error;

  Weather? get currentWeather => _currentWeather;
  List<Weather> get forecast => _forecast;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadCurrentWeather(String apiKey) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentWeather = await _weatherService.getCurrentWeather(apiKey);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadWeatherForecast(String apiKey, int days) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _forecast = await _weatherService.getWeatherForecast(apiKey, days);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshWeather(String apiKey) async {
    await loadCurrentWeather(apiKey);
    await loadWeatherForecast(apiKey, 5); // 5 day forecast
  }

  void clearError() {
    _error = null;
    Future.microtask(() => notifyListeners());
  }

  // Load demo weather for Yangiyer
  void loadDemoWeather() {
    _currentWeather = Weather(
      city: 'Yangi Yer',
      temperature: 25.0,
      description: 'quyoshli',
      icon: '01d',
      humidity: 45,
      windSpeed: 3.5,
      lastUpdated: DateTime.now(),
    );

    _forecast = [
      Weather(
        city: 'Yangi Yer',
        temperature: 25.0,
        description: 'quyoshli',
        icon: '01d',
        humidity: 45,
        windSpeed: 3.5,
        lastUpdated: DateTime.now(),
      ),
      Weather(
        city: 'Yangi Yer',
        temperature: 24.0,
        description: 'bulutli',
        icon: '02d',
        humidity: 50,
        windSpeed: 4.0,
        lastUpdated: DateTime.now().add(Duration(days: 1)),
      ),
      Weather(
        city: 'Yangi Yer',
        temperature: 23.0,
        description: 'yomg\'irli',
        icon: '10d',
        humidity: 70,
        windSpeed: 5.0,
        lastUpdated: DateTime.now().add(Duration(days: 2)),
      ),
    ];

    Future.microtask(() => notifyListeners());
  }
}