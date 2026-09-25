import pytest
from rest_framework.test import APIClient
from apps.guest.models import Call, Guest, GuestSession
from apps.tables.models import Table, Hall
from apps.accounts.tokens import make_access
from apps.accounts.models import Staff


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def hall(db, restaurant):
    return Hall.objects.create(restaurant=restaurant, name='Asosiy zal')


@pytest.fixture
def table(db, restaurant, hall):
    return Table.objects.create(restaurant=restaurant, hall=hall, number=5)


@pytest.fixture
def guest(db, restaurant):
    return Guest.objects.create(restaurant=restaurant, name='Mehmon')


@pytest.fixture
def session(db, restaurant, guest, table):
    return GuestSession.objects.create(restaurant=restaurant, guest=guest, table=table)


@pytest.fixture
def call_item(db, restaurant, table, guest, session):
    return Call.objects.create(
        restaurant=restaurant,
        table=table,
        guest=guest,
        session=session,
        status='new',
    )


@pytest.mark.django_db
class TestCallSecurity:
    """F-003: Staff call endpointlariga JWT auth va tenant izolyatsiyasi testlari"""

    def test_unauthenticated_staff_calls_endpoints_return_401(self, client, call_item):
        """Auth bo'lmaganda 401 qaytishi kerak"""
        # GET list
        res_list = client.get('/v1/staff/calls/')
        assert res_list.status_code == 401

        # POST accept
        res_accept = client.post(f'/v1/staff/calls/{call_item.id}/accept/')
        assert res_accept.status_code == 401

        # POST done
        res_done = client.post(f'/v1/staff/calls/{call_item.id}/done/')
        assert res_done.status_code == 401

    def test_cross_tenant_call_action_blocked(self, client, restaurant2, call_item):
        """Boshqa restoran xodimi chaqiruvni qabul qila olmaydi yoki ko'ra olmaydi (404)"""
        staff_other = Staff.objects.create(
            restaurant=restaurant2, full_name='Boshqa Xodim',
            phone='998907778899', role='waiter', is_active=True,
        )
        token_other = make_access(staff_other)

        # Accept -> 404
        res_accept = client.post(
            f'/v1/staff/calls/{call_item.id}/accept/',
            HTTP_AUTHORIZATION=f'Bearer {token_other}',
        )
        assert res_accept.status_code == 404

        # Done -> 404
        res_done = client.post(
            f'/v1/staff/calls/{call_item.id}/done/',
            HTTP_AUTHORIZATION=f'Bearer {token_other}',
        )
        assert res_done.status_code == 404

        # List -> o'z restoranida call yo'q (empty)
        res_list = client.get(
            '/v1/staff/calls/',
            HTTP_AUTHORIZATION=f'Bearer {token_other}',
        )
        assert res_list.status_code == 200
        assert len(res_list.json().get('calls', [])) == 0

    def test_staff_can_list_accept_and_done_own_call(self, client, restaurant, staff, call_item):
        """O'z restorani xodimi chaqiruvni ko'radi, qabul qiladi va yakunlaydi"""
        token = make_access(staff)

        # 1. Listda yangi call ko'rinadi
        res_list = client.get(
            '/v1/staff/calls/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res_list.status_code == 200
        calls = res_list.json().get('calls', [])
        assert len(calls) == 1
        assert calls[0]['id'] == call_item.id
        assert calls[0]['status'] == 'new'
        assert str(calls[0]['table_number']) == '5'

        # 2. Qabul qilish
        res_accept = client.post(
            f'/v1/staff/calls/{call_item.id}/accept/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res_accept.status_code == 200
        call_item.refresh_from_db()
        assert call_item.status == 'accepted'
        assert call_item.accepted_by == staff
        assert call_item.accepted_at is not None

        # 3. Ikkinchi marta accept qilish -> 404 (chunki status != 'new')
        res_accept_again = client.post(
            f'/v1/staff/calls/{call_item.id}/accept/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res_accept_again.status_code == 404

        # 4. Yakunlash
        res_done = client.post(
            f'/v1/staff/calls/{call_item.id}/done/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        assert res_done.status_code == 200
        call_item.refresh_from_db()
        assert call_item.status == 'done'
        assert call_item.done_at is not None
