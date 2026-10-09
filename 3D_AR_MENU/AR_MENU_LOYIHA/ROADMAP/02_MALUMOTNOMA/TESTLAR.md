# 🧪 TEST STRATEGIYASI

> Testlar **kod bilan birga** yoziladi, oxirida emas.
> Har vazifa tugaganda test o'tishi shart.

---

## 1. TEST PIRAMIDASI

```
           ▲
          ╱ ╲         E2E (5%)  — to'liq oqim, sekin
         ╱───╲                     QR→menyu→AR→buyurtma→to'lov
        ╱     ╲
       ╱───────╲      Integratsiya (25%) — API + DB + WS
      ╱         ╲                          endpoint, consumer
     ╱───────────╲
    ╱             ╲   Unit (70%) — funksiya, servis, model
   ╱───────────────╲                narx hisobi, holat mashinasi
```

---

## 2. TEST TURLARI VA QACHON

| Tur | Qachon yoziladi | Fayl | Tezlik |
|---|---|---|---|
| **Unit** | Har servis/funksiya bilan | `tests/unit/` | ~1ms |
| **Integratsiya** | Har endpoint bilan | `tests/api/` | ~50ms |
| **WS** | Har consumer bilan | `tests/ws/` | ~100ms |
| **E2E** | Faza oxirida | `tests/e2e/` | ~2s |
| **Yuklama** | Reliz oldidan | `tests/load/` | daqiqalar |

---

## 3. ⛔ 5 TA MAJBURIY TEST (deploy bloklaydi)

CI'da bu testlar o'tmasa **deploy to'xtatiladi**:

### 3.1 Tenant izolyatsiya
**Fayl:** `tests/test_tenant_isolation.py`

```python
import pytest
from django.apps import apps

# Barcha tenant modellari avtomatik topiladi
TENANT_MODELS = [
    m for m in apps.get_models()
    if any(f.name == 'restaurant' for f in m._meta.fields)
]

@pytest.mark.django_db
@pytest.mark.parametrize('model', TENANT_MODELS, ids=lambda m: m.__name__)
def test_model_has_restaurant_fk(model):
    """Har tenant modelida restaurant FK bo'lishi shart"""
    assert any(f.name == 'restaurant' for f in model._meta.fields)


@pytest.mark.django_db
def test_cross_tenant_dish_forbidden(api_client, restaurant, restaurant2, admin_token):
    from apps.menu.models import Dish, Category
    cat = Category.objects.create(restaurant=restaurant2, name_uz='B')
    dish = Dish.objects.create(category=cat, restaurant=restaurant2,
                               name_uz='B taomi', price=1000)
    r = api_client.get(f'/v1/admin/dishes/{dish.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code in (403, 404), "⛔ Cross-tenant kirish ochiq!"


@pytest.mark.django_db
def test_cross_tenant_order_forbidden(api_client, restaurant, restaurant2, staff_token):
    ...  # xuddi shunday Order uchun


@pytest.mark.django_db
def test_qr_token_scoped(api_client, restaurant, restaurant2):
    """Boshqa restoran QR tokeni bilan kirilsa — o'sha restoran menyusi"""
    ...
```

### 3.2 Tarjima to'liqligi
**Fayl:** `tests/test_i18n_completeness.py`

```python
import json, pathlib, re

BASE = pathlib.Path('static/i18n')
LANGS = ['uz', 'ru', 'en']

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict): out.update(flatten(v, key))
        else: out[key] = v
    return out

def load(lang):
    return flatten(json.load(open(BASE / f'{lang}.json', encoding='utf-8')))

def test_all_langs_same_keys():
    base = load('uz')
    for lang in LANGS[1:]:
        other = load(lang)
        missing = set(base) - set(other)
        extra   = set(other) - set(base)
        assert not missing, f"{lang} da yo'q: {sorted(missing)[:10]}"
        assert not extra,   f"{lang} da ortiqcha: {sorted(extra)[:10]}"

def test_no_empty_values():
    for lang in LANGS:
        empty = [k for k, v in load(lang).items() if not str(v).strip()]
        assert not empty, f"{lang} bo'sh: {empty[:10]}"

def test_placeholders_match():
    """{n}, {amount} — 3 tilda bir xil bo'lishi kerak"""
    base = load('uz')
    for lang in LANGS[1:]:
        other = load(lang)
        for k, v in base.items():
            p1 = set(re.findall(r'\{(\w+)\}', str(v)))
            p2 = set(re.findall(r'\{(\w+)\}', str(other.get(k, ''))))
            assert p1 == p2, f"{k}: uz={p1} {lang}={p2}"
```

### 3.3 Buyurtma holat mashinasi
**Fayl:** `tests/test_order_state.py`

```python
import pytest
from apps.orders.state import transition, ALLOWED
from core.exceptions import InvalidTransition

@pytest.mark.django_db
def test_valid_flow(order):
    for st in ['accepted', 'cooking', 'ready', 'served', 'paid']:
        transition(order, st)
        assert order.status == st

@pytest.mark.django_db
def test_invalid_transition_rejected(order):
    with pytest.raises(InvalidTransition):
        transition(order, 'paid')          # new → paid MUMKIN EMAS

@pytest.mark.django_db
def test_paid_is_terminal(order):
    for st in ['accepted','cooking','ready','served','paid']:
        transition(order, st)
    with pytest.raises(InvalidTransition):
        transition(order, 'cancelled')

@pytest.mark.django_db
def test_timestamps_recorded(order):
    transition(order, 'accepted')
    assert order.accepted_at is not None
```

### 3.4 Narx hisobi (serverda)
**Fayl:** `tests/test_price_calculation.py`

```python
@pytest.mark.django_db
def test_price_from_server_not_client(api_client, guest_session, dish):
    """Frontenddan yuborilgan narx E'TIBORGA OLINMAYDI"""
    dish.price = 50000; dish.save()
    r = api_client.post('/v1/orders/', {
        'session_id': guest_session.id, 'table_id': guest_session.table_id,
        'items': [{'dish_id': dish.id, 'qty': 2, 'price': 1}],   # ⚡ soxta narx
    }, format='json', HTTP_X_IDEMPOTENCY_KEY='k1')
    assert r.status_code == 201
    assert r.data['subtotal'] == 100000       # 50000 × 2, soxta narx emas

@pytest.mark.django_db
def test_qty_is_integer(api_client, guest_session, dish):
    r = api_client.post('/v1/orders/', {..., 'items': [{'dish_id': dish.id, 'qty': 2.7}]},
                        format='json', HTTP_X_IDEMPOTENCY_KEY='k2')
    assert r.data['items'][0]['qty'] == 3     # Math.ceil

@pytest.mark.django_db
def test_service_fee_applied(api_client, guest_session, dish, restaurant):
    restaurant.service_fee_pct = 10; restaurant.save()
    ...
    assert r.data['service_fee'] == r.data['subtotal'] * 0.10
```

### 3.5 To'lov idempotentligi
**Fayl:** `tests/test_payment_idempotency.py`

```python
@pytest.mark.django_db
def test_duplicate_order_not_created(api_client, guest_session, dish):
    payload = {...}
    r1 = api_client.post('/v1/orders/', payload, format='json',
                         HTTP_X_IDEMPOTENCY_KEY='same-key')
    r2 = api_client.post('/v1/orders/', payload, format='json',
                         HTTP_X_IDEMPOTENCY_KEY='same-key')
    assert r1.data['id'] == r2.data['id']
    assert Order.objects.count() == 1

@pytest.mark.django_db
def test_webhook_processed_once(api_client, payment):
    for _ in range(3):
        api_client.post('/v1/payments/webhook/payme/', webhook_payload, format='json')
    payment.refresh_from_db()
    assert payment.status == 'paid'
    assert Payment.objects.filter(order=payment.order, status='paid').count() == 1
```

---

## 4. FAZA BO'YICHA TEST TALABLARI

| Faza | Majburiy testlar | Qamrov |
|---|---|---|
| 0 | resilience, exceptions | 60% |
| 1 | ⛔ **tenant izolyatsiya**, auth, JWT, PIN blok | 90% |
| 2 | menyu API, kesh, 3 til, filtr, ⛔ i18n to'liqlik | 80% |
| 3 | QR noyob, PDF, grace period | 80% |
| 4 | QR→menyu oqimi, savat, PWA | 75% |
| 5 | ⛔ **holat mashinasi**, ⛔ **narx**, ⛔ **idempotency**, WS | 90% |
| 6 | AR API, fayl limiti, o'lcham, fallback, kutubxona | 80% |
| 7 | zal plan saqlash, stol holati | 70% |
| 8 | hisobotlar, eksport | 75% |
| 9 | MCP fallback, byudjet, chatbot validatsiya | 75% |
| 10 | ⛔ **to'lov idempotency**, webhook imzo, fiskal retry | 90% |
| 11 | keshbek, otziv filtri | 75% |
| 12 | health, self-healing, yuklama | 70% |

---

## 5. FIXTURE'LAR (`tests/conftest.py`)

```python
import pytest
from rest_framework.test import APIClient

@pytest.fixture
def api_client(): return APIClient()

@pytest.fixture
def restaurant(db):
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(slug='test-rest', name='Test',
        phone='998901234567', city='Toshkent', plan='pro', is_active=True)

@pytest.fixture
def restaurant2(db):
    """⚡ Cross-tenant testlar uchun"""
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(slug='test-2', name='Ikkinchi',
        phone='998901234568', city='Samarqand', plan='start', is_active=True)

@pytest.fixture
def hall(restaurant):
    from apps.tables.models import Hall
    return Hall.objects.create(restaurant=restaurant, name='1-qavat')

@pytest.fixture
def table(hall, restaurant):
    from apps.tables.models import Table
    return Table.objects.create(hall=hall, restaurant=restaurant, number='5', capacity=4)

@pytest.fixture
def category(restaurant):
    from apps.menu.models import Category
    return Category.objects.create(restaurant=restaurant, name_uz='Milliy',
                                   name_ru='Национальные', name_en='National')

@pytest.fixture
def dish(category, restaurant):
    from apps.menu.models import Dish
    return Dish.objects.create(category=category, restaurant=restaurant,
        name_uz='Osh', name_ru='Плов', name_en='Pilaf', price=45000,
        cook_min=20, is_available=True)

@pytest.fixture
def staff(restaurant, django_user_model):
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    u = django_user_model.objects.create_user('waiter1', password='x')
    return Staff.objects.create(restaurant=restaurant, user=u, role='waiter',
                                pin_hash=hash_pin('1234'))

@pytest.fixture
def staff_token(staff):
    from apps.accounts.tokens import make_token
    return make_token(staff)

@pytest.fixture
def admin_token(restaurant, django_user_model):
    from apps.accounts.models import Staff
    from apps.accounts.tokens import make_token
    u = django_user_model.objects.create_user('admin1', password='x')
    s = Staff.objects.create(restaurant=restaurant, user=u, role='admin')
    return make_token(s)

@pytest.fixture
def guest_session(restaurant, table):
    from apps.guest.models import Guest, GuestSession
    g = Guest.objects.create(restaurant=restaurant, device_token='dev-1')
    return GuestSession.objects.create(guest=g, table=table, restaurant=restaurant)

@pytest.fixture
def order(restaurant, table, guest_session, dish):
    from apps.orders.models import Order, OrderItem
    o = Order.objects.create(restaurant=restaurant, table=table,
        session_id=str(guest_session.id), number='#001',
        subtotal=45000, total=45000)
    OrderItem.objects.create(order=o, dish=dish, qty=1, price=45000)
    return o
```

---

## 6. E2E TESTLAR (faza oxirida)

**Fayl:** `tests/e2e/test_full_flow.py`

```python
@pytest.mark.django_db
def test_qr_to_order_flow(api_client, table, dish):
    """QR → menyu → savat → buyurtma → KDS → ofitsiant → to'lov"""

    # 1. QR skanerlash
    r = api_client.get(f'/t/{table.qr_token}', follow=True)
    assert r.status_code == 200

    # 2. Menyu olish
    r = api_client.get(f'/v1/menu/{table.restaurant.slug}/?lang=uz')
    assert r.status_code == 200
    assert any(d['id'] == dish.id for d in r.data['dishes'])

    # 3. Buyurtma
    r = api_client.post('/v1/orders/', {...}, format='json',
                        HTTP_X_IDEMPOTENCY_KEY='e2e-1')
    assert r.status_code == 201
    order_id = r.data['id']

    # 4. Ofitsiant qabul qiladi
    r = api_client.post(f'/v1/staff/orders/{order_id}/accept/', ...)
    assert r.status_code == 200

    # 5. Oshpaz: cooking → ready
    api_client.post(f'/v1/staff/orders/{order_id}/cook/', ...)
    api_client.post(f'/v1/staff/orders/{order_id}/ready/', ...)

    # 6. Ofitsiant olib boradi
    api_client.post(f'/v1/staff/orders/{order_id}/serve/', ...)

    from apps.orders.models import Order
    assert Order.objects.get(id=order_id).status == 'served'
```

---

## 7. YUKLAMA TESTI (reliz oldidan)

**Fayl:** `tests/load/menu.js` (k6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 5000 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const r = http.get(`${__ENV.BASE_URL}/v1/menu/test-rest/?lang=uz`);
  check(r, {
    'status 200': (x) => x.status === 200,
    'has dishes': (x) => JSON.parse(x.body).dishes.length > 0,
  });
  sleep(1);
}
```

```bash
k6 run -e BASE_URL=https://stage.armenu.uz tests/load/menu.js
```

---

## 8. CHAOS TESTI (oyiga 1 marta, staging'da)

| Test | Buyruq | Kutilgan natija |
|---|---|---|
| Web node o'chirish | `systemctl stop armenu` (1 ta) | Foydalanuvchi sezmaydi |
| Redis o'chirish | `systemctl stop redis` | Menyu ishlaydi (DB'dan), WS uziladi va tiklanadi |
| DB primary o'chirish | `systemctl stop postgresql` | 30-60s yozish yo'q, o'qish uzilmaydi |
| AI provayder bloklash | firewall | Keyingi provayderga o'tadi |
| Disk to'ldirish 95% | `fallocate` | Auto-cleanup ishlaydi |
| Worker o'ldirish | `kill -9` | Job qayta navbatga (60s) |

---

## 9. BUYRUQLAR

```bash
# Tez (ishlab chiqishda)
pytest -x -q

# To'liq + qamrov
pytest --cov=apps --cov=core --cov-report=term-missing --cov-fail-under=75

# Faqat majburiy testlar (CI)
pytest tests/test_tenant_isolation.py tests/test_i18n_completeness.py \
       tests/test_order_state.py tests/test_price_calculation.py \
       tests/test_payment_idempotency.py -v

# Bitta test
pytest tests/test_orders.py::test_idempotency -v

# Sekin testlarni chetlab o'tish
pytest -m "not slow"

# Parallel (tez)
pytest -n auto
```
