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
