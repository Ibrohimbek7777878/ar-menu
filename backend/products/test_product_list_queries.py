"""S1-6 (TZ T4): zaxira yo'l `/api/v1/products/` ro'yxati taomlar soniga qarab so'rov qo'shmaydi (do'kon nomi select_related)."""
from decimal import Decimal

from django.db import connection
from django.test import Client, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from products.models import Product
from shops.models import Shop

BUDGET = 4


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class ProductListQueryBudgetTests(TestCase):

    def setUp(self):
        self.shops = []
        for i in range(3):
            owner = AdminUser.objects.create_user(username=f'pl-o{i}', password='x12345678', role='shop_owner', is_approved=True)
            self.shops.append(Shop.objects.create(name=f'Do\'kon {i}', slug=f'pl-{i}', owner=owner, address='x', latitude=40.4,
                                                  longitude=68.7, is_open=True, phone=f'+99890111220{i}'))
        self.seq = 0

    def add(self, n):
        for _ in range(n):
            self.seq += 1
            Product.objects.create(shop=self.shops[self.seq % 3], name=f'Taom {self.seq}', slug=f'pl-t-{self.seq}',
                                   price=Decimal('10000'), is_available=True)

    def list_queries(self):
        with CaptureQueriesContext(connection) as ctx:
            resp = Client().get('/api/v1/products/?is_available=true')
        self.assertEqual(resp.status_code, 200)
        return resp, len(ctx.captured_queries), [q['sql'][:80] for q in ctx.captured_queries]

    def test_list_query_count_is_constant_and_small(self):
        self.add(5)
        _, small, _ = self.list_queries()
        self.add(15)
        resp, large, sqls = self.list_queries()
        results = resp.json().get('results', resp.json())
        self.assertGreaterEqual(len(results), 15)
        self.assertEqual(large, small, sqls)
        self.assertLessEqual(large, BUDGET, sqls)

    def test_shop_name_still_in_response(self):
        self.add(3)
        resp, _, _ = self.list_queries()
        results = resp.json().get('results', resp.json())
        self.assertTrue(all(r['shop_name'].startswith("Do'kon") for r in results))
