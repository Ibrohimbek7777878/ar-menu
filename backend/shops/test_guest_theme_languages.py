"""Kun/tun rejimi (`guest_theme`) va mehmon tillari (`guest_languages`): standart qiymatda javobda kalit yo'q, admin sozlamasi
mehmon sahifasiga yetadi, noto'g'ri qiymat rad etiladi va hech narsa saqlanmaydi, klassik dizaynda kalitlar yo'q."""
import io

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from shops.guest_languages import DEFAULT_LANGUAGES, guest_languages_for_shop_id, is_valid_languages, normalize_languages
from shops.guest_theme import THEME_CHOICES, guest_theme_for_shop_id, normalize_theme
from shops.models import Shop
from web.test_spa_session import session_in


class HelperTests(SimpleTestCase):
    def test_theme_garbage_means_day(self):
        for value in (None, '', 'dark', '<script>', 5, {}):
            self.assertEqual(normalize_theme(value), 'day')
        self.assertEqual(normalize_theme(' NIGHT '), 'night')
        self.assertEqual(THEME_CHOICES, ('day', 'night', 'auto', 'off'))

    def test_languages_are_cleaned_and_never_empty(self):
        self.assertEqual(normalize_languages(' RU , uz , ru, xx'), 'ru,uz')
        self.assertEqual(normalize_languages(['en', 'uz']), 'en,uz')
        for value in (None, '', 'xx', ',,', 5):
            self.assertEqual(normalize_languages(value), DEFAULT_LANGUAGES)

    def test_strict_language_check_for_admin_input(self):
        for ok in ('uz', 'uz,ru', 'ru,uz,en', ' en , uz '):
            self.assertTrue(is_valid_languages(ok), ok)
        for bad in ('', 'xx', 'uz,xx', 'uz,uz', ',', 'uz;ru'):
            self.assertFalse(is_valid_languages(bad), bad)

    def test_no_shop_means_no_key(self):
        self.assertEqual(guest_theme_for_shop_id(None), '')
        self.assertEqual(guest_languages_for_shop_id(None), '')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class EndToEndTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Til Restorani', slug='til-s', owner='til-s-ega',
                     password='Til-parol-12345', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='til-s')
        owner = AdminUser.objects.get(username='til-s-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        self.owner_client = Client()
        self.owner_client.force_login(owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, **fields):
        return self.owner_client.patch(self.API, fields, content_type='application/json')

    def guest_session(self):
        return session_in(Client().get('/menu/').content.decode())

    def test_defaults_leave_the_session_unchanged(self):
        self.assertEqual(self.guest_session(), {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        body = self.owner_client.get(self.API).json()
        self.assertEqual((body['guest_theme'], body['guest_languages']), ('day', 'uz,ru,en'))

    def test_theme_reaches_the_guest_page_and_day_removes_the_key(self):
        for value in ('night', 'auto', 'off'):
            self.assertEqual(self.patch(guest_theme=value).status_code, 200)
            self.assertEqual(self.guest_session()['theme'], value)
        self.patch(guest_theme='day')
        self.assertNotIn('theme', self.guest_session())

    def test_languages_reach_the_guest_page_and_the_full_set_removes_the_key(self):
        self.assertEqual(self.patch(guest_languages='uz,ru').status_code, 200)
        self.assertEqual(self.guest_session()['languages'], 'uz,ru')
        self.patch(guest_languages='uz,ru,en')
        self.assertNotIn('languages', self.guest_session())

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for field, bad in (('guest_theme', 'dark'), ('guest_theme', '<script>'), ('guest_theme', ''),
                           ('guest_languages', 'xx'), ('guest_languages', ''), ('guest_languages', 'uz,uz'), ('guest_languages', 'uz;ru')):
            res = self.patch(**{field: bad})
            self.assertEqual(res.status_code, 400, (field, bad))
            self.assertEqual(res.json().get('field'), field)
        body = self.owner_client.get(self.API).json()
        self.assertEqual((body['guest_theme'], body['guest_languages']), ('day', 'uz,ru,en'))

    def test_classic_design_never_gets_the_keys(self):
        from notifications.models import AppSetting
        self.patch(guest_theme='night', guest_languages='ru')
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        session = self.guest_session()
        self.assertNotIn('theme', session)
        self.assertNotIn('languages', session)
