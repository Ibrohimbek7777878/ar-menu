"""
finance/services/summary.py

Yagona konsolidatsiyalangan bugungi kun hisob-kitobi (Toshkent vaqti, Asia/Tashkent).
Barcha joylarda (React dashboard, React moliya, Seller dashboard, Telegram /kassa)
bir xil hisoblash kafolatlanadi.
"""
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum

from finance.models import FinanceTransaction
from orders.models import Order
from orders.timeutils import local_day_start, local_today


def today_summary(shop):
    """
    Do'kon/restoranning bugungi (Asia/Tashkent) moliyaviy va buyurtma ko'rsatkichlari.
    shop: Shop obyekti yoki None.
    Qaytaradi:
      - income (Decimal): Bugungi jami tushum / kirim (bekor qilinmagan)
      - income_cash (Decimal): Naqd puldagi tushum
      - income_card (Decimal): Plastik / karta / bank tushumi
      - expense (Decimal): Bugungi jami chiqim
      - net_profit (Decimal): Sof foyda (income - expense)
      - orders_count (int): Bugungi buyurtmalar soni (bekor qilinmagan)
      - all_orders_count (int): Bugungi jami buyurtmalar soni (bekor qilinganlar bilan)
      - today_orders_count (int): orders_count bilan bir xil (alias)
      - today_revenue (float): float(income)
      - revenue (Decimal): income bilan bir xil (alias)
      - average_check (Decimal): O'rtacha chek (income / orders_count)
      - today_date (date): Toshkent sanasi
    """
    if not shop:
        return {
            'income': Decimal('0'),
            'income_cash': Decimal('0'),
            'income_card': Decimal('0'),
            'expense': Decimal('0'),
            'net_profit': Decimal('0'),
            'orders_count': 0,
            'all_orders_count': 0,
            'today_orders_count': 0,
            'today_revenue': 0.0,
            'revenue': Decimal('0'),
            'average_check': Decimal('0'),
            'today_date': local_today(),
        }

    today = local_today()
    day_start = local_day_start()
    day_end = day_start + timedelta(days=1)

    # 1. Tranzaksiyalar bo'yicha hisob (Kassa)
    tx_today = FinanceTransaction.objects.filter(
        shop=shop,
        tx_date=today,
        is_cancelled=False,
    )
    income_txs = tx_today.filter(tx_type='income', stage__in=['income', 'realized'])
    expense_txs = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized'])

    tx_income = income_txs.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    tx_cash = income_txs.filter(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    tx_card = income_txs.filter(payment_method__in=['card', 'bank']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    expense = expense_txs.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    # 2. Buyurtmalar bo'yicha hisob
    today_orders_qs = Order.objects.filter(
        shop=shop,
        created_at__gte=day_start,
        created_at__lt=day_end,
    )
    all_orders_count = today_orders_qs.count()
    active_orders = today_orders_qs.exclude(status__in=['cancelled', 'failed'])
    orders_count = active_orders.count()
    orders_revenue = active_orders.aggregate(s=Sum('final_amount'))['s'] or Decimal('0')

    # Tushum: agar FinanceTransaction'da kirim bo'lsa, u kassa tushumidir;
    # agar buyurtmalar to'langan bo'lib moliya yozuvi yozilgan bo'lsa tx_income buyurtmalar tushumini o'z ichiga oladi.
    # Agar tx_income mavjud bo'lmasa (masalan hali FinanceTransaction yaratilmagan buyurtmalar bo'lsa),
    # orders_revenue olinadi.
    if tx_income > 0:
        income = tx_income
        income_cash = tx_cash
        income_card = tx_card
    else:
        income = orders_revenue
        # Order modelida to'g'ridan-to'g'ri payment_method maydoni yo'q:
        # agar alohida card to'lov tranzaksiyasi bo'lmasa, card 0 deb olinadi
        income_card = Decimal('0')
        income_cash = income

    net_profit = income - expense
    avg_check = (income / orders_count).quantize(Decimal('0.01')) if orders_count > 0 else Decimal('0')

    return {
        'income': income,
        'income_cash': income_cash,
        'income_card': income_card,
        'expense': expense,
        'net_profit': net_profit,
        'orders_count': orders_count,
        'all_orders_count': all_orders_count,
        'today_orders_count': orders_count,
        'today_revenue': float(income),
        'revenue': income,
        'average_check': avg_check,
        'today_date': today,
    }
