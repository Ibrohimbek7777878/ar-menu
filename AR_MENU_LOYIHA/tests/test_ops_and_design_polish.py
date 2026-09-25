import json
import logging
import pytest
from pathlib import Path
from decimal import Decimal
from django.urls import reverse
from django.template.loader import render_to_string
from django.test import RequestFactory
from django.utils import timezone

from core.logging import JSONLogFormatter
from apps.menu.models import Category, Dish
from apps.orders.models import Order, OrderItem
from apps.analytics.services.injiring import menu_engineering


@pytest.mark.django_db
class TestOpsAndDesignPolish:
    """F-020, F-022, F-023: Ops, JSON logging, template rendering, and fallback tests"""

    def test_json_log_formatter_outputs_valid_json(self):
        """F-020: JSONLogFormatter log yozuvini to'g'ri JSON qilib chiqaradi"""
        formatter = JSONLogFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=10,
            msg='Test log message %s',
            args=('hello',),
            exc_info=None
        )
        record.request_id = 'req-12345'
        formatted = formatter.format(record)

        data = json.loads(formatted)
        assert data['level'] == 'INFO'
        assert data['logger'] == 'test.logger'
        assert data['message'] == 'Test log message hello'
        assert data['request_id'] == 'req-12345'
        assert 'timestamp' in data

    def test_admin_base_and_dashboard_template_render(self, restaurant):
        """F-020: admin_panel/base.html va dashboard.html NoReverseMatch'siz render bo'ladi"""
        rf = RequestFactory()
        req = rf.get('/admin/dashboard/')
        req.restaurant = restaurant
        req.user = None
        req.request_id = 'test-req-id'

        res_base = render_to_string('admin_panel/base.html', {'request': req})
        assert 'ARMENU' in res_base or 'Dashboard' in res_base
        assert len(res_base) > 500

        res_dash = render_to_string('admin_panel/dashboard.html', {'request': req})
        assert 'kpi' in res_dash
        assert len(res_dash) > 1000

    def test_logout_url_reversal(self):
        """F-020: logout URL nomi muammosiz topiladi"""
        url = reverse('logout')
        assert url == '/v1/admin/logout/'

    def test_menu_engineering_algorithm(self, restaurant):
        """F-020: Kasavana & Smith menyu-injiniring algoritmi to'g'ri hisoblaydi"""
        cat = Category.objects.create(restaurant=restaurant, name_uz='Taomlar')
        d1 = Dish.objects.create(category=cat, name_uz='Osh', price=Decimal('45000'))
        d2 = Dish.objects.create(category=cat, name_uz='Somsa', price=Decimal('15000'))

        order = Order.objects.create(restaurant=restaurant, number=1, status='paid', total=Decimal('105000'))
        # d1: 2 ta (yuqori qty, yuqori narx)
        OrderItem.objects.create(order=order, dish=d1, dish_name=d1.name_uz, price=d1.price, qty=2, line_total=Decimal('90000'))
        # d2: 1 ta (past qty, past narx)
        OrderItem.objects.create(order=order, dish=d2, dish_name=d2.name_uz, price=d2.price, qty=1, line_total=Decimal('15000'))

        res = menu_engineering(restaurant.id, days=30)
        assert 'stars' in res
        assert 'horses' in res
        assert 'puzzles' in res
        assert 'dogs' in res
        all_dishes = res['stars'] + res['horses'] + res['puzzles'] + res['dogs']
        assert len(all_dishes) == 2

    def test_dish_placeholder_exists_and_valid(self):
        """F-023: dish-placeholder.svg mavjud va yaroqli SVG"""
        ph_path = Path('static/guest/img/dish-placeholder.svg')
        assert ph_path.exists(), "dish-placeholder.svg mavjud bo'lishi kerak"
        content = ph_path.read_text(encoding='utf-8')
        assert '<svg' in content and '</svg>' in content
        assert 'ARMENU' in content

    def test_restore_script_safety_checks(self):
        """F-020: scripts/restore.sh da dropdb dan oldin tekshiruvlar bor"""
        script_path = Path('scripts/restore.sh')
        assert script_path.exists()
        content = script_path.read_text(encoding='utf-8')
        assert '-f "$BACKUP_FILE"' in content
        assert 'pg_restore --list' in content
        # dropdb tekshiruvdan keyin turishi kerak
        idx_check = content.find('-f "$BACKUP_FILE"')
        idx_dropdb = content.find('dropdb -U')
        assert idx_check < idx_dropdb, "dropdb tekshiruvdan oldin bajarilmasligi shart"

    def test_cache_downtime_resilience(self):
        """Redis ulanmagan yoki to'xtagan bo'lsa ham /m/<slug>/ 500 bermaydi"""
        from unittest.mock import patch
        from django.test import Client
        from apps.tenants.models import Restaurant

        r, _ = Restaurant.objects.get_or_create(slug="test-resilience-slug", defaults={"name": "Resilience Rest", "is_active": True})
        c = Client()
        with patch('django.core.cache.cache.get', side_effect=Exception('Redis connection refused')):
            res = c.get(f'/m/{r.slug}/')
            assert res.status_code == 200

    def test_menu_page_meta_tags_and_scripts(self, client, restaurant):
        """menu.html mobile-web-app-capable meta tag va dish.js, chatbot.js larni o'z ichiga oladi"""
        res = client.get(f'/m/{restaurant.slug}/')
        assert res.status_code == 200
        content = res.content.decode('utf-8')
        assert '<meta name="mobile-web-app-capable" content="yes">' in content
        assert 'guest/js/dish.js' in content
        assert 'guest/js/chatbot.js' in content
        assert 'btnChat' in content

    def test_set_language_endpoint(self, client):
        """POST /v1/lang/ tili o'zgartiradi va cookie o'rnatadi"""
        res = client.post('/v1/lang/', data=json.dumps({'lang': 'ru'}), content_type='application/json')
        assert res.status_code == 200
        data = res.json()
        assert data.get('ok') is True
        assert data.get('lang') == 'ru'
        assert 'armenu_lang' in res.cookies
        assert res.cookies['armenu_lang'].value == 'ru'

        # GET method not allowed
        res_get = client.get('/v1/lang/')
        assert res_get.status_code == 405

