"""Menyu matni/jadvali parseri (sof Python): Samsung/iPhone eslatmalari, narx formatlari, bo'limlar, jadval, apostroflar."""
import time
from decimal import Decimal

from django.test import SimpleTestCase

from products.menu_import.text_parser import (
    default_category_from_sheet,
    normalize_name,
    parse_price,
    parse_table,
    parse_table_detailed,
    parse_text,
    parse_text_detailed,
)


def names(rows):
    return [r['name'] for r in rows]


def by_name(rows):
    return {r['name']: r for r in rows}


class PriceFormatTests(SimpleTestCase):

    def test_all_price_formats(self):
        cases = {
            '45000': 45000, '45 000': 45000, '45 000': 45000, '45 000': 45000, '45 000': 45000,
            '45.000': 45000, '45,000': 45000, '1 000 000': 1_000_000, '45k': 45000, '45K': 45000, '45К': 45000, '45к': 45000,
            '45 ming': 45000, '45 тыс': 45000, '45 тыс.': 45000, '1.5k': 1500, '12,5k': 12500, '45000 so\'m': 45000,
            '45000 sum': 45000, '45000 сум': 45000, '45000 UZS': 45000, '45000s': 45000, '45 000 so‘m': 45000, '45k so\'m': 45000,
            '2 mln': 2_000_000,
        }
        for text, expected in cases.items():
            self.assertEqual(parse_price(text), expected, text)

    def test_numbers_from_excel(self):
        self.assertEqual(parse_price(45000), 45000)
        self.assertEqual(parse_price(45000.0), 45000)
        self.assertEqual(parse_price(Decimal('45000')), 45000)
        self.assertEqual(parse_price(45000.4), 45000)

    def test_not_a_price(self):
        for value in (None, '', 'abc', 'Narx kelishiladi', True, 0, '0', -5, float('nan'), '9' * 40, '12,5'):
            self.assertIsNone(parse_price(value), repr(value))

    def test_price_formats_in_a_line(self):
        text = '\n'.join([
            'Palov 45000', 'Osh 45 000', 'Lag\'mon 40.000', 'Somsa 12,000', 'Choy 8k', 'Cola 12К', 'Manti 35 ming', 'Non 3 тыс',
            'Salat 20000 so\'m', 'Sho\'rva 30000 sum', 'Pitsa 60000 сум', 'Kebab 50000 UZS', 'Lavash 25000s',
        ])
        prices = [r['price'] for r in parse_text(text)]
        self.assertEqual(prices, [45000, 45000, 40000, 12000, 8000, 12000, 35000, 3000, 20000, 30000, 60000, 50000, 25000])

    def test_separators_between_name_and_price(self):
        text = 'Osh - 45 000\nOsh — 45 000\nOsh – 45 000\nOsh: 45 000\nOsh ..... 45 000\nOsh\t45 000\nOsh    45 000\nOsh_45000'
        for row in parse_text(text):
            self.assertEqual((row['name'], row['price']), ('Osh', 45000), row)

    def test_nbsp_inside_a_line_and_zero_width(self):
        rows = parse_text('Pa​lov 45 000 so\'m')
        self.assertEqual((rows[0]['name'], rows[0]['price']), ('Palov', 45000))

    def test_unit_number_is_not_the_price(self):
        row = parse_text('Osh 300 gr - 45 000')[0]
        self.assertEqual(row['price'], 45000)
        self.assertIn('300', row['name'])
        row = parse_text('Cola 0.5 L 12 000')[0]
        self.assertEqual(row['price'], 12000)

    def test_price_followed_by_parentheses_goes_to_description(self):
        row = parse_text('Osh - 45 000 (300 gr)')[0]
        self.assertEqual((row['name'], row['price'], row['description']), ('Osh', 45000, '300 gr'))

    def test_price_in_the_middle_with_currency(self):
        row = parse_text("Palov 45 000 so'm - guruch, go'sht")[0]
        self.assertEqual((row['name'], row['price']), ('Palov', 45000))
        self.assertIn('guruch', row['description'])

    def test_huge_numbers_do_not_crash(self):
        rows = parse_text('Osh ' + '9' * 40 + '\nOsh 99999999999999999999999 so\'m')
        self.assertTrue(all(r['price'] is None for r in rows))


class LineStructureTests(SimpleTestCase):

    def test_samsung_style_list_with_sections(self):
        text = """Milliy taomlar
Osh - 45 000
Lag'mon 40000 so'm
Manti: 35k

ICHIMLIKLAR
• Choy 8k
- Coca-Cola 0.5L - 12 000
✅ Shoʻrva — guruch, go'sht — 38.000
"""
        rows = parse_text(text)
        got = by_name(rows)
        self.assertEqual(len(rows), 6)
        self.assertEqual(got['Osh']['category'], 'Milliy taomlar')
        self.assertEqual(got["Lag'mon"]['price'], 40000)
        self.assertEqual(got['Manti']['category'], 'Milliy taomlar')
        self.assertEqual(got['Choy']['category'], 'Ichimliklar')                 # KATTA HARF -> odatiy yozuv
        self.assertEqual(got['Coca-Cola 0.5L']['price'], 12000)
        self.assertEqual(got['Shoʻrva']['description'], "guruch, go'sht")    # apostrof turi saqlangan

    def test_numbered_markers_are_removed(self):
        rows = parse_text('1. Osh 45000\n2) Manti 35000\n(3) Choy 8000\n4- Non 3000\n5. 7 up 8000')
        self.assertEqual(names(rows), ['Osh', 'Manti', 'Choy', 'Non', '7 up'])

    def test_bullets_and_emoji_are_removed(self):
        rows = parse_text('• Osh 45000\n* Manti 35000\n- Choy 8000\n\U0001F372 Sho\'rva 30000 \U0001F525\n✅ Non 3000\n▪ Salat 12000')
        self.assertEqual(names(rows), ['Osh', 'Manti', 'Choy', "Sho'rva", 'Non', 'Salat'])

    def test_section_headers_by_colon_caps_decor_and_lookahead(self):
        text = 'Salatlar:\nOlivye 20000\nDESSERTLAR\nPaxlava 12000\n=== Ichimliklar ===\nChoy 8000\n## Non\nTandir non 3000\nIssiq\nOsh 45000'
        got = by_name(parse_text(text))
        self.assertEqual(got['Olivye']['category'], 'Salatlar')
        self.assertEqual(got['Paxlava']['category'], 'Dessertlar')
        self.assertEqual(got['Choy']['category'], 'Ichimliklar')
        self.assertEqual(got['Tandir non']['category'], 'Non')
        self.assertEqual(got['Osh']['category'], 'Issiq')

    def test_sections_are_not_counted_as_skipped(self):
        outcome = parse_text_detailed('Salatlar\nOlivye 20000\nIchimliklar\nChoy 8000')
        self.assertEqual((len(outcome.rows), outcome.skipped, outcome.headers, outcome.lines), (2, 0, 2, 4))

    def test_priceless_list_is_dishes_with_no_price(self):
        rows = parse_text("Palov\nLag'mon\nManti")
        self.assertEqual(names(rows), ['Palov', "Lag'mon", 'Manti'])
        self.assertTrue(all(r['price'] is None for r in rows))

    def test_name_and_price_on_separate_lines(self):
        rows = parse_text("Palov\n45 000\nLag'mon\n40 000")
        self.assertEqual([(r['name'], r['price']) for r in rows], [('Palov', 45000), ("Lag'mon", 40000)])

    def test_description_between_name_and_price(self):
        row = parse_text("Palov - guruch, go'sht - 45 000")[0]
        self.assertEqual((row['name'], row['price'], row['description']), ('Palov', 45000, "guruch, go'sht"))
        row = parse_text("Palov (guruch, go'sht, sabzi) 45 000")[0]
        self.assertEqual((row['name'], row['description']), ('Palov', "guruch, go'sht, sabzi"))

    def test_size_in_parentheses_stays_in_name(self):
        self.assertEqual(parse_text('Pepsi (0.5L) - 8000')[0]['name'], 'Pepsi (0.5L)')

    def test_description_on_the_next_line(self):
        rows = parse_text("Palov 45000\nguruch, sabzi, go'sht\nLag'mon 40000")
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['description'], "guruch, sabzi, go'sht")

    def test_tab_separated_columns(self):
        row = parse_text("Osh\tguruch go'sht\t45 000")[0]
        self.assertEqual((row['name'], row['price'], row['description']), ('Osh', 45000, "guruch go'sht"))

    def test_several_dishes_on_one_line(self):
        rows = parse_text("Osh 45k, Choy 8k\nOsh - 45 000, Choy - 8 000; Non - 3 000")
        self.assertEqual([(r['name'], r['price']) for r in rows],
                         [('Osh', 45000), ('Choy', 8000), ('Osh', 45000), ('Choy', 8000), ('Non', 3000)])

    def test_one_line_is_not_split_when_a_chunk_has_no_price(self):
        rows = parse_text("Palov - guruch, go'sht, sabzi - 45 000")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['price'], 45000)

    def test_junk_lines_are_skipped_and_counted(self):
        text = "Tel: +998 90 123 45 67\nManzil: Guliston sh.\n09:00-23:00\nwww.site.uz\n@insta_user\nOsh 45000\n----\n"
        outcome = parse_text_detailed(text)
        self.assertEqual(names(outcome.rows), ['Osh'])
        self.assertEqual(outcome.skipped, 5)

    def test_apostrophes_are_kept_but_compared_loosely(self):
        for variant in ("Lag'mon", 'Lagʻmon', 'Lagʼmon', 'Lag’mon', 'Lag`mon'):
            self.assertEqual(parse_text(f'{variant} 40000')[0]['name'], variant)
            self.assertEqual(normalize_name(variant), normalize_name("Lag'mon"))
        self.assertEqual(normalize_name("  SHO'RVA!! "), normalize_name('Shorva'))

    def test_all_caps_dish_names_become_regular(self):
        self.assertEqual(parse_text('PALOV 45000\nCHOY 8000')[0]['name'], 'Palov')

    def test_cyrillic_menu(self):
        rows = parse_text('Салаты\nОливье - 20 000 сум\nЦезарь 25к\nНАПИТКИ\nЧай 8 тыс')
        self.assertEqual([(r['name'], r['price'], r['category']) for r in rows],
                         [('Оливье', 20000, 'Салаты'), ('Цезарь', 25000, 'Салаты'), ('Чай', 8000, 'Напитки')])

    def test_crlf_and_old_mac_line_endings(self):
        self.assertEqual(len(parse_text('Osh 45000\r\nChoy 8000\rNon 3000')), 3)

    def test_empty_and_garbage(self):
        self.assertEqual(parse_text(''), [])
        self.assertEqual(parse_text('   \n\n  '), [])
        self.assertEqual(parse_text('-----\n=====\n*****'), [])
        self.assertEqual(parse_text(None), [])

    def test_price_zero_and_small(self):
        rows = parse_text('Osh 45\nNon 0')
        self.assertEqual(rows[0]['price'], 45)             # servis `price_small` deydi
        self.assertIsNone(rows[1]['price'])

    def test_default_category_is_used_until_a_section_appears(self):
        rows = parse_text('Osh 45000\nIchimliklar:\nChoy 8000', default_category='Asosiy')
        self.assertEqual([r['category'] for r in rows], ['Asosiy', 'Ichimliklar'])

    def test_parser_is_fast_on_hostile_input(self):
        hostile = ['1 ' * 200, '9' * 400, '1,' * 200, 'a' + ' 000' * 100, '(' * 200, 'Osh, 45 000, ' * 40, ' ' * 100000 + 'x']
        started = time.monotonic()
        for text in hostile:
            parse_text(text)
        parse_text('\n'.join(f'Taom {i} - {i * 1000 + 1000}' for i in range(6000)))
        self.assertLess(time.monotonic() - started, 5)


class TableTests(SimpleTestCase):

    def test_header_row_is_found_after_a_title_row(self):
        rows = parse_table([
            ['MENYU 2025', None, None, None],
            ['Taom nomi', "Narxi (so'm)", 'Kategoriya', 'Tavsif'],
            ['Osh', 45000, 'Milliy', 'guruch'],
            ["Lag'mon", 40000.0, 'Milliy', ''],
            ['Choy', '8 000', 'Ichimlik', None],
        ])
        self.assertEqual([(r['name'], r['price'], r['category'], r['description']) for r in rows],
                         [('Osh', 45000, 'Milliy', 'guruch'), ("Lag'mon", 40000, 'Milliy', ''), ('Choy', 8000, 'Ichimlik', '')])

    def test_russian_and_english_headers(self):
        rows = parse_table([['№', 'Название', 'Цена'], [1, 'Плов', 45000], [2, 'Чай', '8к']])
        self.assertEqual([(r['name'], r['price']) for r in rows], [('Плов', 45000), ('Чай', 8000)])
        rows = parse_table([['Dish', 'Price', 'Category', 'Description'], ['Plov', 45000, 'Main', 'rice']])
        self.assertEqual((rows[0]['name'], rows[0]['category'], rows[0]['description']), ('Plov', 'Main', 'rice'))

    def test_columns_in_any_order(self):
        rows = parse_table([['Narx', 'Bo\'lim', 'Nomi'], [45000, 'Issiq', 'Osh']])
        self.assertEqual((rows[0]['name'], rows[0]['price'], rows[0]['category']), ('Osh', 45000, 'Issiq'))

    def test_headerless_two_columns(self):
        rows = parse_table([['Osh', 45000], ["Lag'mon", 40000], ['Choy', 8000]])
        self.assertEqual([(r['name'], r['price']) for r in rows], [('Osh', 45000), ("Lag'mon", 40000), ('Choy', 8000)])

    def test_headerless_category_column_is_guessed(self):
        rows = parse_table([['Milliy', 'Osh', 45000], ['Milliy', 'Lagmon', 40000], ['Milliy', 'Manti', 35000],
                            ['Ichimlik', 'Choy', 8000], ['Ichimlik', 'Cola', 12000]])
        self.assertEqual([(r['name'], r['category']) for r in rows],
                         [('Osh', 'Milliy'), ('Lagmon', 'Milliy'), ('Manti', 'Milliy'), ('Choy', 'Ichimlik'), ('Cola', 'Ichimlik')])

    def test_headerless_description_column_is_guessed(self):
        rows = parse_table([['Osh', "guruch, go'sht, sabzi", 45000], ['Lagmon', "qo'lda cho'zilgan", 40000],
                            ['Manti', "go'shtli", 35000]])
        self.assertEqual(rows[0]['description'], "guruch, go'sht, sabzi")

    def test_numbering_column_is_not_taken_for_price(self):
        rows = parse_table([[1, 'Osh', 45000], [2, 'Lagmon', 40000], [3, 'Manti', 35000]])
        self.assertEqual([r['price'] for r in rows], [45000, 40000, 35000])

    def test_section_rows_in_a_table(self):
        rows = parse_table([['Taom', 'Narx'], ['SALATLAR', None], ['Olivye', 20000], ['Ichimliklar', None], ['Choy', 8000]])
        self.assertEqual([(r['name'], r['category']) for r in rows], [('Olivye', 'Salatlar'), ('Choy', 'Ichimliklar')])

    def test_price_inside_the_name_cell(self):
        rows = parse_table([['Osh 45000'], ['Lagmon - 40 000'], ['Manti 35k']])
        self.assertEqual([(r['name'], r['price']) for r in rows], [('Osh', 45000), ('Lagmon', 40000), ('Manti', 35000)])

    def test_name_only_column(self):
        rows = parse_table([['Osh'], ['Lagmon']])
        self.assertEqual([(r['name'], r['price']) for r in rows], [('Osh', None), ('Lagmon', None)])

    def test_unparsable_price_cell_becomes_none(self):
        rows = parse_table([['Nomi', 'Narxi'], ['Osh', 'kelishiladi'], ['Choy', 8000]])
        self.assertEqual([r['price'] for r in rows], [None, 8000])

    def test_default_category_from_sheet_name(self):
        rows = parse_table([['Osh', 45000]], default_category='Milliy')
        self.assertEqual(rows[0]['category'], 'Milliy')
        self.assertEqual(default_category_from_sheet('Salatlar', 3), 'Salatlar')
        self.assertEqual(default_category_from_sheet('Sheet1', 3), '')
        self.assertEqual(default_category_from_sheet('Лист2', 3), '')
        self.assertEqual(default_category_from_sheet('Salatlar', 1), '')

    def test_empty_table(self):
        self.assertEqual(parse_table([]), [])
        self.assertEqual(parse_table([[None, ''], ['', None]]), [])
        self.assertEqual(parse_table_detailed([]).lines, 0)

    def test_repeated_header_rows_are_dropped(self):
        rows = parse_table([['Nomi', 'Narxi'], ['Osh', 45000], ['Nomi', 'Narxi'], ['Choy', 8000]])
        self.assertEqual(names(rows), ['Osh', 'Choy'])
