"""
Marshrut-ruxsat qo'riqchisi (TZ_SOTUVGA_TAYYORLASH P0-6).

Restoran urlconf'iga yangi yo'l qo'shilganda uning ruxsati e'tibordan chetda qolmasin: DRF'ning ochiq (AllowAny yoki o'zi
ruxsat tanlaydigan) yo'llari ro'yxati va anonim foydalanuvchiga ochiq sahifalar ro'yxati QO'LDA ko'rib chiqilgan va shu yerda
muzlatilgan. Yangi ochiq yo'l paydo bo'lsa test yiqiladi va qaror ongli qabul qilinadi (ro'yxatga qo'shiladi yoki yopiladi).
Ro'yxatdan tashqari hamma DRF yo'li anonimga 401/403/404/405 qaytarishi shart.

Eslatma: ro'yxatni "to'ldirib qo'yish" uchun emas, yangi yo'lni tekshirish uchun yangilang.
"""
import re
import uuid

from django.test import Client, TestCase
from django.urls import URLResolver, get_resolver

from backend.legacy_gate import LEGACY_RULES, READONLY, legacy_rule_for

PRODUCT = {'HTTP_X_PRODUCT': 'restaurant'}
SAMPLE = {'int': '1', 'uuid': str(uuid.uuid4()), 'slug': 'x', 'str': 'x', 'path': 'x'}

# Mehmon uchun ataylab ochiq DRF yo'llari (yoki rolga qarab o'zi ruxsat tanlaydiganlar).
PUBLIC_DRF_ROUTES = {
    'api/v1/restaurant/orders/create/',
    'api/v1/restaurant/reservations/',                   # POST ochiq, GET xodimga
    'api/v1/restaurant/reservations/find/',
    'api/v1/restaurant/menu/',
    'api/v1/restaurant/calls/',                          # POST ochiq, GET xodimga
    'api/v1/restaurant/calls/<int:call_id>/',
    'api/restaurant/admin/v1/tables/',                   # get_permissions: xodimga
    'api/restaurant/admin/v1/tables/halls/',
}
# Ochiq-yo'l ro'yxatida bo'lsa ham anonim GET 2xx BERMASLIGI shart bo'lganlar
ANON_GET_MUST_FAIL = (
    'api/v1/restaurant/reservations/',
    'api/v1/restaurant/calls/',
    'api/v1/restaurant/calls/<int:call_id>/',
    'api/restaurant/admin/v1/tables/',
    'api/restaurant/admin/v1/tables/halls/',
)
# Anonim GET ga 2xx beradigan sahifalar/API'lar (qo'lda ko'rib chiqilgan: mehmon ilovasi, kirish sahifalari, sog'lik zondlari).
PUBLIC_GET_PAGES = {
    '/', '/welcome/', '/menu/', '/restaurant/', '/restoran/', '/ar-menu/', '/ar/', '/tma/',
    '/catalog/', '/menu/catalog/', '/tma/catalog/',
    '/table/', '/reservation/', '/menu/table/', '/tma/table/',
    '/cart/', '/menu/cart/', '/tma/cart/',
    '/orders/', '/menu/orders/', '/tma/orders/',
    '/reservation/arrival/', '/reservation/find/',
    '/health/', '/health/live/', '/health/ready/',
    '/seller/login/', '/admin/login/',
    '/api/guest/v1/session/', '/api/guest/v1/welcome/', '/api/guest/v1/menu/', '/api/guest/v1/cart/',
    '/api/guest/v1/checkout/', '/api/guest/v1/orders/',
    '/api/v1/restaurant/menu/',
    '/api/v1/products/', '/api/v1/categories/',         # eski, faqat o'qish (legacy_gate READONLY); React menyusining zaxira yo'li
}
IGNORED_PREFIXES = ('/media/', '/assets/', '/djangoadmin/')   # /djangoadmin/ faqat DEBUG da ulanadi
# Faqat DEBUG/DEMO_MODE da ochiladi (web/tma_views.py ui_components_showcase: production'da 404), shuning uchun muhitga bog'liq
ENV_DEPENDENT_PAGES = {'/ui-components/', '/design-system/'}


def _walk(patterns, prefix=''):
    for p in patterns:
        route = prefix + str(p.pattern)
        if isinstance(p, URLResolver):
            yield from _walk(p.url_patterns, route)
        else:
            yield route, p.callback


def _url_for(route):
    if re.search(r'[\^\$\(\)\[\]\\]', route):      # router (regex) yo'llari: ularni darvoza testlari qoplaydi
        return None
    return '/' + re.sub(r'<(?:(\w+):)?\w+>', lambda m: SAMPLE.get(m.group(1) or 'str', 'x'), route)


def _drf_info(callback):
    cls = getattr(callback, 'cls', None)
    if cls is None or not hasattr(cls, 'permission_classes'):
        return None
    custom = any('get_permissions' in vars(k) for k in cls.__mro__ if not k.__module__.startswith('rest_framework'))
    allow_any = any(c.__name__ == 'AllowAny' for c in cls.permission_classes)
    return {'public': allow_any or custom}


def _gated(route):
    path = '/' + route
    return any(path.startswith(prefix) for prefix, _ in LEGACY_RULES)


class RoutePermissionGuardTests(TestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.routes = list(_walk(get_resolver('backend.urls_restaurant').url_patterns))

    def test_public_drf_surface_is_exactly_the_reviewed_list(self):
        found = set()
        for route, callback in self.routes:
            info = _drf_info(callback)
            if info and info['public'] and not _gated(route) and not re.search(r'<drf_format_suffix', route):
                found.add(route)
        self.assertEqual(
            found, PUBLIC_DRF_ROUTES,
            "Restoran urlconf'ida ochiq DRF yo'li o'zgardi. Yangi bo'lsa: ruxsatini ko'rib chiqing, kerak bo'lsa yoping "
            "yoki ro'yxatga ongli ravishda qo'shing.")

    def test_every_other_drf_route_denies_anonymous_users(self):
        client = Client()
        tested = 0
        bad = []
        for route, callback in self.routes:
            info = _drf_info(callback)
            if not info or route in PUBLIC_DRF_ROUTES:
                continue
            url = _url_for(route)
            if not url or url.startswith(IGNORED_PREFIXES) or '<drf_format_suffix' in route:
                continue
            readonly_public = legacy_rule_for(url) == READONLY   # eski products/categories: GET ataylab ochiq, yozuv 405
            for method in ('get', 'post', 'put', 'patch', 'delete'):
                kwargs = {} if method == 'get' else {'data': '{}', 'content_type': 'application/json'}
                resp = getattr(client, method)(url, **kwargs, **PRODUCT)
                tested += 1
                if method == 'get' and readonly_public:
                    if resp.status_code != 200:
                        bad.append((method.upper(), url, resp.status_code))
                elif resp.status_code not in (401, 403, 404, 405):
                    bad.append((method.upper(), url, resp.status_code))
        self.assertEqual(bad, [], f"Anonim foydalanuvchi himoyalangan DRF yo'lidan javob oldi: {bad}")
        self.assertGreater(tested, 100)   # qo'riqchi bo'sh aylanib qolmasin

    def test_reviewed_public_routes_with_staff_methods_deny_anonymous_get(self):
        client = Client()
        for route in ANON_GET_MUST_FAIL:
            url = _url_for(route)
            resp = client.get(url, **PRODUCT)
            self.assertIn(resp.status_code, (401, 403), f'{url} anonim GET ga {resp.status_code} berdi')

    def test_anonymous_get_2xx_pages_are_exactly_the_reviewed_list(self):
        client = Client()
        served = set()
        for route, _callback in self.routes:
            url = _url_for(route)
            if not url or url.startswith(IGNORED_PREFIXES):
                continue
            resp = client.get(url, **PRODUCT)
            if 200 <= resp.status_code < 300:
                served.add(url)
        served -= ENV_DEPENDENT_PAGES
        self.assertEqual(
            served, PUBLIC_GET_PAGES,
            "Anonim foydalanuvchiga ochiq sahifalar ro'yxati o'zgardi (yangi ochiq sahifa yoki yopilib qolgan sahifa).")
