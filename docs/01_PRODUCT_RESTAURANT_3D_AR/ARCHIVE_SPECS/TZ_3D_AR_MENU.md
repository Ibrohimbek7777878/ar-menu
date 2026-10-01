# 📋 TEXNIK TOPSHIRIQ (TZ): RESTORANLAR UCHUN 3D AR ONLAYN MENYU VA TELEGRAM BUYURTMA TIZIMI
### (NFC / QR Smart Menu Platform)

> **Hujjat maqomi:** Qat'iy texnik yo'riqnoma (Faqat bitta fokus: 3D AR Menyu).  
> **Asosiy qoida:** Yangi ortiqcha funksiyalar qo'shilmaydi. Mavjud kod to'liq tozalab, faqat shu oqim bo'yicha sozlanadi.

---

## 🎯 1. LOYIHADAN KO'ZLANGAN ASOSIY MAQSAD VA YAGONA QIYMAT

### 1.1. Muammo (Restoran nima bilan qiynalyapti?):
1. **Qog'oz menyu qimmat va noqulay:** Taom narxi o'zgarsa yoki tugab qolsa, butun menyuni qayta chop etish kerak (har safar 500K - 1M so'm xarajat).
2. **Mijoz taomni ko'rmaydi:** Oddiy rasmda porsiya hajmi va qanday ko'rinishi sezilmaydi, natijada mehmon kutgani boshqa bo'lib chiqadi.
3. **Ofitsiant kutish noqulayligi:** Tushlik va kechki payt zal to'lganda, mehmon ofitsiantni 10-15 daqiqa kutadi, natijada norozi ketadi.

### 1.2. Yechim (Biz restoranga nima beramiz?):
* Stolda yog'och/akril **NFC / QR stend**.
* Mehmon telefonini tekkizadi (NFC) yoki kamerasini qaratadi (QR) — **1 soniyada interaktiv veb-menyu ochiladi** (hech qanday ilova o'rnatish shart emas).
* Taom ustidagi **«3D ko'rish»** tugmasi orqali taom stol ustida real o'lchamda paydo bo'ladi.
* Mehmon taomlarni tanlab **«Buyurtma berish»** yoki **«Ofitsiantni chaqirish»** tugmasini bosadi.
* Buyurtma bir soniyada **restoranning Telegram guruhiga/botiga** stol raqami bilan aniq tushadi.

---

## ⛔ 2. LOYIHADAN CHIQARIB TASHLANADIGAN (YASHIRILADIGAN) QISMLAR
*(Chalg'ituvchi va keraksiz barcha narsalar asosiy oqimdan olib tashlanadi)*
* ❌ 3D Print Studio (umuman kerak emas).
* ❌ Kuryerlik va GPS xarita orqali yetkazib berish tizimi.
* ❌ Dehqon bozori (Agro katalog) modullari.
* ❌ 25 xil do'kon turlari uchun shablonlar (faqat Restoran/Kafe shabloni qoladi).
* ❌ Murakkab obuna (Basic/Pro/Business) to'siqlari.

---

## 📱 3. FOYDALANUVCHI YO'LI (USER JOURNEY / FLOW)

```
[Stoldagi NFC / QR Stend]
         │
         ▼ (Telefon tekkiziladi yoki kamera tutiladi)
[Mobil Brauzer / Telegram Mini App]
(URL: https://domen.uz/m/<restoran_slug>/?table=<stol_raqami>)
         │
         ├──► 1. Kategoriyalarni ko'rish (Taomlar, Ichimliklar, Shirinliklar)
         ├──► 2. "3D AR da ko'rish" (Taom stol ustida real hajmda)
         ├──► 3. Savatga qo'shish va miqdorini belgilash
         └──► 4. "Buyurtma berish" yoki "Ofitsiantni chaqirish"
         │
         ▼ (Bir bosish bilan tasdiqlash)
[Restoranning Telegram Botiga darhol bildirishnoma boradi]
"🔔 Yangi buyurtma! Stol №5"
```

---

## 🛠 4. ASOSIY FUNKSIONAL TALABLAR (FAQAT 4 TA BLOK)

### BLOK 1: 3D AR Ko'ruvchi (Model Viewer) & Mobil Sahifa
1. **Model-Viewer integratsiyasi:**
   * Android/Chrome uchun: `.glb` format.
   * iOS/Safari uchun: `.usdz` format (QuickLook AR).
   * Har bir taom kartasida aniq va ko'rinarli **«✨ 3D da ko'rish»** tugmasi bo'lishi.
2. **Optimizatsiya va tezlik:**
   * 3D modellar hajmi 2-4 MB dan oshmasligi (mobil internetda 1-2 soniyada yuklanishi shart).
   * Yuklanish vaqtida chiroyli skleton (shimmer) yoki spinner animatsiyasi (qora qotib turgan ekran bo'lmasligi).
3. **Mobil dizayn:**
   * 100% Mobile-first responsive (iOS va Android ekranlarida xatosiz, silliq skroll).

### BLOK 2: Stol va QR/NFC Avto-Identifikatsiyasi
1. Har bir stol uchun unikal havola: `.../menu/?table=4` yoki tokenli xavfsiz URL.
2. Mehmon menyuga kirganda stol raqami avtomatik tanlanadi (mehmon o'zi stol qidirmaydi).
3. Savat (Cart) sessiyada saqlanadi, sahifa yangilansa ham buyurtma o'chib ketmaydi.

### BLOK 3: Telegram Bot Bildirishnoma Tizimi
1. Restoran xodimlari/administratori uchun maxsus Telegram guruh/bot.
2. **Yangi buyurtma formati:**
   ```
   🔔 YANGI BUYURTMA!
   📍 Stol raqami: № 4
   🕒 Vaqt: 14:35

   🍽 Taomlar:
   1. Oqtepa Lavash (Standart) — 2 x 32,000 = 64,000 so'm
   2. Qora choy (choynak) — 1 x 8,000 = 8,000 so'm

   💰 Jami summa: 72,000 so'm
   ```
3. **«Ofitsiantni chaqirish» tugmasi:**
   * Mehmonda alohida «🔔 Ofitsiantni chaqirish» tugmasi bo'ladi.
   * Bosilganda Telegram guruhga: `⚠️ DIQQAT! Stol №4 ofitsiant chaqirmoqda!` xabari tushadi.

### BLOK 4: Soddalashtirilgan Admin Panel (Restoran egasi uchun)
1. **Faqat eng zarur narsalar:**
   * Taom qo'shish / o'chirish / narxini o'zgartirish.
   * "Stop-list" (agar taom bugun tugagan bo'lsa, bitta tugma bilan yashirib qo'yish).
   * Taomga 3D fayl (`.glb`) yuklash yoki tayyor 3D kutubxonadan biriktirish.
   * Stollar ro'yxati va har bir stol uchun QR-kod yuklab olish (PDF/PNG formatda chop etishga tayyor).

---

## 🔧 5. MAVJUD KOD BAZASINI SOZLASH REJASI (Texnik topshiriq)

| Fayl / Qism | Hozirgi holat | Qilinadigan aniq vazifa |
|---|---|---|
| `backend/ar3d/` | Murakkab 3D Print modellari aralashib ketgan | Faqat `Product3DModel` va `ProductLibrary` qismini qoldirish, tozalash. |
| `backend/web/tma_views.py` | Buyurtma berish oqimi bor | Stol tokeni bilan buyurtma berishni soddalashtirish, ortiqcha forma maydonlarini olib tashlash. |
| `backend/notifications/telegram_bot.py` | 3 xil mahalla marketing xabari yuboradi | Restoran buyurtmalari uchun guruhga bir zumda formatli xabar yuborishga sozlash. |
| `templates/` | Ko'plab murakkab sahifalar bor | Mehmon ko'radigan menyu sahifasini ultra-yengil, tezkor va ko'rkam qilish. |
| `backend/backend/settings.py` | DEBUG=True, SECRET_KEY o'zgaradi | `DEBUG=False` qilib, barqaror muhitga o'tkazish. |

---

## 💼 6. RESTORAN EGASIGA TAQDIMOT STANDARTI (DEMO PAKET)

Restoranga sotishga borilganda ko'rsatiladigan tayyor to'plam:
1. **1 ta jismoniy namuna:** Yog'och yoki akril stol stendi (ustida NFC chip va QR-kod).
2. **Demo havola:** 5 ta milliy va yevropa taomi kiritilgan demo restoran (kamida 3 tasida haqiqiy chiroyli 3D model bo'lishi shart).
3. **Ko'rsatish ssenariysi (1 daqiqa):**
   * Telefonni stendga tekkizish.
   * 3D taomni stol ustiga qo'yib ko'rsatish.
   * "Buyurtma berish"ni bosish va darhol Telegram botda kelgan xabarni restoran egasiga ko'rsatish.

---

> **Natija:** Ushbu TZ bo'yicha tozalangan tizim ortiqcha yuklardan xoli, barqaror, 1 soniyada ochiladigan va restoran egasi ko'rishi bilanoq nimaligini tushunib pul to'laydigan mahsulotga aylanadi.
