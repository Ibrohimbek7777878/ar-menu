"""
Telegram bot: admin huquqi va do'konlararo ajratish (P2.1).

Avval: (1) `is_admin` Telegram username'ga ishonardi (AdminUser.username yoki o'zi yozgan telegram_username mos kelsa —
hatto ofitsiant ham "admin"), (2) har qanday "admin" `/kassa`, `/order`, `/admin`, `/orders` va tugmalar orqali BOSHQA
do'konlar daromadi, mijozlari va buyurtmalarini ko'ra/o'zgartira olardi, (3) eski `/api/v1/notifications/webhook/telegram/`
manzili hech qanday sirsiz ochiq edi.
Endi: admin faqat chat_id bo'yicha (env — platforma; do'kon sozlamasidagi `telegram_chat_id` — faqat shu do'kon).
Tarmoqqa chiqilmaydi: httpx.post almashtirilgan.
"""
import io
import json
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from ar3d.models import Print3DOrder
from backend.app_settings import set_setting
from finance.models import FinanceTransaction
from notifications.admin_bot import is_admin
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from orders.models import Order
from orders.timeutils import local_today
from shops.models import Shop
from tables_restaurant.models import Table

CHAT_A = '7001'
CHAT_B = '7002'
PLATFORM_CHAT = '8888'


def make_shop(slug, name, owner, chat_id=''):
    call_command('create_restaurant', name=name, slug=slug, owner=owner, password='Parol-Scope-123', tables=2,
                 stdout=io.StringIO())
    shop = Shop.objects.get(slug=slug)
    if chat_id:
        shop.business_profile = {'telegram_chat_id': chat_id}
        shop.save(update_fields=['business_profile'])
    return shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN,
                   TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class BotAdminScopeTests(TestCase):

    def setUp(self):
        self.shop_a = make_shop('scope-a', 'Alfa Oshxona', 'scope-owner-a', CHAT_A)
        self.shop_b = make_shop('scope-b', 'Beta Oshxona', 'scope-owner-b', CHAT_B)
        set_setting('restaurant_default_shop', 'scope-a')
        today = local_today()
        FinanceTransaction.objects.create(shop=self.shop_a, tx_type='income', stage='income', amount=Decimal('111111'),
                                          title='A kirim', tx_date=today)
        FinanceTransaction.objects.create(shop=self.shop_b, tx_type='income', stage='income', amount=Decimal('222222'),
                                          title='B kirim', tx_date=today)
        self.order_a = Order.objects.create(
            shop=self.shop_a, order_number='GLS-A-0001', customer_name='Maxfiy MijozA', customer_phone_1='+998901111111',
            total_amount=Decimal('50000'), final_amount=Decimal('50000'), status='pending')
        self.order_b = Order.objects.create(
            shop=self.shop_b, order_number='GLS-B-0001', customer_name='Oddiy MijozB', customer_phone_1='+998902222222',
            total_amount=Decimal('60000'), final_amount=Decimal('60000'), status='pending')
        self.table_a = Table.objects.filter(shop=self.shop_a).first()
        self.table_b = Table.objects.filter(shop=self.shop_b).first()
        self.client = Client()

    # ── yordamchilar ────────────────────────────────────────────────────────
    def _post(self, update):
        secret = webhook_secret_for(TOKEN)
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        return [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]

    def say(self, chat_id, text, username=''):
        payloads = self._post({'message': {'chat': {'id': int(chat_id)}, 'from': {'id': int(chat_id), 'username': username,
                                                                                   'first_name': 'X'},
                                           'text': text, 'message_id': 1}})
        return '\n'.join(str(p.get('text', '')) for p in payloads)

    def press(self, chat_id, data, username=''):
        payloads = self._post({'callback_query': {'id': 'cq1', 'data': data,
                                                  'from': {'id': int(chat_id), 'username': username},
                                                  'message': {'message_id': 5, 'chat': {'id': int(chat_id)}}}})
        return '\n'.join(str(p.get('text', '')) for p in payloads)

    # ── 1. username'ga ishonmaslik ──────────────────────────────────────────
    def test_telegram_username_equal_to_a_login_does_not_make_admin(self):
        AdminUser.objects.create_user(username='kassirxon', password='Parol-Xon-123', role='shop_owner', shop=self.shop_b)
        for cmd in ('/kassa', '/admin', '/stollar', '/orders'):
            out = self.say(5555, cmd, username='kassirxon')
            self.assertIn('⛔', out, cmd)
            self.assertNotIn('111 111', out)
            self.assertNotIn('222 222', out)
            self.assertNotIn('Maxfiy', out)
        self.assertFalse(is_admin('5555', 'kassirxon'))

    def test_self_declared_telegram_username_does_not_make_waiter_admin(self):
        AdminUser.objects.create_user(username='ofitsiant-b', password='Parol-Ofi-123', role='waiter', shop=self.shop_b,
                                      telegram_username='@ofitsiantb')
        out = self.say(5556, '/kassa', username='ofitsiantb')
        self.assertIn('⛔', out)
        self.assertNotIn('111 111', out)
        out = self.press(5556, f'ord_status:{self.order_a.id}:ready', username='ofitsiantb')
        self.assertIn('Faqat adminlar', out)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')
        from notifications.admin_bot import resolve_admin_scope
        self.assertIsNone(resolve_admin_scope('5556'))

    # ── 2. /kassa faqat o'z do'koni ─────────────────────────────────────────
    def test_shop_admin_kassa_shows_only_own_shop(self):
        out = self.say(CHAT_B, '/kassa')
        self.assertIn('Beta Oshxona', out)
        self.assertIn('222 222', out)
        self.assertNotIn('Alfa', out)
        self.assertNotIn('111 111', out)
        out = self.say(CHAT_A, '/kassa')
        self.assertIn('Alfa Oshxona', out)
        self.assertIn('111 111', out)
        self.assertNotIn('222 222', out)

    @override_settings(TELEGRAM_ADMIN_CHAT_IDS=PLATFORM_CHAT)
    def test_platform_admin_from_env_keeps_default_shop_kassa(self):
        out = self.say(PLATFORM_CHAT, '/kassa')
        self.assertIn('Alfa Oshxona', out)
        self.assertIn('111 111', out)

    # ── 3. /order, /orders, /admin, /stollar do'konga bog'langan ─────────────
    def test_shop_admin_cannot_read_other_shop_order(self):
        out = self.say(CHAT_B, f'/order {self.order_a.order_number}')
        self.assertIn('topilmadi', out)
        self.assertNotIn('Maxfiy', out)
        out = self.say(CHAT_B, f'/order {self.order_b.order_number}')
        self.assertIn('Oddiy MijozB', out)

    def test_shop_admin_recent_orders_and_stats_are_scoped(self):
        out = self.say(CHAT_B, '/orders')
        self.assertIn('Oddiy MijozB', out)
        self.assertNotIn('Maxfiy', out)
        self.assertNotIn('Alfa', out)
        out = self.say(CHAT_B, '/admin')
        self.assertIn('Beta Oshxona', out)
        self.assertNotIn('Alfa', out)
        # Bugungi tushum: faqat B (A ning 111 111 yoki umumiy yig'indi 333 333 ko'rinmaydi)
        self.assertNotIn('111 111', out)
        self.assertNotIn('333 333', out)

    def test_shop_admin_tables_monitor_is_own_shop_even_when_default_is_other(self):
        out = self.say(CHAT_B, '/stollar')
        self.assertIn('Beta Oshxona', out)
        self.assertNotIn('Alfa', out)

    # ── 4. tugmalar (callback) ──────────────────────────────────────────────
    def test_shop_admin_cannot_change_other_shop_order_or_table(self):
        before = self.table_a.status
        out = self.press(CHAT_B, f'ord_status:{self.order_a.id}:ready')
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')
        self.assertNotIn('Maxfiy', out)
        for data in (f't_set_occ:{self.table_a.id}', f't_set_free:{self.table_a.id}'):
            self.press(CHAT_B, data)
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, before)

    def test_shop_admin_cannot_view_other_shop_table_or_list(self):
        out = self.press(CHAT_B, f't_view:{self.table_a.id}')
        self.assertNotIn('Alfa', out)
        out = self.press(CHAT_B, f't_list:{self.shop_a.id}')
        self.assertNotIn('Alfa', out)

    def test_shop_admin_can_use_own_buttons(self):
        self.press(CHAT_B, f'ord_status:{self.order_b.id}:preparing')
        self.order_b.refresh_from_db()
        self.assertEqual(self.order_b.status, 'preparing')
        out = self.press(CHAT_B, f't_view:{self.table_b.id}')
        self.assertIn('Beta Oshxona', out)

    def test_order_status_button_rejects_unknown_status(self):
        self.press(CHAT_B, f'ord_status:{self.order_b.id}:hacked')
        self.order_b.refresh_from_db()
        self.assertEqual(self.order_b.status, 'pending')

    def test_3d_print_buttons_are_platform_admin_only(self):
        order3d = Print3DOrder.objects.create(order_number='3D-0001', customer_name='Mijoz', customer_phone='+998900000000')
        self.press(CHAT_B, f'3d_status:printing:{order3d.id}')
        order3d.refresh_from_db()
        self.assertEqual(order3d.status, 'new')
        with override_settings(TELEGRAM_ADMIN_CHAT_IDS=PLATFORM_CHAT):
            self.press(PLATFORM_CHAT, f'3d_status:printing:{order3d.id}')
            order3d.refresh_from_db()
            self.assertEqual(order3d.status, 'printing')
            self.press(PLATFORM_CHAT, f'3d_status:nomalum:{order3d.id}')
            order3d.refresh_from_db()
            self.assertEqual(order3d.status, 'printing')

    # ── 5. eski umumiy handle_webhook ───────────────────────────────────────
    def _legacy(self, chat_id, text, username='stranger'):
        from notifications.services.telegram_service import handle_webhook
        update = {'message': {'chat': {'id': int(chat_id)}, 'from': {'username': username, 'first_name': 'X'},
                              'text': text, 'message_id': 1}}
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            handle_webhook(update)
        return '\n'.join(str(c.kwargs['json'].get('text', '')) for c in post.call_args_list)

    def test_legacy_handler_kassa_and_order_are_scoped_to_the_chat(self):
        out = self._legacy(CHAT_B, '/kassa')
        self.assertIn('Beta Oshxona', out)
        self.assertNotIn('Alfa', out)
        self.assertNotIn('111 111', out)
        out = self._legacy(CHAT_B, f'/order {self.order_a.order_number}')
        self.assertIn('topilmadi', out)
        self.assertNotIn('Maxfiy', out)
        AdminUser.objects.create_user(username='soxta', password='Parol-Soxta-123', role='shop_owner', shop=self.shop_b)
        out = self._legacy(5557, '/kassa', username='soxta')
        self.assertNotIn('Kassa (', out)
        self.assertNotIn('Beta', out)

    # ── 6. eski webhook manzili sirsiz ochiq edi ────────────────────────────
    def test_legacy_notifications_webhook_requires_the_secret(self):
        order3d = Print3DOrder.objects.create(order_number='3D-0002', customer_name='Mijoz', customer_phone='+998900000000')
        update = {'callback_query': {'id': 'cq9', 'data': f'3d_status:printing:{order3d.id}',
                                     'message': {'chat': {'id': 1}}}}
        url = '/api/v1/notifications/webhook/telegram/'
        with mock.patch('httpx.post', return_value=telegram_ok()):
            res = self.client.post(url, json.dumps(update), content_type='application/json')
            self.assertEqual(res.status_code, 403)
            res = self.client.post(url, json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN='wrong')
            self.assertEqual(res.status_code, 403)
        order3d.refresh_from_db()
        self.assertEqual(order3d.status, 'new')
        # To'g'ri sir bilan (Telegram yuborganda) ishlayveradi
        with mock.patch('httpx.post', return_value=telegram_ok()):
            res = self.client.post(url, json.dumps({'message': {'chat': {'id': 1}, 'from': {}, 'text': '/start'}}),
                                   content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=webhook_secret_for(TOKEN))
        self.assertEqual(res.status_code, 200)
