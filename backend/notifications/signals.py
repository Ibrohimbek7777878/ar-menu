"""
Signal: yangi buyurtma → admin Telegram chatlariga xabar.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from orders.models import Order

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order, dispatch_uid='notify_admins_new_order')
def notify_admins_new_order(sender, instance, created, **kwargs):
    if not created:
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
                'customer_name': instance.customer_name,
                'total_amount': str(instance.total_amount),
                'shop_id': instance.shop_id,
            }
        )
    except Exception as e:
        # Fallback to direct call agar outbox xato bersa
        logger.warning(f'Outbox publish failed, fallback to direct notify: {e}')
        try:
            from notifications.admin_bot import notify_new_order
            notify_new_order(instance)
        except Exception as direct_err:
            logger.warning(f'Direct admin notification failed: {direct_err}')
