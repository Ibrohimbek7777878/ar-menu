"""
Moliya yozuvlarini QO'LDA tahrirlash testlari (TZ_MULTITENANT Bosqich 5): majburiy sabab, o'zgarmas tarix, manba qulfi,
storno qulfi, qarz chegarasi, hisobotlar, ruxsat, tenant izolyatsiyasi, audit, atomiklik, N+1, poyga.
"""
import io
import json
import threading
import time
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib import admin as django_admin
from django.core.management import call_command
from django.db import IntegrityError, connection, transaction
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from finance.models import (
    DebtRecord,
    FinanceCategory,
    FinanceRevision,
    FinanceTransaction,
    ImmutableRecordError,
)
from orders.audit import AuditLog
from orders.creation import create_order
from orders.timeutils import local_today
from shops.models import Shop

API = '/api/restaurant/admin/v1/finance/'


def make_shop(slug, owner_name):
    call_command('create_restaurant', name=slug.title(), slug=slug, owner=owner_name, password='Parol-Finance-123',
                 tables=1, stdout=io.StringIO())
    shop = Shop.objects.get(slug=slug)
    owner = AdminUser.objects.get(username=owner_name)
    owner.is_approved = True
    owner.save(update_fields=['is_approved'])
    return shop, owner


def logged_in(user, **client_kwargs):
    client = Client(**client_kwargs)
    client.force_login(user)
    return client


def patch(client, path, body):
    return client.patch(path, data=json.dumps(body), content_type='application/json')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class FinanceEditBase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.shop, cls.owner = make_shop('edit-resto', 'edit-owner')
        cls.other_shop, cls.other_owner = make_shop('edit-other', 'edit-other-owner')
        cls.cat_meat = FinanceCategory.objects.create(shop=cls.shop, name="Go'sht", category_type='expense')
        cls.cat_rent = FinanceCategory.objects.create(shop=cls.shop, name='Ijara', category_type='expense')
        cls.other_cat = FinanceCategory.objects.create(shop=cls.other_shop, name='Begona', category_type='expense')
        cls.waiter = AdminUser.objects.create_user(username='edit-waiter', password='Waiter-Parol-123', role='waiter',
                                                   shop=cls.shop, is_approved=True)
        cls.hostess = AdminUser.objects.create_user(username='edit-hostess', password='Hostess-Parol-123', role='hostess',
                                                    shop=cls.shop, is_approved=True)
        cls.manager = AdminUser.objects.create_user(username='edit-manager', password='Manager-Parol-123', role='shop_manager',
                                                    shop=cls.shop, is_approved=True, first_name='Malika', last_name='Rahimova')
        cls.cashier = AdminUser.objects.create_user(username='edit-cashier', password='Cashier-Parol-123', role='waiter',
                                                    shop=cls.shop, is_approved=True, extra_capabilities=['finance'])

    def setUp(self):
        self.client_owner = logged_in(self.owner)

    def make_tx(self, **kwargs):
        fields = dict(shop=self.shop, tx_type='expense', stage='expense', amount=Decimal('100000'), payment_method='cash',
                      title="Go'sht xaridi", notes='Bozordan', tx_date=local_today() - timedelta(days=2),
                      category=self.cat_meat, created_by=self.owner)
        fields.update(kwargs)
        return FinanceTransaction.objects.create(**fields)

    def make_debt(self, **kwargs):
        fields = dict(shop=self.shop, debt_type='customer', person_name='Akmal Aka', phone='+998901234567',
                      amount=Decimal('500000'), notes='Ziyofat', due_date=local_today() + timedelta(days=10))
        fields.update(kwargs)
        return DebtRecord.objects.create(**fields)

    def tx_url(self, tx, suffix=''):
        return f'{API}transactions/{tx.pk}/{suffix}'

    def debt_url(self, debt, suffix=''):
        return f'{API}debts/{debt.pk}/{suffix}'


# ─── Kassa operatsiyasi ───────────────────────────────────────────────────────────────────────────

class TransactionEditTests(FinanceEditBase):

    def test_each_field_can_be_edited_and_is_recorded_old_to_new(self):
        yesterday = local_today() - timedelta(days=1)
        cases = [
            ('amount', {'amount': '175000'}, 'amount', {'old': '100000.00', 'new': '175000.00'}),
            ('category', {'category_id': self.cat_rent.pk}, 'category', {'old': "Go'sht", 'new': 'Ijara',
                                                                        'old_id': self.cat_meat.pk, 'new_id': self.cat_rent.pk}),
            ('title', {'title': 'Yangi mazmun'}, 'title', {'old': "Go'sht xaridi", 'new': 'Yangi mazmun'}),
            ('notes', {'notes': 'Tuzatildi'}, 'notes', {'old': 'Bozordan', 'new': 'Tuzatildi'}),
            ('tx_date', {'tx_date': yesterday.isoformat()}, 'tx_date',
             {'old': (local_today() - timedelta(days=2)).isoformat(), 'new': yesterday.isoformat()}),
            ('payment_method', {'payment_method': 'card'}, 'payment_method', {'old': 'cash', 'new': 'card'}),
        ]
        for name, body, key, expected in cases:
            with self.subTest(field=name):
                tx = self.make_tx()
                res = patch(self.client_owner, self.tx_url(tx), {**body, 'reason': 'Kiritishda adashganman'})
                self.assertEqual(res.status_code, 200, res.content)
                data = res.json()
                self.assertEqual(data['id'], tx.pk)
                self.assertEqual(data['revision']['changes'], {key: expected})
                self.assertEqual(data['revision']['reason'], 'Kiritishda adashganman')
                self.assertEqual(data['revision']['revision_no'], 1)
                self.assertTrue(data['edited'])
                self.assertEqual(data['revisions_count'], 1)
                tx.refresh_from_db()
                self.assertEqual(FinanceRevision.objects.filter(target_type='transaction', target_id=tx.pk).count(), 1)
                if name == 'amount':
                    self.assertEqual(tx.amount, Decimal('175000.00'))
                    self.assertEqual(data['amount'], 175000.0)
                elif name == 'category':
                    self.assertEqual(tx.category_id, self.cat_rent.pk)
                    self.assertEqual(data['category_name'], 'Ijara')
                elif name == 'title':
                    self.assertEqual(tx.title, 'Yangi mazmun')
                elif name == 'notes':
                    self.assertEqual(tx.notes, 'Tuzatildi')
                    self.assertEqual(data['notes'], 'Tuzatildi')
                elif name == 'tx_date':
                    self.assertEqual(tx.tx_date, yesterday)
                else:
                    self.assertEqual(tx.payment_method, 'card')

    def test_aliases_of_field_names_are_accepted(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {'description': 'Boshqa nom', 'note': 'izoh', 'date': local_today().isoformat(),
                                                         'category': self.cat_rent.pk, 'reason': 'Taxallus bilan'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(set(res.json()['revision']['changes']), {'title', 'notes', 'tx_date', 'category'})

    def test_only_really_changed_fields_are_recorded(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {
            'amount': '100000', 'title': "Go'sht xaridi", 'payment_method': 'bank', 'notes': 'Bozordan', 'reason': 'Faqat usul'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(list(res.json()['revision']['changes']), ['payment_method'])
        self.assertEqual(res.json()['payment_method_display'], 'Bank hisobi')

    def test_clearing_the_category(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {'category_id': None, 'reason': 'Kategoriyasiz qoldirildi'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['revision']['changes']['category']['new'], None)
        tx.refresh_from_db()
        self.assertIsNone(tx.category_id)
        self.assertEqual(res.json()['category_name'], 'Umumiy')

    def test_reason_is_mandatory_and_bounded(self):
        tx = self.make_tx()
        for reason in (None, '', '    ', 'abcd', ' ab ', 'x' * 301, 12, ['sabab'], True):
            with self.subTest(reason=reason):
                body = {'amount': '1' if reason is None else '123456'}
                if reason is not None:
                    body['reason'] = reason
                res = patch(self.client_owner, self.tx_url(tx), body)
                self.assertEqual(res.status_code, 400, res.content)
                self.assertEqual(res.json()['field'], 'reason')
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('100000'))
        self.assertFalse(FinanceRevision.objects.exists())
        # chegaralar: aynan 5 va aynan 300 belgi qabul qilinadi
        ok_min = patch(self.client_owner, self.tx_url(tx), {'amount': '111', 'reason': 'x' * 5})
        ok_max = patch(self.client_owner, self.tx_url(tx), {'amount': '222', 'reason': 'y' * 300})
        self.assertEqual((ok_min.status_code, ok_max.status_code), (200, 200))

    def test_reason_is_trimmed_before_storing(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': '   Chek bilan solishtirildi  '})
        self.assertEqual(res.json()['revision']['reason'], 'Chek bilan solishtirildi')

    def test_nothing_changed_is_rejected_without_a_revision(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '100000.00', 'title': "Go'sht xaridi", 'reason': 'Hech narsa yo`q'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'no_changes')
        res = patch(self.client_owner, self.tx_url(tx), {'reason': 'Faqat sabab yuborildi'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'no_changes')
        self.assertFalse(FinanceRevision.objects.exists())

    def test_amount_validation(self):
        tx = self.make_tx()
        for bad in ('0', '-5', 'abc', '', '1e99999', 'NaN', 'Infinity', '1000000000000', [1], True):
            with self.subTest(amount=bad):
                res = patch(self.client_owner, self.tx_url(tx), {'amount': bad, 'reason': 'Tekshiruv summasi'})
                self.assertEqual(res.status_code, 400, (bad, res.content))
                self.assertEqual(res.json()['field'], 'amount')
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('100000'))
        # kasr tiyin va bo'sh joyli yozuv qabul qilinadi
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '1 500,50', 'reason': 'Kasr summa'})
        self.assertEqual(res.status_code, 200)
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('1500.50'))

    def test_date_validation(self):
        tx = self.make_tx()
        tomorrow = (local_today() + timedelta(days=1)).isoformat()
        for bad in (tomorrow, '1999-12-31', 'kecha', '2026-13-40', '', None, 20260101):
            with self.subTest(date=bad):
                res = patch(self.client_owner, self.tx_url(tx), {'tx_date': bad, 'reason': 'Sana tekshiruvi'})
                self.assertEqual(res.status_code, 400, (bad, res.content))
                self.assertEqual(res.json()['field'], 'tx_date')
        self.assertFalse(FinanceRevision.objects.exists())

    def test_future_dated_record_can_still_be_edited_when_the_date_is_not_touched(self):
        """Eski kiritishda kelajak sana ruxsat etilgan edi: boshqa maydonni tuzatishga to'sqinlik qilmaydi."""
        future = local_today() + timedelta(days=3)
        tx = self.make_tx(tx_date=future)
        res = patch(self.client_owner, self.tx_url(tx), {'tx_date': future.isoformat(), 'amount': '90000', 'reason': 'Summa tuzatildi'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(list(res.json()['revision']['changes']), ['amount'])

    def test_text_and_choice_validation(self):
        tx = self.make_tx()
        for body, field in (
            ({'title': '   '}, 'title'), ({'title': 'x' * 256}, 'title'), ({'notes': 'x' * 2001}, 'notes'),
            ({'payment_method': 'bitcoin'}, 'payment_method'), ({'category_id': self.other_cat.pk}, 'category_id'),
            ({'category_id': 'abc'}, 'category_id'), ({'category_id': 999999}, 'category_id'),
        ):
            with self.subTest(body=body):
                res = patch(self.client_owner, self.tx_url(tx), {**body, 'reason': 'Tekshiruv sababi'})
                self.assertEqual(res.status_code, 400, (body, res.content))
                self.assertEqual(res.json()['field'], field)
        self.assertFalse(FinanceRevision.objects.exists())

    def test_type_and_system_fields_cannot_be_changed(self):
        tx = self.make_tx()
        other_order = create_order(shop=self.shop, customer_name='A', customer_phone_1='+998901112233',
                                   total_amount=Decimal('1000'), final_amount=Decimal('1000'), status='pending', payment_status='paid')
        for body, field in (
            ({'type': 'income'}, 'type'), ({'tx_type': 'income'}, 'type'), ({'is_cancelled': True}, 'is_cancelled'),
            ({'order_id': other_order.pk}, 'order_id'), ({'shop': self.other_shop.pk}, 'shop'), ({'stage': 'income'}, 'stage'),
            ({'debt_id': 1}, 'debt_id'),
        ):
            with self.subTest(body=body):
                res = patch(self.client_owner, self.tx_url(tx), {**body, 'amount': '5', 'reason': 'Taqiqlangan maydon'})
                self.assertEqual(res.status_code, 400, (body, res.content))
                self.assertEqual(res.json()['field'], field)
        tx.refresh_from_db()
        self.assertEqual((tx.tx_type, tx.shop_id, tx.is_cancelled, tx.order_id, tx.amount), ('expense', self.shop.pk, False, None, Decimal('100000')))
        # o'zgarmaydigan joriy tur yuborilsa — xato emas
        res = patch(self.client_owner, self.tx_url(tx), {'type': 'expense', 'amount': '7', 'reason': 'Tur o`zgarmadi'})
        self.assertEqual(res.status_code, 200)

    def test_receipt_income_from_an_order_is_locked_with_explanation(self):
        order = create_order(shop=self.shop, customer_name='Ali', customer_phone_1='+998901112233', total_amount=Decimal('50000'),
                             final_amount=Decimal('50000'), status='pending', payment_status='paid')
        tx = self.make_tx(tx_type='income', stage='income', order=order, amount=Decimal('50000'))
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '1', 'reason': 'Buyurtmani tuzatish'})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['code'], 'source_locked')
        self.assertIn('Buyurtmalar bo\'limida', res.json()['error'])
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('50000'))
        self.assertFalse(FinanceRevision.objects.exists())
        listed = {t['id']: t for t in self.client_owner.get(API + 'transactions/').json()['items']}[tx.pk]
        self.assertEqual((listed['can_edit'], listed['edit_lock'], listed['source_type']), (False, 'source_locked', 'receipt'))

    def test_debt_payment_transaction_is_locked(self):
        debt = self.make_debt()
        pay = self.client_owner.post(self.debt_url(debt, 'pay/'), {'amount': '100000', 'payment_method': 'cash'}, content_type='application/json')
        self.assertEqual(pay.status_code, 200)
        tx = FinanceTransaction.objects.get(debt=debt)
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '1', 'reason': 'Qarz to`lovini tuzatish'})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['code'], 'source_locked')
        self.assertIn('Qarzlar bo\'limida', res.json()['error'])
        debt.refresh_from_db()
        self.assertEqual(debt.paid_amount, Decimal('100000'))

    def test_cancelled_transaction_is_locked_but_history_stays(self):
        tx = self.make_tx()
        self.assertEqual(patch(self.client_owner, self.tx_url(tx), {'amount': '120000', 'reason': 'Birinchi tuzatish'}).status_code, 200)
        cancel = self.client_owner.post(self.tx_url(tx, 'cancel/'), {'reason': 'Umuman kerak emas'}, content_type='application/json')
        self.assertEqual(cancel.status_code, 200)
        self.assertEqual(cancel.json()['edit_lock'], 'cancelled')
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '1', 'reason': 'Storno keyin tahrir'})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['code'], 'cancelled')
        history = self.client_owner.get(self.tx_url(tx, 'history/')).json()
        self.assertEqual(history['count'], 1)
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('120000'))

    def test_unknown_transaction_is_404_and_body_must_be_an_object(self):
        self.assertEqual(patch(self.client_owner, API + 'transactions/999999/', {'amount': '5', 'reason': 'Mavjud emas'}).status_code, 404)
        tx = self.make_tx()
        res = self.client_owner.patch(self.tx_url(tx), data='[1,2]', content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client_owner.put(self.tx_url(tx), data='{}', content_type='application/json').status_code, 405)
        self.assertEqual(self.client_owner.delete(self.tx_url(tx)).status_code, 405)     # o'chirish yo'q: faqat storno

    def test_second_edit_sees_the_result_of_the_first(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '150000', 'reason': 'Birinchi tuzatish'})
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '170000', 'reason': 'Ikkinchi tuzatish'})
        changes = res.json()['revision']['changes']['amount']
        self.assertEqual((changes['old'], changes['new']), ('150000.00', '170000.00'))      # old = oxirgi qiymat, asl emas
        self.assertEqual(res.json()['revision']['revision_no'], 2)
        self.assertEqual(res.json()['revisions_count'], 2)

    def test_stale_form_is_rejected_when_expected_revision_differs(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '150000', 'reason': 'Boshqa xodim tuzatdi'})
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '999', 'reason': 'Eskirgan oyna', 'expected_revision': 0})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['code'], 'stale')
        ok = patch(self.client_owner, self.tx_url(tx), {'amount': '999', 'reason': 'Yangilangan oyna', 'expected_revision': 1})
        self.assertEqual(ok.status_code, 200, ok.content)
        bad = patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': 'Noto`g`ri versiya', 'expected_revision': 'x'})
        self.assertEqual(bad.status_code, 400)


# ─── Hisobotlar ───────────────────────────────────────────────────────────────────────────────────

class EditReflectsInReportsTests(FinanceEditBase):

    def test_summary_cash_balance_and_list_show_the_new_values(self):
        income = self.make_tx(tx_type='income', stage='income', amount=Decimal('300000'), title='Kassa kirim', tx_date=local_today())
        expense = self.make_tx(amount=Decimal('100000'), tx_date=local_today())
        before = self.client_owner.get(API + 'summary/').json()
        self.assertEqual((before['income'], before['expense'], before['net_cash_flow'], before['cash_balance']),
                         (300000.0, 100000.0, 200000.0, 200000.0))

        patch(self.client_owner, self.tx_url(income), {'amount': '350000', 'reason': 'Kassa sanog`i bo`yicha'})
        patch(self.client_owner, self.tx_url(expense), {'amount': '40000', 'payment_method': 'card', 'reason': 'Chekda boshqa summa'})
        after = self.client_owner.get(API + 'summary/').json()
        self.assertEqual((after['income'], after['income_cash'], after['expense'], after['net_cash_flow']), (350000.0, 350000.0, 40000.0, 310000.0))
        self.assertEqual(after['cash_balance'], 350000.0)            # chiqim kartaga o'tdi: naqd kassadan chiqmaydi

        listed = {t['id']: t for t in self.client_owner.get(API + 'transactions/').json()['items']}
        self.assertEqual(listed[income.pk]['amount'], 350000.0)
        self.assertEqual((listed[expense.pk]['amount'], listed[expense.pk]['payment_method']), (40000.0, 'card'))

    def test_moving_the_date_moves_the_amount_between_periods(self):
        tx = self.make_tx(tx_type='income', stage='income', amount=Decimal('80000'), tx_date=local_today())
        today = local_today().isoformat()
        self.assertEqual(self.client_owner.get(f'{API}summary/?from={today}&to={today}').json()['income'], 80000.0)
        old_day = (local_today() - timedelta(days=5)).isoformat()
        patch(self.client_owner, self.tx_url(tx), {'tx_date': old_day, 'reason': 'Kecha emas, besh kun oldin'})
        self.assertEqual(self.client_owner.get(f'{API}summary/?from={today}&to={today}').json()['income'], 0.0)
        self.assertEqual(self.client_owner.get(f'{API}summary/?from={old_day}&to={old_day}').json()['income'], 80000.0)

    def test_cancelling_after_an_edit_removes_the_edited_amount(self):
        tx = self.make_tx(tx_type='income', stage='income', amount=Decimal('80000'), tx_date=local_today())
        patch(self.client_owner, self.tx_url(tx), {'amount': '90000', 'reason': 'Summani tuzatdim'})
        self.client_owner.post(self.tx_url(tx, 'cancel/'), {'reason': 'Umuman bo`lmagan'}, content_type='application/json')
        self.assertEqual(self.client_owner.get(API + 'summary/').json()['income'], 0.0)

    def test_list_serialization_has_edit_state_and_no_extra_queries_per_row(self):
        for i in range(3):
            self.make_tx(title=f'Qator {i}')
        self.make_debt()
        with CaptureQueriesContext(connection) as small_tx:
            self.assertEqual(self.client_owner.get(API + 'transactions/').status_code, 200)
        with CaptureQueriesContext(connection) as small_debt:
            self.assertEqual(self.client_owner.get(API + 'debts/').status_code, 200)
        for i in range(25):
            tx = self.make_tx(title=f'Ko`p qator {i}')
            if i % 5 == 0:
                patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': 'Ba`zilari tuzatilgan'})
            self.make_debt(person_name=f'Qarzdor {i}')
        with CaptureQueriesContext(connection) as big_tx:
            res = self.client_owner.get(API + 'transactions/?page_size=100')
        with CaptureQueriesContext(connection) as big_debt:
            res_debts = self.client_owner.get(API + 'debts/')
        self.assertEqual(len(small_tx), len(big_tx), 'tranzaksiyalar ro`yxatida N+1')
        self.assertEqual(len(small_debt), len(big_debt), 'qarzlar ro`yxatida N+1')
        items = res.json()['items']
        self.assertEqual(len(items), 28)
        edited = [i for i in items if i['edited']]
        self.assertEqual(len(edited), 5)
        self.assertTrue(all(i['revisions_count'] == 1 for i in edited))
        self.assertTrue(all(i['revisions_count'] == 0 and i['can_edit'] and i['edit_lock'] is None for i in items if not i['edited']))
        self.assertTrue(all('edited' in d and d['revisions_count'] == 0 for d in res_debts.json()['items']))

    def test_detail_endpoints(self):
        tx = self.make_tx()
        debt = self.make_debt()
        detail = self.client_owner.get(self.tx_url(tx)).json()
        self.assertEqual((detail['id'], detail['notes'], detail['edited']), (tx.pk, 'Bozordan', False))
        self.assertEqual(self.client_owner.get(self.debt_url(debt)).json()['id'], debt.pk)


# ─── Qarzlar ──────────────────────────────────────────────────────────────────────────────────────

class DebtEditTests(FinanceEditBase):

    def test_edit_each_debt_field(self):
        due_old = (local_today() + timedelta(days=10)).isoformat()
        cases = [
            ({'amount': '600000'}, 'amount', {'old': '500000.00', 'new': '600000.00'}),
            ({'initial_amount': '650000'}, 'amount', {'old': '500000.00', 'new': '650000.00'}),
            ({'due_date': '2027-01-15'}, 'due_date', {'old': due_old, 'new': '2027-01-15'}),
            ({'notes': 'Yangi izoh'}, 'notes', {'old': 'Ziyofat', 'new': 'Yangi izoh'}),
            ({'person_name': 'Akmal Karimov'}, 'person_name', {'old': 'Akmal Aka', 'new': 'Akmal Karimov'}),
            ({'phone': '+998909998877'}, 'phone', {'old': '+998901234567', 'new': '+998909998877'}),
            ({'debt_type': 'supplier'}, 'debt_type', {'old': 'customer', 'new': 'supplier'}),
        ]
        for body, key, expected in cases:
            with self.subTest(body=body):
                debt = self.make_debt()
                res = patch(self.client_owner, self.debt_url(debt), {**body, 'reason': 'Qarz ma`lumoti tuzatildi'})
                self.assertEqual(res.status_code, 200, res.content)
                data = res.json()
                self.assertEqual(data['revision']['changes'], {key: expected})
                self.assertTrue(data['edited'])
                self.assertEqual(data['revisions_count'], 1)
                debt.refresh_from_db()
                self.assertEqual(FinanceRevision.objects.filter(target_type='debt', target_id=debt.pk).count(), 1)

    def test_clear_due_date_and_validation(self):
        debt = self.make_debt()
        res = patch(self.client_owner, self.debt_url(debt), {'due_date': None, 'reason': 'Muddat olib tashlandi'})
        self.assertEqual(res.status_code, 200)
        debt.refresh_from_db()
        self.assertIsNone(debt.due_date)
        for body, field in (
            ({'person_name': '  '}, 'person_name'), ({'person_name': 'x' * 151}, 'person_name'), ({'phone': 'x' * 51}, 'phone'),
            ({'amount': '0'}, 'amount'), ({'amount': 'abc'}, 'amount'), ({'due_date': 'ertaga'}, 'due_date'),
            ({'debt_type': 'boshqa'}, 'debt_type'), ({'notes': 'x' * 2001}, 'notes'),
            ({'paid_amount': '1000'}, 'paid_amount'), ({'status': 'settled'}, 'status'),
        ):
            with self.subTest(body=body):
                res = patch(self.client_owner, self.debt_url(debt), {**body, 'reason': 'Tekshiruv sababi'})
                self.assertEqual(res.status_code, 400, (body, res.content))
                self.assertEqual(res.json()['field'], field)

    def test_total_cannot_drop_below_the_paid_amount(self):
        debt = self.make_debt()
        self.client_owner.post(self.debt_url(debt, 'pay/'), {'amount': '200000', 'payment_method': 'cash'}, content_type='application/json')
        res = patch(self.client_owner, self.debt_url(debt), {'amount': '199999', 'reason': 'Kamaytirmoqchiman'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['field'], 'amount')
        self.assertEqual(res.json()['code'], 'below_paid')
        self.assertEqual(res.json()['min_amount'], '200000.00')
        debt.refresh_from_db()
        self.assertEqual(debt.amount, Decimal('500000'))
        self.assertFalse(FinanceRevision.objects.exists())

    def test_total_equal_to_paid_settles_and_raising_it_reopens(self):
        debt = self.make_debt()
        self.client_owner.post(self.debt_url(debt, 'pay/'), {'amount': '200000', 'payment_method': 'cash'}, content_type='application/json')
        res = patch(self.client_owner, self.debt_url(debt), {'amount': '200000', 'reason': 'Qolgani kechildi'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['revision']['changes']['status'], {'old': 'partial', 'new': 'settled'})
        self.assertTrue(res.json()['is_settled'])
        self.assertEqual(res.json()['remaining_amount'], 0.0)
        res = patch(self.client_owner, self.debt_url(debt), {'amount': '250000', 'reason': 'Yana 50 000 qo`shildi'})
        self.assertEqual(res.json()['revision']['changes']['status'], {'old': 'settled', 'new': 'partial'})
        debt.refresh_from_db()
        self.assertEqual((debt.status, debt.paid_amount, debt.amount), ('partial', Decimal('200000'), Decimal('250000')))
        self.assertEqual(res.json()['remaining_amount'], 50000.0)
        # qoldiq (open_receivable) yangi qiymatni ko'rsatadi
        self.assertEqual(self.client_owner.get(API + 'debts/').json()['summary']['open_receivable'], 50000.0)

    def test_status_is_not_recomputed_when_the_amount_does_not_change(self):
        debt = self.make_debt(status='partial')            # paid=0 bilan nomuvofiq holat: faqat amount o'zgarsa qayta hisoblanadi
        res = patch(self.client_owner, self.debt_url(debt), {'notes': 'Faqat izoh', 'reason': 'Izoh tuzatildi'})
        self.assertEqual(list(res.json()['revision']['changes']), ['notes'])
        debt.refresh_from_db()
        self.assertEqual(debt.status, 'partial')

    def test_debt_type_is_locked_once_payments_exist(self):
        debt = self.make_debt()
        self.client_owner.post(self.debt_url(debt, 'pay/'), {'amount': '1000', 'payment_method': 'cash'}, content_type='application/json')
        res = patch(self.client_owner, self.debt_url(debt), {'debt_type': 'supplier', 'reason': 'Tur adashgan'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual((res.json()['field'], res.json()['code']), ('debt_type', 'has_payments'))

    def test_debt_nothing_changed_and_reason(self):
        debt = self.make_debt()
        self.assertEqual(patch(self.client_owner, self.debt_url(debt), {'amount': '500000', 'reason': 'Bir xil qiymat'}).json()['code'], 'no_changes')
        self.assertEqual(patch(self.client_owner, self.debt_url(debt), {'amount': '600000'}).json()['field'], 'reason')
        self.assertEqual(patch(self.client_owner, API + 'debts/99999/', {'amount': '6', 'reason': 'Mavjud emas'}).status_code, 404)

    def test_soft_deleted_debt_is_not_editable(self):
        debt = self.make_debt()
        debt.delete()                                       # yumshoq o'chirish
        self.assertEqual(patch(self.client_owner, self.debt_url(debt), {'amount': '600000', 'reason': 'O`chirilgan qarz'}).status_code, 404)

    def test_debt_stale_form(self):
        debt = self.make_debt()
        patch(self.client_owner, self.debt_url(debt), {'amount': '600000', 'reason': 'Birinchi tuzatish'})
        res = patch(self.client_owner, self.debt_url(debt), {'amount': '700000', 'reason': 'Eskirgan oyna', 'expected_revision': 0})
        self.assertEqual((res.status_code, res.json()['code']), (409, 'stale'))


# ─── Tarix ────────────────────────────────────────────────────────────────────────────────────────

class HistoryTests(FinanceEditBase):

    def test_history_lists_versions_newest_first_with_who_when_why_and_original(self):
        tx = self.make_tx()
        client_manager = logged_in(self.manager)
        patch(self.client_owner, self.tx_url(tx), {'amount': '150000', 'notes': 'Chek topildi', 'reason': 'Chek bo`yicha summa'})
        patch(client_manager, self.tx_url(tx), {'amount': '170000', 'category_id': self.cat_rent.pk, 'reason': 'Menejer tekshirdi'})
        patch(self.client_owner, self.tx_url(tx), {'amount': '170000.50', 'reason': 'Tiyin qo`shildi'})

        data = self.client_owner.get(self.tx_url(tx, 'history/')).json()
        self.assertEqual(data['count'], 3)
        self.assertEqual(data['target'], {'type': 'transaction', 'id': tx.pk})
        results = data['results']
        self.assertEqual([r['revision_no'] for r in results], [3, 2, 1])            # eng yangisi birinchi
        self.assertEqual([r['reason'] for r in results], ['Tiyin qo`shildi', 'Menejer tekshirdi', 'Chek bo`yicha summa'])
        self.assertEqual(results[0]['changes'], {'amount': {'old': '170000.00', 'new': '170000.50'}})
        self.assertEqual(results[1]['changes']['amount'], {'old': '150000.00', 'new': '170000.00'})
        self.assertEqual(results[1]['changes']['category']['new'], 'Ijara')
        self.assertEqual(results[2]['changes']['notes'], {'old': 'Bozordan', 'new': 'Chek topildi'})
        self.assertEqual(results[1]['changed_by'], {'id': self.manager.pk, 'name': 'Malika Rahimova', 'role': 'shop_manager'})
        self.assertEqual(results[0]['changed_by']['id'], self.owner.pk)
        self.assertTrue(all(r['changed_at'] for r in results))
        # asl qiymat: eng birinchi tahrirdan oldingi holat
        self.assertEqual(data['original'], {
            'amount': '100000.00', 'category': "Go'sht", 'title': "Go'sht xaridi", 'notes': 'Bozordan',
            'tx_date': (local_today() - timedelta(days=2)).isoformat(), 'payment_method': 'cash'})

    def test_history_of_an_untouched_record_is_empty_with_current_as_original(self):
        tx = self.make_tx()
        data = self.client_owner.get(self.tx_url(tx, 'history/')).json()
        self.assertEqual((data['count'], data['results']), (0, []))
        self.assertEqual(data['original']['amount'], '100000.00')

    def test_debt_history_and_original(self):
        debt = self.make_debt()
        patch(self.client_owner, self.debt_url(debt), {'amount': '700000', 'due_date': None, 'reason': 'Kelishuv o`zgardi'})
        data = self.client_owner.get(self.debt_url(debt, 'history/')).json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['changes']['amount'], {'old': '500000.00', 'new': '700000.00'})
        self.assertEqual(data['original']['amount'], '500000.00')
        self.assertEqual(data['original']['due_date'], (local_today() + timedelta(days=10)).isoformat())

    def test_history_survives_the_editor_being_deleted_and_renamed(self):
        tx = self.make_tx()
        temp = AdminUser.objects.create_user(username='vaqtincha', password='Vaqtincha-Parol-1', role='shop_manager', shop=self.shop,
                                             is_approved=True, first_name='Vali')
        patch(logged_in(temp), self.tx_url(tx), {'amount': '3', 'reason': 'Vaqtinchalik xodim'})
        temp.first_name = 'Boshqa'
        temp.save()
        temp.delete()
        row = self.client_owner.get(self.tx_url(tx, 'history/')).json()['results'][0]
        self.assertEqual(row['changed_by']['name'], 'Vali')
        self.assertIsNone(row['changed_by']['id'])

    def test_history_cannot_be_modified_or_deleted(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': 'O`zgarmas bo`lishi kerak'})
        revision = FinanceRevision.objects.get()
        revision.reason = 'Soxtalashtirildi'
        with self.assertRaises(ImmutableRecordError):
            revision.save()
        with self.assertRaises(ImmutableRecordError):
            revision.delete()
        with self.assertRaises(ImmutableRecordError):
            FinanceRevision.objects.all().update(reason='x')
        with self.assertRaises(ImmutableRecordError):
            FinanceRevision.objects.filter(pk=revision.pk).delete()
        with self.assertRaises(ImmutableRecordError):
            FinanceRevision.objects.bulk_update([revision], ['reason'])
        self.assertEqual(FinanceRevision.objects.get().reason, 'O`zgarmas bo`lishi kerak')
        # noyob tartib raqami: bir xil (yozuv, tahrir raqami) ikki marta yozilmaydi
        with self.assertRaises(IntegrityError), transaction.atomic():
            FinanceRevision.objects.create(shop=self.shop, target_type='transaction', target_id=tx.pk, revision_no=1,
                                           reason='Takror raqam', changes={})

    def test_admin_site_is_read_only_for_revisions(self):
        model_admin = django_admin.site._registry[FinanceRevision]
        request = mock.Mock(user=mock.Mock(is_active=True, is_staff=True, is_superuser=True))
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))
        self.assertIn('reason', model_admin.readonly_fields)

    def test_there_is_no_api_to_change_or_delete_history(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': 'Tarix yoziladi'})
        for method in ('post', 'put', 'patch', 'delete'):
            res = getattr(self.client_owner, method)(self.tx_url(tx, 'history/'), data='{}', content_type='application/json')
            self.assertEqual(res.status_code, 405, method)
        self.assertEqual(FinanceRevision.objects.count(), 1)


# ─── Ruxsat va tenant ─────────────────────────────────────────────────────────────────────────────

class PermissionAndTenantTests(FinanceEditBase):

    def test_staff_without_finance_capability_is_forbidden_on_all_edit_endpoints(self):
        tx, debt = self.make_tx(), self.make_debt()
        for user in (self.waiter, self.hostess):
            client = logged_in(user)
            with self.subTest(user=user.username):
                self.assertEqual(patch(client, self.tx_url(tx), {'amount': '5', 'reason': 'Ruxsat yo`q'}).status_code, 403)
                self.assertEqual(client.get(self.tx_url(tx, 'history/')).status_code, 403)
                self.assertEqual(client.get(self.tx_url(tx)).status_code, 403)
                self.assertEqual(patch(client, self.debt_url(debt), {'amount': '5', 'reason': 'Ruxsat yo`q'}).status_code, 403)
                self.assertEqual(client.get(self.debt_url(debt, 'history/')).status_code, 403)
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('100000'))
        self.assertFalse(FinanceRevision.objects.exists())

    def test_anonymous_is_rejected(self):
        tx = self.make_tx()
        res = patch(Client(), self.tx_url(tx), {'amount': '5', 'reason': 'Anonim urinish'})
        self.assertIn(res.status_code, (401, 403))
        self.assertIn(Client().get(self.tx_url(tx, 'history/')).status_code, (401, 403))

    def test_staff_with_an_extra_finance_capability_can_edit(self):
        tx = self.make_tx()
        res = patch(logged_in(self.cashier), self.tx_url(tx), {'amount': '5', 'reason': 'Kassir tuzatdi'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['revision']['changed_by']['role'], 'waiter')
        self.assertEqual(logged_in(self.cashier).get(self.tx_url(tx, 'history/')).json()['count'], 1)
        # ruxsat olib tashlansa — yana taqiqlanadi
        AdminUser.objects.filter(pk=self.cashier.pk).update(extra_capabilities=[])
        self.assertEqual(patch(logged_in(AdminUser.objects.get(pk=self.cashier.pk)), self.tx_url(tx),
                               {'amount': '6', 'reason': 'Ruxsat olib tashlandi'}).status_code, 403)

    def test_manager_role_has_finance_by_default(self):
        tx = self.make_tx()
        self.assertEqual(patch(logged_in(self.manager), self.tx_url(tx), {'amount': '5', 'reason': 'Menejer tuzatdi'}).status_code, 200)

    def test_foreign_restaurant_records_are_404_and_untouched(self):
        other_tx = FinanceTransaction.objects.create(shop=self.other_shop, tx_type='income', stage='income', amount=Decimal('50000'),
                                                     title='Begona kassa', category=self.other_cat)
        other_debt = DebtRecord.objects.create(shop=self.other_shop, person_name='Begona qarzdor', amount=Decimal('9000'))
        patch(logged_in(self.other_owner), self.tx_url(other_tx), {'amount': '51000', 'reason': 'O`z restoranim'})
        mine = self.client_owner
        for res in (
            patch(mine, self.tx_url(other_tx), {'amount': '1', 'reason': 'Begona yozuv'}),
            mine.get(self.tx_url(other_tx, 'history/')), mine.get(self.tx_url(other_tx)),
            patch(mine, self.debt_url(other_debt), {'amount': '1', 'reason': 'Begona qarz'}),
            mine.get(self.debt_url(other_debt, 'history/')), mine.get(self.debt_url(other_debt)),
        ):
            self.assertEqual(res.status_code, 404)
            self.assertNotIn('Begona', res.content.decode())
        other_tx.refresh_from_db()
        other_debt.refresh_from_db()
        self.assertEqual((other_tx.amount, other_debt.amount), (Decimal('51000'), Decimal('9000')))
        self.assertEqual(FinanceRevision.objects.filter(shop=self.shop).count(), 0)
        # begona restoran kategoriyasini ham bog'lab bo'lmaydi
        tx = self.make_tx()
        res = patch(mine, self.tx_url(tx), {'category_id': self.other_cat.pk, 'reason': 'Begona kategoriya'})
        self.assertEqual((res.status_code, res.json()['field']), (400, 'category_id'))

    def test_history_lists_only_own_restaurant_revisions(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '5', 'reason': 'Mening tuzatishim'})
        other = FinanceTransaction.objects.create(shop=self.other_shop, tx_type='income', stage='income', amount=Decimal('1000'), title='X')
        patch(logged_in(self.other_owner), self.tx_url(other), {'amount': '2000', 'reason': 'Begona tuzatish'})
        data = self.client_owner.get(self.tx_url(tx, 'history/')).json()
        self.assertEqual([r['reason'] for r in data['results']], ['Mening tuzatishim'])


# ─── Audit va atomiklik ───────────────────────────────────────────────────────────────────────────

class AuditAndAtomicityTests(FinanceEditBase):

    def test_audit_log_records_reason_and_old_new_values(self):
        tx = self.make_tx()
        res = patch(self.client_owner, self.tx_url(tx), {'amount': '150000', 'title': 'Yangi', 'reason': 'Audit tekshiruvi'})
        entry = AuditLog.objects.get(action_type='finance_tx_edited')
        self.assertEqual((entry.target_type, entry.target_id, entry.actor_id), ('finance_transaction', tx.pk, self.owner.pk))
        self.assertEqual(entry.old_value, {'amount': '100000.00', 'title': "Go'sht xaridi"})
        self.assertEqual(entry.new_value, {'amount': '150000.00', 'title': 'Yangi'})
        self.assertEqual(entry.metadata['reason'], 'Audit tekshiruvi')
        self.assertEqual(entry.metadata['revision_id'], res.json()['revision']['id'])

    def test_debt_audit_log(self):
        debt = self.make_debt()
        patch(self.client_owner, self.debt_url(debt), {'amount': '800000', 'reason': 'Qarz audit'})
        entry = AuditLog.objects.get(action_type='debt_edited')
        self.assertEqual((entry.target_type, entry.target_id), ('debt_record', debt.pk))
        self.assertEqual(entry.new_value['amount'], '800000.00')

    def test_failed_edits_leave_no_audit_and_no_revision(self):
        tx = self.make_tx()
        patch(self.client_owner, self.tx_url(tx), {'amount': '-1', 'reason': 'Yaroqsiz summa'})
        patch(self.client_owner, self.tx_url(tx), {'amount': '5'})
        self.assertFalse(AuditLog.objects.filter(action_type='finance_tx_edited').exists())
        self.assertFalse(FinanceRevision.objects.exists())

    def test_edit_is_rolled_back_when_audit_cannot_be_written(self):
        tx = self.make_tx()
        client = logged_in(self.owner, raise_request_exception=False)
        with mock.patch('finance.services.revisions.log_audit', side_effect=RuntimeError('audit ishlamadi')):
            res = patch(client, self.tx_url(tx), {'amount': '150000', 'reason': 'Audit yozilmasa saqlanmasin'})
        self.assertEqual(res.status_code, 500)
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('100000'))
        self.assertFalse(FinanceRevision.objects.exists())

    def test_existing_endpoints_still_work_with_the_new_fields(self):
        res = self.client_owner.post(API + 'transactions/', {'type': 'income', 'amount': '12000', 'title': 'Yangi', 'payment_method': 'bank'},
                                     content_type='application/json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual((res.json()['edited'], res.json()['revisions_count'], res.json()['can_edit']), (False, 0, True))
        self.assertEqual(res.json()['payment_method_display'], 'Bank hisobi')
        debt = self.client_owner.post(API + 'debts/', {'person_name': 'Karim', 'amount': '1000'}, content_type='application/json')
        self.assertEqual((debt.status_code, debt.json()['edited']), (201, False))


# ─── Eski /seller/finance/ paneli jimgina o'zgartirmaydi ──────────────────────────────────────────

class LegacyPanelTrailTests(FinanceEditBase):
    """
    Eski seller paneli `edit_transaction` amali har yozuvni tahrirlay oladi. Egasi qarori: sababsiz o'zgartirish yo'q - panel ham
    yangi API kabi MAJBURIY sabab so'raydi va o'zgarish tarixga (va audit logga) tushadi, /ra/ "Tarix" oynasida ko'rinadi.
    Eski panel amallarining to'liq tekshiruvlari: finance/test_seller_finance_reasons.py.
    """

    def post_edit(self, tx, **fields):
        from django.urls import reverse
        body = {'action': 'edit_transaction', 'tx_id': tx.pk, 'amount': str(tx.amount), 'title': tx.title, 'category_id': tx.category_id or '',
                'tx_type': tx.tx_type, 'stage': tx.stage, 'payment_method': tx.payment_method, 'tx_date': tx.tx_date.isoformat(),
                'notes': tx.notes}
        body.update(fields)
        return self.client_owner.post(reverse('seller_finance_web'), body)

    def test_legacy_edit_is_recorded_with_the_given_reason(self):
        tx = self.make_tx()
        res = self.post_edit(tx, amount='125 000', title='Yangi nom', reason='Chek bo`yicha tuzatildi')
        self.assertEqual(res.status_code, 302)
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('125000'))
        revision = FinanceRevision.objects.get(target_type='transaction', target_id=tx.pk)
        self.assertEqual(revision.reason, 'Chek bo`yicha tuzatildi')
        self.assertEqual(revision.changes, {'amount': {'old': '100000.00', 'new': '125000.00'},
                                            'title': {'old': "Go'sht xaridi", 'new': 'Yangi nom'}})
        self.assertEqual((revision.changed_by_id, revision.revision_no), (self.owner.pk, 1))
        self.assertTrue(AuditLog.objects.filter(action_type='finance_tx_edited', target_id=tx.pk).exists())
        # yangi API tarixida ham ko'rinadi, va hisobot yangi qiymatni ko'rsatadi
        history = self.client_owner.get(self.tx_url(tx, 'history/')).json()
        self.assertEqual((history['count'], history['results'][0]['reason']), (1, 'Chek bo`yicha tuzatildi'))
        self.assertEqual(history['original']['amount'], '100000.00')

    def test_legacy_edit_without_or_with_a_bad_reason_changes_nothing(self):
        """Egasi qarori: sababsiz o'zgartirish yo'q. Avvalgi "sabab so'ralmagan" belgisi bilan jimgina saqlash ENDI taqiqlangan."""
        tx = self.make_tx()
        for bad in (None, '', '   ', 'abc'):
            fields = {'amount': '9000'} if bad is None else {'amount': '9000', 'reason': bad}
            self.post_edit(tx, **fields)
            tx.refresh_from_db()
            self.assertEqual((tx.amount, FinanceRevision.objects.count()), (Decimal('100000'), 0), repr(bad))

    def test_legacy_edit_without_real_changes_writes_no_revision(self):
        tx = self.make_tx()
        self.post_edit(tx, reason='Hech narsa o`zgarmadi')
        self.assertFalse(FinanceRevision.objects.exists())

    def test_legacy_stage_move_through_edit_is_a_revision_with_the_reason(self):
        """Bosqich/tur pul hisobiga ta'sir qiladi (rejadagi summa kassaga o'tadi): avval faqat harakat tarixiga yozilardi, endi sabab bilan tarixga ham."""
        tx = self.make_tx(stage='planned')
        self.post_edit(tx, stage='expense', reason='Haqiqatda to`landi')
        self.assertTrue(tx.movements.exists())
        revision = FinanceRevision.objects.get()
        self.assertEqual(revision.reason, 'Haqiqatda to`landi')
        self.assertEqual((revision.changes['stage']['old_key'], revision.changes['stage']['new_key']), ('planned', 'expense'))
        self.assertNotIn('amount', revision.changes)


# ─── Poyga (faqat PostgreSQL'da ma'noli) ──────────────────────────────────────────────────────────

def widen_race_window(seconds=0.15):
    """
    Tahrir qulf ostida `revision_count` ni o'qiydi; shu yerga kechikish qo'shib, qulf bo'lmasa so'rovlar albatta kesishishini ta'minlaymiz
    (aks holda qisqa kritik bo'lim tasodifan ketma-ket bajarilib, qulf olib tashlansa ham test o'tib ketardi).
    """
    from finance.services import revisions
    real = revisions.revision_count

    def slow(*args, **kwargs):
        value = real(*args, **kwargs)
        time.sleep(seconds)
        return value

    return mock.patch('finance.services.revisions.revision_count', side_effect=slow)


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
class FinanceEditConcurrencyTests(TransactionTestCase):

    def setUp(self):
        if connection.vendor != 'postgresql':
            self.skipTest("Haqiqiy parallellik faqat PostgreSQL'da ma'noli (SQLite butun bazani qulflaydi)")
        self.shop, self.owner = make_shop('edit-race', 'edit-race-owner')

    def test_parallel_edits_serialise_and_each_sees_the_previous_value(self):
        tx = FinanceTransaction.objects.create(shop=self.shop, tx_type='expense', stage='expense', amount=Decimal('1000'), title='Poyga')
        statuses = []

        def edit(new_amount):
            def run():
                client = logged_in(self.owner)
                res = patch(client, f'{API}transactions/{tx.pk}/', {'amount': new_amount, 'reason': f'Parallel tahrir {new_amount}'})
                statuses.append(res.status_code)
            return run

        with widen_race_window():
            errors = run_in_threads([edit(str(2000 + i)) for i in range(6)])
        self.assertEqual(errors, [])
        self.assertEqual(statuses.count(200), 6, statuses)
        revisions = list(FinanceRevision.objects.filter(target_id=tx.pk).order_by('revision_no'))
        self.assertEqual([r.revision_no for r in revisions], [1, 2, 3, 4, 5, 6])
        self.assertEqual(revisions[0].changes['amount']['old'], '1000.00')
        for previous, current in zip(revisions, revisions[1:]):                 # zanjir uzilmagan: har eski = avvalgi yangi
            self.assertEqual(current.changes['amount']['old'], previous.changes['amount']['new'])
        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal(revisions[-1].changes['amount']['new']))

    def test_parallel_debt_edit_and_payment_never_break_the_paid_limit(self):
        debt = DebtRecord.objects.create(shop=self.shop, debt_type='customer', person_name='Karim', amount=Decimal('100000'))
        results = {}

        def pay():
            res = logged_in(self.owner).post(f'{API}debts/{debt.pk}/pay/', json.dumps({'amount': 60000, 'payment_method': 'cash'}),
                                             content_type='application/json')
            results['pay'] = res.status_code

        def shrink():
            res = patch(logged_in(self.owner), f'{API}debts/{debt.pk}/', {'amount': '50000', 'reason': 'Kelishib kamaytirildi'})
            results['edit'] = res.status_code

        with widen_race_window():
            errors = run_in_threads([pay, shrink])
        self.assertEqual(errors, [])
        debt.refresh_from_db()
        self.assertLessEqual(debt.paid_amount, debt.amount)
        # ikkalasi birga muvaffaqiyatli bo'lolmaydi (to'lov 60 000 > yangi summa 50 000)
        self.assertEqual(sorted(results.values()), [200, 400], results)

    def test_parallel_edit_and_cancel_do_not_lose_either(self):
        tx = FinanceTransaction.objects.create(shop=self.shop, tx_type='expense', stage='expense', amount=Decimal('1000'), title='Poyga')
        results = {}

        def edit():
            results['edit'] = patch(logged_in(self.owner), f'{API}transactions/{tx.pk}/', {'amount': '7000', 'reason': 'Tahrir va storno'}).status_code

        def cancel():
            results['cancel'] = logged_in(self.owner).post(f'{API}transactions/{tx.pk}/cancel/', json.dumps({'reason': 'Storno va tahrir'}),
                                                           content_type='application/json').status_code

        errors = run_in_threads([edit, cancel])
        self.assertEqual(errors, [])
        tx.refresh_from_db()
        self.assertTrue(tx.is_cancelled)
        self.assertEqual(results['cancel'], 200)
        if results['edit'] == 200:                              # tahrir stornodan oldin tushgan: tarixda va summada ko'rinadi
            self.assertEqual(tx.amount, Decimal('7000'))
            self.assertEqual(FinanceRevision.objects.filter(target_id=tx.pk).count(), 1)
        else:                                                   # storno birinchi: tahrir 409 `cancelled`
            self.assertEqual(results['edit'], 409)
            self.assertEqual(tx.amount, Decimal('1000'))
