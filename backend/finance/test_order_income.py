"""
Buyurtma → kassa kirimi testlari (TZ: R-FIN-01, R-FIN-02, R-FIN-06).

Qoidalar: kirim faqat to'langanda, bir marta, to'g'ri to'lov turi bilan, Toshkent sanasi bilan.
"""
import io
import json
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from accounts.models import AdminUser
from categories.models import Category
from finance.models import FinanceTransaction
from finance.services.order_integration import payment_method_for, record_order_payment_income
from orders.models import Order
from orders.state_machine import transition_order
from payments.models import Payment
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table


class IncomeFixture:
    def setUp(self):
        call_command('create_restaurant', name='Moliya Restorani', slug='moliya', owner='moliya-ega',
                     password='Moliya-parol-1', tables=3, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='moliya')
        self.owner = AdminUser.objects.get(username='moliya-ega')
        self.table = Table.objects.get(shop=self.shop, number='2')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='moliya-osh', price=Decimal('48000'),
                                          category=cat, is_available=True)

    def order(self, number, amount='100000', table=True, **extra):
        return Order.objects.create(
            order_number=number, customer_name='Mehmon', customer_phone_1='+998901112233', shop=self.shop,
            table=self.table if table else None, total_amount=Decimal(amount), final_amount=Decimal(amount),
            status=extra.pop('status', 'pending'), payment_status=extra.pop('payment_status', 'unpaid'), **extra,
        )

    def incomes(self):
        return FinanceTransaction.objects.filter(tx_type='income', is_cancelled=False)


class RecordIncomeTests(IncomeFixture, TestCase):

    def test_unpaid_order_records_nothing(self):
        self.assertIsNone(record_order_payment_income(self.order('M-1')))
        self.assertEqual(self.incomes().count(), 0)

    def test_paid_order_records_exactly_one_income(self):
        o = self.order('M-2', payment_status='paid')
        first = record_order_payment_income(o)
        again = record_order_payment_income(o)
        self.assertIsNotNone(first)
        self.assertIsNone(again)
        self.assertEqual(self.incomes().count(), 1)
        self.assertEqual(first.order, o)
        self.assertEqual(first.amount, Decimal('100000'))

    def test_database_constraint_blocks_a_second_active_income(self):
        o = self.order('M-3', payment_status='paid')
        record_order_payment_income(o)
        with self.assertRaises(IntegrityError), transaction.atomic():
            FinanceTransaction.objects.create(shop=self.shop, order=o, tx_type='income', stage='income',
                                              amount=Decimal('1'), title='dublikat')

    def test_cancelled_income_does_not_block_a_new_one(self):
        o = self.order('M-4', payment_status='paid')
        tx = record_order_payment_income(o)
        FinanceTransaction.objects.filter(pk=tx.pk).update(is_cancelled=True)
        self.assertIsNotNone(record_order_payment_income(o))

    def test_payment_method_is_taken_from_explicit_value_or_provider_not_always_cash(self):
        o = self.order('M-5', payment_status='paid')
        self.assertEqual(payment_method_for(o), 'cash')
        self.assertEqual(payment_method_for(o, 'card'), 'card')
        Payment.objects.create(order=o, merchant_transaction_id='m-5', provider='click', amount=o.final_amount,
                               status='paid')
        self.assertEqual(payment_method_for(o), 'card')       # avval Order'da maydon yo'q — doim naqd edi
        self.assertEqual(record_order_payment_income(o).payment_method, 'card')

    def test_income_uses_tashkent_date_not_utc(self):
        # 2026-10-20 22:30 UTC = 2026-10-21 03:30 Toshkent
        fixed = datetime(2026, 10, 20, 22, 30, tzinfo=dt_timezone.utc)
        o = self.order('M-6', payment_status='paid')
        with mock.patch('django.utils.timezone.now', return_value=fixed):
            tx = record_order_payment_income(o)
        self.assertEqual(str(tx.tx_date), '2026-10-21')

    def test_day_start_is_local_midnight(self):
        from orders.timeutils import local_day_start
        fixed = datetime(2026, 10, 20, 22, 30, tzinfo=dt_timezone.utc)      # Toshkentda 21-oktabr 03:30
        with mock.patch('django.utils.timezone.now', return_value=fixed):
            start = local_day_start()
        self.assertEqual(start.date().isoformat(), '2026-10-21')
        self.assertEqual((start.hour, start.minute), (0, 0))


class StateMachineIncomeTests(IncomeFixture, TestCase):

    def deliver(self, order):
        transition_order(order, 'confirmed', actor=self.owner)
        transition_order(order, 'ready', actor=self.owner)
        ok, _ = transition_order(order, 'delivered', actor=self.owner)
        self.assertTrue(ok)
        order.refresh_from_db()

    def test_serving_a_table_order_does_not_book_income_before_payment(self):
        o = self.order('S-1')
        self.deliver(o)
        self.assertEqual(o.status, 'delivered')
        self.assertEqual(o.payment_status, 'unpaid')
        self.assertEqual(self.incomes().count(), 0)       # avval shu yerda kirim yozilib, daromad ikki marta chiqardi

    def test_delivery_order_is_cash_on_delivery_and_booked_once(self):
        o = self.order('S-2', table=False)
        self.deliver(o)
        self.assertEqual(o.payment_status, 'paid')
        self.assertEqual(self.incomes().count(), 1)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class SettleIncomeTests(IncomeFixture, TestCase):
    API = '/api/v1/restaurant'

    def setUp(self):
        super().setUp()
        self.client = Client()
        self.client.force_login(self.owner)

    def settle(self, method='cash'):
        return self.client.post(f'{self.API}/tables/2/settle/', json.dumps({'payment_method': method}),
                                content_type='application/json')

    def test_settle_books_one_linked_income_per_order_with_chosen_method(self):
        a = self.order('T-1', amount='60000')
        b = self.order('T-2', amount='40000')
        res = self.settle('card')
        self.assertEqual(res.json()['total_settled'], 100000.0)
        txs = {t.order_id: t for t in self.incomes()}
        self.assertEqual(set(txs), {a.pk, b.pk})
        self.assertTrue(all(t.payment_method == 'card' for t in txs.values()))
        self.assertEqual(sum(t.amount for t in txs.values()), Decimal('100000'))

    def test_settling_twice_does_not_double_the_revenue(self):
        self.order('T-3', amount='50000')
        self.settle('cash')
        self.settle('cash')
        self.assertEqual(sum(t.amount for t in self.incomes()), Decimal('50000'))

    def test_serve_then_settle_counts_revenue_once(self):
        o = self.order('T-4', amount='70000')
        for status in ('confirmed', 'ready', 'delivered'):
            transition_order(o, status, actor=self.owner)
        self.assertEqual(self.incomes().count(), 0)
        self.settle('cash')
        self.assertEqual(self.incomes().count(), 1)
        self.assertEqual(sum(t.amount for t in self.incomes()), Decimal('70000'))

    def test_unknown_payment_method_falls_back_to_cash(self):
        self.order('T-5')
        self.settle('bitcoin')
        self.assertEqual(self.incomes().get().payment_method, 'cash')

    def test_settle_income_has_todays_tashkent_date(self):
        self.order('T-6')
        self.settle('cash')
        self.assertEqual(self.incomes().get().tx_date, timezone.localdate())
