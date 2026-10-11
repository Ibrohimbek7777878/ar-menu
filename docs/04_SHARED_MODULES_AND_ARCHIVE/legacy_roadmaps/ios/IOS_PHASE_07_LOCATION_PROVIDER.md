# 🍎 iOS FAZA I-7: Location Provider — iOS permission
## iOS da lokatsiya ruxsatini to'g'ri sozlash

---

## 🎯 Maqsad
`location_provider.dart` da iOS uchun lokatsiya permission handler ni to'g'rilash. iOS da Android dan farqli ravishda permission so'rash tartibi boshqacha.

---

## 📄 Qaysi fayl o'zgaradi?
- `store_guliston_v1/lib/providers/location_provider.dart`

---

## 🔧 Nima qilish kerak?

### 1. location_provider.dart ni oching

Fayl: `store_guliston_v1/lib/providers/location_provider.dart`

### 2. Mavjud kodni quyidagi bilan almashtiring

```dart
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationProvider with ChangeNotifier {
  Position? _currentPosition;
  bool _locationPermissionGranted = false;
  String? _error;
  bool _isLoading = false;

  Position? get currentPosition => _currentPosition;
  bool get locationPermissionGranted => _locationPermissionGranted;
  String? get error => _error;
  bool get isLoading => _isLoading;

  /// 1. Lokatsiya ruxsatini tekshirish
  /// iOS da: Settings → Privacy → Location Services dan yoqish mumkin
  Future<bool> checkLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _error = 'Lokatsiya xizmati o\'chirilgan. Iltimos, sozlamalardan yoqing.';
      _locationPermissionGranted = false;
      notifyListeners();
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      // iOS da birinchi marta so'ralganda dialog chiqadi
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _error = 'Lokatsiya ruxsati berilmadi.';
        _locationPermissionGranted = false;
        notifyListeners();
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      // iOS da "While Using" yoki "Always" tanlanmasa
      _error = 'Lokatsiya ruxsati butunlay rad etilgan. Sozlamalardan yoqing.';
      _locationPermissionGranted = false;
      notifyListeners();
      return false;
    }

    _locationPermissionGranted = true;
    _error = null;
    notifyListeners();
    return true;
  }

  /// 2. Joriy lokatsiyani olish
  Future<void> getCurrentLocation() async {
    setState(true);
    
    final hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      setState(false);
      return;
    }

    try {
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _error = null;
    } catch (e) {
      _error = 'Lokatsiyani aniqlashda xatolik: $e';
      _currentPosition = null;
    }

    setState(false);
  }

  /// 3. Koordinatadan manzil olish
  Future<String> getAddressFromCurrentLocation() async {
    if (_currentPosition == null) return 'Manzil aniqlanmadi';

    try {
      final placemarks = await placemarkFromCoordinates(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );
      
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        final parts = <String>[];
        if (place.street != null && place.street!.isNotEmpty) parts.add(place.street!);
        if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
        if (place.country != null && place.country!.isNotEmpty) parts.add(place.country!);
        return parts.isNotEmpty ? parts.join(', ') : 'Manzil aniqlanmadi';
      }
    } catch (e) {
      print('Reverse geocoding error: $e');
    }
    
    return 'Manzil aniqlanmadi';
  }

  /// 4. Demo joy (test uchun)
  void setDemoLocation() {
    _currentPosition = Position(
      latitude: 40.5966,
      longitude: 68.7786,
      timestamp: DateTime.now(),
      accuracy: 0,
      altitude: 0,
      heading: 0,
      speed: 0,
      speedAccuracy: 0,
    );
    _error = null;
    notifyListeners();
  }

  void setState(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}
```

### 3. Faylni saqlang

---

## ✅ Natija
- ✅ iOS da lokatsiya ruxsati to'g'ri so'raladi
- ✅ Permission deniedForever (butunlay rad etilgan) holati qo'llab-quvvatlanadi
- ✅ Xato xabarlari o'zbek tilida
- ✅ Demo lokatsiya (test uchun)
- ✅ Reverse geocoding ishlaydi

---

## 🧪 Qanday tekshirish mumkin?

### iOS Simulator da test:
1. Simulator → Features → Location → Custom Location
2. `40.5966` (latitude) va `68.7786` (longitude) kiriting
3. Ilovada "Joriy lokatsiya" tugmasini bosing
4. Permission dialog chiqishi kerak: ✅

### iOS Real device da test:
1. Settings → Privacy → Location Services yoqilgan
2. Ilovada "Joriy lokatsiya" tugmasini bosing
3. Permission dialog chiqishi kerak: ✅

---

## ❗ Agar xatolik bo'lsa

### Muammo: "Location service is not enabled"
**Yechim:** iOS Settings → Privacy → Location Services → Yoqish

### Muammo: "Permission denied forever"
**Yechim:** iOS Settings → Store Guliston → Location → "While Using the App" tanlash

### Muammo: "Geolocator.getCurrentPosition() error"
**Sabab:** Simulator da lokatsiya o'rnatilmagan.
**Yechim:** Simulator → Features → Location → Apple (yoki boshqa shaharni tanlang)

---

## 📝 Eslatma

- iOS da permission dialog **bir marta** chiqadi. Agar foydalanuvchi "Don't Allow" tanlasa, `deniedForever` holatiga o'tadi
- `deniedForever` holatida faqat Settings orqali yoqish mumkin
- `Geolocator` paketi **iOS da to'liq qo'llab-quvvatlanadi**
- `geocoding` paketi **iOS da to'liq qo'llab-quvvatlanadi**

---

## 🔗 Keyingi faza
Faza I-8: iOS Simulator da test qilish