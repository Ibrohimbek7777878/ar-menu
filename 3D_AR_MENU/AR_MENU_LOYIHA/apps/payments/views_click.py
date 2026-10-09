"""Click webhook — Prepare + Complete actionlar, MD5 imzo"""
import hashlib
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.payments.models import Payment, PaymentLog

log = logging.getLogger('payments.click')


def _verify_sign(params):
    """MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)"""
    secret = getattr(settings, 'CLICK_SECRET', '')
    mode = getattr(settings, 'PAYMENTS_MODE', 'sandbox')
    if not secret:
        if mode == 'sandbox':
            log.info('[click] Sandbox rejimida secret kalitsiz imzo qabul qilindi')
            return True, None
        return False, 'disabled'
    sign_str = f"{params.get('click_trans_id','')}{params.get('service_id','')}{secret}{params.get('merchant_trans_id','')}{params.get('amount','')}{params.get('action','')}{params.get('sign_time','')}"
    if hashlib.md5(sign_str.encode()).hexdigest() == params.get('sign_string', ''):
        return True, None
    return False, 'invalid_sign'


@csrf_exempt
@require_POST
def click_webhook(request):
    """POST /v1/payments/webhook/click/"""
    try:
        import json
        params = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': -1, 'error_note': 'Invalid JSON'}, status=200)

    action = params.get('action')
    log.info(f'[click] action={action} params={params}')

    PaymentLog.objects.create(
        provider='click', direction='in',
        payload=params,
    )

    ok, reason = _verify_sign(params)
    if not ok:
        if reason == 'disabled':
            return JsonResponse({'error': -1, 'error_note': 'Payment provider disabled'}, status=503)
        return JsonResponse({'error': -1, 'error_note': 'SIGN CHECK FAILED'}, status=200)

    if action == '0':  # Prepare
        return _prepare(params)
    elif action == '1':  # Complete
        return _complete(params)
    else:
        return JsonResponse({'error': -3, 'error_note': 'Unknown action'}, status=200)


def _prepare(params):
    order_id = params.get('merchant_trans_id')
    amount = params.get('amount', 0)
    try:
        order = __import__('apps.orders.models', fromlist=['Order']).Order.objects.get(id=order_id)
        if int(float(order.total) * 100) != int(amount):
            return JsonResponse({'error': -2, 'error_note': 'Amount mismatch'}, status=200)
        # Prepare — faqat tekshirish, to'lov yo'q
        return JsonResponse({'click_trans_id': 0, 'merchant_trans_id': order_id, 'error': 0, 'error_note': 'Success'}, status=200)
    except Exception:
        return JsonResponse({'error': -5, 'error_note': 'Order not found'}, status=200)


def _complete(params):
    order_id = params.get('merchant_trans_id')
    click_txn = params.get('click_trans_id', 0)
    amount = params.get('amount', 0)

    try:
        order = __import__('apps.orders.models', fromlist=['Order']).Order.objects.get(id=order_id)
        pay, _ = Payment.objects.get_or_create(
            order=order, provider='click', provider_txn_id=str(click_txn),
            defaults={'restaurant': order.restaurant, 'amount': int(amount) / 100, 'status': 'pending'},
        )

        if pay.status == 'paid':
            return JsonResponse({'click_trans_id': click_txn, 'merchant_trans_id': order_id, 'error': 0, 'error_note': 'Already paid'}, status=200)

        from django.utils import timezone
        pay.status = 'paid'
        pay.paid_at = timezone.now()
        pay.save(update_fields=['status', 'paid_at', 'updated_at'])

        try:
            from apps.orders.state import transition
            transition(order, 'paid')
        except Exception as e:
            log.warning(f'[click] order transition xato: {e}')

        log.info(f'[click] ✅ Payment#{pay.id} paid — order#{order_id}')
        return JsonResponse({'click_trans_id': click_txn, 'merchant_trans_id': order_id, 'error': 0, 'error_note': 'Success'}, status=200)
    except Exception as e:
        return JsonResponse({'error': -5, 'error_note': str(e)}, status=200)
