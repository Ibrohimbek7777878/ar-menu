# 📋 ONLINE STORE (MARKETPLACE) MINI ERP QO'LLANMASI

Marketplace sotuvchilari uchun Mini ERP quyidagi asosiy funksiyalarni taqdim etadi:

---

## 1. Do'kon Boshqaruvi (`/seller/`)
* **Asosiy Metrikalar:**
  * Bugungi va oylik umumiy savdo aylanmasi.
  * Faol buyurtmalar soni (Kutilmoqda, Yig'ilmoqda, Kuryerda).
  * O'rtacha buyurtma qiymati (AOV) va xaridorlar soni.
  * Eng ko'p sotilgan tovarlar (Top 5).

---

## 2. Ombor va Sklad Boshqaruvi (`/seller/products/`)
* **Qoldiqlar Nazorati:** Har bir tovarning qolgan soni, kam qolgan tovarlar haqida qizil ogohlantirish.
* **Tezkor Qo'shish & Import:**
  * Bir nechta rasmlar yuklash.
  * CSV/Excel fayli orqali 1000 ta tovarni 1 daqiqada bazaga yuklash (`/seller/products/import-csv/`).
  * Shtrix-kod va artikul (SKU) bilan ishlash.
* **Narxlar va Aksiya:** Asosiy narx, chegirmali narx va aksiya muddati.

---

## 3. Buyurtmalar va Kuryerlik Dispetcherligi (`/seller/orders/`)
* **Buyurtma Holatlari:**
  * ⏳ `pending` — Yangi buyurtma, do'kon qabul qilishi kutilmoqda.
  * 📦 `confirmed / preparing` — Tovar do'konda qadoqlanmoqda.
  * 🚗 `out_for_delivery` — Buyurtma kuryerga topshirildi, kuryer xaritada yo'lda.
  * ✅ `delivered` — Mijozga topshirildi va to'lov yakunlandi.
* **Kuryerga Biriktirish:**
  * Gulistondagi bo'sh kuryerlar ro'yxatidan tanlash yoki avtomatik eng yaqin kuryerga biriktirish.
  * Kuryer ilovasida xaridor telefon raqami va GPS nuqtasi ochiladi.
