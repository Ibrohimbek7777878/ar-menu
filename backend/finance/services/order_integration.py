import logging
from decimal import Decimal
from finance.models import FinanceTransaction, FinanceCategory
from finance.services.defaults import seed_default_categories_for_shop

logger = logging.getLogger(__name__)

def record_order_payment_income(order):
    """
    Buyurtma to'langanda yoki yetkazib berilganda (delivered) avtomatik ravishda
    sellerning Kassa & Moliya tushumiga FinanceTransaction qo'shish.
    """
    try:
        if not order or not getattr(order, 'shop', None):
            return None

        # Agar ushbu buyurtma uchun allaqachon kirim yozilgan bo'lsa, qayta yozilmaydi
        if FinanceTransaction.objects.filter(order=order, tx_type='income').exists():
            return None

        amount = getattr(order, 'final_amount', None) or getattr(order, 'total_amount', Decimal('0'))
        if not amount or amount <= 0:
            return None

        # Stol buyurtmasi yoki yetkazib berish kategoriyasini moslashtirish
        has_table = getattr(order, 'table', None) or getattr(order, 'table_number', None)
        target_name = "Zaldagi Taom Savdosi" if has_table else "Yetkazib berish"

        cat = FinanceCategory.objects.filter(
            shop=order.shop, category_type='income', name__icontains=target_name[:6]
        ).first()
        if not cat:
            cat = FinanceCategory.objects.filter(shop=order.shop, category_type='income').first()
        if not cat:
            seed_default_categories_for_shop(order.shop)
            cat = FinanceCategory.objects.filter(shop=order.shop, category_type='income').first()

        # To'lov usulini aniqlash
        pm_str = str(getattr(order, 'payment_method', '') or '').lower()
        if any(w in pm_str for w in ['payme', 'click', 'uzum', 'card', 'karta']):
            payment_method = 'card'
        elif any(w in pm_str for w in ['bank', 'transfer', 'hisob']):
            payment_method = 'bank'
        else:
            payment_method = 'cash'

        source_info = f"Stol #{order.table.number}" if getattr(order, 'table', None) else f"Buyurtma #{order.pk}"
        cust = getattr(order, 'customer', None)
        customer_name = getattr(cust, 'full_name', '') or getattr(order, 'contact_name', '') or 'Mijoz'

        tx = FinanceTransaction.objects.create(
            shop=order.shop,
            order=order,
            category=cat,
            tx_type='income',
            amount=amount,
            payment_method=payment_method,
            title=f"Savdo: {source_info}",
            notes=f"Avtomatik kassa tushumi: Buyurtma #{order.pk} ({customer_name})"
        )
        logger.info(f"Order #{order.pk} recorded as finance income {amount} UZS for shop {order.shop.name}")
        return tx
    except Exception as e:
        logger.warning(f"Failed to record order #{getattr(order, 'pk', '?')} in finance: {e}")
        return None
