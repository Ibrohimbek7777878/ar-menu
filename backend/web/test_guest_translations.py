"""Mehmon menyusi: taom va bo'lim nomlari/tavsiflarining ruscha va inglizcha tarjimalari (web/guest_dish.py, /menu/ va /ar/).

Asosiy shartlar:
  • tarjima bo'sh bo'lsa kalit umuman yuborilmaydi (menyu javobi kattalashmasin; mehmon o'zbekcha ko'radi);
  • to'ldirilgan bo'lsa keladi: taom `name_ru, name_en, desc_ru, desc_en`, bo'lim `name_ru, name_en`;
  • `Category.name_ru` majburiy maydon va ko'pincha o'zbekcha nomning nusxasi: asosiy nom bilan bir xil bo'lsa yuborilmaydi;
  • tarjima o'zgarganda menyu keshi mavjud signal yo'li bilan darrov yangilanadi.
"""
import io
import json
import re
from decimal import Decimal
from types import SimpleNamespace

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from categories.models import Category
from products.models import Product
from shops.models import Shop
from web.guest_dish import guest_category_translations, guest_dish_translations

TRANSLATION_KEYS = ('name_ru', 'name_en', 'desc_ru', 'desc_en')


def _product(**kw):
    values = dict(name_ru='', name_en='', description_ru='', description_en='')
    values.update(kw)
    return SimpleNamespace(**values)


def _category(**kw):
    values = dict(name='Taomlar', name_ru='', name_en='')
    values.update(kw)
    return SimpleNamespace(**values)


class TranslationHelperTests(SimpleTestCase):
    def test_empty_product_gives_no_keys(self):
        self.assertEqual(guest_dish_translations(_product()), {})
        self.assertEqual(guest_dish_translations(_product(name_ru='  ', description_en='\n\t')), {})
        self.assertEqual(guest_dish_translations(_product(name_ru=None, description_ru=None)), {})

    def test_filled_product_fields_map_to_guest_keys_and_are_trimmed(self):
        got = guest_dish_translations(_product(
            name_ru=' Плов ', name_en='Plov', description_ru='С бараниной', description_en=' Rice with lamb '))
        self.assertEqual(got, {'name_ru': 'Плов', 'name_en': 'Plov', 'desc_ru': 'С бараниной', 'desc_en': 'Rice with lamb'})

    def test_only_filled_product_fields_are_sent(self):
        self.assertEqual(guest_dish_translations(_product(name_en='Plov')), {'name_en': 'Plov'})
        self.assertEqual(guest_dish_translations(_product(description_ru='Вкусно')), {'desc_ru': 'Вкусно'})

    def test_category_copy_of_base_name_is_not_sent(self):
        self.assertEqual(guest_category_translations(_category(name='Taomlar', name_ru='Taomlar')), {})
        self.assertEqual(guest_category_translations(_category(name='Taomlar', name_ru='  TAOMLAR ')), {})
        self.assertEqual(guest_category_translations(_category(name='Ichimliklar', name_en='ichimliklar')), {})
        # kirill harflarida ham katta-kichik harf farqi e'tiborga olinmaydi
        self.assertEqual(guest_category_translations(_category(name='Блюда', name_ru='блюда')), {})

    def test_category_real_translation_is_sent(self):
        self.assertEqual(guest_category_translations(_category(name='Taomlar', name_ru='Блюда', name_en='Dishes')),
                         {'name_ru': 'Блюда', 'name_en': 'Dishes'})
        self.assertEqual(guest_category_translations(_category(name='Taomlar', name_ru='Блюда')), {'name_ru': 'Блюда'})
        self.assertEqual(guest_category_translations(_category(name='Taomlar', name_en='Dishes')), {'name_en': 'Dishes'})

    def test_category_empty_gives_no_keys(self):
        self.assertEqual(guest_category_translations(_category()), {})
        self.assertEqual(guest_category_translations(_category(name_ru='   ', name_en=None)), {})


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestMenuTranslationTests(TestCase):
    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Tarjima Oshxona', slug='tarjima', owner='tarjima-ega', password='Tarjima-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='tarjima')
        # name_ru o'zbekcha nomning nusxasi (majburiy maydon to'ldirilgan holat) va haqiqiy tarjima
        self.copy_cat = Category.objects.create(name='Salatlar', name_uz='Salatlar', name_ru='salatlar', sort_order=1)
        self.real_cat = Category.objects.create(name='Ichimliklar', name_uz='Ichimliklar', name_ru='Напитки', name_en='Drinks',
                                                sort_order=2)
        self.plain = Product.objects.create(shop=self.shop, name='Achchiq-chuchuk', slug='t-salat', price=Decimal('14000'),
                                            category=self.copy_cat)
        self.full = Product.objects.create(
            shop=self.shop, name='Palov', slug='t-palov', price=Decimal('58000'), category=self.real_cat,
            description="Guruch, go'sht va sabzi", name_ru='Плов', name_en='Plov',
            description_ru='Рис, мясо и морковь', description_en='Rice, meat and carrots', has_3d=True, ar_model='/media/models/p.glb',
        )
        self.half = Product.objects.create(shop=self.shop, name='Choy', slug='t-choy', price=Decimal('5000'),
                                           category=self.real_cat, name_en='Tea')

    def block(self, url, var):
        cache.clear()
        client = Client()
        client.get(url)
        html = client.get(url).content.decode()
        return json.loads(re.search(rf'window\.{var} = (.*?);\n</script>', html, re.S).group(1)), html

    def menu(self):
        return self.block('/menu/', '__GULISTON_DATA__')[0]

    def by_name(self, data):
        return {p['name']: p for p in data['products']}

    def test_empty_translations_send_no_keys(self):
        plain = self.by_name(self.menu())['Achchiq-chuchuk']
        for key in TRANSLATION_KEYS:
            self.assertNotIn(key, plain, f'{key}: bo\'sh tarjima uchun kalit yuborilmasligi shart')

    def test_filled_translations_arrive_in_the_menu(self):
        full = self.by_name(self.menu())['Palov']
        self.assertEqual((full['name_ru'], full['name_en']), ('Плов', 'Plov'))
        self.assertEqual((full['desc_ru'], full['desc_en']), ('Рис, мясо и морковь', 'Rice, meat and carrots'))
        # o'zbekcha asos o'zgarmaydi
        self.assertEqual((full['name'], full['description']), ('Palov', "Guruch, go'sht va sabzi"))

    def test_only_filled_keys_are_sent(self):
        half = self.by_name(self.menu())['Choy']
        self.assertEqual(half['name_en'], 'Tea')
        for key in ('name_ru', 'desc_ru', 'desc_en'):
            self.assertNotIn(key, half)

    def test_category_names(self):
        cats = {c['name']: c for c in self.menu()['categories']}
        # name_ru == name (katta-kichik harfsiz) -> yuborilmaydi, name_en bo'sh -> yuborilmaydi
        for key in ('name_ru', 'name_en'):
            self.assertNotIn(key, cats['Salatlar'])
        self.assertEqual((cats['Ichimliklar']['name_ru'], cats['Ichimliklar']['name_en']), ('Напитки', 'Drinks'))

    def test_cyrillic_is_sent_as_utf8_not_as_u_escapes(self):
        data, html = self.block('/menu/', '__GULISTON_DATA__')
        self.assertIn('Плов', html)
        self.assertNotIn('\\u041f\\u043b', html)
        self.assertIn('Напитки', html)
        self.assertEqual(self.by_name(data)['Palov']['name_ru'], 'Плов')

    def test_dangerous_characters_stay_escaped_in_translations(self):
        Product.objects.filter(pk=self.plain.pk).update(name_ru='</script><b>&Салат')
        data, html = self.block('/menu/', '__GULISTON_DATA__')
        self.assertNotIn('</script><b>', html)
        self.assertEqual(self.by_name(data)['Achchiq-chuchuk']['name_ru'], '</script><b>&Салат')

    def test_ar_page_carries_the_same_translations(self):
        data, _ = self.block('/ar/', '__GULISTON_AR_DATA__')
        palov = {p['name']: p for p in data['products']}['Palov']
        self.assertEqual((palov['name_ru'], palov['name_en'], palov['desc_ru'], palov['desc_en']),
                         ('Плов', 'Plov', 'Рис, мясо и морковь', 'Rice, meat and carrots'))
        cats = {c['name']: c for c in data['categories']}
        self.assertEqual((cats['Ichimliklar']['name_ru'], cats['Ichimliklar']['name_en']), ('Напитки', 'Drinks'))

    def test_ar_page_sends_no_keys_for_empty_translations_and_copied_category(self):
        Product.objects.filter(pk=self.plain.pk).update(has_3d=True, ar_model='/media/models/s.glb')
        data, _ = self.block('/ar/', '__GULISTON_AR_DATA__')
        salat = {p['name']: p for p in data['products']}['Achchiq-chuchuk']
        for key in TRANSLATION_KEYS:
            self.assertNotIn(key, salat)
        cats = {c['name']: c for c in data['categories']}
        self.assertNotIn('name_ru', cats['Salatlar'])

    def test_translation_change_shows_up_without_clearing_the_cache(self):
        """Mavjud kesh mexanizmi: Product/Category saqlanganda menyu versiyasi oshadi (products/menu_cache.py signallari)."""
        cache.clear()
        client = Client()
        client.get('/menu/')
        before = client.get('/menu/').content.decode()
        self.assertNotIn('Salad Achchiq', before)

        self.plain.name_en = 'Salad Achchiq'
        self.plain.save()
        self.assertIn('Salad Achchiq', client.get('/menu/').content.decode())

        self.copy_cat.name_en = 'Salads'
        self.copy_cat.save()
        self.assertIn('"name_en": "Salads"', client.get('/menu/').content.decode())

        self.plain.description_ru = ''
        self.plain.name_en = ''
        self.plain.save()
        self.assertNotIn('Salad Achchiq', client.get('/menu/').content.decode())

    def test_legacy_cache_path_gives_identical_page(self):
        """MENU_CACHE_PLAIN_DATA=False (eski yo'l) ham tarjimalar bilan baytma-bayt bir xil sahifa beradi."""
        pages = []
        for plain in (True, False):
            cache.clear()
            with override_settings(MENU_CACHE_PLAIN_DATA=plain):
                client = Client()
                client.get('/menu/')
                pages.append(client.get('/menu/').content)
        self.assertEqual(pages[0], pages[1])
        self.assertIn('Плов'.encode(), pages[0])


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class NamesOutsideTheMenuTests(TestCase):
    """Savat, buyurtmalar va bosh sahifa ham taom nomini tanlangan tilda ko'rsatishi uchun server tarjimani yuboradi
    (faqat to'ldirilganlari; savat/buyurtma yozuvi o'zbekcha nomni saqlaydi, tarjima taomdan olinadi)."""

    def setUp(self):
        call_command('create_restaurant', name='Tarjima oshxona', slug='tarjima-o', owner='tarjima-o-ega',
                     password='Tarjima-parol-12', tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='tarjima-o')
        cat = Category.objects.create(name='Milliy', name_uz='Milliy', name_ru='Национальные')
        self.palov = Product.objects.create(shop=self.shop, name='Palov', slug='tr-palov', price=45000, category=cat,
                                            is_available=True, name_ru='Плов', name_en='Pilaf')
        self.somsa = Product.objects.create(shop=self.shop, name='Somsa', slug='tr-somsa', price=9000, category=cat,
                                            is_available=True)

    def test_product_name_translations_is_one_query_and_skips_empty(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        from web.guest_dish import product_name_translations
        with CaptureQueriesContext(connection) as ctx:
            result = product_name_translations([self.palov.id, self.somsa.id, 'x', None])
        self.assertEqual(len(ctx), 1)
        self.assertEqual(result, {self.palov.id: {'name_ru': 'Плов', 'name_en': 'Pilaf'}})
        self.assertEqual(product_name_translations([]), {})

    def test_name_translations_never_leaks_descriptions(self):
        from web.guest_dish import name_translations
        self.palov.description_ru = 'Вкусный'
        self.assertEqual(name_translations(self.palov), {'name_ru': 'Плов', 'name_en': 'Pilaf'})
        self.assertEqual(name_translations(self.somsa), {})

    def test_featured_dishes_carry_translations_and_truncate_descriptions(self):
        from web.tma_views import _featured_dishes
        self.palov.image = 'products/p.jpg'
        self.palov.description_ru = 'я' * 300
        self.palov.save()
        row = _featured_dishes(self.shop)[0]
        self.assertEqual((row['name_ru'], row['name_en']), ('Плов', 'Pilaf'))
        self.assertEqual(len(row['desc_ru']), 110)
