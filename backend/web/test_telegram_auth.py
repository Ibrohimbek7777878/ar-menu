"""
Telegram initData tekshiruvi testlari (TZ: R1-11).
"""
import hashlib
import hmac
import io
import json
import time
from decimal import Decimal
from urllib.parse import urlencode

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import Customer
from categories.models import Category
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table
from web.telegram_auth import verify_init_data

BOT_TOKEN = '123456:TEST-bot-token-for-unit-tests'


def sign_init_data(user_id=777, token=BOT_TOKEN, auth_date=None, **extra):
    """Telegram qanday imzolasa, shunday: HMAC(HMAC('WebAppData', token), sorted key=value)."""
    fields = {'auth_date': str(auth_date if auth_date is not None else int(time.time())), 'query_id': 'AAH-test',
              'user': json.dumps({'id': user_id, 'first_name': 'Ali'}, separators=(',', ':'))}
    fields.update(extra)
    check = '\n'.join(f'{k}={fields[k]}' for k in sorted(fields))
    secret = hmac.new(b'WebAppData', token.encode(), hashlib.sha256).digest()
    fields['hash'] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


class VerifyInitDataTests(SimpleTestCase):

    def test_valid_signature_returns_user(self):
        user = verify_init_data(sign_init_data(user_id=555), bot_token=BOT_TOKEN)
        self.assertEqual(user['id'], 555)

    def test_wrong_bot_token_is_rejected(self):
        self.assertIsNone(verify_init_data(sign_init_data(token='999:other-bot'), bot_token=BOT_TOKEN))

    def test_tampered_user_is_rejected(self):
        data = sign_init_data(user_id=1).replace('%22id%22%3A1%2C', '%22id%22%3A2%2C')
        self.assertIn('%3A2%2C', data)
        self.assertIsNone(verify_init_data(data, bot_token=BOT_TOKEN))

    def test_missing_hash_or_garbage_or_empty_is_rejected(self):
        for bad in ('', 'garbage', 'user=%7B%22id%22%3A1%7D&auth_date=1', 'a' * 5000):
            self.assertIsNone(verify_init_data(bad, bot_token=BOT_TOKEN), bad[:20])

    def test_expired_and_future_dated_data_is_rejected(self):
        self.assertIsNone(verify_init_data(sign_init_data(auth_date=int(time.time()) - 2 * 86400),
                                           bot_token=BOT_TOKEN))
        self.assertIsNone(verify_init_data(sign_init_data(auth_date=int(time.time()) + 3600), bot_token=BOT_TOKEN))

    def test_without_a_configured_token_nothing_is_trusted(self):
        with override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=''):
            self.assertIsNone(verify_init_data(sign_init_data()))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=BOT_TOKEN)
class CheckoutTelegramIdentityTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Tg Restorani', slug='tg', owner='tg-owner',
                     password='Tg-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='tg')
        self.table = Table.objects.get(shop=self.shop, number='1')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='tg-osh', price=Decimal('48000'),
                                          category=cat, is_available=True)

    def order(self, phone, **extra):
        client = Client()
        client.get(f'/t/{self.table.qr_token}/', follow=True)
        client.post('/api/cart/', json.dumps({'action': 'set', 'product_id': self.osh.pk, 'quantity': 1}),
                    content_type='application/json')
        data = {'service_type': 'table', 'payment_method': 'cash', 'name': 'Ali', 'phone': phone}
        data.update(extra)
        res = client.post('/checkout/', data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTrue(res.json()['ok'], res.content)

    @override_settings(DEMO_MODE=False)
    def test_posted_telegram_id_is_ignored_in_production(self):
        self.order('+998901110001', telegram_id='424242')
        self.assertEqual(Customer.objects.get(phone='+998901110001').telegram_chat_id, '')

    @override_settings(DEMO_MODE=False)
    def test_forged_init_data_is_ignored(self):
        self.order('+998901110002', init_data=sign_init_data(token='999:attacker-bot', user_id=424242))
        self.assertEqual(Customer.objects.get(phone='+998901110002').telegram_chat_id, '')

    @override_settings(DEMO_MODE=False)
    def test_signed_init_data_links_the_real_telegram_user(self):
        self.order('+998901110003', init_data=sign_init_data(user_id=31337))
        self.assertEqual(Customer.objects.get(phone='+998901110003').telegram_chat_id, '31337')

    @override_settings(DEMO_MODE=False)
    def test_attacker_cannot_hijack_an_existing_customers_notifications(self):
        Customer.objects.create(phone='+998901110004', name='Qurbon', telegram_chat_id='')
        self.order('+998901110004', telegram_id='666')
        self.assertEqual(Customer.objects.get(phone='+998901110004').telegram_chat_id, '')

    @override_settings(DEMO_MODE=True)
    def test_demo_mode_still_accepts_plain_telegram_id_for_local_testing(self):
        self.order('+998901110005', telegram_id='4242')
        self.assertEqual(Customer.objects.get(phone='+998901110005').telegram_chat_id, '4242')
