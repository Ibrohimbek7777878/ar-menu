/**
 * Brend sahifasi uslublari. FAQAT `/ra/` tokenlari (admins/shared/src/ui/tokens.css): qattiq rang yo'q.
 * Umumiy qismlar Bron sahifasidagi bilan bir xil (bir xil ko'rinish); bu yerda faqat Brend uchun yangilari.
 */
import type { CSSProperties } from 'react';
import { TAP } from '../Bookings/styles';

export {
  TAP,
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

/** Tanlanadigan kartochka (palitra, shrift, biznes turi): tanlangan bo'lsa brend chegarasi va fonida. Balandligi >= 44 px. */
export function optionCardStyle(selected: boolean, focused: boolean): CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: TAP,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: `2px solid ${selected ? 'var(--brand)' : 'var(--border-strong)'}`,
    backgroundColor: selected ? 'var(--brand-bg)' : 'var(--bg-surface)',
    color: 'var(--text-main)',
    cursor: 'pointer',
    boxSizing: 'border-box',
    outline: focused ? '3px solid var(--focus-ring)' : 'none',
    outlineOffset: focused ? '2px' : 0,
  };
}

export const optionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '10px',
};

export const sectionGap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '14px' };

/** Matn maydonlari qatori: kengda yonma-yon, torda ustma-ust */
export const fieldRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};
