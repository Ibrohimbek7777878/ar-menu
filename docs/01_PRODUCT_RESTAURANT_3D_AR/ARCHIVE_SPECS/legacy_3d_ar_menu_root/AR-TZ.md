# TZ — AR (Augmented Reality) MODULI
### Universal, loyihadan mustaqil texnik topshiriq va tushuntirish

> **Maqsad:** har qanday veb-loyihaga (marketplace, katalog, ko'chmas mulk, ta'lim,
> muzey, e-commerce) "mahsulotni telefon kamerasi orqali real xonada ko'rish"
> imkoniyatini **noldan to'g'ri** qo'shish.
>
> **Bu hujjat nima:** (1) AR qanday ishlashining chuqur tushuntirishi,
> (2) ishlab chiqarishga tayyor arxitektura TZ'si, (3) real qurilmalarda
> topilgan 18 ta tuzoqning registri, (4) boshqa loyihaga ko'chirish yo'riqnomasi.
>
> **Manba:** Bittada Marketplace'dagi ishlaydigan implementatsiya
> (`apps/threed/*` backend, `components/threed/*` frontend) — bu yerda u
> **loyihadan ajratilgan, umumiy** shaklda bayon qilingan. Har bir qoida
> orqasida real qurilmada topilgan real xato bor; "shunday qilsa chiroyli"
> degan taxmin yo'q.
>
> **Versiya:** 2026-08-17 · **Til:** o'zbek · **Kod nomlari:** ingliz

---

# 0. QISQA XULOSA (30 sekundlik o'qish)

AR — "sehr" emas, u **uchta mustaqil narsaning birlashmasi**:

1. **3D fayl** — to'g'ri formatda, to'g'ri o'lchamda, to'g'ri siqilgan (`.glb` + `.usdz`).
2. **Platformaning native AR ilovasi** — iOS'da *Quick Look*, Android'da *Scene Viewer*,
   brauzerda *WebXR*. **Siz kamerani va pol aniqlashni O'ZINGIZ yozmaysiz** — operatsion
   tizim buni sizga tayyor beradi.
3. **Ishonchli zaxira narvoni** — chunki qurilmalarning **sezilarli qismi** haqiqiy
   AR'ni umuman qo'llab-quvvatlamaydi va **buni oldindan aniq bilib bo'lmaydi**.
   (Aniq foizni faqat **o'z auditoriyangizda** o'lchash mumkin — 8-bo'lim.)

Butun murakkablik **3-bandda**. Kod yozishning 20%i AR'ni ochish, 80%i — "AR ochilmaganda
foydalanuvchi bo'sh ekranda qolib ketmasligi".

---

# 1. AR QANDAY ISHLAYDI — TEXNOLOGIK ASOS

## 1.1. Uchta butunlay boshqa texnologiya, bitta "AR" so'zi

Loyihaga AR qo'shishdagi eng katta xato — bu uchtasini aralashtirib yuborish.
Ularning **imkoniyati, narxi va cheklovi tubdan farq qiladi**:

| # | Sinf | Qanday ishlaydi | Pol aniqlanadimi? | Narx | Qo'llab-quvvatlash |
|---|------|-----------------|-------------------|------|--------------------|
| **A** | **SLAM AR** (haqiqiy AR) | Kamera oqimi + IMU (giroskop/akselerometr) → real vaqtda **xona xaritasi** quriladi (Simultaneous Localization And Mapping), gorizontal/vertikal sirtlar topiladi | ✅ **Ha** — obyekt polga "qadaladi", siz yurganda joyida turadi | Bepul (OS beradi) | Faqat **ARCore ro'yxatidagi** Android + **ARKit** iOS |
| **B** | **Marker AR** | Kamera oqimida **ma'lum rasm/QR/yuz** qidiriladi, obyekt shu markerga bog'lanadi (MindAR, AR.js, Vuforia) | ❌ Yo'q — faqat marker ustida | Bepul | Deyarli hamma qurilma |
| **C** | **Sensor-overlay** ("soxta AR") | Kamera oqimi shunchaki fon sifatida ko'rsatiladi, 3D model **ustiga** qo'yiladi, faqat telefon **burilishi** (`DeviceOrientationEvent`) kuzatiladi | ❌ Yo'q — obyekt "havoda suzadi" | Bepul | **Hamma** qurilma |

> **Universal, bepul SLAM veb-texnologiyasi MAVJUD EMAS.** Brauzer ichida haqiqiy pol
> aniqlashni faqat pullik xizmatlar beradi (8th Wall va h.k.). Shu sabab **A sinfi
> uchun OS'ning native ilovasiga topshirish — yagona to'g'ri yo'l**, C sinfi esa
> **zaxira** sifatida o'zimiz yoziladi.

## 1.2. SLAM ichida nima sodir bo'ladi (nega bu og'ir)

Foydalanuvchi "AR" tugmasini bosgandan keyin OS quyidagilarni bajaradi:

```
kamera kadri (30-60 fps)
   ↓ 1. FEATURE DETECTION — kadrdagi "burchak" nuqtalari topiladi (FAST/ORB)
   ↓ 2. TRACKING — keyingi kadrda o'sha nuqtalar qayerga ko'chganini kuzatish
   ↓ 3. IMU FUSION — giroskop/akselerometr ma'lumoti bilan birlashtirish
   ↓      (kamera "adashsa" — qorong'i, tekis oq devor — IMU ushlab turadi)
   ↓ 4. POSE ESTIMATION — telefonning xonadagi 6DoF holati (x,y,z + 3 burchak)
   ↓ 5. PLANE DETECTION — bir tekislikda yotgan nuqtalar to'dasi → "pol"/"devor"
   ↓ 6. HIT TEST — ekrandagi barmoq nuqtasidan nur otiladi → tekislik bilan kesishma
   ↓ 7. ANCHOR — obyekt shu nuqtaga "qadaladi" va xarita yangilanganda tuzatiladi
   ↓ 8. LIGHT ESTIMATION — kadrning yorug'ligi o'lchanib, modelga shu yorug'lik beriladi
   → RENDER: model kamera kadri ustiga, to'g'ri perspektiva/masshtab/soya bilan
```

**Nega buni o'zingiz yozmaysiz:** 1–5 qadamlar apparat darajasida optimizatsiya
qilingan (DSP/NPU), kamera kalibrovkasini (linza buzilishi, fokus masofasi — har
telefon modeli uchun boshqa) talab qiladi va IMU shovqinini filtrlash uchun
Kalman/faktor-graf yechimini talab qiladi. Google/Apple bunga yillar sarflagan.
**Bizning ishimiz — ularga TO'G'RI FAYL berish.**

## 1.3. Nega ARCore "bor/yo'q" muammosi hal qilinmaydi

ARCore — Android'ga **qurilgan emas**, u alohida ilova (`com.google.ar.core`) va
**Google har telefon modelini qo'lda sertifikatlaydi** (kamera kalibrovkasi + IMU
sifati talab darajasida bo'lishi kerak). Arzon/eski telefonlar ro'yxatga
**kirmaydi** va Play Store ARCore'ni o'rnatishga ruxsat bermaydi.

Natija — **AR modulining eng muhim haqiqati:**

> Foydalanuvchi qurilmasi haqiqiy AR'ni qo'llaydimi — **bosishdan oldin aniq bilib
> bo'lmaydi**. Barcha "tekshiruv" API'lari yolg'on gapiradi (2.3-bandga qarang).
> Shu sabab UI **tekshiruvga tayanib tugmani yashirmasligi kerak** — u har doim
> ko'rinadi, tekshiruv esa bosilgandan **keyin** ishlaydi va mos kelmasa **aniq
> xabar + zaxira yo'l** beradi.

---

# 2. PLATFORMA HAQIQATI — kim nimani qanday ochadi

## 2.1. Uchta AR kirish yo'li

| Yo'l | Platforma | Fayl formati | Qanday ochiladi | Sahifadan chiqadimi? |
|------|-----------|--------------|-----------------|----------------------|
| **AR Quick Look** | iOS 12+ / iPadOS (Safari) | **`.usdz`** (majburiy) | Safari `<a rel="ar">` yoki `ios-src` orqali OS'ning ko'ruvchisini ochadi | Ha — OS overlay'i |
| **Scene Viewer** | Android (ARCore bor) | **`.glb`** | `intent://arvr.google.com/scene-viewer/1.0?...` | Ha — alohida Google ilovasi |
| **WebXR** | Chrome/Edge Android, ba'zi shlemlar | **`.glb`** | `navigator.xr.requestSession('immersive-ar')` | Yo'q — sahifa ichida |

**Muhim natija:** iOS uchun **`.usdz` yasash SHART** (glb ishlamaydi), Android uchun
**`.glb`** kerak. Ya'ni **bitta model → ikkita chiqish fayli**. Bu pipeline'ning
mavjud bo'lish sababi (5-bo'lim).

## 2.2. `ar-modes` tartibi — ATAYLAB tanlangan

Agar `<model-viewer>` (yoki shunga o'xshash kutubxona) ishlatilsa, rejimlar tartibi
muhim. **To'g'ri tartib:**

```
ar-modes="scene-viewer webxr quick-look"
```

**Nega `scene-viewer` `webxr`dan OLDIN** (bu ko'p qo'llanmalarda teskari yozilgan):

- `model-viewer` WebXR'dan boshqa rejimga **faqat haqiqiy exception** chiqqanda o'tadi.
- Ko'p Android qurilmasida brauzer "`immersive-ar` qo'llayman" deydi — **lekin real
  hit-test/joylashtirish sifati past**. Bu exception EMAS, shu sabab fallback ishlamaydi.
- Natija: kamera ochiladi, foydalanuvchi modelni **joylashtira olmaydi**, "buzuq"
  taassurot qoladi.
- `scene-viewer` (Google'ning native ilovasi) sirt aniqlash + tap-to-place +
  drag-to-move'ni **har doim** to'g'ri bajaradi.
- iOS'ga bu tartib ta'sir qilmaydi (u faqat `quick-look`ka tushadi).

## 2.3. ⚠️ Qo'llab-quvvatlashni aniqlash — barcha API'lar yolg'on gapiradi

| Tekshiruv | Nimani aslida tekshiradi | Ishonchlimi? |
|-----------|--------------------------|--------------|
| `element.canActivateAR` (model-viewer) | **Faqat User-Agent** satrini: `IS_ANDROID && !IS_FIREFOX && !IS_OCULUS`. **Apparat tekshiruvi YO'Q** (manba kodida tasdiqlangan) | ❌ Yolg'on `true` beradi |
| `navigator.xr.isSessionSupported('immersive-ar')` | WebXR API mavjudligini. Apparatga bog'liq, lekin **ARCore o'rnatilmagan** qurilmada ham `true` bo'lishi kuzatilgan | ⚠️ Qisman |
| UA'da `iPhone/iPad` | Faqat iOS ekanini. Quick Look **ishlaydi**, lekin `.usdz` buzuq bo'lsa jim yiqiladi | ⚠️ Qisman |
| `navigator.xr` mavjudligi | Faqat brauzer API'si borligini | ❌ Ma'nosiz |

### MAJBURIY QOIDA (TZ-2.3)

```
1. AR tugmasi/ikonkasi HAR DOIM ko'rinadi — hech qanday tekshiruvga qarab
   yashirilMAYDI (aks holda AR ishlaydigan qurilmada tugma yo'qolib qoladi).
2. Tekshiruv FAQAT bosilgandan keyin, ishlov beruvchi ICHIDA bajariladi:
      canActivateAR !== false  VA  (Android bo'lsa: webxr === true)
3. Mos kelmasa — jim yiqilMAYDI: aniq matn + "oddiy kamera rejimi" tugmasi.
4. Android uchun QO'SHIMCHA avtomatik tekshiruv: sahifa ochilgandan ~1.5s
   keyin fonda tekshirilib, mos kelmasa ogohlantirish O'ZI chiqadi
   (foydalanuvchi tugmani topib bosishi shart bo'lmasin).
   ⚠️ `isSessionSupported` ASINXRON — effekt shu qiymat yangilanganda QAYTA
   ishga tushishi va eski taymer BEKOR qilinishi shart, aks holda
   false→true bo'lib ulgurgan holatda noto'g'ri "AR yo'q" xabari
   BIR LAHZAGA ko'rinib qoladi.
```

## 2.4. Android'da Scene Viewer'ni to'g'ridan-to'g'ri ochish (nozik joy)

`model-viewer`ning o'z `activateAR()`i Scene Viewer'ni **`mode=3d_preferred`** bilan
ochadi — bu Google'ning **"Object" ekranini** (oq fonli 3D ko'ruvchi) birinchi
ko'rsatadi. Muammolar: (a) fon **oq** va uni boshqaradigan intent parametri **yo'q**
(rasman: `file`, `mode`, `title`, `link`, `resizable`, `sound`,
`enable_vertical_placement` — fon rangi yo'q), ya'ni oq mahsulot ko'rinmay qoladi;
(b) foydalanuvchi bizning UI'mizdan chiqib ketadi.

**Yechim — intent'ni o'zimiz qurish, `mode=ar_only` bilan:**

```js
const abs = url.startsWith('http') ? url : location.origin + url;
const intent =
  'intent://arvr.google.com/scene-viewer/1.0' +
  `?file=${encodeURIComponent(abs)}` +
  '&mode=ar_only' +          // oq "Object" ekrani BUTUNLAY o'tkazib yuboriladi
  '&resizable=false' +       // masshtabni foydalanuvchi buzib yubormasin (mebel!)
  `&title=${encodeURIComponent(title)}` +
  '#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;' +
  `S.browser_fallback_url=${encodeURIComponent(location.href)};end;`;
location.href = intent;
```

- `mode=ar_only` → to'g'ridan-to'g'ri kameraga joylashtirishga o'tadi.
- `browser_fallback_url` → ARCore yo'q bo'lsa foydalanuvchi **shu sahifaga qaytadi**
  (busiz — Play Store'ning "qurilmangiz mos emas" sahifasiga otib yuboriladi va
  foydalanuvchi **yo'qoladi**).
- `file` **absolut URL** bo'lishi SHART (native ilova nisbiy yo'lni bilmaydi).
- Obyektni **aylantirib ko'rish** endi bizning ko'ruvchida, tanlangan fonda qoladi —
  vazifalar bo'linadi: *ko'rish* biznikida, *xonaga qo'yish* Scene Viewer'da.

---

# 3. ARXITEKTURA — 5 QATLAM

```
┌───────────────────────────────────────────────────────────────────┐
│ 1. INGEST      Sotuvchi/admin fayl yuklaydi (.glb/.gltf+bin/.fbx) │
│                yoki DCC plagin (SketchUp / 3ds Max) to'g'ridan    │
└──────────────────────────────┬────────────────────────────────────┘
                               ▼  (asinxron navbat — Celery/BullMQ/Sidekiq)
┌───────────────────────────────────────────────────────────────────┐
│ 2. PIPELINE    validate → geometry sanity → compress → USDZ →     │
│                LOD → poster → auto-background                     │
│                Har qadam holati DB'da (kuzatiladigan, qayta        │
│                ishga tushiriladigan, idempotent)                  │
└──────────────────────────────┬────────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│ 3. STORE       ThreeDAsset: file_url(.glb) + usdz_url +           │
│                poster_url + original_file_url + background_color  │
└──────────────────────────────┬────────────────────────────────────┘
                               ▼  (REST/GraphQL — bitta so'rov)
┌───────────────────────────────────────────────────────────────────┐
│ 4. VIEWER      <model-viewer> (lazy, ssr:false) + custom UI:      │
│                zoom / reset / auto-rotate / AR / fullscreen       │
└──────────────────────────────┬────────────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│ 5. FALLBACK    5 darajali narvon (7-bo'lim) — foydalanuvchi HECH  │
│    NARVONI     QACHON bo'sh ekranda qolmaydi                      │
└───────────────────────────────────────────────────────────────────┘
```

**Loyihadan mustaqillik nuqtalari (ko'chirganda faqat shular o'zgaradi):**

| Qatlam | Almashtiriladigan qism |
|--------|------------------------|
| 1 | Fayl yuklash formasi / plagin — loyihangizning mavjud upload'i |
| 2 | Navbat texnologiyasi (Celery → BullMQ/Sidekiq/Lambda); **qadamlar mantiqi o'zgarmaydi** |
| 3 | ORM/jadval nomi; **maydonlar to'plami o'zgarmaydi** (4-bo'lim) |
| 4 | UI freymvork (React → Vue/Svelte/vanilla); `<model-viewer>` **custom element**, ya'ni hammasida ishlaydi |
| 5 | Matnlar/tillar |

---

# 4. MA'LUMOT MODELI (majburiy minimal to'plam)

Freymvorkdan mustaqil. **Har bir maydon nima uchun kerakligi** ko'rsatilgan —
ortiqchasi yo'q, kamaytirilsa modul buziladi.

| Maydon | Tur | Majburiy | Nima uchun KERAK |
|--------|-----|:--------:|------------------|
| `owner_id` | FK | ✅ | Model qaysi mahsulot/obyektga tegishli |
| `variant_id` | FK, null | ⬜ | Rang/o'lcham varianti uchun ALOHIDA model (bo'sh = umumiy model) |
| `format` | enum `glb\|gltf\|usdz\|obj\|fbx` | ✅ | Yuklash yo'lini tanlash; **siqishdan keyin MAJBURAN `glb`ga yangilanadi** (tuzoq T-14) |
| `file_url` | URL | ✅ | **Ko'ruvchi AYNAN shuni ishlatadi** — siqilgan versiya shu yerga yoziladi |
| `original_file_url` | URL | ✅ | Siqishdan oldingi asl fayl — **darhol orqaga qaytarish** uchun (AR buzilsa) |
| `optimized_url` | URL | ⬜ | Audit/diagnostika (siqish natijasi ko'rinib turishi uchun) |
| `usdz_url` | URL | ✅ | **iOS Quick Look** — bunsiz iPhone'da AR YO'Q |
| `poster_url` | URL | ✅ | Model yuklanmaguncha ko'rsatiladigan rasm (LCP/Core Web Vitals) |
| `thumbnail_url` | URL | ⬜ | Ro'yxat/kartochka uchun kichik rasm |
| `file_size` | int (bayt) | ✅ | Mobil internetda ogohlantirish + budjet nazorati (10-bo'lim) |
| `polygon_count` | int | ✅ | Sifat/ishlash nazorati, past quvvatli qurilmani ogohlantirish |
| `conversion_status` | enum `pending\|converting\|ready\|failed` | ✅ | UI "tayyorlanmoqda" holatini ko'rsatadi |
| `error_message` | text | ✅ | **Sotuvchiga ANIQ nima buzilganini** aytish (10-bo'lim, T-05/T-06) |
| `is_validated` | bool | ✅ | Tekshiruvdan o'tmagan model AR'ga chiqmaydi |
| `background_color` | hex(7) | ✅ | Oq mebel oq fonda ko'rinmaydi — modelga **bog'langan** fon |
| `background_auto` | bool | ✅ | Foydalanuvchi qo'lda tanlagan bo'lsa avtomatika **ustidan yozmaydi** |
| `lod_urls` | JSON list | ⬜ | Kelajakda tarmoq tezligiga qarab tanlash |

**Pipeline vazifasi jadvali (`PipelineJob`)** — alohida bo'lishi shart:
`asset_id`, `status` (queued → validating → compressing → converting →
generating_lod → completed/failed), `error_message`, `started_at`, `finished_at`,
`attempt`. **Sabab:** konvertatsiya daqiqalar davom etadi va HTTP so'rovi ichida
bajarilishi mumkin emas; holat kuzatiladigan va **idempotent** (qayta yurgizishga
chidamli) bo'lishi kerak.

---

# 5. PIPELINE TZ — QADAM-QADAM

Asinxron ishchi (worker) ichida bajariladi. **Har qadam alohida, oldingi qadamning
chiqishi keyingisining kirishi EMAS** — bu 5.4-bandda tushuntirilgan sabab bilan.

## 5.0. Qadam 0 — manba faylni topish (ko'pincha o'tkazib yuboriladigan xato)

```
1) AVVAL lokal disk nusxasi qidiriladi (URL → MEDIA_ROOT yo'liga o'girish)
2) Faqat topilmasa — HTTP orqali yuklab olinadi (ANIQ timeout bilan!)
```

**Nega bu MUHIM:** ko'p-faylли `.gltf` (JSON + tashqi `scene.bin` + teksturalar —
Sketchfab/Blender eksportlarining aksariyati shunday) **HTTP orqali qayta
yuklanganda faqat asosiy JSON keladi, hamroh fayllar YO'QOLADI**. Natijada
konverterlar `"Header does not appear to be valid glb format"` bilan **jim**
yiqiladi — foydalanuvchi hech qanday xato ko'rmaydi, siqish/USDZ shunchaki
hech qachon ishlamaydi. Lokal yo'l ishlatilganda hamroh fayllar joyida turadi.

> `urlretrieve` da timeout parametri **yo'q** — `urlopen(url, timeout=N)` ishlatiladi,
> aks holda o'lik domen ishchini osib qo'yadi.

## 5.1. Qadam 1 — glTF validatsiyasi

`gltf-validator` (Khronos rasmiy) → `numErrors > 0` bo'lsa **rad etiladi**.

Vosita o'rnatilmagan bo'lsa — **o'tkazib yuborish (fail-open)**, chunki modul
o'rnatilmagan vosita sabab butunlay ishdan chiqmasligi kerak. Lekin log'ga
ogohlantirish yoziladi.

## 5.2. Qadam 2 — GEOMETRIYA SOG'LIGI (bu qadam hech qaysi qo'llanmada yo'q)

Bu **eng qimmatli** qadam: DCC dasturlaridan (3ds Max, SketchUp, Blender) kelgan
fayl glTF standartiga **to'liq mos** bo'lishi mumkin, lekin AR'da **buzuq**
ko'rinishi mumkin. Validator bunday xatolarni **ushlamaydi**.

### 5.2.1. Masshtab-outlier tekshiruvi

**Muammo (real):** 34MB 3ds Max eksportida 4 ta node qolganlardan **~96–100 marta**
katta masshtabda edi (turli qism-yig'ma turli birlik-tizimida — mm/sm/m —
modellashtirilgan, eksport ularni to'g'ri birlashtirmagan). AR sessiyasida bu
detallar **ingichka uzun "nayza"** va **buzuq "panjara"** bo'lib ko'rinib, butun
sahnani buzgan.

**Algoritm:**
```
har bir MESH-node uchun:
    linear = node.matrix[:3,:3]  (yoki diag(node.scale), yoki I)
    singular = SVD(linear)            ← AYLANISHNI masshtabdan ajratadi
    magnitude = mean(singular)
median = median(barcha magnitude)
outlier ⟺ magnitude/median > 15  YOKI  < 1/15
```
**Nega SVD, nega diagonal emas:** aylantirilgan-va-masshtablangan node'da
diagonal qiymatlar aylanish bilan "aralashib" ketadi va noto'g'ri natija beradi.
Singular qiymatlar — sof masshtab kattaligi.

**Nega chegara aynan 15x:** 5x juda ko'p **zararsiz** modelni rad etardi (sm↔mm
konversiyasi = 10x — bu tarqalgan va zararsiz). 15x real buzuq assetdagi
65x/96x/100x guruhlarni aniq ajratadi, 10x'ni esa o'tkazadi.

### 5.2.2. Pozitsiya-outlier tekshiruvi ("birodar" bug)

**Muammo (real, 2 mahsulotda):** masshtab **to'g'ri**, lekin bir-ikki mesh-node
asosiy korpusdan **232 birlik** uzoqqa eksport qilingan. Natija: ko'ruvchining
**avtomatik kamerasi** butun sahnani (uzoqdagi kichik detal bilan birga) qamrab
olish uchun shunchalik uzoqlashib ketdiki, asosiy mebel **ko'rinmas nuqtaga**
aylandi — foydalanuvchi **bo'sh ekran** ko'rdi.

**Algoritm:**
```
har bir mesh-node uchun:
    accessor.min/max → 8 burchak → node'ning TO'LIQ transform-zanjiri
    → dunyo koordinatasidagi markaz
median markaz hisoblanadi
outlier ⟺ markazdan masofa / (boshqa node'lar o'lchami) > 15
          VA absolyut masofa > 1.0        ← kichik modellarda soxta signalni oldi oladi
```

### 5.2.3. Rad etish xabari — MAJBURIY format

Sotuvchiga "xato yuz berdi" **yozilMAYDI**. Xabar 3 qismdan iborat bo'lishi shart:

```
1. QAYSI obyektlar:  "Cube.008 (masshtab 98.4, medianadan 96x farq); Plane.009 (...)"
2. NEGA:             "Sabab odatda turli qism turlicha birlik-tizimida (mm/sm/m)
                      modellashtirilib, eksportda birlashtirilmagani."
3. NIMA QILISH:      "Shu obyektlarning masshtabini tekshirib, qayta eksport qiling."
```
Bu — modul **o'zi-o'zini qo'llab-quvvatlashini** ta'minlaydi: sotuvchi support'ga
murojaat qilmasdan muammoni o'zi tuzatadi.

## 5.3. Qadam 3 — GEOMETRIYA SIQISH

**Vosita: `gltfpack` (meshoptimizer).** Draco (`gltf-pipeline`) — zaxira, odatda
serverda o'rnatilmagan.

```bash
gltfpack -i input.glb -o output.glb -cc
```

**FAQAT `-cc` (mesh/geometriya siqish). Natija: real assetlarda 34MB → 5.1MB (~7x),
sifat sezilarli yo'qotilmaydi** (meshopt kvantlashi vizual jihatdan zararsiz).

### ⚠️ Tekstura-siqish flag'lari (`-tc`/`-tu`/`-tw`/`-tq`/`-tl`) QO'SHILMAYDI

`gltfpack`ning **npm/Node build'i WebP/KTX2 tekstura siqishni qo'llamaydi**
(vositasining o'zi shunday deydi: *"node.js builds do not support WebP..."*).
Xato **butun buyruqni** yiqitadi, faqat teksturani emas — ya'ni **hech qanday siqish
bo'lmaydi** va bu **jim** sodir bo'ladi. Native `gltfpack` binary o'rnatilganda
qo'shish mumkin.

### ⚠️ Siqilgan fayl `file_url`GA yozilishi SHART

**Real, uzoq yashagan xato:** 13/13 asset muvaffaqiyatli siqilgan, natija
`optimized_url`da **saqlangan** — lekin `file_url` (ko'ruvchi **aynan shuni**
ishlatadi) hech qachon yangilanmagan. Butun siqish pipeline'i qurilgan-u,
**saytda hech qachon ishlatilmagan**.

```
muvaffaqiyatli siqilsa:
    original_file_url = file_url      (asl saqlanadi)
    file_url          = siqilgan URL   ← KO'RUVCHI SHUNI OLADI
    optimized_url     = siqilgan URL   (audit uchun)
    format            = 'glb'          ← MAJBURIY (tuzoq T-14)
    file_size         = yangi hajm
```

## 5.4. Qadam 4 — USDZ konvertatsiyasi (iOS AR uchun HAYOTIY)

### 5.4.1. ⚠️ USDZ **SIQISHDAN OLDINGI** manbadan yasaladi

Bu — **eng nozik arxitektura qarori**. Sabab: USDZ konverteri glTF akkessorlarini
**qo'lda** (standart, siqilmagan `float32` buferlar kutib) o'qiydi va
`gltfpack -cc`ning **meshopt-kvantlangan** chiqishini o'qiy **olmaydi**
(`struct.unpack requires a buffer of 4 bytes` bilan yiqiladi).

```
validated_source  ──┬──► gltfpack -cc ──► optimized.glb ──► file_url  (veb ko'ruvchi)
                    └──► usdz_convert ──► model.usdz    ──► usdz_url  (iOS AR)
```
Ikkala chiqish **mustaqil**, bir-biriga xalaqit bermaydi. (Bu bug uzoq vaqt
**ko'rinmagan** edi, chunki tekstura-flag'lari sabab siqish har doim
muvaffaqiyatsiz bo'lib, USDZ tasodifan doim siqilmagan kirish bilan ishlagan.)

### 5.4.2. Nima bilan konvertatsiya qilinadi

**Tayyor CLI vositasi MAVJUD EMAS** — `gltf-to-usdz` degan haqiqiy paket npm/pip/apt'da
yo'q; Google'ning `usd_from_gltf`i C++/CMake qurishni talab qiladi (serverga og'ir).

**Ishlaydigan yechim:** Pixar'ning rasmiy **`usd-core`** (pip, ~28MB wheel,
**CMake shart emas**) + `pygltflib`. Konvertatsiya o'zimiz yozamiz — bu ~400 satr,
lekin **to'liq nazorat** beradi.

### 5.4.3. glTF → USD moslik jadvali

| glTF | USD | Holat |
|------|-----|-------|
| POSITION / NORMAL / indices | `UsdGeom.Mesh` points/normals/faceVertexIndices | ✅ To'g'ridan-to'g'ri (ikkalasi Y-up, uchburchak asosli) |
| PBR metallic-roughness | `UsdPreviewSurface` | ✅ **Bir xil model** — tarjima emas, moslik |
| `baseColorTexture` | `UsdUVTexture` → `diffuseColor`, `sourceColorSpace=sRGB` | ✅ |
| `metallicRoughnessTexture` | **BITTA** `UsdUVTexture` ikki marta: `outputs:g`→roughness, `outputs:b`→metallic, `sourceColorSpace=raw` | ✅ Rasm **ikki marta nusxalanmaydi** |
| `normalTexture` | `UsdUVTexture` + `bias=(-1,-1,-1,0)`, `scale=(2,2,2,1)` | ✅ (tangent-space dekodlash) |
| `emissiveFactor` | `emissiveColor` | ✅ |
| `alphaMode BLEND/MASK` | `opacity` | ✅ |
| Occlusion (AO) | — | ⚠️ `UsdPreviewSurface`da kirish yo'q, **ataylab tashlanadi** |
| Sparse accessor | — | ❌ Qo'llanmaydi (amalda uchramaydi) |
| `mode != 4` (LINES/POINTS) | — | ⚠️ **Faqat o'sha primitiv** tashlanadi, asset yiqilmaydi |

### 5.4.4. Konvertatsiyaning 5 ta majburiy nozikligi

```
1. UV V-KANALI TESKARILANADI:  st = (u, 1.0 - v)
   glTF: (0,0)=chap-YUQORI ·  USD: (0,0)=chap-PAST
   Busiz — barcha teksturalar teskari, "nima uchun" tushunarsiz holda.

2. NODE YO'LIGA INDEKS MAJBURAN QO'SHILADI:  /Model/n{index}_{name}
   Sabab (real bug): Blender/Sketchfab eksportida 8 node'dan 4 tasi AYNAN bir xil
   nomga ega ("Mesh_0_Material.001_0"). Faqat nom bilan yo'l qurilsa — ikkinchi
   `Xform.Define` O'SHA prim'ni qaytaradi va `AddTransformOp()` ikkinchi marta
   "xformOp already exists" xatosi bilan yiqiladi.

3. NOM TOZALANADI: harf/raqam/`_` dan boshqa hamma narsa `_`ga; raqam bilan
   boshlansa oldiga `n_` qo'shiladi (USD prim nomi identifikator qoidasiga bo'ysunadi).

4. BUFERLAR BITTA SHAKLGA KELTIRILADI:  gltf.convert_buffers(BINARYBLOB)
   Ko'p-faylли `.gltf` uchun `binary_blob()` DOIM `None` qaytaradi (ma'lumot tashqi
   `.bin`da). `.glb` uchun bu chaqiruv xavfsiz no-op.

5. QADOQLASH — FAQAT rasmiy `UsdUtils.CreateNewUsdzPackage`:
   Apple USDZ zip'ining QAT'IY talabi bor — siqilmagan (STORED) + har fayl
   64-bayt chegarasida tekislangan. Qo'lda zip yig'ish = xato xavfi.
   Sahna metadata'si: SetStageUpAxis(Y), metersPerUnit=1.0, DefaultPrim=/Model.
```

### 5.4.5. Xatolik siyosati

USDZ konvertatsiyasi muvaffaqiyatsiz bo'lsa — **`usdz_url` bo'sh qoladi, pipeline
DAVOM etadi**. Foydalanuvchiga **hech qanday xato ko'rsatilmaydi** (faqat log):
Android'da AR baribir ishlaydi, iOS'da esa zaxira narvoni (7-bo'lim) ishlaydi.
Bitta platformaning muammosi butun modulni yiqitmasligi kerak.

## 5.5. Qadam 5 — LOD (ixtiyoriy, lekin arzon)

```bash
gltfpack -i in.glb -o lod_high.glb -si 1.0
gltfpack -i in.glb -o lod_mid.glb  -si 0.5
gltfpack -i in.glb -o lod_low.glb  -si 0.25
```
Kelajakda `navigator.connection.effectiveType` yoki qurilma quvvatiga qarab tanlash
uchun. Har biri alohida yuklanadi, muvaffaqiyatsiz bo'lsa asl fayl ishlatiladi.

## 5.6. Qadam 6 — Poster (LCP uchun majburiy)

3D model yuklanishi sekundlarni oladi. Poster bo'lmasa — bo'sh quti, yomon LCP.
Poster **headless Chromium** orqali renderlanadi (11.3-bandda flag'lar).

## 5.7. Qadam 7 — FON RANGINI AVTOMATIK TANLASH

**Muammo:** oq/och rangli mahsulot (mebel, sanitariya, qog'oz) oq yoki och-kulrang
fonda **ko'rinmay qoladi**. Qattiq yozilgan bitta fon — hamma model uchun to'g'ri emas.

```
1. Modelning O'RTACHA rangi hisoblanadi (material baseColor'lar / tekstura o'rtachasi)
2. Relative luminance (WCAG formulasi) topiladi
3. Palitradan KONTRASTLI fon tanlanadi
4. `background_color`ga YOZILADI (bir marta, pipeline'da)
```

**Majburiy qoidalar:**
- Hisob **faqat pipeline'da, bir marta** — frontendda har ochilishda emas (CPU).
- Foydalanuvchi qo'lda tanlagan bo'lsa `background_auto=False` → **avtomatika
  keyin hech qachon ustidan yozmaydi**.
- Palitra **faqat backendda** — frontendda nusxasi bo'lmaydi, javob bilan keladi.
- Fon **temadan mustaqil**: dark mode'da ham **aynan shu** rang. Aks holda tanlangan
  kontrast qorong'i temada yo'qoladi.

**WCAG relative luminance** (matn/belgi rangini tanlash uchun ham kerak):
```js
const lin = c => (c <= 0.03928 ? c/12.92 : ((c + 0.055)/1.055) ** 2.4);
const L = 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
const isDark = L < 0.4;   // ustidagi matn oq bo'lsin
```

## 5.8. Fayl saqlash — jim yiqilishning oldini olish

**Real bug:** S3 sozlanmagan holatda yuklash funksiyasi baribir
`https://cdn.example.com/...` URL'ini **qaytarardi**, fayl esa **hech qayerga
saqlanmasdi**. `optimized_url`/`lod_urls` uchun bu ko'rinmasdi (frontend ularni
ishlatmaydi), lekin **`usdz_url` uchun bu ko'rinadigan buzuqlik** edi — iPhone
mavjud bo'lmagan URL'ga murojaat qilib, hech narsa yuklamasdi (konvertatsiyaning
o'zi to'g'ri ishlagan bo'lsa ham).

```
QOIDA: URL faqat fayl HAQIQATAN saqlangandan keyin qaytariladi.
S3 yo'q bo'lsa → lokal media papkaga nusxalash + haqiqiy public URL.
"Umid qilingan" URL hech qachon qaytarilmaydi.
```

---

# 6. FRONTEND TZ — KO'RUVCHI

## 6.1. Kutubxona tanlovi

**`<google/model-viewer>`** — standart tanlov. Sabablari: (a) uchala AR yo'lini
(Quick Look / Scene Viewer / WebXR) **bittada** beradi; (b) **custom element**, ya'ni
React/Vue/Svelte/vanilla — hammasida ishlaydi; (c) three.js ustida qurilgan, lekin
three.js'ni o'zingiz boshqarishingiz shart emas.

Alternativa faqat **maxsus render** kerak bo'lganda (o'z shader'lari, murakkab sahna) —
o'shanda three.js + WebXR qo'lda, lekin **AR narvoni baribir shu hujjatdagidek** bo'ladi.

## 6.2. Yuklash strategiyasi (MAJBURIY)

```
1. `ssr: false` bilan DINAMIK import — model-viewer import PAYTIDA brauzer
   global'larini (navigator, window) ishlatadi; SSR/build'da yiqiladi.
2. Yuklanayotganda skeleton ko'rsatiladi.
3. WebGL qo'llab-quvvatlashi OLDIN tekshiriladi (`canvas.getContext('webgl2'||'webgl')`)
   — yo'q bo'lsa ko'ruvchi UMUMAN yuklanmaydi (og'ir bundle bekorga tushmasin),
   darhol fallback ko'rsatiladi.
4. BIR VAQTDA IKKI KO'RUVCHI OCHILMASLIGI kafolatlanadi (past quvvatli telefonda
   ikkita WebGL konteksti = muzlash). Muvofiqlashtirish uchun oddiy holat/Context
   ishlatiladi.
```

## 6.3. Atributlar — har birining sababi bilan

```html
<model-viewer
  src="model.glb"                    <!-- Android/WebXR/veb -->
  ios-src="model.usdz"               <!-- iOS Quick Look (BUNSIZ iOS'da AR YO'Q) -->
  poster="poster.webp"               <!-- LCP -->
  alt="3D model: <nom>"              <!-- a11y -->

  ar                                 <!-- ⚠️ XOM BOOLEAN, tuzoq T-01 -->
  ar-modes="scene-viewer webxr quick-look"   <!-- tartib MUHIM, 2.2-band -->
  ar-scale="auto"

  camera-controls                    <!-- ⚠️ shartli, 6.4-band -->
  touch-action="pan-y"               <!-- sahifa scroll'i o'g'irlanmasin -->
  auto-rotate auto-rotate-delay="3000" rotation-per-second="30deg"

  shadow-intensity="1" exposure="1" environment-image="neutral"

  min-camera-orbit="auto auto 40%"   <!-- ⚠️ zoom slayderi bilan AYNAN bir xil -->
  max-camera-orbit="auto auto 160%"  <!--    oraliq bo'lishi SHART, tuzoq T-04 -->
  loading="eager"

  style="--poster-color: <fon>; --ar-button-display: none;"
/>
```

**`--ar-button-display: none` — MAJBURIY.** `<model-viewer ar>` **har doim** o'zining
ichki standart AR tugmasini render qiladi, bizning custom tugmalarimizga **aloqasiz**.
Yashirilmasa — foydalanuvchi bizga **nazoratsiz** tugmani bosib, xato oqimga tushadi.

**`--poster-color`** — model yuklanguncha model-viewer poster ostini **o'zining oq foni**
bilan bo'yaydi; tanlangan fon bir lahzaga "oq"ga **sakraydi**. Element `background`i esa
`transparent` bo'ladi — rang tashqi qutidan ko'rinadi.

## 6.4. `camera-controls` — sahifa scroll'i bilan ziddiyat

Sahifani scroll qilayotganda barmoq 3D ustidan o'tsa, `camera-controls` touch/wheel'ni
**o'ziga oladi** va sahifa scroll'i "tiqilib qolgandek" bo'ladi.

```
Sahifa ICHIDAGI ko'ruvchi:  camera-controls O'CHIRILGAN → bitta bosishdan keyin YOQILADI
                            (ustida "Aylantirish uchun bosing" overlay'i)
To'liq-ekran rejim:         boshidanoq YOQILGAN (sahifa scroll'i yo'q, ziddiyat yo'q)
```

## 6.5. Yuklash holati — 3 hodisa, 1 taymer

| Hodisa | Nima beradi | Ishlatilishi |
|--------|-------------|--------------|
| `progress` | `detail.totalProgress` 0..1 | **Faqat foizni ko'rsatish** |
| `load` | Model haqiqatan tayyor | **Faqat shu** overlay'ni yashiradi |
| `error` | Yuklash muvaffaqiyatsiz | Xato UI + "Qayta urinish" |

### ⚠️ "100%da abadiy osilib qolish" — real bug va uning yechimi

`progress` bir nechta parallel faoliyat (model + environment map + teksturalar)
ustidan **o'rtacha** hisoblanadi va **ular tugamagan holda ham 100%ga yaqinlashadi**.
Agar `load` ham, `error` ham kelmasa (masalan brauzer fonga o'tib so'rov to'xtasa) —
overlay **abadiy "100%"da osilib qoladi va chiqish yo'li yo'q**.

```
YECHIM (uchtasi birga):
1. Overlay FAQAT `load` bilan yashiriladi (progress bilan EMAS).
2. `error` hodisasi TINGLANADI (ko'p implementatsiyada bu umuman yo'q).
3. 25 SEKUND ichida `load` kelmasa — bu ham "xato" deb qabul qilinadi.
Ikkala xato holatida ham: aniq xabar + "Qayta urinish" (element `key`ini
oshirib TO'LIQ qayta yaratadi — shunchaki `src`ni qayta o'rnatish yetarli emas).
```

## 6.6. Zoom — foiz sintaksisi, metr emas

```js
// TO'G'RI: model-viewer'ning O'ZINING foiz sintaksisi
el.cameraOrbit = `auto auto ${40 + (160-40)*percent/100}%`;
```
`min-camera-orbit`/`max-camera-orbit` **aynan shu 40%–160%** oraliqqa o'rnatilgan
bo'lishi SHART. Aks holda model-viewer'ning o'z standart (torroq) chegarasi qiymatni
**qisib** qo'yadi (real bug: 100%dagi radius 50%dagi bilan **aynan bir xil** chiqdi).
Radiusni metrda o'qib hisoblash — **noto'g'ri yo'l**.

## 6.7. AR kirish nuqtasi — UI qarori

```
AR ikonkasi:      pastdagi ikonka klasterida, boshqa boshqaruvlar bilan birga.
                  HAR DOIM ko'rinadi (TZ-2.3).
"Kamerada ko'ring (oddiy)":  kichik matn-havola, MOBILDA HAR DOIM ko'rinadi —
                  ARCore/Quick Look yo'q qurilmalar uchun ochiq zaxira.
Desktopda:        QR kod (6.8-band) — desktopda AR printsipial mumkin emas.
```

## 6.8. QR ko'prigi — desktopdan telefonga

Desktopda AR **mumkin emas** (kamera/SLAM yo'q). Yechim: sahifada QR kod →
`{productUrl}?ar=1`. Telefonda ochilganda **oddiy mahsulot sahifasi o'rniga
to'g'ridan-to'g'ri to'liq-ekran AR taklifi** ko'rsatiladi.

### ⚠️ "Nol bosishli AR" TEXNIK JIHATDAN MUMKIN EMAS

Brauzer kamera/AR sessiyasini **faqat haqiqiy foydalanuvchi ishorasi (user gesture)
ichida** ochishga ruxsat beradi. Sahifa o'zi avtomatik kamerani ochib **yubora
olmaydi** — bu xavfsizlik cheklovi, o'zgartirib bo'lmaydi.

**Erishish mumkin bo'lgan eng yaqin variant:** savat/tavsif/boshqa hech narsani
ko'rsatmasdan, **darhol** to'liq-ekran 3D/AR taklifi ochiladi — AR tugmasi
ekrandagi **birinchi va yagona diqqat markazi** bo'ladi, aynan **o'sha bitta bosish**
kamerani ochadi.

**Muvofiqlashtirish nozikligi:** to'liq-ekran taklif va sahifa ichidagi 3D bo'lim
**ikkalasi ham** `?ar=1` da "faolman" deb o'ylab, **ikkita WebGL kontekstini**
ochib yuborishi mumkin. Muvofiqlashtirish uchun **URL ishlatilMAYDI** (faqat
so'rov-satri o'zgaradigan `router.replace` ba'zi freymvork versiyalarida manzil
satrini yangilamaydi — real sinovda tasdiqlangan) — oddiy **umumiy holat/Context**
ishlatiladi.

---

# 7. FALLBACK NARVONI — MODULNING YURAGI

> Bu bo'lim **eng muhim**. AR'ni ochish 20% ish; qolgan 80% — **ochilmaganda nima
> bo'lishi**. Har daraja **o'zidan pastdagisiga** tushadi, foydalanuvchi hech qachon
> bo'sh ekranda qolmaydi.

| Daraja | Nima | Qachon | Pol aniqlanadimi |
|:------:|------|--------|:----------------:|
| **1** | **Native SLAM AR** — Quick Look (iOS) / Scene Viewer (Android) | ARKit yoki ARCore bor | ✅ |
| **2** | **WebXR** sahifa ichida | Chrome Android + WebXR + ARCore | ✅ |
| **3** | **Sensor-overlay** ("oddiy kamera rejimi") | Kamera bor, ARCore yo'q | ❌ |
| **4** | **Oddiy 3D ko'ruvchi** (WebGL, aylantirish/zoom) | WebGL bor, kamera yo'q/rad etilgan | — |
| **5** | **Poster/rasmlar** + tushuntirish | WebGL yo'q yoki model yo'q | — |

## 7.1. 3-daraja: sensor-overlay TZ'si (o'zimiz yozadigan qism)

```
1. KAMERA:  getUserMedia({ video: { facingMode: 'environment' }, audio: false })
            → <video autoplay playsinline muted> to'liq ekranda, object-fit: cover
            ⚠️ `playsinline` BUSIZ iOS videoni to'liq ekranga o'zi olib qo'yadi.
            ⚠️ Tozalashda stream.getTracks().forEach(t => t.stop()) —
               aks holda kamera indikatori yonib qoladi.

2. MODEL:   <model-viewer> video USTIDA, shaffof fon bilan,
            camera-controls YOQILGAN (1 barmoq aylantirish + pinch zoom BEPUL keladi).
            ⚠️ Model qutisi KENG bo'lishi kerak (~94vw × 76vh). Kichik qilinsa
               (55vw kvadrat) — aylantirishda model "kesilgandek" siqiladi.

3. SENSOR:  DeviceOrientationEvent → model SOBIT joyi USTIGA siljish qo'shiladi
            → model ekranga emas, XONAGA "osilgandek" ko'rinadi.

            Birinchi hodisa REFERENS deb olinadi (mutlaq burchak emas, DELTA).
            Burchak 0-360° aylanadi — oddiy ayirish 359°→2° ni "-357°" deb
            hisoblaydi. Aylanib o'tishni hisobga oluvchi yordamchi SHART:

                delta = (to - from) % 360
                if (delta >  180) delta -= 360
                if (delta < -180) delta += 360

            Siljish CHEGARALANADI (±12%) — model ekrandan uchib ketmasin.
            Sezgirlik: ~0.9%/gradus (alpha), ~0.7%/gradus (beta).

4. iOS RUXSATI: iOS 13+ da DeviceOrientationEvent.requestPermission() —
            FAQAT foydalanuvchi ishorasi ICHIDA chaqirilishi SHART, aks holda
            brauzer JIM rad etadi. Shu sabab bu rejim ALBATTA tugma bosilgach
            ochiladi. Rad etilsa — jim o'tkazib yuboriladi, model sobit joyida qoladi.

5. HALOLLIK: ekranda ochiq yozuv — "Oddiy rejim — pol avtomatik aniqlanmaydi,
            o'zingiz moslang". Foydalanuvchini chalg'itmaslik SHART.
            Ma'lum cheklov: BURILISH kuzatiladi, YURISH kuzatilmaydi —
            yurib ketsangiz model siz bilan "suzib" ketadi (SLAM'siz tizim
            translyatsiyani o'lchay olmaydi).

6. Z-INDEX: bu to'liq-ekran, "kamerani egallaydigan" tajriba — cookie-banner,
            chat vidjeti va h.k.dan BALAND bo'lishi SHART (aks holda banner
            kamera ustida chiqib qoladi — real skrinshot bilan tasdiqlangan).
```

### ⚠️ Bu qismda qilingan real xato (takrorlamang)

Avtomatik aylanish o'chirilganda **qo'lda aylantirish ham ishlamay qoldi** — chunki
u xato ravishda "1 barmoq bilan **ekrandagi joyni** surish" (pointer-tracking) bilan
almashtirilgan edi, "**modelning o'zini** aylantirish" bilan emas. **Yechim:** custom
pointer-kod **butunlay** olib tashlanib, `model-viewer`ning tayyor `camera-controls`i
yoqildi. Sensor-siljish esa modelning **sobit joyi ustiga** qo'shiladi — ikkisi
bir-biriga xalaqit bermaydi.

## 7.2. 5-daraja: fallback xabarlari

Har sabab uchun **alohida, aniq** matn (umumiy "xato" — taqiqlanadi):

| Sabab | Sarlavha | Tushuntirish |
|-------|----------|--------------|
| `no-webgl` | 3D ko'rinish mavjud emas | Brauzeringiz WebGL'ni qo'llamaydi. Chrome/Firefox'da urinib ko'ring |
| `no-model` | Bu mahsulot uchun 3D model hali yo'q | Sotuvchi tez orada qo'shadi |
| `failed` | 3D yuklab bo'lmadi | Internet yoki fayl muammosi. Birozdan so'ng qayta urining |
| `mobile-data-saver` | Mobil internet — 3D yuklamadik | 3D fayllar katta. Wi-Fi'da urinib ko'ring |
| `ar-unsupported` | Bu qurilmada haqiqiy AR (ARCore) qo'llanmaydi | **Bu qurilma cheklovi, ilova xatosi emas** — arzon/eski telefonlarda Google buni cheklaydi. Oddiy kamera rejimida ko'rishingiz mumkin |

**Har fallback'da "Rasmlarni ko'rish" chiqish yo'li bo'lishi shart** — foydalanuvchi
tupikda qolmaydi.

---

# 8. TELEMETRIYA — nima o'lchanadi

AR'siz o'lchov = AR'ni yaxshilash imkonsiz. **Minimal sxema:**

```
AR_SESSION:
  asset_id, user_id (null bo'lishi mumkin — mehmon HAM yoziladi),
  platform: ios | android | web | fallback_camera,
  device_info: { ua, screen, webxr_supported, can_activate_ar },
  duration_seconds, finished_at,
  outcome: opened | failed_unsupported | permission_denied | user_cancelled
```

**Endpointlar:** `POST /ar/track/` (sessiya boshlanishi, `AllowAny`) va
`POST /ar/finish/` (davomiylik bilan yakunlash).

**Nega `AllowAny`:** AR'ni ko'pincha **ro'yxatdan o'tmagan** foydalanuvchi ochadi
(QR orqali kelgan mehmon) — auth talab qilinsa eng qimmatli ma'lumot yo'qoladi.

**Nega bu MUHIM:** `failed_unsupported` foizi — **auditoriyangizning qancha qismida
AR ishlamasligining yagona haqiqiy o'lchovi**. Bu raqamsiz "3-darajali zaxiraga
qancha kuch sarflash kerak" savoliga javob yo'q.

> ⚠️ **Bittada'dagi joriy holat:** backend endpointlari **bor**, frontend ularni
> **chaqirmaydi** → hech qanday AR statistikasi yo'q. Ko'chirishda **bu ulanishni
> darhol qiling** (3 satr kod, qiymati katta).

---

# 9. XAVFSIZLIK VA RUXSATLAR

| Talab | Sabab / natija |
|-------|----------------|
| **HTTPS majburiy** | `getUserMedia`, WebXR, `DeviceOrientationEvent` — hammasi secure context talab qiladi. HTTP'da AR **umuman** ishlamaydi (`localhost` istisno) |
| **User gesture** | Kamera/AR faqat foydalanuvchi bosishi ichida ochiladi (6.8-band) |
| **iOS sensor ruxsati** | `DeviceOrientationEvent.requestPermission()` — faqat gesture ichida |
| **Kamera xatolari alohida** | `NotAllowedError` → "brauzer sozlamalaridan ruxsat bering"; `NotFoundError` → "kamera topilmadi"; boshqa → xabar bilan. Umumiy "xato" **taqiqlanadi** |
| **Stream to'xtatiladi** | Komponent yopilganda `track.stop()` — kamera indikatori yonib qolmasin |
| **CSP** | `model-viewer` WASM ishlatadi → `script-src 'wasm-unsafe-eval'`; model/tekstura/dekoder domenlari `connect-src`/`img-src`da |
| **Model URL'lari** | Foydalanuvchi yuklagan fayl **to'g'ridan-to'g'ri** ko'ruvchiga berilmaydi — pipeline validatsiyasidan o'tgan chiqish beriladi |
| **Intent URL** | `browser_fallback_url` **har doim** o'z domeningizga; `file` — faqat ishonchli host |

---

# 10. ISHLASH BUDJETI (majburiy chegaralar)

| Ko'rsatkich | Maqsad | Qattiq chegara | Nima uchun |
|-------------|--------|----------------|------------|
| `.glb` hajmi | ≤ 3 MB | 8 MB | 4G'da 8MB ≈ 8-15s; undan keyin foydalanuvchi ketadi |
| `.usdz` hajmi | ≤ 5 MB | 15 MB | Quick Look katta faylda jim yiqiladi |
| Poligon | ≤ 150k | 500k | O'rta telefonda 500k+ = fps qulashi/muzlash |
| Tekstura | 2048² | 4096² | Mobil GPU xotirasi |
| Materiallar | ≤ 10 | 25 | Har material = alohida draw call |
| Poster | ≤ 80 KB | 150 KB | LCP elementi |

**Tarmoq/so'rov qoidalari:**
- 3D asset ma'lumoti **bitta** so'rov bilan keladi (`file_url` + `usdz_url` +
  `poster_url` + `background_color` + palitra **birga**). Har qism uchun alohida
  so'rov = N+1.
- `staleTime` ≥ 5 daqiqa — 3D asset **kamdan-kam** o'zgaradi.
- **Polling YO'Q.** Faqat `conversion_status === 'converting'` bo'lganda vaqtincha
  (masalan 10s) — tayyor bo'lgach to'xtatiladi.
- To'liq-ekran taklif va sahifa bo'limi **bir xil query key**ni ishlatadi — yopib
  qaytganda **qayta so'rov ketmaydi**, keshdan ko'rinadi.

---

# 11. SINOV VA QABUL

## 11.1. Nimani avtomatlashtirish MUMKIN

| Tekshiruv | Qanday |
|-----------|--------|
| USDZ tuzilishi | ZIP local-file-header'ni `struct` bilan parslab: **STORED** (siqilmagan) + **64-bayt tekislash** |
| USDZ mazmuni | `usd-core` bilan qayta ochib: prim soni, material soni, `metersPerUnit`, up-axis |
| Outlier tekshiruvlari | Sun'iy glTF (bir node 100x katta) → rad etilishi kerak; normal model (10x farq) → o'tishi kerak |
| Siqish | Chiqish hajmi < kirish; `file_url` yangilangani; `original_file_url` saqlangani |
| Pipeline holati | Har qadam holati yozilgani; xatoda `failed` + xabar; **idempotentlik** (ikkinchi marta yurgizish ishni takrorlamasligi) |
| Frontend UI | Tugmalar mavjudligi, fallback matnlari, atribut qiymatlari (`ar` — **haqiqiy Boolean**mi) |

## 11.2. Nimani avtomatlashtirish MUMKIN EMAS (qo'lda, real qurilmada)

- **Haqiqiy AR sessiyasi** — ARCore/ARKit emulyatorda yo'q.
- **Giroskop/kompas** — serverda/CI'da sensor yo'q.
- **Kamera oqimi** — soxta stream real xatti-harakatni bermaydi.
- **Scene Viewer intent** — faqat haqiqiy Android'da.

```
Shu sabab QABUL uchun ZARUR minimal qurilma to'plami:
  1 × iPhone (Quick Look)
  1 × ARCore BOR Android
  1 × ARCore YO'Q Android   ← 3-darajali zaxirani sinash uchun ENG muhimi
```

## 11.3. Headless render (poster/skrinshot) — majburiy flag'lar

model-viewer'ni headless Chromium'da renderlash **bu flag'lar bo'lmasa jim bo'sh
canvas beradi**:

```
--no-sandbox
--use-gl=angle
--use-angle=swiftshader
--enable-webgl
--ignore-gpu-blocklist
--enable-unsafe-swiftshader
--disable-gpu-sandbox
```
Skrinshot **`load` hodisasidan keyin** olinadi (`progress`ga tayanmaydi, 6.5-band).

## 11.4. Test muhiti tuzoqlari

- **jsdom'da WebGL yo'q** → model-viewer render qilinmaydi. Unit testda ko'ruvchining
  **atribut/mantiq** qismi tekshiriladi, vizual qism — Playwright'da.
- **`use(promise)` jsdom'da hech qachon hal bo'lmaydi** → sahifa komponenti
  Promise ochsa, ko'rinishni **alohida komponentga ajratib**, testda **to'g'ridan-to'g'ri**
  shu komponent render qilinadi.
- **Strict-mode selector to'qnashuvi:** `getByLabel('Uzunlik')` ham input'ga, ham SVG
  diagrammaga tushadi → `getByRole('textbox', { name: '...' })`.

## 11.5. QABUL CHECKLIST

```
PIPELINE
[ ] .glb yuklandi → status ketma-ketligi to'liq → conversion_status = ready
[ ] usdz_url TO'LDIRILGAN va fayl HAQIQATAN ochiladi (bosh URL emas!)
[ ] file_url SIQILGAN versiyaga o'tgan; original_file_url saqlangan; format='glb'
[ ] Masshtab-outlier'li fayl RAD etilgan + xabarda QAYSI obyekt yozilgan
[ ] Pozitsiya-outlier'li fayl RAD etilgan + xabarda QAYSI obyekt yozilgan
[ ] Ko'p-faylли .gltf (JSON + .bin) ham to'liq ishlangan
[ ] background_color avtomatik tanlangan; qo'lda tanlansa avtomatika tegmaydi
[ ] Xato holatida error_message OQILADIGAN va HARAKATGA YO'NALTIRUVCHI

KO'RUVCHI (desktop)
[ ] Poster darhol, keyin model; foiz ko'rinadi; `load` bilan yashiriladi
[ ] Tarmoq uzilsa — xato UI + "Qayta urinish" ISHLAYDI (25s taymer)
[ ] Zoom slayderi 0→100% da radius HAQIQATAN o'zgaradi (o'lchab tasdiqlash!)
[ ] Sahifa scroll'i 3D ustidan o'tganda TIQILIB QOLMAYDI
[ ] model-viewer'ning O'Z AR tugmasi KO'RINMAYDI
[ ] QR kod `?ar=1` beradi
[ ] Konsol xatosi 0; gorizontal overflow 0

KO'RUVCHI (mobil, REAL qurilma)
[ ] iPhone: AR → Quick Look ochiladi, model TO'G'RI o'lchamda
[ ] Android(ARCore+): AR → Scene Viewer ar_only, oq "Object" ekrani YO'Q
[ ] Android(ARCore−): Play Store'ga OTIB YUBORMAYDI, shu sahifada qoladi
[ ] Android(ARCore−): ogohlantirish O'ZI chiqadi (~1.5s), matn AYBLAMAYDI
[ ] "Kamerada ko'ring": kamera ochiladi, 1 barmoq aylantiradi, pinch zoom ishlaydi
[ ] Telefon burilganda model xonada "turgandek" siljiydi
[ ] Yopilganda kamera indikatori O'CHADI
[ ] Kamera rad etilsa — ANIQ ruxsat matni
[ ] QR → telefon → darhol to'liq-ekran taklif; "Yopish" → sahifa bo'limiga o'tadi
[ ] IKKI WebGL konteksti bir vaqtda ochilmaydi

TELEMETRIYA
[ ] /ar/track/ chaqiriladi (mehmon uchun HAM)
[ ] /ar/finish/ davomiylik bilan chaqiriladi
[ ] failed_unsupported foizi hisoblanadi
```

---

# 12. TUZOQLAR REGISTRI — real qurilmalarda topilgan 18 xato

> Bu jadval — hujjatning **eng qimmatli** qismi. Har biri ishlab chiqarishda
> topilgan, sabab bilan tushuntirilgan.

| # | Xato (ko'rinishi) | HAQIQIY sabab | Yechim |
|---|-------------------|---------------|--------|
| **T-01** | AR tugmasi doim "qurilma qo'llamaydi" deydi — **real qurilmadan qat'i nazar** | `<model-viewer>` — **custom element** (lit). React `ar={cond ? "" : undefined}` naqshini **DOM xossasi** sifatida o'rnatadi → `el.ar = ""`. Manba kodda `if (this.ar)` — **bo'sh satr JS'da falsy** → shart hech qachon bajarilmaydi → `canActivateAR` doim `false` | **Xom `boolean`** uzatiladi. `camera-controls`/`auto-rotate` ham aynan shu xatoga ega |
| **T-02** | Yashirgan bo'lsak ham ARCore so'raladi | `<model-viewer ar>` **har doim** ichki `#default-ar-button`ni render qiladi | `--ar-button-display: none` |
| **T-03** | Siqilgan model "setMeshoptDecoder must be called" bilan **umuman** yuklanmaydi | `gltfpack -cc` `EXT_meshopt_compression` beradi; ichki `GLTFLoader` buni **so'zsiz** tushunmaydi | `ModelViewerElement.meshoptDecoderLocation = '/decoders/meshopt_decoder.js'` (fayl `meshoptimizer` npm paketidan, WASM ichida — alohida `.wasm` shart emas) |
| **T-04** | Zoom 100%da 50% bilan **aynan bir xil** | `max-camera-orbit="auto auto auto"` standarti slayder oralig'idan **torroq**, radiusni qisadi | Foiz sintaksisi + `min/max-camera-orbit` **aynan bir xil** oraliqda |
| **T-05** | AR'da ingichka **"nayza"lar** va buzuq "panjara" | Ba'zi node'lar ~96-100x katta masshtabda (turli birlik-tizimi) | SVD + median outlier tekshiruvi, 15x chegara (5.2.1) |
| **T-06** | 3D/AR **bo'sh ekran** ko'rsatadi | Bir node asosiy korpusdan 232 birlik uzoqda → avtomatik kamera juda uzoqlashgan | Pozitsiya-outlier tekshiruvi (5.2.2) |
| **T-07** | USDZ `struct.unpack requires a buffer of 4 bytes` bilan yiqiladi | USDZ konverteri siqilmagan `float32` kutadi, `-cc` chiqishi **meshopt-kvantlangan** | USDZ **siqishdan OLDINGI** manbadan (5.4.1) |
| **T-08** | USDZ `"xformOp already exists"` bilan yiqiladi | Eksportda bir nechta node **aynan bir xil nomda** (Blender/Sketchfab'da tarqalgan) | Yo'lga **node indeksi** majburan qo'shiladi |
| **T-09** | Barcha teksturalar **teskari** | glTF UV (0,0)=chap-yuqori · USD (0,0)=chap-past | `st = (u, 1-v)` |
| **T-10** | Siqish/USDZ **jim** hech qachon ishlamaydi | Ko'p-faylли `.gltf` HTTP orqali qayta yuklanganda hamroh `.bin`/teksturalar yo'qoladi | **Lokal disk nusxasi** birinchi (5.0) |
| **T-11** | `binary_blob()` `None` qaytaradi | Ko'p-faylли `.gltf`da bufer tashqi faylda | `convert_buffers(BINARYBLOB)` — `.glb` uchun xavfsiz no-op |
| **T-12** | iPhone hech narsa yuklamaydi, garchi konvertatsiya to'g'ri | S3 yo'q holatda yuklovchi **mavjud bo'lmagan** CDN URL'ini qaytarardi, fayl saqlanmasdi | URL faqat fayl saqlangandan keyin (5.8) |
| **T-13** | Butun siqish pipeline'i **saytda ishlatilmaydi** | Natija `optimized_url`da qolib, `file_url` yangilanmagan | `file_url`ning o'zi siqilganga o'tadi (5.3) |
| **T-14** | `UnicodeDecodeError` bilan abadiy qulash (20 mahsulot) | Siqish har doim bitta-faylли `.glb` beradi, lekin `format` `gltf`da qolgan → keyingi kod matn-JSON deb ochadi | Siqishdan keyin `format='glb'` **majburan** |
| **T-15** | Yuklash overlay'i **100%da abadiy** osilib qoladi | `progress` 100%ga yetadi, `load` kelmaydi, `error` **tinglanmagan** | `load`+`error`+25s taymer (6.5) |
| **T-16** | Fon oqqa **sakraydi**, oq mebel ko'rinmaydi | model-viewer poster ostini o'z oq foni bilan bo'yaydi | `--poster-color` + tashqi qutida rang + temadan mustaqil |
| **T-17** | Zaxira rejimda **aylantirib bo'lmaydi** | Auto-rotate o'chirilganda `camera-controls` o'rniga custom pointer-kod yozilgan (model emas, **quti** surilardi) | Custom kod olib tashlanib, `camera-controls` yoqiladi; sensor-siljish **sobit joy ustiga** |
| **T-18** | Cookie-banner **kamera ustida** chiqadi | Ikkalasi `z-50` — DOM tartibiga qarab | AR overlay ataylab balandroq (`z-60`+) |

---

# 13. BOSHQA LOYIHAGA KO'CHIRISH

## 13.1. Bosqichma-bosqich (birinchi ishlaydigan AR'ga ~1 kun)

```
BOSQICH 1 — Minimal ishlaydigan AR (yarim kun)
  1. npm i @google/model-viewer meshoptimizer
  2. node_modules/meshoptimizer/meshopt_decoder.js → public/decoders/
  3. Ko'ruvchi komponenti (6.3-banddagi atributlar bilan), `ssr:false` lazy
  4. `meshoptDecoderLocation` o'rnatiladi (T-03)
  5. Bitta test `.glb` bilan tekshirish
  → NATIJA: desktopda 3D, Android'da AR ishlaydi. iOS'da AR HALI YO'Q.

BOSQICH 2 — iOS AR (yarim kun)
  6. pip install usd-core pygltflib
  7. USDZ konverteri (5.4-bo'lim) — moslik jadvali + 5 ta nozik joy
  8. `usdz_url` → `ios-src`
  → NATIJA: iOS'da Quick Look ishlaydi.

BOSQICH 3 — Ishonchlilik (1 kun) ← ENG KO'P QIYMAT SHU YERDA
  9.  Fallback narvoni (7-bo'lim), 5 daraja
  10. Sensor-overlay zaxirasi (7.1)
  11. Yuklash/xato holati (6.5) — load+error+taymer
  12. AR aniqlash siyosati (TZ-2.3) — tugmani yashirmaslik

BOSQICH 4 — Sifat va tezlik (1-2 kun)
  13. Asinxron pipeline + holat kuzatuvi
  14. Geometriya sog'ligi tekshiruvlari (5.2) — DCC fayllari bo'lsa MAJBURIY
  15. gltfpack -cc siqish + file_url almashtirish
  16. Auto-fon + poster
  17. Telemetriya (8-bo'lim)
```

## 13.2. Loyihaga xos, almashtirilishi kerak bo'lgan joylar

| Joy | Nima o'zgaradi |
|-----|----------------|
| **Domen modeli** | `product` → sizning obyektingiz (kvartira, eksponat, kurs materiali). `ThreeDAsset` **o'zgarmaydi** |
| **Masshtab ma'nosi** | Mebel: `resizable=false`, `ar-scale="auto"` (real o'lcham MUHIM). O'yinchoq/dekor: `resizable=true` mumkin |
| **Fon palitrasi** | Brendingiz ranglariga; kontrast **mantiqi** o'zgarmaydi |
| **Chegaralar** | Mahsulot turi bo'yicha (zargarlik = kichik fayl/yuqori detal; arxitektura = katta) |
| **Matnlar** | Tilga; **tuzilishi** (sabab+harakat) o'zgarmaydi |
| **Navbat** | Celery → BullMQ/Sidekiq/Lambda; **qadamlar** o'zgarmaydi |

## 13.3. Nimani O'ZGARTIRMASLIK kerak (qattiq yadro)

```
✓ ar-modes tartibi:            scene-viewer webxr quick-look
✓ ar — XOM boolean
✓ --ar-button-display: none
✓ meshoptDecoderLocation
✓ USDZ — siqishdan OLDINGI manbadan
✓ UV V-flip + node indeksi yo'lda
✓ CreateNewUsdzPackage (qo'lda zip YO'Q)
✓ AR tekshiruvi — bosishdan KEYIN, tugma HAR DOIM ko'rinadi
✓ 5 darajali fallback narvoni
✓ load+error+taymer uchligi
✓ min/max-camera-orbit == zoom oralig'i
✓ browser_fallback_url — har doim
✓ Siqilgan natija file_url'GA yoziladi
```

## 13.4. Minimal bog'liqliklar

```
Frontend:  @google/model-viewer, meshoptimizer, (qrcode kutubxonasi — QR uchun)
Backend:   usd-core, pygltflib, numpy
CLI:       gltfpack (npm -g gltfpack), gltf-validator (ixtiyoriy, tavsiya etiladi)
Infra:     HTTPS majburiy · asinxron navbat · fayl saqlash (lokal yoki S3)
```

---

# 14. CHEKLOVLAR — nima MUMKIN EMAS (halol ro'yxat)

```
✗ Nol bosishli AR — brauzer user gesture talab qiladi (o'zgartirilmaydi)
✗ Desktopda AR — kamera/SLAM yo'q; yechim: QR ko'prigi
✗ Brauzerda bepul universal pol aniqlash — faqat pullik xizmatlarda (8th Wall)
✗ AR qo'llab-quvvatlashini oldindan aniq bilish — barcha API'lar yolg'on gapiradi
✗ Zaxira rejimda YURISHNI kuzatish — SLAM'siz faqat BURILISH o'lchanadi
✗ Scene Viewer UI'sini boshqarish — fon rangi parametri YO'Q (mode=ar_only bilan
  o'tkazib yuborish — yagona yo'l)
✗ iOS'da WebXR — API mavjud emas (faqat Quick Look)
✗ Quick Look'ga glb berish — .usdz MAJBURIY
✗ AR sessiyasi ichida analitika — u OS ilovasi, biz faqat "ochildi"ni bilamiz
```

---

# 15. NOL-DAN QARORLAR JADVALI (tez ma'lumotnoma)

| Savol | Javob | Sabab |
|-------|-------|-------|
| Qaysi kutubxona? | `<model-viewer>` | 3 ta AR yo'lini bittada; freymvorkdan mustaqil |
| Qaysi formatlar? | `.glb` + `.usdz` | Android/veb va iOS — **ikkalasi shart** |
| Siqish? | `gltfpack -cc` | Real 7x, sifat yo'qolmaydi; tekstura flag'lari **yo'q** |
| USDZ nima bilan? | `usd-core` + `pygltflib` | Tayyor CLI **mavjud emas** |
| Sinxron yoki asinxron? | **Asinxron, holat kuzatuvi bilan** | Daqiqalar davom etadi |
| AR tugmasini yashiramizmi? | **Yo'q, hech qachon** | Tekshiruvlar yolg'on gapiradi |
| ARCore yo'q qurilma? | Sensor-overlay + halol yozuv | Auditoriyaning katta qismi |
| Desktopda? | QR → `?ar=1` | AR printsipial mumkin emas |
| Fon? | Modelga bog'langan, avtomatik, temadan mustaqil | Oq mahsulot oq fonda ko'rinmaydi |
| Xato holatida? | Aniq sabab + harakat + chiqish yo'li | "Xato yuz berdi" — taqiqlanadi |
| Nima o'lchanadi? | `outcome` (opened / failed_unsupported / denied) | Zaxiraga qancha kuch kerakligini FAQAT shu ko'rsatadi |

---

**Hujjat oxiri.** Ko'chirishda 13.3-banddagi qattiq yadroga tegmang; qolgani
loyihangizga moslashadi. 12-bo'limdagi tuzoqlar registri — kod yozishdan **oldin**
o'qiladi, keyin emas.
