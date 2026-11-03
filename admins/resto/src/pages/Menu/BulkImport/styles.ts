/**
 * Ommaviy qo'shish ekranining umumiy uslublari. Faqat `/ra/` ning mavjud tokenlari (tokens.css): yangi rang/shrift yo'q.
 * Boshqaruvlar telefonda qulay: balandligi >= 44 px, matn 16 px (iPhone yaqinlashtirib yubormasligi uchun).
 */
import type { CSSProperties } from 'react';
import type { RowTone } from './types';

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
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: TAP * 1.5,
  resize: 'vertical',
  lineHeight: 1.4,
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

export const mutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'var(--text-muted)',
  lineHeight: 1.5,
};

export const chipBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1.3,
};

export const TONE_STYLE: Record<RowTone, CSSProperties> = {
  ok: { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' },
  warn: { backgroundColor: 'var(--accent-amber-bg)', borderColor: 'var(--accent-amber-border)' },
  error: { backgroundColor: 'var(--accent-rose-bg)', borderColor: 'var(--accent-rose)' },
  muted: { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', opacity: 0.6 },
};

export const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  minHeight: TAP,
  minWidth: TAP,
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-main)',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};
