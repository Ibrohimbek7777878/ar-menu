"""
3D Photogrammetry & AR Scan testlari (TZ: Stage 4).
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from products.models import Product
from shops.models import Shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class Stage4ARScanTests(TestCase):

    def setUp(self):
        call_command(
            'create_restaurant',
            name='AR Oshxona',
            slug='ar-osh',
            owner='ar-ega',
            password='Ar-parol-123!',
            tables=2,
            stdout=io.StringIO(),
        )
        self.shop = Shop.objects.get(slug='ar-osh')
        self.owner = AdminUser.objects.get(username='ar-ega')
        self.waiter = create_staff(self.shop, 'ar-waiter', 'waiter', password='Xodim-Parol-2026!')[0]

        self.category = Category.objects.create(name='Issiq Taomlar', is_restaurant=True)

        # 3D taom
        self.p_3d = Product.objects.create(
            shop=self.shop,
            name='3D Manti',
            slug='3d-manti',
            price=Decimal('42000'),
            category=self.category,
            is_available=True,
            has_3d=True,
            ar_model='/models/manti.glb',
        )

        # Oddiy taom (3D modeli yo'q)
        self.p_plain = Product.objects.create(
            shop=self.shop,
            name='Oddiy Non',
            slug='oddiy-non',
            price=Decimal('5000'),
            category=self.category,
            is_available=True,
            has_3d=False,
        )

    def test_ar_menu_only_shows_3d_dishes_in_production(self):
        """TZ 4.1: /ar/ sahifasida faqat has_3d=True taomlar ko'rsatiladi."""
        client = Client()
        with override_settings(DEMO_MODE=False):
            res = client.get('/ar/')
            self.assertEqual(res.status_code, 200)
            data_json = res.context['react_ar_data_json']
            data = json.loads(data_json)
            product_names = [p['name'] for p in data['products']]
            self.assertIn('3D Manti', product_names)
            self.assertNotIn('Oddiy Non', product_names)

    def test_product_3d_scan_view_attaches_model(self):
        """RestaurantProduct3DScanView taomga 3D model va spin freymlarini biriktiradi."""
        client = Client()
        client.force_login(self.owner)

        payload = {
            'ar_model': '/models/new_dish.glb',
            'spin_frames': ['/media/frame1.jpg', '/media/frame2.jpg'],
        }
        res = client.post(
            f'/api/v1/restaurant/products/{self.p_plain.id}/3d-scan/',
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)

        self.p_plain.refresh_from_db()
        self.assertTrue(self.p_plain.has_3d)
        self.assertEqual(self.p_plain.ar_model, '/models/new_dish.glb')
