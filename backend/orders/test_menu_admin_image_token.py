"""`image_token` taom yaratish (POST) va tahrirlashda (PATCH): token bir martalik, faqat shu restoranniki, internetdan kelgan rasm
`has_real_photo=False` + kredit, o'z rasmi `has_real_photo=True` + kredit tozalanadi. Haqiqiy `image_tokens` ombori (vaqtinchalik MEDIA_ROOT)."""
import io
import json
import shutil
import tempfile
from decimal import Decimal
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from products.image_test_utils import jpeg_bytes
from products.menu_import import image_tokens
from products.models import Product
from shops.models import Shop

LIST = '/api/restaurant/admin/v1/menu/products/'
CREDIT = 'Boonlong1 · CC BY'
SOURCE = 'https://www.flickr.com/photos/boonlong1/1'


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class MenuAdminImageTokenTests(TestCase):
    def setUp(self):
        media = tempfile.mkdtemp(prefix='menu-token-')
        self.addCleanup(shutil.rmtree, media, True)
        override = override_settings(MEDIA_ROOT=media)
        override.enable()
        self.addCleanup(override.disable)
        call_command('create_restaurant', name='Test Oshxona', slug='test-osh', owner='osh-ega', password='Osh-parol-123!',
                     tables=1, stdout=io.StringIO())
        call_command('create_restaurant', name='Begona Restoran', slug='begona-osh', owner='begona-ega', password='Begona-12345!',
                     tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='test-osh')
        self.foreign_shop = Shop.objects.get(slug='begona-osh')
        self.owner = AdminUser.objects.get(username='osh-ega')
        self.client = Client()
        self.client.force_login(self.owner)

    def web_token(self, shop=None, **kwargs):
        """Internetdan olingan rasm tokeni (image-search/pick natijasi)."""
        kwargs.setdefault('credit', CREDIT)
        kwargs.setdefault('source_url', SOURCE)
        kwargs.setdefault('real_photo', False)
        return image_tokens.store_temp_image(jpeg_bytes(), (shop or self.shop).id, **kwargs)

    def own_token(self, shop=None):
        return image_tokens.store_temp_image(jpeg_bytes(), (shop or self.shop).id, real_photo=True)

    def post(self, **fields):
        payload = {'name': 'Palov', 'price': 45000, **fields}
        return self.client.post(LIST, data=json.dumps(payload), content_type='application/json')

    def patch(self, pk, content_type='application/json', **fields):
        return self.client.patch(f'{LIST}{pk}/', data=json.dumps(fields), content_type=content_type)

    def make_product(self, **kwargs):
        defaults = dict(shop=self.shop, name='Manti', slug='manti-x', price=Decimal('30000'), has_real_photo=True)
        defaults.update(kwargs)
        return Product.objects.create(**defaults)

    # ── POST ──
    def test_create_with_internet_token(self):
        token = self.web_token()
        response = self.post(image_token=token)
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertFalse(body['has_real_photo'])
        self.assertEqual((body['image_credit'], body['image_source_url']), (CREDIT, SOURCE))
        self.assertTrue(body['image'])
        product = Product.objects.get(pk=body['id'])
        self.assertTrue(product.image.name.startswith('products/'))
        self.assertEqual(product.image.read()[:2], b'\xff\xd8')
        self.assertEqual((product.image_credit, product.image_source_url, product.has_real_photo), (CREDIT, SOURCE, False))
        # token bir martalik
        self.assertIsNone(image_tokens.peek_temp_image(token, self.shop.id))
        again = self.post(name='Boshqa', image_token=token)
        self.assertEqual(again.status_code, 400)
        self.assertEqual(again.json()['field'], 'image_token')
        self.assertFalse(Product.objects.filter(name='Boshqa').exists())

    def test_create_with_own_photo_token_has_no_credit(self):
        token = self.own_token()
        response = self.post(image_token=token)
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body['has_real_photo'])
        self.assertEqual((body['image_credit'], body['image_source_url']), ('', ''))
        self.assertTrue(body['image'])

    def test_own_token_never_carries_credit_even_if_stored(self):
        token = image_tokens.store_temp_image(jpeg_bytes(), self.shop.id, credit='Birov · CC BY', source_url=SOURCE, real_photo=True)
        body = self.post(image_token=token).json()
        self.assertEqual((body['has_real_photo'], body['image_credit'], body['image_source_url']), (True, '', ''))

    def test_create_with_multipart_token_field(self):
        token = self.web_token()
        response = self.client.post(LIST, data={'name': 'Palov', 'price': '45000', 'image_token': token})
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()['image_credit'], CREDIT)

    def test_invalid_tokens_are_400_on_image_token_field_and_create_nothing(self):
        foreign = self.web_token(shop=self.foreign_shop)
        for bad in (foreign, 'garbage', 'A' * 32, 'x' * 500, '../../etc/passwd', ['a'], {'a': 1}, True, 12345):
            with self.subTest(token=str(bad)[:20]):
                response = self.post(name=f'Taom {str(bad)[:8]}', image_token=bad)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()['field'], 'image_token')
        self.assertEqual(Product.objects.filter(shop=self.shop).count(), 0)
        # begona token yonib ketmadi: o'z egasida hamon yaroqli
        self.assertIsNotNone(image_tokens.peek_temp_image(foreign, self.foreign_shop.id))

    def test_expired_token(self):
        token = self.web_token()
        future = image_tokens.time.time() + image_tokens.TTL_SECONDS + 60
        with mock.patch.object(image_tokens.time, 'time', return_value=future):
            response = self.post(image_token=token)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['field'], 'image_token')
        self.assertIn('muddati', response.json()['error'])

    def test_empty_token_is_ignored(self):
        for empty in ('', None, '   '):
            response = self.post(name=f'Taom{len(str(empty))}', image_token=empty)
            self.assertEqual(response.status_code, 201, empty)
            self.assertFalse(response.json()['image'])
            self.assertFalse(response.json()['has_real_photo'])

    def test_token_and_file_together_is_rejected(self):
        token = self.web_token()
        upload = SimpleUploadedFile('p.jpg', jpeg_bytes(), content_type='image/jpeg')
        response = self.client.post(LIST, data={'name': 'Palov', 'price': '45000', 'image_token': token, 'image': upload})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['field'], 'image_token')
        self.assertIsNotNone(image_tokens.peek_temp_image(token, self.shop.id))

    def test_failed_validation_does_not_burn_the_token(self):
        token = self.web_token()
        response = self.client.post(LIST, data=json.dumps({'name': 'Palov', 'image_token': token}), content_type='application/json')
        self.assertEqual(response.status_code, 400)                                # narx yo'q
        self.assertIsNotNone(image_tokens.peek_temp_image(token, self.shop.id))
        self.assertEqual(self.post(image_token=token).status_code, 201)

    def test_plain_upload_still_works_and_has_no_credit(self):
        upload = SimpleUploadedFile('p.jpg', jpeg_bytes(), content_type='image/jpeg')
        response = self.client.post(LIST, data={'name': 'Palov', 'price': '45000', 'image': upload})
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual((body['has_real_photo'], body['image_credit'], body['image_source_url']), (True, '', ''))

    def test_audit_notes_image_origin(self):
        from orders.audit import AuditLog
        pid = self.post(image_token=self.web_token()).json()['id']
        entry = AuditLog.objects.filter(target_type='product', target_id=pid).latest('id')
        self.assertEqual(entry.new_value['image'], 'internet')

    # ── PATCH ──
    def test_patch_with_internet_token_replaces_photo(self):
        product = self.make_product(has_real_photo=True)
        token = self.web_token()
        response = self.patch(product.pk, image_token=token)
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual((body['has_real_photo'], body['image_credit'], body['image_source_url']), (False, CREDIT, SOURCE))
        self.assertTrue(body['image'])
        product.refresh_from_db()
        self.assertEqual((product.has_real_photo, product.image_credit), (False, CREDIT))
        self.assertEqual(self.patch(product.pk, image_token=token).status_code, 400)       # bir martalik

    def test_patch_with_own_photo_token_clears_credit(self):
        product = self.make_product(has_real_photo=False, image_credit=CREDIT, image_source_url=SOURCE)
        response = self.patch(product.pk, image_token=self.own_token())
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual((body['has_real_photo'], body['image_credit'], body['image_source_url']), (True, '', ''))

    def test_patch_with_real_upload_clears_credit(self):
        product = self.make_product(has_real_photo=False, image_credit=CREDIT, image_source_url=SOURCE)
        upload = SimpleUploadedFile('p.jpg', jpeg_bytes(), content_type='image/jpeg')
        response = self.client.patch(f'{LIST}{product.pk}/', data=_multipart({'image': upload}),
                                     content_type='multipart/form-data; boundary=BOUNDARY')
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual((body['has_real_photo'], body['image_credit'], body['image_source_url']), (True, '', ''))

    def test_patch_without_image_keeps_credit(self):
        product = self.make_product(has_real_photo=False, image_credit=CREDIT, image_source_url=SOURCE)
        body = self.patch(product.pk, price=50000).json()
        self.assertEqual((body['price'], body['image_credit'], body['image_source_url'], body['has_real_photo']),
                         (50000, CREDIT, SOURCE, False))

    def test_patch_cannot_use_foreign_token_or_foreign_product(self):
        product = self.make_product()
        foreign_token = self.web_token(shop=self.foreign_shop)
        response = self.patch(product.pk, image_token=foreign_token)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['field'], 'image_token')
        product.refresh_from_db()
        self.assertFalse(product.image)
        self.assertIsNotNone(image_tokens.peek_temp_image(foreign_token, self.foreign_shop.id))
        foreign_product = Product.objects.create(shop=self.foreign_shop, name='X', slug='x-x', price=Decimal('1000'))
        own_token = self.web_token()
        self.assertEqual(self.patch(foreign_product.pk, image_token=own_token).status_code, 404)
        self.assertIsNotNone(image_tokens.peek_temp_image(own_token, self.shop.id))

    def test_patch_validation_error_keeps_token_and_product(self):
        product = self.make_product()
        token = self.web_token()
        response = self.patch(product.pk, image_token=token, price='abc')
        self.assertEqual(response.status_code, 400)
        self.assertIsNotNone(image_tokens.peek_temp_image(token, self.shop.id))
        product.refresh_from_db()
        self.assertFalse(product.image)

    def test_patch_token_and_file_together_is_rejected(self):
        product = self.make_product()
        token = self.web_token()
        upload = SimpleUploadedFile('p.jpg', jpeg_bytes(), content_type='image/jpeg')
        response = self.client.patch(f'{LIST}{product.pk}/', data=_multipart({'image': upload, 'image_token': token}),
                                     content_type='multipart/form-data; boundary=BOUNDARY')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['field'], 'image_token')

    # ── boshqa joylar ──
    def test_list_and_duplicate_expose_and_keep_credit(self):
        product = self.make_product(has_real_photo=False, image_credit=CREDIT, image_source_url=SOURCE)
        row = next(r for r in self.client.get(LIST).json()['results'] if r['id'] == product.pk)
        self.assertEqual((row['image_credit'], row['image_source_url']), (CREDIT, SOURCE))
        copy = self.client.post(f'{LIST}{product.pk}/duplicate/').json()
        self.assertEqual((copy['image_credit'], copy['image_source_url'], copy['has_real_photo']), (CREDIT, SOURCE, False))

    def test_serializer_has_empty_strings_for_own_photos(self):
        product = self.make_product()
        row = next(r for r in self.client.get(LIST).json()['results'] if r['id'] == product.pk)
        self.assertEqual((row['image_credit'], row['image_source_url']), ('', ''))


def _multipart(fields, boundary='BOUNDARY'):
    """PATCH uchun multipart tanasi (Django test client PATCH'da avtomatik kodlamaydi)."""
    from django.test.client import encode_multipart
    return encode_multipart(boundary, fields)
