import React, { useState } from 'react';
import {
  HeaderNav,
  BottomNav,
  Toast,
} from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './WelcomePage.css';

interface InitialWelcomeData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  cartCount?: number;
}

export const WelcomePage: React.FC = () => {
  const { navigate, setTableNumber, cartCount: navCartCount, setIsQrModalOpen, setIsNfcModalOpen } = useNavigation();
  const initialData: InitialWelcomeData = (window as any).__GULISTON_WELCOME_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const cartCount = navCartCount || initialData.cartCount || 0;

  const [inputTableNum, setInputTableNum] = useState('');

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

  const handleTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTableNum.trim()) {
      showToast("Iltimos, stol raqamini kiriting");
      return;
    }
    setTableNumber(inputTableNum.trim());
    navigate('/menu');
  };

  return (
    <div className="welcome-app-container">
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />

      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={cartCount}
        onCartClick={() => navigate('/cart')}
      />

      <main className="welcome-main-shell">
        {/* Hero Section */}
        <div className="welcome-hero-block">
          <div className="welcome-hero-badge">
            <span className="badge-dot" />
            <span>Xush kelibsiz</span>
          </div>
          <h1 className="welcome-hero-title">{shopName} Restorani</h1>
          <p className="welcome-hero-subtitle">
            Haqiqiy o'zbek milliy taomlari, interaktiv 360° menyu va samimiy mehmondo'stlik.
          </p>

          <button type="button" onClick={() => navigate('/menu')} className="btn-enter-menu-giant">
            <span>Menyuni ko'rish</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 360 Special Banner */}
        <div className="welcome-3d-banner">
          <div className="banner-3d-text">
            <div className="banner-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
                <path d="m3.29 7 8.71 5.37L20.71 7" />
                <path d="M12 12.37V22" />
              </svg>
              <span>360° Taomlar</span>
            </div>
            <h3>Taomlarni 360° ko'rinishda tomosha qiling</h3>
            <p>Taom porsiyasi va tarkibini har taraflama ko'rishingiz mumkin.</p>
          </div>
          <button type="button" onClick={() => navigate('/ar')} className="btn-banner-3d-cta">
            <span>Ko'rish</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Connect Section */}
        <div className="connect-kicker-row">
          <span className="kicker-green-dot" />
          <span>Stolga ulanish usullari</span>
        </div>

        <div className="connect-cards-container">
          {/* 1. QR Code */}
          <div className="connect-option-card">
            <div className="card-icon-title-row">
              <div className="opt-circle-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="5" height="5" x="3" y="3" rx="1" />
                  <rect width="5" height="5" x="16" y="3" rx="1" />
                  <rect width="5" height="5" x="3" y="16" rx="1" />
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
                </svg>
              </div>
              <div className="opt-text-block">
                <h4>QR kodni skanerlash</h4>
                <p>Stol ustidagi QR kodga telefon kamerangizni qarating.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-card-action-outline"
              onClick={() => setIsQrModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2" />
              </svg>
              <span>QR kod generatori &amp; chop etish</span>
            </button>
          </div>

          {/* 2. Manual Table Input */}
          <div className="connect-option-card">
            <div className="card-icon-title-row">
              <div className="opt-circle-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
                </svg>
              </div>
              <div className="opt-text-block">
                <h4>Stol raqamini kiritish</h4>
                <p>Stolingiz ustidagi raqamni yozib menyuga kiring.</p>
              </div>
            </div>
            <form onSubmit={handleTableSubmit} className="table-input-flex-row">
              <input
                type="text"
                className="input-table-quick"
                placeholder="Stol raqami (masalan: 7)"
                value={inputTableNum}
                onChange={(e) => setInputTableNum(e.target.value)}
              />
              <button type="submit" className="btn-table-quick-submit">
                Ulanish
              </button>
            </form>
          </div>

          {/* 3. NFC Tap */}
          <div className="connect-option-card">
            <div className="card-icon-title-row">
              <div className="opt-circle-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36M9.46 6.21a11.76 11.76 0 0 1 0 11.58M12.91 4.1a16.1 16.1 0 0 1 0 15.8" />
                </svg>
              </div>
              <div className="opt-text-block">
                <h4>NFC orqali ulanish</h4>
                <p>Telefoningizni stol burchagidagi NFC belgisiga yaqinlashtiring.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-card-action-outline"
              onClick={() => setIsNfcModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36M9.46 6.21a11.76 11.76 0 0 1 0 11.58M12.91 4.1a16.1 16.1 0 0 1 0 15.8" />
              </svg>
              <span>NFC / Stolni tanlash</span>
            </button>
          </div>

          {/* 4. Find Reservation */}
          <div className="connect-option-card">
            <div className="card-icon-title-row">
              <div className="opt-circle-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div className="opt-text-block">
                <h4>Bron qilingan stolni qidirish</h4>
                <p>Oldindan joy band qilgan bo'lsangiz, raqamingiz orqali toping.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-card-action-outline"
              onClick={() => navigate('/reservation/find')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Bronni tekshirish</span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav
        activeTab="home"
        cartCount={cartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
