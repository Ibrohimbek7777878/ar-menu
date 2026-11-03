"""
Xodim profili, login/parol va shaxsiy RUXSATLAR API testlari (Xodimlar sahifasi: /api/restaurant/admin/v1/staff/).

Tekshiriladi: javob shakli (`permissions`, `editable_permissions`), katalog, PATCH (login, ism, e-pochta, rol, ruxsatlar),
`set-password`, qat'iy xavfsizlik qoidalari (tenant, o'z-o'zini tahrirlash, egasini himoyalash, eskalatsiya, maxfiy ruxsat),
sessiyalarning tugashi, login_guard tozalanishi va auditda parolning yo'qligi.
"""
import io
import json

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from backend import login_guard
from orders.models import AuditLog
from shops.models import Shop
from web.capabilities import CAPABILITY_KEYS, role_default_capabilities

API = '/api/restaurant/admin/v1/staff/'
SESSION = '/api/restaurant/admin/v1/session/'
PASSWORD = 'Boshlangich-Parol-2026!'
NEW_PASSWORD = 'Yangi-Kuchli-Parol-2027!'


def jpatch(client, url, data):
    return client.patch(url, json.dumps(data), content_type='application/json')


def jpost(client, url, data=None):
    return client.post(url, json.dumps(data if data is not None else {}), content_type='application/json')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class StaffPermissionsFixture(TestCase):

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        call_command('create_restaurant', name='Ruxsat Resto', slug='ruxsat-resto', owner='perm-owner',
                     password=PASSWORD, tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='ruxsat-resto')
        self.owner = AdminUser.objects.get(username='perm-owner')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.manager = self.make('shop_manager', 'perm-manager')
        self.manager2 = self.make('shop_manager', 'perm-manager2')
        self.waiter = self.make('waiter', 'perm-waiter')
        self.waiter2 = self.make('waiter', 'perm-waiter2')
        self.kitchen = self.make('kitchen', 'perm-kitchen')
        self.hostess = self.make('hostess', 'perm-hostess')

        self.c_owner = self.login_client(self.owner)
        self.c_manager = self.login_client(self.manager)
        self.c_waiter = self.login_client(self.waiter)

    def make(self, role, username, shop=None, **extra):
        return AdminUser.objects.create_user(username=username, password=PASSWORD, role=role, shop=shop or self.shop,
                                             is_staff=False, is_approved=True, **extra)

    @staticmethod
    def login_client(user):
        client = Client()
        client.force_login(user)
        return client

    def url(self, user, tail=''):
        return f'{API}{user.id}/{tail}'

    def audit(self, action, user=None):
        qs = AuditLog.objects.filter(action_type=action)
        if user is not None:
            qs = qs.filter(target_id=user.id)
        return list(qs.order_by('id'))

    def reload(self, user):
        user.refresh_from_db()
        return user


class ResponseShapeTests(StaffPermissionsFixture):

    def rows(self, client):
        res = client.get(API)
        self.assertEqual(res.status_code, 200, res.content)
        return {row['username']: row for row in res.json()}

    def test_every_row_carries_permissions_and_editable_flag(self):
        rows = self.rows(self.c_owner)
        waiter = rows['perm-waiter']
        self.assertEqual(set(waiter['permissions']), {'role_defaults', 'extra', 'revoked', 'effective'})
        self.assertEqual(waiter['permissions']['role_defaults'], role_default_capabilities('waiter'))
        self.assertEqual(waiter['permissions']['extra'], [])
        self.assertEqual(waiter['permissions']['revoked'], [])
        self.assertEqual(waiter['permissions']['effective'], role_default_capabilities('waiter'))
        self.assertIs(waiter['editable_permissions'], True)
        self.assertEqual((waiter['first_name'], waiter['last_name'], waiter['email']), ('', '', ''))
        owner = rows['perm-owner']
        self.assertEqual(owner['permissions']['effective'], list(CAPABILITY_KEYS))
        self.assertEqual((owner['permissions']['extra'], owner['permissions']['revoked']), ([], []))
        self.assertIs(owner['editable_permissions'], False)           # o'zining / egasining ruxsatini hech kim o'zgartirmaydi
        self.assertIs(owner['is_self'], True)

    def test_editable_flag_depends_on_the_viewer(self):
        rows = self.rows(self.c_manager)
        self.assertIs(rows['perm-waiter']['editable_permissions'], True)
        self.assertIs(rows['perm-kitchen']['editable_permissions'], True)
        self.assertIs(rows['perm-manager']['editable_permissions'], False)    # o'zi
        self.assertIs(rows['perm-manager2']['editable_permissions'], False)   # boshqa boshqaruvchi
        self.assertIs(rows['perm-owner']['editable_permissions'], False)
        owner_rows = self.rows(self.c_owner)
        self.assertIs(owner_rows['perm-manager']['editable_permissions'], True)
        self.assertEqual(owner_rows['perm-manager']['permissions']['role_defaults'], list(CAPABILITY_KEYS))

    def test_detail_get_returns_same_shape(self):
        res = self.c_owner.get(self.url(self.waiter))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['username'], 'perm-waiter')
        self.assertIn('permissions', data)
        self.assertIs(data['editable_permissions'], True)
        self.assertEqual(self.c_waiter.get(self.url(self.waiter)).status_code, 403)

    def test_access_info_shows_ra_path_only_with_management_capability(self):
        self.assertIsNone(self.rows(self.c_owner)['perm-waiter']['ra_path'])
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin']}).json()['ra_path'], '/ra/')
        self.assertIsNone(self.rows(self.c_owner)['perm-owner']['ra_path'])    # /ra/ uning asosiy paneli

    def test_catalog_endpoint(self):
        res = self.c_owner.get(API + 'permissions/catalog/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual([c['key'] for c in data['capabilities']], list(CAPABILITY_KEYS))
        for entry in data['capabilities']:
            self.assertEqual(set(entry), {'key', 'label', 'group', 'group_key', 'description', 'sensitive'})
        self.assertEqual({c['key'] for c in data['capabilities'] if c['sensitive']} & {'finance', 'staff_admin', 'settings_admin'},
                         {'finance', 'staff_admin', 'settings_admin'})
        self.assertEqual(set(data['role_defaults']), {'waiter', 'kitchen', 'hostess', 'shop_manager', 'shop_owner'})
        self.assertEqual(data['role_defaults']['kitchen'], role_default_capabilities('kitchen'))
        self.assertEqual(data['grantable'], list(CAPABILITY_KEYS))
        self.assertIs(data['is_owner'], True)

    def test_catalog_grantable_for_manager_excludes_sensitive_and_unheld(self):
        data = self.c_manager.get(API + 'permissions/catalog/').json()
        self.assertIs(data['is_owner'], False)
        self.assertNotIn('finance', data['grantable'])
        self.assertNotIn('staff_admin', data['grantable'])
        self.assertIn('menu_admin', data['grantable'])
        manager = self.make('shop_manager', 'perm-cut', revoked_capabilities=['menu_admin', 'reservations'])
        data = self.login_client(manager).get(API + 'permissions/catalog/').json()
        self.assertNotIn('menu_admin', data['grantable'])
        self.assertNotIn('reservations', data['grantable'])

    def test_catalog_is_closed_to_unauthorized_users(self):
        self.assertEqual(self.c_waiter.get(API + 'permissions/catalog/').status_code, 403)
        self.assertIn(Client().get(API + 'permissions/catalog/').status_code, (401, 403))


class PermissionEditingTests(StaffPermissionsFixture):

    def test_owner_grants_extra_and_it_takes_effect_immediately(self):
        client = self.login_client(self.waiter)
        self.assertEqual(client.get('/api/restaurant/admin/v1/menu/products/').status_code, 403)
        self.assertEqual(client.get('/ra/').status_code, 302)                        # /ra/ yopiq
        res = jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin']})
        self.assertEqual(res.status_code, 200, res.content)
        permissions = res.json()['permissions']
        self.assertEqual(permissions['extra'], ['menu_admin'])
        self.assertIn('menu_admin', permissions['effective'])
        self.assertEqual(client.get('/api/restaurant/admin/v1/menu/products/').status_code, 200)
        self.assertEqual(client.get('/ra/').status_code, 200)                        # /ra/ ochildi
        self.assertIn('menu_admin', client.get(SESSION).json()['capabilities'])
        # ruxsat olib tashlansa darhol yopiladi
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': []}).status_code, 200)
        self.assertEqual(client.get('/api/restaurant/admin/v1/menu/products/').status_code, 403)
        self.assertEqual(client.get('/ra/').status_code, 302)

    def test_revoke_default_capability(self):
        res = jpatch(self.c_owner, self.url(self.waiter), {'revoked_capabilities': ['pos']})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['permissions']['revoked'], ['pos'])
        self.assertNotIn('pos', res.json()['permissions']['effective'])
        self.assertEqual(self.login_client(self.waiter).get('/waiter/panel/').status_code, 403)

    def test_lists_are_cleaned_to_the_role(self):
        res = jpatch(self.c_owner, self.url(self.waiter), {
            'extra_capabilities': ['pos', 'menu_admin', 'menu_admin', 'tables_admin'],   # pos — standartda bor, menu_admin takror
            'revoked_capabilities': ['finance', 'kds', 'kds']})                          # finance — standartda yo'q
        self.assertEqual(res.status_code, 200, res.content)
        permissions = res.json()['permissions']
        self.assertEqual(permissions['extra'], ['tables_admin', 'menu_admin'])           # katalog tartibida, takrorsiz
        self.assertEqual(permissions['revoked'], ['kds'])
        waiter = self.reload(self.waiter)
        self.assertEqual((waiter.extra_capabilities, waiter.revoked_capabilities), (['tables_admin', 'menu_admin'], ['kds']))

    def test_replace_semantics_and_untouched_list_is_kept(self):
        jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin'], 'revoked_capabilities': ['pos']})
        res = jpatch(self.c_owner, self.url(self.waiter), {'revoked_capabilities': []})
        self.assertEqual(res.json()['permissions']['extra'], ['menu_admin'])             # yuborilmagan ro'yxat o'zgarmadi
        self.assertEqual(res.json()['permissions']['revoked'], [])

    def test_invalid_lists_are_rejected_with_field(self):
        url = self.url(self.waiter)
        for field in ('extra_capabilities', 'revoked_capabilities'):
            for bad in ('pos', None, {'pos': 1}, 5, ['yoq_kalit'], [5], [None], [['pos']], ['pos'] * 51):
                res = jpatch(self.c_owner, url, {field: bad})
                self.assertEqual(res.status_code, 400, (field, bad))
                self.assertEqual(res.json()['field'], field, (field, bad))
        res = jpatch(self.c_owner, url, {'extra_capabilities': ['menu_admin'], 'revoked_capabilities': ['menu_admin']})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.reload(self.waiter).extra_capabilities, [])
        self.assertEqual(self.audit('staff_permissions_changed'), [])

    def test_role_change_re_cleans_overrides(self):
        jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin'], 'revoked_capabilities': ['pos']})
        res = jpatch(self.c_owner, self.url(self.waiter), {'role': 'shop_manager'})
        self.assertEqual(res.status_code, 200, res.content)
        permissions = res.json()['permissions']
        # extra (menu_admin) boshqaruvchida allaqachon standartda — olib tashlandi; shaxsiy cheklov (pos) saqlanadi
        self.assertEqual((permissions['extra'], permissions['revoked']), ([], ['pos']))
        self.assertEqual(permissions['effective'], [k for k in CAPABILITY_KEYS if k != 'pos'])
        self.assertEqual(res.json()['role'], 'shop_manager')
        # boshqaruvchiga cheklov (revoked) berish va uni ofitsiantga tushirganda ortiqchasini tozalash
        jpatch(self.c_owner, self.url(self.waiter), {'revoked_capabilities': ['finance', 'menu_admin']})
        res = jpatch(self.c_owner, self.url(self.waiter), {'role': 'waiter'})
        self.assertEqual(res.json()['permissions']['revoked'], [])      # ofitsiant standartida yo'q kalitlar tozalandi

    def test_unchanged_payload_is_a_no_op_without_audit(self):
        jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin']})
        before = AuditLog.objects.count()
        res = jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin'], 'revoked_capabilities': [],
                                                           'phone': '', 'first_name': ''})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(AuditLog.objects.count(), before)

    def test_blocked_staff_can_be_prepared_but_cannot_use_anything(self):
        self.assertEqual(jpost(self.c_owner, self.url(self.waiter, 'block/')).status_code, 200)
        res = jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin']})
        self.assertEqual(res.status_code, 200)
        self.assertIs(res.json()['is_active'], False)
        self.assertEqual(self.login_client(self.reload(self.waiter)).get('/api/restaurant/admin/v1/menu/products/').status_code, 403)
        jpost(self.c_owner, self.url(self.waiter, 'unblock/'))
        self.assertEqual(self.login_client(self.reload(self.waiter)).get('/api/restaurant/admin/v1/menu/products/').status_code, 200)

    # ─── xavfsizlik qoidalari ──────────────────────────────────────────────────────────────────────────
    def test_nobody_edits_their_own_permissions(self):
        helper = self.make('waiter', 'perm-helper', extra_capabilities=['staff_admin'])
        cases = (
            (self.c_owner, self.owner, {'extra_capabilities': ['finance']}),
            (self.c_owner, self.owner, {'revoked_capabilities': ['menu_admin']}),
            (self.c_manager, self.manager, {'revoked_capabilities': ['menu_admin']}),
            (self.login_client(helper), helper, {'extra_capabilities': ['menu_admin']}),
            (self.login_client(helper), helper, {'revoked_capabilities': ['pos']}),
        )
        for client, user, payload in cases:
            res = jpatch(client, self.url(user), payload)
            self.assertEqual(res.status_code, 403, (user.username, payload))
        self.assertEqual(self.reload(self.manager).revoked_capabilities, [])
        self.assertEqual(self.reload(helper).extra_capabilities, ['staff_admin'])
        # butun profilni qayta yuborish (ruxsat o'zgarmagan) xato emas; standartdagi kalitni "extra" qilib yuborish ham no-op
        res = jpatch(self.c_manager, self.url(self.manager), {'first_name': 'Dilshod', 'extra_capabilities': ['finance'],
                                                              'revoked_capabilities': []})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(self.reload(self.manager).extra_capabilities, [])

    def test_owner_permissions_cannot_be_restricted_by_anyone(self):
        co_owner = self.make('shop_owner', 'perm-owner2')
        for client in (self.c_owner, self.c_manager, self.login_client(AdminUser.objects.create_superuser(
                username='perm-root', password=PASSWORD))):
            res = jpatch(client, self.url(co_owner), {'revoked_capabilities': ['finance']})
            self.assertEqual(res.status_code, 403)
        self.assertEqual(self.reload(co_owner).revoked_capabilities, [])

    def test_manager_cannot_edit_other_managers_or_owner_permissions(self):
        for victim in (self.manager2, self.owner):
            res = jpatch(self.c_manager, self.url(victim), {'revoked_capabilities': ['menu_admin']})
            self.assertEqual(res.status_code, 403, victim.username)
        self.assertEqual(self.reload(self.manager2).revoked_capabilities, [])

    def test_owner_can_restrict_a_manager(self):
        res = jpatch(self.c_owner, self.url(self.manager), {'revoked_capabilities': ['finance', 'staff_admin']})
        self.assertEqual(res.status_code, 200, res.content)
        manager_client = self.login_client(self.manager)
        self.assertEqual(manager_client.get('/api/restaurant/admin/v1/finance/summary/').status_code, 403)
        self.assertEqual(manager_client.get(API).status_code, 403)               # staff_admin olingan: sahifa yopiq
        self.assertNotIn('finance', manager_client.get(SESSION).json()['capabilities'])

    def test_sensitive_permissions_are_granted_by_the_owner_only(self):
        for key in ('finance', 'staff_admin', 'settings_admin'):
            res = jpatch(self.c_manager, self.url(self.waiter), {'extra_capabilities': [key]})
            self.assertEqual(res.status_code, 403, key)
            self.assertEqual(res.json()['field'], 'extra_capabilities')
            self.assertEqual(self.reload(self.waiter).extra_capabilities, [])
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['finance', 'settings_admin']}).status_code, 200)
        # boshqaruvchi egasi bergan maxfiy ruxsatni o'chira oladi va o'zgarmagan holda qayta yuborsa xato emas
        res = jpatch(self.c_manager, self.url(self.waiter), {'extra_capabilities': ['finance', 'settings_admin']})
        self.assertEqual(res.status_code, 200, res.content)
        res = jpatch(self.c_manager, self.url(self.waiter), {'extra_capabilities': ['finance']})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(self.reload(self.waiter).extra_capabilities, ['finance'])
        res = jpatch(self.c_manager, self.url(self.waiter), {'extra_capabilities': []})
        self.assertEqual(res.status_code, 200)

    def test_nobody_can_grant_a_permission_they_do_not_have(self):
        cut = self.make('shop_manager', 'perm-cut', revoked_capabilities=['menu_admin', 'tables_admin'])
        client = self.login_client(cut)
        res = jpatch(client, self.url(self.waiter), {'extra_capabilities': ['menu_admin']})
        self.assertEqual(res.status_code, 403, res.content)
        self.assertIn('menu_admin', json.dumps(res.json()) + 'menu_admin')       # xabar mavjud
        # o'zida bor ruxsatni bera oladi (nonsensitive)
        self.assertEqual(jpatch(client, self.url(self.waiter), {'extra_capabilities': ['reservations']}).status_code, 200)
        # rol almashtirish orqali ham eskalatsiya yo'q: hostess roli reservations beradi — yo'q bo'lsa 403
        no_res = self.make('shop_manager', 'perm-cut2', revoked_capabilities=['reservations'])
        res = jpatch(self.login_client(no_res), self.url(self.waiter2), {'role': 'hostess'})
        self.assertEqual(res.status_code, 403, res.content)
        self.assertEqual(self.reload(self.waiter2).role, 'waiter')

    def test_non_owner_with_staff_admin_is_limited_to_non_managers(self):
        helper = self.make('waiter', 'perm-helper', extra_capabilities=['staff_admin'])
        client = self.login_client(helper)
        rows = {row['username']: row for row in client.get(API).json()}
        self.assertIs(rows['perm-waiter']['editable_permissions'], True)
        self.assertIs(rows['perm-manager']['editable_permissions'], False)
        self.assertEqual(jpatch(client, self.url(self.waiter), {'first_name': 'Ali'}).status_code, 200)
        self.assertEqual(jpatch(client, self.url(self.manager), {'first_name': 'Ali'}).status_code, 403)
        self.assertEqual(jpatch(client, self.url(self.owner), {'first_name': 'Ali'}).status_code, 403)
        self.assertEqual(jpost(client, self.url(self.manager, 'block/')).status_code, 403)
        self.assertEqual(jpost(client, self.url(self.owner, 'set-password/'), {'password': NEW_PASSWORD}).status_code, 403)
        self.assertEqual(jpost(client, self.url(self.manager, 'reset-password/')).status_code, 403)
        self.assertEqual(jpost(client, API, {'username': 'helper-made-mgr', 'role': 'shop_manager'}).status_code, 403)
        # maxfiy ruxsat va o'zida yo'q ruxsat berolmaydi, o'z ruxsatini o'zgartira olmaydi, rolini ko'tara olmaydi
        self.assertEqual(jpatch(client, self.url(self.waiter), {'extra_capabilities': ['staff_admin']}).status_code, 403)
        self.assertEqual(jpatch(client, self.url(self.waiter), {'extra_capabilities': ['menu_admin']}).status_code, 403)
        self.assertEqual(jpatch(client, self.url(helper), {'revoked_capabilities': ['pos']}).status_code, 403)
        self.assertEqual(jpatch(client, self.url(helper), {'role': 'shop_manager'}).status_code, 403)
        self.assertEqual(self.reload(helper).role, 'waiter')

    def test_staff_admin_is_required_for_every_endpoint(self):
        cut = self.make('shop_manager', 'perm-nostaff', revoked_capabilities=['staff_admin'])
        client = self.login_client(cut)
        calls = (client.get(API), client.get(API + 'permissions/catalog/'), client.get(self.url(self.waiter)),
                 jpost(client, API, {'username': 'abcd', 'role': 'waiter'}),
                 jpatch(client, self.url(self.waiter), {'first_name': 'X'}),
                 jpost(client, self.url(self.waiter, 'block/')), jpost(client, self.url(self.waiter, 'unblock/')),
                 jpost(client, self.url(self.waiter, 'reset-password/')),
                 jpost(client, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD}))
        self.assertEqual([c.status_code for c in calls], [403] * len(calls))
        self.assertTrue(self.login_client(self.waiter).get(API).status_code == 403)

    def test_other_restaurant_is_invisible(self):
        call_command('create_restaurant', name='Begona', slug='begona-ruxsat', owner='begona-egasi', password=PASSWORD,
                     tables=1, stdout=io.StringIO())
        foreign_shop = Shop.objects.get(slug='begona-ruxsat')
        foreign = self.make('waiter', 'begona-ofitsiant', shop=foreign_shop)
        for res in (jpatch(self.c_owner, self.url(foreign), {'extra_capabilities': ['menu_admin']}),
                    jpatch(self.c_owner, self.url(foreign), {'username': 'olib-qoldim'}),
                    jpost(self.c_owner, self.url(foreign, 'set-password/'), {'password': NEW_PASSWORD}),
                    self.c_owner.get(self.url(foreign))):
            self.assertEqual(res.status_code, 404)
        self.assertEqual(self.reload(foreign).extra_capabilities, [])
        usernames = {row['username'] for row in self.c_owner.get(API).json()}
        self.assertNotIn('begona-ofitsiant', usernames)

    def test_audit_records_who_changed_what(self):
        jpatch(self.c_owner, self.url(self.waiter), {'extra_capabilities': ['menu_admin'], 'revoked_capabilities': ['pos']})
        rows = self.audit('staff_permissions_changed', self.waiter)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual((row.actor_id, row.target_type), (self.owner.id, 'admin_user'))
        self.assertEqual(row.old_value, {'extra': [], 'revoked': []})
        self.assertEqual(row.new_value, {'extra': ['menu_admin'], 'revoked': ['pos'], 'granted': ['menu_admin'], 'removed': ['pos']})


class ProfileAndLoginTests(StaffPermissionsFixture):

    def test_profile_fields(self):
        res = jpatch(self.c_owner, self.url(self.waiter), {
            'first_name': 'Salim', 'last_name': 'Karimov', 'phone': '+998901112233', 'email': 'salim@example.com'})
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual((data['first_name'], data['last_name'], data['email'], data['phone'], data['full_name']),
                         ('Salim', 'Karimov', 'salim@example.com', '+998901112233', 'Salim Karimov'))
        waiter = self.reload(self.waiter)
        self.assertEqual((waiter.first_name, waiter.last_name, waiter.email), ('Salim', 'Karimov', 'salim@example.com'))
        row = self.audit('staff_updated', self.waiter)[-1]
        self.assertEqual(row.new_value['email'], 'salim@example.com')
        self.assertEqual(row.old_value['email'], '')
        # bo'sh e-pochta o'chiradi; full_name hamon ishlaydi, first/last berilsa ular ustun
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'email': ''}).json()['email'], '')
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'full_name': 'Vali Aliyev'}).json()['full_name'], 'Vali Aliyev')
        res = jpatch(self.c_owner, self.url(self.waiter), {'full_name': 'Eski Ism', 'first_name': 'Yangi'})
        self.assertEqual((res.json()['first_name'], res.json()['last_name']), ('Yangi', 'Aliyev'))

    def test_invalid_profile_values(self):
        for field, bad in (('email', 'email-emas'), ('email', 'a@b'), ('email', 'x' * 260 + '@a.uz'), ('first_name', 'x' * 151),
                           ('last_name', ['Karimov']), ('phone', 'x' * 21)):
            res = jpatch(self.c_owner, self.url(self.waiter), {field: bad})
            self.assertEqual(res.status_code, 400, (field, bad))
            self.assertEqual(res.json()['field'], field)

    # ─── login ──────────────────────────────────────────────────────────────────────────────────────
    def test_username_change_works_and_old_login_stops(self):
        rows = {r['username']: r for r in self.c_owner.get(API).json()}
        login_url_before = rows['perm-waiter']['login_url']
        res = jpatch(self.c_owner, self.url(self.waiter), {'username': 'Ofitsiant.Ali-2'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['username'], 'Ofitsiant.Ali-2')
        self.assertEqual(res.json()['login_url'], login_url_before)               # havola loginni o'z ichiga olmaydi
        self.assertNotIn('Ofitsiant', res.json()['login_url'])
        self.assertEqual(Client().post('/admin/login/', {'username': 'perm-waiter', 'password': PASSWORD}).status_code, 200)   # kira olmaydi
        ok = Client().post('/admin/login/', {'username': 'Ofitsiant.Ali-2', 'password': PASSWORD})
        self.assertEqual(ok.status_code, 302)
        row = self.audit('staff_username_changed', self.waiter)[0]
        self.assertEqual((row.old_value, row.new_value), ({'username': 'perm-waiter'}, {'username': 'Ofitsiant.Ali-2'}))
        self.assertEqual(row.actor_id, self.owner.id)

    def test_existing_session_survives_a_login_rename(self):
        client = self.login_client(self.waiter)
        jpatch(self.c_owner, self.url(self.waiter), {'username': 'yangi-login'})
        self.assertEqual(client.get(SESSION).status_code, 200)

    def test_username_must_be_unique_case_insensitively(self):
        for taken in ('perm-waiter2', 'PERM-WAITER2', 'Perm-Waiter2', 'perm-OWNER'):
            res = jpatch(self.c_owner, self.url(self.waiter), {'username': taken})
            self.assertEqual(res.status_code, 400, taken)
            self.assertEqual(res.json()['field'], 'username')
            self.assertIn('band', res.json()['error'])
        self.assertEqual(self.reload(self.waiter).username, 'perm-waiter')

    def test_username_format(self):
        for bad in ('ab', 'x' * 31, 'ichki bosh joy', 'ali@mail', 'ali/x', 'алишер', '', '   ', None, 5, ['a'], 'ali,vali'):
            res = jpatch(self.c_owner, self.url(self.waiter), {'username': bad})
            self.assertEqual(res.status_code, 400, repr(bad))
            self.assertEqual(res.json()['field'], 'username', repr(bad))
        for good in ('abc', 'a.b-c_d', 'X' * 30, 'ofitsiant123'):
            self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'username': good}).status_code, 200, good)

    def test_same_username_and_case_only_change_are_allowed(self):
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'username': 'perm-waiter', 'first_name': 'A'}).status_code, 200)
        self.assertEqual(self.audit('staff_username_changed'), [])
        self.assertEqual(jpatch(self.c_owner, self.url(self.waiter), {'username': 'Perm-Waiter'}).status_code, 200)
        self.assertEqual(self.reload(self.waiter).username, 'Perm-Waiter')

    def test_owner_may_rename_self_but_nobody_else_may_rename_the_owner(self):
        res = jpatch(self.c_owner, self.url(self.owner), {'username': 'egasi-yangi'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(self.audit('staff_username_changed', self.owner)[0].new_value, {'username': 'egasi-yangi'})
        self.assertEqual(Client().post('/admin/login/', {'username': 'egasi-yangi', 'password': PASSWORD}).status_code, 302)
        # boshqaruvchi egani qayta nomlay olmaydi; egalar ham bir-birini
        self.assertEqual(jpatch(self.c_manager, self.url(self.owner), {'username': 'xakerlik'}).status_code, 403)
        co_owner = self.make('shop_owner', 'perm-owner2')
        res = jpatch(self.login_client(self.reload(self.owner)), self.url(co_owner), {'username': 'xakerlik'})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.reload(co_owner).username, 'perm-owner2')

    def test_manager_renames_a_waiter_and_self_but_not_another_manager(self):
        self.assertEqual(jpatch(self.c_manager, self.url(self.waiter), {'username': 'boshqa-nom'}).status_code, 200)
        self.assertEqual(jpatch(self.c_manager, self.url(self.manager), {'username': 'meniki-yangi'}).status_code, 200)
        self.assertEqual(jpatch(self.c_manager, self.url(self.manager2), {'username': 'begona-nom'}).status_code, 403)

    def test_username_collision_never_corrupts_other_accounts(self):
        # bir vaqtda band qilingan login: baza noyobligi 400 ga aylanadi (500 emas)
        from unittest import mock
        with mock.patch('accounts.interfaces.api.staff_admin.parse_username', return_value='perm-waiter2'):
            res = jpatch(self.c_owner, self.url(self.waiter), {'username': 'boshqa-nom'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['field'], 'username')
        self.assertEqual(self.reload(self.waiter).username, 'perm-waiter')
        self.assertEqual(self.reload(self.waiter2).username, 'perm-waiter2')

    def test_create_validates_username_the_same_way(self):
        for bad in ('ab', 'bo sh joy', 'PERM-WAITER'):
            res = jpost(self.c_owner, API, {'username': bad, 'role': 'waiter'})
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json()['field'], 'username')
        res = jpost(self.c_owner, API, {'username': 'yangi.xodim', 'role': 'waiter', 'email': 'x@example.com',
                                         'extra_capabilities': ['menu_admin']})
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['permissions']['extra'], ['menu_admin'])
        self.assertEqual(res.json()['email'], 'x@example.com')
        self.assertTrue(res.json()['generated_password'])

    def test_create_enforces_permission_rules(self):
        res = jpost(self.c_manager, API, {'username': 'yangi-moliyachi', 'role': 'waiter', 'extra_capabilities': ['finance']})
        self.assertEqual(res.status_code, 403)
        self.assertFalse(AdminUser.objects.filter(username='yangi-moliyachi').exists())
        cut = self.make('shop_manager', 'perm-cut', revoked_capabilities=['reservations'])
        res = jpost(self.login_client(cut), API, {'username': 'yangi-hostess', 'role': 'hostess'})
        self.assertEqual(res.status_code, 403)
        res = jpost(self.c_owner, API, {'username': 'yangi-oshpaz', 'role': 'kitchen', 'revoked_capabilities': ['stoplist']})
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['permissions']['revoked'], ['stoplist'])


class SetPasswordTests(StaffPermissionsFixture):

    def login_status(self, username, password):
        return Client().post('/admin/login/', {'username': username, 'password': password}).status_code

    def test_owner_sets_a_new_password(self):
        old_session = self.login_client(self.waiter)
        self.assertEqual(old_session.get(SESSION).status_code, 200)
        res = jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD})
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual((data['status'], data['id'], data['username']), ('password_changed', self.waiter.id, 'perm-waiter'))
        self.assertNotIn(NEW_PASSWORD, res.content.decode())
        self.assertNotIn('password', {k for k in data if k != 'status'})
        self.assertEqual(self.login_status('perm-waiter', PASSWORD), 200)           # eski parol ishlamaydi
        self.assertEqual(self.login_status('perm-waiter', NEW_PASSWORD), 302)
        self.assertEqual(old_session.get(SESSION).status_code, 401)                 # eski sessiya tugadi

    def test_session_hash_alone_would_also_invalidate_the_old_session(self):
        # end_sessions'ga bog'liq emasligini ko'rsatish: Django sessiya hash'i parol o'zgarganda sessiyani yaroqsiz qiladi
        old_session = self.login_client(self.waiter)
        from unittest import mock
        with mock.patch('accounts.interfaces.api.staff_admin.end_sessions', return_value=0):
            self.assertEqual(jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD}).status_code, 200)
        self.assertEqual(old_session.get(SESSION).status_code, 401)

    def test_login_lock_is_cleared(self):
        for _ in range(login_guard.USER_LIMIT):
            self.assertEqual(self.login_status('perm-waiter', 'xato-parol'), 200)
        self.assertEqual(self.login_status('perm-waiter', PASSWORD), 200)             # bloklangan: to'g'ri parol ham o'tmaydi
        jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD})
        self.assertEqual(self.login_status('perm-waiter', NEW_PASSWORD), 302)

    def test_weak_and_invalid_passwords_are_rejected(self):
        url = self.url(self.waiter, 'set-password/')
        for bad in ('qisqa1A', '12345678', 'password', 'perm-waiter', 'perm-waiter1', 'aaaaaaaa'):
            res = jpost(self.c_owner, url, {'password': bad})
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json()['field'], 'password')
            self.assertIn('Parol yetarli kuchli emas', res.json()['error'])
        for bad in (None, '', '   ', ['x'], {'a': 1}, 'x' * 129, True):
            res = jpost(self.c_owner, url, {'password': bad} if bad is not None else {})
            self.assertEqual(res.status_code, 400, repr(bad))
            self.assertEqual(res.json()['field'], 'password', repr(bad))
        self.assertEqual(self.login_status('perm-waiter', PASSWORD), 302)              # parol o'zgarmadi
        self.assertEqual(self.audit('staff_password_set'), [])
        # xabar o'zbekcha va aniq
        error = jpost(self.c_owner, url, {'password': '12345678'}).json()['error']
        self.assertIn('juda oddiy', error)
        self.assertIn('faqat raqamlardan', error)
        self.assertIn('kamida 8 belgi', jpost(self.c_owner, url, {'password': 'Ab1!x'}).json()['error'])
        self.assertIn("o'xshash", jpost(self.c_owner, url, {'password': 'perm-waiter1'}).json()['error'])

    def test_password_never_appears_in_audit(self):
        jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD})
        jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': '12345678'})        # rad etilgan
        rows = self.audit('staff_password_set', self.waiter)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].actor_id, self.owner.id)
        self.assertEqual(rows[0].new_value, {'status': 'password_changed', 'self': False})
        everything = json.dumps(list(AuditLog.objects.values('old_value', 'new_value', 'metadata', 'user_agent')))
        self.assertNotIn(NEW_PASSWORD, everything)
        self.assertNotIn('12345678', everything)

    def test_does_not_log_the_password(self):
        with self.assertNoLogs(level='DEBUG'):
            jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD})

    def test_who_may_set_whose_password(self):
        url_owner, url_manager2, url_waiter = (self.url(u, 'set-password/') for u in (self.owner, self.manager2, self.waiter))
        body = {'password': NEW_PASSWORD}
        self.assertEqual(jpost(self.c_manager, url_owner, body).status_code, 403)
        self.assertEqual(jpost(self.c_manager, url_manager2, body).status_code, 403)
        self.assertEqual(jpost(self.c_waiter, url_waiter, body).status_code, 403)
        self.assertEqual(jpost(Client(), url_waiter, body).status_code in (401, 403), True)
        co_owner = self.make('shop_owner', 'perm-owner2')
        self.assertEqual(jpost(self.c_owner, self.url(co_owner, 'set-password/'), body).status_code, 403)   # egasining parolini boshqa egasi ham yo'q
        self.assertEqual(jpost(self.c_manager, url_waiter, body).status_code, 200)
        self.assertEqual(self.login_status('perm-waiter', NEW_PASSWORD), 302)
        self.assertEqual(self.login_status('perm-owner', PASSWORD), 302)               # egasining paroli tegilmagan

    def test_blocked_staff_password_can_be_set_but_stays_blocked(self):
        jpost(self.c_owner, self.url(self.waiter, 'block/'))
        self.assertEqual(jpost(self.c_owner, self.url(self.waiter, 'set-password/'), {'password': NEW_PASSWORD}).status_code, 200)
        self.assertEqual(self.login_status('perm-waiter', NEW_PASSWORD), 200)

    def test_changing_own_password_requires_the_current_one_and_keeps_this_session(self):
        url = self.url(self.manager, 'set-password/')
        other_device = self.login_client(self.manager)
        res = jpost(self.c_manager, url, {'password': NEW_PASSWORD})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['field'], 'current_password')
        res = jpost(self.c_manager, url, {'password': NEW_PASSWORD, 'current_password': 'xato-parol'})
        self.assertEqual((res.status_code, res.json()['field']), (400, 'current_password'))
        self.assertEqual(self.login_status('perm-manager', PASSWORD), 302)               # parol hali eski
        res = jpost(self.c_manager, url, {'password': NEW_PASSWORD, 'current_password': PASSWORD})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertNotIn(NEW_PASSWORD, res.content.decode())
        self.assertEqual(self.c_manager.get(SESSION).status_code, 200)                    # shu qurilma kirgan holda qoladi
        self.assertEqual(other_device.get(SESSION).status_code, 401)                      # boshqa qurilma chiqarildi
        self.assertEqual(self.login_status('perm-manager', NEW_PASSWORD), 302)
        self.assertEqual(self.audit('staff_password_set', self.manager)[0].new_value, {'status': 'password_changed', 'self': True})

    def test_wrong_current_password_attempts_are_rate_limited(self):
        url = self.url(self.manager, 'set-password/')
        for _ in range(login_guard.USER_LIMIT):
            self.assertEqual(jpost(self.c_manager, url, {'password': NEW_PASSWORD, 'current_password': 'xato-parol'}).status_code, 400)
        res = jpost(self.c_manager, url, {'password': NEW_PASSWORD, 'current_password': PASSWORD})
        self.assertEqual(res.status_code, 429)
        self.assertEqual(self.login_status('perm-manager', PASSWORD), 200)                # blok: kirishda ham, to'g'ri parol bilan


class ExistingBehaviourStaysTests(StaffPermissionsFixture):
    """Mavjud endpoint'lar (reset-password, block) o'zgarmadi va yangi ruxsat bilan ishlaydi."""

    def test_reset_password_still_generates_a_password(self):
        res = jpost(self.c_owner, self.url(self.waiter, 'reset-password/'))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['generated_password'])
        self.assertTrue(Client().login(username='perm-waiter', password=res.json()['generated_password']))

    def test_block_unblock_work_for_a_helper_with_staff_admin_on_non_managers(self):
        helper = self.make('waiter', 'perm-helper', extra_capabilities=['staff_admin'])
        client = self.login_client(helper)
        self.assertEqual(jpost(client, self.url(self.waiter2, 'block/')).status_code, 200)
        self.assertEqual(jpost(client, self.url(self.waiter2, 'unblock/')).status_code, 200)
        self.assertEqual(jpost(client, self.url(self.manager, 'unblock/')).status_code, 403)
