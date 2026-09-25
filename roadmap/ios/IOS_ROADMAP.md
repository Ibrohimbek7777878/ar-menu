# 🍎 iOS UCHUN ROADMAP — Online Store Guliston

## 📋 Asosiy hujjatlar
- `roadmap/ios/IOS_FULL_SETUP_GUIDE.md` — iOS konfiguratsiya qo'llanmasi
- `roadmap/ios/FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — Production prompt (Riverpod versiya)
- `roadmap/ios/STEP_BY_STEP_IMPLEMENTATION.md` — Qadam-ba-qadam qo'llanma

---

## ⚠️ MUHIM: Yandex Maps iOS da ishlamaydi

**Muammo:** Yandex Maps iOS da native library qo'llab-quvvatlamaydi.

**Yechim:** Google Maps ishlatiladi (iOS + Android universal).
- `pubspec.yaml` dan `yandex_mapkit` o'chiriladi
- `google_maps_flutter` qo'shiladi
- Barcha map-related kodlar Google Maps ga o'tkaziladi

---

## 📑 IOS FAZALARI

### Faza I-1: pubspec.yaml ni yangilash (iOS paketlar)
| Paket | Holat |
|-------|-------|
| `google_maps_flutter: ^2.6.0` | **QO'SHILADI** (Yandex Maps o'rniga) |
| `geolocator: ^11.0.0` | iOS permission bilan |
| `geocoding: ^3.0.0` | Reverse geocoding |
| `image_picker: ^1.0.7` | iOS camera/gallery permission |
| `permission_handler: ^11.4.0` | iOS permission handler |
| `url_launcher: ^6.2.0` | Google Maps yo'l ko'rsatish |
| `yandex_mapkit: ^4.0.0` | **O'CHIRILADI** ❌ |

**Bajariladigan ish:**
- `pubspec.yaml` dan `yandex_mapkit` o'chirish
- `google_maps_flutter` qo'shish
- `flutter pub get`

---

### Faza I-2: Google Maps Service (MapsService)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 2

**Yangi fayl yaratish:**
```dart
// lib/services/maps_service.dart
class MapsService {
  Future<String?> getAddressFromLatLng(double lat, double lng) async {
    // Reverse Geocoding (geocoding package)
  }
  
  Future<LatLng?> getLatLngFromAddress(String address) async {
    // Forward Geocoding
  }
  
  Future<LatLng?> getCurrentLocation() async {
    // Geolocator
  }
}
```

**Mavjud fayllarni yangilash:**
- Har qanday `yandex_mapkit` import → `google_maps_flutter` ga o'zgartirish
- `location_picker_screen.dart` da Google Maps bilan almashtirish
- `location_service.dart` da Google Maps geocoding ishlatish

---

### Faza I-3: iOS Permissions (Info.plist)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 3

**Fayl:** `ios/Runner/Info.plist`

**Qo'shiladigan permissionlar:**
```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Yetkazish manzilini aniqlash uchun lokatsiya kerak</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Yaqin do'konlarni topish uchun lokatsiya kerak</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Xarita va yetkazish xizmatlari uchun lokatsiya kerak</string>

<!-- Camera Permission (rasm yuklash uchun) -->
<key>NSCameraUsageDescription</key>
<string>Mahsulot rasmini tortish uchun kamera kerak</string>

<!-- Photo Library Permission -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Mahsulot rasmini yuklash uchun galeriya kerak</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Rasmlarni saqlash uchun galeriya kerak</string>
```

---

### Faza I-4: Google Maps API Key (iOS)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 4

**Google Cloud Console:**
1. `https://console.cloud.google.com` → Loyiha yaratish
2. **APIs & Services → Credentials** → API Key yaratish
3. **APIs & Services → Library** dan yoqish:
   - ✅ Maps SDK for iOS
   - ✅ Maps SDK for Android
   - ✅ Geocoding API
   - ✅ Places API (optional)

**API Key ni cheklash:**
- iOS: Bundle Identifier bilan cheklash (`com.example.storeGuliston`)
- Android: Package name + SHA-1 bilan cheklash

---

### Faza I-5: Xcode Sozlamalari (AppDelegate + Podfile)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 5, 7

**AppDelegate.swift (`ios/Runner/AppDelegate.swift`):**
```swift
import UIKit
import Flutter
import GoogleMaps  // ← QO'SHILADI

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

**Podfile (`ios/Podfile`):**
```ruby
platform :ios, '13.0'  # ← iOS 13 minimum

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

```bash
cd ios && pod install && cd ..
```

**Xcode da:**
- Bundle Identifier: `com.example.storeGuliston`
- iOS Deployment Target: 13.0
- Team: Apple Developer account

---

### Faza I-6: Location Picker Screen (Google Maps)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 6

**Faylni qayta yozish:** `lib/screens/location_map_screen.dart`

Yandex Maps → Google Maps ga o'tkazish:
```dart
// Eski (Yandex):
// import 'package:yandex_mapkit/yandex_mapkit.dart';
// YandexMap()

// Yangi (Google Maps - universal):
import 'package:google_maps_flutter/google_maps_flutter.dart';
GoogleMap(
  initialCameraPosition: CameraPosition(
    target: LatLng(40.5966, 68.7786), // Yangi Yer
    zoom: 14,
  ),
  onTap: _onLocationSelected,
  markers: _selectedLocation != null
      ? { Marker(markerId: MarkerId('selected'), position: _selectedLocation!) }
      : {},
  myLocationEnabled: true,
)
```

---

### Faza I-7: Location Provider ni yangilash
**Fayl:** `lib/providers/location_provider.dart`

`android.permission.ACCESS_FINE_LOCATION` dan tashqari iOS permission handler ni qo'shish:
```dart
// Geolocator iOS permission
LocationPermission permission = await Geolocator.checkPermission();
if (permission == LocationPermission.denied) {
  permission = await Geolocator.requestPermission();
}
```

---

### Faza I-8: iOS Simulator da Test
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 8

```bash
# iOS simulator'lar ro'yxati
flutter devices

# Simulator ochish
open -a Simulator

# Ilovani ishga tushirish
flutter run -d "iPhone 15 Pro"
```

Test checklist:
- [ ] Simulator ochiladi
- [ ] Google Maps ko'rinadi
- [ ] Marker qo'yish ishlaydi
- [ ] Current location tugmasi ishlaydi
- [ ] Reverse geocoding ishlaydi
- [ ] Location permission dialog chiqadi
- [ ] Camera permission dialog chiqadi
- [ ] Admin login ishlaydi
- [ ] Buyurtma berish flow ishlaydi

---

### Faza I-9: iOS Release Build
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 9

```bash
# Development build
flutter build ios --debug

# Release build (App Store uchun)
flutter build ios --release

# IPA yaratish (Xcode Archive)
# Xcode → Product → Archive → Distribute App
```

---

### Faza I-10: Android sozlamalarini yangilash (Google Maps)
**Asos:** `IOS_FULL_SETUP_GUIDE.md` QADAM 11

`android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
```

Permissions:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

---

## 📊 IOS FAZALAR XULOSASI

| # | Faza | Fayl(lar) | Status |
|---|------|-----------|--------|
| I-1 | pubspec.yaml yangilash (Yandex→Google Maps) | `pubspec.yaml` | ❌ Bajarilmagan |
| I-2 | Google Maps Service yaratish | `lib/services/maps_service.dart` | ❌ Bajarilmagan |
| I-3 | iOS Permissions (Info.plist) | `ios/Runner/Info.plist` | ❌ Bajarilmagan |
| I-4 | Google Maps API Key | Google Cloud Console | ❌ Bajarilmagan |
| I-5 | Xcode sozlamalari (AppDelegate, Podfile) | `AppDelegate.swift`, `Podfile` | ❌ Bajarilmagan |
| I-6 | Location Picker Google Maps ga o'tkazish | `location_map_screen.dart` | ❌ Bajarilmagan |
| I-7 | Location Provider iOS permission | `location_provider.dart` | ❌ Bajarilmagan |
| I-8 | iOS Simulator Test | — | ❌ Bajarilmagan |
| I-9 | iOS Release Build | — | ❌ Bajarilmagan |
| I-10 | Android Google Maps API Key | `AndroidManifest.xml` | ❌ Bajarilmagan |

---

## 🔄 Barcha 14 Faza + iOS Faza birlashtirilgan roadmap

| Asosiy Faza | Nomi | iOS Faza |
|-------------|------|----------|
| 1 | Oq fon muammosi | — |
| 2 | Backend o'chirish | — |
| 3 | Admin login | — |
| 4 | Admin dashboard | — |
| 5 | Admin do'konlar CRUD | — |
| 6 | Admin mahsulotlar CRUD | — |
| 7 | Admin buyurtmalar | — |
| 8 | Kategoriya + Kuryer | — |
| 9 | Sozlamalar + Matnlar | — |
| 10 | Animatsiyalar UI | — |
| **11** | **Xarita + Lokatsiya** | **I-1 dan I-7 gacha** |
| 12 | Ob-havo | — |
| 13 | Buyurtma flow | — |
| 14 | APK build | **I-8, I-9** |
| — | — | **I-10** Android Google Maps |

---

**Ruxsat bersangiz, iOS roadmap bo'yicha ishni boshlayman.**