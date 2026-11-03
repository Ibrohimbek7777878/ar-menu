import React, { useRef, useState } from 'react';
import {
  HeaderNav,
  TableBadge,
  OrderSummary,
  BottomNav,
  Toast,
} from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { getGuestDesign } from '../../utils/guestDesign';
import { bounceIcon, celebrateOrder, fxEnabled, setButtonState } from '../../motion';
import { fmtMoney, fmtNum, getLang, t, tr } from '../../i18n';
import { dishName } from '../../utils/dishText';
import './CheckoutPage.css';

interface InitialCheckoutData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string; id?: number };
  items?: Array<{ name: string; name_ru?: string; name_en?: string; price: number; quantity: number; subtotal: number }>;
  cartCount?: number;
  subtotal?: number;
  allTables?: Array<{ id: number; number: string; hall?: string }>;
  // Restoran hozir buyurtma qabul qiladimi (server hal qiladi: "yopiq" tugmasi, ish vaqti, xizmat turi)
  orderGate?: { open: boolean; code: string; message: string };
  minOrder?: number;
  onlinePayment?: boolean;
}

// Buyurtma kaliti: qo'sh bosish yoki tarmoq qayta urinishi ikkinchi buyurtma yaratmasligi uchun (server shu kalit bo'yicha takrorni tanib oladi)
const newSubmissionId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

const SUBMIT_TIMEOUT_MS = 20000;

/**
 * Serverdan keladigan xabar: qiymat qo'shilgan turlari (tugagan taomlar, ish vaqti, minimal summa) tarjima shabloniga solinadi,
 * qolganlari oddiy kalit sifatida tarjima qilinadi (lug'atda yo'q bo'lsa o'zbekcha ko'rinadi).
 */
function serverText(message: string): string {
  let m = message.match(/^Quyidagi taomlar hozir tugagan: (.+)\. Savat yangilandi — buyurtmani qayta tasdiqlang\.$/);
  if (m) return t('Quyidagi taomlar hozir tugagan: {names}. Savat yangilandi — buyurtmani qayta tasdiqlang.', { names: m[1] });
  m = message.match(/^Restoran hozir yopiq\. Ish vaqti: (.+)\.$/);
  if (m) return t('Restoran hozir yopiq. Ish vaqti: {hours}.', { hours: m[1] });
  m = message.match(/^Yetkazib berish uchun buyurtma kamida ([\d\s]+) so'm bo'lishi kerak\.$/);
  if (m) return t("Yetkazib berish uchun buyurtma kamida {sum} bo'lishi kerak.", { sum: fmtMoney(Number(m[1].replace(/\s/g, ''))) });
  return t(message);
}

export const CheckoutPage: React.FC = () => {
  const { navigate, clearCart } = useNavigation();
  const initialData: InitialCheckoutData = (window as any).__GULISTON_CHECKOUT_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const items = initialData.items || [];
  const isNewDesign = getGuestDesign() === 'new';
  const subtotal = initialData.subtotal || 0;
  const cartCount = initialData.cartCount || 0;
  const savedNote = sessionStorage.getItem('order_note') || '';
  const submissionId = useRef(newSubmissionId());
  const isClosed = initialData.orderGate ? !initialData.orderGate.open : false;
  const closedMessage = initialData.orderGate?.message || tr('Restoran hozir buyurtma qabul qilmayapti.');
  const onlinePayment = initialData.onlinePayment === true;

  // Form State
  const [serviceType, setServiceType] = useState<'table' | 'pickup' | 'delivery'>(
    table?.number ? 'table' : 'table'
  );
  const [tableNumber, setTableNumber] = useState(table?.number ? String(table.number) : '');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+998 ');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'click' | 'payme'>('cash');
  const [notes, setNotes] = useState(savedNote);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

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

  /** Xato bo'lsa tugma qisqa qizarib silkinadi, so'ng qayta bosishga tayyor bo'ladi (ko'rinish; mantiq o'zgarmaydi). */
  const flashSubmitError = () => {
    setButtonState(submitRef.current, 'error');
    window.setTimeout(() => setButtonState(submitRef.current, 'idle'), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isClosed) {
      showToast(serverText(closedMessage));
      return;
    }

    if (serviceType === 'delivery' && !deliveryAddress.trim()) {
      showToast(t("Iltimos, yetkazib berish manzilini kiriting"));
      return;
    }

    const minOrder = initialData.minOrder || 0;
    if (serviceType === 'delivery' && minOrder > 0 && subtotal < minOrder) {
      showToast(t("Yetkazib berish uchun buyurtma kamida {sum} bo'lishi kerak", { sum: fmtMoney(minOrder) }));
      return;
    }

    if (items.length === 0) {
      showToast(t("Savatingiz bo'sh. Avval menyudan taom tanlang."));
      return;
    }

    setIsSubmitting(true);
    setButtonState(submitRef.current, 'loading');
    showToast(t("Buyurtma yuborilmoqda..."));

    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const formData = new FormData();
    formData.append('service_type', serviceType);
    formData.append('table_number_manual', tableNumber);
    formData.append('name', guestName);
    formData.append('phone', guestPhone.trim() === '+998' ? '' : guestPhone);
    formData.append('address', deliveryAddress);
    formData.append('payment_method', paymentMethod);
    formData.append('notes', notes);
    formData.append('submission_id', submissionId.current);
    // Telegram imzolagan initData (faqat Mini App ichida bo'ladi); server uni tekshiradi, oddiy telegram_id'ga ishonmaydi
    const tgInitData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    if (tgInitData) formData.append('init_data', tgInitData);

    // Bitta so'rov: buyurtmani server yaratadi (narx va taomlar serverdagi savatdan). Avval buyurtma
    // ikki marta (lokal createOrder + form POST) yaratilardi va xatoda ham "qabul qilindi" deyilardi.
    // Javob 20 soniyada kelmasa so'rov to'xtatiladi: tugma abadiy "Yuborilmoqda..." da qotib qolmasin
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const res = await fetch('/checkout/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Kalit boshqa sessiyaniki bo'lib qolsa, yangisini olamiz; boshqa xatolarda kalit o'sha qoladi (qayta urinish xavfsiz)
        if (data?.code === 'submission_conflict') submissionId.current = newSubmissionId();
        showToast(data?.error ? serverText(String(data.error)) : t("Buyurtmani yuborib bo'lmadi. Qayta urinib ko'ring."));
        setIsSubmitting(false);
        flashSubmitError();
        return;
      }

      sessionStorage.removeItem('order_note');
      clearCart();
      showToast(t("Buyurtmangiz qabul qilindi!"));
      setButtonState(submitRef.current, 'success');
      void celebrateOrder(submitRef.current);
      // Kutlov ko'rinib ulgursin: animatsiya yoqilgan bo'lsa yo'naltirish biroz kechikadi (o'chiq bo'lsa avvalgidek)
      setTimeout(() => {
        window.location.assign(data.redirect || '/orders/');
      }, fxEnabled() ? 1900 : 600);
    } catch {
      window.clearTimeout(timer);
      // Buyurtma serverga yetib borgan bo'lishi mumkin. Kalit o'zgarmaydi: qayta yuborsangiz ikkinchi buyurtma yaratilmaydi.
      showToast(t("Aloqa uzildi. Qayta yuboring: buyurtma ikki marta yaratilmaydi."));
      setIsSubmitting(false);
      flashSubmitError();
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
            <span>{t('Savatga qaytish')}</span>
          </button>

          {table?.number && (
            <TableBadge
              tableNumber={table.number}
              hallName={table.hall ? t(table.hall) : t("Asosiy Zal")}
              status="available"
            />
          )}
        </div>

        <h1 className="checkout-page-title">{t('Buyurtmani rasmiylashtirish')}</h1>

        <form onSubmit={handleSubmit}>
          {/* 1. Xizmat turi */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">{t('Xizmat turini tanlang')}</span>
            </div>

            <div className="service-types-grid">
              <div
                className={`service-type-option ${serviceType === 'table' ? 'active' : ''}`}
                onClick={(e) => { setServiceType('table'); bounceIcon(e.currentTarget.querySelector('.service-opt-icon')); }}
              >
                <div className="service-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
                  </svg>
                </div>
                <div>
                  <div className="service-opt-title">{t('Stolda (Zalda)')}</div>
                  <div className="service-opt-desc">{t('Restoran ichida xizmat')}</div>
                </div>
              </div>

              <div
                className={`service-type-option ${serviceType === 'pickup' ? 'active' : ''}`}
                onClick={(e) => { setServiceType('pickup'); bounceIcon(e.currentTarget.querySelector('.service-opt-icon')); }}
              >
                <div className="service-opt-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <div>
                  <div className="service-opt-title">{t('Olib ketish')}</div>
                  <div className="service-opt-desc">{t("Tayyorlab qo'yiladi")}</div>
                </div>
              </div>

              <div
                className={`service-type-option ${serviceType === 'delivery' ? 'active' : ''}`}
                onClick={(e) => { setServiceType('delivery'); bounceIcon(e.currentTarget.querySelector('.service-opt-icon')); }}
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
                  <div className="service-opt-title">{t('Yetkazib berish')}</div>
                  <div className="service-opt-desc">{t("Ko'rsatilgan manzilga")}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 1b. Buyurtma tarkibi: faqat yangi dizaynda (maket); hisob-kitob va yuborish mantig'i o'zgarmagan */}
          {isNewDesign && items.length > 0 && (
            <section className="checkout-section-card">
              <div className="checkout-section-head">
                <span className="section-head-title">{t('Buyurtmangiz')}</span>
              </div>
              <ul className="checkout-items-list">
                {items.map((it, i) => (
                  <li key={`${it.name}-${i}`} className="checkout-item-row">
                    <span className="checkout-item-avatar" aria-hidden="true">{(dishName(it, getLang()) || '?').charAt(0).toUpperCase()}</span>
                    <span className="checkout-item-info">
                      <span className="checkout-item-name">{dishName(it, getLang())}</span>
                      <span className="checkout-item-qty tabular-nums">
                        {it.quantity} × {fmtMoney(it.price)}
                      </span>
                    </span>
                    <span className="checkout-item-total tabular-nums">{fmtNum(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 2. Mehmon & Manzil ma'lumotlari */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">{t("Ma'lumotlar")}</span>
            </div>

            <div className="form-grid-two">
              {serviceType === 'table' && (
                <div className="form-group-field">
                  <label className="field-label">{t('Stol raqami:')}</label>
                  <input
                    type="text"
                    className="field-input-text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder={t('Masalan: 7')}
                    required
                  />
                </div>
              )}

              <div className="form-group-field">
                <label className="field-label">{t('Ismingiz (ixtiyoriy):')}</label>
                <input
                  type="text"
                  className="field-input-text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('Masalan: Anvar')}
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">{t('Telefon raqam:')}</label>
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
                  <label className="field-label">{t('Yetkazib berish manzili:')}</label>
                  <input
                    type="text"
                    className="field-input-text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={t("Ko'cha, uy raqami, mo'ljal...")}
                    required
                  />
                </div>
              )}

              <div className="form-group-field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">{t("Qo'shimcha istak yoki izoh:")}</label>
                <input
                  type="text"
                  className="field-input-text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("Masalan: Issiqroq keltiring, non ko'proq bo'lsin...")}
                />
              </div>
            </div>
          </section>

          {/* 3. To'lov usuli */}
          <section className="checkout-section-card">
            <div className="checkout-section-head">
              <span className="section-head-title">{t("To'lov usuli")}</span>
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
                <span className="payment-opt-title">{t('Naqd pul')}</span>
              </div>

              {/* Onlayn to'lov hozir yo'q (egasi qarori): karta/Click/Payme faqat server yoqsa ko'rinadi */}
              {onlinePayment && (
                <>
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
                <span className="payment-opt-title">{t('Terminal / Karta')}</span>
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
                </>
              )}
            </div>
          </section>

          {/* 4. Order Summary & Submit */}
          <OrderSummary
            subtotal={subtotal}
            servicePercent={0}  // xizmat haqi olinmaydi (TZ qarori Q2); server ham 0% hisoblaydi
            showButton={false}
          />

          <button
            type="submit"
            ref={submitRef}
            className="btn-submit-order"
            disabled={isSubmitting || items.length === 0 || isClosed}
          >
            <span>{isClosed ? t('Restoran hozir yopiq') : isSubmitting ? t('Yuborilmoqda...') : t('Buyurtmani tasdiqlash')}</span>
            {!isSubmitting && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
          {isClosed && <p role="alert">{serverText(closedMessage)}</p>}
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
