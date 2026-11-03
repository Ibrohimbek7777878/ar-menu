/**
 * Bron sahifasi uslublari. FAQAT `/ra/` tokenlari (admins/shared/src/ui/tokens.css): qattiq rang yo'q.
 * Boshqaruvlar telefonda qulay: balandligi >= 44 px, kiritish matni 16 px (iPhone yaqinlashtirib yubormasin).
 */
import type { CSSProperties } from 'react';
import type { StatusTone } from './status';

export const TAP = 44;

export const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: TAP,
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-main)',
  fontSize: '16px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export const inputErrorStyle: CSSProperties = { borderColor: 'var(--accent-rose)' };

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-main)',
};

export const hintStyle: CSSProperties = {
  margin: '4px 0 0 0',
  fontSize: '13px',
  lineHeight: 1.5,
  color: 'var(--text-muted)',
};

export const errorTextStyle: CSSProperties = { ...hintStyle, color: 'var(--accent-rose)' };

export const pageStyle: CSSProperties = {
  padding: '16px',
  maxWidth: '1100px',
  margin: '0 auto',
  boxSizing: 'border-box',
};

export const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: 'var(--text-main)',
};

export const innerCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
};

/** Ekran pastida yopishib turadigan "Saqlash" paneli */
export const stickyBarStyle: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  zIndex: 2,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 0',
  backgroundColor: 'var(--bg-primary)',
  borderTop: '1px solid var(--border-subtle)',
};

/** Bosiladigan chip (filtr, vaqt, hafta kuni): faol bo'lsa brend rangida. Balandligi >= 44 px. */
export function toggleChipStyle(active: boolean, extra?: CSSProperties): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    minHeight: TAP,
    minWidth: TAP,
    padding: '6px 14px',
    borderRadius: 'var(--radius-full)',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
    backgroundColor: active ? 'var(--brand-bg)' : 'var(--bg-surface)',
    color: active ? 'var(--brand)' : 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: active ? 700 : 500,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    ...extra,
  };
}

const TONES: Record<StatusTone, CSSProperties> = {
  brand: { backgroundColor: 'var(--brand-bg)', borderColor: 'var(--brand-border)', color: 'var(--brand)' },
  success: { backgroundColor: 'var(--accent-emerald-bg)', borderColor: 'var(--accent-emerald-border)', color: 'var(--accent-emerald)' },
  danger: { backgroundColor: 'var(--accent-rose-bg)', borderColor: 'var(--accent-rose-border)', color: 'var(--accent-rose)' },
  warn: { backgroundColor: 'var(--accent-amber-bg)', borderColor: 'var(--accent-amber-border)', color: 'var(--accent-amber)' },
  neutral: { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-dim)' },
};

/** Holat belgisi (bosilmaydi) */
export function badgeStyle(tone: StatusTone): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
    ...TONES[tone],
  };
}

export type NoticeTone = 'info' | 'warn' | 'error' | 'success';

const NOTICE_TONES: Record<NoticeTone, CSSProperties> = {
  info: { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' },
  warn: { backgroundColor: 'var(--accent-amber-bg)', borderColor: 'var(--accent-amber-border)' },
  error: { backgroundColor: 'var(--accent-rose-bg)', borderColor: 'var(--accent-rose-border)' },
  success: { backgroundColor: 'var(--accent-emerald-bg)', borderColor: 'var(--accent-emerald-border)' },
};

export function noticeStyle(tone: NoticeTone): CSSProperties {
  return {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    color: 'var(--text-main)',
    fontSize: '14px',
    lineHeight: 1.5,
    ...NOTICE_TONES[tone],
  };
}

/** Telefonda 44 px balandlikdagi tugma (shared Button kichik: bosiladigan joy yetmaydi) */
export const tapButton: CSSProperties = { minHeight: TAP, minWidth: TAP };

/** Ekran o'qiydigan qurilmalar uchun ko'rinmas matn */
export const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};
