"""
Haqiqiy brauzer E2E (Playwright, repo ildizidagi `e2e/`) uchun test ma'lumotlari.

    DEBUG=True python manage.py seed_e2e
    E2E_SEED_ALLOWED=1 python manage.py seed_e2e --password 'Boshqa-parol-1!'

Nima yaratadi (toza bazada): 1 restoran (slug `e2e-resto`), 2 zal (8 stol), 3 kategoriya, 7 taom (narxli),
4 xodim (ega, menejer, ofitsiant, oshpaz — parol hammasida bir xil, test uchun ma'lum) va BUGUNGI 6 ta buyurtma:
3 tasi to'langan (kassada haqiqiy kirim yozuvi bilan: 53 000 + 88 000 + 94 000 = 235 000 so'm), 3 tasi to'lanmagan.

Xavfsizlik: faqat DEBUG=True yoki E2E_SEED_ALLOWED=1 bilan ishlaydi (production'da tasodifan yurgizilmasin) va bazada
boshqa restoran bo'lsa to'xtaydi (--allow-existing bilan ixtiyoriy). Idempotent: qayta yurgizilsa nusxa qo'shilmaydi,
parollar qayta o'rnatiladi, buyurtmalar/kassa yozuvlari qayta yaratilmaydi (bor bo'lsa tegilmaydi).
Tarmoqqa chiqmaydi (Telegram/AI chaqirilmaydi).
"""
import io
import os
from decimal import Decimal

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from categories.models import Category
from finance.services.order_integration import record_order_payment_income
from orders.creation import create_order
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, Table

SHOP_SLUG = 'e2e-resto'
SHOP_NAME = 'E2E Restoran'
DEFAULT_PASSWORD = 'E2E-parol-123!'

OWNER = 'e2e_owner'
STAFF = (
    ('e2e_manager', 'shop_manager', 'Menejer Sinov'),
    ('e2e_waiter', 'waiter', 'Ofitsiant Sinov'),
    ('e2e_kitchen', 'kitchen', 'Oshpaz Sinov'),
)

CATEGORIES = ('Milliy taomlar', 'Salatlar', 'Ichimliklar')

# (slug, nom, narx, kategoriya, tayyorlanish daqiqasi)
PRODUCTS = (
    ('e2e-palov', 'Palov', 45000, 'Milliy taomlar', 25),
    ('e2e-lagmon', "Lag'mon", 38000, 'Milliy taomlar', 20),
    ('e2e-manti', 'Manti', 32000, 'Milliy taomlar', 25),
    ('e2e-shashlik', 'Shashlik', 28000, 'Milliy taomlar', 15),
    ('e2e-achchiq-chuchuk', 'Achchiq-chuchuk salat', 18000, 'Salatlar', 5),
    ('e2e-kok-choy', "Ko'k choy", 8000, 'Ichimliklar', 3),
    ('e2e-kola', 'Kola 0.5 l', 12000, 'Ichimliklar', 1),
)

# (buyurtma raqami, stol, holat, to'lov, to'lov turi, [(taom slug, soni)])
ORDERS = (
    ('E2E-0001', '1', 'delivered', 'paid', 'cash', (('e2e-palov', 1), ('e2e-kok-choy', 1))),                       # 53 000
    ('E2E-0002', '2', 'delivered', 'paid', 'card', (('e2e-manti', 2), ('e2e-kola', 2))),                           # 88 000
    ('E2E-0003', '3', 'delivered', 'paid', 'cash', (('e2e-lagmon', 2), ('e2e-achchiq-chuchuk', 1))),               # 94 000
    ('E2E-0004', '4', 'pending', 'unpaid', None, (('e2e-shashlik', 3),)),                                          # 84 000
    ('E2E-0005', '5', 'preparing', 'unpaid', None, (('e2e-palov', 2),)),                                           # 90 000
    ('E2E-0006', '6', 'ready', 'unpaid', None, (('e2e-kola', 2), ('e2e-kok-choy', 2))),                            # 40 000
)
TABLE_STATUS_BY_ORDER = {'pending': 'occupied', 'preparing': 'occupied', 'ready': 'ready'}


class Command(BaseCommand):
    help = "E2E (Playwright) uchun test restorani, xodimlari, menyusi va bugungi buyurtmalarini yaratadi (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument('--password', default=os.environ.get('E2E_PASSWORD', DEFAULT_PASSWORD),
                            help=f"Barcha test xodimlari paroli (standart: {DEFAULT_PASSWORD})")
        parser.add_argument('--allow-existing', action='store_true',
                            help="Bazada boshqa restoranlar bo'lsa ham davom etish (faqat shaxsiy test bazasida!)")

    def handle(self, *args, **opts):
        if not (settings.DEBUG or os.environ.get('E2E_SEED_ALLOWED') == '1'):
            raise CommandError("seed_e2e faqat DEBUG=True yoki E2E_SEED_ALLOWED=1 bilan ishlaydi (production'da yurgizilmaydi)")
        foreign = Shop.objects.exclude(slug=SHOP_SLUG).count()
        if foreign and not opts['allow_existing']:
            raise CommandError(
                f"Bazada {foreign} ta boshqa restoran bor. E2E uchun toza vaqtinchalik baza ishlating "
                "(yoki ongli ravishda --allow-existing)."
            )
        password = opts['password']

        with transaction.atomic():
            shop = self._shop_owner_and_tables(password)
            self._staff(shop, password)
            products = self._menu(shop)
            self._orders(shop, products)

        self.stdout.write(self.style.SUCCESS(f"E2E ma'lumotlari tayyor: {shop.name} (slug={shop.slug})"))
        self.stdout.write(f"  Xodimlar (parol hammasida bir xil): {OWNER}, " + ', '.join(u for u, _r, _n in STAFF))

    def _shop_owner_and_tables(self, password):
        call_command(
            'create_restaurant', name=SHOP_NAME, slug=SHOP_SLUG, owner=OWNER, password=password,
            tables=6, hall='Asosiy zal', stdout=io.StringIO(),
        )
        shop = Shop.objects.get(slug=SHOP_SLUG)
        # Sinovlar soatga bog'liq bo'lmasin: standart ish vaqti 08:00-22:00 va kechqurun ishlagan CI restoranni "yopiq" ko'rardi
        shop.working_hours = '00:00-24:00'
        shop.save(update_fields=['working_hours'])
        terrace, _ = Hall.objects.get_or_create(shop=shop, name='Terrasa')
        for number in ('7', '8'):
            Table.objects.get_or_create(shop=shop, number=number, defaults={'hall': terrace, 'capacity': 4, 'status': 'free'})
        return shop

    def _staff(self, shop, password):
        for username, role, full_name in STAFF:
            create_staff(shop, username, role, password=password, full_name=full_name, update=True)
        owner = AdminUser.objects.get(username=OWNER)
        owner.first_name, owner.last_name, owner.is_approved = 'Ega', 'Sinov', True
        owner.save(update_fields=['first_name', 'last_name', 'is_approved'])

    def _menu(self, shop):
        categories = {}
        for index, name in enumerate(CATEGORIES, start=1):
            # Bo'lim restoranniki (Category.shop, multi-tenant)
            categories[name], _ = Category.objects.get_or_create(
                shop=shop, name=name, is_restaurant=True,
                defaults={'name_uz': name, 'name_ru': name, 'icon': 'utensils', 'sort_order': index},
            )
        products = {}
        for slug, name, price, category, prep in PRODUCTS:
            # all_objects: arxivlangan (soft delete) nusxa bo'lsa ham tiklanadi, slug to'qnashmaydi
            product, _ = Product.all_objects.update_or_create(
                slug=slug,
                defaults={
                    'shop': shop, 'name': name, 'price': Decimal(price), 'category': categories[category],
                    'prep_minutes': prep, 'is_available': True, 'has_real_photo': False, 'is_deleted': False,
                },
            )
            products[slug] = product
        return products

    def _orders(self, shop, products):
        for number, table_number, status, payment, method, lines in ORDERS:
            if Order.all_objects.filter(order_number=number).exists():
                continue   # allaqachon yaratilgan: kassa/holatiga tegilmaydi (idempotent)
            table = Table.objects.get(shop=shop, number=table_number)
            total = sum(Decimal(products[slug].price) * qty for slug, qty in lines)
            order = create_order(   # loyiha qoidasi: buyurtma faqat orders.creation orqali yaratiladi (noyob raqam)
                shop=shop, order_number=number, customer_name='Mehmon', customer_phone_1='+998901112233',
                table=table, status=status, payment_status='unpaid', total_amount=total, delivery_fee=Decimal(0),
                discount_amount=Decimal(0), final_amount=total, is_pickup=False,
            )
            for slug, qty in lines:
                product = products[slug]
                OrderItem.objects.create(
                    order=order, product=product, product_name=product.name, price=product.price,
                    quantity=qty, unit='porsiya', total=Decimal(product.price) * qty,
                )
            if payment == 'paid':
                order.payment_status = 'paid'
                order.delivered_at = timezone.now()
                order.save(update_fields=['payment_status', 'delivered_at', 'updated_at'])
                # Haqiqiy kassa kirimi (API "to'landi" deganda yoziladigan xuddi shu xizmat bilan)
                if record_order_payment_income(order, payment_method=method) is None:
                    raise CommandError(f"{number}: kassa kirimi yozilmadi")
            new_table_status = TABLE_STATUS_BY_ORDER.get(status)
            if new_table_status:
                table.status = new_table_status
                table.save(update_fields=['status'])
