import logging

log = logging.getLogger('fiscal')


def handle(job):
    """Fiscal/OFD handler — sandbox'da demo id yozadi va Payment.fiscal_id ni to'ldiradi."""
    payload = job.payload if hasattr(job, 'payload') else {}
    order_id = payload.get('order_id')
    fiscal_id = f'DEMO-{job.id}-{job.type}'
    log.info(f'[fiscal] Job#{job.id} — fiscal_id={fiscal_id} (order={order_id})')

    if order_id:
        from apps.payments.models import Payment
        payment = Payment.objects.filter(order_id=order_id).order_by('-created_at').first()
        if payment:
            payment.fiscal_id = fiscal_id
            payment.save(update_fields=['fiscal_id', 'updated_at'])
            log.info(f'[fiscal] Payment#{payment.id} fiscal_id={fiscal_id} saqlandi')
        else:
            from apps.orders.models import Order
            order = Order.objects.filter(id=order_id).first()
            if order:
                Payment.objects.create(
                    restaurant=order.restaurant,
                    order=order,
                    provider='cash',
                    status='paid',
                    amount=order.total,
                    fiscal_id=fiscal_id,
                )
                log.info(f'[fiscal] Yangi Payment yaratilib fiscal_id={fiscal_id} saqlandi')

    return {'fiscal_id': fiscal_id, 'order_id': order_id}
