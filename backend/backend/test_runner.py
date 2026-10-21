"""
Test runner: testlar hech qachon internetga chiqmaydi.

settings.py `.env` ni override=True bilan yuklaydi, shuning uchun testlar haqiqiy
Telegram/Groq tokenlarini ko'radi. Bu runner test davomida localhost'dan boshqa
barcha DNS so'rovlari va TCP ulanishlarini bloklaydi — real chatlarga xabar ketmaydi.
TZ: R-QA-03 / TEST-02.
"""
import socket

from django.conf import settings
from django.test.runner import DiscoverRunner

_LOCAL_HOSTS = frozenset({'localhost', '127.0.0.1', '::1', 'testserver', '0.0.0.0'})


# Testlar `.env`dagi HAQIQIY kalitlarga bog'liq bo'lmasligi va ularni ishlatmasligi uchun test davomida bo'shatiladi
# (settings.py `.env`ni override=True bilan yuklaydi, shuning uchun muhit o'zgaruvchisi bilan almashtirib bo'lmaydi).
# Aniq qiymat kerak bo'lgan test o'zi `override_settings` bilan beradi.
SECRET_SETTINGS = (
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_RESTAURANT_BOT_TOKEN', 'TELEGRAM_MARKET_BOT_TOKEN', 'TELEGRAM_STUDIO_BOT_TOKEN',
    'TELEGRAM_CHAT_ID', 'TELEGRAM_ADMIN_CHAT_IDS', 'TELEGRAM_WEBHOOK_SECRET',
    'AI_API_KEY', 'CLICK_SECRET_KEY', 'PAYME_SECRET_KEY', 'UZCARD_SECRET_KEY',
    'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'SENTRY_DSN', 'ADMIN_PANEL_PASSWORD',
)


class NetworkBlockedError(ConnectionError):
    """Testda tashqi tarmoqqa chiqishga urinish."""


class NoNetworkDiscoverRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        self._saved_secrets = {}
        for name in SECRET_SETTINGS:
            if hasattr(settings, name):
                self._saved_secrets[name] = getattr(settings, name)
                setattr(settings, name, '')
        self._orig_getaddrinfo = socket.getaddrinfo
        self._orig_connect = socket.socket.connect
        orig_getaddrinfo = self._orig_getaddrinfo
        orig_connect = self._orig_connect

        def guarded_getaddrinfo(host, *args, **kw):
            name = host.decode() if isinstance(host, bytes) else (host or '')
            if name not in _LOCAL_HOSTS:
                raise NetworkBlockedError(f'Testda tarmoq bloklangan: {name}')
            return orig_getaddrinfo(host, *args, **kw)

        def guarded_connect(sock, address):
            if sock.family in (socket.AF_INET, socket.AF_INET6):
                host = address[0] if isinstance(address, tuple) else address
                if host not in _LOCAL_HOSTS:
                    raise NetworkBlockedError(f'Testda tarmoq bloklangan: {host}')
            return orig_connect(sock, address)

        socket.getaddrinfo = guarded_getaddrinfo
        socket.socket.connect = guarded_connect

    def teardown_test_environment(self, **kwargs):
        for name, value in self._saved_secrets.items():
            setattr(settings, name, value)
        socket.getaddrinfo = self._orig_getaddrinfo
        socket.socket.connect = self._orig_connect
        super().teardown_test_environment(**kwargs)
