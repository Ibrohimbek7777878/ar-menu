"""
Eski HTML taom/mahsulot formalarida `ar_model` tekshiruvi (TZ §11, roadmap P2).

Avval `web/views.py` (`admin_product_create/edit`) va `web/seller_views/marketplace.py` (`seller_product_create/edit`)
`ar_model` ni tekshirmasdan yozardi: `javascript:`, `data:`, `file:`, ichki manzil, `.exe`, 200 belgidan uzun qiymat va hokazo
to'g'ridan-to'g'ri bazaga tushar va mijoz brauzerida <model-viewer src="..."> ga qo'yilardi. Menyu admin API'sida shu tekshiruv
bor (`products/ar_validation.py`); endi HTML formalar yozishdan oldin AYNAN shuni chaqiradi va yaroqsiz bo'lsa boshqa
xatolar kabi `messages.error` bilan qaytaradi (hech narsa saqlanmaydi).
"""
from decimal import Decimal

from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from categories.models import Category
from products.models import Product
from shops.models import Shop

BAD_VALUES = (
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'https://example.com/model.exe',
    'https://example.com/folder/',
    '//evil.example/x.glb',
    'https://user:pw@example.com/x.glb',
    'https://127.0.0.1/x.glb',
    'http://example.com/x.glb',                        # http:// faqat DEBUG da
    '/media/../etc/x.glb',
    '/media/x.png',
    'https://example.com/' + 'a' * 200 + '.glb',
)
GOOD_VALUES = ('/media/ar/glb/osh.glb', 'https://cdn.example.com/models/osh.glb', '/models/plov.usdz')
TEST_HOSTS = ['testserver', 'localhost']


class _Base(TestCase):
    def setUp(self):
        self.owner = AdminUser.objects.create_user(username='ar-owner', password='Parol-AR-123', role='shop_owner',
                                                   is_approved=True)
        self.shop = Shop.objects.create(name='AR Resto', slug='ar-resto', owner=self.owner, is_open=True,
                                        latitude=40.49, longitude=68.78)
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])
        self.platform = AdminUser.objects.create_user(username='ar-platform', password='Parol-AR-123',
                                                      role='super_admin', is_approved=True)
        self.category = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Еда', icon='x')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='ar-osh', price=Decimal('45000'),
                                              category=self.category, ar_model='/media/ar/glb/old.glb', has_3d=True)

    def login(self, user):
        client = Client()
        client.force_login(user)
        return client

    def error_messages(self, response):
        return [str(m) for m in response.context['messages']]


@override_settings(ROOT_URLCONF='backend.urls', ALLOWED_HOSTS=TEST_HOSTS)
class AdminProductFormArModelTests(_Base):
    """`web/views.py`: admin_product_create / admin_product_edit (default URLConf, super_admin)."""

    def create_payload(self, name, ar_model):
        return {'shop': self.shop.pk, 'category': self.category.pk, 'name': name, 'price': '30000', 'unit': 'dona',
                'stock': '5', 'ar_model': ar_model, 'is_available': 'on'}

    def test_create_rejects_every_bad_value_and_saves_nothing(self):
        client = self.login(self.platform)
        for i, bad in enumerate(BAD_VALUES):
            name = f'Yomon taom {i}'
            res = client.post('/admin/products/create/', self.create_payload(name, bad))
            self.assertEqual(res.status_code, 200, bad)                     # forma qayta ko'rsatiladi, redirect emas
            self.assertTrue(self.error_messages(res), bad)
            self.assertFalse(Product.all_objects.filter(name=name).exists(), bad)

    def test_create_accepts_good_values_and_blank(self):
        client = self.login(self.platform)
        for i, good in enumerate(GOOD_VALUES):
            res = client.post('/admin/products/create/', self.create_payload(f'Yaxshi taom {i}', good))
            self.assertEqual(res.status_code, 302, good)
            self.assertEqual(Product.objects.get(name=f'Yaxshi taom {i}').ar_model, good)
        res = client.post('/admin/products/create/', self.create_payload('Modelsiz taom', '   '))
        self.assertEqual(res.status_code, 302)
        self.assertIsNone(Product.objects.get(name='Modelsiz taom').ar_model)

    def test_edit_rejects_bad_value_and_keeps_stored_data(self):
        client = self.login(self.platform)
        for bad in BAD_VALUES:
            payload = dict(self.create_payload('Osh', bad), price='99999')
            res = client.post(f'/admin/products/{self.product.pk}/edit/', payload)
            self.assertEqual(res.status_code, 200, bad)
            self.assertTrue(self.error_messages(res), bad)
            self.product.refresh_from_db()
            self.assertEqual(self.product.ar_model, '/media/ar/glb/old.glb', bad)
            self.assertEqual(self.product.price, Decimal('45000'), bad)

    def test_edit_accepts_good_value_and_clearing(self):
        client = self.login(self.platform)
        res = client.post(f'/admin/products/{self.product.pk}/edit/', self.create_payload('Osh', 'https://cdn.example.com/a.glb'))
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.ar_model, 'https://cdn.example.com/a.glb')
        res = client.post(f'/admin/products/{self.product.pk}/edit/', self.create_payload('Osh', ''))
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertIsNone(self.product.ar_model)

    def test_edit_does_not_block_other_fields_when_old_stored_value_is_untouched(self):
        """Eski (hozirgi qoidaga mos kelmaydigan) saqlangan qiymat o'zgartirilmasa, narxni tahrirlash to'silmaydi."""
        Product.objects.filter(pk=self.product.pk).update(ar_model='http://old.example.com/old.glb')
        client = self.login(self.platform)
        payload = dict(self.create_payload('Osh', 'http://old.example.com/old.glb'), price='51000')
        res = client.post(f'/admin/products/{self.product.pk}/edit/', payload)
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('51000'))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', ALLOWED_HOSTS=TEST_HOSTS)
class SellerProductFormArModelTests(_Base):
    """`web/seller_views/marketplace.py`: seller_product_create / seller_product_edit (restoran URLConf, do'kon egasi)."""

    def create_payload(self, name, ar_model):
        return {'category': self.category.pk, 'name': name, 'price': '30000', 'unit': 'dona', 'stock': '5',
                'ar_model': ar_model, 'is_available': 'on'}

    def test_create_rejects_every_bad_value_and_saves_nothing(self):
        client = self.login(self.owner)
        for i, bad in enumerate(BAD_VALUES):
            name = f'Yomon taom {i}'
            res = client.post('/seller/products/create/', self.create_payload(name, bad))
            self.assertEqual(res.status_code, 200, bad)
            self.assertTrue(self.error_messages(res), bad)
            self.assertFalse(Product.all_objects.filter(name=name).exists(), bad)

    def test_create_accepts_good_values_and_blank(self):
        client = self.login(self.owner)
        for i, good in enumerate(GOOD_VALUES):
            res = client.post('/seller/products/create/', self.create_payload(f'Yaxshi taom {i}', good))
            self.assertEqual(res.status_code, 302, good)
            product = Product.objects.get(name=f'Yaxshi taom {i}')
            self.assertEqual(product.ar_model, good)
        res = client.post('/seller/products/create/', self.create_payload('Modelsiz taom', ''))
        self.assertEqual(res.status_code, 302)
        self.assertIsNone(Product.objects.get(name='Modelsiz taom').ar_model)

    def test_edit_rejects_bad_value_and_keeps_stored_data(self):
        client = self.login(self.owner)
        for bad in BAD_VALUES:
            payload = dict(self.create_payload('Osh', bad), price='99999')
            res = client.post(f'/seller/products/{self.product.pk}/edit/', payload)
            self.assertEqual(res.status_code, 200, bad)
            self.assertTrue(self.error_messages(res), bad)
            self.product.refresh_from_db()
            self.assertEqual(self.product.ar_model, '/media/ar/glb/old.glb', bad)
            self.assertTrue(self.product.has_3d, bad)
            self.assertEqual(self.product.price, Decimal('45000'), bad)

    def test_edit_accepts_good_value_and_clearing(self):
        client = self.login(self.owner)
        res = client.post(f'/seller/products/{self.product.pk}/edit/', self.create_payload('Osh', 'https://cdn.example.com/a.glb'))
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.ar_model, 'https://cdn.example.com/a.glb')
        self.assertTrue(self.product.has_3d)
        res = client.post(f'/seller/products/{self.product.pk}/edit/', self.create_payload('Osh', ''))
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertIsNone(self.product.ar_model)
        self.assertFalse(self.product.has_3d)

    def test_edit_without_ar_model_field_keeps_stored_value(self):
        """Forma `ar_model` maydonini yubormasa (boshqa mijoz/eski forma), saqlangan qiymat tegilmaydi va tekshirilmaydi."""
        Product.objects.filter(pk=self.product.pk).update(ar_model='http://old.example.com/old.glb')
        payload = self.create_payload('Osh', '')
        del payload['ar_model']
        res = self.login(self.owner).post(f'/seller/products/{self.product.pk}/edit/', dict(payload, price='52000'))
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.ar_model, 'http://old.example.com/old.glb')
        self.assertEqual(self.product.price, Decimal('52000'))

    def test_edit_does_not_block_other_fields_when_old_stored_value_is_untouched(self):
        Product.objects.filter(pk=self.product.pk).update(ar_model='http://old.example.com/old.glb')
        payload = dict(self.create_payload('Osh', 'http://old.example.com/old.glb'), price='51000')
        res = self.login(self.owner).post(f'/seller/products/{self.product.pk}/edit/', payload)
        self.assertEqual(res.status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('51000'))
