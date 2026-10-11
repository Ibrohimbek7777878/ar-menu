# 🍎 iOS FAZA I-5: Xcode sozlamalari
## AppDelegate.swift + Podfile + Xcode konfiguratsiyasi

---

## 🎯 Maqsad
iOS loyihasida Google Maps API Key ni ulash, Podfile ni yangilash va Xcode da kerakli sozlamalarni o'rnatish.

---

## 📄 Qaysi fayllar o'zgaradi?
1. `store_guliston_v1/ios/Runner/AppDelegate.swift`
2. `store_guliston_v1/ios/Podfile`

---

## 🔧 Nima qilish kerak?

### 1. AppDelegate.swift ni yangilash

Fayl: `store_guliston_v1/ios/Runner/AppDelegate.swift`

**Mavjud kodni quyidagi bilan almashtiring:**

```swift
import UIKit
import Flutter
import GoogleMaps  // ← BU QATORNI QO'SHING

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    // ← BU QATORNI QO'SHING (API Key ni o'rnating)
    // "YOUR_API_KEY" ni Google Cloud dan olgan API Key bilan almashtiring
    GMSServices.provideAPIKey("YOUR_API_KEY")
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

**MUHIM:** `"YOUR_API_KEY"` ni oldingi fazada yaratgan API Key bilan almashtiring!

### 2. Podfile ni yangilash

Fayl: `store_guliston_v1/ios/Podfile`

**Mavjud kodni quyidagi bilan almashtiring:**

```ruby
# Uncomment this line to define a global platform for your project
platform :ios, '13.0'  # ← iOS 13 minimum versiyasi

# CocoaPods analytics sends network stats synchronously affecting flutter build latency.
ENV['COCOAPODS_DISABLE_STATS'] = 'true'

project 'Runner', {
  'Debug' => :debug,
  'Profile' => :release,
  'Release' => :release,
}

def flutter_root
  generated_xcode_build_settings_path = File.expand_path(File.join('..', 'Flutter', 'Generated.xcconfig'), __FILE__)
  unless File.exist?(generated_xcode_build_settings_path)
    raise "#{generated_xcode_build_settings_path} must exist. If you're running pod install manually, make sure flutter pub get is executed first"
  end

  File.foreach(generated_xcode_build_settings_path) do |line|
    matches = line.match(/FLUTTER_ROOT\=(.*)/)
    return matches[1].strip if matches
  end
  raise "FLUTTER_ROOT not found in #{generated_xcode_build_settings_path}. Try deleting Generated.xcconfig, then run flutter pub get"
end

require File.expand_path(File.join('packages', 'flutter_tools', 'bin', 'podhelper'), flutter_root)

flutter_ios_podfile_setup

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
  
  # ← BU QATORNI QO'SHING (Google Maps uchun)
  pod 'GoogleMaps'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    # ← BU QISMNI QO'SHING (iOS 13+ uchun)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

### 3. Pods o'rnatish

Terminalda quyidagi buyruqlarni bajaring:

```bash
# 1. iOS papkasiga o'ting
cd store_guliston_v1/ios

# 2. Pods o'rnating
pod install

# 3. Agar pod install xato bersa, avval tozalang
pod deintegrate
pod install

# 4. Loyiha papkasiga qayting
cd ..
```

### 4. Xcode da Bundle Identifier tekshirish

1. Terminalda quyidagi buyruqni bajaring:
```bash
open ios/Runner.xcworkspace
```

2. Xcode ochilganda:
   - Chap panelda **Runner** loyihasini tanlang
   - **Signing & Capabilities** tab ga o'ting
   - **Bundle Identifier** ni kiriting: `com.example.storeGuliston`
   - **Team** ni tanlang (Apple Developer account kerak)
     - Agar account yo'q bo'lsa, `appleid.apple.com` da bepul account yarating
     - Keyin Xcode da **Add Account** → Apple ID bilan kiring

3. **Build Settings** tab ga o'ting
   - **iOS Deployment Target** ni qidiring
   - **13.0** ga o'rnating

---

## ✅ Natija
- ✅ AppDelegate.swift ga Google Maps API Key qo'shildi
- ✅ Podfile yangilandi (iOS 13.0 minimum, GoogleMaps pod)
- ✅ Pods o'rnatildi (xatosiz)
- ✅ Xcode da Bundle Identifier o'rnatildi
- ✅ iOS Deployment Target 13.0

---

## 🧪 Qanday tekshirish mumkin?

```bash
# Xcode da hech qanday xato yo'qligini tekshiring
flutter build ios --debug --no-codesign
```

Agar build muvaffaqiyatli bo'lsa, hamma narsa to'g'ri sozlangan.

---

## ❗ Agar xatolik bo'lsa

### Muammo: "GoogleMaps not found" / "module 'GoogleMaps' not found"
```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
flutter clean
flutter pub get
```

### Muammo: "IPHONEOS_DEPLOYMENT_TARGET = 13.0" xatosi
```bash
# Podfile da platform :ios, '13.0' ni tekshiring
# Va post_install blokida target.build_configurations qismini tekshiring
```

### Muammo: "Signing for Runner requires a development team"
**Yechim:** Xcode da **Signing & Capabilities** → **Team** ni tanlang. Agar team yo'q bo'lsa, Apple ID bilan kiring.

### Muammo: "No account for team"
**Yechim:** 
1. `appleid.apple.com` ga kiring
2. Apple ID yarating
3. Xcode → Preferences → Accounts → Apple ID qo'shing

### Muammo: "SDK "iphoneos" not found"
```bash
sudo xcode-select --reset
```

---

## 📝 Eslatma

- **API Key ni AppDelegate.swift da o'rnatish majburiy** — aks holda Google Maps ishlamaydi
- iOS 13.0 minimum versiya — bu 2019 yildan keyingi barcha iPhone larni qo'llab-quvvatlaydi
- Apple Developer account **bepul** — App Store ga chiqarish uchun $99/yil to'lash kerak
- Simulatorda test qilish uchun Apple Developer account **shart emas**

---

## 🔗 Keyingi faza
Faza I-6: Location Picker Google Maps ga o'tkazish