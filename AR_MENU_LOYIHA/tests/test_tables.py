import uuid
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.tables.models import Hall, Table, resolve_table_by_token
from core.exceptions import QRInvalid, InvalidTransition


@pytest.fixture
def hall(db, restaurant):
    return Hall.objects.create(restaurant=restaurant, name='1-qavat')


@pytest.fixture
def table(db, restaurant, hall):
    return Table.objects.create(hall=hall, restaurant=restaurant, number='5')


# --- QR noyobligi ---

def test_qr_token_is_unique_across_tables(db, restaurant, hall):
    tokens = set()
    for i in range(50):
        t = Table.objects.create(hall=hall, restaurant=restaurant, number=str(i))
        tokens.add(str(t.qr_token))
    assert len(tokens) == 50


def test_qr_token_unique_constraint(db, restaurant, hall, table):
    from django.db.utils import IntegrityError
    with pytest.raises(IntegrityError):
        Table.objects.create(hall=hall, restaurant=restaurant,
                             number='99', qr_token=table.qr_token)


def test_qr_url_contains_token(table):
    assert str(table.qr_token) in table.qr_url
    assert table.qr_url.endswith(str(table.qr_token))


# --- Grace period ---

def test_old_token_works_within_grace(table):
    old = table.qr_token
    table.rotate_qr()
    assert table.qr_token != old
    assert resolve_table_by_token(old).id == table.id


def test_old_token_dead_after_grace(table):
    old = table.qr_token
    table.rotate_qr()
    table.qr_rotated_at = timezone.now() - timedelta(hours=25)
    table.save(update_fields=['qr_rotated_at'])
    with pytest.raises(QRInvalid):
        resolve_table_by_token(old)


def test_unknown_token_raises(db):
    with pytest.raises(QRInvalid):
        resolve_table_by_token(uuid.uuid4())


def test_inactive_table_token_raises(table):
    table.is_active = False
    table.save(update_fields=['is_active'])
    with pytest.raises(QRInvalid):
        resolve_table_by_token(table.qr_token)


# --- ⚡ Cross-tenant izolyatsiya ---

def test_cross_tenant_table_list_isolated(db, api_client, restaurant, restaurant2,
                                          hall, admin_jwt):
    h2 = Hall.objects.create(restaurant=restaurant2, name='Boshqa zal')
    Table.objects.create(hall=hall, restaurant=restaurant, number='1')
    Table.objects.create(hall=h2, restaurant=restaurant2, number='1')

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_jwt}')
    r = api_client.get('/v1/admin/tables/')
    ids = {row['id'] for row in r.json()['results']}
    assert all(Table.objects.get(id=i).restaurant_id == restaurant.id for i in ids)


def test_cannot_create_table_in_other_restaurant_hall(db, api_client, restaurant,
                                                     restaurant2, admin_jwt):
    h2 = Hall.objects.create(restaurant=restaurant2, name='Begona zal')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_jwt}')
    r = api_client.post('/v1/admin/tables/', {'hall': h2.id, 'number': '7'},
                        format='json')
    assert r.status_code == 400


def test_table_number_unique_per_restaurant(db, restaurant, restaurant2, hall):
    from django.db.utils import IntegrityError
    h2 = Hall.objects.create(restaurant=restaurant2, name='Z2')
    Table.objects.create(hall=hall, restaurant=restaurant, number='5')
    # Boshqa restoranda "5" — MUMKIN
    Table.objects.create(hall=h2, restaurant=restaurant2, number='5')
    # Shu restoranda "5" — MUMKIN EMAS
    with pytest.raises(IntegrityError):
        Table.objects.create(hall=hall, restaurant=restaurant, number='5')


# --- Holat o'tishi ---

def test_valid_transition(table):
    table.set_status('occupied', notify=False)
    assert table.status == 'occupied'


def test_invalid_transition_raises(table):
    with pytest.raises(InvalidTransition):
        table.set_status('ready', notify=False)   # free → ready mumkin emas


def test_same_status_is_noop(table):
    table.set_status('free', notify=False)
    assert table.status == 'free'


# --- QR rasm/PDF ---

def test_qr_png_generated(table):
    from apps.tables.qr import table_qr_png
    b = table_qr_png(table)
    assert b[:8] == b'\x89PNG\r\n\x1a\n'
    assert len(b) > 1000


def test_qr_pdf_generated(db, restaurant, hall):
    from apps.tables.pdf import build_qr_pdf
    ts = [Table.objects.create(hall=hall, restaurant=restaurant, number=str(i))
          for i in range(6)]
    pdf = build_qr_pdf(ts, 'a4_6')
    assert pdf[:4] == b'%PDF'


# --- plan_json ---

def test_hall_plan_saved(db, hall):
    hall.plan_json = {'width': 1000, 'height': 700,
                      'objects': [{'type': 'wall', 'x1': 0, 'y1': 0,
                                   'x2': 1000, 'y2': 0}]}
    hall.save(update_fields=['plan_json'])
    hall.refresh_from_db()
    assert hall.plan_json['width'] == 1000
    assert len(hall.plan_json['objects']) == 1
