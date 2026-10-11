"""
⚡⚡ MULTI-TENANT IZOLYATSIYA TESTLARI — loyihaning eng muhim testi.

Uch qatlam tekshiriladi:
  1. Model qatlami — har tenant modelida restaurant FK bor
  2. Queryset qatlami — TenantScopedMixin filtrlaydi
  3. API qatlami — boshqa restoran obyektiga 403/404
"""
import pytest
from django.apps import apps as django_apps

# ⚡ Tenant'ga bog'liq BO'LMAGAN modellar (global yoki texnik)
GLOBAL_MODELS = {
    'tenants.Restaurant', 'tenants.Plan',
    'accounts.User',
    'core.Job',
    'ar3d.DishLibrary',        # global 3D kutubxona
}


def all_tenant_models():
    """Loyihadagi barcha tenant modellarini avtomatik topadi"""
    out = []
    for model in django_apps.get_models():
        label = f'{model._meta.app_label}.{model.__name__}'
        if not model._meta.app_label.startswith(('tenants', 'accounts', 'menu', 'tables',
                                                 'guest', 'orders', 'ar3d', 'payments',
                                                 'fiscal', 'loyalty', 'reviews',
                                                 'analytics', 'ai', 'notifications')):
            continue
        if label in GLOBAL_MODELS:
            continue
        out.append((label, model))
    return out


# ---------------------------------------------------------------- 1-qatlam
@pytest.mark.parametrize('label,model', all_tenant_models(),
                         ids=[l for l, _ in all_tenant_models()])
def test_every_tenant_model_has_restaurant_scope(label, model):
    """
    ⚡ PARAMETRIK: har bir tenant modeli restoranga bog'langan bo'lishi SHART.
    To'g'ridan-to'g'ri restaurant FK YOKI restoranli parent'ga FK.
    """
    field_names = {f.name for f in model._meta.get_fields()}
    if 'restaurant' in field_names:
        return

    # bilvosita: dish → restaurant, order → restaurant, table → restaurant ...
    parents = {'dish', 'order', 'table', 'hall', 'category', 'guest',
               'staff', 'session', 'payment'}
    assert field_names & parents, (
        f'⛔ {label} modeli tenant-scoped EMAS! '
        f'restaurant FK yoki restoranli parent FK qo\'shing, '
        f'yoki GLOBAL_MODELS ro\'yxatiga kiriting.')


# ---------------------------------------------------------------- 2-qatlam
def _scoped_view(restaurant_id):
    """TenantScopedMixin ni sinash uchun soxta ViewSet"""
    from types import SimpleNamespace
    from core.mixins import TenantScopedMixin
    from apps.accounts.models import Staff

    class Base:
        def get_queryset(self):
            return Staff.objects.all()

    class View(TenantScopedMixin, Base):
        request = SimpleNamespace(restaurant_id=restaurant_id)

    return View()


@pytest.mark.django_db
def test_scoped_mixin_filters_by_restaurant(restaurant, restaurant2):
    """⚡ Mixin faqat o'z restoranini qaytaradi"""
    from apps.accounts.models import Staff
    Staff.objects.create(restaurant=restaurant,  full_name='A', role='waiter')
    Staff.objects.create(restaurant=restaurant2, full_name='B', role='waiter')

    qs = _scoped_view(restaurant.id).get_queryset()
    assert qs.count() == 1
    assert qs.first().full_name == 'A'

    qs2 = _scoped_view(restaurant2.id).get_queryset()
    assert qs2.count() == 1
    assert qs2.first().full_name == 'B'


@pytest.mark.django_db
def test_scoped_mixin_raises_without_restaurant():
    """⚡ restaurant_id yo'q bo'lsa — bo'sh emas, PermissionDenied"""
    from rest_framework.exceptions import PermissionDenied
    with pytest.raises(PermissionDenied):
        _scoped_view(None).get_queryset()


# ---------------------------------------------------------------- 3-qatlam
@pytest.mark.django_db
def test_token_of_a_cannot_read_b_staff(api_client, staff, staff2, staff_token):
    """⚡ A restorani tokeni bilan B restorani xodimini o'qib bo'lmaydi"""
    r = api_client.get(f'/v1/admin/staff/{staff2.id}/',
                       HTTP_AUTHORIZATION=f'Bearer {staff_token}')
    assert r.status_code in (401, 403, 404), '⛔ CROSS-TENANT TESHIK!'
    assert r.status_code != 200


@pytest.mark.django_db
def test_token_restaurant_id_cannot_be_overridden(api_client, staff, staff_token, restaurant2):
    """
    ⚡ Klient ?restaurant=<boshqa id> yuborsa ham token'dagi rid g'olib bo'ladi.
    """
    r = api_client.get(f'/v1/staff/me/?restaurant={restaurant2.id}',
                       HTTP_AUTHORIZATION=f'Bearer {staff_token}')
    if r.status_code == 200:
        assert r.data['restaurant']['id'] == staff.restaurant_id


@pytest.mark.django_db
def test_pin_of_a_does_not_login_to_b(api_client, staff, restaurant2):
    """
    ⚡ A xodimining PIN'i B restoranida ishlamaydi (bir xil PIN bo'lsa ham).
    """
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    Staff.objects.create(restaurant=restaurant2, full_name='C', role='waiter',
                         phone='998904444444', pin_hash=hash_pin('5731'))

    r = api_client.post('/v1/staff/login/',
                        {'slug': restaurant2.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 200
    # ⚡ B restoranining xodimi kirdi — A niki EMAS
    assert r.data['restaurant']['id'] == restaurant2.id
    assert r.data['staff']['id'] != staff.id


@pytest.mark.django_db
def test_inactive_restaurant_blocks_login(api_client, restaurant, staff):
    restaurant.is_active = False
    restaurant.save()
    r = api_client.post('/v1/staff/login/',
                        {'slug': restaurant.slug, 'pin': '5731'}, format='json')
    assert r.status_code == 403


@pytest.mark.django_db
def test_no_token_no_access(api_client, staff2):
    r = api_client.get(f'/v1/admin/staff/{staff2.id}/')
    assert r.status_code in (401, 403)


@pytest.mark.django_db
def test_ws_group_names_are_restaurant_scoped(restaurant, restaurant2):
    """⚡ WS guruhi restoran-scoped bo'lishi SHART"""
    from core.ws import g_kds, g_waiters, g_admin
    assert g_kds(restaurant.id) != g_kds(restaurant2.id)
    for fn in (g_kds, g_waiters, g_admin):
        assert str(restaurant.id) in fn(restaurant.id)
