# Yuk testi hisoboti: stress-mixed (baseline-pg-caddy-gzip-99)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:43:33.034Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 8.1 4.67 2.77 → 9.05 4.98 2.89 |
| Davomiylik | 10.6 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 2191 · 207.2 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 444 · p95 788 · p99 836 · max 887

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /menu/ | 714 | 67.5 | 0 | 459 | 800 | 849 | 873 | 200:714 |
| / | 743 | 70.3 | 0 | 434 | 773 | 823 | 843 | 200:743 |
| /api/v1/restaurant/menu/ | 734 | 69.4 | 0 | 437 | 783 | 838 | 887 | 200:734 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/2191) |
