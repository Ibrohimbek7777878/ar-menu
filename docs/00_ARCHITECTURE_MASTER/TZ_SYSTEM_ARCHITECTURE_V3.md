# RESTORAN TIZIMI: TO'LIQ 4-MODULLI ARXITEKTURA VA TIZIMLI BIZNES JARAYONLARI
## TEXNIK VAZIFA (TZ v3.0 - ARCHITECTURE & ROLE-BASED SYSTEM)

---

## 1. OVOZLI XABARDA AYTILGAN KAMCHILIKLAR RO'YXATI

Audio xabarni tahlil qilish natijasida hozirgi loyihada quyidagi fundamental kamchiliklar aniqlandi:

1. **Bir tomonlama fikrlash (Faqat mijoz ko'zi bilan qaralgani):**
   - Hozirgi loyiha asosan faqat bitta ssenariyga — *mijoz keladi, QR/NFC bosadi, menyu ko'radi va buyurtma beradi* — qaratilgan.
   - Restoranning ichki tirik jarayonlari (oshxona, ofitsiantlar harakati, menejer nazorati) bir butun avtomatlashgan zanjir sifatida o'zaro bog'lanmagan.

2. **Tizimli arxitektura va rollar bo'linmasining to'liq emasligi:**
   - Restoran faoliyatining 4 ta asosiy foydalanuvchi roli (Mijoz, Ofitsiant, Oshpaz, Menejer) o'rtasida ma'lumotlar almashinuvi va vazifalar taqsimoti mustaqil modullar sifatida to'liq integratsiya qilinmagan.

3. **Mijoz (User) modulidagi yetishmovchiliklar:**
   - Shaxsiy chek (hisob-kitob, xizmat haqi, oraliq to'lov) aniq va to'liq ko'rinishi.
   - Stolni tanlash, holatini bilish va kelishdan oldin/joyida bron qilishning uzviy bog'liqligi.
   - NFC va QR texnologiyalarining mustaqil, qayta ishlatiluvchi (reusable) vosita sifatida ajratilmaganligi.

4. **Ofitsiant (Waiter) modulidagi kamchiliklar:**
   - Ofitsiant qaysi stolga nima taom yetkazishi kerakligi, taom oshxonadan qachon chiqqani (vaqt taymeri) va qaysi stolda bron/to'lov kutilayotgani bo'yicha operatsion aniqlik yetishmaydi.
   - Stolga yangi chaqiruv bo'lganda tezkor javob berish va buyurtmaga qo'shimcha kiritish tizimi to'liq bog'lanmagan.

5. **Oshpaz (KDS / Oshxona) modulidagi kamchiliklar:**
   - Taomlar ketma-ketligi (1-taom, 2-taom, salatlar, ichimliklar) va navbat nazorati aniq ko'rsatilmagan.
   - Porsiyalar miqdori, maxsus istaklar (masalan, *piyozi kam bo'lsin*) va pishirish vaqti bo'yicha ogohlantirishlar yo'qligi.

6. **Menejer / Admin (Super Admin) modulidagi kamchiliklar:**
   - Restoran egasi yoki bosh menejeri uchun barcha jarayonlarni bitta markazdan real vaqtda ko'rsatuvchi Jonli Dashboard (bugungi umumiy tushum, faol stollar, qaysi ofitsiant nechta stolga qaradi, qaysi taom eng ko'p sotildi, soatbay statistika) to'liq yetuk emas.

7. **Monolit yondashuv (Bo'laklarga va qayta ishlatiluvchi komponentlarga bo'linmaganligi):**
   - Sun'iy intellektga (AI) loyihani birdaniga "bitta buyruq bilan hamma narsani qilib ber" deb berilgani sababli kod qismlari modulli emas, umumiy bo'lib qolgan.
   - NFC, QR skaner, Chek kalkulyatori kabi texnologiyalar barcha 4 ta modulda ham qayta ishlatilishi mumkin bo'lgan alohida mustaqil komponent sifatida yasalmagan.

8. **Dizaynga ortiqcha e'tibor, funksional skeletning (biznes jarayonining) esa orqada qolishi:**
   - Tashqi vizual ko'rinishga ko'p vaqt ketgan, lekin restoran biznesining asosiy skeleti (buyurtma tushishidan to chek yopilguncha bo'lgan to'liq tranzaksiya jarayoni) mustahkam qilinmagan.

---

## 2. TIZIMNING YANGI 4-MODULLI ARXITEKTURASI

Loyihani professional darajaga olib chiqish uchun tizim 4 ta mustaqil va o'zaro real vaqtda (WebSockets / SSE / REST Polling) bog'langan modulga bo'linadi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MARKAZIY MA'LUMOTLAR VA API QATLAMI                  │
│       (Stollar, Buyurtmalar, Taomlar, Hisoblar, Xodimlar, Kassa)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌───────────────┬────────────┴───────────┬───────────────┐
       ▼               ▼                        ▼               ▼
┌──────────────┐┌──────────────┐        ┌──────────────┐┌──────────────┐
│ 1. MIJOZ     ││ 2. OFITSIANT │        │ 3. OSHPAZ    ││ 4. MENEYER   │
│ (User Portal)││ (Waiter POS) │        │ (Kitchen KDS)││ (Admin Dash) │
├──────────────┤├──────────────┤        ├──────────────┤├──────────────┤
│• NFC / QR kir││• Jonli stol  │        │• Taom navbati││• Jonli kassa │
│• 360° Menyu  ││  xaritasi    │        │• Porsiyalar  ││• Kunlik tushum│
│• Buyurtma    ││• Chaqiruvlar │        │• Tayyor/Kutish││• Xodimlar KPI│
│• Jonli chek  ││• Stolga qo'sh│        │• Vaqt nazorati││• Zallar holat│
│• Stol bron   ││• Chek yopish │        │• Maxsus izoh ││• Tahliliy his│
└──────────────┘└──────────────┘        └──────────────┘└──────────────┘
```

---

## 3. HAR BIR MODUL UCHUN TEXNIK TALABLAR (SPETSIFIKATSIYA)

### 3.1. MIJOZ (GUEST / USER) MODULI
Mijoz restoranga kelganda yoki masofadan menyuni ko'rishda ishlatadigan yengil web-ilova.
- **Sub-komponent 1: Kirish va Identifikatsiya (NFC & QR Gateway):**
  - Stolga o'rnatilgan NFC chipi yoki QR-kod orqali avtomatik stol raqami aniqlanadi (`/menu/?table=5`).
  - Masofaviy mijozlar uchun esa stol tanlash yoki yetkazib berish opsiyasi.
- **Sub-komponent 2: Interaktiv Menyu va Qidiruv:**
  - Aqlli o'zbekcha qidiruv (`o'`, `g'`, apostroflar hisobga olinadi).
  - Taomlarni toifalar bo'yicha filtrlash, 360° ko'rinish va ozuqaviy ma'lumotlar.
- **Sub-komponent 3: Buyurtma va Jonli Savat:**
  - Bir nechta mehmon bitta stolga buyurtma qo'shishi imkoniyati.
  - Taomga maxsus istak (kam tuzli, achchiqsiz va h.k.) yozish.
- **Sub-komponent 4: Jonli Chek (Digital Receipt):**
  - Stol bo'yicha jami hisob-kitob, xizmat haqi foizi, har bir taomning holati (*qabul qilindi -> pishirilmoqda -> yetkazildi*).
  - Ofitsiantni chaqirish tugmasi ("Hisobni olib keling", "Choy", "Ofitsiant").

---

### 3.2. OFITSIANT (WAITER POS) MODULI
Ofitsiantning mobil telefoni yoki planshetiga moslashgan tezkor xizmat ko'rsatish paneli.
- **Sub-komponent 1: Zallar va Stollar Xaritasi:**
  - Har bir zal (Asosiy, VIP, Terassa) bo'yicha stollarning vizual rangi:
    - Yashil: Bo'sh stol
    - Qizil: Band / mijoz o'tiribdi
    - Sariq: Hisob so'ragan / to'lov kutilmoqda
    - Moviy: Bron qilingan stol
- **Sub-komponent 2: Xizmat Chaqiruvlari Markazi (Service Calls):**
  - Qaysi stoldan chaqiruv bo'ldi (Choy, Non, Ofitsiant, Hisob) — bir zumda signal va bildirishnoma.
  - "Qabul qildim" va "Bajarildi" statuslari.
- **Sub-komponent 3: Stolga Buyurtma Qo'shish (Quick POS):**
  - Mijoz ilovadan foydalanmagan taqdirda ofitsiant o'z telefonidan stolga taom qo'shib kiritishi.
- **Sub-komponent 4: Chekni Chop Etish va Yopish:**
  - Mobil termal printerga Bluetooth/Wi-Fi orqali chek chiqarish yoki ekrandan hisobni qabul qilib stolni bo'shatish.

---

### 3.3. OSHPAZ (KITCHEN DISPLAY SYSTEM - KDS) MODULI
Oshxonada katta planshet yoki monitorga qo'yiladigan taom tayyorlash navbati.
- **Sub-komponent 1: Buyurtmalar Oqimi va Taom Navbati:**
  - Yangi kelgan buyurtmalar tushgan vaqti bo'yicha xronologik taxlanadi.
  - Taom turlari bo'yicha guruhlash: 1-taomlar (sho'rvalar), 2-taomlar (kabob, osh), salatlar, ichimliklar.
- **Sub-komponent 2: Vaqt va Taymer Nazorati:**
  - 0–10 daqiqa: Yashil (oddiy holat)
  - 10–20 daqiqa: Sariq (tayyorlash kechikmoqda)
  - 20+ daqiqa: Qizil (ogohlantirish signali)
- **Sub-komponent 3: Holatni O'zgartirish (Status Toggle):**
  - Bitta bosish bilan taom statusi: `Kutilmoqda` -> `Pishirilmoqda` -> `Tayyor (Ofitsiant olib ketsin)`.
- **Sub-komponent 4: Jami Mahsulotlar Svodkasi:**
  - Butun oshxona bo'yicha ayni daqiqada nechta porsiya Oshi, nechta Manti tayyorlanishi kerakligini ko'rsatuvchi umumiy sanagich.

---

### 3.4. MENEJER / SUPER ADMIN (DASHBOARD) MODULI
Restoran egasi va bosh menejerning jonli boshqaruv markazi.
- **Sub-komponent 1: Jonli Kassa va Tushum (Real-time Revenue):**
  - Bugungi jami savdo, naqd / karta / Click / Payme ulushi.
  - O'rtacha chek miqdori (Average Order Value).
- **Sub-komponent 2: Stol va Mehmonlar Tahlili:**
  - Ayni paytda necha foiz stol band, kun davomida nechta mehmon keldi.
  - Zallar kesimida yuklama darajasi.
- **Sub-komponent 3: Xodimlar va Xizmat Nazorati:**
  - Qaysi ofitsiant nechta buyurtmaga qaradi va qancha savdo qildi.
  - Chaqiruvlarga o'rtacha javob berish tezligi.
  - Oshxonada taomlarning o'rtacha tayyorlanish vaqti.
- **Sub-komponent 4: Menyu va Narxlar Boshqaruvi:**
  - Mavjud bo'lmagan taomlarni bir tugma bilan "Stop-list"ga kiritish (oshxonada go'sht tugasa, menyudan vaqtincha yopish).

---

## 4. QAYTA ISHLATILUVCHI (REUSABLE) KOMPONENTLAR VA XIZMATLAR

Audio yozuvda uqtirilganidek, kod takrorlanmasligi uchun quyidagi texnologiyalar bitta universal komponent sifatida ajratiladi:

1. **`NFCGateway` & `QRCodeEngine`:**
   - Har qanday modulda (Mijoz stolni ochishida, Ofitsiant stolni tasdiqlashida, Admin stol chipini dasturlashida) bir xil ishlaydi.
2. **`ReceiptCalculator` (Chek va Moliyaviy Dvigatel):**
   - Jami summa, xizmat haqi (10%), chegirmalar, QQS hisob-kitobi bir joyda bajariladi (Mijoz chekida, Ofitsiant hisobida va Admin kassasida xatolik bo'lmaydi).
3. **`LiveStatusBroadcaster`:**
   - WebSocket / Server-Sent Events orqali oshpaz taomni "Tayyor" deb belgilasa, darhol ofitsiant ekraniga bildirishnoma va mijoz ekraniga status yangilanishi boradi.
4. **`TableStateService`:**
   - Stol band/bo'sh holati markaziy holat sifatida sinxronlanadi.

---

## 5. BOSQICHMA-BOSQICH AMALGA OSHIRISH (ROADMAP)

- **1-Bosqich (Skelet & Modulli Arxitektura):**
  - 4 ta modulning ichki marshrutlari, shared services (NFC, QR, Receipt Calculator) va ma'lumotlar almashinuvi skeletini ulash.
- **2-Bosqich (Ofitsiant & KDS zanjiri):**
  - Mijoz buyurtma berishi -> Oshxona KDS ekranida paydo bo'lishi -> Oshpaz tugatgach Ofitsiantga xabar borishi zanjirini sinxronlash.
- **3-Bosqich (Menejer Jonli Dashboardi):**
  - Barcha modullardan yig'ilayotgan ma'lumotlarni jonli tushum, stollar yuki va to'lov hisobotiga aylantirish.
- **4-Bosqich (Dizayn va Polishing):**
  - Funksional to'liq ishlagandan so'ng, har bir ekranning mobil qulayligini mukammallashtirish.
