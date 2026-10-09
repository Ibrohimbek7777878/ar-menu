import logging
import urllib.request
import urllib.parse
from django.conf import settings

log = logging.getLogger('core.notify')


def _send_telegram(token, chat_id, text):
    """Telegram Bot API orqali xabar yuborish."""
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = urllib.parse.urlencode({
            'chat_id': str(chat_id),
            'text': text,
            'parse_mode': 'HTML'
        }).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        with urllib.request.urlopen(req, timeout=5) as response:
            log.info(f'[telegram] Xabar yuborildi chat_id={chat_id}')
            return response.status == 200
    except Exception as e:
        log.warning(f'[telegram] Yuborishda xatolik ({chat_id}): {e}')
        return False


def handle(job):
    """Notify handler — WS va Telegram xabarlarini yuboradi."""
    from core.ws import ws_send, g_waiters, g_kds, g_admin
    payload = job.payload if hasattr(job, 'payload') else {}
    group = payload.get('group', '')
    event = job.type or 'notification'
    order_id = payload.get('order_id')
    order = None

    if order_id:
        from apps.orders.models import Order
        order = (Order.objects
                 .select_related('restaurant', 'table')
                 .filter(id=order_id)
                 .first())

    # Guruh aniqlanmagan bo'lsa, order_id bo'yicha guruh topish
    if not group and order:
        rid = order.restaurant_id
        if event in ('waiter_new_order', 'waiter_order_ready'):
            group = g_waiters(rid)
        elif event == 'kitchen_print':
            group = g_kds(rid)
        else:
            group = g_admin(rid)

    # 1. WS orqali xabar yuborish
    if group:
        ws_data = dict(payload)
        if order:
            ws_data.update({
                'order_id': order.id,
                'number': order.number,
                'status': order.status,
                'table_no': order.table.number if order.table else '—',
                'total': str(order.total),
            })
        ws_send(group, event, ws_data)
        log.info(f'[notify] Job#{job.id} → WS {group}/{event} yuborildi')
    else:
        log.info(f'[notify] Job#{job.id} — guruh aniqlanmadi')

    # 2. Telegram orqali xabar yuborish (agar sozlangan bo'lsa)
    tg_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if tg_token and order and order.restaurant.telegram_chat_id:
        table_label = f"Stol {order.table.number}" if order.table else "Yetkazish/Olib ketish"
        msg = (
            f"🔔 <b>ARMENU: {event}</b>\n"
            f"Restoran: <b>{order.restaurant.name}</b>\n"
            f"Buyurtma: <b>#{order.number}</b> ({order.status})\n"
            f"Joy: {table_label}\n"
            f"Summa: {order.total} so'm"
        )
        _send_telegram(tg_token, order.restaurant.telegram_chat_id, msg)

    return {'notified': True, 'group': group}
