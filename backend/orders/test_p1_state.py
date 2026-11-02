"""P1-7: holat mashinasi qulflanadi, bekor qilish kassada storno qiladi, bekor qilinganga to'lov yozilmaydi."""
from django.test import Client, TestCase

from finance.models import FinanceTransaction
from finance.services.order_integration import record_order_payment_income
from orders.models import Order
from orders.state_machine import transition_order
from web.test_p0_sale_ready import make_owner

RESTO = {'HTTP_X_PRODUCT': 'restaurant'}


class OrderStateTests(TestCase):
    def setUp(self):
        self.owner, self.shop = make_owner('ega-s', 'resto-s')

    def order(self, status='confirmed', payment_status='unpaid'):
        return Order.objects.create(order_number=f'S-{Order.objects.count() + 1}', customer_name='x', customer_phone_1='',
                                    shop=self.shop, status=status, payment_status=payment_status,
                                    total_amount=50000, final_amount=50000)

    def test_cancelling_a_paid_order_reverses_the_cash_income(self):
        order = self.order(payment_status='paid')
        record_order_payment_income(order, actor=self.owner)
        tx = FinanceTransaction.objects.get(order=order, tx_type='income')
        self.assertFalse(tx.is_cancelled)

        ok, _msg = transition_order(order, 'cancelled', actor=self.owner, reason='Mijoz rad etdi')
        self.assertTrue(ok)
        tx.refresh_from_db()
        order.refresh_from_db()
        self.assertTrue(tx.is_cancelled)
        self.assertEqual(order.payment_status, 'refunded')
        self.assertEqual(order.status, 'cancelled')

    def test_cancelling_an_unpaid_order_keeps_payment_status(self):
        order = self.order()
        self.assertTrue(transition_order(order, 'cancelled', actor=self.owner)[0])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'unpaid')

    def test_stale_copy_cannot_override_a_finished_order(self):
        a = Order.objects.get(pk=self.order().pk)
        b = Order.objects.get(pk=a.pk)               # ikkinchi xodim ham "confirmed" ni ko'rgan
        self.assertTrue(transition_order(a, 'cancelled', actor=self.owner)[0])
        ok, _msg = transition_order(b, 'preparing', actor=self.owner)
        self.assertFalse(ok)
        self.assertFalse(transition_order(b, 'cancelled', actor=self.owner)[0])
        self.assertEqual(Order.objects.get(pk=a.pk).status, 'cancelled')

    def test_delivered_order_cannot_be_cancelled(self):
        order = self.order(status='ready')
        self.assertTrue(transition_order(order, 'delivered', actor=self.owner)[0])
        self.assertFalse(transition_order(order, 'cancelled', actor=self.owner)[0])

    def test_payment_cannot_be_recorded_on_a_cancelled_order(self):
        order = self.order(status='cancelled')
        client = Client()
        client.force_login(self.owner)
        resp = client.post(f'/api/restaurant/admin/v1/orders/{order.pk}/payment/',
                           data='{"payment_status": "paid"}', content_type='application/json', **RESTO)
        self.assertEqual(resp.status_code, 409, resp.content)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertFalse(FinanceTransaction.objects.filter(order=order).exists())
