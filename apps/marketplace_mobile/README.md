# Online Store Guliston

O'zbekiston (Yangi Yer, Guliston) kichik do'konlari uchun local e-commerce mobil ilova.

## Texnologiya

- Flutter + Dart
- Provider (state management)
- GoRouter (navigation)
- SQLite (offline-first database)

## Loyiha holati

- MVP prototip — 25% tayyor
- Backend yo'q — SQLite offline cache
- Admin panel: CRUD (do'kon, mahsulot, buyurtma)
- Customer flow: katalog → savat → buyurtma

## O'rnatish

```bash
cd store_guliston_v1
flutter pub get
flutter run
```

## Loyiha tuzilishi

```
lib/
├── config/       # Theme, routing, colors
├── database/     # SQLite helper
├── models/       # Data models (Shop, Product, Order)
├── providers/    # Provider state management
├── repositories/ # Data access layer
├── screens/      # UI screens (admin + customer)
├── services/     # Business logic
├── utils/        # Helper functions
└── widgets/      # Reusable components
```

## Admin kirish

Home ekranda logotipni **uzoq bosish (long-press)** orqali admin panelga kirish mumkin.

## Keyingi qadamlar

- [ ] Firebase/Supabase backend qo'shish
- [ ] Telegram bot integratsiyasi
- [ ] Haqiqiy rasmlar qo'shish
- [ ] Dark theme
- [ ] Push notification
- [ ] Release APK build
