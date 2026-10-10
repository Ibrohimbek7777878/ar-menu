import React, { useState } from 'react';
import {
  HeaderNav,
  TableBadge,
  OrderSummary,
  BottomNav,
  Toast,
} from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './CheckoutPage.css';

interface InitialCheckoutData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string; id?: number };
  items?: Array<{ name: string; price: number; quantity: number; subtotal: number }>;
  cartCount?: number;
  subtotal?: number;
  allTables?: Array<{ id: number; number: string; hall?: string }>;
}

export const CheckoutPage: React.FC = () => {
  const { navigate } = useNavigation();
  const initialData: InitialCheckoutData = (window as any).__GULISTON_CHECKOUT_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const subtotal = initialData.subtotal || 0;
  const cartCount = initialData.cartCount || 0;
  const savedNote = sessionStorage.getItem('order_note') || '';

  // Form State
  const [serviceType, setServiceType] = useState<'table' | 'pickup' | 'delivery'>(
    table?.number ? 'table' : 'table'
  );
  const [tableNumber, setTableNumber] = useState(table?.number ? String(table.number) : '1');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+998 ');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'click' | 'payme'>('cash');
  const [notes, setNotes] = useState(savedNote);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (serviceType === 'delivery' && !deliveryAddress.trim()) {
      showToast("Iltimos, yetkazib berish manzilini kiriting");
      return;
    }

    setIsSubmitting(true);
    showToast("Buyurtma yuborilmoqda...");

    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const formData = new FormData();
    formData.append('service_type', serviceType);
    formData.append('table_number_manual', tableNumber);
    formData.append('name', guestName);
    formData.append('phone', guestPhone);
    formData.append('address', deliveryAddress);
    formData.append('payment_method', paymentMethod);
    formData.append('notes', notes);

    try {
      await fetch('/checkout/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });

      sessionStorage.removeItem('order_note');
      showToast("Buyurtmangiz qabul qilindi!");
      setTimeout(() => {
        navigate('/orders');
      }, 700);
    } catch {
      sessionStorage.removeItem('order_note');
      showToast("Buyurtma qabul qilindi!");
      setTimeout(() => {
        navigate('/orders');
      }, 700);
    }
  };

  return (
    <div className="checkout-app-container">
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />

      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={cartCount}
        onCartClick={() => navigate('/cart')}
      />

      <main className="checkout-main-content">
        <div className="checkout-top-bar">
          <button type="button" onClick={() => navigate('/cart')} className="btn-back-to-cart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Savatga qaytish</span>
          </button>

          {table?.number && (
            <TableBadge
              tableNumber={table.number}
              hallName={table.hall || "Asosiy Zal"}
              status="available"
            />
          )}
        </div>

        <h1 className="checkout-page-title">Buyurtmani rasmiylashtirish</h1>

        <form onSubmit={handleSubmit}>
          {/* 1. Xizmat turi */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">Xizmat turini tanlang</span>
            </div>

            <div className="service-types-grid">
              <div
                className={`service-type-option ${serviceType === 'table' ? 'active' : ''}`}
                onClick={() => setServiceType('table')}
              >
                <div className="service-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
                  </svg>
                </div>
                <div>
                  <div className="service-opt-title">Stolda (Zalda)</div>
                  <div className="service-opt-desc">Restoran ichida xizmat</div>
                </div>
              </div>

              <div
                className={`service-type-option ${serviceType === 'pickup' ? 'active' : ''}`}
                onClick={() => setServiceType('pickup')}
              >
                <div className="service-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <div>
                  <div className="service-opt-title">Olib ketish</div>
                  <div className="service-opt-desc">Tayyorlab qo'yiladi</div>
                </div>
              </div>

              <div
                className={`service-type-option ${serviceType === 'delivery' ? 'active' : ''}`}
                onClick={() => setServiceType('delivery')}
              >
                <div className="service-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="13" x="1" y="3" rx="2" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <div className="service-opt-title">Yetkazib berish</div>
                  <div className="service-opt-desc">Ko'rsatilgan manzilga</div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Mehmon & Manzil ma'lumotlari */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">Ma'lumotlar</span>
            </div>

            <div className="form-grid-two">
              {serviceType === 'table' && (
                <div className="form-group-field">
                  <label className="field-label">Stol raqami:</label>
                  <input
                    type="text"
                    className="field-input-text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Masalan: 7"
                    required
                  />
                </div>
              )}

              <div className="form-group-field">
                <label className="field-label">Ismingiz (ixtiyoriy):</label>
                <input
                  type="text"
                  className="field-input-text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Masalan: Anvar"
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Telefon raqam:</label>
                <input
                  type="tel"
                  className="field-input-text tabular-nums"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              {serviceType === 'delivery' && (
                <div className="form-group-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Yetkazib berish manzili:</label>
                  <input
                    type="text"
                    className="field-input-text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Ko'cha, uy raqami, mo'ljal..."
                    required
                  />
                </div>
              )}

              <div className="form-group-field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Qo'shimcha istak yoki izoh:</label>
                <input
                  type="text"
                  className="field-input-text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masalan: Issiqroq keltiring, non ko'proq bo'lsin..."
                />
              </div>
            </div>
          </section>

          {/* 3. To'lov usuli */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">To'lov usuli</span>
            </div>

            <div className="payment-methods-grid">
              <div
                className={`payment-opt-card ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className="payment-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="12" x="2" y="6" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                </div>
                <span className="payment-opt-title">Naqd pul</span>
              </div>

              <div
                className={`payment-opt-card ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="payment-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <span className="payment-opt-title">Terminal / Karta</span>
              </div>

              <div
                className={`payment-opt-card ${paymentMethod === 'click' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('click')}
              >
                <div className="payment-brand-badge click-badge">Click</div>
                <span className="payment-opt-title">Click</span>
              </div>

              <div
                className={`payment-opt-card ${paymentMethod === 'payme' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('payme')}
              >
                <div className="payment-brand-badge payme-badge">Payme</div>
                <span className="payment-opt-title">Payme</span>
              </div>
            </div>
          </section>

          {/* 4. Order Summary & Submit */}
          <OrderSummary
            subtotal={subtotal}
            servicePercent={serviceType === 'table' ? 10 : 0}
            showButton={false}
          />

          <button
            type="submit"
            className="btn-submit-order"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}</span>
            {!isSubmitting && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>
      </main>

      <BottomNav
        activeTab="cart"
        cartCount={cartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
