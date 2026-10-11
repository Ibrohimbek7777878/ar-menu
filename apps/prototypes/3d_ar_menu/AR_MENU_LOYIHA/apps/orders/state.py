import logging

from django.db import transaction
from django.utils import timezone

from core.exceptions import InvalidTransition

log = logging.getLogger('orders.state')

# ⚡ Ruxsat etilgan o'tishlar — boshqa hech qanday o'tish mumkin emas
ALLOWED = {
    'new': {'accepted', 'cancelled'},
    'accepted': {'cooking', 'cancelled'},
    'cooking': {'ready', 'cancelled'},
    'ready': {'served', 'cancelled'},
    'served': {'paid', 'cancelled'},
    'paid': set(),          # yakuniy
    'cancelled': set(),          # yakuniy
}

# Kim qaysi o'tishni bajara oladi (rol nazorati)
ROLE_ALLOWED = {
    'accepted': {'waiter', 'admin', 'owner'},
    'cooking': {'cook', 'admin', 'owner'},
    'ready': {'cook', 'admin', 'owner'},
    'served': {'waiter', 'admin', 'owner'},
    'paid': {'cashier', 'waiter', 'admin', 'owner'},
    'cancelled': {'waiter', 'admin', 'owner'},
}

# Har o'tishda mijozga ko'rsatiladigan matn (3 til)
GUEST_TEXT = {
    'accepted': ("Buyurtmangiz qabul qilindi", "Заказ принят", 'Order accepted'),
    'cooking': ("Tayyorlanmoqda", "Готовится", 'Cooking'),
    'ready': ("Tayyor! Hozir olib kelishadi", "Готово! Сейчас принесут", 'Ready!'),
    'served': ("Yoqimli ishtaha!", "Приятного аппетита!", 'Enjoy your meal!'),
    'paid': ("To'lov qabul qilindi", "Оплата принята", 'Payment received'),
    'cancelled': ("Buyurtma bekor qilindi", "Заказ отменён", 'Order cancelled'),
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
    from apps.analytics.models import AuditLog
    try:
        AuditLog.objects.create(
            restaurant_id=order.restaurant_id,
            actor=actor if hasattr(actor, 'full_name') else None,
            action='order.transition',
            model='Order',
            object_id=str(order.id),
            old={'status': old},
            new={'status': new, 'reason': reason},
        )
    except Exception:
        pass


def _broadcast(order, old, new):
    """⚡ Barcha manfaatdorlarga jonli xabar — restoran-scoped guruhlar"""
    try:
        from core.ws import ws_send, g_kds, g_waiters, g_admin, g_guest
        from core.queue import enqueue
        from apps.orders.serializers import serialize_order, serialize_order_short

        rid = order.restaurant_id
        short = serialize_order_short(order)
        uz, ru, en = GUEST_TEXT.get(new, ('', '', ''))

        payload = {'order': short, 'from': old, 'to': new}

        ws_send(g_kds(rid), 'order.status', payload)
        ws_send(g_waiters(rid), 'order.status', payload)
        ws_send(g_admin(rid), 'order.status', payload)

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

        if new == 'paid':
            enqueue('fiscal', 'order_fiscal_receipt', order_id=order.id,
                    restaurant_id=order.restaurant_id, amount=str(order.total))

        enqueue('analytics', 'order_status', order_id=order.id, status=new,
                restaurant_id=order.restaurant_id)
        _sync_table_status(order)
    except Exception as e:
        log.error(f'[broadcast] xato: {e}')


def _sync_table_status(order):
    """Stol rangi buyurtma holatiga qarab o'zgaradi (O-05, A-01)"""
    try:
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
        ws_send(g_admin(order.restaurant_id), 'table.status', data)
        ws_send(g_waiters(order.restaurant_id), 'table.status', data)
    except Exception:
        pass
