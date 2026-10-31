# Yuk testi hisoboti: d1-c-burst (baseline-pg-caddy-3000u-10s)

**Natija: FAIL** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:53:27.599Z |
| Manzil | http://127.0.0.1:8080 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), Caddy (Docker, gzip), generator shu mashinada |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 1.33 2.54 2.81 → 2.27 2.7 2.86 |
| Davomiylik | 16.6 s (reja 120 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 3000 · 181.0 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 0

Javob vaqti (ms): p50 3688 · p95 6229 · p99 6521 · max 6600

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| menu | 3000 | 181.0 | 0 | 3688 | 6229 | 6521 | 6600 | 200:3000 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| menu p95 ≤ 1000 ms | **FAIL** | 6229 ms |
| xato ulushi ≤ 1.00% | PASS | 0.000% (0/3000) |
| portlashdan keyin bo'shash ≤ 30 s | PASS | 6.6 s |

## Ogohlantirish va izohlar

- Portlash: 3000 mehmon 10 s ichida; oxirgi javob oyna tugagach 6.6 s dan keyin keldi
