"""
Mehmon bron API (`/api/restaurant/guest/booking/…`) va `/book/` sahifasi.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MULTITENANT_BRON_BREND_VIDEO_TUR_2026-11-03.md (Bosqich 1, qabul mezonlari 3).

Vaqt muzlatilgan: seshanba 2026-11-03 10:00 (Toshkent) — "bugun"/"o'tgan vaqt" testlari soatga bog'liq emas.
Poyga testi (TransactionTestCase, parallel oqimlar) haqiqiy vaqt bilan ishlaydi.
"""
import datetime
import io
import json
import threading
import time
import uuid
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.core.management import call_command
from django.db import OperationalError, connection
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone

from backend.runtime_cache import invalidate_runtime_cache
from notifications.models import OutboxEvent
from shops import booking_config as bc
from shops.models import Shop
from tables_restaurant import booking as svc
from tables_restaurant.models import Hall, Table, TableReservation

TZ = ZoneInfo('Asia/Tashkent')
FIXED_NOW = datetime.datetime(2026, 11, 3, 10, 0, tzinfo=TZ)        # seshanba (weekday 1)
TODAY = FIXED_NOW.date()
TOMORROW = TODAY + datetime.timedelta(days=1)                         # chorshanba (weekday 2)
API = '/api/restaurant/guest/booking/'
OPEN_LIMITS = dict(GUEST_BOOKING_READ_RATE_LIMIT=0, GUEST_BOOKING_WRITE_RATE_LIMIT=0, GUEST_BOOKING_PHONE_RATE_LIMIT=0,
                   GUEST_BOOKING_LOOKUP_RATE_LIMIT=0)


def freeze_now():
    real = timezone.localtime
    return mock.patch('django.utils.timezone.localtime',
                      side_effect=lambda value=None, tz=None: FIXED_NOW if value is None else real(value, tz))


class BookingBase:
    """Fixture: 1-restoran (3 stol: sig'im 2/4/6) va 2-restoran (begona). Mixin — o'zi test emas."""

    def make_world(self, tables=3):
        call_command('create_restaurant', name='Bron Restorani', slug='bron-g', owner='bron-g-ega', password='Bron-parol-123',
                     tables=tables, stdout=io.StringIO())
        call_command('create_restaurant', name='Begona Restoran', slug='bron-b', owner='bron-b-ega', password='Bron-parol-123',
                     tables=2, no_default=True, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='bron-g')
        self.other = Shop.objects.get(slug='bron-b')
        self.tables = list(Table.objects.filter(shop=self.shop).order_by('id'))
        for table, cap in zip(self.tables, (2, 4, 6)):
            Table.objects.filter(pk=table.pk).update(capacity=cap)
        fresh = [Table.objects.get(pk=t.pk) for t in self.tables]
        self.t1 = fresh[0]
        self.t2 = fresh[1] if len(fresh) > 1 else fresh[0]
        self.t3 = fresh[2] if len(fresh) > 2 else fresh[0]
        self.other_table = Table.objects.filter(shop=self.other).order_by('id').first()
        cache.clear()
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)
        self.addCleanup(cache.clear)

    def set_config(self, shop=None, **booking):
        shop = shop or self.shop
        bp = dict(shop.business_profile or {})
        bp['booking'] = bc.validate_booking_strict({**bc.get_booking_config(shop), **booking})
        shop.business_profile = bp
        shop.save()
        invalidate_runtime_cache()

    def payload(self, **over):
        data = {'table_id': self.t2.id, 'date': str(TOMORROW), 'time': '20:00', 'guests': 2, 'name': 'Ali Valiyev',
                'phone': '+998901234567', 'event_type': 'birthday', 'notes': 'Deraza yonida', 'submission_id': str(uuid.uuid4())}
        data.update(over)
        return data

    def post(self, body=None, client=None, **over):
        data = self.payload(**over) if body is None else body
        return (client or Client()).post(API, json.dumps(data), content_type='application/json')

    def make_res(self, table=None, date=TOMORROW, time='20:00', duration=120, status='confirmed', **extra):
        h, m = (int(x) for x in time.split(':'))
        fields = dict(shop=table.shop if table else self.shop, table=table or self.t2, hall=(table or self.t2).hall,
                      customer_name='Boshqa Mehmon', customer_phone='+998931112233', guests_count=2, reservation_date=date,
                      reservation_time=datetime.time(h, m), duration_minutes=duration, status=status)
        fields.update(extra)
        return TableReservation.objects.create(**fields)


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False, **OPEN_LIMITS)
class GuestBookingBase(BookingBase, TestCase):

    def setUp(self):
        patcher = freeze_now()
        patcher.start()
        self.addCleanup(patcher.stop)
        self.make_world()


class ConfigTests(GuestBookingBase):

    def test_config_has_the_agreed_shape(self):
        res = Client().get(API + 'config/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(set(body), {'enabled', 'slots', 'event_types', 'max_days_ahead', 'duration_minutes', 'min_notice_minutes',
                                     'closed_weekdays', 'shop', 'halls'})
        self.assertTrue(body['enabled'])
        self.assertEqual(body['slots'], bc.DEFAULT_BOOKING['slots'])
        self.assertEqual(body['event_types'], bc.DEFAULT_BOOKING['event_types'])
        self.assertEqual((body['max_days_ahead'], body['duration_minutes'], body['min_notice_minutes'], body['closed_weekdays']),
                         (30, 120, 60, []))
        self.assertEqual(body['shop'], {'name': 'Bron Restorani'})
        self.assertEqual(len(body['halls']), 1)
        hall = body['halls'][0]
        self.assertEqual((set(hall), hall['name']), ({'id', 'name', 'tables'}, 'Asosiy Zal'))
        self.assertEqual([t['capacity'] for t in hall['tables']], [2, 4, 6])
        self.assertTrue({'id', 'number', 'capacity', 'shape', 'x', 'y', 'w', 'h'} <= set(hall['tables'][0]))
        self.assertEqual(hall['tables'][0]['id'], self.t1.id)

    def test_config_sets_the_csrf_cookie_and_is_not_cacheable(self):
        res = Client().get(API + 'config/')
        self.assertIn('csrftoken', res.cookies)
        self.assertIn('no-store', res['Cache-Control'])

    def test_admin_changes_show_immediately(self):
        self.set_config(slots=[{'key': 'brunch', 'label': 'Nonushta', 'times': ['09:00']}], event_types=[], duration_minutes=90,
                        closed_weekdays=[0])
        body = Client().get(API + 'config/').json()
        self.assertEqual([s['key'] for s in body['slots']], ['brunch'])
        self.assertEqual((body['event_types'], body['duration_minutes'], body['closed_weekdays']), ([], 90, [0]))

    def test_only_active_undeleted_tables_in_active_halls(self):
        Table.objects.filter(pk=self.t1.pk).update(is_active=False)
        self.t2.delete()                                    # soft delete
        hall2 = Hall.objects.create(shop=self.shop, name='Yopiq zal', is_active=False)
        Table.objects.create(shop=self.shop, hall=hall2, number='99', capacity=4)
        body = Client().get(API + 'config/').json()
        self.assertEqual([t['id'] for h in body['halls'] for t in h['tables']], [self.t3.id])

    def test_disabled_booking_reports_enabled_false(self):
        self.set_config(enabled=False)
        body = Client().get(API + 'config/').json()
        self.assertFalse(body['enabled'])
        self.assertEqual(body['halls'], [])

    def test_broken_stored_config_still_serves_the_default(self):
        self.shop.business_profile = {'booking': {'slots': 'x', 'duration_minutes': 'ko\'p'}}
        self.shop.save()
        invalidate_runtime_cache()
        self.assertEqual(Client().get(API + 'config/').json()['slots'], bc.DEFAULT_BOOKING['slots'])

    def test_other_restaurant_tables_never_appear(self):
        ids = {t['id'] for h in Client().get(API + 'config/').json()['halls'] for t in h['tables']}
        self.assertEqual(ids, {self.t1.id, self.t2.id, self.t3.id})
        self.assertNotIn(self.other_table.id, ids)

    def test_qr_bound_guest_sees_the_qr_restaurant_only(self):
        client = Client()
        session = client.session
        session['tma_table_token'] = str(self.other_table.qr_token)
        session.save()
        body = client.get(API + 'config/').json()
        self.assertEqual(body['shop']['name'], 'Begona Restoran')
        self.assertEqual({t['id'] for h in body['halls'] for t in h['tables']}, set(Table.objects.filter(shop=self.other).values_list('id', flat=True)))

    def test_wrong_methods(self):
        self.assertEqual(Client().post(API + 'config/').status_code, 405)
        self.assertEqual(Client().post(API + 'availability/').status_code, 405)
        self.assertEqual(Client().get(API).status_code, 405)
        self.assertEqual(Client().delete(API).status_code, 405)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class NoRestaurantTests(TestCase):

    def test_empty_database_gives_a_calm_disabled_config_and_a_page(self):
        body = Client().get(API + 'config/').json()
        self.assertFalse(body['enabled'])
        self.assertEqual(body['halls'], [])
        self.assertEqual(Client().get(API + 'availability/?date=2026-11-04').status_code, 404)
        self.assertEqual(Client().get('/book/').status_code, 200)


class AvailabilityTests(GuestBookingBase):

    def avail(self, date=TOMORROW, guests=None, client=None):
        url = f'{API}availability/?date={date}' + (f'&guests={guests}' if guests is not None else '')
        return (client or Client()).get(url)

    def slots(self, body, table):
        return next(t['slots'] for t in body['tables'] if t['id'] == table.id)

    def test_free_by_default_and_the_shape(self):
        res = self.avail()
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(set(body), {'date', 'closed', 'tables'})
        self.assertEqual((body['date'], body['closed']), (str(TOMORROW), False))
        self.assertEqual([t['id'] for t in body['tables']], [self.t1.id, self.t2.id, self.t3.id])
        self.assertEqual(list(body['tables'][0]['slots']), bc.all_times(bc.DEFAULT_BOOKING))
        self.assertEqual({v for t in body['tables'] for v in t['slots'].values()}, {'free'})

    def test_duration_overlap_with_exact_boundaries(self):
        self.set_config(slots=[{'key': 'd', 'label': 'D', 'times': ['18:30', '19:00', '20:00', '20:30', '22:00', '22:30', '23:00']}])
        self.make_res(self.t2, time='20:30', duration=120)                       # 20:30 - 22:30
        s = self.slots(self.avail().json(), self.t2)
        self.assertEqual(s['18:30'], 'free')        # 18:30-20:30: tugashi bilan boshlanishi tegadi, kesishmaydi
        self.assertEqual(s['19:00'], 'taken')       # 19:00-21:00 kesishadi
        self.assertEqual(s['20:00'], 'taken')
        self.assertEqual(s['20:30'], 'taken')
        self.assertEqual(s['22:00'], 'taken')       # 22:00-24:00 kesishadi
        self.assertEqual(s['22:30'], 'free')        # 22:30 aynan tugash vaqti: bo'sh
        self.assertEqual(s['23:00'], 'free')
        self.assertEqual(set(self.slots(self.avail().json(), self.t3).values()), {'free'})     # boshqa stol ta'sirlanmaydi

    def test_active_statuses_block_inactive_free_the_slot(self):
        for status, blocks in (('pending', True), ('confirmed', True), ('arrived', True), ('seated', True),
                               ('cancelled', False), ('completed', False), ('no_show', False)):
            TableReservation.objects.all().delete()
            self.make_res(self.t2, time='20:00', status=status)
            self.assertEqual(self.slots(self.avail().json(), self.t2)['20:00'], 'taken' if blocks else 'free', status)

    def test_soft_deleted_reservation_does_not_block(self):
        res = self.make_res(self.t2, time='20:00')
        res.delete()
        self.assertEqual(self.slots(self.avail().json(), self.t2)['20:00'], 'free')

    def test_shorter_and_longer_durations_per_reservation(self):
        self.make_res(self.t1, time='19:30', duration=30)                          # 19:30-20:00
        s = self.slots(self.avail().json(), self.t1)
        self.assertEqual((s['19:30'], s['20:00']), ('taken', 'free'))
        self.assertEqual(s['19:30'], 'taken')
        # sozlama davomiyligi (yangi bron uzunligi) ham hisobga olinadi: 120 daqiqalik yangi bron 21:00 da 20:00-22:00 bilan kesishmaydi
        self.make_res(self.t3, time='22:00', duration=60)
        self.set_config(slots=[{'key': 'd', 'label': 'D', 'times': ['20:00', '20:30', '21:00']}])
        s3 = self.slots(self.avail().json(), self.t3)
        self.assertEqual((s3['20:00'], s3['20:30'], s3['21:00']), ('free', 'taken', 'taken'))   # yangi bron 120 daq: 20:00-22:00 sig'adi, 20:30-22:30 yo'q
        self.set_config(duration_minutes=150)
        s3 = self.slots(self.avail().json(), self.t3)
        self.assertEqual((s3['20:00'], s3['20:30'], s3['21:00']), ('taken', 'taken', 'taken'))   # 150 daq: 20:00-22:30 ham kesishadi

    def test_booking_that_crosses_midnight_blocks_the_next_morning(self):
        self.set_config(slots=[{'key': 'n', 'label': 'N', 'times': ['00:30', '01:00', '01:30', '02:00']}])
        self.make_res(self.t1, date=TODAY, time='23:30', duration=120)            # 23:30 - 01:30 (ertangi kun)
        s = self.slots(self.avail(TOMORROW).json(), self.t1)
        self.assertEqual(s, {'00:30': 'taken', '01:00': 'taken', '01:30': 'free', '02:00': 'free'})
        # va teskari: ertangi erta bron bugungi kechki vaqtni to'sadi
        self.set_config(slots=[{'key': 'n', 'label': 'N', 'times': ['22:00', '23:00', '23:30']}])
        self.make_res(self.t3, date=TOMORROW, time='00:30', duration=120)
        s = self.slots(self.avail(TODAY).json(), self.t3)
        self.assertEqual((s['22:00'], s['23:00'], s['23:30']), ('free', 'taken', 'taken'))  # 22:00-24:00 kesishmaydi; 23:00-01:00 va 23:30-01:30 ertangi 00:30 bilan kesishadi

    def test_past_uses_min_notice(self):
        self.set_config(min_notice_minutes=60)
        s = self.slots(self.avail(TODAY).json(), self.t1)
        self.assertEqual(s['12:30'], 'free')                       # hozir 10:00, 12:30 gacha 150 daqiqa
        late = FIXED_NOW.replace(hour=13, minute=10)
        with mock.patch('django.utils.timezone.localtime', side_effect=lambda value=None, tz=None: late if value is None else value):
            s = self.slots(self.avail(TODAY).json(), self.t1)
        self.assertEqual([s[t] for t in ('12:30', '13:00', '13:30', '14:00', '14:30', '15:00')],
                         ['past', 'past', 'past', 'past', 'free', 'free'])        # 14:10 dan oldin yopiq (13:10 + 60)
        self.set_config(min_notice_minutes=0)
        with mock.patch('django.utils.timezone.localtime', side_effect=lambda value=None, tz=None: late if value is None else value):
            s = self.slots(self.avail(TODAY).json(), self.t1)
        self.assertEqual([s[t] for t in ('13:00', '13:30')], ['past', 'free'])     # 13:30 >= 13:10

    def test_past_dates_are_all_past(self):
        body = self.avail(TODAY - datetime.timedelta(days=1)).json()
        self.assertFalse(body['closed'])
        self.assertEqual({v for t in body['tables'] for v in t['slots'].values()}, {'past'})

    def test_closed_weekday_and_beyond_the_horizon_are_closed(self):
        self.set_config(closed_weekdays=[TOMORROW.weekday()])
        body = self.avail(TOMORROW).json()
        self.assertTrue(body['closed'])
        self.assertEqual({v for t in body['tables'] for v in t['slots'].values()}, {'closed'})
        self.assertFalse(self.avail(TOMORROW + datetime.timedelta(days=1)).json()['closed'])
        far = TODAY + datetime.timedelta(days=31)
        body = self.avail(far).json()
        self.assertTrue(body['closed'])
        self.assertEqual({v for t in body['tables'] for v in t['slots'].values()}, {'closed'})
        self.assertFalse(self.avail(TODAY + datetime.timedelta(days=30)).json()['closed'])

    def test_too_small_by_party_size_and_precedence(self):
        body = self.avail(guests=5).json()
        self.assertEqual(set(self.slots(body, self.t1).values()), {'too_small'})
        self.assertEqual(set(self.slots(body, self.t2).values()), {'too_small'})
        self.assertEqual(set(self.slots(body, self.t3).values()), {'free'})
        self.assertEqual(set(self.slots(self.avail(guests=4).json(), self.t2).values()), {'free'})
        # too_small taken'dan ustun; past ham too_small'dan ustun
        self.make_res(self.t1, time='20:00')
        self.assertEqual(self.slots(self.avail(guests=3).json(), self.t1)['20:00'], 'too_small')
        self.assertEqual(set(self.slots(self.avail(TODAY - datetime.timedelta(days=1), guests=9).json(), self.t1).values()), {'past'})

    def test_validation(self):
        for url in ('availability/', 'availability/?date=', 'availability/?date=ertaga', 'availability/?date=2026-13-45',
                    'availability/?date=20261104', 'availability/?date=2026-11-04&guests=0', 'availability/?date=2026-11-04&guests=abc',
                    'availability/?date=2026-11-04&guests=501', 'availability/?date=2026-11-04&guests=2.5'):
            res = Client().get(API + url)
            self.assertEqual(res.status_code, 400, url)
            self.assertIn(res.json()['field'], ('date', 'guests'), url)

    def test_disabled_booking_is_403(self):
        self.set_config(enabled=False)
        res = self.avail()
        self.assertEqual((res.status_code, res.json()['code']), (403, 'booking_disabled'))

    def test_no_personal_data_of_other_guests(self):
        self.make_res(self.t2, time='20:00', customer_name='Maxfiy Ismli Mehmon', customer_phone='+998939998877', notes='sir izoh')
        text = self.avail().content.decode()
        for secret in ('Maxfiy', '998939998877', '939998877', 'sir izoh', 'GS-'):
            self.assertNotIn(secret, text)
        body = json.loads(text)
        self.assertEqual({k for t in body['tables'] for k in t}, {'id', 'slots'})
        self.assertEqual({v for t in body['tables'] for v in t['slots'].values()} - {'free', 'taken'}, set())

    def test_only_this_restaurants_tables(self):
        self.make_res(self.other_table, time='20:00')
        ids = {t['id'] for t in self.avail().json()['tables']}
        self.assertEqual(ids, {self.t1.id, self.t2.id, self.t3.id})

    def test_query_count_is_small_and_does_not_grow_with_data(self):
        with CaptureQueriesContext(connection) as small:
            self.avail()
        hall = self.t1.hall
        for n in range(4, 34):
            Table.objects.create(shop=self.shop, hall=hall, number=str(n), capacity=4)
        for table in Table.objects.filter(shop=self.shop)[:30]:
            self.make_res(table, time='20:00')
            self.make_res(table, time='13:00', status='pending')
        with CaptureQueriesContext(connection) as big:
            body = self.avail().json()
        self.assertEqual(len(body['tables']), 33)
        self.assertLessEqual(len(small), 8, [q['sql'][:80] for q in small.captured_queries])
        self.assertLessEqual(len(big), 8, [q['sql'][:80] for q in big.captured_queries])
        self.assertEqual(len(small), len(big))


class CreateTests(GuestBookingBase):

    def test_happy_path_response_row_and_notification(self):
        res = self.post()
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(set(body), {'public_code', 'status', 'table', 'date', 'time', 'guests', 'duration_minutes'})
        self.assertTrue(body['public_code'].startswith('GS-'))
        self.assertEqual(body['status'], 'pending')
        self.assertEqual(body['table'], {'id': self.t2.id, 'number': self.t2.number, 'hall': 'Asosiy Zal'})
        self.assertEqual((body['date'], body['time'], body['guests'], body['duration_minutes']), (str(TOMORROW), '20:00', 2, 120))
        row = TableReservation.objects.get(public_code=body['public_code'])
        self.assertEqual((row.shop_id, row.table_id, row.hall_id, row.source, row.status), (self.shop.id, self.t2.id, self.t2.hall_id, 'guest', 'pending'))
        self.assertEqual((row.customer_name, row.customer_phone, row.event_type, row.notes, row.guests_count, row.duration_minutes),
                         ('Ali Valiyev', '+998901234567', 'birthday', 'Deraza yonida', 2, 120))
        event = OutboxEvent.objects.get(event_type='reservation_created')
        self.assertEqual((event.aggregate_type, event.aggregate_id, event.payload, event.status), ('reservation', str(row.pk), {'reservation_id': row.pk}, 'pending'))

    def test_telegram_alert_text_has_table_time_party_name_phone_and_event(self):
        from notifications.services import telegram_service
        self.post()
        reservation = TableReservation.objects.get()
        sent = []
        with mock.patch.object(telegram_service, '_send_message', side_effect=lambda cid, text, **kw: sent.append(text) or {'success': True}), \
                mock.patch('notifications.admin_bot.get_shop_admin_chat_ids', return_value=['123']):
            self.assertTrue(telegram_service.send_table_reservation_alert(reservation)['success'])
        text = sent[0]
        for part in (f'№{self.t2.number}', '04.11.2026', '20:00', '2 kishi', 'Ali Valiyev', '+998901234567', "Tug'ilgan kun", 'Deraza yonida'):
            self.assertIn(part, text)
        self.assertIn('tasdiqlang', text)

    def test_auto_confirm(self):
        self.set_config(auto_confirm=True)
        body = self.post().json()
        self.assertEqual(body['status'], 'confirmed')
        self.assertEqual(TableReservation.objects.get().status, 'confirmed')

    def test_phone_formats_are_normalized(self):
        for n, raw in enumerate(('+998 90 123 45 67', '90 123 45 67', '998901234567', '0901234567', '+998 (90) 123-45-67', '901234567', 998901234567)):
            res = self.post(phone=raw, time='20:00', table_id=self.t2.id, date=str(TOMORROW + datetime.timedelta(days=n)))
            self.assertEqual(res.status_code, 201, (raw, res.content))
        self.assertEqual(set(TableReservation.objects.values_list('customer_phone', flat=True)), {'+998901234567'})

    def test_event_type_none_empty_and_unknown(self):
        self.assertEqual(self.post(event_type='none').status_code, 201)
        self.assertEqual(TableReservation.objects.get().event_type, '')
        self.assertEqual(self.post(event_type='', time='20:30', table_id=self.t3.id).status_code, 201)
        res = self.post(event_type='kasbiy', time='21:00')
        self.assertEqual((res.status_code, res.json()['field']), (400, 'event_type'))
        body = self.payload(time='21:00', date=str(TOMORROW + datetime.timedelta(days=1))); body.pop('event_type')
        self.assertEqual(self.post(body).status_code, 201)

    def test_custom_event_types_and_slots_from_admin_config(self):
        self.set_config(event_types=[{'key': 'party', 'label': 'Bazm'}], slots=[{'key': 'x', 'label': 'X', 'times': ['16:45']}])
        self.assertEqual(self.post(event_type='party', time='16:45').status_code, 201)
        self.assertEqual(self.post(event_type='birthday', time='16:45', table_id=self.t3.id).status_code, 400)
        self.assertEqual(self.post(event_type='party', time='20:00', table_id=self.t3.id).json()['field'], 'time')

    def test_conflict_is_409_slot_taken_and_nothing_extra_is_saved(self):
        self.assertEqual(self.post().status_code, 201)
        res = self.post(phone='+998931234567')                                       # aynan o'sha slot
        self.assertEqual((res.status_code, res.json()['code'], res.json()['field']), (409, 'slot_taken', 'time'))
        self.assertEqual(TableReservation.objects.count(), 1)
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 1)
        self.assertNotIn('GS-', json.dumps(res.json()))                              # boshqa mehmon bron kodi oshkor bo'lmaydi
        res = self.post(time='21:30', phone='+998931234567')                           # 20:00-22:00 bilan kesishadi
        self.assertEqual(res.status_code, 409)
        self.assertEqual(self.post(time='19:30', phone='+998931234567').status_code, 409)   # 19:30-21:30 kesishadi
        self.assertEqual(self.post(time='20:00', table_id=self.t3.id, phone='+998931234567').status_code, 201)   # boshqa stol

    def test_exact_end_boundary_is_free(self):
        self.set_config(slots=[{'key': 'd', 'label': 'D', 'times': ['18:00', '20:00', '22:00']}])
        self.assertEqual(self.post(time='20:00').status_code, 201)                   # 20:00-22:00
        self.assertEqual(self.post(time='22:00', phone='+998931234567').status_code, 201)    # aynan tugagan zahoti
        self.assertEqual(self.post(time='18:00', phone='+998931234568').status_code, 201)    # 18:00-20:00 aynan boshlanishda tugaydi

    def test_cancelled_booking_frees_the_slot(self):
        code = self.post().json()['public_code']
        TableReservation.objects.filter(public_code=code).update(status='cancelled')
        self.assertEqual(self.post(phone='+998931234567').status_code, 201)

    def test_idempotent_submission(self):
        sid = 'abc-12345-xyz'
        first = self.post(submission_id=sid)
        second = self.post(submission_id=sid)
        self.assertEqual((first.status_code, second.status_code), (201, 201))
        self.assertEqual(first.json(), second.json())
        self.assertEqual(second['Idempotent-Replayed'], 'true')
        self.assertNotIn('Idempotent-Replayed', first)
        self.assertEqual(TableReservation.objects.count(), 1)
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 1)

    def test_submission_id_reused_for_another_booking_is_rejected(self):
        self.post(submission_id='same-id-1')
        res = self.post(submission_id='same-id-1', time='19:30', table_id=self.t3.id)
        self.assertEqual((res.status_code, res.json()['code']), (409, 'submission_reuse'))
        self.assertEqual(TableReservation.objects.count(), 1)

    def test_submission_id_is_per_restaurant(self):
        self.make_res(self.other_table, time='20:00', submission_id='shared-id-9')
        self.assertEqual(self.post(submission_id='shared-id-9').status_code, 201)

    def test_without_submission_id_two_identical_posts_conflict_not_duplicate(self):
        body = self.payload(); body.pop('submission_id')
        self.assertEqual(self.post(body).status_code, 201)
        self.assertEqual(self.post(body).status_code, 409)
        self.assertEqual(TableReservation.objects.count(), 1)

    def test_validation_matrix(self):
        cases = [
            ('name', ''), ('name', 'A'), ('name', 'x' * 81), ('name', None), ('name', 123), ('name', ['Ali']), ('name', {'a': 1}),
            ('phone', ''), ('phone', 'abc'), ('phone', '12345'), ('phone', '+1 202 555 0100'), ('phone', '+998 90 123 45'),
            ('phone', '+998901234567890'), ('phone', '٩٩٨٩٠١٢٣٤٥٦٧'), ('phone', None), ('phone', ['+998901234567']), ('phone', True),
            ('phone', '+998++901234567'), ('phone', '90-123-45-67 ext 5'),
            ('guests', 0), ('guests', -1), ('guests', 'ko\'p'), ('guests', None), ('guests', True), ('guests', 1.5), ('guests', 5), ('guests', 999),
            ('notes', 'x' * 501), ('notes', 5), ('notes', ['a']),
            ('date', ''), ('date', 'ertaga'), ('date', '2026-13-45'), ('date', '20261104'), ('date', '04.11.2026'), ('date', None), ('date', 20261104),
            ('date', str(TODAY - datetime.timedelta(days=1))), ('date', str(TODAY + datetime.timedelta(days=31))),
            ('time', ''), ('time', '25:00'), ('time', '20:60'), ('time', '8pm'), ('time', None), ('time', 2000), ('time', '19:15'), ('time', '21:45'),
            ('table_id', None), ('table_id', 'x'), ('table_id', -3), ('table_id', 0), ('table_id', 2 ** 40), ('table_id', [1]), ('table_id', 1.5), ('table_id', True),
            ('event_type', 'x' * 30), ('event_type', 5), ('event_type', ['a']),
            ('submission_id', 'x' * 41), ('submission_id', 'bad id!'), ('submission_id', 5), ('submission_id', ['a']),
        ]
        for field, value in cases:
            res = self.post(**{field: value})
            self.assertEqual(res.status_code, 400, (field, value, res.content))
            self.assertEqual(res.json()['field'], field, (field, value))
            self.assertIn('error', res.json())
        self.assertEqual(TableReservation.objects.count(), 0)
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 0)

    def test_capacity(self):
        res = self.post(table_id=self.t1.id, guests=3)                              # 2 kishilik stol
        self.assertEqual((res.status_code, res.json()['code'], res.json()['field']), (400, 'too_many_guests', 'guests'))
        self.assertEqual(self.post(table_id=self.t1.id, guests=2).status_code, 201)
        self.assertEqual(self.post(table_id=self.t3.id, guests=6).status_code, 201)
        self.assertEqual(self.post(table_id=self.t3.id, guests=7, time='19:30').status_code, 400)

    def test_past_and_too_soon_times_today(self):
        self.assertEqual(self.post(date=str(TODAY), time='12:30').status_code, 201)          # hozir 10:00, 150 daqiqa keyin
        self.set_config(min_notice_minutes=180)
        res = self.post(date=str(TODAY), time='12:30', table_id=self.t3.id)                  # 10:00 + 180 = 13:00 > 12:30
        self.assertEqual((res.status_code, res.json()['field'], res.json()['code']), (400, 'time', 'too_late'))
        self.assertEqual(self.post(date=str(TODAY), time='13:00', table_id=self.t3.id).status_code, 201)

    def test_closed_weekday_is_rejected(self):
        self.set_config(closed_weekdays=[TOMORROW.weekday()])
        res = self.post()
        self.assertEqual((res.status_code, res.json()['field'], res.json()['code']), (400, 'date', 'day_closed'))
        self.assertEqual(self.post(date=str(TOMORROW + datetime.timedelta(days=1)), time='20:00').status_code, 201)

    def test_far_date_follows_the_configured_horizon(self):
        self.set_config(max_days_ahead=3)
        self.assertEqual(self.post(date=str(TODAY + datetime.timedelta(days=3))).status_code, 201)
        res = self.post(date=str(TODAY + datetime.timedelta(days=4)), table_id=self.t3.id)
        self.assertEqual((res.status_code, res.json()['code']), (400, 'date_too_far'))

    def test_disabled_is_403(self):
        self.set_config(enabled=False)
        res = self.post()
        self.assertEqual((res.status_code, res.json()['code']), (403, 'booking_disabled'))
        self.assertEqual(TableReservation.objects.count(), 0)

    def test_unusable_tables_are_404(self):
        Table.objects.filter(pk=self.t1.pk).update(is_active=False)
        self.t3.delete()
        Hall.objects.filter(pk=self.t2.hall_id).update(is_active=False)
        for table in (self.t1, self.t2, self.t3):
            res = self.post(table_id=table.id)
            self.assertEqual((res.status_code, res.json()['code']), (404, 'table_not_found'), table.number)
        self.assertEqual(self.post(table_id=999999).status_code, 404)

    def test_other_restaurants_table_is_404_and_nothing_leaks(self):
        res = self.post(table_id=self.other_table.id, guests=2)
        self.assertEqual((res.status_code, res.json()['code']), (404, 'table_not_found'))
        self.assertEqual(TableReservation.objects.count(), 0)
        # va aksincha: QR orqali boshqa restoranga bog'langan mehmon birinchi restoran stoliga bron qila olmaydi
        client = Client()
        session = client.session
        session['tma_table_token'] = str(self.other_table.qr_token)
        session.save()
        self.assertEqual(self.post(client=client).status_code, 404)
        self.assertEqual(self.post(client=client, table_id=self.other_table.id, time='20:00', guests=2).status_code, 201)
        self.assertEqual(TableReservation.objects.get().shop_id, self.other.id)

    def test_body_must_be_a_json_object(self):
        client = Client()
        for raw, ctype in (('', 'application/json'), ('null', 'application/json'), ('[1,2]', 'application/json'), ('"matn"', 'application/json'),
                           ('{bad json', 'application/json'), ('\xff\xfe', 'application/json')):
            res = client.post(API, raw.encode('latin-1', 'ignore') if raw == '\xff\xfe' else raw, content_type=ctype)
            self.assertEqual(res.status_code, 400, raw)
        res = client.post(API, 'x' * 9000, content_type='application/json')
        self.assertEqual(res.status_code, 413)
        res = client.post(API, {'table_id': self.t2.id}, content_type='multipart/form-data; boundary=x')
        self.assertEqual(res.status_code, 400)

    def test_markup_in_text_is_stored_verbatim_never_executed(self):
        res = self.post(name='<script>alert(1)</script> Ali', notes='<img src=x onerror=1>')
        self.assertEqual(res.status_code, 201)
        row = TableReservation.objects.get()
        self.assertEqual((row.customer_name, row.notes), ('<script>alert(1)</script> Ali', '<img src=x onerror=1>'))
        self.assertEqual(res['Content-Type'].split(';')[0], 'application/json')

    def test_control_characters_are_stripped_and_whitespace_collapsed(self):
        self.post(name='  Ali \x00 \n  Valiyev  ', notes='bir\x00 qator\x07\nikkinchi')
        row = TableReservation.objects.get()
        self.assertEqual(row.customer_name, 'Ali Valiyev')
        self.assertEqual(row.notes, 'bir qator\nikkinchi')

    def test_csrf_is_enforced_and_the_token_comes_from_config(self):
        client = Client(enforce_csrf_checks=True)
        res = client.post(API, json.dumps(self.payload()), content_type='application/json')
        self.assertEqual(res.status_code, 403)
        client.get(API + 'config/')
        token = client.cookies['csrftoken'].value
        res = client.post(API, json.dumps(self.payload()), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(res.status_code, 201, res.content)

    def test_book_page_is_served_and_sets_csrf(self):
        self.assertEqual(reverse('tma_book'), '/book/')
        res = Client().get('/book/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('csrftoken', res.cookies)
        self.assertEqual(Client().get('/book').status_code, 301)           # APPEND_SLASH
        self.assertEqual(Client().get('/reservation/').status_code, 200)    # eski yo'l o'zgarmadi


class LookupTests(GuestBookingBase):

    def setUp(self):
        super().setUp()
        self.code = self.post().json()['public_code']

    def test_status_by_code(self):
        res = Client().get(f'{API}{self.code}/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual((body['public_code'], body['status'], body['date'], body['time'], body['guests']), (self.code, 'pending', str(TOMORROW), '20:00', 2))
        self.assertEqual(body['table']['number'], self.t2.number)
        self.assertEqual(body['event_label'], "Tug'ilgan kun")
        for secret in ('Valiyev', '901234567', 'Deraza'):
            self.assertNotIn(secret, res.content.decode())
        self.assertNotIn('name', body)

    def test_code_is_case_and_dash_tolerant_and_status_follows_staff_changes(self):
        TableReservation.objects.filter(public_code=self.code).update(status='confirmed')
        for variant in (self.code.lower(), self.code.replace('-', '')):
            self.assertEqual(Client().get(f'{API}{variant}/').json()['status'], 'confirmed')

    def test_phone_confirmation_adds_only_a_masked_name(self):
        res = Client().get(f'{API}{self.code}/?phone=4567')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['name'], 'Ali V.')
        self.assertNotIn('901234567', res.content.decode())
        self.assertEqual(Client().get(f'{API}{self.code}/?phone=0000').status_code, 404)
        self.assertEqual(Client().get(f'{API}{self.code}/?phone=45').status_code, 404)

    def test_unknown_malformed_and_foreign_codes_are_the_same_404(self):
        foreign = self.make_res(self.other_table, time='20:00')
        for code in ('GS-AAAAA', 'xyz', 'GS-', "'; DROP TABLE", foreign.public_code):
            res = Client().get(f'{API}{code}/')
            self.assertEqual((res.status_code, res.json()['code']), (404, 'not_found'), code)

    def test_lookup_is_rate_limited(self):
        with override_settings(GUEST_BOOKING_LOOKUP_RATE_LIMIT=3):
            codes = [Client().get(f'{API}GS-AAAA{i}/').status_code for i in range(5)]
        self.assertEqual(codes, [404, 404, 404, 429, 429])


class RateLimitTests(GuestBookingBase):

    def test_post_per_ip(self):
        with override_settings(GUEST_BOOKING_WRITE_RATE_LIMIT=3):
            codes = [self.post(phone=f'+99890123456{i}', time='20:00', table_id=self.t2.id, date=str(TOMORROW + datetime.timedelta(days=i))).status_code
                     for i in range(5)]
        self.assertEqual(codes, [201, 201, 201, 429, 429])
        res = None
        with override_settings(GUEST_BOOKING_WRITE_RATE_LIMIT=1):
            cache.clear()
            self.post(name='x')
            res = self.post(name='x')
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res['Retry-After'], '60')
        self.assertEqual(res.json()['code'], 'rate_limited')

    def test_post_per_phone_even_from_different_ips(self):
        with override_settings(GUEST_BOOKING_PHONE_RATE_LIMIT=2):
            statuses = []
            for i in range(4):
                client = Client(REMOTE_ADDR=f'10.0.0.{i + 1}')
                statuses.append(self.post(client=client, phone='90 123 45 67', date=str(TOMORROW + datetime.timedelta(days=i))).status_code)
            other = self.post(client=Client(REMOTE_ADDR='10.0.0.9'), phone='+998935556677', date=str(TOMORROW + datetime.timedelta(days=5)))
        self.assertEqual(statuses, [201, 201, 429, 429])
        self.assertEqual(other.status_code, 201)

    def test_reads_are_limited_per_ip_and_other_ips_unaffected(self):
        with override_settings(GUEST_BOOKING_READ_RATE_LIMIT=2):
            codes = [Client().get(f'{API}availability/?date={TOMORROW}').status_code for _ in range(4)]
            config_codes = [Client().get(API + 'config/').status_code for _ in range(3)]
            fresh = Client(REMOTE_ADDR='10.1.1.1').get(f'{API}availability/?date={TOMORROW}').status_code
        self.assertEqual(codes, [200, 200, 429, 429])
        self.assertEqual(config_codes, [200, 200, 429])
        self.assertEqual(fresh, 200)

    def test_a_broken_cache_never_takes_the_service_down(self):
        with override_settings(GUEST_BOOKING_WRITE_RATE_LIMIT=1), mock.patch('web.guest_booking.cache') as broken:
            broken.add.side_effect = RuntimeError('redis yo\'q')
            self.assertEqual(self.post().status_code, 201)


class RaceTests(BookingBase, TransactionTestCase):
    """Parallel so'rovlar. Haqiqiy vaqt (muzlatilmagan). SQLite'da yozuv qulfi "locked" qaytaradi — mijoz qayta uriniladi;
    PostgreSQL'da stol qatori `FOR UPDATE` bilan navbatga qo'yadi (bu testda sinab ko'rilmagan: lokal PostgreSQL drayveri yo'q)."""

    def setUp(self):
        self.make_world(tables=1)
        self.t2 = self.t1 = Table.objects.get(shop=self.shop)
        Table.objects.filter(pk=self.t1.pk).update(capacity=6)
        self.date = timezone.localdate() + datetime.timedelta(days=3)

    def run_parallel(self, make_body, workers=6):
        results = []
        barrier = threading.Barrier(workers)

        def attempt(n):
            body = make_body(n)
            try:
                barrier.wait(timeout=5)
                for _ in range(80):
                    try:
                        reservation, created = svc.create_booking(self.shop.pk, body)
                        results.append('created' if created else 'replay')
                        return
                    except svc.BookingError as exc:
                        results.append(exc.code)
                        return
                    except OperationalError:
                        time.sleep(0.03)
                results.append('locked')
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt, args=(n,)) for n in range(workers)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        return results

    def test_many_guests_one_slot_exactly_one_wins_and_the_rest_get_slot_taken(self):
        results = self.run_parallel(lambda n: self.payload(table_id=self.t1.id, date=str(self.date), phone=f'+99890123456{n}',
                                                           name=f'Mehmon {n}', submission_id=f'race-{n}-{uuid.uuid4().hex[:8]}'))
        self.assertEqual(results.count('created'), 1, results)
        self.assertEqual(results.count('slot_taken'), len(results) - 1, results)
        self.assertEqual(TableReservation.objects.filter(shop=self.shop, status__in=('pending', 'confirmed')).count(), 1)
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 1)

    def test_overlapping_but_different_times_still_exactly_one(self):
        times = ['20:00', '20:30', '21:00', '21:30', '20:00', '21:00']                  # hammasi juft-juft kesishadi (21:30 - 20:00 < 120)
        results = self.run_parallel(lambda n: self.payload(table_id=self.t1.id, date=str(self.date), time=times[n], phone=f'+99890123456{n}',
                                                           submission_id=f'ov-{n}-{uuid.uuid4().hex[:8]}'))
        self.assertEqual(results.count('created'), 1, results)
        self.assertEqual(TableReservation.objects.count(), 1)

    def test_same_submission_id_in_parallel_makes_one_booking(self):
        results = self.run_parallel(lambda n: self.payload(table_id=self.t1.id, date=str(self.date), submission_id='same-sub-id-1'))
        self.assertEqual(TableReservation.objects.count(), 1)
        self.assertEqual(results.count('created'), 1, results)
        self.assertEqual(results.count('replay'), len(results) - 1, results)

    def test_different_tables_do_not_block_each_other(self):
        hall = self.t1.hall
        t_b = Table.objects.create(shop=self.shop, hall=hall, number='B', capacity=6)
        tables = [self.t1.id, t_b.id]
        results = self.run_parallel(lambda n: self.payload(table_id=tables[n % 2], date=str(self.date), phone=f'+99890123456{n}',
                                                           submission_id=f'dt-{n}-{uuid.uuid4().hex[:8]}'), workers=4)
        self.assertEqual(results.count('created'), 2, results)
        self.assertEqual(results.count('slot_taken'), 2, results)
