# 🖨 MAHSULOT #3: 3D PRINTING & ENGINEERING STUDIO
**Sana:** 01.10.2026  
**Biznes Modeli:** On-Demand 3D Manufacturing & Rapid Prototyping (Talab bo'yicha 3D bosib chiqarish va muhandislik xizmatlari)  
**Holat:** 100% Barqaror, Testlangan, Alohida Portal (`/studio/` va `/3d-print/`)

---

## 🎯 1. Mahsulot Mohiyati va Imkoniyatlari

Individual buyurtmachilar, avtoservislar, zavodlar va muhandislar uchun maxsus 3D bosib chiqarish markazi:
1. **Onlayn 3D Smetachi (3D Price Estimator):**
   * Foydalanuvchi `.stl`, `.obj` yoki `.step` faylini yuklaydi.
   * Brauzerda Three.js vositasida modelni 3D ko'rish va aylantirish imkoniyati.
   * Hajmi ($cm^3$), qatlam qalinligi (0.12mm, 0.2mm, 0.28mm), to'ldirish foizi (10%, 20%, 50%, 100%) bo'yicha avtomatik og'irlik va narx hisoblash.
2. **Keng Materiallar Tanlovi:**
   * **PLA** — Standart maketlar, arxitektura va suvenirlar (1 gr = 500 so'm).
   * **PETG** — Issiqlikka va kimyoviy moddalarga chidamli mustahkam detallar (1 gr = 700 so'm).
   * **ABS** — Avtomobil ehtiyot qismlari, zarbaga chidamli korpuslar (1 gr = 800 so'm).
   * **TPU (Flexible)** — Rezinasimon egiluvchan vtulkalar, qistirmalar (1 gr = 1 200 so'm).
   * **SLA Resin** — Mikron darajadagi zargarlik, stomatologiya va figuralar (1 gr = 2 000 so'm).
3. **5% Kafolatlangan Keshbek:** Har bir 3D buyurtmadan 5% keshbek hisoblanadi va keyingi buyurtmada avtomatik yechib olinadi.

---

## 🔗 2. Asosiy URL Marshrutlari

| Sahifa / Funksiya | URL Manzili | Tavsif |
| :--- | :--- | :--- |
| **3D Studio Bosh Sahifasi** | `/studio/` | 3D Studio taqdimoti, xizmatlar, materiallar tavsifi, 3D galereya |
| **3D Narx Kalkulyatori** | `/3d-print/` | STL/OBJ fayl yuklash, parametrlar tanlash va tezkor smeta |
| **Buyurtma Berish API** | `/3d-print/order/` | JSON buyurtma qabul qilish va Telegram bildirishnomasini ishga tushirish |
| **3D Ustaxona Mini ERP** | `/seller/studio/` | Print Queue Kanban doskasi, materiallar ombori, status boshqaruvi |

---

## 💼 3. 3D Studio va Boshqa Mahsulotlar O'rtasidagi Aloqa

* 3D Studio buyurtmalari alohida `Print3DOrder` modelida saqlanadi.
* Umumiy do'kon yoki restoran savati bilan aralashmaydi.
* Yuqori switcher orqali xohlagan vaqtda Restoran yoki Online Do'konga o'tish mumkin.
