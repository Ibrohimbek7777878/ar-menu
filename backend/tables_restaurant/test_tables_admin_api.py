"""
Restoran Stollar va QR Kodlar Admin API testlari (Tables Admin API).
Tenant isolation, RBAC ruxsatlar, Soft Delete, QR generatsiya, Hall boshqaruvi.
"""
import io
import uuid
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from orders.models import AuditLog, Order
from shops.models import Shop
from tables_restaurant.models import Hall, Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class TablesAdminApiTests(TestCase):
    API = '/api/restaurant/admin/v1/tables/'

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Tables Test Resto',
            slug='tables-resto',
            owner='tables-owner',
            password='Parol-Tables-123',
            tables=3,
            stdout=io.StringIO()
        )
        self.shop = Shop.objects.get(slug='tables-resto')
        self.owner = AdminUser.objects.get(username='tables-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])

        self.waiter = AdminUser.objects.create_user(
            username='tables-waiter',
            password='Waiter-Parol-123',
            role='waiter',
            shop=self.shop,
            is_staff=True,
            is_approved=True
        )

        self.client_owner = Client()
        self.client_owner.force_login(self.owner)

        self.client_waiter = Client()
        self.client_waiter.force_login(self.waiter)

        self.hall = Hall.objects.filter(shop=self.shop).first()
        if not self.hall:
            self.hall = Hall.objects.create(shop=self.shop, name='Asosiy Zal', order=0)

    def test_unauthenticated_access_denied(self):
        res = Client().get(self.API)
        self.assertIn(res.status_code, (401, 403))

    def test_waiter_can_read_but_cannot_create_table(self):
        # Ofitsiant stollar holatini o'qiy oladi (tables_read)
        res_get = self.client_waiter.get(self.API)
        self.assertEqual(res_get.status_code, 200)

        # Ammo yangi stol yarata olmaydi (faqat menu_admin / egasi)
        res_post = self.client_waiter.post(self.API, {'number': '99', 'hall_id': self.hall.id}, content_type='application/json')
        self.assertEqual(res_post.status_code, 403)

    def test_list_tables_and_summary(self):
        res = self.client_owner.get(self.API)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('items', data)
        self.assertIn('halls', data)
        self.assertIn('summary', data)
        self.assertGreaterEqual(len(data['items']), 3)
        self.assertEqual(data['summary']['total'], len(data['items']))

    def test_create_table_success_and_duplicate_prevention(self):
        res = self.client_owner.post(self.API, {
            'number': '42',
            'hall_id': self.hall.id,
            'capacity': 6,
            'shape': 'round'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['number'], '42')
        self.assertEqual(data['capacity'], 6)
        self.assertEqual(data['shape'], 'round')
        self.assertTrue(data['qr_token'])

        # Takroriy raqam uchun 400
        res_dup = self.client_owner.post(self.API, {
            'number': '42',
            'hall_id': self.hall.id,
        }, content_type='application/json')
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn('mavjud', res_dup.json()['error'])

        # AuditLog tekshiruvi
        self.assertTrue(AuditLog.objects.filter(target_type='table', target_id=data['id'], action_type='table_created').exists())

    def test_update_table(self):
        table = Table.objects.filter(shop=self.shop).first()
        res = self.client_owner.patch(f'{self.API}{table.id}/', {
            'capacity': 10,
            'shape': 'round',
            'status': 'occupied'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['capacity'], 10)
        self.assertEqual(data['shape'], 'round')
        self.assertEqual(data['status'], 'occupied')

        table.refresh_from_db()
        self.assertEqual(table.capacity, 10)
        self.assertEqual(table.status, 'occupied')

    def test_soft_delete_and_restore_table(self):
        table = Table.objects.filter(shop=self.shop).first()
        pk = table.id

        # Delete (Soft Delete)
        res_del = self.client_owner.delete(f'{self.API}{pk}/')
        self.assertEqual(res_del.status_code, 200)

        # Bazadan o'chib ketmagan!
        self.assertTrue(Table.all_objects.filter(id=pk).exists())
        table.refresh_from_db()
        self.assertTrue(table.is_deleted)
        self.assertFalse(table.is_active)
        self.assertIsNotNone(table.deleted_at)

        # Standart GET da ko'rinmaydi
        res_get1 = self.client_owner.get(self.API)
        self.assertFalse(any(t['id'] == pk for t in res_get1.json()['items']))

        # include_deleted=true da ko'rinadi
        res_get2 = self.client_owner.get(f'{self.API}?include_deleted=true')
        self.assertTrue(any(t['id'] == pk for t in res_get2.json()['items']))

        # Qayta tiklash (restore)
        res_restore = self.client_owner.post(f'{self.API}{pk}/restore/')
        self.assertEqual(res_restore.status_code, 200)
        table.refresh_from_db()
        self.assertFalse(table.is_deleted)
        self.assertTrue(table.is_active)
        self.assertIsNone(table.deleted_at)

    def test_quick_status_update(self):
        table = Table.objects.filter(shop=self.shop).first()
        res = self.client_waiter.post(f'{self.API}{table.id}/status/', {'status': 'bill'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'bill')

        table.refresh_from_db()
        self.assertEqual(table.status, 'bill')

    def test_rotate_qr_token(self):
        table = Table.objects.filter(shop=self.shop).first()
        old_token = table.qr_token
        res = self.client_owner.post(f'{self.API}{table.id}/rotate-qr/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotEqual(str(old_token), data['qr_token'])

        table.refresh_from_db()
        self.assertEqual(table.qr_token_old, old_token)
        self.assertIsNotNone(table.qr_rotated_at)

    def test_qr_svg_generation(self):
        table = Table.objects.filter(shop=self.shop).first()
        res = self.client_owner.get(f'{self.API}{table.id}/qr.svg')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'image/svg+xml')
        self.assertIn(b'<svg', res.content)

    def test_hall_crud_and_safety_checks(self):
        # Yangi zal yaratish
        res_create = self.client_owner.post(f'{self.API}halls/', {'name': 'VIP Terrasa', 'order': 2}, content_type='application/json')
        self.assertEqual(res_create.status_code, 201)
        hall_id = res_create.json()['id']

        # Zallarni olish
        res_list = self.client_owner.get(f'{self.API}halls/')
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(any(h['id'] == hall_id for h in res_list.json()))

        # Stoli yo'q zalni o'chirish (is_active=False)
        res_del = self.client_owner.delete(f'{self.API}halls/{hall_id}/')
        self.assertEqual(res_del.status_code, 200)

        # Stoli bor zalni o'chirishga uringanda xato (400)
        res_fail = self.client_owner.delete(f'{self.API}halls/{self.hall.id}/')
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('stol mavjud', res_fail.json()['error'])

    def test_idor_tenant_isolation(self):
        # Boshqa restoran yaratamiz
        call_command(
            'create_restaurant',
            name='Boshqa Resto',
            slug='boshqa-resto',
            owner='boshqa-owner',
            password='Boshqa-Parol-123',
            tables=1,
            stdout=io.StringIO()
        )
        foreign_shop = Shop.objects.get(slug='boshqa-resto')
        foreign_table = Table.objects.filter(shop=foreign_shop).first()

        # Bizning foydalanuvchi boshqa restoranning stolini o'chira yoki tahrirlay olmaydi (404)
        res_patch = self.client_owner.patch(f'{self.API}{foreign_table.id}/', {'capacity': 20}, content_type='application/json')
        self.assertEqual(res_patch.status_code, 404)

        res_del = self.client_owner.delete(f'{self.API}{foreign_table.id}/')
        self.assertEqual(res_del.status_code, 404)
