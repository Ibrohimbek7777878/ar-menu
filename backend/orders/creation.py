"""
Buyurtma yaratishning YAGONA joyi (TZ: R10-3, R10-5).

Avval 9 ta joyda `Order.objects.create(...)` bor edi va raqam "mavjudligini tekshirib, keyin yozish" usulida olinardi:
ikki bir vaqtdagi buyurtma bir xil raqamni tanlab, ikkinchisi `unique` cheklovda yiqilardi (buyurtma yo'qolardi).
Endi raqamni berish va yozish bitta joyda: to'qnashuv bo'lsa yangi raqam bilan qayta uriniladi (savepoint ichida,
tashqi tranzaksiya buzilmaydi).

`orders/test_order_creation.py` boshqa joyda `Order.objects.create` yozilmasligini tekshiradi.
"""
from django.db import IntegrityError, transaction

from orders.models import Order
from orders.numbering import next_order_number

MAX_ATTEMPTS = 8


def create_order(**fields) -> Order:
    """
    Buyurtma yaratadi va noyob `order_number` beradi.

    `order_number` berilsa, birinchi urinishda shu raqam ishlatiladi; band bo'lsa yangisi olinadi.
    """
    number = fields.pop('order_number', None) or next_order_number()
    for attempt in range(MAX_ATTEMPTS):
        try:
            with transaction.atomic():
                return Order.objects.create(order_number=number, **fields)
        except IntegrityError:
            # Faqat raqam to'qnashuvi qayta uriniladi; boshqa cheklov buzilishi (masalan manfiy summa) o'z holicha ko'tariladi
            if not Order.objects.filter(order_number=number).exists() or attempt == MAX_ATTEMPTS - 1:
                raise
            number = next_order_number()
    raise RuntimeError('unreachable')
