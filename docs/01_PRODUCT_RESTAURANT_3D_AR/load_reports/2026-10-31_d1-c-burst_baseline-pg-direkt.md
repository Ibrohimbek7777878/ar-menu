# Yuk testi hisoboti: d1-c-burst (baseline-pg-direkt)

**Natija: PASS** (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)

## Sharoit

| | |
|---|---|
| Sana | 2026-10-31T04:52:52.793Z |
| Manzil | http://127.0.0.1:8002 (lokal/ichki) |
| Stek (qo'lda yozilgan) | noutbuk 8 yadro/7.7GB (swap ishlatilgan), gunicorn 4x4, PostgreSQL 16 (Docker, 768MB), Caddy (Docker, gzip), generator shu mashinada (Caddy yo'q) |
| Commit | 5a640ec |
| Generator mashinasi | 8 yadro, 7.5 GB RAM, Node v24.19.0 |
| Yuklama (load avg) boshida → oxirida | 0.76 2.58 2.83 → 1.03 2.58 2.83 |
| Davomiylik | 10.1 s (reja 120 s), timeScale 1, seed 42 |
| Izoh | - |

> **Cheklov:** generator va server bir mashinada bo'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS'da (ROADMAP S2).

## Umumiy

So'rovlar: 1000 · 99.1 req/s · xato: 0 (0.000%) · qayta urinilgan GET: 1

Javob vaqti (ms): p50 27 · p95 166 · p99 223 · max 316

## Qadamlar

| Qadam | So'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| menu | 1000 | 99.1 | 0 | 27 | 166 | 223 | 316 | 200:1000 |

## SLO tekshiruvi

| Mezon | Natija | Qiymat |
|---|---|---|
| menu p95 ≤ 1000 ms | PASS | 166 ms |
| xato ulushi ≤ 1.00% | PASS | 0.000% (0/1000) |
| portlashdan keyin bo'shash ≤ 30 s | PASS | 0.1 s |

## Ogohlantirish va izohlar

- Portlash: 1000 mehmon 10 s ichida; oxirgi javob oyna tugagach 0.1 s dan keyin keldi
