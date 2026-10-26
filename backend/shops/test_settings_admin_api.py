"""
Restoran Sozlamalari Admin API testlari (Settings Admin API).
RBAC ruxsatlar, restoran profili, KDS vaqt chegaralari, xizmat haqi va AuditLog.
"""
import io
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from orders.models import AuditLog
from shops.models import Shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class SettingsAdminApiTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Settings Resto',
            slug='settings-resto',
            owner='settings-owner',
            password='Parol-Settings-123',
            tables=1,
            stdout=io.StringIO(),
        )
        self.shop = Shop.objects.get(slug='settings-resto')
        self.owner = AdminUser.objects.get(username='settings-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])

        # Ofitsiant
        self.waiter = AdminUser.objects.create_user(
            username='settings-waiter',
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

    def test_waiter_cannot_access_settings(self):
        res = self.client_waiter.get(self.API)
        self.assertEqual(res.status_code, 403)

        res_patch = self.client_waiter.patch(self.API, {'name': 'Hacked'}, content_type='application/json')
        self.assertEqual(res_patch.status_code, 403)

    def test_owner_get_settings(self):
        res = self.client_owner.get(self.API)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['name'], 'Settings Resto')
        self.assertEqual(data['slug'], 'settings-resto')
        self.assertIn('service_fee_percent', data)
        self.assertIn('kds_warning_minutes', data)
        self.assertIn('kds_critical_minutes', data)

    def test_owner_patch_settings(self):
        res = self.client_owner.patch(self.API, {
            'name': 'Yangi Restoran Nomi',
            'phone': '+998909998877',
            'address': 'Toshkent sh., Chilonzor tumani',
            'service_fee_percent': 10,
            'kds_warning_minutes': 20,
            'kds_critical_minutes': 40,
            'auto_accept_orders': True,
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['name'], 'Yangi Restoran Nomi')
        self.assertEqual(data['phone'], '+998909998877')
        self.assertEqual(data['service_fee_percent'], 10.0)
        self.assertEqual(data['kds_warning_minutes'], 20)
        self.assertEqual(data['kds_critical_minutes'], 40)
        self.assertTrue(data['auto_accept_orders'])

        self.shop.refresh_from_db()
        self.assertEqual(self.shop.name, 'Yangi Restoran Nomi')
        self.assertEqual(self.shop.business_profile.get('service_fee_percent'), 10.0)

        # AuditLog tekshirish
        self.assertTrue(AuditLog.objects.filter(action_type='shop_settings_updated', target_type='shop', target_id=self.shop.id).exists())

    def test_empty_name_validation(self):
        res = self.client_owner.patch(self.API, {
            'name': '   ',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get('field'), 'name')
