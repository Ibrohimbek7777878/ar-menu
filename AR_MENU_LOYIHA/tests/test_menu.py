import pytest


# ------------------------------------------------------------- Menyu endpoint
@pytest.mark.django_db
def test_menu_returns_structure(api_client, restaurant, category, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r.status_code == 200
    for key in ('restaurant', 'categories', 'dishes', 'version', 'lang'):
        assert key in r.data
    assert r.data['restaurant']['slug'] == restaurant.slug
    assert len(r.data['dishes']) == 1


@pytest.mark.django_db
def test_menu_404_for_unknown_slug(api_client):
    assert api_client.get('/v1/menu/yoq-restoran/').status_code == 404


@pytest.mark.django_db
def test_inactive_restaurant_403(api_client, restaurant, dish):
    restaurant.is_active = False
    restaurant.save()
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r.status_code == 403


@pytest.mark.django_db
def test_menu_does_not_leak_other_restaurant(api_client, restaurant, dish, dish2):
    """⚡ A restorani menyusida B taomi BO'LMASLIGI SHART"""
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    ids = [d['id'] for d in r.data['dishes']]
    assert dish.id in ids
    assert dish2.id not in ids, '⛔ CROSS-TENANT SIZDIRISH!'


# ------------------------------------------------------------- Kesh va ETag
@pytest.mark.django_db
def test_second_request_is_cache_hit(api_client, restaurant, dish):
    api_client.get(f'/v1/menu/{restaurant.slug}/')
    r2 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert r2['X-Cache'] == 'HIT'


@pytest.mark.django_db
def test_etag_returns_304(api_client, restaurant, dish):
    r1 = api_client.get(f'/v1/menu/{restaurant.slug}/')
    etag = r1['ETag']
    r2 = api_client.get(f'/v1/menu/{restaurant.slug}/', HTTP_IF_NONE_MATCH=etag)
    assert r2.status_code == 304


@pytest.mark.django_db
def test_etag_changes_with_menu_version(api_client, restaurant, dish):
    e1 = api_client.get(f'/v1/menu/{restaurant.slug}/')['ETag']
    restaurant.menu_version += 1
    restaurant.save()
    from django.core.cache import cache
    cache.delete(f'rest:slug:{restaurant.slug}')
    e2 = api_client.get(f'/v1/menu/{restaurant.slug}/')['ETag']
    assert e1 != e2


@pytest.mark.django_db
def test_cache_control_header(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    assert 'max-age=60' in r['Cache-Control']


# ------------------------------------------------------------- Qidiruv
@pytest.mark.django_db
def test_search_exact(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=Osh')
    assert r.status_code == 200 and r.data['count'] >= 1


@pytest.mark.django_db
def test_search_short_query_returns_empty(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=o')
    assert r.data['count'] == 0


@pytest.mark.django_db
def test_search_scoped_to_restaurant(api_client, restaurant, dish, dish2):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/search/?q=Achchiq')
    ids = [d['id'] for d in r.data['dishes']]
    assert dish2.id not in ids


# ------------------------------------------------------------- Filtr
@pytest.mark.django_db
def test_diet_filter(api_client, restaurant, category, dish):
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category,
                        name_uz='Steyk', price=90000, diet_tags=['spicy'])
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?diet=halal')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Osh' in names and 'Steyk' not in names


@pytest.mark.django_db
def test_allergen_exclusion(api_client, restaurant, category):
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category, name_uz='Tort',
                        price=30000, allergens=['nuts', 'dairy'])
    Dish.objects.create(restaurant=restaurant, category=category, name_uz='Choy',
                        price=5000, allergens=[])
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?no_allergens=nuts')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Choy' in names and 'Tort' not in names


@pytest.mark.django_db
def test_price_filter(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/filter/?max_price=10000')
    assert dish.id not in [d['id'] for d in r.data['dishes']]


# ------------------------------------------------------------- Taom tafsiloti
@pytest.mark.django_db
def test_dish_detail(api_client, dish):
    r = api_client.get(f'/v1/dish/{dish.id}/?lang=ru')
    assert r.status_code == 200
    assert r.data['name'] == 'Плов'
    assert 'similar' in r.data


# ------------------------------------------------------------- Admin CRUD
@pytest.mark.django_db
def test_admin_create_dish(api_client, restaurant, category, admin_token, plans):
    r = api_client.post('/v1/admin/dishes/', {
        'category': category.id, 'name_uz': 'Manti', 'price': '38000',
        'cook_min': 25,
    }, format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 201
    assert r.data['name_uz'] == 'Manti'


@pytest.mark.django_db
def test_admin_cannot_edit_other_restaurant_dish(api_client, admin_token, dish2):
    """⚡ CROSS-TENANT"""
    r = api_client.patch(f'/v1/admin/dishes/{dish2.id}/', {'price': '1'},
                         format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_stop_list_toggle(api_client, dish, admin_token):
    r = api_client.post(f'/v1/admin/dishes/{dish.id}/stop/', {'minutes': 30},
                        format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 200
    dish.refresh_from_db()
    assert dish.is_available is False and dish.stop_until is not None

    r2 = api_client.post(f'/v1/admin/dishes/{dish.id}/resume/', {},
                         format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    dish.refresh_from_db()
    assert r2.status_code == 200 and dish.is_available is True


@pytest.mark.django_db
def test_reorder_rejects_foreign_ids(api_client, admin_token, category, dish2):
    r = api_client.post('/v1/admin/dishes/reorder/', {'order': [dish2.id]},
                        format='json', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 403


@pytest.mark.django_db
def test_category_delete_blocked_when_not_empty(api_client, admin_token, category, dish):
    r = api_client.delete(f'/v1/admin/categories/{category.id}/',
                          HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    assert r.status_code == 409


# ------------------------------------------------------------- Import
@pytest.mark.django_db
def test_csv_import(restaurant):
    import io
    from apps.menu.services.importer import parse_file, import_menu
    csv_data = io.BytesIO(
        'kategoriya,nomi,narx,ogirlik\nMilliy,Osh,45000,400\nMilliy,Manti,38000,300\n'
        .encode())
    rows, errors = parse_file(csv_data, 'menu.csv')
    assert len(rows) == 2 and not errors
    res = import_menu(restaurant, rows)
    assert res['dishes_created'] == 2 and res['categories_created'] == 1


@pytest.mark.django_db
def test_import_rejects_missing_columns(restaurant):
    import io
    from apps.menu.services.importer import parse_file
    rows, errors = parse_file(io.BytesIO(b'a,b\n1,2\n'), 'x.csv')
    assert not rows and errors
