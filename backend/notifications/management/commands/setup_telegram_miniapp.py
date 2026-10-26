"""
Telegram Mini App va Bot sozlamalarini o'rnatish (TZ: Stage 5, T1).

Vazifalar:
1. setChatMenuButton — doimiy «🍽 Menyu» (web_app) tugmasi
2. setMyCommands — /start, /menu, /id buyruqlari
3. setMyDescription / setMyShortDescription — bot tavsiflari

Ishlatish:
    python manage.py setup_telegram_miniapp
    python manage.py setup_telegram_miniapp --url https://restoran.uz
"""
import httpx
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Telegram bot uchun Mini App Menu tugmasi, buyruqlar va tavsiflarni o'rnatish"

    def add_arguments(self, parser):
        parser.add_argument('--url', help='Public restoran URL (masalan https://restoran.uz)')

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if not token:
            raise CommandError("TELEGRAM_BOT_TOKEN o'rnatilmagan.")

        public_url = (
            options.get('url')
            or getattr(settings, 'RESTAURANT_PUBLIC_URL', '')
            or getattr(settings, 'SITE_URL', '')
        )
        if not public_url:
            raise CommandError(
                "Restoran public URL topilmadi. --url argumenti yoki RESTAURANT_PUBLIC_URL sozlamasini bering."
            )

        public_url = public_url.rstrip('/')
        if not public_url.startswith('https://') and not getattr(settings, 'DEBUG', False):
            raise CommandError("Telegram Mini App URL manzili HTTPS bo'lishi shart!")

        menu_app_url = f"{public_url}/restaurant/"
        api_base = getattr(settings, 'TELEGRAM_API_BASE', 'https://api.telegram.org').rstrip('/')
        base_endpoint = f"{api_base}/bot{token}"

        self.stdout.write("Telegram Mini App konfiguratsiyasi o'rnatilmoqda...")

        # 1. setChatMenuButton — Doimiy pastki chap burchakdagi tugma
        try:
            resp_btn = httpx.post(
                f"{base_endpoint}/setChatMenuButton",
                json={
                    "menu_button": {
                        "type": "web_app",
                        "text": "🍽 Menyu",
                        "web_app": {"url": menu_app_url},
                    }
                },
                timeout=10,
            )
            btn_data = resp_btn.json()
            if btn_data.get('ok'):
                self.stdout.write(self.style.SUCCESS(f"✅ Chat Menu Button o'rnatildi: {menu_app_url}"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Chat Menu Button xatosi: {btn_data.get('description')}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Chat Menu Button so'rovida xato: {e}"))

        # 2. setMyCommands — Bot buyruqlari
        commands = [
            {"command": "start", "description": "Menyuni ochish va xizmatlar"},
            {"command": "menu", "description": "3D Restoran menyusi"},
            {"command": "id", "description": "Telegram ID ni bilish"},
        ]
        try:
            resp_cmd = httpx.post(
                f"{base_endpoint}/setMyCommands",
                json={"commands": commands},
                timeout=10,
            )
            cmd_data = resp_cmd.json()
            if cmd_data.get('ok'):
                self.stdout.write(self.style.SUCCESS("✅ Bot buyruqlari (/start, /menu, /id) muvaffaqiyatli o'rnatildi."))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Bot buyruqlari xatosi: {cmd_data.get('description')}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ setMyCommands so'rovida xato: {e}"))

        # 3. setMyDescription — To'liq tavsif
        description_text = (
            "Guliston 3D Restoran — Interaktiv 3D va AR menyu orqali taomlarni haqiqiy ko'rinishda tanlang va stolingizga buyurtma bering."
        )
        try:
            resp_desc = httpx.post(
                f"{base_endpoint}/setMyDescription",
                json={"description": description_text},
                timeout=10,
            )
            desc_data = resp_desc.json()
            if desc_data.get('ok'):
                self.stdout.write(self.style.SUCCESS("✅ Bot tavsifi (setMyDescription) o'rnatildi."))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Bot tavsifi xatosi: {desc_data.get('description')}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ setMyDescription so'rovida xato: {e}"))

        # 4. setMyShortDescription — Qisqa tavsif
        short_desc_text = "3D va AR interaktiv restoran menyusi"
        try:
            resp_sdesc = httpx.post(
                f"{base_endpoint}/setMyShortDescription",
                json={"short_description": short_desc_text},
                timeout=10,
            )
            sdesc_data = resp_sdesc.json()
            if sdesc_data.get('ok'):
                self.stdout.write(self.style.SUCCESS("✅ Qisqa tavsif (setMyShortDescription) o'rnatildi."))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Qisqa tavsif xatosi: {sdesc_data.get('description')}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ setMyShortDescription so'rovida xato: {e}"))

        self.stdout.write(self.style.SUCCESS("🎉 Telegram Mini App sozlamalari yakunlandi!"))
