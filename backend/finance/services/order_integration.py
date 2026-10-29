"""
Buyurtma to'lovini moliya kirimiga aylantirish (TZ: R-FIN-01, R-FIN-02, R-FIN-06).

Qoidalar:
  1. Kirim FAQAT buyurtma haqiqatan to'langanda (payment_status='paid') yoziladi.
     Avval "yetkazildi" bo'lishi bilan, hali pul olinmagan bo'lsa ham yozilardi — keyin stol yopilganda
     yana yozilib, daromad ikki marta hisoblanardi.
  2. Bitta buyurtma uchun bitta faol kirim (bazada noyoblik cheklovi bilan kafolatlanadi).
  3. To'lov turi aniq beriladi yoki Payment yozuvidan olinadi. Avval Order'da bunday maydon yo'q edi va
     `getattr(order, 'payment_method', '')` har doim bo'sh bo'lib, karta to'lovlari ham naqd yozilardi.
  4. Sana — Toshkent sanasi.
"""
import logging
from decimal import Decimal

from django.db import IntegrityError, transaction

from finance.models import FinanceCategory, FinanceTransaction
from finance.services.defaults import seed_default_categories_for_shop
from orders.timeutils import local_today

logger = logging.getLogger(__name__)

_CARD_PROVIDERS = {'click', 'payme', 'uzcard', 'uzum', 'card', 'karta', 'mock'}
_VALID_METHODS = {code for code, _ in FinanceTransaction.PAYMENT_CHOICES}


def payment_method_for(order, explicit=None) -> str:
    """Kassaga yoziladigan to'lov turi: aniq berilgan → to'langan Payment provayderi → naqd."""
    if explicit in _VALID_METHODS:
        return explicit
    try:
        from payments.models import Payment
        paid = Payment.objects.filter(order=order, status='paid').order_by('-id').first()
        if paid:
            return 'card' if str(paid.provider).lower() in _CARD_PROVIDERS else 'cash'
    except Exception:  # pragma: no cover — Payment jadvali bo'lmasa naqd deb olinadi
        logger.exception("Payment provayderini aniqlab bo'lmadi")
    return 'cash'


def _income_category(shop, has_table):
    target = "Zaldagi Taom Savdosi" if has_table else "Yetkazib berish"
    cat = FinanceCategory.objects.filter(shop=shop, category_type='income', name__icontains=target[:6]).first()
    if not cat:
        cat = FinanceCategory.objects.filter(shop=shop, category_type='income').first()
    if not cat:
        seed_default_categories_for_shop(shop)
        cat = FinanceCategory.objects.filter(shop=shop, category_type='income').first()
    return cat


def record_order_payment_income(order, payment_method=None, actor=None):
    """
    To'langan buyurtma uchun kassa kirimini yozadi. Idempotent: qayta chaqirilsa yangi yozuv qo'shilmaydi.
    To'lanmagan buyurtma uchun hech narsa yozilmaydi. Yaratilgan yozuv yoki None qaytaradi.
    """
    try:
        if not order or not getattr(order, 'shop', None):
            return None
        if getattr(order, 'payment_status', '') != 'paid':
            return None
        if FinanceTransaction.objects.filter(order=order, tx_type='income', is_cancelled=False).exists():
            return None

        amount = getattr(order, 'final_amount', None) or getattr(order, 'total_amount', Decimal('0'))
        if not amount or amount <= 0:
            return None

        table = getattr(order, 'table', None)
        source_info = f"Stol #{table.number}" if table else f"Buyurtma #{order.order_number}"
        customer_name = getattr(order, 'customer_name', '') or 'Mijoz'

        try:
            with transaction.atomic():
                tx = FinanceTransaction.objects.create(
                    shop=order.shop,
                    order=order,
                    category=_income_category(order.shop, bool(table)),
                    tx_type='income',
                    stage='income',
                    amount=amount,
                    payment_method=payment_method_for(order, payment_method),
                    title=f"Savdo: {source_info}",
                    notes=f"Avtomatik kassa tushumi: {order.order_number} ({customer_name})",
                    tx_date=local_today(),
                    created_by=actor if getattr(actor, 'pk', None) else None,
                )
        except IntegrityError:
            # Parallel jarayon xuddi shu buyurtma kirimini allaqachon yozgan (noyoblik cheklovi ushladi)
            return None
        logger.info("Buyurtma %s kassaga %s so'm kirim (%s)", order.order_number, amount, tx.payment_method)
        return tx
    except Exception:
        logger.exception("Buyurtma %s kirimini yozib bo'lmadi", getattr(order, 'order_number', '?'))
        return None


def cancel_finance_transaction(tx, reason: str, actor=None, request=None):
    """
    Tranzaksiyani storno qilish (bekor qilish).
    Bog'langan qarz mavjud bo'lsa qoldiqni tiklaydi va audit qaydini yozadi.
    """
    from django.utils import timezone
    from orders.audit import log_audit

    with transaction.atomic():
        tx.is_cancelled = True
        tx.cancel_reason = reason
        tx.cancelled_at = timezone.now()
        tx.cancelled_by = actor if getattr(actor, 'pk', None) else None
        tx.save(update_fields=['is_cancelled', 'cancel_reason', 'cancelled_at', 'cancelled_by'])

        if tx.debt_id:
            from finance.models import DebtRecord
            debt = DebtRecord.objects.select_for_update().get(pk=tx.debt_id, shop=tx.shop)
            debt.paid_amount = max(Decimal('0'), debt.paid_amount - tx.amount)
            if debt.paid_amount == 0:
                debt.status = 'pending'
            elif debt.paid_amount < debt.amount:
                debt.status = 'partial'
            else:
                debt.status = 'settled'
            debt.save(update_fields=['paid_amount', 'status', 'updated_at'])

        log_audit(
            'finance_tx_cancelled',
            request=request,
            actor=actor,
            target_type='finance_transaction',
            target_id=tx.id,
            new_value={'is_cancelled': True, 'cancel_reason': reason}
        )
        return tx


def cancel_order_income_transactions(order, reason: str = "To'lov qaytarildi", actor=None, request=None):
    """
    Buyurtmaga tegishli barcha faol kirim tranzaksiyalarini storno qiladi.
    """
    active_incomes = list(FinanceTransaction.objects.filter(
        order=order,
        tx_type='income',
        is_cancelled=False,
    ))
    cancelled = []
    for tx in active_incomes:
        cancel_finance_transaction(tx, reason=reason, actor=actor, request=request)
        cancelled.append(tx)
    return cancelled
