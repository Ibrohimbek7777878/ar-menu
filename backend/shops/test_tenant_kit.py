"""
Multi-tenant testlari uchun umumiy tuzatma (fixture) yordamchilari. Test fayli emas (discovery `test*.py` ni yig'adi).

`make_tenant('alfa', 'ALFA')` — to'liq restoran: ega/menejer/ofitsiant/oshpaz, zal, 2 stol, bo'lim, 2 taom, buyurtma,
chaqiruv, bron, moliya yozuvi, qarz, NFC karta. Barcha matnlarda `<TAG>-SECRET...` belgisi bor: boshqa tenant javobida
shu belgi uchrasa — ma'lumot oqdi.
"""
import datetime
from decimal import Decimal
from types import SimpleNamespace

from django.test import override_settings

from accounts.models import AdminUser
from categories.models import Category
from finance.models import DebtRecord, FinanceTransaction
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Hall, NFCCard, ServiceCall, Table, TableReservation

PLATFORM = 'platform.test'
PASSWORD = 'Parol-Tenant-123!'
# Test platforma domeni va uning hostlari (+ lokal hostlar: "localhost xatti-harakati o'zgarmagan" testlari uchun)
TENANT_SETTINGS = dict(
    PLATFORM_DOMAIN=PLATFORM,
    ALLOWED_HOSTS=['.platform.test', 'testserver', 'localhost', '127.0.0.1'],
)


def tenant_settings(**extra):
    return override_settings(**{**TENANT_SETTINGS, **extra})


def make_user(shop, username, role, **extra):
    return AdminUser.objects.create_user(
        username=username, password=PASSWORD, role=role, shop=shop, is_approved=True, is_active=True, **extra)


def make_tenant(sub, tag, status='active', business_type='restaurant'):
    shop = Shop.objects.create(
        name=f'{tag} Restoran', slug=sub, subdomain=sub, status=status, business_type=business_type,
        address=f'{tag} manzil', phone='+998901112233', latitude=40.0, longitude=68.0, is_open=True)
    owner = make_user(shop, f'{sub}_owner', 'shop_owner')
    Shop.objects.filter(pk=shop.pk).update(owner=owner)
    manager = make_user(shop, f'{sub}_manager', 'shop_manager')
    waiter = make_user(shop, f'{sub}_waiter', 'waiter')
    kitchen = make_user(shop, f'{sub}_kitchen', 'kitchen')

    hall = Hall.objects.create(shop=shop, name=f'{tag}-SECRETHALL')
    table1 = Table.objects.create(shop=shop, hall=hall, number='1', capacity=4, status='free')
    table2 = Table.objects.create(shop=shop, hall=hall, number='2', capacity=4, status='free')

    category = Category.objects.create(
        shop=shop, name=f'{tag}-SECRETCAT', name_uz=f'{tag}-SECRETCAT', name_ru=f'{tag}-SECRETCAT', is_restaurant=True, is_active=True)
    product1 = Product.objects.create(
        shop=shop, category=category, name=f'{tag}-SECRETDISH', slug=f'{sub}-dish-1', price=Decimal('10000'), is_available=True)
    product2 = Product.objects.create(
        shop=shop, category=category, name=f'{tag}-SECRETDISH-2', slug=f'{sub}-dish-2', price=Decimal('20000'), is_available=True)

    order = Order.objects.create(
        shop=shop, order_number=f'{tag}-ORD-1', customer_name=f'{tag}-SECRETGUEST', customer_phone_1='+998901234567',
        table=table1, status='pending', payment_status='unpaid', total_amount=Decimal('10000'),
        delivery_fee=Decimal('0'), final_amount=Decimal('10000'))
    item = OrderItem.objects.create(
        order=order, product=product1, product_name=f'{tag}-SECRETDISH', price=Decimal('10000'), quantity=1,
        unit='porsiya', total=Decimal('10000'))
    call = ServiceCall.objects.create(shop=shop, table=table1, call_type='waiter', title=f'{tag}-SECRETCALL', status='pending')
    reservation = TableReservation.objects.create(
        shop=shop, table=table2, hall=hall, customer_name=f'{tag}-SECRETRES', customer_phone='+998901119999',
        guests_count=2, reservation_date=datetime.date.today() + datetime.timedelta(days=2), reservation_time=datetime.time(19, 0))
    tx = FinanceTransaction.objects.create(
        shop=shop, tx_type='income', stage='income', amount=Decimal('5000'), title=f'{tag}-SECRETTX')
    debt = DebtRecord.objects.create(shop=shop, person_name=f'{tag}-SECRETDEBT', amount=Decimal('7000'))
    nfc = NFCCard.objects.create(shop=shop, table=table1, name=f'{tag}-SECRETNFC', code=f'nfc_{sub}')

    return SimpleNamespace(
        sub=sub, tag=tag, shop=shop, host=f'{sub}.{PLATFORM}', owner=owner, manager=manager, waiter=waiter, kitchen=kitchen,
        hall=hall, table1=table1, table2=table2, category=category, product1=product1, product2=product2,
        order=order, item=item, call=call, reservation=reservation, tx=tx, debt=debt, nfc=nfc,
        marker=f'{tag}-SECRET')


def snapshot(t):
    """Tenantning o'zgarmasligi kerak bo'lgan holati (IDOR testlari: begona so'rovlardan keyin bir xil bo'lishi shart)."""
    def allm(model):
        return model.all_objects if hasattr(model, 'all_objects') else model._default_manager

    out = {}
    for key, model, pk, fields in (
        ('product1', Product, t.product1.pk, ('name', 'is_available', 'is_deleted', 'is_featured', 'price')),
        ('product2', Product, t.product2.pk, ('name', 'is_available', 'is_deleted', 'is_featured', 'price')),
        ('table1', Table, t.table1.pk, ('number', 'capacity', 'status', 'qr_token', 'is_deleted', 'is_active')),
        ('hall', Hall, t.hall.pk, ('name',)),
        ('order', Order, t.order.pk, ('status', 'payment_status', 'is_deleted')),
        ('waiter', AdminUser, t.waiter.pk, ('first_name', 'is_active', 'password', 'role')),
        ('tx', FinanceTransaction, t.tx.pk, ('is_cancelled', 'amount')),
        ('debt', DebtRecord, t.debt.pk, ('paid_amount', 'status')),
        ('reservation', TableReservation, t.reservation.pk, ('status', 'customer_name', 'is_deleted')),
        ('call', ServiceCall, t.call.pk, ('status',)),
        ('category', Category, t.category.pk, ('name', 'is_active')),
    ):
        row = allm(model).filter(pk=pk).values(*fields).first()
        out[key] = tuple(sorted((k, str(v)) for k, v in row.items())) if row else None
    out['counts'] = (
        Product.all_objects.filter(shop=t.shop).count(), Table.all_objects.filter(shop=t.shop).count(),
        Order.objects.filter(shop=t.shop).count(), AdminUser.objects.filter(shop=t.shop).count(),
        Category.objects.filter(shop=t.shop).count(), Hall.objects.filter(shop=t.shop).count(),
    )
    return out
