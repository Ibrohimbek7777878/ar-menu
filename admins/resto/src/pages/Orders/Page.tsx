import React, { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatCard,
  useToast,
  formatHumanDateTime,
} from '@admins/shared';
import {
  AlertCircle,
  Armchair,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  XCircle,
} from 'lucide-react';
import { OrderDTO } from './api';
import { useOrders } from './useOrders';
import { restoUz } from '../../i18n/uz';

const STATUS_CONFIG: Record<
  OrderDTO['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Kutilmoqda',
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  confirmed: {
    label: 'Tasdiqlangan',
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  preparing: {
    label: 'Tayyorlanmoqda',
    bg: 'var(--bg-surface-hover)',
    text: 'var(--text-muted)',
    border: 'var(--border-strong)',
  },
  ready: {
    label: 'Tayyor',
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  out_for_delivery: {
    label: "Yo'lda",
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  delivered: {
    label: 'Berildi',
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  cancelled: {
    label: 'Bekor qilindi',
    bg: 'var(--accent-rose-bg)',
    text: 'var(--text-main)', // qizil matn kichik o'lchamda 4.4:1: to'q matn + qizil fon/chegara
    border: 'var(--accent-rose-border)',
  },
};

export const OrdersPage: React.FC = () => {
  const {
    orders,
    summary,
    page,
    totalPages,
    totalCount,
    hasNext,
    hasPrev,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    setPage,
    changeStatus,
    changePayment,
    refresh,
  } = useOrders();

  const { showToast } = useToast();

  // Receipt & Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);

  // Cancel Modal
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Status Change Handler with Toast
  const handleQuickStatusChange = async (order: OrderDTO, nextStatus: string) => {
    await changeStatus(order.id, nextStatus);
    showToast(`Buyurtma #${order.order_number} holati yangilandi`, 'success');
  };

  // Cancel Handler
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder) return;

    setCancelSubmitting(true);
    try {
      await changeStatus(cancellingOrder.id, 'cancelled', cancelReason.trim());
      showToast(`Buyurtma #${cancellingOrder.order_number} bekor qilindi`, 'info');
      setCancellingOrder(null);
      setCancelReason('');
    } catch {
      showToast("Buyurtmani bekor qilib bo'lmadi", 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Payment Status Handler
  const handleMarkAsPaid = async (order: OrderDTO) => {
    await changePayment(order.id, 'paid');
    showToast(`Buyurtma #${order.order_number} to'langan deb belgilandi`, 'success');
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, payment_status: 'paid', payment_status_display: "To'langan" });
    }
  };

  // Print Receipt Handler
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Sarlavha va harakatlar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            Buyurtmalar
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Restoran va yetkazib berish buyurtmalari oqimi, oshxona nazorati va cheklar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title="Qayta yuklash">
            <RefreshCw size={18} />
          </Button>
        </div>
      </div>

      {/* 4 ta Xulosa Kartasi (Summary) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title="Bugungi Jami"
          value={summary.today_total}
          icon={<ShoppingBag size={22} color="var(--primary)" />}
        />
        <StatCard
          title="Kutilmoqda (Yangi)"
          value={summary.pending}
          icon={<Clock size={22} color="var(--accent-rose)" />}
        />
        <StatCard
          title="Oshxonada (Tayyorlanmoqda)"
          value={summary.preparing}
          icon={<Flame size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title="Tayyor (Tortish kerak)"
          value={summary.ready}
          icon={<CheckCircle2 size={22} color="var(--accent-indigo)" />}
        />
      </div>

      {/* Sana Filtrlari va Holat Tablari */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
        }}
      >
        {/* Holat filtrlari */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'pending', label: `Kutilmoqda (${summary.pending})` },
            { id: 'preparing', label: `Tayyorlanmoqda (${summary.preparing})` },
            { id: 'ready', label: `Tayyor (${summary.ready})` },
            { id: 'delivered', label: 'Berildi' },
            { id: 'cancelled', label: 'Bekor qilingan' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === st.id ? 'var(--text-main)' : 'var(--card-bg)',
                color: statusFilter === st.id ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Sana tanlash */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'today', label: 'Bugun' },
            { id: 'yesterday', label: 'Kecha' },
            { id: 'all', label: 'Barcha Vaqt' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateFilter(d.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: dateFilter === d.id ? 'var(--primary)' : 'var(--border-color)',
                background: dateFilter === d.id ? 'var(--accent-amber-bg)' : 'transparent',
                color: dateFilter === d.id ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Qidiruv qatori */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Buyurtma raqami, stol yoki mijoz ismi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-main)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Xatolik */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: 'rgb(220 38 38 / 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              Qayta urinish
            </Button>
          </div>
        </Card>
      )}

      {/* Yuklanish skeleti */}
      {loading && orders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="120px" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={48} />}
          title="Buyurtmalar mavjud emas"
          description={
            searchQuery || statusFilter !== 'all'
              ? "Qidiruv yoki filtr mezonlari bo'yicha buyurtmalar topilmadi."
              : "Hozircha hech qanday yangi buyurtma kelib tushmagan."
          }
        />
      ) : (
        /* Buyurtmalar ro'yxati */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map((order: OrderDTO) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const orderTime = new Date(order.created_at).toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={order.id}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${statusCfg.border}`,
                  background: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* 1-qator: Sarlavha, Stol, Vaqt va Status */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      #{order.order_number}
                    </div>

                    {order.table ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgb(24 21 19 / 0.04)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                        }}
                      >
                        <Armchair size={14} color="var(--primary)" />
                        Stol #{order.table.number} ({order.table.hall_name})
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgb(24 21 19 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--accent-indigo)',
                        }}
                      >
                        Olib ketish / Yetkazish
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <Clock size={14} />
                      {orderTime}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* To'lov holati */}
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: order.payment_status === 'paid' ? 'var(--accent-emerald-bg)' : 'var(--accent-rose-bg)',
                        color: order.payment_status === 'paid' ? 'var(--accent-emerald)' : 'var(--text-main)',
                        border: `1px solid ${order.payment_status === 'paid' ? 'rgb(22 163 74 / 0.25)' : 'rgb(220 38 38 / 0.25)'}`,
                      }}
                    >
                      {order.payment_status_display}
                    </div>

                    {/* Buyurtma holati */}
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      {statusCfg.label}
                    </div>
                  </div>
                </div>

                {/* 2-qator: Mijoz va taomlar ro'yxati */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgb(24 21 19 / 0.04)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                      <User size={14} color="var(--text-muted)" />
                      <strong>{order.customer_name}</strong>
                      {order.customer_phone && <span style={{ color: 'var(--text-muted)' }}>({order.customer_phone})</span>}
                    </div>

                    {order.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
                        Izoh: "{order.notes}"
                      </div>
                    )}
                  </div>

                  {/* Taomlar xulosasi */}
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {order.items.slice(0, 3).map((it) => (
                      <span key={it.id} style={{ marginRight: '8px', display: 'inline-block' }}>
                        {it.quantity}x {it.product_name}
                      </span>
                    ))}
                    {order.items.length > 3 && <span>+{order.items.length - 3} ta boshqa</span>}
                  </div>
                </div>

                {/* 3-qator: Summa va Harakatlar tugmalari */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Jami:</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                      {order.final_amount.toLocaleString('uz-UZ')} so'm
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Chekni ko'rish */}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                      <Eye size={14} style={{ marginRight: '4px' }} />
                      {restoUz.ordersPage.viewReceipt}
                    </Button>

                    {/* Bosqichma-bosqich status o'zgartirish */}
                    {order.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickStatusChange(order, 'confirmed')}
                      >
                        <Check size={14} style={{ marginRight: '4px' }} />
                        Tasdiqlash
                      </Button>
                    )}

                    {order.status === 'confirmed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickStatusChange(order, 'preparing')}
                        style={{ color: 'var(--accent-amber)' }}
                      >
                        <Flame size={14} style={{ marginRight: '4px' }} />
                        Oshxonaga berish
                      </Button>
                    )}

                    {order.status === 'preparing' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickStatusChange(order, 'ready')}
                        style={{ color: 'var(--accent-indigo)' }}
                      >
                        <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                        Tayyor bo'ldi
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickStatusChange(order, 'delivered')}
                      >
                        <Check size={14} style={{ marginRight: '4px' }} />
                        Mijozga berildi
                      </Button>
                    )}

                    {/* To'lovni qabul qilish */}
                    {order.payment_status === 'unpaid' && order.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsPaid(order)}
                        title="To'landi deb belgilash"
                        style={{ color: 'var(--accent-emerald)' }}
                      >
                        To'lovni qabul qilish
                      </Button>
                    )}

                    {/* Bekor qilish */}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingOrder(order)}
                        style={{ color: 'var(--accent-rose)' }}
                      >
                        <XCircle size={14} style={{ marginRight: '4px' }} />
                        Bekor qilish
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Paginatsiya */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '12px 0',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Jami: {totalCount} ta buyurtma (Sahifa {page} / {totalPages})
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage(page - 1)}
                >
                  Oldingi
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage(page + 1)}
                >
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chek va Tafsilotlar Modali */}
      {selectedOrder && (
        <Modal
          isOpen={true}
          title={`Buyurtma #${selectedOrder.order_number} — Chek`}
          onClose={() => setSelectedOrder(null)}
        >
          <div style={{ padding: '8px 0' }}>
            {/* Chek bosma qismi */}
            <div
              id="printable-receipt"
              style={{
                background: '#ffffff',
                color: 'var(--text-main)',
                padding: '24px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                marginBottom: '20px',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed var(--text-dim)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>RESTORAN CHEKI</div>
                <div>Buyurtma #{selectedOrder.order_number}</div>
                <div>{formatHumanDateTime(selectedOrder.created_at, { alwaysTime: true })}</div>
                {selectedOrder.table && (
                  <div style={{ fontWeight: 700, marginTop: '4px' }}>
                    Stol #{selectedOrder.table.number} ({selectedOrder.table.hall_name})
                  </div>
                )}
              </div>

              {/* Taomlar jadvali */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>Nomi</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>Soni</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Narxi</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px dashed #f3f4f6' }}>
                      <td style={{ padding: '6px 0' }}>{it.product_name}</td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{it.price.toLocaleString('uz-UZ')}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{it.total.toLocaleString('uz-UZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Jami hisob-kitob */}
              <div style={{ borderTop: '1px dashed var(--text-dim)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Oraliq summa:</span>
                  <span>{selectedOrder.total_amount.toLocaleString('uz-UZ')} so'm</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--accent-rose)' }}>
                    <span>Chegirma:</span>
                    <span>-{selectedOrder.discount_amount.toLocaleString('uz-UZ')} so'm</span>
                  </div>
                )}
                {selectedOrder.delivery_fee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Yetkazib berish:</span>
                    <span>{selectedOrder.delivery_fee.toLocaleString('uz-UZ')} so'm</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, marginTop: '8px', borderTop: '1px solid var(--text-main)', paddingTop: '6px' }}>
                  <span>JAMI:</span>
                  <span>{selectedOrder.final_amount.toLocaleString('uz-UZ')} so'm</span>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                  Holat: {selectedOrder.status_display} | To'lov: {selectedOrder.payment_status_display}
                </div>
              </div>
            </div>

            {/* Harakatlar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedOrder.payment_status === 'unpaid' && (
                <Button variant="secondary" onClick={() => handleMarkAsPaid(selectedOrder)}>
                  To'landi deb belgilash
                </Button>
              )}
              <Button variant="primary" onClick={handlePrintReceipt}>
                <Printer size={16} style={{ marginRight: '6px' }} />
                Chop etish (Print)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bekor qilish Modali */}
      {cancellingOrder && (
        <Modal
          isOpen={true}
          title={`Buyurtma #${cancellingOrder.order_number} ni Bekor Qilish`}
          onClose={() => setCancellingOrder(null)}
        >
          <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Ushbu buyurtmani bekor qilish sababini ko'rsating. Ushbu amal audit logida qayd etiladi.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Bekor qilish sababi
              </label>
              <textarea
                required
                rows={3}
                placeholder="Masalan: Mijoz buyurtmani bekor qildi / Mahsulot tugagan..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" type="button" onClick={() => setCancellingOrder(null)}>
                Orqaga
              </Button>
              <Button variant="primary" type="submit" disabled={cancelSubmitting} style={{ background: 'var(--accent-rose)' }}>
                {cancelSubmitting ? "Bekor qilinmoqda..." : "Bekor qilishni tasdiqlash"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default OrdersPage;
