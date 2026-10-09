# 🔍 MA'LUMOTNOMA INDEKSI — token tejash uchun

> **Maqsad:** Butun faylni o'qimasdan, aynan kerakli bo'limni topish.
> `TZ_MASTER/` fayllari jami 260 KB (~70 000 token). To'liq o'qish — **isrof**.
> Bu indeks orqali 2-5 KB o'qib, javobni topasan.

---

## ⚡ QANDAY ISHLATILADI

```bash
# 1. Indeksdan bo'lim raqamini top
grep -i "izlagan_narsang" ROADMAP/02_MALUMOTNOMA/INDEKS.md

# 2. Faqat o'sha bo'limni o'qi
sed -n '340,420p' "TZ_MASTER/04_DATA_MODEL_VA_API.md"

# yoki
grep -A 45 "class Order" "TZ_MASTER/04_DATA_MODEL_VA_API.md"
```

---

## 📁 FAYL 01 — `TZ_MASTER/01_KIRISH_VA_BIZNES.md` (24 KB)

**Qachon kerak:** biznes qarori, narx, bozor raqami, investor savoli

| § | Mavzu | Kalit so'zlar |
|---|---|---|
| 1 | Hujjat haqida | kim o'qiydi, printsip |
| 2 | Loyiha mohiyati | nima quriladi, nima uchun ishlaydi |
| 3 | ⛔ Izolyatsiya kafolati | mebelcity, port, DB, servis |
| 4 | Biznes-model | daromad oqimi, **tarif narxlari**, birlik iqtisodiyoti, LTV/CAC |
| 4.4 | **6/12/24 oylik maqsad** | viloyat, respublika, qo'shni davlat |
| 4.5 | **5 yil himoya devorlari** | moat, kutubxona, platforma effekti |
| 5 | Bozor raqamlari | 27312 korxona, turizm, TAM/SAM/SOM |
| 6 | Raqobat matritsasi | Dastur-xon, Zoomda, iiko, pozitsiyalash |
| 7 | Sotuv strategiyasi | pitch, kanallar, CAC |
| 8 | Investor | investitsiya, metrika, exit |
| 9 | Restoran egasi | "men nima olaman", xavotirlar |
| 10 | Davlat | fiskalizatsiya, qonun |
| 11 | Foydalanuvchi | mijoz hikoyasi, turist |

---

## 📁 FAYL 02 — `TZ_MASTER/02_SAHIFALAR_VA_TUGMALAR.md` (68 KB) ⭐ eng ko'p kerak

**Qachon kerak:** "bu tugma nima qiladi", "bu sahifada nima bor"

### Mijoz sahifalari
| Kod | Sahifa | Qidiruv |
|---|---|---|
| M-01 | QR kirish (redirect) | `grep -A 60 "## M-01"` |
| M-02 | Menyu (bosh sahifa) | `grep -A 70 "## M-02"` |
| M-04 | Taom kartochkasi (modal) | `grep -A 60 "## M-04"` |
| **M-05** | ⚡ **AR ko'rish** | `grep -A 90 "## M-05"` |
| M-06 | Savat + submitOrder() | `grep -A 80 "## M-06"` |
| M-08 | Buyurtma holati (real-time) | `grep -A 40 "## M-08"` |
| M-09 | Chaqiruv | `grep -A 25 "## M-09"` |
| M-10 | Hisob va to'lov | `grep -A 70 "## M-10"` |
| M-11 | Choychaqa (tips) | `grep -A 25 "## M-11"` |
| M-12 | Otziv + Google filtri | `grep -A 45 "## M-12"` |
| M-13 | AI chatbot | `grep -A 55 "## M-13"` |

### Ofitsiant
| Kod | Sahifa |
|---|---|
| O-01 | PIN kirish |
| O-02 | Bosh ekran (yangi buyurtmalar) |
| O-05 | 2D zal plani |

### KDS / Admin / Super-admin
| Kod | Sahifa |
|---|---|
| K-01 | Oshxona monitori (kanban) |
| A-01 | Dashboard |
| **A-04** | ⚡ 3D model boshqaruvi + AI yaratish zanjiri |
| A-05 | Stollar va QR |
| A-10 | AR analitika |
| A-15 | Tarjima boshqaruvi |
| P-02 | 3D kutubxona (super-admin) |
| P-04 | Tizim salomatligi |

---

## 📁 FAYL 03 — `TZ_MASTER/03_ARXITEKTURA.md` (36 KB)

**Qachon kerak:** masshtablash, xato, tiklanish, xavfsizlik

| § | Mavzu | Kalit so'zlar |
|---|---|---|
| 1 | Arxitektura printsiplari | stateless, idempotency, circuit breaker |
| 2 | Umumiy arxitektura | CDN, LB, web, WS, DB, worker |
| 3 | Modullar | Django app'lar, bog'liqlik |
| 4 | **Masshtablash** | S0…S5 bosqichlar |
| 4.2 | ⚡ **1 mln bir vaqtda** | WS optimizatsiya, DB, narx |
| 4.3 | Kod qoidalari | N+1, iterator, cache |
| 5 | **Xatolarga chidamlilik** | yiqilish matritsasi |
| 5.2 | Circuit breaker (kod) | CLOSED/OPEN/HALF_OPEN |
| 5.3 | Retry siyosati | urinish, kechikish |
| 5.4 | Graceful degradation | fallback zanjirlari |
| 6 | **Self-healing** | 15 mexanizm, daemon kodi |
| 6.3 | Chaos engineering | atayin yiqitish |
| 7 | SLA/SLO | javob vaqti, mavjudlik, RPO/RTO |
| 8 | Xavfsizlik | qatlamlar, tenant izolyatsiya, rate limit |
| 9 | Kuzatuv | Prometheus metrikalar, alertlar |
| 10 | Backup | chastota, tiklash |

---

## 📁 FAYL 04 — `TZ_MASTER/04_DATA_MODEL_VA_API.md` (36 KB) ⭐ eng ko'p kerak

**Qachon kerak:** model maydonlari, API format, WS xabar

### Modellar (§1)
| Model | Qidiruv |
|---|---|
| Restaurant | `grep -A 55 "class Restaurant"` |
| Hall, Table | `grep -A 45 "class Table"` |
| Category, Dish | `grep -A 60 "class Dish"` |
| **DishLibrary** ⚡ | `grep -A 40 "class DishLibrary"` |
| DishModel3D | `grep -A 25 "class DishModel3D"` |
| ARView | `grep -A 20 "class ARView"` |
| **Order** | `grep -A 45 "class Order"` |
| Holat mashinasi | `grep -A 30 "ALLOWED = {"` |
| Qolgan jadvallar | `grep -A 20 "Qolgan jadvallar"` |

### API (§2)
| Nima | Qidiruv |
|---|---|
| Umumiy qoidalar | `grep -A 15 "2.1 Umumiy qoidalar"` |
| **Xato formati + kodlar** | `grep -A 30 "2.2 Xato formati"` |
| Endpoint ro'yxati (to'liq) | `grep -A 80 "2.3 Endpointlar"` |
| **GET /v1/menu/{slug}/** | `grep -A 55 "GET /v1/menu"` |
| **POST /v1/orders/** | `grep -A 90 "POST /v1/orders/"` |
| create_order() to'liq kod | `grep -A 70 "def create_order"` |

### WebSocket (§3)
| Nima | Qidiruv |
|---|---|
| Ulanish nuqtalari | `grep -A 12 "3.1 Ulanish"` |
| Xabar turlari | `grep -A 25 "3.3 Xabar turlari"` |
| ReliableWS klient | `grep -A 40 "class ReliableWS"` |

---

## 📁 FAYL 05 — `TZ_MASTER/05_KOD_YOZISH_TARTIBI.md` (28 KB)

**Qachon kerak:** fayl strukturasi, vazifa ro'yxati

> ⚠️ Bu fayl **eskirgan** — vazifalar endi `ROADMAP/01_FAZALAR/` da to'liq yozilgan.
> Faqat **fayl strukturasi** (§0) uchun kerak bo'lishi mumkin.

| § | Mavzu |
|---|---|
| 0 | **Fayl strukturasi** (to'liq daraxt) |
| 1-12 | Vazifalar ro'yxati (→ FAZALAR papkasiga ko'chirilgan) |

---

## 📁 FAYL 06 — `TZ_MASTER/06_TARJIMA_VA_UI.md` (24 KB)

**Qachon kerak:** tarjima, rang, shrift, komponent

| § | Mavzu | Kalit so'zlar |
|---|---|---|
| 1 | 3 tilli tizim | qamrov, 3 qatlam |
| 1.3 | ⚡ **i18n JSON tuzilmasi** | to'liq lug'at namunasi |
| 1.4 | JS t() funksiyasi | loadI18n, applyI18n, switchLang |
| 1.5 | CI tekshiruvi | kalitlar mos, bo'sh yo'q |
| 1.6 | AI avto-tarjima | prompt, servis |
| 2.2 | ⚡ **Rang tizimi (CSS)** | `:root`, dark, light |
| 2.3 | Tipografiya | shrift, o'lchamlar |
| 2.4 | KDS uslubi | neon, katta shrift |
| 2.5 | Komponentlar | button, card, modal, toast |
| 2.6 | Animatsiyalar | davomiylik |
| 2.8 | Ochiqlik | kontrast, ARIA |
| 3 | PWA | manifest, service worker, offline |

---

## 📁 FAYL 07 — `TZ_MASTER/07_AI_MCP.md` (28 KB)

**Qachon kerak:** AI provayder, chatbot, tarjima

| § | Mavzu | Kalit so'zlar |
|---|---|---|
| 2 | MCP arxitekturasi | diagramma |
| 3 | **8 provayder ro'yxati** | narx, env kalit, vazifalar |
| 4.1 | MCPProvider baza sinf | ABC, Request, Response |
| 4.2 | Claude provayder (kod) | namuna |
| 4.3 | Meshy provayder (kod) | 3D, poll |
| 4.4 | ⚡ **MCPRouter (kod)** | fallback, kesh, byudjet |
| 4.5 | Ishlatilishi | `mcp.run(...)` |
| 5 | API key boshqaruvi | .env, xavfsizlik |
| 6 | AI vazifalari + xarajat | oylik $ |
| 7 | **Chatbot** | system prompt, servis, kontekst |
| 8 | Testlar | fallback, byudjet |
| 9 | AI kuzatuvi | P-05 sahifasi |

---

## 📁 FAYL 08 — `TZ_MASTER/08_DEPLOY_REJA_RISK.md` (20 KB)

**Qachon kerak:** deploy, konfig, risk, savol

| § | Mavzu |
|---|---|
| 1.2 | ⚡ **systemd servislar** (to'liq konfig) |
| 1.3 | **nginx konfig** (to'liq) |
| 1.4 | CI/CD (GitHub Actions) |
| 2 | To'liq reja (hafta-hafta) |
| 2.4 | 6/12/24 oylik yo'l xaritasi |
| 3 | Jamoa |
| 4 | **Risk matritsasi** |
| 5 | Sifat nazorati, test qamrovi |
| 6 | ⚡ **Qabul mezonlari (v1)** |
| 7 | 12 ta ochiq savol |

---

## 🎯 TEZ JAVOBLAR (eng ko'p so'raladigan)

| Savol | Javob |
|---|---|
| Port qaysi? | web **8060**, ws **8061** |
| Redis DB? | `db=5` (cache), `db=6` (channels) |
| DB nomi? | `armenu_db` |
| GLB maks hajm? | **3 MB** |
| USDZ maks hajm? | **5 MB** |
| AR o'lcham atributi? | `ar-scale="fixed"` + model **metrda** |
| WS guruh nomi? | `rest_<id>_kds`, `rest_<id>_waiters`, `guest_<sid>` |
| Tarif narxlari? | FREE 0 / START 199k / PRO 590k / FISKAL 890k |
| Test qamrovi? | ≥75% umumiy, ≥90% orders/payments/tenants |
| Buyurtma holatlari? | new→accepted→cooking→ready→served→paid |
| Tillar? | uz, ru, en |
| AI provayderlar? | Claude, Gemini, OpenAI, Groq, DeepSeek, Mistral, Meshy, Tripo |
| Chaqiruv cooldown? | 60 soniya |
| Idempotency TTL? | 24 soat |
| Menyu kesh TTL? | 60 soniya |
