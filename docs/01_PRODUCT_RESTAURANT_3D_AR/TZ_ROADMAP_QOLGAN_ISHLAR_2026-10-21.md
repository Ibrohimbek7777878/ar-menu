# TZ va ROADMAP — Restoran 3D/AR menyu: qolgan ishlar (pilotga chiqishgacha)

| Maydon | Qiymat |
|---|---|
| **Mahsulot** | #1 Restoran 3D/AR va NFC menyu |
| **Sana** | 2026-10-21 |
| **Asos** | branch `fix/restaurant-phase0-security`, oxirgi commit `231fbc6` |
| **Holat** | ✅ Egasi roadmap bo'yicha ishlashga ruxsat bergan (2026-10-21: "shu roadmap bo'yicha ketasan") |
| **Maqsad** | Bitta restoranda haqiqiy mijozlar bilan **pilot**, so'ng 1000+ foydalanuvchi va 6 yillik barqarorlik |
| **Oldingi hujjatlar** | `TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md` (76 band), `TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md`, `00_ARCHITECTURE_MASTER/TZ_AUDIT_KAMCHILIKLAR_2026-10-15.md` |

---

## 1. Hozirgi holat (rost)

### 1.1 Bajarilgan (8 ta commit, `3043be1` dan keyin)

| Commit | Nima |
|---|---|
| `b021260` | Audit TZ'lari |
| `82f99b1` | **Xavfsizlik (Bosqich 0):** hamma xodim sahifalari va API'lar serverda himoyalangan; to'lov imzosi kalitsiz rad etiladi; XSS; Telegram webhook secret; stol yopish faqat o'z restoranida |
| `3fcec35` | **Lokal 3D menyu:** `create_restaurant`, taom rasmidan avtomatik 3D (AI'siz), fon navbati, `start_local.sh` |
| `8b41054` | **Mehmon oqimi:** QR → menyu → savat → checkout → buyurtma haqiqiy; buyurtma raqami to'qnashmaydi |
| `d6f5093` | **Oshxona/ofitsiant:** KDS ≤ 5 soniyada yangilanadi, chaqiruv yetib boradi, POS yiqilmaydi |
| `a74976e` | **Moliya:** bitta buyurtma = bitta kirim (bazada cheklov), karta/naqd to'g'ri, Toshkent kuni |
| `b47cea5` | **Qo'lda moliya serverda:** ortiqcha to'lov rad etiladi, storno, audit |
| `231fbc6` | Do'konlararo bosqich nomlari oqishi tuzatildi |

**Tekshiruv:** 169 test, 166 o'tadi (3 ta eskirgan matn testi). Brauzerda boshidan oxirigacha sinalgan: mehmon → oshxona → ofitsiant → kassa. Dizayn (CSS) o'zgarmagan.

### 1.2 Tayyorlik bahosi

Mezon: bitta restoranda pilot. Bu o'lchov emas, mening bahoyim.

| Qism | Hozir | Og'irligi |
|---|---|---|
| Xavfsizlik | ~85% | 20% |
| Mehmon oqimi | ~90% | 15% |
| Oshxona va ofitsiant | ~85% | 15% |
| Moliya | ~65% | 15% |
| Xodim akkauntlari | ~40% | 10% |
| Server va ishga tushirish | ~10% | 15% |
| 3D va menyu boshqaruvi | ~60% | 5% |
| Zaxira nusxa, monitoring | 0% | 5% |
| **Jami** | **≈ 59%** | |

---

## 2. Ish qoidalari (qat'iy)

1. **Dizayn buzilmaydi.** Hozirgi CSS, joylashuv va matnlar o'zgarmaydi.
   - Faqat mantiq o'zgaradigan ishlar (🟢) to'g'ridan-to'g'ri bajariladi.
   - **Ekranga yangi element qo'shadigan ishlar (🎨)** oldin skrinshot-maket bilan ko'rsatiladi, egasi ma'qullagandan keyingina qo'shiladi. Mavjud CSS klass va ranglar ishlatiladi.
   - Har 🎨 ishdan oldin/keyin skrinshot solishtiriladi.
2. **Hech narsa o'chirilmaydi** (AGENTS.md 4-qoida): demo/eski oqimlar `DEMO_MODE` yoki boshqa flag ortiga yashiriladi. Sozlamalar `.env` yoki admin paneldan boshqariladi.
3. **Har ish testi bilan:** xavfsizlik va pul bandlari uchun "hujum muvaffaqiyatsiz" testi. Testlar internetga chiqmaydi.
4. **Har bosqich:** `manage.py check`, `makemigrations --check`, to'liq testlar, `tsc`, lint, brauzer e2e (kerak joyda) → alohida commit → qisqa hisobot.
5. **Egasining qarori kerak bo'lgan joylarda** (VPS, domen, kalitlar, git tarixini tozalash) kutiladi; qolganlari to'xtamasdan davom etadi.
6. Push va `main`ga birlashtirish faqat egasining aniq buyrug'i bilan.

Belgilar: 🟢 mantiq (dizayn o'zgarmaydi) · 🎨 UI maket va ruxsat kerak · 👤 egasining qarori/resursi kerak · **S** ≈ 1 sessiya · **M** ≈ 2–3 · **L** ≈ 4+.

---

## 3. Roadmap (ketma-ketlik)

```
R0 Poydevor ─► R1 Prod xavfsizlik ─► R3 Fon ishlar+Telegram ─► R4 Bron/hostess ─► R2 Xodimlar
      │                                                                                  │
      └──────────────► R5 Mehmon/oshxona (🟢 qismi) ─► R8 Tezlik/3D ─► R10 Sifat/CI ◄───┘
                                         │
                 ── 🎨 DIZAYN DARVOZASI: R5·R6·R7·R2 UI maketlari egasiga ko'rsatiladi ──
                                         │
                      R6 Hisobotlar 🎨 ─► R7 Admin 🎨 ─► R9 Server 👤 ─► R11 Repo ─► R12 Pilot
```

| Faza | Maqsad | Hajm | Bog'liq | UI | Tayyorlik (kumulyativ) |
|---|---|---|---|---|---|
| **R0** | Toza o'rnatish va yashil testlar | S | — | 🟢 | 60% |
| **R1** | Production xavfsizlik sozlamalari | M | R0 | 🟢 | 66% |
| **R3** | Ishonchli fon ishlari va Telegram | M | R0 | 🟢 | 70% |
| **R4** | Bron va hostess | M | R0 | 🟢 | 73% |
| **R2** | Xodim rollari (server) | S–M | R1 | 🟢 + 🎨 | 76% |
| **R5** | Mehmon va oshxona tajribasi | M | R3 | 🟢 + 🎨 | 80% |
| **R8** | Tezlik va 3D | M | R0 | 🟢 | 83% |
| **R6** | Moliya hisobotlari | M | R5 | 🎨 | 86% |
| **R7** | Admin panel haqiqiy ma'lumot | M | R2 | 🎨 | 88% |
| **R9** | Server va ishga tushirish | L | R1, R3 | 🟢 | 👤 | 94% |
| **R10** | CI, e2e, yuk testi | M | R9 | 🟢 | 96% |
| **R11** | Repo va hujjatlar tozalash | S | — | 🟢 | 97% |
| **R12** | Pilot (jonli ishga tushirish) | M | hammasi | — | 100% pilot |

R9 va R12 egasining resurslariga (VPS, domen, haqiqiy menyu) bog'liq. Shuning uchun R0–R8 shu resurslarsiz bajariladi.

---

## 4. Fazalar tarkibi

### R0 — Poydevor 🟢 (S)

**Maqsad:** toza kompyuterda o'rnatilsa ishlaydi va testlar yashil.

| ID | Ish | Joy | Qabul |
|---|---|---|---|
| R0-1 | `requirements.txt` to'ldiriladi: `numpy`, `trimesh`, `pygltflib`, `sentry-sdk`, `python-slugify`, `psutil`; `uvicorn` versiyasi qotiriladi. **Hozir yangi 3D generator (`ar3d/image_to_3d.py`) ham shularsiz ishlamaydi** | `backend/requirements.txt` | Toza venv'da `pip install -r` + `manage.py check` + 3D test o'tadi |
| R0-2 | 3 ta eskirgan test yangilanadi (sahifa matni o'zgargan). Har biri uchun "regressiyami yoki eskirganmi" aniqlanadi | `api/test_production_e2e.py`, `ar3d/tests.py` | Testlar 100% yashil |
| R0-3 | `.env.example` to'liq: barcha yangi sozlamalar (`DEMO_MODE`, `RESTAURANT_*`, `TELEGRAM_WEBHOOK_SECRET`...) | `backend/.env.example` | Har sozlama `settings.py` bilan mos |
| R0-4 | Test muhiti: testlar `.env` tokenlariga bog'liq bo'lmasin (test sozlamalari) | `backend/settings*`, `test_runner.py` | `.env`siz va internetsiz yuradi |
| R0-5 | `loop_engineering_test.py` real bazaga yozmaydi: Django test runner'ga ko'chiriladi yoki `archive/`ga o'tadi; bazadagi test ma'lumotlari (80 ta buyurtmadan 63 tasi) belgilanadi va arxivlanadi (o'chirilmaydi) | `backend/scripts/` | Skript real bazaga yozmaydi |

### R1 — Production xavfsizlik sozlamalari 🟢 (M)

**Maqsad:** `DEBUG=False` bilan ishga tushirilganda `check --deploy` toza va hech qanday sir kodda emas.

| ID | Ish | Joy | Qabul |
|---|---|---|---|
| R1-1 | `DEBUG` default `False`; `SECRET_KEY` faqat env'dan, yo'q bo'lsa production'da server ishga tushmaydi; kodda hardcoded kalit olib tashlanadi (git tarixidagi kalit "yoqilgan" hisoblanadi — yangisi generatsiya qilinadi) | `settings.py:21-23` | Kalitsiz `DEBUG=False` ishga tushmaydi |
| R1-2 | `ALLOWED_HOSTS` (wildcard `*` yo'q), `CSRF_TRUSTED_ORIGINS`, CORS aniq ro'yxat; hamma `.env` orqali | `settings.py`, `middleware.py` | `*` bilan production ishga tushmaydi |
| R1-3 | `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, HSTS, `SECURE_PROXY_SSL_HEADER` (`not DEBUG` bilan) | `settings.py` | `check --deploy` 0 ogohlantirish |
| R1-4 | Har so'rovda sessiyaga til yozilishi (`LanguageMiddleware`) olib tashlanadi: faqat o'zgarganda, cookie orqali; statik/media so'rovlari middleware'dan o'tkazib yuboriladi | `middleware.py:107` | Statik so'rov DB'ga yozmaydi (test: so'rovlar soni) |
| R1-5 | Rate limit: `X-Forwarded-For` faqat ishonchli proxy'dan; hisoblagich jarayonlar orasida umumiy (Redis yoki DB); login, buyurtma, chaqiruv, checkout uchun DRF throttle | `ratelimit.py:15` | Header almashtirish limitni aylanib o'tmaydi (test) |
| R1-6 | Yuklangan fayllar: kengaytma + MIME + magic-byte, hajm limiti (GLB ≤ 15 MB, rasm ≤ 5 MB), `DATA_UPLOAD_MAX_*`; hozir limit umuman yo'q | `ar3d/views.py`, `web/views.py`, `settings.py` | Katta/soxta fayl rad etiladi (test) |
| R1-7 | Sentry `send_default_pii=False`; to'lov provayderining xom javobi maskalanadi | `settings.py:358`, `payments/payment_service.py` | PII/karta ma'lumoti saqlanmaydi |
| R1-8 | `LOGGING` sozlanadi (aylanuvchi fayl, xatolar alohida); maxfiy qiymatlar logga yozilmaydi | `settings.py` | Loglar `logs/` da, hajmi cheklangan |
| R1-9 | Brauzerdagi "avtomatik xodim roli" (`/admin` ochilsa rol berish, `?staff_grant=`, subdomen roli) `DEMO_MODE` ortiga olinadi; "Chiqish" rolni tozalaydi. Server baribir hamma narsani tekshiradi | `RouteGuard.ts`, `RoleService.ts`, `SubdomainService.ts` | Production'da URL orqali rol berilmaydi (e2e) |
| R1-10 | **QR kod generatori:** QR'da doimiy stol tokeni (`/t/<uuid>/`) va admin sozlamasidagi ochiq domen (`RESTAURANT_PUBLIC_URL`); hozir `window.location.origin + ?table=NN` (admin subdomenidan chop etilsa admin domeni chiqadi, `?table=` ni almashtirib boshqa stolga buyurtma berish mumkin). Faqat mantiq, ko'rinish o'zgarmaydi | `QRGeneratorModal.tsx:47` | Chop etilgan QR har restartdan keyin ishlaydi; `?table=` raqami bilan kirish faqat `DEMO_MODE`da |
| R1-11 | Telegram Mini App `initData` HMAC tekshiruvi; checkout'da `telegram_id` POST maydonidan olinmaydi | `web/tma_views.py` | Soxta `initData` rad etiladi |
| R1-12 | Mehmon buyurtmasini kuzatish: `/tma/order/<pk>/` allaqachon sessiyaga bog'langan; qo'shimcha — imzolangan kuzatish havolasi (boshqa qurilmada ham ko'rish uchun) | `tma_views.py` | Boshqa mijozning buyurtmasi 404 |

**R1 holati (2026-10-21): R1-1…R1-11 bajarildi, R1-12 keyinga qoldirildi.** 237 ta test yashil (`.env` bilan ham, `.env`siz ham), `tsc` 0 xato, `oxlint` 9 ogohlantirish (o'zgarmagan), `manage.py check --deploy` production muhitida 0 muammo (2 tasi ongli ravishda o'chirilgan: `W005`, `W021`). CSS o'zgarmadi (`index.css` bundle'i bir xil). Brauzer e2e (haqiqiy brauzer, baza nusxasida, `DEMO_MODE=False`): QR → savat → buyurtma → ofitsiant chaqiruvi → ofitsiant paneli → KDS; mehmon `?staff_grant=admin` yoki `/menu/admin` orqali rol ololmaydi; ofitsiant admin panelga o'ta olmaydi; "Chiqish" serverdagi sessiyani tugatadi.

Qaror va ta'sirlar (egasi bilishi shart):
- Stolni oddiy raqam (`?table=5`, checkout'da qo'lda kiritish, stol ID) bilan tanlash endi **faqat `DEMO_MODE`** da. Production'da stol faqat QR'dagi tasodifiy token (`/t/<uuid>/`) bilan aniqlanadi. Mehmon QR skanerlamasdan buyurtma bermoqchi bo'lsa: "Stol aniqlanmadi, QR ni qayta skanerlang". Kerak bo'lsa `RESTAURANT_ALLOW_TABLE_NUMBER_URL=True` bilan qaytariladi (xavfsizroq emas).
- Mehmonning ofitsiant chaqiruvi stol raqami bilan emas, QR orqali sessiyaga yozilgan stolga ketadi.
- Xodim paneli roli faqat serverdan (`window.__GULISTON_SESSION__`). Parolsiz qurilma ruxsati (`?staff_grant=`, subdomen, "Xodimlar Ruxsati" tugmasi) faqat `DEMO_MODE` da — o'chirilmagan.
- Ofitsiant akkaunti hozircha oshxona (KDS) va hostess ekranlarini ham ochadi (R2 da alohida rollar bo'ladi).
- Bosma QR kodlar `RESTAURANT_PUBLIC_URL` domenida (bo'sh bo'lsa — xodim ochgan sayt domeni) va doimiy token bilan chiqadi. **Avval chop etilgan, eski `?t=<imzo>` yoki `?table=NN` QR'lar o'rniga yangilarini chop etish kerak.**

R1 davomida topilgan, hali tuzatilmagan kamchiliklar (yo'qolib ketmasligi uchun shu yerda; tegishli bosqichga biriktirildi):
| # | Topilma | Bosqich |
|---|---|---|
| F1 | `App.tsx`: `currentPath.includes('/ar')` tekshiruvi `/arrival/...` dan oldin turadi — hostess ekrani (`/arrival/desk/`) o'rniga AR menyu ochiladi | R4 |
| F2 | `MenuPage.tsx:220`: stol noma'lum bo'lsa mehmonga "Stol #5" ko'rsatiladi (`|| 5` zaxirasi) | R5 |
| F3 | Ofitsiant `/kds/` yoki `/menu/waiter` da admin sahifasining ramkasini ("Moliya & Kassa", "A Menejer Boshqaruvchi") ko'radi; ma'lumot serverda yopiq, lekin ko'rinish noto'g'ri | R2 |
| F4 | Xodim ekranlaridagi demo taomlar rasmlari (`/media/dish/shorva.jpg` …) 404 beradi — demo ma'lumotlar `DEMO_MODE` ortiga to'liq olinmagan | R5 / R8 |
| F5 | `seller/tables.html`, `tables_plan.html`, `table_stands_print.html` QR rasmini tashqi `api.qrserver.com` xizmatidan oladi: stol havolasi uchinchi tomonga ketadi va internet bo'lmasa QR chiqmaydi. Yechim — serverda QR yaratish (`segno`); PyPI hozir erishib bo'lmagani uchun o'rnatilmadi | R9 / R10 |
| F6 | `ar3d/views.py:1314` (3D bosma buyurtmasi, Studio mahsuloti) POST'dagi `telegram_chat_id` ga ishonadi — R1-11 bilan bir xil turdagi xavf, boshqa mahsulotda | R10 |
| F7 | `/admin/logout/` GET so'rov bilan chiqaradi (CSRF orqali majburiy chiqarish mumkin, xavfi past) | R2 |

### R2 — Xodim rollari (server) 🟢 + 🎨 (S–M)

Hozir backend `AdminUser.role`da faqat `waiter` bor; oshpaz va hostess rollari yo'q, ularning ishini ofitsiant akkaunti qoplaydi.

| ID | Ish | Qabul |
|---|---|---|
| R2-1 🟢 | `kitchen` va `hostess` rollari (migratsiya), `RESTAURANT_STAFF_ROLES` va ruxsat matritsasi (8-ilova: oshpaz — faqat KDS; hostess — faqat bron; ofitsiant — POS va chaqiruv; moliya — faqat rahbariyat) | Har rol uchun ruxsat testi: ruxsat etilmagan sahifa `302/403` |
| R2-2 🟢 | `create_staff` buyrug'i (login, parol, rol, restoran) va `block_staff`. Egasi hozircha shu orqali va `/djangoadmin/`dan foydalanadi | Buyruq bilan yaratilgan oshpaz KDS'ga kira oladi, moliyaga kira olmaydi |
| R2-3 🟢 | Login'dan keyin rolga mos sahifaga yo'naltirish (oshpaz → `/kds/`, hostess → `/arrival/desk/`) | Test |
| R2-4 🎨 | **"Xodimlar" boshqaruv sahifasi** (admin panelda): ro'yxat, yaratish, bloklash, parol almashtirish. Yangi sahifa → maket kerak | Maket ma'qullanadi, keyin qo'shiladi |
| R2-5 🟢 | Brute-force himoyasi barcha xodim loginlarida; muvaffaqiyatsiz urinishlar auditda | Test |

### R3 — Ishonchli fon ishlari va Telegram 🟢 (M)

| ID | Ish | Joy | Qabul |
|---|---|---|---|
| R3-1 | **Outbox:** hozir `bool(_send_message(...))` har doim `True` (u `dict` qaytaradi), xato yuborish ham "bajarildi" deb belgilanadi | `notifications/outbox.py:61` | Xato yuborish qayta uriniladi (backoff, max urinish), "failed" holati ko'rinadi |
| R3-2 | Mavjud bo'lmagan import va funksiyalar: `notify_new_order_to_seller`, `send_waiter_call_notification`, `couriers.tasks`, `ai.gemini_client`; yutilgan xatolar (`except: pass`, 61 ta) logga yoziladi | `outbox.py:64`, `domains/.../services.py:58`, `payments/payment_service.py:133` | `ruff F821/F401` toza; ishlamaydigan chaqiruv qolmaydi |
| R3-3 | Telegram matnlari `html.escape` qilinadi (ismda `&` yoki `<` bo'lsa Telegram rad etadi va oshxona hech narsa olmaydi) | `telegram_service.py` | `&<>` li ismli buyurtma ham yetib boradi (test) |
| R3-4 | Yuborish so'rov ichida bloklab turmaydi (hozir 10 s timeout × har chat): outbox ishchisi (`run_workers`) navbatdan yuboradi; Redis kerak emas (3D ishchisi kabi bazada) | `telegram_service.py:30`, yangi worker | Checkout vaqti Telegram tezligiga bog'liq emas |
| R3-5 | Ofitsiant chaqiruvi va "taom tayyor" Telegram'ga ham boradi (admin sozlamasi bilan yoqiladi) | `ServiceCallActionView`, KDS | Test (mock bot) |
| R3-6 | Havolalar `127.0.0.1:8000` emas, `RESTAURANT_PUBLIC_URL`dan; `update_id` takrorlanishi (dedupe); `/kassa` do'konga bog'langan; vaqtlar mahalliy | `telegram_service.py:66,171`, `admin_bot.py` | Test |
| R3-7 | Bitta `run_workers` buyrug'i (3D + outbox); `start_local.sh` shuni ishga tushiradi | | Bir buyruq — hamma ishchi |

### R4 — Bron va hostess 🟢 (M)

| ID | Ish | Qabul |
|---|---|---|
| R4-1 | Bron to'qnashuvi: bir stol va vaqt oralig'iga ikki bron mumkin emas (`select_for_update` + vaqt oralig'i tekshiruvi); noto'g'ri sana/vaqt jimgina "bugun 19:00" bo'lmaydi, aniq xato | Parallel bron testi |
| R4-2 | Bron holati faqat server tomonidan; yagona status ro'yxati (backend enum ↔ TS turi): `arrived`/`reserved`/`bill_requested` nomuvofiqligi tuzatiladi | Frontend va backend statuslari bir xil |
| R4-3 | Hostess "joylashtirish" (walk-in) stolni band qiladi, bron bekor/yakunlansa stol bo'shaydi; mahalliy ID server ID bilan to'qnashmaydi (boshqa mehmon broni PATCH bo'lmaydi) | E2E: walk-in → stol band |
| R4-4 | `ReservationPage`: har tashrifchiga mock "Muhayyo Karimova" ko'rsatilmaydi (`DEMO_MODE`); `form.submit()` PATCH'ni bekor qilmaydi (`await`); kod va telefon birga tekshiriladi | E2E |
| R4-5 | Bron sanasi o'tmishda bo'lmaydi; `arrival_confirm` `json.dumps(time)` 500 xatosi | Test |

### R5 — Mehmon va oshxona tajribasi 🟢 + 🎨 (M)

| ID | Ish | UI | Qabul |
|---|---|---|---|
| R5-1 | **Stop-list:** `Product.is_available` KDS/ofitsiant/admin'dan almashtiriladi; menyudan darhol yo'qoladi/"Tugagan" bo'ladi; tugagan taomga buyurtma berib bo'lmaydi (serverda ham) | 🟢 mantiq; "Tugagan" belgisi 🎨 (mavjud badge uslubida) | Test + maket |
| R5-2 | Qidiruv xatosi: `uzbekSearch.ts` regex escape qilinmagan, `go`/`og`/`.` hamma narsani topadi; kirill qo'llab-quvvatlanmaydi | 🟢 | `o'g'ri`/`ogri`/`огри` testlari |
| R5-3 | Stol tanlash: `WelcomePage` ixtiyoriy matn qabul qilmaydi, NFC "skaneri" soxta; stol faqat QR token orqali | 🟢 | E2E |
| R5-4 | Narxlar faqat serverdan (`mockDishes` 48 000 va POS 45 000 nomuvofiqligi yo'qoladi) | 🟢 | |
| R5-5 | KDS: kurs bo'yicha guruhlash, ommaviy "tayyor", 5 soniyalik bekor qilish (undo), taymer chegaralari admin sozlamasidan, taymer tayyor bo'lganda to'xtaydi, Wake Lock, bitta umumiy `AudioContext` | 🟢 mantiq (guruhlash, undo tugmasi 🎨) | Maket + test |
| R5-6 | Ofitsiant POS: miqdor, izoh, kurs (hozir faqat "+1"); chek telefon raqami hardcoded emas; chaqiruv vaqti, kechikkan chaqiruv eskalatsiyasi | 🎨 | Maket |
| R5-7 | "Menyu tez orada" va xato holatlari (ulanish yo'q, qayta urinish) hamma sahifada | 🟢 | |
| R5-8 | Mehmon menyusida 2 ta bir xil "Barchasi" chipi (`mockDishes` kategoriyasi) | 🟢 | |

### R6 — Moliya hisobotlari 🎨 (M)

Hozir moliya raqamlari barcha vaqt bo'yicha qo'shiladi, smena yopish va Z-hisobot yo'q, chop etish bo'sh sahifa beradi.

| ID | Ish | Qabul |
|---|---|---|
| R6-1 🎨 | Sana filtri ("Bugun / Hafta / Oy / Oraliq") — mavjud tab uslubida | Maket → test |
| R6-2 🎨 | Smena ochish/yopish va kunlik **Z-hisobot** (naqd, karta, chiqim, nasiya, kassadagi qoldiq); Telegram'ga yuborish do'konning o'z chatiga | Maket → test |
| R6-3 🎨 | Chop etish: har chop etish uchun alohida izolyatsiyalangan konteyner (hozir uch CSS `body *{visibility:hidden}` to'qnashib bo'sh sahifa beradi), `@page { size: 80mm auto }` va 58 mm varianti | Chop etish skrinshoti |
| R6-4 🟢 | Admin panelning "bugungi tushum" va moliya sahifasi bir xil raqam beradi (bitta server hisobi) | Test |
| R6-5 🎨 | Hisobni yopish: tasdiqlash oynasi, aralash to'lov (naqd + karta), chegirma (rol bo'yicha), "nasiyaga yopish" | Maket → test |
| R6-6 🟢 | Hisobot Telegram'i do'konga bog'lanadi (hozir bitta global chat); investitsiya (`capital`) foyda hisobiga kirmaydi | Test |
| R6-7 👤 | **Fiskal chek (OFD)** — O'zbekistonda qonuniy talab. Alohida TZ: provayder va kalitlar egasidan | Qaror |

### R7 — Admin panel haqiqiy ma'lumot 🎨 (M)

| ID | Ish | Qabul |
|---|---|---|
| R7-1 🎨 | **Menyu tabi** (hozir bo'sh joy): taom narxi, rasmi, kategoriyasi, mavjudligi, 3D holati ("Rasmdan 3D yaratish"), stop-list — mavjud seller formasi API orqali | Maket → E2E |
| R7-2 🟢 | "Bugun/Hafta/Oy" filtri, "Chekni ko'rish" tugmasi ishlaydi; `today_orders_count` bugungi buyurtmalarni sanaydi | Test |
| R7-3 🟢 | "Stollar & Bron" tabi mehmon sahifasi emas, haqiqiy stol xaritasi; mahsulot va AR taomlar soni serverdan | Test |
| R7-4 🟢 | Stol holatlari (`bill`, `reserved`) to'g'ri rangda, "Bo'sh" bo'lib ko'rinmaydi | Test |
| R7-5 🟢 | Sozlamalar sahifasida: xizmat haqi foizi, KDS taymer chegaralari, polling oralig'i, asosiy restoran, demo rejim — admin paneldan (AGENTS.md 4-qoida) | 🎨 yangi bo'lim bo'lsa maket |

### R8 — Tezlik va 3D 🟢 (M)

Dizayn o'zgarmaydi, faqat tezlik.

| ID | Ish | Qabul |
|---|---|---|
| R8-1 | Frontend `React.lazy`: mehmon xodim kodini (Finance, Admin, KDS, qrcode, Showcase) yuklamaydi. Hozir bitta 500 KB chunk, ~140 KB xodim kodi; Showcase production'da ochiq | Mehmonning boshlang'ich JS ≤ 90 KB gzip |
| R8-2 | Hash'li fayl nomlari va Vite manifest (hozir qo'lda `?v=NN` 17 ta shablonda) | Yangi build eski keshga tushmaydi |
| R8-3 | `model-viewer` npm paketi (versiya qotirilgan), lazy import — CDN'dan SRI'siz emas; 10 ta shablonda yo'qligi sababli 3D oyna bo'sh chiqishi tuzatiladi | 3D hamma sahifada ochiladi |
| R8-4 | Rasmlar WebP/AVIF + `srcset` + `loading="lazy"`; yuklashda avtomatik | Taom rasmi ≤ 80 KB |
| R8-5 | N+1 so'rovlar: `/ar/` 31, `/orders/` 26, `/seller/tables/` 27 so'rov; paginatsiya | Har sahifa ≤ 12 so'rov |
| R8-6 | Kutubxona GLB modellari (16 ta, 77 MB) `gltf-transform` bilan ≤ 1.5 MB (Node noutbukda bor); rasmdan yaratilgan modellar allaqachon ≤ 0.6 MB | Har model ≤ 1.5 MB |
| R8-7 | Media nginx/CDN orqali (Django `serve` emas) — R9 bilan | |
| R8-8 | 3D sifati: provayder interfeysi tayyor (`RESTAURANT_3D_PROVIDER`); keyinroq bulut AI yoki lokal TripoSR (kuchliroq GPU'da) ulanadi | 👤 AI xizmat va kalit |

### R9 — Server va ishga tushirish 🟢 + 👤 (L)

**Egasidan kerak:** VPS (tavsiya: 2 vCPU / 4 GB), doimiy domen. Ularsiz shu faza tayyor konfiguratsiya va skriptlar bilan to'xtaydi.

| ID | Ish | Qabul |
|---|---|---|
| R9-1 | PostgreSQL: `DATABASE_URL` o'qiladi (hozir o'qilmaydi), SQLite faqat dev; ma'lumotlarni ko'chirish skripti | Production'da `connection.vendor == 'postgresql'` |
| R9-2 | Bitta ishlaydigan `docker-compose` (web, db, 3D/outbox ishchi, nginx), `Dockerfile` non-root, `collectstatic` xatoda to'xtaydi (hozir `|| true`) | `docker compose up` ishlaydi |
| R9-3 | gunicorn: CPU soniga qarab worker, `--reload`siz; `systemd` birliklari (web + ishchilar), avtomatik qayta ishga tushish | Server qayta yoqilsa tizim o'zi turadi |
| R9-4 | nginx: TLS (Let's Encrypt yoki Cloudflare named tunnel), static/media, gzip, `Cache-Control: immutable` | QR domeni o'zgarmaydi |
| R9-5 | **Zaxira nusxa:** kunlik DB dump + media, 7/30 kunlik saqlash, **tiklash sinovi** | Tiklash skripti ishlaydi (hujjatlashtirilgan) |
| R9-6 | `/health/` va uptime monitoring, Sentry, Telegram alert (server yiqilsa egasiga xabar) | Alert sinaladi |
| R9-7 | Joylashtirish skripti va orqaga qaytarish (rollback) | Bitta buyruq bilan deploy/rollback |
| R9-8 | Production bazasi: test ma'lumotlari arxivlanadi (o'chirilmaydi), haqiqiy restoran `create_restaurant` bilan ochiladi | |
| R9-9 | Redis (kesh, rate limit, kelajakda SSE) — ixtiyoriy, yuk testi ko'rsatsa qo'shiladi | |

### R10 — Sifat, CI va yuk testi 🟢 (M)

| ID | Ish | Qabul |
|---|---|---|
| R10-1 | GitHub Actions: `ruff` (`F821/F401/E722`), `check --deploy`, `makemigrations --check`, testlar (internetsiz), `tsc`, `oxlint`, `vite build` | PR yashil bo'lmasa birlashmaydi |
| R10-2 | E2E smoke (Playwright): mehmon oqimi, KDS, ofitsiant+karta, moliya — bu sessiyadagi brauzer skriptlaridan | CI'da yuradi |
| R10-3 | Parallel testlar: buyurtma raqami, kirim, stol yopish, qarz to'lovi, bron | Race-condition testlari |
| R10-4 | **Ombor mantig'i:** zaxira `delivered`da kamayadi va har `cancelled`da qaytariladi (qoldiq asossiz ko'payadi), `reserve_stock` natijasi e'tiborsiz; yagona joyda `F()` + `select_for_update` | Parallel test: qoldiq manfiy bo'lmaydi |
| R10-5 | **Yagona buyurtma xizmati:** hozir 9 ta parallel yaratish yo'li; hammasi `OrderService.create()` orqali | `Order.objects.create` bitta joyda |
| R10-6 | **Soft delete:** umumiy `SoftDeleteModel` + manager; hozir 4/54 modelda; `product.delete()`, `DebtRecord.delete()`, sharh GET bilan o'chishi, `ModelViewSet` DELETE | Biznes modellarida `.delete()` yo'q |
| R10-7 | Pul maydonlari standarti (`Decimal(14,2)`, `CheckConstraint >= 0`), `Product.slug` do'kon ichida noyob (ikkinchi "Plov" 500 bermaydi) | Migratsiya + test |
| R10-8 | **Yuk testi** (k6/locust): 1000 virtual foydalanuvchi, 50 stol × 3 telefon × KDS; p95 < 500 ms, xato < 0.1%, 30 daqiqa | Hisobot |
| R10-9 | Restoran URL ro'yxati uchun doimiy smoke test (0 ta 500, xodim sahifalari anonimga yopiq); qolgan 500'lar (`customer_orders`, `seller_*` shablonlari, `categories/all.json`) tuzatiladi | CI'da |

### R11 — Repo va hujjatlar 🟢 + 👤 (S)

| ID | Ish | Qabul |
|---|---|---|
| R11-1 | `apps/prototypes` (~166K qator, faol tizimga bog'liq emas) `archive/prototypes-2026-10` tag/branch'iga; `main`da ko'rsatkich README | 👤 egasi ruxsati |
| R11-2 | Git'dan chiqariladi (diskdan o'chirilmaydi): `backend/bin/cloudflared` (40 MB), `android/.gradle`, `local.properties`, `dump.rdb`, root `static/air`, `backend/static/react` build (CI'da quriladi); `.gitignore` tuzatiladi | `.git` hajmi kamayadi |
| R11-3 | Git tarixini tozalash (`filter-repo`) — ixtiyoriy, barcha klonlarni qayta olishni talab qiladi | 👤 qaror |
| R11-4 | `README`, `REPOSITORY_STRUCTURE.md` haqiqatga moslanadi; takroriy hujjatlar (AGENTS.md 3 nusxada, 30 guruh) birlashtiriladi; "hozirgi holat va maqsad" jadvali | Hujjat va kod mos |
| R11-5 | Skriptlar: ishlamaydigan nusxalar (`scripts/server/*`) tuzatiladi yoki arxivlanadi | README'dagi buyruqlar ishlaydi |

### R12 — Pilot 👤 (M)

| ID | Ish |
|---|---|
| R12-1 | Haqiqiy menyu kiritiladi (nom, narx, rasm → 3D), stollar, zallar |
| R12-2 | Xodim akkauntlari, har biriga qisqa o'zbekcha yo'riqnoma (1 sahifa) |
| R12-3 | QR/NFC stendlar yakuniy domen bilan chop etiladi |
| R12-4 | "Quruq sinov" kuni: ichki jamoa bilan to'liq kun; buyurtma, KDS, kassa, hisobot solishtiriladi |
| R12-5 | Pilot: 1–2 hafta kuzatuv, kunlik hisobotlarni qo'lda hisob bilan solishtirish, tuzatishlar |
| R12-6 | Go/No-Go mezonlari: 7 kun 0 yo'qolgan buyurtma, kassa farqi 0, 0 ta server yiqilishi |

---

## 5. Roadmapdan tashqari (keyingi alohida TZ'lar)

Bu ishlar restoran pilotiga to'sqinlik qilmaydi va alohida qaror/resurs talab qiladi:

- **Onlayn to'lov (Click/Payme/Uzcard):** kod fail-closed tayyor; haqiqiy kalitlar va merchant shartnomasi kerak 👤. Pilotda naqd va terminal.
- **WebSocket/SSE** (hozir 5 soniyalik polling yetarli; Redis'dan keyin).
- **AR (stol ustida ko'rish):** HTTPS talab qiladi; R9'dan keyin.
- **Marketplace (#2), 3D Studio (#3), Flutter ilova:** alohida audit'lar umumiy TZ'da (`TZ_AUDIT_KAMCHILIKLAR_2026-10-15.md`).
- **Ruscha tarjima (i18n)** va qulaylik (a11y): 9–11 px shriftlar, zoom bloklanishi, `lang="uz"`.
- **Tarkibiy DDD/foydalanuvchi modeli birlashtirish** (`AdminUser`/`Customer`/`Courier`): uzoq muddat.

---

## 6. Egasidan kerak bo'ladigan qarorlar

| # | Qaror | Qachongacha | Standart (javob bo'lmasa) |
|---|---|---|---|
| Q1 | VPS va doimiy domen | R9 boshlanishidan oldin | R0–R8 ishlari davom etadi, R9 kutadi |
| Q2 | 🎨 maketlarni ma'qullash (R2-4, R5, R6, R7) | Dizayn darvozasi | Maket tayyorlanib ko'rsatiladi; ma'qullanmaguncha qo'shilmaydi |
| Q3 | Fiskal chek (OFD) hozir kerakmi | R6 | Keyinga qoldiriladi, model tayyorlanadi |
| Q4 | Git tarixini tozalashmi | R11 | Tozalanmaydi |
| Q5 | Prototiplarni arxiv branch'ga chiqarishmi | R11 | Chiqarilmaydi |
| Q6 | Bulut AI orqali 3D (Meshy/Tripo) — sifat yaxshiroq, pullik | R8-8 | Lokal "rasm-relyef" qoladi |
| Q7 | Haqiqiy menyu va 3–5 ta sinov taomi | R12 | Demo taomlar bilan |

---

## 7. Har faza uchun "tugadi" mezoni

1. Fazaning har bandi o'z **Qabul** shartini bajargan (avtomatik test yoki brauzer e2e bilan).
2. `manage.py check` toza, `makemigrations --check` toza, barcha testlar yashil (R0 dan keyin 0 ta yiqilgan).
3. `tsc` 0 xato, lint ogohlantirishlari oshmagan.
4. CSS o'zgarmagan (🎨 bandlar maket ma'qullangandan keyin istisno), oldin/keyin skrinshot solishtirilgan.
5. Hech narsa o'chirilmagan, yangi sozlamalar `.env.example`da.
6. Alohida commit va qisqa hisobot (nima qilindi, nima sinaldi, nima qoldi).

## 8. Ochiq xavflar (rost)

1. **3D sifati taxminiy.** "Rasm-relyef" taomning ustidan ko'rinishini aniq beradi, lekin haqiqiy 3D skaner emas. Haqiqiyroq natija pullik AI yoki kuchliroq GPU talab qiladi (Q6).
2. **Noutbukda 1000 foydalanuvchi sinab bo'lmaydi.** R10-8 yuk testi haqiqiy serverda o'tkaziladi; shundan keyingina 1000+ standarti haqida gapirish mumkin.
3. **`DEBUG=True`, `ALLOWED_HOSTS=*`** hozir `.env`da turibdi. R1 gacha lokal ishlatish uchun xavfsiz, internetga ochish uchun emas.
4. **Git tarixidagi eski `SECRET_KEY`** ochiq hisoblanadi; R1-1'da yangisiga almashtiriladi.
5. **Eski sessiyalar** R1-4 dan keyin ham ishlaydi, lekin R1-1 (kalit almashtirish) hamma foydalanuvchini tizimdan chiqaradi: ish vaqtida emas, tunda bajariladi.
6. Frontend'ning `NavigationContext.tsx` (1200+ qator) hali "god-object": R5–R7 ishlari uni yanada kattalashtirmasligi uchun yangi mantiq alohida modullarga yoziladi.
