import React, { useState, useEffect } from 'react';
import { Order, Language, Currency } from '../types';
import { translations } from '../data/translations';
import { formatPrice } from '../utils/formatters';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bell, 
  CreditCard, 
  Plus, 
  Star, 
  QrCode, 
  Send,
  Sparkles,
  Check,
  Receipt
} from 'lucide-react';
import { motion } from 'motion/react';

interface OrderStatusModalProps {
  order: Order;
  lang: Language;
  currency?: Currency;
  onClose: () => void;
  onOrderMore: () => void;
  onCallWaiter: (type: 'waiter' | 'bill' | 'water') => void;
  onPayOrder: (method: 'payme' | 'click' | 'uzum' | 'cash', tip: number) => void;
  onSubmitReview: (rating: number, comment: string) => void;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  order,
  lang,
  currency = 'UZS',
  onClose,
  onOrderMore,
  onCallWaiter,
  onPayOrder,
  onSubmitReview
}) => {
  const t = translations[lang];
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'payme' | 'click' | 'uzum' | 'cash'>('payme');
  const [selectedTipPct, setSelectedTipPct] = useState<number>(10);
  const [customTip, setCustomTip] = useState<string>('');
  const [showFiscal, setShowFiscal] = useState(false);
  const [starRating, setStarRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);

  // Status index: 0 = new, 1 = cooking, 2 = ready, 3 = delivered
  const statusSteps = ['new', 'cooking', 'ready', 'delivered'] as const;
  const currentStepIndex = statusSteps.indexOf(order.status as any);

  const steps = [
    { key: 'new', label: t.stepReceived, icon: Clock },
    { key: 'cooking', label: t.stepCooking, icon: ChefHat },
    { key: 'ready', label: t.stepReady, icon: Sparkles },
    { key: 'delivered', label: t.stepDelivered, icon: CheckCircle2 }
  ];

  const calculatedTip = customTip ? parseInt(customTip) || 0 : Math.round((order.total * selectedTipPct) / 100);
  const grandTotalWithTip = order.total + calculatedTip;

  const handleCall = (type: 'waiter' | 'bill' | 'water') => {
    onCallWaiter(type);
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div 
        id="order-status-card"
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-soft)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[var(--text)]">{order.id}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B4B73] text-[#FDFBF7]">
                {t.table} {order.tableNumber}
              </span>
            </div>
            <p className="text-xs text-[var(--text-soft)] mt-0.5">
              Ofitsiant: {order.waiterName || 'Dilshod'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Visual Step Progress Tracker */}
          <div className="relative">
            {/* Connecting Bar */}
            <div className="absolute top-4 left-6 right-6 h-1 bg-[var(--border)] -z-0">
              <div 
                className="h-full bg-[#16A34A] transition-all duration-500"
                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            <div className="flex justify-between relative z-10">
              {steps.map((st, i) => {
                const Icon = st.icon;
                const isPassed = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;

                return (
                  <div key={st.key} className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        isPassed
                          ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-xs'
                          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
                      } ${isCurrent ? 'ring-4 ring-[#16A34A]/20 scale-110' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-semibold mt-2 text-center max-w-[70px] leading-tight ${
                      isPassed ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Remaining Notice */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            order.status === 'ready'
              ? 'bg-[#E8F8EE] border-[#16A34A] dark:bg-[#122A1C] text-[#16A34A] animate-pulse'
              : 'bg-[var(--bg-soft)] border-[var(--border)] text-[var(--text)]'
          }`}>
            {order.status === 'ready' ? (
              <div>
                <p className="font-bold text-base sm:text-lg">🎉 {t.tableReady}</p>
                <p className="text-xs text-[var(--text-soft)] mt-0.5">Ofitsiantingiz taomni olib bormoqda</p>
              </div>
            ) : order.status === 'delivered' ? (
              <div>
                <p className="font-bold text-base text-[#16A34A]">✓ Yoqimli ishtaha!</p>
                <p className="text-xs text-[var(--text-soft)] mt-0.5">Taom stolingizga yetkazildi</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-[#C75B39]" />
                <span className="text-sm font-semibold text-[var(--text)]">
                  {t.estRemaining.replace('{min}', String(order.estimatedMinutes || 12))}
                </span>
              </div>
            )}
          </div>

          {/* Order Item List */}
          <div className="p-4 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] space-y-2.5">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Buyurtma qilingan taomlar
            </h4>
            <div className="divide-y divide-[var(--border)]">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-[var(--text)]">{it.dish.name[lang]}</span>
                    <span className="text-xs text-[var(--text-soft)] ml-2">× {it.quantity}</span>
                    {it.comment && (
                      <p className="text-xs text-[#D97706] italic">"{it.comment}"</p>
                    )}
                  </div>
                  <span className="font-semibold text-[var(--text)] num">
                    {formatPrice(it.dish.price * it.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex justify-between items-baseline font-bold">
              <span className="text-sm text-[var(--text)]">{t.total}:</span>
              <div className="text-right">
                <span className="text-lg text-[#C75B39] num">
                  {formatPrice(order.total, currency)}
                </span>
                {currency !== 'UZS' && (
                  <span className="block text-[10px] text-[var(--text-muted)] num">
                    ({order.total.toLocaleString()} so'm)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Call waiter / Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCall('waiter')}
              className={`h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                waiterCalled
                  ? 'bg-[#16A34A] text-white border-[#16A34A]'
                  : 'bg-[var(--bg-soft)] hover:bg-[#FBEDE8] text-[var(--text)] border-[var(--border)]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#C75B39]" />
              <span>{waiterCalled ? 'Chaqirildi ✓' : t.callWaiter}</span>
            </button>

            <button
              onClick={() => handleCall('water')}
              className="h-11 rounded-xl bg-[var(--bg-soft)] hover:bg-[#E8F0F7] text-[var(--text)] border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>💧 {t.requestWater}</span>
            </button>

            <button
              onClick={onOrderMore}
              className="h-11 rounded-xl bg-[var(--bg-soft)] hover:bg-[#FBEDE8] text-[var(--text)] border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C75B39]" />
              <span>{t.orderMore}</span>
            </button>
          </div>

          {/* Payment & Fiscal Section */}
          <div className="pt-2 border-t border-[var(--border)]">
            {order.paymentStatus === 'paid' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#E8F8EE] dark:bg-[#122A1C] border border-[#16A34A]/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#16A34A]" />
                    <span className="font-bold text-sm text-[#16A34A]">{t.paySuccess}</span>
                  </div>
                  <button
                    onClick={() => setShowFiscal(true)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1A1714] text-xs font-bold text-[#1B4B73] border border-[var(--border)] flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Fiskal Chek</span>
                  </button>
                </div>

                {/* Rating & Review prompt */}
                {!reviewSubmitted ? (
                  <div className="p-4 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] space-y-3">
                    <p className="font-semibold text-xs text-[var(--text)]">{t.rateExperience}</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setStarRating(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star className={`w-6 h-6 ${star <= starRating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[var(--text-muted)]'}`} />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Izohingiz (ixtiyoriy)..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)]"
                    />
                    <button
                      onClick={() => {
                        onSubmitReview(starRating, reviewComment);
                        setReviewSubmitted(true);
                      }}
                      className="w-full h-10 rounded-xl bg-[#1B4B73] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      {t.submitReview}
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-xs font-medium text-[#16A34A]">✓ {t.reviewThanks}</p>
                )}
              </div>
            ) : !showPayment ? (
              <button
                id="btn-open-payment"
                onClick={() => setShowPayment(true)}
                className="w-full h-14 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                <CreditCard className="w-5 h-5" />
                <span>{t.payNow} ({order.total.toLocaleString()} {t.currency})</span>
              </button>
            ) : (
              /* Payment Methods + Tips Drawer */
              <div className="space-y-4 p-4 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)]">
                <h4 className="font-bold text-sm text-[var(--text)]">{t.paySelectTitle}</h4>

                {/* Methods */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'payme', label: 'Payme', color: 'border-[#00CCCC]' },
                    { id: 'click', label: 'Click', color: 'border-[#0070BA]' },
                    { id: 'uzum', label: 'Uzum', color: 'border-[#7C3AED]' },
                    { id: 'cash', label: 'Naqd', color: 'border-[var(--border)]' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id as any)}
                      className={`h-12 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                        selectedMethod === m.id
                          ? 'bg-[var(--bg-card)] text-[#C75B39] border-[#C75B39] shadow-xs'
                          : 'bg-[var(--bg-card)] text-[var(--text-soft)] border-[var(--border)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Tips */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--text-soft)]">{t.tipTitle}</span>
                  <div className="flex gap-2">
                    {[0, 5, 10, 15].map(pct => (
                      <button
                        key={pct}
                        onClick={() => {
                          setSelectedTipPct(pct);
                          setCustomTip('');
                        }}
                        className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          selectedTipPct === pct && !customTip
                            ? 'bg-[#C75B39] text-white border-[#C75B39]'
                            : 'bg-[var(--bg-card)] text-[var(--text)] border-[var(--border)]'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total + Pay Button */}
                <div className="pt-2 border-t border-[var(--border)] space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-[var(--text-soft)]">Jami to'lov (choychaqa bilan):</span>
                    <span className="text-xl font-bold text-[#C75B39] num">
                      {grandTotalWithTip.toLocaleString()} {t.currency}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPayment(false)}
                      className="px-4 h-12 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-soft)] cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                    <button
                      id="btn-confirm-payment"
                      onClick={() => {
                        onPayOrder(selectedMethod, calculatedTip);
                        setShowPayment(false);
                      }}
                      className="flex-1 h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                    >
                      {selectedMethod.toUpperCase()} orqali to'lash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OFD / UZKASSA Fiscal Receipt Modal */}
      {showFiscal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-2xl shadow-2xl font-mono text-xs space-y-3">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm tracking-wider">REST-REGISTON MCHJ</h3>
              <p>Toshkent sh., Chilonzor tumani</p>
              <p>STIR: 308942115 · OFD: UZKASSA</p>
              <p className="border-b border-black/20 pb-2">FISKAL CHEK № {order.id.replace('#', '')}-2026</p>
            </div>

            <div className="space-y-1 divide-y divide-dashed divide-black/30">
              {order.items.map((it, idx) => (
                <div key={idx} className="pt-1 flex justify-between">
                  <span>{it.quantity} × {it.dish.name.uz.slice(0, 18)}</span>
                  <span>{(it.dish.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t-2 border-black space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>JAMI SO'M:</span>
                <span>{order.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>QQS (12%):</span>
                <span>{Math.round(order.total * 0.12).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>IKPU KODI:</span>
                <span>05610001001000000</span>
              </div>
            </div>

            {/* Fiscal QR Matrix Simulation */}
            <div className="py-2 flex flex-col items-center">
              <div className="w-28 h-28 bg-black flex items-center justify-center text-white rounded-md p-2">
                <QrCode className="w-full h-full text-white" />
              </div>
              <span className="text-[10px] text-gray-600 mt-1">soliq.uz orqali tekshirish</span>
            </div>

            <button
              onClick={() => setShowFiscal(false)}
              className="w-full h-10 rounded-lg bg-black text-white font-bold text-xs cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
