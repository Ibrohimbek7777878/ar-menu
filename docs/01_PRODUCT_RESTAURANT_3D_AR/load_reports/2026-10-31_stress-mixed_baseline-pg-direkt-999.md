# Yuk testi hisoboti: stress-mixed (baseline-pg-direkt-999)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:43:22.308Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 5.84 4.07 2.55 → 8.1 4.67 2.77 |
| Davomiylik | 15.6 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 2628 · 168.3 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 4371 · p95 8831 · p99 9301 · max 9537

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 874 | 56.0 | 0 | 4391 | 8803 | 9318 | 9515 | 200:874 |
| /api/v1/restaurant/menu/ | 886 | 56.8 | 0 | 4319 | 8817 | 9301 | 9537 | 200:886 |
| / | 868 | 55.6 | 0 | 4371 | 8887 | 9279 | 9529 | 200:868 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/2628) |
