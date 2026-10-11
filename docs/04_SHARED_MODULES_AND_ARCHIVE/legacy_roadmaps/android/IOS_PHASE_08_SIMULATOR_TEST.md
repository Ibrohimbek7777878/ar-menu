# 🍎 iOS FAZA I-8: iOS Simulator da test qilish
## Ilovani iPhone Simulator da ishga tushirish va test qilish

---

## 🎯 Maqsad
Ilovani iOS Simulator da ishga tushirish va barcha funksiyalarni test qilish. Bu faza orqali ilova iOS da to'liq ishlashiga ishonch hosil qilamiz.

---

## 🔧 Nima qilish kerak?

### 1. iOS Simulator ni ochish

```bash
# 1. Simulator ni ochish
open -a Simulator

# 2. Agar Simulator o'rnatilmagan bo'lsa, Xcode orqali o'rnating:
xcode-select --install
```

Simulator ochilganda, unda iPhone ko'rinadi. Agar birinchi marta ochsangiz, iPhone SE (yoki default) modeli ochiladi.

### 2. Simulator modelini tanlash

```bash
# 1. Mavjud simulatorlarni ko'rish
flutter devices

# 2. Natija quyidagicha bo'ladi:
# macOS (desktop)
# iPhone 15 Pro (mobile) • ios • com.apple.CoreSimulator.SimRuntime.iOS-17-4
# iPhone 15 (mobile) • ios • ...
```

### 3. Ilovani ishga tushirish

```bash
# Eng so'nggi simulator da ishga tushirish
flutter run

# Yoki ma'lum bir simulator da ishga tushirish
flutter run -d "iPhone 15 Pro"
```

Agar birinchi marta ishga tushirsangiz, build biroz vaqt oladi (~5 daqiqa).

### 4. Test checklist — barchasini tekshiring

| # | Test | Natija |
|---|------|--------|
| 1 | Ilova ochiladi (splash screen) | □ |
| 2 | Do'konlar ro'yxati ko'rinadi | □ |
| 3 | Do'konni bosish → mahsulotlar ko'rinadi | □ |
| 4 | Mahsulotni savatga qo'shish | □ |
| 5 | Savatni ochish | □ |
| 6 | Buyurtma berish (checkout) | □ |
| 7 | Lokatsiya permission dialogi chiqadi | □ |
| 8 | Lokatsiya tanlash (Location Map) | □ |
| 9 | Xarita yo'nalishlari ochiladi | □ |
| 10 | Admin login (adminstore@gmail.com / admin1234) | □ |
| 11 | Admin dashboard ochiladi | □ |
| 12 | Admin do'konlar CRUD | □ |
| 13 | Admin mahsulotlar CRUD | □ |
| 14 | Admin buyurtmalar | □ |
| 15 | Settings (sozlamalar) | □ |
| 16 | Ob-havo vidjeti ko'rinadi | □ |

### 5. Simulator da lokatsiyani sozlash

Xarita va lokatsiya test qilish uchun Simulator da lokatsiyani o'rnatish kerak:

**Usul 1 — Simulator menyusi orqali:**
```
Simulator → Features → Location → Custom Location
Latitude: 40.5966
Longitude: 68.7786
```

**Usul 2 — Terminal orqali:**
```bash
# Yangi Yer uchun lokatsiya o'rnatish
xcrun simctl location booted set 40.5966,68.7786
```

### 6. Kamera test qilish

Simulator da kamera ishlamaydi. Kamera test qilish uchun real iPhone kerak. Simulator da kamera bosilganda xato chiqmasligi kerak — agar xato chiqsa, `image_picker` paketi sozlamalarini tekshiring.

---

## ✅ Natija
- ✅ Ilova Simulator da ishga tushdi
- ✅ Barcha 16 ta testdan o'tdi
- ✅ Lokatsiya permission dialogi chiqdi
- ✅ Google Maps yo'nalishlari ochildi
- ✅ Admin login ishladi
- ✅ Hech qanday crash yo'q

---

## ❗ Agar xatolik bo'lsa

### Muammo: "No simulator found"
```bash
# Xcode o'rnatilganligini tekshiring
xcode-select --version
which xcodebuild

# Agar Xcode o'rnatilmagan bo'lsa, App Store dan Xcode yuklab oling
```

### Muammo: "Could not find iPhone simulator"
```bash
# Xcode da simulyatorlarni o'rnating
open -a Xcode
# Xcode → Settings → Platforms → iOS → Install
```

### Muammo: "App crashed on launch" (oq ekran)
**Sabab:** Provider/Riverpod konflikti
**Yechim:** Faza 1 (oq fon muammosi) to'g'ri bajarilganligini tekshiring

### Muammo: "Google Maps not showing"
**Sabab:** API Key noto'g'ri yoki yo'q
**Yechim:** 
1. `AppDelegate.swift` da API Key ni tekshiring
2. Google Cloud Console da Maps SDK for iOS yoqilgan

### Muammo: "Location permission denied"
```bash
# Simulator da Settings ga kiring
# Settings → Privacy & Security → Location Services → Store Guliston → While Using the App
```

### Muammo: "Build failed — module not found"
```bash
flutter clean
flutter pub get
cd ios
pod deintegrate
pod install --repo-update
cd ..
flutter run
```

---

## 📝 Eslatma

- Birinchi build ~5 daqiqa vaqt oladi
- Keyingi buildlar ~1-2 daqiqa
- Simulator **App Store da ishlamaydi** — faqat development uchun
- Kamera test qilish uchun **real iPhone** kerak
- Simulator da `flutter run` buyrug'i bilan ishga tushirish mumkin

---

## 🔗 Keyingi faza
Faza I-9: iOS Release Build — App Store uchun tayyorlash