"""
Xodimning kirish havolasi (`/ra/` → Xodimlar): har rol uchun to'g'ri sahifa, begona restoran sizmasligi,
bloklangan xodim, `?next=` xavfsizligi va parol hech qayerda ko'rinmasligi.
"""
import io
from urllib.parse import parse_qs, urlsplit

from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.urls import resolve

from accounts.models import AdminUser
from accounts.staff_access import BLOCKED_REASON, NO_PANEL_REASON, NOT_APPROVED_REASON, staff_access
from orders.models import AuditLog
from shops.models import Shop
from web.restaurant_auth import role_panel

API = '/api/restaurant/admin/v1/staff/'
GOOD_PASSWORD = 'Kirish-Parol-2026!'

# Rol → (kutilgan yo'l, kutilgan nom): egasi talabi va brauzerda tekshirilgan sahifalar.
EXPECTED = {
    'shop_owner': ('/ra/', 'Boshqaruv paneli'),
    'shop_manager': ('/ra/', 'Boshqaruv paneli'),
    'waiter': ('/waiter/panel/', 'Ofitsiant paneli'),
    'kitchen': ('/kds/', 'Oshxona ekrani'),
    'hostess': ('/arrival/desk/', 'Qabul stoli'),
}


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class StaffAccessTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Kirish Resto', slug='kirish-resto', owner='kirish-ega',
                     password='Parol-Kirish-123', tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='kirish-resto')
        self.owner = AdminUser.objects.get(username='kirish-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.users = {'shop_owner': self.owner}
        for role in ('shop_manager', 'waiter', 'kitchen', 'hostess'):
            self.users[role] = AdminUser.objects.create_user(
                username=f'k-{role}', password=GOOD_PASSWORD, role=role, shop=self.shop,
                is_staff=False, is_approved=True)
        self.client_owner = Client()
        self.client_owner.force_login(self.owner)

    def listing(self, client=None, **extra):
        res = (client or self.client_owner).get(API, **extra)
        self.assertEqual(res.status_code, 200, res.content)
        return {row['username']: row for row in res.json()}

    # ─── har rol uchun to'g'ri yo'l ─────────────────────────────────────────────
    def test_every_role_gets_its_real_panel_and_label(self):
        rows = self.listing()
        for role, (path, label) in EXPECTED.items():
            row = rows[self.users[role].username]
            self.assertEqual(row['panel_path'], path, role)
            self.assertEqual(row['panel_label'], label, role)
            self.assertEqual(row['login_url'], f'http://testserver/admin/login/?next={path}', role)
            self.assertIsNone(row['login_unavailable_reason'], role)

    def test_panel_paths_are_real_routes_for_that_role(self):
        # Yo'l haqiqatan mavjud marshrut va aynan shu rol u yerga kira oladi (ishlamaydigan havola berilmasin).
        for role, (path, _label) in EXPECTED.items():
            self.assertEqual(role_panel(role)['path'], path)
            self.assertNotEqual(resolve(path).url_name, None, path)
            client = Client()
            client.force_login(self.users[role])
            res = client.get(path)
            self.assertEqual(res.status_code, 200, f'{role} {path}: {res.status_code} {res.get("Location")}')

    def test_login_link_lands_staff_on_their_panel(self):
        # Havolani ochish (kirgan xodim) → login sahifasi `next` ni qabul qilib, aynan panelga yo'naltiradi.
        rows = self.listing()
        for role, (path, _label) in EXPECTED.items():
            url = urlsplit(rows[self.users[role].username]['login_url'])
            client = Client()
            client.force_login(self.users[role])
            res = client.get(f'{url.path}?{url.query}')
            self.assertEqual((res.status_code, res['Location']), (302, path), role)

    def test_unauthenticated_staff_can_login_through_the_link(self):
        # Kirmagan xodim: havola → login formasi (200); parol bilan POST → panelga.
        client = Client()
        res = client.get('/admin/login/?next=/waiter/panel/')
        self.assertEqual(res.status_code, 200)
        res = client.post('/admin/login/', {'username': 'k-waiter', 'password': GOOD_PASSWORD, 'next': '/waiter/panel/'})
        self.assertEqual((res.status_code, res['Location']), (302, '/waiter/panel/'))

    # ─── tenant: begona restoran sizmasin ──────────────────────────────────────
    def test_other_restaurant_staff_never_listed(self):
        call_command('create_restaurant', name='Boshqa', slug='boshqa-kirish', owner='boshqa-kirish-ega',
                     password='Parol-Boshqa-123', tables=1, stdout=io.StringIO())
        other = Shop.objects.get(slug='boshqa-kirish')
        AdminUser.objects.create_user(username='begona-ofitsiant', password=GOOD_PASSWORD, role='waiter',
                                      shop=other, is_staff=False, is_approved=True)
        rows = self.listing()
        self.assertNotIn('begona-ofitsiant', rows)
        self.assertNotIn('boshqa-kirish-ega', rows)

    def test_waiter_and_unauthenticated_cannot_read_access_links(self):
        waiter = Client()
        waiter.force_login(self.users['waiter'])
        self.assertEqual(waiter.get(API).status_code, 403)
        self.assertIn(Client().get(API).status_code, (401, 403))

    # ─── bloklangan / faol bo'lmagan xodim ────────────────────────────────────
    def test_blocked_staff_gets_reason_instead_of_link(self):
        waiter = self.users['waiter']
        self.assertEqual(self.client_owner.post(f'{API}{waiter.id}/block/').status_code, 200)
        row = self.listing()[waiter.username]
        self.assertIsNone(row['login_url'])
        self.assertEqual(row['login_unavailable_reason'], BLOCKED_REASON)
        self.assertEqual(row['panel_path'], '/waiter/panel/')      # sahifa nomi baribir ma'lum
        self.client_owner.post(f'{API}{waiter.id}/unblock/')
        row = self.listing()[waiter.username]
        self.assertTrue(row['login_url'])
        self.assertIsNone(row['login_unavailable_reason'])

    def test_unapproved_manager_and_unknown_role_have_no_link(self):
        pending = AdminUser.objects.create_user(username='k-kutilmoqda', password=GOOD_PASSWORD, role='shop_manager',
                                                shop=self.shop, is_staff=False, is_approved=False)
        info = staff_access(pending, 'https://x.uz')
        self.assertIsNone(info['login_url'])
        self.assertEqual(info['login_unavailable_reason'], NOT_APPROVED_REASON)

        courier = AdminUser.objects.create_user(username='k-kuryer', password=GOOD_PASSWORD, role='courier_manager',
                                                shop=self.shop, is_staff=False, is_approved=True)
        info = staff_access(courier, 'https://x.uz')
        self.assertEqual((info['panel_path'], info['panel_label'], info['login_url']), (None, None, None))
        self.assertEqual(info['login_unavailable_reason'], NO_PANEL_REASON)

    # ─── havola boshi (sxema / domen) ─────────────────────────────────────────
    @override_settings(RESTAURANT_PUBLIC_URL='https://menu.example.uz')
    def test_public_url_setting_wins(self):
        row = self.listing()['k-kitchen']
        self.assertEqual(row['login_url'], 'https://menu.example.uz/admin/login/?next=/kds/')

    @override_settings(RESTAURANT_PUBLIC_URL='', ALLOWED_HOSTS=['testserver', 'restoran.example.uz'])
    def test_origin_is_the_real_request_host_and_scheme(self):
        row = self.listing(HTTP_HOST='restoran.example.uz')['k-hostess']
        self.assertEqual(row['login_url'], 'http://restoran.example.uz/admin/login/?next=/arrival/desk/')
        row = self.listing(secure=True)['k-hostess']                  # to'g'ridan-to'g'ri https
        self.assertTrue(row['login_url'].startswith('https://testserver/admin/login/'), row['login_url'])

    @override_settings(RESTAURANT_PUBLIC_URL='', SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO', 'https'),
                       ALLOWED_HOSTS=['testserver', 'restoran.example.uz'])
    def test_https_behind_proxy_keeps_https(self):
        row = self.listing(HTTP_HOST='restoran.example.uz', HTTP_X_FORWARDED_PROTO='https')['k-waiter']
        self.assertEqual(row['login_url'], 'https://restoran.example.uz/admin/login/?next=/waiter/panel/')

    def test_foreign_host_header_is_rejected_not_reflected(self):
        # Host sarlavhasi soxtalashtirilsa (ALLOWED_HOSTS dan tashqari) Django so'rovni rad etadi: havolaga tushmaydi.
        res = self.client_owner.get(API, HTTP_HOST='evil.example')
        self.assertEqual(res.status_code, 400)

    # ─── ?next= xavfsizligi ───────────────────────────────────────────────────
    def test_next_is_always_an_internal_path_on_the_same_host(self):
        rows = self.listing()
        for row in rows.values():
            if not row['login_url']:
                continue
            url = urlsplit(row['login_url'])
            self.assertEqual(url.netloc, 'testserver')
            self.assertEqual(url.path, '/admin/login/')
            nxt = parse_qs(url.query)['next']
            self.assertEqual(len(nxt), 1)
            self.assertTrue(nxt[0].startswith('/') and not nxt[0].startswith('//'), nxt[0])
            self.assertNotIn('://', nxt[0])
            self.assertEqual(nxt[0], row['panel_path'])

    def test_login_ignores_external_next(self):
        # Mavjud login ko'rinishi tashqi `next` ni qabul qilmaydi (havola yasash mantig'i unga tayanadi).
        client = Client()
        client.force_login(self.users['waiter'])
        for evil in ('https://evil.example/', '//evil.example/x', 'javascript:alert(1)'):
            res = client.get('/admin/login/', {'next': evil})
            self.assertEqual(res.status_code, 302, evil)
            self.assertNotIn('evil', res['Location'], evil)

    # ─── parol hech qayerda ko'rinmasin ───────────────────────────────────────
    def test_password_never_in_listing_link_or_audit(self):
        res = self.client_owner.post(API, {'username': 'k-yangi', 'role': 'waiter', 'password': 'Yangi-Maxfiy-Parol-77!'},
                                     content_type='application/json')
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        # Bir martalik javob: parol faqat `generated_password` da (avvalgidek), havolada emas
        self.assertEqual(data['generated_password'], 'Yangi-Maxfiy-Parol-77!')
        self.assertEqual(data['login_url'], 'http://testserver/admin/login/?next=/waiter/panel/')
        self.assertEqual(data['panel_label'], 'Ofitsiant paneli')
        # Keyingi ro'yxatda parol yo'q
        listing_text = self.client_owner.get(API).content.decode()
        self.assertNotIn('Yangi-Maxfiy-Parol-77!', listing_text)
        self.assertNotIn('password', listing_text.replace('generated_password', ''))
        # Audit logda ham yo'q
        for log in AuditLog.objects.filter(target_type='admin_user'):
            self.assertNotIn('Yangi-Maxfiy-Parol-77!', str(log.new_value))

    def test_create_and_patch_responses_carry_access_fields(self):
        res = self.client_owner.post(API, {'username': 'k-oshpaz2', 'role': 'kitchen'}, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['panel_path'], '/kds/')
        res = self.client_owner.patch(f"{API}{res.json()['id']}/", {'role': 'hostess'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['panel_path'], '/arrival/desk/')
        self.assertEqual(res.json()['login_url'], 'http://testserver/admin/login/?next=/arrival/desk/')

    def test_existing_fields_unchanged(self):
        row = self.listing()['k-waiter']
        for key in ('id', 'username', 'full_name', 'phone', 'role', 'role_display', 'is_active', 'date_joined', 'last_login'):
            self.assertIn(key, row)
        self.assertEqual(row['role'], 'waiter')
        self.assertEqual(row['role_display'], 'Ofitsiant')
        self.assertTrue(row['is_active'])

    def test_manager_sees_links_too(self):
        client = Client()
        client.force_login(self.users['shop_manager'])
        rows = self.listing(client)
        self.assertEqual(rows['k-waiter']['login_url'], 'http://testserver/admin/login/?next=/waiter/panel/')
