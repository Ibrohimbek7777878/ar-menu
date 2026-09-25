# 🍎 iOS UCHUN TO'LIQ KONFIGURATSIYA
## Online Store Guliston — iOS Support

---

## ❗ ASOSIY MUAMMOLAR VA YECHIMLAR

### 1. YANDEX MAPS — iOS da ishlamaydi ❌

**Muammo:** Yandex Maps faqat Android uchun to'liq qo'llab-quvvatlanadi. iOS da native library yo'q.

**Yechim:** Google Maps ishlatamiz (iOS va Android uchun universal)

---

## 📦 QADAM 1: PUBSPEC.YAML YANGILASH

```yaml
dependencies:
  # Maps - FAQAT Google Maps (iOS + Android)
  google_maps_flutter: ^2.6.0
  # yandex_mapkit: ^4.0.0  # ❌ O'chirildi — iOS qo'llab-quvvatlamaydi
  
  # Geolocator (iOS permissions bilan)
  geolocator: ^11.0.0
  geocoding: ^3.0.0
  
  # Image Picker (iOS permissions bilan)
  image_picker: ^1.0.7
  
  # Qolgan packages o'zgarishsiz...
```

---

## 🗺️ QADAM 2: MAPS SERVISINI YANGILASH

### Eski kod (Yandex Maps bilan):
```dart
// ❌ Bu iOS da ishlamaydi
import 'package:yandex_mapkit/yandex_mapkit.dart';
```

### Yangi kod (Google Maps — universal):
```dart
// lib/services/maps_service.dart

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geocoding/geocoding.dart';

class MapsService {
  // Reverse Geocoding (coordinates → address)
  Future<String?> getAddressFromLatLng(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      
      if (placemarks.isEmpty) return null;
      
      final place = placemarks.first;
      return '${place.street}, ${place.locality}, ${place.country}';
    } catch (e) {
      print('Geocoding error: $e');
      return null;
    }
  }
  
  // Forward Geocoding (address → coordinates)
  Future<LatLng?> getLatLngFromAddress(String address) async {
    try {
      final locations = await locationFromAddress(address);
      
      if (locations.isEmpty) return null;
      
      final location = locations.first;
      return LatLng(location.latitude, location.longitude);
    } catch (e) {
      print('Geocoding error: $e');
      return null;
    }
  }
  
  // Get current location
  Future<LatLng?> getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      return LatLng(position.latitude, position.longitude);
    } catch (e) {
      print('Location error: $e');
      return null;
    }
  }
}
```

---

## 🔐 QADAM 3: iOS PERMISSIONS SOZLASH

### Info.plist ga qo'shish kerak

Fayl joylashuvi: `ios/Runner/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Mavjud kod ... -->
    
    <!-- ========== YANGI QO'SHILADI ========== -->
    
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
    
    <!-- ========== OXIRI ========== -->
</dict>
</plist>
```

---

## 🗺️ QADAM 4: GOOGLE MAPS API KEY (iOS uchun)

### 4.1 Google Cloud Console da API Key yaratish

1. https://console.cloud.google.com ga kiring
2. Loyiha yarating yoki mavjudini tanlang
3. **APIs & Services → Credentials** ga o'ting
4. **Create Credentials → API Key** bosing
5. API Key ni ko'chiring (masalan: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### 4.2 API ni yoqish

**APIs & Services → Library** ga o'ting va quyidagilarni yoqing:
- ✅ Maps SDK for Android
- ✅ Maps SDK for iOS
- ✅ Geocoding API
- ✅ Places API (optional)

### 4.3 API Key ni cheklash (Security)

**Credentials** sahifasida API Key ni bosing va:

**For Android:**
- Restrict API → Android apps
- Add package name: `com.example.store_guliston_v1`
- Add SHA-1 certificate fingerprint:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

**For iOS:**
- Restrict API → iOS apps
- Add bundle identifier: `com.example.storeGuliston` (Xcode dan olish)

---

## 🔧 QADAM 5: iOS LOYIHAGA API KEY QO'SHISH

### 5.1 AppDelegate.swift ni yangilash

Fayl: `ios/Runner/AppDelegate.swift`

```swift
import UIKit
import Flutter
import GoogleMaps  // ← Bu qo'shiladi

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    // Google Maps API Key ← Bu qo'shiladi
    GMSServices.provideAPIKey("AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### 5.2 Podfile ni yangilash

Fayl: `ios/Podfile`

```ruby
# Uncomment this line
platform :ios, '13.0'  # ← iOS 13 minimum

# CocoaPods'ni yangilash
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    # ← Bu qo'shiladi (iOS 13+ uchun)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

### 5.3 Pods o'rnatish

```bash
cd ios
pod install
cd ..
```

---

## 📱 QADAM 6: LOCATION PICKER SCREEN (Universal — iOS + Android)

```dart
// lib/screens/checkout/location_picker_screen.dart

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationPickerScreen extends StatefulWidget {
  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  GoogleMapController? _mapController;
  LatLng? _selectedLocation;
  String? _address;
  bool _isLoading = false;
  
  // Default location: Yangi Yer
  static const LatLng _defaultLocation = LatLng(40.5966, 68.7786);
  
  @override
  void initState() {
    super.initState();
    _checkLocationPermission();
  }
  
  Future<void> _checkLocationPermission() async {
    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showError('Lokatsiya xizmati o\'chirilgan. Sozlamalardan yoqing.');
      return;
    }
    
    // Check permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showError('Lokatsiya ruxsati berilmadi');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _showError('Lokatsiya ruxsati butunlay rad etilgan. Sozlamalardan yoqing.');
      return;
    }
    
    // Get current location
    await _goToCurrentLocation();
  }
  
  Future<void> _goToCurrentLocation() async {
    setState(() => _isLoading = true);
    
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      final location = LatLng(position.latitude, position.longitude);
      
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(location, 15),
      );
      
      // Auto-select current location
      await _onLocationSelected(location);
    } catch (e) {
      print('Current location error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  Future<void> _onLocationSelected(LatLng position) async {
    setState(() {
      _selectedLocation = position;
      _isLoading = true;
    });
    
    // Reverse geocoding
    try {
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        setState(() {
          _address = '${place.street ?? ''}, ${place.locality ?? ''}, ${place.country ?? ''}';
        });
      }
    } catch (e) {
      print('Geocoding error: $e');
      setState(() {
        _address = 'Manzil: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Yetkazish manzilini tanlang'),
        backgroundColor: Color(0xFF1B5E20),
        actions: [
          if (_selectedLocation != null)
            TextButton(
              onPressed: () {
                Navigator.pop(context, {
                  'lat': _selectedLocation!.latitude,
                  'lng': _selectedLocation!.longitude,
                  'address': _address,
                });
              },
              child: Text(
                'Tasdiqlash',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          // Google Map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _defaultLocation,
              zoom: 14,
            ),
            onMapCreated: (controller) {
              _mapController = controller;
            },
            onTap: _onLocationSelected,
            markers: _selectedLocation != null
                ? {
                    Marker(
                      markerId: MarkerId('selected'),
                      position: _selectedLocation!,
                      draggable: true,
                      onDragEnd: _onLocationSelected,
                    ),
                  }
                : {},
            myLocationEnabled: true,
            myLocationButtonEnabled: false, // Custom button qo'shamiz
            zoomControlsEnabled: false,
          ),
          
          // Loading indicator
          if (_isLoading)
            Positioned.fill(
              child: Container(
                color: Colors.black26,
                child: Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
              ),
            ),
          
          // Address card
          if (_address != null && !_isLoading)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Card(
                elevation: 4,
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Tanlangan manzil:',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        _address!,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _goToCurrentLocation,
        backgroundColor: Color(0xFF1B5E20),
        child: Icon(Icons.my_location),
      ),
    );
  }
  
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}
```

---

## 🏗️ QADAM 7: XCODE SOZLAMALARI

### 7.1 Xcode da loyihani ochish

```bash
open ios/Runner.xcworkspace
```

### 7.2 Bundle Identifier tekshirish

1. Xcode da **Runner** loyihasini tanlang
2. **Signing & Capabilities** tab
3. **Bundle Identifier** ni yozing (masalan: `com.example.storeGuliston`)
4. **Team** ni tanlang (Apple Developer account kerak)

### 7.3 Deployment Target

1. **Runner → Build Settings**
2. **iOS Deployment Target** → **13.0** ga o'zgartiring

---

## 🧪 QADAM 8: iOS SIMULATOR DA TEST QILISH

```bash
# iOS simulator'larni ko'rish
flutter devices

# Simulator ochish
open -a Simulator

# Ilovani ishga tushirish
flutter run -d <simulator_id>

# Masalan:
flutter run -d "iPhone 15 Pro"
```

---

## 📦 QADAM 9: IOS UCHUN BUILD

### 9.1 Development Build (Test uchun)

```bash
flutter build ios --debug
```

### 9.2 Release Build (App Store uchun)

```bash
flutter build ios --release
```

### 9.3 IPA fayl yaratish (Distribution)

```bash
# Xcode Archive
# Xcode → Product → Archive → Distribute App
```

---

## ✅ QADAM 10: FINAL CHECKLIST (iOS)

```
□ Google Maps SDK for iOS API yoqilgan
□ API Key AppDelegate.swift ga qo'shilgan
□ Info.plist ga permissions qo'shilgan
□ Podfile minimum iOS 13.0 ga o'rnatilgan
□ Pods install qilingan
□ Location permission ishlaydi
□ Camera permission ishlaydi (image picker uchun)
□ Google Maps ko'rsatiladi
□ Marker qo'yish ishlaydi
□ Current location tugmasi ishlaydi
□ Reverse geocoding ishlaydi
□ Simulator da test o'tdi
□ Real device da test o'tdi
```

---

## 🔄 QADAM 11: ANDROID SOZLAMALARINI YANGILASH

Android uchun ham Google Maps API kerak (Yandex Maps o'rniga)

### android/app/src/main/AndroidManifest.xml

```xml
<manifest ...>
    <application ...>
        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
        
        <!-- Mavjud kod ... -->
    </application>
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
</manifest>
```

---

## 🎯 NATIJA

Endi loyihangiz **iOS va Android ikkalasida ham** to'liq ishlaydi!

**Farq:**
- ❌ Yandex Maps o'chirildi
- ✅ Google Maps (universal — iOS + Android)
- ✅ Permissions to'g'ri sozlangan
- ✅ API Keys konfiguratsiya qilingan

**Test:**
```bash
# Android
flutter run -d android

# iOS
flutter run -d iPhone
```

**Build:**
```bash
# Android APK
flutter build apk --release

# iOS IPA (Xcode orqali)
flutter build ios --release
# Keyin Xcode → Archive → Distribute
```

---

## 🆘 MUAMMOLAR VA YECHIMLAR

### Muammo 1: iOS da xarita ko'rinmaydi

**Yechim:**
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter run
```

### Muammo 2: Location permission ishlamaydi

**Yechim:**
- Info.plist ni qaytadan tekshiring
- Simulator da: Features → Location → Custom Location → Yangi Yer (40.5966, 68.7786)

### Muammo 3: API Key xatosi

**Yechim:**
- Google Cloud Console da API Key ni tekshiring
- iOS Bundle ID va Android Package Name to'g'ri kiritilganligini tekshiring
- Billing yoqilganligini tekshiring (test uchun $200 credit bepul)

---

## 💰 GOOGLE MAPS NARXI

**Bepul:**
- Har oy $200 credit (28,000 ta map load yoki 40,000 ta geocode request)
- Ko'pchilik kichik loyihalar uchun yetarli

**To'lov:**
- Map load: $7 / 1000 request
- Geocoding: $5 / 1000 request

**Loyihangiz uchun taxmin:**
- 1000 foydalanuvchi, har biri oyda 10 ta map ochadi = 10,000 request = **BEPUL**

---

## 🚀 YAKUNIY NATIJA

✅ iOS da to'liq ishlaydigan app  
✅ Android da ham to'liq ishlaydigan app  
✅ Universal kod (bir marta yozildi, ikkala platformada ishlaydi)  
✅ Google Maps (professional, keng qo'llab-quvvatlanadigan)  
✅ Permissions to'g'ri sozlangan  
✅ Production-ready  

**OMAD!** 🍎🤖
