# AR MENU — TEXNIK TZ v2 (3 ROL + AR ASOSIY)
**Sana:** 2026-09-04
**Holat:** 🔴 TZ — KOD YOZILMAGAN, ruxsat kutilmoqda
**O'zgarish (v1→v2):** AR = ASOSIY funksiya; 3D restoran = keyingi bosqichga; 3 rol aniqlashtirildi

---

## 0. ⛔ IZOLYATSIYA (o'zgarmadi)

Bu **ALOHIDA shaxsiy loyiha**. `mebelcity_platform` ga TEGILMAYDI:
alohida repo, `armenu_db`, port 8060, `armenu.service`, alohida nginx block.
`bittada-*` servislariga, `tenant_*` bazalarga **UMUMAN tegilmaydi**.

---

## 1. LOYIHA YADROSI

> **Bir gapda:** Stoldagi QR → menyu → **taomni AR'da real o'lchamda stolga qo'yib ko'rish** →
> buyurtma → ofitsiant stol raqamini ko'radi va olib boradi → admin hammasini nazorat qiladi.

**v1 da AR = ASOSIY.** 3D restoran ko'rinishi va navigatsiya = **v3**.

---

## 2. 3 ROL — TO'LIQ TAVSIF

### 2.1 👤 MIJOZ (Guest)

**Kirish:** QR skanerlash → `menu.domen.uz/t/<noyob_token>`
**Ilova YO'Q** — PWA (brauzer) + Telegram Mini App

| # | Funksiya | Bosqich |
|---|---|---|
| M1 | QR skanerlash → menyu ochilishi (stol avtomatik aniqlanadi) | v1 |
| M2 | Menyu: kategoriya, qidiruv, rasm, narx, tavsif, tarkib | v1 |
| M3 | **🎯 AR'da ko'rish** — taomni real o'lchamda stolga qo'yish | **v1** |
| M4 | 3D aylantirib ko'rish (AR yo'q qurilmada fallback) | v1 |
| M5 | Til tanlash: **uz / ru / en** | v1 |
| M6 | Savat: miqdor, izoh ("achchiq qilmang"), jami summa | v1 |
| M7 | Buyurtma yuborish | v1 |
| M8 | Buyurtma holati: qabul qilindi → tayyorlanmoqda → tayyor → berildi | v1 |
| M9 | Chaqiruv: "Ofitsiant", "Hisob", "Suv", "Stol tozalash" | v1 |
| M10 | Allergen/parhez filtri: halol, vegetarian, achchiq, yong'oqsiz | v1 |
| M11 | Qo'shimcha buyurtma (ovqat davomida yana qo'shish) | v1 |
| M12 | Upsell: "Bunga ichimlik qo'shasizmi?" | v1 |
| M13 | Onlayn to'lov: Payme / Click / Uzum | v1.5 |
| M14 | Hisobni bo'lish (split bill) | v1.5 |
| M15 | Ofitsiantga choychaqa (tips) | v1.5 |
| M16 | Otziv + reyting (5⭐ → Google'ga yo'naltirish) | v1.5 |
| M17 | Sodiqlik: keshbek, bonus, tug'ilgan kun | v1.5 |
| M18 | Fiskal chek (raqamli, qonuniy) | v1.5 |
| M19 | AI ofitsiant chat: "achchiq bo'lmagan nima bor?" | v2 |
| M20 | Telegram Mini App orqali kirish | v2 |
| M21 | Uyga buyurtma (delivery, komissiyasiz) | v2 |

**Mijoz identifikatsiyasi:**
- Ro'yxatdan o'tish **SHART EMAS** (to'siq yaratmaslik)
- `device_token` (localStorage UUID) + session
- Ixtiyoriy: telefon raqami (sodiqlik uchun) — format `998XXXXXXXXX`
- Telegram Mini App'da — Telegram user_id avtomatik

---

### 2.2 🧑‍🍳 OFITSIANT (Waiter)

**Kirish:** telefon/PIN → `menu.domen.uz/staff` (PWA) yoki Telegram bot

| # | Funksiya | Bosqich |
|---|---|---|
| O1 | **Yangi buyurtma bildirishnomasi** (push + tovush) | v1 |
| O2 | **🎯 Stol raqamini ko'rish** — qaysi stolga olib borish | **v1** |
| O3 | Buyurtma tarkibi: taomlar, miqdor, mijoz izohi | v1 |
| O4 | Holat o'zgartirish: qabul qildim → olib bordim | v1 |
| O5 | **Mening stollarim** — biriktirilgan stollar ro'yxati | v1 |
| O6 | **2D zal plani** — stollar rangi bilan holati (bo'sh/band/tayyor/hisob) | v1 |
| O7 | Mijoz chaqiruvi (ofitsiant/hisob/suv) — push | v1 |
| O8 | Ofitsiant o'zi buyurtma kiritishi (telefonsiz mijoz uchun) | v1 |
| O9 | Buyurtmani tahrirlash (mijoz fikrini o'zgartirsa) | v1 |
| O10 | Smena boshlash/tugatish | v1 |
| O11 | Hisob berish, to'lovni qabul qilish | v1.5 |
| O12 | Mening statistikam: bugungi stol soni, savdo, choychaqa | v1.5 |
| O13 | Choychaqa QR (mijoz to'g'ridan-to'g'ri beradi) | v1.5 |
| O14 | 3D zal navigatsiyasi (yo'nalish ko'rsatish) | **v3** |

> ⚡ **Muhim:** O13 (choychaqa) — ofitsiantlar tizimni O'ZI targ'ib qilishiga sabab.
> Xodim qarshiligi = SaaS'ning eng katta o'ldiruvchisi. Buni oldini oladi.

---

### 2.3 👨‍💼 ADMIN (Restoran egasi / menejer)

**Kirish:** `menu.domen.uz/admin` (desktop + mobil)

| # | Funksiya | Bosqich |
|---|---|---|
| A1 | **Menyu boshqaruvi:** kategoriya, taom, narx, rasm, tavsif (3 tilda) | v1 |
| A2 | **Taom 3D/AR:** model yuklash yoki kutubxonadan tanlash | v1 |
| A3 | **Stol boshqaruvi:** raqam, zal, sig'im | v1 |
| A4 | **🎯 QR generatsiya** — har stol uchun **noyob** QR + PDF chop etish | **v1** |
| A5 | **Real-time nazorat:** barcha buyurtmalar jonli oqim | v1 |
| A6 | Zal plani chizish (drag&drop stollar) | v1 |
| A7 | Xodimlar: ofitsiant/oshpaz/kassir qo'shish, rol, stol biriktirish | v1 |
| A8 | **KDS monitor** (oshxona TV ekrani) | v1 |
| A9 | Hisobotlar: kunlik/haftalik savdo, top taomlar, soatlik yuklama | v1 |
| A10 | Taom mavjudligi (stop-list): "osh tugadi" → menyudan yashiriladi | v1 |
| A11 | Ofitsiant statistikasi: kim qancha xizmat qildi, tezlik | v1 |
| A12 | Brending: logo, ranglar, o'z domeni | v1 |
| A13 | **AR analitika:** qaysi taom AR'da ko'rilgan, konversiya %, chek ta'siri | v1 |
| A14 | Chegirma/aksiya, promokod | v1.5 |
| A15 | **Menyu-injiniring:** Yulduz/Ot/Jumboq/It kvadranti | v1.5 |
| A16 | Otzivlar boshqaruvi | v1.5 |
| A17 | Sodiqlik sozlamalari (keshbek %, bonus) | v1.5 |
| A18 | Fiskal sozlama: OFD ulanish, IKPU kodlar | v1.5 |
| A19 | Mijoz bazasi (telefon, buyurtma tarixi) + qayta marketing | v2 |
| A20 | Delivery boshqaruvi (kuryer, zona, narx) | v2 |
| A21 | Tarmoq rejimi (bir nechta nuqta) | v2 |
| A22 | Ombor/retsept (food cost) | v2 |

---

## 3. 🎯 AR MODULI — ASOSIY FUNKSIYA (v1)

### 3.1 Texnik yechim

```
                    Mijoz taomni bosadi → "AR'da ko'rish" tugmasi
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                  📱 iOS Safari            🤖 Android Chrome
                        │                       │
                AR Quick Look            Scene Viewer / WebXR
                   dish.usdz                 dish.glb
                        │                       │
                        └───────────┬───────────┘
                                    │
                          Kamera ochiladi → pol/stol aniqlanadi
                          → taom REAL O'LCHAMDA qo'yiladi
                          → aylantirish, yaqinlashtirish (sichqoncha/barmoq bilan)

              AR qo'llab-quvvatlamaydigan qurilma → <model-viewer> 3D aylantirish
```

**Kutubxona:** `<model-viewer>` (Google, ochiq kod) — iOS+Android bitta kod bilan.

### 3.2 Fayl talablari (har taom uchun)

| Fayl | Format | Maks hajm | Kimga | Majburiy |
|---|---|---|---|---|
| `dish.glb` | glTF binary + **Draco** siqish | **3 MB** | Android, web 3D | ✅ |
| `dish.usdz` | USDZ | **5 MB** | iOS AR Quick Look | ✅ |
| `poster.webp` | rasm 800×800 | 150 KB | yuklanguncha | ✅ |
| `dish_photo.webp` | menyu rasmi | 200 KB | menyu ro'yxati | ✅ |

**Real o'lcham:** model **metrda** modellanadi (lagan Ø 32 sm = `0.32 m`).
AR'da 1:1 chiqishi uchun bu **SHART**. Noto'g'ri o'lcham = eng katta bug manbai.

### 3.3 3D kontent pipeline (ENG MUHIM XARAJAT)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UMUMIY KUTUBXONA'dan qidirish (osh, manti, somsa...)     │
│    ✅ TOPILDI → narx 0 so'm, vaqt 0                          │
│    ❌ topilmadi ↓                                            │
├─────────────────────────────────────────────────────────────┤
│ 2. AI: rasm → 3D  (Meshy / Tripo / Rodin API)               │
│    narx ~$0.5-2, vaqt 3 daq, sifat ⭐⭐⭐                     │
│    yetarli emas? ↓                                          │
├─────────────────────────────────────────────────────────────┤
│ 3. FOTOGRAMMETRIYA (60-100 rasm, aylanma)                   │
│    narx ~$8-15, vaqt 40 daq, sifat ⭐⭐⭐⭐⭐                  │
│    (faqat top-10 sotiladigan taom uchun)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ OPTIMIZATSIYA (avtomatik worker)                            │
│  gltf-transform: Draco siqish, tekstura 1024px, LOD         │
│  → GLB < 3 MB                                                │
│  usd-from-gltf: GLB → USDZ                                   │
│  → CDN'ga yuklash                                            │
│  → ✅ UMUMIY KUTUBXONAGA qo'shish (keyingi restoran uchun)   │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 ⚡ UMUMIY TAOM KUTUBXONASI — eng muhim aktiv

```
DishLibrary (umumiy, barcha restoranlar uchun)
 ├─ osh (palov)          [8 variant: toshkent, samarqand, ...]
 ├─ manti               [3 variant]
 ├─ somsa               [4 variant]
 ├─ lag'mon, shashlik, norin, chuchvara, dimlama, mastava...
 ├─ salatlar, ichimliklar, nonlar, shirinliklar
 └─ ~500 ta model (3-yil maqsadi)
```

| Restoran № | Kutubxona holati | Kontent narxi | Marja |
|---|---|---|---|
| 1 | bo'sh | 1 250 000 so'm | 62% |
| 10 | ~150 model | 600 000 so'm | 70% |
| 50 | ~350 model | 250 000 so'm | 74% |
| 100+ | ~500 model | ~50 000 so'm | **85%** |

> 🎯 **Bu — bizning eng kuchli himoya devorimiz (moat).**
> Raqobatchi buni 1 yilda takrorlay olmaydi.

### 3.5 AR analitika (sotuv argumentining asosi)

Har AR ko'rish yoziladi: `ARView(dish, guest, table, duration_sec, converted)`

| Metrika | Nima uchun |
|---|---|
| Taom AR ko'rish soni | Qaysi taom qiziqarli |
| AR → buyurtma konversiyasi | AR ishlayaptimi? |
| **AR ko'rgan vs ko'rmagan mijoz o'rtacha cheki** | 🎯 Sotuv argumenti |
| AR'da ko'rilgan vaqt (sekund) | Qiziqish darajasi |

---

## 4. TEXNIK ARXITEKTURA

```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 MIJOZ (PWA / Telegram Mini App)                               │
│   QR → menu.domen.uz/t/<token>                                    │
│   [Menyu] [🎯 AR ko'rish] [Savat] [Buyurtma] [Chaqiruv] [To'lov]  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS + WebSocket
┌───────────────────────────▼──────────────────────────────────────┐
│  BACKEND — Django 5 + DRF + Channels    (port 8060, armenu_db)   │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌──────┐ ┌──────┐ │
│  │restaurant│ │  menu  │ │ orders │ │ ar3d  │ │staff │ │fiscal│ │
│  │(tenant)  │ │ (dish) │ │  (KDS) │ │(model)│ │(role)│ │(OFD) │ │
│  └──────────┘ └────────┘ └────────┘ └───────┘ └──────┘ └──────┘ │
│  PostgreSQL `armenu_db`  |  Redis (channels/cache)  |  CDN(3D)   │
└─────┬──────────────────────────┬──────────────────────┬──────────┘
      │ WS                       │ WS                   │
┌─────▼────────┐    ┌────────────▼──────────┐  ┌────────▼─────────┐
│ 🧑‍🍳 OFITSIANT │    │ 🍳 KDS (oshxona TV)   │  │ 👨‍💼 ADMIN panel   │
│ Stol raqami   │    │ Yangi buyurtmalar     │  │ Real-time nazorat│
│ 2D zal plan   │    │ Tayyorlash vaqti      │  │ Hisobot, analitika│
└───────────────┘    └───────────────────────┘  └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 🔧 WORKER (armenu-worker.service) — alohida servis                │
│   3D pipeline: kutubxona qidirish → AI 3D → optimizatsiya → USDZ │
│   Fiskal navbat, bildirishnoma navbati                            │
└──────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Uzoq ish = alohida worker servis** (mebelcity tajribasi: `bittada-media-worker`).
> 3D generatsiya 3-40 daqiqa — web so'rovda QILINMAYDI.

### 4.1 Stack

| Qatlam | Texnologiya | Sabab |
|---|---|---|
| Backend | Django 5 + DRF | Tajriba bor |
| Real-time | Channels + Daphne + Redis | KDS/ofitsiant |
| DB | PostgreSQL `armenu_db` | Izolyatsiya |
| Mijoz UI | PWA (Vue 3 yoki vanilla) | Ilova kerak emas |
| **AR/3D** | **`<model-viewer>`** | iOS+Android bitta kod |
| 3D optimizatsiya | `gltf-transform` (Draco) | < 3 MB |
| USDZ | `usd-from-gltf` (Google) | iOS |
| AI 3D | Meshy / Tripo API (~$20/oy) | Arzon kontent |
| To'lov | **`paytechuz`** (PyPI) | Payme+Click+Uzum bitta kutubxona |
| Fiskal | UZKASSA / e-POS / QPos API | Soliq talabi |
| IKPU | `tasnif.soliq.uz` API | Majburiy (2026-04-01 dan) |
| Telegram | aiogram (Mini App + bot) | 27 mln foydalanuvchi |
| CDN | nginx + Cloudflare | 3D fayl tezligi |

### 4.2 Ma'lumot modeli

```
Restaurant (id, slug, nom, logo, ranglar, tarif, is_active, ofd_config)
 ├─ Hall (id, restaurant, nom, plan_json)
 │   └─ Table (id, hall, raqam, qr_token[UUID], x, y, shakl, sig'im, holat)
 ├─ Category (id, restaurant, nom_uz/ru/en, tartib, icon)
 │   └─ Dish (id, category, nom_uz/ru/en, tavsif_uz/ru/en, narx, rasm,
 │            allergenlar[], parhez[], tayyorlash_daq, ikpu_kod,
 │            is_available, is_hit, tartib)
 │       └─ DishModel3D (id, dish, library_ref?, glb, usdz, poster,
 │                       real_olcham_sm, manba[library|ai|photo], holat)
 ├─ DishLibrary ⚡ (id, kalit_nom, nom_uz/ru/en, glb, usdz, poster,
 │                  real_olcham_sm, teglar[], ishlatilgan_soni)   # UMUMIY
 ├─ Guest (id, restaurant, device_token, telefon?, ism?, tg_user_id?, bonus)
 ├─ Order (id, restaurant, table, guest, holat, jami, izoh, waiter,
 │         created_at, fiskal_chek_id?)
 │   └─ OrderItem (id, order, dish, miqdor, narx, izoh, ar_viewed)
 ├─ Staff (id, restaurant, user, rol[waiter|cook|cashier|admin], stollar[], pin)
 ├─ ARView ⚡ (id, dish, guest, table, duration_sec, converted, created_at)
 ├─ Call (id, table, tur[waiter|bill|water|clean], holat, created_at)
 ├─ Review (id, order, reyting, matn, google_yonaltirildi)
 └─ Payment (id, order, usul[cash|payme|click|uzum], summa, tips, holat)
```

### 4.3 Muhim texnik qoidalar

1. **Multi-tenant:** har so'rovda `restaurant_id` filtri — **SHART**
2. **WS guruhlari restoran-scoped:** `rest_<id>_kds`, `rest_<id>_waiters`, `rest_<id>_admin`
3. **QR token = UUID4** — stol raqami EMAS (bruteforce oldini olish). Har stol **noyob**
4. **Miqdor butun son** — `Math.ceil()`
5. **Dark + Light tema** — ikkalasi ham SHART
6. **Statik cache-bust:** `?v=N`
7. **3D fayl validatsiyasi:** GLB > 3 MB → rad etiladi
8. **Uzoq ish (3D generatsiya) → worker servis**, web so'rovda EMAS
9. **Telefon formati:** baza `998XXXXXXXXX`, ekran `+998 XX XXX XX XX`
10. **Media papka egaligi** to'g'ri o'rnatilsin

---

## 5. QR KOD TIZIMI (talab qilinganidek)

### 5.1 Har stol uchun NOYOB QR

```
Stol 1  → https://menu.domen.uz/t/a3f2c891-...   (UUID4)
Stol 2  → https://menu.domen.uz/t/7b1e4d20-...   (butunlay boshqa)
Stol 3  → https://menu.domen.uz/t/e9c05f73-...
```

- ✅ Har QR **noyob** va **tахmin qilib bo'lmaydi**
- ✅ Skanerlangach stol raqami **avtomatik** aniqlanadi — mijoz kiritmaydi
- ✅ Buyurtma → `table_id` avtomatik → ofitsiant stol raqamini ko'radi
- 🔄 QR **qayta generatsiya** (token almashtirish) — agar QR ko'chirilsa

### 5.2 QR chop etish
- **PDF eksport:** A4 da 6 ta stol standi yoki har stolga alohida
- Dizayn: restoran logosi + stol raqami (**katta**) + QR + "Menyuni skanerlang" (3 tilda)
- Materiallar: akril stend, stiker, stol ustidagi taglik
- ⚡ QR pastida kichik "Powered by ..." — **viral kanal** (FREE tarifda)

---

## 6. BOSQICHLAR VA MUDDATLAR (yangilangan)

### v1 — MVP + AR (asosiy maqsad)

| # | Bosqich | Muddat | Natija |
|---|---|---|---|
| 0 | Server, repo, DB, domen, systemd | 3 kun | Bo'sh Django ishlaydi |
| 1 | Admin: restoran, menyu, kategoriya, taom (3 til) | 2 hafta | Menyu kiritiladi |
| 2 | Stol + **noyob QR** + PDF chop | 1 hafta | QR stolga qo'yiladi |
| 3 | Mijoz PWA: menyu, savat, buyurtma | 2 hafta | Buyurtma beriladi |
| 4 | **🎯 AR moduli** (model-viewer, GLB/USDZ) | **2,5 hafta** | **AR ishlaydi** |
| 5 | 3D pipeline + kutubxona (worker) | 2 hafta | Model avtomatik tayyorlanadi |
| 6 | Real-time: WS, KDS, **ofitsiant paneli** | 2 hafta | Ofitsiant stol raqamini ko'radi |
| 7 | 2D zal plan (drag&drop) | 1 hafta | Zal ko'rinadi |
| 8 | Admin nazorat + hisobot + AR analitika | 1,5 hafta | To'liq nazorat |
| 9 | Chaqiruv, stop-list, upsell, allergen | 1 hafta | Qulaylik |
| 10 | Pilot uchun kontent (5 restoran × 20 taom) | 2 hafta | ✅ **v1 TAYYOR** |

**v1 jami: ~17 hafta (≈4 oy)**

### v1.5 — Monetizatsiya (+6 hafta)
To'lov (Payme/Click/Uzum), **fiskal chek (OFD)**, split bill, choychaqa, otziv+Google,
sodiqlik/keshbek, menyu-injiniring

### v2 — O'sish (+8 hafta)
Telegram Mini App, AI ofitsiant chat, delivery (komissiya 0%), mijoz bazasi + marketing,
tarmoq rejimi, ombor/retsept

### v3 — 3D restoran (keyingi bosqich, foydalanuvchi aytganidek)
2.5D izometrik zal → to'liq 3D zal → ofitsiant navigatsiyasi

---

## 7. ❓ RUXSATDAN OLDIN JAVOB KERAK (yangilangan)

| # | Savol | Tavsiyam |
|---|---|---|
| 1 | **Domen?** | Yangi alohida domen (masalan `armenu.uz`, `menu3d.uz`) |
| 2 | **Server:** shu server (port 8060) yoki alohida VPS? | ⚡ **Alohida VPS** — mebelcity'ga 0 ta'sir |
| 3 | **Brend nomi?** | — |
| 4 | **Pilot restoran bormi?** (tanish) | 5 ta kerak: 2 Toshkent + 2 Samarqand + 1 Buxoro |
| 5 | **3D kontentni kim qiladi?** | AI (Meshy ~$20/oy) 80% + qo'lda 20% |
| 6 | **Byudjet (1-bosqich)?** | — |
| 7 | **v1 qamrovi to'g'rimi?** (yuqoridagi 10 bosqich) | Ha desangiz — shunday boshlaymiz |
| 8 | **Fiskalizatsiya v1.5 da bo'ladimi yoki v1 da?** | v1.5 (avval AR ishlasin) |
| 9 | **Delivery (komissiya 0%) v2 da yetarlimi?** | Ha — lekin sotuvda ARGUMENT sifatida darrov ishlatiladi |
| 10 | **FREE tarif bo'ladimi?** | ⚡ **Ha** — bozorga tez kirish uchun |

---

## 8. XAVF DARAJASI (bu TZ uchun)

| Element | Xavf | Izoh |
|---|---|---|
| **Mavjud platformaga ta'sir** | 🟢 **YO'Q** | To'liq alohida repo/DB/server/port |
| v1 texnik amalga oshirish | 🟢 **PAST** | Standart Django+Channels, tajriba bor |
| AR moduli (model-viewer) | 🟡 **O'RTA** | iOS USDZ pipeline sinovdan o'tkazilsin |
| 3D real o'lcham aniqligi | 🟡 **O'RTA** | Model metrda — noto'g'ri bo'lsa AR buziladi |
| 3D kontent narxi | 🟡 **O'RTA** | Kutubxona + AI hal qiladi |
| Fiskalizatsiya (v1.5) | 🟡 **O'RTA** | OFD API hujjatlari kerak |
| 3D restoran + navigatsiya | 🔴 **YUQORI** | **v3 ga ko'chirildi** ✅ |

---

## 9. VIDEO (`ai agent.mp4`) — xulosа

AI marketing agent demosi (473 lid, ROMI 1207%). AR menyuga bevosita aloqasi yo'q.
**Olingan 2 g'oya:**
1. **KDS monitor UI uslubi** — neon/dark cyberpunk. Oshxona TV ekranida "wow" beradi
2. **Reels marketing** — AR demo videosi shu formatda viral bo'lishi mumkin

---

## 10. KEYINGI QADAM

⛔ **KOD YOZILMAYDI.** Avval §7 dagi 10 ta savolga javob va v1 qamrovi tasdiqlansin.

**Bog'liq hujjatlar:**
- [00_BOZOR_TAHLIL.md](00_BOZOR_TAHLIL.md) — birinchi tahlil
- [02_CHUQUR_BOZOR_TAHLIL_v2.md](02_CHUQUR_BOZOR_TAHLIL_v2.md) ⚡ — fiskalizatsiya, delivery, turizm, 20 yangi funksiya
