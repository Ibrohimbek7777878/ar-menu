import React, { useState } from 'react';
import { HeaderNav, BottomNav, Toast } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
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

export const TableHubPage: React.FC<TableHubPageProps> = ({ embedded = false }) => {
  const { navigate, cartCount: navCartCount, setIsQrModalOpen } = useNavigation();
  const initialData: InitialTableData = (window as any).__GULISTON_TABLE_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const halls = initialData.halls || [
    { id: 1, name: 'Asosiy Zal' },
    { id: 2, name: 'VIP Xona' },
    { id: 3, name: 'Yozgi Ayvon' },
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

  const showToast = (msg: string, icon = '') => {
    setToastMsg(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleServiceCall = (serviceName: string) => {
    showToast(`"${serviceName}" chaqirildi. Xizmatchi yaqinlashmoqda.`);
  };

  const handleSelectTable = (tbl: TableItemData) => {
    if (tbl.status === 'occupied') {
      showToast(`Stol #${tbl.number} hozir band`);
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
      showToast('Iltimos, ism va telefon raqamingizni kiriting');
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

  const filteredTables = tables.filter((t) => {
    if (selectedHallFilter === 'all') return true;
    return t.hall_id === selectedHallFilter;
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
              <span className="badge-kicker">Stol</span>
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
            {table ? `Stol #${table.number}` : 'Stollar va bron qilish'}
          </h1>
          <p className="table-hub-desc">
            {table
              ? `${table.hall || 'Asosiy Zal'} · Stolingiz faol ulangan`
              : 'O\'tirish uchun bo\'sh stolni tanlang yoki oldindan bron qiling'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            {table && (
              <button
                type="button"
                className="btn-leave-table"
                onClick={handleClearTable}
              >
                Stoldan chiqish ↩
              </button>
            )}
            <button
              type="button"
              className="btn-leave-table"
              style={{ background: '#213827', color: '#ffffff', borderColor: '#213827' }}
              onClick={() => setIsQrModalOpen(true)}
            >
              <span style={{ marginRight: '6px' }}>🖨️</span>
              QR Kodlarni chop etish
            </button>
          </div>
        </section>

        {/* ─── Top Switch Tabs ─── */}
        <div className="hub-mode-tabs">
          <button
            type="button"
            className={`hub-tab ${activeTab === 'my-table' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-table')}
          >
            {table ? 'Stol servislari' : 'Stollar xaritasi'}
          </button>
          <button
            type="button"
            className={`hub-tab ${activeTab === 'reserve' ? 'active' : ''}`}
            onClick={() => setActiveTab('reserve')}
          >
            Stolni bron qilish
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
                    onClick={() => handleServiceCall('Ofitsiant')}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                    </div>
                    <h3 className="service-title">Ofitsiantni chaqirish</h3>
                    <p className="service-desc">Stolingizga xizmatchi yaqinlashadi</p>
                  </div>

                  <div
                    className="service-card card-bill"
                    onClick={() => handleServiceCall('Hisob-kitob (chek)')}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <h3 className="service-title">Hisobni so'rash</h3>
                    <p className="service-desc">Terminal yoki naqd pul cheki</p>
                  </div>

                  <div
                    className="service-card"
                    onClick={() => handleServiceCall('Choy yangilash')}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                        <line x1="6" y1="2" x2="6" y2="4" />
                        <line x1="10" y1="2" x2="10" y2="4" />
                      </svg>
                    </div>
                    <h3 className="service-title">Choy yangilash</h3>
                    <p className="service-desc">Ko'k yoki qora damlangan choy</p>
                  </div>

                  <div
                    className="service-card"
                    onClick={() => handleServiceCall('Issiq non')}
                  >
                    <div className="service-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v10M7 12h10" />
                      </svg>
                    </div>
                    <h3 className="service-title">Non keltirish</h3>
                    <p className="service-desc">Issiq tandir non yoki patir</p>
                  </div>
                </div>

                <div className="hub-quick-navs">
                  <a href="/menu/" className="btn-hub-menu-link">
                    <span>Menyuni ko'rish</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a href="/orders/" className="btn-hub-orders-link">
                    <span>Buyurtmalar holati</span>
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
                <h3 className="directory-title serif">Restorandagi stollar</h3>
                <span className="directory-count tabular-nums">{tables.length} ta stol</span>
              </div>

              {/* Hall Chips */}
              <div className="halls-filter-bar">
                <button
                  type="button"
                  className={`hall-chip ${selectedHallFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedHallFilter('all')}
                >
                  Barcha zallar
                </button>
                {halls.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`hall-chip ${selectedHallFilter === h.id ? 'active' : ''}`}
                    onClick={() => setSelectedHallFilter(h.id)}
                  >
                    {h.name}
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
                      <span className="table-item-hall">{tbl.hall_name || 'Zal'}</span>
                      <span className={`table-status-pill pill-${tbl.status}`}>
                        {tbl.status === 'free' ? 'Bo\'sh' : tbl.status === 'occupied' ? 'Band' : 'Bron'}
                      </span>
                    </div>

                    <strong className="table-item-number tabular-nums">#{tbl.number}</strong>
                    <span className="table-item-capacity tabular-nums">{tbl.capacity || 4} kishilik</span>

                    {tbl.status === 'free' && (
                      <button type="button" className="btn-occupy-table">
                        Tanlash
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
              <span className="form-badge">Oldindan band qilish</span>
              <h2 className="form-title serif">Stolni bron qilish</h2>
              <p className="form-desc">
                Tantana, oila davrasi yoki do'stlar bilan uchrashuv uchun qulay stolni oldindan band qiling.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ismingiz:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ismingizni kiriting"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefon raqamingiz:</label>
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
                <label className="form-label">Sana:</label>
                <input
                  type="date"
                  className="form-input tabular-nums"
                  value={resDate}
                  onChange={(e) => setResDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vaqt:</label>
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
                <label className="form-label">Mehmonlar soni:</label>
                <div className="guests-stepper">
                  <button
                    type="button"
                    className="btn-guest-step"
                    onClick={() => setGuestsCount((c) => Math.max(1, c - 1))}
                  >
                    -
                  </button>
                  <span className="guest-count-val tabular-nums">{guestsCount} kishi</span>
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
                <label className="form-label">Ma'qul zal:</label>
                <select
                  className="form-select"
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value === 'any' ? 'any' : Number(e.target.value))}
                >
                  <option value="any">Ixtiyoriy zal</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Qo'shimcha istaklar:</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Tug'ilgan kun bezagi, bolalar o'rindig'i, tinch burchak..."
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-submit-reservation">
              <span>Bron qilish</span>
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
