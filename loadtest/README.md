# loadtest: restoran menyu yuk testi (S0-1, S0-4)

Tashqi paketsiz (Node >= 20). Maqsad: `docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MASSHTAB_VA_ISHONCHLILIK_2026-10-30.md` §7 dagi Q1–Q4 mezonlarini **takrorlanadigan** usulda o'lchash va hisobot yozish.

## Tez boshlash

```bash
cd loadtest
npm test                                   # generatorning o'z testlari (mock server, tarmoqsiz)
node run.mjs smoke --base http://127.0.0.1:8000 --no-report     # 20 s tezkor tekshiruv
node run.mjs stress-mixed --users 100 --label oldin             # B: stress, hisobot load_reports/ ga yoziladi
```

Server avval ishlab turishi va `/health/` 200 qaytarishi kerak. Menyuda mavjud taomlar bo'lishi shart (buyurtma stsenariylari uchun): `python manage.py seed_e2e` yoki real/demo ma'lumot.

## Profillar (`profiles/*.json`)

| Profil | Nimani isbotlaydi | Davomiylik |
|---|---|---|
| `d1-a-guest` | **Q1**: 1000 bir vaqtdagi mehmon, o'ylash 10–30 s, ~10% buyurtma | 30 daqiqa |
| `d1-c-burst` | **Q2**: 1000 mehmon 10 s ichida menyuni ochadi (portlash), bo'shash vaqti | 2 daqiqa |
| `d1-write` | **Q3**: 100 buyurtma/daqiqa, takroriy raqam yo'q | 30 daqiqa |
| `d1-staff-mixed` | **Q4**: 20 xodim ekrani (5 s polling) + 100 buyurtma/daq + 1000 mehmon | 30 daqiqa |
| `stress-menu`, `stress-mixed` | **B**: o'ylash vaqtisiz stress. **Isbot emas**, faqat chegara va "oldin/keyin" (S1, S3) uchun | 10 s |
| `smoke` | Generator va serverning asosiy yo'llari ishlayaptimi | 20 s |

Har profilda `slo` bo'limi bor: yurish oxirida har mezon PASS/FAIL, natija `PASS` / `FAIL` / `INCONCLUSIVE`. `INCONCLUSIVE` = mezonlar o'tdi, lekin yurish isbot bo'la olmaydi (qisqa, `--time-scale` ≠ 1).

## Qadamlar (`scenarios/`)

- `guest`: boshlang'ich sahifa (ba'zan) → `/menu/` → o'ylash (so'rovsiz, mehmon ilovasi polling qilmaydi) → ba'zan `POST /api/v1/restaurant/orders/create/`. Har "slot" ketma-ket yangi mehmonlarni o'ynaydi, shu bilan N bir vaqtdagi foydalanuvchi saqlanadi.
- `burst`, `stress`, `orders` (Puasson oqimi, ochiq model), `staff` (haqiqiy login formasi, 5 s polling).
- Narx mijozdan yuborilmaydi (server menyudan oladi), generator ham yubormaydi.

## Sozlash

`--base URL` · `--duration S` · `--users N` · `--rate N` (buyurtma/daq) · `--screens N` · `--paths a,b` (stress) · `--conditional` (ETag/If-None-Match) · `--accept-encoding gzip` (brauzer kabi siqilgan javob; Caddy siqish xarajati hisobga kiradi) · `--window S` (portlash oynasi) · `--assets /media/x.glb,...` · `--time-scale 0.01` (faqat test: o'ylashni qisqartiradi) · `--seed N` · `--label oldin|keyin` · `--stack "pg+caddy 4vCPU"` (hisobotga qo'lda yoziladi) · `--out DIR` · `--no-report` · `--fail-on-slo` (FAIL bo'lsa chiqish kodi 2).

Xodim stsenariysi uchun: `LT_STAFF_USER` va `LT_STAFF_PASS` muhit o'zgaruvchilari (kodga yozilmaydi). Demo/e2e bazada: `seed_e2e` yaratgan xodim va parol.

## Xavfsizlik (TZ §9.6)

Yuk faqat **lokal/ichki** manzillarga (127.x, 10.x, 192.168.x, 172.16–31.x). Boshqa manzil: `LT_ALLOW_REMOTE=1` **va** `--confirm-target <host>` ikkalasi kerak. **Production'ga faqat egasining aniq ruxsati bilan va tunda.** Boshqa odamning serveriga yuk berilmaydi.

## Hisobot

`--no-report` bo'lmasa `docs/01_PRODUCT_RESTAURANT_3D_AR/load_reports/YYYY-MM-DD_<profil>_<label>.{md,json}` yoziladi: sharoit (yadro, RAM, commit, load average), qadamlar jadvali (p50/p95/p99/max, holatlar), 10 s oynalar (barqarorlik), SLO. Lokal manzilda hisobot o'zi "D1 isboti emas" deb yozadi.

**Cheklovlar:** generator va server bir mashinada bo'lsa CPU talashadi; mashina swap'da bo'lsa vaqtlar buziladi (hisobotda load average ko'rinadi). Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2). Qoldiq (zaxira) va kassa to'g'riligi (Q3) generator tomonidan emas, DB tekshiruvi bilan tasdiqlanadi:

```sql
-- buyurtma raqamlari noyob; manfiy qoldiq yo'q (PG)
SELECT order_number, count(*) FROM orders_order GROUP BY 1 HAVING count(*) > 1;
SELECT id, stock FROM products_product WHERE stock < 0;
```

## Server vaqti jurnali (S0-4)

`backend/gunicorn.conf.py` har so'rovga `%(D)s` (mikrosekund) va Caddy qo'ygan `X-Request-Id` ni yozadi:

```bash
docker compose logs --no-log-prefix web | node parse_access_log.mjs --slow 5
```

Bu **server ichidagi** vaqt (mijoz kutgan navbat va tarmoq hisobga kirmaydi): generator hisoboti bilan yonma-yon o'qiladi.
