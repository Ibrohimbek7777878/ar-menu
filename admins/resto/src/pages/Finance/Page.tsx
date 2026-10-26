import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Receipt,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from 'lucide-react';
import { useFinance, type PeriodPreset } from './useFinance';
import { getExportCsvUrl, type FinanceTransaction, type DebtItem } from './api';

function formatSum(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0 so\'m';
  return Math.round(n).toLocaleString('uz-UZ').replace(/,/g, ' ') + ' so\'m';
}

export function FinancePage() {
  const {
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
    debts,
    debtsSummary,
    categories,
    loading,
    submitting,
    error,
    refresh,
    createTransaction,
    cancelTransaction,
    createDebt,
    payDebt,
  } = useFinance();

  // Modallar holati
  const [showTxModal, setShowTxModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [cancellingTx, setCancellingTx] = useState<FinanceTransaction | null>(null);
  const [payingDebt, setPayingDebt] = useState<DebtItem | null>(null);

  // Form maydonlari: Tranzaksiya
  const [newTxType, setNewTxType] = useState<'income' | 'expense'>('income');
  const [newTxTitle, setNewTxTitle] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxMethod, setNewTxMethod] = useState('cash');
  const [newTxCatId, setNewTxCatId] = useState<number | undefined>(undefined);
  const [txFormError, setTxFormError] = useState<string | null>(null);

  // Form maydonlari: Qarz
  const [newDebtPerson, setNewDebtPerson] = useState('');
  const [newDebtPhone, setNewDebtPhone] = useState('');
  const [newDebtType, setNewDebtType] = useState<'customer' | 'supplier'>('customer');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [newDebtNotes, setNewDebtNotes] = useState('');
  const [debtFormError, setDebtFormError] = useState<string | null>(null);

  // Form maydonlari: Storno bekor qilish
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Form maydonlari: Qarzga to'lov
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Tranzaksiya saqlash
  const submitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxFormError(null);
    const amt = parseFloat(newTxAmount.replace(/\s/g, ''));
    if (!amt || amt <= 0) {
      setTxFormError('To\'g\'ri summa kiriting');
      return;
    }
    if (!newTxTitle.trim()) {
      setTxFormError('Tranzaksiya mazmunini kiriting');
      return;
    }

    const res = await createTransaction({
      type: newTxType,
      title: newTxTitle.trim(),
      amount: amt,
      payment_method: newTxMethod,
      category_id: newTxCatId,
    });

    if (res.success) {
      setShowTxModal(false);
      setNewTxTitle('');
      setNewTxAmount('');
    } else {
      setTxFormError(res.error || 'Xatolik yuz berdi');
    }
  };

  // Qarz saqlash
  const submitDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtFormError(null);
    const amt = parseFloat(newDebtAmount.replace(/\s/g, ''));
    if (!amt || amt <= 0) {
      setDebtFormError('To\'g\'ri qarz summasini kiriting');
      return;
    }
    if (!newDebtPerson.trim()) {
      setDebtFormError('Shaxs yoki tashkilot ismini kiriting');
      return;
    }

    const res = await createDebt({
      person_name: newDebtPerson.trim(),
      phone: newDebtPhone.trim(),
      debt_type: newDebtType,
      initial_amount: amt,
      due_date: newDebtDueDate || undefined,
      notes: newDebtNotes.trim(),
    });

    if (res.success) {
      setShowDebtModal(false);
      setNewDebtPerson('');
      setNewDebtPhone('');
      setNewDebtAmount('');
      setNewDebtDueDate('');
      setNewDebtNotes('');
    } else {
      setDebtFormError(res.error || 'Xatolik yuz berdi');
    }
  };

  // Storno bekor qilish
  const submitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTx) return;
    setCancelError(null);
    if (!cancelReason.trim()) {
      setCancelError('Bekor qilish sababini ko\'rsatish shart');
      return;
    }

    const res = await cancelTransaction(cancellingTx.id, cancelReason.trim());
    if (res.success) {
      setCancellingTx(null);
      setCancelReason('');
    } else {
      setCancelError(res.error || 'Bekor qilib bo\'lmadi');
    }
  };

  // Qarz to'lash
  const submitPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    setPayError(null);
    const amt = parseFloat(payAmount.replace(/\s/g, ''));
    if (!amt || amt <= 0) {
      setPayError('To\'g\'ri to\'lov summasini kiriting');
      return;
    }
    if (amt > payingDebt.remaining_amount) {
      setPayError(`To'lov summasi qoldiqdan (${formatSum(payingDebt.remaining_amount)}) oshmasligi kerak`);
      return;
    }

    const res = await payDebt(payingDebt.id, {
      amount: amt,
      payment_method: payMethod,
      note: payNote.trim(),
    });

    if (res.success) {
      setPayingDebt(null);
      setPayAmount('');
      setPayNote('');
    } else {
      setPayError(res.error || 'To\'lov amalga oshmadi');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filtrlar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Moliya va Kassa
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kassa kirim-chiqimlari, sof pul oqimi va nasiyalar balansi
          </p>
        </div>

        {/* Davr filtri va Eksport */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            {(['today', 'week', 'month'] as PeriodPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  preset === p
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {p === 'today' ? 'Bugun' : p === 'week' ? '7 kun' : '30 kun'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                applyPreset('custom');
                setFromDate(e.target.value);
              }}
              className="bg-transparent border-0 p-0 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
            />
            <span className="text-neutral-400">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                applyPreset('custom');
                setToDate(e.target.value);
              }}
              className="bg-transparent border-0 p-0 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
            />
          </div>

          <a
            href={getExportCsvUrl(fromDate, toDate)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-medium transition-colors"
            title="Excel formatida CSV eksport qilish"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </a>
        </div>
      </div>

      {/* Xatolik xabari */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refresh} className="underline text-xs font-semibold ml-4">
            Qayta yuklash
          </button>
        </div>
      )}

      {/* 2. StatCards — 5 ta muhim ko'rsatkich */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Kirim */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Jami Tushum (Kirim)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {formatSum(summary?.income)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500">
            <span>Naqd: {formatSum(summary?.income_cash)}</span>
            <span>•</span>
            <span>Karta: {formatSum(summary?.income_card)}</span>
          </div>
        </div>

        {/* Chiqim */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Xarajatlar (Chiqim)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {formatSum(summary?.expense)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">Kassadan to'langan xarajatlar</p>
        </div>

        {/* Sof Pul Oqimi (Kirim - Chiqim) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Sof pul oqimi</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-bold mt-2 ${
              (summary?.net_cash_flow ?? 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatSum(summary?.net_cash_flow)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">Tushum minus Xarajat</p>
        </div>

        {/* Kassa Balansi */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Kassa qoldig'i</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {formatSum(summary?.cash_balance)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">Kassadagi jami naqd pul</p>
        </div>

        {/* O'rtacha Chek */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>O'rtacha chek</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            {formatSum(summary?.average_check)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">{summary?.orders_count || 0} ta buyurtma asosida</p>
        </div>
      </div>

      {/* 3. Tab Navigatsiyasi */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'transactions'
                ? 'text-neutral-900 dark:text-white border-b-2 border-emerald-600'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            Kassa Operatsiyalari (Kirim / Chiqim)
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'debts'
                ? 'text-neutral-900 dark:text-white border-b-2 border-emerald-600'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            Nasiyalar va Qarzlar Daftari
          </button>
        </div>

        {activeTab === 'transactions' ? (
          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-sm transition-colors mb-2"
          >
            <Plus className="w-4 h-4" />
            <span>Kirim / Chiqim qo'shish</span>
          </button>
        ) : (
          <button
            onClick={() => setShowDebtModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-sm transition-colors mb-2"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Qarz / Nasiya ochish</span>
          </button>
        )}
      </div>

      {/* TAB 1: KASSA TRANZAKSIYALARI */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filtrlar va Qidiruv */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                    txType === t
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {t === 'all' ? 'Barchasi' : t === 'income' ? 'Faqat Kirim' : 'Faqat Chiqim'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Mazmuni yoki izohi bo'yicha qidirish..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Tranzaksiyalar Jadvali */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutral-500">Ma'lumotlar yuklanmoqda...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                Ushbu davrda kassa operatsiyalari topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Sana</th>
                      <th className="py-3 px-4">Mazmuni</th>
                      <th className="py-3 px-4">Kategoriya</th>
                      <th className="py-3 px-4">To'lov Usuli</th>
                      <th className="py-3 px-4">Summa</th>
                      <th className="py-3 px-4">Holati</th>
                      <th className="py-3 px-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors ${
                          tx.is_cancelled ? 'opacity-50 line-through bg-neutral-50/30 dark:bg-neutral-900/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-neutral-500 font-mono whitespace-nowrap">
                          {tx.tx_date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">{tx.title}</div>
                          {tx.source_type !== 'manual' && (
                            <span className="text-[10px] text-neutral-400">
                              {tx.source_type === 'receipt' ? 'Chek tushumi' : 'Qarz to\'lovi'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {tx.category_name}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {tx.payment_method_display}
                        </td>
                        <td className="py-3 px-4 font-semibold whitespace-nowrap">
                          <span
                            className={
                              tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {tx.type === 'income' ? '+' : '-'} {formatSum(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tx.is_cancelled ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                <Ban className="w-3 h-3" />
                                Bekor qilingan (Storno)
                              </span>
                              {tx.cancel_reason && (
                                <span className="text-[10px] text-neutral-400 no-underline italic">
                                  Sabab: {tx.cancel_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Faol
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {!tx.is_cancelled && (
                            <button
                              onClick={() => {
                                setCancellingTx(tx);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="text-[11px] text-neutral-500 hover:text-rose-600 transition-colors font-medium"
                            >
                              Storno qilish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NASIYALAR VA QARZLAR */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          {/* Mini-stat: Ochiq qarzlar balansi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  Mijoz Nasiyalari (Bizga to'lanishi kerak)
                </span>
                <span className="text-sm font-bold">{formatSum(debtsSummary.open_receivable)}</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  Bizning qarzimiz (Yetkazib beruvchilarga)
                </span>
                <span className="text-sm font-bold">{formatSum(debtsSummary.open_payable)}</span>
              </div>
            </div>
          </div>

          {/* Filtrlar va Qidiruv */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['all', 'customer', 'supplier'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDebtType(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                    debtType === t
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {t === 'all' ? 'Barcha qarzlar' : t === 'customer' ? 'Mijoz nasiyasi' : 'Yetkazib beruvchi'}
                </button>
              ))}

              <select
                value={debtStatus}
                onChange={(e) => setDebtStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-700 dark:text-neutral-200 focus:outline-none"
              >
                <option value="all">Barcha holatlar</option>
                <option value="open">Ochiq (To'lanmagan)</option>
                <option value="settled">To'liq yopilgan</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={debtSearch}
                onChange={(e) => setDebtSearch(e.target.value)}
                placeholder="Shaxs yoki telefon bo'yicha qidirish..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Qarzlar Jadvali */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutral-500">Qarzlar daftari yuklanmoqda...</div>
            ) : debts.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                Ushbu mezon bo'yicha qarz yoki nasiyalar topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Shaxs / Tashkilot</th>
                      <th className="py-3 px-4">Turi</th>
                      <th className="py-3 px-4">Boshlang'ich Summa</th>
                      <th className="py-3 px-4">To'langan</th>
                      <th className="py-3 px-4">Qoldiq</th>
                      <th className="py-3 px-4">Qaytarish Muddati</th>
                      <th className="py-3 px-4">Holati</th>
                      <th className="py-3 px-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {debts.map((d) => (
                      <tr key={d.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{d.person_name}</div>
                          {d.phone && <div className="text-[11px] text-neutral-400 font-mono">{d.phone}</div>}
                          {d.notes && <div className="text-[10px] text-neutral-400 italic mt-0.5">{d.notes}</div>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              d.debt_type === 'customer'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {d.debt_type_display}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                          {formatSum(d.initial_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                          {formatSum(d.paid_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {formatSum(d.remaining_amount)}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 font-mono whitespace-nowrap">
                          {d.due_date || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.is_settled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              To'liq yopilgan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Ochiq qarz
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {!d.is_settled && (
                            <button
                              onClick={() => {
                                setPayingDebt(d);
                                setPayAmount(String(d.remaining_amount));
                                setPayMethod('cash');
                                setPayNote('');
                                setPayError(null);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              To'lov qabul qilish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: YANGI TRANZAKSIYA (KIRIM / CHIQIM) */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Kassaga Kirim / Chiqim kiritish
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitTx} className="space-y-4 mt-4">
              {txFormError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs">
                  {txFormError}
                </div>
              )}

              {/* Turi */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Operatsiya turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTxType('income')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      newTxType === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    + Kirim (Tushum)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTxType('expense')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      newTxType === 'expense'
                        ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    - Chiqim (Xarajat)
                  </button>
                </div>
              </div>

              {/* Mazmuni */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Mazmuni / Sarlavha
                </label>
                <input
                  type="text"
                  required
                  value={newTxTitle}
                  onChange={(e) => setNewTxTitle(e.target.value)}
                  placeholder="Masalan: Bozorlik xaridi, Go'sht, Kassa to'ldirish..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Summa va To'lov usuli */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Summa (so'm)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    placeholder="100 000"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    To'lov usuli
                  </label>
                  <select
                    value={newTxMethod}
                    onChange={(e) => setNewTxMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
                  >
                    <option value="cash">Naqd pul</option>
                    <option value="card">Plastik / Karta</option>
                    <option value="bank">Bank hisobi</option>
                  </select>
                </div>
              </div>

              {/* Kategoriya */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Kategoriya (Ixtiyoriy)
                  </label>
                  <select
                    value={newTxCatId || ''}
                    onChange={(e) => setNewTxCatId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
                  >
                    <option value="">Umumiy</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STORNO QILISH (BEKOR QILISH) */}
      {cancellingTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Tranzaksiyani storno qilish
              </h3>
              <button
                onClick={() => setCancellingTx(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCancel} className="space-y-4 mt-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Ushbu tranzaksiya o'chirilmaydi. U storno belgisi bilan bekor qilinadi va umumiy hisob-kitobdan
                chiqariladi. Bekor qilish sababini yozing:
              </p>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs space-y-1">
                <div>
                  <strong>Mazmuni:</strong> {cancellingTx.title}
                </div>
                <div>
                  <strong>Summa:</strong> {formatSum(cancellingTx.amount)} ({cancellingTx.type_display})
                </div>
                <div>
                  <strong>Sana:</strong> {cancellingTx.tx_date}
                </div>
              </div>

              {cancelError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Bekor qilish sababi (Majburiy)
                </label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Masalan: Adashib noto'g'ri summa kiritilgan..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCancellingTx(null)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Qaytish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Bekor qilinmoqda...' : 'Tasdiqlayman (Storno)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: YANGI QARZ / NASIYA */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Yangi Qarz / Nasiya ochish
              </h3>
              <button
                onClick={() => setShowDebtModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitDebt} className="space-y-4 mt-4">
              {debtFormError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs">
                  {debtFormError}
                </div>
              )}

              {/* Turi */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Qarz turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDebtType('customer')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      newDebtType === 'customer'
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Mijoz nasiyasi (Bizga)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDebtType('supplier')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      newDebtType === 'supplier'
                        ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Yetkazib beruvchi (Biz)
                  </button>
                </div>
              </div>

              {/* Ismi va Telefoni */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Ismi / Tashkilot
                  </label>
                  <input
                    type="text"
                    required
                    value={newDebtPerson}
                    onChange={(e) => setNewDebtPerson(e.target.value)}
                    placeholder="Akmal Aka"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Telefon raqami
                  </label>
                  <input
                    type="text"
                    value={newDebtPhone}
                    onChange={(e) => setNewDebtPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Summa va Muddat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Qarz summasi (so'm)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newDebtAmount}
                    onChange={(e) => setNewDebtAmount(e.target.value)}
                    placeholder="500 000"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Qaytarish muddati
                  </label>
                  <input
                    type="date"
                    value={newDebtDueDate}
                    onChange={(e) => setNewDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Izoh / Tafsilot
                </label>
                <textarea
                  value={newDebtNotes}
                  onChange={(e) => setNewDebtNotes(e.target.value)}
                  rows={2}
                  placeholder="Ziyofat uchun nasiya..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDebtModal(false)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Qarzni ochish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QARZGA TO'LOV QABUL QILISH */}
      {payingDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Qarz to'lovini qabul qilish
              </h3>
              <button
                onClick={() => setPayingDebt(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPayDebt} className="space-y-4 mt-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs space-y-1">
                <div>
                  <strong>Mijoz / Shaxs:</strong> {payingDebt.person_name}
                </div>
                <div>
                  <strong>Jami qarz:</strong> {formatSum(payingDebt.initial_amount)}
                </div>
                <div>
                  <strong>Hozirgi qoldiq:</strong>{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatSum(payingDebt.remaining_amount)}
                  </span>
                </div>
              </div>

              {payError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs">
                  {payError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    To'lov summasi (so'm)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={payingDebt.remaining_amount}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    To'lov usuli
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none"
                  >
                    <option value="cash">Naqd pul</option>
                    <option value="card">Plastik / Karta</option>
                    <option value="bank">Bank hisobi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Izoh (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Qisman to'lov..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Qabul qilinmoqda...' : 'To\'lovni kiritish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default FinancePage;
