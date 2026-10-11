# ARMENU — Loyiha To'liq Tavsifi
> **Lovable.dev Context Document v2.0** | HoReCa AR/3D Menu Platform

---

## 1. LOYIHA MAQSADI

**ARMENU** — Markaziy Osiyo bozori uchun yaratilgan **B2B SaaS restoran menejment platformasi**. Har bir restoran QR kod orqali mehmonlarga interaktiv raqamli menyu taqdim etadi, bunda taomlarni **augmented reality (AR) va 3D formatda** ko'rish imkoniyati mavjud. Mehmon telefonini taomga yo'naltirganda, taom go'yo stol ustida turibdi — bu "wow-effekt" xarid qarorini 40%+ oshiradi.

### Nima uchun yaratildi?
- Qog'oz menyu eskirgan, qimmat va yangilanmaydi
- Oddiy foto-menyu yetarli emas — mehmon nimani yeyayotganini ko'rmaydi
- Oshpazxona bilan zal o'rtasida real-vaqt muloqot yo'qligi buyurtmalarni kechiktiradi
- O'zbekistonda hech bir mahalliy platform AR menyuni taklif qilmaydi

### Maqsadli bozor (HoReCa Only)
| Segment | Misollar | Ulush |
|---|---|---|
| Premium restoranlar | Milliy, Gourmet, Fine Dining | 40% |
| Casual dinning | Pizza, Burger, Fast Casual | 35% |
| To'yxona / Banket | To'y, Yubiley, Korporativ | 15% |
| Kafe / Bar | Kofe, Kokteyl, Lounge | 10% |

### Nimani taklif qilmaydi
- ❌ Online do'kon (e-commerce)
- ❌ Yetkazib berish (delivery)
- ❌ Oziq-ovqat ombori boshqaruvi
- ❌ Moliyaviy hisobot

---

## 2. FOYDALANUVCHILAR VA ROLLAR

### 2.1 Mehmon (Guest) — Asosiy foydalanuvchi
**Yo'l:** QR kodni skan → menyu ochiladi → taom ko'riladi → AR/3D → savatga → to'lov

- Ro'yxatdan o'tmaydi, sessiya localStorage da saqlanadi
- Menyu ko'radi, taomni 3D/AR da ko'radi
- Savatga qo'shadi, buyurtma beradi
- Bill so'raydi, to'laydi (Payme/Click/Naqd)
- Til tanlaydi: 🇺🇿 o'zbek / 🇷🇺 rus / 🇬🇧 ingliz

### 2.2 Ofitsiant (Waiter)
- Stol bo'yicha buyurtmalarni ko'radi (WebSocket orqali real-vaqt)
- Mehmonni chaqirish bildirishnomasi oladi
- Bill so'rovini ko'radi

### 2.3 Oshpaz / Oshxona (KDS — Kitchen Display System)
**Sahifa:** `/kds/{token}/`
- Yangi buyurtmalarni darhol ko'radi (WebSocket push)
- Status: Yangi → Tayyorlanmoqda → Tayyor → Berildi
- Katta shrift — masofadan o'qiladi
- Countdown timer har buyurtmada

### 2.4 Restoran Admin
**Sahifa:** `/admin/{tenant}/`
- Menyu boshqarish (kategoriya + taomlar)
- 3D model yuklash
- Tahlil va statistika
- Xodimlar boshqaruvi
- Narx va til sozlamalari

### 2.5 SuperAdmin (Platform Owner)
- Barcha restoranlarni ko'radi
- Yangi restoran qo'shadi / o'chiradi
- SaaS billing boshqaradi

---

## 3. TEXNIK ARXITEKTURA

### 3.1 Stack
```
Backend:     Django 5.0.9 (Python 3.12)
ASGI Server: Daphne (HTTP + WebSocket)
Database:    PostgreSQL (multi-tenant, shared schema)
Cache/WS:    Redis 7 + Django Channels
Frontend:    Vanilla JS + HTML5 (mobile-first)
3D Engine:   <model-viewer> (Google) — WebXR + Quick Look
AR:          WebXR Device API (Android) / USDZ Quick Look (iOS)
i18n:        JSON dictionaries (uz/ru/en)
Media:       Django FileField → /media/
Auth:        Django sessions + JWT (API)
```

### 3.2 Multi-Tenant Arxitektura
```
armenu.uz/m/{slug}/          ← Har bir restoran o'z URL ga ega
armenu.uz/admin/{slug}/      ← Restoran admini
armenu.uz/kds/{token}/       ← Oshxona ekrani (token bilan himoyalangan)
armenu.uz/superadmin/        ← Platform boshqaruvi
```

**Izolyatsiya:** Har bir `Restaurant` obyekti o'z `slug`iga ega. Barcha ma'lumotlar `restaurant_id` bo'yicha filtrlanadi. Mehmon faqat o'z restoraning ma'lumotlarini ko'radi.

### 3.3 AR / 3D Pipeline
```
1. Admin GLB fayl yuklaydi → /media/ar/glb/{id}.glb
2. Background task: GLB → USDZ konvertatsiya (iOS uchun)
3. Background task: Poster rasm generatsiya (thumbnail)
4. DishModel3D modeli: {glb, usdz, poster, real_size_cm, glb_bytes}
5. Mehmon taomni bosadi → /v1/ar/{dish_id}/ API chaqiriladi
6. <model-viewer> komponenti yuklaydi
7. Fallback: AR → 3D → 360° → Rasm
```

### 3.4 Real-time WebSocket
```
ws://host/ws/kds/{token}/    ← Oshxona real-vaqt yangilanishi
ws://host/ws/orders/{slug}/  ← Ofitsiant yangilanishi
Protokol: Django Channels (Redis Channel Layer)
```

### 3.5 Ma'lumotlar Modeli (Asosiy)
```
Restaurant
├── Category (tartiblangan)
│   └── Dish
│       ├── DishTranslation (uz/ru/en)
│       ├── DishModel3D (glb, usdz, poster)
│       └── DishModifier (o'lcham, qo'shimcha)
├── Order
│   ├── OrderItem
│   └── OrderStatus (history)
└── RestaurantSettings (til, rang, logo)
```

---

## 4. API ENDPOINTLAR

### 4.1 Guest API (ochiq, auth yo'q)
```http
GET  /v1/menu/{slug}/?lang=uz          ← To'liq menyu (kategoriya + taomlar)
GET  /v1/dish/{id}/?lang=uz            ← Taom detail + upsell + o'xshash
GET  /v1/ar/{dish_id}/                 ← AR ma'lumotlari (GLB, USDZ, poster)
POST /v1/orders/create/                ← Yangi buyurtma
GET  /v1/guest/bill/{session_id}/      ← To'lov hisob
POST /v1/guest/payment/                ← To'lov amalga oshirish
```

### 4.2 Menu API Response
```json
GET /v1/menu/{slug}/?lang=uz
{
  "restaurant": {
    "name": "ARMENU Demo",
    "logo": "/media/logos/demo.png",
    "color_primary": "#E85D2A",
    "currency": "UZS",
    "lang_options": ["uz", "ru", "en"]
  },
  "categories": [
    {
      "id": 1,
      "name": "Non-ushta",
      "icon": "🍜",
      "dishes": [
        {
          "id": 101,
          "name": "Non-ushta klassik",
          "description": "An'anaviy o'zbek taomlari...",
          "price": 45000,
          "image": "/media/dishes/101.jpg",
          "has_3d": true,
          "has_ar": true,
          "rating_avg": 4.8,
          "rating_count": 124,
          "is_popular": true,
          "is_new": false,
          "tags": ["halol", "spicy"],
          "weight_g": 350
        }
      ]
    }
  ]
}
```

### 4.3 AR API Response
```json
GET /v1/ar/{dish_id}/
{
  "ready": true,
  "name": "Non-ushta klassik",
  "glb": "/media/ar/glb/101.glb",
  "usdz": "/media/ar/usdz/101.usdz",
  "poster": "/media/ar/poster/101.jpg",
  "real_size_cm": "28×18×8",
  "glb_bytes": 2048000,
  "supports_webxr": true
}
```

### 4.4 KDS API
```json
GET /v1/orders/kds/{token}/
{
  "orders": [
    {
      "id": 1,
      "table_no": 5,
      "status": "new",
      "items": [
        {"name": "Non-ushta", "qty": 2, "modifiers": ["kichik"]}
      ],
      "created_at": "2026-09-17T10:00:00",
      "elapsed_min": 3
    }
  ]
}
```

---

## 5. PAPKA STRUKTURASI

```
AR_MENU_LOYIHA/
├── apps/
│   ├── menu/          ← Restaurant, Category, Dish modellari
│   ├── orders/        ← Order, OrderItem, OrderStatus
│   ├── ar3d/          ← DishModel3D, GLB pipeline
│   ├── payments/      ← Payme, Click integratsiyasi
│   ├── kds/           ← KDS WebSocket consumer
│   └── accounts/      ← Admin auth, tenant management
├── static/
│   └── guest/
│       ├── css/
│       │   ├── theme.css     ← Design tokens, CSS variables
│       │   ├── menu.css      ← Menyu sahifasi
│       │   └── ar.css        ← AR/3D modal
│       ├── js/
│       │   ├── menu.js       ← Render + filter + search
│       │   ├── dish.js       ← Taom modal + animatsiya
│       │   ├── cart.js       ← Savat logikasi
│       │   └── ar.js         ← AR modal + model-viewer
│       └── i18n/
│           ├── uz.json
│           ├── ru.json
│           └── en.json
├── templates/
│   └── guest/
│       ├── menu.html         ← Asosiy menyu sahifasi
│       └── ar_modal.html     ← AR ko'rish modali
└── DESIGN_SPECS/
    ├── PROJECT_OVERVIEW.md   ← Bu fayl
    └── DESIGN_SYSTEM.md      ← Dizayn spesifikatsiyasi
```

---

## 6. BIZNES MODEL (SaaS B2B)

### Narx Rejalari
| Tarif | Narx/oy | Filial | Limit |
|---|---|---|---|
| Starter | 299 000 so'm | 1 | 50 taom, 5 ta 3D model |
| Pro | 599 000 so'm | 1 | Cheksiz taom, 50 ta 3D |
| Business | 1 499 000 so'm | 3 | Cheksiz, API kirish |
| Enterprise | Kelishiladi | Cheksiz | White-label, custom |

### Asosiy Raqobat Ustunligi
1. **AR/3D** — O'zbekistonda birinchi menyu platformasi bu xizmat bilan
2. **Offline-ready** — Internet sekin bo'lsa ham menyu ishlaydi
3. **Multi-til** — O'zbek, Rus, Ingliz bir vaqtda
4. **Real-time KDS** — Oshxona bilan WebSocket integratsiyasi
5. **QR ga qaramlik yo'q** — Link orqali ham ochiladi

---

## 7. LOVABLE.DEV UCHUN KONTEKST

### Nima kerak
Bu loyiha uchun **mehmon menyu interfeysi** (frontend) ishlab chiqish kerak. Backend to'liq tayyor, API endpointlar ishlaydi. Lovable.dev faqat **UI/UX** qismi uchun ishlatiladi.

### Texnik Cheklovlar
- **Mobile-first**: 90% foydalanuvchi telefonda (375px dan boshlansin)
- **Minimal JS bundle**: Restoran WiFi sekin, <100KB JS
- **Vanilla JS yoki minimal framework**: React/Vue dan qoching (performance)
- **CSS custom properties**: Design token tizimi albatta saqlansin
- **model-viewer**: Google 3D komponenti, CDN dan yuklanadi
- **Progressive enhancement**: 3D yo'q qurilmada ham ishlaydi

### Brand Identity
- **Asosiy rang**: `#E85D2A` (Ember Orange) — O'ZGARTIRMANG
- **Muvaffaqiyat**: `#10B981` (Emerald) — 3D/AR badge uchun
- **Fon (dark)**: `#0A0C14` (Obsidian)
- **Shrift**: Inter (Google Fonts)
- **Hissiyot**: Premium, zamonaviy, ishonchli, appetizing

### Demo URL
```
Menyu:  http://127.0.0.1:8060/m/demo/
API:    http://127.0.0.1:8060/v1/menu/demo/?lang=uz
AR:     http://127.0.0.1:8060/v1/ar/1/
```
