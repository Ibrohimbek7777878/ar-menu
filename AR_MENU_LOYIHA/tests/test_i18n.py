from types import SimpleNamespace
from core.i18n import t, tdict, normalize_lang, missing_translations
import pytest


def test_returns_requested_lang():
    o = SimpleNamespace(name_uz='Osh', name_ru='Плов', name_en='Pilaf')
    assert t(o, 'name', 'ru') == 'Плов'
    assert t(o, 'name', 'en') == 'Pilaf'


def test_fallback_to_uz_when_empty():
    o = SimpleNamespace(name_uz='Osh', name_ru='', name_en='')
    assert t(o, 'name', 'ru') == 'Osh'
    assert t(o, 'name', 'en') == 'Osh'


def test_fallback_chain_uz_ru_en():
    o = SimpleNamespace(name_uz='', name_ru='', name_en='Pilaf')
    assert t(o, 'name', 'ru') == 'Pilaf'


def test_never_returns_none():
    o = SimpleNamespace(name_uz='', name_ru='', name_en='')
    assert t(o, 'name', 'ru') == ''


def test_normalize_lang():
    assert normalize_lang('ru-RU') == 'ru'
    assert normalize_lang('EN') == 'en'
    assert normalize_lang('fr') == 'uz'
    assert normalize_lang(None) == 'uz'


def test_missing_translations():
    o = SimpleNamespace(name_uz='Osh', name_ru='', name_en='Pilaf',
                        desc_uz='', desc_ru='', desc_en='')
    m = missing_translations(o, ['name', 'desc'])
    assert m['name'] == ['ru']
    assert set(m['desc']) == {'uz', 'ru', 'en'}


@pytest.mark.django_db
def test_menu_returns_uz(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=uz')
    assert r.data['dishes'][0]['name'] == 'Osh'
    assert r.data['lang'] == 'uz'


@pytest.mark.django_db
def test_menu_returns_ru(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r.data['dishes'][0]['name'] == 'Плов'


@pytest.mark.django_db
def test_menu_returns_en(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=en')
    assert r.data['dishes'][0]['name'] == 'Pilaf'


@pytest.mark.django_db
def test_missing_translation_falls_back(api_client, restaurant, category):
    """⚡ ru tarjimasi yo'q → uz qaytadi (bo'sh EMAS)"""
    from apps.menu.models import Dish
    Dish.objects.create(restaurant=restaurant, category=category,
                        name_uz='Somsa', name_ru='', name_en='', price=12000)
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    names = [d['name'] for d in r.data['dishes']]
    assert 'Somsa' in names
    assert '' not in names, '⛔ Bo\'sh nom qaytdi — fallback ishlamayapti'


@pytest.mark.django_db
def test_accept_language_header_used(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/', HTTP_ACCEPT_LANGUAGE='ru-RU,ru;q=0.9')
    assert r.data['lang'] == 'ru'


@pytest.mark.django_db
def test_query_param_beats_header(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=en',
                       HTTP_ACCEPT_LANGUAGE='ru-RU')
    assert r.data['lang'] == 'en'


@pytest.mark.django_db
def test_unknown_lang_falls_back_to_uz(api_client, restaurant, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=fr')
    assert r.data['lang'] == 'uz'


@pytest.mark.django_db
def test_each_lang_has_separate_cache(api_client, restaurant, dish):
    """⚡ uz keshi ru so'roviga qaytmasligi SHART"""
    r_uz = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=uz')
    r_ru = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r_uz.data['dishes'][0]['name'] != r_ru.data['dishes'][0]['name']


@pytest.mark.django_db
def test_category_name_translated(api_client, restaurant, category, dish):
    r = api_client.get(f'/v1/menu/{restaurant.slug}/?lang=ru')
    assert r.data['categories'][0]['name'] == 'Национальные'


@pytest.mark.django_db
def test_error_messages_have_three_languages(api_client, restaurant, dish):
    restaurant.is_active = False
    restaurant.save()
    from django.core.cache import cache
    cache.delete(f'rest:slug:{restaurant.slug}')
    r = api_client.get(f'/v1/menu/{restaurant.slug}/')
    err = r.data['error']
    assert err['message_uz'] and err['message_ru'] and err['message_en']
