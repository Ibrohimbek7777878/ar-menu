"""
To'lov payload niqoblash testlari (TZ: R1-7).
"""
from django.test import SimpleTestCase, TestCase, override_settings

from orders.models import Order
from payments.masking import MASK, mask_sensitive
from payments.models import Payment
from payments.payment_service import mark_payment_paid
from shops.models import Shop


class MaskSensitiveTests(SimpleTestCase):

    def test_secret_keys_are_masked_and_business_fields_kept(self):
        masked = mask_sensitive({
            'amount': 50000, 'status': 'paid', 'merchant_transaction_id': 'M-1', 'provider_transaction_id': 'P-9',
            'card_number': '8600123412345678', 'cardNumber': '8600123412345678', 'cvv': '123',
            'signature': 'abc', 'X-Auth-Token': 'tok', 'api_key': 'k', 'password': 'p', 'shipping': 'Guliston',
        })
        for key in ('card_number', 'cardNumber', 'cvv', 'signature', 'X-Auth-Token', 'api_key', 'password'):
            self.assertEqual(masked[key], MASK, key)
        self.assertEqual(masked['amount'], 50000)
        self.assertEqual(masked['status'], 'paid')
        self.assertEqual(masked['merchant_transaction_id'], 'M-1')
        self.assertEqual(masked['provider_transaction_id'], 'P-9')
        self.assertEqual(masked['shipping'], 'Guliston', "oddiy nom tasodifan niqoblanmasligi kerak")

    def test_nested_structures_and_card_numbers_in_text(self):
        masked = mask_sensitive({'params': [{'token': 'abc', 'note': 'karta 8600123412345678 dan'}]})
        self.assertEqual(masked['params'][0]['token'], MASK)
        self.assertNotIn('8600123412345678', masked['params'][0]['note'])
        self.assertIn('860012******5678', masked['params'][0]['note'])

    def test_empty_secrets_and_scalars_pass_through(self):
        self.assertEqual(mask_sensitive({'token': ''}), {'token': ''})
        self.assertEqual(mask_sensitive(None), None)
        self.assertEqual(mask_sensitive(12), 12)
        self.assertEqual(mask_sensitive('ODDIY MATN'), 'ODDIY MATN')


class PaymentStoresMaskedPayloadTests(TestCase):

    @override_settings(DEMO_MODE=True)
    def test_mark_payment_paid_never_stores_secrets(self):
        shop = Shop.objects.create(name='M', slug='m-mask', address='x', latitude=40.4, longitude=68.7,
                                   is_open=True, phone='+998900000000')
        order = Order.objects.create(order_number='ORD-MASK-1', customer_name='A', customer_phone_1='+998901112233',
                                     shop=shop, total_amount=50000, final_amount=50000, status='pending',
                                     payment_status='unpaid')
        payment = Payment.objects.create(order=order, merchant_transaction_id='MASK-1', provider='click',
                                         amount=50000, status='pending')
        mark_payment_paid(payment, provider_payload={'amount': 50000, 'card_number': '8600123412345678',
                                                     'sign_string': 'deadbeef', 'click_trans_id': 77})
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(payment.raw_response['card_number'], MASK)
        self.assertEqual(payment.raw_response['sign_string'], MASK)
        self.assertEqual(payment.raw_response['click_trans_id'], 77)
        self.assertNotIn('8600123412345678', str(payment.raw_response))
