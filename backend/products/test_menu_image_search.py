"""Internetdan taom rasmi qidirish (products/menu_import/image_search.py): lug'at, litsenziya filtri, tozalash, takror, manba yiqilishi,
kesh va tezlik cheklovi. HAMMA tashqi so'rov mock: tarmoqqa chiqmaydi."""
from unittest import mock

from django.core.cache import cache
from django.test import SimpleTestCase

from products.image_test_utils import (
    FakeResponse,
    NoNetworkMixin,
    cm_page,
    commons_payload,
    openverse_payload,
    ov_item,
)
from products.menu_import import image_search as ims


class DictionaryTests(SimpleTestCase):
    def test_dictionary_is_large_enough(self):
        self.assertGreaterEqual(len(ims._DISH_TERMS), 60)

    def test_known_dishes(self):
        cases = {
            'Palov': 'plov pilaf', 'osh': 'plov pilaf', "To'y oshi": 'plov pilaf', 'Plov': 'plov pilaf',
            "Lag'mon": 'lagman noodles', 'Lagʻmon': 'lagman noodles', 'LAG’MON': 'lagman noodles', 'lagmon': 'lagman noodles',
            'Lagʼmon': 'lagman noodles', 'Manti': 'manti dumplings', 'Shashlik': 'shashlik kebab', 'Somsa': 'samsa pastry',
            'Somsalar': 'samsa pastry', 'Samsa': 'samsa pastry', 'Chuchvara': 'chuchvara dumplings', 'Norin': 'norin noodles',
            'Mastava': 'mastava soup', "Sho'rva": 'shurpa soup',
            'Dimlama': 'dimlama stew', 'Qozon kabob': 'kazan kebab', 'Tandir kabob': 'tandoor kebab', 'Kabob': 'kebab',
            'Lyulya': 'lula kebab', 'Achchiq-chuchuk': 'tomato onion salad', 'Shakarob': 'tomato onion salad',
            'Non': 'uzbek bread', 'Obi non': 'uzbek bread tandoor', 'Patir': 'patir bread', 'Choy': 'tea',
            "Ko'k choy": 'green tea', 'Kompot': 'compote', 'Ayran': 'ayran drink', 'Medovik': 'medovik honey cake',
            'Napoleon': 'napoleon cake', 'Chak-chak': 'chak-chak', 'Halva': 'halva', 'Baklava': 'baklava',
            'Pishiriq': 'fried dough', 'Shirguruch': 'rice pudding', 'Halim': 'haleem stew', 'Qovurma': 'fried meat',
            'Плов': 'plov pilaf', 'Лагман': 'lagman noodles', 'Манты': 'manti dumplings', 'Шашлык': 'shashlik kebab',
        }
        for name, expected in cases.items():
            with self.subTest(name=name):
                self.assertEqual(ims.translate_dish_name(name), expected)

    def test_longest_phrase_wins_and_modifiers_are_kept_in_mind(self):
        self.assertEqual(ims.translate_dish_name('Qozon kabob (1 porsiya)'), 'kazan kebab')
        self.assertEqual(ims.translate_dish_name('Shirguruch osh'), 'rice pudding')

    def test_bare_ambiguous_names_always_carry_a_food_word(self):
        """Haqiqiy sinovda «manti» -> mantis/Manti shahri, «lagman» -> shved huquqshunos unvoni chiqdi: bunday nomlar taom so'zisiz yuborilmaydi."""
        for name in ('Manti', 'Lagmon', 'Somsa', 'Norin', 'Mastava', 'Halim', 'Xonim'):
            with self.subTest(name=name):
                self.assertGreaterEqual(len(ims.translate_dish_name(name).split()), 2)

    def test_dictionary_values_are_well_formed(self):
        for key, value in ims._DISH_TERMS.items():
            phrase, _, fallback = value.partition('|')
            self.assertTrue(phrase.strip() and phrase == phrase.strip(), key)
            self.assertNotIn('|', fallback, key)
            self.assertTrue(phrase.isascii(), key)

    def test_no_false_positives_on_prefixes(self):
        for name in ('Oshxona', 'Boshqa', 'Qaymoqli pishloq', 'Nonushta', 'Kosha', 'x', ''):
            with self.subTest(name=name):
                self.assertIsNone(ims.translate_dish_name(name))

    def test_candidates(self):
        self.assertEqual(ims.query_candidates('Palov'), ['plov pilaf', 'plov'])
        self.assertEqual(ims.query_candidates('Manti'), ['manti dumplings'])           # zaxira so'z yo'q: «manti» -> ninachi/shahar
        self.assertEqual(ims.query_candidates('Non'), ['uzbek bread', 'flatbread'])
        self.assertEqual(ims.query_candidates('Somsa'), ['samsa pastry'])
        self.assertEqual(ims.query_candidates('Qaymoqli pishloq'), ['Qaymoqli pishloq food dish', 'Qaymoqli pishloq'])
        # apostrof turlari tashqi qidiruvga o'tmaydi
        self.assertEqual(ims.query_candidates("Bo'lka"), ['Bolka food dish', 'Bolka'])

    def test_clean_query(self):
        self.assertEqual(ims.clean_query('  Lag’mon \n\t zo\x00r  '), 'Lag’mon zo r')
        for bad in ('', ' ', 'a', None, 'x' * 101):
            with self.subTest(bad=bad), self.assertRaises(ims.ImageQueryError):
                ims.clean_query(bad)


class TextCleaningTests(SimpleTestCase):
    def test_html_is_stripped(self):
        html_artist = '<a href="//x" title="t">Ali&nbsp;V.</a><script>alert(1)</script> &lt;b&gt; <style>p{}</style>&amp; Co'
        cleaned = ims.clean_text(html_artist, 120)
        self.assertNotIn('<', cleaned)
        self.assertNotIn('>', cleaned)
        self.assertNotIn('alert', cleaned)
        self.assertIn('Ali', cleaned)
        self.assertIn('& Co', cleaned)

    def test_non_strings_and_limits(self):
        self.assertEqual(ims.clean_text(None, 10), '')
        self.assertEqual(ims.clean_text({'a': 1}, 10), '')
        self.assertEqual(len(ims.clean_text('x' * 500, 120)), 120)
        self.assertEqual(ims.clean_text('a\x00b‮c\nd', 20), 'a b c d')


class LicenseTests(SimpleTestCase):
    def test_commons_license_names(self):
        accepted = {
            'CC0': 'cc0', 'CC0 1.0': 'cc0', 'CC-Zero': 'cc0', 'Public domain': 'pdm', 'Public domain (self)': 'pdm', 'PD-old': 'pdm',
            'CC BY 4.0': 'by', 'CC BY 2.0': 'by', 'CC-BY-3.0': 'by', 'CC BY 3.0 de': 'by', 'CC BY-SA 4.0': 'by-sa',
            'CC BY-SA 2.5': 'by-sa', 'cc-by-sa-3.0': 'by-sa', 'CC BY-SA 3.0 it': 'by-sa',
        }
        for name, expected in accepted.items():
            with self.subTest(name=name):
                self.assertEqual(ims.parse_commons_license(name), expected)
        for name in ('CC BY-NC 4.0', 'CC BY-ND 2.0', 'CC BY-NC-SA 3.0', 'CC BY-NC-ND 2.0', 'GFDL', 'GPL', 'Attribution', '',
                     'Fair use', 'All rights reserved', 'CC BY-SA 4.0 migrated', None):
            with self.subTest(name=name):
                self.assertIsNone(ims.parse_commons_license(name))

    def test_credit_is_compact(self):
        self.assertEqual(ims.build_credit('Boonlong1', 'by'), 'Boonlong1 · CC BY')
        self.assertEqual(ims.build_credit('Ali', 'by-sa'), 'Ali · CC BY-SA')
        self.assertEqual(ims.build_credit('Ali', 'cc0'), 'Ali · CC0')
        self.assertEqual(ims.build_credit('Ali', 'pdm'), 'Ali · PDM')
        self.assertEqual(ims.build_credit('', 'by'), 'CC BY')
        self.assertEqual(ims.build_credit('<b>Ali</b>', 'by'), 'Ali · CC BY')
        self.assertLessEqual(len(ims.build_credit('x' * 400, 'by-sa')), 255)


class CleanerTests(SimpleTestCase):
    def test_creator(self):
        self.assertEqual(ims.clean_creator('Unknown authorUnknown author'), '')
        self.assertEqual(ims.clean_creator('Unknown author'), '')
        self.assertEqual(ims.clean_creator('Anonymous.'), '')
        self.assertEqual(ims.clean_creator('Ali Valiyev'), 'Ali Valiyev')
        self.assertEqual(ims.clean_creator('Aa Aa'), 'Aa Aa')              # yarmi bir xil bo'lsa ham bo'sh joy bilan ajralganini tegmaymiz
        self.assertEqual(ims.clean_creator('Ali Valiyev' * 2), 'Ali Valiyev')
        self.assertEqual(ims.clean_creator('toto'), 'toto')                  # qisqa so'zni buzmaymiz
        self.assertEqual(ims.clean_creator(None), '')

    def test_title(self):
        self.assertEqual(ims.clean_title('File:Kaj Leo Johannesen, lagman.jpg'), 'Kaj Leo Johannesen, lagman')
        self.assertEqual(ims.clean_title('Plov_in_Tashkent.JPG'), 'Plov in Tashkent')
        self.assertEqual(ims.clean_title('<b>Plov</b>'), 'Plov')
        self.assertEqual(len(ims.clean_title('x' * 400)), ims.TITLE_MAX)

    def test_credit_with_unknown_or_long_creator(self):
        self.assertEqual(ims.build_credit('Unknown authorUnknown author', 'cc0'), 'CC0')
        credit = ims.build_credit('Rocky Masum ' + 'This work was uploaded by someone ' * 5, 'by-sa')
        self.assertTrue(credit.endswith('… · CC BY-SA'))
        self.assertLessEqual(len(credit), ims.CREDIT_CREATOR_MAX + 20)

    def test_wikimedia_original_is_shrunk_when_wide(self):
        original = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Plov%20%281%29.jpg'
        self.assertEqual(ims._shrink_wikimedia_original(original, 4000),
                         'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Plov%20%281%29.jpg/1280px-Plov%20%281%29.jpg')
        self.assertEqual(ims._shrink_wikimedia_original(original, 1280), original)       # katta emas: o'zgarmaydi
        self.assertEqual(ims._shrink_wikimedia_original(original, None), original)       # o'lcham noma'lum: Commons kattalashtirmaydi
        self.assertEqual(ims._shrink_wikimedia_original('https://live.staticflickr.com/1/a.jpg', 4000), 'https://live.staticflickr.com/1/a.jpg')
        self.assertEqual(ims._shrink_wikimedia_original(original + '?utm_source=x', 4000).split('/')[-1], '1280px-Plov%20%281%29.jpg')


class OpenverseParsingTests(SimpleTestCase):
    def test_commons_originals_from_openverse(self):
        wide = ims._parse_openverse_item(ov_item(url='https://upload.wikimedia.org/wikipedia/commons/a/ab/Big.jpg', width=6000, height=4000,
                                                 filesize=30_000_000, title='File:Big.jpg'))
        self.assertTrue(wide['full'].endswith('/thumb/a/ab/Big.jpg/1280px-Big.jpg'))
        self.assertEqual(wide['title'], 'Big')
        # o'lcham noma'lum va fayl 6 MB dan katta: yuklab bo'lmaydi -> tushiriladi
        huge = ov_item(url='https://upload.wikimedia.org/wikipedia/commons/a/ab/Big.jpg', width=None, height=None, filesize=30_000_000)
        self.assertIsNone(ims._parse_openverse_item(huge))
        small = ov_item(url='https://upload.wikimedia.org/wikipedia/commons/a/ab/Small.jpg', width=900, height=700, filesize=200_000)
        self.assertTrue(ims._parse_openverse_item(small)['full'].endswith('/a/ab/Small.jpg'))

    def test_unknown_author_does_not_leak_into_creator(self):
        self.assertEqual(ims._parse_openverse_item(ov_item(creator='Unknown authorUnknown author'))['creator'], '')

    def test_valid_item_shape(self):
        result = ims._parse_openverse_item(ov_item(7, title='<i>Plov</i>, Tashkent', creator='<a href="x">Boonlong1</a>'))
        self.assertEqual(result, {
            'id': 'openverse:20c5a1b2-0000-4000-8000-000000000007',
            'thumb': 'https://api.openverse.org/v1/images/20c5a1b2-0000-4000-8000-000000000007/thumb/',
            'full': 'https://live.staticflickr.com/65535/7_abc_b.jpg',
            'title': 'Plov, Tashkent',
            'creator': 'Boonlong1',
            'license': 'by',
            'license_url': 'https://creativecommons.org/licenses/by/2.0/',
            'source': 'openverse',
            'source_url': 'https://www.flickr.com/photos/boonlong1/7',
        })

    def test_license_filter(self):
        for lic in ('cc0', 'pdm', 'by', 'by-sa'):
            self.assertIsNotNone(ims._parse_openverse_item(ov_item(license=lic)), lic)
        for lic in ('by-nc', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'sampling+', '', None, 'CC-BY-NC', 5):
            self.assertIsNone(ims._parse_openverse_item(ov_item(license=lic)), lic)
        self.assertIsNone(ims._parse_openverse_item({k: v for k, v in ov_item().items() if k != 'license'}))

    def test_untrusted_fields_are_rejected(self):
        for overrides in (
            {'url': 'http://live.staticflickr.com/a.jpg'},          # https emas
            {'url': 'https://evil.example.com/a.jpg'},              # yuklashga ruxsat etilmagan host
            {'url': 'https://127.0.0.1/a.jpg'},
            {'url': None}, {'url': ['https://live.staticflickr.com/a.jpg']},
            {'id': '../../etc'}, {'id': ''}, {'id': 123},
            {'filetype': 'gif'}, {'filetype': 'svg'},
            {'width': 300, 'height': 200}, {'width': 2000, 'height': 399},
        ):
            with self.subTest(overrides=overrides):
                self.assertIsNone(ims._parse_openverse_item(ov_item(**overrides)))
        self.assertIsNone(ims._parse_openverse_item('not a dict'))
        self.assertIsNone(ims._parse_openverse_item(None))

    def test_unknown_size_is_kept_and_fallbacks_are_safe(self):
        item = ov_item(width=None, height=None, thumbnail='http://insecure/x', license_url='javascript:alert(1)',
                       foreign_landing_url='javascript:alert(1)', creator=None, title=None)
        result = ims._parse_openverse_item(item)
        self.assertEqual(result['thumb'], result['full'])                 # http thumbnail o'rniga https `full`
        self.assertEqual(result['license_url'], 'https://creativecommons.org/licenses/by/2.0/')
        self.assertTrue(result['source_url'].startswith('https://openverse.org/image/'))
        self.assertEqual((result['creator'], result['title']), ('', ''))

    def test_foreign_license_url_is_replaced(self):
        result = ims._parse_openverse_item(ov_item(license_url='https://evil.example.com/licence', license_version='3.0'))
        self.assertEqual(result['license_url'], 'https://creativecommons.org/licenses/by/3.0/')


class CommonsParsingTests(SimpleTestCase):
    def test_valid_page_shape(self):
        result = ims._parse_commons_page(cm_page(3))
        self.assertEqual(result['id'], 'wikimedia:1003')
        self.assertEqual(result['title'], 'Plov in Tashkent 3')
        self.assertEqual(result['creator'], 'Ali Valiyev')                      # HTML tozalandi, &nbsp; bo'shliq
        self.assertEqual(result['license'], 'by-sa')
        self.assertEqual(result['license_url'], 'https://creativecommons.org/licenses/by-sa/4.0')
        self.assertEqual(result['source'], 'wikimedia')
        self.assertEqual(result['source_url'], 'https://commons.wikimedia.org/wiki/File:Plov_3.jpg')
        self.assertTrue(result['thumb'].endswith('/500px-Plov_3.jpg'))

    def test_large_original_uses_1280_wide_copy(self):
        result = ims._parse_commons_page(cm_page(4, width=4000, height=3000, info={'size': 25_000_000}))
        self.assertEqual(result['full'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Plov_4.jpg/1280px-Plov_4.jpg')

    def test_smaller_original_is_used_as_is(self):
        result = ims._parse_commons_page(cm_page(5, width=1000, height=800))
        self.assertEqual(result['full'], 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Plov_5.jpg')

    def test_oversized_original_without_thumb_is_dropped(self):
        page = cm_page(6, width=1000, height=800, info={'size': 30_000_000})
        self.assertIsNone(ims._parse_commons_page(page))

    def test_license_and_restrictions_filter(self):
        for name in ('CC BY-NC 4.0', 'CC BY-ND 2.0', 'GFDL', 'Fair use', ''):
            with self.subTest(name=name):
                self.assertIsNone(ims._parse_commons_page(cm_page(license_name=name)))
        for name in ('CC0', 'Public domain', 'CC BY 3.0', 'CC BY-SA 3.0'):
            with self.subTest(name=name):
                self.assertIsNotNone(ims._parse_commons_page(cm_page(license_name=name)))
        self.assertIsNone(ims._parse_commons_page(cm_page(meta={'NonFree': {'value': 'true'}})))
        self.assertIsNone(ims._parse_commons_page(cm_page(meta={'Restrictions': {'value': 'personality'}})))

    def test_bad_files_are_dropped(self):
        self.assertIsNone(ims._parse_commons_page(cm_page(mime='image/svg+xml')))
        self.assertIsNone(ims._parse_commons_page(cm_page(mime='image/gif')))
        self.assertIsNone(ims._parse_commons_page(cm_page(width=300, height=250)))
        self.assertIsNone(ims._parse_commons_page(cm_page(info={'url': 'http://upload.wikimedia.org/a.jpg', 'thumburl': None}, width=500, height=500)))
        self.assertIsNone(ims._parse_commons_page({'pageid': 1, 'title': 'File:x.jpg'}))
        self.assertIsNone(ims._parse_commons_page({'pageid': 1, 'title': 'File:x.jpg', 'imageinfo': []}))
        self.assertIsNone(ims._parse_commons_page('nope'))

    def test_foreign_description_url_is_replaced(self):
        result = ims._parse_commons_page(cm_page(info={'descriptionurl': 'https://evil.example.com/File:x'}))
        self.assertEqual(result['source_url'], 'https://commons.wikimedia.org/?curid=1001')


class MergeTests(SimpleTestCase):
    def test_interleaves_sources_and_limits_to_12(self):
        ov = [ims._parse_openverse_item(ov_item(n)) for n in range(1, 11)]
        cm = [ims._parse_commons_page(cm_page(n)) for n in range(1, 11)]
        merged = ims.merge_results(ov, cm)
        self.assertEqual(len(merged), 12)
        self.assertEqual([r['source'] for r in merged[:4]], ['openverse', 'wikimedia', 'openverse', 'wikimedia'])

    def test_duplicates_are_removed(self):
        # Openverse ham Commons faylini beradi (asl URL), Commons API esa o'sha fayl uchun 1280 px nusxa: bitta fayl
        ov_dup = ov_item(1, url='https://upload.wikimedia.org/wikipedia/commons/a/ab/Plov_1.jpg', source='wikimedia',
                         foreign_landing_url='https://commons.wikimedia.org/w/index.php?curid=1001')
        ov_other = ov_item(2)
        cm_same_file = cm_page(1, width=4000, height=3000)
        merged = ims.merge_results(
            [ims._parse_openverse_item(ov_dup), ims._parse_openverse_item(ov_other), ims._parse_openverse_item(ov_other)],
            [ims._parse_commons_page(cm_same_file)],
        )
        self.assertEqual([r['id'] for r in merged], ['openverse:20c5a1b2-0000-4000-8000-000000000001',
                                                     'openverse:20c5a1b2-0000-4000-8000-000000000002'])

    def test_empty(self):
        self.assertEqual(ims.merge_results([], []), [])
        self.assertEqual(ims.merge_results(), [])


class HttpHelperTests(NoNetworkMixin, SimpleTestCase):
    def test_openverse_request_shape(self):
        with mock.patch('requests.get', return_value=FakeResponse(openverse_payload(ov_item(1)))) as get:
            results = ims._search_openverse('plov pilaf')
        self.assertEqual(len(results), 1)
        args, kwargs = get.call_args
        self.assertEqual(args[0], 'https://api.openverse.org/v1/images/')
        self.assertEqual(kwargs['params']['q'], 'plov pilaf')
        self.assertEqual(kwargs['params']['license'], 'cc0,pdm,by,by-sa')
        self.assertEqual(kwargs['params']['mature'], 'false')
        self.assertEqual(kwargs['headers']['User-Agent'], 'GulistonMenu/1.0 (contact: admin)')
        self.assertEqual(kwargs['timeout'][1], 8)

    def test_commons_request_shape(self):
        with mock.patch('requests.get', return_value=FakeResponse(commons_payload(cm_page(1)))) as get:
            results = ims._search_wikimedia('lagman')
        self.assertEqual(len(results), 1)
        args, kwargs = get.call_args
        self.assertEqual(args[0], 'https://commons.wikimedia.org/w/api.php')
        params = kwargs['params']
        self.assertEqual((params['action'], params['generator'], params['gsrnamespace'], params['prop']),
                         ('query', 'search', '6', 'imageinfo'))
        self.assertIn('lagman', params['gsrsearch'])
        self.assertIn('filetype:bitmap', params['gsrsearch'])
        self.assertIn('extmetadata', params['iiprop'])
        self.assertEqual(kwargs['headers']['User-Agent'], 'GulistonMenu/1.0 (contact: admin)')

    def test_commons_exclusions_for_ambiguous_dishes(self):
        """Haqiqiy sinov: «lagman noodles» Commons'da Afg'onistonning Laghman viloyati xaritalarini ham qaytargan edi."""
        with mock.patch('requests.get', return_value=FakeResponse(commons_payload(cm_page(1)))) as get:
            ims._search_wikimedia('lagman noodles')
        query = get.call_args.kwargs['params']['gsrsearch']
        self.assertTrue(query.startswith('lagman noodles -province'))
        self.assertTrue(query.endswith('filetype:bitmap'))
        with mock.patch('requests.get', return_value=FakeResponse(commons_payload(cm_page(1)))) as get:
            ims._search_wikimedia('manti dumplings')
        self.assertEqual(get.call_args.kwargs['params']['gsrsearch'], 'manti dumplings filetype:bitmap')

    def test_commons_no_hits_is_empty_not_error(self):
        with mock.patch('requests.get', return_value=FakeResponse({'batchcomplete': True})):
            self.assertEqual(ims._search_wikimedia('zzzz'), [])

    def test_commons_pages_dict_and_order(self):
        payload = {'query': {'pages': {'1002': cm_page(2, index=2), '1001': cm_page(1, index=1)}}}
        # eski (formatversion=1) shakl: dict; tartib `index` bo'yicha
        with mock.patch('requests.get', return_value=FakeResponse(payload)):
            results = ims._search_wikimedia('x')
        self.assertEqual([r['id'] for r in results], ['wikimedia:1001', 'wikimedia:1002'])

    def test_source_errors(self):
        import requests
        cases = [
            FakeResponse({}, status_code=500), FakeResponse({}, status_code=429), FakeResponse({}, status_code=403),
            FakeResponse(body=b'<html>not json</html>'), FakeResponse(body=b'[1,2,3]'), FakeResponse(body=b'\xff\xfe'),
            FakeResponse(body=b'x' * (ims.MAX_JSON_BYTES + 10)),
        ]
        for response in cases:
            with self.subTest(status=response.status_code, size=len(response._body)):
                with mock.patch('requests.get', return_value=response), self.assertRaises(ims._SourceError):
                    ims._search_openverse('x')
                self.assertTrue(response.closed)
        for exc in (requests.ConnectionError('boom'), requests.Timeout('slow')):
            with mock.patch('requests.get', side_effect=exc), self.assertRaises(ims._SourceError):
                ims._search_wikimedia('x')

    def test_unexpected_shapes(self):
        with mock.patch('requests.get', return_value=FakeResponse({'results': 'oops'})), self.assertRaises(ims._SourceError):
            ims._search_openverse('x')
        # bitta buzuq element qolganlarini tushirmaydi
        payload = openverse_payload(None, 'x', {'license': ['by']}, ov_item(1))
        with mock.patch('requests.get', return_value=FakeResponse(payload)):
            self.assertEqual(len(ims._search_openverse('x')), 1)


class SearchFlowTests(NoNetworkMixin, SimpleTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)

    def sources(self, ov=None, cm=None, ov_error=None, cm_error=None):
        ov_mock = mock.Mock(side_effect=ov_error) if ov_error else mock.Mock(return_value=ov if ov is not None else [])
        cm_mock = mock.Mock(side_effect=cm_error) if cm_error else mock.Mock(return_value=cm if cm is not None else [])
        patches = (mock.patch.object(ims, '_search_openverse', ov_mock), mock.patch.object(ims, '_search_wikimedia', cm_mock))
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        return ov_mock, cm_mock

    def results(self, count_ov=2, count_cm=2):
        return ([ims._parse_openverse_item(ov_item(n)) for n in range(1, count_ov + 1)],
                [ims._parse_commons_page(cm_page(n)) for n in range(1, count_cm + 1)])

    def test_merges_and_reports_query_used(self):
        ov, cm = self.results()
        ov_mock, cm_mock = self.sources(ov, cm)
        outcome = ims.search_images('Palov', 1)
        self.assertEqual(outcome['query_used'], 'plov pilaf')
        self.assertEqual(len(outcome['results']), 4)
        ov_mock.assert_called_once_with('plov pilaf')
        cm_mock.assert_called_once_with('plov pilaf')
        for key in ('id', 'thumb', 'full', 'title', 'creator', 'license', 'license_url', 'source', 'source_url'):
            self.assertIn(key, outcome['results'][0])
        self.assertTrue(all(r['thumb'].startswith('https://') for r in outcome['results']))

    def test_one_source_down_other_answers(self):
        ov, _ = self.results()
        self.sources(ov=ov, cm_error=ims._SourceError('HTTP 500'))
        outcome = ims.search_images('Manti', 1)
        self.assertEqual(len(outcome['results']), 2)

    def test_unexpected_exception_in_one_source_is_contained(self):
        _, cm = self.results()
        self.sources(cm=cm, ov_error=RuntimeError('bug'))
        self.assertEqual(len(ims.search_images('Manti', 1)['results']), 2)

    def test_hanging_source_does_not_delay_the_other(self):
        """Haqiqiy sinov: Openverse ba'zan 10 s osilib qoladi; Commons natijasi shuncha kutmasligi kerak."""
        import threading
        import time
        release = threading.Event()
        self.addCleanup(release.set)
        _, cm = self.results()

        def hang(term):
            release.wait(5)
            return []

        self.sources(cm=cm)
        with mock.patch.object(ims, '_search_openverse', side_effect=hang), mock.patch.object(ims, 'SOURCE_TIMEOUT', 0.3):
            started = time.monotonic()
            outcome = ims.search_images('Manti', 1)
            elapsed = time.monotonic() - started
        self.assertLess(elapsed, 2.0)
        self.assertEqual(len(outcome['results']), 2)
        # osilgan manba "to'liqsiz" natija: qisqa keshlanadi
        self.assertIsNotNone(cache.get(ims._search_key('manti dumplings')))

    def test_both_sources_down_is_unavailable(self):
        self.sources(ov_error=ims._SourceError('x'), cm_error=ims._SourceError('y'))
        with self.assertRaises(ims.ImageSearchUnavailable) as ctx:
            ims.search_images('Manti', 1)
        self.assertEqual(ctx.exception.status, 503)
        self.assertEqual(ctx.exception.code, 'search_unavailable')
        # muvaffaqiyatsiz natija keshlanmaydi: manbalar tiklansa keyingi so'rov ishlaydi
        ov, cm = self.results()
        self.sources(ov, cm)
        self.assertEqual(len(ims.search_images('Manti', 1)['results']), 4)

    def test_results_are_cached_for_an_hour_and_shared_between_shops(self):
        ov, cm = self.results()
        ov_mock, cm_mock = self.sources(ov, cm)
        with mock.patch.object(ims.cache, 'set', wraps=ims.cache.set) as cache_set:
            first = ims.search_images('Palov', 1)
        self.assertEqual(cache_set.call_args_list[0].args[2], ims.SEARCH_CACHE_TTL)
        second = ims.search_images('PALOV', 2)         # boshqa restoran, boshqa yozilish — bir xil `query_used`
        self.assertEqual(first, second)
        self.assertEqual(ov_mock.call_count, 1)
        self.assertEqual(cm_mock.call_count, 1)

    def test_partial_results_are_cached_only_briefly(self):
        ov, _ = self.results()
        self.sources(ov=ov, cm_error=ims._SourceError('down'))
        with mock.patch.object(ims.cache, 'set', wraps=ims.cache.set) as cache_set:
            ims.search_images('Palov', 1)
        self.assertEqual(cache_set.call_args_list[0].args[2], ims.PARTIAL_CACHE_TTL)

    def test_falls_back_to_shorter_query_when_nothing_found(self):
        ov, cm = self.results()
        ov_mock = mock.Mock(side_effect=lambda term: ov if term == 'plov' else [])
        cm_mock = mock.Mock(side_effect=lambda term: cm if term == 'plov' else [])
        for name, m in (('_search_openverse', ov_mock), ('_search_wikimedia', cm_mock)):
            patcher = mock.patch.object(ims, name, m)
            patcher.start()
            self.addCleanup(patcher.stop)
        outcome = ims.search_images('Palov', 1)
        self.assertEqual(outcome['query_used'], 'plov')
        self.assertEqual(len(outcome['results']), 4)
        self.assertEqual([c.args[0] for c in ov_mock.call_args_list], ['plov pilaf', 'plov'])

    def test_nothing_found_returns_empty_list_not_error(self):
        self.sources([], [])
        outcome = ims.search_images('Qaymoqli pishloq', 1)
        self.assertEqual(outcome, {'query_used': 'Qaymoqli pishloq', 'results': []})

    def test_unknown_dish_uses_name_plus_food_dish(self):
        ov_mock, _ = self.sources([], [])
        ims.search_images("Bo'lka non", 1)          # "non" lug'atda bor
        ov_mock.assert_any_call('uzbek bread')
        ov_mock.reset_mock()
        ims.search_images('Qaymoqli pishloq', 1)
        self.assertEqual(ov_mock.call_args_list[0].args[0], 'Qaymoqli pishloq food dish')

    def test_pick_registry_holds_server_side_record(self):
        ov, cm = self.results()
        self.sources(ov, cm)
        outcome = ims.search_images('Palov', 1)
        first = outcome['results'][0]
        self.assertEqual(ims.get_pick_record(first['id']), first)
        self.assertIsNone(ims.get_pick_record('openverse:nonexistent'))
        self.assertIsNone(ims.get_pick_record(None))
        self.assertIsNone(ims.get_pick_record('x' * 500))

    def test_results_returned_are_copies(self):
        ov, cm = self.results()
        self.sources(ov, cm)
        first = ims.search_images('Palov', 1)
        first['results'][0]['license'] = 'cc0'
        again = ims.search_images('Palov', 1)
        self.assertEqual(again['results'][0]['license'], 'by')
        self.assertEqual(ims.get_pick_record(again['results'][0]['id'])['license'], 'by')

    def test_bad_query(self):
        with self.assertRaises(ims.ImageQueryError):
            ims.search_images(' ', 1)


class RateLimitTests(NoNetworkMixin, SimpleTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)

    def test_check_rate_limit(self):
        for _ in range(3):
            ims.check_rate_limit('search', 1, 3)
        with self.assertRaises(ims.ImageSearchRateLimited) as ctx:
            ims.check_rate_limit('search', 1, 3)
        self.assertEqual(ctx.exception.status, 429)
        self.assertEqual(ctx.exception.code, 'rate_limited')
        self.assertTrue(1 <= ctx.exception.retry_after <= 3600)
        ims.check_rate_limit('search', 2, 3)              # boshqa restoran — alohida hisoblagich
        ims.check_rate_limit('pick', 1, 3)                # boshqa amal — alohida hisoblagich

    def test_only_external_lookups_count_not_cache_hits(self):
        with mock.patch.object(ims, 'SEARCH_RATE_LIMIT', 2), \
                mock.patch.object(ims, '_search_openverse', return_value=[ims._parse_openverse_item(ov_item(1))]), \
                mock.patch.object(ims, '_search_wikimedia', return_value=[]):
            for _ in range(10):
                ims.search_images('Palov', 1)             # bitta tashqi qidiruv, 9 ta kesh
            ims.search_images('Manti', 1)                 # ikkinchi tashqi qidiruv
            with self.assertRaises(ims.ImageSearchRateLimited):
                ims.search_images('Somsa', 1)             # uchinchisi chegaradan oshdi
            ims.search_images('Palov', 1)                 # kesh esa hamon ishlaydi
            ims.search_images('Somsa', 2)                 # boshqa restoran ta'sirlanmaydi

    def test_default_is_sixty_per_hour(self):
        self.assertEqual(ims.SEARCH_RATE_LIMIT, 60)
        with mock.patch.object(ims, '_search_openverse', return_value=[]), mock.patch.object(ims, '_search_wikimedia', return_value=[]):
            for n in range(60):
                ims.search_images(f'Taom {n}', 7)
            with self.assertRaises(ims.ImageSearchRateLimited):
                ims.search_images('Taom 61', 7)
