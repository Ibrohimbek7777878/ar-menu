"""Uzum webhook — HMAC-SHA256 header tekshiruvi"""
import hashlib
import hmac
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.payments.models import Payment, PaymentLog

log = logging.getLogger('payments.uzum')


def _verify_hmac(request):
    secret = getattr(settings, 'UZUM_SECRET', '')
    mode = getattr(settings, 'PAYMENTS_MODE', 'sandbox')
    if not secret:
        if mode == 'sandbox':
            log.info('[uzum] Sandbox rejimida secret kalitsiz HMAC qabul qilindi')
            return True, None
        return False, 'disabled'
    sig = request.META.get('HTTP_UZUM_SIGNATURE', '')
    if not sig:
        return False, 'missing_signature'
    expected = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig, expected):
        return True, None
    return False, 'invalid_signature'


@csrf_exempt
@require_POST
def uzum_webhook(request):
    """POST /v1/payments/webhook/uzum/"""
    ok, reason = _verify_hmac(request)
    if not ok:
        if reason == 'disabled':
            return JsonResponse({'error': 'Payment provider disabled'}, status=503)
        return JsonResponse({'error': 'Invalid signature'}, status=401)

    try:
        import json
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    event = data.get('event', '')
    log.info(f'[uzum] event={event}')

    PaymentLog.objects.create(
        provider='uzum', direction='in',
        payload=data,
    )

    if event == 'payment.success':
        return _payment_success(data)
    elif event == 'payment.refund':
        return _payment_refund(data)
    else:
        log.info(f'[uzum] unknown event: {event}')
        return JsonResponse({'ok': True})


def _payment_success(data):
    order_id = data.get('order_id')
    txn_id = data.get('transaction_id', '')
    amount = data.get('amount', 0)

    try:
        order = __import__('apps.orders.models', fromlist=['Order']).Order.objects.get(id=order_id)
        pay, _ = Payment.objects.get_or_create(
            order=order, provider='uzum', provider_txn_id=str(txn_id),
            defaults={'restaurant': order.restaurant, 'amount': amount / 100, 'status': 'pending'},
        )

        if pay.status == 'paid':
            return JsonResponse({'ok': True, 'status': 'already_paid'})

        from django.utils import timezone
        pay.status = 'paid'
        pay.paid_at = timezone.now()
        pay.save(update_fields=['status', 'paid_at', 'updated_at'])

        try:
            from apps.orders.state import transition
            transition(order, 'paid')
        except Exception as e:
            log.warning(f'[uzum] order transition xato: {e}')

        log.info(f'[uzum] ✅ Payment#{pay.id} paid — order#{order_id}')
        return JsonResponse({'ok': True})
    except Exception as e:
        log.error(f'[uzum] xato: {e}')
        return JsonResponse({'error': str(e)}, status=500)


def _payment_refund(data):
    txn_id = data.get('transaction_id', '')
    pay = Payment.objects.filter(provider='uzum', provider_txn_id=str(txn_id)).first()
    if pay:
        pay.status = 'refunded'
        pay.save(update_fields=['status', 'updated_at'])
        log.info(f'[uzum] refund Payment#{pay.id}')
    return JsonResponse({'ok': True})
