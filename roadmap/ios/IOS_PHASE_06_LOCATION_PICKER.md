# 🍎 iOS FAZA I-6: Location Picker — Google Maps ga o'tkazish
## Yandex Maps → Google Maps

---

## 🎯 Maqsad
`location_map_screen.dart` faylidagi Yandex Maps kodlarini Google Maps ga almashtirish. Bu screen foydalanuvchiga xaritadan yetkazish manzilini tanlash imkonini beradi.

---

## 📄 Qaysi fayllar o'zgaradi?
- `store_guliston_v1/lib/screens/location_map_screen.dart` (mavjud)
- `store_guliston_v1/lib/screens/checkout_screen.dart` (agar Yandex Maps import bo'lsa)

---

## 🔧 Nima qilish kerak?

### 1. location_map_screen.dart ni oching

Fayl: `store_guliston_v1/lib/screens/location_map_screen.dart`

**MUHIM:** Bu faylda hech qanday `yandex_mapkit` importi yo'q. U `geolocator` va `geocoding` paketlaridan foydalanadi. Shuning uchun bu faylga hech qanday o'zgarish kiritish **shart emas**.

### 2. Tekshirish: location_map_screen.dart da Yandex Maps bormi?

Yandex Maps kodi uchun `yandex_mapkit` yoki `YandexMap` so'zlarini qidiring:

```bash
grep -r "yandex_mapkit\|YandexMap\|YandexController" store_guliston_v1/lib/
```

Agar hech qanday natija chiqmasa, Yandex Maps kodi yo'q — hammasi yaxshi.

### 3. Agar Yandex Maps topilsa

Agar `grep` natija qaytarsa (masalan `checkout_screen.dart` da), quyidagi o'zgartirishlarni bajaring:

**ESKI KOD:**
```dart
// ❌ Yandex Maps (iOS da ishlamaydi)
import 'package:yandex_mapkit/yandex_mapkit.dart';
```

**YANGI KOD:**
```dart
// ✅ Google Maps (iOS + Android da ishlaydi)
import 'package:google_maps_flutter/google_maps_flutter.dart';
```

### 4. location_map_screen.dart dagi mavjud kod tahlili

Hozirgi `location_map_screen.dart`:

```dart
// ✅ Geolocator va Geocoding importlari — iOS da ishlaydi
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

// ✅ Google Maps yo'nalishlari (Google Maps link)
final googleUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination');

// ✅ Geolocator.distanceBetween — masofa hisoblash
final da = Geolocator.distanceBetween(...)
```

Hozirgi kod **allaqachon iOS va Android bilan mos**.

### 5. Agar Google Maps (interaktiv xarita) qo'shmoqchi bo'lsangiz

Hozirgi `location_map_screen.dart` da interaktiv xarita yo'q — faqat statik preview. Agar interaktiv Google Maps qo'shmoqchi bo'lsangiz:

```dart
// location_map_screen.dart ga Google Maps qo'shish (ixtiyoriy)
import 'package:google_maps_flutter/google_maps_flutter.dart';

GoogleMap(
  initialCameraPosition: CameraPosition(
    target: LatLng(40.5966, 68.7786), // Yangi Yer
    zoom: 14,
  ),
  onTap: (position) {
    // Marker qo'yish
  },
  markers: {
    Marker(
      markerId: MarkerId('selected'),
      position: LatLng(40.5966, 68.7786),
    ),
  },
  myLocationEnabled: true,
)
```

---

## ✅ Natija
- ✅ `location_map_screen.dart` da Yandex Maps yo'q
- ✅ Barcha importlar iOS bilan mos
- ✅ Google Maps yo'nalish linki ishlaydi
- ✅ Geolocator iOS da ishlaydi
- ✅ Hech qanday o'zgarish kiritish shart emas

---

## 🧪 Qanday tekshirish mumkin?

```bash
# Yandex Maps kodi yo'qligini tekshiring
grep -r "yandex" store_guliston_v1/lib/

# Agar hech narsa chiqmasa, hamma narsa to'g'ri
```

---

## ❗ Agar xatolik bo'lsa

### Muammo: "Undefined name 'YandexMap'"
**Yechim:** `yandex_mapkit` importini topib, Google Maps ga almashtiring.

### Muammo: "Google Maps not showing"
**Yechim:**
1. API Key ni tekshiring (Faza I-4 da yaratilgan)
2. AppDelegate.swift da `GMSServices.provideAPIKey(...)` ni tekshiring
3. Google Cloud Console da **Maps SDK for iOS** yoqilganligini tekshiring

### Muammo: "Location permission denied"
**Yechim:** Info.plist da permissionlar borligini tekshiring (Faza I-3)

---

## 📝 Eslatma

- `location_map_screen.dart` **allaqachon iOS bilan mos** — hech qanday o'zgarish kerak emas
- Agar interaktiv Google Maps qo'shmoqchi bo'lsangiz, ixtiyoriy
- Google Maps Flutter da ishlashi uchun API Key majburiy

---

## 🔗 Keyingi faza
Faza I-7: Location Provider — iOS permission handler