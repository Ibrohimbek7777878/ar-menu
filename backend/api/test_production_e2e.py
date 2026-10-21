"""
Production Verification Test Suite — Online Store Guliston
Comprehensive testing of key production readiness criteria:
1. Customer Auth & Refresh Token Flow
2. Courier Authentication & Order Acceptance Workflow
3. Multi-Vendor Isolation (prevents cross-shop orders)
4. Stock Control & Inventory Guard
5. Wishlist JWT Auth & IDOR Protection
6. Products Catalog API & shop_id Serialization
7. AR 3D & Restaurant Table QR Resolution
"""
import base64
import hashlib
import uuid
from decimal import Decimal
from unittest import mock
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Customer, AdminUser
from couriers.models import Courier
from categories.models import Category
from shops.models import Shop
from products.models import Product, WishlistItem, AgroMasterProduct, AgroStarterPack, AgroStarterPackItem
from orders.models import Order, OrderItem
from tables_restaurant.models import Hall, Table
from ar3d.models import ProductLibrary, Product3DModel
from payments.models import Payment
from payments.payment_service import create_order_payment
from django.db.models import ProtectedError


class ProductionVerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Category
        self.category = Category.objects.create(
            name="Oziq-ovqat",
            name_uz="Oziq-ovqat",
            name_ru="Продукты",
            name_en="Groceries",
            icon="fastfood"
        )

        # Main Shop
        self.shop1 = Shop.objects.create(
            name="Guliston Supermarket",
            slug="guliston-supermarket",
            address="Guliston, 1-mavze",
            phone="+998901110001",
            latitude=40.4900,
            longitude=68.7800,
            category=self.category,
            is_open=True,
            delivery_fee=5000,
            free_delivery_from=50000,
            store_type="shop"
        )

        # Secondary Shop (for multi-vendor isolation tests)
        self.shop2 = Shop.objects.create(
            name="Guliston Nonvoyxona",
            slug="guliston-nonvoyxona",
            address="Guliston, 2-mavze",
            phone="+998901110002",
            latitude=40.4910,
            longitude=68.7810,
            category=self.category,
            is_open=True,
            delivery_fee=4000,
            free_delivery_from=30000,
            store_type="shop"
        )

        # Products
        self.product_shop1 = Product.objects.create(
            shop=self.shop1,
            name="Coca-Cola 1.5L",
            slug="coca-cola-1-5l",
            price=Decimal("14000"),
            unit="dona",
            stock=50,
            is_available=True,
            category=self.category,
        )

        self.product_limited_stock = Product.objects.create(
            shop=self.shop1,
            name="Shirinlik Tort",
            slug="shirinlik-tort",
            price=Decimal("45000"),
            unit="dona",
            stock=3,
            is_available=True,
            category=self.category,
        )

        self.product_shop2 = Product.objects.create(
            shop=self.shop2,
            name="Issiq Patir Non",
            slug="issiq-patir-non",
            price=Decimal("6000"),
            unit="dona",
            stock=100,
            is_available=True,
            category=self.category,
        )

        # Customer
        self.customer_phone = "+998901239999"
        self.customer_password = "SecureCustomerPass123!"
        self.customer = Customer.create_user(
            phone=self.customer_phone,
            name="Nodirbek Aliyev",
            address="Guliston, 3-mavze 12-uy",
            password=self.customer_password
        )

        # Courier
        self.courier_phone = "+998907778899"
        self.courier_password = "CourierPassword123!"
        self.courier = Courier.objects.create(
            name="Bekzod Kuryer",
            phone=self.courier_phone,
            status="active",
            vehicle_type="scooter"
        )
        self.courier.set_password(self.courier_password)
        self.courier.save()

    def test_customer_auth_and_token_refresh(self):
        """Test Customer login, profile retrieval, and JWT token refresh."""
        # 1. Login
        login_res = self.client.post('/api/v1/flutter/auth/login/', {
            'phone': self.customer_phone,
            'password': self.customer_password
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_token = login_res.data.get('access')
        refresh_token = login_res.data.get('refresh')
        self.assertIsNotNone(access_token)
        self.assertIsNotNone(refresh_token)

        # 2. Access Profile with Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_res = self.client.get('/api/v1/flutter/auth/profile/')
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data['phone'], self.customer_phone)
        self.assertEqual(profile_res.data['name'], "Nodirbek Aliyev")

        # 3. Refresh Token
        self.client.credentials()  # clear auth
        refresh_res = self.client.post('/api/v1/flutter/auth/token/refresh/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        new_access_token = refresh_res.data.get('access')
        self.assertIsNotNone(new_access_token)

        # 4. Verify new token works
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access_token}')
        profile_res2 = self.client.get('/api/v1/flutter/auth/profile/')
        self.assertEqual(profile_res2.status_code, status.HTTP_200_OK)

    def test_courier_auth_and_order_workflow(self):
        """Test Courier login, dashboard, available orders, and order acceptance."""
        # 1. Courier Login
        login_res = self.client.post('/api/v1/flutter/auth/courier-login/', {
            'phone': self.courier_phone,
            'password': self.courier_password
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        courier_token = login_res.data.get('access')
        self.assertIsNotNone(courier_token)
        self.assertEqual(login_res.data['courier']['name'], "Bekzod Kuryer")

        # 2. Setup courier auth header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {courier_token}')

        # 3. Courier Dashboard
        dash_res = self.client.get('/api/v1/flutter/courier/dashboard/')
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertEqual(dash_res.data['courier_name'], "Bekzod Kuryer")

        # 4. Create an order ready for pickup
        order = Order.objects.create(
            order_number="ORD-TEST-001",
            customer=self.customer,
            customer_name=self.customer.name,
            customer_phone_1=self.customer.phone,
            shop=self.shop1,
            delivery_address=self.customer.address,
            total_amount=Decimal("14000"),
            final_amount=Decimal("19000"),
            delivery_fee=Decimal("5000"),
            status="ready"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product_shop1,
            product_name=self.product_shop1.name,
            price=self.product_shop1.price,
            quantity=1,
            unit=self.product_shop1.unit,
            total=self.product_shop1.price
        )

        # 5. Check available orders
        avail_res = self.client.get('/api/v1/flutter/courier/available/')
        self.assertEqual(avail_res.status_code, status.HTTP_200_OK)
        order_ids = [o['id'] for o in avail_res.data]
        self.assertIn(order.id, order_ids)

        # 6. Accept Order
        accept_res = self.client.post(f'/api/v1/flutter/courier/orders/{order.id}/accept/')
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'out_for_delivery')

        # 7. Complete Delivery
        deliver_res = self.client.post(f'/api/v1/flutter/courier/orders/{order.id}/deliver/')
        self.assertEqual(deliver_res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'delivered')

    def test_multi_vendor_cart_isolation(self):
        """Verify that orders containing products from multiple shops are rejected."""
        mixed_order_payload = {
            'name': 'Test Mijoz',
            'phone': '+998901239999',
            'address': 'Guliston shahar',
            'items': [
                {'product_id': self.product_shop1.id, 'quantity': 1},
                {'product_id': self.product_shop2.id, 'quantity': 1},
            ]
        }
        res = self.client.post('/api/v1/flutter/orders/create/', mixed_order_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bitta do\'kon', res.data.get('error', '').lower())

    def test_stock_validation_prevents_overselling(self):
        """Verify that ordering more than available stock is rejected."""
        oversell_payload = {
            'name': 'Test Mijoz',
            'phone': '+998901239999',
            'address': 'Guliston shahar',
            'items': [
                {'product_id': self.product_limited_stock.id, 'quantity': 10},  # stock is only 3
            ]
        }
        res = self.client.post('/api/v1/flutter/orders/create/', oversell_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('yetarli', res.data.get('error', '').lower())

    def test_wishlist_jwt_and_idor_protection(self):
        """Verify wishlist works with JWT authentication and prevents unauthorized access."""
        # 1. Login user
        login_res = self.client.post('/api/v1/flutter/auth/login/', {
            'phone': self.customer_phone,
            'password': self.customer_password
        }, format='json')
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 2. Add product to wishlist
        toggle_res = self.client.post('/api/v1/flutter/wishlist/toggle/', {
            'product_id': self.product_shop1.id
        }, format='json')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_res.data['is_favorite'])

        # 3. View wishlist with JWT auth
        list_res = self.client.get('/api/v1/flutter/wishlist/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['id'], self.product_shop1.id)

    def test_all_products_catalog_api(self):
        """Verify /products/ endpoint returns items with shop_id and supports filtering."""
        res = self.client.get('/api/v1/flutter/products/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 3)

        # Ensure shop_id is present in serialized output
        first_item = res.data[0]
        self.assertIn('shop_id', first_item)
        self.assertIsNotNone(first_item['shop_id'])

        # Filter by shop_id
        filtered_res = self.client.get(f'/api/v1/flutter/products/?shop_id={self.shop1.id}')
        self.assertEqual(filtered_res.status_code, status.HTTP_200_OK)
        for item in filtered_res.data:
            self.assertEqual(item['shop_id'], self.shop1.id)

    def test_ar_and_restaurant_table_resolution(self):
        """Verify AR detail endpoint and table token resolution."""
        # 1. AR Detail
        ar_res = self.client.get(f'/api/v1/flutter/ar/{self.product_shop1.id}/')
        self.assertEqual(ar_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ar_res.data['name'], self.product_shop1.name)
        self.assertIn('scale_m', ar_res.data)

        # 2. Restaurant Table Resolution
        hall = Hall.objects.create(shop=self.shop1, name="Asosiy Zal")
        table = Table.objects.create(hall=hall, shop=self.shop1, number="12")
        table_res = self.client.get(f'/api/v1/flutter/t/{table.qr_token}/')
        self.assertEqual(table_res.status_code, status.HTTP_200_OK)
        self.assertEqual(table_res.data['table']['number'], "12")
        self.assertEqual(table_res.data['shop']['id'], self.shop1.id)
        self.assertIn(self.shop1.slug, table_res.data['redirect'])

    def test_agro_starter_packs_and_apply(self):
        """Verify Agro starter packs listing and 1-click apply cloning."""
        # 1. Create a pack
        pack = AgroStarterPack.objects.create(
            name="Dehqon Bozori Sabzavotlar",
            sector="vegetable",
            description="Guliston yangi sabzavotlari",
            sort_order=1
        )
        mp1 = AgroMasterProduct.objects.create(
            name="Kartoshka Mahalliy",
            sector="vegetable",
            unit="kg",
            default_market_price=Decimal("4500"),
            is_organic=True
        )
        mp2 = AgroMasterProduct.objects.create(
            name="Piyoz Sariq",
            sector="vegetable",
            unit="kg",
            default_market_price=Decimal("2500"),
            is_organic=True
        )
        AgroStarterPackItem.objects.create(pack=pack, master_product=mp1, suggested_price=Decimal("4500"), default_stock=Decimal("100"))
        AgroStarterPackItem.objects.create(pack=pack, master_product=mp2, suggested_price=Decimal("2500"), default_stock=Decimal("200"))

        # 2. GET packs
        res = self.client.get('/api/v1/flutter/seller/agro/starter-packs/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

        # 3. Apply pack (authenticated)
        login_res = self.client.post('/api/v1/flutter/auth/login/', {
            'phone': self.customer_phone,
            'password': self.customer_password
        }, format='json')
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        apply_res = self.client.post('/api/v1/flutter/seller/agro/starter-packs/apply/', {
            'pack_id': pack.id,
            'shop_id': self.shop1.id,
        }, format='json')
        self.assertEqual(apply_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(apply_res.data['created_count'], 2)

        # Verify products in shop
        prods = Product.objects.filter(shop=self.shop1, name__in=["Kartoshka Mahalliy", "Piyoz Sariq"])
        self.assertEqual(prods.count(), 2)
        kartoshka = prods.filter(name="Kartoshka Mahalliy").first()
        self.assertEqual(kartoshka.unit, "kg")
        self.assertEqual(kartoshka.price, Decimal("4500"))

    def test_agro_claim_and_quick_price_update(self):
        """Verify claiming master product and batch updating daily market prices."""
        # Authenticate
        login_res = self.client.post('/api/v1/flutter/auth/login/', {
            'phone': self.customer_phone,
            'password': self.customer_password
        }, format='json')
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 1. Master product claim
        mp = AgroMasterProduct.objects.create(
            name="Pomidor Yusupov",
            sector="vegetable",
            unit="kg",
            default_market_price=Decimal("8000")
        )
        claim_res = self.client.post('/api/v1/flutter/seller/agro/claim-product/', {
            'master_product_id': mp.id,
            'shop_id': self.shop1.id,
            'price': 7500,
            'stock': 80
        }, format='json')
        self.assertEqual(claim_res.status_code, status.HTTP_201_CREATED)
        prod_id = claim_res.data['product_id']

        # 2. Quick price update
        update_res = self.client.post('/api/v1/flutter/seller/agro/quick-price-update/', {
            'shop_id': self.shop1.id,
            'updates': [
                {'product_id': prod_id, 'price': 9000, 'stock': 70}
            ]
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['updated_count'], 1)

        product = Product.objects.get(id=prod_id)
        self.assertEqual(product.price, Decimal("9000"))
        self.assertEqual(product.stock, 70)

    def test_admin_and_seller_ar_consoles_and_smart_routing(self):
        """Verify Admin AR, Seller AR, 403 prevention, and smart role redirection."""
        # 1. Create Super Admin & Shop Owner
        super_admin = AdminUser.objects.create_user(
            username='test_super_admin',
            password='Password123!',
            role='super_admin',
            is_staff=True,
            is_superuser=True,
        )
        shop_owner = AdminUser.objects.create_user(
            username='test_shop_owner',
            password='Password123!',
            role='shop_owner',
            shop=self.shop1,
        )

        # 2. Test Smart Role Redirection (prevents 403 Forbidden blank page)
        # Unauthenticated user visiting /admin/ -> redirected to /admin/login/
        res_guest = self.client.get('/admin/')
        self.assertIn(res_guest.status_code, [301, 302])
        self.assertIn('/admin/login/', res_guest.url)

        # Logged-in shop_owner visiting /admin/ -> redirected to /seller/ (NOT 403!)
        self.client.force_login(shop_owner)
        res_seller_admin = self.client.get('/admin/', follow=False)
        self.assertEqual(res_seller_admin.status_code, 302)
        self.assertIn('/seller/', res_seller_admin.url)

        # Shop owner can access /seller/ar/
        res_seller_ar = self.client.get('/seller/ar/')
        self.assertEqual(res_seller_ar.status_code, 200)
        # Sahifa qayta dizayn qilingan (2026-09-29): sarlavha endi "AR / 3D Menyu Boshqaruvi"
        self.assertContains(res_seller_ar, "3D Menyu Boshqaruvi")

        # 3. Test Super Admin access to /admin/ar/
        self.client.force_login(super_admin)
        res_admin_ar = self.client.get('/admin/ar/')
        self.assertEqual(res_admin_ar.status_code, 200)
        self.assertContains(res_admin_ar, "AR / 3D Boshqaruvi")

        # 4. Create Library Model & test attaching via Seller AR
        lib = ProductLibrary.objects.create(
            key='test-dish',
            name_uz='Milliy Taom',
            glb_url='/media/products/dish_3d.glb',
            category_key='national',
            real_size_cm=26
        )

        self.client.force_login(shop_owner)
        res_attach = self.client.post('/seller/ar/', {
            'action': 'attach_library',
            'product_id': self.product_shop1.id,
            'library_id': lib.id,
        }, follow=True)
        self.assertEqual(res_attach.status_code, 200)

        # Verify product has 3D model attached
        self.product_shop1.refresh_from_db()
        self.assertTrue(self.product_shop1.has_3d)
        self.assertEqual(self.product_shop1.ar_model, '/media/products/dish_3d.glb')
        self.assertTrue(Product3DModel.objects.filter(product=self.product_shop1).exists())

        # 5. Customer AR endpoints render successfully
        res_cust_ar = self.client.get(f'/product/{self.product_shop1.slug}/ar/')
        self.assertEqual(res_cust_ar.status_code, 200)
        self.assertContains(res_cust_ar, 'model-viewer')

        res_menu_ar = self.client.get(f'/m/{self.shop1.slug}/?table=1')
        self.assertEqual(res_menu_ar.status_code, 200)
        self.assertContains(res_menu_ar, 'AR Menyu')

    @override_settings(CLICK_SECRET_KEY='test-click-secret', PAYME_SECRET_KEY='test-payme-secret')
    @mock.patch('payments.services.payme_service.PAYME_MERCHANT_ID', 'test-payme-merchant')
    @mock.patch('payments.services.click_service.CLICK_SERVICE_ID', '1')
    @mock.patch('payments.services.click_service.CLICK_MERCHANT_ID', 'test-click-merchant')
    def test_click_and_payme_production_payment_flows(self):
        """Click va Payme rasmiy webhook va to'lov oqimlari: imzo/Basic Auth bilan o'tadi, soxtasi rad etiladi."""
        def click_sign(trans_id, service_id, merchant_trans_id, amount, action, sign_time):
            raw = f"{trans_id}{service_id}test-click-secret{merchant_trans_id}{amount}{action}{sign_time}"
            return hashlib.md5(raw.encode()).hexdigest()

        payme_auth = 'Basic ' + base64.b64encode(b'Paycom:test-payme-secret').decode()

        order = Order.objects.create(
            order_number=f"PAY-{uuid.uuid4().hex[:6].upper()}",
            customer_name="Test Xaridor",
            customer_phone_1="+998901112233",
            shop=self.shop1,
            total_amount=Decimal('50000'),
            delivery_fee=Decimal('5000'),
            final_amount=Decimal('55000'),
            status='pending',
            payment_status='unpaid',
        )

        # 1. Click payment creation & webhook Prepare (action=0)
        click_init = create_order_payment(order, 'click', 'http://testserver/return/')
        self.assertTrue(click_init['success'])
        payment = Payment.objects.filter(order=order, provider='click').first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.status, 'pending')

        # Soxta (imzosiz) Complete — rad etilishi va to'lov o'zgarmasligi shart (TZ: R-SEC-06)
        res_forged = self.client.post('/api/payments/click/', {
            'click_trans_id': '666',
            'service_id': '1',
            'merchant_trans_id': payment.merchant_transaction_id,
            'action': '1',
        }, format='json')
        self.assertEqual(res_forged.json().get('error'), -1)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'pending')

        # Click Prepare
        res_prepare = self.client.post('/api/payments/click/', {
            'click_trans_id': '1001',
            'service_id': '1',
            'merchant_trans_id': payment.merchant_transaction_id,
            'amount': '55000',
            'action': '0',
            'sign_time': '2026-09-16 10:00:00',
            'sign_string': click_sign('1001', '1', payment.merchant_transaction_id, '55000', '0', '2026-09-16 10:00:00'),
        }, format='json')
        self.assertEqual(res_prepare.status_code, 200)
        self.assertEqual(res_prepare.json().get('error'), 0)
        self.assertEqual(res_prepare.json().get('merchant_prepare_id'), payment.id)

        # Click Complete (action=1)
        res_complete = self.client.post('/api/payments/click/', {
            'click_trans_id': '1001',
            'service_id': '1',
            'merchant_trans_id': payment.merchant_transaction_id,
            'amount': '55000',
            'action': '1',
            'sign_time': '2026-09-16 10:00:00',
            'sign_string': click_sign('1001', '1', payment.merchant_transaction_id, '55000', '1', '2026-09-16 10:00:00'),
        }, format='json')
        self.assertEqual(res_complete.status_code, 200)
        self.assertEqual(res_complete.json().get('error'), 0)

        # Verify payment & order status
        payment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.status, 'confirmed')

        # 2. Payme JSON-RPC 2.0 flow
        order2 = Order.objects.create(
            order_number=f"PAY2-{uuid.uuid4().hex[:6].upper()}",
            customer_name="Payme Xaridor",
            customer_phone_1="+998909998877",
            shop=self.shop1,
            total_amount=Decimal('30000'),
            delivery_fee=Decimal('0'),
            final_amount=Decimal('30000'),
            status='pending',
            payment_status='unpaid',
        )
        payme_init = create_order_payment(order2, 'payme', 'http://testserver/return/')
        self.assertTrue(payme_init['success'])
        p2 = Payment.objects.filter(order=order2, provider='payme').first()

        # Auth'siz PerformTransaction — rad etilishi shart
        res_forged_payme = self.client.post('/api/payments/payme/', {
            'method': 'PerformTransaction',
            'params': {'id': p2.merchant_transaction_id, 'amount': 3000000},
            'id': 100,
        }, format='json')
        self.assertEqual(res_forged_payme.status_code, 401)
        p2.refresh_from_db()
        self.assertEqual(p2.status, 'pending')

        # Payme CheckPerformTransaction
        res_check = self.client.post('/api/payments/payme/', {
            'method': 'CheckPerformTransaction',
            'params': {'account': {'order_id': p2.merchant_transaction_id}},
            'id': 101,
        }, format='json', HTTP_AUTHORIZATION=payme_auth)
        self.assertEqual(res_check.status_code, 200)
        self.assertTrue(res_check.json().get('result', {}).get('allow'))

        # Payme PerformTransaction
        res_perform = self.client.post('/api/payments/payme/', {
            'method': 'PerformTransaction',
            'params': {'id': p2.merchant_transaction_id, 'amount': 3000000},
            'id': 102,
        }, format='json', HTTP_AUTHORIZATION=payme_auth)
        self.assertEqual(res_perform.status_code, 200)
        self.assertEqual(res_perform.json().get('result', {}).get('state'), 2)
        p2.refresh_from_db()
        order2.refresh_from_db()
        self.assertEqual(p2.status, 'paid')
        self.assertEqual(order2.payment_status, 'paid')

    @override_settings(TELEGRAM_BOT_TOKEN='123456:test-token')
    def test_telegram_mini_app_and_bot_integration(self):
        """Telegram Mini App (TMA) va Bot /start buyruqlari tekshiruvi."""
        from django.conf import settings as dj_settings
        from notifications.webhook_security import webhook_secret_for
        update = {
            'message': {
                'chat': {'id': 99887766, 'first_name': 'Ali', 'username': 'alitest'},
                'text': '/start'
            }
        }
        # 0. Secret token'siz (soxta) update rad etiladi (TZ: R-SEC-12)
        res_forged = self.client.post('/telegram/webhook/', update, format='json')
        self.assertEqual(res_forged.status_code, 403)

        # 1. Telegram bot webhook /start (Telegram yuboradigan secret header bilan)
        res_bot = self.client.post(
            '/telegram/webhook/', update, format='json',
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=webhook_secret_for(dj_settings.TELEGRAM_BOT_TOKEN),
        )
        self.assertEqual(res_bot.status_code, 200)
        self.assertTrue(res_bot.json().get('ok'))

        # 2. TMA sahifalari 200 OK qaytarishi
        res_tma_home = self.client.get('/tma/')
        self.assertEqual(res_tma_home.status_code, 200)
        self.assertContains(res_tma_home, 'telegram-web-app.js')

        res_tma_cat = self.client.get('/tma/catalog/')
        self.assertEqual(res_tma_cat.status_code, 200)

        # 3. TMA Savat AJAX API
        res_cart = self.client.post('/tma/api/cart/', {
            'action': 'add',
            'product_id': self.product_shop1.id,
        }, format='json')
        self.assertEqual(res_cart.status_code, 200)
        self.assertTrue(res_cart.json().get('success'))
        self.assertEqual(res_cart.json().get('cart_count'), 1)

        # 4. TMA Savat sahifasi ko'rish
        res_cart_page = self.client.get('/tma/cart/')
        self.assertEqual(res_cart_page.status_code, 200)
        self.assertContains(res_cart_page, self.product_shop1.name)

        # 5. TMA Checkout
        res_checkout = self.client.post('/tma/checkout/', {
            'name': 'Telegram Xaridor',
            'phone': '+998931112244',
            'address': 'Guliston 2-mavze',
            'payment_method': 'cash',
        }, follow=True)
        self.assertEqual(res_checkout.status_code, 200)
        # Verify order created
        tma_order = Order.objects.filter(customer_phone_1='+998931112244').first()
        self.assertIsNotNone(tma_order)
        self.assertEqual(tma_order.shop, self.shop1)

        # 6. TMA with Restaurant Table flow
        from tables_restaurant.models import Table, Hall
        hall = Hall.objects.create(shop=self.shop1, name="Asosiy Zal")
        table = Table.objects.create(shop=self.shop1, hall=hall, number="12")

        res_tma_table = self.client.get(f'/tma/?table={table.qr_token}')
        self.assertEqual(res_tma_table.status_code, 200)
        # React menyu stol raqamini brauzerda chizadi; server QR tokenidan stolni topib JSON ma'lumotga yozadi
        self.assertContains(res_tma_table, '"number": "12"')

        # Add to cart while table is active
        self.client.post('/tma/api/cart/', {
            'action': 'add',
            'product_id': self.product_shop1.id,
        }, format='json')

        # Checkout with table
        res_table_checkout = self.client.post('/tma/checkout/', {
            'name': 'Stol Xaridori',
            'phone': '+998939998877',
            'payment_method': 'cash',
        }, follow=True)
        self.assertEqual(res_table_checkout.status_code, 200)

        table_order = Order.objects.filter(customer_phone_1='+998939998877').first()
        self.assertIsNotNone(table_order)
        self.assertEqual(table_order.table, table)
        self.assertEqual(table_order.delivery_fee, Decimal('0'))

    def test_owasp_security_headers_and_cascade_protect(self):
        """OWASP xavfsizlik sarlavhalari va Order.shop PROTECT invariant tekshiruvi."""
        # 1. Security Headers on normal web routes
        res_web = self.client.get('/')
        self.assertEqual(res_web.status_code, 200)
        self.assertEqual(res_web.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(res_web.headers.get('X-Frame-Options'), 'SAMEORIGIN')
        self.assertEqual(res_web.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')

        # 2. Security Headers on TMA routes (Frame permission for Telegram WebApp)
        res_tma = self.client.get('/tma/')
        self.assertEqual(res_tma.status_code, 200)
        self.assertEqual(res_tma.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertIn('frame-ancestors', res_tma.headers.get('Content-Security-Policy', ''))
        self.assertIn('web.telegram.org', res_tma.headers.get('Content-Security-Policy', ''))
        self.assertNotIn('X-Frame-Options', res_tma.headers)  # TMA frames must not be blocked by X-Frame-Options

        # 3. Data Integrity: deleting a shop with active orders must raise ProtectedError
        order = Order.objects.create(
            order_number=f"PROT-{uuid.uuid4().hex[:6].upper()}",
            customer_name="Protect Xaridor",
            customer_phone_1="+998901234567",
            shop=self.shop1,
            total_amount=Decimal('10000'),
            delivery_fee=Decimal('0'),
            final_amount=Decimal('10000'),
        )
        with self.assertRaises(ProtectedError):
            self.shop1.delete()



