# TZ — Lokal noutbukda: yangi restoran, taom rasmidan avtomatik 3D menyu

**Sana:** 2026-10-16 · **Holat:** ⏳ tasdiq kutilmoqda · **Asos:** branch `fix/restaurant-phase0-security` (Bosqich 0 tayyor)
**Bog'liq TZ:** `TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md` (R-3D-01…05, R-GST-07/08)

## Maqsad
Server bo'lmagan holda, noutbukda bitta **yangi restoran** ochiladi. Admin taomni nomi, narxi va **rasmi** bilan kiritadi, tizim o'sha rasmdan **avtomatik 3D model** yasaydi. Mehmon esa telefonda (shu Wi-Fi tarmog'ida) menyuni ochib, taomni **3D aylantirib** ko'radi. AR (stol ustida ko'rish) bu bosqichga kirmaydi.

## Qarorlar
- **Restoran:** yangi restoran ochiladi. "Registon Restorani"dagi 33 ta demo taomga tegilmaydi.
- **Taomlar:** sinov uchun 3–5 ta taom bilan boshlanadi, haqiqiy menyu keyinroq.
- **3D:** taom rasmi yuklanadi va tizim avtomatik 3D yasaydi.
- **Ko'rinish:** hozircha faqat 3D aylantirish, AR yo'q.

## Ochiq gaplar (rostini aytganda)
1. **Noutbukning o'zida rasmdan 3D yasab bo'lmaydi.**
   - Sizda GTX 1650 Ti (4 GB videoxotira) va 7.5 GB RAM bor, uning 6 GB qismi doim band.
   - Ochiq rasm→3D modellar (TripoSR va boshqalar) men bilishimcha kamida ~6 GB videoxotira talab qiladi.
   - Yagona real yo'l — **bulut AI xizmati** (Meshy yoki Tripo). Ular uchun kodda boshlang'ich integratsiya bor, lekin u ishlamaydi va hech qayerga ulanmagan.
2. **Xizmat pullik.**
   - Taxminan har bir taom uchun $0.1–0.5 (manbalar bir-biriga zid, aniq narxni xizmat saytida tekshirish kerak).
   - Akkaunt, API kalit va xorijiy karta (Visa yoki Mastercard) kerak.
3. **Sifat.**
   - Bitta rasmdan yasalgan model taxminiy bo'ladi: taomning orqa tomonini AI "taxmin qiladi".
   - Osh, somsa, kabob kabi qattiq taomlar yaxshiroq chiqadi. Sho'rva, ichimlik va shaffof idishlar yomon chiqadi.
   - Shuning uchun natija avval 3–5 taomda sinaladi.
4. **Vaqt.** Bitta model 1–5 daqiqada tayyor bo'ladi, shuning uchun generatsiya fonda bajariladi va admin sahifasi kutib qotib qolmaydi.

## Bajariladigan ishlar (ketma-ketlik)

| # | Ish | Natija |
|---|---|---|
| **1** | **Yangi restoran.** `create_restaurant` buyrug'i yoziladi: restoran, egasining login va paroli, zal va stollar. Mehmon menyusi qaysi restoranni ko'rsatishi admin sozlamasi bilan tanlanadi (hozir "stollari bor birinchi do'kon" olinadi) | Menyuda yangi restoran ko'rinadi |
| **2** | **Taom kiritish.** Mavjud seller formasi ishlatiladi: nom, narx, kategoriya, rasm. "Topilmasa — birinchi uchragan umumiy modelni qo'yish" xatosi va rekursiya tuzatiladi (R-3D-02, R-3D-04) | Taom tez saqlanadi, unga begona 3D model qo'yilmaydi |
| **3** | **Rasm→3D navbati.** Har bir taomning 3D holati yuritiladi: `kutilmoqda → tayyorlanmoqda → tayyor / xato`. Rasm yuklanganda generatsiya avtomatik boshlanadi (sozlamada yoqiladi yoki o'chiriladi), "3D qayta yaratish" tugmasi ham bo'ladi | Admin taom holatini ko'radi |
| **4** | **Fon ishchisi.** `python manage.py run_3d_worker` buyrug'i Redis'siz, baza navbati bilan ishlaydi. Rasm xizmatga fayl yoki base64 ko'rinishida yuboriladi, shuning uchun noutbukka ochiq manzil kerak emas | Server qotmaydi |
| **5** | **AI xizmati.** Meshy yoki Tripo ulanadi: rasmiy hujjat bo'yicha tekshiriladi va tuzatiladi. Xizmat tanlovi va API kalit `.env` orqali beriladi. Kunlik xarajat limiti qo'yiladi. Kalit yo'q paytda butun zanjirni sinash uchun **demo provayder** bo'ladi (faqat `DEMO_MODE` da) | Kalit kelishi bilan haqiqiy 3D ishlaydi |
| **6** | **Modelni yengillashtirish.** Tayyor GLB yuklab olinadi va `gltf-transform` (noutbukda Node bor) bilan ≤ 2 MB gacha siqiladi, keyin taomga biriktiriladi | Telefonda tez ochiladi |
| **7** | **Mehmon menyusi.** `/menu/` yangi restoran taomlarini bazadan ko'rsatadi. 3D tugmasi faqat model tayyor bo'lganda chiqadi, tayyor bo'lmasa rasm va "3D tayyorlanmoqda" yozuvi ko'rinadi. Frontend'dagi nom bo'yicha "taxmin qilish" (Smart3DMatcher) server ma'lumotini almashtirmaydi. Model yuklanmasa rasmga qaytiladi (R-3D-03) | Mehmon faqat o'z taomining 3D modelini ko'radi |
| **8** | **Lokal ishga tushirish.** Bitta buyruq (`start_local.sh`) server va 3D ishchisini birga yoqadi, tunnelsiz. Telefonda `http://<noutbuk-IP>:8001/menu/?table=1` ochiladi | Telefondan sinash mumkin |
| **9** | **Sinov.** 3–5 ta taom kiritiladi, avtomatik testlar yoziladi, natija sizga ko'rsatiladi | Qabul |

## Qabul mezonlari
1. Admin taom rasmini yuklaganidan keyin ≤ 5 daqiqada taom holati "tayyor" bo'ladi va 3D model menyuda paydo bo'ladi.
2. Telefonda (bitta Wi-Fi tarmog'ida) menyu ochiladi, 3D modelni barmoq bilan aylantirish mumkin, model ≤ 2 MB.
3. 3D modeli yo'q taomda faqat rasm ko'rinadi, begona model hech qachon qo'yilmaydi.
4. Generatsiya xatosi admin'ga sababi bilan ko'rsatiladi va server qotmaydi.
5. Bosqich 0 xavfsizlik testlari va yangi testlar o'tadi. Hech narsa o'chirilmaydi, eski oqimlar flag ortiga yashiriladi.

## Kerak bo'ladigan narsalar (sizdan)
- **AI xizmati tanlovi va API kaliti:** Meshy yoki Tripo, karta orqali to'lov. Kalitsiz 1–4 va 6–9 ishlarni demo provayder bilan qilib, sinash mumkin.
- **3–5 ta sinov taomi:** nomi, narxi va rasmi. Rasm yaxshi yorug'likda, taom yon tomondan, fon toza bo'lishi kerak.
