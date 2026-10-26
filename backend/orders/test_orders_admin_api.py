"""
Restoran Buyurtmalar Admin API testlari (Orders Admin API).
Tenant isolation, RBAC ruxsatlar, status va to'lov o'zgarishlari, AuditLog.
"""
import io
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from accounts.models import AdminUser
from orders.models import AuditLog, Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class OrdersAdminApiTests(TestCase):
    API = '/api/restaurant/admin/v1/orders/'

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Orders Test Resto',
            slug='orders-resto',
            owner='orders-owner',
            password='Parol-Orders-123',
            tables=2,
            stdout=io.StringIO()
        )
        self.shop = Shop.objects.get(slug='orders-resto')
        self.owner = AdminUser.objects.get(username='orders-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])

        self.table = Table.objects.filter(shop=self.shop).first()

        self.client_owner = Client()
        self.client_owner.force_login(self.owner)

        # Sinov buyurtmasi yaratamiz
        self.order = Order.objects.create(
            shop=self.shop,
            order_number='ORD-TEST-001',
            customer_name='Ali Valiyev',
            customer_phone_1='+998901234567',
            table=self.table,
            status='pending',
            payment_status='unpaid',
            total_amount=Decimal('85000'),
            delivery_fee=Decimal('0'),
            final_amount=Decimal('85000'),
        )
        self.item = OrderItem.objects.create(
            order=self.order,
            product_name='Osh Markazi Palov',
            price=Decimal('45000'),
            quantity=1,
            unit='porsiya',
            total=Decimal('45000'),
        )
        self.item2 = OrderItem.objects.create(
            order=self.order,
            product_name='Achchiq-chuchuk',
            price=Decimal('40000'),
            quantity=1,
            unit='porsiya',
            total=Decimal('40000'),
        )

    def test_unauthenticated_access_denied(self):
        res = Client().get(self.API)
        self.assertIn(res.status_code, (401, 403))

    def test_list_orders_and_summary(self):
        res = self.client_owner.get(self.API)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('items', data)
        self.assertIn('summary', data)
        self.assertIn('page', data)
        self.assertIn('total', data)
        self.assertGreaterEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['order_number'], 'ORD-TEST-001')
        self.assertEqual(data['items'][0]['table_number'], self.table.number)
        self.assertEqual(data['summary']['today_total'], 1)
        self.assertEqual(data['summary']['pending'], 1)

    def test_order_detail(self):
        res = self.client_owner.get(f'{self.API}{self.order.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['id'], self.order.id)
        self.assertEqual(data['order_number'], 'ORD-TEST-001')
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['items'][0]['product_name'], 'Osh Markazi Palov')

    def test_order_status_update_flow(self):
        # 1. Confirmed
        res1 = self.client_owner.post(f'{self.API}{self.order.id}/status/', {'status': 'confirmed'}, content_type='application/json')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()['status'], 'confirmed')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'confirmed')
        self.assertIsNotNone(self.order.confirmed_at)

        # 2. Preparing
        res2 = self.client_owner.post(f'{self.API}{self.order.id}/status/', {'status': 'preparing'}, content_type='application/json')
        self.assertEqual(res2.status_code, 200)

        # 3. Ready
        res3 = self.client_owner.post(f'{self.API}{self.order.id}/status/', {'status': 'ready'}, content_type='application/json')
        self.assertEqual(res3.status_code, 200)

        # 4. Delivered
        res4 = self.client_owner.post(f'{self.API}{self.order.id}/status/', {'status': 'delivered'}, content_type='application/json')
        self.assertEqual(res4.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'delivered')
        self.assertIsNotNone(self.order.delivered_at)

        # AuditLog tekshiruvi
        self.assertTrue(AuditLog.objects.filter(target_type='order', target_id=self.order.id, action_type='order_status_changed').exists())

    def test_order_status_cancelled_with_reason(self):
        res = self.client_owner.post(f'{self.API}{self.order.id}/status/', {
            'status': 'cancelled',
            'cancel_reason': 'Mijoz kelmadi'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'cancelled')
        self.assertEqual(self.order.cancel_reason, 'Mijoz kelmadi')
        self.assertIsNotNone(self.order.cancelled_at)

    def test_order_payment_status_update(self):
        res = self.client_owner.post(f'{self.API}{self.order.id}/payment/', {
            'payment_status': 'paid'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['payment_status'], 'paid')

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'paid')
        self.assertTrue(AuditLog.objects.filter(target_type='order', target_id=self.order.id, action_type='order_payment_status_changed').exists())

    def test_filtering_and_search(self):
        # Qidiruv
        res_q = self.client_owner.get(f'{self.API}?q=Ali')
        self.assertEqual(res_q.status_code, 200)
        self.assertEqual(len(res_q.json()['items']), 1)

        res_none = self.client_owner.get(f'{self.API}?q=MavjudEmas123')
        self.assertEqual(len(res_none.json()['items']), 0)

        # Status filtri
        res_st = self.client_owner.get(f'{self.API}?status=pending')
        self.assertEqual(len(res_st.json()['items']), 1)

        res_diff = self.client_owner.get(f'{self.API}?status=cancelled')
        self.assertEqual(len(res_diff.json()['items']), 0)

    def test_idor_tenant_isolation(self):
        # Boshqa restoran yaratamiz
        call_command(
            'create_restaurant',
            name='Boshqa Resto 2',
            slug='boshqa-resto-2',
            owner='boshqa-owner-2',
            password='Boshqa-Parol-456',
            tables=1,
            stdout=io.StringIO()
        )
        foreign_shop = Shop.objects.get(slug='boshqa-resto-2')
        foreign_order = Order.objects.create(
            shop=foreign_shop,
            order_number='ORD-FOREIGN-999',
            customer_name='Begona Mehmon',
            status='pending',
            payment_status='unpaid',
            total_amount=Decimal('50000'),
            delivery_fee=Decimal('0'),
            final_amount=Decimal('50000'),
        )

        # Bizning restoran egasi boshqa restoranning buyurtmasini ko'ra olmaydi (404)
        res_get = self.client_owner.get(f'{self.API}{foreign_order.id}/')
        self.assertEqual(res_get.status_code, 404)

        # O'zgartira olmaydi (404)
        res_patch = self.client_owner.post(f'{self.API}{foreign_order.id}/status/', {'status': 'cancelled'}, content_type='application/json')
        self.assertEqual(res_patch.status_code, 404)
