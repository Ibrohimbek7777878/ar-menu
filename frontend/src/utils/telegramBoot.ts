/**
 * Telegram Mini App Boot and Initialization Utility (TZ: Stage 5, T4).
 *
 * Faqat Telegram ichida ochilganda ishlaydi:
 * - WebApp.ready() va WebApp.expand()
 * - Brend ranglari (#FFFFFF / #FAF7F2)
 * - start_param orqali stolni aniqlash (t_<token>)
 * - BackButton boshqaruvi
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        BackButton?: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export function initTelegramWebApp(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    return;
  }

  try {
    tg.ready();
    tg.expand();

    if (typeof tg.setHeaderColor === 'function') {
      tg.setHeaderColor('#FFFFFF');
    }
    if (typeof tg.setBackgroundColor === 'function') {
      tg.setBackgroundColor('#FAF7F2');
    }

    // start_param orqali stol QR tokenini aniqlash (t_<token>)
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('t_')) {
      const token = startParam.slice(2).trim();
      const currentPath = window.location.pathname;
      if (!currentPath.includes(`/t/${token}`)) {
        window.location.replace(`/t/${token}/`);
        return;
      }
    }

    // BackButton boshqaruvi
    if (tg.BackButton) {
      const updateBackButton = () => {
        const path = window.location.pathname;
        const isRoot = path === '/' || path === '/restaurant/' || path === '/restaurant';
        if (isRoot) {
          tg.BackButton?.hide();
        } else {
          tg.BackButton?.show();
        }
      };

      tg.BackButton.onClick(() => {
        window.history.back();
      });

      window.addEventListener('popstate', updateBackButton);
      updateBackButton();
    }
  } catch (err) {
    console.warn('Telegram WebApp init warning:', err);
  }
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    // Brauzerda jim e'tiborsiz qoldiriladi
  }
}
