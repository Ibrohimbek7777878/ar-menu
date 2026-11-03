import React, { useState } from 'react';
import { CheckCircle2, CircleAlert, ListChecks, Plus, RotateCcw } from 'lucide-react';
import { Button, Card } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { CategoryField } from './CategoryField';
import type { CategoryValue } from './CategoryField';
import { ReviewRowView, WIDE_COLUMNS } from './ReviewRowView';
import { MAX_ROWS, countIncluded, countSmallPrices } from './rows';
import { TAP, labelStyle, mutedTextStyle } from './styles';
import { fill } from './text';
import { useContainerWidth } from './useContainerWidth';
import { countAttention } from './warnings';
import type { useBulkImport } from './useBulkImport';

const t = restoUz.bulkImport;

/** Shu kenglikdan (ish maydoni, px) boshlab jadval, undan torida kartochkalar. */
const WIDE_FROM = 900;

type Bulk = ReturnType<typeof useBulkImport>;

interface ReviewStepProps {
  bulk: Bulk;
  onAddMore: () => void;
  onStartOver: () => void;
  onCommit: () => void;
}

const EMPTY_CATEGORY: CategoryValue = { name: '', id: null, typing: false };

export const ReviewStep: React.FC<ReviewStepProps> = ({ bulk, onAddMore, onStartOver, onCommit }) => {
  const [containerRef, width] = useContainerWidth<HTMLDivElement>();
  const wide = width >= WIDE_FROM;
  const [bulkCategory, setBulkCategory] = useState<CategoryValue>(EMPTY_CATEGORY);

  const { rows, warnings, plan, blockers } = bulk;
  const selected = countIncluded(rows);
  const attention = countAttention(
    rows.map((row) => ({ include: row.include, warnings: warnings.get(row.id) ?? [] })),
  );
  const smallPrices = countSmallPrices(rows);
  const writes = plan.created + plan.updated;
  const bulkCategoryReady = bulkCategory.id !== null || bulkCategory.name.trim() !== '';

  // Tugma yonidagi sabab: nima uchun hozir bosib bo'lmaydi
  const reasons: string[] = [];
  if (blockers.nothingToWrite) reasons.push(t.commit.nothing);
  if (blockers.missingPrice > 0) reasons.push(fill(t.commit.blockedPrice, { n: blockers.missingPrice }));
  if (blockers.missingName > 0) reasons.push(fill(t.commit.blockedName, { n: blockers.missingName }));
  if (blockers.tooMany) reasons.push(fill(t.commit.blockedTooMany, { n: MAX_ROWS }));

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>{t.review.title}</h2>
            <p style={{ ...mutedTextStyle, marginTop: 4 }}>
              <strong>{fill(t.review.found, { n: rows.length })}</strong>
              {' · '}
              {attention > 0 ? (
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {fill(t.review.attention, { n: attention })}
                </span>
              ) : (
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{t.review.allGood}</span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Button type="button" variant="secondary" onClick={onAddMore} icon={<Plus size={16} />} style={{ minHeight: TAP }}>
              {t.review.addMore}
            </Button>
            <Button type="button" variant="ghost" onClick={onStartOver} icon={<RotateCcw size={16} />} style={{ minHeight: TAP }}>
              {t.review.startOver}
            </Button>
          </div>
        </div>
        <p style={mutedTextStyle}>{t.review.hint}</p>

        {bulk.categoriesFailed && (
          <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
            {t.review.categoriesLoadFailed}
          </p>
        )}
        {bulk.notes.length > 0 && (
          <ul style={{ ...mutedTextStyle, margin: 0, paddingLeft: '20px' }}>
            {bulk.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {bulk.problems.length > 0 && (
          <ul role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)', margin: 0, paddingLeft: '20px' }}>
            {bulk.problems.map((problem, index) => (
              <li key={index}>
                {problem.name ? fill(t.fileProblems.withName, { name: problem.name, message: problem.message }) : problem.message}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {bulk.commitMessage && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            {bulk.commitMessage}
          </span>
          {bulk.otherErrors.length > 0 && (
            <>
              <span style={{ fontWeight: 600 }}>{t.commit.otherErrors}</span>
              <ul style={{ margin: 0, paddingLeft: '20px', fontWeight: 500 }}>
                {bulk.otherErrors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
          <ListChecks size={18} />
          <span>{t.review.toolbarTitle}</span>
          <span style={{ ...mutedTextStyle, marginLeft: 'auto' }}>
            {fill(t.review.selectedCount, { selected, total: rows.length })}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Button type="button" variant="secondary" onClick={() => bulk.includeAll(true)} style={{ minHeight: TAP }}>
            {t.review.selectAll}
          </Button>
          <Button type="button" variant="secondary" onClick={() => bulk.includeAll(false)} style={{ minHeight: TAP }}>
            {t.review.clearAll}
          </Button>
          {smallPrices > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={bulk.fixAllSmallPrices}
              title={t.review.fixSmallPricesHint}
              style={{ minHeight: TAP }}
            >
              {fill(t.review.fixSmallPrices, { n: smallPrices })}
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', maxWidth: 360 }}>
            <span style={labelStyle}>{t.review.assignCategory}</span>
            <CategoryField
              value={bulkCategory}
              options={bulk.existingCategories}
              newNames={bulk.newCategoryNames}
              ariaLabel={t.review.assignCategory}
              onChange={setBulkCategory}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!bulkCategoryReady}
            onClick={() => {
              bulk.giveCategory({ name: bulkCategory.name.trim(), id: bulkCategory.id });
              setBulkCategory(EMPTY_CATEGORY);
            }}
            style={{ minHeight: TAP }}
          >
            {t.review.apply}
          </Button>
        </div>
        {smallPrices > 0 && <p style={{ ...mutedTextStyle, fontSize: '12px' }}>{t.review.fixSmallPricesHint}</p>}
      </Card>

      {wide && (
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            gridTemplateColumns: WIDE_COLUMNS,
            gap: '12px',
            padding: '0 13px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-muted)',
          }}
        >
          <span>{t.review.columns.include}</span>
          <span>{t.review.columns.name}</span>
          <span>{t.review.columns.price}</span>
          <span>{t.review.columns.category}</span>
          <span>{t.review.columns.description}</span>
          <span>{t.review.columns.image}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map((row) => (
          <ReviewRowView
            key={row.id}
            row={row}
            warnings={warnings.get(row.id) ?? []}
            errors={bulk.rowErrors[row.id]}
            wide={wide}
            categories={bulk.existingCategories}
            newCategoryNames={bulk.newCategoryNames}
            onChange={bulk.changeRow}
            onFixPrice={bulk.fixRowPrice}
          />
        ))}
      </div>

      {/* Pastki panel: ish maydoni aylanganda ham ko'rinib turadi */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          marginTop: '4px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          {reasons.length > 0 ? (
            <ul role="status" style={{ ...mutedTextStyle, color: 'var(--accent-rose)', margin: 0, paddingLeft: '18px' }}>
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p style={mutedTextStyle}>
              {[
                fill(t.commit.summaryCreated, { n: plan.created }),
                plan.updated > 0 ? fill(t.commit.summaryUpdated, { n: plan.updated }) : '',
                plan.skipped > 0 ? fill(t.commit.summarySkipped, { n: plan.skipped }) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={!bulk.canCommit || bulk.committing}
          onClick={onCommit}
          icon={<CheckCircle2 size={18} />}
          style={{ minHeight: TAP }}
        >
          {fill(t.commit.button, { n: writes })}
        </Button>
      </div>
    </div>
  );
};
