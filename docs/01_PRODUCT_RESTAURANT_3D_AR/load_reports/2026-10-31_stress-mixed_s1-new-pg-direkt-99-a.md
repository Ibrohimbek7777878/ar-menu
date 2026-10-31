# Yuk testi hisoboti: stress-mixed (s1-new-pg-direkt-99-a)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T06:41:30.612Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB, gunicorn 4x4 (to'g'ridan-to'g'ri), PostgreSQL 16 (Docker), 100k buyurtma; bayroqlar: NEW (MENU_CACHE_PLAIN_DATA/APPSETTING_CACHE_TTL/GUEST_PAGE_ETAG) |
| Commit | f0f43a1 |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 5.89 3.79 2.52 → 7.66 4.24 2.68 |
| Davomiylik | 10.3 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 3708 · 361.1 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 257 · p95 474 · p99 866 · max 1198

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /api/v1/restaurant/menu/ | 1376 | 134.0 | 0 | 239 | 446 | 852 | 1175 | 200:1376 |
| /menu/ | 1155 | 112.5 | 0 | 271 | 489 | 1005 | 1198 | 200:1155 |
| / | 1177 | 114.6 | 0 | 266 | 490 | 846 | 1184 | 200:1177 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/3708) |
