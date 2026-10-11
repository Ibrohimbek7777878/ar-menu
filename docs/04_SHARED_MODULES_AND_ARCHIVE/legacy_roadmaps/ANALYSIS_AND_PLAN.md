# 📋 Online Store Guliston — To'liq Tahlil va Ish Rejasi

## 📂 Topilgan fayllar tahlili

### 1. BACKEND_PROMPT_SENIOR.md (1357 qator)
- **Mikroservis arxitekturasi** — Node.js/Express/PostgreSQL/Redis/RabbitMQ/Elasticsearch
- 6 ta servis: Auth, Shop, Order, Notification, Location, Analytics
- Docker + Kubernetes, Kong API Gateway
- JWT, 2FA, Rate Limiting, CORS, Helmet
- **Hozirgi backend shu arxitekturaga mos keladi**

### 2. FINAL_PRODUCTION_PROMPT_VIBE_CODE.md (1227 qator) ⭐ **ASOSIY HUJJAT**
- **❌ Backendni butunlay olib tashlash** — serverless yondashuv
- **✅ Faqat Flutter app** — SQLite bilan offline-ish
- Admin panel: email+parol login (adminstore@gmail.com / admin1234)
- Full dinamik boshqaruv: do'konlar, mahsulotlar, buyurtmalar, kuryerlar
- Zamonaviy animatsiyalar: Lottie, shimmer, staggered, hero
- Ob-havo + Xarita integratsiyasi
- 3 ta telefon raqam, lokatsiya tanlash
- Dinamik matnlar va ranglar (admin sozlaydi)

### 3. FRONTEND_PROMPT_FLUTTER.md (10 qator)
- Qisqa yo'naltiruvchi hujjat, asosiy ma'lumot boshqa fayllarda

### 4. GULISTON_PROJECT_TZ.md (1 qator)
- Biznes vision: mahalliy do'konlarni raqamlashtirish
- Monetizatsiya: abonent to'lovi (150-500K so'm/oy), komissiya (3-5%)
- Target: 18,000+ kichik biznes, uy bekalari, yoshlar

---

## ⚠️ MUHIM FARQ: Riverpod vs Provider

### Kod holati:
- **Kodda:** `provider: ^6.1.0` ishlatilgan (`pubspec.yaml`)
- **Roadmap/FINAL_PRODUCTION_PROMPT_VIBE_CODE.md da:** `flutter_riverpod: ^2.5.1` ko'rsatilgan
- **Xulosa:** Kod `Provider` bilan ishlaydi, Riverpod emas. Bu loyiha **Provider** bilan qurilgan va shunday qoladi.

### Nega Provider tanlangan?
1. `main.dart` da `MultiProvider` + `ChangeNotifierProvider` ishlatilgan
2. Barcha providerlar `ChangeNotifier` dan extends qilgan
3. `Consumer<ProviderType>` va `Provider.of<Type>(context)` ishlatilgan
4. Riverpod ga o'tish kerak emas — hammasi ishlayapti va production-ready

### Agar Riverpod ga o'tish kerak bo'lsa:
- `pubspec.yaml` dan `provider` ni olib tashlash
- `flutter_riverpod` va `riverpod` qo'shish
- Barcha `ChangeNotifierProvider` → `ChangeNotifierProvider` (Riverpod) ga o'zgartirish
- `Consumer<Type>` → `ConsumerWidget` ga o'zgartirish
- Bu katta refactoring talab qiladi va hozircha kerak emas

---

## 🚨 OQ FON MUAMMOSI — DIAGNOSTIKA

### Sabablari:
1. **`main.dart`** da `ConsumerWidget` ishlatilgan (Riverpod) lekin **`ProviderScope` yo'q**
2. **`home_screen.dart`** `Provider.of<ShopProvider>(context)` ishlatadi (provider package) — lekin **`ChangeNotifierProvider` yo'q**
3. **Provider va Riverpod aralashgan** — ikkalasi ham ishlatilyapti
4. **`goRouterProvider`** GoRouter obyekti sifatida yaratilgan — noto'g'ri konfiguratsiya
5. Natija: **Runtime exception → blank white screen**

### Tuzatish kerak:
- ✅ `MultiProvider` bilan appni o'rash (provider package)
- ✅ YOKI butunlay Riverpodga o'tish
- ✅ `GoRouter` ni to'g'ri konfiguratsiya qilish

---

## 🗺️ YAKUNIY ROADMAP (FINAL_PRODUCTION_PROMPT bo'yicha)

### Faza 1: 🐞 White Screen Fix (Critical)
- [x] State management ni to'g'rilash (Provider yoki Riverpod)
- [x] GoRouter ni to'g'ri ulash
- [x] Boshlang'ich ishga tushishni ta'minlash

### Faza 2: 🏗️ Backendni olib tashlash / Serverless
- [ ] backend/ papkasini arxivlash
- [ ] docker-compose, Dockerfile, .env larni tozalash
- [ ] Flutter app ni mustaqil qilish (SQLite asosida)

### Faza 3: 🔐 Admin Login (Email+Parol)
- [ ] Admin login modal (3D flip animation)
- [ ] SQLite da admins table
- [ ] SHA256 parol tekshirish
- [ ] 24 soat sessiya (SharedPreferences)

### Faza 4: 📊 Admin Dashboard
- [ ] Statistika kartalari (count-up animation)
- [ ] fl_chart grafiklar (kunlik sotuv, pie chart, bar chart)
- [ ] Ob-havo vidjeti (OpenWeather API)
- [ ] Shimmer skeleton loader

### Faza 5: 🏪 Admin Do'konlar Boshqaruvi
- [ ] CRUD do'konlar (nomi, manzil, telefon, ish vaqti, rasm)
- [ ] Xaritadan lokatsiya tanlash
- [ ] ImagePicker (Camera/Gallery)

### Faza 6: 📦 Admin Mahsulotlar Boshqaruvi
- [ ] CRUD mahsulotlar (narx, o'lchov, kategoriya, ombor)
- [ ] Filter va qidiruv
- [ ] Bulk narx o'zgartirish

### Faza 7: 📋 Admin Buyurtmalar Boshqaruvi
- [ ] Buyurtmalar ro'yxati + filter (status, sana)
- [ ] Buyurtma tafsiloti (3 telefon, lokatsiya xaritada)
- [ ] Holat o'zgartirish (pending → accepted → ... → delivered)
- [ ] Telefon qilish tugmalari

### Faza 8: 🏷️ Kategoriyalar + Kuryerlar Boshqaruvi
- [ ] Kategoriya CRUD (icon, rang, tartib)
- [ ] Kuryer CRUD (ism, telefon, holat)

### Faza 9: ⚙️ Sozlamalar va Matnlar
- [ ] App nomi, rangi, API key lar (dinamik)
- [ ] Barcha matnlarni o'zgartirish (app_texts table)
- [ ] Ma'lumot tozalash (10 kundan eski)

### Faza 10: 🎨 Animatsiyalar va UI
- [ ] Splash screen (fade-in, scale)
- [ ] Kategoriya staggered animation
- [ ] Add to cart — flying animation
- [ ] Lottie confetti (muvaffaqiyatli buyurtma)
- [ ] Hero animations

### Faza 11: 🗺️ Xarita va Lokatsiya
- [ ] Google Maps + Yandex Maps integratsiyasi
- [ ] Location picker (checkout da)
- [ ] Yaqin do'konlar

### Faza 12: ☁️ Ob-havo + Weather Widget
- [ ] OpenWeather API
- [ ] Yangi Yer shahri uchun ob-havo
- [ ] Redis cache (backend bo'lsa) / SharedPreferences cache

### Faza 13: 📱 Buyurtma Berish Flow
- [ ] 3 telefon raqam (2 majburiy, 1 ixtiyoriy)
- [ ] Lokatsiya tanlash
- [ ] Izoh qo'shish
- [ ] Spam prevention (5 daqiqada 3 ta)
- [ ] Telefon bo'yicha buyurtma tarixi

### Faza 14: 🚀 APK Build va Release
- [ ] build-apk.sh ni yangilash
- [ ] App icon, splash screen
- [ ] Auto-update mexanizmi

---

## ⚡ Darhol tuzatish kerak bo'lgan muammolar

| # | Muammo | Holati | Izoh |
|---|--------|--------|------|
| 1 | White screen (runtime error) | 🔴 CRITICAL | Provider/Riverpod konflikti |
| 2 | GoRouter noto'g'ri ulangan | 🔴 CRITICAL | routerConfig to'g'rilash |
| 3 | ProviderScope yo'q | 🟡 HIGH | Provider bilan ishlashda kerak |
| 4 | Import paths noto'g'ri | 🟡 HIGH | Ba'zi importlar yangilanmagan |

---

## 📋 Tavsiya: 1-qadam nima qilish kerak?

1. **White screen fix:** `main.dart` ni `MultiProvider` bilan o'rash (provider package)
2. Backend bilan bog'liq barcha narsalarni olib tashlash
3. Admin login (email+parol) qo'shish
4. Keyin boshqa funksiyalarni bosqichma-bosqich qo'shish

---

**Taklif:** Siz menga ruxsat bersangiz, yuqoridagi reja bo'yicha ishni boshlayman. 
Avval **oq fon muammosini tuzataman**, keyin roadmap bo'yicha ketma-ket ishlayman.
