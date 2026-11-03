"""`menu_import_ai` sozlamasi (`Shop.business_profile['menu_import_ai']`): standart `on`, admin GET/PATCH, noto'g'ri qiymat 400 + field,
boshqa restoran tegilmaydi, xodim huquqi, jarayon keshi va `off` bo'lganda AI'ga hech qachon chaqiruv bo'lmasligi."""
import io
from types import SimpleNamespace
from unittest import mock

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings
from PIL import Image

from accounts.models import AdminUser
from backend.runtime_cache import invalidate_runtime_cache
from products.menu_import import vision
from shops.menu_import_ai import (
    DEFAULT_MENU_IMPORT_AI,
    MENU_IMPORT_AI_CHOICES,
    menu_import_ai_enabled,
    menu_import_ai_for_shop,
    menu_import_ai_for_shop_id,
    normalize_menu_import_ai,
)
from shops.models import Shop


class MenuImportAiHelperTests(SimpleTestCase):
    def test_garbage_means_on(self):
        for value in (None, '', 'maybe', '<script>', 5, {}, [], 'onn'):
            self.assertEqual(normalize_menu_import_ai(value), 'on', repr(value))
        self.assertEqual(normalize_menu_import_ai(' OFF '), 'off')
        self.assertEqual(normalize_menu_import_ai('On'), 'on')
        self.assertEqual((MENU_IMPORT_AI_CHOICES, DEFAULT_MENU_IMPORT_AI), (('on', 'off'), 'on'))

    def test_unknown_restaurant_is_never_allowed_to_use_ai(self):
        for value in (None, 0, False, True):
            self.assertEqual(menu_import_ai_for_shop_id(value), 'off')
        self.assertEqual(menu_import_ai_for_shop(None), 'off')
        self.assertFalse(menu_import_ai_enabled(None))

    def test_reads_the_loaded_shop_object_without_the_database(self):
        for profile, expected in (({}, 'on'), (None, 'on'), ({'menu_import_ai': 'off'}, 'off'), ({'menu_import_ai': 'zzz'}, 'on'),
                                  ({'menu_import_ai': ' ON '}, 'on'), ('garbage', 'on')):
            shop = SimpleNamespace(pk=1, business_profile=profile)
            self.assertEqual(menu_import_ai_for_shop(shop), expected, profile)
            self.assertEqual(menu_import_ai_enabled(shop), expected == 'on')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class MenuImportAiSettingsApiTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def make_shop(self, slug):
        call_command('create_restaurant', name=f'{slug} Restorani', slug=slug, owner=f'{slug}-ega', password='Parol-12345', tables=1,
                     stdout=io.StringIO())
        shop = Shop.objects.get(slug=slug)
        owner = AdminUser.objects.get(username=f'{slug}-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        client = Client()
        client.force_login(owner)
        return shop, client

    def setUp(self):
        self.shop, self.client_a = self.make_shop('ai-a')
        self.other, self.client_b = self.make_shop('ai-b')
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, client=None, **fields):
        return (client or self.client_a).patch(self.API, fields, content_type='application/json')

    def get(self, client=None):
        return (client or self.client_a).get(self.API).json()

    def test_default_is_on(self):
        self.assertEqual(self.get()['menu_import_ai'], 'on')

    def test_patch_off_then_on(self):
        res = self.patch(menu_import_ai='off')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['menu_import_ai'], 'off')
        self.assertEqual(self.get()['menu_import_ai'], 'off')
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.business_profile['menu_import_ai'], 'off')
        self.assertEqual(self.patch(menu_import_ai=' ON ').json()['menu_import_ai'], 'on')

    def test_patch_keeps_other_settings(self):
        self.patch(guest_dish_sheet='off', menu_import_ai='off')
        self.patch(guest_theme='night')   # noto'g'ri qiymat — hech narsa o'zgarmasin
        self.patch(service_fee_percent=5)
        data = self.get()
        self.assertEqual((data['guest_dish_sheet'], data['menu_import_ai'], data['service_fee_percent']), ('off', 'off', 5.0))

    def test_invalid_values_are_rejected_and_nothing_is_saved(self):
        for bad in ('maybe', '<script>', '', 'a' * 50, 'true', 'yes', 0, None, ['on'], {'a': 1}):
            res = self.patch(menu_import_ai=bad)
            self.assertEqual(res.status_code, 400, repr(bad))
            self.assertEqual(res.json().get('field'), 'menu_import_ai', repr(bad))
        self.assertEqual(self.get()['menu_import_ai'], 'on')

    def test_other_restaurant_is_not_affected(self):
        self.patch(menu_import_ai='off')
        self.assertEqual(self.get(self.client_b)['menu_import_ai'], 'on')
        self.patch(self.client_b, menu_import_ai='off')
        self.patch(menu_import_ai='on')
        self.assertEqual(self.get(self.client_b)['menu_import_ai'], 'off')
        self.assertEqual(self.get()['menu_import_ai'], 'on')

    def test_waiter_cannot_change_it(self):
        waiter = AdminUser.objects.create_user(username='ai-a-ofitsiant', password='Ofitsiant-1', role='waiter', shop=self.shop,
                                               is_staff=True, is_approved=True)
        client = Client()
        client.force_login(waiter)
        self.assertEqual(client.patch(self.API, {'menu_import_ai': 'off'}, content_type='application/json').status_code, 403)
        self.assertEqual(self.get()['menu_import_ai'], 'on')

    def test_anonymous_cannot_read_or_change_it(self):
        anonymous = Client()
        self.assertIn(anonymous.get(self.API).status_code, (401, 403))
        self.assertIn(anonymous.patch(self.API, {'menu_import_ai': 'off'}, content_type='application/json').status_code, (401, 403))

    @override_settings(APPSETTING_CACHE_TTL=60)
    def test_process_cache_is_refreshed_when_the_setting_changes(self):
        self.assertEqual(menu_import_ai_for_shop_id(self.shop.pk), 'on')   # keshga tushdi
        self.patch(menu_import_ai='off')
        self.assertEqual(menu_import_ai_for_shop_id(self.shop.pk), 'off')   # signal keshni tozaladi
        self.assertEqual(menu_import_ai_for_shop_id(self.other.pk), 'on')
        self.patch(menu_import_ai='on')
        self.assertEqual(menu_import_ai_for_shop_id(self.shop.pk), 'on')

    def test_off_means_vision_never_calls_ai_for_that_restaurant_only(self):
        buffer = io.BytesIO()
        Image.new('RGB', (200, 100), 'white').save(buffer, 'PNG')
        png = buffer.getvalue()
        self.patch(menu_import_ai='off')
        shop_a = Shop.objects.get(pk=self.shop.pk)
        shop_b = Shop.objects.get(pk=self.other.pk)
        reply = {'choices': [{'message': {'content': '{"kind": "menu", "rows": [{"name": "Osh", "price": 20000}]}'}}]}
        fake = mock.Mock(status_code=200, **{'json.return_value': reply})
        with override_settings(AI_API_KEY='gsk_test_key_for_unit_tests', AI_PROVIDER='groq'), \
                mock.patch.object(vision.requests, 'post', return_value=fake) as post, \
                mock.patch.object(vision.ocr, 'ocr_text', return_value='Palov 45000'):
            off_result = vision.read_image(png, shop=shop_a)
            self.assertIsNone(vision.structure_text_with_ai('Palov 45000', shop=shop_a))
            post.assert_not_called()
            self.assertEqual((off_result.engine, off_result.rows[0]['name']), ('ocr', 'Palov'))
            on_result = vision.read_image(png, shop=shop_b)
            self.assertEqual((on_result.engine, on_result.rows[0]['name']), ('ai', 'Osh'))
            self.assertEqual(post.call_count, 1)
