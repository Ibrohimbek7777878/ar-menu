"""
`seed_load` buyrug'i (hajmli sinov bazasi, ROADMAP_MASSHTAB S0-2) sinovlari: xavfsizlik to'sig'i, to'liqlik va yaxlitlik,
model cheklovlariga moslik, kassa yozuvlarining haqiqiy xizmatga mosligi, idempotentlik, signal/outbox yo'qligi.

Kichik masshtab (2 restoran x 8 taom x 120 buyurtma); vaqt qotirilgan (deterministik); tarmoqqa chiqilmaydi.
"""
import io
import socket
from datetime import datetime, timedelta
from decimal import Decimal
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.models import Count, Sum
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from accounts.models import AdminUser
from finance.models import FinanceCategory, FinanceTransaction
from finance.services.order_integration import record_order_payment_income
from notifications.models import BotMessage, NotificationLog, OutboxEvent
from orders.creation import create_order
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table
from web.management.commands.seed_load import ACTIVE_STATUSES, Command

TASHKENT = ZoneInfo('Asia/Tashkent')
FROZEN_NOW = datetime(2026, 10, 30, 14, 30, tzinfo=TASHKENT)
SMALL = dict(shops=2, products_per_shop=8, tables_per_shop=5, orders=120, days=30, batch=50)


def seed(**kwargs):
    out = io.StringIO()
    call_command('seed_load', stdout=out, **{**SMALL, **kwargs})
    return out.getvalue()


def load_orders():
    return Order.all_objects.filter(shop__slug__startswith='load-')


@override_settings(DEBUG=True)
class SeedLoadDataTests(TestCase):
    """Bir marta yaratilgan kichik ma'lumot ustida: sonlar, yaxlitlik, cheklovlar."""

    @classmethod
    def setUpTestData(cls):
        with mock.patch('django.utils.timezone.now', return_value=FROZEN_NOW):
            cls.output = seed()

    def test_counts_match_the_arguments(self):
        shops = Shop.objects.filter(slug__startswith='load-')
        self.assertEqual(sorted(shops.values_list('slug', flat=True)), ['load-resto-1', 'load-resto-2'])
        self.assertEqual(Shop.objects.count(), 2)
        for shop in shops:
            self.assertEqual(Product.objects.filter(shop=shop).count(), 8)
            self.assertEqual(Table.objects.filter(shop=shop).count(), 5)
            self.assertTrue(Order.objects.filter(shop=shop).exists(), shop.slug)           # buyurtmalar ikkala restoranga tushgan
            self.assertEqual(AdminUser.objects.filter(shop=shop, role='shop_owner').count(), 1)
        self.assertEqual(load_orders().count(), 120)
        self.assertEqual(Order.all_objects.count(), 120)
        self.assertIn('yangi 120', self.output)
        self.assertIn('buyurtma/s', self.output)                                             # qisqa xulosa chop etildi

    def test_every_order_has_two_to_five_distinct_lines(self):
        for order in Order.objects.annotate(lines=Count('items')):
            self.assertTrue(2 <= order.lines <= 5, order.order_number)
        for order in Order.objects.prefetch_related('items'):
            products = [item.product_id for item in order.items.all()]
            self.assertEqual(len(products), len(set(products)), order.order_number)

    def test_foreign_keys_are_consistent(self):
        connection.check_constraints()                                                       # FK yaxlitligi (SQLite va PostgreSQL)
        self.assertFalse(OrderItem.objects.filter(product__isnull=True).exists())
        for order in Order.objects.select_related('table', 'shop'):
            if order.table_id:
                self.assertEqual(order.table.shop_id, order.shop_id, order.order_number)
        for item in OrderItem.objects.select_related('order', 'product'):
            self.assertEqual(item.product.shop_id, item.order.shop_id)
            self.assertEqual(item.product_name, item.product.name)
        for tx in FinanceTransaction.objects.select_related('order', 'category'):
            self.assertEqual(tx.order.shop_id, tx.shop_id)
            self.assertEqual(tx.category.shop_id, tx.shop_id)
            self.assertEqual(tx.category.category_type, 'income')

    def test_order_numbers_are_unique_and_fit_the_column(self):
        numbers = list(Order.all_objects.values_list('order_number', flat=True))
        self.assertEqual(len(numbers), len(set(numbers)))
        self.assertTrue(all(n.startswith('LD-') and len(n) <= 20 for n in numbers))

    def test_amounts_follow_the_model_rules(self):
        orders = Order.objects.annotate(lines_total=Sum('items__total'))
        self.assertEqual(orders.count(), 120)
        for order in orders:
            for money in (order.total_amount, order.discount_amount, order.delivery_fee, order.final_amount):
                self.assertIsInstance(money, Decimal)
            self.assertEqual(order.total_amount, order.lines_total, order.order_number)              # summa = qatorlar yig'indisi
            self.assertEqual(order.final_amount, order.total_amount - order.discount_amount + order.delivery_fee)
            self.assertGreater(order.final_amount, 0)
            self.assertLess(order.discount_amount, order.total_amount)
        for item in OrderItem.objects.all():
            self.assertGreater(item.quantity, 0)
            self.assertEqual(item.total, item.price * item.quantity)
        self.assertTrue(Order.objects.filter(discount_amount__gt=0).exists())                       # formula chegirmali/yetkazishli
        self.assertTrue(Order.objects.filter(delivery_fee__gt=0).exists())                          # buyurtmalarda ham tekshirilgan

    def test_statuses_and_timestamps_are_realistic(self):
        orders = list(Order.objects.all())
        by_status = {}
        for order in orders:
            by_status[order.status] = by_status.get(order.status, 0) + 1
            self.assertLessEqual(order.created_at, FROZEN_NOW)                                     # kelajakdagi buyurtma yo'q
            self.assertGreaterEqual(order.created_at, FROZEN_NOW - timedelta(days=31))
            self.assertLessEqual(order.updated_at, FROZEN_NOW)
            self.assertGreaterEqual(order.updated_at, order.created_at)
            if order.status == 'delivered':
                self.assertIsNotNone(order.delivered_at)
                self.assertGreater(order.delivered_at, order.created_at)
                self.assertLessEqual(order.delivered_at, FROZEN_NOW)
            if order.status == 'cancelled':
                self.assertIsNotNone(order.cancelled_at)
                self.assertTrue(order.cancel_reason)
                self.assertEqual(order.payment_status, 'unpaid')
            if order.payment_status == 'paid':
                self.assertEqual(order.status, 'delivered')
        self.assertGreater(by_status['delivered'], 0.7 * len(orders))                              # asosan yakunlangan
        self.assertLess(by_status.get('cancelled', 0), 0.2 * len(orders))                          # bekor qilinganlar oz
        today = timezone.localtime(FROZEN_NOW).date()
        active_today = [o for o in orders if o.status in ACTIVE_STATUSES and timezone.localtime(o.created_at).date() == today]
        self.assertGreaterEqual(len(active_today), 10)                                             # bugun faol buyurtmalar bor
        self.assertGreater(len({timezone.localtime(o.created_at).date() for o in orders}), 10)    # kunlarga yoyilgan
        paid = sum(1 for o in orders if o.payment_status == 'paid')
        self.assertTrue(0.65 <= paid / len(orders) <= 0.95, paid)                                  # --paid-ratio 0.8 atrofida

    def test_tables_with_active_orders_are_not_free(self):
        busy = {}
        for order in Order.objects.filter(status__in=ACTIVE_STATUSES, table__isnull=False):
            busy[order.table_id] = True
        self.assertTrue(busy)
        for table in Table.objects.all():
            self.assertEqual(table.status != 'free', table.pk in busy, table.number)

    def test_cash_register_income_exists_exactly_for_paid_orders(self):
        paid_ids = set(Order.objects.filter(payment_status='paid').values_list('pk', flat=True))
        incomes = FinanceTransaction.objects.filter(tx_type='income', is_cancelled=False)
        self.assertEqual(set(incomes.values_list('order_id', flat=True)), paid_ids)
        self.assertEqual(incomes.count(), len(paid_ids))                                           # har biriga bitta kirim
        self.assertFalse(FinanceTransaction.objects.exclude(tx_type='income').exists())
        for tx in incomes.select_related('order'):
            self.assertEqual(tx.amount, tx.order.final_amount)
            self.assertEqual(tx.stage, 'income')
            self.assertIn(tx.payment_method, ('cash', 'card'))
            self.assertEqual(tx.tx_date, timezone.localtime(tx.order.delivered_at).date())         # Toshkent kuni bo'yicha
            self.assertEqual(tx.created_at, tx.order.delivered_at)

    def test_cash_register_rows_match_the_real_payment_service(self):
        """Kassa yozuvi `record_order_payment_income` yozadigan yozuv bilan bir xil bo'lishi kerak (sana/vaqtdan tashqari)."""
        compared = {'table': 0, 'no_table': 0}
        for with_table in (True, False):
            tx = (FinanceTransaction.objects.select_related('order')
                  .filter(order__table__isnull=not with_table).order_by('id').first())
            self.assertIsNotNone(tx, f"stol={with_table}")
            seeded = {name: getattr(tx, name) for name in (
                'shop_id', 'order_id', 'category_id', 'tx_type', 'stage', 'amount', 'payment_method', 'title', 'notes',
                'is_cancelled', 'created_by_id', 'color')}
            order = Order.objects.get(pk=tx.order_id)
            FinanceTransaction.objects.filter(pk=tx.pk).delete()
            real = record_order_payment_income(order, payment_method=seeded['payment_method'])
            self.assertIsNotNone(real)
            for name, value in seeded.items():
                self.assertEqual(getattr(real, name), value, f"{name} (stol={with_table})")
            compared['table' if with_table else 'no_table'] += 1
        self.assertEqual(compared, {'table': 1, 'no_table': 1})

    def test_no_outbox_notification_or_bot_rows_are_created(self):
        self.assertEqual(OutboxEvent.objects.count(), 0)
        self.assertEqual(NotificationLog.objects.count(), 0)
        self.assertEqual(BotMessage.objects.count(), 0)
        # nazorat: signal haqiqatan ham ishlaydi (oddiy yo'l bilan yaratilgan buyurtma outbox hodisasini yozadi), demak yuqoridagi 0 mazmunli
        shop = Shop.objects.get(slug='load-resto-1')
        create_order(shop=shop, customer_name='Nazorat', customer_phone_1='+998901112233', total_amount=1000, final_amount=1000)
        self.assertEqual(OutboxEvent.objects.filter(event_type='order.created').count(), 1)

    def test_default_guest_restaurant_setting_is_not_touched(self):
        from notifications.models import AppSetting
        self.assertFalse(AppSetting.objects.filter(key='restaurant_default_shop').exists())


@override_settings(DEBUG=True)
class SeedLoadBehaviourTests(TestCase):
    """Har sinov o'z bazasida: idempotentlik, deterministiklik, argumentlar, xavfsizlik."""

    def setUp(self):
        patcher = mock.patch('django.utils.timezone.now', return_value=FROZEN_NOW)
        patcher.start()
        self.addCleanup(patcher.stop)

    def snapshot(self):
        return (
            Shop.objects.count(), Product.all_objects.count(), Table.all_objects.count(), Order.all_objects.count(),
            OrderItem.objects.count(), FinanceTransaction.objects.count(), FinanceCategory.objects.count(),
            AdminUser.objects.count(),
        )

    def test_rerun_with_same_arguments_adds_nothing(self):
        seed()
        before = self.snapshot()
        output = seed()
        self.assertEqual(self.snapshot(), before)
        self.assertIn('yaratiladi 0', output)

    def test_rerun_with_larger_target_tops_up_only_the_missing_orders(self):
        seed()
        first = set(Order.all_objects.values_list('order_number', 'total_amount'))
        before = self.snapshot()
        seed(orders=170)
        after = self.snapshot()
        self.assertEqual(Order.all_objects.count(), 170)
        self.assertEqual(after[:3], before[:3])                                                      # restoran/taom/stol qayta yaratilmadi
        self.assertEqual(after[6:], before[6:])                                                      # kategoriya va egalar ham
        self.assertTrue(first <= set(Order.all_objects.values_list('order_number', 'total_amount')))   # eskilari o'zgarmadi
        numbers = sorted(Order.all_objects.values_list('order_number', flat=True))
        self.assertEqual(numbers, [f'LD-{n:09d}' for n in range(1, 171)])                            # uzluksiz, nusxasiz
        self.assertFalse(Order.objects.annotate(c=Count('items')).filter(c__lt=2).exists())
        self.assertEqual(FinanceTransaction.objects.count(), Order.objects.filter(payment_status='paid').count())

    def test_smaller_target_creates_nothing(self):
        seed()
        before = self.snapshot()
        seed(orders=50)
        self.assertEqual(self.snapshot(), before)

    def test_same_seed_gives_same_data_and_other_seed_differs(self):
        def run_and_fingerprint(seed_value):
            savepoint = connection.savepoint()
            seed(seed=seed_value)
            rows = list(Order.all_objects.order_by('order_number').values_list(
                'order_number', 'shop__slug', 'total_amount', 'status', 'created_at', 'payment_status'))
            items = list(OrderItem.objects.order_by('order__order_number', 'product__slug').values_list(
                'order__order_number', 'product__slug', 'quantity'))
            connection.savepoint_rollback(savepoint)          # keyingi urinish toza bazada
            return rows, items
        first = run_and_fingerprint(7)
        self.assertEqual(len(first[0]), 120)
        self.assertEqual(run_and_fingerprint(7), first)
        self.assertNotEqual(run_and_fingerprint(8), first)

    def test_orders_zero_creates_reference_data_only(self):
        seed(orders=0)
        self.assertEqual(Shop.objects.count(), 2)
        self.assertEqual(Product.objects.count(), 16)
        self.assertEqual(Order.all_objects.count(), 0)
        self.assertEqual(FinanceTransaction.objects.count(), 0)

    def test_shops_arguments_are_respected(self):
        seed(shops=3, products_per_shop=6, tables_per_shop=2, orders=60)
        self.assertEqual(Shop.objects.count(), 3)
        self.assertEqual(Product.objects.count(), 18)
        self.assertEqual(Table.objects.count(), 6)
        self.assertEqual(Order.objects.count(), 60)

    def test_paid_ratio_extremes(self):
        seed(paid_ratio=0.0)
        self.assertFalse(Order.objects.filter(payment_status='paid').exists())
        self.assertEqual(FinanceTransaction.objects.count(), 0)

    def test_invalid_arguments_are_rejected_before_any_write(self):
        for bad in ({'products_per_shop': 4}, {'tables_per_shop': 0}, {'tables_per_shop': 201}, {'shops': 0}, {'orders': -1},
                    {'days': 0}, {'paid_ratio': 1.5}, {'paid_ratio': -0.1}, {'batch': 0}):
            with self.assertRaises(CommandError, msg=str(bad)):
                seed(**bad)
        self.assertFalse(Shop.objects.exists())

    def test_never_touches_the_network(self):
        with mock.patch.object(socket.socket, 'connect', side_effect=AssertionError('tarmoqqa chiqish taqiqlangan')), \
                mock.patch('socket.getaddrinfo', side_effect=AssertionError('DNS taqiqlangan')):
            seed()
        self.assertEqual(load_orders().count(), 120)

    def test_automatic_timestamps_are_restored_even_after_a_failure(self):
        fields = [(Order, 'created_at', 'auto_now_add'), (Order, 'updated_at', 'auto_now'),
                  (FinanceTransaction, 'created_at', 'auto_now_add')]
        with mock.patch.object(Command, '_insert_batch', side_effect=RuntimeError('sinov xatosi')):
            with self.assertRaises(RuntimeError):
                seed()
        for model, name, flag in fields:
            self.assertTrue(getattr(model._meta.get_field(name), flag), f'{model.__name__}.{name}')
        seed()
        for model, name, flag in fields:
            self.assertTrue(getattr(model._meta.get_field(name), flag), f'{model.__name__}.{name}')

    def test_primary_keys_are_resolved_by_number_when_the_database_does_not_return_them(self):
        seed(orders=30)
        orders = list(Order.all_objects.order_by('id'))
        expected = {o.order_number: o.pk for o in orders}
        for order in orders:
            order.pk = None
        Command._ensure_pks(orders)
        self.assertEqual({o.order_number: o.pk for o in orders}, expected)

    def test_analyze_runs_only_on_postgresql(self):
        command = Command(stdout=io.StringIO())
        # Test haqiqiy baza turiga bog'liq emas (PG da ham, SQLite da ham o'tadi): turini aniq belgilaymiz
        with mock.patch.object(connection, 'vendor', 'sqlite'), CaptureQueriesContext(connection) as sqlite_run:
            command._analyze()
        self.assertEqual([q for q in sqlite_run.captured_queries if 'ANALYZE' in q['sql']], [])
        with mock.patch.object(connection, 'vendor', 'postgresql'), CaptureQueriesContext(connection) as pg_run:
            command._analyze()
        analyzed = sorted(q['sql'] for q in pg_run.captured_queries if 'ANALYZE' in q['sql'])
        self.assertEqual(analyzed, sorted(f'ANALYZE "{t}"' for t in (
            'orders', 'order_items', 'finance_transactions', 'products', 'restaurant_tables')))

    def test_refuses_when_database_has_other_restaurants(self):
        owner = AdminUser.objects.create_user(username='boshqa-ega', password='Boshqa-parol-9!', role='shop_owner')
        Shop.objects.create(name='Haqiqiy restoran', slug='haqiqiy', owner=owner, address='x', phone='+998900000000',
                            latitude=40.0, longitude=68.0)
        with self.assertRaisesMessage(CommandError, "'load-' bilan boshlanmagan"):
            seed()
        self.assertFalse(Shop.objects.filter(slug__startswith='load-').exists())
        seed(allow_existing=True)
        self.assertEqual(load_orders().count(), 120)
        self.assertEqual(Order.all_objects.filter(shop__slug='haqiqiy').count(), 0)                  # begona restoranga tegilmadi

    def test_refuses_when_a_foreign_restaurant_appears_after_a_load_run(self):
        seed()
        owner = AdminUser.objects.create_user(username='boshqa-ega', password='Boshqa-parol-9!', role='shop_owner')
        Shop.objects.create(name='Haqiqiy', slug='haqiqiy', owner=owner, address='x', phone='+998900000000',
                            latitude=40.0, longitude=68.0)
        with self.assertRaises(CommandError):
            seed(orders=200)
        self.assertEqual(Order.all_objects.count(), 120)


class SeedLoadGuardTests(TestCase):
    @override_settings(DEBUG=False)
    def test_refuses_outside_debug_without_explicit_env(self):
        with mock.patch.dict('os.environ', {}, clear=False) as env:
            env.pop('LOAD_SEED_ALLOWED', None)
            with self.assertRaisesMessage(CommandError, 'DEBUG=True'):
                seed()
        self.assertFalse(Shop.objects.exists())
        self.assertFalse(Order.all_objects.exists())

    @override_settings(DEBUG=False)
    def test_other_env_values_do_not_unlock_it(self):
        for value in ('0', 'true', 'yes', ''):
            with mock.patch.dict('os.environ', {'LOAD_SEED_ALLOWED': value}):
                with self.assertRaises(CommandError, msg=value):
                    seed()
        self.assertFalse(Shop.objects.exists())

    @override_settings(DEBUG=False)
    def test_explicit_env_allows_outside_debug(self):
        with mock.patch.dict('os.environ', {'LOAD_SEED_ALLOWED': '1'}):
            seed()
        self.assertEqual(load_orders().count(), 120)
