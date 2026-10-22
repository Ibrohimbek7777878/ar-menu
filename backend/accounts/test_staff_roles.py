"""
Xodim rollari testlari (TZ: R2-1, R2-2, R2-3, R2-5): ruxsat matritsasi, create_staff / block_staff, login himoyasi.
"""
import io
import json

from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, RequestFactory, TestCase, override_settings

from accounts.models import AdminUser
from accounts.staff_admin import StaffError, create_staff
from backend import login_guard
from backend.middleware import SellerTenantMiddleware
from orders.audit import AuditLog
from orders.models import Order
from shops.models import Shop
from tables_restaurant.models import Table

API = '/api/v1/restaurant'
GOOD_PASSWORD = 'Xodim-Parol-2026!'


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class StaffFixture(TestCase):

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)          # login sanagichlari boshqa testlarga o'tib qolmasin
        call_command('create_restaurant', name='Rol Oshxona', slug='rol-osh', owner='rol-ega',
                     password='Rol-parol-123', tables=3, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='rol-osh')
        self.owner = AdminUser.objects.get(username='rol-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.users = {'owner': self.owner}
        for role in ('waiter', 'kitchen', 'hostess'):
            user, _ = create_staff(self.shop, f'x-{role}', role, password=GOOD_PASSWORD)
            self.users[role] = user
        self.users['manager'] = create_staff(self.shop, 'x-manager', 'shop_manager', password=GOOD_PASSWORD)[0]

    def client_for(self, key):
        client = Client()
        if key != 'guest':
            client.force_login(self.users[key])
        return client


class PermissionMatrixTests(StaffFixture):
    """Har rol faqat o'z ishiga kerakli narsani ko'radi (8-ilova)."""

    def codes(self, method, url, keys, **kw):
        out = {}
        for key in keys:
            res = getattr(self.client_for(key), method)(url, **kw)
            out[key] = res.status_code
        return out

    def assertAllowed(self, codes, allowed):
        for key, code in codes.items():
            if key in allowed:
                self.assertNotIn(code, (401, 403, 302), f'{key} ruxsat etilishi kerak edi: {code}')
            else:
                self.assertIn(code, (401, 403, 302), f'{key} taqiqlanishi kerak edi: {code}')

    ALL = ('guest', 'owner', 'manager', 'waiter', 'kitchen', 'hostess')

    def test_orders_list_is_for_kds_roles(self):
        self.assertAllowed(self.codes('get', f'{API}/orders/', self.ALL), {'owner', 'manager', 'waiter', 'kitchen'})

    def test_tables_state_is_for_waiter_hostess_and_managers(self):
        self.assertAllowed(self.codes('get', f'{API}/tables/', self.ALL), {'owner', 'manager', 'waiter', 'hostess'})

    def test_service_calls_are_for_the_waiter(self):
        self.assertAllowed(self.codes('get', f'{API}/calls/', self.ALL), {'owner', 'manager', 'waiter'})

    def test_reservations_list_is_for_hostess_and_managers(self):
        self.assertAllowed(self.codes('get', f'{API}/reservations/', self.ALL), {'owner', 'manager', 'hostess'})

    def test_finance_is_for_managers_only(self):
        self.assertAllowed(self.codes('get', f'{API}/finance/', self.ALL), {'owner', 'manager'})

    def test_settling_a_bill_is_pos_only(self):
        codes = self.codes('post', f'{API}/tables/1/settle/', self.ALL, data=json.dumps({'payment_method': 'cash'}),
                           content_type='application/json')
        self.assertAllowed(codes, {'owner', 'manager', 'waiter'})

    def test_kitchen_item_toggle_is_kds_only(self):
        codes = self.codes('post', f'{API}/kitchen/items/999999/toggle/', self.ALL)
        self.assertAllowed(codes, {'owner', 'manager', 'waiter', 'kitchen'})

    def test_reservation_status_change_is_for_hostess_and_managers(self):
        codes = self.codes('patch', f'{API}/reservations/999999/status/', self.ALL, data=json.dumps({'status': 'arrived'}),
                           content_type='application/json')
        self.assertAllowed(codes, {'owner', 'manager', 'hostess'})

    def test_staff_pages_redirect_other_roles_to_their_own_home(self):
        expectations = {
            '/kds/': ({'owner', 'manager', 'kitchen'}),
            '/arrival/desk/': ({'owner', 'manager', 'hostess'}),
            '/waiter/panel/': ({'owner', 'manager', 'waiter'}),
        }
        for url, allowed in expectations.items():
            for key in ('owner', 'manager', 'waiter', 'kitchen', 'hostess'):
                res = self.client_for(key).get(url)
                if key in allowed:
                    self.assertEqual(res.status_code, 200, f'{key} {url}')
                else:
                    self.assertEqual(res.status_code, 302, f'{key} {url}')
                    self.assertNotIn('/admin/login/', res['Location'], f'{key} {url}: kirgan xodim loginga emas, o\'z sahifasiga')
            self.assertEqual(self.client_for('guest').get(url).status_code, 302)
            self.assertIn('/admin/login/', self.client_for('guest').get(url)['Location'])

    def test_kitchen_cannot_see_customer_phones_but_the_waiter_can(self):
        Order.objects.create(shop=self.shop, table=Table.objects.filter(shop=self.shop).first(), order_number='GLS-R-1',
                             customer_name='Ali', customer_phone_1='+998901234567', total_amount=1000, final_amount=1000)
        kitchen = self.client_for('kitchen').get(f'{API}/orders/').json()
        waiter = self.client_for('waiter').get(f'{API}/orders/').json()
        self.assertEqual(kitchen[0]['customer_phone'], '')
        self.assertEqual(waiter[0]['customer_phone'], '+998901234567')

    def test_kds_status_changes_are_limited_by_role(self):
        order = Order.objects.create(shop=self.shop, table=Table.objects.filter(shop=self.shop).first(),
                                     order_number='GLS-R-2', customer_name='Ali', customer_phone_1='+998901234567',
                                     total_amount=1000, final_amount=1000, status='confirmed')

        def post(key, status):
            return self.client_for(key).post('/api/kds/status/', json.dumps({'order_id': order.pk, 'new_status': status}),
                                             content_type='application/json')

        self.assertEqual(post('kitchen', 'cancelled').status_code, 403)         # oshpaz bekor qila olmaydi
        self.assertEqual(post('kitchen', 'delivered').status_code, 403)
        self.assertEqual(post('kitchen', 'preparing').status_code, 200)
        self.assertEqual(post('waiter', 'preparing').status_code, 403)          # ofitsiant pishirishni boshqarmaydi
        self.assertEqual(post('hostess', 'preparing').status_code, 403)
        self.assertEqual(post('owner', 'ready').status_code, 200)
        self.assertEqual(post('waiter', 'delivered').status_code, 200)

    def test_spa_session_gives_each_server_role_exactly_its_panel(self):
        from web.restaurant_auth import spa_session
        for key, expected in {'owner': 'admin', 'manager': 'admin', 'waiter': 'waiter', 'kitchen': 'kitchen',
                              'hostess': 'hostess'}.items():
            request = RequestFactory().get('/')
            request.user = self.users[key]
            session = spa_session(request)
            self.assertEqual((session['role'], session['roles']), (expected, [expected]), key)


class CreateAndBlockStaffTests(StaffFixture):

    def run_cmd(self, name, *args):
        out, err = io.StringIO(), io.StringIO()
        call_command(name, *args, stdout=out, stderr=err)
        return out.getvalue()

    def login(self, username, password):
        client = Client()
        res = client.post('/admin/login/', {'username': username, 'password': password})
        return client, res

    def test_created_kitchen_user_reaches_kds_but_not_finance(self):
        self.run_cmd('create_staff', '--shop', 'rol-osh', '--username', 'oshpaz1', '--role', 'kitchen',
                     '--password', GOOD_PASSWORD, '--name', 'Bahodir Oshpaz')
        user = AdminUser.objects.get(username='oshpaz1')
        self.assertEqual((user.role, user.shop, user.is_approved, user.is_staff, user.is_superuser),
                         ('kitchen', self.shop, True, False, False))
        client, res = self.login('oshpaz1', GOOD_PASSWORD)
        self.assertEqual((res.status_code, res['Location']), (302, '/kds/'))          # R2-3: rolga mos sahifa
        self.assertEqual(client.get('/kds/').status_code, 200)
        self.assertEqual(client.get(f'{API}/finance/').status_code, 403)

    def test_login_redirects_each_role_to_its_own_page(self):
        for username, target in (('x-kitchen', '/kds/'), ('x-hostess', '/arrival/desk/')):
            _, res = self.login(username, GOOD_PASSWORD)
            self.assertEqual(res['Location'], target, username)
        _, res = self.login('x-waiter', GOOD_PASSWORD)
        self.assertEqual(res.status_code, 302)
        self.assertIn('waiter', res['Location'])

    def test_next_parameter_still_wins_after_login(self):
        client = Client()
        res = client.post('/admin/login/', {'username': 'x-kitchen', 'password': GOOD_PASSWORD, 'next': '/kds/'})
        self.assertEqual(res['Location'], '/kds/')

    def test_generated_password_is_shown_once_and_works(self):
        out = self.run_cmd('create_staff', '--shop', 'rol-osh', '--username', 'zarina', '--role', 'hostess')
        self.assertIn('Parol:', out)
        password = out.split('Parol:')[1].split()[0]
        _, res = self.login('zarina', password)
        self.assertEqual(res.status_code, 302)

    def test_weak_password_duplicate_login_and_bad_role_are_refused(self):
        for args, text in (
            (['--username', 'a1', '--role', 'waiter', '--password', '123'], 'kuchli emas'),
            (['--username', 'x-waiter', '--role', 'waiter', '--password', GOOD_PASSWORD], 'band'),
        ):
            with self.assertRaises(CommandError) as ctx:
                self.run_cmd('create_staff', '--shop', 'rol-osh', *args)
            self.assertIn(text, str(ctx.exception))
        with self.assertRaises(CommandError):
            self.run_cmd('create_staff', '--shop', 'rol-osh', '--username', 'a2', '--role', 'super_admin')
        with self.assertRaises(CommandError):
            self.run_cmd('create_staff', '--shop', 'yoq-restoran', '--username', 'a3', '--role', 'waiter')

    def test_update_resets_password_and_changes_role_but_never_touches_owners(self):
        self.run_cmd('create_staff', '--shop', 'rol-osh', '--username', 'x-waiter', '--role', 'hostess',
                     '--password', 'Yangi-Parol-2027!', '--update')
        user = AdminUser.objects.get(username='x-waiter')
        self.assertEqual(user.role, 'hostess')
        self.assertTrue(user.check_password('Yangi-Parol-2027!'))
        with self.assertRaises(StaffError):
            create_staff(self.shop, 'rol-ega', 'waiter', password=GOOD_PASSWORD, update=True)

    def test_staff_of_another_restaurant_cannot_be_hijacked(self):
        call_command('create_restaurant', name='Boshqa', slug='boshqa-r', owner='boshqa-ega', password='Boshqa-1234',
                     tables=1, stdout=io.StringIO())
        other = Shop.objects.get(slug='boshqa-r')
        with self.assertRaises(StaffError):
            create_staff(other, 'x-waiter', 'waiter', password=GOOD_PASSWORD, update=True)

    def test_block_staff_ends_sessions_and_blocks_login_without_deleting(self):
        client, _ = self.login('x-waiter', GOOD_PASSWORD)
        self.assertEqual(client.get(f'{API}/tables/').status_code, 200)
        out = self.run_cmd('block_staff', '--username', 'x-waiter')
        self.assertIn('bloklandi', out)
        self.assertEqual(client.get(f'{API}/tables/').status_code, 403)               # sessiya darhol o'ldi
        self.assertTrue(AdminUser.objects.filter(username='x-waiter', is_active=False).exists())   # akkaunt saqlanadi
        _, res = self.login('x-waiter', GOOD_PASSWORD)
        self.assertEqual(res.status_code, 200)                                          # kira olmaydi
        self.run_cmd('block_staff', '--username', 'x-waiter', '--unblock')
        _, res = self.login('x-waiter', GOOD_PASSWORD)
        self.assertEqual(res.status_code, 302)

    def test_owners_cannot_be_blocked_by_the_command(self):
        with self.assertRaises(CommandError):
            self.run_cmd('block_staff', '--username', 'rol-ega')

    def test_blocked_staff_actions_are_in_the_audit_log(self):
        self.run_cmd('block_staff', '--username', 'x-hostess')
        self.assertTrue(AuditLog.objects.filter(action_type='account_change',
                                                new_value__event='staff_blocked').exists())


class LoginBruteForceTests(StaffFixture):

    def attempt(self, username, password='yomon-parol', client=None):
        return (client or Client()).post('/admin/login/', {'username': username, 'password': password})

    def test_one_account_is_locked_after_repeated_failures_even_with_the_right_password(self):
        for _ in range(login_guard.USER_LIMIT):
            self.assertEqual(self.attempt('x-waiter').status_code, 200)
        res = self.attempt('x-waiter', GOOD_PASSWORD)
        self.assertEqual(res.status_code, 200)                                           # to'g'ri parol ham qabul qilinmaydi
        self.assertIn('Xavfsizlik', res.content.decode())
        self.assertFalse('_auth_user_id' in res.client.session)

    def test_other_accounts_from_the_same_wifi_are_not_locked_by_one_mistaken_colleague(self):
        for _ in range(login_guard.USER_LIMIT):
            self.attempt('x-waiter')
        res = self.attempt('x-kitchen', GOOD_PASSWORD)
        self.assertEqual(res.status_code, 302)                                           # avval umumiy IP hammani bloklardi

    def test_ip_wide_limit_stops_password_spraying(self):
        for i in range(login_guard.IP_LIMIT):
            self.attempt(f'yoq-{i}')
        self.assertIn('Xavfsizlik', self.attempt('x-kitchen', GOOD_PASSWORD).content.decode())

    def test_success_clears_the_account_counter(self):
        for _ in range(login_guard.USER_LIMIT - 1):
            self.attempt('x-waiter')
        self.assertEqual(self.attempt('x-waiter', GOOD_PASSWORD).status_code, 302)
        for _ in range(login_guard.USER_LIMIT - 1):
            self.attempt('x-waiter')
        self.assertEqual(self.attempt('x-waiter', GOOD_PASSWORD).status_code, 302)

    def test_failures_locks_and_successes_are_audited_without_passwords(self):
        for _ in range(login_guard.USER_LIMIT):
            self.attempt('x-waiter', 'ZAIF-PAROL-123')
        events = list(AuditLog.objects.filter(action_type='security').values_list('new_value', flat=True))
        kinds = [e.get('event') for e in events]
        self.assertEqual(kinds.count('login_failed'), login_guard.USER_LIMIT)
        self.assertIn('login_locked', kinds)
        self.assertNotIn('ZAIF-PAROL-123', json.dumps(events))
        cache.clear()
        self.attempt('x-kitchen', GOOD_PASSWORD)
        self.assertTrue(AuditLog.objects.filter(action_type='login', new_value__username='x-kitchen').exists())

    def test_api_login_is_protected_too(self):
        client = Client()
        post = lambda pw: client.post('/api/v1/accounts/auth/login/', json.dumps({'username': 'x-waiter', 'password': pw}),  # noqa: E731
                                      content_type='application/json')
        codes = [post('yomon').status_code for _ in range(login_guard.USER_LIMIT)]
        self.assertTrue(all(code in (400, 429) for code in codes), codes)
        self.assertEqual(post(GOOD_PASSWORD).status_code, 429)

    def test_seller_login_uses_the_same_guard(self):
        client = Client()
        for _ in range(login_guard.USER_LIMIT):
            client.post('/seller/login/', {'username': 'rol-ega', 'password': 'yomon'})
        res = client.post('/seller/login/', {'username': 'rol-ega', 'password': 'Rol-parol-123'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('Xavfsizlik', res.content.decode())


class TenantIsolationTests(StaffFixture):
    def test_staff_without_a_shop_is_not_given_someone_elses_shop(self):
        orphan = AdminUser.objects.create_user(username='yetim', password=GOOD_PASSWORD, role='waiter')
        request = RequestFactory().get('/seller/')
        request.user = orphan
        SellerTenantMiddleware(lambda r: None).process_request(request)
        self.assertIsNone(request.tenant_shop)
