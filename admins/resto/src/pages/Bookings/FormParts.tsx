import React, { useId } from 'react';
import { t } from '@admins/shared';
import { Minus, Plus } from 'lucide-react';
import { TAP, errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, toggleChipStyle } from './styles';
import { GUESTS_MAX } from './reservationForm';
import { normalizeTime } from './time';

export interface TimeGroup {
  key: string;
  label: string;
  times: string[];
}

interface TimeSelectProps {
  value: string;
  onChange: (time: string) => void;
  groups: TimeGroup[];
  /** Tanlangan stol uchun band vaqtlar (chizib qo'yiladi, lekin tanlash mumkin: oxirgi so'z serverniki) */
  taken: ReadonlySet<string>;
  isPast: (time: string) => boolean;
  error?: string;
}

/** Vaqt tanlash: sozlangan oraliqlar chiplar bilan + erkin "SS:DD" maydoni. */
export const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, groups, taken, isPast, error }) => {
  const id = useId();
  const normalized = normalizeTime(value);
  const hasTaken = groups.some((group) => group.times.some((time) => taken.has(time)));
  return (
    <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }} aria-describedby={error ? `${id}-err` : undefined}>
      <legend style={{ ...labelStyle, padding: 0 }}>{t('Vaqt')}</legend>
      {groups.map((group) =>
        group.times.length === 0 ? null : (
          <div key={group.key} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{group.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {group.times.map((time) => {
                const isTaken = taken.has(time);
                const past = isPast(time);
                return (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={normalized === time}
                    aria-label={isTaken ? t('{time} — band', { time }) : time}
                    onClick={() => onChange(time)}
                    style={toggleChipStyle(normalized === time, {
                      fontVariantNumeric: 'lining-nums',
                      textDecoration: isTaken ? 'line-through' : 'none',
                      opacity: past && normalized !== time ? 0.55 : 1,
                    })}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ),
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label htmlFor={`${id}-free`} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {groups.some((group) => group.times.length > 0) ? t('Boshqa vaqt') : t('Vaqtni kiriting')}
        </label>
        <input
          id={`${id}-free`}
          type="time"
          value={normalized ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          style={{ ...inputStyle, ...(error ? inputErrorStyle : null), width: 'auto', minWidth: 130 }}
        />
      </div>
      {hasTaken && <p style={hintStyle}>{t('Chizilgan vaqtlar shu stolda band.')}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </fieldset>
  );
};

interface GuestsStepperProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

const stepButton: React.CSSProperties = {
  width: TAP,
  height: TAP,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  flexShrink: 0,
};

/** Mehmonlar soni: − [son] + (44 px tugmalar) */
export const GuestsStepper: React.FC<GuestsStepperProps> = ({ value, onChange, error, hint }) => {
  const id = useId();
  const current = /^\d+$/.test(value.trim()) ? Number(value) : 0;
  const bump = (delta: number) => onChange(String(Math.min(GUESTS_MAX, Math.max(1, current + delta))));
  const messageId = error || hint ? `${id}-msg` : undefined;
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {t('Mehmonlar soni')}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" style={stepButton} onClick={() => bump(-1)} disabled={current <= 1} aria-label={t('Bittaga kamaytirish')}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            const next = e.target.value.replace(/\s+/g, '');
            if (next === '' || /^\d{1,3}$/.test(next)) onChange(next);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          style={{ ...inputStyle, ...(error ? inputErrorStyle : null), width: 84, textAlign: 'center' }}
        />
        <button type="button" style={stepButton} onClick={() => bump(1)} disabled={current >= GUESTS_MAX} aria-label={t("Bittaga ko'paytirish")}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p id={messageId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} style={hintStyle}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

interface ChoiceChipsProps {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}

/** Bittasini tanlash (tadbir turi): chiplar. */
export const ChoiceChips: React.FC<ChoiceChipsProps> = ({ label, value, options, onChange }) => (
  <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
    <legend style={{ ...labelStyle, padding: 0 }}>{label}</legend>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((option) => (
        <button key={option.key} type="button" aria-pressed={value === option.key} onClick={() => onChange(option.key)} style={toggleChipStyle(value === option.key)}>
          {option.label}
        </button>
      ))}
    </div>
  </fieldset>
);
