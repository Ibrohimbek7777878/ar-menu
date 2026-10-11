# 📋 TEXNIK VAZIFA (TZ)
## "No-Code Universal Moliya & Kanban Konstruktori — 100% Qo'lda Boshqariladigan, O'ta Sodda va Moslashuvchan Moliya Tizimi"

**Hujjat kodi:** `TZ-FINANCE-KANBAN-2026-V1`  
**Metodologiya:** `Loop Engineering 2.1 (PM, Tadbirkor, Mijoz, Bosh Moliyachi)`  
**Sana:** 18-Sentyabr, 2026-yil  
**Loyiha:** Online Store & Restoran Ekosistemasi (Guliston)

---

## 🧭 1. ASOSIY FALSAFA VA BIZNES MUAMMOSI

### 🧐 Nega an'anaviy moliya dasturlari (1C, iiko, Jowi) kichik biznesda ishlamaydi?
1. **"Qora quti" sindromi:** Buxgalteriya dasturlari o'zicha formulalar bilan hisoblaydi, 50 yoshli xo'jayin esa nima uchun kassa kamayganini tushunmaydi va dasturdan cho'chiydi.
2. **Qotib qolgan qoliplar:** An'anaviy tizimlarda xato kiritilgan ma'lumotni tuzatish uchun 5 ta buxgalteriya hujjati kerak. Choyxona va kafeda esa hayot tez: go'sht olindi, zakalat tushdi, xodimga kunlik berildi, akasidan sarmoya olindi.
3. **Qo'lda boshqarish yo'qligi:** Xo'jayin har bir raqamni, har bir sanani va har bir yozuvni o'z qo'li bilan yozishni, tahrirlashni va tekshirishni xohlaydi.

### 💡 Bizning Yechim:
* Biz tayyor qotib qolgan dastur sotmaymiz! Biz **"Tadbirkor 5 daqiqada o'ziga moslab quradigan, 100% qo'lda o'zgartiriladigan No-Code Moliya Tizimi"**ni beramiz.
* **4-sinf bolasi ham tushunadi:** 0 ta qiyin atama (debet/kredit yo'q). Faqat: **Reja**, **Kirim (Kassa)**, **Chiqim (Xarajat)**, **Nasiya (Qarz)** va **Yopilgan**.
* **100% Qo'lda Nazorat:** Har bir sonni, sanani, kategoriyani, to'lov usulini bitta teginish bilan o'zgartirish, surish va tahrirlash mumkin.

---

## 👥 2. KO'P TARAFLAMA TAHLIL (4 PERSPEKTIVA)

### 👔 A. Biznes Egasi / Tadbirkor Nuqtai Nazaridan:
* **To'liq qo'lda boshqaruv:** O'zi xohlagan sanani qo'ysin, xohlagan summani (`15 000 000 so'm`) kiritsin, xohlagan kategoriyani emojisi bilan ochsin.
* **Ko'rgazmali Kanban Doskasi:** Puli qaysi bosqichda turganini stol ustidagi qog'ozdek ushlab sursin (Drag-and-Drop).
* **Hisobotlar ishonchi:** Istalgan vaqtda sherigiga yoki soliqqa ko'rsatish uchun bitta tugma bilan **Excel (.xlsx)** yoki **PDF** qilib yuklab olsin.

### 🧮 B. Bosh Moliyachi Nuqtai Nazaridan (Chalkashmaslik Kafolati):
* **Moliyaviy Yaxlitlik (Integrity Rule):**
  * Kartochka bir ustundan ikkinchisiga surilganda moliya chalkashib ketmasligi uchun har bir bosqichning qat'iy matematik qoidasi bo'ladi:
    * `planned` (Rejadagi): Kassa balansiga ta'sir qilmaydi (0 so'm). Bu faqat kutilayotgan tushum/xarajat.
    * `income` (Kassa Kirimi): Kassaga haqiqiy pul kirdi (`+Summa`).
    * `expense` (Chiqim): Kassadan haqiqiy pul chiqdi (`-Summa`).
    * `debt` (Nasiya): Qarz daftari (balansga tushum bo'lguncha ta'sir qilmaydi).
    * `settled` (Yopilgan/Arxiv): Yakunlangan holat.
* **Audit Tarixi (Audit Trail):**
  * Kartochka ustunlar orasida surilganda, orqa fonda `FinanceMovementHistory` jadvaliga kim, qachon, qaysi ustundan qaysi ustunga surgani yoziladi.
  * Kartochkada `[ 🔄 Joyi o'zgartirilgan ]` belgisi chiqadi. Bosganda butun o'zgarish tarixi ko'rinadi — **1 tiyin ham yo'qolmaydi va o'g'irlik bo'lmaydi**.

### 📱 C. Mijoz va Oddiy Xodim (UX/UI) Nuqtai Nazaridan:
* **Mikrofon to'qnashuvini yo'qotish:** AI yozuv maydonida matn qanchalik uzun bo'lmasin, mikrofon ikonkasi ustiga chiqib ketmaydi (Flexbox container).
* **Mobil va planshet qulayligi:** Barmoq bilan ushlab surish (touch drag-and-drop), 2x2 ixcham grid, yirik sensorli tugmalar.
* **Tahrirlash (✏️ Edit):** Xato yozilgan operatsiyani bitta tugma bilan tuzatish.

### 🚀 D. Marketing va B2B Savdo (Trojan Horse) Nuqtai Nazaridan:
* Biz mijozga o'zimizning dasturimizni tiqishtirmaymiz:
  > *"Aka, keling 2 daqiqada sizning choyxonangiz moliya tizimini chizamiz!"*
* Tadbirkor 3 ta savolga javob beradi, tizim unga **4 ta ko'rgazmali interaktiv slayd** chiqaradi.
* Slaydni ko'rib, o'zining biznesini tanigach, `[ 🚀 Tizimni Do'konga O'rnatish ]` tugmasini bosadi.
* **Natija:** Mijoz dastur sotib olayotgandek emas, **o'zi yaratgan moliya tizimini o'rnatayotgandek bo'ladi**.

---

## 🛠️ 3. ANIQ TEXNIK TALABLAR (SPETSIFIKATSIYA)

### 1. UI va Responsivlik (Rasm 1)
* **Flexbox Input Group:**
  * `#aiQueryInput` inputi va `#voiceBtn` tugmasi bitta umumiy flexbox konteynerga olinadi.
  * Inputga `min-w-0 flex-1 bg-transparent` beriladi.
  * Matn uzun bo'lganda mikrofon tugmasiga tegmasdan, o'zining ichida chapga suriladi (gorizontal scroll).
* **Mobil va Planshet adaptatsiyasi:**
  * Ekranning kengligiga qarab: Mobilda 1 ustunli, planshetda 2 ustunli, kompyuterda to'liq kenglik.

### 2. Kategoriyalar No-Code Konstruktori (Rasm 2)
* **Yangi Kategoriya Qo'shish Imkoniyati:**
  * Kategoriya turi: Chiqim, Kirim, Sarmoya, Rejadagi xarajat.
  * Kategoriya nomi: Foydalanuvchi ixtiyoriy matn kiritadi.
  * **Izoh (Tavsif):** Ixtiyoriy `Izoh` maydoni (masalan: *"Faqat to'yxona uchun olingan go'shtlar"*).
  * **Interaktiv Emoji Tanlagich (Icon Picker):**
    * 12 ta guruh: 🍽️ Taomlar, 🥩 Go'sht, 🥬 Sabzavot, 🌾 Don/Yog', ⚡ Kommunal, 👨‍🍳 Xodimlar, 🏢 Bino/Ijara, 🛵 Dostavka, 📦 Idishlar, 💵 Kassa, 💼 Sarmoya, 💡 Boshqa.
    * 100+ ta tayyor emoji bosilishi bilan tanlanadi.
    * Shuningdek, klaviaturadan istalgan emojini yozish mumkin.

### 3. Operatsiyalarni Qo'lda Tahrirlash (✏️ Edit) va O'chirish (Rasm 3)
* **Har bir qatorda 2 ta amal:**
  * ✏️ **Tahrirlash:** Modalni ochadi, unda Summa (`15 000 000`), Nomi, Kategoriya, Sana, To'lov turi, Izohni qo'lda o'zgartirish mumkin.
  * 🗑️ **O'chirish:** Tasdiqlash orqali o'chirish.
* Tahrirlangandan so'ng kassa balansi avtomatik yangilanadi.

### 4. No-Code Moliya Kanban Doskasi (Rasm 4)
* **Doska Ustunlari (Bosqichlar):**
  1. `⏳ Rejadagi / Kutilayotgan` (Kassa balansiga hali kirmagan xarajat yoki tushumlar)
  2. `🟢 Kassa Kirimi` (Kassaga haqiqatda tushgan mablag'lar)
  3. `🔴 To'langan Chiqimlar` (Haqiqatda to'langan xarajatlar)
  4. `🤝 Nasiya & Qarzlar` (Mijozdan olinadigan yoki do'kondan beriladigan)
  5. `✅ Yopilgan / Arxiv` (Tugallangan operatsiyalar)
* **Har bir ustun tepasida:**
  * Jami summa (`15 000 000 so'm`) va kartochkalar soni.
  * Ustun ichida to'g'ridan-to'g'ri `[ + Yangi Kartochka ]` tugmasi.
* **Drag-and-Drop (Qo'l bilan surish):**
  * Kartochkani istalgan ustundan istalgan ustunga barmoq yoki sichqoncha bilan surish.
  * AJAX orqali yangi bosqich saqlanadi, kassa ko'rsatkichlari darhol qayta hisoblanadi.
* **`[ 🔄 Joyi o'zgartirilgan ]` Nishoni & Tarix Modali:**
  * Agar operatsiya boshqa ustunga surilgan bo'lsa, kartochka yonida ko'k belgi paydo bo'ladi.
  * Uni bosganda butun tarix popoverda ko'rinadi:
    > *"18.09.2026 11:15 — Sultonbek tomonidan 'Rejadagi' dan 'Kassa Kirimi' ga o'tkazildi"*.

### 5. Interaktiv Slaydli Taqdimot & Tizimni Do'konga O'rnatish
* **Savdo va Onboarding Quroli:**
  * Foydalanuvchi "Moliya Tizimini Qurish" tugmasini bosadi.
  * O'zining biznes yo'nalishini tanlaydi (Choyxona, Fast-food, Do'kon, Boshqa).
  * Tizim unga **4 ta chiroyli interaktiv slayd** taqdim etadi:
    * *1-slayd:* Pul qayerdan keladi (Zaldagi savdo, Dostavka, Banket).
    * *2-slayd:* Asosiy xarajatlar qayerga ketadi (Go'sht, Sabzavot, Ish haqi, Ijara).
    * *3-slayd:* Sizning Kanban doskangiz tuzilishi.
    * *4-slayd:* Oylik kassa va sof foyda hisobi.
  * Pastida: `[ 🚀 Tizimni Do'konga O'rnatish ]` tugmasi.
* **Avtomatik Taosimot va Erkin Qo'lda Tahrirlash:**
  * O'rnatish bosilgach, barcha kategoriyalar va bosqichlar do'konga joriy etiladi.
  * Mavjud eski buyurtmalar va tushumlar avtomatik to'g'ri ustunlarga taqsimlanadi.
  * Har bir kartochka va har bir sonni xo'jayin xohlagan paytda qo'lda o'zgartira oladi.

### 6. Ma'lumotlarni Excel va PDF Eksport Qilish
* **Excel (.xlsx / CSV) Eksport:**
  * Endpoint: `/seller/finance/export/excel/`
  * Microsoft Excel uchun maxsus UTF-8 BOM formati (O'zbekcha shriftlar buzilmaydi).
  * Barcha ustunlar: ID, Sana, Turi, Kategoriya, Mazmuni, Summa, To'lov turi, Izoh, Kiritgan xodim.
* **PDF / Chop Etish Eksport:**
  * Endpoint: `/seller/finance/export/pdf/`
  * Do'kon rekvizitlari, davr ko'rsatkichlari, KPI kartochkalari va rasmiy jadval bilan A4 formatiga tayyor hisobot.

---

## 💾 4. MA'LUMOTLAR BAZASI VA MODELLAR O'ZGARISHLARI

1. **`FinanceCategory` modeliga:**
   * `description = models.TextField(blank=True, verbose_name="Kategoriya izohi")`
   * `category_type` maydoniga kengaytirilgan turlar (`expense`, `income`, `capital`, `planned`).
2. **`FinanceTransaction` modeliga:**
   * `stage = models.CharField(max_length=30, default='realized', choices=[('planned', 'Reja'), ('realized', 'Bajarilgan'), ('debt', 'Nasiya'), ('archived', 'Arxiv')])`
3. **Yangi Model `FinanceMovementHistory` (Audit Tarixi):**
   * `transaction = ForeignKey(FinanceTransaction, on_delete=models.CASCADE, related_name='movements')`
   * `from_stage = models.CharField(max_length=50)`
   * `to_stage = models.CharField(max_length=50)`
   * `from_type = models.CharField(max_length=20)`
   * `to_type = models.CharField(max_length=20)`
   * `moved_by = ForeignKey(User, on_delete=models.SET_NULL, null=True)`
   * `moved_at = models.DateTimeField(auto_now_add=True)`
   * `note = models.CharField(max_length=255, blank=True)`

---

## 🧪 5. SIFAT VA VERIFIKATSIYA REJASI

1. **Django Migratsiyalari:** `makemigrations` va `migrate` xatosiz o'tishi.
2. **Unit Testlar (`backend/finance/tests.py`):**
   * Yangi kategoriya (izoh va emoji bilan) yaratish testi.
   * Operatsiyani tahrirlash (Edit) testi.
   * Kartochkani surish (Drag-and-Drop) va `FinanceMovementHistory` yozilishi testi.
   * Balans qayta hisoblanishi testi (Kirimdan Chiqimga surilganda sof foyda to'g'ri o'zgarishi).
   * Excel va PDF eksport viewlarining 200 OK qaytarishi.
3. **Brauzer va UI Sinovi:**
   * Mobil (375px, 412px), planshet (768px, 1024px) va kompyuter ekranlarida silliq ishlash.
   * Matn mikrofon ikonkasi ustiga chiqib ketmasligini tekshirish.
   * Barcha raqamlar `15 000 000 so'm` formatida ko'rinishi.
