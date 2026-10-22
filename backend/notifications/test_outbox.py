"""
Ishonchli fon ishlari va Telegram testlari (TZ: R3-1 … R3-7). Tarmoqqa chiqilmaydi: httpx.post almashtirilgan.
"""
import io
import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, RequestFactory, TestCase, override_settings
from django.utils import timezone

from accounts.models import AdminUser, Customer
from categories.models import Category
from notifications import outbox, telegram_client
from notifications.models import AppSetting, NotificationLog, OutboxEvent
from notifications.outbox import process_outbox_batch, publish_outbox_event
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, ServiceCall, Table

TOKEN = '123456:TEST-token-never-real'
CHAT = '777001'


class FakeResponse:
    def __init__(self, status=200, body=None):
        self.status_code = status
        self._body = body if body is not None else {'ok': True, 'result': {}}

    def json(self):
        return self._body


def telegram_ok():
    return FakeResponse(200, {'ok': True, 'result': {}})


def telegram_error(status, description, **parameters):
    return FakeResponse(status, {'ok': False, 'description': description, 'parameters': parameters})


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN)
class TelegramClientTests(TestCase):

    def test_success(self):
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            result = telegram_client.send(CHAT, '<b>Salom</b>')
        self.assertTrue(result.ok)
        self.assertEqual(post.call_args.kwargs['json']['parse_mode'], 'HTML')

    @override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN='', TELEGRAM_BOT_TOKEN='')
    def test_without_token_is_skipped_not_an_error(self):
        result = telegram_client.send(CHAT, 'x')
        self.assertFalse(result.ok)
        self.assertTrue(result.skipped)

    def test_permanent_errors_are_not_retryable(self):
        for status, text in ((400, 'Bad Request: chat not found'), (403, 'Forbidden: bot was blocked by the user')):
            with mock.patch('httpx.post', return_value=telegram_error(status, text)):
                result = telegram_client.send(CHAT, 'x')
            self.assertFalse(result.ok, text)
            self.assertFalse(result.retryable, text)

    def test_rate_limit_and_server_errors_are_retryable(self):
        with mock.patch('httpx.post', return_value=telegram_error(429, 'Too Many Requests', retry_after=7)):
            limited = telegram_client.send(CHAT, 'x')
        self.assertTrue(limited.retryable)
        self.assertEqual(limited.retry_after, 7)
        with mock.patch('httpx.post', return_value=telegram_error(502, 'Bad Gateway')):
            self.assertTrue(telegram_client.send(CHAT, 'x').retryable)

    def test_network_error_is_retryable_and_never_leaks_the_token(self):
        with mock.patch('httpx.post', side_effect=RuntimeError(f'boom https://api.telegram.org/bot{TOKEN}/sendMessage')):
            result = telegram_client.send(CHAT, 'x')
        self.assertTrue(result.retryable)
        self.assertNotIn(TOKEN, result.error)

    def test_html_parse_error_falls_back_to_plain_text_so_the_kitchen_still_gets_the_order(self):
        responses = [telegram_error(400, "Bad Request: can't parse entities: Unsupported start tag"), telegram_ok()]
        with mock.patch('httpx.post', side_effect=responses) as post:
            result = telegram_client.send(CHAT, '<b>Ali</b> &amp; <i>Vali</i> <x')
        self.assertTrue(result.ok)
        second = post.call_args_list[1].kwargs['json']
        self.assertNotIn('parse_mode', second)
        self.assertNotIn('<b>', second['text'])

    def test_esc_escapes_telegram_html(self):
        self.assertEqual(telegram_client.esc('<b>Ali</b> & "Vali"'), '&lt;b&gt;Ali&lt;/b&gt; &amp; "Vali"')
        self.assertEqual(telegram_client.esc(None), '')


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID=CHAT)
class OutboxProcessingTests(TestCase):

    def event(self, event_type='telegram.send_message', **payload):
        payload = payload or {'chat_id': CHAT, 'text': 'salom'}
        return publish_outbox_event('test', '1', event_type, payload)

    def test_success_completes_the_event(self):
        event = self.event()
        with mock.patch('httpx.post', return_value=telegram_ok()):
            counts = process_outbox_batch()
        event.refresh_from_db()
        self.assertEqual((event.status, counts['processed']), ('completed', 1))

    def test_failed_delivery_is_never_marked_completed_and_is_retried_with_backoff(self):
        event = self.event()
        with mock.patch('httpx.post', side_effect=RuntimeError('network down')):
            counts = process_outbox_batch()
        event.refresh_from_db()
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.retry_count, 1)
        self.assertGreater(event.next_attempt_at, timezone.now() + timedelta(seconds=10))
        self.assertIn('network down', event.error_message)
        self.assertEqual(counts['retry'], 1)
        # kechikish tugamaguncha qayta olinmaydi
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            self.assertEqual(process_outbox_batch()['processed'], 0)
        post.assert_not_called()
        # muddati kelgach yuboriladi
        OutboxEvent.objects.filter(pk=event.pk).update(next_attempt_at=timezone.now() - timedelta(seconds=1))
        with mock.patch('httpx.post', return_value=telegram_ok()):
            self.assertEqual(process_outbox_batch()['processed'], 1)

    def test_gives_up_after_max_retries_and_shows_failed(self):
        event = self.event()
        OutboxEvent.objects.filter(pk=event.pk).update(retry_count=event.max_retries - 1)
        with mock.patch('httpx.post', side_effect=RuntimeError('still down')):
            counts = process_outbox_batch()
        event.refresh_from_db()
        self.assertEqual(event.status, 'failed')
        self.assertEqual(counts['failed'], 1)

    def test_permanent_error_fails_immediately_without_retrying(self):
        event = self.event()
        with mock.patch('httpx.post', return_value=telegram_error(400, 'Bad Request: chat not found')):
            process_outbox_batch()
        event.refresh_from_db()
        self.assertEqual(event.status, 'failed')
        self.assertIn('chat not found', event.error_message)

    @override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN='', TELEGRAM_BOT_TOKEN='')
    def test_unconfigured_bot_is_a_skip_not_a_failure(self):
        event = self.event()
        counts = process_outbox_batch()
        event.refresh_from_db()
        self.assertEqual((event.status, counts['skipped']), ('completed', 1))
        self.assertTrue(event.error_message.startswith('skipped:'))

    def test_informational_events_without_a_handler_just_complete(self):
        event = self.event('order_item_added', order_id=1)
        with mock.patch('httpx.post') as post:
            process_outbox_batch()
        post.assert_not_called()
        event.refresh_from_db()
        self.assertEqual(event.status, 'completed')

    def test_stuck_processing_events_are_returned_to_the_queue(self):
        event = self.event()
        OutboxEvent.objects.filter(pk=event.pk).update(
            status='processing', locked_at=timezone.now() - outbox.PROCESSING_TIMEOUT - timedelta(minutes=1))
        with mock.patch('httpx.post', return_value=telegram_ok()):
            counts = process_outbox_batch()
        self.assertEqual(counts['processed'], 1)

    def test_a_telegram_outage_pauses_the_batch_instead_of_hanging(self):
        events = [self.event() for _ in range(6)]
        with mock.patch('httpx.post', side_effect=RuntimeError('down')) as post:
            process_outbox_batch()
        self.assertEqual(post.call_count, outbox.NETWORK_FAILURES_BEFORE_PAUSE)
        untouched = OutboxEvent.objects.filter(pk__in=[e.pk for e in events], retry_count=0, status='pending').count()
        self.assertEqual(untouched, 3)           # qolganlari urinishsiz, qayta urinish hisobi o'zgarmagan

    def test_health_reports_the_backlog(self):
        self.event()
        stats = outbox.outbox_stats()
        self.assertEqual(stats['pending'], 1)
        res = Client().get('/health/')
        self.assertIn('outbox', res.json()['services'])
        self.assertNotIn(TOKEN[-4:], res.content.decode())


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='')
class OrderNotificationFlowTests(TestCase):

    def setUp(self):
        owner = AdminUser.objects.create_user(username='ega', password='Ega-parol-123', role='shop_owner')
        self.shop = Shop.objects.create(name='Tg Oshxona', slug='tg-osh', owner=owner, address='a', phone='1',
                                        latitude=1, longitude=1, business_profile={'telegram_chat_id': CHAT})
        self.hall = Hall.objects.create(shop=self.shop, name='Asosiy zal')
        self.table = Table.objects.create(shop=self.shop, hall=self.hall, number='4')
        cat = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Taomlar')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='tg-osh-1', price=Decimal('48000'),
                                              category=cat, is_available=True)

    def make_order(self, name='Ali', **extra):
        order = Order.objects.create(
            shop=self.shop, table=self.table, order_number=f'GLS-T-{Order.objects.count() + 1}', customer_name=name,
            customer_phone_1='+998901234567', total_amount=Decimal('48000'), final_amount=Decimal('48000'),
            status='pending', **extra)
        OrderItem.objects.create(order=order, product=self.product, product_name='Osh', price=Decimal('48000'),
                                 unit='dona', quantity=1, total=Decimal('48000'))
        return order

    def sent_texts(self, post):
        return [c.kwargs['json']['text'] for c in post.call_args_list]

    def test_creating_an_order_only_queues_an_event_and_never_calls_telegram(self):
        with mock.patch('httpx.post', side_effect=AssertionError('so\'rov ichida tarmoq!')) as post:
            order = self.make_order()
        post.assert_not_called()
        event = OutboxEvent.objects.get(event_type='order.created')
        self.assertEqual(event.payload['order_id'], order.pk)
        self.assertNotIn('customer_name', event.payload)         # shaxsiy ma'lumot hodisada saqlanmaydi

    def test_loading_a_fixture_does_not_queue_events_for_old_orders(self):
        """loaddata (SQLite→PostgreSQL ko'chirish, tiklash) post_save'ni raw=True bilan chaqiradi: eski buyurtmalar xabar bermasligi shart."""
        from django.core import serializers
        order = self.make_order()
        pk = order.pk
        payload = serializers.serialize('json', [order])
        OutboxEvent.objects.all().delete()
        order.delete()                                    # delete() pk'ni tozalaydi — shuning uchun yuqorida saqlandi
        for obj in serializers.deserialize('json', payload):
            obj.save()                                    # Django loaddata aynan shunday saqlaydi (raw=True)
        self.assertTrue(Order.objects.filter(pk=pk).exists())
        self.assertFalse(OutboxEvent.objects.exists())

    def test_worker_sends_one_escaped_message_to_the_restaurant_chat(self):
        self.make_order(name='<b>Ali</b> & Vali')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        texts = self.sent_texts(post)
        self.assertEqual(len(texts), 1)
        self.assertEqual(post.call_args.kwargs['json']['chat_id'], CHAT)
        self.assertIn('&lt;b&gt;Ali&lt;/b&gt; &amp; Vali', texts[0])
        self.assertNotIn('<b>Ali</b>', texts[0])
        self.assertTrue(NotificationLog.objects.filter(recipient=CHAT, success=True).exists())

    def test_name_telegram_rejects_still_reaches_the_kitchen(self):
        self.make_order(name='Ali')
        responses = [telegram_error(400, "Bad Request: can't parse entities"), telegram_ok()]
        with mock.patch('httpx.post', side_effect=responses):
            counts = process_outbox_batch()
        self.assertEqual(counts['processed'], 1)

    def test_link_in_message_uses_public_url_and_is_omitted_without_it(self):
        self.make_order()
        with override_settings(RESTAURANT_PUBLIC_URL='https://menu.example.uz'):
            with mock.patch('httpx.post', return_value=telegram_ok()) as post:
                process_outbox_batch()
        self.assertIn('https://menu.example.uz/seller/orders/', self.sent_texts(post)[0])
        self.make_order()
        with override_settings(RESTAURANT_PUBLIC_URL=''):
            with mock.patch('httpx.post', return_value=telegram_ok()) as post:
                process_outbox_batch()
        self.assertNotIn('127.0.0.1', self.sent_texts(post)[0])
        self.assertNotIn('href=', self.sent_texts(post)[0])

    def test_status_change_is_queued_and_staff_get_it_only_when_enabled(self):
        from orders.state_machine import transition_order
        order = self.make_order()
        process_outbox_batch()                                    # order.created ni tozalaymiz
        ok, _ = transition_order(order, 'confirmed', actor=None, reason='test')
        self.assertTrue(ok)
        self.assertTrue(OutboxEvent.objects.filter(event_type='order.status_changed', status='pending').exists())
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            counts = process_outbox_batch()
        post.assert_not_called()                                  # standart: xodimlarga holat xabari yoqilmagan
        self.assertEqual(counts['skipped'], 1)

        order.status = 'confirmed'
        AppSetting.objects.create(key='telegram_notify_status_changes', value='true', category='telegram')
        transition_order(order, 'preparing', actor=None, reason='test')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        self.assertIn('Tayyorlanmoqda', self.sent_texts(post)[0])

    def test_customer_with_verified_telegram_gets_status_updates(self):
        from orders.state_machine import transition_order
        customer = Customer.objects.create(phone='+998901234567', name='Ali', telegram_chat_id='555')
        order = self.make_order(customer=customer)
        process_outbox_batch()
        transition_order(order, 'confirmed', actor=None, reason='test')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        self.assertEqual([c.kwargs['json']['chat_id'] for c in post.call_args_list], ['555'])

    def test_service_calls_go_to_telegram_only_when_the_admin_enables_it(self):
        call = ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='waiter', title='Chaqiruv')
        self.assertTrue(OutboxEvent.objects.filter(event_type='service_call.created', aggregate_id=str(call.pk)).exists())
        process_outbox_batch()                                    # order.created yo'q; chaqiruv standart o'chiq
        self.assertEqual(OutboxEvent.objects.get(event_type='service_call.created').status, 'completed')
        self.assertTrue(OutboxEvent.objects.get(event_type='service_call.created').error_message.startswith('skipped'))

        AppSetting.objects.create(key='telegram_notify_service_calls', value='true', category='telegram')
        ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='bill', title='Hisob')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        self.assertIn('HISOB', self.sent_texts(post)[0])
        self.assertIn('4', self.sent_texts(post)[0])

    def test_dish_ready_has_its_own_switch(self):
        AppSetting.objects.create(key='telegram_notify_service_calls', value='true', category='telegram')
        ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='dish_ready', title='Osh tayyor')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        post.assert_not_called()
        AppSetting.objects.create(key='telegram_notify_dish_ready', value='true', category='telegram')
        ServiceCall.objects.create(shop=self.shop, table=self.table, call_type='dish_ready', title='Somsa tayyor')
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            process_outbox_batch()
        self.assertIn('TAYYOR', self.sent_texts(post)[0])


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN, TELEGRAM_CHAT_ID='')
class BotCommandPrivacyTests(TestCase):
    """/order va /kassa avval istalgan Telegram foydalanuvchiga ism, summa va kassani ko'rsatardi."""

    def setUp(self):
        owner = AdminUser.objects.create_user(username='ega2', password='Ega-parol-123', role='shop_owner')
        self.shop = Shop.objects.create(name='Maxfiy Oshxona', slug='maxfiy', owner=owner, address='a', phone='1',
                                        latitude=1, longitude=1)
        self.customer = Customer.objects.create(phone='+998909990000', name='Sohib', telegram_chat_id='4242')
        self.order = Order.objects.create(
            shop=self.shop, order_number='GLS-20261021-0001', customer=self.customer, customer_name='Sohib Maxfiy',
            customer_phone_1='+998909990000', total_amount=Decimal('99000'), final_amount=Decimal('99000'))

    def ask(self, text, chat_id, username='stranger'):
        from notifications.services.telegram_service import handle_webhook
        update = {'message': {'chat': {'id': chat_id}, 'from': {'username': username, 'first_name': 'X'},
                              'text': text, 'message_id': 1}}
        with mock.patch('httpx.post', return_value=telegram_ok()) as post:
            handle_webhook(update)
        return [c.kwargs['json'].get('text', '') for c in post.call_args_list if 'text' in c.kwargs['json']]

    def test_stranger_cannot_read_someone_elses_order(self):
        sent = self.ask('/order GLS-20261021-0001', 999)
        self.assertEqual(sent, ['Buyurtma topilmadi'])

    def test_order_owner_can_read_it(self):
        sent = self.ask('/order GLS-20261021-0001', 4242)
        self.assertIn('Sohib Maxfiy', sent[0])

    def test_admin_can_read_it(self):
        with override_settings(TELEGRAM_ADMIN_CHAT_IDS='8888'):
            sent = self.ask('/order GLS-20261021-0001', 8888)
        self.assertIn('99,000', sent[0])

    def test_kassa_is_admin_only(self):
        sent = self.ask('/kassa', 999)
        self.assertNotIn('Maxfiy Oshxona', sent[0])
        self.assertIn('adminlar', sent[0])
        with override_settings(TELEGRAM_ADMIN_CHAT_IDS='8888'):
            sent = self.ask('/kassa', 8888)
        self.assertIn('Kassa', sent[0])


class WebhookDedupeTests(TestCase):
    def test_same_update_id_is_processed_once(self):
        from web.telegram_webhook import _handle_telegram_update
        cache.clear()
        body = json.dumps({'update_id': 90001, 'message': {'chat': {'id': 1}, 'from': {'id': 1}, 'text': 'salom'}})
        factory = RequestFactory()
        first = _handle_telegram_update(factory.post('/x', body, content_type='application/json'))
        second = _handle_telegram_update(factory.post('/x', body, content_type='application/json'))
        self.assertNotIn(b'duplicate', first.content)
        self.assertIn(b'duplicate', second.content)


@override_settings(TELEGRAM_RESTAURANT_BOT_TOKEN=TOKEN, TELEGRAM_BOT_TOKEN=TOKEN)
class RunWorkersCommandTests(TestCase):
    def test_once_drains_the_outbox(self):
        event = publish_outbox_event('test', '1', 'telegram.send_message', {'chat_id': CHAT, 'text': 'x'})
        out = io.StringIO()
        with mock.patch('httpx.post', return_value=telegram_ok()):
            call_command('run_workers', '--once', '--only', 'outbox', stdout=out)
        event.refresh_from_db()
        self.assertEqual(event.status, 'completed')
        self.assertIn('outbox: processed=1', out.getvalue())

    def test_outbox_status_command_can_requeue_failed_events(self):
        event = publish_outbox_event('test', '1', 'telegram.send_message', {'chat_id': CHAT, 'text': 'x'})
        OutboxEvent.objects.filter(pk=event.pk).update(status='failed', retry_count=5, error_message='eski xato')
        out = io.StringIO()
        call_command('outbox_status', '--retry-failed', stdout=out)
        event.refresh_from_db()
        self.assertEqual((event.status, event.retry_count), ('pending', 0))
        self.assertIn('eski xato', out.getvalue())
