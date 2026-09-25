"""
UzCard to'lov integratsiyasi.
Chopar / Paycom orqali UzCard qabul qilish.
"""
import hashlib
import json
from datetime import datetime

import httpx

from django.conf import settings


UZCARD_API_URL = getattr(settings, 'UZCARD_API_URL', 'https://api.paycom.uz/v2')
UZCARD_MERCHANT_ID = getattr(settings, 'UZCARD_MERCHANT_ID', '')
UZCARD_SECRET_KEY = getattr(settings, 'UZCARD_SECRET_KEY', '')
UZCARD_CALLBACK_URL = getattr(settings, 'UZCARD_CALLBACK_URL', '')


def _generate_token(data_str):
    """API uchun token generatsiya."""
    return hashlib.sha256((data_str + UZCARD_SECRET_KEY).encode()).hexdigest()


def create_payment(order, return_url):
    """
    UzCard orqali to'lov yaratish (Paycom API v2).
    """
    payment_id = f"GLS-{order.order_number}-{int(datetime.now().timestamp())}"
    amount = int(order.final_amount)

    headers = {
        "Content-Type": "application/json",
    }

    payload = {
        "id": payment_id,
        "merchant": UZCARD_MERCHANT_ID,
        "amount": amount,
        "description": f"Buyurtma #{order.order_number}",
        "return_url": return_url,
        "callback_url": UZCARD_CALLBACK_URL,
    }

    try:
        resp = httpx.post(
            f"{UZCARD_API_URL}/payments/create",
            json=payload,
            headers=headers,
            timeout=10,
        )
        data = resp.json()
        if data.get('code') == 0:
            return {
                'success': True,
                'payment_url': data.get('data', {}).get('receipt_url', ''),
                'payment_id': payment_id,
                'payment_token': data.get('data', {}).get('token', ''),
            }
        return {
            'success': False,
            'error': data.get('message', 'UzCard xatolik'),
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def verify_payment(payment_id, receipt_id):
    """To'lov tasdiqlash (callback uchun)."""
    from .models import Payment
    try:
        payment = Payment.objects.get(payment_id=payment_id)
    except Payment.DoesNotExist:
        return {'success': False, 'error': 'Payment not found'}

    try:
        resp = httpx.get(
            f"{UZCARD_API_URL}/payments/{payment_id}",
            timeout=10,
        )
        data = resp.json()
        if data.get('code') == 0:
            status = data.get('data', {}).get('status')
            if status in ('paid', 'success'):
                payment.status = 'success'
                payment.external_id = receipt_id
                payment.save()
                order = payment.order
                order.status = 'confirmed'
                order.save()
                return {'success': True}
        return {'success': False, 'error': 'Verification failed'}
    except Exception as e:
        return {'success': False, 'error': str(e)}
