# 📱 FAZA 3 — ADMIN LOGIN (EMAIL + PAROL)

## 🎯 Maqsad
Admin panelga kirish uchun email+parol login tizimini yaratish. Oddiy foydalanuvchilar uchun ro'yxatdan o'tish YO'Q.

## 📄 Asoslangan fayllar
- `FINAL_PRODUCTION_PROMPT_VIBE_CODE.md` — "Faoliy uchun admin login tizimi"
- `BACKEND_PROMPT_SENIOR.md` — JWT authentication (offline versiya)
- `GULISTON_PROJECT_TZ.md` — "Zero friction UX (ro'yxatdan o'tishsiz)"

## 🔧 Tafsilotlar

### 3.1 Login ma'lumotlari
- **Email:** adminstore@gmail.com
- **Parol:** admin1234
- **Sessiya:** 24 soat (SharedPreferences)
- **Saqlash:** SQLite `admins` table, SHA256 parol hash

### 3.2 Database `admins` table
```sql
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT 'Super Admin',
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Default admin (email: adminstore@gmail.com, password: admin1234)
INSERT OR IGNORE INTO admins (id, email, password_hash, full_name) VALUES 
  ('admin_1', 'adminstore@gmail.com', '0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d622c0', 'Super Admin');
```

### 3.3 Admin Login Modal (Home Screen da)
```dart
// home_screen.dart da "Admin Panel" tugmasi
// - FloatingActionButton yoki icon
// - 3D flip animation
// - Modal bottom sheet (slide up)
// - Email + Password TextFields
// - Login button (ripple + loading)
```

### 3.4 `AdminAuth` service
```dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../database/database_helper.dart';

class AdminAuth {
  static const String _sessionKey = 'admin_session';
  static const String _sessionExpiryKey = 'admin_session_expiry';

  Future<bool> login(String email, String password) async {
    final db = await DatabaseHelper().database;
    final bytes = utf8.encode(password);
    final hash = sha256.convert(bytes).toString();

    final result = await db.query(
      'admins',
      where: 'email = ? AND password_hash = ?',
      whereArgs: [email, hash],
    );

    if (result.isNotEmpty) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_sessionKey, email);
      await prefs.setInt(_sessionExpiryKey, DateTime.now().millisecondsSinceEpoch + (24 * 60 * 60 * 1000));
      return true;
    }
    return false;
  }

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_sessionKey);
    final expiry = prefs.getInt(_sessionExpiryKey);
    if (email == null || expiry == null) return false;
    if (DateTime.now().millisecondsSinceEpoch > expiry) {
      await logout();
      return false;
    }
    return true;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(_sessionExpiryKey);
  }
}
```

### 3.5 `AdminLoginScreen`
- Modal bottom sheet ko'rinishida
- Chiroyli animatsiya (scale + fade)
- Xato xabarlari (SnackBar)
- Muvaffaqiyatli login → `/admin/dashboard`

### 3.6 Home Screen da admin tugmasi
- `FloatingActionButton` yoki bosh ekranda kichik icon
- 3 marta tez bosish yoki ochiq tugma (FINAL_PRODUCTION_PROMPT bo'yicha)
- Animatsiya bilan modal ochiladi

## ✅ Natija
- Admin email+parol bilan kiradi
- 24 soat sessiya saqlanadi
- Oddiy foydalanuvchi hech qanday ro'yxatdan o'tmaydi
- Admin panelga kirish xavfsiz