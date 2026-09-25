"""
Naqd pul to'lov provayderi.
To'lov yetkazishda amalga oshiriladi.
"""
from decimal import Decimal

from ..providers import PaymentProvider


class CashPaymentProvider(PaymentProvider):
    """Naqd pul to'lov provayderi."""

    code = 'cash'

    def create_payment(self, order, return_url: str, callback_url: str) -> dict:
        return {
            'success': True,
            'provider_transaction_id': f"CASH-{order.order_number}",
            'payment_url': None,
            'status': 'pending',
            'message': "To'lov yetkazishda amalga oshiriladi",
        }

    def verify_callback(self, request_data: dict) -> dict:
        return {
            'success': True,
            'provider_transaction_id': request_data.get('provider_transaction_id', ''),
            'status': 'paid',
            'amount': request_data.get('amount', Decimal('0')),
        }

    def get_status(self, transaction_id: str) -> dict:
        return {
            'success': True,
            'status': 'pending',
            'amount': Decimal('0'),
        }

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        return {
            'success': False,
            'error': 'Naqd pul uchun refund mumkin emas',
        }
