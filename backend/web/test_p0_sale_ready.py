"""
Sotuvga tayyorlash, P0 (xavfsizlik teshiklarini yopish) regressiya testlari. TZ_SOTUVGA_TAYYORLASH_2026-11-02, audit A/B/E.

Har test auditorlarning TEKSHIRIB TASDIQLAGAN hujumini takrorlaydi va uning endi o'tmasligini kafolatlaydi.
Restoran mahsuloti `X-Product: restaurant` sarlavhasi bilan tanlanadi (prod'da DJANGO_PRODUCT=restaurant).
"""
import json
from decimal import Decimal

from django.core.signing import TimestampSigner
from django.test import Client, TestCase, override_settings
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AdminUser
from accounts.policy import is_account_approved
from categories.models import Category
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table

RESTO = {'HTTP_X_PRODUCT': 'restaurant'}
ORDERS_API = '/api/restaurant/admin/v1/orders/'
STAFF_API = '/api/restaurant/admin/v1/staff/'
TABLES_API = '/api/restaurant/admin/v1/tables/'


def make_shop(slug, owner=None, name=None):
    return Shop.objects.create(name=name or slug, slug=slug, owner=owner, address='Guliston', phone='+998901112233',
                               latitude=40.49, longitude=68.78)


def make_owner(username, slug, approved=True):
    owner = AdminUser.objects.create_user(username=username, password='Ega-parol-2026!', role='shop_owner',
                                          is_approved=approved)
    shop = make_shop(slug, owner)
    owner.shop = shop
    owner.save(update_fields=['shop'])
    return owner, shop


def bearer(user):
    return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}


class LegacyGateTests(TestCase):
    """P0-1: restoran mahsulotida eski bozor/studiya/ar3d/to'lov API'lari yopiq."""

    BLOCKED = (
        ('post', '/api/v1/accounts/auth/register/'), ('post', '/api/v1/accounts/auth/login/'),
        ('get', '/api/v1/accounts/customers/'), ('delete', '/api/v1/accounts/customers/1/'),
        ('get', '/api/v1/accounts/admins/'),
        ('get', '/api/v1/shops/'), ('post', '/api/v1/shops/'), ('delete', '/api/v1/shops/x/'),
        ('get', '/api/v1/orders/pending/'), ('patch', '/api/v1/orders/1/update_status/'), ('post', '/api/v1/orders/'),
        ('get', '/api/v1/notifications/'), ('post', '/api/v1/notifications/webhook/telegram/'),
        ('post', '/v1/orders/'), ('get', '/v1/orders/1/'), ('get', '/v1/orders/status/1/'),
        ('post', '/v1/guest/call-waiter/'), ('post', '/v1/guest/split-bill/'), ('get', '/v1/guest/call-status/'),
        ('get', '/v1/staff/calls/'), ('post', '/v1/staff/calls/1/accept/'),
        ('post', '/v1/ai/chat/'), ('post', '/api/ai-chat'), ('get', '/v1/menu/x/'), ('get', '/v1/lang/'),
        ('post', '/3d-print/order/'), ('post', '/3d-print/order/X/ready/'),
        ('post', '/api/payments/create/'), ('get', '/api/payments/abc/status/'),
        ('get', '/payment/success/'), ('post', '/payment/callback/uzcard/'),
    )

    def test_legacy_routes_answer_404_for_everyone(self):
        client = Client()
        for method, url in self.BLOCKED:
            resp = getattr(client, method)(url, **RESTO)
            self.assertEqual(resp.status_code, 404, f'{method.upper()} {url} -> {resp.status_code}')
            self.assertEqual(resp.json(), {'detail': 'Not found.'})

    def test_registered_unapproved_token_cannot_reach_other_restaurants_orders(self):
        """Audit K1/K2: tasdiqlanmagan hisob tokeni bilan boshqa restoran buyurtmasini o'zgartirish (hujumning o'zi)."""
        owner, shop = make_owner('ega-a', 'resto-a')
        from orders.models import Order
        order = Order.objects.create(order_number='GLS-A-1', shop=shop, customer_name='Mijoz',
                                     customer_phone_1='+998901234567', total_amount=48000, final_amount=48000,
                                     status='pending', delivery_address='x')
        attacker = AdminUser.objects.create_user(username='hujumchi', password='Hujum-parol-2026!', role='shop_manager')
        client = Client()
        resp = client.patch(f'/api/v1/orders/{order.pk}/update_status/', data=json.dumps({'status': 'delivered'}),
                            content_type='application/json', **RESTO, **bearer(attacker))
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(client.get('/api/v1/orders/pending/', **RESTO, **bearer(attacker)).status_code, 404)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_products_and_categories_are_read_only(self):
        """T17: anonim narxni o'zgartira / taomni o'chira olmaydi; React menyusining GET zaxira yo'li ishlaydi."""
        owner, shop = make_owner('ega-p', 'resto-p')
        cat = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Milliy', icon='x')
        product = Product.objects.create(shop=shop, name='Osh', slug='osh-p', price=Decimal('48000'), category=cat)
        client = Client()
        self.assertEqual(client.get('/api/v1/products/?is_available=true', **RESTO).status_code, 200)
        self.assertEqual(client.get('/api/v1/categories/', **RESTO).status_code, 200)
        patch = client.patch(f'/api/v1/products/{product.pk}/', data=json.dumps({'price': '1'}),
                             content_type='application/json', **RESTO)
        self.assertEqual(patch.status_code, 405)
        self.assertEqual(client.delete(f'/api/v1/products/{product.pk}/', **RESTO).status_code, 405)
        self.assertEqual(client.post('/api/v1/categories/', data=json.dumps({'name': 'x'}),
                                     content_type='application/json', **RESTO).status_code, 405)
        product.refresh_from_db()
        self.assertEqual(product.price, Decimal('48000'))
        self.assertFalse(product.is_deleted)
        self.assertTrue(Product.objects.filter(pk=product.pk).exists())

    @override_settings(LEGACY_API_ENABLED=True)
    def test_flag_brings_the_old_routes_back_nothing_is_deleted(self):
        resp = Client().get('/api/v1/accounts/auth/login/', **RESTO)
        self.assertEqual(resp.status_code, 405)    # yo'l mavjud (faqat POST), darvoza o'tkazdi

    def test_other_products_are_not_affected(self):
        """Gate faqat restoran mahsulotida: umumiy (market) urlconf o'zgarmaydi."""
        self.assertEqual(Client().get('/api/v1/accounts/auth/login/').status_code, 405)

    def test_old_air_menu_redirects_to_the_main_app(self):
        """`/m/<slug>/` eski AIR menyu yopilgan /v1/* API'lariga tayanardi: asosiy ilovaga yo'naltiriladi, stol saqlanadi."""
        owner, shop = make_owner('ega-m', 'resto-m')
        hall = Hall.objects.create(shop=shop, name='Zal')
        table = Table.objects.create(shop=shop, hall=hall, number='5')
        client = Client()
        resp = client.get('/m/resto-m/', **RESTO)
        self.assertEqual((resp.status_code, resp['Location']), (302, '/menu/'))
        signed = TimestampSigner().sign(str(table.qr_token))
        resp = client.get(f'/m/resto-m/?t={signed}', **RESTO)
        self.assertEqual((resp.status_code, resp['Location']), (302, f'/t/{table.qr_token}/'))
        bad = client.get('/m/resto-m/?t=soxta', **RESTO)
        self.assertEqual((bad.status_code, bad['Location']), (302, '/menu/'))


class RegistrationApprovalTests(TestCase):
    """P0-3: ro'yxatdan o'tish token bermaydi, tasdiqlanmagan hisob hech narsaga kira olmaydi."""

    PAYLOAD = {'username': 'yangi-ega', 'password': 'Mehmon-Parol-2026!', 'role': 'shop_owner',
               'shop_name': 'Yangi Oshxona', 'shop_address': 'Guliston, Mustaqillik 1'}

    def setUp(self):
        from django.core.cache import cache
        cache.clear()      # register tezlik limiti (10/daq) testlar orasida umumiy keshda to'planib qolmasin

    def post(self, data):
        return Client().post('/api/v1/accounts/auth/register/', data=json.dumps(data), content_type='application/json')

    def test_register_gives_no_token_and_stays_pending(self):
        resp = self.post(self.PAYLOAD)
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertNotIn('access', body)
        self.assertNotIn('refresh', body)
        user = AdminUser.objects.get(username='yangi-ega')
        self.assertFalse(user.is_approved)

    def test_weak_and_common_passwords_are_rejected(self):
        for weak in ('123456', 'password', '12345678'):
            resp = self.post({**self.PAYLOAD, 'password': weak})
            self.assertEqual(resp.status_code, 400, weak)
            self.assertIn('password', resp.json())
        self.assertFalse(AdminUser.objects.filter(username='yangi-ega').exists())

    def test_staff_roles_cannot_self_register(self):
        for role in ('support', 'waiter', 'super_admin', 'kitchen'):
            self.assertEqual(self.post({**self.PAYLOAD, 'role': role}).status_code, 400, role)

    def test_same_shop_name_twice_does_not_crash_or_leave_orphans(self):
        self.assertEqual(self.post(self.PAYLOAD).status_code, 201)
        resp = self.post({**self.PAYLOAD, 'username': 'ikkinchi-ega'})
        self.assertEqual(resp.status_code, 201)
        slugs = list(Shop.objects.filter(owner__username__in=['yangi-ega', 'ikkinchi-ega']).values_list('slug', flat=True))
        self.assertEqual(len(slugs), 2)
        self.assertEqual(len(set(slugs)), 2)

    def test_jwt_layer_itself_rejects_unapproved_accounts(self):
        """Ruxsat sinfi tekshirmasa ham (masalan yangi DRF view), tasdiqlanmagan hisob tokeni autentifikatsiyadan o'tmasin."""
        from api.authentication import MultiUserJWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken
        user = AdminUser.objects.create_user(username='jwt-ega', password='Ega-parol-2026!', role='shop_owner')
        token = RefreshToken.for_user(user).access_token
        with self.assertRaises(InvalidToken):
            MultiUserJWTAuthentication().get_user(token)
        user.is_approved = True
        user.save(update_fields=['is_approved'])
        self.assertEqual(MultiUserJWTAuthentication().get_user(token).pk, user.pk)

    @override_settings(AUTH_PASSWORD_VALIDATORS=[])
    def test_account_policy_helper(self):
        self.assertTrue(is_account_approved(AdminUser(role='waiter')))
        self.assertTrue(is_account_approved(AdminUser(role='kitchen')))
        self.assertTrue(is_account_approved(AdminUser(role='hostess')))
        self.assertTrue(is_account_approved(AdminUser(role='shop_owner', is_approved=True)))
        self.assertTrue(is_account_approved(AdminUser(role='shop_owner', is_superuser=True)))
        self.assertFalse(is_account_approved(AdminUser(role='shop_owner')))
        self.assertFalse(is_account_approved(AdminUser(role='shop_manager')))
        self.assertFalse(is_account_approved(AdminUser(role='support')))


class StaffAccessScopeTests(TestCase):
    """P0-2/P0-3: staff API'lari tasdiqlanmagan va do'konsiz hisoblarga yopiq; haqiqiy xodimlarga ochiq."""

    def get(self, url, user=None, token=False):
        client = Client()
        extra = dict(RESTO)
        if user is not None and token:
            extra.update(bearer(user))
        elif user is not None:
            client.force_login(user)
        return client.get(url, **extra)

    def test_unapproved_account_is_rejected_even_with_a_valid_jwt(self):
        owner, _ = make_owner('ega-u', 'resto-u', approved=False)
        # DRF: birinchi autentifikator (sessiya) `WWW-Authenticate` bermaydi, shuning uchun rad etish 403 bo'lib chiqadi
        self.assertIn(self.get(ORDERS_API, owner, token=True).status_code, (401, 403))
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        self.assertEqual(self.get(ORDERS_API, owner, token=True).status_code, 200)

    def test_unapproved_account_is_rejected_with_a_session_too(self):
        owner, _ = make_owner('ega-s', 'resto-s', approved=False)
        self.assertIn(self.get(ORDERS_API, owner).status_code, (401, 403))

    def test_manager_without_a_shop_cannot_use_staff_apis(self):
        """Audit K4: do'konsiz menejer `get_or_default_shop()` orqali asosiy restoranga tushib qolardi."""
        make_owner('ega-d', 'resto-d')      # "asosiy" restoran mavjud
        ghost = AdminUser.objects.create_user(username='dukonsiz', password='Dukon-parol-2026!', role='shop_manager',
                                              is_approved=True)
        for url in (ORDERS_API, STAFF_API, TABLES_API):
            self.assertIn(self.get(url, ghost).status_code, (401, 403), url)
            self.assertIn(self.get(url, ghost, token=True).status_code, (401, 403), url)

    def test_real_staff_still_work(self):
        owner, shop = make_owner('ega-r', 'resto-r')
        self.assertEqual(self.get(ORDERS_API, owner).status_code, 200)
        self.assertEqual(self.get(STAFF_API, owner).status_code, 200)
        waiter = AdminUser.objects.create_user(username='ofitsiant-r', password='Ofitsiant-2026!', role='waiter',
                                               shop=shop)          # ofitsiantga alohida tasdiq kerak emas
        self.assertFalse(waiter.is_approved)
        self.assertEqual(self.get(TABLES_API, waiter).status_code, 200)

    def test_waiter_without_a_shop_is_rejected(self):
        make_owner('ega-w', 'resto-w')
        waiter = AdminUser.objects.create_user(username='ofitsiant-w', password='Ofitsiant-2026!', role='waiter')
        self.assertIn(self.get(TABLES_API, waiter).status_code, (401, 403))

    def test_owner_who_owns_a_shop_without_user_shop_link_still_works(self):
        owner = AdminUser.objects.create_user(username='ega-o', password='Ega-parol-2026!', role='shop_owner',
                                              is_approved=True)
        make_shop('resto-o', owner)          # `user.shop` bog'lanmagan, lekin `Shop.owner` bor (create_restaurant tartibi)
        self.assertEqual(self.get(ORDERS_API, owner).status_code, 200)

    def test_platform_superuser_is_not_blocked(self):
        make_owner('ega-x', 'resto-x')
        boss = AdminUser.objects.create_superuser(username='platforma', password='Platforma-2026!')
        self.assertEqual(self.get(ORDERS_API, boss).status_code, 200)


class UzcardCallbackTests(TestCase):
    """S-14: kalit sozlanmagan bo'lsa Uzcard callback imzosiz so'rovni qabul qilmaydi (fail-closed)."""

    @override_settings(UZCARD_MERCHANT_ID='', UZCARD_SECRET_KEY='')
    def test_unconfigured_callback_is_rejected(self):
        resp = Client().post('/payment/callback/uzcard/', data=json.dumps({'payment_id': 'GLS-1'}),
                             content_type='application/json')
        self.assertEqual(resp.status_code, 403)


class GuestOrderGuardTests(TestCase):
    """Audit S-05/B-09/S-07/B-10: QR'siz stol, juda ko'p qator va savatda cheksiz miqdor."""

    CREATE = '/api/v1/restaurant/orders/create/'

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.owner, self.shop = make_owner('ega-g', 'resto-g')
        hall = Hall.objects.create(shop=self.shop, name='Zal')
        self.table5 = Table.objects.create(shop=self.shop, hall=hall, number='5')
        self.table6 = Table.objects.create(shop=self.shop, hall=hall, number='6')
        cat = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Milliy', icon='x')
        self.product = Product.objects.create(shop=self.shop, name='Osh', slug='osh-g', price=Decimal('48000'), category=cat)

    def create(self, client, items, **extra):
        payload = {'table_number': '6', 'items': items, **extra}
        return client.post(self.CREATE, data=json.dumps(payload), content_type='application/json', **RESTO)

    def one(self, qty=1):
        return [{'product_id': self.product.pk, 'quantity': qty}]

    def test_guest_without_qr_cannot_order_by_table_number(self):
        resp = self.create(Client(), self.one())
        self.assertEqual(resp.status_code, 400)
        from orders.models import Order
        self.assertFalse(Order.objects.exists())
        self.table6.refresh_from_db()
        self.assertEqual(self.table6.status, 'free')           # stol "band" bo'lib qolmadi

    def test_guest_with_qr_orders_only_for_the_scanned_table(self):
        client = Client()
        client.get(f'/t/{self.table5.qr_token}/', follow=True, **RESTO)      # QR skanerlandi: /menu/?table=... sessiyaga yozadi
        resp = self.create(client, self.one(), table_number='6')  # klient boshqa stol raqamini yuboradi
        self.assertEqual(resp.status_code, 201, resp.content)
        from orders.models import Order
        self.assertEqual(Order.objects.get(pk=resp.json()['id']).table_id, self.table5.pk)
        self.table6.refresh_from_db()
        self.assertEqual(self.table6.status, 'free')

    def test_waiter_pos_may_still_name_the_table(self):
        waiter = AdminUser.objects.create_user(username='ofitsiant-g', password='Ofitsiant-2026!', role='waiter',
                                               shop=self.shop)
        client = Client()
        client.force_login(waiter)
        resp = self.create(client, self.one(), table_number='6')
        self.assertEqual(resp.status_code, 201, resp.content)

    def test_too_many_order_lines_are_rejected(self):
        client = Client()
        client.get(f'/t/{self.table5.qr_token}/', follow=True, **RESTO)
        ok = self.create(client, self.one() * 50)
        self.assertEqual(ok.status_code, 201, ok.content)
        too_many = self.create(client, self.one() * 51)
        self.assertEqual(too_many.status_code, 400)
        self.assertIn('juda ko', too_many.json()['error'])

    def test_cart_quantity_per_line_is_capped_even_with_repeated_adds(self):
        client = Client()
        client.get(f'/t/{self.table5.qr_token}/', follow=True, **RESTO)
        for _ in range(5):
            resp = client.post('/api/cart/', data=json.dumps({'product_id': self.product.pk, 'quantity': 100}),
                               content_type='application/json', **RESTO)
            self.assertEqual(resp.status_code, 200, resp.content)
        cart = client.session['cart']
        qty = list(cart[str(self.shop.pk)].values())[0]['quantity']
        self.assertEqual(qty, 100)
