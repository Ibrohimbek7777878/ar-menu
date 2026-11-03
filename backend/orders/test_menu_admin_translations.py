"""/ra/ menyu API: taomning ruscha va inglizcha nom/tavsifi (name_ru, name_en, description_ru, description_en).

Yozish (POST/PATCH), o'qish (GET/javob), uzunlik chegarasi va tozalash (`parse_text` uslubi, xatoda 400 + `field`),
bo'sh qiymat tarjimani tozalashi, kelmagan maydonga tegilmasligi, nusxa olish, qidiruv va audit logi.
"""
import io
import json
from decimal import Decimal

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from orders.audit import AuditLog
from products.models import Product
from shops.models import Shop

LIST_URL = '/api/restaurant/admin/v1/menu/products/'
TRANSLATION_FIELDS = ('name_ru', 'name_en', 'description_ru', 'description_en')


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class MenuAdminTranslationTests(TestCase):
    def setUp(self):
        call_command('create_restaurant', name='Tarjima Admin', slug='tarjima-admin', owner='ta-ega', password='Tarjima-12345!',
                     tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='tarjima-admin')
        self.owner = AdminUser.objects.get(username='ta-ega')
        self.waiter = create_staff(self.shop, 'ta-waiter', 'waiter', password='Xodim-Parol-2026!')[0]
        self.category = Category.objects.create(name='Milliy', is_restaurant=True)
        self.product = Product.objects.create(shop=self.shop, name='Palov', slug='ta-palov', price=Decimal('45000'),
                                              category=self.category, description="Guruch va go'sht")

        call_command('create_restaurant', name='Begona Tarjima', slug='begona-tarjima', owner='bt-ega', password='Begona-12345!',
                     tables=1, stdout=io.StringIO())
        self.foreign = Product.objects.create(shop=Shop.objects.get(slug='begona-tarjima'), name='Begona', slug='bt-begona',
                                              price=Decimal('1000'), name_ru='Чужое')

    def as_user(self, user=None):
        c = Client()
        c.force_login(user or self.owner)
        return c

    def post(self, payload, user=None):
        return self.as_user(user).post(LIST_URL, data=json.dumps(payload), content_type='application/json')

    def patch(self, payload, pk=None, user=None):
        return self.as_user(user).patch(f'{LIST_URL}{pk or self.product.pk}/', data=json.dumps(payload), content_type='application/json')

    # --- yaratish ---------------------------------------------------------------------------------------------------

    def test_create_with_translations_and_read_back(self):
        res = self.post({'name': 'Manti', 'price': 40000, 'name_ru': ' Манты ', 'name_en': 'Manti',
                         'description_ru': 'Мясо и лук', 'description_en': 'Meat and onion'})
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertEqual((data['name_ru'], data['name_en']), ('Манты', 'Manti'))  # bo'sh joylar olib tashlangan
        self.assertEqual((data['description_ru'], data['description_en']), ('Мясо и лук', 'Meat and onion'))
        product = Product.objects.get(pk=data['id'])
        self.assertEqual((product.name_ru, product.name_en, product.description_ru, product.description_en),
                         ('Манты', 'Manti', 'Мясо и лук', 'Meat and onion'))
        # ro'yxat ham to'rtala maydonni qaytaradi
        row = next(r for r in self.as_user().get(LIST_URL).json()['results'] if r['id'] == data['id'])
        for field in TRANSLATION_FIELDS:
            self.assertEqual(row[field], getattr(product, field))
        audit = AuditLog.objects.filter(target_type='product', target_id=data['id'], new_value__action='create').first()
        self.assertEqual(audit.new_value['translations'], sorted(TRANSLATION_FIELDS))

    def test_create_without_translations_gives_empty_strings(self):
        res = self.post({'name': 'Somsa', 'price': 9000})
        self.assertEqual(res.status_code, 201)
        data = res.json()
        for field in TRANSLATION_FIELDS:
            self.assertEqual(data[field], '')
        audit = AuditLog.objects.filter(target_type='product', target_id=data['id'], new_value__action='create').first()
        self.assertNotIn('translations', audit.new_value)

    def test_create_accepts_multipart_form_like_the_spa(self):
        res = self.as_user().post(LIST_URL, data={'name': 'Lagmon', 'price': '32000', 'name_ru': 'Лагман', 'description_en': ''})
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual((res.json()['name_ru'], res.json()['description_en']), ('Лагман', ''))

    # --- tahrirlash -------------------------------------------------------------------------------------------------

    def test_patch_sets_translations_and_logs_changed_fields(self):
        res = self.patch({'name_ru': 'Плов', 'description_ru': 'Рис и мясо'})
        self.assertEqual(res.status_code, 200, res.content)
        self.product.refresh_from_db()
        self.assertEqual((self.product.name_ru, self.product.description_ru), ('Плов', 'Рис и мясо'))
        self.assertEqual((self.product.name_en, self.product.description_en), ('', ''))
        audit = AuditLog.objects.filter(target_type='product', target_id=self.product.id, new_value__action='update').first()
        self.assertEqual(audit.new_value['translations_changed'], ['name_ru', 'description_ru'])

    def test_patch_without_translation_fields_leaves_them_alone(self):
        Product.objects.filter(pk=self.product.pk).update(name_ru='Плов', name_en='Plov', description_en='Rice')
        res = self.patch({'price': 47000})
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual((self.product.name_ru, self.product.name_en, self.product.description_en), ('Плов', 'Plov', 'Rice'))
        audit = AuditLog.objects.filter(target_type='product', target_id=self.product.id, new_value__action='update').first()
        self.assertNotIn('translations_changed', audit.new_value)

    def test_patch_empty_value_clears_translation(self):
        Product.objects.filter(pk=self.product.pk).update(name_ru='Плов', name_en='Plov')
        res = self.patch({'name_ru': '', 'name_en': None})
        self.assertEqual(res.status_code, 200, res.content)
        self.product.refresh_from_db()
        self.assertEqual((self.product.name_ru, self.product.name_en), ('', ''))
        self.assertEqual(res.json()['name_ru'], '')

    def test_patch_same_value_is_not_reported_as_changed(self):
        Product.objects.filter(pk=self.product.pk).update(name_ru='Плов')
        self.assertEqual(self.patch({'name_ru': 'Плов', 'name_en': 'Plov'}).status_code, 200)
        audit = AuditLog.objects.filter(target_type='product', target_id=self.product.id, new_value__action='update').first()
        self.assertEqual(audit.new_value['translations_changed'], ['name_en'])

    # --- noto'g'ri kiritish -----------------------------------------------------------------------------------------

    def test_invalid_values_give_400_with_field(self):
        too_long_name, too_long_desc = 'я' * 201, 'x' * 5001
        cases = (
            ('name_ru', too_long_name, 'Ruscha nom'),
            ('name_en', too_long_name, 'Inglizcha nom'),
            ('description_ru', too_long_desc, 'Ruscha tavsif'),
            ('description_en', too_long_desc, 'Inglizcha tavsif'),
            ('name_ru', ['Плов'], 'Ruscha nom'),
            ('name_en', {'a': 1}, 'Inglizcha nom'),
            ('description_ru', True, 'Ruscha tavsif'),
        )
        for field, value, label in cases:
            for send in (self.post_with_required, self.patch):
                res = send({field: value})
                self.assertEqual(res.status_code, 400, f'{field}={str(value)[:20]!r}: {res.content}')
                body = res.json()
                self.assertEqual(body['field'], field)
                self.assertIn(label, body['error'])
                self.assertNotIn('«', body['error'], 'xom maydon nomi odamga ko\'rsatilmasligi kerak')
        self.product.refresh_from_db()
        self.assertEqual(self.product.name_ru, '')
        self.assertEqual(Product.objects.filter(shop=self.shop).count(), 1, 'noto\'g\'ri so\'rov taom yaratmasligi kerak')

    def post_with_required(self, payload):
        return self.post({'name': 'Yangi', 'price': 1000, **payload})

    def test_limits_are_inclusive(self):
        res = self.patch({'name_ru': 'я' * 200, 'name_en': 'e' * 200, 'description_ru': 'д' * 5000, 'description_en': 'd' * 5000})
        self.assertEqual(res.status_code, 200, res.content)

    def test_nul_character_is_stripped(self):
        res = self.patch({'name_ru': 'Пл\x00ов'})
        self.assertEqual(res.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name_ru, 'Плов')

    # --- ruxsat, IDOR, nusxa, qidiruv ---------------------------------------------------------------------------------

    def test_waiter_cannot_write_translations(self):
        self.assertEqual(self.patch({'name_ru': 'Плов'}, user=self.waiter).status_code, 403)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name_ru, '')

    def test_foreign_product_is_untouchable(self):
        self.assertEqual(self.patch({'name_ru': 'Взлом'}, pk=self.foreign.pk).status_code, 404)
        self.foreign.refresh_from_db()
        self.assertEqual(self.foreign.name_ru, 'Чужое')
        # begona taomning tarjimasi ro'yxatda ko'rinmaydi
        self.assertNotIn(self.foreign.pk, [r['id'] for r in self.as_user().get(LIST_URL).json()['results']])

    def test_duplicate_copies_translations(self):
        Product.objects.filter(pk=self.product.pk).update(name_ru='Плов', name_en='Plov', description_ru='Рис', description_en='Rice')
        res = self.as_user().post(f'{LIST_URL}{self.product.pk}/duplicate/')
        self.assertEqual(res.status_code, 201)
        copy = res.json()
        self.assertEqual((copy['name_ru'], copy['name_en'], copy['description_ru'], copy['description_en']),
                         ('Плов', 'Plov', 'Рис', 'Rice'))

    def test_search_finds_dish_by_translated_name(self):
        Product.objects.filter(pk=self.product.pk).update(name_ru='Плов', name_en='Pilaf')
        for q in ('Pilaf', 'pilaf', 'Плов'):
            ids = [r['id'] for r in self.as_user().get(LIST_URL, {'q': q}).json()['results']]
            self.assertEqual(ids, [self.product.pk], q)
        self.assertEqual(self.as_user().get(LIST_URL, {'q': 'Sushi'}).json()['results'], [])
