import React, { useId, useState } from 'react';
import { t } from '@admins/shared';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { AA_NORMAL, darkenToReadable, formatRatio, normalizeHex, readabilityOnWhite, typedHex } from './colors';
import { PRESET_COLORS, SWATCHES } from './brandModel';
import { SWATCH_LABEL } from './labels';
import { TAP, errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle } from './styles';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Tayyor 8 ta rang qatori */
  swatches?: boolean;
  /** Oq matn ustidagi jonli kontrast hisoblagich (asosiy rang uchun) */
  meter?: boolean;
}

const sampleStyle = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: TAP,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: color,
  color: 'var(--text-inverse)',
  fontSize: '14px',
  fontWeight: 600,
});

/**
 * Rang tanlash: tizim rang tanlagichi + rang kodi maydoni (yozganda darrov o'zgaradi) + tayyor ranglar + oq matn ustidagi kontrast.
 * Foydalanuvchi tanlagan rang FAQAT inline uslub sifatida (ma'lumot), tema tokenlari emas.
 */
export const ColorField: React.FC<Props> = ({ label, value, onChange, error, hint, swatches = false, meter = false }) => {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const normalized = normalizeHex(value, false);
  // Tizim tanlagichi faqat to'liq rangni qabul qiladi; yozish tugamaguncha oxirgi to'g'ri qiymat (yoki standart) ko'rsatiladi
  const pickerValue = (normalized ?? PRESET_COLORS.classic.primary).toLowerCase();
  const typedInvalid = value !== '' && !normalized;
  const message = error ?? (touched && typedInvalid ? t("Rang kodi 6 ta belgidan iborat bo'lsin, masalan: 2F4836") : undefined);
  const describedBy = message || hint ? `${id}-msg` : undefined;
  const readability = readabilityOnWhite(normalized);
  const suggestion = meter && readability.verdict === 'adjust' ? darkenToReadable(normalized) : null;

  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        <input
          type="color"
          aria-label={t('Rang tanlagich')}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          style={{ width: 56, minHeight: TAP, flexShrink: 0, padding: 2, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer' }}
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={7}
          value={value}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(typedHex(event.target.value))}
          onBlur={() => setTouched(true)}
          style={{ ...inputStyle, ...(message ? inputErrorStyle : null), maxWidth: '160px', fontFamily: 'var(--font-numeric)', letterSpacing: '0.04em' }}
        />
      </div>
      {message ? (
        <p id={`${id}-msg`} role="alert" style={errorTextStyle}>
          {message}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} style={hintStyle}>
          {hint}
        </p>
      ) : null}

      {swatches && (
        <div role="group" aria-label={t('Tayyor ranglar')} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {SWATCHES.map((swatch) => {
            const selected = normalized === swatch.hex;
            const name = SWATCH_LABEL[swatch.id] ? t(SWATCH_LABEL[swatch.id]) : swatch.id;
            return (
              <button
                key={swatch.id}
                type="button"
                aria-label={name}
                title={name}
                aria-pressed={selected}
                onClick={() => {
                  setTouched(false);
                  onChange(swatch.hex);
                }}
                style={{ width: TAP, height: TAP, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: swatch.hex,
                    border: `3px solid ${selected ? 'var(--text-main)' : 'var(--border-strong)'}`,
                    boxSizing: 'border-box',
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {meter && readability.verdict !== 'invalid' && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: readability.verdict === 'ok' ? 'var(--accent-emerald-border)' : 'var(--accent-amber-border)',
            backgroundColor: readability.verdict === 'ok' ? 'var(--accent-emerald-bg)' : 'var(--accent-amber-bg)',
            color: 'var(--text-main)',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            {readability.verdict === 'ok' ? (
              <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-emerald)' }} />
            ) : (
              <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-amber)' }} />
            )}
            <div>
              <strong>{t('Oq matn ustida: {ratio} : 1', { ratio: formatRatio(readability.ratio) })}</strong>{' '}
              <span>
                {readability.verdict === 'ok'
                  ? t("Mos: tugmadagi oq matn yaxshi o'qiladi.")
                  : t("O'zgartiriladi: oq matn yaxshi o'qilmaydi ({min} : 1 kerak), rang biroz to'qroq qilinadi.", { min: formatRatio(AA_NORMAL) })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={sampleStyle(normalized as string)}>{t('Tugma namunasi')}</span>
            {suggestion && (
              <>
                <span aria-hidden="true">→</span>
                <span style={sampleStyle(suggestion)}>{t('Saytda taxminan shunday')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
