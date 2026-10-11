import os
import json
import pytest
from rest_framework.test import APIClient
from django.conf import settings
from apps.orders.models import Order


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPWAAndOrderFlow:
    """F-010 & F-011: PWA Service Worker, Manifest, Order Status page va offline oqim testlari"""

    def test_service_worker_served_with_root_scope_header(self, client):
        """F-010: /sw.js 200 bilan xizmatlanadi va Service-Worker-Allowed: / headeriga ega"""
        res = client.get('/sw.js')
        assert res.status_code == 200
        assert 'javascript' in res['Content-Type']
        assert res.get('Service-Worker-Allowed') == '/'
        assert 'STATIC_ASSETS' in res.content.decode('utf-8')

    def test_pwa_manifest_served_with_valid_icons_and_scope(self, client):
        """F-010: /manifest.json 200 qaytaradi va 192x192, 512x512 pwa ikonkalari mavjud"""
        res = client.get('/manifest.json')
        assert res.status_code == 200
        data = json.loads(res.content.decode('utf-8'))
        assert data.get('scope') == '/'
        assert 'icons' in data

        icon_sizes = [icon.get('sizes') for icon in data['icons']]
        assert '192x192' in icon_sizes
        assert '512x512' in icon_sizes

    def test_sw_precache_assets_exist_on_filesystem(self):
        """F-010: sw.js dagi barcha STATIC_ASSETS fayllari diskda mavjud (404 bo'lmaydi)"""
        sw_path = os.path.join(settings.BASE_DIR, 'static', 'guest', 'js', 'sw.js')
        with open(sw_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # STATIC_ASSETS massivini ajratib olish
        start_idx = content.find('const STATIC_ASSETS = [')
        end_idx = content.find('];', start_idx)
        assert start_idx != -1 and end_idx != -1
        assets_block = content[start_idx:end_idx]

        lines = [line.strip().strip("',\"") for line in assets_block.splitlines() if line.strip().startswith("'/")]
        for asset in lines:
            if asset.startswith('/static/'):
                rel_path = asset.replace('/static/', '')
                full_path = os.path.join(settings.BASE_DIR, 'static', rel_path)
                assert os.path.exists(full_path), f"Precache asset topilmadi: {asset} -> {full_path}"

    def test_order_status_page_renders_200(self, client, restaurant):
        """F-011: /o/<order_id>/ sahifasi buyurtma holatini ko'rsatib 200 render bo'ladi"""
        order = Order.objects.create(
            restaurant=restaurant,
            number=42,
            status='cooking',
            total=85000,
        )
        res = client.get(f'/o/{order.id}/')
        assert res.status_code == 200
        content = res.content.decode('utf-8')
        assert f'Buyurtma #{order.number}' in content
        assert 'statuspage' in content
        assert 'wsUrl' in content

    def test_order_status_page_not_found(self, client):
        """F-011: Mavjud bo'lmagan buyurtma ID uchun 404 qaytariladi"""
        res = client.get('/o/999999/')
        assert res.status_code == 404
