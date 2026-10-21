"""
Restoran moliyasi REST API (React "Moliya & Kassa" sahifasi uchun). TZ: R-FIN-03, R-FIN-04, R-FIN-07.

Avval React moliya sahifasidagi kirim/chiqim/nasiya yozuvlari faqat brauzerning localStorage'ida yashardi:
kesh tozalansa yo'qolardi, boshqa qurilmada ko'rinmasdi. Endi hammasi serverda:
  - yozuvlar o'chirilmaydi va tahrirlanmaydi — bekor qilish = storno (sabab, kim, qachon saqlanadi);
  - qarz to'lovi qarz qoldig'idan oshmaydi (qator qulfi bilan);
  - har bir o'zgarish audit logga yoziladi.
Hammasi faqat restoran rahbariyati uchun va faqat o'z restorani doirasida.
"""
import logging
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from finance.models import DebtRecord, FinanceCategory, FinanceTransaction
from orders.audit import log_audit
from orders.interfaces.api.permissions import IsRestaurantManager
from orders.interfaces.api.views import RestaurantAPIView
from orders.timeutils import local_today

logger = logging.getLogger(__name__)

MAX_AMOUNT = Decimal('1000000000000')          # 1 trln so'm — xato kiritishdan himoya
_METHODS = {code for code, _ in FinanceTransaction.PAYMENT_CHOICES}


# ─── Serializatsiya (GET finance/ ham shu funksiyalardan foydalanadi) ───────────────────────────
def serialize_tx(t):
    if t.order_id:
        source = 'receipt'
    elif t.debt_id:
        source = 'debt_payment'
    else:
        source = 'manual'
    return {
        'id': t.id,
        'type': t.tx_type,
        'category': t.category.name if t.category else 'Umumiy',
        'amount': float(t.amount),
        'payment_method': t.payment_method,
        'source_type': source,
        'description': t.title,
        'created_at': t.created_at.isoformat(),
        'is_cancelled': t.is_cancelled,
        'cancellation_reason': t.cancel_reason,
        'cancelled_at': t.cancelled_at.isoformat() if t.cancelled_at else None,
    }


def serialize_debt(d):
    return {
        'id': d.id,
        'type': 'receivable' if d.debt_type == 'customer' else 'payable',
        'person_name': d.person_name,
        'phone': d.phone,
        'description': d.notes,
        'total_amount': float(d.amount),
        'paid_amount': float(d.paid_amount),
        'remaining_amount': float(d.remaining_amount),
        'status': 'settled' if d.status == 'settled' else ('partially_paid' if d.status == 'partial' else 'pending'),
        'created_at': d.created_at.isoformat(),
        'due_date': str(d.due_date) if d.due_date else None,
    }


# ─── Yordamchilar ────────────────────────────────────────────────────────────────────────────────
class ValidationFailed(Exception):
    pass


def parse_amount(raw) -> Decimal:
    """Summa: musbat, ≤ MAX_AMOUNT. "150 000", "150000,50" kabi yozuvlarni tushunadi."""
    text = str(raw if raw is not None else '').replace(' ', '').replace(' ', '').replace(',', '.')
    try:
        amount = Decimal(text)
    except (InvalidOperation, ValueError):
        raise ValidationFailed("Summa noto'g'ri kiritildi")
    if not amount.is_finite() or amount <= 0:
        raise ValidationFailed("Summa 0 dan katta bo'lishi kerak")
    if amount > MAX_AMOUNT:
        raise ValidationFailed("Summa juda katta")
    return amount.quantize(Decimal('0.01'))


def parse_method(raw) -> str:
    return raw if raw in _METHODS else 'cash'


def _audit(request, target_type, target_id, old=None, new=None):
    try:
        log_audit('payment', request=request._request, actor=request.user, target_type=target_type,
                  target_id=target_id, old_value=old or {}, new_value=new or {})
    except Exception:
        logger.exception("Moliya audit logini yozib bo'lmadi")


def _fail(message, http_status=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message}, status=http_status)


# ─── Endpoint'lar ────────────────────────────────────────────────────────────────────────────────
class FinanceTxCreateView(RestaurantAPIView):
    """POST /finance/tx/ — qo'lda kirim yoki chiqim."""
    permission_classes = [IsRestaurantManager]

    def post(self, request):
        data = request.data
        tx_type = data.get('type')
        if tx_type not in ('income', 'expense'):
            return _fail("Operatsiya turi kirim yoki chiqim bo'lishi kerak")
        try:
            amount = parse_amount(data.get('amount'))
        except ValidationFailed as e:
            return _fail(str(e))

        shop = self.staff_shop()
        category_name = str(data.get('category') or ('Umumiy Kirim' if tx_type == 'income' else 'Xarajat')).strip()[:100]
        category, _ = FinanceCategory.objects.get_or_create(
            shop=shop, name=category_name, category_type=tx_type, defaults={'icon': '💵' if tx_type == 'income' else '🧾'},
        )
        default_title = 'Kassaga kirim qilindi' if tx_type == 'income' else 'Kassadan chiqim qilindi'
        tx = FinanceTransaction.objects.create(
            shop=shop, category=category, tx_type=tx_type, stage=tx_type, amount=amount,
            payment_method=parse_method(data.get('payment_method')),
            title=(str(data.get('description') or '').strip() or default_title)[:255],
            tx_date=local_today(), created_by=request.user,
        )
        _audit(request, 'finance_tx', tx.pk, new={'type': tx_type, 'amount': str(amount), 'method': tx.payment_method})
        return Response(serialize_tx(tx), status=status.HTTP_201_CREATED)


class FinanceTxCancelView(RestaurantAPIView):
    """
    POST /finance/tx/<id>/cancel/ — storno: yozuv o'chirilmaydi, sabab bilan bekor qilinadi.
    Qarz to'lovi bekor qilinsa, qarz qoldig'i tiklanadi. Chek (buyurtma kirimi) bu yerdan bekor qilinmaydi.
    """
    permission_classes = [IsRestaurantManager]

    @transaction.atomic
    def post(self, request, tx_id):
        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            return _fail("Bekor qilish sababini yozing")
        tx = FinanceTransaction.objects.select_for_update().filter(pk=tx_id, shop=self.staff_shop()).first()
        if not tx:
            return _fail('Yozuv topilmadi', status.HTTP_404_NOT_FOUND)
        if tx.is_cancelled:
            return _fail('Bu yozuv allaqachon bekor qilingan')
        if tx.order_id:
            return _fail("Chek kirimini bu yerdan bekor qilib bo'lmaydi: buyurtmani bekor qiling")

        restored = None
        if tx.debt_id:
            debt = DebtRecord.objects.select_for_update().get(pk=tx.debt_id)
            debt.paid_amount = max(Decimal('0'), debt.paid_amount - tx.amount)
            debt.status = 'pending' if debt.paid_amount == 0 else 'partial'
            debt.save(update_fields=['paid_amount', 'status', 'updated_at'])
            restored = serialize_debt(debt)

        tx.is_cancelled = True
        tx.cancel_reason = reason[:255]
        tx.cancelled_by = request.user
        tx.cancelled_at = timezone.now()
        tx.save(update_fields=['is_cancelled', 'cancel_reason', 'cancelled_by', 'cancelled_at'])
        _audit(request, 'finance_tx', tx.pk, old={'amount': str(tx.amount), 'cancelled': False},
               new={'cancelled': True, 'reason': reason[:255]})
        return Response({'transaction': serialize_tx(tx), 'debt': restored})


class FinanceDebtCreateView(RestaurantAPIView):
    """POST /finance/debts/ — nasiya (mijoz bizga) yoki qarz (biz ta'minotchiga)."""
    permission_classes = [IsRestaurantManager]

    def post(self, request):
        data = request.data
        kind = data.get('type')
        if kind not in ('receivable', 'payable'):
            return _fail("Qarz turi noto'g'ri")
        person = str(data.get('person_name') or '').strip()
        if not person:
            return _fail('Ism yoki tashkilot nomini kiriting')
        try:
            amount = parse_amount(data.get('total_amount'))
        except ValidationFailed as e:
            return _fail(str(e))
        due = None
        if data.get('due_date'):
            try:
                due = date.fromisoformat(str(data['due_date']))
            except ValueError:
                return _fail("Qaytarish sanasi noto'g'ri (YYYY-MM-DD)")

        debt = DebtRecord.objects.create(
            shop=self.staff_shop(), debt_type='customer' if kind == 'receivable' else 'supplier',
            person_name=person[:150], phone=str(data.get('phone') or '')[:50], amount=amount,
            notes=str(data.get('description') or '')[:1000], due_date=due,
        )
        _audit(request, 'debt', debt.pk, new={'type': kind, 'amount': str(amount), 'person': person[:150]})
        return Response(serialize_debt(debt), status=status.HTTP_201_CREATED)


class FinanceDebtPayView(RestaurantAPIView):
    """POST /finance/debts/<id>/pay/ — qarzni (qisman) to'lash; summa qoldiqdan oshmaydi."""
    permission_classes = [IsRestaurantManager]

    @transaction.atomic
    def post(self, request, debt_id):
        try:
            pay = parse_amount(request.data.get('amount'))
        except ValidationFailed as e:
            return _fail(str(e))
        shop = self.staff_shop()
        debt = DebtRecord.objects.select_for_update().filter(pk=debt_id, shop=shop).first()
        if not debt:
            return _fail('Qarz topilmadi', status.HTTP_404_NOT_FOUND)

        remaining = debt.remaining_amount
        if pay > remaining:
            # Avval React ortiqcha summani ham kassaga yozardi: 200 000 qarzga 1 000 000 to'lansa, +1 000 000 kirim chiqardi
            return _fail(f"To'lov summasi qarz qoldig'idan ({int(remaining):,} so'm) ko'p bo'lishi mumkin emas".replace(',', ' '))

        income = debt.debt_type == 'customer'
        debt.paid_amount += pay
        debt.status = 'settled' if debt.paid_amount >= debt.amount else 'partial'
        debt.save(update_fields=['paid_amount', 'status', 'updated_at'])

        tx_type = 'income' if income else 'expense'
        category, _ = FinanceCategory.objects.get_or_create(
            shop=shop, name='Nasiya Qaytarildi' if income else "Qarz To'lovi (Yetkazib beruvchi)",
            category_type=tx_type, defaults={'icon': '🤝'},
        )
        note = str(request.data.get('notes') or '').strip()
        tx = FinanceTransaction.objects.create(
            shop=shop, category=category, tx_type=tx_type, stage=tx_type, amount=pay, debt=debt,
            payment_method=parse_method(request.data.get('payment_method')),
            title=f"{debt.person_name} ({'Nasiya qaytardi' if income else "Qarz to'landi"}){': ' + note if note else ''}"[:255],
            tx_date=local_today(), created_by=request.user,
        )
        _audit(request, 'debt', debt.pk, old={'paid': str(debt.paid_amount - pay)},
               new={'paid': str(debt.paid_amount), 'payment': str(pay), 'tx': tx.pk})
        return Response({'debt': serialize_debt(debt), 'transaction': serialize_tx(tx)}, status=status.HTTP_201_CREATED)
