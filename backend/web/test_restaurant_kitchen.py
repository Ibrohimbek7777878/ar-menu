"""
Restoran Bosqich 1b testlari: mehmon buyurtmasi → oshxona (KDS) → ofitsiant; chaqiruv; POS.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md
(R-KDS-01, R-WTR-01, R-WTR-02, R-FIN tarkibiy)
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from categories.models import Category
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import ServiceCall, Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class KitchenWaiterFlowTests(TestCase):
    API = '/api/v1/restaurant'

    def setUp(self):
        call_command('create_restaurant', name='Oshxona Restorani', slug='oshxona', owner='oshxona-ega',
                     password='Oshxona-parol-1', tables=4, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='oshxona')
        self.table = Table.objects.get(shop=self.shop, number='3')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='oshxona-osh', price=Decimal('48000'),
                                          category=cat, is_available=True)
        self.waiter = AdminUser.objects.create_user(
            username='ofitsiant-x', password='Ofitsiant-parol-1', role='waiter', shop=self.shop, is_staff=True)
        other_owner = AdminUser.objects.create_user(username='boshqa-egasi', password='x-12345-y', role='shop_owner')
        self.other_shop = Shop.objects.create(name='Boshqa', slug='boshqa-r', owner=other_owner, address='a',
                                              phone='1', latitude=1, longitude=1)
        self.other_waiter = AdminUser.objects.create_user(
            username='boshqa-ofitsiant', password='x-12345-y', role='waiter', shop=self.other_shop)
        # Oshxona amallari (pishirish, tayyor) endi faqat oshpaz/rahbariyat uchun; ofitsiant stolga berish bilan shug'ullanadi
        self.cook = AdminUser.objects.create_user(
            username='oshpaz-x', password='Oshpaz-parol-1', role='kitchen', shop=self.shop, is_staff=True)
        self.other_cook = AdminUser.objects.create_user(
            username='boshqa-oshpaz', password='x-12345-y', role='kitchen', shop=self.other_shop)
        self.cook_client = Client()
        self.cook_client.force_login(self.cook)
        self.guest = Client()
        self.staff = Client()
        self.staff.force_login(self.waiter)

    def guest_order(self):
        """Mehmon QR dan kirib, haqiqiy checkout orqali buyurtma beradi (is_pickup=False)."""
        self.guest.get(f'/t/{self.table.qr_token}/', follow=True)
        self.guest.post('/api/cart/', json.dumps({'action': 'set', 'product_id': self.osh.pk, 'quantity': 2}),
                        content_type='application/json')
        res = self.guest.post('/checkout/', {'service_type': 'table', 'payment_method': 'cash', 'name': 'Ali'},
                              HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTrue(res.json()['ok'])
        return Order.objects.get(pk=res.json()['order_id'])

    def kds(self, order, status, client=None):
        return (client or self.cook_client).post(
            '/api/kds/status/', json.dumps({'order_id': order.pk, 'new_status': status}),
            content_type='application/json')

    # ---- mehmon buyurtmasi oshxonada ko'rinadi ----
    def test_guest_checkout_order_is_listed_for_staff(self):
        order = self.guest_order()
        self.assertFalse(order.is_pickup)           # restoran API'si avval is_pickup=True ni talab qilardi
        data = self.staff.get(f'{self.API}/orders/').json()
        self.assertEqual([o['id'] for o in data], [order.pk])
        self.assertEqual(data[0]['table_number'], '3')
        self.assertEqual(data[0]['items'][0]['name'], 'Osh')

    def test_staff_order_list_is_scoped_to_own_restaurant(self):
        self.guest_order()
        other = self.other_waiter
        client = Client()
        client.force_login(other)
        self.assertEqual(client.get(f'{self.API}/orders/').json(), [])

    # ---- KDS holat yo'li ----
    def test_kitchen_can_start_cooking_a_pending_order_and_mark_it_ready(self):
        order = self.guest_order()
        self.assertEqual(order.status, 'pending')
        self.assertEqual(self.kds(order, 'preparing').status_code, 200)      # pending -> confirmed -> preparing
        order.refresh_from_db()
        self.assertEqual(order.status, 'preparing')
        self.assertEqual(self.kds(order, 'ready').status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'ready')

    def test_ready_order_creates_one_dish_ready_call_for_the_waiter(self):
        order = self.guest_order()
        self.kds(order, 'ready')
        calls = ServiceCall.objects.filter(table=self.table, call_type='dish_ready')
        self.assertEqual(calls.count(), 1)
        self.assertIn('Osh', calls.get().title)
        listed = self.staff.get(f'{self.API}/calls/').json()
        self.assertEqual([c['type'] for c in listed], ['dish_ready'])

    def test_other_restaurant_staff_cannot_change_the_order(self):
        order = self.guest_order()
        client = Client()
        client.force_login(self.other_cook)
        self.assertEqual(self.kds(order, 'preparing', client).status_code, 404)

    # ---- ofitsiant chaqiruvi ----
    def call(self, table_number, call_type='waiter', scanned=True):
        """Mehmon stol QR kodini skanerlab (sessiyada stol eslab qolinadi), keyin chaqiradi."""
        if scanned:
            self.guest.get(f'/t/{self.table.qr_token}/', follow=True)
        return self.guest.post(f'{self.API}/calls/', json.dumps(
            {'table_number': table_number, 'type': call_type, 'title': 'Ofitsiantni chaqirish'}),
            content_type='application/json')

    def test_guest_call_reaches_waiter_list(self):
        res = self.call('3')
        self.assertEqual(res.status_code, 201)
        listed = self.staff.get(f'{self.API}/calls/').json()
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]['table_number'], '3')
        self.assertEqual(listed[0]['status'], 'pending')
        from django.utils import timezone
        self.assertEqual(listed[0]['time'], timezone.localtime(ServiceCall.objects.get().created_at).strftime('%H:%M'))

    def test_call_accepts_qr_token_instead_of_table_number(self):
        self.assertEqual(self.call(str(self.table.qr_token)).status_code, 201)

    def test_unknown_table_call_is_rejected_and_foreign_table_not_used(self):
        self.assertEqual(self.call('99', scanned=False).status_code, 404)
        self.assertEqual(self.call('', scanned=False).status_code, 404)
        self.assertFalse(ServiceCall.objects.exists())

    def test_guest_without_qr_cannot_call_a_table_by_guessing_its_number(self):
        res = self.call('3', scanned=False)
        self.assertEqual(res.status_code, 404)
        self.assertFalse(ServiceCall.objects.exists())

    def test_guest_cannot_call_another_table_than_the_one_scanned(self):
        other = Table.objects.get(shop=self.shop, number='1')
        self.assertEqual(self.call(other.number).status_code, 201)
        self.assertEqual(ServiceCall.objects.get().table, self.table)     # o'z stoliga ketadi, "1"-stolga emas

    @override_settings(RESTAURANT_ALLOW_TABLE_NUMBER_URL=True)
    def test_number_calls_still_work_when_the_flag_is_enabled(self):
        self.assertEqual(self.call('3', scanned=False).status_code, 201)

    def test_repeated_call_does_not_spam_the_waiter(self):
        first = self.call('3')
        second = self.call('3')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()['status'], 'already_pending')
        self.assertEqual(ServiceCall.objects.count(), 1)

    def test_waiter_accepts_and_finishes_a_call(self):
        call_id = self.call('3').json()['id']
        patch = lambda st: self.staff.patch(  # noqa: E731
            f'{self.API}/calls/{call_id}/', json.dumps({'status': st}), content_type='application/json')
        self.assertEqual(patch('accepted').status_code, 200)
        self.assertEqual(self.staff.get(f'{self.API}/calls/').json()[0]['status'], 'accepted')
        self.assertEqual(patch('done').status_code, 200)
        self.assertEqual(self.staff.get(f'{self.API}/calls/').json(), [])

    def test_other_restaurant_cannot_touch_the_call(self):
        call_id = self.call('3').json()['id']
        client = Client()
        client.force_login(self.other_waiter)
        res = client.patch(f'{self.API}/calls/{call_id}/', json.dumps({'status': 'done'}),
                           content_type='application/json')
        self.assertEqual(res.status_code, 404)

    def test_table_bill_ignores_cancelled_orders(self):
        order = self.guest_order()
        Order.objects.filter(pk=order.pk).update(status='cancelled')
        tables = self.staff.get(f'{self.API}/tables/').json()
        t3 = next(t for t in tables if t['number'] == '3')
        self.assertEqual(t3['total_bill'], 0.0)

    # ---- ofitsiant POS (R-WTR-02) ----
    def test_waiter_pos_creates_an_order_instead_of_crashing(self):
        res = self.staff.post('/seller/waiter/', {
            'action': 'create_order', 'table_id': self.table.pk, 'note': 'Achchiq bo\'lmasin',
            'items_json': json.dumps([{'product_id': self.osh.pk, 'qty': 2}]),
        })
        self.assertEqual(res.status_code, 302)
        order = Order.objects.get()
        self.assertEqual(order.shop, self.shop)
        self.assertEqual(order.table, self.table)
        self.assertEqual(order.notes, "Achchiq bo'lmasin")
        self.assertEqual(order.total_amount, Decimal('96000'))
        self.assertEqual(order.items.get().price, Decimal('48000'))
        self.assertTrue(order.order_number.startswith('GLS-'))

    def test_waiter_pos_status_change_goes_through_state_machine(self):
        order = self.guest_order()
        Order.objects.filter(pk=order.pk).update(status='cancelled')
        self.staff.post('/seller/waiter/', {'action': 'update_order_status', 'order_id': order.pk, 'status': 'ready'})
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')       # bekor qilingan buyurtma "tayyor" bo'la olmaydi

    def test_marketplace_seller_order_create_no_longer_crashes(self):
        owner = AdminUser.objects.get(username='oshxona-ega')
        client = Client()
        client.force_login(owner)
        res = client.post('/seller/orders/create/', {
            'customer_name': 'Vali', 'customer_phone': '+998901112233', 'address': 'Guliston',
            'product_ids': [self.osh.pk], 'quantities': [1], 'note': 'x',
        })
        self.assertEqual(res.status_code, 302)
        self.assertEqual(Order.objects.get().total_amount, Decimal('48000'))
