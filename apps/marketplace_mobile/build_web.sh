#!/bin/bash
# Build web app with optimizations

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🌐 Web build qilinyapti..."

# Ensure web platform exists
if [ ! -d "web" ]; then
    echo "📁 web/ papkasi yaratilinyapti..."
    mkdir -p web
fi

# Clean previous build
echo "🧹 Eski build o'chirilinyapti..."
rm -rf build/web 2>/dev/null || true

# Get dependencies
echo "📦 Dependencylar yuklaninyapti..."
flutter pub get

# Enable web (if not already)
echo "🔧 Web platform sozlaninyapti..."
flutter config --enable-web

# Build for web with HTML renderer
echo "🏗️  Web build boshlaninyapti..."
flutter build web \
    --dart-define=FLUTTER_WEB_USE_SKIA=false \
    --dart-define=FLUTTER_WEB_RENDERER=html \
    --release \
    --split-debug-info=build/web/debug \
    2>&1 | tee build_web.log

echo ""
echo "✅ Web build tayyar!"
echo "📍 Output: build/web/index.html"
echo ""
echo "🚀 Chrome uchun ishga tushirish:"
echo "   flutter run -d chrome"
