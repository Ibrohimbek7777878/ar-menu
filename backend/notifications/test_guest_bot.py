"""
Mehmon boti (TZ B1): `/start` salomlashuvi, "Ofitsiantni chaqirish" tugmasi va uning xavfsizligi.
"""
import json
import uuid
from unittest import mock

from django.core.cache import cache
from django.test import Client, SimpleTestCase, TestCase, override_settings

from notifications.guest_bot import CALL_PREFIX, COOLDOWN_SECONDS, handle_guest_callback, waiter_button
from notifications.test_admin_scope import CHAT_A, make_shop
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from tables_restaurant.models import ServiceCall, Table
from web.telegram_webhook import get_menu_markup


class WaiterButtonTests(TestCase):

    def test_button_shape_and_telegram_limit(self):
        token = str(uuid.uuid4())
        btn = waiter_button(token)
        self.assertEqual(btn['callback_data'], f'wc:{token}')
        self.assertLessEqual(len(btn['callback_data'].encode()), 64)
        self.assertIn('Ofitsiantni chaqirish', btn['text'])

    def test_only_a_table_bound_guest_gets_the_button(self):
        token = str(uuid.uuid4())
        with_table = get_menu_markup('https://x.uz', table_token=token)['inline_keyboard']
        without = get_menu_markup('https://x.uz')['inline_keyboard']
        self.assertEqual(with_table[-1][0]['callback_data'], f'wc:{token}')
        self.assertFalse([b for row in without for b in row if 'callback_data' in b])
        texts = [b['text'] for row in with_table for b in row]
        self.assertIn('🍽 Menyuni ochish', texts)
        self.assertIn('📍 Mening stolim & Bron', texts)

    def test_other_callbacks_are_not_swallowed(self):
        for data in ('t_list:1', 'ord_status:5:ready', 'admin_stats', '', None):
            self.assertFalse(handle_guest_callback(data, 'cq'), data)


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN,
                   TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class GuestBotWebhookTests(TestCase):
    GUEST = 777001

    def setUp(self):
        cache.clear()
        self.shop = make_shop('gb-shop', 'Guliston Oshxona', 'gb-owner', CHAT_A)
        self.tables = list(Table.objects.filter(shop=self.shop).order_by('number'))
        self.table = self.tables[0]
        self.client = Client()

    def post(self, update):
        secret = webhook_secret_for(TOKEN)
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        return [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]

    def press(self, data):
        update = {'callback_query': {'id': 'cq-guest', 'data': data, 'from': {'id': self.GUEST, 'username': ''},
                                     'message': {'message_id': 9, 'chat': {'id': self.GUEST}}}}
        payloads = self.post(update)
        return '\n'.join(str(p.get('text', '')) for p in payloads)

    def start(self, arg=''):
        update = {'message': {'chat': {'id': self.GUEST, 'first_name': 'Ali'}, 'from': {'id': self.GUEST, 'first_name': 'Ali'},
                              'text': f'/start {arg}'.strip()}}
        return self.post(update)

    def calls(self):
        return ServiceCall.objects.filter(table=self.table)

    # ── ofitsiant chaqirish ──
    def test_press_creates_one_pending_waiter_call(self):
        answer = self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 1)
        call = self.calls().get()
        self.assertEqual((call.call_type, call.status, call.shop_id), ('waiter', 'pending', self.shop.id))
        self.assertIn('Ofitsiant chaqirildi', answer)
        self.assertIn(f'№{self.table.number}', answer)

    def test_second_press_within_the_cooldown_is_ignored(self):
        self.press(f'wc:{self.table.qr_token}')
        answer = self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 1)
        self.assertIn('biroz kuting', answer)

    def test_a_pending_call_from_the_site_blocks_a_duplicate_from_the_bot(self):
        ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='waiter', title='Sayt', status='pending')
        answer = self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 1)
        self.assertIn('biroz kuting', answer)

    def test_a_finished_call_does_not_block_a_new_one(self):
        ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='waiter', title='Eski', status='done')
        self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 2)

    def test_cooldown_is_per_table(self):
        other = self.tables[1]
        self.press(f'wc:{self.table.qr_token}')
        self.press(f'wc:{other.qr_token}')
        self.assertEqual(ServiceCall.objects.filter(table=other).count(), 1)

    def test_invalid_tokens_create_nothing(self):
        for data in ('wc:', 'wc:not-a-uuid', f'wc:{uuid.uuid4()}', 'wc:' + 'a' * 60):
            answer = self.press(data)
            self.assertIn('QR kodni qayta skanerlang', answer, data)
        self.assertEqual(ServiceCall.objects.count(), 0)

    def test_inactive_and_rotated_tokens_are_rejected(self):
        old_token = self.table.qr_token
        self.table.qr_token = uuid.uuid4()
        self.table.qr_token_old = old_token
        self.table.save()
        self.press(f'wc:{old_token}')
        self.assertEqual(self.calls().count(), 0, 'aylantirilgan (eski) QR tokeni ishlamasligi kerak')
        self.table.is_active = False
        self.table.save()
        self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 0)

    def test_failure_does_not_lock_the_table_for_a_minute(self):
        with mock.patch.object(ServiceCall.objects, 'create', side_effect=RuntimeError('boom')):
            answer = self.press(f'wc:{self.table.qr_token}')
        self.assertIn('Xatolik', answer)
        self.press(f'wc:{self.table.qr_token}')
        self.assertEqual(self.calls().count(), 1, 'xatodan keyin qayta urinish ishlashi kerak')

    # ── /start salomlashuvi ──
    def test_start_with_a_table_shows_table_hall_and_the_waiter_button(self):
        payloads = self.start(f't_{self.table.qr_token}')
        text = payloads[0]['text']
        self.assertIn(f'Siz {self.table.number}-stolga ulandingiz', text)
        self.assertNotIn('3D AR', text)
        markup = json.dumps(payloads[0]['reply_markup'], ensure_ascii=False)
        self.assertIn(f'wc:{self.table.qr_token}', markup)
        self.assertIn('Menyuni ochish', markup)

    def test_start_without_a_table_is_short_and_has_no_waiter_button(self):
        payloads = self.start()
        text = payloads[0]['text']
        self.assertIn('Xush kelibsiz, Ali', text)
        self.assertIn('Guliston Oshxona', text)
        self.assertIn('360°', text)
        self.assertNotIn('3D AR', text)
        self.assertNotIn(CALL_PREFIX, json.dumps(payloads[0]['reply_markup']))

    def test_hostile_names_are_escaped(self):
        update = {'message': {'chat': {'id': self.GUEST, 'first_name': '<b>x</b>&<script>'},
                              'from': {'id': self.GUEST, 'first_name': '<b>x</b>&<script>'}, 'text': '/start'}}
        text = self.post(update)[0]['text']
        self.assertNotIn('<script>', text)
        self.assertIn('&lt;script&gt;', text)

    def test_cooldown_constant_is_a_minute(self):
        self.assertEqual(COOLDOWN_SECONDS, 60)
