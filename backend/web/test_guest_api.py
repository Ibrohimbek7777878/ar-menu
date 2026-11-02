"""
Mehmon O'QISH API (`/api/guest/v1/…`): TZ_GUEST_API_VA_BOT_2026-11-02.md (A1–A3).
Asosiy kafolat: API javobi sahifadagi `window.__GULISTON_*_DATA__` bloki bilan BIR XIL (drift yo'q), faqat GET,
IDOR yo'q, `guest_api` o'chirilsa 404, ETag/304, sessiyani o'zgartirmaydi.
"""
import io
import json
import re
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from categories.models import Category
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

API = '/api/guest/v1/'


def blob(html, name):
    match = re.search(r'window\.__GULISTON_%s_DATA__ = (\{.*?\});\s*</script>' % name, html, re.S)
    assert match, f'sahifada {name} ma\'lumoti yo\'q'
    return json.loads(match.group(1))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False, GUEST_API_RATE_LIMIT=0)
class GuestApiBase(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='API Restorani', slug='api-resto', owner='api-ega',
                     password='Api-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='api-resto')
        self.cat = Category.objects.create(name_uz='Milliy', is_active=True, is_restaurant=True)
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='api-osh', price=Decimal('48000'),
                                          category=self.cat, is_available=True, image='products/osh.png', is_featured=True)
        self.manti = Product.objects.create(shop=self.shop, name='Manti', slug='api-manti', price=Decimal('32000'),
                                            category=self.cat, is_available=True)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def get(self, path, client=None, **extra):
        return (client or Client()).get(API + path, **extra)

    def table_client(self):
        """QR orqali stol bog'langan mehmon (sessiyada stol tokeni)."""
        table = Table.objects.filter(shop=self.shop, is_active=True).order_by('number').first()
        client = Client()
        session = client.session
        session['tma_table_token'] = str(table.qr_token)
        session.save()
        return client, table


class GuestApiCommonTests(GuestApiBase):

    def test_only_get_is_allowed(self):
        for path in ('session/', 'welcome/', 'menu/', 'cart/', 'checkout/'):
            for method in ('post', 'put', 'patch', 'delete'):
                res = getattr(Client(), method)(API + path)
                self.assertEqual(res.status_code, 405, f'{method} {path}')

    def test_responses_are_private_json_with_etag(self):
        for path in ('session/', 'welcome/'):
            res = self.get(path)
            self.assertEqual(res.status_code, 200)
            self.assertIn('application/json', res['Content-Type'])
            self.assertIn('private', res['Cache-Control'])
            self.assertTrue(res['ETag'].startswith('W/"'))

    def test_if_none_match_gives_304_without_body(self):
        for path in ('session/', 'welcome/'):
            first = self.get(path)
            second = self.get(path, HTTP_IF_NONE_MATCH=first['ETag'])
            self.assertEqual(second.status_code, 304, path)
            self.assertEqual(second.content, b'')

    def test_changed_data_changes_the_etag(self):
        first = self.get('welcome/')
        self.osh.name = 'Osh (yangi)'
        self.osh.save()
        second = self.get('welcome/')
        self.assertNotEqual(first['ETag'], second['ETag'])

    def test_switching_the_setting_off_gives_404_everywhere(self):
        from notifications.models import AppSetting
        AppSetting.objects.create(key='guest_api', value='false', category='guest')
        for path in ('session/', 'welcome/', 'menu/', 'cart/', 'checkout/'):
            res = self.get(path)
            self.assertEqual(res.status_code, 404, path)
            self.assertIn('error', res.json())

    def test_setting_on_by_default(self):
        self.assertEqual(self.get('session/').status_code, 200)

    @override_settings(GUEST_API_RATE_LIMIT=3)
    def test_rate_limit_returns_429_with_retry_after(self):
        from django.core.cache import cache
        cache.clear()
        codes = [self.get('session/').status_code for _ in range(5)]
        self.assertEqual(codes[:3], [200, 200, 200])
        self.assertEqual(codes[3:], [429, 429])
        self.assertIn('Retry-After', self.get('session/'))

    def test_rate_limit_zero_disables_it(self):
        self.assertTrue(all(self.get('session/').status_code == 200 for _ in range(10)))

    def test_reading_never_changes_the_session(self):
        table = Table.objects.filter(shop=self.shop, is_active=True).first()
        client = Client()
        res = client.get(API + 'session/', {'table': str(table.qr_token), 't': str(table.qr_token)})
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json()['table'], '?table= o\'qish API\'sida stolni bog\'lamasligi kerak')
        self.assertNotIn('tma_table_token', client.session)


class GuestApiSessionTests(GuestApiBase):

    def test_anonymous_guest_session(self):
        data = self.get('session/').json()
        self.assertEqual(data['session'], {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        self.assertEqual(data['shop'], {'name': 'API Restorani'})
        self.assertIsNone(data['table'])
        self.assertEqual(data['cartCount'], 0)

    def test_table_bound_by_qr_shows_in_the_session(self):
        client, table = self.table_client()
        data = self.get('session/', client=client).json()
        self.assertEqual(data['table'], {'number': str(table.number), 'hall': table.hall.name if table.hall else 'Asosiy Zal'})

    def test_cart_count_follows_the_session_cart(self):
        client = Client()
        session = client.session
        session['cart'] = {str(self.shop.id): {str(self.osh.id): {'quantity': 3, 'price': 48000, 'name': 'Osh'}}}
        session.save()
        self.assertEqual(self.get('session/', client=client).json()['cartCount'], 3)

    def test_season_and_motion_reach_the_api_session(self):
        owner = AdminUser.objects.get(username='api-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        admin = Client()
        admin.force_login(owner)
        admin.patch('/api/restaurant/admin/v1/settings/', {'guest_season': 'qish', 'guest_motion': 'light'},
                    content_type='application/json')
        data = self.get('session/').json()['session']
        self.assertEqual((data['season'], data['motion']), ('qish', 'light'))


class GuestApiWelcomeTests(GuestApiBase):

    def test_equals_the_welcome_page_block_without_a_table(self):
        page = blob(Client().get('/welcome/').content.decode(), 'WELCOME')
        self.assertEqual(self.get('welcome/').json(), page)
        self.assertEqual([d['name'] for d in page['featured']], ['Osh'], 'rasmli taom chiqishi kerak')

    def test_equals_the_welcome_page_block_with_a_table(self):
        client, _table = self.table_client()
        page = blob(client.get('/welcome/').content.decode(), 'WELCOME')
        self.assertEqual(self.get('welcome/', client=client).json(), page)
        self.assertNotEqual(page['table']['number'], '')


class GuestApiMenuTests(GuestApiBase):

    def test_same_body_and_etag_as_the_existing_menu_api(self):
        old = Client().get('/api/v1/restaurant/menu/')
        new = self.get('menu/')
        self.assertEqual(new.status_code, 200)
        self.assertEqual(new.json(), old.json())
        self.assertEqual(new['ETag'], old['ETag'])

    def test_menu_304_with_the_same_etag(self):
        first = self.get('menu/')
        second = self.get('menu/', HTTP_IF_NONE_MATCH=first['ETag'])
        self.assertEqual(second.status_code, 304)


class GuestApiCartAndCheckoutTests(GuestApiBase):

    def client_with_cart(self, with_table=False):
        client, _table = self.table_client() if with_table else (Client(), None)
        session = client.session
        session['cart'] = {str(self.shop.id): {
            str(self.osh.id): {'quantity': 2, 'price': 48000, 'name': 'Osh', 'image': '/media/products/osh.png', 'unit': 'porsiya'},
            str(self.manti.id): {'quantity': 1, 'price': 32000, 'name': 'Manti'},
        }}
        session.save()
        return client

    # ── savat ──
    def test_empty_cart(self):
        data = self.get('cart/').json()
        self.assertEqual((data['items'], data['cartCount'], data['totalAmount']), ([], 0, 0.0))

    def test_cart_equals_the_cart_page_block(self):
        for with_table in (False, True):
            client = self.client_with_cart(with_table)
            page = blob(client.get('/cart/').content.decode(), 'CART')
            self.assertEqual(self.get('cart/', client=client).json(), page, f'stol bilan={with_table}')
        self.assertEqual(page['cartCount'], 3)
        self.assertEqual(page['totalAmount'], 128000.0)

    def test_malformed_session_cart_does_not_crash(self):
        client = Client()
        session = client.session
        session['cart'] = {'x': 'not-a-dict', str(self.shop.id): {'1': 'bad', '2': 5}}
        session.save()
        for path in ('cart/', 'checkout/'):
            self.assertEqual(self.get(path, client=client).status_code, 200, path)

    # ── rasmiylashtirish ──
    def test_checkout_with_an_empty_cart_is_ok(self):
        data = self.get('checkout/').json()
        self.assertEqual((data['items'], data['subtotal'], data['cartCount']), ([], 0.0, 0))
        self.assertTrue(data['allTables'])

    def test_checkout_equals_the_checkout_page_block(self):
        for with_table in (False, True):
            client = self.client_with_cart(with_table)
            page = blob(client.get('/checkout/').content.decode(), 'CHECKOUT')
            self.assertEqual(self.get('checkout/', client=client).json(), page, f'stol bilan={with_table}')
        self.assertEqual([i['name'] for i in page['items']], ['Osh', 'Manti'])

    def test_checkout_takes_prices_from_the_server_not_from_the_session(self):
        client = self.client_with_cart()
        session = client.session
        session['cart'][str(self.shop.id)][str(self.osh.id)]['price'] = 1  # mijoz narxni "arzonlashtirdi"
        session.save()
        data = self.get('checkout/', client=client).json()
        osh = next(i for i in data['items'] if i['name'] == 'Osh')
        self.assertEqual(osh['price'], 48000.0)
        self.assertEqual(data['subtotal'], 128000.0)

    def test_checkout_skips_sold_out_and_archived_dishes(self):
        client = self.client_with_cart()
        self.manti.is_available = False
        self.manti.save()
        data = self.get('checkout/', client=client).json()
        self.assertEqual([i['name'] for i in data['items']], ['Osh'])
        self.assertEqual(data['subtotal'], 96000.0)
        self.osh.is_deleted = True
        self.osh.save()
        self.assertEqual(self.get('checkout/', client=client).json()['items'], [])

    def test_checkout_lists_only_tables_of_the_cart_restaurant(self):
        call_command('create_restaurant', name='Boshqa', slug='boshqa', owner='boshqa-ega',
                     password='Boshqa-parol-1', tables=3, stdout=io.StringIO())
        data = self.get('checkout/', client=self.client_with_cart()).json()
        other_ids = set(Table.objects.exclude(shop=self.shop).values_list('id', flat=True))
        self.assertFalse(other_ids & {t['id'] for t in data['allTables']})
