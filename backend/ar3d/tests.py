import json
import uuid
from django.test import TestCase, Client, override_settings
from accounts.models import AdminUser
from shops.models import Shop
from products.models import Product
from categories.models import Category
from tables_restaurant.models import Hall, Table
from orders.models import Order
from ar3d.views import safe_cache_clear


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class Air3DMenuIntegrationTests(TestCase):
    def setUp(self):
        safe_cache_clear()
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username="owner_ar",
            phone="+998901234567",
            password="testpassword123",
            role="shop_owner"
        )
        self.shop = Shop.objects.create(
            name="Registon Lounge Guliston",
            slug="registon-lounge",
            owner=self.owner,
            address="Guliston",
            latitude=40.49,
            longitude=68.78,
            is_open=True,
            phone="+998901234567"
        )
        self.category = Category.objects.create(
            name="Milliy Taomlar",
            name_uz="Milliy Taomlar",
            name_ru="Национальные блюда",
            icon="restaurant"
        )
        self.product = Product.objects.create(
            shop=self.shop,
            name="Maxsus Samarqand Oshi",
            slug="samarqand-oshi",
            price=45000,
            category=self.category,
            is_available=True,
            has_3d=True,
            ar_model="/media/ar/glb/plov.glb"
        )
        self.hall = Hall.objects.create(
            shop=self.shop,
            name="Asosiy Zal"
        )
        self.table = Table.objects.create(
            shop=self.shop,
            hall=self.hall,
            number=7,
            capacity=4,
            status='free'
        )

    def test_ar_page_loads_air_3d_menu(self):
        """Test /ar/ endpoint loads air_3d_menu_index.html with initial data."""
        res = self.client.get('/ar/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'AIR 3D MENU')
        self.assertContains(res, 'window.__INITIAL_DATA__')
        # Vite endi hash'li nom beradi (index-AbC123.js); nom manifestdan olinadi (TZ: R8-2)
        html = res.content.decode()
        self.assertRegex(html, r'/static/react/assets/index[-\w]*\.js')
        self.assertRegex(html, r'/static/react/assets/(index|style)[-\w]*\.css')      # CSS bitta fayl (style-*.css)

    def test_ar_page_classic_fallback(self):
        """Klassik (model-viewer) sahifa /m/<slug>/?classic=1 da (avval /ar/?classic=1 edi)."""
        res = self.client.get(f'/m/{self.shop.slug}/?classic=1')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'model-viewer')
        self.assertContains(res, self.product.name)

    def test_restaurant_slug_m_url(self):
        """Test /m/<slug>/ loads air-3d-menu with the restaurant and table."""
        res = self.client.get(f'/m/{self.shop.slug}/?t={self.table.number}')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'AIR 3D MENU')
        self.assertContains(res, self.shop.name)

    def test_assets_serving(self):
        """Test /assets/... are served with 200 OK."""
        res_js = self.client.get('/assets/index.js')
        self.assertEqual(res_js.status_code, 200)
        res_css = self.client.get('/assets/index.css')
        self.assertEqual(res_css.status_code, 200)
        res_legacy = self.client.get('/assets/index-DDNjqfQt.js')
        self.assertEqual(res_legacy.status_code, 200)

    def test_v1_menu_api(self):
        """Test GET /v1/menu/<slug>/ returns JSON with restaurant and dishes."""
        res = self.client.get(f'/v1/menu/{self.shop.slug}/?lang=uz&table=7')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('restaurant', data)
        self.assertIn('categories', data)
        self.assertIn('dishes', data)
        self.assertEqual(data['restaurant']['name'], self.shop.name)
        self.assertTrue(len(data['dishes']) > 0)
        dish_names = [d['name'] for d in data['dishes']]
        self.assertIn(self.product.name, dish_names)

    def test_v1_orders_api(self):
        """Test POST /v1/orders/ creates order and items in database."""
        payload = {
            "session_id": "sess-test-123",
            "table_id": self.table.number,
            "note": "Zirasi kamroq bo'lsin",
            "items": [
                {
                    "dish_id": self.product.id,
                    "qty": 2,
                    "note": "Issiq bo'lsin"
                }
            ]
        }
        res = self.client.post(
            '/v1/orders/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        order = Order.objects.get(id=data['order_id'])
        self.assertEqual(order.shop, self.shop)
        self.assertEqual(order.table, self.table)
        self.assertEqual(order.final_amount, 90000)
        self.assertEqual(order.items.count(), 1)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'occupied')

    def test_v1_call_waiter_api(self):
        """Test POST /v1/guest/call-waiter/ sets table status and returns success."""
        payload = {
            "table_id": self.table.number,
            "session_id": "sess-test-123",
            "reason": "bill"
        }
        res = self.client.post(
            '/v1/guest/call-waiter/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'bill')

    def test_v1_lang_api(self):
        """Test POST /v1/lang/ updates language."""
        res = self.client.post(
            '/v1/lang/',
            data=json.dumps({"lang": "en", "session_id": "sess-test-123"}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('lang'), 'en')

    def test_v1_ar_dish_api(self):
        """Test GET /v1/ar/<dish_id>/ returns GLB path."""
        res = self.client.get(f'/v1/ar/{self.product.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['id'], self.product.id)
        self.assertEqual(data['glb'], self.product.ar_model)

    def test_ai_chat_api(self):
        """Test POST /api/ai-chat and /v1/ai/chat/ returns gastronomic suggestions."""
        payload = {
            "message": "Palov bilan qaysi salat yaxshi ketadi?",
            "lang": "uz"
        }
        res = self.client.post('/api/ai-chat', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertIn('reply', data)
        self.assertIn('Achchiq-chuchuk', data['reply'])

        # Test Russian
        res_ru = self.client.post('/v1/ai/chat/', data=json.dumps({"message": "какой шашлык посоветуете?", "lang": "ru"}), content_type='application/json')
        self.assertEqual(res_ru.status_code, 200)
        self.assertIn('шашлык', res_ru.json()['reply'])

    def test_v1_split_bill_api(self):
        """Test POST /v1/guest/split-bill/ divides bill among guests."""
        Order.objects.create(
            order_number="ORD-SPLIT-1",
            customer_name="Stol #7",
            customer_phone_1="+998901234567",
            shop=self.shop,
            table=self.table,
            total_amount=120000,
            final_amount=120000,
            status='served'
        )
        payload = {
            "table_id": self.table.number,
            "parts": 3
        }
        res = self.client.post('/v1/guest/split-bill/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['total'], 120000.0)
        self.assertEqual(data['parts'], 3)
        self.assertEqual(data['per_person'], 40000.0)

    def test_call_waiter_cooldown_and_status(self):
        """Test 60s cooldown prevents spam and call-status returns state."""
        safe_cache_clear()
        
        # 1st call -> Success
        payload = {"table_id": "7", "reason": "water"}
        res1 = self.client.post('/v1/guest/call-waiter/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res1.status_code, 200)

        # 2nd immediate call -> 429 Cooldown
        res2 = self.client.post('/v1/guest/call-waiter/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res2.status_code, 429)

        # Check call-status
        res_st = self.client.get('/v1/guest/call-status/?table_id=7')
        self.assertEqual(res_st.status_code, 200)
        self.assertEqual(res_st.json()['status'], 'waiting')

    def test_v1_staff_calls_and_actions(self):
        """Xodim chaqiruvlari: faqat login qilgan, shu restoran xodimi (TZ: R-SEC-04)."""
        self.table.status = 'bill'
        self.table.save()

        # 1. Anonim -> 401; avval istalgan X-Staff-Token qiymati ruxsat berardi
        self.assertEqual(self.client.get('/v1/staff/calls/').status_code, 401)
        res_fake = self.client.post(f'/v1/staff/calls/{self.table.id}/accept/', HTTP_X_STAFF_TOKEN='staff123')
        self.assertEqual(res_fake.status_code, 401)

        # 2. Shu restoran ofitsianti
        waiter = AdminUser.objects.create_user(
            username="waiter_ar", password="testpassword123", role="waiter", shop=self.shop,
        )
        self.client.force_login(waiter)
        res_list = self.client.get('/v1/staff/calls/')
        self.assertEqual(res_list.status_code, 200)
        calls = res_list.json()['calls']
        self.assertTrue(any(str(c['table_id']) == str(self.table.number) for c in calls))

        res_acc = self.client.post(f'/v1/staff/calls/{self.table.id}/accept/')
        self.assertEqual(res_acc.status_code, 200)
        self.assertEqual(res_acc.json()['status'], 'accepted')

        res_done = self.client.post(f'/v1/staff/calls/{self.table.id}/done/')
        self.assertEqual(res_done.status_code, 200)
        self.assertEqual(res_done.json()['status'], 'done')

        # 3. Boshqa restoran ofitsianti bu stolni ko'rmaydi va boshqara olmaydi
        other_owner = AdminUser.objects.create_user(username="owner_other", password="x-pass-123", role="shop_owner")
        other_shop = Shop.objects.create(
            name="Boshqa Restoran", slug="boshqa-restoran", owner=other_owner, address="Toshkent",
            latitude=41.3, longitude=69.2, is_open=True, phone="+998900000001",
        )
        other_waiter = AdminUser.objects.create_user(
            username="waiter_other", password="testpassword123", role="waiter", shop=other_shop,
        )
        self.client.force_login(other_waiter)
        calls_other = self.client.get('/v1/staff/calls/').json()['calls']
        self.assertFalse(any(int(c['id']) == self.table.id for c in calls_other))
        self.assertEqual(self.client.post(f'/v1/staff/calls/{self.table.id}/accept/').status_code, 404)

    def test_v1_order_status_api(self):
        """Test GET /v1/orders/status/<id>/ returns order progress."""
        order = Order.objects.create(
            order_number="ORD-TRACK-1",
            customer_name="Stol #7",
            customer_phone_1="+998901234567",
            shop=self.shop,
            table=self.table,
            total_amount=50000,
            final_amount=50000,
            status='cooking'
        )
        res = self.client.get(f'/v1/orders/status/{order.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['status'], 'cooking')
        self.assertEqual(data['progress_pct'], 65)

    def test_table_entry_redirect(self):
        """Test /t/<token>/ redirects to shop menu with table parameter."""
        res = self.client.get(f'/t/{self.table.qr_token}/')
        self.assertEqual(res.status_code, 302)
        self.assertIn(f'/m/{self.shop.slug}/', res['Location'])
        self.assertIn(str(self.table.qr_token), res['Location'])

    def test_v1_split_bill_empty_table_returns_zero(self):
        """Test split-bill on an empty table returns 0 UZS, not 148,000 UZS."""
        empty_table = Table.objects.create(
            shop=self.shop,
            hall=self.hall,
            number=99,
            capacity=2,
            status='free'
        )
        payload = {"table_id": empty_table.number, "parts": 2}
        res = self.client.post('/v1/guest/split-bill/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['total'], 0.0)
        self.assertEqual(data['per_person'], 0.0)
        self.assertIn("to'lanmagan ochiq buyurtma mavjud emas", data['summary'])

    def test_v1_split_bill_ignores_paid_orders(self):
        """Test split-bill does not charge previously paid orders to current guests."""
        # Create a paid order on this table
        Order.objects.create(
            order_number="ORD-ALREADY-PAID",
            customer_name="Eski Mehmon",
            customer_phone_1="+998901112233",
            shop=self.shop,
            table=self.table,
            total_amount=250000,
            final_amount=250000,
            status='delivered',
            payment_status='paid'
        )
        # Split bill should ignore the 250,000 paid order
        payload = {"table_id": self.table.number, "parts": 2}
        res = self.client.post('/v1/guest/split-bill/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['total'], 0.0)

    def test_v1_orders_api_rejects_missing_shop_and_table(self):
        """Test ordering without valid table or shop returns 400 Bad Request instead of leaking into random shop."""
        payload = {
            "table_id": 99999,  # Non-existent table
            "items": [{"dish_id": self.product.id, "qty": 1}]
        }
        res = self.client.post('/v1/orders/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn("Do'kon yoki stol", res.json()['error'])

    def test_v1_orders_api_custom_phone_and_validation(self):
        """Test customer phone is preserved and negative quantities are rejected."""
        # Negative quantity test
        bad_payload = {
            "table_id": self.table.number,
            "items": [{"dish_id": self.product.id, "qty": -3}]
        }
        res_bad = self.client.post('/v1/orders/', data=json.dumps(bad_payload), content_type='application/json')
        self.assertEqual(res_bad.status_code, 400)

        # Valid custom phone
        good_payload = {
            "table_id": self.table.number,
            "phone": "+998971234567",
            "customer_name": "Alisher Navoiy",
            "items": [{"dish_id": self.product.id, "qty": 1}]
        }
        res_good = self.client.post('/v1/orders/', data=json.dumps(good_payload), content_type='application/json')
        self.assertEqual(res_good.status_code, 200)
        order_id = res_good.json()['order_id']
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.customer_phone_1, "+998971234567")
        self.assertEqual(order.customer_name, "Alisher Navoiy")


