"""
Telegram bot polling — yangiliklarni tekshirib turish.
./venv/bin/python manage.py telegram_poll
"""
import json
import httpx
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Telegram bot polling — yangiliklarni tekshirish'

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            self.stderr.write(self.style.ERROR('TELEGRAM_BOT_TOKEN topilmadi!'))
            return

        api_url = f"https://api.telegram.org/bot{token}"
        self.stdout.write(self.style.SUCCESS(f'Bot polling boshlandi...'))

        # Bot o'zini test qiladi
        try:
            resp = httpx.get(f"{api_url}/getMe", timeout=10)
            data = resp.json()
            if data.get('ok'):
                bot = data['result']
                self.stdout.write(self.style.SUCCESS(
                    f'Bot: @{bot["username"]} ({bot["first_name"]}) — Ishlaydi!'
                ))
            else:
                self.stderr.write(self.style.ERROR(f'Bot xato: {data}'))
                return
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Ulanish xato: {e}'))
            return

        # Test xabar yuborish
        self.stdout.write(self.style.WARNING(
            '\nBotga Telegram\'da xabar yozing!'
        ))
        self.stdout.write(self.style.WARNING(
            'Xabar yozganingizdan keyin Ctrl+C bosing, men chat_id ni ko\'rsataman.'
        ))

        import time
        import signal
        import sys

        offset = 0
        chat_ids = set()

        def signal_handler(sig, frame):
            self.stdout.write(self.style.SUCCESS(f'\n\nTopilgan chat_id lar:'))
            for cid in chat_ids:
                self.stdout.write(self.style.SUCCESS(f'  → {cid}'))
            if chat_ids:
                best = list(chat_ids)[-1]
                self.stdout.write(self.style.SUCCESS(f'\nTELEGRAM_CHAT_ID ni shu ga o\'zgartiring:'))
                self.stdout.write(self.style.SUCCESS(f'  {best}'))
                self.stdout.write(self.style.WARNING(
                    f'\nYoki settings.py ga qo\'shing:'
                ))
                self.stdout.write(self.style.WARNING(
                    f'  TELEGRAM_CHAT_ID = \'{best}\''
                ))
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        self.stdout.write(self.style.SUCCESS('Yangiliklar kutilmoqda...'))

        while True:
            try:
                resp = httpx.get(
                    f"{api_url}/getUpdates",
                    params={'offset': offset, 'timeout': 5},
                    timeout=15,
                )
                data = resp.json()

                for update in data.get('result', []):
                    offset = update['update_id'] + 1
                    msg = update.get('message') or update.get('channel_post') or {}
                    chat = msg.get('chat', {})
                    chat_id = chat.get('id')
                    username = chat.get('username', '?')
                    first_name = chat.get('first_name', '?')
                    text = msg.get('text', '?')

                    if chat_id and chat_id not in chat_ids:
                        chat_ids.add(chat_id)
                        self.stdout.write(self.style.SUCCESS(
                            f'Yangi chat: {first_name} (@{username}) → {chat_id} | "{text}"'
                        ))

                        # /start va menyu buyruqlariga to'liq Mini App tugmalari bilan javob berish
                        if text in ('/start', '/menu', 'menu', 'Do\'kon'):
                            domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
                            if domain.startswith('http://') or domain.startswith('https://'):
                                base_url = domain.rstrip('/')
                            else:
                                scheme = 'https' if not settings.DEBUG and '127.0.0.1' not in domain and 'localhost' not in domain else 'http'
                                base_url = f"{scheme}://{domain}".rstrip('/')

                            welcome = (
                                f"Assalomu alaykum, <b>{first_name or 'qadrli mijoz'}</b>! 👋\n\n"
                                f"🏪 <b>Online Store Guliston & AR Menu</b> rasmiy Telegram Mini App botiga xush kelibsiz!\n\n"
                                f"Bu yerda siz:\n"
                                f"• Oziq-ovqat, restoran taomlari va dehqon bozori mahsulotlarini xarid qilishingiz\n"
                                f"• 3D va AR (Augmented Reality) da taomlarni ko'rishingiz\n"
                                f"• Buyurtmangizni kuryer orqali xaritada kuzatib borishingiz mumkin.\n\n"
                                f"Quyidagi tugmani bosing va xaridni boshlang 👇"
                            )

                            # Agar HTTPS bo'lsa web_app, aks holda standart url
                            is_https = base_url.startswith('https://')
                            tma_btn = {"web_app": {"url": f"{base_url}/tma/"}} if is_https else {"url": f"{base_url}/tma/"}
                            ar_btn = {"web_app": {"url": f"{base_url}/ar/"}} if is_https else {"url": f"{base_url}/ar/"}
                            orders_btn = {"web_app": {"url": f"{base_url}/tma/orders/"}} if is_https else {"url": f"{base_url}/tma/orders/"}
                            catalog_btn = {"web_app": {"url": f"{base_url}/tma/catalog/"}} if is_https else {"url": f"{base_url}/tma/catalog/"}

                            markup = {
                                "inline_keyboard": [
                                    [
                                        {"text": "🛍 Do'konni ochish (Mini App)", **tma_btn},
                                        {"text": "🥽 3D / AR Menyu", **ar_btn},
                                    ],
                                    [
                                        {"text": "📦 Mening buyurtmalarim", **orders_btn},
                                        {"text": "🔍 Katalog va Qidiruv", **catalog_btn},
                                    ]
                                ]
                            }
                            httpx.post(
                                f"{api_url}/sendMessage",
                                json={
                                    'chat_id': chat_id,
                                    'text': welcome,
                                    'parse_mode': 'HTML',
                                    'reply_markup': markup
                                },
                                timeout=10,
                            )
                        elif text == '/id':
                            httpx.post(
                                f"{api_url}/sendMessage",
                                json={
                                    'chat_id': chat_id,
                                    'text': f"Sizning Chat ID: <code>{chat_id}</code>\nUsername: @{username}",
                                    'parse_mode': 'HTML',
                                },
                                timeout=10,
                            )

            except httpx.TimeoutException:
                pass
            except Exception as e:
                self.stderr.write(self.style.WARNING(f'Xato: {e}'))
                time.sleep(2)
