# 🖱 CURSOR QO'LLANMA — sizga

> **Sizning roli:** koordinator. Cursor kod yozadi, men (arxitektor AI) tekshiraman.
> Bu faylda: Cursor'ni sozlash, tayyor promptlar, ish jarayoni.

---

## 1. 🎬 BIR MARTALIK TAYYORGARLIK

### 1.1 Loyihani ko'chirish

```bash
# Hujjatlarni yangi loyiha papkasiga ko'chirish
mkdir -p /home/user/armenu
cp -r "/home/user/mebelcity_platform/sketchup fayllar/AR_MENU_LOYIHA/ROADMAP"   /home/user/armenu/
cp -r "/home/user/mebelcity_platform/sketchup fayllar/AR_MENU_LOYIHA/TZ_MASTER" /home/user/armenu/
cp -r "/home/user/mebelcity_platform/sketchup fayllar/AR_MENU_LOYIHA/HANDOFF"   /home/user/armenu/
cp "/home/user/mebelcity_platform/sketchup fayllar/AR_MENU_LOYIHA/.cursorrules" /home/user/armenu/
cp "/home/user/mebelcity_platform/sketchup fayllar/AR_MENU_LOYIHA/README.md"    /home/user/armenu/
cd /home/user/armenu && git init
```

### 1.2 Cursor'da ochish
```
Cursor → File → Open Folder → /home/user/armenu
```

`.cursorrules` avtomatik yuklanadi — Cursor qoidalarni biladi.

### 1.3 Cursor sozlamalari (tavsiya)

| Sozlama | Qiymat | Nega |
|---|---|---|
| Model | **Claude Sonnet** (yoki eng kuchli mavjud) | Kod sifati |
| Mode | **Agent** | Fayl yaratadi, terminal ishlatadi |
| Auto-run commands | ✅ yoqilgan | `pytest`, `git` o'zi ishlatadi |
| Codebase indexing | ✅ yoqilgan | Fayllarni ko'radi |
| Max context | eng katta | Faza fayllari uzun |

---

## 2. 💬 TAYYOR PROMPTLAR (nusxa oling)

### 2.1 ⭐ Loyihani boshlash (birinchi marta)

```
ROADMAP/START.md faylini o'qi va ko'rsatmalarga amal qil.

FAZA 0 (V-001…V-012) ni to'liq bajar:
- Har vazifani ketma-ket
- Har vazifadan keyin test + commit + progress yangilash
- To'xtama, faza tugaguncha davom et

Faza tugagach:
1. Faza qabul checklistini tekshir
2. HANDOFF/HANDOFF_TEMPLATE.md dan nusxa ol → HANDOFF/FAZA_00_HANDOFF.md
3. A-qismni to'liq va HALOL to'ldir (ayniqsa 4-bo'lim: muammolar)
4. To'xta va menga xabar ber
```

### 2.2 Keyingi fazani boshlash

```
ROADMAP/03_HOLAT/PROGRESS.md ni tekshir va keyingi fazadan davom et.

Oldingi faza handoffini ham o'qi:
HANDOFF/FAZA_XX_HANDOFF.md — B-qismdagi "TUZATISH KERAK" bo'limi

Avval o'sha tuzatishlarni qil, keyin yangi fazaga o't.
Faza tugagach handoff to'ldir va to'xta.
```

### 2.3 Tuzatish (men xato topganimda)

```
HANDOFF/FAZA_XX_HANDOFF.md faylining B-qismini o'qi.
11-bo'limdagi "TUZATISH KERAK" ro'yxatidagi hamma narsani tuzat.

Tuzatgach:
- Testlarni qayta ishga tushir
- Handoff A-qismiga "Tuzatildi" bo'limi qo'sh
- To'xta
```

### 2.4 Cursor to'xtab qolsa / adashsa

```
To'xta. Hozirgi holatni ayt:
1. Qaysi vazifada to'xtading? (V-XXX)
2. Nima ishlamayapti?
3. Qanday xato chiqdi? (to'liq matn)

Hech narsa qilma, faqat javob ber.
```

### 2.5 Faqat bitta vazifa

```
Faqat V-043 vazifasini bajar. Keyingisiga o'tma.

grep -A 60 "## V-043" ROADMAP/01_FAZALAR/FAZA_02_MENYU.md
```

---

## 3. 🔄 ISH JARAYONI (siklik)

```
┌─────────────────────────────────────────────────────────┐
│ 1. SIZ → Cursor:  "FAZA_XX ni boshla" (2.1 yoki 2.2)   │
│                    ↓                                     │
│ 2. Cursor:  N ta vazifani bajaradi (1-2 hafta)          │
│             test → commit → progress                     │
│                    ↓                                     │
│ 3. Cursor:  FAZA_XX_HANDOFF.md A-qismini to'ldiradi     │
│             va to'xtaydi                                 │
│                    ↓                                     │
│ 4. SIZ → menga:  handoff faylni yuborasiz               │
│                    ↓                                     │
│ 5. MEN:  tekshir_kod.sh + kod ko'rigi                   │
│          B-qismni to'ldiraman                            │
│          ✅ qabul  /  ❌ tuzatish ro'yxati               │
│                    ↓                                     │
│ 6. ❌ bo'lsa → 2.3 prompti bilan Cursor'ga qaytarasiz   │
│    ✅ bo'lsa → keyingi fazaga (1-qadam)                 │
└─────────────────────────────────────────────────────────┘
```

**Vaqt taqsimoti:**
| Kim | Faza uchun |
|---|---|
| Cursor | 1-2,5 hafta (kod) |
| Men | ~15 daqiqa (tekshiruv) |
| Siz | ~10 daqiqa (fayl uzatish) |

---

## 4. 📤 MENGA NIMA YUBORASIZ

Faza tugagach menga **shu xabarni** yozing:

```
FAZA_XX tugadi. Handoff tekshir:
/home/user/armenu/HANDOFF/FAZA_XX_HANDOFF.md
```

Men o'zim:
- Handoffni o'qiyman
- `tekshir_kod.sh` ni ishga tushiraman
- Kodning muhim joylarini ko'raman
- B-qismni to'ldiraman
- Qaror aytaman

---

## 5. ⚠️ CURSOR BILAN TIPIK MUAMMOLAR

| Muammo | Belgisi | Yechim |
|---|---|---|
| **Kontekst yo'qolishi** | "Biz nima qilayotgan edik?" | Yangi chat + prompt 2.2 |
| **TODO yozadi** | Kodda `# TODO: implement` | *"Qoida #5 buzilgan. To'liq yoz."* |
| **Vazifa sakraydi** | V-042 dan V-045 ga | *"Tartibni buzding. V-043 dan davom et."* |
| **Test yiqilganda davom etadi** | Qizil testlar bor | *"Test o'tmasa davom etma. Tuzat."* |
| **TZ_MASTER'ni to'liq o'qiydi** | Uzoq kutish, ko'p token | *"Faqat grep bilan kerakli qismini o'qi."* |
| **O'zicha funksiya qo'shadi** | TZ da yo'q narsa | *"TZ dan chetga chiqma. Handoff'ga yoz."* |
| **Handoff yuzaki** | 4-bo'lim bo'sh | *"Muammolar bo'limini halol to'ldir."* |
| **Sekin ishlaydi** | 1 vazifa = 30 daqiqa | Yangi chat oching (kontekst tozalanadi) |

---

## 6. 🎯 SIFAT NAZORATI (siz o'zingiz)

Faza oxirida menga yubormasdan oldin tez tekshiring:

```bash
cd /home/user/armenu

# 1. Placeholder bormi?
grep -rn "TODO\|FIXME" apps/ core/ static/ | head

# 2. Testlar o'tadimi?
pytest tests/ -q

# 3. Progress to'g'rimi?
python3 ROADMAP/03_HOLAT/update_progress.py --status

# 4. To'liq tekshiruv
bash ROADMAP/03_HOLAT/tekshir_kod.sh
```

Agar 1-punktda natija chiqsa yoki 2-punkt yiqilsa — **menga yubormang**, avval Cursor'ga tuzattiring.

---

## 7. 💰 XARAJAT

| | |
|---|---|
| Cursor Pro | **$20/oy** |
| Loyiha davomiyligi | ~5 oy (19,5 hafta) |
| **Cursor jami** | **~$100** |
| Men (tekshiruv) | 13 faza × ~15 daq |

---

## 8. 🚨 QACHON MENGA MUROJAAT QILISH

| Holat | Menga aytish |
|---|---|
| Faza tugadi | ✅ Har doim |
| Cursor 3 marta bir xil xatoni takrorladi | ✅ Ha |
| Arxitektura savoli chiqdi | ✅ Ha |
| TZ da yo'q funksiya kerak bo'ldi | ✅ Ha |
| Bitta test yiqildi | ❌ Cursor o'zi tuzatsin |
| Sintaksis xatosi | ❌ Cursor o'zi |
| "Bu qanday ishlaydi?" | ❌ INDEKS.md dan qarang |

---

## 9. 📋 FAZALAR RO'YXATI (nazorat uchun)

| Faza | Vazifa | Muddat | Cursor | Men |
|---|---|---|---|---|
| 00 Tayyorgarlik | 12 | 3 kun | ⬜ | ⬜ |
| 01 Tenant + Auth | 18 | 1 hafta | ⬜ | ⬜ |
| 02 Menyu | 24 | 2 hafta | ⬜ | ⬜ |
| 03 Stol + QR | 12 | 1 hafta | ⬜ | ⬜ |
| 04 Mijoz PWA | 26 | 2 hafta | ⬜ | ⬜ |
| 05 Buyurtma + realtime | 22 | 2 hafta | ⬜ | ⬜ |
| 06 ⚡ AR/3D | 28 | 2,5 hafta | ⬜ | ⬜ |
| 07 Zal plani | 8 | 1 hafta | ⬜ | ⬜ |
| 08 Admin | 20 | 1,5 hafta | ⬜ | ⬜ |
| 09 AI + MCP | 16 | 1,5 hafta | ⬜ | ⬜ |
| **v1 TUGADI** | **186** | **15 hafta** | | |
| 10 To'lov + fiskal | 18 | 2 hafta | ⬜ | ⬜ |
| 11 Sodiqlik | 14 | 1,5 hafta | ⬜ | ⬜ |
| 12 Deploy | 16 | 1 hafta | ⬜ | ⬜ |
| **v1.5 TUGADI** | **234** | **19,5 hafta** | | |

---

## 10. ⚡ ENG MUHIM MASLAHAT

> **Cursor'ga ishonmang — tekshiring.**
>
> U tez yozadi, lekin:
> - "Bajarildi" deb yozib, yarim qilishi mumkin
> - Test yiqilsa ham davom etishi mumkin
> - TZ ni "o'ziga qulay" talqin qilishi mumkin
>
> Shuning uchun handoff + tekshiruv tizimi bor. **Har faza oxirida albatta menga yuboring.**
