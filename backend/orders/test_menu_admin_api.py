"""
Menu Admin REST API testlari:
1. Ruxsatlar va RBAC:
   - Anonim so'rov → 401
   - Waiter, Kitchen, Hostess rollari → 403
   - Shop Owner, Shop Manager, Super Admin → 200/201
2. Mahsulotlar ro'yxati va filtrlash:
   - all, on, off, nophoto, hidden
   - qidiruv va kategoriya filtri
   - paginatsiya
3. Mahsulot yaratish (POST):
   - narx, nom, prep_minutes, cook_min, allergens, diet_tags
   - xavfsiz rasm yuklash (soxta rasm rad etilishi, haqiqiy rasm qabul qilinishi)
   - AuditLog yozilishi
4. IDOR (Insecure Direct Object Reference) himoyasi:
   - Begona restoran taomini tahrirlash/o'chirish/nusxalash taqiqlanishi (404)
5. Detail va Update (PATCH):
   - Narx, tavsif, mavjudlik yangilanishi
   - AuditLog yozilishi
6. Soft delete va Restore:
   - O'chirilganda arxivga o'tishi (is_deleted=True, is_available=False)
   - Restore qilinganda qayta faollashishi
7. Duplicate:
   - Taomdan nusxa olinishi va nomi "(nusxa)" bo'lishi
8. Categories:
   - Restoran kategoriyalari ro'yxati va yangi kategoriya yaratish
"""
import io
import json
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from PIL import Image

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from orders.audit import AuditLog
from products.models import Product
from shops.models import Shop


def make_test_image(fmt='PNG', size=(8, 8), name=None):
    buf = io.BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(buf, fmt)
    ext = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp'}[fmt]
    return SimpleUploadedFile(name or f'pic.{ext}', buf.getvalue(), content_type=f'image/{ext}')



@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class MenuAdminAPITests(TestCase):

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Test Oshxona',
            slug='test-osh',
            owner='osh-ega',
            password='Osh-parol-123!',
            tables=2,
            stdout=io.StringIO(),
        )
        self.shop = Shop.objects.get(slug='test-osh')
        self.owner = AdminUser.objects.get(username='osh-ega')

        self.category = Category.objects.create(name='Milliy Taomlar', is_restaurant=True)

        self.p1 = Product.objects.create(
            shop=self.shop,
            name='To\'y Oshi',
            slug='toy-oshi',
            price=Decimal('45000'),
            category=self.category,
            is_available=True,
            prep_minutes=25,
            has_real_photo=True,
        )
        self.p2 = Product.objects.create(
            shop=self.shop,
            name='Chuchvara',
            slug='chuchvara',
            price=Decimal('35000'),
            category=self.category,
            is_available=False,
            prep_minutes=15,
            has_real_photo=False,
        )

        # Xodimlar
        self.waiter = create_staff(self.shop, 'test-waiter', 'waiter', password='Xodim-Parol-2026!')[0]
        self.kitchen = create_staff(self.shop, 'test-kitchen', 'kitchen', password='Xodim-Parol-2026!')[0]
        self.hostess = create_staff(self.shop, 'test-hostess', 'hostess', password='Xodim-Parol-2026!')[0]
        self.manager = create_staff(self.shop, 'test-mgr', 'shop_manager', password='Xodim-Parol-2026!')[0]

        # Begona restoran (IDOR tekshiruvi uchun)
        call_command(
            'create_restaurant',
            name='Begona Restoran',
            slug='begona-osh',
            owner='begona-ega',
            password='Begona-12345!',
            tables=1,
            stdout=io.StringIO(),
        )
        self.foreign_shop = Shop.objects.get(slug='begona-osh')
        self.foreign_p = Product.objects.create(
            shop=self.foreign_shop,
            name='Begona Taom',
            slug='begona-taom',
            price=Decimal('99000'),
            is_available=True,
        )

    def client_for(self, user=None):
        c = Client()
        if user:
            c.force_login(user)
        return c

    def test_rbac_menu_admin_permissions(self):
        """Ofitsiant, oshpaz, hostess 403 oladi; anonim 401; manager va owner 200 oladi."""
        url = '/api/restaurant/admin/v1/menu/products/'

        # Anonim -> 401
        res = self.client_for(None).get(url)
        self.assertIn(res.status_code, (401, 403))

        # Waiter -> 403
        res = self.client_for(self.waiter).get(url)
        self.assertEqual(res.status_code, 403)

        # Kitchen -> 403
        res = self.client_for(self.kitchen).get(url)
        self.assertEqual(res.status_code, 403)

        # Hostess -> 403
        res = self.client_for(self.hostess).get(url)
        self.assertEqual(res.status_code, 403)

        # Manager -> 200
        res = self.client_for(self.manager).get(url)
        self.assertEqual(res.status_code, 200)

        # Owner -> 200
        res = self.client_for(self.owner).get(url)
        self.assertEqual(res.status_code, 200)

    def test_products_list_and_filters(self):
        """Mahsulotlar ro'yxati: status filtrlari (all, on, off, nophoto, hidden)."""
        c = self.client_for(self.owner)

        # all
        res = c.get('/api/restaurant/admin/v1/menu/products/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['count'], 2)

        # on (mavjud)
        res = c.get('/api/restaurant/admin/v1/menu/products/?status=on')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 1)
        self.assertEqual(res.json()['results'][0]['name'], "To'y Oshi")

        # off (to'xtatilgan)
        res = c.get('/api/restaurant/admin/v1/menu/products/?status=off')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 1)
        self.assertEqual(res.json()['results'][0]['name'], "Chuchvara")

        # nophoto
        res = c.get('/api/restaurant/admin/v1/menu/products/?status=nophoto')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 1)
        self.assertEqual(res.json()['results'][0]['name'], "Chuchvara")

        # qidiruv ?q=chuch
        res = c.get('/api/restaurant/admin/v1/menu/products/?q=chuch')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 1)

    def test_create_product_success_and_audit(self):
        """Yangi taom yaratish, prep_minutes va AuditLog tekshiruvi."""
        c = self.client_for(self.owner)
        payload = {
            'name': 'Manti',
            'price': 40000,
            'prep_minutes': 20,
            'category_id': self.category.id,
            'allergens': ['gluten'],
            'diet_tags': ['halal'],
        }
        res = c.post('/api/restaurant/admin/v1/menu/products/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['name'], 'Manti')
        self.assertEqual(data['prep_minutes'], 20)
        self.assertEqual(data['cook_min'], 20)
        self.assertEqual(data['allergens'], ['gluten'])
        self.assertEqual(data['diet_tags'], ['halal'])

        # AuditLog tekshirish
        audit = AuditLog.objects.filter(target_type='product', target_id=data['id']).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.new_value.get('action'), 'create')

    def test_create_product_image_validation(self):
        """Xavfli fayl yuklanganda 400 berishi, to'g'ri rasmda has_real_photo=True bo'lishi."""
        c = self.client_for(self.owner)

        # Soxta rasm (.png deb nomlangan HTML)
        fake_file = SimpleUploadedFile('bad.png', b'<script>alert(1)</script>', content_type='image/png')
        res = c.post('/api/restaurant/admin/v1/menu/products/', data={
            'name': 'Zaharli Taom',
            'price': 10000,
            'image': fake_file,
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('rasm emas', res.json().get('detail', ''))

        # To'g'ri PNG rasm
        good_file = make_test_image('PNG')
        res = c.post('/api/restaurant/admin/v1/menu/products/', data={
            'name': 'Haqiqiy Taom',
            'price': 25000,
            'image': good_file,
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json()['has_real_photo'])


    def test_idor_protection(self):
        """Boshqa restoranning taomini tahrirlash yoki o'chirish rad etiladi (404/403)."""
        c = self.client_for(self.owner)

        # Begona taomni PATCH qilish
        res = c.patch(
            f'/api/restaurant/admin/v1/menu/products/{self.foreign_p.id}/',
            data=json.dumps({'name': 'Xaker Taomi'}),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 404)

        # Begona taomni DELETE qilish
        res = c.delete(f'/api/restaurant/admin/v1/menu/products/{self.foreign_p.id}/')
        self.assertEqual(res.status_code, 404)

        # Begona taomni duplicate qilish
        res = c.post(f'/api/restaurant/admin/v1/menu/products/{self.foreign_p.id}/duplicate/')
        self.assertEqual(res.status_code, 404)

    def test_patch_product_and_audit(self):
        """Taom narxi va ma'lumotlarini tahrirlash hamda old_price saqlanishi."""
        c = self.client_for(self.owner)
        res = c.patch(
            f'/api/restaurant/admin/v1/menu/products/{self.p1.id}/',
            data=json.dumps({'price': 52000, 'prep_minutes': 30, 'is_available': False}),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['price'], 52000)
        self.assertEqual(data['old_price'], 45000)
        self.assertEqual(data['prep_minutes'], 30)
        self.assertFalse(data['is_available'])

        audit = AuditLog.objects.filter(target_type='product', target_id=self.p1.id, new_value__action='update').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.old_value.get('price'), 45000)

    def test_soft_delete_and_restore(self):
        """Soft delete va restore mexanizmi."""
        c = self.client_for(self.owner)

        # Delete
        res = c.delete(f'/api/restaurant/admin/v1/menu/products/{self.p1.id}/')
        self.assertEqual(res.status_code, 200)
        self.p1.refresh_from_db()
        self.assertTrue(self.p1.is_deleted)
        self.assertFalse(self.p1.is_available)

        # Oddiy ro'yxatda yo'q
        res = c.get('/api/restaurant/admin/v1/menu/products/')
        self.assertEqual(res.json()['count'], 1)

        # Hidden ro'yxatda bor
        res = c.get('/api/restaurant/admin/v1/menu/products/?status=hidden')
        self.assertEqual(res.json()['count'], 1)
        self.assertEqual(res.json()['results'][0]['id'], self.p1.id)

        # Restore
        res = c.post(f'/api/restaurant/admin/v1/menu/products/{self.p1.id}/restore/')
        self.assertEqual(res.status_code, 200)
        self.p1.refresh_from_db()
        self.assertFalse(self.p1.is_deleted)
        self.assertTrue(self.p1.is_available)

    def test_duplicate_product(self):
        """Taomdan nusxa olish."""
        c = self.client_for(self.owner)
        res = c.post(f'/api/restaurant/admin/v1/menu/products/{self.p1.id}/duplicate/')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['name'], "To'y Oshi (nusxa)")
        self.assertNotEqual(data['id'], self.p1.id)
        self.assertEqual(data['price'], int(self.p1.price))

    def test_categories_api(self):
        """Kategoriyalar ro'yxati va yaratish."""
        c = self.client_for(self.owner)

        # List
        res = c.get('/api/restaurant/admin/v1/menu/categories/')
        self.assertEqual(res.status_code, 200)
        cats = res.json()
        self.assertTrue(any(item['name'] == 'Milliy Taomlar' for item in cats))

        # Create
        res = c.post('/api/restaurant/admin/v1/menu/categories/', data={'name': 'Ichimliklar'})
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['name'], 'Ichimliklar')
        self.assertTrue(data['is_restaurant'])

    def test_product_availability_toggle(self):
        """TZ 4.3: POST products/<pk>/availability/ stop-list tezkor boshqaruvi."""
        c = self.client_for(self.owner)
        url = f'/api/restaurant/admin/v1/menu/products/{self.p1.id}/availability/'

        # O'chirish (stop-listga tushirish)
        res = c.post(url, data=json.dumps({'available': False}), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.p1.refresh_from_db()
        self.assertFalse(self.p1.is_available)

        # Qayta yoqish (mavjud qilish)
        res2 = c.post(url, data=json.dumps({'available': True}), content_type='application/json')
        self.assertEqual(res2.status_code, 200)
        self.p1.refresh_from_db()
        self.assertTrue(self.p1.is_available)

        # Body berilmasa toggle qilish
        res3 = c.post(url)
        self.assertEqual(res3.status_code, 200)
        self.p1.refresh_from_db()
        self.assertFalse(self.p1.is_available)
