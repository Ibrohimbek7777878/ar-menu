"""Lokal OCR zaxirasi: narx/qator parseri, Tesseract tillari (keshlanadi), binar yo'q holati va (mavjud bo'lsa) haqiqiy ishga tushirish."""
import io
import shutil
import subprocess
import unittest
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase
from PIL import Image, ImageDraw, ImageFont

from products.menu_import import ocr


def render_menu_png(lines, size=(1000, 760), font_size=44):
    image = Image.new('RGB', size, 'white')
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=font_size)
    y = 40
    for line in lines:
        draw.text((60, y), line, fill='black', font=font)
        y += 85
    buffer = io.BytesIO()
    image.save(buffer, 'PNG')
    return buffer.getvalue()


class ParsePriceTests(SimpleTestCase):
    def test_accepted_formats(self):
        table = {
            '45000': 45000, '45 000': 45000, '45 000': 45000, '45.000': 45000, '45,000': 45000,
            '45k': 45000, '45K': 45000, '45 ming': 45000, '45 тыс': 45000, '1.5k': 1500, '1 250 000': 1250000,
            "45 000 so'm": 45000, '45000 sum': 45000, '45000 сум': 45000, '45000 UZS': 45000, "45 000 soʻm": 45000,
            ' 12000 ': 12000, '999': 999,
        }
        for raw, expected in table.items():
            self.assertEqual(ocr.parse_price(raw), expected, raw)
        for raw in (45000, 45000.0, 500):   # JSON'dan kelgan son turlari
            self.assertEqual(ocr.parse_price(raw), int(raw))

    def test_garbage_is_none(self):
        for raw in (None, '', 'narx yo\'q', 'abc', 'null', True, False, 0, -5, '-5000', '0', [], {}, float('nan'), float('inf'),
                    10 ** 12, '9' * 70, '45 000 dollar', '12abc'):
            self.assertIsNone(ocr.parse_price(raw), raw)

    def test_small_numbers_are_kept_not_multiplied(self):
        self.assertEqual(ocr.parse_price('45'), 45)   # "×1000?" taklifi B1a/UI da


class CleanRowTests(SimpleTestCase):
    def test_sanitises_everything(self):
        row = ocr.clean_row({'name': '  =cmd|calc  <b>Palov</b>\x00‮ ', 'price': "45 000 so'm",
                             'category': ' SALATLAR ', 'description': '<script>alert(1)</script>Guruch\n va go\'sht'})
        self.assertEqual(row['name'], 'Cmd|calc Palov')
        self.assertEqual(row['price'], 45000)
        self.assertEqual(row['category'], 'Salatlar')
        self.assertNotIn('<', row['description'])
        self.assertEqual(row['description'], "alert(1) Guruch va go'sht")

    def test_formula_and_marker_prefixes_are_stripped(self):
        for raw in ('=SUM(A1)', '+998901234567x', '@cmd', '-Palov', '• Palov', '1. Palov', '1) Palov'):
            name = ocr.clean_row({'name': raw})['name']
            self.assertFalse(name[:1] in '=+-@•', (raw, name))
        self.assertEqual(ocr.clean_row({'name': '1. Palov'})['name'], 'Palov')

    def test_invalid_rows_are_dropped(self):
        for raw in (None, 'Palov', 5, [], {}, {'name': ''}, {'name': 'a'}, {'name': 12345}, {'name': '45 000'}, {'name': '---'},
                    {'name': None, 'price': 1000}):
            self.assertIsNone(ocr.clean_row(raw), raw)

    def test_lengths_are_capped(self):
        row = ocr.clean_row({'name': 'a' * 900, 'category': 'b' * 900, 'description': 'c' * 9000})
        self.assertEqual((len(row['name']), len(row['category']), len(row['description'])), (200, 120, 1000))

    def test_missing_optional_fields(self):
        self.assertEqual(ocr.clean_row({'name': 'Choy'}), {'name': 'Choy', 'price': None, 'category': '', 'description': ''})

    def test_first_letter_is_capitalised(self):
        self.assertEqual(ocr.clean_row({'name': 'tovuq shashlik'})['name'], 'Tovuq shashlik')
        self.assertEqual(ocr.clean_row({'name': 'Lag\'mon'})['name'], "Lag'mon")


class RowsFromTextTests(SimpleTestCase):
    TEXT = """
    MILLIY TAOMLAR
    Palov ........ 45 000 so'm
    Lag'mon - 38000
    Manti (5 dona) 32.000 sum
    Qozon kabob 85k
    Guruch, go'sht va sabzi bilan tayyorlangan
    Salatlar:
    Achchiq-chuchuk 18 ming
    Choy 5 000
    12 000
    Tel: +998 90 123 45 67
    """

    def test_menu_text(self):
        rows = ocr.rows_from_text(self.TEXT)
        got = [(r['name'], r['price'], r['category']) for r in rows]
        self.assertEqual(got[:6], [
            ('Palov', 45000, 'Milliy taomlar'),
            ("Lag'mon", 38000, 'Milliy taomlar'),
            ('Manti (5 dona)', 32000, 'Milliy taomlar'),
            ('Qozon kabob', 85000, 'Milliy taomlar'),
            ('Achchiq-chuchuk', 18000, 'Salatlar'),
            ('Choy', 5000, 'Salatlar'),
        ])
        self.assertEqual(rows[3]['description'], "Guruch, go'sht va sabzi bilan tayyorlangan")

    def test_price_only_and_empty_lines_do_not_create_rows(self):
        self.assertEqual(ocr.rows_from_text('12 000\n\n   \n45000'), [])
        self.assertEqual(ocr.rows_from_text(''), [])
        self.assertEqual(ocr.rows_from_text(None), [])

    def test_text_without_prices_gives_no_rows(self):
        self.assertEqual(ocr.rows_from_text('Salom\nBu oddiy matn\nHech qanday narx yo\'q'), [])

    def test_row_limit(self):
        text = '\n'.join(f'Taom{chr(65 + i % 26)}{chr(65 + i // 26 % 26)} {1000 + i}' for i in range(400))
        self.assertEqual(len(ocr.rows_from_text(text)), 300)

    def test_hostile_lines_are_sanitised(self):
        rows = ocr.rows_from_text('=HYPERLINK("http://x") 15000\n<img src=x onerror=1>Osh 20000')
        self.assertTrue(all(not r['name'].startswith('=') and '<' not in r['name'] for r in rows))
        self.assertEqual([r['price'] for r in rows], [15000, 20000])


class FixOcrDigitsTests(SimpleTestCase):
    def test_zero_groups_misread_as_letter_o(self):
        table = {
            'Green tea 8 OOO som': 'Green tea 8 000 som', 'Plov 45OOO': 'Plov 45000', 'Osh 120 OOO': 'Osh 120 000',
            'Osh 1 OOO OOO': 'Osh 1 000 000', 'Choy 5ooo': 'Choy 5000', 'Choy 5 000': 'Choy 5 000', 'Palov 45 000 so\'m': 'Palov 45 000 so\'m',
        }
        for raw, expected in table.items():
            self.assertEqual(ocr.fix_ocr_digits(raw), expected, raw)

    def test_ordinary_words_are_untouched(self):
        for raw in ('Room 5 OOO0x', 'Oo 12', 'BOOOM 45', 'Cola 2 OO', 'Pizza OOO', '5 OOOK', 'Boom1OOO'):
            self.assertEqual(ocr.fix_ocr_digits(raw), raw, raw)


class LanguageTests(SimpleTestCase):
    def setUp(self):
        ocr.reset_cache()
        self.addCleanup(ocr.reset_cache)

    def langs_output(self, *langs):
        text = 'List of available languages in "/usr/share/tessdata/" (%d):\n' % len(langs) + '\n'.join(langs) + '\n'
        return SimpleNamespace(returncode=0, stdout=text.encode(), stderr=b'')

    def test_picks_the_installed_part_of_uzb_rus_eng(self):
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('eng', 'osd')) as run:
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), 'eng')
            self.assertEqual(run.call_args.args[0], ['/usr/bin/tesseract', '--list-langs'])
        ocr.reset_cache()
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('eng', 'osd', 'rus', 'uzb', 'fra')):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), 'uzb+rus+eng')
        ocr.reset_cache()
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('osd', 'rus')):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), 'rus')
        ocr.reset_cache()
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('osd', 'fra')):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), 'fra')   # hech biri yo'q: mavjud boshqa til
        ocr.reset_cache()
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('osd')):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), '')

    def test_languages_are_cached_per_process(self):
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('eng')) as run:
            ocr.ocr_languages('/usr/bin/tesseract')
            ocr.ocr_languages('/usr/bin/tesseract')
            ocr.ocr_languages('/usr/bin/tesseract')
        self.assertEqual(run.call_count, 1)

    def test_failed_listing_is_not_cached(self):
        with mock.patch.object(ocr, '_run', side_effect=subprocess.TimeoutExpired('tesseract', 10)):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), '')
        with mock.patch.object(ocr, '_run', return_value=self.langs_output('eng')):
            self.assertEqual(ocr.ocr_languages('/usr/bin/tesseract'), 'eng')

    def test_no_binary(self):
        with mock.patch.object(ocr.shutil, 'which', return_value=None):
            self.assertEqual(ocr.ocr_languages(), '')
            with self.assertRaises(ocr.OcrUnavailable):
                ocr.ocr_text(render_menu_png(['Plov 45000']))

    def test_no_language_packs(self):
        with mock.patch.object(ocr.shutil, 'which', return_value='/usr/bin/tesseract'), \
                mock.patch.object(ocr, '_run', return_value=self.langs_output('osd')):
            with self.assertRaises(ocr.OcrUnavailable):
                ocr.ocr_text(render_menu_png(['Plov 45000']))


class RunSafetyTests(SimpleTestCase):
    def setUp(self):
        ocr.reset_cache()
        self.addCleanup(ocr.reset_cache)

    def test_subprocess_is_called_without_shell_with_list_args_timeout_and_scrubbed_env(self):
        listing = SimpleNamespace(returncode=0, stdout=b'List:\neng\n', stderr=b'')
        done = SimpleNamespace(returncode=0, stdout='Osh 45000\n'.encode(), stderr=b'')
        with mock.patch.object(ocr.shutil, 'which', return_value='/usr/bin/tesseract'), \
                mock.patch.object(ocr.subprocess, 'run', side_effect=[listing, done]) as run, \
                mock.patch.dict(ocr.os.environ, {'AI_API_KEY': 'must-not-leak', 'SECRET_KEY': 'nor-this'}):
            text = ocr.ocr_text(render_menu_png(['Osh 45000']))
        self.assertEqual(text.strip(), 'Osh 45000')
        for call in run.call_args_list:
            self.assertIsInstance(call.args[0], list)
            self.assertIs(call.kwargs['shell'], False)
            self.assertLessEqual(call.kwargs['timeout'], 30)
            self.assertNotIn('AI_API_KEY', call.kwargs['env'])
            self.assertNotIn('SECRET_KEY', call.kwargs['env'])
        ocr_args = run.call_args_list[1].args[0]
        self.assertEqual(ocr_args[0], '/usr/bin/tesseract')
        self.assertIn('eng', ocr_args)

    def test_timeout_and_failure_become_ocr_error(self):
        listing = SimpleNamespace(returncode=0, stdout=b'List:\neng\n', stderr=b'')
        for outcome in (subprocess.TimeoutExpired('tesseract', 30), SimpleNamespace(returncode=1, stdout=b'', stderr=b'boom'), OSError('x')):
            ocr.reset_cache()
            effects = [listing, outcome if not isinstance(outcome, SimpleNamespace) else outcome]
            with mock.patch.object(ocr.shutil, 'which', return_value='/usr/bin/tesseract'), \
                    mock.patch.object(ocr.subprocess, 'run', side_effect=effects):
                with self.assertRaises(ocr.OcrError):
                    ocr.ocr_text(render_menu_png(['Osh 45000']))

    def test_not_an_image_is_ocr_error(self):
        with mock.patch.object(ocr.shutil, 'which', return_value='/usr/bin/tesseract'), \
                mock.patch.object(ocr, 'ocr_languages', return_value='eng'):
            with self.assertRaises(ocr.OcrError):
                ocr.ocr_text(b'bu rasm emas')


@unittest.skipUnless(shutil.which('tesseract'), 'tesseract o\'rnatilmagan')
class RealTesseractTests(SimpleTestCase):
    def setUp(self):
        ocr.reset_cache()

    def test_reads_a_drawn_english_menu(self):
        png = render_menu_png(['MAIN DISHES', 'Plov 45 000 som', 'Lagman 38000', 'Beef steak 120 000',
                               'DRINKS', 'Green tea 8 000 som', 'Cola 12000'])
        text = ocr.ocr_text(png)
        rows = ocr.rows_from_text(text)
        prices = {row['name'].lower(): row['price'] for row in rows}
        self.assertEqual(prices.get('plov'), 45000, text)
        self.assertEqual(prices.get('lagman'), 38000, text)
        self.assertEqual(prices.get('beef steak'), 120000, text)
        self.assertEqual(prices.get('cola'), 12000, text)
        self.assertEqual({row['category'] for row in rows}, {'Main dishes', 'Drinks'})

    def test_blank_image_gives_no_rows(self):
        buffer = io.BytesIO()
        Image.new('RGB', (600, 400), 'white').save(buffer, 'PNG')
        self.assertEqual(ocr.rows_from_text(ocr.ocr_text(buffer.getvalue())), [])
