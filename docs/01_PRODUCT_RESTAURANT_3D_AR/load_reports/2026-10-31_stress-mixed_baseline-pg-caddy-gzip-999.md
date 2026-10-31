# Yuk testi hisoboti: stress-mixed (baseline-pg-caddy-gzip-999)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:43:49.830Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 9.05 4.98 2.89 → 9.44 5.33 3.05 |
| Davomiylik | 16.6 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 2936 · 176.5 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 4617 · p95 6736 · p99 6840 · max 6919

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 973 | 58.5 | 0 | 4614 | 6739 | 6839 | 6900 | 200:973 |
| / | 978 | 58.8 | 0 | 4678 | 6736 | 6839 | 6886 | 200:978 |
| /api/v1/restaurant/menu/ | 985 | 59.2 | 0 | 4610 | 6732 | 6848 | 6919 | 200:985 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/2936) |
