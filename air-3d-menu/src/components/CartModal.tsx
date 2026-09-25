import React from 'react';
import { CartItem, Dish, Language, Currency } from '../types';
import { translations } from '../data/translations';
import { CROSS_SELL_ITEMS } from '../data/mockData';
import { formatPrice } from '../utils/formatters';
import { X, Plus, Minus, Trash2, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface CartModalProps {
  isOpen: boolean;
  items: CartItem[];
  lang: Language;
  currency?: Currency;
  orderNote: string;
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
  onSetOrderNote: (note: string) => void;
  onAddCrossSell: (dish: Dish) => void;
  onSubmitOrder: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  items,
  lang,
  currency = 'UZS',
  orderNote,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateComment,
  onSetOrderNote,
  onAddCrossSell,
  onSubmitOrder
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, it) => sum + it.dish.price * it.quantity, 0);
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Drawer */}
      <div
        id="cart-sheet"
        className="relative w-full max-w-lg bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-[28px] shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text)]">{t.cartTitle}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FBEDE8] text-[#C75B39] dark:bg-[#2A1810]">
              {items.reduce((s, it) => s + it.quantity, 0)} dona
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FBEDE8] dark:bg-[#2A1810] text-[#C75B39] flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)]">{t.cartEmpty}</h3>
              <p className="text-sm text-[var(--text-soft)]">{t.cartEmptyDesc}</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 h-11 rounded-xl bg-[#C75B39] text-white font-medium text-sm inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {t.cartBackToMenu}
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] space-y-2.5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.dish.imageUrl}
                        alt={item.dish.name[lang]}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-[var(--bg)]"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-semibold text-sm text-[var(--text)] line-clamp-1 leading-snug">
                            {item.dish.name[lang]}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-[#DC2626] transition-colors cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-sm font-bold text-[var(--text)] mt-1 num">
                          {(item.dish.price * item.quantity).toLocaleString()} {t.currency}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Stepper & Per-item note */}
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60">
                      {/* Stepper matching Section 10.5: [−] 40px, [qty] 44px, [+] 40px */}
                      <div className="flex items-center border border-[var(--border)] rounded-xl bg-[var(--bg-card)] overflow-hidden">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-9 h-9 flex items-center justify-center text-[var(--text-soft)] hover:bg-[var(--bg-soft)] disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-[var(--text)] num">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-9 h-9 flex items-center justify-center text-[var(--text-soft)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom note trigger */}
                      <input
                        type="text"
                        placeholder={t.itemNotePlaceholder}
                        value={item.comment || ''}
                        onChange={e => onUpdateComment(item.id, e.target.value)}
                        className="flex-1 max-w-[190px] h-9 px-3 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] focus:border-[#C75B39] focus:outline-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Cross-sell row: Section 11.3 "💡 Bularni ham oling" */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-[var(--text-soft)] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                  {t.crossSellTitle}
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {CROSS_SELL_ITEMS.map(cs => {
                    const alreadyInCart = items.some(it => it.dish.id === cs.id);
                    return (
                      <button
                        key={cs.id}
                        onClick={() => onAddCrossSell(cs)}
                        disabled={alreadyInCart}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] hover:border-[#C75B39] transition-all text-left cursor-pointer disabled:opacity-50"
                      >
                        <img src={cs.imageUrl} alt={cs.name[lang]} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="text-xs font-semibold text-[var(--text)] line-clamp-1">{cs.name[lang]}</p>
                          <p className="text-[11px] text-[#C75B39] font-bold num">+{cs.price.toLocaleString()} {t.currency}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overall Note input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-soft)] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t.orderNoteLabel}
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={e => onSetOrderNote(e.target.value)}
                  placeholder={t.orderNotePlaceholder}
                  className="w-full h-11 px-3.5 text-sm rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text)] focus:border-[#C75B39] focus:outline-hidden"
                />
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] space-y-2 text-sm">
                <div className="flex justify-between text-[var(--text-soft)]">
                  <span>{t.subtotal}</span>
                  <span className="font-semibold text-[var(--text)] num">{formatPrice(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-soft)]">
                  <span>{t.serviceFee}</span>
                  <span className="font-semibold text-[var(--text)] num">{formatPrice(serviceFee, currency)}</span>
                </div>
                <div className="pt-2 border-t border-[var(--border)] flex justify-between items-baseline">
                  <span className="font-bold text-base text-[var(--text)]">{t.total}</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#C75B39] num">
                      {formatPrice(total, currency)}
                    </span>
                    {currency !== 'UZS' && (
                      <span className="block text-xs text-[var(--text-muted)] num">
                        ({total.toLocaleString()} so'm)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Submit Button */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
            <motion.button
              id="btn-confirm-order"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onSubmitOrder}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#E07A52] hover:brightness-105 active:brightness-95 text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{t.submitOrder}</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};
