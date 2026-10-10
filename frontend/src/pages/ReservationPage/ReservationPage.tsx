import React, { useState } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './ReservationPage.css';

export interface ReservationInfo {
  id?: number;
  code: string;
  customer_name: string;
  customer_phone?: string;
  table_number: string | number;
  reservation_time: string;
  guests_count: number;
  hall?: string;
  status?: string;
}

interface InitialReservationData {
  shop?: { name: string };
  mode?: 'find' | 'arrival';
  reservation?: ReservationInfo;
  query?: string;
  cartCount?: number;
}

export const ReservationPage: React.FC = () => {
  const { navigate, cartCount: navCartCount } = useNavigation();
  const initialData: InitialReservationData = (window as any).__GULISTON_RESERVATION_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const defaultMode = window.location.pathname.includes('/arrival') ? 'arrival' : (initialData.mode || 'find');

  const defaultReservation: ReservationInfo = initialData.reservation || {
    code: 'GS-2841',
    customer_name: 'Muhayyo Karimova',
    customer_phone: '+998 90 123 45 67',
    table_number: '08',
    reservation_time: '19:30',
    guests_count: 4,
    hall: 'Registon Zali',
    status: 'Tasdiqlangan',
  };

  const [mode, setMode] = useState<'find' | 'arrival'>(defaultMode);
  const [searchTab, setSearchTab] = useState<'code' | 'phone'>('code');
  const [query, setQuery] = useState(initialData.query || '');
  const [foundReservation] = useState<ReservationInfo | null>(defaultReservation);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      showToast('Qidirish uchun kod yoki telefon kiriting');
      return;
    }
    navigate(`/reservation/find/?q=${encodeURIComponent(query.trim())}`);
  };

  const handleConfirmArrival = (tableNum: string | number) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/reservation/arrival/';

    const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrf;
    form.appendChild(csrfInput);

    const tableInput = document.createElement('input');
    tableInput.type = 'hidden';
    tableInput.name = 'table';
    tableInput.value = String(tableNum);
    form.appendChild(tableInput);

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="react-reservation-page">
      {/* ─── Header Navigation ─── */}
      <HeaderNav
        brandName={shopName}
        cartCount={navCartCount || initialData.cartCount || 0}
        onCartClick={() => navigate('/cart/')}
      />

      <main className="reservation-main-content">
        {/* ─── Mode Switch ─── */}
        <div className="res-mode-switcher">
          <button
            type="button"
            className={`mode-btn ${mode === 'arrival' ? 'active' : ''}`}
            onClick={() => setMode('arrival')}
          >
            Kelishni tasdiqlash
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'find' ? 'active' : ''}`}
            onClick={() => setMode('find')}
          >
            Bronni qidirish
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            MODE 1: KELISHNI TASDIQLASH (ARRIVAL CONFIRM)
           ══════════════════════════════════════════════════════ */}
        {mode === 'arrival' && (
          <div className="arrival-view">
            <div className="arrival-hero-card">
              <span className="res-badge">Tashrif qaydnomasi</span>
              <h1 className="arrival-title serif">
                {foundReservation?.customer_name || 'Hurmatli Mehmon'},<br />
                Stolingiz tayyor!
              </h1>
              <p className="arrival-desc">
                Tashrifingiz tizimda qayd etildi. Quyidagi tugma orqali stol menyusiga o'tib, taomlarni buyurtma qiling.
              </p>
            </div>

            {/* Guest & Table Card */}
            <div className="arrival-detail-card">
              <div className="arrival-card-top">
                <div className="arrival-table-circle">
                  <span className="circle-kicker">Stol</span>
                  <strong className="circle-num tabular-nums">
                    {foundReservation?.table_number || '08'}
                  </strong>
                </div>

                <div className="arrival-meta-right">
                  <span className="res-code-badge tabular-nums">
                    KOD: #{foundReservation?.code || 'GS-2841'}
                  </span>
                  <strong className="arrival-guest-name">
                    {foundReservation?.customer_name || 'Muhayyo Karimova'}
                  </strong>
                  <span className="arrival-hall-name">
                    {foundReservation?.hall || 'Registon Zali'}
                  </span>
                </div>
              </div>

              <div className="arrival-info-grid">
                <div className="info-box">
                  <span className="info-box-label">Belgilangan vaqt</span>
                  <strong className="info-box-val tabular-nums">
                    {foundReservation?.reservation_time || '19:30'}
                  </strong>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Mehmonlar soni</span>
                  <strong className="info-box-val tabular-nums">
                    {foundReservation?.guests_count || 4} kishi
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="btn-confirm-and-menu"
                onClick={() => handleConfirmArrival(foundReservation?.table_number || '08')}
              >
                <span>Stol menyusini ochish</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="arrival-extra-actions">
              <a href="/table/" className="extra-link">
                Boshqa stollarni ko'rish
              </a>
              <span className="extra-sep">•</span>
              <button
                type="button"
                className="extra-btn"
                onClick={() => setMode('find')}
              >
                Boshqa bron kodi bilan qidirish
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            MODE 2: BRONNI QIDIRISH (FIND RESERVATION)
           ══════════════════════════════════════════════════════ */}
        {mode === 'find' && (
          <div className="find-view">
            <div className="find-header">
              <span className="res-badge">Bron holati</span>
              <h1 className="find-title serif">
                Broningizni tekshiring
              </h1>
              <p className="find-desc">
                Bron kodi (masalan, GS-2841) yoki ro'yxatdan o'tgan telefon raqamingizni kiriting.
              </p>
            </div>

            <form className="find-search-card" onSubmit={handleSearch}>
              <div className="search-tab-bar">
                <button
                  type="button"
                  className={`search-tab-btn ${searchTab === 'code' ? 'active' : ''}`}
                  onClick={() => setSearchTab('code')}
                >
                  Bron kodi (GS-2841)
                </button>
                <button
                  type="button"
                  className={`search-tab-btn ${searchTab === 'phone' ? 'active' : ''}`}
                  onClick={() => setSearchTab('phone')}
                >
                  Telefon raqam
                </button>
              </div>

              <div className="search-input-row">
                <input
                  type="text"
                  className="search-field"
                  placeholder={
                    searchTab === 'code'
                      ? 'Bron kodi (masalan: GS-2841)'
                      : '+998 90 123 45 67'
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-search-submit">
                  Izlash
                </button>
              </div>
            </form>

            {/* Found Result Preview */}
            {foundReservation && (
              <div className="found-result-card">
                <div className="found-result-header">
                  <div>
                    <span className="found-res-num tabular-nums">
                      #{foundReservation.code}
                    </span>
                    <h3 className="found-guest-name">
                      {foundReservation.customer_name}
                    </h3>
                  </div>
                  <span className="found-status-tag">
                    {foundReservation.status || 'Tasdiqlangan'}
                  </span>
                </div>

                <div className="found-meta-row">
                  <span className="tabular-nums">Vaqt: {foundReservation.reservation_time}</span>
                  <span className="tabular-nums">{foundReservation.guests_count} kishi</span>
                  <span className="tabular-nums">Stol #{foundReservation.table_number}</span>
                </div>

                <button
                  type="button"
                  className="btn-found-confirm"
                  onClick={() => {
                    setMode('arrival');
                  }}
                >
                  Kelishni tasdiqlash sahifasi →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Bottom Navigation ─── */}
      <BottomNav
        activeTab="home"
        cartCount={navCartCount || initialData.cartCount || 0}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
