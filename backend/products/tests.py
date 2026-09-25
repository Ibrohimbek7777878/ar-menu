from django.test import TestCase
from products.models import Product, PRODUCT_DESIGN_TEMPLATES
from shops.models import Shop
from django.contrib.auth import get_user_model

User = get_user_model()

class ProductDesignAndDimensionsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test_shop_owner', password='password123')
        self.shop = Shop.objects.create(
            name='Test Tech & Luxury Store',
            owner=self.user,
            store_type='electronics',
            latitude=40.4897,
            longitude=68.7842,
        )

    def test_product_dimensions_cm_and_display(self):
        product = Product.objects.create(
            shop=self.shop,
            name='Smartfon Ultra Pro',
            slug='smartfon-ultra-pro',
            price=12000000,
            width_mm=75,
            height_mm=160,
            depth_mm=9,
            weight_g=210,
        )
        self.assertEqual(product.width_cm, 7.5)
        self.assertEqual(product.height_cm, 16.0)
        self.assertEqual(product.depth_cm, 0.9)
        dim_str = product.get_dimensions_display()
        self.assertIn('7.5 × 16 × 0.9 sm', dim_str)
        self.assertIn('210 g', dim_str)

    def test_auto_polisher_default_template(self):
        product = Product.objects.create(
            shop=self.shop,
            name='Universal Tovari',
            slug='universal-tovari',
            price=50000,
            design_template='default',
        )
        cfg = product.get_clean_design_config()
        self.assertEqual(cfg['bg_theme'], 'light')
        self.assertEqual(cfg['text_color'], '#0f172a')
        self.assertEqual(cfg['card_bg'], '#ffffff')

    def test_auto_polisher_luxury_template(self):
        product = Product.objects.create(
            shop=self.shop,
            name='Shveysariya Soati Gold',
            slug='shveysariya-soati-gold',
            price=45000000,
            design_template='luxury',
        )
        cfg = product.get_clean_design_config()
        self.assertEqual(cfg['bg_theme'], 'dark')
        self.assertEqual(cfg['accent_color'], '#f59e0b')
        self.assertEqual(cfg['text_color'], '#ffffff')
        self.assertIn('VIP', cfg['badge_text'])

    def test_auto_polisher_ar_hero_template(self):
        product = Product.objects.create(
            shop=self.shop,
            name='Kreslo 3D Boss',
            slug='kreslo-3d-boss',
            price=2500000,
            design_template='ar_hero',
        )
        cfg = product.get_clean_design_config()
        self.assertTrue(cfg['show_ruler'])
        self.assertEqual(cfg['accent_color'], '#7c3aed')
