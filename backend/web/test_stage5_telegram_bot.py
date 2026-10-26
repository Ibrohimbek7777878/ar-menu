"""
Telegram Bot va Mini App integratsiya testlari (TZ: Stage 5, T1, T2, T3).
"""
import io
import json
import uuid

from django.core.management import call_command
from django.test import RequestFactory, TestCase, override_settings

from backend.app_settings import set_setting
from shops.models import Shop
from tables_restaurant.models import Table
from web.telegram_webhook import get_base_url_from_request, get_menu_markup


class TelegramBotMiniAppTests(TestCase):

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Bot Test Oshxona',
            slug='bot-osh',
            owner='bot-ega',
            password='Bot-parol-123!',
            tables=2,
            stdout=io.StringIO(),
        )
        self.shop = Shop.objects.get(slug='bot-osh')
        self.table = Table.objects.filter(shop=self.shop).first()
        self.rf = RequestFactory()

    def test_base_url_prefers_restaurant_public_url_over_fake_host(self):
        """TZ T2: RESTAURANT_PUBLIC_URL Host header poisoningdan himoya qiladi."""
        req = self.rf.get('/webhook/', HTTP_HOST='evil-hacker.com')
        with override_settings(RESTAURANT_PUBLIC_URL='https://halol-restoran.uz'):
            url = get_base_url_from_request(req)
            self.assertEqual(url, 'https://halol-restoran.uz')

    def test_menu_markup_scope_restaurant_hides_printer_and_market(self):
        """TZ T1: bot_scope = 'restaurant' bo'lganda faqat Menyuni ochish va Mening stolim chiqadi."""
        set_setting('bot_scope', 'restaurant')
        markup = get_menu_markup('https://halol-restoran.uz', is_user_admin=False, shop=self.shop)
        buttons = [btn['text'] for row in markup['inline_keyboard'] for btn in row]

        self.assertIn('🍽 Menyuni ochish', buttons)
        self.assertIn('📍 Mening stolim & Bron', buttons)
        self.assertNotIn('🖨 3D Printer Studio', buttons)
        self.assertNotIn('🛍 Online Do\'kon', buttons)

    def test_menu_markup_scope_all_shows_all_four_buttons(self):
        """bot_scope = 'all' bo'lganda barcha 4 ta tugma chiqadi."""
        set_setting('bot_scope', 'all')
        markup = get_menu_markup('https://halol-restoran.uz', is_user_admin=False, shop=self.shop)
        buttons = [btn['text'] for row in markup['inline_keyboard'] for btn in row]

        self.assertIn('🍽 3D Restoran Menyu', buttons)
        self.assertIn('🖨 3D Printer Studio', buttons)
        self.assertIn('🛍 Online Do\'kon', buttons)
        self.assertIn('📍 Mening stolim & Bron', buttons)

    def test_menu_markup_with_table_token_links_directly_to_table_redirect(self):
        """TZ T3: Stol tokeni berilganda web_app URL to'g'ridan-to'g'ri /t/<token>/ bo'ladi."""
        token = str(self.table.qr_token)
        markup = get_menu_markup('https://halol-restoran.uz', table_token=token)
        tma_btn = markup['inline_keyboard'][0][0]
        self.assertEqual(tma_btn['web_app']['url'], f'https://halol-restoran.uz/t/{token}/')
