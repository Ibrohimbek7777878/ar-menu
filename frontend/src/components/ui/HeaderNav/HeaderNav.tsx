import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { pop } from '../../../motion/fx';
import { t } from '../../../i18n';
import { brandName, moduleEnabled, useBrand } from '../../../utils/brand';
import { tm } from '../../../utils/brandText';
import { SettingsButton } from '../SettingsSheet/SettingsButton';
import './HeaderNav.css';

/** Brend logotipi (34 px). Rasm yo'q yoki yuklanmasa — avvalgi harfli belgi (`brand-crest`). Sarlavhada tepada turadi: lazy emas. */
const BrandMark: React.FC<{ logoUrl: string | null; letter: string; name: string }> = ({ logoUrl, letter, name }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <img
        className="brand-logo-img"
        src={logoUrl}
        alt={name}
        width={34}
        height={34}
        decoding="async"
        fetchPriority="high"
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }
  return <span className="brand-crest">{letter}</span>;
};

export interface HeaderNavProps {
  brandName?: string;
  tableNumber?: string | number;
  cartCount?: number;
  onCartClick?: () => void;
  className?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  brandName: brandNameProp = 'Guliston',
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

  // Brend: nom (brend bergan bo'lsa u, aks holda sahifa bergani), logo, bo'limlar. Brend yo'q bo'lsa hamma narsa avvalgidek ("G" belgisi).
  const brand = useBrand();
  const shownName = brandName(brandNameProp);
  const crestLetter = brand.name ? Array.from(brand.name)[0].toUpperCase() : 'G';
  const showMenu = moduleEnabled('menu');
  const showOrders = moduleEnabled('orders');
  const showCallWaiter = moduleEnabled('waiter_call');

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

  // Bo'lim o'chirilsa havola YASHIRILADI (kod o'chirilmaydi): 360° — `ar360`, buyurtmalar — `orders`; menyu o'chiq bo'lsa ikkalasi ham
  const navLinks = [
    { path: '/', label: t('Asosiy'), on: true },
    { path: '/menu', label: t('Menyu'), on: showMenu },
    { path: '/ar', label: t('360° Taomlar'), on: moduleEnabled('ar360') },
    { path: '/table', label: tm(t('Stol xizmatlari')), on: true },
    { path: '/orders', label: t('Buyurtmalar'), on: showOrders },
  ].filter((link) => link.on);

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
          <BrandMark logoUrl={brand.logoUrl} letter={crestLetter} name={shownName} />
          <span className="brand-name">{shownName}</span>
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
              title={tm(t("NFC / QR orqali stolni o'zgartirish"))}
            >
              <span className="table-status-dot" />
              <span>{tm(t('Stol {num}', { num: tableNumber }))}</span>
            </div>
          )}

          {/* Til va kun/tun (almashtirgich yoqilmagan bo'lsa chizilmaydi) */}
          <SettingsButton />

          {/* Quick Call Waiter Button: bo'lim `waiter_call` o'chirilsa yashiriladi */}
          {showCallWaiter && (
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
          )}

          {/* Savat: menyu o'chirilgan bo'lsa buyurtma qilinadigan narsa yo'q */}
          {showMenu && (
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
          )}
        </div>
      </div>
    </header>
  );
};
