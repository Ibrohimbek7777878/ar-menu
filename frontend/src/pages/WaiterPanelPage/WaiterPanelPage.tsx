import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { RestaurantAPI } from '../../services/RestaurantAPI';
import { StaffNavHeader, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { roleService } from '../../core/auth/RoleService';
import './WaiterPanelPage.css';

export interface ServiceCall {
  id: number;
  table_number: string | number;
  hall_name: string;
  type: 'waiter' | 'bill' | 'tea' | 'bread';
  title: string;
  time: string;
  status: 'pending' | 'accepted' | 'done';
}

export interface WaiterTableItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface WaiterTable {
  id: number;
  number: string | number;
  hall: string;
  status: 'free' | 'occupied' | 'bill_requested';
  guests_count: number;
  total_bill: number;
  active_orders_count: number;
  items?: WaiterTableItem[];
}

interface InitialWaiterData {
  shop?: { name: string };
  waiter_name?: string;
  calls?: ServiceCall[];
  tables?: WaiterTable[];
}

declare global {
  interface Window {
    __GULISTON_WAITER_DATA__?: InitialWaiterData;
  }
}

export interface WaiterPanelPageProps {
  embedded?: boolean;
}

export const WaiterPanelPage: React.FC<WaiterPanelPageProps> = ({ embedded = false }) => {
  const initialData: InitialWaiterData =
    typeof window !== 'undefined' ? window.__GULISTON_WAITER_DATA__ || {} : {};

  const shopName = initialData.shop?.name || 'Guliston';
  // Ism serverdan (login qilgan xodim); namuna ism faqat DEMO rejimda
  const waiterName = initialData.waiter_name || window.__GULISTON_SESSION__?.name || (roleService.isDemo() ? 'Alisher (Navbatchi)' : '');

  const {
    tables: sharedTables,
    serviceCalls: sharedCalls,
    acceptServiceCall,
    completeServiceCall,
    settleTableBill,
    addDishToTable,
    orders: sharedOrders,
  } = useNavigation();

  const calls = sharedCalls as ServiceCall[];
  const tables = sharedTables as WaiterTable[];
  const [activeTab, setActiveTab] = useState<'calls' | 'tables'>('calls');

  // Modal & Active Table State
  const [activeModalTable, setActiveModalTable] = useState<WaiterTable | null>(null);
  // Tezkor qo'shish tugmalari — restoranning haqiqiy menyusidan (avval 5 ta qattiq yozilgan taom, narxlari menyuga mos emas,
  // serverga product_id'siz ketib rad etilardi). Hisob qatorlari — serverdagi shu stolning to'lanmagan buyurtmalaridan.
  const [menuDishes, setMenuDishes] = useState<Array<{ product_id: number; name: string; price: number }>>([]);
  useEffect(() => {
    let alive = true;
    void RestaurantAPI.getMenu().then((res) => {
      if (!alive || !res?.products) return;
      setMenuDishes(
        res.products
          .slice(0, 12)
          .map((p: { id: number; name: string; price: number }) => ({ product_id: p.id, name: p.name, price: Number(p.price) }))
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'cash' | 'card' | 'payme'>('cash');
  const [receiptTime, setReceiptTime] = useState('');

  // Toast State
  const [toastMsg, setToastMsg] = useState('');
  const [toastIcon, setToastIcon] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, icon = '') => {
    setToastMsg(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleAcceptCall = (callId: number) => {
    acceptServiceCall(callId);
    showToast('Chaqiruv qabul qilindi');
  };

  const handleCompleteCall = (callId: number) => {
    completeServiceCall(callId);
    showToast('Chaqiruv bajarildi');
  };

  // Stol tafsilotlari (POS Modal) ochish
  const handleOpenTableDetails = useCallback((table: WaiterTable) => {
    setActiveModalTable(table);
    setReceiptTime(new Date().toLocaleString('uz-UZ'));
  }, []);

  // Stolga tezkor taom qo'shish (server qabul qilgandan keyingina "qo'shildi" deyiladi)
  const handleQuickAddDish = async (dish: { product_id: number; name: string; price: number }) => {
    if (!activeModalTable) return;
    const ok = await addDishToTable(activeModalTable.number, dish);
    showToast(ok ? `${dish.name} stolga qo'shildi` : "Taomni qo'shib bo'lmadi. Qayta urinib ko'ring.");
  };

  // Chekni chop etish
  const handlePrintReceipt = () => {
    window.print();
  };

  // To'lovni qabul qilish va hisobni yopish
  const handleAcceptPayment = async () => {
    if (!activeModalTable) return;
    const tblNum = activeModalTable.number;
    // Ofitsiant tanlagan to'lov turi kassaga yetib borishi kerak (avval doim naqd yozilardi); Click/Payme — karta
    const method: 'cash' | 'card' = selectedPayMethod === 'cash' ? 'cash' : 'card';
    const ok = await settleTableBill(tblNum, method);
    if (!ok) {
      showToast("Hisobni yopib bo'lmadi. Qayta urinib ko'ring.");
      return;
    }
    showToast(`Stol #${tblNum} hisobi yopildi`);
    setActiveModalTable(null);
  };

  const pendingCallsCount = calls.filter((c) => c.status === 'pending').length;
  const occupiedTablesCount = tables.filter((t) => t.status !== 'free').length;
  const totalRevenue = tables.reduce((sum, t) => sum + t.total_bill, 0);

  // Hisob serverdagi shu stolning to'lanmagan buyurtmalaridan (mehmon QR orqali bergan buyurtmalar ham shu yerda)
  const activeItems: WaiterTableItem[] = useMemo(() => {
    if (!activeModalTable) return [];
    return sharedOrders
      .filter((o) => String(o.table_number) === String(activeModalTable.number) && o.status !== 'paid')
      .flatMap((o) =>
        o.items.map((it) => ({ id: Number(it.id), name: it.name, quantity: it.quantity, price: it.price }))
      );
  }, [sharedOrders, activeModalTable]);
  const subtotal = activeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const serviceFee = 0;   // xizmat haqi olinmaydi (TZ qarori Q2); server ham 0% hisoblaydi
  const finalTotal = subtotal + serviceFee;

  return (
    <div className={`react-waiter-page ${embedded ? 'waiter-embedded' : ''}`}>
      {/* ─── Xodimlar Navigatsiyasi (StaffNavHeader) ─── */}
      {!embedded && <StaffNavHeader activeTab="waiter" />}

      <main className="waiter-main-content">
        {/* ─── Greeting & KPI Row ─── */}
        <div className="waiter-hero">
          <span className="waiter-badge">Xizmat ko'rsatish markazi</span>
          <h1 className="waiter-title">
            {waiterName}
          </h1>
          <p className="waiter-subtitle">
            Jonli chaqiruvlar, stollar nazorati va kassa hisob-kitobi.
          </p>

          <div className="waiter-kpi-grid">
            <div className={`kpi-card ${pendingCallsCount > 0 ? 'kpi-alert' : ''}`}>
              <span className="kpi-num tabular-nums">{pendingCallsCount}</span>
              <span className="kpi-label">Yangi chaqiruv</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-num tabular-nums">{occupiedTablesCount} / {tables.length}</span>
              <span className="kpi-label">Band stollar</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-num kpi-sum tabular-nums">
                {new Intl.NumberFormat('uz-UZ').format(totalRevenue / 1000)}k
              </span>
              <span className="kpi-label">Jonli hisob</span>
            </div>
          </div>
        </div>

        {/* ─── Mode Switch Tabs ─── */}
        <div className="waiter-tabs-bar">
          <button
            type="button"
            className={`waiter-tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            Chaqiruvlar ({calls.length})
          </button>
          <button
            type="button"
            className={`waiter-tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            Stollar nazorati ({tables.length})
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 1: LIVE CALLS
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'calls' && (
          <div className="calls-view">
            {calls.length === 0 ? (
              <div className="waiter-empty-state">
                <div className="empty-check-circle" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="empty-title">Barcha chaqiruvlar bajarildi</h3>
                <p className="empty-desc">
                  Hozircha yangi so'rovlar yo'q. Mehmonlar xizmatdan mamnun.
                </p>
              </div>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className={`waiter-call-card call-${call.type} status-${call.status}`}
                >
                  <div className="call-card-left">
                    <div className="call-table-badge">
                      <span className="call-tbl-kicker">Stol</span>
                      <strong className="call-tbl-num tabular-nums">{call.table_number}</strong>
                    </div>

                    <div className="call-details">
                      <span className="call-hall">{call.hall_name}</span>
                      <h3 className="call-title">{call.title}</h3>
                      <span className="call-time">{call.time}</span>
                    </div>
                  </div>

                  <div className="call-actions">
                    {call.type === 'bill' && (
                      <button
                        type="button"
                        className="btn-call-check"
                        onClick={() => {
                          const tbl = tables.find((t) => String(t.number) === String(call.table_number));
                          if (tbl) handleOpenTableDetails(tbl);
                        }}
                      >
                        Chek
                      </button>
                    )}
                    {call.status === 'pending' ? (
                      <button
                        type="button"
                        className="btn-call-accept"
                        onClick={() => handleAcceptCall(call.id)}
                      >
                        Qabul qilish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-call-done"
                        onClick={() => handleCompleteCall(call.id)}
                      >
                        Bajarildi
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: TABLES DIRECTORY
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'tables' && (
          <div className="waiter-tables-grid">
            {tables.map((tbl) => (
              <div
                key={tbl.id}
                className={`w-table-card status-${tbl.status}`}
              >
                <div className="w-table-top">
                  <span className="w-tbl-hall">{tbl.hall}</span>
                  <span className={`w-tbl-status-pill pill-${tbl.status}`}>
                    {tbl.status === 'free'
                      ? 'Bo\'sh'
                      : tbl.status === 'bill_requested'
                      ? 'Chek so\'ralgan'
                      : 'Band'}
                  </span>
                </div>

                <div
                  className="w-table-body"
                  onClick={() => handleOpenTableDetails(tbl)}
                  title="Stol tafsilotlari va hisobini ko'rish"
                >
                  <strong className="w-table-num tabular-nums">#{tbl.number}</strong>
                  {tbl.status !== 'free' ? (
                    <div className="w-table-bill-info">
                      <span className="w-guests tabular-nums">{tbl.guests_count} mehmon</span>
                      <strong className="w-bill-sum tabular-nums">
                        {new Intl.NumberFormat('uz-UZ').format(tbl.total_bill)} so'm
                      </strong>
                    </div>
                  ) : (
                    <span className="w-table-idle">+ Buyurtma ochish</span>
                  )}
                </div>

                <div className="w-table-footer">
                  <button
                    type="button"
                    className="btn-w-bill"
                    onClick={() => handleOpenTableDetails(tbl)}
                  >
                    Hisob / Chek
                  </button>
                  <a
                    href={tbl.qr_path || `/menu/?table=${tbl.number}`}
                    className="btn-w-open-menu"
                  >
                    Menyu →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          TABLE ORDER & BILL MODAL (POS DIALOG)
         ══════════════════════════════════════════════════════ */}
      {activeModalTable && (
        <div className="pos-modal-overlay" onClick={() => setActiveModalTable(null)}>
          <div
            className="pos-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div>
                <h3 className="pos-modal-title tabular-nums">
                  Stol #{activeModalTable.number} — Hisob
                </h3>
                <span className="pos-modal-sub">
                  {activeModalTable.hall} · {activeModalTable.guests_count || 2} mehmon
                </span>
              </div>
              <button
                type="button"
                className="pos-modal-close"
                onClick={() => setActiveModalTable(null)}
                aria-label="Yopish"
              >
                ✕
              </button>
            </div>

            <div className="pos-modal-body">
              {/* Tezkor taom qo'shish */}
              <div>
                <span className="pos-section-label">Tezkor taom qo'shish:</span>
                <div className="pos-quick-add">
                  {menuDishes.map((dish) => (
                    <button
                      key={dish.product_id}
                      type="button"
                      className="btn-quick-dish"
                      onClick={() => handleQuickAddDish(dish)}
                    >
                      + {dish.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buyurtma tarkibi */}
              <div className="pos-items-list">
                {activeItems.length === 0 ? (
                  <div className="pos-empty-items">
                    Stolda hali taomlar yo'q. Yuqoridagi tugmalar orqali taom qo'shishingiz mumkin.
                  </div>
                ) : (
                  activeItems.map((item) => (
                    <div key={item.id} className="pos-item-row">
                      <div className="pos-item-left">
                        <span className="pos-item-qty tabular-nums">{item.quantity}×</span>
                        <span className="pos-item-name">{item.name}</span>
                      </div>
                      <span className="pos-item-price tabular-nums">
                        {new Intl.NumberFormat('uz-UZ').format(item.price * item.quantity)} so'm
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Hisob xulosasi */}
              {activeItems.length > 0 && (
                <div className="pos-summary-box">
                  <div className="pos-sum-line">
                    <span>Taomlar summasi:</span>
                    <span className="tabular-nums">{new Intl.NumberFormat('uz-UZ').format(subtotal)} so'm</span>
                  </div>
                  {serviceFee > 0 && (
                    <div className="pos-sum-line">
                      <span>Xizmat haqi:</span>
                      <span className="tabular-nums">+{new Intl.NumberFormat('uz-UZ').format(serviceFee)} so'm</span>
                    </div>
                  )}
                  <div className="pos-sum-total">
                    <span>Jami to'lov:</span>
                    <span className="tabular-nums">{new Intl.NumberFormat('uz-UZ').format(finalTotal)} so'm</span>
                  </div>
                </div>
              )}

              {/* To'lov usuli tanlash */}
              <div>
                <span className="pos-section-label">To'lov usuli:</span>
                <div className="pos-pay-methods">
                  {[
                    { id: 'cash', label: 'Naqd pul' },
                    { id: 'card', label: 'Uzcard / Humo' },
                    { id: 'payme', label: 'Click / Payme' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPayMethod(m.id as any)}
                      className={`btn-pos-pay-method ${selectedPayMethod === m.id ? 'active' : ''}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harakatlar */}
              <div className="pos-modal-actions">
                <button
                  type="button"
                  className="btn-pos-print"
                  onClick={handlePrintReceipt}
                >
                  Chek chiqarish
                </button>
                <button
                  type="button"
                  className="btn-pos-pay"
                  onClick={handleAcceptPayment}
                >
                  To'lovni qabul qilish va yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE RECEIPT (FAQAT PRINT VAQTIDA KO'RINADI) ─── */}
      {activeModalTable && (
        <div className="pos-printable-receipt">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>{shopName.toUpperCase()}</h2>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>Restoran &amp; Milliy Taomlar</p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Tel: +998 (90) 123-45-67</p>
            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
              STOL #{activeModalTable.number} · {activeModalTable.hall}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              Ofitsiant: {waiterName}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              Sana: {receiptTime || 'Bugun'}
            </p>
            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            {activeItems.map((it) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{it.quantity}x {it.name}</span>
                <span>{it.price * it.quantity}</span>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Summa:</span>
              <span>{subtotal} so'm</span>
            </div>
            {serviceFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Xizmat:</span>
                <span>{serviceFee} so'm</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
              <span>JAMI:</span>
              <span>{finalTotal} SO'M</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '10px' }}>
            <p style={{ margin: '2px 0' }}>Tashrifingiz uchun rahmat!</p>
            <p style={{ margin: '2px 0' }}>Yoqimli ishtaha tilaymiz!</p>
          </div>
        </div>
      )}

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
