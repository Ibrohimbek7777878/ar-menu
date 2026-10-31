# Yuk testi hisoboti: stress-mixed (s1-new-pg-direkt-99-b)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T06:42:01.294Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB, gunicorn 4x4 (to'g'ridan-to'g'ri), PostgreSQL 16 (Docker), 100k buyurtma; bayroqlar: NEW (MENU_CACHE_PLAIN_DATA/APPSETTING_CACHE_TTL/GUEST_PAGE_ETAG) |
| Commit | f0f43a1 |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 7.59 4.5 2.81 → 8.44 4.78 2.92 |
| Davomiylik | 10.2 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 4329 · 424.3 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 118 · p95 608 · p99 687 · max 995

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 1581 | 155.0 | 0 | 86 | 606 | 688 | 995 | 200:1581 |
| /api/v1/restaurant/menu/ | 1692 | 165.9 | 0 | 86 | 530 | 661 | 993 | 200:1692 |
| / | 1056 | 103.5 | 0 | 328 | 642 | 731 | 973 | 200:1056 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/4329) |
