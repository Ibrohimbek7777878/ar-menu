import React, { useEffect, useRef } from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { pop } from '../../../motion/fx';
import { t } from '../../../i18n';
import { SettingsButton } from '../SettingsSheet/SettingsButton';
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
  tableNumber: propTable,
  cartCount: propCartCount,
  onCartClick,
  className = '',
}) => {
  const {
    currentPath,
    navigate,
    tableNumber: ctxTable,
    cartCount: ctxCartCount,
    setIsCallWaiterOpen,
    setIsNfcModalOpen,
  } = useNavigation();

  const tableNumber = propTable !== undefined ? propTable : ctxTable;
  const cartCount = propCartCount !== undefined ? propCartCount : ctxCartCount;

  // Savatga taom qo'shilganda (flyToCart tugagach) son belgisi "pop" qiladi
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(cartCount);
  useEffect(() => {
    if (cartCount > prevCount.current) {
      prevCount.current = cartCount;
      const timer = window.setTimeout(() => pop(badgeRef.current), 480);
      return () => window.clearTimeout(timer);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const navLinks = [
    { path: '/', label: t('Asosiy') },
    { path: '/menu', label: t('Menyu') },
    { path: '/ar', label: t('360° Taomlar') },
    { path: '/table', label: t('Stol xizmatlari') },
    { path: '/orders', label: t('Buyurtmalar') },
  ];

  const isLinkActive = (path: string) => {
    if (path === '/') return currentPath === '/' || currentPath.includes('/welcome');
    return currentPath.startsWith(path);
  };

  return (
    <header className={`header-nav ${className}`}>
      <div className="header-nav-container">
        {/* Brand */}
        <div 
          className="header-brand-link" 
          onClick={() => navigate('/')} 
          role="button" 
          tabIndex={0}
        >
          <span className="brand-crest">G</span>
          <span className="brand-name">{brandName}</span>
        </div>

        {/* ─── Desktop-Only Navigation Bar ─── */}
        <nav className="header-desktop-links" aria-label={t('Desktop asosiy menyu')}>
          {navLinks.map((link) => {
            const active = isLinkActive(link.path);
            return (
              <button
                key={link.path}
                type="button"
                className={`desktop-nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right side info: Table & Cart & Staff */}
        <div className="header-nav-actions">
          {tableNumber && (
            <div 
              className="header-table-badge" 
              onClick={() => setIsNfcModalOpen(true)} 
              role="button" 
              tabIndex={0}
              title={t("NFC / QR orqali stolni o'zgartirish")}
            >
              <span className="table-status-dot" />
              <span>{t('Stol {num}', { num: tableNumber })}</span>
            </div>
          )}

          {/* Til va kun/tun (almashtirgich yoqilmagan bo'lsa chizilmaydi) */}
          <SettingsButton />

          {/* Quick Call Waiter Button */}
          <button
            type="button"
            className="btn-header-call-waiter"
            onClick={() => setIsCallWaiterOpen(true)}
            title={t('Ofitsiantni chaqirish (Choy, Non, Hisob)')}
            aria-label={t('Ofitsiant chaqirish')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="call-waiter-text">{t('Chaqiruv')}</span>
          </button>

          {/* Cart Trigger */}
          <button
            type="button"
            className="header-cart-btn"
            data-cart-target=""
            onClick={onCartClick || (() => navigate('/cart'))}
            aria-label={t('Savat')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge tabular-nums" ref={badgeRef}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
