import json
import base64
from django.test import TestCase, Client, override_settings
from accounts.models import AdminUser
from shops.models import Shop
from orders.models import Order
from payments.models import Payment


class PaymentSecurityTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username="shop_owner_pay",
            phone="+998909876543",
            password="testpassword123",
            role="shop_owner"
        )
        self.shop = Shop.objects.create(
            name="Test Market",
            slug="test-market",
            owner=self.owner,
            address="Guliston",
            latitude=40.49,
            longitude=68.78,
            is_open=True,
            phone="+998909876543"
        )
        self.order = Order.objects.create(
            order_number="ORD-PAY-001",
            customer_name="Test Customer",
            customer_phone_1="+998901234567",
            shop=self.shop,
            total_amount=50000,
            final_amount=50000,
            status='pending',
            payment_status='unpaid'
        )
        self.payment = Payment.objects.create(
            order=self.order,
            merchant_transaction_id="TX-PAY-001",
            provider="payme",
            amount=50000,
            status="pending"
        )

    @override_settings(DEBUG=False, ALLOW_MOCK_PAYMENTS=False)
    def test_mock_payment_blocked_in_production(self):
        """Mock payments must return 403 Forbidden when DEBUG=False."""
        res = self.client.post(f'/api/payments/mock/{self.payment.merchant_transaction_id}/success/')
        self.assertEqual(res.status_code, 403)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')

    @override_settings(PAYME_SECRET_KEY='my-super-secret-key')
    def test_payme_webhook_requires_auth_when_secret_set(self):
        """Payme webhook must reject requests without valid Basic Auth."""
        payload = {
            "id": 1,
            "method": "CheckPerformTransaction",
            "params": {"account": {"order_id": self.payment.merchant_transaction_id}}
        }
        # 1. No auth -> 401
        res = self.client.post('/api/payments/payme/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 401)

        # 2. Invalid auth -> 401
        bad_auth = base64.b64encode(b"Paycom:wrong-key").decode('utf-8')
        res_bad = self.client.post(
            '/api/payments/payme/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Basic {bad_auth}"
        )
        self.assertEqual(res_bad.status_code, 401)

        # 3. Valid auth -> 200
        good_auth = base64.b64encode(b"Paycom:my-super-secret-key").decode('utf-8')
        res_good = self.client.post(
            '/api/payments/payme/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Basic {good_auth}"
        )
        self.assertEqual(res_good.status_code, 200)
        self.assertTrue(res_good.json().get('result', {}).get('allow'))

    @override_settings(DEBUG=False, ALLOW_UNPROTECTED_PAYMENTS=False)
    def test_direct_bypass_blocked_in_production(self):
        """Direct unauthenticated marking of payment without JSON-RPC method must be blocked in production."""
        payload = {
            "merchant_transaction_id": self.payment.merchant_transaction_id
        }
        res = self.client.post('/api/payments/payme/', data=json.dumps(payload), content_type='application/json')
        self.assertIn(res.status_code, [403, 503])
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'pending')
