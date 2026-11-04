"""
React paneli roli faqat server sessiyasidan (TZ: R1-9).
"""
import io
import json
import re

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from shops.models import Shop
from web.restaurant_auth import spa_session


def session_in(html):
    match = re.search(r'window\.__GULISTON_SESSION__ = (\{.*?\});</script>', html)
    assert match, 'sahifada __GULISTON_SESSION__ yo\'q'
    return json.loads(match.group(1))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class SpaSessionTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Rol Restorani', slug='rol', owner='rol-ega',
                     password='Rol-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='rol')
        self.owner = AdminUser.objects.get(username='rol-ega')
        self.waiter = AdminUser.objects.create_user(username='rol-ofitsiant', password='Ofitsiant-1', role='waiter',
                                                    shop=self.shop, is_staff=True)

    def login(self, user):
        client = Client()
        client.force_login(user)
        return client

    def test_guest_page_says_guest_and_not_demo(self):
        data = session_in(Client().get('/menu/').content.decode())
        # Brend (nom, logotip, palitra...) sessiyada DOIM bor (shops/brand.py); bu test fasl/animatsiya/... kalitlari yo'qligini tekshiradi
        self.assertEqual({k: v for k, v in data.items() if k != 'brand'}, {'role': 'guest', 'roles': [], 'demo': False, 'design': 'new'})

    def test_owner_is_admin_on_staff_pages(self):
        client = self.login(self.owner)
        for url in ('/kds/', '/menu/'):
            data = session_in(client.get(url, follow=True).content.decode())
            self.assertEqual((data['role'], data['roles']), ('admin', ['admin']), url)

    def test_super_admin_dashboard_carries_the_admin_session(self):
        boss = AdminUser.objects.create_user(username='bosh-admin', password='Bosh-parol-1', role='super_admin',
                                             is_staff=True, is_approved=True)
        data = session_in(self.login(boss).get('/admin/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('admin', ['admin']))

    def test_each_staff_role_gets_exactly_its_own_panel(self):
        kitchen = AdminUser.objects.create_user(username='rol-oshpaz', password='Oshpaz-1', role='kitchen', shop=self.shop)
        hostess = AdminUser.objects.create_user(username='rol-hostess', password='Hostess-1', role='hostess', shop=self.shop)
        data = session_in(self.login(self.waiter).get('/waiter/panel/').content.decode())
        self.assertEqual((data['role'], data['roles'], data['name']), ('waiter', ['waiter'], 'rol-ofitsiant'))
        data = session_in(self.login(kitchen).get('/kds/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('kitchen', ['kitchen']))
        data = session_in(self.login(hostess).get('/arrival/desk/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('hostess', ['hostess']))

    def test_a_non_staff_account_is_a_guest(self):
        customer = AdminUser.objects.create_user(username='oddiy', password='Oddiy-parol-1', role='support')
        data = session_in(self.login(customer).get('/menu/').content.decode())
        self.assertEqual(data['role'], 'guest')

    def test_inactive_staff_is_a_guest(self):
        self.waiter.is_active = False
        self.waiter.save(update_fields=['is_active'])
        request = type('R', (), {'user': self.waiter})()
        self.assertEqual(spa_session(request)['role'], 'guest')

    @override_settings(DEMO_MODE=True)
    def test_demo_flag_is_forwarded_so_legacy_grants_only_work_in_demo(self):
        self.assertTrue(session_in(Client().get('/menu/').content.decode())['demo'])

    def test_name_cannot_break_out_of_the_script_tag(self):
        self.waiter.first_name = '</script><script>alert(1)</script>'
        self.waiter.save(update_fields=['first_name'])
        html = self.login(self.waiter).get('/waiter/panel/').content.decode()
        self.assertNotIn('</script><script>alert(1)', html)
        self.assertEqual(session_in(html)['name'], '</script><script>alert(1)</script>')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class SessionConfigTests(TestCase):
    """KDS taymer chegaralari admin paneldan sozlanadi (R5-5); mehmon sessiyasida sozlama yo'q."""

    def setUp(self):
        call_command('create_restaurant', name='Cfg Restorani', slug='cfg', owner='cfg-ega', password='Cfg-parol-123',
                     tables=1, stdout=io.StringIO())
        self.owner = AdminUser.objects.get(username='cfg-ega')

    def session_for(self, user):
        request = type('R', (), {'user': user})()
        return spa_session(request)

    def test_staff_get_defaults_and_guests_get_nothing(self):
        self.assertEqual(self.session_for(self.owner)['config'], {'kds_warn_minutes': 10, 'kds_late_minutes': 20})
        self.assertNotIn('config', self.session_for(type('Anon', (), {'is_authenticated': False})()))

    def test_admin_settings_override_and_are_kept_sane(self):
        from notifications.models import AppSetting
        AppSetting.objects.create(key='kds_warn_minutes', value='7', category='kds')
        AppSetting.objects.create(key='kds_late_minutes', value='3', category='kds')      # ogohlantirishdan kichik — tuzatiladi
        config = self.session_for(self.owner)['config']
        self.assertEqual(config['kds_warn_minutes'], 7)
        self.assertGreater(config['kds_late_minutes'], config['kds_warn_minutes'])
        AppSetting.objects.filter(key='kds_warn_minutes').update(value='xato')
        self.assertEqual(self.session_for(self.owner)['config']['kds_warn_minutes'], 10)


class ReactAssetTagTests(TestCase):
    """{% react_css %} / {% react_js %} manifestdan hash'li nomlarni oladi; manifest bo'lmasa eski nomlar (R8-2)."""

    def render(self):
        from django.template import Context, Template
        return Template('{% load react_assets %}{% react_css %}|{% react_js %}').render(Context({}))

    def test_tags_use_the_manifest(self):
        import json as _json
        import tempfile
        from pathlib import Path
        from unittest import mock
        from web.templatetags import react_assets
        manifest = {
            'src/vendor.js': {'file': 'assets/vendor-Q1.js'},
            'index.html': {'file': 'assets/index-AbC123.js', 'isEntry': True, 'css': ['assets/index-Zz9.css'],
                           'imports': ['src/vendor.js']},
            'src/Page.tsx': {'file': 'assets/Page-X.js', 'isDynamicEntry': True},
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'manifest.json'
            path.write_text(_json.dumps(manifest))
            with mock.patch.object(react_assets, '_MANIFEST_PATH', path), \
                    mock.patch.dict(react_assets._cache, {'mtime': None, 'entry': None}):
                html = self.render()
        self.assertIn('href="/static/react/assets/index-Zz9.css"', html)
        self.assertIn('src="/static/react/assets/index-AbC123.js"', html)
        self.assertIn('rel="modulepreload" href="/static/react/assets/vendor-Q1.js"', html)
        self.assertNotIn('Page-X', html)                      # dinamik sahifa bo'lagi oldindan yuklanmaydi

    def test_single_css_file_listed_under_style_css_is_used(self):
        import json as _json
        import tempfile
        from pathlib import Path
        from unittest import mock
        from web.templatetags import react_assets
        manifest = {'index.html': {'file': 'assets/index-A.js', 'isEntry': True},
                    'style.css': {'file': 'assets/style-B.css'}}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'manifest.json'
            path.write_text(_json.dumps(manifest))
            with mock.patch.object(react_assets, '_MANIFEST_PATH', path), \
                    mock.patch.dict(react_assets._cache, {'mtime': None, 'entry': None}):
                html = self.render()
        self.assertIn('href="/static/react/assets/style-B.css"', html)

    def test_missing_manifest_falls_back_to_plain_names(self):
        from pathlib import Path
        from unittest import mock
        from web.templatetags import react_assets
        with mock.patch.object(react_assets, '_MANIFEST_PATH', Path('/nonexistent/manifest.json')), \
                mock.patch.dict(react_assets._cache, {'mtime': None, 'entry': None}):
            html = self.render()
        self.assertIn('/static/react/assets/index.css', html)
        self.assertIn('/static/react/assets/index.js', html)

    def test_showcase_is_hidden_in_production(self):
        from django.test import override_settings
        with override_settings(DEBUG=False, DEMO_MODE=False, ROOT_URLCONF='backend.urls_restaurant'):
            self.assertEqual(self.client.get('/ui-components/').status_code, 404)
        with override_settings(DEBUG=False, DEMO_MODE=True, ROOT_URLCONF='backend.urls_restaurant'):
            self.assertEqual(self.client.get('/ui-components/').status_code, 200)


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestDesignSettingTests(TestCase):
    """Eski/yangi dizayn kodni o'zgartirmasdan almashtiriladi (AGENTS.md 4-qoida: eskisi o'chirilmaydi, yashiriladi)."""

    def design(self):
        return session_in(Client().get('/menu/').content.decode())['design']

    def test_new_design_is_the_default(self):
        self.assertEqual(self.design(), 'new')

    def test_admin_setting_switches_back_to_the_classic_design(self):
        from notifications.models import AppSetting
        AppSetting.objects.create(key='guest_design', value='classic', category='guest')
        self.assertEqual(self.design(), 'classic')

    @override_settings(GUEST_DESIGN='classic')
    def test_env_default_is_used_when_no_admin_setting(self):
        self.assertEqual(self.design(), 'classic')

    def test_garbage_value_falls_back_to_the_default(self):
        from notifications.models import AppSetting
        AppSetting.objects.create(key='guest_design', value='<script>', category='guest')
        self.assertEqual(self.design(), 'new')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class WelcomeFeaturedDishesTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Tavsiya', slug='tavsiya', owner='tavsiya-ega',
                     password='Tavsiya-parol-1', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='tavsiya')

    def featured(self):
        html = Client().get('/welcome/').content.decode()
        match = re.search(r'window\.__GULISTON_WELCOME_DATA__ = (\{.*?\});\s*</script>', html, re.S)
        assert match, 'welcome ma\'lumoti topilmadi'
        return json.loads(match.group(1))['featured']

    def make(self, name, image='', featured=False, available=True):
        from categories.models import Category
        from products.models import Product
        cat, _ = Category.objects.get_or_create(name='Taomlar', defaults={'name_uz': 'Taomlar', 'name_ru': 'Taomlar'})
        return Product.objects.create(shop=self.shop, name=name, price=10000, category=cat, image=image,
                                      is_featured=featured, is_available=available)

    def test_only_available_dishes_with_a_photo_are_featured_recommended_first(self):
        self.make('Rasmsiz osh')
        self.make('Oddiy', image='dish/somsa.jpg')
        self.make('Tavsiya', image='dish/plov.jpg', featured=True)
        self.make('Mavjud emas', image='dish/soup.jpg', available=False)
        names = [d['name'] for d in self.featured()]
        self.assertEqual(names, ['Tavsiya', 'Oddiy'])

    def test_featured_is_capped(self):
        for i in range(12):
            self.make(f'Taom {i}', image='dish/plov.jpg')
        self.assertEqual(len(self.featured()), 8)

    def test_no_photos_gives_an_empty_list_not_an_error(self):
        self.make('Rasmsiz')
        self.assertEqual(self.featured(), [])
