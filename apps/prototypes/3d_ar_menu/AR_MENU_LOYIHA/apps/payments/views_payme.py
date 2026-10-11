"""Payme webhook — JSON-RPC 6 metod (CheckPerformTransaction, CreateTransaction, etc.)"""
import hashlib
import hmac
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.payments.models import Payment, PaymentLog

log = logging.getLogger('payments.payme')


def _auth_ok(request):
    """Basic auth tekshiruvi: PAYME_MERCHANT_ID:PAYME_KEY"""
    merchant_id = getattr(settings, 'PAYME_MERCHANT_ID', '')
    key = getattr(settings, 'PAYME_KEY', '')
    mode = getattr(settings, 'PAYMENTS_MODE', 'sandbox')

    if not merchant_id or not key:
        if mode == 'sandbox':
            log.info('[payme] Sandbox rejimida kalitlarsiz so\'rov qabul qilindi')
            return True, None
        return False, 'disabled'

    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth.startswith('Basic '):
        return False, 'unauth'
    import base64
    try:
        decoded = base64.b64decode(auth[6:]).decode()
        user, pwd = decoded.split(':', 1)
        if user == merchant_id and pwd == key:
            return True, None
        return False, 'unauth'
    except Exception:
        return False, 'unauth'


@csrf_exempt
@require_POST
def payme_webhook(request):
    """POST /v1/payments/webhook/payme/ — JSON-RPC"""
    ok, reason = _auth_ok(request)
    if not ok:
        if reason == 'disabled':
            return JsonResponse({'error': 'Payment provider disabled'}, status=503)
        return JsonResponse({'error': {'code': -32504, 'message': 'Not authenticated'}}, status=200)

    try:
        body = request.body.decode('utf-8')
        import json
        data = json.loads(body)
    except Exception:
        return JsonResponse({'error': {'code': -32600, 'message': 'Invalid request'}}, status=200)

    method = data.get('method', '')
    params = data.get('params', {})
    req_id = data.get('id', 1)

    log.info(f'[payme] method={method} params={params}')

    # Har holda log yozish
    PaymentLog.objects.create(
        provider='payme', direction='in',
        payload={'method': method, 'params': params},
    )

    handler = {
        'CheckPerformTransaction': _check_perform,
        'CreateTransaction': _create,
        'PerformTransaction': _perform,
        'CancelTransaction': _cancel,
        'CheckTransaction': _check,
        'GetStatement': _get_statement,
    }.get(method)

    if handler:
        result = handler(params)
    else:
        result = {'error': {'code': -32601, 'message': f'Unknown method: {method}'}}

    return JsonResponse({'jsonrpc': '2.0', 'id': req_id, **result})


def _check_perform(params):
    amount = params.get('amount', 0)
    order_id = params.get('account', {}).get('order_id')
    if not order_id:
        return {'error': {'code': -31001, 'message': 'order_id required'}}
    try:
        order = __import__('apps.orders.models', fromlist=['Order']).Order.objects.get(id=order_id)
    except Exception:
        return {'error': {'code': -31001, 'message': 'Order not found'}}
    if int(float(order.total) * 100) != amount:
        return {'error': {'code': -31001, 'message': f'Amount mismatch: expected {int(float(order.total)*100)}'}}
    return {'result': True}


def _create(params):
    order_id = params.get('account', {}).get('order_id')
    txn_id = params.get('id', 0)
    amount = params.get('amount', 0)
    try:
        order = __import__('apps.orders.models', fromlist=['Order']).Order.objects.get(id=order_id)
        pay, _ = Payment.objects.get_or_create(
            order=order, provider='payme', provider_txn_id=str(txn_id),
            defaults={'restaurant': order.restaurant, 'amount': amount / 100, 'status': 'pending'},
        )
        return {'result': {'id': pay.id}}
    except Exception as e:
        return {'error': {'code': -31001, 'message': str(e)}}


def _perform(params):
    txn_id = params.get('id', 0)
    pay = Payment.objects.filter(provider='payme', provider_txn_id=str(txn_id)).first()
    if not pay:
        return {'error': {'code': -31001, 'message': 'Transaction not found'}}
    if pay.status == 'paid':
        return {'result': {'transaction': pay.id, 'perform_time': int(pay.paid_at.timestamp()) if pay.paid_at else 0}}

    from django.utils import timezone
    pay.status = 'paid'
    pay.paid_at = timezone.now()
    pay.save(update_fields=['status', 'paid_at', 'updated_at'])

    # Order ni to'langan qilish
    try:
        from apps.orders.state import transition
        transition(pay.order, 'paid')
    except Exception as e:
        log.warning(f'[payme] order transition xato: {e}')

    log.info(f'[payme] ✅ Payment#{pay.id} paid — order#{pay.order_id}')
    return {'result': {'transaction': pay.id, 'perform_time': int(pay.paid_at.timestamp())}}


def _cancel(params):
    txn_id = params.get('id', 0)
    pay = Payment.objects.filter(provider='payme', provider_txn_id=str(txn_id)).first()
    if not pay:
        return {'error': {'code': -31001, 'message': 'Transaction not found'}}
    pay.status = 'cancelled'
    pay.save(update_fields=['status', 'updated_at'])
    return {'result': {'transaction': pay.id, 'cancel_time': 0}}


def _check(params):
    txn_id = params.get('id', 0)
    pay = Payment.objects.filter(provider='payme', provider_txn_id=str(txn_id)).first()
    if not pay:
        return {'error': {'code': -31001, 'message': 'Transaction not found'}}
    return {'result': {
        'id': pay.id,
        'time': int(pay.created_at.timestamp()),
        'amount': int(float(pay.amount) * 100),
        'status': 2 if pay.status == 'paid' else 0,
    }}


def _get_statement(params):
    return {'result': {'transactions': []}}
