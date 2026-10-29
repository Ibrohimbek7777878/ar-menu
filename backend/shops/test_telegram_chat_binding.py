"""
Do'kon sozlamasidagi `telegram_chat_id` (P2.6). Bu qiymat botda ADMIN huquqini beradi (notifications.admin_bot), shuning uchun:
  • format: butun son (guruh/kanal uchun manfiy ham bo'lishi mumkin) yoki bo'sh (bog'lanishni olib tashlash);
  • bitta chat bitta egaga tegishli do'kon(lar)ga bog'lanadi — boshqa ega do'koni bilan to'qnashuv 400;
  • eski ma'lumotda baribir to'qnashuv bo'lsa (turli egalar) — bot hech kimga admin huquqi bermaydi (fail-closed).
"""
import io

from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from notifications.admin_bot import resolve_admin_scope
from shops.models import Shop

API = '/api/restaurant/admin/v1/settings/'


def make_shop(slug, owner):
    call_command('create_restaurant', name=f'{slug} resto', slug=slug, owner=owner, password='Parol-Chat-123',
                 tables=1, stdout=io.StringIO())
    shop = Shop.objects.get(slug=slug)
    user = AdminUser.objects.get(username=owner)
    user.is_approved = True
    user.save(update_fields=['is_approved'])
    client = Client()
    client.force_login(user)
    return shop, user, client


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class TelegramChatBindingTests(TestCase):

    def setUp(self):
        self.shop_a, self.owner_a, self.client_a = make_shop('chat-a', 'chat-owner-a')
        self.shop_b, self.owner_b, self.client_b = make_shop('chat-b', 'chat-owner-b')

    def patch(self, client, value):
        return client.patch(API, {'telegram_chat_id': value}, content_type='application/json')

    def test_valid_formats_are_saved_normalised(self):
        for given, stored in (('123456789', '123456789'), (' 987654321 ', '987654321'), (-1001234567890, '-1001234567890'),
                              (555, '555'), ('-4001234', '-4001234')):
            res = self.patch(self.client_a, given)
            self.assertEqual(res.status_code, 200, f'{given!r}: {res.content[:150]}')
            self.shop_a.refresh_from_db()
            self.assertEqual(self.shop_a.business_profile['telegram_chat_id'], stored)
            self.assertEqual(res.json()['telegram_chat_id'], stored)

    def test_empty_value_unbinds(self):
        self.patch(self.client_a, '777')
        for empty in ('', None, '   '):
            self.patch(self.client_a, '777')
            res = self.patch(self.client_a, empty)
            self.assertEqual(res.status_code, 200, repr(empty))
            self.shop_a.refresh_from_db()
            self.assertEqual(self.shop_a.business_profile['telegram_chat_id'], '')
        self.assertIsNone(resolve_admin_scope('777'))

    def test_invalid_formats_are_rejected(self):
        self.patch(self.client_a, '111')
        for bad in ('abc', '12.5', '@kanal', '0', '-', '--5', '+123', '1' * 30, '12 34', [1], {'a': 1}, True, 1.5, '١٢٣'):
            res = self.patch(self.client_a, bad)
            self.assertEqual(res.status_code, 400, f'{bad!r}: {res.content[:150]}')
            self.assertEqual(res.json().get('field'), 'telegram_chat_id')
        self.shop_a.refresh_from_db()
        self.assertEqual(self.shop_a.business_profile['telegram_chat_id'], '111')

    def test_other_owner_cannot_take_a_chat_already_bound_to_another_shop(self):
        self.assertEqual(self.patch(self.client_a, '4242').status_code, 200)
        res = self.patch(self.client_b, '4242')
        self.assertEqual(res.status_code, 400, res.content)
        self.assertEqual(res.json().get('field'), 'telegram_chat_id')
        self.assertIn('boshqa', res.json()['error'])
        self.shop_b.refresh_from_db()
        self.assertNotEqual(self.shop_b.business_profile.get('telegram_chat_id'), '4242')
        # Raqamning boshqa ko'rinishi ham (int) xuddi shu chat
        self.assertEqual(self.patch(self.client_b, 4242).status_code, 400)
        # O'z qiymatini qayta saqlash xato emas
        self.assertEqual(self.patch(self.client_a, '4242').status_code, 200)

    def test_same_owner_may_bind_one_chat_to_several_shops(self):
        shop_a2 = Shop.objects.create(name='A ikkinchi', slug='chat-a2', owner=self.owner_a, address='x', phone='1',
                                      latitude=1, longitude=1)
        self.patch(self.client_a, '5151')
        shop_a2.business_profile = {'telegram_chat_id': '5151'}
        shop_a2.save(update_fields=['business_profile'])
        scope = resolve_admin_scope('5151')
        self.assertIsNotNone(scope)
        self.assertEqual(scope.shop_ids, frozenset({self.shop_a.id, shop_a2.id}))

    def test_legacy_duplicate_between_different_owners_grants_no_admin_rights(self):
        for shop in (self.shop_a, self.shop_b):
            shop.business_profile = {'telegram_chat_id': '9090'}
            shop.save(update_fields=['business_profile'])
        self.assertIsNone(resolve_admin_scope('9090'))
