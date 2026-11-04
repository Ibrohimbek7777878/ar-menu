import React, { useEffect, useState } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { RestaurantAPI } from '../../services/RestaurantAPI';
import { roleService } from '../../core/auth/RoleService';
import { t, tr } from '../../i18n';
import { termT, tm } from '../../utils/brandText';
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
  error?: string;
}

// Server holat kodlari → mehmonga tushunarli matn
const STATUS_LABEL: Record<string, string> = {
  pending: tr('Kutilmoqda'),
  confirmed: tr('Tasdiqlangan'),
  arrived: tr('Keldi'),
  seated: tr("Stolga o'tirdi"),
  completed: tr('Yakunlangan'),
  cancelled: tr('Bekor qilingan'),
};

export const ReservationPage: React.FC = () => {
  const { navigate, cartCount: navCartCount } = useNavigation();
  const initialData: InitialReservationData = (window as any).__GULISTON_RESERVATION_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const defaultMode = window.location.pathname.includes('/arrival') ? 'arrival' : (initialData.mode || 'find');

  // Namuna bron ("Muhayyo Karimova") faqat DEMO rejimda: avval har tashrifchiga begona odamning broni ko'rsatilardi
  const demoReservation: ReservationInfo = {
    code: 'GS-2841',
    customer_name: 'Muhayyo Karimova',
    customer_phone: '+998 90 123 45 67',
    table_number: '08',
    reservation_time: '19:30',
    guests_count: 4,
    hall: 'Registon Zali',
    status: 'Tasdiqlangan',
  };
  const defaultReservation: ReservationInfo | null =
    initialData.reservation || (roleService.isDemo() ? demoReservation : null);

  const [mode, setMode] = useState<'find' | 'arrival'>(defaultMode);
  const [searchTab, setSearchTab] = useState<'code' | 'phone'>('code');
  const [query, setQuery] = useState(initialData.query || '');
  const [foundReservation, setFoundReservation] = useState<ReservationInfo | null>(defaultReservation);
  // Bron topilmagan bo'lsa 'kelishni tasdiqlash' ekrani ko'rsatiladigan narsa yo'q — qidiruv ko'rinadi
  const viewMode: 'find' | 'arrival' = mode === 'arrival' && foundReservation ? 'arrival' : 'find';

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

  // Kelishni tasdiqlash serverda rad etilgan bo'lsa (kod noto'g'ri, bron boshqa kunga...) sababi ko'rsatiladi
  useEffect(() => {
    if (initialData.error) {
      setToastMsg(t(initialData.error));
      setToastIcon('');
      setToastVisible(true);
      const timer = window.setTimeout(() => setToastVisible(false), 3600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      showToast(t('Qidirish uchun kod yoki telefon kiriting'));
      return;
    }

    // Backend orqali qidirish
    RestaurantAPI.findReservation(query.trim()).then((res) => {
      if (res?.reservation) {
        setFoundReservation(res.reservation);
        showToast(t('Bron topildi!'), '✓');
      } else {
        showToast(t('Bron topilmadi'));
      }
    });

    navigate(`/reservation/find/?q=${encodeURIComponent(query.trim())}`);
  };

  const handleConfirmArrival = () => {
    // Kelishni server bron kodi bo'yicha qayd etadi va rezerv qilingan stolni sessiyaga yozadi (mehmon stol
    // raqamini o'zi yubormaydi). Avval bu yerda xodimga tegishli PATCH yuborilardi va jimgina rad etilardi.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/reservation/arrival/';

    const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrf;
    form.appendChild(csrfInput);

    const codeInput = document.createElement('input');
    codeInput.type = 'hidden';
    codeInput.name = 'code';
    codeInput.value = foundReservation?.code || '';
    form.appendChild(codeInput);

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
            className={`mode-btn ${viewMode === 'arrival' ? 'active' : ''}`}
            onClick={() => setMode('arrival')}
          >
            {t('Kelishni tasdiqlash')}
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === 'find' ? 'active' : ''}`}
            onClick={() => setMode('find')}
          >
            {t('Bronni qidirish')}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            MODE 1: KELISHNI TASDIQLASH (ARRIVAL CONFIRM)
           ══════════════════════════════════════════════════════ */}
        {viewMode === 'arrival' && foundReservation && (
          <div className="arrival-view">
            <div className="arrival-hero-card">
              <span className="res-badge">{t('Tashrif qaydnomasi')}</span>
              <h1 className="arrival-title serif">
                {foundReservation.customer_name},<br />
                {tm(t('Stolingiz tayyor!'))}
              </h1>
              <p className="arrival-desc">
                {tm(t("Tashrifingiz tizimda qayd etildi. Quyidagi tugma orqali stol menyusiga o'tib, taomlarni buyurtma qiling."))}
              </p>
            </div>

            {/* Guest & Table Card */}
            <div className="arrival-detail-card">
              <div className="arrival-card-top">
                <div className="arrival-table-circle">
                  <span className="circle-kicker">{termT('table')}</span>
                  <strong className="circle-num tabular-nums">
                    {foundReservation.table_number}
                  </strong>
                </div>

                <div className="arrival-meta-right">
                  <span className="res-code-badge tabular-nums">
                    {t('KOD: #{code}', { code: foundReservation.code })}
                  </span>
                  <strong className="arrival-guest-name">
                    {foundReservation.customer_name}
                  </strong>
                  <span className="arrival-hall-name">
                    {foundReservation.hall ? t(foundReservation.hall) : ''}
                  </span>
                </div>
              </div>

              <div className="arrival-info-grid">
                <div className="info-box">
                  <span className="info-box-label">{t('Belgilangan vaqt')}</span>
                  <strong className="info-box-val tabular-nums">
                    {foundReservation.reservation_time}
                  </strong>
                </div>
                <div className="info-box">
                  <span className="info-box-label">{t('Mehmonlar soni')}</span>
                  <strong className="info-box-val tabular-nums">
                    {t('{n} kishi', { n: foundReservation.guests_count })}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="btn-confirm-and-menu"
                onClick={handleConfirmArrival}
              >
                <span>{tm(t('Stol menyusini ochish'))}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="arrival-extra-actions">
              <a href="/table/" className="extra-link">
                {t("Boshqa stollarni ko'rish")}
              </a>
              <span className="extra-sep">•</span>
              <button
                type="button"
                className="extra-btn"
                onClick={() => setMode('find')}
              >
                {t('Boshqa bron kodi bilan qidirish')}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            MODE 2: BRONNI QIDIRISH (FIND RESERVATION)
           ══════════════════════════════════════════════════════ */}
        {viewMode === 'find' && (
          <div className="find-view">
            <div className="find-header">
              <span className="res-badge">{t('Bron holati')}</span>
              <h1 className="find-title serif">
                {t('Broningizni tekshiring')}
              </h1>
              <p className="find-desc">
                {t("Bron kodi (masalan, GS-K7QX2) yoki ro'yxatdan o'tgan telefon raqamingizni kiriting.")}
              </p>
            </div>

            <form className="find-search-card" onSubmit={handleSearch}>
              <div className="search-tab-bar">
                <button
                  type="button"
                  className={`search-tab-btn ${searchTab === 'code' ? 'active' : ''}`}
                  onClick={() => setSearchTab('code')}
                >
                  {t('Bron kodi (GS-K7QX2)')}
                </button>
                <button
                  type="button"
                  className={`search-tab-btn ${searchTab === 'phone' ? 'active' : ''}`}
                  onClick={() => setSearchTab('phone')}
                >
                  {t('Telefon raqam')}
                </button>
              </div>

              <div className="search-input-row">
                <input
                  type="text"
                  className="search-field"
                  placeholder={
                    searchTab === 'code'
                      ? t('Bron kodi (masalan: GS-K7QX2)')
                      : '+998 90 123 45 67'
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-search-submit">
                  {t('Izlash')}
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
                    {t(STATUS_LABEL[foundReservation.status || ''] || foundReservation.status || 'Tasdiqlangan')}
                  </span>
                </div>

                <div className="found-meta-row">
                  <span className="tabular-nums">{t('Vaqt:')} {foundReservation.reservation_time}</span>
                  <span className="tabular-nums">{t('{n} kishi', { n: foundReservation.guests_count })}</span>
                  <span className="tabular-nums">{tm(t('Stol #{num}', { num: foundReservation.table_number }))}</span>
                </div>

                <button
                  type="button"
                  className="btn-found-confirm"
                  onClick={() => {
                    setMode('arrival');
                  }}
                >
                  {t('Kelishni tasdiqlash sahifasi →')}
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
