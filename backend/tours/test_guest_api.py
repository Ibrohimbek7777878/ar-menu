"""Mehmon sayri: `GET /api/restaurant/guest/tour/` va `/tour/` sahifasi. Faqat e'lon qilinganlar, tenant ajratilishi, bo'lim (modul) kaliti, so'rovlar soni."""
from django.db import connection
from django.test import Client, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from tables_restaurant.models import Hall
from tours.models import Tour, TourHotspot, TourStop
from tours.testkit import GUEST, TourTestCase

ENABLED_KEYS = {'enabled', 'title', 'hall_name', 'duration', 'width', 'height', 'video', 'stops', 'hotspots'}
HOTSPOT_KEYS = {'id', 'table_id', 'table_number', 'capacity', 'label', 't_start', 't_end', 'x', 'y'}


class GuestBase(TourTestCase):

    def guest(self, tenant=None, path=GUEST, **extra):
        return Client().get(path, HTTP_HOST=(tenant or self.A).host, **extra)

    def published(self, tenant=None, **kw):
        """E'lon qilingan sayr (bazaga to'g'ridan-to'g'ri yoziladi, shuning uchun server keshi qo'lda tozalanadi)."""
        from django.core.cache import cache
        tour = self.ready_tour(tenant=tenant, **kw)
        Tour.objects.filter(pk=tour.pk).update(status=Tour.PUBLISHED)
        cache.clear()
        return Tour.objects.get(pk=tour.pk)

    def add_children(self, tour, tenant=None):
        tenant = tenant or self.A
        TourStop.objects.bulk_create([TourStop(tour=tour, order=1, title='Zal', t=8.5), TourStop(tour=tour, order=0, title='Kirish', t=0)])
        TourHotspot.objects.create(tour=tour, table=tenant.table1, t_start=3, t_end=6.5, x=0.52, y=0.61)
        TourHotspot.objects.create(tour=tour, table=tenant.table2, t_start=9, t_end=12, x=0.2, y=0.3)

    def set_modules(self, tenant, **modules):
        shop = tenant.shop
        profile = dict(shop.business_profile or {})
        profile['brand'] = {**profile.get('brand', {}), 'modules': modules}
        shop.business_profile = profile
        shop.save(update_fields=['business_profile'])


class DisabledStatesTests(GuestBase):

    def test_no_tour_means_enabled_false_and_nothing_else(self):
        resp = self.guest()
        self.assertEqual((resp.status_code, resp.json()), (200, {'enabled': False}))

    def test_only_published_tours_are_visible(self):
        for status in (Tour.DRAFT, Tour.PROCESSING, Tour.READY, Tour.FAILED):
            tour = self.ready_tour(status=status, title=status)
            self.assertEqual(self.guest().json(), {'enabled': False}, status)
            tour.delete()
        self.published(title='Ko\'rinadi')
        self.assertEqual(self.guest().json()['title'], "Ko'rinadi")

    def test_archived_tour_is_not_visible_even_if_the_row_says_published(self):
        tour = self.published()
        Tour.objects.filter(pk=tour.pk).update(is_archived=True)
        from django.core.cache import cache
        cache.clear()
        self.assertEqual(self.guest().json(), {'enabled': False})

    def test_module_switched_off_in_the_brand_hides_the_tour(self):
        self.published()
        self.assertTrue(self.guest().json()['enabled'])
        self.set_modules(self.A, menu=True, tour=False)
        self.assertEqual(self.guest().json(), {'enabled': False})
        self.set_modules(self.A, menu=True, tour=True)
        self.assertTrue(self.guest().json()['enabled'])

    def test_module_setting_defaults_to_on_when_never_touched(self):
        self.assertNotIn('brand', self.A.shop.business_profile or {})
        self.published()
        self.assertTrue(self.guest().json()['enabled'])

    def test_platform_apex_host_never_shows_a_tour(self):
        self.published()
        resp = Client().get(GUEST, HTTP_HOST='platform.test')
        self.assertEqual((resp.status_code, resp.json()), (200, {'enabled': False}))


class PayloadTests(GuestBase):

    def test_enabled_payload_has_exactly_the_contract_keys_and_values(self):
        tour = self.published(duration=44.6, title='Asosiy zal')
        self.add_children(tour)
        data = self.guest().json()
        self.assertEqual(set(data), ENABLED_KEYS)
        self.assertEqual((data['enabled'], data['title'], data['duration'], data['width'], data['height']), (True, 'Asosiy zal', 44.6, 720, 1280))
        self.assertEqual(set(data['video']), {'scrub', 'play', 'low', 'poster'})
        self.assertTrue(all(url.startswith('/media/tours/shop_') for url in data['video'].values()))
        self.assertEqual([(s['title'], s['t']) for s in data['stops']], [('Kirish', 0), ('Zal', 8.5)])
        self.assertEqual(set(data['stops'][0]), {'id', 'title', 't'})
        self.assertEqual(set(data['hotspots'][0]), HOTSPOT_KEYS)
        first = data['hotspots'][0]
        self.assertEqual((first['table_id'], first['table_number'], first['capacity'], first['t_start'], first['t_end'], first['x'], first['y']),
                         (self.A.table1.pk, '1', 4, 3, 6.5, 0.52, 0.61))

    def test_hall_name_is_empty_without_a_hall_and_the_name_with_one(self):
        self.published()
        self.assertEqual(self.guest().json()['hall_name'], '')
        Tour.objects.filter(shop=self.A.shop).delete()
        self.published(hall=self.A.hall)
        self.assertEqual(self.guest().json()['hall_name'], self.A.hall.name)

    def test_hidden_or_deleted_tables_are_not_bookable_so_their_marks_disappear(self):
        tour = self.published()
        self.add_children(tour)
        TourHotspot.objects.create(tour=tour, label='Bar', t_start=1, t_end=2, x=0.9, y=0.9)          # stolsiz yozuvli belgi qoladi
        self.A.table2.delete()
        marks = self.guest().json()['hotspots']
        self.assertEqual(sorted((m['table_number'], m['label']) for m in marks), [('', 'Bar'), ('1', '')])
        bar = next(m for m in marks if m['label'] == 'Bar')
        self.assertEqual((bar['table_id'], bar['capacity']), (None, None))

    def test_two_published_tours_for_two_halls_default_to_the_hall_less_one_and_hall_param_selects(self):
        hall2 = Hall.objects.create(shop=self.A.shop, name='VIP zal')
        self.published(title='Zalsiz')
        self.published(title='VIP', hall=hall2)
        self.assertEqual(self.guest().json()['title'], 'Zalsiz')
        self.assertEqual(self.guest(path=GUEST + f'?hall={hall2.pk}').json()['title'], 'VIP')
        self.assertEqual(self.guest(path=GUEST + '?hall=abc').json()['title'], 'Zalsiz')
        self.assertEqual(self.guest(path=GUEST + '?hall=999999').json(), {'enabled': False})
        self.assertEqual(self.guest(path=GUEST + f'?hall={self.B.hall.pk}').json(), {'enabled': False})      # begona zal: hech narsa

    def test_publishing_another_tour_switches_the_guest_view_at_once(self):
        first, second = self.ready_tour(title='1'), self.ready_tour(title='2')
        self.admin('post', f'{first.pk}/publish/')
        self.assertEqual(self.guest().json()['title'], '1')
        self.admin('post', f'{second.pk}/publish/')
        self.assertEqual(self.guest().json()['title'], '2')
        self.admin('post', f'{second.pk}/unpublish/')
        self.assertEqual(self.guest().json(), {'enabled': False})

    def test_editing_stops_and_hotspots_is_visible_at_once_despite_the_cache(self):
        tour = self.ready_tour(duration=30)
        self.admin('post', f'{tour.pk}/publish/')
        self.assertEqual(self.guest().json()['stops'], [])
        self.admin('put', f'{tour.pk}/stops/', {'stops': [{'title': 'Yangi', 't': 4}]})
        self.assertEqual([s['title'] for s in self.guest().json()['stops']], ['Yangi'])
        self.admin('put', f'{tour.pk}/hotspots/', {'hotspots': [{'table_id': self.A.table1.pk, 't_start': 1, 't_end': 3, 'x': .5, 'y': .5}]})
        self.assertEqual(len(self.guest().json()['hotspots']), 1)
        self.admin('delete', f'{tour.pk}/')
        self.assertEqual(self.guest().json(), {'enabled': False})


class TenantIsolationTests(GuestBase):

    def test_each_host_shows_only_its_own_tour(self):
        mine = self.published(tenant=self.A, title='ALFA-TOUR')
        theirs = self.published(tenant=self.B, title='BRAVO-SECRETTOUR')
        self.add_children(mine, self.A)
        self.add_children(theirs, self.B)
        a, b = self.guest(self.A), self.guest(self.B)
        self.assertEqual(a.json()['title'], 'ALFA-TOUR')
        self.assertEqual(b.json()['title'], 'BRAVO-SECRETTOUR')
        self.assertNotIn('BRAVO', a.content.decode())
        self.assertNotIn('ALFA', b.content.decode())
        self.assertNotEqual({h['table_id'] for h in a.json()['hotspots']}, {h['table_id'] for h in b.json()['hotspots']})

    def test_cache_does_not_mix_tenants(self):
        self.published(tenant=self.A, title='ALFA-TOUR')
        for _ in range(3):
            self.assertEqual(self.guest(self.B).json(), {'enabled': False})
            self.assertEqual(self.guest(self.A).json()['title'], 'ALFA-TOUR')

    def test_a_tenant_without_a_tour_stays_disabled_when_the_other_publishes(self):
        self.assertEqual(self.guest(self.B).json(), {'enabled': False})
        self.published(tenant=self.A)
        self.assertEqual(self.guest(self.B).json(), {'enabled': False})

    def test_publishing_in_a_does_not_break_published_b(self):
        theirs = self.published(tenant=self.B, title='BRAVO-SECRETTOUR')
        mine = self.ready_tour(tenant=self.A)
        self.admin('post', f'{mine.pk}/publish/')
        self.assertEqual(Tour.objects.get(pk=theirs.pk).status, Tour.PUBLISHED)
        self.assertEqual(self.guest(self.B).json()['title'], 'BRAVO-SECRETTOUR')


class QueryBudgetAndHeadersTests(GuestBase):

    def setUp(self):
        super().setUp()
        self.tour = self.published()
        self.add_children(self.tour)

    def count(self):
        with CaptureQueriesContext(connection) as ctx:
            self.assertTrue(self.guest().json()['enabled'])
        return len(ctx), len([q for q in ctx if '"tour' in q['sql']])

    def test_cold_request_uses_few_queries_and_warm_request_none_for_tour_tables(self):
        total, tour_queries = self.count()
        self.assertEqual(tour_queries, 3)                       # tur (+zal JOIN), nuqtalar, belgilar (+stol JOIN)
        self.assertLessEqual(total, 8)
        warm_total, warm_tour = self.count()
        self.assertEqual(warm_tour, 0)
        self.assertLessEqual(warm_total, 4)

    def test_cold_query_count_does_not_grow_with_stops_and_hotspots(self):
        base = self.count()[1]
        TourStop.objects.bulk_create([TourStop(tour=self.tour, order=i + 2, title=f'N{i}', t=i) for i in range(40)])
        TourHotspot.objects.bulk_create([TourHotspot(tour=self.tour, table=self.A.table1, t_start=1, t_end=2, x=.5, y=.5) for _ in range(100)])
        from django.core.cache import cache
        cache.clear()
        self.assertEqual(self.count()[1], base)

    @override_settings(TOUR_GUEST_CACHE_S=0)
    def test_without_the_server_cache_it_is_still_a_constant_number_of_queries(self):
        first = self.count()
        TourStop.objects.bulk_create([TourStop(tour=self.tour, order=i + 5, title=f'N{i}', t=i) for i in range(30)])
        self.assertEqual(self.count()[1], first[1])

    @override_settings(TOUR_GUEST_CACHE_S=0)
    def test_deleting_a_table_hides_its_mark_at_once_when_the_cache_is_off(self):
        self.assertEqual(len(self.guest().json()['hotspots']), 2)
        self.A.table2.delete()
        self.assertEqual(len(self.guest().json()['hotspots']), 1)

    def test_headers_etag_and_304(self):
        resp = self.guest()
        self.assertEqual(resp.status_code, 200)
        self.assertIn('application/json', resp['Content-Type'])
        cache_control = resp['Cache-Control']
        self.assertIn('private', cache_control)
        self.assertRegex(cache_control, r'max-age=\d{1,3}\b')
        self.assertLessEqual(int(cache_control.split('max-age=')[1].split(',')[0]), 60)               # qisqa
        self.assertIn('Cookie', resp['Vary'])
        etag = resp['ETag']
        again = self.guest(HTTP_IF_NONE_MATCH=etag)
        self.assertEqual((again.status_code, again.content), (304, b''))
        self.admin('put', f'{self.tour.pk}/stops/', {'stops': [{'title': 'Boshqa', 't': 1}]})
        self.assertNotEqual(self.guest()['ETag'], etag)

    def test_only_get_is_allowed(self):
        for method in ('post', 'put', 'patch', 'delete'):
            self.assertEqual(getattr(Client(), method)(GUEST, HTTP_HOST=self.A.host).status_code, 405, method)

    @override_settings(GUEST_TOUR_RATE_LIMIT=3)
    def test_rate_limit(self):
        codes = [self.guest().status_code for _ in range(5)]
        self.assertEqual(codes, [200, 200, 200, 429, 429])
        self.assertEqual(self.guest(self.B).status_code, 200)             # boshqa tenantning hisobi alohida

    def test_anonymous_session_is_enough_and_nothing_is_set_in_the_session(self):
        client = Client()
        resp = client.get(GUEST, HTTP_HOST=self.A.host)
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('sessionid', resp.cookies)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class TourPageTests(GuestBase):
    """`/tour/` - mehmon React ilovasi qobig'i (/book/ kabi): yangilaganda 404 bo'lmasligi shart."""

    def test_tour_page_is_served_with_the_react_shell_and_csrf(self):
        self.assertEqual(reverse('tma_tour'), '/tour/')
        resp = self.guest(path='/tour/')
        self.assertEqual(resp.status_code, 200)
        body = resp.content.decode()
        self.assertIn('window.__GULISTON_SESSION__', body)
        self.assertIn('ALFA Restoran', body)
        self.assertNotIn('BRAVO', body)
        self.assertIn('csrftoken', resp.cookies)
        self.assertEqual(Client().get('/tour', HTTP_HOST=self.A.host).status_code, 301)           # APPEND_SLASH
        self.assertIn('BRAVO Restoran', self.guest(self.B, path='/tour/').content.decode())

    def test_page_is_served_the_same_way_as_book_and_works_when_the_module_is_off(self):
        book = self.guest(path='/book/')
        tour = self.guest(path='/tour/')
        self.assertEqual((book.status_code, tour.status_code), (200, 200))
        self.assertEqual(book['Content-Type'], tour['Content-Type'])
        self.set_modules(self.A, menu=True, tour=False)
        resp = self.guest(path='/tour/')
        self.assertEqual(resp.status_code, 200)                                                  # qobiq beriladi, ilova yumshoq ekran ko'rsatadi
        self.assertIn('"tour": false', resp.content.decode())
