import logging

log = logging.getLogger('apps.analytics')


def handle(job):
    """Analytics handler — eventni DB ga yozadi."""
    from apps.analytics.models import AnalyticsEvent
    payload = job.payload if hasattr(job, 'payload') else {}
    restaurant_id = payload.get('restaurant_id') or getattr(job, 'restaurant_id', None)

    if not restaurant_id and 'order_id' in payload:
        from apps.orders.models import Order
        order = Order.objects.filter(id=payload['order_id']).only('restaurant_id').first()
        if order:
            restaurant_id = order.restaurant_id

    event = AnalyticsEvent.objects.create(
        restaurant_id=restaurant_id,
        event_type=job.type,
        payload=payload,
    )
    log.info(f'[analytics] Job#{job.id} → AnalyticsEvent#{event.id} (tenant={restaurant_id}) yaratildi')
    return {'analytics_saved': True, 'event_id': event.id, 'restaurant_id': restaurant_id}
