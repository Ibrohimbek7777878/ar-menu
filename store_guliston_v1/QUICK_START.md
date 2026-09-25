# 🚀 Quick Start — Online Store Guliston (Serverless)

## Step 1: Setup Flutter Environment

```bash
# Verify Flutter installation
flutter doctor

# Expected output should show:
# ✓ Flutter 3.24+
# ✓ Dart 3.5+
# ✓ Android SDK (API 28+)
```

## Step 2: Install Dependencies

```bash
cd store_guliston_v1

# Get all packages
flutter pub get

# Generate any required code
flutter pub run build_runner build --delete-conflicting-outputs
```

## Step 3: Run in Development Mode

```bash
# On Android emulator or physical device
flutter run

# App initializes with:
# - SQLite database
# - Seed data (shops, products, categories)
# - Ready to use immediately
```

---

## 🏗️ Building for Production (APK)

### Option A: Automated Build Script

```bash
# Make script executable
chmod +x scripts/build-apk.sh

# Run with version
./scripts/build-apk.sh 1.0.0 1

# Output: dist/apk/
# - store-guliston-v1.0.0-universal.apk
# - store-guliston-v1.0.0-arm64.apk
# - store-guliston-v1.0.0-armv7.apk
```

### Option B: Manual Build

```bash
# Clean previous builds
flutter clean

# Get dependencies
flutter pub get

# Build release APK (all architectures)
flutter build apk --release

# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Option C: Build with Code Obfuscation (Recommended)

```bash
# Create debug-info directory
mkdir -p debug-info

# Build with obfuscation & split APKs
flutter build apk \
    --release \
    --obfuscate \
    --split-per-abi \
    --split-debug-info=./debug-info
```

---

## 📝 Admin Panel

### First-Time Access

1. **Launch app** → Click menu button (☰)
2. **Select** "Admin Panel"
3. **Enter PIN**: `1234` (default)
4. **Change PIN**: Go to Settings in admin panel
5. **Create new PIN**: Follow prompts

### Admin Functions

- 📊 **Dashboard** - View stats, revenue
- 🏪 **Shops** - Create, edit, delete shops
- 📦 **Products** - Manage products & stock
- 🛒 **Orders** - Track and update order status
- ⚙️ **Settings** - Change PIN, export data

---

## 🗂️ Project Structure

**Database** (SQLite)
- Shops with location data
- Products with pricing
- Orders with status tracking
- Categories and reviews

**State Management** (Provider)
- `ShopProvider` - Shop list & filtering
- `ProductProvider` - Product list & search
- `OrderProvider` - Order management
- `CartProvider` - Shopping cart

**Navigation** (go_router)
- `/` - Home screen
- `/shop/:id` - Shop details
- `/cart` - Shopping cart
- `/orders` - Order history
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin panel

---

## 📦 Distribution

### Upload to CDN/Server

```bash
# 1. Build the APK
./scripts/build-apk.sh 1.0.0 1

# 2. Upload files
aws s3 cp dist/apk/* s3://your-bucket/releases/

# 3. Share download link with users
# Example: https://your-cdn.com/store-guliston-v1.0.0-arm64.apk
```

### Create Release on GitHub

```bash
# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Create release and attach APK
gh release create v1.0.0 dist/apk/*.apk
```

### Setup Auto-Update Check

1. Create `app-version.json` on CDN:

```json
{
  "version": "1.0.0",
  "build": 1,
  "download_url": "https://cdn.example.com/store-guliston-v1.0.0-arm64.apk",
  "release_notes": "Initial release - Serverless e-commerce app"
}
```

2. App checks for updates on launch

---

## 🧪 Testing

### Device Testing

```bash
# List connected devices
flutter devices

# Run on specific device
flutter run -d <device_id>

# Build APK and install
flutter install --release

# View logs
adb logcat | grep flutter
```

### Code Quality

```bash
# Analyze code
flutter analyze

# Run unit tests (if added)
flutter test

# Format code
dart format lib/
```

---

## 📊 APK File Sizes

| Build | Size | Notes |
|-------|------|-------|
| Universal (all archs) | ~50 MB | Works on any device |
| ARM64 (recommended) | ~22 MB | 90% of phones |
| ARMv7 (old phones) | ~20 MB | Older Android devices |
| With obfuscation | -10-15% | Security + smaller |

**Recommended**: Distribute ARM64 APK for modern phones

---

## 🔐 Signing APK

### Create Signing Key (One-time)

```bash
# Generate keystore
keytool -genkey -v -keystore keystore.jks \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -alias upload \
    -storepass your_password \
    -keypass your_key_password \
    -dname "CN=Store Guliston, O=Your Company, L=Yangi Yer, C=UZ"

# Move to secure location
mkdir -p ~/.keystore
mv keystore.jks ~/.keystore/
```

### Configure Signing in Build

Update `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        keyAlias System.getenv("KEY_ALIAS") ?: "upload"
        keyPassword System.getenv("KEY_PASSWORD") ?: "your_key_password"
        storeFile file(System.getenv("KEYSTORE_PATH") ?: "~/.keystore/keystore.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your_keystore_password"
    }
}
```

### Build with Signing

```bash
export KEYSTORE_PATH="~/.keystore/keystore.jks"
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="upload"
export KEY_PASSWORD="your_key_password"

flutter build apk --release
```

---

## 📚 Documentation

- **APK_BUILD_GUIDE.md** - Detailed build & distribution guide
- **SERVERLESS_IMPLEMENTATION.md** - Architecture & implementation details
- **Provider Docs** - https://pub.dev/packages/provider
- **go_router Docs** - https://github.com/flutter/packages/tree/main/packages/go_router
- **SQLite Docs** - https://www.sqlite.org

---

## 🆘 Troubleshooting

### "Flutter not found"
```bash
# Add Flutter to PATH
export PATH="$PATH:/path/to/flutter/bin"
```

### "Android SDK not found"
```bash
# Set Android SDK location
flutter config --android-sdk /path/to/android-sdk
```

### "App crashes on launch"
```bash
# Clear data and reinstall
flutter install --release
adb logcat | grep -i flutter  # Check logs
```

### "APK too large"
```bash
# Enable obfuscation & split APKs
flutter build apk --release --obfuscate --split-per-abi

# Or analyze size
apkanalyzer apk summary build/app/outputs/flutter-apk/app-release.apk
```

---

## 💡 Development Tips

### Hot Reload
```bash
# While running: Press 'r' in terminal for hot reload
# Changes apply instantly without losing state
```

### Add New Feature
1. Create model (lib/models/new_model.dart)
2. Create repository (lib/repositories/new_repository.dart)
3. Create provider (add to lib/providers/app_providers.dart)
4. Create UI (lib/screens/new_screen.dart)
5. Add route (lib/config/router_config.dart)

### Customize Seed Data
Edit `lib/database/database_helper.dart` → `_seedDatabase()`:
```dart
// Update shops, products, categories with your data
static List<Map<String, dynamic>> shops = [
  // Your shops here
];
```

---

## 🎯 Complete Build & Release Workflow

```bash
# 1. Make sure everything is committed
git status

# 2. Update version in pubspec.yaml
# version: 1.0.0+1

# 3. Build the APK
./scripts/build-apk.sh 1.0.0 1

# 4. Verify build
ls -lh dist/apk/

# 5. Upload to CDN
aws s3 cp dist/apk/* s3://your-bucket/releases/

# 6. Create Git tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 7. Create GitHub release
gh release create v1.0.0 dist/apk/*.apk

# 8. Share download link with users! 🎉
```

---

## ✨ You're Ready!

Your serverless Flutter app is now:
- ✅ Fully functional with SQLite
- ✅ Ready to build as APK
- ✅ Can be distributed independently
- ✅ Works completely offline
- ✅ Has admin management panel

**Next**: Build the APK and distribute to users!

```bash
./scripts/build-apk.sh 1.0.0 1
```

🚀 **Done! Your APK is ready in `dist/apk/`**
