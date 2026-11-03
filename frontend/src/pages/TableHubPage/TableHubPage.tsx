import React, { useEffect, useState } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { RestaurantAPI } from '../../services/RestaurantAPI';
import { useNavigation } from '../../context/NavigationContext';
import { t, tr } from '../../i18n';
import { BookingEntry } from '../BookingPage/BookingEntry';
import './TableHubPage.css';

export interface HallData {
  id: number;
  name: string;
}

export interface TableItemData {
  id: number;
  number: string | number;
  hall_id?: number;
  hall_name?: string;
  status: 'free' | 'occupied' | 'reserved';
  capacity?: number;
}

interface InitialTableData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string; id?: number };
  tables?: TableItemData[];
  halls?: HallData[];
  cartCount?: number;
  flashMsg?: string;
}

export interface TableHubPageProps {
  embedded?: boolean;
}

/** Bron muvaffaqiyati xabari serverdan qiymatlar (ism, stol, kod) bilan tayyor matn bo'lib keladi: qiymatlar ajratilib tarjima shabloniga solinadi. */
function flashText(message: string): string {
  const m = message.match(/^Rahmat, (.+)! Stol (.+)-raqam bilan bron qilindi\. Bron kodingiz: (.+) — saqlab qo'ying\.$/);
  if (m) return t("Rahmat, {name}! Stol {table}-raqam bilan bron qilindi. Bron kodingiz: {code} — saqlab qo'ying.", { name: m[1], table: m[2], code: m[3] });
  return t(message);
}

export const TableHubPage: React.FC<TableHubPageProps> = ({ embedded = false }) => {
  const { navigate, cartCount: navCartCount, setIsQrModalOpen, userRole } = useNavigation();
  // QR chop etish — xodim vositasi, mehmonga ko'rsatilmaydi (TZ: R-SEC-08)
  const isStaff = userRole !== 'guest';
  const initialData: InitialTableData = (window as any).__GULISTON_TABLE_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const halls = initialData.halls || [
    { id: 1, name: tr('Asosiy Zal') },
    { id: 2, name: tr('VIP Xona') },
    { id: 3, name: tr('Yozgi Ayvon') },
  ];
  const tables = initialData.tables || [
    { id: 1, number: '01', hall_id: 1, hall_name: 'Asosiy Zal', status: 'free', capacity: 4 },
    { id: 2, number: '02', hall_id: 1, hall_name: 'Asosiy Zal', status: 'occupied', capacity: 4 },
    { id: 3, number: '03', hall_id: 1, hall_name: 'Asosiy Zal', status: 'free', capacity: 6 },
    { id: 4, number: '04', hall_id: 1, hall_name: 'Asosiy Zal', status: 'free', capacity: 2 },
    { id: 5, number: 'VIP-1', hall_id: 2, hall_name: 'VIP Xona', status: 'free', capacity: 10 },
    { id: 6, number: 'VIP-2', hall_id: 2, hall_name: 'VIP Xona', status: 'occupied', capacity: 12 },
    { id: 7, number: 'Y-1', hall_id: 3, hall_name: 'Yozgi Ayvon', status: 'free', capacity: 6 },
    { id: 8, number: 'Y-2', hall_id: 3, hall_name: 'Yozgi Ayvon', status: 'free', capacity: 4 },
  ];

  // Tab switch: 'my-table' or 'reservation'
  const [activeTab, setActiveTab] = useState<'my-table' | 'reserve'>('my-table');

  // Reservation form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [resDate, setResDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resTime, setResTime] = useState('19:00');
  const [guestsCount, setGuestsCount] = useState(4);
  const [selectedHall, setSelectedHall] = useState<number | 'any'>('any');
  const [resNotes, setResNotes] = useState('');

  // Table filter hall
  const [selectedHallFilter, setSelectedHallFilter] = useState<number | 'all'>('all');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastIcon, setToastIcon] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, icon = '', durationMs = 2400) => {
    setToastMsg(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), durationMs);
  };

  // Server bron formasini qayta ishlagach javob xabari (muvaffaqiyat + bron kodi yoki xato sababi) shu yerda ko'rsatiladi.
  // Avval bu xabar umuman ko'rsatilmasdi: mehmon bron qabul qilinganini ham, kodini ham bilmasdi.
  useEffect(() => {
    if (initialData.flashMsg) {
      setToastMsg(flashText(initialData.flashMsg));
      setToastIcon('');
      setToastVisible(true);
      const timer = window.setTimeout(() => setToastVisible(false), 12000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Haqiqiy chaqiruv yuboriladi (avval faqat "chaqirildi" deb yozilardi, hech narsa yuborilmasdi)
  const SERVICE_TYPES: Record<string, string> = {
    Ofitsiant: 'waiter',
    'Hisob-kitob (chek)': 'bill',
    'Choy yangilash': 'tea',
    'Issiq non': 'bread',
  };
  const handleServiceCall = async (serviceName: string) => {
    if (!table?.number) {
      showToast(t("Avval stol ustidagi QR kodni skanerlang — shunda ofitsiant qaysi stolga kelishini biladi"));
      return;
    }
    const res = await RestaurantAPI.createServiceCall(table.number, SERVICE_TYPES[serviceName] || 'waiter', serviceName);
    if (!res) {
      showToast(t("Chaqiruv yuborilmadi. Aloqani tekshirib qayta urinib ko'ring"));
      return;
    }
    showToast(t('"{name}" chaqirildi. Xizmatchi yaqinlashmoqda.', { name: t(serviceName) }));
  };

  const handleSelectTable = (tbl: TableItemData) => {
    if (tbl.status === 'occupied') {
      showToast(t('Stol #{num} hozir band', { num: tbl.number }));
      return;
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = window.location.pathname;

    const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrf;
    form.appendChild(csrfInput);

    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'select_table';
    form.appendChild(actionInput);

    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'table_id';
    idInput.value = String(tbl.id);
    form.appendChild(idInput);

    document.body.appendChild(form);
    form.submit();
  };

  const handleClearTable = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = window.location.pathname;

    const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrfmiddlewaretoken';
    csrfInput.value = csrf;
    form.appendChild(csrfInput);

    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'clear_table';
    form.appendChild(actionInput);

    document.body.appendChild(form);
    form.submit();
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast(t('Iltimos, ism va telefon raqamingizni kiriting'));
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = window.location.pathname;

    const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    const addInput = (name: string, value: string) => {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = name;
      inp.value = value;
      form.appendChild(inp);
    };

    addInput('csrfmiddlewaretoken', csrf);
    addInput('action', 'reserve_table');
    addInput('customer_name', customerName);
    addInput('customer_phone', customerPhone);
    addInput('reservation_date', resDate);
    addInput('reservation_time', resTime);
    addInput('guests_count', String(guestsCount));
    if (selectedHall !== 'any') {
      addInput('hall_id', String(selectedHall));
    }
    addInput('notes', resNotes);

    document.body.appendChild(form);
    form.submit();
  };

  const filteredTables = tables.filter((row) => {
    if (selectedHallFilter === 'all') return true;
    return row.hall_id === selectedHallFilter;
  });

  return (
    <div className="react-table-hub-page">
      {/* ─── Header Navigation ─── */}
      {!embedded && (
        <HeaderNav
          brandName={shopName}
          tableNumber={table?.number}
          cartCount={navCartCount || initialData.cartCount || 0}
          onCartClick={() => navigate('/cart/')}
        />
      )}

      <main className="table-hub-content">
        {/* ─── Hero Header ─── */}
        <section className="table-hub-hero">
          {table ? (
            <div className="table-current-badge">
              <span className="badge-kicker">{t('Stol')}</span>
              <strong className="badge-num tabular-nums">{table.number}</strong>
            </div>
          ) : (
            <div className="table-generic-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
              </svg>
            </div>
          )}

          <h1 className="table-hub-title serif">
            {table ? t('Stol #{num}', { num: table.number }) : t('Stollar va bron qilish')}
          </h1>
          <p className="table-hub-desc">
            {table
              ? t('{hall} · Stolingiz faol ulangan', { hall: table.hall ? t(table.hall) : t('Asosiy Zal') })
              : t("O'tirish uchun bo'sh stolni tanlang yoki oldindan bron qiling")}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            {table && (
              <button
                type="button"
                className="btn-leave-table"
                onClick={handleClearTable}
              >
                {t('Stoldan chiqish ↩')}
              </button>
            )}
            {/* Stol bron qilish (yangi oqim: zal rejasi, sana/vaqt oraliqlari): faqat restoran bronni yoqqan bo'lsa ko'rinadi; pastdagi eski bron formasi o'zgarmagan */}
            <BookingEntry variant="pill" />
            {isStaff && (
            <button
              type="button"
              className="btn-leave-table"
              style={{ background: '#213827', color: '#ffffff', borderColor: '#213827' }}
              onClick={() => setIsQrModalOpen(true)}
            >
              <span style={{ marginRight: '6px' }}>🖨️</span>
              {t('QR Kodlarni chop etish')}
            </button>
            )}
          </div>
        </section>

        {/* ─── Top Switch Tabs ─── */}
        <div className="hub-mode-tabs">
          <button
            type="button"
            className={`hub-tab ${activeTab === 'my-table' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-table')}
          >
            {table ? t('Stol servislari') : t('Stollar xaritasi')}
          </button>
          <button
            type="button"
            className={`hub-tab ${activeTab === 'reserve' ? 'active' : ''}`}
            onClick={() => setActiveTab('reserve')}
          >
            {t('Stolni bron qilish')}
          </button>
        </div>

        {/* ─── TAB 1: Stol Servislari & Tanlash ─── */}
        {activeTab === 'my-table' && (
          <div className="hub-services-view">
            {table ? (
              <>
                {/* 4 ta tezkor ofitsiant chaqirish xizmatlari */}
                <div className="service-cards-grid">
                  <div
                    className="service-card card-call"
                    onClick={() => handleServiceCall(tr('Ofitsiant'))}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                    </div>
                    <h3 className="service-title">{t('Ofitsiantni chaqirish')}</h3>
                    <p className="service-desc">{t('Stolingizga xizmatchi yaqinlashadi')}</p>
                  </div>

                  <div
                    className="service-card card-bill"
                    onClick={() => handleServiceCall(tr('Hisob-kitob (chek)'))}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <h3 className="service-title">{t("Hisobni so'rash")}</h3>
                    <p className="service-desc">{t('Terminal yoki naqd pul cheki')}</p>
                  </div>

                  <div
                    className="service-card"
                    onClick={() => handleServiceCall(tr('Choy yangilash'))}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                        <line x1="6" y1="2" x2="6" y2="4" />
                        <line x1="10" y1="2" x2="10" y2="4" />
                      </svg>
                    </div>
                    <h3 className="service-title">{t('Choy yangilash')}</h3>
                    <p className="service-desc">{t("Ko'k yoki qora damlangan choy")}</p>
                  </div>

                  <div
                    className="service-card"
                    onClick={() => handleServiceCall(tr('Issiq non'))}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v10M7 12h10" />
                      </svg>
                    </div>
                    <h3 className="service-title">{t('Non keltirish')}</h3>
                    <p className="service-desc">{t('Issiq tandir non yoki patir')}</p>
                  </div>
                </div>

                <div className="hub-quick-navs">
                  <a href="/menu/" className="btn-hub-menu-link">
                    <span>{t("Menyuni ko'rish")}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a href="/orders/" className="btn-hub-orders-link">
                    <span>{t('Buyurtmalar holati')}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </>
            ) : null}

            {/* Stollar Ro'yxati / Xaritasi */}
            <div className="tables-directory-section">
              <div className="directory-header">
                <h3 className="directory-title serif">{t('Restorandagi stollar')}</h3>
                <span className="directory-count tabular-nums">{t('{n} ta stol', { n: tables.length })}</span>
              </div>

              {/* Hall Chips */}
              <div className="halls-filter-bar">
                <button
                  type="button"
                  className={`hall-chip ${selectedHallFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedHallFilter('all')}
                >
                  {t('Barcha zallar')}
                </button>
                {halls.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`hall-chip ${selectedHallFilter === h.id ? 'active' : ''}`}
                    onClick={() => setSelectedHallFilter(h.id)}
                  >
                    {t(h.name)}
                  </button>
                ))}
              </div>

              <div className="tables-grid">
                {filteredTables.map((tbl) => (
                  <div
                    key={tbl.id}
                    className={`table-item-card status-${tbl.status}`}
                    onClick={() => handleSelectTable(tbl)}
                  >
                    <div className="table-item-top">
                      <span className="table-item-hall">{tbl.hall_name ? t(tbl.hall_name) : t('Zal')}</span>
                      <span className={`table-status-pill pill-${tbl.status}`}>
                        {tbl.status === 'free' ? t("Bo'sh") : tbl.status === 'occupied' ? t('Band') : t('Bron')}
                      </span>
                    </div>

                    <strong className="table-item-number tabular-nums">#{tbl.number}</strong>
                    <span className="table-item-capacity tabular-nums">{t('{n} kishilik', { n: tbl.capacity || 4 })}</span>

                    {tbl.status === 'free' && (
                      <button type="button" className="btn-occupy-table">
                        {t('Tanlash')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Stolni Bron Qilish Formasi ─── */}
        {activeTab === 'reserve' && (
          <form className="reservation-form-card" onSubmit={handleReservationSubmit}>
            <div className="form-header">
              <span className="form-badge">{t('Oldindan band qilish')}</span>
              <h2 className="form-title serif">{t('Stolni bron qilish')}</h2>
              <p className="form-desc">
                {t("Tantana, oila davrasi yoki do'stlar bilan uchrashuv uchun qulay stolni oldindan band qiling.")}
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('Ismingiz:')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('Ismingizni kiriting')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('Telefon raqamingiz:')}</label>
                <input
                  type="tel"
                  className="form-input tabular-nums"
                  placeholder="+998 90 123 45 67"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('Sana:')}</label>
                <input
                  type="date"
                  className="form-input tabular-nums"
                  value={resDate}
                  onChange={(e) => setResDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('Vaqt:')}</label>
                <input
                  type="time"
                  className="form-input tabular-nums"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('Mehmonlar soni:')}</label>
                <div className="guests-stepper">
                  <button
                    type="button"
                    className="btn-guest-step"
                    onClick={() => setGuestsCount((c) => Math.max(1, c - 1))}
                  >
                    -
                  </button>
                  <span className="guest-count-val tabular-nums">{t('{n} kishi', { n: guestsCount })}</span>
                  <button
                    type="button"
                    className="btn-guest-step"
                    onClick={() => setGuestsCount((c) => Math.min(30, c + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t("Ma'qul zal:")}</label>
                <select
                  className="form-select"
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value === 'any' ? 'any' : Number(e.target.value))}
                >
                  <option value="any">{t('Ixtiyoriy zal')}</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {t(h.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t("Qo'shimcha istaklar:")}</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={t("Tug'ilgan kun bezagi, bolalar o'rindig'i, tinch burchak...")}
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-submit-reservation">
              <span>{t('Bron qilish')}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        )}
      </main>

      {/* ─── Bottom Navigation ─── */}
      {!embedded && (
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
      )}

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
