"""
Lokal 3D menyu testlari: taom rasmidan 3D (relief), fon navbati, yangi restoran, mehmon menyusi.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md
"""
import io
import json
import os
import shutil
import tempfile
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from PIL import Image, ImageDraw

from accounts.models import AdminUser
from ar3d.image_to_3d import Image3DError, ReliefProvider
from ar3d.models import Product3DModel
from ar3d.pipeline import process_queue, queue_3d_generation
from categories.models import Category
from notifications.models import AppSetting
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table


def dish_jpeg(size=600):
    """Sinov uchun "taom": fon ustida rangli dumaloq tarelka."""
    img = Image.new('RGB', (size, size), (90, 60, 40))
    draw = ImageDraw.Draw(img)
    draw.ellipse((60, 60, size - 60, size - 60), fill=(245, 240, 230))
    draw.ellipse((150, 150, size - 150, size - 150), fill=(200, 120, 40))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=90)
    return buf.getvalue()


class TempMediaMixin:
    def setUp(self):
        super().setUp()
        self._media = tempfile.mkdtemp(prefix='gul3d-')
        self._override = override_settings(MEDIA_ROOT=self._media)
        self._override.enable()

    def tearDown(self):
        self._override.disable()
        shutil.rmtree(self._media, ignore_errors=True)
        super().tearDown()

    def make_restaurant(self, slug='lokal-restoran'):
        call_command('create_restaurant', name='Lokal Restoran', slug=slug, owner=f'{slug}-owner',
                     password='Lokal-parol-123', tables=3, stdout=io.StringIO())
        shop = Shop.objects.get(slug=slug)
        return shop, AdminUser.objects.get(username=f'{slug}-owner')

    def make_dish(self, shop, name='Osh', with_image=True):
        cat, _ = Category.objects.get_or_create(name='Milliy', defaults={'name_uz': 'Milliy', 'name_ru': 'Milliy'})
        p = Product.objects.create(shop=shop, name=name, slug=f'{shop.slug}-{name.lower()}', price=Decimal('40000'),
                                   category=cat, is_available=True)
        if with_image:
            p.image = SimpleUploadedFile(f'{name}.jpg', dish_jpeg(), content_type='image/jpeg')
            p.save()
        return p


class ReliefProviderTests(TempMediaMixin, TestCase):

    def test_generates_small_valid_glb_with_jpeg_texture(self):
        src = os.path.join(self._media, 'dish.jpg')
        with open(src, 'wb') as fh:
            fh.write(dish_jpeg())
        out = os.path.join(self._media, 'dish.glb')
        ReliefProvider().generate(src, out)
        with open(out, 'rb') as fh:
            data = fh.read()
        self.assertEqual(data[:4], b'glTF')
        self.assertLess(len(data), 2 * 1024 * 1024)
        self.assertIn(b'image/jpeg', data)

    def test_rejects_tiny_or_broken_images(self):
        tiny = os.path.join(self._media, 'tiny.jpg')
        Image.new('RGB', (50, 50)).save(tiny)
        with self.assertRaises(Image3DError):
            ReliefProvider().generate(tiny, os.path.join(self._media, 'x.glb'))
        broken = os.path.join(self._media, 'broken.jpg')
        with open(broken, 'wb') as fh:
            fh.write(b'not an image')
        with self.assertRaises(Image3DError):
            ReliefProvider().generate(broken, os.path.join(self._media, 'y.glb'))


class PipelineTests(TempMediaMixin, TestCase):

    def test_photo_to_ready_3d_model(self):
        shop, _ = self.make_restaurant()
        dish = self.make_dish(shop)
        job = queue_3d_generation(dish)
        self.assertEqual(job.status, 'queued')
        self.assertEqual(process_queue(), 1)
        dish.refresh_from_db()
        job.refresh_from_db()
        self.assertEqual(job.status, 'ready')
        self.assertEqual(job.source, 'relief')
        self.assertTrue(dish.has_3d)
        self.assertTrue(dish.ar_model.startswith('/media/ar/generated/'))
        self.assertTrue(os.path.exists(job.glb.path))

    def test_dish_without_photo_is_not_queued(self):
        shop, _ = self.make_restaurant()
        dish = self.make_dish(shop, with_image=False)
        self.assertIsNone(queue_3d_generation(dish))
        self.assertFalse(Product3DModel.objects.filter(product=dish).exists())

    def test_failure_is_recorded_and_dish_keeps_no_model(self):
        shop, _ = self.make_restaurant()
        dish = self.make_dish(shop)
        os.remove(dish.image.path)              # rasm fayli yo'qolgan
        queue_3d_generation(dish)
        process_queue()
        job = Product3DModel.objects.get(product=dish)
        dish.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertIn('topilmadi', job.error_msg)
        self.assertFalse(dish.has_3d)

    def test_library_attach_no_longer_recurses_or_assigns_foreign_model(self):
        from ar3d.services import auto_attach_library_3d
        shop, _ = self.make_restaurant()
        dish = self.make_dish(shop, name='Noyob taom xyz')
        ok, matched = auto_attach_library_3d(dish)
        dish.refresh_from_db()
        self.assertFalse(ok)
        self.assertIsNone(matched)
        self.assertFalse(dish.has_3d)            # boshqa taomning "zaxira" modeli qo'yilmadi
        self.assertEqual(Product3DModel.objects.get(product=dish).status, 'queued')


class CreateRestaurantCommandTests(TempMediaMixin, TestCase):

    def test_creates_restaurant_owner_tables_and_default_setting(self):
        shop, owner = self.make_restaurant()
        self.assertEqual(owner.role, 'shop_owner')
        self.assertTrue(owner.is_approved)
        self.assertEqual(owner.shop, shop)
        self.assertEqual(Table.objects.filter(shop=shop).count(), 3)
        self.assertEqual(AppSetting.objects.get(key='restaurant_default_shop').value, shop.slug)

    def test_rerun_is_idempotent(self):
        shop, _ = self.make_restaurant()
        call_command('create_restaurant', name='Lokal Restoran', slug=shop.slug, owner=f'{shop.slug}-owner',
                     tables=5, stdout=io.StringIO())
        self.assertEqual(Shop.objects.filter(slug=shop.slug).count(), 1)
        self.assertEqual(Table.objects.filter(shop=shop).count(), 5)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class GuestMenuTests(TempMediaMixin, TestCase):

    def menu_data(self, client=None):
        html = (client or Client()).get('/menu/?table=1').content.decode()
        start = html.index('window.__GULISTON_DATA__ = ') + len('window.__GULISTON_DATA__ = ')
        return json.loads(html[start:html.index(';\n', start)])

    def test_menu_shows_only_default_restaurant_active_dishes_with_3d_status(self):
        other_owner = AdminUser.objects.create_user(username='boshqa', password='x-12345-y', role='shop_owner')
        Shop.objects.create(name='Boshqa', slug='boshqa', owner=other_owner, address='a', phone='1',
                            latitude=1, longitude=1)
        shop, _ = self.make_restaurant()
        osh = self.make_dish(shop, name='Osh')
        choy = self.make_dish(shop, name='Choy', with_image=False)
        archived = self.make_dish(shop, name='Arxiv', with_image=False)
        archived.is_deleted = True
        archived.save(update_fields=['is_deleted'])
        queue_3d_generation(osh)
        process_queue()

        data = self.menu_data()
        self.assertEqual(data['shop']['name'], 'Lokal Restoran')
        by_name = {p['name']: p for p in data['products']}
        self.assertEqual(set(by_name), {'Osh', 'Choy'})
        self.assertTrue(by_name['Osh']['has_3d'])
        self.assertEqual(by_name['Osh']['model_status'], 'ready')
        self.assertFalse(by_name['Choy']['has_3d'])
        self.assertEqual(by_name['Choy']['ar_model'], '')
        self.assertEqual(by_name['Choy']['model_status'], 'none')

    def test_admin_form_upload_queues_3d_and_status_endpoint_reports_it(self):
        shop, owner = self.make_restaurant()
        cat = Category.objects.create(name='Issiq', name_uz='Issiq', name_ru='Issiq')
        client = Client()
        client.force_login(owner)
        res = client.post('/seller/products/create/', {
            'name': 'Somsa', 'price': 12000, 'category': cat.pk, 'is_available': 'on',
            'image': SimpleUploadedFile('somsa.jpg', dish_jpeg(), content_type='image/jpeg'),
        })
        self.assertEqual(res.status_code, 302)
        dish = Product.objects.get(shop=shop, name='Somsa')
        self.assertEqual(client.get(f'/seller/products/{dish.pk}/3d-status/').json()['status'], 'queued')
        process_queue()
        status = client.get(f'/seller/products/{dish.pk}/3d-status/').json()
        self.assertEqual(status['status'], 'ready')
        self.assertTrue(status['ar_model'].endswith('.glb'))

    def test_generate_button_is_post_only(self):
        shop, owner = self.make_restaurant()
        dish = self.make_dish(shop)
        client = Client()
        client.force_login(owner)
        self.assertEqual(client.get(f'/seller/products/{dish.pk}/ai3d/').status_code, 405)
        self.assertEqual(client.post(f'/seller/products/{dish.pk}/ai3d/').status_code, 302)
        self.assertEqual(Product3DModel.objects.get(product=dish).status, 'queued')
