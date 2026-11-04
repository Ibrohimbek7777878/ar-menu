/**
 * Moliya tahrirlash oynalari uslublari. FAQAT `/ra/` tokenlari (admins/shared/src/ui/tokens.css): qattiq rang yo'q.
 * Telefon-birinchi: har boshqaruv >= 44 px, kiritish matni 16 px (iPhone yaqinlashtirib yubormasin).
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

/** Oyna ichidagi aylantiriladigan qism (qisqa ekranda "Saqlash" tugmasi yopishib turadi) */
export const scrollBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxHeight: 'calc(100vh - 150px)',
  overflowY: 'auto',
  margin: '-4px',
  padding: '4px',
};

export const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
};

export const stickyActionsStyle: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '10px',
  padding: '12px 0 4px',
  backgroundColor: 'var(--bg-surface)',
  borderTop: '1px solid var(--border-subtle)',
};

export const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
};

export type NoticeTone = 'info' | 'warn' | 'error' | 'ok';

export function noticeStyle(tone: NoticeTone): CSSProperties {
  const palette: Record<NoticeTone, { bg: string; fg: string; border: string }> = {
    info: { bg: 'var(--accent-indigo-bg)', fg: 'var(--text-main)', border: 'var(--accent-indigo)' },
    warn: { bg: 'var(--accent-amber-bg)', fg: 'var(--text-main)', border: 'var(--accent-amber)' },
    error: { bg: 'var(--accent-rose-bg)', fg: 'var(--text-main)', border: 'var(--accent-rose)' },
    ok: { bg: 'var(--accent-emerald-bg)', fg: 'var(--text-main)', border: 'var(--accent-emerald)' },
  };
  const c = palette[tone];
  return {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: c.bg,
    color: c.fg,
    border: `1px solid ${c.border}`,
    fontSize: '14px',
    lineHeight: 1.5,
  };
}

/** Bosiladigan chip (tayyor sabab, yo'nalish tanlash): faol bo'lsa brend rangida, balandligi >= 44 px */
export function chipStyle(active: boolean): CSSProperties {
  return {
    minHeight: TAP,
    padding: '8px 14px',
    borderRadius: 'var(--radius-full)',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
    backgroundColor: active ? 'var(--brand-bg)' : 'var(--bg-surface)',
    color: 'var(--text-main)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

/** Tugma balandligi (umumiy Button komponenti 44 px dan past) */
export const tapButton: CSSProperties = { minHeight: TAP, minWidth: TAP };

/** Faqat ekran o'quvchi uchun matn */
export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: 'var(--accent-amber-bg)',
  color: 'var(--text-main)',
  border: '1px solid var(--accent-amber)',
  whiteSpace: 'nowrap',
};
