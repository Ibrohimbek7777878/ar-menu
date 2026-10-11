# 🚀 START — BU FAYLNI BIRINCHI O'QI

> **AI/dasturchi uchun:** Bu loyihaning **yagona kirish nuqtasi**.
> Boshqa hech qanday faylni oldin o'qima. Quyidagi 6 qadamni bajar.

---

## ⚡ QADAM 1 — HOLATNI ANIQLA (30 soniya)

```bash
cat ROADMAP/03_HOLAT/PROGRESS.md
```

Bu faylda **oxirgi bajarilgan vazifa raqami** yozilgan. Masalan:
```
OXIRGI_BAJARILGAN: V-042
KEYINGI: V-043
FAZA: 2 (Menyu)
```

**Agar `PROGRESS.md` da `V-000` bo'lsa** → loyiha hali boshlanmagan, QADAM 2 ga o't.
**Agar boshqa raqam bo'lsa** → QADAM 4 ga sakra (davom ettirish).

---

## ⚡ QADAM 2 — 15 DAQIQALIK KONTEKST (faqat bir marta)

Loyihani tushunish uchun **faqat shu 2 ta faylni** o'qi (jami ~12 KB):

```bash
cat ROADMAP/00_BOSHLASH/01_LOYIHA_5_DAQIQADA.md    # nima quriladi
cat ROADMAP/00_BOSHLASH/02_QOIDALAR.md             # qanday kod yoziladi
```

> ⛔ **`TZ_MASTER/` papkasidagi fayllarni HOZIR O'QIMA.**
> Ular ma'lumotnoma — faqat kerak bo'lganda, kerakli bo'limini o'qiysan.
> Hammasini o'qish = 260 KB = ~70 000 token behuda sarflanadi.

---

## ⚡ QADAM 3 — MUHITNI TAYYORLA

```bash
cat ROADMAP/00_BOSHLASH/03_MUHIT_TAYYORLASH.md
```

Bu faylda **nusxa ko'chirib ishga tushiriladigan buyruqlar** bor.
Bajar, natijani tekshir, keyin QADAM 4 ga o't.

---

## ⚡ QADAM 4 — FAZANI OCH VA ISHLA

Hozirgi fazani `PROGRESS.md` dan bilib olding. Shu faza faylini och:

| Faza | Fayl | Vazifalar | Muddat |
|---|---|---|---|
| 0 | `01_FAZALAR/FAZA_00_TAYYORGARLIK.md` | V-001…V-012 | 3 kun |
| 1 | `01_FAZALAR/FAZA_01_TENANT_AUTH.md` | V-013…V-030 | 1 hafta |
| 2 | `01_FAZALAR/FAZA_02_MENYU.md` | V-031…V-054 | 2 hafta |
| 3 | `01_FAZALAR/FAZA_03_STOL_QR.md` | V-055…V-066 | 1 hafta |
| 4 | `01_FAZALAR/FAZA_04_MIJOZ_PWA.md` | V-067…V-092 | 2 hafta |
| 5 | `01_FAZALAR/FAZA_05_BUYURTMA_REALTIME.md` | V-093…V-114 | 2 hafta |
| 6 | `01_FAZALAR/FAZA_06_AR_3D.md` ⚡ | V-115…V-142 | 2,5 hafta |
| 7 | `01_FAZALAR/FAZA_07_ZAL_PLAN.md` | V-143…V-150 | 1 hafta |
| 8 | `01_FAZALAR/FAZA_08_ADMIN.md` | V-151…V-170 | 1,5 hafta |
| 9 | `01_FAZALAR/FAZA_09_AI_MCP.md` | V-171…V-186 | 1,5 hafta |
| — | **v1 TUGADI** | | **15 hafta** |
| 10 | `01_FAZALAR/FAZA_10_TOLOV_FISKAL.md` | V-187…V-204 | 2 hafta |
| 11 | `01_FAZALAR/FAZA_11_SODIQLIK.md` | V-205…V-218 | 1,5 hafta |
| 12 | `01_FAZALAR/FAZA_12_DEPLOY.md` | V-219…V-234 | 1 hafta |
| — | **v1.5 TUGADI** | | **19,5 hafta** |

Faza faylida **har bir vazifa uchun**:
- 📁 Qaysi fayl yaratiladi
- 💻 Nima kod yoziladi (namuna bilan)
- ✅ Qanday tekshiriladi
- ➡️ Keyingi qadam

---

## ⚡ QADAM 5 — HAR VAZIFADAN KEYIN

```bash
# 1. Testni ishga tushir
pytest tests/ -x -q

# 2. Progress'ni yangila
python3 ROADMAP/03_HOLAT/update_progress.py V-043 ok

# 3. Commit
git add -A && git commit -m "V-043: menyu API keshi"
```

⚠️ **Test o'tmasa keyingi vazifaga O'TMA.** Tuzat, keyin davom et.

---

## ⚡ QADAM 6 — FAZA TUGAGANDA

```bash
cat ROADMAP/01_FAZALAR/FAZA_XX_....md   # oxiridagi "FAZA QABULI" bo'limi
```

U yerda faza qabul mezonlari bor. Hammasi ✅ bo'lsa — keyingi fazaga o't.

---

# 📖 MA'LUMOTNOMA — QACHON NIMANI O'QISH

> ⚡ **Token tejash qoidasi:** faqat KERAK bo'lganda, faqat KERAKLI bo'limini o'qi.

| Savol tug'ilsa | O'qi |
|---|---|
| "Bu tugma nima qiladi?" | `TZ_MASTER/02_SAHIFALAR_VA_TUGMALAR.md` — kerakli sahifa (M-xx / O-xx / A-xx) |
| "Bu jadvalda qanday maydonlar?" | `TZ_MASTER/04_DATA_MODEL_VA_API.md` §1 |
| "API javob formati qanday?" | `TZ_MASTER/04_DATA_MODEL_VA_API.md` §2 |
| "WebSocket xabar turi qanday?" | `TZ_MASTER/04_DATA_MODEL_VA_API.md` §3 |
| "Masshtablash qanday?" | `TZ_MASTER/03_ARXITEKTURA.md` §4 |
| "Xato bo'lsa nima qilinadi?" | `TZ_MASTER/03_ARXITEKTURA.md` §5 |
| "Rang/shrift qanday?" | `TZ_MASTER/06_TARJIMA_VA_UI.md` §2 |
| "Tarjima qanday ishlaydi?" | `TZ_MASTER/06_TARJIMA_VA_UI.md` §1 |
| "AI provayder qanday qo'shiladi?" | `TZ_MASTER/07_AI_MCP.md` §4 |
| "Nima uchun bu qaror qabul qilingan?" | `TZ_MASTER/01_KIRISH_VA_BIZNES.md` |
| "Deploy qanday?" | `TZ_MASTER/08_DEPLOY_REJA_RISK.md` §1 |

**Tez qidiruv:**
```bash
grep -n "izlagan_narsangiz" ROADMAP/02_MALUMOTNOMA/INDEKS.md
```

---

# ⛔ QAT'IY QOIDALAR (buzilmaydi)

| # | Qoida |
|---|---|
| 1 | ⛔ **`mebelcity_platform` ga TEGMA** — alohida repo, DB, port, servis |
| 2 | ⛔ **Vazifa tartibini buzma** — V-043 dan oldin V-042 bajarilishi shart |
| 3 | ⛔ **Test o'tmasa davom etma** |
| 4 | ⛔ **TZ_MASTER ni to'liq o'qima** — faqat kerakli bo'limni |
| 5 | ✅ **Har vazifadan keyin PROGRESS.md yangilanadi** |
| 6 | ✅ **Har model tenant-scoped** (`restaurant_id` filtri) |
| 7 | ✅ **Har UI 3 tilda + dark/light** |
| 8 | ✅ **Miqdor butun son** (`Math.ceil()`) |
| 9 | ✅ **Narx serverda hisoblanadi** — frontendga ishonilmaydi |
| 10 | ✅ **Uzoq ish → worker**, web so'rovda emas |

---

# 🔁 ISH SIKLI (to'xtamasdan ishlash uchun)

> Bu bo'lim AI uchun. Har vazifada **aynan shu 6 qadam** takrorlanadi.
> Boshqa hech narsa o'ylab topish shart emas.

```
┌──────────────────────────────────────────────────────────────┐
│  1. PROGRESS.md dan keyingi vazifa raqamini ol   (V-XXX)     │
│     $ python3 ROADMAP/03_HOLAT/update_progress.py --status   │
├──────────────────────────────────────────────────────────────┤
│  2. Shu vazifa turgan faza faylini och                       │
│     $ grep -A 60 "## V-XXX" ROADMAP/01_FAZALAR/FAZA_YY_*.md  │
│     (butun faylni emas — faqat shu vazifani)                 │
├──────────────────────────────────────────────────────────────┤
│  3. Kodni yoz (fayl yo'li va kod vazifada berilgan)          │
│     Savol tug'ilsa → ROADMAP/02_MALUMOTNOMA/INDEKS.md        │
├──────────────────────────────────────────────────────────────┤
│  4. Tekshir                                                   │
│     $ pytest tests/ -x -q                                     │
│     ❌ o'tmadi → TUZAT, 3-qadamga qayt                        │
│     ✅ o'tdi  → 5-qadam                                       │
├──────────────────────────────────────────────────────────────┤
│  5. Yozib qo'y                                                │
│     $ git add -A && git commit -m "V-XXX: <tavsif>"          │
│     $ python3 ROADMAP/03_HOLAT/update_progress.py V-XXX ok   │
├──────────────────────────────────────────────────────────────┤
│  6. 1-qadamga qayt  ← TO'XTAMA, keyingi vazifaga o't         │
│     V-234 tugaguncha yoki foydalanuvchi to'xtatguncha        │
└──────────────────────────────────────────────────────────────┘
```

## ⛔ Qachon TO'XTASH kerak

| Holat | Nima qilish |
|---|---|
| Test 3 marta ketma-ket o'tmadi | To'xta, muammoni PROGRESS.md ga yoz, foydalanuvchiga ayt |
| Vazifada API kaliti kerak, lekin `.env` bo'sh | Shu vazifani `skip` qil, keyingisiga o't, oxirida ayt |
| Vazifa TZ da noaniq | INDEKS orqali qidir; topilmasa — eng oddiy variantni tanla va PROGRESS ga yoz |
| Faza tugadi | Faza qabul checklistini tekshir, keyin keyingi fazaga o't |
| V-234 tugadi | 🎉 To'xta, hisobot ber |

## ⚡ TOKEN TEJASH (majburiy)

| ❌ Qilma | ✅ Qil |
|---|---|
| `cat TZ_MASTER/*.md` (260 KB) | `grep -A 45 "class Order" TZ_MASTER/04_*.md` (2 KB) |
| Butun faza faylini o'qish | `grep -A 60 "## V-043" FAZA_02_MENYU.md` |
| Har vazifada qoidalarni qayta o'qish | Bir marta o'qib, yodda tut |
| Yozgan kodni qayta o'qish | Edit natijasiga ishon |
| Bir necha vazifani bitta commitga | 1 vazifa = 1 commit (kontekst toza) |

**Taxminiy token sarfi:**
```
START.md + qoidalar (bir marta)        ~ 6 000 token
Har vazifa (grep + kod yozish)         ~ 3 000 token
234 vazifa                             ~700 000 token
```

---

# 🎯 LOYIHA MAQSADI (1 jumla)

> Restoran stolidagi QR ni skanerlagan mijoz taomni telefon kamerasida
> **real o'lchamda 3D ko'radi**, buyurtma beradi; ofitsiant stol raqamini
> darhol ko'radi; admin hammasini real vaqtda nazorat qiladi.

---

**Hozir nima qilish kerak:** ⬆️ QADAM 1 dan boshla.
