"""
Production xavfsizlik sozlamalari testlari (TZ: R1-1…R1-5, R1-8).
"""
import os
import subprocess
import sys
from pathlib import Path
from unittest import mock

from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse
from django.test import Client, RequestFactory, SimpleTestCase, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from backend.ratelimit import client_ip, rate_limited

BACKEND_DIR = Path(__file__).resolve().parent.parent
GOOD_KEY = 'k' * 64


def import_settings(**env):
    """settings.py ni .env'siz, aniq muhit bilan alohida jarayonda import qiladi; (kod, stderr, stdout)."""
    base = {k: v for k, v in os.environ.items() if k in ('PATH', 'HOME', 'LANG', 'LC_ALL', 'VIRTUAL_ENV')}
    base.update({'DJANGO_SKIP_DOTENV': '1', 'CACHE_DIR': '/tmp/hardening-cache', 'LOG_DIR': '/tmp/hardening-logs'})
    base.update(env)
    code = (
        "import os; os.environ['DJANGO_SETTINGS_MODULE']='backend.settings'\n"
        "from django.conf import settings\n"
        "print(settings.DEBUG, settings.SESSION_COOKIE_SECURE, getattr(settings,'SECURE_SSL_REDIRECT',None), "
        "settings.CORS_ALLOWED_ORIGINS if not settings.DEBUG else 'dev', settings.ALLOWED_HOSTS)\n"
    )
    proc = subprocess.run([sys.executable, '-c', code], cwd=BACKEND_DIR, env=base, capture_output=True, text=True,
                          timeout=60)
    return proc.returncode, proc.stderr, proc.stdout


class ProductionSettingsTests(SimpleTestCase):

    def test_missing_secret_key_refuses_to_start_in_production(self):
        code, err, _ = import_settings(ALLOWED_HOSTS='menu.example.uz')
        self.assertNotEqual(code, 0)
        self.assertIn('DJANGO_SECRET_KEY', err)

    def test_weak_or_leaked_secret_keys_are_refused(self):
        for bad in ('short', 'django-insecure-' + 'x' * 70,
                    'dev-only-insecure-key-never-use-this-on-a-public-server-0123456789'):
            code, err, _ = import_settings(DJANGO_SECRET_KEY=bad, ALLOWED_HOSTS='menu.example.uz')
            self.assertNotEqual(code, 0, bad)
            self.assertIn('zaif', err)

    def test_wildcard_or_empty_hosts_are_refused(self):
        for hosts in ('*', 'menu.example.uz,*', ''):
            code, err, _ = import_settings(DJANGO_SECRET_KEY=GOOD_KEY, ALLOWED_HOSTS=hosts)
            self.assertNotEqual(code, 0, hosts)
            self.assertIn('ALLOWED_HOSTS', err)

    def test_valid_production_environment_is_secure_by_default(self):
        code, err, out = import_settings(
            DJANGO_SECRET_KEY=GOOD_KEY, ALLOWED_HOSTS='menu.example.uz',
            CORS_ALLOWED_ORIGINS='https://menu.example.uz',
        )
        self.assertEqual(code, 0, err)
        debug, cookie_secure, ssl_redirect, cors, hosts = out.strip().split(' ', 4)
        self.assertEqual((debug, cookie_secure, ssl_redirect), ('False', 'True', 'True'))   # DEBUG standarti False
        self.assertIn("'https://menu.example.uz'", cors)
        self.assertNotIn('guliston.uz', cors)       # kodga yozilgan standart domen yo'q

    def test_debug_true_still_works_locally_with_the_dev_key(self):
        code, err, out = import_settings(DEBUG='True')
        self.assertEqual(code, 0, err)
        self.assertTrue(out.startswith('True'))


class ClientIpTests(SimpleTestCase):

    def req(self, xff=None, remote='10.0.0.9'):
        meta = {'REMOTE_ADDR': remote}
        if xff is not None:
            meta['HTTP_X_FORWARDED_FOR'] = xff
        return RequestFactory().get('/', **meta)

    @override_settings(TRUSTED_PROXY_COUNT=0)
    def test_forwarded_header_is_ignored_without_a_trusted_proxy(self):
        self.assertEqual(client_ip(self.req('6.6.6.6')), '10.0.0.9')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_one_proxy_uses_the_last_hop_and_spoofed_prefix_is_ignored(self):
        self.assertEqual(client_ip(self.req('203.0.113.7')), '203.0.113.7')
        self.assertEqual(client_ip(self.req('6.6.6.6, 203.0.113.7')), '203.0.113.7')   # mijoz o'zi yozgan "6.6.6.6"

    @override_settings(TRUSTED_PROXY_COUNT=2)
    def test_two_proxies_use_the_second_from_the_right(self):
        self.assertEqual(client_ip(self.req('6.6.6.6, 203.0.113.7, 172.16.0.1')), '203.0.113.7')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_missing_header_falls_back_to_remote_addr(self):
        self.assertEqual(client_ip(self.req()), '10.0.0.9')


class RateLimitTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_limit_blocks_after_n_requests_per_client(self):
        rf = RequestFactory()
        results = [rate_limited(rf.get('/', REMOTE_ADDR='1.1.1.1'), 't', limit=3, seconds=60) for _ in range(4)]
        self.assertEqual([r is None for r in results], [True, True, True, False])
        self.assertEqual(results[-1].status_code, 429)
        # boshqa mijoz ta'sirlanmaydi
        self.assertIsNone(rate_limited(rf.get('/', REMOTE_ADDR='2.2.2.2'), 't', limit=3, seconds=60))

    @override_settings(TRUSTED_PROXY_COUNT=0)
    def test_changing_the_forwarded_header_does_not_reset_the_counter(self):
        rf = RequestFactory()
        outcomes = [rate_limited(rf.get('/', REMOTE_ADDR='1.1.1.1', HTTP_X_FORWARDED_FOR=f'9.9.9.{i}'), 'spoof',
                                 limit=3, seconds=60) for i in range(5)]
        self.assertEqual(sum(1 for o in outcomes if o is not None), 2)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class LanguageMiddlewareTests(TestCase):

    def session_writes(self, ctx):
        return [q['sql'] for q in ctx.captured_queries
                if 'django_session' in q['sql'] and q['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE'))]

    def test_plain_requests_do_not_write_the_session(self):
        c = Client()
        c.get('/api/v1/restaurant/menu/')                       # birinchi tashrif: til cookie'ga yoziladi
        with CaptureQueriesContext(connection) as ctx:
            c.get('/api/v1/restaurant/menu/')
            c.get('/api/v1/restaurant/menu/')
        self.assertEqual(self.session_writes(ctx), [])           # avval har so'rovda INSERT/UPDATE edi
        self.assertEqual(c.cookies['language'].value, 'uz')

    def test_explicit_language_choice_is_remembered_in_cookie_and_session(self):
        c = Client()
        res = c.get('/api/v1/restaurant/menu/?lang=ru')
        self.assertEqual(res['Content-Language'], 'ru')
        self.assertEqual(c.cookies['language'].value, 'ru')
        self.assertEqual(c.session.get('language'), 'ru')
        self.assertEqual(c.get('/api/v1/restaurant/menu/')['Content-Language'], 'ru')   # cookie orqali

    def test_media_requests_never_touch_session_or_set_cookies(self):
        c = Client()
        with CaptureQueriesContext(connection) as ctx:
            res = c.get('/media/does-not-exist.glb')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.session_writes(ctx), [])
        self.assertNotIn('language', res.cookies)
        self.assertNotIn('Cookie', res.get('Vary', ''))


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class GuestWriteThrottleTests(TestCase):
    """Mehmon yozuvlari cheklanadi, xodim ekranlari (5 soniyalik yangilanish) cheklanmaydi."""

    def setUp(self):
        import io
        from django.core.management import call_command
        from accounts.models import AdminUser
        from shops.models import Shop
        from tables_restaurant.models import Table
        cache.clear()
        call_command('create_restaurant', name='Throttle Restorani', slug='throttle', owner='thr-owner',
                     password='Throttle-parol-1', tables=3, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='throttle')
        self.table = Table.objects.get(shop=self.shop, number='1')
        self.waiter = AdminUser.objects.create_user(username='thr-waiter', password='Throttle-parol-2', role='waiter',
                                                    shop=self.shop)

    def call(self, client, n):
        # har urinish boshqa stol turi: "javobsiz chaqiruv" himoyasi (200) throttle'ni yashirmasin
        return client.post('/api/v1/restaurant/calls/',
                           {'table_number': '1', 'type': 'waiter', 'title': f'x{n}'}, content_type='application/json')

    def test_anonymous_guest_is_throttled_after_the_limit(self):
        from rest_framework.throttling import ScopedRateThrottle
        guest = Client()
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'guest_write': '3/min'}):
            codes = [self.call(guest, i).status_code for i in range(5)]
        self.assertEqual(codes[:3].count(429), 0)
        self.assertEqual(codes[3:], [429, 429])

    def test_staff_requests_are_never_throttled(self):
        from rest_framework.throttling import ScopedRateThrottle
        staff = Client()
        staff.force_login(self.waiter)
        with mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'guest_write': '2/min'}):
            codes = [staff.get('/api/v1/restaurant/orders/').status_code for _ in range(6)]
            codes += [self.call(staff, i).status_code for i in range(4)]
        self.assertNotIn(429, codes)
