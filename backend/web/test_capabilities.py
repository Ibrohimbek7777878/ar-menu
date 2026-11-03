"""
Ruxsatlar katalogi va samarali hisob testlari (web/capabilities.py + web/restaurant_auth.py).

Samarali ruxsat = (rol standarti ∪ extra) − revoked; egasi va super_admin — doim hammasi. Eski rol matritsasi AYNAN
saqlangan (quyida literal qilib muzlatilgan), yangi shaxsiy ruxsatlar esa DRF, HTML sahifa, /ra/ yo'naltirish va sessiya
API'da bir xil ishlashi tekshiriladi.
"""
import json

from django.contrib.auth.models import AnonymousUser
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import get_resolver

from accounts.models import AdminUser
from orders.models import Order
from shops.models import Shop
from tables_restaurant.models import Hall, Table
from web.capabilities import (
    CAPABILITIES,
    CAPABILITY_KEYS,
    CATALOG,
    MANAGEMENT_CAPABILITIES,
    SENSITIVE_CAPABILITIES,
    catalog_payload,
    clean_keys,
    effective_capabilities_for,
    normalize_overrides,
    role_default_capabilities,
    role_defaults_payload,
)
from web.restaurant_auth import (
    capabilities_of,
    has_any_capability,
    has_capability,
    has_management_access,
)
from web.seller_decorators import SELLER_PAGE_CAPABILITIES
from web.tma_views import kds_allowed_statuses

MANAGERS = {'super_admin', 'shop_owner', 'shop_manager'}
# Ruxsatlar katalogi kiritilishidan OLDINGI matritsa (web/restaurant_auth.py CAPABILITIES): o'zgarmasligi shart
LEGACY_MATRIX = {
    'kds_screen': MANAGERS | {'kitchen'},
    'kds': MANAGERS | {'kitchen', 'waiter'},
    'pos': MANAGERS | {'waiter'},
    'tables_read': MANAGERS | {'waiter', 'hostess'},
    'reservations': MANAGERS | {'hostess'},
    'stoplist': MANAGERS | {'kitchen', 'waiter'},
    'menu_admin': MANAGERS,
    'finance': MANAGERS,
}
# Avval `menu_admin` (rahbariyat) bilan tekshirilgan yoki rol nomiga bog'langan joylar uchun yangi kalitlar
NEW_KEYS = {
    'orders_manage': MANAGERS | {'waiter'},        # avval: faqat oshpaz cheklangan edi (ofitsiant va rahbariyat — cheklovsiz)
    'tables_admin': MANAGERS,                      # avval menu_admin
    'staff_admin': MANAGERS,                       # avval menu_admin
    'settings_admin': MANAGERS,                    # avval menu_admin
}
ALL_ROLES = ('super_admin', 'shop_owner', 'shop_manager', 'waiter', 'kitchen', 'hostess')


class CatalogUnitTests(SimpleTestCase):

    def test_legacy_role_matrix_is_preserved_exactly(self):
        for key, roles in LEGACY_MATRIX.items():
            self.assertEqual(set(CAPABILITIES[key]), roles, key)

    def test_new_keys_default_to_what_each_role_could_already_do(self):
        for key, roles in NEW_KEYS.items():
            self.assertEqual(set(CAPABILITIES[key]), roles, key)

    def test_catalog_has_exactly_the_reviewed_keys_with_complete_entries(self):
        self.assertEqual(set(CAPABILITY_KEYS), set(LEGACY_MATRIX) | set(NEW_KEYS))
        self.assertEqual(len(CAPABILITY_KEYS), len(set(CAPABILITY_KEYS)))
        for entry in catalog_payload():
            self.assertEqual(set(entry), {'key', 'label', 'group', 'group_key', 'description', 'sensitive'})
            for field in ('label', 'group', 'description'):
                self.assertTrue(entry[field].strip(), (entry['key'], field))
            self.assertIsInstance(entry['sensitive'], bool)
        self.assertTrue({'finance', 'staff_admin', 'settings_admin'} <= SENSITIVE_CAPABILITIES)

    def test_management_capabilities_are_catalog_keys(self):
        self.assertEqual(set(MANAGEMENT_CAPABILITIES), {'menu_admin', 'finance', 'staff_admin', 'settings_admin', 'tables_admin'})
        self.assertTrue(set(MANAGEMENT_CAPABILITIES) <= set(CAPABILITY_KEYS))

    def test_role_defaults_payload(self):
        defaults = role_defaults_payload()
        self.assertEqual(set(defaults), {'waiter', 'kitchen', 'hostess', 'shop_manager', 'shop_owner'})
        self.assertEqual(defaults['shop_owner'], list(CAPABILITY_KEYS))
        self.assertEqual(defaults['shop_manager'], list(CAPABILITY_KEYS))
        self.assertEqual(set(defaults['kitchen']), {'kds_screen', 'kds', 'stoplist'})
        self.assertEqual(set(defaults['hostess']), {'tables_read', 'reservations'})
        self.assertEqual(set(defaults['waiter']), {'kds', 'orders_manage', 'stoplist', 'pos', 'tables_read'})
        self.assertEqual(role_default_capabilities('courier_manager'), [])
        self.assertEqual(role_default_capabilities('nomalum'), [])

    def test_effective_is_defaults_plus_extra_minus_revoked(self):
        self.assertEqual(effective_capabilities_for('waiter', ['menu_admin'], ['pos']),
                         ['kds', 'orders_manage', 'stoplist', 'tables_read', 'menu_admin'])
        self.assertNotIn('pos', effective_capabilities_for('waiter', [], ['pos']))
        self.assertIn('menu_admin', effective_capabilities_for('hostess', ['menu_admin'], []))
        # revoked extra'ni ham bekor qiladi (xom ma'lumotda ikkalasi bo'lsa)
        self.assertNotIn('menu_admin', effective_capabilities_for('waiter', ['menu_admin'], ['menu_admin']))

    def test_owners_always_have_everything_and_cannot_be_restricted(self):
        for role in ('shop_owner', 'super_admin'):
            self.assertEqual(effective_capabilities_for(role, [], list(CAPABILITY_KEYS)), list(CAPABILITY_KEYS))
            self.assertEqual(normalize_overrides(role, ['finance'], ['pos']), ([], []))

    def test_unknown_and_malformed_values_are_ignored(self):
        self.assertEqual(clean_keys(['pos', 'yoq-kalit', 5, None, {'a': 1}, 'pos']), ['pos'])
        for junk in (None, 'pos', 7, {'pos': 1}, True):
            self.assertEqual(clean_keys(junk), [])
            self.assertEqual(effective_capabilities_for('waiter', junk, junk), role_default_capabilities('waiter'))
        self.assertEqual(effective_capabilities_for('kitchen', ['qalbaki'], ['qalbaki']), role_default_capabilities('kitchen'))

    def test_normalize_overrides_drops_redundant_entries(self):
        # extra'dan rol standartidagi kalit olib tashlanadi, revoked'dan standartda YO'Q kalit ham; takror yo'q, katalog tartibida
        extra, revoked = normalize_overrides('waiter', ['pos', 'menu_admin', 'menu_admin', 'finance'], ['finance', 'kds', 'kds'])
        self.assertEqual(extra, ['menu_admin', 'finance'])
        self.assertEqual(revoked, ['kds'])
        # rol o'zgarsa, eski ro'yxat yangi rolga moslanadi
        self.assertEqual(normalize_overrides('shop_manager', ['menu_admin'], ['finance']), ([], ['finance']))


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class EffectiveAccessTests(TestCase):
    """Haqiqiy foydalanuvchilar: has_capability, DRF, HTML sahifa, /ra/, sessiya API."""
    ADMIN = '/api/restaurant/admin/v1/'

    @classmethod
    def setUpTestData(cls):
        cls.owner = AdminUser.objects.create_user(username='cap_owner', password='Parol-Cap-1234', role='shop_owner',
                                                  is_approved=True)
        cls.shop = Shop.objects.create(name='Cap Resto', slug='cap-resto', owner=cls.owner, address='Guliston',
                                       latitude=40.49, longitude=68.78, is_open=True, phone='+998901112233')
        cls.owner.shop = cls.shop
        cls.owner.save(update_fields=['shop'])
        cls.hall = Hall.objects.create(shop=cls.shop, name='Asosiy Zal')
        cls.table = Table.objects.create(shop=cls.shop, hall=cls.hall, number='1', status='free')

    def make(self, role, name, extra=None, revoked=None, **kwargs):
        return AdminUser.objects.create_user(
            username=name, password='Parol-Cap-1234', role=role, shop=self.shop, is_approved=True,
            extra_capabilities=extra or [], revoked_capabilities=revoked or [], **kwargs)

    def client_for(self, user):
        client = Client()
        client.force_login(user)
        return client

    def make_order(self, number='CAP-1', status='pending'):
        return Order.objects.create(order_number=number, customer_name='Mehmon', customer_phone_1='+998903334455',
                                    shop=self.shop, table=self.table, total_amount=1000, final_amount=1000, status=status)

    # ─── has_capability / capabilities_of ───────────────────────────────────────────────────────────
    def test_defaults_are_unchanged_for_every_role(self):
        for role in ALL_ROLES:
            user = self.make(role, f'def-{role}')
            for key, roles in {**LEGACY_MATRIX, **NEW_KEYS}.items():
                self.assertEqual(has_capability(user, key), role in roles, (role, key))

    def test_extra_and_revoked_apply_to_staff(self):
        waiter = self.make('waiter', 'w1', extra=['menu_admin'], revoked=['pos'])
        self.assertTrue(has_capability(waiter, 'menu_admin'))
        self.assertFalse(has_capability(waiter, 'pos'))
        self.assertTrue(has_capability(waiter, 'kds'))
        manager = self.make('shop_manager', 'm1', revoked=['finance', 'staff_admin'])
        self.assertFalse(has_capability(manager, 'finance'))
        self.assertFalse(has_capability(manager, 'staff_admin'))
        self.assertTrue(has_capability(manager, 'menu_admin'))
        self.assertTrue(has_any_capability(manager, ('finance', 'menu_admin')))
        self.assertFalse(has_any_capability(manager, ('finance', 'staff_admin')))

    def test_owner_and_superuser_ignore_revoked(self):
        self.owner.revoked_capabilities = list(CAPABILITY_KEYS)
        self.owner.extra_capabilities = ['pos']
        self.assertEqual(capabilities_of(self.owner), list(CAPABILITY_KEYS))
        root = AdminUser.objects.create_superuser(username='cap_root', password='Parol-Cap-1234')
        root.revoked_capabilities = list(CAPABILITY_KEYS)
        self.assertEqual(capabilities_of(root), list(CAPABILITY_KEYS))

    def test_no_access_for_inactive_unapproved_unscoped_anonymous_and_non_staff(self):
        blocked = self.make('shop_manager', 'blk', extra=['finance'])
        blocked.is_active = False
        unscoped = AdminUser.objects.create_user(username='noshop', password='Parol-Cap-1234', role='waiter')
        unapproved = AdminUser.objects.create_user(username='unappr', password='Parol-Cap-1234', role='shop_manager',
                                                   shop=self.shop, is_approved=False)
        support = AdminUser.objects.create_user(username='sup', password='Parol-Cap-1234', role='support', shop=self.shop,
                                                is_approved=True, extra_capabilities=['finance'])
        for user in (blocked, unscoped, unapproved, support, AnonymousUser(), None):
            self.assertEqual(capabilities_of(user), [], user)
            self.assertFalse(has_capability(user, 'finance'))
            self.assertFalse(has_management_access(user))

    def test_unknown_capability_name_raises_instead_of_silently_denying(self):
        with self.assertRaises(KeyError):
            has_capability(self.owner, 'yoq_ruxsat')

    def test_junk_in_the_database_columns_cannot_break_access(self):
        waiter = self.make('waiter', 'junk')
        waiter.extra_capabilities = {'menu_admin': True}
        waiter.revoked_capabilities = 'pos'
        self.assertEqual(capabilities_of(waiter), role_default_capabilities('waiter'))

    # ─── DRF ───────────────────────────────────────────────────────────────────────────────────────────
    def test_drf_menu_endpoint_follows_effective_capability(self):
        url = self.ADMIN + 'menu/products/'
        self.assertEqual(self.client_for(self.make('waiter', 'drf-w')).get(url).status_code, 403)
        self.assertEqual(self.client_for(self.make('waiter', 'drf-w2', extra=['menu_admin'])).get(url).status_code, 200)
        # boshqaruvchi: standart ruxsat, olib tashlansa 403
        self.assertEqual(self.client_for(self.make('shop_manager', 'drf-m')).get(url).status_code, 200)
        self.assertEqual(self.client_for(self.make('shop_manager', 'drf-m2', revoked=['menu_admin'])).get(url).status_code, 403)
        # egasi: olib tashlash ta'sir qilmaydi
        self.owner.revoked_capabilities = ['menu_admin']
        self.owner.save(update_fields=['revoked_capabilities'])
        self.assertEqual(self.client_for(self.owner).get(url).status_code, 200)

    def test_settings_staff_and_tables_edit_are_separate_capabilities(self):
        settings_url, staff_url, tables_url = self.ADMIN + 'settings/', self.ADMIN + 'staff/', self.ADMIN + 'tables/'
        manager = self.client_for(self.make('shop_manager', 'sep-m'))
        self.assertEqual([manager.get(u).status_code for u in (settings_url, staff_url, tables_url)], [200, 200, 200])
        cut = self.client_for(self.make('shop_manager', 'sep-m2', revoked=['settings_admin', 'staff_admin']))
        self.assertEqual(cut.get(settings_url).status_code, 403)
        self.assertEqual(cut.get(staff_url).status_code, 403)
        self.assertEqual(cut.get(tables_url).status_code, 200)      # stollarni ko'rish (tables_read) saqlanadi
        # stollarni tahrirlash — tables_admin; olib tashlansa ro'yxat ochiq, yaratish yopiq
        no_edit = self.client_for(self.make('shop_manager', 'sep-m3', revoked=['tables_admin']))
        self.assertEqual(no_edit.get(tables_url).status_code, 200)
        res = no_edit.post(tables_url, json.dumps({'number': '77'}), content_type='application/json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(no_edit.post(self.ADMIN + 'tables/halls/', json.dumps({'name': 'Zal'}),
                                      content_type='application/json').status_code, 403)
        self.assertEqual(no_edit.post(f'{tables_url}{self.table.pk}/rotate-qr/').status_code, 403)

    def test_finance_follows_capability_for_new_and_legacy_endpoints(self):
        urls = (self.ADMIN + 'finance/summary/', '/api/v1/restaurant/finance/')
        no_fin = self.client_for(self.make('shop_manager', 'fin-m', revoked=['finance']))
        for url in urls:
            self.assertEqual(no_fin.get(url).status_code, 403, url)
        # legacy yozuv endpoint ham (avval faqat rolga qarardi) va "boshqa rol + moliya" ham ishlaydi
        self.assertEqual(no_fin.post('/api/v1/restaurant/finance/tx/', json.dumps({'type': 'income', 'amount': 1000}),
                                     content_type='application/json').status_code, 403)
        waiter_fin = self.client_for(self.make('waiter', 'fin-w', extra=['finance']))
        for url in urls:
            self.assertEqual(waiter_fin.get(url).status_code, 200, url)
        plain_waiter = self.client_for(self.make('waiter', 'fin-w2'))
        for url in urls:
            self.assertEqual(plain_waiter.get(url).status_code, 403, url)

    def test_legacy_3d_scan_needs_menu_admin(self):
        url = '/api/v1/restaurant/products/3d-scan/'
        self.assertEqual(self.client_for(self.make('waiter', 'scan-w')).post(url, '{}', content_type='application/json').status_code, 403)
        self.assertEqual(self.client_for(self.make('shop_manager', 'scan-m', revoked=['menu_admin'])).post(
            url, '{}', content_type='application/json').status_code, 403)

    # ─── buyurtma holati (orders_manage) ─────────────────────────────────────────────────────────────
    def test_order_status_limits_follow_orders_manage_not_the_role_name(self):
        order = self.make_order()

        def post(user, new_status):
            return self.client_for(user).post(f'{self.ADMIN}orders/{order.pk}/status/', json.dumps({'status': new_status}),
                                              content_type='application/json')

        kitchen = self.make('kitchen', 'os-k')
        self.assertEqual(post(kitchen, 'cancelled').status_code, 403)          # avvalgidek: oshpaz faqat tayyorlash
        # shaxsiy kds ruxsati berilgan hostess: bekor qilish/yetkazishgacha ko'tarilib ketmaydi
        hostess = self.make('hostess', 'os-h', extra=['kds'])
        self.assertEqual(post(hostess, 'cancelled').status_code, 403)
        self.assertEqual(post(hostess, 'delivered').status_code, 403)
        # ofitsiant (orders_manage standarti bor) avvalgidek cheklovsiz; olib tashlansa — oshxona bosqichlari bilan cheklangan
        self.assertEqual(post(self.make('waiter', 'os-w2', revoked=['orders_manage']), 'cancelled').status_code, 403)
        self.assertNotEqual(post(self.make('waiter', 'os-w'), 'confirmed').status_code, 403)
        self.assertEqual(post(self.make('hostess', 'os-h2', extra=['kds', 'orders_manage']), 'cancelled').status_code, 200)

    def test_kds_allowed_statuses_per_user(self):
        self.assertEqual(kds_allowed_statuses(self.make('kitchen', 'ks-k')), {'confirmed', 'preparing', 'ready'})
        self.assertEqual(kds_allowed_statuses(self.make('waiter', 'ks-w')), {'confirmed', 'delivered', 'cancelled'})
        self.assertIsNone(kds_allowed_statuses(self.make('shop_manager', 'ks-m')))
        self.assertIsNone(kds_allowed_statuses(self.owner))
        # orders_manage'siz — hamma uchun faqat oshxona bosqichlari (hostess+kds ham)
        self.assertEqual(kds_allowed_statuses(self.make('hostess', 'ks-h', extra=['kds'])), {'confirmed', 'preparing', 'ready'})
        self.assertEqual(kds_allowed_statuses(self.make('shop_manager', 'ks-m2', revoked=['orders_manage'])),
                         {'confirmed', 'preparing', 'ready'})

    def test_kds_status_api_for_hostess_with_personal_kds(self):
        order = self.make_order('CAP-2', 'confirmed')
        hostess = self.client_for(self.make('hostess', 'kd-h', extra=['kds']))
        post = lambda status: hostess.post('/api/kds/status/', json.dumps({'order_id': order.pk, 'new_status': status}),  # noqa: E731
                                           content_type='application/json')
        self.assertEqual(post('cancelled').status_code, 403)
        self.assertEqual(post('preparing').status_code, 200)

    # ─── HTML sahifalar ──────────────────────────────────────────────────────────────────────────────
    def test_kitchen_screen_follows_personal_capability(self):
        hostess = self.client_for(self.make('hostess', 'html-h'))
        self.assertEqual(hostess.get('/kds/').status_code, 302)                 # standart: o'z sahifasiga
        granted = self.client_for(self.make('hostess', 'html-h2', extra=['kds_screen']))
        self.assertEqual(granted.get('/kds/').status_code, 200)
        revoked = self.client_for(self.make('kitchen', 'html-k', revoked=['kds_screen']))
        self.assertEqual(revoked.get('/kds/').status_code, 403)                 # o'z bosh sahifasi taqiqlangan: aylanma yo'q
        self.assertEqual(self.client_for(self.make('kitchen', 'html-k2')).get('/kds/').status_code, 200)

    def test_waiter_and_hostess_pages_follow_personal_capability(self):
        self.assertEqual(self.client_for(self.make('waiter', 'pg-w', revoked=['pos'])).get('/waiter/panel/').status_code, 403)
        self.assertEqual(self.client_for(self.make('kitchen', 'pg-k', extra=['pos'])).get('/waiter/panel/').status_code, 200)
        self.assertEqual(self.client_for(self.make('waiter', 'pg-w2', extra=['reservations'])).get('/arrival/desk/').status_code, 200)
        self.assertEqual(self.client_for(self.make('waiter', 'pg-w3')).get('/arrival/desk/').status_code, 302)

    def test_kds_polling_api_needs_kds(self):
        self.assertEqual(self.client_for(self.make('waiter', 'poll-w', revoked=['kds'])).get('/api/kds/orders/').status_code, 403)
        self.assertEqual(self.client_for(self.make('hostess', 'poll-h', extra=['kds'])).get('/api/kds/orders/').status_code, 200)

    # ─── /ra/ va sessiya API ────────────────────────────────────────────────────────────────────────────
    def test_ra_opens_for_any_management_capability_else_redirects_to_role_panel(self):
        for role, panel in (('waiter', '/waiter/panel/'), ('kitchen', '/kds/'), ('hostess', '/arrival/desk/')):
            res = self.client_for(self.make(role, f'ra-{role}')).get('/ra/')
            self.assertEqual((res.status_code, res['Location']), (302, panel), role)
        for key in MANAGEMENT_CAPABILITIES:
            res = self.client_for(self.make('waiter', f'ra-extra-{key}', extra=[key])).get('/ra/')
            self.assertEqual(res.status_code, 200, key)
        # sof "boshqaruv" bo'lmagan ruxsat /ra/ ni ochmaydi
        res = self.client_for(self.make('hostess', 'ra-h-kds', extra=['kds'])).get('/ra/')
        self.assertEqual(res.status_code, 302)

    def test_ra_closes_again_when_the_management_capability_is_withdrawn(self):
        waiter = self.make('waiter', 'ra-w', extra=['menu_admin'])
        client = self.client_for(waiter)
        self.assertEqual(client.get('/ra/').status_code, 200)
        waiter.extra_capabilities = []
        waiter.save(update_fields=['extra_capabilities'])
        res = client.get('/ra/')
        self.assertEqual((res.status_code, res['Location']), (302, '/waiter/panel/'))
        # xom ma'lumotda ham extra, ham revoked bo'lsa — revoked yutadi
        waiter.extra_capabilities, waiter.revoked_capabilities = ['menu_admin'], ['menu_admin']
        waiter.save(update_fields=['extra_capabilities', 'revoked_capabilities'])
        self.assertEqual(client.get('/ra/').status_code, 302)

    def test_manager_without_management_capabilities_still_gets_ra_not_a_redirect_loop(self):
        bare = self.make('shop_manager', 'ra-bare', revoked=list(MANAGEMENT_CAPABILITIES))
        self.assertEqual(self.client_for(bare).get('/ra/').status_code, 200)

    def test_session_api_lists_effective_capabilities_only(self):
        url = self.ADMIN + 'session/'
        waiter = self.make('waiter', 'ss-w', extra=['menu_admin'], revoked=['pos'])
        caps = self.client_for(waiter).get(url).json()['capabilities']
        self.assertIn('menu_admin', caps)
        self.assertNotIn('pos', caps)
        self.assertIn('kds', caps)
        manager = self.make('shop_manager', 'ss-m', revoked=['finance', 'settings_admin'])
        caps = self.client_for(manager).get(url).json()['capabilities']
        self.assertNotIn('finance', caps)
        self.assertNotIn('settings_admin', caps)
        self.assertIn('staff_admin', caps)
        # eski kalitlarning ma'nosi o'zgarmagan: egasi hammasini oladi (ro'yxat faqat kengaygan)
        self.assertEqual(self.client_for(self.owner).get(url).json()['capabilities'], list(CAPABILITY_KEYS))
        self.assertTrue(set(LEGACY_MATRIX) <= set(self.client_for(self.owner).get(url).json()['capabilities']))

    # ─── eski /seller/ sahifalari ham shaxsiy ruxsatlarga bo'ysunadi ───────────────────────────────────
    def test_legacy_seller_pages_follow_personal_capabilities(self):
        owner = self.client_for(self.owner)
        for url in ('/seller/finance/', '/seller/products/', '/seller/tables/', '/seller/shop/'):
            self.assertEqual(owner.get(url).status_code, 200, url)
        cut = self.client_for(self.make('shop_manager', 'sl-cut', revoked=['finance', 'menu_admin', 'tables_admin', 'settings_admin']))
        for url in ('/seller/finance/', '/seller/products/', '/seller/tables/', '/seller/shop/', '/seller/analytics/',
                    '/seller/products/create/', '/seller/telegram/'):
            self.assertEqual(cut.get(url).status_code, 403, url)
        # standart boshqaruvchi — avvalgidek
        full = self.client_for(self.make('shop_manager', 'sl-full'))
        for url in ('/seller/finance/', '/seller/products/', '/seller/tables/', '/seller/shop/'):
            self.assertEqual(full.get(url).status_code, 200, url)
        # ofitsiant: standart sahifa ochiq, `pos` olib tashlansa — yopiq; shaxsiy ruxsat uni boshqaruvchi sahifasiga olib kirmaydi
        self.assertEqual(self.client_for(self.make('waiter', 'sl-w')).get('/seller/waiter/').status_code, 200)
        self.assertEqual(self.client_for(self.make('waiter', 'sl-w2', revoked=['pos'])).get('/seller/waiter/').status_code, 403)
        res = self.client_for(self.make('waiter', 'sl-w3', extra=['finance'])).get('/seller/finance/')
        self.assertEqual(res.status_code, 302)                                      # eski panel rol bo'yicha (ofitsiant) yopiq

    def test_seller_capability_map_points_to_real_routes_and_catalog_keys(self):
        names = {key for key in get_resolver('backend.urls_restaurant').reverse_dict.keys() if isinstance(key, str)}
        self.assertEqual(sorted(set(SELLER_PAGE_CAPABILITIES) - names), [])
        self.assertTrue(set(SELLER_PAGE_CAPABILITIES.values()) <= set(CAPABILITY_KEYS))

    def test_catalog_entries_are_reachable_from_some_guard(self):
        # Har bir katalog kaliti kamida bitta yo'lni boshqaradi: yo'qsa u "o'lik" ruxsat (egasi ko'radi, lekin hech narsaga ta'sir qilmaydi)
        import re
        from pathlib import Path
        root = Path(__file__).resolve().parent.parent
        sources = ''
        for path in root.rglob('*.py'):
            parts = path.relative_to(root).parts
            if parts[0] in ('venv', 'staticfiles', 'static', 'media', 'archive', 'node_modules') or path.name.startswith('test'):
                continue
            if path.name == 'capabilities.py' and parts[0] == 'web':
                continue
            sources += path.read_text(encoding='utf-8', errors='ignore')
        for entry in CATALOG:
            key = entry['key']
            self.assertTrue(re.search(rf"""(capability\(|capability=|has_capability\([^)]*|has_any_capability\([^)]*)['"]{key}['"]""", sources),
                            f'{key}: hech qaysi marshrut/sahifa uni tekshirmaydi')
