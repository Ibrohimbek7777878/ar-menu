# 📋 RESTORAN MINI ERP QO'LLANMASI (KDS, POS, KASSA)

Restoran biznes egasi, oshpaz va ofitsiantlar uchun mo'ljallangan operatsion Mini ERP quyidagi uchta asosiy paneldan iborat:

---

## 1. Stollar & Zallar Paneli (`/seller/tables/`)

* **Zallar (Halls):** Asosiy zal, 2-qavat, VIP xonalar, Terassa. Har bir zal bo'yicha stollar taqsimoti.
* **Stollar (Tables):**
  * Raqami, sig'imi (2, 4, 6, 8+ kishilik).
  * Holatlari:
    * 🟢 `free` (Bo'sh) — mehmon o'tirishiga tayyor.
    * 🟡 `ordering` (Buyurtma berilmoqda) — mehmonda savat ochiq yoki buyurtma yuborilgan.
    * 🔴 `occupied` (Band) — stolda mehmon ovqatlanmoqda.
    * 🟣 `bill` (Hisob so'ralgan) — mehmon chek chiqarishni so'ragan.
* **NFC & QR Generatsiya:**
  * Har bir stol uchun unikal token generatsiya qilinadi.
  * PDF ko'rinishida A6 formatdagi stol stendlarini 1-klikda chop etish imkoniyati (`/seller/tables/stands/print/`).

---

## 2. Oshxona Ekrani — KDS (`/seller/kds/`)

* Oshpazlar uchun mo'ljallangan real vaqt rejimidagi ekran.
* Stoldan buyurtma tushgan zahoti yangi karta paydo bo'ladi (ovozli bildirishnoma bilan):
  * **Stol raqami va zali:** Masalan: `Stol №5 (Asosiy zal)`
  * **Taomlar ro'yxati va soni:** `Samarqand oshi x2, Achchiq-chuchuk x1, Qora choy x1`
  * **Oshpazga maxsus izoh:** Masalan: *Piyozsiz, kam yog'li*.
  * **Boshqaruv tugmalari:**
    * `[ 👨‍🍳 Tayyorlanmoqda ]` -> Status `preparing` ga o'tadi.
    * `[ ✅ Tayyor — Ofitsiantga ]` -> Status `ready` ga o'tadi, ofitsiantga Telegramdan xabar boradi.

---

## 3. Ofitsiant POS Paneli (`/seller/waiter/`)

* Har bir ofitsiant smartfonida ochiladigan qulay interfeys:
  * Biriktirilgan stollardagi chaqiruvlarni qabul qilish (🔔 Choy, 🍞 Non, 🔔 Ofitsiant, 🧾 Hisob).
  * Taom tayyor bo'lganda olib borish va `delivered` qilish.
  * Naqd to'lovni qabul qilib stolni `free` (bo'sh) holatiga o'tkazish.

---

## 4. Telegram orqali Jonli Monitoring (`/stollar` va `/kassa`)

Biznes egasi xohlagan daqiqada Telegram botga kirib quyidagi hisobotlarni oladi:
* `/stollar`:
  ```
  📊 BUGUNGI STOLLAR HISOBOTI (01.10.2026)
  🏪 Restoran: "Registon Lounge"

  🪑 Jami stollar: 14 ta
  🟢 Bo'sh stollar: 9 ta
  🔴 Band / Bron stollar: 5 ta

  📦 Bugungi jami stol zakazlari: 23 ta
  💰 Kunlik stollar tushumi: 3,120,000 so'm
  ```
* `/kassa`:
  ```
  📊 Registon Lounge — Bugungi Kassa
  🟢 Kirim: 3 120 000 so'm
  🔴 Chiqim: 450 000 so'm
  💎 Sof kassa: 2 670 000 so'm
  ```
