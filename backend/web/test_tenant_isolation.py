"""
Tenant-izolyatsiya MATRITSASI (TZ_MULTITENANT Bosqich 0, qabul mezoni 1): A tenant foydalanuvchisi/mehmoni B tenant
ma'lumotini hech qanday endpoint orqali ko'ra, yoza yoki o'chira olmaydi.

Ikkita tenant (`alfa.platform.test`, `bravo.platform.test`), har birida ega/menejer/ofitsiant/oshpaz, zal, stollar, bo'lim, taomlar,
buyurtma, chaqiruv, bron, moliya, qarz, NFC. Barcha matnlarda `<TAG>-SECRET...` belgisi: begona javobda u uchrasa — ma'lumot oqdi.
Test hostlari: `HTTP_HOST='alfa.platform.test'` + `PLATFORM_DOMAIN='platform.test'` (shops/test_tenant_kit.py).
"""
import json
import uuid

from django.db import transaction
from django.test import Client, TestCase

from accounts.models import AdminUser
from categories.models import Category
from orders.models import Order
from products.models import Product
from shops.test_tenant_kit import PASSWORD, make_tenant, snapshot, tenant_settings
from tables_restaurant.models import Table

ADMIN = '/api/restaurant/admin/v1/'
LEGACY = '/api/v1/restaurant/'


def host_of(t):
    return {'HTTP_HOST': t.host}


def login(user):
    c = Client()
    c.force_login(user)
    return c


@tenant_settings()
class TwoTenantCase(TestCase):
    """Ikki tenantli tuzatma (bir marta, butun klass uchun)."""

    @classmethod
    def setUpTestData(cls):
        cls.A = make_tenant('alfa', 'ALFA')
        cls.B = make_tenant('bravo', 'BRAVO')

    def body(self, resp):
        return resp.content.decode('utf-8', 'replace')

    def assertNoLeak(self, resp, other, msg=''):
        self.assertNotIn(other.marker, self.body(resp), f'{msg}: {other.tag} ma\'lumoti oqdi')


# ─── A. Kirish (login) matritsasi ────────────────────────────────────────────────────────────────────────

class LoginMatrixTests(TwoTenantCase):

    def _login(self, path, user, host):
        c = Client()
        resp = c.post(path, {'username': user.username, 'password': PASSWORD}, HTTP_HOST=host.host)
        return c, resp

    def test_staff_cannot_log_in_on_a_foreign_tenant_host(self):
        for path in ('/admin/login/', '/seller/login/'):
            for role in ('owner', 'manager', 'waiter', 'kitchen'):
                user = getattr(self.A, role)
                c, resp = self._login(path, user, self.B)
                self.assertEqual(resp.status_code, 200, (path, role))            # login sahifasi qayta ko'rsatiladi
                self.assertIn("Bu restoran uchun hisob emas", self.body(resp), (path, role))
                self.assertNotIn('_auth_user_id', c.session, f'{path} {role}: sessiya yaratilmasligi kerak')

    def test_staff_can_log_in_on_own_tenant_host(self):
        for path in ('/admin/login/',):
            for role in ('owner', 'manager', 'waiter', 'kitchen'):
                user = getattr(self.A, role)
                c, resp = self._login(path, user, self.A)
                self.assertEqual(resp.status_code, 302, (path, role))
                self.assertEqual(int(c.session['_auth_user_id']), user.pk)
        c, resp = self._login('/seller/login/', self.A.owner, self.A)
        self.assertEqual(resp.status_code, 302)

    def test_super_admin_exception_works_on_every_tenant_host(self):
        root = AdminUser.objects.create_user(
            username='root_admin', password=PASSWORD, role='super_admin', is_superuser=True, is_staff=True, is_approved=True)
        for host in (self.A, self.B):
            c, resp = self._login('/admin/login/', root, host)
            self.assertEqual(resp.status_code, 302, host.sub)
            self.assertEqual(int(c.session['_auth_user_id']), root.pk)

    def test_failed_foreign_login_counts_towards_the_lockout(self):
        from django.core.cache import cache
        cache.clear()
        for _ in range(8):
            self._login('/admin/login/', self.A.owner, self.B)
        # 8 ta urinishdan keyin hisob bloklanadi: endi O'Z hostida ham vaqtincha kirmaydi (brute-force himoyasi ishlaydi)
        c, resp = self._login('/admin/login/', self.A.owner, self.A)
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('_auth_user_id', c.session)
        cache.clear()

    def test_wrong_password_message_does_not_reveal_other_tenant_membership(self):
        c = Client()
        resp = c.post('/admin/login/', {'username': self.A.owner.username, 'password': 'xato-parol'}, HTTP_HOST=self.B.host)
        # Xabar faqat TO'G'RI parolda aytiladi. (Login sahifasidagi tarjima lug'atida (JS) matn har doim bor: faqat chizilgan
        # `data-msg` elementini tekshiramiz.)
        import re
        self.assertIsNone(re.search(r'data-msg[^>]*>[^<]*Bu restoran uchun hisob emas', self.body(resp)))


# ─── B. Sessiya / JWT begona hostda ───────────────────────────────────────────────────────────────────────

class ForeignCredentialsTests(TwoTenantCase):

    STAFF_GETS = (
        ADMIN + 'session/', ADMIN + 'dashboard/summary/', ADMIN + 'menu/products/', ADMIN + 'menu/categories/',
        ADMIN + 'tables/', ADMIN + 'tables/halls/', ADMIN + 'orders/', ADMIN + 'staff/', ADMIN + 'finance/summary/',
        ADMIN + 'finance/transactions/', ADMIN + 'finance/debts/', ADMIN + 'settings/', ADMIN + 'reservations/',
        LEGACY + 'orders/', LEGACY + 'tables/', LEGACY + 'calls/', LEGACY + 'reservations/', LEGACY + 'finance/',
        LEGACY + 'products/stoplist/', LEGACY + 'admin/menu/products/',
    )

    def test_session_of_tenant_a_is_useless_on_tenant_b_host(self):
        """Cookie boshqa hostga qo'lda yuborilsa ham: anonim hisoblanadi (401/403), B ma'lumoti yo'q."""
        client = login(self.A.owner)
        for url in self.STAFF_GETS:
            resp = client.get(url, **host_of(self.B))
            self.assertIn(resp.status_code, (401, 403, 404), url)
            self.assertNoLeak(resp, self.B, url)
            self.assertNoLeak(resp, self.A, url)

    def test_control_same_session_on_own_host_works(self):
        client = login(self.A.owner)
        ok = 0
        for url in self.STAFF_GETS:
            resp = client.get(url, **host_of(self.A))
            if resp.status_code == 200:
                ok += 1
        self.assertGreaterEqual(ok, 12, "nazorat: o'z hostida xodim endpointlari ochilishi kerak")

    def test_jwt_of_tenant_a_is_rejected_on_tenant_b_host(self):
        """JWT host'ga bog'lanmagan, shuning uchun xodim ruxsati tenant bo'yicha tekshiriladi."""
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.A.owner).access_token)
        auth = {'HTTP_AUTHORIZATION': f'Bearer {token}'}
        denied = 0
        for url in self.STAFF_GETS:
            if url.endswith('session/'):
                continue                                          # sessiya endpointi JWT'ni qabul qilmaydi
            resp = Client().get(url, HTTP_HOST=self.B.host, **auth)
            self.assertIn(resp.status_code, (401, 403, 404), url)
            self.assertNoLeak(resp, self.B, url)
            denied += 1
        self.assertGreater(denied, 15)
        # nazorat: o'z hostida shu token ishlaydi
        self.assertEqual(Client().get(ADMIN + 'menu/products/', HTTP_HOST=self.A.host, **auth).status_code, 200)
        self.assertEqual(Client().get(ADMIN + 'orders/', HTTP_HOST=self.A.host, **auth).status_code, 200)

    def test_jwt_of_tenant_a_cannot_write_on_tenant_b_host(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.A.owner).access_token)
        before = snapshot(self.B)
        resp = Client().patch(f'{ADMIN}menu/products/{self.B.product1.pk}/', data=json.dumps({'name': 'HACK'}),
                              content_type='application/json', HTTP_HOST=self.B.host, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertIn(resp.status_code, (401, 403, 404))
        self.assertEqual(snapshot(self.B), before)

    def test_staff_without_shop_has_no_tenant_access_anywhere(self):
        orphan = AdminUser.objects.create_user(username='orphan', password=PASSWORD, role='shop_manager', is_approved=True)
        client = login(orphan)
        for t in (self.A, self.B):
            resp = client.get(ADMIN + 'menu/products/', **host_of(t))
            self.assertIn(resp.status_code, (401, 403), t.sub)

    def test_super_admin_is_scoped_to_the_host_tenant(self):
        """super_admin tenant hostida kira oladi (platforma operatori), lekin FAQAT shu host tenanti ma'lumotini ko'radi."""
        root = AdminUser.objects.create_user(
            username='root2', password=PASSWORD, role='super_admin', is_superuser=True, is_staff=True, is_approved=True)
        client = login(root)
        resp_a = client.get(ADMIN + 'menu/products/', **host_of(self.A))
        resp_b = client.get(ADMIN + 'menu/products/', **host_of(self.B))
        self.assertEqual((resp_a.status_code, resp_b.status_code), (200, 200))
        self.assertIn(self.A.marker, self.body(resp_a))
        self.assertNotIn(self.B.marker, self.body(resp_a))
        self.assertIn(self.B.marker, self.body(resp_b))
        self.assertNotIn(self.A.marker, self.body(resp_b))
        # ?shop= bilan tenantni almashtirib bo'lmaydi
        resp = client.get(ADMIN + 'menu/products/?shop=' + str(self.B.shop.pk), **host_of(self.A))
        self.assertNotIn(self.B.marker, self.body(resp))


# ─── C. Obyekt darajasi (IDOR) matritsasi ──────────────────────────────────────────────────────────────

def idor_cases(a, b):
    """(nomi, metod, URL, payload) — A xodimi A hostida B ning obyektiga murojaat qiladi. Nazorat: xuddi shu amal A obyektida."""
    def case(name, method, tmpl, payload=None):
        return name, method, tmpl, payload or {}
    return [
        # menyu
        case('product patch', 'patch', ADMIN + 'menu/products/{product1}/', {'name': 'HACK'}),
        case('product delete', 'delete', ADMIN + 'menu/products/{product1}/'),
        case('product availability', 'post', ADMIN + 'menu/products/{product1}/availability/', {'is_available': False}),
        case('product duplicate', 'post', ADMIN + 'menu/products/{product1}/duplicate/'),
        case('product feature', 'post', ADMIN + 'menu/products/{product1}/feature/', {'is_featured': True}),
        case('product restore', 'post', ADMIN + 'menu/products/{product1}/restore/'),
        case('legacy product availability', 'post', LEGACY + 'products/{product1}/availability/', {'is_available': False}),
        case('legacy product 3d-scan', 'post', LEGACY + 'products/{product1}/3d-scan/', {}),
        case('legacy admin product patch', 'patch', LEGACY + 'admin/menu/products/{product1}/', {'name': 'HACK'}),
        # stollar / zallar
        case('table patch', 'patch', ADMIN + 'tables/{table1}/', {'capacity': 77}),
        case('table delete', 'delete', ADMIN + 'tables/{table1}/'),
        case('table restore', 'post', ADMIN + 'tables/{table1}/restore/'),
        case('table status', 'post', ADMIN + 'tables/{table1}/status/', {'status': 'bill'}),
        case('table rotate-qr', 'post', ADMIN + 'tables/{table1}/rotate-qr/'),
        case('table qr.svg', 'get', ADMIN + 'tables/{table1}/qr.svg'),
        case('hall patch', 'patch', ADMIN + 'tables/halls/{hall}/', {'name': 'HACK'}),
        case('hall delete', 'delete', ADMIN + 'tables/halls/{hall}/'),
        # buyurtmalar
        case('order detail', 'get', ADMIN + 'orders/{order}/'),
        case('order status', 'post', ADMIN + 'orders/{order}/status/', {'status': 'confirmed'}),
        case('order payment', 'post', ADMIN + 'orders/{order}/payment/', {'payment_status': 'paid', 'payment_method': 'cash'}),
        case('kitchen item toggle', 'post', LEGACY + 'kitchen/items/{item}/toggle/'),
        case('kds status', 'post', '/api/kds/status/', {'order_id': '{order}', 'new_status': 'confirmed'}),
        # xodimlar
        case('staff detail', 'get', ADMIN + 'staff/{waiter}/'),
        case('staff patch', 'patch', ADMIN + 'staff/{waiter}/', {'first_name': 'Hack'}),
        case('staff block', 'post', ADMIN + 'staff/{waiter}/block/'),
        case('staff unblock', 'post', ADMIN + 'staff/{waiter}/unblock/'),
        case('staff reset-password', 'post', ADMIN + 'staff/{waiter}/reset-password/'),
        case('staff set-password', 'post', ADMIN + 'staff/{waiter}/set-password/', {'password': 'Hack-Parol-123456!'}),
        # moliya
        case('tx cancel', 'post', ADMIN + 'finance/transactions/{tx}/cancel/', {'reason': 'hack'}),
        case('debt pay', 'post', ADMIN + 'finance/debts/{debt}/pay/', {'amount': '100', 'payment_method': 'cash'}),
        case('legacy tx cancel', 'post', LEGACY + 'finance/tx/{tx}/cancel/', {'reason': 'hack'}),
        case('legacy debt pay', 'post', LEGACY + 'finance/debts/{debt}/pay/', {'amount': '100'}),
        # chaqiruvlar va bronlar
        case('call patch', 'patch', LEGACY + 'calls/{call}/', {'status': 'done'}),
        case('reservation detail', 'get', ADMIN + 'reservations/{reservation}/'),
        case('reservation patch', 'patch', ADMIN + 'reservations/{reservation}/', {'status': 'cancelled'}),
        case('legacy reservation status', 'patch', LEGACY + 'reservations/{reservation}/status/', {'status': 'cancelled'}),
    ]


class ObjectLevelMatrixTests(TwoTenantCase):

    def _ids(self, t):
        return {
            'product1': t.product1.pk, 'table1': t.table1.pk, 'hall': t.hall.pk, 'order': t.order.pk, 'item': t.item.pk,
            'waiter': t.waiter.pk, 'tx': t.tx.pk, 'debt': t.debt.pk, 'call': t.call.pk, 'reservation': t.reservation.pk,
        }

    def _send(self, client, method, url, payload, host, ids=None):
        if ids:
            payload = {k: (v.format(**ids) if isinstance(v, str) else v) for k, v in payload.items()}
        kwargs = {} if method == 'get' else {'data': json.dumps(payload), 'content_type': 'application/json'}
        return getattr(client, method)(url, **kwargs, **host_of(host))

    def test_owner_of_a_cannot_touch_any_object_of_b(self):
        client = login(self.A.owner)
        before_b, before_a = snapshot(self.B), snapshot(self.A)
        cases = idor_cases(self.A, self.B)
        self.assertGreaterEqual(len(cases), 30)
        for name, method, tmpl, payload in cases:
            with self.subTest(case=name):
                url = tmpl.format(**self._ids(self.B))
                resp = self._send(client, method, url, payload, self.A, self._ids(self.B))
                self.assertNotIn(resp.status_code, (200, 201, 202, 204), f'{name}: {resp.status_code} {self.body(resp)[:200]}')
                self.assertLess(resp.status_code, 500, f'{name}: server xatosi')
                self.assertNoLeak(resp, self.B, name)
        self.assertEqual(snapshot(self.B), before_b, "B ma'lumoti o'zgardi!")
        self.assertEqual(snapshot(self.A), before_a, "A ning o'z ma'lumoti ham begona ID bilan o'zgarmasligi kerak")

    def test_control_the_same_calls_reach_own_objects(self):
        """Nazorat: xuddi shu yo'llar A ning O'Z obyektlarida ishlaydi (aks holda yuqoridagi test shunchaki noto'g'ri URL tekshirgan bo'lardi)."""
        client = login(self.A.owner)
        reached = 0
        for name, method, tmpl, payload in idor_cases(self.A, self.B):
            with self.subTest(case=name), transaction.atomic():
                if name == 'table restore':
                    self.A.table1.delete()                       # soft-delete: tiklash faqat o'chirilganni topadi
                elif name == 'product restore':
                    self.A.product1.delete()
                url = tmpl.format(**self._ids(self.A))
                resp = self._send(client, method, url, payload, self.A, self._ids(self.A))
                if resp.status_code not in (403, 404, 405) and resp.status_code < 500:
                    reached += 1
                else:
                    self.fail(f'nazorat {name}: {resp.status_code} {self.body(resp)[:200]}')
                transaction.set_rollback(True)                   # keyingi holat toza bo'lsin
        self.assertGreaterEqual(reached, 30)

    # Parametrli yo'llar, matritsaga kiritilmagan va sababi shu yerda yozilgan (yangi yo'l shu ro'yxatga yoki matritsaga qo'shilsin)
    COVERAGE_EXEMPT = {
        'MenuImagePreviewView': "rasm oldindan ko'rish tokeni: restoran ID si bilan bog'langan bir martalik token (image_tokens, shop.pk tekshiriladi)",
        'TableSettleBillView': "stol RAQAMI bo'yicha (har tenantda '1' bor): staff_shop doirasi, test_number_based_endpoints_only_touch_own_tenant",
        'TableAddItemView': "stol RAQAMI bo'yicha: test_number_based_endpoints_only_touch_own_tenant",
        'order_detail_view': "mehmon buyurtmasi (sessiya ro'yxati): GuestMatrixTests.test_guest_cannot_read_a_foreign_order_even_by_id",
        'booking_status': "mehmon bron holati kodi bo'yicha: GuestMatrixTests.test_guest_booking_code_lookup_is_tenant_scoped",
    }

    def test_every_parametrised_staff_route_is_in_the_matrix(self):
        """Restoran urlconf'iga yangi `<int:..>`/`<str:..>` yo'li qo'shilsa va u matritsada bo'lmasa — test yiqiladi (qo'lda ko'rib chiqing)."""
        import re
        from django.urls import URLResolver, get_resolver, resolve

        def walk(patterns, prefix=''):
            for p in patterns:
                route = prefix + str(p.pattern)
                if isinstance(p, URLResolver):
                    yield from walk(p.url_patterns, route)
                else:
                    yield route, p.callback

        def view_name(cb):
            cls = getattr(cb, 'cls', None)
            return cls.__name__ if cls else cb.__name__

        covered = set()
        dummy = {k: 1 for k in ('product1', 'table1', 'hall', 'order', 'item', 'waiter', 'tx', 'debt', 'call', 'reservation')}
        for _name, _method, tmpl, _payload in idor_cases(self.A, self.B):
            covered.add(view_name(resolve(tmpl.format(**dummy), urlconf='backend.urls_restaurant').func))
        wanted = {}
        for route, cb in walk(get_resolver('backend.urls_restaurant').url_patterns):
            if route.startswith(('api/restaurant/admin/v1/', 'api/v1/restaurant/', 'api/restaurant/guest/', 'api/guest/')) \
                    and re.search(r'<(?:int|str|uuid|slug)', route):
                wanted.setdefault(view_name(cb), route)
        missing = {n: r for n, r in wanted.items() if n not in covered and n not in self.COVERAGE_EXEMPT}
        self.assertEqual(missing, {}, "Tenant-izolyatsiya matritsasida yo'q parametrli yo'l(lar): idor_cases() ga qo'shing yoki COVERAGE_EXEMPT ga sabab bilan yozing")

    def test_number_based_endpoints_only_touch_own_tenant(self):
        """`/tables/<raqam>/settle|add-item/`: har tenantda '1' raqamli stol bor — faqat host/xodim tenantiniki ishlaydi."""
        client = login(self.A.owner)
        before_b = snapshot(self.B)
        resp = client.post(f'{LEGACY}tables/1/settle/', data=json.dumps({'payment_method': 'cash'}), content_type='application/json', **host_of(self.A))
        self.assertLess(resp.status_code, 500)
        self.assertNoLeak(resp, self.B, 'settle')
        self.A.order.refresh_from_db()
        self.assertEqual(self.A.order.payment_status, 'paid', "nazorat: A ning o'z hisobi yopildi")
        resp = client.post(f'{LEGACY}tables/1/add-item/', data=json.dumps({'product_id': self.B.product1.pk, 'quantity': 1}),
                           content_type='application/json', **host_of(self.A))
        self.assertGreaterEqual(resp.status_code, 400, "B taomi A stoliga qo'shilmasligi kerak")
        self.assertEqual(snapshot(self.B), before_b)

    def test_soft_deleted_objects_of_b_cannot_be_restored_by_a(self):
        """Arxivdagi (yashirilgan) B obyektlari ham begonaga ochilmaydi: tiklash 404, holat o'zgarmaydi."""
        self.B.table1.delete()
        self.B.product1.delete()
        before_b = snapshot(self.B)
        client = login(self.A.owner)
        for url in (f'{ADMIN}tables/{self.B.table1.pk}/restore/', f'{ADMIN}menu/products/{self.B.product1.pk}/restore/'):
            resp = client.post(url, data='{}', content_type='application/json', **host_of(self.A))
            self.assertEqual(resp.status_code, 404, url)
        resp = client.get(ADMIN + 'tables/?include_deleted=1', **host_of(self.A))
        self.assertNoLeak(resp, self.B, 'include_deleted')
        resp = client.get(ADMIN + 'menu/products/?include_deleted=1&archived=1&status=archived', **host_of(self.A))
        self.assertNoLeak(resp, self.B, 'archived products')
        self.assertEqual(snapshot(self.B), before_b)

    def test_other_roles_of_a_cannot_touch_b_either(self):
        before_b = snapshot(self.B)
        for role in ('manager', 'waiter', 'kitchen'):
            client = login(getattr(self.A, role))
            for name, method, tmpl, payload in idor_cases(self.A, self.B):
                url = tmpl.format(**self._ids(self.B))
                resp = self._send(client, method, url, payload, self.A, self._ids(self.B))
                self.assertNotIn(resp.status_code, (200, 201, 202, 204), f'{role} {name}')
                self.assertNoLeak(resp, self.B, f'{role} {name}')
        self.assertEqual(snapshot(self.B), before_b)

    def test_creating_with_foreign_ids_in_the_payload_is_rejected(self):
        """Yaratish/tahrirda begona ID (kategoriya, zal, stol) payload'da berilsa ham B obyektiga bog'lanmaydi."""
        client = login(self.A.owner)
        before_b = snapshot(self.B)
        resp = client.post(ADMIN + 'menu/products/', data=json.dumps(
            {'name': 'Yangi A taom', 'price': 5000, 'category_id': self.B.category.pk}), content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Product.objects.filter(name='Yangi A taom').exists())
        resp = client.patch(f'{ADMIN}menu/products/{self.A.product1.pk}/', data=json.dumps({'category_id': self.B.category.pk}),
                            content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 400)
        resp = client.post(ADMIN + 'tables/', data=json.dumps({'number': '55', 'hall_id': self.B.hall.pk}),
                           content_type='application/json', **host_of(self.A))
        self.assertNotIn(resp.status_code, (200, 201))
        self.assertFalse(Table.all_objects.filter(number='55').exists())
        self.assertEqual(snapshot(self.B), before_b)


class LegacySellerPagesTests(TwoTenantCase):
    """Eski `/seller/` HTML sahifalari (restoran urlconf'ida ulangan): begona ID bilan murojaat ma'lumotni o'zgartirmaydi va ochmaydi."""

    def _cases(self, b):
        p, t, o, n = b.product1.pk, b.table1.pk, b.order.pk, b.nfc.pk
        return [
            ('get', f'/seller/orders/{o}/'), ('get', f'/seller/orders/{o}/receipt/'), ('post', f'/seller/orders/{o}/status/'),
            ('post', f'/seller/kds/{o}/update/'), ('get', f'/seller/products/{p}/edit/'), ('post', f'/seller/products/{p}/edit/'),
            ('post', f'/seller/products/{p}/delete/'), ('post', f'/seller/products/{p}/ai3d/'), ('get', f'/seller/products/{p}/3d-status/'),
            ('get', f'/seller/tables/{t}/qr.svg'), ('post', f'/seller/waiter/table/{t}/status/'),
            ('get', f'/seller/nfc/{n}/qr.svg'), ('post', f'/seller/nfc/{n}/edit/'), ('post', f'/seller/nfc/{n}/toggle/'),
            ('post', f'/seller/nfc/{n}/delete/'), ('post', f'/seller/reviews/{p}/delete/'),
        ]

    def test_foreign_ids_on_legacy_seller_pages_change_nothing_and_leak_nothing(self):
        before_b = snapshot(self.B)
        from tables_restaurant.models import NFCCard
        nfc_before = list(NFCCard.objects.filter(shop=self.B.shop).values('name', 'is_active', 'code'))
        for role in ('owner', 'manager'):
            client = login(getattr(self.A, role))
            for method, url in self._cases(self.B):
                kwargs = {} if method == 'get' else {'data': {'status': 'confirmed', 'name': 'HACK', 'new_status': 'confirmed'}}
                resp = getattr(client, method)(url, **kwargs, **host_of(self.A))
                self.assertLess(resp.status_code, 500, f'{role} {method} {url}')
                if method == 'get':
                    self.assertNotEqual(resp.status_code, 200, f'{role} {url}: begona obyekt ochildi')
                self.assertNoLeak(resp, self.B, f'{role} {method} {url}')
        self.assertEqual(snapshot(self.B), before_b)
        self.assertEqual(list(NFCCard.objects.filter(shop=self.B.shop).values('name', 'is_active', 'code')), nfc_before)

    def test_control_own_ids_on_legacy_seller_pages_are_reachable(self):
        client = login(self.A.owner)
        reached = 0
        for method, url in self._cases(self.A):
            if method == 'get':
                if client.get(url, **host_of(self.A)).status_code == 200:
                    reached += 1
        self.assertGreaterEqual(reached, 4, "nazorat: o'z obyektlari ochilishi kerak")


class ListLeakageTests(TwoTenantCase):

    LISTS = (
        ADMIN + 'menu/products/', ADMIN + 'menu/products/?q=SECRET', ADMIN + 'menu/categories/', ADMIN + 'tables/', ADMIN + 'tables/halls/',
        ADMIN + 'orders/', ADMIN + 'orders/?status=pending', ADMIN + 'staff/', ADMIN + 'finance/summary/', ADMIN + 'finance/transactions/',
        ADMIN + 'finance/debts/', ADMIN + 'finance/categories/', ADMIN + 'finance/export.csv', ADMIN + 'settings/',
        ADMIN + 'reservations/', ADMIN + 'dashboard/summary/', ADMIN + 'session/',
        LEGACY + 'orders/', LEGACY + 'orders/?status=all', LEGACY + 'tables/', LEGACY + 'calls/', LEGACY + 'reservations/',
        LEGACY + 'finance/', LEGACY + 'products/stoplist/', LEGACY + 'menu/', LEGACY + 'admin/menu/products/',
        '/api/guest/v1/menu/', '/api/guest/v1/session/',
        '/api/kds/orders/', '/kds/', '/kitchen/', '/waiter/panel/', '/arrival/desk/', '/arrival/timeline/', '/arrival/checklist/', '/ra/',
        '/seller/', '/seller/products/', '/seller/orders/', '/seller/tables/', '/seller/tables/plan/', '/seller/nfc/', '/seller/kds/',
        '/seller/waiter/', '/seller/finance/', '/seller/analytics/', '/seller/shop/', '/seller/ar/', '/seller/customers/', '/seller/reviews/',
        '/seller/profile/', '/seller/menu-qr.svg', '/seller/products/create/',
    )

    def test_staff_lists_of_a_never_contain_b_markers(self):
        for role in ('owner', 'manager', 'waiter', 'kitchen'):
            client = login(getattr(self.A, role))
            for url in self.LISTS:
                resp = client.get(url, **host_of(self.A))
                self.assertLess(resp.status_code, 500, url)
                self.assertNoLeak(resp, self.B, f'{role} {url}')

    def test_owner_lists_do_contain_own_markers(self):
        client = login(self.A.owner)
        for url in (ADMIN + 'menu/products/', ADMIN + 'menu/categories/', ADMIN + 'tables/halls/', ADMIN + 'orders/',
                    ADMIN + 'finance/transactions/', ADMIN + 'finance/debts/', ADMIN + 'reservations/', LEGACY + 'calls/'):
            resp = client.get(url, **host_of(self.A))
            self.assertEqual(resp.status_code, 200, url)
            self.assertIn(self.A.marker, self.body(resp), url)

    def test_filters_cannot_widen_the_scope_to_another_tenant(self):
        client = login(self.A.owner)
        for suffix in (f'?shop={self.B.shop.pk}', f'?shop_id={self.B.shop.pk}', f'?category={self.B.category.pk}',
                       f'?hall={self.B.hall.pk}', f'?hall_id={self.B.hall.pk}', f'?table={self.B.table1.pk}'):
            for url in (ADMIN + 'menu/products/', ADMIN + 'tables/', ADMIN + 'orders/', ADMIN + 'reservations/'):
                resp = client.get(url + suffix, **host_of(self.A))
                self.assertLess(resp.status_code, 500, url + suffix)
                self.assertNoLeak(resp, self.B, url + suffix)

    def test_staff_creation_binds_new_users_to_the_host_tenant(self):
        client = login(self.A.owner)
        resp = client.post(ADMIN + 'staff/', data=json.dumps({
            'username': 'alfa_new_waiter', 'password': 'Yangi-Parol-12345!', 'role': 'waiter', 'shop': self.B.shop.pk, 'shop_id': self.B.shop.pk,
            'first_name': 'Yangi'}), content_type='application/json', **host_of(self.A))
        self.assertIn(resp.status_code, (200, 201), self.body(resp))
        created = AdminUser.objects.get(username='alfa_new_waiter')
        self.assertEqual(created.shop_id, self.A.shop.pk)


# ─── D. Mehmon (anonim) matritsasi ──────────────────────────────────────────────────────────────────────

class GuestMatrixTests(TwoTenantCase):

    GUEST_PAGES = (
        '/', '/welcome/', '/menu/', '/restaurant/', '/ar-menu/', '/ar/', '/tma/', '/catalog/', '/table/', '/cart/', '/checkout/', '/orders/',
        '/api/v1/restaurant/menu/', '/api/guest/v1/session/', '/api/guest/v1/welcome/', '/api/guest/v1/menu/', '/api/guest/v1/cart/',
        '/api/guest/v1/checkout/', '/api/guest/v1/orders/', '/api/v1/products/', '/api/v1/categories/', '/api/v1/categories/all/',
    )

    def test_guest_pages_show_only_the_host_tenant(self):
        for host_t, other in ((self.A, self.B), (self.B, self.A)):
            c = Client()
            for url in self.GUEST_PAGES:
                resp = c.get(url, **host_of(host_t))
                self.assertLess(resp.status_code, 500, url)
                self.assertNoLeak(resp, other, f'{host_t.sub} {url}')
        resp = Client().get('/api/v1/restaurant/menu/', **host_of(self.A))
        self.assertIn(self.A.marker, self.body(resp))
        resp = Client().get('/menu/', **host_of(self.B))
        self.assertIn(self.B.marker, self.body(resp))

    def test_menu_cache_does_not_mix_tenants(self):
        """Menyu kesh kaliti shop ID bo'yicha: A so'ralgach B so'ralsa ham, qayta A so'ralsa ham aralashmaydi."""
        c = Client()
        for _ in range(2):
            for host_t, other in ((self.A, self.B), (self.B, self.A)):
                for url in ('/api/v1/restaurant/menu/', '/menu/', '/api/guest/v1/menu/'):
                    resp = c.get(url, **host_of(host_t))
                    self.assertIn(host_t.marker, self.body(resp), url)
                    self.assertNotIn(other.marker, self.body(resp), url)

    def test_foreign_table_qr_is_not_found_and_own_qr_works(self):
        c = Client()
        resp = c.get(f'/t/{self.B.table1.qr_token}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)
        self.assertNotIn(self.B.marker, self.body(resp))
        resp = c.get(f'/t/{self.A.table1.qr_token}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 302)
        self.assertIn(str(self.A.table1.qr_token), resp['Location'])
        resp = c.get(f'/t/{uuid.uuid4()}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)

    def test_foreign_table_token_in_query_or_session_binds_nothing(self):
        c = Client()
        for url in ('/menu/', '/welcome/', '/catalog/', '/ar/', '/cart/', '/checkout/', '/table/'):
            resp = c.get(f'{url}?table={self.B.table1.qr_token}', **host_of(self.A))
            self.assertLess(resp.status_code, 500, url)
            self.assertNoLeak(resp, self.B, url)
        # sessiyaga B stoli yozilgan bo'lsa ham (masalan soxta cookie): A saytida stol sifatida qaralmaydi
        for url in ('/api/guest/v1/session/', '/api/guest/v1/welcome/', '/api/guest/v1/checkout/', '/api/guest/v1/cart/'):
            resp = c.get(url, **host_of(self.A))
            self.assertNoLeak(resp, self.B, url)
            data = json.loads(self.body(resp))
            self.assertFalse((data.get('table') or {}).get('number'), f'{url}: begona stol bog\'langan: {data.get("table")}')

    def test_guest_cannot_order_for_a_foreign_table_or_with_foreign_dishes(self):
        orders_before = Order.objects.count()
        # B stoli QR'ini A saytida "skanerlash" (sessiyaga yozish) urinishi
        c = Client()
        c.get(f'/menu/?table={self.B.table1.qr_token}', **host_of(self.A))
        payload = {'items': [{'product_id': self.B.product1.pk, 'quantity': 1}], 'customer_name': 'Mehmon'}
        resp = c.post(LEGACY + 'orders/create/', data=json.dumps(payload), content_type='application/json', **host_of(self.A))
        self.assertGreaterEqual(resp.status_code, 400)
        self.assertEqual(Order.objects.count(), orders_before, 'begona stolga buyurtma yaratildi!')
        # O'z stoli, lekin B taomi
        c2 = Client()
        c2.get(f'/menu/?table={self.A.table1.qr_token}', **host_of(self.A))
        resp = c2.post(LEGACY + 'orders/create/', data=json.dumps(payload), content_type='application/json', **host_of(self.A))
        self.assertGreaterEqual(resp.status_code, 400, self.body(resp))
        self.assertEqual(Order.objects.count(), orders_before, "A stolidan B taomi buyurtma qilindi!")
        self.assertFalse(Order.objects.filter(shop=self.B.shop).exclude(pk=self.B.order.pk).exists())

    def test_guest_order_with_own_table_and_dish_works_as_control(self):
        c = Client()
        c.get(f'/menu/?table={self.A.table1.qr_token}', **host_of(self.A))
        payload = {'items': [{'product_id': self.A.product1.pk, 'quantity': 1}], 'customer_name': 'Mehmon'}
        resp = c.post(LEGACY + 'orders/create/', data=json.dumps(payload), content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 201, self.body(resp))
        self.assertTrue(Order.objects.filter(shop=self.A.shop, customer_name='Mehmon').exists())

    def test_cart_api_refuses_a_foreign_tenant_dish_and_leaks_nothing(self):
        c = Client()
        resp = c.post('/api/cart/', data=json.dumps({'action': 'add', 'product_id': self.B.product1.pk, 'quantity': 1}),
                      content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)
        self.assertNoLeak(resp, self.B, 'cart add')
        self.assertFalse(c.session.get('cart'))
        resp = c.post('/api/cart/', data=json.dumps({'action': 'add', 'product_id': self.A.product1.pk, 'quantity': 1}),
                      content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 200, self.body(resp))

    def test_guest_service_call_for_foreign_table_is_not_created(self):
        from tables_restaurant.models import ServiceCall
        before = ServiceCall.objects.count()
        for ident in (str(self.B.table1.qr_token), self.B.table1.number):
            resp = Client().post(LEGACY + 'calls/', data=json.dumps({'table_number': ident, 'type': 'waiter'}),
                                 content_type='application/json', **host_of(self.A))
            self.assertIn(resp.status_code, (400, 403, 404), ident)
        c = Client()
        c.get(f'/menu/?table={self.B.table1.qr_token}', **host_of(self.A))
        resp = c.post(LEGACY + 'calls/', data=json.dumps({'type': 'waiter'}), content_type='application/json', **host_of(self.A))
        self.assertGreaterEqual(resp.status_code, 400)
        self.assertEqual(ServiceCall.objects.filter(shop=self.B.shop).count(), 1)
        # B stoli raqami '1' A da ham bor: faqat XODIM (pos) raqam bilan A ning O'Z stoliga chaqiruv yarata oladi
        self.assertGreaterEqual(ServiceCall.objects.count(), before)

    def test_nfc_and_ar_pages_of_a_foreign_tenant_are_closed(self):
        c = Client()
        resp = c.get(f'/nfc/{self.B.nfc.code}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(c.get(f'/nfc/{self.A.nfc.code}/', **host_of(self.A)).status_code, 302)
        resp = c.get(f'/m/{self.B.shop.slug}/', **host_of(self.A))
        self.assertNotIn(self.B.marker, self.body(resp))
        resp = c.get(f'/m/{self.B.shop.slug}/?classic=1', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)

    def test_guest_cannot_read_a_foreign_order_even_by_id(self):
        c = Client()
        for url in (f'/order/{self.B.order.pk}/', f'/tma/order/{self.B.order.pk}/', f'/api/guest/v1/orders/{self.B.order.pk}/'):
            resp = c.get(url, **host_of(self.A))
            self.assertIn(resp.status_code, (302, 403, 404), url)
            self.assertNoLeak(resp, self.B, url)

    def test_guest_booking_code_lookup_is_tenant_scoped(self):
        """Bron kodi (B1: `/api/restaurant/guest/booking/<kod>/`) boshqa tenantda topilmaydi. Yo'l hali yo'q bo'lsa ham 404."""
        code = self.B.reservation.public_code
        resp = Client().get(f'/api/restaurant/guest/booking/{code}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)
        self.assertNoLeak(resp, self.B, 'booking code')
        resp = Client().get(f'/reservation/find/?code={code}', **host_of(self.A))
        self.assertNoLeak(resp, self.B, 'reservation find page')
        resp = Client().get(f'{LEGACY}reservations/find/?q={code}', **host_of(self.A))
        self.assertEqual(resp.status_code, 404, "B bron kodi A saytida topilmasligi kerak")
        self.assertNoLeak(resp, self.B, 'reservation find api')
        resp = Client().get(f'{LEGACY}reservations/find/?q={self.A.reservation.public_code}', **host_of(self.A))
        self.assertEqual(resp.status_code, 200, "nazorat: A ning o'z kodi topiladi")

    def test_legacy_public_api_lists_only_the_host_tenant(self):
        c = Client()
        resp = c.get('/api/v1/products/', **host_of(self.A))
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.A.marker, self.body(resp))
        self.assertNotIn(self.B.marker, self.body(resp))
        resp = c.get(f'/api/v1/products/{self.B.product1.pk}/', **host_of(self.A))
        self.assertEqual(resp.status_code, 404)
        resp = c.get(f'/api/v1/products/?shop={self.B.shop.pk}', **host_of(self.A))
        self.assertNotIn(self.B.marker, self.body(resp))
        resp = c.get('/api/v1/categories/', **host_of(self.A))
        self.assertIn(self.A.marker, self.body(resp))
        self.assertNotIn(self.B.marker, self.body(resp))


# ─── E. Kategoriya ajratilishi ─────────────────────────────────────────────────────────────────────────

class CategoryIsolationTests(TwoTenantCase):

    def test_new_category_belongs_to_the_host_tenant_only(self):
        ca, cb = login(self.A.owner), login(self.B.owner)
        r1 = ca.post(ADMIN + 'menu/categories/', data=json.dumps({'name': 'Shirinliklar'}), content_type='application/json', **host_of(self.A))
        r2 = cb.post(ADMIN + 'menu/categories/', data=json.dumps({'name': 'shirinliklar'}), content_type='application/json', **host_of(self.B))
        self.assertEqual((r1.status_code, r2.status_code), (201, 201))
        self.assertNotEqual(r1.json()['id'], r2.json()['id'])
        self.assertEqual(Category.objects.get(pk=r1.json()['id']).shop_id, self.A.shop.pk)
        self.assertEqual(Category.objects.get(pk=r2.json()['id']).shop_id, self.B.shop.pk)
        ids_a = {c['id'] for c in ca.get(ADMIN + 'menu/categories/', **host_of(self.A)).json()}
        self.assertIn(r1.json()['id'], ids_a)
        self.assertNotIn(r2.json()['id'], ids_a)
        self.assertNotIn(self.B.category.pk, ids_a)

    def test_orphan_categories_without_owner_are_invisible_in_tenant_mode(self):
        orphan = Category.objects.create(name='ORPHAN-CAT', is_restaurant=True, is_active=True)      # shop=None (eski yozuv)
        ca = login(self.A.owner)
        ids = {c['id'] for c in ca.get(ADMIN + 'menu/categories/', **host_of(self.A)).json()}
        self.assertNotIn(orphan.pk, ids)
        resp = ca.post(ADMIN + 'menu/products/', data=json.dumps({'name': 'Orphan taom', 'price': 100, 'category_id': orphan.pk}),
                       content_type='application/json', **host_of(self.A))
        self.assertEqual(resp.status_code, 400)
        self.assertNotIn('ORPHAN-CAT', self.body(Client().get('/api/v1/restaurant/menu/', **host_of(self.A))))

    def test_menu_import_creates_categories_for_the_importing_shop(self):
        from products.menu_import import service
        # commit uchun tayyor reja yo'q bo'lgani uchun to'g'ridan-to'g'ri yozish funksiyasi
        plan = [{'row_id': 1, 'mode': 'create', 'name': 'Import taomi', 'price': 12000, 'description': '', 'category': 'Importlar',
                 'category_id': None, 'token': None}]
        service._write_plan(self.A.shop, plan, 'batch-test-1', request=None, actor=self.A.owner)
        cat = Category.objects.get(name='Importlar')
        self.assertEqual(cat.shop_id, self.A.shop.pk)
        self.assertEqual(Product.objects.get(name='Import taomi').category_id, cat.pk)
        # B xuddi shu nomli bo'lim ko'rmaydi
        ids_b = {c['id'] for c in login(self.B.owner).get(ADMIN + 'menu/categories/', **host_of(self.B)).json()}
        self.assertNotIn(cat.pk, ids_b)


class MenuCacheVersionTests(TwoTenantCase):

    def test_category_edit_invalidates_only_its_own_restaurant_menu(self):
        from products.menu_cache import get_menu_version
        a0, b0 = get_menu_version(self.A.shop.pk), get_menu_version(self.B.shop.pk)
        self.A.category.name = 'ALFA-SECRETCAT yangi'
        self.A.category.save()
        self.assertGreater(get_menu_version(self.A.shop.pk), a0)
        self.assertEqual(get_menu_version(self.B.shop.pk), b0, "A bo'limi o'zgarishi B menyu keshini tozalamasligi kerak")

    def test_orphan_category_edit_still_invalidates_everything_as_before(self):
        from products.menu_cache import get_menu_version
        orphan = Category.objects.create(name='Egasiz', is_restaurant=True)
        a0, b0 = get_menu_version(self.A.shop.pk), get_menu_version(self.B.shop.pk)
        orphan.name = 'Egasiz 2'
        orphan.save()
        self.assertGreater(get_menu_version(self.A.shop.pk), a0)
        self.assertGreater(get_menu_version(self.B.shop.pk), b0)


# ─── F. Localhost / demo / CI xatti-harakati o'zgarmaydi ──────────────────────────────────────────────

class LocalhostUnchangedTests(TwoTenantCase):

    def setUp(self):
        from notifications.models import AppSetting
        AppSetting.objects.update_or_create(key='restaurant_default_shop', defaults={'value': self.A.shop.slug, 'category': 'restaurant'})

    def test_plain_hosts_use_the_default_restaurant_as_before(self):
        for host in ('testserver', 'localhost', '127.0.0.1:8000'):
            c = Client()
            resp = c.get('/api/v1/restaurant/menu/', HTTP_HOST=host, HTTP_X_PRODUCT='restaurant')
            self.assertEqual(resp.status_code, 200, host)
            self.assertIn(self.A.marker, self.body(resp), host)
            self.assertNotIn(self.B.marker, self.body(resp), host)

    def test_responses_are_identical_with_and_without_platform_domain(self):
        from django.test import override_settings
        urls = ('/api/v1/restaurant/menu/', '/api/guest/v1/session/', '/api/guest/v1/welcome/')
        with_domain = {u: Client().get(u, HTTP_X_PRODUCT='restaurant').content for u in urls}
        with override_settings(PLATFORM_DOMAIN=''):
            without = {u: Client().get(u, HTTP_X_PRODUCT='restaurant').content for u in urls}
        self.assertEqual(with_domain, without)

    def test_staff_of_any_shop_still_works_on_plain_host(self):
        client = login(self.B.owner)
        resp = client.get(ADMIN + 'menu/products/', HTTP_HOST='testserver', HTTP_X_PRODUCT='restaurant')
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.B.marker, self.body(resp))
        self.assertNotIn(self.A.marker, self.body(resp))


# ─── G. Platforma hosti (apex / www / app) ───────────────────────────────────────────────────────────

class PlatformHostTests(TwoTenantCase):
    """Apex tenantsiz: hech bir mijozning menyusi/bo'limi ko'rinmaydi (asosiy restoran taxmin qilinmaydi), faqat super_admin kiradi."""

    PLATFORM = {'HTTP_HOST': 'platform.test'}

    def test_guest_pages_on_apex_do_not_expose_any_tenant(self):
        c = Client()
        for host in ('platform.test', 'www.platform.test', 'app.platform.test'):
            for url in ('/', '/welcome/', '/menu/', '/catalog/', '/ar/', '/api/v1/restaurant/menu/', '/api/guest/v1/menu/',
                        '/api/guest/v1/session/', '/api/guest/v1/welcome/', '/api/v1/products/', '/api/v1/categories/'):
                resp = c.get(url, HTTP_HOST=host)
                self.assertLess(resp.status_code, 500, (host, url))
                for t in (self.A, self.B):
                    self.assertNoLeak(resp, t, f'{host} {url}')

    def test_apex_uses_only_an_explicitly_chosen_default_restaurant(self):
        from notifications.models import AppSetting
        AppSetting.objects.update_or_create(key='restaurant_default_shop', defaults={'value': self.A.shop.slug, 'category': 'restaurant'})
        resp = Client().get('/api/v1/restaurant/menu/', **self.PLATFORM)
        self.assertIn(self.A.marker, self.body(resp))
        self.assertNotIn(self.B.marker, self.body(resp))

    def test_restaurant_staff_cannot_log_in_or_work_on_the_platform_host(self):
        c = Client()
        resp = c.post('/admin/login/', {'username': self.A.owner.username, 'password': PASSWORD}, **self.PLATFORM)
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('_auth_user_id', c.session)
        self.assertIn("faqat platforma administratori", self.body(resp))
        client = login(self.A.owner)                                  # sessiya bo'lsa ham anonim hisoblanadi
        for url in (ADMIN + 'menu/products/', ADMIN + 'orders/', LEGACY + 'orders/'):
            self.assertIn(client.get(url, **self.PLATFORM).status_code, (401, 403), url)
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.A.owner).access_token)
        resp = Client().get(ADMIN + 'menu/products/', HTTP_AUTHORIZATION=f'Bearer {token}', **self.PLATFORM)
        self.assertIn(resp.status_code, (401, 403))

    def test_super_admin_works_on_the_platform_host(self):
        root = AdminUser.objects.create_user(
            username='root3', password=PASSWORD, role='super_admin', is_superuser=True, is_staff=True, is_approved=True)
        c = Client()
        resp = c.post('/admin/login/', {'username': 'root3', 'password': PASSWORD}, **self.PLATFORM)
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(int(c.session['_auth_user_id']), root.pk)
        self.assertEqual(c.get(ADMIN + 'session/', **self.PLATFORM).status_code, 200)


# ─── H. So'rovlar byudjeti tenant hostida ham saqlanadi (web/test_query_budget.py: 12 ta) ──────────────

class TenantQueryBudgetTests(TwoTenantCase):
    BUDGET = 12

    def _count(self, client, url, host):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            resp = client.get(url, **host)
        self.assertEqual(resp.status_code, 200, url)
        return len(ctx)

    def test_guest_pages_stay_within_the_budget_on_a_tenant_host(self):
        for url in ('/menu/', '/welcome/', '/api/v1/restaurant/menu/', '/api/guest/v1/session/', '/catalog/'):
            n = self._count(Client(), url, host_of(self.A))
            self.assertLessEqual(n, self.BUDGET, f'{url}: {n} ta so\'rov')

    def test_tenant_overhead_is_small(self):
        """Tenant hosti oddiy hostga nisbatan ko'pi bilan 3 ta qo'shimcha so'rov (tenant qidiruvi) qo'shadi."""
        from notifications.models import AppSetting
        AppSetting.objects.update_or_create(key='restaurant_default_shop', defaults={'value': self.A.shop.slug, 'category': 'restaurant'})
        for url in ('/menu/', '/api/guest/v1/session/'):
            plain = self._count(Client(), url, {'HTTP_HOST': 'testserver', 'HTTP_X_PRODUCT': 'restaurant'})
            tenant = self._count(Client(), url, host_of(self.A))
            self.assertLessEqual(tenant, plain + 3, f'{url}: tenant {tenant} vs oddiy {plain}')
