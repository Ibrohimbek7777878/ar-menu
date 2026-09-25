"""
Payme to'lov integratsiyasi.
API Dokumentatsiya: https://developer.payme.uz/
"""
import hashlib
import base64
import json
from datetime import datetime

import httpx

from django.conf import settings


PAYME_API_URL = getattr(settings, 'PAYME_API_URL', 'https://payme.uz/api/')
PAYME_MERCHANT_ID = getattr(settings, 'PAYME_MERCHANT_ID', '')
PAYME_SECRET_KEY = getattr(settings, 'PAYME_SECRET_KEY', '')


def _get_auth_header():
    """Basic auth header generatsiya qilish."""
    credentials = f"{PAYME_MERCHANT_ID}:{PAYME_SECRET_KEY}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


def create_payment(order, return_url):
    """
    Payme orqali to'lov yaratish.
    """
    payment_id = f"GLS-{order.order_number}-{int(datetime.now().timestamp())}"
    amount = int(order.final_amount) * 100  # Payme tiyinlarda qabul qiladi

    # Agar Payme kalitlari kiritilgan bo'lsa — Payme rasmiy Checkout URL (Base64 payload)
    if PAYME_MERCHANT_ID:
        params = f"m={PAYME_MERCHANT_ID};ac.order_id={order.order_number};a={amount}"
        encoded = base64.b64encode(params.encode()).decode()
        pay_url = f"https://checkout.paycom.uz/{encoded}"
        return {
            'success': True,
            'payment_url': pay_url,
            'payment_id': payment_id,
            'merchant_transaction_id': payment_id,
            'provider_transaction_id': payment_id,
        }

    # Kalitlar bo'lmaganda xavfsiz test mock sahifasi
    return {
        'success': True,
        'payment_url': f'/api/payments/mock/{payment_id}/',
        'payment_id': payment_id,
        'merchant_transaction_id': payment_id,
        'provider_transaction_id': payment_id,
    }


def verify_payment(payment_id, card_token):
    """To'lov tasdiqlash."""
    from django.db import transaction
    from payments.models import Payment

    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(
            merchant_transaction_id=payment_id
        ).first()
        if not payment:
            return {'success': False, 'error': 'Payment not found'}

        # Idempotency: allaqachon to'langan bo'lsa — qayta ishlamaydi
        if payment.status == 'paid':
            return {'success': True, 'already_processed': True}

        payment.status = 'paid'
        payment.provider_transaction_id = str(card_token or '')
        payment.paid_at = datetime.now()
        payment.save(update_fields=['status', 'provider_transaction_id', 'paid_at'])

        order = payment.order
        if order:
            order.status = 'confirmed'
            order.payment_status = 'paid'
            order.save(update_fields=['status', 'payment_status'])
    return {'success': True}
