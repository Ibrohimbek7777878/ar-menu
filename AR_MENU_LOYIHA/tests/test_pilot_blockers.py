import pytest
from rest_framework.test import APIClient
from apps.analytics.exports import export_top_dishes_excel, export_orders_excel
from apps.orders.models import Order, OrderItem
from apps.accounts.tokens import make_access
from apps.accounts.models import Staff


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPilotBlockers:
    """F-006, F-007, F-009: Pilot demo to'siqlari testlari"""

    def test_staff_orders_page_renders_200(self, client):
        """F-006: /v1/staff/ sahifasi {% load static %} bilan xatosiz 200 render bo'ladi"""
        res = client.get('/v1/staff/')
        assert res.status_code == 200
        assert 'Ofitsiant — Buyurtmalar' in res.content.decode('utf-8')

    def test_kds_invalid_token_returns_404(self, client):
        """F-007: Yaroqsiz token 500 emas, 404 qaytarishi shart"""
        # Noto'g'ri string token
        res_wrong = client.get('/kds/?token=wrong')
        assert res_wrong.status_code == 404

        # Mavjud bo'lmagan to'g'ri UUID formatli token
        res_uuid_missing = client.get('/kds/?token=00000000-0000-0000-0000-000000000000')
        assert res_uuid_missing.status_code == 404

    def test_kds_valid_token_renders_board(self, client, restaurant):
        """F-007: To'g'ri KDS token bilan board 200 render bo'ladi"""
        res = client.get(f'/kds/?token={restaurant.kds_token}')
        assert res.status_code == 200
        assert 'kds-app' in res.content.decode('utf-8')

    def test_export_top_dishes_excel_success(self, db, restaurant, dish):
        """F-009: export_top_dishes_excel funksiyasi Sum va Count bilan xatosiz ishlaydi"""
        # Test order va order item
        order = Order.objects.create(
            restaurant=restaurant,
            number=1,
            status='paid',
            total=45000,
        )
        OrderItem.objects.create(
            order=order,
            dish=dish,
            dish_name=dish.name_uz,
            qty=2,
            price=22500,
            line_total=45000,
        )

        excel_bytes = export_top_dishes_excel(restaurant.id, days=30)
        assert isinstance(excel_bytes, bytes)
        assert len(excel_bytes) > 0
        assert excel_bytes.startswith(b'PK')  # ZIP / xlsx formati imzosi

    def test_export_top_dishes_api_endpoint(self, client, restaurant, dish):
        """F-009: /v1/admin/analytics/export/top-dishes-excel/ endpointi admin bilan 200 qaytaradi"""
        admin_staff = Staff.objects.create(
            restaurant=restaurant,
            full_name='Admin',
            phone='998901112244',
            role='admin',
            is_active=True,
        )
        token = make_access(admin_staff)

        res = client.get(
            '/v1/admin/analytics/export/top-dishes-excel/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res.status_code == 200
        assert res['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
