# 📋 3D STUDIO MINI ERP QO'LLANMASI (PRINT QUEUE & USTAXONA)

3D printer ustasi va muhandisi uchun Mini ERP (`/seller/studio/`) quyidagi ustunlardan iborat:

---

## 1. Print Queue Kanban Doskasi

Har bir 3D buyurtma quyidagi bosqichlardan o'tadi:
1. ⏳ **Yangi / Kutilmoqda (`new`):**
   * Mijoz fayl yukladi, tizim boshlang'ich smetani hisobladi.
   * Usta modelni ko'rib chiqadi (kesishga yaroqliligi, tayanch / support zarurligi).
2. ⚙️ **Chop Etilmoqda (`printing`):**
   * Model printerga yuborildi va jarayon boshlandi.
   * Ushbu status tanlanganda mijozga avtomatik Telegram xabari boradi: *"Buyurtmangiz 3D printerda chop etilishni boshladi!"*.
3. 📦 **Tayyor / Sovutilmoqda (`ready`):**
   * Chop etish yakunlandi, tayanchlar olib tashlandi, sifat nazorati o'tkazildi.
   * Usta buyurtmaga tayyor detal fotosuratini biriktiradi.
   * Mijozga avtomatik tarzda: *"Buyurtmangiz tayyor! Sayxun ko'chasi 14 ustaxonamizdan olib ketishingiz mumkin"* xabari boradi.
4. ✅ **Topshirildi (`delivered`):**
   * Mijoz detalni qabul qilib oldi, to'lov kassa balansiga tushdi va 5% keshbek mijoz hisobiga yozildi.

---

## 2. Xomashyo va Filament Ombori

* Har bir material bo'yicha qoldiq hisobi:
  * PLA (Qora, Oq, Kulrang, Qizil) — g'altaklar soni va og'irligi.
  * PETG (Shaffof, Qora) — qoldiq gramm.
  * ABS, TPU, UV Resin (ml).
* Har bir buyurtma topshirilganda ombordagi xomashyodan sarflangan gramm avtomatik yechiladi.

---

## 3. Telemetriya va Smeta Tahlili

* Har bir buyurtma uchun:
  * Sarflangan material ($gr$).
  * Elektr energiyasi va mashina soati amortizatsiyasi.
  * 5% Keshbek chegirmasi.
  * Sof foyda marjasi.
