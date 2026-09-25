#!/bin/bash
# Build and distribute the APK
set -e

VERSION=${1:-1.0.0}
BUILD_NUMBER=${2:-1}

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Online Store Guliston — APK Builder"
echo "═══════════════════════════════════════════════════════════"
echo "Version: $VERSION"
echo "Build: $BUILD_NUMBER"
echo ""

# Update version in pubspec.yaml
echo "📝 Updating version in pubspec.yaml..."
sed -i "s/version: .*/version: $VERSION+$BUILD_NUMBER/" pubspec.yaml

# Clean previous builds
echo "🧹 Cleaning previous builds..."
flutter clean

# Get dependencies
echo "📦 Installing dependencies..."
flutter pub get

# Run analysis
echo "🔍 Running code analysis..."
flutter analyze || echo "⚠️  Code analysis warnings found"

# Create debug info directory
mkdir -p debug-info

# Build release APK with obfuscation
echo "🔨 Building release APK..."
flutter build apk \
    --release \
    --obfuscate \
    --split-debug-info=./debug-info

# Also build split APKs for smaller downloads
echo "📦 Building split APKs (ARM64, ARMv7)..."
flutter build apk \
    --release \
    --split-per-abi \
    --obfuscate \
    --split-debug-info=./debug-info-split

# Create distribution directory
mkdir -p dist/apk
mkdir -p dist/metadata

echo "📁 Organizing distribution files..."
cp build/app/outputs/flutter-apk/app-release.apk \
   dist/apk/store-guliston-v${VERSION}-universal.apk

cp build/app/outputs/flutter-apk/app-arm64-v8a-release.apk \
   dist/apk/store-guliston-v${VERSION}-arm64.apk 2>/dev/null || true

cp build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk \
   dist/apk/store-guliston-v${VERSION}-armv7.apk 2>/dev/null || true

# Create metadata
echo "📋 Creating release metadata..."
cat > dist/metadata/release-info.json << EOF
{
  "app_name": "Online Store Guliston",
  "version": "$VERSION",
  "build_number": $BUILD_NUMBER,
  "release_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "Android",
  "min_sdk": 21,
  "target_sdk": 34,
  "architecture": "multi",
  "features": [
    "Serverless - SQLite local database",
    "Offline-first architecture",
    "Admin panel with PIN protection",
    "Shop and product management",
    "Order tracking",
    "Maps integration",
    "Weather integration"
  ],
  "download_urls": {
    "universal": "https://cdn.example.com/store-guliston-v${VERSION}-universal.apk",
    "arm64": "https://cdn.example.com/store-guliston-v${VERSION}-arm64.apk",
    "armv7": "https://cdn.example.com/store-guliston-v${VERSION}-armv7.apk"
  }
}
EOF

# Create installation guide
cat > dist/metadata/INSTALL.md << EOF
# Online Store Guliston — Installation Guide

## System Requirements
- Android 5.0 (API Level 21) or higher
- At least 50 MB free storage
- Internet connection (optional, offline mode available)

## Installation Steps

### Option 1: Direct APK Installation

1. Download the APK file:
   - \`store-guliston-v${VERSION}-arm64.apk\` (Recommended for modern phones)
   - \`store-guliston-v${VERSION}-universal.apk\` (For all devices)

2. Enable unknown sources:
   - Settings → Security → Unknown Sources → Enable

3. Tap the APK file to install

4. Grant permissions when prompted

### Option 2: Google Play Store
Coming soon...

## First Launch

1. App initializes SQLite database
2. Loads seed data (shops, products, categories)
3. Ready to use immediately (no login required)

## Admin Panel Access

- Tap menu button (≡) on home screen
- Select "Admin Panel"
- Enter PIN: \`1234\` (default)
- First login: Create new PIN

## Troubleshooting

**App crashes on launch:**
- Clear app data: Settings → Apps → Store Guliston → Clear Cache/Data
- Reinstall the APK

**Can't find APK file:**
- Check Downloads folder
- Enable file manager access

**Permission denied:**
- Settings → Apps → Store Guliston → Permissions → Enable all

## Support
For issues, contact: support@storeguliston.com
EOF

# Create checksum file
echo "🔐 Creating checksums..."
cd dist/apk
sha256sum * > SHA256SUMS
cd ../..

# Display results
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ APK Build Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 File Sizes:"
du -h dist/apk/*.apk

echo ""
echo "📁 Distribution Directory: dist/"
echo ""
echo "Files ready for distribution:"
ls -lh dist/apk/

echo ""
echo "✨ Next Steps:"
echo "1. Review dist/metadata/release-info.json"
echo "2. Upload dist/apk/* to CDN/hosting"
echo "3. Update app download URLs"
echo "4. Distribute release link to users"
echo ""
echo "Debug symbols stored in: debug-info/"
echo "Keep these secure for crash reporting!"
echo ""
echo "═══════════════════════════════════════════════════════════"
