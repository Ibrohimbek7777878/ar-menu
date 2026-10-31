"""S1-2 / S1-3: jarayon ichidagi AppSetting va asosiy restoran ID keshi (backend/runtime_cache.py)."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import Client, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from backend import runtime_cache
from backend.app_settings import get_bool, get_choice, get_int, set_setting
from notifications.admin_bot import default_restaurant_shop_id, get_restaurant_shop
from notifications.models import AppSetting
from shops.models import Shop

AdminUser = get_user_model()


def _settings_queries(captured):
    return [q for q in captured if 'app_settings' in q['sql']]


@override_settings(APPSETTING_CACHE_TTL=5)
class AppSettingCacheTests(TestCase):
    def setUp(self):
        runtime_cache.invalidate_runtime_cache()
        self.addCleanup(runtime_cache.invalidate_runtime_cache)

    def test_repeated_reads_hit_db_once(self):
        AppSetting.objects.create(key='guest_design', value='classic', category='ui')
        runtime_cache.invalidate_runtime_cache()
        with CaptureQueriesContext(connection) as ctx:
            for _ in range(5):
                self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'classic')
        self.assertEqual(len(_settings_queries(ctx.captured_queries)), 1)

    def test_different_helpers_share_one_snapshot(self):
        AppSetting.objects.create(key='kds_warn_minutes', value='7', category='kds')
        AppSetting.objects.create(key='some_flag', value='true', category='x')
        runtime_cache.invalidate_runtime_cache()
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120), 7)
            self.assertTrue(get_bool('some_flag'))
            self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')  # jadvalda yo'q -> standart
        self.assertEqual(len(_settings_queries(ctx.captured_queries)), 1)

    def test_missing_key_falls_back_to_django_setting(self):
        with override_settings(GUEST_DESIGN='classic'):
            self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'classic')

    def test_empty_value_row_beats_django_setting(self):
        # Eski xatti-harakat: qator bor (hatto bo'sh qiymat bilan) -> .env qiymati ishlatilmaydi
        AppSetting.objects.create(key='guest_design', value='', category='ui')
        with override_settings(GUEST_DESIGN='classic'):
            self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')

    def test_save_signal_invalidates_immediately(self):
        set_setting('guest_design', 'new')
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'new')
        set_setting('guest_design', 'classic')  # update_or_create -> post_save
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'classic')

    def test_delete_signal_invalidates(self):
        row = AppSetting.objects.create(key='guest_design', value='classic', category='ui')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'classic')
        row.delete()
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')

    def test_queryset_update_needs_explicit_invalidate(self):
        # QuerySet.update() signal bermaydi: admin_settings view invalidate_runtime_cache() ni o'zi chaqiradi
        AppSetting.objects.create(key='guest_design', value='new', category='ui')
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'new')
        AppSetting.objects.filter(key='guest_design').update(value='classic')
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'new')  # kesh hali eski (TTL ichida)
        runtime_cache.invalidate_runtime_cache()
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'classic')

    def test_returned_dict_is_a_copy(self):
        AppSetting.objects.create(key='a', value='1', category='x')
        runtime_cache.invalidate_runtime_cache()
        first = runtime_cache.get_app_settings()
        first['a'] = 'mutated'
        first['zzz'] = 'new'
        again = runtime_cache.get_app_settings()
        self.assertEqual(again.get('a'), '1')
        self.assertNotIn('zzz', again)

    def test_ttl_expiry_refreshes(self):
        AppSetting.objects.create(key='a', value='1', category='x')
        runtime_cache.invalidate_runtime_cache()
        self.assertEqual(runtime_cache.get_app_setting('a'), '1')
        AppSetting.objects.filter(key='a').update(value='2')
        self.assertEqual(runtime_cache.get_app_setting('a'), '1')
        runtime_cache._settings_snapshot = (0.0, runtime_cache._settings_snapshot[1])  # muddati o'tdi
        self.assertEqual(runtime_cache.get_app_setting('a'), '2')

    def test_invalidation_during_load_does_not_store_stale_data(self):
        AppSetting.objects.create(key='a', value='old', category='x')
        runtime_cache.invalidate_runtime_cache()
        original_loader = runtime_cache._load_app_settings

        def racing_loader():
            data = original_loader()
            AppSetting.objects.filter(key='a').update(value='new')
            runtime_cache.invalidate_runtime_cache()  # yuklash paytida boshqa oqim bekor qildi
            return data

        runtime_cache._load_app_settings = racing_loader
        try:
            runtime_cache.get_app_setting('a')
        finally:
            runtime_cache._load_app_settings = original_loader
        self.assertIsNone(runtime_cache._settings_snapshot)
        self.assertEqual(runtime_cache.get_app_setting('a'), 'new')


class AppSettingCacheDisabledTests(TestCase):
    """TTL=0 (testlar standarti va bayroq o'chiq holati): har chaqiruvda DB, eski xatti-harakat."""

    def test_default_in_tests_is_off(self):
        from django.conf import settings
        self.assertEqual(settings.APPSETTING_CACHE_TTL, 0)
        self.assertFalse(runtime_cache.runtime_cache_enabled())

    def test_reads_always_hit_db(self):
        AppSetting.objects.create(key='guest_design', value='classic', category='ui')
        AppSetting.objects.filter(key='guest_design').update(value='new')  # signalsiz o'zgarish darhol ko'rinadi
        self.assertEqual(get_choice('guest_design', 'x', ('new', 'classic')), 'new')
        with CaptureQueriesContext(connection) as ctx:
            get_choice('guest_design', 'x', ('new', 'classic'))
            get_choice('guest_design', 'x', ('new', 'classic'))
        self.assertEqual(len(_settings_queries(ctx.captured_queries)), 2)


@override_settings(APPSETTING_CACHE_TTL=5)
class DefaultShopIdCacheTests(TestCase):
    def setUp(self):
        runtime_cache.invalidate_runtime_cache()
        self.addCleanup(runtime_cache.invalidate_runtime_cache)
        owner = AdminUser.objects.create_user(username='rc_owner', password='x12345678', role='shop_owner', is_approved=True)
        self.a = Shop.objects.create(name='A', slug='rc-a', owner=owner, address='x', latitude=40.4, longitude=68.7, is_open=True, phone='+998901112233')
        owner2 = AdminUser.objects.create_user(username='rc_owner2', password='x12345678', role='shop_owner', is_approved=True)
        self.b = Shop.objects.create(name='B', slug='rc-b', owner=owner2, address='y', latitude=40.4, longitude=68.7, is_open=True, phone='+998901112244')

    def test_id_cached_and_lookup_is_single_pk_query(self):
        set_setting('restaurant_default_shop', 'rc-b')
        self.assertEqual(default_restaurant_shop_id(), self.b.id)
        with CaptureQueriesContext(connection) as ctx:
            shop = get_restaurant_shop()
            self.assertEqual(shop.id, self.b.id)
            self.assertEqual(default_restaurant_shop_id(), self.b.id)
        self.assertEqual(len(ctx.captured_queries), 1)  # faqat Shop PK
        self.assertEqual(len(_settings_queries(ctx.captured_queries)), 0)

    def test_admin_changes_default_shop_visible_immediately_in_same_process(self):
        set_setting('restaurant_default_shop', 'rc-a')
        self.assertEqual(get_restaurant_shop().id, self.a.id)
        set_setting('restaurant_default_shop', 'rc-b')
        self.assertEqual(get_restaurant_shop().id, self.b.id)

    def test_deleted_shop_falls_back_to_full_lookup(self):
        set_setting('restaurant_default_shop', 'rc-b')
        self.assertEqual(get_restaurant_shop().id, self.b.id)
        # signalsiz o'chirish (boshqa worker): kesh eskirgan, lekin natija noto'g'ri bo'lmasligi shart
        Shop.objects.filter(id=self.b.id)._raw_delete(using='default')
        shop = get_restaurant_shop()
        self.assertIsNotNone(shop)
        self.assertNotEqual(shop.id, self.b.id)

    def test_shop_change_invalidates(self):
        set_setting('restaurant_default_shop', 'rc-a')
        self.assertEqual(default_restaurant_shop_id(), self.a.id)
        self.a.delete()  # post_delete signali
        self.assertNotEqual(default_restaurant_shop_id(), self.a.id)

    def test_cached_shop_instance_is_never_shared(self):
        set_setting('restaurant_default_shop', 'rc-a')
        s1 = get_restaurant_shop()
        s2 = get_restaurant_shop()
        self.assertIsNot(s1, s2)  # har chaqiruv yangi nusxa: umumiy o'zgaruvchan obyekt yo'q


@override_settings(APPSETTING_CACHE_TTL=5, ALLOWED_HOSTS=['*'])
class MenuQueryBudgetTests(TestCase):
    """`/menu/` va menyu API 304 yo'li uchun SQL byudjeti (oldin: /menu/ 4 SQL; 304 da DB bor edi)."""

    def setUp(self):
        cache.clear()
        runtime_cache.invalidate_runtime_cache()
        self.addCleanup(runtime_cache.invalidate_runtime_cache)
        owner = AdminUser.objects.create_user(username='rc_owner3', password='x12345678', role='shop_owner', is_approved=True)
        self.shop = Shop.objects.create(name='Byudjet', slug='rc-budget', owner=owner, address='x', latitude=40.4, longitude=68.7, is_open=True, phone='+998901112255')
        set_setting('restaurant_default_shop', 'rc-budget')

    def test_menu_page_settings_queries_collapsed(self):
        c = Client()
        c.get('/menu/')  # isitish: kesh to'ladi
        with CaptureQueriesContext(connection) as ctx:
            resp = c.get('/menu/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(_settings_queries(ctx.captured_queries)), 0, [q['sql'][:80] for q in ctx.captured_queries])
        self.assertLessEqual(len(ctx.captured_queries), 1, [q['sql'][:100] for q in ctx.captured_queries])

    def test_menu_api_304_path_has_zero_sql(self):
        """S1-3: ETag mos kelsa javob DB'siz (restoran ID si jarayon keshidan, versiya Django keshidan)."""
        c = Client()
        first = c.get('/api/v1/restaurant/menu/')
        self.assertEqual(first.status_code, 200)
        etag = first['ETag']
        self.assertRegex(etag, r'^W/"menu-v\d+-s%d"$' % self.shop.id)  # ETag matni o'zgarmagan
        with CaptureQueriesContext(connection) as ctx:
            resp = c.get('/api/v1/restaurant/menu/', HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(resp.status_code, 304)
        self.assertEqual(resp['ETag'], etag)
        self.assertEqual(len(ctx.captured_queries), 0, [q['sql'][:100] for q in ctx.captured_queries])

    def test_menu_api_200_from_cache_has_zero_sql(self):
        c = Client()
        c.get('/api/v1/restaurant/menu/')
        with CaptureQueriesContext(connection) as ctx:
            resp = c.get('/api/v1/restaurant/menu/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(ctx.captured_queries), 0, [q['sql'][:100] for q in ctx.captured_queries])

    def test_etag_changes_when_dish_changes_and_304_stops(self):
        from decimal import Decimal
        from products.models import Product
        c = Client()
        etag = c.get('/api/v1/restaurant/menu/')['ETag']
        Product.objects.create(shop=self.shop, name='Yangi', slug='rc-yangi', price=Decimal('1000'), is_available=True)
        resp = c.get('/api/v1/restaurant/menu/', HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(resp.status_code, 200)
        self.assertNotEqual(resp['ETag'], etag)
        self.assertEqual([p['name'] for p in resp.json()['products']], ['Yangi'])
