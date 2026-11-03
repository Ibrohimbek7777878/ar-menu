import { useEffect, useState, useCallback } from 'react';
import { t } from '@admins/shared';
import {
  fetchFinanceSummary,
  fetchTransactions,
  fetchDebts,
  fetchCategories,
  createTransaction,
  cancelTransaction,
  createDebt,
  payDebt,
  type FinanceSummary,
  type FinanceTransaction,
  type DebtItem,
  type DebtsResponse,
  type CategoryItem,
} from './api';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

export function useFinance() {
  const [preset, setPreset] = useState<PeriodPreset>('today');
  const [fromDate, setFromDate] = useState<string>(() => formatDate(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatDate(new Date()));

  const [activeTab, setActiveTab] = useState<'transactions' | 'debts'>('transactions');

  // Tranzaksiyalar filtri
  const [txType, setTxType] = useState<string>('all');
  const [txPage, setTxPage] = useState<number>(1);
  const [txSearch, setTxSearch] = useState<string>('');

  // Qarzlar filtri
  const [debtType, setDebtType] = useState<string>('all');
  const [debtStatus, setDebtStatus] = useState<string>('all');
  const [debtSearch, setDebtSearch] = useState<string>('');

  // Holatlar
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [txPagination, setTxPagination] = useState({ total: 0, num_pages: 1, page: 1 });
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [debtsSummary, setDebtsSummary] = useState<DebtsResponse['summary']>({
    total_debts_count: 0,
    open_receivable: 0,
    open_payable: 0,
  });
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Preset o'zgarganda sana oraliqlarini belgilash
  const applyPreset = (newPreset: PeriodPreset) => {
    setPreset(newPreset);
    const now = new Date();
    if (newPreset === 'today') {
      const todayStr = formatDate(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (newPreset === 'week') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setFromDate(formatDate(past));
      setToDate(formatDate(now));
    } else if (newPreset === 'month') {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      setFromDate(formatDate(past));
      setToDate(formatDate(now));
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sumRes, txRes, debtsRes, catRes] = await Promise.all([
        fetchFinanceSummary(fromDate, toDate),
        fetchTransactions({
          page: txPage,
          type: txType,
          from: fromDate,
          to: toDate,
          q: txSearch,
        }),
        fetchDebts({
          type: debtType,
          status: debtStatus,
          q: debtSearch,
        }),
        fetchCategories(),
      ]);

      setSummary(sumRes);
      setTransactions(txRes.items);
      setTxPagination({ total: txRes.total, num_pages: txRes.num_pages, page: txRes.page });
      setDebts(debtsRes.items);
      setDebtsSummary(debtsRes.summary);
      setCategories(catRes);
    } catch (err: any) {
      // Server xabari ham, zaxira matn ham tanlangan tilda (kaliti yo'q server xabari o'zicha qoladi)
      setError(err?.message ? t(err.message) : t("Moliyaviy ma'lumotlarni yuklashda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, txPage, txType, txSearch, debtType, debtStatus, debtSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Yangi tranzaksiya
  const handleCreateTransaction = async (data: {
    type: 'income' | 'expense';
    amount: number;
    title: string;
    payment_method: string;
    category_id?: number;
    tx_date?: string;
  }) => {
    try {
      setSubmitting(true);
      await createTransaction(data);
      await loadData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ? t(err.message) : t('Tranzaksiya saqlanmadi') };
    } finally {
      setSubmitting(false);
    }
  };

  // Tranzaksiyani bekor qilish (storno)
  const handleCancelTransaction = async (id: number, reason: string) => {
    try {
      setSubmitting(true);
      await cancelTransaction(id, reason);
      await loadData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ? t(err.message) : t("Tranzaksiyani bekor qilib bo'lmadi") };
    } finally {
      setSubmitting(false);
    }
  };

  // Yangi qarz / nasiya
  const handleCreateDebt = async (data: {
    person_name: string;
    phone?: string;
    debt_type: 'customer' | 'supplier';
    initial_amount: number;
    due_date?: string;
    notes?: string;
  }) => {
    try {
      setSubmitting(true);
      await createDebt(data);
      await loadData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ? t(err.message) : t('Qarz yozuvi saqlanmadi') };
    } finally {
      setSubmitting(false);
    }
  };

  // Qarzga to'lov qabul qilish
  const handlePayDebt = async (id: number, data: { amount: number; payment_method: string; note?: string }) => {
    try {
      setSubmitting(true);
      await payDebt(id, data);
      await loadData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ? t(err.message) : t("To'lov qabul qilinmadi") };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    preset,
    applyPreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    activeTab,
    setActiveTab,
    txType,
    setTxType,
    txPage,
    setTxPage,
    txSearch,
    setTxSearch,
    debtType,
    setDebtType,
    debtStatus,
    setDebtStatus,
    debtSearch,
    setDebtSearch,
    summary,
    transactions,
    txPagination,
    debts,
    debtsSummary,
    categories,
    loading,
    submitting,
    error,
    refresh: loadData,
    createTransaction: handleCreateTransaction,
    cancelTransaction: handleCancelTransaction,
    createDebt: handleCreateDebt,
    payDebt: handlePayDebt,
  };
}
