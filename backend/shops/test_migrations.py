import uuid
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class ShopPublicIdMigrationTests(TransactionTestCase):
    def test_migration_0014_to_0017_with_multiple_shops(self):
        executor = MigrationExecutor(connection)
        # Migrate backward to 0014
        executor.migrate([('shops', '0014_widen_template_slugs')])
        old_apps = executor.loader.project_state([('shops', '0014_widen_template_slugs')]).apps
        Shop = old_apps.get_model('shops', 'Shop')

        # Create 3 shops in 0014 state
        s1 = Shop.objects.create(
            name='Shop 1', slug='shop-1', address='A 1', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000001'
        )
        s2 = Shop.objects.create(
            name='Shop 2', slug='shop-2', address='A 2', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000002'
        )
        s3 = Shop.objects.create(
            name='Shop 3', slug='shop-3', address='A 3', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000003'
        )

        try:
            # Migrate forward to 0017
            executor.loader.build_graph()
            executor.migrate([('shops', '0017_alter_shop_public_id_unique')])

            new_apps = executor.loader.project_state([('shops', '0017_alter_shop_public_id_unique')]).apps
            NewShop = new_apps.get_model('shops', 'Shop')
            shops = list(NewShop.objects.filter(id__in=[s1.id, s2.id, s3.id]))
            uuids = [s.public_id for s in shops]

            self.assertEqual(len(uuids), 3)
            self.assertTrue(all(u is not None for u in uuids))
            self.assertEqual(len(set(uuids)), 3, "Har bir do'konning public_id si unikal bo'lishi shart")
        finally:
            # Ensure database is returned to latest migrations
            executor.loader.build_graph()
            executor.migrate(executor.loader.graph.leaf_nodes())

    def test_migration_0015_duplicate_uuids_resolved_by_0016_to_0017(self):
        executor = MigrationExecutor(connection)
        # Migrate backward to 0015
        executor.migrate([('shops', '0015_shop_public_id')])
        old_apps = executor.loader.project_state([('shops', '0015_shop_public_id')]).apps
        Shop = old_apps.get_model('shops', 'Shop')

        # Create 3 shops in 0015 state with the EXACT SAME public_id
        shared_uuid = uuid.uuid4()
        s1 = Shop.objects.create(
            name='Dup Shop 1', slug='dup-shop-1', address='A 1', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000011', public_id=shared_uuid
        )
        s2 = Shop.objects.create(
            name='Dup Shop 2', slug='dup-shop-2', address='A 2', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000012', public_id=shared_uuid
        )
        s3 = Shop.objects.create(
            name='Dup Shop 3', slug='dup-shop-3', address='A 3', latitude=40.0, longitude=68.0, is_open=True, phone='+998900000013', public_id=shared_uuid
        )

        try:
            # Migrate forward to 0017
            executor.loader.build_graph()
            executor.migrate([('shops', '0017_alter_shop_public_id_unique')])

            new_apps = executor.loader.project_state([('shops', '0017_alter_shop_public_id_unique')]).apps
            NewShop = new_apps.get_model('shops', 'Shop')
            shops = list(NewShop.objects.filter(id__in=[s1.id, s2.id, s3.id]))
            uuids = [s.public_id for s in shops]

            self.assertEqual(len(uuids), 3)
            self.assertTrue(all(u is not None for u in uuids))
            self.assertEqual(len(set(uuids)), 3, "0016 takroriy public_id'larni bartaraf qilib, har biriga noyob uuid berishi shart")
            self.assertIn(shared_uuid, uuids, "Kamida bitta (birinchi) do'kon o'zining asl UUID qiymatini saqlashi kerak")
        finally:
            executor.loader.build_graph()
            executor.migrate(executor.loader.graph.leaf_nodes())
