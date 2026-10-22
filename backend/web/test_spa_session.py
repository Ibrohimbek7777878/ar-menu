"""
React paneli roli faqat server sessiyasidan (TZ: R1-9).
"""
import io
import json
import re

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from shops.models import Shop
from web.restaurant_auth import spa_session


def session_in(html):
    match = re.search(r'window\.__GULISTON_SESSION__ = (\{.*?\});</script>', html)
    assert match, 'sahifada __GULISTON_SESSION__ yo\'q'
    return json.loads(match.group(1))


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class SpaSessionTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Rol Restorani', slug='rol', owner='rol-ega',
                     password='Rol-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='rol')
        self.owner = AdminUser.objects.get(username='rol-ega')
        self.waiter = AdminUser.objects.create_user(username='rol-ofitsiant', password='Ofitsiant-1', role='waiter',
                                                    shop=self.shop, is_staff=True)

    def login(self, user):
        client = Client()
        client.force_login(user)
        return client

    def test_guest_page_says_guest_and_not_demo(self):
        data = session_in(Client().get('/menu/').content.decode())
        self.assertEqual(data, {'role': 'guest', 'roles': [], 'demo': False})

    def test_owner_is_admin_on_staff_pages(self):
        client = self.login(self.owner)
        for url in ('/kds/', '/menu/'):
            data = session_in(client.get(url, follow=True).content.decode())
            self.assertEqual((data['role'], data['roles']), ('admin', ['admin']), url)

    def test_super_admin_dashboard_carries_the_admin_session(self):
        boss = AdminUser.objects.create_user(username='bosh-admin', password='Bosh-parol-1', role='super_admin',
                                             is_staff=True)
        data = session_in(self.login(boss).get('/admin/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('admin', ['admin']))

    def test_each_staff_role_gets_exactly_its_own_panel(self):
        kitchen = AdminUser.objects.create_user(username='rol-oshpaz', password='Oshpaz-1', role='kitchen', shop=self.shop)
        hostess = AdminUser.objects.create_user(username='rol-hostess', password='Hostess-1', role='hostess', shop=self.shop)
        data = session_in(self.login(self.waiter).get('/waiter/panel/').content.decode())
        self.assertEqual((data['role'], data['roles'], data['name']), ('waiter', ['waiter'], 'rol-ofitsiant'))
        data = session_in(self.login(kitchen).get('/kds/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('kitchen', ['kitchen']))
        data = session_in(self.login(hostess).get('/arrival/desk/').content.decode())
        self.assertEqual((data['role'], data['roles']), ('hostess', ['hostess']))

    def test_a_non_staff_account_is_a_guest(self):
        customer = AdminUser.objects.create_user(username='oddiy', password='Oddiy-parol-1', role='support')
        data = session_in(self.login(customer).get('/menu/').content.decode())
        self.assertEqual(data['role'], 'guest')

    def test_inactive_staff_is_a_guest(self):
        self.waiter.is_active = False
        self.waiter.save(update_fields=['is_active'])
        request = type('R', (), {'user': self.waiter})()
        self.assertEqual(spa_session(request)['role'], 'guest')

    @override_settings(DEMO_MODE=True)
    def test_demo_flag_is_forwarded_so_legacy_grants_only_work_in_demo(self):
        self.assertTrue(session_in(Client().get('/menu/').content.decode())['demo'])

    def test_name_cannot_break_out_of_the_script_tag(self):
        self.waiter.first_name = '</script><script>alert(1)</script>'
        self.waiter.save(update_fields=['first_name'])
        html = self.login(self.waiter).get('/waiter/panel/').content.decode()
        self.assertNotIn('</script><script>alert(1)', html)
        self.assertEqual(session_in(html)['name'], '</script><script>alert(1)</script>')
