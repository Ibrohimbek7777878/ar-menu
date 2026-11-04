"""
Yumshoq o'chirish va noyob slug (TZ: R10-6, R10-7).
"""
import io
import re
from decimal import Decimal
from pathlib import Path

from django.core.management import call_command
from django.test import Client, TestCase
from rest_framework.test import APIClient

from accounts.models import AdminUser, Customer
from categories.models import Category
from finance.models import DebtRecord
from notifications.models import Review
from orders.creation import create_order
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

BACKEND = Path(__file__).resolve().parent.parent


def make_restaurant(slug):
    call_command('create_restaurant', name=f'Soft {slug}', slug=slug, owner=f'{slug}-ega', password='Soft-parol-123',
                 tables=2, stdout=io.StringIO())
    owner = AdminUser.objects.get(username=f'{slug}-ega')
    AdminUser.objects.filter(pk=owner.pk).update(is_approved=True)
    return Shop.objects.get(slug=slug), AdminUser.objects.get(pk=owner.pk)


def make_product(shop, name='Plov', **extra):
    category, _ = Category.objects.get_or_create(name='Taomlar', defaults={'name_uz': 'Taomlar', 'name_ru': 'Taomlar'})
    return Product.objects.create(shop=shop, name=name, price=Decimal('45000'), category=category, is_available=True, **extra)


class SoftDeleteBehaviourTests(TestCase):

    def setUp(self):
        self.shop, self.owner = make_restaurant('soft-a')

    def test_product_delete_hides_it_and_keeps_the_row(self):
        product = make_product(self.shop)
        product.delete()
        self.assertFalse(Product.objects.filter(pk=product.pk).exists())
        stored = Product.all_objects.get(pk=product.pk)
        self.assertTrue(stored.is_deleted)
        self.assertIsNotNone(stored.deleted_at)
        self.assertFalse(stored.is_available)

    def test_bulk_delete_hides_instead_of_erasing(self):
        make_product(self.shop, 'Osh'), make_product(self.shop, 'Somsa')
        count, detail = Product.objects.filter(shop=self.shop).delete()
        self.assertEqual(count, 2)
        self.assertEqual(Product.all_objects.filter(shop=self.shop).count(), 2)
        self.assertEqual(Product.objects.filter(shop=self.shop).count(), 0)

    def test_restore_brings_it_back(self):
        product = make_product(self.shop)
        product.delete()
        Product.all_objects.get(pk=product.pk).restore()
        self.assertTrue(Product.objects.filter(pk=product.pk).exists())

    def test_hard_delete_is_explicit(self):
        product = make_product(self.shop)
        product.hard_delete()
        self.assertFalse(Product.all_objects.filter(pk=product.pk).exists())

    def test_orders_survive_deletion_of_their_product(self):
        product = make_product(self.shop)
        order = create_order(shop=self.shop, customer_name='Ali', customer_phone_1='+998901112233',
                             total_amount=45000, final_amount=45000)
        from orders.models import OrderItem
        OrderItem.objects.create(order=order, product=product, product_name='Plov', price=45000, unit='dona',
                                 quantity=1, total=45000)
        product.delete()
        item = OrderItem.objects.get(order=order)
        self.assertEqual(item.product_name, 'Plov')
        self.assertEqual(item.product.pk, product.pk)               # FK orqali eski buyurtmadan hamon ko'rinadi

    def test_order_and_table_delete_are_soft(self):
        order = create_order(shop=self.shop, customer_name='Ali', customer_phone_1='+998901112233',
                             total_amount=1000, final_amount=1000)
        order.delete()
        self.assertTrue(Order.all_objects.filter(pk=order.pk, is_deleted=True).exists())
        table = Table.objects.filter(shop=self.shop).first()
        table.delete()
        self.assertTrue(Table.all_objects.filter(pk=table.pk, is_deleted=True).exists())

    def test_debt_delete_is_soft_and_hidden_from_the_default_manager(self):
        debt = DebtRecord.objects.create(shop=self.shop, person_name='Karim', amount=Decimal('100000'))
        DebtRecord.objects.filter(pk=debt.pk).delete()              # finance/views.py shu usulda o'chiradi
        self.assertFalse(DebtRecord.objects.filter(pk=debt.pk).exists())
        self.assertTrue(DebtRecord.all_objects.filter(pk=debt.pk).exists())

    def test_seller_api_delete_hides_the_product(self):
        product = make_product(self.shop)
        client = APIClient()
        client.force_authenticate(self.owner)
        response = client.delete(f'/api/v1/flutter/seller/products/{product.pk}/')
        self.assertEqual(response.status_code, 204, response.content)
        self.assertTrue(Product.all_objects.get(pk=product.pk).is_deleted)


class ReviewDeleteTests(TestCase):

    def setUp(self):
        self.shop, self.owner = make_restaurant('soft-r')
        self.admin = AdminUser.objects.create_user(username='soft-admin', password='Admin-parol-123', role='super_admin',
                                                   is_staff=True, is_superuser=True)
        product = make_product(self.shop)
        customer = Customer.objects.create(phone='+998901119999', name='Mijoz')
        self.review = Review.objects.create(product=product, customer=customer, rating=5, comment='Zo\'r')

    def test_delete_requires_post_and_hides_the_review(self):
        client = Client()
        client.force_login(self.admin)
        url = f'/admin/reviews/{self.review.pk}/delete/'
        self.assertEqual(client.get(url).status_code, 405)          # GET bilan o'chmaydi (CSRF'ga ochiq edi)
        self.assertTrue(Review.objects.filter(pk=self.review.pk).exists())
        self.assertEqual(client.post(url).status_code, 302)
        self.assertFalse(Review.objects.filter(pk=self.review.pk).exists())
        self.assertTrue(Review.all_objects.filter(pk=self.review.pk).exists())


class UniqueSlugTests(TestCase):

    def setUp(self):
        self.shop_a, _ = make_restaurant('slug-a')
        self.shop_b, _ = make_restaurant('slug-b')

    def test_second_dish_with_the_same_name_does_not_crash(self):
        slugs = [make_product(self.shop_a, 'Plov').slug, make_product(self.shop_a, 'Plov').slug,
                 make_product(self.shop_b, 'Plov').slug]
        self.assertEqual(len(set(slugs)), 3, slugs)
        self.assertEqual(slugs[0], 'plov')

    def test_slug_of_a_hidden_dish_is_never_reused(self):
        first = make_product(self.shop_a, 'Plov')
        first.delete()
        self.assertNotEqual(make_product(self.shop_a, 'Plov').slug, first.slug)

    def test_very_long_names_fit_the_slug_column(self):
        product = make_product(self.shop_a, 'Juda uzun nomli maxsus bayram oshi ' * 3)
        self.assertLessEqual(len(product.slug), 50)
        again = make_product(self.shop_a, 'Juda uzun nomli maxsus bayram oshi ' * 3)
        self.assertNotEqual(product.slug, again.slug)
        self.assertLessEqual(len(again.slug), 50)

    def test_explicit_free_slug_is_kept(self):
        self.assertEqual(make_product(self.shop_a, 'Osh', slug='maxsus-osh').slug, 'maxsus-osh')

    def test_updating_a_product_keeps_its_slug(self):
        product = make_product(self.shop_a, 'Osh')
        slug = product.slug
        product.name = 'Yangi nom'
        product.save()
        self.assertEqual(Product.objects.get(pk=product.pk).slug, slug)


class HardDeleteCallsAreAccountedForTests(TestCase):
    """
    Biznes yozuvlari `.delete()` bilan yo'qolmasligi uchun: kodda `.delete()` chaqirilgan har bir joy shu ro'yxatda
    bo'lishi shart. Yangi chaqiruv paydo bo'lsa test yiqiladi — modelning yumshoq o'chirishi (backend/softdelete.py)
    borligini tekshiring yoki chaqiruv shaxsiy/yordamchi ma'lumotga tegishli ekanini asoslab ro'yxatga qo'shing.
    """
    # (fayl, qator ichidagi qism) → sabab
    ALLOWED = {
        ('accounts/staff_admin.py', 'session.delete()'): 'Django sessiyasi (xodim bloklanganda)',
        ('api/views.py', 'item.delete()'): 'Sevimlilar (WishlistItem) — foydalanuvchining shaxsiy belgisi',
        ('web/views.py', 'WishlistItem.objects.filter'): 'Sevimlilar',
        ('web/views.py', 'item.delete()'): 'Sevimlilar',
        ('web/views.py', 'Product3DModel.objects.filter(product=p).delete()'): '3D model qayta yaratiladigan hosila ma\'lumot',
        ('web/views.py', 'review.delete()'): 'Review — yumshoq o\'chirish (SoftDeleteModel)',
        ('web/seller_views/marketplace.py', 'review.delete()'): 'Review — yumshoq o\'chirish (SoftDeleteModel)',
        ('api/seller_views.py', 'product.delete()'): 'Product — yumshoq o\'chirish (SoftDeleteBehaviour)',
        ('orders/interfaces/api/menu_admin.py', 'product.delete()'): 'Product — yumshoq o\'chirish (SoftDeleteBehaviour)',
        ('finance/views.py', 'cs.delete()'): 'Moliya ustuni sozlamasi (tranzaksiyalar boshqa ustunga ko\'chiriladi)',
        ('finance/views.py', 'DebtRecord.objects.filter'): 'DebtRecord — yumshoq o\'chirish (SoftDeleteModel)',
        ('finance/views.py', 'debt.delete()'): 'DebtRecord — yumshoq o\'chirish (SoftDeleteModel): sabab, tarix va audit bilan yashiriladi',
        ('tours/services.py', 'TourStop.objects.filter(tour=tour).delete()'): 'Sayr nuqtalari — muharrirda "Saqlash" bilan to\'liq almashtiriladi (sayrning o\'zi arxivlanadi)',
        ('tours/services.py', 'TourHotspot.objects.filter(tour=tour).delete()'): 'Sayr belgilari — muharrirda "Saqlash" bilan to\'liq almashtiriladi (sayrning o\'zi arxivlanadi)',
    }


    def test_every_delete_call_is_known(self):
        skip_dirs = {'venv', 'migrations', 'staticfiles', 'static', 'media', 'archive', 'node_modules', '__pycache__', 'scripts'}
        unknown = []
        for path in BACKEND.rglob('*.py'):
            rel = path.relative_to(BACKEND)
            if skip_dirs & set(rel.parts) or path.name.startswith('test') or path.name == 'tests.py':
                continue
            if rel.as_posix() == 'backend/softdelete.py':
                continue
            for number, line in enumerate(path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
                if re.search(r'\.delete\(\)', line) and not line.lstrip().startswith('#'):
                    if not any(rel.as_posix() == f and part in line for (f, part) in self.ALLOWED):
                        unknown.append(f'{rel}:{number}: {line.strip()}')
        self.assertEqual(unknown, [], "Ro'yxatda yo'q .delete() chaqiruvlari:\n" + '\n'.join(unknown))
