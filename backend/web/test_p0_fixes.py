"""
P0 xatoliklar regressiya testlari (TZ-1, 1-bosqich / 5.1, 5.2, 5.4):
1. 5.1: /seller/reviews/ sharh bo'lsa 500 (admin_review_delete NoReverseMatch tuzatildi, IDOR himoyasi).
2. 5.2: Bugungi tushum va buyurtmalar soni (today_summary konsolidatsiyasi, 3 kunlik izolyatsiya).
3. 5.4: CSV eksportda aniq 1 ta BOM, from/to filtrlari, Buyurtma № ustuni, toza formatlash.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from accounts.models import AdminUser, Customer
from categories.models import Category
from finance.models import FinanceCategory, FinanceTransaction
from finance.services.summary import today_summary
from notifications.models import Review
from orders.models import Order
from orders.timeutils import local_day_start, local_today
from products.models import Product
from shops.models import Shop


@override_settings(
    ROOT_URLCONF='backend.urls_restaurant',
    ALLOWED_HOSTS=['localhost', '127.0.0.1', 'testserver', '.example.com'],
)
class ReviewP0Tests(TestCase):
    """5.1: /seller/reviews/ va admin_review_delete xavfsizlik testlari."""

    def setUp(self):
        self.client = Client()
        self.owner_a = AdminUser.objects.create_user(
            username='owner_a', password='pass-12345-a', role='shop_owner', is_approved=True,
        )
        self.owner_b = AdminUser.objects.create_user(
            username='owner_b', password='pass-12345-b', role='shop_owner', is_approved=True,
        )
        self.shop_a = Shop.objects.create(
            name='Restoran A', slug='restoran-a', owner=self.owner_a, is_open=True,
            latitude=40.49, longitude=68.78,
        )
        self.shop_b = Shop.objects.create(
            name='Restoran B', slug='restoran-b', owner=self.owner_b, is_open=True,
            latitude=41.3, longitude=69.2,
        )
        self.owner_a.shop = self.shop_a
        self.owner_a.save(update_fields=['shop'])
        self.owner_b.shop = self.shop_b
        self.owner_b.save(update_fields=['shop'])

        cat = Category.objects.create(name='Taomlar')
        self.product_a = Product.objects.create(
            shop=self.shop_a, name='Osh A', slug='osh-a', price=Decimal('45000'), category=cat,
        )
        self.product_b = Product.objects.create(
            shop=self.shop_b, name='Shashlik B', slug='shashlik-b', price=Decimal('25000'), category=cat,
        )
        self.customer = Customer.objects.create(name='Ali', phone='+998901112233')
        self.review_a = Review.objects.create(
            product=self.product_a, customer=self.customer, rating=5, comment='Juda mazali!',
        )
        self.review_b = Review.objects.create(
            product=self.product_b, customer=self.customer, rating=4, comment='Yaxshi',
        )

    def test_seller_reviews_page_loads_200_with_reviews(self):
        """Sharhlar mavjud bo'lganda /seller/reviews/ 200 qaytarishi (NoReverseMatch 500 yo'qligi)."""
        self.client.force_login(self.owner_a)
        response = self.client.get('/seller/reviews/', HTTP_HOST='restoran-a.example.com')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Juda mazali!')

    def test_seller_review_delete_requires_post(self):
        """GET so'rov orqali sharh o'chirish taqiqlangan (405)."""
        self.client.force_login(self.owner_a)
        delete_url = reverse('admin_review_delete', args=[self.review_a.pk])
        response = self.client.get(delete_url, HTTP_HOST='restoran-a.example.com')
        self.assertEqual(response.status_code, 405)
        self.assertFalse(Review.objects.filter(pk=self.review_a.pk, is_deleted=True).exists())

    def test_seller_can_delete_own_review_soft_delete(self):
        """O'z do'koni sharhini POST bilan o'chirish (soft-delete)."""
        self.client.force_login(self.owner_a)
        delete_url = reverse('admin_review_delete', args=[self.review_a.pk])
        response = self.client.post(delete_url, HTTP_HOST='restoran-a.example.com')
        self.assertEqual(response.status_code, 302)
        # Soft delete tekshiruvi
        rev = Review.all_objects.get(pk=self.review_a.pk)
        self.assertTrue(rev.is_deleted)
        self.assertFalse(Review.objects.filter(pk=self.review_a.pk).exists())

    def test_seller_cannot_delete_other_shop_review_idor(self):
        """Boshqa do'kon sharhini o'chirishga urinish 403 (IDOR himoyasi)."""
        self.client.force_login(self.owner_a)
        delete_url = reverse('admin_review_delete', args=[self.review_b.pk])
        response = self.client.post(delete_url, HTTP_HOST='restoran-a.example.com')
        self.assertEqual(response.status_code, 403)
        rev = Review.all_objects.get(pk=self.review_b.pk)
        self.assertFalse(rev.is_deleted)


@override_settings(
    ROOT_URLCONF='backend.urls_restaurant',
    ALLOWED_HOSTS=['localhost', '127.0.0.1', 'testserver', '.example.com'],
)
class TodaySummaryP0Tests(TestCase):
    """5.2: Bugungi tushum va buyurtmalar soni (3 kunlik ma'lumotda faqat bugun)."""

    def setUp(self):
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username='sum_owner', password='pass-12345-sum', role='shop_owner', is_approved=True,
        )
        self.shop = Shop.objects.create(
            name='Test Restoran', slug='test-restoran', owner=self.owner, is_open=True,
            latitude=40.49, longitude=68.78,
        )
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])

        today_start = local_day_start()
        yesterday = today_start - timedelta(days=1)
        tomorrow = today_start + timedelta(days=1, hours=2)

        # Kechagi buyurtma
        o_prev = Order.objects.create(
            order_number='YEST-1', shop=self.shop, status='delivered', payment_status='paid',
            total_amount=Decimal('100000'), final_amount=Decimal('100000'),
        )
        Order.objects.filter(pk=o_prev.pk).update(created_at=yesterday)

        # Bugungi faol buyurtmalar (naqd va karta)
        o_today_cash = Order.objects.create(
            order_number='TODAY-1', shop=self.shop, status='delivered', payment_status='paid',
            total_amount=Decimal('50000'), final_amount=Decimal('50000'),
        )
        Order.objects.filter(pk=o_today_cash.pk).update(created_at=today_start + timedelta(hours=2))

        o_today_card = Order.objects.create(
            order_number='TODAY-2', shop=self.shop, status='confirmed', payment_status='paid',
            total_amount=Decimal('70000'), final_amount=Decimal('70000'),
        )
        Order.objects.filter(pk=o_today_card.pk).update(created_at=today_start + timedelta(hours=4))

        # Bugungi bekor qilingan buyurtma (hisobga olinmasligi kerak)
        o_today_canc = Order.objects.create(
            order_number='TODAY-3', shop=self.shop, status='cancelled', payment_status='unpaid',
            total_amount=Decimal('90000'), final_amount=Decimal('90000'),
        )
        Order.objects.filter(pk=o_today_canc.pk).update(created_at=today_start + timedelta(hours=5))

        # Ertangi buyurtma (hisobga olinmasligi kerak)
        o_next = Order.objects.create(
            order_number='TOMO-1', shop=self.shop, status='confirmed', payment_status='paid',
            total_amount=Decimal('200000'), final_amount=Decimal('200000'),
        )
        Order.objects.filter(pk=o_next.pk).update(created_at=tomorrow)

    def test_today_summary_isolates_today_data(self):
        """today_summary faqat bugungi ma'lumotlarni hisoblashi va bekor qilinganlarni chetlab o'tishi."""
        summary = today_summary(self.shop)
        self.assertEqual(summary['today_orders_count'], 2)  # Bugungi faol 2 ta buyurtma
        self.assertEqual(summary['all_orders_count'], 3)    # Bekor qilingan bilan 3 ta
        self.assertEqual(summary['income'], Decimal('120000')) # 50000 + 70000
        self.assertEqual(summary['today_revenue'], 120000.0)
        self.assertEqual(summary['average_check'], Decimal('60000.00')) # 120000 / 2

    @override_settings(ROOT_URLCONF='backend.urls_restaurant')
    def test_restaurant_admin_dashboard_matches_today_summary(self):
        """restaurant_admin_dashboard va today_summary bir xil tushum va buyurtmalar sonini qaytaradi."""
        admin_user = AdminUser.objects.create_user(
            username='sum_super', password='pass-12345-super', role='super_admin', is_approved=True, is_active=True,
        )
        admin_user.shop = self.shop
        admin_user.save()
        self.client.force_login(admin_user)
        response = self.client.get(f'/admin/?shop={self.shop.pk}', HTTP_HOST='test-restoran.example.com')
        self.assertEqual(response.status_code, 200)
        summary = today_summary(self.shop)
        self.assertEqual(response.context['today_orders_count'], summary['today_orders_count'])
        self.assertEqual(response.context['today_revenue'], summary['today_revenue'])

    def test_seller_dashboard_matches_today_summary(self):
        """seller_dashboard va today_summary bir xil tushum va buyurtmalar sonini qaytaradi."""
        self.client.force_login(self.owner)
        response = self.client.get('/seller/', HTTP_HOST='test-restoran.example.com')
        self.assertEqual(response.status_code, 200)
        summary = today_summary(self.shop)
        self.assertEqual(response.context['stats']['today_orders'], summary['today_orders_count'])
        self.assertEqual(response.context['stats']['today_revenue'], summary['income'])


@override_settings(
    ROOT_URLCONF='backend.urls_restaurant',
    ALLOWED_HOSTS=['localhost', '127.0.0.1', 'testserver', '.example.com'],
)
class CsvExportP0Tests(TestCase):
    """5.4: CSV eksport (yagona BOM, from/to filtri, Buyurtma № ustuni)."""

    def setUp(self):
        self.client = Client()
        self.owner = AdminUser.objects.create_user(
            username='csv_owner', password='pass-12345-csv', role='shop_owner', is_approved=True,
        )
        self.shop = Shop.objects.create(
            name='CSV Restoran', slug='csv-restoran', owner=self.owner, is_open=True,
            latitude=40.49, longitude=68.78,
        )
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])

        self.cat = FinanceCategory.objects.create(
            shop=self.shop, name='Taomlar', icon='🍲', category_type='income',
        )
        today = local_today()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)

        order = Order.objects.create(
            order_number='ORD-999', shop=self.shop, total_amount=Decimal('150000'), final_amount=Decimal('150000'),
        )

        # 3 kunlik tranzaksiyalar
        FinanceTransaction.objects.create(
            shop=self.shop, category=self.cat, tx_type='income', stage='income',
            amount=Decimal('150000.00'), payment_method='cash', title='Savdo: Stol #5',
            order=order, tx_date=today,
        )
        FinanceTransaction.objects.create(
            shop=self.shop, category=self.cat, tx_type='expense', stage='expense',
            amount=Decimal('40000.00'), payment_method='cash', title='Bozorlik',
            tx_date=yesterday, created_by=self.owner,
        )
        FinanceTransaction.objects.create(
            shop=self.shop, category=self.cat, tx_type='income', stage='income',
            amount=Decimal('80000.00'), payment_method='card', title='Oldingi kun',
            tx_date=two_days_ago,
        )

    def test_csv_export_has_exact_single_bom(self):
        """CSV eksportida UTF-8 BOM faqat bir marta (fayl boshida) mavjud bo'lishi shart."""
        self.client.force_login(self.owner)
        response = self.client.get('/seller/finance/export/excel/', HTTP_HOST='csv-restoran.example.com')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response['Content-Type'].startswith('text/csv'))
        # Aniq 1 ta BOM (0xEF 0xBB 0xBF)
        content = response.content
        self.assertTrue(content.startswith(b'\xef\xbb\xbf'))
        self.assertEqual(content.count(b'\xef\xbb\xbf'), 1)

    def test_csv_export_content_structure_and_order_number(self):
        """CSV da Buyurtma № ustuni, Tizim kiritgan xodim, va emojiz kategoriya nomi."""
        self.client.force_login(self.owner)
        response = self.client.get('/seller/finance/export/excel/', HTTP_HOST='csv-restoran.example.com')
        decoded = response.content.decode('utf-8-sig')
        lines = [line.strip() for line in decoded.strip().split('\r\n') if line.strip()]
        self.assertGreaterEqual(len(lines), 4)

        header = lines[0]
        self.assertIn('Buyurtma №', header)

        # Birinchi qator avtomatik order tranzaksiyasi: ORD-999, Tizim, 150000.00
        order_row = lines[1]
        self.assertIn('ORD-999', order_row)
        self.assertIn('Tizim', order_row)
        self.assertIn('150000.00', order_row)
        self.assertIn('Taomlar', order_row)
        self.assertNotIn('🍲', order_row)  # Kategoriya nomida emoji bo'lmasligi

    def test_csv_export_from_to_filters(self):
        """from va to parametrlari orqali sana oralig'ini filtrlash."""
        self.client.force_login(self.owner)
        today_str = local_today().strftime('%Y-%m-%d')
        # Faqat bugungi kunni olish
        response = self.client.get(
            f'/seller/finance/export/excel/?from={today_str}&to={today_str}',
            HTTP_HOST='csv-restoran.example.com',
        )
        decoded = response.content.decode('utf-8-sig')
        lines = [line.strip() for line in decoded.strip().split('\r\n') if line.strip()]
        # Header + 1 ta bugungi tranzaksiya = 2 qator
        self.assertEqual(len(lines), 2)
        self.assertIn('ORD-999', lines[1])

import os

import os
import stat
import subprocess
import tempfile
from pathlib import Path
from django.conf import settings

import re


def _yaml_block(lines, key, indent):
    """
    PyYAML'siz (CI faqat requirements.txt ni o'rnatadi, PyYAML production rasmiga kerak emas) docker-compose.yml'dan
    `indent` bo'shliqli `key:` qatorining ichki (chuqurroq) qatorlarini qaytaradi. Topilmasa — None.
    Faqat shu faylning oddiy tuzilmasi uchun mo'ljallangan (ankor/birlashtirish `<<:` ni yechmaydi — kerak ham emas).
    """
    head = re.compile(r'^ {%d}%s:\s*(#.*)?$' % (indent, re.escape(key)))
    for i, line in enumerate(lines):
        if not head.match(line):
            continue
        body = []
        for nxt in lines[i + 1:]:
            stripped = nxt.strip()
            if stripped and not stripped.startswith('#') and (len(nxt) - len(nxt.lstrip(' '))) <= indent:
                break
            body.append(nxt)
        return body
    return None


def _compose_service(text, service):
    services = _yaml_block(text.splitlines(), 'services', 0)
    return None if services is None else _yaml_block(services, service, 2)


class DockerStartupRaceTests(TestCase):
    """A7/B3: Sovuq ishga tushishda ikki konteyner bir vaqtda migrate qilmasligini amaliy sinash."""

    def setUp(self):
        super().setUp()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.bin_dir = Path(self.temp_dir.name) / 'bin'
        self.bin_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = Path(self.temp_dir.name) / 'invocations.log'

        # Soxta python
        fake_python = self.bin_dir / 'python'
        script_py = "#!/bin/sh\necho \"python $@\" >> \"" + str(self.log_file) + "\"\nexit 0\n"
        fake_python.write_text(script_py, encoding='utf-8')
        fake_python.chmod(fake_python.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

        # Soxta gunicorn
        fake_gunicorn = self.bin_dir / 'gunicorn'
        script_gu = "#!/bin/sh\necho \"gunicorn $@\" >> \"" + str(self.log_file) + "\"\nexit 0\n"
        fake_gunicorn.write_text(script_gu, encoding='utf-8')
        fake_gunicorn.chmod(fake_gunicorn.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

        self.entrypoint_path = Path(settings.BASE_DIR) / 'docker' / 'entrypoint.sh'

    def tearDown(self):
        self.temp_dir.cleanup()
        super().tearDown()

    def _run_entrypoint(self, env_overrides=None):
        env = os.environ.copy()
        env['PATH'] = f"{self.bin_dir}:{env.get('PATH', '')}"
        if env_overrides:
            env.update(env_overrides)
        result = subprocess.run(
            ['/bin/sh', str(self.entrypoint_path), 'web'],
            env=env,
            capture_output=True,
            text=True,
            timeout=5
        )
        return result

    def test_entrypoint_with_skip_migrate_does_not_call_migrate_or_collectstatic(self):
        """SKIP_MIGRATE=1 bo'lganda migrate va collectstatic chaqirilmasligi, gunicorn chaqirilishi shart."""
        result = self._run_entrypoint({'SKIP_MIGRATE': '1'})
        self.assertEqual(result.returncode, 0, f"entrypoint xato bilan tugadi: {result.stderr}")
        log_content = self.log_file.read_text(encoding='utf-8') if self.log_file.exists() else ''

        self.assertNotIn('migrate', log_content, "SKIP_MIGRATE=1 bo'lganda migrate chaqirilmasligi kerak")
        self.assertNotIn('collectstatic', log_content, "SKIP_MIGRATE=1 bo'lganda collectstatic chaqirilmasligi kerak")
        self.assertIn('gunicorn', log_content, "gunicorn ishga tushirilishi kerak")

    def test_entrypoint_without_skip_migrate_calls_migrate_and_collectstatic(self):
        """SKIP_MIGRATE bo'lmaganda migrate va collectstatic chaqirilishi shart."""
        result = self._run_entrypoint({'SKIP_MIGRATE': '0'})
        self.assertEqual(result.returncode, 0, f"entrypoint xato bilan tugadi: {result.stderr}")
        log_content = self.log_file.read_text(encoding='utf-8') if self.log_file.exists() else ''

        self.assertIn('migrate', log_content, "SKIP_MIGRATE bo'lmaganda migrate chaqirilishi kerak")
        self.assertIn('collectstatic', log_content, "SKIP_MIGRATE bo'lmaganda collectstatic chaqirilishi kerak")
        self.assertIn('gunicorn', log_content, "gunicorn ishga tushirilishi kerak")

    def test_docker_compose_web_staff_yaml_config(self):
        """web-staff: migrate'ni `web` ga qoldiradi (SKIP_MIGRATE=1) va `web` sog'lom bo'lgach ishga tushadi."""
        compose_path = Path(settings.BASE_DIR).parent / 'deploy' / 'docker-compose.yml'
        text = compose_path.read_text(encoding='utf-8')
        web_staff = _compose_service(text, 'web-staff')
        self.assertIsNotNone(web_staff, "deploy/docker-compose.yml da web-staff xizmati topilmadi")

        env = _yaml_block(web_staff, 'environment', 4)
        self.assertIsNotNone(env, "web-staff da environment bloki yo'q")
        self.assertTrue(
            any(re.match(r'^\s+SKIP_MIGRATE:\s*["\']?1["\']?\s*(#.*)?$', ln) for ln in env),
            "web-staff da SKIP_MIGRATE: \"1\" bo'lishi shart (ikki konteyner bir vaqtda migrate qilmasin)",
        )

        depends = _yaml_block(web_staff, 'depends_on', 4)
        self.assertIsNotNone(depends, "web-staff da depends_on bloki yo'q")
        web_dep = _yaml_block(depends, 'web', 6)
        self.assertIsNotNone(web_dep, "web-staff `web` xizmatiga bog'lanmagan")
        self.assertTrue(
            any(re.match(r'^\s+condition:\s*service_healthy\s*(#.*)?$', ln) for ln in web_dep),
            "web-staff `web` ning service_healthy holatini kutishi shart",
        )

    def test_compose_parser_is_not_vacuous(self):
        """Yuqoridagi tekshiruv "doim yashil" bo'lib qolmasin: buzilgan compose matnini haqiqatan rad etadi."""
        compose_path = Path(settings.BASE_DIR).parent / 'deploy' / 'docker-compose.yml'
        text = compose_path.read_text(encoding='utf-8')
        broken = text.replace('SKIP_MIGRATE: "1"', 'SKIP_MIGRATE: "0"')
        env = _yaml_block(_compose_service(broken, 'web-staff'), 'environment', 4)
        self.assertFalse(any(re.search(r'SKIP_MIGRATE:\s*["\']?1', ln) for ln in env))
        # Mavjud bo'lmagan xizmat None qaytaradi (ichki xizmat nomi bilan adashmaydi)
        self.assertIsNone(_compose_service(text, 'web-staff-yoq'))
        # `web` xizmati `web-staff` bilan aralashib ketmaydi
        web = _compose_service(text, 'web')
        self.assertIsNotNone(web)
        self.assertFalse(any('web-staff' in ln and ln.strip().endswith(':') for ln in web))
