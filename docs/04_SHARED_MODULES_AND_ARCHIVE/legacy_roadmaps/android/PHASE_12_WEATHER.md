# ☁️ FAZA 12 — OB-HAVO INTEGRATSIYASI

## 🎯 Maqsad
OpenWeather API orqali Yangi Yer shahri uchun ob-havo ma'lumotini olish va ko'rsatish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 5. Ob-havo integratsiya
- `BACKEND_PROMPT_SENIOR.md` — Weather Service API endpointlari
- `GULISTON_PROJECT_TZ.md` — Admin Dashboard ob-havo vidjeti

## 🔧 Tafsilotlar

### 12.1 Weather model
```dart
class WeatherData {
  final double temp;
  final double feelsLike;
  final int humidity;
  final String description;
  final String icon;
  final double windSpeed;
  
  factory WeatherData.fromJson(Map<String, dynamic> json) {
    return WeatherData(
      temp: json['main']['temp'],
      feelsLike: json['main']['feels_like'],
      humidity: json['main']['humidity'],
      description: json['weather'][0]['description'],
      icon: 'https://openweathermap.org/img/wn/${json['weather'][0]['icon']}@2x.png',
      windSpeed: json['wind']['speed'],
    );
  }
}
```

### 12.2 Weather Service (SharedPreferences cache bilan)
```dart
class WeatherService {
  static const String _baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  static const double _lat = 40.5966; // Yangi Yer
  static const double _lon = 68.7786;
  
  Future<WeatherData?> getCurrentWeather(String apiKey) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl?lat=$_lat&lon=$_lon&appid=$apiKey&units=metric&lang=uz'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final weather = WeatherData.fromJson(data);
        
        // Cache to SharedPreferences (30 min)
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cached_weather', jsonEncode(data));
        await prefs.setInt('cached_weather_time', DateTime.now().millisecondsSinceEpoch);
        
        return weather;
      }
    } catch (e) {
      // Try cache
      return _getCachedWeather();
    }
    return null;
  }
  
  Future<WeatherData?> _getCachedWeather() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_weather');
    final cachedTime = prefs.getInt('cached_weather_time');
    
    if (cached != null && cachedTime != null) {
      // Check if cache is still valid (< 30 min)
      final age = DateTime.now().millisecondsSinceEpoch - cachedTime;
      if (age < 30 * 60 * 1000) {
        return WeatherData.fromJson(jsonDecode(cached));
      }
    }
    return null;
  }
}
```

### 12.3 Weather Provider
```dart
class WeatherProvider with ChangeNotifier {
  WeatherData? _weather;
  bool _isLoading = false;
  String? _error;
  
  Future<void> loadWeather(String apiKey) async {
    _isLoading = true;
    notifyListeners();
    
    final service = WeatherService();
    final weather = await service.getCurrentWeather(apiKey);
    
    if (weather != null) {
      _weather = weather;
      _error = null;
    } else {
      _error = 'Ob-havo ma\'lumotini olishda xato';
    }
    
    _isLoading = false;
    notifyListeners();
  }
}
```

### 12.4 Weather Widget
```dart
class WeatherWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<WeatherProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const SizedBox(
            width: 20, height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          );
        }
        
        if (provider.weather == null) {
          return const SizedBox.shrink();
        }
        
        final w = provider.weather!;
        return Row(
          children: [
            Image.network(w.icon, width: 30, height: 30),
            const SizedBox(width: 4),
            Text('${w.temp.toStringAsFixed(0)}°C', style: TextStyle(color: Colors.white)),
            const SizedBox(width: 8),
            Icon(Icons.water_drop, size: 14, color: Colors.white70),
            Text('${w.humidity}%', style: TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        );
      },
    );
  }
}
```

### 12.5 API kalit
- Admin Settings dan o'rnatiladi (Faza 9)
- Default: yo'q (bo'sh string)
- Agar kalit bo'lmasa, widget ko'rinmaydi (SizedBox.shrink)

## ✅ Natija
- Yangi Yer uchun ob-havo
- SharedPreferences cache (30 daqiqa)
- Admin API kalitni o'zgartira oladi
- Dashboard va AppBar da ko'rsatiladi
- Internet bo'lmasa cached ma'lumot