"""
Restoran URL'lari uchun doimiy smoke test (TZ: R10-9).

`backend.urls_restaurant` dagi parametrsiz har bir manzil anonim va har bir rol bilan ochiladi: birorta ham 5xx
bo'lmasligi shart. Yangi sahifa qo'shilsa, test uni o'zi topadi (ro'yxat qo'lda yuritilmaydi).
Xodim sahifalari anonimga yopiqligi alohida tekshiriladi.
"""
import io
import re

from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.urls import get_resolver
from django.urls.resolvers import URLResolver

from accounts.models import AdminUser

URLCONF = 'backend.urls_restaurant'

# Tashqi tarmoqqa chiqadigan yoki to'lov provayderining imzosini talab qiladigan manzillar: ularga oddiy GET ma'nosiz
SKIP_PREFIXES = ('payment/callback/', 'api/payments/click', 'api/payments/payme', 'bot/', 'telegram/',
                 'api/v1/notifications/webhook/')

# Anonim foydalanuvchi bu manzillardan ma'lumot (200) ololmasligi kerak
STAFF_ONLY = (
    'kds/', 'kitchen/', 'api/kds/', 'seller/', 'djangoadmin/', 'admin/dashboard/', 'api/v1/restaurant/orders/',
    'api/v1/restaurant/tables/', 'api/v1/restaurant/finance/', 'v1/staff/',
)
PUBLIC_UNDER_STAFF_PREFIX = ('seller/login/', 'seller/register/', 'djangoadmin/login/', 'djangoadmin/jsi18n/')


SAMPLE_VALUES = {'int': '999999', 'uuid': '00000000-0000-4000-8000-000000000000', 'str': 'yoq', 'slug': 'yoq', 'path': 'yoq'}


def parameterless_urls(fill_parameters=False):
    """fill_parameters=True: <int:pk> kabi parametrlar mavjud bo'lmagan namunaviy qiymat bilan to'ldiriladi (yo'q ob'ekt)."""
    found = []

    def walk(patterns, prefix=''):
        for entry in patterns:
            part = str(entry.pattern)
            if isinstance(entry, URLResolver):
                walk(entry.url_patterns, prefix + part)
            else:
                found.append(prefix + part)

    walk(get_resolver(URLCONF).url_patterns)
    urls = set()
    for raw in found:
        url = raw.replace('^', '').replace('$', '')
        if fill_parameters:
            url = re.sub(r'<(?:(\w+):)?\w+>', lambda m: SAMPLE_VALUES.get(m.group(1) or 'str', 'yoq'), url)
            if '<' not in raw:
                continue                          # parametrsizlari yuqorida tekshiriladi
        if any(ch in url for ch in '<(?\\'):
            continue
        urls.add('/' + url.lstrip('/'))
    return sorted(urls)


@override_settings(ROOT_URLCONF=URLCONF, DEMO_MODE=False)
class RestaurantUrlSmokeTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        call_command('create_restaurant', name='Smoke', slug='smoke', owner='smoke-ega', password='Smoke-Parol-123',
                     tables=4, stdout=io.StringIO())
        for role in ('kitchen', 'hostess', 'waiter'):
            call_command('create_staff', shop='smoke', username=f'smoke-{role}', role=role,
                         password='Smoke-Parol-123', stdout=io.StringIO())
        cls.users = {
            'owner': AdminUser.objects.get(username='smoke-ega'),
            'kitchen': AdminUser.objects.get(username='smoke-kitchen'),
            'hostess': AdminUser.objects.get(username='smoke-hostess'),
            'waiter': AdminUser.objects.get(username='smoke-waiter'),
        }
        AdminUser.objects.filter(pk=cls.users['owner'].pk).update(is_approved=True)
        cls.urls = [u for u in parameterless_urls() if not u.lstrip('/').startswith(SKIP_PREFIXES)]
        cls.filled_urls = [u for u in parameterless_urls(fill_parameters=True) if not u.lstrip('/').startswith(SKIP_PREFIXES)]

    def client_for(self, role):
        client = Client(raise_request_exception=False)
        if role != 'anonymous':
            client.force_login(self.users[role])
        return client

    def test_the_walker_finds_the_restaurant_urls(self):
        # Yo'l topuvchi buzilib, 0 ta manzil tekshirib "yashil" bo'lib qolmasin
        self.assertGreater(len(self.urls), 150)
        for must in ('/menu/', '/kds/', '/seller/', '/api/v1/restaurant/menu/', '/health/'):
            self.assertIn(must, self.urls)

    def test_no_url_answers_5xx_for_any_role(self):
        failures = []
        urls = sorted(self.urls, key=lambda u: 'logout' in u)        # chiqish manzillari oxirida: sessiya oxirigacha saqlansin
        for role in ('anonymous', 'owner', 'kitchen', 'hostess', 'waiter'):
            client = self.client_for(role)
            for url in urls:
                response = client.get(url)
                if response.status_code >= 500:
                    failures.append(f'{response.status_code} {role:9} {url}')
        self.assertEqual(failures, [], '\n' + '\n'.join(failures))

    def test_staff_urls_are_closed_to_anonymous(self):
        leaks = []
        for url in self.urls:
            path = url.lstrip('/')
            if not path.startswith(STAFF_ONLY) or path.startswith(PUBLIC_UNDER_STAFF_PREFIX):
                continue
            response = self.client_for('anonymous').get(url)
            if response.status_code == 200:
                leaks.append(url)
        self.assertEqual(leaks, [], "Anonim foydalanuvchiga 200 qaytadigan xodim manzillari:\n" + '\n'.join(leaks))

    def test_urls_with_parameters_answer_404_not_5xx_for_missing_objects(self):
        self.assertGreater(len(self.filled_urls), 40)
        failures = []
        for role in ('anonymous', 'owner'):
            client = self.client_for(role)
            for url in self.filled_urls:
                response = client.get(url)
                if response.status_code >= 500:
                    failures.append(f'{response.status_code} {role:9} {url}')
        self.assertEqual(failures, [], '\n' + '\n'.join(failures))

    def test_known_edge_cases_have_the_right_status(self):
        client = self.client_for('anonymous')
        self.assertEqual(client.get('/nfc/yoq/').status_code, 404)                 # faolsiz NFC karta: 404 sahifa, 500 emas
        for url in ('/market/', '/studio/', '/3d-print/'):
            response = client.get(url)
            self.assertEqual((response.status_code, response['Location']), (302, '/'), url)   # boshqa mahsulot → menyu
        owner = self.client_for('owner')
        self.assertEqual(owner.get('/api/v1/restaurant/calls/999999/').status_code, 405)      # faqat PATCH
