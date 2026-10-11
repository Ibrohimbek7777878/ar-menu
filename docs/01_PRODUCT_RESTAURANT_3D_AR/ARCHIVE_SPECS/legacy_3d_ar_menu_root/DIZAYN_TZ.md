# TZ — GULISTON RESTORAN: Yangi Dizayn (loyha dizayn rasmlari asosida)

> Manba: `3D_AR_MENU/loyha dizayn/*.png` (9 ta rasm). Bu fayl — yangi dizaynni kodlash TZ'si. Ruxsat berilgandan keyingina boshlanadi.

## 1. UMUMIY ESTETIKA (barcha sahifalarda)

- **Ranglar (light, premium"warm cream"):**
  - Fon: `#F7F3EA` (cream), kartochka: `#FFFFFF`, border: `#E8E0CF`
  - Asosiy yashil: `#3E5A44` (deep forest green) — tugmalar, aktiv chip
  - Aksent jigarrang: `#8B5E3C` — logo, sekundar matnlar
  - Matn: `#2C2A26` (sarlavha), `#6B6559` (sekundar)
  - Eslatma: ESKI neon/qora ar3d dizayn TO'LIQ olib tashlanadi.
- **Shrift:** Serif sarlavhalar ("Assalomu alaykum", "Xush kelibsiz" — Playfair Display / Fraunces), body'da sans (Inter).
- **Elementlar:** rounded-2xl kartochkalar, 1px `#E8E0CF` border, yumshoq soya, chip filtrlar (pill), katta qidiruv input (rounded-full), pastki tab bar (Menyu/Qidiruv/Savat/Yordam).
- **Til:** UZ asosiy, RU/EN toggle (header).
- **Logo:** "G Guliston — OILAVIY RESTORAN" (dumaloq G belgisi + sarlavha).

## 2. SAHIFALAR (rasmlardan)

### S1. Mehmon Welcome / Ulanish (`Guliston-Welcome-Entry.png`)
- Header: logo + `Ochiq` badge (yashil dot) + UZ|RU toggle
- Sarlavha: "Xush kelibsiz, aziz mehmon." + tavsif
- Kartochka: `01 → 02 Stolingizga ulaning`: QR icon + "QR kodni skanerlash >", NFC ("Yugurib borib yaqinlashtiring"), pastda `Stol raqamingizni bilasizmi?` input (`Masalan, 07`) + jigarrang submit
- Mos backend: `/` (tma_home) — bu yer QR/NFC/stol kiritish shartxochi

### S2. Mehmon Menyu (`Guliston-Mehmon-menyusi.png`)
- Header: logo + UZ/RU + `Stol 3` chip
- Hero: "Assalomu alaykum!" + `BUGUNGI DASTURXON` kartochkasi (osh rasmi, `Tong oshi` badge, "42 000 so'm →")
- `BIRGA TANLAYMIZ / Menu` + Saralash filter
- Qidiruv input, chip filtrlar: Barchasi(aktiv yashil)/Oshlar/Kaboblar/Sho'rvalar/Salatlar
- Kartochkalar: Ho'l taomlar (osh, kabob) + `Ko'p tanlanadi`/`2 kishilik` badge
- Tab bar: Menyu (aktiv), Qidiruv, Savat, Yordam
- Mos: `tma_catalog`, `tma_home`

### S3. Bron (Golf ro'yxati) / Reservation (`Find-a-reservation.png` — boshida, `Create-a-reservation-arrival-screen.png`)
- `BUGUNGI TASHRIF · 19:30 / Siz uchun joy tayyor.` + "Yordam kerakmi?" accordion
- Bron kartochka: mijoz avatar+ism, bron raqami `GS-2841`, VAQT/MEHMONLAR/STOLINGIZ `08 · Hovli`
- Green banner: `SIZING STOLINGIZ — Hovli · deraza yonida`
- 3-qadam progress: Bron → Kelish → O'tirish
- Yashil tugma: `Kelganimni tasdiqlayman →`
- Mos: TMA order/bron oqimi (`tma_orders`, order_detail)

### S4. Arrival desk / Kutish ro'yxati (`GulistonArrivalDesk.png`, `Coordinate-large-party-arrivals.png`)
- `MEHMONLARNI KUTIB OLISH / Assalomu alaykum.` + `18 MAY SHANBA` chip
- `BUGUNGI NAVBAT Kimni kutyapmiz?` — 04/04, 3 kutilmoqda, 1 kelishdi
- Qidiruv: Ism/Telefon/Bron kodi tablar
- Tashriflar: MH(MK)/SF/NI/DR — ism, vaqt, holat (`KUTILMOQDA`/`KELDI`)
- `THE MOST STATION / Before they arrive.` katalog (3 ta tekshiruv: Confirm party size, Seat them...), `Next · 19:30`
- `To prepare / Ready` filter, `Guest list`, Expected badge
- Mos: `/seller/waiter/`, `tables_plan`

### S5. Admin Panel (`Guliston-Admin-Panel.png`)
- Chap sidebar: `BOSHQARUV`: Umumiy ko'rinish (aktiv), Buyurtmalar, Taomlar va narxlar, Stollar joylashuvi, Xodimlar, 3D/AR taomlar, QR kodlar, Bildirishnomalar, Sozlamalar. Pastida: `Faqat admin uchun` + avatar `Salima Abdullaeva / Bosh administrator`
- Topbar: `GULISTON / RESTORAN NAZORATI` + `XIZMAT OCHIQ` + avatar
- Platforma: D DASTURXON + G Guliston (sayt faol) + `Brend studiyasi →`
- Hero dark green: `18-OKTABR, SHANBA · KECHGI SMENA` + "Oqshom xizmati nazorat ostida." + `Oxirgi yangilanish: hozirgina · Toshkent - Chinoziz`
- KPI: BUGUNGI TUSHUM `2,486,000 so'm` + bar chart; FAOL BUYURTMALAR `4 ta`; BAND STOLLAR `4/12`; O'RTACHA CHEK `117,500 so'm`
- Faol buyurtmalar ro'yxati + `ZAL HOLATI Stollar xaritasi` (grid 1..8, Band/Bo'sh/Tozalash)
- Mos: `restaurant_admin_dashboard`, seller tables/kds

## 3. ISHLAR REJASI (ruxsatdan keyin)

### Bosqich A — Dizayn tizimi
1. `backend/templates/` ga yangi `guliston_design` bazasi: CSS o'zgaruvchilar (yuqoridagi palitra), shriftlar (Playfair+Inter Google Fonts), rounded, chip, card, tab bar komponentlari (`base_customer.html`, `base_seller.html`, `tma/base_tma.html` rewrite).
2. Eski neon ar3d CSS/JS estetikasi olib tashlanadi (ar3d qorong'i mavzu → cream).

### Bosqich B — Mehmon oqimi (S1, S2, S3)
3. `tma_home` (`tma/home.html`) → S1 (QR/NFC/stol kiritish)
4. `tma_catalog`/`tma_home` katalog → S2 (hero+chip+kartochkalar)
5. Bron oqim → S3 (`tma_order_detail`, `tma_orders`)

### Bosqich C — Xodim oqimi (S4, S5)
6. `/seller/waiter/` → S4 (arrival desk)
7. `restaurant_admin_dashboard` → S5 (sidebar + KPI + stol xaritasi)
8. `/seller/tables/`, `kds` → S5 uslubida

### Bosqich D — Tekshiruv
9. `manage.py check`, `test api`, brauzer screenshot: har sahifa yangi dizaynda, UZ/RU toggle, mobile 390px ko'rinish.

## 4. OLIB TASHLANADIGAN ESKI DIZAYN
- `templates/customer/ar_menu.html` qorong'u neon tema → S2 cream temasi bilan almashtiriladi
- `templates/tma/*` eski uslub → S1/S2/S3
- `templates/seller/kds.html`, `waiter.html`, `tables.html` neon → S4/S5
- `123.html`, `jarvis_2.html` (00_UMUMIY'da) — dizayn konsepsi sifatida qoladi, prod emas

## 5. QAMROV
- FAQAT Restoran 3D/AR menyu loyihasi (`urls_restaurant`). Marketplace va Studio TEGILMAYDI.
- Backend mantiq (state_machine, Order.table, QR imzo) O'ZGARMAYDI — faqat template/CSS.
- Rasmlar: hozircha placeholder (loremflickr), keyinreal taom rasmlari.

**Ruxsat bersangiz, Bosqich A dan boshlayman.**
