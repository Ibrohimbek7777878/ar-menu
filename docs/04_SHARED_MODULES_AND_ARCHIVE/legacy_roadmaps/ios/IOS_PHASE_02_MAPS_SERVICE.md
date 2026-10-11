# 🍎 iOS FAZA I-2: Google Maps Service (MapsService)
## Universal geocoding va lokatsiya servisi

---

## 🎯 Maqsad
Android va iOS da bir xil ishlaydigan **MapsService** yaratish. Bu servis:
- Koordinatalarni manzilga aylantiradi (reverse geocoding)
- Manzilni koordinataga aylantiradi (forward geocoding)
- Joriy lokatsiyani oladi

---

## 📄 Qaysi fayllar o'zgaradi?

### Yangi fayl:
- `store_guliston_v1/lib/services/maps_service.dart` (yangi)

### O'zgaradigan fayl:
- Hech qanday mavjud fayl o'zgarmaydi (faqat yangi fayl)

---

## 🔧 Nima qilish kerak?

### 1. Yangi fayl yarating
Fayl: `store_guliston_v1/lib/services/maps_service.dart`

Quyidagi kodni to'liq ko'chiring:

```dart
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

/// Google Maps uchun universal servis (iOS + Android)
/// 
/// Bu servis Google Maps, geocoding va geolocator paketlaridan foydalanadi.
/// Yandex Maps dan farqli o'laroq, bu iOS da ham ishlaydi.
class MapsService {
  
  /// 1. Reverse Geocoding: Koordinata → Manzil
  /// Masalan: (40.5966, 68.7786) → "Markaziy ko'cha, Yangi Yer, O'zbekiston"
  Future<String?> getAddressFromLatLng(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      
      if (placemarks.isEmpty) return null;
      
      final place = placemarks.first;
      final parts = <String>[];
      
      if (place.street != null && place.street!.isNotEmpty) parts.add(place.street!);
      if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
      if (place.country != null && place.country!.isNotEmpty) parts.add(place.country!);
      
      return parts.isNotEmpty ? parts.join(', ') : null;
    } catch (e) {
      print('MapsService - Reverse geocoding error: $e');
      return null;
    }
  }
  
  /// 2. Forward Geocoding: Manzil → Koordinata
  /// Masalan: "Yangi Yer, Markaziy ko'cha 45" → LatLng(40.5966, 68.7786)
  Future<LatLng?> getLatLngFromAddress(String address) async {
    try {
      final locations = await locationFromAddress(address);
      
      if (locations.isEmpty) return null;
      
      final location = locations.first;
      return LatLng(location.latitude, location.longitude);
    } catch (e) {
      print('MapsService - Forward geocoding error: $e');
      return null;
    }
  }
  
  /// 3. Joriy lokatsiyani olish
  /// iOS da permission dialog avtomatik chiqadi
  Future<LatLng?> getCurrentLocation() async {
    try {
      // iOS da permission tekshirish
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          print('MapsService - Location permission denied');
          return null;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        print('MapsService - Location permission permanently denied');
        return null;
      }
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      return LatLng(position.latitude, position.longitude);
    } catch (e) {
      print('MapsService - Current location error: $e');
      return null;
    }
  }
}

/// Koordinatalarni saqlash uchun oddiy class
class LatLng {
  final double latitude;
  final double longitude;
  
  LatLng(this.latitude, this.longitude);
  
  @override
  String toString() => 'LatLng($latitude, $longitude)';
}
```

### 2. Faylni saqlang
Faylni `store_guliston_v1/lib/services/maps_service.dart` ga saqlang.

---

## ✅ Natija
- ✅ `lib/services/maps_service.dart` yaratildi
- ✅ Reverse geocoding (koordinata → manzil)
- ✅ Forward geocoding (manzil → koordinata)
- ✅ Joriy lokatsiya olish (iOS permission bilan)
- ✅ Hech qanday Yandex Maps kodi yo'q
- ✅ Android va iOS da bir xil ishlaydi

---

## 🧪 Qanday tekshirish mumkin?

Bu servisni istalgan screen da test qilishingiz mumkin:

```dart
// Misol: location_map_screen.dart da
final mapsService = MapsService();

// Joriy lokatsiyani olish
final location = await mapsService.getCurrentLocation();

// Manzilni olish
final address = await mapsService.getAddressFromLatLng(40.5966, 68.7786);
```

---

## ❗ Agar xatolik bo'lsa

### Xato: "import 'package:geocoding/geocoding.dart' not found"
```bash
flutter pub get  # geocoding paketi o'rnatilganligini tekshiring
```

### Xato: "import 'package:geolocator/geolocator.dart' not found"
```bash
flutter pub get  # geolocator paketi o'rnatilganligini tekshiring
```

### Xato: "LatLng already defined"
Bu nom Google Maps da ham bor. Agar xato bo'lsa, class nomini `MapsLatLng` ga o'zgartiring.

---

## 📝 Eslatma

- Bu servis **Google Maps paketiga bog'liq emas** — geocoding va geolocator paketlaridan foydalanadi
- Google Maps UI (xarita ko'rinishi) keyingi fazada qo'shiladi
- Bu servis **ham iOS, ham Android** da bir xil ishlaydi

---

## 🔗 Keyingi faza
Faza I-3: iOS Permissions (Info.plist) — kamera va lokatsiya ruxsatlari