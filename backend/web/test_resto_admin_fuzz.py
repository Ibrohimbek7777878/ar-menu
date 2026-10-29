"""
Resto-Admin v1 API: noto'g'ri kiritish "fuzz" sinovi (P2.5).

`/api/restaurant/admin/v1/` ostidagi barcha admin endpointlarga adashgan/zararli qiymatlar yuboriladi: son o'rniga
matn, null, ro'yxat, ulkan va manfiy son, bo'sh, 10 000 belgili matn, NUL belgi, NaN/Infinity, mavjud bo'lmagan id,
mantiqiy maydonda "false"/"0". Natija HECH QACHON 5xx bo'lmasligi, 4xx bo'lsa JSON'da `error` kaliti bo'lishi shart.
Sinov doimiy (CI da PostgreSQL'da ham yuradi: NUL belgi va ustun uzunligi faqat u yerda 500 beradi).
"""
import io
import json
import logging

from django.core.management import call_command
from django.db import transaction
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from categories.models import Category
from finance.models import DebtRecord, FinanceCategory, FinanceTransaction
from orders.models import Order, OrderItem
from orders.timeutils import local_today
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table

BASE = '/api/restaurant/admin/v1/'

HOSTILE = ['abc', '', None, [], {}, 10 ** 30, -1, 'NaN', 'x' * 10000, 'a\x00b']

QUERY_HOSTILE = ['abc', '-1', '99999999999999999999', '2020-13-45', '\x00', 'x' * 3000]

RAW_BODIES = [b'[]', b'null', b'{buzuq json']


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestoAdminFuzzBase(TestCase):
    """Umumiy fixture va tekshiruv yordamchilari."""

    def setUp(self):
        logging.disable(logging.CRITICAL)            # kutilgan 500 jurnali bilan konsolni to'ldirmaslik
        self.addCleanup(logging.disable, logging.NOTSET)
        call_command('create_restaurant', name='Fuzz Resto', slug='fuzz-resto', owner='fuzz-owner',
                     password='Parol-Fuzz-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='fuzz-resto')
        self.owner = AdminUser.objects.get(username='fuzz-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.hall = Hall.objects.filter(shop=self.shop).first()
        self.table = Table.objects.filter(shop=self.shop).first()
        self.category = Category.objects.create(name='Fuzz taomlar', name_uz='Fuzz taomlar', name_ru='Fuzz', icon='x',
                                                is_restaurant=True)
        self.product = Product.objects.create(shop=self.shop, name='Fuzz osh', slug='fuzz-osh', price=45000,
                                              category=self.category, is_available=True)
        self.order = Order.objects.create(
            shop=self.shop, table=self.table, order_number='FZ-0001', customer_name='Fuzz Mijoz',
            customer_phone_1='+998901234567', total_amount=45000, final_amount=45000, status='pending')
        OrderItem.objects.create(order=self.order, product=self.product, product_name='Fuzz osh', price=45000,
                                 unit='dona', quantity=1, total=45000)
        self.fin_cat = FinanceCategory.objects.create(shop=self.shop, name='Fuzz kategoriya', category_type='income')
        self.tx = FinanceTransaction.objects.create(shop=self.shop, tx_type='income', stage='income', amount=1000,
                                                    title='Fuzz kirim', tx_date=local_today(), category=self.fin_cat)
        self.debt = DebtRecord.objects.create(shop=self.shop, person_name='Fuzz qarzdor', amount=100000)
        self.waiter = AdminUser.objects.create_user(username='fuzz-waiter', password='Parol-Waiter-123',
                                                    role='waiter', shop=self.shop, is_approved=True)
        self.client = Client(raise_request_exception=False)
        self.client.force_login(self.owner)
        self.failures = []

    # ── yordamchilar ────────────────────────────────────────────────────────
    def send(self, method, path, body=None, raw=None, params=None):
        url = BASE + path
        if params:
            from urllib.parse import urlencode
            url += '?' + urlencode(params)
        # Savepoint: view ichidagi DB xatosi sinov tranzaksiyasini buzib, keyingi so'rovlarni "yiqitib" yubormasin
        with transaction.atomic():
            if method == 'GET':
                return self.client.get(url)
            data = raw if raw is not None else json.dumps(body if body is not None else {})
            return getattr(self.client, method.lower())(url, data=data, content_type='application/json')

    def check(self, resp, label):
        """5xx — xato; 4xx bo'lsa JSON obyekt va `error` kaliti shart."""
        code = resp.status_code
        if code >= 500:
            self.failures.append(f'{label} -> {code}')
            return
        if code >= 400:
            try:
                body = resp.json()
            except ValueError:
                self.failures.append(f'{label} -> {code} JSON emas')
                return
            if not isinstance(body, dict) or not body.get('error'):
                self.failures.append(f'{label} -> {code} `error` kaliti yo\'q: {str(body)[:80]}')

    def fuzz_body(self, method, path, base, fields=None, label=None):
        """Har bir maydonni har bir zararli qiymat bilan almashtirib yuboradi; yetishmayotgan maydon ham sinaladi."""
        label = label or f'{method} {path}'
        for field in (fields if fields is not None else list(base)):
            for value in HOSTILE:
                payload = dict(base)
                payload[field] = value
                self.check(self.send(method, path, payload), f'{label} [{field}={str(value)[:25]!r}]')
            payload = dict(base)
            payload.pop(field, None)
            self.check(self.send(method, path, payload), f'{label} [{field} yo\'q]')
        for raw in RAW_BODIES:
            self.check(self.send(method, path, raw=raw), f'{label} [tana={raw[:12]!r}]')

    def fuzz_query(self, path, names, label=None):
        label = label or f'GET {path}'
        for name in names:
            for value in QUERY_HOSTILE:
                self.check(self.send('GET', path, params={name: value}), f'{label} [?{name}={value[:20]!r}]')

    def fuzz_ids(self, method, path_template, body=None):
        """Mavjud bo'lmagan/ulkan id (path ichida) — 404, hech qachon 500."""
        for pk in (0, 99999999, 10 ** 30):
            self.check(self.send(method, path_template.format(pk=pk), body), f'{method} {path_template} pk={pk}')

    def assertClean(self):
        if self.failures:
            unique = sorted(set(self.failures))
            # Bir xil (endpoint, maydon) bo'yicha birinchi namuna — o'qish oson bo'lsin
            seen, shown = set(), []
            for line in unique:
                key = line.split('=')[0] if '[' in line else line
                if key not in seen:
                    seen.add(key)
                    shown.append(line)
            self.fail(f'{len(unique)} ta muammo, {len(shown)} xil:\n  ' + '\n  '.join(shown[:80]))


class MenuFuzzTests(RestoAdminFuzzBase):

    def test_menu_products_and_categories(self):
        base = {'name': 'Plov', 'price': 45000, 'old_price': 50000, 'category_id': self.category.id,
                'description': 'mazali', 'prep_minutes': 10, 'cook_min': 12, 'is_available': True,
                'allergens': ['sut'], 'diet_tags': ['halol'], 'ar_model': '', 'has_3d': False}
        self.fuzz_body('POST', 'menu/products/', base)
        self.fuzz_body('PATCH', f'menu/products/{self.product.id}/', dict(base, is_featured=False))
        self.fuzz_body('POST', f'menu/products/{self.product.id}/availability/', {'available': True})
        self.fuzz_body('POST', f'menu/products/{self.product.id}/feature/', {'value': True})
        self.fuzz_body('POST', 'menu/categories/', {'name': 'Yangi kategoriya'})
        self.fuzz_query('menu/products/', ['status', 'q', 'category', 'ordering', 'page', 'page_size'])
        self.fuzz_query('menu/categories/', ['q'])
        for tail in ('', 'availability/', 'duplicate/', 'feature/', 'restore/'):
            for method in (('PATCH', 'DELETE') if tail == '' else ('POST',)):
                self.fuzz_ids(method, 'menu/products/{pk}/' + tail)
        self.assertClean()


class TablesFuzzTests(RestoAdminFuzzBase):

    def test_tables_and_halls(self):
        self.fuzz_body('POST', 'tables/', {'number': '21', 'hall_id': self.hall.id, 'capacity': 4, 'shape': 'rect'})
        self.fuzz_body('PATCH', f'tables/{self.table.id}/', {'number': '22', 'hall_id': self.hall.id, 'capacity': 6,
                                                            'shape': 'round', 'status': 'free'})
        self.fuzz_body('POST', f'tables/{self.table.id}/status/', {'status': 'free'})
        self.fuzz_body('POST', 'tables/halls/', {'name': 'VIP zal', 'order': 1})
        self.fuzz_body('PATCH', f'tables/halls/{self.hall.id}/', {'name': 'Yangi nom', 'order': 2})
        self.fuzz_query('tables/', ['include_deleted', 'hall_id', 'status', 'q'])
        for tail, methods in (('', ('PATCH', 'DELETE')), ('restore/', ('POST',)), ('status/', ('POST',)),
                              ('rotate-qr/', ('POST',)), ('qr.svg', ('GET',))):
            for method in methods:
                self.fuzz_ids(method, 'tables/{pk}/' + tail)
        self.fuzz_ids('PATCH', 'tables/halls/{pk}/')
        self.fuzz_ids('DELETE', 'tables/halls/{pk}/')
        self.assertClean()


class OrdersFuzzTests(RestoAdminFuzzBase):

    def test_orders(self):
        self.fuzz_query('orders/', ['status', 'payment_status', 'table_id', 'date', 'from', 'to', 'q', 'page', 'page_size'])
        self.fuzz_body('POST', f'orders/{self.order.id}/status/', {'status': 'confirmed', 'cancel_reason': 'sabab'})
        self.fuzz_body('POST', f'orders/{self.order.id}/payment/', {'payment_status': 'paid', 'payment_method': 'cash'})
        for tail, methods in (('', ('GET',)), ('status/', ('POST',)), ('payment/', ('POST',))):
            for method in methods:
                self.fuzz_ids(method, 'orders/{pk}/' + tail)
        self.assertClean()


class StaffFuzzTests(RestoAdminFuzzBase):

    def test_staff(self):
        self.fuzz_body('POST', 'staff/', {'username': 'yangi-xodim', 'role': 'waiter', 'password': 'Kuchli-Parol-123',
                                          'full_name': 'Ali Valiyev', 'phone': '+998901112233'})
        self.fuzz_body('PATCH', f'staff/{self.waiter.id}/', {'full_name': 'Vali Aliyev', 'phone': '+998909998877',
                                                            'role': 'kitchen'})
        self.fuzz_body('POST', f'staff/{self.waiter.id}/reset-password/', {'password': 'Yangi-Parol-12345'})
        for tail, methods in (('', ('PATCH',)), ('block/', ('POST',)), ('unblock/', ('POST',)),
                              ('reset-password/', ('POST',))):
            for method in methods:
                self.fuzz_ids(method, 'staff/{pk}/' + tail)
        self.assertClean()


class FinanceFuzzTests(RestoAdminFuzzBase):

    def test_finance(self):
        self.fuzz_body('POST', 'finance/transactions/', {'title': 'Bozorlik', 'type': 'expense', 'amount': 25000,
                                                         'payment_method': 'cash', 'category_id': self.fin_cat.id,
                                                         'tx_date': '2026-10-01'})
        self.fuzz_body('POST', 'finance/debts/', {'person_name': 'Salim', 'phone': '+998901234567',
                                                  'debt_type': 'customer', 'initial_amount': 50000,
                                                  'due_date': '2026-12-01', 'notes': 'izoh'})
        self.fuzz_body('POST', f'finance/debts/{self.debt.id}/pay/', {'amount': 1000, 'payment_method': 'cash'})
        self.fuzz_body('POST', f'finance/transactions/{self.tx.id}/cancel/', {'reason': 'xato kiritildi'})
        self.fuzz_query('finance/transactions/', ['type', 'payment_method', 'category_id', 'from', 'to',
                                                  'include_cancelled', 'q', 'page', 'page_size'])
        self.fuzz_query('finance/debts/', ['type', 'status', 'q'])
        self.fuzz_query('finance/summary/', ['from', 'to'])
        self.fuzz_query('finance/export.csv', ['from', 'to'])
        self.fuzz_ids('POST', 'finance/transactions/{pk}/cancel/', {'reason': 'x'})
        self.fuzz_ids('POST', 'finance/debts/{pk}/pay/', {'amount': 1})
        self.assertClean()


class SettingsAndDashboardFuzzTests(RestoAdminFuzzBase):

    def test_settings(self):
        base = {'name': 'Yangi nom', 'description': 'tavsif', 'address': 'Guliston', 'phone': '+998901234567',
                'phone2': '+998907654321', 'working_hours': '09:00-23:00', 'working_days': 'Dush-Yak',
                'is_open': True, 'color_primary': '#16a34a', 'instagram_url': 'https://instagram.com/x',
                'service_fee_percent': 10, 'kds_warning_minutes': 10, 'kds_critical_minutes': 20,
                'telegram_chat_id': '123456789', 'auto_accept_orders': False}
        self.fuzz_body('PATCH', 'settings/', base)
        self.assertClean()

    def test_dashboard_and_session_survive_garbage_query(self):
        self.fuzz_query('dashboard/summary/', ['from', 'to', 'shop', 'date'])
        self.fuzz_query('session/', ['shop'])
        self.assertClean()


class MixedTypeSafetyTests(RestoAdminFuzzBase):
    """Mantiqiy maydonlar: "false"/"0" avval bool("false") == True bo'lib qolardi."""

    def _patch_settings(self, **kw):
        return self.send('PATCH', 'settings/', kw)

    def test_settings_boolean_strings_are_parsed_not_truthy(self):
        self.shop.is_open = True
        self.shop.save(update_fields=['is_open'])
        for falsy in ('false', '0', 'no', False, 0):
            self.shop.is_open = True
            self.shop.save(update_fields=['is_open'])
            res = self._patch_settings(is_open=falsy, auto_accept_orders=falsy)
            self.assertEqual(res.status_code, 200, f'{falsy!r}: {res.content[:200]}')
            self.shop.refresh_from_db()
            self.assertFalse(self.shop.is_open, repr(falsy))
            self.assertFalse(self.shop.business_profile.get('auto_accept_orders'), repr(falsy))
        for truthy in ('true', '1', 'yes', True, 1):
            res = self._patch_settings(is_open=truthy, auto_accept_orders=truthy)
            self.assertEqual(res.status_code, 200)
            self.shop.refresh_from_db()
            self.assertTrue(self.shop.is_open, repr(truthy))
            self.assertTrue(self.shop.business_profile.get('auto_accept_orders'), repr(truthy))

    def test_settings_rejects_garbage_numbers_instead_of_ignoring_silently(self):
        for field, bad in (('service_fee_percent', 'abc'), ('service_fee_percent', 101), ('service_fee_percent', -1),
                           ('kds_warning_minutes', 0), ('kds_warning_minutes', 'x'), ('kds_critical_minutes', 10 ** 12),
                           ('is_open', 'balki'), ('is_open', None), ('is_open', [])):
            res = self._patch_settings(**{field: bad})
            self.assertEqual(res.status_code, 400, f'{field}={bad!r}')
            self.assertIn('error', res.json())
            self.assertEqual(res.json().get('field'), field)

    def test_menu_boolean_strings(self):
        pid = self.product.id
        res = self.send('POST', f'menu/products/{pid}/availability/', {'available': 'false'})
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_available)
        res = self.send('POST', f'menu/products/{pid}/feature/', {'value': 'false'})
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_featured)
        res = self.send('PATCH', f'menu/products/{pid}/', {'is_available': '0', 'is_featured': 'no', 'has_3d': 'false'})
        self.assertEqual(res.status_code, 200, res.content[:200])
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_available)
        self.assertFalse(self.product.is_featured)
        res = self.send('PATCH', f'menu/products/{pid}/', {'is_available': 'balki'})
        self.assertEqual(res.status_code, 400)

    def test_menu_rejects_garbage_numbers(self):
        pid = self.product.id
        for field, bad in (('price', 'abc'), ('price', -5), ('price', 10 ** 30), ('price', None), ('old_price', 'xyz'),
                           ('prep_minutes', 'abc'), ('prep_minutes', 10 ** 12), ('cook_min', [1]), ('category_id', 'abc'),
                           ('category_id', 999999999)):
            res = self.send('PATCH', f'menu/products/{pid}/', {field: bad})
            self.assertEqual(res.status_code, 400, f'{field}={bad!r} -> {res.status_code} {res.content[:100]}')
            self.assertIn('error', res.json())
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, 45000)

    def test_finance_rejects_bad_dates_and_amounts_with_400(self):
        for body in ({'title': 'x', 'type': 'income', 'amount': 'abc'},
                     {'title': 'x', 'type': 'income', 'amount': '1', 'tx_date': 'kecha'},
                     {'title': 'x', 'type': 'income', 'amount': '1', 'category_id': 'abc'},
                     {'title': 'x' * 300, 'type': 'income', 'amount': '1'}):
            res = self.send('POST', 'finance/transactions/', body)
            self.assertEqual(res.status_code, 400, body)
            self.assertIn('error', res.json())
        res = self.send('POST', 'finance/debts/', {'person_name': 'A', 'initial_amount': '1', 'due_date': 'ertaga'})
        self.assertEqual(res.status_code, 400)
        for params in ({'from': 'kecha'}, {'to': '2020-13-45'}):
            res = self.send('GET', 'finance/transactions/', params=params)
            self.assertEqual(res.status_code, 400, params)
            res = self.send('GET', 'orders/', params=params)
            self.assertEqual(res.status_code, 400, params)

    def test_orders_status_accepts_only_strings(self):
        for bad in ([], ['confirmed'], {'a': 1}, None, 5):
            res = self.send('POST', f'orders/{self.order.id}/status/', {'status': bad})
            self.assertEqual(res.status_code, 400, repr(bad))
        res = self.send('POST', f'orders/{self.order.id}/status/', {'status': 'cancelled', 'cancel_reason': None})
        self.assertLess(res.status_code, 500)

    def test_tables_reject_bad_ids_and_values(self):
        for body in ({'number': '31', 'hall_id': 'abc'}, {'number': '31', 'hall_id': [1]}, {'number': '31', 'capacity': 'x'},
                     {'number': '31', 'shape': 'uchburchak'}, {'number': 'N' * 500}, {'number': ['1']}):
            res = self.send('POST', 'tables/', body)
            self.assertEqual(res.status_code, 400, f'{body} -> {res.status_code}')
            self.assertIn('error', res.json())
        self.assertFalse(Table.objects.filter(number='31').exists())


class FrameworkErrorShapeTests(RestoAdminFuzzBase):
    """DRF o'zi chiqaradigan xatolar (401/403/404/405/415) ham `error` kalitini beradi — frontend faqat shuni o'qiydi."""

    def assertErrorShape(self, resp, expected):
        self.assertEqual(resp.status_code, expected, resp.content[:200])
        body = resp.json()
        self.assertTrue(body.get('error'), body)
        self.assertTrue(body.get('detail'), body)           # eski mijozlar uchun

    def test_anonymous_and_forbidden(self):
        anon = Client(raise_request_exception=False)
        self.assertIn(anon.get(BASE + 'menu/products/').status_code, (401, 403))
        body = anon.get(BASE + 'menu/products/').json()
        self.assertTrue(body.get('error'), body)
        waiter = Client(raise_request_exception=False)
        waiter.force_login(self.waiter)
        self.assertErrorShape(waiter.get(BASE + 'staff/'), 403)

    def test_not_found_wrong_method_and_media_type(self):
        self.assertErrorShape(self.send('GET', f'orders/{10 ** 12}/'), 404)
        self.assertErrorShape(self.client.put(BASE + 'settings/', data='{}', content_type='application/json'), 405)
        self.assertErrorShape(self.client.post(BASE + 'tables/', data='number=5', content_type='text/plain'), 415)
        self.assertErrorShape(self.send('POST', 'tables/', raw=b'{buzuq'), 400)
        self.assertErrorShape(self.send('POST', 'tables/', raw=b'[1, 2]'), 400)
