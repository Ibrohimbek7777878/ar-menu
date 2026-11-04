/**
 * Sayr sahifasining umumiy qismlari. Matn/xabar/tasdiq oynasi Bron sahifasidagi bilan bir xil (`../Bookings/ui`).
 */
import React, { useEffect, useId, useState } from 'react';
import { t } from '@admins/shared';
import { badgeStyle, errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, spinnerStyle, toggleChipStyle } from './styles';
import { statusTone } from './status';
import { statusLabel } from './labels';
import { formatTime, parseTime, round } from './time';
import type { TourStatus } from './types';

export { ConfirmDialog, ModalBody, Notice, TextField } from '../Bookings/ui';

export const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => <span aria-hidden="true" style={spinnerStyle(size)} />;

export const StatusBadge: React.FC<{ status: TourStatus; serverLabel?: string }> = ({ status, serverLabel }) => (
  <span style={badgeStyle(statusTone(status))}>{statusLabel(status, serverLabel)}</span>
);

/** Kichik bosiladigan chip (vaqtni siljitish, tayyor uzunlik). Balandligi >= 44 px. */
export const Chip: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active = false, style, children, ...rest }) => (
  <button type="button" style={{ ...toggleChipStyle(active), padding: '6px 12px', ...style }} {...rest}>
    {children}
  </button>
);

interface TimeFieldProps {
  label: string;
  value: number;
  /** Yangi (yaroqli) vaqt */
  onCommit: (seconds: number) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Vaqt maydoni (`mm:ss.s` yoki soniya). Yozish paytida erkin; Enter yoki maydondan chiqqanda o'qiladi:
 * tushunarsiz bo'lsa eski qiymat qaytadi va xato ko'rsatiladi.
 */
export const TimeField: React.FC<TimeFieldProps> = ({ label, value, onCommit, error, hint, disabled }) => {
  const id = useId();
  const [text, setText] = useState(formatTime(value));
  const [typing, setTyping] = useState(false);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    if (!typing) setText(formatTime(value));
  }, [value, typing]);

  const commit = () => {
    setTyping(false);
    const parsed = parseTime(text);
    if (parsed === null) {
      setParseError(true);
      setText(formatTime(value));
      return;
    }
    setParseError(false);
    const next = round(parsed, 2);
    if (next !== round(value, 2)) onCommit(next);
    setText(formatTime(next));
  };

  const message = error || (parseError ? t("Vaqtni 0:12.5 yoki 12.5 ko'rinishida yozing.") : '');
  const messageId = message || hint ? `${id}-msg` : undefined;
  return (
    <div style={{ minWidth: 0 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={text}
        aria-invalid={message ? true : undefined}
        aria-describedby={messageId}
        onFocus={(event) => {
          setTyping(true);
          event.currentTarget.select();
        }}
        onChange={(event) => {
          setTyping(true);
          setParseError(false);
          setText(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            setTyping(false);
            setParseError(false);
            setText(formatTime(value));
            event.currentTarget.blur();
          }
        }}
        style={{ ...inputStyle, ...(message ? inputErrorStyle : null), fontVariantNumeric: 'tabular-nums' }}
      />
      {message ? (
        <p id={messageId} role="alert" style={errorTextStyle}>
          {message}
        </p>
      ) : hint ? (
        <p id={messageId} style={hintStyle}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};
