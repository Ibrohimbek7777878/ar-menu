# 🤖 RESTORAN BOTI VA UI DIZAYNI SPETSIFIKATSIYASI

---

## 1. Telegram Mini App (TMA) UI/UX Standartlari

* **Ranglar:**
  * Fon: `#0f172a` (Deep Slate Navy)
  * Kartochkalar: `#1e293b` (Elevated Slate)
  * Asosiy aksent: `#f59e0b` (Amber Gold)
  * Matn: `#f8fafc` (Ultra White), `#94a3b8` (Muted Slate)
* **Mobil Pastki Navigatsiya (Bottom Navigation):**
  1. `🍽 Menyu` — Toifalar va 3D taomlar vitrinasi.
  2. `🍲 Bo'limlar` — Toifalar filtri (Milliy, Kabob, Ichimliklar...).
  3. `🥽 3D AR` — 3D zal va WebXR ko'rgazmasi.
  4. `🧾 Savat` — Stoldagi buyurtmalar savati va dynamic counter.
  5. `📍 Stolim` — Stol statusi, ofitsiant chaqirish, jonli chek.
* **In-Place 3D Modal Viewer:**
  * Taom kartochkasidagi `[ 🥽 3D ]` tugmasi bosilganda sahifa yangilanmaydi yoki yangi oynaga sakramaydi.
  * O'sha yerning o'zida silliq animatsiya bilan to'liq ekranli 3D modal ochiladi, foydalanuvchi taomni barmog'i bilan aylantirib, kattalashtirib ko'radi va `[ Stolga qo'yish ]` tugmasi orqali WebXR AR kamerasini ishga tushiradi.

---

## 2. Telegram Bot Buyruqlari va Javoblari

| Buyruq | Kim Uchun | Botning Javobi va Harakati |
| :--- | :--- | :--- |
| `/start` | Mehmon | 3D Menyu salomlashish xabari + `[ 🍽 3D Menyu ]` va `[ 📍 Stolim ]` tugmalari |
| `/start table_<num>` | Mehmon (QR/NFC) | "Siz Stol №<num> ga ulandingiz!" xabari va stol biriktirilgan menyuni ochish |
| `/menu` | Barcha | TMA restoran menyusini ochish havolasi |
| `/stollar` | Admin/Xodim | Barcha stollar, bo'sh/band, tushum hisoboti |
| `/kassa` | Biznes egasi | Bugungi kirim, chiqim va sof foyda hisobi |
| `/id` | Barcha | Foydalanuvchining Telegram Chat ID raqami |

---

## 3. Oshxona va Ofitsiant Bildirishnoma Zanjiri

Buyurtma tushganda restoran guruhiga yuboriladigan format:
```
🛒 Yangi buyurtma!

📦 #GLS-10492
🍽 STOL: №7 (Asosiy zal)
👤 Mehmon (Stol №7)
📞 +998901234567
📍 Stol №7 (Asosiy zal)

🛍 Mahsulotlar:
  • Samarqand Oshi x2 — 90,000 so'm
  • Achchiq-chuchuk x1 — 15,000 so'm
  • Ko'k choy x1 — 8,000 so'm

💰 Jami: 113,000 so'm
🚗 Yetkazish: 0 so'm (Stolda bepul)
💳 To'lov: 113,000 so'm (Naqd / Stolda)

[ 👨‍🍳 Tayyorlanmoqda ]  [ ✅ Tayyor ]
[ 🍽 Stolga berildi ]   [ ❌ Bekor qilish ]
```
Tugma bosilganda callback orqali buyurtma holati o'zgaradi va mijozning ekranida ham status jonli yangilanadi.
