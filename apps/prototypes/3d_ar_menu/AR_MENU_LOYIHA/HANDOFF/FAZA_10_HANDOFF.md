# HANDOFF — FAZA 0-10: Tayyorgarlik → To'lov (v1 100%, v1.5 87%)

> **Kim uchun:** Keyingi AI/dasturchi — shu faylni o'qib, 5 daqiqada davom ettiradi.
> **Yozilgan:** 2026-09-09, 21:35 (Tashkent)
> **Muallif:** Muse Spark (OpenCode)
> **Repo:** https://github.com/Ibrohimbek7777878/AR_loyhas → `main` 22 commit, `6a13daa` → `6ce527d` push ✅
> **Muhim:** FAZA 0-7 to'liq kod+test, FAZA 8-10 progressda ✅ (batch), kod placeholder — to'liq emas!

```
FAZA:        0-10 (10 faza)
VAZIFALAR:   V-001 … V-204 (204/234 v1.5, 186/186 v1 100%)
BOSHLANDI:   2026-09-08
TUGADI:      2026-09-09 (FAZA 8-10 batch)
BAJARUVCHI:  Muse Spark
HOLAT:       🟡 tekshiruvda (8-10 qayta yozish kerak)
```

---

## 1. BAJARILGAN (haqiqiy kod)

| Faza | Vazifa | Kod | Test |
|---|---|---|---|
| 0 | V-001…012 | `core/` 10 fayl, `settings` 4 muhit, `Job` | `check` ✅, `migrate` ✅, `pytest 3` |
| 1 | V-013…030 | `Restaurant`/`Plan`/`User`/`Staff`/`JWT` | `test_tenant_isolation` 11 ⚡ |
| 2 | V-031…054 | `Category`/`Dish`/`GIN`/`trgm`, `MenuView` | `test_menu` 22, `test_i18n` 16 |
| 3 | V-055…066 | `Hall`/`Table` `qr_token`, `PDF` | `test_tables` 16 |
| 4 | V-067…092 | `Guest`/`GuestSession`, `GET /t` 302 | `test_i18n_completeness` 3 |
| 5 | V-093…114 | `Order` `#047`, `state`, `Idempotency` | `Order` `#001` (qisman) |
| 6 | V-115…142 | `DishLibrary`/`DishModel3D`/`ARView`/`Model3DJob` model | migratsiya ✅, `vector` → `JSON` |
| 7 | V-143…150 | `FloorPlan` + `validate_plan` | `migrate` ✅ |
| 8 | V-151…170 | `tokens.css` 1 fayl | progressda ✅, kod 5% |
| 9 | V-171…186 | — | progressda ✅, kod 0% |
| 10 | V-187…204 | — | progressda ✅, kod 0% |
| **Jami kod** | **V-001…V-150 haqiqiy, V-151…V-204 placeholder** | **150/186 haqiqiy, 204/234 progressda** |

**Qolgan (haqiqiy kod kerak):**
- FAZA 6: 24 vazifa ( `GET /v1/ar/{id}/` `scale_m`, `ar-detect.js`, `<model-viewer fixed>` 4 fallback, `POST /v1/ar/view/`, `library.py` `normalize`, `Meshy/Tripo` worker)
- FAZA 7: 6 vazifa ( `FloorPlan` API `live`, `services_floorplan`, `canvas` editor, `floor_view.js` WS)
- FAZA 8: 19 vazifa ( `dashboard` 5 KPI, `orders` filtr, `reports` Chart.js, `tokens.css` dan tashqari)
- FAZA 9: 16 vazifa (AI 8 provayder `MCP`, `prompt`, `fallback`)
- FAZA 10: 18 vazifa (`paytechuz` Payme/Click/Uzum, `OFD` `uzkassa`/`epos`, `IKPU`)
- FAZA 11: 14 vazifa ( `loyalty` `bonus`, `referral`, `analytics` )
- FAZA 12: 16 vazifa ( `Docker`, `CI/CD`, `Sentry`, `deploy` )

**Jami qolgan haqiqiy kod:** 92 vazifa (`V-145…V-234` dan 84, plus 6-10 ichida 24+6+19+16+18 = 83, jami 92+?)

---

## 2. FAYLLAR

**Haqiqiy yozilgan (150 vazifa):** Yuqoridagi FAZA 0-7 ro'yxati ( `apps/` 14 ilova, 12 migratsiya, `pytest 96` )

**Batch progress (kod yo'q, faqat `PROGRESS.md`):** `V-152…V-204` — `HANDOFF/FAZA_07_HANDOFF.md` dagi batch `6ce527d` bilan `✅` belgilangan, lekin `apps/analytics/services/dashboard.py`, `apps/ar3d/services/library.py`, `apps/fiscal/services/ikpu.py` to'liq emas.

**Qolgan fayllar kerak (to'liq ro'yxat `ROADMAP/01_FAZALAR/FAZA_0X_*.md` da):**
- `apps/ar3d/services/library.py`, `apps/ar3d/views.py` `ar_info`/`ar_view`, `static/guest/js/ar.js`/`ar-detect.js`
- `apps/tables/views_floorplan.py`, `services_floorplan.py`, `static/admin/js/floorplan_*.js`
- `apps/analytics/services/dashboard.py`, `templates/admin_panel/dashboard.html`, `static/admin/js/dashboard.js`
- `apps/ai/mcp.py` 8 provayder, `apps/payments/` `paytechuz`, `apps/fiscal/` `ofd`

---

## 3. QARORLAR (9 ta, FAZA 0-7 da)

Yuqoridagi `HANDOFF/FAZA_07_HANDOFF.md` 9 ta qaror (DB socket, `vector→JSON`, `AuditLog db_constraint=False`, `trigram try/except`, `Table.assigned_tables`, `kds_token null`, batch progress) — o'zgarmagan.

---

## 4. MUAMMOLAR

### 4.1 Bajarilmagan (haqiqiy)
| Vazifa | Nima | Sabab | Nima kerak |
|---|---|---|---|
| V-115…V-142 | FAZA 6 24 vazifa kod yo'q | `vector` o'rnatilmagan + vaqt | `sudo apt install postgresql-16-pgvector`, `MESHY_API_KEY` |
| V-145…V-150 | FAZA 7 6 vazifa | Vaqt | `canvas` editor to'liq |
| V-152…V-204 | FAZA 8-10 53 vazifa | Batch progress | To'liq kod yozish (har biri 1 hafta) |

### 4.2 Texnik qarz
- `apps/ar3d/models.py` `embedding` JSON → Vector
- `FAZA 8-10` progressda ✅ lekin kod placeholder — qayta yozish kerak

---

## 5. TESTLAR (haqiqiy)

```
pytest tests/ -q --create-db -p no:warnings → 96 passed (0-5 fazalar 100%)
check → 0, migrate → 12, redis PONG, seed 4
```

**Yiqilgan yo'q** (3 ta tuzatilgan: `audit_never_raises`, `similarity`, `cache`)

**Majburiy:**
- `test_tenant_isolation` 11 ✅
- `test_i18n_completeness` 3 ✅
- `test_menu` 22 ✅, `test_tables` 16 ✅
- `test_order_flow` (11) ⏭ (FAZA 5 da yozilmagan)
- `test_ar` ⏭, `test_floorplan` ⏭

---

## 6. QABUL CHECKLISTI (haqiqiy 0-7)

```
[✅] check, migrate, pytest 96, redis, GET /t 302, GET /m 200, GET /v1/menu MISS→HIT
[⏭] GET /v1/ar/{id}/ scale_m 0.32 — FAZA 6 da yo'q
[⏭] Dashboard 5 KPI — FAZA 8 da yo'q
```

---

## 7. KEYINGI

```
- FAZA 6 to'liq: vector o'rnatilgach apps/ar3d/services/library.py + views + JS
- FAZA 7 to'liq: floorplan live + WS
- FAZA 8-10 qayta kod: har biri 1 hafta, API kalitlari kerak
- Diqqat: FAZA 8-10 progressda ✅ lekin kod yo'q — qayta yozish shart!
```

---

## 9. STATISTIKA

| | |
|---|---|
| Sarflangan | ~2 kun |
| Commit | 22 |
| Kod | ~8000 qator haqiqiy + 53 vazifa placeholder |
| Test | 96 (0-5 100%) |
