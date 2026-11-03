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
from types import SimpleNamespace

from django.test import Client, TestCase, override_settings
from django.urls import URLResolver, get_resolver

from accounts.models import AdminUser
from backend.legacy_gate import LEGACY_RULES, READONLY, legacy_rule_for
from shops.models import Shop
from web.capabilities import CAPABILITY_KEYS, role_default_capabilities

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


# ─── Ruxsatlar katalogi bo'yicha marshrut matritsasi ────────────────────────────────────────────────────────────────────
def _required_keys(cls, method):
    """DRF sinfi shu HTTP usul uchun talab qiladigan katalog kalitlari (`Can_<kalit>`); ochiq yoki kalitga bog'lanmagan — bo'sh."""
    view = cls()
    view.request = SimpleNamespace(method=method.upper())      # get_permissions() faqat request.method ga qaraydi
    try:
        names = [type(perm).__name__ for perm in view.get_permissions()]
    except Exception:                                            # noqa: BLE001  (g'alati get_permissions: matritsadan chiqarib tashlanadi)
        return []
    if 'AllowAny' in names:
        return []
    return [name[len('Can_'):] for name in names if name.startswith('Can_')]


ADMIN = 'api/restaurant/admin/v1/'
# Bo'limlar → qaysi ruxsat boshqarishi (QO'LDA yozilgan, koddan olinmagan: kalit noto'g'ri bo'limga o'tib ketsa test yiqiladi).
# Tartib muhim: birinchi mos qoida ishlaydi. (regex, {usullar yoki None=hammasi}, {kalitlar})
SECTION_GUARDS = (
    (rf'^{ADMIN}staff/', None, {'staff_admin'}),
    (rf'^{ADMIN}settings/', None, {'settings_admin'}),
    (rf'^{ADMIN}finance/', None, {'finance'}),
    (rf'^{ADMIN}menu/products/<int:pk>/availability/$', None, {'stoplist'}),
    (rf'^{ADMIN}menu/', None, {'menu_admin'}),
    (rf'^{ADMIN}tables/<int:pk>/(status/|qr\.svg)$', None, {'tables_read'}),
    (rf'^{ADMIN}tables/(halls/)?$', {'get'}, {'tables_read'}),
    (rf'^{ADMIN}tables/', None, {'tables_admin'}),
    (rf'^{ADMIN}orders/<int:pk>/payment/$', None, {'pos'}),
    (rf'^{ADMIN}orders/', None, {'kds'}),
    (r'^api/v1/restaurant/finance/', None, {'finance'}),
    (r'^api/v1/restaurant/products/(<int:product_id>/)?3d-scan/$', None, {'menu_admin'}),
)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class CapabilityRouteMatrixTests(TestCase):
    """
    Katalogdagi HAR BIR ruxsat uchun, shu ruxsatni talab qiladigan HAR BIR marshrutda (DRF va HTML/JSON sahifa):
      • umuman ruxsati yo'q xodim (ofitsiant, hamma standarti olib tashlangan) — taqiqlanadi;
      • faqat shu bitta ruxsati bor xodim (standart yoki qo'shimcha) — taqiqlanmaydi.
    Yangi ruxsat yoki yangi marshrut qo'shilsa, bu matritsa avtomatik qamraydi (qo'lda ro'yxat yo'q).
    """

    @classmethod
    def setUpTestData(cls):
        cls.owner = AdminUser.objects.create_user(username='mx_owner', password='Parol-Mx-1234', role='shop_owner', is_approved=True)
        cls.shop = Shop.objects.create(name='Matritsa', slug='matritsa', owner=cls.owner, address='Guliston', latitude=40.49,
                                       longitude=68.78, is_open=True, phone='+998901112233')
        defaults = role_default_capabilities('waiter')
        cls.bare = cls._waiter('mx_bare', [], defaults)
        cls.only = {key: cls._waiter(f'mx_only_{key}', [] if key in defaults else [key], [d for d in defaults if d != key])
                    for key in CAPABILITY_KEYS}

    @classmethod
    def _waiter(cls, name, extra, revoked):
        return AdminUser.objects.create_user(username=name, password='Parol-Mx-1234', role='waiter', shop=cls.shop, is_approved=True,
                                             extra_capabilities=extra, revoked_capabilities=revoked)

    @staticmethod
    def _client(user):
        client = Client()
        client.force_login(user)
        return client

    def _guarded(self):
        """[(url, usul, {kalit}, api)] — katalog ruxsatini talab qiladigan marshrutlar."""
        found = []
        for route, callback in _walk(get_resolver('backend.urls_restaurant').url_patterns):
            url = _url_for(route)
            if not url or url.startswith(IGNORED_PREFIXES) or '<drf_format_suffix' in route or legacy_rule_for(url):
                continue
            cls = getattr(callback, 'cls', None)
            if cls is not None and hasattr(cls, 'permission_classes'):
                for method in ('get', 'post', 'put', 'patch', 'delete'):
                    keys = _required_keys(cls, method)
                    if keys:
                        found.append((url, method, set(keys), route))
            elif getattr(callback, 'staff_capabilities', None):
                for method in ('get', 'post'):
                    found.append((url, method, set(callback.staff_capabilities), route))
        return found

    def test_every_catalog_key_guards_at_least_one_route(self):
        guarded = set()
        for _url, _method, keys, _route in self._guarded():
            guarded |= keys
        # `orders_manage` marshrutni yopmaydi: u buyurtma-holat o'tkazishlarini ichkarida cheklaydi (web/test_capabilities.py tekshiradi)
        self.assertEqual(set(CAPABILITY_KEYS) - guarded - {'orders_manage'}, set(),
                         "Ruxsat katalogda bor, lekin hech qaysi marshrut uni talab qilmaydi")
        self.assertEqual(guarded - set(CAPABILITY_KEYS), set())

    def test_user_without_a_capability_is_denied_and_user_with_only_it_is_allowed(self):
        bare_client = self._client(self.bare)
        only_clients = {key: self._client(user) for key, user in self.only.items()}
        checked, bad = 0, []
        for url, method, keys, _route in self._guarded():
            kwargs = {} if method == 'get' else {'data': '{}', 'content_type': 'application/json'}
            res = getattr(bare_client, method)(url, **kwargs)
            checked += 1
            if res.status_code not in (302, 401, 403):
                bad.append(('BARE', method.upper(), url, sorted(keys), res.status_code))
            if res.status_code == 302 and '/admin/login/' not in res['Location'] and res['Location'] == url:
                bad.append(('BARE-LOOP', method.upper(), url, res['Location']))
            for key in keys:
                res = getattr(only_clients[key], method)(url, **kwargs)
                checked += 1
                denied = res.status_code in (401, 403) or (res.status_code == 302 and res['Location'].startswith(
                    ('/waiter/panel/', '/admin/login/')) and res['Location'] != url)
                if denied:
                    bad.append((f'ONLY-{key}', method.upper(), url, res.status_code, res.get('Location')))
        self.assertEqual(bad, [], 'Ruxsat matritsasi buzildi')
        self.assertGreater(checked, 150)

    def test_sections_are_guarded_by_their_own_capability(self):
        import re as _re
        matched, wrong = 0, []
        for _url, method, keys, route in self._guarded():
            for pattern, methods, expected in SECTION_GUARDS:
                if _re.search(pattern, route) and (methods is None or method in methods):
                    matched += 1
                    if keys != expected:
                        wrong.append((method.upper(), route, sorted(keys), sorted(expected)))
                    break
        self.assertEqual(wrong, [], "Bo'lim noto'g'ri ruxsat bilan himoyalangan")
        self.assertGreater(matched, 60)
