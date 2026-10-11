# 🏷️ FAZA 8 — KATEGORIYALAR + KURYERLAR BOSHQARUVI

## 🎯 Maqsad
Admin tomonidan kategoriyalar va kuryerlarni boshqarish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.5 Kategoriyalar, 3.6 Kuryerlar
- `BACKEND_PROMPT_SENIOR.md` — Categories schema, Courier management

## 🔧 Tafsilotlar

### 8.1 Kategoriyalar (CategoriesScreen)
```dart
- Kategoriyalar ro'yxati (ListView)
- Har bir kategoriya: nomi, icon, rangi, tartib raqami
- Qo'shish / Tahrirlash / O'chirish

Fields:
- Kategoriya nomi (TextField)
- Icon (IconPicker - Material Icons)
- Rang (ColorPicker - hex color)
- Tartib raqami (NumberField)

Database:
// categories table allaqachon bor, faqat admin UI qo'shiladi
```

### 8.2 Kuryerlar (CouriersScreen)
```dart
- Kuryerlar ro'yxati
- Qo'shish / Tahrirlash / O'chirish
- Status indikatori (Faol=🟢, Band=🟡, Dam olishda=🔴)

Fields:
- Kuryer ismi (TextField)
- Telefon (TextField, +998 XX XXX XX XX)
- Holati (Dropdown: active, busy, offline)
- Bugungi buyurtmalar soni (read-only, SQLite dan)

Database:
```sql
CREATE TABLE IF NOT EXISTS couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'busy', 'offline')),
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### 8.3 `AdminCategoriesProvider` + `AdminCouriersProvider`
```dart
class AdminCategoriesProvider with ChangeNotifier {
  Future<List<Category>> getCategories() async { /* SQLite */ }
  Future<bool> createCategory(Category c) async { /* SQLite */ }
  Future<bool> updateCategory(String id, Category c) async { /* SQLite */ }
  Future<bool> deleteCategory(String id) async { /* SQLite */ }
}

class AdminCouriersProvider with ChangeNotifier {
  Future<List<Courier>> getCouriers() async { /* SQLite */ }
  Future<bool> createCourier(Courier c) async { /* SQLite */ }
  Future<bool> updateCourier(String id, Courier c) async { /* SQLite */ }
  Future<bool> deleteCourier(String id) async { /* SQLite */ }
  Future<int> getTodayOrderCount(String courierId) async { /* SQLite COUNT */ }
}
```

## ✅ Natija
- Kategoriyalarni icon va rang bilan boshqarish
- Kuryerlarni status bilan boshqarish
- Bugungi buyurtmalar sonini ko'rish