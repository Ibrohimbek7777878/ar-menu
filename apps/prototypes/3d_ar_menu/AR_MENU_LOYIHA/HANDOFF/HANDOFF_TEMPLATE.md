# HANDOFF — FAZA XX: <nomi>

> **Cursor to'ldiradi** (A-qism) → **Arxitektor AI tekshiradi** (B-qism)
> Nusxa ol: `cp HANDOFF/HANDOFF_TEMPLATE.md HANDOFF/FAZA_XX_HANDOFF.md`

```
FAZA:        XX — <nomi>
VAZIFALAR:   V-XXX … V-XXX (N ta)
BOSHLANDI:   YYYY-MM-DD
TUGADI:      YYYY-MM-DD
BAJARUVCHI:  Cursor
HOLAT:       🟡 tekshiruvda | ✅ qabul qilindi | ❌ qayta ishlash kerak
```

---

# A-QISM — CURSOR TO'LDIRADI

## 1. ✅ BAJARILGAN VAZIFALAR

| Vazifa | Holat | Izoh |
|---|---|---|
| V-XXX | ✅ | |
| V-XXX | ✅ | |
| V-XXX | ⚠️ | qisman — sabab: ... |
| V-XXX | ⏭ | o'tkazib yuborildi — sabab: ... |

**Jami:** N/N bajarildi · M ta qisman · K ta o'tkazib yuborildi

---

## 2. 📁 FAYLLAR

### Yaratilgan
```
apps/menu/models.py                 (245 qator)
apps/menu/serializers.py            (89 qator)
apps/menu/views.py                  (156 qator)
static/guest/js/menu.js             (312 qator)
tests/test_menu.py                  (198 qator)
```

### O'zgartirilgan
```
config/settings/base.py     — INSTALLED_APPS ga apps.menu qo'shildi
core/cache.py               — bump_menu_version() qo'shildi
```

### Migratsiyalar
```
apps/menu/migrations/0001_initial.py
apps/menu/migrations/0002_gin_indexes.py
```

---

## 3. 🤔 QABUL QILINGAN QARORLAR

> TZ da aniq yozilmagan, lekin qaror kerak bo'lgan joylar.
> **Bularni yashirmang** — arxitektor tekshiradi.

| # | Masala | Qanday hal qilindi | Sabab |
|---|---|---|---|
| 1 | TZ da X aniq emas edi | Y variantini tanladim | Z sababli |
| 2 | | | |

---

## 4. ⚠️ MUAMMOLAR VA CHETLANISHLAR

> **ENG MUHIM BO'LIM.** Halol yoz. Bajarilmagan narsani "bajarildi" deb yozma.

### 4.1 Bajarilmagan / qisman bajarilgan
| Vazifa | Nima bajarilmadi | Sabab | Nima kerak |
|---|---|---|---|
| V-XXX | ... | API kaliti yo'q | `.env` ga MESHY_API_KEY |

### 4.2 TZ dan chetlanish
| Nima | TZ da | Amalda | Sabab |
|---|---|---|---|
| | | | |

### 4.3 Texnik qarz (keyin tuzatish kerak)
```
- apps/menu/views.py:145 — kesh invalidation qo'pol (butun kesh tozalanadi)
- static/guest/js/menu.js:88 — virtual scroll yo'q, 200+ taomda sekin
```

---

## 5. 🧪 TESTLAR

```bash
$ pytest tests/ -q
```

| | Soni |
|---|---|
| ✅ O'tdi | |
| ❌ Yiqildi | |
| ⏭ Skip | |
| **Qamrov** | %|

### Yiqilgan testlar (agar bor bo'lsa)
```
tests/test_menu.py::test_cache_invalidation — AssertionError: ...
Sabab: ...
```

### Majburiy testlar holati
| Test | Holat |
|---|---|
| `test_tenant_isolation.py` | ✅ / ❌ |
| `test_i18n_completeness.py` | ✅ / ❌ / ⏭ (hali yo'q) |
| `test_order_state.py` | ✅ / ❌ / ⏭ |
| `test_price_calculation.py` | ✅ / ❌ / ⏭ |
| `test_payment_idempotency.py` | ✅ / ❌ / ⏭ |

---

## 6. ✅ FAZA QABUL CHECKLISTI

> Faza faylining oxiridagi checklistni shu yerga ko'chirib, belgilang.

```
[ ] python manage.py check          → xato yo'q
[ ] python manage.py migrate        → o'tadi
[ ] pytest tests/ -q                → o'tadi
[ ] ...
```

---

## 7. 🔧 QO'LDA SINOV

> Faza faylida "qo'lda sinov" bo'limi bo'lsa — natijasini yoz.

| Sinov | Natija |
|---|---|
| QR telefonda skanerlandi | ✅ menyu ochildi |
| AR modeli real o'lchamda | ⚠️ 2 sm katta chiqdi |

---

## 8. ➡️ KEYINGI FAZAGA ESLATMA

```
- FAZA XX+1 boshlashdan oldin: ...
- Diqqat: ...
- Bog'liqlik: ...
```

---

## 9. 📊 STATISTIKA

| | |
|---|---|
| Sarflangan vaqt | ~N soat |
| Commit soni | N |
| Yozilgan kod | ~N qator |
| Test qamrovi | N% |

---
---

# B-QISM — ARXITEKTOR AI TO'LDIRADI

> ⛔ **Cursor bu qismga TEGMAYDI.**

## 10. 🔍 TEKSHIRUV NATIJASI

```
TEKSHIRILDI:  YYYY-MM-DD
TEKSHIRUVCHI: Arxitektor AI
QAROR:        ✅ QABUL | ⚠️ SHARTLI QABUL | ❌ QAYTA ISHLASH
```

### 10.1 Avtomatik tekshiruv
```bash
$ bash ROADMAP/03_HOLAT/tekshir_kod.sh
```
| Tekshiruv | Natija |
|---|---|
| Placeholder (TODO/FIXME) | |
| Tenant izolyatsiya | |
| Hard-code rang | |
| Hard-code matn | |
| N+1 query | |
| Testlar | |

### 10.2 Kod ko'rigi (qo'lda)
| Fayl | Muammo | Jiddiylik |
|---|---|---|
| | | 🔴 kritik / 🟠 muhim / 🟡 kichik |

### 10.3 Arxitektura muvofiqligi
| Talab | Bajarildimi |
|---|---|
| Multi-tenant izolyatsiya | |
| Idempotency | |
| Circuit breaker | |
| WS restoran-scoped | |
| Worker (uzoq ish) | |
| 3 til | |
| Dark/Light | |

---

## 11. 🔴 TUZATISH KERAK (blokerlar)

> Bular tuzatilmasa keyingi fazaga o'tilmaydi.

| # | Nima | Qayerda | Qanday tuzatish |
|---|---|---|---|
| 1 | | | |

---

## 12. 🟡 TAVSIYALAR (bloklamaydi)

| # | Nima | Nima uchun |
|---|---|---|
| 1 | | |

---

## 13. 📝 ARXITEKTOR IZOHI

```
(Umumiy baho, xavflar, keyingi fazaga strategik eslatma)
```

---

## 14. ✅ YAKUNIY QAROR

```
[ ] ✅ QABUL QILINDI — FAZA XX+1 ga o'tish mumkin
[ ] ⚠️ SHARTLI QABUL — quyidagilar keyingi fazada tuzatiladi: ...
[ ] ❌ QAYTA ISHLASH — 11-bo'limdagi blokerlar tuzatilsin
```

**Imzo:** Arxitektor AI · YYYY-MM-DD
