"""
Restoran moliyasi REST API testlari (TZ: R-FIN-03, R-FIN-04, R-FIN-05, R-FIN-07).
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from finance.models import DebtRecord, FinanceTransaction
from orders.audit import AuditLog
from orders.models import Order
from shops.models import Shop
from tables_restaurant.models import Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class FinanceApiTests(TestCase):
    API = '/api/v1/restaurant/finance'

    def setUp(self):
        call_command('create_restaurant', name='Kassa Restorani', slug='kassa', owner='kassa-ega',
                     password='Kassa-parol-12', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='kassa')
        self.owner = AdminUser.objects.get(username='kassa-ega')
        self.waiter = AdminUser.objects.create_user(username='kassa-ofitsiant', password='Ofitsiant-parol-1',
                                                    role='waiter', shop=self.shop)
        other_owner = AdminUser.objects.create_user(username='boshqa-ega-2', password='x-12345-y', role='shop_owner')
        self.other_shop = Shop.objects.create(name='Boshqa', slug='boshqa-k', owner=other_owner, address='a',
                                              phone='1', latitude=1, longitude=1)
        other_owner.shop = self.other_shop
        other_owner.save(update_fields=['shop'])
        self.other_owner = other_owner
        self.c = Client()
        self.c.force_login(self.owner)

    def post(self, url, payload, client=None):
        return (client or self.c).post(f'{self.API}/{url}', json.dumps(payload), content_type='application/json')

    def debt(self, amount='200000', kind='receivable'):
        res = self.post('debts/', {'type': kind, 'person_name': 'Karim', 'total_amount': amount})
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()

    # ---- ruxsat ----
    def test_only_managers_can_write_finance(self):
        for url, payload in (('tx/', {'type': 'income', 'amount': 1000}),
                             ('debts/', {'type': 'receivable', 'person_name': 'A', 'total_amount': 1000})):
            self.assertIn(Client().post(f'{self.API}/{url}', json.dumps(payload),
                                        content_type='application/json').status_code, (401, 403))
            w = Client()
            w.force_login(self.waiter)
            self.assertEqual(self.post(url, payload, w).status_code, 403)
        self.assertEqual(FinanceTransaction.objects.count(), 0)

    # ---- qo'lda kirim/chiqim ----
    def test_manual_income_and_expense_are_stored_on_the_server_with_audit(self):
        res = self.post('tx/', {'type': 'income', 'amount': '150 000', 'payment_method': 'card',
                                'category': 'Choy', 'description': 'Qo\'shimcha tushum'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.post('tx/', {'type': 'expense', 'amount': 50000}).status_code, 201)
        got = self.c.get(f'{self.API}/').json()['transactions']
        self.assertEqual({(t['type'], t['amount']) for t in got}, {('income', 150000.0), ('expense', 50000.0)})
        self.assertEqual({t['source_type'] for t in got}, {'manual'})
        income = FinanceTransaction.objects.get(tx_type='income')
        self.assertEqual((income.payment_method, income.shop, income.created_by), ('card', self.shop, self.owner))
        self.assertTrue(AuditLog.objects.filter(target_type='finance_tx', target_id=income.pk).exists())

    def test_invalid_amounts_are_rejected(self):
        for bad in ('', 'abc', '0', '-5', 'nan', 'inf', '1e999', '99999999999999999999', None):
            res = self.post('tx/', {'type': 'income', 'amount': bad})
            self.assertEqual(res.status_code, 400, f'amount={bad!r}')
        self.assertEqual(self.post('tx/', {'type': 'transfer', 'amount': 5}).status_code, 400)
        self.assertEqual(FinanceTransaction.objects.count(), 0)

    def test_decimal_amounts_are_read_correctly_not_digit_stripped(self):
        # Avval frontend replace(/\D/g,'') qilardi: "150000.50" -> 15 000 050, "1,5" -> 15
        self.post('tx/', {'type': 'income', 'amount': '150000.50'})
        self.post('tx/', {'type': 'income', 'amount': '1,5'})
        self.assertEqual(sorted(FinanceTransaction.objects.values_list('amount', flat=True)),
                         [Decimal('1.50'), Decimal('150000.50')])

    # ---- nasiya / qarz ----
    def test_debt_cannot_be_overpaid(self):
        debt = self.debt('200000')
        res = self.post(f'debts/{debt["id"]}/pay/', {'amount': 1000000, 'payment_method': 'cash'})
        self.assertEqual(res.status_code, 400)
        self.assertIn("ko'p", res.json()['error'])
        self.assertEqual(FinanceTransaction.objects.count(), 0)         # ortiqcha kirim yozilmadi
        self.assertEqual(DebtRecord.objects.get().paid_amount, Decimal('0'))

    def test_partial_then_full_payment_books_the_right_cash_movements(self):
        debt = self.debt('200000')
        first = self.post(f'debts/{debt["id"]}/pay/', {'amount': 50000, 'payment_method': 'card'})
        self.assertEqual(first.json()['debt']['status'], 'partially_paid')
        self.assertEqual(first.json()['debt']['remaining_amount'], 150000.0)
        second = self.post(f'debts/{debt["id"]}/pay/', {'amount': 150000})
        self.assertEqual(second.json()['debt']['status'], 'settled')
        incomes = FinanceTransaction.objects.filter(tx_type='income')
        self.assertEqual(sum(t.amount for t in incomes), Decimal('200000'))
        self.assertEqual(self.post(f'debts/{debt["id"]}/pay/', {'amount': 1}).status_code, 400)  # yopilgan qarz

    def test_supplier_debt_payment_is_an_expense(self):
        debt = self.debt('80000', kind='payable')
        self.post(f'debts/{debt["id"]}/pay/', {'amount': 30000})
        tx = FinanceTransaction.objects.get()
        self.assertEqual((tx.tx_type, tx.amount), ('expense', Decimal('30000')))

    # ---- storno ----
    def test_cancel_requires_a_reason_and_keeps_the_record(self):
        tx_id = self.post('tx/', {'type': 'income', 'amount': 10000}).json()['id']
        self.assertEqual(self.post(f'tx/{tx_id}/cancel/', {'reason': ''}).status_code, 400)
        res = self.post(f'tx/{tx_id}/cancel/', {'reason': 'Xato kiritilgan'})
        self.assertEqual(res.status_code, 200)
        tx = FinanceTransaction.objects.get(pk=tx_id)
        self.assertTrue(tx.is_cancelled)
        self.assertEqual((tx.cancel_reason, tx.cancelled_by), ('Xato kiritilgan', self.owner))
        self.assertIsNotNone(tx.cancelled_at)                              # yozuv o'chirilmagan
        self.assertEqual(self.post(f'tx/{tx_id}/cancel/', {'reason': 'yana'}).status_code, 400)

    def test_cancelling_a_debt_payment_restores_the_debt(self):
        debt = self.debt('100000')
        pay = self.post(f'debts/{debt["id"]}/pay/', {'amount': 100000}).json()
        self.assertEqual(pay['debt']['status'], 'settled')
        res = self.post(f'tx/{pay["transaction"]["id"]}/cancel/', {'reason': 'Pul kelmadi'})
        self.assertEqual(res.json()['debt']['remaining_amount'], 100000.0)
        self.assertEqual(DebtRecord.objects.get().status, 'pending')

    def test_receipt_income_cannot_be_cancelled_from_here(self):
        table = Table.objects.get(shop=self.shop, number='1')
        order = Order.objects.create(order_number='GLS-X-1', customer_name='x', customer_phone_1='1', shop=self.shop,
                                     table=table, total_amount=Decimal('50000'), final_amount=Decimal('50000'),
                                     status='ready', payment_status='unpaid')
        self.c.post(f'/api/v1/restaurant/tables/1/settle/', json.dumps({'payment_method': 'cash'}),
                    content_type='application/json')
        tx = FinanceTransaction.objects.get(order=order)
        res = self.post(f'tx/{tx.pk}/cancel/', {'reason': 'xato'})
        self.assertEqual(res.status_code, 400)
        tx.refresh_from_db()
        self.assertFalse(tx.is_cancelled)
        self.assertEqual(self.c.get(f'{self.API}/').json()['transactions'][0]['source_type'], 'receipt')

    # ---- boshqa restoran ----
    def test_other_restaurant_cannot_see_or_touch_the_records(self):
        debt = self.debt('100000')
        tx_id = self.post('tx/', {'type': 'income', 'amount': 5000}).json()['id']
        intruder = Client()
        intruder.force_login(self.other_owner)
        self.assertEqual(intruder.get(f'{self.API}/').json(), {'transactions': [], 'debts': []})
        self.assertEqual(self.post(f'debts/{debt["id"]}/pay/', {'amount': 1}, intruder).status_code, 404)
        self.assertEqual(self.post(f'tx/{tx_id}/cancel/', {'reason': 'x'}, intruder).status_code, 404)
