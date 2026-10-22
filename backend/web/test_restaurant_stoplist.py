"""
Stop-list (R5-1): taom tugadi/qaytdi — kim o'zgartira oladi, mehmon nimani ko'radi, buyurtma beriladimi.
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from orders.audit import AuditLog
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

API = '/api/v1/restaurant'


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class StopListTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Stop Oshxona', slug='stop', owner='stop-ega', password='Stop-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='stop')
        self.table = Table.objects.get(shop=self.shop, number='1')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='stop-osh', price=Decimal('48000'), category=cat,
                                          is_available=True)
        self.somsa = Product.objects.create(shop=self.shop, name='Somsa', slug='stop-somsa', price=Decimal('12000'),
                                            category=cat, is_available=True)
        self.users = {role: create_staff(self.shop, f's-{role}', role, password='Xodim-Parol-2026!')[0]
                      for role in ('waiter', 'kitchen', 'hostess')}
        self.users['owner'] = AdminUser.objects.get(username='stop-ega')
        other = call_command('create_restaurant', name='Boshqa', slug='stop-b', owner='stop-b-ega', password='Boshqa-12345',
                             tables=1, stdout=io.StringIO())
        self.other_shop = Shop.objects.get(slug='stop-b')
        self.foreign = Product.objects.create(shop=self.other_shop, name='Begona', slug='stop-begona', price=Decimal('1000'),
                                              category=cat, is_available=True)

    def client_for(self, key):
        client = Client()
        if key != 'guest':
            client.force_login(self.users[key])
        return client

    def set_available(self, key, product, value):
        return self.client_for(key).post(f'{API}/products/{product.pk}/availability/', json.dumps({'available': value}),
                                         content_type='application/json')

    def test_kitchen_waiter_and_management_can_toggle_but_hostess_and_guests_cannot(self):
        for key in ('kitchen', 'waiter', 'owner'):
            self.assertEqual(self.set_available(key, self.somsa, False).status_code, 200, key)
            self.assertEqual(self.set_available(key, self.somsa, True).status_code, 200, key)
        for key in ('hostess', 'guest'):
            self.assertIn(self.set_available(key, self.somsa, False).status_code, (401, 403), key)
        self.somsa.refresh_from_db()
        self.assertTrue(self.somsa.is_available)

    def test_value_must_be_a_real_boolean(self):
        for bad in (None, 'balki', 3):
            self.assertEqual(self.set_available('kitchen', self.somsa, bad).status_code, 400, bad)

    def test_only_own_restaurants_dishes_can_be_changed(self):
        self.assertEqual(self.set_available('kitchen', self.foreign, False).status_code, 404)
        self.foreign.refresh_from_db()
        self.assertTrue(self.foreign.is_available)

    def test_stoplist_lists_sold_out_dishes_too_and_is_scoped(self):
        self.set_available('kitchen', self.somsa, False)
        rows = self.client_for('kitchen').get(f'{API}/products/stoplist/').json()
        self.assertEqual({r['name']: r['is_available'] for r in rows}, {'Osh': True, 'Somsa': False})
        self.assertIn(self.client_for('hostess').get(f'{API}/products/stoplist/').status_code, (401, 403))

    def test_change_is_audited_once(self):
        self.set_available('kitchen', self.somsa, False)
        self.set_available('kitchen', self.somsa, False)           # o'zgarmadi — qayta yozilmaydi
        self.assertEqual(AuditLog.objects.filter(action_type='stock_change', new_value__event='stoplist').count(), 1)

    def test_sold_out_dish_disappears_from_the_guest_menu(self):
        self.assertContains(self.client.get(f'/t/{self.table.qr_token}/', follow=True), 'Somsa')
        self.set_available('kitchen', self.somsa, False)
        menu = self.client.get('/menu/')
        self.assertNotContains(menu, 'Somsa')
        self.assertContains(menu, 'Osh')
        self.set_available('kitchen', self.somsa, True)
        self.assertContains(self.client.get('/menu/'), 'Somsa')

    def cart(self, **payload):
        return self.client.post('/api/cart/', json.dumps(payload), content_type='application/json')

    def test_sold_out_dish_cannot_be_added_but_can_be_removed_from_the_cart(self):
        self.client.get(f'/t/{self.table.qr_token}/', follow=True)
        self.assertEqual(self.cart(action='set', product_id=self.somsa.pk, quantity=1).status_code, 200)
        self.set_available('kitchen', self.somsa, False)
        res = self.cart(action='add', product_id=self.somsa.pk, quantity=1)
        self.assertEqual((res.status_code, res.json()['code']), (409, 'sold_out'))
        self.assertIn('Somsa', res.json()['error'])
        self.assertEqual(self.cart(action='set', product_id=self.somsa.pk, quantity=2).status_code, 409)
        # savatdan olib tashlash esa mumkin (aks holda mehmon tugagan taomdan qutula olmaydi)
        self.assertEqual(self.cart(action='set', product_id=self.somsa.pk, quantity=0).status_code, 200)
        self.assertEqual(self.cart(action='remove', product_id=self.somsa.pk).status_code, 200)

    def test_checkout_tells_the_guest_which_dish_ran_out_and_orders_nothing(self):
        self.client.get(f'/t/{self.table.qr_token}/', follow=True)
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        self.cart(action='set', product_id=self.somsa.pk, quantity=2)
        self.set_available('kitchen', self.somsa, False)
        data = {'service_type': 'table', 'payment_method': 'cash', 'name': 'Ali', 'phone': '+998901234567'}
        res = self.client.post('/checkout/', data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['sold_out'], ['Somsa'])
        self.assertEqual(Order.objects.count(), 0)
        res = self.client.post('/checkout/', data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTrue(res.json()['ok'])
        self.assertEqual([i.product_name for i in Order.objects.get().items.all()], ['Osh'])

    def test_staff_cannot_add_a_sold_out_dish_to_a_table_either(self):
        self.set_available('kitchen', self.somsa, False)
        res = self.client_for('waiter').post(f'{API}/tables/1/add-item/', json.dumps({'product_id': self.somsa.pk, 'name': 'Somsa', 'price': 12000, 'quantity': 1}),
                                             content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)


    # ---- /ar/ menyusi faqat shu restoran taomlarini va kategoriyalarini ko'rsatadi (boshqa do'konlarniki emas) ----
    def test_ar_menu_does_not_leak_other_shops_products_or_categories(self):
        other_cat = Category.objects.create(name='Begona Kategoriya', name_uz='Begona Kategoriya', name_ru='x')
        Product.objects.create(shop=self.other_shop, name='Begona Mahsulot', slug='begona-x', price=Decimal('5000'),
                               category=other_cat, is_available=True, has_3d=True)
        self.client.get(f'/t/{self.table.qr_token}/', follow=True)
        html = self.client.get('/ar/').content.decode()
        self.assertIn('Osh', html)
        self.assertNotIn('Begona Mahsulot', html)
        self.assertNotIn('Begona Kategoriya', html)
