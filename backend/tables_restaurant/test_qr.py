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


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class ServerSideQrTests(TestCase):
    """QR rasmlar serverda chiziladi: stol havolasi tashqi xizmatga ketmaydi va internetsiz ham chiqadi (F5)."""

    def setUp(self):
        call_command('create_restaurant', name='Qr Svg', slug='qr-svg', owner='qr-svg-ega', password='Qr-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='qr-svg')
        self.owner = AdminUser.objects.get(username='qr-svg-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.client = Client()
        self.client.force_login(self.owner)
        self.t1, self.t2 = Table.objects.filter(shop=self.shop).order_by('id')

    def test_table_qr_is_an_svg_and_differs_per_table(self):
        a = self.client.get(f'/seller/tables/{self.t1.pk}/qr.svg')
        b = self.client.get(f'/seller/tables/{self.t2.pk}/qr.svg')
        self.assertEqual((a.status_code, a['Content-Type']), (200, 'image/svg+xml'))
        self.assertIn(b'<svg', a.content)
        self.assertNotEqual(a.content, b.content)

    def test_other_restaurants_tables_and_anonymous_users_get_nothing(self):
        call_command('create_restaurant', name='Boshqa Qr', slug='qr-boshqa', owner='qr-boshqa-ega', password='Boshqa-12345',
                     tables=1, stdout=io.StringIO())
        foreign = Table.objects.filter(shop__slug='qr-boshqa').first()
        self.assertEqual(self.client.get(f'/seller/tables/{foreign.pk}/qr.svg').status_code, 404)
        self.assertEqual(Client().get(f'/seller/tables/{self.t1.pk}/qr.svg').status_code, 302)

    def test_menu_qr_works_and_seller_pages_use_local_images_not_a_third_party(self):
        self.assertEqual(self.client.get('/seller/menu-qr.svg').status_code, 200)
        for url in ('/seller/tables/', '/seller/tables/plan/', '/seller/tables/stands/print/'):
            html = self.client.get(url).content.decode()
            self.assertNotIn('api.qrserver.com', html, url)
        self.assertIn(f'/seller/tables/{self.t1.pk}/qr.svg', self.client.get('/seller/tables/stands/print/').content.decode())
