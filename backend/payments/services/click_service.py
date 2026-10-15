"""
Click to'lov integratsiyasi (Rasmiy Shop API).
API Dokumentatsiya: https://docs.click.uz/
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

CLICK_API_URL = getattr(settings, 'CLICK_API_URL', 'https://api.click.uz/v1')
CLICK_MERCHANT_ID = getattr(settings, 'CLICK_MERCHANT_ID', '')
CLICK_SECRET_KEY = getattr(settings, 'CLICK_SECRET_KEY', '')
CLICK_SERVICE_ID = getattr(settings, 'CLICK_SERVICE_ID', '')


def _generate_password(merchant_trans_id: str, amount: int) -> str:
    """Click API uchun password generatsiya qilish."""
    raw = f"{CLICK_MERCHANT_ID}{merchant_trans_id}{amount}{CLICK_SECRET_KEY}"
    return hashlib.md5(raw.encode()).hexdigest()


def create_payment(order, return_url: str) -> dict:
    """
    Click orqali to'lov yaratish.
    return_url: to'lov muvaffaqiyatli bo'lgandan keyin qaytish manzili.
    """
    payment_id = f"GLS-CLK-{order.order_number}-{int(datetime.now().timestamp())}"
    amount = int(order.final_amount)

    # Agar Click rasmiy kalitlari sozlangan bo'lsa — Click rasmiy checkout URL shakllantirish
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

    # Kalitlar kiritilmagan bo'lsa — professional interaktiv Demo Simulyatori
    return {
        'success': True,
        'payment_url': f'/payment/demo/{order.pk}/?method=click',
        'payment_id': payment_id,
        'merchant_transaction_id': payment_id,
        'provider_transaction_id': payment_id,
        'is_demo': True,
    }


def verify_click_signature(data: dict) -> bool:
    """
    Click rasmiy MD5 imzosini tekshirish (Sign Check).
    Kalit sozlanmagan bo'lsa — RAD etiladi (fail-closed). Avval True qaytarardi va
    istalgan kishi bitta POST bilan buyurtmani "to'langan" qila olardi (TZ: R-SEC-06).
    """
    secret = getattr(settings, 'CLICK_SECRET_KEY', '') or ''
    if not secret:
        logger.warning("Click callback rad etildi: CLICK_SECRET_KEY sozlanmagan")
        return False

    click_trans_id = str(data.get('click_trans_id', ''))
    service_id = str(data.get('service_id', ''))
    merchant_trans_id = str(data.get('merchant_trans_id', ''))
    merchant_prepare_id = str(data.get('merchant_prepare_id', ''))
    amount = str(data.get('amount', ''))
    action = str(data.get('action', ''))
    sign_time = str(data.get('sign_time', ''))
    sign_string = str(data.get('sign_string', '')).lower()

    # Action 0: Prepare; Action 1: Complete
    if not sign_string:
        return False
    if action == '0':
        raw = f"{click_trans_id}{service_id}{secret}{merchant_trans_id}{amount}{action}{sign_time}"
    else:
        raw = f"{click_trans_id}{service_id}{secret}{merchant_trans_id}{merchant_prepare_id}{amount}{action}{sign_time}"

    expected_sign = hashlib.md5(raw.encode()).hexdigest().lower()
    return hmac.compare_digest(sign_string, expected_sign)


def process_click_webhook(data: dict) -> dict:
    """
    Click rasmiy Shop API webhookini qayta ishlash:
    - Action 0: Prepare
    - Action 1: Complete
    """
    from payments.models import Payment
    from payments.payment_service import mark_payment_paid

    click_trans_id = data.get('click_trans_id')
    merchant_trans_id = data.get('merchant_trans_id')
    action = str(data.get('action', '0'))
    error = data.get('error', 0)

    # 1. Kriptografik imzo tekshiruvi
    if not verify_click_signature(data):
        logger.warning(f"Click invalid signature attempt for trans {click_trans_id}")
        return {
            'click_trans_id': click_trans_id,
            'merchant_trans_id': merchant_trans_id,
            'error': -1,
            'error_note': 'Sign check failed',
        }

    # 2. To'lov obyektini topish
    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(
            merchant_transaction_id=merchant_trans_id
        ).first()

        if not payment:
            # Balki buyurtma raqami bilan yuborilgan bo'lsa
            from orders.models import Order
            order = Order.objects.filter(order_number=merchant_trans_id).first()
            if order:
                payment, _ = Payment.objects.get_or_create(
                    order=order,
                    merchant_transaction_id=f"GLS-CLK-{order.order_number}",
                    defaults={'provider': 'click', 'amount': order.final_amount, 'status': 'pending'}
                )

        if not payment:
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'error': -5,
                'error_note': 'Payment does not exist',
            }

        # Agar Click xato qaytargan bo'lsa
        if int(error or 0) < 0:
            payment.status = 'failed'
            payment.error_message = f"Click xatosi: {data.get('error_note')}"
            payment.save(update_fields=['status', 'error_message'])
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'error': error,
                'error_note': data.get('error_note', 'Cancelled'),
            }

        # Action 0: PREPARE (Tekshirish va tayyorlash)
        if action == '0':
            if payment.status == 'paid':
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'merchant_prepare_id': payment.id,
                    'error': -4,
                    'error_note': 'Already paid',
                }
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'merchant_prepare_id': payment.id,
                'error': 0,
                'error_note': 'Success',
            }

        # Action 1: COMPLETE (To'lovni tasdiqlash)
        elif action == '1':
            if payment.status != 'paid':
                mark_payment_paid(
                    payment,
                    provider_payload={
                        'provider_transaction_id': str(click_trans_id),
                        'amount': data.get('amount')
                    }
                )
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'merchant_confirm_id': payment.id,
                'error': 0,
                'error_note': 'Success',
            }

    return {
        'click_trans_id': click_trans_id,
        'merchant_trans_id': merchant_trans_id,
        'error': -3,
        'error_note': 'Action not found',
    }


def verify_payment(payment_id: str, click_trans_id: str = None) -> dict:
    """Oddiy callback va ichki tasdiqlash uchun yordamchi funksiya."""
    res = process_click_webhook({
        'merchant_trans_id': payment_id,
        'click_trans_id': click_trans_id,
        'action': '1',
        'error': 0,
    })
    return {'success': res.get('error') == 0, 'data': res}
