"""
Mehmon sayti animatsiya darajasi (`Shop.business_profile['guest_motion']`): standart `full` (javobda kalit yo'q),
admin sozlamasi, noto'g'ri qiymat, klassik dizayn va xodim sessiyasi, QR stol restorani, fasl bilan birga.
"""
import io

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from shops.guest_motion import DEFAULT_MOTION, MOTION_CHOICES, guest_motion_for_shop_id, normalize_motion
from shops.models import Shop
from web.test_spa_session import session_in


class MotionHelperTests(SimpleTestCase):

    def test_garbage_and_empty_values_mean_full(self):
        for value in (None, '', 'neon', '<script>', 'FULLL', 5, {}):
            self.assertEqual(normalize_motion(value), 'full')
        self.assertEqual(normalize_motion('  LIGHT '), 'light')
        self.assertEqual(normalize_motion('off'), 'off')

    def test_choices_are_the_documented_ones(self):
        self.assertEqual(MOTION_CHOICES, ('full', 'light', 'off'))
        self.assertEqual(DEFAULT_MOTION, 'full')

    def test_no_shop_means_no_key(self):
        self.assertEqual(guest_motion_for_shop_id(None), '')
        self.assertEqual(guest_motion_for_shop_id(0), '')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestMotionEndToEndTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Harakat Restorani', slug='harakat', owner='harakat-ega',
                     password='Harakat-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='harakat')
        self.owner = AdminUser.objects.get(username='harakat-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.owner_client = Client()
        self.owner_client.force_login(self.owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, **fields):
        return self.owner_client.patch(self.API, fields, content_type='application/json')

    def guest_session(self, client=None):
        return session_in((client or Client()).get('/menu/').content.decode())

    def test_default_is_full_and_the_session_is_unchanged(self):
        self.assertEqual(self.guest_session(), {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        self.assertEqual(self.owner_client.get(self.API).json()['guest_motion'], 'full')

    def test_light_and_off_reach_the_guest_page(self):
        for value in ('light', 'off'):
            self.assertEqual(self.patch(guest_motion=value).status_code, 200)
            self.assertEqual(self.owner_client.get(self.API).json()['guest_motion'], value)
            self.assertEqual(self.guest_session()['motion'], value)

    def test_full_removes_the_key_again(self):
        self.patch(guest_motion='off')
        self.patch(guest_motion='full')
        self.assertNotIn('motion', self.guest_session())

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for bad in ('neon', '<script>alert(1)</script>', 'ligth', '', 'a' * 50):
            res = self.patch(guest_motion=bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json().get('field'), 'guest_motion', bad)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_motion'], 'full')

    def test_season_and_motion_are_independent_and_come_together(self):
        self.patch(guest_season='qish', guest_motion='light')
        data = self.guest_session()
        self.assertEqual((data['season'], data['motion']), ('qish', 'light'))
        self.patch(guest_season='off')
        data = self.guest_session()
        self.assertNotIn('season', data)
        self.assertEqual(data['motion'], 'light')

    def test_classic_design_never_gets_motion(self):
        from notifications.models import AppSetting
        self.patch(guest_motion='off')
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        data = self.guest_session()
        self.assertEqual(data['design'], 'classic')
        self.assertNotIn('motion', data)

    def test_staff_session_has_no_motion(self):
        self.patch(guest_motion='off')
        data = session_in(self.owner_client.get('/menu/').content.decode())
        self.assertNotEqual(data['role'], 'guest')
        self.assertNotIn('motion', data)

    def test_waiter_cannot_change_motion(self):
        waiter = AdminUser.objects.create_user(username='harakat-ofitsiant', password='Ofitsiant-1', role='waiter',
                                               shop=self.shop, is_staff=True, is_approved=True)
        client = Client()
        client.force_login(waiter)
        res = client.patch(self.API, {'guest_motion': 'off'}, content_type='application/json')
        self.assertEqual(res.status_code, 403)
        self.assertNotIn('motion', self.guest_session())

    @override_settings(APPSETTING_CACHE_TTL=60)
    def test_change_is_visible_immediately_with_the_runtime_cache_on(self):
        self.patch(guest_motion='light')
        self.assertEqual(self.guest_session()['motion'], 'light')
        self.patch(guest_motion='off')
        self.assertEqual(self.guest_session()['motion'], 'off')
