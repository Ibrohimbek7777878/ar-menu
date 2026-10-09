# 🏛️ "GULISTON RESTORAN" — IMPECCABLE UI/UX DIZAYN VA TRANSFORMATSIYA TEXNIK TOPSHIRIG'I (TZ)

> **Maqsad:** Sun'iy intellekt tomonidan yaratilgan barcha "arzon, sun'iy va yaltiroq" dizayn andozalarini (AI clichés, neon gradientlar, emoji spami, glassmorphism overkill, balandparvoz robotcha shiorlar) to'liq olib tashlash. O'rniga dunyo darajasidagi yetakchi restoran tizimlari (Toast POS, OpenTable, Yandex Eats, Wolt darajasida) kabi toza, qulay, samimiy, inson qo'li bilan chizilgan professional interfeys yaratish.

---

## 🔍 1-BO'LIM: LOYIHADAGI KAMCHILIKLAR VA SUN'IYLIKLAR AUDITI

| # | Kamchilik / Sun'iylik (AI Cliché) | Qayerda uchraydi? | Nima uchun yomon? | Qanday to'g'rilanadi? (Human-Crafted) |
|---|---|---|---|---|
| 1 | **Glassmorphism & Blur Overkill** | `DishCard`, `ARMenuPage`, `Modal3D` | `backdrop-filter: blur(8px)` har bir kartochkada bor. Mobil qurilmalarda qotadi, loyqalanadi, "AI shablon" taassurotini uyg'otadi. | Toza qattiq fonlar (`#FFFFFF` yoki chuqur `#1A2E20`), nozik 1px neytral chegaralar (`border: 1px solid #E8E0CF`). |
| 2 | **Balandparvoz / Robotcha Shiorlar** | Welcome, AR Menu, Waiter, Hostess | *"3D / AR INTERAKTIV VOQELIK"*, *"OILA DASTURXONI"*, *"Haqiqiy o'zbek mehmondo'stligi..."* kabi soxta marketing iboralari. | Samimiy, lo'nda va tabiiy o'zbek tili: *"Taomlar Menyusi"*, *"3D Ko'rinish"*, *"Buyurtma berish"*, *"Stol 4"*. |
| 3 | **Emoji Spami (Ortiqcha smayliklar)** | Hamma sarlavha, tugma va teglarda | `✨`, `🏛️`, `🍲`, `⚡`, `🍽️`, `🪑`, `👥`, `⏰`, `📝`, `👋`, `🔔`, `🧾` har bir so'z yoniga tiqilgan. Bolalar dasturiga o'xshab qolgan. | Emojilar o'rniga nozik, minimalist 16-20px monoxrom SVG ikonlar va toza shrift ierarxiyasi. |
| 4 | **Yaltiroq Neon / Radial Glow** | `ARMenuPage` (.ar-hero-glow), `WelcomePage` | Ortiqcha to'q sariq va neon yashil nur taratuvchi sun'iy radial gradientlar. | Toza, tekis, chuqur oliyjanob Forest Green (`#1E3324`) va Warm Ivory (`#F8F5EE`). |
| 5 | **Ko'zni charchatuvchi doimiy animatsiyalar** | `KDSPage` (.timer-alert, kdsPulse) | Sekundomerlar doimiy kattalashib-kichrayib yonib-o'chadi. Oshpaz 8 soat qarasa boshi og'riydi. | Tebranishsiz, xotirjam qat'iy rangli holat ko'rsatkichlari (Static Status Pills: Yashil, Sariq, Qizil). |
| 6 | **Tipografik nomutanosiblik** | POS, KDS, Admin dashboardlarida | `Playfair Display` serif shrifti tezkor ishchi panellarda (POS, KDS) ham ishlatilgan. | Serif faqat mehmonga qaratilgan bosh menyu va brend nomida qoladi. POS, KDS va Admindagi operatsiyalar qat'iy **Plus Jakarta Sans / Inter** da bo'ladi. |
| 7 | **Kichik tap-targetlar (Barmoq tekkizish noqulayligi)** | Kartalardagi tugmalar, xochchalar | 24-28px li kichik tugmalar. Katta barmoq bilan bosganda xato bosiladi. | Minimum 44x44px ergonomik sensorli bosish maydoni (Apple & Google standartlari). |
| 8 | **Pastki qatlam (Safe Area Inset)** | `BottomNav`, Mobil checkout | iPhone pastki boshqaruv chizig'iga taqalib qoladi. | `padding-bottom: env(safe-area-inset-bottom, 16px)` qo'shiladi. |

---

## 🎨 2-BO'LIM: YANGI DESIGN SYSTEM & VIZUAL FALSAFA

### 1. Ranglar Palitrasi (60 - 30 - 10 qoidasi):
- **Asosiy Fon (60%):** `#F8F5EE` (Nafis Warm Cream / Fil suyagi) — ko'zni toliqtirmaydi, oq qog'ozdek samimiy;
- **Kartochkalar & Bloklar (30%):** `#FFFFFF` (Toza oq, nozik `#EAE4D7` chegarasi bilan);
- **Brend & Matn Rangi (10%):**
  - Matn: `#1C1917` (Stone-900, to'liq o'qiladigan chuqur qora-jigarrang);
  - Ikkinchi darajali matn: `#57534E` (Stone-600);
  - Brend Urg'usi (Accent): `#213827` (Deep Forest Green — oliyjanob, xotirjam yashil);
  - Issiq Urg'u: `#B45309` (Amber — issiq taomlar va diqqat markazi);
  - Xatolik/Bekor qilish: `#DC2626` (Ruby Red).

### 2. Tipografiya Qoidalari:
- **Display / Brend:** `Playfair Display` — faqatgina restoran nomi, bosh sahifa sarlavhasi va asosiy menyu toifalarida;
- **UI / Matn / POS / KDS:** `Plus Jakarta Sans` — 400 (oddiy), 550 (o'rtacha), 700 (qalin);
- **Narxlar va Raqamlar:** Tabular raqamlar (`font-variant-numeric: tabular-nums; font-weight: 700`).

### 3. Spacing & Ergonomika:
- 8px to'r tizimi (`gap: 8px, 12px, 16px, 24px`);
- Kartochkalar burchak radiusi: `12px` (kichik chiplar), `16px` (kartalar), `20px` (modal/sheet);
- Shadow (Soya): Sun'iy qalin qora soyalar o'rniga nafis yumshoq soya: `box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04), 0 4px 12px rgba(28, 25, 23, 0.03)`.

---

## 📱 3-BO'LIM: SAHIFAMA-SAHIFA TRANSFORMATSIYA REJASI

### 1. `DishCard` (Taom Kartochkasi — Eng muhim element):
- **O'zgarish:**
  - Glassmorphism badge olib tashlanadi. O'rniga rasmning yuqori chap burchagida toza kichik oq tabletka: `3D Ko'rish` (nozik kubik ikonchasi bilan);
  - Taom rasmi to'liq tabiiy nisbatda (16:10 yoki 4:3), xira filtrlarsiz;
  - Narx aniq, qalin va birinchi o'qiladigan darajada: masalan: **45 000 so'm**;
  - `+ Savatga` tugmasi barmoq bilan bosishga juda qulay, bir bosganda silliq `- 1 +` stepperiga aylanadi.

### 2. `WelcomePage` (Kirish Sahifasi):
- **O'zgarish:**
  - Balandparvoz *"Oila dasturxoni"*, *"Voqelik"* kabi shiorlar olib tashlanadi;
  - Restoran logotipi, nomi, mehmon turgan stol raqami yoki zalni aniqlash;
  - 2 ta aniq, tushunarli katta karta:
    1. **"Menyuni Ko'rish"** (Taomlar va narxlar bilan tanishish);
    2. **"3D Taomlar"** (Interaktiv 3D modellari);
  - Pastda esa xotirjam: *Stol raqami orqali ulanish*.

### 3. `MenuPage` (Asosiy Menyu):
- **O'zgarish:**
  - Kategoriyalar chiplari toza, tiqilinch bo'lmagan;
  - Filtrlash oson: Issiq taomlar, Kaboblar, Salatlar, Ichimliklar;
  - Qidiruv maydoni qulay, real vaqtda taom nomini topadi;
  - Yuqori qismda stol ma'lumoti (`📍 Stol 4 · Asosiy Zal`).

### 4. `ARMenuPage` (3D Taomlar Ko'rgazmasi):
- **O'zgarish:**
  - Sun'iy radial glow va "Voqelik" so'zlari yo'qotiladi;
  - Toza, qulay 3D galereya: Har bir model ustida 360° aylantirish belgisi;
  - Model bosilganda to'liq ekranga chiqadi: o'lchami, vazni, kaloriyasi, tayyorlanish vaqti va bir bosishda savatga tushishi.

### 5. `CartPage` & `CheckoutPage` (Savat va Rasmiylashtirish):
- **O'zgarish:**
  - Savatdagi har bir taom ravshan ko'rinadi: rasmi, soni, narxi, o'chirish;
  - Rasmiylashtirishda oddiy 3 qadam:
    1. Xizmat turi: Stolga keltirish / Olib ketish;
    2. To'lov turi: Naqd / Karta / Click / Payme;
    3. Buyurtmani tasdiqlash tugmasi (pastda har doim ko'rinib turuvchi Sticky Bar).

### 6. `OrdersPage` (Buyurtmalar & Jonli Hisob):
- **O'zgarish:**
  - Mehmon stolidagi buyurtma statusi tushunarli qadamlarda:
    `Qabul qilindi` $\rightarrow$ `Oshxonada tayyorlanmoqda` $\rightarrow$ `Tayyor` $\rightarrow$ `Stolga keltirildi`;
  - Ofitsiant chaqiruvi bitta qulay tugma bilan (Choy, Non, Hisob);
  - Kassa chekini ko'rish va chop etish.

### 7. `WaiterPanelPage` (Ofitsiant & POS Paneli):
- **O'zgarish:**
  - Serif shriftlar o'rniga to'liq operatsion **Plus Jakarta Sans**;
  - Stollar to'ri (Grid): 1-zal, 2-zal, VIP;
  - Ranglar: Bo'sh (Och yashil kontur), Band (To'q yashil to'ldirilgan), Chek so'ragan (Sariq kontur);
  - Stol ustiga bir tegish $\rightarrow$ Buyurtmalar cheki ochiladi $\rightarrow$ `Taom qo'shish` yoki `To'lovni yopish`.

### 8. `KDSPage` (Oshxona Ekrani):
- **O'zgarish:**
  - Qora-yashil yaltiroq fon o'rniga ko'z charchamaydigan Slate/Zinc Dark fon (`#18181B` yoki `#0F172A`);
  - Cheklar kafel tarzida: Chipta raqami (#102), Stol raqami, buyurtma vaqti;
  - Doimiy pulsatsiyalarsiz xotirjam vaqt sanagichi;
  - Oshpaz uchun katta sensorli tugmalar: `Boshlash` va `Tayyor`.

### 9. `HostessDeskPage` (Kutib Olish Paneli):
- **O'zgarish:**
  - Bugungi bronlar jadvali va kelgan mehmonlarni bo'sh stollarga joylashtirish;
  - Tezkor qidiruv va Walk-in (joyida kelgan) mehmonni ro'yxatdan o'tkazish.

### 10. `AdminDashboardPage` (Boshqaruv Markazi):
- **O'zgarish:**
  - Tushum, buyurtmalar soni, o'rtacha chek va stollar yuklamasi bitta toza analitika panelida;
  - Hech qanday keraksiz jadvallarsiz, aniq raqamlar va grafiklar.

---

## 📝 4-BO'LIM: MATNLARNI TOZALASH LUG'ATI (AI $\rightarrow$ INSON TILI)

| Oldingi sun'iy matn | Yangi insoniy, tabiiy matn |
|---|---|
| `✨ 3D / AR INTERAKTIV VOQELIK` | `3D Taomlar Menyusi` |
| `🏛️ OILA DASTURXONI` | `Guliston Restorani` |
| `Dasturxon Taomlari 3D Ko'rinishda` | `Taomlarni 3D ko'rinishda tomosha qiling` |
| `Har bir taomni 360° burchak ostida aylantiring yoki telefon kamerangiz yordamida stol ustida real hajmini sinab ko'ring` | `Taomni 360° aylantiring yoki kamerada stol ustiga qo'yib ko'ring.` |
| `Xush kelibsiz, Alisher (Navbatchi)! Jonli chaqiruvlar, stollar nazorati va kassa hisob-kitobi.` | `Navbatchi ofitsiant: Alisher · Stollar va chaqiruvlar` |
| `Oshxona barcha buyurtmalarni o'z vaqtida tayyorlab bo'ldi yoki yangi buyurtmalar kutilmoqda.` | `Ayni paytda yangi buyurtmalar yo'q.` |
| `Barcha chaqiruvlar bajarildi. Hozircha yangi so'rovlar yo'q. Stol mehmonlari xizmatdan mamnun.` | `Faol chaqiruvlar mavjud emas.` |

---

## 🚀 5-BO'LIM: AMALGA OSHIRISH BOSQICHLARI

1. **1-Qadam: Design Tokens & CSS tozalash:**
   - `index.css` ga yagona global ranglar, shriftlar va toza soyalarni kiritish;
   - Barcha ortiqcha glassmorphism va sun'iy glow/gradientlarni olib tashlash.
2. **2-Qadam: Asosiy komponentlarni inson qo'li darajasiga olib chiqish:**
   - `DishCard` — yangi nafis, premium va toza ko'rinishga keltirish;
   - `HeaderNav` va `BottomNav` — ortiqcha narsalardan tozalash, mobil safe-area ulash;
   - Tugmalar va nishonlar (Buttons & Badges) — toza va nozik qilish.
3. **3-Qadam: Mijoz sahifalarini tozalash (Welcome, Menu, 3D/AR, Cart, Checkout, Orders):**
   - Matnlarni tabiiy tilga o'tkazish;
   - Emojilarni tozalab, faqat zarur joylarga nozik minimalist ko'rinish berish;
   - Mobil ergonomikani 100% mukammallashtirish.
4. **4-Qadam: Xodimlar panellarini (Ofitsiant, KDS, Hostess, Admin) professional POS/ERP darajasiga olib chiqish:**
   - Operatsion ergonomika, yuqori kontrast, katta sensorli tugmalar.
5. **5-Qadam: Sifat nazorati & Build:**
   - `oxlint` (0 xato), `vite build` va barcha brauzerlarda sinov.
