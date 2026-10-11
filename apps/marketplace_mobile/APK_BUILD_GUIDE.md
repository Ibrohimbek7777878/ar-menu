# Online Store Guliston — Serverless APK Build Guide

## Prerequisites

1. **Flutter 3.24+** installed and in PATH
2. **Android SDK** with API Level 28+ (Android 9.0)
3. **Java Development Kit (JDK) 11+**
4. **Gradle 7.5+** (bundled with Android Studio)

Verify installation:
```bash
flutter doctor -v
```

---

## Build Configuration

### 1. Update Android Project (`android/app/build.gradle`)

Ensure you have proper signing and release configuration:

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.storeguliston.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            keyAlias System.getenv("KEY_ALIAS") ?: "upload"
            keyPassword System.getenv("KEY_PASSWORD") ?: "password"
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "password"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2. Create Signing Key (One-time setup)

```bash
# Generate keystore
keytool -genkey -v -keystore keystore.jks \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -alias upload \
    -storepass your_keystore_password \
    -keypass your_key_password \
    -dname "CN=Store Guliston, O=Your Company, L=Yangi Yer, C=UZ"

# Store keystore in secure location
mkdir -p ~/.keystore
mv keystore.jks ~/.keystore/
```

### 3. Build Release APK (Production)

```bash
# Clean build
flutter clean

# Install dependencies
flutter pub get

# Build single APK (all architectures included)
flutter build apk --release

# Output: build/app/outputs/flutter-apk/app-release.apk

# Alternative: Build split APKs (smaller size)
flutter build apk --split-per-abi --release

# Outputs:
# - build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk
# - build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
# - build/app/outputs/flutter-apk/app-x86-release.apk
# - build/app/outputs/flutter-apk/app-x86_64-release.apk
```

### 4. Build with Obfuscation (Recommended)

```bash
# Generate debug info directory
mkdir -p ./debug-info

# Build with code obfuscation
flutter build apk \
    --release \
    --obfuscate \
    --split-debug-info=./debug-info

# Debug symbols stored securely for crash reporting
```

### 5. Build AAB (for Google Play Store)

```bash
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

---

## APK Optimization

### File Size

- **Single APK (all archs)**: ~45-55 MB
- **ARM64 Split APK**: ~20-25 MB (recommended for modern phones)
- **With Obfuscation**: ~10-15% smaller

### Performance Optimizations in `pubspec.yaml`

```yaml
flutter:
  uses-material-design: true
  shrink_resources: true
  
  # Minimize assets
  assets:
    - assets/images/products/
    - assets/icons/
```

### ProGuard Rules (`android/app/proguard-rules.pro`)

```pro
# Keep Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Keep SQLite
-keep class org.sqlite.** { *; }
-keepclasseswithmembernames class org.sqlite.** { *; }

# Keep Provider
-keep class provider.** { *; }

# Generic optimization
-optimizationpasses 5
-dontusemixedcaseclassnames
```

---

## Signing & Distribution

### Automatic Signing (via Environment Variables)

```bash
export KEYSTORE_PATH="~/.keystore/keystore.jks"
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="upload"
export KEY_PASSWORD="your_key_password"

flutter build apk --release
```

### Manual Signing (Post-build)

```bash
jarsigner -verbose \
    -sigalg SHA256withRSA \
    -digestalg SHA-256 \
    -keystore ~/.keystore/keystore.jks \
    build/app/outputs/flutter-apk/app-release-unsigned.apk \
    upload

# Verify signature
jarsigner -verify build/app/outputs/flutter-apk/app-release-unsigned.apk
```

---

## Distribution Channels

### 1. Direct APK Download (Website/CDN)

```bash
# Upload to AWS S3 / Firebase Storage / Your CDN
aws s3 cp build/app/outputs/flutter-apk/app-release.apk \
    s3://your-bucket/store-guliston/latest/

# Set version endpoint for auto-update check
echo '{
  "version": "1.0.0",
  "build": 1,
  "download_url": "https://cdn.example.com/app-release.apk",
  "release_notes": "Bug fixes and improvements"
}' > app-version.json
```

### 2. Google Play Store

1. Create Google Play Developer account
2. Create new app listing
3. Upload AAB (build/app/outputs/bundle/release/app-release.aab)
4. Set pricing, content rating, target audience
5. Submit for review

### 3. GitHub Releases

```bash
gh release create v1.0.0 \
    build/app/outputs/flutter-apk/app-release.apk \
    --title "Store Guliston v1.0.0" \
    --notes "Initial release"
```

---

## Version Management

### Update Version Code (Auto-increment)

```bash
# In pubspec.yaml
version: 1.0.0+1  # +1 is build number

# Before each release, increment:
# version: 1.0.1+2
# version: 1.1.0+3
# etc.
```

### Generate Build Info

```bash
# Create build metadata file
echo '{
  "app_name": "Store Guliston",
  "version": "1.0.0",
  "build": 1,
  "release_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "platform": "Android",
  "min_sdk": 21,
  "target_sdk": 34
}' > assets/data/build-info.json
```

---

## Testing Before Release

```bash
# 1. Install debug APK to test device
flutter install

# 2. Run on physical device
flutter run --release

# 3. Check app size
apkanalyzer -h
apkanalyzer apk summary build/app/outputs/flutter-apk/app-release.apk

# 4. Run static analysis
flutter analyze

# 5. Unit tests (if added)
flutter test
```

---

## Troubleshooting

### Build Fails: "Could not find Android SDK"
```bash
flutter config --android-sdk /path/to/android-sdk
```

### Signing Error
```bash
# Check keystore
keytool -list -v -keystore ~/.keystore/keystore.jks

# Recreate if corrupted
keytool -genkey -v -keystore keystore.jks ...
```

### APK Crashes on Launch
```bash
# Check logs
adb logcat | grep -i flutter

# Re-build with verbose output
flutter build apk --release -v
```

### Large APK Size
```bash
# Analyze
apkanalyzer apk summary build/app/outputs/flutter-apk/app-release.apk

# Optimize assets
# - Compress images
# - Remove unused dependencies from pubspec.yaml
# - Enable minifyEnabled and shrinkResources
```

---

## Continuous Integration (GitHub Actions)

```yaml
# .github/workflows/release.yml
name: Build APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Build APK
        run: flutter build apk --release
      
      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: build/app/outputs/flutter-apk/app-release.apk
```

---

## Offline Distribution Script

```bash
#!/bin/bash
# build-and-distribute.sh

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./build-and-distribute.sh 1.0.0"
  exit 1
fi

echo "🔨 Building APK v$VERSION..."
flutter build apk --release --obfuscate --split-debug-info=./debug-info

echo "✅ APK built successfully!"
ls -lh build/app/outputs/flutter-apk/

echo "📦 Creating distribution package..."
mkdir -p dist
cp build/app/outputs/flutter-apk/app-release.apk "dist/store-guliston-v$VERSION.apk"
cp debug-info dist/debug-info-v$VERSION.zip

echo "🎉 Ready for distribution:"
ls -lh dist/

echo "Upload to CDN: aws s3 cp dist/* s3://your-bucket/releases/"
```

---

## Auto-Update Implementation

In-app version check:

```dart
Future<void> checkForUpdate() async {
  try {
    final response = await dio.get(
      'https://your-cdn.com/app-version.json',
    );
    
    final latestVersion = response.data['version'];
    final downloadUrl = response.data['download_url'];
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // Show update dialog
      showUpdateDialog(context, downloadUrl);
    }
  } catch (e) {
    print('Update check failed: $e');
  }
}
```

---

## Security Checklist

- ✅ Code obfuscation enabled
- ✅ Debug symbols separated and stored securely
- ✅ Signing key password stored in environment variables (not in repo)
- ✅ ProGuard rules configured
- ✅ Min SDK set to 21+ (avoid outdated vulnerabilities)
- ✅ Firebase Crashlytics integrated (optional)
- ✅ No hardcoded API keys in code

---

## Release Checklist

Before distributing each version:

- [ ] Update version in `pubspec.yaml`
- [ ] Run `flutter analyze`
- [ ] Test on physical device (at least ARM64)
- [ ] Build with obfuscation
- [ ] Verify APK signature
- [ ] Check APK size (< 50MB recommended)
- [ ] Create Git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
- [ ] Push to CDN/Play Store
- [ ] Update app-version.json endpoint
- [ ] Create release notes

---

## Deployment Command (One-liner)

```bash
flutter clean && flutter pub get && flutter build apk --release --obfuscate --split-debug-info=./debug-info && echo "✅ Release APK ready at: build/app/outputs/flutter-apk/app-release.apk"
```
