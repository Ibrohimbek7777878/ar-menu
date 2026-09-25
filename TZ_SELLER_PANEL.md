# TZ — Sotuvchi Paneli (Multi-Tenant)

**Loyiha:** Online Store Guliston  
**Sana:** 27.08.2026  
**Maqsad:** Oddiy sotuvchi (`shop_owner`) uchun alohida, izolyatsiyalangan panel. Har bir sotuvchi faqat o'z do'koni ma'lumotlarini ko'radi, boshqasiga aralashmaydi.

---

## 1. Hozirgi holat

- `AdminUser` modeli bitta (`role`: `super_admin` / `shop_owner` / …)
- Bitta panel `/admin/*` — `is_super` tekshiruvi bilan filtrlanadi (`web/views.py: admin_dashboard` da `Shop.objects.filter(owner=user)`), lekin URL va menyu bir xil
- Kamchilik: sotuvchi ham super-admin menyusini ko'radi (Foydalanuvchilar, Sozlamalar, barcha do'konlar), adashishi mumkin; URL ham bir xil

## 2. Maqsad

Alohida **Sotuvchi Paneli** `/seller/` (yoki `/sotuvchi/`):
- Faqat o'z do'koni doirasida ishlaydi
- Super-admin paneliga kira olmaydi, super-admin sotuvchi paneliga kirsa — do'kon tanlash bilan kiradi
- Har bir tenant (do'kon) ma'lumotlari qat'iy izolyatsiyalangan

## 3. Arxitektura — Multi-Tenant

**Tanlangan model: Shared DB + `shop_id` ustuni (Row-Level Isolation)**
- Bitta Postgres DB, barcha jadvallarda `shop_id` FK
- Har so'rovda `request.user.shop_id` yoki `request.tenant_shop` orqali filtr
- Afzallik: sodda, migratsiya shart emas, mavjud kodga mos (`Product.shop`, `Order.shop`)

**Muqobil (kelajak):** Schema-per-tenant yoki alohida DB — hozir ortiqcha, keyin o'tish mumkin.

**Tenantni aniqlash:**
1. `SellerTenantMiddleware` — login bo'lgan `shop_owner` uchun `request.tenant_shop = user.shop` (yoki `Shop.objects.filter(owner=user).first()`)
2. `shop_owner` da `shop` bo'sh bo'lsa — "Do'kon yarating" sahifasiga yo'naltirish
3. Har bir seller view boshida `@seller_required` dekoratori + `get_object_or_404(Model, shop=request.tenant_shop, pk=...)` — boshqa tenant obyektiga 404

**Xavfsizlik:**
- URL da `shop_id` berilmaydi — tenant sessiyadan olinadi, foydalanuvchi soxtalasha olmaydi
- Super-admin seller paneliga kirsa — `?shop=ID` bilan majburan, logga yoziladi
- Barcha `QuerySet` lar `shop` bo'yicha filtrlanadi; `all()` chaqiruvi seller kodida taqiqlanadi (code review qoidasi)

## 4. Rollarga ajratish

| Rol | Kirish | Ko'radi |
|-----|--------|---------|
| `super_admin` | `/admin/*` (to'liq), `/seller/*` (tanlangan shop bilan) | Hamma do'kon, hamma buyurtma, Foydalanuvchilar, Sozlamalar |
| `shop_owner` | `/seller/*` faqat, `/admin/*` → 403 | Faqat o'z do'koni: mahsulotlar, buyurtmalar, mijozlar (o'z buyurtmalaridan), analitika (o'z), banner (o'z do'koni uchun emas — so'rov bo'yicha), profil |

`shop_manager` / `courier_manager` — kelajakda seller paneli ichida cheklangan huquq.

## 5. Seller Paneli — URL va Menyular

**Base:** `templates/seller/base_seller.html` — `admin/base_admin.html` dan yengil nusxa: bir xil ranglar (`#f5f5f5`/`#16a34a`), lekin menyu ixcham, sarlavha "Sotuvchi paneli".

**URL prefiks:** `/seller/`

| Yo'l | Funksiya | Ma'lumot manbai |
|------|----------|-----------------|
| `/seller/` | Dashboard | `Order`/`Product` faqat `shop=request.tenant_shop` |
| `/seller/products/` `.../create/` `.../<id>/edit/` | Mahsulotlarim | `Product.objects.filter(shop=tenant)` |
| `/seller/orders/` `.../<id>/` | Buyurtmalarim | `Order.objects.filter(shop=tenant)` — status o'zgartirish faqat `pending→confirmed→preparing→ready→out_for_delivery→delivered` |
| `/seller/shop/` `.../builder/` | Do'konim + Store Builder | `Shop` (o'zi), `ShopPage` |
| `/seller/analytics/` | Analitika (`?days=7/14/30`) | `admin_analytics` mantig'i, lekin `shop=tenant` filtri |
| `/seller/customers/` | Mijozlarim (buyurtma berganlar) | `Customer` via `Order.shop=tenant` |
| `/seller/reviews/` | Sharhlarim | `Review` via `Product.shop=tenant` |
| `/seller/profile/` | Profil | `AdminUser` o'zi, `telegram_username` tahrirlash |

**Chiqariladi (sellerda yo'q):** Foydalanuvchilar, Kuryerlar (umumiy), Bannerlar (global), Sozlamalar (global), boshqa do'konlar.

**Navigatsiya tartibi (chap menyu):**

```
Asosiy
  Boshqaruv (/seller/)
  Analitika
  Buyurtmalar
Katalog
  Mahsulotlar
  Sharhlar
Do'kon
  Do'konim
  Store Builder
Mijozlar
Profil
→ Saytga o'tish
→ Chiqish
```

Ikonlar — admin bilan bir xil, lekin `w-4 h-4` `stroke 1.7`, guruh sarlavhalari bilan.

## 6. Funksional talablar (User Story)

1. **Dashboard:** Bugungi tushum/buyurtma, haftalik grafik, so'nggi 5 buyurtma — faqat o'z do'koni.
2. **Mahsulot CRUD:** Rasm, narx, chegirma, mavjudlik, kategoriya — boshqa do'kon mahsulotini tahrirlab bo'lmaydi (404).
3. **Buyurtma boshqaruvi:** Statusni ketma-ket o'tkazish, bekor qilish, kuryer biriktirish (o'z kuryerlari bo'lsa).
4. **Do'kon sozlamalari:** Nomi, tavsif, rasm, ish vaqti, min. buyurtma, yetkazish narxi, ochiq/yopiq.
5. **Store Builder:** Mavjud `ShopPage` dan foydalanish, faqat o'z shop uchun.
6. **Analitika:** Kunlik daromad, top mahsulotlar, to'lov turlari — shop filtri bilan.
7. **Izolyatsiya testi:** Sotuvchi A `shop B` ning `product_id` sini URL da soxtalasa — 404, logda `tenant_violation`.

## 7. Nofunksional

- Har bir seller so'rovi `< 300ms` (shop indeksi bor; `select_related('shop')`)
- 100+ tenant da bir-biriga ta'sir yo'q (shared DB, indekslar)
- Barcha seller view larda `@login_required` + `@seller_required` (`role in ['shop_owner','shop_manager']`)

## 8. Migratsiya va Moslik

- Yangi app `seller` yoki `web/seller_views.py` — eski `/admin/*` seller uchun 302 → `/seller/` ga yo'naltirish (orqaga moslik)
- Mavjud `shop_owner` foydalanuvchilari avtomatik `/seller/` ga tushadi (login dan keyin `role` ga qarab redirect)
- Super-admin `/admin/` da qoladi

## 9. Qabul mezonlari (Acceptance)

- [ ] `shop_owner` `/admin/` ga kirsa 403 yoki `/seller/` ga redirect
- [ ] `shop_owner` A boshqa do'kon mahsulotini `.../edit/` qilsa 404
- [ ] Dashboard raqamlari faqat o'z do'koni bo'yicha
- [ ] Seller menyusida Foydalanuvchilar/Sozlamalar yo'q
- [ ] Test: 2 ta seller (2 ta shop) parallel — har biri faqat o'zinikini ko'radi

## 10. Keyingi qadam (tasdiqlangandan keyin)

1. `seller/` URL, `SellerTenantMiddleware`, `seller_required` dekoratori
2. `seller/base_seller.html` (admin dan nusxa, menyu ixcham)
3. View larni ko'chirish + `shop=tenant` filtrlari
4. Testlar + redirectlar

---

**Tasdiqlangach — ketma-ket qurishni boshlayman.**
