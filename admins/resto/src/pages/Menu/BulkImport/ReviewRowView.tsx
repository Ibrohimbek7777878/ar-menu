import React, { memo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { CategoryField } from './CategoryField';
import type { CategoryValue } from './CategoryField';
import { ImageCell } from './ImageCell';
import { ImageSearchPanel } from './ImageSearchPanel';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  describeRowError,
  formatPrice,
  nameExistsActive,
  parsePriceInput,
} from './rows';
import type { ReviewRowPatch } from './rows';
import { TAP, TONE_STYLE, chipBase, inputStyle, labelStyle, mutedTextStyle, textareaStyle } from './styles';
import { fill } from './text';
import { rowTone, warningSeverity } from './warnings';
import type { CategoryOption, ExistingChoice, ReviewRow, RowError, WarningCode } from './types';

const t = restoUz.bulkImport.review;

/** Keng ko'rinishdagi ustunlar (sarlavha qatori ham shundan foydalanadi). */
export const WIDE_COLUMNS = '48px minmax(150px, 1.3fr) 130px minmax(160px, 1fr) minmax(170px, 1.3fr) 200px';

const EXISTING_CHOICES: ExistingChoice[] = ['update', 'skip', 'create'];

interface ReviewRowViewProps {
  row: ReviewRow;
  warnings: WarningCode[];
  errors: RowError[] | undefined;
  wide: boolean;
  categories: CategoryOption[];
  newCategoryNames: string[];
  onChange: (id: string, patch: ReviewRowPatch) => void;
  onFixPrice: (id: string) => void;
}

function chipStyle(code: WarningCode): React.CSSProperties {
  const severity = warningSeverity(code);
  if (severity === 'error') {
    return { ...chipBase, backgroundColor: 'var(--accent-rose-bg)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)' };
  }
  if (severity === 'warn') {
    return { ...chipBase, backgroundColor: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', border: '1px solid var(--accent-amber-border)' };
  }
  return { ...chipBase, backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' };
}

const ReviewRowViewBase: React.FC<ReviewRowViewProps> = ({
  row,
  warnings,
  errors,
  wide,
  categories,
  newCategoryNames,
  onChange,
  onFixPrice,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const tone = errors?.length ? 'error' : rowTone(warnings, row.include);
  const nameLabel = row.name.trim() || t.unnamed;
  const showExisting = row.include && nameExistsActive(row);
  const fieldWrap: React.CSSProperties = wide ? { minWidth: 0 } : { gridColumn: 2, minWidth: 0 };

  const label = (text: string) =>
    wide ? null : (
      <span style={labelStyle} aria-hidden="true">
        {text}
      </span>
    );

  const category: CategoryValue = { name: row.category, id: row.categoryId, typing: row.typingNewCategory };

  return (
    <div
      id={`bulk-row-${row.id}`}
      style={{
        ...TONE_STYLE[tone],
        border: '1px solid',
        borderRadius: 'var(--radius-lg)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        scrollMarginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: wide ? WIDE_COLUMNS : '48px minmax(0, 1fr)',
          gap: '10px 12px',
          alignItems: 'start',
        }}
      >
        <label
          style={{
            width: TAP,
            height: TAP,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={row.include}
            aria-label={fill(t.includeAria, { name: nameLabel })}
            onChange={(e) => onChange(row.id, { include: e.target.checked })}
            style={{ width: 22, height: 22, accentColor: 'var(--action)', cursor: 'pointer' }}
          />
        </label>

        <div style={{ minWidth: 0 }}>
          {label(t.columns.name)}
          <input
            type="text"
            value={row.name}
            maxLength={NAME_MAX}
            placeholder={t.namePlaceholder}
            aria-label={t.columns.name}
            onChange={(e) => onChange(row.id, { name: e.target.value })}
            style={{ ...inputStyle, fontWeight: 600 }}
          />
        </div>

        <div style={fieldWrap}>
          {label(t.columns.price)}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={row.price === null ? '' : String(row.price)}
            placeholder={t.pricePlaceholder}
            aria-label={t.columns.price}
            onChange={(e) => onChange(row.id, { price: parsePriceInput(e.target.value) })}
            style={inputStyle}
          />
          {row.price !== null && row.price > 0 && (
            <span style={{ ...mutedTextStyle, fontSize: '12px' }}>{fill(t.priceShown, { price: formatPrice(row.price) })}</span>
          )}
        </div>

        <div style={fieldWrap}>
          {label(t.columns.category)}
          <CategoryField
            value={category}
            options={categories}
            newNames={newCategoryNames}
            ariaLabel={t.columns.category}
            onChange={(next) =>
              onChange(row.id, { category: next.name, categoryId: next.id, typingNewCategory: next.typing })
            }
          />
        </div>

        <div style={fieldWrap}>
          {label(t.columns.description)}
          <textarea
            rows={2}
            value={row.description}
            maxLength={DESCRIPTION_MAX}
            placeholder={t.descriptionPlaceholder}
            aria-label={t.columns.description}
            onChange={(e) => onChange(row.id, { description: e.target.value })}
            style={textareaStyle}
          />
        </div>

        <div style={fieldWrap}>
          {label(t.columns.image)}
          <ImageCell
            name={nameLabel}
            value={row.image}
            onChange={(image) => onChange(row.id, { image })}
            onFind={() => setSearchOpen((prev) => !prev)}
            findOpen={searchOpen}
          />
        </div>
      </div>

      {(warnings.length > 0 || showExisting) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: wide ? 60 : 0 }}>
          {warnings.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {warnings.map((code) => (
                <span key={code} style={chipStyle(code)}>
                  {warningSeverity(code) === 'info' ? <Info size={13} /> : <TriangleAlert size={13} />}
                  {restoUz.bulkImport.warnings[code]}
                </span>
              ))}
              {warnings.includes('price_small') && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  title={t.fixThousandTitle}
                  onClick={() => onFixPrice(row.id)}
                  style={{ minHeight: TAP }}
                >
                  {t.fixThousand}
                </Button>
              )}
            </div>
          )}

          {showExisting && (
            <div role="group" aria-label={t.existingTitle} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ ...mutedTextStyle, fontWeight: 600 }}>{t.existingTitle}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {EXISTING_CHOICES.map((choice) => {
                  const active = row.existingChoice === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange(row.id, { existingChoice: choice })}
                      style={{
                        minHeight: TAP,
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: active ? '2px solid var(--action)' : '1px solid var(--border-strong)',
                        backgroundColor: active ? 'var(--accent-amber-bg)' : 'var(--bg-surface)',
                        color: active ? 'var(--accent-amber)' : 'var(--text-main)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t.existing[choice]}
                    </button>
                  );
                })}
              </div>
              {row.existingChoice === 'update' && <span style={{ ...mutedTextStyle, fontSize: '12px' }}>{t.existingUpdateHint}</span>}
              {row.existingChoice === 'skip' && <span style={{ ...mutedTextStyle, fontSize: '12px' }}>{t.skippedRow}</span>}
            </div>
          )}
        </div>
      )}

      {errors && errors.length > 0 && (
        <ul
          role="alert"
          style={{
            margin: 0,
            padding: '8px 12px 8px 28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {errors.map((error, index) => (
            <li key={index}>{describeRowError(error, restoUz.bulkImport.fieldLabels)}</li>
          ))}
        </ul>
      )}

      {searchOpen && (
        <ImageSearchPanel
          initialQuery={row.name}
          onPicked={(image) => {
            onChange(row.id, { image });
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
};

function sameWarnings(a: WarningCode[], b: WarningCode[]): boolean {
  return a.length === b.length && a.every((code, index) => code === b[index]);
}

/** 300 qatorda bitta qatorni tahrirlash boshqalarini qayta chizmasligi uchun. */
export const ReviewRowView = memo(
  ReviewRowViewBase,
  (prev, next) =>
    prev.row === next.row &&
    prev.wide === next.wide &&
    prev.errors === next.errors &&
    prev.categories === next.categories &&
    prev.newCategoryNames === next.newCategoryNames &&
    prev.onChange === next.onChange &&
    prev.onFixPrice === next.onFixPrice &&
    sameWarnings(prev.warnings, next.warnings),
);
