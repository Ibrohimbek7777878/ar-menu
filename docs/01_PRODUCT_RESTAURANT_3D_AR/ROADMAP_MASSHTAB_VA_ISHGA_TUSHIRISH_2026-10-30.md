# ROADMAP: Masshtab, ishonchlilik va ishga tushirish (D1 darajasiga chiqish)

**Yangilangan:** 2026-10-30 · **Holat: TASDIQLANDI, S0 bajarilmoqda** (egasi 2026-10-30 "boshla" dedi; S1 dan oldin G0 hisoboti va ruxsat)
**Asos:** `TZ_MASSHTAB_VA_ISHONCHLILIK_2026-10-30.md` (maqsad, o'lchov, qabul mezonlari Q1–Q9, savollar). Bu fayl faqat **ketma-ketlik va vazifalar**.
**Belgilar:** 👤 egasi qarori/ishi kerak · 🎨 maket ma'qullanishi kerak · S/M/L/XL = ≈ ≤0.5 / 1–2 / 3–5 / >5 ish kuni (taxmin, ±50%) · "Kim" ustunida **C** = Claude (kod va tekshiruv), **E** = egasi.

---

## 1. Ikki yo'l va tartib

```
TZ tasdiq 👤
   │
   ├─ MASHTAB YO'LI (S)
   │    S0 o'lchash ─► S1 arzon tezlatmalar ─► S2 haqiqiy server 👤(VPS) ─► S3 holatsiz sahifa + CDN 👤
   │         ─► S4 yozuv yo'li va xodim yuki ─► S6 Redis ─► S5 ishonchlilik ─► [D1 isboti: Q1–Q9] ─► S7 D2 tayyorlik (talab qilsa)
   │
   └─ MAHSULOT YO'LI (P), masshtab ishlariga tegmaydi
        P2 qoldiq xatolar (darhol) · P4 GitHub CI (darhol)
        P1 sodda telefon UI 🎨 ─► P3 bitta dizayn tili 🎨 ─► P5 haqiqiy qurilmalar ─► P7 pilot 👤
```

Tartib izohi: raqamlash TZ bilan bir xil, **bajarilish tartibi** S6 (Redis) ni S5 dan oldin qo'yadi, chunki S5 dagi xaos mashqi (Redis o'chsa nima bo'ladi) Redis tayyor bo'lgandan keyin ma'noli.
Har faza oxirida **to'xtab hisobot** beriladi va keyingisiga ruxsat so'raladi. Faza orasida "men o'zim davom etaman" yo'q.

---

## 2. Masshtab yo'li (S)

### S0. O'lchash poydevori (M) · VPS kerak emas

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S0-1 | `loadtest/` papkasi: haqiqiy xulqli stsenariylar (A: mehmon yo'li o'ylash vaqti bilan; C: portlash; yozuv: buyurtma; xodim: 5 s polling). Vosita: k6 (Docker rasmi) yoki shu sessiyada yozilgan Node generator | Bitta buyruq bilan yuradi; natija JSON + qisqa `load_reports/YYYY-MM-DD_*.md` | C · ✅ bajarildi: `loadtest/` (14 o'z testi yashil) |
| S0-2 | `seed_load` buyrug'i: hajmli sinov bazasi (masalan 5 restoran, 150 taom/restoran, 1M buyurtma qatori) | Idempotent, faqat `DEBUG`/aniq ruxsat bilan, tarmoqsiz, haqiqiy bazaga yozmaydi | C |
| S0-3 | Profil: `/menu/` va 304 yo'lida vaqt qayerga ketishini o'lchash (`cProfile`, `loadtest/profile_django.py`) | Top xarajat jadvali (hisobotda) | C · ✅ bajarildi: bo'g'z = keshdagi model nusxalari (pickle); middleware **emas** (TZ 2.3) |
| S0-4 | So'rov vaqti jurnali (`gunicorn %(D)s`, `X-Request-Id`), kesh sarlavhalari (`X-Cache`) | Jurnaldan p50/p95/p99 hisoblanadi | C · ✅ bajarildi: gunicorn jurnali `%(D)s` + Caddy `X-Request-Id`, `loadtest/parse_access_log.mjs` |
| S0-5 | Bazaviy o'lchov: PG (Docker) + Caddy bilan **noutbukda** qayta o'lchash (SQLite emas) | Hisobot; 2.2-jadval yangilanadi | C |

**G0 (darvoza):** bazaviy hisobot hujjatlashtirilgan; profil natijalari S1 ni belgilaydi (S1 ro'yxati o'zgarishi mumkin).

### S1. Arzon ilova tezlatmalari (M) · oldin/keyin o'lchov majburiy · hammasi bayroq ortida

> **G0 dan keyin qayta yozildi (profil dalili).** Birinchi variantdagi "middleware yengillashtirish" bandi **olib tashlandi**: profil har middleware'ning o'z vaqtini ≈ 0.007 ms deb ko'rsatdi. Haqiqiy bo'g'z: keshdagi model nusxalari (S1-1).

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S1-1 | **Keshga oddiy ma'lumot** (dict/JSON), Django model nusxasi emas: `_build_tma_menu` (`web/tma_views.py`) va `RestaurantOrderService` menyu keshi. Klassik dizayn yo'li o'chirilmaydi: shablon uchun kerakli maydonlar oddiy ko'rinishda keshlanadi. Bayroq bilan | `/menu/` in-process ≥ 2× tez (12 → ≤ 6 ms); HTML **ikkala dizayn (`new` va `classic`) uchun oldin/keyin bir xil** (farq 0); menyu o'zgarsa `menu_version` bilan yangilanadi (mavjud test + yangi) | C |
| S1-2 | `AppSetting` o'qishini keshlash (jarayon ichida qisqa TTL + admin o'zgartirganda darhol bekor qilish) va faol restoran (`shops`) qidiruvini keshlash. Bayroq `APPSETTING_CACHE` | `/menu/` SQL 4 → ≤ 1; sozlama o'zgargach ko'rinadi (≤ 5 s, adminda darhol); test | C |
| S1-3 | ETag/304 yo'lini **DB'siz** qilish (do'kon va `menu_version` ni jarayon ichida ushlash) | 304 in-process 2.1 → < 0.5 ms; ETag mantig'i o'zgarmaydi (mavjud ETag testlari yashil) | C |
| S1-4 | `/menu/`, `/`: ETag + shartli GET, **`Cache-Control: private, max-age=0, must-revalidate`** (hali umumiy kesh emas: S3 dan oldin) | Qayta tashrifda 304; boshqa mehmonga sizish yo'q (test) | C |
| S1-5 | `/health/` yengillashtirish: `live` (DB'siz) va `ready` (1 SQL); eski `/health/` moslik uchun qoladi, compose/Caddy healthcheck'lari yangilanadi | ≤ 1 SQL; deploy sinovi yashil | C |
| S1-6 | `ProductListSerializer`: `select_related('shop')` (zaxira yo'l, ikkinchi darajali) | 20 elementda 22 → ≤ 4 SQL (`test_query_budget` uslubi) | C |

**G1:** oldin/keyin hisobot; barcha testlar yashil (SQLite **va** PG), e2e 12/12, mehmon sahifalari piksel-piksel bir xil.

### S2. Haqiqiy server bazasi (M) · 👤 VPS va domen

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S2-1 | VPS tayyorlash va `deploy/README.md` bo'yicha **birinchi marta haqiqiy serverda** joylash (haqiqiy TLS/Let's Encrypt) | `https://domen/health/` 200; server qayta yoqilsa tizim o'zi turadi (sinov) | E (VPS) + C |
| S2-2 | S0 testlarini **haqiqiy stekda** (staging, tunda yoki bo'sh paytda) | Hisobot: Q1–Q4 bo'yicha qaysi mezon o'tdi/o'tmadi (rost) | C |
| S2-3 | Sozlash, har o'zgarish o'lchov bilan: `WEB_CONCURRENCY`/oqimlar, `web` va `web-staff` nisbati, PG (`shared_buffers`, `work_mem`, `max_connections`), Caddy→gunicorn keepalive (uzilgan ulanishlar 0.3% sababi) | Uzilgan ulanish ≈ 0; xodim yo'li mehmon yukida sekinlashmaydi | C |
| S2-4 | Kanal hisobi: GLB/rasm hajmi × 1000 mehmon; VPS kanal va trafik kvotasi | Jadval: portlashda chiquvchi trafik; kvota yetishi yoki CDN zarurligi | C |

**G2:** "D1 bazasi, CDN'siz" hisoboti. **Bu yerda birinchi marta rost javob chiqadi: 1000 foydalanuvchi qanchalik uzoq.**

### S3. Holatsiz mehmon sahifasi va CDN (L) · 👤 CDN qarori · **eng xavfli faza (keshdan sizish)**

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S3-1 | Tadqiqot: `/menu/` va `/` javobini nima o'zgartiradi (til, dizayn, bayroqlar, stol tokeni, `window.__GULISTON_SESSION__`). Hujjat | Har o'zgaruvchan element "kalitga kiradi" yoki "brauzerda olinadi" deb belgilangan | C |
| S3-2 | **Oldin** testlar (qizil): ikki restoran/til keshi aralashmaydi; stol-A javobida stol-B yo'q; `Set-Cookie` bor javob keshlanmaydi; narx o'zgargach eskisi `menu_version` bilan yo'qoladi | Testlar yozilgan va hozirgi kodda mantiqiy | C |
| S3-3 | Narx serverda bazadan hisoblanishini **isbotlash** (TZ 5.5); isbotlanmasa tuzatish | Test: mijoz past narx yuborsa ham buyurtma to'g'ri summada | C |
| S3-4 | Umumiy shell: `public, s-maxage=30, stale-while-revalidate=60` faqat bayroq `GUEST_EDGE_CACHE=on` bilan; kesh kaliti (restoran, til, dizayn, `menu_version`); stol konteksti brauzerda | S3-2 testlari yashil; oldin/keyin skrinshot bir xil | C |
| S3-5 | CDN ulash (Cloudflare): faqat keshlanadigan yo'llar; xodim/to'lov/API yo'llari **bypass**; haqiqiy IP sarlavhasi Django va tezlik cheklovida; origin faqat CDN IP'lariga ochiq; `menu_version` o'zgarganda purge (API token egasidan, muhit o'zgaruvchisi; bo'lmasa `s-maxage` ga tayanadi) | Sinov: keshlangan yo'l 2-so'rovda `HIT`; xodim yo'li hech qachon `HIT` emas | E (hisob) + C |
| S3-6 | Media: `/media/` versiyali nom + `immutable`, CDN'dan; `Range`/ETag | Taom rasmi/GLB qayta so'ralmaydi; kanal yuki VPS'dan tushdi (o'lchanadi) | C |
| S3-7 | Portlash testi (C) CDN bilan va CDN'siz; orqaga qaytish mashqi (bayroqni o'chirish + CDN "pauza") | Q2 o'tdi; orqaga qaytish ≤ 5 min | C |

**G3:** Q1 va Q2 holati; kesh sizish testlari yashil; vizual o'zgarish yo'q.

### S4. Yozuv yo'li va xodim yuki (L)

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S4-1 | Buyurtma yaratish **idempotent** (mijoz kalitli qayta yuborish xavfsiz) **va xato kodlari to'g'ri**: kutilmagan/vaqtinchalik xato (DB qulf, deadlock, uzilish) `400` emas, `503` + `Retry-After` va Sentry'ga tushadi; `400` faqat haqiqiy mijoz xatosida (TZ T14) | 20 parallel bir xil so'rov → 1 buyurtma, 1 kassa yozuvi, zaxira 1 marta kamayadi; DB xatosi simulyatsiyasida 503 (400 emas) va guest ilovasi qayta urinadi | C |
| S4-2 | PG'da `EXPLAIN (ANALYZE)` hajmli bazada (S0-2): KDS ro'yxati, stollar, moliya summary; kerakli indekslar (migratsiya, orqaga mos) | Har issiq so'rov < 50 ms 1M qatorda; migratsiya orqaga qaytariladi | C |
| S4-3 | Sahifalash: Seller moliya (909 KB), buyurtmalar tarixi. "Hammasi" rejimi yashirin bayroq bilan qoladi (o'chirilmaydi) | Sahifa ≤ 100 KB; eski rejim sozlama bilan | C |
| S4-4 | Xodim polling: ETag/304 (versiya bo'yicha), yashirin tabda to'xtash, xatoda backoff, interval sozlamadan (`staff_poll_ms`, standart 5000) | Bo'sh o'zgarishda 304; platforma yuki ≥3× kamayadi (o'lchanadi) | C |
| S4-5 | Yozuv (Q3) va xodim (Q4) yuk testlari PG stekda | Q3, Q4 holati hisobotda | C |

**G4:** Q3, Q4; 0 yo'qolgan/takroriy buyurtma isbotlangan.

### S6. Redis va umumiy holat (M) · 👤 qaror K4

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S6-1 | Redis compose'da (parol, ichki tarmoq, `maxmemory`+eviction), `REDIS_URL`. **Fail-open**: Redis xatosi so'rovni yiqitmaydi (o'ram yoki `IGNORE_EXCEPTIONS`; yechim S6 da tanlanadi, yangi paket bo'lsa versiyasi qotiriladi va sababi yoziladi) | Redis to'xtatilsa mehmon va xodim yo'llari ishlaydi (xaos testi) | C |
| S6-2 | `menu_version`, `AppSetting` keshi, tezlik cheklovi Redis'da (konteynerlar umumiy) | `web` va `web-staff` o'rtasida kesh nomuvofiqligi yo'q (test) | C |
| S6-3 | Sessiya: `cached_db` | Xodim so'rovlarida sessiya SQL'i ≈ 0 (o'lchanadi) | C |

**G6:** Redis o'chirilganda tizim ishlaydi; kesh hit-rate o'lchandi.

### S5. Ishonchlilik (M–L) · 👤 zaxira joyi (K5)

| ID | Ish | Qabul | Kim |
|---|---|---|---|
| S5-1 | Tashqi zaxira (S3-mos obyekt saqlash), shifrlangan, 30 kunlik saqlash | **Alohida serverda tiklash ≤ 60 min** (Q6), yozib qo'yilgan | E (hisob) + C |
| S5-2 | Tashqi uptime monitoring + Telegram ogohlantirish; Sentry yoqish (DSN egasidan), shaxsiy ma'lumot tekshiruvi | Ataylab o'chirilgan serverda ogohlantirish keladi | E + C |
| S5-3 | Deploy uzilishini qisqartirish: hozir `docker compose up -d` konteynerni qayta yaratadi (bir necha soniya uzilish). Yangisini sog'lom bo'lgach almashtirish (2 `web` replika yoki shunga teng) baholanadi; migratsiyalar **expand/contract** (oldingi versiya bilan mos), `deploy.sh` da tekshiruv | Deployda uzilish o'lchangan va hujjatlangan (maqsad: 0 xato yoki ≤ 5 s) | C |
| S5-4 | Xaos mashqi (Q5): ishchi o'ldirish, DB 10 s uzish, Redis o'chirish, disk to'lishi | Xatolar vaqtinchalik; buyurtma yo'qolmaydi; hisobotda | C |
| S5-5 | `deploy/RUNBOOK.md`: nima yiqilsa nima qilinadi, qaytarish, qo'ng'iroq tartibi | Egasi yoki yangi odam hujjat bo'yicha tiklay oladi (quruq mashq) | C |
| S5-6 | 30 kunlik uptime kuzatuvi boshlanadi (Q7) | Tashqi hisobot | E + C |

**G5:** Q5, Q6; Q7 kuzatuvi boshlandi.

### D1 isboti (S0–S5 dan keyin)

Q1–Q9 (TZ 7-bo'lim) haqiqiy stekda qayta yuritiladi, yagona yakuniy hisobot yoziladi: **o'tgan, o'tmagan, cheklov**. Soak (Q9) 4 soat, Q7 esa 30 kunlik kuzatuv davomida to'planadi. Faqat shundan keyin "D1 isbotlandi" deyiladi.

### S7. D2 tayyorligi (L) · faqat egasi buyursa yoki metrikalar talab qilsa

| ID | Ish | Qabul |
|---|---|---|
| S7-1 | Holatsiz veb isboti: 2 `web` replika bilan sinov (sessiya, kesh, media umumiy) | Replikalar orasida xulq bir xil |
| S7-2 | Media obyekt saqlashga o'tish imkoniyati (bayroq; yangi paket bo'lsa pin va sabab) | Bayroq bilan yoqiladi/o'chiriladi, ma'lumot yo'qolmaydi |
| S7-3 | PgBouncer (transaction pooling, `DB_CONN_MAX_AGE=0` kodda tayyor) | 3+ tugunda ulanishlar tugamaydi (test) |
| S7-4 | GLB siqish tajribasi (Draco/Meshopt) va PG replika/boshqariladigan DB baholash | Hujjat: foyda/xavf, qaror egasida |
| S7-5 | D2 simulyatsiyasi (CDN keshli 10k) va **yoqish ro'yxati (checklist)** | Checklist tayyor; yoqish alohida ruxsat bilan |

---

## 3. Mahsulot yo'li (P): mavjud TZ'lardan, masshtab ishlari bilan parallel

| ID | Ish | Manba | Shart | Kim |
|---|---|---|---|---|
| P1 | 4-bosqich: sodda telefon interfeysi (pastki tab-bar, "Bor/Tugadi", stol plitkalari, Moliya 3 raqami, kun/vaqt tanlagichlari); bayroqlar `admin_ui`, `admin_simple_mode`, `onboarding_wizard` | TZ-3 §4 va maket `mockups/admin_oddiy_maket.html` (asosiy sayt tokenlari bilan qayta chizilgan) | 🎨 egasi **qayta chizilgan** maketni ma'qullasin | C |
| P2 | Qoldiq xatolar. ✅ **(1)-(4) bajarildi (2026-10-30, 48 yangi test, har biri tuzatishsiz yiqilishi tasdiqlangan):** (1) eski `admin_category_*` endi faqat platforma admini (API bilan bir xil qoida); (2) HTML formalar `ar_model` ni API qoidasi bilan tekshiradi; (3) Telegram `ord_status` holat mashinasi orqali (KDS kabi: kutilayotgan buyurtma avval `confirmed` qilinadi, aks holda Telegram buzilardi); (4) `/seller/orders/<pk>/` restoranda 500 bermaydi (do'konga bog'langan yangi `seller_order_status`). **Qolgan:** (5) soft-SPA sahifa uslublari; (6) xodim↔`chat_id` tasdiqlangan bog'lash; (7) tashqi bog'liqliklar (`model-viewer` CDN nusxalari, `qrserver`). **Yangi topilgan:** (8) to'langan buyurtma bekor qilinganda kassa kirimi qaytarilmaydi (hozir kam uchraydi: `delivered` dan bekor yo'q; oldindan to'lovda ahamiyatli); (9) `urls_studio` da ham xuddi shu `/seller/orders/<pk>/` 500 (boshqa mahsulot, alohida qaror); (10) Flutter seller API `ar_model` ni faqat `URLField` bilan tekshiradi (`http://localhost/x.exe` o'tadi); (11) eski `admin_category_*`: `sort_order` raqam bo'lmasa 500, `admin_category_delete` **GET bilan** holatni o'zgartiradi (CSRF); (12) qo'lda skript `backend/scripts/loop_engineering_test.py` eskirgan oqimni kutadi; (13) Telegram tugmasida `select_for_update` yo'q (tez ikki marta bosish poygasi) | TZ-3 §11 | Yo'q: darhol boshlash mumkin | C |
| P3 | **Bitta dizayn tili**: `/ra/` ni asosiy sayt tokenlariga o'tkazish (`admins/shared/src/ui/tokens.css` va qattiq ranglar), eski login/dashboard (krem/yashil/Playfair) va Seller klassik panelini audit + moslash, `guest_design` almashtirgichini yashirish | TZ-MASSHTAB §4 | 🎨 P1 maketi ma'qullangach; oldin/keyin skrinshot | C |
| P4 | GitHub'da CI birinchi marta yurishi va yashil qilinishi (branch `menu` remote'ida) | `.github/workflows/ci.yml` | Yo'q | C (Actions natijasini ko'rish usuli: `gh` yoki egasi ko'rsatadi) |
| P5 | Haqiqiy qurilmalarda sinov: Android/iOS Safari, Firefox, sekin tarmoq (3G profili) | TZ-3 | S2 dan keyin (haqiqiy server) | E (qurilma) + C |
| P6 | R11: repo tozalash (prototiplarni arxivlash, katta fayllarni git'dan chiqarish) | Eski roadmap R11 | 👤 egasi ruxsati; `main` bilan bog'liq: alohida | C |
| P7 | Pilot (R12) + egasi ishlari: BotFather bot, haqiqiy 28 ta taom rasmi (hozir 6 tasi haqiqiy), haqiqiy menyu va xodimlar, do'kon sozlamasiga `telegram_chat_id`, QR/NFC stend chop etish, quruq sinov kuni | Eski roadmap R12 | 👤 S2 (domen) dan keyin | E + C |

---

## 4. Taxminiy muddat (±50%, ish kunlarida; egasining javob kutish vaqti qo'shilmagan)

| Faza | Hajm | Eslatma |
|---|---|---|
| S0 | 1–2 kun | Darhol boshlanadi |
| S1 | 1–2 kun | S0 profiliga bog'liq |
| P2 | 1–2 kun | S0–S1 bilan parallel |
| S2 | 1–2 kun | **VPS tayyor bo'lgandan keyin** |
| S3 | 3–5 kun | CDN hisobi va qarori kerak; eng ehtiyotkor faza |
| S4 | 3–4 kun | PG hajmli sinov bilan; kutilmagan topilma muddatni uzaytirishi mumkin |
| S6 | 1–2 kun | |
| S5 | 2–4 kun | Tashqi zaxira hisobi kerak; 30 kunlik uptime alohida |
| D1 isboti | 1–2 kun + soak | Hisobot |
| **Jami faol ish (S0–D1)** | **≈ 15–25 ish kuni** | ≈ 3–5 hafta kalendarda; 30 kunlik uptime kuzatuvi shu vaqt ichida parallel boshlanadi |
| P1 | 4–6 kun | 🎨 maket ma'qullangach |
| P3 | 3–5 kun | 🎨 |
| P5, P6 | 1–2 kun | |
| P7 pilot | 1–2 hafta kalendar | Egasi ishlari bilan |

Bu **va'da emas**: S2 dan oldin eng noaniq narx aynan "1000 foydalanuvchi qancha ish talab qiladi". G2 dan keyin muddat qayta baholanadi.

---

## 5. Har faza uchun hisobot va to'xtash qoidasi

Faza tugagach (G0–G6) **to'xtab** quyidagini beraman: (1) nima o'zgardi (fayllar, commit); (2) oldin/keyin raqamlar (hisobot fayli yo'li); (3) testlar (SQLite, PG, e2e) natijasi; (4) nima o'tmadi yoki sinalmadi (rost); (5) keyingi fazaga ruxsat so'rovi. Raqamlarsiz "tezlashtirdim" deyilmaydi. Natija yomonlashsa o'zgarish qaytariladi.

## 6. Hozirgi holat

| Band | Holat |
|---|---|
| Menyu ma'lumoti keshi, `menu_version`, ETag/304 (`/api/v1/restaurant/menu/`), `web`/`web-staff` ajratish, Caddy `immutable` | ✅ bor (kod va testlar) |
| Bazaviy o'lchov (noutbuk, SQLite, Caddy'siz) | ✅ 2026-10-30, TZ 2.2 (taxminiy) |
| PG/Caddy/haqiqiy server o'lchovi, yozuv va xodim yuk testlari | ❌ hali yo'q (generator tayyor: S0-1; mashinada xotira tanqis, S0-5 PG bazaviy o'lchovi xotira bo'shagach) |
| S0–S7 | ⏳ tasdiq kutilmoqda |
| P1 (maket qayta chizildi, ma'qullanish kutilmoqda), P2–P7 | ⏳ |
| 5 ta egasi qarori (VPS, CDN, Redis, zaxira joyi, ketma-ketlik) | ⏳ TZ 10-bo'lim (K1–K10) |

## 7. Tasdiqdan keyin birinchi qadamlar (kod faqat shundan keyin)

1. S0-1, S0-2: yuk testi stsenariylari va hajmli sinov bazasi.
2. S0-3, S0-5: profil va PG bilan bazaviy o'lchov; G0 hisoboti.
3. Parallel: P2 (1)–(4) va P4 (CI natijasini ko'rish).
4. G0 dan keyin S1 ro'yxati profilga qarab tasdiqlanadi va S1 boshlanadi.
