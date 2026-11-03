"""
Multi-tenant migratsiyalari (TZ_MULTITENANT Bosqich 0): subdomen backfill (shops 0019) va kategoriya egasi backfill
(categories 0005). Ma'lumot yo'qolmasligi, ikki restoranda ishlatilgan bo'lim bo'linishi, orqaga qaytarish.
"""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

SHOPS_BEFORE = ('shops', '0017_alter_shop_public_id_unique')
SHOPS_AFTER = ('shops', '0019_backfill_shop_subdomain')
CAT_BEFORE = ('categories', '0004_category_shop')
CAT_AFTER = ('categories', '0005_backfill_category_shop')
# 0005 backfill foydalanadigan ilovalarning o'sha paytdagi holati
SUPPORT = [('products', '0020_product_image_credit_import_batch'), ('notifications', '0006_soft_delete'),
           ('tables_restaurant', '0006_reservation_codes_and_arrived')]


def _migrate(targets):
    executor = MigrationExecutor(connection)
    executor.migrate(targets)
    executor = MigrationExecutor(connection)
    return executor.loader.project_state(targets).apps


def _restore_latest():
    executor = MigrationExecutor(connection)
    executor.loader.build_graph()
    executor.migrate(executor.loader.graph.leaf_nodes())


def _shop(apps, slug, **kw):
    Shop = apps.get_model('shops', 'Shop')
    return Shop.objects.create(name=slug.title(), slug=slug, address='A', phone='+998900000000', latitude=1, longitude=1, **kw)


class ShopSubdomainBackfillTests(TransactionTestCase):

    def test_subdomain_is_derived_from_slug_with_safe_fallbacks_and_is_reversible(self):
        old_apps = _migrate([SHOPS_BEFORE])
        try:
            ids = {slug: _shop(old_apps, slug).pk for slug in (
                'Registon_Lounge', 'ab', 'demo', 'dup-one', 'dup_one', 'тест', 'oddiy-restoran', 'x' * 45)}
            new_apps = _migrate([SHOPS_AFTER])
            Shop = new_apps.get_model('shops', 'Shop')
            got = {s.slug: (s.subdomain, s.business_type, s.status) for s in Shop.objects.filter(pk__in=ids.values())}

            self.assertEqual(got['Registon_Lounge'][0], 'registon-lounge')
            self.assertEqual(got['oddiy-restoran'][0], 'oddiy-restoran')
            self.assertEqual(got['dup-one'][0], 'dup-one')
            self.assertEqual(got['ab'][0], f"shop-{ids['ab']}")                  # juda qisqa
            self.assertEqual(got['demo'][0], f"shop-{ids['demo']}")              # band so'z
            self.assertEqual(got['dup_one'][0], f"shop-{ids['dup_one']}")        # 'dup-one' band
            self.assertEqual(got['тест'][0], f"shop-{ids['тест']}")              # lotin harfsiz
            self.assertEqual(len(got['x' * 45][0]), 40)                           # uzun slug 40 ga qisqartiriladi
            subdomains = [v[0] for v in got.values()]
            self.assertEqual(len(set(subdomains)), len(subdomains), 'subdomenlar noyob bo\'lishi shart')
            self.assertTrue(all(v[1:] == ('restaurant', 'active') for v in got.values()), 'standart tur/holat')

            # Qayta ishga tushirish xavfsiz (faqat NULL to'ldiriladi): ma'lumot o'zgarmaydi
            from importlib import import_module
            mod = import_module('shops.migrations.0019_backfill_shop_subdomain')
            mod.backfill_subdomains(new_apps, None)
            again = {s.slug: s.subdomain for s in Shop.objects.filter(pk__in=ids.values())}
            self.assertEqual({k: v[0] for k, v in got.items()}, again)

            # Orqaga qaytarish ishlaydi, do'konlar saqlanadi
            back = _migrate([SHOPS_BEFORE])
            self.assertEqual(back.get_model('shops', 'Shop').objects.filter(pk__in=ids.values()).count(), len(ids))
        finally:
            _restore_latest()


class CategoryShopBackfillTests(TransactionTestCase):

    def _setup_state(self):
        apps = _migrate([CAT_BEFORE] + SUPPORT)
        return apps, apps.get_model('categories', 'Category'), apps.get_model('products', 'Product')

    def _product(self, Product, shop, slug, category):
        return Product.objects.create(shop=shop, name=slug, slug=slug, price=1000, category=category)

    def test_shared_category_is_split_per_shop_without_losing_any_product(self):
        apps, Category, Product = self._setup_state()
        try:
            s1, s2, s3 = _shop(apps, 'resto-bir'), _shop(apps, 'resto-ikki'), _shop(apps, 'resto-uch')
            AppSetting = apps.get_model('notifications', 'AppSetting')
            AppSetting.objects.create(key='restaurant_default_shop', value=s2.slug, category='restaurant')

            shared = Category.objects.create(name='Salatlar', name_uz='Salatlar', name_ru='Салаты', icon='x', is_restaurant=True, sort_order=3,
                                       image='categories/salat.jpg')
            only1 = Category.objects.create(name='Faqat bir', name_uz='Faqat bir', name_ru='x', icon='x')
            unused = Category.objects.create(name='Ishlatilmagan', name_uz='Ishlatilmagan', name_ru='x', icon='x')
            via_shop = Category.objects.create(name='Restoranlar turi', name_uz='x', name_ru='x', icon='x')
            parent = Category.objects.create(name='Ota', name_uz='Ota', name_ru='x', icon='x')
            child = Category.objects.create(name='Bola', name_uz='Bola', name_ru='x', icon='x', parent=parent)
            type(s3).objects.filter(pk=s3.pk).update(category=via_shop)

            p1 = [self._product(Product, s1, f'p1-{i}', shared) for i in range(2)]      # s1 da 2 ta -> asl yozuv s1 da qoladi
            p2 = [self._product(Product, s2, 'p2-0', shared)]
            p3 = [self._product(Product, s3, 'p3-0', shared)]
            po = [self._product(Product, s1, 'po-0', only1)]
            pp = [self._product(Product, s1, 'pp-0', parent)]
            pc = [self._product(Product, s2, 'pc-0', child)]                              # bola s2 ga, ota s1 ga tushadi
            total_products = Product.objects.count()
            total_categories = Category.objects.count()

            apps = _migrate([CAT_AFTER] + SUPPORT)
            Category, Product = apps.get_model('categories', 'Category'), apps.get_model('products', 'Product')

            self.assertEqual(Product.objects.count(), total_products, "birorta taom yo'qolmadi")
            self.assertFalse(Category.objects.filter(shop__isnull=True).exists(), "egasiz bo'lim qolmadi")
            for pk, shop in [(p.pk, s1) for p in p1] + [(p.pk, s2) for p in p2] + [(p.pk, s3) for p in p3] + \
                            [(p.pk, s1) for p in po] + [(p.pk, s1) for p in pp] + [(p.pk, s2) for p in pc]:
                prod = Product.objects.get(pk=pk)
                self.assertEqual(prod.category.shop_id, shop.pk, f'{prod.slug}: taom o\'z restoranining bo\'limida bo\'lishi kerak')
                self.assertEqual(prod.shop_id, shop.pk)

            self.assertEqual(Category.objects.get(pk=shared.pk).shop_id, s1.pk, "eng ko'p taomi bor restoranda asl yozuv")
            copies = Category.objects.filter(name='Salatlar')
            self.assertEqual(sorted(copies.values_list('shop_id', flat=True)), sorted([s1.pk, s2.pk, s3.pk]))
            copy2 = copies.get(shop_id=s2.pk)
            self.assertEqual((copy2.name_ru, copy2.sort_order, copy2.is_restaurant), ('Салаты', 3, True), 'nusxa maydonlarni saqlaydi')
            self.assertEqual(copy2.image.name, 'categories/salat.jpg')

            self.assertEqual(Category.objects.get(pk=only1.pk).shop_id, s1.pk)
            self.assertEqual(Category.objects.get(pk=unused.pk).shop_id, s2.pk, "ishlatilmagan -> asosiy restoran (AppSetting slug)")
            self.assertEqual(Category.objects.get(pk=via_shop.pk).shop_id, s3.pk, "Shop.category orqali bog'langan -> o'sha do'kon")
            # Ota-bola turli restoranniki bo'lib qolmadi
            child_after = Category.objects.get(pk=child.pk)
            self.assertEqual(child_after.shop_id, s2.pk)
            self.assertEqual(child_after.parent.shop_id, s2.pk)
            self.assertEqual(child_after.parent.name, 'Ota')
            self.assertEqual(Category.objects.get(pk=parent.pk).shop_id, s1.pk)
            self.assertGreater(Category.objects.count(), total_categories)

            # Qayta ishga tushirish: yangi nusxa yaratilmaydi (faqat shop IS NULL qatorlar)
            from importlib import import_module
            count_before = Category.objects.count()
            import_module('categories.migrations.0005_backfill_category_shop').backfill(apps, None)
            self.assertEqual(Category.objects.count(), count_before)

            # Orqaga qaytarish xato bermaydi, ma'lumot saqlanadi
            back = _migrate([CAT_BEFORE] + SUPPORT)
            self.assertEqual(back.get_model('products', 'Product').objects.count(), total_products)
            self.assertEqual(back.get_model('categories', 'Category').objects.filter(name='Salatlar').count(), 3)
        finally:
            _restore_latest()

    def test_without_default_setting_falls_back_to_shop_with_tables_then_first_shop(self):
        apps, Category, Product = self._setup_state()
        try:
            s1, s2 = _shop(apps, 'avval'), _shop(apps, 'keyin')
            Hall, Table = apps.get_model('tables_restaurant', 'Hall'), apps.get_model('tables_restaurant', 'Table')
            hall = Hall.objects.create(shop=s2, name='Zal')
            Table.objects.create(shop=s2, hall=hall, number='1')
            orphan = Category.objects.create(name='Yetim', name_uz='Yetim', name_ru='x', icon='x')
            apps = _migrate([CAT_AFTER] + SUPPORT)
            self.assertEqual(apps.get_model('categories', 'Category').objects.get(pk=orphan.pk).shop_id, s2.pk, 'stollari bor do\'kon')
        finally:
            _restore_latest()

    def test_no_shops_at_all_is_a_safe_noop(self):
        apps, Category, Product = self._setup_state()
        try:
            cat = Category.objects.create(name='Yolg\'iz', name_uz='x', name_ru='x', icon='x')
            apps = _migrate([CAT_AFTER] + SUPPORT)
            self.assertIsNone(apps.get_model('categories', 'Category').objects.get(pk=cat.pk).shop_id)
        finally:
            _restore_latest()
