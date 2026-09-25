# 🏪 FAZA 5 — ADMIN DO'KONLAR BOSHQARUVI (CRUD)

## 🎯 Maqsad
Admin tomonidan do'konlarni to'liq boshqarish: qo'shish, tahrirlash, o'chirish, qidirish, filter.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.2 Do'konlar Boshqaruvi
- `BACKEND_PROMPT_SENIOR.md` — Shop Service API endpointlari

## 🔧 Tafsilotlar

### 5.1 `AdminShopsScreen`
```dart
- Barcha do'konlar jadvali (ListView)
- Qidiruv (nomi, manzil bo'yicha)
- Filter: Shahar (Yangi Yer / Guliston), Kategoriya, Holat (ochiq/yopiq)
- Qo'shish (+) FloatingActionButton
- Har bir do'kon uchun: Tahrirlash (✏️) | O'chirish (🗑️)
- Pull-to-refresh
```

### 5.2 `AddEditShopScreen`
```dart
Fields (Screenshots bilan):
- Do'kon nomi (TextField)
- Manzili (TextField + Xaritadan tanlash tugmasi)
- Shahar (Dropdown: Yangi Yer / Guliston)
- Telefon (TextField, +998 XX XXX XX XX mask)
- Ish vaqti boshlanishi (TimePicker)
- Ish vaqti tugashi (TimePicker)
- Rasm (ImagePicker - Camera/Gallery)
- Kategoriya (Dropdown)
- Ochiq/Yopiq (Switch)
- Reyting (Slider 1-5)

Validation:
- Barcha majburiy maydonlar tekshiriladi
- Telefon formati: +998XXXXXXXXX
- Ish vaqti: boshlanish < tugash

Actions:
- Saqlash → SQLite insert/update
- Bekor qilish → orqaga qaytish
```

### 5.3 SQLite da do'kon CRUD
```dart
// DatabaseHelper ga qo'shimcha metodlar
Future<List<Map>> getShopsFiltered({String? city, String? category, bool? isOpen}) async {
  // Dinamik WHERE bilan so'rov
}

Future<bool> softDeleteShop(String id) async {
  // Soft delete - is_active = false qilish
}
```

### 5.4 `AdminShopsProvider`
```dart
class AdminShopsProvider with ChangeNotifier {
  List<Shop> _shops = [];
  bool _isLoading = false;
  
  Future<void> loadShops() async { /* SQLite dan */ }
  Future<bool> createShop(Shop shop) async { /* SQLite ga */ }
  Future<bool> updateShop(String id, Shop shop) async { /* SQLite da */ }
  Future<bool> deleteShop(String id) async { /* SQLite dan */ }
}
```

### 5.5 UI dizayni
- Material Design 3
- Card-based list
- Rounded corners, shadows
- Image placeholder (agar rasm bo'lmasa)
- Status indicator (Open = yashil, Closed = qizil)

## ✅ Natija
- Admin do'konlarni to'liq boshqaradi
- CRUD operatsiyalari SQLite da
- Chiroyli UI (ImagePicker, TimePicker, Dropdown)
- Filter va qidiruv