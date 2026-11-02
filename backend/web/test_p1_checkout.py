"""
P1 (TZ_SOTUVGA_TAYYORLASH): mehmon buyurtmasi `/checkout/` — atomiklik, takroriy yuborish, yopiq restoran, minimal summa,
telefon, stol limiti, stolga bog'lanish muddati, to'lov usuli.
"""
import json
import threading
import time as time_module
import unittest
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.db import connection
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from categories.models import Category
from orders.models import Order, OrderItem
from products.models import Product
from shops.availability import is_within_working_hours, parse_working_hours
from shops.models import Shop
from tables_restaurant.models import Hall, Table
from web.test_p0_sale_ready import make_owner

RESTO = {'HTTP_X_PRODUCT': 'restaurant', 'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
SID = 'sid-0123456789abcdef'


class CheckoutBase(TestCase):
    def setUp(self):
        cache.clear()
        self.owner, self.shop = make_owner('ega-c', 'resto-c')
        hall = Hall.objects.create(shop=self.shop, name='Zal')
        self.table = Table.objects.create(shop=self.shop, hall=hall, number='5')
        cat = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Milliy', icon='x')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='osh-c', price=Decimal('48000'), category=cat)
        self.client = Client()

    def scan_qr(self, client=None):
        (client or self.client).get(f'/t/{self.table.qr_token}/', follow=True, HTTP_X_PRODUCT='restaurant')

    def add_to_cart(self, client=None, product=None, qty=1):
        client = client or self.client
        resp = client.post('/tma/api/cart/', data=json.dumps(
            {'action': 'add', 'product_id': (product or self.product).pk, 'quantity': qty}),
            content_type='application/json', HTTP_X_PRODUCT='restaurant')
        self.assertEqual(resp.status_code, 200, resp.content)

    def checkout(self, client=None, **data):
        return (client or self.client).post('/checkout/', data, **RESTO)

    def table_order(self, **extra):
        self.scan_qr()
        self.add_to_cart()
        return self.checkout(service_type='table', **extra)


class WorkingHoursParsingTests(TestCase):
    def test_parse_formats(self):
        from datetime import time
        self.assertEqual(parse_working_hours('08:00-22:00'), (time(8, 0), time(22, 0)))
        self.assertEqual(parse_working_hours('06:00 - 23:00'), (time(6, 0), time(23, 0)))
        self.assertEqual(parse_working_hours('9.30–18.00'), (time(9, 30), time(18, 0)))
        self.assertIsNone(parse_working_hours('24 soat'))
        self.assertIsNone(parse_working_hours('00:00-00:00'))
        self.assertIsNone(parse_working_hours('25:00-26:00'))
        self.assertIsNone(parse_working_hours(''))

    def at(self, hhmm):
        # Toshkent UTC+5: UTC vaqtini shunga moslab beramiz
        h, m = (int(x) for x in hhmm.split(':'))
        return datetime(2026, 11, 2, (h - 5) % 24, m, tzinfo=dt_timezone.utc)

    def test_inside_and_outside(self):
        self.assertTrue(is_within_working_hours('08:00-22:00', self.at('08:00')))
        self.assertTrue(is_within_working_hours('08:00-22:00', self.at('21:59')))
        self.assertFalse(is_within_working_hours('08:00-22:00', self.at('22:00')))
        self.assertFalse(is_within_working_hours('08:00-22:00', self.at('03:00')))

    def test_overnight_range(self):
        self.assertTrue(is_within_working_hours('18:00-02:00', self.at('23:30')))
        self.assertTrue(is_within_working_hours('18:00-02:00', self.at('01:00')))
        self.assertFalse(is_within_working_hours('18:00-02:00', self.at('12:00')))

    def test_garbage_text_means_open(self):
        self.assertTrue(is_within_working_hours('har kuni', self.at('03:00')))

    def test_until_midnight(self):
        self.assertTrue(is_within_working_hours('10:00-24:00', self.at('23:59')))
        self.assertFalse(is_within_working_hours('10:00-24:00', self.at('09:00')))


class CheckoutHappyPathTests(CheckoutBase):
    def test_table_order_is_created_atomically_with_items_and_history(self):
        resp = self.table_order()
        self.assertEqual(resp.status_code, 200, resp.content)
        order = Order.objects.get()
        self.assertEqual(order.table_id, self.table.pk)
        self.assertEqual(order.final_amount, Decimal('48000'))
        self.assertEqual(OrderItem.objects.filter(order=order).count(), 1)
        self.assertEqual(order.status_history.count() if hasattr(order, 'status_history') else 1, 1)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'ordering')

    def test_table_order_without_phone_does_not_share_a_customer(self):
        """Avval hamma telefonsiz mehmon bitta `Customer`ga (bir xil soxta raqam) bog'lanardi."""
        resp = self.table_order()
        self.assertEqual(resp.status_code, 200, resp.content)
        order = Order.objects.get()
        self.assertIsNone(order.customer_id)
        self.assertEqual(order.customer_phone_1, '')

    def test_phone_is_normalised_and_validated(self):
        self.scan_qr()
        self.add_to_cart()
        bad = self.checkout(service_type='table', phone='12345')
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(bad.json()['code'], 'phone')
        self.assertFalse(Order.objects.exists())
        ok = self.checkout(service_type='table', phone='90 123-45-67')
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(Order.objects.get().customer_phone_1, '+998901234567')

    def test_unknown_service_type_is_rejected(self):
        self.scan_qr()
        self.add_to_cart()
        resp = self.checkout(service_type='teleport')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_too_long_fields_are_rejected(self):
        self.scan_qr()
        self.add_to_cart()
        resp = self.checkout(service_type='table', notes='x' * 501)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['code'], 'too_long')

    def test_online_payment_is_forced_to_cash_while_disabled(self):
        self.scan_qr()
        self.add_to_cart()
        with mock.patch('web.tma_views.create_order_payment') as pay:
            resp = self.checkout(service_type='pickup', payment_method='click')
        self.assertEqual(resp.status_code, 200, resp.content)
        pay.assert_not_called()
        self.assertEqual(Order.objects.get().payment_status, 'unpaid')

    def test_pickup_order_is_not_bound_to_a_table(self):
        self.scan_qr()
        self.add_to_cart()
        resp = self.checkout(service_type='pickup')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIsNone(Order.objects.get().table_id)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'free')


class CheckoutIdempotencyTests(CheckoutBase):
    def test_double_submit_returns_the_same_order(self):
        self.scan_qr()
        self.add_to_cart()
        first = self.checkout(service_type='table', submission_id=SID)
        second = self.checkout(service_type='table', submission_id=SID)      # savat endi bo'sh, lekin kalit bir xil
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.status_code, 200, second.content)
        self.assertEqual(first.json()['order_id'], second.json()['order_id'])
        self.assertEqual(Order.objects.count(), 1)

    def test_same_key_from_another_session_does_not_see_or_reuse_the_order(self):
        """Kalit sessiyaga bog'langan: boshqa brauzer o'sha kalitni yuborsa, begona buyurtmani olmaydi, o'zinikini yaratadi."""
        self.scan_qr()
        self.add_to_cart()
        first = self.checkout(service_type='table', submission_id=SID)
        other = Client()
        self.scan_qr(other)
        self.add_to_cart(other)
        second = self.checkout(client=other, service_type='table', submission_id=SID)
        self.assertEqual(second.status_code, 200, second.content)
        self.assertNotEqual(first.json()['order_id'], second.json()['order_id'])
        self.assertEqual(Order.objects.count(), 2)

    def test_race_on_unique_key_returns_the_winner(self):
        """Ikki so'rov bir vaqtda kalitni tekshirdi (ikkalasida ham yo'q), biri yaratdi, ikkinchisi IntegrityError oladi."""
        self.scan_qr()
        self.add_to_cart()
        from web import tma_views
        real = tma_views._replay_submission
        calls = {'n': 0}

        def blind_on_first_call(request, submission_id, wants_json):
            calls['n'] += 1
            return None if calls['n'] == 1 else real(request, submission_id, wants_json)

        winner = self.checkout(service_type='table', submission_id=SID)
        self.assertEqual(winner.status_code, 200)
        self.add_to_cart()
        calls['n'] = 0                            # yutgan so'rov hisobga kirmasin: keyingi chaqiruv "ko'r" bo'lsin
        with mock.patch('web.tma_views._replay_submission', side_effect=blind_on_first_call):
            loser = self.checkout(service_type='table', submission_id=SID)
        self.assertEqual(loser.status_code, 200, loser.content)
        self.assertEqual(loser.json()['order_id'], winner.json()['order_id'])
        self.assertEqual(Order.objects.count(), 1)

    def test_malformed_key_is_ignored_not_trusted(self):
        resp = self.table_order(submission_id='a b')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIsNone(Order.objects.get().submission_id)          # kalit bo'lmasa idempotentlik yo'q, lekin buyurtma ishlaydi


class CheckoutAtomicityTests(CheckoutBase):
    def test_failure_midway_leaves_no_half_order(self):
        self.scan_qr()
        self.add_to_cart()
        with mock.patch('web.tma_views.OrderItem.objects.bulk_create', side_effect=RuntimeError('db down')):
            resp = self.checkout(service_type='table', submission_id=SID)
        self.assertEqual(resp.status_code, 503)
        self.assertTrue(resp.json()['retry'])
        self.assertFalse(Order.objects.exists())
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'free')
        # Savat saqlanib qoldi: mehmon bir tugma bilan qayta urina oladi
        retry = self.checkout(service_type='table', submission_id=SID)
        self.assertEqual(retry.status_code, 200, retry.content)
        self.assertEqual(Order.objects.count(), 1)


class CheckoutGateTests(CheckoutBase):
    def test_closed_restaurant_rejects_the_order(self):
        Shop.objects.filter(pk=self.shop.pk).update(is_open=False)
        resp = self.table_order()
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()['code'], 'closed')
        self.assertFalse(Order.objects.exists())

    @override_settings(RESTAURANT_ENFORCE_WORKING_HOURS=True)
    def test_outside_working_hours_rejects_the_order(self):
        Shop.objects.filter(pk=self.shop.pk).update(working_hours='08:00-22:00')
        night = datetime(2026, 11, 2, 22, 0, tzinfo=dt_timezone.utc)         # Toshkentda 03:00
        with mock.patch.object(timezone, 'now', return_value=night):
            resp = self.table_order()
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()['code'], 'outside_hours')
        self.assertFalse(Order.objects.exists())

    @override_settings(RESTAURANT_ENFORCE_WORKING_HOURS=True)
    def test_owner_can_switch_hours_enforcement_off(self):
        Shop.objects.filter(pk=self.shop.pk).update(
            working_hours='08:00-22:00', business_profile={'enforce_working_hours': False})
        night = datetime(2026, 11, 2, 22, 0, tzinfo=dt_timezone.utc)
        with mock.patch.object(timezone, 'now', return_value=night):
            resp = self.table_order()
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_disabled_service_type_is_rejected(self):
        Shop.objects.filter(pk=self.shop.pk).update(business_profile={'disabled_service_types': ['delivery']})
        self.scan_qr()
        self.add_to_cart()
        resp = self.checkout(service_type='delivery', phone='901234567', address='Ko\'cha 1')
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()['code'], 'service_disabled')

    def test_min_order_applies_to_delivery_only(self):
        Shop.objects.filter(pk=self.shop.pk).update(min_order=100000)
        self.scan_qr()
        self.add_to_cart()                                                 # 48 000 < 100 000
        delivery = self.checkout(service_type='delivery', phone='901234567', address="Ko'cha 1")
        self.assertEqual(delivery.status_code, 400)
        self.assertEqual(delivery.json()['code'], 'min_order')
        self.assertFalse(Order.objects.exists())
        pickup = self.checkout(service_type='pickup')
        self.assertEqual(pickup.status_code, 200, pickup.content)

    def test_delivery_fee_only_for_delivery(self):
        Shop.objects.filter(pk=self.shop.pk).update(min_order=0, delivery_fee=6000, free_delivery_from=100000)
        self.scan_qr()
        self.add_to_cart()
        resp = self.checkout(service_type='delivery', phone='901234567', address="Ko'cha 1")
        self.assertEqual(resp.status_code, 200, resp.content)
        order = Order.objects.get()
        self.assertEqual((order.delivery_fee, order.final_amount), (Decimal('6000'), Decimal('54000')))
        self.assertIsNone(order.table_id)

    def test_checkout_page_block_tells_the_ui_when_closed(self):
        Shop.objects.filter(pk=self.shop.pk).update(is_open=False)
        self.scan_qr()
        self.add_to_cart()
        resp = self.client.get('/checkout/', **{'HTTP_X_PRODUCT': 'restaurant'})
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'"orderGate"', resp.content)
        self.assertIn(b'"open": false', resp.content)


class CheckoutAbuseGuardTests(CheckoutBase):
    def test_table_with_too_many_open_orders_is_refused(self):
        for i in range(10):
            Order.objects.create(order_number=f'T-{i}', customer_name='x', customer_phone_1='', shop=self.shop,
                                 table=self.table, status='pending', total_amount=1, final_amount=1)
        resp = self.table_order()
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.json()['code'], 'table_busy')
        self.assertEqual(Order.objects.count(), 10)

    def test_finished_orders_do_not_count_towards_the_limit(self):
        for i in range(10):
            Order.objects.create(order_number=f'T-{i}', customer_name='x', customer_phone_1='', shop=self.shop,
                                 table=self.table, status='delivered', total_amount=1, final_amount=1)
        self.assertEqual(self.table_order().status_code, 200)

    def test_product_of_another_restaurant_cannot_be_ordered(self):
        other_owner, other_shop = make_owner('ega-d', 'resto-d')
        cat = Category.objects.first()
        foreign = Product.objects.create(shop=other_shop, name='Begona', slug='begona', price=Decimal('1000'), category=cat)
        self.scan_qr()
        self.add_to_cart(product=foreign)
        resp = self.checkout(service_type='table')
        self.assertIn(resp.status_code, (400, 409))
        self.assertFalse(Order.objects.exists())

    def test_too_many_cart_lines_are_refused(self):
        self.scan_qr()
        self.add_to_cart()
        with override_settings(RESTAURANT_MAX_ORDER_LINES=0):
            resp = self.checkout(service_type='table')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Order.objects.exists())


class TableBindingTtlTests(CheckoutBase):
    def test_binding_expires_after_ttl_and_rescan_renews_it(self):
        self.scan_qr()
        self.add_to_cart()
        real_time = time_module.time
        with override_settings(RESTAURANT_TABLE_BINDING_TTL_SECONDS=3600):
            with mock.patch('time.time', return_value=real_time() + 3601):
                resp = self.checkout(service_type='table')
            self.assertEqual(resp.status_code, 400, resp.content)       # stol sessiyadan chiqib ketdi
            self.assertEqual(resp.json()['code'], 'no_table')
            self.scan_qr()                                              # qayta skanerlash muddatni yangilaydi
            self.add_to_cart()
            self.assertEqual(self.checkout(service_type='table').status_code, 200)


class TelegramCardNoteTests(CheckoutBase):
    def test_guest_note_is_on_the_staff_card(self):
        from notifications.order_card import order_card_text
        resp = self.table_order(notes="Yong'oqqa allergiyam bor")
        self.assertEqual(resp.status_code, 200, resp.content)
        text = order_card_text(Order.objects.get())
        self.assertIn("Yong'oqqa allergiyam bor", text)
        self.assertNotIn('TMA buyurtma', text)

    def test_card_has_no_note_line_when_guest_wrote_nothing(self):
        from notifications.order_card import order_card_text
        self.table_order()
        self.assertNotIn('Izoh', order_card_text(Order.objects.get()))


class GuestServiceCallTests(CheckoutBase):
    """OrdersPage tugmalari (ofitsiant, hisob, choy, non) haqiqiy chaqiruv yaratadi: faqat QR skanerlagan mehmon, o'z stoli uchun."""

    CALLS = '/api/v1/restaurant/calls/'

    def call(self, client, **extra):
        payload = {'table_number': '5', 'type': 'tea', 'title': 'Choy yangilash', **extra}
        return client.post(self.CALLS, data=json.dumps(payload), content_type='application/json', HTTP_X_PRODUCT='restaurant')

    def test_guest_with_qr_creates_a_call_for_the_scanned_table(self):
        self.scan_qr()
        resp = self.call(self.client)
        self.assertEqual(resp.status_code, 201, resp.content)
        from tables_restaurant.models import ServiceCall
        self.assertEqual(ServiceCall.objects.get().table_id, self.table.pk)

    def test_guest_without_qr_cannot_create_a_call(self):
        resp = self.call(Client())
        self.assertIn(resp.status_code, (400, 401, 403, 404))        # stol topilmadi: chaqiruv yaratilmadi
        from tables_restaurant.models import ServiceCall
        self.assertFalse(ServiceCall.objects.exists())


@unittest.skipUnless(connection.vendor == 'postgresql', "haqiqiy parallel so'rovlar faqat PostgreSQL'da mazmunli (SQLite butun bazani qulflaydi)")
class ConcurrentCheckoutTests(TransactionTestCase):
    """Bir brauzerdan bir vaqtda kelgan ikki bir xil so'rov = BITTA buyurtma, ikkalasiga ham o'sha javob."""

    def setUp(self):
        cache.clear()
        self.owner, self.shop = make_owner('ega-p', 'resto-p')
        hall = Hall.objects.create(shop=self.shop, name='Zal')
        self.table = Table.objects.create(shop=self.shop, hall=hall, number='5')
        cat = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Milliy', icon='x')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='osh-p', price=Decimal('48000'), category=cat)

    def prepared_session_cookie(self):
        first = Client()
        first.get(f'/t/{self.table.qr_token}/', follow=True, HTTP_X_PRODUCT='restaurant')
        first.post('/tma/api/cart/', data=json.dumps({'action': 'add', 'product_id': self.product.pk, 'quantity': 1}),
                   content_type='application/json', HTTP_X_PRODUCT='restaurant')
        return {k: v.value for k, v in first.cookies.items()}

    def test_two_simultaneous_identical_requests_make_one_order(self):
        cookies = self.prepared_session_cookie()
        barrier = threading.Barrier(2)
        results = []

        def worker():
            client = Client()
            for name, value in cookies.items():
                client.cookies[name] = value
            barrier.wait()
            try:
                resp = client.post('/checkout/', {'service_type': 'table', 'submission_id': SID}, **RESTO)
                results.append((resp.status_code, resp.json()))
            finally:
                connection.close()

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=60)

        self.assertEqual(len(results), 2, results)
        self.assertEqual(Order.objects.count(), 1, results)
        self.assertEqual([code for code, _ in results], [200, 200], results)
        self.assertEqual(results[0][1]['order_id'], results[1][1]['order_id'])
