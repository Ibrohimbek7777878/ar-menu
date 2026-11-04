"""
Restoran Moliyasi REST API (Finance Admin API).
Faqat restoran egasi va moliya boshqaruvchilari uchun (capability: 'finance').
Storno-based immutability, range_summary, N+1 optimizatsiyasi va AuditLog to'liq ta'minlanadi.
"""
import csv
from decimal import Decimal
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import F, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from backend.api_input import (
    InputError,
    RestoAdminAPIView,
    parse_date,
    parse_decimal,
    parse_id,
    parse_text,
    query_date,
    query_flag,
    query_id,
    query_int,
    query_text,
)
from backend.csv_safety import csv_text
from finance.models import DebtRecord, FinanceCategory, FinanceRevision, FinanceTransaction
from finance.services.revisions import (
    MAX_AMOUNT,
    MIN_AMOUNT,
    revision_count,
    revision_count_subquery,
    tx_edit_lock,
)
from finance.services.summary import range_summary, today_summary
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from orders.timeutils import local_today
from web.restaurant_auth import staff_shop


_PAYMENT_DISPLAY = {'cash': 'Naqd', 'card': 'Plastik / Karta', 'bank': 'Bank hisobi'}


def _revisions_of(obj, target_type, given):
    """Tahrirlar soni: berilgan, ro'yxat so'rovidagi annotatsiya yoki (yagona obyekt uchun) bitta so'rov."""
    if given is not None:
        return given
    annotated = getattr(obj, 'revisions_count', None)
    return annotated if annotated is not None else revision_count(target_type, obj.pk)


def _serialize_tx(t, revisions_count=None):
    if t.order_id:
        source = 'receipt'
    elif t.debt_id:
        source = 'debt_payment'
    else:
        source = 'manual'

    revisions = _revisions_of(t, FinanceRevision.TARGET_TRANSACTION, revisions_count)
    edit_lock = tx_edit_lock(t)       # None | 'cancelled' | 'source_locked' (qo'lda tahrirlab bo'lmaydi)

    return {
        'id': t.id,
        'title': t.title,
        'type': t.tx_type,
        'type_display': 'Kirim' if t.tx_type == 'income' else 'Chiqim',
        'category_id': t.category_id,
        'category_name': t.category.name if t.category else 'Umumiy',
        'amount': float(t.amount),
        'payment_method': t.payment_method,
        'payment_method_display': _PAYMENT_DISPLAY.get(t.payment_method, 'Plastik / Karta'),
        'source_type': source,
        'notes': t.notes or '',
        'tx_date': t.tx_date.isoformat(),
        'created_at': t.created_at.isoformat(),
        'is_cancelled': bool(t.is_cancelled),
        'cancel_reason': t.cancel_reason or '',
        'cancelled_at': t.cancelled_at.isoformat() if t.cancelled_at else None,
        'edited': revisions > 0,
        'revisions_count': revisions,
        'can_edit': edit_lock is None,
        'edit_lock': edit_lock,
    }


def _serialize_debt(d, revisions_count=None):
    revisions = _revisions_of(d, FinanceRevision.TARGET_DEBT, revisions_count)
    is_settled = (d.status == 'settled') or (d.paid_amount >= d.amount)
    return {
        'id': d.id,
        'person_name': d.person_name,
        'phone': d.phone or '',
        'debt_type': d.debt_type,
        'debt_type_display': 'Mijoz nasiyasi' if d.debt_type == 'customer' else "Yetkazib beruvchiga qarz",
        'initial_amount': float(d.amount),
        'paid_amount': float(d.paid_amount),
        'remaining_amount': float(d.remaining_amount),
        'status': d.status,
        'status_display': d.get_status_display() if hasattr(d, 'get_status_display') else d.status,
        'is_settled': is_settled,
        'due_date': d.due_date.isoformat() if d.due_date else None,
        'notes': d.notes or '',
        'created_at': d.created_at.isoformat(),
        'edited': revisions > 0,
        'revisions_count': revisions,
    }


class FinanceSummaryView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/finance/summary/?from=&to= — Moliyaviy ko'rsatkichlar va Sof pul oqimi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        from_date = query_date(request, 'from')       # noto'g'ri sana — 400
        to_date = query_date(request, 'to')

        data = range_summary(shop, from_date, to_date)

        return Response({
            'income': float(data['income']),
            'income_cash': float(data['income_cash']),
            'income_card': float(data['income_card']),
            'expense': float(data['expense']),
            'net_cash_flow': float(data['net_cash_flow']),
            'net_profit': float(data['net_profit']),
            'orders_count': data['orders_count'],
            'average_check': float(data['average_check']),
            'cash_balance': float(data['cash_balance']),
            'from_date': data['from_date'].isoformat() if hasattr(data['from_date'], 'isoformat') else str(data['from_date']),
            'to_date': data['to_date'].isoformat() if hasattr(data['to_date'], 'isoformat') else str(data['to_date']),
        })


class FinanceTransactionsListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/finance/transactions/ — Tranzaksiyalar ro'yxati (paginatsiya, filtrlash).
    POST /api/restaurant/admin/v1/finance/transactions/ — Yangi kirim yoki chiqim kiritish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        qs = (
            FinanceTransaction.objects.filter(shop=shop)
            .select_related('category', 'order', 'debt')
            .annotate(revisions_count=revision_count_subquery(FinanceRevision.TARGET_TRANSACTION))
            .order_by('-tx_date', '-id')
        )

        # 1. Type filter
        tx_type = query_text(request, 'type', 20)
        if tx_type in ('income', 'expense'):
            qs = qs.filter(tx_type=tx_type)

        # 2. Payment method filter
        method = query_text(request, 'payment_method', 20)
        if method in ('cash', 'card', 'bank'):
            qs = qs.filter(payment_method=method)

        # 3. Category filter
        cat_id = query_id(request, 'category_id')
        if cat_id:
            qs = qs.filter(category_id=cat_id)

        # 4. Sana oralig'i (noto'g'ri sana — 400; avval ORM ValidationError → 500)
        from_date = query_date(request, 'from')
        to_date = query_date(request, 'to')
        if from_date:
            qs = qs.filter(tx_date__gte=from_date)
        if to_date:
            qs = qs.filter(tx_date__lte=to_date)

        # 5. Bekor qilinganlar
        if not query_flag(request, 'include_cancelled'):
            qs = qs.filter(is_cancelled=False)

        # 6. Qidiruv
        q = query_text(request, 'q', 50)
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(category__name__icontains=q))

        # Paginatsiya
        page = query_int(request, 'page', 1, 1, 1_000_000)
        page_size = query_int(request, 'page_size', 25, 5, 100)

        paginator = Paginator(qs, page_size)
        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages if paginator.num_pages > 0 else 1)

        return Response({
            'items': [_serialize_tx(t) for t in page_obj.object_list],
            'page': page_obj.number,
            'page_size': page_size,
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        })

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        title = parse_text(request.data.get('title'), 'title', max_length=255)
        tx_type = parse_text(request.data.get('type') or request.data.get('tx_type'), 'type', max_length=20)
        payment_method = parse_text(request.data.get('payment_method', 'cash'), 'payment_method', max_length=20)

        if not title:
            return Response({'error': 'Tranzaksiya sarlavhasi kiritilishi shart', 'field': 'title'}, status=status.HTTP_400_BAD_REQUEST)

        if tx_type not in ('income', 'expense'):
            return Response({'error': 'Tranzaksiya turi "income" yoki "expense" bo\'lishi kerak', 'field': 'type'}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method not in ('cash', 'card', 'bank'):
            payment_method = 'cash'

        amount = parse_decimal(request.data.get('amount', '0'), 'amount', minimum=MIN_AMOUNT, maximum=MAX_AMOUNT)

        category = None
        category_id = parse_id(request.data.get('category_id'), 'category_id')
        if category_id:
            category = FinanceCategory.objects.filter(id=category_id, shop=shop).first()
            if category is None:
                raise InputError("Kategoriya topilmadi", 'category_id')

        tx_date = parse_date(request.data.get('tx_date'), 'tx_date') or local_today()

        with transaction.atomic():
            tx = FinanceTransaction.objects.create(
                shop=shop,
                title=title,
                tx_type=tx_type,
                stage=tx_type,
                amount=amount,
                payment_method=payment_method,
                category=category,
                tx_date=tx_date,
                created_by=request.user,
            )

            log_audit(
                'finance_tx_created',
                request=request,
                actor=request.user,
                target_type='finance_transaction',
                target_id=tx.id,
                new_value={
                    'title': tx.title,
                    'type': tx.tx_type,
                    'amount': float(tx.amount),
                    'payment_method': tx.payment_method,
                }
            )

        return Response(_serialize_tx(tx, revisions_count=0), status=status.HTTP_201_CREATED)


class FinanceTransactionCancelView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/finance/transactions/<pk>/cancel/ — Tranzaksiyani storno qilish (bekor qilish).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def post(self, request, pk):
        shop = staff_shop(request)
        get_object_or_404(FinanceTransaction, pk=pk, shop=shop)

        reason = parse_text(request.data.get('reason'), 'reason', max_length=255)

        with transaction.atomic():
            # Qator qulfi: parallel tahrir/ikkinchi storno bilan to'qnashmaydi (qarz qoldig'i ikki marta tiklanmaydi)
            tx = FinanceTransaction.objects.select_for_update().filter(pk=pk, shop=shop).first()
            if tx is None:
                return Response({'error': 'Yozuv topilmadi'}, status=status.HTTP_404_NOT_FOUND)
            if tx.is_cancelled:
                return Response({'error': 'Tranzaksiya allaqachon bekor qilingan'}, status=status.HTTP_400_BAD_REQUEST)
            if not reason:
                return Response({'error': 'Bekor qilish sababini ko\'rsating', 'field': 'reason'}, status=status.HTTP_400_BAD_REQUEST)
            from finance.services.order_integration import cancel_finance_transaction
            cancel_finance_transaction(tx, reason=reason, actor=request.user, request=request)

        return Response(_serialize_tx(tx))


class FinanceDebtsListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/finance/debts/ — Nasiyalar va qarzlar ro'yxati.
    POST /api/restaurant/admin/v1/finance/debts/ — Yangi nasiya/qarz ochish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        qs = (DebtRecord.objects.filter(shop=shop)
              .annotate(revisions_count=revision_count_subquery(FinanceRevision.TARGET_DEBT))
              .order_by('status', '-created_at'))

        # 1. Type
        debt_type = query_text(request, 'type', 20)
        if debt_type in ('customer', 'supplier'):
            qs = qs.filter(debt_type=debt_type)

        # 2. Status
        status_param = query_text(request, 'status', 20)
        if status_param == 'open':
            qs = qs.exclude(status='settled')
        elif status_param == 'settled':
            qs = qs.filter(status='settled')

        # 3. Search
        q = query_text(request, 'q', 50)
        if q:
            qs = qs.filter(Q(person_name__icontains=q) | Q(phone__icontains=q))

        debts = list(qs)
        open_receivable = sum((d.remaining_amount for d in debts if d.debt_type == 'customer' and d.status != 'settled'), Decimal('0'))
        open_payable = sum((d.remaining_amount for d in debts if d.debt_type == 'supplier' and d.status != 'settled'), Decimal('0'))

        return Response({
            'items': [_serialize_debt(d) for d in debts],
            'summary': {
                'total_debts_count': len(debts),
                'open_receivable': float(open_receivable),  # Bizga qarz (nasiyalar)
                'open_payable': float(open_payable),        # Bizning qarzimiz (yetkazib beruvchilarga)
            }
        })

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        person_name = parse_text(request.data.get('person_name') or request.data.get('debtor_name'), 'person_name', max_length=150)
        phone = parse_text(request.data.get('phone'), 'phone', max_length=50)
        debt_type = parse_text(request.data.get('debt_type', 'customer'), 'debt_type', max_length=20)
        notes = parse_text(request.data.get('notes') or request.data.get('note'), 'notes', max_length=2000)

        if not person_name:
            return Response({'error': 'Shaxs/tashkilot ismi kiritilishi shart', 'field': 'person_name'}, status=status.HTTP_400_BAD_REQUEST)

        if debt_type not in ('customer', 'supplier'):
            debt_type = 'customer'

        raw_amt = request.data.get('initial_amount') or request.data.get('total_amount') or request.data.get('amount')
        amount = parse_decimal(raw_amt, 'initial_amount', minimum=MIN_AMOUNT, maximum=MAX_AMOUNT)

        due_date = parse_date(request.data.get('due_date'), 'due_date')

        with transaction.atomic():
            debt = DebtRecord.objects.create(
                shop=shop,
                person_name=person_name,
                phone=phone,
                debt_type=debt_type,
                amount=amount,
                paid_amount=Decimal('0'),
                status='pending',
                due_date=due_date,
                notes=notes,
            )

            log_audit(
                'debt_created',
                request=request,
                actor=request.user,
                target_type='debt_record',
                target_id=debt.id,
                new_value={'person_name': debt.person_name, 'amount': float(debt.amount), 'type': debt.debt_type}
            )

        return Response(_serialize_debt(debt, revisions_count=0), status=status.HTTP_201_CREATED)


class FinanceDebtPayView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/finance/debts/<pk>/pay/ — Qarz to'lovini qabul qilish.
    Qator qulfi (select_for_update) orqali race condition himoyalangan.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def post(self, request, pk):
        shop = staff_shop(request)
        payment_method = parse_text(request.data.get('payment_method', 'cash'), 'payment_method', max_length=20)
        if payment_method not in ('cash', 'card', 'bank'):
            payment_method = 'cash'

        pay_amount = parse_decimal(request.data.get('amount', '0'), 'amount', minimum=MIN_AMOUNT, maximum=MAX_AMOUNT)

        with transaction.atomic():
            debt = get_object_or_404(DebtRecord.objects.select_for_update(), pk=pk, shop=shop)

            if debt.status == 'settled' or debt.remaining_amount <= 0:
                return Response({'error': 'Ushbu qarz allaqachon to\'liq yopilgan'}, status=status.HTTP_400_BAD_REQUEST)

            if pay_amount > debt.remaining_amount:
                return Response({
                    'error': f'To\'lov summasi qarz qoldig\'idan ({int(debt.remaining_amount)} so\'m) oshmasligi kerak',
                    'field': 'amount'
                }, status=status.HTTP_400_BAD_REQUEST)

            debt.paid_amount += pay_amount
            if debt.paid_amount >= debt.amount:
                debt.paid_amount = debt.amount
                debt.status = 'settled'
            else:
                debt.status = 'partial'
            debt.save(update_fields=['paid_amount', 'status', 'updated_at'])

            # Qarz to'lovi bo'yicha kassa tranzaksiyasi
            tx_type = 'income' if debt.debt_type == 'customer' else 'expense'
            title = f"Nasiya to'lovi: {debt.person_name}" if debt.debt_type == 'customer' else f"Qarz to'lovi: {debt.person_name}"

            tx = FinanceTransaction.objects.create(
                shop=shop,
                title=title,
                tx_type=tx_type,
                stage=tx_type,
                amount=pay_amount,
                payment_method=payment_method,
                debt=debt,
                tx_date=local_today(),
                created_by=request.user,
            )

            log_audit(
                'debt_payment_received',
                request=request,
                actor=request.user,
                target_type='debt_record',
                target_id=debt.id,
                new_value={'paid_amount': float(debt.paid_amount), 'remaining': float(debt.remaining_amount)}
            )

        return Response(_serialize_debt(debt))


class FinanceCategoriesView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/finance/categories/ — Moliya kategoriyalari ro'yxati.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        cats = FinanceCategory.objects.filter(Q(shop=shop) | Q(shop__isnull=True)).order_by('name')
        return Response([{
            'id': c.id,
            'name': c.name,
            'type': c.category_type if hasattr(c, 'category_type') else 'both',
        } for c in cats])


class FinanceExportCsvView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/finance/export.csv?from=&to= — Excelda to'g'ri ochiluvchi UTF-8 BOM CSV eksport.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        qs = FinanceTransaction.objects.filter(shop=shop).select_related('category').order_by('-tx_date', '-id')

        from_date = query_date(request, 'from')
        to_date = query_date(request, 'to')
        if from_date:
            qs = qs.filter(tx_date__gte=from_date)
        if to_date:
            qs = qs.filter(tx_date__lte=to_date)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="moliya_{local_today()}.csv"'

        # UTF-8 BOM qo'shish (Excel o'zbek kirill/lotin harflarini to'g'ri ko'rsatishi uchun)
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow(['ID', 'Sana', 'Tranzaksiya', 'Turi', 'Kategoriya', 'Summa (so\'m)', 'To\'lov Usuli', 'Holati', 'Bekor Qilish Sababi'])

        for t in qs:
            # Matnli ustunlar csv_text() orqali (formula injection); ID va summa raqamligicha qoladi
            writer.writerow([
                t.id,
                t.tx_date.isoformat(),
                csv_text(t.title),
                'Kirim' if t.tx_type == 'income' else 'Chiqim',
                csv_text(t.category.name if t.category else 'Umumiy'),
                int(t.amount),
                'Naqd' if t.payment_method == 'cash' else 'Plastik / Karta',
                'Bekor qilingan' if t.is_cancelled else 'Faol',
                csv_text(t.cancel_reason),
            ])

        return response
