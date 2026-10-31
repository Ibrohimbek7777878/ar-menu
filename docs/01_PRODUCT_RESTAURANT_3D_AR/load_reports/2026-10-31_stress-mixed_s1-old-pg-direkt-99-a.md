# Yuk testi hisoboti: stress-mixed (s1-old-pg-direkt-99-a)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T06:41:15.664Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB, gunicorn 4x4 (to'g'ridan-to'g'ri), PostgreSQL 16 (Docker), 100k buyurtma; bayroqlar: OLD (MENU_CACHE_PLAIN_DATA/APPSETTING_CACHE_TTL/GUEST_PAGE_ETAG) |
| Commit | f0f43a1 |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 3.43 3.23 2.33 → 5.62 3.7 2.49 |
| Davomiylik | 10.9 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 1457 · 134.2 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 804 · p95 1228 · p99 1515 · max 1621

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| / | 491 | 45.2 | 0 | 798 | 1226 | 1535 | 1596 | 200:491 |
| /api/v1/restaurant/menu/ | 549 | 50.6 | 0 | 744 | 1175 | 1473 | 1604 | 200:549 |
| /menu/ | 417 | 38.4 | 0 | 884 | 1288 | 1552 | 1621 | 200:417 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/1457) |
