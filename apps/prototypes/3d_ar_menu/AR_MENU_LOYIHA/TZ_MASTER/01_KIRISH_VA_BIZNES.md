# QISM I — KIRISH, BIZNES-MODEL VA STRATEGIYA

---

## 1. HUJJAT HAQIDA

### 1.1 Bu hujjat kim uchun

| O'quvchi | Qaysi bo'limni o'qiydi | Nima oladi |
|---|---|---|
| 👨‍💻 **Dasturchi / AI-agent** | Qism III–VII | Aynan qanday kod yozish, qaysi tartibda, qaysi faylga |
| 🏗 **Tizim arxitektori** | Qism III, VIII, IX | Arxitektura, masshtablash, xatolarga chidamlilik |
| 📋 **Project Manager** | Qism II, X, XI | Sprintlar, muddatlar, resurslar, risklar |
| 💰 **Investor** | Qism I, XII | Bozor, birlik iqtisodiyoti, ROI, exit |
| 🏪 **Biznes egasi (restoran)** | Qism I, II | Nima olaman, qancha to'layman, qancha tejayman |
| 🏛 **Davlat xodimi / regulyator** | Qism XIII | Fiskalizatsiya, soliq, ma'lumot himoyasi, qonunchilik |
| 👤 **Oddiy foydalanuvchi** | Qism II | Tizim qanday ishlaydi, qanday ko'rinadi |

### 1.2 Hujjatning asosiy printsipi

> **Bu TZ shunday yozilganki, uni o'qigan ENG ODDIY AI ham (bepul GPT/Gemini)
> ideal darajada kod yozib tugata olishi kerak.**

Shu sababli hujjatda:
- ✅ Har bir tugma → qaysi funksiyani chaqiradi → keyin nima bo'ladi (to'liq zanjir)
- ✅ Har bir fayl → qayerda joylashadi → ichida nima yoziladi
- ✅ Kod yozish **tartibi** — 1-dan 400-gacha vazifa, bog'liqliklari bilan
- ✅ Har bir API endpoint → so'rov/javob namunasi bilan
- ✅ Har bir jadval → to'liq maydonlar, indekslar, cheklovlar bilan

### 1.3 Hujjat versiyasi

| Versiya | Sana | O'zgarish |
|---|---|---|
| v1.0 | 2026-09-04 | Birinchi bozor tahlili + asosiy TZ |
| v2.0 | 2026-09-04 | Chuqur bozor tahlili, 3 rol, AR asosiy |
| **v3.0 MASTER** | **2026-09-04** | **To'liq mukammal TZ — bu hujjat** |

---

## 2. LOYIHA MOHIYATI

### 2.1 Bir jumlada

> Restoran stolidagi QR kodni skanerlagan mijoz taomni **telefon kamerasi orqali
> stolining ustida real o'lchamda 3D ko'radi**, yoqsa buyurtma beradi; ofitsiant
> stol raqamini darhol ko'rib olib boradi; admin hammasini real vaqtda nazorat qiladi.

### 2.2 Nima uchun bu ishlaydi

```
MUAMMO                                YECHIM
─────────────────────────────────────────────────────────────────────
Mijoz taomni tasavvur qila olmaydi  → AR'da real o'lchamda ko'radi
Turist "norin" nimaligini bilmaydi   → 3D + 3 til + AI tushuntiradi
Restoran Yandex'ga 30% beradi        → To'g'ridan-to'g'ri buyurtma, 0%
Soliq IKPU/fiskal talab qiladi       → Tizim ichida fiskal chek
Ofitsiant sekin, xato buyurtma       → Mijoz o'zi kiritadi, xato −22%
Egasi nima sotilayotganini bilmaydi  → Real-time analitika
O'rtacha chek past                   → AI upsell, +20%
```

### 2.3 Loyiha nomi

**Ishchi nom:** `ARMENU` / `Bittada AR Menu`
**Domen taklifi:** `armenu.uz`, `menu3d.uz`, `armenu.app`

> ⚠️ Yakuniy nom foydalanuvchi tomonidan tasdiqlanadi (Qism XIV, savol #2).

---

## 3. ⛔ IZOLYATSIYA KAFOLATI (o'zgarmas qoida)

**Bu ALOHIDA shaxsiy loyiha.** `mebelcity_platform` ga hech qanday tegish YO'Q.

| Element | ARMENU | mebelcity_platform |
|---|---|---|
| Git repo | `armenu/` (yangi) | TEGILMAYDI |
| Papka | `/home/user/armenu/` yoki alohida VPS | TEGILMAYDI |
| Django loyiha | `armenu_project` | TEGILMAYDI |
| Ma'lumotlar bazasi | `armenu_db` | `tenant_*` TEGILMAYDI |
| Redis DB raqami | `db=5` (yoki alohida instans) | `db=0..4` TEGILMAYDI |
| Port | 8060 (web), 8061 (ws) | 8040/8041 TEGILMAYDI |
| Systemd | `armenu.service`, `armenu-ws.service`, `armenu-worker.service` | `bittada-*` TEGILMAYDI |
| Nginx | yangi `server` bloki | mavjudiga TEGILMAYDI |
| Media | `/var/armenu/media/` | TEGILMAYDI |

> 🎯 **Eng xavfsiz variant: alohida VPS.** Shunda umumiy nol xavf.

---

## 4. 💰 BIZNES-MODEL

### 4.1 Daromad oqimlari (5 ta)

| # | Oqim | Model | Ulush (3-yil) |
|---|---|---|---|
| 1 | **SaaS abonent** | Oylik/yillik obuna | 62% |
| 2 | **3D kontent setup** | Bir martalik, taom uchun | 12% |
| 3 | **To'lov komissiyasi** | Onlayn to'lovdan 0,5-1% | 14% |
| 4 | **Delivery moduli** | Buyurtmadan 300-500 so'm | 8% |
| 5 | **Qo'shimcha xizmat** | QR stend, brending, konsalting | 4% |

### 4.2 Tarif rejasi (yakuniy)

| Tarif | Oylik | Yillik (−20%) | Kim uchun |
|---|---|---|---|
| 🆓 **FREE** | 0 | 0 | Choyxona, 3 stol, 20 taom, AR yo'q, brend bizniki |
| 🟢 **START** | 199 000 | 1 910 000 | Kafe: cheksiz stol/taom, KDS, ofitsiant, 3 til |
| ⭐ **PRO** | 590 000 | 5 664 000 | **+ AR/3D (50 taom)**, sodiqlik, analitika, to'lov |
| 🔵 **PRO+FISKAL** | 890 000 | 8 544 000 | + OFD fiskal chek, IKPU, soliq hisoboti |
| 🏢 **TARMOQ** | Shartnoma | — | 5+ nuqta, franchayzing, shaxsiy menejer |
| 🛠 **3D SETUP** | 90 000/taom | — | Kutubxonada yo'q taom uchun (bir martalik) |

**Nima uchun FREE bor:**
1. Bozorga eng tez kirish (Dastur-xon 99k so'raganda biz 0)
2. QR pastidagi "Powered by ARMENU" = **viral kanal**
   → 1 stol × kuniga 30 skanerlash × 300 stol = **9 000 ko'rish/kun**
3. FREE → PRO konversiyasi (sanoat o'rtachasi 3-8%, biz 12% kutamiz — AR jozibali)

### 4.3 Birlik iqtisodiyoti (PRO tarif, 1 restoran)

```
╔═══════════════════════════════════════════════════════════════╗
║ DAROMAD (yillik)                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ PRO abonent            590 000 × 12          =  7 080 000 so'm║
║ 3D setup (20 noyob taom × 90 000) [1-yil]    =  1 800 000 so'm║
║ To'lov komissiyasi (oyiga ~40 mln × 0,7%)    =  3 360 000 so'm║
║ ───────────────────────────────────────────────────────────── ║
║ 1-yil jami                                   = 12 240 000 so'm║
║ 2-yildan (setup'siz)                         = 10 440 000 so'm║
╠═══════════════════════════════════════════════════════════════╣
║ XARAJAT (yillik)                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ 3D kontent — 1-chi restoran                  =  1 250 000 so'm║
║ 3D kontent — 50-chi restoran (kutubxona)     =    250 000 so'm║
║ 3D kontent — 100-chi restoran                =     50 000 so'm║
║ Sotuv + o'rnatish (CAC)                      =    900 000 so'm║
║ Server / CDN / AI API                        =    500 000 so'm║
║ Qo'llab-quvvatlash                           =    700 000 so'm║
║ ───────────────────────────────────────────────────────────── ║
║ 1-chi restoran                               =  3 350 000 so'm║
║ 100-chi restoran                             =  2 150 000 so'm║
╚═══════════════════════════════════════════════════════════════╝

MARJA:   1-chi restoran  = 73%
         100-chi restoran = 82%

LTV/CAC: LTV = 10,44 mln × 3,5 yil = 36,5 mln so'm
         CAC = 900 000 so'm
         LTV/CAC = 40:1   ⚡ (sog'lom SaaS = 3:1, biz 13x yaxshi)

PAYBACK: CAC qoplanishi = 1,1 oy
```

### 4.4 🎯 6/12/24 OYLIK MAQSAD (foydalanuvchi talabi)

> Talab: **6 oyda foyda + viloyat miqyosi, 12 oyda respublika, 24 oyda qo'shni davlatlar**

#### 6 OY — VILOYAT MIQYOSI + BIRINCHI FOYDA

| Oy | Bosqich | Mijoz | Oylik daromad |
|---|---|---|---|
| 1-2 | MVP ishlab chiqish + 5 bepul pilot | 5 (bepul) | 0 |
| 3 | v1 tayyor, pilot natijalari o'lchandi | 5 | 0 |
| 4 | Sotuv boshlandi (Toshkent) | 18 | ~6 mln |
| 5 | Samarqand + Buxoro (turizm) | 42 | ~16 mln |
| 6 | **Viloyat miqyosi (3-4 viloyat)** | **75** | **~32 mln** |

**6-oy holati:**
- Kümülativ daromad: ~95 mln so'm
- Kümülativ xarajat: ~180 mln so'm (jamoa + ishlab chiqish)
- **Oylik operatsion foyda: ✅ IJOBIY (6-oydan)**
- To'liq investitsiya qoplanishi: 11-oy

> ⚠️ **Halol ogohlantirish:** "6 oyda foyda" — **oylik operatsion foyda** degani.
> Butun investitsiyaning qaytishi (payback) — **11-13 oy**. Bu SaaS uchun juda yaxshi
> ko'rsatkich (sanoat o'rtachasi 18-24 oy).

#### 12 OY — RESPUBLIKA MIQYOSI

| Ko'rsatkich | 12-oy holati |
|---|---|
| Faol mijoz | **280** (FREE 120 + pullik 160) |
| Qamrov | 12 viloyat + Toshkent + Qoraqalpog'iston |
| Oylik daromad | ~105 mln so'm |
| Yillik run-rate | ~1,26 mlrd so'm |
| Jamoa | 12 kishi |
| 3D kutubxona | ~320 model |
| **Investitsiya qoplandimi** | ✅ **HA (11-oy)** |

#### 24 OY — QO'SHNI RESPUBLIKALAR

| Bozor | Kirish oyi | Sabab |
|---|---|---|
| 🇰🇿 **Qozog'iston** | 14-oy | Eng katta bozor, iiko kuchli lekin AR yo'q |
| 🇰🇬 **Qirg'iziston** | 17-oy | Kichik, oson, til yaqin |
| 🇹🇯 **Tojikiston** | 19-oy | Til yaqin, raqobat kam |
| 🇦🇿 **Ozarbayjon** | 21-oy | Turizm kuchli, `qrmenyu.az` bor lekin AR yo'q |
| 🇹🇲 **Turkmaniston** | 24-oy | Yopiq bozor, ehtiyot bilan |

**24-oy holati:**
- Mijoz: **~750** (O'zbekiston 480 + xorij 270)
- Yillik daromad: **~3,4 mlrd so'm** (~$268 000)
- Sof foyda: **~1,5 mlrd so'm** (~$118 000)
- 3D kutubxona: ~600 model (asosiy aktiv)

### 4.5 🛡 5 YIL DAVOMIDA O'ZIB KETILMASLIK (foydalanuvchi talabi)

> Talab: *"keyingi 5 yilda ham undan o'tadigan arxitektura va loyiha bo'lmasligi kerak"*

Bu **texnik emas, strategik** masala. 4 ta himoya devori:

#### 🏰 Devor 1: 3D KONTENT KUTUBXONASI (eng kuchli)
```
Yil 1: 320 model   →  Yil 3: 600 model  →  Yil 5: 1200+ model
```
- Raqobatchi 0 dan boshlaydi, bizda tayyor baza
- Har yangi restoran kutubxonani boyitadi (tarmoq effekti)
- **Takrorlash vaqti raqobatchi uchun: 2-3 yil**

#### 🏰 Devor 2: MA'LUMOT VA AI
- Millionlab buyurtma → qaysi taom qaysi vaqtda, kim bilan buyurtma qilinadi
- Bu ma'lumotda AI tavsiya modeli o'qitiladi → tavsiya sifati oshadi
- Raqobatchida bu ma'lumot **yo'q va sotib ololmaydi**

#### 🏰 Devor 3: FISKAL + INTEGRATSIYA CHUQURLIGI
- OFD, IKPU, Payme/Click/Uzum, Telegram, delivery
- Restoran bularni bir marta sozlaydi → ko'chib ketish og'riqli (switching cost)
- Buxgalteriya tarixi tizimda qoladi

#### 🏰 Devor 4: PLATFORMA EFFEKTI (5-yil vizyoni)
```
Yil 1-2: Restoran uchun SaaS
Yil 3:   + Mijoz ilovasi (bitta ilova, barcha restoranlar) → marketplace
Yil 4:   + Ta'minotchi bozori (restoran ↔ ta'minotchi)
Yil 5:   + Moliyalash (restoranlarga aylanma mablag', ma'lumot asosida skoring)
```
Bu bosqichlarda **har bir yangi tomon boshqasini kuchaytiradi** — klassik platforma effekti.

#### Arxitektura tomondan 5-yil chidamliligi

| Xavf | Yechim (arxitekturaga qurilgan) |
|---|---|
| Yangi 3D format chiqadi | Kontent **manba formatda** (glTF) saqlanadi, chiqish formati generatsiya qilinadi → yangi format = 1 ta konvertor |
| AI provayder o'zgaradi | **MCP qatlami** (Qism VII) — provayder almashtirish = config o'zgarishi |
| Trafik 1000× oshadi | **Stateless + horizontal scaling** (Qism VIII) — server qo'shiladi |
| Yangi mamlakat/valyuta | Multi-currency, multi-locale bosh kundan qurilgan |
| Yangi qonun talabi | Fiskal qatlam **plugin** — yangi davlat = yangi adapter |
| Yangi qurilma (AR ko'zoynak) | `<model-viewer>` va glTF — standart; Vision Pro allaqachon qo'llab-quvvatlaydi |

---

## 5. 📊 BOZOR — YAKUNIY RAQAMLAR

### 5.1 O'zbekiston

| Ko'rsatkich | Qiymat | Manba/sana |
|---|---|---|
| Umumiy ovqatlanish korxonalari | **27 312** | 2026-04-01, Davlat statistika |
| Sektor daromadi (I chorak) | **49,8 trln so'm** | 2026, +8,2% |
| Rasmiy "restoran" toifasi | ~798 (Toshkent 598) | GoldenPages |
| Xalqaro turistlar (7 oy) | **7,75 mln (+22,6%)** | 2026 |
| Q1 turist | 2,87 mln (+36,6%) | 2026 |
| Inflyatsiya | 5,5-7,1% | 2026 |
| Telegram foydalanuvchi | **25-27 mln (76-85%)** | 2026 |
| Mahalliy chek | 35 000–90 000 so'm | 2026 |
| **Turistik chek** | **100 000–200 000 so'm** | 2026 (2-3× yuqori) |

### 5.2 TAM → SAM → SOM

```
TAM  Umumiy ovqatlanish              27 312 ta   →  ~4 mlrd $/yil sektor
 │
SAM  Raqamli menyu to'lay oladigan    ~4 000 ta   →  ~28 mlrd so'm/yil SaaS bozori
 │   • Toshkent 1 800  • Turizm zonalari 600  • Viloyatlar 1 600
 │
SOM  3 yilda realistik ulush          ~480 ta     →  ~2,6 mlrd so'm/yil (bizniki)
     (SAM ning 12%)
```

### 5.3 Qo'shni bozorlar (24-oy uchun)

| Davlat | Ovqatlanish nuqtalari (taxminiy) | Raqobat | Kirish qiyinligi |
|---|---|---|---|
| 🇰🇿 Qozog'iston | ~45 000 | iiko, rKeeper kuchli; **AR yo'q** | O'rta |
| 🇦🇿 Ozarbayjon | ~18 000 | qrmenyu.az, monyo.az; **AR yo'q** | O'rta |
| 🇰🇬 Qirg'iziston | ~12 000 | Kuchsiz | Oson |
| 🇹🇯 Tojikiston | ~10 000 | Deyarli yo'q | Oson |
| 🇹🇲 Turkmaniston | ~6 000 | Yo'q | Qiyin (yopiq) |
| **JAMI qo'shni** | **~91 000** | **Hech kimda AR yo'q** | |

---

## 6. 🥊 RAQOBAT — TO'LIQ MATRITSA

| Funksiya | **ARMENU** | Dastur-xon | Zoomda | iiko | SmartMenu | Poster |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| QR menyu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stol noyob QR | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| **🎯 AR/3D taom** | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **3D kutubxona** | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ofitsiant paneli | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| KDS | ✅ | ✅ | ⚠️ | ✅ | ❌ | ✅ |
| **🎯 Fiskal (OFD/IKPU)** | **✅** | ❌ | ❌ | ✅ | ❌ | ⚠️ |
| Telegram Mini App | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| Onlayn to'lov | ✅ | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| **Delivery 0% komissiya** | **✅** | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| Sodiqlik | ✅ | 🔜 | ✅ | ✅ | ❌ | ✅ |
| **AI ofitsiant chat** | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **3 til + avto-tarjima** | **✅** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Menyu-injiniring | ✅ | ❌ | ❌ | ✅ | ❌ | ⚠️ |
| Otziv→Google filtri | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ombor/retsept | v2 | 🔜 | ❌ | ✅ | ❌ | ✅ |
| **Narx/oy (so'm)** | **0–890k** | 99k–399k | **min 1,3 mln** | ~2–5 mln | ~ | ~ |

### 6.1 Pozitsiyalash

```
   Narx ▲
        │
   5mln │   ● iiko (POS lideri, AR yo'q)
        │
   2mln │        ● Zoomda (delivery+CRM, AR yo'q)
        │
   1mln │              ★ ARMENU PRO+FISKAL
        │           ★ ARMENU PRO  ← AR + fiskal + hamma narsa
   500k │
        │      ● Dastur-xon (arzon, AR yo'q, fiskal yo'q)
   100k │  ● SmartMenu/ZekiSoft
        │
      0 │  ★ ARMENU FREE
        └────────────────────────────────────────────▶
          Kam                Funksiya boyligi              Ko'p
```

**Bizning strategiya:** FREE bilan pastdan kiramiz, PRO bilan o'rtani egallaymiz,
FISKAL bilan iiko mijozlarini olamiz.

---

## 7. 🎯 SOTUV STRATEGIYASI

### 7.1 Pitch ustuvorligi (⚠️ AR birinchi EMAS)

| # | Argument | Kimga | Kuchi |
|---|---|---|---|
| 1️⃣ | *"Yandex 30% oladi — bizda 0%. Oyiga 5 mln tejaysiz"* | Hammaga | 🔥🔥🔥🔥🔥 |
| 2️⃣ | *"Soliq fiskal talabiga mos, alohida kassa kerak emas"* | Rasmiy | 🔥🔥🔥🔥🔥 |
| 3️⃣ | *"O'rtacha chek +20%, stol aylanishi +15%"* | Hammaga | 🔥🔥🔥🔥 |
| 4️⃣ | *"Turist taomni 3D ko'radi va buyurtma qiladi"* | Turizm zonasi | 🔥🔥🔥🔥🔥 |
| 5️⃣ | *"Google reytingingiz ko'tariladi"* | Brend | 🔥🔥🔥 |
| 6️⃣ | *"AR — hech kimda yo'q, siz birinchisiz"* | Instagram-faol | 🔥🔥🔥 |

> ⚠️ **Sotuvchiga qat'iy qoida:** birinchi 30 soniyada **PUL** haqida gapir.
> AR — ko'rsatiladi (demo), lekin sotib olish sababi sifatida oxirida aytiladi.

### 7.2 Kanallar

| # | Kanal | CAC | Konversiya | Prioritet |
|---|---|---|---|---|
| 1 | To'g'ridan-to'g'ri sotuv (field) | 900k so'm | 18% | 🥇 |
| 2 | Instagram/TikTok AR demo reels | 200k so'm | 4% | 🥇 |
| 3 | **Ofitsiant tavsiyasi** (choychaqa) | ~0 | 12% | 🥇 |
| 4 | FREE tarif → PRO | ~50k so'm | 12% | 🥈 |
| 5 | HoReCa ko'rgazma | 1,2 mln so'm | 25% | 🥈 |
| 6 | POS hamkorlik (B2B2B) | 400k so'm | 30% | 🥉 |
| 7 | Referal (restoran → restoran) | 2 oy bepul | 22% | 🥉 |
| 8 | Turizm agentliklari | 600k so'm | 15% | 🥉 |

### 7.3 Birinchi 90 kun

| Hafta | Ish | Natija |
|---|---|---|
| 1-2 | 5 pilot restoran topish (2 TSH + 2 SMQ + 1 BXR) | Shartnoma |
| 3-8 | MVP ishlab chiqish (parallel) | v1 kod |
| 9-10 | O'rnatish, 20 taom 3D, o'qitish | Ishlayapti |
| 11-12 | Raqamlarni o'lchash | Case study |
| 13 | Video-otziv, reels, narx e'loni | Sotuv start |

---

## 8. 💼 INVESTOR NUQTAI NAZARI

### 8.1 Investitsiya so'rovi

| Bosqich | Summa | Nimaga | Qachon |
|---|---|---|---|
| **Seed** | $45 000 (~570 mln so'm) | MVP + pilot + birinchi sotuv | 0-oy |
| Series A (ixtiyoriy) | $250 000 | Qo'shni davlatlarga chiqish | 14-oy |

**Seed taqsimoti:**
```
Ishlab chiqish (2 dasturchi × 6 oy)      $18 000   40%
3D kontent (kutubxona 200 model)          $6 000   13%
Sotuv jamoa (2 kishi × 4 oy)              $8 000   18%
Marketing (reels, ko'rgazma)              $5 000   11%
Server/infra (1-yil)                      $3 500    8%
Yuridik, litsenziya, fiskal               $2 500    6%
Zaxira                                    $2 000    4%
─────────────────────────────────────────────────────
JAMI                                     $45 000  100%
```

### 8.2 Investor uchun asosiy raqamlar

| Metrika | Qiymat | Sanoat o'rtachasi | Baho |
|---|---|---|---|
| LTV / CAC | **40:1** | 3:1 | ⭐⭐⭐⭐⭐ |
| CAC payback | **1,1 oy** | 12-18 oy | ⭐⭐⭐⭐⭐ |
| Yalpi marja | **73→82%** | 70-80% | ⭐⭐⭐⭐ |
| Oylik churn (kutilgan) | 3,5% | 5-7% | ⭐⭐⭐⭐ |
| NRR (net revenue retention) | 115% | 100-110% | ⭐⭐⭐⭐ |
| Break-even | **11-oy** | 24-36 oy | ⭐⭐⭐⭐⭐ |
| 3-yil ARR | **$268 000** | — | ⭐⭐⭐ |
| TAM (O'zb + qo'shni) | ~118 000 nuqta | — | ⭐⭐⭐⭐ |

### 8.3 Exit ssenariylari (5-yil)

| Ssenariy | Baholash | Ehtimol |
|---|---|---|
| **Strategik sotuv** (iiko / Uzum / Yandex) | ARR × 5-7 = **$3-5 mln** | 40% |
| **Mustaqil o'sish** (dividend) | Yiliga $200-400k sof foyda | 35% |
| **Regional konsolidatsiya** (CIS o'yinchisi sotib oladi) | $6-10 mln | 15% |
| Muvaffaqiyatsizlik | — | 10% |

### 8.4 Investor uchun asosiy risklar

| Risk | Ehtimol | Ta'sir | Yumshatish |
|---|---|---|---|
| 3D kontent narxi bashorat qilinganidan yuqori | O'rta | Yuqori | AI pipeline, kutubxona; birinchi 3 oyda o'lchanadi |
| iiko/Zoomda AR qo'shadi | O'rta | O'rta | Kontent kutubxonasi = 2-3 yillik ustunlik |
| Restoranlar to'lamaydi | Past | Yuqori | FREE tarif + delivery argumenti; pilotda tekshiriladi |
| Fiskal integratsiya kechikadi | O'rta | O'rta | v1.5 da, v1 ga bog'liq emas |
| Asosiy jamoa ketishi | Past | Yuqori | Kod hujjatlashtirilgan (bu TZ), option |
| Delivery monopolisti bosim | Past | O'rta | Biz agregator emasmiz — huquqiy jihatdan boshqa segment |

---

## 9. 🏪 RESTORAN EGASI NUQTAI NAZARI

### 9.1 "Men nima olaman?"

| Nima | Qiymat (oylik) |
|---|---|
| Yandex komissiyasidan tejash (agar 30 buyurtma/kun × 60k) | **~13 500 000 so'm** |
| O'rtacha chek +20% (kunlik savdo 5 mln bo'lsa) | **+30 000 000 so'm** |
| Ofitsiant xatosi −22% (isrof kamayadi) | ~800 000 so'm |
| Alohida kassa dasturi kerak emas | ~500 000 so'm |
| Qog'oz menyu chop etish yo'q | ~300 000 so'm |
| **JAMI foyda** | **~45 mln so'm/oy** |
| **To'lov** | **−590 000 so'm/oy** |
| **SOF** | **+44,4 mln so'm/oy** |

> ⚠️ Bu **maksimal** ssenariy. Konservativ (chek +8%, delivery 10 buyurtma/kun):
> foyda ~16 mln so'm/oy → baribir to'lovdan **27× ko'p**.

### 9.2 "Menda qanday qiyinchilik bo'ladi?"

| Xavotir | Javob |
|---|---|
| "Xodimlarim o'rganmaydi" | Ofitsiant paneli 3 tugmadan iborat; 15 daqiqa o'qitish; **choychaqa** ular uchun motivatsiya |
| "Mijozlar QR skanerlamaydi" | To'lov QR (Payme/Click) tufayli odat shakllangan; qog'oz menyu ham qoladi |
| "Internet uzilsa?" | Offline rejim: ofitsiant paneli lokal ishlaydi, internet kelganda sinxronlanadi |
| "Ma'lumotlarim xavfsizmi?" | Kunlik backup, shifrlash, faqat siz ko'rasiz |
| "Ko'chib ketsam ma'lumotim qoladimi?" | To'liq eksport (Excel/JSON) istalgan vaqt |
| "3D qimmatmi?" | Kutubxonada bor taomlar bepul; faqat noyob taom uchun to'lanadi |

---

## 10. 🏛 DAVLAT / REGULYATOR NUQTAI NAZARI

### 10.1 Qonunchilikka muvofiqlik

| Talab | Bizning javob |
|---|---|
| **Onlayn-kassa majburiy** | OFD integratsiyasi (UZKASSA / e-POS / QPos) — v1.5 |
| **IKPU/MXIK kod (2026-04-01 dan)** | Har taom `ikpu_kod` maydoni; `tasnif.soliq.uz` API bilan tekshirish |
| **Retsept asosida cheklov** | Ombor/retsept moduli (v2) |
| **Raqamli chek** | 2026 dan qonuniy — mijozga Telegram/SMS orqali |
| **Qog'oz chek so'ralsa** | Printerga chiqarish qo'llab-quvvatlanadi |
| **Shaxsiy ma'lumotlar (O'zR qonuni)** | Ma'lumot O'zbekiston serverida; minimal yig'ish; roziligi so'raladi |
| **Naqdsiz to'lov (2026 talabi)** | Payme/Click/Uzum integratsiyasi |
| **E-invoicing** | Yuridik shaxs mijozlar uchun (v2) |

### 10.2 Davlat uchun foyda

1. **Soliq shaffofligi** — har buyurtma raqamli, OFD orqali real-time
2. **Norasmiy iqtisodiyot kamayadi** — naqd pul aylanmasi qisqaradi
3. **Turizm sifati** — chet ellik mehmon uchun til/tushunish to'sig'i kamayadi
4. **IT-eksport** — qo'shni davlatlarga sotilsa, valyuta tushumi
5. **IT-Park rezidentligi** — soliq imtiyozlari (alohida ariza)

---

## 11. 👤 ODDIY FOYDALANUVCHI NUQTAI NAZARI

### 11.1 Mijoz tajribasi (real hikoya)

> **Aziz Samarqandda restoranda.** Stolda QR ko'radi, telefonini olib skanerlaydi.
> Menyu ochiladi — o'zbek tilida. "Norin" ni bosadi. **"AR'da ko'rish"** tugmasi.
> Kamera ochiladi, telefonini stolga qaratadi — **norin lagani stolining ustida
> paydo bo'ladi**, xuddi haqiqiydek. Aylantirib ko'radi, kattaligini baholaydi.
> "Kichikroq ekan" deb 2 ta buyurtma qiladi. Savatga qo'shadi.
> Tizim: *"Norinning yoniga achchiq-chuchuk salat oladimi? +18 000 so'm"* — qo'shadi.
> "Buyurtma" bosadi. Telefonida: *"Qabul qilindi. Taxminan 18 daqiqa."*
> 4 daqiqadan keyin ofitsiant kelib: *"Norin va salat, to'g'rimi?"*
> Ovqatdan keyin "Hisob" tugmasi → Payme bilan to'laydi + ofitsiantga 20 000 choychaqa.
> Chek Telegram'ga keladi. "Baholang" → 5 yulduz → Google'ga sharh yozishga taklif.

**Nechta muammo hal bo'ldi:**
- ❌ Taomni tasavvur qila olmaslik → ✅ AR
- ❌ Ofitsiantni kutish → ✅ o'zi buyurtma qildi
- ❌ Xato tushunish → ✅ o'zi tanladi
- ❌ Hisob kutish → ✅ telefonda to'ladi
- ❌ Chek yo'qolishi → ✅ Telegram'da

### 11.2 Turist tajribasi

> **Sarah Buxoroda.** QR skanerlaydi → **English** tanlaydi. Menyu ingliz tilida.
> "Norin — what is it?" → **AI chat**: *"Norin is a traditional Uzbek dish of
> hand-cut noodles with horse meat, served cold..."* → **AR'da ko'radi** →
> allergen filtri: "no nuts" → buyurtma qiladi.

**Bu — bizning eng qimmatli use-case.** Turistik chek 2-3× yuqori.

---

**➡️ Keyingi qism:** [02_FOYDALANUVCHI_OQIMLARI.md](02_FOYDALANUVCHI_OQIMLARI.md) — har bir sahifa, har bir tugma
