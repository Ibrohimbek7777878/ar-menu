# AR MENU — TEXNIK TOPSHIRIQ (TZ)
**Sana:** 2026-09-04
**Holat:** 🔴 TZ — KOD YOZILMAGAN, ruxsat kutilmoqda (QONUN69: 2 bosqich)
**Izolyatsiya:** ALOHIDA loyiha. `mebelcity_platform` kodiga, DB'siga, servislariga TEGILMAYDI.

---

## 0. IZOLYATSIYA KAFOLATI (eng muhim bo'lim)

| Element | AR Menu loyihasi | mebelcity_platform |
|---|---|---|
| Repo | `armenu/` (yangi, alohida git) | tegilmaydi |
| Papka | `/home/user/armenu/` | `/home/user/mebelcity_platform/` |
| Django loyiha | yangi `armenu_project` | tegilmaydi |
| DB | yangi PostgreSQL `armenu_db` | `tenant_*` bazalarga tegilmaydi |
| Port | 8060 (yangi) | 8040/8041 tegilmaydi |
| Systemd | `armenu.service` (yangi) | `bittada-*` TEGILMAYDI |
| Nginx | yangi server block | mavjudiga tegilmaydi |
| Domen | `menu.<domen>.uz` yoki alohida | tegilmaydi |

> ⛔ **Mavjud `bittada-manager`, `bittada-manager-ws`, `bittada-cp-poller`,
> `bittada-media-worker` servislari va ularning config fayllari — TEGILMAYDI.**

---

## 1. LOYIHA MAQSADI

Restoran/choyxona menyusini raqamlashtirish:
1. Stolda **QR kod** → skanerlanadi → **onlayn menyu** ochiladi
2. Taom tanlanadi → **AR/3D** ko'rinishda telefon kamerasi orqali **real o'lchamda** stolga qo'yib ko'riladi
3. Yoqsa — **buyurtma** beriladi
4. Buyurtma **stol raqami + mijoz ID** bilan tizimga tushadi
5. Oshxona/kassa **monitorida** buyurtmalar ro'yxati ko'rinadi
6. Ofitsiantga **qaysi stolga olib borish** ko'rsatiladi

---

## 2. FUNKSIONAL TALABLAR — BOSQICHLARGA BO'LINGAN

### 🟢 MVP (v1) — 2-3 oy — MUST HAVE

#### 2.1 Restoran admin panel
- Restoran ro'yxatdan o'tishi (multi-tenant: 1 tizim, ko'p restoran)
- Menyu boshqaruvi: kategoriya → taom (nom, tavsif, narx, rasm, allergen, tarkib)
- Ko'p tillilik: **o'zbek / rus / ingliz** (turizm uchun SHART)
- Stol boshqaruvi: stol raqami, zal/bo'lim, sig'imi
- **QR kod generatsiya:** har stol uchun alohida QR + PDF chop etish (A4 / stol-standi)
- Xodimlar: ofitsiant, oshpaz, kassir rollari

#### 2.2 Mijoz interfeysi (PWA, ilova YO'Q)
- QR skanerlash → `menu.domen.uz/r/<restoran>/t/<stol_kodi>`
- Menyu ko'rish, qidiruv, kategoriya filtri
- Taom kartochkasi: rasm, narx, tavsif, tarkib
- **Savat + buyurtma yuborish**
- Buyurtma holati kuzatuvi (qabul qilindi → tayyorlanmoqda → tayyor → berildi)
- Mijoz ID: `localStorage` + session (ro'yxatdan o'tishsiz), ixtiyoriy telefon raqami
- Chaqiruv tugmalari: "Ofitsiantni chaqirish", "Hisob so'rash"

#### 2.3 Real-time buyurtma oqimi
- WebSocket (Django Channels) — restoran-scoped guruh
- **KDS (Kitchen Display System)** — oshxona monitori: yangi buyurtmalar, tayyorlash vaqti
- **Ofitsiant paneli** (telefon): mening stollarim, tayyor buyurtmalar, "olib bordim" tugmasi
- **Kassa paneli:** hisob, to'lov, chek

#### 2.4 Zal 2D plani (navigatsiya o'rniga — v1)
- Admin zalni **2D drag&drop** bilan chizadi (stollar to'rtburchak/dumaloq)
- Stol rangi = holati (bo'sh / band / buyurtma tayyor / hisob kutilmoqda)
- Ofitsiant telefonida shu 2D plan ko'rinadi + "tayyor" stol yonib turadi
- ⚠️ **3D navigatsiya v1 da YO'Q** (sabab: 00_BOZOR_TAHLIL.md § 3.2.5)

---

### 🟡 v2 — AR MODUL — +2 oy — SHOULD HAVE

#### 2.5 AR/3D taom ko'rish
**Texnologiya:**
```
Frontend:  <model-viewer> (Google web component)
           ├─ Android → Scene Viewer / WebXR   → .glb fayl
           └─ iOS     → AR Quick Look          → .usdz fayl
Fallback:  3D aylantiriladigan viewer (AR yo'q qurilmalarda)
```

**Har taom uchun kerak:**
| Fayl | Format | Hajm (maks) | Kimga |
|---|---|---|---|
| `dish.glb` | glTF binary + Draco | **< 3 MB** | Android, web 3D |
| `dish.usdz` | USDZ | **< 5 MB** | iOS AR Quick Look |
| `poster.webp` | rasm | < 150 KB | yuklanguncha placeholder |

**Real o'lcham:** model metrda modellanadi (tovoq Ø 26 sm = 0.26 m).
AR'da 1:1 chiqishi uchun bu SHART.

#### 2.6 3D kontent ishlab chiqarish pipeline (ENG MUHIM XARAJAT)

3 xil usul — narx/sifat bo'yicha:

| Usul | Narx/taom | Sifat | Vaqt | Qachon |
|---|---|---|---|---|
| **A. Fotogrammetriya** (aylanma 60-100 rasm + RealityCapture/Meshroom) | ~$8-15 | ⭐⭐⭐⭐⭐ | 40 daq | Premium taomlar |
| **B. AI rasm→3D** (Meshy / TripoSR / Rodin) | ~$0.5-2 | ⭐⭐⭐ | 3 daq | Ko'pchilik taom |
| **C. Shablon + tekstura** (tayyor tovoq/piyola modeli + taom tekstura) | ~$0.2 | ⭐⭐ | 1 daq | Ichimlik, salat, non |

**Tavsiya strategiya:** 80% B usul + 20% A usul (top-sotiladigan taomlar).
Bu 1 restoran (100 taom) uchun kontent narxini **$1000 → $200** ga tushiradi.

**⚠️ Gaussian Splatting** — hozircha AR Quick Look/Scene Viewer'da qo'llab-quvvatlanmaydi.
Faqat web-viewer'da ishlaydi. v1/v2 da ISHLATILMAYDI.

#### 2.7 AR analitika
- Qaysi taom necha marta AR'da ko'rilgan
- AR ko'rgandan keyin buyurtma konversiyasi (%)
- AR ko'rgan vs ko'rmagan mijozning o'rtacha cheki
- **Bu — sotuv argumentining asosi**

---

### 🔴 v3 — 3D RESTORAN — +3 oy — NICE TO HAVE (shubhali)

#### 2.8 3D zal ko'rinishi
**3 ta yechim varianti:**

| Variant | Qanday | Narx | Sifat | Tavsiya |
|---|---|---|---|---|
| **1. Fotogrammetriya/3DGS** (rasmlardan avtomatik) | 100-300 rasm → 3DGS | $300-2000/zal | ⭐⭐⭐ (yaltiroq, noaniq) | ❌ |
| **2. Qo'lda 3D modellash** (SketchUp/Blender) | plan + rasmlardan | $150-400/zal | ⭐⭐⭐⭐⭐ | ✅ **TAVSIYA** |
| **3. Stilizatsiya 2.5D** (izometrik plan) | admin drag&drop | ~$0 | ⭐⭐⭐ | ✅ **eng arzon** |

> **Tavsiya:** Variant 3 (izometrik 2.5D) — 90% foydani 5% narxga beradi.
> Sizda SketchUp tajribasi bor (`sketchup fayllar/` papkasi) → Variant 2 ham real.
> Variant 1 (rasmlardan avtomatik) — **beqaror, tavsiya etilmaydi**.

#### 2.9 Ofitsiant navigatsiyasi
- ⚠️ Google Maps kabi ichki navigatsiya — **GPS ishlamaydi**, indoor positioning
  (BLE beacon / UWB) kerak → qo'shimcha uskuna, $500+/zal
- **Realistik yechim:** 2.5D plan + stol yonib turadi + "3 ta stol o'ngda" matni
- To'liq turn-by-turn navigatsiya — **300 m² zalda ORTIQCHA** (ofitsiant biladi)

---

## 3. TEXNIK ARXITEKTURA

```
┌─────────────────────────────────────────────────────────────┐
│  MIJOZ (telefon, PWA — ilova YO'Q)                          │
│  QR skanerlash → menu.domen.uz/r/<slug>/t/<table>            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐               │
│  │  Menyu   │  │ <model-viewer│  │  Savat   │               │
│  │  ko'rish │→ │  AR / 3D>    │→ │ Buyurtma │               │
│  └──────────┘  └──────────────┘  └──────────┘               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│  BACKEND — Django 5 + DRF + Channels   (port 8060)          │
│  ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐            │
│  │restaurant│ │  menu  │ │ orders  │ │  ar3d    │            │
│  │ (tenant) │ │(dish)  │ │ (KDS)   │ │(models)  │            │
│  └─────────┘ └────────┘ └─────────┘ └──────────┘            │
│  PostgreSQL `armenu_db`  +  Redis (channels, cache)          │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
   ┌─────────▼────────┐        ┌─────────▼─────────┐
   │  KDS Monitor     │        │  Ofitsiant PWA    │
   │  (oshxona TV)    │        │  2D/2.5D zal plan │
   └──────────────────┘        └───────────────────┘

   ┌──────────────────────────────────────────────┐
   │  3D KONTENT PIPELINE (alohida worker)        │
   │  rasm → AI 3D (Meshy) → GLB optimizatsiya    │
   │  → USDZ konvertatsiya → CDN                  │
   └──────────────────────────────────────────────┘
```

### 3.1 Stack
| Qatlam | Texnologiya | Sabab |
|---|---|---|
| Backend | Django 5 + DRF | Sizda tajriba bor (mebelcity) |
| Real-time | Django Channels + Daphne + Redis | KDS/ofitsiant uchun |
| DB | PostgreSQL (alohida `armenu_db`) | izolyatsiya |
| Frontend (mijoz) | PWA: vanilla JS yoki Vue 3 | tez, ilova kerak emas |
| 3D/AR | `<model-viewer>` (Google) | iOS+Android bitta kod |
| 3D optimizatsiya | `gltf-transform` (Draco, texture resize) | hajm < 3 MB |
| USDZ konvert | `usd-from-gltf` (Google) yoki Reality Converter | iOS uchun |
| CDN | statik fayllar + Cloudflare / nginx | 3D fayl tez yuklanishi |
| To'lov (v2) | Payme / Click / Uzum | mahalliy |

### 3.2 Ma'lumot modeli (asosiy)

```
Restaurant  (id, slug, nom, logo, ranglar, tariff, is_active)
 ├─ Hall     (id, restaurant, nom, plan_json)          # zal/bo'lim
 │   └─ Table (id, hall, raqam, qr_token, x, y, shakl, sig'im, holat)
 ├─ Category (id, restaurant, nom_uz/ru/en, tartib)
 │   └─ Dish  (id, category, nom_uz/ru/en, tavsif, narx, rasm,
 │             allergenlar, tayyorlash_vaqti, is_active)
 │       └─ DishModel3D (id, dish, glb_file, usdz_file, poster,
 │                       real_o'lcham_sm, holat, manba_usul)
 ├─ Guest    (id, restaurant, device_token, telefon?, ism?)
 ├─ Order    (id, restaurant, table, guest, holat, jami, izoh,
 │            created_at, waiter_id)
 │   └─ OrderItem (id, order, dish, miqdor, narx, izoh, ar_viewed_bool)
 ├─ Staff    (id, restaurant, user, rol[waiter/cook/cashier/admin], stollar)
 └─ ARView   (id, dish, guest, table, duration_sec, converted_bool)  # analitika
```

### 3.3 Muhim texnik qoidalar
1. **Multi-tenant:** har so'rovda `restaurant_id` bo'yicha filtr (SHART)
2. **WebSocket guruhlari restoran-scoped:** `restaurant_<id>_kds`, `restaurant_<id>_waiters`
3. **QR token:** stol QR'i `uuid4` token — raqam emas (bruteforce oldini olish)
4. **Miqdor butun son** — `Math.ceil()`
5. **Dark + Light tema** — ikkalasi ham
6. **Statik fayl cache-bust:** `?v=N`
7. **3D fayl chegarasi:** GLB > 3 MB bo'lsa yuklanmaydi (validatsiya)

---

## 4. BOSQICHLAR VA MUDDATLAR

| Bosqich | Mazmun | Muddat | Natija |
|---|---|---|---|
| **0. Tayyorgarlik** | Repo, server, domen, DB, systemd | 3 kun | Bo'sh Django ishga tushgan |
| **1. Admin + Menyu** | Restoran, kategoriya, taom, 3 til, rasm | 2 hafta | Menyu kiritish mumkin |
| **2. Stol + QR** | Stol CRUD, QR generatsiya, PDF chop | 1 hafta | QR chop etilib stolga qo'yiladi |
| **3. Mijoz PWA** | Menyu ko'rish, savat, buyurtma | 2 hafta | Buyurtma beriladi |
| **4. Real-time KDS** | WebSocket, oshxona monitori, ofitsiant | 2 hafta | Buyurtma monitorda |
| **5. 2D zal plan** | drag&drop editor, stol holati | 1 hafta | Ofitsiant stolni ko'radi |
| **6. Kassa + hisobot** | hisob, to'lov, kunlik hisobot | 1,5 hafta | ✅ **MVP TAYYOR** |
| **7. AR modul** | model-viewer, GLB/USDZ pipeline | 3 hafta | ✅ **AR ISHLAYDI** |
| **8. 3D kontent** | 30 taom uchun model (pilot restoran) | 2 hafta | Pilot uchun kontent |
| **9. AR analitika** | ko'rish/konversiya statistikasi | 1 hafta | Sotuv argumenti |
| **10. 2.5D zal** | izometrik ko'rinish | 2 hafta | v3 |

**MVP jami: ~10 hafta (2,5 oy)**
**AR bilan: ~16 hafta (4 oy)**

---

## 5. SAVOLLAR — RUXSATDAN OLDIN JAVOB KERAK

1. **Domen:** qaysi domen ishlatiladi? (`menu.bittada.uz` yoki butunlay yangi?)
2. **Server:** shu serverda (port 8060) yoki alohida VPS?
   → Tavsiya: **alohida VPS** (mebelcity'ga umuman ta'sir qilmasligi uchun)
3. **Brend nomi:** loyiha nomi nima bo'ladi?
4. **Pilot restoran:** kimdir bormi (tanish restoran)? Bu 1-bosqich uchun kritik
5. **3D kontent:** kim qiladi? (o'zimiz / autsors / AI)
6. **Byudjet:** 1-bosqich uchun taxminiy byudjet?
7. **v1 qamrovi:** yuqoridagi MVP bo'linishiga rozimisiz, yoki AR'ni darrov v1 ga qo'shamizmi?
8. **To'lov:** mijoz ilovada to'laydimi (Payme/Click) yoki faqat kassada?

---

## 6. XAVF DARAJASI (bu TZ uchun)

| Element | Xavf | Izoh |
|---|---|---|
| Mavjud platformaga ta'sir | 🟢 **YO'Q** | To'liq alohida repo/DB/server/port |
| Texnik amalga oshirish (MVP) | 🟢 **PAST** | Standart Django + Channels, tajriba bor |
| AR modul (model-viewer) | 🟡 **O'RTA** | iOS USDZ pipeline sinovdan o'tkazilishi kerak |
| 3D kontent narxi | 🔴 **YUQORI** | Birlik iqtisodiyotini o'ldirishi mumkin |
| 3D restoran + navigatsiya | 🔴 **YUQORI** | v1/v2 dan CHIQARILDI |
| Bozor qabul qilishi | 🟡 **O'RTA** | Pilot bilan tekshiriladi |

---

## 7. VIDEO TAHLILI (`ai agent.mp4`)

**Ko'rilgan:** 58 soniya, vertikal (720×1280), reels formati.
**Mazmun:** "AI Marketing Launch / CPB-047" — AI marketing avtomatlashtirish
dashboardi. Ekranda: neon cyberpunk UI, marketing engine, 23 ta faol kampaniya,
agent tugunlari (Yandex Direct, VK, Telegram, OZON, Avito), buyruq qatori
(`/marketing`, `/продажи`, `/carousel`, `/lead`), yakunda natija paneli:
**473 lid, 86 bitim, ROMI 1207%, CAC −18%, 4.8M ₽ tushum**.

**Xulosa:** Bu video **AR menyu loyihasiga bevosita aloqador emas** — bu boshqa
mahsulot (AI marketing agenti) demosi.

**Lekin 2 ta foydali g'oya bor:**
1. **UI uslubi** — neon/dark cyberpunk dashboard. KDS monitori uchun
   (oshxona TV ekrani) shunday uslub yaxshi ko'rinadi va "wow" beradi.
2. **Marketing usuli** — reels formatida "jonli ekran" demo. AR menyu uchun
   ham **aynan shunday reels** eng kuchli sotuv quroli bo'ladi
   (telefon → taom stolda paydo bo'lyapti → viral).

---

## 8. KEYINGI QADAM

⛔ **KOD YOZILMAYDI.** Avval:
1. §5 dagi 8 ta savolga javob
2. v1 qamrovi tasdiqlansin
3. Server/domen qarori
4. Shundan keyingina — ruxsat bilan kod boshlanadi

---

**Bog'liq hujjat:** [00_BOZOR_TAHLIL.md](00_BOZOR_TAHLIL.md)
