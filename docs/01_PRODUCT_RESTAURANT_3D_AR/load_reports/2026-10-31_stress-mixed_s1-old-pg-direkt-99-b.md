# Yuk testi hisoboti: stress-mixed (s1-old-pg-direkt-99-b)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T06:41:47.100Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB, gunicorn 4x4 (to'g'ridan-to'g'ri), PostgreSQL 16 (Docker), 100k buyurtma; bayroqlar: OLD (MENU_CACHE_PLAIN_DATA/APPSETTING_CACHE_TTL/GUEST_PAGE_ETAG) |
| Commit | f0f43a1 |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 7.25 4.27 2.71 → 8.08 4.54 2.82 |
| Davomiylik | 10.9 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 1385 · 126.6 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 604 · p95 1326 · p99 1412 · max 1460

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 418 | 38.2 | 0 | 970 | 1353 | 1424 | 1460 | 200:418 |
| / | 405 | 37.0 | 0 | 1012 | 1315 | 1366 | 1425 | 200:405 |
| /api/v1/restaurant/menu/ | 562 | 51.4 | 0 | 417 | 1309 | 1402 | 1433 | 200:562 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/1385) |
