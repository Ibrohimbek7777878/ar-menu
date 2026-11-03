/**
 * Profil oynasining kichik umumiy qismlari: matn maydoni (yorliq + xato + izoh), almashtirgich (switch), chip, xabar bloki.
 * Faqat tokenlar; har boshqaruv >= 44 px.
 */
import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import {
  TAP,
  chipStyle,
  errorTextStyle,
  hintStyle,
  inputErrorStyle,
  inputStyle,
  labelStyle,
  noticeStyle,
} from './profileStyles';
import type { ChipTone, NoticeTone } from './profileStyles';

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'style' | 'className'> {
  id: string;
  label: string;
  /** Server/tasdiqlash xatosi (ekran o'qiydigan qurilmaga darhol e'lon qilinadi). */
  error?: string;
  /** Yozish paytidagi yumshoq ogohlantirish (e'lon qilinmaydi, har harfda bezovta qilmasin). */
  warning?: string;
  hint?: string;
  /** Maydon ichining o'ng tomonidagi tugma (masalan, parolni ko'rsatish). */
  endSlot?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const TextField: React.FC<TextFieldProps> = ({ id, label, error, warning, hint, endSlot, inputRef, ...input }) => {
  const problem = error || warning;
  const messageId = problem || hint ? `${id}-msg` : undefined;
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          ref={inputRef}
          aria-invalid={problem ? true : undefined}
          aria-describedby={messageId}
          style={{ ...inputStyle, ...(problem ? inputErrorStyle : null), ...(endSlot ? { paddingRight: TAP + 8 } : null) }}
          {...input}
        />
        {endSlot && <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>{endSlot}</div>}
      </div>
      {error ? (
        <p id={messageId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : warning ? (
        <p id={messageId} style={errorTextStyle}>
          {warning}
        </p>
      ) : hint ? (
        <p id={messageId} style={hintStyle}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Ekran o'qiydigan nom: ruxsat nomi. */
  label: string;
  describedBy?: string;
}

/** Yoqish/o'chirish almashtirgichi. Bosiladigan joy 56x44 px; ko'rinishi 48x28. Holat rangdan tashqari holat/chip matni bilan ham beriladi. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label, describedBy }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: TAP,
      padding: 0,
      border: 'none',
      background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'block',
        width: 48,
        height: 28,
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-full)',
        border: `2px solid ${checked ? 'var(--action)' : 'var(--text-dim)'}`,
        backgroundColor: checked ? 'var(--action)' : 'var(--bg-surface)',
        transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-full)',
          backgroundColor: checked ? 'var(--text-inverse)' : 'var(--text-dim)',
          transition: 'left var(--transition-fast), background-color var(--transition-fast)',
        }}
      />
    </span>
  </button>
);

export const Chip: React.FC<{ tone: ChipTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span style={chipStyle(tone)}>{children}</span>
);

const NOTICE_ICON: Record<NoticeTone, React.ReactNode> = {
  info: <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />,
  warn: <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-amber)' }} />,
  error: <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-rose)' }} />,
  success: <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-emerald)' }} />,
};

export const Notice: React.FC<{ tone?: NoticeTone; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} style={noticeStyle(tone)}>
    {NOTICE_ICON[tone]}
    <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</div>
  </div>
);
