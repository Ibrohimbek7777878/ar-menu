"""
So'rovlar byudjeti (TZ: R8-5): sahifa ma'lumot ko'payganda ham so'rovlar soni oshmasligi kerak (N+1 yo'q).
Har sahifa uchun chegara — 12 ta so'rov; ma'lumot 2 baravar ko'paytirilganda soni o'zgarmasligi tekshiriladi.
"""
import io
from decimal import Decimal

from django.core.management import call_command
from django.db import connection
from django.test import Client, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from categories.models import Category
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table

BUDGET = 12


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class QueryBudgetTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Byudjet', slug='byudjet', owner='byudjet-ega', password='Byudjet-123',
                     tables=6, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='byudjet')
        self.owner = AdminUser.objects.get(username='byudjet-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.cats = [Category.objects.create(name=f'Kat {i}', name_uz=f'Kat {i}', name_ru=f'Kat {i}') for i in range(3)]
        self.hall = Hall.objects.filter(shop=self.shop).first()
        self.client = Client()

    _seq = 0

    def add_data(self, n):
        for _ in range(n):
            QueryBudgetTests._seq += 1
            i = offset = QueryBudgetTests._seq
            product = Product.objects.create(shop=self.shop, name=f'Taom {i}', slug=f'byd-{i}',
                                             price=Decimal('10000'), category=self.cats[i % 3], is_available=True,
                                             has_3d=True)
            order = Order.objects.create(shop=self.shop, table=Table.objects.filter(shop=self.shop).order_by('id')[i % 6],
                                         order_number=f'GLS-B-{i}', customer_name='Ali',
                                         customer_phone_1='+998901234567', total_amount=10000, final_amount=10000)
            OrderItem.objects.create(order=order, product=product, product_name=product.name, price=Decimal('10000'),
                                     unit='dona', quantity=1, total=Decimal('10000'))

    def queries(self, client, url):
        with CaptureQueriesContext(connection) as ctx:
            res = client.get(url, follow=True)
        self.assertEqual(res.status_code, 200, url)
        return len(ctx)

    def seller_client(self):
        client = Client()
        client.force_login(self.owner)
        return client

    def check(self, name, url, client_factory):
        self.add_data(6)
        client = client_factory()
        small = self.queries(client, url)
        self.add_data(24)
        large = self.queries(client_factory(), url)
        self.assertLessEqual(large, BUDGET, f'{name}: {large} ta so\'rov (chegara {BUDGET})')
        self.assertLessEqual(large, small + 1, f'{name}: ma\'lumot ko\'paygach so\'rovlar ham ko\'paydi ({small} -> {large}) — N+1')

    def test_ar_menu(self):
        self.check('/ar/', '/ar/', Client)

    def test_guest_menu(self):
        self.check('/menu/', '/menu/', Client)

    def test_orders_page(self):
        def factory():
            client = Client()
            session = client.session
            session['my_order_ids'] = list(Order.objects.values_list('pk', flat=True))[:30]
            session.save()
            return client
        self.check('/orders/', '/orders/', factory)

    def test_seller_tables(self):
        self.check('/seller/tables/', '/seller/tables/', self.seller_client)

    def test_hostess_and_kds_pages(self):
        self.check('/kds/', '/kds/', self.seller_client)
        self.check('/arrival/desk/', '/arrival/desk/', self.seller_client)

    def test_staff_api_lists(self):
        for url in ('/api/v1/restaurant/orders/', '/api/v1/restaurant/tables/'):
            self.check(url, url, self.seller_client)
