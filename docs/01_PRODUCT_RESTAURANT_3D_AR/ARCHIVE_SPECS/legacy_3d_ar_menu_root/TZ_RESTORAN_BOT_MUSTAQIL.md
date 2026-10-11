# 📋 TEXNIK TOPSHIRIQ (TZ): MUSTAQIL RESTORAN 3D AR TELEGRAM BOT VA MINI APP (TMA)
### "Smart Restaurant 3D Bot" — 1-Alohida Sotiladigan Mahsulot

> **Hujjat nomi:** `TZ_RESTORAN_BOT_MUSTAQIL.md`  
> **Konsepsiya:** Ushbu bot va uning Mini App'i veb-saytga bog'lanmagan holda, **100% mustaqil mahsulot** sifatida sotiladi.  
> **Fokus:** Eski "Online Store Guliston" va "3D printer" kabi aralash narsalardan to'liq tozalangan, faqat HoReCa (Restoran, Kafe, Milliy taomlar) uchun moslashtirilgan zamonaviy 3D menyu va stollar monitoringi.

---

## 🏛 1. STRATEGIK BO'LINISH: 4 TA MUSTAQIL MAHSULOT

Loyihamiz 4 ta alohida sotiladigan tijoriy yo'nalishga ajratiladi:

1. **1-MAHSULOT (Hozirgi asosiy fokus): Restoranlar uchun Mustaqil 3D AR Telegram Bot + Mini App.** (Saytsiz ham o'zi alohida sotiladi).
2. **2-MAHSULOT:** 3D / AR Menyu Veb-sayt platformasi (O'z domenida ishlovchi alohida veb-portal).
3. **3-MAHSULOT:** Online Store Guliston (Ko'p tarmoqli umumiy marketpleys).
4. **4-MAHSULOT:** 3D Printer Studiyasi va boshqa bizneslar uchun Online Store Builder.
*(Kelajakda saytga qo'shimcha sotiladigan "Mini ERP Bot" alohida ustama bilan beriladi).*

---

## 🎯 2. MAHSULOTNING ASOSIY VAZIFALARI

1. **Mehmon (Mijoz) uchun:**
   * Botga kirishi bilanoq chiroyli restoran atmosferasini his qilish.
   * Mini App (TMA) orqali menyuni ochish: faqat taomlar, ichimliklar, shirinliklar.
   * Taomlarni 3D AR formatda ko'rish (stol ustida real hajmda).
   * Stol raqamini ko'rsatgan holda buyurtma berish yoki ofitsiantni chaqirish.
2. **Biznes egasi (Restoran xo'jayini/Administratori) uchun:**
   * Bugun qaysi stollardan nechta zakaz tushganini ko'rish.
   * Qaysi stolda mehmon o'tirganini (Band / Bo'sh / Bron) bilish.
   * Har bir stol aynan nimalar buyurtma qilganini jonli kuzatish.
   * Kunlik tushum va faollik hisobotini bir zumda olish.

---

## 🎨 3. DIZAYN VA VIZUAL TRANSFORMATSIYA TALABLARI

### 3.1. Hozirgi holatdan nimalar olib tashlanadi:
* ❌ "Online Store Guliston" sarlavhalari, logosi va matnlari.
* ❌ 3D printer xizmati (5% keshbek) va unga oid tugmalar.
* ❌ 28 xil do'kon turlari, supermarket tovarlari, kiyim-kechak, maishiy texnika kategoriyalari.

### 3.2. Yangi Restoran Dizayni (Telegram Mini App):
* **Ranglar palitrasi:** Premium Restoran uslubi — Luxury Dark Mode (To'q qora `#0f172a`, Warm Gold `#f59e0b` yoki Emerald Fresh Green `#059669`).
* **Kategoriyalar:**
  * 🍲 Issiq taomlar (Milliy & Yevropa)
  * 🥩 Kaboblar va Go'sht mahsulotlari
  * 🥗 Salatlar va Gazaklar
  * 🍹 Ichimliklar va Choylar
  * 🍰 Desertlar va Shirinliklar
* **Taom kartochkasi dizayni:**
  * Ishtaha ochuvchi katta sifatli rasm.
  * `[ ✨ 3D AR Ko'rish ]` jozibador pulsatsiyalanuvchi tugmasi.
  * Taom narxi, tarkibi va porsiya hajmi.
  * 1-bosish bilan savatga qo'shish (`+` / `-`).

---

## ⚙️ 4. IKKI TOMONLAMA FUNKSIONAL TUZILMA

### A) MEHMON REJIMI (GUEST EXPERIENCE)
1. **/start bosilganda:**
   * Salomlashuv: *"Assalomu alaykum! [Restoran nomi] rasmiy 3D menyusiga xush kelibsiz!"*
   * Tugma: **[ 🍽 Menyuni ochish (3D AR) ]** (Telegram Mini App ochiladi).
2. **Mini App ichida:**
   * Agar mehmon NFC/QR orqali kirgan bo'lsa: Stol raqami tepada `📍 Stol №4` deb avtomatik chiqadi.
   * Agar mehmon to'g'ridan-to'g'ri botdan kirgan bo'lsa: Stol raqamini kiritish yoki bron qilish taklif etiladi.
3. **3D AR Model Ko'rish:**
   * Taom ustiga bosilganda veb-brauzerga chiqmasdan, to'g'ridan-to'g'ri Telegram Mini App ichida 3D taom aylanadi va stol ustida ko'rsatiladi.
4. **Buyurtma / Ofitsiant chaqirish:**
   * "Buyurtma berish" bosilganda tasdiqlanadi va bevosita restoranning xizmatchilariga boradi.
   * "🔔 Ofitsiant chaqirish" tugmasi bir bosishda ishlaydi.

---

### B) BIZNES EGASI REJIMI (OWNER DASHBOARD)
Biznes egasi (admin chat ID) botga kirganda quyidagi menyuni ko'radi:
* **[ 📊 Kunlik Hisobot ]**
* **[ 🪑 Stollar Xaritasi ]**
* **[ 🍽 Menyu Narxlari ]**

#### 1. Kunlik Hisobot ekrani:
```text
📊 BUGUNGI RESTORAN HISOBOTI (28.09.2026)
🏪 Restoran: "Shosh Milliy Taomlari"

📦 Jami buyurtmalar: 34 ta
💰 Umumiy tushum: 4,820,000 so'm
🔥 Eng ko'p sotilgan: Qozon kabob (18 ta)
```

#### 2. Stollar Xaritasi va Har bir stol nima olgani:
Biznes egasi `[ 🪑 Stollar Xaritasi ]` tugmasini bossa:
```text
🪑 STOLLAR HOLATI (Jami 12 ta stol):
🟢 Bo'sh: 7 ta | 🔴 Band: 4 ta | 🟡 Bron: 1 ta

[ 🔴 Stol 1 ]  [ 🟢 Stol 2 ]  [ 🔴 Stol 3 ]
[ 🔴 Stol 4 ]  [ 🟢 Stol 5 ]  [ 🟡 Stol 6 ]
```
Biznes egasi masalan `[ 🔴 Stol 1 ]` ni bossa, stol ichidagi zakaz ochiladi:
```text
📍 STOL № 1 — BUYURTMA TAFSILOTI
Holati: Band (Ofitsiant: Jasur)
Ochilgan vaqti: 14:15 (45 daqiqadan beri o'tirishibdi)

🍽 Olingan taomlar:
1. 2x Qozon kabob — 140,000 so'm
2. 1x Achchiq-chuchuk — 15,000 so'm
3. 1x Qora choy limonli — 12,000 so'm
4. 2x Tandir non — 10,000 so'm

💵 Jami hisob: 177,000 so'm
```

---

## 📋 5. ISHNI BOSHLASH VA TEXNIK AMALGA OSHIRISH BOSQICHLARI

Ishlar 4 ta aniq bosqichda amalga oshiriladi:

### 1-Bosqich: Telegram Webhook va Bot javoblarini tozalash
* `backend/web/telegram_webhook.py` faylidan eski online store, 3D printer va boshqa do'kon kodlarini to'liq olib tashlash.
* Toza, faqat restoranga xos `/start`, `/menu`, `/stollar`, `/admin` buyruqlarini ulash.

### 2-Bosqich: Mini App (TMA) Shablonlarini Restoran Dizayniga O'tkazish
* `backend/templates/tma/base_tma.html` va `home.html` fayllaridan eski brendingni olib tashlash.
* Zamonaviy Food-menu dizayni, toifalar (Issiq taomlar, Ichimliklar...), 3D ko'rish tugmasini sozlash.

### 3-Bosqich: Biznes Egasi Uchun Stollar Monitoringi Mantiqini Ulash
* Mavjud `Table` va `Order` modellaridan foydalanib, biznes egasi botda stollar ro'yxatini, har bir stol nimalar olganini va kunlik hisobotni ko'radigan qismini yozish.

### 4-Bosqich: Demo Ma'lumotlar bilan 100% Sinovdan O'tkazish
* 5 ta mazali taom (osh, kabob, somsa...) va ularning 3D modellarini kiritib, NFC/QR orqali telefon va Telegramda tekshirish.

---

> **Natija:** Siz qo'lingizda har qanday restoranga borib, alohida mustaqil mahsulot sifatida ko'rsatib, darhol sotishingiz mumkin bo'lgan mukammal **3D AR Telegram Bot**ga ega bo'lasiz.
