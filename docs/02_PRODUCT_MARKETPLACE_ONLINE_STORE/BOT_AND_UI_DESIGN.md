# 🤖 MARKETPLACE SHOPPING BOT VA UI DIZAYNI SPETSIFIKATSIYASI

---

## 1. Veb & TMA UI/UX Standartlari

* **Ranglar:**
  * Fon: `#ffffff` / `#f8fafc` (Ultra Clean White)
  * Asosiy aksent: `#2563eb` (Royal Blue)
  * Ikkinchi aksent: `#10b981` (Emerald Green)
  * Matn: `#0f172a` (Slate Black), `#64748b` (Cool Grey)
* **Kompakt Xarid Savatchasi:**
  * Do'konlar bo'yicha guruhlangan tovarlar.
  * Yetkazib berish narxini real vaqtda masofaga qarab hisoblash.
  * Promokod / Kupon kiritish maydoni.

---

## 2. Telegram Shopping Bot Buyruqlari

* **Token Kaliti:** `TELEGRAM_MARKET_BOT_TOKEN`
* **Webhook Manzili:** `/bot/market/webhook/`

| Buyruq | Vazifasi va Bot Javobi |
| :--- | :--- |
| `/start` | Gipermarketga xush kelibsiz! `[ 🛍 Do'konni ochish ]` (TMA: `/market/`), `[ 📦 Buyurtmalarim ]` |
| `/catalog` | Toifalar ro'yxati (Elektronika, Kiyim, Bozor, Dorixona...) inline tugmalarda |
| `/search <so'z>` | Tovar qidirish: masalan `/search iPhone` yoki `/search krossovka` |
| `/cart` | Xaridorning faol savatchasidagi tovarlar soni va narxi |
| `/orders` | Buyurtma statusi kuzatuvi (`Kuryer yo'lda`, `Yetkazildi`) |

---

## 3. Kuryer va Xaridor Bildirishnomalari

Buyurtma kuryerga biriktirilganda:
```
🚗 Kuryer biriktirildi!

📦 Buyurtma #GLS-8092
👤 Akmal Toshmatov
📞 +998901234567
📍 Guliston sh., 4-mavze, 12-uy

🧑 Kuryer: Sardor Aliyev
📞 Tel: +998991112233
⏰ Taxminiy yetkazish: 25-35 daqiqa
```
Mijoz o'z telefonida kuryer kelayotganini xaritada jonli ko'rib turadi.
