# TZ — Loyihani sotuvga tayyor holatga keltirish (QORALAMA, tasdiq kutilmoqda)

Sana: 2026-11-02 · Branch: `feature/guest-api-bot` (yangi ish uchun `feature/sale-ready` tavsiya qilinadi)
Holat: **TASDIQLANMAGAN.** AGENTS.md 1-qoida: egasi ruxsat bermaguncha kod yozilmaydi.
Asos: 6 ta mustaqil o'qish-rejimidagi audit (`audit_2026-11-02/A…F_*.md`, jami ~1300 qator, dalillari bilan). Hujjatda exploit tafsilotlari bor: ichki hujjat, repo ommaviy qilinishidan oldin `audit_2026-11-02/` ni olib tashlash yoki yopiq saqlash kerak.

---

## 1. Qisqa va ochiq xulosa

**Loyiha hozir sotuvga tayyor emas.** Bu "hali bezak yetishmaydi" degani emas, sabablari jiddiy:

1. **Xavfsizlik teshigi tizimli.** Restoran mahsulotining o'z API qatlami (`/api/restaurant/admin/v1/*`, `/api/v1/restaurant/*`, `/checkout/`) yaxshi himoyalangan: do'konlararo izolyatsiya va rol matritsasi sinovdan o'tdi. Lekin restoran urlconf'iga (`backend/backend/urls_restaurant.py`) bozor va studiya davridan qolgan eski API'lar ham ulangan (`api/v1/accounts|shops|products|orders|notifications`, `ar3d.urls`), ular butun himoyani aylanib o'tadi. Natija: **ro'yxatdan o'tgan begona odam (tasdiqlanmagan, do'konsiz) boshqa restoranning buyurtma holatini o'zgartira oladi, mijozlar telefonlarini o'qiy oladi, kassaga yozuv qo'sha oladi; anonim odam narxni o'zgartira va taomni o'chira oladi.** Buni 3 ta auditor mustaqil takrorladi, men ham o'zim takrorladim (token olindi → boshqa restoran buyurtmalari ro'yxati → holat `delivered` ga o'zgardi).
2. **Buyurtma yaratish yo'li ishonchli emas.** Anonim buyurtma yaratadigan 4 ta yo'l bor, ularning faqat bittasini (`POST /checkout/`) React ilova ishlatadi, u esa tranzaksiyasiz, idempotentlik kalitisiz, qator/miqdor limitisiz.
3. **Sozlamalar va'da qiladi, lekin ishlamaydi.** "Restoran yopiq", ish vaqti, xizmat haqi, auto-accept: saqlanadi, lekin e'tiborga olinmaydi. Mehmonning buyurtmalar sahifasidagi 5 ta tugma ("Ofitsiantni chaqirish", "Hisobni so'rash", "Choy", "Non", "Salfetka") serverga hech narsa yubormaydi: faqat "yuborildi" xabarini ko'rsatadi (men kodda tasdiqladim).
4. **Operatsiya xavfsiz emas.** Zaxira nusxa shu serverning o'zida, shifrsiz, media va `.env` siz. Monitoring ham shu serverda. Server yo'qolsa hamma narsa birga yo'qoladi.
5. **Egasi o'zi yurita olmaydi.** Logo, 3D model, Telegram ulash, restoran ochish: dasturchi kerak. Maxfiylik siyosati, shartlar, qo'llanma, tarif/to'xtatish mexanizmi yo'q.
6. **Haqiqiy serverda hech qachon ishlamagan.** VPS, domen, TLS, haqiqiy Telegram bot, 1000 foydalanuvchi: tekshirilmagan. Kod faqat shu noutbukda, GitHub'ga yuborilmagan (origin/main'dan 87 commit oldinda).

**Nega 881 ta yashil test buni ushlamadi:** testlar restoranning o'z yo'llarini qoplaydi, eski ulangan yo'llarni emas. `test_soft_delete.py` DRF `destroy` ni emas, kod matnida `.delete()` so'zini qidiradi. Parallellik testlari SQLite'da `skip` bo'ladi. Ya'ni "yashil" bu sifat kafolati emas.

**O'z xatolarim (oldingi hisobotlarimda):**
- "Loyiha tayyor emas" deb to'g'ri aytgandim, lekin T17 ni alohida xato deb ko'rsatgandim; u aslida shu tizimli muammoning bitta ko'rinishi.
- "Caddy mehmon buyurtmasini xodim havzasiga yo'naltiradi" deb yozgandim; haqiqiy mehmon yo'li `/checkout/`, `/api/v1/restaurant/orders/create/` emas. Bu band qayta tekshiriladi (D-13 aksini, ya'ni xodim amallari mehmon havzasiga tushishini aytadi).
- Avvalgi A1–A3/B1–B3 ishimda mehmon API'si "yozuv yo'llari o'zgarmadi" deb qoldirildi, shuning uchun bu teshiklarga tegmadi (bu ish doirasida emas edi).

---

## 2. Aniqlangan muammolar (takrorlardan tozalangan; manba ID'lar audit fayllarida)

Belgilar: ✔ = auditor vaqtinchalik SQLite bazada kod ishga tushirib takrorladi · ✔✔ = men ham o'zim takrorladim · ○ = faqat kod o'qildi. PostgreSQL parallelligi va haqiqiy server xatti-harakati tekshirilmagan (6-bo'lim).

### 2.1 Kritik
| # | Muammo | Manba | Holat |
|---|---|---|---|
| K1 | Ochiq `register` tasdiqlanmagan hisobga ishlaydigan JWT beradi; JWT xodim API'larini ochadi. Rol `shop_manager`, parol "123456" o'tdi | S-01, E-01, B-01 | ✔✔ |
| K2 | Eski `OrderViewSet` (`/api/v1/orders/`): begona do'kon buyurtma holatini holat mashinasiz o'zgartirish, barcha do'konlar `pending` + mijoz telefonlari, mijoz narxi bilan buyurtma | S-03, E-02, B-01 | ✔✔ |
| K3 | `/api/v1/products/` anonim PATCH (narx) va DELETE (T17) | F-01, S, E | ✔ |
| K4 | Do'konsiz xodimda `shop or get_or_default_shop()` asosiy restoranga o'tadi: kassaga yozuv, bron telefonlari, taom yaratish (`ar_model=javascript:`) | S-04, E-03, E-04 | ✔ |
| K5 | `CustomerViewSet`: hamma do'kon mijozlari ism/telefon/manzil/xarajati; DELETE ochiq (hard delete) | S-02, E-05 | ✔ |
| K6 | Eski `ar3d`: `POST /v1/orders/` anonim, `csrf_exempt`, tezlik limiti yo'q (260/260 o'tdi), stol QR'siz, do'konlararo; `GET /v1/orders/<id>/` begona buyurtmani ochadi; `call-waiter` noto'g'ri id da `Table.first()` ni o'zgartiradi; `3d-print/.../ready/` autentifikatsiyasiz; `ai/chat` cheksiz | B-02, S-05, S-06, S-08, S-09, S-11, S-17, E-10 | ✔ |
| K7 | Zaxira: shu xostda, shifrsiz, media va `.env` yo'q, restore media'ni tiklamaydi, hech qachon toza serverda sinalmagan | D-01 | ○ |
| K8 | Mehmonning 5 ta xizmat tugmasi soxta (faqat toast); KDS "Yangilash" soxta, oflayn belgisi yo'q, boshlang'ich holat demo ma'lumot | C-01, C-02, C-03 | ✔✔ (C-01, KDS refresh), ○ |

### 2.2 Yuqori (buyurtma yo'li, pul, ishonchlilik)
- **Buyurtma `/checkout/`:** tranzaksiya yo'q (0 taomli buyurtma + Telegram ketadi) B-05 ✔; parallel 2 POST = 2 buyurtma B-04 ✔; qator/miqdor limiti yo'q (3000 qator = 6015 SQL, 4.6 s; savatda 3000 dona) S-07, B-10 ✔; boshqa do'kon taomi savatga o'tadi B-03 ✔; maydon uzunligi tekshirilmaydi B-14 ✔; mijoz oyna yopilsa "yuborilmadi", aslida buyurtma bor C-10 ○.
- **Sozlamalar ishlamaydi:** `is_open`, ish vaqti, `min_order`, xizmat haqi, `auto_accept_orders` F-03, E-07, C-06 ✔.
- **Holat mashinasi:** qulf yo'q, eskirgan nusxa to'lov holatini bosadi, ikki marta "Berildi" stokni ikki marta kamaytiradi B-06 ✔; bekor qilish to'lov/kassaga tegmaydi (to'langan bekor qilinganda kirim qoladi) B-07, E-08 ✔; yetkazilgan buyurtmaga taom qo'shiladi, KDS ko'rmaydi B-08 ✔.
- **Narx:** kanallar turlicha hisoblaydi (aksiya narxi faqat `/checkout/`, xizmat haqi faqat DRF) B-17 ✔; dine-in da yetkazish haqi 6000 qo'shiladi.
- **Hisobot:** "bugun" UTC yarim tunidan (Toshkentda 00:00–05:00 noto'g'ri) E-12, B-18 ✔; daromadning 2 ta ta'rifi, storno qilingan kirim dashboardda qoladi E-09 ✔.
- **Do'konlararo:** `Category` va `Customer` global (do'kon maydoni yo'q) E, F-13 ✔; boshqa QR'dan keyin ba'zi sahifalar standart restoran nomini ko'rsatadi F-05 ✔.
- **4-qoida (o'chirmaslik) buzilishi:** `ShopViewSet`, `CustomerViewSet`, `AdminUserViewSet`, `CategoryViewSet`, `Banner`, `Promotion`, `AppSetting` da hard DELETE; bo'sh do'kon o'chirilsa moliya/stol/bron CASCADE bilan yo'qoladi E ✔.
- **Operatsiya:** prod keshi `FileBasedCache` `MAX_ENTRIES=300`: 450 noyob so'rov login-lock hisoblagichini va menyu versiyasini o'chiradi D-04, S-10 ✔; Docker loglar cheksiz, 7 jarayon bitta log faylida (19 xato tajribada) D-05 ✔; rollback `web-staff` ni qaytarmaydi D-06 ○; `APP_TAG` siz `up -d` `latest` ni quradi D-07 ○; Caddy'da `request_buffers`, body limit, timeout yo'q D-11 ○; monitoring shu serverda, `curl -k` bilan, disk/`failed` outbox alert yo'q D-03 ○; CI hech qachon ishlamagan D-17.
- **Mehmon tajribasi:** `fetch` da timeout/AbortController yo'q C-10; buyurtma holati sahifasida polling yo'q ("Kutilmoqda" abadiy) C-11 ✔; ErrorBoundary yo'q, eski tab'da lazy chunk 404 oq ekran C-07 ✔; Telegram skripti `<head>` da `defer`siz C-08 ✔; to'lov tanlovi saqlanmaydi, "Karta" jimgina rad etiladi C-12; GLB 16.2 MB, siqilmagan, USDZ yo'q (iOS AR) C-09 ✔.
- **Sotuv tayyorligi:** `/ra/` rasm yuklash 3D yaratmaydi F-04 ✔; brend/logo/tavsif/soat mehmonga yetmaydi F-06 ✔; "Guliston", +998 (90) 123-45-67, "Sobir Tog'a", "Registon", `marketing_orign_bot` qattiq yozilgan F-12, C-17 ✔; maxfiylik/shartlar/rozilik/LICENSE yo'q F-07, F-26 ✔; billing/to'xtatish yo'q F-08 ✔; `create_restaurant` standart "Guliston" qiymatlari (mijoz #2 mijoz #1 ning bosh sahifasini almashtiradi) F-10 ✔; Telegram webhook va bot ulash hujjatda yo'q F-11; qo'llanma/FAQ yo'q F-14.

O'rta va past topilmalar (≈60 ta) audit fayllarida ID bilan; ularning ko'pi 3–6-bosqichga kiradi.

---

## 3. Maqsad va "sotuvga tayyor" ta'rifi

Sotuvga tayyor = quyidagilarning hammasi bajarilgan va **real serverda sinalgan**:

1. Begona (anonim, tasdiqlanmagan, boshqa restoran xodimi) hech narsani o'qiy/yoza olmaydi. Buni avtomatik marshrut-ruxsat testi kafolatlaydi.
2. Mehmon buyurtmasi: yo'qolmaydi, takrorlanmaydi, narxi serverdan, yopiq restoranga o'tmaydi, xatoda mehmon to'g'ri xabar ko'radi.
3. Pul: bitta daromad ta'rifi, bekor qilish storno bilan, hisobot Toshkent kuni bo'yicha.
4. Server yo'qolsa 1 ish kunida boshqa serverda DB + media + sirlar bilan tiklanadi (sinab ko'rilgan), nosozlik egasiga/bizga o'zi xabar beradi.
5. Dasturchi bo'lmagan egasi o'zi: menyu, rasm, 3D, xodim, stol/QR, ish vaqti, brend, Telegram ulashni boshqaradi; o'zbekcha qo'llanma bor.
6. Huquqiy minimum: maxfiylik siyosati, shartlar, rozilik, saqlash muddati, LICENSE (yurist ko'rib chiqadi).
7. 1 ta pilot restoranda 1–2 hafta real ishlagan.

AGENTS 3-qoida (1000 bir vaqtdagi mehmon) hozirgacha faqat noutbukda o'lchangan (≈25 req/s, p95 <100 ms, 0 xato). Real VPS'da isbotlanmaguncha "isbotlangan" deb aytilmaydi.

---

## 4. Ish rejasi (ketma-ketlik; har bosqichdan keyin to'liq test + sizga hisobot)

Hajm: S ≤ yarim kun, M ≈ 1–2 kun, L ≥ 3 kun (baho, o'lchanmagan). Kalendar va'dasi bermayman.

### Bosqich P0 — Teshiklarni yopish (xavfsizlik bloklari). Hajm: M
1. **Eski API'larni restoran mahsulotida yashirish** (`LEGACY_API_ENABLED`, standart **o'chiq → 404**; kod o'chirilmaydi, 4-qoida): `api/v1/accounts|categories|shops|orders|notifications`, `ar3d.urls` (`/v1/orders*`, `/v1/guest/*`, `/v1/ai/chat/`, `/3d-print/*`). Oldin: frontend, TMA, eski AIR paket, bot va `loadtest/` aslida qaysi yo'llarni chaqirishini `grep` bilan chiqarib, **ishlatilayotganlar ro'yxatini sizga ko'rsataman** (masalan `/api/v1/products/` GET React'ning zaxira yo'li, uni faqat o'qishga o'tkazaman, yozish yopiladi).
2. `staff_shop() is None` → 403; `shop or get_or_default_shop()` ni xodim yo'llarida olib tashlash.
3. Tasdiqlanmagan hisob uchun JWT va `is_restaurant_staff` rad etsin; ochiq `register` flag ortida (standart o'chiq); parol validatori.
4. Prod keshi: Redis (compose'ga) yoki hech bo'lmasa katta `MAX_ENTRIES`; login-lock va menyu versiyasi shunga ko'chadi.
5. `/health/` ochiq qismini minimumga (faqat `ready/live`), tafsilot yopiq.
6. **Marshrut-ruxsat testi:** restoran urlconf'idagi har yo'l uchun kutilgan ruxsat jadvali; yangi yo'l ruxsatsiz qo'shilsa test qizil. DRF standart `AllowAny` ni `IsAuthenticated` ga o'zgartirish baholanadi (mehmon endpoint'lari aniq `AllowAny`).
7. Regress testlar: K1–K6 uchun "begona → 401/403/404".
**Qabul mezoni:** auditorlarning PoC skriptlari (`A_sec/poc*.py`) qayta ishga tushirilganda hammasi rad etiladi; mehmon sayti va `/ra/` o'zgarishsiz ishlaydi (e2e 12/12).

### Bosqich P1 — Buyurtma yo'lini ishonchli qilish. Hajm: L
1. Mehmon uchun bitta yo'l `/checkout/`; qolganlari flag ortida.
2. `/checkout/` ni `transaction.atomic` ga, savatni atomik egallash, `submission_id` (UNIQUE) idempotentligi; to'lov/Telegram `on_commit`.
3. Kirish validatsiyasi: qatorlar ≤ 50, miqdor ≤ 100 (savatga qo'shishda ham), maydon uzunliklari → 400, `product.shop == table.shop`, telefon formati.
4. Restoran **yopiq / ish vaqtidan tashqari / min_order** → buyurtma rad etiladi, mehmon sahifasida "Hozir yopiq" ekrani. (Xizmat haqi va auto_accept: egasining qaroriga ko'ra panelda **yashiriladi**, 5-bo'lim.)
5. Kutilmagan server xatosi → 503/500 (400 emas); mehmon UI: 15–20 s timeout, doimiy xato xabari, "buyurtmam bormi?" tekshiruvi.
6. Yagona narx funksiyasi (aksiya, yaxlitlash, yetkazish haqi faqat yetkazishda).
7. Holat mashinasi: `select_for_update` + `update_fields`; bekor qilish → storno/`refunded`; bekor qilinganga to'lov rad; `add_item` faqat faol buyurtmaga.
8. Telegram: har kanalda 1 xabar, `notes` (allergiya) kartochkada; umumiy `Customer` chatiga oqish yo'qoladi.
9. KDS: 200/24 soat chegarasi o'rniga sahifalash, haqiqiy sinxronlash, oflayn banner, demo boshlang'ich ma'lumotsiz.
10. Mehmon: 5 soxta tugma → `createServiceCall`; buyurtma holati sahifasi A3 API bilan polling (10–15 s).
11. Suiiste'molga qarshi: stol/sessiya bo'yicha buyurtma limiti (sozlanadigan), stol bog'lanishiga TTL.
12. To'lov tanlovi: hozir faqat "Naqd/stolda to'lash" haqiqiy; Click/Payme/karta tugmalari flag bilan yashiriladi.
**Qabul mezoni:** B auditorning 14 ta yetishmayotgan testi yoziladi va o'tadi; PostgreSQL'da parallel test (2 bir vaqtdagi POST = 1 buyurtma) CI'da yashil.

### Bosqich P2 — Pul va ma'lumot yaxlitligi. Hajm: M
1. Barcha "bugun" hisoblari `Asia/Tashkent` kuni bo'yicha (UTC xatosi mehmon sahifalarida ham).
2. Daromadning bitta ta'rifi (dashboard = bot = moliya = orders-admin); storno qilingan kirim hisobga olinmaydi.
3. Hard DELETE → arxiv/bekor qilish (soft); `test_soft_delete.py` `destroy` ni ham tekshiradigan qilinadi.
4. `Category`, `Customer` ga do'kon maydoni (migratsiya mavjud ma'lumotni buzmaydi); `ShopViewSet` read-only maydonlar.
5. Moliya: kanban chek tahriri va `delete_tx` storno bilan (3 ta moliya UI mantiqi birlashtiriladi: baholanadi, kerak bo'lsa keyingi bosqichga).

### Bosqich P3 — Deploy va ishonchlilik. Hajm: M
1. Tashqi shifrlangan zaxira (`age`/`restic` + tashqi xotira): DB + media + `.env` saqlash tartibi; `umask 077`; `restore.sh --with-media`; **toza VPS'da to'liq tiklash sinovi**; "zaxira >26 soat" alert'i.
2. Tashqi monitoring (uptime), `curl -k` olib tashlanadi, `failed` outbox va disk >85% alert'i.
3. Docker log aylanishi, fayl handler'ni olib tashlash, `mem_limit`, 3D uchun alohida worker, `stop_grace_period`.
4. Rollback `web-staff` ni ham qaytaradi, `APP_TAG` `.state/current` dan, deploydan keyin smoke, Caddy `request_buffers`/body limit/timeout/`lb_try_duration`; mehmon va xodim yo'llari aniq ajratiladi va marshrut testi yoziladi.
5. CI: feature-branch/`workflow_dispatch` trigger, PostgreSQL job, `pip-audit`/`npm audit`.
6. `clearsessions`, `send_daily_digest` jadvalga; menyu kesh versiyasi `on_commit` da.
7. Runbook (o'zbekcha): deploy, rollback, tiklash, sir almashtirish, restoran/xodim ochish, bot ulash (`set_telegram_webhook`), disk tozalash; eski `backend/DEPLOY.md` ga "eskirgan" ogohlantirishi; `.env.example` to'liq.

### Bosqich P4 — Egasi o'zi yurita olishi (mahsulot). Hajm: L
1. Brend to'liq mehmonga yetadi: logo, rang, tavsif, manzil, telefon, soat, Instagram. Qattiq "Guliston", demo telefon, "Sobir Tog'a", "Registon", `marketing_orign_bot` sozlamaga o'tadi.
2. `/ra/` da 3D: GLB yuklash maydoni, rasm yuklaganda 3D navbatga tushadi.
3. `/ra/` da Telegram ulash ko'rsatmasi; chat ulanmagan restoran buyurtmalari vendor chatiga ketmaydi.
4. Egasi parolini almashtirishi; `/ra/` 401 → to'g'ri login URL; menyu sahifalash (31+ taom); taom saqlash xatosi ko'rsatiladi.
5. `create_restaurant` da majburiy argumentlar (Guliston standartlari olib tashlanadi).
6. Bosma QR kartochka (PDF).
7. O'zbekcha qo'llanma (ega, ofitsiant, oshpaz), onboarding chek-ro'yxat, FAQ.
8. Huquqiy: maxfiylik siyosati, shartlar, telefon uchun rozilik, saqlash muddati va o'chirish yo'li, LICENSE, GLB manbalari. **Qoralamani men yozaman, yakuniy ko'rib chiqishni yurist qilishi shart** (men yurist emasman).
9. Tarif/to'xtatish: `service_status` bayrog'i + to'lanmagan mijozni to'xtatish (billing integratsiyasi emas).
10. ErrorBoundary, o'zbekcha 404, `<noscript>`, Telegram skripti `defer`.
11. Hujjatdagi yolg'on da'volar tuzatiladi (`docs/01.../README.md` "100% sotuvga tayyor" yozuvi hozirgi holatga mos emas; root README "25/25 test" eskirgan).

### Bosqich P5 — 3D va tezlik/sifat. Hajm: M–L
GLB siqish (meshopt/KTX2, ≤500 KB maqsad), USDZ (iOS), yuklanish progressi; kirish (a11y): label/htmlFor, tap target ≥44 px, `viewport-fit`; `/ra/` telefon tab-bar; real qurilmada FPS/LCP o'lchovi (hozirgacha o'lchanmagan).

### Bosqich P6 — Egasiga bog'liq (men bajara olmayman)
VPS va domen, TLS, haqiqiy Telegram bot, haqiqiy menyu va taom rasmlari (hozir 28 dan 6 tasi haqiqiy), CDN/zaxira akkaunti, OFD qarori, **pilot restoran** va real serverda 1000 foydalanuvchi sinovi.

**Tavsiya etilgan tartib:** P0 → P1 → P2 → P3, so'ng P4, P5 va P6 parallel. P0–P3 tugamaguncha hech kimga ko'rsatmaslik/sotmaslik tavsiya qilinadi.

---

## 5. Sizdan kerak bo'lgan qarorlar (tavsiya birinchi)

1. **Joylashtirish modeli:** (a) har mijozga alohida server/stek *(tavsiya: infratuzilma shunga yozilgan, birinchi 3–5 mijoz uchun xavfsizroq)*, (b) bitta umumiy SaaS (tenant izolyatsiyasi hali yarim: `Category`/`Customer` global, "standart do'kon" qaytishlari ko'p).
2. **Eski bozor/studiya/ar3d API'lari:** restoran mahsulotida flag bilan yopaymi *(tavsiya)*? Ular boshqa joyda ishlatilayotgan bo'lsa (3D-print studiya, eski AIR menyu) aytsangiz, ularni istisno qilamiz.
   **JAVOB (egasi, 2026-11-02): ha.** Ishlatilishi kod bo'yicha tekshirildi: mehmon React ilovasi, `/ra/`, `/ra/` buyurtmalar API'si va bot eski `accounts|shops|orders|notifications|v1/guest` yo'llarini chaqirmaydi (0 ta). Faqat ikkita **o'qish** (GET) chaqiruvi bor: `MenuPage.tsx:126` `GET /api/v1/products/?is_available=true` (zaxira yo'li) va `MenuPage.tsx:139`, `ARMenuPage.tsx:96` `GET /api/v1/categories/`. Shuning uchun `products` va `categories` faqat o'qishga o'tkaziladi (yozish yopiladi), qolgan eski yo'llar flag ortida 404 beradi. `ai_chat.html` (`/api/v1/ai/chat/`) `base.html` orqali eski sahifalarda bor; mehmon ilovasida yo'q.
3. **Ochiq ro'yxatdan o'tish (`register`)** kerakmi? *(tavsiya: o'chirish.)*
4. **Buyurtma turlari:** faqat zal (stol) bo'lsin, olib ketish va yetkazish flag bilan o'chiq turadimi *(tavsiya)*, yoki ular kerakmi?
5. **To'lov:** hozircha faqat "Naqd/stolda to'lash" *(tavsiya)*. Click/Payme/karta yashirinadi.
6. **Xizmat haqi** *(sizning avvalgi qaroringiz: yo'q)* — panelda sozlamani yashiraymi *(tavsiya)*?
7. **Ish tartibi:** yangi branch `feature/sale-ready` da, har bosqich alohida commit; **GitHub'ga yuborishga** (yopiq repo, qaysi remote) ruxsat berasizmi? Hozir kod faqat noutbukda.
8. **Huquqiy hujjatlar:** qoralamani men yozaymi, yurist kim ko'radi?
9. **Billing/to'xtatish** (P4-9): bayroq yetarlimi yoki to'lov integratsiyasi ham kerakmi?

## 6. Tekshirilmagan narsalar (oshirib ko'rsatmayman)

- PostgreSQL: qator qulflari, parallel buyurtma/holat poygalari, `varchar` uzunlik xatolari (auditorlar faqat SQLite'da sinadi).
- Haqiqiy Caddy/gunicorn/TLS, haqiqiy Telegram, Click/Payme, Let's Encrypt, reboot, 1000 parallel foydalanuvchi.
- Brauzer renderi, real qurilmada FPS, iOS Quick Look / Android Scene Viewer, Telegram ichki brauzeri.
- Paket zaifliklari (`pip-audit`/`npm audit`: tarmoq taqiqlangan edi).
- `ai/`, `maps/`, `couriers/`, `domains/` ichki mantig'i, ulanmagan `api/` moduli (0 test).
- Qo'shimcha: auditorlardan biri (deploy) Caddy testini ishga tushirib vaqtincha konteyner ko'targan (o'zi tozalagan, men `docker ps -a` bilan tekshirdim: qoldiq yo'q).

## 7. Tahlilni 11 rol nuqtai nazaridan (AGENTS 2-qoida) — bir qatorlik hukm

Mijoz: yopiq payt ham buyurtma, xatoda oq ekran · Tadbirkor: brend, 3D, bot ulashni o'zi qila olmaydi · CEO: bitta noutbuk, serversiz, bus factor 1 · PM: onboarding va qo'llanma yo'q · Kiberxavfsizlik: eski API orqali anonim yozuv/o'qish · Senior muhandis: 881 test, lekin noto'g'ri joyni qoplaydi, tenant modeli yarim · Data: hisobotlar UTC/ikki ta'rif · Frontend: soxta tugmalar, timeout/ErrorBoundary yo'q · Backend: tranzaksiya/idempotentlik/qulf yo'q · UI/UX: brend sozlamasi mehmonga yetmaydi, tap target 34 px · 3D: 16.2 MB siqilmagan GLB, USDZ yo'q.

---

## 8. Egasi javoblari (2026-11-02) va TZ ga o'zgarishlar (v2 qo'shimcha, hali TASDIQLANMAGAN)

| # | Qaror | TZ ga ta'siri |
|---|---|---|
| 1 | Eski API'lar yopilsin: **ha** | P0-1 qat'iy. `products`/`categories` faqat GET qoladi |
| 2 | Mehmon registersiz ishlaydi. **Egasi va xodimlar uchun register bo'lsin, alohida subdomenda.** Platforma egasi (siz) uchun alohida panel: xato loglar, hamma matnni tahrirlash | `register` o'chirilmaydi: xavfsiz qilinadi (tasdiq, limit, subdomen). Yangi: N1, N2, N3 |
| 3 | "ha" (A tavsiyasi, alohida server?) | **2-qaror bilan ziddiyat**, aniqlashtirilmoqda (9-bo'lim) |
| 4 | Zal / olib ketish / yetkazish **bo'lsin** + ofitsiantga bildirishnoma, yaxshiroq yechim | Olib ketish va yetkazish xavfsiz qilinadi (P1). Yangi: N4 |
| 5 | Naqd; Click/Payme/Paynet **QR kodi va karta raqami ko'rsatiladi**, tizim ichida onlayn to'lov yo'q; to'lov usullari kategoriyasi (naqd, karta...) | Yangi: N5. Click/Payme integratsiya kodi flag ortida qoladi |
| 6 | Xizmat haqi emas, **oylik va kunlik ish haqi** bo'lsin | Xizmat haqi paneldan yashiriladi. Yangi: N6 |
| 7 | To'g'irlab GitHub'ga yuborilsin | P0 dan keyin `feature/sale-ready` ni yuboraman (remote tasdiqlanadi). `main` ga tegilmaydi |
| 8 | Ma'lumot saqlanadi, lekin qonunga mos va **bizga noqulaylik tug'dirmasin, foydamizga ishlasin** | P4-8: platforma "ma'lumotni qayta ishlovchi", restoran "operator" bo'lgan tuzilma; yurist ko'rib chiqadi |
| 9 | Billing alohida bo'lim | Yangi: N7 |
| 10 | Onlayn buyurtma va bronda xodim + egaga xabar; bron muddatini admin belgilaydi yoki mijoz bilan telefonda kelishadi | Yangi: N8 |
| 11 | Narx 450 000 so'mdan, ko'pi bilan 750 000 so'mgacha; standart 450 000 | N7 da tarif rejalari (DB da, kodda emas) |

### Yangi modullar (hozirgi kodda yo'q ekani tekshirilgan)
- **N1 Platforma egasi paneli** (`super_admin`): restoranlar ro'yxati, tasdiqlash/to'xtatish, billing (N7), xato loglar (N3), matnlar (N2), tizim sozlamalari. Hozir `super_admin` roli bor, lekin `/ra/` unga mo'ljallanmagan; eski `/admin/login/` faqat super_admin sahifasi. Alohida subdomenda (`owner.<domen>`), `/ra/` ning UI kutubxonasi (`admins/shared`) qayta ishlatiladi.
- **N2 Matn muharriri:** kalit → matn (til bo'yicha, restoran bo'yicha qayta yozish mumkin). Hozir admin matnlari `admins/resto/src/i18n/uz.ts` faylida (DB da emas), mehmon ilovasi va bot matnlarining ko'pi kodga qattiq yozilgan. "Har bir harf" maqsadi: mehmon ko'radigan hamma matn (ilova, bot, huquqiy sahifalar), so'ng admin paneli; yangi qattiq yozilgan matnni CI to'xtatadi. Real hajm hali sanalmagan (P4 boshida o'lchanadi).
- **N3 Xato loglar:** hozir faqat `orders.AuditLog` va ixtiyoriy Sentry bor; ilova ichida xatolar ko'rinadigan joy yo'q. Yangi `ErrorEvent`: 5xx, ERROR darajali loglar, frontend xatolari (ErrorBoundary → cheklangan endpoint), Telegram/outbox xatolari; guruhlash (fingerprint), soni, oxirgi vaqt, holat (yangi/ko'rildi/hal); telefon va parollar saqlanmaydi; 30 kun saqlanadi.
- **N4 Ofitsiantga bildirishnoma v2:** hozir buyurtma xabari bitta Telegram chatga (`business_profile.telegram_chat_id`) boradi, sahifalar 5 s da so'raydi, kimdir "mening buyurtmam" demaydi, e'tibor berilmasa takrorlanmaydi. Taklif: smena (kim ishda) + stol/zal → ofitsiant biriktirish; avval biriktirilgan ofitsiantga shaxsiy Telegram (tugma "Qabul qildim") + panelda ovozli/vibratsiyali ogohlantirish (+ Web Push, iOS'da faqat ilova sifatida o'rnatilganda); 60 s javob bo'lmasa — smenadagi hamma; 3 daq — menejer va egaga; egaga kunlik/ogohlantirish xulosasi; "qabul qilish vaqti" o'lchanadi. Sozlamalar `/ra/` da.
- **N5 To'lov usullari:** do'kon sozlamasida usullar ro'yxati (naqd, karta, Click, Payme, Paynet, boshqa: yoqilgan/o'chiq, nomi, karta raqami va egasi, QR rasm, izoh). Mehmon hisobda yoqilganlarini, QR/karta raqamini ko'radi; to'lovni tizim tasdiqlamaydi. Ofitsiant "to'landi" belgilab haqiqiy usulni tanlaydi → `Order.payment_method` (yangi maydon), moliya kirimi usul bo'yicha. QR rasm yuklash tekshiriladi (turi, hajmi). Fiskal chek (OFD) hamon hal etilmagan: yurist/soliq bilan.
- **N6 Ish haqi:** xodimga oylik yoki kunlik stavka; to'lovlar (oylik, avans, kunlik); oy hisoboti; to'lov moliyada "Xodimlar ish haqi" xarajati bo'lib yoziladi (kategoriya mavjud, ish haqi modeli yo'q). Ish kunlarini yuritish usuli savol (9-bo'lim).
- **N7 Billing:** tarif rejalari DB da (nom, narx, limitlar), restoran holati `trial/active/suspended`, `paid_until`, qo'lda to'lov qayd (sana, usul, izoh), tarix, muddatdan oldin Telegram eslatma, imtiyozli muddatdan keyin to'xtatish. To'xtatilganda mehmon "xizmat vaqtincha to'xtatilgan" ko'radi. Avtomatik to'lov yo'q.
- **N8 Bron v2:** `TableReservation` da bron muddati maydoni yo'q (faqat sana/vaqt). Qo'shiladi: mehmon so'ragan davomiylik, admin belgilagan ushlab turish muddati, holatlar (kutilmoqda → tasdiqlandi/rad/telefonda kelishilmoqda), xodim va egaga darhol xabar, "qo'ng'iroq qilish" tugmasi (`tel:`), mehmonga holat xabari.

### Yangilangan tartib (taklif)
P0 teshiklarni yopish (register xavfsiz qoladi) → P1 buyurtma yo'li (olib ketish/yetkazish xavfsizligi bilan) → P2 tenant izolyatsiyasi + pul → P3 deploy/zaxira/subdomen-TLS → **P4 platforma: N1 + N3 + N7 + register subdomeni** → **P5 N4 + N8** → **P6 N5 + N6** → P7 N2 matn muharriri va qolgan mahsulot tayyorligi → P8 3D/tezlik → P9 sizga bog'liq (domen, VPS, pilot).
Tavsiya: birinchi pilotni P0–P4 dan keyin boshlash; P5–P7 ni real foydalanuvchi fikri bilan aniqlashtirish.

## 9. Ochiq aniqlashtirishlar (javob kutilmoqda; tavsiya birinchi)

- **A. Model:** 2-qaror (egasi o'zi ro'yxatdan o'tadi, siz hammasini bitta panelda ko'rasiz) bitta umumiy platformani (`<restoran>.<domen>`) bildiradi; 3-qarorga "ha" esa har mijozga alohida serverni (A) nazarda tutgan bo'lishi mumkin. Tavsiya: **bitta umumiy platforma**; buning sharti P2 (tenant izolyatsiyasi) majburiy bo'ladi, bir xato barcha restoranga ta'sir qilishi mumkin.
- **B. Register:** ega o'zi ro'yxatdan o'tadi, "kutilmoqda" holatida turadi, siz tasdiqlaysiz *(tavsiya, spamga qarshi)*; xodim ega bergan taklif havolasi orqali qo'shiladi va ega tasdiqlaydi; telefon tasdig'i Telegram bot orqali.
- **C. Subdomenlar:** `register.<domen>`, `panel.<domen>` (ega/xodim `/ra/`), `owner.<domen>` (siz), `<restoran>.<domen>` (mehmon). Domen hali yo'q: ishlab chiqishda Host sarlavhasi bilan sinaladi. Wildcard TLS uchun DNS-provayder API kerak.
- **D. Matn tahriri:** kim tahrirlaydi: faqat siz yoki restoran egasi ham o'z restoranida? *(tavsiya: ikkalasi; siz — standart, ega — o'zi uchun qayta yozadi).*
- **E. Ish haqi:** kunlik ish kunlari qanday yuritiladi (ega/menejer "keldi" belgilaydi *(tavsiya)* / xodim smenada o'zi bosadi / faqat stavka va to'lov yozuvi); jarima/mukofot kerakmi; maoshni kim ko'radi.
- **F. Tarif:** 450 000 oyligimi; bir martalik ulash puli bormi; 450 000 va 750 000 orasidagi farq nima (limitlar: stollar, xodimlar, funksiyalar); sinov muddati (tavsiya 14 kun).
- **G. Yetkazish hajmi:** manzil + haq + minimal summa sozlamasi, kuryerni xodim qo'lda tayinlaydi, jonli kuzatuvsiz *(tavsiya)*.
- **H. Bron:** "limit" = mehmon so'ragan davomiylikmi? Kechikish muddati (mehmon kelmasa necha daqiqada bekor) *(tavsiya 15 daqiqa, sozlanadi)*.
- **I. GitHub:** remote `menu`, branch `feature/sale-ready`, P0 dan keyin, `main` ga tegilmaydi, repo yopiq.
- **J. Stolga bog'lanish:** 4 soat va stolga 10 ta ochiq buyurtma limiti (sozlanadi).
