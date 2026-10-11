import React from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import './StaffNavHeader.css';

export interface StaffNavHeaderProps {
  activeTab: 'waiter' | 'kds' | 'admin' | 'hostess' | 'finance';
  title?: string;
}

export const StaffNavHeader: React.FC<StaffNavHeaderProps> = ({ activeTab, title }) => {
  const { navigate } = useNavigation();

  return (
    <div className="staff-nav-header">
      <div className="staff-nav-container">
        <div className="staff-tabs-scroll">
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
        </div>

        <button
          type="button"
          className="btn-exit-to-guest"
          onClick={() => navigate('/menu')}
          title="Mijozlar menyusiga qaytish"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Mehmon menyusi</span>
        </button>
      </div>
      {title && <h2 className="staff-header-title">{title}</h2>}
    </div>
  );
};
