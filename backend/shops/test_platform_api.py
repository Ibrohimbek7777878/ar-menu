"""Platforma API (TZ_MULTITENANT, Bosqich 2): mijozlar ro'yxati, subdomen tekshiruvi, yaratish, yangilash, egasi parolini tiklash.
Ruxsat (faqat super_admin), tenant hostida 404, tenant ma'lumoti ko'rinmasligi, idempotentlik, parol xavfsizligi, asosiy restoran o'zgarmasligi."""
import io
import json
from unittest import mock

from django.contrib.auth.hashers import check_password, identify_hasher
from django.core.cache import cache
from django.core.management import call_command
from django.db import connection
from django.test import Client, TestCase
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from notifications.admin_bot import default_restaurant_shop_id
from notifications.models import AppSetting
from orders.models import AuditLog
from shops.booking_config import DEFAULT_BOOKING
from shops.models import Shop
from shops.test_tenant_kit import PASSWORD, make_tenant, tenant_settings
from tables_restaurant.models import Hall, Table

BASE = '/api/platform/v1/tenants/'
PLATFORM = {'HTTP_HOST': 'platform.test'}


def create_body(**over):
    body = {'name': 'Bahor Kafe', 'subdomain': 'bahor', 'business_type': 'cafe', 'owner_username': 'bahor_ega'}
    body.update(over)
    return body


@tenant_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class PlatformBase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.A = make_tenant('alfa', 'ALFA')
        cls.B = make_tenant('bravo', 'BRAVO', business_type='banquet')
        cls.root = AdminUser.objects.create_user(
            username='platforma_admin', password=PASSWORD, role='super_admin', is_superuser=True, is_staff=True, is_approved=True)

    def setUp(self):
        cache.clear()
        self.admin = self.login(self.root)

    @staticmethod
    def login(user, **kw):
        c = Client(**kw)
        c.force_login(user)
        return c

    def post(self, body, client=None, **extra):
        return (client or self.admin).post(BASE, json.dumps(body), content_type='application/json', **{**PLATFORM, **extra})

    def patch(self, pk, body, client=None):
        return (client or self.admin).patch(f'{BASE}{pk}/', json.dumps(body), content_type='application/json', **PLATFORM)

    def get(self, path='', client=None, **extra):
        return (client or self.admin).get(BASE + path, **{**PLATFORM, **extra})


# ─── Ruxsat va host ──────────────────────────────────────────────────────────────────────────────────────────

class AccessTests(PlatformBase):

    URLS = [('get', BASE), ('post', BASE), ('get', BASE + 'check-subdomain/?q=abc'), ('get', BASE + '1/'),
            ('patch', BASE + '1/'), ('post', BASE + '1/reset-owner-password/')]

    def call(self, client, method, url, **extra):
        kwargs = {'content_type': 'application/json'} if method in ('post', 'patch') else {}
        data = json.dumps(create_body()) if method in ('post', 'patch') else None
        return getattr(client, method)(url, *([data] if data else []), **kwargs, **extra)

    def test_only_super_admin_gets_in(self):
        users = {'egasi': self.A.owner, 'menejer': self.A.manager, 'ofitsiant': self.A.waiter, 'oshpaz': self.A.kitchen}
        for label, user in users.items():
            c = self.login(user)
            for method, url in self.URLS:
                self.assertIn(self.call(c, method, url, **PLATFORM).status_code, (401, 403), (label, method, url))
        for method, url in self.URLS:
            self.assertIn(self.call(Client(), method, url, **PLATFORM).status_code, (401, 403), ('anonim', method, url))
        self.assertEqual(self.get().status_code, 200)

    def test_inactive_or_unapproved_super_admin_is_not_enough(self):
        ghost = AdminUser.objects.create_user(username='ghost', password=PASSWORD, role='super_admin', is_active=False)
        self.assertIn(self.get(client=self.login(ghost)).status_code, (401, 403))

    def test_whole_api_is_404_on_a_tenant_host_even_for_super_admin_and_anonymous(self):
        for client in (self.admin, Client()):
            for method, url in self.URLS:
                res = self.call(client, method, url, HTTP_HOST=self.A.host)
                self.assertEqual(res.status_code, 404, (method, url))
                self.assertNotIn('alfa', res.content.decode().lower().replace('alfa.platform.test', ''))

    def test_works_on_platform_hosts_and_on_hosts_without_a_tenant(self):
        for host in ('platform.test', 'www.platform.test', 'app.platform.test', 'testserver', 'localhost'):
            self.assertEqual(self.admin.get(BASE, HTTP_HOST=host).status_code, 200, host)

    def test_tokens_of_restaurant_staff_do_not_work(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.A.owner).access_token)
        res = Client().get(BASE, HTTP_AUTHORIZATION=f'Bearer {token}', **PLATFORM)
        self.assertIn(res.status_code, (401, 403))

    def test_csrf_is_enforced_for_session_super_admin(self):
        strict = self.login(self.root, enforce_csrf_checks=True)
        self.assertEqual(self.post(create_body(), client=strict).status_code, 403)
        self.assertEqual(strict.patch(f'{BASE}{self.A.shop.pk}/', '{"status": "suspended"}', content_type='application/json',
                                      **PLATFORM).status_code, 403)
        self.assertEqual(strict.post(f'{BASE}{self.A.shop.pk}/reset-owner-password/', **PLATFORM).status_code, 403)
        self.assertFalse(Shop.objects.filter(subdomain='bahor').exists())
        self.assertEqual(Shop.objects.get(pk=self.A.shop.pk).status, 'active')


# ─── Ro'yxat ─────────────────────────────────────────────────────────────────────────────────────────────────

class ListTests(PlatformBase):

    def test_shape_and_counts(self):
        body = self.get().json()
        self.assertEqual(body['count'], 2)
        by_sub = {row['subdomain']: row for row in body['results']}
        alfa = by_sub['alfa']
        self.assertEqual(set(alfa), {'id', 'name', 'subdomain', 'business_type', 'status', 'owner_username', 'created_at', 'tables',
                                     'products', 'url'})
        self.assertEqual((alfa['id'], alfa['name'], alfa['business_type'], alfa['status']), (self.A.shop.pk, 'ALFA Restoran', 'restaurant',
                                                                                              'active'))
        self.assertEqual((alfa['owner_username'], alfa['tables'], alfa['products'], alfa['url']), ('alfa_owner', 2, 2,
                                                                                                   'https://alfa.platform.test/'))
        self.assertEqual(by_sub['bravo']['business_type'], 'banquet')

    def test_no_tenant_data_leaks_only_numbers(self):
        text = self.get().content.decode()
        for secret in ('SECRET', 'SECRETDISH', 'SECRETGUEST', '+998901234567', 'pbkdf2', 'argon', 'password'):
            self.assertNotIn(secret, text, secret)

    def test_query_count_is_constant_and_small(self):
        def count():
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.get().status_code, 200)
            return len(ctx)

        small = count()
        for i in range(8):
            make_tenant(f'mijoz{i}x', f'M{i}')
        big = count()
        self.assertEqual(small, big)
        self.assertLessEqual(big, 6)            # sessiya + foydalanuvchi + (mavjud RBAC middleware: 1) + sanash + ro'yxat

    def test_search_filter_and_pagination(self):
        self.assertEqual([r['subdomain'] for r in self.get('?q=brav').json()['results']], ['bravo'])
        self.assertEqual(self.get('?q=alfa_owner').json()['count'], 1)
        Shop.objects.filter(pk=self.B.shop.pk).update(status='suspended')
        self.assertEqual([r['subdomain'] for r in self.get('?status=suspended').json()['results']], ['bravo'])
        self.assertEqual(self.get('?status=active').json()['count'], 1)
        page = self.get('?limit=1&offset=1').json()
        self.assertEqual((page['count'], len(page['results'])), (2, 1))
        self.assertEqual(len(self.get('?limit=zzz&offset=-4').json()['results']), 2)       # buzuq parametr 500 bermaydi

    def test_shops_without_a_subdomain_are_not_tenants(self):
        Shop.objects.create(name='Eski', slug='eski-do-kon', address='x', phone='1', latitude=1, longitude=1)
        self.assertEqual(self.get().json()['count'], 2)


# ─── Subdomen tekshiruvi ─────────────────────────────────────────────────────────────────────────────────────

class CheckSubdomainTests(PlatformBase):

    def check(self, q):
        return self.get(f'check-subdomain/?q={q}').json()

    def test_available(self):
        self.assertEqual(self.check('Yangi-Mijoz'), {'available': True, 'normalized': 'yangi-mijoz'})

    def test_taken_reserved_and_malformed(self):
        taken = self.check('ALFA')
        self.assertEqual((taken['available'], taken['normalized']), (False, 'alfa'))
        self.assertIn('band', taken['reason'])
        for word in ('admin', 'www', 'api', 'platform', 'media'):
            res = self.check(word)
            self.assertFalse(res['available'], word)
            self.assertIn('band so', res['reason'])
        for bad in ('ab', 'a_b', '-abc', 'abc-', 'x' * 41, 'ab--cd', 'a.b', 'xn--abc'):
            self.assertFalse(self.check(bad)['available'], bad)
        empty = self.check('')
        self.assertEqual((empty['available'], empty['normalized']), (False, ''))
        self.assertTrue(empty['reason'])


# ─── Yaratish ────────────────────────────────────────────────────────────────────────────────────────────────

class CreateTests(PlatformBase):

    def test_create_returns_everything_the_owner_needs_once(self):
        res = self.post(create_body(phone='+998 90 123 45 67'))
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        shop = Shop.objects.get(subdomain='bahor')
        self.assertEqual(body['id'], shop.pk)
        self.assertEqual((body['subdomain'], body['owner_username']), ('bahor', 'bahor_ega'))
        self.assertEqual(body['url'], 'https://bahor.platform.test/')
        self.assertEqual(body['login_url'], 'https://bahor.platform.test/admin/login/')
        self.assertGreaterEqual(len(body['generated_password']), 10)
        self.assertEqual(res['Cache-Control'], 'no-store')
        owner = AdminUser.objects.get(username='bahor_ega')
        self.assertEqual((owner.role, owner.is_approved, owner.is_active, owner.shop_id, owner.phone),
                         ('shop_owner', True, True, shop.pk, '+998 90 123 45 67'))
        self.assertEqual(shop.owner_id, owner.pk)
        self.assertEqual((shop.name, shop.business_type, shop.status, shop.phone), ('Bahor Kafe', 'cafe', 'active', '+998 90 123 45 67'))

    def test_initial_hall_tables_and_default_booking_settings(self):
        self.post(create_body())
        shop = Shop.objects.get(subdomain='bahor')
        self.assertEqual(Hall.objects.filter(shop=shop).count(), 1)
        self.assertEqual(sorted(Table.objects.filter(shop=shop).values_list('number', flat=True), key=int), [str(n) for n in range(1, 11)])
        self.assertEqual(shop.business_profile['booking'], DEFAULT_BOOKING)
        self.assertEqual(shop.business_profile['booking']['slots'][0]['key'], 'lunch')

    def test_generated_password_works_and_is_never_stored_or_logged(self):
        body = self.post(create_body()).json()
        password = body['generated_password']
        owner = AdminUser.objects.get(username='bahor_ega')
        self.assertNotEqual(owner.password, password)
        self.assertNotIn(password, owner.password)
        self.assertTrue(check_password(password, owner.password))
        identify_hasher(owner.password)                                  # xesh (ochiq matn emas): hasher aniqlanadi
        for entry in AuditLog.objects.all():
            blob = json.dumps([entry.old_value, entry.new_value, entry.metadata, entry.actor_name, entry.user_agent])
            self.assertNotIn(password, blob)
        entry = AuditLog.objects.get(action_type='tenant_created')
        self.assertEqual((entry.actor_id, entry.target_id, entry.new_value['subdomain']), (self.root.pk, body['id'], 'bahor'))
        self.assertNotIn('password', json.dumps(entry.new_value).lower())
        # parol bilan yangi tenant hostiga kirish mumkin
        c = Client()
        res = c.post('/admin/login/', {'username': 'bahor_ega', 'password': password}, HTTP_HOST='bahor.platform.test')
        self.assertEqual(res.status_code, 302, res.content[:200])
        self.assertEqual(int(c.session['_auth_user_id']), owner.pk)
        self.assertEqual(c.get('/api/restaurant/admin/v1/session/', HTTP_HOST='bahor.platform.test').json()['tenant']['name'], 'Bahor Kafe')

    def test_provided_strong_password_is_used_and_not_echoed(self):
        res = self.post(create_body(owner_password='Kuchli-Parol-2026!'))
        self.assertEqual(res.status_code, 201)
        self.assertNotIn('generated_password', res.json())
        self.assertNotIn('Kuchli-Parol-2026', res.content.decode())
        self.assertTrue(AdminUser.objects.get(username='bahor_ega').check_password('Kuchli-Parol-2026!'))

    def test_weak_passwords_are_rejected_and_nothing_is_created(self):
        for weak in ('12345678', 'password', 'qwerty123', 'short', 'bahor_ega'):
            res = self.post(create_body(owner_password=weak))
            self.assertEqual((res.status_code, res.json().get('field')), (400, 'owner_password'), weak)
        self.assertFalse(Shop.objects.filter(subdomain='bahor').exists())
        self.assertFalse(AdminUser.objects.filter(username='bahor_ega').exists())

    def test_invalid_input_returns_400_with_the_field(self):
        cases = [
            ({'name': ''}, 'name'), ({'name': 'x' * 101}, 'name'), ({'name': None}, 'name'), ({'name': ['x']}, 'name'),
            ({'subdomain': ''}, 'subdomain'), ({'subdomain': 'admin'}, 'subdomain'), ({'subdomain': 'a'}, 'subdomain'),
            ({'subdomain': 'yo-q_belgi'}, 'subdomain'), ({'subdomain': 'alfa'}, 'subdomain'), ({'subdomain': 'ALFA'}, 'subdomain'),
            ({'business_type': 'hotel'}, 'business_type'), ({'owner_username': ''}, 'username'),
            ({'owner_username': 'a b'}, 'username'), ({'owner_username': 'x'}, 'username'), ({'owner_username': 'alfa_owner'}, 'username'),
            ({'owner_username': 'ALFA_OWNER'}, 'username'), ({'phone': 'abc'}, 'phone'), ({'phone': '<script>'}, 'phone'),
        ]
        for over, field in cases:
            res = self.post(create_body(**over))
            self.assertEqual(res.status_code, 400, over)
            self.assertEqual(res.json().get('field'), field, over)
        self.assertFalse(Shop.objects.filter(name='Bahor Kafe').exists())
        self.assertEqual(Shop.objects.count(), 2)

    def test_duplicate_requests_are_safe_second_one_is_a_clean_400(self):
        first = self.post(create_body())
        second = self.post(create_body())
        self.assertEqual((first.status_code, second.status_code), (201, 400))
        self.assertEqual(second.json()['field'], 'subdomain')
        self.assertEqual(Shop.objects.filter(subdomain='bahor').count(), 1)
        self.assertEqual(AdminUser.objects.filter(username='bahor_ega').count(), 1)
        self.assertEqual(Table.objects.filter(shop__subdomain='bahor').count(), 10)
        # boshqa subdomen, xuddi shu login: mavjud akkaunt bosib olinmaydi
        before = AdminUser.objects.get(username='bahor_ega')
        third = self.post(create_body(subdomain='boshqa', name='Boshqa'))
        self.assertEqual((third.status_code, third.json()['field']), (400, 'username'))
        after = AdminUser.objects.get(username='bahor_ega')
        self.assertEqual((after.password, after.shop_id, after.role), (before.password, before.shop_id, before.role))
        self.assertFalse(Shop.objects.filter(subdomain='boshqa').exists())

    def test_existing_owner_account_is_never_hijacked_even_with_other_case(self):
        before = AdminUser.objects.get(username='alfa_owner')
        res = self.post(create_body(owner_username='Alfa_Owner', owner_password='Yangi-Parol-2026!'))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AdminUser.objects.get(pk=before.pk).password, before.password)

    def test_same_name_gets_a_unique_slug_and_does_not_touch_the_other_shop(self):
        Shop.objects.filter(pk=self.A.shop.pk).update(name='Bahor Kafe', slug='bahor-kafe')
        before = Shop.objects.get(pk=self.A.shop.pk)
        res = self.post(create_body())
        self.assertEqual(res.status_code, 201)
        new = Shop.objects.get(subdomain='bahor')
        self.assertNotEqual(new.pk, before.pk)
        self.assertEqual(new.slug, 'bahor-kafe-2')
        self.assertEqual(Shop.objects.get(pk=before.pk).owner_id, before.owner_id)

    def test_new_tenant_never_becomes_the_default_restaurant(self):
        AppSetting.objects.update_or_create(key='restaurant_default_shop', defaults={'value': 'alfa', 'category': 'restaurant'})
        with mock.patch('backend.runtime_cache._ttl', return_value=0.0):
            before = default_restaurant_shop_id()
        self.post(create_body())
        self.assertEqual(AppSetting.objects.get(key='restaurant_default_shop').value, 'alfa')
        with mock.patch('backend.runtime_cache._ttl', return_value=0.0):
            self.assertEqual(default_restaurant_shop_id(), before)
        AppSetting.objects.filter(key='restaurant_default_shop').delete()
        self.post(create_body(name='Ikkinchi', subdomain='ikkinchi', owner_username='ikkinchi_ega'))
        self.assertFalse(AppSetting.objects.filter(key='restaurant_default_shop').exists())          # API hech qachon yozmaydi

    def test_failure_in_the_middle_leaves_nothing_behind(self):
        with mock.patch('tables_restaurant.provisioning.Table.objects.bulk_create', side_effect=RuntimeError('disk')):
            with self.assertRaises(RuntimeError):
                self.post(create_body())
        self.assertFalse(Shop.objects.filter(subdomain='bahor').exists())
        self.assertFalse(AdminUser.objects.filter(username='bahor_ega').exists())
        self.assertFalse(Hall.objects.filter(shop__subdomain='bahor').exists())
        self.assertEqual(self.post(create_body()).status_code, 201)           # keyin qayta urinish ishlaydi

    def test_unique_violation_race_becomes_a_clean_400(self):
        from django.db import IntegrityError
        with mock.patch('tables_restaurant.provisioning.Shop.objects.create', side_effect=IntegrityError('duplicate key')):
            res = self.post(create_body())
        self.assertEqual(res.status_code, 400)
        self.assertFalse(AdminUser.objects.filter(username='bahor_ega').exists())

    def test_creation_is_rate_limited_per_hour(self):
        statuses = [self.post(create_body(name='')).status_code for _ in range(31)]
        self.assertEqual(statuses[:30], [400] * 30)
        self.assertEqual(statuses[30], 429)

    def test_new_tenant_site_is_reachable_and_isolated(self):
        self.post(create_body())
        res = Client().get('/menu/', HTTP_HOST='bahor.platform.test')
        self.assertEqual(res.status_code, 200)
        body = res.content.decode()
        self.assertIn('Bahor Kafe', body)
        self.assertNotIn('ALFA', body)
        self.assertNotIn('BRAVO', body)

    def test_command_and_api_share_the_service_and_the_command_still_sets_the_default(self):
        AppSetting.objects.filter(key='restaurant_default_shop').delete()
        out = io.StringIO()
        call_command('create_restaurant', name='Buyruq Resto', slug='buyruq', owner='buyruq_ega', password='Buyruq-Parol-9!', tables=3,
                     subdomain='buyruq', stdout=out)
        self.assertEqual(AppSetting.objects.get(key='restaurant_default_shop').value, 'buyruq')
        call_command('create_restaurant', name='Buyruq Resto', slug='buyruq', owner='buyruq_ega', tables=5, no_default=True,
                     stdout=io.StringIO())                                     # qayta ishga tushirish: yangisi yaratilmaydi, stollar to'ldiriladi
        self.assertEqual(Shop.objects.filter(slug='buyruq').count(), 1)
        self.assertEqual(Table.objects.filter(shop__slug='buyruq').count(), 5)
        self.assertIn('Yaratildi', out.getvalue())


# ─── Yangilash va egasi paroli ───────────────────────────────────────────────────────────────────────────────

class UpdateTests(PlatformBase):

    def test_patch_name_type_and_status(self):
        res = self.patch(self.A.shop.pk, {'name': 'Alfa Yangi', 'business_type': 'cafe', 'status': 'suspended'})
        self.assertEqual(res.status_code, 200, res.content)
        row = res.json()
        self.assertEqual((row['name'], row['business_type'], row['status'], row['subdomain']), ('Alfa Yangi', 'cafe', 'suspended', 'alfa'))
        shop = Shop.objects.get(pk=self.A.shop.pk)
        self.assertEqual((shop.name, shop.business_type, shop.status), ('Alfa Yangi', 'cafe', 'suspended'))
        self.assertEqual(AuditLog.objects.filter(action_type='tenant_updated').count(), 1)

    def test_suspended_tenant_site_is_503_and_active_again_is_200(self):
        self.patch(self.A.shop.pk, {'status': 'suspended'})
        self.assertEqual(Client().get('/menu/', HTTP_HOST=self.A.host).status_code, 503)
        self.assertEqual(Client().get('/menu/', HTTP_HOST=self.B.host).status_code, 200)      # boshqa mijozga ta'sir yo'q
        self.assertTrue(Shop.objects.filter(pk=self.A.shop.pk).exists())                      # hech narsa o'chirilmaydi
        self.patch(self.A.shop.pk, {'status': 'active'})
        self.assertEqual(Client().get('/menu/', HTTP_HOST=self.A.host).status_code, 200)

    def test_subdomain_never_changes(self):
        res = self.patch(self.A.shop.pk, {'subdomain': 'yangi-nom'})
        self.assertEqual((res.status_code, res.json()['field']), (400, 'subdomain'))
        self.assertEqual(Shop.objects.get(pk=self.A.shop.pk).subdomain, 'alfa')
        self.assertEqual(self.patch(self.A.shop.pk, {'subdomain': 'ALFA', 'name': 'Alfa 2'}).status_code, 200)    # o'zgarmasa xato emas

    def test_invalid_values(self):
        for body, field in (({'status': 'deleted'}, 'status'), ({'business_type': 'hotel'}, 'business_type'), ({'name': ''}, 'name'),
                            ({'name': 'x' * 101}, 'name'), ({'owner': 'x'}, 'owner'), ({'status': ['active']}, 'status')):
            res = self.patch(self.A.shop.pk, body)
            self.assertEqual((res.status_code, res.json()['field']), (400, field), body)
        shop = Shop.objects.get(pk=self.A.shop.pk)
        self.assertEqual((shop.name, shop.status, shop.business_type), ('ALFA Restoran', 'active', 'restaurant'))

    def test_unknown_tenant_is_404(self):
        self.assertEqual(self.patch(999999, {'name': 'x'}).status_code, 404)
        legacy = Shop.objects.create(name='Eski', slug='eski-2', address='x', phone='1', latitude=1, longitude=1)
        self.assertEqual(self.patch(legacy.pk, {'name': 'x'}).status_code, 404)             # subdomensiz do'kon — mijoz emas
        self.assertEqual(self.get(f'{legacy.pk}/').status_code, 404)

    def test_detail(self):
        row = self.get(f'{self.B.shop.pk}/').json()
        self.assertEqual((row['subdomain'], row['tables'], row['products']), ('bravo', 2, 2))


class ResetOwnerPasswordTests(PlatformBase):

    def reset(self, pk, client=None):
        return (client or self.admin).post(f'{BASE}{pk}/reset-owner-password/', **PLATFORM)

    def test_reset_gives_a_new_one_time_password_and_ends_sessions(self):
        owner_client = self.login(self.A.owner)
        self.assertEqual(owner_client.get('/api/restaurant/admin/v1/session/', HTTP_HOST=self.A.host).status_code, 200)
        res = self.reset(self.A.shop.pk)
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body['owner_username'], 'alfa_owner')
        self.assertEqual(res['Cache-Control'], 'no-store')
        owner = AdminUser.objects.get(pk=self.A.owner.pk)
        self.assertTrue(owner.check_password(body['generated_password']))
        self.assertFalse(owner.check_password(PASSWORD))
        self.assertNotIn(body['generated_password'], owner.password)
        self.assertEqual(owner_client.get('/api/restaurant/admin/v1/session/', HTTP_HOST=self.A.host).status_code, 401)     # eski sessiya tugadi
        for entry in AuditLog.objects.all():
            self.assertNotIn(body['generated_password'], json.dumps([entry.old_value, entry.new_value, entry.metadata]))
        self.assertEqual(AuditLog.objects.filter(action_type='tenant_owner_pw_reset').count(), 1)
        c = Client()
        login = c.post('/admin/login/', {'username': 'alfa_owner', 'password': body['generated_password']}, HTTP_HOST=self.A.host)
        self.assertEqual(login.status_code, 302)

    def test_other_tenants_and_staff_are_untouched(self):
        before = {u.username: u.password for u in AdminUser.objects.exclude(pk=self.A.owner.pk)}
        self.reset(self.A.shop.pk)
        after = {u.username: u.password for u in AdminUser.objects.exclude(pk=self.A.owner.pk)}
        self.assertEqual(before, after)

    def test_a_platform_admin_password_cannot_be_reset_this_way(self):
        Shop.objects.filter(pk=self.A.shop.pk).update(owner=self.root)
        before = AdminUser.objects.get(pk=self.root.pk).password
        res = self.reset(self.A.shop.pk)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AdminUser.objects.get(pk=self.root.pk).password, before)

    def test_without_an_owner_it_is_404(self):
        Shop.objects.filter(pk=self.A.shop.pk).update(owner=None)
        AdminUser.objects.filter(shop=self.A.shop, role='shop_owner').update(role='waiter')
        self.assertEqual(self.reset(self.A.shop.pk).status_code, 404)

    def test_unknown_tenant_and_rate_limit(self):
        self.assertEqual(self.reset(999999).status_code, 404)
        cache.clear()
        statuses = [self.reset(self.B.shop.pk).status_code for _ in range(11)]
        self.assertEqual(statuses[:10], [200] * 10)
        self.assertEqual(statuses[10], 429)


# ─── Admin sessiyasi va /ra/ ─────────────────────────────────────────────────────────────────────────────────

class SessionFlagsTests(PlatformBase):
    SESSION = '/api/restaurant/admin/v1/session/'

    def test_super_admin_on_the_platform_host(self):
        body = self.admin.get(self.SESSION, **PLATFORM).json()
        self.assertTrue(body['is_platform_admin'])
        self.assertTrue(body['platform_host'])
        self.assertTrue(body['tenancy_enabled'])

    def test_super_admin_on_a_tenant_host_is_not_on_the_platform_host(self):
        body = self.admin.get(self.SESSION, HTTP_HOST=self.A.host).json()
        self.assertTrue(body['is_platform_admin'])
        self.assertFalse(body['platform_host'])
        self.assertEqual(body['tenant']['slug'], 'alfa')

    def test_restaurant_owner_is_never_a_platform_admin(self):
        body = self.login(self.A.owner).get(self.SESSION, HTTP_HOST=self.A.host).json()
        self.assertFalse(body['is_platform_admin'])
        self.assertFalse(body['platform_host'])
        self.assertEqual(body['tenant']['brand']['name'], 'ALFA Restoran')              # admin qobig'i uchun ochiq brend
        self.assertNotIn('adjusted', body['tenant']['brand'])

    def test_spa_shell_opens_for_super_admin_on_the_platform_host_but_not_for_staff(self):
        res = self.admin.get('/ra/', **PLATFORM)
        self.assertEqual(res.status_code, 200)
        self.assertIn('id="root"', res.content.decode())
        res = self.admin.get('/ra/mijozlar', **PLATFORM)
        self.assertEqual(res.status_code, 200)
        owner_on_platform = self.login(self.A.owner).get('/ra/', **PLATFORM)
        self.assertEqual(owner_on_platform.status_code, 302)
        self.assertNotIn('/ra/', owner_on_platform['Location'].split('?')[0])
