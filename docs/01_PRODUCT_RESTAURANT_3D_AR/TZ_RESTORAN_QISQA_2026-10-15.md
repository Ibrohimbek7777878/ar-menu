# Restoran 3D/AR menyu — qisqa TZ

**Sana:** 2026-10-15 · **Holat:** ⏳ tasdiq kutilmoqda · **To'liq versiya:** `TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md` (76 band, fayl va qator havolalari bilan)

## Maqsad
Restoranni real ishlaydigan va xavfsiz qilish. QR → menyu → buyurtma → oshxona → ofitsiant → kassa zanjiri bitta server orqali ishlashi va hamma qurilmada bir xil ko'rinishi kerak.

## Qarorlar
- **Xodim kirishi:** login va parol. Rollar: admin, ofitsiant, oshpaz, hostess.
- **Xizmat haqi:** yo'q. 10% hamma joydan yashiriladi.
- **Server va domen:** keyinroq. Hozircha mavjud serverda ishlanadi.
- **O'chirmaslik:** mock va demo ma'lumotlar `DEMO_MODE` flag ortiga yashiriladi, hech narsa o'chirilmaydi.

## Bosqich 0 — Xavfsizlik
1. 8 ta seller sahifasiga himoya qaytariladi. Bot tokeni sahifada ko'rinmaydi.
2. KDS, ofitsiant va hostess sahifalari hamda ularning API'lari faqat login qilgan xodimga ochiladi.
3. Restoran API'sidagi xodim amallari (stol yopish, moliya, bron) faqat xodimga va faqat o'z restorani doirasida.
4. Stol yopilganda faqat shu restoranning shu stolidagi ochiq buyurtmalar yopiladi.
5. Taom narxi faqat serverdan olinadi.
6. To'lov kaliti bo'lmasa callback rad etiladi. Demo to'lov yopiladi.
7. XSS: 15 ta shablonda `|safe` → `json_script`.
8. Telegram webhook maxfiy kalit bilan tekshiriladi, test endpoint'lari yopiladi.
9. Mehmon sahifalaridan admin tugmalari (3D yaratish, QR chop etish) yashiriladi.
10. Ofitsiant huquqlari cheklanadi: moliya, eksport va o'chirish yo'q.
11. Testlar internetga chiqmaydi.

## Bosqich 1 — Restoranni ishlaydigan qilish
1. QR havolasidagi 500 xatosi tuzatiladi. QR kod doimiy bo'ladi va 24 soatda eskirmaydi.
2. React API 8001-portga ulanadi.
3. Haqiqiy savat va checkout: buyurtma bir marta yuboriladi, xatoda to'g'ri xabar chiqadi. Qo'lda stol raqami kiritilganda 500 bo'lmaydi.
4. Buyurtma raqamlari to'qnashmaydi.
5. Menyu faqat shu restoran taomlarini to'liq ko'rsatadi. Stop-list ishlaydi.
6. Ofitsiant chaqiruvi bazaga yoziladi va ofitsiantga yetib boradi.
7. Ofitsiant POS buyurtma yarata oladi.
8. KDS har 5 soniyada yangilanadi va yangi buyurtmada ovoz chiqaradi. Tugagan buyurtmalar ekrandan ketadi.
9. Qolgan 500 xatolar tuzatiladi.

## Bosqich 2 — Moliya
1. Karta to'lovi karta bo'lib yoziladi.
2. Har bir chek uchun bitta kirim yoziladi.
3. Qarzni ortiqcha to'lab bo'lmaydi.
4. Moliya yozuvlari brauzerda emas, serverda saqlanadi.
5. Summalar to'g'ri o'qiladi (masalan "150 000,50").
6. Kun Toshkent vaqti bo'yicha hisoblanadi.
7. Yozuv o'chirilmaydi. Uning o'rniga storno (teskari yozuv) qilinadi va o'zgarish audit logga yoziladi.
8. Kunlik va smena hisobotlari, 80mm va 58mm chek chop etish ishlaydi.

## Bosqich 3 — Xodim kirishi (login va parol)
1. Oshpaz va hostess rollari qo'shiladi.
2. Admin panelda xodim akkaunti yaratiladi va bloklanadi.
3. Har xodim faqat o'z paneliga kiradi. "Chiqish" tugmasi ishlaydi.
4. Brauzerdagi "avtomatik admin" (URL, subdomen, `?staff_grant`) o'chiriladi va flag ortiga yashiriladi.

## Keyingi bosqichlar (alohida ruxsat bilan)
- **4. Infratuzilma:** VPS, doimiy domen, Postgres, Redis. Server tayyor bo'lganda boshlanadi.
- **5. Tezlik va qulaylik:** 3D modellar siqiladi (9 MB → ≤ 1.5 MB), qidiruv tuzatiladi, KDS, hostess va admin UX yaxshilanadi.
- **6. Sifat:** CI, avtomatik testlar, yuk testi.

## Qabul mezonlari
- Anonim foydalanuvchi xodim sahifalariga va pulga tegolmaydi. Bu avtomatik test bilan tekshiriladi.
- Restoran sahifalarida 500 xato chiqmaydi.
- Mehmon buyurtmasi KDS'da va chaqiruv ofitsiantda 5 soniya ichida ko'rinadi.
- Ekrandagi, chekdagi va kassadagi summa bir xil.
- Hech narsa o'chirilmagan, faqat flag ortiga yashirilgan.

## Ish tartibi
Har bosqich alohida ruxsat bilan bajariladi. Bosqich tugagach natija ko'rsatiladi va keyingisi uchun yana ruxsat so'raladi.
