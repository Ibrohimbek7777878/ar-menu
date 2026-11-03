"""Taom oynasi sozlamasi (`Shop.business_profile['guest_dish_sheet']`): standart `on` (javobda kalit yo'q), admin sozlamasi,
noto'g'ri qiymat, klassik dizayn va xodim huquqi."""
import io

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from shops.guest_dish_sheet import DEFAULT_DISH_SHEET, DISH_SHEET_CHOICES, guest_dish_sheet_for_shop_id, normalize_dish_sheet
from shops.models import Shop
from web.test_spa_session import session_in


class DishSheetHelperTests(SimpleTestCase):
    def test_garbage_means_on(self):
        for value in (None, '', 'maybe', '<script>', 5, {}):
            self.assertEqual(normalize_dish_sheet(value), 'on')
        self.assertEqual(normalize_dish_sheet(' OFF '), 'off')
        self.assertEqual((DISH_SHEET_CHOICES, DEFAULT_DISH_SHEET), (('on', 'off'), 'on'))

    def test_no_shop_means_no_key(self):
        self.assertEqual(guest_dish_sheet_for_shop_id(None), '')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class DishSheetEndToEndTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Oyna Restorani', slug='oyna-s', owner='oyna-s-ega',
                     password='Oyna-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='oyna-s')
        self.owner = AdminUser.objects.get(username='oyna-s-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.owner_client = Client()
        self.owner_client.force_login(self.owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, **fields):
        return self.owner_client.patch(self.API, fields, content_type='application/json')

    def guest_session(self):
        return session_in(Client().get('/menu/').content.decode())

    def test_default_is_on_and_the_session_is_unchanged(self):
        self.assertEqual(self.guest_session(), {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        self.assertEqual(self.owner_client.get(self.API).json()['guest_dish_sheet'], 'on')

    def test_off_reaches_the_guest_page_and_on_removes_the_key(self):
        self.assertEqual(self.patch(guest_dish_sheet='off').status_code, 200)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_dish_sheet'], 'off')
        self.assertEqual(self.guest_session()['dishSheet'], 'off')
        self.patch(guest_dish_sheet='on')
        self.assertNotIn('dishSheet', self.guest_session())

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for bad in ('maybe', '<script>', '', 'a' * 50):
            res = self.patch(guest_dish_sheet=bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json().get('field'), 'guest_dish_sheet', bad)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_dish_sheet'], 'on')

    def test_classic_design_never_gets_the_key(self):
        from notifications.models import AppSetting
        self.patch(guest_dish_sheet='off')
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        self.assertNotIn('dishSheet', self.guest_session())

    def test_waiter_cannot_change_it(self):
        waiter = AdminUser.objects.create_user(username='oyna-s-ofitsiant', password='Ofitsiant-1', role='waiter',
                                               shop=self.shop, is_staff=True, is_approved=True)
        client = Client()
        client.force_login(waiter)
        self.assertEqual(client.patch(self.API, {'guest_dish_sheet': 'off'}, content_type='application/json').status_code, 403)
        self.assertNotIn('dishSheet', self.guest_session())
