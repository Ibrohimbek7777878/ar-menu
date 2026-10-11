# ⚙️ FAZA 9 — SOZLAMALAR VA MATNLAR BOSHQARUVI

## 🎯 Maqsad
Admin tomonidan ilova sozlamalari va barcha matnlarni dinamik boshqarish.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — 3.7 Sozlamalar, 3.8 Matnlar
- `GULISTON_PROJECT_TZ.md` — Dinamik kontent boshqaruvi

## 🔧 Tafsilotlar

### 9.1 `AdminSettingsScreen`
```dart
- Parolni o'zgartirish (current + new password)
- Ilova nomini o'zgartirish (TextField)
- Ilova rangini o'zgartirish (ColorPicker)
- Ob-havo API key (TextField, mask bilan)
- Yandex Maps API key (TextField)
- Ma'lumotlarni tozalash (10 kundan eski buyurtmalar)
- Database backup (export .db fayl)
- Database restore (import .db fayl)
- Admin chiqish (Logout)
```

### 9.2 `AppTextsScreen`
```dart
// Barcha matnlarni o'zgartirish
- Bosh sahifa sarlavhasi
- Kategoriya sarlavhasi
- Buyurtma tugmasi matni
- Muvaffaqiyat xabarlari
- Xato xabarlari
- Help matnlari
- Do'kon bo'limi matnlari
- Savat bo'limi matnlari

// Har bir matn uchun: TextField, Save, Reset qiymati
```

### 9.3 Database tables
```sql
CREATE TABLE IF NOT EXISTS app_texts (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default texts
INSERT OR IGNORE INTO app_texts (key, value) VALUES
  ('app_name', 'Online Store Guliston'),
  ('home_title', 'Do\'konlar'),
  ('categories_title', 'Kategoriyalar'),
  ('order_button', 'Buyurtma berish'),
  ('success_message', 'Buyurtmangiz qabul qilindi!'),
  ('cart_title', 'Savat'),
  ('checkout_title', 'Buyurtma berish'),
  ('profile_title', 'Profil');

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('primary_color', '#327F60'),
  ('weather_api_key', ''),
  ('yandex_maps_key', ''),
  ('app_name', 'Online Store Guliston');
```

### 9.4 `AdminSettingsProvider`
```dart
class AdminSettingsProvider with ChangeNotifier {
  Future<void> updateSetting(String key, String value) async { /* SQLite */ }
  Future<String> getSetting(String key) async { /* SQLite */ }
  Future<void> updatePassword(String currentPw, String newPw) async { /* SQLite */ }
  Future<void> cleanupOldData() async { /* Delete orders older than 10 days */ }
  Future<void> logout() async { /* Clear session */ }
}
```

### 9.5 Dinamik ranglar va matnlarni qo'llash
```dart
// main.dart da app nomi va rangini dinamik o'qish
Future<ThemeData> getDynamicTheme() async {
  final prefs = await SharedPreferences.getInstance();
  final colorHex = prefs.getString('primary_color') ?? '#327F60';
  final color = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));
  
  return ThemeData(
    primaryColor: color,
    // ...
  );
}
```

## ✅ Natija
- Admin ilova nomi, rangi, API key larini o'zgartira oladi
- Ilova matnlarini (sarlavha, tugma, xabar va bo'lim nomlari) tahrirlash mumkin
- Sozlamalar va matnlar ma'lumotlar bazasiga saqlanadi
- Dinamik rang va nom `main.dart` da qo'llanadi

## 🛠️ Amalga oshirilgan o'zgarishlar
- `lib/database/database_helper.dart` ga `app_settings` va `app_texts` jadvali qo'shildi
- `lib/providers/admin_settings_provider.dart` yaratildi
- `lib/screens/admin/admin_settings_screen.dart` yaratildi
- `lib/screens/admin/app_texts_screen.dart` yaratildi
- `lib/config/router_config.dart` ga `/admin/settings` va `/admin/texts` yo'llari qo'shildi
- `lib/screens/admin/admin_dashboard_screen.dart` dagi tezkor navigatsiyaga Sozlamalar va Matnlar bo'limi qo'shildi
- `lib/main.dart` da `AdminSettingsProvider` ro'yxatga olindi va ilova nomi/rangi dinamik qilindi
- `lib/screens/home_screen.dart` da bosh sahifa sarlavhasi va ilova nomi dinamik matnlardan o'qiladi

## 📌 Holat
- Faza 9: Sozlamalar + Matnlar — ✅ Tugallandi
- Faza 10: Animatsiyalar — [reja mavjud]
- Faza 11: Xarita + Lokatsiya — [reja mavjud]
- Faza 12: Ob-havo — [reja mavjud]
- Faza 13: Buyurtma flow — [reja mavjud]
- Faza 14: APK build — [reja mavjud]
- Barcha matnlar dinamik (hardcoded emas)
- Ma'lumot tozalash (10 kundan eski)
- Parol o'zgartirish