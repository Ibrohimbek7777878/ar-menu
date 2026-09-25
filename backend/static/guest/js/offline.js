/* offline.js — Offline/online holatini ko'rsatish */
(function() {
  'use strict';

  let banner = null;

  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      padding: 8px 16px; text-align: center;
      background: #eab308; color: #1a1a1a; font-size: 14px; font-weight: 600;
      transform: translateY(-100%); transition: transform 0.3s;
    `;
    banner.textContent = '📡 Internet yo\'q — offline rejim';
    document.body.appendChild(banner);
    requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
  }

  function hideBanner() {
    if (!banner) return;
    banner.style.transform = 'translateY(-100%)';
    setTimeout(() => { banner.remove(); banner = null; }, 300);
  }

  window.addEventListener('offline', showBanner);
  window.addEventListener('online', () => {
    hideBanner();
    // Offline orderlarni sinxronlash
    if (window.syncOfflineOrders) {
      window.syncOfflineOrders();
    }
  });

  // Dastlabki holat
  if (!navigator.onLine) showBanner();
})();
