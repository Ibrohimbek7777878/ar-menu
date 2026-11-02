# TZ: mehmon sahifalari uchun alohida o'qish API va Telegram bot dizayni (A1–A3, B1–B3)

**Sana:** 2026-11-02 · **Branch:** `feature/guest-api-bot` (`feature/design-v2` dan) · **Holat:** egasi "tz yozda ketma-ketlikda davom et" dedi; ochiq 4 savolga tavsiya qilingan standartlar olindi (quyida).
**Qamrov:** faqat **mehmon** sahifalari. Xodim sahifalari (ofitsiant, oshxona, hostess) kirmaydi.

## 1. Nima uchun
1. Har mehmon sahifasi o'z ma'lumotini HTML ichiga `window.__GULISTON_*_DATA__` qilib oladi; JSON API yo'q. Boshqa mijoz (Flutter, bot, keyingi frontend) uchun va **sahifani qayta yuklamay yangilash** (buyurtma holati) uchun alohida o'qish API kerak.
2. Mehmon menyusi hozir `/api/v1/products/` dan ham o'qiydi (`MenuPage.tsx`). U endpoint'da **T17 teshigi** bor (loginsiz yozish). Mehmon API tayyor bo'lgach, o'sha endpoint'ni xavfsiz yopish mumkin (T17 alohida ruxsat bilan).
3. Telegram bot xabarlari PDF dizayndan (`docs/dizayn/…telegram bot.pdf`) farq qiladi (hozirgi holat: 2.2 jadval).

## 2. Hozirgi holat (koddan tekshirilgan)
**Mehmon sahifalari va ma'lumot manbai**

| Sahifa | URL | Ko'rinish | Ma'lumot |
|---|---|---|---|
| Welcome | `/`, `/welcome/` | `tma_welcome` | `__GULISTON_WELCOME_DATA__` |
| Menyu, AR | `/menu/`, `/ar/` | `tma_home`, `tma_ar_menu` | `__GULISTON_DATA__`; JSON: `/api/v1/restaurant/menu/` (ochiq, ETag/304) |
| Savat | `/cart/` | `tma_cart` | `__GULISTON_CART_DATA__`; o'zgartirish: `POST /api/cart/` |
| Rasmiylashtirish | `/checkout/` | `tma_checkout` (GET va POST bitta ko'rinishda, pul yo'li) | `__GULISTON_CHECKOUT_DATA__`; yaratish: `POST /checkout/` yoki `POST /api/v1/restaurant/orders/` (ochiq) |
| Buyurtmalar | `/orders/` | `tma_orders` | `__GULISTON_ORDERS_DATA__` |
| Buyurtma holati | `/tma/order/<id>/` | `tma_order_detail` (**React**, `tma/orders.html`) | shu blok, bitta buyurtma |
| Stol, bron | `/table/`, `/reservation/…` | `tma_table_hub`, … | `__GULISTON_TABLE_DATA__`, `…RESERVATION…` |

**Bot (2.2)**

| Joyi | PDF'dagi dizayn | Hozirgi (kod) |
|---|---|---|
| Mehmon boti tugmalari | Menyuni ochish, Mening stolim, Ofitsiantni chaqirish | "🍽 Menyuni ochish", "📍 Mening stolim & Bron" (`web/telegram_webhook.py: get_menu_markup`). Ofitsiant tugmasi yo'q |
| Yangi buyurtma xabari | Kartochka: stol va zal, tarkib, to'lov turi, summa, holat | Emoji matn: raqam, stol, mijoz, telefon, do'kon, summa, holat (`notifications/admin_bot.py:524`). Tarkib va to'lov turi yo'q |
| Holat tugmalari | Qabul qilish, Tayyorlanmoqda, Tayyor, Bekor qilish | Stol: Tayyorlanmoqda, Tayyor, Berildi, Stol. Bekor qilish faqat yetkazib berishda (`build_order_keyboard`) |
| `/stats` | Tushum, buyurtma soni, band stol, o'rtacha chek, 3 tugma | "Bugungi Kassa" (kirim, chiqim, sof kassa) va stol monitoringi emoji matn |

## 3. Qarorlar
1. **API faqat o'qish (GET).** Yangi yozuv yo'li qo'shilmaydi: savatni o'zgartirish `/api/cart/`, buyurtma yaratish `/api/v1/restaurant/orders/` da qoladi (hujjatga ko'rsatiladi). Hujum yuzasi kengaymaydi.
2. **Mavjud ko'rinishlar o'zgarmaydi** (sahifalar, savat, checkout POST). Yangi quruvchilar `web/guest_api.py` da, ular mavjud yordamchilardan (`_get_tma_table`, `_featured_dishes`, `guest_order_ids`, `can_view_order` va h.k.) foydalanadi. Drift testlar bilan ushlanadi: **API javobi = sahifadagi ma'lumot bloki** (bir xil sessiya, bir xil baza).
3. **HTML bloklari o'chirilmaydi** (4-qoida). Frontend bu davrada API ishlatmaydi (alohida qaror).
4. **Dinamik:** AppSetting `guest_api` (standart yoqiq); o'chirilsa API 404 qaytaradi. Kodga kirmay almashtiriladi.
5. **Kengaytirilmaydigan:** A4 (stol, bron), B4 (Telegram mavzusi, MainButton), B5 (mehmonga bot orqali xabar, rozilik kerak) bu TZ ga kirmaydi.

## 4. A: mehmon API (`/api/guest/v1/`)
| № | So'rov | Javob | Eslatma |
|---|---|---|---|
| A1 | `GET session/` | rol, dizayn, fasl, harakat, restoran nomi, stol | `spa_session` + restoran/stol |
| A1 | `GET welcome/` | `__GULISTON_WELCOME_DATA__` bilan bir xil | |
| A1 | `GET menu/` | `/api/v1/restaurant/menu/` bilan **bir xil javob va ETag** | o'sha ko'rinishga yo'naltiriladi, yangi kod yo'q |
| A2 | `GET cart/` | `__GULISTON_CART_DATA__` bilan bir xil | savat sessiyadan |
| A2 | `GET checkout/` | `__GULISTON_CHECKOUT_DATA__` bilan bir xil | **faqat o'qish**; `tma_checkout` ga tegilmaydi, narxlar serverdagi menyudan |
| A3 | `GET orders/` | mening buyurtmalarim (`__GULISTON_ORDERS_DATA__`) | faqat sessiyadagi `my_order_ids` |
| A3 | `GET orders/<id>/` | bitta buyurtma, holat, tarkib | `can_view_order`; **ETag/304** (jonli holat uchun polling); begona buyurtma 404 |

Umumiy: `Cache-Control: private`, javobda boshqa mehmon ma'lumoti va xom ichki maydon yo'q (telefon, ichki izoh, xodim). Tezlik cheklovi mavjud `backend/ratelimit.rate_limited` orqali, restoran Wi‑Fi'si bitta IP'dan chiqishini hisobga olib keng (sessiya bo'yicha). Xato javobi: `{"error": "..."}`, texnik matnsiz.

## 5. B: bot (faqat matn, tugma, format; xavfsizlik va mavjud testlar saqlanadi)
- **B1 mehmon boti.** `/start` matni PDF'dagidek (restoran nomi dinamik). Stol QR/deep link orqali aniq bo'lsa **"🛎 Ofitsiantni chaqirish"** tugmasi (`callback_data` ichida stol tokeni, stolga 60 soniyada 1 marta, javobda tasdiq). Qolgan tugmalar mavjud bo'lib qoladi.
- **B2 yangi buyurtma kartochkasi.** Stol va zal, tarkib (taom × miqdor), to'lov turi, summa, holat. Tugmalar PDF'dagidek; **"Bekor qilish" ikki bosqichli** (so'rov, keyin "Ha, bekor qilish"). Mavjud `ord_status:` callback'lari o'zgarmaydi.
- **B3 `/stats`.** Bugungi tushum, buyurtma soni, band stol, o'rtacha chek, tugmalar (Buyurtmalar, Stollar, Kassa). Mavjud ma'lumot hisoblagichlari ishlatiladi.
- Hamma matn `html.escape` orqali (inyeksiya yo'q), uzunlik Telegram chegarasidan oshmaydi, mavjud webhook xavfsizligi (`webhook_security.py`) o'zgarmaydi.

## 6. Qabul mezonlari
- Har endpoint uchun kontrakt testi (maydonlar), **tenglik testi** (API = sahifa bloki), IDOR testi (begona buyurtma ko'rinmaydi), ETag/304 testi, `guest_api` o'chirilganda 404, klassik/xodim javoblari o'zgarmaydi.
- Bot: kartochka matni (to'liq va bo'sh tarkib, maxsus belgilar), tugma maketi, bekor qilish tasdig'i, ofitsiant chaqiruvi (stol topilmasa, tez-tez bosilsa), mavjud `test_telegram_order_status.py` yashil.
- **Hamma mavjud testlar yashil** (backend to'liq to'plam, `/ra/` e2e). Mavjud sahifalar HTML'i o'zgarmaydi (oldin/keyin solishtirish).
- Bosqichma-bosqich commit (A1, A2, A3, B1, B2, B3), har biri alohida testlar bilan; push yo'q.

## 7. 11 rolli tekshiruv (qisqa)
| Rol | Xulosa |
|---|---|
| Mijoz | Buyurtma holati sahifani qayta yuklamay yangilanadi (keyingi bosqich); ofitsiantni botdan chaqirish |
| Tadbirkor | Kamroq chaqiruv xatosi; botda tarkib va to'lov turini ko'rish, tasodifiy bekor qilishdan himoya |
| CEO | Bitta mehmon API: Flutter, bot va keyingi frontend uchun poydevor |
| PM | Foydalanuvchi yo'li o'zgarmaydi; faqat yangi imkoniyatlar |
| Kiberxavfsizlik | Faqat GET, IDOR testi, `private` kesh, PII yo'q, bot matni escape, callback'da stol tokeni (QR bilan bir xil ruxsat) va tezlik cheklovi; T17 alohida |
| Senior muhandis | Mavjud ko'rinishlarga tegilmaydi; drift tenglik testi bilan; yangi kod bitta modulda |
| Data | `guest_api` so'rovlari va ofitsiant chaqiruvlarini keyin o'lchash mumkin |
| Frontend | Bu bosqichda o'zgarmaydi |
| Backend | ETag/304, sessiya bo'yicha cheklov, qo'shimcha SQL minimal; 1000 mehmon polling 10–15 s bo'lsa ~70–100 so'rov/s, 304 bilan arzon (o'lchanmagan ❓) |
| UI/UX | Bot matni va tugmalari PDF bilan bir xil, aniq o'zbekcha |
| 3D dizayner | `menu/` 3D ma'lumotni hozirgi API bilan bir xil beradi |

## 8. Xavflar va qaytarish
- Drift: tenglik testi; xavf: pul yo'liga tegilmaydi.
- Polling yuki: faqat ochiq buyurtma sahifasi; keyingi bosqichda frontend ulanishidan oldin o'lchanadi.
- Bot: callback'ga soxta stol tokeni: noto'g'ri token javobsiz rad etiladi; tezlik cheklovi.
- Qaytarish: `guest_api` ni o'chirish (API 404), bot o'zgarishlari alohida commit'larda, `git revert` bilan.

## 9. Ochiq (bu TZ da qilinmaydi)
A4 stol va bron API, B4 Telegram mavzusi va `MainButton`, B5 mehmonga bot orqali xabar (rozilik), frontendni API'ga o'tkazish, T17 ni yopish, xodim sahifalari uchun API.
