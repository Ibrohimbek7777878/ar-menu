"""
Buyurtma yaratish: yagona joy va raqam to'qnashuvi (TZ: R10-3, R10-5).
"""
import itertools
import re
import threading
from pathlib import Path
from unittest import mock

from django.db import IntegrityError, connection
from django.test import TestCase, TransactionTestCase

from accounts.models import AdminUser
from orders.creation import create_order
from orders.models import Order
from shops.models import Shop

BACKEND = Path(__file__).resolve().parent.parent


def make_shop(slug='creation-shop'):
    owner = AdminUser.objects.create_user(username=f'{slug}-ega', password='Ega-parol-123', role='shop_owner')
    return Shop.objects.create(name='Yaratish', slug=slug, owner=owner, address='a', phone='1', latitude=1, longitude=1)


def fields(shop, **extra):
    base = dict(shop=shop, customer_name='Ali', customer_phone_1='+998901112233', total_amount=10000, final_amount=10000)
    base.update(extra)
    return base


class CreateOrderTests(TestCase):

    def setUp(self):
        self.shop = make_shop()

    def test_gives_a_unique_number(self):
        a = create_order(**fields(self.shop))
        b = create_order(**fields(self.shop))
        self.assertTrue(a.order_number.startswith('GLS-'))
        self.assertNotEqual(a.order_number, b.order_number)

    def test_taken_number_is_replaced_not_crashed(self):
        create_order(**fields(self.shop, order_number='GLS-X-1'))
        with mock.patch('orders.creation.next_order_number', side_effect=['GLS-X-1', 'GLS-X-2']):
            order = create_order(**fields(self.shop))
        self.assertEqual(order.order_number, 'GLS-X-2')

    def test_explicit_number_is_used_when_free_and_replaced_when_taken(self):
        first = create_order(**fields(self.shop, order_number='GLS-EXPL-1'))
        self.assertEqual(first.order_number, 'GLS-EXPL-1')
        second = create_order(**fields(self.shop, order_number='GLS-EXPL-1'))
        self.assertNotEqual(second.order_number, 'GLS-EXPL-1')

    def test_unrelated_integrity_errors_are_not_swallowed(self):
        with self.assertRaises(IntegrityError):
            create_order(**fields(self.shop, customer_name=None))          # NOT NULL buzilishi — raqam bilan aloqasi yo'q
        self.assertEqual(Order.objects.count(), 0)

    def test_failed_attempt_does_not_break_the_outer_transaction(self):
        create_order(**fields(self.shop, order_number='GLS-Y-1'))
        with mock.patch('orders.creation.next_order_number', side_effect=['GLS-Y-1', 'GLS-Y-3']):
            create_order(**fields(self.shop))
        self.assertEqual(Order.objects.count(), 2)                          # savepoint ishladi: tashqi tranzaksiya sog'lom


class OrdersAreCreatedInOnePlaceTests(TestCase):
    """Boshqa joyda `Order.objects.create(` yozilsa, raqam to'qnashuvi himoyasi aylanib o'tiladi."""

    def test_only_the_factory_creates_orders(self):
        pattern = re.compile(r'(?<![A-Za-z0-9_])Order\.objects\.(create|get_or_create|update_or_create|bulk_create)\(')
        skip_dirs = {'venv', 'migrations', 'staticfiles', 'static', 'media', 'archive', 'node_modules', '__pycache__'}
        offenders = []
        for path in BACKEND.rglob('*.py'):
            rel = path.relative_to(BACKEND)
            if skip_dirs & set(rel.parts) or path.name.startswith('test') or path.name == 'tests.py':
                continue
            if rel.as_posix() == 'orders/creation.py':
                continue
            for number, line in enumerate(path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
                if pattern.search(line) and not line.lstrip().startswith('#'):
                    offenders.append(f'{rel}:{number}: {line.strip()}')
        self.assertEqual(offenders, [], "Order faqat orders.creation.create_order orqali yaratilsin:\n" + '\n'.join(offenders))


class ConcurrentOrderNumberTests(TransactionTestCase):
    """Bir vaqtda yaratilgan buyurtmalar bir xil raqamga tushganda hech biri yo'qolmasligi kerak (faqat PostgreSQL)."""

    def test_colliding_numbers_across_threads_all_get_saved(self):
        if connection.vendor != 'postgresql':
            self.skipTest("Haqiqiy parallellik faqat PostgreSQL'da ma'noli (SQLite butun bazani qulflaydi)")
        shop = make_shop('creation-parallel')
        errors, results = [], []
        barrier = threading.Barrier(8)
        local = threading.local()
        unique = itertools.count(1)

        def fake_next_number():
            # Har oqim avval bir xil 'GLS-P-1', 'GLS-P-2' ni tanlaydi — to'qnashuv kafolatlangan; keyin noyob raqam
            n = getattr(local, 'n', 0)
            local.n = n + 1
            return f'GLS-P-{n + 1}' if n < 2 else f'GLS-P-U{next(unique)}'

        def worker():
            from django.db import connection as thread_connection
            try:
                barrier.wait()
                results.append(create_order(**fields(shop)).order_number)
            except Exception as exc:                       # noqa: BLE001 — test xatoni to'playdi
                errors.append(repr(exc))
            finally:
                thread_connection.close()

        with mock.patch('orders.creation.next_order_number', side_effect=fake_next_number):
            threads = [threading.Thread(target=worker) for _ in range(8)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
        self.assertEqual(errors, [])
        self.assertEqual(len(results), 8)
        self.assertEqual(len(set(results)), 8)
        self.assertEqual(Order.objects.filter(shop=shop).count(), 8)
