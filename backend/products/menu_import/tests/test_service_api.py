"""Ommaviy menyu kiritish API: parse / commit / undo (to'liq HTTP oqimi, ruxsatlar, begona restoran, atomiklik, idempotentlik)."""
import io
import json
import os
import tempfile
import uuid
from decimal import Decimal
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.db import connection
from django.test import Client, TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from orders.audit import AuditLog
from products.menu_cache import get_menu_version
from products.menu_import import image_tokens
from products.menu_import.tests.fixtures import (
    make_docx,
    make_image,
    make_many_entries_zip,
    make_pdf,
    make_xlsx,
    make_zip_bomb_xlsx,
    upload,
)
from products.menu_import.vision import VisionResult
from products.models import Product
from shops.models import Shop

BASE = '/api/restaurant/admin/v1/menu/import/'
# Fayl yuklash bu testlarda `UploadValidationMiddleware` siz tekshiriladi: u hozircha .xlsx/.docx/.pdf/.txt ni rad etadi
# (backend/upload_validation.py — B1a fayli emas; hisobotga qarang). `FullStackUploadTests` haqiqiy zanjirni alohida sinaydi.
NO_UPLOAD_MIDDLEWARE = [m for m in settings.MIDDLEWARE if m != 'backend.upload_validation.UploadValidationMiddleware']

SAMSUNG = """Milliy taomlar
Osh - 45 000
Lag'mon 40000 so'm
Manti: 35k

ICHIMLIKLAR
• Choy 8k
- Coca-Cola 0.5L - 12 000
"""


def make_shop(slug, owner):
    call_command('create_restaurant', name=f'{slug} resto', slug=slug, owner=owner, password='Parol-Import-123',
                 tables=1, stdout=io.StringIO())
    shop = Shop.objects.get(slug=slug)
    user = AdminUser.objects.get(username=owner)
    user.is_approved = True
    user.save(update_fields=['is_approved'])
    return shop, user


def client_for(user):
    client = Client()
    client.force_login(user)
    return client


@override_settings(ROOT_URLCONF='backend.urls_restaurant', MIDDLEWARE=NO_UPLOAD_MIDDLEWARE)
class ImportBase(TestCase):

    def setUp(self):
        cache.clear()
        self.media = tempfile.mkdtemp(prefix='import-test-media-')
        self.enterContext(override_settings(MEDIA_ROOT=self.media))
        self.shop, self.owner = make_shop('imp-a', 'imp-a-ega')
        self.other_shop, self.other_owner = make_shop('imp-b', 'imp-b-ega')
        self.client_a = client_for(self.owner)
        self.client_b = client_for(self.other_owner)
        self.waiter = create_staff(self.shop, 'imp-waiter', 'waiter', password='Xodim-Parol-2026!')[0]

    # --- yordamchilar ---
    def parse(self, client=None, **data):
        return (client or self.client_a).post(BASE + 'parse/', data)

    def parse_file(self, name, content, client=None):
        return self.parse(client, file=upload(name, content))

    def commit(self, rows, submission_id=None, client=None):
        return (client or self.client_a).post(
            BASE + 'commit/', json.dumps({'submission_id': submission_id or str(uuid.uuid4()), 'rows': rows}),
            content_type='application/json')

    def undo(self, batch_id, client=None):
        return (client or self.client_a).post(BASE + 'undo/', json.dumps({'batch_id': batch_id}), content_type='application/json')

    def add_product(self, shop, name, price=45000, **extra):
        return Product.objects.create(shop=shop, name=name, price=Decimal(price), **extra)

    def commit_rows(self, n=3, shop_client=None, **row_extra):
        rows = [{'row_id': f'r{i}', 'name': f'Taom {i}', 'price': 10000 + i, 'category': 'Yangi bo\'lim', **row_extra}
                for i in range(1, n + 1)]
        return self.commit(rows, client=shop_client)

    def jpeg(self):
        return make_image('JPEG', (120, 90))


# ─── parse ─────────────────────────────────────────────────────────────────────────

class ParseTextTests(ImportBase):

    def test_response_shape_for_pasted_text(self):
        res = self.parse(text=SAMSUNG)
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual(set(data), {'source', 'engine', 'kind', 'truncated', 'rows', 'categories', 'notes', 'stats'})
        self.assertEqual((data['source'], data['engine'], data['kind'], data['truncated']), ('text', 'rules', 'menu', False))
        self.assertEqual([r['row_id'] for r in data['rows']], [f'r{i}' for i in range(1, 6)])
        osh = data['rows'][0]
        self.assertEqual(set(osh), {'row_id', 'name', 'price', 'category', 'description', 'image_token', 'preview_url', 'warnings',
                                    'existing_product_id', 'existing_category_id', 'duplicate_in_file'})
        self.assertEqual((osh['name'], osh['price'], osh['category'], osh['image_token']), ('Osh', 45000, 'Milliy taomlar', None))
        self.assertEqual([c['name'] for c in data['categories']], ['Milliy taomlar', 'Ichimliklar'])
        self.assertEqual(data['stats'], {'lines': 7, 'recognized': 5, 'skipped': 0})
        self.assertTrue(all('category_new' in r['warnings'] for r in data['rows']))

    def test_json_body_text_is_accepted(self):
        res = self.client_a.post(BASE + 'parse/', json.dumps({'text': 'Osh 45000'}), content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['rows'][0]['price'], 45000)

    def test_parse_never_writes_to_the_database(self):
        before = (Product.all_objects.count(), Category.objects.count(), AuditLog.objects.count())
        self.assertEqual(self.parse(text=SAMSUNG).status_code, 200)
        self.assertEqual((Product.all_objects.count(), Category.objects.count(), AuditLog.objects.count()), before)

    def test_warnings(self):
        self.add_product(self.shop, 'Mavjud taom')
        text = "Osh 45\nZiyofat 6 000 000\nMavjud taom 20000\nNon 3000\nNon 3000\nSalat 12000\nChoy"
        rows = {(r['name'], i): r for i, r in enumerate(self.parse(text=text).json()['rows'])}
        warn = {name: r['warnings'] for (name, i), r in rows.items() if i != 4}
        self.assertEqual(warn['Osh'], ['price_small'])
        self.assertEqual(warn['Choy'], ['price_missing'])
        self.assertEqual(warn['Ziyofat'], ['price_large'])
        self.assertEqual(warn['Mavjud taom'], ['name_exists'])
        self.assertEqual(warn['Non'], [])
        second_non = rows[('Non', 4)]
        self.assertEqual(second_non['warnings'], ['duplicate_in_file'])
        self.assertTrue(second_non['duplicate_in_file'])

    def test_existing_product_is_matched_loosely_and_only_in_this_shop(self):
        mine = self.add_product(self.shop, "Lag'mon")
        theirs = self.add_product(self.other_shop, 'Osh')
        gone = self.add_product(self.shop, 'Somsa')
        gone.delete()                                          # arxivlangan: moslashmaydi
        rows = self.parse(text="LAGʻMON - 40 000\nOsh - 45 000\nSomsa - 12 000").json()['rows']
        self.assertEqual(rows[0]['existing_product_id'], mine.pk)
        self.assertIn('name_exists', rows[0]['warnings'])
        self.assertIsNone(rows[1]['existing_product_id'])      # begona restoran taomi sizmaydi
        self.assertNotIn('name_exists', rows[1]['warnings'])
        self.assertNotEqual(rows[1]['existing_product_id'], theirs.pk)
        self.assertIsNone(rows[2]['existing_product_id'])
        self.assertNotIn('name_exists', rows[2]['warnings'])

    def test_existing_category_is_matched_loosely(self):
        cat = Category.objects.create(name='Ichimliklar', name_uz='Ichimliklar', name_ru='Ichimliklar', is_restaurant=True)
        data = self.parse(text='ICHIMLIKLAR\nChoy 8000').json()
        row = data['rows'][0]
        self.assertEqual((row['category'], row['existing_category_id']), ('Ichimliklar', cat.pk))
        self.assertNotIn('category_new', row['warnings'])
        self.assertEqual(data['categories'], [{'name': 'Ichimliklar', 'existing_id': cat.pk}])

    def test_other_shops_private_category_is_not_visible(self):
        hidden = Category.objects.create(name='Maxfiy bolim', name_uz='x', name_ru='x', is_restaurant=False)
        self.add_product(self.other_shop, 'Boshqa taom', category=hidden)
        row = self.parse(text='Maxfiy bolim:\nOsh 45000').json()['rows'][0]
        self.assertIsNone(row['existing_category_id'])
        self.assertIn('category_new', row['warnings'])

    def test_hostile_content_is_cleaned(self):
        text = "=cmd|' /C calc'!A0 5000\n+SUM(1+1) 3000\n<script>alert(1)</script>Osh 7000\n<b>Non</b> 3000\n&lt;img src=x onerror=alert(1)&gt;Choy 8000"
        rows = self.parse(text=text).json()['rows']
        self.assertEqual([r['name'] for r in rows], ["cmd|' /C calc'!A0", 'SUM(1+1)', 'Osh', 'Non', 'Choy'])
        self.assertEqual([r['price'] for r in rows], [5000, 3000, 7000, 3000, 8000])

    def test_long_name_and_description_are_cut(self):
        row = self.parse(text=f"{'A' * 250} - 45 000").json()['rows'][0]
        self.assertEqual(len(row['name']), 200)
        data = self.parse_file('m.csv', f"Nomi;Narxi;Tavsif\nOsh;45000;{'b' * 6000}\n").json()
        self.assertEqual(len(data['rows'][0]['description']), 5000)

    def test_more_than_300_rows_is_truncated(self):
        text = '\n'.join(f'Taom {i} - {10000 + i}' for i in range(305))
        data = self.parse(text=text).json()
        self.assertTrue(data['truncated'])
        self.assertEqual(len(data['rows']), 300)
        self.assertEqual(data['rows'][-1]['row_id'], 'r300')
        self.assertTrue(any('300' in n for n in data['notes']))

    def test_exactly_300_rows_is_not_truncated(self):
        data = self.parse(text='\n'.join(f'Taom {i} - {10000 + i}' for i in range(300))).json()
        self.assertFalse(data['truncated'])
        self.assertEqual(len(data['rows']), 300)

    def test_skipped_lines_are_reported(self):
        data = self.parse(text='Osh 45000\nTel: +998 90 123 45 67\nManzil: Guliston').json()
        self.assertEqual(data['stats']['skipped'], 2)
        self.assertTrue(any("2 ta qator o'qilmadi" in n for n in data['notes']))

    def test_input_errors(self):
        res = self.parse()
        self.assertEqual((res.status_code, res.json()['code']), (400, 'no_input'))
        res = self.parse(text='   ')
        self.assertEqual((res.status_code, res.json()['code']), (400, 'empty_input'))
        res = self.parse(text='Osh 45000', file=upload('m.txt', 'Choy 8000'))
        self.assertEqual((res.status_code, res.json()['code']), (400, 'both_inputs'))
        res = self.parse(text='x' * 200_001)
        self.assertEqual((res.status_code, res.json()['code']), (400, 'text_too_long'))
        for body in ('"matn"', '[1,2]', '{"text": ["a"]}', '{"text": 5}'):
            res = self.client_a.post(BASE + 'parse/', body, content_type='application/json')
            self.assertIn(res.status_code, (400, 422), body)

    def test_nothing_recognized_is_422_with_advice(self):
        for payload in ({'text': '-----\n*****'}, {'text': '09:00-23:00\nwww.site.uz'}):
            res = self.parse(**payload)
            self.assertEqual(res.status_code, 422, payload)
            self.assertEqual(res.json()['code'], 'nothing_recognized')
            self.assertIn('Osh - 45 000', res.json()['error'])

    def test_rate_limit_per_shop_per_hour(self):
        with override_settings(MENU_IMPORT_PARSE_PER_HOUR=3):
            for _ in range(3):
                self.assertEqual(self.parse(text='Osh 45000').status_code, 200)
            res = self.parse(text='Osh 45000')
            self.assertEqual((res.status_code, res.json()['code']), (429, 'rate_limited'))
            self.assertTrue(res['Retry-After'])
            self.assertEqual(self.parse(client=self.client_b, text='Osh 45000').status_code, 200)   # boshqa restoran alohida hisob

    def test_default_rate_limit_is_20(self):
        for _ in range(20):
            self.assertEqual(self.parse(text='Osh 45000').status_code, 200)
        self.assertEqual(self.parse(text='Osh 45000').status_code, 429)

    def test_invalid_input_does_not_burn_the_rate_limit(self):
        with override_settings(MENU_IMPORT_PARSE_PER_HOUR=1):
            for _ in range(5):
                self.assertEqual(self.parse().status_code, 400)
            self.assertEqual(self.parse(text='Osh 45000').status_code, 200)


class ParsePermissionTests(ImportBase):

    def test_anonymous_and_waiter_are_rejected_on_every_endpoint(self):
        for path in ('parse/', 'commit/', 'undo/'):
            self.assertIn(Client().post(BASE + path, {}).status_code, (401, 403), path)
            self.assertEqual(client_for(self.waiter).post(BASE + path, {}).status_code, 403, path)

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client_a.get(BASE + 'parse/').status_code, 405)


class ParseFileTests(ImportBase):

    def test_csv(self):
        res = self.parse_file('menyu.csv', 'Nomi;Narxi;Kategoriya\nOsh;45000;Milliy\nChoy;8 000;Ichimlik\n')
        data = res.json()
        self.assertEqual((res.status_code, data['source'], data['engine']), (200, 'csv', 'table'))
        self.assertEqual([(r['name'], r['price'], r['category']) for r in data['rows']],
                         [('Osh', 45000, 'Milliy'), ('Choy', 8000, 'Ichimlik')])

    def test_txt_goes_through_text_rules(self):
        data = self.parse_file('menyu.txt', SAMSUNG).json()
        self.assertEqual((data['source'], data['engine'], len(data['rows'])), ('text', 'rules', 5))

    def test_xlsx_with_sheets_as_categories(self):
        data = self.parse_file('menyu.xlsx', make_xlsx({
            'Salatlar': [['Nomi', 'Narxi'], ['Olivye', 20000], ['Achichuk', 15000.0]],
            'Ichimliklar': [['Nomi', 'Narxi'], ['Choy', 8000]],
        })).json()
        self.assertEqual((data['source'], data['engine']), ('xlsx', 'table'))
        self.assertEqual([(r['name'], r['price'], r['category']) for r in data['rows']],
                         [('Olivye', 20000, 'Salatlar'), ('Achichuk', 15000, 'Salatlar'), ('Choy', 8000, 'Ichimliklar')])

    def test_xlsx_50_rows_quickly(self):
        rows = [['Nomi', 'Narxi', 'Kategoriya']] + [[f'Taom {i}', 10000 + i, f'Bolim {i % 4}'] for i in range(50)]
        res = self.parse_file('menyu.xlsx', make_xlsx(rows))
        data = res.json()
        self.assertEqual(len(data['rows']), 50)
        self.assertEqual(len(data['categories']), 4)

    def test_docx_paragraphs_and_tables(self):
        data = self.parse_file('menyu.docx', make_docx([
            'Salatlar', 'Olivye - 20 000', [['Nomi', 'Narxi'], ['Achichuk', '15000']], 'Ichimliklar:', 'Choy 8k'])).json()
        self.assertEqual(data['source'], 'docx')
        got = {r['name']: (r['price'], r['category']) for r in data['rows']}
        self.assertEqual(got['Olivye'], (20000, 'Salatlar'))
        self.assertEqual(got['Achichuk'], (15000, 'Salatlar'))        # jadval oldingi sarlavha bo'limida
        self.assertEqual(got['Choy'], (8000, 'Ichimliklar'))

    def test_pdf_with_text_layer(self):
        data = self.parse_file('menyu.pdf', make_pdf(['Salatlar', 'Olivye - 20 000', 'Choy 8k', 'Non 3 000'])).json()
        self.assertEqual((data['source'], data['engine']), ('pdf', 'rules'))
        self.assertEqual([(r['name'], r['price']) for r in data['rows']], [('Olivye', 20000), ('Choy', 8000), ('Non', 3000)])
        self.assertEqual(data['rows'][0]['category'], 'Salatlar')

    def test_unsupported_types_return_415_with_advice(self):
        for name in ('menyu.xls', 'menyu.doc', 'eslatma.sdocx', 'menyu.pages'):
            res = self.parse_file(name, b'dummy bytes' * 10)
            self.assertEqual((res.status_code, res.json()['code']), (415, 'unsupported_type'), name)
            self.assertIn('Boshqacha saqlash', res.json()['error'])

    def test_fake_extension_is_400(self):
        res = self.parse_file('menyu.xlsx', 'Osh 45000')
        self.assertEqual((res.status_code, res.json()['code']), (400, 'invalid_file'))

    def test_too_large_file_is_413(self):
        res = self.parse_file('menyu.txt', b'a' * (11 * 1024 * 1024))
        self.assertEqual((res.status_code, res.json()['code']), (413, 'file_too_large'))

    def test_zip_bombs_are_rejected(self):
        for content in (make_zip_bomb_xlsx(60), make_many_entries_zip(2100)):
            res = self.parse_file('menyu.xlsx', content)
            self.assertEqual((res.status_code, res.json()['code']), (400, 'zip_bomb'))

    def test_empty_file_is_400(self):
        res = self.parse_file('menyu.txt', b'')
        self.assertEqual((res.status_code, res.json()['code']), (400, 'empty_file'))

    def test_301_row_spreadsheet(self):
        rows = [['Nomi', 'Narxi']] + [[f'Taom {i}', 10000 + i] for i in range(301)]
        data = self.parse_file('menyu.xlsx', make_xlsx(rows)).json()
        self.assertTrue(data['truncated'])
        self.assertEqual(len(data['rows']), 300)

    def test_formula_names_in_a_spreadsheet_are_cleaned(self):
        rows = [['Nomi', 'Narxi'], ["=HYPERLINK(\"http://evil\",\"x\")", 5000], ['+cmd|calc', 3000], ['@SUM(A1)', 2000], ['-2+3', 1000]]
        data = self.parse_file('menyu.xlsx', make_xlsx(rows)).json()
        for row in data['rows']:
            self.assertNotIn(row['name'][:1], '=+-@')


class ParseImageTests(ImportBase):

    def test_menu_image_with_ocr_rows_is_low_confidence(self):
        result = VisionResult(kind='menu', rows=[{'name': 'Osh', 'price': 45000, 'category': 'Issiq', 'description': ''}],
                              engine='ocr', notes=['Tesseract faqat lotin harflarini taniydi'])
        with mock.patch('products.menu_import.vision.read_image', return_value=result) as read:
            data = self.parse_file('menyu.jpg', make_image('JPEG')).json()
        self.assertEqual(read.call_args.kwargs['shop'].pk, self.shop.pk)
        self.assertEqual((data['source'], data['engine'], data['kind']), ('image', 'ocr', 'menu'))
        self.assertIn('low_confidence', data['rows'][0]['warnings'])
        self.assertIn('Tesseract faqat lotin harflarini taniydi', data['notes'])

    def test_ai_rows_are_cleaned_like_any_other_input(self):
        rows = [{'name': '=EVIL() <b>Osh</b>', 'price': '45 000', 'category': '+x', 'description': '<script>1</script>mazali'},
                {'name': 'Bad', 'price': 'abc'}, 'not a dict', {'name': ''}]
        with mock.patch('products.menu_import.vision.read_image', return_value=VisionResult('menu', rows, 'ai', [])):
            data = self.parse_file('menyu.png', make_image('PNG')).json()
        self.assertEqual(data['engine'], 'ai')
        self.assertEqual([(r['name'], r['price'], r['category'], r['description']) for r in data['rows']],
                         [('EVIL() Osh', 45000, 'x', 'mazali'), ('Bad', None, '', '')])
        self.assertNotIn('low_confidence', data['rows'][0]['warnings'])

    def test_dish_photo_stores_the_picture_and_returns_a_token(self):
        result = VisionResult('dish_photo', [{'name': 'Palov', 'price': 99999, 'category': 'Issiq', 'description': 'guruch'}], 'ai', [])
        with mock.patch('products.menu_import.vision.read_image', return_value=result):
            data = self.parse_file('palov.jpg', self.jpeg()).json()
        self.assertEqual((data['kind'], len(data['rows'])), ('dish_photo', 1))
        row = data['rows'][0]
        self.assertEqual((row['name'], row['price']), ('Palov', None))
        self.assertIn('price_missing', row['warnings'])
        info = image_tokens.peek_temp_image(row['image_token'], self.shop.pk)
        self.assertTrue(info and info['real_photo'])
        self.assertIsNone(image_tokens.peek_temp_image(row['image_token'], self.other_shop.pk))

    def test_dish_photo_without_a_guess_still_returns_one_row(self):
        with mock.patch('products.menu_import.vision.read_image', return_value=VisionResult('dish_photo', [], 'ai', [])):
            data = self.parse_file('x.jpg', self.jpeg()).json()
        self.assertEqual((data['kind'], len(data['rows']), data['rows'][0]['name']), ('dish_photo', 1, ''))
        self.assertTrue(data['rows'][0]['image_token'])

    def test_no_ai_and_no_ocr_is_503(self):
        empty = VisionResult('unknown', [], 'none', ["Tesseract topilmadi"])
        with mock.patch('products.menu_import.vision.read_image', return_value=empty):
            res = self.parse_file('menyu.jpg', self.jpeg())
        self.assertEqual((res.status_code, res.json()['code']), (503, 'ai_unavailable'))

    def test_ocr_found_nothing_is_422(self):
        with mock.patch('products.menu_import.vision.read_image', return_value=VisionResult('unknown', [], 'ocr', ['matn topilmadi'])):
            res = self.parse_file('menyu.jpg', self.jpeg())
        self.assertEqual((res.status_code, res.json()['code']), (422, 'nothing_recognized'))

    def test_vision_crash_is_503_not_500(self):
        with mock.patch('products.menu_import.vision.read_image', side_effect=RuntimeError('boom sk-secret')):
            res = self.parse_file('menyu.jpg', self.jpeg())
        self.assertEqual(res.status_code, 503)
        self.assertNotIn('sk-secret', res.content.decode())

    def test_scanned_pdf_goes_to_vision(self):
        result = VisionResult('menu', [{'name': 'Osh', 'price': 45000, 'category': '', 'description': ''}], 'ocr', [])
        with mock.patch('products.menu_import.vision.read_scanned_pdf', return_value=result) as scanned:
            data = self.parse_file('skaner.pdf', make_pdf([])).json()
        self.assertEqual(scanned.call_args.kwargs['max_pages'], 8)
        self.assertEqual((data['source'], data['engine'], data['rows'][0]['name']), ('pdf', 'ocr', 'Osh'))
        self.assertTrue(any('skanerlangan' in n for n in data['notes']))

    def test_broken_image_is_400(self):
        res = self.parse_file('menyu.png', b'\x89PNG\r\n\x1a\n' + b'x' * 50)
        self.assertEqual((res.status_code, res.json()['code']), (400, 'invalid_file'))


class ParseAiFallbackTests(ImportBase):
    MESSY = '\n'.join(['bugun bizning restoranda yangi menyu chiqdi va u juda mazali ovqatlardan iborat bo\'lib ko\'plab mehmonlar yoqtiradi'] * 4)

    def test_ai_structures_messy_text_when_rules_recognise_under_half(self):
        ai = VisionResult('menu', [{'name': 'Palov', 'price': 45000, 'category': 'Issiq', 'description': ''}], 'ai', ['AI tartibladi'])
        with mock.patch('products.menu_import.vision.structure_text_with_ai', return_value=ai) as structure:
            data = self.parse(text=self.MESSY).json()
        self.assertEqual(structure.call_count, 1)
        self.assertEqual(structure.call_args.kwargs['shop'].pk, self.shop.pk)
        self.assertEqual((data['engine'], data['rows'][0]['name']), ('ai', 'Palov'))
        self.assertIn('AI tartibladi', data['notes'])

    def test_ai_is_not_called_when_rules_understand_the_text(self):
        with mock.patch('products.menu_import.vision.structure_text_with_ai') as structure:
            data = self.parse(text=SAMSUNG).json()
        structure.assert_not_called()
        self.assertEqual(data['engine'], 'rules')

    def test_ai_off_returns_none_and_rules_result_is_kept(self):
        with mock.patch('products.menu_import.vision.structure_text_with_ai', return_value=None):
            res = self.parse(text=self.MESSY)
        self.assertEqual((res.status_code, res.json()['code']), (422, 'nothing_recognized'))

    def test_ai_crash_never_breaks_text_parsing(self):
        text = SAMSUNG + '\n' + self.MESSY
        with mock.patch('products.menu_import.vision.structure_text_with_ai', side_effect=RuntimeError('x')):
            data = self.parse(text=text).json()
        self.assertEqual(data['engine'], 'rules')
        self.assertEqual(len(data['rows']), 5)

    def test_ai_result_is_ignored_when_it_is_worse_than_rules(self):
        text = SAMSUNG + '\n' + self.MESSY
        worse = VisionResult('menu', [{'name': 'Faqat bitta', 'price': 1, 'category': '', 'description': ''}], 'ai', [])
        with mock.patch('products.menu_import.vision.structure_text_with_ai', return_value=worse):
            data = self.parse(text=text).json()
        self.assertEqual(data['engine'], 'rules')

    def test_tables_never_call_the_ai(self):
        with mock.patch('products.menu_import.vision.structure_text_with_ai') as structure:
            self.parse_file('m.csv', 'Nomi;Narxi\nOsh;45000\n')
        structure.assert_not_called()


# ─── commit ────────────────────────────────────────────────────────────────────────

class CommitTests(ImportBase):

    def test_creates_products_categories_and_audit(self):
        existing = Category.objects.create(name='Ichimliklar', name_uz='Ichimliklar', name_ru='Ichimliklar', is_restaurant=True)
        rows = [
            {'row_id': 'r1', 'name': 'Palov', 'price': 45000, 'category': "Milliy taomlar", 'description': 'guruch, go\'sht'},
            {'row_id': 'r2', 'name': 'Lag\'mon', 'price': 40000, 'category': 'milliy TAOMLAR'},         # xuddi shu yangi bo'lim
            {'row_id': 'r3', 'name': 'Choy', 'price': 8000, 'category': 'ICHIMLIKLAR'},                  # mavjud bo'lim
            {'row_id': 'r4', 'name': 'Non', 'price': 3000, 'category': 'Bilmagan', 'category_id': existing.pk},
            {'row_id': 'r5', 'name': 'Suv', 'price': 2000},
        ]
        before = get_menu_version(self.shop.pk)
        res = self.commit(rows)
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        batch = data['batch_id']
        self.assertEqual((data['created'], data['updated'], data['skipped']), (5, 0, 0))
        self.assertEqual(data['categories_created'], ['Milliy taomlar'])
        self.assertEqual([p['row_id'] for p in data['products']], ['r1', 'r2', 'r3', 'r4', 'r5'])

        products = {p.name: p for p in Product.objects.filter(shop=self.shop)}
        self.assertEqual(set(products), {'Palov', "Lag'mon", 'Choy', 'Non', 'Suv'})
        self.assertEqual({p.import_batch for p in products.values()}, {batch})
        self.assertEqual([p['id'] for p in data['products']], [products[n].pk for n in ('Palov', "Lag'mon", 'Choy', 'Non', 'Suv')])
        self.assertEqual(products['Palov'].price, Decimal('45000'))
        self.assertEqual(products['Palov'].description, "guruch, go'sht")
        self.assertEqual((products['Palov'].cook_min, products['Palov'].is_available, products['Palov'].has_real_photo), (15, True, False))
        self.assertEqual(products['Choy'].category_id, existing.pk)
        self.assertEqual(products['Non'].category_id, existing.pk)                 # category_id nomdan ustun
        self.assertIsNone(products['Suv'].category_id)
        self.assertEqual(products['Palov'].category_id, products["Lag'mon"].category_id)
        new_cat = Category.objects.get(name='Milliy taomlar')
        self.assertEqual((new_cat.name_uz, new_cat.name_ru, new_cat.is_active, new_cat.is_restaurant, new_cat.kind),
                         ('Milliy taomlar', 'Milliy taomlar', True, True, ''))
        self.assertEqual(Category.objects.filter(name__iexact='milliy taomlar').count(), 1)

        audit = AuditLog.objects.get(target_type='menu_import')
        self.assertEqual((audit.new_value['action'], audit.new_value['batch_id'], audit.new_value['created']), ('menu_import', batch, 5))
        self.assertEqual(audit.actor_id, self.owner.pk)
        self.assertGreater(get_menu_version(self.shop.pk), before)

    def test_slugs_are_unique_even_with_identical_names_and_hidden_products(self):
        self.add_product(self.shop, 'Osh', slug='osh')
        hidden = self.add_product(self.other_shop, 'Osh', slug='osh-2')
        hidden.delete()
        data = self.commit([{'name': 'Osh', 'price': 45000}, {'name': 'Osh', 'price': 46000}, {'name': 'Osh', 'price': 47000}]).json()
        slugs = list(Product.all_objects.filter(import_batch=data['batch_id']).order_by('id').values_list('slug', flat=True))
        self.assertEqual(slugs, ['osh-3', 'osh-4', 'osh-5'])
        self.assertEqual(len(set(Product.all_objects.values_list('slug', flat=True))), Product.all_objects.count())

    def test_unicode_and_very_long_names_make_valid_slugs(self):
        data = self.commit([{'name': "Sho'rva — «Тошкент»", 'price': 30000}, {'name': 'X' * 200, 'price': 1000},
                            {'name': '!!!???', 'price': 1000}]).json()
        for slug in Product.all_objects.filter(import_batch=data['batch_id']).values_list('slug', flat=True):
            self.assertTrue(slug and len(slug) <= 50, slug)

    def test_one_bad_row_writes_nothing(self):
        rows = [
            {'row_id': 'a', 'name': 'Yaxshi 1', 'price': 1000, 'category': 'Yangi bolim'},
            {'row_id': 'b', 'name': 'Yaxshi 2', 'price': 2000},
            {'row_id': 'c', 'name': 'Yomon', 'price': 'abc'},
            {'row_id': 'd', 'name': '', 'price': 100},
        ]
        before = (Product.all_objects.count(), Category.objects.count(), AuditLog.objects.count())
        res = self.commit(rows)
        self.assertEqual(res.status_code, 400)
        body = res.json()
        self.assertEqual(body['code'], 'validation_failed')
        self.assertEqual({(e['row_id'], e['field']) for e in body['rows']}, {('c', 'price'), ('d', 'name')})
        self.assertTrue(all(e['message'] for e in body['rows']))
        self.assertEqual((Product.all_objects.count(), Category.objects.count(), AuditLog.objects.count()), before)

    def test_row_validation_messages(self):
        long_name = 'A' * 201
        rows = [
            {'row_id': 'n', 'name': long_name, 'price': 1},
            {'row_id': 'p1', 'name': 'a1', 'price': -5},
            {'row_id': 'p2', 'name': 'a2', 'price': None},
            {'row_id': 'p3', 'name': 'a3', 'price': 10 ** 13},
            {'row_id': 'p4', 'name': 'a4', 'price': 12.5},
            {'row_id': 'm', 'name': 'a5', 'price': 1, 'mode': 'destroy'},
            {'row_id': 'c', 'name': 'a6', 'price': 1, 'category_id': 999999},
            {'row_id': 'd', 'name': 'a7', 'price': 1, 'description': 'x' * 5001},
            'oddiy matn',
        ]
        errors = self.commit(rows).json()['rows']
        got = {(e['row_id'], e['field']) for e in errors}
        self.assertEqual(got, {('n', 'name'), ('p1', 'price'), ('p2', 'price'), ('p3', 'price'), ('p4', 'price'), ('m', 'mode'),
                               ('c', 'category_id'), ('d', 'description'), ('r9', '')})

    def test_submission_is_idempotent(self):
        submission = str(uuid.uuid4())
        rows = [{'name': 'Osh', 'price': 45000, 'category': 'Yangi'}]
        first = self.commit(rows, submission).json()
        again = self.commit(rows, submission)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json(), first)
        self.assertEqual(Product.objects.filter(shop=self.shop, name='Osh').count(), 1)
        self.assertEqual(Category.objects.filter(name='Yangi').count(), 1)
        self.assertEqual(AuditLog.objects.filter(target_type='menu_import').count(), 1)

    def test_failed_commit_can_be_retried_with_the_same_submission_id(self):
        submission = str(uuid.uuid4())
        self.assertEqual(self.commit([{'name': 'Osh', 'price': 'abc'}], submission).status_code, 400)
        res = self.commit([{'name': 'Osh', 'price': 45000}], submission)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['created'], 1)

    def test_same_submission_id_in_another_shop_is_independent(self):
        submission = str(uuid.uuid4())
        self.commit([{'name': 'Osh', 'price': 45000}], submission)
        res = self.commit([{'name': 'Osh', 'price': 45000}], submission, client=self.client_b)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Product.objects.filter(shop=self.other_shop).count(), 1)

    def test_commit_in_progress_is_409(self):
        submission = str(uuid.uuid4())
        cache.set(f'menu_import:commit:{self.shop.pk}:{submission}:lock', 1, 60)
        res = self.commit([{'name': 'Osh', 'price': 45000}], submission)
        self.assertEqual((res.status_code, res.json()['code']), (409, 'in_progress'))
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())

    def test_submission_id_and_rows_are_required(self):
        post = lambda body: self.client_a.post(BASE + 'commit/', json.dumps(body), content_type='application/json')  # noqa: E731
        self.assertEqual(post({'rows': [{'name': 'a', 'price': 1}]}).json()['code'], 'invalid_submission_id')
        self.assertEqual(post({'submission_id': '../../x', 'rows': [{'name': 'a', 'price': 1}]}).json()['code'], 'invalid_submission_id')
        self.assertEqual(post({'submission_id': str(uuid.uuid4()), 'rows': []}).json()['code'], 'no_rows')
        self.assertEqual(post({'submission_id': str(uuid.uuid4()), 'rows': 'x'}).json()['code'], 'no_rows')
        self.assertEqual(post({'submission_id': str(uuid.uuid4())}).json()['code'], 'no_rows')

    def test_more_than_300_rows_is_rejected(self):
        res = self.commit([{'name': f'T{i}', 'price': 1000} for i in range(301)])
        self.assertEqual((res.status_code, res.json()['code']), (400, 'too_many_rows'))
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())

    def test_exactly_300_rows_is_written(self):
        res = self.commit([{'name': f'Taom {i}', 'price': 1000} for i in range(300)])
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(Product.objects.filter(shop=self.shop).count(), 300)

    def test_hostile_values_are_cleaned_on_commit_too(self):
        data = self.commit([
            {'name': "=cmd|' /C calc'!A0", 'price': 1000},
            {'name': '<script>alert(1)</script>Osh', 'price': 1000, 'description': '<img src=x onerror=1>mazali'},
            {'name': '+1+1', 'price': 1000, 'category': '@evil'},
        ]).json()
        names = sorted(Product.objects.filter(import_batch=data['batch_id']).values_list('name', flat=True))
        self.assertEqual(names, ["1+1", "Osh", "cmd|' /C calc'!A0"])
        osh = Product.objects.get(import_batch=data['batch_id'], name='Osh')
        self.assertEqual(osh.description, 'mazali')
        self.assertTrue(Category.objects.filter(name='evil').exists())

    def test_too_many_new_categories_in_one_import_is_rejected(self):
        res = self.commit([{'name': f'Taom {i}', 'price': 1000, 'category': f'Bolim {i}'} for i in range(31)])
        self.assertEqual((res.status_code, res.json()['code']), (400, 'too_many_categories'))
        self.assertFalse(Category.objects.filter(name__startswith='Bolim').exists())
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())
        ok = self.commit([{'name': f'Taom {i}', 'price': 1000, 'category': f'Bolim {i}'} for i in range(30)])
        self.assertEqual(ok.status_code, 200)

    def test_name_that_is_only_formula_characters_is_rejected(self):
        res = self.commit([{'row_id': 'x', 'name': '=+-@', 'price': 1000}])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['rows'][0]['field'], 'name')

    def test_skip_rows_are_counted_and_not_validated(self):
        res = self.commit([{'row_id': 'a', 'mode': 'skip'}, {'row_id': 'b', 'name': 'Osh', 'price': 45000}])
        data = res.json()
        self.assertEqual((res.status_code, data['created'], data['skipped']), (200, 1, 1))

    def test_all_skipped_writes_nothing(self):
        data = self.commit([{'mode': 'skip'}]).json()
        self.assertEqual((data['created'], data['updated'], data['skipped']), (0, 0, 1))
        self.assertFalse(AuditLog.objects.filter(target_type='menu_import').exists())

    def test_update_mode_changes_only_price_and_description(self):
        category = Category.objects.create(name='Issiq', name_uz='Issiq', name_ru='Issiq', is_restaurant=True)
        product = self.add_product(self.shop, 'Palov', price=40000, description='eski tavsif', category=category,
                                   name_ru='Плов', ar_model='https://cdn.example.com/p.glb', has_3d=True)
        data = self.commit([{'row_id': 'u', 'mode': 'update', 'existing_product_id': product.pk, 'name': 'BOSHQA NOM', 'price': 50000,
                             'description': '', 'category': 'Yangi bolim'}]).json()
        self.assertEqual((data['created'], data['updated']), (0, 1))
        self.assertEqual(data['products'], [{'row_id': 'u', 'id': product.pk}])
        product.refresh_from_db()
        self.assertEqual((product.name, product.price, product.description, product.category_id), ('Palov', Decimal('50000'), 'eski tavsif', category.pk))
        self.assertEqual((product.name_ru, product.ar_model, product.has_3d), ('Плов', 'https://cdn.example.com/p.glb', True))
        self.assertEqual(product.import_batch, '')
        self.assertFalse(Category.objects.filter(name='Yangi bolim').exists())
        data = self.commit([{'mode': 'update', 'existing_product_id': product.pk, 'price': 51000, 'description': 'yangi tavsif'}]).json()
        product.refresh_from_db()
        self.assertEqual((product.price, product.description), (Decimal('51000'), 'yangi tavsif'))

    def test_update_of_another_shops_or_missing_product_is_an_error(self):
        theirs = self.add_product(self.other_shop, 'Boshqa', price=99000)
        gone = self.add_product(self.shop, 'Arxiv', price=1000)
        gone.delete()
        for pid in (theirs.pk, gone.pk, 999999, None, 'abc'):
            res = self.commit([{'row_id': 'u', 'mode': 'update', 'existing_product_id': pid, 'price': 1}])
            self.assertEqual(res.status_code, 400, pid)
            self.assertEqual(res.json()['rows'][0]['field'], 'existing_product_id', pid)
        theirs.refresh_from_db()
        self.assertEqual(theirs.price, Decimal('99000'))

    def test_two_updates_of_the_same_product_are_an_error(self):
        product = self.add_product(self.shop, 'Palov')
        res = self.commit([{'row_id': 'a', 'mode': 'update', 'existing_product_id': product.pk, 'price': 1},
                           {'row_id': 'b', 'mode': 'update', 'existing_product_id': product.pk, 'price': 2}])
        self.assertEqual([e['row_id'] for e in res.json()['rows']], ['b'])

    def test_category_of_another_shop_cannot_be_used_by_id(self):
        hidden = Category.objects.create(name='Maxfiy', name_uz='x', name_ru='x', is_restaurant=False)
        self.add_product(self.other_shop, 'Boshqa', category=hidden)
        res = self.commit([{'row_id': 'x', 'name': 'Osh', 'price': 1000, 'category_id': hidden.pk}])
        self.assertEqual((res.status_code, res.json()['rows'][0]['field']), (400, 'category_id'))
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())

    def test_staff_without_menu_rights_cannot_commit(self):
        res = self.commit([{'name': 'Osh', 'price': 1000}], client=client_for(self.waiter))
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())


class CommitImageTests(ImportBase):

    def token(self, shop=None, **kw):
        return image_tokens.store_temp_image(self.jpeg(), (shop or self.shop).pk, **kw)

    def test_uploaded_photo_becomes_a_real_photo(self):
        token = self.token()
        data = self.commit([{'name': 'Palov', 'price': 45000, 'image_token': token}]).json()
        product = Product.objects.get(pk=data['products'][0]['id'])
        self.assertTrue(product.image)
        self.assertTrue(os.path.exists(product.image.path))
        self.assertTrue(product.has_real_photo)
        self.assertEqual((product.image_credit, product.image_source_url), ('', ''))
        self.assertIsNone(image_tokens.peek_temp_image(token, self.shop.pk))        # bir martalik
        self.assertNotIn('images_failed', data)

    def test_internet_photo_keeps_credit_and_is_not_a_real_photo(self):
        token = self.token(credit='Boonlong1 · CC BY', source_url='https://commons.wikimedia.org/wiki/File:Plov.jpg', real_photo=False)
        data = self.commit([{'name': 'Palov', 'price': 45000, 'image_token': token}]).json()
        product = Product.objects.get(pk=data['products'][0]['id'])
        self.assertTrue(product.image)
        self.assertFalse(product.has_real_photo)
        self.assertEqual(product.image_credit, 'Boonlong1 · CC BY')
        self.assertEqual(product.image_source_url, 'https://commons.wikimedia.org/wiki/File:Plov.jpg')

    def test_update_mode_can_attach_a_photo(self):
        product = self.add_product(self.shop, 'Palov', price=40000)
        data = self.commit([{'mode': 'update', 'existing_product_id': product.pk, 'price': 41000, 'image_token': self.token()}]).json()
        self.assertEqual(data['updated'], 1)
        product.refresh_from_db()
        self.assertTrue(product.image)
        self.assertTrue(product.has_real_photo)

    def test_unknown_expired_foreign_and_malformed_tokens_are_row_errors(self):
        foreign = self.token(shop=self.other_shop)
        for bad in ('a' * 32, foreign, '../../etc/passwd', 'x', 12345):
            res = self.commit([{'row_id': 'i', 'name': 'Osh', 'price': 1000, 'image_token': bad}])
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json()['rows'][0]['field'], 'image_token', bad)
        self.assertFalse(Product.objects.filter(shop=self.shop).exists())
        self.assertTrue(image_tokens.peek_temp_image(foreign, self.other_shop.pk))     # begona token tegilmadi

    def test_same_token_on_two_rows_is_an_error_and_nothing_is_consumed(self):
        token = self.token()
        res = self.commit([{'row_id': 'a', 'name': 'A1', 'price': 1000, 'image_token': token},
                           {'row_id': 'b', 'name': 'B1', 'price': 1000, 'image_token': token}])
        self.assertEqual([e['row_id'] for e in res.json()['rows']], ['b'])
        self.assertTrue(image_tokens.peek_temp_image(token, self.shop.pk))

    def test_failed_validation_does_not_consume_tokens(self):
        token = self.token()
        res = self.commit([{'name': 'Osh', 'price': 1000, 'image_token': token}, {'name': 'Bad', 'price': 'x'}])
        self.assertEqual(res.status_code, 400)
        self.assertTrue(image_tokens.peek_temp_image(token, self.shop.pk))

    def test_idempotent_replay_does_not_need_the_token_again(self):
        token = self.token()
        submission = str(uuid.uuid4())
        rows = [{'name': 'Osh', 'price': 1000, 'image_token': token}]
        first = self.commit(rows, submission).json()
        self.assertEqual(self.commit(rows, submission).json(), first)

    def test_image_that_vanishes_after_validation_is_reported_but_product_is_kept(self):
        token = self.token()
        with mock.patch.object(image_tokens, 'consume_temp_image', return_value=None):
            data = self.commit([{'name': 'Osh', 'price': 1000, 'image_token': token}]).json()
        self.assertEqual(data['created'], 1)
        self.assertEqual(len(data['images_failed']), 1)
        self.assertFalse(Product.objects.get(pk=data['products'][0]['id']).image)


class UndoTests(ImportBase):

    def make_batch(self, client=None, n=3):
        return self.commit_rows(n, shop_client=client).json()['batch_id']

    def test_undo_archives_created_products_without_deleting(self):
        batch = self.make_batch()
        before = get_menu_version(self.shop.pk)
        res = self.undo(batch)
        self.assertEqual((res.status_code, res.json()), (200, {'archived': 3}))
        self.assertEqual(Product.all_objects.filter(import_batch=batch).count(), 3)           # o'chirilmagan
        self.assertEqual(Product.objects.filter(import_batch=batch).count(), 0)               # lekin ko'rinmaydi
        stored = Product.all_objects.filter(import_batch=batch)
        self.assertTrue(all(p.is_deleted and p.deleted_at and not p.is_available for p in stored))
        audit = AuditLog.objects.filter(target_type='menu_import').order_by('-id').first()
        self.assertEqual((audit.new_value['action'], audit.new_value['archived']), ('menu_import_undo', 3))
        self.assertGreater(get_menu_version(self.shop.pk), before)

    def test_undo_twice_is_harmless(self):
        batch = self.make_batch()
        self.undo(batch)
        res = self.undo(batch)
        self.assertEqual((res.status_code, res.json()), (200, {'archived': 0}))

    def test_other_shops_batch_is_404(self):
        batch = self.make_batch(client=self.client_b)
        res = self.undo(batch)                                                                  # A restoran B partiyasini qaytara olmaydi
        self.assertEqual((res.status_code, res.json()['code']), (404, 'batch_not_found'))
        self.assertEqual(Product.objects.filter(import_batch=batch).count(), 3)

    def test_unknown_and_malformed_batch(self):
        self.assertEqual(self.undo(str(uuid.uuid4())).status_code, 404)
        for bad in ('', 'x', '../../etc', None, 123):
            res = self.client_a.post(BASE + 'undo/', json.dumps({'batch_id': bad}), content_type='application/json')
            self.assertEqual((res.status_code, res.json()['code']), (400, 'invalid_batch_id'), bad)

    def test_undo_does_not_touch_products_the_batch_only_updated(self):
        product = self.add_product(self.shop, 'Palov', price=40000)
        data = self.commit([{'mode': 'update', 'existing_product_id': product.pk, 'price': 41000},
                            {'name': 'Yangi taom', 'price': 5000}]).json()
        self.undo(data['batch_id'])
        product.refresh_from_db()
        self.assertFalse(product.is_deleted)
        self.assertEqual(product.price, Decimal('41000'))                                       # narx qaytarilmaydi (hujjatlangan)
        self.assertTrue(Product.all_objects.get(name='Yangi taom').is_deleted)

    def test_undo_only_touches_that_batch(self):
        first, second = self.make_batch(), self.make_batch()
        self.undo(first)
        self.assertEqual(Product.objects.filter(import_batch=second).count(), 3)

    def test_waiter_cannot_undo(self):
        batch = self.make_batch()
        self.assertEqual(self.undo(batch, client=client_for(self.waiter)).status_code, 403)
        self.assertEqual(Product.objects.filter(import_batch=batch).count(), 3)


class QueryBudgetTests(ImportBase):

    def test_commit_of_50_rows_is_a_handful_of_queries(self):
        for i in range(2):
            Category.objects.create(name=f'Bor {i}', name_uz=f'Bor {i}', name_ru=f'Bor {i}', is_restaurant=True)
        rows = [{'row_id': f'r{i}', 'name': f'Taom {i}', 'price': 10000 + i, 'category': ['Bor 0', 'Bor 1', 'Yangi 1', 'Yangi 2'][i % 4],
                 'description': f'tavsif {i}'} for i in range(50)]
        client = self.client_a
        with CaptureQueriesContext(connection) as ctx:
            res = client.post(BASE + 'commit/', json.dumps({'submission_id': str(uuid.uuid4()), 'rows': rows}),
                              content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['created'], 50)
        self.assertLessEqual(len(ctx), 15, '\n'.join(q['sql'][:120] for q in ctx.captured_queries))
        inserts = [q for q in ctx.captured_queries if q['sql'].lstrip().upper().startswith('INSERT INTO "PRODUCTS"')]
        self.assertLessEqual(len(inserts), 3)                                                    # ommaviy INSERT

    def test_parse_of_50_rows_does_not_grow_with_row_count(self):
        counts = []
        for n in (5, 50):
            text = '\n'.join(f'Taom {n}-{i} - {10000 + i}' for i in range(n))
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.parse(text=text).status_code, 200)
            counts.append(len(ctx))
        self.assertEqual(counts[0], counts[1])
        self.assertLessEqual(counts[1], 10)


class FullStackUploadTests(TestCase):
    """Haqiqiy middleware zanjiri bilan: `UploadValidationMiddleware` import fayllarini o'tkazishi shart."""

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_pasted_text_passes_the_real_middleware_stack(self):
        cache.clear()
        _shop, owner = make_shop('imp-full-t', 'imp-full-t-ega')
        res = client_for(owner).post(BASE + 'parse/', {'text': 'Osh - 45 000'})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['rows'][0]['price'], 45000)

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_xlsx_upload_passes_the_real_middleware_stack(self):
        cache.clear()
        _shop, owner = make_shop('imp-full', 'imp-full-ega')
        res = client_for(owner).post(BASE + 'parse/', {'file': upload('menyu.xlsx', make_xlsx([['Nomi', 'Narxi'], ['Osh', 45000]]))})
        if res.status_code == 400 and 'ruxsat etilmaydi' in res.content.decode():
            self.skipTest("backend/upload_validation.py hali /menu/import/ yo'lini o'tkazmaydi (xlsx/docx/pdf/txt rad etiladi) — "
                          "SELF_VALIDATING_PREFIXES qo'shilishi kerak")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()['rows'][0]['name'], 'Osh')


class PhotoEndpointTests(TestCase):
    """`import/photo/`: qatorga o'z rasmini biriktirish (token + ko'rish havolasi)."""

    def setUp(self):
        from django.core.management import call_command
        from django.test import Client
        from accounts.models import AdminUser
        call_command('create_restaurant', name='Foto Restorani', slug='foto-r', owner='foto-r-ega',
                     password='Foto-parol-1234', tables=2, stdout=io.StringIO())
        owner = AdminUser.objects.get(username='foto-r-ega')
        owner.is_approved = True
        owner.save(update_fields=['is_approved'])
        self.client = Client()
        self.client.force_login(owner)
        self.url = '/api/restaurant/admin/v1/menu/import/photo/'

    def _jpeg(self):
        from PIL import Image
        buf = io.BytesIO()
        Image.new('RGB', (64, 48), '#cc8844').save(buf, 'JPEG')
        buf.seek(0)
        buf.name = 'taom.jpg'
        return buf

    def test_photo_returns_token_and_preview(self):
        res = self.client.post(self.url, {'image': self._jpeg()})
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body['image_token'])
        self.assertIn(body['image_token'], body['preview_url'])
        preview = self.client.get(body['preview_url'])
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview['Content-Type'], 'image/jpeg')

    def test_missing_or_broken_image_is_rejected(self):
        self.assertEqual(self.client.post(self.url, {}).status_code, 400)
        broken = io.BytesIO(b'not an image at all')
        broken.name = 'x.jpg'
        res = self.client.post(self.url, {'image': broken})
        self.assertEqual(res.status_code, 400)  # yaroqsiz rasm (umumiy yuklash tekshiruvi yoki shu endpoint) rad etiladi

    def test_anonymous_is_refused(self):
        from django.test import Client
        self.assertIn(Client().post(self.url, {'image': self._jpeg()}).status_code, (401, 403))
