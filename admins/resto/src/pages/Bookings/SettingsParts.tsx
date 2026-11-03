/** Bron sozlamalari muharririning kichik qismlari: tarjima maydonlari (yig'ilgan), "nom + Qo'shish" qatori, surish/o'chirish tugmalari. */
import React, { useId, useState } from 'react';
import { Button, t } from '@admins/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { TAP, hintStyle, inputStyle, labelStyle, tapButton } from './styles';
import { LIMITS } from './settingsModel';
import { TextField } from './ui';

interface TranslationsProps {
  ru: string;
  en: string;
  onChange: (lang: 'ru' | 'en', value: string) => void;
  /** Maydon yonidagi xato matnlari (server `label_ru` / `label_en` bo'yicha) */
  ruError?: string;
  enError?: string;
}

/** Ixtiyoriy ruscha va inglizcha nom: odatda yig'ilgan, kerak bo'lsa ochiladi. */
export const NameTranslations: React.FC<TranslationsProps> = ({ ru, en, onChange, ruError, enError }) => {
  const filled = [ru, en].filter((value) => value.trim()).length;
  return (
    <details open={Boolean(ruError || enError) || undefined}>
      <summary style={{ minHeight: TAP, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: '14px' }}>
        {t('Boshqa tilda nomi (ixtiyoriy)')}
        {filled > 0 && <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 500 }}>({filled})</span>}
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
        <TextField label={t('Ruscha nomi')} value={ru} maxLength={LIMITS.labelLength} onChange={(e) => onChange('ru', e.target.value)} error={ruError} autoComplete="off" />
        <TextField label={t('Inglizcha nomi')} value={en} maxLength={LIMITS.labelLength} onChange={(e) => onChange('en', e.target.value)} error={enError} autoComplete="off" />
        <p style={{ ...hintStyle, margin: 0 }}>{t("Mehmon sayti shu tilda ochilganda shu nom ko'rinadi. Bo'sh qoldirsangiz asosiy nom chiqadi.")}</p>
      </div>
    </details>
  );
};

interface AddRowProps {
  label: string;
  placeholder: string;
  buttonLabel: string;
  disabled?: boolean;
  /** Qo'shilsa true (maydon tozalanadi) */
  onAdd: (label: string) => void;
  hint?: string;
}

/** "Nom yozing + Qo'shish" qatori (Enter ham qo'shadi). */
export const AddRow: React.FC<AddRowProps> = ({ label, placeholder, buttonLabel, disabled, onAdd, hint }) => {
  const id = useId();
  const [text, setText] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = text.trim();
    if (!name || disabled) return;
    onAdd(name);
    setText('');
  };
  return (
    <form onSubmit={submit} style={{ margin: 0 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={LIMITS.labelLength}
          autoComplete="off"
          disabled={disabled}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <Button type="submit" variant="secondary" disabled={disabled || !text.trim()} style={tapButton}>
          <Plus size={18} aria-hidden="true" />
          {buttonLabel}
        </Button>
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
    </form>
  );
};

interface RowActionsProps {
  index: number;
  count: number;
  onMove: (delta: number) => void;
  /** O'chirish mumkin emas bo'lsa tugma ko'rsatilmaydi */
  onRemove?: () => void;
  moveUpLabel: string;
  moveDownLabel: string;
  removeLabel: string;
}

const iconButton: React.CSSProperties = { ...tapButton, padding: 0, width: TAP };

/** Tartibni surish (yuqori/past) va o'chirish: har tugma 44x44 px. */
export const RowActions: React.FC<RowActionsProps> = ({ index, count, onMove, onRemove, moveUpLabel, moveDownLabel, removeLabel }) => (
  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
    <Button type="button" variant="ghost" onClick={() => onMove(-1)} disabled={index <= 0} aria-label={moveUpLabel} title={moveUpLabel} style={iconButton}>
      <ArrowUp size={18} aria-hidden="true" />
    </Button>
    <Button type="button" variant="ghost" onClick={() => onMove(1)} disabled={index >= count - 1} aria-label={moveDownLabel} title={moveDownLabel} style={iconButton}>
      <ArrowDown size={18} aria-hidden="true" />
    </Button>
    {onRemove && (
      <Button type="button" variant="ghost" onClick={onRemove} aria-label={removeLabel} title={removeLabel} style={{ ...iconButton, color: 'var(--accent-rose)' }}>
        <Trash2 size={18} aria-hidden="true" />
      </Button>
    )}
  </div>
);
