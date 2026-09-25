"""
tests/test_etap9_ui_design.py — ETAP 9 (F-030 ... F-036) UI va Dizayn Tizimi testlari.
"""
import os
import json
import pytest
from django.template.loader import render_to_string
from django.test import RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, Staff
from apps.tenants.models import Restaurant
from apps.orders.models import Order
from apps.menu.models import Category, Dish


@pytest.mark.django_db
class TestEtap9DesignSystem:

    def test_f030_theme_components_exist(self):
        """F-030: theme.css da barcha UI komponentlar deklaratsiyasi bor."""
        theme_path = os.path.join('static', 'guest', 'css', 'theme.css')
        assert os.path.exists(theme_path)
        with open(theme_path, 'r', encoding='utf-8') as f:
            content = f.read()

        assert '.stepper' in content
        assert '.progress-steps' in content
        assert '.empty-state' in content
        assert '.rating' in content
        assert '.dish-ph' in content
        assert '.checkmark' in content
        assert '.flying-badge' in content

    def test_f031_menu_flying_and_empty_state(self):
        """F-031: Menyu sahifasida uchish animatsiyasi va bo'sh qidiruv mavjud."""
        dish_js = os.path.join('static', 'guest', 'js', 'dish.js')
        menu_js = os.path.join('static', 'guest', 'js', 'menu.js')
        assert os.path.exists(dish_js)
        assert os.path.exists(menu_js)

        with open(dish_js, 'r', encoding='utf-8') as f:
            dish_content = f.read()
        assert 'animateFlyToCart' in dish_content

        with open(menu_js, 'r', encoding='utf-8') as f:
            menu_content = f.read()
        assert 'empty-state' in menu_content
        assert 'quickAdd' in menu_content

    def test_f032_kds_typography_and_ws_status(self):
        """F-032: KDS 56px stol raqami, pulse-red va WS online/offline indikatori."""
        board_css = os.path.join('static', 'kds', 'css', 'board.css')
        board_html = os.path.join('templates', 'kds', 'board.html')
        board_js = os.path.join('static', 'kds', 'js', 'board.js')

        with open(board_css, 'r', encoding='utf-8') as f:
            css_content = f.read()
        assert 'font-size: 56px' in css_content or '--kds-fs-tbl: 56px' in css_content
        assert 'pulse-red' in css_content
        assert '.kds-status-dot' in css_content

        with open(board_html, 'r', encoding='utf-8') as f:
            html_content = f.read()
        assert 'ws-dot' in html_content
        assert 'ws-status-text' in html_content

        with open(board_js, 'r', encoding='utf-8') as f:
            js_content = f.read()
        assert 'ws-dot' in js_content
        assert 'Online' in js_content
        assert 'Offline (Polling)' in js_content

    def test_f033_waiter_status_borders_and_toast(self):
        """F-033: Ofitsiant sahifasida status chap chegarasi va chaqiruv toasti/880Hz audio."""
        orders_css = os.path.join('static', 'staff', 'css', 'orders.css')
        orders_js = os.path.join('static', 'staff', 'js', 'orders.js')

        with open(orders_css, 'r', encoding='utf-8') as f:
            css_content = f.read()
        assert 'data-status="new"' in css_content
        assert 'data-status="ready"' in css_content
        assert 'staff-call-toast' in css_content
        assert 'min-height: 44px' in css_content

        with open(orders_js, 'r', encoding='utf-8') as f:
            js_content = f.read()
        assert 'data-status="${o.status}"' in js_content
        assert '880' in js_content
        assert 'staff-call-toast' in js_content

    def test_f034_admin_dashboard_client_and_api(self):
        """F-034: Admin dashboard client JS va /v1/analytics/dashboard/ API shartnomasi."""
        dash_js = os.path.join('static', 'admin', 'js', 'dashboard.js')
        assert os.path.exists(dash_js)

        with open(dash_js, 'r', encoding='utf-8') as f:
            js_content = f.read()
        assert 'k-rev' in js_content
        assert 'k-ord' in js_content
        assert 'k-avg' in js_content
        assert 'k-tbl' in js_content
        assert 'k-ar' in js_content
        assert 'drawHourlyChart' in js_content
        assert 'renderTopDishes' in js_content
        assert 'renderAttention' in js_content

        # API shartnomasi
        from apps.accounts.tokens import make_access
        r = Restaurant.objects.create(name="Dashboard Test Rest", slug="dash-rest", is_active=True)
        user = User.objects.create_user(phone="+998901112233")
        staff = Staff.objects.create(user=user, restaurant=r, role="admin", is_active=True, full_name="Admin")
        token = make_access(staff)

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = client.get('/v1/analytics/dashboard/')
        assert resp.status_code == 200
        assert resp.status_code == 200
        data = resp.json()
        assert 'kpis' in data
        assert 'hourly' in data
        assert 'top_dishes' in data
        assert 'attention' in data
        assert 'revenue' in data['kpis']
        assert 'orders' in data['kpis']
        assert 'avg_check' in data['kpis']
        assert 'tables' in data['kpis']
        assert 'ar_views' in data['kpis']

    def test_f035_order_status_5_steps_and_checkmark(self):
        """F-035: Buyurtma holati 5 bosqich va checkmark animatsiyasi."""
        ws_js = os.path.join('static', 'guest', 'js', 'ws.js')
        assert os.path.exists(ws_js)
        with open(ws_js, 'r', encoding='utf-8') as f:
            ws_content = f.read()

        assert "const STEPS = ['new', 'accepted', 'cooking', 'ready', 'served'];" in ws_content
        assert "checkmark" in ws_content

        # 3 ta tilda 5 ta bosqich tarjimasi
        for lang in ['uz', 'ru', 'en']:
            i18n_path = os.path.join('static', 'i18n', f'{lang}.json')
            assert os.path.exists(i18n_path)
            with open(i18n_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            order_data = data.get('order', {})
            for step in ['new', 'accepted', 'cooking', 'ready', 'served']:
                key = f'status_{step}'
                assert key in order_data, f"{lang}.json da {key} topilmadi!"
                assert len(order_data[key]) > 0

    def test_f036_error_and_offline_templates(self):
        """F-036: 404, 500, 503 va guest/error.html sahifalari to'liq render bo'ladi."""
        templates_to_test = [
            ('guest/error.html', {'error_code': '404', 'error_message': 'Topilmadi', 'lang': 'uz'}),
            ('404.html', {}),
            ('500.html', {}),
            ('errors/503.html', {}),
            ('503.html', {}),
        ]

        rf = RequestFactory()
        req = rf.get('/')

        for tpl, ctx in templates_to_test:
            ctx['request'] = req
            rendered = render_to_string(tpl, ctx)
            assert '🍽' in rendered, f"{tpl} da 🍽 watermark fon ikonkasi yo'q!"
            assert 'location.reload()' in rendered, f"{tpl} da location.reload() retry tugmasi yo'q!"
            assert 'O\'zbekcha' in rendered or 'UZ:' in rendered or 'Sahifa topilmadi' in rendered
            assert 'Русский' in rendered or 'RU:' in rendered or 'Страница' in rendered
            assert 'English' in rendered or 'EN:' in rendered or 'Page' in rendered
