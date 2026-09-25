from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import Order
try:
    from apps.calls.models import Call
    HAS_CALLS = True
except ImportError:
    HAS_CALLS = False

from apps.tables.services_floorplan import broadcast_table_state


@receiver(post_save, sender=Order)
def _order_changed(sender, instance, **kwargs):
    if not instance.table_id:
        return
    rid, tid = instance.restaurant_id, instance.table_id
    transaction.on_commit(lambda: broadcast_table_state(rid, tid))


if HAS_CALLS:
    @receiver(post_save, sender=Call)
    def _call_changed(sender, instance, **kwargs):
        if not instance.table_id:
            return
        rid, tid = instance.restaurant_id, instance.table_id
        transaction.on_commit(lambda: broadcast_table_state(rid, tid))
