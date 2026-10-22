"""
Transactional Outbox (TZ: R3-1, R3-2, R3-4).

Hodisa asosiy tranzaksiya bilan birga `outbox_events` jadvaliga yoziladi (so'rov Telegram tezligiga bog'liq emas).
Yuborishni fon ishchisi bajaradi: `manage.py run_workers` (Redis/Celery shart emas, navbat bazada).

Ishonchlilik qoidalari:
  • Telegram muvaffaqiyatsiz bo'lsa hodisa "bajarildi" deb belgilanmaydi (avval `bool(dict)` har doim True edi);
  • vaqtinchalik xato (tarmoq, 429, 5xx) — kechikish bilan qayta uriniladi (15 s → 1 daq → 5 daq → 15 daq → 30 daq);
  • doimiy xato (chat topilmadi, bot bloklangan) — qayta urinmasdan `failed`, sababi `error_message`da;
  • bot sozlanmagan / qabul qiluvchi yo'q — xato emas, `completed` + "skipped" izohi;
  • ishchi yiqilib qolsa `processing` da qotib qolgan hodisalar qayta navbatga qaytariladi;
  • Telegram ishlamayotgan bo'lsa partiya ketma-ket 3 ta tarmoq xatosidan keyin to'xtaydi (osilib qolmaydi).
"""
import logging
from datetime import timedelta
from typing import Any, Callable, Dict, Optional

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .models import OutboxEvent

logger = logging.getLogger(__name__)

BACKOFF_SECONDS = (15, 60, 300, 900, 1800)
PROCESSING_TIMEOUT = timedelta(minutes=10)
NETWORK_FAILURES_BEFORE_PAUSE = 3


class OutboxRetryError(Exception):
    """Vaqtinchalik xato: keyinroq qayta urinish mantiqli."""

    def __init__(self, message, retry_after=0):
        super().__init__(message)
        self.retry_after = retry_after


class OutboxPermanentError(Exception):
    """Doimiy xato: qayta urinish foyda bermaydi."""


class OutboxSkipped(Exception):
    """Yuborish shart emas (bot sozlanmagan, qabul qiluvchi yo'q, bildirishnoma o'chirilgan)."""


def publish_outbox_event(
    aggregate_type: str,
    aggregate_id: str,
    event_type: str,
    payload: Dict[str, Any],
) -> OutboxEvent:
    """
    Hodisani jadvalga yozadi (<5 ms). Tashqi tarmoqqa chiqmaydi: yuborishni `run_workers` bajaradi.
    Celery faqat aniq yoqilgan bo'lsa (`OUTBOX_USE_CELERY=True`) turtki bo'ladi.
    """
    event = OutboxEvent.objects.create(
        aggregate_type=str(aggregate_type),
        aggregate_id=str(aggregate_id),
        event_type=str(event_type),
        payload=payload,
        status='pending',
    )

    if getattr(settings, 'OUTBOX_USE_CELERY', False):
        def _trigger():
            try:
                from .tasks import process_outbox_queue
                process_outbox_queue.delay()
            except Exception as exc:
                logger.warning('[Outbox] Celery turtki yuborilmadi: %s', exc)

        transaction.on_commit(_trigger)
    return event


class OutboxService:
    @staticmethod
    def log_event(event_type: str, payload: Dict[str, Any], aggregate_type: str = 'restaurant', aggregate_id: str = '0') -> OutboxEvent:
        return publish_outbox_event(aggregate_type, aggregate_id, event_type, payload)


# ── Hodisa turlari bo'yicha ishlovchilar ────────────────────────────────────────────────────────────────────

_HANDLERS: Dict[str, Callable[[OutboxEvent], Any]] = {}


def handler(*event_types):
    def register(func):
        for name in event_types:
            _HANDLERS[name] = func
        return func
    return register


def _interpret(result) -> bool:
    """telegram_service natijasi ({'success', 'error', 'retryable', 'skipped'}) → outbox qarori."""
    if isinstance(result, bool):
        if result:
            return True
        raise OutboxRetryError('Yuborish muvaffaqiyatsiz')
    if result.get('success'):
        return True
    if result.get('skipped'):
        raise OutboxSkipped(result.get('error') or 'skipped')
    message = str(result.get('error') or 'Telegram xatosi')
    if result.get('retryable'):
        raise OutboxRetryError(message, retry_after=int(result.get('retry_after') or 0))
    raise OutboxPermanentError(message)


def _order(event: OutboxEvent):
    from orders.models import Order
    order = Order.objects.select_related('shop', 'table', 'customer').filter(id=(event.payload or {}).get('order_id')).first()
    if not order:
        raise OutboxPermanentError(f"Buyurtma topilmadi: {(event.payload or {}).get('order_id')}")
    return order


@handler('telegram.send_message')
def _send_raw_message(event):
    from . import telegram_client
    payload = event.payload or {}
    result = telegram_client.send(payload.get('chat_id'), payload.get('text', ''),
                                  parse_mode=payload.get('parse_mode', 'HTML'),
                                  reply_markup=payload.get('reply_markup'))
    return _interpret(result.as_dict())


@handler('order.created', 'telegram.order_alert')
def _order_created(event):
    from .services.telegram_service import send_order_created
    return _interpret(send_order_created(_order(event)))


@handler('order.status_changed')
def _order_status_changed(event):
    from .services.telegram_service import notify_enabled, send_order_delivered, send_status_updated
    payload = event.payload or {}
    order = _order(event)
    staff = notify_enabled('telegram_notify_status_changes')
    if payload.get('new_status') == 'delivered':
        return _interpret(send_order_delivered(order, notify_staff=staff))
    return _interpret(send_status_updated(order, payload.get('old_status'), payload.get('new_status'),
                                          notify_staff=staff))


@handler('reservation_created')
def _reservation_created(event):
    from tables_restaurant.models import TableReservation
    from .services.telegram_service import send_table_reservation_alert
    reservation = TableReservation.objects.select_related('shop', 'table', 'hall').filter(
        id=(event.payload or {}).get('reservation_id')).first()
    if not reservation:
        raise OutboxPermanentError('Bron topilmadi')
    return _interpret(send_table_reservation_alert(reservation))


@handler('service_call.created')
def _service_call_created(event):
    from tables_restaurant.models import ServiceCall
    from .services.telegram_service import notify_enabled, send_table_service_call
    call = ServiceCall.objects.select_related('shop', 'table', 'table__hall').filter(
        id=(event.payload or {}).get('call_id')).first()
    if not call:
        raise OutboxPermanentError('Chaqiruv topilmadi')
    flag = 'telegram_notify_dish_ready' if call.call_type == 'dish_ready' else 'telegram_notify_service_calls'
    if not notify_enabled(flag):
        raise OutboxSkipped(f'{flag} o\'chirilgan')
    return _interpret(send_table_service_call(call.shop, call.table, call.call_type, note=call.title or ''))


@handler('3d_studio')
def _studio_message(event):
    from .telegram_bot import send_message
    payload = event.payload or {}
    if payload.get('chat_id') and payload.get('text'):
        return _interpret(send_message(payload['chat_id'], payload['text']))
    return True


def dispatch_single_event(event: OutboxEvent) -> bool:
    """
    Hodisani turiga qarab tegishli ishlovchiga yo'naltiradi.
    True — bajarildi; `OutboxRetryError` / `OutboxPermanentError` / `OutboxSkipped` — qaror (qarang: yuqorida).
    Ishlovchisi yo'q hodisalar (axborot beruvchi: order_item_added, kds.*, ...) shunchaki yakunlanadi.
    """
    event_type = event.event_type
    func = _HANDLERS.get(event_type)
    if func is None and event_type.startswith('3d_studio'):
        func = _HANDLERS['3d_studio']
    if func is None:
        logger.debug('[Outbox] Axborot hodisasi: %s payload=%s', event_type, event.payload)
        return True
    return bool(func(event))


# ── Navbatni qayta ishlash ─────────────────────────────────────────────────────────────────────────────────

def recover_stale_events(now=None) -> int:
    """Ishchi yiqilib qolgani sababli 'processing' da qolgan hodisalarni qayta navbatga qaytaradi."""
    now = now or timezone.now()
    return OutboxEvent.objects.filter(status='processing', locked_at__lt=now - PROCESSING_TIMEOUT).update(
        status='pending', locked_at=None)


def _schedule_retry(event: OutboxEvent, message: str, retry_after: int = 0, now=None):
    now = now or timezone.now()
    event.retry_count += 1
    event.error_message = message[:500]
    event.locked_at = None
    if event.retry_count >= event.max_retries:
        event.status = 'failed'
        logger.error('[Outbox] %s #%s %d urinishdan keyin to\'xtatildi: %s',
                     event.event_type, event.pk, event.retry_count, message)
    else:
        delay = max(BACKOFF_SECONDS[min(event.retry_count - 1, len(BACKOFF_SECONDS) - 1)], retry_after)
        event.status = 'pending'
        event.next_attempt_at = now + timedelta(seconds=delay)
    event.save(update_fields=['status', 'retry_count', 'error_message', 'next_attempt_at', 'locked_at'])


def process_outbox_batch(batch_size: int = 20) -> Dict[str, int]:
    """
    Navbatdagi hodisalarni yuboradi. PostgreSQL'da `SKIP LOCKED` — bir nechta ishchi bir-birini kutmaydi.
    Qaytaradi: {'processed', 'failed', 'skipped', 'retry'}.
    """
    now = timezone.now()
    recover_stale_events(now)

    with transaction.atomic():
        qs = OutboxEvent.objects.filter(status='pending', next_attempt_at__lte=now).order_by('created_at')
        if connection.vendor == 'postgresql':
            events = list(qs.select_for_update(skip_locked=True)[:batch_size])
        else:
            events = list(qs.select_for_update()[:batch_size])
        if not events:
            return {'processed': 0, 'failed': 0, 'skipped': 0, 'retry': 0}
        OutboxEvent.objects.filter(id__in=[e.id for e in events]).update(status='processing', locked_at=now)

    counts = {'processed': 0, 'failed': 0, 'skipped': 0, 'retry': 0}
    network_failures = 0
    for index, event in enumerate(events):
        if network_failures >= NETWORK_FAILURES_BEFORE_PAUSE:
            # Telegram javob bermayapti: qolganlarini urinishsiz qaytaramiz (har biri 8 s kutib osilmasin)
            OutboxEvent.objects.filter(id__in=[e.id for e in events[index:]]).update(
                status='pending', locked_at=None, next_attempt_at=timezone.now() + timedelta(seconds=BACKOFF_SECONDS[0]))
            break
        try:
            dispatch_single_event(event)
            network_failures = 0
            event.status = 'completed'
            event.processed_at = timezone.now()
            event.error_message = ''
            event.locked_at = None
            event.save(update_fields=['status', 'processed_at', 'error_message', 'locked_at'])
            counts['processed'] += 1
        except OutboxSkipped as skip:
            event.status = 'completed'
            event.processed_at = timezone.now()
            event.error_message = f'skipped: {skip}'[:500]
            event.locked_at = None
            event.save(update_fields=['status', 'processed_at', 'error_message', 'locked_at'])
            counts['skipped'] += 1
        except OutboxPermanentError as err:
            event.retry_count += 1
            event.status = 'failed'
            event.error_message = str(err)[:500]
            event.locked_at = None
            event.save(update_fields=['status', 'retry_count', 'error_message', 'locked_at'])
            logger.warning('[Outbox] %s #%s doimiy xato: %s', event.event_type, event.pk, err)
            counts['failed'] += 1
        except OutboxRetryError as err:
            network_failures += 1
            _schedule_retry(event, str(err), retry_after=err.retry_after)
            counts['failed' if event.status == 'failed' else 'retry'] += 1
        except Exception as exc:                                  # ishlovchidagi kutilmagan xato
            logger.exception('[Outbox] %s #%s ishlovchi xatosi', event.event_type, event.pk)
            _schedule_retry(event, f'{type(exc).__name__}: {exc}')
            counts['failed' if event.status == 'failed' else 'retry'] += 1
    return counts


def outbox_stats(now=None) -> Dict[str, Optional[float]]:
    """Kuzatuv uchun: navbat holati (health sahifasi va `outbox_status` buyrug'i)."""
    now = now or timezone.now()
    pending = OutboxEvent.objects.filter(status='pending')
    oldest = pending.order_by('created_at').values_list('created_at', flat=True).first()
    return {
        'pending': pending.count(),
        'processing': OutboxEvent.objects.filter(status='processing').count(),
        'failed': OutboxEvent.objects.filter(status='failed').count(),
        'oldest_pending_seconds': round((now - oldest).total_seconds()) if oldest else None,
    }
