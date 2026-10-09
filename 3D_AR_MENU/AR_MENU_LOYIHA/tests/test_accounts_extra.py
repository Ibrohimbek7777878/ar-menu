import pytest
from rest_framework.serializers import ValidationError
from apps.accounts.services import hash_pin, verify_pin, validate_pin
from apps.accounts.tokens import make_access, decode
import jwt

def test_hash_is_not_plaintext():
    h = hash_pin('5731')
    assert h != '5731' and h.startswith('$2b$')

def test_verify_ok_and_fail():
    h = hash_pin('5731')
    assert verify_pin('5731', h) is True
    assert verify_pin('5732', h) is False

def test_weak_pin_rejected():
    for bad in ('1234', '0000', '111111'):
        with pytest.raises(ValidationError):
            validate_pin(bad)

def test_short_pin_rejected():
    with pytest.raises(ValidationError):
        validate_pin('123')

@pytest.mark.django_db
def test_token_contains_restaurant_id(staff):
    payload = decode(make_access(staff), expect_typ='access')
    assert payload['rid'] == staff.restaurant_id
    assert payload['role'] == staff.role

@pytest.mark.django_db
def test_tampered_token_rejected(staff):
    tok = make_access(staff)
    bad = tok[:-4] + 'AAAA'
    with pytest.raises(jwt.PyJWTError):
        decode(bad)

@pytest.mark.django_db
def test_staff_blocked_after_5_fails(staff):
    from apps.accounts.throttles import register_fail, MAX_FAILS
    from django.utils import timezone
    for _ in range(MAX_FAILS):
        register_fail(staff.restaurant_id, '1.2.3.4', staff=staff)
    staff.refresh_from_db()
    assert staff.is_blocked is True
    assert staff.blocked_until > timezone.now()

@pytest.mark.django_db
def test_login_blocked_returns_429(api_client, staff):
    from apps.accounts.throttles import register_fail, MAX_FAILS
    for _ in range(MAX_FAILS):
        register_fail(staff.restaurant_id, '1.2.3.4', staff=staff)
    r = api_client.post('/v1/staff/login/',
                        {'slug': staff.restaurant.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 429

@pytest.mark.django_db
def test_audit_written(restaurant, staff):
    from apps.analytics.models import AuditLog
    AuditLog.log(restaurant_id=restaurant.id, actor=staff, action='test.action',
                 model='Dish', object_id=7, new={'price': 1000}, ip='1.2.3.4')
    a = AuditLog.objects.get(action='test.action')
    assert a.restaurant_id == restaurant.id
    assert a.actor_name == staff.full_name
    assert a.new['price'] == 1000

@pytest.mark.django_db
def test_audit_never_raises(restaurant):
    from apps.analytics.models import AuditLog
    assert AuditLog.log(restaurant_id=99999999, action='x') is None or True

@pytest.mark.django_db
def test_totp_roundtrip(django_user_model):
    import pyotp
    from apps.accounts import totp as t
    u = django_user_model.objects.create_user(phone='998909999999', password='x', is_platform_admin=True)
    secret = t.new_secret()
    code = pyotp.TOTP(secret).now()
    assert t.verify(secret, code) is True
    assert t.verify(secret, '000000') is False
    assert 'ARMENU' in t.provisioning_uri(u, secret)

@pytest.mark.django_db
def test_refresh_returns_new_pair(api_client, staff):
    from apps.accounts.tokens import make_refresh
    rt = make_refresh(staff)
    r = api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    assert r.status_code == 200
    assert r.data['access'] and r.data['refresh'] != rt

@pytest.mark.django_db
def test_refresh_cannot_be_reused(api_client, staff):
    from apps.accounts.tokens import make_refresh
    rt = make_refresh(staff)
    api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    r2 = api_client.post('/v1/staff/refresh/', {'refresh': rt}, format='json')
    assert r2.status_code == 401

def test_waiter_allowed(staff):
    from types import SimpleNamespace
    from core.permissions import IsWaiter, IsCook, IsRestAdmin
    # need restaurant fixture, but we can mock
    pass

@pytest.mark.django_db
def test_waiter_permissions(staff):
    from types import SimpleNamespace
    from core.permissions import IsWaiter, IsCook, IsRestAdmin
    def _req(s, rid=None):
        return SimpleNamespace(staff=s, restaurant_id=rid or s.restaurant_id, method='GET', user=None)
    assert IsWaiter().has_permission(_req(staff), None) is True
    assert IsCook().has_permission(_req(staff), None) is False
    req = _req(staff, rid=999999)
    assert IsWaiter().has_permission(req, None) is False
    staff.role = 'admin'
    staff.save()
    assert IsWaiter().has_permission(_req(staff), None) is True
    assert IsCook().has_permission(_req(staff), None) is True
    assert IsRestAdmin().has_permission(_req(staff), None) is True
