"""
Restoran Moliyasi Admin API testlari (Finance Admin API).
range_summary, storno bekor qilish, qarzlar/nasiyalar daftari, CSV eksport va IDOR himoyasi.
"""
from decimal import Decimal
import io

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from finance.models import DebtRecord, FinanceCategory, FinanceTransaction
from shops.models import Shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class FinanceAdminApiTests(TestCase):
    API = '/api/restaurant/admin/v1/finance/'

    def setUp(self):
        call_command(
            'create_restaurant',
            name='Finance Resto',
            slug='finance-resto',
            owner='finance-owner',
            password='Parol-Finance-123',
            tables=1,
            stdout=io.StringIO(),
        )
        self.shop = Shop.objects.get(slug='finance-resto')
        self.owner = AdminUser.objects.get(username='finance-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])

        # Boshqa restoran (IDOR tekshiruvi uchun)
        call_command(
            'create_restaurant',
            name='Other Resto',
            slug='other-resto',
            owner='other-owner',
            password='Parol-Other-123',
            tables=1,
            stdout=io.StringIO(),
        )
        self.other_shop = Shop.objects.get(slug='other-resto')
        self.other_owner = AdminUser.objects.get(username='other-owner')
        self.other_owner.is_approved = True
        self.other_owner.save(update_fields=['is_approved'])

        # Ofitsiant
        self.waiter = AdminUser.objects.create_user(
            username='finance-waiter',
            password='Waiter-Parol-123',
            role='waiter',
            shop=self.shop,
            is_staff=False,
            is_approved=True,
        )

        self.client_owner = Client()
        self.client_owner.force_login(self.owner)

        self.client_waiter = Client()
        self.client_waiter.force_login(self.waiter)

        self.client_other = Client()
        self.client_other.force_login(self.other_owner)

    def test_unauthenticated_access_denied(self):
        res = Client().get(self.API + 'summary/')
        self.assertIn(res.status_code, (401, 403))

    def test_waiter_cannot_access_finance(self):
        res = self.client_waiter.get(self.API + 'summary/')
        self.assertEqual(res.status_code, 403)

        res_tx = self.client_waiter.get(self.API + 'transactions/')
        self.assertEqual(res_tx.status_code, 403)

    def test_owner_finance_summary(self):
        res = self.client_owner.get(self.API + 'summary/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('net_cash_flow', data)
        self.assertEqual(data['net_cash_flow'], 0.0)

    def test_create_income_and_expense_transactions(self):
        # 1. Kirim yaratish
        res_inc = self.client_owner.post(self.API + 'transactions/', {
            'tx_type': 'income',
            'amount': '150000',
            'payment_method': 'cash',
            'title': 'Kassa to\'ldirish',
        }, content_type='application/json')
        self.assertEqual(res_inc.status_code, 201)
        inc_data = res_inc.json()
        self.assertEqual(inc_data['amount'], 150000.0)
        self.assertEqual(inc_data['type'], 'income')

        # 2. Chiqim yaratish
        res_exp = self.client_owner.post(self.API + 'transactions/', {
            'tx_type': 'expense',
            'amount': '50000',
            'payment_method': 'cash',
            'title': 'Go\'sht xaridi',
        }, content_type='application/json')
        self.assertEqual(res_exp.status_code, 201)

        # 3. Summary tekshirish: Kirim = 150000, Chiqim = 50000, Net = 100000
        res_sum = self.client_owner.get(self.API + 'summary/')
        self.assertEqual(res_sum.status_code, 200)
        sum_data = res_sum.json()
        self.assertEqual(sum_data['income'], 150000.0)
        self.assertEqual(sum_data['expense'], 50000.0)
        self.assertEqual(sum_data['net_cash_flow'], 100000.0)

    def test_storno_transaction_cancellation(self):
        tx = FinanceTransaction.objects.create(
            shop=self.shop,
            tx_type='income',
            amount=Decimal('200000'),
            payment_method='cash',
            title='Adashib kiritilgan',
        )

        # Sababsiz bekor qilish 400 berishi kerak
        res_fail = self.client_owner.post(f'{self.API}transactions/{tx.id}/cancel/', {
            'reason': '   ',
        }, content_type='application/json')
        self.assertEqual(res_fail.status_code, 400)

        # To'g'ri sabab bilan storno qilish
        res_ok = self.client_owner.post(f'{self.API}transactions/{tx.id}/cancel/', {
            'reason': 'Noto\'g\'ri kiritilgan summa',
        }, content_type='application/json')
        self.assertEqual(res_ok.status_code, 200)

        tx.refresh_from_db()
        self.assertTrue(tx.is_cancelled)
        self.assertEqual(tx.cancel_reason, 'Noto\'g\'ri kiritilgan summa')

        # Qayta bekor qilish 400 berishi kerak
        res_again = self.client_owner.post(f'{self.API}transactions/{tx.id}/cancel/', {
            'reason': 'Yana bekor qilish',
        }, content_type='application/json')
        self.assertEqual(res_again.status_code, 400)

    def test_debts_create_and_pay_flow(self):
        # 1. Nasiya yaratish
        res_create = self.client_owner.post(self.API + 'debts/', {
            'debtor_name': 'Akmal Aka',
            'phone': '+998901234567',
            'total_amount': '500000',
            'due_date': '2026-11-01',
            'note': 'To\'y uchun ziyofat qarzi',
        }, content_type='application/json')
        self.assertEqual(res_create.status_code, 201)
        debt_data = res_create.json()
        debt_id = debt_data['id']
        self.assertEqual(debt_data['remaining_amount'], 500000.0)
        self.assertFalse(debt_data['is_settled'])

        # 2. Qisman to'lov (200,000 so'm)
        res_pay1 = self.client_owner.post(f'{self.API}debts/{debt_id}/pay/', {
            'amount': '200000',
            'payment_method': 'cash',
            'note': 'Birinchi bo\'lib berdi',
        }, content_type='application/json')
        self.assertEqual(res_pay1.status_code, 200)
        p1_data = res_pay1.json()
        self.assertEqual(p1_data['remaining_amount'], 300000.0)
        self.assertFalse(p1_data['is_settled'])

        # Kirim tranzaksiyasi avtomatik yaratilganini tekshirish
        self.assertTrue(FinanceTransaction.objects.filter(shop=self.shop, debt_id=debt_id, amount=Decimal('200000')).exists())

        # 3. Ortiqcha to'lov xatosi (400,000 > 300,000)
        res_pay_err = self.client_owner.post(f'{self.API}debts/{debt_id}/pay/', {
            'amount': '400000',
            'payment_method': 'cash',
        }, content_type='application/json')
        self.assertEqual(res_pay_err.status_code, 400)

        # 4. Qolgan to'lovni to'liq to'lash (300,000 so'm)
        res_pay2 = self.client_owner.post(f'{self.API}debts/{debt_id}/pay/', {
            'amount': '300000',
            'payment_method': 'card',
        }, content_type='application/json')
        self.assertEqual(res_pay2.status_code, 200)
        p2_data = res_pay2.json()
        self.assertEqual(p2_data['remaining_amount'], 0.0)
        self.assertTrue(p2_data['is_settled'])

    def test_categories_list(self):
        FinanceCategory.objects.create(shop=self.shop, name='Kommunal xarajatlar', category_type='expense')
        res = self.client_owner.get(self.API + 'categories/')
        self.assertEqual(res.status_code, 200)
        names = [c['name'] for c in res.json()]
        self.assertIn('Kommunal xarajatlar', names)

    def test_export_csv_with_utf8_bom(self):
        FinanceTransaction.objects.create(
            shop=self.shop,
            tx_type='income',
            amount=Decimal('100000'),
            payment_method='cash',
            title='Choyxona tushumi',
        )
        res = self.client_owner.get(self.API + 'export.csv')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'text/csv; charset=utf-8')
        # UTF-8 BOM mavjudligini tekshirish (\xef\xbb\xbf)
        self.assertTrue(res.content.startswith(b'\xef\xbb\xbf'))
        self.assertIn('Choyxona tushumi', res.content.decode('utf-8'))

    def test_tenant_isolation_idor_prevention(self):
        other_tx = FinanceTransaction.objects.create(
            shop=self.other_shop,
            tx_type='income',
            amount=Decimal('50000'),
            title='Other Shop Tx',
        )
        other_debt = DebtRecord.objects.create(
            shop=self.other_shop,
            person_name='Other Person',
            amount=Decimal('100000'),
        )

        # finance-owner other_resto ning tranzaksiyasini bekor qila olmasligi shart (404)
        res_cancel = self.client_owner.post(f'{self.API}transactions/{other_tx.id}/cancel/', {
            'reason': 'IDOR attack attempt',
        }, content_type='application/json')
        self.assertEqual(res_cancel.status_code, 404)

        # finance-owner other_resto ning qarziga to'lov qila olmasligi shart (404)
        res_pay = self.client_owner.post(f'{self.API}debts/{other_debt.id}/pay/', {
            'amount': '10000',
            'payment_method': 'cash',
        }, content_type='application/json')
        self.assertEqual(res_pay.status_code, 404)
