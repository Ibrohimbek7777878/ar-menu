"""
Restoran Bosqich 1 testlari: QR → menyu → savat → buyurtma oqimi.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md
(R-GST-01, R-GST-03, R-GST-04, R-GST-05, R-GST-06)
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from categories.models import Category
from orders.models import Order
from orders.numbering import next_order_number
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestaurantFlowTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Oqim Restorani', slug='oqim', owner='oqim-owner',
                     password='Oqim-parol-123', tables=4, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='oqim')
        self.table = Table.objects.get(shop=self.shop, number='2')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='oqim-osh', price=Decimal('48000'),
                                          category=cat, is_available=True)
        self.somsa = Product.objects.create(shop=self.shop, name='Somsa', slug='oqim-somsa',
                                            price=Decimal('12000'), category=cat, is_available=True)
        other_owner = Shop.objects.get(pk=self.shop.pk).owner.__class__.objects.create_user(
            username='boshqa-ega', password='x-12345-y', role='shop_owner')
        self.other_shop = Shop.objects.create(name='Boshqa', slug='boshqa', owner=other_owner, address='a',
                                              phone='1', latitude=1, longitude=1)
        self.foreign = Product.objects.create(shop=self.other_shop, name='Begona', slug='boshqa-b',
                                              price=Decimal('99000'), category=cat, is_available=True)
        self.client = Client()

    # ---- yordamchilar ----
    def cart(self, **payload):
        return self.client.post('/api/cart/', json.dumps(payload), content_type='application/json')

    def scan_qr(self):
        """Mehmon stol QR kodini skanerlaydi (sessiyada stol eslab qolinadi)."""
        return self.client.get(f'/t/{self.table.qr_token}/', follow=True)

    def checkout(self, **extra):
        data = {'service_type': 'table', 'payment_method': 'cash', 'name': 'Ali', 'phone': '+998901234567'}
        data.update(extra)
        return self.client.post('/checkout/', data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

    # ---- R-GST-01: QR ----
    def test_qr_scan_opens_restaurant_menu_instead_of_500(self):
        res = self.client.get(f'/t/{self.table.qr_token}/')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res['Location'], f'/menu/?table={self.table.qr_token}')
        page = self.client.get(res['Location'])
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'Oqim Restorani')

    def test_qr_token_is_permanent_and_invalid_qr_is_404_not_500(self):
        from django.utils import timezone
        Table.objects.filter(pk=self.table.pk).update(qr_rotated_at=timezone.now() - timezone.timedelta(days=90))
        self.assertEqual(self.client.get(f'/t/{self.table.qr_token}/').status_code, 302)
        self.assertEqual(self.client.get('/t/00000000-0000-4000-8000-000000000000/').status_code, 404)

    # ---- R-GST-03: API ulangan ----
    def test_restaurant_api_is_mounted_and_menu_is_scoped(self):
        res = self.client.get('/api/v1/restaurant/menu/')
        self.assertEqual(res.status_code, 200)
        names = {p['name'] for p in res.json()['products']}
        self.assertEqual(names, {'Osh', 'Somsa'})           # begona restoran taomi aralashmaydi
        self.assertEqual(res.json()['shop']['name'], 'Oqim Restorani')

    def test_menu_does_not_invent_image_or_model(self):
        for p in self.client.get('/api/v1/restaurant/menu/').json()['products']:
            self.assertEqual(p['image'], '')
            self.assertEqual(p['ar_model'], '')
            self.assertFalse(p['has_3d'])

    # ---- R-GST-06: buyurtma raqami ----
    def test_order_numbers_are_unique(self):
        numbers = set()
        for i in range(60):
            n = next_order_number()
            numbers.add(n)
            Order.objects.create(order_number=n, customer_name='x', customer_phone_1='1', shop=self.shop,
                                 total_amount=Decimal('1'), final_amount=Decimal('1'))
        self.assertEqual(len(numbers), 60)

    def test_deleting_an_order_does_not_break_numbering(self):
        # Avval count()+101 bilan: bitta o'chirilgandan keyin keyingi raqam mavjud raqam bilan to'qnashardi
        for _ in range(3):
            Order.objects.create(order_number=next_order_number(), customer_name='x', customer_phone_1='1',
                                 shop=self.shop, total_amount=Decimal('1'), final_amount=Decimal('1'))
        Order.objects.order_by('id').first().delete()
        fresh = next_order_number()
        self.assertFalse(Order.objects.filter(order_number=fresh).exists())

    # ---- R-GST-04: savat ----
    def test_cart_set_and_clear(self):
        self.assertEqual(self.cart(action='set', product_id=self.osh.pk, quantity=3).json()['cart_count'], 3)
        self.assertEqual(self.cart(action='set', product_id=self.somsa.pk, quantity=2).json()['cart_count'], 5)
        self.assertEqual(self.cart(action='set', product_id=self.osh.pk, quantity=0).json()['cart_count'], 2)
        self.assertEqual(self.cart(action='clear').json()['cart_count'], 0)

    def test_cart_rejects_archived_dish(self):
        self.somsa.is_deleted = True
        self.somsa.save(update_fields=['is_deleted'])
        self.assertEqual(self.cart(action='add', product_id=self.somsa.pk).status_code, 404)

    def test_new_guest_sees_empty_cart_not_demo_items(self):
        page = self.client.get('/cart/')
        self.assertNotContains(page, 'Plov')
        self.assertNotContains(page, 'Somsa')

    # ---- R-GST-04/05: checkout ----
    def test_guest_order_from_qr_to_order_page(self):
        self.scan_qr()
        self.cart(action='set', product_id=self.osh.pk, quantity=2)
        self.cart(action='set', product_id=self.somsa.pk, quantity=1)
        res = self.checkout()
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body['ok'])

        order = Order.objects.get(pk=body['order_id'])
        self.assertEqual(order.shop, self.shop)
        self.assertEqual(order.table, self.table)                 # QR dagi stol
        self.assertEqual(order.total_amount, Decimal('108000'))   # 2×48000 + 12000, serverdagi narx
        self.assertEqual(order.final_amount, Decimal('108000'))   # xizmat haqi yo'q
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(Order.objects.count(), 1)                # bitta buyurtma, takrorlanmaydi

        self.assertEqual(self.client.get(body['redirect']).status_code, 200)
        self.assertEqual(self.cart(action='clear').json()['cart_count'], 0)

    def test_second_submit_does_not_create_duplicate_order(self):
        self.scan_qr()
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        self.assertTrue(self.checkout().json()['ok'])
        second = self.checkout()
        self.assertEqual(second.status_code, 400)
        self.assertEqual(Order.objects.count(), 1)

    def test_unknown_table_number_is_an_error_not_a_500_or_new_table(self):
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        tables_before = Table.objects.count()
        res = self.checkout(table_number_manual='99')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Stol aniqlanmadi', res.json()['error'])
        self.assertEqual(Table.objects.count(), tables_before)    # zalsiz stol yaratilmaydi
        self.assertEqual(Order.objects.count(), 0)

    @override_settings(RESTAURANT_ALLOW_TABLE_NUMBER_URL=True)
    def test_existing_manual_table_number_works_without_qr_when_flag_enabled(self):
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        res = self.checkout(table_number_manual='3')
        self.assertTrue(res.json()['ok'])
        self.assertEqual(Order.objects.get().table.number, '3')

    def test_guessable_table_number_is_refused_by_default(self):
        """Production standarti: stol raqamini yozib (yoki ?table=3 bilan) begona stolga buyurtma berib bo'lmaydi."""
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        for extra in ({'table_number_manual': '3'}, {'table_id': str(self.table.pk)}):
            res = self.checkout(**extra)
            self.assertEqual(res.status_code, 400, extra)
            self.assertIn('Stol aniqlanmadi', res.json()['error'])
        self.client.get('/menu/?table=3')                      # raqam bilan "kirish" ham stol bermaydi
        res = self.checkout()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_qr_token_still_identifies_the_table_in_production(self):
        self.scan_qr()
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        self.assertEqual(Order.objects.get(pk=self.checkout().json()['order_id']).table, self.table)

    def test_archived_dish_in_cart_is_not_ordered(self):
        self.scan_qr()
        self.cart(action='set', product_id=self.osh.pk, quantity=1)
        self.cart(action='set', product_id=self.somsa.pk, quantity=1)
        self.somsa.is_deleted = True
        self.somsa.save(update_fields=['is_deleted'])
        first = self.checkout()                                  # mehmonga aytiladi (avval jimgina tushib qolardi)
        self.assertEqual(first.status_code, 409)
        self.assertIn('Somsa', first.json()['error'])
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(self.checkout().json()['ok'])            # savat yangilandi: qayta tasdiqlansa o'tadi
        self.assertEqual([i.product_name for i in Order.objects.get().items.all()], ['Osh'])

    def test_empty_cart_checkout_is_rejected(self):
        res = self.checkout()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
