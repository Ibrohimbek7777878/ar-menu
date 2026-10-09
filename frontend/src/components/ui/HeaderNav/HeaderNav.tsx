import React from 'react';
import './HeaderNav.css';

export interface HeaderNavProps {
  brandName?: string;
  tableNumber?: string | number;
  cartCount?: number;
  onCartClick?: () => void;
  className?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  brandName = 'Guliston',
  tableNumber,
  cartCount = 0,
  onCartClick,
  className = '',
}) => {
  return (
    <header className={`header-nav ${className}`}>
      <div className="header-nav-container">
        {/* Brand */}
        <a href="/" className="header-brand-link">
          <span className="brand-crest">G</span>
          <span className="brand-name serif-heading">{brandName}</span>
        </a>

        {/* Right side info */}
        <div className="header-nav-actions">
          {tableNumber && (
            <div className="header-table-badge">
              <span className="table-status-dot" />
              <span>Stol {tableNumber}</span>
            </div>
          )}

          <button
            type="button"
            className="header-cart-btn"
            onClick={onCartClick || (() => { window.location.href = '/cart/'; })}
            aria-label="Savat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge tabular-nums">{cartCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
