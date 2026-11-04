import React, { useId, useMemo } from 'react';
import { t } from '@admins/shared';
import { errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle } from './styles';
import type { TableOption } from './types';

/** "03-stol · Asosiy zal · 8 kishi": bo'sh qismlar tashlanadi */
export function tableOptionLabel(table: Pick<TableOption, 'number' | 'hall' | 'capacity'>): string {
  return [t('{number}-stol', { number: table.number }), table.hall, table.capacity > 0 ? t('{n} kishi', { n: table.capacity }) : ''].filter(Boolean).join(' · ');
}

interface Props {
  label: string;
  tables: TableOption[];
  value: number | null;
  /** Ro'yxatda yo'q stol tanlangan bo'lsa (arxivlangan) uning nomi */
  fallbackLabel?: string;
  onChange: (tableId: number | null) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

/** Stol tanlash (select). Balandligi >= 44 px, matni 16 px (iPhone yaqinlashtirib yubormasin). */
export const TableSelect: React.FC<Props> = ({ label, tables, value, fallbackLabel, onChange, disabled, error, hint }) => {
  const id = useId();
  const sorted = useMemo(() => [...tables].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })), [tables]);
  const known = value === null || sorted.some((table) => table.id === value);
  const messageId = error || hint ? `${id}-msg` : undefined;
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <select
        id={id}
        value={value === null ? '' : String(value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        style={{ ...inputStyle, ...(error ? inputErrorStyle : null) }}
      >
        <option value="">{t('Stolni tanlang')}</option>
        {!known && value !== null && <option value={String(value)}>{fallbackLabel || t('Boshqa stol')}</option>}
        {sorted.map((table) => (
          <option key={table.id} value={String(table.id)}>
            {tableOptionLabel(table)}
          </option>
        ))}
      </select>
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
