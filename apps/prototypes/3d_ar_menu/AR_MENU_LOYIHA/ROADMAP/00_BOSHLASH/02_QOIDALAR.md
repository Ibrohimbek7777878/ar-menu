# QOIDALAR — QANDAY KOD YOZILADI

> Bu faylni **bir marta** o'qi va butun loyiha davomida shu qoidalarga amal qil.

---

## 1. ⛔ 10 TA BUZILMAS QOIDA

| # | Qoida | Nima uchun |
|---|---|---|
| 1 | **`mebelcity_platform` ga tegma** | Alohida loyiha |
| 2 | **Vazifa tartibini buzma** (V-042 → V-043) | Bog'liqlik |
| 3 | **Test o'tmasa davom etma** | Sifat |
| 4 | **Har tenant modeli `restaurant_id` bilan filtrlanadi** | Xavfsizlik #1 |
| 5 | **Narx faqat serverda hisoblanadi** | Frontendga ishonilmaydi |
| 6 | **Miqdor butun son** — `Math.ceil()` | Biznes qoidasi |
| 7 | **Uzoq ish (>2s) → worker navbat** | Web bloklanmaydi |
| 8 | **Har UI 3 tilda + dark/light** | Talab |
| 9 | **Har yozuv operatsiyasi idempotent** | Retry xavfsiz |
| 10 | **Tashqi API → circuit breaker + fallback** | Chidamlilik |

---

## 2. 🔒 MULTI-TENANT (eng muhim)

### ✅ TO'G'RI
```python
# View'da mixin ishlatiladi
class DishViewSet(TenantScopedMixin, ModelViewSet):
    queryset = Dish.objects.all()      # mixin avtomatik filtrlaydi

# Yoki qo'lda — DOIM restaurant_id bilan
dish = Dish.objects.get(pk=pk, restaurant_id=request.restaurant_id)
```

### ❌ NOTO'G'RI
```python
dish = Dish.objects.get(pk=pk)         # ⛔ boshqa restoranniki bo'lishi mumkin!
dishes = Dish.objects.all()            # ⛔ hamma restoran taomlari!
```

### Har yangi model uchun
```python
class YangiModel(TenantModel):          # TenantModel = restaurant FK bor
    ...
```
Va `tests/test_tenant_isolation.py` ga qo'shiladi.

---

## 3. 🗄 DATABASE QOIDALARI

### N+1 query oldini olish
```python
# ❌ NOTO'G'RI — har buyurtma uchun alohida so'rov
for order in Order.objects.all():
    print(order.table.number)

# ✅ TO'G'RI
for order in Order.objects.select_related('table', 'guest'):
    print(order.table.number)

# ✅ M2M / teskari FK uchun
Order.objects.prefetch_related('items__dish')
```

### Katta ma'lumot
```python
# ❌ list(qs) — xotiraga hammasi
# ✅ qs.iterator(chunk_size=500)
```

### Transaksiya
```python
with transaction.atomic():
    order = Order.objects.create(...)
    OrderItem.objects.bulk_create(items)     # bitta so'rov

# Post-commit hook — transaksiya MUVAFFAQIYATLI bo'lgandan keyin
transaction.on_commit(lambda: send_ws_notification(order))
```

### Indeks
Har `filter()` da ishlatiladigan maydonga indeks:
```python
class Meta:
    indexes = [
        models.Index(fields=['restaurant', 'status', '-created_at']),
    ]
```

---

## 4. 🌐 API QOIDALARI

### Javob formati
```python
# Muvaffaqiyat
return Response({'id': 1, 'name': '...'}, status=200)

# Xato — DOIM 3 tilda
raise DishUnavailable(dish)     # core/exceptions.py handler formatlaydi
```

### Idempotency (POST/PUT)
```python
idem_key = request.headers.get('X-Idempotency-Key')
existing = check_idempotency(idem_key)
if existing:
    return Response(existing)        # dublikat yaratilmaydi
```

### Validatsiya tartibi (qat'iy)
```
1. Idempotency
2. Tenant tekshiruvi (restaurant_id)
3. Obyekt mavjudligi
4. Biznes qoidalari (stop-list, limit)
5. ⚡ Narx serverda qayta hisoblanadi
6. Transaksiya
7. Post-commit hooks (WS, navbat)
```

---

## 5. ⚡ REAL-TIME (WebSocket)

### Guruh nomlari — DOIM restoran-scoped
```python
ws_send(f'rest_{restaurant_id}_kds',     'order.new', data)
ws_send(f'rest_{restaurant_id}_waiters', 'order.new', data)
ws_send(f'guest_{session_id}',           'order.created', data)

# ❌ HECH QACHON global guruh: ws_send('all_orders', ...)
```

### Xabar formati
```python
{'type': 'order.new', 'ts': '...', 'data': {...}, 'seq': 1047}
```

### Mijozga WS qachon
```
❌ Menyu ko'rayotganda — KERAK EMAS
✅ Buyurtma bergandan KEYIN — kerak
```

---

## 6. 🎨 FRONTEND QOIDALARI

### Tarjima
```javascript
// ❌ NOTO'G'RI
btn.textContent = "Savatga qo'shish";

// ✅ TO'G'RI
btn.textContent = t('dish.add_to_cart');
// yoki HTML'da: <button data-i18n="dish.add_to_cart"></button>
```

### Tema
```css
/* ❌ NOTO'G'RI */
.card { background: #fff; color: #000; }

/* ✅ TO'G'RI */
.card { background: var(--bg-card); color: var(--text); }
```

### Miqdor
```javascript
// ✅ DOIM
const qty = Math.max(1, Math.min(99, Math.ceil(rawQty)));
```

### Statik fayl versiyasi
```html
<script src="/static/guest/js/menu.js?v=12"></script>
```

---

## 7. 🧪 TEST QOIDALARI

### Har vazifadan keyin
```bash
pytest tests/ -x -q          # -x = birinchi xatoda to'xtaydi
```

### Har yangi model uchun majburiy test
```python
def test_<model>_tenant_isolation(api_client, restaurant, restaurant2, token):
    obj = <Model>Factory(restaurant=restaurant2)
    r = api_client.get(f'/v1/admin/<endpoint>/{obj.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {token}')
    assert r.status_code in (403, 404)      # 200 BO'LMASLIGI SHART
```

### Qamrov
```
Umumiy ≥ 75%
orders, payments, tenants ≥ 90%
```

---

## 8. 📁 FAYL VA NOM QOIDALARI

| Nima | Uslub | Namuna |
|---|---|---|
| Python fayl | snake_case | `order_service.py` |
| Django app | lowercase | `apps/ar3d/` |
| Model | PascalCase | `DishModel3D` |
| Funksiya | snake_case | `create_order()` |
| Konstanta | UPPER_SNAKE | `MAX_GLB_SIZE` |
| JS fayl | kebab-case | `ar-detect.js` |
| CSS klass | kebab-case | `.dish-card` |
| i18n kalit | dot.case | `dish.add_to_cart` |
| API endpoint | kebab-case | `/v1/admin/qr-pdf/` |
| WS xabar | dot.case | `order.new` |

---

## 9. 💬 COMMIT QOIDALARI

```bash
git commit -m "V-043: menyu API Redis keshi qo'shildi"
git commit -m "V-115: DishLibrary modeli + pgvector indeks"
git commit -m "fix V-098: idempotency key tekshiruvi tuzatildi"
```

Format: `V-XXX: <qisqa tavsif>` yoki `fix V-XXX: <nima tuzatildi>`

---

## 10. 🚨 XATO QAYTA ISHLASH

### Har tashqi chaqiruv
```python
from core.resilience import CircuitBreaker

breaker = CircuitBreaker('ofd', fail_threshold=3, timeout=120)

result = breaker.call(
    ofd_api.send, receipt,
    fallback=lambda: enqueue('fiscal', receipt.id, delay=300)
)
```

### Log darajalari
```python
log.debug()    # ishlab chiqishda
log.info()     # muhim hodisa (buyurtma yaratildi)
log.warning()  # muammo, lekin ishlaydi (provayder yiqildi, fallback)
log.error()    # xato, aralashuv kerak
log.exception()# xato + stack trace
```

---

## 11. ⚡ TOKEN TEJASH (AI uchun)

Bu loyihada ishlayotgan AI uchun:

| Qoida | Nima uchun |
|---|---|
| `TZ_MASTER/` ni **to'liq o'qima** | 260 KB = ~70k token behuda |
| Faqat faza faylini o'qi | ~15 KB = ~4k token |
| Ma'lumotnomadan **faqat kerakli §** ni | `sed -n '120,180p' fayl.md` |
| Kod yozishdan oldin mavjud faylni o'qi | Takrorlamaslik uchun |
| `grep` bilan qidir, butun fayl o'qima | Tez va arzon |
| Bir vazifa = bir commit | Kontekst toza qoladi |

**Namuna — to'g'ri qidirish:**
```bash
# ❌ cat TZ_MASTER/04_DATA_MODEL_VA_API.md          (36 KB)
# ✅ grep -A 40 "class Order" TZ_MASTER/04_DATA_MODEL_VA_API.md   (2 KB)
```

---

## 12. ✅ "TUGALLANGAN" TA'RIFI

Vazifa faqat quyidagilar bajarilgandagina tugallangan:

```
[ ] Kod yozilgan va ishlaydi
[ ] Test yozilgan va o'tadi
[ ] Tenant izolyatsiyasi tekshirilgan (tenant modeli bo'lsa)
[ ] 3 til (UI bo'lsa)
[ ] Dark + Light (UI bo'lsa)
[ ] Xato holatlari qayta ishlangan
[ ] PROGRESS.md yangilangan
[ ] Commit qilingan
```

---

**➡️ Keyingi:** `03_MUHIT_TAYYORLASH.md`
