import base64
import hashlib
import hmac
import json
import pytest
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPaymentSecurity:
    """F-001: To'lov webhook kalitlari va xavfsizlik testlari"""

    def test_missing_keys_in_production_returns_503(self, client):
        """Production rejimida kalitlar yo'q bo'lsa barcha webhooklar 503 qaytarishi shart"""
        with override_settings(
            PAYMENTS_MODE='production',
            PAYME_MERCHANT_ID='',
            PAYME_KEY='',
            CLICK_SECRET='',
            UZUM_SECRET='',
        ):
            # Payme
            resp_payme = client.post(
                '/v1/payments/webhook/payme/',
                data=json.dumps({'method': 'CheckPerformTransaction', 'params': {}}),
                content_type='application/json',
            )
            assert resp_payme.status_code == 503
            assert resp_payme.json().get('error') == 'Payment provider disabled'

            # Click
            resp_click = client.post(
                '/v1/payments/webhook/click/',
                data=json.dumps({'action': '0', 'sign_string': 'xyz'}),
                content_type='application/json',
            )
            assert resp_click.status_code == 503
            assert resp_click.json().get('error_note') == 'Payment provider disabled'

            # Uzum
            resp_uzum = client.post(
                '/v1/payments/webhook/uzum/',
                data=json.dumps({'event': 'payment_created'}),
                content_type='application/json',
            )
            assert resp_uzum.status_code == 503
            assert resp_uzum.json().get('error') == 'Payment provider disabled'

    def test_payme_auth_validation_with_keys(self, client):
        """Payme: kalitlar o'rnatilganda noto'g'ri Basic auth rad etiladi, to'g'risi qabul qilinadi"""
        with override_settings(
            PAYMENTS_MODE='production',
            PAYME_MERCHANT_ID='test_merchant',
            PAYME_KEY='secret_payme_key',
        ):
            # Auth'siz
            res = client.post(
                '/v1/payments/webhook/payme/',
                data=json.dumps({'method': 'CheckTransaction', 'params': {'id': '123'}}),
                content_type='application/json',
            )
            assert res.status_code == 200
            assert res.json().get('error', {}).get('code') == -32504

            # Noto'g'ri auth
            bad_auth = base64.b64encode(b'wrong:wrong').decode()
            res_bad = client.post(
                '/v1/payments/webhook/payme/',
                data=json.dumps({'method': 'CheckTransaction', 'params': {'id': '123'}}),
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Basic {bad_auth}',
            )
            assert res_bad.status_code == 200
            assert res_bad.json().get('error', {}).get('code') == -32504

            # To'g'ri auth
            good_auth = base64.b64encode(b'test_merchant:secret_payme_key').decode()
            res_good = client.post(
                '/v1/payments/webhook/payme/',
                data=json.dumps({'method': 'CheckTransaction', 'params': {'id': '999999'}}),
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Basic {good_auth}',
            )
            assert res_good.status_code == 200
            # Transaction not found code (-31001), chunki auth tekshiruvi muvaffaqiyatli o'tdi
            assert res_good.json().get('error', {}).get('code') == -31001

    def test_click_sign_validation_with_keys(self, client):
        """Click: kalit o'rnatilganda noto'g'ri MD5 rad etiladi, to'g'risi qabul qilinadi"""
        secret = 'my_click_secret'
        with override_settings(PAYMENTS_MODE='production', CLICK_SECRET=secret):
            # Noto'g'ri imzo
            params_bad = {
                'click_trans_id': '1', 'service_id': '2', 'merchant_trans_id': '3',
                'amount': '1000', 'action': '0', 'sign_time': '2026-09-14',
                'sign_string': 'bad_md5',
            }
            res_bad = client.post(
                '/v1/payments/webhook/click/',
                data=json.dumps(params_bad),
                content_type='application/json',
            )
            assert res_bad.status_code == 200
            assert res_bad.json().get('error') == -1
            assert res_bad.json().get('error_note') == 'SIGN CHECK FAILED'

            # To'g'ri imzo
            sign_str = f"12{secret}3100002026-09-14"
            good_md5 = hashlib.md5(sign_str.encode()).hexdigest()
            params_good = {
                'click_trans_id': '1', 'service_id': '2', 'merchant_trans_id': '3',
                'amount': '1000', 'action': '0', 'sign_time': '2026-09-14',
                'sign_string': good_md5,
            }
            res_good = client.post(
                '/v1/payments/webhook/click/',
                data=json.dumps(params_good),
                content_type='application/json',
            )
            assert res_good.status_code == 200
            # Order topilmagani sababli -5
            assert res_good.json().get('error') == -5

    def test_uzum_hmac_validation_with_keys(self, client):
        """Uzum: kalit o'rnatilganda noto'g'ri HMAC 401, to'g'risi 200"""
        secret = 'my_uzum_secret'
        with override_settings(PAYMENTS_MODE='production', UZUM_SECRET=secret):
            body = json.dumps({'event': 'order_paid', 'order_id': 123}).encode('utf-8')

            # Imzosiz -> 401
            res_no_sig = client.post(
                '/v1/payments/webhook/uzum/',
                data=body,
                content_type='application/json',
            )
            assert res_no_sig.status_code == 401

            # Noto'g'ri imzo -> 401
            res_bad = client.post(
                '/v1/payments/webhook/uzum/',
                data=body,
                content_type='application/json',
                HTTP_UZUM_SIGNATURE='wrong_signature',
            )
            assert res_bad.status_code == 401

            # To'g'ri imzo -> 200
            good_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            res_good = client.post(
                '/v1/payments/webhook/uzum/',
                data=body,
                content_type='application/json',
                HTTP_UZUM_SIGNATURE=good_sig,
            )
            assert res_good.status_code == 200
            assert res_good.json().get('ok') is True
