import React, { useState } from 'react';
import {
  Card,
  Button,
  Modal,
} from '@admins/shared';
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
} from 'lucide-react';
import { useFinance, type PeriodPreset } from './useFinance';
import { getExportCsvUrl, type FinanceTransaction, type DebtItem } from './api';

function formatSum(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0 so\'m';
  return Math.round(n).toLocaleString('uz-UZ').replace(/,/g, ' ') + ' so\'m';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-main)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '6px',
};

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
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Filtrlar */}
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Moliya va Kassa
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Kassa kirim-chiqimlari, sof pul oqimi va nasiyalar balansi
          </p>
        </div>

        {/* Davr filtri va Eksport */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-elevated)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['today', 'week', 'month'] as PeriodPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: preset === p ? 'var(--accent-emerald)' : 'transparent',
                  color: preset === p ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {p === 'today' ? 'Bugun' : p === 'week' ? '7 kun' : '30 kun'}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-elevated)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                applyPreset('custom');
                setFromDate(e.target.value);
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ color: 'var(--text-dim)' }}>—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                applyPreset('custom');
                setToDate(e.target.value);
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <a
            href={getExportCsvUrl(fromDate, toDate)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
            }}
            title="Excel formatida CSV eksport qilish"
          >
            <FileSpreadsheet size={16} color="var(--accent-emerald)" />
            <span>CSV</span>
          </a>
        </div>
      </Card>

      {/* Xatolik xabari */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-rose)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={refresh}>
            Qayta yuklash
          </Button>
        </div>
      )}

      {/* 2. StatCards — 5 ta muhim ko'rsatkich */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Kirim */}
        <Card hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Jami Tushum (Kirim)
            </span>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'var(--accent-emerald-bg)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent-emerald)',
                display: 'flex',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            {formatSum(summary?.income)}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
            <span>Naqd: {formatSum(summary?.income_cash)}</span>
            <span>•</span>
            <span>Karta: {formatSum(summary?.income_card)}</span>
          </div>
        </Card>

        {/* Chiqim */}
        <Card hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Xarajatlar (Chiqim)
            </span>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'var(--accent-rose-bg)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent-rose)',
                display: 'flex',
              }}
            >
              <TrendingDown size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            {formatSum(summary?.expense)}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
            Kassadan to'langan xarajatlar
          </p>
        </Card>

        {/* Sof Pul Oqimi */}
        <Card hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Sof pul oqimi
            </span>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                borderRadius: 'var(--radius-md)',
                color: '#3b82f6',
                display: 'flex',
              }}
            >
              <Wallet size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              marginTop: '8px',
              color: (summary?.net_cash_flow ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            }}
          >
            {formatSum(summary?.net_cash_flow)}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
            Tushum minus Xarajat
          </p>
        </Card>

        {/* Kassa Balansi */}
        <Card hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Kassa qoldig'i
            </span>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'var(--accent-amber-bg)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent-amber)',
                display: 'flex',
              }}
            >
              <Coins size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            {formatSum(summary?.cash_balance)}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
            Kassadagi jami naqd pul
          </p>
        </Card>

        {/* O'rtacha Chek */}
        <Card hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              O'rtacha chek
            </span>
            <div
              style={{
                padding: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.12)',
                borderRadius: 'var(--radius-md)',
                color: '#a855f7',
                display: 'flex',
              }}
            >
              <Receipt size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color: 'var(--text-main)' }}>
            {formatSum(summary?.average_check)}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
            {summary?.orders_count || 0} ta buyurtma asosida
          </p>
        </Card>
      </div>

      {/* 3. Tab Navigatsiyasi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '10px 4px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'transactions' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
              color: activeTab === 'transactions' ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Kassa Operatsiyalari (Kirim / Chiqim)
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            style={{
              padding: '10px 4px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'debts' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
              color: activeTab === 'debts' ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Nasiyalar va Qarzlar Daftari
          </button>
        </div>

        {activeTab === 'transactions' ? (
          <Button variant="primary" size="sm" onClick={() => setShowTxModal(true)}>
            <Plus size={16} />
            <span>Kirim / Chiqim qo'shish</span>
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setShowDebtModal(true)} style={{ backgroundColor: '#2563eb' }}>
            <Plus size={16} />
            <span>Yangi Qarz / Nasiya ochish</span>
          </Button>
        )}
      </div>

      {/* TAB 1: KASSA TRANZAKSIYALARI */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filtrlar va Qidiruv */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: txType === t ? 'var(--accent-emerald)' : 'var(--bg-elevated)',
                    color: txType === t ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {t === 'all' ? 'Barchasi' : t === 'income' ? 'Faqat Kirim' : 'Faqat Chiqim'}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Mazmuni yoki izohi bo'yicha qidirish..."
                style={{
                  ...inputStyle,
                  paddingLeft: '34px',
                }}
              />
            </div>
          </div>

          {/* Tranzaksiyalar Jadvali */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Ma'lumotlar yuklanmoqda...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Ushbu davrda kassa operatsiyalari topilmadi.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Sana</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Mazmuni</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Kategoriya</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>To'lov Usuli</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Summa</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Holati</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          opacity: tx.is_cancelled ? 0.5 : 1,
                          textDecoration: tx.is_cancelled ? 'line-through' : 'none',
                          backgroundColor: tx.is_cancelled ? 'var(--bg-elevated)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {tx.tx_date}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{tx.title}</div>
                          {tx.source_type !== 'manual' && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {tx.source_type === 'receipt' ? 'Chek tushumi' : 'Qarz to\'lovi'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {tx.category_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {tx.payment_method_display}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span style={{ color: tx.type === 'income' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                            {tx.type === 'income' ? '+' : '-'} {formatSum(tx.amount)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {tx.is_cancelled ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-rose)' }}>
                                <Ban size={12} />
                                Bekor qilingan (Storno)
                              </span>
                              {tx.cancel_reason && (
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                  Sabab: {tx.cancel_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                              <CheckCircle2 size={12} />
                              Faol
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {!tx.is_cancelled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCancellingTx(tx);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              style={{ color: 'var(--accent-rose)' }}
                            >
                              Storno qilish
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: NASIYALAR VA QARZLAR */}
      {activeTab === 'debts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mini-stat: Ochiq qarzlar balansi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <Card style={{ backgroundColor: 'var(--accent-emerald-bg)', borderColor: 'var(--accent-emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                  <ArrowDownLeft size={18} />
                  Mijoz Nasiyalari (Bizga to'lanishi kerak)
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  {formatSum(debtsSummary.open_receivable)}
                </span>
              </div>
            </Card>

            <Card style={{ backgroundColor: 'var(--accent-amber-bg)', borderColor: 'var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                  <ArrowUpRight size={18} />
                  Bizning qarzimiz (Yetkazib beruvchilarga)
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {formatSum(debtsSummary.open_payable)}
                </span>
              </div>
            </Card>
          </div>

          {/* Filtrlar va Qidiruv */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(['all', 'customer', 'supplier'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDebtType(t)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: debtType === t ? 'var(--accent-emerald)' : 'var(--bg-elevated)',
                    color: debtType === t ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {t === 'all' ? 'Barcha qarzlar' : t === 'customer' ? 'Mijoz nasiyasi' : 'Yetkazib beruvchi'}
                </button>
              ))}

              <select
                value={debtStatus}
                onChange={(e) => setDebtStatus(e.target.value)}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  padding: '6px 12px',
                }}
              >
                <option value="all">Barcha holatlar</option>
                <option value="open">Ochiq (To'lanmagan)</option>
                <option value="settled">To'liq yopilgan</option>
              </select>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                value={debtSearch}
                onChange={(e) => setDebtSearch(e.target.value)}
                placeholder="Shaxs yoki telefon bo'yicha qidirish..."
                style={{
                  ...inputStyle,
                  paddingLeft: '34px',
                }}
              />
            </div>
          </div>

          {/* Qarzlar Jadvali */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Qarzlar daftari yuklanmoqda...
              </div>
            ) : debts.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Ushbu mezon bo'yicha qarz yoki nasiyalar topilmadi.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Shaxs / Tashkilot</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Turi</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Boshlang'ich Summa</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>To'langan</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Qoldiq</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Qaytarish Muddati</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Holati</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.person_name}</div>
                          {d.phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{d.phone}</div>}
                          {d.notes && <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '2px' }}>{d.notes}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: d.debt_type === 'customer' ? 'var(--accent-emerald-bg)' : 'var(--accent-amber-bg)',
                              color: d.debt_type === 'customer' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                            }}
                          >
                            {d.debt_type_display}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {formatSum(d.initial_amount)}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                          {formatSum(d.paid_amount)}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                          {formatSum(d.remaining_amount)}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {d.due_date || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {d.is_settled ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                              <CheckCircle2 size={14} />
                              To'liq yopilgan
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                              <AlertTriangle size={14} />
                              Ochiq qarz
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {!d.is_settled && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setPayingDebt(d);
                                setPayAmount(String(d.remaining_amount));
                                setPayMethod('cash');
                                setPayNote('');
                                setPayError(null);
                              }}
                            >
                              To'lov qabul qilish
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL 1: YANGI TRANZAKSIYA (KIRIM / CHIQIM) */}
      <Modal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        title="Kassaga Kirim / Chiqim kiritish"
      >
        <form onSubmit={submitTx} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {txFormError && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-rose-bg)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {txFormError}
            </div>
          )}

          <div>
            <label style={labelStyle}>Operatsiya turi</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setNewTxType('income')}
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: newTxType === 'income' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  backgroundColor: newTxType === 'income' ? 'var(--accent-emerald-bg)' : 'var(--bg-elevated)',
                  color: newTxType === 'income' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                + Kirim (Tushum)
              </button>
              <button
                type="button"
                onClick={() => setNewTxType('expense')}
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: newTxType === 'expense' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                  backgroundColor: newTxType === 'expense' ? 'var(--accent-rose-bg)' : 'var(--bg-elevated)',
                  color: newTxType === 'expense' ? 'var(--accent-rose)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                - Chiqim (Xarajat)
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Mazmuni / Sarlavha</label>
            <input
              type="text"
              required
              value={newTxTitle}
              onChange={(e) => setNewTxTitle(e.target.value)}
              placeholder="Masalan: Bozorlik xaridi, Go'sht, Kassa to'ldirish..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Summa (so'm)</label>
              <input
                type="number"
                required
                min="1"
                value={newTxAmount}
                onChange={(e) => setNewTxAmount(e.target.value)}
                placeholder="100 000"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={labelStyle}>To'lov usuli</label>
              <select
                value={newTxMethod}
                onChange={(e) => setNewTxMethod(e.target.value)}
                style={inputStyle}
              >
                <option value="cash">Naqd pul</option>
                <option value="card">Plastik / Karta</option>
                <option value="bank">Bank hisobi</option>
              </select>
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label style={labelStyle}>Kategoriya (Ixtiyoriy)</label>
              <select
                value={newTxCatId || ''}
                onChange={(e) => setNewTxCatId(e.target.value ? Number(e.target.value) : undefined)}
                style={inputStyle}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setShowTxModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: STORNO QILISH (BEKOR QILISH) */}
      <Modal
        isOpen={!!cancellingTx}
        onClose={() => setCancellingTx(null)}
        title="Tranzaksiyani storno qilish"
      >
        <form onSubmit={submitCancel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            Ushbu tranzaksiya o'chirilmaydi. U storno belgisi bilan bekor qilinadi va umumiy hisob-kitobdan
            chiqariladi. Bekor qilish sababini yozing:
          </p>

          {cancellingTx && (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Mazmuni:</strong> {cancellingTx.title}</div>
              <div><strong>Summa:</strong> {formatSum(cancellingTx.amount)} ({cancellingTx.type_display})</div>
              <div><strong>Sana:</strong> {cancellingTx.tx_date}</div>
            </div>
          )}

          {cancelError && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-rose-bg)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {cancelError}
            </div>
          )}

          <div>
            <label style={labelStyle}>Bekor qilish sababi (Majburiy)</label>
            <input
              type="text"
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Masalan: Adashib noto'g'ri summa kiritilgan..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setCancellingTx(null)}>
              Qaytish
            </Button>
            <Button type="submit" variant="danger" loading={submitting}>
              Tasdiqlayman (Storno)
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: YANGI QARZ / NASIYA */}
      <Modal
        isOpen={showDebtModal}
        onClose={() => setShowDebtModal(false)}
        title="Yangi Qarz / Nasiya ochish"
      >
        <form onSubmit={submitDebt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {debtFormError && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-rose-bg)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {debtFormError}
            </div>
          )}

          <div>
            <label style={labelStyle}>Qarz yo'nalishi</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setNewDebtType('customer')}
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: newDebtType === 'customer' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  backgroundColor: newDebtType === 'customer' ? 'var(--accent-emerald-bg)' : 'var(--bg-elevated)',
                  color: newDebtType === 'customer' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Mijoz Nasiyasi (Bizga beradi)
              </button>
              <button
                type="button"
                onClick={() => setNewDebtType('supplier')}
                style={{
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  border: newDebtType === 'supplier' ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                  backgroundColor: newDebtType === 'supplier' ? 'var(--accent-amber-bg)' : 'var(--bg-elevated)',
                  color: newDebtType === 'supplier' ? 'var(--accent-amber)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Bizning qarzimiz (Yetkazib beruvchiga)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Shaxs / Tashkilot nomi</label>
              <input
                type="text"
                required
                value={newDebtPerson}
                onChange={(e) => setNewDebtPerson(e.target.value)}
                placeholder="Anvar aka, Go'sht do'koni..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Telefon raqami (Ixtiyoriy)</label>
              <input
                type="text"
                value={newDebtPhone}
                onChange={(e) => setNewDebtPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Qarz summasi (so'm)</label>
              <input
                type="number"
                required
                min="1"
                value={newDebtAmount}
                onChange={(e) => setNewDebtAmount(e.target.value)}
                placeholder="500 000"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Qaytarish muddati</label>
              <input
                type="date"
                value={newDebtDueDate}
                onChange={(e) => setNewDebtDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Izoh / Tafsilot</label>
            <textarea
              value={newDebtNotes}
              onChange={(e) => setNewDebtNotes(e.target.value)}
              rows={2}
              placeholder="Ziyofat uchun nasiya..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setShowDebtModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Qarzni ochish
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: QARZGA TO'LOV QABUL QILISH */}
      <Modal
        isOpen={!!payingDebt}
        onClose={() => setPayingDebt(null)}
        title="Qarz to'lovini qabul qilish"
      >
        <form onSubmit={submitPayDebt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {payingDebt && (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Mijoz / Shaxs:</strong> {payingDebt.person_name}</div>
              <div><strong>Jami qarz:</strong> {formatSum(payingDebt.initial_amount)}</div>
              <div>
                <strong>Hozirgi qoldiq:</strong>{' '}
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                  {formatSum(payingDebt.remaining_amount)}
                </span>
              </div>
            </div>
          )}

          {payError && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-rose-bg)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {payError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>To'lov summasi (so'm)</label>
              <input
                type="number"
                required
                min="1"
                max={payingDebt?.remaining_amount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={labelStyle}>To'lov usuli</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                style={inputStyle}
              >
                <option value="cash">Naqd pul</option>
                <option value="card">Plastik / Karta</option>
                <option value="bank">Bank hisobi</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Izoh (Ixtiyoriy)</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Qisman to'lov..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setPayingDebt(null)}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              To'lovni kiritish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default FinancePage;
