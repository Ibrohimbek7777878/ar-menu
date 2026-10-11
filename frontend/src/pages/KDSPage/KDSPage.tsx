import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StaffNavHeader } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './KDSPage.css';

export interface KDSOrderItem {
  id: number | string;
  name: string;
  quantity: number;
  unit?: string;
  course?: '1-taom' | '2-taom' | 'salat' | 'ichimlik' | 'shirinlik';
  notes?: string;
  done?: boolean;
}

export interface KDSOrder {
  id: number | string;
  order_number: string;
  table_name: string;
  table_number?: string | number;
  customer_name: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'paid';
  created_at: string;
  notes?: string;
  items: KDSOrderItem[];
  elapsed_seconds?: number;
}

declare global {
  interface Window {
    __GULISTON_KDS_DATA__?: {
      shop?: { name?: string };
      orders?: KDSOrder[];
      count_pending?: number;
      count_preparing?: number;
      count_ready?: number;
    };
  }
}

// Beeper funksiyasi - Web Audio API orqali audio signal
function playKdsBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may require user interaction
  }
}

export const KDSPage: React.FC = () => {
  const { orders: sharedOrders, updateOrderStatus, toggleOrderItemDone } = useNavigation();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setCurrentTime] = useState<string>('');
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Jonli soat va vaqt tamg'asi
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimestamp(now.getTime());
      setCurrentTime(
        now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const orders = sharedOrders;

  const kitchenItemSummary = useMemo(() => {
    const summary: Record<string, { count: number; unit: string }> = {};
    orders
      .filter((o) => o.status === 'pending' || o.status === 'preparing')
      .forEach((o) => {
        o.items.forEach((it) => {
          if (!it.done) {
            const unit = it.unit || 'ta';
            if (!summary[it.name]) {
              summary[it.name] = { count: 0, unit };
            }
            summary[it.name].count += it.quantity;
          }
        });
      });
    return Object.entries(summary);
  }, [orders]);

  // Polling / Yangilanish funksiyasi
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Buyurtma holatini yangilash
  const handleUpdateStatus = (orderId: number | string, newStatus: KDSOrder['status']) => {
    if (soundEnabled) playKdsBeep();
    updateOrderStatus(orderId, newStatus as any);
  };

  const toggleItemDone = (orderId: number | string, itemId: number | string) => {
    toggleOrderItemDone(orderId, itemId);
  };

  const getElapsedMinutes = useCallback(
    (createdAtStr: string) => {
      const created = new Date(createdAtStr).getTime();
      const diffMs = (currentTimestamp || Date.now()) - created;
      return Math.max(0, Math.floor(diffMs / 60000));
    },
    [currentTimestamp]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeFilter === 'pending' && o.status !== 'pending') return false;
      if (activeFilter === 'preparing' && o.status !== 'preparing') return false;
      if (activeFilter === 'ready' && o.status !== 'ready') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTbl = o.table_name.toLowerCase().includes(q);
        const matchNum = o.order_number.toLowerCase().includes(q);
        const matchCust = o.customer_name ? o.customer_name.toLowerCase().includes(q) : false;
        if (!matchTbl && !matchNum && !matchCust) return false;
      }
      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
    };
  }, [orders]);

  return (
    <div className="kds-root">
      <StaffNavHeader activeTab="kds" />
      {/* ─── STATUS HEADER ─── */}
      <header className="kds-header">
        <div className="kds-brand">
          <div className="kds-brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          </div>
          <div>
            <h1 className="kds-brand-title">Oshxona Ekrani</h1>
            <p className="kds-brand-subtitle">KDS Boshqaruv Tizimi</p>
          </div>
        </div>

        <div className="kds-top-actions">
          <button
            type="button"
            className={`kds-sound-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Ovozli signal"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {soundEnabled ? (
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              ) : (
                <line x1="23" y1="9" x2="17" y2="15" />
              )}
            </svg>
            <span>{soundEnabled ? 'Ovoz yoqiq' : 'Ovoz o\'chiq'}</span>
          </button>

          <button
            type="button"
            className="kds-refresh-btn"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{isLoading ? 'Yangilanmoqda...' : 'Yangilash'}</span>
          </button>
        </div>
      </header>

      {/* ─── FILTR TABS & QIDIRUV ─── */}
      <nav className="kds-nav-tabs">
        <button
          type="button"
          className={`kds-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          Barchasi <span className="kds-tab-count tabular-nums">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`kds-tab-btn ${activeFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveFilter('pending')}
        >
          Yangi <span className="kds-tab-count tabular-nums">{counts.pending}</span>
        </button>

        <button
          type="button"
          className={`kds-tab-btn ${activeFilter === 'preparing' ? 'active' : ''}`}
          onClick={() => setActiveFilter('preparing')}
        >
          Jarayonda <span className="kds-tab-count tabular-nums">{counts.preparing}</span>
        </button>

        <button
          type="button"
          className={`kds-tab-btn ${activeFilter === 'ready' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ready')}
        >
          Tayyor <span className="kds-tab-count tabular-nums">{counts.ready}</span>
        </button>

        <div className="kds-search-box">
          <input
            type="text"
            placeholder="Stol yoki № qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="kds-search-input"
          />
        </div>
      </nav>

      {/* ─── OSHXONA JAMI MAHSULOTLAR SVODKASI (BULK KITCHEN COUNTER) ─── */}
      {kitchenItemSummary.length > 0 && (
        <section className="kds-summary-bar">
          <div className="summary-bar-header">
            <span className="summary-icon">🔥</span>
            <span className="summary-title">Pishirilishi kerak bo'lgan taomlar svodkasi:</span>
            <span className="summary-total-badge">{kitchenItemSummary.length} xil</span>
          </div>
          <div className="summary-chips-scroll">
            {kitchenItemSummary.map(([name, data]) => (
              <div key={name} className="summary-dish-chip">
                <span className="summary-dish-name">{name}</span>
                <span className="summary-dish-count tabular-nums">{data.count} {data.unit}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TICKETLAR GRIDI ─── */}
      <main className="kds-main">
        {filteredOrders.length === 0 ? (
          <div className="kds-empty">
            <div className="kds-empty-icon-circle" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="kds-empty-title">Ayni paytda faol buyurtmalar yo'q</h2>
            <p className="kds-empty-desc">
              Barcha buyurtmalar o'z vaqtida tayyorlab bo'lingan.
            </p>
          </div>
        ) : (
          <div className="kds-grid">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.created_at);
              const isLate = elapsed >= 20;
              const isWarning = elapsed >= 10 && elapsed < 20;

              return (
                <article
                  key={order.id}
                  className={`kds-ticket status-${order.status} ${isLate ? 'border-late' : ''}`}
                >
                  {/* Chipta bosh qismi */}
                  <div className="kds-ticket-header">
                    <div className="kds-order-info">
                      <div className="kds-order-num tabular-nums">
                        {order.order_number}
                      </div>
                      <div className="kds-table-badge">
                        <span>{order.table_name || 'Stol ko\'rsatilmagan'}</span>
                      </div>
                      {order.customer_name && (
                        <div className="kds-customer-name">
                          {order.customer_name}
                        </div>
                      )}
                    </div>

                    <div className="kds-ticket-meta">
                      <div
                        className={`kds-elapsed-timer tabular-nums ${
                          isLate ? 'timer-late' : isWarning ? 'timer-warning' : 'timer-fresh'
                        }`}
                      >
                        {isLate && <span className="kds-late-indicator" />}
                        <span>{elapsed} daq</span>
                      </div>
                      <div className={`kds-status-badge badge-${order.status}`}>
                        {order.status === 'pending'
                          ? 'Yangi'
                          : order.status === 'preparing'
                          ? 'Tayyorlanmoqda'
                          : order.status === 'ready'
                          ? 'Tayyor'
                          : order.status}
                      </div>
                    </div>
                  </div>

                  {/* Chipta tarkibi (Taomlar) */}
                  <div className="kds-ticket-body">
                    {order.notes && (
                      <div className="kds-ticket-notes">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{order.notes}</span>
                      </div>
                    )}

                    <ul className="kds-items-list">
                      {order.items.map((item) => {
                        const isDone = !!item.done;
                        return (
                          <li
                            key={item.id}
                            className={`kds-item-row ${isDone ? 'done' : ''}`}
                            onClick={() => toggleItemDone(order.id, item.id)}
                            title="Bajarilganini belgilash uchun bosing"
                          >
                            <div className="kds-item-left">
                              <span className="kds-item-qty tabular-nums">{item.quantity}×</span>
                              <span className="kds-item-name">{item.name}</span>
                              {item.course && (
                                <span className={`kds-course-tag course-${item.course}`}>
                                  {item.course}
                                </span>
                              )}
                            </div>
                            <div className="kds-check-box">
                              {isDone && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Chipta pastki qismi (Amallar) */}
                  <div className="kds-ticket-footer">
                    {order.status === 'pending' ? (
                      <button
                        type="button"
                        className="kds-action-btn btn-start"
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      >
                        Tayyorlashni boshlash
                      </button>
                    ) : order.status === 'preparing' ? (
                      <button
                        type="button"
                        className="kds-action-btn btn-ready"
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                      >
                        Tayyor bo'ldi
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="kds-action-btn btn-deliver"
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                      >
                        Ofitsiantga topshirildi
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
