"""
Restoran Xodimlar Admin API testlari (Staff Admin API).
Tenant isolation, RBAC ruxsatlar, bloklash/blokdan chiqarish, parolni yangilash va AuditLog.
"""
import io

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from orders.models import AuditLog
from shops.models import Shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class StaffAdminApiTests(TestCase):
    API = '/api/restaurant/admin/v1/staff/'

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Staff Test Resto',
            slug='staff-resto',
            owner='staff-owner',
            password='Parol-Staff-123',
            tables=1,
            stdout=io.StringIO()
        )
        self.shop = Shop.objects.get(slug='staff-resto')
        self.owner = AdminUser.objects.get(username='staff-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])

        # Mavjud bir ofitsiant
        self.waiter = AdminUser.objects.create_user(
            username='staff-waiter-1',
            password='Waiter-Parol-123',
            role='waiter',
            shop=self.shop,
            is_staff=False,
            is_approved=True,
        )

        self.client_owner = Client()
        self.client_owner.force_login(self.owner)

        self.client_waiter = Client()
        self.client_waiter.force_login(self.waiter)

    def test_unauthenticated_access_denied(self):
        res = Client().get(self.API)
        self.assertIn(res.status_code, (401, 403))

    def test_waiter_cannot_manage_staff(self):
        # Ofitsiant xodimlar ro'yxatini ko'ra olmaydi (403)
        res = self.client_waiter.get(self.API)
        self.assertEqual(res.status_code, 403)

        # Ofitsiant yangi xodim qo'sha olmaydi (403)
        res_post = self.client_waiter.post(self.API, {
            'username': 'new-waiter',
            'role': 'waiter'
        }, content_type='application/json')
        self.assertEqual(res_post.status_code, 403)

    def test_list_staff(self):
        res = self.client_owner.get(self.API)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data), 2)
        usernames = [u['username'] for u in data]
        self.assertIn('staff-owner', usernames)
        self.assertIn('staff-waiter-1', usernames)

    def test_create_staff_success_with_generated_password(self):
        res = self.client_owner.post(self.API, {
            'username': 'staff-kitchen-1',
            'role': 'kitchen',
            'full_name': 'Botir Oshpaz',
            'phone': '+998901112233'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['username'], 'staff-kitchen-1')
        self.assertEqual(data['role'], 'kitchen')
        self.assertEqual(data['full_name'], 'Botir Oshpaz')
        self.assertTrue(data['generated_password'])

        # DB tekshiruvi
        created = AdminUser.objects.get(username='staff-kitchen-1')
        self.assertEqual(created.shop, self.shop)
        self.assertEqual(created.role, 'kitchen')

        # AuditLog tekshiruvi
        self.assertTrue(AuditLog.objects.filter(target_type='admin_user', target_id=created.id, action_type='staff_created').exists())

    def test_create_staff_duplicate_username_fails(self):
        res = self.client_owner.post(self.API, {
            'username': 'staff-waiter-1',
            'role': 'waiter',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('band', res.json()['error'])

    def test_update_staff_role_and_details(self):
        res = self.client_owner.patch(f'{self.API}{self.waiter.id}/', {
            'role': 'hostess',
            'full_name': 'Zarina Karimova',
            'phone': '+998909998877'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['role'], 'hostess')
        self.assertEqual(data['full_name'], 'Zarina Karimova')

        self.waiter.refresh_from_db()
        self.assertEqual(self.waiter.role, 'hostess')

    def test_cannot_change_own_role(self):
        res = self.client_owner.patch(f'{self.API}{self.owner.id}/', {
            'role': 'waiter'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('o\'zgartira olmaysiz', res.json()['error'])

    def test_block_and_unblock_staff(self):
        # 1. Bloklash
        res_block = self.client_owner.post(f'{self.API}{self.waiter.id}/block/')
        self.assertEqual(res_block.status_code, 200)
        self.assertEqual(res_block.json()['status'], 'blocked')

        self.waiter.refresh_from_db()
        self.assertFalse(self.waiter.is_active)

        # 2. Blokdan chiqarish
        res_unblock = self.client_owner.post(f'{self.API}{self.waiter.id}/unblock/')
        self.assertEqual(res_unblock.status_code, 200)
        self.assertEqual(res_unblock.json()['status'], 'unblocked')

        self.waiter.refresh_from_db()
        self.assertTrue(self.waiter.is_active)

    def test_cannot_block_self_or_owner(self):
        res = self.client_owner.post(f'{self.API}{self.owner.id}/block/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('bloklay olmaysiz', res.json()['error'])

    def test_reset_password(self):
        res = self.client_owner.post(f'{self.API}{self.waiter.id}/reset-password/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'password_reset')
        self.assertTrue(data['generated_password'])

        # Yangi parol bilan tizimga kirishni tekshirish
        client = Client()
        login_ok = client.login(username=self.waiter.username, password=data['generated_password'])
        self.assertTrue(login_ok)

    def test_idor_tenant_isolation(self):
        # Boshqa restoran xodimi
        call_command(
            'create_restaurant',
            name='Boshqa Resto 3',
            slug='boshqa-resto-3',
            owner='boshqa-owner-3',
            password='Boshqa-Parol-789',
            tables=1,
            stdout=io.StringIO()
        )
        foreign_shop = Shop.objects.get(slug='boshqa-resto-3')
        foreign_waiter = AdminUser.objects.create_user(
            username='foreign-waiter',
            password='Foreign-Parol-123',
            role='waiter',
            shop=foreign_shop,
            is_staff=False,
            is_approved=True,
        )

        # Boshqa restoran xodimini o'zgartira olmaslik (404)
        res_patch = self.client_owner.patch(f'{self.API}{foreign_waiter.id}/', {'role': 'kitchen'}, content_type='application/json')
        self.assertEqual(res_patch.status_code, 404)

        # Bloklay olmaslik (404)
        res_block = self.client_owner.post(f'{self.API}{foreign_waiter.id}/block/')
        self.assertEqual(res_block.status_code, 404)
