"""
S1-1 (TZ T1): `/menu/` keshida model nusxalari o'rniga tayyor JSON satrlar.
Asosiy shart: HTML eski yo'l bilan BAYTMA-BAYT bir xil, ikkala dizaynda ('new', 'classic'); eski yo'l bayroq bilan saqlanadi.
"""
import io
import re
from decimal import Decimal

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from categories.models import Category
from notifications.models import AppSetting
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class MenuPlainCacheTests(TestCase):

    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Plain Oshxona', slug='plain', owner='plain-ega', password='Plain-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='plain')
        self.table = Table.objects.get(shop=self.shop, number='1')
        self.cat1 = Category.objects.create(name='Taomlar', name_uz='Taomlar', name_ru='Блюда', sort_order=1)
        self.cat2 = Category.objects.create(name="Ichimliklar & <b>'sovuq'</b>", name_uz='Ichimliklar', name_ru='Напитки', sort_order=2)
        self.osh = Product.objects.create(
            shop=self.shop, name='Osh', slug='plain-osh', price=Decimal('48000.50'), old_price=Decimal('52000'),
            category=self.cat1, is_available=True, is_featured=True, is_halal=True, description="Qo'y go'shti, sabzi & guruch </script>",
        )
        self.lagmon = Product.objects.create(
            shop=self.shop, name='Лагман "maxsus"', slug='plain-lagmon', price=Decimal('35000'), category=self.cat1,
            is_available=True, unit='porsiya',
        )
        self.choy = Product.objects.create(
            shop=self.shop, name='Choy', slug='plain-choy', price=Decimal('5000'), category=self.cat2, is_available=True,
            has_3d=True, ar_model='/media/models/choy.glb',
        )
        Product.objects.create(shop=self.shop, name='Yashirin', slug='plain-hidden', price=Decimal('1'), category=self.cat1, is_available=False)

    def page(self, plain, design=None, query=''):
        if design is not None:
            AppSetting.objects.update_or_create(key='guest_design', defaults={'value': design, 'category': 'guest'})
        cache.clear()
        with override_settings(MENU_CACHE_PLAIN_DATA=plain):
            client = Client()
            client.get('/menu/' + query)  # isitish: kesh to'ladi
            resp = client.get('/menu/' + query)  # kesh orqali berilgan javob
        self.assertEqual(resp.status_code, 200)
        return resp.content

    def test_html_is_byte_identical_to_legacy_path_in_both_designs(self):
        for design in ('new', 'classic'):
            legacy = self.page(False, design)
            plain = self.page(True, design)
            self.assertEqual(plain, legacy, f"HTML farq qiladi (dizayn={design})")
            self.assertIn(design.encode(), plain)  # dizayn belgisi sahifada (almashtirgich ishlayapti)

    def test_html_identical_with_table_token_in_url(self):
        q = f'?table={self.table.qr_token}'
        self.assertEqual(self.page(True, 'new', q), self.page(False, 'new', q))

    def test_cart_in_session_is_reflected_and_identical(self):
        def run(plain):
            cache.clear()
            with override_settings(MENU_CACHE_PLAIN_DATA=plain):
                client = Client()
                session = client.session
                session['cart'] = {str(self.shop.id): {str(self.osh.id): {'quantity': 3, 'price': 48000, 'name': 'Osh'}}}
                session.save()
                client.get('/menu/')
                return client.get('/menu/').content
        legacy, plain = run(False), run(True)
        self.assertEqual(plain, legacy)
        self.assertRegex(plain.decode(), r'"cart": \{"%d": 3\}' % self.osh.id)

    def test_only_available_dishes_in_page_and_special_chars_are_safe(self):
        html = self.page(True).decode()
        self.assertIn('Osh', html)
        self.assertNotIn('Yashirin', html)
        # </script> JSON ichida sahifani sindirib yuborolmaydi
        data_block = re.search(r'window\.__GULISTON_DATA__ = (.*?);\n</script>', html, re.S).group(1)
        self.assertNotIn('</script>', data_block)
        self.assertIn('\\u003C/script\\u003E', data_block)

    def test_menu_change_shows_up_after_version_bump(self):
        self.assertNotIn('Yangi taom', self.page(True).decode())
        with override_settings(MENU_CACHE_PLAIN_DATA=True):
            client = Client()
            client.get('/menu/')
            Product.objects.create(shop=self.shop, name='Yangi taom', slug='plain-yangi', price=Decimal('9000'),
                                   category=self.cat1, is_available=True)
            self.assertIn('Yangi taom', client.get('/menu/').content.decode())

    def test_cache_stores_only_plain_strings_not_model_instances(self):
        from products.menu_cache import get_menu_version
        cache.clear()
        with override_settings(MENU_CACHE_PLAIN_DATA=True):
            Client().get('/menu/')
        entry = cache.get(f'menu:tma_plain:{self.shop.id}:{get_menu_version(self.shop.id)}')
        self.assertIsNotNone(entry)
        self.assertEqual(set(entry), {'categories_json', 'products_json'})
        self.assertTrue(all(isinstance(v, str) for v in entry.values()))

    def test_legacy_flag_still_uses_old_cache_entry(self):
        from products.menu_cache import get_menu_version
        cache.clear()
        with override_settings(MENU_CACHE_PLAIN_DATA=False):
            Client().get('/menu/')
        entry = cache.get(f'menu:tma:{self.shop.id}:{get_menu_version(self.shop.id)}')
        self.assertIn('featured_products', entry)
        self.assertIsNone(cache.get(f'menu:tma_plain:{self.shop.id}:{get_menu_version(self.shop.id)}'))
