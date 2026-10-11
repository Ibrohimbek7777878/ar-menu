# TZ — Marketplace + Sotuvchi Dokoni (Dual) va Akauntlar

**Loyiha:** Online Store Guliston — Giper-mahalliy marketplace  
**Sana:** 27.08.2026  
**Maqsad:** Ikki xil ro'yxatdan o'tish, mahsulotlar ikki joyda, do'konni kodsiz yaratish, hamma narsa oddiy odam tushunadigan dinamik bo'lishi, admin — faqat asoschi.

---

## 1. Muammo (hozir)

- Do'koni yo'q sotuvchiga barcha `/seller/*` sahifalarda faqat *“Avval do'kon yarating”* chiqadi, boshqa kontent yo'q
- `user` (oddiy) va `seller` (sotuvchi) `role = shop_owner` bilan bir xil, farqi yo'q
- Har ikkalasi `/admin/register/` da bir joyda, adasharli
- Admin panelga istalgan `shop_owner` urinsa, hozir faqat `seller` ga yo'naltiriladi — lekin qat'iy blok emas, parol so'ralmaydi

## 2. G'oya — Ikki dunyo, bir mahsulot

**Bir mahsulot — ikki joyda:**
- Global **Marketplace** (`/` `/catalog/` `/product/<slug>/`) — barcha sotuvchilarning barcha mahsulotlari
- Shaxsiy **Online Do'kon** (`/shop/<slug>/`) — sotuvchining o'zi dizayn qilgan, logoli, nomli alohida do'koni

Sotuvchi mahsulot qo'shsa — avtomatik ikkala joyda ham paydo bo'ladi. O'zgartirsa/o'chirsa — ikkala joyda ham yangilanadi. Qayta kiritish yo'q.

**Oddiy odam uchun:** hamma narsa yozish orqali, kodsiz, 3 qadamda.

---

## 3. Akauntlar — 3 ta rol, 3 ta eshik

| # | Rol | Kim | Qayerdan ro'yxatdan o'tadi | Qayerdan kiradi | Kirgach qayerga tushadi | Ko'radi |
|---|-----|-----|----------------------------|-----------------|-------------------------|---------|
| 1 | `customer` | Oddiy xaridor + mayda sotuvchi | `/register/` (yoki `/seller/register?type=user`) — telefon + ism + parol | `/login/` | `/` (marketplace) | Marketplace da o'z mahsulotlari (soddalashtirilgan kabinet), buyurtmalar |
| 2 | `shop_owner` | Sotuvchi (shop egasi) | `/seller/register/` — do'kon nomi + username + parol + telefon | `/seller/login/` | `/seller/` (o'z paneli) | O'z mahsulotlari (global ham, o'z do'konida ham), o'z do'koni builder, o'z buyurtmalari |
| 3 | `super_admin` | Asoschi (faqat siz) | Ro'yxatdan o'tish **yo'q** — faqat `createsuperuser` yoki siz yaratgan | `/admin/login/` + **alohida panel paroli** `ADMIN_PANEL_PASSWORD` | `/admin/dashboard/` | Hamma narsa |

**Muhim — ajratish:**
- `/register/` va `/seller/register/` — ikki xil sahifa, ikki xil dizayn, ikki xil matn, ikki xil `role` yaratadi
- `/login/` (xaridor) va `/seller/login/` (sotuvchi) va `/admin/login/` (asoschi) — 3 ta alohida forma, 3 ta rang, adashish yo'q
- `customer` — `Customer` jadvali (telefon sessiyasi), `shop_owner`/`super_admin` — `AdminUser` jadvali; bir-biriga aralashmaydi

**Admin himoyasi — faqat asoschi:**
- `/admin/*` ga `super_admin` bo'lmagan har qanday urinish — 1-urinishning o'zida **403 + log** (`tenant_violation`), `seller` bo'lsa `/seller/` ga emas, to'g'ridan-to'g'ri blok
- Panel paroli noto'g'ri → *“Admin panel paroli noto'g'ri.”* — 3 marta xato → 5 daqiqaga IP blok (keyin)
- Oddiy `user`/`seller` hatto to'g'ri parol bilan ham `/admin/login/` dan kira olmaydi: *“Faqat super-admin kira oladi.”*

---

## 4. Sotuvchi oqimi — Kodsiz do'kon (3 qadam)

**Qadam 1 — Ro'yxatdan o'tish (30 soniya):**
`Do'kon nomi*` → `Username*` → `Telefon` → `Parol*` → *Yaratish* → avtomatik `Shop` yaratiladi (`slug` lotinlashtiriladi, takrorlansa `-1`), `latitude:40.12`/`longitude:67.84`/`address:Guliston` default.

**Qadam 2 — Do'konni bezash (ixtiyoriy, istalgan vaqtda):**
`/seller/shop/` da: nom, tavsif, logo (`image`), banner, manzili, telefoni, ish vaqti — saqlash → darhol `/shop/<slug>/` da ko'rinadi.
`/seller/shop/builder/` da: shablon (`minimal`/`neon`/`classic`), bo'limlar (hero, kategoriya lentasi, mahsulot grid, banner, xarita, sharhlar) — drag&drop emas, oddiy qo'shish/o'chirish/tartib — saqlash → nashr.

**Qadam 3 — Mahsulot qo'shish (cheksiz, dinamik):**
`/seller/products/create/` da: rasm, nom, narx, chegirma, kategoriya, mavjudlik → saqlash → darhol **ham** `/catalog/` da, **ham** `/shop/<slug>/` da paydo bo'ladi. Tahrirlash/o'chirish — har ikkala joyda avtomatik.

**Bo'sh holat (do'koni yo'q sotuvchi):**
- `/seller/*` da endi quruq ogohlantirish emas, to'liq **onboarding**: katta karta — *“Do'koningizni yarating — 1 daqiqada”* + forma (yuqoridagi Qadam 2) — boshqa sahifalar ham shu kartani ko'rsatadi, 10 marta takrorlanmaydi.

---

## 5. Marketplace qoidasi

- `Product.shop` majburiy FK — har mahsulot bir do'konga tegishli
- `customer` roli mahsulot qo'shsa — avtomatik bitta “Umumiy” do'kon (`slug: umumiy-marketplace`, egasi yo'q) ga birikadi, shunda ham globalda ko'rinadi, lekin shaxsiy do'koni yo'q
- `shop_owner` mahsuloti — `shop = request.tenant_shop`, shuning uchun ham globalda, ham o'z do'konida

---

## 6. Dinamik — hamma narsa jonli

- Sotuvchi istalgan vaqtda: yangi mahsulot, narx o'zgartirish, rasm almashtirish, do'kon nomi/logo/banner/rang, builder bo'limlari — saqlash bilan darhol `marketplace` va `shop` da aks etadi (cache yo'q yoki 60s)
- Oddiy odam tushunadigan til: *“Saqlash”*, *“Do'koningizda ko'rish”*, *“Marketplace da ko'rish”* tugmalari

---

## 7. Texnik — Izolyatsiya va Xavfsizlik

- **Shared DB + `shop_id`** — barcha `Product`/`Order`/`Review` da `shop` FK indekslangan
- `SellerTenantMiddleware` — `shop_owner` da `request.tenant_shop`, `super_admin` da `?shop=ID` bilan
- `seller_required` — `role in shop_owner/shop_manager` va `tenant_shop` tekshiruvi; yo'q bo'lsa `seller/shop` ga (admin ga emas)
- Har bir seller view: `get_object_or_404(Model, shop=tenant_shop, pk=...)` — soxtalash 404
- Admin view larda `super_admin` tekshiruvi + `ADMIN_PANEL_PASSWORD` — 1-urinishda blok + log

---

## 8. Sahifalar ro'yxati (yangi/tahrir)

- `/register/` — oddiy foydalanuvchi (xaridor) — yashil-oq, sodda
- `/seller/register/` — sotuvchi — yashil gradient, *Do'kon nomi* maydoni bor (`templates/seller/register.html` mavjud)
- `/seller/login/` — sotuvchi — yashil (`templates/seller/login.html` mavjud)
- `/admin/login/` — faqat super_admin — qora-skul, qalqon, panel paroli maydoni (`templates/admin/login.html` yangilangan)
- `/seller/shop/` — bo'sh holatda yaratish formasi (quruq ogohlantirish o'rniga)
- Qolgan `/seller/*` — do'kon bo'lmasa ham onboarding kartani ko'rsatadi, 10 marta spam yo'q (tuzatildi)

---

## 9. Qabul mezonlari

- [ ] Oddiy user `/register/` dan kirsa — mahsuloti faqat marketplace da, shaxsiy do'koni yo'q
- [ ] Sotuvchi `/seller/register/` dan kirsa — mahsuloti ham marketplace da, ham `/shop/<slug>/` da
- [ ] Sotuvchi do'konni 1 daqiqada nom/logo bilan yarata oladi, mahsulot qo'shsa ikkala joyda ko'rinadi
- [ ] Do'koni yo'q sotuvchiga 10 marta ogohlantirish emas, bitta to'liq onboarding chiqadi
- [ ] `user`/`seller` `/admin/login/` ga kirsa — darhol blok, xabar: *“Faqat super-admin”*, logda `tenant_violation`
- [ ] Faqat `super_admin` + to'g'ri `ADMIN_PANEL_PASSWORD=GulistonAdmin2026!` bilan admin kira oladi

---

**Tasdiqlang — shu TZ bo'yicha to'liq qurishni boshlayman.**
