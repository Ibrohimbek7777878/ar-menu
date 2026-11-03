"""Rasm/PDF/matn o'qish: AI (HTTP mock) -> OCR zaxirasi -> bo'sh natija. Tarmoqqa HECH QACHON chiqmaydi.

Qat'iy shartlar: `menu_import_ai=off` yoki kalit yo'q yoki restoran yo'q bo'lsa HTTP chaqiruvi umuman bo'lmaydi; kalit hech qayerga chiqmaydi."""
import io
import json
import os
import shutil
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

import requests
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image

from products.menu_import import ocr, vision
from products.menu_import.test_ocr import render_menu_png

KEY = 'gsk_TEST_SECRET_KEY_do_not_leak_0123456789'
SHOP_ON = SimpleNamespace(pk=1, id=1, business_profile={'menu_import_ai': 'on'})
SHOP_DEFAULT = SimpleNamespace(pk=2, id=2, business_profile={})
SHOP_OFF = SimpleNamespace(pk=3, id=3, business_profile={'menu_import_ai': 'off'})

MENU_JSON = {'kind': 'menu', 'rows': [
    {'category': 'Milliy taomlar', 'name': 'Palov', 'price': 45000, 'description': None},
    {'category': 'Milliy taomlar', 'name': "Lag'mon", 'price': "38 000 so'm", 'description': 'Qo\'l cho\'zma'},
    {'category': 'Ichimliklar', 'name': 'Choy', 'price': None, 'description': None},
]}


class FakeResponse:
    def __init__(self, status=200, payload=None, text=''):
        self.status_code = status
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError('JSON emas')
        return self._payload


def chat_reply(content, status=200, usage=None):
    return FakeResponse(status, {'choices': [{'message': {'content': content}}], 'usage': usage or {'prompt_tokens': 11, 'completion_tokens': 7}})


def png_bytes(size=(400, 300)):
    buffer = io.BytesIO()
    Image.new('RGB', size, 'white').save(buffer, 'PNG')
    return buffer.getvalue()


class VisionBase(SimpleTestCase):
    """Har testda tarmoq taqiqlangan: `requests.post` ni test o'zi belgilaydi, aks holda AssertionError."""

    def setUp(self):
        override = override_settings(AI_API_KEY=KEY, AI_PROVIDER='groq', AI_VISION_MODEL='qwen/test-model')
        override.enable()
        self.addCleanup(override.disable)
        self.post = mock.patch.object(vision.requests, 'post', side_effect=AssertionError('tarmoqqa chiqish taqiqlangan')).start()
        self.addCleanup(mock.patch.stopall)
        ocr.reset_cache()

    def reply(self, *replies):
        self.post.side_effect = list(replies)

    def mock_ocr(self, text=None, error=None):
        patcher = mock.patch.object(vision.ocr, 'ocr_text', side_effect=error, return_value=text)
        return patcher.start()


class ExtractJsonTests(SimpleTestCase):
    def test_clean_json(self):
        self.assertEqual(vision.extract_json(json.dumps(MENU_JSON))['kind'], 'menu')

    def test_fenced_and_surrounded(self):
        body = json.dumps(MENU_JSON)
        for content in (f'```json\n{body}\n```', f'```\n{body}\n```', f'Mana natija:\n```json\n{body}\n```\nOmad!', f'Javob: {body} shu.',
                        f'  \n{body}\n  '):
            self.assertEqual(len(vision.extract_json(content)['rows']), 3, content[:30])

    def test_think_blocks_are_ignored(self):
        body = json.dumps(MENU_JSON)
        data = vision.extract_json(f'<think>\nMenga {{"kind": "dish_photo", "rows": []}} deb o\'yladim\n</think>\n{body}')
        self.assertEqual(data['kind'], 'menu')
        self.assertIsNone(vision.extract_json('<think>\nbu yerda javob yo\'q, {"kind": "menu", "rows": []}'))   # yopilmagan blok

    def test_list_and_garbage(self):
        self.assertEqual(vision.extract_json('[{"name": "Osh", "price": 1}]'), [{'name': 'Osh', 'price': 1}])
        for content in (None, 5, '', 'kechirasiz, o\'qiy olmadim', '[1, 2, 3]', '{"foo": 1}', '{"kind": "menu", "rows": [', '```json\nnot json\n```',
                        '[]', '{{{{', 'null', '"menu"', b'{"kind": "menu"}'):
            self.assertIsNone(vision.extract_json(content), content)

    def test_nested_braces_in_strings(self):
        data = vision.extract_json('x {"kind": "menu", "rows": [{"name": "A}B{C", "price": 1000}]} y')
        self.assertEqual(data['rows'][0]['name'], 'A}B{C')


class AiHappyPathTests(VisionBase):
    def test_clean_json_result(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual((result.kind, result.engine, result.notes), ('menu', 'ai', []))
        self.assertEqual(result.rows, [
            {'name': 'Palov', 'price': 45000, 'category': 'Milliy taomlar', 'description': ''},
            {'name': "Lag'mon", 'price': 38000, 'category': 'Milliy taomlar', 'description': "Qo'l cho'zma"},
            {'name': 'Choy', 'price': None, 'category': 'Ichimliklar', 'description': ''},
        ])

    def test_default_setting_means_on(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_DEFAULT).engine, 'ai')

    def test_fenced_json(self):
        self.reply(chat_reply('```json\n' + json.dumps(MENU_JSON) + '\n```'))
        self.assertEqual(len(vision.read_image(png_bytes(), shop=SHOP_ON).rows), 3)

    def test_think_block_then_json(self):
        self.reply(chat_reply('<think>fikr yuritaman...</think>\n' + json.dumps(MENU_JSON)))
        self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_ON).kind, 'menu')

    def test_request_shape(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        vision.read_image(png_bytes((3000, 2000)), shop=SHOP_ON)
        (url,), kwargs = self.post.call_args
        self.assertEqual(url, 'https://api.groq.com/openai/v1/chat/completions')
        self.assertEqual(kwargs['headers']['Authorization'], f'Bearer {KEY}')
        self.assertFalse(kwargs['allow_redirects'])
        self.assertEqual(kwargs['timeout'], (5, 25))
        payload = kwargs['json']
        self.assertEqual((payload['model'], payload['temperature']), ('qwen/test-model', 0))
        self.assertNotIn(KEY, json.dumps(payload))
        image_part = payload['messages'][1]['content'][1]
        self.assertTrue(image_part['image_url']['url'].startswith('data:image/jpeg;base64,'))
        import base64
        sent = base64.b64decode(image_part['image_url']['url'].split(',', 1)[1])
        with Image.open(io.BytesIO(sent)) as picture:
            self.assertEqual((picture.format, max(picture.size)), ('JPEG', 1600))   # AI'ga ketadigan rasm kichraytirilgan

    @override_settings(AI_PROVIDER='openai', AI_API_KEY='sk-test-openai-key', AI_VISION_MODEL='qwen/qwen3.8-27b')
    def test_openai_provider_uses_openai_url_and_a_vision_capable_model(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual(self.post.call_args.args[0], 'https://api.openai.com/v1/chat/completions')
        self.assertEqual(self.post.call_args.kwargs['json']['model'], 'gpt-4o-mini')

    @override_settings(AI_PROVIDER='openai', AI_API_KEY='gsk_looks_like_groq', AI_VISION_MODEL='')
    def test_gsk_key_selects_groq_like_ai_service(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertIn('groq.com', self.post.call_args.args[0])
        self.assertEqual(self.post.call_args.kwargs['json']['model'], 'qwen/qwen3.8-27b')

    def test_dish_photo_gives_one_row_without_price(self):
        self.reply(chat_reply(json.dumps({'kind': 'dish_photo', 'rows': [
            {'category': 'Milliy taomlar', 'name': 'Palov', 'price': 45000, 'description': 'Guruch va go\'sht.'},
            {'category': None, 'name': 'Ortiqcha', 'price': 1, 'description': None}]})))
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual((result.kind, result.engine), ('dish_photo', 'ai'))
        self.assertEqual(result.rows, [{'name': 'Palov', 'price': None, 'category': 'Milliy taomlar', 'description': "Guruch va go'sht."}])

    def test_unknown_kind_has_no_rows_and_does_not_fall_back_to_ocr(self):
        ocr_mock = self.mock_ocr('Palov 45000')
        self.reply(chat_reply('{"kind": "unknown", "rows": [{"name": "Hayal", "price": 1000}]}'))
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'ai'))
        self.assertTrue(result.notes)
        ocr_mock.assert_not_called()

    def test_missing_or_odd_kind_is_inferred(self):
        self.reply(chat_reply('{"rows": [{"name": "Osh", "price": 20000}]}'))
        self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_ON).kind, 'menu')
        self.reply(chat_reply('{"kind": "ajoyib", "rows": []}'))
        self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_ON).kind, 'unknown')
        self.reply(chat_reply('[{"name": "Osh", "price": 20000}]'))
        self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_ON).rows[0]['price'], 20000)

    def test_dish_photo_without_a_usable_row_becomes_unknown(self):
        self.reply(chat_reply('{"kind": "dish_photo", "rows": [{"name": ""}]}'))
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual((result.kind, result.rows), ('unknown', []))


class AiRowValidationTests(VisionBase):
    def run_rows(self, rows):
        self.reply(chat_reply(json.dumps({'kind': 'menu', 'rows': rows})))
        return vision.read_image(png_bytes(), shop=SHOP_ON)

    def test_rows_are_validated(self):
        result = self.run_rows([
            {'name': 'Ab' * 250, 'price': '45k', 'category': 'Bc' * 250, 'description': 'C' * 5000},
            {'name': '<script>x</script>Osh', 'price': 45.0},
            {'name': '=cmd', 'price': 1000},
            'satr emas', None, 7, [], {'price': 5000}, {'name': 'X'}, {'name': 'Narxli', 'price': 'juda qimmat'},
            {'name': 'Manfiy', 'price': -5}, {'name': 'Katta', 'price': 10 ** 15}, {'name': 'Bool', 'price': True},
        ])
        names = [row['name'] for row in result.rows]
        self.assertEqual(names[0], 'Ab' * 100)
        self.assertEqual(result.rows[0]['price'], 45000)
        self.assertEqual((len(result.rows[0]['category']), len(result.rows[0]['description'])), (120, 1000))
        self.assertEqual(names[1:], ['X Osh', 'Cmd', 'Narxli', 'Manfiy', 'Katta', 'Bool'])
        self.assertNotIn('<', names[1])
        prices = {row['name']: row['price'] for row in result.rows}
        self.assertEqual((prices['Narxli'], prices['Manfiy'], prices['Katta'], prices['Bool']), (None, None, None, None))
        self.assertEqual(prices['Cmd'], 1000)

    def test_more_than_300_rows_are_truncated_with_a_note(self):
        result = self.run_rows([{'name': f'Taom {i}', 'price': 1000 + i} for i in range(450)])
        self.assertEqual(len(result.rows), 300)
        self.assertIn(vision.NOTE_TRUNCATED, result.notes)

    def test_rows_not_a_list(self):
        for rows in ('Palov', {'name': 'Palov'}, 5, None):
            result = self.run_rows(rows)
            self.assertEqual((result.kind, result.rows), ('menu', []))
            self.assertIn(vision.NOTE_NOTHING, result.notes)


class AiFailureFallsBackToOcrTests(VisionBase):
    OCR_TEXT = "Palov 45 000 so'm\nLag'mon 38000\nCoca-Cola 12k"

    def assert_ocr_fallback(self, result):
        self.assertEqual((result.kind, result.engine), ('menu', 'ocr'))
        self.assertEqual([(r['name'], r['price']) for r in result.rows], [('Palov', 45000), ("Lag'mon", 38000), ('Coca-Cola', 12000)])
        self.assertIn(vision.NOTE_AI_FAILED, result.notes)
        self.assertNotIn(KEY, repr(result))

    def test_garbage_reply(self):
        ocr_mock = self.mock_ocr(self.OCR_TEXT)
        self.reply(chat_reply('Kechirasiz, bu rasmni o\'qiy olmayman.'))
        self.assert_ocr_fallback(vision.read_image(png_bytes(), shop=SHOP_ON))
        ocr_mock.assert_called_once()

    def test_timeout(self):
        self.mock_ocr(self.OCR_TEXT)
        self.post.side_effect = requests.Timeout('read timed out')
        self.assert_ocr_fallback(vision.read_image(png_bytes(), shop=SHOP_ON))

    def test_connection_error(self):
        self.mock_ocr(self.OCR_TEXT)
        self.post.side_effect = requests.ConnectionError(f'HTTPSConnectionPool: Bearer {KEY}')
        with self.assertLogs('products.menu_import.vision', level='DEBUG') as logs:
            result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assert_ocr_fallback(result)
        self.assertNotIn(KEY, '\n'.join(logs.output))   # xato matni log'ga o'tmaydi, faqat turi

    def test_http_errors(self):
        self.mock_ocr(self.OCR_TEXT)
        for status in (401, 403, 429, 500, 503):
            self.reply(FakeResponse(status, {'error': {'message': f'Invalid API Key {KEY}'}}, text=KEY))
            with self.assertLogs('products.menu_import.vision', level='DEBUG') as logs:
                result = vision.read_image(png_bytes(), shop=SHOP_ON)
            self.assert_ocr_fallback(result)
            self.assertNotIn(KEY, '\n'.join(logs.output), status)

    def test_non_json_http_body_and_odd_shapes(self):
        self.mock_ocr(self.OCR_TEXT)
        for response in (FakeResponse(200, None, text='<html>'), FakeResponse(200, {}), FakeResponse(200, {'choices': []}),
                         FakeResponse(200, {'choices': [{'message': {}}]}), FakeResponse(200, {'choices': [{'message': {'content': None}}]}),
                         FakeResponse(200, {'choices': [{'message': {'content': '   '}}]}), FakeResponse(200, [1, 2])):
            self.reply(response)
            self.assert_ocr_fallback(vision.read_image(png_bytes(), shop=SHOP_ON))

    def test_ai_failure_and_no_tesseract_gives_empty_result_with_clear_notes(self):
        self.mock_ocr(error=ocr.OcrUnavailable('yo\'q'))
        self.post.side_effect = requests.Timeout()
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'))
        self.assertEqual(result.notes, [vision.NOTE_AI_FAILED, vision.NOTE_NO_OCR])


class AiDisabledTests(VisionBase):
    def test_off_never_calls_the_network_and_uses_ocr(self):
        ocr_mock = self.mock_ocr('Palov 45000')
        result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.post.assert_not_called()
        ocr_mock.assert_called_once()
        self.assertEqual((result.engine, result.rows[0]['name']), ('ocr', 'Palov'))
        self.assertEqual(result.notes, [vision.NOTE_AI_OFF])

    def test_off_never_sends_text_or_pdf_either(self):
        self.assertIsNone(vision.structure_text_with_ai('Palov 45000', shop=SHOP_OFF))
        self.mock_ocr('Palov 45000')
        pdf = make_pdf([render_menu_png(['Plov 45000'])])
        if shutil.which('pdftoppm'):
            vision.read_scanned_pdf(pdf, shop=SHOP_OFF)
        self.post.assert_not_called()

    @override_settings(AI_API_KEY='')
    def test_no_key_never_calls_the_network(self):
        self.mock_ocr('Palov 45000')
        result = vision.read_image(png_bytes(), shop=SHOP_ON)
        self.post.assert_not_called()
        self.assertEqual((result.engine, result.notes), ('ocr', [vision.NOTE_AI_NO_KEY]))
        self.assertIsNone(vision.structure_text_with_ai('Palov 45000', shop=SHOP_ON))
        self.post.assert_not_called()

    def test_no_shop_means_no_ai(self):
        self.mock_ocr('Palov 45000')
        vision.read_image(png_bytes())
        vision.read_image(png_bytes(), shop=None)
        self.assertIsNone(vision.structure_text_with_ai('Palov 45000'))
        self.post.assert_not_called()

    def test_no_tesseract_and_ai_off_gives_a_clear_note(self):
        self.mock_ocr(error=ocr.OcrUnavailable('yo\'q'))
        result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'))
        self.assertEqual(result.notes, [vision.NOTE_AI_OFF, vision.NOTE_NO_OCR])
        self.post.assert_not_called()

    def test_ocr_found_nothing(self):
        self.mock_ocr('   \n  ')
        result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'ocr'))
        self.assertIn(vision.NOTE_NOTHING, result.notes)

    def test_ocr_error_is_reported_not_raised(self):
        self.mock_ocr(error=ocr.OcrError('OCR vaqti tugadi'))
        result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.assertEqual((result.kind, result.engine), ('unknown', 'none'))
        self.assertTrue(any('OCR vaqti tugadi' in note for note in result.notes))


class OcrGetsTheLargerOriginalTests(VisionBase):
    def test_ocr_is_fed_the_original_bytes_while_ai_gets_the_shrunk_jpeg(self):
        original = png_bytes((3000, 2000))
        ocr_mock = self.mock_ocr('Palov 45000')
        vision.read_image(original, shop=SHOP_OFF)
        self.assertEqual(ocr_mock.call_args.args[0], original)
        self.post.assert_not_called()


class InvalidImageTests(VisionBase):
    def test_bad_images_give_a_note_and_never_reach_ai_or_ocr(self):
        ocr_mock = self.mock_ocr('x')
        for data in (b'', b'not an image', b'<html>', None, 'matn', b'\xff\xd8\xff' + b'\x00' * 20, b'\x00' * (11 * 1024 * 1024)):
            result = vision.read_image(data, shop=SHOP_ON)
            self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'), repr(data)[:30])
            self.assertEqual(len(result.notes), 1)
        self.post.assert_not_called()
        ocr_mock.assert_not_called()


class TextStructuringTests(VisionBase):
    def test_success(self):
        self.reply(chat_reply(json.dumps({'kind': 'dish_photo', 'rows': MENU_JSON['rows']})))   # model adashsa ham matn = menyu
        result = vision.structure_text_with_ai('Palov 45000\nLag\'mon 38 ming', shop=SHOP_ON)
        self.assertEqual((result.kind, result.engine, len(result.rows)), ('menu', 'ai', 3))
        messages = self.post.call_args.kwargs['json']['messages']
        self.assertIn('Palov 45000', messages[1]['content'])
        self.assertIsInstance(messages[1]['content'], str)

    def test_none_when_ai_fails_or_returns_nothing(self):
        for response in (requests.Timeout(), FakeResponse(401, {}), chat_reply('axlat'), chat_reply('{"kind": "menu", "rows": []}'),
                         chat_reply('{"rows": [{"name": ""}]}')):
            self.post.side_effect = [response]
            self.assertIsNone(vision.structure_text_with_ai('Palov 45000', shop=SHOP_ON))

    def test_empty_text_is_none_without_a_call(self):
        for text in ('', '   \n', None, 5):
            self.assertIsNone(vision.structure_text_with_ai(text, shop=SHOP_ON))
        self.post.assert_not_called()

    def test_long_text_is_clipped(self):
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        result = vision.structure_text_with_ai('Palov 45000\n' * 5000, shop=SHOP_ON)
        sent = self.post.call_args.kwargs['json']['messages'][1]['content']
        self.assertLess(len(sent), vision.MAX_AI_TEXT_CHARS + 200)
        self.assertTrue(any('uzun' in note for note in result.notes))


class OcrParserIntegrationTests(VisionBase):
    def test_uses_b1a_text_parser_when_available(self):
        fake_module = mock.MagicMock()
        fake_module.parse_text.return_value = SimpleNamespace(rows=[{'name': 'Parser qatori', 'price': 5000, 'category': 'X', 'warnings': ['a']}])
        self.mock_ocr('hech narsa 1')
        with mock.patch.dict('sys.modules', {'products.menu_import.text_parser': fake_module}):
            result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.assertEqual(result.rows, [{'name': 'Parser qatori', 'price': 5000, 'category': 'X', 'description': ''}])

    def test_falls_back_to_own_parser_when_b1a_parser_breaks_or_is_missing(self):
        broken = mock.MagicMock()
        broken.parse_text.side_effect = RuntimeError('xato')
        self.mock_ocr('Osh 20000')
        with mock.patch.dict('sys.modules', {'products.menu_import.text_parser': broken}):
            self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_OFF).rows[0]['price'], 20000)
        with mock.patch.dict('sys.modules', {'products.menu_import.text_parser': None}):   # ImportError
            self.assertEqual(vision.read_image(png_bytes(), shop=SHOP_OFF).rows[0]['name'], 'Osh')

    def test_adapts_list_results(self):
        fake_module = mock.MagicMock()
        fake_module.parse_text.return_value = [{'name': 'Ro\'yxat', 'price': '7 000'}, SimpleNamespace(name='Obyekt', price=9000, category='', description='')]
        self.mock_ocr('x 1')
        with mock.patch.dict('sys.modules', {'products.menu_import.text_parser': fake_module}):
            result = vision.read_image(png_bytes(), shop=SHOP_OFF)
        self.assertEqual([(r['name'], r['price']) for r in result.rows], [("Ro'yxat", 7000), ('Obyekt', 9000)])


def make_pdf(page_pngs):
    images = [Image.open(io.BytesIO(data)).convert('RGB') for data in page_pngs]
    buffer = io.BytesIO()
    images[0].save(buffer, 'PDF', save_all=True, append_images=images[1:], resolution=100)
    return buffer.getvalue()


class ScannedPdfTests(VisionBase):
    def test_missing_pdftoppm_gives_a_clear_note(self):
        with mock.patch.object(vision.shutil, 'which', return_value=None):
            result = vision.read_scanned_pdf(b'%PDF-1.4 x', shop=SHOP_OFF)
        self.assertEqual((result.kind, result.rows, result.engine, result.notes), ('unknown', [], 'none', [vision.NOTE_NO_PDFTOPPM]))

    def test_invalid_input(self):
        for data in (b'', None, b'bu pdf emas', 'matn', b'\x00' * 100):
            result = vision.read_scanned_pdf(data, shop=SHOP_ON)
            self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'), repr(data))
            self.assertEqual(len(result.notes), 1)
        too_big = b'%PDF-1.4' + b'0' * (vision.PDF_MAX_BYTES + 1)
        self.assertEqual(vision.read_scanned_pdf(too_big, shop=SHOP_ON).rows, [])
        self.post.assert_not_called()

    def test_subprocess_arguments_are_safe(self):
        done = SimpleNamespace(returncode=1, stdout=b'', stderr=b'Incorrect password')
        with mock.patch.object(vision.shutil, 'which', return_value='/usr/bin/pdftoppm'), \
                mock.patch.object(vision.subprocess, 'run', return_value=done) as run, \
                mock.patch.dict(os.environ, {'AI_API_KEY': 'must-not-leak'}):
            result = vision.read_scanned_pdf(b'%PDF-1.4\n' + b'0' * 50, shop=SHOP_OFF, max_pages=3)
        args = run.call_args.args[0]
        self.assertIsInstance(args, list)
        self.assertEqual(args[0], '/usr/bin/pdftoppm')
        self.assertIn('-jpeg', args)
        self.assertEqual(args[args.index('-l') + 1], '3')
        self.assertTrue(args[-2].endswith('in.pdf'))
        self.assertIs(run.call_args.kwargs['shell'], False)
        self.assertLessEqual(run.call_args.kwargs['timeout'], 30)
        self.assertNotIn('AI_API_KEY', run.call_args.kwargs['env'])
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'))
        self.assertIn('parol', result.notes[0])   # chiqish kodi != 0 va sahifa yo'q
        self.assertFalse(os.path.exists(os.path.dirname(args[-2])))   # vaqtinchalik papka tozalandi

    def test_timeout_is_a_note(self):
        with mock.patch.object(vision.shutil, 'which', return_value='/usr/bin/pdftoppm'), \
                mock.patch.object(vision.subprocess, 'run', side_effect=vision.subprocess.TimeoutExpired('pdftoppm', 30)):
            result = vision.read_scanned_pdf(b'%PDF-1.4\n' + b'0' * 50, shop=SHOP_OFF)
        self.assertEqual((result.kind, result.rows, result.engine), ('unknown', [], 'none'))
        self.assertIn('vaqti tugadi', result.notes[0])

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_real_pdf_pages_go_through_ocr_and_temp_dir_is_removed(self):
        private_tmp = tempfile.mkdtemp(prefix='b1b_tmp_')   # parallel jarayonlar bilan aralashmasligi uchun alohida temp
        self.addCleanup(shutil.rmtree, private_tmp, ignore_errors=True)
        pdf = make_pdf([render_menu_png(['Plov 45000']), render_menu_png(['Plov 45000', 'Tea 8000'])])
        ocr_mock = self.mock_ocr('Plov 45000\nTea 8000')
        with mock.patch.object(tempfile, 'tempdir', private_tmp):
            result = vision.read_scanned_pdf(pdf, shop=SHOP_OFF)
        self.assertEqual(ocr_mock.call_count, 2)   # ikki bet
        self.assertEqual((result.kind, result.engine), ('menu', 'ocr'))
        self.assertEqual([(r['name'], r['price']) for r in result.rows], [('Plov', 45000), ('Tea', 8000)])   # takror qator qo'shilmadi
        self.assertEqual(os.listdir(private_tmp), [])   # pdftoppm ishchi papkasi tozalandi
        self.post.assert_not_called()

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_page_limit_and_note(self):
        pdf = make_pdf([render_menu_png([f'Taom{i} {1000 + i}']) for i in range(4)])
        ocr_mock = self.mock_ocr('Taom 1000')
        result = vision.read_scanned_pdf(pdf, shop=SHOP_OFF, max_pages=2)
        self.assertEqual(ocr_mock.call_count, 2)
        self.assertTrue(any('dastlabki 2 bet' in note for note in result.notes), result.notes)

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_ai_is_tried_per_page_but_given_up_after_the_first_failure(self):
        pdf = make_pdf([render_menu_png(['Plov 45000']), render_menu_png(['Tea 8000']), render_menu_png(['Cola 12000'])])
        self.mock_ocr('Plov 45000')
        self.post.side_effect = requests.Timeout()
        result = vision.read_scanned_pdf(pdf, shop=SHOP_ON)
        self.assertEqual(self.post.call_count, 1)   # keyingi sahifalarda qayta kutilmaydi
        self.assertEqual(result.engine, 'ocr')
        self.assertEqual(result.notes.count(vision.NOTE_AI_FAILED), 1)

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_ai_reads_pages_and_skips_dish_photos(self):
        pdf = make_pdf([render_menu_png(['Plov 45000']), render_menu_png(['Rasm'])])
        self.reply(chat_reply(json.dumps(MENU_JSON)),
                   chat_reply(json.dumps({'kind': 'dish_photo', 'rows': [{'name': 'Palov'}]})))
        result = vision.read_scanned_pdf(pdf, shop=SHOP_ON)
        self.assertEqual((result.kind, result.engine, len(result.rows)), ('menu', 'ai', 3))
        self.assertEqual(self.post.call_count, 2)

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_render_resolution_depends_on_who_reads_the_page(self):
        pdf = make_pdf([render_menu_png(['Plov 45000'], size=(800, 500))])
        captured = []
        real_run = vision.subprocess.run

        def spy(args, **kwargs):
            captured.append(args)
            return real_run(args, **kwargs)

        self.mock_ocr('Plov 45000')
        self.reply(chat_reply(json.dumps(MENU_JSON)))
        with mock.patch.object(vision.subprocess, 'run', spy):
            vision.read_scanned_pdf(pdf, shop=SHOP_ON)
            vision.read_scanned_pdf(pdf, shop=SHOP_OFF)
        self.assertEqual(captured[0][captured[0].index('-r') + 1], '130')   # AI: -r 130
        self.assertEqual(captured[1][captured[1].index('-r') + 1], '200')   # AI yo'q: OCR uchun aniqroq

    @unittest.skipUnless(shutil.which('pdftoppm'), 'pdftoppm o\'rnatilmagan')
    def test_huge_page_size_uses_scale_to_not_dpi(self):
        # 40 x 40 dyuym sahifa 130 dpi da 5200 px bo'lardi: -r emas, -scale-to ishlatiladi
        buffer = io.BytesIO()
        Image.new('RGB', (100, 100), 'white').save(buffer, 'PDF', resolution=2.5)
        captured = {}
        real_run = vision.subprocess.run

        def spy(args, **kwargs):
            captured['args'] = args
            return real_run(args, **kwargs)

        with mock.patch.object(vision.subprocess, 'run', spy):
            self.mock_ocr('Osh 20000')
            vision.read_scanned_pdf(buffer.getvalue(), shop=SHOP_OFF)
        self.assertIn('-scale-to', captured['args'])
        self.assertNotIn('-r', captured['args'])


@override_settings(AI_API_KEY=KEY, AI_PROVIDER='groq')
class UsageLogTests(TestCase):
    def test_every_call_is_logged_without_the_key_or_content(self):
        from ai.models import AIUsage
        with mock.patch.object(vision.requests, 'post', side_effect=[chat_reply(json.dumps(MENU_JSON)), requests.Timeout()]):
            vision.read_image(png_bytes(), shop=SHOP_ON)
            with mock.patch.object(vision.ocr, 'ocr_text', side_effect=ocr.OcrUnavailable('yo\'q')):
                vision.read_image(png_bytes(), shop=SHOP_ON)
        rows = list(AIUsage.objects.order_by('id').values('provider', 'task', 'ok', 'tokens_in', 'tokens_out', 'error', 'prompt_preview'))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0], {'provider': 'groq', 'task': 'vision', 'ok': True, 'tokens_in': 11, 'tokens_out': 7, 'error': '',
                                   'prompt_preview': 'menu_import:image'})
        self.assertEqual((rows[1]['ok'], rows[1]['error']), (False, 'timeout'))
        self.assertNotIn(KEY, json.dumps(rows))
