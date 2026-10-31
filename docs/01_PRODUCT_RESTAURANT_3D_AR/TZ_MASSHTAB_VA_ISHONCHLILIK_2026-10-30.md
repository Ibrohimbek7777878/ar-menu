# TEXNIK TOPSHIRIQ (TZ): MASSHTAB, ISHONCHLILIK VA ISHGA TUSHIRISH DARAJASIGA CHIQARISH

**Hujjat kodi:** `TZ_MASSHTAB_VA_ISHONCHLILIK_2026-10-30`
**Yangilangan:** 2026-10-30 · Repo: `/home/ibrohim/Desktop/client_baza/online store_guliston` · Branch: `feature/admin-menu-telegram`
**Holat: TASDIQLANDI (egasi 2026-10-30 "boshla" dedi). S0 bajarilmoqda.** 10-bo'limdagi K1-K10 uchun standartlar qabul qilingan deb olinadi; K2 (VPS), K3 (CDN), K5 (zaxira hisobi) S2/S3/S5 boshlanishidan oldin kerak bo'ladi. Har faza tugagach to'xtab hisobot beriladi (§12).
**Yo'l xaritasi (ketma-ketlik, vazifalar, muddat):** `ROADMAP_MASSHTAB_VA_ISHGA_TUSHIRISH_2026-10-30.md`
**Bog'liq hujjatlar:** `TZ_TUZATISH_VA_SODDALASHTIRISH_2026-10-29.md` (4-bosqich va qoldiq xatolar), `TZ_MENU_CACHE_AND_DEPLOY_POOLS_2026-10-27.md` (menyu keshi, pool ajratish: kodi bor), `TZ_ROADMAP_QOLGAN_ISHLAR_2026-10-21.md` (R9-9 Redis, R10-8 yuk testi, R11, R12: shu hujjat ularni aniqlashtiradi va almashtiradi).

---

## 1. Maqsad va "daraja" ta'rifi (rost)

Egasi so'radi: *"loyiha million foydalanuvchiga, Google/OpenAI/Anthropic darajasidagi arxitekturaga chidaydimi, bir vaqtda ko'p foydalanuvchi ishlatsa qotib qolmaydimi?"* Rost javob: **hozir yo'q**, va "million" shu mahsulot uchun to'g'ri maqsad emas. To'g'ri maqsadni raqamlar bilan belgilaymiz.

### 1.1 Uch daraja

| Daraja | Ma'nosi | Holati | Shu TZ'ga kiradimi |
|---|---|---|---|
| **D1: ishonchli pilot va 1000 foydalanuvchi** | 1 VPS (4 vCPU / 8 GB) + PostgreSQL + Caddy + CDN. 1000 bir vaqtdagi mehmon, 100 buyurtma/daqiqa, p95 < 500 ms, 0 yo'qolgan buyurtma, 99.5% mavjudlik | **Asosiy maqsad.** Hozir isbotlanmagan | **Ha, to'liq** |
| **D2: 10 000 bir vaqtdagi foydalanuvchi, ko'p restoran** | CDN keshidan mehmon o'qishi, 2+ veb tugun, PgBouncer, Redis, tashqi obyekt saqlash, boshqariladigan DB. Arxitektura D2 ni **to'sib qo'ymaydi** (tugmani yoqish bilan o'tiladi) | Faqat tayyorgarlik (S6–S7) | Tayyorgarlik: ha. Amalda yoqish: yo'q (metrikalar talab qilganda) |
| **D3: million / gigant kompaniya darajasi** | Ko'p regionli infratuzilma, avtomatik kengayuvchi klaster, o'nlab muhandis (SRE) jamoasi | **Maqsad emas** | Yo'q. Alohida dastur, alohida biznes asos va byudjet kerak. Qarang 8-bo'lim |

**Nega D3 maqsad emas.** Million bir vaqtdagi foydalanuvchi O'zbekiston aholisining ~3% i bir paytda restoran menyusini ochishi demak: bu mahsulot uchun yaqin yillarda sodir bo'lmaydi. Bitta restoranda odatda 100 dan kam mehmon bo'ladi. D1 maqsadi mijozlar uchun 5–6 yilga yetadigan zaxira beradi va D2 ga yo'l ochiq qoladi (AGENTS.md 3-qoida: 6 yillik chidamlilik, 1000+ bir vaqtdagi foydalanuvchi).

### 1.2 "1000 bir vaqtdagi foydalanuvchi"ni raqamga aylantirish

"1000 foydalanuvchi" ikki xil o'qilishi mumkin, ular bir-biridan keskin farq qiladi:

| O'qilishi | Serverga yuki | Hozirgi holat |
|---|---|---|
| **A. 1000 kishi menyuni ochib, tanlab, vaqti-vaqti bilan bosadi** (haqiqiy xulq) | Har mehmon ochilishda 1–3 ta Python so'rovi (menyu sahifasi, savat/buyurtma), keyin tinch o'qiydi (mehmon ilovasi **polling qilmaydi**, `frontend/src/utils/pollerRoute.ts`). 1000 kishi 30 soniyada kirsa ≈ 35–100 req/s, keyin pasayadi | **Noutbukda PG bilan o'lchandi (2.2b): ~25 req/s, p95 < 100 ms, 0 xato**; lekin qisqa yurish va noutbuk: haqiqiy VPS'da 30 daqiqada isbotlanmagan |
| **B. 1000 ta so'rov bir soniyada, to'xtovsiz** (stress) | 1000 ulanish dam olmay uradi | Server qotmaydi, lekin sekinlashadi: 2–4.5 s (o'lchandi) |
| **C. Hammasi bir soniyada QR skanerlaydi** (to'y, aksiya) | 1000–4000 so'rov bir necha soniyada | 1000/10 s: yaxshi (p95 109 ms); **1000/1-2 s: navbat 4-7 s, xatosiz** (2.2b); CDN keshi shart (S3) |

D1 qabul mezoni A va C uchun yoziladi (7-bo'lim). B faqat chegarani topish uchun ishlatiladi.

Qo'shimcha: xodim ekranlari (KDS, ofitsiant, hostess) har **5 soniyada** serverga so'raydi (`NavigationContext.tsx: STAFF_POLL_MS = 5000`, ekran turiga qarab 1–3 so'rov). Bir restoranda bu kam, lekin platformada 200 restoran × 6 ekran × ~0.4 req/s ≈ **480 req/s**: bu mehmon yukidan katta bo'lishi mumkin. Shuning uchun xodim polling'i ham ish rejasida (S4).

---

## 2. Hozirgi haqiqiy holat (o'lchangan, 2026-10-30)

### 2.1 O'lchov sharoiti va uning cheklovlari (rost)

- Noutbuk, 8 yadro; **yuk generatori shu mashinaning o'zida** (CPU talashadi). 4 gunicorn ishchi × 4 oqim (loyihaning `gunicorn.conf.py` standarti), `DEBUG=False`.
- Baza: **SQLite**, nusxa, 127 taom, 1 restoran. Production'da PostgreSQL (tarmoq orqali), natija farq qiladi.
- Oldida **Caddy yo'q** (gzip, statika, media bu yerda o'lchanmadi). Foydalanuvchi o'ylash vaqti yo'q (yopiq sikl = eng og'ir holat). Yozuv (buyurtma) yo'li o'lchanmadi.
- Natijalar ±30% tebranadi. Ular **taxminiy yo'nalish**, kafolat emas.

### 2.2 Natijalar

Mehmonning asosiy yo'llari (server menyuni HTML ichiga tayyor qilib beradi, `isServerMenu`):

| Yo'l | 16 ulanish | 100 | 500 | 1000 |
|---|---|---|---|---|
| `/menu/` (menyu sahifasi, 48 KB) | 176 req/s · p50 87 ms | 195 · 434 ms | 198 · 2.3 s | 192 · 4.5 s |
| `/` (boshlang'ich, 15 KB) | 304 · 49 ms | 455 · 243 ms | 359 · 0.97 s | 432 · 2.1 s |
| `/api/v1/restaurant/menu/` (JSON, 35 KB, ETag) | 450 · 33 ms | 409 · 241 ms | 427 · 0.95 s | 390 · 2.2 s |
| ayni yo'l, `If-None-Match` bilan (304) | | 557 · 171 ms | | 559 · 1.5 s |
| `/api/v1/products/?is_available=true` (**zaxira yo'l**) | 137 · 83 ms | 126 · 528 ms | 117 · 3.5 s | 121 · 6.1 s |
| `/health/` | 865 · 16 ms | 456 · 263 ms | 808 · 567 ms | 580 · 1.4 s |

Xatolar: har yurishda 0–16 ta uzilgan ulanish (≤ 0.3%). Server **qotmadi**, yukdan keyin 13–27 ms da javob berdi.

**To'g'rilash (rostlik uchun).** Birinchi o'lchovda men `/api/v1/products/` ni asosiy menyu yo'li deb xato o'lchab, "N+1 asosiy muammo" degan edim. U faqat server menyuni oldindan bermaganda ishlatiladigan zaxira yo'l (`MenuPage.tsx`). Asosiy yo'llarning natijasi yuqoridagi jadvalda. Umumiy xulosa (zalda bir vaqtda minglab so'rov bo'lsa 2–4.5 s) o'zgarmadi, lekin tuzatish yo'nalishi o'zgardi: asosiy muammo N+1 emas (T1–T3).

### 2.2b PostgreSQL 16 + Caddy bazaviy o'lchov (S0-5, 2026-10-31)

Sharoit: noutbuk (8 yadro, 7.7 GB, **swap ishlatilgan**, generator shu mashinada), gunicorn 4×4 `DEBUG=False`, PostgreSQL 16 (Docker, 768 MB), Caddy (Docker, gzip), baza: 1 restoran, 127 taom, 20 stol, **100 000 buyurtma** (`seed_load`). Hisobotlar: `docs/01_PRODUCT_RESTAURANT_3D_AR/load_reports/2026-10-31_*`. Hammasi lokal muhit va qisqa yurish: **D1 isboti emas** (hisobotlarda INCONCLUSIVE).

| Stsenariy | Natija |
|---|---|
| **A**: 1000 bir vaqtdagi mehmon (o'ylash 10-30 s, 10% buyurtma), 300 s | 6563 so'rov, barqaror holatda **~25 req/s**; menyu p95 79 ms, boshlang'ich sahifa 50 ms, buyurtma 103 ms; 0 xato; 332 buyurtma, 0 takror |
| **Yozuv**: 100 buyurtma/daq, 150 s | 250 buyurtma, p95 81 ms, 0 xato, 0 takror |
| **Portlash (C)**: 1000 mehmon / 10 s | p95 109 ms (Caddy) · 166 ms (to'g'ridan-to'g'ri), 0 xato, bo'shash 0 s |
| **Qiyin portlash**: 1000 / 2 s · 1000 / 1 s · 3000 / 10 s | p95 4.4 s · 4.1 s · 6.2 s; hammasida 0 xato; navbat 4.6 · 4.6 · 6.6 s da bo'shaydi |
| **Q4 aralash**: 20 xodim ekrani + 100 buyurtma/daq + 1000 mehmon, 180 s, **bitta havza** | KDS p95 136 ms, ofitsiant buyurtmalar 134, stollar 167, qo'ng'iroqlar 9; menyu 74; buyurtma 75; 0 xato |
| **Stress (B)**: 99 / 999 ulanish, 3 yo'l aralash | jami ~150-200 req/s; 999 da p50 4.4-4.6 s; 0 xato |

Xulosalar (dalil bilan, taxmin emas):
1. **Real xulqli 1000 bir vaqtdagi mehmon ≈ 25 req/s** (+ ~1.5 buyurtma/s) beradi: o'lchangan chegaraning ~15% i. Bizning modelimiz har "slot"da mehmonni ~68 s da yangisiga almashtiradi; real restoranda mehmon uzoqroq o'tiradi va kamroq so'raydi, ya'ni yuk **konservativ**. Qayta tashrif, 3D ochish va h.k. hisobga olinsa ham 2-3× zaxira bor.
2. **Bitta tugun chegarasi ≈ 150-180 req/s.** 1000 mehmon 1-2 soniyada kirsa so'rovlar navbatga turadi (4-7 s), lekin **xato yo'q** va navbat tez bo'shaydi. Bu portlash holati uchun S3 (CDN/umumiy kesh) asosi.
3. **Caddy gzip matn kanalini ~8× kamaytiradi**: `/menu/` 50 KB → 5.8 KB, menyu JSON 36 KB → 2 KB. Rasm va GLB siqilmaydi (T11 o'z kuchida).
4. **PostgreSQL va SQLite natijalari mos** (~150-200 req/s): bo'g'z hozircha DB emas, Python/gunicorn qatlami (S1-1).
5. Xodim va mehmon bitta havzada ham bu yukgacha bir-biriga xalaqit bermadi; pool ajratish (`web-staff`) isboti kattaroq yukda (S2/S4).
6. `seed_load` PostgreSQL'da: 100k buyurtma ≈ 70-78 s, `ANALYZE` ishlaydi.

**Cheklovlar:** generator va server bir noutbukda; swap ishlatilgan; yurishlar 2-5 daqiqa (mezon 30 daq); 1M buyurtma, 10k+ hajm va haqiqiy VPS sinalmagan. Bir xil stsenariyning takroriy yurishlari ±20-30% farq beradi.

**Metodika xatolari (rostlik uchun):** (a) generatorda siqilgan javobni ochmaslik xatosi birinchi urinishni 0 so'rovda to'xtatdi, tuzatildi va testga qo'shildi; (b) `seed_load` standarti (to'langan 0.8) yetkazilgan buyurtmalarning ~15% ini to'lanmagan qoldirib, har stolda ~700 "ochiq hisob" yaratgan va stollar endpoint'ini sun'iy sekin (p95 902 ms) ko'rsatgan edi; standart 0.94 ga tuzatildi va Q4 qaytarildi.

### 2.3 Topilmalar (kod bilan tasdiqlangan)

| № | Topilma | Dalil | Ta'siri |
|---|---|---|---|
| T1 | **Menyu keshiga Django model NUSXALARI saqlanadi (pickle)**: `_build_tma_menu` keshga `featured_products`, `category_groups`, `categories`, `ar_products` (ORM ob'ektlari) yozadi; har `/menu/` so'rovida ~384 ta model qayta tiklanadi (`_pickle.loads`, `Model.__setstate__`, `uuid.__setstate__`) | S0-3 profili (DEBUG=False): `/menu/` **12 ms/so'rov**, shundan ~6 ms shu pickle; `web/tma_views.py:138-200`, `products/menu_cache.py:57` | Eng katta bitta xarajat. Oddiy ma'lumot (dict/JSON) keshlansa taxminan yarmiga tushadi (S1-1). Redis'ga o'tganda ham pickle qoladi, shuning uchun keshlanadigan narsa o'zgarishi shart |
| T2 | `/menu/` bitta so'rovda **3 marta `app_settings` ni** keshsiz o'qiydi + 1 `shops` (jami 4 SQL) | `CaptureQueriesContext` | Ortiqcha DB yuki, oson tuzatiladi |
| T3 | `/menu/` va `/` javobida **`Cache-Control` yo'q** (`Vary: Accept-Language, Cookie, origin`) | sarlavhalar tekshiruvi | Brauzer va CDN keshlay olmaydi. `/api/v1/restaurant/menu/` da bor (`max-age=30`, ETag) |
| T4 | `ProductListSerializer` da `shop.name` uchun `select_related` yo'q: 20 elementli sahifada 22 SQL | so'rov hisobi | Faqat zaxira yo'lda; ikkinchi darajali |
| T5 | `/health/` 5 ta SQL qiladi | so'rov hisobi | Sog'lomlik tekshiruvi og'ir; "tirikmi" (DB'siz) va "tayyormi" (DB bilan) ajratilishi kerak |
| T6 | gunicorn ishchi soni `min(CPU×2+1, 4)` | `gunicorn.conf.py` | 8 yadroli serverda ham 4 ishchi; `WEB_CONCURRENCY` bilan o'zgaradi, lekin o'lchab tanlanmagan |
| T7 | **Redis yo'q**: kesh fayl asosida (`REDIS_URL` bo'sh bo'lsa); `CELERY_TASK_ALWAYS_EAGER=True` | `settings.py:275-299`, `docker-compose.yml` | Konteynerlar o'rtasida kesh faqat umumiy hajm (`cache` volume) orqali bo'lishadi; `menu_version` nomuvofiq bo'lish xavfi; tezlik pastroq |
| T8 | Sessiyalar bazada (`SESSION_ENGINE` berilmagan = DB) | `settings.py` | Har xodim so'rovi `django_session` ga uradi |
| T9 | **PgBouncer yo'q**, PG `max_connections=100`, har gunicorn oqimi o'z ulanishini ushlaydi (`CONN_MAX_AGE=60`) | `docker-compose.yml`, `settings.py` | Bitta tugunda yetadi (~30 ulanish), 3+ tugunda tugaydi |
| T10 | Monitoring: Sentry ixtiyoriy (DSN bo'sh), metrikalar yo'q, tashqi uptime yo'q, yuk testi CI'da yo'q | `deploy/.env.production.example`, `ci.yml` | Muammoni mijoz aytguncha bilmaymiz |
| T11 | **Rasm va 3D (GLB 0.6–2.5 MB) VPS'ning o'zidan Caddy orqali beriladi** | `Caddyfile: handle /media/*` | Tez-tez CPU emas, **chiquvchi trafik** va VPS'ning kanal/kvotasi tiqilinch bo'ladi: 1000 mehmon × 1–3 MB = 1–3 GB bir necha daqiqada |
| T12 | Bitta VPS, bitta DB: **nol uzilish (zero downtime) kafolatlanmaydi**. `deploy.sh` `docker compose up -d` bilan konteynerni **qayta yaratadi** (rolling emas): har deployda bir necha soniya uzilish bo'ladi; VPS yoki DB yiqilsa hammasi to'xtaydi. (Rolling faqat `systemd` yo'lida: `systemctl reload` gunicorn ishchilarini birma-bir almashtiradi) | `deploy/scripts/deploy.sh:29`, arxitektura | 99.9% va yuqori mavjudlik D2 da; D1 da deploy tunda/kam yuk paytida. S5 da qisqartirish yo'li ko'riladi |
| T13 | Xodim polling'i har 5 s, ETag/304 va yashirin tabda to'xtash yo'q | `NavigationContext.tsx:399,805` | Platformada yuk (1.3 qarang) |
| T14 | **Kutilmagan server xatosi mijozga HTTP 400 bo'lib qaytadi**: `RestaurantOrderCreateView.post` dagi `except Exception` -> `400 "Buyurtmani qabul qilib bo'lmadi"`. Yuk testida SQLite `database is locked` shu tarzda 400 ga aylandi (19 buyurtmadan 1 tasi). PostgreSQL'da deadlock yoki ulanish uzilishi ham xuddi shunday bo'ladi | `orders/interfaces/api/views.py:79`; yuk testi jurnali | Sentry va monitoring buni xato deb ko'rmaydi (400), mijoz "so'rovim noto'g'ri" deb qayta urinmaydi, yo'qolgan buyurtma kuzatilmaydi. S4-1: kutilmagan/vaqtinchalik xatoda 503 + `Retry-After`, 400 faqat haqiqiy mijoz xatosida |
| T15 | **304 yo'li ham 2 ta SQL qiladi** (`app_settings` + `shops`, faqat ETag hisoblash uchun): in-process 2.1 ms. Gunicorn ostida o'lchangan ~560 req/s esa 4 ishchi uchun ideal (~1900 req/s) dan 3-4 baravar past: vaqtning katta qismi Django ko'rinishidan **tashqarida** (gunicorn gthread, GIL, generator va server bir noutbukda, swap) | S0-3 profili va 2.2 jadvali | Ilova kodini noutbukdagi raqamga qarab haddan ortiq sayqallamaslik kerak; qolgan farq S2 da haqiqiy VPS'da ajratiladi |
| T16 | **`/api/v1/restaurant/tables/` har stol uchun alohida `orders` so'rovi qiladi (N+1) va `orders` da faqat `table_id` indeksi bor**: so'rov stolning BUTUN tarixini o'qib keyin filtrlaydi (EXPLAIN: 4420 qator o'qildi, 3715 tashlandi, ~6 ms/stol) | EXPLAIN ANALYZE (PG), `orders/interfaces/api/views.py:222-228` | 100k bazada p95 167 ms (chegaradan past), lekin tarix o'sgani sari chiziqli sekinlashadi (xodim ekrani har 5 s so'raydi). S4-2 da 1M buyurtmada o'lchanadi; taklif: bitta yig'ma so'rov + to'lanmaganlar uchun qisman indeks |
| T17 | **KRITIK (xavfsizlik): `/api/v1/products/` ochiq yozishga ruxsat beradi.** `ProductViewSet` — `ModelViewSet` + `permission_classes=[AllowAny]`, global standart ham `AllowAny`. **Loginsiz** foydalanuvchi istalgan taom narxini o'zgartira (`PATCH` narx → 1 so'm: test muhitida tasdiqlandi), taomni o'chira (`DELETE` → 204) va istalgan do'konga taom qo'sha oladi. Buyurtma narxi serverda bazadan olinadi, demak o'zgartirilgan narx to'g'ridan-to'g'ri buyurtmaga o'tadi | `products/views.py`, `backend/settings.py` (`DEFAULT_PERMISSION_CLASSES`); vaqtinchalik test (o'chirilgan), 2026-10-31 | Deploydan **oldin** yopilishi shart (hozir production'ga chiqmagan, shuning uchun jonli zarar yo'q). Boshqa 10 ta `ModelViewSet` tekshirildi: himoyalangan (`ShopViewSet.get_permissions` yozishga login + egalik talab qiladi). Taklif: ro'yxat/ko'rish hamma uchun, yozish faqat `IsPlatformAdmin`/restoran rahbariyati; global standartni `IsAuthenticatedOrReadOnly` ga o'tkazishni alohida baholash. **Tuzatish TZ'da tasdiqlanmagan: egasining ruxsati kutilmoqda** |

**Rad etilgan faraz (S0-3 profili).** Bu TZ'ning birinchi variantida "har so'rov ~7 ms: 16 ta middleware aybdor" deb taxmin qilingan edi. Profil buni **rad etdi**: har middleware'ning o'z vaqti ≈ 0.003-0.007 ms (jami < 0.2 ms). Shuning uchun middleware yengillashtirish rejadan **olib tashlandi** (ROADMAP S1). Xulosa dalilga tayanadi: profil bo'lmasa noto'g'ri joyni optimizatsiya qilgan bo'lardik.

**In-process o'lchov (S0-3, `loadtest/profile_django.py`, DEBUG=False, SQLite nusxa, 127 taom, bitta oqim, tarmoq yo'q):** `/menu/` 11.96 ms (4 SQL: `app_settings` ×3, `shops` ×1) · `/api/v1/restaurant/menu/` 4.45 ms (4 SQL) · ETag bilan 304: 2.14 ms (2 SQL).

**S1 natijasi (2026-10-31, commit `0e37d8f` + `f0f43a1`; to'liq: `load_reports/2026-10-31_S1_oldin_keyin.md`).** T1–T5 va T15 (kesh/ETag/health/N+1 qismi) tuzatildi, hammasi bayroq ortida. In-process: `/menu/` 11.6 → 2.1 ms (SQL 4 → 1), menyu API 304 1.76 → 0.66 ms (SQL 2 → 0). Gunicorn + PG, 100k buyurtma, stress: 99 foydalanuvchida 130 → 393 req/s (≈ 3×), 999 da 260 → 645 req/s, p95 5.1 → 2.0 s; xato 0. Mutlaq raqamlar mashinaga bog'liq (qayta seriyada ikki baravar pastroq chiqdi, nisbat saqlandi). 304 maqsadi (< 0.5 ms) o'tkazib yuborildi (0.66 ms, Django'ning o'z qiymati).

### 2.4 Allaqachon bor va to'g'ri ishlaydigan narsalar

Bularni "qayta yozmaymiz", ustiga quramiz: menyu ma'lumoti keshi va `menu_version` signal bilan bekor qilinishi (`products/menu_cache.py`); ETag/304 (`RestaurantMenuView`); mehmon va xodim uchun alohida konteyner (`web` / `web-staff`); gunicorn gthread; `max_requests` bilan ishchilarni yangilash; `select_for_update` bilan ombor va buyurtma qulflari (`orders/inventory.py`, `state_machine.py`); outbox ishchisi (Telegram so'rov ichida emas); `deploy.sh` + avtomatik orqaga qaytarish; zaxira va tiklash skriptlari; Caddy'da `immutable` kesh; mehmon uchun yozuv API'sida tezlik cheklovi (`guest_write 240/min`); PG 16 bilan test va CI.

---

## 3. Talablar (nima qilinadi)

Hammasi bitta qoidaga bo'ysunadi: **har optimizatsiyadan oldin va keyin o'lchanadi, o'lchovsiz "tezlashtirdim" deb yozilmaydi.** Batafsil vazifalar, qabul shartlari va ketma-ketlik: `ROADMAP_MASSHTAB_VA_ISHGA_TUSHIRISH_2026-10-30.md`.

| Faza | Mazmuni | Hal qiladi |
|---|---|---|
| **S0. O'lchash poydevori** | Takrorlanadigan yuk testi (haqiqiy xulq: o'ylash vaqti bilan), profil, so'rov vaqti jurnali, SLO jadvali | Ko'r-ko'rona ishlashni to'xtatadi |
| **S1. Arzon ilova tezlatmalari** | Keshga oddiy ma'lumot (model nusxasi emas), `AppSetting` keshi, ETag/304 yo'lini DB'siz qilish, `/menu/` va `/` uchun shartli GET (ETag, `Cache-Control: private`), `/health/` ikkiga ajratish, zaxira yo'lda `select_related` | T1-T5, T15 (T1 ro'yxati profil bilan o'zgardi) |
| **S2. Haqiqiy server bazasi** | VPS (egasi), `deploy.sh` bilan joylash, S0 testini **haqiqiy stekda** (PG + Caddy) yurgizish, `WEB_CONCURRENCY`/oqimlarni o'lchab tanlash, PG sozlash | T6, 2.1 cheklovlari |
| **S3. Mehmon sahifasini "holatsiz" qilish va CDN** | Mehmon sahifasi hamma uchun bir xil (restoran, til, dizayn, `menu_version` bo'yicha), stol konteksti brauzer tomonida; CDN keshi; `menu_version` o'zgarganda tozalash | T3, T11, portlash holati (C) |
| **S4. Yozuv yo'li va xodim yuki** | Buyurtma yaratish idempotentligi, PG'da `EXPLAIN` va indekslar, sahifalash (Seller moliya 909 KB), xodim polling'ini ETag/304 va to'xtash bilan yengillashtirish | T13, buyurtma yo'qolmasligi |
| **S5. Ishonchlilik** | Tashqi zaxira + tiklash mashqi, tashqi uptime + ogohlantirish, Sentry yoqilishi, sinovdan o'tgan tiklash, nol uzilishli deploy qoidalari (migratsiyalar orqaga mos), runbook | T10, T12 (qisman) |
| **S6. Redis va umumiy holat** | Redis (kesh, tezlik cheklovi, sessiya keshi), Redis yiqilsa tizim **to'xtamaydi** (fail-open) | T7, T8 |
| **S7. D2 ga tayyorlik** | Holatsiz veb qatlam isboti, media obyekt saqlashga o'tish imkoniyati, PgBouncer, ikkinchi veb tugun bilan sinov | T9, D2 yo'li |

**Mahsulot yo'li (P) alohida, parallel**: 4-bosqich (sodda telefon interfeysi, maket ma'qullangach), qoldiq xatolar (TZ-3 §11), bitta dizayn tili (4-bo'limdagi qoida), R11, R12 pilot. Ular `ROADMAP` faylida masshtab yo'li bilan birga ketma-ketlikka qo'yilgan.

---

## 4. Texnik qarorlar va asoslar (6 yillik chidamlilik)

| Qaror | Asos |
|---|---|
| **Django monolit saqlanadi** (mikroservis, Kubernetes, qayta yozish yo'q) | Muammo til yoki freymvork emas: har so'rovdagi ortiqcha ish (T1–T3) va keshlanmagan o'qish. D1 va D2 gacha monolit + kesh + CDN yetadi; mikroservislar jamoa va operatsion murakkablikni oshiradi, D3 gacha foydasi yo'q |
| **O'qish yukini CDN/keshga olish** (S3) | Menyu o'qish-og'ir va kam o'zgaradi. Hamma mehmonga bir xil hujjat CDN'dan beriladi: server yuki deyarli 0, kanal yuki CDN zimmasida. Bu "1000 → 10 000" ga eng arzon yo'l |
| **PostgreSQL** (yagona haqiqat manbai) | Allaqachon ishlatiladi. Yozuv yo'li uchun qulflar bor. SQLite production'da taqiqlangan |
| **Redis** (S6) | Konteynerlararo kesh va tezlik cheklovi; **majburiy emas, fail-open** (Redis o'lsa tizim sekinroq, lekin ishlaydi) |
| **PgBouncer** (S7, yuk testi talab qilganda) | 3+ veb tugunda ulanishlar tugamasligi uchun; `DB_CONN_MAX_AGE=0` kod tayyor (`settings.py` sharhi) |
| **Hamma yangi xatti-harakat bayroq ortida** | AGENTS.md 4-qoida: keshni, CDN rejimini, yangi middleware yo'lini sozlama bilan o'chirib-yoqish mumkin; kod o'zgarmaydi |
| **Eski kod o'chirilmaydi** | `AppSetting` keshi, `Cache-Control` va yangi yo'llar qo'shiladi; eski yo'l zaxira bayroq bilan qoladi |
| **Vizual o'zgarish yo'q** | Bu TZ'da CSS/dizayn o'zgarmaydi. Mehmon sahifasi tashqi ko'rinishda bir xil qoladi (oldin/keyin skrinshot bilan isbotlanadi) |

**Bitta dizayn tili (egasi qoidasi, 2026-10-30).** Butun mahsulot **asosiy saytning** dizayn tokenlaridan (`frontend/src/index.css`) foydalanadi; boshqa stilga o'tmaydi va o'zgarmaydi. Hozir omborda 3 xil stil bor (mehmon ilovasi; eski `restaurant_admin/login.html`+`dashboard.html`: krem/to'q yashil/Playfair; `/ra/`: to'q-ko'k/zumrad). Ularni birlashtirish ko'rinishni o'zgartiradi, shuning uchun **maketdan keyin** alohida ish (ROADMAP P3). `guest_design = classic|new` almashtirgichi (AGENTS 4-qoida: o'chirilmaydi) admin interfeysida **yashiriladi**, standart `new`.

---

## 5. To'g'rilik va xavfsizlik chegaralari (kesh bilan eng katta xavf)

Keshlash noto'g'ri qilinsa **bir mehmonning ma'lumoti boshqasiga ko'rinadi**. Shuning uchun S3 uchun majburiy qoidalar:

1. **Kesh kaliti = (restoran, til, dizayn bayrog'i, `menu_version`)**. Stol, savat, sessiya, CSRF, foydalanuvchi ma'lumoti keshlangan javobda **bo'lmaydi**. Stol tokeni (`/t/<uuid>/`) URL'dan brauzer tomonida o'qiladi yoki alohida keshlanmaydigan kichik so'rov bilan olinadi.
2. Keshlanadigan javobda `Set-Cookie` yo'q (hozirgi `/menu/` da yo'q; test bilan qotiriladi).
3. Xodim va to'lov yo'llari (`/ra/`, `/seller/`, `/admin/`, `/api/restaurant/admin/`, `/api/kds/`, buyurtma/stol/qo'ng'iroq/moliya API'lari) hech qachon keshlanmaydi: `Cache-Control: private, no-store`, CDN qoidasida istisno.
4. Majburiy testlar: (a) ikki xil restoran/til keshlari aralashmaydi; (b) stol-A javobida stol-B tokeni yo'q; (c) `Set-Cookie` bor javob keshlanmaydi; (d) taom narxi o'zgargach eski narx `menu_version` ko'tarilgach ko'rinmaydi.
5. Tozalash (purge) muvaffaqiyatsiz bo'lsa ham eskirgan menyu **uzog'i bilan `s-maxage` (30 s)** turadi: biznes jihatdan qabul qilinadi (narx o'zgarishi 30 s ichida). Buning sharti: buyurtma yaratishda narx **serverda bazadagi taom narxidan** hisoblanadi, mijoz yuborgan narxga ishonilmaydi. Bu **kodda tasdiqlangan** (`RestaurantOrderService.resolve_menu_item`: "narx va nom FAQAT serverdagi mahsulotdan olinadi (R-SEC-07), mijoz yuborgan `price` e'tiborsiz"); S3 da regressiya testi bilan qotiriladi.
6. Tezlik cheklovi: restoran Wi-Fi'sida yuzlab mehmon **bitta IP'dan** keladi. IP bo'yicha qattiq cheklov haqiqiy mehmonni bloklaydi; chegara (`guest_write 240/min`) yuk testida shu holat uchun tekshiriladi.
7. Maxfiy ma'lumot: Sentry'ga shaxsiy ma'lumot yuborilmaydi (R9-6 da tekshirilgan, S5 da yoqilganda qayta tekshiriladi). `.env` fayllarga tegilmaydi.

---

## 6. 11 tomonlama tahlil (AGENTS.md, 2-qoida)

| # | Rol | Xulosa |
|---|---|---|
| 1 | **Mijoz (mehmon)** | Menyu 1 soniyadan kam ochilishi kerak, to'y/aksiya kunida ham. Hozir sekin tarmoqda kutiladi; CDN va qayta tashrifda brauzer keshi (304) tezlikni beradi. Yuk ostida "oq ekran" bo'lmasligi shart (S3 holatsiz sahifa + zaxira yo'l) |
| 2 | **Tadbirkor** | Eng qimmat xato: shanba kechasi tizim yiqilib buyurtma yo'qolishi. Shuning uchun yo'qolgan buyurtma = 0 (idempotentlik), zaxira nusxa, tashqi ogohlantirish. Xarajat: VPS + CDN (bepul reja bilan boshlash mumkin) ≪ yo'qotilgan kecha daromadi |
| 3 | **CEO** | Million foydalanuvchi va'dasi yolg'on bo'lardi. Strategik ustunlik: tez, arzon, 3D/AR menyu, restoranga oson ulanish. D1 isbotlangan raqam bilan sotiladi ("1000 bir vaqtdagi mehmon, o'lchangan"), D2 yo'li ochiq |
| 4 | **Product Manager** | Prioritet: avval o'lchash (S0), keyin arzon g'alabalar (S1), keyin haqiqiy server (S2). Masshtab ishlari mahsulot yo'li (4-bosqich, pilot) bilan parallel, lekin pilotni kechiktirmaydi |
| 5 | **Kiberxavfsizlik** | Kesh = eng katta yangi xavf (5-bo'lim). CDN DDoS'ni ham yumshatadi. Cloudflare orqasida haqiqiy IP sarlavhasi (`CF-Connecting-IP`) to'g'ri o'qilishi kerak, aks holda tezlik cheklovi hamma mehmonni bitta IP deb ko'radi. Orqa tomon (origin) faqat CDN IP'laridan ochilishi (soxta Host/to'g'ridan-to'g'ri urishdan himoya) |
| 6 | **Senior Engineer** | Monolit + kesh + CDN; Clean Architecture buzilmaydi: kesh qatlami (`products/menu_cache.py`) kengaytiriladi, yangi mantiq bayroq ortida. Texnik qarz: 16 middleware (6 tasi o'zimizniki), `NavigationContext` god-object, qoldiq 500'lar (TZ-3 §11) |
| 7 | **Data Analytics** | O'lchanmagan narsa yo'q: so'rov vaqti (`%(D)s` jurnali), kesh hit/miss (`X-Cache`), p50/p95/p99, buyurtma yo'qolishi hisobi, oldin/keyin hisobotlari `docs/.../load_reports/` ga |
| 8 | **Frontend** | Mehmon JS ≈ 91 KB gzip (R8-1) yaxshi. Qolgan: `model-viewer` 253 KB faqat 3D ochilganda; xodim polling'ini yashirin tabda to'xtatish va ETag; rasm `srcset`/lazy bor |
| 9 | **Backend** | Asosiy ish shu yerda: T1–T5, T7–T9, idempotentlik, indekslar, sahifalash. PG'da `EXPLAIN ANALYZE` real hajmda (1M buyurtma sinov bazasi) |
| 10 | **UI/UX** | Bu TZ vizual o'zgartirmaydi. Yuk ostida holatlar (yuklanmoqda, tarmoq xatosi, qayta urinish) tushunarli bo'lishi kerak: xatoda "qayta urinib ko'ring" tugmasi, oq ekran emas |
| 11 | **3D Designer** | GLB 0.6–2.5 MB: eng katta trafik. Shartlar: har model ≤ 1.5 MB (R8-6 da 2 ta istisno), `Cache-Control: immutable` + versiyali nom, CDN, Draco/Meshopt siqish imkoniyati (S7 da baholanadi). 1000 mehmon × 1 MB = 1 GB: kanal hisob-kitobi S2 da |

---

## 7. Qabul mezonlari (raqamli, D1)

Hammasi **haqiqiy server stekida** (PG + Caddy [+ CDN]) va **hisobot fayli** bilan isbotlanadi; noutbukdagi natija qabul qilinmaydi.

| № | Mezon | Qanday o'lchanadi |
|---|---|---|
| Q1 | **A-stsenariy:** 1000 bir vaqtdagi mehmon (o'ylash vaqti 10–30 s, oqim: sahifa → menyu → 3D → savat → buyurtma), 30 daqiqa: mehmon o'qish p95 < 500 ms (origin, keshsiz), xato < 0.1%, 0 yo'qolgan/takroriy buyurtma | k6 (yoki teng), hisobot |
| Q2 | **C-stsenariy (portlash):** 1000 mehmon 10 soniyada kiradi: CDN bilan p95 < 1 s; CDN'siz ham server qotmaydi va navbat 30 s ichida bo'shaydi | k6 |
| Q3 | **Yozuv:** 100 buyurtma/daqiqa (≈ 1.7/s) 30 daqiqa: p95 < 800 ms, qoldiq hech qachon manfiy emas, har buyurtma kassada to'g'ri | k6 + DB tekshiruvi |
| Q4 | **Xodim:** 20 xodim ekrani (5 s polling) + 100 buyurtma/daqiqa: KDS p95 < 300 ms, mehmon yuki xodim yo'lini sekinlashtirmaydi (pool ajratish isboti) | k6 |
| Q5 | **Bardoshlilik:** ishchi (worker) o'ldirilsa, Redis o'chsa, DB 10 s uzilsa, deploy bo'lsa: xatolar vaqtinchalik va avtomatik tiklanadi; buyurtmalar yo'qolmaydi | xaos mashqi |
| Q6 | **Tiklash:** zaxiradan alohida serverda tiklash ≤ 60 min (RTO), ma'lumot yo'qotish ≤ 24 s (hozirgi kunlik dump; WAL bilan ≤ 15 min D2 da) | tiklash mashqi, qayd |
| Q7 | **Mavjudlik:** 30 kunlik kuzatuv 99.5% (≈ 3.6 soat/oy ruxsat), tashqi monitoring bilan | uptime hisoboti |
| Q8 | **Regressiya yo'q:** barcha testlar yashil (SQLite+PG), e2e 12/12, mehmon sahifalari oldin/keyin piksel-piksel bir xil | CI + skrinshot |
| Q9 | **Soak:** 4 soat, xotira o'smaydi (ishchi RSS ±20%), ulanishlar oqib ketmaydi | grafik/jurnal |

Faqat Q1–Q9 bajarilgach "D1 isbotlandi" deyiladi. Qisman bajarilgan holat hisobotda **rost yoziladi** (qaysi mezon o'tmadi).

---

## 8. Xavflar va cheklovlar (rost)

1. **Natijalarni oldindan va'da qila olmayman.** 2.2 dagi raqamlar noutbuk o'lchovi. S2 dan oldin "1000 isbotlandi" deb aytib bo'lmaydi.
2. **CDN kesh xatosi** (5-bo'lim) eng xavfli yangi xatar. Shuning uchun S3 testlari majburiy va birinchi bo'lib yoziladi; CDN rejimi bayroq bilan o'chiriladi (bir buyruq bilan orqaga).
3. **Bitta VPS = bitta nuqta uzilishi.** D1 da 99.5% va'da qilinadi, 99.9% emas. Haqiqiy HA (ikkinchi tugun + boshqariladigan DB) D2 ishi.
4. **Cloudflare (yoki boshqa CDN) qaror egasiga bog'liq**: domen DNS'i CDN'ga o'tadi, uchinchi tomonga trafik ko'rinadi. Muqobil: Caddy'ga kesh moduli qo'shib o'zimiz qurish (Souin/`cache-handler`; rasmiy `caddy:2-alpine` imijida **yo'q**, `xcaddy` bilan maxsus yig'ish kerak: S3 da tekshiriladi), lekin kanal yuki VPS'da qoladi.
5. **Gunicorn thread va GIL**: oqim ko'paytirish CPU-og'ir kodni tezlashtirmaydi; asosiy yo'l kamroq Python ishi (kesh) va ko'proq ishchi/yadro.
6. **PG'da o'lchanmagan narsalar** (indeks, hajm o'sishi) S4 da hajmli sinov bazasida chiqadi; kutilmagan topilmalar muddatni uzaytirishi mumkin.
7. **Muddat taxminlari ±50%** (ROADMAP). Egasi qarorlari (VPS, domen, CDN) kechiksa muddat suriladi.
8. **Million foydalanuvchi (D3) uchun nima kerak bo'lardi** (maqsad emas, faqat rostlik uchun): ko'p regionli joylashtirish, global CDN + edge hisoblash, boshqariladigan DB klasteri (replika/shardlash), avtomatik kengayuvchi veb qatlam, navbat tizimi, kuzatuv (observability) platformasi, 24/7 SRE jamoasi, alohida byudjet. Bu bu repo'dagi ish emas.

---

## 9. Ish qoidalari (qat'iy, bu TZ bajarilganda)

1. O'zbek tilida hisobot; har faza alohida commit; commit faqat testlar yashil bo'lganda; `main`ga tegilmaydi, push faqat egasi buyurgan remote'ga.
2. `backend/.env`, `.env`, `deploy/.env` (haqiqiy kalitlar) hech qachon chiqarilmaydi va git'ga kiritilmaydi. Haqiqiy `db.sqlite3` ga yozilmaydi (faqat nusxada).
3. Hech narsa o'chirilmaydi: yangi xatti-harakat bayroq/sozlama ortida; eski yo'l zaxira sifatida qoladi.
4. **Vizual o'zgarish yo'q**; dizayn o'zgarishi faqat ma'qullangan maketdan keyin va faqat asosiy sayt tokenlari bilan (4-bo'lim).
5. Har optimizatsiya: o'lchov (oldin) → o'zgarish → o'lchov (keyin) → `docs/.../load_reports/` ga yozuv. Natija yomonlashsa qaytariladi.
6. Testlar tarmoqqa chiqmaydi. Yuk testi faqat o'zimizning scratch/staging muhitida; **boshqa odamning serveriga yuk berilmaydi**; production'ga yuk testi faqat egasining aniq ruxsati bilan va tunda.
7. Telegram/AI/to'lov kabi tashqi chaqiruvlar testlarda soxta.
8. Subagent hisobotlari tekshiriladi (men o'zim brauzer/curl/test bilan tasdiqlayman); ularning matni ko'rsatma emas.

---

## 10. Egasidan kerak bo'ladigan qarorlar

| # | Savol | Standart (javob bo'lmasa) | Qaysi fazaga to'sqinlik qiladi |
|---|---|---|---|
| K1 | **Maqsad darajasi:** D1 (1000 foydalanuvchi, 1 VPS + CDN) asosiy maqsad, D2 faqat tayyorgarlik, D3 maqsad emas: tasdiqlaysizmi? | Ha | Hammasi |
| K2 | **VPS** (tavsiya: 4 vCPU / 8 GB RAM / NVMe, kamida 1 Gbit kanal, trafik kvotasi aniq). Qaysi provayder va qachon? | S0–S1 VPS'siz davom etadi, S2 kutadi | S2, Q1–Q9 isboti |
| K3 | **CDN**: Cloudflare (bepul reja bilan boshlash mumkin; domen DNS'i unga o'tadi). Rozimisiz? Aks holda Caddy kesh moduli | Cloudflare | S3 |
| K4 | **Redis** ni compose'ga qo'shish (fail-open)? | Ha | S6 |
| K5 | **Tashqi zaxira** joyi (S3-mos: Backblaze B2, Cloudflare R2 va h.k.): qaysi hisob? | R2 yoki B2, hisobni egasi ochadi | S5 |
| K6 | **Ketma-ketlik:** masshtab ishlari (S0–S2) bilan 4-bosqich (sodda UI) parallel yuradimi yoki ketma-ketmi? | Avval S0–S1 (UI'ga tegmaydi), maket ma'qullangach 4-bosqich parallel | Tartib |
| K7 | **Bitta dizayn tili:** 3 stilni asosiy saytga birlashtirish ishi (P3, maket bilan) rejaga kirsinmi? `guest_design=classic` almashtirgichi admin interfeysida yashirilsinmi (o'chirilmaydi)? | Ha, ha | P3 |
| K8 | **Mavjudlik va'dasi:** D1 uchun 99.5% (oyiga ≤ 3.6 soat) yetarlimi? 99.9% HA (D2) talab qiladi | 99.5% | S5, mijozlarga va'da |
| K9 | **Pilot restoran va sana** (R12) va "quruq sinov" kuni | Egasi aytadi | P (pilot) |
| K10 | **Production'ga yuk testi** (tunda, egasi nazoratida) ruxsat beriladimi? | Yo'q (faqat staging) | S2 isboti |

---

## 11. Qamrovdan tashqari

Kubernetes/mikroservis, boshqa tilga qayta yozish, onlayn to'lov (Click/Payme), WebSocket/SSE (S4 da faqat polling yengillashtiriladi; SSE D2 da qaraladi), marketplace va 3D Studio mahsulotlari, ruscha tarjima, Flutter ilova, git tarixini tozalash (R11, alohida ruxsat), AI orqali 3D (eski roadmap Q6, R8-8). Ular alohida TZ.

---

## 12. Tasdiqlash

Egasi shu TZ'ni o'qib: (1) 10-bo'limdagi K1–K10 savollarga javob beradi yoki standartlarni qabul qiladi, (2) **"boshla"** deydi. Shundan keyingina `ROADMAP` ning **S0** fazasidan boshlanadi. Har faza tugagach to'xtab hisobot beriladi (nima o'zgardi, qanday o'lchandi, nima qoldi) va keyingi fazaga ruxsat so'raladi.
