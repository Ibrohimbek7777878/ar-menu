from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Customer, AdminUser
from categories.models import Category
from shops.models import Shop
from products.models import Product, WishlistItem
from orders.models import Order, OrderItem, Coupon


class APITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Kategoriya
        self.category = Category.objects.create(
            name="Oziq-ovqat",
            name_uz="Oziq-ovqat",
            name_ru="Продукты",
            name_en="Groceries",
            icon="fastfood"
        )

        # Do'kon
        self.shop = Shop.objects.create(
            name="Test Market Guliston",
            slug="test-market-guliston",
            address="Guliston shahri, Sayxun ko'chasi 10",
            phone="+998901112233",
            latitude=40.4900,
            longitude=68.7800,
            category=self.category,
            is_open=True,
            is_fast_delivery=True,
            delivery_fee=5000,
            free_delivery_from=50000,
        )

        # Mahsulot
        self.product = Product.objects.create(
            shop=self.shop,
            name="Non Samarqand",
            slug="non-samarqand",
            price=Decimal("4000"),
            unit="dona",
            stock=100,
            is_available=True,
            category=self.category,
            variants=[{"name": "Turi", "options": ["Katta", "Kichik"]}],
        )

        # Kupon
        self.coupon = Coupon.objects.create(
            code="TEST10",
            discount_percent=10,
            min_order_amount=Decimal("10000"),
            usage_limit=10,
            times_used=0,
            is_active=True
        )

        # Mijoz
        self.customer = Customer.create_user(
            phone="+998901234567",
            name="Ibrohim Test",
            address="Guliston shahar",
            password="Password123!"
        )

    def test_categories_api(self):
        response = self.client.get('/api/v1/flutter/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Oziq-ovqat")

    def test_shops_api(self):
        response = self.client.get('/api/v1/flutter/shops/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Test Market Guliston")
        self.assertTrue(response.data[0]['is_fast_delivery'])

    def test_shop_detail_and_products_api(self):
        detail_res = self.client.get(f'/api/v1/flutter/shops/{self.shop.slug}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['slug'], self.shop.slug)

        prod_res = self.client.get(f'/api/v1/flutter/shops/{self.shop.id}/products/')
        self.assertEqual(prod_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(prod_res.data), 1)
        self.assertEqual(prod_res.data[0]['name'], "Non Samarqand")
        self.assertEqual(len(prod_res.data[0]['variants']), 1)

    def test_coupon_validation_api(self):
        # Valid case
        res = self.client.post('/api/v1/flutter/coupons/validate/', {
            'code': 'TEST10',
            'order_amount': 20000,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['valid'])
        self.assertEqual(res.data['discount_amount'], 2000)

        # Min amount not met
        res_min = self.client.post('/api/v1/flutter/coupons/validate/', {
            'code': 'TEST10',
            'order_amount': 5000,
        }, format='json')
        self.assertEqual(res_min.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res_min.data['valid'])

        # Invalid coupon
        res_inv = self.client.post('/api/v1/flutter/coupons/validate/', {
            'code': 'UNKNOWN99',
            'order_amount': 20000,
        }, format='json')
        self.assertEqual(res_inv.status_code, status.HTTP_404_NOT_FOUND)

    def test_wishlist_toggle_and_list_api(self):
        # Add to wishlist
        res_toggle = self.client.post('/api/v1/flutter/wishlist/toggle/', {
            'product_id': self.product.id,
            'phone': self.customer.phone
        }, format='json')
        self.assertEqual(res_toggle.status_code, status.HTTP_200_OK)
        self.assertTrue(res_toggle.data['is_favorite'])

        # Get wishlist
        res_list = self.client.get(f'/api/v1/flutter/wishlist/?phone={self.customer.phone}')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)
        self.assertEqual(res_list.data[0]['id'], self.product.id)

        # Remove from wishlist
        res_toggle_off = self.client.post('/api/v1/flutter/wishlist/toggle/', {
            'product_id': self.product.id,
            'phone': self.customer.phone
        }, format='json')
        self.assertEqual(res_toggle_off.status_code, status.HTTP_200_OK)
        self.assertFalse(res_toggle_off.data['is_favorite'])

    def test_order_create_api_with_coupon(self):
        order_payload = {
            'name': 'Ibrohim Test',
            'phone': '+998901234567',
            'address': 'Guliston shahar 4-mavze',
            'coupon_code': 'TEST10',
            'notes': 'Iltimos eshik qo\'ng\'irog\'ini chaling',
            'items': [
                {'product_id': self.product.id, 'quantity': 3}  # 3 * 4000 = 12000 so'm
            ]
        }
        res = self.client.post('/api/v1/flutter/orders/create/', order_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('order_number', res.data)
        self.assertEqual(float(res.data['total_amount']), 12000.0)
        self.assertEqual(float(res.data['discount_amount']), 1200.0)  # 10% of 12000
        # delivery_fee = 5000 (total < 50000)
        # final = 12000 - 1200 + 5000 = 15800
        self.assertEqual(float(res.data['final_amount']), 15800.0)

        # Bazada yaratilganligini tekshirish
        order = Order.objects.get(order_number=res.data['order_number'])
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.coupon_code, 'TEST10')
        self.assertEqual(order.status, 'pending')

    def test_table_service_call_api(self):
        from tables_restaurant.models import Hall, Table
        from django.core.signing import TimestampSigner

        hall = Hall.objects.create(shop=self.shop, name='Terrasa')
        table = Table.objects.create(shop=self.shop, hall=hall, number='7', status='free')

        # 1. Unsigned token - Choy
        res_tea = self.client.post('/api/v1/flutter/table/service-call/', {
            'table_token': str(table.qr_token),
            'service_type': 'tea',
            'note': 'Ko\'k choy'
        }, format='json')
        self.assertEqual(res_tea.status_code, status.HTTP_200_OK)
        self.assertTrue(res_tea.data['success'])
        self.assertEqual(res_tea.data['table_number'], '7')

        # 2. Signed token - Hisob (chek)
        signed_token = TimestampSigner().sign(str(table.qr_token))
        res_bill = self.client.post('/api/v1/flutter/table/service-call/', {
            'table_token': signed_token,
            'service_type': 'bill'
        }, format='json')
        self.assertEqual(res_bill.status_code, status.HTTP_200_OK)
        self.assertTrue(res_bill.data['success'])
        table.refresh_from_db()
        self.assertEqual(table.status, 'bill')

        # 3. Invalid token
        res_err = self.client.post('/api/v1/flutter/table/service-call/', {
            'table_token': '00000000-0000-0000-0000-000000000000',
            'service_type': 'waiter'
        }, format='json')
        self.assertEqual(res_err.status_code, status.HTTP_404_NOT_FOUND)

    def test_order_create_with_signed_table_token(self):
        from tables_restaurant.models import Hall, Table
        from django.core.signing import TimestampSigner

        hall = Hall.objects.create(shop=self.shop, name='Ichki zal')
        table = Table.objects.create(shop=self.shop, hall=hall, number='12', status='free')
        signed_token = TimestampSigner().sign(str(table.qr_token))

        payload = {
            'name': 'Stol Mijozi',
            'phone': '+998939998877',
            'address': 'Stol 12',
            'table_token': signed_token,
            'items': [{'product_id': self.product.id, 'quantity': 2}]
        }
        res = self.client.post('/api/v1/flutter/orders/create/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(order_number=res.data['order_number'])
        self.assertEqual(order.table, table)
        table.refresh_from_db()
        self.assertEqual(table.status, 'occupied')

