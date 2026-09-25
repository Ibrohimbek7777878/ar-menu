# 🍎 iOS FAZA I-3: Info.plist — Permissions
## Lokatsiya, kamera va galereya ruxsatlari

---

## 🎯 Maqsad
iOS da ilova ishlashi uchun kerakli ruxsatlarni `Info.plist` fayliga qo'shish. Bu ruxsatlarsiz iOS da kamera, lokatsiya va galereya ishlamaydi.

---

## 📄 Qaysi fayl o'zgaradi?
- `store_guliston_v1/ios/Runner/Info.plist`

---

## 🔧 Nima qilish kerak?

### 1. Info.plist ni oching
Fayl: `store_guliston_v1/ios/Runner/Info.plist`

### 2. Faylning ichini toping
Info.plist XML formatda. U `plist` va `dict` teglari bilan boshlanadi:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- MAVJUD KOD SHU YERDA -->
    <!-- KEYINGI QADAM: PASTDAGI KODNI SHU YERGA QO'SHING -->
</dict>
</plist>
```

### 3. Quyidagi kodni `<dict>` ichiga qo'shing

Ushbu kodni `Info.plist` faylining `<dict>` tegi ichidagi istalgan joyga qo'shing (masalan, eng oxiriga, `</dict>` dan oldin):

```xml
    <!-- ====== iOS RUXSATLAR ====== -->
    
    <!-- Lokatsiya ruxsati (ilova ishlatayotganda) -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Yetkazish manzilini aniqlash uchun lokatsiya kerak</string>
    
    <!-- Lokatsiya ruxsati (doimiy) -->
    <key>NSLocationAlwaysUsageDescription</key>
    <string>Yaqin do'konlarni topish uchun lokatsiya kerak</string>
    
    <!-- Lokatsiya ruxsati (iOS 13+ uchun) -->
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Xarita va yetkazish xizmatlari uchun lokatsiya kerak</string>
    
    <!-- Kamera ruxsati (mahsulot rasmini tortish) -->
    <key>NSCameraUsageDescription</key>
    <string>Mahsulot rasmini tortish uchun kamera kerak</string>
    
    <!-- Galereya ruxsati (rasm o'qish) -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Mahsulot rasmini yuklash uchun galereya kerak</string>
    
    <!-- Galereya ruxsati (rasm saqlash) -->
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Rasmlarni saqlash uchun galereya kerak</string>
```

### 4. Yakuniy fayl ko'rinishi
Taxminan shunday bo'lishi kerak:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Flutter default settings -->
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    
    <!-- ... boshqa mavjud sozlamalar ... -->
    
    <!-- ====== iOS RUXSATLAR ====== -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Yetkazish manzilini aniqlash uchun lokatsiya kerak</string>
    <key>NSLocationAlwaysUsageDescription</key>
    <string>Yaqin do'konlarni topish uchun lokatsiya kerak</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Xarita va yetkazish xizmatlari uchun lokatsiya kerak</string>
    <key>NSCameraUsageDescription</key>
    <string>Mahsulot rasmini tortish uchun kamera kerak</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Mahsulot rasmini yuklash uchun galereya kerak</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Rasmlarni saqlash uchun galereya kerak</string>
</dict>
</plist>
```

---

## ✅ Natija
- ✅ Lokatsiya ruxsati (WhenInUse + Always) qo'shildi
- ✅ Kamera ruxsati (mahsulot rasmi uchun) qo'shildi
- ✅ Galereya ruxsati (rasm o'qish + saqlash) qo'shildi
- ✅ Barcha matnlar o'zbek tilida
- ✅ iOS da permission dialog chiqadi

---

## 🧪 Qanday tekshirish mumkin?

1. Ilovani iPhone/Simulator da ishga tushiring
2. Lokatsiya so'ralganda: ✅ "Yetkazish manzilini aniqlash uchun lokatsiya kerak" dialogi chiqadi
3. Kamera ochilganda: ✅ "Mahsulot rasmini tortish uchun kamera kerak" dialogi chiqadi
4. Galereya ochilganda: ✅ "Mahsulot rasmini yuklash uchun galereya kerak" dialogi chiqadi

---

## ❗ Agar xatolik bo'lsa

### Muammo: "This app has crashed because it attempted to access privacy-sensitive data"
**Sabab:** Permission Info.plist da yo'q.
**Yechim:** Yuqoridagi permissionlarni qo'shing.

### Muammo: Permission dialog chiqmaydi
**Sabab:** Permission kodi noto'g'ri.
**Yechim:** Key-ing (kalit) nomini tekshiring. Masalan `NSLocationWhenInUseUsageDescription` ni `NSLocationWhenInUse` deb yozmang.

### Muammo: "No permission handler found"
```bash
cd ios && pod install && cd ..
```

---

## 📝 Eslatma

- iOS 13+ da **NSLocationAlwaysAndWhenInUseUsageDescription** majburiy
- Kamera va galereya ruxsatlari `image_picker` paketi uchun kerak
- Bu ruxsatlarsiz iOS da app store reject qilinadi
- Barcha matnlar foydalanuvchiga tushunarli bo'lishi kerak (o'zbek tilida)

---

## 🔗 Keyingi faza
Faza I-4: Google Cloud Console — API Key yaratish