import uuid
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from shops.models import Shop

AdminUser = get_user_model()


class TenantUUIDTests(TestCase):
    def setUp(self):
        self.user = AdminUser.objects.create_user(username='tenant_owner', password='pw')

    def test_shop_public_id_generated_automatically(self):
        """TZ 1.0: Yangi Shop yaratilganda public_id avtomatik UUID qilib belgilanadi."""
        shop = Shop.objects.create(
            name='Tenant Shop 1', slug='tenant-shop-1', owner=self.user,
            address='Manzil', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000001'
        )
        self.assertIsNotNone(shop.public_id)
        self.assertIsInstance(shop.public_id, uuid.UUID)

    def test_shop_public_id_persists_on_update(self):
        """TZ 1.0: Do'kon yangilanganda public_id o'zgarmasdan saqlanib qoladi."""
        shop = Shop.objects.create(
            name='Tenant Shop 2', slug='tenant-shop-2', owner=self.user,
            address='Manzil', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000002'
        )
        original_uuid = shop.public_id
        shop.name = 'Yangi Nom'
        shop.save()
        shop.refresh_from_db()
        self.assertEqual(shop.public_id, original_uuid)

    def test_shop_public_id_uniqueness(self):
        """TZ 1.0: Har bir do'kon o'zining unikal UUID identifikatoriga ega bo'lishi shart."""
        s1 = Shop.objects.create(
            name='Shop A', slug='shop-a', owner=self.user,
            address='A', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000003'
        )
        s2 = Shop.objects.create(
            name='Shop B', slug='shop-b', owner=self.user,
            address='B', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000004'
        )
        self.assertNotEqual(s1.public_id, s2.public_id)
