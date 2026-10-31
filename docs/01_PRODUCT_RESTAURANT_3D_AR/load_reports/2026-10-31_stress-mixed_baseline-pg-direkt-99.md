# Yuk testi hisoboti: stress-mixed (baseline-pg-direkt-99)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:43:06.483Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 3.69 3.61 2.38 → 5.84 4.07 2.55 |
| Davomiylik | 10.7 s (reja 10 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 1637 · 152.4 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 720 · p95 1097 · p99 1217 · max 1554

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| /api/v1/restaurant/menu/ | 571 | 53.2 | 0 | 508 | 1093 | 1278 | 1554 | 200:571 |
| /menu/ | 659 | 61.4 | 0 | 397 | 1075 | 1193 | 1497 | 200:659 |
| / | 407 | 37.9 | 0 | 894 | 1136 | 1274 | 1501 | 200:407 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| xato ulushi ≤ 5.00% | PASS | 0.000% (0/1637) |
