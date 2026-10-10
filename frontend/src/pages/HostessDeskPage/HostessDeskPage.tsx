import React, { useState, useMemo } from 'react';
import { HeaderNav, StaffNavHeader, Toast } from '../../components/ui';
import './HostessDeskPage.css';

export interface HostessGuest {
  id: number;
  code: string;
  name: string;
  phone: string;
  table_number: string | number;
  hall: string;
  time: string;
  guests_count: number;
  status: 'pending' | 'arrived' | 'seated';
  notes?: string;
}

interface InitialHostessData {
  shop?: { name: string };
  hostess_name?: string;
  guests?: HostessGuest[];
}

declare global {
  interface Window {
    __GULISTON_HOSTESS_DATA__?: InitialHostessData;
  }
}

export const HostessDeskPage: React.FC = () => {
  const initialData: InitialHostessData =
    typeof window !== 'undefined' ? window.__GULISTON_HOSTESS_DATA__ || {} : {};

  const shopName = initialData.shop?.name || 'Guliston';
  const hostessName = initialData.hostess_name || 'Zarina (Hostess)';

  const initialGuests: HostessGuest[] = initialData.guests || [
    {
      id: 1,
      code: 'GS-2841',
      name: 'Muhayyo Karimova',
      phone: '+998 90 123 45 67',
      table_number: '08',
      hall: 'Registon Zali',
      time: '19:30',
      guests_count: 4,
      status: 'pending',
      notes: 'Oila davrasi, bolalar stuli kerak',
    },
    {
      id: 2,
      code: 'GS-2842',
      name: 'Nodir Saidov',
      phone: '+998 93 987 65 43',
      table_number: 'VIP-1',
      hall: 'VIP Xona',
      time: '19:45',
      guests_count: 8,
      status: 'pending',
      notes: 'Tug\'ilgan kun kechasi, oldindan tort olib kelingan',
    },
    {
      id: 3,
      code: 'GS-2840',
      name: 'Dilshod Rahmatov',
      phone: '+998 97 555 11 22',
      table_number: '05',
      hall: 'Asosiy Zal',
      time: '19:15',
      guests_count: 2,
      status: 'arrived',
      notes: 'Darchaga yaqin tinch stol',
    },
    {
      id: 4,
      code: 'GS-2839',
      name: 'Aziza Rahimova',
      phone: '+998 90 333 44 55',
      table_number: 'Y-2',
      hall: 'Yozgi Ayvon',
      time: '19:00',
      guests_count: 5,
      status: 'seated',
    },
  ];

  const [guests, setGuests] = useState<HostessGuest[]>(initialGuests);
  const [activeTab, setActiveTab] = useState<'desk' | 'timeline' | 'checklist'>('desk');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Guest Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('+998 ');
  const [newGuestTable, setNewGuestTable] = useState('02');
  const [newGuestHall, setNewGuestHall] = useState('Asosiy Zal');
  const [newGuestCount, setNewGuestCount] = useState(2);
  const [newGuestNotes, setNewGuestNotes] = useState('');

  // Checklist items
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Stol tozaligi va servirovka idishlarining to\'liqligi tekshirildi', done: true },
    { id: 2, text: 'Oldindan buyurtma qilingan salatlar va yaxna gazaklar muzlatgichda tayyor', done: true },
    { id: 3, text: 'Mehmonlar soniga muvofiq qo\'shimcha stullar va stakanlar joylashtirildi', done: false },
    { id: 4, text: 'Tantanali kecha uchun maxsus musiqiy tabrik yoki bezak tasdiqlandi', done: false },
  ]);

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

  const handleMarkArrived = (id: number) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: 'arrived' } : g))
    );
    showToast('Mehmon yetib kelgani qayd etildi');
  };

  const handleMarkSeated = (id: number) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: 'seated' } : g))
    );
    showToast('Mehmon stolga o\'tqazildi');
  };

  const handleSendReminder = (guest: HostessGuest) => {
    showToast(`${guest.name}ga eslatma SMS yuborildi`);
  };

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleSaveNewGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) {
      showToast('Iltimos, mehmon ismini kiriting');
      return;
    }

    const newGuest: HostessGuest = {
      id: guests.length + 1,
      code: `GS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newGuestName.trim(),
      phone: newGuestPhone.trim() || '+998 90 000 00 00',
      table_number: newGuestTable,
      hall: newGuestHall,
      time: 'Hozir',
      guests_count: newGuestCount,
      status: 'arrived',
      notes: newGuestNotes.trim() || 'Jonli kelgan mehmon (Walk-in)',
    };

    setGuests((prev) => [newGuest, ...prev]);
    setIsAddModalOpen(false);
    setNewGuestName('');
    setNewGuestNotes('');
    showToast(`${newGuest.name} qabul qilindi va #${newGuest.table_number} stolga biriktirildi`);
  };

  const pendingCount = guests.filter((g) => g.status === 'pending').length;
  const arrivedCount = guests.filter((g) => g.status === 'arrived').length;
  const seatedCount = guests.filter((g) => g.status === 'seated').length;

  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return guests;
    const q = searchQuery.toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        String(g.table_number).toLowerCase().includes(q)
    );
  }, [guests, searchQuery]);

  return (
    <div className="react-hostess-page">
      {/* ─── Header Navigation ─── */}
      <HeaderNav brandName={`${shopName} · Hostess`} cartCount={0} />
      <StaffNavHeader activeTab="admin" />

      <main className="hostess-main-content">
        {/* ─── Hero Section ─── */}
        <div className="hostess-hero">
          <span className="hostess-badge">Kutib olish xizmati</span>
          <h1 className="hostess-title">
            {hostessName}
          </h1>
          <p className="hostess-subtitle">
            Mehmonlar tashrifi, stollarga yo'naltirish va bronlar nazorati.
          </p>

          <div className="hostess-kpi-row">
            <div className={`kpi-pill ${pendingCount > 0 ? 'kpi-pill-pending' : ''}`}>
              <span className="kpi-circle tabular-nums">{pendingCount}</span>
              <span className="kpi-text">Kutilmoqda</span>
            </div>
            <div className="kpi-pill kpi-pill-arrived">
              <span className="kpi-circle tabular-nums">{arrivedCount}</span>
              <span className="kpi-text">Kelishdi</span>
            </div>
            <div className="kpi-pill">
              <span className="kpi-circle tabular-nums">{seatedCount}</span>
              <span className="kpi-text">Joylashdi</span>
            </div>
          </div>
        </div>

        {/* ─── Toolbar: Search & Add Guest ─── */}
        <div className="hostess-toolbar">
          <div className="hostess-search-wrapper">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="hostess-search-input"
              placeholder="Mehmon ismi, kod yoki stol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-add-guest"
            onClick={() => setIsAddModalOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Mehmon qabul qilish</span>
          </button>
        </div>

        {/* ─── Switch Tabs ─── */}
        <div className="hostess-nav-tabs">
          <button
            type="button"
            className={`hostess-tab-btn ${activeTab === 'desk' ? 'active' : ''}`}
            onClick={() => setActiveTab('desk')}
          >
            Kutib olish ({filteredGuests.length})
          </button>
          <button
            type="button"
            className={`hostess-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Vaqt shkalasi
          </button>
          <button
            type="button"
            className={`hostess-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            Tayyorgarlik cheklisti
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 1: KUTIB OLISH PANELI (DESK)
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'desk' && (
          <div className="desk-guests-list">
            {filteredGuests.length === 0 ? (
              <div className="hostess-empty-state">
                <p>Mos keluvchi mehmon yoki bron topilmadi.</p>
              </div>
            ) : (
              filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className={`guest-desk-card status-${guest.status}`}
                >
                  <div className="guest-card-left">
                    <div className="guest-table-box">
                      <span className="guest-tbl-kicker">Stol</span>
                      <strong className="guest-tbl-num tabular-nums">{guest.table_number}</strong>
                    </div>

                    <div className="guest-info">
                      <div className="guest-name-row">
                        <h3 className="guest-name">{guest.name}</h3>
                        <span className="guest-code tabular-nums">{guest.code}</span>
                      </div>
                      <span className="guest-meta tabular-nums">
                        {guest.hall} · {guest.guests_count} kishi · {guest.time}
                      </span>
                      {guest.notes && (
                        <span className="guest-notes">{guest.notes}</span>
                      )}
                    </div>
                  </div>

                  <div className="guest-card-actions">
                    {guest.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="btn-guest-remind"
                          onClick={() => handleSendReminder(guest)}
                          title="Eslatma SMS yuborish"
                        >
                          Eslatma
                        </button>
                        <button
                          type="button"
                          className="btn-guest-arrived"
                          onClick={() => handleMarkArrived(guest.id)}
                        >
                          Kelishdi
                        </button>
                      </>
                    )}

                    {guest.status === 'arrived' && (
                      <button
                        type="button"
                        className="btn-guest-seated"
                        onClick={() => handleMarkSeated(guest.id)}
                      >
                        Joylashtirildi
                      </button>
                    )}

                    {guest.status === 'seated' && (
                      <span className="pill-seated-done">
                        Joylashgan
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: TIMELINE (VAQT SHKALASI)
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'timeline' && (
          <div className="timeline-container">
            {guests.map((g) => (
              <div key={g.id} className="timeline-item">
                <div className="timeline-time tabular-nums">{g.time}</div>
                <div className="timeline-line-marker" />
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <strong>{g.name}</strong>
                    <span className="tabular-nums">Stol #{g.table_number} ({g.hall})</span>
                  </div>
                  <span className="timeline-meta tabular-nums">
                    {g.guests_count} kishi · {g.phone}
                  </span>
                  {g.notes && <p className="timeline-notes">{g.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: CHECKLIST
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'checklist' && (
          <div className="checklist-container">
            <h3 className="checklist-title">Navbatchi oqshom tekshiruv ro'yxati:</h3>
            <div className="checklist-items">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`checklist-item ${item.done ? 'done' : ''}`}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  <div className="check-box-square">
                    {item.done && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="checklist-text">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── ADD GUEST MODAL ─── */}
      {isAddModalOpen && (
        <div className="hostess-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="hostess-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hostess-modal-header">
              <h3 className="hostess-modal-title">Mehmon qabul qilish</h3>
              <button
                type="button"
                className="btn-hostess-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Yopish"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewGuest} className="hostess-form">
              <div className="hostess-field">
                <label>Mehmon ismi:</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Aliyev"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                />
              </div>

              <div className="hostess-field">
                <label>Telefon raqam:</label>
                <input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  className="tabular-nums"
                />
              </div>

              <div className="hostess-form-row">
                <div className="hostess-field">
                  <label>Stol raqami:</label>
                  <input
                    type="text"
                    required
                    placeholder="02"
                    value={newGuestTable}
                    onChange={(e) => setNewGuestTable(e.target.value)}
                  />
                </div>

                <div className="hostess-field">
                  <label>Mehmonlar soni:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newGuestCount}
                    onChange={(e) => setNewGuestCount(Number(e.target.value))}
                    className="tabular-nums"
                  />
                </div>
              </div>

              <div className="hostess-field">
                <label>Zal nomi:</label>
                <select
                  value={newGuestHall}
                  onChange={(e) => setNewGuestHall(e.target.value)}
                >
                  <option value="Asosiy Zal">Asosiy Zal</option>
                  <option value="Registon Zali">Registon Zali</option>
                  <option value="VIP Xona">VIP Xona</option>
                  <option value="Yozgi Ayvon">Yozgi Ayvon</option>
                </select>
              </div>

              <div className="hostess-field">
                <label>Maxsus eslatma:</label>
                <textarea
                  placeholder="Bolalar stuli, darcha yaqini, tug'ilgan kun..."
                  value={newGuestNotes}
                  onChange={(e) => setNewGuestNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <button type="submit" className="btn-hostess-submit">
                Qayd etish va stolga biriktirish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
