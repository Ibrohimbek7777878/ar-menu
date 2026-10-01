# 🤖 3D PRINT ASSISTANT BOT VA UI DIZAYNI SPETSIFIKATSIYASI

---

## 1. Veb & TMA UI/UX Standartlari

* **Ranglar:**
  * Fon: `#0b0f19` (Cyber Dark) / `#111827` (Charcoal Slate)
  * Asosiy aksent: `#06b6d4` (Cyan Neon) / `#3b82f6` (Tech Blue)
  * Keshbek aksenti: `#f59e0b` (Gold)
  * Matn: `#f9fafb`, `#9ca3af`
* **Three.js 3D Interaktiv Sahna:**
  * Foydalanuvchi kompyuteri yoki telefonidan `.stl` faylni tortib tashlaganida (Drag-and-Drop) Three.js Canvas sahnasida 3D panjara (grid) va model paydo bo'ladi.
  * O'lchamlari ($X, Y, Z$ mm) va kamera aylanishi bilan vizual nazorat.

---

## 2. Telegram 3D Print Assistant Boti

* **Token Kaliti:** `TELEGRAM_STUDIO_BOT_TOKEN`
* **Webhook Manzili:** `/bot/studio/webhook/`

| Buyruq / Harakat | Vazifasi va Bot Javobi |
| :--- | :--- |
| `/start` | 3D Studio va muhandislik markaziga xush kelibsiz! `[ 🖨 3D Kalkulyator ]` (TMA: `/studio/`), `[ 🧵 Materiallar ]` |
| `/kalkulyator` | TMA 3D narx kalkulyatorini ochish |
| `/materiallar` | PLA (500 so'm/gr), PETG (700 so'm/gr), ABS (800 so'm/gr), TPU (1 200 so'm/gr), Resin (2 000 so'm/gr) narxlari va xususiyatlari |
| `/buyurtmalar` | Mijozning joriy va oldingi 3D buyurtmalari holati |
| **Fayl yuborilganda (`.stl`, `.obj`)** | Bot faylni qabul qiladi, hajmini tekshiradi, taxminiy gramm va narxini hisoblab beradi: *"Fayl qabul qilindi! Taxminiy og'irligi: ~45 gr. PLA narxi: 22,500 so'm (5% keshbek bilan: 21,375 so'm). Buyurtma berasizmi?"* |

---

## 3. Usta va Mijoz Xabarnomalari Formati

Usta uchun yangi 3D buyurtma tushganda:
```
🖨️ YANGI 3D PRINTER BUYURTMASI!
━━━━━━━━━━━━━━━━━━━
🔢 Buyurtma №: 3DP-91823
👤 Mijoz: Muzaffar Muhandis
📞 Telefon: +998901234567
🏷 Turi: Maxsus zakaz (Mijoz dizayni)
📦 Mahsulot: vtulka_v2.stl
🧵 Material: PETG | Rang: Qora mot
🔢 Soni: 4 dona
━━━━━━━━━━━━━━━━━━━
💰 Boshlang'ich narx: 90,000 so'm
🎁 5% Keshbek chegirmasi: -4,500 so'm
🚚 Dastavka: 0 so'm (Olib ketish)
💎 YAKUNIY TO'LOV: 85,500 so'm
━━━━━━━━━━━━━━━━━━━
📍 Manba: TMA 3D STUDIO (5% keshbek qo'llandi)

[ ⚙️ Chop etishni boshlash ]  [ ❌ Rad etish ]
```
