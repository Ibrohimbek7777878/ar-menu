"""
Buyurtma raqami generatori (TZ: R-GST-06).

Avval restoran servisi `Order.objects.count() + 101` ishlatardi: bir vaqtdagi ikki buyurtma bir xil raqam
olib `unique` cheklovda yiqilardi va buyurtma jimgina yo'qolardi; bitta buyurtma o'chirilsa raqamlash
butunlay to'xtardi. Endi raqam tasodifiy qismli va mavjudligi tekshiriladi.
"""
import random
from datetime import datetime

from orders.models import Order


def next_order_number() -> str:
    """GLS-YYYYMMDD-NNNN — noyob (mavjudligi tekshiriladi, to'qnashsa qayta urinadi)."""
    day = datetime.now().strftime('%Y%m%d')
    for _ in range(50):
        number = f'GLS-{day}-{random.randint(1000, 9999)}'
        if not Order.objects.filter(order_number=number).exists():
            return number
    # Kun ichida juda ko'p buyurtma — raqamni uzaytiramiz
    return f'GLS-{day}-{random.randint(100000, 999999)}'
