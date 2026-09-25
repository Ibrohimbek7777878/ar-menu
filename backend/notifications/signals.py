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
        from notifications.admin_bot import notify_new_order
        notify_new_order(instance)
    except Exception as e:
        logger.warning(f'Admin telegram xabari yuborilmadi: {e}')
