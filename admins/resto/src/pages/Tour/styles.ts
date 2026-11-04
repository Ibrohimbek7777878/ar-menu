/**
 * Sayr bo'limi uslublari. FAQAT `/ra/` tokenlari (admins/shared/src/ui/tokens.css): qattiq rang yo'q.
 * Umumiy qismlar Bron sahifasidagi bilan bir xil (bir xil ko'rinish); bu yerda faqat Sayr uchun yangilari.
 */
import type { CSSProperties } from 'react';
import { TAP } from '../Bookings/styles';
import type { StatusTone } from './status';

export {
  TAP,
  badgeStyle,
  errorTextStyle,
  hintStyle,
  inputErrorStyle,
  inputStyle,
  innerCardStyle,
  labelStyle,
  noticeStyle,
  pageStyle,
  sectionTitleStyle,
  srOnly,
  stickyBarStyle,
  tapButton,
  toggleChipStyle,
} from '../Bookings/styles';

export type { StatusTone };

/** Belgi va vaqt chizig'i chiziqlari uchun ranglar (faqat tokenlar). Stol raqami bo'yicha bir xil rang. */
const TABLE_COLORS = ['--action', '--accent-emerald', '--accent-amber', '--accent-rose-solid', '--accent-indigo', '--text-dim'] as const;

export function tableColor(tableId: number | null): string {
  if (tableId === null) return 'var(--text-dim)';
  return `var(${TABLE_COLORS[Math.abs(tableId) % TABLE_COLORS.length]})`;
}

/** Video ustidagi belgi doirasi (to'ldirilgan, oq chegarali) */
export const MARKER = 34;

export const pageTitleStyle: CSSProperties = {
  margin: '0 0 4px 0',
  fontSize: '26px',
  fontWeight: 700,
  color: 'var(--text-main)',
  letterSpacing: '-0.02em',
};

export const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '8px',
};

/** Ro'yxat qatori (nuqta, belgi): tanlangan bo'lsa brend chegarasi */
export function listRowStyle(selected: boolean, highlighted = false): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${selected ? 'var(--brand)' : 'var(--border-subtle)'}`,
    backgroundColor: selected ? 'var(--brand-bg)' : highlighted ? 'var(--bg-elevated)' : 'var(--bg-surface)',
    listStyle: 'none',
  };
}

/** Taklif qatori: punktir chegara (hali qabul qilinmagan) */
export const suggestionRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px dashed var(--brand)',
  backgroundColor: 'var(--bg-elevated)',
  listStyle: 'none',
};

export const listStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, padding: 0 };

/** Kichik yumaloq-burchakli tugma (ro'yxat qatoridagi amallar). Balandligi >= 44 px. */
export const rowButton: CSSProperties = { minHeight: TAP, minWidth: TAP };

export const spinnerStyle = (size = 18): CSSProperties => ({
  display: 'inline-block',
  width: size,
  height: size,
  flexShrink: 0,
  border: '2px solid currentColor',
  borderRightColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
});
