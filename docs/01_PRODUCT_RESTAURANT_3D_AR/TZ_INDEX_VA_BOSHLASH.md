# TZ fayllari indeksi va Gemini uchun boshlash tartibi

Yangilangan: 2026-10-26 · Repo: `/home/ibrohim/Desktop/client_baza/online store_guliston` · Papka: `docs/01_PRODUCT_RESTAURANT_3D_AR/`

## Hozir amal qiladigan TZ'lar (shu tartibda o'qing)

| № | Fayl | Nima uchun |
|---|---|---|
| 1 | `TZ_ADMIN_AR_MENYU_VA_TELEGRAM_MINI_APP_2026-10-24.md` | P0 xatolar, Seller tozalash, Menyu modeli/API, AR/3D, **Telegram Mini App** |
| 2 | `TZ_ADMIN_ARXITEKTURA_ALOHIDA_ILOVALAR_2026-10-26.md` | Tezlashtirish (0-bosqich), **alohida resto-admin ilovasi**, har sahifa o'z URL va API'si, keyingi bosqichlar rejasi |
| 3 | `TZ_TUZATISH_VA_SODDALASHTIRISH_2026-10-29.md` | **Eng birinchi o'qiladigan.** 2026-10-29 tekshiruvida topilgan to'sib turuvchi xatolar (A1–A7), "sodda va qulay" panel talablari (B), soxta/bajarilmagan bandlar (C), xavfsizlik (D). **Holat: egasi tasdiqlaguncha kod yozilmaydi.** Quyidagi "Bajarish tartibi" shu TZ tasdiqlangach shu hujjatning 7.1 jadvali bilan almashadi |
| 4 | `TZ_MASSHTAB_VA_ISHONCHLILIK_2026-10-30.md` | **Masshtab va ishonchlilik.** 1000 bir vaqtdagi foydalanuvchi (D1) maqsadi, o'lchangan hozirgi holat (2026-10-30), topilmalar T1–T17 (T17 — kritik xavfsizlik: `/api/v1/products/` loginsiz yozishga ruxsat, tuzatish ruxsat kutmoqda), kesh xavfsizligi, raqamli qabul mezonlari Q1–Q9, egasi savollari K1–K10. Million foydalanuvchi (D3) maqsad emasligi asoslangan. **Holat: tasdiqlangan 2026-10-30; S0 va S1 bajarilgan (G0, G1), S2 egasining ruxsatini kutmoqda** |
| 5 | `ROADMAP_MASSHTAB_VA_ISHGA_TUSHIRISH_2026-10-30.md` | 4-hujjatning ketma-ketligi: S0–S7 (masshtab) va P1–P7 (mahsulot) vazifalari, qabul shartlari, taxminiy muddat. Eski `TZ_ROADMAP_QOLGAN_ISHLAR_2026-10-21.md` dagi R9-9 (Redis), R10-8 (yuk testi) shu yerda aniqlashtirilgan |

**Diqqat:** birinchi hujjatning 4-bosqichi (React «Menyu» tabi) **bekor**, u ikkinchi hujjatda qilinadi. Bu birinchi hujjat boshidagi izohda ham yozilgan.

Qo'shimcha kontekst (o'qish ixtiyoriy): `admin_tahlil_2026-10-23/index.html` (admin tahlili), `TZ_ROADMAP_QOLGAN_ISHLAR_2026-10-21.md` (umumiy roadmap), `mockups/welcome_maket.html` (ma'qullangan dizayn).

## Bajarish tartibi (Gemini uchun)

| № | Ish | Manba | Branch |
|---|---|---|---|
| 1 | P0 xatolar: sharhlar 500, bugungi tushum, CSV BOM | TZ-1, 1-bosqich (5.1, 5.2, 5.4) | `feature/admin-menu-telegram` |
| 2 | Seller tozalash (`panel_scope`, til, dashboard) | TZ-1, 2-bosqich (2.2, 2.3, 5.6) | shu |
| 3 | Tezlashtirish 0.1–0.5 | TZ-2, 4.0 | shu |
| 4 | Tezlashtirish 0.6–0.7 (pool ajratish, menyu keshi) | TZ-2, 4.0 | shu |
| 5 | `Shop.public_id` (tenant UUID) | TZ-2, 4.1 | shu |
| 6 | Menyu modeli va API (3.4–3.6, yo'li yangi) | TZ-1 3-bosqich + TZ-2 4.3 | shu |
| 7 | Resto-admin qobig'i va sessiya | TZ-2, 1.1–1.2 | shu |
| 8 | Resto-admin sahifalari (Menyu → 3D → Xodimlar → Buyurtmalar → Boshqaruv → Moliya → Stollar → Sozlamalar) | TZ-2, 4.6 | shu |
| 9 | Telegram (T1–T5) | TZ-1, 6-bo'lim | **`feature/telegram-miniapp`** (parallel, alohida) |

Har ish tugagach to'xtang va Claude'ga xabar bering: Claude tekshiradi, keyin keyingisiga ruxsat beriladi.

## Gemini repoga to'g'ridan-to'g'ri kira oladimi?

- Gemini CLI / IDE agenti **shu papkada** ishlasa, fayllarni yo'l bo'yicha o'zi o'qiydi.
- Veb-chat bo'lsa, u fayllarni o'qiy olmaydi: ikkala TZ matnini va kerakli kod fayllarini chatga yuklang.

## Gemini'ga birinchi xabar (nusxa ko'chiring)

> Loyiha: `/home/ibrohim/Desktop/client_baza/online store_guliston` (Django + React). Avval `docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_INDEX_VA_BOSHLASH.md` ni, so'ng u ko'rsatgan ikkala TZ'ni to'liq o'qi. Branch: `feature/admin-menu-telegram` (joriy `fix/restaurant-phase0-security` dan och). **1-ishdan boshla.** TZ'dagi qoidalarni (1-bo'limlar) bajar: o'zbek tili, hech narsani o'chirma (yashir), `.env` ga tegma, push qilma, yangi paketni pin bilan va sababini yoz. Har ish uchun test yoz va TZ'dagi tekshirish buyruqlarini o'zing yurgiz, natijani yoz. TZ'da yo'q narsani o'zingdan qo'shma; noaniq bo'lsa savol ber. Birinchi ish tugagach to'xta va nima o'zgarganini (fayllar, testlar, natijalar) qisqa yoz.
