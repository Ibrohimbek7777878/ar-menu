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
  fmtNum,
  numberLocale,
  t,
  tr,
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

// Holat nomlari tr() bilan belgilangan, ko'rsatishda t() chaqiriladi (modul bir marta bajariladi: til almashganda yangilanishi uchun).
const STATUS_CONFIG: Record<
  OrderDTO['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: tr('Kutilmoqda'),
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  confirmed: {
    label: tr('Tasdiqlangan'),
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  preparing: {
    label: tr('Tayyorlanmoqda'),
    bg: 'var(--bg-surface-hover)',
    text: 'var(--text-muted)',
    border: 'var(--border-strong)',
  },
  ready: {
    label: tr('Tayyor'),
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  out_for_delivery: {
    label: tr("Yo'lda"),
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  delivered: {
    label: tr('Berildi'),
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  cancelled: {
    label: tr('Bekor qilindi'),
    bg: 'var(--accent-rose-bg)',
    text: 'var(--text-main)', // qizil matn kichik o'lchamda 4.4:1: to'q matn + qizil fon/chegara
    border: 'var(--accent-rose-border)',
  },
};

// To'lov holati nomlari (server matnlari bilan bir xil o'zbekcha): kod bo'yicha olinadi, shunda tarjima serverga bog'liq bo'lmaydi.
const PAYMENT_LABELS: Record<OrderDTO['payment_status'], string> = {
  unpaid: tr("To'lanmagan"),
  pending: tr('Kutilmoqda'),
  paid: tr("To'langan"),
  refunded: tr('Qaytarilgan'),
};

const statusLabel = (order: OrderDTO): string => t(STATUS_CONFIG[order.status]?.label ?? order.status_display);
const paymentLabel = (order: OrderDTO): string => t(PAYMENT_LABELS[order.payment_status] ?? order.payment_status_display);

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
    showToast(t('Buyurtma #{number} holati yangilandi', { number: order.order_number }), 'success');
  };

  // Cancel Handler
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder) return;

    setCancelSubmitting(true);
    try {
      await changeStatus(cancellingOrder.id, 'cancelled', cancelReason.trim());
      showToast(t('Buyurtma #{number} bekor qilindi', { number: cancellingOrder.order_number }), 'info');
      setCancellingOrder(null);
      setCancelReason('');
    } catch {
      showToast(t("Buyurtmani bekor qilib bo'lmadi"), 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Payment Status Handler
  const handleMarkAsPaid = async (order: OrderDTO) => {
    await changePayment(order.id, 'paid');
    showToast(t("Buyurtma #{number} to'langan deb belgilandi", { number: order.order_number }), 'success');
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, payment_status: 'paid', payment_status_display: tr("To'langan") });
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
            {t('Buyurtmalar')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('Restoran va yetkazib berish buyurtmalari oqimi, oshxona nazorati va cheklar.')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title={t('Qayta yuklash')}>
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
          title={t('Bugungi Jami')}
          value={summary.today_total}
          icon={<ShoppingBag size={22} color="var(--brand)" />}
        />
        <StatCard
          title={t('Kutilmoqda (Yangi)')}
          value={summary.pending}
          icon={<Clock size={22} color="var(--accent-rose)" />}
        />
        <StatCard
          title={t('Oshxonada (Tayyorlanmoqda)')}
          value={summary.preparing}
          icon={<Flame size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title={t('Tayyor (Tortish kerak)')}
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
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
        }}
      >
        {/* Holat filtrlari */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: t('Barchasi') },
            { id: 'pending', label: t('Kutilmoqda ({n})', { n: summary.pending }) },
            { id: 'preparing', label: t('Tayyorlanmoqda ({n})', { n: summary.preparing }) },
            { id: 'ready', label: t('Tayyor ({n})', { n: summary.ready }) },
            { id: 'delivered', label: t('Berildi') },
            { id: 'cancelled', label: t('Bekor qilingan') },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === st.id ? 'var(--text-main)' : 'var(--bg-surface)',
                // to'q (kun) / och (tun) to'ldirish ustida matn: sirt rangi teskari
                color: statusFilter === st.id ? 'var(--bg-surface)' : 'var(--text-muted)',
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
            { id: 'today', label: t('Bugun') },
            { id: 'yesterday', label: t('Kecha') },
            { id: 'all', label: t('Barcha Vaqt') },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateFilter(d.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: dateFilter === d.id ? 'var(--brand)' : 'var(--border-subtle)',
                background: dateFilter === d.id ? 'var(--brand-bg)' : 'transparent',
                color: dateFilter === d.id ? 'var(--brand)' : 'var(--text-muted)',
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
            placeholder={t('Buyurtma raqami, stol yoki mijoz ismi...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)',
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
        <Card style={{ marginBottom: '24px', borderColor: 'var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{t(error)}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              {t('Qayta urinish')}
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
          title={t('Buyurtmalar mavjud emas')}
          description={
            searchQuery || statusFilter !== 'all'
              ? t("Qidiruv yoki filtr mezonlari bo'yicha buyurtmalar topilmadi.")
              : t('Hozircha hech qanday yangi buyurtma kelib tushmagan.')
          }
        />
      ) : (
        /* Buyurtmalar ro'yxati */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map((order: OrderDTO) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const orderTime = new Date(order.created_at).toLocaleTimeString(numberLocale(), {
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            });

            return (
              <Card
                key={order.id}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${statusCfg.border}`,
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: 'var(--shadow-md)',
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
                          background: 'var(--bg-elevated)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                        }}
                      >
                        <Armchair size={14} color="var(--brand)" />
                        {t('Stol #{number} ({hall})', { number: order.table.number, hall: t(order.table.hall_name) })}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'var(--accent-indigo-bg)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--accent-indigo)',
                        }}
                      >
                        {t('Olib ketish / Yetkazish')}
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
                        border: `1px solid ${order.payment_status === 'paid' ? 'var(--accent-emerald-border)' : 'var(--accent-rose-border)'}`,
                      }}
                    >
                      {paymentLabel(order)}
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
                      {t(statusCfg.label)}
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
                    // --bg-primary: izoh matni (--accent-amber) apelsin-tunda --bg-elevated ustida 4.3:1, bu fonda >= 4.5:1
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                      <User size={14} color="var(--text-muted)" />
                      <strong>{t(order.customer_name)}</strong>
                      {order.customer_phone && <span style={{ color: 'var(--text-muted)' }}>({order.customer_phone})</span>}
                    </div>

                    {order.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
                        {t('Izoh: "{notes}"', { notes: order.notes })}
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
                    {order.items.length > 3 && <span>{t('+{n} ta boshqa', { n: order.items.length - 3 })}</span>}
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
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Jami:')}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand)' }}>
                      {t("{amount} so'm", { amount: fmtNum(order.final_amount) })}
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
                        {t('Tasdiqlash')}
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
                        {t('Oshxonaga berish')}
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
                        {t("Tayyor bo'ldi")}
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickStatusChange(order, 'delivered')}
                      >
                        <Check size={14} style={{ marginRight: '4px' }} />
                        {t('Mijozga berildi')}
                      </Button>
                    )}

                    {/* To'lovni qabul qilish */}
                    {order.payment_status === 'unpaid' && order.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsPaid(order)}
                        title={t("To'landi deb belgilash")}
                        style={{ color: 'var(--accent-emerald)' }}
                      >
                        {t("To'lovni qabul qilish")}
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
                        {t('Bekor qilish')}
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
                {t('Jami: {n} ta buyurtma (Sahifa {page} / {pages})', { n: totalCount, page, pages: totalPages })}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage(page - 1)}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage(page + 1)}
                >
                  {t('Keyingi')}
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
          title={t('Buyurtma #{number} — Chek', { number: selectedOrder.order_number })}
          onClose={() => setSelectedOrder(null)}
        >
          <div style={{ padding: '8px 0' }}>
            {/* Chek bosma qismi */}
            <div
              id="printable-receipt"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                padding: '24px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '20px',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed var(--text-dim)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{t('RESTORAN CHEKI')}</div>
                <div>{t('Buyurtma #{number}', { number: selectedOrder.order_number })}</div>
                <div>{formatHumanDateTime(selectedOrder.created_at, { alwaysTime: true })}</div>
                {selectedOrder.table && (
                  <div style={{ fontWeight: 700, marginTop: '4px' }}>
                    {t('Stol #{number} ({hall})', { number: selectedOrder.table.number, hall: t(selectedOrder.table.hall_name) })}
                  </div>
                )}
              </div>

              {/* Taomlar jadvali */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>{t('Nomi')}</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>{t('Soni')}</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>{t('Narxi')}</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>{t('Jami')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px dashed var(--border-subtle)' }}>
                      <td style={{ padding: '6px 0' }}>{it.product_name}</td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtNum(it.price)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtNum(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Jami hisob-kitob */}
              <div style={{ borderTop: '1px dashed var(--text-dim)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{t('Oraliq summa:')}</span>
                  <span>{t("{amount} so'm", { amount: fmtNum(selectedOrder.total_amount) })}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--accent-rose)' }}>
                    <span>{t('Chegirma:')}</span>
                    <span>-{t("{amount} so'm", { amount: fmtNum(selectedOrder.discount_amount) })}</span>
                  </div>
                )}
                {selectedOrder.delivery_fee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{t('Yetkazib berish:')}</span>
                    <span>{t("{amount} so'm", { amount: fmtNum(selectedOrder.delivery_fee) })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, marginTop: '8px', borderTop: '1px solid var(--text-main)', paddingTop: '6px' }}>
                  <span>{t('JAMI:')}</span>
                  <span>{t("{amount} so'm", { amount: fmtNum(selectedOrder.final_amount) })}</span>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
                  {t('Holat: {status}', { status: statusLabel(selectedOrder) })} | {t("To'lov: {payment}", { payment: paymentLabel(selectedOrder) })}
                </div>
              </div>
            </div>

            {/* Harakatlar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedOrder.payment_status === 'unpaid' && (
                <Button variant="secondary" onClick={() => handleMarkAsPaid(selectedOrder)}>
                  {t("To'landi deb belgilash")}
                </Button>
              )}
              <Button variant="primary" onClick={handlePrintReceipt}>
                <Printer size={16} style={{ marginRight: '6px' }} />
                {t('Chop etish (Print)')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bekor qilish Modali */}
      {cancellingOrder && (
        <Modal
          isOpen={true}
          title={t('Buyurtma #{number} ni Bekor Qilish', { number: cancellingOrder.order_number })}
          onClose={() => setCancellingOrder(null)}
        >
          <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              {t("Ushbu buyurtmani bekor qilish sababini ko'rsating. Ushbu amal audit logida qayd etiladi.")}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Bekor qilish sababi')}
              </label>
              <textarea
                required
                rows={3}
                placeholder={t('Masalan: Mijoz buyurtmani bekor qildi / Mahsulot tugagan...')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" type="button" onClick={() => setCancellingOrder(null)}>
                {t('Orqaga')}
              </Button>
              {/* "danger": qizil to'ldirish (--accent-rose-solid) + oq matn: tunda ham AA (oddiy --accent-rose tunda matn uchun ochroq) */}
              <Button variant="danger" type="submit" disabled={cancelSubmitting}>
                {cancelSubmitting ? t('Bekor qilinmoqda...') : t('Bekor qilishni tasdiqlash')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default OrdersPage;
