import React, { useEffect, useRef, useState, useMemo } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { StatusScene } from '../../motion';
import type { OrderStatusKey } from '../../motion';
import { fmtMoney, getLang, numberLocale, t, tr } from '../../i18n';
import { dishName } from '../../utils/dishText';
import { moduleEnabled } from '../../utils/brand';
import { termT, tm } from '../../utils/brandText';
import './OrdersPage.css';

export interface OrderItem {
  name: string;
  /** Rus/ingliz tarjimalari (server yuborsa; bo'sh bo'lsa o'zbekcha ko'rinadi) */
  name_ru?: string;
  name_en?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderData {
  id: number;
  order_number: string;
  created_at: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
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
  onlinePayment?: boolean;
}

/** Holat -> animatsion sahna: "completed" yetkazilgan sahnasi bilan; bekor qilinganda sahna yo'q. */
const sceneOf = (status: OrderData['status']): OrderStatusKey | null =>
  status === 'cancelled' ? null : status === 'completed' ? 'delivered' : status;

// Server holatlari (orders.Order.STATUS_CHOICES): 'delivered' va 'out_for_delivery' avval filtrda yo'q edi
const ACTIVE_STATUSES: OrderData['status'][] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
const FINISHED_STATUSES: OrderData['status'][] = ['delivered', 'completed', 'cancelled'];

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
    createServiceCall,
  } = useNavigation();

  const initialData: InitialOrdersData =
    typeof window !== 'undefined' ? window.__GULISTON_ORDERS_DATA__ || {} : {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;

  const baseOrders: OrderData[] = useMemo(() => {
    // Django sahifasi ma'lumot bilan kelgan bo'lsa — FAQAT shu mehmonning o'z buyurtmalari (sessiya bo'yicha).
    // Avval brauzerdagi demo buyurtmalar ("№101", "664,000 so'm") serverdagi haqiqiy buyurtma ustidan chiqib ketardi.
    if (Array.isArray(initialData.orders)) {
      return initialData.orders;
    }
    if (sharedOrders && sharedOrders.length > 0) {
      return sharedOrders.map((o) => ({
        id: typeof o.id === 'number' ? o.id : 1,
        order_number: o.order_number.replace('#', ''),
        created_at: new Date(o.created_at).toLocaleTimeString(numberLocale(), { hour: '2-digit', minute: '2-digit' }),
        status: (o.status === 'paid' ? 'completed' : o.status) as any,
        status_display:
          o.status === 'pending'
            ? tr('Kutilmoqda')
            : o.status === 'preparing'
            ? tr('Tayyorlanmoqda')
            : o.status === 'ready'
            ? tr('Oshxonada tayyor!')
            : o.status === 'delivered'
            ? tr('Yetkazildi')
            : tr("To'landi"),
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
        created_at: `${t('Bugun')}, 20:45`,
        status: 'preparing' as const,
        status_display: tr('Tayyorlanmoqda'),
        total_amount: 156000,
        table_number: ctxTableNumber || '05',
        items: [
          { name: "To'y Oshi (Maxsus devzira)", quantity: 2, price: 48000, total: 96000 },
          { name: "Qo'y Go'shti Shashlik", quantity: 4, price: 28000, total: 112000 },
          { name: "Tandir Non", quantity: 2, price: 5000, total: 10000 },
        ],
      },
    ];
  }, [initialData.orders, sharedOrders, ctxTableNumber]);

  // Jonli yangilanish: faol buyurtma bor ekan, holat serverdan har ~12 soniyada so'raladi (ETag: o'zgarmasa 304, arzon)
  const [polledOrders, setPolledOrders] = useState<OrderData[] | null>(null);
  const orders: OrderData[] = polledOrders ?? baseOrders;
  const pollEtag = useRef<string>('');
  const hasActiveOrder = orders.some((o) => ACTIVE_STATUSES.includes(o.status));

  useEffect(() => {
    if (!hasActiveOrder || !Array.isArray(initialData.orders)) return undefined;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/guest/v1/orders/', {
          credentials: 'same-origin',
          headers: pollEtag.current ? { 'If-None-Match': pollEtag.current } : {},
        });
        if (res.status === 304 || !res.ok) return;
        const data = await res.json();
        pollEtag.current = res.headers.get('ETag') || '';
        if (!stopped && Array.isArray(data?.orders)) {
          setPolledOrders(data.orders);
          setSelectedOrder((prev) => (prev ? data.orders.find((o: OrderData) => o.id === prev.id) ?? prev : prev));
        }
      } catch {
        // Aloqa uzilsa jim: keyingi urinishda qaytadan so'raladi, ekrandagi oxirgi holat qoladi
      }
    };
    const timer = window.setInterval(tick, 12000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [hasActiveOrder, initialData.orders]);

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

  // Haqiqiy chaqiruv: "yuborildi" faqat server qabul qilgandan keyin (avval tugmalar faqat xabar ko'rsatardi)
  const [isSendingCall, setIsSendingCall] = useState(false);
  const callTableNumber = table?.number || ctxTableNumber;

  const sendCall = async (type: 'waiter' | 'bill' | 'tea' | 'bread', title: string, okMessage: string) => {
    if (isSendingCall) return;
    if (!callTableNumber) {
      showToast(tm(t('Stol aniqlanmadi. Stol ustidagi QR kodni skanerlang.')));
      return;
    }
    setIsSendingCall(true);
    const ok = await createServiceCall({ table_number: callTableNumber, type, title });
    setIsSendingCall(false);
    showToast(ok ? okMessage : t("Chaqiruv yuborilmadi. Qayta urinib ko'ring yoki ofitsiantga qo'l ko'taring."));
  };

  const handleCallWaiter = () => sendCall('waiter', 'Ofitsiantni chaqirish', t('Ofitsiantga chaqiruv yuborildi'));

  const handleRequestBill = () => sendCall('bill', 'Hisob-kitob so\'rovi', t("Hisob-kitob so'rovi qabul qilindi"));

  const handleServiceCall = (serviceName: string) => {
    const type = serviceName === 'Choy yangilash' ? 'tea' : serviceName === 'Tandir non olib kelish' ? 'bread' : 'waiter';
    return sendCall(type, serviceName, t('"{name}" so\'rovi yuborildi', { name: t(serviceName) }));
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleOnlinePay = (order: OrderData) => {
    showToast(t("Buyurtma #{num} to'loviga o'tilmoqda", { num: order.order_number }));
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'active') {
      return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    }
    if (filterStatus === 'completed') {
      return orders.filter((o) => FINISHED_STATUSES.includes(o.status));
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
          <span className="orders-kicker">{t('Buyurtmalar tarixi')}</span>
          <h1 className="orders-page-title serif">
            {t('Hisob va buyurtmalar')}
          </h1>
          <p className="orders-page-desc">
            {t("Buyurtma holati, taomlar ro'yxati va umumiy hisob-kitob.")}
          </p>
        </div>

        {/* ─── Tezkor ofitsiant chaqirish va NFC orqali stol tanlash ─── */}
        <div className="orders-quick-call-bar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {moduleEnabled('waiter_call') && (
            <button
              type="button"
              className="btn-call-waiter-banner"
              onClick={() => setIsCallWaiterOpen(true)}
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '0.75rem 1rem',
                background: 'var(--brand-primary-light)',
                border: '1.5px solid var(--brand-primary-subtle)',
                borderRadius: '0.75rem',
                color: 'var(--brand-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>🛎️ {t('Ofitsiantni chaqirish (Choy, Non, Hisob)')}</span>
            </button>
          )}
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
            <span>📶 {tm(t('Stol #{num} (NFC/QR)', { num: ctxTableNumber || '05' }))}</span>
          </button>
        </div>

        {/* ─── Table Active Bill Card (If table is active) ─── */}
        {table && (
          <div className="table-live-bill-card">
            <div className="table-bill-top">
              <div className="table-badge-large">
                <span className="table-badge-kicker">{termT('table')}</span>
                <span className="table-badge-num tabular-nums">{table.number}</span>
              </div>
              <div className="table-bill-summary">
                <span className="bill-label">{t('Joriy faol hisob')}</span>
                <strong className="bill-amount tabular-nums">
                  {fmtMoney(activeOrdersTotal)}
                </strong>
                <span className="bill-hall">{table.hall ? t(table.hall) : t('Asosiy Zal')}</span>
              </div>
            </div>

            {/* Tezkor xizmat so'rovlari */}
            {moduleEnabled('waiter_call') && (
              <div className="service-quick-buttons">
                <button
                  type="button"
                  className="btn-service-pill"
                  onClick={() => handleServiceCall(tr('Choy yangilash'))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                    <line x1="6" y1="2" x2="6" y2="4" />
                    <line x1="10" y1="2" x2="10" y2="4" />
                    <line x1="14" y1="2" x2="14" y2="4" />
                  </svg>
                  <span>{t('Choy yangilash')}</span>
                </button>
                <button
                  type="button"
                  className="btn-service-pill"
                  onClick={() => handleServiceCall(tr('Tandir non olib kelish'))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10M7 12h10" />
                  </svg>
                  <span>{t('Non keltirish')}</span>
                </button>
                <button
                  type="button"
                  className="btn-service-pill"
                  onClick={() => handleServiceCall(tr("Qo'shimcha salfetka"))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 12h10" />
                  </svg>
                  <span>{t('Salfetka')}</span>
                </button>
              </div>
            )}
            <div className="table-quick-actions">
              {moduleEnabled('waiter_call') && (
                <button
                  type="button"
                  className="btn-table-action btn-call-waiter"
                  onClick={handleCallWaiter}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  <span>{t('Ofitsiantni chaqirish')}</span>
                </button>
              )}
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
                <span>{t("Hisobni so'rash")}</span>
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
            {t('Barchasi')} ({orders.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            {t('Jarayonda')} ({orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            {t('Yakunlangan')} ({orders.filter((o) => FINISHED_STATUSES.includes(o.status)).length})
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
              <h3 className="empty-orders-title">{t('Buyurtmalar mavjud emas')}</h3>
              <p className="empty-orders-desc">
                {t('Sizda hozircha ushbu toifada buyurtmalar mavjud emas. Menyudan sara taomlarni tanlang.')}
              </p>
              <a href="/menu/" className="btn-orders-to-menu">
                <span>{t("Menyuga o'tish")}</span>
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
                  {sceneOf(order.status) && <StatusScene status={sceneOf(order.status)!} size={44} />}
                  <div className="order-card-id">
                    <span className="order-num tabular-nums">{t('№{num}', { num: order.order_number })}</span>
                    <span className="order-time">{order.created_at}</span>
                  </div>
                  <span className={`order-status-badge ${getStatusBadgeClass(order.status)}`}>
                    {renderStatusDot(order.status)}
                    <span>{t(order.status_display)}</span>
                  </span>
                </div>

                <div className="order-card-items">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="order-item-snippet">
                      <span className="order-item-name">{dishName(item, getLang())}</span>
                      <span className="order-item-qty tabular-nums">× {item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <span className="order-items-more">
                      {t('+ yana {n} ta taom...', { n: order.items.length - 3 })}
                    </span>
                  )}
                </div>

                <div className="order-card-footer">
                  <div className="order-total-block">
                    <span className="order-total-label">{t('Jami:')}</span>
                    <strong className="order-total-sum tabular-nums">
                      {fmtMoney(order.total_amount)}
                    </strong>
                  </div>
                  <button type="button" className="btn-view-details">
                    <span>{t('Tafsilotlar')}</span>
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
              aria-label={t('Yopish')}
            >
              ✕
            </button>

            <div className="modal-status-hero">
              {sceneOf(selectedOrder.status) && <StatusScene status={sceneOf(selectedOrder.status)!} size={96} />}
              <h2 className="modal-order-number tabular-nums">
                {t('Buyurtma #{num}', { num: selectedOrder.order_number })}
              </h2>
              <span className={`order-status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                {renderStatusDot(selectedOrder.status)}
                <span>{t(selectedOrder.status_display)}</span>
              </span>
            </div>

            <div className="modal-order-meta-grid">
              <div className="meta-box">
                <span className="meta-kicker">{t('Vaqt:')}</span>
                <strong className="meta-val">{selectedOrder.created_at}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-kicker">{t('Joylashuv:')}</span>
                <strong className="meta-val">
                  {selectedOrder.table_number
                    ? tm(t('Stol №{num}', { num: selectedOrder.table_number }))
                    : t('Yetkazib berish')}
                </strong>
              </div>
            </div>

            <h3 className="modal-items-title">{t("Taomlar ro'yxati")}</h3>
            <div className="modal-items-list">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="modal-item-row">
                  <div className="modal-item-info">
                    <span className="modal-item-title">{dishName(item, getLang())}</span>
                    <span className="modal-item-unit-price tabular-nums">
                      {fmtMoney(item.price)} × {item.quantity}
                    </span>
                  </div>
                  <strong className="modal-item-subtotal tabular-nums">
                    {fmtMoney(item.total)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="modal-order-total-bar">
              <span className="modal-total-text">{t("Jami to'lov:")}</span>
              <strong className="modal-total-num tabular-nums">
                {fmtMoney(selectedOrder.total_amount)}
              </strong>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-print-order"
                onClick={handlePrintReceipt}
              >
                {t('Chekni chop etish')}
              </button>
              {initialData.onlinePayment === true && (
                <button
                  type="button"
                  className="btn-pay-order"
                  onClick={() => handleOnlinePay(selectedOrder)}
                >
                  {t("Onlayn to'lov")}
                </button>
              )}
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
