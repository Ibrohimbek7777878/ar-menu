"""
Mehmon sayti fasl rangi (`Shop.business_profile['guest_season']`): standart o'chiq, admin sozlamasi, oyga qarab `auto`,
QR stol restorani, klassik dizayn va xodim sessiyasi, keshlash.
"""
import io
from datetime import datetime, timezone as dt_timezone
from unittest import mock

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import cached_shop_value, invalidate_runtime_cache
from shops.guest_season import SEASON_CHOICES, normalize_season, resolve_season
from shops.models import Shop
from web.test_spa_session import session_in


class SeasonHelperTests(SimpleTestCase):

    def test_garbage_and_empty_values_mean_off(self):
        for value in (None, '', 'neon', '<script>', 'KUZZ', 5, {}):
            self.assertEqual(normalize_season(value), 'off')
        self.assertEqual(normalize_season('  QISH '), 'qish')

    def test_off_and_explicit_seasons(self):
        self.assertEqual(resolve_season('off'), '')
        self.assertEqual(resolve_season(None), '')
        for season in ('kuz', 'qish', 'bahor', 'yoz'):
            self.assertEqual(resolve_season(season), season)

    def test_auto_follows_the_month(self):
        expected = {12: 'qish', 1: 'qish', 2: 'qish', 3: 'bahor', 4: 'bahor', 5: 'bahor',
                    6: 'yoz', 7: 'yoz', 8: 'yoz', 9: 'kuz', 10: 'kuz', 11: 'kuz'}
        for month, season in expected.items():
            now = datetime(2026, month, 15, 12, 0, tzinfo=dt_timezone.utc)
            self.assertEqual(resolve_season('auto', now), season, f'{month}-oy')

    def test_auto_uses_tashkent_time_not_utc(self):
        # 30-noyabr 20:00 UTC = Toshkentda 1-dekabr 01:00 -> qish (UTC bo'yicha hali kuz bo'lardi)
        now = datetime(2026, 11, 30, 20, 0, tzinfo=dt_timezone.utc)
        self.assertEqual(resolve_season('auto', now), 'qish')

    def test_choices_are_the_documented_ones(self):
        self.assertEqual(SEASON_CHOICES, ('off', 'auto', 'kuz', 'qish', 'bahor', 'yoz'))


class CachedShopValueTests(SimpleTestCase):

    def setUp(self):
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def test_resolver_runs_once_within_ttl_and_again_after_invalidation(self):
        calls = []
        resolver = lambda: calls.append(1) or 'qish'  # noqa: E731
        with override_settings(APPSETTING_CACHE_TTL=60):
            self.assertEqual(cached_shop_value(7, 'guest_season', resolver), 'qish')
            self.assertEqual(cached_shop_value(7, 'guest_season', resolver), 'qish')
            self.assertEqual(len(calls), 1)
            invalidate_runtime_cache()
            cached_shop_value(7, 'guest_season', resolver)
            self.assertEqual(len(calls), 2)

    def test_cache_off_means_every_call_hits_the_resolver(self):
        calls = []
        with override_settings(APPSETTING_CACHE_TTL=0):
            for _ in range(3):
                cached_shop_value(7, 'guest_season', lambda: calls.append(1))
        self.assertEqual(len(calls), 3)

    def test_owners_do_not_share_values(self):
        with override_settings(APPSETTING_CACHE_TTL=60):
            self.assertEqual(cached_shop_value(1, 'k', lambda: 'a'), 'a')
            self.assertEqual(cached_shop_value(2, 'k', lambda: 'b'), 'b')
            self.assertEqual(cached_shop_value(('table', 'x'), 'k', lambda: None), None)


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestSeasonEndToEndTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Fasl Restorani', slug='fasl', owner='fasl-ega',
                     password='Fasl-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='fasl')
        self.owner = AdminUser.objects.get(username='fasl-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.owner_client = Client()
        self.owner_client.force_login(self.owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def set_season(self, value):
        return self.owner_client.patch(self.API, {'guest_season': value}, content_type='application/json')

    def guest_session(self, client=None):
        return session_in((client or Client()).get('/menu/').content.decode())

    # ── standart: o'chiq, javob avvalgidek ──
    def test_default_is_off_and_the_session_is_unchanged(self):
        self.assertEqual(self.guest_session(), {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        self.assertEqual(self.owner_client.get(self.API).json()['guest_season'], 'off')

    # ── admin sozlamasi ──
    def test_owner_setting_reaches_the_guest_page(self):
        self.assertEqual(self.set_season('qish').status_code, 200)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_season'], 'qish')
        self.assertEqual(self.guest_session()['season'], 'qish')

    def test_switching_back_to_off_removes_the_key(self):
        self.set_season('bahor')
        self.set_season('off')
        self.assertNotIn('season', self.guest_session())

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for bad in ('neon', '<script>alert(1)</script>', 'kuzz', '', 'a' * 50):
            res = self.set_season(bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json().get('field'), 'guest_season', bad)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_season'], 'off')

    def test_waiter_cannot_change_the_season(self):
        waiter = AdminUser.objects.create_user(username='fasl-ofitsiant', password='Ofitsiant-1', role='waiter',
                                               shop=self.shop, is_staff=True, is_approved=True)
        client = Client()
        client.force_login(waiter)
        res = client.patch(self.API, {'guest_season': 'yoz'}, content_type='application/json')
        self.assertEqual(res.status_code, 403)
        self.assertNotIn('season', self.guest_session())

    # ── auto ──
    def test_auto_follows_the_current_month(self):
        self.set_season('auto')
        with mock.patch('django.utils.timezone.now', return_value=datetime(2026, 7, 15, 12, 0, tzinfo=dt_timezone.utc)):
            self.assertEqual(self.guest_session()['season'], 'yoz')
        with mock.patch('django.utils.timezone.now', return_value=datetime(2026, 1, 10, 12, 0, tzinfo=dt_timezone.utc)):
            self.assertEqual(self.guest_session()['season'], 'qish')

    # ── klassik dizayn va xodim sessiyasi fasl olmaydi ──
    def test_classic_design_never_gets_a_season(self):
        from notifications.models import AppSetting
        self.set_season('qish')
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        data = self.guest_session()
        self.assertEqual(data['design'], 'classic')
        self.assertNotIn('season', data)

    def test_staff_session_has_no_season(self):
        self.set_season('qish')
        data = session_in(self.owner_client.get('/menu/').content.decode())
        self.assertNotEqual(data['role'], 'guest')
        self.assertNotIn('season', data)

    # ── QR stol restorani ──
    def test_table_of_another_restaurant_uses_that_restaurants_season(self):
        from notifications.models import AppSetting
        from tables_restaurant.models import Table
        call_command('create_restaurant', name='Ikkinchi', slug='ikkinchi', owner='ikkinchi-ega',
                     password='Ikkinchi-parol-1', tables=2, stdout=io.StringIO())
        other = Shop.objects.get(slug='ikkinchi')
        AppSetting.objects.update_or_create(key='restaurant_default_shop', defaults={'value': 'fasl', 'category': 'guest'})
        other.business_profile = {**(other.business_profile or {}), 'guest_season': 'yoz'}
        other.save(update_fields=['business_profile'])
        self.set_season('qish')  # asosiy restoran: qish

        self.assertEqual(self.guest_session()['season'], 'qish')
        table = Table.objects.filter(shop=other, is_active=True).first()
        client = Client()
        session = client.session
        session['tma_table_token'] = str(table.qr_token)
        session.save()
        self.assertEqual(self.guest_session(client)['season'], 'yoz')

    def test_unknown_table_token_falls_back_to_the_default_restaurant(self):
        self.set_season('bahor')
        client = Client()
        session = client.session
        session['tma_table_token'] = '00000000-0000-0000-0000-000000000000'
        session.save()
        self.assertEqual(self.guest_session(client)['season'], 'bahor')

    # ── kesh yoqilganda ham o'zgarish ko'rinadi ──
    @override_settings(APPSETTING_CACHE_TTL=60)
    def test_change_is_visible_immediately_with_the_runtime_cache_on(self):
        self.set_season('qish')
        self.assertEqual(self.guest_session()['season'], 'qish')
        self.set_season('bahor')
        self.assertEqual(self.guest_session()['season'], 'bahor')
