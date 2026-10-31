# S1 oldin/keyin hisoboti (2026-10-31)

Commit `f0f43a1` (S1: `0e37d8f` + TTL=0 tuzatishi). Bir mashina, bir sessiya, bayroqlar bilan almashtirib. **D1 isboti emas** (lokal muhit, TZ §7): faqat "S1 nima berdi" savoliga javob.

- **Oldin (OLD)** = `MENU_CACHE_PLAIN_DATA=false APPSETTING_CACHE_TTL=0 GUEST_PAGE_ETAG=false` (S1-1, S1-2, S1-4 o'chiq; S1-3 TTL=0 da eski SQL soniga qaytadi: 304 yo'lida 2 SQL, testda tasdiqlangan).
- **Keyin (NEW)** = standart qiymatlar (`true`, `5`, `true`).
- S1-5 (health) va S1-6 (`select_related`) bayroqsiz; ular alohida testlar bilan o'lchangan (pastda).

## 1. In-process (Django ichida, bitta oqim, tarmoqsiz)

`loadtest/profile_django.py`, `DEBUG=False`, SQLite nusxa (S0-5 seed), 150 taom, 800 so'rov/yo'l.

| Yo'l | Oldin | Keyin | O'zgarish |
|---|---|---|---|
| `/menu/` | 11.62 ms · 4 SQL (`app_settings` ×3, `shops` ×1) | **2.14 ms · 1 SQL** (`shops` PK) | 5.4× tez |
| `/api/v1/restaurant/menu/` 304 (ETag bilan) | 1.76 ms · 2 SQL (`app_settings`, `shops`) | **0.66 ms · 0 SQL** | 2.7× tez |
| `/health/` (to'liq, o'zgarmagan) | 1.86 ms · 5 SQL | 1.81 ms · 5 SQL | yo'q (maqsad ham emas) |

Maqsadlar (ROADMAP S1): `/menu/` ≤ 6 ms ✅, SQL ≤ 1 ✅, 304 < 0.5 ms ❌ **0.66 ms** (0 SQL bo'ldi, qolgani Django'ning URL hal qilish va so'rov/javob obyektlari: profilda ilova kodi qolmadi; shuning uchun bundan ortiq "sayqallash" qilinmadi).

Boshqa S1 o'lchovlari (testlar): `/health/live/` 0 SQL, `/health/ready/` aniq 1 SQL (`web/test_health_probes.py`); `/api/v1/products/` ro'yxati 20 taomda 22 → 3 SQL (`products/test_product_list_queries.py`, tuzatishsiz 22 bilan yiqilishi ko'rilgan).

## 2. Stress, haqiqiy gunicorn (4 ishchi × 4 oqim) + PostgreSQL 16, 100 000 buyurtmali baza

Profil `stress-mixed` (o'ylash vaqtisiz, `/menu/`, `/`, `/api/v1/restaurant/menu/`), 10 s, to'g'ridan-to'g'ri gunicorn (Caddy yo'q), generator shu mashinada. Ketma-ketlik: OLD, NEW, OLD, NEW (99 foydalanuvchi), so'ng OLD, NEW (999).

| Yurish | Foydalanuvchi | req/s | p50 | p95 | p99 | xato |
|---|---:|---:|---:|---:|---:|---:|
| OLD a | 99 | 134.2 | 804 ms | 1228 ms | 1515 ms | 0 |
| **NEW a** | 99 | **361.1** | 257 ms | **474 ms** | 866 ms | 0 |
| OLD b | 99 | 126.6 | 604 ms | 1326 ms | 1412 ms | 0 |
| **NEW b** | 99 | **424.3** | 118 ms | **608 ms** | 687 ms | 0 |
| OLD | 999 | 260.4 | 3727 ms | 5112 ms | 5178 ms | 0 |
| **NEW** | 999 | **644.7** | 1434 ms | **2003 ms** | 2037 ms | 0 |

Xulosa (bir sessiya ichida): 99 foydalanuvchida o'rtacha **130 → 393 req/s (≈ 3.0×)**, p95 ≈ **−59%**; 999 foydalanuvchida **260 → 645 req/s (≈ 2.5×)**, p95 5.1 s → 2.0 s. Ikki tomonda ham 0 xato. Hisobotlar: `2026-10-31_stress-mixed_s1-{old,new}-pg-direkt-*.md/json`.

**Mutlaq raqamlar mashina holatiga juda bog'liq.** Xuddi shu o'lchov bir necha soat avval (birinchi seriya) OLD ≈ 295–306, NEW ≈ 779–806 req/s berdi (nisbat 2.6×; 999 da 294 → 755). Ikkinchi seriyada mashina sekinroq edi (seed ham 68 s o'rniga 94 s oldi), shu sababli hamma raqam pastroq, lekin OLD↔NEW nisbati saqlandi. Birinchi seriya hisobotlari fayl sifatida saqlanmagan: u paytda bayroq o'chiq holatda menyu API qadamida bitta ortiqcha SQL bor edi (TTL=0 nuqsoni, f0f43a1 da tuzatildi), shuning uchun toza dalil sifatida ikkinchi seriya olindi. Xulosa: **tezlanish 2.5–3× atrofida, aniq son mashinaga bog'liq**.

## 3. Cheklovlar (rost)

1. **Generator (Node, bitta oqim) ham shu mashinada.** Yuqori raqamlarda (birinchi seriya ~800 req/s) generatorning o'zi cheklovchi bo'lishi mumkin; NEW raqamlari "server shunga yetdi" emas, "kamida shuncha" deb o'qiladi. Aniq ajratish uchun alohida mashina kerak (S2).
2. **S0-5 va boshqa sessiyalar raqamlari bilan solishtirmang.** S0-5 da bu profil 152 req/s, birinchi S1 seriyasida OLD ~300, ikkinchisida ~130 berdi: farq kodda emas, mashina holatida (swap, fon yuklama). Faqat bir sessiyadagi OLD↔NEW solishtiriladi.
3. **Caddy va gzip bu yurishlarda yo'q** (to'g'ridan-to'g'ri gunicorn). Caddy qo'shilsa umumiy raqam pasayadi (S0-5: Caddy gzip ostida chegara 150–180 req/s edi, o'sha shartlarda qayta o'lchash kerak).
4. **O'ylash vaqtisiz stress haqiqiy xulq emas.** Realistik 1000 mehmon ≈ 25 req/s (TZ 2.2b); bu yerdagi 999-foydalanuvchili raqam faqat "bir soniyalik portlashda navbat qancha uzayadi" ni ko'rsatadi: 5.1 s → 2.0 s.
5. **Sozlamalar 5 s kechikishi bilan ko'rinadi** (boshqa gunicorn ishchilarida), admin o'zgartirgan ishchida darhol. Bu bilan bog'liq xato topilmadi, lekin bu yangi xatti-harakat va hujjatlashtirilgan.
6. **S1-3 (304) maqsadi 0.5 ms edi, 0.66 ms chiqdi** (yuqorida).
7. Stress qadamlari 304 emas to'liq 200 javob so'raydi (generator `--conditional` siz); ETag/304 ning tizim darajasidagi yutug'i bu seriyada o'lchanmagan (faqat in-process va brauzer tekshiruvi).

## 4. Tekshiruv natijalari (G1)

| Tekshiruv | Natija |
|---|---|
| Backend testlar, SQLite (oxirgi commit `f0f43a1`) | 769 OK (7 skip) |
| Backend testlar, PostgreSQL 16 (oxirgi commit) | 769 OK *(S1 ning birinchi PG yurishida bitta test yiqilgan edi: `seed_load` ANALYZE testi baza turini SQLite deb taxmin qilgan: test xatosi, tuzatildi)* |
| e2e (Playwright, haqiqiy Chromium, `/ra/`) | 12/12 |
| `ruff check .` (CI qoidasi) | toza |
| HTML `/menu/` oldin/keyin | baytma-bayt bir xil (`new` va `classic`, savat bilan, stol tokeni bilan: `web/test_menu_plain_cache.py`) |
| Haqiqiy brauzer, `/menu/` | chiziladi (150 taom), konsol xatosi 0; qayta yuklashda brauzer `If-None-Match` yuboradi, server `304 0 bayt` qaytaradi, sahifa o'zgarmaydi |
| Sinovdan tashqari qolganlar | Caddy orqali gzip'li ETag (Caddy ETag'ni o'zgartirmasligi tekshirilmagan: S2 da), compose healthcheck haqiqiy deployda |
