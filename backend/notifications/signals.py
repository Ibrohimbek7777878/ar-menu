"""
Signallar: biznes hodisasi → outbox (TZ: R3-4, R3-5).

Hech qaysi signal so'rov ichida tarmoqqa chiqmaydi: faqat `outbox_events` jadvaliga yozadi, yuborishni
`manage.py run_workers` bajaradi. Bildirishnoma o'zi ham xato bersa, buyurtma yoki chaqiruv yaratilishiga
xalaqit bermaydi (xato logga yoziladi).
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from orders.models import Order
from tables_restaurant.models import ServiceCall

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order, dispatch_uid='notify_admins_new_order')
def notify_admins_new_order(sender, instance, created, **kwargs):
    if not created or kwargs.get('raw'):          # raw: loaddata/tiklash — eski buyurtmalar uchun xabar yuborilmaydi
        return
    try:
        from notifications.outbox import publish_outbox_event
        publish_outbox_event(
            aggregate_type='order',
            aggregate_id=str(instance.id),
            event_type='order.created',
            payload={
                'order_id': instance.id,
                'order_number': instance.order_number,
                'shop_id': instance.shop_id,
            }
        )
    except Exception:
        logger.exception("Yangi buyurtma xabarini outbox'ga yozib bo'lmadi (order=%s)", instance.pk)


@receiver(post_save, sender=ServiceCall, dispatch_uid='notify_service_call_created')
def notify_service_call_created(sender, instance, created, **kwargs):
    """Ofitsiant chaqiruvi / "taom tayyor" → Telegram (admin sozlamasi yoqilgan bo'lsa; qarori ishchida)."""
    if not created or kwargs.get('raw'):          # raw: loaddata/tiklash
        return
    try:
        from notifications.outbox import publish_outbox_event
        publish_outbox_event(
            aggregate_type='service_call',
            aggregate_id=str(instance.id),
            event_type='service_call.created',
            payload={'call_id': instance.id, 'call_type': instance.call_type, 'shop_id': instance.shop_id},
        )
    except Exception:
        logger.exception("Chaqiruv xabarini outbox'ga yozib bo'lmadi (call=%s)", instance.pk)
