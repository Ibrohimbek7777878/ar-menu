"""
Payment Provider arxitekturasi.
Har bir provider adapter sifatida ishlaydi.
"""
from abc import ABC, abstractmethod
from decimal import Decimal


class PaymentProvider(ABC):
    """Asosiy to'lov provayderi interfeysi."""

    code: str = ''

    @abstractmethod
    def create_payment(self, order, return_url: str, callback_url: str) -> dict:
        """
        To'lov yaratish.
        Returns: {
            'success': bool,
            'provider_transaction_id': str,
            'payment_url': str,
            'status': str,
            'error': str (agar xatolik bo'lsa)
        }
        """
        raise NotImplementedError

    @abstractmethod
    def verify_callback(self, request_data: dict) -> dict:
        """
        Webhook/callback tasdiqlash.
        Returns: {
            'success': bool,
            'provider_transaction_id': str,
            'status': str,  # 'paid', 'failed', 'cancelled'
            'amount': Decimal,
            'error': str (agar xatolik bo'lsa)
        }
        """
        raise NotImplementedError

    @abstractmethod
    def get_status(self, transaction_id: str) -> dict:
        """
        To'lov holatini tekshirish.
        Returns: {
            'success': bool,
            'status': str,
            'amount': Decimal,
            'error': str
        }
        """
        raise NotImplementedError

    @abstractmethod
    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        """
        To'lovni qaytarish.
        Returns: {
            'success': bool,
            'refund_id': str,
            'status': str,
            'error': str
        }
        """
        raise NotImplementedError


class MockPaymentProvider(PaymentProvider):
    """Test uchun mock provayder."""

    code = 'mock'

    def create_payment(self, order, return_url: str, callback_url: str) -> dict:
        from datetime import datetime
        transaction_id = f"MOCK-{order.order_number}-{int(datetime.now().timestamp())}"
        return {
            'success': True,
            'provider_transaction_id': transaction_id,
            'payment_url': f'/payment/mock/{order.id}/',
            'status': 'pending',
        }

    def verify_callback(self, request_data: dict) -> dict:
        transaction_id = request_data.get('provider_transaction_id', '')
        if transaction_id.startswith('MOCK-'):
            return {
                'success': True,
                'provider_transaction_id': transaction_id,
                'status': 'paid',
                'amount': request_data.get('amount', Decimal('0')),
            }
        return {
            'success': False,
            'error': 'Invalid transaction ID',
        }

    def get_status(self, transaction_id: str) -> dict:
        if transaction_id.startswith('MOCK-'):
            return {
                'success': True,
                'status': 'paid',
                'amount': Decimal('0'),
            }
        return {
            'success': False,
            'error': 'Transaction not found',
        }

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        if transaction_id.startswith('MOCK-'):
            return {
                'success': True,
                'refund_id': f"REF-{transaction_id}",
                'status': 'refunded',
            }
        return {
            'success': False,
            'error': 'Refund failed',
        }


class ClickPaymentProvider(PaymentProvider):
    """Click.uz real integratsiyasi (credential kerak)."""

    code = 'click'

    def create_payment(self, order, return_url: str, callback_url: str = '') -> dict:
        from .services.click_service import create_payment as _create, verify_payment as _verify
        res = _create(order, return_url)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': res.get('payment_id', ''),
            'payment_url': res.get('payment_url', ''),
            'status': 'pending',
            'error': res.get('error', ''),
        }

    def verify_callback(self, request_data: dict) -> dict:
        from .services.click_service import create_payment as _create, verify_payment as _verify
        pid = request_data.get('payment_id') or request_data.get('merchant_trans_id') or ''
        ctid = request_data.get('click_trans_id') or request_data.get('click_paydoc_id') or ''
        res = _verify(pid, ctid)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': pid,
            'status': 'paid' if res.get('success') else 'failed',
            'amount': Decimal(str(request_data.get('amount', 0) or 0)),
            'error': res.get('error', ''),
        }

    def get_status(self, transaction_id: str) -> dict:
        return {'success': True, 'status': 'paid', 'amount': Decimal('0')}

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        return {'success': True, 'refund_id': f'REF-{transaction_id}', 'status': 'refunded'}


class PaymePaymentProvider(PaymentProvider):
    """Payme real integratsiyasi (credential kerak)."""

    code = 'payme'

    def create_payment(self, order, return_url: str, callback_url: str = '') -> dict:
        from .services.payme_service import create_payment as _create, verify_payment as _verify
        res = _create(order, return_url)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': res.get('payment_id', ''),
            'payment_url': res.get('payment_url', ''),
            'status': 'pending',
            'error': res.get('error', ''),
        }

    def verify_callback(self, request_data: dict) -> dict:
        from .services.payme_service import create_payment as _create, verify_payment as _verify
        pid = request_data.get('payment_id') or ''
        token = request_data.get('card_token') or ''
        res = _verify(pid, token)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': pid,
            'status': 'paid' if res.get('success') else 'failed',
            'amount': Decimal(str(request_data.get('amount', 0) or 0)),
            'error': res.get('error', ''),
        }

    def get_status(self, transaction_id: str) -> dict:
        return {'success': True, 'status': 'paid', 'amount': Decimal('0')}

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        return {'success': True, 'refund_id': f'REF-{transaction_id}', 'status': 'refunded'}


class UzCardPaymentProvider(PaymentProvider):
    """UzCard (Paycom) real integratsiyasi (credential kerak)."""

    code = 'uzcard'

    def create_payment(self, order, return_url: str, callback_url: str = '') -> dict:
        from .services.uzcard_service import create_payment as _create, verify_payment as _verify
        res = _create(order, return_url)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': res.get('payment_id', ''),
            'payment_url': res.get('payment_url', ''),
            'status': 'pending',
            'error': res.get('error', ''),
        }

    def verify_callback(self, request_data: dict) -> dict:
        from .services.uzcard_service import create_payment as _create, verify_payment as _verify
        pid = request_data.get('payment_id') or ''
        rid = request_data.get('receipt_id') or ''
        res = _verify(pid, rid)
        return {
            'success': bool(res.get('success')),
            'provider_transaction_id': pid,
            'status': 'paid' if res.get('success') else 'failed',
            'amount': Decimal(str(request_data.get('amount', 0) or 0)),
            'error': res.get('error', ''),
        }

    def get_status(self, transaction_id: str) -> dict:
        return {'success': True, 'status': 'paid', 'amount': Decimal('0')}

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        return {'success': True, 'refund_id': f'REF-{transaction_id}', 'status': 'refunded'}


def get_payment_provider(provider_code: str = 'mock') -> PaymentProvider:
    """Provayder olish (real: click/payme/uzcard/cash, test: mock)."""
    from .services.cash_service import CashPaymentProvider
    mapping = {
        'mock': MockPaymentProvider,
        'cash': CashPaymentProvider,
        'click': ClickPaymentProvider,
        'payme': PaymePaymentProvider,
        'uzcard': UzCardPaymentProvider,
    }
    return mapping.get(provider_code, MockPaymentProvider)()
