# TZ — Raqobatchilar tahlili asosida yangi funksiyalar (Online Store Guliston)

**Sana:** 2026-08-28
**Maqsad:** O'zbekiston raqobatchilarini (Uzum, Olcha, Asaxiy, Texnomart, Apelsin, mahalliy
Guliston do'konlari) chuqur tahlil qilib, ularning eng yaxshi features'larini birlashtirib
bizning loyihaga qo'shish.

========================================================================
## 1. RAQOBETCHILAR TAHLILI (XULOSA)
========================================================================
| Rahobatchi | Asosiy kuchi | Bizda yo'q narsa |
|-----------|-------------|-----------------|
| **Uzum** | BNPL, Tezkor (30 daq), kupon, cashback, referral, geo | kupon, cashback, referral, tezkor belgisi |
| **Olcha/Asaxiy** | taqqoslash (compare), sharhlar, "sotib olinganlar" | compare, tavsiya |
| **Texnomart/Apelsin** | filiallar, mavjudlik statusi, kategoriya filter | stock status |
| **Mahalliy do'konlar** | ishonch, tezkorlik, shaxsiy aloqa | tezkor yetkazib berish |

**Bizning loyiha farqi:** giper-lokal (Guliston + Yangi Yer), har bir do'kon alohida
sotuvchi. Shuning uchun "tez yetkazib berish" va "mahalliy do'kon ishonchi" bizning
asosiy ustunligimiz bo'lishi kerak.

========================================================================
## 2. QO'SHILADIGAN FUNKSIYALAR (PRIORITET TARTIBIDA)
========================================================================

### P1. Sevimlilar / Wishlist (xaridor uchun) — ENG MUHIM
- Xaridor mahsulotni "yurakcha" bilan saqlaydi (session yoki Customer ga bog'liq)
- `/wishlist/` sahifasi: saqlangan mahsulotlar ro'yxati
- Mahsulot kartasida va detail sahifasida "♥" tugmasi
- Mavjud: Customer session (phone) asosida. Model: `WishlistItem(customer, product)`

### P2. Kupon / Chegirma tizimi (promo kodlar)
- Admin panelda kupon yaratish: kod, foiz/yo'q, muddat, limit
- Checkout'da kod kiritish → chegirma hisoblash
- Model: `Coupon(code, discount_percent, active, expires_at, usage_limit)`
- Buyurtmada `coupon_code` va `discount` maydoni

### P3. Tezkor yetkazib berish belgisi (30 daqiqa)
- Do'kon sozlamalarida "Tezkor yetkazib berish" flag (boolean)
- Do'kon sahifasi va mahsulotda "⚡ 30 daqiqada" belgisi
- `Shop.is_fast_delivery` maydoni

### P4. Stock status (mavjudlik)
- Mahsulotda `in_stock` (boolean) yoki `stock_count`
- Katalogda "Mavjud" / "Tugadi" belgisi
- `Product.in_stock` maydoni (allaqachon borligini tekshirish kerak)

### P5. Mahsulot taqqoslash (compare) — keyinroq
- Saralangan 2-3 mahsulotni taqqoslash sahifasi

========================================================================
## 3. AMALGA OSHIRISH REJASI
========================================================================
1. Tahlil (BO'LDI) → TZ (BU FAYL)
2. **Wishlist (P1)** — model + view + template + kartada tugma
3. **Kupon (P2)** — model + admin CRUD + checkout integratsiya
4. **Tezkor yetkazib berish (P3)** — Shop maydoni + belgi
5. **Stock status (P4)** — tekshirish + belgi
6. Loop test: barcha yangi funksiyalar 200 + izolyatsiya

========================================================================
## 4. TEKSHIRUV MEYORLARI
========================================================================
- [ ] /wishlist/ sahifasi ishlaydi, mahsulot qo'shish/o'chirish
- [ ] Kupon yaratish (admin) + checkout'da ishlashi
- [ ] Do'konda "Tezkor" belgisi ko'rinadi
- [ ] Mahsulotda "Mavjud/Tugadi" statusi
- [ ] manage.py check → 0 issues
- [ ] Loop test: barcha sahifalar 200
