import React from 'react';
import './BottomNav.css';

export interface BottomNavProps {
  activeTab: 'home' | 'menu' | 'ar' | 'cart' | 'orders';
  cartCount?: number;
  onTabChange: (tab: 'home' | 'menu' | 'ar' | 'cart' | 'orders') => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  cartCount = 0,
  onTabChange,
  className = '',
}) => {
  return (
    <nav className={`bottom-nav ${className}`}>
      <div className="bottom-nav-container">
        {/* Asosiy */}
        <button
          type="button"
          className={`bottom-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
          aria-label="Asosiy sahifa"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="bottom-tab-label">Asosiy</span>
        </button>

        {/* Menyu */}
        <button
          type="button"
          className={`bottom-tab ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => onTabChange('menu')}
          aria-label="Menyu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
          <span className="bottom-tab-label">Menyu</span>
        </button>

        {/* 3D Taomlar */}
        <button
          type="button"
          className={`bottom-tab ${activeTab === 'ar' ? 'active' : ''}`}
          onClick={() => onTabChange('ar')}
          aria-label="3D taomlar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span className="bottom-tab-label">3D Taom</span>
        </button>

        {/* Savat */}
        <button
          type="button"
          className={`bottom-tab ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => onTabChange('cart')}
          aria-label="Savat"
        >
          <div className="tab-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span className="tab-cart-badge tabular-nums">{cartCount}</span>
            )}
          </div>
          <span className="bottom-tab-label">Savat</span>
        </button>

        {/* Buyurtmalar */}
        <button
          type="button"
          className={`bottom-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => onTabChange('orders')}
          aria-label="Buyurtmalar va hisob"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span className="bottom-tab-label">Hisob</span>
        </button>
      </div>
    </nav>
  );
};
