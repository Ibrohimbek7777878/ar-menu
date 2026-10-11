# 📋 TEXNIK TOPSHIRIQ (TZ): Restoran Interaktiv Menyu va Boshqaruv Tizimini Takomillashtirish (V2)

**Hujjat versiyasi:** 2.0  
**Loyiha:** 3D/AR Restoran Interaktiv Menyusi va Xodimlar Portali  
**Maqsad:** Loyihani to'liq haqiqiy Single Page Application (SPA) arxitekturasiga o'tkazish, gastronomik ishtaha ochuvchi ranglar va zamonaviy tipografiyani joriy qilish, o'zbek tiliga mos semantik qidiruvni yo'lga qo'yish, mobil kartochkalarni qulaylashtirish, texnik so'zlarni xalqona qilish va xodimlar boshqaruvini mobilga moslashtirish.

---

## 🎯 1. Asosiy Talablar va Ularning Yechimlari

### 1.1. To'liq Haqiqiy SPA (Single Page Application)
- **Hozirgi muammo:** Sahifalar o'rtasida o'tishda (`<a href="/menu/">`) brauzer to'liq qayta yuklanmoqda (reload). Bu foydalanuvchi tajribasini sekinlashtiradi va Vercel-da holatni (cart, tanlangan stol, filtrlar) yo'qotadi.
- **Yechim:** 
  - Brauzer qayta yuklanmasdan ishlaydigan ichki Client-Side SPA Router (`navigate(path)` / History API) joriy etish.
  - Sahifalar orasidagi o'tishlar bir zumda, animatsiya bilan, sahifa o'chib-yonmasdan bajariladi.
  - Savat (Cart) va stol ma'lumotlari xotirada (`localStorage` / global state) uzluksiz saqlanadi.

---

### 1.2. Responsive Navigatsiya: Desktopda Yon/Yuqori Bar, Mobilda Pastki Bar
- **Hozirgi muammo:** Pastki navigatsiya bari (BottomNav) katta desktop ekranlarda ham pastda yopishib turibdi. Katta monitorda noqulay va noo'rin ko'rinadi.
- **Yechim:**
  - **Mobil (screens < 768px):** Pastki qulay Thumb-friendly Bottom Bar (Bosh sahifa, Menyu, Savat, Stol, Buyurtmalar).
  - **Desktop va Planshet (screens >= 768px):** 
    - Yuqori nafis Header Bar yoki Chap tomondagi nafis Sidebar Navigation.
    - Katta ekranda pastki bar butunlay yashiriladi (`display: none`).
    - Stollar, qidiruv va savat o'ng tomonda qulay panelda turadi.

---

### 1.3. Zamonaviy Tipografiya (Font Family)
- **Hozirgi muammo:** Ishlatilgan serif shriftlar (`Playfair Display`) ovqatlanish tezkor menyusi uchun og'ir va o'qishni qiyinlashtiradi.
- **Yechim:**
  - Gastronomik interfeyslar uchun jahon standarti bo'lgan zamonaviy, toza, o'qilishi oson va do'stona **Humanist Sans-Serif** shrifti: `'Plus Jakarta Sans'` va sarlavhalar uchun yumshoq jozibador `'Outfit'` / `'Inter'` to'plami.
  - Shrift vaznlari: 400 (oddiy matn), 500 (izohlar), 600 (narx va nomlar), 700 (sarlavhalar).
  - Harf oraliqlari va qator balandliklari (line-height) ko'z charchamaydigan qilib sozlanadi.

---

### 1.4. O'zbek Tili Uchun Aqlli Semantik Qidiruv (Smart Search)
- **Hozirgi muammo:** Agar foydalanuvchi `g'oz`, `go'sht`, `o'sh`, `choy` deb qidirsa, apostroflar (`'`, `‘`, `’`, `ʻ`, `ʼ`) har xil klaviaturalarda har xil yoziladi va oddiy qidiruv topa olmaydi.
- **Yechim:**
  - **Apostrof normallashuvi:** Barcha `‘`, `’`, `ʻ`, `ʼ`, `‘`, `\` belgilari yagona standartga keltiriladi yoki olib tashlanadi.
  - **Fonetika va moslashuvchanlik:**
    - `o'` va `o`, `g'` va `g`, `sh` va `ch` harflarini farqlash va yaqin so'zlarni ham topish.
    - Katta-kichik harflar e'tiborga olinmaydi (`case-insensitive`).
    - Taom nomi, tavsifi va uning toifasi (kategoriya) bo'yicha bir vaqtda qidiradi.
    - Masalan: `gosht`, `go'sht`, `goʻsht`, `gosh` deb yozilsa ham barcha go'shtli taomlar darhol chiqadi.

---

### 1.5. Mobil Kartochkada Narx va "+" Tugmasini Alohida Qatorga Ajratish
- **Hozirgi muammo:** Narx ("48 000 so'm") va "+" savatga qo'shish tugmasi bir qatorda torayib, mobil ekranda bir-biriga urilib qolmoqda.
- **Yechim:**
  - Mobil ko'rinishda:
    - **1-qator:** Taom nomi va tayyorlanish vaqti.
    - **2-qator:** Qisqa tavsif (2 qatorda sig'adigan toza matn).
    - **3-qator (Pastki blok):** 
      - Narx aniq, yirik va qalin shriftda alohida qatorda (`48 000 so'm`).
      - Savatga qo'shish (`+ Qo'shish` yoki miqdor tugmasi) qulay va katta barmoq bilan bosiladigan tugma sifatida alohida joylashadi.

---

### 1.6. Ishtaha Ochuvchi Ranglar Psixologiyasi va Fonni Tiniqlashtirish
- **Hozirgi muammo:** Orqa fon loyqa, kulrang yoki bo'g'iq qaymoq tusida bo'lib qolgan. Ranglar ishtahani uyg'otmaydi.
- **Yechim (Gastronomik Ranglar Nazariyasi):**
  - **Asosiy Ishtaha Ranglari (Primary Palette):**
    - **Saffron Ember / Pishgan Apelsin & Terracotta (`#F97316`, `#EA580C`, `#FF6B35`):** Inson miyasida metabolizm va ishtahani qo'zg'atuvchi eng kuchli meva-ziravor rangi.
    - **Anor & Qizil Qaymoq Aktsenti (`#E11D48`, `#BE123C`):** Yangi pishgan go'sht, pomidor va mevalar assotsiatsiyasi.
    - **Rayhon & Yalpiz Yashili (`#16A34A`):** Yangi uzilgan barra ko'katlar va halollik belgisi.
  - **Fon (Background) Tiniqligi:**
    - Hech qanday bo'g'iq kulrang yoki xira sarg'ish rang yo'q.
    - **Yorug' tema:** Tiniq, musaffo chinni oqligi (`#FFFFFF`) va juda mayin, sof sut tusli yorug' fon (`#FAF7F2`).
    - **Tungi / Qorong'u tema:** Chuqur obsidian shokolad (`#121110`, `#1C1917`) bilan yorqin olovrang aktsentlar — hech qanday changsimon xiraliksiz.

---

### 1.7. Mobilda Taom Tavsifining (Description) Kartochkaga Sig'ishi
- **Hozirgi muammo:** Mobil ekranda matn uzun bo'lsa pastga toshib ketadi yoki kartochka balandligi buziladi.
- **Yechim:**
  - `CSS Line-Clamp: 2` (ko'pi bilan 2 qator, ortiqchasi `...` bilan chiroyli yakunlanadi).
  - Taom ustiga bosilganda esa 3D/Modal oynada butun to'liq tavsifi, kaloriyasi, porsiyasi to'liq ochiladi.
  - Har bir kartochka mobil ekranda bir xil, tekis va chiroyli geometriyada turadi.

---

### 1.8. Texnik Atamalardan Butunlay Voz Kechish (User-Friendly Lug'at)
- **Hozirgi muammo:** "AR", "GLB", "Model Viewer", "Augmented Reality" kabi atamalar oddiy mehmonni chalg'itadi.
- **Yechim (O'zbekona tushunarli so'zlar):**
  - `AR rejimida ko'rish` ➡️ **"Stol ustida ko'rish"** yoki **"Stolingizga qo'ying"**
  - `3D Model` ➡️ **"360° Aylantirish"** yoki **"Jonli ko'rinish"**
  - `GLB/USDZ yuklash` ➡️ **"Kamera orqali ko'rish"**
  - `KDS` ➡️ **"Oshpaz / Oshxona ekrani"**
  - `Hostess Desk` ➡️ **"Kutib olish stoli"**
  - `Table Hub` ➡️ **"Stol xizmatlari"**

---

### 1.9. Paginatsiya va "Yana yuklash" (Load More / Infinite View)
- **Hozirgi muammo:** Barcha taomlar bitta uzun ro'yxatda birdaniga chiqadi.
- **Yechim:**
  - Sahifada boshida 6 yoki 8 ta eng ommabop taom chiqadi.
  - Pastga tushganda: **"Yana taomlarni ko'rish"** (Load More) tugmasi yoki sahifalar soni (1, 2, 3...) ko'rsatiladi.
  - Bu orqali mobil telefon tezroq ishlaydi, internet tejaladi va foydalanuvchi charchamaydi.

---

### 1.10. Mobilga Mos Xodimlar Paneli: Ofitsiant, Oshpaz va Boshqaruvchi
- **Hozirgi muammo:** Xodimlar panellari faqat kompyuter uchun qulaydek tuyulishi mumkin.
- **Yechim:**
  - **Ofitsiant Paneli (`/waiter`):** Mobil telefonga 100% moslashgan. Stollar xaritasi, chaqiruv signallari, stol hisobi 1 ta barmog'i bilan boshqariladi.
  - **Oshxona Ekrani (`/kds`):** Katta planshet va telefonlarga mos — buyurtmalar navbati: "Yangi", "Pishirilmoqda", "Tayyor!".
  - **Admin Boshqaruv Paneli (`/admin`):** Kunlik tushum, faol stollar, eng ko'p sotilgan taomlar va stollar holati.
  - SPA navigatsiyasi orqali bosh menyudan yoki parolli tugma orqali bemalol o'tish mumkin bo'ladi.

---

## 🛠️ 2. Bosqichma-bosqich Bajarish Rejasi

1. **1-bosqich:** Dizayn tizimi va Ranglar palitrasini yangilash (`frontend/src/index.css`) — ishtaha ochuvchi olovrang/terracotta va tiniq chinni oqligi, yangi shriftlar.
2. **2-bosqich:** DishCard va kartochka tuzilmasini yangilash (`DishCard.tsx`, `DishCard.css`) — alohida narx va qo'shish qatori, 2-qatorli line-clamp, texnik atamalarni almashtirish.
3. **3-bosqich:** Desktop Sidebar / Topbar va Mobil BottomNav logikasini yangilash (`HeaderNav.tsx`, `BottomNav.tsx`).
4. **4-bosqich:** Semantik o'zbekcha qidiruv algoritmi va Paginatsiya / Load More tizimini `MenuPage.tsx` ga o'rnatish.
5. **5-bosqich:** Modal3D va AR sahifasidan texnik so'zlarni tozalab, "Stol ustida ko'rish" va "360° Aylantirish" ga o'tkazish.
6. **6-bosqich:** Xodimlar portallari (Ofitsiant, KDS, Admin) mobil interfeysini qulaylashtirish va SPA router orqali uzluksiz bog'lash.
7. **7-bosqich:** To'liq build, lint va GitHub-dagi ikkala repozitoriyaga ham yangilanishlarni push qilish.
