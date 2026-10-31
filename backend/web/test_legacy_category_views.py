"""
Eski HTML kategoriya ko'rinishlari (`admin_category_create/edit/delete`) ruxsati (TZ §11, roadmap P2).

Avval bu uchala ko'rinish faqat `@login_required` edi: kategoriya GLOBAL (do'konlararo) bo'lgani uchun uni o'zgartirish
barcha restoranlar menyusiga ta'sir qiladi. Kategoriya API'sida (`/api/v1/categories/`, commit 1dfbd9f) yozish faqat platforma
adminiga berilgan; ko'rinishlar endi AYNAN shu qoidaga (`backend.api_permissions.is_platform_admin`) bo'ysunadi.
Ko'rinishlar va URL'lar o'chirilmagan, faqat ruxsat qo'shilgan.

Eslatma: `SellerTenantMiddleware` ofitsiant/oshpaz/hostess/menejer/egani `/admin*` yo'llaridan allaqachon boshqa panelga
yo'naltiradi (302), shuning uchun ular uchun to'siq ko'rinishning O'ZIDA yo'q edi — faqat o'sha middleware'da. Middleware
ro'yxatida bo'lmagan rollar (`support`, `courier_manager`) ko'rinishlarga to'g'ridan-to'g'ri yetib borardi.
Shu sababli ikki daraja tekshiriladi: (1) to'liq stek (HTTP), (2) ko'rinishning o'zi (middleware'siz, RequestFactory).

Bu marshrutlar `web/urls.py` da (default URLConf `backend.urls`); restoran URLConf'ida (`urls_restaurant`) ulanmagan.
"""
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.backends.db import SessionStore
from django.test import Client, RequestFactory, TestCase, override_settings

from accounts.models import AdminUser
from categories.models import Category
from web import views

# SellerTenantMiddleware /admin* dan qaytaradigan rollar va unda yo'q (ko'rinishga yetib boradigan) rollar
MIDDLEWARE_BLOCKED_ROLES = ('waiter', 'kitchen', 'hostess', 'shop_manager', 'shop_owner')
MIDDLEWARE_UNLISTED_ROLES = ('support', 'courier_manager')

FORM = {'name': 'Hack', 'name_uz': 'Hack', 'name_ru': 'Hack', 'name_en': 'Hack', 'icon': 'x',
        'color': '#112233', 'sort_order': '3', 'is_active': 'on'}


def call_view(view, user, method='post', data=None, **kwargs):
    """Ko'rinishni middleware'siz, to'g'ridan-to'g'ri chaqiradi (xabarlar saqlagichi bilan)."""
    factory = RequestFactory()
    request = getattr(factory, method)('/x/', data or {})
    request.user = user
    request.session = SessionStore()
    request._messages = FallbackStorage(request)
    return view(request, **kwargs)


@override_settings(ROOT_URLCONF='backend.urls', ALLOWED_HOSTS=['testserver', 'localhost'])
class LegacyCategoryViewPermissionTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Salatlar', name_uz='Salatlar', name_ru='Салаты', icon='x',
                                                is_restaurant=True)
        self.users = {}
        for role in MIDDLEWARE_BLOCKED_ROLES + MIDDLEWARE_UNLISTED_ROLES:
            self.users[role] = AdminUser.objects.create_user(username=f'kat-{role}', password='Parol-Kat-123',
                                                             role=role, is_approved=True)
        self.platform = AdminUser.objects.create_user(username='kat-platform', password='Parol-Kat-123',
                                                      role='super_admin', is_approved=True)
        # superuser bayrog'i bor, lekin roli oddiy (create_superuser roli 'shop_owner' qoldiradi)
        self.superuser = AdminUser.objects.create_superuser(username='kat-super', password='Super-Kat-123',
                                                            email='k@k.uz')

    def _client(self, user):
        client = Client()
        client.force_login(user)
        return client

    def assertCategoryUntouched(self):
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Salatlar')
        self.assertTrue(self.category.is_active)
        self.assertFalse(Category.objects.filter(name='Hack').exists())

    # ── 1. to'liq stek: middleware ro'yxatida bo'lmagan rollar endi 403 oladi ───────
    def test_unlisted_roles_get_403_over_http_and_nothing_changes(self):
        for role in MIDDLEWARE_UNLISTED_ROLES:
            client = self._client(self.users[role])
            self.assertEqual(client.post('/admin/categories/create/', FORM).status_code, 403, f'{role}: create')
            self.assertEqual(client.post(f'/admin/categories/{self.category.pk}/edit/', dict(FORM, name='Buzildi')).status_code,
                             403, f'{role}: edit')
            self.assertEqual(client.get(f'/admin/categories/{self.category.pk}/delete/').status_code, 403, f'{role}: delete')
        self.assertCategoryUntouched()

    def test_middleware_blocked_roles_still_cannot_change_anything_over_http(self):
        for role in MIDDLEWARE_BLOCKED_ROLES:
            client = self._client(self.users[role])
            for res in (client.post('/admin/categories/create/', FORM),
                        client.post(f'/admin/categories/{self.category.pk}/edit/', dict(FORM, name='Buzildi')),
                        client.get(f'/admin/categories/{self.category.pk}/delete/')):
                self.assertIn(res.status_code, (302, 403), role)
        self.assertCategoryUntouched()

    # ── 2. ko'rinishning o'zi (middleware'siz): hech bir xodim roli o'zgartira olmaydi ─
    def test_views_themselves_refuse_every_non_platform_role(self):
        for role, user in self.users.items():
            res = call_view(views.admin_category_create, user, data=FORM)
            self.assertEqual(res.status_code, 403, f'{role}: create')
            res = call_view(views.admin_category_edit, user, data=dict(FORM, name='Buzildi'), pk=self.category.pk)
            self.assertEqual(res.status_code, 403, f'{role}: edit')
            res = call_view(views.admin_category_delete, user, method='get', pk=self.category.pk)
            self.assertEqual(res.status_code, 403, f'{role}: delete')
        self.assertCategoryUntouched()

    def test_forms_themselves_are_not_shown_to_non_platform_roles(self):
        user = self.users['waiter']
        self.assertEqual(call_view(views.admin_category_create, user, method='get').status_code, 403)
        self.assertEqual(call_view(views.admin_category_edit, user, method='get', pk=self.category.pk).status_code, 403)

    def test_anonymous_is_still_redirected_to_login(self):
        client = Client()
        for url in ('/admin/categories/create/', f'/admin/categories/{self.category.pk}/edit/',
                    f'/admin/categories/{self.category.pk}/delete/'):
            res = client.get(url)
            self.assertEqual(res.status_code, 302, url)
            self.assertIn('login', res['Location'], url)

    # ── 3. platforma admini (API'dagi bilan bir xil qoida) o'zgartira oladi ──────────
    def test_platform_admin_can_create_edit_and_hide_category_over_http(self):
        client = self._client(self.platform)
        res = client.post('/admin/categories/create/', dict(FORM, name='Yangi kategoriya'))
        self.assertEqual(res.status_code, 302)
        self.assertTrue(Category.objects.filter(name='Yangi kategoriya').exists())
        res = client.post(f'/admin/categories/{self.category.pk}/edit/', dict(FORM, name='Yangi nom'))
        self.assertEqual(res.status_code, 302)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Yangi nom')
        res = client.get(f'/admin/categories/{self.category.pk}/delete/')
        self.assertEqual(res.status_code, 302)
        self.category.refresh_from_db()
        self.assertFalse(self.category.is_active)                  # o'chirilmaydi — yashiriladi
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_superuser_flag_is_platform_admin_like_in_the_api(self):
        """`is_platform_admin` superuser bayrog'ini ham qabul qiladi (rolidan qat'i nazar) — API bilan bir xil."""
        res = call_view(views.admin_category_edit, self.superuser, data=dict(FORM, name='Super nom'), pk=self.category.pk)
        self.assertEqual(res.status_code, 302)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Super nom')

    def test_platform_admin_sees_the_forms(self):
        client = self._client(self.platform)
        self.assertEqual(client.get('/admin/categories/create/').status_code, 200)
        self.assertEqual(client.get(f'/admin/categories/{self.category.pk}/edit/').status_code, 200)

    def test_category_list_page_stays_readable(self):
        """Ro'yxat (o'qish) o'zgarmagan: API'da ham o'qish hamma uchun ochiq."""
        self.assertEqual(self._client(self.platform).get('/admin/categories/').status_code, 200)
        self.assertEqual(self._client(self.users['support']).get('/admin/categories/').status_code, 200)

    def test_same_decision_as_category_api(self):
        """Ko'rinishlar va API bir xil qoida (`is_platform_admin`) bo'yicha qaror qiladi."""
        from backend.api_permissions import is_platform_admin
        for role, user in self.users.items():
            self.assertFalse(is_platform_admin(user), role)
        self.assertTrue(is_platform_admin(self.platform))
        self.assertTrue(is_platform_admin(self.superuser))
