# LOYIHA 5 DAQIQADA

> Bu faylni **bir marta** o'qi. Loyihani tushunish uchun shu yetarli.

---

## 1. NIMA QURILADI

**ARMENU** — restoran/choyxona uchun AR/3D menyu platformasi.

```
Mijoz stolga o'tiradi
   │
   ├─ Stoldagi QR ni skanerlaydi  ────► telefonida menyu ochiladi (3 tilda)
   │
   ├─ Taomni bosadi ───► "AR'da ko'rish" ───► kamera ochiladi
   │                                          taom stol ustida REAL O'LCHAMDA
   │                                          paydo bo'ladi, aylantiriladi
   │
   ├─ Yoqdi ───► savatga ───► buyurtma
   │
   ▼
Ofitsiant telefoniga: 🔔 "STOL 5 — yangi buyurtma"
Oshxona monitoriga:   buyurtma kanban taxtasiga tushadi
Admin ekraniga:       jonli oqimda ko'rinadi
   │
   ▼
Oshpaz tayyorlaydi ──► "Tayyor" ──► ofitsiant olib boradi ──► mijoz to'laydi
```

---

## 2. 3 ROL

| Rol | Kirish | Nima qiladi |
|---|---|---|
| 👤 **Mijoz** | QR skanerlash (auth yo'q) | Menyu ko'radi, AR'da ko'radi, buyurtma beradi, to'laydi |
| 🧑‍🍳 **Ofitsiant** | PIN kod | Buyurtmani ko'radi, **stol raqamini** biladi, olib boradi |
| 👨‍💼 **Admin** | Login | Menyu, stol, xodim, hisobot — hammasini boshqaradi |

Qo'shimcha: 🍳 **KDS** (oshxona TV monitori), 💵 **Kassa**, 🔧 **Super-admin** (platforma egasi).

---

## 3. TEXNOLOGIYALAR

```
Backend    Django 5 + DRF + Channels (WebSocket)
DB         PostgreSQL (+ pgvector) + Redis
Frontend   PWA (ilova YO'Q) — vanilla JS / Vue 3
AR/3D      <model-viewer>  →  iOS: USDZ (AR Quick Look)
                              Android: GLB (Scene Viewer)
3D yaratish Meshy / Tripo API (rasm → 3D)
To'lov     paytechuz (Payme + Click + Uzum)
Fiskal     UZKASSA / e-POS (OFD)
AI         8 provayder MCP orqali (Claude, Gemini, GPT, Groq, ...)
Deploy     systemd + nginx + gunicorn + daphne
```

---

## 4. ⚡ ENG MUHIM 5 TA G'OYA

### 4.1 AR real o'lchamda bo'lishi SHART
Model **metrda** modellanadi (lagan Ø32 sm = `0.32 m`), `ar-scale="fixed"`.
Noto'g'ri o'lcham = butun loyiha ma'nosini yo'qotadi.

### 4.2 3D kutubxona — asosiy aktiv
Umumiy o'zbek taomlari bazasi (osh, manti, somsa...). Yangi restoran kelsa —
model **tayyor**, 0 xarajat. Bu raqobatchi 2-3 yilda takrorlay olmaydigan ustunlik.

```
1-restoran:   kontent 1 250 000 so'm  →  marja 62%
100-restoran: kontent    50 000 so'm  →  marja 85%
```

### 4.3 Multi-tenant izolyatsiya — xavfsizlik #1
Har so'rovda `restaurant_id` filtri. Restoran A restoran B ma'lumotini
**hech qachon** ko'rmasligi kerak. CI'da test majburiy.

### 4.4 Mijozga WebSocket faqat buyurtmadan keyin
Menyu ko'rayotgan mijozga WS **kerak emas**. Bu 1 mln foydalanuvchida
WS ulanishni 1 mln dan ~90 000 ga tushiradi (20 server o'rniga 3 ta).

### 4.5 Uzoq ish → worker servis
3D generatsiya 3-40 daqiqa. Web so'rovda **hech qachon** qilinmaydi.
Redis navbat → alohida worker servis.

---

## 5. FAZALAR (0 → 100)

```
FAZA 0   Tayyorgarlik        3 kun     Django skelet ishlaydi
FAZA 1   Tenant + Auth       1 hafta   Restoran, xodim, PIN kirish
FAZA 2   Menyu               2 hafta   Kategoriya, taom, 3 til, kesh
FAZA 3   Stol + QR           1 hafta   Noyob QR, PDF chop
FAZA 4   Mijoz PWA           2 hafta   Menyu ko'rish, savat
FAZA 5   Buyurtma + realtime 2 hafta   Buyurtma, KDS, ofitsiant
FAZA 6   ⚡ AR/3D           2,5 hafta  AR ISHLAYDI ← asosiy
FAZA 7   Zal plani           1 hafta   2D drag&drop
FAZA 8   Admin panel        1,5 hafta  Dashboard, hisobot
FAZA 9   AI + MCP           1,5 hafta  Chatbot, avto-tarjima
─────────────────────────────────────────────────────
                         v1 = 15 hafta  ✅ ISHLAYDIGAN MAHSULOT
FAZA 10  To'lov + fiskal     2 hafta   Payme/Click, OFD chek
FAZA 11  Sodiqlik + analitika 1,5 hafta Keshbek, otziv, menyu-injiniring
FAZA 12  Deploy + kuzatuv    1 hafta   Production, monitoring
─────────────────────────────────────────────────────
                       v1.5 = 19,5 hafta ✅ SOTUVGA TAYYOR
```

---

## 6. ⛔ IZOLYATSIYA (eng muhim ogohlantirish)

Bu **alohida loyiha**. `mebelcity_platform` ga hech qanday tegish yo'q:

| | ARMENU | mebelcity_platform |
|---|---|---|
| Papka | `/home/user/armenu/` | TEGILMAYDI |
| DB | `armenu_db` | `tenant_*` TEGILMAYDI |
| Redis | `db=5` | `db=0..4` TEGILMAYDI |
| Port | 8060 (web), 8061 (ws) | 8040/8041 TEGILMAYDI |
| Servis | `armenu*.service` | `bittada-*` TEGILMAYDI |

---

## 7. FAYL STRUKTURASI (qisqacha)

```
armenu/
├── config/settings/{base,dev,prod,test}.py
├── core/           ← umumiy: middleware, mixin, resilience, queue, ws
├── apps/
│   ├── tenants/    ← Restaurant (asosiy tenant)
│   ├── accounts/   ← User, Staff, JWT, PIN
│   ├── menu/       ← Category, Dish, Modifier
│   ├── tables/     ← Hall, Table, QR
│   ├── guest/      ← Guest, GuestSession
│   ├── orders/     ← Order, holat mashinasi, KDS
│   ├── ar3d/       ← ⚡ DishModel3D, DishLibrary, pipeline
│   ├── payments/   ← Payme, Click, Uzum
│   ├── fiscal/     ← OFD, IKPU
│   ├── ai/         ← ⚡ MCP router, chatbot
│   └── ...
├── static/{guest,staff,kds,admin_ui}/
├── templates/
├── locale/{uz,ru,en}/
└── tests/
```

---

**➡️ Keyingi:** `02_QOIDALAR.md`
