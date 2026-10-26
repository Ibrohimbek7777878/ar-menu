"""
setup_telegram_miniapp management command testlari (TZ: Stage 5, T1).
"""
import io
from unittest.mock import MagicMock, patch

from django.core.management import CommandError, call_command
from django.test import SimpleTestCase, override_settings


class SetupTelegramMiniAppCommandTests(SimpleTestCase):

    def test_fails_without_token(self):
        with override_settings(TELEGRAM_BOT_TOKEN=''):
            with self.assertRaises(CommandError) as ctx:
                call_command('setup_telegram_miniapp', url='https://test.uz')
            self.assertIn('TELEGRAM_BOT_TOKEN', str(ctx.exception))

    def test_fails_without_public_url(self):
        with override_settings(TELEGRAM_BOT_TOKEN='secret-token', RESTAURANT_PUBLIC_URL='', SITE_URL=''):
            with self.assertRaises(CommandError) as ctx:
                call_command('setup_telegram_miniapp')
            self.assertIn('public url', str(ctx.exception).lower())


    @patch('httpx.post')
    def test_success_flow_sets_all_bot_configs_without_leaking_token(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'ok': True}
        mock_post.return_value = mock_resp

        out = io.StringIO()
        with override_settings(
            TELEGRAM_BOT_TOKEN='my-super-secret-token-12345',
            RESTAURANT_PUBLIC_URL='https://restoran.uz',
        ):
            call_command('setup_telegram_miniapp', stdout=out)

        output = out.getvalue()
        # Token hech qachon ekranga chiqmasligi kerak
        self.assertNotIn('my-super-secret-token-12345', output)
        self.assertIn('Chat Menu Button o\'rnatildi', output)
        self.assertIn('Bot buyruqlari', output)
        self.assertIn('Bot tavsifi', output)
        self.assertIn('Qisqa tavsif', output)

        # 4 ta Telegram API chaqiruvi bo'lganini tekshirish
        called_endpoints = [call[0][0] for call in mock_post.call_args_list]
        self.assertTrue(any('setChatMenuButton' in url for url in called_endpoints))
        self.assertTrue(any('setMyCommands' in url for url in called_endpoints))
        self.assertTrue(any('setMyDescription' in url for url in called_endpoints))
        self.assertTrue(any('setMyShortDescription' in url for url in called_endpoints))
