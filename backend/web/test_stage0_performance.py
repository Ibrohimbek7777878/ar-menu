import importlib
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, Client, override_settings
from django.utils import timezone

from backend import urls_restaurant
from categories.models import Category
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table

AdminUser = get_user_model()


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class Stage0PerformanceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username='chef_owner', password='password123', role='shop_owner', is_approved=True
        )
        self.shop = Shop.objects.create(
            name='Test Restoran', slug='test-restoran', owner=self.owner, address='Guliston',
            latitude=40.49, longitude=68.78, is_open=True, phone='+998901234567'
        )
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])

        hall = Hall.objects.create(shop=self.shop, name='Asosiy')
        self.table = Table.objects.create(shop=self.shop, hall=hall, number='1')

        self.category = Category.objects.create(name='Issiq taomlar')
        self.product = Product.objects.create(
            shop=self.shop, name='Sho\'rva', slug='shorva', price=Decimal('25000'),
            category=self.category, is_available=True
        )

    def test_django_admin_disabled_in_production(self):
        """TZ 0.3: DJANGO_ADMIN_ENABLED=False bo'lganda /djangoadmin/ ro'yxatga olinmaydi."""
        with override_settings(DJANGO_ADMIN_ENABLED=False):
            mod = importlib.reload(urls_restaurant)
            has_admin = any(getattr(p, 'pattern', None) and 'djangoadmin' in str(p.pattern) for p in mod.urlpatterns)
            self.assertFalse(has_admin, "DJANGO_ADMIN_ENABLED=False da djangoadmin bo'lmasligi shart")

        with override_settings(DJANGO_ADMIN_ENABLED=True):
            mod = importlib.reload(urls_restaurant)
            has_admin = any(getattr(p, 'pattern', None) and 'djangoadmin' in str(p.pattern) for p in mod.urlpatterns)
            self.assertTrue(has_admin, "DJANGO_ADMIN_ENABLED=True da djangoadmin mavjud bo'lishi kerak")

    def test_kds_orders_api_limits_to_active_and_24h(self):
        """TZ 0.4: KDS API faqat faol holatlar va oxirgi 24 soatdagi buyurtmalarni beradi."""
        self.client.force_login(self.owner)
        now = timezone.now()

        # 1. Faol va yangi buyurtma (chiqishi kerak)
        o1 = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Mijoz 1', order_number='KDS-001',
            status='pending', total_amount=Decimal('50000'), final_amount=Decimal('50000')
        )
        # 2. Tayyorlanayotgan va yangi buyurtma (chiqishi kerak)
        o2 = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Mijoz 2', order_number='KDS-002',
            status='preparing', total_amount=Decimal('60000'), final_amount=Decimal('60000')
        )
        # 3. Yetkazilgan buyurtma (faol emas — chiqmasligi kerak)
        o3 = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Mijoz 3', order_number='KDS-003',
            status='delivered', total_amount=Decimal('40000'), final_amount=Decimal('40000')
        )
        # 4. Bekor qilingan buyurtma (faol emas — chiqmasligi kerak)
        o4 = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Mijoz 4', order_number='KDS-004',
            status='cancelled', total_amount=Decimal('30000'), final_amount=Decimal('30000')
        )
        # 5. 25 soat oldingi faol buyurtma (24 soatdan eski — chiqmasligi kerak)
        o5 = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Mijoz 5', order_number='KDS-005',
            status='pending', total_amount=Decimal('70000'), final_amount=Decimal('70000')
        )
        Order.objects.filter(pk=o5.pk).update(created_at=now - timedelta(hours=25))

        res = self.client.get('/api/kds/orders/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'ok')
        order_ids = [item['id'] for item in data['orders']]

        self.assertIn(o1.id, order_ids, "Yangi pending buyurtma KDS da chiqishi kerak")
        self.assertIn(o2.id, order_ids, "Yangi preparing buyurtma KDS da chiqishi kerak")
        self.assertNotIn(o3.id, order_ids, "Delivered buyurtma KDS da chiqmasligi kerak")
        self.assertNotIn(o4.id, order_ids, "Cancelled buyurtma KDS da chiqmasligi kerak")
        self.assertNotIn(o5.id, order_ids, "24 soatdan eski buyurtma KDS da chiqmasligi kerak")

    def test_kds_orders_api_pagination(self):
        """TZ 0.4: KDS buyurtmalar API sahifalashni qo'llab-quvvatlaydi."""
        self.client.force_login(self.owner)
        for i in range(5):
            Order.objects.create(
                shop=self.shop, table=self.table, customer_name=f'Mijoz {i}', order_number=f'PAG-{i}',
                status='confirmed', total_amount=Decimal('10000'), final_amount=Decimal('10000')
            )

        res = self.client.get('/api/kds/orders/?page=1&page_size=2')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data['orders']), 2)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['total_pages'], 3)
        self.assertTrue(data['has_next'])

        res2 = self.client.get('/api/kds/orders/?page=3&page_size=2')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(len(data2['orders']), 1)
        self.assertFalse(data2['has_next'])

    def test_restaurant_orders_list_api_filtering_and_pagination(self):
        """TZ 0.4: /api/v1/restaurant/orders/ faol va 24h buyurtmalarni beradi hamda headers qaytaradi."""
        self.client.force_login(self.owner)
        now = timezone.now()

        active = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Faol', order_number='REST-ACTIVE',
            status='preparing', total_amount=Decimal('20000'), final_amount=Decimal('20000')
        )
        old_order = Order.objects.create(
            shop=self.shop, table=self.table, customer_name='Eski', order_number='REST-OLD',
            status='preparing', total_amount=Decimal('20000'), final_amount=Decimal('20000')
        )
        Order.objects.filter(pk=old_order.pk).update(created_at=now - timedelta(hours=30))

        res = self.client.get('/api/v1/restaurant/orders/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('X-Total-Count', res.headers)
        self.assertIn('X-Total-Pages', res.headers)
        self.assertIn('X-Page', res.headers)

        data = res.json()
        ids = [o['id'] for o in data]
        self.assertIn(active.id, ids)
        self.assertNotIn(old_order.id, ids)
