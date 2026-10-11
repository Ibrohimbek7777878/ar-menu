# 📘 LOYIHA HANDOFF HUJJATI — ONLINE STORE GULISTON & AR/3D RESTORAN OS

**Hujjat kodi:** `HANDOFF-GULISTON-RESTAURANT-OS-2026-V3`  
**Sana va Vaqt:** 11-Oktyabr, 2026-yil  
**Loyiha nomi:** Online Store Guliston / AR-3D Restoran Ekosistemasi  
**Dasturlash tillari & Stek:**  
- **Frontend:** React 19, TypeScript 5.9, Vite 8, Pure CSS (Component-scoped & Responsive Grid/Flex), HTML5 Canvas Photogrammetry Studio, Web Audio API.  
- **Backend:** Python 3.12, Django 6.0.7, Django REST Framework 3.17, SimpleJWT, SQLite3 / PostgreSQL, Redis tayyor.  
- **Git Repozitoriylari:**
  - Markaziy: `origin` (`git@github.com:Ibrohimbek7777878/online_Store.git`) -> `main`
  - Alohida Menyu SPA: `menu` (`git@github.com:Ibrohimbek7777878/3d-ar-menu-.git`) -> `main`

---

## 🎯 1. LOYIHANING MAQSADI VA KATTA VIZIYASI

Loyiha ikki qavatli gibrid tizimdan iborat:

1. **Giper-lokal E-tijorat & Marketplace (Guliston va Yangiyer bozori):**
   - Mahalliy tadbirkorlar va do'konlar uchun 60 xil shablonli do'kon konstruktori, mahsulotlar katalogi, yetkazib berish va to'lov tizimlari.
2. **Restoran Operatsion Tizimi (AR/3D Menu & 4-Modulli Restoran OS):**
   - Mehmon restoranga kelganda stol ustidagi QR kod yoki NFC orqali menyuga kiradi.
   - Taomlarni 360° interaktiv va 3D/AR ko'rinishda tomosha qiladi, buyurtma beradi.
   - Buyurtma bir vaqtning o'zida Oshxona (KDS), Ofitsiant (POS) va Boshqaruv (Admin Dashboard) panellariga real vaqtda yetib boradi.
   - Chek yopilganda esa mablag' "Sobir tog'a xalqchil moliya tizimi"ga (naqd vs karta alohida hisoblanib) tushum sifatida qayd etiladi.

---

## 🏗️ 2. LOYIHA ARXITEKTURASI VA MODULLAR BOG'LANISHI

Tizim monolit emas, **4 ta alohida rolga va markaziy ma'lumotlar oqimiga (Reactive State & Context)** asoslangan:

```
                          ┌─────────────────────────────────────────────────────────┐
                          │            REACT NAVIGATION CONTEXT & STORAGE           │
                          │   (Stollar, Buyurtmalar, Chaqiruvlar, Kassa, Qarzlar)   │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
         ┌─────────────────────────┬───────────────────┴─────────────────┬─────────────────────────┐
         ▼                         ▼                                     ▼                         ▼
┌─────────────────┐       ┌─────────────────┐                   ┌─────────────────┐       ┌─────────────────┐
│   1. MIJOZ      │       │  2. OFITSIANT   │                   │    3. OSHPAZ    │       │   4. BOSHQARUV  │
│  (Guest Menu)   │       │  (Waiter Panel) │                   │  (Kitchen KDS)  │       │  (Admin/Finance)│
├─────────────────┤       ├─────────────────┤                   ├─────────────────┤       ├─────────────────┤
│• NFC/QR Kirish  │       │• Jonli Stollar  │                   │• Taomlar oqimi  │       │• Admin Dash     │
│• 360° Taomlar   │       │• Chaqiruvlar    │                   │• 1/2/Salat/Choy │       │• Sobir Tog'a    │
│• Jonli Savat    │       │• Stolga taom    │                   │• 0-10-20 min    │       │  Moliya Kassa   │
│• Jonli Chek     │       │  qo'shish       │                   │  taymerlari     │       │• QR Generator   │
│• Chaqiruv (Choy)│       │• Chek yopish    │                   │• Tayyor signali │       │• 360° Fotogram  │
└─────────────────┘       └─────────────────┘                   └─────────────────┘       └─────────────────┘
```

---

## 📂 3. FAYLLAR TUZILISHI VA VAZIFALARI (DIRECTORY MAP)

### 3.1 Frontend (`frontend/src/`)
Frontend to'liq Single Page Application (SPA) arxitekturasida qurilgan. Brauzer sahifani qayta yuklamaydi (`window.history.pushState` va `NavigationContext` boshqaruvida).

```
frontend/src/
├── App.tsx                     # Markaziy Marshrutizator (SPA Router) va Global Modallar konteyneri
├── App.css                     # Global uslublar va umumiy qoidalar
├── main.tsx                    # React Root kirish nuqtasi
├── context/
│   ├── NavigationContext.tsx   # BUTUN TIZIMNING YURAGI (Orders, Tables, Finance, Cart, Calls)
│   └── useNavigation.ts        # Context iste'molchisi uchun hook
├── types/                      # TypeScript interfeyslari (Taomlar, Stollar, Cheklar, Moliya)
├── data/                       # Standart va mock ma'lumotlar (Menu taomlari, kategoriyalar)
├── showcase/
│   └── ComponentShowcase.tsx   # UI komponentlar laboratoriyasi
├── components/ui/
│   ├── StaffNavHeader/         # Xodimlar uchun yuqori menyu paneli (Ofitsiant, KDS, Moliya, Admin, Hostess)
│   ├── DishCard/               # Ishtaha ochuvchi taom kartochkasi (Narx va + alohida qatorda)
│   ├── BottomNav/              # Mobile pastki bar (Desktopda yashirin, faqat mobileda chiqadi)
│   ├── SearchBar/              # O'zbek tiliga mos semantik qidiruv (o', g', ' apostroflarini taniydi)
│   ├── Modal3D/                # 3D va 360° taomni aylantirib ko'rish oynasi
│   ├── QRGeneratorModal/       # Haqiqiy qrcode generator (5 xil qog'oz formati: tent, sticker, A6, A5, A4)
│   ├── PhotogrammetryStudioModal/ # 4 ta rasm yoki video orbitasidan 360° model yasash studiyasi
│   ├── NFCGatewayModal/        # NFC orqali stolga biriktirish oynasi
│   ├── CallWaiterModal/        # Ofitsiantni chaqirish oynasi (Choy, Non, Hisob, Ofitsiant)
│   └── QuantityStepper/        # Taom miqdorini oshirish/kamaytirish tugmasi
└── pages/
    ├── MenuPage/               # Mehmon menyusi (Kategoriyalar, qidiruv, cheksiz yuklanish)
    ├── ARMenuPage/             # 3D/AR taomlar maxsus galereyasi
    ├── CartPage/               # Savat sahifasi
    ├── CheckoutPage/           # Buyurtmani tasdiqlash
    ├── OrdersPage/             # Mehmonning o'z buyurtmalari va hisob-kitob cheki
    ├── TableHubPage/           # Stol tanlash va joy band qilish
    ├── ReservationPage/        # Kelishni tasdiqlash va bron qidirish
    ├── WaiterPanelPage/        # Ofitsiantning jonli plansheti (Zallar, stollar rangi, chaqiruvlar)
    ├── KDSPage/                # Oshxona ekrani (Taomlar ketma-ketligi, taymerlar, svodka)
    ├── HostessDeskPage/        # Kutib olish va mehmonlarni joylashtirish
    ├── AdminDashboardPage/     # Restoran boshqaruv markazi va jonli statistika
    └── FinancePage/            # Sobir tog'a Moliya Tizimi va Cheklar arxivi
```

### 3.2 Backend (`backend/`)
Django backend REST API va ma'lumotlar bazasi vazifasini bajaradi:
```
backend/
├── manage.py                   # Django boshqaruv skripti
├── backend/settings.py         # Asosiy sozlamalar (CORS, JWT, Apps, Database)
├── api/                        # REST API endpointlari va serializerlar
│   ├── views.py                # Mahsulotlar, do'konlar, shablonlar, buyurtmalar API lari
│   ├── urls.py                 # API marshrutlari
│   └── serializers.py          # DRF ma'lumotlar serialize/validatsiya qilish
├── finance/                    # Django darajasidagi moliya hisobotlari va logikasi
├── products/                   # Mahsulotlar va taomlar modeli
├── shops/                      # Do'konlar va 60 ta dizayn shablonlari modeli
├── tables_restaurant/          # Stollar, zallar va bron qilish modellari
└── templates/seller/
    ├── finance.html            # Django template moliya sahifasi (Sobir tog'a talablari bilan)
    └── receipt_print.html      # 58mm/80mm termal printer chek shabloni
```

---

## 🎨 4. DIZAYN VA UI/UX QOIDALARI

1. **Ranglar falsafasi (Ishtaha ochuvchi va shaffof ranglar):**
   - **Asosiy ranglar:** To'q yashil (`#213827`), Zangori/Oltin tus (`#10b981`), Iliq apelsin/shaftoli (`#ea580c`, `#f97316`).
   - **Taqiqlangan ranglar:** Bo'g'iq kulrang, loyqa qaymoq rang yoki nursiz qora ranglar minimallashtirilgan. Fon toza oq (`#ffffff`) va engil ochiq kulrang (`#f8fafc`).
2. **Font va Tipografiya:**
   - Standart eskirgan serif fontlar olib tashlangan, toza sans-serif zamonaviy shriftlar qo'llanilgan.
3. **Texnik atamalar yo'qligi (User-friendly Uzbek):**
   - Foydalanuvchiga tushunarsiz "AR", "3D WebGL", "KDS" kabi atamalar mijoz ko'radigan qismlardan olib tashlangan; ularning o'rniga "Stol ustida ko'rish", "Aylantirib ko'rish", "Oshxona ekrani" deb yozilgan.
4. **Mobile & Desktop moslashuvchanligi:**
   - **BottomNav (Pastki bar):** Faqat mobile ekranlarda pastda chiqadi, desktopda esa avtomatik yashirinadi.
   - **Taom kartochkasi:** Mobil telefonda taom narxi va `+` qo'shish tugmasi bir-birini qisib qo'ymasligi uchun alohida qatorda joylashgan.
   - **Deskripsion:** Kartochkadan toshib ketmaydi (`line-clamp` bilan 2 qatorda chegaralangan).

---

## ⚙️ 5. HOZIRDA ISHLAB TURGAN TIZIMLAR

1. **SPA Navigatsiya:** Sahifa qayta yuklanmasdan barcha 11 ta sahifa o'rtasida bir zumda o'tadi.
2. **NFC & QR Generator (Haqiqiy generator):**
   - QR kod rasm emas, har bir stol raqami va domeniga qarab real `qrcode` kutubxonasida generatsiya qilinadi.
   - 5 xil chop etish formati: Stol usti stend (Tent), Stiker (dumaloq/kvadrat), A6, A5 va A4 formatlarida chop etish tayyor.
3. **Mijozning QR/NFC orqali kirishi:**
   - `?table=05` parametri bilan kirgan mijoz ortiqcha tanishuv sahifalarisiz darhol `/menu/` sahifasiga tushadi va savatga buyurtma to'playdi.
4. **360° Fotogrammetriya Studiyasi (AI-siz, Mijoz brauzerida ishlaydi):**
   - Oshpaz yoki menejer taomning 4 ta tomonlama rasmini yuklaydi yoki taom atrofidan sekin olingan qisqa videoni tashlaydi.
   - Brauzer (HTML5 Canvas) videodan 16 ta kadrni 1 soniyada ajratib oladi va foydalanuvchiga barmoq/sichqoncha bilan aylantirib ko'rish imkonini beradi.
5. **Oshxona Ekrani (KDS):**
   - Yangi buyurtmalar kelishi bilan Web Audio orqali ovozli signal beradi.
   - Taomlar ketma-ketligi (1-taom, 2-taom, salat, ichimlik) ajratilgan.
   - 0-10 daqiqa (yashil), 10-20 daqiqa (sariq), 20+ daqiqa (qizil) taymerlari ishlaydi.
6. **Ofitsiant Paneli (Waiter POS):**
   - Asosiy zal, VIP xona va Terassa stollari holati ranglar bilan ko'rinadi (Bo'sh, Band, Hisob so'ralgan, Bron).
   - Mehmon chaqiruvi (Choy, Hisob, Non) darhol signal bilan chiqadi.
   - Ofitsiant o'z telefonidan turib stolga yangi taom qo'sha oladi yoki stol hisobini yopa oladi.
7. **Sobir Tog'a Moliya Tizimi (`/finance/`):**
   - 4 ta Katta KPI: Kirgan pul, Chiqqan pul, Sof cho'ntak foyda, Nasiyalar balansi.
   - Naqd pul va Karta (Click) bir tiyinigacha ayri hisoblanadi.
   - Stolda chek yopilishi bilanoq avtomatik kassaga tushum bo'lib yoziladi.
   - Nasiya daftari: qarzni qisman to'lash va audit xavfsizligi (bekor qilingan operatsiyalar sababi bilan saqlanadi).
   - 80mm/58mm termal chek printer ko'rinishi.

---

## ⚠️ 6. HOZIRGI KUNDAGI CHALKASHLIKLAR VA DIQQAT TALAB QILADIGAN QISMLAR

Keyingi dasturchi yoki AI ishlashida adashmasligi uchun quyidagi nuqtalarga alohida e'tibor qaratishi shart:

### 1-Chalkashlik: Ikki xil Frontend va Django Templates aralashuvi
- **Vaziyat:** Loyihada ikkita frontend bor:
  1. `backend/templates/seller/` ichidagi klassik Django HTML shablonlari (masalan, `finance.html`, `receipt_print.html`).
  2. `frontend/` ichidagi React 19 + TypeScript zamonaviy Single Page Application (SPA).
- **Qoidasi:** Loyihaning asosiy restoranga tegishli qismi hozir to'liq `frontend/` (React SPA)ga ko'chirilmoqda. Agar nimadir o'zgartirilsa, birinchi navbatda `frontend/src/` ichidagi fayllar o'zgartirilishi va `npm run build` qilinishi lozim. Django template'lar faqat eski backend panel uchun turibdi.

### 2-Chalkashlik: Ikkita Git Remote mavjudligi
- Loyihaning 2 ta giti bor:
  - `origin`: `git@github.com:Ibrohimbek7777878/online_Store.git` (Butun loyiha — backend + frontend).
  - `menu`: `git@github.com:Ibrohimbek7777878/3d-ar-menu-.git` (Faqat `frontend/` qismi alohida repository qilib ochilgan).
- **Qoidasi:** Frontendga o'zgartirish kiritilgandan so'ng ikkalasiga ham sinxron push qilinishi kerak:
  ```bash
  # 1. Asosiy repozitoriyga push:
  git push origin main

  # 2. Alohida menu repozitoriyasiga subtree orqali push:
  git subtree split --prefix=frontend -b menu-export && git push menu menu-export:main && git branch -D menu-export
  ```

### 3-Chalkashlik: Mock State vs Real Django Backend API
- **Vaziyat:** Hozirda `frontend/src/context/NavigationContext.tsx` o'zida `localStorage` orqali to'liq avtonom ishlaydigan Mock State (Real-time orders, Tables, Finance, Debts) mavjud. Bu planshet va mobil telefonlarda internet yoki backend bo'lmaganda ham mukammal ishlash imkonini beradi.
- **Keyingi qadam:** `NavigationContext.tsx` dagi operatsiyalarni backendning REST API endpointlariga (`/api/v1/orders/`, `/api/v1/tables/`, `/api/v1/finance/`) bog'lash kerak. Agar API uzilsa, `localStorage` zaxira sifatida turishi kerak (Offline-First arxitekturasi).

### 4-Chalkashlik: Semantik Qidiruv Logikasi
- Taomlar qidiruvida foydalanuvchilar har xil klaviatura ishlatishadi (`o'g'ri`, `o‘g‘ri`, `o`g`ri`, `ogri`).
- Qidiruv filtri barcha apostrof variantlarini bir xil standart belgiga keltirib solishtirishi shart (`frontend/src/components/ui/SearchBar/SearchBar.tsx` dagi normalizatsiya funksiyasini buzmaslik kerak).

---

## 🚀 7. ISHGA TUSHIRISH VA TEST QILISH YO'RIQNOMASI

### Frontendni ishga tushirish (Vite Dev Server):
```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston/frontend"
npm install
npm run dev
# Standart: http://localhost:5173/
```

### Frontendni tekshirish va yig'ish (Build):
```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston/frontend"
npm run build
# tsc -b va vite build 0 xato bilan 'dist/' ga chiqishi shart!
```

### Backendni ishga tushirish (Django):
```bash
cd "/home/ibrohim/Desktop/client_baza/online store_guliston/backend"
source venv/bin/activate  # yoki tizimdagi python
python manage.py check
python manage.py runserver 0.0.0.0:8000
```

---

## 📌 8. KEYINGI BOSQICH UCHUN VAZIFALAR (ROADMAP)

1. **WebSocket / SSE Ulanishi:**
   - Hozirgi `NavigationContext` state'ini Django Channels yoki Server-Sent Events (SSE) orqali haqiqiy real-vaqtda boshqa telefonlarga uzatish (Ofitsiant stolni yopganda, KDS ekrani va Admin sahifasida avtomatik yangilanishi).
2. **ESC/POS Bluetooth Termal Printer Ulanishi:**
   - Mobil telefondan to'g'ridan-to'g'ri Bluetooth orqali 58mm/80mm mini printerlarga chek va oshpazga "otbivka" chiqarish.
3. **Click / Payme / Uzum QR To'lov:**
   - Mehmon o'z telefonidagi chek oynasidan Click yoki Payme ilovasiga o'tib stol hisobini to'lash integratsiyasi.

---
*Ushbu Handoff hujjati loyihani qabul qilib oluvchi har qanday yangi dasturchi yoki Sun'iy Intellekt (AI) tizimining loyihani bir qarashda 100% tushunib, to'g'ri davom ettirishi uchun tuzildi.*
