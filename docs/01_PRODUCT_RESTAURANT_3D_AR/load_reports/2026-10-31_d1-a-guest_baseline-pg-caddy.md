# Yuk testi hisoboti: d1-a-guest (baseline-pg-caddy)

**Natija: INCONCLUSIVE** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:49:40.374Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), Caddy (Docker, gzip), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 5.66 4.98 3.05 → 2.86 4.39 3.37 |
| Davomiylik | 300 s (reja 300 s), timeScale 1, seed 42 |
| Izoh | 5 daqiqalik qisqartirilgan yurish (mezon 30 daq), 100k buyurtmali PG bazasi |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 6563 · 21.9 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 30 · p95 72 · p99 132 · max 238

Buyurtmalar: 332 yaratildi, 0 xato, 0 takroriy raqam

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| menu | 4179 | 13.9 | 0 | 33 | 79 | 143 | 238 | 200:4179 |
| welcome | 2052 | 6.8 | 0 | 25 | 50 | 76 | 196 | 200:2052 |
| order | 332 | 1.1 | 0 | 39 | 103 | 135 | 147 | 201:332 |

Barqarorlik: p95 birinchi uchdan birida 71 ms, oxirgisida 56 ms (barqaror)

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| menu p95 ≤ 500 ms | PASS | 79 ms |
| welcome p95 ≤ 500 ms | PASS | 50 ms |
| order p95 ≤ 800 ms | PASS | 103 ms |
| xato ulushi ≤ 0.10% | PASS | 0.000% (0/6563) |
| takroriy buyurtma raqami yo'q | PASS | 0 ta takror |
| buyurtma xatolari ≤ 0 | PASS | 0 ta |

## Ogohlantirish va izohlar

- Yurish 300 s, mezon kamida 1800 s talab qiladi: bu isbot EMAS
