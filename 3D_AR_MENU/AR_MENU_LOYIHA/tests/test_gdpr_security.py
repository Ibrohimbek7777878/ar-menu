import pytest
from rest_framework.test import APIClient
from apps.guest.models import Guest, GuestSession
from apps.accounts.tokens import make_access
from apps.accounts.models import Staff


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def guest1(db, restaurant):
    return Guest.objects.create(
        restaurant=restaurant,
        phone='998901234567',
        name='Mijoz Bir',
        lang='uz',
        bonus=10000,
    )


@pytest.fixture
def guest2(db, restaurant2):
    return Guest.objects.create(
        restaurant=restaurant2,
        phone='998909876543',
        name='Mijoz Ikki',
        lang='ru',
        bonus=5000,
    )


@pytest.mark.django_db
class TestGDPRSecurity:
    """F-002: GDPR endpointlar xavfsizligi va IDOR tenant izolyatsiyasi"""

    def test_unauthenticated_export_and_delete_rejected(self, client, guest1):
        """Auth bo'lmasa 401 qaytishi kerak"""
        # GET export
        res_exp = client.get(f'/v1/admin/gdpr/export/{guest1.id}/')
        assert res_exp.status_code == 401

        # DELETE delete
        res_del = client.delete(f'/v1/admin/gdpr/{guest1.id}/')
        assert res_del.status_code == 401

    def test_waiter_cannot_access_gdpr(self, client, restaurant, guest1):
        """Ofitsiant roli admin endpointga kira olmaydi (403)"""
        waiter = Staff.objects.create(
            restaurant=restaurant, full_name='Ofitsiant',
            phone='998901112233', role='waiter', is_active=True,
        )
        token = make_access(waiter)

        res = client.get(
            f'/v1/admin/gdpr/export/{guest1.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res.status_code == 403

    def test_cross_tenant_idor_blocked(self, client, restaurant, restaurant2, guest1, guest2):
        """Restoran 1 admini Restoran 2 ga tegishli guestni ko'ra olmaydi yoki o'chira olmaydi (404)"""
        GuestSession.objects.create(guest=guest1, restaurant=restaurant)
        GuestSession.objects.create(guest=guest2, restaurant=restaurant2)

        admin1 = Staff.objects.create(
            restaurant=restaurant, full_name='Admin 1',
            phone='998903334455', role='admin', is_active=True,
        )
        token1 = make_access(admin1)

        # admin1 guest2 ni ko'rmoqchi (boshqa restoran) -> 404
        res_exp = client.get(
            f'/v1/admin/gdpr/export/{guest2.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token1}',
        )
        assert res_exp.status_code == 404

        # admin1 guest2 ni o'chirmoqchi (boshqa restoran) -> 404
        res_del = client.delete(
            f'/v1/admin/gdpr/{guest2.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token1}',
        )
        assert res_del.status_code == 404

    def test_admin_can_export_and_delete_own_guest(self, client, restaurant, guest1):
        """O'z restoraniga tegishli guestni eksport va delete qilish muvaffaqiyatli o'tadi"""
        GuestSession.objects.create(guest=guest1, restaurant=restaurant)

        admin1 = Staff.objects.create(
            restaurant=restaurant, full_name='Admin 1',
            phone='998903334455', role='admin', is_active=True,
        )
        token1 = make_access(admin1)

        # Export -> 200
        res_exp = client.get(
            f'/v1/admin/gdpr/export/{guest1.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token1}',
        )
        assert res_exp.status_code == 200
        data = res_exp.json()
        assert data['guest']['name'] == 'Mijoz Bir'

        # Delete (anonymize) -> 200
        res_del = client.delete(
            f'/v1/admin/gdpr/{guest1.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token1}',
        )
        assert res_del.status_code == 200

        guest1.refresh_from_db()
        assert guest1.phone == ''
        assert guest1.name == f'Anonim#{guest1.id}'
        assert guest1.bonus == 0
