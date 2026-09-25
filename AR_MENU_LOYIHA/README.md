# 🍽️ ARMENU — AR/3D Restoran Menyu Platformasi

> Restoran stolidagi QR ni skanerlagan mijoz taomni telefon kamerasida
> **real o'lchamda 3D ko'radi**, buyurtma beradi; ofitsiant stol raqamini
> darhol ko'radi; admin hammasini real vaqtda nazorat qiladi.

---

## 🚀 ISHNI BOSHLASH

### AI / dasturchi uchun — 1 ta buyruq

```bash
cat ROADMAP/START.md
```

**Boshqa hech narsa o'qish shart emas.** `START.md` sizni qadam-baqadam olib boradi:
holatni aniqlash → kontekst → muhit → faza → ishlash → tekshirish.

### Cursor bilan ishlash uchun

```bash
cat CURSOR_QOLLANMA.md
```

Tayyor promptlar, ish jarayoni, sifat nazorati.

### Odam uchun — loyihani tushunish

```bash
cat ROADMAP/00_BOSHLASH/01_LOYIHA_5_DAQIQADA.md
```

Yoki to'liq hujjat: **[ARMENU_TZ_MASTER.pdf](TZ_MASTER/ARMENU_TZ_MASTER.pdf)** (89 sahifa)

---

## 📁 PAPKA STRUKTURASI

```
AR_MENU_LOYIHA/
│
├── README.md                    ← siz shu yerdasiz
├── .cursorrules                 🖱 Cursor avtomatik o'qiydi (qoidalar)
├── CURSOR_QOLLANMA.md           📖 sizga: promptlar, ish jarayoni
│
├── HANDOFF/                     🤝 Cursor ↔ Arxitektor AI aloqasi
│   ├── HANDOFF_TEMPLATE.md      shablon (A-qism Cursor, B-qism men)
│   └── FAZA_XX_HANDOFF.md       har faza uchun to'ldiriladi
│
├── ROADMAP/                     ⚡ BAJARILADIGAN — AI shu yerdan ishlaydi
│   ├── START.md                 ⭐ KIRISH NUQTASI — birinchi shu o'qiladi
│   │
│   ├── 00_BOSHLASH/
│   │   ├── 01_LOYIHA_5_DAQIQADA.md      loyiha nima (bir marta o'qiladi)
│   │   ├── 02_QOIDALAR.md               qanday kod yoziladi
│   │   └── 03_MUHIT_TAYYORLASH.md       nusxa-ko'chir buyruqlar
│   │
│   ├── 01_FAZALAR/              ⚡ 13 faza · 234 vazifa · 37 617 qator
│   │   ├── FAZA_00_TAYYORGARLIK.md       V-001…V-012  12 vazifa   852 q.
│   │   ├── FAZA_01_TENANT_AUTH.md        V-013…V-030  18 vazifa  2303 q.
│   │   ├── FAZA_02_MENYU.md              V-031…V-054  24 vazifa  2714 q.
│   │   ├── FAZA_03_STOL_QR.md            V-055…V-066  12 vazifa  1180 q.
│   │   ├── FAZA_04_MIJOZ_PWA.md          V-067…V-092  26 vazifa  3293 q.
│   │   ├── FAZA_05_BUYURTMA_REALTIME.md  V-093…V-114  22 vazifa  2996 q.
│   │   ├── FAZA_06_AR_3D.md         ⚡   V-115…V-142  28 vazifa  4977 q.
│   │   ├── FAZA_07_ZAL_PLAN.md           V-143…V-150   8 vazifa  1589 q.
│   │   ├── FAZA_08_ADMIN.md              V-151…V-170  20 vazifa  4598 q.
│   │   ├── FAZA_09_AI_MCP.md             V-171…V-186  16 vazifa  3420 q. → v1 ✅
│   │   ├── FAZA_10_TOLOV_FISKAL.md       V-187…V-204  18 vazifa  3035 q.
│   │   ├── FAZA_11_SODIQLIK.md           V-205…V-218  14 vazifa  3160 q.
│   │   └── FAZA_12_DEPLOY.md             V-219…V-234  16 vazifa  3500 q. → v1.5 ✅
│   │
│   ├── 02_MALUMOTNOMA/
│   │   ├── INDEKS.md            🔍 qaysi javob qaysi faylda (token tejash)
│   │   ├── TEZ_YORDAM.md        ⚡ takrorlanadigan kod naqshlari
│   │   └── TESTLAR.md           🧪 test strategiyasi, majburiy testlar
│   │
│   └── 03_HOLAT/
│       ├── PROGRESS.md          📊 qayerda to'xtaganini ko'rsatadi
│       ├── update_progress.py   🔧 avtomatik yangilash skripti
│       ├── tekshir.sh           ✅ roadmap butunligini tekshiradi
│       └── tekshir_kod.sh       🔍 Cursor yozgan kodni tekshiradi
│
├── ARXITEKTURA/                 🏗 TO'LIQ TIZIM ARXITEKTURASI
│   ├── 00_UMUMIY_KORINISH.md    C4 kontekst, stek, oltin qoidalar
│   ├── 01_PRINTSIPLAR_VA_QARORLAR.md  12 printsip + 15 ADR
│   ├── 02_KOMPONENTLAR.md       konteyner/komponent, modullar
│   ├── 03_MALUMOT_ARXITEKTURASI.md    DB, indeks, partition, kesh
│   ├── 04_MASSHTABLASH.md       S0→S5, 1 mln foydalanuvchi
│   ├── 05_ISHONCHLILIK.md       fault-tolerance, self-healing, DR
│   ├── 06_XAVFSIZLIK.md         tahdid modeli, izolyatsiya, PCI
│   ├── 07_INTEGRATSIYALAR.md    AI/MCP, to'lov, fiskal, Telegram
│   └── 08_DEPLOY_VA_OPERATSIYA.md     infra, CI/CD, monitoring, runbook
│
├── TZ_MASTER/                   📖 MA'LUMOTNOMA — kerak bo'lganda o'qiladi
│   ├── ARMENU_TZ_MASTER.pdf     89 sahifa, to'liq hujjat
│   ├── 01_KIRISH_VA_BIZNES.md   biznes, bozor, investor
│   ├── 02_SAHIFALAR_VA_TUGMALAR.md  har sahifa, har tugma
│   ├── 03_ARXITEKTURA.md        masshtablash, chidamlilik
│   ├── 04_DATA_MODEL_VA_API.md  DB, API, WebSocket
│   ├── 05_KOD_YOZISH_TARTIBI.md fayl strukturasi
│   ├── 06_TARJIMA_VA_UI.md      3 til, dizayn
│   ├── 07_AI_MCP.md             8 AI provayder
│   └── 08_DEPLOY_REJA_RISK.md   deploy, risk, savollar
│
├── BOZOR_TAHLIL.md              bozor: fiskalizatsiya, delivery, turizm
├── _ARXIV/                      eski versiyalar
└── ai agent.mp4                 foydalanuvchi bergan video
```

---

## 👥 ISH TAQSIMOTI

| Ish | Kim |
|---|---|
| Bozor tahlili, biznes-model | Arxitektor AI (Claude) |
| Arxitektura, TZ, roadmap | Arxitektor AI ✅ tayyor |
| **Kod yozish** | **Cursor** (Pro, $20/oy) |
| Handoff hisoboti (A-qism) | Cursor |
| Kod tekshirish, handoff (B-qism) | Arxitektor AI |
| Koordinatsiya | Siz |

**Sikl:** Cursor faza yozadi → handoff to'ldiradi → siz menga yuborasiz →
men tekshiraman → ✅ qabul yoki ❌ tuzatish → keyingi faza.

Batafsil: [CURSOR_QOLLANMA.md](CURSOR_QOLLANMA.md)

---

## 📊 HOZIRGI HOLAT

```bash
# Qayerda to'xtaganini ko'rish
python3 ROADMAP/03_HOLAT/update_progress.py --status

# Roadmap butunligini tekshirish
bash ROADMAP/03_HOLAT/tekshir.sh
```

| | |
|---|---|
| **Roadmap** | ✅ TO'LIQ — 13 faza, 234 vazifa, 39 650 qator |
| **Kod** | 🔴 Boshlanmagan — ruxsat kutilmoqda |
| **Keyingi vazifa** | V-001 (muhit tayyorlash) |
| **v1 muddat** | 15 hafta (186 vazifa) |
| **v1.5 muddat** | 19,5 hafta (234 vazifa) |

---

## ⚡ ASOSIY FAKTLAR

| | |
|---|---|
| **Stack** | Django 5 + DRF + Channels · PostgreSQL + pgvector · Redis |
| **Frontend** | PWA (ilova YO'Q) · Telegram Mini App |
| **AR** | `<model-viewer>` → iOS: USDZ · Android: GLB |
| **3 rol** | Mijoz (QR) · Ofitsiant (PIN) · Admin (login) |
| **Tillar** | O'zbek · Rus · Ingliz (100% qamrov) |
| **AI** | 8 provayder MCP orqali (fallback zanjiri) |
| **To'lov** | Payme · Click · Uzum (`paytechuz`) |
| **Fiskal** | UZKASSA · e-POS (OFD) + IKPU |
| **Port** | web `8060` · ws `8061` |
| **DB** | `armenu_db` · Redis `db=5/6` |

---

## ⛔ IZOLYATSIYA (o'zgarmas qoida)

Bu **alohida loyiha**. `mebelcity_platform` ga hech qanday tegish yo'q:

| | ARMENU | mebelcity_platform |
|---|---|---|
| Papka | `/home/user/armenu/` | TEGILMAYDI |
| DB | `armenu_db` | `tenant_*` TEGILMAYDI |
| Redis | `db=5`, `db=6` | `db=0..4` TEGILMAYDI |
| Port | 8060, 8061 | 8040, 8041 TEGILMAYDI |
| Servis | `armenu*.service` | `bittada-*` TEGILMAYDI |

---

## 🎯 BOZOR (qisqacha)

| | |
|---|---|
| O'zbekistonda ovqatlanish korxonalari | **27 312** |
| Sektor daromadi (I chorak 2026) | **49,8 trln so'm** (+8,2%) |
| Xalqaro turistlar (7 oy 2026) | **7,75 mln** (+22,6%) |
| **AR/3D raqobatchi** | **0 ta** ✅ |
| Break-even | 11-oy |
| 3-yil prognoz | ~2,6 mlrd so'm daromad |

Batafsil: [BOZOR_TAHLIL.md](BOZOR_TAHLIL.md)

---

## ❓ KOD BOSHLASHDAN OLDIN

12 ta savolga javob kerak — [TZ_MASTER/08_DEPLOY_REJA_RISK.md](TZ_MASTER/08_DEPLOY_REJA_RISK.md) §7.

Eng muhim 5 tasi:
1. Server: alohida VPS? *(tavsiya: ha)*
2. Domen va brend nomi?
3. Pilot restoran bormi? *(5 ta kerak)*
4. Kim yozadi? *(2 dasturchi — 15 hafta)*
5. AI API kalitlari bormi? *(kamida 3 ta)*
