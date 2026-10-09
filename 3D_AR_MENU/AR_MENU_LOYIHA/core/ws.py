import logging
import asyncio
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache

log = logging.getLogger('core.ws')


def next_seq(group: str) -> int:
    """Har guruh uchun o'suvchi raqam — klient dublikatni aniqlaydi"""
    try:
        return cache.incr(f'ws:seq:{group}')
    except ValueError:
        cache.set(f'ws:seq:{group}', 1, None)
        return 1


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


def ws_send(group: str, msg_type: str, data: dict):
    """
    ⚡ Guruh nomi DOIM restoran-scoped bo'lishi kerak:
       rest_<id>_kds, rest_<id>_waiters, rest_<id>_admin, guest_<session>
    """
    layer = get_channel_layer()
    message = {
        'type': msg_type,
        'ts': timezone.now().isoformat(),
        'data': data,
        'seq': next_seq(group),
    }
    _journal(group, message)              # ⚡ avval jurnalga
    if layer is None:
        log.warning('[ws] channel layer yo\'q')
        return
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(layer.group_send(group, {
                'type': 'broadcast',
                'message': message}))
        else:
            async_to_sync(layer.group_send)(group, {
                'type': 'broadcast',
                'message': message})
    except Exception as e:
        log.error(f'[ws] {group}/{msg_type} yuborilmadi: {e}')


async def async_ws_send(group: str, msg_type: str, data: dict):
    """Async muhitlar uchun bevosita await qilinadigan WS yuboruvchi"""
    layer = get_channel_layer()
    message = {
        'type': msg_type,
        'ts': timezone.now().isoformat(),
        'data': data,
        'seq': next_seq(group),
    }
    _journal(group, message)
    if layer is not None:
        await layer.group_send(group, {
            'type': 'broadcast',
            'message': message
        })


def g_kds(rid):
    return f'rest_{rid}_kds'


def g_waiters(rid):
    return f'rest_{rid}_waiters'


def g_admin(rid):
    return f'rest_{rid}_admin'


def g_cashier(rid):
    return f'rest_{rid}_cashier'


def g_guest(sid):
    return f'guest_{sid}'
