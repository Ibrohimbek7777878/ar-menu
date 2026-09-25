# FAZA 5 — BUYURTMA + REAL-TIME

**Vazifalar:** V-093 … V-114 (22 ta) · **Muddat:** 2 hafta
**Maqsad:** Mijoz buyurtma beradi → ofitsiant ko'radi → oshxona tayyorlaydi → hammasi
jonli (WebSocket). Pul bilan bog'liq birinchi kritik oqim.

> ⚠️ Boshlashdan oldin FAZA 4 (Mijoz PWA) tugagan bo'lishi kerak — savat
> `localStorage` da tayyor, `session_id` mavjud.

**⚡ Bu fazaning 3 ta oltin qoidasi:**
1. **Narx DOIM serverda hisoblanadi** — frontenddan kelgan narxga ISHONILMAYDI
2. **Holat o'zgarishi faqat `transition()` orqali** — `order.status = 'x'` YOZILMAYDI
3. **WS guruhlari DOIM restoran-scoped** — `rest_<id>_kds`, cross-tenant xabar mumkin emas

---

## V-093 — `Order`, `OrderItem` modellari

**Fayl:** `apps/orders/__init__.py` (bo'sh), `apps/orders/apps.py`, `apps/orders/models.py`

```bash
mkdir -p apps/orders/management/commands apps/orders/migrations
touch apps/orders/__init__.py apps/orders/migrations/__init__.py
touch apps/orders/management/__init__.py apps/orders/management/commands/__init__.py
```

**`apps/orders/apps.py`:**
```python
from django.apps import AppConfig


class OrdersConfig(AppConfig):
    name = 'apps.orders'
    label = 'orders'
    verbose_name = 'Buyurtmalar'
```

**`apps/orders/models.py`:**
```python
from django.db import models
from django.utils import timezone

from core.models import TimestampedModel


class Order(TimestampedModel):
    STATUS = [
        ('new',       'Yangi'),
        ('accepted',  'Qabul qilindi'),
        ('cooking',   'Tayyorlanmoqda'),
        ('ready',     'Tayyor'),
        ('served',    'Berildi'),
        ('paid',      "To'landi"),
        ('cancelled', 'Bekor qilindi'),
    ]
    SOURCE = [
        ('qr', 'QR'), ('waiter', 'Ofitsiant'),
        ('telegram', 'Telegram'), ('delivery', 'Yetkazish'),
    ]

    # ⚡ PROTECT — buyurtma tarixi restoran o'chsa ham yo'qolmaydi
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.PROTECT,
                                   db_index=True, related_name='orders')
    table      = models.ForeignKey('tables.Table', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')
    guest      = models.ForeignKey('guest.Guest', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')
    session_id = models.CharField(max_length=64, db_index=True, blank=True)
    waiter     = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='orders')

    number  = models.CharField(max_length=20, db_index=True)      # "#047" — kunlik
    status  = models.CharField(max_length=20, choices=STATUS, default='new', db_index=True)
    source  = models.CharField(max_length=20, choices=SOURCE, default='qr')

    subtotal    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total       = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    note    = models.TextField(blank=True)
    eta_min = models.SmallIntegerField(default=0)

    # ⚡ Dublikat buyurtmaning oldini oladi (POST 2 marta ketsa)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True,
                                       blank=True, db_index=True)

    # Holat vaqtlari — transition() avtomatik to'ldiradi
    accepted_at  = models.DateTimeField(null=True, blank=True)
    cooking_at   = models.DateTimeField(null=True, blank=True)
    ready_at     = models.DateTimeField(null=True, blank=True)
    served_at    = models.DateTimeField(null=True, blank=True)
    paid_at      = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'orders_order'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['restaurant', 'status', '-created_at']),
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['table', 'status']),
            models.Index(fields=['session_id', '-created_at']),
        ]

    def __str__(self):
        return f'{self.number} ({self.get_status_display()})'

    # ---- Yordamchi xossalar (KDS/ofitsiant uchun) ----

    @property
    def is_open(self):
        return self.status not in ('paid', 'cancelled')

    @property
    def age_sec(self) -> int:
        """Yaratilganidan beri necha soniya o'tdi"""
        return int((timezone.now() - self.created_at).total_seconds())

    @property
    def eta_pct(self) -> int:
        """ETA ning necha foizi o'tdi — KDS rangi shundan chiqadi"""
        if not self.eta_min:
            return 0
        return int(100 * self.age_sec / (self.eta_min * 60))


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    dish  = models.ForeignKey('menu.Dish', on_delete=models.PROTECT, related_name='+')

    # ⚡ Snapshot — taom nomi/narxi keyin o'zgarsa ham chek o'zgarmaydi
    dish_name = models.CharField(max_length=200)
    qty       = models.PositiveSmallIntegerField(default=1)
    price     = models.DecimalField(max_digits=12, decimal_places=2)   # 1 dona (modifikator bilan)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    modifiers = models.JSONField(default=list, blank=True)   # [{"id":3,"name":"...","delta":25000}]
    note      = models.CharField(max_length=200, blank=True)

    # ⚡ AR analitikasining asosi — bu taomni AR'da ko'rganmi
    ar_viewed = models.BooleanField(default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders_orderitem'
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['dish', 'ar_viewed']),
        ]

    def __str__(self):
        return f'{self.dish_name} × {self.qty}'
```

**`config/settings/base.py` → `INSTALLED_APPS` ga qo'shish:**
```python
    'apps.orders',
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations orders
python manage.py migrate
python manage.py shell -c "from apps.orders.models import Order; print(Order._meta.db_table)"
# orders_order
```

---

## V-094 — ⚡ Holat mashinasi (`state.py`) — KRITIK

**Fayl:** `apps/orders/state.py`

> ⛔ **Hech qachon `order.status = 'ready'; order.save()` YOZMANG.**
> Faqat `transition(order, 'ready', actor=staff)`. Aks holda: timestamp yozilmaydi,
> WS xabar ketmaydi, audit log bo'lmaydi.

```python
import logging

from django.db import transaction
from django.utils import timezone

from core.exceptions import InvalidTransition

log = logging.getLogger('orders.state')

# ⚡ Ruxsat etilgan o'tishlar — boshqa hech qanday o'tish mumkin emas
ALLOWED = {
    'new':       {'accepted', 'cancelled'},
    'accepted':  {'cooking', 'cancelled'},
    'cooking':   {'ready', 'cancelled'},
    'ready':     {'served', 'cancelled'},
    'served':    {'paid', 'cancelled'},
    'paid':      set(),          # yakuniy
    'cancelled': set(),          # yakuniy
}

# Kim qaysi o'tishni bajara oladi (rol nazorati)
ROLE_ALLOWED = {
    'accepted':  {'waiter', 'admin', 'owner'},
    'cooking':   {'cook', 'admin', 'owner'},
    'ready':     {'cook', 'admin', 'owner'},
    'served':    {'waiter', 'admin', 'owner'},
    'paid':      {'cashier', 'waiter', 'admin', 'owner'},
    'cancelled': {'waiter', 'admin', 'owner'},
}

# Har o'tishda mijozga ko'rsatiladigan matn (3 til)
GUEST_TEXT = {
    'accepted':  ("Buyurtmangiz qabul qilindi",   "Заказ принят",             'Order accepted'),
    'cooking':   ("Tayyorlanmoqda",               "Готовится",                'Cooking'),
    'ready':     ("Tayyor! Hozir olib kelishadi", "Готово! Сейчас принесут",  'Ready!'),
    'served':    ("Yoqimli ishtaha!",             "Приятного аппетита!",      'Enjoy your meal!'),
    'paid':      ("To'lov qabul qilindi",         "Оплата принята",           'Payment received'),
    'cancelled': ("Buyurtma bekor qilindi",       "Заказ отменён",            'Order cancelled'),
}


def can(order, new_status: str) -> bool:
    return new_status in ALLOWED.get(order.status, set())


def transition(order, new_status: str, actor=None, reason: str = ''):
    """
    ⚡ Buyurtma holatini o'zgartirishning YAGONA yo'li.

    1. O'tish ruxsat etilganmi (ALLOWED)
    2. Aktyorning roli mos keladimi (ROLE_ALLOWED)
    3. Atomik: status + timestamp + audit log
    4. on_commit: WS xabar + navbat vazifalari
    """
    old = order.status

    if new_status not in ALLOWED.get(old, set()):
        log.warning(f'[state] #{order.id} {old} → {new_status} RAD ETILDI')
        raise InvalidTransition({
            'order_id': order.id, 'from': old, 'to': new_status,
            'allowed': sorted(ALLOWED.get(old, set())),
        })

    if actor is not None:
        role = getattr(actor, 'role', None)
        if role and role not in ROLE_ALLOWED.get(new_status, set()):
            raise InvalidTransition({
                'order_id': order.id, 'reason': 'role',
                'role': role, 'to': new_status,
            })

    ts_field = f'{new_status}_at'
    fields = ['status', 'updated_at']

    with transaction.atomic():
        # ⚡ Poyga holatini oldini olish: SELECT ... FOR UPDATE
        locked = type(order).objects.select_for_update().get(pk=order.pk)
        if locked.status != old:
            raise InvalidTransition({
                'order_id': order.id, 'from': locked.status, 'to': new_status,
                'reason': 'concurrent_change',
            })

        order.status = new_status
        if hasattr(order, ts_field):
            setattr(order, ts_field, timezone.now())
            fields.append(ts_field)
        if new_status == 'cancelled' and reason:
            order.cancel_reason = reason[:200]
            fields.append('cancel_reason')
        if new_status == 'accepted' and actor is not None and order.waiter_id is None:
            order.waiter = actor
            fields.append('waiter')

        order.save(update_fields=fields)
        _audit(order, old, new_status, actor, reason)

    transaction.on_commit(lambda: _broadcast(order, old, new_status))
    log.info(f'[state] #{order.id} {old} → {new_status} ✅')
    return order


def _audit(order, old, new, actor, reason):
    from apps.accounts.models import AuditLog
    AuditLog.objects.create(
        restaurant_id=order.restaurant_id,
        actor=actor,
        action='order.transition',
        model='Order',
        object_id=str(order.id),
        old={'status': old},
        new={'status': new, 'reason': reason},
    )


def _broadcast(order, old, new):
    """⚡ Barcha manfaatdorlarga jonli xabar — restoran-scoped guruhlar"""
    from core.ws import ws_send, g_kds, g_waiters, g_admin, g_guest
    from core.queue import enqueue
    from apps.orders.serializers import serialize_order, serialize_order_short

    rid = order.restaurant_id
    short = serialize_order_short(order)
    uz, ru, en = GUEST_TEXT.get(new, ('', '', ''))

    payload = {'order': short, 'from': old, 'to': new}

    ws_send(g_kds(rid),     'order.status', payload)
    ws_send(g_waiters(rid), 'order.status', payload)
    ws_send(g_admin(rid),   'order.status', payload)

    if order.session_id:
        ws_send(g_guest(order.session_id), 'order.status', {
            'order_id': order.id, 'number': order.number, 'status': new,
            'text_uz': uz, 'text_ru': ru, 'text_en': en,
        })

    # 🔔 Tayyor bo'lsa — ofitsiantga alohida signal (tovush + vibratsiya)
    if new == 'ready':
        ws_send(g_waiters(rid), 'order.ready', {
            'order': serialize_order(order),
            'table_no': order.table.number if order.table_id else '—',
        })
        enqueue('notify', 'waiter_order_ready', order_id=order.id)

    if new == 'cancelled':
        ws_send(g_kds(rid), 'order.cancelled', {'order_id': order.id,
                                                'number': order.number})

    enqueue('analytics', 'order_status', order_id=order.id, status=new)
    _sync_table_status(order)


def _sync_table_status(order):
    """Stol rangi buyurtma holatiga qarab o'zgaradi (O-05, A-01)"""
    from core.ws import ws_send, g_admin, g_waiters
    if not order.table_id:
        return
    table = order.table
    mapping = {
        'new': 'ordering', 'accepted': 'waiting', 'cooking': 'waiting',
        'ready': 'ready', 'served': 'occupied', 'paid': 'cleaning',
        'cancelled': 'occupied',
    }
    new_st = mapping.get(order.status)
    if not new_st or table.status == new_st:
        return
    table.status = new_st
    table.save(update_fields=['status'])
    data = {'table_id': table.id, 'number': table.number, 'status': new_st}
    ws_send(g_admin(order.restaurant_id),   'table.status', data)
    ws_send(g_waiters(order.restaurant_id), 'table.status', data)
```

✅ **Test:** `tests/test_order_state.py`
```python
import pytest
from core.exceptions import InvalidTransition
from apps.orders.state import ALLOWED, can, transition


def test_allowed_map_is_closed():
    """Har bir maqsad holat ham ALLOWED da kalit bo'lishi kerak"""
    for src, targets in ALLOWED.items():
        for t in targets:
            assert t in ALLOWED, f'{t} kalit sifatida yo\'q'


def test_paid_is_terminal():
    assert ALLOWED['paid'] == set()
    assert ALLOWED['cancelled'] == set()


@pytest.mark.django_db
def test_invalid_transition_raises(order_new):
    with pytest.raises(InvalidTransition):
        transition(order_new, 'ready')       # new → ready mumkin emas


@pytest.mark.django_db
def test_valid_chain(order_new):
    transition(order_new, 'accepted')
    assert order_new.accepted_at is not None
    transition(order_new, 'cooking')
    transition(order_new, 'ready')
    assert order_new.status == 'ready'
    assert order_new.ready_at is not None
```

---

## V-095 — Kunlik buyurtma raqami (`#047`)

**Fayl:** `apps/orders/services.py` (birinchi qism)

> Har kuni 00:00 da hisob 1 dan boshlanadi. Raqam restoran ichida noyob
> (kunlik). Redis `INCR` — poyga holati yo'q.

```python
import logging
import math
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.exceptions import (DishUnavailable, RestaurantInactive,
                             TenantMismatch, PlanLimit)
from core.queue import enqueue, get_redis

log = logging.getLogger('orders.services')


def next_number(restaurant_id: int) -> str:
    """
    ⚡ Kunlik buyurtma raqami: #001, #002 … #047
    Redis INCR — atomik, poyga holati yo'q. Kalit ertasi kuni o'zi o'ladi.
    """
    today = timezone.localtime().strftime('%Y%m%d')
    key = f'ordnum:{restaurant_id}:{today}'
    r = get_redis()
    n = r.incr(key)
    if n == 1:
        # kalit ertaga kechqurun o'chsin (26 soat — vaqt mintaqasi zaxirasi)
        r.expire(key, 26 * 3600)
    return f'#{n:03d}'


def recover_number_counter(restaurant_id: int) -> int:
    """
    Redis tozalangan bo'lsa — DB'dan bugungi buyurtmalar sonini hisoblab
    hisoblagichni tiklaydi. `run_order_worker` boshlanishida chaqiriladi.
    """
    from apps.orders.models import Order
    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    cnt = Order.objects.filter(restaurant_id=restaurant_id,
                               created_at__gte=start).count()
    today = timezone.localtime().strftime('%Y%m%d')
    key = f'ordnum:{restaurant_id}:{today}'
    r = get_redis()
    if not r.exists(key) and cnt:
        r.set(key, cnt, ex=26 * 3600)
    return cnt
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.orders.services import next_number
print(next_number(1), next_number(1), next_number(1))"
# #001 #002 #003
```

---

## V-096 — ⚡ `create_order()` — LOYIHANING ENG KRITIK FUNKSIYASI

**Fayl:** `apps/orders/services.py` (davomi)

> ⛔ **Narx frontenddan OLINMAYDI.** Mijoz `{"price": 1}` yuborsa ham
> server `Dish.price` ni oladi. Bu — pul yo'qotmaslikning yagona kafolati.

```python
MAX_ITEMS = 50
MAX_QTY = 99


def create_order(*, restaurant_id, session_id, table_id, items, note='',
                 idem_key=None, guest=None, source='qr', waiter=None):
    """
    ⚡ 7 bosqichli validatsiya. Tartib QAT'IY — o'zgartirmang.

      1. Idempotency tekshiruvi (dublikat POST)
      2. Stol tekshiruvi (tenant scope!)
      3. Restoran faolmi
      4. Taomlar bitta so'rovda (N+1 yo'q) + tenant scope
      5. Mavjudlik (stop-list)
      6. ⚡ NARX SERVERDA hisoblanadi
      7. transaction.atomic + on_commit hooks
    """
    from core.idempotency import check_idempotency, save_idempotency
    from apps.tables.models import Table
    from apps.menu.models import Dish, DishModifier
    from apps.orders.models import Order, OrderItem

    # ---- 1. IDEMPOTENCY ----------------------------------------------------
    if idem_key:
        existing_id = check_idempotency(idem_key)
        if existing_id:
            log.info(f'[order] idempotent hit: {idem_key} → #{existing_id}')
            return Order.objects.prefetch_related('items').get(id=existing_id)

    # ---- 0. Kirish sanitizatsiyasi ----------------------------------------
    if not items:
        raise TenantMismatch({'reason': 'empty_cart'})
    if len(items) > MAX_ITEMS:
        raise TenantMismatch({'reason': 'too_many_items', 'max': MAX_ITEMS})

    # ---- 2. STOL (tenant scope!) ------------------------------------------
    table = None
    if table_id:
        table = (Table.objects
                 .select_related('restaurant')
                 .filter(id=table_id, restaurant_id=restaurant_id,
                         is_active=True)
                 .first())
        if table is None:
            raise TenantMismatch({'table_id': table_id})
        restaurant = table.restaurant
    else:
        from apps.tenants.models import Restaurant
        restaurant = Restaurant.objects.get(id=restaurant_id)

    # ---- 3. RESTORAN FAOLMI -----------------------------------------------
    if not restaurant.is_active:
        raise RestaurantInactive({'restaurant': restaurant.slug})

    # ---- 4. TAOMLAR (BITTA so'rov) ----------------------------------------
    dish_ids = []
    for i in items:
        try:
            dish_ids.append(int(i['dish_id']))
        except (KeyError, TypeError, ValueError):
            raise TenantMismatch({'reason': 'bad_dish_id', 'item': i})

    dishes = {d.id: d for d in Dish.objects.filter(
        id__in=set(dish_ids), restaurant_id=restaurant_id)}

    if len(dishes) != len(set(dish_ids)):
        missing = set(dish_ids) - set(dishes)
        raise TenantMismatch({'reason': 'dish_not_in_restaurant',
                              'dish_ids': sorted(missing)})

    # Modifikatorlar ham bitta so'rovda (va faqat shu taomlarniki)
    mod_ids = set()
    for i in items:
        mod_ids.update(int(m) for m in (i.get('modifiers') or []))
    mods = {m.id: m for m in DishModifier.objects.filter(
        id__in=mod_ids, dish_id__in=dishes.keys())} if mod_ids else {}

    # ---- 5. MAVJUDLIK (stop-list) -----------------------------------------
    for d in dishes.values():
        if not d.is_available:
            raise DishUnavailable({'dish_id': d.id, 'dish_name': d.name_uz})

    # ---- 6. ⚡ NARX SERVERDA HISOBLANADI -----------------------------------
    subtotal = Decimal('0')
    order_items = []
    max_cook = 0

    for i in items:
        d = dishes[int(i['dish_id'])]

        # ⚡ Miqdor DOIM butun son (Math.ceil ekvivalenti)
        raw_qty = i.get('qty', 1)
        qty = max(1, min(MAX_QTY, int(math.ceil(float(raw_qty)))))

        # Modifikator narxlari — faqat SHU taomga tegishlilari
        chosen, mod_sum = [], Decimal('0')
        for mid in (i.get('modifiers') or []):
            m = mods.get(int(mid))
            if m is None or m.dish_id != d.id:
                continue                       # begona modifikator — jimgina tashlanadi
            chosen.append({'id': m.id, 'name': m.name_uz,
                           'delta': str(m.price_delta)})
            mod_sum += m.price_delta

        unit = d.price + mod_sum               # ⚡ DB narxi, frontenddan EMAS
        line = unit * qty
        subtotal += line
        max_cook = max(max_cook, d.cook_min or 0)

        order_items.append(OrderItem(
            dish=d, dish_name=d.name_uz, qty=qty, price=unit, line_total=line,
            modifiers=chosen, note=str(i.get('note', ''))[:200],
            ar_viewed=bool(i.get('ar_viewed', False)),
        ))

    service_fee = (subtotal * restaurant.service_fee_pct / Decimal('100')
                   ).quantize(Decimal('0.01'))
    total = subtotal + service_fee

    # ---- 7. TRANSAKSIYA ----------------------------------------------------
    with transaction.atomic():
        order = Order.objects.create(
            restaurant_id=restaurant_id,
            table=table,
            guest=guest,
            session_id=session_id or '',
            waiter=waiter,
            number=next_number(restaurant_id),
            source=source,
            subtotal=subtotal, service_fee=service_fee, total=total,
            note=str(note)[:500],
            eta_min=max_cook or 15,
            idempotency_key=idem_key or None,
        )
        for oi in order_items:
            oi.order = order
        OrderItem.objects.bulk_create(order_items)

        if table is not None and table.status in ('free', 'occupied'):
            table.status = 'ordering'
            table.save(update_fields=['status'])

    # ---- 8. POST-COMMIT (transaksiya muvaffaqiyatli bo'lgandan KEYIN) ------
    transaction.on_commit(lambda: _after_order_created(order.id))

    if idem_key:
        save_idempotency(idem_key, order.id)

    log.info(f'[order] {order.number} yaratildi — {total} so\'m '
             f'({len(order_items)} qator)')
    return order


def _after_order_created(order_id: int):
    """⚡ on_commit ichida chaqiriladi — DB'da yozuv aniq bor"""
    from core.ws import ws_send, g_kds, g_waiters, g_admin, g_guest
    from apps.orders.models import Order
    from apps.orders.serializers import serialize_order, serialize_order_short

    order = (Order.objects
             .select_related('table', 'restaurant')
             .prefetch_related('items')
             .get(id=order_id))
    rid = order.restaurant_id

    ws_send(g_kds(rid),     'order.new', {'order': serialize_order(order)})
    ws_send(g_waiters(rid), 'order.new', {
        'order': serialize_order(order),
        'table_id': order.table_id,
        'assigned_to': order.waiter_id,
    })
    ws_send(g_admin(rid),   'order.new', {'order': serialize_order_short(order)})

    if order.session_id:
        ws_send(g_guest(order.session_id), 'order.created', {
            'order_id': order.id, 'number': order.number,
            'total': str(order.total), 'eta_min': order.eta_min,
        })

    enqueue('notify',    'waiter_new_order', order_id=order.id)
    enqueue('notify',    'kitchen_print',    order_id=order.id)
    enqueue('analytics', 'order_created',    order_id=order.id)


def add_items(order, items):
    """
    Qo'shimcha buyurtma — mavjud buyurtmaga qator qo'shadi.
    Faqat OCHIQ (paid/cancelled emas) buyurtmaga ruxsat.
    """
    from core.exceptions import InvalidTransition
    from apps.menu.models import Dish, DishModifier
    from apps.orders.models import OrderItem

    if not order.is_open:
        raise InvalidTransition({'order_id': order.id, 'status': order.status,
                                 'reason': 'closed'})

    dish_ids = {int(i['dish_id']) for i in items}
    dishes = {d.id: d for d in Dish.objects.filter(
        id__in=dish_ids, restaurant_id=order.restaurant_id)}
    if len(dishes) != len(dish_ids):
        raise TenantMismatch({'reason': 'dish_not_in_restaurant'})

    for d in dishes.values():
        if not d.is_available:
            raise DishUnavailable({'dish_id': d.id, 'dish_name': d.name_uz})

    mod_ids = set()
    for i in items:
        mod_ids.update(int(m) for m in (i.get('modifiers') or []))
    mods = {m.id: m for m in DishModifier.objects.filter(
        id__in=mod_ids, dish_id__in=dishes.keys())} if mod_ids else {}

    new_rows, added = [], Decimal('0')
    for i in items:
        d = dishes[int(i['dish_id'])]
        qty = max(1, min(MAX_QTY, int(math.ceil(float(i.get('qty', 1))))))
        chosen, mod_sum = [], Decimal('0')
        for mid in (i.get('modifiers') or []):
            m = mods.get(int(mid))
            if m is None or m.dish_id != d.id:
                continue
            chosen.append({'id': m.id, 'name': m.name_uz, 'delta': str(m.price_delta)})
            mod_sum += m.price_delta
        unit = d.price + mod_sum
        line = unit * qty
        added += line
        new_rows.append(OrderItem(order=order, dish=d, dish_name=d.name_uz,
                                  qty=qty, price=unit, line_total=line,
                                  modifiers=chosen,
                                  note=str(i.get('note', ''))[:200],
                                  ar_viewed=bool(i.get('ar_viewed', False))))

    fee_pct = order.restaurant.service_fee_pct
    with transaction.atomic():
        OrderItem.objects.bulk_create(new_rows)
        order.subtotal += added
        order.service_fee = (order.subtotal * fee_pct / Decimal('100')
                             ).quantize(Decimal('0.01'))
        order.total = order.subtotal + order.service_fee
        order.save(update_fields=['subtotal', 'service_fee', 'total', 'updated_at'])

    transaction.on_commit(lambda: _after_items_added(order.id, len(new_rows)))
    return order


def _after_items_added(order_id, count):
    from core.ws import ws_send, g_kds, g_waiters, g_admin
    from apps.orders.models import Order
    from apps.orders.serializers import serialize_order

    order = Order.objects.select_related('table').prefetch_related('items').get(id=order_id)
    data = {'order': serialize_order(order), 'added': count}
    ws_send(g_kds(order.restaurant_id),     'order.items_added', data)
    ws_send(g_waiters(order.restaurant_id), 'order.items_added', data)
    ws_send(g_admin(order.restaurant_id),   'order.items_added', data)
```

**Fayl:** `apps/orders/serializers.py`
```python
def serialize_order(order) -> dict:
    """To'liq — KDS va ofitsiant uchun"""
    return {
        'id': order.id,
        'number': order.number,
        'status': order.status,
        'source': order.source,
        'table_id': order.table_id,
        'table_no': order.table.number if order.table_id else '—',
        'waiter_id': order.waiter_id,
        'subtotal': str(order.subtotal),
        'service_fee': str(order.service_fee),
        'total': str(order.total),
        'note': order.note,
        'eta_min': order.eta_min,
        'age_sec': order.age_sec,
        'eta_pct': order.eta_pct,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'id': it.id,
            'dish_id': it.dish_id,
            'name': it.dish_name,
            'qty': it.qty,
            'price': str(it.price),
            'line_total': str(it.line_total),
            'modifiers': it.modifiers,
            'note': it.note,
            'ar_viewed': it.ar_viewed,
        } for it in order.items.all()],
    }


def serialize_order_short(order) -> dict:
    """Qisqa — admin oqimi, ro'yxatlar"""
    return {
        'id': order.id,
        'number': order.number,
        'status': order.status,
        'table_no': order.table.number if order.table_id else '—',
        'total': str(order.total),
        'eta_min': order.eta_min,
        'age_sec': order.age_sec,
        'created_at': order.created_at.isoformat(),
    }
```

✅ **Test:** `tests/test_orders.py`
```python
import pytest
from decimal import Decimal
from apps.orders.services import create_order


@pytest.mark.django_db
def test_price_comes_from_db_not_client(restaurant, table, dish):
    """⚡ Mijoz narx yuborsa ham SERVER narxi olinadi"""
    dish.price = Decimal('45000'); dish.save()
    order = create_order(
        restaurant_id=restaurant.id, session_id='gs_1', table_id=table.id,
        items=[{'dish_id': dish.id, 'qty': 2, 'price': 1}])   # ← 1 so'm "yuborilgan"
    assert order.subtotal == Decimal('90000')


@pytest.mark.django_db
def test_qty_is_integer(restaurant, table, dish):
    order = create_order(restaurant_id=restaurant.id, session_id='gs_2',
                         table_id=table.id,
                         items=[{'dish_id': dish.id, 'qty': 2.3}])
    assert order.items.first().qty == 3     # Math.ceil
```

---

## V-097 — ⚡ Idempotency (Redis, TTL 24 soat)

**Fayl:** `core/idempotency.py`

> Muammo: mijoz tugmani 2 marta bosdi / tarmoq uzildi va telefon POST'ni
> takrorladi → 2 ta bir xil buyurtma. Yechim: `X-Idempotency-Key`.

```python
import logging

from django.conf import settings
from core.queue import get_redis

log = logging.getLogger('core.idempotency')

PREFIX = 'idem:order:'
TTL = getattr(settings, 'ORDER_IDEMPOTENCY_TTL', 86400)   # 24 soat


def _key(idem_key: str) -> str:
    return f'{PREFIX}{idem_key}'


def check_idempotency(idem_key: str):
    """
    Qaytaradi:
      None  — birinchi marta (davom eting)
      int   — allaqachon yaratilgan buyurtma ID
    ⚡ 'PENDING' bo'lsa — parallel so'rov ketyapti, kutamiz emas, xato beramiz.
    """
    if not idem_key:
        return None
    r = get_redis()
    val = r.get(_key(idem_key))
    if val is None:
        # ⚡ Atomik band qilish — parallel ikkinchi so'rov shu yerda to'xtaydi
        if r.set(_key(idem_key), 'PENDING', nx=True, ex=120):
            return None
        val = r.get(_key(idem_key))
    if val == 'PENDING':
        from core.exceptions import ARMenuError
        raise DuplicateInFlight({'idempotency_key': idem_key})
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def save_idempotency(idem_key: str, order_id: int):
    if not idem_key:
        return
    get_redis().set(_key(idem_key), int(order_id), ex=TTL)
    log.debug(f'[idem] {idem_key} → #{order_id} (24s)')


def release_idempotency(idem_key: str):
    """Xato bo'lsa PENDING ni bo'shatish — mijoz qayta urina olsin"""
    if not idem_key:
        return
    r = get_redis()
    if r.get(_key(idem_key)) == 'PENDING':
        r.delete(_key(idem_key))


# --- xato turi ---
from rest_framework import status  # noqa: E402
from core.exceptions import ARMenuError  # noqa: E402


class DuplicateInFlight(ARMenuError):
    code_name = 'DUPLICATE_IN_FLIGHT'
    status_code = status.HTTP_409_CONFLICT
    msg_uz = "Buyurtma yuborilmoqda, biroz kuting"
    msg_ru = "Заказ отправляется, подождите"
    msg_en = 'Order is being submitted, please wait'
```

✅ **Test:** `tests/test_idempotency.py`
```python
import uuid, pytest
from apps.orders.services import create_order


@pytest.mark.django_db
def test_same_key_returns_same_order(restaurant, table, dish):
    k = str(uuid.uuid4())
    o1 = create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                      items=[{'dish_id': dish.id, 'qty': 1}], idem_key=k)
    o2 = create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                      items=[{'dish_id': dish.id, 'qty': 1}], idem_key=k)
    assert o1.id == o2.id
    from apps.orders.models import Order
    assert Order.objects.count() == 1        # ⚡ dublikat YO'Q
```

---

## V-098 — `POST /v1/orders/`

**Fayl:** `apps/orders/views.py`

```python
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from core.exceptions import TenantMismatch
from core.idempotency import release_idempotency
from apps.orders.models import Order
from apps.orders.serializers import serialize_order
from apps.orders.services import create_order, add_items

log = logging.getLogger('orders.views')


def _guest_session(request):
    """Mijoz sessiyasi — FAZA 4 da yaratilgan GuestSession"""
    from apps.guest.models import GuestSession
    sid = (request.data.get('session_id')
           or request.headers.get('X-Session-Id')
           or request.session.get('gs'))
    if not sid:
        return None
    return GuestSession.objects.select_related('guest').filter(
        session_key=sid, restaurant_id=request.restaurant_id).first()


@api_view(['POST'])
@permission_classes([AllowAny])
def order_create(request):
    """
    POST /v1/orders/
    Headers: X-Idempotency-Key: <uuid>
    Body: {session_id, table_id, items:[{dish_id,qty,modifiers,note,ar_viewed}], note}
    """
    if not getattr(request, 'restaurant_id', None):
        raise TenantMismatch({'reason': 'restaurant_not_resolved'})

    idem_key = (request.headers.get('X-Idempotency-Key') or '')[:64]
    session = _guest_session(request)

    try:
        order = create_order(
            restaurant_id=request.restaurant_id,
            session_id=session.session_key if session else request.data.get('session_id', ''),
            table_id=request.data.get('table_id'),
            items=request.data.get('items') or [],
            note=request.data.get('note', ''),
            idem_key=idem_key,
            guest=session.guest if session else None,
            source='qr',
        )
    except Exception:
        release_idempotency(idem_key)     # ⚡ PENDING bo'shatiladi
        raise

    return Response(serialize_order(order), status=status.HTTP_201_CREATED)
```

**Fayl:** `apps/orders/urls.py`
```python
from django.urls import path
from apps.orders import views

app_name = 'orders'

urlpatterns = [
    path('orders/',                  views.order_create,       name='create'),
    path('orders/<int:pk>/',         views.order_detail,       name='detail'),
    path('orders/<int:pk>/add-items/', views.order_add_items,  name='add-items'),
    path('orders/session/<str:sid>/', views.order_by_session,  name='by-session'),
    path('sync/',                    views.sync_events,        name='sync'),
]
```

**`config/urls.py` ga:**
```python
    path('v1/', include('apps.orders.urls')),
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/orders/ \
  -H 'Content-Type: application/json' \
  -H 'X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -H 'Host: localhost' \
  -d '{"session_id":"gs_test","table_id":1,"items":[{"dish_id":1,"qty":2}]}' | jq
# {"id":..,"number":"#001","status":"new","total":"..."}
```

---

## V-099 — `GET /v1/orders/{id}/` + sessiya buyurtmalari

**Fayl:** `apps/orders/views.py` (davomi)

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def order_detail(request, pk):
    """
    GET /v1/orders/{id}/
    ⚡ Tenant scope + sessiya tekshiruvi — begona buyurtma ko'rinmaydi.
    """
    order = (Order.objects
             .select_related('table', 'restaurant')
             .prefetch_related('items')
             .filter(id=pk, restaurant_id=request.restaurant_id)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})

    sid = (request.headers.get('X-Session-Id')
           or request.query_params.get('session_id')
           or request.session.get('gs'))
    if order.session_id and sid != order.session_id:
        raise TenantMismatch({'order_id': pk, 'reason': 'session'})

    return Response(serialize_order(order))


@api_view(['GET'])
@permission_classes([AllowAny])
def order_by_session(request, sid):
    """GET /v1/orders/session/{sid}/ — shu sessiyaning barcha buyurtmalari (hisob uchun)"""
    qs = (Order.objects
          .select_related('table')
          .prefetch_related('items')
          .filter(restaurant_id=request.restaurant_id, session_id=sid)
          .order_by('created_at'))
    orders = [serialize_order(o) for o in qs]
    grand = sum(float(o['total']) for o in orders if
                qs.filter(id=o['id'], status__in=['new', 'accepted', 'cooking',
                                                  'ready', 'served']).exists())
    return Response({'orders': orders, 'count': len(orders),
                     'grand_total': f'{grand:.2f}'})
```

✅ **Tekshirish:**
```bash
curl -s http://localhost:8060/v1/orders/1/ -H 'X-Session-Id: gs_test' | jq .status
# "new"
curl -s http://localhost:8060/v1/orders/1/ -H 'X-Session-Id: boshqa' | jq .error.code
# "TENANT_MISMATCH"   ⚡ begona sessiya ko'ra olmaydi
```

---

## V-100 — `POST /v1/orders/{id}/add-items/`

**Fayl:** `apps/orders/views.py` (davomi)

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def order_add_items(request, pk):
    """
    POST /v1/orders/{id}/add-items/
    Mijoz "yana buyurtma" beradi — mavjud buyurtmaga qo'shiladi (yangi chek emas).
    """
    order = (Order.objects
             .select_related('restaurant', 'table')
             .prefetch_related('items')
             .filter(id=pk, restaurant_id=request.restaurant_id)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})

    sid = request.headers.get('X-Session-Id') or request.data.get('session_id')
    if order.session_id and sid != order.session_id:
        raise TenantMismatch({'order_id': pk, 'reason': 'session'})

    items = request.data.get('items') or []
    if not items:
        raise TenantMismatch({'reason': 'empty_items'})

    order = add_items(order, items)
    order.refresh_from_db()
    return Response(serialize_order(
        Order.objects.select_related('table').prefetch_related('items').get(id=order.id)))
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/orders/1/add-items/ \
  -H 'Content-Type: application/json' -H 'X-Session-Id: gs_test' \
  -d '{"items":[{"dish_id":2,"qty":1}]}' | jq '.items | length'
# 2 (yoki ko'proq)
```

---

## V-101 — WS consumer: mijoz (guest)

**Fayl:** `apps/orders/consumers.py` (birinchi qism)

```python
import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

log = logging.getLogger('orders.ws')


class BaseConsumer(AsyncWebsocketConsumer):
    """
    ⚡ Umumiy asos: guruhga qo'shilish, broadcast, heartbeat.
    Guruh nomi HAR DOIM restoran-scoped bo'lishi SHART.
    """
    groups_joined = []

    async def connect(self):
        ok = await self.authorize()
        if not ok:
            await self.close(code=4401)      # Unauthorized
            return
        for g in self.groups_joined:
            await self.channel_layer.group_add(g, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'ts': timezone.now().isoformat(),
                              'groups': self.groups_joined})
        log.info(f'[ws] ulandi: {self.groups_joined}')

    async def disconnect(self, code):
        for g in self.groups_joined:
            await self.channel_layer.group_discard(g, self.channel_name)
        log.info(f'[ws] uzildi ({code}): {self.groups_joined}')

    async def authorize(self) -> bool:
        raise NotImplementedError

    async def receive(self, text_data=None, bytes_data=None):
        try:
            msg = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return
        if msg.get('type') == 'ping':
            await self.send_json({'type': 'pong', 'ts': timezone.now().isoformat()})
            return
        await self.on_message(msg)

    async def on_message(self, msg):
        pass

    async def broadcast(self, event):
        """core.ws.ws_send → group_send({'type':'broadcast', 'message': {...}})"""
        await self.send(text_data=json.dumps(event['message'], ensure_ascii=False))

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data, ensure_ascii=False))


class GuestConsumer(BaseConsumer):
    """
    /ws/guest/<session_id>/  → guruh: guest_<session_id>
    Mijoz o'z buyurtmasi holatini jonli ko'radi.
    """
    async def authorize(self):
        from core.ws import g_guest
        sid = self.scope['url_route']['kwargs']['session_id']
        if not sid or len(sid) > 64:
            return False
        exists = await self._session_exists(sid)
        if not exists:
            return False
        self.session_id = sid
        self.groups_joined = [g_guest(sid)]
        return True

    @database_sync_to_async
    def _session_exists(self, sid):
        from apps.guest.models import GuestSession
        return GuestSession.objects.filter(session_key=sid).exists()
```

✅ **Tekshirish:** V-105 dan keyin
```bash
websocat ws://localhost:8060/ws/guest/gs_test/
# {"type":"connected","groups":["guest_gs_test"]}
```

---

## V-102 — WS consumer: ofitsiant (staff)

**Fayl:** `apps/orders/consumers.py` (davomi)

```python
class StaffConsumer(BaseConsumer):
    """
    /ws/staff/<token>/ → guruhlar: rest_<id>_waiters + staff_<staff_id>
    ⚡ Token orqali restoran aniqlanadi — cross-tenant ulanish MUMKIN EMAS.
    """
    async def authorize(self):
        from core.ws import g_waiters
        token = self.scope['url_route']['kwargs']['token']
        staff = await self._staff_by_token(token)
        if staff is None:
            return False
        self.staff_id = staff['id']
        self.restaurant_id = staff['restaurant_id']
        self.role = staff['role']
        self.my_tables = staff['tables']
        self.groups_joined = [
            g_waiters(self.restaurant_id),
            f'staff_{self.staff_id}',
        ]
        return True

    @database_sync_to_async
    def _staff_by_token(self, token):
        from apps.accounts.tokens import decode_staff_token
        from apps.accounts.models import Staff
        payload = decode_staff_token(token)
        if not payload:
            return None
        s = Staff.objects.filter(id=payload.get('sid'), is_active=True).first()
        if s is None:
            return None
        return {'id': s.id, 'restaurant_id': s.restaurant_id,
                'role': s.role, 'tables': list(s.tables or [])}

    async def on_message(self, msg):
        """Ofitsiant 'o'qidim' deb belgilaydi (badge tozalash)"""
        if msg.get('type') == 'ack':
            await self.send_json({'type': 'ack.ok', 'order_id': msg.get('order_id')})
```

**Fayl:** `apps/accounts/tokens.py` (agar FAZA 1 da yozilmagan bo'lsa)
```python
import jwt
from django.conf import settings


def encode_staff_token(staff) -> str:
    return jwt.encode({'sid': staff.id, 'rid': staff.restaurant_id,
                       'role': staff.role}, settings.SECRET_KEY, algorithm='HS256')


def decode_staff_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.PyJWTError:
        return None
```

---

## V-103 — WS consumer: KDS (oshxona)

**Fayl:** `apps/orders/consumers.py` (davomi)

```python
class KDSConsumer(BaseConsumer):
    """
    /ws/kds/<token>/ → guruh: rest_<id>_kds
    ⚡ KDS hech qachon yopilmaydi — TV brauzerida doim ochiq.
    Ulanishda darhol joriy taxta yuboriladi (sahifa yangilanmasin).
    """
    async def authorize(self):
        from core.ws import g_kds
        token = self.scope['url_route']['kwargs']['token']
        info = await self._kds_token(token)
        if info is None:
            return False
        self.restaurant_id = info['restaurant_id']
        self.groups_joined = [g_kds(self.restaurant_id)]
        return True

    @database_sync_to_async
    def _kds_token(self, token):
        from apps.accounts.tokens import decode_staff_token
        from apps.accounts.models import Staff
        payload = decode_staff_token(token)
        if payload and payload.get('role') in ('cook', 'admin', 'owner'):
            return {'restaurant_id': payload['rid']}
        # KDS terminal tokeni (Restaurant.kds_token) — TV uchun
        from apps.tenants.models import Restaurant
        r = Restaurant.objects.filter(kds_token=token, is_active=True).first()
        s = Staff.objects.filter(restaurant=r, role='cook').first() if r else None
        return {'restaurant_id': r.id} if r else (None if s is None else None)

    async def connect(self):
        await super().connect()
        if self.groups_joined:
            board = await self._board()
            await self.send_json({'type': 'board.snapshot', 'data': board})

    @database_sync_to_async
    def _board(self):
        from apps.orders.models import Order
        from apps.orders.serializers import serialize_order
        qs = (Order.objects
              .select_related('table')
              .prefetch_related('items')
              .filter(restaurant_id=self.restaurant_id,
                      status__in=['new', 'accepted', 'cooking', 'ready'])
              .order_by('created_at'))
        return [serialize_order(o) for o in qs]
```

**`apps/tenants/models.py` ga qo'shish (agar yo'q bo'lsa):**
```python
    kds_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
```
```bash
python manage.py makemigrations tenants && python manage.py migrate
```

---

## V-104 — WS consumer: admin

**Fayl:** `apps/orders/consumers.py` (davomi)

```python
class AdminConsumer(BaseConsumer):
    """
    /ws/admin/<token>/ → guruh: rest_<id>_admin
    A-01 dashboard "jonli oqim" shu yerdan oziqlanadi.
    """
    async def authorize(self):
        from core.ws import g_admin
        token = self.scope['url_route']['kwargs']['token']
        info = await self._admin_token(token)
        if info is None:
            return False
        self.restaurant_id = info['restaurant_id']
        self.groups_joined = [g_admin(self.restaurant_id)]
        return True

    @database_sync_to_async
    def _admin_token(self, token):
        from apps.accounts.tokens import decode_staff_token
        payload = decode_staff_token(token)
        if not payload or payload.get('role') not in ('admin', 'owner'):
            return None
        return {'restaurant_id': payload['rid']}
```

✅ **Test:** `tests/test_ws_isolation.py`
```python
import pytest
from channels.testing import WebsocketCommunicator
from config.asgi import application


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_bad_token_rejected():
    comm = WebsocketCommunicator(application, '/ws/kds/xato-token/')
    connected, _ = await comm.connect()
    assert connected is False        # ⚡ 4401 bilan yopiladi
```

---

## V-105 — `config/routing.py`

**Fayl:** `config/routing.py`
```python
from django.urls import re_path

from apps.orders import consumers

websocket_urlpatterns = [
    re_path(r'^ws/guest/(?P<session_id>[\w\-]{1,64})/$', consumers.GuestConsumer.as_asgi()),
    re_path(r'^ws/staff/(?P<token>[\w\.\-]+)/$',         consumers.StaffConsumer.as_asgi()),
    re_path(r'^ws/kds/(?P<token>[\w\.\-]+)/$',           consumers.KDSConsumer.as_asgi()),
    re_path(r'^ws/admin/(?P<token>[\w\.\-]+)/$',         consumers.AdminConsumer.as_asgi()),
]
```

**Fayl:** `config/asgi.py`
```python
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

from django.core.asgi import get_asgi_application  # noqa: E402

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from config.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(URLRouter(websocket_urlpatterns)),
})
```

✅ **Tekshirish:**
```bash
daphne -b 127.0.0.1 -p 8060 config.asgi:application &
websocat ws://localhost:8060/ws/guest/gs_test/
# {"type":"connected",...}
```

---

## V-106 — Heartbeat + reconnect (server tomoni)

**Fayl:** `apps/orders/consumers.py` (`BaseConsumer` ga qo'shiladi)

> ⚡ Muammo: nginx/mobil operator 60 soniya jim turgan WS ni uzadi.
> Yechim: server har 25 soniyada `ping` yuboradi, klient `pong` qaytaradi.
> 2 ta `pong` kelmasa — ulanish o'lik deb hisoblanadi va yopiladi.

```python
import asyncio


class BaseConsumer(AsyncWebsocketConsumer):
    groups_joined = []
    HEARTBEAT_SEC = 25
    MISS_LIMIT = 2

    async def connect(self):
        ok = await self.authorize()
        if not ok:
            await self.close(code=4401)
            return
        for g in self.groups_joined:
            await self.channel_layer.group_add(g, self.channel_name)
        await self.accept()
        self._missed = 0
        self._hb = asyncio.create_task(self._heartbeat())
        await self.send_json({'type': 'connected', 'ts': timezone.now().isoformat(),
                              'groups': self.groups_joined,
                              'heartbeat_sec': self.HEARTBEAT_SEC})

    async def disconnect(self, code):
        hb = getattr(self, '_hb', None)
        if hb:
            hb.cancel()
        for g in self.groups_joined:
            await self.channel_layer.group_discard(g, self.channel_name)

    async def _heartbeat(self):
        try:
            while True:
                await asyncio.sleep(self.HEARTBEAT_SEC)
                if self._missed >= self.MISS_LIMIT:
                    log.warning(f'[ws] pong kelmadi ×{self._missed} — yopiladi')
                    await self.close(code=4408)
                    return
                self._missed += 1
                await self.send_json({'type': 'ping',
                                      'ts': timezone.now().isoformat()})
        except asyncio.CancelledError:
            pass

    async def receive(self, text_data=None, bytes_data=None):
        try:
            msg = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return
        t = msg.get('type')
        if t == 'pong':
            self._missed = 0
            return
        if t == 'ping':
            self._missed = 0
            await self.send_json({'type': 'pong', 'ts': timezone.now().isoformat()})
            return
        await self.on_message(msg)
```

**Klient tomoni (barcha panellar uchun umumiy):**
**Fayl:** `static/common/js/reliable-ws.js`
```javascript
/* ⚡ Uzilishga chidamli WebSocket — ofitsiant, KDS, admin, mijoz uchun */
class ReliableWS {
  constructor(url, handlers = {}) {
    this.url = url;
    this.handlers = handlers;
    this.retries = 0;
    this.lastSeq = 0;
    this.pollTimer = null;
    this.hbTimer = null;
    this.connect();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && (!this.ws || this.ws.readyState !== 1)) this.connect();
    });
  }

  connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retries = 0;
      this.stopPolling();
      this.startHeartbeat();
      this.syncMissed();
      if (this.handlers.onopen) this.handlers.onopen();
    };

    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === 'ping') { this.send({type: 'pong'}); return; }
      if (m.type === 'pong') return;
      if (m.seq && m.seq <= this.lastSeq) return;     // ⚡ dublikat tashlanadi
      if (m.seq) this.lastSeq = m.seq;
      const h = this.handlers[m.type] || this.handlers['*'];
      if (h) h(m);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      const base = Math.min(1000 * Math.pow(2, this.retries), 30000);
      const delay = base * (0.8 + Math.random() * 0.4);   // jitter
      this.retries++;
      setTimeout(() => this.connect(), delay);
      if (this.retries > 3) this.startPolling();          // ⚡ REST fallback
      if (this.handlers.onclose) this.handlers.onclose(this.retries);
    };

    this.ws.onerror = () => { try { this.ws.close(); } catch (_) {} };
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.hbTimer = setInterval(() => this.send({type: 'ping'}), 20000);
  }
  stopHeartbeat() { if (this.hbTimer) clearInterval(this.hbTimer); this.hbTimer = null; }

  async syncMissed() {
    try {
      const r = await fetch(`/v1/sync/?since_seq=${this.lastSeq}`,
                            {headers: this.authHeaders()});
      if (!r.ok) return;
      const j = await r.json();
      (j.events || []).forEach(m => {
        if (m.seq) this.lastSeq = Math.max(this.lastSeq, m.seq);
        const h = this.handlers[m.type] || this.handlers['*'];
        if (h) h(m);
      });
    } catch (_) {}
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.syncMissed(), 10000);
  }
  stopPolling() { if (this.pollTimer) clearInterval(this.pollTimer); this.pollTimer = null; }

  authHeaders() {
    const t = localStorage.getItem('staff_token');
    return t ? {'Authorization': 'Bearer ' + t} : {};
  }
}
window.ReliableWS = ReliableWS;
```

---

## V-107 — ⚡ `GET /v1/sync/?since_seq=` (o'tkazib yuborilganlarni tiklash)

**Fayl:** `core/ws.py` ga qo'shiladi (jurnal yozish)

> WS uzilgan paytda kelgan xabarlar yo'qoladi. Yechim: har xabar Redis
> ro'yxatiga ham yoziladi (oxirgi 500 ta, TTL 1 soat). Klient ulanganda
> `since_seq` bilan so'rab, o'tkazib yuborganlarini oladi.

```python
import json

JOURNAL_MAX = 500
JOURNAL_TTL = 3600


def _journal(group: str, message: dict):
    """Har WS xabarning nusxasi — sync uchun"""
    from core.queue import get_redis
    try:
        r = get_redis()
        key = f'ws:journal:{group}'
        r.lpush(key, json.dumps(message, ensure_ascii=False))
        r.ltrim(key, 0, JOURNAL_MAX - 1)
        r.expire(key, JOURNAL_TTL)
    except Exception as e:
        log.warning(f'[ws] jurnalga yozilmadi: {e}')


def read_journal(group: str, since_seq: int = 0, limit: int = 200):
    """since_seq dan keyingi xabarlar (eskidan yangiga tartibda)"""
    from core.queue import get_redis
    try:
        raw = get_redis().lrange(f'ws:journal:{group}', 0, limit - 1)
    except Exception:
        return []
    out = []
    for s in raw:
        try:
            m = json.loads(s)
        except json.JSONDecodeError:
            continue
        if m.get('seq', 0) > since_seq:
            out.append(m)
    return sorted(out, key=lambda m: m.get('seq', 0))
```

**`ws_send()` ichida `group_send` dan keyin:**
```python
        _journal(group, payload_message)
```
(to'liq ko'rinishi:)
```python
def ws_send(group: str, msg_type: str, data: dict):
    layer = get_channel_layer()
    message = {
        'type': msg_type,
        'ts': timezone.now().isoformat(),
        'data': data,
        'seq': next_seq(group),
    }
    _journal(group, message)              # ⚡ avval jurnalga
    if layer is None:
        log.warning('[ws] channel layer yo\'q'); return
    try:
        async_to_sync(layer.group_send)(group, {'type': 'broadcast',
                                                'message': message})
    except Exception as e:
        log.error(f'[ws] {group}/{msg_type} yuborilmadi: {e}')
```

**Fayl:** `apps/orders/views.py` (davomi)
```python
@api_view(['GET'])
@permission_classes([AllowAny])
def sync_events(request):
    """
    GET /v1/sync/?since_seq=1047[&scope=kds|waiters|admin|guest]
    ⚡ WS uzilib qolgan paytdagi xabarlarni qaytaradi.
    """
    from core.ws import read_journal, g_kds, g_waiters, g_admin, g_guest
    from apps.accounts.tokens import decode_staff_token

    since = int(request.query_params.get('since_seq') or 0)
    scope = request.query_params.get('scope', '')

    auth = request.headers.get('Authorization', '')
    payload = decode_staff_token(auth.replace('Bearer ', '')) if auth else None

    if payload:
        rid = payload['rid']
        role = payload.get('role')
        group = {'kds': g_kds(rid), 'waiters': g_waiters(rid),
                 'admin': g_admin(rid)}.get(scope)
        if group is None:
            group = {'cook': g_kds(rid), 'waiter': g_waiters(rid),
                     'admin': g_admin(rid), 'owner': g_admin(rid)}.get(role, g_waiters(rid))
    else:
        sid = (request.headers.get('X-Session-Id')
               or request.query_params.get('session_id'))
        if not sid:
            raise TenantMismatch({'reason': 'no_session'})
        group = g_guest(sid)

    events = read_journal(group, since_seq=since)
    return Response({'events': events, 'count': len(events),
                     'last_seq': events[-1]['seq'] if events else since})
```

✅ **Test:** `tests/test_sync.py`
```python
import pytest
from core.ws import ws_send, read_journal


@pytest.mark.django_db
def test_journal_returns_only_newer():
    ws_send('rest_1_kds', 'order.new', {'id': 1})
    ws_send('rest_1_kds', 'order.new', {'id': 2})
    all_ev = read_journal('rest_1_kds', 0)
    assert len(all_ev) >= 2
    newer = read_journal('rest_1_kds', all_ev[0]['seq'])
    assert all(e['seq'] > all_ev[0]['seq'] for e in newer)
```

---

## V-108 — Ofitsiant paneli sahifasi (O-02)

**Fayl:** `templates/staff/orders.html`

> 📱 Telefonda ishlaydi. ⚡ **Stol raqami — eng katta element** (ofitsiant
> yugurib ketayotib bir qarashda ko'rishi kerak).

```html
{% load i18n static %}<!-- templates/staff/orders.html -->
<!doctype html>
<html lang="{{ LANGUAGE_CODE }}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{% trans "Buyurtmalar" %} — ARMENU</title>
  <link rel="stylesheet" href="{% static 'staff/css/staff.css' %}?v=1">
</head>
<body class="staff">

<header class="s-head">
  <div class="s-head__left">
    <span class="s-avatar">🧑‍🍳</span>
    <div>
      <div class="s-name" id="staffName">—</div>
      <div class="s-shift" id="shiftTime">{% trans "Smena" %}: —</div>
    </div>
  </div>
  <div class="s-head__right">
    <span class="s-conn" id="connDot" title="{% trans 'Ulanish' %}">●</span>
    <button class="s-icon" id="btnSound" title="{% trans 'Tovush' %}">🔔</button>
  </div>
</header>

<div class="s-stats" id="myStats">
  <span>{% trans "Bugun" %}: <b id="stTables">0</b> {% trans "stol" %}</span>
  <span><b id="stSum">0</b> {% trans "so'm" %}</span>
  <span>💝 <b id="stTips">0</b></span>
</div>

<div class="s-newbar" id="newBar" hidden>
  🔔 <b id="newCount">0</b> {% trans "ta yangi" %}
</div>

<main class="s-list" id="orderList">
  <div class="s-empty" id="emptyBox">
    <div class="s-empty__icon">🍽</div>
    <p>{% trans "Hozircha yangi buyurtma yo'q" %}</p>
  </div>
</main>

<nav class="s-tabs">
  <a class="s-tab is-active" href="{% url 'staff:orders' %}">📋 {% trans "Buyurtma" %}</a>
  <a class="s-tab" href="{% url 'staff:hall' %}">🗺 {% trans "Zal" %}</a>
  <a class="s-tab" href="{% url 'staff:calls' %}">🔔 <span class="s-badge" id="callBadge">0</span></a>
  <a class="s-tab" href="{% url 'staff:stats' %}">📊</a>
</nav>

<!-- ⚡ Buyurtma kartasi shabloni — JS klonlaydi -->
<template id="tplOrder">
  <article class="ocard" data-id="">
    <header class="ocard__top">
      <span class="ocard__num"></span>
      <span class="ocard__table">🪑 {% trans "STOL" %} <b></b></span>
      <span class="ocard__age"></span>
    </header>
    <ul class="ocard__items"></ul>
    <p class="ocard__note" hidden></p>
    <div class="ocard__total"></div>
    <div class="ocard__actions"></div>
  </article>
</template>

<audio id="sndNew"   src="{% static 'staff/snd/new_order.mp3' %}" preload="auto"></audio>
<audio id="sndReady" src="{% static 'staff/snd/ready.mp3' %}" preload="auto"></audio>

<script>
  window.STAFF = {
    token:  localStorage.getItem('staff_token') || '',
    id:     {{ staff.id }},
    name:   "{{ staff.user.get_full_name|default:staff.user.username|escapejs }}",
    tables: {{ staff.tables|default:"[]"|safe }},
    wsUrl:  "{{ ws_scheme }}://{{ request.get_host }}/ws/staff/" +
            (localStorage.getItem('staff_token') || '') + "/",
  };
</script>
<script src="{% static 'common/js/reliable-ws.js' %}?v=1"></script>
<script src="{% static 'staff/js/orders.js' %}?v=1"></script>
</body>
</html>
```

**Fayl:** `static/staff/css/staff.css` (asosiy qism)
```css
:root{
  --bg:#F6F7F9; --card:#fff; --tx:#111827; --mut:#6B7280; --line:#E5E7EB;
  --brand:#E85D2A; --ok:#16A34A; --warn:#F59E0B; --bad:#DC2626;
}
:root:not([data-theme="light"]){ @media (prefers-color-scheme: dark){
  --bg:#0F1115; --card:#171A21; --tx:#F3F4F6; --mut:#9CA3AF; --line:#252A34;
}}
[data-theme="dark"]{
  --bg:#0F1115; --card:#171A21; --tx:#F3F4F6; --mut:#9CA3AF; --line:#252A34;
}
*{box-sizing:border-box}
body.staff{margin:0;background:var(--bg);color:var(--tx);
  font:15px/1.4 -apple-system,"Segoe UI",Roboto,sans-serif;padding-bottom:64px}

.s-head{display:flex;justify-content:space-between;align-items:center;
  padding:10px 14px;background:var(--card);border-bottom:1px solid var(--line);
  position:sticky;top:0;z-index:10}
.s-head__left{display:flex;gap:10px;align-items:center}
.s-avatar{font-size:28px}
.s-name{font-weight:700}
.s-shift{font-size:12px;color:var(--mut)}
.s-conn{font-size:12px;color:var(--ok)}
.s-conn.is-off{color:var(--bad)}
.s-icon{border:0;background:transparent;font-size:20px;cursor:pointer}

.s-stats{display:flex;gap:14px;padding:8px 14px;font-size:13px;color:var(--mut);
  background:var(--card);border-bottom:1px solid var(--line)}
.s-newbar{padding:8px 14px;background:var(--brand);color:#fff;font-weight:600}

.s-list{padding:12px;display:flex;flex-direction:column;gap:12px}
.s-empty{text-align:center;padding:60px 20px;color:var(--mut)}
.s-empty__icon{font-size:48px}

/* ⚡ Buyurtma kartasi */
.ocard{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.ocard__top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.ocard__num{font-weight:700;font-size:18px}
/* ⚡ STOL RAQAMI — eng katta element */
.ocard__table{margin-left:auto;font-size:14px;color:var(--mut)}
.ocard__table b{font-size:30px;font-weight:800;color:var(--tx);line-height:1}
.ocard__age{font-size:12px;color:var(--mut);min-width:52px;text-align:right}
.ocard__items{list-style:none;margin:0;padding:0;font-size:15px}
.ocard__items li{padding:2px 0}
.ocard__items b{font-weight:700}
.ocard__note{margin:6px 0 0;padding:6px 8px;background:#FEF3C7;color:#92400E;
  border-radius:8px;font-size:13px}
.ocard__total{margin-top:8px;font-weight:700;font-size:17px}
.ocard__actions{margin-top:10px;display:flex;gap:8px}
.btn{flex:1;border:0;border-radius:10px;padding:14px;font-size:16px;
  font-weight:700;cursor:pointer;color:#fff}
.btn--accept{background:var(--brand)}
.btn--serve{background:var(--ok)}
.btn--ghost{background:transparent;color:var(--mut);border:1px solid var(--line);flex:0 0 44px}

/* Tayyor buyurtma — yashil pulsatsiya */
.ocard.is-ready{border-color:var(--ok);animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}
  50%{box-shadow:0 0 0 10px rgba(22,163,74,0)}
}
.s-tabs{position:fixed;bottom:0;left:0;right:0;display:flex;background:var(--card);
  border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom)}
.s-tab{flex:1;text-align:center;padding:12px 0;text-decoration:none;color:var(--mut);
  font-size:13px}
.s-tab.is-active{color:var(--brand);font-weight:700}
.s-badge{background:var(--bad);color:#fff;border-radius:9px;padding:0 6px;font-size:11px}
```

✅ **Tekshirish:** `/staff/orders/` ochiladi, dark va light rejimda ham to'g'ri ko'rinadi.

---

## V-109 — Ofitsiant JS + WS + tovush + vibratsiya

**Fayl:** `static/staff/js/orders.js`

```javascript
/* ARMENU — ofitsiant paneli (O-02) */
(function () {
  'use strict';

  const S = window.STAFF;
  const list = document.getElementById('orderList');
  const empty = document.getElementById('emptyBox');
  const tpl = document.getElementById('tplOrder');
  const newBar = document.getElementById('newBar');
  const newCount = document.getElementById('newCount');
  const connDot = document.getElementById('connDot');
  const sndNew = document.getElementById('sndNew');
  const sndReady = document.getElementById('sndReady');

  let orders = new Map();          // id → order
  let soundOn = localStorage.getItem('staff_sound') !== '0';
  let audioUnlocked = false;

  document.getElementById('staffName').textContent = S.name;
  document.getElementById('btnSound').textContent = soundOn ? '🔔' : '🔕';
  document.getElementById('btnSound').onclick = () => {
    soundOn = !soundOn;
    localStorage.setItem('staff_sound', soundOn ? '1' : '0');
    document.getElementById('btnSound').textContent = soundOn ? '🔔' : '🔕';
  };

  // ⚡ Brauzer avtoo'ynatishni bloklaydi — birinchi teginishda ochamiz
  document.addEventListener('touchstart', unlockAudio, {once: true});
  document.addEventListener('click', unlockAudio, {once: true});
  function unlockAudio() {
    if (audioUnlocked) return;
    [sndNew, sndReady].forEach(a => {
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
    });
    audioUnlocked = true;
  }

  function isMine(o) {
    // ⚡ Faqat mening stollarim (yoki menga biriktirilgan)
    if (!S.tables || !S.tables.length) return true;      // stol biriktirilmagan → hammasi
    return S.tables.includes(o.table_id) || o.waiter_id === S.id;
  }

  function fmt(n) {
    return Math.round(Number(n)).toLocaleString('ru-RU').replace(/,/g, ' ');
  }

  function ageText(sec) {
    const m = Math.floor(sec / 60);
    return m < 1 ? `${sec} s` : `${m} daq`;
  }

  function render() {
    const arr = [...orders.values()]
      .filter(o => ['new', 'accepted', 'cooking', 'ready'].includes(o.status))
      .sort((a, b) => {
        const w = s => ({ready: 0, new: 1, accepted: 2, cooking: 3}[s] ?? 9);
        return w(a.status) - w(b.status) ||
               new Date(a.created_at) - new Date(b.created_at);
      });

    list.querySelectorAll('.ocard').forEach(n => n.remove());
    empty.hidden = arr.length > 0;

    arr.forEach(o => list.appendChild(card(o)));

    const nNew = arr.filter(o => o.status === 'new').length;
    newBar.hidden = nNew === 0;
    newCount.textContent = nNew;
  }

  function card(o) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = o.id;
    node.classList.toggle('is-ready', o.status === 'ready');

    const icon = {new: '🆕', accepted: '📥', cooking: '🍳', ready: '✅'}[o.status] || '';
    node.querySelector('.ocard__num').textContent = `${icon} ${o.number}`;
    node.querySelector('.ocard__table b').textContent = o.table_no;
    node.querySelector('.ocard__age').textContent = ageText(o.age_sec);

    const ul = node.querySelector('.ocard__items');
    o.items.forEach(it => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${it.name}</b> × ${it.qty}` +
        (it.modifiers && it.modifiers.length
          ? ` <span style="color:var(--mut)">+${it.modifiers.map(m => m.name).join(', ')}</span>`
          : '');
      ul.appendChild(li);
    });

    const notes = o.items.filter(i => i.note).map(i => `${i.name}: ${i.note}`);
    if (o.note) notes.unshift(o.note);
    const np = node.querySelector('.ocard__note');
    if (notes.length) { np.hidden = false; np.textContent = '💬 ' + notes.join(' · '); }

    node.querySelector('.ocard__total').textContent = fmt(o.total) + " so'm";

    const act = node.querySelector('.ocard__actions');
    if (o.status === 'new') {
      act.appendChild(btn('✅ QABUL QILDIM', 'btn--accept', () => act1(o.id, 'accept')));
    } else if (o.status === 'ready') {
      act.appendChild(btn('🍽 OLIB BORDIM', 'btn--serve', () => act1(o.id, 'serve')));
    } else {
      const s = document.createElement('div');
      s.style.cssText = 'color:var(--mut);padding:10px 0';
      s.textContent = o.status === 'cooking' ? 'Tayyorlanmoqda…' : 'Qabul qilindi';
      act.appendChild(s);
    }
    return node;
  }

  function btn(text, cls, fn) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = text;
    b.onclick = () => { b.disabled = true; b.textContent = '…'; fn(); };
    return b;
  }

  async function act1(id, action) {
    try {
      const r = await fetch(`/v1/staff/orders/${id}/${action}/`, {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + S.token,
                  'Content-Type': 'application/json'},
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error ? j.error.message_uz : 'Xato'); loadAll(); return; }
      orders.set(j.id, j);
      render();
    } catch (e) {
      alert('Tarmoq xatosi. Qayta urinib ko\'ring.');
      render();
    }
  }

  function beep(el) {
    if (!soundOn) return;
    try { el.currentTime = 0; el.play().catch(() => {}); } catch (_) {}
  }
  function buzz(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // ---- WebSocket ----
  const ws = new ReliableWS(S.wsUrl, {
    onopen:  () => connDot.classList.remove('is-off'),
    onclose: () => connDot.classList.add('is-off'),

    'order.new': (m) => {
      const o = m.data.order;
      if (!isMine(o)) return;                       // ⚡ faqat mening stolim
      orders.set(o.id, o);
      beep(sndNew);
      buzz([300, 100, 300]);
      render();
      if (document.hidden) notify(`Stol ${o.table_no} — yangi buyurtma`, o.number);
    },

    'order.ready': (m) => {
      const o = m.data.order;
      if (!isMine(o)) return;
      orders.set(o.id, o);
      beep(sndReady);
      buzz([200, 80, 200, 80, 400]);
      render();
      if (document.hidden) notify(`Stol ${o.table_no} — TAYYOR!`, o.number);
    },

    'order.status': (m) => {
      const o = m.data.order;
      if (!isMine(o)) return;
      if (['paid', 'cancelled'].includes(o.status)) orders.delete(o.id);
      else orders.set(o.id, {...(orders.get(o.id) || {}), ...o});
      render();
    },

    'order.items_added': (m) => {
      const o = m.data.order;
      if (!isMine(o)) return;
      orders.set(o.id, o);
      beep(sndNew);
      render();
    },

    'call.new': (m) => {
      beep(sndNew); buzz([500]);
      const b = document.getElementById('callBadge');
      b.textContent = Number(b.textContent || 0) + 1;
    },
  });

  function notify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, {body});
    else if (Notification.permission !== 'denied') Notification.requestPermission();
  }

  // ---- Boshlang'ich yuklash ----
  async function loadAll() {
    const r = await fetch('/v1/staff/orders/?status=open',
                          {headers: {'Authorization': 'Bearer ' + S.token}});
    if (!r.ok) return;
    const j = await r.json();
    orders = new Map(j.orders.filter(isMine).map(o => [o.id, o]));
    render();
    document.getElementById('stTables').textContent = j.stats.tables || 0;
    document.getElementById('stSum').textContent = fmt(j.stats.sum || 0);
    document.getElementById('stTips').textContent = fmt(j.stats.tips || 0);
  }
  loadAll();

  // Taymerlar (yosh ko'rsatkichi) — har 15 s
  setInterval(() => {
    orders.forEach(o => o.age_sec = (o.age_sec || 0) + 15);
    document.querySelectorAll('.ocard').forEach(n => {
      const o = orders.get(Number(n.dataset.id));
      if (o) n.querySelector('.ocard__age').textContent = ageText(o.age_sec);
    });
  }, 15000);
})();
```

✅ **Tekshirish:** Ikki brauzer oching — birida mijoz buyurtma bersin, ofitsiant
panelida 1 soniyada karta chiqishi + tovush + vibratsiya bo'lishi kerak.

---

## V-110 — `POST /v1/staff/orders/{id}/accept|serve/`

**Fayl:** `apps/orders/staff_views.py`

```python
import logging

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.exceptions import TenantMismatch
from core.permissions import IsStaff
from apps.orders.models import Order
from apps.orders.serializers import serialize_order
from apps.orders.state import transition

log = logging.getLogger('orders.staff')

OPEN_STATUSES = ['new', 'accepted', 'cooking', 'ready']


def _get_order(request, pk):
    """⚡ DOIM tenant-scoped olish — boshqa restoran buyurtmasiga tegib bo'lmaydi"""
    order = (Order.objects
             .select_related('table', 'restaurant')
             .prefetch_related('items')
             .filter(id=pk, restaurant_id=request.staff.restaurant_id)
             .first())
    if order is None:
        raise TenantMismatch({'order_id': pk})
    return order


@api_view(['GET'])
@permission_classes([IsStaff])
def staff_orders(request):
    """GET /v1/staff/orders/?status=open|new|ready"""
    st = request.query_params.get('status', 'open')
    qs = (Order.objects
          .select_related('table')
          .prefetch_related('items')
          .filter(restaurant_id=request.staff.restaurant_id))
    qs = qs.filter(status__in=OPEN_STATUSES) if st == 'open' else qs.filter(status=st)
    qs = qs.order_by('created_at')[:200]

    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    agg = (Order.objects
           .filter(restaurant_id=request.staff.restaurant_id,
                   waiter=request.staff, created_at__gte=start,
                   status__in=['served', 'paid'])
           .aggregate(s=Sum('total'), c=Count('table', distinct=True)))

    return Response({
        'orders': [serialize_order(o) for o in qs],
        'stats': {'sum': float(agg['s'] or 0), 'tables': agg['c'] or 0,
                  'tips': float(getattr(request.staff, 'tips_balance', 0) or 0)},
    })


@api_view(['POST'])
@permission_classes([IsStaff])
def order_accept(request, pk):
    """POST /v1/staff/orders/{id}/accept/ → new → accepted (+ ofitsiant biriktiriladi)"""
    order = _get_order(request, pk)
    transition(order, 'accepted', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[staff] {request.staff.id} qabul qildi: {order.number}')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsStaff])
def order_serve(request, pk):
    """POST /v1/staff/orders/{id}/serve/ → ready → served"""
    order = _get_order(request, pk)
    transition(order, 'served', actor=request.staff)
    order.refresh_from_db()
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsStaff])
def order_cancel(request, pk):
    """POST /v1/staff/orders/{id}/cancel/ {reason}"""
    order = _get_order(request, pk)
    transition(order, 'cancelled', actor=request.staff,
               reason=request.data.get('reason', ''))
    order.refresh_from_db()
    return Response(serialize_order(order))
```

**Fayl:** `core/permissions.py` (agar FAZA 1 da yozilmagan bo'lsa)
```python
from rest_framework.permissions import BasePermission

from apps.accounts.tokens import decode_staff_token


class IsStaff(BasePermission):
    """⚡ JWT dan Staff ni oladi va request.staff ga qo'yadi"""
    roles = None            # None = har qanday xodim

    def has_permission(self, request, view):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return False
        payload = decode_staff_token(auth[7:])
        if not payload:
            return False
        from apps.accounts.models import Staff
        staff = Staff.objects.select_related('restaurant').filter(
            id=payload.get('sid'), is_active=True).first()
        if staff is None:
            return False
        if self.roles and staff.role not in self.roles:
            return False
        request.staff = staff
        request.restaurant_id = staff.restaurant_id
        return True


class IsCook(IsStaff):
    roles = {'cook', 'admin', 'owner'}


class IsAdmin(IsStaff):
    roles = {'admin', 'owner'}
```

**Fayl:** `apps/orders/staff_urls.py`
```python
from django.urls import path
from apps.orders import staff_views as v

app_name = 'orders_staff'

urlpatterns = [
    path('staff/orders/',                    v.staff_orders,  name='list'),
    path('staff/orders/<int:pk>/accept/',    v.order_accept,  name='accept'),
    path('staff/orders/<int:pk>/serve/',     v.order_serve,   name='serve'),
    path('staff/orders/<int:pk>/cancel/',    v.order_cancel,  name='cancel'),
    path('staff/orders/<int:pk>/cook/',      v.order_cook,    name='cook'),   # V-113
    path('staff/orders/<int:pk>/ready/',     v.order_ready,   name='ready'),  # V-113
]
```
`config/urls.py` ga: `path('v1/', include('apps.orders.staff_urls')),`

✅ **Tekshirish:**
```bash
TOKEN=$(python manage.py shell -c "
from apps.accounts.models import Staff
from apps.accounts.tokens import encode_staff_token
print(encode_staff_token(Staff.objects.filter(role='waiter').first()))")
curl -s -X POST http://localhost:8060/v1/staff/orders/1/accept/ \
  -H "Authorization: Bearer $TOKEN" | jq .status
# "accepted"
curl -s -X POST http://localhost:8060/v1/staff/orders/1/accept/ \
  -H "Authorization: Bearer $TOKEN" | jq .error.code
# "INVALID_TRANSITION"   ⚡ ikkinchi marta ishlamaydi
```

---

## V-111 — ⚡ KDS sahifasi (K-01) — dark, 3 metrdan o'qiladigan

**Fayl:** `templates/kds/board.html`

> ⚡ TV brauzerida doim ochiq turadi. Neon-dark uslub, **stol raqami 56px**.
> Sichqoncha yo'q — barmoq/masofaviy pult bilan bosiladi, tugmalar KATTA.

```html
{% load i18n static %}<!-- templates/kds/board.html -->
<!doctype html>
<html lang="{{ LANGUAGE_CODE }}" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>🍳 {% trans "Oshxona" %} — ARMENU</title>
  <link rel="stylesheet" href="{% static 'kds/css/board.css' %}?v=1">
</head>
<body class="kds">

<header class="k-head">
  <div class="k-title">🍳 {% trans "OSHXONA" %}</div>
  <div class="k-clock" id="clock">--:--</div>
  <div class="k-metrics">
    <span>{% trans "Faol" %}: <b id="mActive">0</b></span>
    <span>{% trans "O'rtacha" %}: <b id="mAvg">0</b> {% trans "daq" %}</span>
    <span class="k-conn" id="connDot">●</span>
  </div>
</header>

<main class="k-board">
  <section class="k-col" data-col="new">
    <h2 class="k-col__h k-col__h--new">🆕 {% trans "YANGI" %} (<span data-count>0</span>)</h2>
    <div class="k-col__body" id="colNew"></div>
  </section>
  <section class="k-col" data-col="cooking">
    <h2 class="k-col__h k-col__h--cook">🍳 {% trans "TAYYORLANMOQDA" %} (<span data-count>0</span>)</h2>
    <div class="k-col__body" id="colCooking"></div>
  </section>
  <section class="k-col" data-col="ready">
    <h2 class="k-col__h k-col__h--ready">✅ {% trans "TAYYOR" %} (<span data-count>0</span>)</h2>
    <div class="k-col__body" id="colReady"></div>
  </section>
</main>

<template id="tplKCard">
  <article class="kcard" data-id="">
    <header class="kcard__top">
      <span class="kcard__num"></span>
      <span class="kcard__table">{% trans "STOL" %} <b></b></span>
    </header>
    <div class="kcard__timer">⏱ <span></span></div>
    <ul class="kcard__items"></ul>
    <button class="kbtn"></button>
  </article>
</template>

<audio id="sndLate" src="{% static 'kds/snd/late.mp3' %}" preload="auto"></audio>
<audio id="sndNew"  src="{% static 'kds/snd/new.mp3' %}" preload="auto"></audio>

<script>
  window.KDS = {
    token: "{{ kds_token }}",
    wsUrl: "{{ ws_scheme }}://{{ request.get_host }}/ws/kds/{{ kds_token }}/",
  };
</script>
<script src="{% static 'common/js/reliable-ws.js' %}?v=1"></script>
<script src="{% static 'kds/js/board.js' %}?v=1"></script>
</body>
</html>
```

**Fayl:** `static/kds/css/board.css`
```css
/* ⚡ KDS — dark neon, 3 metrdan o'qiladigan */
:root{
  --k-bg:#0A0C10; --k-panel:#12161E; --k-card:#1A1F2B; --k-line:#262D3B;
  --k-tx:#E8EDF5; --k-mut:#8B95A8;
  --k-new:#3B82F6; --k-cook:#F59E0B; --k-ready:#22C55E;
  --k-green:#22C55E; --k-yellow:#EAB308; --k-orange:#F97316; --k-red:#EF4444;
}
/* KDS DOIM dark — TV ekranida yorug'lik charchatadi.
   Light rejim uchun ham aynan shu palitra saqlanadi (ataylab). */
*{box-sizing:border-box}
html,body{height:100%}
body.kds{margin:0;background:var(--k-bg);color:var(--k-tx);overflow:hidden;
  font:16px/1.3 -apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}

.k-head{display:flex;align-items:center;gap:24px;padding:14px 24px;
  background:var(--k-panel);border-bottom:1px solid var(--k-line);height:72px}
.k-title{font-size:26px;font-weight:800;letter-spacing:.5px}
.k-clock{font-size:32px;font-weight:700;font-variant-numeric:tabular-nums;
  margin-left:auto}
.k-metrics{display:flex;gap:22px;font-size:18px;color:var(--k-mut)}
.k-metrics b{color:var(--k-tx);font-size:22px}
.k-conn{color:var(--k-green);font-size:16px}
.k-conn.is-off{color:var(--k-red);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:.2}}

.k-board{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;
  height:calc(100% - 72px);background:var(--k-line)}
.k-col{background:var(--k-bg);display:flex;flex-direction:column;min-width:0}
.k-col__h{margin:0;padding:12px 16px;font-size:20px;font-weight:800;
  letter-spacing:.5px;background:var(--k-panel)}
.k-col__h--new  {color:var(--k-new);   box-shadow:inset 0 -3px 0 var(--k-new)}
.k-col__h--cook {color:var(--k-cook);  box-shadow:inset 0 -3px 0 var(--k-cook)}
.k-col__h--ready{color:var(--k-ready); box-shadow:inset 0 -3px 0 var(--k-ready)}
.k-col__body{flex:1;overflow-y:auto;padding:12px;display:flex;
  flex-direction:column;gap:12px}
.k-col__body::-webkit-scrollbar{width:8px}
.k-col__body::-webkit-scrollbar-thumb{background:var(--k-line);border-radius:4px}

/* ⚡ Karta */
.kcard{background:var(--k-card);border:2px solid var(--k-line);border-radius:12px;
  padding:14px;transition:border-color .3s}
.kcard__top{display:flex;align-items:baseline;gap:12px;margin-bottom:6px}
.kcard__num{font-size:26px;font-weight:800;color:var(--k-mut)}
/* ⚡ STOL RAQAMI — 56px, uzoqdan o'qiladi */
.kcard__table{margin-left:auto;font-size:16px;color:var(--k-mut);
  display:flex;align-items:baseline;gap:8px}
.kcard__table b{font-size:56px;font-weight:900;line-height:.9;color:var(--k-tx)}
.kcard__timer{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;
  margin:6px 0 10px}
.kcard__items{list-style:none;margin:0 0 12px;padding:0}
.kcard__items li{font-size:24px;font-weight:700;padding:4px 0;
  border-bottom:1px solid var(--k-line)}
.kcard__items li:last-child{border-bottom:0}
.kcard__items .qty{color:var(--k-cook)}
.kcard__items .note{display:block;font-size:17px;font-weight:600;
  color:var(--k-orange);margin-top:2px}

/* ⚡ Vaqt ranglari — oshpazga bosim */
.kcard.t-green  {border-color:var(--k-green)}
.kcard.t-green  .kcard__timer{color:var(--k-green)}
.kcard.t-yellow {border-color:var(--k-yellow)}
.kcard.t-yellow .kcard__timer{color:var(--k-yellow)}
.kcard.t-orange {border-color:var(--k-orange)}
.kcard.t-orange .kcard__timer{color:var(--k-orange)}
.kcard.t-red    {border-color:var(--k-red);animation:late 1.2s ease-in-out infinite}
.kcard.t-red    .kcard__timer{color:var(--k-red)}
@keyframes late{
  0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}
  50%    {box-shadow:0 0 0 14px rgba(239,68,68,0)}
}

.kbtn{width:100%;border:0;border-radius:10px;padding:18px;font-size:22px;
  font-weight:900;letter-spacing:.5px;cursor:pointer;color:#08110A}
.kbtn--start{background:var(--k-new);color:#fff}
.kbtn--ready{background:var(--k-ready)}
.kbtn--serve{background:var(--k-mut);color:#fff}
.kbtn:active{transform:scale(.98)}
.kbtn:disabled{opacity:.5}
```

✅ **Tekshirish:** `/kds/?token=<kds_token>` — 3 ustunli taxta, qora fon,
stol raqami juda katta. Ekranni 3 metr uzoqdan ko'ring — o'qilishi kerak.

---

## V-112 — KDS JS (kanban, taymer, ranglar)

**Fayl:** `static/kds/js/board.js`

```javascript
/* ARMENU — KDS taxtasi (K-01) */
(function () {
  'use strict';

  const K = window.KDS;
  const tpl = document.getElementById('tplKCard');
  const cols = {
    new: document.getElementById('colNew'),
    cooking: document.getElementById('colCooking'),
    ready: document.getElementById('colReady'),
  };
  const connDot = document.getElementById('connDot');
  const sndNew = document.getElementById('sndNew');
  const sndLate = document.getElementById('sndLate');

  let orders = new Map();
  const lateWarned = new Set();      // qayta-qayta signal bermaslik uchun

  // ---- Soat ----
  setInterval(() => {
    document.getElementById('clock').textContent =
      new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
  }, 1000);

  // ---- ⚡ Vaqt rangi (ETA ning necha foizi o'tdi) ----
  function timeClass(pct) {
    if (pct > 100) return 't-red';        // 🔴 KECHIKDI + tovush
    if (pct >= 80) return 't-orange';     // 🟠 kechikmoqda
    if (pct >= 50) return 't-yellow';     // 🟡 shoshiling
    return 't-green';                     // 🟢 normal
  }

  function mmss(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function colOf(status) {
    if (status === 'new' || status === 'accepted') return 'new';
    if (status === 'cooking') return 'cooking';
    if (status === 'ready') return 'ready';
    return null;
  }

  function render() {
    Object.values(cols).forEach(c => c.innerHTML = '');
    const counts = {new: 0, cooking: 0, ready: 0};

    [...orders.values()]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .forEach(o => {
        const c = colOf(o.status);
        if (!c) return;
        counts[c]++;
        cols[c].appendChild(card(o));
      });

    document.querySelectorAll('.k-col').forEach(sec => {
      sec.querySelector('[data-count]').textContent = counts[sec.dataset.col];
    });
    document.getElementById('mActive').textContent =
      counts.new + counts.cooking + counts.ready;

    const cooked = [...orders.values()].filter(o => o.status === 'ready');
    document.getElementById('mAvg').textContent = cooked.length
      ? Math.round(cooked.reduce((s, o) => s + o.age_sec, 0) / cooked.length / 60)
      : 0;
  }

  function card(o) {
    const n = tpl.content.firstElementChild.cloneNode(true);
    n.dataset.id = o.id;
    n.classList.add(timeClass(o.eta_pct));

    n.querySelector('.kcard__num').textContent = o.number;
    n.querySelector('.kcard__table b').textContent = o.table_no;
    n.querySelector('.kcard__timer span').textContent = mmss(o.age_sec);

    const ul = n.querySelector('.kcard__items');
    o.items.forEach(it => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="qty">${it.qty}×</span> ${it.name.toUpperCase()}`;
      const notes = [];
      if (it.note) notes.push(it.note);
      (it.modifiers || []).forEach(m => notes.push('+ ' + m.name));
      if (notes.length) {
        const s = document.createElement('span');
        s.className = 'note';
        s.textContent = '⚠️ ' + notes.join(' · ');
        li.appendChild(s);
      }
      // Taom bosilsa → stop-list
      li.style.cursor = 'pointer';
      li.onclick = () => stopDish(it.dish_id, it.name);
      ul.appendChild(li);
    });

    const b = n.querySelector('.kbtn');
    if (o.status === 'new' || o.status === 'accepted') {
      b.textContent = 'BOSHLASH';
      b.className = 'kbtn kbtn--start';
      b.onclick = () => act(o.id, 'cook', b);
    } else if (o.status === 'cooking') {
      b.textContent = 'TAYYOR ✓';
      b.className = 'kbtn kbtn--ready';
      b.onclick = () => act(o.id, 'ready', b);
    } else {
      b.textContent = 'BERILDI';
      b.className = 'kbtn kbtn--serve';
      b.onclick = () => act(o.id, 'serve', b);
    }
    return n;
  }

  async function act(id, action, btn) {
    btn.disabled = true;
    try {
      const r = await fetch(`/v1/staff/orders/${id}/${action}/`, {
        method: 'POST',
        headers: {'Authorization': 'Bearer ' + K.token,
                  'Content-Type': 'application/json'},
      });
      const j = await r.json();
      if (r.ok) { orders.set(j.id, j); render(); }
      else { btn.disabled = false; }
    } catch (_) { btn.disabled = false; }
  }

  async function stopDish(dishId, name) {
    if (!confirm(`"${name}" tugadimi? Menyudan yashiriladi.`)) return;
    await fetch(`/v1/staff/dishes/${dishId}/stop/`, {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + K.token},
    });
  }

  // ---- ⚡ Taymer: har soniyada vaqt va rang yangilanadi ----
  setInterval(() => {
    orders.forEach(o => {
      if (!['new', 'accepted', 'cooking'].includes(o.status)) return;
      o.age_sec += 1;
      o.eta_pct = o.eta_min ? Math.round(100 * o.age_sec / (o.eta_min * 60)) : 0;

      const n = document.querySelector(`.kcard[data-id="${o.id}"]`);
      if (!n) return;
      n.querySelector('.kcard__timer span').textContent = mmss(o.age_sec);
      const cls = timeClass(o.eta_pct);
      if (!n.classList.contains(cls)) {
        n.classList.remove('t-green', 't-yellow', 't-orange', 't-red');
        n.classList.add(cls);
      }
      // 🔴 Kechikkanda BIR MARTA tovush
      if (cls === 't-red' && !lateWarned.has(o.id)) {
        lateWarned.add(o.id);
        try { sndLate.currentTime = 0; sndLate.play().catch(() => {}); } catch (_) {}
      }
    });
  }, 1000);

  // ---- WebSocket ----
  new ReliableWS(K.wsUrl, {
    onopen:  () => connDot.classList.remove('is-off'),
    onclose: () => connDot.classList.add('is-off'),

    'board.snapshot': (m) => {
      orders = new Map(m.data.map(o => [o.id, o]));
      render();
    },
    'order.new': (m) => {
      orders.set(m.data.order.id, m.data.order);
      try { sndNew.currentTime = 0; sndNew.play().catch(() => {}); } catch (_) {}
      render();
    },
    'order.status': (m) => {
      const o = m.data.order;
      if (['paid', 'cancelled', 'served'].includes(o.status)) {
        orders.delete(o.id); lateWarned.delete(o.id);
      } else {
        orders.set(o.id, {...(orders.get(o.id) || {}), ...o});
      }
      render();
    },
    'order.items_added': (m) => { orders.set(m.data.order.id, m.data.order); render(); },
    'order.cancelled':   (m) => { orders.delete(m.data.order_id); render(); },
  });

  // ⚡ KDS 6 soatda bir avtomatik yangilanadi (xotira sizib ketmasin)
  setTimeout(() => location.reload(), 6 * 3600 * 1000);
})();
```

**Fayl:** `apps/orders/kds_views.py` (sahifa)
```python
from django.shortcuts import render, get_object_or_404

from apps.tenants.models import Restaurant


def kds_board(request):
    """GET /kds/?token=<kds_token> — TV brauzeri uchun"""
    token = request.GET.get('token', '')
    rest = get_object_or_404(Restaurant, kds_token=token, is_active=True)
    return render(request, 'kds/board.html', {
        'restaurant': rest,
        'kds_token': token,
        'ws_scheme': 'wss' if request.is_secure() else 'ws',
    })
```
`config/urls.py` ga: `path('kds/', kds_views.kds_board, name='kds'),`

✅ **Tekshirish:** Buyurtma bering → KDS'da 🆕 ustunda chiqadi → BOSHLASH →
🍳 ustuniga o'tadi → taymer rangi 🟢→🟡→🟠→🔴 o'zgaradi.

---

## V-113 — `POST /v1/staff/orders/{id}/cook|ready/`

**Fayl:** `apps/orders/staff_views.py` (davomi)

```python
from core.permissions import IsCook


@api_view(['POST'])
@permission_classes([IsCook])
def order_cook(request, pk):
    """
    POST /v1/staff/orders/{id}/cook/ → accepted → cooking
    ⚡ Agar buyurtma hali 'new' bo'lsa (ofitsiant ulgurmagan) — avtomatik
    accepted qilinadi, oshxona kutib turmaydi.
    """
    order = _get_order(request, pk)
    if order.status == 'new':
        transition(order, 'accepted', actor=request.staff)
        order.refresh_from_db()
    transition(order, 'cooking', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[kds] tayyorlash boshlandi: {order.number}')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsCook])
def order_ready(request, pk):
    """
    POST /v1/staff/orders/{id}/ready/ → cooking → ready
    ⚡ Bu yerda ofitsiantga tovush+push ketadi (state._broadcast ichida).
    """
    order = _get_order(request, pk)
    transition(order, 'ready', actor=request.staff)
    order.refresh_from_db()
    log.info(f'[kds] TAYYOR: {order.number} (stol {order.table_id})')
    return Response(serialize_order(order))


@api_view(['POST'])
@permission_classes([IsCook])
def dish_stop(request, pk):
    """POST /v1/staff/dishes/{id}/stop/ — stop-list (taom tugadi)"""
    from apps.menu.models import Dish
    from core.ws import ws_send, g_admin, g_waiters, g_kds
    from core.cache import bump_menu_version

    dish = Dish.objects.filter(id=pk,
                               restaurant_id=request.staff.restaurant_id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': pk})

    dish.is_available = not dish.is_available
    dish.save(update_fields=['is_available'])
    bump_menu_version(dish.restaurant_id)      # ⚡ menyu keshi eskiradi

    data = {'dish_id': dish.id, 'name': dish.name_uz,
            'available': dish.is_available}
    for g in (g_admin, g_waiters, g_kds):
        ws_send(g(dish.restaurant_id), 'dish.stopped', data)

    return Response(data)
```

`apps/orders/staff_urls.py` ga qo'shish:
```python
    path('staff/dishes/<int:pk>/stop/', v.dish_stop, name='dish-stop'),
```

✅ **Tekshirish:**
```bash
curl -s -X POST http://localhost:8060/v1/staff/orders/1/cook/  -H "Authorization: Bearer $COOK" | jq .status
# "cooking"
curl -s -X POST http://localhost:8060/v1/staff/orders/1/ready/ -H "Authorization: Bearer $COOK" | jq .status
# "ready"
```

---

## V-114 — Test: to'liq buyurtma oqimi + WS

**Fayl:** `tests/test_order_flow.py`

```python
import uuid

import pytest
from channels.testing import WebsocketCommunicator
from rest_framework.test import APIClient

from config.asgi import application
from apps.orders.models import Order
from apps.orders.services import create_order
from apps.orders.state import transition
from core.exceptions import InvalidTransition, TenantMismatch, DishUnavailable


# ---------- 1. To'liq hayotiy sikl ----------

@pytest.mark.django_db
def test_full_lifecycle(restaurant, table, dish, waiter, cook):
    """new → accepted → cooking → ready → served → paid"""
    o = create_order(restaurant_id=restaurant.id, session_id='gs_flow',
                     table_id=table.id, items=[{'dish_id': dish.id, 'qty': 2}])
    assert o.status == 'new'
    assert o.number.startswith('#')

    transition(o, 'accepted', actor=waiter); assert o.accepted_at
    transition(o, 'cooking',  actor=cook);   assert o.cooking_at
    transition(o, 'ready',    actor=cook);   assert o.ready_at
    transition(o, 'served',   actor=waiter); assert o.served_at
    transition(o, 'paid',     actor=waiter); assert o.paid_at
    assert o.status == 'paid'


@pytest.mark.django_db
def test_cannot_skip_states(restaurant, table, dish, cook):
    o = create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                     items=[{'dish_id': dish.id, 'qty': 1}])
    with pytest.raises(InvalidTransition):
        transition(o, 'served', actor=cook)      # new → served MUMKIN EMAS


@pytest.mark.django_db
def test_paid_is_final(restaurant, table, dish, waiter):
    o = create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                     items=[{'dish_id': dish.id, 'qty': 1}])
    for st in ('accepted', 'cooking', 'ready', 'served', 'paid'):
        transition(o, st, actor=waiter)
    with pytest.raises(InvalidTransition):
        transition(o, 'cancelled', actor=waiter)


# ---------- 2. Narx va miqdor ----------

@pytest.mark.django_db
def test_service_fee_computed(restaurant, table, dish):
    from decimal import Decimal
    restaurant.service_fee_pct = Decimal('10'); restaurant.save()
    dish.price = Decimal('50000'); dish.save()
    o = create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                     items=[{'dish_id': dish.id, 'qty': 2}])
    assert o.subtotal == Decimal('100000')
    assert o.service_fee == Decimal('10000.00')
    assert o.total == Decimal('110000.00')


@pytest.mark.django_db
def test_stop_list_blocks_order(restaurant, table, dish):
    dish.is_available = False; dish.save()
    with pytest.raises(DishUnavailable):
        create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                     items=[{'dish_id': dish.id, 'qty': 1}])


# ---------- 3. ⚡ Cross-tenant himoya ----------

@pytest.mark.django_db
def test_cannot_order_other_restaurant_dish(restaurant, restaurant2, table, dish2):
    """dish2 — IKKINCHI restoranniki. Buyurtma qilib bo'lmasligi kerak."""
    with pytest.raises(TenantMismatch):
        create_order(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                     items=[{'dish_id': dish2.id, 'qty': 1}])


@pytest.mark.django_db
def test_cannot_use_other_restaurant_table(restaurant, table2, dish):
    with pytest.raises(TenantMismatch):
        create_order(restaurant_id=restaurant.id, session_id='s', table_id=table2.id,
                     items=[{'dish_id': dish.id, 'qty': 1}])


# ---------- 4. Idempotency ----------

@pytest.mark.django_db
def test_double_submit_creates_one_order(restaurant, table, dish):
    key = str(uuid.uuid4())
    payload = dict(restaurant_id=restaurant.id, session_id='s', table_id=table.id,
                   items=[{'dish_id': dish.id, 'qty': 1}], idem_key=key)
    o1 = create_order(**payload)
    o2 = create_order(**payload)
    assert o1.id == o2.id
    assert Order.objects.filter(restaurant=restaurant).count() == 1


# ---------- 5. API darajasi ----------

@pytest.mark.django_db
def test_api_create_and_read(restaurant, table, dish, guest_session):
    c = APIClient()
    r = c.post(f'/v1/orders/',
               {'session_id': guest_session.session_key, 'table_id': table.id,
                'items': [{'dish_id': dish.id, 'qty': 1, 'ar_viewed': True}]},
               format='json', HTTP_HOST=f'{restaurant.slug}.localhost',
               HTTP_X_IDEMPOTENCY_KEY=str(uuid.uuid4()))
    assert r.status_code == 201
    oid = r.json()['id']
    assert r.json()['items'][0]['ar_viewed'] is True

    r2 = c.get(f'/v1/orders/{oid}/', HTTP_HOST=f'{restaurant.slug}.localhost',
               HTTP_X_SESSION_ID=guest_session.session_key)
    assert r2.status_code == 200

    # ⚡ Begona sessiya ko'ra olmaydi
    r3 = c.get(f'/v1/orders/{oid}/', HTTP_HOST=f'{restaurant.slug}.localhost',
               HTTP_X_SESSION_ID='begona')
    assert r3.status_code == 403


# ---------- 6. ⚡ WebSocket ----------

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_kds_receives_new_order(restaurant, kds_token, table, dish):
    comm = WebsocketCommunicator(application, f'/ws/kds/{kds_token}/')
    connected, _ = await comm.connect()
    assert connected
    await comm.receive_json_from()      # connected
    await comm.receive_json_from()      # board.snapshot

    from channels.db import database_sync_to_async
    await database_sync_to_async(create_order)(
        restaurant_id=restaurant.id, session_id='s', table_id=table.id,
        items=[{'dish_id': dish.id, 'qty': 1}])

    msg = await comm.receive_json_from(timeout=5)
    assert msg['type'] == 'order.new'
    assert msg['data']['order']['table_no'] == table.number
    await comm.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_ws_groups_are_tenant_scoped(restaurant, restaurant2, kds_token2,
                                           table, dish):
    """⚡ 2-restoran KDS'i 1-restoran buyurtmasini KO'RMASLIGI kerak"""
    comm = WebsocketCommunicator(application, f'/ws/kds/{kds_token2}/')
    connected, _ = await comm.connect()
    assert connected
    await comm.receive_json_from()
    await comm.receive_json_from()

    from channels.db import database_sync_to_async
    await database_sync_to_async(create_order)(
        restaurant_id=restaurant.id, session_id='s', table_id=table.id,
        items=[{'dish_id': dish.id, 'qty': 1}])

    assert await comm.receive_nothing(timeout=2) is True   # ⚡ hech narsa kelmadi
    await comm.disconnect()
```

**`tests/conftest.py` ga qo'shiladigan fixture'lar:**
```python
@pytest.fixture
def dish(db, restaurant):
    from apps.menu.models import Category, Dish
    from decimal import Decimal
    cat = Category.objects.create(restaurant=restaurant, name_uz='Milliy')
    return Dish.objects.create(category=cat, restaurant=restaurant,
                               name_uz='Osh', price=Decimal('45000'),
                               cook_min=20, is_available=True)


@pytest.fixture
def dish2(db, restaurant2):
    from apps.menu.models import Category, Dish
    from decimal import Decimal
    cat = Category.objects.create(restaurant=restaurant2, name_uz='Salat')
    return Dish.objects.create(category=cat, restaurant=restaurant2,
                               name_uz='Achchiq-chuchuk', price=Decimal('18000'))


@pytest.fixture
def table(db, restaurant):
    from apps.tables.models import Hall, Table
    h = Hall.objects.create(restaurant=restaurant, name='1-qavat')
    return Table.objects.create(hall=h, restaurant=restaurant, number='5')


@pytest.fixture
def table2(db, restaurant2):
    from apps.tables.models import Hall, Table
    h = Hall.objects.create(restaurant=restaurant2, name='Zal')
    return Table.objects.create(hall=h, restaurant=restaurant2, number='1')


@pytest.fixture
def waiter(db, restaurant, django_user_model):
    from apps.accounts.models import Staff
    u = django_user_model.objects.create_user('w1', password='x')
    return Staff.objects.create(restaurant=restaurant, user=u, role='waiter')


@pytest.fixture
def cook(db, restaurant, django_user_model):
    from apps.accounts.models import Staff
    u = django_user_model.objects.create_user('c1', password='x')
    return Staff.objects.create(restaurant=restaurant, user=u, role='cook')


@pytest.fixture
def guest_session(db, restaurant, table):
    from apps.guest.models import Guest, GuestSession
    g = Guest.objects.create(restaurant=restaurant)
    return GuestSession.objects.create(guest=g, restaurant=restaurant,
                                       table=table, session_key='gs_test')


@pytest.fixture
def kds_token(restaurant):
    return str(restaurant.kds_token)


@pytest.fixture
def kds_token2(restaurant2):
    return str(restaurant2.kds_token)
```

✅ **Tekshirish:**
```bash
pytest tests/test_order_flow.py tests/test_orders.py tests/test_order_state.py \
       tests/test_idempotency.py tests/test_sync.py -v
# 15+ test o'tadi
```

---

# ✅ FAZA 5 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check                    → xato yo'q
[ ] python manage.py migrate                  → o'tadi
[ ] pytest tests/ -q                          → hammasi o'tadi
[ ] Mijoz buyurtma berdi                      → 1 soniyada KDS'da chiqdi
[ ] Ofitsiantda tovush + vibratsiya ishladi
[ ] KDS: BOSHLASH → TAYYOR → ofitsiantga 🔔 ketdi
[ ] KDS taymer rangi 🟢→🟡→🟠→🔴 o'zgardi
[ ] Bir xil idempotency-key 2 marta        → 1 ta buyurtma
[ ] Boshqa restoran taomini buyurtma qilish → 403 TENANT_MISMATCH
[ ] 2-restoran KDS'i 1-restoran buyurtmasini KO'RMADI ⚡
[ ] Narx frontenddan yuborilsa ham DB narxi olindi ⚡
[ ] WS uzib, qayta ulanish → /v1/sync/ o'tkazib yuborilganlarni tikladi
[ ] new → served urinishi                  → 409 INVALID_TRANSITION
[ ] KDS 3 metrdan o'qildi (stol raqami 56px)
[ ] Ofitsiant paneli dark + light rejimda to'g'ri
```

**Yakuniy:**
```bash
python manage.py collectstatic --noinput
git add -A && git commit -m "FAZA 5 tugadi: buyurtma + real-time (WS, KDS, ofitsiant)"
python3 ROADMAP/03_HOLAT/update_progress.py V-114 ok "FAZA 5 tugadi"
```

**➡️ Keyingi:** `FAZA_06_AR_3D.md` ⚡ — butun loyihaning ENG MUHIM fazasi
