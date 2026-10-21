"""
Asosiy to'lov xizmati.
Har bir to'lov uslubini boshqarish.
"""
import random
from datetime import datetime

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .masking import mask_sensitive
from .models import Payment
from orders.state_machine import transition_order
from orders.audit import log_audit


def mock_payments_allowed() -> bool:
    """
    Demo/mock to'lovlar faqat aniq yoqilgan flag bilan (TZ: R-SEC-06).
    Avval DEBUG=True bo'lsa ochiq edi — .env da DEBUG=True turgani uchun production'da ham ishlardi.
    """
    return bool(getattr(settings, 'DEMO_MODE', False) or getattr(settings, 'ALLOW_MOCK_PAYMENTS', False))


_PROVIDER_NOT_CONNECTED = {
    'success': False,
    'error': "Bu to'lov usuli hozircha ulanmagan. Iltimos, stolda yoki naqd to'lang.",
}


def _generate_payment_id(order):
    return f"GLS-{order.order_number}-{int(datetime.now().timestamp())}{random.randint(100,999)}"


def create_order_payment(order, method, return_url):
    """
    Buyurtma uchun to'lov yaratish.
    method: 'click' | 'payme' | 'uzcard' | 'cash' | 'mock'
    """
    if method == 'cash':
        return {'success': True, 'payment_url': None, 'message': 'Naqd pul — to\'lov yetkazishda amalga oshiriladi'}

    if method == 'mock':
        if not mock_payments_allowed():
            return dict(_PROVIDER_NOT_CONNECTED)
        from .providers import MockPaymentProvider
        result = MockPaymentProvider().create_payment(order, return_url, return_url)
    else:
        from .services import click_service, payme_service, uzcard_service
        if method == 'click':
            result = click_service.create_payment(order, return_url)
        elif method == 'payme':
            result = payme_service.create_payment(order, return_url)
        elif method == 'uzcard':
            result = uzcard_service.create_payment(order, return_url)
        else:
            return {'success': False, 'error': 'Noto\'g\'ri to\'lov uslubi'}
        # Provayder kaliti yo'q bo'lsa servis demo-simulyator URL qaytaradi — u faqat demo rejimda ruxsat etiladi
        is_demo_url = str(result.get('payment_url') or '').startswith('/payment/demo/')
        if (not result.get('success') or is_demo_url) and not mock_payments_allowed():
            return dict(_PROVIDER_NOT_CONNECTED)
        # Test rejimi: provayder kaliti yo'q bo'lsa mock ga o'tamiz
        if not result.get('success'):
            from .providers import MockPaymentProvider
            result = MockPaymentProvider().create_payment(order, return_url, return_url)

    if result['success']:
        merchant_id = result.get('merchant_transaction_id') or _generate_payment_id(order)
        Payment.objects.create(
            order=order,
            merchant_transaction_id=merchant_id,
            provider_transaction_id=result.get('provider_transaction_id', ''),
            provider=method,
            amount=order.final_amount,
            status='pending',
            payment_url=result.get('payment_url', ''),
            raw_request=mask_sensitive(result),
        )

    return result


@transaction.atomic
def mark_payment_paid(payment, provider_payload=None, request=None, actor=None):
    """
    To'lovni 'paid' qilish — idempotent.
    - Signature/amount tekshiruvlari chaqiruvchi tomonidan amalga oshirilgan deb hisoblanadi.
    - Order avtomatik 'confirmed' holatiga o'tadi.
    - Audit log va kuryer dispatch navbati yoziladi.
    """
    payment = Payment.objects.select_for_update().get(pk=payment.pk)

    if payment.status == 'paid':
        return payment  # idempotent — ikkinchi chaqiruv xavfsiz e'tiborga olinmaydi

    # Summa tekshiruvi (provider_payload ichida amount bo'lsa)
    if provider_payload and provider_payload.get('amount') is not None:
        try:
            from decimal import Decimal
            incoming = Decimal(str(provider_payload['amount']))
            if incoming and abs(incoming - payment.amount) > Decimal('1'):
                payment.status = 'failed'
                payment.error_message = 'Summa mos kelmadi'
                payment.save(update_fields=['status', 'error_message'])
                log_audit('payment', request=request, actor=actor, target_type='payment',
                          target_id=payment.id, new_value={'status': 'failed', 'error': 'amount_mismatch'})
                return payment
        except (TypeError, ValueError):
            pass

    payment.status = 'paid'
    payment.provider_transaction_id = (
        provider_payload.get('provider_transaction_id', payment.provider_transaction_id)
        if provider_payload else payment.provider_transaction_id
    )
    payment.raw_response = mask_sensitive(provider_payload or {})
    payment.paid_at = timezone.now()
    payment.save(update_fields=['status', 'provider_transaction_id', 'raw_response', 'paid_at'])

    order = payment.order
    if order.status in ('pending', 'created'):
        transition_order(order, 'confirmed', actor=actor, reason='To\'lov tasdiqlandi', request=request)
    if hasattr(order, 'payment_status'):
        order.payment_status = 'paid'
        order.save(update_fields=['payment_status'])

    # Avtomatik Moliya & Kassa kirimini yozish (Payme / Click / Uzum)
    try:
        from finance.services.order_integration import record_order_payment_income
        record_order_payment_income(order, actor=actor)   # to'lov turi Payment provayderidan olinadi
    except Exception as e:
        logger.warning(f"Finance auto-record error on payment for order {order.pk}: {e}")

    log_audit('payment', request=request, actor=actor, target_type='payment',
              target_id=payment.id, new_value={'status': 'paid', 'provider': payment.provider, 'order': order.id})

    dispatch_courier(order)
    return payment


def mark_payment_failed(payment, error='', request=None, actor=None):
    payment.status = 'failed'
    payment.error_message = error
    payment.save(update_fields=['status', 'error_message'])
    log_audit('payment', request=request, actor=actor, target_type='payment',
              target_id=payment.id, new_value={'status': 'failed', 'error': error})
    return payment


def dispatch_courier(order):
    """Kuryer dispatch navbati — Celery mavjud bo'lsa delay, aks holda xavfsiz no-op."""
    try:
        from couriers.tasks import dispatch_courier as _task
        _task.delay(order.id)
    except Exception:
        # Celery/Rabbit/Redis sozlanmagan — ishlab chiqish rejimida xavfsiz o'tkazib yuboriladi
        pass


def confirm_webhook(method, data):
    """
    To'lov webhook tasdiqlash.
    Click: merchant_trans_id, click_trans_id
    Payme: payment_id, card_token
    UzCard: payment_id, receipt_id
    """
    from .services import click_service, payme_service, uzcard_service

    if method == 'click':
        return click_service.verify_payment(
            data.get('merchant_trans_id'),
            data.get('click_trans_id'),
        )
    elif method == 'payme':
        return payme_service.verify_payment(
            data.get('payment_id'),
            data.get('card_token'),
        )
    elif method == 'uzcard':
        return uzcard_service.verify_payment(
            data.get('payment_id'),
            data.get('receipt_id'),
        )
    return {'success': False, 'error': 'Unknown method'}


def get_payment_status(payment_id):
    """To'lov holatini tekshirish."""
    try:
        payment = Payment.objects.get(merchant_transaction_id=payment_id)
        return {
            'success': True,
            'status': payment.status,
            'method': payment.provider,
            'amount': str(payment.amount),
        }
    except Payment.DoesNotExist:
        return {'success': False, 'error': 'Payment not found'}
