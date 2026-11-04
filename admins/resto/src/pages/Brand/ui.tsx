/**
 * Brend sahifasining umumiy qismlari: bo'lim kartasi va bitta variantni tanlash kartochkalari (radio).
 * Matn/almashtirgich/xabar/tasdiq oynasi Bron sahifasidagi bilan bir xil (`../Bookings/ui`).
 */
import React, { useId, useState } from 'react';
import { Card } from '@admins/shared';
import type { Brand } from './types';
import { hintStyle, optionCardStyle, optionGridStyle, sectionGap, sectionTitleStyle, srOnly } from './styles';

export { ConfirmDialog, Notice, SwitchRow, TextArea, TextField } from '../Bookings/ui';

/** Sarlavhali va izohli bo'lim kartasi */
export const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <Card style={sectionGap}>
    <div>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
    {children}
  </Card>
);

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /** Kartochka tepasidagi belgi/namuna */
  visual?: React.ReactNode;
}

interface RadioCardsProps<T extends string> {
  legend: string;
  value: T;
  options: readonly RadioOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * Bitta variantni tanlash. Haqiqiy `<input type="radio">` (klaviatura: strelkalar, ekran o'qiydigan qurilmalar) —
 * ko'rinmas, fokus kartochka atrofidagi halqa bilan ko'rsatiladi.
 */
export function RadioCards<T extends string>({ legend, value, options, onChange, disabled = false }: RadioCardsProps<T>): React.ReactElement {
  const name = useId();
  const [focused, setFocused] = useState<T | null>(null);
  return (
    <fieldset disabled={disabled} style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
      <legend style={srOnly}>{legend}</legend>
      <div style={optionGridStyle}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} style={optionCardStyle(selected, focused === option.value)}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                onFocus={(event) => setFocused(event.target.matches(':focus-visible') ? option.value : null)}
                onBlur={() => setFocused((current) => (current === option.value ? null : current))}
                style={srOnly}
              />
              {option.visual}
              <span style={{ fontSize: '15px', fontWeight: 700, color: selected ? 'var(--brand)' : 'var(--text-main)' }}>{option.label}</span>
              {option.hint && <span style={{ fontSize: '13px', lineHeight: 1.4, color: 'var(--text-muted)' }}>{option.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Hamma bo'lim kartalari oladigan umumiy qiymatlar */
export interface SectionProps {
  draft: Brand;
  saved: Brand;
  /** Maydon yo'li ("hero.title") -> xato matni (bo'lmasa `undefined`) */
  messageFor: (path: string) => string | undefined;
  edit: (update: (current: Brand) => Brand) => void;
}
