"""S1-4: mehmon sahifalari (`/`, `/menu/`) uchun ETag/304 va `private` kesh sarlavhasi; boshqa mehmonga sizish yo'q."""
import io
from decimal import Decimal

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from categories.models import Category
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

PAGES = ('/menu/', '/')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestPageEtagTests(TestCase):

    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Etag Oshxona', slug='etag', owner='etag-ega', password='Etag-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='etag')
        self.table = Table.objects.get(shop=self.shop, number='1')
        self.cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Блюда')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='etag-osh', price=Decimal('48000'),
                                          category=self.cat, is_available=True)

    def test_pages_get_etag_and_private_revalidate_header(self):
        for path in PAGES:
            resp = Client().get(path)
            self.assertEqual(resp.status_code, 200, path)
            self.assertRegex(resp['ETag'], r'^"[0-9a-f]{32}"$', path)
            cc = {p.strip() for p in resp['Cache-Control'].split(',')}
            self.assertLessEqual({'private', 'max-age=0', 'must-revalidate'}, cc, path)
            self.assertNotIn('public', cc, path)

    def test_matching_etag_gives_304_with_empty_body(self):
        for path in PAGES:
            client = Client()
            etag = client.get(path)['ETag']
            resp = client.get(path, HTTP_IF_NONE_MATCH=etag)
            self.assertEqual(resp.status_code, 304, path)
            self.assertEqual(resp.content, b'')
            self.assertEqual(resp['ETag'], etag)
            self.assertIn('private', resp['Cache-Control'])

    def test_weak_validator_also_matches(self):
        etag = Client().get('/menu/')['ETag']
        self.assertEqual(Client().get('/menu/', HTTP_IF_NONE_MATCH='W/' + etag).status_code, 304)

    def test_unrelated_or_garbage_etag_gives_full_page(self):
        for value in ('"deadbeef"', 'garbage', '*x'):
            resp = Client().get('/menu/', HTTP_IF_NONE_MATCH=value)
            self.assertEqual(resp.status_code, 200, value)
            self.assertGreater(len(resp.content), 1000)

    def test_menu_change_invalidates_etag(self):
        client = Client()
        etag = client.get('/menu/')['ETag']
        Product.objects.create(shop=self.shop, name='Somsa', slug='etag-somsa', price=Decimal('12000'),
                               category=self.cat, is_available=True)
        resp = client.get('/menu/', HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(resp.status_code, 200)
        self.assertNotEqual(resp['ETag'], etag)
        self.assertIn('Somsa', resp.content.decode())

    def test_other_guest_never_receives_304_for_someone_elses_etag(self):
        """A mehmon (savatli, stolli) ETag'ini B mehmon (bo'sh) yuborsa — B o'z sahifasini oladi, sizish yo'q."""
        a = Client()
        session = a.session
        session['cart'] = {str(self.shop.id): {str(self.osh.id): {'quantity': 3, 'price': 48000, 'name': 'Osh'}}}
        session.save()
        resp_a = a.get(f'/menu/?table={self.table.qr_token}')
        etag_a = resp_a['ETag']
        self.assertIn('"cart": {"%d": 3}' % self.osh.id, resp_a.content.decode())

        resp_b = Client().get('/menu/', HTTP_IF_NONE_MATCH=etag_a)
        self.assertEqual(resp_b.status_code, 200)
        self.assertNotEqual(resp_b['ETag'], etag_a)
        self.assertNotIn('"cart": {"%d": 3}' % self.osh.id, resp_b.content.decode())

    def test_304_keeps_session_side_effects_of_the_view(self):
        """Ko'rinish to'liq bajariladi: 304 da ham stol tokeni sessiyaga yoziladi (cookie qaytadi)."""
        url = f'/menu/?table={self.table.qr_token}'
        etag = Client().get(url)['ETag']
        fresh = Client()
        resp = fresh.get(url, HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(resp.status_code, 304)
        self.assertIn('sessionid', resp.cookies)
        self.assertEqual(fresh.session.get('tma_table_token'), str(self.table.qr_token))

    def test_head_request_supported_and_post_untouched(self):
        resp = Client().head('/menu/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.has_header('ETag'))
        post = Client().post('/menu/', {})
        self.assertFalse(post.has_header('ETag'))

    @override_settings(GUEST_PAGE_ETAG=False)
    def test_flag_off_restores_old_behaviour(self):
        for path in PAGES:
            resp = Client().get(path)
            self.assertEqual(resp.status_code, 200)
            self.assertFalse(resp.has_header('ETag'), path)
            self.assertNotIn('private', resp.get('Cache-Control', ''), path)
