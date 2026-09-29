"""Telegram webhook ni o'rnatish.

Ishlatish:
    python manage.py set_telegram_webhook https://sitingiz.uz
"""
import os

import httpx
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Telegram bot uchun webhook URL ni o'rnatish"

    def add_arguments(self, parser):
        parser.add_argument('url', nargs='?', help='Public site URL, masalan https://sitingiz.uz')

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if not token:
            raise CommandError('TELEGRAM_BOT_TOKEN o\'rnatilmagan — .env faylni to\'ldiring.')

        base = options.get('url') or getattr(settings, 'SITE_URL', '') or os.environ.get('SITE_URL')
        if not base:
            raise CommandError(
                'Site URL kerak. Misol: python manage.py set_telegram_webhook https://sitingiz.uz'
            )

        webhook = f"{base.rstrip('/')}/telegram/webhook/"
        webhook_payload = {'url': webhook}
        if 'trycloudflare.com' in base:
            import socket
            try:
                domain = base.replace('https://', '').replace('http://', '').strip('/').split('/')[0]
                ip = socket.gethostbyname(domain)
                webhook_payload['ip_address'] = ip
            except Exception:
                webhook_payload['ip_address'] = '104.16.230.132'

        try:
            resp = httpx.post(
                f'https://api.telegram.org/bot{token}/setWebhook',
                json=webhook_payload,
                timeout=10,
            )
            data = resp.json()
        except Exception as e:
            raise CommandError(f'Webhook so\'rovi xatosi: {e}')

        if data.get('ok'):
            self.stdout.write(self.style.SUCCESS(f'✅ Webhook o\'rnatildi: {webhook}'))
            # TMA Mini App Menu tugmasini ham Telegram botda o'rnatish
            tma_url = f"{base.rstrip('/')}/tma/"
            try:
                resp_btn = httpx.post(
                    f'https://api.telegram.org/bot{token}/setChatMenuButton',
                    json={
                        "menu_button": {
                            "type": "web_app",
                            "text": "🍽 3D Menyu (Mini App)",
                            "web_app": {"url": tma_url}
                        }
                    },
                    timeout=10,
                )
                if resp_btn.json().get('ok'):
                    self.stdout.write(self.style.SUCCESS(f'✅ TMA Menu Button o\'rnatildi: {tma_url}'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'⚠️ TMA Menu Button o\'rnatishda ogohlantirish: {e}'))

            # Adminga yangi server URL haqida xabar yuborish
            admin_raw = getattr(settings, 'TELEGRAM_ADMIN_CHAT_IDS', '') or getattr(settings, 'TELEGRAM_CHAT_ID', '')
            admin_ids = [i.strip() for i in str(admin_raw).split(',') if i.strip()]
            if admin_ids:
                msg = (
                    f"🚀 <b>Noutbuk Server Faollashdi!</b>\n\n"
                    f"🌐 <b>Asosiy Domen:</b> {base}\n"
                    f"🛍 <b>Telegram Mini App:</b> {tma_url}\n"
                    f"🥽 <b>3D / AR Menyu:</b> {base}/ar/\n"
                    f"⚙️ <b>Admin Panel:</b> {base}/admin/\n\n"
                    f"✅ <i>Webhook va TMA Menu tugmasi muvaffaqiyatli ulandi!</i>"
                )
                for cid in admin_ids:
                    try:
                        httpx.post(
                            f'https://api.telegram.org/bot{token}/sendMessage',
                            json={'chat_id': cid, 'text': msg, 'parse_mode': 'HTML'},
                            timeout=10,
                        )
                    except Exception as err:
                        self.stdout.write(self.style.WARNING(f'⚠️ Adminga xabar yuborishda xatolik ({cid}): {err}'))
        else:
            raise CommandError(f'Telegram xatolik qaytardi: {data}')

