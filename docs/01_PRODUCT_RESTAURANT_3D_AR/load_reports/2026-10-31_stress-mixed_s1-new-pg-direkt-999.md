# Yuk testi hisoboti: stress-mixed (s1-new-pg-direkt-999)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T06:42:33.672Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB, gunicorn 4x4 (to'g'ridan-to'g'ri), PostgreSQL 16 (Docker), 100k buyurtma; bayroqlar: NEW (MENU_CACHE_PLAIN_DATA/APPSETTING_CACHE_TTL/GUEST_PAGE_ETAG) |
| Commit | f0f43a1 |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 7.75 4.87 2.99 → 7.79 4.98 3.05 |
| Davomiylik | 11.6 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 7506 · 644.7 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 1434 · p95 2003 · p99 2037 · max 2441

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 2482 | 213.2 | 0 | 1441 | 2007 | 2030 | 2441 | 200:2482 |
| /api/v1/restaurant/menu/ | 2516 | 216.1 | 0 | 1430 | 2000 | 2043 | 2417 | 200:2516 |
| / | 2508 | 215.4 | 0 | 1434 | 2003 | 2059 | 2430 | 200:2508 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/7506) |
