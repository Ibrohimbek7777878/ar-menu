import React, { useState, useMemo } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './OrdersPage.css';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderData {
  id: number;
  order_number: string;
  created_at: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  status_display: string;
  total_amount: number;
  table_number?: string | number;
  delivery_type?: string;
  items: OrderItem[];
}

interface InitialOrdersData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  orders?: OrderData[];
  cartCount?: number;
}

declare global {
  interface Window {
    __GULISTON_ORDERS_DATA__?: InitialOrdersData;
  }
}

export const OrdersPage: React.FC = () => {
  const {
    navigate,
    cartCount: navCartCount,
    orders: sharedOrders,
    tableNumber: ctxTableNumber,
    setIsCallWaiterOpen,
    setIsNfcModalOpen,
  } = useNavigation();

  const initialData: InitialOrdersData =
    typeof window !== 'undefined' ? window.__GULISTON_ORDERS_DATA__ || {} : {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;

  const orders: OrderData[] = useMemo(() => {
    if (sharedOrders && sharedOrders.length > 0) {
      return sharedOrders.map((o) => ({
        id: typeof o.id === 'number' ? o.id : 1,
        order_number: o.order_number.replace('#', ''),
        created_at: new Date(o.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        status: (o.status === 'paid' ? 'completed' : o.status) as any,
        status_display:
          o.status === 'pending'
            ? 'Kutilmoqda'
            : o.status === 'preparing'
            ? 'Tayyorlanmoqda'
            : o.status === 'ready'
            ? 'Oshxonada tayyor!'
            : o.status === 'delivered'
            ? 'Yetkazildi'
            : 'To\'landi',
        total_amount: o.total_amount,
        table_number: o.table_number,
        items: o.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          total: it.quantity * it.price,
        })),
      }));
    }
    return [
      {
        id: 1,
        order_number: '101',
        created_at: 'Bugun, 20:45',
        status: 'preparing' as const,
        status_display: 'Tayyorlanmoqda',
        total_amount: 156000,
        table_number: ctxTableNumber || '05',
        items: [
          { name: "To'y Oshi (Maxsus devzira)", quantity: 2, price: 48000, total: 96000 },
          { name: "Qo'y Go'shti Shashlik", quantity: 4, price: 28000, total: 112000 },
          { name: "Tandir Non", quantity: 2, price: 5000, total: 10000 },
        ],
      },
    ];
  }, [sharedOrders, ctxTableNumber]);

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  
  // URL parametr bo'yicha buyurtmani avtomatik ochish (/order/<pk>/)
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/\/order\/(\d+)/);
    if (match && match[1]) {
      return (
        orders.find(
          (o) => String(o.id) === match[1] || o.order_number.includes(match[1])
        ) || null
      );
    }
    return null;
  });

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastIcon, setToastIcon] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, icon = '') => {
    setToastMsg(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleCallWaiter = () => {
    showToast('Ofitsiantga chaqiruv yuborildi');
  };

  const handleRequestBill = () => {
    showToast('Hisob-kitob so\'rovi qabul qilindi');
  };

  const handleServiceCall = (serviceName: string) => {
    showToast(`"${serviceName}" so'rovi yuborildi`);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleOnlinePay = (order: OrderData) => {
    showToast(`Buyurtma #${order.order_number} to'loviga o'tilmoqda`);
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'active') {
      return orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    }
    if (filterStatus === 'completed') {
      return orders.filter((o) => ['completed', 'cancelled'].includes(o.status));
    }
    return orders;
  }, [orders, filterStatus]);

  const activeOrdersTotal = useMemo(() => {
    return orders
      .filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
      .reduce((sum, o) => sum + o.total_amount, 0);
  }, [orders]);

  const getStatusBadgeClass = (status: OrderData['status']) => {
    switch (status) {
      case 'pending': return 'badge-status-pending';
      case 'confirmed': return 'badge-status-confirmed';
      case 'preparing': return 'badge-status-preparing';
      case 'ready': return 'badge-status-ready';
      case 'completed': return 'badge-status-completed';
      default: return 'badge-status-default';
    }
  };

  const renderStatusDot = (status: OrderData['status']) => {
    return <span className={`status-dot dot-${status}`} aria-hidden="true" />;
  };

  return (
    <div className="react-orders-page">
      {/* ─── Header Navigation ─── */}
      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={navCartCount || initialData.cartCount || 0}
        onCartClick={() => navigate('/cart/')}
      />

      <main className="orders-main-content">
        {/* ─── Title & Header ─── */}
        <div className="orders-page-header">
          <span className="orders-kicker">Buyurtmalar tarixi</span>
          <h1 className="orders-page-title serif">
            Hisob va buyurtmalar
          </h1>
          <p className="orders-page-desc">
            Buyurtma holati, taomlar ro'yxati va umumiy hisob-kitob.
          </p>
        </div>

        {/* ─── Tezkor ofitsiant chaqirish va NFC orqali stol tanlash ─── */}
        <div className="orders-quick-call-bar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-call-waiter-banner"
            onClick={() => setIsCallWaiterOpen(true)}
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '0.75rem 1rem',
              background: '#FFF7ED',
              border: '1.5px solid #FFEDD5',
              borderRadius: '0.75rem',
              color: '#EA580C',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🛎️ Ofitsiantni chaqirish (Choy, Non, Hisob)</span>
          </button>
          <button
            type="button"
            className="btn-nfc-switch-banner"
            onClick={() => setIsNfcModalOpen(true)}
            style={{
              padding: '0.75rem 1rem',
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '0.75rem',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>📶 Stol #{ctxTableNumber || '05'} (NFC/QR)</span>
          </button>
        </div>

        {/* ─── Table Active Bill Card (If table is active) ─── */}
        {table && (
          <div className="table-live-bill-card">
            <div className="table-bill-top">
              <div className="table-badge-large">
                <span className="table-badge-kicker">Stol</span>
                <span className="table-badge-num tabular-nums">{table.number}</span>
              </div>
              <div className="table-bill-summary">
                <span className="bill-label">Joriy faol hisob</span>
                <strong className="bill-amount tabular-nums">
                  {new Intl.NumberFormat('uz-UZ').format(activeOrdersTotal)} so'm
                </strong>
                <span className="bill-hall">{table.hall || 'Asosiy Zal'}</span>
              </div>
            </div>

            {/* Tezkor xizmat so'rovlari */}
            <div className="service-quick-buttons">
              <button
                type="button"
                className="btn-service-pill"
                onClick={() => handleServiceCall('Choy yangilash')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                  <line x1="6" y1="2" x2="6" y2="4" />
                  <line x1="10" y1="2" x2="10" y2="4" />
                  <line x1="14" y1="2" x2="14" y2="4" />
                </svg>
                <span>Choy yangilash</span>
              </button>
              <button
                type="button"
                className="btn-service-pill"
                onClick={() => handleServiceCall('Tandir non olib kelish')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M7 12h10" />
                </svg>
                <span>Non keltirish</span>
              </button>
              <button
                type="button"
                className="btn-service-pill"
                onClick={() => handleServiceCall('Qo\'shimcha salfetka')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 12h10" />
                </svg>
                <span>Salfetka</span>
              </button>
            </div>

            <div className="table-quick-actions">
              <button
                type="button"
                className="btn-table-action btn-call-waiter"
                onClick={handleCallWaiter}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <span>Ofitsiantni chaqirish</span>
              </button>
              <button
                type="button"
                className="btn-table-action btn-request-bill"
                onClick={handleRequestBill}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Hisobni so'rash</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── Filter Tabs ─── */}
        <div className="orders-filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Barchasi ({orders.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Jarayonda ({orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Yakunlangan ({orders.filter((o) => ['completed', 'cancelled'].includes(o.status)).length})
          </button>
        </div>

        {/* ─── Orders List ─── */}
        <div className="orders-list-wrapper">
          {filteredOrders.length === 0 ? (
            <div className="orders-empty-state">
              <div className="empty-orders-icon-circle" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="empty-orders-title">Buyurtmalar mavjud emas</h3>
              <p className="empty-orders-desc">
                Sizda hozircha ushbu toifada buyurtmalar mavjud emas. Menyudan sara taomlarni tanlang.
              </p>
              <a href="/menu/" className="btn-orders-to-menu">
                <span>Menyuga o'tish</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-card-header">
                  <div className="order-card-id">
                    <span className="order-num tabular-nums">№{order.order_number}</span>
                    <span className="order-time">{order.created_at}</span>
                  </div>
                  <span className={`order-status-badge ${getStatusBadgeClass(order.status)}`}>
                    {renderStatusDot(order.status)}
                    <span>{order.status_display}</span>
                  </span>
                </div>

                <div className="order-card-items">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="order-item-snippet">
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-qty tabular-nums">× {item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <span className="order-items-more">
                      + yana {order.items.length - 3} ta taom...
                    </span>
                  )}
                </div>

                <div className="order-card-footer">
                  <div className="order-total-block">
                    <span className="order-total-label">Jami:</span>
                    <strong className="order-total-sum tabular-nums">
                      {new Intl.NumberFormat('uz-UZ').format(order.total_amount)} so'm
                    </strong>
                  </div>
                  <button type="button" className="btn-view-details">
                    <span>Tafsilotlar</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ─── Order Detail Modal ─── */}
      {selectedOrder && (
        <div className="order-detail-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-modal-close-icon"
              onClick={() => setSelectedOrder(null)}
              aria-label="Yopish"
            >
              ✕
            </button>

            <div className="modal-status-hero">
              <h2 className="modal-order-number tabular-nums">
                Buyurtma #{selectedOrder.order_number}
              </h2>
              <span className={`order-status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                {renderStatusDot(selectedOrder.status)}
                <span>{selectedOrder.status_display}</span>
              </span>
            </div>

            <div className="modal-order-meta-grid">
              <div className="meta-box">
                <span className="meta-kicker">Vaqt:</span>
                <strong className="meta-val">{selectedOrder.created_at}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-kicker">Joylashuv:</span>
                <strong className="meta-val">
                  {selectedOrder.table_number
                    ? `Stol №${selectedOrder.table_number}`
                    : 'Yetkazib berish'}
                </strong>
              </div>
            </div>

            <h3 className="modal-items-title">Taomlar ro'yxati</h3>
            <div className="modal-items-list">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="modal-item-row">
                  <div className="modal-item-info">
                    <span className="modal-item-title">{item.name}</span>
                    <span className="modal-item-unit-price tabular-nums">
                      {new Intl.NumberFormat('uz-UZ').format(item.price)} so'm × {item.quantity}
                    </span>
                  </div>
                  <strong className="modal-item-subtotal tabular-nums">
                    {new Intl.NumberFormat('uz-UZ').format(item.total)} so'm
                  </strong>
                </div>
              ))}
            </div>

            <div className="modal-order-total-bar">
              <span className="modal-total-text">Jami to'lov:</span>
              <strong className="modal-total-num tabular-nums">
                {new Intl.NumberFormat('uz-UZ').format(selectedOrder.total_amount)} so'm
              </strong>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-print-order"
                onClick={handlePrintReceipt}
              >
                Chekni chop etish
              </button>
              <button
                type="button"
                className="btn-pay-order"
                onClick={() => handleOnlinePay(selectedOrder)}
              >
                Onlayn to'lov
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Navigation ─── */}
      <BottomNav
        activeTab="orders"
        cartCount={navCartCount || initialData.cartCount || 0}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
