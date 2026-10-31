"""S1-5: yengil `live` (0 SQL) va `ready` (1 SQL) zondlari; to'liq `/health/` o'zgarmagan; compose healthcheck URL'lari mavjud."""
import re
from pathlib import Path
from unittest import mock

from django.db import connection
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import resolve

URLCONFS = ('backend.urls_restaurant', 'backend.urls_market', 'backend.urls_studio', 'web.urls')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class HealthProbeTests(TestCase):

    def test_live_makes_no_sql_and_is_not_cacheable(self):
        with CaptureQueriesContext(connection) as ctx:
            resp = Client().get('/health/live/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {'status': 'alive'})
        self.assertEqual(resp['Cache-Control'], 'no-store')
        self.assertEqual(len(ctx.captured_queries), 0, [q['sql'] for q in ctx.captured_queries])

    def test_ready_makes_exactly_one_sql(self):
        with CaptureQueriesContext(connection) as ctx:
            resp = Client().get('/health/ready/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {'status': 'ready'})
        self.assertEqual(resp['Cache-Control'], 'no-store')
        self.assertEqual(len(ctx.captured_queries), 1, [q['sql'] for q in ctx.captured_queries])

    def test_ready_returns_503_when_database_is_down(self):
        with mock.patch('web.health.connection') as broken:
            broken.cursor.side_effect = RuntimeError('db down')
            resp = Client().get('/health/ready/')
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json(), {'status': 'unready'})
        self.assertNotIn('db down', resp.content.decode())  # ichki xato matni sizib chiqmaydi

    def test_live_stays_up_when_database_is_down(self):
        with mock.patch('web.health.connection') as broken:
            broken.cursor.side_effect = RuntimeError('db down')
            self.assertEqual(Client().get('/health/live/').status_code, 200)

    def test_full_health_is_unchanged_for_external_monitoring(self):
        resp = Client().get('/health/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['status'], 'healthy')  # healthcheck.sh shu maydonni o'qiydi
        for key in ('database', 'disk', 'outbox'):
            self.assertIn(key, body['services'])


class HealthRoutesTests(SimpleTestCase):

    def test_probes_exist_in_every_urlconf(self):
        for conf in URLCONFS:
            for path, name in (('/health/live/', 'health_live'), ('/health/ready/', 'health_ready'), ('/health/', 'health_check')):
                self.assertEqual(resolve(path, urlconf=conf).url_name, name, (conf, path))

    def test_compose_healthchecks_point_to_existing_routes(self):
        compose = Path(__file__).resolve().parents[2] / 'deploy' / 'docker-compose.yml'
        urls = re.findall(r'http://localhost:8000(/[^"\s]*)', compose.read_text())
        self.assertGreaterEqual(len(urls), 2)
        for path in urls:
            self.assertTrue(resolve(path, urlconf='backend.urls_restaurant'), path)
            self.assertIn(path, ('/health/ready/', '/health/live/', '/health/'))
