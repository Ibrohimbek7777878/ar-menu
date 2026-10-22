"""
Moliya: parallel so'rovlarda pul ikki marta hisoblanmasligi (TZ: R10-3). Faqat PostgreSQL'da ma'noli (CI'da yuradi).
"""
import io
import json
import threading
from decimal import Decimal

from django.core.management import call_command
from django.db import connection
from django.test import Client, TransactionTestCase, override_settings

from accounts.models import AdminUser
from finance.models import DebtRecord, FinanceTransaction
from finance.services.order_integration import record_order_payment_income
from orders.application.services import RestaurantOrderService
from orders.creation import create_order
from orders.models import Order, OrderItem
from shops.models import Shop
from tables_restaurant.models import Table


def run_in_threads(targets):
    errors = []
    barrier = threading.Barrier(len(targets))

    def runner(target):
        try:
            barrier.wait()
            target()
        except Exception as exc:                          # noqa: BLE001 — test xatoni to'playdi
            errors.append(repr(exc))
        finally:
            connection.close()

    threads = [threading.Thread(target=runner, args=(t,)) for t in targets]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return errors


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class FinanceConcurrencyTests(TransactionTestCase):

    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest("Haqiqiy parallellik faqat PostgreSQL'da ma'noli (SQLite butun bazani qulflaydi)")
        call_command('create_restaurant', name='Parallel', slug='parallel-fin', owner='parallel-ega',
                     password='Parallel-parol-1', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='parallel-fin')
        self.owner = AdminUser.objects.get(username='parallel-ega')

    def paid_order(self, table=None, amount=50000):
        order = create_order(shop=self.shop, table=table, customer_name='Ali', customer_phone_1='+998901112233',
                             total_amount=Decimal(amount), final_amount=Decimal(amount), status='pending',
                             payment_status='unpaid')
        return order

    def test_parallel_debt_payments_never_exceed_the_debt(self):
        debt = DebtRecord.objects.create(shop=self.shop, debt_type='customer', person_name='Karim',
                                         amount=Decimal('100000'))
        statuses = []

        def pay():
            client = Client()
            client.force_login(self.owner)
            response = client.post(f'/api/v1/restaurant/finance/debts/{debt.pk}/pay/', json.dumps({'amount': 40000}),
                                   content_type='application/json')
            statuses.append(response.status_code)

        errors = run_in_threads([pay] * 6)
        self.assertEqual(errors, [])
        debt.refresh_from_db()
        self.assertEqual(statuses.count(201), 2, statuses)              # 40 000 + 40 000; uchinchisi qoldiqdan (20 000) ko'p
        self.assertEqual(debt.paid_amount, Decimal('80000'))
        self.assertEqual(FinanceTransaction.objects.filter(debt=debt).count(), 2)

    def test_parallel_income_recording_writes_one_transaction(self):
        order = self.paid_order()
        Order.objects.filter(pk=order.pk).update(payment_status='paid')

        def record():
            record_order_payment_income(Order.objects.get(pk=order.pk), payment_method='cash')

        errors = run_in_threads([record] * 6)
        self.assertEqual(errors, [])
        self.assertEqual(FinanceTransaction.objects.filter(order=order, tx_type='income', is_cancelled=False).count(), 1)

    def test_parallel_table_settlement_counts_the_money_once(self):
        table = Table.objects.filter(shop=self.shop).first()
        first, second = self.paid_order(table, 30000), self.paid_order(table, 20000)
        for order in (first, second):
            OrderItem.objects.create(order=order, product=None, product_name='Osh', price=order.final_amount,
                                     unit='dona', quantity=1, total=order.final_amount)
        results = []

        def settle():
            results.append(RestaurantOrderService.settle_table_bill(table.number, shop=self.shop))

        errors = run_in_threads([settle] * 4)
        self.assertEqual(errors, [])
        settled = sorted(r['total_settled'] for r in results)
        self.assertEqual(settled, [0.0, 0.0, 0.0, 50000.0])              # pulni faqat bitta so'rov oldi
        income = FinanceTransaction.objects.filter(shop=self.shop, tx_type='income', is_cancelled=False)
        self.assertEqual(sum(t.amount for t in income), Decimal('50000'))
        self.assertEqual(income.count(), 2)
