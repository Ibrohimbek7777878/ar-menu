# 🍽 MAHSULOT #1: RESTORAN 3D/AR VA NFC MENYU (HoReCa OS)
**Sana:** 01.10.2026  
**Biznes Modeli:** B2B SaaS (Restoranlar va kafelar uchun oylik obuna + sozlash to'lovi)  
**Holat:** 100% Barqaror, Testlangan, Sotuvga Tayyor

---

## 🎯 1. Mahsulot Mohiyati va Qiymati (Grand Slam Offer)

Restoran egasi uchun bu oddiy elektron menyu emas — bu **ofitsiant xatolarini yo'qotuvchi**, **o'rtacha chekni 15-20% ga oshiruvchi** va **1 ta ofitsiantning oyligini tejovchi** avtonom tizim:

1. **Interaktiv 3D Vitrina:** Taom smartfon kamerasida stol ustida paydo bo'ladi (Google WebXR / model-viewer). Mehmon porsiyani va ko'rinishini real ko'radi.
2. **NFC / QR Tezkor Stol Kirish:** Mehmon QR-kodni skaner qilishi yoki telefonini stoldagi yog'och/akril stendga tekkazishi (NFC) kifoya — tizim darhol stol raqami va zalni taniydi.
3. **Stolda Naqd To'lov (Cash at Table):** O'zbekiston bozoriga 100% moslashtirilgan. Mehmon onlayn to'lovga majburlanmaydi, buyurtma darhol oshxonaga tushadi va hisob ofitsiantga to'lanadi.
4. **Tezkor Xizmat Chaqiruvi:** 1 klikda ofitsiant chaqirish: 🫖 Choy yangilash, 🍞 Issiq non, 🔔 Ofitsiant, 🧾 Hisob-kitob (Chek).

---

## 🔗 2. Asosiy URL Marshrutlari

| Sahifa / Funksiya | URL Manzili | Tavsif |
| :--- | :--- | :--- |
| **Bosh 3D Menyu** | `/` yoki `/restaurant/` | Mobil va desktop uchun to'liq moslashuvchan interaktiv 3D restoran menyusi |
| **WebXR 3D Menyu** | `/ar/` | Ultra-zamonaviy 3D model-viewer sahifasi |
| **Stol QR Kirish** | `/m/<slug>/?t=<token>` | Muayyan restoranning stoliga avtomatik biriktirilgan menyu |
| **Tezkor Stol Token** | `/t/<token>/` | Stol qisqa havolasi |
| **Savat** | `/restaurant/cart/` | Stoldagi mehmonlar tanlagan taomlar ro'yxati |
| **Rasmiylashtirish** | `/restaurant/checkout/` | Stolda / Olib ketish / Yetkazib berish (Standart: Naqd / Stolda) |
| **Mening Stolim & Bron** | `/restaurant/table/` | Jonli hisob, buyurtma statusi, ofitsiant chaqiruvi, stol bron qilish |
| **Buyurtma Statusi** | `/tma/order/<id>/` | Jonli oshxona statusi kuzatuvi (Kutilmoqda -> Tayyorlanmoqda -> Tayyor -> Stolga berildi) |

---

## 💼 3. Narx Belgilash (Pricing Strategy)

* **Ulanish va Sozlash (Setup Fee):** 1,500,000 so'm (NFC stendlar, 3D taomlarni kiritish, xodimlarni o'rgatish).
* **Oylik SaaS Obunasi:** 500,000 so'm / oy (Texnik ko'mak, server, KDS, Telegram bot nazorati).
* **Kafolat:** Agar 14 kun ichida tizim restoranga foyda keltirmasa — pullar 100% qaytariladi va stendlar sovg'a sifatida qoldiriladi.
