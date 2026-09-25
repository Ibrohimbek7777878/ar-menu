"""
Click to'lov integratsiyasi.
API Dokumentatsiya: https://docs.click.uz/
"""
import hashlib
import json
from datetime import datetime
from decimal import Decimal

import httpx

from django.conf import settings


CLICK_API_URL = getattr(settings, 'CLICK_API_URL', 'https://api.click.uz/v1')
CLICK_MERCHANT_ID = getattr(settings, 'CLICK_MERCHANT_ID', '')
CLICK_SECRET_KEY = getattr(settings, 'CLICK_SECRET_KEY', '')
CLICK_SERVICE_ID = getattr(settings, 'CLICK_SERVICE_ID', '')


def _generate_password(merchant_trans_id, amount):
    """Click API uchun password generatsiya qilish."""
    raw = f"{CLICK_MERCHANT_ID}{merchant_trans_id}{amount}{CLICK_SECRET_KEY}"
    return hashlib.md5(raw.encode()).hexdigest()


def create_payment(order, return_url):
    """
    Click orqali to'lov yaratish.
    return_url: to'lov muvaffaqiyatli bo'lgandan keyin qaytish manzili
    """
    payment_id = f"GLS-{order.order_number}-{int(datetime.now().timestamp())}"
    amount = int(order.final_amount)

    # Agar Click kalitlari sozlangan bo'lsa — Click rasmiy checkout URL shakllantirish
    if CLICK_MERCHANT_ID and CLICK_SERVICE_ID:
        click_pay_url = (
            f"https://my.click.uz/services/pay"
            f"?service_id={CLICK_SERVICE_ID}"
            f"&merchant_id={CLICK_MERCHANT_ID}"
            f"&amount={amount}"
            f"&transaction_param={payment_id}"
            f"&return_url={return_url}"
        )
        return {
            'success': True,
            'payment_url': click_pay_url,
            'payment_id': payment_id,
            'merchant_transaction_id': payment_id,
            'provider_transaction_id': payment_id,
        }

    # Kalitlar bo'lmasa test mock oqimi uchun
    return {
        'success': True,
        'payment_url': f'/api/payments/mock/{payment_id}/',
        'payment_id': payment_id,
        'merchant_transaction_id': payment_id,
        'provider_transaction_id': payment_id,
    }


def verify_payment(payment_id, click_trans_id):
    """To'lov tasdiqlash (webhook uchun)."""
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
        payment.provider_transaction_id = str(click_trans_id or '')
        payment.paid_at = datetime.now()
        payment.save(update_fields=['status', 'provider_transaction_id', 'paid_at'])

        order = payment.order
        if order:
            order.status = 'confirmed'
            order.payment_status = 'paid'
            order.save(update_fields=['status', 'payment_status'])
    return {'success': True}
