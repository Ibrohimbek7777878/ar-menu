"""
Klassik Seller/Admin paneli aktivlari (TZ 0.1/0.2): `SELLER_ASSETS` = local (standart) | cdn (zaxira).

Tekshiriladi: flag manbasi (settings va AppSetting), noto'g'ri qiymat -> local, base.html har ikki yo'lda to'g'ri
etiketlar chiqarishi va shablonlardagi `{% static %}` havolalari haqiqatan mavjud fayllarga ishora qilishi
(aks holda production'dagi ManifestStaticFilesStorage 500 beradi).
"""
import re
from pathlib import Path

from django.conf import settings
from django.contrib.staticfiles import finders
from django.template import Context, Template
from django.test import TestCase, override_settings

from backend.app_settings import set_setting

TEMPLATES_DIR = Path(settings.BASE_DIR) / 'templates'
MODE_TAG = Template('{% load seller_assets %}{% seller_assets_mode %}')


def mode(**context):
    return MODE_TAG.render(Context(context))


class SellerAssetsModeTagTests(TestCase):
    def test_default_is_local(self):
        self.assertEqual(mode(), 'local')

    @override_settings(SELLER_ASSETS='cdn')
    def test_settings_value_is_used(self):
        self.assertEqual(mode(), 'cdn')

    @override_settings(SELLER_ASSETS='cdn')
    def test_app_setting_overrides_settings(self):
        self.assertEqual(mode(public_settings={'seller_assets': 'local'}), 'local')

    @override_settings(SELLER_ASSETS='local')
    def test_app_setting_can_switch_to_cdn(self):
        self.assertEqual(mode(public_settings={'seller_assets': ' CDN '}), 'cdn')

    @override_settings(SELLER_ASSETS='cdn')
    def test_empty_app_setting_falls_back_to_settings(self):
        self.assertEqual(mode(public_settings={'seller_assets': ''}), 'cdn')

    @override_settings(SELLER_ASSETS='local')
    def test_invalid_value_falls_back_to_local(self):
        self.assertEqual(mode(public_settings={'seller_assets': 'whatever'}), 'local')

    @override_settings(SELLER_ASSETS='nonsense')
    def test_invalid_settings_value_falls_back_to_local(self):
        self.assertEqual(mode(), 'local')


class BaseTemplateAssetsTests(TestCase):
    """/seller/login/ — base.html dan meros oladigan, anonimga ochiq sahifa."""

    def html(self):
        response = self.client.get('/seller/login/')
        self.assertEqual(response.status_code, 200)
        return response.content.decode()

    def test_local_mode_uses_own_assets_and_no_external_hosts(self):
        html = self.html()
        for path in ('vendor/fonts/fonts.css', 'vendor/alpine/alpine-3.17.5.min.js', 'seller/seller.css'):
            self.assertIn(f'/static/{path}', html)
        for host in ('cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'):
            self.assertNotIn(host, html)
        self.assertNotIn('<script src="https://cdn.tailwindcss.com">', html)
        self.assertNotIn('tailwind.config', html)

    def test_local_tailwind_css_is_last_in_head(self):
        """CDN o'z <style> ini <head> OXIRIGA qo'shgan: lokal CSS ham inline uslublardan KEYIN bo'lishi shart (kaskad)."""
        html = self.html()
        head = html[:html.index('</head>')]
        self.assertGreater(head.index('seller/seller.css'), head.rindex('<style>'))
        self.assertGreater(head.index('seller/seller.css'), head.index('seller/pages/login.css'))

    def test_cdn_mode_restores_old_tags(self):
        set_setting('seller_assets', 'cdn')
        html = self.html()
        self.assertIn('<script src="https://cdn.tailwindcss.com"></script>', html)
        self.assertIn('https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js', html)
        self.assertIn('https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined', html)
        self.assertIn('tailwind.config', html)
        self.assertNotIn('/static/seller/seller.css', html)
        self.assertNotIn('/static/vendor/', html)

    @override_settings(SELLER_ASSETS='cdn')
    def test_env_setting_switches_to_cdn(self):
        self.assertIn('<script src="https://cdn.tailwindcss.com"></script>', self.html())


class StaticReferencesExistTests(TestCase):
    """Shablonlardagi seller/ va vendor/alpine|fonts statik havolalari mavjud fayllarga ishora qilishi shart."""

    def test_static_references_resolve(self):
        pattern = re.compile(r"""\{%\s*static\s+['"]((?:seller/|vendor/(?:alpine|fonts)/)[^'"]+)['"]\s*%\}""")
        checked = set()
        for template in TEMPLATES_DIR.rglob('*.html'):
            for ref in pattern.findall(template.read_text(encoding='utf-8')):
                checked.add(ref)
                self.assertIsNotNone(finders.find(ref), f'{template.name}: {ref} topilmadi')
        self.assertIn('seller/seller.css', checked)
        self.assertIn('seller/seller-spa.js', checked)

    def test_font_files_referenced_by_fonts_css_exist(self):
        css = Path(finders.find('vendor/fonts/fonts.css')).read_text(encoding='utf-8')
        files = set(re.findall(r'url\(([^)]+\.woff2)\)', css))
        self.assertTrue(files)
        for name in files:
            self.assertIsNotNone(finders.find(f'vendor/fonts/{name}'), name)
