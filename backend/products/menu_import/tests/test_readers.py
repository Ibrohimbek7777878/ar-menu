"""Fayl o'qish: har bir format, kodlashlar, tur aniqlash (sehrli baytlar), hajm va zip-bomba himoyasi."""
import io
import zipfile

from django.test import SimpleTestCase

from products.menu_import import readers
from products.menu_import.errors import EmptyFile, FileTooLarge, InvalidFile, InvalidInput, UnsupportedType
from products.menu_import.tests.fixtures import (
    make_docx,
    make_image,
    make_many_entries_zip,
    make_multipage_pdf,
    make_pdf,
    make_xlsx,
    make_zip_bomb_xlsx,
    upload,
)

MENU = "Salatlar\nOlivye - 20 000\nIchimliklar\nChoy 8k\n"


class TextAndCsvTests(SimpleTestCase):

    def test_txt_utf8(self):
        result = readers.read_upload(upload('menyu.txt', MENU))
        self.assertEqual(result.source, 'text')
        self.assertIn('Olivye', result.text)
        self.assertEqual(result.blocks[0].kind, 'text')

    def test_txt_utf8_bom(self):
        result = readers.read_upload(upload('menyu.txt', b'\xef\xbb\xbf' + MENU.encode()))
        self.assertTrue(result.text.startswith('Salatlar'))

    def test_txt_cp1251(self):
        result = readers.read_upload(upload('menyu.txt', 'Плов - 45 000\nЧай - 8 000'.encode('cp1251')))
        self.assertIn('Плов', result.text)
        self.assertIn('Чай', result.text)

    def test_txt_utf16_with_bom(self):
        result = readers.read_upload(upload('menyu.txt', MENU.encode('utf-16')))
        self.assertIn('Olivye', result.text)

    def test_csv_comma_semicolon_tab_pipe(self):
        for delim in (',', ';', '\t', '|'):
            data = f"Nomi{delim}Narxi\nOsh{delim}45000\nChoy{delim}8000\n"
            result = readers.read_upload(upload('menyu.csv', data))
            self.assertEqual(result.source, 'csv', delim)
            self.assertEqual(result.table_rows, [['Nomi', 'Narxi'], ['Osh', '45000'], ['Choy', '8000']], repr(delim))

    def test_csv_quoted_field_with_delimiter_inside(self):
        result = readers.read_upload(upload('m.csv', 'Nomi,Narxi\n"Osh, katta",45000\nChoy,8000\n'))
        self.assertEqual(result.table_rows[1], ['Osh, katta', '45000'])

    def test_csv_cp1251_semicolon(self):
        result = readers.read_upload(upload('m.csv', 'Название;Цена\nПлов;45000\nЧай;8000\n'.encode('cp1251')))
        self.assertEqual(result.table_rows[1], ['Плов', '45000'])

    def test_csv_single_column_falls_back_to_text(self):
        result = readers.read_upload(upload('m.csv', 'Osh 45000\nChoy 8000\n'))
        self.assertEqual(result.source, 'csv')
        self.assertFalse(result.table_rows)
        self.assertIn('Osh 45000', result.text)

    def test_empty_files(self):
        for name, data in (('a.txt', b''), ('b.txt', b'  \n\n'), ('c.csv', b'\n'), ('d.pdf', b''), ('e.xlsx', b'')):
            with self.assertRaises(EmptyFile, msg=name):
                readers.read_upload(upload(name, data))


class XlsxTests(SimpleTestCase):

    def test_reads_all_sheets_without_empty_rows(self):
        data = make_xlsx({'Salatlar': [['Nomi', 'Narxi'], ['Olivye', 20000], [None, None], ['Achichuk', 15000]],
                          'Ichimliklar': [['Nomi', 'Narxi'], ['Choy', 8000]]})
        result = readers.read_upload(upload('menyu.xlsx', data))
        self.assertEqual(result.source, 'xlsx')
        self.assertEqual(len(result.blocks), 2)
        self.assertEqual(result.blocks[0].title, 'Salatlar')
        self.assertEqual(result.blocks[0].rows, [['Nomi', 'Narxi'], ['Olivye', 20000], ['Achichuk', 15000]])
        self.assertEqual(len(result.table_rows), 5)

    def test_generic_sheet_name_is_not_a_category(self):
        result = readers.read_upload(upload('m.xlsx', make_xlsx({'Sheet1': [['Osh', 45000]], 'Sheet2': [['Choy', 8000]]})))
        self.assertEqual([b.title for b in result.blocks], ['', ''])

    def test_single_sheet_title_is_not_a_category(self):
        result = readers.read_upload(upload('m.xlsx', make_xlsx({'Salatlar': [['Osh', 45000]]})))
        self.assertEqual(result.blocks[0].title, '')

    def test_formulas_come_as_cached_values_or_none(self):
        # openpyxl formulani hisoblamaydi, shuning uchun keshlangan qiymat yo'q: katak bo'sh keladi, formula matni EMAS
        result = readers.read_upload(upload('m.xlsx', make_xlsx([['Osh', '=1+1'], ['Choy', 8000]])))
        flat = [c for row in result.table_rows for c in row]
        self.assertNotIn('=1+1', flat)

    def test_hidden_sheets_are_skipped(self):
        import openpyxl
        workbook = openpyxl.Workbook()
        workbook.active.title = 'Korinadigan'
        workbook.active.append(['Osh', 45000])
        hidden = workbook.create_sheet('Yashirin')
        hidden.append(['Maxfiy', 1])
        hidden.sheet_state = 'hidden'
        buffer = io.BytesIO()
        workbook.save(buffer)
        result = readers.read_upload(upload('m.xlsx', buffer.getvalue()))
        self.assertEqual(result.table_rows, [['Osh', 45000]])

    def test_empty_workbook(self):
        with self.assertRaises(EmptyFile):
            readers.read_upload(upload('m.xlsx', make_xlsx({'Bosh': []})))

    def test_corrupt_xlsx_is_rejected_cleanly(self):
        good = make_xlsx([['Osh', 45000]])
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('m.xlsx', good[:len(good) // 2]))

    def test_password_protected_style_ole_file_is_unsupported(self):
        with self.assertRaises(UnsupportedType):
            readers.read_upload(upload('m.xlsx', readers._OLE_MAGIC + b'\x00' * 600))


class DocxTests(SimpleTestCase):

    def test_paragraphs_and_tables_in_order(self):
        data = make_docx(['Salatlar', 'Olivye - 20 000', [['Nomi', 'Narxi'], ['Choy', '8000']], 'Tugadi'])
        result = readers.read_upload(upload('menyu.docx', data))
        self.assertEqual(result.source, 'docx')
        self.assertEqual([b.kind for b in result.blocks], ['text', 'table', 'text'])
        self.assertIn('Olivye', result.blocks[0].text)
        self.assertEqual(result.blocks[1].rows, [['Nomi', 'Narxi'], ['Choy', '8000']])
        self.assertIn('Tugadi', result.text)

    def test_only_a_table(self):
        result = readers.read_upload(upload('m.docx', make_docx([[['Osh', '45000'], ['Choy', '8000']]])))
        self.assertEqual(result.table_rows, [['Osh', '45000'], ['Choy', '8000']])

    def test_empty_document(self):
        with self.assertRaises(EmptyFile):
            readers.read_upload(upload('m.docx', make_docx([])))

    def test_corrupt_docx(self):
        data = make_docx(['Osh 45000'])
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('m.docx', data[:len(data) // 2]))


class PdfTests(SimpleTestCase):

    def test_text_layer(self):
        data = make_pdf(['Salatlar', 'Olivye - 20 000', 'Choy 8k'])
        result = readers.read_upload(upload('menyu.pdf', data))
        self.assertEqual(result.source, 'pdf')
        self.assertEqual(result.needs, '')
        self.assertIn('Olivye', result.text)
        self.assertIn('20 000', result.text)

    def test_no_text_layer_means_scanned(self):
        result = readers.read_upload(upload('scan.pdf', make_pdf([])))
        self.assertEqual(result.needs, 'scanned_pdf')
        self.assertTrue(result.raw.startswith(b'%PDF'))
        self.assertTrue(result.notes)

    def test_more_than_ten_pages_is_rejected(self):
        with self.assertRaises(InvalidInput) as ctx:
            readers.read_upload(upload('katta.pdf', make_multipage_pdf(11)))
        self.assertEqual(ctx.exception.code, 'too_many_pages')

    def test_ten_pages_is_fine(self):
        self.assertEqual(readers.read_upload(upload('x.pdf', make_multipage_pdf(10))).needs, 'scanned_pdf')

    def test_corrupt_pdf(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('x.pdf', b'%PDF-1.4\n' + b'garbage' * 50))


class ImageTests(SimpleTestCase):

    def test_png_jpeg_webp(self):
        for fmt, name in (('PNG', 'a.png'), ('JPEG', 'a.jpg'), ('WEBP', 'a.webp')):
            result = readers.read_upload(upload(name, make_image(fmt)))
            self.assertEqual((result.source, result.needs), ('image', 'image'), fmt)
            self.assertTrue(result.raw)

    def test_png_named_jpg_is_fine(self):
        self.assertEqual(readers.read_upload(upload('a.jpg', make_image('PNG'))).source, 'image')

    def test_broken_image_header_only(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('a.png', b'\x89PNG\r\n\x1a\n' + b'x' * 40))

    def test_gif_and_bmp_and_heic_are_unsupported(self):
        for name in ('a.gif', 'a.bmp', 'a.heic', 'a.heif'):
            with self.assertRaises(UnsupportedType, msg=name):
                readers.read_upload(upload(name, make_image('PNG')))
        heic = b'\x00\x00\x00\x18ftypheic' + b'\x00' * 40
        with self.assertRaises(UnsupportedType) as ctx:
            readers.read_upload(upload('IMG_1.jpg', heic))
        self.assertIn('HEIC', ctx.exception.message)


class RejectionTests(SimpleTestCase):

    def test_unsupported_extensions_carry_the_advice(self):
        for name in ('menyu.xls', 'menyu.doc', 'notes.sdocx', 'eslatma.memo', 'menyu.pages', 'menyu.numbers', 'menyu.odt', 'a.rtf', 'a.zip'):
            with self.assertRaises(UnsupportedType, msg=name) as ctx:
                readers.read_upload(upload(name, b'dummy content here ' * 5))
            self.assertEqual(ctx.exception.status, 415)
            self.assertEqual(ctx.exception.code, 'unsupported_type')
            message = ctx.exception.message
            self.assertIn('Boshqacha saqlash', message, name)
            self.assertIn('Samsung Notes', message, name)
            self.assertIn('iPhone Eslatmalarda', message, name)

    def test_real_ole2_xls_is_unsupported_whatever_the_name(self):
        for name in ('menyu.xls', 'menyu', 'menyu.txt'):
            with self.assertRaises(UnsupportedType, msg=name):
                readers.read_upload(upload(name, readers._OLE_MAGIC + b'\x00' * 600))

    def test_unknown_binary_is_unsupported(self):
        with self.assertRaises(UnsupportedType):
            readers.read_upload(upload('menyu.dat', b'MZ\x90\x00\x03\x00\x00\x00' + b'\x00' * 200))

    def test_fake_extension_text_named_xlsx(self):
        with self.assertRaises(InvalidFile) as ctx:
            readers.read_upload(upload('menyu.xlsx', "Osh 45000\nChoy 8000"))
        self.assertEqual(ctx.exception.status, 400)

    def test_fake_extension_pdf_content_named_txt(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('menyu.txt', make_pdf(['Osh 45000'])))

    def test_fake_extension_xlsx_content_named_docx_and_vice_versa(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('menyu.docx', make_xlsx([['Osh', 45000]])))
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('menyu.xlsx', make_docx(['Osh 45000'])))

    def test_executable_renamed_to_png(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('menyu.png', b'MZ\x90\x00' + b'\x00' * 300))

    def test_html_named_jpg(self):
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('x.jpg', '<html><script>alert(1)</script></html>'))

    def test_size_limit(self):
        big = upload('menyu.txt', b'a' * (11 * 1024 * 1024))
        with self.assertRaises(FileTooLarge) as ctx:
            readers.read_upload(big)
        self.assertEqual(ctx.exception.status, 413)
        self.assertEqual(ctx.exception.code, 'file_too_large')

    def test_exactly_at_the_limit_is_read(self):
        data = (b'Osh 45000\n' * (readers.MAX_FILE_BYTES // 10))[:readers.MAX_FILE_BYTES]
        self.assertEqual(len(data), readers.MAX_FILE_BYTES)
        self.assertEqual(readers.read_upload(upload('menyu.txt', data)).source, 'text')


class ZipBombTests(SimpleTestCase):

    def test_decompression_bomb_is_rejected_before_parsing(self):
        data = make_zip_bomb_xlsx(60)
        self.assertLess(len(data), 1024 * 1024)               # kichik fayl, ochilganda 60 MB
        with self.assertRaises(InvalidFile) as ctx:
            readers.read_upload(upload('menyu.xlsx', data))
        self.assertEqual(ctx.exception.code, 'zip_bomb')

    def test_high_ratio_entry_under_total_limit_is_rejected(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('xl/workbook.xml', '<workbook/>')
            archive.writestr('xl/media/big.bin', b'\x00' * (30 * 1024 * 1024))
        self.assertLess(len(buffer.getvalue()), 200 * 1024)
        with self.assertRaises(InvalidFile) as ctx:
            readers.read_upload(upload('menyu.xlsx', buffer.getvalue()))
        self.assertEqual(ctx.exception.code, 'zip_bomb')

    def test_oversized_xml_part_is_rejected(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('word/document.xml', 'x' * (readers.MAX_ZIP_XML_PART + 1))
        with self.assertRaises(InvalidFile):
            readers.read_upload(upload('m.docx', buffer.getvalue()))

    def test_too_many_entries(self):
        with self.assertRaises(InvalidFile) as ctx:
            readers.read_upload(upload('menyu.xlsx', make_many_entries_zip(2100)))
        self.assertEqual(ctx.exception.code, 'zip_bomb')

    def test_unknown_zip_is_unsupported(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            archive.writestr('Index/Document.iwa', b'x')
        with self.assertRaises(UnsupportedType):
            readers.read_upload(upload('menyu.pages', buffer.getvalue()))
        with self.assertRaises(UnsupportedType):
            readers.read_upload(upload('menyu', buffer.getvalue()))
