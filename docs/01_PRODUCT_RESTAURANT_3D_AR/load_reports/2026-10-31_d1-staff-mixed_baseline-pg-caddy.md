# Yuk testi hisoboti: d1-staff-mixed (baseline-pg-caddy)

**Natija: INCONCLUSIVE** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T05:04:09.630Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4 (BITTA havza: web-staff ajratilmagan), PostgreSQL 16 (Docker, 768MB), Caddy (Docker, gzip), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 2.68 3.3 3.24 → 1.43 2.51 2.94 |
| Davomiylik | 180.1 s (reja 180 s), timeScale 1, seed 42 |
| Izoh | 180 s; xodim va mehmon BIR gunicorn havzasida (production'da web/web-staff ajratilgan); realistik seed (--paid-ratio 0.94, stol boshiga ~4 ochiq buyurtma) |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 5211 · 28.9 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 25 · p95 110 · p99 143 · max 265

Buyurtmalar: 263 yaratildi, 0 xato, 0 takroriy raqam

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| menu | 2344 | 13.0 | 0 | 20 | 74 | 105 | 265 | 200:2344 |
| welcome | 1222 | 6.8 | 0 | 16 | 40 | 66 | 133 | 200:1222 |
| order | 263 | 1.5 | 0 | 30 | 75 | 132 | 141 | 201:263 |
| waiter-orders | 346 | 1.9 | 0 | 63 | 134 | 158 | 169 | 200:346 |
| waiter-tables | 346 | 1.9 | 0 | 109 | 167 | 200 | 216 | 200:346 |
| waiter-calls | 346 | 1.9 | 0 | 6 | 9 | 13 | 24 | 200:346 |
| kds-orders | 344 | 1.9 | 0 | 62 | 136 | 170 | 187 | 200:344 |

Barqarorlik: p95 birinchi uchdan birida 114 ms, oxirgisida 105 ms (barqaror)

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| kds-orders p95 ≤ 300 ms | PASS | 136 ms |
| waiter-orders p95 ≤ 300 ms | PASS | 134 ms |
| waiter-tables p95 ≤ 300 ms | PASS | 167 ms |
| order p95 ≤ 800 ms | PASS | 75 ms |
| menu p95 ≤ 500 ms | PASS | 74 ms |
| xato ulushi ≤ 0.10% | PASS | 0.000% (0/5211) |
| takroriy buyurtma raqami yo'q | PASS | 0 ta takror |
| buyurtma xatolari ≤ 0 | PASS | 0 ta |

## Ogohlantirish va izohlar

- Yurish 180 s, mezon kamida 1800 s talab qiladi: bu isbot EMAS
- Xodim ekranlari: 20/20 muvaffaqiyatli kirdi
