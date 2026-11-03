"""Bron sozlamasi (`Shop.business_profile['booking']`): standart, normallash (o'qishda saytni buzmaydi), qat'iy tekshiruv (admin PATCH)
va sozlamalar API'si (GET to'liq `booking`, PATCH to'liq almashtirish, xato — 400 + field)."""
import copy
import io

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from accounts.models import AdminUser
from backend.api_input import InputError
from backend.runtime_cache import invalidate_runtime_cache
from shops import booking_config as bc
from shops.booking_config import DEFAULT_BOOKING, get_booking_config, normalize_booking, validate_booking_strict
from shops.models import Shop


class DefaultTests(SimpleTestCase):

    def test_default_matches_the_tz(self):
        d = DEFAULT_BOOKING
        self.assertTrue(d['enabled'])
        self.assertEqual([s['key'] for s in d['slots']], ['lunch', 'dinner'])
        self.assertEqual(d['slots'][0]['times'], ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00'])
        self.assertEqual(d['slots'][1]['times'], ['19:30', '20:00', '20:30', '21:00', '21:30'])
        self.assertEqual([e['key'] for e in d['event_types']], ['none', 'birthday', 'anniversary', 'business', 'wedding'])
        self.assertEqual((d['duration_minutes'], d['max_days_ahead'], d['min_notice_minutes']), (120, 30, 60))
        self.assertEqual((d['auto_confirm'], d['closed_weekdays']), (False, []))

    def test_normalizing_nothing_gives_the_default_and_a_copy(self):
        for empty in (None, {}, '', 5, [], 'x'):
            self.assertEqual(normalize_booking(empty), DEFAULT_BOOKING, repr(empty))
        out = normalize_booking(None)
        out['slots'].append('x')
        self.assertEqual(len(DEFAULT_BOOKING['slots']), 2, 'standart qiymat o\'zgarmasligi kerak')

    def test_default_survives_strict_validation_unchanged(self):
        self.assertEqual(validate_booking_strict(copy.deepcopy(DEFAULT_BOOKING)), DEFAULT_BOOKING)


class NormalizeTests(SimpleTestCase):
    """O'qish: buzuq qiymat saytni buzmaydi."""

    def test_bad_scalars_fall_back_to_defaults(self):
        out = normalize_booking({'enabled': 'maybe', 'duration_minutes': 5, 'max_days_ahead': 9999, 'min_notice_minutes': -1,
                                 'auto_confirm': 'ha', 'closed_weekdays': 'dushanba'})
        self.assertEqual((out['enabled'], out['duration_minutes'], out['max_days_ahead'], out['min_notice_minutes'],
                          out['auto_confirm'], out['closed_weekdays']), (True, 120, 30, 60, False, []))

    def test_valid_scalars_are_kept(self):
        out = normalize_booking({'enabled': False, 'duration_minutes': 90, 'max_days_ahead': 60, 'min_notice_minutes': 0,
                                 'auto_confirm': True, 'closed_weekdays': [6, 0, 6]})
        self.assertEqual((out['enabled'], out['duration_minutes'], out['max_days_ahead'], out['min_notice_minutes'],
                          out['auto_confirm'], out['closed_weekdays']), (False, 90, 60, 0, True, [0, 6]))

    def test_times_are_zero_padded_sorted_and_deduplicated(self):
        out = normalize_booking({'slots': [{'key': 'a', 'label': 'A', 'times': ['9:30', '09:00', '9:30', '25:00', 'abc', '12:5', 7]},
                                           {'key': 'b', 'label': 'B', 'times': ['09:00', '10:00']}]})
        self.assertEqual(out['slots'], [{'key': 'a', 'label': 'A', 'times': ['09:00', '09:30']},
                                        {'key': 'b', 'label': 'B', 'times': ['10:00']}])     # 09:00 ikkinchi oraliqda takror: tashlandi

    def test_broken_slots_are_dropped_and_if_none_left_the_default_is_used(self):
        out = normalize_booking({'slots': [{'key': 'BAD KEY', 'label': 'x', 'times': ['10:00']}, {'key': 'k', 'label': '', 'times': ['10:00']},
                                           {'key': 'k2', 'label': 'x', 'times': []}, 'matn', None]})
        self.assertEqual(out['slots'], DEFAULT_BOOKING['slots'])
        self.assertEqual(normalize_booking({'slots': 'matn'})['slots'], DEFAULT_BOOKING['slots'])

    def test_empty_slots_while_disabled_stay_empty_but_enabled_gets_the_default(self):
        self.assertEqual(normalize_booking({'enabled': False, 'slots': []})['slots'], [])
        self.assertEqual(normalize_booking({'enabled': True, 'slots': []})['slots'], DEFAULT_BOOKING['slots'])

    def test_event_types_garbage_is_dropped_duplicates_removed_empty_list_allowed(self):
        out = normalize_booking({'event_types': [{'key': 'a', 'label': 'A', 'label_ru': 'А', 'label_en': ''}, {'key': 'a', 'label': 'Dup'},
                                                 {'key': 'B', 'label': 'x'}, {'key': 'ok', 'label': ''}, 5]})
        self.assertEqual(out['event_types'], [{'key': 'a', 'label': 'A', 'label_ru': 'А'}])
        self.assertEqual(normalize_booking({'event_types': []})['event_types'], [])           # tadbir turi tanlovi yashirin
        self.assertEqual(normalize_booking({'event_types': 'x'})['event_types'], DEFAULT_BOOKING['event_types'])

    def test_limits_truncate_instead_of_breaking(self):
        slots = [{'key': f's{i}', 'label': 'x', 'times': [f'{i:02d}:00']} for i in range(20)]
        self.assertEqual(len(normalize_booking({'slots': slots})['slots']), bc.MAX_SLOTS)
        events = [{'key': f'e{i}', 'label': 'x'} for i in range(40)]
        self.assertEqual(len(normalize_booking({'event_types': events})['event_types']), bc.MAX_EVENT_TYPES)

    def test_long_labels_are_rejected_not_cut(self):
        out = normalize_booking({'event_types': [{'key': 'a', 'label': 'x' * 41}, {'key': 'b', 'label': 'x' * 40}]})
        self.assertEqual([e['key'] for e in out['event_types']], ['b'])

    def test_unknown_keys_are_not_kept(self):
        self.assertNotIn('evil', normalize_booking({'evil': '<script>', 'enabled': True}))


class StrictTests(SimpleTestCase):

    def bad(self, value, field):
        with self.assertRaises(InputError) as ctx:
            validate_booking_strict(value)
        self.assertEqual(ctx.exception.detail['field'], field, ctx.exception.detail)
        self.assertEqual(ctx.exception.status_code, 400)

    def base(self):
        return copy.deepcopy(DEFAULT_BOOKING)

    def test_not_an_object(self):
        for value in (None, [], 'x', 5):
            self.bad(value, 'booking')

    def test_bad_time_has_exact_path(self):
        v = self.base()
        v['slots'][1]['times'][0] = '25:00'
        self.bad(v, 'booking.slots[1].times[0]')
        for bad_time in ('7pm', '19.30', '', None, 1930, '19:60', '24:00'):
            v = self.base()
            v['slots'][0]['times'][2] = bad_time
            self.bad(v, 'booking.slots[0].times[2]')

    def test_duplicate_time_even_across_slots(self):
        v = self.base()
        v['slots'][1]['times'][0] = '12:30'
        self.bad(v, 'booking.slots[1].times[0]')
        v = self.base()
        v['slots'][0]['times'][1] = '12:30'
        self.bad(v, 'booking.slots[0].times[1]')

    def test_slot_key_label_and_duplicates(self):
        v = self.base(); v['slots'][0]['key'] = 'Bad Key'
        self.bad(v, 'booking.slots[0].key')
        v = self.base(); v['slots'][0]['key'] = 'k' * 21
        self.bad(v, 'booking.slots[0].key')
        v = self.base(); v['slots'][1]['key'] = 'lunch'
        self.bad(v, 'booking.slots[1].key')
        v = self.base(); v['slots'][0]['label'] = ' '
        self.bad(v, 'booking.slots[0].label')
        v = self.base(); v['slots'][0]['label'] = 'x' * 41
        self.bad(v, 'booking.slots[0].label')
        v = self.base(); v['slots'][0]['times'] = []
        self.bad(v, 'booking.slots[0].times')

    def test_enabled_booking_needs_a_slot_but_disabled_may_have_none(self):
        v = self.base(); v['slots'] = []
        self.bad(v, 'booking.slots')
        v['enabled'] = False
        self.assertEqual(validate_booking_strict(v)['slots'], [])

    def test_event_types(self):
        v = self.base(); v['event_types'][2]['key'] = 'BAD'
        self.bad(v, 'booking.event_types[2].key')
        v = self.base(); v['event_types'][1]['key'] = 'none'
        self.bad(v, 'booking.event_types[1].key')
        v = self.base(); v['event_types'][0]['label'] = 'x' * 41
        self.bad(v, 'booking.event_types[0].label')
        v = self.base(); v['event_types'][0]['label_ru'] = 'x' * 41
        self.bad(v, 'booking.event_types[0].label_ru')
        v = self.base(); v['event_types'] = 'x'
        self.bad(v, 'booking.event_types')
        v = self.base(); v['event_types'] = [{'key': f'e{i}', 'label': 'x'} for i in range(21)]
        self.bad(v, 'booking.event_types')
        v = self.base(); v['event_types'] = []
        self.assertEqual(validate_booking_strict(v)['event_types'], [])

    def test_numeric_ranges(self):
        for name, low, high in (('duration_minutes', 15, 600), ('max_days_ahead', 1, 365), ('min_notice_minutes', 0, 1440)):
            for ok in (low, high):
                v = self.base(); v[name] = ok
                self.assertEqual(validate_booking_strict(v)[name], ok)
            for bad in (low - 1, high + 1, 'x', None, True, 1.5, [], {}):
                v = self.base(); v[name] = bad
                self.bad(v, f'booking.{name}')

    def test_weekdays_and_booleans(self):
        v = self.base(); v['closed_weekdays'] = [0, 7]
        self.bad(v, 'booking.closed_weekdays[1]')
        v = self.base(); v['closed_weekdays'] = list(range(7))
        self.bad(v, 'booking.closed_weekdays')
        v = self.base(); v['closed_weekdays'] = 'x'
        self.bad(v, 'booking.closed_weekdays')
        v = self.base(); v['closed_weekdays'] = [6, 0, 6]
        self.assertEqual(validate_booking_strict(v)['closed_weekdays'], [0, 6])
        for name in ('enabled', 'auto_confirm'):
            v = self.base(); v[name] = 'ehtimol'
            self.bad(v, f'booking.{name}')
            v = self.base(); v[name] = 1
            self.bad(v, f'booking.{name}')

    def test_totals_and_missing_keys(self):
        v = {'slots': [{'key': f's{i}', 'label': 'x', 'times': [f'{i * 2:02d}:{m:02d}' for m in range(0, 60, 10)]} for i in range(12)]}
        self.assertEqual(len(validate_booking_strict(v)['slots']), 12)        # 12 x 6 = 72 ta vaqt: chegarada
        # yetishmayotgan kalitlar standart bilan to'ldiriladi
        self.assertEqual(validate_booking_strict({'enabled': False})['duration_minutes'], 120)

    def test_too_many_times_in_total(self):
        v = {'slots': [{'key': f's{i}', 'label': 'x', 'times': [f'{h:02d}:{m:02d}' for h in range(i * 2, i * 2 + 2) for m in range(0, 60, 15)]}
                       for i in range(12)]}
        with self.assertRaises(InputError):
            validate_booking_strict(v)


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class SettingsApiTests(TestCase):
    API = '/api/restaurant/admin/v1/settings/'

    def setUp(self):
        call_command('create_restaurant', name='Bron Sozlama', slug='bron-sozlama', owner='bron-sozlama-ega',
                     password='Bron-parol-123', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='bron-sozlama')
        owner = AdminUser.objects.get(username='bron-sozlama-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        self.client = Client()
        self.client.force_login(owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)

    def patch(self, **fields):
        return self.client.patch(self.API, fields, content_type='application/json')

    def test_get_returns_the_full_normalized_default(self):
        self.assertEqual(self.client.get(self.API).json()['booking'], DEFAULT_BOOKING)
        self.assertEqual(get_booking_config(self.shop), DEFAULT_BOOKING)

    def test_patch_replaces_the_whole_booking_object_and_is_read_back(self):
        new = {'enabled': True, 'slots': [{'key': 'brunch', 'label': 'Nonushta', 'label_ru': 'Завтрак', 'times': ['10:00', '09:00']}],
               'event_types': [{'key': 'party', 'label': 'Bazm'}], 'duration_minutes': 90, 'max_days_ahead': 14,
               'min_notice_minutes': 30, 'auto_confirm': True, 'closed_weekdays': [0]}
        res = self.patch(booking=new)
        self.assertEqual(res.status_code, 200, res.content)
        saved = res.json()['booking']
        self.assertEqual(saved['slots'], [{'key': 'brunch', 'label': 'Nonushta', 'label_ru': 'Завтрак', 'times': ['09:00', '10:00']}])
        self.assertEqual((saved['duration_minutes'], saved['auto_confirm'], saved['closed_weekdays']), (90, True, [0]))
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.business_profile['booking'], saved)
        self.assertEqual(get_booking_config(self.shop), saved)
        # to'liq almashtirish: yetishmayotgan kalitlar standartga qaytadi (eski qiymat qolmaydi)
        self.patch(booking={'enabled': False})
        self.assertEqual(get_booking_config(self.shop)['duration_minutes'], 120)
        self.assertFalse(get_booking_config(self.shop)['enabled'])

    def test_invalid_booking_is_400_with_field_and_nothing_is_saved(self):
        self.patch(booking={'duration_minutes': 45})
        bad = copy.deepcopy(DEFAULT_BOOKING)
        bad['slots'][1]['times'][0] = '99:99'
        res = self.patch(booking=bad, name='Yangi nom')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['field'], 'booking.slots[1].times[0]')
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.name, 'Bron Sozlama')                       # boshqa maydonlar ham saqlanmadi
        self.assertEqual(get_booking_config(self.shop)['duration_minutes'], 45)

    def test_garbage_in_storage_never_breaks_get(self):
        self.shop.business_profile = {**(self.shop.business_profile or {}), 'booking': {'slots': 'x', 'duration_minutes': 'ko\'p', 'enabled': 7}}
        self.shop.save()
        invalidate_runtime_cache()
        self.assertEqual(self.client.get(self.API).json()['booking'], DEFAULT_BOOKING)
        self.shop.business_profile = {'booking': 'matn'}
        self.shop.save()
        self.assertEqual(self.client.get(self.API).json()['booking'], DEFAULT_BOOKING)

    def test_only_settings_admins_can_change_it(self):
        waiter = AdminUser.objects.create_user(username='bron-ofitsiant', password='Parol-12345', role='waiter', shop=self.shop, is_approved=True)
        client = Client()
        client.force_login(waiter)
        res = client.patch(self.API, {'booking': {'enabled': False}}, content_type='application/json')
        self.assertEqual(res.status_code, 403)
        self.assertTrue(get_booking_config(self.shop)['enabled'])

    def test_helpers(self):
        config = copy.deepcopy(DEFAULT_BOOKING)
        self.assertEqual(bc.all_times(config)[:2], ['12:30', '13:00'])
        self.assertEqual(len(bc.all_times(config)), 11)
        self.assertEqual(bc.event_label(config, 'birthday'), "Tug'ilgan kun")
        self.assertEqual(bc.event_label(config, 'removed_one'), 'removed_one')       # katalogdan olingan eski kalit yo'qolmaydi
        self.assertEqual(bc.event_label(config, ''), '')
        self.assertEqual(bc.minutes_of('19:30'), 1170)
