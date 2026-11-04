/**
 * Telegram Mini App Boot and Initialization Utility (TZ: Stage 5, T4).
 *
 * Faqat Telegram ichida ochilganda ishlaydi:
 * - WebApp.ready() va WebApp.expand()
 * - Brend ranglari (palitraga mos: klassik #FFFFFF / #F7F3EA, apelsin #FFFFFF / #FAF7F2)
 * - start_param orqali stolni aniqlash (t_<token>)
 * - BackButton boshqaruvi
 */

import { BOOT_BACKGROUND_ORANGE, chromeColors, currentPalette, PALETTE_CHROME } from './guestPalette.ts';

const HEX32 = /^[0-9a-f]{32}$/;
const UUID_DASHED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Stol QR tokenini backend marshruti kutadigan shaklga keltiradi.
 *
 * Backend `t/<uuid:token>/` (Django `uuid` konvertori) faqat KICHIK harfli TIRELI
 * UUID (8-4-4-4-12) ni qabul qiladi. Telegram `startapp` esa 32 belgili tiresiz hex
 * yuboradi (`t_<qr_token_hex>`, TZ T3), shuning uchun:
 *   - 32 belgili tiresiz hex  -> tireli UUID ga aylantiriladi
 *   - allaqachon tireli UUID  -> o'zgarmaydi (faqat kichik harfga o'tkaziladi)
 *   - boshqa har qanday qiymat -> null (yo'naltirilmaydi)
 */
export function normalizeTableToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (HEX32.test(value)) {
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
  if (UUID_DASHED.test(value)) return value;
  return null;
}

/** `t_<token>` ko'rinishidagi start_param dan tekshirilgan stol tokenini ajratadi (aks holda null). */
export function parseTableStartParam(startParam: unknown): string | null {
  if (typeof startParam !== 'string' || !startParam.startsWith('t_')) return null;
  return normalizeTableToken(startParam.slice(2));
}

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

    // Boshlang'ich (kunduzgi) rang — palitraga mos; kun/tun yoqilgan bo'lsa guestTheme keyin o'z rangini qo'yadi
    const palette = currentPalette();
    const boot = chromeColors(palette, 'light');
    if (typeof tg.setHeaderColor === 'function') {
      tg.setHeaderColor(boot.header);
    }
    if (typeof tg.setBackgroundColor === 'function') {
      tg.setBackgroundColor(palette === 'orange' ? BOOT_BACKGROUND_ORANGE : palette === 'custom' ? boot.background : PALETTE_CHROME.classic.light.background);
    }

    // start_param orqali stol QR tokenini aniqlash (t_<token>)
    // Faqat tekshirilgan (UUID) token bilan yo'naltiriladi; yaroqsiz bo'lsa hech narsa qilinmaydi.
    const token = parseTableStartParam(tg.initDataUnsafe?.start_param);
    if (token) {
      const currentPath = window.location.pathname;
      const tableParam = new URLSearchParams(window.location.search ?? '').get('table');
      // Allaqachon /t/<token>/ da yoki /menu/?table=<token> ga yo'naltirilgan bo'lsa, qayta yo'naltirmaymiz (sikl yo'q)
      const alreadyThere = currentPath.includes(`/t/${token}`) || normalizeTableToken(tableParam) === token;
      if (!alreadyThere) {
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
