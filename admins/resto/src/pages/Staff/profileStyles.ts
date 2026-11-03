/**
 * Xodim profili uslublari. FAQAT `/ra/` tokenlari (admins/shared/src/ui/tokens.css): qattiq rang yo'q.
 * Boshqaruvlar telefonda qulay: balandligi >= 44 px, kiritish matni 16 px (iPhone yaqinlashtirib yubormasin).
 */
import type { CSSProperties } from 'react';

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

export const inputErrorStyle: CSSProperties = {
  borderColor: 'var(--accent-rose)',
};

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

export const errorTextStyle: CSSProperties = {
  ...hintStyle,
  color: 'var(--accent-rose)',
};

export const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

export const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
};

/** `<form>` ichidagi `<fieldset disabled>` (faqat o'qish holatida hamma boshqaruv o'chadi) karta ko'rinishida. */
export const formResetStyle: CSSProperties = { margin: 0 };

export const fieldsetCardStyle: CSSProperties = {
  ...cardStyle,
  margin: 0,
  minWidth: 0,
  border: '1px solid var(--border-subtle)',
};

export const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-main)',
};

/** Ekran pastida yopishib turadigan "Saqlash" paneli (uzun ro'yxatda ham tugma ko'rinib tursin). */
export const stickyBarStyle: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  zIndex: 2,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  padding: '12px 0 2px 0',
  backgroundColor: 'var(--bg-surface)',
  borderTop: '1px solid var(--border-subtle)',
};

export const buttonTap: CSSProperties = { minHeight: TAP, minWidth: TAP };

export type ChipTone = 'brand' | 'success' | 'danger' | 'warn' | 'neutral';

const CHIP_TONES: Record<ChipTone, CSSProperties> = {
  brand: { backgroundColor: 'var(--brand-bg)', borderColor: 'var(--brand-border)', color: 'var(--brand)' },
  success: { backgroundColor: 'var(--accent-emerald-bg)', borderColor: 'var(--accent-emerald-border)', color: 'var(--accent-emerald)' },
  danger: { backgroundColor: 'var(--accent-rose-bg)', borderColor: 'var(--accent-rose-border)', color: 'var(--accent-rose)' },
  warn: { backgroundColor: 'var(--accent-amber-bg)', borderColor: 'var(--accent-amber-border)', color: 'var(--accent-amber)' },
  neutral: { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-dim)' },
};

export function chipStyle(tone: ChipTone): CSSProperties {
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
    ...CHIP_TONES[tone],
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
