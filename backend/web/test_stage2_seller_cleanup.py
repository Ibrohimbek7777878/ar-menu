from decimal import Decimal
from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache

from shops.models import Shop
from categories.models import Category
from products.models import Product
from orders.models import Order, OrderItem
from tables_restaurant.models import Hall, Table
from notifications.models import AppSetting


AdminUser = get_user_model()


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class Stage2SellerCleanupTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username='rest_owner', password='password123', role='shop_owner', is_approved=True,
        )
        self.shop = Shop.objects.create(
            name='Test Choyxona', slug='test-choyxona', owner=self.owner, address='Guliston sh.',
            latitude=40.49, longitude=68.78, is_open=True, phone='+998901234567',
        )
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])

        self.category = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Блюда', icon='soup')
        self.product_active = Product.objects.create(
            shop=self.shop, name='Palov', slug='palov', price=Decimal('45000'),
            category=self.category, is_available=True, has_3d=True,
        )
        self.product_stopped = Product.objects.create(
            shop=self.shop, name='Manti', slug='manti', price=Decimal('40000'),
            category=self.category, is_available=False,
        )

        hall = Hall.objects.create(shop=self.shop, name='Asosiy Zal')
        self.table1 = Table.objects.create(shop=self.shop, hall=hall, number='1', status='occupied')
        self.table2 = Table.objects.create(shop=self.shop, hall=hall, number='2', status='free')

        self.client.login(username='rest_owner', password='password123')

    def tearDown(self):
        cache.clear()

    def test_restaurant_guard_redirects_when_panel_scope_is_restaurant(self):
        """panel_scope='restaurant' bo'lganda ortiqcha marketplace sahifalari /seller/ ga yo'naltirilishi kerak."""
        AppSetting.objects.update_or_create(key='panel_scope', defaults={'value': 'restaurant'})
        cache.clear()

        # 3D print studiyasi
        res = self.client.get('/seller/studio/')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, '/seller/')

        # Do'kon ro'yxatdan o'tkazish
        res = self.client.get('/seller/register/')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, '/seller/')

        # Shablonlar galereyasi
        res = self.client.get('/seller/template-gallery/')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, '/seller/')

        # Builder
        res = self.client.get('/seller/shop/builder/')
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res.url, '/seller/')

        # AR 3D Menyu boshqaruvi ochiladi (3D taomlar biriktirish uchun)
        res = self.client.get('/seller/ar/')
        self.assertEqual(res.status_code, 200)

        # NFC -> /seller/ ga redirect
        with override_settings(DEMO_MODE=False):
            res = self.client.get('/seller/nfc/')
            self.assertEqual(res.status_code, 302)
            self.assertEqual(res.url, '/seller/')

    def test_access_allowed_when_panel_scope_is_all(self):
        """panel_scope='all' bo'lganda barcha marketplace sahifalari 200 OK ochilishi kerak."""
        AppSetting.objects.update_or_create(key='panel_scope', defaults={'value': 'all'})
        cache.clear()

        res = self.client.get('/seller/studio/')
        self.assertEqual(res.status_code, 200)

        res = self.client.get('/seller/template-gallery/')
        self.assertEqual(res.status_code, 200)

        res = self.client.get('/seller/ar/')
        self.assertEqual(res.status_code, 200)

        res = self.client.get('/seller/nfc/')
        self.assertEqual(res.status_code, 200)

    def test_ai_assistant_flag_controls_widget(self):
        """ai_assistant flagi o'chiq (default) bo'lganda chat vidjeti chiqmasligi kerak."""
        cache.clear()
        anon = Client()
        res = anon.get('/seller/login/')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('aiChat()', res.content.decode('utf-8'))

        AppSetting.objects.update_or_create(key='ai_assistant', defaults={'value': 'true'})
        cache.clear()
        res = anon.get('/seller/login/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('aiChat()', res.content.decode('utf-8'))

    def test_seller_orders_pagination_50(self):
        """50 tadan ortiq buyurtma bo'lganda sahifalash (paginatsiya) ishlashi kerak."""
        orders_to_create = [
            Order(
                shop=self.shop, order_number=f'ORD-{100 + i}', customer_name=f'Mehmon {i}',
                customer_phone_1='+998901112233', total_amount=Decimal('50000'),
                final_amount=Decimal('50000'), status='delivered', payment_status='paid',
            )
            for i in range(55)
        ]
        Order.objects.bulk_create(orders_to_create)

        res = self.client.get('/seller/orders/')
        self.assertEqual(res.status_code, 200)
        orders_page = res.context['orders']
        self.assertEqual(len(orders_page), 50)
        self.assertTrue(orders_page.has_other_pages())
        self.assertEqual(orders_page.paginator.num_pages, 2)

        # 2-sahifani tekshiramiz
        res_page2 = self.client.get('/seller/orders/?page=2')
        self.assertEqual(res_page2.status_code, 200)
        self.assertEqual(len(res_page2.context['orders']), 5)

    def test_seller_dashboard_restaurant_context(self):
        """Restoran dashboard kontekstida 6 ta restoran statistikasi va TOP taomlar mavjud bo'lishi kerak."""
        AppSetting.objects.update_or_create(key='panel_scope', defaults={'value': 'restaurant'})
        cache.clear()

        order = Order.objects.create(
            shop=self.shop, order_number='ORD-DASH-1', customer_name='Ali',
            customer_phone_1='+998901112233', total_amount=Decimal('90000'),
            final_amount=Decimal('90000'), status='confirmed', payment_status='paid',
        )
        OrderItem.objects.create(
            order=order, product=self.product_active, product_name='Palov',
            price=Decimal('45000'), quantity=2, total=Decimal('90000'),
        )

        res = self.client.get('/seller/')
        self.assertEqual(res.status_code, 200)
        stats = res.context['stats']
        self.assertIn('today_revenue', stats)
        self.assertIn('today_revenue_cash', stats)
        self.assertIn('today_revenue_card', stats)
        self.assertIn('average_check', stats)
        self.assertIn('active_orders', stats)
        self.assertIn('tables_total', stats)
        self.assertIn('tables_occupied', stats)
        self.assertIn('stoplist_count', stats)

        self.assertEqual(stats['stoplist_count'], 1)  # Manti unavailable
        self.assertEqual(stats['tables_total'], 2)
        self.assertEqual(stats['tables_occupied'], 1)

        top_dishes = res.context['top_dishes']
        self.assertEqual(len(top_dishes), 1)
        self.assertEqual(top_dishes[0]['product_name'], 'Palov')
        self.assertEqual(top_dishes[0]['qty'], 2)

        ql_labels = [q['label'] for q in res.context['quick_links']]
        self.assertIn('KDS Oshxona', ql_labels)
        self.assertIn('Stollar', ql_labels)

    def test_seller_products_stoplist_filter(self):
        """available=0 yoki available=1 orqali stop-list filtrlash ishlashi kerak."""
        res_stopped = self.client.get('/seller/products/?available=0')
        self.assertEqual(res_stopped.status_code, 200)
        prods = list(res_stopped.context['products'])
        self.assertEqual(len(prods), 1)
        self.assertEqual(prods[0].name, 'Manti')

        res_active = self.client.get('/seller/products/?available=1')
        self.assertEqual(res_active.status_code, 200)
        prods = list(res_active.context['products'])
        self.assertEqual(len(prods), 1)
        self.assertEqual(prods[0].name, 'Palov')

    def test_language_middleware_defaults_to_uz(self):
        """Brauzer HTTP_ACCEPT_LANGUAGE qanday bo'lishidan qat'iy nazar, default 'uz' bo'lishi kerak."""
        client_en = Client()
        res = client_en.get('/seller/login/', HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9,ru;q=0.8')
        self.assertEqual(res.wsgi_request.LANGUAGE_CODE, 'uz')

        res_ru = client_en.get('/seller/login/?lang=ru')
        self.assertEqual(res_ru.wsgi_request.LANGUAGE_CODE, 'ru')
