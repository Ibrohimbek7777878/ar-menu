# 🍎 iOS FAZA I-9: iOS Release Build
## App Store uchun tayyorlash

---

## 🎯 Maqsad
Ilovani App Store ga chiqarish uchun release build tayyorlash. Bu faza faqat **Apple Developer account** ($99/yil) bo'lsa kerak. Agar account bo'lmasa, development build bilan test qilish mumkin.

---

## 🔧 Nima qilish kerak?

### 1. Development Build (Test uchun — Apple Developer account shart emas)

```bash
# Debug build (tezkor test uchun)
flutter build ios --debug

# Bu build faqat Simulator da ishlaydi
# Fayl: build/ios/iphonesimulator/Runner.app
```

### 2. Release Build (App Store uchun — Apple Developer account kerak)

```bash
# Release build (real iPhone da ishlaydi)
flutter build ios --release

# Bu build faqat real iPhone da ishlaydi
# Fayl: build/ios/iphoneos/Runner.app
```

### 3. IPA fayl yaratish (Xcode Archive)

Release build dan so'ng IPA yaratish kerak:

```bash
# 1. Xcode da loyihani oching
open ios/Runner.xcworkspace

# 2. Xcode da:
#    - Yuqori menyu: Product → Archive
#    - Archive tugaganidan keyin:
#      * Distribute App → App Store Connect
#      * Upload → Submit

# 3. Yoki terminal orqali:
flutter build ios --release --export-method app-store
```

### 4. Build variantlari

| Build turi | Buyruq | Qayerda ishlaydi | Account kerak |
|------------|--------|-----------------|---------------|
| Debug | `flutter build ios --debug` | Simulator | ❌ |
| Release | `flutter build ios --release` | Real iPhone | ✅ |
| App Store | `flutter build ios --release --export-method app-store` | App Store | ✅ |
| Development | `flutter build ios --release --export-method development` | Real iPhone (test) | ✅ |

### 5. App Store ga chiqarish uchun kerakli ma'lumotlar

| Ma'lumot | Qiymat |
|----------|--------|
| App nomi | Online Store Guliston |
| Bundle ID | `com.example.storeGuliston` |
| iOS versiya | 13.0 minimum |
| iPhone modellari | iPhone SE (2nd gen) va undan yangi |
| Til | O'zbek, Rus, Ingliz |
| Kategoriya | Shopping |
| Price | Free |

---

## ✅ Natija
- ✅ Development build (debug) tayyor — Simulator da test uchun
- ✅ Release build tayyor — real iPhone da test uchun
- ✅ IPA fayl yaratildi (agar Apple Developer account bo'lsa)
- ✅ App Store ga chiqarishga tayyor

---

## ❗ Agar xatolik bo'lsa

### Muammo: "No profiles for 'com.example.storeGuliston' were found"
**Yechim:** 
1. Xcode → Signing & Capabilities → Team tanlang
2. **PROVISIONING_PROFILE_SPECIFIER** ni tekshiring

### Muammo: "Code signing is required"
**Yechim:** 
```bash
# Xcode da:
# 1. Preferences → Accounts → Apple ID qo'shing
# 2. Signing & Capabilities → Automatically manage signing → YES
```

### Muammo: "error: No signing certificate"
```bash
# Xcode da Preferences → Accounts → View Details → +
# iOS Development / iOS Distribution certifikat yarating
```

### Muammo: "Failed to create IPA"
```bash
# Xcode Archive dan keyin:
# Window → Organizer → Archvni tanlang → Distribute App
```

### Muammo: "App Store submission error"
1. App Store Connect da `https://appstoreconnect.apple.com` ga kiring
2. Yangi app yarating
3. Barcha required fields ni to'ldiring (screenshot, description, privacy policy)

---

## 📝 Eslatma

- **Apple Developer account** $99/yil — App Store ga chiqarish uchun majburiy
- Agar account bo'lmasa, faqat Simulator va real iPhone da (sideload) test qilish mumkin
- Development build (debug) faqat Simulator da ishlaydi
- Release build **real iPhone da** ishlaydi (Apple Developer account bilan)
- IPA fayl **Xcode Archive** orqali yaratiladi
- App Store ga chiqarish uchun **screenshot, description, privacy policy** kerak

### Agar hozircha App Store ga chiqarmoqchi bo'lmasangiz:
`flutter build ios --debug` bilan Simulator da ishlatishingiz mumkin.

---

## 🔗 Keyingi faza
Faza I-10: Android Google Maps API Key — AndroidManifest.xml