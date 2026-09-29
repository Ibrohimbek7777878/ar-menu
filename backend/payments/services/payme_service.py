"""
Payme to'lov integratsiyasi (Rasmiy Checkout va JSON-RPC 2.0).
API Dokumentatsiya: https://developer.payme.uz/
"""
import base64
import hashlib
import json
import logging
import time
from datetime import datetime

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

PAYME_API_URL = getattr(settings, 'PAYME_API_URL', 'https://payme.uz/api/')
PAYME_MERCHANT_ID = getattr(settings, 'PAYME_MERCHANT_ID', '')
PAYME_SECRET_KEY = getattr(settings, 'PAYME_SECRET_KEY', '')


def _get_auth_header() -> str:
    """Basic auth header generatsiya qilish."""
    credentials = f"Paycom:{PAYME_SECRET_KEY}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


def verify_payme_auth(auth_header: str) -> bool:
    """
    Payme rasmiy HTTP Basic Auth tekshiruvi.
    Agar PAYME_SECRET_KEY kiritilmagan bo'lsa (demo rejim), ruxsat beriladi.
    """
    if not PAYME_SECRET_KEY:
        return True
    if not auth_header or not auth_header.startswith('Basic '):
        return False

    try:
        raw_b64 = auth_header.split(' ', 1)[1].strip()
        decoded = base64.b64decode(raw_b64).decode('utf-8')
        parts = decoded.split(':', 1)
        if len(parts) == 2:
            password = parts[1]
            return password == PAYME_SECRET_KEY
    except Exception as e:
        logger.warning(f"Payme auth header parsing error: {e}")
    return False


def create_payment(order, return_url: str) -> dict:
    """
    Payme orqali to'lov yaratish.
    Agar kalitlar kiritilgan bo'lsa — Payme Checkout URL, aks holda Demo Simulyatori.
    """
    payment_id = f"GLS-PAY-{order.order_number}-{int(datetime.now().timestamp())}"
    amount_in_tiyin = int(order.final_amount) * 100  # Payme tiyinda hisoblaydi

    # Agar Payme kalitlari kiritilgan bo'lsa — Rasmiy Paycom Checkout URL
    if PAYME_MERCHANT_ID:
        params = f"m={PAYME_MERCHANT_ID};ac.order_id={order.order_number};a={amount_in_tiyin};c={return_url}"
        encoded = base64.b64encode(params.encode()).decode()
        pay_url = f"https://checkout.paycom.uz/{encoded}"
        return {
            'success': True,
            'payment_url': pay_url,
            'payment_id': payment_id,
            'merchant_transaction_id': payment_id,
            'provider_transaction_id': payment_id,
        }

    # Kalitlar kiritilmagan bo'lsa — professional Demo Simulyatori
    return {
        'success': True,
        'payment_url': f'/payment/demo/{order.pk}/?method=payme',
        'payment_id': payment_id,
        'merchant_transaction_id': payment_id,
        'provider_transaction_id': payment_id,
        'is_demo': True,
    }


def process_payme_jsonrpc(payload: dict, auth_header: str = '') -> dict:
    """
    Payme rasmiy Merchant JSON-RPC 2.0 so'rovlarini qayta ishlash.
    """
    rpc_id = payload.get('id')
    method = payload.get('method')
    params = payload.get('params', {})

    # 1. Autentifikatsiya tekshiruvi
    if not verify_payme_auth(auth_header):
        return {
            'id': rpc_id,
            'error': {
                'code': -32504,
                'message': {'uz': "Avtorizatsiya xatosi", 'ru': "Ошибка авторизации", 'en': "Insufficient privilege"}
            }
        }

    from payments.models import Payment
    from payments.payment_service import mark_payment_paid

    # 2. CheckPerformTransaction — To'lov qabul qila olishni tekshirish
    if method == 'CheckPerformTransaction':
        order_num = params.get('account', {}).get('order_id')
        amount_tiyin = params.get('amount', 0)
        from orders.models import Order
        order = Order.objects.filter(order_number=order_num).first()
        if not order:
            return {
                'id': rpc_id,
                'error': {
                    'code': -31050,
                    'message': {'uz': "Buyurtma topilmadi", 'ru': "Заказ не найден"}
                }
            }
        if int(order.final_amount) * 100 != int(amount_tiyin):
            return {
                'id': rpc_id,
                'error': {
                    'code': -31001,
                    'message': {'uz': "Noto'g'ri summa", 'ru': "Неверная сумма"}
                }
            }
        return {'id': rpc_id, 'result': {'allow': True}}

    # 3. CreateTransaction — Tranzaksiyani boshlash
    elif method == 'CreateTransaction':
        trans_id = params.get('id')
        order_num = params.get('account', {}).get('order_id')
        from orders.models import Order
        order = Order.objects.filter(order_number=order_num).first()
        if not order:
            return {'id': rpc_id, 'error': {'code': -31050, 'message': {'uz': "Buyurtma topilmadi"}}}

        with transaction.atomic():
            payment, _ = Payment.objects.get_or_create(
                merchant_transaction_id=f"PAYME-{trans_id}",
                defaults={
                    'order': order,
                    'provider': 'payme',
                    'provider_transaction_id': trans_id,
                    'amount': order.final_amount,
                    'status': 'pending',
                }
            )
            create_time = int(time.time() * 1000)
            return {
                'id': rpc_id,
                'result': {
                    'create_time': create_time,
                    'transaction': str(payment.id),
                    'state': 1,
                }
            }

    # 4. PerformTransaction — To'lovni to'liq bajarish va chekni yopish
    elif method == 'PerformTransaction':
        trans_id = params.get('id')
        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(
                provider_transaction_id=trans_id
            ).first() or Payment.objects.select_for_update().filter(
                merchant_transaction_id=f"PAYME-{trans_id}"
            ).first()

            if not payment:
                return {'id': rpc_id, 'error': {'code': -31003, 'message': {'uz': "Tranzaksiya topilmadi"}}}

            if payment.status != 'paid':
                mark_payment_paid(payment, provider_payload={'provider_transaction_id': str(trans_id)})

            perform_time = int(time.time() * 1000)
            return {
                'id': rpc_id,
                'result': {
                    'transaction': str(payment.id),
                    'perform_time': perform_time,
                    'state': 2,
                }
            }

    # 5. CheckTransaction — Tranzaksiya holati
    elif method == 'CheckTransaction':
        trans_id = params.get('id')
        payment = Payment.objects.filter(provider_transaction_id=trans_id).first()
        if not payment:
            return {'id': rpc_id, 'error': {'code': -31003, 'message': {'uz': "Tranzaksiya topilmadi"}}}
        state = 2 if payment.status == 'paid' else 1
        return {
            'id': rpc_id,
            'result': {
                'create_time': int(payment.created_at.timestamp() * 1000),
                'perform_time': int((payment.paid_at.timestamp() if payment.paid_at else 0) * 1000),
                'cancel_time': 0,
                'transaction': str(payment.id),
                'state': state,
                'reason': None,
            }
        }

    return {
        'id': rpc_id,
        'error': {'code': -32601, 'message': {'uz': "Bunday metod mavjud emas"}}
    }


def verify_payment(payment_id: str, card_token: str = None) -> dict:
    """Oddiy webhook tasdiqlash uchun yordamchi funksiya."""
    from payments.models import Payment
    from payments.payment_service import mark_payment_paid

    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(
            merchant_transaction_id=payment_id
        ).first()
        if not payment:
            return {'success': False, 'error': 'To\'lov topilmadi'}

        if payment.status == 'paid':
            return {'success': True, 'already_processed': True}

        mark_payment_paid(payment, provider_payload={'provider_transaction_id': str(card_token or payment_id)})
    return {'success': True}
