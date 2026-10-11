# 🗺️ FAZA 11 — XARITA VA LOKATSIYA INTEGRATSIYASI

## 🎯 Maqsad
Google Maps + Yandex Maps integratsiyasi. Location picker, yaqin do'konlar, yo'l ko'rsatish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 6. Lokatsiya tanlash (LocationPickerScreen)
- `BACKEND_PROMPT_SENIOR.md` — Location Service (geocoding, distance)
- `GULISTON_PROJECT_TZ.md` — Xarita (Core Value)

## 🔧 Tafsilotlar

### 11.1 `LocationPickerScreen` (Buyurtma berishda)
```dart
class LocationPickerScreen extends StatefulWidget {
  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

Features:
- Google Map / Yandex Map ko'rinishi
- Marker qo'yish (tap orqali)
- Tanlangan nuqtadan address olish (reverse geocoding)
- Current location tugmasi (📍)
- Tasdiqlash tugmasi
```

### 11.2 Yaqin do'konlar
```dart
// Foydalanuvchi lokatsiyasiga yaqin do'konlarni topish
```sql
SELECT *, 
  (latitude - ?)*(latitude - ?) + (longitude - ?)*(longitude - ?) as distance_sq
FROM shops 
WHERE is_open = 1
ORDER BY distance_sq
LIMIT 10;
```

### 11.3 Yo'l ko'rsatish
```dart
// Google Maps orqali yo'l ko'rsatish
Future<void> openDirections(double lat, double lng) async {
  final url = 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
  await launchUrl(Uri.parse(url));
}

// Yandex Maps orqali
Future<void> openYandexDirections(double lat, double lng) async {
  final url = 'https://yandex.uz/maps/?rtext=~$lat,$lng';
  await launchUrl(Uri.parse(url));
}
```

### 11.4 Geolokatsiya
```dart
// Foydalanuvchi joriy lokatsiyasini olish
import 'package:geolocator/geolocator.dart';

Future<Position> getCurrentLocation() async {
  LocationPermission permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  return await Geolocator.getCurrentPosition(
    desiredAccuracy: LocationAccuracy.high,
  );
}
```

### 11.5 Paketlar
```yaml
dependencies:
  google_maps_flutter: ^2.7.0
  yandex_mapkit: ^4.1.0
  geolocator: ^10.1.0
  geocoding: ^3.0.0
  url_launcher: ^6.2.0
  permission_handler: ^11.4.0
```

## ✅ Natija
- Google/Yandex Maps integratsiyasi
- Location picker (buyurtma berishda)
- Yaqin do'konlar
- Yo'l ko'rsatish (Google/Yandex Maps orqali)
- Geolokatsiya ruxsati (permission_handler)