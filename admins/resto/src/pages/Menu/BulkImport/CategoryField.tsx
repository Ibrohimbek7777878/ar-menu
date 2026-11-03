import React from 'react';
import { restoUz } from '../../../i18n/uz';
import { NAME_MAX, normalizeName } from './rows';
import { inputStyle } from './styles';
import type { CategoryOption } from './types';

const t = restoUz.bulkImport.review;

const NONE = '';
const TYPING = '__new__';

export interface CategoryValue {
  name: string;
  id: number | null;
  typing: boolean;
}

interface CategoryFieldProps {
  value: CategoryValue;
  /** Menyudagi mavjud bo'limlar. */
  options: CategoryOption[];
  /** O'qish paytida topilgan yangi bo'lim nomlari (tanlash ro'yxatida "yangi" belgisi bilan). */
  newNames: string[];
  onChange: (next: CategoryValue) => void;
  ariaLabel: string;
}

/** Tanlash qiymati: mavjud bo'lim `id:N`, ro'yxatdagi yangi nom `new:Nom`, bo'sh = bo'limsiz, `__new__` = o'zi yozadi. */
function selectValue(value: CategoryValue, newNames: string[]): string {
  if (value.id !== null) return `id:${value.id}`;
  const name = value.name.trim();
  if (value.typing) return TYPING;
  if (!name) return NONE;
  const known = newNames.find((n) => normalizeName(n) === normalizeName(name));
  return known ? `new:${known}` : TYPING;
}

export const CategoryField: React.FC<CategoryFieldProps> = ({ value, options, newNames, onChange, ariaLabel }) => {
  const current = selectValue(value, newNames);

  const handleSelect = (next: string) => {
    if (next === NONE) onChange({ name: '', id: null, typing: false });
    else if (next === TYPING) onChange({ name: '', id: null, typing: true });
    else if (next.startsWith('id:')) {
      const id = Number(next.slice(3));
      const option = options.find((o) => o.id === id);
      onChange({ name: option?.name ?? '', id: option ? id : null, typing: false });
    } else if (next.startsWith('new:')) {
      onChange({ name: next.slice(4), id: null, typing: false });
    }
  };

  // Ro'yxatda bo'lmagan, lekin qatorda turgan yangi nom (masalan, boshqa fayldan) ham tanlanishda ko'rinib tursin
  const extraNew = newNames.filter((n) => !options.some((o) => normalizeName(o.name) === normalizeName(n)));

  // Bo'limlar ro'yxati hali yuklanmagan bo'lsa ham serverdan kelgan bo'lim nomi ko'rinib tursin
  const missingExisting = value.id !== null && !options.some((o) => o.id === value.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <select
        aria-label={ariaLabel}
        value={current}
        onChange={(e) => handleSelect(e.target.value)}
        style={inputStyle}
      >
        <option value={NONE}>{t.noCategory}</option>
        {missingExisting && <option value={`id:${value.id}`}>{value.name}</option>}
        {options.map((o) => (
          <option key={`id:${o.id}`} value={`id:${o.id}`}>
            {o.name}
          </option>
        ))}
        {extraNew.map((n) => (
          <option key={`new:${n}`} value={`new:${n}`}>
            {n} ({t.newCategoryTag})
          </option>
        ))}
        <option value={TYPING}>{t.newCategoryOption}</option>
      </select>
      {current === TYPING && (
        <input
          type="text"
          aria-label={t.newCategoryPlaceholder}
          placeholder={t.newCategoryPlaceholder}
          maxLength={NAME_MAX}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value, id: null, typing: true })}
          style={inputStyle}
        />
      )}
    </div>
  );
};
