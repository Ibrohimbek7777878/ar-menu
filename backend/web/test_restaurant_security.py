"""
Restoran Bosqich 0 xavfsizlik regressiya testlari.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_RESTORAN_AUDIT_VA_TUZATISH_2026-10-15.md

Har bir test avval mavjud bo'lgan hujumni takrorlaydi va endi u muvaffaqiyatsiz bo'lishini tekshiradi.
"""
import json
from decimal import Decimal

from django.template import Context, Template
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from accounts.models import AdminUser
from categories.models import Category
from finance.models import FinanceTransaction
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table, TableReservation


class RestaurantFixtureMixin:
    """Ikki mustaqil restoran: A (bizniki) va B (begona). Ikkalasida ham "5-stol" bor."""

    def setUp(self):
        self.client = Client()
        self.owner_a = AdminUser.objects.create_user(
            username='owner_a', password='pass-12345-a', role='shop_owner', is_approved=True,
        )
        self.owner_b = AdminUser.objects.create_user(
            username='owner_b', password='pass-12345-b', role='shop_owner', is_approved=True,
        )
        self.shop_a = Shop.objects.create(
            name='Restoran A', slug='restoran-a', owner=self.owner_a, address='Guliston',
            latitude=40.49, longitude=68.78, is_open=True, phone='+998901111111',
        )
        self.shop_b = Shop.objects.create(
            name='Restoran B', slug='restoran-b', owner=self.owner_b, address='Toshkent',
            latitude=41.3, longitude=69.2, is_open=True, phone='+998902222222',
        )
        self.owner_a.shop = self.shop_a
        self.owner_a.save(update_fields=['shop'])
        self.owner_b.shop = self.shop_b
        self.owner_b.save(update_fields=['shop'])
        # Ofitsiantni admin yaratadi — is_approved talab qilinmaydi
        self.waiter_a = AdminUser.objects.create_user(
            username='waiter_a', password='pass-12345-w', role='waiter', shop=self.shop_a, is_staff=True,
        )
        self.category = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Milliy', icon='x')
        self.product_a = Product.objects.create(
            shop=self.shop_a, name='Osh', slug='osh-a', price=Decimal('48000'), category=self.category,
            is_available=True,
        )
        self.product_b = Product.objects.create(
            shop=self.shop_b, name='Begona taom', slug='begona-b', price=Decimal('99000'),
            category=self.category, is_available=True,
        )
        hall_a = Hall.objects.create(shop=self.shop_a, name='Asosiy Zal')
        hall_b = Hall.objects.create(shop=self.shop_b, name='Asosiy Zal')
        self.table_a5 = Table.objects.create(shop=self.shop_a, hall=hall_a, number='5', status='occupied')
        self.table_b5 = Table.objects.create(shop=self.shop_b, hall=hall_b, number='5', status='occupied')

    def make_order(self, shop, table, number, amount='50000', **extra):
        return Order.objects.create(
            order_number=number, customer_name='Mehmon', customer_phone_1='+998903334455',
            shop=shop, table=table, total_amount=Decimal(amount), final_amount=Decimal(amount),
            status=extra.pop('status', 'pending'), payment_status=extra.pop('payment_status', 'unpaid'),
            is_pickup=True, **extra,
        )


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class SellerAndStaffPagesTests(RestaurantFixtureMixin, TestCase):
    """R-SEC-03, R-SEC-04, R-SEC-10."""

    def test_previously_unprotected_seller_pages_require_login(self):
        for url in ('/seller/', '/seller/tables/', '/seller/waiter/', '/seller/ar/', '/seller/telegram/',
                    '/seller/studio/', '/seller/orders/create/', f'/seller/products/{self.product_a.pk}/ai3d/'):
            res = self.client.get(url)
            self.assertEqual(res.status_code, 302, url)
            self.assertIn('/seller/login/', res['Location'], url)

    @override_settings(TELEGRAM_BOT_TOKEN='123456789:SECRET-TOKEN-VALUE-XYZ')
    def test_telegram_panel_never_renders_bot_token(self):
        self.client.force_login(self.owner_a)
        res = self.client.get('/seller/telegram/')
        self.assertEqual(res.status_code, 200)
        self.assertNotContains(res, 'SECRET-TOKEN-VALUE')

    def test_shop_owner_cannot_replace_platform_bot_token(self):
        from notifications.models import AppSetting
        self.client.force_login(self.owner_a)
        self.client.post('/seller/telegram/', {'action': 'save_settings', 'bot_token': '999:HIJACK'})
        self.assertFalse(AppSetting.objects.filter(key='telegram_bot_token', value='999:HIJACK').exists())

    def test_waiter_is_limited_to_waiter_pages(self):
        self.client.force_login(self.waiter_a)
        for url in ('/seller/', '/seller/finance/', '/seller/customers/', '/seller/analytics/'):
            res = self.client.get(url)
            self.assertEqual(res.status_code, 302, url)
            self.assertEqual(res['Location'], reverse('waiter_panel_web'), url)

    def test_product_delete_requires_post(self):
        self.client.force_login(self.owner_a)
        res = self.client.get(f'/seller/products/{self.product_a.pk}/delete/')
        self.assertEqual(res.status_code, 405)
        self.product_a.refresh_from_db()
        self.assertFalse(self.product_a.is_deleted)

    def test_waiter_cannot_open_django_admin(self):
        self.client.force_login(self.waiter_a)
        res = self.client.get('/djangoadmin/')
        self.assertEqual(res.status_code, 302)
        self.assertIn('login', res['Location'])

    def test_kds_hostess_waiter_pages_redirect_anonymous_to_login(self):
        for url in ('/kds/', '/kitchen/', '/arrival/desk/', '/waiter/panel/', '/ofitsiant/', '/admin/dashboard/'):
            res = self.client.get(url)
            self.assertEqual(res.status_code, 302, url)
            self.assertIn('/admin/login/', res['Location'], url)

    def test_kds_json_api_requires_staff(self):
        self.assertEqual(self.client.get('/api/kds/orders/').status_code, 401)
        order = self.make_order(self.shop_a, self.table_a5, 'K-1')
        res = self.client.post('/api/kds/status/', json.dumps({'order_id': order.pk, 'new_status': 'delivered'}),
                               content_type='application/json')
        self.assertEqual(res.status_code, 401)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_kds_status_is_scoped_and_not_forced(self):
        own = self.make_order(self.shop_a, self.table_a5, 'K-2')
        foreign = self.make_order(self.shop_b, self.table_b5, 'K-3')
        self.client.force_login(self.waiter_a)

        def post(order, new_status):
            return self.client.post('/api/kds/status/', json.dumps({'order_id': order.pk, 'new_status': new_status}),
                                    content_type='application/json')

        # Begona restoran buyurtmasi
        self.assertEqual(post(foreign, 'confirmed').status_code, 404)
        # State machine rad etgan o'tish endi majburan yozilmaydi (pending -> delivered mumkin emas)
        self.assertEqual(post(own, 'delivered').status_code, 409)
        own.refresh_from_db()
        self.assertEqual(own.status, 'pending')
        self.assertEqual(post(own, 'confirmed').status_code, 200)

    def test_kds_feed_shows_only_own_restaurant(self):
        self.make_order(self.shop_a, self.table_a5, 'OWN-ORDER-1')
        self.make_order(self.shop_b, self.table_b5, 'FOREIGN-ORDER-1')
        self.client.force_login(self.waiter_a)
        numbers = [o['order_number'] for o in self.client.get('/api/kds/orders/').json()['orders']]
        self.assertTrue(any('OWN-ORDER-1' in n for n in numbers))
        self.assertFalse(any('FOREIGN-ORDER-1' in n for n in numbers))


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestaurantLoginTests(RestaurantFixtureMixin, TestCase):

    def test_waiter_without_seller_approval_can_log_in(self):
        res = self.client.post('/admin/login/', {'username': 'waiter_a', 'password': 'pass-12345-w'})
        self.assertEqual(res.status_code, 302)
        self.assertEqual(res['Location'], reverse('waiter_panel_web'))

    def test_login_returns_to_safe_next_only(self):
        res = self.client.post('/admin/login/', {'username': 'waiter_a', 'password': 'pass-12345-w', 'next': '/kds/'})
        self.assertEqual(res['Location'], '/kds/')
        self.client.logout()
        res = self.client.post('/admin/login/', {
            'username': 'waiter_a', 'password': 'pass-12345-w', 'next': 'https://evil.example/phish',
        })
        self.assertEqual(res.status_code, 302)
        self.assertNotIn('evil.example', res['Location'])


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class GuestPrivacyTests(RestaurantFixtureMixin, TestCase):
    """R-SEC-11, R-SEC-04 (bron shaxsiy ma'lumotlari)."""

    def test_orders_page_shows_only_my_orders(self):
        self.make_order(self.shop_a, self.table_a5, 'SOMEONE-ELSE-777')
        res = self.client.get('/tma/orders/')
        self.assertEqual(res.status_code, 200)
        self.assertNotContains(res, 'SOMEONE-ELSE-777')

    def test_order_detail_is_not_enumerable(self):
        other = self.make_order(self.shop_a, self.table_a5, 'IDOR-1')
        self.assertEqual(self.client.get(f'/tma/order/{other.pk}/').status_code, 404)
        session = self.client.session
        session['my_order_ids'] = [other.pk]
        session.save()
        self.assertEqual(self.client.get(f'/tma/order/{other.pk}/').status_code, 200)

    def test_reservation_search_needs_exact_code_or_full_phone_and_masks_pii(self):
        res_obj = TableReservation.objects.create(
            shop=self.shop_a, customer_name='Muhayyo Karimova', customer_phone='+998901234567',
            guests_count=2, reservation_date='2026-10-20', reservation_time='19:30',
        )
        # Qisman qidiruv endi hech narsa topmaydi
        for q in ('9', '1234', 'Muhayyo'):
            res = self.client.get('/reservation/find/', {'q': q})
            self.assertNotContains(res, 'Karimova')
            self.assertNotContains(res, '901234567')
        # Aniq kod: topiladi, lekin telefon va familiya maskalangan
        res = self.client.get('/reservation/find/', {'q': res_obj.code})
        self.assertContains(res, 'Muhayyo K.')
        self.assertNotContains(res, 'Karimova')
        self.assertNotContains(res, '901234567')


class RestaurantApiTests(RestaurantFixtureMixin, TestCase):
    """R-SEC-02, R-SEC-07, R-SEC-08, R-WTR-04 (standart urlconf: /api/v1/restaurant/...)."""

    API = '/api/v1/restaurant'

    def test_staff_endpoints_reject_anonymous(self):
        for method, url in (('get', 'finance/'), ('get', 'orders/'), ('get', 'tables/'), ('get', 'calls/'),
                            ('get', 'reservations/'), ('post', 'tables/5/settle/'), ('post', 'tables/5/add-item/'),
                            ('post', 'products/3d-scan/')):
            res = getattr(self.client, method)(f'{self.API}/{url}')
            self.assertIn(res.status_code, (401, 403), f'{method} {url}')

    def test_anonymous_settle_no_longer_marks_orders_paid(self):
        order = self.make_order(self.shop_a, self.table_a5, 'S-ANON')
        self.client.post(f'{self.API}/tables/5/settle/', {})
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertFalse(FinanceTransaction.objects.exists())

    def test_waiter_has_no_finance_access(self):
        self.client.force_login(self.waiter_a)
        self.assertEqual(self.client.get(f'{self.API}/finance/').status_code, 403)

    def test_settle_only_touches_own_restaurant_and_skips_cancelled(self):
        own = self.make_order(self.shop_a, self.table_a5, 'S-OWN', amount='60000')
        cancelled = self.make_order(self.shop_a, self.table_a5, 'S-CANCEL', status='cancelled')
        foreign = self.make_order(self.shop_b, self.table_b5, 'S-FOREIGN', amount='70000')
        self.client.force_login(self.waiter_a)
        res = self.client.post(f'{self.API}/tables/5/settle/', {'payment_method': 'card'},
                               content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['total_settled'], 60000.0)
        for o in (own, cancelled, foreign):
            o.refresh_from_db()
        self.assertEqual(own.payment_status, 'paid')
        self.assertEqual(cancelled.payment_status, 'unpaid')
        self.assertEqual(foreign.payment_status, 'unpaid')
        tx = FinanceTransaction.objects.get()
        self.assertEqual(tx.shop, self.shop_a)
        self.assertEqual(tx.amount, Decimal('60000'))
        self.assertEqual(tx.payment_method, 'card')

    def test_order_price_comes_from_server_menu(self):
        payload = {
            'table_number': '5', 'customer_name': 'Mehmon',
            'items': [{'product_id': self.product_a.pk, 'name': 'Osh', 'price': 1, 'quantity': 2}],
        }
        res = self.client.post(f'{self.API}/orders/create/', payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        order = Order.objects.get(pk=res.json()['id'])
        self.assertEqual(order.total_amount, Decimal('96000'))
        self.assertEqual(order.final_amount, Decimal('96000'))  # xizmat haqi yo'q (TZ qarori Q2)
        self.assertEqual(order.items.get().price, Decimal('48000'))

    def test_order_rejects_unknown_or_foreign_dishes(self):
        for pid in (999999, self.product_b.pk, None):
            payload = {'table_number': '5', 'items': [{'product_id': pid, 'name': 'X', 'price': 1, 'quantity': 1}]}
            res = self.client.post(f'{self.API}/orders/create/', payload, content_type='application/json')
            self.assertEqual(res.status_code, 400, pid)
        self.assertFalse(Order.objects.exists())

    def test_guest_cannot_create_products_via_3d_scan(self):
        before = Product.objects.count()
        res = self.client.post(f'{self.API}/products/3d-scan/', {'name': 'Hack', 'price': 1},
                               content_type='application/json')
        self.assertIn(res.status_code, (401, 403))
        self.assertEqual(Product.objects.count(), before)

    def test_guest_reservation_status_is_always_pending(self):
        from datetime import timedelta
        from django.utils import timezone
        res = self.client.post(f'{self.API}/reservations/', {
            'customer_name': 'Ali', 'customer_phone': '+998901112233', 'status': 'seated',
            'reservation_date': str(timezone.localdate() + timedelta(days=1)), 'reservation_time': '19:00',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['reservation']['status'], 'pending')


class PaymentAndTelegramHardeningTests(RestaurantFixtureMixin, TestCase):
    """R-SEC-06, R-SEC-12."""

    @override_settings(CLICK_SECRET_KEY='', PAYME_SECRET_KEY='')
    def test_signatures_fail_closed_without_keys(self):
        from payments.services.click_service import verify_click_signature
        from payments.services.payme_service import verify_payme_auth
        self.assertFalse(verify_click_signature({'action': '1'}))
        self.assertFalse(verify_payme_auth('Basic Zm9vOmJhcg=='))

    @override_settings(DEMO_MODE=False, ALLOW_MOCK_PAYMENTS=False)
    def test_demo_payment_confirm_is_disabled(self):
        order = self.make_order(self.shop_a, self.table_a5, 'DEMO-1')
        res = self.client.post(f'/payment/demo/{order.pk}/confirm/', {'method': 'click'})
        self.assertEqual(res.status_code, 404)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'unpaid')

    @override_settings(DEMO_MODE=False, ALLOW_MOCK_PAYMENTS=False)
    def test_unconfigured_provider_is_not_offered_as_demo(self):
        from payments.payment_service import create_order_payment
        order = self.make_order(self.shop_a, self.table_a5, 'DEMO-2')
        res = create_order_payment(order, 'click', 'http://testserver/return/')
        self.assertFalse(res['success'])

    @override_settings(TELEGRAM_BOT_TOKEN='123456:test-token', TELEGRAM_RESTAURANT_BOT_TOKEN='123456:test-token')
    def test_webhooks_reject_updates_without_secret(self):
        update = json.dumps({'message': {'chat': {'id': 1}, 'from': {'id': 1}, 'text': '/kassa'}})
        for url in ('/telegram/webhook/', '/bot/restaurant/webhook/'):
            res = self.client.post(url, update, content_type='application/json')
            self.assertEqual(res.status_code, 403, url)
            res = self.client.post(url, update, content_type='application/json',
                                   HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN='wrong')
            self.assertEqual(res.status_code, 403, url)

    def test_telegram_debug_endpoints_require_platform_admin(self):
        self.assertEqual(self.client.get('/telegram/chat-ids/').status_code, 401)
        res = self.client.post('/telegram/send-test/', json.dumps({'chat_id': 1, 'text': 'spam'}),
                               content_type='application/json')
        self.assertEqual(res.status_code, 401)
        self.client.force_login(self.owner_a)
        self.assertEqual(self.client.get('/telegram/chat-ids/').status_code, 403)


class ScriptJsonFilterTests(TestCase):
    """R-SEC-05."""

    def test_script_json_neutralises_script_breakout(self):
        tpl = Template('{% load json_tags %}<script>window.X = {{ data|script_json }};</script>')
        payload = json.dumps({'name': '</script><script>alert(1)</script>&'})
        html = tpl.render(Context({'data': payload}))
        self.assertNotIn('</script><script>', html)
        self.assertIn('\\u003C/script\\u003E', html)
        # JSON ma'nosi saqlanadi
        inner = html.split('window.X = ', 1)[1].rsplit(';</script>', 1)[0]
        self.assertEqual(json.loads(inner)['name'], '</script><script>alert(1)</script>&')

    def test_reflected_table_param_on_3d_menu_is_escaped(self):
        owner = AdminUser.objects.create_user(username='o_x', password='p-12345-x', role='shop_owner')
        shop = Shop.objects.create(name='R', slug='r-xss', owner=owner, address='a', latitude=1, longitude=1,
                                   is_open=True, phone='+998900000009')
        res = self.client.get(f'/m/{shop.slug}/', {'t': '</script><script>alert(1)</script>'})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn(b'</script><script>alert(1)', res.content)
