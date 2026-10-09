# AR MENU — CHUQUR BOZOR TAHLILI v2
**Sana:** 2026-09-04
**Holat:** TZ bosqichi — KOD YOZILMAGAN
**Yangilanish:** Fiskalizatsiya, to'lov, delivery, turizm, raqobat — chuqur o'rganildi

---

## 1. YANGI TOPILGAN KRITIK MA'LUMOTLAR

### 1.1 🔴 FISKALIZATSIYA — ENG MUHIM TOPILMA

**Bu loyihaning taqdirini hal qiladi.**

| Fakt | Ma'no |
|---|---|
| Onlayn-kassa **MAJBURIY** (kafe, restoran kiradi) | Har savdo real-time OFD + Soliq qo'mitasiga ketadi |
| **2026-04-01 dan** yangi talab: `tasnif.soliq.uz` (**IKPU/MXIK kod**) bo'yicha cheklov | **Har taom IKPU kodiga ega bo'lishi SHART** |
| Retsept asosida cheklov (recipe-based) | Menyu → xomashyo bog'lanishi talab qilinadi |
| **2026 dan raqamli chek = qog'oz chek bilan teng kuchga ega** | ✅ Bizga FOYDA: telefonda chek berish qonuniy |
| OFD operatorlari: **UZKASSA, e-POS, QPos** | Integratsiya nuqtalari |

#### ⚠️ NIMA DEGANI?
1. **Fiskalizatsiyasiz tizim = restoran uni ASOSIY kassa qilib ishlata olmaydi.** Bu bizni "o'yinchoq" darajasiga tushiradi → churn.
2. **Lekin** bu bizga ULKAN imkoniyat ham: Dastur-xon'da fiskalizatsiya **YO'Q** (tekshirildi). Zoomda'da ham to'g'ridan-to'g'ri yo'q.
3. **Raqamli chek qonuniyligi (2026)** = mijoz telefoniga chek yuborish mumkin → **qog'oz chek chiqarish shart emas** → restoran uchun tejamkorlik argumenti.

> **✅ QARORI:** OFD integratsiyasi (UZKASSA yoki e-POS) — **v1.5 da SHART**.
> Bu bizni raqobatchilardan ajratadigan eng kuchli funksiya.

---

### 1.2 🟢 TURIZM — KUTILGANDAN KUCHLIROQ

| Ko'rsatkich | 2026 | O'sish |
|---|---|---|
| Xalqaro tashrif buyuruvchilar (7 oy) | **7,75 mln** | **+22,6%** (+1,4 mln) |
| Q1 2026 | 2,87 mln | **+36,6%** |
| Apr-Iyun: har oy | **1 mln+** | tarixda birinchi marta |
| Turistik restoran cheki | 100 000–200 000 so'm ($9-18) | mahalliy: 35-90k |

> **Turistik restoran cheki mahalliynikidan 2-3× yuqori.**
> Turist "norin", "dimlama", "chuchvara" nima ekanini **bilmaydi**.
> **AR/3D + 3 til = to'g'ridan-to'g'ri savdo oshishi.** Bu eng kuchli use-case.

**Nishon shaharlar:** Samarqand, Buxoro, Xiva, Toshkent (turistik zonalar).

---

### 1.3 🔴 DELIVERY BOZORI — MONOPOLIYA (foyda imkoniyati)

| Fakt | Ma'no |
|---|---|
| Yandex Eats + Express24 = **87,5%** bozor | Monopoliya, Raqobat qo'mitasi tan olgan |
| Uzum Tezkor — dominant platforma | 2-o'rin |
| Wolt O'zbekistondan **chiqib ketdi** | Raqobat yo'q |
| Agregator komissiyasi (odatda) | **20-35%** |

> **💰 ENG KUCHLI SOTUV ARGUMENTI:**
> *"Yandex Eats sizdan 25-30% oladi. Bizning tizim orqali to'g'ridan-to'g'ri
> buyurtma — komissiya 0%. Oyiga 490k so'm to'lab, 5 mln so'm tejang."*
>
> Restoran egasi uchun bu **AR'dan 10x kuchliroq argument.**

---

### 1.4 🟢 TELEGRAM — O'ZBEKISTONDA KANAL #1

| Ko'rsatkich | Qiymat |
|---|---|
| Telegram foydalanuvchilari | **25-27 mln** |
| Internet foydalanuvchilarining ulushi | **76-85%** |
| Kunlik ko'rishlar | 1,3 mlrd |

**Xulosa:** Telegram Mini App — **ilova o'rniga**. Mijoz hech narsa yuklamaydi.
Zoomda buni allaqachon qilgan → biz ham **SHART** qilishimiz kerak.

**Bonus:** Ofitsiant/admin uchun ham Telegram bot bildirishnomasi — ilova kerak emas.

---

### 1.5 To'lov tizimlari (texnik yechim tayyor)

| Tizim | Integratsiya | Kutubxona |
|---|---|---|
| **Payme** | Merchant API (JSON-RPC): CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, GetStatement | `paytechuz` (PyPI) |
| **Click** | server-to-server: Prepare + Complete endpointlar | `paytechuz` |
| **Uzum** | link + API | `paytechuz` |
| **Barchasi** | QR to'lov qo'llab-quvvatlanadi | ✅ |

> **✅ Yaxshi xabar:** `paytechuz` — bitta Python kutubxona, Payme+Click+Uzum+Paynet+Octo.
> Django uchun. Bu ishni 3 haftadan 3 kunga tushiradi.

---

## 2. RAQOBAT — CHUQUR TAQQOSLASH (yangilangan)

### 2.1 To'liq funksiya matritsasi

| Funksiya | **BIZ (reja)** | Dastur-xon | Zoomda | iiko | SmartMenu |
|---|:---:|:---:|:---:|:---:|:---:|
| QR menyu | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stol QR (noyob) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **AR/3D taom** | **✅ 🎯** | ❌ | ❌ | ❌ | ❌ |
| Ofitsiant paneli | ✅ | ✅ | ❌ | ✅ | ❌ |
| KDS (oshxona) | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Admin nazorat | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **Fiskalizatsiya (OFD)** | **✅ 🎯** | ❌ | ❌ | ✅ | ❌ |
| Telegram Mini App | ✅ | ⚠️ bot | ✅ | ❌ | ❌ |
| Onlayn to'lov | ✅ | ❌ | ✅ | ✅ | ❌ |
| Yetkazib berish | v2 | ❌ | ✅ | ✅ | ❌ |
| Sodiqlik (loyalty) | ✅ | 🔜 | ✅ | ✅ | ❌ |
| Ombor/retsept | v2 | 🔜 | ❌ | ✅ | ❌ |
| **Narx/oy** | **149k-990k** | **99k / 399k** | **min 1,3 mln** | **~$150-400** | ~ |

### 2.2 Pozitsiyalash xaritasi

```
     Qimmat
       ↑
       │   iiko ●          ● Zoomda
       │  (POS lideri)     (delivery+CRM)
       │                        ● Bittada AR ← BIZ
       │                          (AR + fiskal + KDS)
       │
       │        ● Dastur-xon
       │         (arzon QR+KDS)
       │   ● SmartMenu / ZekiSoft
       │    (oddiy QR menyu)
       └──────────────────────────────→ Funksiya boyligi
     Arzon
```

**Bizning joyimiz:** Dastur-xon'dan qimmatroq, iiko/Zoomda'dan arzonroq,
lekin **AR + fiskalizatsiya** ikkalasida ham yo'q.

### 2.3 🎯 Bizning 3 ta himoya devori (moat)

1. **AR/3D kontent bazasi** — 500 ta o'zbek taomi 3D modeli yig'ilsa, buni
   raqobatchi 1 yilda takrorlay olmaydi. **Bu eng kuchli aktiv.**
   → *Yangi restoran kelsa, "osh", "manti", "somsa" modeli TAYYOR → 0 xarajat.*
2. **Fiskalizatsiya** — texnik murakkab, arzon raqobatchilar qilmaydi
3. **Turizm/3 til** — Samarqand/Buxoro segmentini egallash

> ⚡ **#1 eng muhim:** Umumiy o'zbek taomlari kutubxonasi.
> 100-chi restoranga o'rnatishda kontent narxi ~**0** bo'ladi → marja 90%.

---

## 3. 🚀 SOTUVNI TEZLASHTIRADIGAN QO'SHIMCHA FUNKSIYALAR

> Foydalanuvchi so'ragan asosiy savol: *"nima qo'shsak sotilishi tez va foydasi tez bo'ladi"*

### 3.1 🥇 TOP-5 — SOTUVNI ENG TEZ OSHIRADIGAN (v1 ga qo'shish tavsiya)

#### 1. 💰 **"Komissiya 0%" to'g'ridan-to'g'ri yetkazib berish**
- Restoranning o'z Telegram Mini App + sayti orqali buyurtma
- Yandex Eats 25-30% oladi → biz 0%
- **Sotuv argumenti:** *"Oyiga 5 mln so'm tejaysiz"* → 490k so'm arzon ko'rinadi
- **Foyda tezligi:** 🔥🔥🔥🔥🔥 (eng tez pul argumenti)

#### 2. 🧾 **Fiskal chek (OFD integratsiya)**
- Restoran alohida kassa dasturi sotib olmaydi
- Raqamli chek (2026 dan qonuniy) → qog'oz tejamkorlik
- **Sotuv argumenti:** *"Soliq talabiga to'liq mos, alohida kassa kerak emas"*
- **Foyda tezligi:** 🔥🔥🔥🔥🔥 (majburiy talab = sotib olish sababi)

#### 3. 🎁 **Sodiqlik + keshbek + tug'ilgan kun**
- Statistika: **66% mijoz sodiqlik dasturi bor joydan ko'proq buyurtma qiladi**
- Mijoz telefoni yig'iladi → qayta marketing (SMS/Telegram)
- **Restoran uchun qiymat:** mijoz bazasi = aktiv
- **Foyda tezligi:** 🔥🔥🔥🔥

#### 4. 🤖 **AI ofitsiant / tavsiya (chat)**
- "Achchiq bo'lmagan, go'shtli nima bor?" → AI javob beradi
- Statistika: **44% mijoz AI tavsiyasini xohlaydi**
- Upsell: "Oshga achchiq-chuchuk salat oling" → **o'rtacha chek +20%**
- **Bizda tayyor tajriba bor** (instacore, chatplace_ai)
- **Foyda tezligi:** 🔥🔥🔥🔥

#### 5. 📈 **Upsell/cross-sell dvigateli**
- Savatga qo'shganda: "Bunga ichimlik +12 000 so'm?"
- "Ko'p buyurtma qilinadigan" belgisi, "Oshpaz tavsiyasi"
- Statistika: raqamli buyurtma **+20% o'rtacha chek**, stol aylanishi **+15%**
- **Foyda tezligi:** 🔥🔥🔥🔥🔥 (kod arzon, ta'sir katta)

---

### 3.2 🥈 O'RTA PRIORITET (v1.5 – v2)

#### 6. 🍽 **Hisobni bo'lish (split bill) + choychaqa (tips)**
- Kompaniya bo'lib kelganda har kim o'zini to'laydi
- Ofitsiantga choychaqa QR orqali → **ofitsiantlar tizimni O'ZI targ'ib qiladi** ⚡
- *Bu juda muhim: xodim qarshilik qilmaydi, aksincha talab qiladi*

#### 7. ⭐ **Otziv + reyting (ichki, Google'gacha filtr)**
- Ovqatdan keyin: "Baholang" → 5 yulduz bo'lsa → **Google/Yandex sharhiga yo'naltirish**
- 1-3 yulduz bo'lsa → adminga xabar, ochiq internetga chiqmaydi
- **Restoran uchun ULKAN qiymat:** Google reytingi ko'tariladi, salbiy sharh kamayadi
- **Foyda tezligi:** 🔥🔥🔥🔥 (sotuvda juda yaxshi "sotiladi")

#### 8. 📊 **Menyu-injiniring analitikasi**
- Har taom: sotuv soni × marja → **4 kvadrant** (Yulduz / Ot / Jumboq / It)
- "Bu 5 ta taomni menyudan olib tashlang — foyda 8% oshadi"
- **Restoran churn'ini keskin kamaytiradi** (bu ma'lumot boshqa joyda yo'q)

#### 9. 🔔 **Stol chaqiruv tugmalari**
- "Ofitsiant", "Hisob", "Suv", "Stolni tozalash"
- Ofitsiant telefoniga push → xizmat tezligi
- Arzon kod, katta idrok qilinadigan qiymat

#### 10. 🌐 **Ko'p tillilik + avtomatik tarjima**
- uz / ru / en / (tur / ar — turizm uchun)
- AI avtomatik tarjima qiladi, admin tasdiqlaydi
- Turistik segment uchun **SHART**

#### 11. 🥗 **Allergen + parhez filtri**
- "Halol", "Vegetarian", "Yong'oqsiz", "Glutensiz", "Achchiq"
- Turist uchun kritik (EU 14 allergen standarti)

#### 12. 📷 **AR menyu-stend + reels generator**
- Restoran o'z AR menyusidan avtomatik Instagram reels oladi
- Marketing kontenti = qo'shimcha qiymat
- *Video (`ai agent.mp4`) uslubidagi demo — viral potensial*

---

### 3.3 🥉 KEYINGI BOSQICH (v3+)

| # | Funksiya | Izoh |
|---|---|---|
| 13 | 3D restoran ko'rinishi | Foydalanuvchi so'ragan — keyingi bosqich |
| 14 | Ofitsiant 3D navigatsiya | v3, 2.5D plan bilan boshlanadi |
| 15 | Stol bron qilish (booking) | Restoran bandligi |
| 16 | Ombor + retsept (food cost) | Fiskalizatsiya talabi bilan bog'liq |
| 17 | Xodim smenasi + ish haqi | iiko darajasiga chiqish |
| 18 | Franchayzing/tarmoq boshqaruvi | Evos/Max Way kabi tarmoqlar uchun |
| 19 | Self-service kiosk | Fastfood uchun |
| 20 | Dinamik narx (happy hour) | Bo'sh soatlarda chegirma |

---

## 4. YANGILANGAN MONETIZATSIYA

### 4.1 Tarif (qayta ko'rildi — raqobat asosida)

| Tarif | Narx/oy | Kim uchun | Nima kiradi |
|---|---|---|---|
| **FREE** | 0 so'm | Choyxona, kichik kafe | QR menyu, 3 stol, 20 taom, brend bizniki |
| **START** | **199 000** | Kafe | Cheksiz stol/taom, buyurtma, KDS, ofitsiant, 3 til, chaqiruv |
| **PRO** ⭐ | **590 000** | Restoran | + **AR/3D (50 taom)**, sodiqlik, otziv, analitika, to'lov, Telegram Mini App |
| **PRO+FISKAL** | **890 000** | Rasmiy ishlaydigan | + **OFD fiskal chek**, raqamli chek, soliq hisoboti |
| **TARMOQ** | shartnoma | 5+ nuqta | + tarmoq analitikasi, franchayzing, shaxsiy menejer |
| **3D SETUP** | 90 000 / taom | bir martalik | Kutubxonada bo'lmagan taom uchun |

> **FREE tarif — strategik:** bozorga tez kirish, keyin PRO'ga ko'tarish.
> Dastur-xon 99k so'ryapti — biz 0 dan boshlaymiz, lekin AR uchun pul olamiz.

### 4.2 Yangilangan birlik iqtisodiyoti (PRO tarif)

```
DAROMAD (1 restoran, yillik):
  PRO abonent 590k × 12                    =  7 080 000 so'm
  3D setup (20 ta noyob taom × 90k)        =  1 800 000 so'm   [1-yil]
  ─────────────────────────────────────────────────────────
  1-yil                                    =  8 880 000 so'm  (~$700)
  2-yildan                                 =  7 080 000 so'm  (~$560)

XARAJAT:
  ┌─ 1-chi restoran (kutubxona bo'sh):
  │   3D kontent 50 taom × 25k (AI+qo'lda)  =  1 250 000
  ├─ 50-chi restoran (kutubxona to'lgan):
  │   3D kontent (faqat 20% noyob)          =    250 000  ⚡
  └─
  Sotuv + o'rnatish                         =    900 000
  Server/CDN                                =    500 000
  Support                                   =    700 000
  ─────────────────────────────────────────────────────────
  1-chi restoran xarajat                    =  3 350 000  → marja 62%
  50-chi restoran xarajat                   =  2 350 000  → marja 74%
```

### 4.3 3 yillik prognoz (yangilangan)

| Yil | FREE | START | PRO | FISKAL | Daromad | Sof foyda |
|---|---|---|---|---|---|---|
| 1 | 60 | 20 | 15 | 3 | ~230 mln | ~−80 mln (investitsiya) |
| 2 | 200 | 70 | 60 | 25 | ~980 mln | ~+310 mln |
| 3 | 450 | 160 | 150 | 70 | ~2,6 mlrd | ~+1,2 mlrd (~$95k) |

**Break-even:** 2-yil 1-choragi (~55 pullik mijoz)

> **Kutubxona effekti:** 3-yilda 500+ taom modeli yig'iladi.
> Yangi mijozga o'rnatish narxi ~0 → **marja 85%+**.

---

## 5. 🎯 SOTUV STRATEGIYASI — TEZ NATIJA UCHUN

### 5.1 Sotuv pitch (ustuvorlik tartibida)

| # | Argument | Kimga |
|---|---|---|
| 1️⃣ | *"Yandex Eats 30% oladi — bizda 0%. Oyiga 5 mln tejang"* | **HAMMAGA** — pul tili |
| 2️⃣ | *"Soliq talabiga mos fiskal chek, alohida kassa kerak emas"* | Rasmiy restoranlar |
| 3️⃣ | *"Chet ellik mijoz taomni 3D ko'radi va buyurtma qiladi"* | **Turistik zona** |
| 4️⃣ | *"O'rtacha chek +20%, stol aylanishi +15%"* | Barchaga |
| 5️⃣ | *"Google reytingingiz ko'tariladi, salbiy sharh kamayadi"* | Brend restoranlar |
| 6️⃣ | *"AR — hech kimda yo'q, siz birinchisiz"* | Instagram-faol joylar |

> ⚠️ **Diqqat:** AR — 6-o'rinda! Sotuvda **birinchi gap PUL bo'lishi kerak**.
> AR — "wow" va farqlanish, lekin sotib olish sababi emas.

### 5.2 Tez o'sish taktikalari

1. **FREE tarif + viral** — QR menyu pastida kichik "Powered by ..." →
   har skanerlash = reklama. Kuniga 100 stol × 30 skanerlash = 3000 ko'rish/kun
2. **Ofitsiant choychaqa** — xodimlar tizimni O'ZI targ'ib qiladi ⚡
3. **Turizm agentliklari bilan hamkorlik** — Samarqand/Buxoro
4. **HoReCa ko'rgazmasi** — yiliga 1 marta, AR stend = eng ko'p e'tibor
5. **Instagram reels** — AR demo videosi viral bo'lish potensiali eng yuqori
6. **Tarmoq bitimi** — 1 shartnoma = 30 nuqta (Evos, Oqtepa Lavash, Max Way)
7. **Referal:** restoran restoranni olib kelsa — 2 oy bepul

### 5.3 Birinchi 90 kun rejasi

| Hafta | Ish |
|---|---|
| 1-2 | 5 ta pilot restoran topish (2 Toshkent, 2 Samarqand, 1 Buxoro) |
| 3-6 | MVP o'rnatish, bepul, 15 taom 3D |
| 7-10 | Raqamlarni o'lchash: chek o'zgarishi, AR ko'rish, konversiya |
| 11-12 | Video-otziv + case study + reels |
| 13 | Narx e'lon qilish, sotuvni boshlash (birinchi 30 mijozga 50%) |

---

## 6. XAVFLAR (yangilangan)

| Xavf | Daraja | Yumshatish |
|---|---|---|
| 3D kontent narxi | 🟡 **O'RTA** (edi 🔴) | ⚡ **Umumiy taom kutubxonasi** hal qiladi + AI (Meshy/Tripo ~$20/oy cheksiz) |
| Fiskalizatsiya murakkabligi | 🟡 O'RTA | `paytechuz` + OFD SDK bor; 3-4 hafta ish |
| Yirik POS (iiko) AR qo'shishi | 🟡 O'RTA | Kontent kutubxonasi = himoya; tez harakat |
| Restoran to'lamaydi | 🟡 O'RTA (edi 🔴) | ⚡ FREE tarif + "delivery komissiya 0%" argumenti |
| Churn (wow tugashi) | 🟢 PAST (edi 🟡) | Fiskal + sodiqlik + analitika = "yopishqoq" |
| iOS WebXR yo'q | 🟢 PAST | USDZ + AR Quick Look — yechim aniq |
| Delivery monopoliya bosimi | 🟡 O'RTA | Yandex bizni raqobatchi deb ko'rishi mumkin |
| **Mavjud platformaga ta'sir** | 🟢 **YO'Q** | Alohida repo/DB/server/port |

---

## 7. YAKUNIY XULOSA — YANGILANGAN BAHO

| Mezon | Baho (v1) | Baho (v2) | Sabab |
|---|---|---|---|
| Bozorda joy bormi | 7/10 | **8,5/10** | Fiskalizatsiya + delivery bo'shligi topildi |
| Foyda keltiradimi | 6/10 | **8/10** | Kutubxona effekti + FREE model |
| Xavf | O'rta-yuqori | **O'rta** | 3D narx muammosi yechildi |
| Tez sotiladimi | — | **7,5/10** | "Komissiya 0%" + fiskal argumentlari |

### ⚡ Asosiy o'zgarish (v1 → v2)
> **AR — mahsulotning YURAGI emas, FARQLASH quroli.**
> Sotib olish sababi = **pul tejash (delivery komissiya) + qonun talabi (fiskal)**.
> AR esa bizni raqobatchidan ajratadi va PR/viral beradi.
>
> Shu tarzda qurilsa — **sotiladi va foyda keltiradi**.

---

## Manbalar
- [Onlayn-kassa: 2026 talablari — Paloma365](https://paloma365.uz/blog/guides/onlajn-kassa-uzbekistan)
- [tasnif.soliq.uz IKPU API wrapper](https://github.com/aslbekkucharov/ikpu-mxik)
- [ИКПУ 2026 — MoySklad.uz](https://www.moysklad.uz/poleznoe/shkola-torgovli/kody-ikpu/)
- [Uzbekistan e-invoicing — EDICOM](https://edicomgroup.com/electronic-invoicing/uzbekistan)
- [Yandex Eats + Express24 monopoliya — Kun.uz](https://kun.uz/en/news/2024/10/26/uzbekistans-food-delivery-market-deemed-monopolized-by-yandex-eats-and-express24)
- [Uzum Tezkor dominant — Kun.uz](https://kun.uz/en/news/2025/04/02/uzum-tezkor-named-dominant-digital-platform-in-delivery-market)
- [Wolt O'zbekistondan chiqdi — Kun.uz](https://kun.uz/en/01543038)
- [7,75 mln turist 2026 — NomadLawyer](https://www.nomadlawyer.org/uzbekistan-international-tourist-arrivals-surge-2026)
- [Q1 2026: 2,87 mln turist — TravelAndTourWorld](https://www.travelandtourworld.com/news/article/uzbekistan-tourism-boom-2-87-million-visitors-in-q1-2026-signal-a-golden-era-for-the-silk-road/)
- [Inflyatsiya 7,1% — Kun.uz](https://kun.uz/en/news/2026/04/07/annual-inflation-in-uzbekistan-hits-multi-year-low-of-71-in-march)
- [Zoomda — restoran platformasi](https://zoomda.uz/en)
- [Dastur-xon](https://dastur-xon.uz/)
- [PayTechUZ — Payme/Click/Uzum kutubxonasi](https://pay-tech.uz/en/)
- [Telegram marketing O'zbekiston 2026](https://101digital.uz/en/blog/telegram-marketing-uzbekistan/)
- [QR menu 2026 profit guide — Revmenue](https://revmenue.com/qr-code-menu-for-restaurants/)
- [Restaurant loyalty 2026 — DoorDash](https://merchants.doordash.com/en-us/blog/restaurant-loyalty-programs)
- [QR Codes for Restaurants 2026 — Supercode](https://www.supercode.com/blog/qr-codes-for-restaurants)
- [Meshy vs Tripo vs Rodin 2026](https://www.neural4d.com/features/neural4d-vs-tripo-vs-meshy-vs-rodin)
