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
from orders.models import Order, OrderItem
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
        for path in ('session/', 'welcome/', 'menu/', 'cart/', 'checkout/', 'orders/'):
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
        for path in ('session/', 'welcome/', 'menu/', 'cart/', 'checkout/', 'orders/'):
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


class GuestApiOrdersTests(GuestApiBase):
    _seq = 0

    def make_order(self, shop=None, status='pending', table=None, items=(('Osh', '48000', 2),)):
        GuestApiOrdersTests._seq += 1
        total = sum(Decimal(price) * qty for _name, price, qty in items)
        order = Order.objects.create(
            shop=shop or self.shop, order_number=f'API-{self._seq:05d}', customer_name='Mehmon',
            customer_phone_1='+998901112233', table=table, status=status, payment_status='unpaid',
            total_amount=total, delivery_fee=Decimal('0'), final_amount=total)
        for name, price, qty in items:
            OrderItem.objects.create(order=order, product_name=name, price=Decimal(price), quantity=qty,
                                     unit='porsiya', total=Decimal(price) * qty)
        return order

    def guest_with(self, *orders, with_table=False):
        client, _table = self.table_client() if with_table else (Client(), None)
        session = client.session
        session['my_order_ids'] = [o.id for o in orders]
        session.save()
        return client

    def test_no_orders_for_a_new_guest(self):
        self.make_order()  # boshqa mehmonniki
        data = self.get('orders/').json()
        self.assertEqual(data['orders'], [])
        self.assertEqual(data['shop'], {'name': 'API Restorani'})

    def test_list_equals_the_orders_page_block(self):
        table = Table.objects.filter(shop=self.shop).first()
        mine = [self.make_order(table=table), self.make_order(status='preparing', items=(('Manti', '32000', 1), ('Choy', '8000', 2)))]
        for with_table in (False, True):
            client = self.guest_with(*mine, with_table=with_table)
            page = blob(client.get('/orders/').content.decode(), 'ORDERS')
            self.assertEqual(self.get('orders/', client=client).json(), page, f'stol bilan={with_table}')
        self.assertEqual(len(page['orders']), 2)
        self.assertGreater(page['orders'][0]['id'], page['orders'][1]['id'], "yangisi birinchi")

    def test_list_shows_only_this_guests_orders_and_caps_at_30(self):
        mine = [self.make_order() for _ in range(32)]
        other = self.make_order()
        data = self.get('orders/', client=self.guest_with(*mine)).json()
        ids = [o['id'] for o in data['orders']]
        self.assertEqual(len(ids), 30)
        self.assertNotIn(other.id, ids)

    def test_list_has_no_phone_or_internal_fields(self):
        data = self.get('orders/', client=self.guest_with(self.make_order())).json()
        text = json.dumps(data)
        self.assertNotIn('998901112233', text)
        self.assertNotIn('customer', text)

    def test_detail_equals_the_order_page_block(self):
        order = self.make_order(status='preparing')
        client = self.guest_with(order)
        page = blob(client.get(f'/tma/order/{order.id}/').content.decode(), 'ORDERS')
        self.assertEqual(self.get(f'orders/{order.id}/', client=client).json(), page)
        self.assertEqual(page['orders'][0]['status'], 'preparing')

    def test_foreign_and_unknown_orders_are_404(self):
        mine, theirs = self.make_order(), self.make_order()
        client = self.guest_with(mine)
        self.assertEqual(self.get(f'orders/{mine.id}/', client=client).status_code, 200)
        self.assertEqual(self.get(f'orders/{theirs.id}/', client=client).status_code, 404)
        self.assertEqual(self.get('orders/999999/', client=client).status_code, 404)
        self.assertEqual(self.get(f'orders/{mine.id}/').status_code, 404, 'sessiyasiz mehmon')

    def test_staff_of_the_same_restaurant_can_view_but_another_restaurants_staff_cannot(self):
        order = self.make_order()
        owner = AdminUser.objects.get(username='api-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        staff = Client()
        staff.force_login(owner)
        self.assertEqual(self.get(f'orders/{order.id}/', client=staff).status_code, 200)
        call_command('create_restaurant', name='Begona', slug='begona', owner='begona-ega',
                     password='Begona-parol-1', tables=1, stdout=io.StringIO())
        foreign = AdminUser.objects.get(username='begona-ega')
        foreign.is_approved = True
        foreign.save(update_fields=['is_approved'])
        other_staff = Client()
        other_staff.force_login(foreign)
        self.assertEqual(self.get(f'orders/{order.id}/', client=other_staff).status_code, 404)

    def test_status_change_changes_etag_and_unchanged_gives_304(self):
        order = self.make_order()
        client = self.guest_with(order)
        first = self.get(f'orders/{order.id}/', client=client)
        again = self.get(f'orders/{order.id}/', client=client, HTTP_IF_NONE_MATCH=first['ETag'])
        self.assertEqual(again.status_code, 304)
        order.status = 'ready'
        order.save()
        changed = self.get(f'orders/{order.id}/', client=client, HTTP_IF_NONE_MATCH=first['ETag'])
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json()['orders'][0]['status'], 'ready')
        self.assertNotEqual(changed['ETag'], first['ETag'])

    def test_query_count_does_not_grow_with_the_number_of_items(self):
        """N+1 yo'q: 1 ta va 8 ta taomli buyurtma uchun SQL soni bir xil (testda sozlamalar keshi o'chiq, shuning uchun ~6)."""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        counts = []
        for n in (1, 8):
            order = self.make_order(items=tuple(('Taom%d' % i, '1000', 1) for i in range(n)))
            client = self.guest_with(order)
            self.get(f'orders/{order.id}/', client=client)  # isitish
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.get(f'orders/{order.id}/', client=client).status_code, 200)
            counts.append(len(ctx))
        self.assertEqual(counts[0], counts[1], counts)
        self.assertLessEqual(counts[0], 7)
