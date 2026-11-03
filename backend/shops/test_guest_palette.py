"""Ranglar palitrasi (`guest_palette`): standart `classic` (javobda kalit yo'q), `orange` kalit bilan keladi, `<html data-palette>`
server tomonida yoziladi, noto'g'ri qiymat rad etiladi, sahifa palitra tufayli yiqilmaydi."""
import io

from django.core.management import call_command
from django.test import Client, RequestFactory, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from shops.guest_palette import DEFAULT_PALETTE, PALETTE_CHOICES, normalize_palette
from shops.models import Shop
from web.test_spa_session import session_in


class HelperTests(SimpleTestCase):
    def test_garbage_means_classic(self):
        for value in (None, '', 'green', '<script>', 5, {}):
            self.assertEqual(normalize_palette(value), 'classic')
        self.assertEqual(normalize_palette(' ORANGE '), 'orange')
        self.assertEqual((PALETTE_CHOICES, DEFAULT_PALETTE), (('classic', 'orange'), 'classic'))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class EndToEndTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Palitra Restorani', slug='palitra-s', owner='palitra-s-ega',
                     password='Palitra-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='palitra-s')
        owner = AdminUser.objects.get(username='palitra-s-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        self.owner_client = Client()
        self.owner_client.force_login(owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, **fields):
        return self.owner_client.patch(self.API, fields, content_type='application/json')

    def page(self):
        return Client().get('/menu/').content.decode()

    def test_default_is_classic_with_no_session_key_and_the_attribute_is_rendered(self):
        html = self.page()
        self.assertEqual(session_in(html), {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})
        self.assertIn('data-palette="classic"', html)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_palette'], 'classic')

    def test_orange_reaches_the_page_and_classic_removes_the_key(self):
        self.assertEqual(self.patch(guest_palette='orange').status_code, 200)
        html = self.page()
        self.assertEqual(session_in(html)['palette'], 'orange')
        self.assertIn('data-palette="orange"', html)
        self.patch(guest_palette='classic')
        html = self.page()
        self.assertNotIn('palette', session_in(html))
        self.assertIn('data-palette="classic"', html)

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for bad in ('green', '<script>', '', 'a' * 50):
            res = self.patch(guest_palette=bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json().get('field'), 'guest_palette', bad)
        self.assertEqual(self.owner_client.get(self.API).json()['guest_palette'], 'classic')

    def test_the_tag_never_breaks_a_page(self):
        from web.templatetags.json_tags import gulistan_palette
        self.assertEqual(gulistan_palette({}), 'classic')
        self.assertEqual(gulistan_palette({'request': RequestFactory().get('/')}), 'classic')

    def test_palette_is_independent_of_the_design_layout(self):
        from notifications.models import AppSetting
        self.patch(guest_palette='orange')
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        html = self.page()
        self.assertEqual(session_in(html)['design'], 'classic')
        self.assertEqual(session_in(html)['palette'], 'orange')
        self.assertIn('data-palette="orange"', html)
