# TZ — Oddiy Sotuvchi Do'koni, Yon Menyu va Tailwind

**Loyiha:** Online Store Guliston  
**Sana:** 27.08.2026  
**Maqsad:** Oddiy sotuvchi uchun 25+ mahsulotli namuna do'kon, yon menyuni tozalash, do'kon yaratishni ixtiyoriy qilish + promo banner, Tailwind CDN ni production ga o'tkazish.

---

## 1. Muammo (hozir)

- `seller1` da atigi 1 mahsulot bor, ko'rgazma uchun 25+ kerak
- Sotuvchi yon menyusida admin-only bo'limlar ko'rinib qolgan deyiladi — bosganda 403, lekin umuman ko'rinmasligi kerak (tekshiruvda `seller/base_seller.html` da yo'q, ehtimol kesh yoki `/admin/*` ga kirish)
- Do'koni yo'q sotuvchi uchun barcha sahifalarda faqat to'siq bor — ixtiyoriy bo'lishi kerak, faqat o'z mahsulotlari va profili yetarli
- `cdn.tailwindcss.com` production ogohlantirishi konsolda chiqyapti (`templates/base.html:9`)

## 2. Yechim — Qisqa

### 2.1 Namuna do'kon (oddiy sotuvchi)

- Login: `seller_oddiy` / `Oddiy123!` (yoki mavjud `seller1` ni to'ldirish)
- Do'kon: `Oddiy Sotuvchi Do'koni` (`slug: oddiy-sotuvchi-dokoni`), egasi `seller_oddiy`, `is_open: true`, `is_verified: false`
- Mahsulotlar: 25+ ta, aralash kategoriyalardan, rasmlari bor, narxlari `5000–80000` so'm, `is_available: true`, `rating: 4.0–4.8`
- Manba: mavjud 267 mahsulotdan nusxa yoki `ProductFactory` orqali, `shop=oddiy-sotuvchi-dokoni` bilan

### 2.2 Yon menyu — tozalash

**Sotuvchi ko'rishi kerak (faqat):**
- Asosiy: Boshqaruv, Analitika, Buyurtmalar
- Katalog: Mahsulotlar, Sharhlar
- Do'kon: Do'konim, Store Builder
- Mijozlar, Profil, Saytga o'tish

**Ko'rinmasligi kerak (faqat `super_admin`):**
- Foydalanuvchilar, Sozlamalar, Bannerlar, Kuryerlar, AI Marketing, Telegram Bot (agar kerak bo'lmasa)

**Amal:**
- `seller/base_seller.html` da admin-only linklar yo'qligi tasdiqlandi (10 ta link, `Foydalanuvchilar` yo'q) — keshni tozalash uchun `Ctrl+F5` yoki `?v=2`
- `/admin/*` ga `shop_owner` kirsa — endi 403 + log, menyuda umuman yo'q, bosishning imkoni yo'q

### 2.3 Do'kon yaratish — ixtiyoriy

**Hozir:** `SellerTenantMiddleware` + `seller_required` do'koni yo'q sotuvchini hamma sahifada `/seller/shop/` ga majburlaydi.

**Kerak:** Ixtiyoriy.

- `seller_required` da `tenant_shop` yo'q bo'lsa ham `redirect` emas, ruxsat berish; view lar `shop=None` ni qabul qiladi
- `seller/dashboard.html`, `seller/products.html` da `shop=None` bo'lsa — mahsulotlar baribir ko'rsatiladi (global marketplace dan emas, `Product.objects.filter(owner=user)` yoki `shop__isnull` orqali)
- Profil sahifasida 2 ta promo joy:
  - **Shapka banneri** (profil kartasi tepasida): `🎉 O'z do'koningizni yarating — 1 daqiqada!` + 3 qadamli qo'llanma (1. Nom/logo, 2. Mahsulot qo'shish, 3. Nashr) + `Do'kon yaratish →` tugmasi (`/seller/shop/`)
  - **Pastki banner** (profil ma'lumotlari ostida): xuddi shu, ixchamroq
- Builder ga o'tish — har doim ixtiyoriy, majburiy emas

### 2.4 Tailwind CDN — production

**Hozir:** `<script src="https://cdn.tailwindcss.com"></script>` (`base.html:9`) — dev uchun qulay, lekin konsolda ogohlantirish.

**Kerak (2 variant, bittasi):**
- **A (tez):** Ogohlantirishni o'chirish — `tailwind.config = { corePlugins: { preflight: false } }` emas, balki `console.warn` filtri yoki `data-tailwind-suppress` — lekin to'g'ri yechim emas
- **B (to'g'ri, tanlandi):** PostCSS + CLI: `npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init`, `tailwind.config.js` da `content: ["./templates/**/*.html"]`, `static/css/input.css` da `@tailwind base; @tailwind components; @tailwind utilities;`, build `npx tailwindcss -i ./static/css/input.css -o ./static/css/output.css --minify`, `base.html` da `<link href="{% static 'css/output.css' %}" rel="stylesheet">`, CDN qatori olib tashlanadi (yoki `DEBUG` da shartli)

Tanlov: **B** — bir martalik build, keyingi deploy larda `output.css` ishlatiladi.

---

## 3. Qabul mezonlari

- [ ] `/seller/` ga `oddiy sotuvchi` kirsa — 25+ mahsulot ro'yxati ko'rinadi, do'kon bo'lmasa ham
- [ ] Yon menyuda `Foydalanuvchilar`/`Sozlamalar`/`Bannerlar`/`Kuryerlar` yo'q, bosganda 403 chiqmaydi — chunki umuman yo'q
- [ ] Profil (`/seller/profile/`) da tepa va pasda “Do'koningizni yarating” bannerlari + 3 qadamli qo'llanma bor
- [ ] `Do'kon yaratish` — ixtiyoriy, mahsulotlar va profil do'konsiz ham ishlaydi
- [ ] Konsolda `cdn.tailwindcss.com should not be used in production` yo'q (output.css yuklanmoqda)

---

**Tasdiqlang — shu TZ bo'yicha ketma-ket bajaramiz.**
