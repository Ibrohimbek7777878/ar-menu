import React from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import './StaffNavHeader.css';

export interface StaffNavHeaderProps {
  activeTab: 'waiter' | 'kds' | 'admin' | 'hostess' | 'finance';
  title?: string;
}

export const StaffNavHeader: React.FC<StaffNavHeaderProps> = ({ activeTab, title }) => {
  const { navigate, userRole, logoutStaff } = useNavigation();

  // ─── RBAC GUARD: Mehmonlarga (Guest) xodimlar navbari umuman ko'rinmasin! ───
  if (userRole === 'guest') {
    return null;
  }

  const isAdmin = userRole === 'admin';
  const isWaiter = userRole === 'waiter' || isAdmin;
  const isKitchen = userRole === 'kitchen' || isAdmin;
  const isHostess = userRole === 'hostess' || isAdmin;
  const isFinance = isAdmin;

  return (
    <div className="staff-nav-header">
      <div className="staff-nav-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem' }}>🍽️</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            Guliston POS
          </span>
          <span style={{ fontSize: '0.7rem', background: '#334155', color: '#94a3b8', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
            {userRole}
          </span>
        </div>

        <div className="staff-tabs-scroll">
          {/* OFITSIANT */}
          {isWaiter && (
            <button
              type="button"
              className={`staff-nav-tab ${activeTab === 'waiter' ? 'active' : ''}`}
              onClick={() => navigate('/waiter')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>Ofitsiant</span>
            </button>
          )}

          {/* OSHXONA (KDS) */}
          {isKitchen && (
            <button
              type="button"
              className={`staff-nav-tab ${activeTab === 'kds' ? 'active' : ''}`}
              onClick={() => navigate('/kds')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              <span>Oshxona (KDS)</span>
            </button>
          )}

          {/* MOLIYA (Faqat Admin) */}
          {isFinance && (
            <button
              type="button"
              className={`staff-nav-tab ${activeTab === 'finance' ? 'active' : ''}`}
              onClick={() => navigate('/finance')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>Moliya</span>
            </button>
          )}

          {/* BOSHQARUV (Faqat Admin) */}
          {isAdmin && (
            <button
              type="button"
              className={`staff-nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Boshqaruv (Admin)</span>
            </button>
          )}

          {/* KUTIB OLISH */}
          {isHostess && (
            <button
              type="button"
              className={`staff-nav-tab ${activeTab === 'hostess' ? 'active' : ''}`}
              onClick={() => navigate('/hostess')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Kutib olish</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn-exit-to-guest"
          onClick={() => logoutStaff()}
          title="Xodimlar panelidan chiqish va Mehmon menyusiga o'tish"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span>Chiqish</span>
        </button>
      </div>
      {title && <h2 className="staff-header-title">{title}</h2>}
    </div>
  );
};
