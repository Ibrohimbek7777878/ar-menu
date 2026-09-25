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
    Redis mavjud bo'lmasa DB fallback ishlaydi.
    """
    today = timezone.localtime().strftime('%Y%m%d')
    key = f'ordnum:{restaurant_id}:{today}'
    try:
        r = get_redis()
        n = r.incr(key)
        if n == 1:
            # kalit ertaga kechqurun o'chsin (26 soat — vaqt mintaqasi zaxirasi)
            r.expire(key, 26 * 3600)
        return f'#{n:03d}'
    except Exception as e:
        log.warning(f'[order] Redis hisoblagich xatosi, DB fallback: {e}')
        from apps.orders.models import Order
        start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        cnt = Order.objects.filter(restaurant_id=restaurant_id, created_at__gte=start).count() + 1
        return f'#{cnt:03d}'


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

    ws_send(g_kds(rid), 'order.new', {'order': serialize_order(order)})
    ws_send(g_waiters(rid), 'order.new', {
        'order': serialize_order(order),
        'table_id': order.table_id,
        'assigned_to': order.waiter_id,
    })
    ws_send(g_admin(rid), 'order.new', {'order': serialize_order_short(order)})

    if order.session_id:
        ws_send(g_guest(order.session_id), 'order.created', {
            'order_id': order.id, 'number': order.number,
            'total': str(order.total), 'eta_min': order.eta_min,
        })

    enqueue('notify', 'waiter_new_order', order_id=order.id)
    enqueue('notify', 'kitchen_print', order_id=order.id)
    enqueue('analytics', 'order_created', order_id=order.id, restaurant_id=order.restaurant_id)


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
    ws_send(g_kds(order.restaurant_id), 'order.items_added', data)
    ws_send(g_waiters(order.restaurant_id), 'order.items_added', data)
    ws_send(g_admin(order.restaurant_id), 'order.items_added', data)
