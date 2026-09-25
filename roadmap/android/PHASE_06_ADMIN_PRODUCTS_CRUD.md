# 📦 FAZA 6 — ADMIN MAHSULOTLAR BOSHQARUVI (CRUD)

## 🎯 Maqsad
Admin tomonidan mahsulotlarni to'liq boshqarish: qo'shish, tahrirlash, o'chirish, filter, bulk narx o'zgartirish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.3 Mahsulotlar Boshqaruvi
- `BACKEND_PROMPT_SENIOR.md` — Shop Service Products API

## 🔧 Tafsilotlar

### 6.1 `AdminProductsScreen`
```dart
- Filterlar:
  * Do'kon bo'yicha (Dropdown)
  * Kategoriya bo'yicha (Dropdown)
  * Mavjudligi bo'yicha (Switch: faqat mavjud/yo'q/hammasi)
- Qidiruv (mahsulot nomi)
- Grid yoki List ko'rinishi (toggle)
- Pull-to-refresh
- Qo'shish (+) FloatingActionButton
- Har bir mahsulot uchun: Tahrirlash (✏️) | O'chirish (🗑️)
```

### 6.2 `AddEditProductScreen`
```dart
Fields:
- Mahsulot nomi (TextField)
- Tavsifi (TextField, multiline, max 3 qator)
- Narxi (TextField, number keyboard, so'm format)
- O'lchov birligi (Dropdown: dona, kg, litr, paket)
- Rasm (ImagePicker - Camera/Gallery)
- Kategoriya (Dropdown - SQLite dan)
- Do'kon (Dropdown - SQLite dan)
- Mavjudligi (Switch)
- Ombor soni (TextField, number)

Validation:
- Nomi bo'sh bo'lmasligi kerak
- Narxi > 0
- Ombordagi soni >= 0
```

### 6.3 Bulk narx o'zgartirish
```dart
// Bir do'kondagi barcha mahsulotlar narxini % ga o'zgartirish
Future<void> bulkPriceUpdate(String shopId, double percentage) async {
  final db = await _dbHelper.database;
  await db.rawUpdate('''
    UPDATE products 
    SET price = price * (1 + ? / 100)
    WHERE shop_id = ?
  ''', [percentage, shopId]);
}
```

### 6.4 `AdminProductsProvider`
```dart
class AdminProductsProvider with ChangeNotifier {
  Future<List<Product>> getProductsByShop(String shopId) async { /* SQLite */ }
  Future<Product> createProduct(Product p) async { /* SQLite */ }
  Future<Product> updateProduct(String id, Product p) async { /* SQLite */ }
  Future<bool> deleteProduct(String id) async { /* SQLite soft */ }
  Future<void> bulkPriceUpdate(String shopId, double percent) async { /* SQLite */ }
}
```

## ✅ Natija
- Mahsulotlarni to'liq CRUD
- Filter va qidiruv
- Bulk narx o'zgartirish
- Chiroyli grid/list ko'rinishi