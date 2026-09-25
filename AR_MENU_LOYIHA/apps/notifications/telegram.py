"""Telegram bildirishnoma — yangi buyurtma → ofitsiant chat, ready → admin"""
import logging

import requests
from django.conf import settings

log = logging.getLogger('notifications.telegram')

TELEGRAM_API = 'https://api.telegram.org/bot{token}/sendMessage'


def _send(token: str, chat_id: str, text: str) -> bool:
    """Telegram xabar yuborish"""
    if not token or not chat_id:
        return False
    try:
        url = TELEGRAM_API.format(token=token)
        resp = requests.post(url, json={
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'HTML',
        }, timeout=10)
        ok = resp.status_code == 200
        if not ok:
            log.warning(f'[telegram] xato: {resp.status_code} {resp.text[:200]}')
        return ok
    except Exception as e:
        log.warning(f'[telegram] xato: {e}')
        return False


def notify_new_order(order) -> bool:
    """Yangi buyurtma — ofitsiant chatiga xabar"""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    chat_id = getattr(order.restaurant, 'telegram_chat_id', '') or ''

    if not token or not chat_id:
        log.info(f'[telegram] token/chat_id yo\'q — order#{order.id}')
        return False

    table_no = order.table.number if order.table_id else '—'
    items = ', '.join([f'{it.qty}× {it.dish_name}' for it in order.items.all()[:5]])
    text = (
        f'🆕 <b>Yangi buyurtma #{order.number}</b>\n'
        f'📍 Stol: {table_no}\n'
        f'🍽 {items}\n'
        f'💰 {float(order.total):,.0f} UZS'
    )
    return _send(token, chat_id, text)


def notify_order_ready(order) -> bool:
    """Buyurtma tayyor — admin chatiga xabar"""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    chat_id = getattr(order.restaurant, 'telegram_chat_id', '') or ''

    if not token or not chat_id:
        return False

    table_no = order.table.number if order.table_id else '—'
    text = (
        f'✅ <b>Tayyor #{order.number}</b>\n'
        f'📍 Stol: {table_no}\n'
        f'💰 {float(order.total):,.0f} UZS'
    )
    return _send(token, chat_id, text)
