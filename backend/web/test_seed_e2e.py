"""
`seed_e2e` buyrug'i (haqiqiy brauzer E2E uchun test ma'lumotlari) sinovlari: xavfsizlik to'sig'i, to'liqlik, idempotentlik.
"""
import io
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import AdminUser
from finance.models import FinanceTransaction
from orders.models import Order
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table


def seed(*args, **kwargs):
    call_command('seed_e2e', *args, stdout=io.StringIO(), **kwargs)


@override_settings(DEBUG=True)
class SeedE2ETests(TestCase):
    def test_creates_restaurant_staff_menu_and_todays_orders(self):
        seed()
        shop = Shop.objects.get(slug='e2e-resto')
        self.assertEqual(Shop.objects.count(), 1)
        self.assertEqual(Table.objects.filter(shop=shop).count(), 8)
        self.assertEqual(Product.objects.filter(shop=shop).count(), 7)
        self.assertTrue(all(p.price > 0 and p.category_id for p in Product.objects.filter(shop=shop)))
        roles = dict(AdminUser.objects.filter(shop=shop).values_list('username', 'role'))
        self.assertEqual(roles, {
            'e2e_owner': 'shop_owner', 'e2e_manager': 'shop_manager', 'e2e_waiter': 'waiter', 'e2e_kitchen': 'kitchen',
        })
        self.assertEqual(Order.objects.filter(shop=shop, payment_status='paid').count(), 3)
        self.assertEqual(Order.objects.filter(shop=shop, payment_status='unpaid').count(), 3)
        incomes = FinanceTransaction.objects.filter(shop=shop, tx_type='income', is_cancelled=False)
        self.assertEqual(incomes.count(), 3)    # har bir to'langan buyurtma uchun haqiqiy kassa kirimi
        self.assertEqual(sum(t.amount for t in incomes), Decimal('235000'))

    def test_passwords_are_known_and_usable(self):
        seed()
        for username in ('e2e_owner', 'e2e_manager', 'e2e_waiter', 'e2e_kitchen'):
            self.assertTrue(AdminUser.objects.get(username=username).check_password('E2E-parol-123!'), username)
        seed(password='Boshqa-parol-9!')
        self.assertTrue(AdminUser.objects.get(username='e2e_owner').check_password('Boshqa-parol-9!'))

    def test_is_idempotent(self):
        seed()
        counts = (Shop.objects.count(), Order.objects.count(), Product.objects.count(), Table.objects.count(),
                  AdminUser.objects.count(), FinanceTransaction.objects.count())
        seed()
        self.assertEqual(counts, (Shop.objects.count(), Order.objects.count(), Product.objects.count(),
                                  Table.objects.count(), AdminUser.objects.count(), FinanceTransaction.objects.count()))

    def test_refuses_when_database_has_other_restaurants(self):
        owner = AdminUser.objects.create_user(username='boshqa-ega', password='Boshqa-parol-9!', role='shop_owner')
        Shop.objects.create(name='Haqiqiy restoran', slug='haqiqiy', owner=owner, address='x', phone='+998900000000',
                            latitude=40.0, longitude=68.0)
        with self.assertRaisesMessage(CommandError, 'boshqa restoran'):
            seed()
        self.assertFalse(Shop.objects.filter(slug='e2e-resto').exists())
        seed(allow_existing=True)
        self.assertTrue(Shop.objects.filter(slug='e2e-resto').exists())


class SeedE2EGuardTests(TestCase):
    @override_settings(DEBUG=False)
    def test_refuses_outside_debug_without_explicit_env(self):
        with mock.patch.dict('os.environ', {}, clear=False) as env:
            env.pop('E2E_SEED_ALLOWED', None)
            with self.assertRaisesMessage(CommandError, 'DEBUG=True'):
                seed()
        self.assertFalse(Shop.objects.exists())

    @override_settings(DEBUG=False)
    def test_explicit_env_allows_outside_debug(self):
        with mock.patch.dict('os.environ', {'E2E_SEED_ALLOWED': '1'}):
            seed()
        self.assertTrue(Shop.objects.filter(slug='e2e-resto').exists())
