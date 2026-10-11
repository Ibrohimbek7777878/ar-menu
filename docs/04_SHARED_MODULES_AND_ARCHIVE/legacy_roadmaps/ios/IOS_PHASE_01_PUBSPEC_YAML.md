# 🍎 iOS FAZA I-1: pubspec.yaml ni yangilash
## Yandex Maps → Google Maps ga o'tish

---

## 🎯 Maqsad
Yandex Maps iOS da ishlamaydi (native library yo'q). Shuning uchun **Google Maps** ga o'tamiz. Bu faza faqat `pubspec.yaml` faylini yangilaydi.

---

## 📄 Qaysi fayl o'zgaradi?
- `store_guliston_v1/pubspec.yaml`

---

## 🔧 Nima qilish kerak?

### 1. pubspec.yaml ni oching
Fayl: `store_guliston_v1/pubspec.yaml`

### 2. O'chiriladigan qator
"# Maps" bo'limini toping va **quyidagini o'chiring**:

```yaml
# ❌ BU QATORNI O'CHIRING (Yandex Maps iOS da ishlamaydi)
  yandex_mapkit: ^4.0.0
```

Agar `yandex_mapkit` `pubspec.yaml` da bo'lmasa, hech narsa o'chirmang.

### 3. Qo'shiladigan qatorlar
Xuddi shu "# Maps" bo'limiga **quyidagini qo'shing**:

```yaml
# Maps (iOS + Android universal)
  google_maps_flutter: ^2.6.0
```

### 4. pubspec.yaml dagi "Maps" bo'limi yakuniy holati:
```yaml
  # Maps
  google_maps_flutter: ^2.6.0
  geolocator: ^10.1.0
  geocoding: ^3.0.0
```

### 5. Paketlarni o'rnatish
Terminalda quyidagi buyruqni bajaring:

```bash
cd store_guliston_v1
flutter pub get
```

---

## ✅ Natija
- ✅ `google_maps_flutter` qo'shildi (iOS + Android da ishlaydi)
- ✅ `yandex_mapkit` o'chirildi (iOS da ishlamaydi)
- ✅ Barcha paketlar o'rnatildi
- ✅ `flutter pub get` xatosiz yakunlandi

---

## ❗ Agar xatolik bo'lsa

### Xato: "package google_maps_flutter not found"
```bash
flutter clean
flutter pub get
```

### Xato: "version solving failed"
```bash
# Versiyani o'zgartirib ko'ring
google_maps_flutter: ^2.5.0  # eskiroq versiya
```

### Xato: "yandex_mapkit: ^4.0.0 not found"
Agar `yandex_mapkit` `pubspec.yaml` da bo'lmasa, tashvishlanmang — bu normal.

---

## 📝 Eslatma
Bu faza **eng muhim** fazadir. Agar `yandex_mapkit` ni o'chirmasangiz, iOS da build qilganda xato chiqadi. Google Maps esa **ham iOS, ham Android** da ishlaydi.

---

## 🔗 Keyingi faza
Faza I-2: Google Maps Service (MapsService) yaratish