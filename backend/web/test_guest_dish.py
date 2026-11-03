"""Mehmon taom oynasi uchun server ma'lumotlari: vazn, tayyorlash vaqti, "Yangi", bo'lim turi (web/guest_dish.py) va menyu sahifasi."""
import io
import json
import re
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from categories.models import Category
from products.models import Product
from shops.models import Shop
from web.guest_dish import guest_dish_extras, new_dish_cutoff, weight_label


class WeightLabelTests(SimpleTestCase):
    def test_labels(self):
        self.assertEqual(weight_label(350), '350 g')
        self.assertEqual(weight_label(1000), '1 kg')
        self.assertEqual(weight_label(1200), '1.2 kg')
        for empty in (None, 0, -5):
            self.assertEqual(weight_label(empty), '')


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestDishPayloadTests(TestCase):
    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Oyna Oshxona', slug='oyna', owner='oyna-ega', password='Oyna-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='oyna')
        self.main = Category.objects.create(name='Milliy taomlar', name_uz='Milliy taomlar', name_ru='Блюда', sort_order=1)
        self.salad = Category.objects.create(name='Salatlar', name_uz='Salatlar', name_ru='Салаты', sort_order=2)
        self.dessert = Category.objects.create(name='X', name_uz='X', name_ru='X', kind='dessert', sort_order=3)
        self.osh = Product.objects.create(shop=self.shop, name='Osh', slug='oyna-osh', price=Decimal('58000'), category=self.main,
                                          weight_g=350, prep_minutes=15, calories=620, is_featured=True)
        self.salat = Product.objects.create(shop=self.shop, name='Achchiq', slug='oyna-salat', price=Decimal('14000'),
                                            category=self.salad)
        self.tort = Product.objects.create(shop=self.shop, name='Tort', slug='oyna-tort', price=Decimal('30000'),
                                           category=self.dessert, weight_g=1200)

    def data(self):
        cache.clear()
        client = Client()
        client.get('/menu/')
        html = client.get('/menu/').content.decode()
        return json.loads(re.search(r'window\.__GULISTON_DATA__ = (.*?);\n</script>', html, re.S).group(1))

    def test_menu_page_carries_the_dish_sheet_fields(self):
        data = self.data()
        by_name = {p['name']: p for p in data['products']}
        osh, salat, tort = by_name['Osh'], by_name['Achchiq'], by_name['Tort']
        self.assertEqual((osh['weight'], osh['prep_time'], osh['category_kind']), ('350 g', '~15 daq', 'main'))
        self.assertEqual((osh['calories'], by_name['Achchiq']['calories']), ('620 kkal', ''))
        self.assertEqual((salat['weight'], salat['prep_time'], salat['category_kind']), ('', '', 'salad'))
        self.assertEqual((tort['weight'], tort['category_kind']), ('1.2 kg', 'dessert'))
        for p in data['products']:
            self.assertEqual(p['images'], [])  # rasmsiz taom: bo'sh ro'yxat
            self.assertFalse(p['is_new'], 'yangi menyuda hamma taom "Yangi" bo\'lib qolmasin')

    def test_categories_carry_their_kind(self):
        kinds = {c['name']: c['kind'] for c in self.data()['categories']}
        self.assertEqual(kinds['Milliy taomlar'], 'main')
        self.assertEqual(kinds['Salatlar'], 'salad')
        self.assertEqual(kinds['X'], 'dessert')

    def test_new_badge_only_for_recent_dishes_of_an_established_menu(self):
        old = timezone.now() - timedelta(days=60)
        Product.objects.filter(pk__in=[self.osh.pk, self.salat.pk]).update(created_at=old)
        by_name = {p['name']: p for p in self.data()['products']}
        self.assertFalse(by_name['Osh']['is_new'])
        self.assertTrue(by_name['Tort']['is_new'])

    @override_settings(RESTAURANT_NEW_DISH_DAYS=0)
    def test_new_badge_can_be_switched_off(self):
        Product.objects.filter(pk=self.osh.pk).update(created_at=timezone.now() - timedelta(days=60))
        self.assertTrue(all(not p['is_new'] for p in self.data()['products']))


class NewDishCutoffTests(SimpleTestCase):
    def test_cutoff_exists_only_when_some_dish_is_older_than_the_window(self):
        now = timezone.now()

        class P:  # yengil nusxa: faqat created_at kerak
            def __init__(self, days):
                self.created_at = now - timedelta(days=days)

        self.assertIsNone(new_dish_cutoff([P(1), P(3)]))
        self.assertIsNotNone(new_dish_cutoff([P(1), P(40)]))
        self.assertIsNone(new_dish_cutoff([]))

    def test_extras_for_a_dish_without_category(self):
        class P:
            image = image2 = image3 = image4 = ''
            weight_g = None
            prep_minutes = None
            calories = None
            created_at = timezone.now()
            category = None

        extras = guest_dish_extras(P())
        self.assertEqual(extras, {'images': [], 'weight': '', 'prep_time': '', 'calories': '', 'is_new': False, 'category_kind': 'other'})
