"""
Multi-tenant asos testlari (TZ_MULTITENANT Bosqich 0): subdomen qoidalari, host tasnifi, TenantMiddleware jadvali,
localhost xatti-harakati o'zgarmasligi, cookie host-only, X-Forwarded-Host/X-Product xavfsizligi.
"""
import json
import os
import subprocess
import sys

from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import HttpResponse
from django.test import Client, RequestFactory, SimpleTestCase, TestCase, override_settings

from backend.middleware import MultiProductHostPortMiddleware
from backend.tenancy import TenantMiddleware
from shops import tenancy
from shops.models import Shop
from shops.test_tenant_kit import PASSWORD, make_tenant, tenant_settings


class SubdomainRuleTests(SimpleTestCase):

    def test_valid_labels(self):
        for value in ('alfa', 'a-b', 'abc', 'bahor-1', 'x' * 40, '123', 'a1b'):
            self.assertIsNone(tenancy.subdomain_problem(value), value)

    def test_invalid_labels(self):
        for value in ('', None, '  ', 'ab', 'x' * 41, '-abc', 'abc-', 'ab_c', 'ab.c', 'ab c', 'abç', 'xn--abc', 'ab--cd', 'тест'):
            self.assertIsNotNone(tenancy.subdomain_problem(value), repr(value))

    def test_reserved_words_are_rejected(self):
        for value in ('www', 'app', 'admin', 'api', 'static', 'media', 'platform', 'mail', 'ftp', 'ns1', 'ns2', 'cdn', 'help',
                      'support', 'dashboard', 'ra', 'seller', 'shop', 'test', 'demo', 'WWW', ' Admin '):
            self.assertIsNotNone(tenancy.subdomain_problem(value), value)
        with self.assertRaises(ValidationError):
            tenancy.validate_subdomain('admin')

    @override_settings(TENANT_RESERVED_SUBDOMAINS=['vip'])
    def test_reserved_list_can_be_extended_by_settings_but_not_reduced(self):
        self.assertIsNotNone(tenancy.subdomain_problem('vip'))
        self.assertIsNotNone(tenancy.subdomain_problem('admin'))

    def test_normalize_and_slug_conversion(self):
        self.assertEqual(tenancy.normalize_subdomain('  AlFa '), 'alfa')
        self.assertIsNone(tenancy.normalize_subdomain('   '))
        self.assertEqual(tenancy.slug_to_subdomain('Registon_Lounge'), 'registon-lounge')
        self.assertEqual(tenancy.slug_to_subdomain('a--b'), 'a-b')
        self.assertIsNone(tenancy.slug_to_subdomain('ab'))          # qisqa
        self.assertIsNone(tenancy.slug_to_subdomain('demo'))        # band so'z
        self.assertIsNone(tenancy.slug_to_subdomain('тест'))        # lotin harfsiz


class ClassifyHostTests(SimpleTestCase):

    @override_settings(PLATFORM_DOMAIN='menyu.uz')
    def test_host_table(self):
        cases = {
            'menyu.uz': ('platform', None), 'MENYU.UZ:8000': ('platform', None),
            'www.menyu.uz': ('platform', None), 'app.menyu.uz': ('platform', None),
            'bahor.menyu.uz': ('tenant', 'bahor'), 'BAHOR.Menyu.uz:443': ('tenant', 'bahor'),
            'a.b.menyu.uz': ('invalid', 'a.b'), 'admin.menyu.uz': ('invalid', 'admin'), 'x.menyu.uz': ('invalid', 'x'),
            'evilmenyu.uz': ('legacy', None), 'menyu.uz.evil.com': ('legacy', None),
            'localhost': ('legacy', None), '127.0.0.1:8000': ('legacy', None), 'testserver': ('legacy', None),
            '[::1]:8000': ('legacy', None),
            'bahor.menyu.uz.': ('tenant', 'bahor'), 'bahor.menyu.uz.:443': ('tenant', 'bahor'), 'menyu.uz.': ('platform', None),
        }
        for host, expected in cases.items():
            self.assertEqual(tenancy.classify_host(host), expected, host)

    @override_settings(PLATFORM_DOMAIN='')
    def test_everything_is_legacy_when_platform_domain_is_empty(self):
        for host in ('bahor.menyu.uz', 'localhost', 'menyu.uz'):
            self.assertEqual(tenancy.classify_host(host), ('legacy', None))
        self.assertFalse(tenancy.tenancy_enabled())

    @override_settings(PLATFORM_DOMAIN='https://Menyu.uz:8000/')
    def test_platform_domain_setting_is_normalised_defensively(self):
        self.assertEqual(tenancy.platform_domain(), 'menyu.uz')


class ShopTenancyFieldTests(TestCase):

    def _shop(self, **kw):
        base = dict(name='S', slug=kw.pop('slug', 's1'), address='A', phone='+998900000000', latitude=1, longitude=1)
        base.update(kw)
        return Shop(**base)

    def test_defaults(self):
        shop = self._shop()
        shop.save()
        self.assertEqual((shop.business_type, shop.status), ('restaurant', 'active'))
        self.assertIsNone(shop.subdomain)

    def test_subdomain_is_lowercased_and_blank_becomes_null(self):
        a = self._shop(slug='a1', subdomain='  AlFa ')
        a.save()
        self.assertEqual(a.subdomain, 'alfa')
        b = self._shop(slug='b1', subdomain='')
        b.save()
        c = self._shop(slug='c1', subdomain='   ')
        c.save()
        self.assertIsNone(b.subdomain)
        self.assertIsNone(c.subdomain)             # bir nechta bo'sh qiymat unique'ni buzmaydi

    def test_subdomain_is_unique_case_insensitively_via_validation(self):
        self._shop(slug='a2', subdomain='alfa').save()
        dup = self._shop(slug='b2', subdomain='ALFA')
        with self.assertRaises(ValidationError) as ctx:
            dup.full_clean(exclude=['image'])
        self.assertIn('subdomain', ctx.exception.message_dict)

    def test_full_clean_rejects_reserved_and_malformed(self):
        for value in ('admin', 'ab', 'bad_name', '-x-'):
            shop = self._shop(slug='r1', subdomain=value)
            with self.assertRaises(ValidationError) as ctx:
                shop.full_clean(exclude=['image'])
            self.assertIn('subdomain', ctx.exception.message_dict, value)

    def test_status_and_business_type_choices(self):
        shop = self._shop(slug='ch1', status='weird')
        with self.assertRaises(ValidationError) as ctx:
            shop.full_clean(exclude=['image'])
        self.assertIn('status', ctx.exception.message_dict)
        for bt in ('restaurant', 'cafe', 'banquet'):
            shop = self._shop(slug=f'ok-{bt}', business_type=bt)
            shop.full_clean(exclude=['image'])


@tenant_settings()
class TenantMiddlewareTests(TestCase):
    """Host -> natija jadvali (backend/tenancy.py hujjatidagi jadval)."""

    @classmethod
    def setUpTestData(cls):
        cls.a = make_tenant('alfa', 'ALFA')
        cls.b = make_tenant('bravo', 'BRAVO')
        cls.s = make_tenant('gamma', 'GAMMA', status='suspended')

    def _run(self, host, path='/menu/', **extra):
        """Middleware'ni to'g'ridan-to'g'ri ishlatib so'rov atributlarini qaytaradi."""
        seen = {}

        def view(request):
            seen['tenant_shop'] = request.tenant_shop
            seen['tenant'] = request.tenant
            seen['is_platform_host'] = request.is_platform_host
            seen['current'] = tenancy.current_tenant()
            return HttpResponse('ok')

        request = RequestFactory().get(path, HTTP_HOST=host, **extra)
        response = TenantMiddleware(view)(request)
        seen['response'] = response
        seen['current_after'] = tenancy.current_tenant()
        return seen

    def test_active_tenant_host_sets_tenant_attributes(self):
        r = self._run('alfa.platform.test')
        self.assertEqual(r['response'].status_code, 200)
        self.assertEqual(r['tenant_shop'].pk, self.a.shop.pk)
        self.assertEqual(r['tenant'], {'shop_id': self.a.shop.pk, 'subdomain': 'alfa'})
        self.assertFalse(r['is_platform_host'])
        self.assertEqual(r['current'].pk, self.a.shop.pk)
        self.assertIsNone(r['current_after'], "so'rov tugagach tenant tozalanishi shart")

    def test_host_is_case_and_port_insensitive(self):
        for host in ('ALFA.Platform.Test', 'alfa.platform.test:8000', 'Alfa.platform.test:443'):
            self.assertEqual(self._run(host)['tenant_shop'].pk, self.a.shop.pk, host)

    def test_apex_www_app_are_platform_hosts_without_tenant(self):
        for host in ('platform.test', 'www.platform.test', 'app.platform.test', 'platform.test:8000'):
            r = self._run(host)
            self.assertEqual(r['response'].status_code, 200, host)
            self.assertIsNone(r['tenant_shop'], host)
            self.assertIsNone(r['tenant'], host)
            self.assertTrue(r['is_platform_host'], host)

    def test_unknown_malformed_reserved_and_nested_subdomains_are_404(self):
        for host in ('nope.platform.test', 'a.b.platform.test', 'admin.platform.test', 'x.platform.test', 'zz--yy.platform.test'):
            r = self._run(host)
            self.assertEqual(r['response'].status_code, 404, host)
            self.assertIsNone(r['current_after'])

    def test_suspended_tenant_is_503_and_never_reaches_the_view(self):
        r = self._run('gamma.platform.test')
        self.assertEqual(r['response'].status_code, 503)
        self.assertNotIn('tenant_shop', r)
        self.assertIn("Bu restoran", r['response'].content.decode())
        self.assertEqual(r['response']['Retry-After'], '3600')

    def test_unlisted_hosts_keep_legacy_behaviour_even_with_platform_domain(self):
        for host in ('localhost', '127.0.0.1:8000', 'testserver'):
            r = self._run(host)
            self.assertEqual(r['response'].status_code, 200, host)
            self.assertIsNone(r['tenant_shop'], host)
            self.assertFalse(r['is_platform_host'], host)

    @override_settings(PLATFORM_DOMAIN='')
    def test_platform_domain_empty_disables_everything(self):
        for host in ('alfa.platform.test', 'nope.platform.test', 'gamma.platform.test'):
            r = self._run(host)
            self.assertEqual(r['response'].status_code, 200, host)
            self.assertIsNone(r['tenant_shop'], host)

    def test_exempt_paths_skip_tenant_resolution(self):
        for path in ('/media/x.jpg', '/static/x.css', '/assets/x.js', '/health/', '/favicon.ico'):
            r = self._run('nope.platform.test', path=path)
            self.assertEqual(r['response'].status_code, 200, path)
            self.assertIsNone(r['tenant_shop'], path)

    def test_tenant_is_cleared_even_if_the_view_raises(self):
        def boom(request):
            raise RuntimeError('x')
        request = RequestFactory().get('/menu/', HTTP_HOST='alfa.platform.test')
        with self.assertRaises(RuntimeError):
            TenantMiddleware(boom)(request)
        self.assertIsNone(tenancy.current_tenant())

    def test_disallowed_host_is_400(self):
        resp = Client().get('/menu/', HTTP_HOST='evil.example.org')
        self.assertEqual(resp.status_code, 400)
        # Noto'g'ri belgili host (underscore) Django tomonidan rad etiladi (RFC 1034/1035), tenant tekshiruvigacha
        resp = Client().get('/menu/', HTTP_HOST='bad_name.platform.test')
        self.assertEqual(resp.status_code, 400)

    def test_trailing_dot_host_cannot_bypass_the_tenant_check(self):
        resp = Client().get('/welcome/', HTTP_HOST='nope.platform.test.')
        self.assertIn(resp.status_code, (400, 404))             # Django rad etadi yoki tenant 404; hech qachon "oddiy host" emas
        r = self._run('alfa.platform.test.')
        self.assertEqual(r['tenant_shop'].pk, self.a.shop.pk)

    def test_x_forwarded_host_is_ignored_by_default(self):
        """Mijoz `X-Forwarded-Host` bilan boshqa tenant hostini ko'rsata olmaydi (USE_X_FORWARDED_HOST=False)."""
        self.assertFalse(settings.USE_X_FORWARDED_HOST)
        r = self._run('alfa.platform.test', HTTP_X_FORWARDED_HOST='bravo.platform.test')
        self.assertEqual(r['tenant_shop'].pk, self.a.shop.pk)

    @override_settings(USE_X_FORWARDED_HOST=True)
    def test_x_forwarded_host_is_honoured_only_when_explicitly_enabled_and_still_validated(self):
        r = self._run('alfa.platform.test', HTTP_X_FORWARDED_HOST='bravo.platform.test')
        self.assertEqual(r['tenant_shop'].pk, self.b.shop.pk)
        resp = Client().get('/menu/', HTTP_HOST='alfa.platform.test', HTTP_X_FORWARDED_HOST='evil.example.org')
        self.assertEqual(resp.status_code, 400)             # ALLOWED_HOSTS tekshiruvi baribir ishlaydi

    def test_djangoadmin_is_closed_on_tenant_hosts_but_open_on_platform_host(self):
        c = Client()
        self.assertEqual(c.get('/djangoadmin/', HTTP_HOST='alfa.platform.test').status_code, 404)
        self.assertIn(c.get('/djangoadmin/', HTTP_HOST='platform.test').status_code, (200, 302))

    def test_integration_pages_status_codes(self):
        c = Client()
        self.assertEqual(c.get('/welcome/', HTTP_HOST='alfa.platform.test').status_code, 200)
        self.assertEqual(c.get('/welcome/', HTTP_HOST='nope.platform.test').status_code, 404)
        resp = c.get('/welcome/', HTTP_HOST='gamma.platform.test')
        self.assertEqual(resp.status_code, 503)
        self.assertIn("Bu restoran hozir faol emas", resp.content.decode())
        self.assertEqual(c.get('/health/', HTTP_HOST='nope.platform.test').status_code, 200)

    def test_suspension_takes_effect_and_is_reversible(self):
        c = Client()
        Shop.objects.filter(pk=self.a.shop.pk).update(status='suspended')
        self.assertEqual(c.get('/welcome/', HTTP_HOST='alfa.platform.test').status_code, 503)
        Shop.objects.filter(pk=self.a.shop.pk).update(status='active')
        self.assertEqual(c.get('/welcome/', HTTP_HOST='alfa.platform.test').status_code, 200)
        self.assertTrue(Shop.objects.filter(pk=self.a.shop.pk).exists(), "to'xtatish ma'lumotni o'chirmaydi")


@tenant_settings()
class TenantRoutingSecurityTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.a = make_tenant('alfa', 'ALFA')
        make_tenant('shopmodel', 'SHOPMODEL')          # 'shop' va 'model' so'zlari bor: avval bozor/studiya deb adashtirilardi

    def _product_code(self, host, **extra):
        request = RequestFactory().get('/menu/', HTTP_HOST=host, **extra)
        MultiProductHostPortMiddleware(lambda r: None).process_request(request)
        return request.product_code, getattr(request, 'urlconf', None)

    def test_tenant_host_is_always_restaurant_whatever_the_name_or_header(self):
        for host in ('alfa.platform.test', 'shopmodel.platform.test', 'platform.test', 'www.platform.test'):
            self.assertEqual(self._product_code(host)[0], 'restaurant', host)
            for header in ('market', 'studio'):
                code, urlconf = self._product_code(host, HTTP_X_PRODUCT=header)
                self.assertEqual((code, urlconf), ('restaurant', 'backend.urls_restaurant'), (host, header))

    def test_legacy_hosts_are_unchanged(self):
        self.assertEqual(self._product_code('testserver')[0], 'default')
        self.assertEqual(self._product_code('testserver', HTTP_X_PRODUCT='market')[0], 'market')
        self.assertEqual(self._product_code('localhost:8002')[0], 'default')

    @override_settings(LEGACY_API_ENABLED=True)
    def test_legacy_api_stays_closed_on_tenant_hosts_even_when_the_flag_is_on(self):
        c = Client()
        for path in ('/api/v1/orders/', '/api/v1/shops/', '/api/v1/accounts/auth/login/', '/v1/menu/alfa/'):
            self.assertEqual(c.get(path, HTTP_HOST='alfa.platform.test').status_code, 404, path)
            self.assertEqual(c.get(path, HTTP_HOST='platform.test').status_code, 404, path)

    @override_settings(LEGACY_API_ENABLED=True)
    def test_legacy_flag_still_works_on_plain_hosts(self):
        resp = Client().get('/api/v1/shops/', HTTP_X_PRODUCT='restaurant')
        self.assertNotEqual(resp.status_code, 404, "PLATFORM_DOMAIN'ga tegishli bo'lmagan hostda flag avvalgidek ishlaydi")


@tenant_settings()
class TenantCookieTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.a = make_tenant('alfa', 'ALFA')

    def test_cookie_domain_settings_are_not_set(self):
        """Cookie host-only: SESSION_COOKIE_DOMAIN / CSRF_COOKIE_DOMAIN qo'yilsa hamma subdomenlar sessiyani bo'lishardi."""
        self.assertIsNone(settings.SESSION_COOKIE_DOMAIN)
        self.assertIsNone(settings.CSRF_COOKIE_DOMAIN)
        self.assertIsNone(settings.LANGUAGE_COOKIE_DOMAIN)

    def test_login_cookie_has_no_domain_attribute(self):
        resp = Client().post('/admin/login/', {'username': 'alfa_owner', 'password': PASSWORD}, HTTP_HOST='alfa.platform.test')
        self.assertEqual(resp.status_code, 302)
        for name in (settings.SESSION_COOKIE_NAME, settings.CSRF_COOKIE_NAME, 'language'):
            if name in resp.cookies:
                self.assertEqual(resp.cookies[name]['domain'], '', name)
        self.assertIn(settings.SESSION_COOKIE_NAME, resp.cookies)

    def test_session_of_one_tenant_is_not_valid_on_another_host(self):
        """Brauzer cookie'ni boshqa hostga yubormaydi; yuborsa ham (qo'lda) boshqa tenantda tizimga kirmagan hisoblanadi."""
        make_tenant('bravo', 'BRAVO')
        c = Client()
        c.post('/admin/login/', {'username': 'alfa_owner', 'password': PASSWORD}, HTTP_HOST='alfa.platform.test')
        self.assertEqual(c.get('/api/restaurant/admin/v1/session/', HTTP_HOST='alfa.platform.test').status_code, 200)
        self.assertEqual(c.get('/api/restaurant/admin/v1/session/', HTTP_HOST='bravo.platform.test').status_code, 401)


class SettingsEnvTests(SimpleTestCase):
    """ALLOWED_HOSTS / CSRF_TRUSTED_ORIGINS env orqali (sozlamalar import paytida hisoblanadi: alohida jarayon)."""

    def _settings_for(self, **env):
        base = {'PATH': os.environ.get('PATH', ''), 'HOME': os.environ.get('HOME', ''), 'DJANGO_SKIP_DOTENV': '1',
                'DJANGO_SETTINGS_MODULE': 'backend.settings'}
        base.update(env)
        code = ("import json, django; from django.conf import settings; "
                "print(json.dumps({'hosts': settings.ALLOWED_HOSTS, 'csrf': settings.CSRF_TRUSTED_ORIGINS, "
                "'pd': settings.PLATFORM_DOMAIN, 'xfh': settings.USE_X_FORWARDED_HOST, 'sd': settings.SESSION_COOKIE_DOMAIN, "
                "'cd': settings.CSRF_COOKIE_DOMAIN}))")
        out = subprocess.run([sys.executable, '-c', code], env=base, capture_output=True, text=True, cwd=str(settings.BASE_DIR), check=True)
        return json.loads(out.stdout.strip().splitlines()[-1])

    def test_platform_domain_adds_wildcard_host_and_csrf_origin(self):
        data = self._settings_for(DEBUG='True', PLATFORM_DOMAIN='Menyu.UZ')
        self.assertEqual(data['pd'], 'menyu.uz')
        self.assertIn('.menyu.uz', data['hosts'])
        self.assertIn('https://*.menyu.uz', data['csrf'])
        self.assertIn('https://menyu.uz', data['csrf'])
        self.assertIsNone(data['sd'])
        self.assertIsNone(data['cd'])
        self.assertFalse(data['xfh'])

    def test_production_mode_gets_https_only_origins(self):
        data = self._settings_for(
            DEBUG='False', PLATFORM_DOMAIN='menyu.uz', ALLOWED_HOSTS='menyu.uz', DJANGO_SECRET_KEY='k' * 60,
            DATABASE_URL='postgres://u:p@localhost:5432/d', SECURE_BEHIND_PROXY='True')
        self.assertIn('.menyu.uz', data['hosts'])
        self.assertIn('https://*.menyu.uz', data['csrf'])
        self.assertFalse(any(o.startswith('http://') for o in data['csrf']), data['csrf'])

    def test_empty_platform_domain_changes_nothing(self):
        data = self._settings_for(DEBUG='True', ALLOWED_HOSTS='localhost,127.0.0.1')
        self.assertEqual(data['pd'], '')
        self.assertEqual(data['hosts'], ['localhost', '127.0.0.1'])
        self.assertFalse(any('*.' in o for o in data['csrf']))
