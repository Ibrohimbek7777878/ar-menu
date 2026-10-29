"""
Menyu admin API: AR/3D model manzili (P2.4) va global kategoriyalar (P2.3).

P2.4: `ar_model` avval tekshirilmasdi: `javascript:`, `data:`, ixtiyoriy kengaytma, `../`, 200 belgidan uzun qiymat.
P2.3: Kategoriya do'konlararo umumiy taksonomiya (modelda do'kon maydoni yo'q — ataylab: bir xil "Ichimliklar" hamma
restoranga kerak). Menyu API orqali kategoriyani o'zgartirib/o'chirib bo'lmaydi; yaratish takrorlanmaydi; mahsulotga
faqat do'kon ko'ra oladigan kategoriya bog'lanadi.
"""
import io
import os
import tempfile
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from categories.models import Category
from products.ar_validation import ArModelError, validate_ar_model_ref
from products.models import Product
from shops.models import Shop

BASE = '/api/restaurant/admin/v1/menu/'


def make_shop(slug, owner):
    call_command('create_restaurant', name=f'{slug} resto', slug=slug, owner=owner, password='Parol-Menyu-123',
                 tables=1, stdout=io.StringIO())
    shop = Shop.objects.get(slug=slug)
    user = AdminUser.objects.get(username=owner)
    user.is_approved = True
    user.save(update_fields=['is_approved'])
    client = Client()
    client.force_login(user)
    return shop, client


class ArModelValidatorTests(TestCase):

    def test_good_references(self):
        for ok in ('/media/ar/glb/plov.glb', '/models/plov.glb', '/media/x/Model.GLB', 'https://cdn.example.com/m/osh.glb',
                   'https://cdn.example.com/m/osh.usdz?v=2', 'https://cdn.example.com/m/osh.gltf'):
            self.assertEqual(validate_ar_model_ref(ok), ok)
        self.assertIsNone(validate_ar_model_ref(''))
        self.assertIsNone(validate_ar_model_ref('   '))
        self.assertIsNone(validate_ar_model_ref(None))

    def test_bad_references(self):
        bad = [
            'javascript:alert(1)', 'JaVaScRiPt:alert(1)//x.glb', 'data:text/html;base64,PHNjcmlwdD4=.glb',
            'file:///etc/passwd.glb', 'ftp://host/x.glb', '//evil.example/x.glb', 'http://cdn.example.com/x.glb',
            'https://cdn.example.com/x.exe', 'https://cdn.example.com/x', '/media/ar/x.html', '/media/ar/x.svg',
            'https://user:pass@cdn.example.com/x.glb', 'https://localhost/x.glb', 'https://127.0.0.1/x.glb',
            'https://10.0.0.5/x.glb', 'https://169.254.169.254/latest/x.glb', 'https://[::1]/x.glb',
            '/../etc/passwd.glb', '/media/%2e%2e/secret.glb', '/media/a\\b.glb', '/media/a b.glb', 'x.glb', 'osh.glb',
            '/media/' + 'a' * 250 + '.glb', 'https://' + 'a' * 250 + '.example.com/x.glb', 'https:///x.glb',
        ]
        for value in bad:
            with self.assertRaises(ArModelError, msg=value):
                validate_ar_model_ref(value)

    def test_local_media_file_size_limit(self):
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media, MEDIA_URL='media/',
                                                                       UPLOAD_MAX_MODEL_MB=1):
            os.makedirs(os.path.join(media, 'ar'))
            with open(os.path.join(media, 'ar', 'big.glb'), 'wb') as f:
                f.write(b'\0' * (2 * 1024 * 1024))
            with open(os.path.join(media, 'ar', 'small.glb'), 'wb') as f:
                f.write(b'\0' * 1024)
            with self.assertRaises(ArModelError):
                validate_ar_model_ref('/media/ar/big.glb')
            self.assertEqual(validate_ar_model_ref('/media/ar/small.glb'), '/media/ar/small.glb')
            # Diskda yo'q fayl (masalan hali yuklanmagan yoki CDN'dagi nusxa) hajm bo'yicha rad etilmaydi
            self.assertEqual(validate_ar_model_ref('/media/ar/yoq.glb'), '/media/ar/yoq.glb')


class MenuArModelApiTests(TestCase):

    def setUp(self):
        self.shop, self.client_a = make_shop('ar-a', 'ar-owner-a')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='ar-osh', price=Decimal('45000'),
                                              is_available=True)
        self.url = f'{BASE}products/{self.product.id}/'

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_patch_rejects_unsafe_ar_model_and_keeps_old_value(self):
        Product.objects.filter(pk=self.product.pk).update(ar_model='/media/ar/glb/plov.glb', has_3d=True)
        for bad in ('javascript:alert(document.cookie)', 'data:text/html,<script>alert(1)</script>.glb',
                    'https://cdn.example.com/virus.exe', '/../../etc/passwd.glb', 'x' * 300, ['a'], {'a': 1}, 5):
            res = self.client_a.patch(self.url, {'ar_model': bad}, content_type='application/json')
            self.assertEqual(res.status_code, 400, f'{bad!r} -> {res.status_code} {res.content[:120]}')
            self.assertEqual(res.json().get('field'), 'ar_model')
            self.assertIn('error', res.json())
        self.product.refresh_from_db()
        self.assertEqual(self.product.ar_model, '/media/ar/glb/plov.glb')

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_post_rejects_unsafe_ar_model_without_creating_product(self):
        res = self.client_a.post(f'{BASE}products/', {'name': 'Zararli', 'price': 1000, 'ar_model': 'javascript:alert(1)'},
                                 content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Product.objects.filter(name='Zararli').exists())

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_valid_ar_model_is_saved_and_enables_3d(self):
        res = self.client_a.patch(self.url, {'ar_model': 'https://cdn.example.com/models/osh.glb'},
                                  content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.ar_model, 'https://cdn.example.com/models/osh.glb')
        self.assertTrue(self.product.has_3d)
        # Bo'sh qiymat 3D ni o'chiradi (ar_model yashiriladi, mahsulot o'chmaydi)
        res = self.client_a.patch(self.url, {'ar_model': '', 'has_3d': False}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertIsNone(self.product.ar_model)
        self.assertFalse(self.product.has_3d)

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_default_3d_pipeline_values_still_validate(self):
        """ar3d / services.py ishlatadigan standart yo'llar buzilmasligi shart."""
        for path in ('/models/plov.glb', '/media/products/dish_3d.glb', '/media/ar/glb/lagmon.glb'):
            self.assertEqual(validate_ar_model_ref(path), path)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class MenuCategoryIsolationTests(TestCase):

    def setUp(self):
        self.shop_a, self.client_a = make_shop('kat-a', 'kat-owner-a')
        self.shop_b, self.client_b = make_shop('kat-b', 'kat-owner-b')
        self.private_cat = Category.objects.create(name='Faqat A', is_restaurant=False)           # restoran emas, faqat A ishlatadi
        self.hidden_cat = Category.objects.create(name='Yashirin', is_restaurant=True, is_active=False)
        self.product_a = Product.objects.create(shop=self.shop_a, name='A taom', slug='kat-a-1', price=Decimal('1000'),
                                                category=self.private_cat, is_available=True)
        self.product_b = Product.objects.create(shop=self.shop_b, name='B taom', slug='kat-b-1', price=Decimal('1000'),
                                                is_available=True)

    def test_shop_cannot_attach_category_it_cannot_see(self):
        url = f'{BASE}products/{self.product_b.id}/'
        for cat in (self.private_cat, self.hidden_cat):
            res = self.client_b.patch(url, {'category_id': cat.id}, content_type='application/json')
            self.assertEqual(res.status_code, 400, cat.name)
            self.assertEqual(res.json().get('field'), 'category_id')
        self.product_b.refresh_from_db()
        self.assertIsNone(self.product_b.category_id)
        # Shu kategoriyadan foydalanayotgan do'kon (A) o'z mahsulotiga bog'lay oladi
        res = self.client_a.patch(f'{BASE}products/{self.product_a.id}/', {'category_id': self.private_cat.id},
                                  content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)

    def test_create_with_invisible_category_is_rejected(self):
        res = self.client_b.post(f'{BASE}products/', {'name': 'Yangi', 'price': 5000, 'category_id': self.private_cat.id},
                                 content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Product.objects.filter(name='Yangi').exists())

    def test_menu_api_has_no_category_update_or_delete(self):
        """Kategoriyani o'zgartirish/o'chirish yo'li yo'q: boshqa do'kon kategoriyasiga tegib bo'lmaydi."""
        shared = Category.objects.create(name='Umumiy', is_restaurant=True)
        for method in ('patch', 'put', 'delete'):
            res = getattr(self.client_b, method)(f'{BASE}categories/{shared.id}/', content_type='application/json')
            self.assertIn(res.status_code, (404, 405), method)
        shared.refresh_from_db()
        self.assertEqual((shared.name, shared.is_active), ('Umumiy', True))

    def test_category_create_does_not_duplicate_existing_shared_name(self):
        res1 = self.client_a.post(f'{BASE}categories/', {'name': 'Salatlar'}, content_type='application/json')
        res2 = self.client_b.post(f'{BASE}categories/', {'name': 'salatlar'}, content_type='application/json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res1.json()['id'], res2.json()['id'])
        self.assertEqual(Category.objects.filter(name__iexact='salatlar').count(), 1)

    def test_category_name_length_and_type_are_validated(self):
        for bad in ('x' * 101, ['a'], None, '   '):
            res = self.client_a.post(f'{BASE}categories/', {'name': bad}, content_type='application/json')
            self.assertEqual(res.status_code, 400, repr(bad))
