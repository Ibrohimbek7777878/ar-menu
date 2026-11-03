"""Mehmon menyusida internetdan olingan namuna rasm uchun muallif/litsenziya (`image_credit`, `image_source_url`) — faqat to'ldirilganda."""
import io
import json
import re
from decimal import Decimal

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings

from products.models import Product
from shops.models import Shop
from web.guest_dish import guest_dish_extras, guest_image_credit


class _Stub:
    def __init__(self, credit='', url=''):
        self.image_credit = credit
        self.image_source_url = url


class GuestImageCreditUnitTests(SimpleTestCase):
    def test_keys_exist_only_when_filled(self):
        self.assertEqual(guest_image_credit(_Stub()), {})
        self.assertEqual(guest_image_credit(_Stub('', 'https://example.org/x')), {})          # kreditsiz havola ko'rsatilmaydi
        self.assertEqual(guest_image_credit(_Stub('   ')), {})
        self.assertEqual(guest_image_credit(_Stub('Ali · CC BY')), {'image_credit': 'Ali · CC BY'})
        self.assertEqual(guest_image_credit(_Stub(' Ali · CC BY ', ' https://commons.wikimedia.org/wiki/File:X.jpg ')),
                         {'image_credit': 'Ali · CC BY', 'image_source_url': 'https://commons.wikimedia.org/wiki/File:X.jpg'})

    def test_unsafe_link_schemes_are_dropped(self):
        for url in ('javascript:alert(1)', 'data:text/html,x', 'ftp://x/y', '//evil.example.com'):
            with self.subTest(url=url):
                self.assertEqual(guest_image_credit(_Stub('Ali · CC0', url)), {'image_credit': 'Ali · CC0'})

    def test_model_without_fields_is_safe(self):
        self.assertEqual(guest_image_credit(object()), {})


@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class GuestImageCreditMenuTests(TestCase):
    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Kredit Oshxona', slug='kredit', owner='kredit-ega', password='Kredit-parol-123',
                     tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='kredit')
        self.credited = Product.objects.create(
            shop=self.shop, name='Palov', slug='kredit-palov', price=Decimal('45000'), has_real_photo=False,
            image_credit='Boonlong1 · CC BY', image_source_url='https://www.flickr.com/photos/boonlong1/1',
        )
        self.own = Product.objects.create(shop=self.shop, name='Manti', slug='kredit-manti', price=Decimal('30000'), has_real_photo=True)

    def test_extras(self):
        self.assertEqual(guest_dish_extras(self.credited)['image_credit'], 'Boonlong1 · CC BY')
        self.assertEqual(guest_dish_extras(self.credited)['image_source_url'], 'https://www.flickr.com/photos/boonlong1/1')
        own = guest_dish_extras(self.own)
        self.assertNotIn('image_credit', own)
        self.assertNotIn('image_source_url', own)

    def test_menu_page_payload(self):
        cache.clear()
        client = Client()
        client.get('/menu/')
        html = client.get('/menu/').content.decode()
        data = json.loads(re.search(r'window\.__GULISTON_DATA__ = (.*?);\n</script>', html, re.S).group(1))
        by_name = {p['name']: p for p in data['products']}
        self.assertEqual(by_name['Palov']['image_credit'], 'Boonlong1 · CC BY')
        self.assertEqual(by_name['Palov']['image_source_url'], 'https://www.flickr.com/photos/boonlong1/1')
        self.assertNotIn('image_credit', by_name['Manti'])
        self.assertNotIn('image_source_url', by_name['Manti'])
