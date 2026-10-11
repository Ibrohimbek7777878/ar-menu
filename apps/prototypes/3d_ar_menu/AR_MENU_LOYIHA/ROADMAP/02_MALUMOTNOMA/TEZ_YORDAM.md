# ⚡ TEZ YORDAM — eng kerakli kod namunalari

> Bu faylni ochiq tut. Har vazifada takrorlanadigan naqshlar shu yerda.
> Boshqa faylga qarash shart emas.

---

## 1. YANGI MODEL YARATISH

```python
# apps/<app>/models.py
from django.db import models
from core.models import TenantModel        # ⚡ restaurant FK bor

class Yangi(TenantModel):
    name_uz = models.CharField(max_length=200)
    name_ru = models.CharField(max_length=200, blank=True)
    name_en = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        indexes = [models.Index(fields=['restaurant', 'is_active'])]

    def __str__(self):
        return f'{self.name_uz} ({self.restaurant_id})'
```

```bash
python manage.py makemigrations <app> && python manage.py migrate
```

---

## 2. YANGI VIEWSET (tenant-scoped)

```python
# apps/<app>/views.py
from rest_framework.viewsets import ModelViewSet
from core.mixins import TenantScopedMixin
from core.permissions import IsRestAdmin

class YangiViewSet(TenantScopedMixin, ModelViewSet):     # ⚡ mixin SHART
    queryset = Yangi.objects.all()
    serializer_class = YangiSerializer
    permission_classes = [IsRestAdmin]
```

```python
# apps/<app>/urls.py
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register('yangi', YangiViewSet, basename='yangi')
urlpatterns = router.urls
```

```python
# config/urls.py ga qo'shish
path('v1/admin/', include('apps.<app>.urls')),
```

---

## 3. TENANT IZOLYATSIYA TESTI (har model uchun MAJBURIY)

```python
# tests/test_tenant_isolation.py ga qo'shiladi
@pytest.mark.django_db
def test_yangi_tenant_isolation(api_client, restaurant, restaurant2, admin_token):
    obj = Yangi.objects.create(restaurant=restaurant2, name_uz='B ning obyekti')
    r = api_client.get(f'/v1/admin/yangi/{obj.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code in (403, 404)      # ⛔ 200 BO'LMASLIGI SHART
```

---

## 4. 3 TILLI MATN

```python
# Backend
from core.i18n import t
name = t(dish, 'name', lang)        # dish.name_ru → bo'sh bo'lsa name_uz
```

```javascript
// Frontend
btn.textContent = t('dish.add_to_cart');
// yoki HTML: <button data-i18n="dish.add_to_cart"></button>
```

```json
// static/i18n/uz.json, ru.json, en.json — 3 tasida ham bir xil kalit
{"dish": {"add_to_cart": "Savatga qo'shish"}}
```

---

## 5. DARK + LIGHT TEMA

```css
/* ❌ hard-code YO'Q */
.card { background: #fff; }

/* ✅ o'zgaruvchi */
.card {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
}
```

Mavjud o'zgaruvchilar: `--bg --bg-soft --bg-card --border --text --text-soft
--text-muted --brand --success --warning --danger --info`

---

## 6. WEBSOCKET XABAR YUBORISH

```python
from core.ws import ws_send, g_kds, g_waiters, g_admin, g_guest

ws_send(g_kds(order.restaurant_id),     'order.new', serialize(order))
ws_send(g_waiters(order.restaurant_id), 'order.new', {'table': 5, 'id': order.id})
ws_send(g_guest(session_id),            'order.created', {'id': order.id})
```

```javascript
// Klient
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.type === 'order.new') { /* ... */ }
};
```

---

## 7. NAVBATGA QO'YISH (uzoq ish)

```python
from core.queue import enqueue

# Web so'rovda — DARHOL qaytadi
enqueue('model3d', 'generate', dish_id=15, images=[url])
enqueue('fiscal',  'send_receipt', order_id=42, delay=0)
enqueue('notify',  'telegram', chat_id=..., text=..., delay=5)
```

Navbatlar: `model3d`, `fiscal`, `notify`, `ai`, `analytics`

---

## 8. TASHQI API (circuit breaker bilan)

```python
from core.resilience import CircuitBreaker

breaker = CircuitBreaker('ofd', fail_threshold=3, timeout=120)

result = breaker.call(
    ofd_api.send, receipt,
    fallback=lambda: enqueue('fiscal', 'retry', receipt_id=receipt.id, delay=300)
)
```

---

## 9. KESH

```python
from django.core.cache import cache
from core.cache import bump_menu_version

# O'qish
data = cache.get(key)
if data is None:
    data = expensive_query()
    cache.set(key, data, 60)

# Menyu o'zgarganda — kesh eskiradi
bump_menu_version(restaurant_id)
```

---

## 10. TRANZAKSIYA + POST-COMMIT

```python
from django.db import transaction

with transaction.atomic():
    order = Order.objects.create(...)
    OrderItem.objects.bulk_create(items)

# ⚡ Transaksiya MUVAFFAQIYATLI bo'lgandan keyin
transaction.on_commit(lambda: ws_send(...))
transaction.on_commit(lambda: enqueue('notify', ...))
```

---

## 11. IDEMPOTENCY

```python
from core.idempotency import check_idempotency, save_idempotency

idem_key = request.headers.get('X-Idempotency-Key')
existing = check_idempotency(idem_key)
if existing:
    return Response(existing)          # dublikat yaratilmaydi

# ... yaratish ...
save_idempotency(idem_key, result)
```

---

## 12. XATO CHIQARISH

```python
from core.exceptions import DishUnavailable, PlanLimit, TenantMismatch

if not dish.is_available:
    raise DishUnavailable({'dish_id': dish.id, 'dish_name': dish.name_uz})
```

Javob avtomatik 3 tilda formatlanadi.

---

## 13. AI CHAQIRUV

```python
from apps.ai.mcp import mcp, MCPRequest

resp = mcp.run(MCPRequest(
    task='chat',                    # chat|translate|vision|image_to_3d
    system=SYSTEM_PROMPT,
    prompt=question,
    max_tokens=350,
), restaurant_id=rid)

if resp.ok:
    answer = resp.content
else:
    answer = t('chat.error')        # fallback
```

---

## 14. MIQDOR (butun son)

```javascript
const qty = Math.max(1, Math.min(99, Math.ceil(rawQty)));
```

```python
qty = max(1, min(99, math.ceil(raw_qty)))
```

---

## 15. NARX HISOBI (⚡ faqat serverda)

```python
# ❌ NOTO'G'RI — frontenddan kelgan summa
total = request.data['total']

# ✅ TO'G'RI — serverda qayta hisoblanadi
subtotal = sum((d.price + mod_sum) * qty for ...)
service_fee = subtotal * restaurant.service_fee_pct / 100
total = subtotal + service_fee
```

---

## 16. FOYDALI BUYRUQLAR

```bash
# Ishga tushirish
make run                    # web  :8060
make ws                     # ws   :8061
make worker Q=model3d       # worker

# Test
make test                   # tez
make test-cov               # qamrov bilan
pytest tests/test_orders.py -v -k "idempotency"

# Kod
make fmt                    # formatlash
make lint                   # tekshirish

# DB
make migrate
python manage.py shell
python manage.py dbshell

# Progress
python3 ROADMAP/03_HOLAT/update_progress.py V-043 ok
python3 ROADMAP/03_HOLAT/update_progress.py --status
```

---

## 17. QIDIRUV (token tejash)

```bash
# ❌ butun fayl (36 KB)
cat "TZ_MASTER/04_DATA_MODEL_VA_API.md"

# ✅ faqat kerakli qism (2 KB)
grep -A 45 "class Order" "TZ_MASTER/04_DATA_MODEL_VA_API.md"
grep -A 30 "ALLOWED = {" "TZ_MASTER/04_DATA_MODEL_VA_API.md"
sed -n '340,400p' "TZ_MASTER/04_DATA_MODEL_VA_API.md"

# Indeksdan topish
grep -i "order" ROADMAP/02_MALUMOTNOMA/INDEKS.md
```

---

## 18. TIPIK XATOLAR VA YECHIM

| Xato | Sabab | Yechim |
|---|---|---|
| `Restoran aniqlanmadi` | `TenantMiddleware` restaurant topmadi | URL `/m/<slug>/` yoki JWT tekshir |
| `RelatedObjectDoesNotExist` | `select_related` yo'q | `.select_related('table')` qo'sh |
| WS xabar kelmayapti | Guruh nomi noto'g'ri | `rest_<id>_kds` formatini tekshir |
| Kesh eskirmayapti | `bump_menu_version()` chaqirilmagan | Signal qo'sh |
| Test `200` qaytdi | `TenantScopedMixin` yo'q | Mixin qo'sh |
| GLB > 3 MB | Optimizatsiya yetarli emas | `--ratio 0.3` bilan qayta |
| AR o'lchami noto'g'ri | `ar-scale` yoki masshtab | `ar-scale="fixed"` + metrda |
| Migratsiya konflikt | Parallel branch | `makemigrations --merge` |
