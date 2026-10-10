# 🍽️ Restaurant 3D AR Interactive Menu & Staff Management Portal

Zamonaviy restoranlar, kafelar va lounge-barlar uchun ishlab chiqilgan interaktiv 3D/AR menyu va xodimlar boshqaruv portali.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## ✨ Loyihaning Asosiy Xususiyatlari

Loyihada **13 ta to'liq ishlab chiqilgan ekran** mavjud bo'lib, ular mijozlar va xodimlar portallariga ajratilgan:

### 📱 Mijozlar Portali (Customer Experience)
1. **Welcome Screen (`/`):** Restoranga xush kelibsiz sahifasi, brending, stol tanlash va tezkor kirish.
2. **Interactive Menu (`/menu`):** Kategoriyalar bo'yicha saralash, filtrlar, taom kartochkalari, narxlar va kaloriyalar.
3. **3D AR Dish Viewer (`/ar`):** Taomlarni 3D ko'rinishda aylantirib tomosha qilish va AR orqali stol ustida ko'rish.
4. **Smart Cart (`/cart`):** Savat boshqaruvi, miqdorni o'zgartirish, yetkazib berish/restoranda tanlovi.
5. **Express Checkout (`/checkout`):** To'lov usullari (Payme, Click, Naqd), sharhlar va buyurtmani tasdiqlash.
6. **Order Tracking (`/orders`):** Buyurtma holatini real vaqtda kuzatish (Qabul qilindi, Tayyorlanmoqda, Yetkazilmoqda).
7. **Table Hub (`/table-hub`):** Stol holati, chaqiruv tugmasi, hisob-kitobni so'rash.
8. **Table Reservation (`/reservation`):** Stolni oldindan bron qilish va vaqtni tanlash.

### 💼 Xodimlar Portali (Staff & Operations)
9. **Waiter Mobile Panel (`/waiter`):** Ofitsiantlar uchun stollar xaritasi, yangi chaqiruvlar va tezkor xizmat.
10. **Kitchen Display System — KDS (`/kds`):** Oshxona oshpazlari uchun buyurtmalar navbati va tayyorlik vaqtlari.
11. **Hostess Desk (`/hostess`):** Xostes uchun keluvchilarni kutib olish, stollarni band qilish va nazorat.
12. **Restaurant Admin Dashboard (`/admin`):** Kunlik tushum, faol stollar, eng ommabop taomlar va umumiy tahlil.
13. **Design System & Component Showcase (`/showcase`):** Barcha qayta ishlatiluvchi UI komponentlar katalogi.

---

## 🎨 Dizayn Tizimi (Design System)
- **Stil:** Warm Editorial & Obsidian Dark (qora fon, oltin/amber urg'ular, nafis tipografiya).
- **Icons:** [Lucide Icons](https://lucide.dev)
- **Responsive:** Barcha mobil telefonlar, planshetlar va desktop ekranlarga to'liq moslashgan.

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Talablar
- Node.js (v18 yoki undan yuqori)
- npm yoki pnpm / yarn

### 2. O'rnatish
```bash
git clone <ushbu-repo-havolasi>
cd <repo-nomi>
npm install
```

### 3. Dasturchi rejimida ishga tushirish (Dev mode)
```bash
npm run dev
```
Brauzerda `http://localhost:5173` manzilida ochiladi.

### 4. Production Build (Vercel yoki boshqa hosting uchun)
```bash
npm run build
```
Yig'ilgan fayllar `dist/` papkasiga tushadi.

---

## 🌐 Vercel-ga 1-Klikda Joylashtirish
Ushbu repozitoriyada `vercel.json` va SPA yo'naltirishlari to'liq sozlangan:
1. [vercel.com](https://vercel.com) saytiga kiring.
2. Ushbu GitHub repozitoriyani import qiling.
3. **Deploy** tugmasini bosing — loyiha hech qanday qo'shimcha sozlamalarsiz ishga tushadi!
