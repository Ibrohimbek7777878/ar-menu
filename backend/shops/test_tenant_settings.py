"""
Restoranga oid sozlamalar (shops/tenant_settings.py + backend/app_settings.py), tenant bo'yicha tezlik chegarasi va
`create_restaurant --subdomain/--business-type` (TZ_MULTITENANT Bosqich 0).
"""
import io

from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import RequestFactory, TestCase, override_settings

from backend.app_settings import get_bool, get_choice, get_int
from backend.ratelimit import rate_limited
from notifications.models import AppSetting
from shops.models import Shop
from shops.tenancy import tenant_base_url, use_tenant
from shops.test_tenant_kit import make_tenant, tenant_settings


class ShopAwareSettingsTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.a = make_tenant('alfa', 'ALFA')
        cls.b = make_tenant('bravo', 'BRAVO')
        Shop.objects.filter(pk=cls.a.shop.pk).update(business_profile={
            'guest_design': 'classic', 'kds_warn_minutes': 3, 'kds_late_minutes': 7, 'bot_scope': 'all', 'guest_api': 'false'})
        cls.a.shop.refresh_from_db()
        cls.b.shop.refresh_from_db()

    def test_shop_value_wins_over_global_for_choice_and_int(self):
        AppSetting.objects.create(key='guest_design', value='new', category='x')
        AppSetting.objects.create(key='kds_warn_minutes', value='12', category='x')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic'), shop=self.a.shop), 'classic')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic'), shop=self.b.shop), 'new')       # B: global zaxira
        self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120, shop=self.a.shop), 3)
        self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120, shop=self.b.shop), 12)
        self.assertEqual(get_int('kds_late_minutes', 20, 2, 240, shop=self.a.shop), 7)
        self.assertEqual(get_int('kds_late_minutes', 20, 2, 240, shop=self.b.shop), 20)                         # na global, na restoran: standart

    def test_without_shop_and_tenant_the_old_behaviour_is_unchanged(self):
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')
        AppSetting.objects.create(key='guest_design', value='classic', category='x')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'classic')
        AppSetting.objects.filter(key='guest_design').update(value='noma\'lum')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')
        self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120), 10)
        self.assertEqual(get_bool('guest_api', True), True)

    def test_current_tenant_is_used_implicitly_for_scoped_keys(self):
        with use_tenant(self.a.shop):
            self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'classic')
            self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120), 3)
            self.assertEqual(get_choice('bot_scope', 'restaurant', ('restaurant', 'all')), 'all')
        with use_tenant(self.b.shop):
            self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic')), 'new')
            self.assertEqual(get_choice('bot_scope', 'restaurant', ('restaurant', 'all')), 'restaurant')

    def test_platform_level_keys_ignore_the_shop_profile_unless_a_shop_is_passed_explicitly(self):
        """`guest_api` restoranga oid kalit emas (platforma o'chirgichi): tenant profilidagi qiymat uni o'chira olmaydi."""
        with use_tenant(self.a.shop):
            self.assertTrue(get_bool('guest_api', True))
        self.assertFalse(get_bool('guest_api', True, shop=self.a.shop))          # aniq so'ralsa o'qiladi

    def test_invalid_shop_value_falls_back_to_global_not_to_a_broken_site(self):
        Shop.objects.filter(pk=self.b.shop.pk).update(business_profile={'guest_design': 'zzz', 'kds_warn_minutes': 'abc'})
        self.b.shop.refresh_from_db()
        AppSetting.objects.create(key='guest_design', value='classic', category='x')
        AppSetting.objects.create(key='kds_warn_minutes', value='9', category='x')
        self.assertEqual(get_choice('guest_design', 'new', ('new', 'classic'), shop=self.b.shop), 'classic')
        self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120, shop=self.b.shop), 9)

    def test_int_is_clamped(self):
        Shop.objects.filter(pk=self.b.shop.pk).update(business_profile={'kds_warn_minutes': 99999})
        self.b.shop.refresh_from_db()
        self.assertEqual(get_int('kds_warn_minutes', 10, 1, 120, shop=self.b.shop), 120)

    def test_spa_session_reads_kds_timers_and_design_per_restaurant(self):
        from web.restaurant_auth import spa_session
        AppSetting.objects.create(key='guest_design', value='new', category='x')
        request = RequestFactory().get('/')
        request.user = self.a.owner
        with tenant_settings(), use_tenant(self.a.shop):
            payload = spa_session(request)
        self.assertEqual(payload['design'], 'classic')
        self.assertEqual(payload['config'], {'kds_warn_minutes': 3, 'kds_late_minutes': 7})
        request = RequestFactory().get('/')
        request.user = self.b.owner
        with tenant_settings(), use_tenant(self.b.shop):
            payload = spa_session(request)
        self.assertEqual(payload['design'], 'new')
        self.assertEqual(payload['config'], {'kds_warn_minutes': 10, 'kds_late_minutes': 20})

    def test_guest_session_design_comes_from_the_restaurant_profile(self):
        Shop.objects.filter(pk=self.a.shop.pk).update(business_profile={'guest_design': 'classic'})
        client = self.client
        with tenant_settings():
            resp_a = client.get('/api/guest/v1/session/', HTTP_HOST=self.a.host)
            resp_b = client.get('/api/guest/v1/session/', HTTP_HOST=self.b.host)
        self.assertEqual(resp_a.json()['session']['design'], 'classic')
        self.assertEqual(resp_b.json()['session']['design'], 'new')

    def test_bot_scope_is_read_per_shop_in_the_keyboard(self):
        from web.telegram_webhook import get_menu_markup
        flat = lambda m: [b.get('text') for row in m['inline_keyboard'] for b in row]   # noqa: E731
        markup_a = get_menu_markup('https://x.test', shop=self.a.shop)       # bot_scope=all
        markup_b = get_menu_markup('https://x.test', shop=self.b.shop)       # standart: restaurant
        self.assertGreater(len(flat(markup_a)), len(flat(markup_b)))


class TenantRateLimitKeyTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.a = make_tenant('alfa', 'ALFA')
        cls.b = make_tenant('bravo', 'BRAVO')

    def setUp(self):
        cache.clear()

    def test_rate_limit_bucket_is_per_tenant(self):
        request = RequestFactory().get('/x', REMOTE_ADDR='203.0.113.9')
        with use_tenant(self.a.shop):
            self.assertIsNone(rate_limited(request, 'probe', limit=2, seconds=60))
            self.assertIsNone(rate_limited(request, 'probe', limit=2, seconds=60))
            self.assertEqual(rate_limited(request, 'probe', limit=2, seconds=60).status_code, 429)
        with use_tenant(self.b.shop):
            self.assertIsNone(rate_limited(request, 'probe', limit=2, seconds=60), "B tenanti A ning chegarasiga tushmaydi")

    def test_rate_limit_key_is_unchanged_without_a_tenant(self):
        request = RequestFactory().get('/x', REMOTE_ADDR='203.0.113.10')
        self.assertIsNone(rate_limited(request, 'probe2', limit=1, seconds=60))
        self.assertEqual(rate_limited(request, 'probe2', limit=1, seconds=60).status_code, 429)
        self.assertIsNotNone(cache.get('ratelimit:probe2:203.0.113.10'))

    def test_guest_api_throttle_bucket_is_per_tenant(self):
        from web.guest_api import _throttled
        request = RequestFactory().get('/x', REMOTE_ADDR='203.0.113.11')
        with override_settings(GUEST_API_RATE_LIMIT=1):
            with use_tenant(self.a.shop):
                self.assertFalse(_throttled(request))
                self.assertTrue(_throttled(request))
            with use_tenant(self.b.shop):
                self.assertFalse(_throttled(request))


class CreateRestaurantTenantArgsTests(TestCase):

    def _create(self, **kw):
        base = dict(name='Bahor Cafe', owner='bahor_ega', password='Bahor-Parol-123!', tables=2, stdout=io.StringIO())
        base.update(kw)
        call_command('create_restaurant', **base)
        return Shop.objects.get(slug=base.get('slug') or 'bahor-cafe')

    def test_subdomain_and_business_type_are_saved(self):
        shop = self._create(subdomain='Bahor', business_type='cafe')
        self.assertEqual((shop.subdomain, shop.business_type, shop.status), ('bahor', 'cafe', 'active'))

    def test_subdomain_defaults_from_slug_and_type_defaults_to_restaurant(self):
        shop = self._create()
        self.assertEqual((shop.subdomain, shop.business_type), ('bahor-cafe', 'restaurant'))

    def test_invalid_reserved_or_taken_subdomain_is_an_error(self):
        for bad in ('admin', 'a', 'ab_c'):
            with self.assertRaises(CommandError, msg=bad):
                self._create(subdomain=bad, owner=f'e-{bad}')
        self._create(subdomain='bahor')
        with self.assertRaises(CommandError):
            self._create(name='Boshqa', slug='boshqa', owner='boshqa_ega', subdomain='bahor')

    def test_invalid_business_type_is_rejected(self):
        with self.assertRaises(CommandError):
            self._create(business_type='hotel')

    def test_existing_parameters_still_work_unchanged(self):
        shop = self._create(slug='eski-uslub', name='Eski uslub', owner='eski_ega', no_default=True)
        self.assertEqual(shop.slug, 'eski-uslub')
        self.assertEqual(shop.table_count if hasattr(shop, 'table_count') else shop.restaurant_tables.count(), 2)


class TenantBaseUrlTests(TestCase):

    def test_tenant_base_url(self):
        shop = make_tenant('alfa', 'ALFA').shop
        with tenant_settings():
            self.assertEqual(tenant_base_url(shop), 'https://alfa.platform.test')
            self.assertEqual(tenant_base_url(shop, 'http'), 'http://alfa.platform.test')
        with override_settings(PLATFORM_DOMAIN=''):
            self.assertIsNone(tenant_base_url(shop))
        shop.subdomain = None
        with tenant_settings():
            self.assertIsNone(tenant_base_url(shop))
