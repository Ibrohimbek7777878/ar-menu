"""
Bronlar admin API (`/api/restaurant/admin/v1/reservations/`) va bron xizmati (to'qnashuv, holat mashinasi, eski yo'llar bilan hamjihatlik).
Vaqt muzlatilgan: seshanba 2026-11-03 10:00 (Toshkent).
"""
import datetime
import json
import uuid

from django.core.cache import cache
from django.db import connection
from django.test import Client, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from notifications.models import OutboxEvent
from orders.audit import AuditLog
from shops import booking_config as bc
from tables_restaurant import booking as svc
from tables_restaurant import reservations as legacy
from tables_restaurant.models import Table, TableReservation
from web.test_guest_booking import API, FIXED_NOW, OPEN_LIMITS, TODAY, TOMORROW, BookingBase, freeze_now

ADMIN = '/api/restaurant/admin/v1/reservations/'
D = datetime.timedelta


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False, **OPEN_LIMITS)
class AdminBase(BookingBase, TestCase):

    def setUp(self):
        patcher = freeze_now()
        patcher.start()
        self.addCleanup(patcher.stop)
        self.make_world()
        self.owner = self.user('bron-g-ega', 'shop_owner')
        self.manager = self.user('bron-menejer', 'shop_manager')
        self.hostess = self.user('bron-hostess', 'hostess')
        self.waiter = self.user('bron-ofitsiant', 'waiter')
        self.kitchen = self.user('bron-oshpaz', 'kitchen')
        self.other_owner = self.user('bron-b-ega', 'shop_owner', shop=self.other)

    def user(self, username, role, shop=None, **extra):
        user = AdminUser.objects.filter(username=username).first()
        if user is None:
            user = AdminUser.objects.create_user(username=username, password='Parol-12345', role=role, shop=shop or self.shop, **extra)
        user.is_approved = True
        user.save(update_fields=['is_approved'])
        return user

    @staticmethod
    def as_user(user):
        client = Client()
        client.force_login(user)
        return client

    def create(self, client=None, **body):
        data = {'table_id': self.t2.id, 'date': str(TOMORROW), 'time': '20:00', 'guests': 3, 'name': 'Sardor Aliyev', 'phone': '+998901112233'}
        data.update(body)
        return (client or self.as_user(self.hostess)).post(ADMIN, json.dumps(data), content_type='application/json')

    def patch(self, pk, client=None, **body):
        return (client or self.as_user(self.hostess)).patch(f'{ADMIN}{pk}/', json.dumps(body), content_type='application/json')


class PermissionTests(AdminBase):

    def test_anonymous_is_denied_everywhere(self):
        res = self.make_res(self.t2)
        for method, url in (('get', ADMIN), ('post', ADMIN), ('get', f'{ADMIN}{res.pk}/'), ('patch', f'{ADMIN}{res.pk}/')):
            code = getattr(Client(), method)(url, **({} if method == 'get' else {'data': '{}', 'content_type': 'application/json'})).status_code
            self.assertIn(code, (401, 403), (method, url))

    def test_roles(self):
        res = self.make_res(self.t2)
        for user, allowed in ((self.owner, True), (self.manager, True), (self.hostess, True), (self.waiter, False), (self.kitchen, False)):
            c = self.as_user(user)
            codes = (c.get(ADMIN).status_code, c.get(f'{ADMIN}{res.pk}/').status_code,
                     c.post(ADMIN, '{}', content_type='application/json').status_code,
                     c.patch(f'{ADMIN}{res.pk}/', '{}', content_type='application/json').status_code)
            if allowed:
                self.assertNotIn(403, codes, user.username)
                self.assertNotIn(401, codes, user.username)
            else:
                self.assertEqual(codes, (403, 403, 403, 403), user.username)

    def test_a_waiter_with_the_personal_reservations_permission_may_use_it(self):
        AdminUser.objects.filter(pk=self.waiter.pk).update(extra_capabilities=['reservations'])
        self.assertEqual(self.as_user(AdminUser.objects.get(pk=self.waiter.pk)).get(ADMIN).status_code, 200)

    def test_a_hostess_with_the_permission_revoked_is_denied(self):
        AdminUser.objects.filter(pk=self.hostess.pk).update(revoked_capabilities=['reservations'])
        self.assertEqual(self.as_user(AdminUser.objects.get(pk=self.hostess.pk)).get(ADMIN).status_code, 403)

    def test_another_restaurants_staff_sees_and_changes_nothing(self):
        mine = self.make_res(self.t2)
        theirs = self.make_res(self.other_table, status='pending')
        other = self.as_user(self.other_owner)
        body = other.get(ADMIN + '?from=2020-01-01').json()
        self.assertEqual([r['id'] for r in body['results']], [theirs.pk])
        self.assertEqual(other.get(f'{ADMIN}{mine.pk}/').status_code, 404)
        self.assertEqual(self.patch(mine.pk, client=other, status='cancelled').status_code, 404)
        self.assertEqual(self.patch(theirs.pk, client=self.as_user(self.hostess), status='cancelled').status_code, 404)
        mine.refresh_from_db()
        theirs.refresh_from_db()
        self.assertEqual((mine.status, theirs.status), ('confirmed', 'pending'))
        # begona restoran stoliga qo'lda bron ham yo'q
        self.assertEqual(self.create(table_id=self.other_table.id).status_code, 404)
        self.assertEqual(self.create(client=other, table_id=self.t2.id).status_code, 404)


class ListTests(AdminBase):

    def test_shape_and_values(self):
        res = self.make_res(self.t2, time='20:00', event_type='birthday', notes='Tort', source='guest', status='pending')
        body = self.as_user(self.hostess).get(ADMIN).json()
        self.assertEqual(set(body), {'count', 'truncated', 'results'})
        self.assertEqual((body['count'], body['truncated']), (1, False))
        row = body['results'][0]
        self.assertEqual(set(row), {'id', 'public_code', 'table', 'customer_name', 'customer_phone', 'guests_count', 'reservation_date',
                                    'reservation_time', 'duration_minutes', 'event_type', 'event_label', 'notes', 'status', 'source',
                                    'created_at'})
        self.assertEqual(row['id'], res.pk)
        self.assertEqual(row['table'], {'id': self.t2.id, 'number': self.t2.number, 'hall': 'Asosiy Zal'})
        self.assertEqual((row['reservation_date'], row['reservation_time'], row['duration_minutes']), (str(TOMORROW), '20:00', 120))
        self.assertEqual((row['event_type'], row['event_label'], row['notes'], row['status'], row['source']),
                         ('birthday', "Tug'ilgan kun", 'Tort', 'pending', 'guest'))
        self.assertEqual(row['customer_phone'], '+998931112233')                  # xodim ko'radi: to'liq raqam
        self.assertRegex(row['created_at'], r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$')

    def test_ordering_default_window_and_filters(self):
        yesterday = self.make_res(self.t1, date=TODAY - D(days=1), time='20:00')
        late = self.make_res(self.t2, date=TOMORROW, time='21:00', customer_name='Kechki Mehmon', status='pending')
        early = self.make_res(self.t3, date=TOMORROW, time='13:00', customer_name='Tushlik Mehmon', customer_phone='+998909998877')
        later_day = self.make_res(self.t1, date=TOMORROW + D(days=3), time='12:30', status='cancelled', public_code='GS-ZZZZ9')
        c = self.as_user(self.hostess)
        ids = lambda qs: [r['id'] for r in c.get(ADMIN + qs).json()['results']]
        self.assertEqual(ids(''), [early.pk, late.pk, later_day.pk])              # standart: bugundan boshlab, sana-vaqt tartibida
        self.assertEqual(ids('?from=2020-01-01'), [yesterday.pk, early.pk, late.pk, later_day.pk])
        self.assertEqual(ids(f'?from={TOMORROW}&to={TOMORROW}'), [early.pk, late.pk])
        self.assertEqual(ids(f'?to={TODAY}'), [yesterday.pk])
        self.assertEqual(ids('?status=pending'), [late.pk])
        self.assertEqual(ids('?status=pending,cancelled'), [late.pk, later_day.pk])
        self.assertEqual(ids('?status=active'), [early.pk, late.pk])
        self.assertEqual(ids('?status=all'), [early.pk, late.pk, later_day.pk])
        self.assertEqual(ids('?q=tushlik'), [early.pk])
        self.assertEqual(ids('?q=998909998877'), [early.pk])
        self.assertEqual(ids('?q=90 999'), [early.pk])                              # raqamlar bo'yicha (bo'shliqlar e'tiborga olinmaydi)
        self.assertEqual(ids('?q=77 000'), [])
        self.assertEqual(ids('?q=GS-ZZZZ9'), [later_day.pk])
        self.assertEqual(ids(f'?table={self.t3.id}'), [early.pk])
        self.assertEqual(ids(f'?table={self.t1.id}&status=cancelled'), [later_day.pk])
        self.assertEqual(ids(f'?q={self.t2.number}'), [late.pk])

    def test_bad_filters_are_400_not_500(self):
        c = self.as_user(self.hostess)
        for qs in ('?from=ertaga', '?to=2026-13-45', '?status=zzz', '?status=pending,zzz'):
            self.assertEqual(c.get(ADMIN + qs).status_code, 400, qs)
        for qs in ('?table=abc', '?table=-1', '?limit=abc', '?q=' + 'x' * 500, "?q=%00'; DROP TABLE x;--"):
            self.assertEqual(c.get(ADMIN + qs).status_code, 200, qs)

    def test_limit_count_and_truncation(self):
        for n in range(7):
            self.make_res(self.t1, date=TOMORROW + D(days=n), time='20:00')
        body = self.as_user(self.hostess).get(ADMIN + '?limit=3').json()
        self.assertEqual((body['count'], len(body['results']), body['truncated']), (7, 3, True))
        self.assertEqual(body['results'][0]['reservation_date'], str(TOMORROW))
        self.assertEqual(len(self.as_user(self.hostess).get(ADMIN + '?limit=100000').json()['results']), 7)

    def test_soft_deleted_are_hidden(self):
        res = self.make_res(self.t2)
        res.delete()
        self.assertEqual(self.as_user(self.hostess).get(ADMIN).json()['count'], 0)
        self.assertEqual(self.as_user(self.hostess).get(f'{ADMIN}{res.pk}/').status_code, 404)

    def test_query_count_is_constant(self):
        c = self.as_user(self.hostess)
        with CaptureQueriesContext(connection) as small:
            c.get(ADMIN)
        for n in range(30):
            self.make_res([self.t1, self.t2, self.t3][n % 3], date=TOMORROW + D(days=n // 3), time=f'{10 + n % 12}:00')
        with CaptureQueriesContext(connection) as big:
            body = c.get(ADMIN).json()
        self.assertEqual(body['count'], 30)
        self.assertEqual(len(small), len(big) - 0, [q['sql'][:70] for q in big.captured_queries])


class ManualBookingTests(AdminBase):

    def test_creates_a_confirmed_staff_booking_without_a_telegram_alert(self):
        res = self.create(notes='Telefon orqali', event_type='business')
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body['status'], body['source'], body['customer_name'], body['customer_phone'], body['guests_count']),
                         ('confirmed', 'staff', 'Sardor Aliyev', '+998901112233', 3))
        self.assertEqual((body['event_type'], body['event_label'], body['notes'], body['duration_minutes']), ('business', 'Ish uchrashuvi', 'Telefon orqali', 120))
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 0)
        log = AuditLog.objects.get(action_type='reservation_created')
        self.assertEqual((log.target_id, log.actor_name, log.new_value['table_id']), (body['id'], str(self.hostess), self.t2.id))

    def test_status_may_be_pending_but_not_arbitrary(self):
        self.assertEqual(self.create(status='pending').json()['status'], 'pending')
        for bad in ('seated', 'cancelled', 'completed', 'zzz', 5, ['pending']):
            res = self.create(status=bad, time='21:00', table_id=self.t3.id)
            self.assertEqual((res.status_code, res.json()['field']), (400, 'status'), bad)

    def test_staff_skip_guest_only_rules_but_keep_the_conflict_check(self):
        self.set_config(closed_weekdays=[TOMORROW.weekday()], min_notice_minutes=600)
        # yopiq kun, ro'yxatda yo'q vaqt (18:15), sig'imdan ortiq mehmon (2 kishilik stolga 5), minimal ogohlantirishsiz bugungi yaqin vaqt
        self.assertEqual(self.create(time='18:15', table_id=self.t1.id, guests=5).status_code, 201)
        self.assertEqual(self.create(date=str(TODAY), time='10:05', table_id=self.t3.id).status_code, 201)
        res = self.create(time='19:00', table_id=self.t1.id, phone='+998931231212')             # 18:15-20:15 bilan kesishadi
        self.assertEqual((res.status_code, res.json()['code']), (409, 'slot_taken'))
        self.assertEqual(TableReservation.objects.count(), 2)

    def test_staff_conflict_covers_guest_bookings_and_vice_versa(self):
        self.assertEqual(self.create(time='20:00').status_code, 201)
        guest = Client().post(API, json.dumps(self.payload(time='21:30')), content_type='application/json')
        self.assertEqual((guest.status_code, guest.json()['code']), (409, 'slot_taken'))
        self.assertEqual(Client().post(API, json.dumps(self.payload(time='22:00', phone='+998935551122')), content_type='application/json').status_code, 400)  # 22:00 ro'yxatda yo'q
        self.assertEqual(Client().post(API, json.dumps(self.payload(table_id=self.t3.id, time='21:30', phone='+998935551122')), content_type='application/json').status_code, 201)

    def test_custom_duration_and_range(self):
        res = self.create(duration_minutes=60)
        self.assertEqual(res.json()['duration_minutes'], 60)
        self.assertEqual(self.create(time='21:00', phone='+998931231212').status_code, 201)    # 20:00-21:00 tugagach bo'sh
        for bad in (5, 601, 'x', True, [60]):
            self.assertEqual(self.create(duration_minutes=bad, time='10:00', table_id=self.t3.id).status_code, 400, bad)

    def test_validation(self):
        for field, value in (('name', 'A'), ('name', None), ('phone', 'abc'), ('phone', '+998'), ('phone', '12'), ('guests', 0), ('guests', 9999),
                             ('date', str(TODAY - D(days=1))), ('date', str(TODAY + D(days=400))), ('date', 'ertaga'), ('time', '25:00'),
                             ('table_id', 999999), ('table_id', 'x'), ('event_type', 'noma\'lum'), ('notes', 'x' * 1001), ('submission_id', 'bad id!')):
            res = self.create(**{field: value})
            self.assertIn(res.status_code, (400, 404), (field, value))
        self.assertEqual(TableReservation.objects.count(), 0)

    def test_foreign_phone_is_allowed_for_staff_only(self):
        self.assertEqual(self.create(phone='+7 495 123 45 67').status_code, 201)
        self.assertEqual(Client().post(API, json.dumps(self.payload(phone='+7 495 123 45 67')), content_type='application/json').status_code, 400)

    def test_field_aliases_from_the_list_response_are_accepted(self):
        res = self.as_user(self.hostess).post(ADMIN, json.dumps({
            'table_id': self.t2.id, 'reservation_date': str(TOMORROW), 'reservation_time': '20:00', 'guests_count': 2,
            'customer_name': 'Alias Mehmon', 'customer_phone': '90 123 45 67'}), content_type='application/json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['customer_phone'], '+998901234567')

    def test_idempotent_by_submission_id(self):
        sid = 'staff-' + uuid.uuid4().hex[:10]
        first, second = self.create(submission_id=sid), self.create(submission_id=sid)
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()['id'], second.json()['id'])
        self.assertEqual(TableReservation.objects.count(), 1)
        self.assertEqual(AuditLog.objects.filter(action_type='reservation_created').count(), 1)

    def test_bad_body(self):
        c = self.as_user(self.hostess)
        for raw in ('[]', 'null', '"x"', '{bad'):
            self.assertEqual(c.post(ADMIN, raw, content_type='application/json').status_code, 400, raw)


class UpdateTests(AdminBase):

    def setUp(self):
        super().setUp()
        self.res = self.make_res(self.t2, time='20:00', status='pending', source='guest')

    def test_status_flow_and_audit(self):
        for new in ('confirmed', 'arrived'):
            res = self.patch(self.res.pk, status=new)
            self.assertEqual((res.status_code, res.json()['status']), (200, new), res.content)
        self.res.refresh_from_db()
        self.assertEqual(self.res.status, 'arrived')
        log = AuditLog.objects.filter(action_type='reservation_updated').latest('id')
        self.assertEqual((log.old_value['status'], log.new_value['status'], log.new_value['changed'], log.target_id),
                         ('confirmed', 'arrived', ['status'], self.res.pk))

    def test_forbidden_transitions_are_409_and_change_nothing(self):
        self.patch(self.res.pk, status='cancelled')
        for new in ('confirmed', 'arrived', 'no_show', 'completed', 'seated'):
            res = self.patch(self.res.pk, status=new)
            self.assertEqual((res.status_code, res.json()['code']), (409, 'bad_transition'), new)
        self.assertEqual(self.patch(self.res.pk, status='pending').status_code, 409)
        self.res.refresh_from_db()
        self.assertEqual(self.res.status, 'cancelled')

    def test_pending_cannot_jump_to_completed(self):
        res = self.patch(self.res.pk, status='completed')
        self.assertEqual((res.status_code, res.json()['code']), (409, 'bad_transition'))

    def test_unknown_status_is_400(self):
        for bad in ('zzz', 5, ['pending'], {'a': 1}):
            res = self.patch(self.res.pk, status=bad)
            self.assertEqual((res.status_code, res.json()['field']), (400, 'status'), bad)

    def test_no_show_frees_the_slot_for_guests(self):
        self.assertEqual(self.patch(self.res.pk, status='confirmed').status_code, 200)
        taken = Client().post(API, json.dumps(self.payload(phone='+998935551122')), content_type='application/json')
        self.assertEqual(taken.status_code, 409)
        res = self.patch(self.res.pk, status='no_show')
        self.assertEqual((res.status_code, res.json()['status']), (200, 'no_show'))
        again = Client().post(API, json.dumps(self.payload(phone='+998935551122')), content_type='application/json')
        self.assertEqual(again.status_code, 201)
        self.assertEqual(self.patch(self.res.pk, status='confirmed').status_code, 409)         # kelmadi -> qaytib bo'lmaydi

    def test_arrived_cannot_be_marked_no_show(self):
        self.patch(self.res.pk, status='arrived')
        self.assertEqual(self.patch(self.res.pk, status='no_show').status_code, 409)

    def test_seated_then_completed_follows_the_existing_machine(self):
        self.patch(self.res.pk, status='confirmed')
        res = self.patch(self.res.pk, status='seated')
        self.assertEqual((res.status_code, res.json()['status']), (200, 'seated'), res.content)
        self.t2.refresh_from_db()
        self.assertEqual(self.t2.status, 'occupied')
        self.assertEqual(self.patch(self.res.pk, status='completed').json()['status'], 'completed')
        self.t2.refresh_from_db()
        self.assertEqual(self.t2.status, 'free')

    def test_reschedule_time_with_conflict_check(self):
        other = self.make_res(self.t2, time='23:00', duration=60)                    # 23:00-24:00
        res = self.patch(self.res.pk, time='22:30')                                  # 22:30-00:30 kesishadi
        self.assertEqual((res.status_code, res.json()['code']), (409, 'slot_taken'))
        self.res.refresh_from_db()
        self.assertEqual(self.res.reservation_time, datetime.time(20, 0))
        res = self.patch(self.res.pk, time='21:00')                                  # 21:00-23:00 tegadi, kesishmaydi
        self.assertEqual((res.status_code, res.json()['reservation_time']), (200, '21:00'))
        self.assertEqual(other.reservation_time, datetime.time(23, 0))

    def test_a_booking_does_not_conflict_with_itself(self):
        res = self.patch(self.res.pk, time='20:30', duration_minutes=150)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual((res.json()['reservation_time'], res.json()['duration_minutes']), ('20:30', 150))

    def test_move_to_another_table_and_date(self):
        blocker = self.make_res(self.t3, time='20:00')
        self.assertEqual(self.patch(self.res.pk, table_id=self.t3.id).status_code, 409)
        res = self.patch(self.res.pk, table_id=self.t3.id, date=str(TOMORROW + D(days=1)))
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual((body['table']['id'], body['reservation_date']), (self.t3.id, str(TOMORROW + D(days=1))))
        self.res.refresh_from_db()
        self.assertEqual((self.res.table_id, self.res.hall_id), (self.t3.id, self.t3.hall_id))
        self.assertEqual(blocker.table_id, self.t3.id)

    def test_cannot_move_to_other_restaurant_or_unusable_table_or_the_past(self):
        for table_id in (self.other_table.id, 999999):
            res = self.patch(self.res.pk, table_id=table_id)
            self.assertEqual((res.status_code, res.json()['code']), (404, 'table_not_found'))
        Table.objects.filter(pk=self.t3.pk).update(is_active=False)
        self.assertEqual(self.patch(self.res.pk, table_id=self.t3.id).status_code, 404)
        res = self.patch(self.res.pk, date=str(TODAY - D(days=1)))
        self.assertEqual((res.status_code, res.json()['field']), (400, 'date'))
        self.res.refresh_from_db()
        self.assertEqual(self.res.table_id, self.t2.id)

    def test_finished_bookings_keep_their_schedule_but_notes_can_change(self):
        self.patch(self.res.pk, status='cancelled')
        res = self.patch(self.res.pk, time='19:00')
        self.assertEqual((res.status_code, res.json()['code']), (409, 'not_editable'))
        res = self.patch(self.res.pk, notes='Bekor qilindi: telefon qildi')
        self.assertEqual((res.status_code, res.json()['notes']), (200, 'Bekor qilindi: telefon qildi'))

    def test_edit_details(self):
        res = self.patch(self.res.pk, name='Yangi Ism', phone='90 111 22 33', guests=4, notes='Bolalar stuli', event_type='wedding')
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual((body['customer_name'], body['customer_phone'], body['guests_count'], body['notes'], body['event_label']),
                         ('Yangi Ism', '+998901112233', 4, 'Bolalar stuli', 'Nikoh taklifi'))
        log = AuditLog.objects.filter(action_type='reservation_updated').latest('id')
        self.assertEqual(set(log.new_value['changed']), {'name', 'phone', 'guests', 'notes', 'event_type'})
        res = self.patch(self.res.pk, event_type='none')
        self.assertEqual((res.json()['event_type'], res.json()['event_label']), ('', ''))

    def test_removed_event_type_survives_unrelated_edits(self):
        TableReservation.objects.filter(pk=self.res.pk).update(event_type='eski_tur')
        res = self.patch(self.res.pk, event_type='eski_tur', notes='x')
        self.assertEqual((res.status_code, res.json()['event_type'], res.json()['event_label']), (200, 'eski_tur', 'eski_tur'))
        self.assertEqual(self.patch(self.res.pk, event_type='boshqa_eski').status_code, 400)

    def test_empty_patch_changes_nothing_and_writes_no_audit(self):
        res = self.patch(self.res.pk)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(AuditLog.objects.filter(action_type='reservation_updated').count(), 0)

    def test_invalid_values(self):
        for body in ({'name': 'A'}, {'phone': 'abc'}, {'guests': 0}, {'time': '25:00'}, {'date': 'x'}, {'duration_minutes': 3},
                     {'notes': 'x' * 1001}, {'table_id': 'x'}, {'event_type': ['a']}):
            self.assertEqual(self.patch(self.res.pk, **body).status_code, 400, body)
        self.assertEqual(self.patch(999999, status='confirmed').status_code, 404)

    def test_patch_is_atomic_when_the_status_change_fails(self):
        self.patch(self.res.pk, status='cancelled')
        res = self.patch(self.res.pk, notes='yangi', status='confirmed')
        self.assertEqual(res.status_code, 409)
        self.res.refresh_from_db()
        self.assertEqual(self.res.notes, '')                                          # izoh ham saqlanmadi (tranzaksiya qaytdi)


class ServiceAndLegacyTests(AdminBase):

    def test_legacy_bookings_default_to_the_slot_setting_and_still_conflict_correctly(self):
        first = legacy.create_reservation(self.shop, {'customer_name': 'Eski Yo\'l', 'customer_phone': '+998901234567',
                                                      'reservation_date': str(TOMORROW), 'reservation_time': '19:00', 'guests_count': 2,
                                                      'table_number': self.t2.number})
        self.assertEqual((first.duration_minutes, first.source), (120, 'guest'))
        guest = Client().post(API, json.dumps(self.payload(time='20:30')), content_type='application/json')         # 19:00-21:00 bilan kesishadi
        self.assertEqual(guest.status_code, 409)
        with self.assertRaises(legacy.ReservationError):
            legacy.create_reservation(self.shop, {'customer_name': 'Ikkinchi', 'customer_phone': '+998901234567',
                                                  'reservation_date': str(TOMORROW), 'reservation_time': '20:30', 'guests_count': 2,
                                                  'table_number': self.t2.number})
        # yangi yo'ldagi bron eski yo'lga ham to'sqinlik qiladi
        self.post(table_id=self.t3.id, time='20:00', guests=2)
        with self.assertRaises(legacy.ReservationError) as ctx:
            legacy.create_reservation(self.shop, {'customer_name': 'Uchinchi', 'customer_phone': '+998901234567', 'reservation_date': str(TOMORROW),
                                                  'reservation_time': '21:00', 'guests_count': 2, 'table_number': self.t3.number})
        self.assertEqual(ctx.exception.status, 409)

    def test_legacy_endpoints_still_list_and_change_status(self):
        res = self.make_res(self.t2, status='pending')
        c = self.as_user(self.hostess)
        listed = c.get(f'/api/v1/restaurant/reservations/?date={TOMORROW}&status=all').json()
        self.assertEqual([r['id'] for r in listed['reservations']], [res.pk])
        out = c.patch(f'/api/v1/restaurant/reservations/{res.pk}/status/', json.dumps({'status': 'confirmed'}), content_type='application/json')
        self.assertEqual((out.status_code, out.json()['status']), (200, 'confirmed'))

    def test_conflict_math_at_the_boundaries(self):
        self.make_res(self.t1, time='20:30', duration=120)
        d = TOMORROW
        for time, minutes, expected in (('18:30', 120, False), ('18:31', 120, True), ('22:29', 15, True), ('22:30', 120, False),
                                        ('20:30', 15, True), ('20:00', 30, False), ('20:00', 31, True), ('21:00', 1, True)):
            h, m = (int(x) for x in time.split(':'))
            clash = legacy.conflicting(self.t1, d, datetime.time(h, m), duration=minutes)
            self.assertEqual(bool(clash), expected, (time, minutes))
        self.assertEqual(legacy.conflicting(self.t3, d, datetime.time(20, 30), duration=120), [])

    def test_inactive_statuses_never_conflict(self):
        for status in ('cancelled', 'completed', 'no_show'):
            TableReservation.objects.all().delete()
            self.make_res(self.t1, time='20:30', status=status)
            self.assertEqual(legacy.conflicting(self.t1, TOMORROW, datetime.time(20, 30), duration=120), [], status)

    def test_phone_and_text_helpers(self):
        good = {'+998901234567': '+998901234567', '90 123 45 67': '+998901234567', '0901234567': '+998901234567', ' 998901234567 ': '+998901234567'}
        for raw, expected in good.items():
            self.assertEqual(svc.normalize_phone(raw, uz_only=True), expected, raw)
        for raw in ('', 'abc', '+99890123456', '+9989012345678', '12345678', '+1 202 555 0100', None, True, [], '00998901234567'):
            with self.assertRaises(svc.BookingError, msg=repr(raw)):
                svc.normalize_phone(raw, uz_only=True)
        self.assertEqual(svc.normalize_phone('+44 20 7946 0958', uz_only=False), '+442079460958')
        self.assertEqual(svc.phone_tail('+998 (90) 123-45-67'), '901234567')

    def test_config_driven_labels_in_the_admin_response(self):
        self.set_config(event_types=[{'key': 'party', 'label': 'Bazm', 'label_ru': 'Вечеринка'}])
        res = self.create(event_type='party')
        self.assertEqual((res.json()['event_label']), 'Bazm')
        self.assertEqual(bc.event_label(bc.get_booking_config(self.shop), 'party', 'ru'), 'Вечеринка')
