"""Restoran brendi (TZ_MULTITENANT, Bosqich 2): normallash, qat'iy tekshiruv, PATCH birlashtirish, modullar, atamalar/shablonlar,
logotip yuklash, tenant izolyatsiyasi, mehmon sessiyasi va shablonlardagi CSS, XSS."""
import io
import json
import os
import re
import shutil
import tempfile

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings
from PIL import Image

from accounts.models import AdminUser
from backend.api_input import InputError
from backend.runtime_cache import invalidate_runtime_cache
from orders.models import AuditLog
from shops import brand as brandlib
from shops.brand_image import BrandImageError, process_brand_image
from shops.models import Shop
from shops.test_tenant_kit import PASSWORD, make_tenant, tenant_settings
from web.test_spa_session import session_in

API = '/api/restaurant/admin/v1/settings/'
LOGO = '/api/restaurant/admin/v1/brand/logo/'
PRESET = '/api/restaurant/admin/v1/brand/apply-preset/'

# Shartnoma: GET settings -> brand ning kalitlari (BR2/BR3 shunga tayanadi) + qo'shilgan adjusted* kalitlar
BRAND_KEYS = {'name', 'tagline', 'logo_url', 'favicon_url', 'palette', 'primary_color', 'accent_color', 'adjusted', 'adjusted_from',
              'accent_adjusted', 'accent_adjusted_from', 'font', 'hero', 'contact', 'modules', 'business_type', 'terms'}
PUBLIC_KEYS = {'name', 'tagline', 'logo_url', 'favicon_url', 'palette', 'primary_color', 'font', 'hero', 'contact', 'modules', 'terms'}


def png_bytes(size=(64, 64), color=(200, 30, 30), mode='RGB', fmt='PNG', **save):
    buf = io.BytesIO()
    Image.new(mode, size, color).save(buf, format=fmt, **save)
    return buf.getvalue()


def upload(data, name='logo.png', kind='logo', content_type='image/png'):
    return {'image': SimpleUploadedFile(name, data, content_type=content_type), 'kind': kind}


class ShopRow(dict):
    """build_brand() ga beriladigan Shop ustunlari."""

    def __init__(self, **kw):
        base = {'name': 'Shohjaxon Saroyi', 'phone': '+998901112233', 'phone2': '', 'address': 'Guliston', 'instagram_url': '',
                'working_hours': '08:00-22:00', 'business_type': 'restaurant'}
        super().__init__({**base, **kw})


# ─── 1. O'qish: standartlar va buzuq ma'lumot ────────────────────────────────────────────────────────────────

class BuildBrandTests(SimpleTestCase):

    def test_defaults_follow_the_contract(self):
        brand = brandlib.build_brand(ShopRow(), {}, 7)
        self.assertEqual(set(brand), BRAND_KEYS)
        self.assertEqual(brand['name'], 'Shohjaxon Saroyi')                       # name = Shop.name
        self.assertEqual((brand['palette'], brand['font']), ('classic', 'serif'))
        self.assertEqual(set(brand['modules']), {'menu', 'ar360', 'booking', 'tour', 'orders', 'waiter_call'})
        self.assertTrue(all(brand['modules'].values()))
        self.assertEqual(brand['terms'], {'table': 'Stol', 'guest': 'Mehmon', 'venue': 'Restoran'})
        self.assertEqual(brand['business_type'], 'restaurant')
        self.assertIsNone(brand['logo_url'])
        self.assertIsNone(brand['favicon_url'])
        self.assertEqual(brand['hero'], {'title': '', 'subtitle': '', 'cta_text': ''})
        self.assertEqual(brand['contact']['phone'], '+998901112233')
        self.assertEqual(brand['contact']['hours_text'], '08:00-22:00')           # standart: ish vaqti ustuni
        self.assertEqual((brand['primary_color'], brand['accent_color']), ('#2F4836', '#A9501A'))     # klassik palitra ranglari
        self.assertFalse(brand['adjusted'])

    def test_default_font_is_the_palettes_own_heading_font(self):
        """Apelsin palitra avvaldan Outfit bilan: shrift tanlanmagan bo'lsa u o'zgarmaydi (yangi `data-font` uni bosib ketmasin)."""
        for palette, font in (('classic', 'serif'), ('orange', 'rounded'), ('custom', 'serif')):
            self.assertEqual(brandlib.build_brand(ShopRow(), {'guest_palette': palette}, 1)['font'], font, palette)
        explicit = {'guest_palette': 'orange', 'brand': {'font': 'serif'}}
        self.assertEqual(brandlib.build_brand(ShopRow(), explicit, 1)['font'], 'serif')         # aniq tanlov hamma narsadan ustun

    def test_hero_defaults_follow_the_business_type(self):
        """Restoran: bo'sh (ilovaning o'z tarjima qilingan matni). Kafe va to'yxona: o'z standarti (to'yxonaga restoran matni mos emas)."""
        restaurant = brandlib.build_brand(ShopRow(business_type='restaurant'), {}, 1)
        self.assertEqual(restaurant['hero'], {'title': '', 'subtitle': '', 'cta_text': ''})
        self.assertNotIn('hero_i18n', restaurant)
        cafe = brandlib.build_brand(ShopRow(business_type='cafe'), {}, 1)
        banquet = brandlib.build_brand(ShopRow(business_type='banquet'), {}, 1)
        self.assertIn('Qahva', cafe['hero']['title'])
        self.assertIn("to'y", banquet['hero']['title'])
        for brand in (cafe, banquet):
            self.assertTrue(brand['hero']['title'] and brand['hero']['subtitle'])
            self.assertEqual(brand['hero']['cta_text'], '')                       # tugma matni: ilovaning tarjima qilingan standarti
            self.assertNotIn("Haqiqiy o'zbek ta'mi", brand['hero']['title'] + brand['hero']['subtitle'])
            self.assertEqual(set(brand['hero_i18n']), {'ru', 'en'})
            self.assertEqual(set(brand['hero_i18n']['ru']), {'title', 'subtitle'})
        self.assertNotEqual(cafe['hero']['title'], banquet['hero']['title'])

    def test_preset_hero_texts_fit_the_limits_and_every_language_is_complete(self):
        for kind, preset in brandlib.BUSINESS_PRESETS.items():
            for key, text in preset['hero'].items():
                self.assertLessEqual(len(text), brandlib.HERO_LIMITS[key], (kind, key))
                self.assertEqual(sorted(l for l in preset['hero_i18n'] if key in preset['hero_i18n'][l]), ['en', 'ru'], (kind, key))
                for lang in ('ru', 'en'):
                    self.assertLessEqual(len(preset['hero_i18n'][lang][key]), brandlib.HERO_LIMITS[key], (kind, key, lang))

    def test_owner_text_wins_over_the_preset_default_and_is_not_translated(self):
        profile = {'brand': {'hero': {'title': 'Bizning zal'}}}
        brand = brandlib.build_brand(ShopRow(business_type='banquet'), profile, 1)
        self.assertEqual(brand['hero']['title'], 'Bizning zal')
        self.assertNotIn('title', brand['hero_i18n']['ru'])                       # egasi yozgan matn tarjima qilinmaydi
        self.assertIn('subtitle', brand['hero_i18n']['ru'])                       # yozilmagan maydon hamon standartda
        full = {'brand': {'hero': {'title': 'A', 'subtitle': 'B'}}}
        self.assertNotIn('hero_i18n', brandlib.build_brand(ShopRow(business_type='banquet'), full, 1))

    def test_business_type_templates(self):
        for kind, venue, table in (('restaurant', 'Restoran', 'Stol'), ('cafe', 'Kafe', 'Stol'), ('banquet', "To'yxona", 'Zal/Stol')):
            brand = brandlib.build_brand(ShopRow(business_type=kind), {}, 1)
            self.assertEqual(brand['terms'], {'table': table, 'guest': 'Mehmon', 'venue': venue}, kind)
        self.assertEqual(brandlib.build_brand(ShopRow(business_type='hotel'), {}, 1)['business_type'], 'restaurant')

    def test_garbage_in_the_database_never_breaks_the_brand(self):
        garbage = {'brand': {'tagline': 5, 'font': 'comic', 'hero': 'x', 'modules': {'menu': 'ha', 'booking': False, 'zzz': True},
                             'terms': {'table': '', 'guest': ['x'], 'venue': 'A' * 100}, 'primary_color': 'red', 'accent_color': {},
                             'logo_path': '../../etc/passwd', 'favicon_path': 5, 'telegram': [], 'website': None, 'hours_text': 3},
                   'guest_palette': 'neon'}
        for profile in (garbage, {'brand': 'x'}, {'brand': []}, 'oddiy matn', None, 5, {'brand': {'modules': {k: False for k in brandlib.MODULE_KEYS}}}):
            brand = brandlib.build_brand(ShopRow(), profile, 1)
            self.assertEqual(set(brand), BRAND_KEYS)
            self.assertEqual(brand['font'], 'serif')
            self.assertEqual(brand['palette'], 'classic')
            self.assertIsNone(brand['logo_url'])
            self.assertTrue(any(brand['modules'].values()))       # hamma bo'lim o'chiq ma'lumot saytni bo'sh qoldirmaydi
            self.assertLessEqual(len(brand['terms']['venue']), 24)
        brand = brandlib.build_brand(ShopRow(), garbage, 1)
        self.assertFalse(brand['modules']['booking'])
        self.assertEqual(brand['terms']['table'], 'Stol')

    def test_a_logo_path_of_another_restaurant_is_never_served(self):
        path = 'brand/shop_9/logo-0123456789ab.webp'
        profile = {'brand': {'logo_path': path}}
        self.assertIsNotNone(brandlib.build_brand(ShopRow(), profile, 9)['logo_url'])
        self.assertIsNone(brandlib.build_brand(ShopRow(), profile, 8)['logo_url'])
        for bad in ('brand/shop_8/../shop_9/logo-0123456789ab.webp', 'brand/shop_8/logo-0123456789ab.svg', '/etc/passwd',
                    'brand/shop_8/logo-XYZ.webp', 'media/brand/shop_8/logo-0123456789ab.webp', 'http://evil/x.webp'):
            self.assertIsNone(brandlib.build_brand(ShopRow(), {'brand': {'logo_path': bad}}, 8)['logo_url'], bad)

    def test_custom_palette_reports_adjusted_colors(self):
        profile = {'guest_palette': 'custom', 'brand': {'primary_color': '#FFD400', 'accent_color': '#2F4836'}}
        brand = brandlib.build_brand(ShopRow(), profile, 1)
        self.assertTrue(brand['adjusted'])
        self.assertEqual(brand['adjusted_from'], '#FFD400')
        self.assertNotEqual(brand['primary_color'], '#FFD400')
        self.assertFalse(brand['accent_adjusted'])

    def test_public_brand_is_small_and_has_no_admin_fields(self):
        brand = brandlib.public_brand(brandlib.build_brand(ShopRow(), {}, 1))
        self.assertEqual(set(brand), PUBLIC_KEYS)
        self.assertLess(len(json.dumps(brand)), 1200)


# ─── 2. Qat'iy tekshiruv ─────────────────────────────────────────────────────────────────────────────────────

def validate(data, **kw):
    return brandlib.validate_brand_patch(data, current_name=kw.pop('current_name', 'Eski nom'), **kw)


class ValidationTests(SimpleTestCase):

    def assertField(self, data, field, **kw):
        with self.assertRaises(InputError) as ctx:
            validate(data, **kw)
        self.assertEqual(ctx.exception.detail.get('field'), field, data)

    def test_name_limits(self):
        self.assertEqual(validate({'name': 'A' * 60}).shop_fields['name'], 'A' * 60)
        self.assertField({'name': 'A' * 61}, 'brand.name')
        self.assertField({'name': '   '}, 'brand.name')
        self.assertField({'name': None}, 'brand.name')
        self.assertField({'name': ['x']}, 'brand.name')
        self.assertEqual(validate({'name': '  Bahor   Cafe '}).shop_fields['name'], 'Bahor Cafe')    # bo'shliqlar yig'iladi
        # eski uzun nom o'zgarmasdan qaytsa 400 emas
        long_name = 'B' * 100
        self.assertEqual(validate({'name': long_name}, current_name=long_name).shop_fields['name'], long_name)

    def test_text_lengths(self):
        self.assertField({'tagline': 'x' * 121}, 'brand.tagline')
        self.assertField({'hero': {'title': 'x' * 81}}, 'brand.hero.title')
        self.assertField({'hero': {'subtitle': 'x' * 241}}, 'brand.hero.subtitle')
        self.assertField({'hero': {'cta_text': 'x' * 41}}, 'brand.hero.cta_text')
        self.assertField({'terms': {'table': 'x' * 25}}, 'brand.terms.table')
        self.assertField({'contact': {'hours_text': 'x' * 161}}, 'brand.contact.hours_text')
        self.assertField({'contact': {'address': 'x' * 301}}, 'brand.contact.address')
        self.assertField({'contact': {'website': 'https://shohjaxon.uz/' + 'a' * 100}}, 'brand.contact.website')      # 120 belgidan uzun havola ilovada kesilardi
        validate({'tagline': 'x' * 120, 'hero': {'title': 'x' * 80, 'subtitle': 'x' * 240, 'cta_text': 'x' * 40},
                  'contact': {'hours_text': 'x' * 160, 'address': 'x' * 300, 'website': 'https://shohjaxon.uz/' + 'a' * 90}})

    def test_control_and_direction_characters_are_rejected(self):
        for bad in ('Nom\x07', 'Nom\x1b[31m', 'Nom‮evil', 'Nom⁦x', 'Nom﻿'):
            self.assertField({'name': bad}, 'brand.name')
            self.assertField({'tagline': bad}, 'brand.tagline')
        self.assertEqual(validate({'tagline': 'Bir\nikki\tuch'}).brand['tagline'], 'Bir ikki uch')

    def test_unknown_keys_are_rejected_but_read_only_keys_are_ignored(self):
        self.assertField({'foo': 1}, 'brand.foo')
        self.assertField({'hero': {'x': 'y'}}, 'brand.hero.x')
        self.assertField({'contact': {'fax': '1'}}, 'brand.contact.fax')
        self.assertField({'modules': {'spa': True}}, 'brand.modules.spa')
        self.assertField({'terms': {'room': 'x'}}, 'brand.terms.room')
        echoed = {'logo_url': '/media/x.webp', 'favicon_url': None, 'business_type': 'cafe', 'adjusted': True, 'adjusted_from': '#FFF',
                  'accent_adjusted': False, 'accent_adjusted_from': None}
        patch = validate(echoed)                                        # javobni o'zgartirmay qaytarish 400 bermaydi
        self.assertEqual((patch.shop_fields, patch.brand, patch.nested), ({}, {}, {}))
        for bad in ('x', [], 5, None):
            self.assertField(bad, 'brand')
            self.assertField({'hero': bad}, 'brand.hero')
            self.assertField({'modules': bad}, 'brand.modules')

    def test_palette_and_font_choices(self):
        for value in ('classic', 'orange', 'custom', ' Custom '):
            validate({'palette': value})
        for value in ('neon', '', None, 5, ['classic']):
            self.assertField({'palette': value}, 'brand.palette')
        for value in ('serif', 'sans', 'rounded'):
            validate({'font': value})
        for value in ('comic', '', None, 'Arial'):
            self.assertField({'font': value}, 'brand.font')

    def test_colors_are_validated_strictly_and_normalised(self):
        self.assertEqual(validate({'primary_color': '#abc'}).colors, {'primary_color': '#AABBCC'})
        self.assertEqual(validate({'accent_color': ''}).colors, {'accent_color': None})        # bo'sh = olib tashlash
        for bad in ('red', '2F4836', '#12345', '#GGGGGG', 'rgb(1,2,3)', '#fff;}', 5, ['#fff'], {}):
            self.assertField({'primary_color': bad}, 'brand.primary_color')
            self.assertField({'accent_color': bad}, 'brand.accent_color')

    def test_modules(self):
        patch = validate({'modules': {'booking': False, 'tour': 'false', 'orders': 1}})
        self.assertEqual(patch.nested['modules'], {'booking': False, 'tour': False, 'orders': True})
        self.assertField({'modules': {'booking': 'maybe'}}, 'brand.modules.booking')
        self.assertField({'modules': {'menu': []}}, 'brand.modules.menu')
        self.assertField({'modules': {k: False for k in brandlib.MODULE_KEYS}}, 'brand.modules')
        # saqlangan o'chirilganlar bilan birga ham hammasi o'chib qolmasin
        stored = {'brand': {'modules': {k: False for k in brandlib.MODULE_KEYS if k != 'menu'}}}
        self.assertField({'modules': {'menu': False}}, 'brand.modules', profile=stored)
        validate({'modules': {'menu': False, 'booking': True}}, profile=stored)

    def test_contact_formats(self):
        ok = validate({'contact': {
            'phone': '+998 90 123 45 67', 'phone2': '', 'instagram': '@shohjaxon.saroyi', 'telegram': 'https://t.me/shoh_saroy',
            'website': 'shohjaxon.uz/menu?lang=uz', 'hours_text': 'Har kuni 10:00-23:00', 'address': 'Guliston, Sirdaryo'}})
        self.assertEqual(ok.shop_fields['phone'], '+998 90 123 45 67')
        self.assertEqual(ok.shop_fields['instagram_url'], 'https://www.instagram.com/shohjaxon.saroyi')
        self.assertEqual(ok.brand['telegram'], 'https://t.me/shoh_saroy')
        self.assertEqual(ok.brand['website'], 'https://shohjaxon.uz/menu?lang=uz')
        for raw, expected in (('shohjaxon', 'https://www.instagram.com/shohjaxon'),
                              ('https://instagram.com/shohjaxon/?hl=uz', 'https://www.instagram.com/shohjaxon'),
                              ('www.instagram.com/shohjaxon', 'https://www.instagram.com/shohjaxon'),
                              ('http://instagram.com/shohjaxon', 'https://www.instagram.com/shohjaxon'),
                              ('', '')):
            self.assertEqual(validate({'contact': {'instagram': raw}}).shop_fields['instagram_url'], expected, raw)
        for raw, expected in (('@shoh_saroy', 'https://t.me/shoh_saroy'), ('t.me/shoh_saroy', 'https://t.me/shoh_saroy'),
                              ('https://telegram.me/shoh_saroy', 'https://t.me/shoh_saroy')):
            self.assertEqual(validate({'contact': {'telegram': raw}}).brand['telegram'], expected, raw)

    def test_bad_contact_values(self):
        bad = {
            'phone': ['+998 9', '+998 90 123 45 67 89 01 23', 'abc', '12', '+998;DROP', '<script>'], 'phone2': ['telefon'],
            'instagram': ['https://evil.com/shohjaxon', 'javascript:alert(1)', 'https://user:pw@instagram.com/x', 'a b', '@' + 'x' * 31,
                          'https://instagram.com/', 'instagram.com', '@@x', 'https://instagram.com:8080/x'],
            'telegram': ['@abc', 'https://t.me/', 'https://evil.com/shohjaxon', '@shoh saroy', 'javascript:alert(1)'],
            'website': ['http://shohjaxon.uz', 'javascript:alert(1)', 'ftp://shohjaxon.uz', 'https://user@shohjaxon.uz',
                        'https://shohjaxon.uz:8443', 'localhost', 'shohjaxon', 'https://shohjaxon.uz/<script>', "https://shohjaxon.uz/'x",
                        'https://xn--тест.uz', 'data:text/html,hi', 'https://shohjaxon.uz/a b'],
        }
        for key, values in bad.items():
            for value in values:
                self.assertField({'contact': {key: value}}, f'brand.contact.{key}')

    def test_validation_is_all_or_nothing_inside_one_call(self):
        # birinchi bo'lak to'g'ri, ikkinchisi noto'g'ri: umuman natija qaytmaydi (xato ko'tariladi)
        self.assertField({'name': 'Yangi', 'hero': {'title': 'x' * 100}}, 'brand.hero.title')


# ─── 3. API: GET/PATCH ───────────────────────────────────────────────────────────────────────────────────────

@override_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class BrandApiBase(TestCase):

    def setUp(self):
        cache.clear()
        call_command('create_restaurant', name='Shohjaxon Saroyi', slug='shohjaxon', owner='shoh-ega', password='Shoh-parol-123',
                     tables=2, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='shohjaxon')
        self.owner = AdminUser.objects.get(username='shoh-ega')
        self.owner.is_approved = True
        self.owner.save(update_fields=['is_approved'])
        self.waiter = AdminUser.objects.create_user(username='shoh-ofitsiant', password='Ofitsiant-123', role='waiter',
                                                    shop=self.shop, is_approved=True)
        self.owner_client = Client()
        self.owner_client.force_login(self.owner)
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)
        self.media = tempfile.mkdtemp(prefix='brand-media-')
        self.addCleanup(shutil.rmtree, self.media, True)
        self.enterContext(override_settings(MEDIA_ROOT=self.media))

    def patch(self, brand=None, client=None, **top):
        body = dict(top)
        if brand is not None:
            body['brand'] = brand
        return (client or self.owner_client).patch(API, body, content_type='application/json')

    def get_brand(self, client=None):
        res = (client or self.owner_client).get(API)
        self.assertEqual(res.status_code, 200)
        return res.json()['brand']

    def reload(self):
        self.shop.refresh_from_db()
        return self.shop


class SettingsBrandTests(BrandApiBase):

    def test_get_returns_the_full_brand_shape(self):
        brand = self.get_brand()
        self.assertEqual(set(brand), BRAND_KEYS)
        self.assertEqual(brand['name'], 'Shohjaxon Saroyi')
        self.assertEqual(brand['palette'], 'classic')
        self.assertEqual(self.owner_client.get(API).json()['guest_palette'], 'classic')

    def test_patch_merges_nested_objects_instead_of_replacing(self):
        self.assertEqual(self.patch({'hero': {'title': 'Xush kelibsiz'}}).status_code, 200)
        self.assertEqual(self.patch({'hero': {'subtitle': 'Oilaviy dasturxon'}}).status_code, 200)
        self.assertEqual(self.patch({'contact': {'telegram': '@shoh_saroy'}}).status_code, 200)
        res = self.patch({'contact': {'website': 'https://shohjaxon.uz'}, 'modules': {'tour': False}})
        brand = res.json()['brand']
        self.assertEqual(brand['hero'], {'title': 'Xush kelibsiz', 'subtitle': 'Oilaviy dasturxon', 'cta_text': ''})
        self.assertEqual(brand['contact']['telegram'], 'https://t.me/shoh_saroy')
        self.assertEqual(brand['contact']['website'], 'https://shohjaxon.uz')
        self.assertEqual(brand['modules'], {**{k: True for k in brandlib.MODULE_KEYS}, 'tour': False})
        self.patch({'modules': {'booking': False}})
        modules = self.get_brand()['modules']
        self.assertEqual((modules['tour'], modules['booking'], modules['menu']), (False, False, True))
        self.patch({'hero': {'title': ''}})                              # bo'sh = olib tashlash (standartga qaytadi)
        self.assertEqual(self.get_brand()['hero']['title'], '')
        self.assertEqual(self.get_brand()['hero']['subtitle'], 'Oilaviy dasturxon')

    def test_name_and_contacts_are_stored_in_the_existing_shop_columns(self):
        res = self.patch({'name': 'Yangi Saroy', 'tagline': 'Saroyi · Restoran',
                          'contact': {'phone': '+998 90 111 22 33', 'phone2': '+998 71 200 00 00', 'address': 'Guliston, Mustaqillik 1',
                                      'instagram': '@yangi_saroy', 'hours_text': 'Har kuni 10:00-23:00'}})
        self.assertEqual(res.status_code, 200, res.content)
        shop = self.reload()
        self.assertEqual((shop.name, shop.phone, shop.phone2, shop.address), ('Yangi Saroy', '+998 90 111 22 33', '+998 71 200 00 00',
                                                                              'Guliston, Mustaqillik 1'))
        self.assertEqual(shop.instagram_url, 'https://www.instagram.com/yangi_saroy')
        self.assertEqual(shop.working_hours, '08:00-22:00')              # amaldagi ish vaqti (buyurtma darvozasi) o'zgarmaydi
        brand = res.json()['brand']
        self.assertEqual((brand['name'], brand['tagline'], brand['contact']['hours_text']), ('Yangi Saroy', 'Saroyi · Restoran',
                                                                                              'Har kuni 10:00-23:00'))
        self.assertEqual(res.json()['name'], 'Yangi Saroy')              # eski kalit ham yangi nomni ko'rsatadi (yagona manba)

    def test_invalid_values_return_400_with_the_exact_field_and_save_nothing(self):
        before = (self.reload().name, dict(self.shop.business_profile))
        cases = [
            ({'name': 'x' * 61}, 'brand.name'), ({'hero': {'title': 'x' * 81}}, 'brand.hero.title'),
            ({'primary_color': 'red'}, 'brand.primary_color'), ({'font': 'comic'}, 'brand.font'),
            ({'contact': {'website': 'http://x.uz'}}, 'brand.contact.website'), ({'modules': {'booking': 'ehtimol'}}, 'brand.modules.booking'),
            ({'terms': {'table': 'x' * 30}}, 'brand.terms.table'), ({'zzz': 1}, 'brand.zzz'), ('matn', 'brand'),
            ({'name': 'Yaxshi nom', 'hero': {'title': 'x' * 99}}, 'brand.hero.title'),
        ]
        for brand, field in cases:
            res = self.patch(brand)
            self.assertEqual(res.status_code, 400, brand)
            self.assertEqual(res.json().get('field'), field, brand)
        self.assertEqual((self.reload().name, dict(self.shop.business_profile)), before)

    def test_custom_palette_with_a_bad_color_is_adjusted_and_reported(self):
        res = self.patch({'palette': 'custom', 'primary_color': '#ffd400', 'accent_color': '#FFC107'})
        self.assertEqual(res.status_code, 200, res.content)
        brand = res.json()['brand']
        self.assertEqual(brand['palette'], 'custom')
        self.assertTrue(brand['adjusted'])
        self.assertEqual(brand['adjusted_from'], '#FFD400')
        self.assertTrue(brand['accent_adjusted'])
        self.assertEqual(brand['accent_adjusted_from'], '#FFC107')
        from shops import brand_color as bc
        for color in (brand['primary_color'], brand['accent_color']):
            self.assertGreaterEqual(bc.contrast_ratio(color, '#FFFFFF'), 4.5)
            self.assertGreaterEqual(bc.contrast_ratio(color, bc.CREAM), 4.5)
        shop = self.reload()
        self.assertEqual(shop.business_profile['brand']['primary_color'], brand['primary_color'])      # saqlangan = ishlayotgan
        self.assertEqual(shop.business_profile['guest_palette'], 'custom')
        self.assertEqual((shop.color_primary, shop.color_accent), (brand['primary_color'], brand['accent_color']))   # eski ustunlarga nusxa
        again = self.get_brand()                                         # keyingi GET: endi to'qlashtirish kerak emas
        self.assertFalse(again['adjusted'])
        self.assertIsNone(again['adjusted_from'])
        self.assertEqual(again['primary_color'], brand['primary_color'])

    def test_good_custom_color_is_stored_as_typed_and_not_flagged(self):
        res = self.patch({'palette': 'custom', 'primary_color': '#8b1e3f'})
        brand = res.json()['brand']
        self.assertEqual((brand['primary_color'], brand['adjusted'], brand['adjusted_from']), ('#8B1E3F', False, None))
        self.assertEqual(self.patch({'accent_color': ''}).json()['brand']['accent_color'], '#8B1E3F')      # bo'sh = primary'dan hosila

    def test_switching_to_custom_without_colors_starts_from_the_current_palette(self):
        self.patch(guest_palette='orange')
        brand = self.patch({'palette': 'custom'}).json()['brand']
        self.assertEqual(brand['palette'], 'custom')
        self.assertTrue(brand['accent_adjusted'])                       # apelsin palitraning pushti urg'usi krem fonda 4.5 dan past edi
        self.assertEqual(brand['accent_adjusted_from'], '#E11D48')
        stored = self.reload().business_profile['brand']
        self.assertIn('primary_color', stored)
        self.assertEqual(stored['primary_color'].upper(), brand['primary_color'].upper())

    def test_old_palette_key_accepts_custom_and_stays_the_single_source(self):
        res = self.patch(guest_palette='custom')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.get_brand()['palette'], 'custom')
        self.patch({'palette': 'orange'})
        self.assertEqual(self.owner_client.get(API).json()['guest_palette'], 'orange')
        res = self.patch(guest_palette='neon')
        self.assertEqual((res.status_code, res.json()['field']), (400, 'guest_palette'))

    def test_other_settings_survive_a_brand_patch_and_vice_versa(self):
        self.patch(service_fee_percent=7, guest_languages='uz,ru')
        self.patch({'tagline': 'Salom'})
        self.patch(auto_accept_orders=True)
        data = self.owner_client.get(API).json()
        self.assertEqual((data['service_fee_percent'], data['guest_languages'], data['auto_accept_orders']), (7.0, 'uz,ru', True))
        self.assertEqual(data['brand']['tagline'], 'Salom')

    def test_one_request_can_change_brand_and_settings_together(self):
        res = self.patch({'tagline': 'Birga'}, service_fee_percent=5, guest_palette='orange')
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.json()['service_fee_percent'], res.json()['brand']['palette'], res.json()['brand']['tagline']),
                         (5.0, 'orange', 'Birga'))

    def test_waiter_and_anonymous_cannot_read_or_change_the_brand(self):
        waiter = Client()
        waiter.force_login(self.waiter)
        self.assertEqual(waiter.get(API).status_code, 403)
        self.assertEqual(self.patch({'name': 'Hack'}, client=waiter).status_code, 403)
        self.assertEqual(waiter.post(PRESET, {'business_type': 'cafe'}, content_type='application/json').status_code, 403)
        self.assertEqual(waiter.post(LOGO, upload(png_bytes())).status_code, 403)
        anon = Client()
        self.assertIn(anon.get(API).status_code, (401, 403))
        self.assertIn(self.patch({'name': 'Hack'}, client=anon).status_code, (401, 403))
        self.assertEqual(self.reload().name, 'Shohjaxon Saroyi')

    def test_every_change_is_audited_without_values_of_secrets(self):
        self.patch({'tagline': 'Audit'})
        entry = AuditLog.objects.filter(action_type='shop_settings_updated').order_by('-id').first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.new_value.get('brand_keys'), ['tagline'])


# ─── 4. Atamalar, shablonlar, modullar ───────────────────────────────────────────────────────────────────────

class PresetAndModuleTests(BrandApiBase):

    def test_terms_can_be_customised_per_key_and_reset_by_empty_text(self):
        brand = self.patch({'terms': {'table': 'Xona'}}).json()['brand']
        self.assertEqual(brand['terms'], {'table': 'Xona', 'guest': 'Mehmon', 'venue': 'Restoran'})
        brand = self.patch({'terms': {'table': ''}}).json()['brand']
        self.assertEqual(brand['terms']['table'], 'Stol')

    def test_apply_preset_sets_type_terms_and_modules_and_confirms(self):
        self.patch({'terms': {'guest': 'Aziz mehmon'}, 'modules': {'tour': False}})
        res = self.owner_client.post(PRESET, {'business_type': 'banquet'}, content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body['brand']['business_type'], 'banquet')
        self.assertEqual(body['brand']['terms'], {'table': 'Zal/Stol', 'guest': 'Mehmon', 'venue': "To'yxona"})
        self.assertTrue(all(body['brand']['modules'].values()))
        confirmation = body['confirmation']
        self.assertEqual(confirmation['business_type'], 'banquet')
        self.assertEqual(confirmation['previous_business_type'], 'restaurant')
        self.assertEqual(confirmation['applied']['terms']['venue'], "To'yxona")
        self.assertEqual(confirmation['previous']['terms'], {'guest': 'Aziz mehmon'})       # oldingi o'zgartirishlar qaytadi (yo'qolmaydi)
        self.assertEqual(confirmation['previous']['modules'], {'tour': False})
        self.assertEqual(self.reload().business_type, 'banquet')
        self.assertTrue(AuditLog.objects.filter(action_type='brand_preset_applied').exists())

    def test_preset_does_not_touch_colors_logo_or_texts(self):
        self.patch({'palette': 'custom', 'primary_color': '#8B1E3F', 'tagline': 'Bir', 'hero': {'title': 'Salom'}})
        brand = self.owner_client.post(PRESET, {'business_type': 'cafe'}, content_type='application/json').json()['brand']
        self.assertEqual((brand['palette'], brand['primary_color'], brand['tagline'], brand['hero']['title']),
                         ('custom', '#8B1E3F', 'Bir', 'Salom'))
        self.assertEqual(brand['terms']['venue'], 'Kafe')

    def test_apply_preset_gives_the_new_type_its_own_home_page_texts(self):
        self.patch({'hero': {'title': "O'z sarlavhamiz"}})
        res = self.owner_client.post(PRESET, {'business_type': 'banquet'}, content_type='application/json').json()
        self.assertEqual(res['brand']['hero']['title'], "O'z sarlavhamiz")                          # egasi yozgani saqlanadi
        self.assertIn('zalda', res['confirmation']['applied']['hero']['title'])
        self.assertIn("Zal va stollarni", res['brand']['hero']['subtitle'])                        # yozilmaganiga to'yxona standarti
        page = session_in(Client().get('/menu/').content.decode())['brand']
        self.assertEqual(set(page['hero_i18n']), {'ru', 'en'})
        self.assertEqual(set(page['hero_i18n']['ru']), {'subtitle'})
        back = self.owner_client.post(PRESET, {'business_type': 'restaurant'}, content_type='application/json').json()
        self.assertEqual(back['brand']['hero']['subtitle'], '')                                    # restoran: ilovaning o'z matni
        self.assertNotIn('hero_i18n', back['brand'])

    def test_clearing_a_hero_field_returns_the_type_default(self):
        self.owner_client.post(PRESET, {'business_type': 'cafe'}, content_type='application/json')
        default = self.get_brand()['hero']['title']
        self.assertEqual(self.patch({'hero': {'title': 'Boshqa'}}).json()['brand']['hero']['title'], 'Boshqa')
        self.assertEqual(self.patch({'hero': {'title': ''}}).json()['brand']['hero']['title'], default)

    def test_unknown_preset_is_rejected(self):
        for bad in ('hotel', '', None, ['cafe']):
            res = self.owner_client.post(PRESET, {'business_type': bad}, content_type='application/json')
            self.assertEqual(res.status_code, 400, bad)
            self.assertEqual(res.json()['field'], 'business_type')
        self.assertEqual(self.reload().business_type, 'restaurant')

    def test_disabling_the_booking_module_closes_online_booking_on_the_server_too(self):
        guest = Client()
        self.assertTrue(guest.get('/api/restaurant/guest/booking/config/').json()['enabled'])
        self.patch({'modules': {'booking': False}})
        config = guest.get('/api/restaurant/guest/booking/config/').json()
        self.assertFalse(config['enabled'])
        self.assertEqual(config['halls'], [])
        res = guest.get('/api/restaurant/guest/booking/availability/?date=2099-01-01&guests=2')
        self.assertEqual((res.status_code, res.json().get('code')), (403, 'booking_disabled'))
        res = guest.post('/api/restaurant/guest/booking/', json.dumps({'table_id': 1}), content_type='application/json')
        self.assertEqual(res.status_code, 403)
        self.patch({'modules': {'booking': True}})
        self.assertTrue(guest.get('/api/restaurant/guest/booking/config/').json()['enabled'])


# ─── 5. Mehmon sessiyasi va shablonlar ───────────────────────────────────────────────────────────────────────

class GuestPageTests(BrandApiBase):

    def page(self, url='/menu/', client=None):
        return (client or Client()).get(url).content.decode()

    def test_session_always_carries_a_compact_public_brand(self):
        session = session_in(self.page())
        brand = session['brand']
        self.assertEqual(set(brand), PUBLIC_KEYS)
        self.assertEqual((brand['name'], brand['palette'], brand['font']), ('Shohjaxon Saroyi', 'classic', 'serif'))
        self.assertNotIn('adjusted', brand)
        self.assertNotIn('business_type', brand)
        self.assertLess(len(json.dumps(brand)), 1200)

    def test_brand_changes_show_up_on_the_guest_page_immediately(self):
        self.patch({'name': 'Yangi Nom', 'tagline': 'Teglayn', 'hero': {'title': 'Xush kelibsiz'}, 'modules': {'tour': False},
                    'terms': {'table': 'Xona'}, 'font': 'rounded'})
        html = self.page()
        brand = session_in(html)['brand']
        self.assertEqual((brand['name'], brand['tagline'], brand['hero']['title'], brand['modules']['tour'], brand['terms']['table']),
                         ('Yangi Nom', 'Teglayn', 'Xush kelibsiz', False, 'Xona'))
        self.assertIn('data-font="rounded"', html)

    def test_default_pages_have_no_brand_style_block(self):
        html = self.page()
        self.assertIn('data-palette="classic"', html)
        self.assertIn('data-font="serif"', html)
        self.assertNotIn('id="brand-vars"', html)
        self.patch(guest_palette='orange')
        html = self.page()
        self.assertIn('data-palette="orange"', html)
        self.assertIn('data-font="rounded"', html)                     # apelsin palitraning o'z shrifti (Outfit) o'zgarmaydi
        self.assertNotIn('id="brand-vars"', html)
        self.patch({'font': 'serif'})
        self.assertIn('data-font="serif"', self.page())                # lekin egasi aniq tanlasa, tanlov g'olib

    def test_custom_palette_renders_the_style_block_after_all_styles(self):
        self.patch({'palette': 'custom', 'primary_color': '#8B1E3F', 'accent_color': '#B45309'})
        html = self.page()
        self.assertIn('data-palette="custom"', html)
        self.assertEqual(html.count('id="brand-vars"'), 1)
        match = re.search(r'<style id="brand-vars">(.*?)</style>', html, re.S)
        css = match.group(1)
        self.assertIn("html[data-palette='custom']{", css)
        self.assertIn("html[data-palette='custom'][data-theme='dark']{", css)
        self.assertIn('--brand-primary:#8B1E3F', css)
        self.assertIn('--brand-primary-rgb:139 30 63', css)
        self.assertNotIn('--bg-primary', css)                           # neytral tokenlarni sahifaning o'z stillari beradi
        self.assertNotIn('--action:', css)                              # admin tokenlari mehmon sahifasida yo'q
        self.assertGreater(html.index('id="brand-vars"'), html.rindex('rel="stylesheet"'))     # barcha stillardan keyin
        self.assertLess(html.index('id="brand-vars"'), html.index('</head>'))
        self.assertEqual(session_in(html)['brand']['palette'], 'custom')
        self.assertEqual(session_in(html)['palette'], 'custom')

    def test_admin_shell_and_login_get_admin_scoped_tokens(self):
        self.patch({'palette': 'custom', 'primary_color': '#8B1E3F'})
        shell = self.page('/ra/', self.owner_client)
        self.assertIn('data-palette="custom"', shell)
        css = re.search(r'<style id="brand-vars">(.*?)</style>', shell, re.S).group(1)
        self.assertIn('--action:#8B1E3F', css)
        self.assertNotIn('--text-muted', css)                           # admin o'z neytral tokenlarini saqlaydi
        self.assertNotIn('--brand-primary:', css)                       # mehmon tokenlari admin qobig'ida yo'q
        login = self.page('/admin/login/')
        self.assertIn('data-palette="custom"', login)
        self.assertIn('--action:#8B1E3F', re.search(r'<style id="brand-vars">(.*?)</style>', login, re.S).group(1))

    def test_malicious_color_in_the_database_cannot_inject_css_or_html(self):
        evil = "red;}</style><script>alert(1)</script>"
        profile = dict(self.shop.business_profile or {})
        profile.update({'guest_palette': 'custom', 'brand': {'primary_color': evil, 'accent_color': '#fff;}body{display:none}',
                                                              'font': '</html>', 'tagline': '<img src=x>'}})
        Shop.objects.filter(pk=self.shop.pk).update(business_profile=profile)
        invalidate_runtime_cache()
        for url, client in (('/menu/', Client()), ('/admin/login/', Client()), ('/ra/', self.owner_client)):
            html = self.page(url, client)
            css = re.search(r'<style id="brand-vars">(.*?)</style>', html, re.S).group(1)
            self.assertNotIn('<', css)
            self.assertNotIn('display:none', css)
            self.assertNotIn('alert(1)', html)
            self.assertIn('--brand-primary:#2F4836' if url == '/menu/' else '--action:#2F4836', css)     # buzuq rang -> klassik yashil
            self.assertIn('data-font="serif"', html)

    def test_text_fields_are_escaped_everywhere(self):
        name = '<script>alert(1)</script> & "Saroy"'
        self.assertEqual(self.patch({'name': name, 'tagline': '</script><script>alert(2)</script>'}).status_code, 200)
        for url, client in (('/menu/', Client()), ('/admin/login/', Client())):
            html = self.page(url, client)
            self.assertNotIn('<script>alert(1)', html, url)
            self.assertNotIn('<script>alert(2)', html, url)
            self.assertNotIn('</script><script>alert', html, url)
        login = self.page('/admin/login/')
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', login)
        session = session_in(self.page())['brand']                      # JSON ichida ham < > & belgilari ekranlangan, qiymat saqlangan
        self.assertEqual(session['name'], name)

    def test_login_page_shows_the_restaurant_name_and_logo(self):
        html = self.page('/admin/login/')
        self.assertIn('<h1 class="login-title serif">Shohjaxon Saroyi</h1>', html)
        self.assertIn('>S</div>', html)                                    # logotip yo'q: bosh harf
        res = self.owner_client.post(LOGO, upload(png_bytes((300, 120))))
        self.assertEqual(res.status_code, 200, res.content)
        html = self.page('/admin/login/')
        self.assertIn('class="brand-crest-big has-logo"', html)
        self.assertIn(res.json()['logo_url'], html)

    def test_favicon_link_appears_only_when_a_favicon_exists(self):
        self.assertNotIn('rel="icon"', self.page('/menu/'))
        res = self.owner_client.post(LOGO, upload(png_bytes((100, 100)), 'f.png', 'favicon'))
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn(f'<link rel="icon" href="{res.json()["favicon_url"]}">', self.page('/menu/'))
        self.assertIn(res.json()['favicon_url'], self.page('/ra/', self.owner_client))

    def test_session_brand_is_cached_per_shop_and_follows_changes(self):
        first = session_in(self.page())['brand']['tagline']
        self.patch({'tagline': 'Yangi'})
        self.assertNotEqual(first, session_in(self.page())['brand']['tagline'])


# ─── 6. Logotip va favicon yuklash ───────────────────────────────────────────────────────────────────────────

class ProcessImageTests(SimpleTestCase):
    """Rasmni qayta ishlash (Pillow) — to'g'ridan-to'g'ri, middleware'siz."""

    def process(self, data, kind='logo', name='x.png'):
        return process_brand_image(SimpleUploadedFile(name, data), kind)

    def test_logo_is_reencoded_to_webp_and_limited_to_512px(self):
        data, ext, digest = self.process(png_bytes((1500, 800), mode='RGBA', color=(10, 20, 30, 128)))
        self.assertEqual(ext, 'webp')
        image = Image.open(io.BytesIO(data))
        self.assertEqual(image.format, 'WEBP')
        self.assertLessEqual(max(image.size), 512)
        self.assertEqual(image.size, (512, 273))                       # nisbat saqlangan
        self.assertEqual(len(digest), 12)

    def test_small_logo_is_not_upscaled(self):
        data, _, _ = self.process(png_bytes((40, 30)))
        self.assertEqual(Image.open(io.BytesIO(data)).size, (40, 30))

    def test_favicon_is_a_64px_transparent_square_png(self):
        data, ext, _ = self.process(png_bytes((200, 100), color=(255, 0, 0)), 'favicon')
        self.assertEqual(ext, 'png')
        image = Image.open(io.BytesIO(data))
        self.assertEqual((image.format, image.size, image.mode), ('PNG', (64, 64), 'RGBA'))
        self.assertEqual(image.getpixel((0, 0))[3], 0)                  # chetlar shaffof (cho'zilmagan)
        self.assertEqual(image.getpixel((32, 32))[3], 255)

    def test_exif_gps_and_other_metadata_are_removed(self):
        base = Image.new('RGB', (80, 60), (10, 200, 10))
        exif = Image.Exif()
        exif[0x010F] = 'KameraMarkasi'
        exif[0x8825] = {1: 'N', 2: (40.0, 29.0, 0.0), 3: 'E', 4: (68.0, 47.0, 0.0)}          # GPS
        buf = io.BytesIO()
        base.save(buf, format='JPEG', exif=exif)
        self.assertIn(b'KameraMarkasi', buf.getvalue())                 # kirishda EXIF bor
        data, ext, _ = self.process(buf.getvalue(), name='x.jpg')
        self.assertNotIn(b'KameraMarkasi', data)
        self.assertNotIn(b'Exif', data[:64])
        self.assertEqual(dict(Image.open(io.BytesIO(data)).getexif()), {})

    def test_exif_orientation_is_applied_before_stripping(self):
        base = Image.new('RGB', (80, 40), (255, 0, 0))
        exif = Image.Exif()
        exif[0x0112] = 6                                                # 90 gradusga burilgan fotosurat
        buf = io.BytesIO()
        base.save(buf, format='JPEG', exif=exif)
        data, _, _ = self.process(buf.getvalue(), name='x.jpg')
        self.assertEqual(Image.open(io.BytesIO(data)).size, (40, 80))

    def test_svg_is_rejected_in_every_disguise(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        for payload in (svg, b'<?xml version="1.0"?>' + svg, b'\xef\xbb\xbf  \n' + svg, b'<!DOCTYPE svg>' + svg):
            with self.assertRaises(BrandImageError) as ctx:
                self.process(payload, name='logo.png')
            self.assertIn('SVG', str(ctx.exception))

    def test_unsupported_and_corrupt_files_are_rejected(self):
        gif = png_bytes((10, 10), fmt='GIF')
        bmp = png_bytes((10, 10), fmt='BMP')
        for payload in (gif, bmp, b'', b'matn', b'\x89PNG\r\n\x1a\n' + b'x' * 50, png_bytes()[:40], b'%PDF-1.4\n' + b'x' * 100):
            with self.assertRaises(BrandImageError):
                self.process(payload)

    def test_big_files_and_pixel_bombs_are_rejected(self):
        noise = os.urandom(3 * 1024 * 1024)
        with self.assertRaisesMessage(BrandImageError, '2 MB'):
            self.process(noise)
        bomb = io.BytesIO()
        Image.new('L', (6000, 5000)).save(bomb, format='PNG')          # 30 Mpiksel, lekin bir necha KB
        self.assertLess(len(bomb.getvalue()), 200_000)
        with self.assertRaisesMessage(BrandImageError, 'megapiksel'):
            self.process(bomb.getvalue())

    def test_unknown_kind_is_rejected(self):
        with self.assertRaises(BrandImageError):
            self.process(png_bytes(), 'banner')


class LogoUploadTests(BrandApiBase):

    def media_files(self):
        found = []
        for root, _dirs, files in os.walk(self.media):
            found += [os.path.relpath(os.path.join(root, f), self.media) for f in files]
        return sorted(found)

    def test_upload_logo_saves_a_tenant_scoped_webp_and_returns_the_url(self):
        with self.captureOnCommitCallbacks(execute=True):
            res = self.owner_client.post(LOGO, upload(png_bytes((900, 300))))
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body['kind'], 'logo')
        self.assertIsNone(body['favicon_url'])
        self.assertRegex(body['logo_url'], rf'^/media/brand/shop_{self.shop.pk}/logo-[0-9a-f]{{12}}\.webp$')
        self.assertEqual(body['brand']['logo_url'], body['logo_url'])
        files = self.media_files()
        self.assertEqual(len(files), 1)
        self.assertTrue(files[0].startswith(f'brand/shop_{self.shop.pk}/'))
        self.assertEqual(Image.open(os.path.join(self.media, files[0])).format, 'WEBP')
        self.assertEqual(self.get_brand()['logo_url'], body['logo_url'])
        self.assertTrue(AuditLog.objects.filter(action_type='brand_image_updated').exists())

    def test_upload_favicon_is_a_png(self):
        res = self.owner_client.post(LOGO, upload(png_bytes((100, 100)), 'fav.png', 'favicon'))
        self.assertEqual(res.status_code, 200, res.content)
        self.assertRegex(res.json()['favicon_url'], rf'^/media/brand/shop_{self.shop.pk}/favicon-[0-9a-f]{{12}}\.png$')
        self.assertIsNone(res.json()['logo_url'])

    def test_replacing_the_logo_removes_the_old_file(self):
        with self.captureOnCommitCallbacks(execute=True):
            first = self.owner_client.post(LOGO, upload(png_bytes((300, 100), color=(255, 0, 0)))).json()['logo_url']
        with self.captureOnCommitCallbacks(execute=True):
            second = self.owner_client.post(LOGO, upload(png_bytes((300, 100), color=(0, 0, 255)))).json()['logo_url']
        self.assertNotEqual(first, second)                              # xesh o'zgardi -> manzil ham (eski kesh qolmaydi)
        files = self.media_files()
        self.assertEqual(len(files), 1)
        self.assertTrue(second.endswith(os.path.basename(files[0])))
        with self.captureOnCommitCallbacks(execute=True):               # xuddi shu rasm qayta yuklansa: o'chib ketmaydi
            third = self.owner_client.post(LOGO, upload(png_bytes((300, 100), color=(0, 0, 255)))).json()['logo_url']
        self.assertEqual(third, second)
        self.assertEqual(len(self.media_files()), 1)

    def test_logo_and_favicon_are_independent(self):
        self.owner_client.post(LOGO, upload(png_bytes((300, 100))))
        self.owner_client.post(LOGO, upload(png_bytes((50, 50)), 'f.png', 'favicon'))
        brand = self.get_brand()
        self.assertTrue(brand['logo_url'] and brand['favicon_url'])
        self.assertEqual(len(self.media_files()), 2)

    def test_delete_removes_the_reference_and_the_file(self):
        self.owner_client.post(LOGO, upload(png_bytes((300, 100))))
        with self.captureOnCommitCallbacks(execute=True):
            res = self.owner_client.delete(LOGO, json.dumps({'kind': 'logo'}), content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNone(res.json()['logo_url'])
        self.assertIsNone(self.get_brand()['logo_url'])
        self.assertEqual(self.media_files(), [])
        self.assertNotIn('brand', self.reload().business_profile)        # bo'sh brend kaliti ham tozalanadi
        again = self.owner_client.delete(LOGO + '?kind=favicon')         # bo'lmagan rasmni o'chirish xato emas
        self.assertEqual(again.status_code, 200)

    def test_invalid_uploads_are_rejected_and_nothing_is_stored(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        cases = {
            'logo.svg (kengaytma)': upload(svg, 'logo.svg', content_type='image/svg+xml'),
            'SVG, .png nomi bilan': upload(svg, 'logo.png'),
            'matn, .png nomi bilan': upload(b'bu rasm emas', 'logo.png'),
            'buzuq PNG': upload(b'\x89PNG\r\n\x1a\n' + b'x' * 80, 'logo.png'),
            'HTML': upload(b'<html><script>alert(1)</script></html>', 'logo.html', content_type='text/html'),
            'GIF': upload(png_bytes((10, 10), fmt='GIF'), 'logo.gif', content_type='image/gif'),
        }
        for label, files in cases.items():
            res = self.owner_client.post(LOGO, files)
            self.assertEqual(res.status_code, 400, label)
            self.assertTrue(res.json().get('error'), label)
        self.assertEqual(self.media_files(), [])
        self.assertIsNone(self.get_brand()['logo_url'])

    @override_settings(UPLOAD_OPTIMIZE_IMAGES=False)
    def test_a_file_over_2mb_is_rejected_by_the_api(self):
        big = io.BytesIO()
        Image.frombytes('RGB', (1200, 1200), os.urandom(1200 * 1200 * 3)).save(big, format='PNG')
        self.assertGreater(len(big.getvalue()), 2 * 1024 * 1024)
        res = self.owner_client.post(LOGO, upload(big.getvalue()))
        self.assertEqual((res.status_code, res.json().get('field')), (400, 'image'))
        self.assertIn('2 MB', res.json()['error'])
        self.assertEqual(self.media_files(), [])

    def test_missing_file_wrong_kind_and_rate_limit(self):
        res = self.owner_client.post(LOGO, {'kind': 'logo'})
        self.assertEqual((res.status_code, res.json()['field']), (400, 'image'))
        res = self.owner_client.post(LOGO, upload(png_bytes(), kind='banner'))
        self.assertEqual((res.status_code, res.json()['field']), (400, 'kind'))
        cache.clear()
        statuses = [self.owner_client.post(LOGO, upload(png_bytes((20, 20), color=(i, 0, 0)))).status_code for i in range(31)]
        self.assertEqual(statuses[:30], [200] * 30)
        self.assertEqual(statuses[30], 429)

    def test_csrf_is_enforced_for_session_users(self):
        strict = Client(enforce_csrf_checks=True)
        strict.force_login(self.owner)
        self.assertEqual(strict.post(LOGO, upload(png_bytes())).status_code, 403)
        self.assertEqual(strict.patch(API, '{"brand": {"tagline": "x"}}', content_type='application/json').status_code, 403)
        self.assertEqual(strict.post(PRESET, '{"business_type": "cafe"}', content_type='application/json').status_code, 403)
        self.assertEqual(self.media_files(), [])


# ─── 7. Tenant izolyatsiyasi ─────────────────────────────────────────────────────────────────────────────────

@tenant_settings(ROOT_URLCONF='backend.urls_restaurant', DEMO_MODE=False)
class TenantIsolationTests(TestCase):
    """A restoran egasi B restoran brendini hech qanday yo'l bilan o'qiy yoki o'zgartira olmaydi."""

    @classmethod
    def setUpTestData(cls):
        cls.A = make_tenant('alfa', 'ALFA')
        cls.B = make_tenant('bravo', 'BRAVO')

    def setUp(self):
        cache.clear()
        invalidate_runtime_cache()
        self.addCleanup(invalidate_runtime_cache)
        self.media = tempfile.mkdtemp(prefix='brand-media-')
        self.addCleanup(shutil.rmtree, self.media, True)
        self.enterContext(override_settings(MEDIA_ROOT=self.media))

    def client_of(self, user):
        c = Client()
        c.force_login(user)
        return c

    def snapshot_b(self):
        row = Shop.objects.filter(pk=self.B.shop.pk).values('name', 'phone', 'business_type', 'business_profile', 'color_primary').get()
        return json.dumps(row, sort_keys=True, default=str)

    def test_owner_a_changes_only_alfa_and_bravo_is_untouched(self):
        before = self.snapshot_b()
        c = self.client_of(self.A.owner)
        res = c.patch(API, {'brand': {'name': 'Alfa Yangi', 'palette': 'custom', 'primary_color': '#8B1E3F', 'tagline': 'Alfa'}},
                      content_type='application/json', HTTP_HOST=self.A.host)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(c.post(LOGO, upload(png_bytes((200, 80))), HTTP_HOST=self.A.host).status_code, 200)
        self.assertEqual(c.post(PRESET, {'business_type': 'cafe'}, content_type='application/json', HTTP_HOST=self.A.host).status_code, 200)
        self.assertEqual(self.snapshot_b(), before)
        a_brand = Client().get('/menu/', HTTP_HOST=self.A.host).content.decode()
        b_brand = Client().get('/menu/', HTTP_HOST=self.B.host).content.decode()
        self.assertEqual(session_in(a_brand)['brand']['name'], 'Alfa Yangi')
        self.assertEqual(session_in(b_brand)['brand']['name'], 'BRAVO Restoran')
        self.assertIn('id="brand-vars"', a_brand)
        self.assertNotIn('id="brand-vars"', b_brand)
        self.assertNotIn('brand/shop_%d/' % self.A.shop.pk, b_brand)

    def test_owner_a_on_bravos_host_cannot_touch_bravo(self):
        before = self.snapshot_b()
        c = self.client_of(self.A.owner)
        calls = [
            lambda: c.get(API, HTTP_HOST=self.B.host),
            lambda: c.patch(API, {'brand': {'name': 'Hack'}}, content_type='application/json', HTTP_HOST=self.B.host),
            lambda: c.post(LOGO, upload(png_bytes()), HTTP_HOST=self.B.host),
            lambda: c.delete(LOGO, json.dumps({'kind': 'logo'}), content_type='application/json', HTTP_HOST=self.B.host),
            lambda: c.post(PRESET, {'business_type': 'banquet'}, content_type='application/json', HTTP_HOST=self.B.host),
        ]
        for call in calls:
            self.assertIn(call().status_code, (403, 404))
        self.assertEqual(self.snapshot_b(), before)
        self.assertEqual(os.listdir(self.media), [])

    def test_a_logo_path_copied_from_another_tenant_is_not_shown(self):
        c = self.client_of(self.B.owner)
        path = c.post(LOGO, upload(png_bytes((200, 80))), HTTP_HOST=self.B.host).json()['logo_url']
        relative = path.removeprefix('/media/')
        profile = dict(self.A.shop.business_profile or {})
        profile['brand'] = {'logo_path': relative}                       # tajovuzkor A ning bazadagi yozuviga B ning yo'lini qo'ydi
        Shop.objects.filter(pk=self.A.shop.pk).update(business_profile=profile)
        invalidate_runtime_cache()
        html = Client().get('/menu/', HTTP_HOST=self.A.host).content.decode()
        self.assertIsNone(session_in(html)['brand']['logo_url'])
        self.assertNotIn(relative, html)

    def test_brand_style_follows_the_host_not_the_session(self):
        Shop.objects.filter(pk=self.A.shop.pk).update(
            business_profile={'guest_palette': 'custom', 'brand': {'primary_color': '#8B1E3F'}})
        invalidate_runtime_cache()
        a = Client().get('/menu/', HTTP_HOST=self.A.host).content.decode()
        b = Client().get('/menu/', HTTP_HOST=self.B.host).content.decode()
        self.assertIn('--brand-primary:#8B1E3F', a)
        self.assertNotIn('#8B1E3F', b)

    def test_login_page_shows_the_tenants_own_name_and_the_platform_page_shows_platforma(self):
        a = Client().get('/admin/login/', HTTP_HOST=self.A.host).content.decode()
        b = Client().get('/admin/login/', HTTP_HOST=self.B.host).content.decode()
        self.assertIn('ALFA Restoran', a)
        self.assertNotIn('BRAVO Restoran', a)
        self.assertIn('BRAVO Restoran', b)
        platform = Client().get('/admin/login/', HTTP_HOST='platform.test').content.decode()
        self.assertIn('<h1 class="login-title serif">Platforma</h1>', platform)
        self.assertNotIn('ALFA', platform)
        self.assertNotIn('BRAVO', platform)
