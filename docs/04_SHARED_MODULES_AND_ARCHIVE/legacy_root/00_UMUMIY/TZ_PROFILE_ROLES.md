# TZ — 3 Rol uchun Profil va Mos Sahifalar (Ideal, to'liq ishlaydigan)

**Loyiha:** Online Store Guliston (Django web-platforma)
**Sana:** 2026-08-28
**Maqsad:** Oddiy foydalanuvchi (xaridor), Admin va Sotuvchi uchun alohida, to'liq
ishlaydigan profil sahifalari va har biriga mos kerakli sahifalar yaratish.
Shuningdek, 403 muammosini (rol aralashuvi) butunlay hal qilish.

========================================================================
## 0. ANIQLANGAN MUAMMO (403)
========================================================================
- Sinov: `oddiy_sotuvchi` / `Oddiy123!` to'g'ri login → `/seller/orders/`,
  `/seller/profile/`, `/seller/` → **200** (ishlayapti).
- Kutilgan 403: sotuvchi `/admin/*` ga kirmsa middleware to'g'ri 403 qaytaradi
  (xavfsizlik). Lekin foydalanuvchi sotuvchi session bilan `/admin/dashboard/`
  ni ochsa yoki aksincha — sessiya aralashib, chalkash 403 chiqishi mumkin.
- **Hal qilish:** har bir ro'l o'z bazasidan foydalanadi va noto'g'ri sahifaga
  o'tishda aniq yo'naltirish + chiroyli xabar sahifasi bo'ladi (qo'rqinchli
  Django 403 o'rniga).

========================================================================
## 1. ROLLAR VA ULARNING "O'Z" SAHIFALARI
========================================================================

### A) ODDIY FOYDALANUVCHI / XARIDOR (Customer)
Bazasi: `accounts.Customer` (session: `phone`), login `/login/` + `/register/`.
"O'z" sahifalari:
  1. `/profile/`        — profil (tahrir: ism, manzil, parol)
  2. `/orders/`         — mening buyurtmalarim (ro'yxat + status)
  3. `/orders/<pk>/tracking/` — buyurtma kuzatuv (live status)
  4. `/cart/`           — savat
  5. `/checkout/`       — rasmiylashtirish
  6. `/repeat-order/`   — takroriy buyurtma
  7. `/nearby-stores/`  — yaqin do'konlar (xarita)
  8. `/catalog/`, `/shop/<slug>/`, `/product/<slug>/` — katalog/do'kon/mahsulot

### B) SOTUVCHI (Seller / shop_owner / shop_manager)
Bazasi: `accounts.AdminUser` (role=shop_owner/manager) + `shops.Shop` (tenant).
"O'z" sahifalari:
  1. `/seller/`                 — dashboard (KPI, grafik, so'nggi buyurtmalar)
  2. `/seller/orders/`          — o'z do'koni buyurtmalari
  3. `/seller/orders/<pk>/`     — buyurtma detali + status o'zgartirish
  4. `/seller/products/`        — mahsulotlar (qo'shish/tahrir/o'chirish)
  5. `/seller/profile/`         — profil (tahrir + do'kon bog'lanishi)
  6. `/seller/shop/`            — do'kon sozlamalari
  7. `/seller/shop/builder/`    — do'kon dizayni
  8. `/seller/analytics/`       — tahlil
  9. `/seller/reviews/`         — sharhlar
 10. `/seller/customers/`       — mijozlar

### C) ADMIN (super_admin / asoschi)
Bazasi: `accounts.AdminUser` (role=super_admin).
"O'z" sahifalari:
  1. `/admin/dashboard/`        — 8 KPI + grafik
  2. `/admin/profile/`          — profil
  3. `/admin/shops/`, `/admin/products/`, `/admin/orders/`, `/admin/customers/`,
     `/admin/categories/`, `/admin/couriers/`, `/admin/banners/`, `/admin/reviews/`,
     `/admin/analytics/`, `/admin/telegram/`, `/admin/users/`, `/admin/settings/` — boshqaruv

========================================================================
## 2. HAR BIR ROL UCHUN PROFIL SAHIFASI (TO'LIQ TALABLAR)
========================================================================

### 2.1 XARIDOR PROFILI (`/profile/`) — YANGILANISHI KERAK
Hozir: ism + manzil tahriri, statistika, so'nggi buyurtmalar.
Qo'shilishi kerak (IDEAL):
  - Avatar (harflar initsiali yoki rasm yuklash)
  - Ism, telefon (readonly), manzil, email (ixtiyoriy)
  - **Parol o'zgartirish** (hozir yo'q!) — eski + yangi + tasdiqlash
  - Sevimlilar / saqlangan manzillar (keyinchalik)
  - Til tanlash (uz/ru/en) — sessiyaga yoziladi
  - Chiqish tugmasi
  - Buyurtmalar statistikasi (jami soni, jami summa, qo'shilgan sana)
  - So'nggi 5 buyurtma + "Barchasini ko'rish"

### 2.2 SOTUVCHI PROFILI (`/seller/profile/`) — YANGILANISHI KERAK
Hozir: faqat ko'rish (user + shop), tahrir YO'Q.
Qo'shilishi kerak (IDEAL):
  - Avatar (do'kon logotipi yoki initsial)
  - Foydalanuvchi: ism/familiya, username (readonly), email, telefon, telegram
  - **Parol o'zgartirish** (hozir yo'q!)
  - Bog'langan do'kon: nomi, slug, holati (ochiq/yopiq), havolasi
  - Do'kon statistikasi: mahsulotlar soni, buyurtmalar soni, daromad
  - "Do'kon sozlamalari" va "Do'konni ko'rish" havolalari
  - Chiqish tugmasi
  - POST handling: profil saqlash + parol o'zgartirish (aloqador view to'ldiriladi)

### 2.3 ADMIN PROFILI (`/admin/profile/`) — YANGILANISHI KERAK
Hozir: faqat `{'user': request.user}` — bo'sh sahifa deyarli.
Qo'shilishi kerak (IDEAL):
  - Admin ismi, username (readonly), email, telefon
  - **Parol o'zgartirish**
  - Tizim holati: rol, tasdiqlanganligi, oxirgi kirish vaqti
  - Telegram username (bot uchun)
  - Chiqish tugmasi
  - POST handling: profil saqlash + parol o'zgartirish

========================================================================
## 3. UMUMIY KOMPONENTLAR
========================================================================
- **Parol o'zgartirish** barcha 3 rolda bir xil pattern: eski parol tekshirish
  (AdminUser uchun `check_password`, Customer uchun `check_password`) → yangi
  parol validatsiyasi (min 6 belgi) → `set_password` → saqlash → xabar.
- **Til tanlash** har bir profilda (customer uchun majburiy, boshqalar ixtiyoriy).
- **Avatar** initsial asosida (rasm yuklash keyingi bosqich).
- Chiroyli **403 / noto'g'ri rol** sahifasi: "Siz bu sahifaga kira olmaysiz"
  + to'g'ri panelga yo'naltirish havolasi (admin/sotuvchi/xaridor).

========================================================================
## 4. AMALGA OSHIRISH REJASI (BO'LIMLAR)
========================================================================
1. **403 hal qilish**: noto'g'ri rol uchun chiroyli sahifa + aniq redirect.
   - Middleware o'zgarishsiz (to'g'ri ishlayapti), lekin 403 javobini custom
     template bilan almashtiramiz (handler403 yoki middleware ichida render).
2. **Xaridor profili**: parol o'zgartirish + til + avatar initsial + stats.
   - `customer_profile` view yangilanadi (POST: name/address/password/lang).
3. **Sotuvchi profili**: tahrir + parol + do'kon stat + POST handling.
   - `seller_profile` view yangilanadi.
4. **Admin profili**: to'liq + parol + POST handling.
   - `admin_profile` view yangilanadi.
5. **Har bir ro'l uchun "o'z" sahifalari tekshiruvi**: barcha URL'lar 200
   va ro'l bo'yicha izolyatsiya (sotuvchi faqat o'z do'konini ko'radi).
6. **Tasdiqlash**: curl bilan 3 ro'l login + barcha "o'z" sahifalari 200,
   noto'g'ri rol → chiroyli 403 sahifasi.

========================================================================
## 5. TEKSHIRUV MEYORLARI (TUGAGACH)
========================================================================
- [ ] Xaridor: `/profile/` parol o'zgartirish ishlaydi, til saqlanadi.
- [ ] Sotuvchi: `/seller/profile/` tahrir + parol + do'kon stat ishlaydi.
- [ ] Admin: `/admin/profile/` to'liq + parol ishlaydi.
- [ ] Noto'g'ri rol → chiroyli 403 (qo'rqinchli Django emas).
- [ ] `manage.py check` → 0 issues.
- [ ] Barcha "o'z" sahifalari 200 (curl tekshiruv).
