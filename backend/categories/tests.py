"""
Kategoriyalar global (do'konlararo) taksonomiya: modelda do'kon maydoni yo'q, mahsulotlar unga FK bilan bog'lanadi.
Shuning uchun YOZISH (yaratish/o'zgartirish/o'chirish) faqat platforma adminiga ruxsat; o'qish hamma uchun ochiq.
Avval `/api/v1/categories/` AllowAny ModelViewSet edi: istalgan anonim so'rov kategoriyani o'zgartira yoki o'chira olardi
(barcha restoranlar/menyulariga ta'sir qiladi).
"""
import io

from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import AdminUser
from categories.models import Category
from products.models import Product
from shops.models import Shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class CategoryApiPermissionTests(APITestCase):
    URL = '/api/v1/categories/'

    def setUp(self):
        call_command('create_restaurant', name='Kat Resto', slug='kat-resto', owner='kat-owner',
                     password='Parol-Kat-123', tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='kat-resto')
        self.owner = AdminUser.objects.get(username='kat-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.platform = AdminUser.objects.create_superuser(username='kat-super', password='Super-Kat-123', email='k@k.uz')
        self.category = Category.objects.create(name='Salatlar', name_uz='Salatlar', name_ru='Салаты', icon='x',
                                                is_restaurant=True)
        self.product = Product.objects.create(shop=self.shop, name='Achchiq-chuchuk', slug='kat-ach', price=14000,
                                              category=self.category, is_available=True)

    def test_anyone_can_read_categories(self):
        res = APIClient().get(self.URL)
        self.assertEqual(res.status_code, 200)
        res = APIClient().get(f'{self.URL}{self.category.id}/')
        self.assertEqual(res.status_code, 200)

    def test_anonymous_cannot_write_or_delete(self):
        client = APIClient()
        payload = {'name': 'Hack', 'name_uz': 'Hack', 'name_ru': 'Hack', 'icon': 'x'}
        self.assertIn(client.post(self.URL, payload, format='json').status_code, (401, 403))
        self.assertIn(client.patch(f'{self.URL}{self.category.id}/', {'name': 'Buzildi'}, format='json').status_code, (401, 403))
        self.assertIn(client.put(f'{self.URL}{self.category.id}/', payload, format='json').status_code, (401, 403))
        self.assertIn(client.delete(f'{self.URL}{self.category.id}/').status_code, (401, 403))
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Salatlar')
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())
        self.assertFalse(Category.objects.filter(name='Hack').exists())

    def test_shop_owner_cannot_change_global_category(self):
        client = APIClient()
        client.force_authenticate(self.owner)
        self.assertEqual(client.patch(f'{self.URL}{self.category.id}/', {'name': 'Buzildi'}, format='json').status_code, 403)
        self.assertEqual(client.delete(f'{self.URL}{self.category.id}/').status_code, 403)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Salatlar')

    def test_platform_admin_can_manage_categories(self):
        client = APIClient()
        client.force_authenticate(self.platform)
        res = client.patch(f'{self.URL}{self.category.id}/', {'name': 'Yangi nom'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Yangi nom')
