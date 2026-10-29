"""
Restoran Moliyasi REST API (Finance Admin API).
Faqat restoran egasi va moliya boshqaruvchilari uchun (capability: 'finance').
Storno-based immutability, range_summary, N+1 optimizatsiyasi va AuditLog to'liq ta'minlanadi.
"""
import csv
from datetime import date
from decimal import Decimal, InvalidOperation
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import F, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import DebtRecord, FinanceCategory, FinanceTransaction
from finance.services.summary import range_summary, today_summary
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from orders.timeutils import local_today
from web.restaurant_auth import staff_shop


MAX_AMOUNT = Decimal('1000000000000')  # 1 trln so'm xavfsizlik chegarasi


def _serialize_tx(t):
    if t.order_id:
        source = 'receipt'
    elif t.debt_id:
        source = 'debt_payment'
    else:
        source = 'manual'

    return {
        'id': t.id,
        'title': t.title,
        'type': t.tx_type,
        'type_display': 'Kirim' if t.tx_type == 'income' else 'Chiqim',
        'category_id': t.category_id,
        'category_name': t.category.name if t.category else 'Umumiy',
        'amount': float(t.amount),
        'payment_method': t.payment_method,
        'payment_method_display': 'Naqd' if t.payment_method == 'cash' else 'Plastik / Karta',
        'source_type': source,
        'tx_date': t.tx_date.isoformat(),
        'created_at': t.created_at.isoformat(),
        'is_cancelled': bool(t.is_cancelled),
        'cancel_reason': t.cancel_reason or '',
        'cancelled_at': t.cancelled_at.isoformat() if t.cancelled_at else None,
    }


def _serialize_debt(d):
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
    }


class FinanceSummaryView(APIView):
    """
    GET /api/restaurant/admin/v1/finance/summary/?from=&to= — Moliyaviy ko'rsatkichlar va Sof pul oqimi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        from_param = request.GET.get('from', '').strip()
        to_param = request.GET.get('to', '').strip()

        from_date = None
        to_date = None
        try:
            if from_param:
                from_date = date.fromisoformat(from_param)
            if to_param:
                to_date = date.fromisoformat(to_param)
        except ValueError:
            pass

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


class FinanceTransactionsListCreateView(APIView):
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
            .order_by('-tx_date', '-id')
        )

        # 1. Type filter
        tx_type = request.GET.get('type', '').strip()
        if tx_type in ('income', 'expense'):
            qs = qs.filter(tx_type=tx_type)

        # 2. Payment method filter
        method = request.GET.get('payment_method', '').strip()
        if method in ('cash', 'card', 'bank'):
            qs = qs.filter(payment_method=method)

        # 3. Category filter
        cat_id = request.GET.get('category_id')
        if cat_id and cat_id.isdigit():
            qs = qs.filter(category_id=int(cat_id))

        # 4. Sana oralig'i
        from_date = request.GET.get('from', '').strip()
        to_date = request.GET.get('to', '').strip()
        if from_date:
            qs = qs.filter(tx_date__gte=from_date)
        if to_date:
            qs = qs.filter(tx_date__lte=to_date)

        # 5. Bekor qilinganlar
        include_cancelled = request.GET.get('include_cancelled', 'false').lower() in ('1', 'true')
        if not include_cancelled:
            qs = qs.filter(is_cancelled=False)

        # 6. Qidiruv
        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(category__name__icontains=q))

        # Paginatsiya
        page = 1
        page_size = 25
        try:
            page = max(1, int(request.GET.get('page', 1)))
            page_size = min(100, max(5, int(request.GET.get('page_size', 25))))
        except (ValueError, TypeError):
            pass

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

        title = str(request.data.get('title', '')).strip()
        tx_type = str(request.data.get('type') or request.data.get('tx_type') or '').strip()
        payment_method = str(request.data.get('payment_method', 'cash')).strip()
        category_id = request.data.get('category_id')

        if not title:
            return Response({'error': 'Tranzaksiya sarlavhasi kiritilishi shart', 'field': 'title'}, status=status.HTTP_400_BAD_REQUEST)

        if tx_type not in ('income', 'expense'):
            return Response({'error': 'Tranzaksiya turi "income" yoki "expense" bo\'lishi kerak', 'field': 'type'}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method not in ('cash', 'card', 'bank'):
            payment_method = 'cash'

        try:
            amount = Decimal(str(request.data.get('amount', '0')).replace(' ', '').replace(',', '.'))
            if amount <= 0 or amount > MAX_AMOUNT:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Noto\'g\'ri summa kiritildi', 'field': 'amount'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = FinanceCategory.objects.filter(id=category_id, shop=shop).first()

        tx_date_param = request.data.get('tx_date')
        tx_date = local_today()
        if tx_date_param:
            try:
                tx_date = date.fromisoformat(str(tx_date_param)[:10])
            except ValueError:
                pass

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

        return Response(_serialize_tx(tx), status=status.HTTP_201_CREATED)


class FinanceTransactionCancelView(APIView):
    """
    POST /api/restaurant/admin/v1/finance/transactions/<pk>/cancel/ — Tranzaksiyani storno qilish (bekor qilish).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def post(self, request, pk):
        shop = staff_shop(request)
        tx = get_object_or_404(FinanceTransaction, pk=pk, shop=shop)

        if tx.is_cancelled:
            return Response({'error': 'Tranzaksiya allaqachon bekor qilingan'}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            return Response({'error': 'Bekor qilish sababini ko\'rsating', 'field': 'reason'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            from finance.services.order_integration import cancel_finance_transaction
            cancel_finance_transaction(tx, reason=reason, actor=request.user, request=request)

        return Response(_serialize_tx(tx))


class FinanceDebtsListCreateView(APIView):
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

        qs = DebtRecord.objects.filter(shop=shop).order_by('status', '-created_at')

        # 1. Type
        debt_type = request.GET.get('type', '').strip()
        if debt_type in ('customer', 'supplier'):
            qs = qs.filter(debt_type=debt_type)

        # 2. Status
        status_param = request.GET.get('status', '').strip()
        if status_param == 'open':
            qs = qs.exclude(status='settled')
        elif status_param == 'settled':
            qs = qs.filter(status='settled')

        # 3. Search
        q = request.GET.get('q', '').strip()
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

        person_name = str(request.data.get('person_name') or request.data.get('debtor_name') or '').strip()
        phone = str(request.data.get('phone', '')).strip()
        debt_type = str(request.data.get('debt_type', 'customer')).strip()
        notes = str(request.data.get('notes') or request.data.get('note') or '').strip()

        if not person_name:
            return Response({'error': 'Shaxs/tashkilot ismi kiritilishi shart', 'field': 'person_name'}, status=status.HTTP_400_BAD_REQUEST)

        if debt_type not in ('customer', 'supplier'):
            debt_type = 'customer'

        raw_amt = request.data.get('initial_amount') or request.data.get('total_amount') or request.data.get('amount')
        try:
            amount = Decimal(str(raw_amt or '0').replace(' ', '').replace(',', '.'))
            if amount <= 0 or amount > MAX_AMOUNT:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Noto\'g\'ri qarz summasi', 'field': 'initial_amount'}, status=status.HTTP_400_BAD_REQUEST)

        due_date = None
        due_date_param = request.data.get('due_date')
        if due_date_param:
            try:
                due_date = date.fromisoformat(str(due_date_param)[:10])
            except ValueError:
                pass

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

        return Response(_serialize_debt(debt), status=status.HTTP_201_CREATED)


class FinanceDebtPayView(APIView):
    """
    POST /api/restaurant/admin/v1/finance/debts/<pk>/pay/ — Qarz to'lovini qabul qilish.
    Qator qulfi (select_for_update) orqali race condition himoyalangan.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    def post(self, request, pk):
        shop = staff_shop(request)
        payment_method = str(request.data.get('payment_method', 'cash')).strip()
        if payment_method not in ('cash', 'card', 'bank'):
            payment_method = 'cash'

        try:
            pay_amount = Decimal(str(request.data.get('amount', '0')).replace(' ', '').replace(',', '.'))
            if pay_amount <= 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Noto\'g\'ri to\'lov summasi', 'field': 'amount'}, status=status.HTTP_400_BAD_REQUEST)

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


class FinanceCategoriesView(APIView):
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


class FinanceExportCsvView(APIView):
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

        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
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
            writer.writerow([
                t.id,
                t.tx_date.isoformat(),
                t.title,
                'Kirim' if t.tx_type == 'income' else 'Chiqim',
                t.category.name if t.category else 'Umumiy',
                int(t.amount),
                'Naqd' if t.payment_method == 'cash' else 'Plastik / Karta',
                'Bekor qilingan' if t.is_cancelled else 'Faol',
                t.cancel_reason or '',
            ])

        return response
