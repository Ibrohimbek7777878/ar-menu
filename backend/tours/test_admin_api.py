"""Sayr admin API: shartnoma shakli, ruxsat (settings_admin), tenant izolyatsiyasi, nuqta/belgilar, e'lon, arxiv."""
import json
import os

from django.test import Client

from tables_restaurant.models import Hall
from tours import storage
from tours.models import Tour, TourHotspot, TourStop
from tours.testkit import ADMIN, TourTestCase

TOUR_KEYS = {'id', 'title', 'hall_id', 'status', 'status_label', 'duration_s', 'width', 'height', 'variants', 'error', 'stops',
             'hotspots', 'ai_status', 'ai_suggestions', 'published', 'created_at', 'updated_at'}
STOP_KEYS = {'id', 'order', 'title', 't'}
HOTSPOT_KEYS = {'id', 'table_id', 'table_number', 'label', 't_start', 't_end', 'x', 'y'}


class ContractShapeTests(TourTestCase):

    def test_create_returns_exactly_the_contract_keys(self):
        tour = self.create_tour(title='  Asosiy   zal ')
        self.assertEqual(set(tour), TOUR_KEYS)
        self.assertEqual(tour['title'], 'Asosiy zal')
        self.assertEqual((tour['status'], tour['status_label']), ('draft', 'Qoralama'))
        self.assertEqual((tour['duration_s'], tour['width'], tour['height']), (0, 0, 0))
        self.assertEqual((tour['variants'], tour['error'], tour['stops'], tour['hotspots']), ({}, '', [], []))
        self.assertEqual((tour['ai_status'], tour['ai_suggestions'], tour['published'], tour['hall_id']), ('idle', None, False, None))

    def test_ready_tour_json_has_urls_stops_and_hotspots(self):
        tour = self.ready_tour(duration=44.6)
        self.assertEqual(self.admin('put', f'{tour.pk}/stops/', {'stops': [{'title': 'Kirish', 't': 0}]}).status_code, 200)
        resp = self.admin('put', f'{tour.pk}/hotspots/', {'hotspots': [
            {'table_id': self.A.table1.pk, 't_start': 12, 't_end': 16.5, 'x': 0.52, 'y': 0.61}]})
        data = resp.json()
        self.assertEqual(set(data), TOUR_KEYS)
        self.assertEqual(set(data['stops'][0]), STOP_KEYS)
        self.assertEqual(set(data['hotspots'][0]), HOTSPOT_KEYS)
        self.assertEqual(data['hotspots'][0]['table_number'], '1')
        self.assertEqual(data['duration_s'], 44.6)
        for key in ('scrub', 'play', 'low', 'poster'):
            self.assertTrue(data['variants'][key].startswith('/media/tours/shop_'), data['variants'])
        self.assertEqual(data['variants']['poster'].rsplit('.', 1)[1], 'jpg')

    def test_list_has_results_with_children_and_no_archived(self):
        keep = self.ready_tour(title='Qoladi')
        gone = self.ready_tour(title='Arxivlanadi')
        self.admin('put', f'{keep.pk}/stops/', {'stops': [{'title': 'A', 't': 1}]})
        self.assertEqual(self.admin('delete', f'{gone.pk}/').status_code, 200)
        data = self.admin('get').json()
        self.assertEqual([t['title'] for t in data['results']], ['Qoladi'])
        self.assertEqual(len(data['results'][0]['stops']), 1)
        self.assertEqual([t['title'] for t in self.admin('get', '?include_archived=1').json()['results']], ['Arxivlanadi', 'Qoladi'])

    def _list_query_count(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(self.admin('get').status_code, 200)
        return len([q for q in ctx if 'FROM "tour' in q['sql']])       # kirish/sessiya so'rovlari hisobga olinmaydi

    def _tour_with_children(self, title):
        tour = self.ready_tour(title=title)
        self.admin('put', f'{tour.pk}/stops/', {'stops': [{'title': 'A', 't': 1}, {'title': 'B', 't': 2}]})
        self.admin('put', f'{tour.pk}/hotspots/', {'hotspots': [{'table_id': self.A.table1.pk, 't_start': 1, 't_end': 2, 'x': .5, 'y': .5}]})

    def test_list_query_count_does_not_grow_with_tours(self):
        self._tour_with_children('T0')
        baseline = self._list_query_count()
        for i in range(1, 6):
            self._tour_with_children(f'T{i}')
        self.assertEqual(self._list_query_count(), baseline)
        self.assertEqual(baseline, 3)                                   # tur + nuqtalar + belgilar (stol bilan)

    def test_hall_must_belong_to_the_restaurant(self):
        resp = self.admin('post', '', {'title': 'X', 'hall_id': self.B.hall.pk})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['field'], 'hall_id')
        self.assertNotIn('BRAVO', resp.content.decode())
        ok = self.admin('post', '', {'title': 'X', 'hall_id': self.A.hall.pk})
        self.assertEqual((ok.status_code, ok.json()['hall_id']), (201, self.A.hall.pk))

    def test_create_accepts_a_null_hall_and_the_editor_payload_shape(self):
        """VT2 yuboradigan shakl: `{title, hall_id}` (hall_id null bo'lishi mumkin); belgi: faqat table_id'li, `label` bo'sh yoki yo'q."""
        resp = self.admin('post', '', {'title': 'Zalsiz', 'hall_id': None})
        self.assertEqual((resp.status_code, resp.json()['hall_id']), (201, None))
        tour = self.ready_tour(duration=10)
        for spot in ({'table_id': self.A.table1.pk, 't_start': 1, 't_end': 2, 'x': .5, 'y': .5},
                     {'table_id': self.A.table1.pk, 'label': '', 't_start': 1, 't_end': 2, 'x': .5, 'y': .5}):
            resp = self.admin('put', f'{tour.pk}/hotspots/', {'hotspots': [spot]})
            self.assertEqual((resp.status_code, resp.json()['hotspots'][0]['label']), (200, ''), resp.content)

    def test_title_validation_and_error_shape(self):
        for body in ({'title': ''}, {'title': 'x' * 121}, {'title': 5}, {'title': ['a']}):
            resp = self.admin('post', '', body)
            self.assertEqual(resp.status_code, 400, body)
            data = resp.json()
            self.assertEqual(data['field'], 'title')
            self.assertTrue(data['error'] and data['code'])

    def test_patch_title_and_hall(self):
        tour = self.create_tour()
        resp = self.admin('patch', f'{tour["id"]}/', {'title': 'Yangi nom', 'hall_id': self.A.hall.pk})
        data = resp.json()
        self.assertEqual((resp.status_code, data['title'], data['hall_id']), (200, 'Yangi nom', self.A.hall.pk))
        resp = self.admin('patch', f'{tour["id"]}/', {'hall_id': None})
        self.assertIsNone(resp.json()['hall_id'])
        self.assertEqual(self.admin('patch', f'{tour["id"]}/', {'title': ''}).status_code, 400)

    def test_tour_count_limit(self):
        from django.test import override_settings
        with override_settings(TOUR_MAX_TOURS_PER_SHOP=2):
            self.create_tour()
            self.create_tour()
            resp = self.admin('post', '', {'title': 'uchinchi'})
            self.assertEqual((resp.status_code, resp.json()['code']), (409, 'tour_limit'))


class PermissionTests(TourTestCase):

    ROUTES = (('get', ''), ('post', ''), ('get', '{id}/'), ('patch', '{id}/'), ('delete', '{id}/'), ('post', '{id}/video/'),
              ('put', '{id}/stops/'), ('put', '{id}/hotspots/'), ('post', '{id}/publish/'), ('post', '{id}/unpublish/'),
              ('post', '{id}/ai-suggest/'), ('delete', '{id}/ai-suggestions/'))

    def test_anonymous_is_rejected_everywhere(self):
        tour = self.ready_tour()
        for method, suffix in self.ROUTES:
            resp = self.call(None, method, ADMIN + suffix.format(id=tour.pk), {} if method != 'get' else None)
            self.assertIn(resp.status_code, (401, 403), (method, suffix))

    def test_staff_without_settings_admin_gets_403_everywhere(self):
        tour = self.ready_tour()
        for user in (self.A.waiter, self.A.kitchen):
            for method, suffix in self.ROUTES:
                resp = self.call(user, method, ADMIN + suffix.format(id=tour.pk), {} if method != 'get' else None)
                self.assertEqual(resp.status_code, 403, (user.role, method, suffix))
        self.assertEqual(Tour.objects.get(pk=tour.pk).title, tour.title)

    def test_manager_and_owner_can_work(self):
        self.assertEqual(self.admin('get', user=self.A.manager).status_code, 200)
        self.assertEqual(self.admin('get', user=self.A.owner).status_code, 200)

    def test_capability_can_be_granted_or_revoked_per_staff(self):
        waiter = self.A.waiter
        waiter.extra_capabilities = ['settings_admin']
        waiter.save(update_fields=['extra_capabilities'])
        self.assertEqual(self.admin('get', user=waiter).status_code, 200)
        manager = self.A.manager
        manager.revoked_capabilities = ['settings_admin']
        manager.save(update_fields=['revoked_capabilities'])
        self.assertEqual(self.admin('get', user=manager).status_code, 403)

    def test_body_must_be_a_json_object_except_for_the_two_put_lists(self):
        tour = self.ready_tour()
        resp = self.call(self.A.owner, 'post', ADMIN, '[1]')
        self.assertEqual(resp.status_code, 400)
        resp = self.call(self.A.owner, 'put', f'{ADMIN}{tour.pk}/stops/', '[{"title": "A", "t": 1}]')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['stops'][0]['title'], 'A')


class TenantIsolationTests(TourTestCase):

    def test_foreign_tenant_objects_are_404_for_every_route(self):
        theirs = self.ready_tour(tenant=self.B, title='BRAVO-SECRETTOUR')
        for method, suffix in PermissionTests.ROUTES[2:]:
            body = {} if method != 'get' else None
            resp = self.admin(method, suffix.format(id=theirs.pk), body)
            self.assertEqual(resp.status_code, 404, (method, suffix, resp.content))
            self.assertNotIn('BRAVO', resp.content.decode())
        self.assertEqual(Tour.objects.get(pk=theirs.pk).title, 'BRAVO-SECRETTOUR')
        self.assertFalse(Tour.objects.get(pk=theirs.pk).is_archived)

    def test_lists_never_contain_the_other_tenant(self):
        self.ready_tour(tenant=self.A, title='ALFA-TOUR')
        self.ready_tour(tenant=self.B, title='BRAVO-SECRETTOUR')
        body = self.admin('get', '?include_archived=1').content.decode()
        self.assertIn('ALFA-TOUR', body)
        self.assertNotIn('BRAVO', body)

    def test_session_of_tenant_a_is_useless_on_tenant_b_host(self):
        resp = self.call(self.A.owner, 'get', ADMIN, tenant=self.B)
        self.assertIn(resp.status_code, (401, 403))

    def test_foreign_table_in_hotspot_is_rejected_and_nothing_changes(self):
        tour = self.ready_tour()
        resp = self.admin('put', f'{tour.pk}/hotspots/', {'hotspots': [
            {'table_id': self.B.table1.pk, 't_start': 1, 't_end': 2, 'x': .5, 'y': .5}]})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['field'], 'hotspots[0].table_id')
        self.assertEqual(TourHotspot.objects.count(), 0)

    def test_publishing_in_one_tenant_does_not_touch_the_other(self):
        mine, theirs = self.ready_tour(tenant=self.A), self.ready_tour(tenant=self.B)
        Tour.objects.filter(pk=theirs.pk).update(status=Tour.PUBLISHED)
        self.assertEqual(self.admin('post', f'{mine.pk}/publish/').status_code, 200)
        self.assertEqual(Tour.objects.get(pk=theirs.pk).status, Tour.PUBLISHED)


class StopsAndHotspotsTests(TourTestCase):

    def setUp(self):
        super().setUp()
        self.tour = self.ready_tour(duration=30.0)
        self.url = f'{self.tour.pk}/'

    def put_stops(self, items):
        return self.admin('put', self.url + 'stops/', {'stops': items})

    def put_hotspots(self, items):
        return self.admin('put', self.url + 'hotspots/', {'hotspots': items})

    def spot(self, **kw):
        return {'table_id': self.A.table1.pk, 't_start': 1, 't_end': 2, 'x': 0.5, 'y': 0.5, **kw}

    def test_stops_are_replaced_sorted_by_time_with_order(self):
        self.put_stops([{'title': 'Oxiri', 't': 20}, {'title': 'Kirish', 't': 0}, {'title': 'Zal', 't': 5.5}])
        data = self.put_stops([{'title': 'Oxiri', 't': 20}, {'title': 'Kirish', 't': 0}, {'title': 'Zal', 't': 5.5}]).json()
        self.assertEqual([(s['order'], s['title'], s['t']) for s in data['stops']], [(0, 'Kirish', 0), (1, 'Zal', 5.5), (2, 'Oxiri', 20)])
        data = self.put_stops([{'title': 'Yagona', 't': 30}]).json()          # t == davomiylik ruxsat
        self.assertEqual(len(data['stops']), 1)
        self.assertEqual(self.put_stops([]).json()['stops'], [])

    def test_invalid_stops_are_rejected_atomically(self):
        self.put_stops([{'title': 'Eski', 't': 1}])
        cases = (
            [{'title': 'A', 't': 1}, {'title': 'B', 't': 30.01}],            # davomiylikdan keyin
            [{'title': 'A', 't': -1}],
            [{'title': 'A', 't': '5'}],
            [{'title': 'A', 't': True}],
            [{'title': 'A', 't': None}],
            [{'title': '', 't': 1}],
            [{'title': 'x' * 61, 't': 1}],
            [{'title': 5, 't': 1}],
            ['nuqta'],
            [{'t': 1}],
        )
        for items in cases:
            resp = self.put_stops(items)
            self.assertEqual(resp.status_code, 400, items)
            self.assertIn('field', resp.json(), items)
        self.assertEqual(list(TourStop.objects.filter(tour=self.tour).values_list('title', flat=True)), ['Eski'])

    def test_stop_count_limit(self):
        self.assertEqual(self.put_stops([{'title': f'N{i}', 't': i % 30} for i in range(60)]).status_code, 200)
        resp = self.put_stops([{'title': f'N{i}', 't': i % 30} for i in range(61)])
        self.assertEqual((resp.status_code, resp.json()['code']), (400, 'too_many'))
        self.assertEqual(TourStop.objects.filter(tour=self.tour).count(), 60)

    def test_stops_need_a_video_but_clearing_does_not(self):
        bare = Tour.objects.create(shop=self.A.shop, title='Bo\'sh')
        resp = self.admin('put', f'{bare.pk}/stops/', {'stops': [{'title': 'A', 't': 0}]})
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'no_video'))
        self.assertEqual(self.admin('put', f'{bare.pk}/stops/', {'stops': []}).status_code, 200)

    def test_stop_title_is_cleaned(self):
        data = self.put_stops([{'title': ' Kirish‮\x00  zali ', 't': 1}]).json()
        self.assertEqual(data['stops'][0]['title'], 'Kirish zali')

    def test_hotspots_valid_and_sorted(self):
        data = self.put_hotspots([self.spot(t_start=10, t_end=12), self.spot(table_id=self.A.table2.pk, t_start=2, t_end=4, x=0, y=1),
                                  {'label': 'Bar peshtaxtasi', 't_start': 0, 't_end': 30, 'x': 1, 'y': 0}]).json()
        self.assertEqual([h['t_start'] for h in data['hotspots']], [0, 2, 10])
        self.assertEqual(data['hotspots'][0]['table_id'], None)
        self.assertEqual(data['hotspots'][0]['table_number'], '')
        self.assertEqual(data['hotspots'][1]['table_number'], '2')

    def test_invalid_hotspots_are_rejected_atomically(self):
        self.put_hotspots([self.spot()])
        cases = (
            [self.spot(), self.spot(t_end=31)],
            [self.spot(t_start=5, t_end=5)],
            [self.spot(t_start=6, t_end=5)],
            [self.spot(t_start=-1)],
            [self.spot(x=1.01)],
            [self.spot(y=-0.01)],
            [self.spot(x='0.5')],
            [self.spot(x=None)],
            [self.spot(table_id=0)],
            [self.spot(table_id='3')],
            [self.spot(table_id=99999999)],
            [self.spot(table_id=None)],                                      # stol ham, yozuv ham yo'q
            [self.spot(label='x' * 61)],
            [self.spot(label=5)],
            [5],
        )
        for items in cases:
            resp = self.put_hotspots(items)
            self.assertEqual(resp.status_code, 400, items)
            self.assertIn('field', resp.json(), items)
        self.assertEqual(TourHotspot.objects.filter(tour=self.tour).count(), 1)

    def test_hidden_table_cannot_be_used(self):
        self.A.table2.delete()
        resp = self.put_hotspots([self.spot(table_id=self.A.table2.pk)])
        self.assertEqual(resp.status_code, 400)

    def test_hotspot_count_limit(self):
        self.assertEqual(self.put_hotspots([self.spot() for _ in range(200)]).status_code, 200)
        self.assertEqual(self.put_hotspots([self.spot() for _ in range(201)]).status_code, 400)
        self.assertEqual(TourHotspot.objects.filter(tour=self.tour).count(), 200)

    def test_nan_and_infinity_are_rejected(self):
        for raw in ('{"hotspots": [{"table_id": %d, "t_start": 1, "t_end": 2, "x": NaN, "y": 0.5}]}' % self.A.table1.pk,
                    '{"stops": [{"title": "A", "t": Infinity}]}'):
            path = 'hotspots/' if 'hotspots' in raw else 'stops/'
            resp = self.call(self.A.owner, 'put', ADMIN + self.url + path, raw)
            self.assertEqual(resp.status_code, 400, raw)

    def test_other_tours_data_is_never_touched(self):
        other = self.ready_tour(title='Boshqa')
        self.admin('put', f'{other.pk}/stops/', {'stops': [{'title': 'Saqlanadi', 't': 1}]})
        self.put_stops([{'title': 'Mening', 't': 2}])
        self.assertEqual(list(TourStop.objects.filter(tour=other).values_list('title', flat=True)), ['Saqlanadi'])

    def test_failed_validation_does_not_bump_updated_at(self):
        before = Tour.objects.get(pk=self.tour.pk).updated_at
        self.put_stops([{'title': 'A', 't': 99}])
        self.assertEqual(Tour.objects.get(pk=self.tour.pk).updated_at, before)


class PublishTests(TourTestCase):

    def test_publish_requires_a_ready_tour(self):
        for status in (Tour.DRAFT, Tour.PROCESSING, Tour.FAILED):
            tour = Tour.objects.create(shop=self.A.shop, title=status, status=status)
            resp = self.admin('post', f'{tour.pk}/publish/')
            self.assertEqual((resp.status_code, resp.json()['code']), (409, 'not_ready'), status)
            Tour.objects.filter(pk=tour.pk).update(status=Tour.DRAFT)
        incomplete = Tour.objects.create(shop=self.A.shop, title='x', status=Tour.READY, variants={'play': 'tours/x/play.mp4'})
        self.assertEqual(self.admin('post', f'{incomplete.pk}/publish/').status_code, 409)

    def test_publish_demotes_the_previous_one_of_the_same_hall_only(self):
        first, second = self.ready_tour(title='1'), self.ready_tour(title='2')
        hall2 = Hall.objects.create(shop=self.A.shop, name='Boshqa zal')
        third = self.ready_tour(title='3', hall=hall2)
        self.assertEqual(self.admin('post', f'{first.pk}/publish/').json()['status'], 'published')
        self.assertEqual(self.admin('post', f'{third.pk}/publish/').json()['status'], 'published')
        data = self.admin('post', f'{second.pk}/publish/').json()
        self.assertEqual((data['status'], data['published']), ('published', True))
        statuses = {t.title: t.status for t in Tour.objects.filter(shop=self.A.shop)}
        self.assertEqual(statuses, {'1': 'ready', '2': 'published', '3': 'published'})

    def test_publish_is_idempotent_and_unpublish_returns_to_ready(self):
        tour = self.ready_tour()
        self.assertEqual(self.admin('post', f'{tour.pk}/publish/').status_code, 200)
        self.assertEqual(self.admin('post', f'{tour.pk}/publish/').json()['status'], 'published')
        self.assertEqual(self.admin('post', f'{tour.pk}/unpublish/').json()['status'], 'ready')
        self.assertEqual(self.admin('post', f'{tour.pk}/unpublish/').json()['status'], 'ready')       # takroriy - xavfsiz
        self.assertEqual(Tour.objects.filter(shop=self.A.shop, status=Tour.PUBLISHED).count(), 0)

    def test_published_hall_cannot_change_without_unpublishing(self):
        tour = self.ready_tour()
        self.admin('post', f'{tour.pk}/publish/')
        resp = self.admin('patch', f'{tour.pk}/', {'hall_id': self.A.hall.pk})
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'published'))

    def test_at_most_one_published_per_hall_after_many_publishes(self):
        tours = [self.ready_tour(title=str(i)) for i in range(5)]
        for tour in tours + tours[::-1]:
            self.admin('post', f'{tour.pk}/publish/')
            self.assertEqual(Tour.objects.filter(shop=self.A.shop, status=Tour.PUBLISHED).count(), 1)


class ArchiveTests(TourTestCase):

    def test_delete_archives_and_never_removes_rows_or_files(self):
        tour = self.ready_tour()
        directory = storage.abs_path(storage.dir_of(tour))
        os.makedirs(directory)
        open(os.path.join(directory, 'play.mp4'), 'wb').write(b'x')
        self.admin('put', f'{tour.pk}/stops/', {'stops': [{'title': 'A', 't': 1}]})
        resp = self.admin('delete', f'{tour.pk}/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()['archived'])
        row = Tour.objects.get(pk=tour.pk)
        self.assertTrue(row.is_archived)
        self.assertEqual(TourStop.objects.filter(tour=row).count(), 1)
        self.assertTrue(os.path.isfile(os.path.join(directory, 'play.mp4')))
        self.assertEqual(self.admin('delete', f'{tour.pk}/').status_code, 200)                       # takroriy

    def test_archiving_a_published_tour_leaves_no_published_residue(self):
        tour = self.ready_tour()
        self.admin('post', f'{tour.pk}/publish/')
        data = self.admin('delete', f'{tour.pk}/').json()
        self.assertEqual((data['status'], data['published']), ('ready', False))
        self.assertEqual(Tour.objects.filter(shop=self.A.shop, status=Tour.PUBLISHED).count(), 0)
        # joy bo'shadi: boshqa sayr e'lon qilinadi
        other = self.ready_tour(title='Boshqa')
        self.assertEqual(self.admin('post', f'{other.pk}/publish/').status_code, 200)

    def test_archived_tour_is_frozen_but_can_be_restored(self):
        tour = self.ready_tour()
        self.admin('delete', f'{tour.pk}/')
        for method, suffix, body in (('put', 'stops/', {'stops': []}), ('put', 'hotspots/', {'hotspots': []}), ('post', 'publish/', {}),
                                     ('patch', '', {'title': 'x'})):
            resp = self.admin(method, f'{tour.pk}/{suffix}', body)
            self.assertEqual((resp.status_code, resp.json()['code']), (409, 'archived'), suffix)
        resp = self.admin('patch', f'{tour.pk}/', {'archived': False})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('archived', resp.json())
        self.assertIn(tour.pk, [t['id'] for t in self.admin('get').json()['results']])

    def test_archived_tours_do_not_count_against_the_tour_limit_but_files_count_for_quota(self):
        from django.test import override_settings
        with override_settings(TOUR_MAX_TOURS_PER_SHOP=1):
            first = self.create_tour()
            self.assertEqual(self.admin('post', '', {'title': 'x'}).status_code, 409)
            self.admin('delete', f'{first["id"]}/')
            self.assertEqual(self.admin('post', '', {'title': 'x'}).status_code, 201)
        Tour.objects.filter(pk=first['id']).update(source_size=500, variants_size=700)
        self.assertEqual(storage.used_bytes(self.A.shop.pk), 1200)
        self.assertEqual(storage.used_bytes(self.B.shop.pk), 0)


class AuditAndSettingsTests(TourTestCase):

    def test_actions_are_audited(self):
        from orders.audit import AuditLog
        tour = self.ready_tour()
        self.admin('put', f'{tour.pk}/stops/', {'stops': []})
        self.admin('post', f'{tour.pk}/publish/')
        self.admin('delete', f'{tour.pk}/')
        actions = set(AuditLog.objects.filter(target_type='tour', target_id=tour.pk).values_list('action_type', flat=True))
        self.assertTrue({'tour_stops_replaced', 'tour_published', 'tour_archived'} <= actions, actions)

    def test_settings_api_exposes_and_validates_tour_ai(self):
        client = Client()
        client.force_login(self.A.owner)
        get = lambda: client.get('/api/restaurant/admin/v1/settings/', HTTP_HOST=self.A.host).json()   # noqa: E731
        self.assertEqual(get()['tour_ai'], 'off')
        patch = lambda body: client.patch('/api/restaurant/admin/v1/settings/', data=json.dumps(body),   # noqa: E731
                                          content_type='application/json', HTTP_HOST=self.A.host)
        self.assertEqual(patch({'tour_ai': 'on'}).json()['tour_ai'], 'on')
        self.assertEqual(patch({'tour_ai': 'maybe'}).status_code, 400)
        self.assertEqual(get()['tour_ai'], 'on')
        self.assertEqual(patch({'tour_ai': 'off'}).json()['tour_ai'], 'off')
