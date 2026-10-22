"""
Ombor mantig'i (TZ: R10-4).

Qoidalar:
- `stock > 0` — qoldiq yuritiladi; `stock == 0` — yuritilmaydi (restoran taomlari odatda shunday, nazorat stop-list orqali).
- Zaxira (`reserve_stock`) hammasi-yoki-hech narsa; yetkazilganda qoldiq kamayadi; bekor qilinganda qoldiq o'zgarmaydi.
"""
import io
import itertools
import json
import threading
from decimal import Decimal

from django.core.management import call_command
from django.db import connection
from django.test import Client, TestCase, TransactionTestCase, override_settings

from categories.models import Category
from orders.creation import create_order
from orders.inventory import StockReservation, reserve_stock
from orders.models import Order, OrderItem
from orders.state_machine import transition_order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

_seq = itertools.count(1)


def make_restaurant():
    n = next(_seq)
    call_command('create_restaurant', name=f'Ombor {n}', slug=f'ombor-{n}', owner=f'ombor-ega-{n}',
                 password='Ombor-parol-123', tables=3, stdout=io.StringIO())
    return Shop.objects.get(slug=f'ombor-{n}')


def make_product(shop, name, stock):
    n = next(_seq)
    category, _ = Category.objects.get_or_create(name='Taomlar', defaults={'name_uz': 'Taomlar', 'name_ru': 'Taomlar'})
    return Product.objects.create(shop=shop, name=name, slug=f'{shop.slug}-p{n}', price=Decimal('20000'),
                                  category=category, is_available=True, stock=stock)


def make_order(shop, *lines, status='pending'):
    """lines: (product, quantity)"""
    total = sum((p.price * q for p, q in lines), Decimal('0'))
    order = create_order(shop=shop, customer_name='Ali', customer_phone_1='+998901112233',
                         total_amount=total, final_amount=total, status=status)
    for product, qty in lines:
        OrderItem.objects.create(order=order, product=product, product_name=product.name, price=product.price,
                                 unit='dona', quantity=qty, total=product.price * qty)
    return order


class ReservationTests(TestCase):

    def setUp(self):
        self.shop = make_restaurant()

    def test_untracked_products_are_not_reserved_and_never_block_an_order(self):
        plov = make_product(self.shop, 'Osh', stock=0)
        ok, _ = reserve_stock(make_order(self.shop, (plov, 50)))
        self.assertTrue(ok)
        self.assertFalse(StockReservation.objects.exists())

    def test_tracked_stock_is_reserved_and_the_last_unit_goes_to_one_buyer(self):
        cake = make_product(self.shop, 'Tort', stock=1)
        first, second = make_order(self.shop, (cake, 1)), make_order(self.shop, (cake, 1))
        self.assertTrue(reserve_stock(first)[0])
        ok, message = reserve_stock(second)
        self.assertFalse(ok)
        self.assertIn('Tort', message)

    def test_failure_leaves_no_partial_reservations(self):
        plenty = make_product(self.shop, 'Non', stock=10)
        scarce = make_product(self.shop, 'Tort', stock=1)
        order = make_order(self.shop, (plenty, 2), (scarce, 5))
        ok, _ = reserve_stock(order)
        self.assertFalse(ok)
        self.assertFalse(StockReservation.objects.filter(order=order).exists())      # "Non" zaxirasi ham qolmadi

    def test_released_reservation_frees_the_stock_again(self):
        cake = make_product(self.shop, 'Tort', stock=1)
        order = make_order(self.shop, (cake, 1))
        self.assertTrue(reserve_stock(order)[0])
        transition_order(order, 'cancelled')
        self.assertTrue(reserve_stock(make_order(self.shop, (cake, 1)))[0])


class StockMovementTests(TestCase):

    def setUp(self):
        self.shop = make_restaurant()

    def deliver(self, order):
        Order.objects.filter(pk=order.pk).update(status='ready')
        order.refresh_from_db()
        ok, message = transition_order(order, 'delivered')
        self.assertTrue(ok, message)

    def test_delivery_reduces_tracked_stock_and_converts_the_reservation(self):
        cake = make_product(self.shop, 'Tort', stock=5)
        order = make_order(self.shop, (cake, 2))
        reserve_stock(order)
        self.deliver(order)
        cake.refresh_from_db()
        self.assertEqual(cake.stock, 3)
        self.assertEqual(StockReservation.objects.get(order=order).status, 'converted')

    def test_selling_the_last_unit_hides_the_product_instead_of_making_it_unlimited(self):
        cake = make_product(self.shop, 'Tort', stock=2)
        self.deliver(make_order(self.shop, (cake, 2)))
        cake.refresh_from_db()
        self.assertEqual((cake.stock, cake.is_available), (0, False))

    def test_stock_never_goes_negative(self):
        cake = make_product(self.shop, 'Tort', stock=1)
        self.deliver(make_order(self.shop, (cake, 4)))
        cake.refresh_from_db()
        self.assertEqual(cake.stock, 0)

    def test_untracked_dish_stays_untracked(self):
        plov = make_product(self.shop, 'Osh', stock=0)
        self.deliver(make_order(self.shop, (plov, 3)))
        plov.refresh_from_db()
        self.assertEqual((plov.stock, plov.is_available), (0, True))

    def test_cancelling_never_adds_stock(self):
        """Eski xato: har bekor qilishda +qty — restoran taomi (stock=0) bekor qilingach "qoldiqli" bo'lib qolardi."""
        plov = make_product(self.shop, 'Osh', stock=0)
        cake = make_product(self.shop, 'Tort', stock=4)
        order = make_order(self.shop, (plov, 3), (cake, 2))
        reserve_stock(order)
        ok, _ = transition_order(order, 'cancelled', reason='mijoz fikridan qaytdi')
        self.assertTrue(ok)
        plov.refresh_from_db()
        cake.refresh_from_db()
        self.assertEqual(plov.stock, 0)
        self.assertEqual(cake.stock, 4)
        self.assertEqual(StockReservation.objects.get(order=order).status, 'released')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class GuestCheckoutStockTests(TestCase):
    """Mehmon buyurtmasi (3D menyu savati): yetmasa 400 va buyurtma yaratilmaydi."""

    def setUp(self):
        self.shop = make_restaurant()
        self.table = Table.objects.filter(shop=self.shop).first()

    def post(self, product, qty):
        body = {'table_id': str(self.table.qr_token), 'items': [{'dish_id': product.id, 'qty': qty}]}
        return Client().post('/v1/orders/', data=json.dumps(body), content_type='application/json')

    def test_not_enough_stock_is_rejected_and_nothing_is_saved(self):
        cake = make_product(self.shop, 'Tort', stock=1)
        response = self.post(cake, 2)
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn('Tort', response.json()['error'])
        self.assertFalse(Order.objects.exists())
        self.assertFalse(StockReservation.objects.exists())

    def test_enough_stock_is_reserved_with_the_order(self):
        cake = make_product(self.shop, 'Tort', stock=3)
        response = self.post(cake, 2)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(StockReservation.objects.get().quantity, 2)

    def test_untracked_dish_is_never_blocked(self):
        plov = make_product(self.shop, 'Osh', stock=0)
        self.assertEqual(self.post(plov, 20).status_code, 200)


class ConcurrentStockTests(TransactionTestCase):
    """Parallel so'rovlarda qoldiq manfiy bo'lmasligi va oxirgi dona bir kishiga ketishi (faqat PostgreSQL)."""

    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest("Haqiqiy parallellik faqat PostgreSQL'da ma'noli (SQLite butun bazani qulflaydi)")
        self.shop = make_restaurant()

    def run_threads(self, targets):
        errors = []
        barrier = threading.Barrier(len(targets))

        def runner(target):
            try:
                barrier.wait()
                target()
            except Exception as exc:                     # noqa: BLE001 — test xatoni to'playdi
                errors.append(repr(exc))
            finally:
                connection.close()

        threads = [threading.Thread(target=runner, args=(t,)) for t in targets]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        return errors

    def test_ten_buyers_for_three_units_exactly_three_win(self):
        cake = make_product(self.shop, 'Tort', stock=3)
        orders = [make_order(self.shop, (cake, 1)) for _ in range(10)]
        results = []
        errors = self.run_threads([lambda o=o: results.append(reserve_stock(o)[0]) for o in orders])
        self.assertEqual(errors, [])
        self.assertEqual(results.count(True), 3)
        self.assertEqual(StockReservation.objects.filter(status='active').count(), 3)

    def test_opposite_item_order_does_not_deadlock(self):
        a = make_product(self.shop, 'A', stock=5)
        b = make_product(self.shop, 'B', stock=5)
        first, second = make_order(self.shop, (a, 1), (b, 1)), make_order(self.shop, (b, 1), (a, 1))
        errors = self.run_threads([lambda: reserve_stock(first), lambda: reserve_stock(second)] * 3)
        self.assertEqual(errors, [])

    def test_parallel_deliveries_keep_stock_consistent(self):
        cake = make_product(self.shop, 'Tort', stock=6)
        orders = [make_order(self.shop, (cake, 1), status='ready') for _ in range(6)]

        def deliver(order):
            fresh = Order.objects.get(pk=order.pk)
            transition_order(fresh, 'delivered')

        errors = self.run_threads([lambda o=o: deliver(o) for o in orders])
        self.assertEqual(errors, [])
        cake.refresh_from_db()
        self.assertEqual(cake.stock, 0)                   # yo'qolgan yangilanish yo'q: 6 - 6
        self.assertFalse(cake.is_available)


class TableSettlementStockTests(TestCase):
    """Stol hisobi yopilganda buyurtmalar 'delivered' bo'ladi: qoldig'i yuritiladigan taom bir marta kamayadi."""

    def setUp(self):
        from orders.application.services import RestaurantOrderService
        self.service = RestaurantOrderService
        self.shop = make_restaurant()
        self.table = Table.objects.filter(shop=self.shop).first()

    def order_on_table(self, *lines):
        order = make_order(self.shop, *lines)
        Order.objects.filter(pk=order.pk).update(table=self.table, payment_status='unpaid')
        return order

    def test_settling_reduces_tracked_stock_once_and_leaves_untracked_alone(self):
        cake = make_product(self.shop, 'Tort', stock=5)
        plov = make_product(self.shop, 'Osh', stock=0)
        self.order_on_table((cake, 2), (plov, 4))
        first = self.service.settle_table_bill(self.table.number, shop=self.shop)
        self.assertEqual(first['status'], 'success')
        self.service.settle_table_bill(self.table.number, shop=self.shop)          # ikkinchi marta: yopiladigan narsa yo'q
        cake.refresh_from_db()
        plov.refresh_from_db()
        self.assertEqual(cake.stock, 3)
        self.assertEqual(plov.stock, 0)
