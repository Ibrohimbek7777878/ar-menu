"""Migratsiya 0019 (taom tarjimalari): mavjud qatorlarga zarar bermaydi (bo'sh qiymat) va orqaga qaytariladi."""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

BEFORE = ('products', '0018_product_has_real_photo_product_prep_minutes')
AFTER = ('products', '0019_product_translations_ru_en')
NEW_COLUMNS = {'name_ru', 'name_en', 'description_ru', 'description_en'}


def _columns():
    with connection.cursor() as cursor:
        return {c.name for c in connection.introspection.get_table_description(cursor, 'products')}


class ProductTranslationMigrationTests(TransactionTestCase):
    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_existing_rows_survive_forward_and_backward(self):
        executor = MigrationExecutor(connection)
        shops_leaf = executor.loader.graph.leaf_nodes('shops')[0]
        executor.migrate([BEFORE])
        self.assertFalse(NEW_COLUMNS & _columns(), '0018 holatida tarjima ustunlari bo\'lmasligi kerak')

        apps = executor.loader.project_state([BEFORE, shops_leaf]).apps
        Shop = apps.get_model('shops', 'Shop')
        Product = apps.get_model('products', 'Product')
        shop = Shop.objects.create(name='Mig Shop', slug='mig-shop', address='A 1', latitude=40.0, longitude=68.0, is_open=True,
                                   phone='+998900000099')
        old = Product.objects.create(shop=shop, name='Eski taom', slug='mig-eski', price=12000, description="Eski tavsif")

        # oldinga: yangi ustunlar bor, eski qator bo'sh qiymat bilan, boshqa maydonlari o'zgarmagan
        executor = MigrationExecutor(connection)
        executor.migrate([AFTER])
        self.assertTrue(NEW_COLUMNS <= _columns())
        apps = executor.loader.project_state([AFTER, shops_leaf]).apps
        row = apps.get_model('products', 'Product').objects.get(pk=old.pk)
        self.assertEqual((row.name, row.description, int(row.price)), ('Eski taom', 'Eski tavsif', 12000))
        self.assertEqual((row.name_ru, row.name_en, row.description_ru, row.description_en), ('', '', '', ''))
        row.name_ru = 'Старое блюдо'
        row.save()

        # orqaga: ustunlar olib tashlanadi, taom qoladi
        executor = MigrationExecutor(connection)
        executor.migrate([BEFORE])
        self.assertFalse(NEW_COLUMNS & _columns())
        apps = executor.loader.project_state([BEFORE, shops_leaf]).apps
        row = apps.get_model('products', 'Product').objects.get(pk=old.pk)
        self.assertEqual((row.name, row.description), ('Eski taom', 'Eski tavsif'))
