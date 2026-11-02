"""
Xodim boti (TZ B2): yangi buyurtma kartochkasi, tugmalar maketi va IKKI BOSQICHLI bekor qilish.
"""
import json
from decimal import Decimal
from unittest import mock

from django.test import Client, TestCase, override_settings

from notifications.admin_bot import build_cancel_confirm_keyboard, build_order_keyboard
from notifications.order_card import MAX_ITEM_LINES, order_card_text
from notifications.test_admin_scope import CHAT_A, CHAT_B, make_shop
from notifications.test_outbox import TOKEN, telegram_ok
from notifications.webhook_security import webhook_secret_for
from orders.models import Order, OrderItem
from tables_restaurant.models import Table


def make_order(shop, number, status='pending', table=None, items=(('Lag\'mon', '42000', 2), ('Choy', '8000', 1)),
               is_pickup=False, address='', fee='0', name='Mijoz', phone='+998901112233', payment_status='unpaid'):
    total = sum(Decimal(price) * qty for _n, price, qty in items)
    order = Order.objects.create(
        shop=shop, table=table, order_number=number, customer_name=name, customer_phone_1=phone, status=status,
        payment_status=payment_status, is_pickup=is_pickup, delivery_address=address,
        total_amount=total, delivery_fee=Decimal(fee), final_amount=total + Decimal(fee))
    for n, price, qty in items:
        OrderItem.objects.create(order=order, product_name=n, price=Decimal(price), quantity=qty, unit='porsiya',
                                 total=Decimal(price) * qty)
    return order


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class OrderCardTextTests(TestCase):

    def setUp(self):
        self.shop = make_shop('oc-shop', 'Karta Oshxona', 'oc-owner', CHAT_A)
        self.table = Table.objects.filter(shop=self.shop).first()

    def test_table_order_card(self):
        order = make_order(self.shop, 'OC-1', table=self.table)
        text = order_card_text(order)
        self.assertIn('Yangi buyurtma #OC-1', text)
        self.assertIn(f'Stol {self.table.number}', text)
        self.assertIn("Lag'mon ×2 — 84 000", text)
        self.assertIn('Choy ×1 — 8 000', text)
        self.assertIn('92 000 so\'m', text)
        self.assertIn(order.get_payment_status_display(), text)
        self.assertIn('Mijoz', text, 'ism ofitsiant uchun ko\'rinadi')
        self.assertNotIn('998901112233', text, 'stol buyurtmasida telefon kartochkada yo\'q')
        self.assertNotIn('Yetkazish', text)

    def test_pickup_card_shows_who_and_no_address(self):
        text = order_card_text(make_order(self.shop, 'OC-2', is_pickup=True, name='Anvar'))
        self.assertIn('Olib ketish', text)
        self.assertIn('Anvar', text)
        self.assertIn('+998901112233', text)

    def test_delivery_card_shows_address_fee_and_contact(self):
        text = order_card_text(make_order(self.shop, 'OC-3', address="Chilonzor, 5-uy", fee='10000'))
        self.assertIn('Yetkazib berish', text)
        self.assertIn('Chilonzor, 5-uy', text)
        self.assertIn('Yetkazish: 10 000', text)
        self.assertIn('+998901112233', text)

    def test_delivery_without_address_says_so(self):
        self.assertIn("manzil ko'rsatilmagan", order_card_text(make_order(self.shop, 'OC-4')))

    def test_hostile_text_is_escaped(self):
        order = make_order(self.shop, 'OC-5', items=(('<script>x</script>', '1000', 1),), name='<b>&')
        text = order_card_text(order)
        self.assertNotIn('<script>', text)
        self.assertIn('&lt;script&gt;', text)

    def test_many_items_are_capped(self):
        items = tuple((f'Taom {i}', '1000', 1) for i in range(MAX_ITEM_LINES + 3))
        text = order_card_text(make_order(self.shop, 'OC-6', table=self.table, items=items))
        self.assertIn('yana 3 ta taom', text)
        self.assertEqual(text.count(' • '), MAX_ITEM_LINES)

    def test_text_never_exceeds_the_telegram_limit(self):
        items = tuple(('X' * 300, '1000', 1) for _ in range(MAX_ITEM_LINES))
        text = order_card_text(make_order(self.shop, 'OC-7', table=self.table, items=items), link='\n\n🔗 link')
        self.assertLess(len(text), 4096)

    def test_link_is_appended(self):
        self.assertTrue(order_card_text(make_order(self.shop, 'OC-8', table=self.table), link='\n\n🔗 L').endswith('🔗 L'))


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class OrderKeyboardTests(TestCase):

    def setUp(self):
        self.shop = make_shop('ok-shop', 'Tugma Oshxona', 'ok-owner', CHAT_A)
        self.table = Table.objects.filter(shop=self.shop).first()

    def flat(self, kb):
        return [b for row in kb['inline_keyboard'] for b in row]

    def test_table_order_layout_and_callbacks(self):
        order = make_order(self.shop, 'OK-1', table=self.table)
        buttons = self.flat(build_order_keyboard(order))
        self.assertEqual([b['text'] for b in buttons],
                         ['✅ Qabul qilish', '👨‍🍳 Tayyorlanmoqda', '🩵 Tayyor', '🟢 Berildi', f'📍 Stol №{self.table.number}', '❌ Bekor qilish'])
        cbs = [b['callback_data'] for b in buttons]
        self.assertIn(f'ord_status:{order.id}:confirmed', cbs)
        self.assertIn(f'ord_cancel:{order.id}', cbs)
        self.assertNotIn(f'ord_status:{order.id}:cancelled', cbs, "bekor qilish to'g'ridan-to'g'ri bo'lmasligi kerak")
        self.assertTrue(all(len(c.encode()) <= 64 for c in cbs))

    def test_current_status_is_marked(self):
        buttons = self.flat(build_order_keyboard(make_order(self.shop, 'OK-2', table=self.table, status='preparing')))
        self.assertIn('▶️ 👨‍🍳 Tayyorlanmoqda ◀️', [b['text'] for b in buttons])

    def test_delivery_layout(self):
        order = make_order(self.shop, 'OK-3', address='x')
        buttons = self.flat(build_order_keyboard(order))
        self.assertEqual([b['text'] for b in buttons], ['✅ Tasdiqlash', "🚗 Yo'lga chiqdi", '🎉 Yetkazildi', '❌ Bekor qilish'])
        self.assertIn(f'ord_cancel:{order.id}', [b['callback_data'] for b in buttons])

    def test_cancelled_order_shows_the_marker_not_a_cancel_button(self):
        order = make_order(self.shop, 'OK-4', table=self.table, status='cancelled')
        texts = [b['text'] for b in self.flat(build_order_keyboard(order))]
        self.assertIn('▶️ Bekor qilingan ◀️', texts)
        self.assertNotIn('❌ Bekor qilish', texts)

    def test_confirm_keyboard(self):
        order = make_order(self.shop, 'OK-5', table=self.table)
        buttons = self.flat(build_cancel_confirm_keyboard(order))
        self.assertEqual([b['callback_data'] for b in buttons], [f'ord_status:{order.id}:cancelled', f'ord_back:{order.id}'])


@override_settings(ROOT_URLCONF='backend.urls_restaurant', TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN,
                   TELEGRAM_CHAT_ID='', TELEGRAM_ADMIN_CHAT_IDS='')
class CancelFlowTests(TestCase):

    def setUp(self):
        self.shop_a = make_shop('cf-a', 'Alfa', 'cf-owner-a', CHAT_A)
        self.shop_b = make_shop('cf-b', 'Beta', 'cf-owner-b', CHAT_B)
        self.table = Table.objects.filter(shop=self.shop_a).first()
        self.client = Client()

    def press(self, chat_id, data):
        secret = webhook_secret_for(TOKEN)
        update = {'callback_query': {'id': 'cq1', 'data': data, 'from': {'id': int(chat_id), 'username': ''},
                                     'message': {'message_id': 5, 'chat': {'id': int(chat_id)}}}}
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            res = self.client.post('/bot/restaurant/webhook/', json.dumps(update), content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret)
        self.assertEqual(res.status_code, 200, res.content)
        payloads = [c.kwargs['json'] for c in post.call_args_list if isinstance(c.kwargs.get('json'), dict)]
        answers = '\n'.join(str(p.get('text', '')) for p in payloads if 'callback_query_id' in p)
        edits = []
        for p in payloads:
            if 'message_id' in p and 'reply_markup' in p:
                markup = p['reply_markup']
                edits.append(json.loads(markup) if isinstance(markup, str) else markup)
        return answers, edits

    def status(self, order):
        order.refresh_from_db()
        return order.status

    def test_first_press_only_asks_and_does_not_cancel(self):
        order = make_order(self.shop_a, 'CF-1', table=self.table)
        answers, edits = self.press(CHAT_A, f'ord_cancel:{order.id}')
        self.assertEqual(self.status(order), 'pending')
        self.assertIn('bekor qilasizmi', answers)
        self.assertIn(f'ord_status:{order.id}:cancelled', json.dumps(edits[0]))
        self.assertIn(f'ord_back:{order.id}', json.dumps(edits[0]))

    def test_back_restores_the_normal_keyboard(self):
        order = make_order(self.shop_a, 'CF-2', table=self.table)
        answers, edits = self.press(CHAT_A, f'ord_back:{order.id}')
        self.assertEqual(self.status(order), 'pending')
        self.assertIn('Bekor qilinmadi', answers)
        self.assertIn(f'ord_cancel:{order.id}', json.dumps(edits[0]))

    def test_confirming_cancels_with_the_state_machine(self):
        order = make_order(self.shop_a, 'CF-3', table=self.table)
        self.press(CHAT_A, f'ord_cancel:{order.id}')
        self.press(CHAT_A, f'ord_status:{order.id}:cancelled')
        self.assertEqual(self.status(order), 'cancelled')

    def test_old_direct_cancel_buttons_keep_working(self):
        order = make_order(self.shop_a, 'CF-4', address='x')
        self.press(CHAT_A, f'ord_status:{order.id}:cancelled')
        self.assertEqual(self.status(order), 'cancelled')

    def test_delivered_order_cannot_be_asked_to_cancel(self):
        order = make_order(self.shop_a, 'CF-5', table=self.table, status='delivered')
        answers, edits = self.press(CHAT_A, f'ord_cancel:{order.id}')
        self.assertIn("endi bekor qilib bo'lmaydi", answers)
        self.assertEqual(edits, [])
        self.assertEqual(self.status(order), 'delivered')

    def test_another_restaurants_admin_cannot_even_ask(self):
        order = make_order(self.shop_a, 'CF-6', table=self.table)
        answers, edits = self.press(CHAT_B, f'ord_cancel:{order.id}')
        self.assertIn('topilmadi', answers)
        self.assertEqual(edits, [])
        self.assertEqual(self.status(order), 'pending')

    def test_a_stranger_cannot_use_the_buttons(self):
        order = make_order(self.shop_a, 'CF-7', table=self.table)
        answers, edits = self.press(999111, f'ord_cancel:{order.id}')
        self.assertEqual(edits, [])
        self.assertEqual(self.status(order), 'pending')

    def test_garbage_ids_are_rejected(self):
        for data in ('ord_cancel:abc', 'ord_cancel:', 'ord_cancel:99999999', 'ord_back:-1'):
            answers, edits = self.press(CHAT_A, data)
            self.assertEqual(edits, [], data)

    def test_accept_button_confirms_a_table_order(self):
        order = make_order(self.shop_a, 'CF-8', table=self.table)
        self.press(CHAT_A, f'ord_status:{order.id}:confirmed')
        self.assertEqual(self.status(order), 'confirmed')
