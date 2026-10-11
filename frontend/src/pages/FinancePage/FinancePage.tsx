import React, { useState, useMemo } from 'react';
import { StaffNavHeader } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import type { FinanceTransaction, FinanceDebt, LiveOrder } from '../../context/NavigationContext';
import './FinancePage.css';

function formatUZS(num: number): string {
  return new Intl.NumberFormat('uz-UZ').format(num);
}

export const FinancePage: React.FC = () => {
  const {
    financeTransactions,
    financeDebts,
    addFinanceTransaction,
    cancelFinanceTransaction,
    addFinanceDebt,
    payDebtPartial,
    orders,
    tables,
    settleTableBill,
  } = useNavigation();

  // Tab: 'table' (Tranzaksiyalar), 'debts' (Qarz daftari), 'receipts' (Cheklar), 'audit' (Bekor qilinganlar)
  const [activeTab, setActiveTab] = useState<'table' | 'debts' | 'receipts' | 'audit'>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isPartialPayModalOpen, setIsPartialPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<FinanceDebt | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [txToCancel, setTxToCancel] = useState<FinanceTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Receipt Preview / Print modal
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<LiveOrder | null>(null);

  // Form states for adding income/expense
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<'cash' | 'card'>('cash');
  const [formDesc, setFormDesc] = useState('');

  // Form states for debt
  const [debtType, setDebtType] = useState<'receivable' | 'payable'>('receivable');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtPhone, setDebtPhone] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtDesc, setDebtDesc] = useState('');

  // Form states for partial payment
  const [partialPayAmount, setPartialPayAmount] = useState('');
  const [partialPayMethod, setPartialPayMethod] = useState<'cash' | 'card'>('cash');
  const [partialPayNotes, setPartialPayNotes] = useState('');

  // 1. 4 Big KPI Totals Calculation (Sobir Tog'a)
  const kpiData = useMemo(() => {
    let incomeCash = 0;
    let incomeCard = 0;
    let expenseCash = 0;
    let expenseCard = 0;

    financeTransactions.forEach((tx) => {
      if (tx.is_cancelled) return;

      if (tx.type === 'income') {
        if (tx.payment_method === 'cash') incomeCash += tx.amount;
        else incomeCard += tx.amount;
      } else if (tx.type === 'expense') {
        if (tx.payment_method === 'cash') expenseCash += tx.amount;
        else expenseCard += tx.amount;
      }
    });

    const incomeTotal = incomeCash + incomeCard;
    const expenseTotal = expenseCash + expenseCard;
    const netCash = incomeCash - expenseCash;
    const netCard = incomeCard - expenseCard;
    const netProfitTotal = incomeTotal - expenseTotal;

    let customerDebtTotal = 0;
    let supplierDebtTotal = 0;

    financeDebts.forEach((debt) => {
      if (debt.status !== 'settled') {
        if (debt.type === 'receivable') customerDebtTotal += debt.remaining_amount;
        else supplierDebtTotal += debt.remaining_amount;
      }
    });

    return {
      incomeTotal,
      incomeCash,
      incomeCard,
      expenseTotal,
      expenseCash,
      expenseCard,
      netProfitTotal,
      netCash,
      netCard,
      customerDebtTotal,
      supplierDebtTotal,
    };
  }, [financeTransactions, financeDebts]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return financeTransactions.filter((tx) => {
      if (activeTab === 'audit') {
        if (!tx.is_cancelled) return false;
      } else {
        if (tx.is_cancelled) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
        (tx.order_number && tx.order_number.toLowerCase().includes(q)) ||
        String(tx.amount).includes(q)
      );
    });
  }, [financeTransactions, activeTab, searchQuery]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return financeDebts.filter((debt) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        debt.person_name.toLowerCase().includes(q) ||
        (debt.phone && debt.phone.includes(q)) ||
        (debt.description && debt.description.toLowerCase().includes(q))
      );
    });
  }, [financeDebts, searchQuery]);

  // Handle Income Submit
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) return;

    addFinanceTransaction({
      type: 'income',
      category: formCategory.trim() || 'Umumiy Kirim',
      amount,
      payment_method: formMethod,
      source_type: 'manual',
      description: formDesc.trim() || 'Kassaga naqd/karta orqali kirim qilindi',
    });

    setIsIncomeModalOpen(false);
    setFormAmount('');
    setFormCategory('');
    setFormDesc('');
  };

  // Handle Expense Submit
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) return;

    addFinanceTransaction({
      type: 'expense',
      category: formCategory.trim() || 'Xarajat',
      amount,
      payment_method: formMethod,
      source_type: 'manual',
      description: formDesc.trim() || 'Kassadan chiqim qilindi',
    });

    setIsExpenseModalOpen(false);
    setFormAmount('');
    setFormCategory('');
    setFormDesc('');
  };

  // Handle Debt Submit
  const handleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(debtAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0 || !debtPerson.trim()) return;

    addFinanceDebt({
      type: debtType,
      person_name: debtPerson.trim(),
      phone: debtPhone.trim() || undefined,
      description: debtDesc.trim() || undefined,
      total_amount: amount,
      due_date: debtDueDate.trim() || undefined,
    });

    setIsDebtModalOpen(false);
    setDebtPerson('');
    setDebtPhone('');
    setDebtAmount('');
    setDebtDesc('');
    setDebtDueDate('');
  };

  // Handle Partial Pay Submit
  const handlePartialPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    const amount = Number(partialPayAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) return;

    payDebtPartial(selectedDebt.id, amount, partialPayMethod, partialPayNotes);
    setIsPartialPayModalOpen(false);
    setSelectedDebt(null);
    setPartialPayAmount('');
    setPartialPayNotes('');
  };

  // Handle Cancel Tx Submit
  const handleCancelTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToCancel) return;
    if (!cancelReason.trim()) {
      alert('Iltimos, bekor qilish sababini yozing!');
      return;
    }
    cancelFinanceTransaction(txToCancel.id, cancelReason);
    setIsCancelModalOpen(false);
    setTxToCancel(null);
    setCancelReason('');
  };

  return (
    <div className="finance-page-layout">
      <StaffNavHeader activeTab="finance" />

      <div className="finance-container">
        {/* Banner */}
        <div className="finance-header-banner">
          <div className="finance-brand-wrap">
            <div className="finance-brand-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h1 className="finance-title">Moliya &amp; Kassa Boshqaruvi</h1>
              <p className="finance-subtitle">Sobir tog'a xalqchil moliya modeli — 1 tiyingacha aniq naqd va plastik hisobi</p>
            </div>
          </div>

          <div className="finance-controls-group">
            <button
              type="button"
              className="btn-row-action"
              onClick={() => setActiveTab('receipts')}
              style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 700, padding: '8px 14px', borderRadius: '10px' }}
            >
              🧾 Cheklar Arxivi ({orders.length})
            </button>
            <button
              type="button"
              className="btn-row-action"
              onClick={() => window.print()}
              style={{ background: '#f8fafc', color: '#334155', fontWeight: 600, padding: '8px 12px', borderRadius: '10px' }}
            >
              🖨️ Hisobotni Chop Etish
            </button>
          </div>
        </div>

        {/* 4 Big KPI Tiles (Sobir Tog'a) */}
        <div className="finance-kpi-grid">
          {/* 1. Kirgan Pul (Tushum) */}
          <div className="kpi-tile tile-income">
            <div>
              <div className="kpi-header">
                <span className="kpi-tag">🟢 KIRGAN PUL (TUSHUM)</span>
                <span>📈</span>
              </div>
              <div className="kpi-amount-box">
                <span className="kpi-amount-val">{formatUZS(kpiData.incomeTotal)}</span>
                <span className="kpi-amount-unit">so'm</span>
              </div>
              <p className="kpi-desc">Kassaga tushgan barcha tushumlar</p>
            </div>
            <div className="kpi-breakdown">
              <span className="breakdown-item">💵 Naqd: <b>{formatUZS(kpiData.incomeCash)}</b></span>
              <span className="breakdown-item">💳 Plastik: <b>{formatUZS(kpiData.incomeCard)}</b></span>
            </div>
          </div>

          {/* 2. Chiqqan Pul (Xarajat) */}
          <div className="kpi-tile tile-expense">
            <div>
              <div className="kpi-header">
                <span className="kpi-tag">🔴 CHIQQAN PUL (XARAJAT)</span>
                <span>📉</span>
              </div>
              <div className="kpi-amount-box">
                <span className="kpi-amount-val">{formatUZS(kpiData.expenseTotal)}</span>
                <span className="kpi-amount-unit">so'm</span>
              </div>
              <p className="kpi-desc">Kassadan qilingan barcha to'lovlar</p>
            </div>
            <div className="kpi-breakdown">
              <span className="breakdown-item">💵 Naqd: <b>{formatUZS(kpiData.expenseCash)}</b></span>
              <span className="breakdown-item">💳 Plastik: <b>{formatUZS(kpiData.expenseCard)}</b></span>
            </div>
          </div>

          {/* 3. Sof Cho'ntak (Foyda) */}
          <div className="kpi-tile tile-profit">
            <div>
              <div className="kpi-header">
                <span className="kpi-tag">💎 SOF CHO'NTAK (FOYDA)</span>
                <span>👑</span>
              </div>
              <div className="kpi-amount-box">
                <span className="kpi-amount-val">{formatUZS(kpiData.netProfitTotal)}</span>
                <span className="kpi-amount-unit">so'm</span>
              </div>
              <p className="kpi-desc">Kassada qolgan sof erkin mablag'</p>
            </div>
            <div className="kpi-breakdown">
              <span className="breakdown-item">💵 Naqd: <b>{formatUZS(kpiData.netCash)}</b></span>
              <span className="breakdown-item">💳 Plastik: <b>{formatUZS(kpiData.netCard)}</b></span>
            </div>
          </div>

          {/* 4. Nasiya va Qarzlar */}
          <div className="kpi-tile tile-debt">
            <div>
              <div className="kpi-header">
                <span className="kpi-tag">🤝 NASIYA VA QARZLAR</span>
                <span>⏳</span>
              </div>
              <div className="kpi-amount-box">
                <span className="kpi-amount-val" style={{ color: '#d97706' }}>
                  {formatUZS(kpiData.customerDebtTotal)}
                </span>
                <span className="kpi-amount-unit">so'm</span>
              </div>
              <p className="kpi-desc">Mijozlar qaytarishi kerak bo'lgan pul</p>
            </div>
            <div className="kpi-breakdown">
              <span className="breakdown-item" title="Mijozlarimizdan keladigan pul">
                📥 Bizga: <b style={{ color: '#059669' }}>{formatUZS(kpiData.customerDebtTotal)}</b>
              </span>
              <span className="breakdown-item" title="Yetkazib beruvchilarga to'laydigan qarzimiz">
                📤 Bizdan: <b style={{ color: '#dc2626' }}>{formatUZS(kpiData.supplierDebtTotal)}</b>
              </span>
            </div>
          </div>
        </div>

        {/* 4 Action Buttons */}
        <div className="finance-actions-row">
          <button
            type="button"
            className="finance-action-btn btn-income-action"
            onClick={() => setIsIncomeModalOpen(true)}
          >
            <span>➕</span>
            <span>+ Pul Kirdi (Tushum)</span>
          </button>

          <button
            type="button"
            className="finance-action-btn btn-expense-action"
            onClick={() => setIsExpenseModalOpen(true)}
          >
            <span>➖</span>
            <span>- Pul Chiqdi (Xarajat)</span>
          </button>

          <button
            type="button"
            className="finance-action-btn btn-debt-action"
            onClick={() => setIsDebtModalOpen(true)}
          >
            <span>🤝</span>
            <span>+ Nasiya Daftari</span>
          </button>

          <button
            type="button"
            className="finance-action-btn btn-receipt-action"
            onClick={() => setActiveTab('receipts')}
          >
            <span>🧾</span>
            <span>Chekdan Hisob-kitob</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="finance-content-box">
          {/* Navigation Toolbar */}
          <div className="finance-nav-toolbar">
            <div className="finance-tabs-pills">
              <button
                type="button"
                className={`finance-tab-pill ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => setActiveTab('table')}
              >
                <span>📝 Tranzaksiyalar</span>
                <span className="pill-count">
                  {financeTransactions.filter((tx) => !tx.is_cancelled).length}
                </span>
              </button>

              <button
                type="button"
                className={`finance-tab-pill ${activeTab === 'debts' ? 'active' : ''}`}
                onClick={() => setActiveTab('debts')}
              >
                <span>🤝 Qarz Daftari</span>
                <span className="pill-count">{financeDebts.length}</span>
              </button>

              <button
                type="button"
                className={`finance-tab-pill ${activeTab === 'receipts' ? 'active' : ''}`}
                onClick={() => setActiveTab('receipts')}
              >
                <span>🧾 Cheklar &amp; Stollar</span>
                <span className="pill-count">{tables.filter((t) => t.total_bill > 0).length}</span>
              </button>

              <button
                type="button"
                className={`finance-tab-pill ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                <span>🛡️ Bekor qilinganlar (Audit)</span>
                <span className="pill-count">
                  {financeTransactions.filter((tx) => tx.is_cancelled).length}
                </span>
              </button>
            </div>

            <div className="finance-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="finance-search-input"
                placeholder="Qidiruv (nom, summa, izoh)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* TAB 1 & 4: Transactions Table */}
          {(activeTab === 'table' || activeTab === 'audit') && (
            <div className="finance-table-wrapper">
              <table className="finance-data-table">
                <thead>
                  <tr>
                    <th>Sana &amp; Vaqt</th>
                    <th>Turi</th>
                    <th>Kategoriya</th>
                    <th>To'lov Shakli</th>
                    <th>Ta'rif / Nomi</th>
                    <th style={{ textAlign: 'right' }}>Summa</th>
                    {activeTab === 'table' && <th style={{ textAlign: 'center' }}>Amal</th>}
                    {activeTab === 'audit' && <th>Bekor Qilish Sababi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        Hech qanday operatsiya topilmadi.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const dateStr = new Date(tx.created_at).toLocaleString('uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <tr key={tx.id} className={tx.is_cancelled ? 'is-cancelled' : ''}>
                          <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{dateStr}</td>
                          <td>
                            <span className={`tx-type-badge ${tx.type === 'income' ? 'tx-type-income' : 'tx-type-expense'}`}>
                              {tx.type === 'income' ? '🟢 Kirim' : '🔴 Chiqim'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{tx.category}</td>
                          <td>
                            <span className="payment-method-badge">
                              {tx.payment_method === 'cash' ? '💵 Naqd' : '💳 Karta / Click'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{tx.description}</div>
                            {tx.customer_name && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Mijoz: {tx.customer_name} {tx.table_number ? `(Stol ${tx.table_number})` : ''}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`tx-amount ${tx.type === 'income' ? 'income' : 'expense'}`}>
                              {tx.type === 'income' ? '+' : '-'} {formatUZS(tx.amount)} so'm
                            </span>
                          </td>
                          {activeTab === 'table' && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-row-action"
                                title="Operatsiyani bekor qilish (sababi bilan)"
                                onClick={() => {
                                  setTxToCancel(tx);
                                  setIsCancelModalOpen(true);
                                }}
                              >
                                🗑️ Bekor qilish
                              </button>
                            </td>
                          )}
                          {activeTab === 'audit' && (
                            <td style={{ color: '#e11d48', fontSize: '0.78rem', fontWeight: 600 }}>
                              {tx.cancellation_reason || 'Sabab ko\'rsatilmagan'}
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {tx.cancelled_at && new Date(tx.cancelled_at).toLocaleTimeString('uz-UZ')}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Debts Grid */}
          {activeTab === 'debts' && (
            <div className="debt-cards-grid">
              {filteredDebts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  Hozircha qarz yozuvlari mavjud emas.
                </div>
              ) : (
                filteredDebts.map((debt) => {
                  const percentPaid = Math.round((debt.paid_amount / debt.total_amount) * 100);
                  return (
                    <div key={debt.id} className={`debt-item-card ${debt.type}`}>
                      <div>
                        <div className="debt-card-top">
                          <div>
                            <h4 className="debt-person-name">{debt.person_name}</h4>
                            {debt.phone && <div className="debt-person-phone">📞 {debt.phone}</div>}
                          </div>
                          <span className={`debt-status-tag ${debt.status}`}>
                            {debt.status === 'settled'
                              ? '✅ To\'liq yopildi'
                              : debt.status === 'partially_paid'
                              ? '⏳ Qisman to\'landi'
                              : '🔴 Kutilmoqda'}
                          </span>
                        </div>

                        {debt.description && (
                          <p style={{ fontSize: '0.78rem', color: '#475569', margin: '4px 0 8px' }}>
                            {debt.description}
                          </p>
                        )}

                        <div className="debt-progress-bar-wrap">
                          <div
                            className="debt-progress-bar-fill"
                            style={{
                              width: `${percentPaid}%`,
                              backgroundColor: debt.type === 'receivable' ? '#10b981' : '#f43f5e',
                            }}
                          />
                        </div>

                        <div className="debt-sums-row">
                          <span>
                            Jami: <b>{formatUZS(debt.total_amount)} so'm</b>
                          </span>
                          <span>
                            Qoldiq:{' '}
                            <b style={{ color: debt.type === 'receivable' ? '#059669' : '#e11d48' }}>
                              {formatUZS(debt.remaining_amount)} so'm
                            </b>
                          </span>
                        </div>
                      </div>

                      {debt.status !== 'settled' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            className="finance-action-btn"
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '0.8rem',
                              background: debt.type === 'receivable' ? '#059669' : '#4f46e5',
                            }}
                            onClick={() => {
                              setSelectedDebt(debt);
                              setPartialPayAmount(String(debt.remaining_amount));
                              setIsPartialPayModalOpen(true);
                            }}
                          >
                            💵 To'lov Qabul Qilish
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Instant Receipts & Open Bills */}
          {activeTab === 'receipts' && (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', background: '#ecfdf5', padding: '14px 18px', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#065f46' }}>
                  🧾 Tayyor Cheklar va Ochiq Stollar Hisob-kitobi
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                  Buyurtma hisobini bir zumda 58mm/80mm termal chek qilib chiqarish va avtomatik ravishda Kassaga (Moliya) kirim qilish
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {tables
                  .filter((t) => t.total_bill > 0)
                  .map((table) => {
                    const linkedOrders = orders.filter((o) => String(o.table_number) === String(table.number));
                    
                    // Handler to open receipt for this table
                    const handleOpenReceipt = () => {
                      if (linkedOrders.length > 0) {
                        // If multiple orders on same table, aggregate their items
                        const allItems = linkedOrders.flatMap((ord) => ord.items || []);
                        setSelectedReceiptOrder({
                          id: linkedOrders[0].id || `tbl-${table.number}`,
                          order_number: linkedOrders[0].order_number || `#Stol-${table.number}`,
                          table_number: table.number,
                          table_name: `Stol ${table.number} (${table.hall})`,
                          customer_name: linkedOrders[0].customer_name || 'Mehmon',
                          status: 'pending',
                          created_at: linkedOrders[0].created_at || new Date().toISOString(),
                          total_amount: table.total_bill,
                          items: allItems.length > 0 ? allItems : [
                            { id: 1, name: `Stol #${table.number} buyurtmasi`, price: table.total_bill, quantity: 1, unit: 'ta' }
                          ],
                        });
                      } else {
                        // Synthetic receipt from table total
                        setSelectedReceiptOrder({
                          id: `tbl-${table.number}`,
                          order_number: `#Stol-${table.number}`,
                          table_number: table.number,
                          table_name: `Stol ${table.number} (${table.hall})`,
                          customer_name: 'Mehmon',
                          status: 'pending',
                          created_at: new Date().toISOString(),
                          total_amount: table.total_bill,
                          items: [
                            { id: 1, name: `Stol #${table.number} hisobi`, price: table.total_bill, quantity: 1, unit: 'hisob' }
                          ],
                        });
                      }
                    };

                    return (
                      <div
                        key={table.id}
                        onClick={handleOpenReceipt}
                        className="finance-table-card"
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Stol #{table.number}</h4>
                              <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                🧾 Chek
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{table.hall}</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {table.status === 'bill_requested' ? '🔔 Hisob so\'raldi' : '🟢 Band'}
                          </span>
                        </div>

                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', margin: '8px 0' }}>
                          {formatUZS(table.total_bill)} so'm
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', marginBottom: '14px' }}>
                          <span>Buyurtmalar soni: {linkedOrders.length} ta</span>
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>Bosib ko'rish / Print →</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="finance-action-btn"
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', background: '#059669' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              settleTableBill(table.number, 'cash');
                              alert(`Stol #${table.number} hisobi yopildi va Kassaga ${formatUZS(table.total_bill)} so'm kirim qilindi!`);
                            }}
                          >
                            💵 Naqd Yopish
                          </button>
                          <button
                            type="button"
                            className="finance-action-btn"
                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', background: '#0284c7' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              settleTableBill(table.number, 'card');
                              alert(`Stol #${table.number} hisobi (Karta) yopildi va Kassaga ${formatUZS(table.total_bill)} so'm kirim qilindi!`);
                            }}
                          >
                            💳 Karta/Click
                          </button>
                          <button
                            type="button"
                            className="btn-row-action"
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                            title="Chekni ko'rish va chop etish"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReceipt();
                            }}
                          >
                            🖨️
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {tables.filter((t) => t.total_bill > 0).length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Hozirda barcha stollar hisobi yopilgan. Yangi buyurtma ochilganda shu yerda ko'rinadi.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL 1: Pul Kirdi (Kirim) ─── */}
      {isIncomeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIncomeModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Yangi Kirim (Pul Kirdi)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsIncomeModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleIncomeSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Summa (so'm)*</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 500 000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To'lov Shakli*</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as 'cash' | 'card')}
                    className="form-select"
                  >
                    <option value="cash">💵 Naqd Pul (G'aladon)</option>
                    <option value="card">💳 Plastik / Click / Payme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kategoriya</label>
                  <input
                    type="text"
                    placeholder="Masalan: Tushlik tushumi, Tadbir xizmati..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Izoh / Tafsilot</label>
                  <textarea
                    rows={2}
                    placeholder="Kimdan olindi yoki qanday maqsad..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-row-action" onClick={() => setIsIncomeModalOpen(false)}>Bekor qilish</button>
                <button type="submit" className="finance-action-btn btn-income-action" style={{ padding: '8px 16px' }}>Kassaga Kirim Qilish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Pul Chiqdi (Xarajat) ─── */}
      {isExpenseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➖ Yangi Xarajat (Pul Chiqdi)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsExpenseModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Summa (so'm)*</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 350 000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qayerdan To'landi?*</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as 'cash' | 'card')}
                    className="form-select"
                  >
                    <option value="cash">💵 Naqd Pul (G'aladon)</option>
                    <option value="card">💳 Plastik Karta / Hisob raqam</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kategoriya</label>
                  <input
                    type="text"
                    placeholder="Masalan: Go'sht, Sabzavot, Ish haqi, Gaz/Svet..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Izoh / Tafsilot</label>
                  <textarea
                    rows={2}
                    placeholder="Qayerga sarflandi..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-row-action" onClick={() => setIsExpenseModalOpen(false)}>Bekor qilish</button>
                <button type="submit" className="finance-action-btn btn-expense-action" style={{ padding: '8px 16px' }}>Kassadan Chiqim Qilish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Yangi Nasiya / Qarz Daftari ─── */}
      {isDebtModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDebtModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🤝 Yangi Nasiya / Qarz Yozuvi</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsDebtModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleDebtSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Qarz Turi*</label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value as 'receivable' | 'payable')}
                    className="form-select"
                  >
                    <option value="receivable">📥 Bizga berishadi (Mijoz nasiyasi)</option>
                    <option value="payable">📤 Biz beramiz (Ta'minotchi / Bozorga)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kimga / Kimdan (Ism sharifi)*</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Dilshod aka"
                    value={debtPerson}
                    onChange={(e) => setDebtPerson(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon Raqami</label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={debtPhone}
                    onChange={(e) => setDebtPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qarz Summasi (so'm)*</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 800 000"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qaytarish Muddati</label>
                  <input
                    type="text"
                    placeholder="Masalan: Juma kuni, 25-oktyabr..."
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Izoh</label>
                  <textarea
                    rows={2}
                    placeholder="Nima uchun berildi..."
                    value={debtDesc}
                    onChange={(e) => setDebtDesc(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-row-action" onClick={() => setIsDebtModalOpen(false)}>Bekor qilish</button>
                <button type="submit" className="finance-action-btn btn-debt-action" style={{ padding: '8px 16px' }}>Daftarga Yozish</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: Qarzni Qisman To'lash ─── */}
      {isPartialPayModalOpen && selectedDebt && (
        <div className="modal-overlay" onClick={() => setIsPartialPayModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💵 Qarz To'lovini Qabul Qilish</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsPartialPayModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handlePartialPaySubmit}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedDebt.person_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Qolgan qarz summasi: <b style={{ color: '#0f172a' }}>{formatUZS(selectedDebt.remaining_amount)} so'm</b>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">To'lanayotgan Summa (so'm)*</label>
                  <input
                    type="text"
                    required
                    value={partialPayAmount}
                    onChange={(e) => setPartialPayAmount(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">To'lov Usuli*</label>
                  <select
                    value={partialPayMethod}
                    onChange={(e) => setPartialPayMethod(e.target.value as 'cash' | 'card')}
                    className="form-select"
                  >
                    <option value="cash">💵 Naqd Pul</option>
                    <option value="card">💳 Plastik / Click</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Izoh</label>
                  <input
                    type="text"
                    placeholder="Masalan: 'Qolganini haftaga beradi'"
                    value={partialPayNotes}
                    onChange={(e) => setPartialPayNotes(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-row-action" onClick={() => setIsPartialPayModalOpen(false)}>Bekor qilish</button>
                <button type="submit" className="finance-action-btn" style={{ padding: '8px 16px', background: '#059669' }}>
                  ✅ Saqlash va Kassaga Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: Bekor Qilish (Audit Reason) ─── */}
      {isCancelModalOpen && txToCancel && (
        <div className="modal-overlay" onClick={() => setIsCancelModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#e11d48' }}>🛡️ Operatsiyani Bekor Qilish</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCancelTxSubmit}>
              <div className="modal-body">
                <p style={{ color: '#475569', fontSize: '0.82rem', margin: '0 0 12px' }}>
                  Hujjat tizimdan butunlay o'chirilmaydi, balki audit uchun bekor qilinganlar ro'yxatiga olinadi va kassa balansidan chiqariladi.
                </p>

                <div style={{ background: '#fff1f2', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 800 }}>{txToCancel.description}</div>
                  <div style={{ fontSize: '0.8rem', color: '#be123c' }}>
                    Summa: {formatUZS(txToCancel.amount)} so'm ({txToCancel.type === 'income' ? 'Kirim' : 'Chiqim'})
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bekor qilish sababi (Majburiy)*</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Masalan: Adashib ikki marta yozilgan, mijoz qaytarib oldi..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="form-textarea"
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-row-action" onClick={() => setIsCancelModalOpen(false)}>Chiqish</button>
                <button type="submit" className="finance-action-btn" style={{ padding: '8px 16px', background: '#e11d48' }}>
                  Bekor Qilishni Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: Termal Chek Ko'rinishi (Print Preview) ─── */}
      {selectedReceiptOrder && (
        <div className="modal-overlay" onClick={() => setSelectedReceiptOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🧾 Termal Chek (80mm)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedReceiptOrder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ background: '#f8fafc', padding: '14px' }}>
              <div className="thermal-receipt-preview">
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  GULISTON RESTORAN
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>
                  Milliy &amp; Yevropa Taomlari
                </div>
                <div className="thermal-divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>Chek: {selectedReceiptOrder.order_number}</span>
                  <span>{new Date(selectedReceiptOrder.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                  Stol: #{selectedReceiptOrder.table_number}
                </div>
                {selectedReceiptOrder.customer_name && (
                  <div style={{ fontSize: '11px' }}>Mijoz: {selectedReceiptOrder.customer_name}</div>
                )}
                <div className="thermal-divider" />

                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '3px' }}>Nomi</th>
                      <th style={{ textAlign: 'center' }}>Soni</th>
                      <th style={{ textAlign: 'right' }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceiptOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '3px 0' }}>{it.name}</td>
                        <td style={{ textAlign: 'center' }}>x{it.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatUZS(it.price * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="thermal-double-divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                  <span>JAMI:</span>
                  <span>{formatUZS(selectedReceiptOrder.total_amount)} SO'M</span>
                </div>
                <div className="thermal-divider" />
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px' }}>
                  Xaridingiz uchun rahmat!<br />
                  Guliston Restoran OS
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-row-action" onClick={() => setSelectedReceiptOrder(null)}>Yopish</button>
              <button
                type="button"
                className="finance-action-btn"
                style={{ background: '#0f172a', padding: '8px 16px' }}
                onClick={() => window.print()}
              >
                🖨️ Chop Etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
