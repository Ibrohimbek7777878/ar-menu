"""
Moliya yozuvlarini qo'lda tahrirlash API'si (TZ_MULTITENANT Bosqich 5). Prefiks: /api/restaurant/admin/v1/finance/

  PATCH transactions/<id>/          qo'lda kiritilgan kirim/chiqimni sabab bilan tahrirlash
  GET   transactions/<id>/          bitta operatsiya (tahrirlanish holati bilan)
  GET   transactions/<id>/history/  o'zgarish tarixi (eng yangisi birinchi) + asl qiymatlar
  PATCH debts/<id>/                 qarz/nasiyani sabab bilan tahrirlash
  GET   debts/<id>/                 bitta qarz
  GET   debts/<id>/history/         o'zgarish tarixi

Hammasi faqat `finance` ruxsatli xodimga (sezgir ruxsat: standart bo'yicha ega va menejer; boshqaga alohida beriladi) va faqat o'z restorani
doirasida: begona restoran yozuvi 404. Tahrir mantiqi: finance/services/revisions.py.
"""
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from backend.api_input import RestoAdminAPIView
from finance.interfaces.api.finance_admin import _serialize_debt, _serialize_tx
from finance.models import DebtRecord, FinanceRevision, FinanceTransaction
from finance.services.revisions import (
    debt_snapshot,
    edit_debt,
    edit_transaction,
    history_payload,
    serialize_revision,
    tx_snapshot,
)
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from web.restaurant_auth import staff_shop


class _FinanceEditView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('finance')]

    @staticmethod
    def shop_of(request):
        shop = staff_shop(request)
        if not shop:
            raise NotFound('Restoran topilmadi')
        return shop


class FinanceTransactionDetailView(_FinanceEditView):
    """GET/PATCH /finance/transactions/<pk>/"""

    def get(self, request, pk):
        shop = self.shop_of(request)
        return Response(_serialize_tx(get_object_or_404(FinanceTransaction.objects.select_related('category'), pk=pk, shop=shop)))

    def patch(self, request, pk):
        shop = self.shop_of(request)
        tx, revision = edit_transaction(shop=shop, pk=pk, data=request.data, actor=request.user, request=request)
        return Response({**_serialize_tx(tx, revisions_count=revision.revision_no), 'revision': serialize_revision(revision)})


class FinanceTransactionHistoryView(_FinanceEditView):
    """GET /finance/transactions/<pk>/history/"""

    def get(self, request, pk):
        shop = self.shop_of(request)
        tx = get_object_or_404(FinanceTransaction.objects.select_related('category'), pk=pk, shop=shop)
        return Response(history_payload(shop, FinanceRevision.TARGET_TRANSACTION, tx.pk, tx_snapshot(tx)))


class FinanceDebtDetailView(_FinanceEditView):
    """GET/PATCH /finance/debts/<pk>/"""

    def get(self, request, pk):
        shop = self.shop_of(request)
        return Response(_serialize_debt(get_object_or_404(DebtRecord, pk=pk, shop=shop)))

    def patch(self, request, pk):
        shop = self.shop_of(request)
        debt, revision = edit_debt(shop=shop, pk=pk, data=request.data, actor=request.user, request=request)
        return Response({**_serialize_debt(debt, revisions_count=revision.revision_no), 'revision': serialize_revision(revision)})


class FinanceDebtHistoryView(_FinanceEditView):
    """GET /finance/debts/<pk>/history/"""

    def get(self, request, pk):
        shop = self.shop_of(request)
        debt = get_object_or_404(DebtRecord, pk=pk, shop=shop)
        return Response(history_payload(shop, FinanceRevision.TARGET_DEBT, debt.pk, debt_snapshot(debt)))
