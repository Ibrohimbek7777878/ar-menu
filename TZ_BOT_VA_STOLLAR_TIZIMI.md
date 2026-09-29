# 📋 TEXNIK TOPSHIRIQ (TZ): TELEGRAM BOTDA 3D MENYU VA BIZNES EGASI UCHUN STOLLAR NAZORATI TIZIMI

> **Hujjat nomi:** `TZ_BOT_VA_STOLLAR_TIZIMI.md`  
> **Maqsad:** Veb qismga teginmagan holda, Telegram botni faqat 3D AR restoran menyusi va biznes egasiga stollar/zakazlar monitoringini beruvchi tizimga aylantirish.  
> **Asosiy qoida:** Ortiqcha yangi kod yozilmaydi. Mavjud modellar (`Table`, `NFCCard`, `Order`, `OrderItem`) botga ulanadi.

---

## 1. MAVJUD TIZIM HOLATI VA BO'SHLIQLAR TAHLILI

### 1.1. Bazada va Vebda mavjud qismlar:
* `tables_restaurant.models.Table` — stollar ro'yxati, zallar, sig'imi va statuslari (`free`, `occupied`, `ordering`, `ready`, `bill`).
* `tables_restaurant.models.NFCCard` — stollarga biriktirilgan NFC stendlar, chip kodlari va tekkizishlar soni (`tap_count`).
* `orders.models.Order` va `OrderItem` — har bir buyurtma qaysi stolga tegishli ekanligi (`order.table`), olingan taomlar nomi, soni va narxi.
* `backend/web/seller_views.py` — veb-brauzerda ofitsiant paneli va stollar statistikasi mavjud.

### 1.2. Telegram botdagi kamchiliklar:
* ❌ Botda "3D printer xizmati (5% keshbek)", "28 xil yo'nalishdagi do'kon" kabi restoranga aloqasiz xabarlar va tugmalar turibdi.
* ❌ Biznes egasi botga kirganda stollarning joriy holatini (qaysi biri bo'sh, qaysi biri band) ko'ra olmaydi.
* ❌ Bugun stollardan nechta zakaz tushganini va qaysi stol nimalar buyurtma qilganini bot orqali tekshirish imkoniyati ulanmagan.

---

## 2. FUNKSIONAL TALABLAR

Tizim Telegram botda ikkita asosiy yo'nalishga bo'linadi:
1. **Oddiy mehmonlar / mijozlar uchun:** Faqat toza 3D AR Menyu.
2. **Biznes egasi (Admin / Xo'jayin) uchun:** Stollar, bronlar va kunlik zakazlar nazorati.

---

## 3. MEHMONLAR UCHUN: BOT ICHIDA 3D MENYU

Mehmon botga `/start` yoki menyu so'rovi bilan kirganda:
1. Ortiqcha do'konlar va 3D printer reklamasi butunlay ko'rsatilmaydi.
2. Faqat bitta asosiy chiroyli xabar va tugma chiqadi:
   * **[ 🥽 3D AR Menyuni ochish ]** (Telegram Mini App — to'g'ridan-to'g'ri restoran menyusini ochadi).
   * **[ 📍 Mening stolim ]** (NFC/QR orqali stol biriktirilgan bo'lsa, o'sha stol buyurtmalarini ko'rsatadi).

---

## 4. BIZNES EGASI UCHUN: STOLLAR VA ZAKAZLAR MONITORINGI

Biznes egasi (maxsus chat ID ga ega do'kon egasi) botga kirganda yoki `/stollar`, `/admin` buyrug'ini yuborganda quyidagi tizimli hisobot chiqishi shart:

### 4.1. Umumiy kunlik monitoring formati:
```text
📊 BUGUNGI STOLLAR HISOBOTI (28.09.2026)
🏪 Restoran: "Milliy Taomlar"

🪑 Jami stollar: 12 ta
🟢 Bo'sh stollar: 8 ta
🔴 Band / Bron stollar: 4 ta

📦 Bugungi jami stol zakazlari: 19 ta
💰 Kunlik stollar tushumi: 2,450,000 so'm
```

### 4.2. Har bir stol bo'yicha interaktiv tugmalar:
Xabarning ostida har bir stol uchun inline tugmalar chiqadi:
* `[ 🔴 Stol 1 (Band) ]` `[ 🟢 Stol 2 (Bo'sh) ]`
* `[ 🔴 Stol 3 (Band) ]` `[ 🟢 Stol 4 (Bo'sh) ]`
* `[ 🔄 Yangilash ]`

### 4.3. Stol tafsiloti (Stol ustiga bosilganda):
Biznes egasi masalan `[ Stol 1 ]` tugmasini bossa, bot alohida xabar qaytaradi:
```text
📍 STOL № 1 TAFSILOTI
Holati: 🔴 Band (Buyurtma jarayonida)
NFC tekkizishlar soni: 3 marta

🍽 Hozirgi buyurtma:
• 1x Choyxona Palov — 45,000 so'm
• 2x Qora choy — 16,000 so'm
• 1x Achchiq-chuchuk — 12,000 so'm

💵 Jami hisob: 73,000 so'm
🕒 Vaqti: 13:40 da ochilgan

[ ⬅️ Orqaga ]  [ ✅ Stolni bo'shatish ]
```

---

## 5. TEXNIK ARXITEKTURA VA O'ZGARISHLAR XARITASI

Barcha o'zgarishlar faqat Telegram moduliga tegishli bo'ladi:

| Fayl | Vazifasi |
|---|---|
| `backend/web/telegram_webhook.py` | 1. Ortiqcha 3D printer va boshqa do'kon tugmalarini olib tashlash.<br>2. Faqat 3D menyu WebApp tugmasini qoldirish.<br>3. `/stollar` yoki Admin tugmasi orqali stollar monitoringini chiqarish. |
| `backend/notifications/admin_bot.py` | 1. Biznes egasiga bugungi stollardan tushgan buyurtmalar sonini hisoblash.<br>2. Tanlangan stol ichidagi taomlar (`OrderItem`) ro'yxatini formatlab ko'rsatish.<br>3. Stol statusini (Band / Bo'sh) Telegram orqali o'zgartirish callback query'si. |

---

## 6. SINOV VA NATIJA MEZONI
* [ ] Mehmon botga kirganda 1 soniyada toza 3D menyu tugmasini ko'radi.
* [ ] Biznes egasi telefonidagi Telegram orqali qaysi stolda qanday taom yeyilayotgani va bugun nechta zakaz tushganini jonli ko'rib turadi.
* [ ] Asosiy veb-saytga (`localhost:8000`) hech qanday salbiy ta'sir ko'rsatilmaydi.
