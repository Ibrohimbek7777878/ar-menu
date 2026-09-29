"""
UzCard to'lov integratsiyasi.
Chopar / Paycom API v2 orqali UzCard qabul qilish.
"""
import hashlib
import json
import logging
from datetime import datetime

import httpx
from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

UZCARD_API_URL = getattr(settings, 'UZCARD_API_URL', 'https://api.paycom.uz/v2')
UZCARD_MERCHANT_ID = getattr(settings, 'UZCARD_MERCHANT_ID', '')
UZCARD_SECRET_KEY = getattr(settings, 'UZCARD_SECRET_KEY', '')
UZCARD_CALLBACK_URL = getattr(settings, 'UZCARD_CALLBACK_URL', '')


def _generate_token(data_str: str) -> str:
    """API uchun SHA256 token generatsiya."""
    return hashlib.sha256((data_str + UZCARD_SECRET_KEY).encode()).hexdigest()


def create_payment(order, return_url: str) -> dict:
    """
    UzCard orqali to'lov yaratish (Paycom API v2).
    Agar kalitlar sozlanmagan bo'lsa, xavfsiz demo to'lov havolasini qaytaradi.
    """
    payment_id = f"GLS-UZC-{order.order_number}-{int(datetime.now().timestamp())}"
    amount = int(order.final_amount)

    # Agar UzCard/Paycom kalitlari kiritilgan bo'lsa — real API ga so'rov
    if UZCARD_MERCHANT_ID and UZCARD_SECRET_KEY:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {_generate_token(payment_id)}",
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
                timeout=12,
            )
            data = resp.json()
            if data.get('code') == 0:
                receipt_url = data.get('data', {}).get('receipt_url') or return_url
                return {
                    'success': True,
                    'payment_url': receipt_url,
                    'payment_id': payment_id,
                    'merchant_transaction_id': payment_id,
                    'provider_transaction_id': data.get('data', {}).get('token', payment_id),
                }
            logger.warning(f"UzCard create payment rejected: {data}")
            return {
                'success': False,
                'error': data.get('message', 'UzCard to\'lov rad etildi'),
            }
        except Exception as e:
            logger.error(f"UzCard API connection error: {e}")
            return {'success': False, 'error': f"UzCard aloqa xatosi: {str(e)}"}

    # Agar real kalitlar hali kiritilmagan bo'lsa — professional demo to'lov simulyatori
    return {
        'success': True,
        'payment_url': f'/payment/demo/{order.pk}/?method=uzcard',
        'payment_id': payment_id,
        'merchant_transaction_id': payment_id,
        'provider_transaction_id': payment_id,
        'is_demo': True,
    }


def verify_payment(payment_id: str, receipt_id: str = None) -> dict:
    """
    To'lov tasdiqlash (callback va tekshiruv uchun).
    Baza yaxlitligi: select_for_update, 'paid' statusi va to'liq Moliya/Order sinxronizatsiyasi.
    """
    from payments.models import Payment
    from payments.payment_service import mark_payment_paid

    if not payment_id:
        return {'success': False, 'error': 'To\'lov identifikatori (payment_id) ko\'rsatilmagan'}

    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(
            merchant_transaction_id=payment_id
        ).first()

        if not payment:
            return {'success': False, 'error': f'To\'lov topilmadi: {payment_id}'}

        # Idempotency: agar to'langan bo'lsa qayta ishlamaydi
        if payment.status == 'paid':
            return {'success': True, 'already_processed': True}

        # Agar real API kalitlar bo'lsa va provayder orqali tekshirish talab etilsa
        if UZCARD_MERCHANT_ID and UZCARD_SECRET_KEY:
            try:
                resp = httpx.get(
                    f"{UZCARD_API_URL}/payments/{payment_id}",
                    headers={"Authorization": f"Bearer {_generate_token(payment_id)}"},
                    timeout=10,
                )
                data = resp.json()
                if data.get('code') != 0:
                    return {'success': False, 'error': data.get('message', 'UzCard tasdiqlanmadi')}
                remote_status = data.get('data', {}).get('status')
                if remote_status not in ('paid', 'success'):
                    return {'success': False, 'error': f'UzCard holati to\'lanmagan: {remote_status}'}
            except Exception as e:
                logger.error(f"UzCard verification request error: {e}")
                return {'success': False, 'error': f'UzCard tarmoq xatosi: {str(e)}'}

        # Standart to'lovni tasdiqlash quvuri (Finance, Order, Courier, Telegram avtomatik ishlaydi)
        mark_payment_paid(
            payment,
            provider_payload={'provider_transaction_id': str(receipt_id or payment_id)}
        )

    return {'success': True}
