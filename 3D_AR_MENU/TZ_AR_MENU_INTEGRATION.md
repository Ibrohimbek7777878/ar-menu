# 📋 TEXNIK VAZIFA (TZ): AR_MENU_LOYIHA ning AR va Menyu Qismlarini Asosiy Loyihaga Mukammal Integratsiya Qilish

Ushbu hujjat `/home/ibrohim/Desktop/client_baza/AR_MENU_LOYIHA` loyihasidagi barcha **3D modellar, AR ko'rish tizimi, Kamera AR va Menyu vitrinasini** hozirgi ishlayotgan `online store_guliston` platformamizga ortiqcha qiyinchiliksiz, 100% real va ideal tarzda birlashtirish rejasini belgilaydi.

---

## 🔍 1. MAVJUD HOLAT TAHLILI VA KASHFIYOTLAR

### A. `AR_MENU_LOYIHA` da nimalar bor?
1. **17 ta haqiqiy, professional 3D `.glb` modellar** (`media/ar/glb/`):
   - 🍲 `plov.glb` (Osh / Palov — 1.78 MB)
   - 🍢 `shashlik.glb` (Shashlik / Kabob — 1.60 MB)
   - 🥟 `somsa.glb` (Tandir somsa — 5.31 MB)
   - 🥟 `manti.glb` (Manti — 7.54 MB)
   - 🍜 `lagmon.glb` (Cho'zma / Qovurma lag'mon — 6.99 MB)
   - 🥩 `qozon_kabob.glb` (Qozon kabob — 487 KB)
   - 🥣 `shorva.glb` (Sho'rva — 6.83 MB)
   - 🥣 `mastava.glb` (Mastava — 9.22 MB)
   - 🍞 `non.glb` (Tandir non / Patir — 5.16 MB)
   - 🥗 `salad_achichuk.glb` (Achichuk — 4.09 MB)
   - 🥗 `salad_bahor.glb` (Bahor salat — 8.11 MB)
   - 🫖 `tea_cup.glb` (Choynak va piyola — 528 KB)
   - 🥩 `steak_meat.glb` (Steyk / Go'sht — 6.50 MB)
   - 🍳 `breakfast_egg.glb` (Nonushta tuxum — 2.45 MB)
   - 🍨 `dessert_bowl.glb` (Shirinlik — 4.93 MB)
   - 🍾 `drink_bottle.glb` (Ichimlik — 8.96 MB)
2. **Eng ilg'or AR mexanizmi (`static/guest/js/ar.js` va `ar-detect.js`):**
   - `@google/model-viewer` 3.5.0 moduli orqali **WebXR (Android)** va **Apple QuickLook (iOS)** qo'llab-quvvatlanadi.
   - **4 bosqichli ishonchli fallback:**
     1. *1-daraja:* Real Kamera AR (stolda haqiqiy hajmda ko'rish).
     2. *2-daraja:* 3D interaktiv 360° aylanuvchi model.
     3. *3-daraja:* 360° tasvirlar karuseli.
     4. *4-daraja:* Yuqori sifatli rasm.
3. **`air-3d-menu` (Vite/React ilovasi):**
   - `ARViewerModal.tsx`: Real vaqtda orqa kamerani (`facingMode: 'environment'`) yoqish, ovozli taom tavsifi (Web Speech API) va interaktiv lagan/taom renderingi.

### B. Bizning loyihamizda (`online store_guliston`) hozir nimalar bor?
- `backend/ar3d/`: `ProductLibrary` va `Product3DModel` modellari mavjud, lekin ularda faqat tashqi linklar yoki placeholderlar bor edi.
- `backend/templates/customer/ar_menu.html`: 3D menyu sahifasi bor, lekin 17 ta milliy taom modeli ulanmagan edi.
- `Telegram Mini App (TMA)`: Telegram ichida ochiladi, lekin 3D modellar real yuklanmayotgan edi.

---

## 🎯 2. FAQAT AR VA MENYU QISMLARINI ULASH KO'LAMI (SCOPE)

Ortiqcha va mos kelmaydigan qismlarni (PostgreSQL pgvector, alohida node/express serverlar, boshqa kds/buxgalteriya) chetga surib, **faqat sof, yuqori qiymatli AR va Menyu** qismlari olinadi:

| Olinadigan Qism | Maqsadi | Loyihamizdagi Joyi |
| :--- | :--- | :--- |
| **1. 17 ta .glb 3D Modellar** | O‘zbek milliy taomlarining real 3D fayllari | `backend/media/ar/glb/` |
| **2. Milliy Taomlar 3D Kutubxonasi** | Har bir milliy taom nomiga qarab (osh, manti, somsa...) avtomatik 3D model biriktirish | `backend/ar3d/services.py` & `ProductLibrary` |
| **3. Model-Viewer & 4-Bosqichli AR Dvigateli** | WebXR, Google SceneViewer va iOS QuickLook ni uzluksiz ishlatish | `backend/static/ar/js/model-viewer.js` & `ar_engine.js` |
| **4. Kamera AR va Ovozli Taom Tavsifi** | Kamerani ochib stolga qo‘yish va ovoz bilan taom haqida aytib berish | `backend/templates/customer/ar_viewer_modal.html` |
| **5. Menyu Kartochkalariga "🥽 3D AR" Tugmasi** | Mijoz menyuda bitta tugma bilan 3D ko‘rinishga o‘tishi | `ar_menu.html`, `tma/home.html`, `tma/catalog.html` |

---

## 🏗 3. BOSQICHMA-BOSQICH AMALGA OSHIRISH REJASI

### 1-Bosqich: 3D Fayllarni Loyihaga O'tkazish
- `AR_MENU_LOYIHA/media/ar/glb/*.glb` fayllarini `backend/media/ar/glb/` ga to'liq nusxalash (17 ta fayl).
- Media URL marshrutlarini tekshirish (`/media/ar/glb/{nomi}.glb`).

### 2-Bosqich: 3D Kutubxona (`ProductLibrary`) ni To'ldirish
- `backend/ar3d/services.py` dagi `DEFAULT_LIBRARY_ITEMS` ga 17 ta milliy taomning barchasini to'liq kiritish:
  - `plov` &rarr; `/media/ar/glb/plov.glb` (aliaslar: osh, palov, toy oshi, choyxona oshi, to'y oshi)
  - `shashlik` &rarr; `/media/ar/glb/shashlik.glb` (aliaslar: shashlik, kabob, qiyma, lahm, jigar, dimlama)
  - `somsa` &rarr; `/media/ar/glb/somsa.glb` (aliaslar: somsa, tandir somsa, go'shtli somsa, qatlama)
  - `manti` &rarr; `/media/ar/glb/manti.glb` (aliaslar: manti, qovoq manti, go'shtli manti)
  - `lagmon` &rarr; `/media/ar/glb/lagmon.glb` (aliaslar: lag'mon, lagmon, qovurma lag'mon, cho'zma)
  - `qozon-kabob` &rarr; `/media/ar/glb/qozon_kabob.glb` (aliaslar: qozon kabob, qozonkabob, tandir go'sht)
  - `shorva` &rarr; `/media/ar/glb/shorva.glb` (aliaslar: sho'rva, shorva, ko'za sho'rva, noxot sho'rva)
  - `mastava` &rarr; `/media/ar/glb/mastava.glb` (aliaslar: mastava, guruch sho'rva)
  - `non` &rarr; `/media/ar/glb/non.glb` (aliaslar: non, tandir non, patir, kulcha)
  - `achichuk` &rarr; `/media/ar/glb/salad_achichuk.glb` (aliaslar: achichuk, achchiq-chuchuk, pomidor bodring)
  - `bahor-salat` &rarr; `/media/ar/glb/salad_bahor.glb` (aliaslar: bahor salat, olivye, svejiy)
  - `choynak-piyola` &rarr; `/media/ar/glb/tea_cup.glb` (aliaslar: choy, ko'k choy, qora choy, limon choy)
  - `steyk` &rarr; `/media/ar/glb/steak_meat.glb` (aliaslar: steyk, steak, bifsteks, medalon)
  - `desert` &rarr; `/media/ar/glb/dessert_bowl.glb` (aliaslar: desert, tort, muzqaymoq, paxlava)
  - `ichimlik` &rarr; `/media/ar/glb/drink_bottle.glb` (aliaslar: sharbat, kompot, kola, fanta, suv)
  - `nonushta` &rarr; `/media/ar/glb/breakfast_egg.glb` (aliaslar: tuxum, omlet, sasiska)
- `seed_3d_models` management komandasini yurgizib, do'kon va restoranlardagi mavjud taomlarga 3D modellarni avtomatik bog'lash (`auto_attach_3d_models_for_shop`).

### 3-Bosqich: AR API Endpointini Yaratish (`/api/v1/ar/{product_id}/`)
- Frontend yoki Mini App mahsulot ID sini berganda quyidagicha to'liq JSON qaytaradigan endpoint:
  ```json
  {
    "success": true,
    "product_id": 15,
    "name": "To'y Oshi",
    "has_3d": true,
    "glb_url": "/media/ar/glb/plov.glb",
    "usdz_url": "",
    "real_size_cm": 28,
    "scale_m": 0.28,
    "cultural_fact": "O'zbek to'y oshi — azaldan mehmondo'stlik ramzi bo'lib, devzira guruch va dumba yog'ida damlanadi."
  }
  ```

### 4-Bosqich: Universal 3D & AR Viewer Modali (`templates/customer/ar_modal.html`)
- `AR_MENU_LOYIHA` dagi eng kuchli xususiyatlarni birlashtirish:
  - `@google/model-viewer` skripti (WebGL / WebXR stolda joylashtirish).
  - Kamera AR rejimi (`navigator.mediaDevices.getUserMedia`) — agar telefon WebXR ni qo'llab-quvvatlamasa, jonli video fonida taomni ko'rsatish.
  - Ovozli gid (Audio guide) — "🔊 Taom haqida eshitish" tugmasi (brauzer ovozi orqali o'zbekcha gapiradi).
  - 1-bosishda "🛒 Savatga qo'shish" tugmasi va miqdor stepperi (`- 1 +`).

### 5-Bosqich: Mini App (TMA) va Web Menyuga Tugmalarni Ulab Qo'yish
- `/m/<shop_slug>/` (Web menyu)
- `/customer/table/<token>/menu/` (Stol menyusi)
- `/tma/home.html` va `/tma/catalog.html` (Telegram Mini App)
- Har bir taom kartochkasiga **"🥽 3D AR"** nishoni va tugmasi joylashtiriladi. Bosinganda bir soniyada chiroyli 3D darcha ochiladi.

---

## 🧪 4. VERIFIKATSIYA VA TEST REJASI

1. **Fayllar yaxlitligi:**
   - 17 ta `.glb` faylning hammasi `backend/media/ar/glb/` da mavjudligi va hajmi to'liqligi.
2. **Kutubxona mappingi:**
   - `python manage.py test ar3d` orqali taom nomlari (osh, manti, shashlik...) to'g'ri `.glb` ga bog'lanishi tekshiruvi.
3. **API javobi:**
   - `curl http://127.0.0.1:8000/api/v1/ar/<product_id>/` chaqirilib, 200 OK va to'g'ri `glb_url` kelishi tekshiriladi.
4. **Browser & Telegram WebApp tekshiruvi:**
   - Mini Appda va Web brauzerda 3D modelning yuklanishi va xatoliksiz aylanishi.
5. **Butun test to'plami:**
   - `python manage.py test notifications api finance ar3d` barcha testlar 100% OK bo'lishi.

---

> [!IMPORTANT]
> **Reja tasdiqlangach:** Bironta ham eski funksiyaga zarar yetkazmasdan, faqat AR va Menyu qismlari toza integratsiya qilinadi.
