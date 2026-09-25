import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_cache():
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def restaurant(db):
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(
        slug='test-rest', name='Test Restoran', phone='998901234567',
        city='Toshkent', plan='pro', is_active=True)


@pytest.fixture
def restaurant2(db):
    """⚡ Cross-tenant testlar uchun IKKINCHI restoran"""
    from apps.tenants.models import Restaurant
    return Restaurant.objects.create(
        slug='test-rest-2', name='Ikkinchi Restoran', phone='998901234568',
        city='Samarqand', plan='start', is_active=True)


@pytest.fixture
def plans(db):
    from apps.tenants.models import Plan
    data = [
        dict(code='free', name_uz='Bepul', table_limit=3, dish_limit=30,
             ar_model_limit=0, staff_limit=3, features={'custom_domain': False}),
        dict(code='start', name_uz='Start', table_limit=20, dish_limit=150,
             ar_model_limit=10, staff_limit=10, features={'custom_domain': False}),
        dict(code='pro', name_uz='Pro', table_limit=-1, dish_limit=-1,
             ar_model_limit=50, staff_limit=50, features={'custom_domain': True}),
    ]
    return [Plan.objects.create(**d) for d in data]


@pytest.fixture
def staff(db, restaurant):
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    return Staff.objects.create(
        restaurant=restaurant, full_name='Ali Valiyev', phone='998901111111',
        role='waiter', pin_hash=hash_pin('5731'), is_active=True)


@pytest.fixture
def staff2(db, restaurant2):
    """⚡ Ikkinchi restoran xodimi — cross-tenant testlar uchun"""
    from apps.accounts.models import Staff
    from apps.accounts.services import hash_pin
    return Staff.objects.create(
        restaurant=restaurant2, full_name='Bek Bekov', phone='998902222222',
        role='admin', pin_hash=hash_pin('8642'), is_active=True)


@pytest.fixture
def staff_token(staff):
    from apps.accounts.tokens import make_access
    return make_access(staff)


@pytest.fixture
def admin_token(db, restaurant):
    from apps.accounts.models import Staff
    from apps.accounts.tokens import make_access
    s = Staff.objects.create(restaurant=restaurant, full_name='Admin A',
                             phone='998903333333', role='admin', is_active=True)
    return make_access(s)


@pytest.fixture
def admin_jwt(admin_token):
    return admin_token


@pytest.fixture
def category(db, restaurant):
    from apps.menu.models import Category
    return Category.objects.create(restaurant=restaurant, name_uz='Milliy taomlar',
                                   name_ru='Национальные', name_en='National', order=1)


@pytest.fixture
def dish(db, restaurant, category):
    from apps.menu.models import Dish
    return Dish.objects.create(
        restaurant=restaurant, category=category,
        name_uz='Osh', name_ru='Плов', name_en='Pilaf',
        desc_uz='Toshkent usulida', price=45000, cook_min=20,
        weight_g=400, diet_tags=['halal', 'no_spicy'], is_available=True)


@pytest.fixture
def dish2(db, restaurant2):
    """⚡ Boshqa restoran taomi — izolyatsiya testlari uchun"""
    from apps.menu.models import Category, Dish
    c = Category.objects.create(restaurant=restaurant2, name_uz='Salatlar')
    return Dish.objects.create(restaurant=restaurant2, category=c,
                               name_uz='Achchiq-chuchuk', price=18000)
