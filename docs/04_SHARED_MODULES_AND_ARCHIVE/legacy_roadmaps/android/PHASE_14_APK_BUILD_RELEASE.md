# 🚀 FAZA 14 — APK BUILD VA RELEASE

## 🎯 Maqsad
Ilovani APK sifatida build qilish, auto-update mexanizmi, App icon, Splash screen, release tayyorlash.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — APK tarqatish, auto-update
- `BACKEND_PROMPT_SENIOR.md` — APK deployment (version check, CDN)
- `GULISTON_PROJECT_TZ.md` — "APK orqali tarqatiladi, Play Market orqali emas"

## 🔧 Tafsilotlar

### 14.1 App icon va Splash screen
```yaml
# pubspec.yaml ga qo'shish
flutter_launcher_icons: ^0.13.1
flutter_native_splash: ^2.4.0

flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icons/app_icon.png"
  adaptive_icon_background: "#327F60"
  adaptive_icon_foreground: "assets/icons/app_icon_foreground.png"

flutter_native_splash:
  color: "#327F60"
  image: "assets/images/splash_logo.png"
  android_12:
    color: "#327F60"
    image: "assets/images/splash_logo.png"
```

### 14.2 `build-apk.sh` yangilash
```bash
#!/bin/bash
# scripts/build-apk.sh

echo "🚀 Online Store Guliston — APK Build"
echo "================================"

# 1. Clean
echo "🧹 Cleaning..."
flutter clean

# 2. Get packages
echo "📦 Getting packages..."
flutter pub get

# 3. Generate launcher icons
echo "🎨 Generating launcher icons..."
dart run flutter_launcher_icons

# 4. Generate splash screen
echo "💫 Generating splash screen..."
dart run flutter_native_splash:create

# 5. Build APK
echo "🔨 Building APK..."
flutter build apk --release

# 6. Copy to release folder
echo "📋 Copying to release..."
mkdir -p release
cp build/app/outputs/flutter-apk/app-release.apk release/online-store-guliston-v1.0.0.apk

echo "✅ Build complete!"
echo "📱 APK: release/online-store-guliston-v1.0.0.apk"
```

### 14.3 Auto-update mexanizmi
```dart
class AppUpdateService {
  static const String _versionUrl = 'https://cdn.onlinestore-guliston.uz/app/version.json';
  static const String _downloadUrl = 'https://cdn.onlinestore-guliston.uz/app/latest.apk';
  
  static Future<UpdateInfo> checkForUpdate() async {
    try {
      final response = await http.get(Uri.parse(_versionUrl));
      if (response.statusCode == 200) {
        return UpdateInfo.fromJson(jsonDecode(response.body));
      }
    } catch (e) {
      // Offline - skip update check
    }
    return UpdateInfo.empty();
  }
  
  static Future<void> downloadAndInstall(String url) async {
    // Open download link in browser
    await launchUrl(Uri.parse(url));
  }
}

class UpdateInfo {
  final String currentVersion;
  final String minSupportedVersion;
  final String downloadUrl;
  final bool isForceUpdate;
  final String releaseNotes;
  
  // Version comparison
  bool get hasUpdate => _compareVersions(currentVersion, minSupportedVersion) > 0;
  bool get isForceUpdateRequired => _compareVersions(minSupportedVersion, currentVersion) > 0;
}

// Version format: "1.0.0"
int _compareVersions(String a, String b) {
  final partsA = a.split('.').map(int.parse).toList();
  final partsB = b.split('.').map(int.parse).toList();
  
  for (int i = 0; i < 3; i++) {
    if (partsA[i] > partsB[i]) return 1;
    if (partsA[i] < partsB[i]) return -1;
  }
  return 0;
}
```

### 14.4 `version.json` (CDN da)
```json
{
  "current_version": "1.0.5",
  "min_supported_version": "1.0.0",
  "download_url": "https://cdn.onlinestore-guliston.uz/app/latest.apk",
  "release_notes": "• Yangi admin dashboard\n• Ob-havo integratsiyasi\n• Xarita orqali lokatsiya tanlash\n• 3 ta telefon raqam qo'shildi\n• Xatolar tuzatildi",
  "is_force_update": false
}
```

### 14.5 Update dialog
```dart
void showUpdateDialog(BuildContext context, UpdateInfo info) {
  showDialog(
    context: context,
    barrierDismissible: !info.isForceUpdate,
    builder: (context) => AlertDialog(
      title: const Text('Yangilanish mavjud'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Yangi versiya: v${info.currentVersion}'),
          const SizedBox(height: 8),
          const Text('O\'zgarishlar:'),
          Text(info.releaseNotes),
        ],
      ),
      actions: [
        if (!info.isForceUpdate)
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keyinroq'),
          ),
        ElevatedButton(
          onPressed: () {
            AppUpdateService.downloadAndInstall(info.downloadUrl);
            if (info.isForceUpdate) {
              // Exit app after force update
            }
          },
          child: const Text('Yangilash'),
        ),
      ],
    ),
  );
}
```

### 14.6 Android manifest sozlamalari
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

<!-- Agar internet bo'lmasa ham ishlashi uchun -->
<application
    android:label="Online Store Guliston"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher"
    android:usesCleartextTraffic="true">
```

### 14.7 ProGuard (R8) sozlamalari
```
# android/app/proguard-rules.pro
-keepattributes Signature
-keepattributes *Annotation*

# Keep Flutter engine
-keep class io.flutter.** { *; }
-keep class com.google.** { *; }

# Keep SQLite
-keep class org.sqlite.** { *; }
```

## ✅ Natija
- APK build (app-release.apk)
- Chiroyli app icon
- Native splash screen
- Auto-update mexanizmi
- Update dialog (majburiy/ixtiyoriy)
- Version.json CDN da
- APK release papkasida