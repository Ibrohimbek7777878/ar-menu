"""
Eski `/seller/finance/` paneli: MAVJUD yozuvni o'zgartiruvchi/yashiruvchi amallar MAJBURIY SABAB va tarix bilan
(TZ_MULTITENANT Bosqich 5, egasi qarori: moliyada jimgina o'zgartirish yo'q).

Yopilgan amallar: edit_transaction, move_transaction, restore_transaction, settle_debt, delete_tx, delete_debt.
Qoidalar: sababsiz (yo'q / bo'sh / 5 belgidan qisqa / 300 dan uzun) amal BAJARILMAYDI; sabab bilan bajarilganda o'zgarmas
`FinanceRevision` + audit log bitta tranzaksiyada yoziladi; buyurtma/qarz to'lovidan hosil bo'lgan va storno qilingan yozuv
`edit`/`move` bilan o'zgarmaydi; begona restoran yozuviga tegib bo'lmaydi; `finance` ruxsati kerak.
"""
import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import Client, TestCase, override_settings
from django.urls import reverse

from accounts.models import AdminUser
from finance.models import (
    DebtRecord,
    FinanceCategory,
    FinanceCustomStage,
    FinanceMovementHistory,
    FinanceRevision,
    FinanceTransaction,
    ImmutableRecordError,
)
from finance.views import MSG_CANCELLED_LOCKED, MSG_SOURCE_LOCKED
from orders.audit import AuditLog
from orders.creation import create_order
from orders.timeutils import local_today
from shops.models import Shop

NO_REASON_MSG = 'Sababni yozing (kamida 5 belgi)'
AJAX = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
API = '/api/restaurant/admin/v1/finance/'

# Audit log'ga tushishi kerak bo'lgan amallar (action_type)
AUDIT_ACTIONS = ('finance_tx_edited', 'finance_tx_moved', 'finance_tx_restored', 'finance_tx_hidden', 'debt_settled', 'debt_hidden')


def make_shop(slug, owner_username):
    owner = AdminUser.objects.create_user(username=owner_username, password='Parol-Moliya-123', role='shop_owner', is_approved=True)
    shop = Shop.objects.create(name=slug.title(), slug=slug, owner=owner, latitude=Decimal('40.4998'), longitude=Decimal('68.7845'))
    owner.shop = shop
    owner.save(update_fields=['shop'])
    return shop, owner


def logged_in(user):
    client = Client()
    client.force_login(user)
    return client


def flash(response):
    """Faqat SHU so'rov qo'shgan xabarlar (test mijozi xabarlarni o'qimaydi, shuning uchun oldingilari to'planib qoladi)."""
    return [str(m) for m in response.wsgi_request._messages._queued_messages]


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class SellerFinanceBase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.shop, cls.owner = make_shop('legacy-resto', 'legacy-owner')
        cls.other_shop, cls.other_owner = make_shop('legacy-other', 'legacy-other-owner')
        cls.cat = FinanceCategory.objects.create(shop=cls.shop, name="Go'sht", category_type='expense')
        cls.other_cat = FinanceCategory.objects.create(shop=cls.other_shop, name='Begona', category_type='expense')
        cls.manager = AdminUser.objects.create_user(username='legacy-manager', password='Parol-Moliya-123', role='shop_manager',
                                                    shop=cls.shop, is_approved=True)
        cls.no_finance = AdminUser.objects.create_user(username='legacy-nofin', password='Parol-Moliya-123', role='shop_manager',
                                                       shop=cls.shop, is_approved=True, revoked_capabilities=['finance'])
        cls.waiter = AdminUser.objects.create_user(username='legacy-waiter', password='Parol-Moliya-123', role='waiter',
                                                   shop=cls.shop, is_approved=True)

    def setUp(self):
        self.client_owner = logged_in(self.owner)
        self.url = reverse('seller_finance_web')

    # ─── yordamchilar ─────────────────────────────────────────────────────────────────────────────
    def make_tx(self, shop=None, **kwargs):
        shop = shop or self.shop
        fields = dict(shop=shop, tx_type='expense', stage='expense', amount=Decimal('100000'), payment_method='cash', title="Go'sht xaridi",
                      notes='Bozordan', tx_date=local_today() - timedelta(days=2), category=self.cat if shop == self.shop else self.other_cat,
                      created_by=self.owner)
        fields.update(kwargs)
        return FinanceTransaction.objects.create(**fields)

    def make_debt(self, shop=None, **kwargs):
        fields = dict(shop=shop or self.shop, debt_type='customer', person_name='Akmal Aka', amount=Decimal('500000'),
                      paid_amount=Decimal('0'), status='pending')
        fields.update(kwargs)
        return DebtRecord.objects.create(**fields)

    def make_cancelled_tx(self, **kwargs):
        from django.utils import timezone
        return self.make_tx(is_cancelled=True, cancel_reason='Adashib kiritilgan', cancelled_by=self.owner, cancelled_at=timezone.now(),
                            **kwargs)

    def post(self, body, client=None, **extra):
        return (client or self.client_owner).post(self.url, body, **extra)

    def edit_body(self, tx, **fields):
        body = {'action': 'edit_transaction', 'tx_id': tx.pk, 'amount': str(tx.amount), 'title': tx.title,
                'category_id': tx.category_id or '', 'tx_type': tx.tx_type, 'stage': tx.stage, 'payment_method': tx.payment_method,
                'tx_date': tx.tx_date.isoformat(), 'notes': tx.notes}
        body.update(fields)
        return body

    def revisions(self, **filters):
        return FinanceRevision.objects.filter(**filters).order_by('revision_no')

    def audits(self):
        return AuditLog.objects.filter(action_type__in=AUDIT_ACTIONS)

    def tx_state(self, tx):
        return FinanceTransaction.objects.filter(pk=tx.pk).values(
            'amount', 'title', 'notes', 'stage', 'tx_type', 'is_cancelled', 'cancel_reason', 'cancelled_by', 'category', 'tx_date',
            'payment_method').get()

    def debt_state(self, debt):
        return DebtRecord.all_objects.filter(pk=debt.pk).values('amount', 'paid_amount', 'status', 'is_deleted', 'deleted_at').get()

    def assert_nothing_recorded(self, msg=''):
        self.assertEqual(FinanceRevision.objects.count(), 0, msg)
        self.assertEqual(self.audits().count(), 0, msg)


# ─── 1. Sababsiz amal BAJARILMAYDI ────────────────────────────────────────────────────────────────

class ReasonIsRequiredTests(SellerFinanceBase):
    """Har bir amal uchun: sabab yo'q/bo'sh/qisqa/uzun - holat o'zgarmaydi, tarix va audit yo'q, xabar chiqadi."""

    def setUp(self):
        super().setUp()
        self.edit_tx = self.make_tx(title='Tahrir uchun')
        self.move_tx = self.make_tx(title="Ko'chirish uchun", stage='planned')
        self.restore_tx = self.make_cancelled_tx(title='Tiklash uchun')
        self.delete_tx = self.make_tx(title="O'chirish uchun")
        self.settle_debt = self.make_debt(person_name='Yopish uchun')
        self.delete_debt = self.make_debt(person_name="Daftardan o'chirish uchun")
        self.cases = {
            'edit_transaction': (self.edit_body(self.edit_tx, amount='175000', title='Yangi'), lambda: self.tx_state(self.edit_tx)),
            'move_transaction': ({'action': 'move_transaction', 'tx_id': self.move_tx.pk, 'target_stage': 'income'},
                                 lambda: self.tx_state(self.move_tx)),
            'restore_transaction': ({'action': 'restore_transaction', 'tx_id': self.restore_tx.pk}, lambda: self.tx_state(self.restore_tx)),
            'delete_tx': ({'action': 'delete_tx', 'tx_id': self.delete_tx.pk}, lambda: self.tx_state(self.delete_tx)),
            'settle_debt': ({'action': 'settle_debt', 'debt_id': self.settle_debt.pk}, lambda: self.debt_state(self.settle_debt)),
            'delete_debt': ({'action': 'delete_debt', 'debt_id': self.delete_debt.pk}, lambda: self.debt_state(self.delete_debt)),
        }
        self.cash_before = FinanceTransaction.objects.count()

    BAD_REASONS = (None, '', '     ', 'abc', '  abc  ', 'a' * 301)

    def test_every_action_is_refused_without_a_valid_reason(self):
        for name, (body, probe) in self.cases.items():
            before = probe()
            for bad in self.BAD_REASONS:
                with self.subTest(action=name, reason=bad if bad is None or len(bad) < 10 else 'uzun'):
                    data = dict(body) if bad is None else {**body, 'reason': bad}
                    res = self.post(data)
                    self.assertEqual(res.status_code, 302)
                    self.assertEqual(res['Location'], self.url)
                    self.assertEqual(len(flash(res)), 1)
                    self.assertEqual(probe(), before)
        self.assert_nothing_recorded()
        self.assertEqual(FinanceTransaction.objects.count(), self.cash_before, "settle_debt sababsiz kassaga operatsiya yozmasligi kerak")
        self.assertFalse(FinanceMovementHistory.objects.filter(transaction__in=[self.move_tx, self.restore_tx, self.edit_tx]).exists())

    def test_the_message_asks_for_a_reason(self):
        for name, (body, _) in self.cases.items():
            with self.subTest(action=name):
                res = self.post(body)
                self.assertEqual(flash(res), [NO_REASON_MSG])
        res = self.post({**self.cases['delete_tx'][0], 'reason': 'x' * 301})
        self.assertEqual(flash(res), ['Sabab 300 belgidan oshmasligi kerak'])

    def test_ajax_requests_get_a_json_refusal(self):
        for name, (body, probe) in self.cases.items():
            before = probe()
            with self.subTest(action=name):
                res = self.post(body, **AJAX)
                self.assertEqual(res.status_code, 400)
                payload = res.json()
                self.assertEqual((payload['success'], payload['code'], payload['error']), (False, 'reason_required', NO_REASON_MSG))
                self.assertEqual(probe(), before)
        self.assert_nothing_recorded()

    def test_the_old_fallback_reason_is_gone(self):
        """Avval `edit_transaction` sababsiz kelsa "sabab so'ralmagan" belgisi bilan saqlardi. Endi taqiqlangan."""
        self.post(self.edit_body(self.edit_tx, amount='1'))
        self.assertEqual(self.tx_state(self.edit_tx)['amount'], Decimal('100000'))
        self.assertFalse(FinanceRevision.objects.filter(reason__icontains="so'ralmagan").exists())

    def test_a_reason_of_exactly_five_and_three_hundred_characters_is_accepted(self):
        self.post({**self.cases['delete_tx'][0], 'reason': 'abcde'})
        self.assertEqual(self.revisions(target_id=self.delete_tx.pk).get().reason, 'abcde')
        self.post({**self.cases['delete_debt'][0], 'reason': 'ё' * 300})
        self.assertEqual(self.revisions(target_type='debt', target_id=self.delete_debt.pk).get().reason, 'ё' * 300)

    def test_actions_that_create_new_records_stay_open_without_a_reason(self):
        """Yangi yozuv (storno emas) beradigan amallar sabab talab qilmaydi: ular mavjud yozuvni o'zgartirmaydi."""
        debt = self.make_debt(person_name="Qisman to'lov")
        res = self.post({'action': 'pay_debt', 'debt_id': debt.pk, 'pay_amount': '100000', 'payment_method': 'cash'})
        self.assertEqual(res.status_code, 302)
        debt.refresh_from_db()
        self.assertEqual((debt.paid_amount, debt.status), (Decimal('100000'), 'partial'))
        self.post({'action': 'add_debt', 'person_name': 'Yangi', 'amount': '5000', 'debt_type': 'customer'})
        self.post({'action': 'add_transaction', 'tx_type': 'expense', 'amount': '7000', 'title': 'Yangi chiqim'})
        self.assertTrue(DebtRecord.objects.filter(person_name='Yangi').exists())
        self.assertTrue(FinanceTransaction.objects.filter(title='Yangi chiqim').exists())
        self.assert_nothing_recorded()


# ─── 2. Sabab bilan bajariladi: tarix + audit ─────────────────────────────────────────────────────

class ReasonedActionTests(SellerFinanceBase):

    def assert_revision(self, rev, *, target_type, target_id, reason, revision_no=1, changed_by=None):
        self.assertEqual((rev.shop_id, rev.target_type, rev.target_id, rev.reason, rev.revision_no),
                         (self.shop.pk, target_type, target_id, reason, revision_no))
        user = changed_by or self.owner
        self.assertEqual((rev.changed_by_id, rev.changed_by_name, rev.changed_by_role), (user.pk, user.get_username(), user.role))

    def assert_audit(self, action, target_type, target_id, revision, reason):
        log = AuditLog.objects.get(action_type=action, target_id=target_id)
        self.assertEqual(log.target_type, target_type)
        self.assertEqual((log.actor_id, log.actor_role), (self.owner.pk, self.owner.role))
        self.assertEqual(log.metadata['reason'], reason)
        self.assertEqual((log.metadata['revision_id'], log.metadata['revision_no']), (revision.pk, revision.revision_no))
        self.assertEqual(log.old_value, {k: v['old'] for k, v in revision.changes.items()})
        self.assertEqual(log.new_value, {k: v['new'] for k, v in revision.changes.items()})
        return log

    def test_edit_transaction_records_old_to_new_with_the_trimmed_reason(self):
        tx = self.make_tx(stage='planned')
        res = self.post(self.edit_body(tx, amount='175 000', title='Yangi nom', stage='expense', reason='   Chek bo`yicha tuzatildi  '))
        self.assertEqual(res.status_code, 302)
        state = self.tx_state(tx)
        self.assertEqual((state['amount'], state['title'], state['stage']), (Decimal('175000'), 'Yangi nom', 'expense'))
        rev = self.revisions(target_id=tx.pk).get()
        self.assert_revision(rev, target_type='transaction', target_id=tx.pk, reason='Chek bo`yicha tuzatildi')
        self.assertEqual(rev.changes['amount'], {'old': '100000.00', 'new': '175000.00'})
        self.assertEqual(rev.changes['title'], {'old': "Go'sht xaridi", 'new': 'Yangi nom'})
        self.assertEqual(rev.changes['stage']['old_key'], 'planned')
        self.assertEqual(rev.changes['stage']['new_key'], 'expense')
        self.assertNotIn('tx_type', rev.changes)                       # tur o'zgarmagan
        self.assertNotIn('notes', rev.changes)
        self.assert_audit('finance_tx_edited', 'finance_transaction', tx.pk, rev, 'Chek bo`yicha tuzatildi')
        movement = tx.movements.get()                                  # doska harakati tarixiga ham sabab bilan tushadi
        self.assertIn('Chek bo`yicha tuzatildi', movement.note)
        self.assertEqual(flash(res)[0][:2], '✏️')

    def test_edit_can_change_the_type_and_the_category_and_all_of_it_is_recorded(self):
        tx = self.make_tx()
        other = FinanceCategory.objects.create(shop=self.shop, name='Ijara', category_type='expense')
        self.post(self.edit_body(tx, tx_type='income', stage='income', category_id=other.pk, notes='Qaytdi', reason='Xato turda kiritilgan'))
        rev = self.revisions(target_id=tx.pk).get()
        self.assertEqual(rev.changes['tx_type'], {'old': 'expense', 'new': 'income'})
        self.assertEqual(rev.changes['category'], {'old': "Go'sht", 'new': 'Ijara'})
        self.assertEqual(rev.changes['notes'], {'old': 'Bozordan', 'new': 'Qaytdi'})
        self.assertEqual(rev.changes['stage']['new'], 'Kassaga kirdi (+)')

    def test_move_transaction_records_stage_and_type(self):
        tx = self.make_tx(stage='planned')
        res = self.post({'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'income', 'reason': 'Mijoz pulni berdi'}, **AJAX)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['success'])
        state = self.tx_state(tx)
        self.assertEqual((state['stage'], state['tx_type']), ('income', 'income'))
        rev = self.revisions(target_id=tx.pk).get()
        self.assert_revision(rev, target_type='transaction', target_id=tx.pk, reason='Mijoz pulni berdi')
        self.assertEqual(rev.changes, {
            'stage': {'old': 'Kutilayotgan (Rejada)', 'new': 'Kassaga kirdi (+)', 'old_key': 'planned', 'new_key': 'income'},
            'tx_type': {'old': 'expense', 'new': 'income'},
        })
        self.assert_audit('finance_tx_moved', 'finance_transaction', tx.pk, rev, 'Mijoz pulni berdi')
        self.assertIn('Mijoz pulni berdi', tx.movements.get().note)

    def test_move_to_a_custom_stage_uses_its_name_and_the_shops_own_names_only(self):
        FinanceCustomStage.objects.create(shop=self.shop, name='Oylik ish haqi', stage_key='custom_oylik_1', category_type='expense')
        FinanceCustomStage.objects.create(shop=self.other_shop, name='BEGONA USTUN', stage_key='custom_begona_2', category_type='expense')
        tx = self.make_tx(stage='income', tx_type='income')
        self.post({'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'custom_oylik_1', 'reason': 'Maosh sifatida hisoblandi'})
        rev = self.revisions(target_id=tx.pk).get()
        self.assertEqual((rev.changes['stage']['new'], rev.changes['stage']['new_key']), ('Oylik ish haqi', 'custom_oylik_1'))
        self.assertEqual(rev.changes['tx_type'], {'old': 'income', 'new': 'expense'})
        # begona restoranning maxsus ustuniga ko'chirib bo'lmaydi
        res = self.post({'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'custom_begona_2', 'reason': 'Begona ustun'})
        self.assertEqual(flash(res), ["Noto'g'ri ustun tanlandi"])
        self.assertEqual(self.tx_state(tx)['stage'], 'custom_oylik_1')
        self.assertEqual(self.revisions(target_id=tx.pk).count(), 1)

    def test_move_to_the_same_or_an_unknown_stage_is_refused_without_a_trail(self):
        tx = self.make_tx(stage='expense')
        for target, expected in (('expense', 'Kartochka allaqachon shu ustunda'), ('nomalum', "Noto'g'ri ustun tanlandi"), ('', "Noto'g'ri ustun tanlandi")):
            with self.subTest(target=target):
                res = self.post({'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': target, 'reason': 'Sinov sababi'}, **AJAX)
                self.assertEqual(res.status_code, 400)
                self.assertEqual(res.json()['error'], expected)
        self.assert_nothing_recorded()
        self.assertFalse(tx.movements.exists())

    def test_restore_transaction_records_cancelled_true_to_false_and_keeps_the_old_cancel_reason(self):
        tx = self.make_cancelled_tx()
        res = self.post({'action': 'restore_transaction', 'tx_id': tx.pk, 'reason': 'Adashib bekor qilingan edi'})
        self.assertEqual(res.status_code, 302)
        state = self.tx_state(tx)
        self.assertEqual((state['is_cancelled'], state['cancel_reason'], state['cancelled_by']), (False, '', None))
        rev = self.revisions(target_id=tx.pk).get()
        self.assert_revision(rev, target_type='transaction', target_id=tx.pk, reason='Adashib bekor qilingan edi')
        self.assertEqual(rev.changes['cancelled'], {'old': True, 'new': False})
        self.assertEqual(rev.changes['cancel_reason'], {'old': 'Adashib kiritilgan', 'new': ''})
        self.assert_audit('finance_tx_restored', 'finance_transaction', tx.pk, rev, 'Adashib bekor qilingan edi')
        self.assertIn('Adashib bekor qilingan edi', tx.movements.get().note)

    def test_restoring_an_active_transaction_is_refused(self):
        tx = self.make_tx()
        res = self.post({'action': 'restore_transaction', 'tx_id': tx.pk, 'reason': 'Faol yozuvni tiklash'})
        self.assertEqual(flash(res), ["Bu operatsiya bekor qilinmagan, tiklash shart emas"])
        self.assert_nothing_recorded()
        self.assertFalse(tx.movements.exists())

    def test_restoring_an_order_income_that_would_duplicate_the_active_one_is_refused_and_rolled_back(self):
        order = create_order(shop=self.shop, customer_name='Ali', customer_phone_1='+998901112233', total_amount=Decimal('50000'),
                             final_amount=Decimal('50000'), status='pending', payment_status='paid')
        old = self.make_cancelled_tx(tx_type='income', stage='income', order=order, amount=Decimal('50000'))
        self.make_tx(tx_type='income', stage='income', order=order, amount=Decimal('50000'))       # shu buyurtmaning faol kirimi
        res = self.post({'action': 'restore_transaction', 'tx_id': old.pk, 'reason': 'Ikki kirim bo`lib qoladi'}, **AJAX)
        self.assertEqual((res.status_code, res.json()['code']), (409, 'conflict'))
        self.assertTrue(self.tx_state(old)['is_cancelled'])
        self.assert_nothing_recorded()

    def test_delete_tx_hides_the_row_with_the_reason_and_never_deletes_it(self):
        tx = self.make_tx()
        res = self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Ikki marta kiritilgan'}, **AJAX)
        self.assertEqual((res.status_code, res.json()['success']), (200, True))
        state = self.tx_state(tx)                                       # qator joyida: faqat yashirilgan (storno)
        self.assertTrue(state['is_cancelled'])
        self.assertEqual(state['cancelled_by'], self.owner.pk)
        self.assertIn('Ikki marta kiritilgan', state['cancel_reason'])
        rev = self.revisions(target_id=tx.pk).get()
        self.assert_revision(rev, target_type='transaction', target_id=tx.pk, reason='Ikki marta kiritilgan')
        self.assertEqual(rev.changes, {'hidden': {'old': False, 'new': True}})
        self.assert_audit('finance_tx_hidden', 'finance_transaction', tx.pk, rev, 'Ikki marta kiritilgan')
        # ikkinchi marta o'chirish: o'zgarish ham, tarix ham yo'q
        res = self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Yana bir marta'}, **AJAX)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(self.revisions(target_id=tx.pk).count(), 1)

    def test_delete_tx_with_a_long_reason_fits_the_cancel_reason_column(self):
        tx = self.make_tx()
        self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'x' * 300})
        self.assertLessEqual(len(self.tx_state(tx)['cancel_reason']), 255)
        self.assertEqual(self.revisions(target_id=tx.pk).get().reason, 'x' * 300)           # tarixda sabab to'liq

    def test_delete_debt_hides_the_row_and_keeps_it_in_the_database(self):
        debt = self.make_debt(paid_amount=Decimal('100000'), status='partial')
        res = self.post({'action': 'delete_debt', 'debt_id': debt.pk, 'reason': 'Noto`g`ri shaxsga yozilgan'}, **AJAX)
        self.assertEqual((res.status_code, res.json()['success']), (200, True))
        self.assertFalse(DebtRecord.objects.filter(pk=debt.pk).exists())                      # ro'yxatda ko'rinmaydi
        state = self.debt_state(debt)                                                         # lekin bazada turibdi
        self.assertEqual((state['is_deleted'], state['amount'], state['paid_amount']), (True, Decimal('500000'), Decimal('100000')))
        self.assertIsNotNone(state['deleted_at'])
        rev = self.revisions(target_type='debt', target_id=debt.pk).get()
        self.assert_revision(rev, target_type='debt', target_id=debt.pk, reason='Noto`g`ri shaxsga yozilgan')
        self.assertEqual(rev.changes, {'hidden': {'old': False, 'new': True}})
        self.assert_audit('debt_hidden', 'debt_record', debt.pk, rev, 'Noto`g`ri shaxsga yozilgan')
        # yashirilgan qarz qayta "o'chirilmaydi" va tarixi ko'paymaydi
        res = self.post({'action': 'delete_debt', 'debt_id': debt.pk, 'reason': 'Yana bir marta'}, **AJAX)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.revisions(target_type='debt', target_id=debt.pk).count(), 1)

    def test_settle_debt_records_status_and_paid_amount_and_the_cash_entry(self):
        debt = self.make_debt(paid_amount=Decimal('120000'), status='partial')
        res = self.post({'action': 'settle_debt', 'debt_id': debt.pk, 'payment_method': 'card', 'reason': 'Mijoz qolganini to`ladi'})
        self.assertEqual(res.status_code, 302)
        state = self.debt_state(debt)
        self.assertEqual((state['paid_amount'], state['status']), (Decimal('500000'), 'settled'))
        cash = FinanceTransaction.objects.get(shop=self.shop, title__startswith="🤝 Nasiya to'liq to'landi")
        self.assertEqual((cash.amount, cash.tx_type, cash.payment_method), (Decimal('380000'), 'income', 'card'))
        rev = self.revisions(target_type='debt', target_id=debt.pk).get()
        self.assert_revision(rev, target_type='debt', target_id=debt.pk, reason='Mijoz qolganini to`ladi')
        self.assertEqual(rev.changes, {'paid_amount': {'old': '120000.00', 'new': '500000.00'}, 'status': {'old': 'partial', 'new': 'settled'}})
        log = self.assert_audit('debt_settled', 'debt_record', debt.pk, rev, 'Mijoz qolganini to`ladi')
        self.assertEqual(log.metadata['cash_transaction_id'], cash.pk)

    def test_settle_debt_of_a_supplier_is_an_expense_and_a_second_click_adds_nothing(self):
        debt = self.make_debt(debt_type='supplier', person_name='Ta`minotchi')
        body = {'action': 'settle_debt', 'debt_id': debt.pk, 'reason': 'Hisob-kitob yopildi'}
        self.post(body)
        cash = FinanceTransaction.objects.get(shop=self.shop, title__startswith="🤝 Qarz to'liq to'landi")
        self.assertEqual((cash.tx_type, cash.amount), ('expense', Decimal('500000')))
        res = self.post(body)                                       # qo'sh bosish
        self.assertEqual(flash(res)[-1], "Bu qarz allaqachon to'liq yopilgan")
        self.assertEqual(FinanceTransaction.objects.filter(shop=self.shop, title__startswith="🤝 Qarz to'liq").count(), 1)
        self.assertEqual(self.revisions(target_type='debt', target_id=debt.pk).count(), 1)

    def test_a_chain_of_actions_keeps_numbered_immutable_history(self):
        tx = self.make_tx()
        self.post(self.edit_body(tx, amount='111', reason='Birinchi tahrir'))
        self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Ikkinchi: yashirish'})
        self.post({'action': 'restore_transaction', 'tx_id': tx.pk, 'reason': 'Uchinchi: tiklash'})
        self.post({'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'planned', 'reason': "To'rtinchi: ko`chirish"})
        revs = list(self.revisions(target_id=tx.pk))
        self.assertEqual([(r.revision_no, r.reason) for r in revs],
                         [(1, 'Birinchi tahrir'), (2, 'Ikkinchi: yashirish'), (3, 'Uchinchi: tiklash'), (4, "To'rtinchi: ko`chirish")])
        # boshqa yozuvning tarixi alohida sanaladi
        other = self.make_tx(title='Boshqa')
        self.post({'action': 'delete_tx', 'tx_id': other.pk, 'reason': 'Boshqasi uchun'})
        self.assertEqual(self.revisions(target_id=other.pk).get().revision_no, 1)

    def test_history_rows_cannot_be_changed_or_deleted(self):
        tx = self.make_tx()
        self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': "O'zgarmas tarix"})
        rev = self.revisions(target_id=tx.pk).get()
        snapshot = (rev.reason, rev.changes, rev.revision_no, rev.changed_by_name)
        rev.reason = 'Jimgina almashtirildi'
        with self.assertRaises(ImmutableRecordError):
            rev.save()
        with self.assertRaises(ImmutableRecordError):
            FinanceRevision.objects.filter(pk=rev.pk).update(reason='Jimgina')
        with self.assertRaises(ImmutableRecordError):
            FinanceRevision.objects.filter(pk=rev.pk).delete()
        with self.assertRaises(ImmutableRecordError):
            rev.delete()
        # keyingi amallar avvalgi qatorlarni o'zgartirmaydi
        self.post({'action': 'restore_transaction', 'tx_id': tx.pk, 'reason': 'Tiklandi'})
        fresh = FinanceRevision.objects.get(pk=rev.pk)
        self.assertEqual((fresh.reason, fresh.changes, fresh.revision_no, fresh.changed_by_name), snapshot)

    def test_the_new_ra_history_shows_the_panel_actions_with_their_reasons(self):
        tx = self.make_tx()
        self.post(self.edit_body(tx, amount='555', reason='Panelda tuzatildi'))
        self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Panelda yashirildi'})
        history = self.client_owner.get(f'{API}transactions/{tx.pk}/history/').json()
        self.assertEqual([r['reason'] for r in history['results']], ['Panelda yashirildi', 'Panelda tuzatildi'])
        # bazada mantiqiy qiymat saqlanadi, API'da esa satr ('true'/'false'): /ra/ klienti string | null kutadi
        self.assertEqual(FinanceRevision.objects.get(target_id=tx.pk, revision_no=2).changes, {'hidden': {'old': False, 'new': True}})
        self.assertEqual(history['results'][0]['changes'], {'hidden': {'old': 'false', 'new': 'true'}})
        self.assertEqual(history['original']['amount'], '100000.00')
        self.assertEqual(history['original']['hidden'], 'false')

    def test_the_panel_page_asks_for_a_reason_everywhere_it_is_needed(self):
        res = self.client_owner.get(self.url)
        self.assertEqual(res.status_code, 200)
        html = res.content.decode()
        self.assertIn('id="edit_reason"', html)
        self.assertIn('name="reason" required minlength="5" maxlength="300"', html)
        self.assertIn('function askFinanceReason', html)
        self.assertIn('function promptFinanceReason', html)
        # inline formalar: qarzni yopish, qarzni o'chirish, tiklash
        self.make_debt()
        self.make_cancelled_tx()
        html = self.client_owner.get(self.url).content.decode()
        for action in ('settle_debt', 'delete_debt', 'restore_transaction'):
            marker = f'name="action" value="{action}">'
            self.assertIn(marker, html, action)
            form_tail = html[html.index(marker):][:400]
            self.assertIn('name="reason"', form_tail, action)
        self.assertEqual(html.count('askFinanceReason(this,'), 3)


# ─── 3. Atomiklik: tarix yoki audit yozilmasa amal ham saqlanmaydi ─────────────────────────────────

class AtomicityTests(SellerFinanceBase):

    def cases(self):
        tx_edit, tx_move = self.make_tx(), self.make_tx(stage='planned')
        tx_restore, tx_delete = self.make_cancelled_tx(), self.make_tx()
        debt_settle, debt_delete = self.make_debt(), self.make_debt()
        return [
            ('edit', self.edit_body(tx_edit, amount='9', reason='Tahrir sababi'), lambda: self.tx_state(tx_edit)),
            ('move', {'action': 'move_transaction', 'tx_id': tx_move.pk, 'target_stage': 'income', 'reason': "Ko'chirish sababi"},
             lambda: self.tx_state(tx_move)),
            ('restore', {'action': 'restore_transaction', 'tx_id': tx_restore.pk, 'reason': 'Tiklash sababi'}, lambda: self.tx_state(tx_restore)),
            ('delete_tx', {'action': 'delete_tx', 'tx_id': tx_delete.pk, 'reason': "O'chirish sababi"}, lambda: self.tx_state(tx_delete)),
            ('settle', {'action': 'settle_debt', 'debt_id': debt_settle.pk, 'reason': 'Yopish sababi'}, lambda: self.debt_state(debt_settle)),
            ('delete_debt', {'action': 'delete_debt', 'debt_id': debt_delete.pk, 'reason': "Daftardan o'chirish"},
             lambda: self.debt_state(debt_delete)),
        ]

    def run_failing(self, target):
        cases = self.cases()
        count_before = FinanceTransaction.objects.count()
        for name, body, probe in cases:
            before = probe()
            with self.subTest(action=name), mock.patch(target, side_effect=RuntimeError('boom')):
                res = self.post(body)
                self.assertEqual(res.status_code, 302)
                self.assertEqual(len(flash(res)), 1)
                self.assertEqual(probe(), before, "tarix/audit yozilmasa, amalning o'zi ham saqlanmasligi kerak")
        self.assertEqual(FinanceTransaction.objects.count(), count_before, "qarzni yopish kassaga yarim yozuv qoldirmasligi kerak")
        self.assert_nothing_recorded()
        self.assertEqual(FinanceMovementHistory.objects.count(), 0)

    def test_nothing_is_saved_when_the_history_cannot_be_written(self):
        self.run_failing('finance.views.record_change')

    def test_nothing_is_saved_when_the_audit_log_cannot_be_written(self):
        self.run_failing('finance.services.revisions.log_audit')


# ─── 4. Manba qulfi va storno qulfi ───────────────────────────────────────────────────────────────

class LockTests(SellerFinanceBase):

    def order_income(self):
        order = create_order(shop=self.shop, customer_name='Ali', customer_phone_1='+998901112233', total_amount=Decimal('50000'),
                             final_amount=Decimal('50000'), status='pending', payment_status='paid')
        return self.make_tx(tx_type='income', stage='income', order=order, amount=Decimal('50000'), title='Chek tushumi')

    def debt_payment(self):
        debt = self.make_debt(paid_amount=Decimal('100000'), status='partial')
        return self.make_tx(tx_type='income', stage='income', debt=debt, amount=Decimal('100000'), title="Nasiya to'lovi")

    def attempts(self, tx):
        return [
            ('edit', self.edit_body(tx, amount='1', reason='Tuzatmoqchiman')),
            ('move', {'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'planned', 'reason': "Ko'chirmoqchiman"}),
        ]

    def test_receipt_income_from_an_order_cannot_be_edited_or_moved(self):
        tx = self.order_income()
        before = self.tx_state(tx)
        for name, body in self.attempts(tx):
            with self.subTest(action=name):
                res = self.post(body)
                self.assertEqual(flash(res), [MSG_SOURCE_LOCKED])
                self.assertEqual(self.tx_state(tx), before)
                res = self.post(body, **AJAX)
                self.assertEqual((res.status_code, res.json()['code'], res.json()['error']), (409, 'source_locked', MSG_SOURCE_LOCKED))
        self.assert_nothing_recorded()
        self.assertFalse(tx.movements.exists())

    def test_debt_payment_cannot_be_edited_or_moved(self):
        tx = self.debt_payment()
        before = self.tx_state(tx)
        for name, body in self.attempts(tx):
            with self.subTest(action=name):
                res = self.post(body)
                self.assertEqual(flash(res), [MSG_SOURCE_LOCKED])
                self.assertEqual(self.tx_state(tx), before)
        self.assert_nothing_recorded()

    def test_the_lock_message_names_the_section_to_use(self):
        self.assertIn("tegishli bo'limda", MSG_SOURCE_LOCKED)
        self.assertEqual(MSG_SOURCE_LOCKED, "Bu yozuv buyurtma/qarz to'lovidan hosil bo'lgan: uni tegishli bo'limda o'zgartiring")

    def test_cancelled_transaction_cannot_be_edited_or_moved_only_restored_with_a_reason(self):
        tx = self.make_cancelled_tx()
        before = self.tx_state(tx)
        for name, body in self.attempts(tx):
            with self.subTest(action=name):
                res = self.post(body)
                self.assertEqual(flash(res), [MSG_CANCELLED_LOCKED])
                self.assertEqual(self.tx_state(tx), before)
                res = self.post(body, **AJAX)
                self.assertEqual((res.status_code, res.json()['code']), (409, 'cancelled'))
        self.assert_nothing_recorded()
        # sabab bilan tiklash mumkin, tiklangandan keyin tahrirlanadi
        self.post({'action': 'restore_transaction', 'tx_id': tx.pk, 'reason': 'Haqiqatan ham kerak edi'})
        self.assertFalse(self.tx_state(tx)['is_cancelled'])
        self.post(self.edit_body(tx, amount='42', reason='Tiklangach tuzatildi'))
        self.assertEqual(self.tx_state(tx)['amount'], Decimal('42'))
        self.assertEqual([r.revision_no for r in self.revisions(target_id=tx.pk)], [1, 2])

    def test_a_manual_transaction_is_not_locked(self):
        tx = self.make_tx()
        self.post(self.edit_body(tx, amount='42', reason='Qo`lda kiritilgan edi'))
        self.assertEqual(self.tx_state(tx)['amount'], Decimal('42'))


# ─── 5. Tenant izolyatsiyasi va ruxsat ────────────────────────────────────────────────────────────

class TenantAndPermissionTests(SellerFinanceBase):

    def foreign_cases(self):
        """Boshqa restoranning yozuvlari (egasi A, begona B) va ularga qarshi har bir amal."""
        tx_edit, tx_move = self.make_tx(shop=self.other_shop), self.make_tx(shop=self.other_shop, stage='planned')
        tx_restore, tx_delete = self.make_tx(shop=self.other_shop, is_cancelled=True, cancel_reason='B'), self.make_tx(shop=self.other_shop)
        debt_settle, debt_delete = self.make_debt(shop=self.other_shop), self.make_debt(shop=self.other_shop)
        return [
            (self.edit_body(tx_edit, amount='1', reason='Begona yozuv'), lambda: self.tx_state(tx_edit)),
            ({'action': 'move_transaction', 'tx_id': tx_move.pk, 'target_stage': 'income', 'reason': 'Begona yozuv'}, lambda: self.tx_state(tx_move)),
            ({'action': 'restore_transaction', 'tx_id': tx_restore.pk, 'reason': 'Begona yozuv'}, lambda: self.tx_state(tx_restore)),
            ({'action': 'delete_tx', 'tx_id': tx_delete.pk, 'reason': 'Begona yozuv'}, lambda: self.tx_state(tx_delete)),
            ({'action': 'settle_debt', 'debt_id': debt_settle.pk, 'reason': 'Begona yozuv'}, lambda: self.debt_state(debt_settle)),
            ({'action': 'delete_debt', 'debt_id': debt_delete.pk, 'reason': 'Begona yozuv'}, lambda: self.debt_state(debt_delete)),
        ]

    def test_another_restaurants_records_cannot_be_touched(self):
        cases = self.foreign_cases()
        count = FinanceTransaction.objects.count()
        for body, probe in cases:
            before = probe()
            with self.subTest(action=body['action']):
                res = self.post(body)
                self.assertEqual(res.status_code, 302)
                self.assertEqual(len(flash(res)), 1)
                self.assertIn('topilmadi', flash(res)[0])
                self.assertEqual(probe(), before)
                res = self.post(body, **AJAX)
                self.assertEqual((res.status_code, res.json()['code']), (404, 'not_found'))
                self.assertEqual(probe(), before)
        self.assert_nothing_recorded()
        self.assertEqual(FinanceTransaction.objects.count(), count)

    def test_unknown_and_malformed_ids_are_refused_cleanly(self):
        for raw in ('999999', '0', '-5', 'abc', '', '1; DROP TABLE finance_transactions'):
            for action, key in (('edit_transaction', 'tx_id'), ('move_transaction', 'tx_id'), ('restore_transaction', 'tx_id'),
                                ('delete_tx', 'tx_id'), ('settle_debt', 'debt_id'), ('delete_debt', 'debt_id')):
                with self.subTest(action=action, id=raw):
                    res = self.post({'action': action, key: raw, 'reason': 'Noma`lum id', 'amount': '5', 'target_stage': 'income'}, **AJAX)
                    self.assertEqual((res.status_code, res.json()['code']), (404, 'not_found'))
        self.assert_nothing_recorded()

    def test_the_other_restaurants_owner_cannot_touch_our_records_either(self):
        tx = self.make_tx()
        res = self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Raqobatchi kirdi'}, client=logged_in(self.other_owner), **AJAX)
        self.assertEqual(res.status_code, 404)
        self.assertFalse(self.tx_state(tx)['is_cancelled'])
        self.assert_nothing_recorded()

    def test_history_is_written_for_the_actors_own_shop_only(self):
        tx = self.make_tx()
        self.post({'action': 'delete_tx', 'tx_id': tx.pk, 'reason': "O'z restoranim"})
        self.assertEqual(FinanceRevision.objects.get().shop_id, self.shop.pk)
        self.assertFalse(FinanceRevision.objects.filter(shop=self.other_shop).exists())

    def test_staff_without_the_finance_capability_is_refused(self):
        tx = self.make_tx()
        debt = self.make_debt()
        cancelled = self.make_cancelled_tx()
        bodies = [
            self.edit_body(tx, amount='1', reason='Ruxsatsiz urinish'),
            {'action': 'move_transaction', 'tx_id': tx.pk, 'target_stage': 'planned', 'reason': 'Ruxsatsiz urinish'},
            {'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Ruxsatsiz urinish'},
            {'action': 'restore_transaction', 'tx_id': cancelled.pk, 'reason': 'Ruxsatsiz urinish'},
            {'action': 'settle_debt', 'debt_id': debt.pk, 'reason': 'Ruxsatsiz urinish'},
            {'action': 'delete_debt', 'debt_id': debt.pk, 'reason': 'Ruxsatsiz urinish'},
        ]
        states = (self.tx_state(tx), self.debt_state(debt), self.tx_state(cancelled))
        for user in (self.no_finance, self.waiter):
            client = logged_in(user)
            for body in bodies:
                with self.subTest(user=user.username, action=body['action']):
                    res = client.post(self.url, body)
                    self.assertIn(res.status_code, (302, 403))
                    if res.status_code == 302:
                        self.assertNotEqual(res['Location'], self.url)
        self.assertEqual((self.tx_state(tx), self.debt_state(debt), self.tx_state(cancelled)), states)
        self.assert_nothing_recorded()
        self.assertEqual(logged_in(self.no_finance).post(self.url, bodies[0]).status_code, 403)

    def test_anonymous_requests_change_nothing(self):
        tx = self.make_tx()
        res = Client().post(self.url, {'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Kirmagan foydalanuvchi'})
        self.assertEqual(res.status_code, 302)
        self.assertFalse(self.tx_state(tx)['is_cancelled'])
        self.assert_nothing_recorded()

    def test_a_manager_with_finance_works_and_is_recorded_as_the_actor(self):
        tx = self.make_tx()
        client = logged_in(self.manager)
        client.post(self.url, {'action': 'delete_tx', 'tx_id': tx.pk, 'reason': 'Menejer yashirdi'})
        rev = self.revisions(target_id=tx.pk).get()
        self.assertEqual((rev.changed_by_id, rev.changed_by_role, rev.reason), (self.manager.pk, 'shop_manager', 'Menejer yashirdi'))
        log = AuditLog.objects.get(action_type='finance_tx_hidden')
        self.assertEqual((log.actor_id, json.dumps(log.metadata['reason'])), (self.manager.pk, json.dumps('Menejer yashirdi')))
