"""
Restoran Moliyasi Admin API URL yo'nalishlari.
Prefix: /api/restaurant/admin/v1/finance/
"""
from django.urls import path
from finance.interfaces.api.finance_admin import (
    FinanceCategoriesView,
    FinanceDebtPayView,
    FinanceDebtsListCreateView,
    FinanceExportCsvView,
    FinanceSummaryView,
    FinanceTransactionCancelView,
    FinanceTransactionsListCreateView,
)

urlpatterns = [
    path('summary/', FinanceSummaryView.as_view(), name='resto_admin_finance_summary'),
    path('transactions/', FinanceTransactionsListCreateView.as_view(), name='resto_admin_finance_transactions'),
    path('transactions/<int:pk>/cancel/', FinanceTransactionCancelView.as_view(), name='resto_admin_finance_tx_cancel'),
    path('debts/', FinanceDebtsListCreateView.as_view(), name='resto_admin_finance_debts'),
    path('debts/<int:pk>/pay/', FinanceDebtPayView.as_view(), name='resto_admin_finance_debt_pay'),
    path('categories/', FinanceCategoriesView.as_view(), name='resto_admin_finance_categories'),
    path('export.csv', FinanceExportCsvView.as_view(), name='resto_admin_finance_export_csv'),
]
