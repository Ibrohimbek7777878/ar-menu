"""
Bosma QR kodlar testlari (TZ: R1-10): QR doimiy tasodifiy token ko'tarishi, token faqat xodimga ko'rinishi.
"""
import io
import uuid

from django.core.management import call_command
from django.test import Client, RequestFactory, TestCase, override_settings

from accounts.models import AdminUser
from shops.models import Shop
from tables_restaurant.models import Table
from tables_restaurant.qr import qr_base_url


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class PermanentQrTests(TestCase):
    API = '/api/v1/restaurant'

    def setUp(self):
        call_command('create_restaurant', name='QR Restorani', slug='qr-rest', owner='qr-owner',
                     password='Qr-parol-123', tables=3, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='qr-rest')
        self.waiter = AdminUser.objects.create_user(username='qr-ofitsiant', password='Ofitsiant-1', role='waiter',
                                                    shop=self.shop, is_staff=True)

    def test_qr_path_is_the_permanent_uuid_link(self):
        table = Table.objects.get(shop=self.shop, number='2')
        self.assertEqual(table.qr_path, f'/t/{table.qr_token}/')
        self.assertIsInstance(table.qr_token, uuid.UUID)

    def test_staff_tables_api_exposes_the_token_link(self):
        client = Client()
        client.force_login(self.waiter)
        rows = client.get(f'{self.API}/tables/').json()
        table = Table.objects.get(shop=self.shop, number='2')
        row = next(r for r in rows if r['number'] == '2')
        self.assertEqual(row['qr_path'], f'/t/{table.qr_token}/')
        self.assertEqual(row['qr_token'], str(table.qr_token))

    def test_guests_cannot_read_table_tokens(self):
        res = Client().get(f'{self.API}/tables/')
        self.assertIn(res.status_code, (401, 403))
        self.assertNotIn('qr_token', res.content.decode())

    def test_scanning_the_permanent_link_opens_the_menu_for_that_table(self):
        table = Table.objects.get(shop=self.shop, number='1')
        res = Client().get(table.qr_path)
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res['Location'], f'/menu/?table={table.qr_token}')

    @override_settings(RESTAURANT_PUBLIC_URL='https://menu.example.uz')
    def test_public_url_setting_wins_over_the_request_host(self):
        request = RequestFactory().get('/', HTTP_HOST='127.0.0.1:8000')
        self.assertEqual(qr_base_url(request), 'https://menu.example.uz')

    @override_settings(RESTAURANT_PUBLIC_URL='')
    def test_without_public_url_the_request_host_is_used(self):
        request = RequestFactory().get('/', HTTP_HOST='127.0.0.1:8000')
        self.assertEqual(qr_base_url(request), 'http://127.0.0.1:8000')
