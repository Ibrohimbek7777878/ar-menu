from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.management import call_command
from shops.models import Shop
from tables_restaurant.models import Hall, Table
from notifications.services.telegram_service import (
    send_table_service_call, handle_webhook, send_order_created
)
from orders.models import Order, OrderItem
import io

User = get_user_model()


class TelegramAndTableServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='choyxona_owner',
            password='password123',
            role='shop_owner'
        )
        self.shop = Shop.objects.create(
            name='Test Choyxona',
            slug='test-choyxona',
            owner=self.user,
            latitude=Decimal('40.4998'),
            longitude=Decimal('68.7845')
        )
        self.hall = Hall.objects.create(shop=self.shop, name='Asosiy zal')
        self.table = Table.objects.create(
            shop=self.shop,
            hall=self.hall,
            number='4',
            status='free'
        )

    def test_send_table_service_call_formatting(self):
        # 1. Choy
        res_tea = send_table_service_call(self.shop, self.table, 'tea', 'Ko\'k choy bo\'lsin')
        self.assertIsInstance(res_tea, dict)

        # 2. Ofitsiant
        res_waiter = send_table_service_call(self.shop, self.table, 'waiter')
        self.assertIsInstance(res_waiter, dict)

        # 3. Non
        res_bread = send_table_service_call(self.shop, self.table, 'bread')
        self.assertIsInstance(res_bread, dict)

        # 4. Hisob
        res_bill = send_table_service_call(self.shop, self.table, 'bill')
        self.assertIsInstance(res_bill, dict)

    def test_send_order_created_with_table(self):
        order = Order.objects.create(
            shop=self.shop,
            order_number='GLS-2026-TEST',
            customer_name='Ali Valiyev',
            customer_phone_1='+998901234567',
            total_amount=Decimal('150000'),
            final_amount=Decimal('150000'),
            table=self.table
        )
        OrderItem.objects.create(
            order=order,
            product_name='Qozon kabob',
            price=Decimal('75000'),
            unit='dona',
            quantity=2,
            total=Decimal('150000')
        )
        res = send_order_created(order)
        self.assertIsInstance(res, dict)

    def test_handle_webhook_menu_and_kassa(self):
        # /menu
        update_menu = {
            'message': {
                'chat': {'id': 12345678},
                'from': {'username': 'testuser', 'first_name': 'Ali'},
                'text': '/menu',
                'message_id': 1
            }
        }
        res_menu = handle_webhook(update_menu)
        self.assertTrue(res_menu['success'])

        # /kassa
        update_kassa = {
            'message': {
                'chat': {'id': 12345678},
                'from': {'username': 'testuser', 'first_name': 'Ali'},
                'text': '/kassa',
                'message_id': 2
            }
        }
        res_kassa = handle_webhook(update_kassa)
        self.assertTrue(res_kassa['success'])

        # /start
        update_start = {
            'message': {
                'chat': {'id': 12345678},
                'from': {'username': 'testuser', 'first_name': 'Ali'},
                'text': '/start',
                'message_id': 3
            }
        }
        res_start = handle_webhook(update_start)
        self.assertTrue(res_start['success'])

    def test_send_daily_digest_command(self):
        out = io.StringIO()
        call_command('send_daily_digest', shop_id=self.shop.id, stdout=out)
        output = out.getvalue()
        self.assertIn('Test Choyxona', output)
        self.assertIn('kunlik hisobot yuborildi', output)

    def test_set_chat_menu_button(self):
        from notifications.services.telegram_service import set_chat_menu_button
        res = set_chat_menu_button(chat_id=12345678, base_url="http://127.0.0.1:8000")
        self.assertIsInstance(res, dict)

