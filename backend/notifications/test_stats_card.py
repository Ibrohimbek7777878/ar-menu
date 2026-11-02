"""
Xodim boti (TZ B3): `/stats` kartochkasi va "Kassa" tugmasi.
"""
import json
from datetime import datetime
from decimal import Decimal
from unittest import mock
from zoneinfo import ZoneInfo

from django.test import Client, TestCase, override_settings

from notifications.admin_bot import _day_label, build_stats_keyboard, build_stats_text
from notifications.test_admin_scope import CHAT_A, CHAT_B, make_shop
from notifications.test_order_card import make_order
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from tables_restaurant.models import Table


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class StatsCardTests(TestCase):

    def setUp(self):
        self.shop = make_shop('sc-a', 'Alfa Oshxona', 'sc-owner-a', CHAT_A)
        self.other = make_shop('sc-b', 'Beta Oshxona', 'sc-owner-b', CHAT_B)
        self.tables = list(Table.objects.filter(shop=self.shop, is_active=True))

    def test_day_label_uses_uzbek_month_names(self):
        tz = ZoneInfo('Asia/Tashkent')
        self.assertEqual(_day_label(datetime(2026, 11, 1, 9, 0, tzinfo=tz)), 'Bugun, 1-noyabr')
        self.assertEqual(_day_label(datetime(2026, 1, 15, 9, 0, tzinfo=tz)), 'Bugun, 15-yanvar')
        self.assertEqual(_day_label(datetime(2026, 12, 31, 9, 0, tzinfo=tz)), 'Bugun, 31-dekabr')

    def test_card_numbers_exclude_cancelled_and_other_restaurants(self):
        make_order(self.shop, 'SC-1', items=(('Osh', '100000', 1),))
        make_order(self.shop, 'SC-2', items=(('Choy', '50000', 1),), status='preparing')
        make_order(self.shop, 'SC-3', items=(('Bekor', '999000', 1),), status='cancelled')
        make_order(self.other, 'SC-4', items=(('Begona', '777000', 1),))
        text = build_stats_text([self.shop.id])
        self.assertIn('Alfa Oshxona', text)
        self.assertIn('150 000 so\'m', text)
        self.assertIn('Buyurtma: <b>2 ta</b>', text)
        self.assertIn("O'rtacha chek: <b>75 000 so'm</b>", text)
        self.assertNotIn('777', text)
        self.assertNotIn('Beta', text)

    def test_busy_tables_over_total(self):
        busy = self.tables[0]
        busy.status = 'occupied'
        busy.save()
        text = build_stats_text([self.shop.id])
        self.assertIn(f'Band stol: <b>1 / {len(self.tables)}</b>', text)

    def test_no_orders_today_means_zero_and_no_division_error(self):
        text = build_stats_text([self.shop.id])
        self.assertIn('Buyurtma: <b>0 ta</b>', text)
        self.assertIn("O'rtacha chek: <b>0 so'm</b>", text)

    def test_platform_wide_text_is_unchanged(self):
        self.assertIn('Online Store Guliston', build_stats_text(None))

    def test_hostile_restaurant_name_is_escaped(self):
        self.shop.name = '<script>x</script>'
        self.shop.save()
        text = build_stats_text([self.shop.id])
        self.assertNotIn('<script>', text)
        self.assertIn('&lt;script&gt;', text)

    def test_keyboard_layout(self):
        kb = build_stats_keyboard(7)['inline_keyboard']
        self.assertEqual([b['callback_data'] for b in kb[0]], ['admin_orders', 't_list:7', 'admin_kassa'])
        self.assertEqual(kb[1][0]['callback_data'], 'admin_stats')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN,
                   TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class StatsCallbackTests(TestCase):

    def setUp(self):
        self.shop_a = make_shop('sk-a', 'Alfa', 'sk-owner-a', CHAT_A)
        self.shop_b = make_shop('sk-b', 'Beta', 'sk-owner-b', CHAT_B)
        self.client = Client()

    def press(self, chat_id, data):
        secret = webhook_secret_for(TOKEN)
        update = {'callback_query': {'id': 'cq1', 'data': data, 'from': {'id': int(chat_id), 'username': ''},
                                     'message': {'message_id': 5, 'chat': {'id': int(chat_id)}}}}
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        payloads = [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]
        return '\n'.join(str(p.get('text', '')) for p in payloads), json.dumps(payloads, ensure_ascii=False)

    def test_stats_button_shows_the_card_with_the_new_buttons(self):
        text, raw = self.press(CHAT_A, 'admin_stats')
        self.assertIn('Bugun,', text)
        self.assertIn('Alfa', text)
        self.assertIn('admin_kassa', raw)

    def test_kassa_button_shows_only_this_admins_restaurant(self):
        text, raw = self.press(CHAT_A, 'admin_kassa')
        self.assertIn('Alfa', text)
        self.assertNotIn('Beta', text)
        self.assertIn('admin_stats', raw, 'orqaga tugmasi')

    def test_kassa_button_is_closed_to_strangers(self):
        text, _raw = self.press(999222, 'admin_kassa')
        self.assertNotIn('Alfa', text)
        self.assertNotIn('Kassa', text.replace('Faqat adminlar uchun', ''))
