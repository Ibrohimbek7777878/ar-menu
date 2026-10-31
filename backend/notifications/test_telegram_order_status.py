"""
Telegram `ord_status:<id>:<holat>` tugmasi buyurtma holat mashinasi orqali ishlaydi (TZ §11, roadmap P2).

Avval tugma `order.status` ni to'g'ridan-to'g'ri yozardi: `orders.state_machine.transition_order` chetlab o'tilardi.
Oqibati: (1) ruxsat etilmagan o'tishlar bajarilardi (kutilmoqda -> yetkazildi, bekor qilingan buyurtmani qayta ochish);
(2) tarix (OrderStatusHistory) yozilmasdi; (3) yetkazib berish buyurtmasi "yetkazildi" bo'lganda to'lov/kassa kirimi,
ombor va mijoz statistikasi yangilanmasdi; (4) bekor qilishda zaxira bo'shatilmasdi, `cancelled_at` qo'yilmasdi;
(5) xabar chiqish navbatini (outbox) chetlab, so'rov ichida to'g'ridan-to'g'ri yuborilardi.
Admin API (`orders_admin.OrderStatusUpdateView`) bilan bir xil qoidalar: o'tish ruxsat etilmasa holat o'zgarmaydi va
Telegram'ga tushunarli qisqa javob beriladi. Admin huquqi (`resolve_admin_scope`, do'kon doirasi) o'zgarmagan.
Tarmoqqa chiqilmaydi: httpx.post almashtirilgan.
"""
import json
from decimal import Decimal
from unittest import mock

from django.test import Client, TestCase, override_settings

from finance.models import FinanceTransaction
from notifications.models import OutboxEvent
from notifications.test_admin_scope import CHAT_A, CHAT_B, PLATFORM_CHAT, make_shop
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from orders.models import Order, OrderStatusHistory
from tables_restaurant.models import Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN,
                   TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class TelegramOrderStatusTests(TestCase):

    def setUp(self):
        self.shop_a = make_shop('tgos-a', 'Alfa Oshxona', 'tgos-owner-a', CHAT_A)
        self.shop_b = make_shop('tgos-b', 'Beta Oshxona', 'tgos-owner-b', CHAT_B)
        self.table_a = Table.objects.filter(shop=self.shop_a).first()
        self.client = Client()

    # ── yordamchilar ────────────────────────────────────────────────────────
    def make_order(self, shop, number, status='pending', table=None, payment_status='unpaid'):
        return Order.objects.create(
            shop=shop, table=table, order_number=number, customer_name='Mijoz', customer_phone_1='+998901111111',
            total_amount=Decimal('50000'), final_amount=Decimal('50000'), status=status, payment_status=payment_status)

    def press(self, chat_id, data):
        secret = webhook_secret_for(TOKEN)
        update = {'callback_query': {'id': 'cq1', 'data': data, 'from': {'id': int(chat_id), 'username': ''},
                                     'message': {'message_id': 5, 'chat': {'id': int(chat_id)}}}}
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        payloads = [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]
        return '\n'.join(str(p.get('text', '')) for p in payloads)

    def status_of(self, order):
        order.refresh_from_db()
        return order.status

    # ── 1. ruxsat etilmagan o'tishlar rad etiladi ───────────────────────────────
    def test_illegal_jump_is_refused_with_a_short_answer_and_nothing_changes(self):
        order = self.make_order(self.shop_a, 'TGOS-1', table=self.table_a)           # kutilmoqda
        before_table = self.table_a.status
        out = self.press(CHAT_A, f'ord_status:{order.id}:delivered')                  # kutilmoqda -> yetkazildi: mumkin emas
        self.assertIn("o'tish mumkin emas", out)
        self.assertEqual(self.status_of(order), 'pending')
        self.assertIsNone(order.delivered_at)
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, before_table)
        self.assertFalse(OrderStatusHistory.objects.filter(order=order).exists())
        self.assertFalse(OutboxEvent.objects.filter(event_type='order.status_changed').exists())

    def test_pending_to_preparing_confirms_first_like_the_kds(self):
        """
        Stol klaviaturasida "Tasdiqlash" tugmasi yo'q; KDS ham kutilayotgan buyurtmani avval 'confirmed' qiladi. Telegram ham
        shunday: holat mashinasi (kutilmoqda -> tayyorlanmoqda to'g'ridan-to'g'ri mumkin emas) buzilmaydi, tarixda ikki qadam.
        """
        order = self.make_order(self.shop_a, 'TGOS-2', table=self.table_a)
        out = self.press(CHAT_A, f'ord_status:{order.id}:preparing')
        self.assertNotIn("o'tish mumkin emas", out)
        self.assertEqual(self.status_of(order), 'preparing')
        self.assertEqual(list(OrderStatusHistory.objects.filter(order=order).order_by('id').values_list('status', flat=True)),
                         ['confirmed', 'preparing'])
        self.assertEqual(OutboxEvent.objects.filter(event_type='order.status_changed', aggregate_id=str(order.id)).count(), 2)

    def test_pending_cannot_jump_to_delivered_even_with_auto_confirm(self):
        """Avto-tasdiq faqat tayyorlash/tayyor uchun: "berildi" kutilayotgan buyurtmada hamon rad etiladi."""
        order = self.make_order(self.shop_a, 'TGOS-2B', table=self.table_a)
        out = self.press(CHAT_A, f'ord_status:{order.id}:delivered')
        self.assertIn("o'tish mumkin emas", out)
        self.assertEqual(self.status_of(order), 'pending')
        self.assertFalse(OrderStatusHistory.objects.filter(order=order).exists())

    def test_closed_orders_cannot_be_reopened_or_changed(self):
        cancelled = self.make_order(self.shop_a, 'TGOS-3', status='cancelled')
        delivered = self.make_order(self.shop_a, 'TGOS-4', status='delivered')
        for order, target in ((cancelled, 'preparing'), (cancelled, 'confirmed'), (delivered, 'cancelled'),
                              (delivered, 'preparing')):
            out = self.press(CHAT_A, f'ord_status:{order.id}:{target}')
            self.assertIn("o'tish mumkin emas", out)
        self.assertEqual(self.status_of(cancelled), 'cancelled')
        self.assertEqual(self.status_of(delivered), 'delivered')
        self.assertFalse(OrderStatusHistory.objects.exists())

    # ── 2. ruxsat etilgan o'tish holat mashinasining barcha ta'siri bilan ────────
    def test_legal_chain_writes_history_and_queues_notifications_instead_of_sending_inline(self):
        order = self.make_order(self.shop_a, 'TGOS-5')                               # yetkazib berish (stolsiz)
        for target in ('confirmed', 'ready', 'delivered'):
            out = self.press(CHAT_A, f'ord_status:{order.id}:{target}')
            self.assertNotIn("o'tish mumkin emas", out)
            self.assertEqual(self.status_of(order), target)
        self.assertEqual(list(OrderStatusHistory.objects.filter(order=order).order_by('id').values_list('status', flat=True)),
                         ['confirmed', 'ready', 'delivered'])
        self.assertEqual(OutboxEvent.objects.filter(event_type='order.status_changed', aggregate_id=str(order.id)).count(), 3)
        order.refresh_from_db()
        self.assertIsNotNone(order.confirmed_at)
        self.assertIsNotNone(order.delivered_at)

    def test_delivering_a_delivery_order_books_income_once(self):
        """Stolsiz buyurtma topshirilganda to'lov olingan hisoblanadi va kassaga BIR marta kirim yoziladi."""
        order = self.make_order(self.shop_a, 'TGOS-6', status='ready')
        self.press(CHAT_A, f'ord_status:{order.id}:delivered')
        self.press(CHAT_A, f'ord_status:{order.id}:delivered')                        # takroriy bosish: hech narsa qo'shilmaydi
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        incomes = FinanceTransaction.objects.filter(order=order, tx_type='income', is_cancelled=False)
        self.assertEqual(incomes.count(), 1)
        self.assertEqual(incomes.first().shop_id, self.shop_a.id)
        self.assertEqual(OrderStatusHistory.objects.filter(order=order, status='delivered').count(), 1)

    def test_delivering_a_table_order_does_not_book_income_yet(self):
        """Stol buyurtmasida kirim stol yopilganda yoziladi (holat mashinasi qoidasi) — Telegram bu qoidani buzmaydi."""
        order = self.make_order(self.shop_a, 'TGOS-7', status='ready', table=self.table_a)
        self.press(CHAT_A, f'ord_status:{order.id}:delivered')
        self.assertEqual(self.status_of(order), 'delivered')
        self.assertFalse(FinanceTransaction.objects.filter(order=order).exists())
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, 'occupied')                              # tugmaning avvalgi stol effekti saqlangan

    def test_table_status_follows_button_as_before(self):
        order = self.make_order(self.shop_a, 'TGOS-8', status='confirmed', table=self.table_a)
        self.press(CHAT_A, f'ord_status:{order.id}:preparing')
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, 'ordering')
        self.press(CHAT_A, f'ord_status:{order.id}:ready')
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, 'ready')

    def test_cancel_goes_through_state_machine(self):
        order = self.make_order(self.shop_a, 'TGOS-9', status='confirmed')
        self.press(CHAT_A, f'ord_status:{order.id}:cancelled')
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertIsNotNone(order.cancelled_at)
        self.assertTrue(OrderStatusHistory.objects.filter(order=order, status='cancelled').exists())
        self.assertFalse(FinanceTransaction.objects.filter(order=order).exists())

    def test_pressing_the_current_status_again_is_a_quiet_noop(self):
        order = self.make_order(self.shop_a, 'TGOS-10')
        self.press(CHAT_A, f'ord_status:{order.id}:confirmed')
        out = self.press(CHAT_A, f'ord_status:{order.id}:confirmed')
        self.assertNotIn("o'tish mumkin emas", out)
        self.assertIn('TGOS-10', out)                                                  # javob uslubi: "Buyurtma #...: holat"
        self.assertEqual(OrderStatusHistory.objects.filter(order=order).count(), 1)

    # ── 3. admin huquqi va do'kon doirasi buzilmagan ──────────────────────────────
    def test_shop_admin_still_cannot_touch_another_shops_order(self):
        order = self.make_order(self.shop_a, 'TGOS-11')
        out = self.press(CHAT_B, f'ord_status:{order.id}:confirmed')
        self.assertIn('topilmadi', out)
        self.assertEqual(self.status_of(order), 'pending')
        self.assertFalse(OrderStatusHistory.objects.exists())

    def test_non_admin_chat_still_refused(self):
        order = self.make_order(self.shop_a, 'TGOS-12')
        out = self.press(424242, f'ord_status:{order.id}:confirmed')
        self.assertIn('Faqat adminlar', out)
        self.assertEqual(self.status_of(order), 'pending')

    def test_unknown_status_still_refused(self):
        order = self.make_order(self.shop_a, 'TGOS-13')
        self.press(CHAT_A, f'ord_status:{order.id}:hacked')
        self.assertEqual(self.status_of(order), 'pending')

    @override_settings(TELEGRAM_ADMIN_CHAT_IDS=PLATFORM_CHAT)
    def test_platform_admin_uses_the_same_rules_on_any_shop(self):
        order = self.make_order(self.shop_b, 'TGOS-14')
        out = self.press(PLATFORM_CHAT, f'ord_status:{order.id}:delivered')
        self.assertIn("o'tish mumkin emas", out)
        self.assertEqual(self.status_of(order), 'pending')
        self.press(PLATFORM_CHAT, f'ord_status:{order.id}:confirmed')
        self.assertEqual(self.status_of(order), 'confirmed')
