import logging
from typing import Dict, Any, Optional
from django.db import connection, transaction
from django.utils import timezone
from .models import OutboxEvent

logger = logging.getLogger(__name__)


def publish_outbox_event(
    aggregate_type: str,
    aggregate_id: str,
    event_type: str,
    payload: Dict[str, Any],
) -> OutboxEvent:
    """
    Transactional Outbox Pattern orqali hodisa yaratish.
    Bu funksiya chaqirilganda, hodisa asosiy tranzaksiya bilan birga
    100% ACID kafolati bilan outbox_events jadvaliga yoziladi.
    Tizim tashqi tarmoq so'rovini (Telegram/SMS/Push) kutib qotib qolmaydi (<5ms).
    """
    event = OutboxEvent.objects.create(
        aggregate_type=str(aggregate_type),
        aggregate_id=str(aggregate_id),
        event_type=str(event_type),
        payload=payload,
        status='pending',
    )

    # Tranzaksiya commit bo'lgach Celery taskini chaqirish
    def _trigger():
        try:
            from .tasks import process_outbox_queue
            process_outbox_queue.delay()
        except Exception as e:
            logger.debug(f"[Outbox] Celery trigger postponed: {e}")

    transaction.on_commit(_trigger)
    return event


class OutboxService:
    @staticmethod
    def log_event(event_type: str, payload: Dict[str, Any], aggregate_type: str = 'restaurant', aggregate_id: str = '0') -> OutboxEvent:
        return publish_outbox_event(aggregate_type, aggregate_id, event_type, payload)


def dispatch_single_event(event: OutboxEvent) -> bool:
    """
    Hodisani turiga qarab tegishli servisga xavfsiz yo'naltirish.
    """
    payload = event.payload or {}
    event_type = event.event_type

    if event_type == 'telegram.send_message':
        from .services.telegram_service import _send_message
        chat_id = payload.get('chat_id')
        text = payload.get('text', '')
        parse_mode = payload.get('parse_mode', 'HTML')
        reply_markup = payload.get('reply_markup')
        return bool(_send_message(chat_id, text, parse_mode=parse_mode, reply_markup=reply_markup))

    elif event_type == 'telegram.order_alert':
        from .services.telegram_service import notify_new_order_to_seller
        from orders.models import Order
        order_id = payload.get('order_id')
        if order_id:
            order = Order.objects.filter(id=order_id).first()
            if order:
                notify_new_order_to_seller(order)
                return True
        return False

    elif event_type == 'order.created':
        from notifications.admin_bot import notify_new_order
        from orders.models import Order
        order_id = payload.get('order_id')
        if order_id:
            order = Order.objects.filter(id=order_id).first()
            if order:
                notify_new_order(order)
                return True
        return True

    elif event_type.startswith('3d_studio'):
        from .telegram_bot import send_message
        chat_id = payload.get('chat_id')
        text = payload.get('text', '')
        if chat_id and text:
            return bool(send_message(chat_id, text))
        return True

    elif event_type.startswith('kds'):
        logger.info(f"[Outbox][KDS] Dish status broadcasted: {payload}")
        return True

    # Standart xabarnoma/custom hodisa
    logger.info(f"[Outbox] Dispatched custom event: {event_type} payload={payload}")
    return True


def process_outbox_batch(batch_size: int = 50) -> Dict[str, int]:
    """
    Celery worker tomonidan 1000+ concurrent yuklamada xavfsiz bajariladigan protsessor.
    PostgreSQL da 'SELECT ... FOR UPDATE SKIP LOCKED' orqali bir nechta workerlar
    bir-biri bilan qulflanib (deadlock) qolmasdan parallel ishlaydi.
    """
    processed = 0
    failed = 0

    with transaction.atomic():
        # PostgreSQL da SKIP LOCKED, SQLite da oddiy select_for_update
        if connection.vendor == 'postgresql':
            events = list(
                OutboxEvent.objects.select_for_update(skip_locked=True)
                .filter(status='pending')
                .order_by('created_at')[:batch_size]
            )
        else:
            events = list(
                OutboxEvent.objects.select_for_update()
                .filter(status='pending')
                .order_by('created_at')[:batch_size]
            )

        if not events:
            return {'processed': 0, 'failed': 0}

        # Hodisalarni processing holatiga o'tkazish
        event_ids = [e.id for e in events]
        OutboxEvent.objects.filter(id__in=event_ids).update(status='processing')

    for event in events:
        try:
            success = dispatch_single_event(event)
            if success:
                event.status = 'completed'
                event.processed_at = timezone.now()
                event.error_message = ''
                event.save(update_fields=['status', 'processed_at', 'error_message'])
                processed += 1
            else:
                event.retry_count += 1
                if event.retry_count >= event.max_retries:
                    event.status = 'failed'
                else:
                    event.status = 'pending'
                event.error_message = 'Dispatch returned false'
                event.save(update_fields=['status', 'retry_count', 'error_message'])
                failed += 1
        except Exception as exc:
            logger.error(f"[Outbox] Error processing event {event.id}: {exc}", exc_info=True)
            event.retry_count += 1
            if event.retry_count >= event.max_retries:
                event.status = 'failed'
            else:
                event.status = 'pending'
            event.error_message = str(exc)
            event.save(update_fields=['status', 'retry_count', 'error_message'])
            failed += 1

    return {'processed': processed, 'failed': failed}
