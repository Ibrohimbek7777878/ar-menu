"""Botning mehmon xabarlari uch tilda: til Telegram `language_code` dan, restoran yoqqan tillar ichidan tanlanadi."""
import json

from unittest import mock

from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from notifications.bot_i18n import TEXTS, bot_lang, bt
from notifications.guest_bot import waiter_button
from notifications.test_admin_scope import CHAT_A, make_shop
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from tables_restaurant.models import ServiceCall, Table
from web.telegram_webhook import get_menu_markup, guest_lang


class HelperTests(TestCase):  # get_menu_markup AppSetting o'qiydi
    def test_language_code_maps_to_a_supported_language(self):
        self.assertEqual(bot_lang('ru'), 'ru')
        self.assertEqual(bot_lang('ru-RU'), 'ru')
        self.assertEqual(bot_lang('en_US'), 'en')
        self.assertEqual(bot_lang('uz'), 'uz')
        for unknown in (None, '', 'de', 'tr', 5):
            self.assertEqual(bot_lang(unknown), 'uz')

    def test_language_the_restaurant_disabled_falls_back_to_its_first_language(self):
        self.assertEqual(bot_lang('ru', 'uz,en'), 'uz')
        self.assertEqual(bot_lang('en', 'uz,en'), 'en')
        self.assertEqual(bot_lang('de', 'ru,uz'), 'ru')

    def test_every_text_exists_in_all_three_languages_with_the_same_placeholders(self):
        import re
        for key, forms in TEXTS.items():
            self.assertEqual(set(forms), {'uz', 'ru', 'en'}, key)
            placeholders = {lang: sorted(re.findall(r'\{(\w+)\}', text)) for lang, text in forms.items()}
            self.assertEqual(placeholders['ru'], placeholders['uz'], key)
            self.assertEqual(placeholders['en'], placeholders['uz'], key)

    def test_missing_language_falls_back_to_uzbek(self):
        self.assertEqual(bt('xx', 'btn_menu'), TEXTS['btn_menu']['uz'])

    def test_buttons_follow_the_language_but_callbacks_do_not(self):
        token = '11111111-1111-1111-1111-111111111111'
        for lang, text in (('uz', 'Ofitsiantni chaqirish'), ('ru', 'Позвать официанта'), ('en', 'Call the waiter')):
            btn = waiter_button(token, lang)
            self.assertIn(text, btn['text'])
            self.assertEqual(btn['callback_data'], f'wc:{token}')
        ru = [b['text'] for row in get_menu_markup('https://x.uz', table_token=token, lang='ru')['inline_keyboard'] for b in row]
        self.assertIn('🍽 Открыть меню', ru)
        self.assertIn('📍 Мой стол и бронь', ru)

    def test_guest_lang_honours_the_shop_setting(self):
        class FakeShop:
            business_profile = {'guest_languages': 'uz'}
        self.assertEqual(guest_lang('ru', FakeShop()), 'uz')
        self.assertEqual(guest_lang('ru', None), 'ru')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN,
                   TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class LocalizedWebhookTests(TestCase):
    GUEST = 777002

    def setUp(self):
        cache.clear()
        self.shop = make_shop('gb-i18n', 'Guliston Oshxona', 'gb-i18n-owner', CHAT_A)
        self.table = Table.objects.filter(shop=self.shop).order_by('number').first()
        self.client = Client()

    def post(self, update):
        secret = webhook_secret_for(TOKEN)
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        return [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]

    def calls(self):
        return ServiceCall.objects.filter(table=self.table)

    def start_as(self, language_code, arg=''):
        update = {'message': {'chat': {'id': self.GUEST, 'first_name': 'Ali'},
                              'from': {'id': self.GUEST, 'first_name': 'Ali', 'language_code': language_code},
                              'text': f'/start {arg}'.strip()}}
        return self.post(update)

    def press_as(self, language_code, data):
        update = {'callback_query': {'id': 'cq-guest', 'data': data,
                                     'from': {'id': self.GUEST, 'username': '', 'language_code': language_code},
                                     'message': {'message_id': 9, 'chat': {'id': self.GUEST}}}}
        return '\n'.join(str(p.get('text', '')) for p in self.post(update))

    def test_russian_guest_gets_a_russian_welcome_and_buttons(self):
        payloads = self.start_as('ru', f't_{self.table.qr_token}')
        self.assertIn(f'Вы подключены к столу {self.table.number}', payloads[0]['text'])
        self.assertIn('Если нужен официант', payloads[0]['text'])
        self.assertIn('Позвать официанта', json.dumps(payloads[0]['reply_markup'], ensure_ascii=False))

    def test_english_guest_without_a_table_gets_an_english_welcome(self):
        payloads = self.start_as('en-GB')
        self.assertIn('Welcome, Ali!', payloads[0]['text'])

    def test_unknown_language_stays_uzbek(self):
        payloads = self.start_as('de')
        self.assertIn('Xush kelibsiz, Ali!', payloads[0]['text'])

    def test_waiter_call_answer_is_russian_and_the_call_is_created(self):
        answer = self.press_as('ru', f'wc:{self.table.qr_token}')
        self.assertIn('Официант вызван', answer)
        self.assertEqual(self.calls().count(), 1)
        self.assertIn('Официант уже вызван', self.press_as('ru', f'wc:{self.table.qr_token}'))

    def test_invalid_token_answer_is_russian(self):
        self.assertIn('Отсканируйте QR-код', self.press_as('ru', 'wc:not-a-uuid'))
