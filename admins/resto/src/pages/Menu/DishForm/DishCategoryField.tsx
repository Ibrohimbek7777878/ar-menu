import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import type { MenuCategory } from '../api';
import { TAP, inputStyle, mutedTextStyle } from '../BulkImport/styles';
import { fill } from '../BulkImport/text';
import { CATEGORY_NAME_MAX, cleanCategoryName, matchCategory } from './categoryMatch';

const t = restoUz.dishForm.category;
const NEW_OPTION = '__new__';

interface DishCategoryFieldProps {
  id: string;
  /** Tanlangan kategoriya id si; bo'sh = kategoriyasiz. */
  value: string;
  categories: MenuCategory[];
  /** Tahrirlanayotgan taomning kategoriyasi ro'yxatda bo'lmasa ham tanlov ko'rinib tursin. */
  fallbackOption?: { id: number; name: string } | null;
  /** Rasmdan taklif qilingan, menyuda yo'q kategoriya nomi. */
  suggestion: string | null;
  onSelect: (id: string) => void;
  /** Yangi kategoriya yaratish (`POST menu/categories/`); takror nom bo'lsa server mavjudini qaytaradi. */
  onCreate: (name: string) => Promise<{ id: number; name: string }>;
  onDismissSuggestion: () => void;
}

/**
 * Kategoriya tanlash + shu joyning o'zida yangi kategoriya qo'shish ("＋ Yangi kategoriya qo'shish"). Menyuda bunday nom
 * bo'lsa yangisi yaratilmaydi, mavjudi tanlanadi. Rasmdan taklif kelsa "Taklif: …" tugmasi bir bosishda yaratib tanlaydi.
 */
export const DishCategoryField: React.FC<DishCategoryFieldProps> = ({
  id,
  value,
  categories,
  fallbackOption = null,
  suggestion,
  onSelect,
  onCreate,
  onDismissSuggestion,
}) => {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const create = async (rawName: string) => {
    const name = cleanCategoryName(rawName);
    if (!name || busy) return;
    setError('');
    setNote('');
    const match = matchCategory(name, categories);
    if (match.kind === 'existing') {
      onSelect(String(match.id));
      setAdding(false);
      setNewName('');
      setNote(fill(t.alreadyExists, { name: match.name }));
      return;
    }
    setBusy(true);
    try {
      const created = await onCreate(name);
      onSelect(String(created.id));
      setAdding(false);
      setNewName('');
    } catch {
      setError(t.createFailed);
    } finally {
      setBusy(false);
    }
  };

  const missingFallback = fallbackOption && !categories.some((c) => c.id === fallbackOption.id) ? fallbackOption : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <select
        id={id}
        value={adding ? NEW_OPTION : value}
        onChange={(e) => {
          setNote('');
          setError('');
          if (e.target.value === NEW_OPTION) {
            setAdding(true);
            return;
          }
          setAdding(false);
          onSelect(e.target.value);
        }}
        style={inputStyle}
      >
        <option value="">{t.none}</option>
        {missingFallback && <option value={String(missingFallback.id)}>{missingFallback.name}</option>}
        {categories.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
        <option value={NEW_OPTION}>{t.addOption}</option>
      </select>

      {adding && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            autoFocus
            aria-label={t.newLabel}
            placeholder={t.newPlaceholder}
            maxLength={CATEGORY_NAME_MAX}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              // Enter butun taom formasini yubormasin: faqat kategoriyani qo'shadi
              if (e.key === 'Enter') {
                e.preventDefault();
                void create(newName);
              }
            }}
            style={{ ...inputStyle, flex: '1 1 160px', width: 'auto' }}
          />
          <Button
            type="button"
            variant="primary"
            loading={busy}
            disabled={!cleanCategoryName(newName)}
            onClick={() => void create(newName)}
            icon={<Plus size={16} />}
            style={{ minHeight: TAP }}
          >
            {t.add}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setAdding(false);
              setNewName('');
              setError('');
            }}
            style={{ minHeight: TAP }}
          >
            {t.cancel}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
          {error}
        </p>
      )}
      {note && <p style={mutedTextStyle}>{note}</p>}

      {suggestion && !adding && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--accent-amber-border)',
              backgroundColor: 'var(--accent-amber-bg)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              overflowWrap: 'anywhere',
            }}
          >
            {fill(t.suggested, { name: suggestion })}
          </span>
          <Button
            type="button"
            variant="secondary"
            loading={busy}
            onClick={() => void create(suggestion)}
            icon={<Plus size={16} />}
            style={{ minHeight: TAP }}
          >
            {t.createSuggested}
          </Button>
          <button
            type="button"
            onClick={onDismissSuggestion}
            aria-label={t.dismissSuggested}
            title={t.dismissSuggested}
            style={{
              minWidth: TAP,
              minHeight: TAP,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
