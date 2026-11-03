"""
Kirish sahifasi (/admin/login/) va /ra/ qobig'i shablonlari: palitra atributi, kun/tun va til mexanizmi (admins/shared/src/theme, i18n).
Frontend tomoni (skript mantiqi, 3 tildagi matnlar) admins/resto/src/shell-templates.test.ts da tekshiriladi; bu yerda — server
shablonni haqiqatan chizishi (teglar, forma maydonlari, xabarlar).
"""
import re
import uuid

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from shops.models import Shop

User = get_user_model()


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class LoginPageShellTests(TestCase):
    def test_login_page_has_form_palette_theme_and_language_switchers(self):
        res = Client().get(reverse('restaurant_admin_login') + '?next=/ra/')
        self.assertEqual(res.status_code, 200)
        html = res.content.decode()
        # Forma o'zgarmagan: web testlari va e2e (auth.setup.ts) shu maydonlarga tayanadi
        self.assertIn('name="username"', html)
        self.assertIn('name="password"', html)
        self.assertIn('name="csrfmiddlewaretoken"', html)
        self.assertIn('name="next" value="/ra/"', html)
        self.assertEqual(html.count('type="submit"'), 1)
        # Palitra serverdan, kun/tun va til tanlagichlari
        self.assertRegex(html, r'<html[^>]*data-palette="(classic|orange)"')
        for lang in ('uz', 'ru', 'en'):
            self.assertIn(f'data-lang="{lang}"', html)
        for pref in ('day', 'night', 'auto'):
            self.assertIn(f'data-theme-pref="{pref}"', html)
        self.assertIn("guliston.theme", html)
        self.assertIn("guliston.lang", html)

    def test_login_page_font_files_are_served_from_own_static(self):
        html = Client().get(reverse('restaurant_admin_login')).content.decode()
        self.assertNotIn('fonts.googleapis.com', html)
        for url in re.findall(r"url\('([^']*outfit[^']*)'\)", html):
            self.assertTrue(url.startswith('/static/'), url)

    def test_login_error_message_stays_uzbek_in_markup_and_is_marked_for_translation(self):
        res = Client().post(reverse('restaurant_admin_login'), {'username': 'yoq', 'password': 'xato'})
        self.assertEqual(res.status_code, 200)
        html = res.content.decode()
        # Server o'zbekcha yozadi; til tanlansa brauzer skripti shu matnni (data-msg) tarjima qiladi
        self.assertRegex(html, r'<p data-msg>\s*Login yoki parol xato yoki hisob tasdiqlanmagan\.\s*</p>')
        self.assertRegex(html, r'class="msg-box msg-error"')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestoShellTemplateTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='shell_owner', password='password123', role='shop_owner', is_active=True, is_approved=True,
        )
        self.shop = Shop.objects.create(
            name='Qobiq Oshxona', slug='qobiq-oshxona', owner=self.owner, address='Guliston sh.',
            phone='+998901234567', latitude=40.49, longitude=68.78, public_id=uuid.uuid4(),
        )

    def test_ra_shell_has_palette_attribute_and_first_frame_theme_script(self):
        client = Client()
        client.force_login(self.owner)
        res = client.get('/ra/')
        self.assertEqual(res.status_code, 200)
        html = res.content.decode()
        self.assertRegex(html, r'<html[^>]*data-design="new"[^>]*data-palette="(classic|orange)"')
        self.assertIn("localStorage.getItem('guliston.theme')", html)
        self.assertIn("localStorage.getItem('guliston.lang')", html)
        self.assertIn('<div id="root"></div>', html)
        self.assertNotIn('bg-[#0f172a]', html)
