"""
Bron xizmati testlari (TZ: R4-1 … R4-5).
"""
import io
import json
import threading
import time
from datetime import timedelta

from django.core.management import call_command
from django.db import OperationalError, connection
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from accounts.models import AdminUser
from orders.models import Order
from shops.models import Shop
from tables_restaurant import reservations as svc
from tables_restaurant.models import Hall, Table, TableReservation
from tables_restaurant.privacy import find_reservation_by_code_or_phone


def tomorrow():
    return str(timezone.localdate() + timedelta(days=1))


def payload(**extra):
    data = {'customer_name': 'Ali Valiyev', 'customer_phone': '+998901234567', 'reservation_date': tomorrow(),
            'reservation_time': '19:00', 'guests_count': 2}
    data.update(extra)
    return data


class ReservationFixture:
    def make_restaurant(self, slug='bron', tables=3):
        call_command('create_restaurant', name=f'{slug} restorani', slug=slug, owner=f'{slug}-ega',
                     password='Bron-parol-123', tables=tables, stdout=io.StringIO())
        shop = Shop.objects.get(slug=slug)
        return shop


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class ReservationRulesTests(ReservationFixture, TestCase):

    def setUp(self):
        self.shop = self.make_restaurant()
        self.t1 = Table.objects.get(shop=self.shop, number='1')
        self.t2 = Table.objects.get(shop=self.shop, number='2')

    def book(self, **extra):
        return svc.create_reservation(self.shop, payload(**extra))

    # ---- R4-5: sana va vaqt qat'iy ----
    def test_invalid_or_missing_date_and_time_are_explicit_errors_not_silent_defaults(self):
        bad = [
            dict(reservation_date='ertaga'), dict(reservation_date='2026-13-45'), dict(reservation_date=''),
            dict(reservation_time='25:99'), dict(reservation_time='kechqurun'), dict(reservation_time=''),
        ]
        for extra in bad:
            with self.assertRaises(svc.ReservationError, msg=str(extra)):
                self.book(**extra)
        self.assertEqual(TableReservation.objects.count(), 0)

    def test_the_word_hozir_is_not_a_booking_time(self):
        with self.assertRaises(svc.ReservationError):
            self.book(reservation_time='hozir')
        with self.assertRaises(svc.ReservationError):
            self.book(reservation_date='hozir')

    def test_past_dates_are_rejected_and_far_future_too(self):
        with self.assertRaises(svc.ReservationError) as ctx:
            self.book(reservation_date=str(timezone.localdate() - timedelta(days=1)))
        self.assertIn("o'tmish", ctx.exception.message)
        with self.assertRaises(svc.ReservationError):
            self.book(reservation_date=str(timezone.localdate() + timedelta(days=400)))

    def test_earlier_today_is_rejected_but_later_today_is_accepted(self):
        now = timezone.localtime()
        if now.hour >= 2:
            with self.assertRaises(svc.ReservationError):
                self.book(reservation_date=str(now.date()), reservation_time=f'{now.hour - 2:02d}:00')
        if now.hour <= 20:
            self.assertEqual(self.book(reservation_date=str(now.date()), reservation_time=f'{now.hour + 2:02d}:30').status, 'pending')

    def test_name_phone_and_party_size_are_validated(self):
        for extra in (dict(customer_name=''), dict(customer_name='A'), dict(customer_phone=''), dict(customer_phone='123'),
                      dict(guests_count=0), dict(guests_count='ko\'p'), dict(guests_count=500)):
            with self.assertRaises(svc.ReservationError, msg=str(extra)):
                self.book(**extra)

    # ---- R4-1: to'qnashuv ----
    def test_same_table_cannot_be_booked_twice_in_the_same_slot(self):
        first = self.book(table_number='1', reservation_time='19:00')
        with self.assertRaises(svc.ReservationError) as ctx:
            self.book(table_number='1', reservation_time='20:30')            # 90 daqiqa — hali band (slot 120)
        self.assertEqual(ctx.exception.status, 409)
        self.assertIn(first.code, ctx.exception.message)
        self.assertEqual(self.book(table_number='1', reservation_time='21:00').status, 'pending')    # 120 daqiqa — bo'sh
        self.assertEqual(self.book(table_number='2', reservation_time='19:00').status, 'pending')      # boshqa stol

    def test_cancelled_booking_frees_the_slot(self):
        first = self.book(table_number='1')
        svc.change_status(self.shop, first.pk, 'cancelled')
        self.assertEqual(self.book(table_number='1').status, 'pending')

    def test_slot_length_is_configurable(self):
        from notifications.models import AppSetting
        AppSetting.objects.create(key='reservation_slot_minutes', value='60', category='reservation')
        self.book(table_number='1', reservation_time='19:00')
        self.assertEqual(self.book(table_number='1', reservation_time='20:00').status, 'pending')

    def test_auto_assign_picks_the_smallest_free_table_that_fits(self):
        Table.objects.filter(pk=self.t1.pk).update(capacity=2)
        Table.objects.filter(pk=self.t2.pk).update(capacity=6)
        third = Table.objects.get(shop=self.shop, number='3')              # sig'imi 4 (standart)
        self.assertEqual(self.book(guests_count=2).table, self.t1)
        self.assertEqual(self.book(guests_count=2).table, third)           # 1-stol band: keyingi eng kichik mos stol
        self.assertEqual(self.book(guests_count=2).table, self.t2)

    def test_no_free_table_is_a_conflict_error(self):
        for _ in range(3):
            self.book()
        with self.assertRaises(svc.ReservationError) as ctx:
            self.book()
        self.assertEqual((ctx.exception.status, ctx.exception.code), (409, 'no_table'))

    def test_party_larger_than_any_table_is_refused(self):
        Table.objects.filter(shop=self.shop).update(capacity=4)
        with self.assertRaises(svc.ReservationError) as ctx:
            self.book(guests_count=9)
        self.assertEqual(ctx.exception.code, 'party_too_large')
        self.assertIn('4 kishilik', ctx.exception.message)

    def test_guest_cannot_pick_a_table_that_is_too_small(self):
        Table.objects.filter(pk=self.t1.pk).update(capacity=2)
        with self.assertRaises(svc.ReservationError):
            svc.create_reservation(self.shop, payload(table_number='1', guests_count=4), by_staff=False)
        self.assertEqual(svc.create_reservation(self.shop, payload(table_number='1', guests_count=4), by_staff=True).table, self.t1)

    def test_hall_must_belong_to_the_same_restaurant(self):
        other = self.make_restaurant('boshqa-bron')
        foreign_hall = Hall.objects.filter(shop=other).first()
        with self.assertRaises(svc.ReservationError):
            self.book(hall_id=foreign_hall.pk)

    # ---- R4-2: holat o'tishlari ----
    def test_status_flow_and_table_effects(self):
        res = self.book(table_number='1')
        for step in ('confirmed', 'arrived'):
            self.assertEqual(svc.change_status(self.shop, res.pk, step).status, step)
            self.t1.refresh_from_db()
            self.assertEqual(self.t1.status, 'free')                  # "keldi" stolni band qilmaydi
        svc.change_status(self.shop, res.pk, 'seated')
        self.t1.refresh_from_db()
        self.assertEqual(self.t1.status, 'occupied')
        svc.change_status(self.shop, res.pk, 'completed')
        self.t1.refresh_from_db()
        self.assertEqual(self.t1.status, 'free')

    def test_illegal_transitions_are_rejected(self):
        res = self.book(table_number='1')
        for bad in ('completed',):
            with self.assertRaises(svc.ReservationError) as ctx:
                svc.change_status(self.shop, res.pk, bad)
            self.assertEqual(ctx.exception.status, 409)
        svc.change_status(self.shop, res.pk, 'cancelled')
        with self.assertRaises(svc.ReservationError):
            svc.change_status(self.shop, res.pk, 'seated')           # bekor qilingan qayta tiklanmaydi
        with self.assertRaises(svc.ReservationError):
            svc.change_status(self.shop, res.pk, 'yo\'q-holat')

    def test_cancelling_a_seated_booking_frees_the_table_but_not_one_with_an_open_bill(self):
        res = self.book(table_number='1')
        svc.change_status(self.shop, res.pk, 'seated')
        Order.objects.create(shop=self.shop, table=self.t1, order_number='GLS-B-1', customer_name='A',
                             customer_phone_1='+998901112233', total_amount=1000, final_amount=1000,
                             status='confirmed', payment_status='unpaid')
        svc.change_status(self.shop, res.pk, 'completed')
        self.t1.refresh_from_db()
        self.assertEqual(self.t1.status, 'occupied')                 # to'lanmagan hisob bor: stol ochiq qoladi

    def test_seating_needs_a_free_table(self):
        res = self.book(table_number='1')
        Table.objects.filter(pk=self.t1.pk).update(status='occupied')
        with self.assertRaises(svc.ReservationError) as ctx:
            svc.change_status(self.shop, res.pk, 'seated')
        self.assertEqual(ctx.exception.code, 'table_busy')

    def test_other_restaurants_cannot_touch_the_booking(self):
        res = self.book()
        other = self.make_restaurant('begona-bron')
        with self.assertRaises(svc.ReservationError) as ctx:
            svc.change_status(other, res.pk, 'cancelled')
        self.assertEqual(ctx.exception.status, 404)

    # ---- R4-3: walk-in ----
    def test_walk_in_seats_the_guest_and_occupies_the_table(self):
        res = svc.create_reservation(self.shop, {'customer_name': 'Jonli', 'table_number': '2', 'guests_count': 3,
                                                 'walk_in': True}, by_staff=True)
        self.assertEqual((res.status, res.is_walk_in, res.reservation_date), ('seated', True, timezone.localdate()))
        self.t2.refresh_from_db()
        self.assertEqual(self.t2.status, 'occupied')

    def test_walk_in_without_table_gets_a_free_one_and_busy_table_is_refused(self):
        Table.objects.filter(pk=self.t1.pk).update(status='occupied')
        res = svc.create_reservation(self.shop, {'guests_count': 2, 'walk_in': True}, by_staff=True)
        self.assertNotEqual(res.table, self.t1)
        with self.assertRaises(svc.ReservationError) as ctx:
            svc.create_reservation(self.shop, {'table_number': '1', 'walk_in': True}, by_staff=True)
        self.assertEqual(ctx.exception.code, 'table_busy')

    def test_guest_cannot_create_a_walk_in(self):
        res = svc.create_reservation(self.shop, payload(walk_in=True, status='seated'), by_staff=False)
        self.assertEqual((res.status, res.is_walk_in), ('pending', False))

    def test_new_booking_does_not_collide_with_a_walk_in_sitting_there_now(self):
        svc.create_reservation(self.shop, {'table_number': '1', 'walk_in': True}, by_staff=True)
        now = timezone.localtime()
        with self.assertRaises(svc.ReservationError):
            self.book(table_number='1', reservation_date=str(now.date()), reservation_time=now.strftime('%H:%M'))

    # ---- kod ----
    def test_codes_are_unique_unguessable_and_found_by_exact_code_only(self):
        a, b = self.book(), self.book(customer_phone='+998909998877')
        self.assertNotEqual(a.code, b.code)
        self.assertRegex(a.code, r'^GS-[A-Z2-9]{5}$')
        qs = TableReservation.objects.filter(shop=self.shop)
        self.assertEqual(find_reservation_by_code_or_phone(qs, a.code.lower()), a)
        self.assertIsNone(find_reservation_by_code_or_phone(qs, 'GS-2841'))
        self.assertIsNone(find_reservation_by_code_or_phone(qs, a.code[:-1]))

    # ---- stol 'reserved' ----
    def test_table_with_a_booking_starting_soon_shows_as_reserved(self):
        now = timezone.localtime()
        soon = (now + timedelta(minutes=30))
        if soon.date() != now.date():
            self.skipTest('yarim tunga yaqin')
        self.book(table_number='1', reservation_date=str(now.date()), reservation_time=soon.strftime('%H:%M'))
        self.assertIn(self.t1.pk, svc.upcoming_reserved_table_ids(self.shop))
        self.assertNotIn(self.t2.pk, svc.upcoming_reserved_table_ids(self.shop))


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class ReservationApiTests(ReservationFixture, TestCase):
    API = '/api/v1/restaurant'

    def setUp(self):
        self.shop = self.make_restaurant('api-bron')
        # Bronlar bilan hostess ishlaydi (ofitsiant emas — ruxsat matritsasi, R2)
        self.hostess = AdminUser.objects.create_user(username='api-bron-hostess', password='Hostess-1', role='hostess',
                                                     shop=self.shop, is_staff=True)
        self.staff = Client()
        self.staff.force_login(self.hostess)
        self.guest = Client()

    def post(self, client, **extra):
        return client.post(f'{self.API}/reservations/', json.dumps(payload(**extra)), content_type='application/json')

    def test_guest_gets_a_clear_400_for_bad_input_and_409_for_conflicts(self):
        bad = self.post(self.guest, reservation_date='ertaga')
        self.assertEqual(bad.status_code, 400)
        self.assertIn('Sana', bad.json()['error'])
        self.assertEqual(self.post(self.guest, table_number='1').status_code, 201)
        clash = self.post(self.guest, table_number='1', reservation_time='19:30')
        self.assertEqual((clash.status_code, clash.json()['code']), (409, 'conflict'))

    def test_staff_list_defaults_to_todays_active_bookings(self):
        today = str(timezone.localdate())
        self.post(self.staff, reservation_date=today, reservation_time='23:30', table_number='1')
        other_day = self.post(self.staff, table_number='1').json()['reservation']
        cancelled = self.post(self.staff, reservation_date=today, reservation_time='23:30', table_number='2').json()['reservation']
        self.staff.patch(f'{self.API}/reservations/{cancelled["id"]}/status/', json.dumps({'status': 'cancelled'}),
                         content_type='application/json')
        rows = self.staff.get(f'{self.API}/reservations/').json()['reservations']
        self.assertEqual([r['table_number'] for r in rows], ['1'])
        self.assertNotIn(other_day['id'], [r['id'] for r in rows])
        everything = self.staff.get(f'{self.API}/reservations/?date=all&status=all').json()['reservations']
        self.assertEqual(len(everything), 3)

    def test_guests_cannot_list_or_change_bookings(self):
        created = self.post(self.guest).json()['reservation']
        self.assertIn(self.guest.get(f'{self.API}/reservations/').status_code, (401, 403))
        res = self.guest.patch(f'{self.API}/reservations/{created["id"]}/status/', json.dumps({'status': 'seated'}),
                               content_type='application/json')
        self.assertIn(res.status_code, (401, 403))
        self.assertEqual(TableReservation.objects.get(pk=created['id']).status, 'pending')

    def test_status_endpoint_validates_transitions_and_arrived_is_not_seated(self):
        created = self.post(self.guest, table_number='1').json()['reservation']
        url = f'{self.API}/reservations/{created["id"]}/status/'
        patch = lambda status: self.staff.patch(url, json.dumps({'status': status}), content_type='application/json')  # noqa: E731
        self.assertEqual(patch('arrived').json()['status'], 'arrived')      # avval 'seated' ga aylanib stolni band qilardi
        self.assertEqual(Table.objects.get(shop=self.shop, number='1').status, 'free')
        self.assertEqual(patch('completed').status_code, 409)
        self.assertEqual(patch('seated').json()['status'], 'seated')
        self.assertEqual(Table.objects.get(shop=self.shop, number='1').status, 'occupied')
        self.assertEqual(patch('nomalum').status_code, 400)

    def test_foreign_restaurant_booking_is_404(self):
        other = self.make_restaurant('begona-api')
        foreign = svc.create_reservation(other, payload())
        res = self.staff.patch(f'{self.API}/reservations/{foreign.pk}/status/', json.dumps({'status': 'confirmed'}),
                               content_type='application/json')
        self.assertEqual(res.status_code, 404)

    def test_walk_in_through_the_api_occupies_the_table(self):
        res = self.staff.post(f'{self.API}/reservations/', json.dumps(
            {'customer_name': 'Jonli', 'table_number': '3', 'walk_in': True, 'guests_count': 2}), content_type='application/json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()['reservation']['status'], 'seated')
        self.assertEqual(Table.objects.get(shop=self.shop, number='3').status, 'occupied')
        tables = {t['number']: t['status'] for t in self.staff.get(f'{self.API}/tables/').json()}
        self.assertEqual(tables['3'], 'occupied')

    def test_find_by_code_is_masked_and_rate_limited(self):
        created = self.post(self.guest, customer_name='Muhayyo Karimova').json()['reservation']
        found = self.guest.get(f'{self.API}/reservations/find/', {'q': created['code']}).json()['reservation']
        self.assertEqual(found['customer_name'], 'Muhayyo K.')
        self.assertNotIn('Karimova', json.dumps(found))
        self.assertNotIn('1234567', json.dumps(found))
        from django.core.cache import cache
        cache.clear()
        self.addCleanup(cache.clear)          # tezlik sanagichi keyingi testlarga o'tib qolmasin
        codes = [self.guest.get(f'{self.API}/reservations/find/', {'q': f'GS-AAAA{i}'}).status_code for i in range(25)]
        self.assertIn(429, codes)

    def test_booking_triggers_one_outbox_event_not_a_synchronous_telegram_call(self):
        from notifications.models import OutboxEvent
        self.post(self.guest)
        self.assertEqual(OutboxEvent.objects.filter(event_type='reservation_created').count(), 1)


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class GuestPagesTests(ReservationFixture, TestCase):

    def setUp(self):
        self.shop = self.make_restaurant('sahifa-bron')
        self.client = Client()

    def book(self, **extra):
        return svc.create_reservation(self.shop, payload(**extra))

    def test_table_hub_form_validates_and_shows_the_code(self):
        res = self.client.post('/table/', {'action': 'reserve_table', 'customer_name': 'Sardor',
                                           'customer_phone': '+998901112244', 'reservation_date': tomorrow(),
                                           'reservation_time': '18:30', 'guests_count': '3'})
        self.assertEqual(res.status_code, 200)
        reservation = TableReservation.objects.get()
        self.assertIn(reservation.code, res.content.decode())
        self.assertEqual(reservation.table.shop, self.shop)

    def test_table_hub_form_with_bad_date_is_a_message_not_a_500(self):
        res = self.client.post('/table/', {'action': 'reserve_table', 'customer_name': 'Sardor',
                                           'customer_phone': '+998901112244', 'reservation_date': 'xato',
                                           'reservation_time': '18:30', 'guests_count': 'ko\'p'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(TableReservation.objects.exists())
        self.assertIn('Sana', res.content.decode())

    def test_picking_a_table_from_the_list_is_off_in_production(self):
        table = Table.objects.filter(shop=self.shop).first()
        res = self.client.post('/table/', {'action': 'select_table', 'table_id': str(table.pk)})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('tma_table_token', self.client.session)
        with override_settings(RESTAURANT_ALLOW_TABLE_NUMBER_URL=True):
            res = self.client.post('/table/', {'action': 'select_table', 'table_id': str(table.pk)})
            self.assertEqual(res.status_code, 302)

    def test_arrival_check_in_marks_arrived_and_links_the_reserved_table_by_token(self):
        now = timezone.localtime()
        res = self.book(reservation_date=str(now.date()), reservation_time=(now + timedelta(minutes=5)).strftime('%H:%M'),
                        table_number='2') if now.hour < 23 else None
        if res is None:
            self.skipTest('yarim tunga yaqin')
        page = self.client.post('/reservation/arrival/', {'code': res.code})
        self.assertEqual(page.status_code, 302)
        res.refresh_from_db()
        self.assertEqual(res.status, 'arrived')
        self.assertEqual(page['Location'], f'/menu/?table={res.table.qr_token}&arrived=1')
        self.assertEqual(self.client.session['tma_table_token'], str(res.table.qr_token))

    def test_arrival_check_in_needs_the_exact_code_and_todays_date(self):
        res = self.book(table_number='2')                                       # ertaga
        for code in ('GS-ZZZZZ', '', 'GS-2841'):
            page = self.client.post('/reservation/arrival/', {'code': code})
            self.assertEqual(page.status_code, 200, code)
            self.assertNotIn('tma_table_token', self.client.session)
        page = self.client.post('/reservation/arrival/', {'code': res.code})
        self.assertEqual(page.status_code, 200)                                  # bugungi emas
        self.assertEqual(TableReservation.objects.get().status, 'pending')

    def test_arrival_check_in_phone_must_match_when_given(self):
        now = timezone.localtime()
        if now.hour >= 23:
            self.skipTest('yarim tunga yaqin')
        res = self.book(reservation_date=str(now.date()), reservation_time=(now + timedelta(minutes=5)).strftime('%H:%M'),
                        table_number='2')
        page = self.client.post('/reservation/arrival/', {'code': res.code, 'phone': '+998 90 000 00 00'})
        self.assertEqual(page.status_code, 200)
        self.assertEqual(TableReservation.objects.get().status, 'pending')

    def test_no_mock_guest_is_shown_to_visitors(self):
        for url in ('/reservation/arrival/', '/reservation/find/'):
            self.assertNotIn('Muhayyo', self.client.get(url).content.decode(), url)
        with override_settings(DEMO_MODE=True):
            self.assertIn('Muhayyo', self.client.get('/reservation/arrival/').content.decode())

    def test_hostess_desk_lists_only_todays_active_bookings(self):
        owner = AdminUser.objects.get(username='sahifa-bron-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        waiter = AdminUser.objects.create_user(username='hostess-x', password='Hostess-1', role='hostess',
                                               shop=self.shop, is_staff=True)
        today = str(timezone.localdate())
        keep = self.book(reservation_date=today, reservation_time='23:50', table_number='1', customer_name='Bugungi Mehmon')
        gone = self.book(reservation_date=today, reservation_time='23:50', table_number='2', customer_name='Bekor Mehmon')
        svc.change_status(self.shop, gone.pk, 'cancelled')
        self.book(customer_name='Ertangi Mehmon')
        staff = Client()
        staff.force_login(waiter)
        html = staff.get('/arrival/desk/').content.decode()
        self.assertIn('Bugungi Mehmon', html)
        self.assertNotIn('Bekor Mehmon', html)
        self.assertNotIn('Ertangi Mehmon', html)
        self.assertNotIn('Registon', html)
        self.assertIn(keep.code, html)


class ReservationConcurrencyTests(ReservationFixture, TransactionTestCase):
    """Parallel so'rovlar: bir stolga ikkita bron o'tib ketmasligi kerak."""

    def test_parallel_bookings_for_one_table_never_double_book(self):
        shop = self.make_restaurant('parallel', tables=1)
        results = []

        def attempt():
            # SQLite (testda xotirada) yozuv qulfini "database table is locked" deb darhol qaytaradi — haqiqiy mijoz
            # shunda qayta urinadi. Postgres'da bu holat bo'lmaydi (qator qulfi navbatga qo'yadi).
            try:
                for _ in range(40):
                    try:
                        svc.create_reservation(shop, payload(table_number='1', customer_phone='+998901234567'))
                        results.append('ok')
                        return
                    except svc.ReservationError:
                        results.append('conflict')
                        return
                    except OperationalError:
                        time.sleep(0.05)
                results.append('locked')
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(TableReservation.objects.filter(shop=shop, status='pending').count(), results.count('ok'))
        self.assertEqual(results.count('ok'), 1, results)
