"""
Resto-Admin v1 Session API va SPA qobiq testlari (TZ: 1.1, 1.2).
"""
import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase, Client, override_settings
from django.urls import reverse

from shops.models import Shop

User = get_user_model()


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestoAdminSessionApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username='resto_owner',
            password='password123',
            role='shop_owner',
            first_name='Ali',
            last_name='Valiyev',
            is_active=True,
            is_approved=True,   # tasdiqlanmagan egasi sessiya bilan ham kira olmaydi (accounts.policy)
        )
        self.shop = Shop.objects.create(
            name='Test Oshxona',
            slug='test-oshxona',
            owner=self.owner,
            address="Guliston sh.",
            phone="+998901234567",
            latitude=40.49,
            longitude=68.78,
            public_id=uuid.uuid4(),
        )

        self.waiter = User.objects.create_user(
            username='resto_waiter',
            password='password123',
            role='waiter',
            first_name='Salim',
            is_active=True,
        )
        self.waiter.shop = self.shop
        self.waiter.save()

        self.customer = User.objects.create_user(
            username='regular_customer',
            password='password123',
            role='customer',
            is_active=True,
        )

    def test_session_unauthenticated_returns_401(self):
        res = self.client.get(reverse('resto_admin_session_api'))
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertEqual(data.get('status'), 401)
        self.assertIn('Avval tizimga kiring', data.get('detail', ''))
        self.assertEqual(res['Cache-Control'], 'no-store')

    def test_session_customer_returns_403(self):
        self.client.force_login(self.customer)
        res = self.client.get(reverse('resto_admin_session_api'))
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertEqual(data.get('status'), 403)
        self.assertIn('ruxsat berilmagan', data.get('detail', ''))

    def test_session_shop_owner_returns_tenant_uuid_and_capabilities(self):
        self.client.force_login(self.owner)
        res = self.client.get(reverse('resto_admin_session_api'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Cache-Control'], 'no-store')

        data = res.json()
        self.assertEqual(data['user']['id'], self.owner.id)
        self.assertEqual(data['user']['role'], 'shop_owner')
        self.assertEqual(data['user']['name'], 'Ali Valiyev')

        self.assertIsNotNone(data['tenant'])
        self.assertEqual(data['tenant']['id'], str(self.shop.public_id))
        self.assertEqual(data['tenant']['slug'], 'test-oshxona')
        self.assertEqual(data['tenant']['name'], 'Test Oshxona')

        # Owner has full capabilities
        caps = data['capabilities']
        self.assertIn('kds', caps)
        self.assertIn('menu_admin', caps)
        self.assertIn('finance', caps)
        self.assertIn('tables_read', caps)

        # Flags & CSRF
        self.assertIn('admin_ui', data['flags'])
        self.assertIn('csrf', data)
        self.assertTrue(len(data['csrf']) > 0)

    def test_session_waiter_has_scoped_capabilities(self):
        self.client.force_login(self.waiter)
        res = self.client.get(reverse('resto_admin_session_api'))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        caps = data['capabilities']
        self.assertIn('pos', caps)
        self.assertIn('kds', caps)
        self.assertIn('tables_read', caps)
        self.assertNotIn('finance', caps)
        self.assertNotIn('menu_admin', caps)

    def test_logout_api_terminates_session(self):
        self.client.force_login(self.owner)
        res = self.client.post(reverse('resto_admin_logout_api'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'ok': True})

        # Keyingi session so'rovi 401 bo'lishi kerak
        follow_up = self.client.get(reverse('resto_admin_session_api'))
        self.assertEqual(follow_up.status_code, 401)

    def test_spa_catchall_redirects_unauthenticated(self):
        res = self.client.get('/ra/orders')
        self.assertEqual(res.status_code, 302)
        self.assertIn('/admin/login/?next=/ra/orders', res.url)

    def test_spa_catchall_renders_template_for_staff(self):
        self.client.force_login(self.owner)
        res = self.client.get('/ra/orders')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, '<div id="root"></div>')
        self.assertContains(res, 'Resto Admin')
        # Hash'li nomlar manifest orqali to'g'ri render bo'lganini tekshiramiz
        self.assertContains(res, '/static/admins/resto/assets/index.')
        self.assertContains(res, '.js')
        self.assertContains(res, '.css')

    def test_dashboard_summary_api(self):
        # 1. Unauthenticated -> 401
        res = self.client.get(reverse('resto_admin_dashboard_summary_api'))
        self.assertEqual(res.status_code, 401)

        # 2. Authenticated owner -> 200
        self.client.force_login(self.owner)
        res = self.client.get(reverse('resto_admin_dashboard_summary_api'))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('today_revenue', data)
        self.assertIn('active_orders', data)
        self.assertIn('occupied_tables', data)
        self.assertIn('total_tables', data)
        self.assertIn('out_of_stock_count', data)
        self.assertIn('top_dishes', data)
        self.assertIsInstance(data['top_dishes'], list)

    def test_dashboard_summary_api_waiter_cannot_see_money_fields(self):
        self.client.force_login(self.waiter)
        res = self.client.get(reverse('resto_admin_dashboard_summary_api'))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotIn('today_revenue', data)
        self.assertNotIn('average_check', data)
        for dish in data.get('top_dishes', []):
            self.assertNotIn('total_sum', dish)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class RestoSpaRoleRedirectTests(TestCase):
    """/ra/ boshqaruv paneli faqat egasi/boshqaruvchiga: ofitsiant, oshxona va hostess o'z ish sahifasiga yo'naltiriladi."""

    def setUp(self):
        import io
        from django.core.management import call_command
        call_command('create_restaurant', name='Rol Restorani', slug='rol-r', owner='rol-r-ega',
                     password='Rol-parol-12345', tables=2, stdout=io.StringIO())
        from shops.models import Shop
        self.shop = Shop.objects.get(slug='rol-r')

    def login(self, username, role=None):
        from django.test import Client
        from accounts.models import AdminUser
        if role:
            user = AdminUser.objects.create_user(username=username, password='Rol-parol-1', role=role, shop=self.shop,
                                                 is_staff=True, is_approved=True)
        else:
            user = AdminUser.objects.get(username=username)
            user.is_approved = True
            user.save(update_fields=['is_approved'])
        client = Client()
        client.force_login(user)
        return client

    def test_owner_opens_the_panel(self):
        res = self.login('rol-r-ega').get('/ra/')
        self.assertEqual(res.status_code, 200)

    def test_other_roles_are_sent_to_their_own_page(self):
        for role, expected in (('waiter', '/waiter/panel/'), ('kitchen', '/kds/'), ('hostess', '/arrival/desk/')):
            res = self.login(f'rol-r-{role}', role).get('/ra/menu')
            self.assertEqual(res.status_code, 302, role)
            self.assertEqual(res['Location'], expected, role)
