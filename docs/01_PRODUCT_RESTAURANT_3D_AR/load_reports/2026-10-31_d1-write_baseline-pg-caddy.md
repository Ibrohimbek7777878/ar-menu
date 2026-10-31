# Yuk testi hisoboti: d1-write (baseline-pg-caddy)

**Natija: INCONCLUSIVE** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:52:32.462Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), Caddy (Docker, gzip), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 2.13 4.12 3.3 → 0.54 2.6 2.84 |
| Davomiylik | 150 s (reja 150 s), timeScale 1, seed 42 |
| Izoh | 150 s (mezon 30 daq) |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 250 · 1.7 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 55 · p95 81 · p99 104 · max 128

Buyurtmalar: 250 yaratildi, 0 xato, 0 takroriy raqam

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| order | 250 | 1.7 | 0 | 55 | 81 | 104 | 128 | 201:250 |

Barqarorlik: p95 birinchi uchdan birida 80 ms, oxirgisida 79 ms (barqaror)

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| order p95 ≤ 800 ms | PASS | 81 ms |
| xato ulushi ≤ 0.10% | PASS | 0.000% (0/250) |
| takroriy buyurtma raqami yo'q | PASS | 0 ta takror |
| buyurtma xatolari ≤ 0 | PASS | 0 ta |

## Ogohlantirish va izohlar

- Yurish 150 s, mezon kamida 1800 s talab qiladi: bu isbot EMAS
